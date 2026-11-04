import type { QueryClient } from '@tanstack/react-query';
import { resetDb } from '../../mocks/db';
import { toast } from '../../lib/toast';

/** Restores the seeded demo data (catalogue, carts, orders) and refreshes every view. */
export function resetDemoData(queryClient: QueryClient): void {
  resetDb();
  void queryClient.resetQueries();
  toast.info('Demo data reset', 'The catalogue, carts and orders are back to the starting data.');
}
