/**
 * An order as the API takes it: a list of products, each with its units. The
 * cart, the product page's "buy now" and the checkout all speak this shape.
 */
export interface OrderItem {
  productId: string;
  units: number;
}

/** The most units of one product an order may hold. The API enforces the same limit. */
export const MAX_UNITS_PER_ORDER = 10;

/** The most distinct products an order may hold. The API enforces the same limit. */
export const MAX_ITEMS_PER_ORDER = 10;

const PRODUCT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Validates a list of items read back from storage, which is untrusted input:
 * one entry per product, whole units within the limits, ids the API accepts.
 */
export const isOrderItemList = (value: unknown): value is OrderItem[] => {
  if (!Array.isArray(value) || value.length > MAX_ITEMS_PER_ORDER) return false;

  const ids = new Set<string>();
  return value.every((item: unknown) => {
    if (typeof item !== 'object' || item === null) return false;
    const { productId, units } = item as Record<string, unknown>;
    const valid =
      typeof productId === 'string' &&
      PRODUCT_ID.test(productId) &&
      !ids.has(productId) &&
      typeof units === 'number' &&
      Number.isInteger(units) &&
      units >= 1 &&
      units <= MAX_UNITS_PER_ORDER;
    if (valid) ids.add(productId);
    return valid;
  });
};

/** The `items` query parameter of `GET /quotes`: `prod-a:1,prod-b:2`. */
export const toQuoteItems = (items: readonly OrderItem[]): string =>
  items.map(({ productId, units }) => `${productId}:${units}`).join(',');
