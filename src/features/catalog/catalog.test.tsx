import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { selectNotifications } from '@/app/notifications/notificationsSlice';
import { aProduct, apiError } from '@/test/fixtures';
import { renderRoute } from '@/test/renderRoute';
import { API, server } from '@/test/server';

const cards = async () =>
  within(await screen.findByRole('list', { name: 'Nuestros productos' })).findAllByRole('article');

describe('catalogue', () => {
  it('shows every product with its price and stock, each linking to its page', async () => {
    renderRoute('/');

    expect(screen.getByRole('status')).toHaveTextContent('Cargando productos…');

    const [espresso, grinder, beans] = await cards();
    expect(espresso).toHaveTextContent('Cafetera espresso Artigiano');
    expect(espresso).toHaveTextContent('$ 89.990');
    expect(espresso).toHaveTextContent('12 disponibles');
    expect(within(espresso!).getByRole('link')).toHaveAttribute(
      'href',
      '/products/prod-espresso-01',
    );
    expect(grinder).toHaveTextContent('Últimas 3 unidades');
    expect(beans).toHaveTextContent('Agotado');
  });

  it('says so when there is nothing to sell', async () => {
    server.use(
      http.get(`${API}/products`, () => HttpResponse.json({ items: [], nextCursor: null })),
    );

    renderRoute('/');

    expect(await screen.findByText(/no hay productos disponibles/)).toBeVisible();
  });

  it('offers a retry when the catalogue fails, and the toast explains why', async () => {
    // Three failures: the first request and the base query's two retries.
    let calls = 0;
    server.use(
      http.get(`${API}/products`, () => {
        calls += 1;
        return calls <= 3
          ? HttpResponse.json(apiError('INTERNAL_ERROR'), { status: 500 })
          : HttpResponse.json({
              items: [aProduct(), aProduct({ id: 'b' }), aProduct({ id: 'c' })],
              nextCursor: null,
            });
      }),
    );
    const { store } = renderRoute('/');

    expect(await screen.findByText('No pudimos cargar los productos.')).toBeVisible();
    expect(selectNotifications(store.getState())).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await cards()).toHaveLength(3);
  });

  it('loads the next page with the cursor the API returned', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(`${API}/products`, ({ request }) => {
        const url = new URL(request.url);
        cursors.push(url.searchParams.get('cursor'));
        expect(url.searchParams.get('limit')).toBe('12');
        return url.searchParams.get('cursor') === 'page-2'
          ? HttpResponse.json({
              items: [aProduct({ id: 'prod-kettle-03', name: 'Hervidor de cuello de ganso' })],
              nextCursor: null,
            })
          : HttpResponse.json({ items: [aProduct()], nextCursor: 'page-2' });
      }),
    );
    renderRoute('/');

    expect(await cards()).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Ver más productos' }));

    expect(await screen.findByText('Hervidor de cuello de ganso')).toBeVisible();
    expect(await cards()).toHaveLength(2);
    expect(cursors).toEqual([null, 'page-2']);
    expect(screen.queryByRole('button', { name: 'Ver más productos' })).not.toBeInTheDocument();
  });

  it('keeps the layout when an image cannot load', async () => {
    renderRoute('/');
    const [espresso] = await cards();
    const image = espresso!.querySelector('img')!;

    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('width', '800');
    fireEvent.error(image);

    expect(within(espresso!).getByText('Imagen no disponible')).toBeVisible();
  });
});
