import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { deleteProduct, listProducts, productKeys, searchProducts } from '../../api/products';
import type { Product } from '../../api/schemas';
import { useDocumentTitle } from '../../app/hooks';
import { CATEGORIES, categoryLabel } from '../../lib/categories';
import { formatInteger, formatMoney } from '../../lib/format';
import { toast } from '../../lib/toast';
import { useDebouncedValue } from '../../lib/hooks';
import { ApiError } from '../../api/client';
import { categorySchema } from '../../api/schemas';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Pagination } from '../../components/ui/Pagination';
import { TextField, SelectField } from '../../components/ui/Field';
import {
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  StockBadge,
  Badge,
} from '../../components/ui/Status';

const PAGE_SIZE = 10;

/**
 * Searchable, filterable, paginated product table. Search uses /products/search; the category
 * filter applies to the listing, and to search results on the current page.
 */
export function AdminProductsPage() {
  useDocumentTitle('Admin products');
  const [params, setParams] = useSearchParams();
  const category = categorySchema.safeParse(params.get('category')).data;
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [toDeactivate, setToDeactivate] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  const setPageOrCategory = (next: { category?: string; page?: number }) => {
    const updated = new URLSearchParams(params);
    if (next.category !== undefined) {
      if (next.category) updated.set('category', next.category);
      else updated.delete('category');
      updated.delete('page');
    }
    if (next.page !== undefined) {
      if (next.page > 1) updated.set('page', String(next.page));
      else updated.delete('page');
    }
    setParams(updated);
  };

  const query = useQuery({
    queryKey: search
      ? [...productKeys.all, 'admin-search', search, page]
      : [...productKeys.all, 'admin-list', category ?? '', page],
    queryFn: ({ signal }) =>
      search
        ? searchProducts(search, page - 1, PAGE_SIZE, signal)
        : listProducts({ category, page: page - 1, size: PAGE_SIZE, sort: 'name,asc' }, signal),
  });

  // In search mode the category filter narrows the current page of results.
  const rows = query.data
    ? search && category
      ? query.data.content.filter((product) => product.category === category)
      : query.data.content
    : [];

  const remove = async () => {
    if (!toDeactivate) return;
    try {
      await deleteProduct(toDeactivate.id);
      toast.success('Product deactivated', `${toDeactivate.name} is hidden from the store.`);
      setToDeactivate(null);
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    } catch (error) {
      toast.error(
        'Could not deactivate',
        error instanceof ApiError ? error.message : 'Please try again.',
      );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div role="search" className="grid w-full gap-3 sm:grid-cols-[1fr_200px] lg:max-w-2xl">
          <TextField
            label="Search products"
            type="search"
            value={searchInput}
            placeholder="Name, brand or SKU"
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <SelectField
            label="Category"
            placeholder="All categories"
            value={category ?? ''}
            options={CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
            onChange={(event) => setPageOrCategory({ category: event.target.value })}
          />
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex h-10 items-center gap-2 self-start rounded-xl bg-gradient-to-r from-aura-600 to-violet-600 px-4 text-sm font-medium text-white"
        >
          <PlusCircle className="size-4" aria-hidden="true" />
          New product
        </Link>
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No products match"
          description="Change the search or category, or create a new product."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Products</caption>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    SKU
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Price
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
                {rows.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{product.name}</span>
                      {product.brand ? (
                        <span className="block text-xs text-slate-500">{product.brand}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="aura">{categoryLabel(product.category)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(product.price, product.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StockBadge quantity={product.stockQuantity} />
                        <span className="text-xs text-slate-500 tabular-nums">
                          {formatInteger(product.stockQuantity)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          aria-label={`Edit ${product.name}`}
                          className="grid size-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Deactivate ${product.name}`}
                          onClick={() => setToDeactivate(product)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {query.data ? (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalElements={query.data.page.totalElements}
          totalPages={query.data.page.totalPages}
          onPageChange={(next) => setPageOrCategory({ page: next })}
        />
      ) : null}

      <Dialog
        open={toDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setToDeactivate(null);
        }}
        title="Deactivate this product?"
        description="It will disappear from the store and from search. You can't undo this from the app yet."
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDeactivate(null)}>
              Keep product
            </Button>
            <Button variant="danger" onClick={() => void remove()}>
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {toDeactivate ? (
            <>
              <span className="font-medium">{toDeactivate.name}</span> ({toDeactivate.sku}) will be
              hidden. Existing orders are not changed.
            </>
          ) : null}
        </p>
      </Dialog>
    </div>
  );
}
