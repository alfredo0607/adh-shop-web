import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { RouteObject } from 'react-router';

import { selectNotifications } from '@/app/notifications/notificationsSlice';
import { routes } from '@/app/router';
import { createStore } from '@/app/store';
import { orderStarted, selectCheckout } from '@/features/checkout/checkoutSlice';
import { aProduct, apiError } from '@/test/fixtures';
import { memoryStorage } from '@/test/memoryStorage';
import { renderRoute } from '@/test/renderRoute';
import { API, server } from '@/test/server';

const ESPRESSO = '/products/prod-espresso-01';

/** The app's routes, plus a stand-in for the checkout screen that step 4 adds. */
const withCheckout: RouteObject[] = [
  { path: '/checkout', element: <p>Checkout screen</p> },
  ...routes,
];

const increase = () => screen.getByRole('button', { name: 'Agregar una unidad' });
const decrease = () => screen.getByRole('button', { name: 'Quitar una unidad' });

describe('product page', () => {
  it('shows the product: name, price, stock, description and a sharp image first', async () => {
    renderRoute(ESPRESSO);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando producto…');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cafetera espresso Artigiano' }),
    ).toBeVisible();
    expect(screen.getAllByText('$ 89.990')[0]).toBeVisible();
    expect(screen.getByText('12 disponibles')).toBeVisible();
    expect(screen.getByText(/Cafetera espresso manual/)).toBeVisible();

    const image = screen.getByRole('img', { name: 'Cafetera espresso Artigiano' });
    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('fetchpriority', 'high');
  });

  it('keeps the units between 1 and the per-order limit, and shows the subtotal', async () => {
    renderRoute(ESPRESSO);
    await screen.findByRole('heading', { level: 1, name: /./ });

    expect(decrease()).toBeDisabled();
    expect(screen.getByText('Puedes llevar hasta 10 unidades por pedido.')).toBeVisible();

    await userEvent.click(increase());
    expect(screen.getByRole('group', { name: 'Cantidad' })).toHaveTextContent('2');
    expect(screen.getByText('Subtotal').parentElement).toHaveTextContent('$ 179.980');

    for (let click = 0; click < 12; click += 1) {
      if (!(increase() as HTMLButtonElement).disabled) await userEvent.click(increase());
    }
    expect(screen.getByRole('group', { name: 'Cantidad' })).toHaveTextContent('10');
    expect(increase()).toBeDisabled();
  });

  it('never offers more than is in stock', async () => {
    renderRoute('/products/prod-grinder-02');
    await screen.findByRole('heading', { level: 1, name: /./ });

    await userEvent.click(increase());
    await userEvent.click(increase());

    expect(screen.getByRole('group', { name: 'Cantidad' })).toHaveTextContent('3');
    expect(increase()).toBeDisabled();
    expect(screen.getByText('Hay 3 unidades disponibles.')).toBeVisible();
  });

  it('starts the order with the chosen units and opens the checkout', async () => {
    const { store } = renderRoute(ESPRESSO, withCheckout);
    await screen.findByRole('heading', { level: 1, name: /./ });

    await userEvent.click(increase());
    await userEvent.click(screen.getByRole('button', { name: 'Pagar con tarjeta de crédito' }));

    expect(await screen.findByText('Checkout screen')).toBeVisible();
    expect(selectCheckout(store.getState())).toMatchObject({
      items: [{ productId: 'prod-espresso-01', units: 2 }],
      source: 'buy-now',
    });
    // Buying now leaves the cart as it was.
    expect(store.getState().cart.lines).toEqual([]);
  });

  it('adds the chosen units to the cart and opens it', async () => {
    const { store } = renderRoute(ESPRESSO);
    await screen.findByRole('heading', { level: 1, name: /./ });

    await userEvent.click(increase());
    await userEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }));

    const cart = await screen.findByRole('dialog', { name: 'Tu carrito' });
    expect(within(cart).getByRole('link', { name: 'Cafetera espresso Artigiano' })).toBeVisible();
    expect(store.getState().cart.lines).toEqual([{ productId: 'prod-espresso-01', units: 2 }]);
    // While the cart is open, the page behind it is hidden from assistive technology.
    expect(
      screen.getByRole('button', { name: 'Carrito, 2 productos', hidden: true }),
    ).toBeInTheDocument();
  });

  it('cannot add a sold-out product to the cart', async () => {
    renderRoute('/products/prod-beans-06');
    await screen.findByRole('heading', { level: 1, name: /./ });

    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeDisabled();
  });

  it('remembers the units of an order in progress for the same product', async () => {
    const store = createStore({ storage: memoryStorage() });
    store.dispatch(
      orderStarted({ items: [{ productId: 'prod-espresso-01', units: 4 }], source: 'buy-now' }),
    );

    renderRoute(ESPRESSO, routes, store);
    await screen.findByRole('heading', { level: 1, name: /./ });

    expect(screen.getByRole('group', { name: 'Cantidad' })).toHaveTextContent('4');
  });

  it('lowers remembered units that stock can no longer cover', async () => {
    const store = createStore({ storage: memoryStorage() });
    store.dispatch(
      orderStarted({ items: [{ productId: 'prod-grinder-02', units: 7 }], source: 'buy-now' }),
    );

    renderRoute('/products/prod-grinder-02', routes, store);
    await screen.findByRole('heading', { level: 1, name: /./ });

    expect(screen.getByRole('group', { name: 'Cantidad' })).toHaveTextContent('3');
  });

  it('cannot be bought when sold out', async () => {
    renderRoute('/products/prod-beans-06');
    await screen.findByRole('heading', { level: 1, name: /./ });

    expect(screen.getByText('Este producto está agotado por ahora.')).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Cantidad' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pagar con tarjeta de crédito' })).toBeDisabled();
  });

  it('says a missing product is missing, without a toast', async () => {
    const { store } = renderRoute('/products/nope');

    expect(await screen.findByRole('alert')).toHaveAccessibleName('Producto no encontrado');
    expect(screen.getByRole('link', { name: 'Volver a la tienda' })).toHaveAttribute('href', '/');
    expect(selectNotifications(store.getState())).toEqual([]);
  });

  it('offers a retry when the product cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/products/:id`, () => {
        calls += 1;
        return calls <= 3
          ? HttpResponse.json(apiError('INTERNAL_ERROR'), { status: 500 })
          : HttpResponse.json(aProduct());
      }),
    );
    const { store } = renderRoute(ESPRESSO);

    expect(await screen.findByRole('alert')).toHaveAccessibleName(
      'No pudimos cargar este producto.',
    );
    expect(selectNotifications(store.getState())).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cafetera espresso Artigiano' }),
    ).toBeVisible();
  });

  it('asks for fresh stock every time the page opens', async () => {
    let requests = 0;
    server.use(
      http.get(`${API}/products/:id`, () => {
        requests += 1;
        return HttpResponse.json(aProduct({ availableUnits: requests === 1 ? 12 : 9 }));
      }),
    );
    renderRoute(ESPRESSO);
    await screen.findByText('12 disponibles');

    await userEvent.click(screen.getByRole('link', { name: 'Volver a la tienda' }));
    await userEvent.click(await screen.findByRole('link', { name: 'Cafetera espresso Artigiano' }));

    expect(await screen.findByText('9 disponibles')).toBeVisible();
    expect(requests).toBe(2);
  });
});
