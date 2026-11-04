import { categoryInfo } from '../../lib/categories';
import { hashString } from '../../mocks/rng';
import { cn } from '../../lib/cn';

const GRADIENTS = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-indigo-600',
  'from-violet-500 to-fuchsia-600',
  'from-teal-500 to-cyan-600',
  'from-slate-600 to-slate-800',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
];

/** A stable gradient for a SKU: the same product always gets the same colours. */
function gradientFor(sku: string): string {
  return GRADIENTS[hashString(sku) % GRADIENTS.length] ?? GRADIENTS[0] ?? '';
}

/**
 * Product art: the backend has no images, so each product is drawn as a tile with a gradient
 * (from its SKU), the category icon and the brand name.
 */
export function ProductArt({
  sku,
  category,
  brand,
  size = 'md',
  className,
}: {
  sku: string;
  category?: string;
  brand: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const info = category ? categoryInfo(category) : undefined;
  const Icon = info?.icon;
  const dims =
    size === 'lg' ? 'aspect-square max-w-md' : size === 'sm' ? 'size-16' : 'aspect-[4/3]';
  return (
    <div
      role="img"
      aria-label={`${brand ?? 'AuraMart'} ${info?.label ?? 'product'} illustration`}
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br text-white',
        gradientFor(sku),
        dims,
        className,
      )}
    >
      {Icon ? (
        <Icon
          className={cn('opacity-90', size === 'sm' ? 'size-7' : 'size-14')}
          aria-hidden="true"
        />
      ) : null}
      {size !== 'sm' && brand ? (
        <span className="absolute bottom-2 left-3 text-xs font-semibold tracking-wide uppercase opacity-80">
          {brand}
        </span>
      ) : null}
    </div>
  );
}
