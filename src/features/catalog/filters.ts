import type { ProductResponse } from '@/api';
import type { PageItem } from '@/shared/ui/Pagination/Pagination';

import { stockLevel } from './stock';

/**
 * The catalogue's filters, sorting and pagination, as pure functions over the
 * URL. The URL is the state: a filtered page can be shared, reloaded and
 * reached again with the back button, and there is nothing to keep in sync.
 *
 * Parameter names and values are Spanish, because buyers see them in the
 * address bar. The category slugs map to the API's stable codes here.
 */

export type Category = NonNullable<ProductResponse['category']>;

export const CATEGORY_SLUGS: Readonly<Record<Category, string>> = {
  'coffee-makers': 'cafeteras',
  grinders: 'molinos',
  brewing: 'metodos',
  accessories: 'accesorios',
  coffee: 'cafe',
};

export const CATEGORIES = Object.keys(CATEGORY_SLUGS) as Category[];

const categoryFromSlug = (slug: string): Category | undefined =>
  CATEGORIES.find((category) => CATEGORY_SLUGS[category] === slug);

/** Price bands in whole pesos, `[from, to)`. `null` is open-ended. */
export const PRICE_RANGES = {
  'hasta-50000': [0, 50_000],
  '50000-200000': [50_000, 200_000],
  '200000-500000': [200_000, 500_000],
  'desde-500000': [500_000, null],
} as const satisfies Record<string, readonly [number, number | null]>;

export type PriceRange = keyof typeof PRICE_RANGES;

const isPriceRange = (value: string): value is PriceRange => value in PRICE_RANGES;

export const SORTS = ['relevancia', 'precio-asc', 'precio-desc', 'nombre'] as const;

export type Sort = (typeof SORTS)[number];

const isSort = (value: string): value is Sort => (SORTS as readonly string[]).includes(value);

/** Products per page. Eight fills two rows of four on a desktop. */
export const PAGE_SIZE = 8;

export interface CatalogueFilters {
  readonly query: string;
  readonly categories: readonly Category[];
  readonly price: PriceRange | null;
  readonly inStockOnly: boolean;
  readonly sort: Sort;
  readonly page: number;
}

export const DEFAULT_FILTERS: CatalogueFilters = {
  query: '',
  categories: [],
  price: null,
  inStockOnly: false,
  sort: 'relevancia',
  page: 1,
};

const PARAM = {
  query: 'q',
  category: 'categoria',
  price: 'precio',
  inStock: 'disponibles',
  sort: 'orden',
  page: 'pagina',
} as const;

/** Longest search text kept from the URL. */
const MAX_QUERY_LENGTH = 80;

/**
 * Reads the filters from the address bar. Anything unrecognised is ignored
 * rather than rejected: a hand-edited or outdated link still opens the
 * catalogue, just less filtered.
 */
export const parseFilters = (params: URLSearchParams): CatalogueFilters => {
  const categories = params
    .getAll(PARAM.category)
    .map(categoryFromSlug)
    .filter((category): category is Category => category !== undefined);
  const price = params.get(PARAM.price) ?? '';
  const sort = params.get(PARAM.sort) ?? '';
  const page = Number(params.get(PARAM.page));

  return {
    query: (params.get(PARAM.query) ?? '').trim().slice(0, MAX_QUERY_LENGTH),
    categories: [...new Set(categories)],
    price: isPriceRange(price) ? price : null,
    inStockOnly: params.get(PARAM.inStock) === '1',
    sort: isSort(sort) ? sort : 'relevancia',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
};

/** The address-bar form of some filters. Defaults are left out, to keep links short. */
export const toSearchParams = (filters: CatalogueFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.query !== '') params.set(PARAM.query, filters.query);
  for (const category of filters.categories) {
    params.append(PARAM.category, CATEGORY_SLUGS[category]);
  }
  if (filters.price !== null) params.set(PARAM.price, filters.price);
  if (filters.inStockOnly) params.set(PARAM.inStock, '1');
  if (filters.sort !== 'relevancia') params.set(PARAM.sort, filters.sort);
  if (filters.page > 1) params.set(PARAM.page, String(filters.page));
  return params;
};

/** True when anything narrows the catalogue; sorting and the page do not. */
export const hasActiveFilters = (filters: CatalogueFilters): boolean =>
  filters.query !== '' ||
  filters.categories.length > 0 ||
  filters.price !== null ||
  filters.inStockOnly;

/** Lower case, without accents: "cafe" finds "Café", "molino" finds "Molino". */
const normalise = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const inPriceRange = (priceInCents: number, range: PriceRange): boolean => {
  const [from, to] = PRICE_RANGES[range];
  const pesos = priceInCents / 100;
  return pesos >= from && (to === null || pesos < to);
};

const COLLATOR = new Intl.Collator('es-CO', { sensitivity: 'base' });

const SORTERS: Readonly<Record<Sort, (a: ProductResponse, b: ProductResponse) => number>> = {
  // The catalogue's own order, with what cannot be bought moved to the end.
  relevancia: (a, b) => Number(stockLevel(a) === 'soldOut') - Number(stockLevel(b) === 'soldOut'),
  'precio-asc': (a, b) => a.priceInCents - b.priceInCents,
  'precio-desc': (a, b) => b.priceInCents - a.priceInCents,
  nombre: (a, b) => COLLATOR.compare(a.name, b.name),
};

/** Narrows and orders the catalogue. The page is applied separately, by `paginate`. */
export const applyFilters = (
  products: readonly ProductResponse[],
  filters: CatalogueFilters,
): ProductResponse[] => {
  const words = normalise(filters.query).split(/\s+/).filter(Boolean);

  return products
    .filter((product) => {
      if (filters.categories.length > 0) {
        if (product.category === undefined || !filters.categories.includes(product.category)) {
          return false;
        }
      }
      if (filters.price !== null && !inPriceRange(product.priceInCents, filters.price)) {
        return false;
      }
      if (filters.inStockOnly && stockLevel(product) === 'soldOut') {
        return false;
      }
      if (words.length > 0) {
        const haystack = normalise(`${product.name} ${product.description}`);
        return words.every((word) => haystack.includes(word));
      }
      return true;
    })
    .sort(SORTERS[filters.sort]);
};

export interface Page<T> {
  readonly items: readonly T[];
  /** The page shown, which may be lower than the one asked for. */
  readonly page: number;
  readonly pageCount: number;
  readonly total: number;
  /** 1-based positions of the first and last item shown; 0 when there are none. */
  readonly from: number;
  readonly to: number;
}

/**
 * One page of a list. A page past the end shows the last one, so a link that
 * outlived a narrower filter still lands on products.
 */
export const paginate = <T>(list: readonly T[], page: number, size = PAGE_SIZE): Page<T> => {
  const pageCount = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * size;
  const items = list.slice(start, start + size);

  return {
    items,
    page: current,
    pageCount,
    total: list.length,
    from: items.length === 0 ? 0 : start + 1,
    to: start + items.length,
  };
};

/**
 * The page numbers to show: always the first and the last, the current one
 * with a neighbour on each side, and a gap for whatever is skipped. Seven
 * slots at most, so the control fits a 320 px screen.
 */
export const pageItems = (current: number, pageCount: number): PageItem[] => {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const start = Math.max(2, Math.min(current - 1, pageCount - 4));
  const end = Math.min(pageCount - 1, Math.max(current + 1, 5));
  const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return [
    1,
    ...(start > 2 ? (['gap'] as const) : []),
    ...middle,
    ...(end < pageCount - 1 ? (['gap'] as const) : []),
    pageCount,
  ];
};
