import { categorySchema, type CategoryKey } from '../../api/schemas';
import type { ProductSort } from '../../api/products';

export const PAGE_SIZES = [12, 24, 48] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const SORT_OPTIONS: readonly { value: ProductSort; label: string }[] = [
  { value: 'name,asc', label: 'Name: A to Z' },
  { value: 'price,asc', label: 'Price: low to high' },
  { value: 'price,desc', label: 'Price: high to low' },
  { value: 'createdAt,desc', label: 'Newest first' },
];

export interface CatalogueParams {
  category: CategoryKey | undefined;
  sort: ProductSort;
  size: PageSize;
  /** 1-based, as shown in the URL. Convert to 0-based for the API with `apiPage`. */
  page: number;
}

export const DEFAULT_CATALOGUE_PARAMS: CatalogueParams = {
  category: undefined,
  sort: 'name,asc',
  size: 12,
  page: 1,
};

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 10_000 ? parsed : fallback;
}

/** Reads the catalogue state from the URL. Unknown or invalid values fall back to defaults. */
export function parseCatalogueParams(search: URLSearchParams): CatalogueParams {
  const categoryParse = categorySchema.safeParse(search.get('category'));
  const sortRaw = search.get('sort');
  const sort =
    SORT_OPTIONS.find((option) => option.value === sortRaw)?.value ?? DEFAULT_CATALOGUE_PARAMS.sort;
  const sizeRaw = parsePositiveInt(search.get('size'), DEFAULT_CATALOGUE_PARAMS.size);
  const size: PageSize = (PAGE_SIZES as readonly number[]).includes(sizeRaw)
    ? (sizeRaw as PageSize)
    : DEFAULT_CATALOGUE_PARAMS.size;
  return {
    category: categoryParse.success ? categoryParse.data : undefined,
    sort,
    size,
    page: parsePositiveInt(search.get('page'), DEFAULT_CATALOGUE_PARAMS.page),
  };
}

/** Writes the state back to the URL. Defaults are left out so URLs stay short. */
export function buildCatalogueSearch(params: CatalogueParams): URLSearchParams {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.sort !== DEFAULT_CATALOGUE_PARAMS.sort) search.set('sort', params.sort);
  if (params.size !== DEFAULT_CATALOGUE_PARAMS.size) search.set('size', String(params.size));
  if (params.page !== 1) search.set('page', String(params.page));
  return search;
}

/** The API's page numbers start at 0. */
export function apiPage(params: CatalogueParams): number {
  return params.page - 1;
}
