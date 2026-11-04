import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AssistantUiContext } from './assistantUi';

/** Owns the open/close state of the assistant drawer and the Ctrl+K / ⌘K shortcut. */
export function AssistantUiProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);

  const openAssistant = useCallback((next?: string) => {
    setPrefill(next ?? null);
    setOpenState(true);
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) setPrefill(null);
  }, []);

  // Ctrl+K (⌘K on a Mac) opens the assistant from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        openAssistant();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [openAssistant]);

  const value = useMemo(
    () => ({ open, prefill, openAssistant, setOpen }),
    [open, prefill, openAssistant, setOpen],
  );
  return <AssistantUiContext.Provider value={value}>{children}</AssistantUiContext.Provider>;
}
