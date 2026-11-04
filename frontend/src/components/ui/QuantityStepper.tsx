import { Minus, Plus } from 'lucide-react';

export interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  disabled?: boolean;
}

/** A − value + control. The maximum is the smaller of the stock and the per-line limit. */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  disabled = false,
}: QuantityStepperProps) {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < max;
  return (
    <div
      className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-700"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="grid size-10 place-items-center rounded-l-xl text-slate-700 hover:bg-slate-100 disabled:text-slate-300 dark:text-slate-200 dark:hover:bg-slate-800 dark:disabled:text-slate-600"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output
        className="min-w-10 px-2 text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
        aria-label={`${label} quantity`}
      >
        {value}
      </output>
      <button
        type="button"
        className="grid size-10 place-items-center rounded-r-xl text-slate-700 hover:bg-slate-100 disabled:text-slate-300 dark:text-slate-200 dark:hover:bg-slate-800 dark:disabled:text-slate-600"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label={`Increase ${label}`}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
