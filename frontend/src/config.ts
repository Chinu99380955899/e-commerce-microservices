export type AuthMode = 'demo' | 'anonymous' | 'oidc';

export interface AppConfig {
  apiBaseUrl: string;
  useMocks: boolean;
  authMode: AuthMode;
  oidcAuthority: string;
  oidcClientId: string;
  repoUrl: string;
  isDev: boolean;
}

/** Vite's env object, typed: every VITE_* value is a string; MODE and DEV are set by Vite itself. */
interface Env {
  MODE: string;
  DEV: boolean;
  BASE_URL: string;
  VITE_API_BASE_URL?: string;
  VITE_USE_MOCKS?: string;
  VITE_AUTH_MODE?: string;
  VITE_OIDC_AUTHORITY?: string;
  VITE_OIDC_CLIENT_ID?: string;
  VITE_REPO_URL?: string;
}

const env: Env = {
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  BASE_URL: import.meta.env.BASE_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string | undefined,
  VITE_USE_MOCKS: import.meta.env.VITE_USE_MOCKS as string | undefined,
  VITE_AUTH_MODE: import.meta.env.VITE_AUTH_MODE as string | undefined,
  VITE_OIDC_AUTHORITY: import.meta.env.VITE_OIDC_AUTHORITY as string | undefined,
  VITE_OIDC_CLIENT_ID: import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined,
  VITE_REPO_URL: import.meta.env.VITE_REPO_URL as string | undefined,
};

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

function parseAuthMode(value: string | undefined, fallback: AuthMode): AuthMode {
  if (value === 'demo' || value === 'anonymous' || value === 'oidc') return value;
  return fallback;
}

// Defaults follow section 3 of the spec: mocks and demo auth in dev and demo, real API otherwise.
const useMocksDefault = env.MODE === 'development' || env.MODE === 'demo';
const authDefault: AuthMode = useMocksDefault ? 'demo' : 'anonymous';

export const config: AppConfig = {
  apiBaseUrl: env.VITE_API_BASE_URL ?? '',
  useMocks: parseBool(env.VITE_USE_MOCKS, useMocksDefault),
  authMode: parseAuthMode(env.VITE_AUTH_MODE, authDefault),
  oidcAuthority: env.VITE_OIDC_AUTHORITY || 'http://localhost:8180/realms/auramart',
  oidcClientId: env.VITE_OIDC_CLIENT_ID || 'auramart-web',
  repoUrl: env.VITE_REPO_URL || 'https://github.com/your-github-username/auramart',
  isDev: env.DEV,
};
