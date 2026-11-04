import { Link, useSearchParams } from 'react-router';
import { ChevronRight, ReceiptText } from 'lucide-react';
import { useOrders } from '../../api/orders';
import { useDocumentTitle } from '../../app/hooks';
import { formatDateTime, formatInteger } from '../../lib/format';
import { Pagination } from '../../components/ui/Pagination';
import {
  EmptyState,
  ErrorState,
  OrderStatusBadge,
  Price,
  Skeleton,
} from '../../components/ui/Status';
import type { OrderSummary } from '../../api/schemas';

const PAGE_SIZE = 10;

export function OrdersPage() {
  useDocumentTitle('Your orders');
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const query = useOrders(page - 1, PAGE_SIZE);

  const setPage = (next: number) => {
    const updated = new URLSearchParams(params);
    if (next > 1) updated.set('page', String(next));
    else updated.delete('page');
    setParams(updated);
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Your orders</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Newest first. Open an order to see where it is.
        </p>
      </header>

      {query.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.content.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="size-10" aria-hidden="true" />}
          title="No orders yet"
          description="When you place an order, it will appear here with live status."
          action={
            <Link
              to="/products"
              className="inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-aura-600 to-violet-600 px-4 text-sm font-medium text-white"
            >
              Start shopping
            </Link>
          }
        />
      ) : (
        <>
          <OrdersTable orders={query.data.content} />
          <OrderCards orders={query.data.content} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalElements={query.data.page.totalElements}
            totalPages={query.data.page.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function OrdersTable({ orders }: { orders: OrderSummary[] }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Your orders</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Order
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Placed
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Items
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Total
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3 font-mono">{order.id.slice(0, 8)}</td>
              <td className="px-4 py-3">{formatDateTime(order.createdAt)}</td>
              <td className="px-4 py-3">{formatInteger(order.itemCount)}</td>
              <td className="px-4 py-3">
                <Price amount={order.total} currency={order.currency} />
              </td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/orders/${order.id}`}
                  className="font-medium text-aura-700 hover:underline dark:text-aura-400"
                >
                  View<span className="sr-only"> order {order.id.slice(0, 8)}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderCards({ orders }: { orders: OrderSummary[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            to={`/orders/${order.id}`}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm">{order.id.slice(0, 8)}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {formatDateTime(order.createdAt)} · {formatInteger(order.itemCount)} item
                {order.itemCount === 1 ? '' : 's'}
              </p>
              <Price amount={order.total} currency={order.currency} className="mt-1 block" />
            </div>
            <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
