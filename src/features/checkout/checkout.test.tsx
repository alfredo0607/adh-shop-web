import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { createStore } from '@/app/store';
import { STORAGE_PREFIX } from '@/app/persistence';
import { apiError } from '@/test/fixtures';
import { memoryStorage } from '@/test/memoryStorage';
import { renderRoute } from '@/test/renderRoute';
import { API, server } from '@/test/server';

import { deliverySaved, orderStarted, type DeliveryDetails } from './checkoutSlice';

const QUOTE = {
  items: [
    {
      productId: 'prod-espresso-01',
      name: 'Cafetera espresso Artigiano',
      units: 1,
      unitPriceInCents: 8_999_000,
      lineTotalInCents: 8_999_000,
    },
    {
      productId: 'prod-grinder-02',
      name: 'Molino cónico Fresa',
      units: 2,
      unitPriceInCents: 4_250_000,
      lineTotalInCents: 8_500_000,
    },
  ],
  amounts: {
    productInCents: 17_499_000,
    baseFeeInCents: 50_000,
    deliveryFeeInCents: 120_000,
    totalInCents: 17_669_000,
    currency: 'COP',
  },
};

const ITEMS = [
  { productId: 'prod-espresso-01', units: 1 },
  { productId: 'prod-grinder-02', units: 2 },
];

const setup = (delivery?: DeliveryDetails) => {
  const storage = memoryStorage();
  const store = createStore({ storage });
  store.dispatch(orderStarted({ items: ITEMS, source: 'cart' }));
  if (delivery !== undefined) store.dispatch(deliverySaved(delivery));
  return { store, storage };
};

const field = (label: string): HTMLElement => screen.getByLabelText(label);

const fillCard = async (number = '4242424242424242'): Promise<void> => {
  await userEvent.type(field('Número de la tarjeta'), number);
  await userEvent.type(field('Vencimiento'), '1234');
  await userEvent.type(field('CVC'), '123');
  await userEvent.type(field('Nombre en la tarjeta'), 'Laura Gomez');
  await userEvent.selectOptions(field('Cuotas'), '3');
};

const fillDelivery = async (): Promise<void> => {
  await userEvent.type(field('Nombre completo'), 'Laura Gómez');
  await userEvent.type(field('Correo electrónico'), 'Laura@Example.com');
  await userEvent.type(field('Celular'), '300 123 4567');
  await userEvent.type(field('Dirección'), 'Calle 93 # 11-26');
  await userEvent.type(field('Ciudad o municipio'), 'Bogotá');
  await userEvent.selectOptions(field('Departamento'), 'Bogotá D.C.');
};

const openForm = async (store = setup().store) => {
  const rendered = renderRoute('/checkout', undefined, store);
  await screen.findByRole('dialog', { name: 'Pago con tarjeta de crédito' });
  return rendered;
};

