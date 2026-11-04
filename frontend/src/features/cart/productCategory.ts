import { useAllProducts } from '../../api/products';

/**
 * Cart lines carry no category, so product art looks it up in the cached catalogue by SKU.
 * Returns undefined until the catalogue has loaded (ProductArt then shows no icon).
 */
export function useCategoryForSku(sku: string): string | undefined {
  const all = useAllProducts();
  return all.data?.find((product) => product.sku === sku)?.category;
}
