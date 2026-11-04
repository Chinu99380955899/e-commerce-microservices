import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import {
  pagedProductsSchema,
  productSchema,
  semanticResultSchema,
  type CategoryKey,
  type PagedProducts,
  type Product,
  type SemanticSearchResult,
} from './schemas';
import { request } from './client';
import type { ProductRequest } from './productRequest';

export type ProductSort = 'name,asc' | 'price,asc' | 'price,desc' | 'createdAt,desc';

export interface ProductListParams {
  category?: CategoryKey;
  /** 0-based page, as the API expects. The URL uses 1-based pages and converts. */
  page: number;
  size: number;
  sort: ProductSort;
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductListParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  search: (q: string, page: number, size: number) =>
    [...productKeys.all, 'search', q, page, size] as const,
  semantic: (q: string, limit: number) => [...productKeys.all, 'semantic', q, limit] as const,
};

export function listProducts(
  params: ProductListParams,
  signal?: AbortSignal,
): Promise<PagedProducts> {
  return request('/products', {
    query: { category: params.category, page: params.page, size: params.size, sort: params.sort },
    schema: pagedProductsSchema,
    signal,
    withIdentity: false,
  });
}

export function getProduct(id: string, signal?: AbortSignal): Promise<Product> {
  return request(`/products/${encodeURIComponent(id)}`, {
    schema: productSchema,
    signal,
    withIdentity: false,
  });
}

export function searchProducts(
  q: string,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<PagedProducts> {
  return request('/products/search', {
    query: { q, page, size },
    schema: pagedProductsSchema,
    signal,
    withIdentity: false,
  });
}

export function semanticSearch(
  q: string,
  limit: number,
  signal?: AbortSignal,
): Promise<SemanticSearchResult> {
  return request('/products/semantic-search', {
    query: { q, limit },
    schema: semanticResultSchema,
    signal,
    withIdentity: false,
  });
}

export function listProductsQuery(params: ProductListParams) {
  return queryOptions({
    queryKey: productKeys.list(params),
    queryFn: ({ signal }) => listProducts(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function productQuery(id: string) {
  return queryOptions({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => getProduct(id, signal),
  });
}

/** Loads one product. Pass an empty id (for example on the create form) to skip the request. */
export function useProduct(id: string) {
  return useQuery({ ...productQuery(id), enabled: id.length > 0 });
}

export function useProducts(params: ProductListParams) {
  return useQuery(listProductsQuery(params));
}

/** The whole active catalogue, for category counts and the admin dashboard. */
export async function listAllProducts(signal?: AbortSignal): Promise<Product[]> {
  const all: Product[] = [];
  let page = 0;
  for (;;) {
    const result = await listProducts({ page, size: 100, sort: 'name,asc' }, signal);
    all.push(...result.content);
    if (page + 1 >= result.page.totalPages) break;
    page += 1;
  }
  return all;
}

export function allProductsQuery() {
  return queryOptions({
    queryKey: [...productKeys.lists(), 'all'] as const,
    queryFn: ({ signal }) => listAllProducts(signal),
  });
}

export function useAllProducts() {
  return useQuery(allProductsQuery());
}

export function useSemanticSearch(q: string, limit: number, enabled = true) {
  return useQuery({
    queryKey: productKeys.semantic(q, limit),
    queryFn: ({ signal }) => semanticSearch(q, limit, signal),
    enabled: enabled && q.trim().length > 0,
  });
}

/** Admin write calls. The SKU is fixed after creation, so updates do not send it. */
export function createProduct(body: ProductRequest): Promise<Product> {
  return request('/products', { method: 'POST', body, schema: productSchema });
}

export function updateProduct(
  id: string,
  body: ProductRequest & { expectedUpdatedAt?: string },
): Promise<Product> {
  return request(`/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
    schema: productSchema,
  });
}

export function deleteProduct(id: string): Promise<void> {
  return request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
