import { useSyncExternalStore } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

type Listener = () => void;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

function push(tone: ToastTone, title: string, description?: string): void {
  const item: ToastItem = { id: nextId, tone, title, description };
  nextId += 1;
  items = [...items.slice(-2), item];
  emit();
}

/** Global toast queue. Call from anywhere; the ToastProvider renders the queue. */
export const toast = {
  success: (title: string, description?: string) => push('success', title, description),
  error: (title: string, description?: string) => push('error', title, description),
  info: (title: string, description?: string) => push('info', title, description),
  dismiss: (id: number) => {
    items = items.filter((item) => item.id !== id);
    emit();
  },
};

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): ToastItem[] {
  return items;
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
