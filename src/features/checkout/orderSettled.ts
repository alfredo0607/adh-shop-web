import { api, type TransactionResponse } from '@/api';
import type { AppDispatch, RootState } from '@/app/store';
import { cartCleared } from '@/features/cart/cartSlice';

import { orderClosed, type OrderSource } from './checkoutSlice';

/**
 * Closes the order in the store once the payment has a final outcome.
 *
 * - An approved order placed from the cart empties the cart; a declined one
 *   leaves it, so the buyer can try again.
 * - The checkout is reset, delivery details included: personal data is kept
 *   only while the order it belongs to is open.
 * - The products' stock is marked stale, so the store shows what is left.
 *
 * Only for the order this browser placed: a status page opened from a shared
 * link must not reset someone's cart. Returns the order's source, for a retry.
 */
export const orderSettled =
  (transaction: TransactionResponse) =>
  (dispatch: AppDispatch, getState: () => RootState): OrderSource | null => {
    const { transactionId, source } = getState().checkout;
    if (transactionId !== transaction.id || transaction.status === 'PENDING') return null;

    if (transaction.status === 'APPROVED' && source === 'cart') {
      dispatch(cartCleared());
    }
    dispatch(orderClosed());
    dispatch(
      api.util.invalidateTags([
        { type: 'Product', id: 'LIST' },
        ...transaction.items.map((item) => ({ type: 'Product' as const, id: item.productId })),
      ]),
    );
    return source;
  };
