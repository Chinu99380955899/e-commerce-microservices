import { useEffect } from 'react';
import { config } from '../config';

/** Sets "<page> · AuraMart" as the document title for the lifetime of the page. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · AuraMart` : 'AuraMart';
  }, [title]);
}

export const SITE_NAME = 'AuraMart';

export const DEMO_MODE = config.useMocks;
