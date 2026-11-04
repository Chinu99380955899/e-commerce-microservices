import { describe, expect, it } from 'vitest';
import { DEMO_USERS } from '../lib/demoUsers';
import { createSeedDb, type ConversationRecord, type DemoDb } from './db';
import { parseBudget, planAssistantReply, type AssistantPlan } from './assistant';

const NOW = Date.now();
const asha = DEMO_USERS.asha.id;

function ask(
  db: DemoDb,
  message: string,
  options: { customerId?: string; conversation?: ConversationRecord } = {},
): AssistantPlan {
  return planAssistantReply({
    message,
    customerId: options.customerId ?? asha,
    conversation: options.conversation,
    products: Object.values(db.products),
    orders: Object.values(db.orders),
    now: NOW,
  });
}

function productLinks(text: string): string[] {
  return [...text.matchAll(/\]\(\/products\/([0-9a-f-]{36})\)/gi)].map((match) => match[1] ?? '');
}

describe('assistant golden questions (spec section 6.5)', () => {
  it('1. recommends products for keeping tea hot on a train, as links with price and stock', () => {
    const db = createSeedDb();
    const plan = ask(db, 'I need something to keep tea hot on a long train trip');
    const links = productLinks(plan.text);
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links.length).toBeLessThanOrEqual(3);
    expect(plan.text).toMatch(/₹/);
    expect(plan.text).toMatch(/in stock|left|out of stock/);
    expect(plan.tool).toBe('searchProducts');
  });

  it('2. respects a budget written as ₹5,000, 5000 or 5k', () => {
    const db = createSeedDb();
    for (const message of [
      'Suggest earbuds under ₹5,000 for the gym',
      'Suggest earbuds under 5000 for the gym',
      'Suggest earbuds under 5k for the gym',
    ]) {
      const plan = ask(db, message);
      expect(parseBudget(message)).toBe(5000);
      expect(plan.text).toContain('Sport Wireless Earbuds for Gym');
      const prices = [...plan.text.matchAll(/₹([\d,]+\.\d{2})/g)].map((m) =>
        Number((m[1] ?? '').replace(/,/g, '')),
      );
      expect(prices.every((price) => price <= 5000)).toBe(true);
    }
  });

  it('3. suggests cheaper products in the same category using the conversation memory', () => {
    const db = createSeedDb();
    const first = ask(db, 'I need something to keep tea hot on a long train trip');
    const conversation: ConversationRecord = {
      customerId: asha,
      lastProductIds: first.shownProductIds,
      lastOrderId: null,
      updatedAt: new Date().toISOString(),
    };
    const followUp = ask(db, 'Show me a cheaper one', { conversation });
    expect(followUp.shownProductIds.length).toBeGreaterThan(0);
    const shown = followUp.shownProductIds.map((id) => db.products.find((p) => p.id === id));
    const remembered = db.products.find((p) => p.id === first.shownProductIds[0]);
    for (const product of shown) {
      expect(product?.category).toBe(remembered?.category);
      expect(product?.price ?? Infinity).toBeLessThan(remembered?.price ?? 0);
    }
  });

  it('4. says the power bank is out of stock and suggests an in-stock alternative', () => {
    const db = createSeedDb();
    const plan = ask(db, 'Is the power bank in stock?');
    expect(plan.text).toMatch(/out of stock/i);
    expect(plan.shownProductIds.length).toBe(1);
    const suggested = db.products.find((p) => p.id === plan.shownProductIds[0]);
    expect(suggested?.stockQuantity ?? 0).toBeGreaterThan(0);
    expect(suggested?.name).not.toBe('Power Bank 20000mAh');
  });

  it('5. shows the signed-in customer’s latest order with its status and timeline', () => {
    const db = createSeedDb();
    const plan = ask(db, 'Where is my order?');
    expect(plan.text).toMatch(/Order \w{8} is \*\*CONFIRMED\*\*/);
    expect(plan.text).toContain('Timeline:');
    expect(plan.orderId).not.toBeNull();
  });

  it('5b. asks a guest to sign in before looking up orders', () => {
    const db = createSeedDb();
    const plan = ask(db, 'Where is my order?', {
      customerId: '11111111-2222-4333-8444-555555555555',
    });
    expect(plan.text).toMatch(/sign in/i);
  });

  it('5c. looks up an order by ID and answers politely for unknown IDs', () => {
    const db = createSeedDb();
    const known = Object.values(db.orders)[0];
    expect(known).toBeDefined();
    const found = ask(db, `order ${known?.id.slice(0, 8) ?? ''}`);
    expect(found.orderId).toBe(known?.id);
    const unknown = ask(db, 'order 0badbeef-0000-4000-8000-000000000000');
    expect(unknown.text).toMatch(/couldn't find/i);
  });

  it('6. says iPhones are not in the catalogue and never invents products', () => {
    const db = createSeedDb();
    const plan = ask(db, 'Do you sell iPhones?');
    expect(plan.text).toMatch(/isn't|couldn't find|not in/i);
    expect(plan.text).toMatch(/Electronics/);
    expect(productLinks(plan.text)).toEqual([]);
  });

  it('7. politely declines a poem about cats', () => {
    const db = createSeedDb();
    const plan = ask(db, 'Write me a poem about cats');
    expect(plan.text).toMatch(/only help with shopping/i);
    expect(productLinks(plan.text)).toEqual([]);
  });

  it('8. introduces itself for "Hi" and "What can you do?"', () => {
    const db = createSeedDb();
    expect(ask(db, 'Hi').text).toMatch(/Aura/);
    expect(ask(db, 'What can you do?').text).toMatch(/find products/);
  });
});
