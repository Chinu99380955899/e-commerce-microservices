import type { ReactNode } from 'react';
import { AlertTriangle, PackageOpen, RefreshCw } from 'lucide-react';
import { formatMoney } from '../../lib/format';
import { cn } from '../../lib/cn';
import { stockState } from '../../lib/stock';
import { Button } from './Button';
import type { OrderStatus } from '../../api/schemas';

export function Price({
  amount,
  currency = 'INR',
  className,
}: {
  amount: number;
  currency?: string;
  className?: string;
}) {
  return (
    <span className={cn('font-semibold tabular-nums', className)}>
      {formatMoney(amount, currency)}
    </span>
  );
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'aura';

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  info: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300',
  aura: 'bg-aura-100 text-aura-700 dark:bg-aura-950 dark:text-aura-400',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StockBadge({ quantity }: { quantity: number }) {
  const state = stockState(quantity);
  return <Badge tone={state.tone}>{state.label}</Badge>;
}

const orderTones: Record<OrderStatus, Tone> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
};

const orderLabels: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderTones[status]}>{orderLabels[status]}</Badge>;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
      <div className="text-slate-400 dark:text-slate-500">
        {icon ?? <PackageOpen className="size-10" aria-hidden="true" />}
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {description ? (
        <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

/** Error state with a retry button. Network and 5xx errors are retryable; 4xx show the problem detail. */
export function ErrorState({
  title = 'Something went wrong',
  error,
  onRetry,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
}) {
  const message = error instanceof Error ? error.message : 'Please try again.';
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900 dark:bg-red-950/40"
    >
      <AlertTriangle className="size-8 text-red-600 dark:text-red-400" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">{title}</h2>
      <p className="max-w-md text-sm text-red-800 dark:text-red-300">{message}</p>
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="size-4" aria-hidden="true" />}
        >
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800', className)}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      {children}
    </div>
  );
}
