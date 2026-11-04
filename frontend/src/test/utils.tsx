import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { ToastViewport } from '../components/ui/Toast';
import { setRequestIdentity } from '../api/client';
import { DEMO_USERS, type DemoUserKey } from '../lib/demoUsers';
import { SessionContext, type SessionValue } from '../features/auth/sessionContext';

/** Shows the current path and query, so tests can assert on the URL. */
export function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

/** A fresh query client per test: no retries, no shared cache. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Signs the test requests in as a demo user (what the session provider does in the app). */
export function signInAs(key: DemoUserKey): void {
  setRequestIdentity({ customerId: DEMO_USERS[key].id, accessToken: null });
}

function sessionFor(key: DemoUserKey): SessionValue {
  const user = DEMO_USERS[key];
  return {
    mode: 'demo',
    isLoading: false,
    isSignedIn: true,
    customerId: user.id,
    name: user.name,
    role: user.role,
    canManageCatalogue: user.role === 'admin',
    signInDemo: () => undefined,
    signInOidc: () => undefined,
    signOut: () => undefined,
    resetDemoData: () => undefined,
  };
}

/**
 * Renders `ui` at `route`, matching the route pattern `path`, as a signed-in demo user (asha by
 * default), with the toast viewport and a location probe mounted.
 */
export function renderAt(
  ui: ReactElement,
  options: { route: string; path?: string; as?: DemoUserKey },
) {
  const queryClient = createTestQueryClient();
  const who = options.as ?? 'asha';
  signInAs(who);
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={sessionFor(who)}>
        <MemoryRouter initialEntries={[options.route]}>
          <Routes>
            <Route path={options.path ?? options.route.split('?')[0] ?? '/'} element={ui} />
            <Route path="*" element={null} />
          </Routes>
          <ToastViewport />
          <LocationProbe />
        </MemoryRouter>
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
}
