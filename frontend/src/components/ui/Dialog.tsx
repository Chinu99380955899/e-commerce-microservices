import type { ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Modal dialog and side drawer built on Radix: focus is trapped while open, restored to the
 * trigger on close, Escape closes it, and the page behind is inert.
 */
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'dialog' | 'drawer';
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  variant = 'dialog',
  className,
}: DialogProps) {
  const isDrawer = variant === 'drawer';
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          className={cn(
            'fixed z-50 flex flex-col bg-white text-slate-900 shadow-xl focus:outline-none dark:bg-slate-900 dark:text-slate-100',
            isDrawer
              ? 'inset-y-0 right-0 w-full max-w-md border-l border-slate-200 dark:border-slate-800'
              : 'left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
            <div>
              <RadixDialog.Title className="text-lg font-semibold">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close
              className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </RadixDialog.Close>
          </div>
          <div className={cn('flex-1 p-5', isDrawer && 'overflow-y-auto')}>{children}</div>
          {footer ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
              {footer}
            </div>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogTrigger = RadixDialog.Trigger;
