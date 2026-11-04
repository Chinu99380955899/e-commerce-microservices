import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { productKeys, searchProducts } from '../../api/products';
import { useDebouncedValue } from '../../lib/hooks';
import { formatMoney } from '../../lib/format';
import { ProductArt } from '../../components/ui/ProductArt';
import { cn } from '../../lib/cn';
import type { Product } from '../../api/schemas';

const SUGGESTION_LIMIT = 5;

/**
 * Header search: debounced keyword suggestions in a keyboard-navigable combobox. Enter opens the
 * full results page. "/" focuses the box from anywhere outside a text field.
 */
export function SearchBox() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebouncedValue(value.trim(), 300);

  const suggestions = useQuery({
    queryKey: productKeys.search(debounced, 0, SUGGESTION_LIMIT),
    queryFn: ({ signal }) => searchProducts(debounced, 0, SUGGESTION_LIMIT, signal),
    enabled: debounced.length >= 2,
    select: (data) => data.content,
  });
  const items: Product[] = suggestions.data ?? [];
  const showList = open && debounced.length >= 2;

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      )
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goToResults = () => {
    const q = value.trim();
    if (!q) return;
    setOpen(false);
    void navigate(`/search?q=${encodeURIComponent(q)}&mode=keyword`);
  };

  const goToProduct = (product: Product) => {
    setOpen(false);
    setValue('');
    void navigate(`/products/${product.id}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (items.length === 0 ? -1 : (index + 1) % items.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (items.length === 0 ? -1 : index <= 0 ? items.length - 1 : index - 1));
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = active >= 0 ? items[active] : undefined;
      if (chosen) goToProduct(chosen);
      else goToResults();
    }
  };

  const activeId = active >= 0 && items[active] ? `${listId}-${items[active].id}` : undefined;

  return (
    <div className="relative" role="search">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search products
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="search"
        role="combobox"
        autoComplete="off"
        placeholder="Search for headphones, flasks, bags…"
        aria-expanded={showList && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => {
            setValue('');
            inputRef.current?.focus();
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Product suggestions"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {items.length === 0 && !suggestions.isFetching ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              No matches. Press Enter to search anyway.
            </li>
          ) : null}
          {items.map((product, index) => (
            <li
              key={product.id}
              id={`${listId}-${product.id}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                goToProduct(product);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2',
                index === active
                  ? 'bg-aura-50 dark:bg-aura-950'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              <ProductArt sku={product.sku} category={product.category} brand={null} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {product.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatMoney(product.price, product.currency)}
                </p>
              </div>
            </li>
          ))}
          {items.length > 0 ? (
            <li className="border-t border-slate-200 px-3 py-2 dark:border-slate-800">
              <button
                type="button"
                className="text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
                onMouseDown={(event) => {
                  event.preventDefault();
                  goToResults();
                }}
              >
                See all results for “{debounced}”
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
