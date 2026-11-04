import { createContext, useContext } from 'react';
import type { AuthMode } from '../../config';
import type { DemoUserKey } from '../../lib/demoUsers';

export type Role = 'shopper' | 'admin';

export interface SessionValue {
  mode: AuthMode;
  isLoading: boolean;
  /** True when a real user (demo user or OIDC user) is signed in. Guests are not signed in. */
  isSignedIn: boolean;
  customerId: string;
  name: string;
  role: Role | null;
  /** Admin pages: admins, and everyone in anonymous mode (labelled "no login yet"). */
  canManageCatalogue: boolean;
  signInDemo: (key: DemoUserKey) => void;
  signInOidc: (returnTo: string) => void;
  signOut: () => void;
  resetDemoData: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

/** The app role from the realm roles: admins get the admin role, everyone else is a shopper. */
export function roleFrom(roles: string[]): Role {
  return roles.includes('admin') ? 'admin' : 'shopper';
}

/** Reads the realm roles from a Keycloak access token (realm_access.roles). Never trusts the UI alone. */
export function rolesFromAccessToken(token: string | null | undefined): string[] {
  if (!token) return [];
  try {
    const payload = token.split('.')[1];
    if (!payload) return [];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = JSON.parse(atob(padded)) as { realm_access?: { roles?: unknown } };
    const roles = json.realm_access?.roles;
    return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
  } catch {
    return [];
  }
}
