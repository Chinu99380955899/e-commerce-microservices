import { http, HttpResponse, delay } from 'msw';
import { z } from 'zod';
import { config } from '../config';
import { productRequestSchema, issuesToErrors } from '../api/productRequest';
import type { Cart, CartItem, Order, OrderSummary, Product, ShippingAddress } from '../api/schemas';
import { createRng, hashString } from './rng';
import { DEMO_USERS } from '../lib/demoUsers';
import {
  advanceAllSagas,
  getDb,
  nextRandom,
  persistDb,
  type CartRecord,
  type ConversationRecord,
  type DemoProduct,
  type OrderRecord,
} from './db';
import { readControls, LATENCY_RANGE, type FailureArea } from './controls';
import { keywordSearch, semanticSearch } from './search';
import { planAssistantReply } from './assistant';
import { sagaSnapshot } from './saga';

const API = `${config.apiBaseUrl}/api/v1`;
const PROBLEM_BASE = 'https://auramart.dev/problems/';
const MAX_LINE_QUANTITY = 10;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function problem(
  status: number,
  slug: string,
  title: string,
  detail?: string,
  errors?: Record<string, string>,
): Response {
  const body = {
    type: `${PROBLEM_BASE}${slug}`,
    title,
    status,
    ...(detail ? { detail } : {}),
    ...(errors ? { errors } : {}),
  };
  return HttpResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

function validationError(errors: Record<string, string>): Response {
  return problem(
    400,
    'validation-error',
    'Validation failed',
    'One or more fields are invalid.',
    errors,
  );
}

/** Jitter per request is deterministic: the nth request always waits the same time. */
let requestCounter = 0;

/** Adds latency and applies the demo "503" switches before a handler runs. */
async function gate(area: FailureArea): Promise<Response | null> {
  const controls = readControls();
  requestCounter += 1;
  const [min, max] = LATENCY_RANGE[controls.latency];
  const wait = max === min ? min : min + Math.floor(createRng(requestCounter)() * (max - min));
  if (wait > 0) await delay(wait);
  if (controls.failing[area]) {
    return problem(
      503,
      'service-unavailable',
      'Service unavailable',
      'The demo is simulating an outage for this area. Switch it off in the Demo panel.',
    );
  }
  return null;
}

function requireCustomer(request: Request): string | Response {
  const customerId = request.headers.get('X-Customer-Id');
  if (!customerId || !uuidPattern.test(customerId)) {
    return problem(401, 'unauthenticated', 'Unauthenticated', 'Send a valid X-Customer-Id header.');
  }
  return customerId;
}

function requireAdmin(request: Request): Response | null {
  if (request.headers.get('X-Customer-Id') !== DEMO_USERS.ravi.id) {
    return problem(403, 'forbidden', 'Forbidden', 'This action needs the admin role.');
  }
  return null;
}

function productDto(product: DemoProduct): Product {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category,
    brand: product.brand,
    price: product.price,
    currency: product.currency,
    stockQuantity: product.stockQuantity,
    inStock: product.stockQuantity > 0,
    updatedAt: product.updatedAt,
    createdAt: product.createdAt,
  };
}

function pageOf<T>(items: readonly T[], page: number, size: number) {
  const totalElements = items.length;
  return {
    content: items.slice(page * size, page * size + size),
    page: {
      size,
      number: page,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
    },
  };
}

function intParam(
  url: URL,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number | Response {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return validationError({ [name]: `must be between ${min} and ${max}` });
  }
  return value;
}

const SORTS = {
  'name,asc': (a: DemoProduct, b: DemoProduct) => a.name.localeCompare(b.name),
  'price,asc': (a: DemoProduct, b: DemoProduct) =>
    a.price - b.price || a.name.localeCompare(b.name),
  'price,desc': (a: DemoProduct, b: DemoProduct) =>
    b.price - a.price || a.name.localeCompare(b.name),
  'createdAt,desc': (a: DemoProduct, b: DemoProduct) => b.createdAt.localeCompare(a.createdAt),
} as const;

function cartDto(record: CartRecord): Cart {
  const products = getDb().products;
  const items: CartItem[] = record.items.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    const currency = product?.currency ?? 'INR';
    return {
      productId: line.productId,
      sku: line.sku,
      name: line.name,
      unitPrice: line.unitPrice,
      currency,
      quantity: line.quantity,
      lineTotal: Math.round(line.unitPrice * line.quantity * 100) / 100,
    };
  });
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  return {
    id: record.id,
    customerId: record.customerId,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    currency: 'INR',
    updatedAt: record.updatedAt,
  };
}

