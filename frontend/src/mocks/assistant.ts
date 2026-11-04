import { formatMoney } from '../lib/format';
import { DEMO_USERS } from '../lib/demoUsers';
import type { ConversationRecord, DemoProduct, OrderRecord } from './db';
import { semanticSearch, trigramSimilarity } from './search';
import { sagaSnapshot } from './saga';

export type AssistantTool = 'searchProducts' | 'getOrderStatus';

export interface AssistantPlan {
  tool: AssistantTool | null;
  text: string;
  /** Products shown in the reply, for "show me a cheaper one" and the product cards. */
  shownProductIds: string[];
  /** Order mentioned in the reply, for follow-up questions. */
  orderId: string | null;
}

export interface AssistantContext {
  message: string;
  customerId: string;
  conversation: ConversationRecord | undefined;
  products: readonly DemoProduct[];
  orders: readonly OrderRecord[];
  now: number;
}

export const CATEGORY_LABELS: Record<string, string> = {
  electronics: 'Electronics',
  kitchen: 'Kitchen',
  fitness: 'Fitness',
  bags: 'Bags',
  home: 'Home',
  books: 'Books',
};

const SHOP_LINE_LIMIT = 3;

const STOCK_WORDS = new Set(['stock', 'available', 'availability', 'instock']);
const GREETING = /^\s*(hi|hello|hey|namaste|good (morning|afternoon|evening))\b/i;
const CAPABILITY = /\b(what can you do|what do you do|help me|how can you help|who are you)\b/i;
const OFF_TOPIC =
  /\b(poem|poetry|story|joke|essay|song|lyrics|recipe for|weather|capital of|homework|politics|election)\b/i;
const CHEAPER = /\b(cheaper|cheap one|less expensive|more affordable|lower price|budget option)\b/i;
const ORDER_WORDS = /\b(order|orders|track|tracking|delivery|shipped|where is my|status)\b/i;
const SELL_QUESTION = /\b(do you (sell|have|stock)|can i (buy|get)|is there)\b/i;

function normalise(text: string): string {
  return text.toLowerCase().replace(/[₹,]/g, '');
}

/** Parses "under ₹5,000", "5000", "5k" into a rupee amount. Returns null when there is no budget. */
export function parseBudget(message: string): number | null {
  const text = normalise(message);
  const match =
    /(under|below|less than|upto|up to|max|within|budget(?: of)?)\s*(?:rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k)?\b/.exec(
      text,
    ) ?? /(?:rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(k)?\b/.exec(text);
  if (!match) return null;
  const amountText = match[2] ?? match[1];
  const suffixK = match[3] ?? match[2];
  if (!amountText) return null;
  const base = Number(amountText);
  if (!Number.isFinite(base)) return null;
  return suffixK === 'k' ? base * 1000 : base;
}

/** Words of the message that are not product words: budget numbers, intent words and filler. */
function productWords(message: string): string[] {
  return normalise(message)
    .replace(/\b\d+(\.\d+)?k?\b/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOCK_WORDS.has(word) && !FILLER.has(word));
}

const FILLER = new Set([
  'the',
  'and',
  'for',
  'you',
  'are',
  'can',
  'any',
  'some',
  'show',
  'tell',
  'have',
  'got',
  'one',
  'please',
  'would',
  'could',
  'there',
  'what',
  'which',
  'with',
  'this',
  'that',
  'under',
  'below',
  'over',
  'cheaper',
  'more',
  'sell',
  'does',
  'want',
  'need',
  'looking',
  'suggest',
  'recommend',
  'something',
  'buy',
  'price',
  'much',
  'cost',
  'is',
  'it',
  'my',
  'me',
  'in',
  'of',
  'to',
  'a',
  'an',
  'do',
]);

/** Finds the product the message is about by matching its name words, or null. */
export function findMentionedProduct(
  message: string,
  products: readonly DemoProduct[],
): DemoProduct | null {
  const words = productWords(message);
  if (words.length === 0) return null;
  let best: { product: DemoProduct; fraction: number } | null = null;
  for (const product of products) {
    const nameWords = normalise(product.name)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !FILLER.has(w));
    if (nameWords.length === 0) continue;
    let matched = 0;
    for (const nameWord of nameWords) {
      if (words.some((w) => trigramSimilarity(w, nameWord) >= 0.6)) matched += 1;
    }
    const fraction = matched / nameWords.length;
    if (fraction >= 0.5 && (!best || fraction > best.fraction)) best = { product, fraction };
  }
  return best?.product ?? null;
}

