import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import { useSession } from './sessionContext';
import { config } from '../../config';
import { DEMO_USERS, type DemoUserKey } from '../../lib/demoUsers';
import { useDocumentTitle } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Card, ErrorState, Skeleton } from '../../components/ui/Status';
import { Loader } from '../../components/ui/Loader';
import { safeReturnTo } from './returnTo';

export function LoginPage() {
  useDocumentTitle('Sign in');
  const session = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  useEffect(() => {
    if (session.isSignedIn) void navigate(returnTo, { replace: true });
  }, [session.isSignedIn, navigate, returnTo]);

  if (session.mode === 'anonymous') return <Navigate to="/" replace />;
  if (session.isSignedIn) return <Loader label="Signing you in…" />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Sign in to AuraMart</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {session.mode === 'demo'
            ? 'This is a demo. Pick a demo user; no password is needed.'
            : 'You will be taken to the sign-in page for AuraMart.'}
        </p>
      </header>

      {session.mode === 'demo' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <DemoUserCard
            userKey="asha"
            icon={<ShoppingBag className="size-6" aria-hidden="true" />}
            onPick={() => session.signInDemo('asha')}
          />
          <DemoUserCard
            userKey="ravi"
            icon={<ShieldCheck className="size-6" aria-hidden="true" />}
            onPick={() => session.signInDemo('ravi')}
          />
        </div>
      ) : (
        <Card className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Sign in with your AuraMart account on Keycloak. Your cart stays with you.
          </p>
          <Button
            size="lg"
            onClick={() => session.signInOidc(returnTo)}
            icon={<UserRound className="size-5" aria-hidden="true" />}
          >
            Sign in with Keycloak
          </Button>
        </Card>
      )}

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Not ready to sign in? You can keep shopping as a guest. Your cart is kept on this device.
      </p>
      <p className="text-center">
        <Button variant="ghost" onClick={() => void navigate('/')}>
          Continue as guest
        </Button>
      </p>
    </div>
  );
}

function DemoUserCard({
  userKey,
  icon,
  onPick,
}: {
  userKey: DemoUserKey;
  icon: React.ReactNode;
  onPick: () => void;
}) {
  const user = DEMO_USERS[userKey];
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-aura-100 text-aura-700 dark:bg-aura-950 dark:text-aura-400">
          {icon}
        </span>
        <div>
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm capitalize text-slate-600 dark:text-slate-400">{user.role}</p>
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {user.role === 'admin'
          ? 'Manage the catalogue: create, edit and deactivate products.'
          : 'Shop, check out and track orders. Starts signed in by default.'}
      </p>
      <Button onClick={onPick} variant={user.role === 'admin' ? 'secondary' : 'primary'}>
        Sign in as {user.name}
      </Button>
    </Card>
  );
}

/** Lands after Keycloak redirects back. Sends the person to where they were going. */
export function AuthCallbackPage() {
  useDocumentTitle('Signing in');
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session.isSignedIn || session.isLoading) return;
    const returnTo = safeReturnTo(sessionStorage.getItem('auramart.returnTo'));
    sessionStorage.removeItem('auramart.returnTo');
    void navigate(returnTo, { replace: true });
  }, [session.isSignedIn, session.isLoading, navigate]);

  if (session.mode !== 'oidc') return <Navigate to="/" replace />;
  if (!session.isLoading && !session.isSignedIn) {
    return (
      <div className="mx-auto max-w-md py-10">
        <ErrorState
          title="Sign-in did not complete"
          error={new Error('Try signing in again.')}
          onRetry={() => session.signInOidc('/')}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 py-10" aria-busy="true">
      <Skeleton className="mx-auto h-6 w-48" />
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Signing you in to {config.oidcClientId}…
      </p>
    </div>
  );
}
