import { aProduct } from '@/test/fixtures';

import {
  DEFAULT_FILTERS,
  type CatalogueFilters,
  applyFilters,
  hasActiveFilters,
  pageItems,
  paginate,
  parseFilters,
  toSearchParams,
} from './filters';

const filters = (overrides: Partial<CatalogueFilters> = {}): CatalogueFilters => ({
  ...DEFAULT_FILTERS,
  ...overrides,
});

const CATALOGUE = [
  aProduct({ id: 'espresso', name: 'Cafetera espresso', priceInCents: 89_990_00 }),
  aProduct({
    id: 'grinder',
    name: 'Molino cónico',
    description: 'Fresas de acero',
    category: 'grinders',
    priceInCents: 42_500_00,
  }),
  aProduct({
    id: 'beans',
    name: 'Café de origen Huila',
    description: 'Notas de panela',
    category: 'coffee',
    priceInCents: 4_800_00,
    availableUnits: 0,
    isPurchasable: false,
  }),
  aProduct({
    id: 'big-grinder',
    name: 'Molino eléctrico',
    description: 'Muelas planas',
    category: 'grinders',
    priceInCents: 1_249_000_00,
  }),
];

const ids = (list: readonly { id: string }[]): string[] => list.map((product) => product.id);

describe('parseFilters and toSearchParams', () => {
  it('reads every filter from the address bar', () => {
    const parsed = parseFilters(
      new URLSearchParams(
        'q=molino&categoria=molinos&categoria=cafe&precio=50000-200000&disponibles=1&orden=precio-desc&pagina=3',
      ),
    );

    expect(parsed).toEqual({
      query: 'molino',
      categories: ['grinders', 'coffee'],
      price: '50000-200000',
      inStockOnly: true,
      sort: 'precio-desc',
      page: 3,
    });
  });

  it('ignores what it does not recognise instead of failing', () => {
    const parsed = parseFilters(
      new URLSearchParams('categoria=muebles&precio=gratis&orden=azar&pagina=-2&disponibles=si'),
    );

    expect(parsed).toEqual(DEFAULT_FILTERS);
  });

  it('keeps a category once, even if the link repeats it', () => {
    expect(parseFilters(new URLSearchParams('categoria=cafe&categoria=cafe')).categories).toEqual([
      'coffee',
    ]);
  });

  it('trims and caps the search text', () => {
    expect(parseFilters(new URLSearchParams(`q=  ${'a'.repeat(200)}  `)).query).toHaveLength(80);
  });

  it('writes a round trip, leaving the defaults out of the link', () => {
    const chosen = filters({ query: 'café', categories: ['brewing'], sort: 'nombre', page: 2 });

    const params = toSearchParams(chosen);

    expect(params.toString()).toBe('q=caf%C3%A9&categoria=metodos&orden=nombre&pagina=2');
    expect(parseFilters(params)).toEqual(chosen);
    expect(toSearchParams(DEFAULT_FILTERS).toString()).toBe('');
  });
});

describe('hasActiveFilters', () => {
  it.each<[string, Partial<CatalogueFilters>, boolean]>([
    ['nothing', {}, false],
    ['only a sort and a page', { sort: 'nombre', page: 3 }, false],
    ['a search', { query: 'x' }, true],
    ['a category', { categories: ['coffee'] }, true],
    ['a price range', { price: 'hasta-50000' }, true],
    ['in stock only', { inStockOnly: true }, true],
  ])('%s → %s', (_case, overrides, active) => {
    expect(hasActiveFilters(filters(overrides))).toBe(active);
  });
});

describe('applyFilters', () => {
  it('keeps the catalogue order by default, with what cannot be bought last', () => {
    expect(ids(applyFilters(CATALOGUE, filters()))).toEqual([
      'espresso',
      'grinder',
      'big-grinder',
      'beans',
    ]);
  });

  it('searches names and descriptions, ignoring case and accents', () => {
    expect(ids(applyFilters(CATALOGUE, filters({ query: 'CAFE' })))).toEqual(['espresso', 'beans']);
    expect(ids(applyFilters(CATALOGUE, filters({ query: 'conico' })))).toEqual(['grinder']);
    expect(ids(applyFilters(CATALOGUE, filters({ query: 'panela' })))).toEqual(['beans']);
  });

  it('requires every word of the search', () => {
    expect(ids(applyFilters(CATALOGUE, filters({ query: 'molino planas' })))).toEqual([
      'big-grinder',
    ]);
  });

  it('keeps any of the chosen categories', () => {
    expect(ids(applyFilters(CATALOGUE, filters({ categories: ['grinders', 'coffee'] })))).toEqual([
      'grinder',
      'big-grinder',
      'beans',
    ]);
  });

  it('filters by price band, in pesos, including the lower bound only', () => {
    expect(ids(applyFilters(CATALOGUE, filters({ price: 'hasta-50000' })))).toEqual([
      'grinder',
      'beans',
    ]);
    expect(ids(applyFilters(CATALOGUE, filters({ price: '50000-200000' })))).toEqual(['espresso']);
    expect(ids(applyFilters(CATALOGUE, filters({ price: 'desde-500000' })))).toEqual([
      'big-grinder',
    ]);
  });

  it('hides what cannot be bought when asked', () => {
    expect(ids(applyFilters(CATALOGUE, filters({ inStockOnly: true })))).not.toContain('beans');
  });

  it.each<[CatalogueFilters['sort'], string[]]>([
    ['precio-asc', ['beans', 'grinder', 'espresso', 'big-grinder']],
    ['precio-desc', ['big-grinder', 'espresso', 'grinder', 'beans']],
    ['nombre', ['beans', 'espresso', 'grinder', 'big-grinder']],
  ])('sorts by %s', (sort, expected) => {
    expect(ids(applyFilters(CATALOGUE, filters({ sort })))).toEqual(expected);
  });

  it('never changes the list it was given', () => {
    const before = ids(CATALOGUE);
    applyFilters(CATALOGUE, filters({ sort: 'precio-desc' }));
    expect(ids(CATALOGUE)).toEqual(before);
  });
});

describe('paginate', () => {
  const list = Array.from({ length: 18 }, (_, index) => index + 1);

  it('cuts a page and says where it is', () => {
    expect(paginate(list, 2)).toEqual({
      items: [9, 10, 11, 12, 13, 14, 15, 16],
      page: 2,
      pageCount: 3,
      total: 18,
      from: 9,
      to: 16,
    });
  });

  it('shows the last page for a page past the end', () => {
    expect(paginate(list, 9)).toMatchObject({ page: 3, items: [17, 18], from: 17, to: 18 });
  });

  it('has one empty page for an empty list', () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pageCount: 1, total: 0, from: 0, to: 0 });
  });
});

describe('pageItems', () => {
  it.each<[number, number, (number | 'gap')[]]>([
    [1, 3, [1, 2, 3]],
    [4, 7, [1, 2, 3, 4, 5, 6, 7]],
    [1, 10, [1, 2, 3, 4, 5, 'gap', 10]],
    [5, 10, [1, 'gap', 4, 5, 6, 'gap', 10]],
    [10, 10, [1, 'gap', 6, 7, 8, 9, 10]],
    [3, 10, [1, 2, 3, 4, 5, 'gap', 10]],
  ])('page %i of %i', (current, count, expected) => {
    expect(pageItems(current, count)).toEqual(expected);
  });
});
