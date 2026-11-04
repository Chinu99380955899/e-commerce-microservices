import type { CartItem, OrderEvent, OrderEventType, OrderStatus } from '../api/schemas';

/** Simulated delays (ms since the order was placed). Keep the saga timings in this one place. */
export const SAGA_TIMINGS = {
  stockDecision: 1500,
  stockRejectedCancel: 2000,
  paymentDecision: 3000,
  finalDecision: 3500,
} as const;

export type PaymentOutcome = 'succeed' | 'fail';

/** The order fields the saga needs. They are stored in the mock database. */
export interface SagaOrder {
  id: string;
  placedAt: number;
  lines: CartItem[];
  /** Decided at placement: whether every line had enough stock. */
  stockAvailable: boolean;
  /** Decided at placement from the demo controls. */
  paymentOutcome: PaymentOutcome;
  /** Side effects that have been applied exactly once. */
  stockReserved: boolean;
  stockReleased: boolean;
  status: OrderStatus;
  cancellationReason: 'OUT_OF_STOCK' | 'PAYMENT_FAILED' | null;
}

export interface SagaStep {
  type: OrderEventType;
  offsetMs: number;
  status?: OrderStatus;
  cancellationReason?: 'OUT_OF_STOCK' | 'PAYMENT_FAILED';
}

/** The full saga script for an order, as a function of its placement-time decisions. */
export function sagaScript(
  order: Pick<SagaOrder, 'stockAvailable' | 'paymentOutcome'>,
): SagaStep[] {
  const steps: SagaStep[] = [{ type: 'OrderPlaced', offsetMs: 0 }];
  if (!order.stockAvailable) {
    steps.push({ type: 'StockRejected', offsetMs: SAGA_TIMINGS.stockDecision });
    steps.push({
      type: 'OrderCancelled',
      offsetMs: SAGA_TIMINGS.stockRejectedCancel,
      status: 'CANCELLED',
      cancellationReason: 'OUT_OF_STOCK',
    });
    return steps;
  }
  steps.push({ type: 'StockReserved', offsetMs: SAGA_TIMINGS.stockDecision });
  if (order.paymentOutcome === 'fail') {
    steps.push({ type: 'PaymentFailed', offsetMs: SAGA_TIMINGS.paymentDecision });
    steps.push({
      type: 'OrderCancelled',
      offsetMs: SAGA_TIMINGS.finalDecision,
      status: 'CANCELLED',
      cancellationReason: 'PAYMENT_FAILED',
    });
    return steps;
  }
  steps.push({ type: 'PaymentSucceeded', offsetMs: SAGA_TIMINGS.paymentDecision });
  steps.push({
    type: 'OrderConfirmed',
    offsetMs: SAGA_TIMINGS.finalDecision,
    status: 'CONFIRMED',
  });
  return steps;
}

/** The status and timeline the order shows at `now`. Pure: depends only on placedAt and decisions. */
export function sagaSnapshot(
  order: Pick<SagaOrder, 'placedAt' | 'stockAvailable' | 'paymentOutcome'>,
  now: number,
): {
  status: OrderStatus;
  cancellationReason: SagaOrder['cancellationReason'];
  timeline: OrderEvent[];
} {
  const elapsed = now - order.placedAt;
  const script = sagaScript(order);
  const timeline: OrderEvent[] = [];
  let status: OrderStatus = 'PENDING';
  let cancellationReason: SagaOrder['cancellationReason'] = null;
  for (const step of script) {
    if (elapsed < step.offsetMs) break;
    timeline.push({ type: step.type, at: new Date(order.placedAt + step.offsetMs).toISOString() });
    if (step.status) status = step.status;
    if (step.cancellationReason) cancellationReason = step.cancellationReason;
  }
  return { status, cancellationReason, timeline };
}

/**
 * Applies the side effects of every transition that has happened by `now`, exactly once.
 * Reserving stock happens at placement; releasing it happens when a payment fails.
 * Returns true when the order changed.
 */
export function advanceSagas(
  order: SagaOrder,
  now: number,
  adjustStock: (productId: string, delta: number) => void,
): boolean {
  const snapshot = sagaSnapshot(order, now);
  if (
    snapshot.status === 'CANCELLED' &&
    snapshot.cancellationReason === 'PAYMENT_FAILED' &&
    !order.stockReleased
  ) {
    for (const line of order.lines) adjustStock(line.productId, line.quantity);
    order.stockReleased = true;
  }
  const changed =
    order.status !== snapshot.status || order.cancellationReason !== snapshot.cancellationReason;
  order.status = snapshot.status;
  order.cancellationReason = snapshot.cancellationReason;
  return changed;
}
