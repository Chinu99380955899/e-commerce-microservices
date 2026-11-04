import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { config } from './config';
import { App } from './app/App';

/**
 * In mock mode the MSW worker answers /api calls before the app renders, so the first queries
 * never reach the network. Unhandled requests (such as assets) pass straight through.
 */
async function enableMocks(): Promise<void> {
  if (!config.useMocks) return;
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledFrame: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}

function render(): void {
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element #root is missing from index.html');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// If the mock worker cannot start (for example in a browser without service workers), still render the
// app: the screens show their error states instead of a blank page.
enableMocks().then(render, (error: unknown) => {
  console.error('[mocks] The demo API could not start. Requests to /api will fail.', error);
  render();
});
