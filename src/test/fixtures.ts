import type { ProductResponse, TransactionResponse } from '@/api';

export const aProduct = (overrides: Partial<ProductResponse> = {}): ProductResponse => ({
  id: 'prod-espresso-01',
  name: 'Cafetera espresso Artigiano',
  description: 'Cafetera espresso manual con tanque de 1,5 L.',
  priceInCents: 8_999_000,
  currency: 'COP',
  imageUrl: 'https://cdn.test/product/prod-espresso-01.webp?signed',
  availableUnits: 12,
  isPurchasable: true,
  ...overrides,
});

export const aTransaction = (
  overrides: Partial<TransactionResponse> = {},
): TransactionResponse => ({
  id: '6f1c2b9e-8f4a-4d7e-9a51-1b2c3d4e5f60',
  reference: '6f1c2b9e-8f4a-4d7e-9a51-1b2c3d4e5f60',
  status: 'PENDING',
  paymentSubmitted: false,
  product: {
    id: 'prod-espresso-01',
    name: 'Cafetera espresso Artigiano',
    units: 1,
    unitPriceInCents: 8_999_000,
  },
  amounts: {
    productInCents: 8_999_000,
    baseFeeInCents: 50_000,
    deliveryFeeInCents: 120_000,
    totalInCents: 9_169_000,
    currency: 'COP',
  },
  customer: { fullName: 'Laura Gómez', email: 'l***@example.com' },
  deliveryAddress: {
    addressLine1: 'Calle 93 # 11-26',
    city: 'Bogotá',
    region: 'Cundinamarca',
    country: 'CO',
  },
  reservationExpiresAt: '2026-09-25T18:15:00.000Z',
  createdAt: '2026-09-25T18:00:00.000Z',
  updatedAt: '2026-09-25T18:00:00.000Z',
  ...overrides,
});

/** The API's error envelope, as it answers every failure. */
export const apiError = (code: string, details?: Record<string, unknown>) => ({
  error: { code, message: 'Developer-facing message', ...(details ? { details } : {}) },
  requestId: 'req-123',
});
