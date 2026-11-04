import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Save } from 'lucide-react';
import { createProduct, productKeys, updateProduct, useProduct } from '../../api/products';
import { ApiError } from '../../api/client';
import { productRequestSchema, type ProductRequest } from '../../api/productRequest';
import { CATEGORIES } from '../../lib/categories';
import { useDocumentTitle } from '../../app/hooks';
import { toast } from '../../lib/toast';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { Badge, Card, ErrorState, Skeleton } from '../../components/ui/Status';
import type { z } from 'zod';

/** The form works on the input shape (brand may be empty); submit parses it into the request shape. */
type ProductFormInput = z.input<typeof productRequestSchema>;

const FIELD_NAMES = [
  'sku',
  'name',
  'description',
  'category',
  'brand',
  'price',
  'currency',
  'stockQuantity',
] as const;

export function ProductFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const product = useProduct(id ?? '');
  useDocumentTitle(editing ? 'Edit product' : 'New product');

  if (editing && product.isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-10" />
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (editing && product.isError)
    return <ErrorState error={product.error} onRetry={() => void product.refetch()} />;

  return (
    <ProductForm
      key={product.data?.id ?? 'new'}
      id={id}
      defaults={
        product.data
          ? {
              sku: product.data.sku,
              name: product.data.name,
              description: product.data.description,
              category: product.data.category,
              brand: product.data.brand ?? '',
              price: product.data.price,
              currency: product.data.currency,
              stockQuantity: product.data.stockQuantity,
            }
          : undefined
      }
      expectedUpdatedAt={product.data?.updatedAt}
    />
  );
}

function ProductForm({
  id,
  defaults,
  expectedUpdatedAt,
}: {
  id: string | undefined;
  defaults: ProductFormInput | undefined;
  expectedUpdatedAt: string | undefined;
}) {
  const editing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [concurrent, setConcurrent] = useState(false);
  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productRequestSchema),
    defaultValues: defaults ?? {
      sku: '',
      name: '',
      description: '',
      category: CATEGORIES[0]?.key ?? 'electronics',
      brand: '',
      price: 0,
      currency: 'INR',
      stockQuantity: 0,
    },
    mode: 'onTouched',
  });
  const errors = form.formState.errors;

  /** Maps server validation and conflict errors onto the form fields. */
  const showServerError = (error: unknown) => {
    if (!(error instanceof ApiError)) {
      toast.error('Could not save the product', 'Please try again.');
      return;
    }
    const problemType = error.problem?.type ?? '';
    if (error.status === 400) {
      for (const [field, message] of Object.entries(error.fieldErrors)) {
        if ((FIELD_NAMES as readonly string[]).includes(field)) {
          form.setError(field as keyof ProductFormInput, { type: 'server', message });
        }
      }
      toast.error('Check the highlighted fields', error.message);
      return;
    }
    if (problemType.endsWith('/duplicate-sku')) {
      form.setError('sku', {
        type: 'server',
        message: 'This SKU is already used by another product',
      });
      toast.error('Duplicate SKU', error.message);
      return;
    }
    if (problemType.endsWith('/concurrent-update')) {
      setConcurrent(true);
      return;
    }
    toast.error('Could not save the product', error.message);
  };

  const onSubmit = async (values: ProductFormInput) => {
    setConcurrent(false);
    const parsed = productRequestSchema.safeParse(values);
    if (!parsed.success) return;
    try {
      if (editing && id) {
        const body: ProductRequest & { expectedUpdatedAt?: string } = {
          ...parsed.data,
          expectedUpdatedAt,
        };
        await updateProduct(id, body);
        toast.success('Product saved', `${parsed.data.name} is up to date.`);
      } else {
        await createProduct(parsed.data);
        toast.success('Product created', `${parsed.data.name} is now in the catalogue.`);
      }
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      void navigate('/admin/products');
    } catch (error) {
      showServerError(error);
    }
  };

  const submitting = form.formState.isSubmitting;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{editing ? 'Edit product' : 'New product'}</h2>
          {editing ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The SKU can't be changed after a product is created.
            </p>
          ) : null}
        </div>
        <Link
          to="/admin/products"
          className="text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
        >
          Back to products
        </Link>
      </div>

      {concurrent ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-medium">
            Someone else changed this product while you were editing. Reload to see the latest
            version before saving.
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="size-4" aria-hidden="true" />}
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </div>
      ) : null}

      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
      >
        <Card className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextField
                  label="SKU"
                  hint={
                    editing
                      ? 'Fixed after creation'
                      : 'Upper-case letters, digits and dashes, for example AUD-ANC-100'
                  }
                  readOnly={editing}
                  disabled={editing}
                  required
                  error={errors.sku?.message}
                  {...form.register('sku')}
                />
              </div>
              {editing ? <Badge tone="neutral">read-only</Badge> : null}
            </div>
          </div>
          <div className="sm:col-span-2">
            <TextField
              label="Name"
              required
              error={errors.name?.message}
              {...form.register('name')}
            />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label
              htmlFor="product-description"
              className="text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Description{' '}
              <span className="text-red-600 dark:text-red-400" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              id="product-description"
              rows={4}
              required
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? 'product-description-error' : undefined}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              {...form.register('description')}
            />
            {errors.description ? (
              <p id="product-description-error" className="text-sm text-red-700 dark:text-red-400">
                {errors.description.message}
              </p>
            ) : null}
          </div>
          <SelectField
            label="Category"
            required
            options={CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
            error={errors.category?.message}
            {...form.register('category')}
          />
          <TextField
            label="Brand (optional)"
            error={errors.brand?.message}
            {...form.register('brand')}
          />
          <TextField
            label="Price (₹)"
            type="number"
            step="0.01"
            min={0}
            inputMode="decimal"
            required
            error={errors.price?.message}
            {...form.register('price', { valueAsNumber: true })}
          />
          <TextField
            label="Currency"
            maxLength={3}
            required
            hint="Three letters, for example INR"
            error={errors.currency?.message}
            {...form.register('currency')}
          />
          <TextField
            label="Stock quantity"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            required
            error={errors.stockQuantity?.message}
            {...form.register('stockQuantity', { valueAsNumber: true })}
          />
        </Card>
        <div className="mt-5 flex justify-end gap-3">
          <Link
            to="/admin/products"
            className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-sm font-medium dark:border-slate-700"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            size="lg"
            loading={submitting}
            icon={<Save className="size-4" aria-hidden="true" />}
          >
            {editing ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
