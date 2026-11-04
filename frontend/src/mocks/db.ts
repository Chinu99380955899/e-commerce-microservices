import type { CartItem, ShippingAddress } from '../api/schemas';
import { DEMO_USERS } from '../lib/demoUsers';
import { seedProducts } from './seed/products';
import { createRng } from './rng';
import { advanceSagas, type PaymentOutcome, type SagaOrder, sagaSnapshot } from './saga';

export const DEMO_STORAGE_KEY = 'auramart.demo.v1';
const STORAGE_VERSION = 1;

export interface DemoProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string | null;
  price: number;
  currency: string;
  stockQuantity: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartRecord {
  id: string;
  customerId: string;
  /** Lines store the name and unit price copied from the catalogue when the item was added. */
  items: { productId: string; sku: string; name: string; unitPrice: number; quantity: number }[];
  updatedAt: string;
}

export interface OrderRecord extends SagaOrder {
  customerId: string;
  currency: string;
  shippingAddress: ShippingAddress;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationRecord {
  customerId: string;
  /** Products the assistant showed most recently, for "show me a cheaper one". */
  lastProductIds: string[];
  /** Latest order mentioned, for follow-up questions. */
  lastOrderId: string | null;
  updatedAt: string;
}

export interface DemoDb {
  /** Bumped when the stored shape changes; older saves are ignored and the seed is used instead. */
  version: number;
  /** Counter for the seeded payment decisions, so flaky payments are reproducible. */
  paymentCounter: number;
  products: DemoProduct[];
  carts: Record<string, CartRecord>;
  orders: Record<string, OrderRecord>;
  conversations: Record<string, ConversationRecord>;
  /** Customer addresses remembered from the last checkout. */
  addresses: Record<string, ShippingAddress>;
}

/** Product creation dates start here and step forward, so "newest" is deterministic. */
const PRODUCT_ANCHOR_MS = Date.parse('2026-06-01T09:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function productId(index: number): string {
  return `0b9a7c1e-00${String(index).padStart(2, '0')}-4c3a-9a10-0000000000${String(index).padStart(2, '0')}`;
}

/** Builds the demo catalogue deterministically: same products, prices and dates on every reset. */
function seedProductList(): DemoProduct[] {
  const rng = createRng(20260901);
  return seedProducts.map((seed, index) => {
    const number = index + 1;
    const createdAt = new Date(
      PRODUCT_ANCHOR_MS + index * 2 * DAY_MS + Math.floor(rng() * 3600) * 1000,
    ).toISOString();
    return {
      id: productId(number),
      sku: seed.sku,
      name: seed.name,
      description: seed.description,
      category: seed.category,
      brand: seed.brand,
      price: seed.price,
      currency: 'INR',
      stockQuantity: seed.stockQuantity,
      active: true,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function lineFor(db: DemoDb, productIdValue: string, quantity: number): CartItem {
  const product = db.products.find((p) => p.id === productIdValue);
  if (!product) throw new Error(`Seed product ${productIdValue} missing`);
  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    unitPrice: product.price,
    currency: product.currency,
    quantity,
    lineTotal: Math.round(product.price * quantity * 100) / 100,
  };
}

function seedOrder(
  db: DemoDb,
  options: {
    id: string;
    daysAgo: number;
    lines: { productId: string; quantity: number }[];
    paymentOutcome: PaymentOutcome;
    cancelledForPayment?: boolean;
  },
): void {
  const placedAt = Date.now() - options.daysAgo * DAY_MS;
  const lines = options.lines.map((l) => lineFor(db, l.productId, l.quantity));
  const order: OrderRecord = {
    id: options.id,
    placedAt,
    lines,
    stockAvailable: true,
    paymentOutcome: options.paymentOutcome,
    stockReserved: true,
    stockReleased: Boolean(options.cancelledForPayment),
    status: 'PENDING',
    cancellationReason: null,
    customerId: DEMO_USERS.asha.id,
    currency: 'INR',
    shippingAddress: ASHA_ADDRESS,
    createdAt: new Date(placedAt).toISOString(),
    updatedAt: new Date(placedAt).toISOString(),
  };
  const snapshot = sagaSnapshot(order, Date.now());
  order.status = snapshot.status;
  order.cancellationReason = snapshot.cancellationReason;
  order.updatedAt = snapshot.timeline.at(-1)?.at ?? order.createdAt;
  db.orders[order.id] = order;
}

export const ASHA_ADDRESS: ShippingAddress = {
  fullName: 'Asha Verma',
  phone: '9876543210',
  line1: '14, Lotus Apartments, MG Road',
  line2: 'Flat 3B',
  city: 'Bengaluru',
  state: 'Karnataka',
  pinCode: '560001',
};

/** Creates a fresh demo database: the catalogue, empty carts and Asha's order history. */
export function createSeedDb(): DemoDb {
  const db: DemoDb = {
    version: STORAGE_VERSION,
    paymentCounter: 0,
    products: seedProductList(),
    carts: {},
    orders: {},
    conversations: {},
    addresses: { [DEMO_USERS.asha.id]: ASHA_ADDRESS },
  };
  // Three historical orders with complete timelines. Stock was already settled when they were placed.
  seedOrder(db, {
    id: '5e1f0000-0001-4000-8000-00000000a001',
    daysAgo: 12,
    lines: [
      { productId: productId(3), quantity: 1 },
      { productId: productId(5), quantity: 1 },
    ],
    paymentOutcome: 'succeed',
  });
  seedOrder(db, {
    id: '5e1f0000-0002-4000-8000-00000000a002',
    daysAgo: 5,
    lines: [{ productId: productId(12), quantity: 1 }],
    paymentOutcome: 'fail',
    cancelledForPayment: true,
  });
  seedOrder(db, {
    id: '5e1f0000-0003-4000-8000-00000000a003',
    daysAgo: 2,
    lines: [{ productId: productId(9), quantity: 1 }],
    paymentOutcome: 'succeed',
  });
  return db;
}

let current: DemoDb | null = null;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function loadFromStorage(): DemoDb | null {
  try {
    const raw = storage()?.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoDb;
    return parsed.version === STORAGE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

/** The shared database. Loaded from localStorage on first use, then kept in memory. */
export function getDb(): DemoDb {
  if (!current) current = loadFromStorage() ?? createSeedDb();
  return current;
}

/** Writes the database to localStorage. Storage can be unavailable (private windows), so errors are ignored. */
export function persistDb(): void {
  try {
    storage()?.setItem(DEMO_STORAGE_KEY, JSON.stringify(getDb()));
  } catch {
    // Storage is unavailable or full: the demo keeps working in memory.
  }
}

/** Replaces all demo data with a fresh seed and saves it. */
export function resetDb(): void {
  current = createSeedDb();
  persistDb();
}

/** Applies every saga transition that has happened by `now` (exactly once), then returns the db. */
export function advanceAllSagas(now: number): DemoDb {
  const db = getDb();
  for (const order of Object.values(db.orders)) {
    if (order.status !== 'PENDING' && order.stockReleased) continue;
    const changed = advanceSagas(order, now, (productIdValue, delta) => {
      const product = db.products.find((p) => p.id === productIdValue);
      if (product) product.stockQuantity += delta;
    });
    if (changed) {
      const last = sagaSnapshot(order, now).timeline.at(-1);
      order.updatedAt = last?.at ?? order.updatedAt;
    }
  }
  return db;
}

/** Reads the next seeded payment decision for the demo controls. */
export function nextRandom(db: DemoDb): number {
  db.paymentCounter += 1;
  return createRng(0xa1 + db.paymentCounter)();
}
