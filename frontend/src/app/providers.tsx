import { lazy, Suspense, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '../features/auth/session';
import { ThemeProvider } from './theme';
import { ToastViewport } from '../components/ui/Toast';
import { createAppQueryClient } from './queryClient';

// The devtools are a development-only tool: they are not loaded in production builds.
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((module) => ({
    default: module.ReactQueryDevtools,
  })),
);

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createAppQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SessionProvider>
          {children}
          <ToastViewport />
        </SessionProvider>
      </ThemeProvider>
      {import.meta.env.DEV ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  );
}
