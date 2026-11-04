import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  orderSchema,
  pagedOrdersSchema,
  type Order,
  type PagedOrders,
  type ShippingAddress,
} from './schemas';
import { request } from './client';
import { cartKeys } from './cart';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (page: number, size: number) => [...orderKeys.lists(), page, size] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

/** Polling interval while an order is PENDING (spec: every 2 s). */
export const ORDER_POLL_MS = 2000;

export function placeOrder(shippingAddress: ShippingAddress): Promise<Order> {
  return request('/orders', {
    method: 'POST',
    body: { shippingAddress },
    schema: orderSchema,
  });
}

export function listOrders(page: number, size: number, signal?: AbortSignal): Promise<PagedOrders> {
  return request('/orders', { query: { page, size }, schema: pagedOrdersSchema, signal });
}

export function getOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return request(`/orders/${encodeURIComponent(id)}`, { schema: orderSchema, signal });
}

export function ordersQuery(page: number, size: number) {
  return queryOptions({
    queryKey: orderKeys.list(page, size),
    queryFn: ({ signal }) => listOrders(page, size, signal),
    placeholderData: keepPreviousData,
  });
}

export function useOrders(page: number, size: number) {
  return useQuery(ordersQuery(page, size));
}

export function orderQuery(id: string) {
  return queryOptions({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => getOrder(id, signal),
    // Poll while the saga is running; stop once the order is CONFIRMED or CANCELLED.
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' || !query.state.data ? ORDER_POLL_MS : false,
  });
}

export function useOrder(id: string) {
  return useQuery(orderQuery(id));
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shippingAddress: ShippingAddress) => placeOrder(shippingAddress),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      void queryClient.invalidateQueries({ queryKey: cartKeys.current() });
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}
