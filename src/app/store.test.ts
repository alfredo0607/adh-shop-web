import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { api } from '@/api';
import { deliverySaved, productChosen } from '@/features/checkout/checkoutSlice';
import { aProduct, apiError } from '@/test/fixtures';
import { memoryStorage } from '@/test/memoryStorage';
import { API, server } from '@/test/server';

import { selectNotifications } from './notifications/notificationsSlice';
import { STORAGE_PREFIX, browserStorage, selectRehydrated } from './persistence';
import { createStore } from './store';

const DELIVERY = {
  fullName: 'Laura Gómez',
  email: 'laura@example.com',
  phone: '3001234567',
  addressLine1: 'Calle 93 # 11-26',
  city: 'Bogotá',
  region: 'Cundinamarca',
  country: 'CO' as const,
};

describe('persistence', () => {
  it('writes the checkout slice, and nothing else, to storage', async () => {
    server.use(
      http.get(`${API}/products`, () =>
        HttpResponse.json({ items: [aProduct()], nextCursor: null }),
      ),
    );
    const storage = memoryStorage();
    const store = createStore({ storage });
    await waitFor(() => expect(selectRehydrated(store.getState())).toBe(true));

    store.dispatch(productChosen({ productId: 'prod-espresso-01', units: 1 }));
    await store.dispatch(api.endpoints.listProducts.initiate({}));

    await waitFor(() => expect(storage.entries.has(`${STORAGE_PREFIX}checkout`)).toBe(true));
    expect([...storage.entries.keys()]).toEqual([`${STORAGE_PREFIX}checkout`]);
  });

  it('never writes card data, because the checkout slice has nowhere to hold it', async () => {
    const storage = memoryStorage();
    const store = createStore({ storage });
    await waitFor(() => expect(selectRehydrated(store.getState())).toBe(true));

    store.dispatch(deliverySaved(DELIVERY));

    await waitFor(() => expect(storage.entries.size).toBe(1));
    const written = [...storage.entries.values()].join('');
    expect(written).not.toMatch(/\d{13,19}|cvc|cardNumber|number/i);
  });

  it('restores a saved order after a reload', async () => {
    const saved = {
      productId: 'prod-espresso-01',
      units: 2,
      delivery: DELIVERY,
      transactionId: 't-1',
      idempotencyKey: 'key-1',
      paymentStatus: 'submitted',
      lastError: null,
    };
    const storage = memoryStorage({ [`${STORAGE_PREFIX}checkout`]: JSON.stringify(saved) });

    const store = createStore({ storage });

    await waitFor(() => expect(store.getState().checkout).toEqual(saved));
  });

  it('keeps requests made before rehydration finished', async () => {
    server.use(
      http.get(`${API}/products`, () =>
        HttpResponse.json({ items: [aProduct()], nextCursor: null }),
      ),
    );
    const store = createStore({ storage: memoryStorage() });

    const result = await store.dispatch(api.endpoints.listProducts.initiate({}));

    expect(result.data?.items).toHaveLength(1);
    await waitFor(() => expect(selectRehydrated(store.getState())).toBe(true));
    expect(api.endpoints.listProducts.select({})(store.getState()).data?.items).toHaveLength(1);
  });

  it('keeps working when the browser refuses storage', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => {
      void browserStorage.setItem('k', 'v');
    }).not.toThrow();
    expect(browserStorage.getItem('k')).toBeNull();

    setItem.mockRestore();
    getItem.mockRestore();
  });
});

describe('global error listener', () => {
  const newStore = () => createStore({ storage: memoryStorage() });

  it('turns an unexpected failure into a toast, with the request reference', async () => {
    server.use(
      http.get(`${API}/products`, () =>
        HttpResponse.json(apiError('INTERNAL_ERROR'), { status: 500 }),
      ),
    );
    const store = newStore();

    await store.dispatch(api.endpoints.listProducts.initiate({}));

    expect(selectNotifications(store.getState())).toEqual([
      {
        id: 'Algo salió mal. Intenta de nuevo.',
        tone: 'error',
        message: 'Algo salió mal. Intenta de nuevo.',
        requestId: 'req-123',
      },
    ]);
  });

  it('reports being offline', async () => {
    server.use(http.get(`${API}/payment-terms`, () => HttpResponse.error()));
    const store = newStore();

    await store.dispatch(api.endpoints.getPaymentTerms.initiate());

    expect(selectNotifications(store.getState())[0]?.message).toBe(
      'Sin conexión. Revisa tu internet e intenta de nuevo.',
    );
  });

  it('leaves expected business errors to the screen', async () => {
    server.use(
      http.get(`${API}/products/:id`, () =>
        HttpResponse.json(apiError('PRODUCT_NOT_FOUND'), { status: 404 }),
      ),
    );
    const store = newStore();

    await store.dispatch(api.endpoints.getProduct.initiate({ id: 'nope' }));

    expect(selectNotifications(store.getState())).toEqual([]);
  });

  it('stays silent for endpoints that handle their own errors, even unexpected ones', async () => {
    server.use(
      http.get(`${API}/transactions/:id`, () =>
        HttpResponse.json(apiError('INTERNAL_ERROR'), { status: 500 }),
      ),
    );
    const store = newStore();

    await store.dispatch(api.endpoints.getTransaction.initiate({ id: 't-1' }));

    expect(selectNotifications(store.getState())).toEqual([]);
  });

  it('shows a repeated failure once, not stacked', async () => {
    server.use(http.get(`${API}/payment-terms`, () => HttpResponse.error()));
    const store = newStore();

    await store.dispatch(api.endpoints.getPaymentTerms.initiate(undefined, { forceRefetch: true }));
    await store.dispatch(api.endpoints.getPaymentTerms.initiate(undefined, { forceRefetch: true }));

    expect(selectNotifications(store.getState())).toHaveLength(1);
  });
});
