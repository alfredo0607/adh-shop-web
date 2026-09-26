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
    priceInCents: 4_250_000,
    availableUnits: 3,
  }),
  aProduct({
    id: 'prod-beans-06',
    name: 'Café de origen Huila 500 g',
    priceInCents: 480_000,
    availableUnits: 0,
    isPurchasable: false,
  }),
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
