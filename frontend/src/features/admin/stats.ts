import type { Product } from '../../api/schemas';
import { CATEGORIES, type CategoryInfo } from '../../lib/categories';

/** Products with this many units or fewer count as low stock (and are listed on the dashboard). */
export const LOW_STOCK_THRESHOLD = 5;

export interface DashboardStats {
  active: number;
  outOfStock: number;
  /** Stock between 1 and LOW_STOCK_THRESHOLD. Sold-out products are counted only under outOfStock. */
  lowStock: number;
  stockValue: number;
  perCategory: { key: CategoryInfo['key']; count: number }[];
  lowStockItems: Product[];
}

/** Admin dashboard numbers, computed from the active catalogue. */
export function dashboardStats(products: readonly Product[]): DashboardStats {
  const active = products.filter((product) => product.stockQuantity >= 0);
  const outOfStock = active.filter((product) => product.stockQuantity === 0).length;
  const lowStockItems = active
    .filter((product) => product.stockQuantity > 0 && product.stockQuantity <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stockQuantity - b.stockQuantity || a.name.localeCompare(b.name));
  const stockValue =
    Math.round(
      active.reduce((sum, product) => sum + product.price * product.stockQuantity, 0) * 100,
    ) / 100;
  const perCategory = CATEGORIES.map((category) => ({
    key: category.key,
    count: active.filter((product) => product.category === category.key).length,
  }));
  return {
    active: active.length,
    outOfStock,
    lowStock: lowStockItems.length,
    stockValue,
    perCategory,
    lowStockItems,
  };
}
