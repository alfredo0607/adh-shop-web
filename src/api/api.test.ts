import { http, HttpResponse } from 'msw';

import { createStore } from '@/app/store';
import { aProduct, aTransaction, apiError } from '@/test/fixtures';
import { memoryStorage } from '@/test/memoryStorage';
import { API, server } from '@/test/server';

import { api } from '.';

const newStore = () => createStore({ storage: memoryStorage() });

describe('API client', () => {
  it('reads data through a generated endpoint', async () => {
    server.use(
      http.get(`${API}/products`, () =>
        HttpResponse.json({ items: [aProduct()], nextCursor: null }),
      ),
    );

    const result = await newStore().dispatch(api.endpoints.listProducts.initiate({}));

    expect(result.data?.items[0]?.id).toBe('prod-espresso-01');
  });

  it('reads the whole catalogue, following the cursor page by page', async () => {
    const requests: URL[] = [];
    server.use(
      http.get(`${API}/products`, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        return url.searchParams.get('cursor') === 'page-2'
          ? HttpResponse.json({ items: [aProduct({ id: 'b' })], nextCursor: null })
          : HttpResponse.json({ items: [aProduct({ id: 'a' })], nextCursor: 'page-2' });
      }),
    );

    const result = await newStore().dispatch(api.endpoints.listCatalogue.initiate());

    expect(result.data?.map((product) => product.id)).toEqual(['a', 'b']);
    expect(requests.map((url) => url.searchParams.get('limit'))).toEqual(['50', '50']);
    expect(requests.map((url) => url.searchParams.get('cursor'))).toEqual([null, 'page-2']);
  });

  it('stops reading a catalogue whose cursor never ends', async () => {
    let requests = 0;
    server.use(
      http.get(`${API}/products`, () => {
        requests += 1;
        return HttpResponse.json({
          items: [aProduct({ id: `p${requests}` })],
          nextCursor: 'again',
        });
      }),
    );

    const result = await newStore().dispatch(api.endpoints.listCatalogue.initiate());

    expect(requests).toBe(10);
    expect(result.data).toHaveLength(10);
  });

  it('fails the catalogue when any page fails', async () => {
    server.use(
      http.get(`${API}/products`, ({ request }) =>
        new URL(request.url).searchParams.get('cursor') === null
          ? HttpResponse.json({ items: [aProduct()], nextCursor: 'page-2' })
          : HttpResponse.json(apiError('INVALID_CURSOR'), { status: 422 }),
      ),
    );

    const result = await newStore().dispatch(api.endpoints.listCatalogue.initiate());

    expect(result.error).toMatchObject({ kind: 'api', code: 'INVALID_CURSOR' });
  });

  it('turns an API failure into an AppError', async () => {
    server.use(
      http.post(`${API}/transactions`, () =>
        HttpResponse.json(apiError('AMOUNT_MISMATCH', { actualInCents: 1 }), { status: 422 }),
      ),
    );

    const result = await newStore().dispatch(
      api.endpoints.createTransaction.initiate({
        createTransactionBody: {
          items: [{ productId: 'prod-espresso-01', units: 1 }],
          expectedTotalInCents: 1,
          customer: { fullName: 'Laura Gómez', email: 'laura@example.com', phone: '3001234567' },
          deliveryAddress: {
            addressLine1: 'Calle 93 # 11-26',
            city: 'Bogotá',
            region: 'Cundinamarca',
            country: 'CO',
          },
        },
      }),
    );

    expect(result.error).toEqual({
      kind: 'api',
      status: 422,
      code: 'AMOUNT_MISMATCH',
      requestId: 'req-123',
      details: { actualInCents: 1 },
    });
  });

  it('sends the idempotency key the payment was given', async () => {
    let received: string | null = null;
    server.use(
      http.post(`${API}/transactions/:id/payment`, ({ request }) => {
        received = request.headers.get('Idempotency-Key');
        return HttpResponse.json(aTransaction({ paymentSubmitted: true }), { status: 202 });
      }),
    );

    await newStore().dispatch(
      api.endpoints.payTransaction.initiate({
        id: aTransaction().id,
        'Idempotency-Key': 'key-123',
        payTransactionBody: {
          cardToken: 'tok_test_1',
          installments: 1,
          acceptanceToken: 'a',
          personalDataAuthorizationToken: 'p',
        },
      }),
    );

    expect(received).toBe('key-123');
  });

  it('reports a rate limit with the wait from Retry-After', async () => {
    server.use(
      http.get(`${API}/products`, () =>
        HttpResponse.json(apiError('RATE_LIMITED'), {
          status: 429,
          headers: { 'Retry-After': '17' },
        }),
      ),
    );

    const result = await newStore().dispatch(api.endpoints.listProducts.initiate({}));

    expect(result.error).toEqual({ kind: 'rate-limited', retryAfterSeconds: 17 });
  });

  it('reports a network failure as such', async () => {
    server.use(http.get(`${API}/payment-terms`, () => HttpResponse.error()));

    const result = await newStore().dispatch(api.endpoints.getPaymentTerms.initiate());

    expect(result.error).toEqual({ kind: 'network' });
  });

  describe('retries', () => {
    it('retries a failing read, and succeeds when the server recovers', async () => {
      let calls = 0;
      server.use(
        http.get(`${API}/products/:id`, () => {
          calls += 1;
          return calls < 3
            ? HttpResponse.json(apiError('SERVICE_UNAVAILABLE'), { status: 503 })
            : HttpResponse.json(aProduct());
        }),
      );

      const result = await newStore().dispatch(
        api.endpoints.getProduct.initiate({ id: 'prod-espresso-01' }),
      );

      expect(calls).toBe(3);
      expect(result.data?.id).toBe('prod-espresso-01');
    });

    it('never retries a write: a second POST would reserve stock twice', async () => {
      let calls = 0;
      server.use(
        http.post(`${API}/transactions`, () => {
          calls += 1;
          return HttpResponse.json(apiError('INTERNAL_ERROR'), { status: 500 });
        }),
      );

      await newStore().dispatch(
        api.endpoints.createTransaction.initiate({
          createTransactionBody: {
            items: [{ productId: 'p', units: 1 }],
            expectedTotalInCents: 1,
            customer: { fullName: 'Laura Gómez', email: 'l@example.com', phone: '3001234567' },
            deliveryAddress: {
              addressLine1: 'Calle 1 # 2-3',
              city: 'Bogotá',
              region: 'Cundinamarca',
              country: 'CO',
            },
          },
        }),
      );

      expect(calls).toBe(1);
    });

    it('does not retry a business error', async () => {
      let calls = 0;
      server.use(
        http.get(`${API}/quotes`, () => {
          calls += 1;
          return HttpResponse.json(apiError('INSUFFICIENT_STOCK', { available: 1 }), {
            status: 409,
          });
        }),
      );

      await newStore().dispatch(api.endpoints.quoteOrder.initiate({ items: 'p:5' }));

      expect(calls).toBe(1);
    });
  });

  it('refreshes the product once a transaction reserves its stock', async () => {
    let productReads = 0;
    server.use(
      http.get(`${API}/products/:id`, () => {
        productReads += 1;
        return HttpResponse.json(aProduct({ availableUnits: 12 - productReads + 1 }));
      }),
      http.post(`${API}/transactions`, () => HttpResponse.json(aTransaction(), { status: 201 })),
    );
    const store = newStore();
    const subscription = store.dispatch(
      api.endpoints.getProduct.initiate({ id: 'prod-espresso-01' }),
    );
    await subscription;

    await store.dispatch(
      api.endpoints.createTransaction.initiate({
        createTransactionBody: {
          items: [{ productId: 'prod-espresso-01', units: 1 }],
          expectedTotalInCents: 9_169_000,
          customer: { fullName: 'Laura Gómez', email: 'l@example.com', phone: '3001234567' },
          deliveryAddress: {
            addressLine1: 'Calle 1 # 2-3',
            city: 'Bogotá',
            region: 'Cundinamarca',
            country: 'CO',
          },
        },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(productReads).toBe(2);
    subscription.unsubscribe();
  });
});
