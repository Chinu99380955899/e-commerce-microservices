import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartSchema, type Cart, type CartItem } from './schemas';
import { request, ApiError } from './client';
import { toast } from '../lib/toast';

export const cartKeys = {
  all: ['cart'] as const,
  current: () => [...cartKeys.all, 'current'] as const,
};

export const MAX_LINE_QUANTITY = 10;

export function getCart(signal?: AbortSignal): Promise<Cart> {
  return request('/carts/current', { schema: cartSchema, signal });
}

export function cartQuery() {
  return queryOptions({
    queryKey: cartKeys.current(),
    queryFn: ({ signal }) => getCart(signal),
  });
}

export function useCart() {
  return useQuery(cartQuery());
}

export function addCartItem(productId: string, quantity: number): Promise<Cart> {
  return request('/carts/current/items', {
    method: 'POST',
    body: { productId, quantity },
    schema: cartSchema,
  });
}

export function setCartItemQuantity(productId: string, quantity: number): Promise<Cart> {
  return request(`/carts/current/items/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: { quantity },
    schema: cartSchema,
  });
}

export function removeCartItem(productId: string): Promise<Cart> {
  return request(`/carts/current/items/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    schema: cartSchema,
  });
}

export function clearCart(): Promise<void> {
  return request('/carts/current', { method: 'DELETE' });
}

/**
 * Moves a guest's cart into a signed-in customer's cart: each line is added to the user's cart and
 * the guest cart is emptied. Lines that no longer fit in stock are skipped and counted.
 */
export async function mergeGuestCart(
  guestId: string,
  customerId: string,
): Promise<{ moved: number; skipped: number }> {
  const guest = await request<Cart>('/carts/current', { customerId: guestId, schema: cartSchema });
  let moved = 0;
  let skipped = 0;
  for (const line of guest.items) {
    try {
      await request('/carts/current/items', {
        method: 'POST',
        body: { productId: line.productId, quantity: line.quantity },
        customerId,
        schema: cartSchema,
      });
      moved += 1;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        skipped += 1;
      } else {
        throw error;
      }
    }
  }
  if (guest.items.length > 0) {
    await request('/carts/current', { method: 'DELETE', customerId: guestId });
  }
  return { moved, skipped };
}

/** Recomputes totals locally so an optimistic change looks right before the server answers. */
export function withLines(cart: Cart, items: CartItem[]): Cart {
  const normalised = items.map((item) => ({
    ...item,
    lineTotal: Math.round(item.unitPrice * item.quantity * 100) / 100,
  }));
  return {
    ...cart,
    items: normalised,
    itemCount: normalised.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: Math.round(normalised.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100,
  };
}

/** Rolls the cache back to the snapshot taken before an optimistic update. */
type Snapshot = { previous: Cart | undefined };

function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}

export function useSetCartQuantity() {
  const queryClient = useQueryClient();
  return useMutation<Cart, unknown, { productId: string; quantity: number }, Snapshot>({
    mutationFn: ({ productId, quantity }) => setCartItemQuantity(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.current() });
      const previous = queryClient.getQueryData<Cart>(cartKeys.current());
      if (previous) {
        const items =
          quantity === 0
            ? previous.items.filter((item) => item.productId !== productId)
            : previous.items.map((item) =>
                item.productId === productId ? { ...item, quantity } : item,
              );
        queryClient.setQueryData(cartKeys.current(), withLines(previous, items));
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(cartKeys.current(), context.previous);
      toast.error('Cart not updated', describeError(error));
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.current(), cart);
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation<Cart, unknown, string, Snapshot>({
    mutationFn: (productId) => removeCartItem(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.current() });
      const previous = queryClient.getQueryData<Cart>(cartKeys.current());
      if (previous) {
        queryClient.setQueryData(
          cartKeys.current(),
          withLines(
            previous,
            previous.items.filter((item) => item.productId !== productId),
          ),
        );
      }
      return { previous };
    },
    onError: (error, _productId, context) => {
      if (context?.previous) queryClient.setQueryData(cartKeys.current(), context.previous);
      toast.error('Could not remove the item', describeError(error));
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.current(), cart);
    },
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation<Cart, unknown, { productId: string; quantity: number }>({
    mutationFn: ({ productId, quantity }) => addCartItem(productId, quantity),
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.current(), cart);
    },
    onError: (error) => {
      toast.error('Could not add to cart', describeError(error));
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearCart(),
    onSuccess: () => {
      queryClient.setQueryData<Cart>(cartKeys.current(), (cart) =>
        cart ? withLines(cart, []) : cart,
      );
    },
    onError: (error) => {
      toast.error('Could not clear the cart', describeError(error));
    },
  });
}
