import type { ProductResponse } from '@/api';
import { maxSelectableUnits } from '@/features/catalog/stock';
import type { OrderItem } from '@/shared/lib/order';

export interface CartRow {
  readonly productId: string;
  /** Undefined when the product is no longer in the catalogue. */
  readonly product: ProductResponse | undefined;
  /** The units that can actually be bought: what was chosen, up to what is in stock. */
  readonly units: number;
  readonly maxUnits: number;
  readonly available: boolean;
  readonly lineTotalInCents: number;
}

export interface CartView {
  readonly rows: readonly CartRow[];
  /** The sum of the lines that can be bought, before fees. */
  readonly subtotalInCents: number;
  readonly currency: string;
  /** What "Ir a pagar" sends to the checkout: the buyable lines, at buyable units. */
  readonly checkoutItems: OrderItem[];
  readonly hasUnavailable: boolean;
}

/**
 * The cart as the buyer should see it now: each line with today's price and
 * stock. The cart itself stores only ids and units, so a price change or a
 * product selling out shows here instead of surprising the buyer at the end.
 */
export const viewCart = (
  lines: readonly OrderItem[],
  products: readonly ProductResponse[],
): CartView => {
  const byId = new Map(products.map((product) => [product.id, product]));

  const rows = lines.map((line): CartRow => {
    const product = byId.get(line.productId);
    const maxUnits = product === undefined ? 0 : maxSelectableUnits(product);
    const units = Math.min(line.units, maxUnits);
    const available = units > 0;

    return {
      productId: line.productId,
      product,
      units: available ? units : line.units,
      maxUnits,
      available,
      lineTotalInCents: available && product !== undefined ? product.priceInCents * units : 0,
    };
  });

  return {
    rows,
    subtotalInCents: rows.reduce((sum, row) => sum + row.lineTotalInCents, 0),
    currency: products[0]?.currency ?? 'COP',
    checkoutItems: rows
      .filter((row) => row.available)
      .map((row) => ({ productId: row.productId, units: row.units })),
    hasUnavailable: rows.some((row) => !row.available),
  };
};
