import { ShoppingBag } from 'lucide-react';
import type { ReactNode } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { dismissed } from '@/app/notifications/notificationsSlice';
import { t } from '@/shared/copy/es-CO';

import styles from './CartButton.module.css';
import { cartOpened, selectCartCount } from './cartSlice';

/** The header's cart: opens the panel and shows how many units it holds. */
export const CartButton = ({ className }: { className?: string }): ReactNode => {
  const dispatch = useAppDispatch();
  const count = useAppSelector(selectCartCount);

  const label =
    count === 0
      ? t('cart.open')
      : count === 1
        ? t('cart.openWithOne')
        : t('cart.openWithCount', { count });

  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(' ')}
      aria-label={label}
      onClick={() => {
        // The panel shows what was added; the notice would only cover its buttons.
        dispatch(dismissed('cart-added'));
        dispatch(cartOpened());
      }}
    >
      <ShoppingBag aria-hidden />
      {count === 0 ? null : (
        // The number is in the label already; this is its visual twin.
        <span className={styles.badge} aria-hidden>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
};