function productLine(product: DemoProduct): string {
  const stock =
    product.stockQuantity === 0
      ? 'out of stock'
      : product.stockQuantity <= 5
        ? `only ${product.stockQuantity} left`
        : 'in stock';
  return `- [${product.name}](/products/${product.id}): ${formatMoney(product.price, product.currency)}, ${stock}`;
}

function activeProducts(products: readonly DemoProduct[]): DemoProduct[] {
  return products.filter((p) => p.active);
}

function byId(products: readonly DemoProduct[], id: string): DemoProduct | undefined {
  return products.find((p) => p.id === id);
}

const EVENT_LABELS: Record<string, string> = {
  OrderPlaced: 'placed',
  StockReserved: 'stock reserved',
  StockRejected: 'stock rejected',
  PaymentSucceeded: 'payment succeeded',
  PaymentFailed: 'payment failed',
  OrderConfirmed: 'confirmed',
  OrderCancelled: 'cancelled',
};

function orderSummary(order: OrderRecord, now: number): string {
  const snapshot = sagaSnapshot(order, now);
  const path = snapshot.timeline.map((event) => EVENT_LABELS[event.type] ?? event.type).join(' → ');
  const reason =
    snapshot.cancellationReason === 'OUT_OF_STOCK'
      ? " (some items ran out of stock, so you weren't charged)"
      : snapshot.cancellationReason === 'PAYMENT_FAILED'
        ? ' (payment failed)'
        : '';
  return `Order ${order.id.slice(0, 8)} is **${snapshot.status}**${reason}. Timeline: ${path}.`;
}

function greetingText(): string {
  return [
    'Hi, I am Aura, your AuraMart shopping assistant. I can:',
    '',
    '- find products by meaning, for example "something to keep tea hot on a train trip",',
    '- check whether an item is in stock,',
    '- compare prices and suggest cheaper options,',
    '- tell you where your latest order is.',
    '',
    'Try: "Suggest earbuds under ₹5,000 for the gym", or "Where is my order?"',
  ].join('\n');
}

/**
 * Plans the assistant's reply to one message. Deterministic: the same catalogue, orders and memory
 * always give the same answer. This is the simulator behind the "golden questions" in the spec.
 */
