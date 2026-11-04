import { lazy, Suspense, useState, type ReactNode } from 'react';
import { config } from '../../config';
import { DEMO_USERS, type DemoUserKey } from '../../lib/demoUsers';
import { SessionCore } from './SessionCore';
import type { SignedInUser } from './SessionCore';

// The OIDC libraries are only needed in oidc mode, so they load on demand.
const OidcSessionProvider = lazy(() => import('./OidcSession'));

const DEMO_SESSION_KEY = 'auramart.session.v1';

/** The demo user the app starts with, or null for a guest. Stored in localStorage. */
function readDemoUser(): DemoUserKey | null {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    if (raw === null) return 'asha';
    const parsed = JSON.parse(raw) as { user: DemoUserKey | null };
    return parsed.user === 'asha' || parsed.user === 'ravi' ? parsed.user : null;
  } catch {
    return 'asha';
  }
}

function writeDemoUser(user: DemoUserKey | null): void {
  try {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ user }));
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
}

function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [demoUser, setDemoUser] = useState<DemoUserKey | null>(readDemoUser);
  const demo = demoUser ? DEMO_USERS[demoUser] : null;
  const user: SignedInUser | null = demo
    ? { customerId: demo.id, name: demo.name, role: demo.role, accessToken: null }
    : null;

  const signInDemo = (key: DemoUserKey) => {
    writeDemoUser(key);
    setDemoUser(key);
  };
  const signOut = () => {
    writeDemoUser(null);
    setDemoUser(null);
  };

  return (
    <SessionCore
      mode="demo"
      isLoading={false}
      user={user}
      signInDemo={signInDemo}
      signOut={signOut}
    >
      {children}
    </SessionCore>
  );
}

function AnonymousSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionCore mode="anonymous" isLoading={false} user={null} signOut={() => undefined}>
      {children}
    </SessionCore>
  );
}

/** Picks the auth mode chosen by configuration (demo, anonymous or oidc). */
export function SessionProvider({ children }: { children: ReactNode }) {
  if (config.authMode === 'oidc') {
    return (
      <Suspense fallback={null}>
        <OidcSessionProvider>{children}</OidcSessionProvider>
      </Suspense>
    );
  }
  if (config.authMode === 'demo') return <DemoSessionProvider>{children}</DemoSessionProvider>;
  return <AnonymousSessionProvider>{children}</AnonymousSessionProvider>;
}
