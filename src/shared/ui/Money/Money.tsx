import type { ReactNode } from 'react';

import { formatMoney } from '@/shared/lib/money';

export interface MoneyProps {
  /** Integer minor units, as the API sends them. */
  cents: number;
  currency?: string;
  className?: string;
}

/** An amount of money, formatted for Colombia. The machine-readable value rides along. */
export const Money = ({ cents, currency = 'COP', className }: MoneyProps): ReactNode => (
  <data className={className} value={cents / 100}>
    {formatMoney(cents, currency)}
  </data>
);
