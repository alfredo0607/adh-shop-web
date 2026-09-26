import { useState, type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router';

import { useListCatalogueQuery } from '@/api';
import { useAppSelector } from '@/app/hooks';
import { selectRehydrated } from '@/app/persistence';
import { viewCart } from '@/features/cart/cartView';
import { ProductImage } from '@/features/catalog/ProductImage';
import { t } from '@/shared/copy/es-CO';
import { Money } from '@/shared/ui/Money/Money';

import styles from './CheckoutLayout.module.css';
import { selectCheckout } from './checkoutSlice';
import type { CardInput } from './schemas/card';
import type { CheckoutSession } from './session';

/**
 * Route `/checkout`: the order being bought, with the form (index) or the
 * summary (`resumen`) over it. It owns the card for as long as the checkout
 * is open; see `session.ts`.
 */
export const CheckoutLayout = (): ReactNode => {
  const rehydrated = useAppSelector(selectRehydrated);
  const { items } = useAppSelector(selectCheckout);
  const [card, setCard] = useState<CardInput | null>(null);
  const { data: products } = useListCatalogueQuery();

  // Saved state is read asynchronously; deciding before it arrives would send
  // every buyer who reloads here back to the store.
  if (!rehydrated) {
    return (
      <p className={styles.status} role="status">
        {t('checkout.preparing')}
      </p>
    );
  }

  if (items.length === 0) {
    return <Navigate to="/" replace />;
  }

  const order = viewCart(items, products ?? []);
  const session: CheckoutSession = { card, setCard };

  return (
    <div className={styles.page}>
      <title>{`${t('checkout.title')} · ${t('brand.name')}`}</title>
      <section className={styles.order} aria-labelledby="order-title">
        <h1 id="order-title" className={styles.title}>
          {t('checkout.yourOrder')}
        </h1>
        <ul className={styles.lines}>
          {order.rows.map((row) => (
            <li key={row.productId} className={styles.line}>
              {row.product === undefined ? (
                <div className={styles.thumb} />
              ) : (
                <ProductImage src={row.product.imageUrl} alt="" className={styles.thumb} compact />
              )}
              <span className={styles.name}>
                {row.product?.name ?? row.productId}
                <span className={styles.units}>× {row.units}</span>
              </span>
              <Money cents={row.lineTotalInCents} currency={order.currency} />
            </li>
          ))}
        </ul>
      </section>
      <Outlet context={session} />
    </div>
  );
};
