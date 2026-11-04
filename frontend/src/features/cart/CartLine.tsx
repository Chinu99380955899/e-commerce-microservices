import { Link } from 'react-router';
import { Trash2 } from 'lucide-react';
import type { CartItem } from '../../api/schemas';
import { useRemoveCartItem, useSetCartQuantity, MAX_LINE_QUANTITY } from '../../api/cart';
import { ProductArt } from '../../components/ui/ProductArt';
import { QuantityStepper } from '../../components/ui/QuantityStepper';
import { Price } from '../../components/ui/Status';
import { Button } from '../../components/ui/Button';
import { formatMoney } from '../../lib/format';
import { useCategoryForSku } from './productCategory';

/** One cart line: art, name, unit price, stepper, line total and remove. */
export function CartLine({ item, compact = false }: { item: CartItem; compact?: boolean }) {
  const setQuantity = useSetCartQuantity();
  const remove = useRemoveCartItem();
  const busy = setQuantity.isPending || remove.isPending;
  const category = useCategoryForSku(item.sku);
  return (
    <li className="flex gap-4 py-4">
      <ProductArt sku={item.sku} category={category} brand={null} size="sm" className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/products/${item.productId}`}
              className="line-clamp-2 font-medium text-slate-900 hover:text-aura-700 dark:text-slate-100 dark:hover:text-aura-400"
            >
              {item.name}
            </Link>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {formatMoney(item.unitPrice, item.currency)} each
            </p>
          </div>
          <Price amount={item.lineTotal} currency={item.currency} className="shrink-0" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <QuantityStepper
            label={item.name}
            value={item.quantity}
            min={1}
            max={MAX_LINE_QUANTITY}
            disabled={busy}
            onChange={(next) => setQuantity.mutate({ productId: item.productId, quantity: next })}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => remove.mutate(item.productId)}
            aria-label={`Remove ${item.name} from cart`}
            icon={<Trash2 className="size-4" aria-hidden="true" />}
          >
            {compact ? null : 'Remove'}
          </Button>
        </div>
      </div>
    </li>
  );
}
