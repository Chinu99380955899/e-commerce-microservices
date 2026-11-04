import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { Compass, Lock, TriangleAlert } from 'lucide-react';
import { useDocumentTitle } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/Status';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      {children}
    </div>
  );
}

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <Centered>
      <Compass className="size-12 text-aura-600 dark:text-aura-400" aria-hidden="true" />
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="text-slate-600 dark:text-slate-400">
        The page you were looking for has moved or never existed.
      </p>
      <Link
        to="/"
        className="inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-aura-600 to-violet-600 px-4 text-sm font-medium text-white"
      >
        Back to the store
      </Link>
    </Centered>
  );
}

export function ForbiddenPage() {
  useDocumentTitle('Forbidden');
  return (
    <Centered>
      <Lock className="size-12 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <h1 className="text-3xl font-bold tracking-tight">403: you don’t have access</h1>
      <p className="text-slate-600 dark:text-slate-400">
        The admin area needs the admin role. Sign in with an admin account to continue.
      </p>
      <Link
        to="/account"
        className="text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
      >
        Go to your account
      </Link>
    </Centered>
  );
}

/** Route-level error page (errorElement): friendly text, and a way back. */
export function RouteErrorPage() {
  const error = useRouteError();
  useDocumentTitle('Something went wrong');
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  const message = error instanceof Error ? error : new Error('Unexpected error. Try again.');
  return (
    <Centered>
      <TriangleAlert className="size-12 text-red-600 dark:text-red-400" aria-hidden="true" />
      <div className="w-full">
        <ErrorState title="This page hit a problem" error={message} />
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload
        </Button>
        <Link
          to="/"
          className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-sm font-medium dark:border-slate-700"
        >
          Home
        </Link>
      </div>
    </Centered>
  );
}
