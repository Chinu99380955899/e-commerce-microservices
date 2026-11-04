import { Suspense, lazy } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { Header } from './Header';
import { Footer } from './Footer';
import { ErrorBoundary } from '../ErrorBoundary';
import { Loader } from '../../components/ui/Loader';
import { AssistantUiProvider } from '../../features/assistant/AssistantUiContext';
import { useAssistantUi } from '../../features/assistant/assistantUi';
import { config } from '../../config';

// Heavy, rarely needed UI is loaded when first opened.
const AssistantDrawer = lazy(() => import('../../features/assistant/AssistantDrawer'));
const DemoControls = lazy(() => import('../../features/demo/DemoControls'));

export function RootLayout() {
  return (
    <AssistantUiProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg dark:focus:bg-slate-900"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
      <Suspense fallback={null}>
        <AssistantDrawerGate />
      </Suspense>
      {config.useMocks ? (
        <Suspense fallback={null}>
          <DemoControls />
        </Suspense>
      ) : null}
      <ScrollRestoration />
    </AssistantUiProvider>
  );
}

/** Only mounts the drawer once it is opened, so the chat code is not loaded on every page. */
function AssistantDrawerGate() {
  const { open, setOpen, prefill } = useAssistantUi();
  if (!open) return null;
  return (
    <Suspense fallback={<Loader label="Opening Aura…" />}>
      <AssistantDrawer
        key={prefill ?? 'none'}
        open={open}
        onOpenChange={setOpen}
        prefill={prefill}
      />
    </Suspense>
  );
}
