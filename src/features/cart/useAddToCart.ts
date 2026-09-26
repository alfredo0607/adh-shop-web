import { useStore } from 'react-redux';

import type { ProductResponse } from '@/api';
import { useAppDispatch } from '@/app/hooks';
import { notified } from '@/app/notifications/notificationsSlice';
import type { RootState } from '@/app/store';
import { t } from '@/shared/copy/es-CO';
import { MAX_ITEMS_PER_ORDER } from '@/shared/lib/order';

import { cartOpened, itemAdded, selectCanAdd } from './cartSlice';

export type AddToCart = (
  product: Pick<ProductResponse, 'id' | 'name'>,
  units: number,
  after: 'open-cart' | 'notify',
) => void;

/**
 * Adds a product to the cart and tells the buyer: by opening the cart, from a
 * product page, or with a short notice, from the catalogue where the buyer is
 * still browsing. A cart that already holds the most products an order can
 * take says so instead of silently dropping the new one.
 */
export const useAddToCart = (): AddToCart => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();

  return (product, units, after) => {
    if (!selectCanAdd(product.id)(store.getState())) {
      dispatch(
        notified({
          id: 'cart-full',
          tone: 'info',
          message: t('cart.full', { max: MAX_ITEMS_PER_ORDER }),
        }),
      );
      return;
    }

    dispatch(itemAdded({ productId: product.id, units }));
    if (after === 'open-cart') {
      dispatch(cartOpened());
    } else {
      dispatch(
        notified({
          id: 'cart-added',
          tone: 'info',
          message: t('cart.added', { name: product.name }),
        }),
      );
    }
  };
};
