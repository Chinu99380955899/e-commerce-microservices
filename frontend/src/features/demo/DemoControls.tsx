import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Status';
import { DEMO_USERS, type DemoUserKey } from '../../lib/demoUsers';
import {
  readControls,
  writeControls,
  type DemoControls as Controls,
  type FailureArea,
  type LatencyMode,
  type PaymentMode,
} from '../../mocks/controls';
import { useSession } from '../auth/sessionContext';
import { resetDemoData } from './resetDemo';
import { cn } from '../../lib/cn';

const PAYMENT_OPTIONS: { value: PaymentMode; label: string; hint: string }[] = [
  { value: 'succeed', label: 'Payments succeed', hint: 'Every order is confirmed (the default).' },
  { value: 'fail', label: 'Payments fail', hint: 'Every order is cancelled with PAYMENT_FAILED.' },
  { value: 'flaky', label: 'Fail 30% of payments', hint: 'A seeded random 30% of orders fail.' },
];

const LATENCY_OPTIONS: { value: LatencyMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'normal', label: 'Normal (250–600 ms)' },
  { value: 'slow', label: 'Slow (2 s)' },
];

const FAILURE_OPTIONS: { value: FailureArea; label: string }[] = [
  { value: 'catalogue', label: 'Catalogue and search' },
  { value: 'cart', label: 'Cart' },
  { value: 'orders', label: 'Orders and checkout' },
  { value: 'assistant', label: 'Assistant' },
];

/** Floating "Demo" button and panel. Only mounted in mock mode. Settings are saved in localStorage. */
export default function DemoControls() {
  const [open, setOpen] = useState(false);
  const [controls, setControlsState] = useState<Controls>(readControls);
  const session = useSession();
  const queryClient = useQueryClient();

  const update = (next: Controls) => {
    writeControls(next);
    setControlsState(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open demo controls"
        className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Demo
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        variant="drawer"
        title="Demo controls"
        description="Change how the simulated backend behaves. Settings are saved in this browser."
      >
        <div className="flex flex-col gap-7">
          <Section title="Payments">
            <RadioGroup
              name="payment"
              label="Payment outcome"
              value={controls.payment}
              options={PAYMENT_OPTIONS}
              onChange={(payment) => update({ ...controls, payment })}
            />
          </Section>

          <Section title="Network latency">
            <RadioGroup
              name="latency"
              label="Network latency"
              value={controls.latency}
              options={LATENCY_OPTIONS}
              onChange={(latency) => update({ ...controls, latency })}
            />
          </Section>

          <Section title="Simulate outages (503)">
            <ul className="flex flex-col gap-2">
              {FAILURE_OPTIONS.map((option) => {
                const on = controls.failing[option.value];
                return (
                  <li key={option.value} className="flex items-center justify-between gap-3">
                    <span id={`failing-${option.value}`} className="text-sm">
                      {option.label}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-labelledby={`failing-${option.value}`}
                      onClick={() =>
                        update({
                          ...controls,
                          failing: { ...controls.failing, [option.value]: !on },
                        })
                      }
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        on ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 size-5 rounded-full bg-white transition-transform',
                          on ? 'translate-x-[22px]' : 'translate-x-0.5',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Turn one on to see the error state and its Retry button.
            </p>
          </Section>

          <Section title="Demo user">
            <SelectField
              label="Signed in as"
              value={
                session.isSignedIn
                  ? ((Object.keys(DEMO_USERS) as DemoUserKey[]).find(
                      (key) => DEMO_USERS[key].id === session.customerId,
                    ) ?? '')
                  : ''
              }
              placeholder="Guest"
              options={(Object.keys(DEMO_USERS) as DemoUserKey[]).map((key) => ({
                value: key,
                label: `${DEMO_USERS[key].name} (${DEMO_USERS[key].role})`,
              }))}
              onChange={(event) => {
                const key = event.target.value as DemoUserKey;
                session.signInDemo(key);
              }}
            />
          </Section>

          <Section title="Data">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="danger" onClick={() => resetDemoData(queryClient)}>
                Reset all demo data
              </Button>
              <Badge tone="info">Catalogue, carts, orders and conversations</Badge>
            </div>
          </Section>
        </div>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

function RadioGroup<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-xl border p-3',
            value === option.value
              ? 'border-aura-600 bg-aura-50 dark:border-aura-500 dark:bg-aura-950/50'
              : 'border-slate-200 dark:border-slate-800',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mt-1 accent-aura-600"
          />
          <span>
            <span className="block text-sm font-medium">{option.label}</span>
            {option.hint ? (
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {option.hint}
              </span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  );
}
