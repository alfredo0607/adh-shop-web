import { isAppError, isUnexpected, normalizeError, type AppError } from './appError';
import { messageFor } from './messages';

describe('normalizeError', () => {
  it('reads the API envelope: code, request id and details', () => {
    const error = normalizeError({
      status: 409,
      data: {
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Only 2 units available',
          details: { available: 2 },
        },
        requestId: 'req-1',
      },
    });

    expect(error).toEqual({
      kind: 'api',
      status: 409,
      code: 'INSUFFICIENT_STOCK',
      requestId: 'req-1',
      details: { available: 2 },
    });
  });

  it('keeps an unrecognised code as UNKNOWN rather than trusting it', () => {
    const error = normalizeError({ status: 400, data: { error: { code: 'SOMETHING_NEW' } } });

    expect(error).toMatchObject({ kind: 'api', code: 'UNKNOWN' });
  });

  it('copes with a body that is not the envelope', () => {
    expect(normalizeError({ status: 502, data: '<html>Bad gateway</html>' })).toEqual({
      kind: 'api',
      status: 502,
      code: 'UNKNOWN',
    });
  });

  it.each([
    [{ status: 'FETCH_ERROR' as const }, { kind: 'network' }],
    [{ status: 'TIMEOUT_ERROR' as const }, { kind: 'timeout' }],
    [{ status: 'PARSING_ERROR' as const }, { kind: 'unknown' }],
  ])('maps %p', (raw, expected) => {
    expect(normalizeError(raw)).toEqual(expected);
  });

  it('turns a 429 into a rate limit with the wait the server asked for', () => {
    expect(normalizeError({ status: 429 }, '42')).toEqual({
      kind: 'rate-limited',
      retryAfterSeconds: 42,
    });
    expect(normalizeError({ status: 429 }, null)).toEqual({
      kind: 'rate-limited',
      retryAfterSeconds: 60,
    });
  });
});

describe('isUnexpected', () => {
  it.each<[AppError, boolean]>([
    [{ kind: 'api', status: 409, code: 'INSUFFICIENT_STOCK' }, false],
    [{ kind: 'api', status: 422, code: 'AMOUNT_MISMATCH' }, false],
    [{ kind: 'api', status: 503, code: 'SERVICE_UNAVAILABLE' }, true],
    [{ kind: 'api', status: 400, code: 'UNKNOWN' }, true],
    [{ kind: 'network' }, true],
    [{ kind: 'timeout' }, true],
    [{ kind: 'rate-limited', retryAfterSeconds: 5 }, true],
  ])('classifies %p', (error, unexpected) => {
    expect(isUnexpected(error)).toBe(unexpected);
  });
});

describe('isAppError', () => {
  it('recognises an AppError and nothing else', () => {
    expect(isAppError({ kind: 'network' })).toBe(true);
    expect(isAppError({ kind: 'bogus' })).toBe(false);
    expect(isAppError('network')).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});

describe('messageFor', () => {
  it('fills in the units left for a stock error', () => {
    expect(
      messageFor({
        kind: 'api',
        status: 409,
        code: 'INSUFFICIENT_STOCK',
        details: { available: 2 },
      }),
    ).toBe('Solo quedan 2 unidades de este producto.');
  });

  it.each<[AppError, string]>([
    [{ kind: 'network' }, 'Sin conexión. Revisa tu internet e intenta de nuevo.'],
    [{ kind: 'timeout' }, 'La solicitud tardó demasiado. Intenta de nuevo.'],
    [
      { kind: 'rate-limited', retryAfterSeconds: 30 },
      'Demasiados intentos. Intenta de nuevo en 30 segundos.',
    ],
    [{ kind: 'unknown' }, 'Algo salió mal. Intenta de nuevo.'],
    [
      { kind: 'api', status: 422, code: 'PAYMENT_REJECTED' },
      'No pudimos procesar la tarjeta. Revisa los datos o usa otra.',
    ],
    [{ kind: 'api', status: 500, code: 'UNKNOWN' }, 'Algo salió mal. Intenta de nuevo.'],
    [{ kind: 'api', status: 400, code: 'BAD_REQUEST' }, 'Algo salió mal. Intenta de nuevo.'],
  ])('shows Spanish copy, never the server message, for %p', (error, text) => {
    expect(messageFor(error)).toBe(text);
  });
});
