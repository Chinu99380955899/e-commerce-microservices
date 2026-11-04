import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';

/** 30 s stale time; no retry on 4xx; one retry on 5xx and network errors (spec section 4). */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && !error.isRetryable) return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
