import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { STORAGE_PREFIX } from '@/app/persistence';
import { createStore } from '@/app/store';
import { itemAdded } from '@/features/cart/cartSlice';
import {
  deliverySaved,
  orderStarted,
  paymentSubmitted,
  transactionOpened,
} from '@/features/checkout/checkoutSlice';
import { aDelivery, aTransaction, apiError } from '@/test/fixtures';
import { memoryStorage } from '@/test/memoryStorage';
import { renderRoute } from '@/test/renderRoute';
import { API, server } from '@/test/server';

const ID = '6f1c2b9e-8f4a-4d7e-9a51-1b2c3d4e5f60';
const ORDER = `/orders/${ID}`;

const answer = (...statuses: Parameters<typeof aTransaction>[0][]): { reads: () => number } => {
  let reads = 0;
  server.use(
    http.get(`${API}/transactions/:id`, () => {
      const overrides = statuses[Math.min(reads, statuses.length - 1)];
      reads += 1;
      return HttpResponse.json(aTransaction({ paymentSubmitted: true, ...overrides }));
    }),
    http.get(`${API}/transactions/:id/delivery`, () => HttpResponse.json(aDelivery())),
  );
  return { reads: () => reads };
};

/** A store holding the order this browser placed, paid from the cart. */
const ownOrder = () => {
  const store = createStore({ storage: memoryStorage() });
  store.dispatch(itemAdded({ productId: 'prod-espresso-01', units: 1 }));
  store.dispatch(
    orderStarted({ items: [{ productId: 'prod-espresso-01', units: 1 }], source: 'cart' }),
  );
  store.dispatch(
    deliverySaved({
      fullName: 'Laura Gómez',
      email: 'laura@example.com',
      phone: '3001234567',
      addressLine1: 'Calle 93 # 11-26',
      city: 'Bogotá',
      region: 'Bogotá D.C.',
      country: 'CO',
    }),
  );
  store.dispatch(transactionOpened(ID));
  store.dispatch(paymentSubmitted());
  return store;
};

describe('order status', () => {
  it('shows an approved payment with its items, total and delivery', async () => {
    answer({ status: 'APPROVED' });

    renderRoute(ORDER);

    expect(await screen.findByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible();
    expect(screen.getByText('Referencia 6F1C2B9E')).toBeVisible();
    expect(screen.getByText('Total pagado').parentElement).toHaveTextContent('$ 91.690');
    expect(await screen.findByText('Recibe Laura Gómez · ******4567')).toBeVisible();
    expect(screen.getByText(/^Llega aproximadamente el/)).toHaveTextContent('septiembre');
    expect(screen.getByRole('link', { name: 'Volver al producto' })).toHaveAttribute(
      'href',
      '/products/prod-espresso-01',
    );
    expect(screen.queryByRole('button', { name: 'Intentar de nuevo' })).toBeNull();
  });

  it('keeps checking a pending payment until it settles', async () => {
    const api = answer({ status: 'PENDING' }, { status: 'APPROVED' });

    renderRoute(ORDER);

    expect(
      await screen.findByRole('heading', { name: 'Estamos confirmando tu pago' }),
    ).toBeVisible();
    expect(
      await screen.findByRole('heading', { name: '¡Pago aprobado!' }, { timeout: 5_000 }),
    ).toBeVisible();
    expect(api.reads()).toBeGreaterThanOrEqual(2);
  });

  it.each([
    ['DECLINED', 'Tu pago fue rechazado'],
    ['VOIDED', 'Tu pago fue rechazado'],
    ['ERROR', 'No pudimos completar el pago'],
    ['EXPIRED', 'Tu reserva expiró'],
  ] as const)('explains a %s outcome and offers another try', async (status, title) => {
    answer({ status });

    renderRoute(ORDER);

    expect(await screen.findByRole('heading', { name: title })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeVisible();
    expect(screen.getByText('Total').parentElement).toHaveTextContent('$ 91.690');
  });

  it('closes the buyer’s own order once approved: empties the cart, forgets the details', async () => {
    answer({ status: 'APPROVED' });
    const store = ownOrder();

    renderRoute('/orders/' + ID, undefined, store);
    await screen.findByRole('heading', { name: '¡Pago aprobado!' });

    await waitFor(() => expect(store.getState().cart.lines).toEqual([]));
    expect(store.getState().checkout).toMatchObject({
      items: [],
      delivery: null,
      transactionId: null,
    });
  });

  it('keeps the cart after a decline, and a retry starts the order again', async () => {
    answer({ status: 'DECLINED' });
    const store = ownOrder();
    renderRoute(ORDER, undefined, store);
    await screen.findByRole('heading', { name: 'Tu pago fue rechazado' });
    await waitFor(() => expect(store.getState().checkout.transactionId).toBeNull());

    await userEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));

    expect(
      await screen.findByRole('dialog', { name: 'Pago con tarjeta de crédito' }),
    ).toBeVisible();
    expect(store.getState().cart.lines).toHaveLength(1);
    expect(store.getState().checkout).toMatchObject({
      items: [{ productId: 'prod-espresso-01', units: 1 }],
      source: 'cart',
    });
  });

  it('never touches this browser’s order for someone else’s link', async () => {
    answer({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'APPROVED' });
    const store = ownOrder();

    renderRoute('/orders/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', undefined, store);
    await screen.findByRole('heading', { name: '¡Pago aprobado!' });

    expect(store.getState().cart.lines).toHaveLength(1);
    expect(store.getState().checkout.transactionId).toBe(ID);
  });

  it('says so when there is no such order', async () => {
    server.use(
      http.get(`${API}/transactions/:id`, () =>
        HttpResponse.json(apiError('TRANSACTION_NOT_FOUND'), { status: 404 }),
      ),
    );

    renderRoute(ORDER);

    expect(await screen.findByRole('alert')).toHaveAccessibleName('No encontramos este pedido.');
  });

  it('offers a retry when the order cannot be read', async () => {
    let reads = 0;
    server.use(
      http.get(`${API}/transactions/:id`, () => {
        reads += 1;
        return reads <= 3
          ? HttpResponse.json(apiError('INTERNAL_ERROR'), { status: 500 })
          : HttpResponse.json(aTransaction({ status: 'EXPIRED' }));
      }),
    );

    renderRoute(ORDER);

    expect(await screen.findByRole('alert')).toHaveAccessibleName(
      'No pudimos consultar el estado de tu pedido.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Tu reserva expiró' })).toBeVisible();
  });

  it('leads back to the store after an order of several products', async () => {
    const one = aTransaction().items[0]!;
    answer({
      status: 'APPROVED',
      items: [one, { ...one, productId: 'prod-grinder-02', name: 'Molino cónico Fresa' }],
    });

    renderRoute(ORDER);

    expect(await screen.findByRole('link', { name: 'Volver a la tienda' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});

describe('resuming after a reload', () => {
  it('takes a buyer whose payment is in flight straight to its outcome', async () => {
    answer({ status: 'APPROVED' });
    const saved = {
      items: [{ productId: 'prod-espresso-01', units: 1 }],
      source: 'cart',
      delivery: null,
      transactionId: ID,
      idempotencyKey: 'key-1',
      paymentStatus: 'submitted',
      lastError: null,
    };
    const store = createStore({
      storage: memoryStorage({ [`${STORAGE_PREFIX}checkout`]: JSON.stringify(saved) }),
    });

    renderRoute('/', undefined, store);

    expect(await screen.findByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible();
  });

  it('leaves a buyer with no payment in flight on the store', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'Nuestros productos' })).toBeVisible();
  });
});
