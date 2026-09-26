/**
 * The one shape every failure takes before any code sees it.
 * See docs/guide/errors.md.
 */

/** Error codes the ADH Shop API documents. Anything else is treated as unknown. */
export const API_ERROR_CODES = [
  'PRODUCT_NOT_FOUND',
  'INSUFFICIENT_STOCK',
  'INVALID_CURSOR',
  'AMOUNT_MISMATCH',
  'INVALID_CUSTOMER',
  'INVALID_DELIVERY_ADDRESS',
  'INVALID_TRANSACTION',
  'TRANSACTION_NOT_FOUND',
  'TRANSACTION_NOT_PAYABLE',
  'RESERVATION_EXPIRED',
  'PAYMENT_REJECTED',
  'PAYMENT_GATEWAY_UNAVAILABLE',
  'DELIVERY_NOT_FOUND',
  'IDEMPOTENCY_KEY_REUSED',
  'IDEMPOTENT_REQUEST_IN_PROGRESS',
  'VALIDATION_FAILED',
  'SERVICE_UNAVAILABLE',
  'NOT_FOUND',
  'BAD_REQUEST',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type AppError =
  | {
      kind: 'api';
      status: number;
      code: ApiErrorCode | 'UNKNOWN';
      requestId?: string;
      details?: Readonly<Record<string, unknown>>;
    }
  | { kind: 'rate-limited'; retryAfterSeconds: number }
  | { kind: 'network' }
  | { kind: 'timeout' }
  | { kind: 'unknown' };

const isApiErrorCode = (value: unknown): value is ApiErrorCode =>
  typeof value === 'string' && (API_ERROR_CODES as readonly string[]).includes(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The shape `fetchBaseQuery` rejects with, narrowed to what is used here. */
export interface RawFetchError {
  status: number | 'FETCH_ERROR' | 'TIMEOUT_ERROR' | 'PARSING_ERROR' | 'CUSTOM_ERROR';
  data?: unknown;
}

/**
 * Turns whatever a request failed with into an AppError.
 *
 * `retryAfterSeconds` comes from the response headers, which the caller has and
 * the error body does not.
 */
export const normalizeError = (
  error: RawFetchError,
  retryAfterHeader?: string | null,
): AppError => {
  if (error.status === 'FETCH_ERROR') return { kind: 'network' };
  if (error.status === 'TIMEOUT_ERROR') return { kind: 'timeout' };
  if (typeof error.status !== 'number') return { kind: 'unknown' };

  if (error.status === 429) {
    const seconds = Number(retryAfterHeader);
    return {
      kind: 'rate-limited',
      retryAfterSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 60,
    };
  }

  const envelope = isRecord(error.data) ? error.data : undefined;
  const body =
    envelope !== undefined && isRecord(envelope['error']) ? envelope['error'] : undefined;
  const requestId = typeof envelope?.['requestId'] === 'string' ? envelope['requestId'] : undefined;
  const details = isRecord(body?.['details']) ? body['details'] : undefined;

  return {
    kind: 'api',
    status: error.status,
    code: isApiErrorCode(body?.['code']) ? body['code'] : 'UNKNOWN',
    ...(requestId === undefined ? {} : { requestId }),
    ...(details === undefined ? {} : { details }),
  };
};

/**
 * Expected errors are business outcomes a screen is designed to handle; the rest
 * mean the service or the network failed, and are reported globally.
 */
export const isUnexpected = (error: AppError): boolean => {
  if (error.kind !== 'api') return true;
  return error.status >= 500 || error.code === 'UNKNOWN';
};

export const isAppError = (value: unknown): value is AppError =>
  isRecord(value) &&
  typeof value['kind'] === 'string' &&
  ['api', 'rate-limited', 'network', 'timeout', 'unknown'].includes(value['kind']);
