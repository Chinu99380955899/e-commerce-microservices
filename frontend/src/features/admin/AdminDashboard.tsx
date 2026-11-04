import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Boxes, PackageCheck, PackageX, Wallet } from 'lucide-react';
import { useAllProducts } from '../../api/products';
import { useDocumentTitle } from '../../app/hooks';
import { CATEGORIES, categoryLabel } from '../../lib/categories';
import { formatInteger, formatMoney } from '../../lib/format';
import { Card, ErrorState, Skeleton, StockBadge } from '../../components/ui/Status';
import { LOW_STOCK_THRESHOLD, dashboardStats } from './stats';

export function AdminDashboard() {
  useDocumentTitle('Admin dashboard');
  const all = useAllProducts();

  if (all.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }
  if (all.isError) return <ErrorState error={all.error} onRetry={() => void all.refetch()} />;

  const stats = dashboardStats(all.data);
  const maxCategory = Math.max(1, ...stats.perCategory.map((entry) => entry.count));

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={<PackageCheck className="size-5" aria-hidden="true" />}
          label="Active products"
          value={formatInteger(stats.active)}
        />
        <Tile
          icon={<PackageX className="size-5" aria-hidden="true" />}
          label="Out of stock"
          value={formatInteger(stats.outOfStock)}
          tone="danger"
        />
        <Tile
          icon={<Boxes className="size-5" aria-hidden="true" />}
          label={`Low stock (${LOW_STOCK_THRESHOLD} or fewer)`}
          value={formatInteger(stats.lowStock)}
          tone="warning"
        />
        <Tile
          icon={<Wallet className="size-5" aria-hidden="true" />}
          label="Stock value"
          value={formatMoney(stats.stockValue)}
        />
      </section>

      <Card className="p-5 sm:p-6">
        <h2 className="font-semibold">Products per category</h2>
        <ul className="mt-4 flex flex-col gap-3" aria-label="Products per category">
          {stats.perCategory.map((entry) => (
            <li
              key={entry.key}
              className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm"
            >
              <span className="text-slate-700 dark:text-slate-300">{categoryLabel(entry.key)}</span>
              <div
                className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-aura-500 to-violet-500"
                  style={{ width: `${(entry.count / maxCategory) * 100}%` }}
                />
              </div>
              <span className="text-right font-medium tabular-nums">{entry.count}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {CATEGORIES.length} categories. Counts include active products only.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <h2 className="font-semibold">Low stock</h2>
          <Link
            to="/admin/products"
            className="text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
          >
            All products
          </Link>
        </div>
        {stats.lowStockItems.length === 0 ? (
          <p className="p-5 text-sm text-slate-600 dark:text-slate-400">Nothing is running low.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Products with five or fewer units left</caption>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3">
                    SKU
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Stock
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stats.lowStockItems.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                    <td className="px-4 py-3">
                      <StockBadge quantity={product.stockQuantity} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        className="inline-flex h-9 items-center rounded-xl border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Edit<span className="sr-only"> {product.name}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: 'neutral' | 'warning' | 'danger';
}) {
  const toneClass = {
    neutral: 'text-aura-600 bg-aura-50 dark:text-aura-400 dark:bg-aura-950',
    warning: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950',
    danger: 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950',
  }[tone];
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${toneClass}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </Card>
  );
}
