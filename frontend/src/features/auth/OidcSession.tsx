import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from 'react-oidc-context';
import { config } from '../../config';
import { SessionCore, type SignedInUser } from './SessionCore';
import { roleFrom, rolesFromAccessToken } from './sessionContext';

/**
 * OIDC mode: Authorization Code with PKCE against Keycloak. Loaded only when the oidc auth mode is
 * configured, so the OIDC libraries stay out of the demo and anonymous bundles.
 */
function OidcBridge({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const profile = auth.user?.profile;
  const token = auth.user?.access_token ?? null;
  const user: SignedInUser | null =
    auth.isAuthenticated && profile?.sub
      ? {
          customerId: profile.sub,
          name: profile.name ?? profile.preferred_username ?? 'Shopper',
          role: roleFrom(rolesFromAccessToken(token)),
          accessToken: token,
        }
      : null;

  return (
    <SessionCore
      mode="oidc"
      isLoading={auth.isLoading}
      user={user}
      signInOidc={(returnTo) => {
        sessionStorage.setItem('auramart.returnTo', returnTo);
        void auth.signinRedirect();
      }}
      signOut={() => {
        void auth.removeUser();
      }}
    >
      {children}
    </SessionCore>
  );
}

export default function OidcSessionProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider
      authority={config.oidcAuthority}
      client_id={config.oidcClientId}
      redirect_uri={`${window.location.origin}/auth/callback`}
      response_type="code"
      scope="openid profile email"
      automaticSilentRenew
      onSigninCallback={() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
    >
      <OidcBridge>{children}</OidcBridge>
    </AuthProvider>
  );
}