function ensureCart(customerId: string): CartRecord {
  const db = getDb();
  let cart = db.carts[customerId];
  if (!cart) {
    cart = { id: crypto.randomUUID(), customerId, items: [], updatedAt: new Date().toISOString() };
    db.carts[customerId] = cart;
  }
  return cart;
}

function orderDto(order: OrderRecord, now: number): Order {
  const snapshot = sagaSnapshot(order, now);
  const lines = order.lines;
  return {
    id: order.id,
    customerId: order.customerId,
    status: snapshot.status,
    cancellationReason: snapshot.cancellationReason,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100,
    currency: order.currency,
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt,
    updatedAt: snapshot.timeline.at(-1)?.at ?? order.createdAt,
    timeline: snapshot.timeline,
  };
}

function orderSummaryDto(order: OrderRecord, now: number): OrderSummary {
  return {
    id: order.id,
    status: sagaSnapshot(order, now).status,
    itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
    total: Math.round(order.lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100,
    currency: order.currency,
    createdAt: order.createdAt,
  };
}

const addItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int(),
});

const quantitySchema = z.object({ quantity: z.number().int() });

const shippingSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().trim().min(1),
    phone: z.string().regex(/^[6-9]\d{9}$/),
    line1: z.string().trim().min(1),
    line2: z.string().optional(),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    pinCode: z.string().regex(/^\d{6}$/),
  }),
});

/** Records a checkout's shipping address so the next checkout can prefill it. */
function rememberAddress(customerId: string, address: ShippingAddress): void {
  getDb().addresses[customerId] = address;
}

