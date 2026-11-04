import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PackageSearch } from 'lucide-react';
import { useProducts } from '../../api/products';
import { useDocumentTitle } from '../../app/hooks';
import { CATEGORIES } from '../../lib/categories';
import { cn } from '../../lib/cn';
import { ProductCard } from '../../components/ui/ProductCard';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Status';
import { SelectField } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import {
  apiPage,
  buildCatalogueSearch,
  PAGE_SIZES,
  parseCatalogueParams,
  SORT_OPTIONS,
  type CatalogueParams,
} from './params';

export function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseCatalogueParams(searchParams);
  const title = params.category
    ? CATEGORIES.find((c) => c.key === params.category)?.label
    : 'All products';
  useDocumentTitle(title);

  // Every change goes through the URL, so back and forward work. Filter, sort and size reset the page.
  const update = (next: Partial<CatalogueParams>, resetPage: boolean) => {
    const merged: CatalogueParams = {
      ...params,
      ...next,
      page: resetPage ? 1 : (next.page ?? params.page),
    };
    setSearchParams(buildCatalogueSearch(merged));
  };

  const query = useProducts({
    category: params.category,
    page: apiPage(params),
    size: params.size,
    sort: params.sort,
  });
  const data = query.data;

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside aria-label="Category filter" className="lg:sticky lg:top-28 lg:h-fit">
        <h2 className="sr-only">Filter by category</h2>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          <li>
            <FilterChip
              active={!params.category}
              onClick={() => update({ category: undefined }, true)}
            >
              All products
            </FilterChip>
          </li>
          {CATEGORIES.map((category) => (
            <li key={category.key}>
              <FilterChip
                active={params.category === category.key}
                onClick={() => update({ category: category.key }, true)}
              >
                <category.icon className="size-4" aria-hidden="true" />
                {category.label}
              </FilterChip>
            </li>
          ))}
        </ul>
      </aside>

      <section aria-labelledby="catalogue-heading" className="min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 id="catalogue-heading" className="text-2xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Active products, with live stock.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="w-full sm:w-56">
              <SelectField
                label="Sort by"
                value={params.sort}
                options={SORT_OPTIONS}
                onChange={(event) =>
                  update({ sort: event.target.value as CatalogueParams['sort'] }, true)
                }
              />
            </div>
            <div className="w-full sm:w-28">
              <SelectField
                label="Per page"
                value={String(params.size)}
                options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
                onChange={(event) =>
                  update({ size: Number(event.target.value) as CatalogueParams['size'] }, true)
                }
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          {query.isPending ? (
            <div
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              aria-busy="true"
              aria-label="Loading products"
            >
              {Array.from({ length: params.size }, (_, index) => (
                <Skeleton key={index} className="h-72" />
              ))}
            </div>
          ) : query.isError || !data ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : data.content.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="size-10" aria-hidden="true" />}
              title="No products here yet"
              description={
                params.page > 1
                  ? 'This page is empty. Go back to the first page.'
                  : 'Try another category.'
              }
              action={
                params.page > 1 ? (
                  <Button variant="secondary" onClick={() => update({}, true)}>
                    Go to the first page
                  </Button>
                ) : (
                  <Link
                    to="/products"
                    className="text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
                  >
                    See all products
                  </Link>
                )
              }
            />
          ) : (
            <>
              <ul
                className={cn(
                  'grid gap-4 sm:grid-cols-2 xl:grid-cols-3',
                  query.isFetching && 'opacity-70 transition-opacity',
                )}
                aria-busy={query.isFetching}
              >
                {data.content.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Pagination
                  page={params.page}
                  pageSize={params.size}
                  totalElements={data.page.totalElements}
                  totalPages={data.page.totalPages}
                  onPageChange={(page) => update({ page }, false)}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium lg:w-full lg:rounded-xl',
        active
          ? 'border-aura-600 bg-aura-600 text-white dark:border-aura-500'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  );
}
