import { describe, expect, it, vi } from 'vitest';
import { advanceSagas, sagaSnapshot, sagaScript, type SagaOrder } from './saga';

const PLACED = Date.parse('2026-10-16T10:00:00.000Z');

function order(overrides: Partial<SagaOrder> = {}): SagaOrder {
  return {
    id: 'order-1',
    placedAt: PLACED,
    lines: [
      {
        productId: 'p-1',
        sku: 'KIT-FLK-750',
        name: 'Steel Vacuum Flask 750ml',
        unitPrice: 1299,
        currency: 'INR',
        quantity: 2,
        lineTotal: 2598,
      },
    ],
    stockAvailable: true,
    paymentOutcome: 'succeed',
    stockReserved: true,
    stockReleased: false,
    status: 'PENDING',
    cancellationReason: null,
    ...overrides,
  };
}

function types(snapshot: ReturnType<typeof sagaSnapshot>): string[] {
  return snapshot.timeline.map((event) => event.type);
}

describe('checkout saga (pure, time-based)', () => {
  it('is PENDING with only OrderPlaced at t = 0', () => {
    const snapshot = sagaSnapshot(order(), PLACED);
    expect(snapshot.status).toBe('PENDING');
    expect(types(snapshot)).toEqual(['OrderPlaced']);
  });

  it('reserves stock at 1.5 s and stays PENDING', () => {
    const snapshot = sagaSnapshot(order(), PLACED + 1500);
    expect(snapshot.status).toBe('PENDING');
    expect(types(snapshot)).toEqual(['OrderPlaced', 'StockReserved']);
  });

  it('decides payment at 3.0 s and stays PENDING', () => {
    const snapshot = sagaSnapshot(order(), PLACED + 3000);
    expect(types(snapshot)).toEqual(['OrderPlaced', 'StockReserved', 'PaymentSucceeded']);
    expect(snapshot.status).toBe('PENDING');
  });

  it('confirms at 3.5 s when everything succeeds', () => {
    const snapshot = sagaSnapshot(order(), PLACED + 3500);
    expect(snapshot.status).toBe('CONFIRMED');
    expect(snapshot.cancellationReason).toBeNull();
    expect(types(snapshot).at(-1)).toBe('OrderConfirmed');
  });

  it('cancels with PAYMENT_FAILED at 3.5 s when the payment fails', () => {
    const snapshot = sagaSnapshot(order({ paymentOutcome: 'fail' }), PLACED + 3500);
    expect(snapshot.status).toBe('CANCELLED');
    expect(snapshot.cancellationReason).toBe('PAYMENT_FAILED');
    expect(types(snapshot)).toContain('PaymentFailed');
  });

  it('rejects stock at 1.5 s and cancels with OUT_OF_STOCK at 2.0 s', () => {
    const before = sagaSnapshot(order({ stockAvailable: false }), PLACED + 1500);
    expect(types(before)).toEqual(['OrderPlaced', 'StockRejected']);
    expect(before.status).toBe('PENDING');

    const after = sagaSnapshot(order({ stockAvailable: false }), PLACED + 2000);
    expect(after.status).toBe('CANCELLED');
    expect(after.cancellationReason).toBe('OUT_OF_STOCK');
    expect(types(after)).toEqual(['OrderPlaced', 'StockRejected', 'OrderCancelled']);
  });

  it('never runs the payment step for an out-of-stock order', () => {
    const script = sagaScript({ stockAvailable: false, paymentOutcome: 'succeed' }).map(
      (step) => step.type,
    );
    expect(script).not.toContain('PaymentSucceeded');
    expect(script).not.toContain('PaymentFailed');
  });

  it('applies side effects exactly once, releasing stock only when a payment fails', () => {
    const adjust = vi.fn();
    const failed = order({ paymentOutcome: 'fail' });
    advanceSagas(failed, PLACED + 4000, adjust);
    advanceSagas(failed, PLACED + 5000, adjust);
    expect(adjust).toHaveBeenCalledTimes(1);
    expect(adjust).toHaveBeenCalledWith('p-1', 2);
    expect(failed.status).toBe('CANCELLED');
  });

  it('does not release stock on a confirmed order', () => {
    const adjust = vi.fn();
    advanceSagas(order(), PLACED + 10_000, adjust);
    expect(adjust).not.toHaveBeenCalled();
  });
});
