import type { ProductResponse } from '@/api';
import { t } from '@/shared/copy/es-CO';
import { MAX_UNITS_PER_ORDER } from '@/shared/lib/order';

export { MAX_UNITS_PER_ORDER };

/** At or below this, the buyer is told stock is running out. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = 'soldOut' | 'low' | 'available';

type Stock = Pick<ProductResponse, 'availableUnits' | 'isPurchasable'>;

export const stockLevel = ({ availableUnits, isPurchasable }: Stock): StockLevel => {
  if (!isPurchasable || availableUnits < 1) return 'soldOut';
  return availableUnits <= LOW_STOCK_THRESHOLD ? 'low' : 'available';
};

/** How many units the buyer may pick: what is in stock, up to the per-order limit. */
export const maxSelectableUnits = (product: Stock): number =>
  stockLevel(product) === 'soldOut' ? 0 : Math.min(product.availableUnits, MAX_UNITS_PER_ORDER);

export const stockLabel = (product: Stock): string => {
  switch (stockLevel(product)) {
    case 'soldOut':
      return t('stock.soldOut');
    case 'low':
      return product.availableUnits === 1
        ? t('stock.lastOne')
        : t('stock.low', { units: product.availableUnits });
    case 'available':
      return t('stock.available', { units: product.availableUnits });
  }
};
