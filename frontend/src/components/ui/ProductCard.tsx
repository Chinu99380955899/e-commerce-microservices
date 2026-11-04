import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Product } from '../../api/schemas';
import { productQuery } from '../../api/products';
import { formatMoney } from '../../lib/format';
import { categoryLabel } from '../../lib/categories';
import { ProductArt } from './ProductArt';
import { StockBadge } from './Status';

/** A product tile for lists and rows. Hovering prefetches the details page. */
export function ProductCard({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  // Prefetching is best effort: a failed prefetch just means the details page fetches on open.
  const prefetch = () => {
    queryClient.query({ ...productQuery(product.id), staleTime: 'static' }).catch(() => undefined);
  };
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <Link
        to={`/products/${product.id}`}
        className="flex flex-1 flex-col gap-3 p-3"
        onMouseEnter={prefetch}
        onFocus={prefetch}
      >
        <ProductArt sku={product.sku} category={product.category} brand={product.brand} />
        <div className="flex flex-1 flex-col gap-1 px-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {categoryLabel(product.category)}
          </p>
          <h3 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-aura-700 dark:text-slate-100 dark:group-hover:text-aura-400">
            {product.name}
          </h3>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className="font-semibold tabular-nums">
              {formatMoney(product.price, product.currency)}
            </span>
            <StockBadge quantity={product.stockQuantity} />
          </div>
        </div>
      </Link>
    </article>
  );
}
