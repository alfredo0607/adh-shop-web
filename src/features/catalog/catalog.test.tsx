import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { selectNotifications } from '@/app/notifications/notificationsSlice';
import { aProduct, apiError } from '@/test/fixtures';
import { renderRoute } from '@/test/renderRoute';
import { API, server } from '@/test/server';

const grid = async (): Promise<HTMLElement> =>
  screen.findByRole('list', { name: 'Nuestros productos' });

const cards = async (): Promise<HTMLElement[]> => within(await grid()).findAllByRole('article');

const names = async (): Promise<string[]> =>
  (await cards()).map((card) => within(card).getByRole('heading').textContent ?? '');

const count = (): HTMLElement => screen.getByText(/^Mostrando|^1 producto$/);

describe('catalogue', () => {
  it('shows the first page: price, category and stock, each card linking to its product', async () => {
    renderRoute('/');

    expect(screen.getByRole('status')).toHaveTextContent('Cargando productos…');

    const [espresso, grinder] = await cards();
    expect(espresso).toHaveTextContent('Cafetera espresso Artigiano');
    expect(espresso).toHaveTextContent('Cafeteras');
    expect(espresso).toHaveTextContent('$ 89.990');
    expect(espresso).toHaveTextContent('12 disponibles');
    expect(within(espresso!).getByRole('link')).toHaveAttribute(
      'href',
      '/products/prod-espresso-01',
    );
    expect(grinder).toHaveTextContent('Últimas 3 unidades');
    expect(await cards()).toHaveLength(8);
    expect(count()).toHaveTextContent('Mostrando 1–8 de 10 productos');
  });

  it('puts what cannot be bought after everything that can', async () => {
    renderRoute('/?pagina=2');

    expect(await names()).toEqual(['Café de origen Nariño 500 g', 'Café de origen Huila 500 g']);
    expect((await cards())[1]).toHaveTextContent('Agotado');
  });

  it('moves between pages with numbered links', async () => {
    renderRoute('/');
    await grid();

    const pagination = screen.getByRole('navigation', { name: 'Paginación del catálogo' });
    expect(within(pagination).getByRole('link', { name: 'Página 1' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await userEvent.click(within(pagination).getByRole('link', { name: 'Página siguiente' }));

    expect(await names()).toHaveLength(2);
    expect(count()).toHaveTextContent('Mostrando 9–10 de 10 productos');
    expect(within(pagination).getByRole('link', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(pagination).queryByRole('link', { name: 'Página siguiente' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the filters in the page links', async () => {
    renderRoute('/?orden=nombre');
    await grid();

    expect(screen.getByRole('link', { name: 'Página 2' })).toHaveAttribute(
      'href',
      '/?orden=nombre&pagina=2',
    );
  });

  it('opens with the filters of the link it was reached by', async () => {
    renderRoute('/?categoria=molinos');

    expect(await names()).toEqual(['Molino cónico Fresa']);
    expect(screen.getByRole('button', { name: 'Molinos' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false');
    expect(count()).toHaveTextContent('1 producto');
  });

  it('filters by one or more categories, and back to all', async () => {
    renderRoute('/');
    await grid();

    await userEvent.click(screen.getByRole('button', { name: 'Accesorios' }));
    expect(await names()).toEqual([
      'Jarra para leche 600 ml',
      'Prensador de 58 mm',
      'Filtros de papel × 100',
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Molinos' }));
    expect(await names()).toHaveLength(4);

    await userEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(await names()).toHaveLength(8);
  });

  it('searches by name and description, without minding accents', async () => {
    renderRoute('/');
    await grid();

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'cafe huila{Enter}');

    expect(await names()).toEqual(['Café de origen Huila 500 g']);

    await userEvent.click(screen.getByRole('button', { name: 'Borrar búsqueda' }));
    expect(await names()).toHaveLength(8);
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('');
  });

  it('filters by price band and sorts', async () => {
    renderRoute('/');
    await grid();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Precio' }), 'hasta-50000');
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Ordenar por' }),
      'precio-desc',
    );

    expect(await names()).toEqual([
      'Molino cónico Fresa',
      'Cafetera moka 6 tazas',
      'Prensa francesa 1 L',
      'Gotero cerámico',
      'Prensador de 58 mm',
      'Jarra para leche 600 ml',
      'Café de origen Nariño 500 g',
      'Café de origen Huila 500 g',
    ]);
  });

  it('can leave out what is sold out', async () => {
    renderRoute('/?categoria=cafe');
    expect(await names()).toHaveLength(2);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Solo disponibles' }));

    expect(await names()).toEqual(['Café de origen Nariño 500 g']);
  });

  it('says when nothing matches, and clears the filters but keeps the order', async () => {
    renderRoute('/?q=tetera&orden=nombre');

    expect(await screen.findByText('Ningún producto coincide con tu búsqueda.')).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Paginación del catálogo' })).toBeNull();

    const clear = screen.getAllByRole('button', { name: 'Limpiar filtros' });
    await userEvent.click(clear[clear.length - 1]!);

    expect(await names()).toHaveLength(8);
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveValue('nombre');
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('');
  });

  it('goes back to the first page when a filter changes', async () => {
    renderRoute('/?pagina=2');
    expect(await names()).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Métodos de preparación' }));

    expect(await names()).toEqual(['Prensa francesa 1 L', 'Gotero cerámico']);
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

  it('keeps the layout when an image cannot load', async () => {
    renderRoute('/');
    const [espresso] = await cards();
    const image = espresso!.querySelector('img')!;

    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('width', '800');
    fireEvent.error(image);

    expect(within(espresso!).getByText('Imagen no disponible')).toBeVisible();
  });

  it('says favourites are coming, rather than doing nothing', async () => {
    const { store } = renderRoute('/');
    const [espresso] = await cards();

    await userEvent.click(
      within(espresso!).getByRole('button', {
        name: 'Guardar Cafetera espresso Artigiano en favoritos',
      }),
    );

    expect(selectNotifications(store.getState())).toEqual([
      expect.objectContaining({
        tone: 'info',
        message: 'Esta función estará disponible muy pronto.',
      }),
    ]);
  });
});

describe('header', () => {
  it('takes the buyer to the catalogue search from any page', async () => {
    renderRoute('/products/prod-espresso-01');
    await screen.findByRole('heading', { level: 1, name: 'Cafetera espresso Artigiano' });

    await userEvent.click(screen.getByRole('button', { name: 'Buscar productos' }));

    await grid();
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveFocus();
  });

  it('keeps the current filters when searching from the catalogue', async () => {
    renderRoute('/?categoria=molinos');
    expect(await names()).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Buscar productos' }));

    expect(await names()).toHaveLength(1);
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveFocus();
  });

  it('links to each category, marking the one shown', async () => {
    renderRoute('/?categoria=cafe');
    await grid();

    const categories = screen.getByRole('navigation', { name: 'Categorías' });
    expect(within(categories).getByRole('link', { name: 'Café' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(categories).getByRole('link', { name: 'Molinos' })).toHaveAttribute(
      'href',
      '/?categoria=molinos',
    );
  });

  it.each(['Favoritos', 'Mi cuenta'])('says %s is coming soon', async (label) => {
    const { store } = renderRoute('/');

    await userEvent.click(screen.getByRole('button', { name: label }));

    expect(selectNotifications(store.getState())[0]?.message).toBe(
      'Esta función estará disponible muy pronto.',
    );
  });

  it('shows the accepted card brands in the footer', () => {
    renderRoute('/');

    const footer = screen.getByRole('contentinfo');
    const brands = within(footer).getByRole('list', { name: 'Medios de pago' });
    expect(within(brands).getByRole('img', { name: 'VISA' })).toBeInTheDocument();
    expect(within(brands).getByRole('img', { name: 'Mastercard' })).toBeInTheDocument();
  });
});
