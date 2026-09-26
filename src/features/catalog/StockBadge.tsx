import { Hourglass, PackageCheck, PackageX } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ProductResponse } from '@/api';

import { stockLabel, stockLevel } from './stock';
import styles from './StockBadge.module.css';

const ICONS = { soldOut: PackageX, low: Hourglass, available: PackageCheck } as const;

/** Stock as a word and an icon, never as colour alone. */
export const StockBadge = ({
  product,
}: {
  product: Pick<ProductResponse, 'availableUnits' | 'isPurchasable'>;
}): ReactNode => {
  const level = stockLevel(product);
  const Icon = ICONS[level];

  return (
    <p className={`${styles.badge} ${styles[level]}`}>
      <Icon aria-hidden className={styles.icon} />
      {stockLabel(product)}
    </p>
  );
};