describe('checkout form', () => {
  it('sends a buyer with no order back to the store', async () => {
    renderRoute('/checkout');

    expect(await screen.findByRole('heading', { name: 'Nuestros productos' })).toBeVisible();
  });

  it('opens over the order being bought', async () => {
    await openForm();

    const order = screen.getByRole('region', { name: 'Tu pedido', hidden: true });
    expect(await within(order).findByText('Cafetera espresso Artigiano')).toBeInTheDocument();
    expect(within(order).getByText('× 2')).toBeInTheDocument();
  });

  it('groups the number as typed and shows the brand as soon as it is known', async () => {
    await openForm();

    await userEvent.type(field('Número de la tarjeta'), '4242424242424242');
    expect(field('Número de la tarjeta')).toHaveValue('4242 4242 4242 4242');
    expect(screen.getByRole('img', { name: 'VISA' })).toBeInTheDocument();

    await userEvent.clear(field('Número de la tarjeta'));
    await userEvent.type(field('Número de la tarjeta'), '5555');
    expect(screen.getByRole('img', { name: 'Mastercard' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'VISA' })).toBeNull();
  });

  it('types the slash of the expiry for the buyer', async () => {
    await openForm();

    await userEvent.type(field('Vencimiento'), '1234');

    expect(field('Vencimiento')).toHaveValue('12/34');
  });

  it('uses the keyboards and autofill a phone expects', async () => {
    await openForm();

    expect(field('Número de la tarjeta')).toHaveAttribute('autocomplete', 'cc-number');
    expect(field('Número de la tarjeta')).toHaveAttribute('inputmode', 'numeric');
    expect(field('CVC')).toHaveAttribute('autocomplete', 'cc-csc');
    expect(field('Correo electrónico')).toHaveAttribute('autocomplete', 'email');
    expect(field('País')).toHaveValue('Colombia');
  });

  it('says what is wrong once a field is left, not while it is typed', async () => {
    await openForm();
    const number = field('Número de la tarjeta');

    await userEvent.type(number, '4242424242424241');
    expect(screen.queryByText('Revisa el número de la tarjeta.')).toBeNull();

    await userEvent.tab();
    const error = await screen.findByText('Revisa el número de la tarjeta.');
    expect(number).toHaveAttribute('aria-invalid', 'true');
    expect(number.getAttribute('aria-describedby')).toContain(error.id);

    // Corrected live, now that the field was touched.
    await userEvent.clear(number);
    await userEvent.type(number, '4242424242424242');
    await waitFor(() => expect(screen.queryByText('Revisa el número de la tarjeta.')).toBeNull());
  });

  it('rejects a brand the store does not take', async () => {
    await openForm();

    await userEvent.type(field('Número de la tarjeta'), '378282246310005');
    await userEvent.tab();

    expect(await screen.findByText('Solo aceptamos tarjetas VISA y Mastercard.')).toBeVisible();
  });

  it('shows every problem on submit and takes the buyer to the first one', async () => {
    await openForm();

    await userEvent.click(screen.getByRole('button', { name: 'Continuar al resumen' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa los campos marcados.');
    expect(screen.getAllByText('Este campo es obligatorio.').length).toBeGreaterThan(5);
    expect(screen.getByText('Selecciona un departamento.')).toBeVisible();
    await waitFor(() => expect(field('Número de la tarjeta')).toHaveFocus());
  });

  it('keeps the card out of the store and storage, saves the delivery, and shows the summary', async () => {
    let quoted: string | null = null;
    server.use(
      http.get(`${API}/quotes`, ({ request }) => {
        quoted = new URL(request.url).searchParams.get('items');
        return HttpResponse.json(QUOTE);
      }),
    );
    const { store, storage } = setup();
    await openForm(store);

    await fillCard();
    await fillDelivery();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar al resumen' }));

    const summary = await screen.findByRole('region', { name: 'Resumen de tu pedido' });
    expect(await within(summary).findByText('$ 176.690')).toBeVisible();
    expect(within(summary).getByText('VISA terminada en 4242')).toBeVisible();
    expect(within(summary).getByText('3 cuotas')).toBeVisible();
    expect(within(summary).getByText('Laura Gómez')).toBeVisible();
    expect(quoted).toBe('prod-espresso-01:1,prod-grinder-02:2');

    expect(store.getState().checkout.delivery).toEqual({
      fullName: 'Laura Gómez',
      email: 'laura@example.com',
      phone: '3001234567',
      addressLine1: 'Calle 93 # 11-26',
      city: 'Bogotá',
      region: 'Bogotá D.C.',
      country: 'CO',
    });
    const everywhere = JSON.stringify(store.getState()) + [...storage.entries.values()].join('');
    expect(everywhere).not.toContain('4242424242424242');
    expect(everywhere).not.toContain('4242 4242');
    await waitFor(() =>
      expect(storage.entries.get(`${STORAGE_PREFIX}checkout`)).toContain('Calle 93'),
    );
  });

  it('goes back to the form with everything the buyer typed', async () => {
    server.use(http.get(`${API}/quotes`, () => HttpResponse.json(QUOTE)));
    await openForm();
    await fillCard('5555555555554444');
    await fillDelivery();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar al resumen' }));
    await screen.findByText('Mastercard terminada en 4444');

    await userEvent.click(screen.getByRole('link', { name: 'Editar datos' }));

    await screen.findByRole('dialog', { name: 'Pago con tarjeta de crédito' });
    expect(field('Número de la tarjeta')).toHaveValue('5555 5555 5555 4444');
    expect(field('Vencimiento')).toHaveValue('12/34');
    expect(field('Cuotas')).toHaveValue('3');
    expect(field('Dirección')).toHaveValue('Calle 93 # 11-26');
  });

  it('fills in the delivery details the buyer gave before', async () => {
    const { store } = setup({
      fullName: 'Laura Gómez',
      email: 'laura@example.com',
      phone: '3001234567',
      addressLine1: 'Calle 93 # 11-26',
      addressLine2: 'Apto 502',
      city: 'Bogotá',
      region: 'Bogotá D.C.',
      postalCode: '110221',
      country: 'CO',
    });

    await openForm(store);

    expect(field('Nombre completo')).toHaveValue('Laura Gómez');
    expect(field('Apartamento, torre u oficina (opcional)')).toHaveValue('Apto 502');
    expect(field('Departamento')).toHaveValue('Bogotá D.C.');
    expect(field('Número de la tarjeta')).toHaveValue('');
  });

  it('asks for the card again when the summary is reached without one', async () => {
    const { store } = setup({
      fullName: 'Laura Gómez',
      email: 'laura@example.com',
      phone: '3001234567',
      addressLine1: 'Calle 93 # 11-26',
      city: 'Bogotá',
      region: 'Bogotá D.C.',
      country: 'CO',
    });

    renderRoute('/checkout/resumen', undefined, store);

    expect(
      await screen.findByRole('dialog', { name: 'Pago con tarjeta de crédito' }),
    ).toBeVisible();
  });

  it('offers a retry when the total cannot be calculated', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/quotes`, () => {
        calls += 1;
        // The first request and the base query's two automatic retries.
        return calls <= 3
          ? HttpResponse.json(apiError('INTERNAL_ERROR'), { status: 500 })
          : HttpResponse.json(QUOTE);
      }),
    );
    await openForm();
    await fillCard();
    await fillDelivery();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar al resumen' }));

    expect(
      await screen.findByText('No pudimos calcular el total. Intenta de nuevo.'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('$ 176.690')).toBeVisible();
  });

  it('closes back to the store when opened directly', async () => {
    await openForm();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar el pago' }));

    expect(await screen.findByRole('heading', { name: 'Nuestros productos' })).toBeVisible();
  });
});
