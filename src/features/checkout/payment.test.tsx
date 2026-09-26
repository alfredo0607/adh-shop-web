import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { createStore } from '@/app/store';
import { itemAdded } from '@/features/cart/cartSlice';
import {
  TOKENIZATION_URL,
  aDelivery,
  aTransaction,
  apiError,
  somePaymentTerms,
} from '@/test/fixtures';
import { memoryStorage } from '@/test/memoryStorage';
import { renderRoute } from '@/test/renderRoute';
import { API, server } from '@/test/server';

import { deliverySaved, orderStarted } from './checkoutSlice';

const TRANSACTION_ID = '6f1c2b9e-8f4a-4d7e-9a51-1b2c3d4e5f60';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const QUOTE = {
  items: [
    {
      productId: 'prod-espresso-01',
      name: 'Cafetera espresso Artigiano',
      units: 1,
      unitPriceInCents: 8_999_000,
      lineTotalInCents: 8_999_000,
    },
  ],
  amounts: {
    productInCents: 8_999_000,
    baseFeeInCents: 50_000,
    deliveryFeeInCents: 120_000,
    totalInCents: 9_169_000,
    currency: 'COP',
  },
};

const DELIVERY = {
  fullName: 'Laura Gómez',
  email: 'laura@example.com',
  phone: '3001234567',
  addressLine1: 'Calle 93 # 11-26',
  city: 'Bogotá',
  region: 'Bogotá D.C.',
  country: 'CO' as const,
};

interface Seen {
  created: unknown[];
  tokenised: unknown[];
  payments: { key: string | null; body: unknown }[];
}

/** The API and the gateway, answering a successful payment unless told otherwise. */
const serve = (overrides: Parameters<typeof server.use> = []): Seen => {
  const seen: Seen = { created: [], tokenised: [], payments: [] };
  // Overrides first: of two handlers for one request, MSW uses the first.
  server.use(
    ...overrides,
    http.get(`${API}/quotes`, () => HttpResponse.json(QUOTE)),
    http.get(`${API}/payment-terms`, () => HttpResponse.json(somePaymentTerms())),
    http.post(`${API}/transactions`, async ({ request }) => {
      seen.created.push(await request.json());
      return HttpResponse.json(aTransaction(), { status: 201 });
    }),
    http.post(TOKENIZATION_URL, async ({ request }) => {
      seen.tokenised.push(await request.json());
      return HttpResponse.json(
        { status: 'CREATED', data: { id: 'tok_test_123', brand: 'VISA', last_four: '4242' } },
        { status: 201 },
      );
    }),
    http.post(`${API}/transactions/:id/payment`, async ({ request }) => {
      seen.payments.push({
        key: request.headers.get('Idempotency-Key'),
        body: await request.json(),
      });
      return HttpResponse.json(aTransaction({ paymentSubmitted: true }), { status: 202 });
    }),
    http.get(`${API}/transactions/:id`, () =>
      HttpResponse.json(aTransaction({ status: 'APPROVED', paymentSubmitted: true })),
    ),
    http.get(`${API}/transactions/:id/delivery`, () => HttpResponse.json(aDelivery())),
  );
  return seen;
};

const field = (label: string): HTMLElement => screen.getByLabelText(label);

/** From the form to the summary, as a buyer does it. */
const reachSummary = async (source: 'cart' | 'buy-now' = 'cart') => {
  const storage = memoryStorage();
  const store = createStore({ storage });
  store.dispatch(itemAdded({ productId: 'prod-espresso-01', units: 1 }));
  store.dispatch(orderStarted({ items: [{ productId: 'prod-espresso-01', units: 1 }], source }));
  store.dispatch(deliverySaved(DELIVERY));
  renderRoute('/checkout', undefined, store);

  await screen.findByRole('dialog', { name: 'Pago con tarjeta de crédito' });
  await userEvent.type(field('Número de la tarjeta'), '4242424242424242');
  await userEvent.type(field('Vencimiento'), '1234');
  await userEvent.type(field('CVC'), '123');
  await userEvent.type(field('Nombre en la tarjeta'), 'Laura Gomez');
  await userEvent.selectOptions(field('Cuotas'), '3');
  await userEvent.click(screen.getByRole('button', { name: 'Continuar al resumen' }));

  const summary = await screen.findByRole('dialog', { name: 'Resumen de tu pedido' });
  await within(summary).findByText('$ 91.690');
  await within(summary).findByRole('checkbox', { name: /reglamento de uso/ });
  return { store, storage, summary };
};

