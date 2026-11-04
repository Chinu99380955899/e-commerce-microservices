export type StockTone = 'success' | 'warning' | 'danger';

/** Stock wording shared by product cards, product details and the admin tables. */
export function stockState(quantity: number): { label: string; tone: StockTone } {
  if (quantity <= 0) return { label: 'Out of stock', tone: 'danger' };
  if (quantity <= 5) return { label: `Only ${quantity} left`, tone: 'warning' };
  return { label: 'In stock', tone: 'success' };
}
