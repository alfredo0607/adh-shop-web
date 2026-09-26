import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { selectNotifications } from '@/app/notifications/notificationsSlice';
import { routes } from '@/app/router';
import { createStore } from '@/app/store';
import { selectCheckout } from '@/features/checkout/checkoutSlice';
import { memoryStorage } from '@/test/memoryStorage';
import { renderRoute } from '@/test/renderRoute';

import { itemAdded } from './cartSlice';

const storeWith = (lines: { productId: string; units: number }[]) => {
  const store = createStore({ storage: memoryStorage() });
  for (const line of lines) store.dispatch(itemAdded(line));
  return store;
};

const openCart = async (name: RegExp | string = /^Carrito/): Promise<HTMLElement> => {
  await userEvent.click(await screen.findByRole('button', { name }));
  return screen.findByRole('dialog', { name: 'Tu carrito' });
};

describe('cart', () => {
  it('says it is empty, and leads back to the catalogue', async () => {
    renderRoute('/products/prod-espresso-01');

    const cart = await openCart('Carrito');

    expect(within(cart).getByText('Tu carrito está vacío.')).toBeVisible();
    await userEvent.click(within(cart).getByRole('link', { name: 'Explorar productos' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Nuestros productos' })).toBeVisible();
  });

  it('adds from a product card with one tap, and counts it in the header', async () => {
    const { store } = renderRoute('/');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Agregar Molino cónico Fresa al carrito' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar Molino cónico Fresa al carrito' }),
    );

    expect(screen.getByRole('button', { name: 'Carrito, 2 productos' })).toBeInTheDocument();
    expect(selectNotifications(store.getState())[0]?.message).toBe(
      'Agregaste Molino cónico Fresa al carrito.',
    );

    // Opening the cart shows what was added; the notice would only cover it.
    await openCart('Carrito, 2 productos');
    expect(selectNotifications(store.getState())).toEqual([]);
  });

  it('offers no quick add for a sold-out product', async () => {
    renderRoute('/?categoria=cafe');
    await screen.findByRole('heading', { name: 'Café de origen Nariño 500 g' });

    expect(
      screen.queryByRole('button', { name: 'Agregar Café de origen Huila 500 g al carrito' }),
    ).toBeNull();
  });

  it('lists each product with today’s price, and keeps the subtotal right', async () => {
    renderRoute(
      '/',
      routes,
      storeWith([
        { productId: 'prod-espresso-01', units: 1 },
        { productId: 'prod-grinder-02', units: 2 },
      ]),
    );

    const cart = await openCart('Carrito, 3 productos');

    expect(await within(cart).findByText('$ 89.990 c/u')).toBeVisible();
    expect(within(cart).getByText('Subtotal').parentElement).toHaveTextContent('$ 174.990');

    const grinder = within(cart).getByRole('group', { name: 'Cantidad de Molino cónico Fresa' });
    await userEvent.click(within(grinder).getByRole('button', { name: 'Quitar una unidad' }));
    expect(within(cart).getByText('Subtotal').parentElement).toHaveTextContent('$ 132.490');

    await userEvent.click(
      within(cart).getByRole('button', { name: 'Quitar Cafetera espresso Artigiano del carrito' }),
    );
    expect(within(cart).getByText('Subtotal').parentElement).toHaveTextContent('$ 42.500');
  });

  it('never offers more units than are in stock', async () => {
    renderRoute('/', routes, storeWith([{ productId: 'prod-grinder-02', units: 3 }]));

    const cart = await openCart();
    const grinder = await within(cart).findByRole('group', {
      name: 'Cantidad de Molino cónico Fresa',
    });

    expect(grinder).toHaveTextContent('3');
    expect(within(grinder).getByRole('button', { name: 'Agregar una unidad' })).toBeDisabled();
  });

  it('holds back the checkout while a product is no longer available', async () => {
    renderRoute(
      '/',
      routes,
      storeWith([
        { productId: 'prod-beans-06', units: 1 },
        { productId: 'prod-espresso-01', units: 1 },
      ]),
    );

    const cart = await openCart();

    expect(await within(cart).findByText('No disponible')).toBeVisible();
    expect(within(cart).getByRole('button', { name: 'Ir a pagar' })).toBeDisabled();
    expect(
      within(cart).getByText('Quita los productos que ya no están disponibles para continuar.'),
    ).toBeVisible();

    await userEvent.click(
      within(cart).getByRole('button', { name: 'Quitar Café de origen Huila 500 g del carrito' }),
    );
    expect(within(cart).getByRole('button', { name: 'Ir a pagar' })).toBeEnabled();
  });

  it('starts an order with every product of the cart and opens the checkout', async () => {
    const store = storeWith([
      { productId: 'prod-espresso-01', units: 1 },
      { productId: 'prod-grinder-02', units: 2 },
    ]);
    renderRoute('/', routes, store);

    const cart = await openCart();
    await userEvent.click(await within(cart).findByRole('button', { name: 'Ir a pagar' }));

    expect(
      await screen.findByRole('dialog', { name: 'Pago con tarjeta de crédito' }),
    ).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Tu carrito' })).not.toBeInTheDocument();
    expect(selectCheckout(store.getState())).toMatchObject({
      source: 'cart',
      items: [
        { productId: 'prod-espresso-01', units: 1 },
        { productId: 'prod-grinder-02', units: 2 },
      ],
    });
  });

  it('closes with its button and keeps its contents', async () => {
    const store = storeWith([{ productId: 'prod-espresso-01', units: 1 }]);
    renderRoute('/', routes, store);

    const cart = await openCart();
    await userEvent.click(within(cart).getByRole('button', { name: 'Cerrar carrito' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(store.getState().cart.lines).toHaveLength(1);
  });

  it('says when it cannot take another product', async () => {
    const store = storeWith(
      Array.from({ length: 10 }, (_, index) => ({ productId: `other-${index}`, units: 1 })),
    );
    renderRoute('/', routes, store);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Agregar Molino cónico Fresa al carrito' }),
    );

    expect(selectNotifications(store.getState())[0]?.message).toBe(
      'Tu carrito admite hasta 10 productos distintos.',
    );
    expect(store.getState().cart.lines).toHaveLength(10);
  });
});