const acceptTerms = async (summary: HTMLElement): Promise<void> => {
  await userEvent.click(within(summary).getByRole('checkbox', { name: /reglamento de uso/ }));
  await userEvent.click(within(summary).getByRole('checkbox', { name: /datos personales/ }));
};

const pay = (summary: HTMLElement): Promise<void> =>
  userEvent.click(within(summary).getByRole('button', { name: /^Pagar/ }));

describe('summary and payment', () => {
  it('shows the fees and total in a backdrop, with the gateway’s documents to accept', async () => {
    serve();
    const { summary } = await reachSummary();

    expect(within(summary).getByText('Tarifa base').nextElementSibling).toHaveTextContent('$ 500');
    expect(within(summary).getByText('Envío').nextElementSibling).toHaveTextContent('$ 1.200');
    expect(within(summary).getByRole('link', { name: /reglamento de uso/ })).toHaveAttribute(
      'href',
      'https://gateway.test/terms.pdf',
    );
    expect(within(summary).getByRole('button', { name: /^Pagar \$\s91\.690$/ })).toBeEnabled();
  });

  it('asks for both acceptances before paying, and sends nothing until then', async () => {
    const seen = serve();
    const { summary } = await reachSummary();

    await pay(summary);

    expect(within(summary).getByRole('alert')).toHaveTextContent(
      'Acepta el reglamento y la autorización de datos para continuar.',
    );
    expect(seen.created).toHaveLength(0);
    expect(seen.tokenised).toHaveLength(0);
  });

  it('opens the transaction, tokenises the card with the gateway, pays, and shows the outcome', async () => {
    const seen = serve();
    const { store, storage, summary } = await reachSummary();

    await acceptTerms(summary);
    await pay(summary);

    expect(await screen.findByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible();

    expect(seen.created).toEqual([
      {
        items: [{ productId: 'prod-espresso-01', units: 1 }],
        expectedTotalInCents: 9_169_000,
        customer: { fullName: 'Laura Gómez', email: 'laura@example.com', phone: '3001234567' },
        deliveryAddress: {
          addressLine1: 'Calle 93 # 11-26',
          city: 'Bogotá',
          region: 'Bogotá D.C.',
          country: 'CO',
        },
      },
    ]);
    // The card goes to the gateway, and only there.
    expect(seen.tokenised).toEqual([
      {
        number: '4242424242424242',
        exp_month: '12',
        exp_year: '34',
        cvc: '123',
        card_holder: 'Laura Gomez',
      },
    ]);
    expect(seen.payments).toHaveLength(1);
    expect(seen.payments[0]?.key).toMatch(UUID);
    expect(seen.payments[0]?.body).toEqual({
      cardToken: 'tok_test_123',
      installments: 3,
      acceptanceToken: 'acceptance-token',
      personalDataAuthorizationToken: 'personal-data-token',
    });

    // Neither the card nor its token stays anywhere.
    const everywhere = JSON.stringify(store.getState()) + [...storage.entries.values()].join('');
    expect(everywhere).not.toContain('4242424242424242');
    expect(everywhere).not.toContain('tok_test_123');
  });

  it('empties the cart once an order from the cart is approved, and forgets the delivery', async () => {
    serve();
    const { store, summary } = await reachSummary('cart');

    await acceptTerms(summary);
    await pay(summary);
    await screen.findByRole('heading', { name: '¡Pago aprobado!' });

    await waitFor(() => expect(store.getState().cart.lines).toEqual([]));
    expect(store.getState().checkout.delivery).toBeNull();
    expect(store.getState().checkout.transactionId).toBeNull();
  });

  it('leaves the cart alone when the buyer bought now', async () => {
    serve();
    const { store, summary } = await reachSummary('buy-now');

    await acceptTerms(summary);
    await pay(summary);
    await screen.findByRole('heading', { name: '¡Pago aprobado!' });

    await waitFor(() => expect(store.getState().checkout.transactionId).toBeNull());
    expect(store.getState().cart.lines).toHaveLength(1);
  });

  it('says so when the gateway will not take the card, and never calls the payment', async () => {
    const seen = serve([
      http.post(TOKENIZATION_URL, () =>
        HttpResponse.json({ error: { type: 'INPUT_VALIDATION_ERROR' } }, { status: 422 }),
      ),
    ]);
    const { store, summary } = await reachSummary();

    await acceptTerms(summary);
    await pay(summary);

    expect(await within(summary).findByRole('alert')).toHaveTextContent(
      'No pudimos procesar la tarjeta. Revisa los datos o usa otra.',
    );
    expect(seen.payments).toHaveLength(0);
    expect(store.getState().checkout).toMatchObject({
      transactionId: TRANSACTION_ID,
      paymentStatus: 'failed',
      lastError: 'PAYMENT_REJECTED',
    });
  });

  it('pays a refused card again under a new key, in the same transaction', async () => {
    let attempt = 0;
    const seen = serve([
      http.post(`${API}/transactions/:id/payment`, ({ request }) => {
        attempt += 1;
        seen.payments.push({ key: request.headers.get('Idempotency-Key'), body: null });
        return attempt === 1
          ? HttpResponse.json(apiError('PAYMENT_REJECTED'), { status: 422 })
          : HttpResponse.json(aTransaction({ paymentSubmitted: true }), { status: 202 });
      }),
    ]);
    const { summary } = await reachSummary();

    await acceptTerms(summary);
    await pay(summary);
    await within(summary).findByRole('alert');
    await pay(summary);

    expect(await screen.findByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible();
    expect(seen.created).toHaveLength(1);
    expect(seen.payments[0]?.key).not.toBe(seen.payments[1]?.key);
  });

  it('retries after a lost connection under the same key, so nothing is charged twice', async () => {
    let attempt = 0;
    const seen = serve([
      http.post(`${API}/transactions/:id/payment`, ({ request }) => {
        attempt += 1;
        seen.payments.push({ key: request.headers.get('Idempotency-Key'), body: null });
        return attempt === 1
          ? HttpResponse.error()
          : HttpResponse.json(aTransaction({ paymentSubmitted: true }), { status: 202 });
      }),
    ]);
    const { summary } = await reachSummary();

    await acceptTerms(summary);
    await pay(summary);
    expect(await within(summary).findByRole('alert')).toHaveTextContent('Sin conexión');
    await pay(summary);

    await screen.findByRole('heading', { name: '¡Pago aprobado!' });
    expect(seen.payments).toHaveLength(2);
    expect(seen.payments[0]?.key).toBe(seen.payments[1]?.key);
  });

  it('names the product that ran out, and reserves nothing', async () => {
    serve([
      http.post(`${API}/transactions`, () =>
        HttpResponse.json(
          apiError('INSUFFICIENT_STOCK', {
            productId: 'prod-espresso-01',
            requested: 1,
            available: 0,
          }),
          { status: 409 },
        ),
      ),
    ]);
    const { store, summary } = await reachSummary();

    await acceptTerms(summary);
    await pay(summary);

    expect(await within(summary).findByRole('alert')).toHaveTextContent(
      'Solo quedan 0 unidades de Cafetera espresso Artigiano. Ajusta tu pedido para continuar.',
    );
    expect(store.getState().checkout.transactionId).toBeNull();
  });

  it('shows the new total when prices moved, so the buyer pays what they see', async () => {
    let quotes = 0;
    serve([
      http.get(`${API}/quotes`, () => {
        quotes += 1;
        return HttpResponse.json(
          quotes === 1
            ? QUOTE
            : { ...QUOTE, amounts: { ...QUOTE.amounts, totalInCents: 9_269_000 } },
        );
      }),
      http.post(`${API}/transactions`, () =>
        HttpResponse.json(apiError('AMOUNT_MISMATCH'), { status: 422 }),
      ),
    ]);
    const { summary } = await reachSummary();

    await acceptTerms(summary);
    await pay(summary);

    expect(await within(summary).findByRole('alert')).toHaveTextContent(
      'El total cambió desde que lo viste.',
    );
    expect(
      await within(summary).findByRole('button', { name: /^Pagar \$\s92\.690$/ }),
    ).toBeVisible();
  });

  it('opens a new transaction when the reservation ran out', async () => {
    let attempt = 0;
    const seen = serve([
      http.post(`${API}/transactions/:id/payment`, () => {
        attempt += 1;
        return attempt === 1
          ? HttpResponse.json(apiError('RESERVATION_EXPIRED'), { status: 409 })
          : HttpResponse.json(aTransaction({ paymentSubmitted: true }), { status: 202 });
      }),
    ]);
    const { summary } = await reachSummary();

    await acceptTerms(summary);
    await pay(summary);
    expect(await within(summary).findByRole('alert')).toHaveTextContent('Tu reserva expiró.');
    await pay(summary);

    await screen.findByRole('heading', { name: '¡Pago aprobado!' });
    expect(seen.created).toHaveLength(2);
  });

  it('goes to the outcome when the payment was already sent', async () => {
    serve([
      http.post(`${API}/transactions/:id/payment`, () =>
        HttpResponse.json(apiError('TRANSACTION_NOT_PAYABLE'), { status: 409 }),
      ),
    ]);
    const { summary } = await reachSummary();

    await acceptTerms(summary);
    await pay(summary);

    expect(await screen.findByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible();
  });
});
