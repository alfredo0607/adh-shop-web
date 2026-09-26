import { CreditCard, MapPin, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router';

import { useQuoteOrderQuery } from '@/api';
import { useAppSelector } from '@/app/hooks';
import { t } from '@/shared/copy/es-CO';
import { toQuoteItems } from '@/shared/lib/order';
import { Button } from '@/shared/ui/Button/Button';
import { Money } from '@/shared/ui/Money/Money';

import { selectCheckout } from './checkoutSlice';
import styles from './OrderSummary.module.css';
import { useCheckoutSession } from './session';

const BRAND_NAMES = { visa: 'VISA', mastercard: 'Mastercard' } as const;

/**
 * Route `/checkout/resumen`: what the buyer will pay, priced by the API, with
 * the delivery details and the card they chose. Without a card in the session
 * (a reload, a direct visit) the buyer goes back to the form: card data is
 * never stored, so it cannot be restored.
 */
export const OrderSummary = (): ReactNode => {
  const { items, delivery } = useAppSelector(selectCheckout);
  const { card } = useCheckoutSession();
  const {
    data: quote,
    isError,
    refetch,
  } = useQuoteOrderQuery(
    { items: toQuoteItems(items) },
    { skip: card === null || delivery === null },
  );

  if (card === null || delivery === null) {
    return <Navigate to="/checkout" replace />;
  }

  return (
    <section className={styles.summary} aria-labelledby="summary-title">
      <h2 id="summary-title" className={styles.title}>
        {t('checkout.summary.title')}
      </h2>

      {quote === undefined ? (
        isError ? (
          <div className={styles.problem} role="alert">
            <p>{t('checkout.summary.quoteError')}</p>
            <Button variant="secondary" onClick={() => void refetch()}>
              <RefreshCw aria-hidden className={styles.icon} />
              {t('catalog.retry')}
            </Button>
          </div>
        ) : (
          <p role="status" className={styles.muted}>
            {t('checkout.summary.loading')}
          </p>
        )
      ) : (
        <dl className={styles.amounts}>
          <div>
            <dt>{t('checkout.summary.products')}</dt>
            <dd>
              <Money cents={quote.amounts.productInCents} currency={quote.amounts.currency} />
            </dd>
          </div>
          <div>
            <dt>{t('checkout.summary.baseFee')}</dt>
            <dd>
              <Money cents={quote.amounts.baseFeeInCents} currency={quote.amounts.currency} />
            </dd>
          </div>
          <div>
            <dt>{t('checkout.summary.deliveryFee')}</dt>
            <dd>
              <Money cents={quote.amounts.deliveryFeeInCents} currency={quote.amounts.currency} />
            </dd>
          </div>
          <div className={styles.total}>
            <dt>{t('checkout.summary.total')}</dt>
            <dd>
              <Money cents={quote.amounts.totalInCents} currency={quote.amounts.currency} />
            </dd>
          </div>
        </dl>
      )}

      <div className={styles.details}>
        <div className={styles.detail}>
          <MapPin aria-hidden className={styles.icon} />
          <div>
            <p className={styles.label}>{t('checkout.summary.deliverTo')}</p>
            <p>{delivery.fullName}</p>
            <p className={styles.muted}>
              {[delivery.addressLine1, delivery.addressLine2, delivery.city, delivery.region]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        </div>
        <div className={styles.detail}>
          <CreditCard aria-hidden className={styles.icon} />
          <div>
            <p className={styles.label}>{t('checkout.summary.payWith')}</p>
            <p>
              {t('checkout.summary.cardEnding', {
                brand: BRAND_NAMES[card.brand],
                lastFour: card.lastFour,
              })}
            </p>
            <p className={styles.muted}>
              {card.installments === 1
                ? t('checkout.installmentsOne')
                : t('checkout.installmentsMany', { count: card.installments })}
            </p>
          </div>
        </div>
      </div>

      <Link to="/checkout" className={styles.edit}>
        {t('checkout.summary.edit')}
      </Link>
    </section>
  );
};
