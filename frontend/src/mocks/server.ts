import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** The in-process mock server used by Vitest component and unit tests. */
export const server = setupServer(...handlers);
