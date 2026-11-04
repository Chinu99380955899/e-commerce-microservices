import { Link } from 'react-router';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../api/cart';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Price, Skeleton } from '../../components/ui/Status';
import { CartLine } from './CartLine';

/** The header's cart drawer: the same cart as the cart page, in a compact form. */
export function MiniCart({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cart = useCart();
  const data = cart.data;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="drawer"
      title="Your cart"
      description={data ? `${data.itemCount} item${data.itemCount === 1 ? '' : 's'}` : undefined}
      footer={
        data && data.items.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <Price amount={data.subtotal} currency={data.currency} className="text-base" />
            </div>
            <div className="flex gap-2">
              <Link
                to="/cart"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-slate-300 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                View cart
              </Link>
              <Link
                to="/checkout"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-aura-600 to-violet-600 text-sm font-medium text-white hover:from-aura-700 hover:to-violet-700"
              >
                Checkout
              </Link>
            </div>
          </div>
        ) : undefined
      }
    >
      {cart.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : cart.isError ? (
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
      ) : data && data.items.length > 0 ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {data.items.map((item) => (
            <CartLine key={item.productId} item={item} compact />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<ShoppingBag className="size-10" aria-hidden="true" />}
          title="Your cart is empty"
          description="Add something you like and it will show up here."
          action={
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              <Link to="/products">Browse products</Link>
            </Button>
          }
        />
      )}
    </Dialog>
  );
}