export const handlers = [
  // ---------- Products ----------
  http.get(`*${API}/products`, async ({ request }) => {
    const blocked = await gate('catalogue');
    if (blocked) return blocked;
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const page = intParam(url, 'page', 0, 0, 100_000);
    if (page instanceof Response) return page;
    const size = intParam(url, 'size', DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    if (size instanceof Response) return size;
    const sort = url.searchParams.get('sort') ?? 'name,asc';
    if (!(sort in SORTS))
      return validationError({
        sort: 'must be one of name,asc, price,asc, price,desc, createdAt,desc',
      });
    const db = advanceAllSagas(Date.now());
    const sorter = SORTS[sort as keyof typeof SORTS];
    const list = db.products
      .filter((p) => p.active && (!category || p.category === category))
      .sort(sorter)
      .map(productDto);
    return HttpResponse.json(pageOf(list, page, size));
  }),

  http.get(`*${API}/products/search`, async ({ request }) => {
    const blocked = await gate('catalogue');
    if (blocked) return blocked;
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    if (!q) return validationError({ q: 'must not be blank' });
    const page = intParam(url, 'page', 0, 0, 100_000);
    if (page instanceof Response) return page;
    const size = intParam(url, 'size', DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    if (size instanceof Response) return size;
    const active = getDb().products.filter((p) => p.active);
    const ranked = keywordSearch(active, q).map(productDto);
    return HttpResponse.json(pageOf(ranked, page, size));
  }),

  http.get(`*${API}/products/semantic-search`, async ({ request }) => {
    const blocked = await gate('catalogue');
    if (blocked) return blocked;
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    if (!q) return validationError({ q: 'must not be blank' });
    const limit = intParam(url, 'limit', 8, 1, 20);
    if (limit instanceof Response) return limit;
    const active = getDb().products.filter((p) => p.active);
    const results = semanticSearch(active, q)
      .slice(0, limit)
      .map((hit) => ({ product: productDto(hit.product), score: hit.score }));
    return HttpResponse.json({ query: q, results });
  }),

  http.get(`*${API}/products/:id`, async ({ params }) => {
    const blocked = await gate('catalogue');
    if (blocked) return blocked;
    const id = String(params.id);
    if (!uuidPattern.test(id)) {
      return validationError({ id: 'must be a UUID' });
    }
    const product = getDb().products.find((p) => p.id === id && p.active);
    if (!product) {
      return problem(404, 'product-not-found', 'Product not found', `Product ${id} not found`);
    }
    return HttpResponse.json(productDto(product));
  }),

  http.post(`*${API}/products`, async ({ request }) => {
    const blocked = await gate('catalogue');
    if (blocked) return blocked;
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;
    const raw = (await request.json().catch(() => null)) as unknown;
    const parsed = productRequestSchema.safeParse(raw);
    if (!parsed.success) return validationError(issuesToErrors(parsed.error.issues));
    const db = getDb();
    if (db.products.some((p) => p.sku === parsed.data.sku)) {
      return problem(
        409,
        'duplicate-sku',
        'Duplicate SKU',
        `A product with SKU ${parsed.data.sku} already exists`,
      );
    }
    const now = new Date().toISOString();
    const product: DemoProduct = {
      id: crypto.randomUUID(),
      sku: parsed.data.sku,
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category.toLowerCase(),
      brand: parsed.data.brand,
      price: parsed.data.price,
      currency: parsed.data.currency.toUpperCase(),
      stockQuantity: parsed.data.stockQuantity,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    db.products.push(product);
    persistDb();
    return HttpResponse.json(productDto(product), {
      status: 201,
      headers: { Location: `${API}/products/${product.id}` },
    });
  }),

  http.put(`*${API}/products/:id`, async ({ request, params }) => {
    const blocked = await gate('catalogue');
    if (blocked) return blocked;
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;
    const id = String(params.id);
    const db = getDb();
    const product = db.products.find((p) => p.id === id && p.active);
    if (!product)
      return problem(404, 'product-not-found', 'Product not found', `Product ${id} not found`);
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    // SKUs never change: the stored SKU replaces whatever the body says.
    const parsed = productRequestSchema.safeParse({ ...raw, sku: product.sku });
    if (!parsed.success) return validationError(issuesToErrors(parsed.error.issues));
    const expected = typeof raw?.expectedUpdatedAt === 'string' ? raw.expectedUpdatedAt : null;
    if (expected && expected !== product.updatedAt) {
      return problem(
        409,
        'concurrent-update',
        'Concurrent update',
        'This product was changed by someone else. Reload to see the latest version.',
      );
    }
    Object.assign(product, {
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category.toLowerCase(),
      brand: parsed.data.brand,
      price: parsed.data.price,
      currency: parsed.data.currency.toUpperCase(),
      stockQuantity: parsed.data.stockQuantity,
      updatedAt: new Date().toISOString(),
    });
    persistDb();
    return HttpResponse.json(productDto(product));
  }),

  http.delete(`*${API}/products/:id`, async ({ request, params }) => {
    const blocked = await gate('catalogue');
    if (blocked) return blocked;
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;
    const id = String(params.id);
    const product = getDb().products.find((p) => p.id === id && p.active);
    if (!product)
      return problem(404, 'product-not-found', 'Product not found', `Product ${id} not found`);
    product.active = false;
    product.updatedAt = new Date().toISOString();
    persistDb();
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------- Cart ----------
  http.get(`*${API}/carts/current`, async ({ request }) => {
    const blocked = await gate('cart');
    if (blocked) return blocked;
    const customer = requireCustomer(request);
    if (customer instanceof Response) return customer;
    return HttpResponse.json(cartDto(ensureCart(customer)));
  }),

  http.post(`*${API}/carts/current/items`, async ({ request }) => {
    const blocked = await gate('cart');
    if (blocked) return blocked;
    const customer = requireCustomer(request);
    if (customer instanceof Response) return customer;
    const parsed = addItemSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return validationError({ productId: 'is required', quantity: 'must be a whole number' });
    const { productId, quantity } = parsed.data;
    if (quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      return validationError({ quantity: `must be between 1 and ${MAX_LINE_QUANTITY}` });
    }
    const db = getDb();
    const product = db.products.find((p) => p.id === productId && p.active);
    if (!product)
      return problem(
        404,
        'product-not-found',
        'Product not found',
        `Product ${productId} not found`,
      );
    const cart = ensureCart(customer);
    const existing = cart.items.find((line) => line.productId === productId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > MAX_LINE_QUANTITY) {
      return validationError({ quantity: `must be at most ${MAX_LINE_QUANTITY} for one product` });
    }
    if (nextQuantity > product.stockQuantity) {
      return problem(
        409,
        'insufficient-stock',
        'Not enough stock',
        product.stockQuantity === 0
          ? `${product.name} is out of stock`
          : `Only ${product.stockQuantity} left in stock`,
      );
    }
    if (existing) {
      existing.quantity = nextQuantity;
    } else {
      cart.items.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unitPrice: product.price,
        quantity,
      });
    }
    cart.updatedAt = new Date().toISOString();
    persistDb();
    return HttpResponse.json(cartDto(cart));
  }),

  http.patch(`*${API}/carts/current/items/:productId`, async ({ request, params }) => {
    const blocked = await gate('cart');
    if (blocked) return blocked;
    const customer = requireCustomer(request);
    if (customer instanceof Response) return customer;
    const parsed = quantitySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError({ quantity: 'must be a whole number' });
    const quantity = parsed.data.quantity;
    if (quantity < 0 || quantity > MAX_LINE_QUANTITY) {
      return validationError({ quantity: `must be between 0 and ${MAX_LINE_QUANTITY}` });
    }
    const cart = ensureCart(customer);
    const productId = String(params.productId);
    const line = cart.items.find((item) => item.productId === productId);
    if (!line)
      return problem(
        404,
        'product-not-found',
        'Product not in cart',
        `Product ${productId} is not in your cart`,
      );
    if (quantity === 0) {
      cart.items = cart.items.filter((item) => item.productId !== productId);
    } else {
      const product = getDb().products.find((p) => p.id === productId);
      if (product && quantity > product.stockQuantity) {
        return problem(
          409,
          'insufficient-stock',
          'Not enough stock',
          product.stockQuantity === 0
            ? `${product.name} is out of stock`
            : `Only ${product.stockQuantity} left in stock`,
        );
      }
      line.quantity = quantity;
    }
    cart.updatedAt = new Date().toISOString();
    persistDb();
    return HttpResponse.json(cartDto(cart));
  }),

  http.delete(`*${API}/carts/current/items/:productId`, async ({ request, params }) => {
    const blocked = await gate('cart');
    if (blocked) return blocked;
    const customer = requireCustomer(request);
    if (customer instanceof Response) return customer;
    const cart = ensureCart(customer);
    const productId = String(params.productId);
    cart.items = cart.items.filter((item) => item.productId !== productId);
    cart.updatedAt = new Date().toISOString();
    persistDb();
    return HttpResponse.json(cartDto(cart));
  }),

  http.delete(`*${API}/carts/current`, async ({ request }) => {
    const blocked = await gate('cart');
    if (blocked) return blocked;
    const customer = requireCustomer(request);
    if (customer instanceof Response) return customer;
    const cart = ensureCart(customer);
    cart.items = [];
    cart.updatedAt = new Date().toISOString();
    persistDb();
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------- Orders ----------
  http.post(`*${API}/orders`, async ({ request }) => {
    const blocked = await gate('orders');
    if (blocked) return blocked;
    const customer = requireCustomer(request);
    if (customer instanceof Response) return customer;
    const parsed = shippingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(issuesToErrors(parsed.error.issues));
    const db = getDb();
    const cart = ensureCart(customer);
    if (cart.items.length === 0) {
      return problem(
        409,
        'empty-cart',
        'Cart is empty',
        'Add a product to your cart before placing an order.',
      );
    }
    const now = Date.now();
    const lines: CartItem[] = cart.items.map((line) => ({
      productId: line.productId,
      sku: line.sku,
      name: line.name,
      unitPrice: line.unitPrice,
      currency: 'INR',
      quantity: line.quantity,
      lineTotal: Math.round(line.unitPrice * line.quantity * 100) / 100,
    }));
    const stockAvailable = lines.every((line) => {
      const product = db.products.find((p) => p.id === line.productId);
      return (product?.stockQuantity ?? 0) >= line.quantity;
    });
    if (stockAvailable) {
      // Reserve stock straight away; a failed payment releases it later.
      for (const line of lines) {
        const product = db.products.find((p) => p.id === line.productId);
        if (product) product.stockQuantity -= line.quantity;
      }
    }
    const controls = readControls();
    const paymentOutcome =
      controls.payment === 'flaky'
        ? nextRandom(db) < 0.3
          ? 'fail'
          : 'succeed'
        : controls.payment === 'fail'
          ? 'fail'
          : 'succeed';
    const placedAt = new Date(now).toISOString();
    const id = crypto.randomUUID();
    const order: OrderRecord = {
      id,
      placedAt: now,
      lines,
      stockAvailable,
      paymentOutcome,
      stockReserved: stockAvailable,
      stockReleased: false,
      status: 'PENDING',
      cancellationReason: null,
      customerId: customer,
      currency: 'INR',
      shippingAddress: parsed.data.shippingAddress,
      createdAt: placedAt,
      updatedAt: placedAt,
    };
    db.orders[id] = order;
    rememberAddress(customer, parsed.data.shippingAddress);
    cart.items = [];
    cart.updatedAt = placedAt;
    persistDb();
    return HttpResponse.json(orderDto(order, now), {
      status: 201,
      headers: { Location: `${API}/orders/${id}` },
    });
  }),

  http.get(`*${API}/orders`, async ({ request }) => {
    const blocked = await gate('orders');
    if (blocked) return blocked;
    const customer = requireCustomer(request);
    if (customer instanceof Response) return customer;
    const url = new URL(request.url);
    const page = intParam(url, 'page', 0, 0, 100_000);
    if (page instanceof Response) return page;
    const size = intParam(url, 'size', DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    if (size instanceof Response) return size;
    const now = Date.now();
    const db = advanceAllSagas(now);
    const list = Object.values(db.orders)
      .filter((order) => order.customerId === customer)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => orderSummaryDto(order, now));
    return HttpResponse.json(pageOf(list, page, size));
  }),

  http.get(`*${API}/orders/:id`, async ({ request, params }) => {
    const blocked = await gate('orders');
    if (blocked) return blocked;
    const customer = requireCustomer(request);
    if (customer instanceof Response) return customer;
    const id = String(params.id);
    if (!uuidPattern.test(id)) return validationError({ id: 'must be a UUID' });
    const now = Date.now();
    const db = advanceAllSagas(now);
    const order = db.orders[id];
    if (!order || order.customerId !== customer) {
      return problem(404, 'order-not-found', 'Order not found', `Order ${id} not found`);
    }
    return HttpResponse.json(orderDto(order, now));
  }),

  // ---------- Assistant ----------
  http.post(`*${API}/assistant/chat/stream`, async ({ request }) => {
    const blocked = await gate('assistant');
    if (blocked) return blocked;
    const customer = requireCustomer(request);
    if (customer instanceof Response) return customer;
    const body = (await request.json().catch(() => null)) as {
      conversationId?: string;
      message?: string;
    } | null;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (message.length < 1 || message.length > 1000) {
      return validationError({ message: 'must be between 1 and 1000 characters' });
    }
    const { conversationId, plan } = runAssistant(customer, body?.conversationId, message);
    const rng = createRng(hashString(conversationId) + requestCounter);
    const tokens = plan.text.match(/\S+\s*|\n/g) ?? [];
    const encoder = new TextEncoder();
    const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: unknown) =>
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        send(controller, { type: 'meta', conversationId });
        if (plan.tool) {
          send(controller, { type: 'tool', name: plan.tool, status: 'started' });
          await delay(300);
          send(controller, { type: 'tool', name: plan.tool, status: 'finished' });
        }
        for (const token of tokens) {
          if (request.signal.aborted) {
            controller.close();
            return;
          }
          await delay(25 + Math.floor(rng() * 16));
          send(controller, { type: 'token', text: token });
        }
        send(controller, { type: 'done' });
        controller.close();
      },
    });
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }),

  http.post(`*${API}/assistant/chat`, async ({ request }) => {
    const blocked = await gate('assistant');
    if (blocked) return blocked;
    const customer = requireCustomer(request);
    if (customer instanceof Response) return customer;
    const body = (await request.json().catch(() => null)) as {
      conversationId?: string;
      message?: string;
    } | null;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (message.length < 1 || message.length > 1000) {
      return validationError({ message: 'must be between 1 and 1000 characters' });
    }
    const { conversationId, plan } = runAssistant(customer, body?.conversationId, message);
    return HttpResponse.json({ conversationId, reply: plan.text });
  }),
];

function runAssistant(customer: string, requestedId: string | undefined, message: string) {
  const db = advanceAllSagas(Date.now());
  const conversationId = requestedId && requestedId.length > 0 ? requestedId : crypto.randomUUID();
  const existing: ConversationRecord | undefined = db.conversations[conversationId];
  const conversation: ConversationRecord =
    existing?.customerId === customer
      ? existing
      : {
          customerId: customer,
          lastProductIds: [],
          lastOrderId: null,
          updatedAt: new Date().toISOString(),
        };
  const plan = planAssistantReply({
    message,
    customerId: customer,
    conversation,
    products: db.products,
    orders: Object.values(db.orders),
    now: Date.now(),
  });
  if (plan.shownProductIds.length > 0) conversation.lastProductIds = plan.shownProductIds;
  if (plan.orderId) conversation.lastOrderId = plan.orderId;
  conversation.updatedAt = new Date().toISOString();
  db.conversations[conversationId] = conversation;
  persistDb();
  return { conversationId, plan };
}
