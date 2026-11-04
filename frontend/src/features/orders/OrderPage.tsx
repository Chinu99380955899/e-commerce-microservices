import { Link, useParams, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useOrder } from '../../api/orders';
import { addCartItem, cartKeys } from '../../api/cart';
import { ApiError } from '../../api/client';
import type { Order, OrderEventType } from '../../api/schemas';
import { useDocumentTitle } from '../../app/hooks';
import { formatDateTime, formatTime } from '../../lib/format';
import { toast } from '../../lib/toast';
import { Button } from '../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
  OrderStatusBadge,
  Price,
  Skeleton,
} from '../../components/ui/Status';
import { ProductArt } from '../../components/ui/ProductArt';
import { cn } from '../../lib/cn';

interface EventInfo {
  label: string;
  service: string;
  topic: 'order.events' | 'inventory.events';
  explanation: string;
}

/** What each saga event means, and which service published it on which Kafka topic. */
const EVENT_INFO: Record<OrderEventType, EventInfo> = {
  OrderPlaced: {
    label: 'Order placed',
    service: 'order-service',
    topic: 'order.events',
    explanation:
      'Your cart became an order in PENDING state. Nothing has been reserved or charged yet.',
  },
  StockReserved: {
    label: 'Stock reserved',
    service: 'inventory-service',
    topic: 'inventory.events',
    explanation: 'Inventory checked every line and set the quantity aside for your order.',
  },
  StockRejected: {
    label: 'Stock rejected',
    service: 'inventory-service',
    topic: 'inventory.events',
    explanation: 'At least one line asked for more than was left, so the order will be cancelled.',
  },
  PaymentSucceeded: {
    label: 'Payment succeeded',
    service: 'payment (simulated)',
    topic: 'order.events',
    explanation: 'The simulated payment provider accepted the payment. No real money moved.',
  },
  PaymentFailed: {
    label: 'Payment failed',
    service: 'payment (simulated)',
    topic: 'order.events',
    explanation:
      'The simulated payment provider declined the payment, so the reserved stock is released.',
  },
  OrderConfirmed: {
    label: 'Order confirmed',
    service: 'order-service',
    topic: 'order.events',
    explanation: 'Stock and payment both succeeded. The order is final and a confirmation is sent.',
  },
  OrderCancelled: {
    label: 'Order cancelled',
    service: 'order-service',
    topic: 'order.events',
    explanation: 'The saga ended without a sale. The reason is shown in the banner above.',
  },
};

export function OrderPage() {
  const { id = '' } = useParams();
  const order = useOrder(id);
  useDocumentTitle(order.data ? `Order ${order.data.id.slice(0, 8)}` : 'Order');

  if (order.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (order.error instanceof ApiError && order.error.status === 404) {
    return (
      <EmptyState
        title="Order not found"
        description="We could not find that order on your account."
        action={
          <Link
            to="/orders"
            className="text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
          >
            Back to your orders
          </Link>
        }
      />
    );
  }
  if (order.isError) return <ErrorState error={order.error} onRetry={() => void order.refetch()} />;

  return <OrderDetails order={order.data} />;
}

function OrderDetails({ order }: { order: Order }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">Order</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight">{order.id.slice(0, 8)}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Placed {formatDateTime(order.createdAt)}
          </p>
        </header>

        <OutcomeBanner order={order} />

        <section
          aria-labelledby="timeline-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 id="timeline-heading" className="text-lg font-semibold">
            Live tracking
          </h2>
          <ol className="mt-4 flex flex-col">
            {order.timeline.map((event, index) => {
              const info = EVENT_INFO[event.type];
              const last = index === order.timeline.length - 1;
              const failed =
                event.type === 'StockRejected' ||
                event.type === 'PaymentFailed' ||
                event.type === 'OrderCancelled';
              return (
                <li
                  key={`${event.type}-${event.at}`}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  {!last ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-[11px] top-6 h-full w-0.5 bg-slate-200 dark:bg-slate-700"
                    />
                  ) : null}
                  <span
                    className={cn(
                      'relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full',
                      failed
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                    )}
                    aria-hidden="true"
                  >
                    {failed ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{info.label}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <time dateTime={event.at}>{formatTime(event.at)}</time>
                    </p>
                  </div>
                </li>
              );
            })}
            {order.status === 'PENDING' ? (
              <li className="flex gap-4 text-sm text-slate-600 dark:text-slate-400">
                <Loader2 className="ml-0.5 size-5 animate-spin" aria-hidden="true" />
                <span>Waiting for the next step…</span>
              </li>
            ) : null}
          </ol>
          <BehindTheScenes order={order} />
        </section>
      </div>

      <aside
        aria-label="Order details"
        className="flex h-fit flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <h2 className="font-semibold">Items</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {order.lines.map((line) => (
              <li key={line.productId} className="flex items-center gap-3">
                <ProductArt sku={line.sku} brand={null} size="sm" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{line.name}</p>
                  <p className="text-slate-500">× {line.quantity}</p>
                </div>
                <Price amount={line.lineTotal} currency={line.currency} className="text-sm" />
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
            <span className="font-medium">Total</span>
            <Price amount={order.total} currency={order.currency} className="text-lg" />
          </div>
        </div>
        <div className="text-sm">
          <h2 className="font-semibold">Delivering to</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {order.shippingAddress.fullName}, {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''},{' '}
            {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
            {order.shippingAddress.pinCode}
          </p>
        </div>
        <Link
          to="/orders"
          className="text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
        >
          All your orders
        </Link>
      </aside>
    </div>
  );
}

function OutcomeBanner({ order }: { order: Order }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  if (order.status === 'PENDING') {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      >
        <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden="true" />
        <p className="text-sm font-medium">Processing your order. This page updates on its own.</p>
      </div>
    );
  }

  if (order.status === 'CONFIRMED') {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">Order confirmed: a confirmation is on its way.</p>
      </div>
    );
  }

  const message =
    order.cancellationReason === 'OUT_OF_STOCK'
      ? "Some items ran out of stock. You weren't charged."
      : 'Payment failed. The reserved stock was released.';

  // "Try again" puts the lines back in the cart so the same items can be ordered again.
  const tryAgain = async () => {
    setRetrying(true);
    let restored = 0;
    try {
      for (const line of order.lines) {
        await addCartItem(line.productId, line.quantity);
        restored += 1;
      }
      await queryClient.invalidateQueries({ queryKey: cartKeys.current() });
      toast.success(
        'Items back in your cart',
        `${restored} product${restored === 1 ? '' : 's'} added again.`,
      );
      void navigate('/cart');
    } catch (error) {
      const description = error instanceof ApiError ? error.message : 'Please try again.';
      toast.error('Some items could not be added', description);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        loading={retrying}
        onClick={() => void tryAgain()}
        icon={<RotateCcw className="size-4" aria-hidden="true" />}
      >
        Try again
      </Button>
    </div>
  );
}

function BehindTheScenes({ order }: { order: Order }) {
  return (
    <details className="group mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
        Behind the scenes
        <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Each step is a Kafka event. Services never call each other directly for checkout: they react
        to events.
      </p>
      <ul className="mt-3 flex flex-col gap-3 text-sm">
        {order.timeline.map((event) => {
          const info = EVENT_INFO[event.type];
          return (
            <li key={`${event.type}-${event.at}`}>
              <p className="font-medium">
                {info.label}
                <span className="ml-2 font-mono text-xs text-slate-500">
                  {info.service} → {info.topic}
                </span>
              </p>
              <p className="text-slate-600 dark:text-slate-400">{info.explanation}</p>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
