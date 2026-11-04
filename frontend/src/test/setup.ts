import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from '../mocks/server';
import { resetDb } from '../mocks/db';
import { writeControls, DEFAULT_CONTROLS } from '../mocks/controls';

// jsdom has no matchMedia; the theme code asks it for the system colour scheme.
const testWindow: Partial<Window> = window;
if (!testWindow.matchMedia) {
  testWindow.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Node's fetch cannot resolve relative URLs, but the app calls /api/... on purpose. Resolve them
// against the jsdom origin, the same way a browser does.
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    return nativeFetch(new URL(input, window.location.origin), init);
  }
  return nativeFetch(input, init);
};

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(() => {
  localStorage.clear();
  writeControls({ ...DEFAULT_CONTROLS, latency: 'none' });
  resetDb();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
});
