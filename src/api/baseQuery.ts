import {
  fetchBaseQuery,
  retry,
  type BaseQueryFn,
  type FetchArgs,
} from '@reduxjs/toolkit/query/react';

import { normalizeError, type AppError } from '@/shared/errors/appError';
import { apiBaseUrl } from '@/shared/lib/runtime';

/** A request slower than this is abandoned and reported as a timeout. */
export const REQUEST_TIMEOUT_MS = 15_000;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

/**
 * Every response leaves here either as data or as an AppError. Nothing
 * downstream parses an error body or inspects a status code.
 */
const normalizingBaseQuery: BaseQueryFn<string | FetchArgs, unknown, AppError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error === undefined) {
    return result.data === undefined ? { data: null } : { data: result.data };
  }

  return {
    error: normalizeError(result.error, result.meta?.response?.headers.get('Retry-After')),
  };
};

const methodOf = (args: string | FetchArgs): string =>
  typeof args === 'string' ? 'GET' : (args.method ?? 'GET').toUpperCase();

export const MAX_READ_RETRIES = 2;
const RETRY_DELAY_MS = 300;

/**
 * Retries only what is safe and worth it: a read that failed on the network, a
 * timeout or a server error. Writes are never retried here: a second POST
 * /transactions would reserve stock twice, and a payment is retried by the buyer
 * with its idempotency key. See docs/guide/errors.md.
 */
export const baseQuery = retry(normalizingBaseQuery, {
  // Linear and short: a buyer is waiting on the screen.
  backoff: (attempt) => new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt)),
  // RTK Query takes either maxRetries or a condition; the condition caps attempts itself.
  retryCondition: (error, args, { attempt }) => {
    if (attempt > MAX_READ_RETRIES || methodOf(args as string | FetchArgs) !== 'GET') return false;

    // The wrapped query only ever fails with an AppError; RTK Query types it as unknown.
    const appError = error as AppError;
    return (
      appError.kind === 'network' ||
      appError.kind === 'timeout' ||
      (appError.kind === 'api' && appError.status >= 500)
    );
  },
});
