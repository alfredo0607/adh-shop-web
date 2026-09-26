import type { ReactNode } from 'react';

import { t } from '@/shared/copy/es-CO';

import mastercard from './mastercard.svg';
import styles from './PaymentMethods.module.css';
import visa from './visa.svg';

const BRANDS = [
  { key: 'visa', src: visa, width: 42 },
  { key: 'mastercard', src: mastercard, width: 40 },
] as const;

/**
 * The card brands the store accepts, as their own marks. Local files, not a
 * CDN: they are on the payment path and must never fail to load.
 */
export const PaymentMethods = ({ className }: { className?: string }): ReactNode => (
  <ul
    className={[styles.list, className].filter(Boolean).join(' ')}
    aria-label={t('payments.title')}
  >
    {BRANDS.map(({ key, src, width }) => (
      <li key={key} className={styles.brand}>
        <img src={src} alt={t(`payments.${key}`)} width={width} height={32} />
      </li>
    ))}
  </ul>
);

/** One brand's mark, e.g. inside the card number field once the brand is known. */
export const CardBrandMark = ({ brand }: { brand: 'visa' | 'mastercard' }): ReactNode => {
  const { src, width } = BRANDS.find(({ key }) => key === brand)!;
  return (
    <img className={styles.mark} src={src} alt={t(`payments.${brand}`)} width={width} height={32} />
  );
};
