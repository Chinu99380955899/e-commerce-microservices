import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import { Bot, ShoppingCart } from 'lucide-react';
import { productQuery, useProduct, useSemanticSearch } from '../../api/products';
import { useAddToCart } from '../../api/cart';
import { ApiError } from '../../api/client';
import { useDocumentTitle } from '../../app/hooks';
import { useAssistantUi } from '../assistant/assistantUi';
import { toast } from '../../lib/toast';
import { categoryLabel } from '../../lib/categories';
import { formatMoney } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { ProductArt } from '../../components/ui/ProductArt';
import { ProductCard } from '../../components/ui/ProductCard';
import { QuantityStepper } from '../../components/ui/QuantityStepper';
import { EmptyState, ErrorState, Skeleton, StockBadge } from '../../components/ui/Status';
import { stockState } from '../../lib/stock';
import { MAX_LINE_QUANTITY } from '../../api/cart';
import { rememberViewed, readRecentlyViewed } from './recent';
import type { Product } from '../../api/schemas';

export function ProductPage() {
  const { id = '' } = useParams();
  const product = useProduct(id);

  useEffect(() => {
    if (product.data) rememberViewed(product.data.id);
  }, [product.data]);

  useDocumentTitle(product.data?.name);

  if (product.isPending) {
    return (
      <div className="grid gap-8 lg:grid-cols-2" aria-busy="true">
        <Skeleton className="aspect-square" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }
  if (product.error instanceof ApiError && product.error.status === 404) {
    return (
      <EmptyState
        title="Product not found"
        description="This product may have been removed. Try searching for it."
        action={
          <Link
            to="/products"
            className="text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
          >
            Browse the catalogue
          </Link>
        }
      />
    );
  }
  if (product.isError)
    return <ErrorState error={product.error} onRetry={() => void product.refetch()} />;

  return <ProductDetails product={product.data} />;
}

function ProductDetails({ product }: { product: Product }) {
  const { openAssistant } = useAssistantUi();
  const addToCart = useAddToCart();
  const [quantity, setQuantity] = useState(1);
  const maxQuantity = Math.max(1, Math.min(product.stockQuantity, MAX_LINE_QUANTITY));
  const outOfStock = product.stockQuantity === 0;
  const stockLabel = stockState(product.stockQuantity).label;

  const similar = useSemanticSearch(product.name, 5);
  const similarProducts = (similar.data?.results ?? [])
    .map((hit) => hit.product)
    .filter((candidate) => candidate.id !== product.id)
    .slice(0, 4);

  const recentIds = readRecentlyViewed(product.id).slice(0, 4);
  const recent = useQueries({ queries: recentIds.map((recentId) => productQuery(recentId)) });
  const recentProducts = recent.flatMap((result) => (result.data ? [result.data] : []));

  return (
    <div className="flex flex-col gap-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-600 dark:text-slate-400">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to="/" className="hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to={`/products?category=${product.category}`} className="hover:underline">
                  {categoryLabel(product.category)}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li
                aria-current="page"
                className="line-clamp-1 font-medium text-slate-900 dark:text-slate-100"
              >
                {product.name}
              </li>
            </ol>
          </nav>
          <ProductArt
            sku={product.sku}
            category={product.category}
            brand={product.brand}
            size="lg"
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-5">
          <div>
            {product.brand ? (
              <p className="text-sm font-semibold uppercase tracking-wide text-aura-700 dark:text-aura-400">
                {product.brand}
              </p>
            ) : null}
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{product.name}</h1>
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {formatMoney(product.price, product.currency)}
          </p>
          <div className="flex items-center gap-3" aria-live="polite">
            <StockBadge quantity={product.stockQuantity} />
            <span className="text-sm text-slate-600 dark:text-slate-400">{stockLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <QuantityStepper
              label="quantity"
              value={Math.min(quantity, maxQuantity)}
              min={1}
              max={maxQuantity}
              disabled={outOfStock}
              onChange={setQuantity}
            />
            <Button
              size="lg"
              disabled={outOfStock}
              loading={addToCart.isPending}
              className="flex-1 sm:flex-none"
              icon={<ShoppingCart className="size-5" aria-hidden="true" />}
              onClick={() =>
                addToCart.mutate(
                  { productId: product.id, quantity: Math.min(quantity, maxQuantity) },
                  {
                    onSuccess: () => {
                      toast.success(
                        'Added to your cart',
                        `${product.name} × ${Math.min(quantity, maxQuantity)}`,
                      );
                    },
                  },
                )
              }
            >
              {outOfStock ? 'Out of stock' : 'Add to cart'}
            </Button>
          </div>

          <Button
            variant="secondary"
            className="self-start"
            icon={<Bot className="size-4 text-aura-600 dark:text-aura-400" aria-hidden="true" />}
            onClick={() =>
              openAssistant(`Tell me about the ${product.name}. Is it a good choice for me?`)
            }
          >
            Ask Aura about this product
          </Button>

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-slate-200 pt-5 text-sm dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400">SKU</dt>
            <dd className="font-mono">{product.sku}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Category</dt>
            <dd>{categoryLabel(product.category)}</dd>
          </dl>

          <section
            aria-labelledby="description-heading"
            className="border-t border-slate-200 pt-5 dark:border-slate-800"
          >
            <h2 id="description-heading" className="text-lg font-semibold">
              About this product
            </h2>
            <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-300">
              {product.description}
            </p>
          </section>
        </div>
      </div>

      {similar.isError ? null : (
        <section aria-labelledby="similar-heading">
          <h2 id="similar-heading" className="text-xl font-semibold">
            Similar products
          </h2>
          {similar.isPending ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          ) : similarProducts.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Nothing similar in the catalogue right now.
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {similarProducts.map((candidate) => (
                <li key={candidate.id}>
                  <ProductCard product={candidate} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {recentProducts.length > 0 ? (
        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="text-xl font-semibold">
            Recently viewed
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recentProducts.map((recentProduct) => (
              <li key={recentProduct.id}>
                <ProductCard product={recentProduct} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
