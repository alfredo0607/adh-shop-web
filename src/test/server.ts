import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { aProduct, apiError } from './fixtures';

export const API = 'https://api.test/api/v1';

/** The catalogue every screen can count on, unless a test says otherwise. */
export const CATALOGUE = [
  aProduct(),
  aProduct({
    id: 'prod-grinder-02',
    name: 'Molino cónico Fresa',
    description: 'Molino de fresas cónicas con 40 niveles de molienda.',
    category: 'grinders',
    priceInCents: 4_250_000,
    availableUnits: 3,
  }),
  aProduct({
    id: 'prod-beans-06',
    name: 'Café de origen Huila 500 g',
    description: 'Caturra lavado del Huila. Notas de panela y cacao.',
    category: 'coffee',
    priceInCents: 480_000,
    availableUnits: 0,
    isPurchasable: false,
  }),
  ...(
    [
      ['prod-moka-07', 'Cafetera moka 6 tazas', 'coffee-makers', 1_190_000],
      ['prod-press-09', 'Prensa francesa 1 L', 'brewing', 980_000],
      ['prod-dripper-10', 'Gotero cerámico', 'brewing', 850_000],
      ['prod-pitcher-14', 'Jarra para leche 600 ml', 'accessories', 590_000],
      ['prod-tamper-15', 'Prensador de 58 mm', 'accessories', 740_000],
      ['prod-filters-16', 'Filtros de papel × 100', 'accessories', 250_000],
      ['prod-narino-17', 'Café de origen Nariño 500 g', 'coffee', 520_000],
    ] as const
  ).map(([id, name, category, priceInCents]) =>
    aProduct({ id, name, description: `${name}.`, category, priceInCents, availableUnits: 20 }),
  ),
];

const defaultHandlers = [
  http.get(`${API}/products`, () => HttpResponse.json({ items: CATALOGUE, nextCursor: null })),
  http.get(`${API}/products/:id`, ({ params }) => {
    const product = CATALOGUE.find((item) => item.id === params['id']);
    return product === undefined
      ? HttpResponse.json(apiError('PRODUCT_NOT_FOUND'), { status: 404 })
      : HttpResponse.json(product);
  }),
];

/**
 * The network, mocked. The catalogue answers by default; everything else is
 * declared by each test with `server.use(...)`. A request nobody declared fails
 * the test, so a component can never talk to the real API by accident.
 */
export const server = setupServer(...defaultHandlers);
