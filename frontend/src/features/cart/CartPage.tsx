import { Link } from 'react-router';
import { ShoppingBag } from 'lucide-react';
import { useCart, useClearCart } from '../../api/cart';
import { useDocumentTitle } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState, ErrorState, Price, Skeleton } from '../../components/ui/Status';
import { useState } from 'react';
import { CartLine } from './CartLine';

export function CartPage() {
  useDocumentTitle('Cart');
  const cart = useCart();
  const clear = useClearCart();
  const [confirming, setConfirming] = useState(false);

  if (cart.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (cart.isError) return <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />;

  const data = cart.data;
  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-10" aria-hidden="true" />}
        title="Your cart is empty"
        description="Find something you like in the catalogue, or ask Aura for ideas."
        action={
          <Link
            to="/products"
            className="inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-aura-600 to-violet-600 px-4 text-sm font-medium text-white"
          >
            Browse products
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section aria-labelledby="cart-heading">
        <div className="flex items-center justify-between">
          <h1 id="cart-heading" className="text-2xl font-bold tracking-tight">
            Your cart
          </h1>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Clear cart
          </Button>
        </div>
        <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {data.items.map((item) => (
            <CartLine key={item.productId} item={item} />
          ))}
        </ul>
      </section>
      <aside
        aria-label="Order summary"
        className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            Subtotal ({data.itemCount} item{data.itemCount === 1 ? '' : 's'})
          </span>
          <Price amount={data.subtotal} currency={data.currency} className="text-lg" />
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Delivery and taxes are calculated at checkout.
        </p>
        <Link
          to="/checkout"
          className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-aura-600 to-violet-600 text-base font-medium text-white hover:from-aura-700 hover:to-violet-700"
        >
          Continue to checkout
        </Link>
        <Link
          to="/products"
          className="mt-3 block text-center text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
        >
          Keep shopping
        </Link>
      </aside>

      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Clear your cart?"
        description="All items will be removed. This can't be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Keep items
            </Button>
            <Button
              variant="danger"
              loading={clear.isPending}
              onClick={() => {
                clear.mutate(undefined, { onSuccess: () => setConfirming(false) });
              }}
            >
              Clear cart
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          You have {data.itemCount} item{data.itemCount === 1 ? '' : 's'} worth{' '}
          <Price amount={data.subtotal} currency={data.currency} />.
        </p>
      </Dialog>
    </div>
  );
}
