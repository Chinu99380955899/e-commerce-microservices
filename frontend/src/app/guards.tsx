import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from '../features/auth/sessionContext';
import { Loader } from '../components/ui/Loader';
import { ForbiddenPage } from '../features/system/pages';

/** /checkout, /orders and /account need a signed-in user in demo and oidc modes. */
export function RequireSignedIn({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (session.isLoading) return <Loader label="Checking your sign-in…" />;
  if (session.mode === 'anonymous' || session.isSignedIn) return children;
  const returnTo = `${location.pathname}${location.search}`;
  return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
}

/** /admin needs the admin role. Anonymous mode stays reachable (the backend has no login yet). */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session.isLoading) return <Loader label="Checking your permissions…" />;
  if (session.canManageCatalogue) return children;
  return <ForbiddenPage />;
}