export function planAssistantReply(context: AssistantContext): AssistantPlan {
  const { message, customerId, conversation, orders, now } = context;
  const products = activeProducts(context.products);
  const isSignedInDemoUser = Object.values(DEMO_USERS).some((u) => u.id === customerId);

  if (GREETING.test(message) || CAPABILITY.test(message)) {
    return { tool: null, text: greetingText(), shownProductIds: [], orderId: null };
  }

  // Order lookups: "order <id>" or "where is my order".
  const idMatch = /order\s+([0-9a-f]{6}[0-9a-f-]*)/i.exec(message);
  if (idMatch?.[1] || ORDER_WORDS.test(message)) {
    const prefix = idMatch?.[1]?.toLowerCase();
    if (prefix) {
      const order = orders.find(
        (o) => o.id.toLowerCase().startsWith(prefix) && o.customerId === customerId,
      );
      const anyOrder = orders.find((o) => o.id.toLowerCase().startsWith(prefix));
      if (order) {
        return {
          tool: 'getOrderStatus',
          text: orderSummary(order, now),
          shownProductIds: [],
          orderId: order.id,
        };
      }
      if (anyOrder && isSignedInDemoUser) {
        return {
          tool: 'getOrderStatus',
          text: "I couldn't find that order on your account. Please check the order ID.",
          shownProductIds: [],
          orderId: null,
        };
      }
      return {
        tool: 'getOrderStatus',
        text: "I couldn't find an order with that ID. Please check it and try again.",
        shownProductIds: [],
        orderId: null,
      };
    }
    if (!isSignedInDemoUser) {
      return {
        tool: 'getOrderStatus',
        text: 'Please sign in so I can look up your orders. Use the account menu to sign in.',
        shownProductIds: [],
        orderId: null,
      };
    }
    const latest = orders
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!latest) {
      return {
        tool: 'getOrderStatus',
        text: "You don't have any orders yet. Browse the catalogue to place your first one.",
        shownProductIds: [],
        orderId: null,
      };
    }
    return {
      tool: 'getOrderStatus',
      text: orderSummary(latest, now),
      shownProductIds: [],
      orderId: latest.id,
    };
  }

  // Stock questions about a named product.
  if (/\b(in stock|available|availability|stock)\b/i.test(message)) {
    const product = findMentionedProduct(message, products);
    if (product) {
      if (product.stockQuantity === 0) {
        const alternative = semanticSearch(
          products.filter((p) => p.stockQuantity > 0 && p.id !== product.id),
          `${product.category} ${product.name.split(' ')[0] ?? ''} ${product.description}`,
        )
          .map((hit) => hit.product)
          .filter((p) => p.category === product.category)[0];
        const suggestion = alternative
          ? ` A similar in-stock option is:\n\n${productLine(alternative)}`
          : '';
        return {
          tool: 'searchProducts',
          text: `No, the ${product.name} is out of stock right now.${suggestion}`,
          shownProductIds: alternative ? [alternative.id] : [],
          orderId: null,
        };
      }
      const level =
        product.stockQuantity <= 5
          ? `Yes, but only ${product.stockQuantity} are left.`
          : 'Yes, it is in stock.';
      return {
        tool: 'searchProducts',
        text: `${level}\n\n${productLine(product)}`,
        shownProductIds: [product.id],
        orderId: null,
      };
    }
  }

  // "Show me a cheaper one" uses the products from the previous answer.
  if (CHEAPER.test(message)) {
    const previous = conversation?.lastProductIds.map((id) => byId(products, id)).find(Boolean);
    if (!previous) {
      return {
        tool: 'searchProducts',
        text: 'Which product should I compare? Ask me about something first, then ask for a cheaper one.',
        shownProductIds: [],
        orderId: null,
      };
    }
    const cheaper = products
      .filter(
        (p) => p.category === previous.category && p.price < previous.price && p.stockQuantity > 0,
      )
      .sort((a, b) => b.price - a.price || a.name.localeCompare(b.name))
      .slice(0, SHOP_LINE_LIMIT);
    if (cheaper.length === 0) {
      return {
        tool: 'searchProducts',
        text: `I couldn't find anything cheaper than the ${previous.name} in ${CATEGORY_LABELS[previous.category] ?? previous.category} right now.`,
        shownProductIds: [],
        orderId: null,
      };
    }
    return {
      tool: 'searchProducts',
      text: `Here are cheaper options to the ${previous.name}:\n\n${cheaper.map(productLine).join('\n')}`,
      shownProductIds: cheaper.map((p) => p.id),
      orderId: null,
    };
  }

  // Meaning-based product search, with an optional budget.
  const budget = parseBudget(message);
  const query = normalise(message)
    .replace(/\b(under|below|less than|upto|up to|max|within|budget(?: of)?|rs|inr)\b/g, ' ')
    .replace(/\b\d+(\.\d+)?k?\b/g, ' ');
  const hits = semanticSearch(products, query);
  const affordable = budget === null ? hits : hits.filter((hit) => hit.product.price <= budget);
  const top = affordable.slice(0, SHOP_LINE_LIMIT);

  if (top.length > 0) {
    const intro =
      budget !== null
        ? `Here are options under ${formatMoney(budget)} for that:`
        : 'Here is what I found:';
    return {
      tool: 'searchProducts',
      text: `${intro}\n\n${top.map((hit) => productLine(hit.product)).join('\n')}`,
      shownProductIds: top.map((hit) => hit.product.id),
      orderId: null,
    };
  }

  if (hits.length > 0 && budget !== null) {
    return {
      tool: 'searchProducts',
      text: `I found matches, but none are under ${formatMoney(budget)}. Want me to show the closest ones above that budget?`,
      shownProductIds: [],
      orderId: null,
    };
  }

  if (
    OFF_TOPIC.test(message) ||
    (!SELL_QUESTION.test(message) && productWords(message).length === 0)
  ) {
    return {
      tool: null,
      text: 'I can only help with shopping at AuraMart: finding products, checking stock, your cart and your orders.',
      shownProductIds: [],
      orderId: null,
    };
  }

  const categories = Object.values(CATEGORY_LABELS).join(', ');
  return {
    tool: 'searchProducts',
    text: `I couldn't find that in the AuraMart catalogue, so I won't guess. We stock ${categories}. Want me to show something from one of these?`,
    shownProductIds: [],
    orderId: null,
  };
}
