import { Loader2 } from 'lucide-react';

/** A polite loading indicator for whole pages and route guards. */
export function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-16 text-sm text-slate-600 dark:text-slate-400"
    >
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
