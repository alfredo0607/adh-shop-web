/**
 * A fresh idempotency key for a payment attempt: a UUID v4, as the API expects.
 * Wrapped so tests can replace it with a predictable sequence.
 */
export const createIdempotencyKey = (): string => crypto.randomUUID();
