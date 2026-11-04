import type { ZodType } from 'zod';
import { config } from '../config';
import { problemSchema, type Problem } from './schemas';

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem | null;
  readonly isNetworkError: boolean;

  constructor(options: {
    message: string;
    status: number;
    problem?: Problem | null;
    isNetworkError?: boolean;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.problem = options.problem ?? null;
    this.isNetworkError = options.isNetworkError ?? false;
  }

  /** Field-level validation messages from a 400 problem, if any. */
  get fieldErrors(): Record<string, string> {
    return this.problem?.errors ?? {};
  }

  /** 5xx and network failures can be retried; 4xx cannot. */
  get isRetryable(): boolean {
    return this.isNetworkError || this.status >= 500;
  }
}

/** Identity used by the client. Set by the auth layer; read on every request. */
export interface RequestIdentity {
  customerId: string | null;
  accessToken: string | null;
}

let identity: RequestIdentity = { customerId: null, accessToken: null };

export function setRequestIdentity(next: RequestIdentity): void {
  identity = next;
}

export function getRequestIdentity(): RequestIdentity {
  return identity;
}

export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
  /** Set to false for endpoints that do not depend on the signed-in customer. */
  withIdentity?: boolean;
  /** Overrides the identity's customer for this call only (used when merging a guest cart). */
  customerId?: string;
  /** Zod schema for the success body. Omit for 204 responses. */
  schema?: ZodType<T>;
}

const isDev = import.meta.env.DEV;

export function buildUrl(
  path: string,
  query?: RequestOptions<unknown>['query'],
  base = config.apiBaseUrl,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return `${base}/api/v1${path}${qs ? `?${qs}` : ''}`;
}

function newRequestId(): string {
  return crypto.randomUUID();
}

async function parseProblem(response: Response): Promise<Problem | null> {
  try {
    const json: unknown = await response.json();
    const parsed = problemSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Calls the API and validates the response body with `schema` (dev-only warnings on mismatch). */
export async function request<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  const { method = 'GET', query, body, signal, withIdentity = true, customerId, schema } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': newRequestId(),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (withIdentity) {
    const effectiveCustomerId = customerId ?? identity.customerId;
    if (effectiveCustomerId) headers['X-Customer-Id'] = effectiveCustomerId;
    if (identity.accessToken) headers.Authorization = `Bearer ${identity.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError({
      message: 'Network error. Check your connection and try again.',
      status: 0,
      isNetworkError: true,
    });
  }

  if (!response.ok) {
    const problem = await parseProblem(response);
    throw new ApiError({
      message: problem?.detail ?? problem?.title ?? `Request failed with status ${response.status}`,
      status: response.status,
      problem,
    });
  }

  if (response.status === 204 || !schema) {
    return undefined as T;
  }

  const json: unknown = await response.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    if (isDev) {
      console.warn(
        `[api] Response for ${method} ${path} does not match the contract`,
        parsed.error,
      );
    }
    return json as T;
  }
  return parsed.data;
}
