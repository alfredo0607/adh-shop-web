import {
  adhShopApi,
  type ListProductsApiResponse,
  type ProductResponse,
} from './generated/adhShopApi';

/** Products per request when reading the catalogue: the most the API accepts. */
export const CATALOGUE_PAGE_SIZE = 50;

/** A ceiling on requests per read, so a looping cursor can never spin forever. */
const MAX_CATALOGUE_PAGES = 10;

/**
 * The generated endpoints, plus the behaviour a document cannot describe: which
 * data depends on which, and how long it may be reused. Generated code is never
 * edited; this is where it is refined.
 */
export const api = adhShopApi
  .enhanceEndpoints({
    endpoints: {
      listProducts: {
        providesTags: (result) => [
          { type: 'Product' as const, id: 'LIST' },
          ...(result?.items.map((product) => ({ type: 'Product' as const, id: product.id })) ?? []),
        ],
      },
      getProduct: {
        providesTags: (_result, _error, { id }) => [{ type: 'Product' as const, id }],
      },
      // Prices and stock move. A quote is never reused between screens.
      quoteOrder: {
        keepUnusedDataFor: 0,
      },
      // Opening a transaction reserves units, so the product's stock is stale.
      createTransaction: {
        invalidatesTags: (_result, _error, { createTransactionBody }) => [
          ...createTransactionBody.items.map((item) => ({
            type: 'Product' as const,
            id: item.productId,
          })),
          { type: 'Product' as const, id: 'LIST' },
        ],
      },
      getTransaction: {
        providesTags: (_result, _error, { id }) => [{ type: 'Transaction' as const, id }],
      },
      payTransaction: {
        invalidatesTags: (_result, _error, { id }) => [{ type: 'Transaction' as const, id }],
      },
    },
  })
  .injectEndpoints({
    endpoints: (build) => ({
      /**
       * The whole catalogue, in one list. The storefront filters, sorts and
       * pages it in the browser, which is right for a catalogue this size: a
       * filter applied by DynamoDB to a cursor-paged query returns short or
       * empty pages. Underneath, `GET /products` is still read page by page
       * with its cursor, so nothing changes if the catalogue grows.
       */
      listCatalogue: build.query<ProductResponse[], void>({
        async queryFn(_arg, _api, _extraOptions, baseQuery) {
          const products: ProductResponse[] = [];
          let cursor: string | null = null;

          for (let page = 0; page < MAX_CATALOGUE_PAGES; page += 1) {
            const result = await baseQuery({
              url: '/api/v1/products',
              params: {
                limit: CATALOGUE_PAGE_SIZE,
                ...(cursor === null ? {} : { cursor }),
              },
            });
            if (result.error !== undefined) return { error: result.error };

            const body = result.data as ListProductsApiResponse;
            products.push(...body.items);
            cursor = body.nextCursor;
            if (cursor === null) break;
          }

          return { data: products };
        },
        providesTags: (result) => [
          { type: 'Product' as const, id: 'LIST' },
          ...(result?.map((product) => ({ type: 'Product' as const, id: product.id })) ?? []),
        ],
      }),
    }),
  });

export const { useListCatalogueQuery } = api;

export type EndpointName = keyof typeof api.endpoints;

/**
 * Endpoints whose failures are business outcomes the calling screen handles in
 * place: stock, totals, the payment and its status. The global error listener
 * leaves them alone, or the buyer would see the same error twice.
 * See docs/guide/errors.md.
 */
export const HANDLES_OWN_ERRORS: ReadonlySet<EndpointName> = new Set<EndpointName>([
  'quoteOrder',
  'createTransaction',
  'getTransaction',
  'payTransaction',
]);

export * from './generated/adhShopApi';
