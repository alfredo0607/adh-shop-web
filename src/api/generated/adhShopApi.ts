import { emptyApi as api } from '../emptyApi';
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listProducts: build.query<ListProductsApiResponse, ListProductsApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/products`,
        params: {
          limit: queryArg.limit,
          cursor: queryArg.cursor,
        },
      }),
    }),
    getProduct: build.query<GetProductApiResponse, GetProductApiArg>({
      query: (queryArg) => ({ url: `/api/v1/products/${queryArg.id}` }),
    }),
    quoteOrder: build.query<QuoteOrderApiResponse, QuoteOrderApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/quotes`,
        params: {
          productId: queryArg.productId,
          units: queryArg.units,
        },
      }),
    }),
    createTransaction: build.mutation<CreateTransactionApiResponse, CreateTransactionApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/transactions`,
        method: 'POST',
        body: queryArg.createTransactionBody,
      }),
    }),
    getTransaction: build.query<GetTransactionApiResponse, GetTransactionApiArg>({
      query: (queryArg) => ({ url: `/api/v1/transactions/${queryArg.id}` }),
    }),
    getTransactionDelivery: build.query<
      GetTransactionDeliveryApiResponse,
      GetTransactionDeliveryApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/transactions/${queryArg.id}/delivery`,
      }),
    }),
    getPaymentTerms: build.query<GetPaymentTermsApiResponse, GetPaymentTermsApiArg>({
      query: () => ({ url: `/api/v1/payment-terms` }),
    }),
    payTransaction: build.mutation<PayTransactionApiResponse, PayTransactionApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/transactions/${queryArg.id}/payment`,
        method: 'POST',
        body: queryArg.payTransactionBody,
        headers: {
          'Idempotency-Key': queryArg['Idempotency-Key'],
        },
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as adhShopApi };
export type ListProductsApiResponse = /** status 200  */ ProductPageResponse;
export type ListProductsApiArg = {
  limit?: number;
  /** Opaque cursor from the previous page */
  cursor?: string;
};
export type GetProductApiResponse = /** status 200  */ ProductResponse;
export type GetProductApiArg = {
  id: string;
};
export type QuoteOrderApiResponse = /** status 200  */ QuoteResponse;
export type QuoteOrderApiArg = {
  productId: string;
  units: number;
};
export type CreateTransactionApiResponse = /** status 201  */ TransactionResponse;
export type CreateTransactionApiArg = {
  createTransactionBody: CreateTransactionBody;
};
export type GetTransactionApiResponse = /** status 200  */ TransactionResponse;
export type GetTransactionApiArg = {
  id: string;
};
export type GetTransactionDeliveryApiResponse = /** status 200  */ DeliveryResponse;
export type GetTransactionDeliveryApiArg = {
  id: string;
};
export type GetPaymentTermsApiResponse = /** status 200  */ PaymentTermsResponse;
export type GetPaymentTermsApiArg = void;
export type PayTransactionApiResponse = /** status 202  */ TransactionResponse;
export type PayTransactionApiArg = {
  id: string;
  /** A new UUID per payment attempt. A retry with the same key returns the original response instead of charging again. */
  'Idempotency-Key': string;
  payTransactionBody: PayTransactionBody;
};
export type ProductResponse = {
  id: string;
  name: string;
  description: string;
  /** Integer minor units, never a decimal */
  priceInCents: number;
  currency: string;
  /** Signed and short-lived. Load it as returned; do not store it. */
  imageUrl: string;
  /** Units a customer can buy right now */
  availableUnits: number;
  isPurchasable: boolean;
};
export type ProductPageResponse = {
  items: ProductResponse[];
  /** Pass back as ?cursor= to read the next page. Null when there is no more. */
  nextCursor: object | null;
};
export type AmountsResponse = {
  productInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalInCents: number;
  currency: string;
};
export type QuoteResponse = {
  productId: string;
  units: number;
  unitPriceInCents: number;
  amounts: AmountsResponse;
};
export type PurchasedProductResponse = {
  id: string;
  name: string;
  units: number;
  unitPriceInCents: number;
};
export type CustomerResponse = {
  fullName: string;
  /** Masked on purpose */
  email: string;
};
export type DeliveryAddressResponse = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
};
export type TransactionResponse = {
  id: string;
  reference: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'EXPIRED';
  /** Whether a payment was already sent for this transaction. After a refresh, the storefront uses it to wait for the outcome instead of asking for the card again. */
  paymentSubmitted: boolean;
  product: PurchasedProductResponse;
  amounts: AmountsResponse;
  customer: CustomerResponse;
  deliveryAddress: DeliveryAddressResponse;
  /** Unpaid past this moment, the reserved units return to stock */
  reservationExpiresAt: string;
  createdAt: string;
  updatedAt: string;
};
export type CustomerBody = {
  fullName: string;
  email: string;
  phone: string;
};
export type DeliveryAddressBody = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2. Only CO is served. */
  country: string;
};
export type CreateTransactionBody = {
  productId: string;
  units: number;
  /** The total shown to the buyer, from GET /quotes. The server recomputes it and answers 422 AMOUNT_MISMATCH if it no longer matches, so a buyer is never charged an amount they did not see. */
  expectedTotalInCents: number;
  customer: CustomerBody;
  deliveryAddress: DeliveryAddressBody;
};
export type DeliveryAddressView = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
};
export type DeliveryResponse = {
  transactionId: string;
  status: 'PREPARING' | 'SHIPPED' | 'DELIVERED';
  productId: string;
  productName: string;
  units: number;
  recipientName: string;
  /** Masked on purpose */
  recipientPhone: string;
  address: DeliveryAddressView;
  createdAt: string;
  estimatedDeliveryAt: string;
};
export type AcceptanceDocument = {
  token: string;
  /** The document the buyer must be shown and accept */
  documentUrl: string;
};
export type PaymentTermsResponse = {
  /** Public key for card tokenisation. Public by design. */
  publicKey: string;
  /** Where the storefront posts card data to obtain a token */
  cardTokenizationUrl: string;
  acceptance: AcceptanceDocument;
  personalDataAuthorization: AcceptanceDocument;
};
export type PayTransactionBody = {
  /** Card token issued by the payment gateway from the storefront */
  cardToken: string;
  installments: number;
  /** From GET /payment-terms, once the buyer accepts the terms */
  acceptanceToken: string;
  /** From GET /payment-terms, once the buyer authorises the use of personal data */
  personalDataAuthorizationToken: string;
};
export const {
  useListProductsQuery,
  useGetProductQuery,
  useQuoteOrderQuery,
  useCreateTransactionMutation,
  useGetTransactionQuery,
  useGetTransactionDeliveryQuery,
  useGetPaymentTermsQuery,
  usePayTransactionMutation,
} = injectedRtkApi;
