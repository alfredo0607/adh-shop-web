import { adhShopApi, type ListProductsApiResponse } from './generated/adhShopApi';

/** Products per catalogue page. The API accepts up to 50. */
export const PRODUCT_PAGE_SIZE = 12;

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
          { type: 'Product' as const, id: createTransactionBody.productId },
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
       * The catalogue, page by page. `GET /products` pages with an opaque
       * cursor, which is exactly an infinite query's page parameter: RTK Query
       * keeps the pages together and knows whether there is a next one.
       */
      listProductPages: build.infiniteQuery<ListProductsApiResponse, void, string | null>({
        infiniteQueryOptions: {
          initialPageParam: null,
          getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        },
        query: ({ pageParam }) => ({
          url: '/api/v1/products',
          params: {
            limit: PRODUCT_PAGE_SIZE,
            ...(pageParam === null ? {} : { cursor: pageParam }),
          },
        }),
        providesTags: (result) => [
          { type: 'Product' as const, id: 'LIST' },
          ...(result?.pages.flatMap((page) =>
            page.items.map((product) => ({ type: 'Product' as const, id: product.id })),
          ) ?? []),
        ],
      }),
    }),
  });

export const { useListProductPagesInfiniteQuery } = api;

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
