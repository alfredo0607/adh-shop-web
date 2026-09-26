import type { AppError } from '@/shared/errors/appError';

/** Card details as the buyer typed them. Lives only in the card form and here. */
export interface CardDetails {
  number: string;
  expiryMonth: string; // "08"
  expiryYear: string; // "28"
  cvc: string;
  holder: string;
}

export interface TokenizationTarget {
  /** From GET /payment-terms: where the gateway accepts card data. */
  url: string;
  /** From GET /payment-terms: public by design, identifies the merchant. */
  publicKey: string;
}

export type TokenizationResult =
  { ok: true; token: string; brand: string; lastFour: string } | { ok: false; error: AppError };

interface GatewayTokenResponse {
  status?: string;
  data?: { id?: string; brand?: string; last_four?: string };
}

/**
 * Sends the card straight to the payment gateway and returns a single-use token.
 *
 * Deliberately a plain function and not an RTK Query endpoint: RTK Query keeps
 * every request's arguments in the store (`originalArgs`), and card data must
 * never enter Redux. Nothing here logs, stores or forwards the card; only the
 * token leaves. See docs/guide/security.md.
 */
export const tokenizeCard = async (
  card: CardDetails,
  target: TokenizationTarget,
  timeoutMs = 15_000,
): Promise<TokenizationResult> => {
  let response: Response;

  try {
    response = await fetch(target.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${target.publicKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: card.number.replace(/\D/g, ''),
        exp_month: card.expiryMonth,
        exp_year: card.expiryYear,
        cvc: card.cvc,
        card_holder: card.holder.trim(),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    // By name, not instanceof: the error may come from another realm (a worker, a test runner).
    const timedOut =
      typeof cause === 'object' &&
      cause !== null &&
      (cause as { name?: unknown }).name === 'TimeoutError';
    return { ok: false, error: timedOut ? { kind: 'timeout' } : { kind: 'network' } };
  }

  const body = (await response.json().catch(() => ({}))) as GatewayTokenResponse;
  const token = body.data?.id;

  if (!response.ok || body.status !== 'CREATED' || token === undefined) {
    // The gateway's own message can echo what was submitted; it is not shown.
    return {
      ok: false,
      error:
        response.status >= 500
          ? { kind: 'api', status: response.status, code: 'PAYMENT_GATEWAY_UNAVAILABLE' }
          : { kind: 'api', status: response.status || 422, code: 'PAYMENT_REJECTED' },
    };
  }

  return {
    ok: true,
    token,
    brand: body.data?.brand ?? 'UNKNOWN',
    lastFour: body.data?.last_four ?? card.number.slice(-4),
  };
};
