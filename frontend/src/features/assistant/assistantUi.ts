import { createContext, useContext } from 'react';

export interface AssistantUi {
  open: boolean;
  /** A question to pre-fill when the assistant opens, for example from "Ask Aura about this product". */
  prefill: string | null;
  openAssistant: (prefill?: string) => void;
  setOpen: (open: boolean) => void;
}

export const AssistantUiContext = createContext<AssistantUi | null>(null);

/** Open/close state for the assistant drawer, shared by the header, product pages and shortcuts. */
export function useAssistantUi(): AssistantUi {
  const value = useContext(AssistantUiContext);
  if (!value) throw new Error('useAssistantUi must be used inside AssistantUiProvider');
  return value;
}
