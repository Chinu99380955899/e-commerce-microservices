import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** The service worker that answers /api calls in the browser (demo mode). */
export const worker = setupWorker(...handlers);
