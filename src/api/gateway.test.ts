import { delay, http, HttpResponse } from 'msw';

import { server } from '@/test/server';

import { tokenizeCard, type CardDetails } from './gateway';

const TARGET = { url: 'https://gateway.test/v1/tokens/cards', publicKey: 'pub_test_key' };
const CARD: CardDetails = {
  number: '4242 4242 4242 4242',
  expiryMonth: '08',
  expiryYear: '28',
  cvc: '123',
  holder: '  Laura Gómez ',
};

describe('tokenizeCard', () => {
  it('sends the card to the gateway, never elsewhere, and returns the token', async () => {
    let sent: { auth: string | null; body: unknown } | undefined;
    server.use(
      http.post(TARGET.url, async ({ request }) => {
        sent = { auth: request.headers.get('Authorization'), body: await request.json() };
        return HttpResponse.json({
          status: 'CREATED',
          data: { id: 'tok_test_1', brand: 'VISA', last_four: '4242' },
        });
      }),
    );

    const result = await tokenizeCard(CARD, TARGET);

    expect(result).toEqual({ ok: true, token: 'tok_test_1', brand: 'VISA', lastFour: '4242' });
    expect(sent).toEqual({
      auth: 'Bearer pub_test_key',
      body: {
        number: '4242424242424242',
        exp_month: '08',
        exp_year: '28',
        cvc: '123',
        card_holder: 'Laura Gómez',
      },
    });
  });

  it('reports a refused card as a rejection, without the gateway message', async () => {
    server.use(
      http.post(TARGET.url, () =>
        HttpResponse.json(
          { error: { type: 'INPUT_VALIDATION_ERROR', messages: { number: ['4242…'] } } },
          { status: 422 },
        ),
      ),
    );

    const result = await tokenizeCard(CARD, TARGET);

    expect(result).toEqual({
      ok: false,
      error: { kind: 'api', status: 422, code: 'PAYMENT_REJECTED' },
    });
  });

  it('reports a gateway outage as unavailable', async () => {
    server.use(http.post(TARGET.url, () => new HttpResponse('down', { status: 502 })));

    const result = await tokenizeCard(CARD, TARGET);

    expect(result).toEqual({
      ok: false,
      error: { kind: 'api', status: 502, code: 'PAYMENT_GATEWAY_UNAVAILABLE' },
    });
  });

  it('reports a network failure', async () => {
    server.use(http.post(TARGET.url, () => HttpResponse.error()));

    expect(await tokenizeCard(CARD, TARGET)).toEqual({ ok: false, error: { kind: 'network' } });
  });

  it('gives up after the timeout', async () => {
    server.use(
      http.post(TARGET.url, async () => {
        await delay(200);
        return HttpResponse.json({});
      }),
    );

    expect(await tokenizeCard(CARD, TARGET, 50)).toEqual({ ok: false, error: { kind: 'timeout' } });
  });

  it('treats an unexpected success body as a rejection rather than inventing a token', async () => {
    server.use(http.post(TARGET.url, () => HttpResponse.json({ status: 'PENDING' })));

    const result = await tokenizeCard(CARD, TARGET);

    expect(result.ok).toBe(false);
  });
});
