import * as RadixToast from '@radix-ui/react-toast';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { toast as toastStore, useToasts, type ToastTone } from '../../lib/toast';
import { cn } from '../../lib/cn';

const icons: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const iconTone: Record<ToastTone, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-sky-600 dark:text-sky-400',
};

/** Renders the global toast queue. Radix announces each toast to screen readers. */
export function ToastViewport() {
  const items = useToasts();
  return (
    <RadixToast.Provider swipeDirection="right" duration={5000}>
      {items.map((item) => {
        const Icon = icons[item.tone];
        return (
          <RadixToast.Root
            key={item.id}
            open
            onOpenChange={(open) => {
              if (!open) toastStore.dismiss(item.id);
            }}
            className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <Icon
              className={cn('mt-0.5 size-5 shrink-0', iconTone[item.tone])}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <RadixToast.Title className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </RadixToast.Title>
              {item.description ? (
                <RadixToast.Description className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  {item.description}
                </RadixToast.Description>
              ) : null}
            </div>
            <RadixToast.Close
              className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400"
              aria-label="Dismiss"
            >
              ×
            </RadixToast.Close>
          </RadixToast.Root>
        );
      })}
      <RadixToast.Viewport className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none" />
    </RadixToast.Provider>
  );
}
