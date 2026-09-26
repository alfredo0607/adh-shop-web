import { RefreshCw, ShoppingBag, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';

import { useListCatalogueQuery } from '@/api';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { productPath } from '@/features/catalog/paths';
import { ProductImage } from '@/features/catalog/ProductImage';
import { orderStarted } from '@/features/checkout/checkoutSlice';
import { t } from '@/shared/copy/es-CO';
import { formatMoney } from '@/shared/lib/money';
import { Button } from '@/shared/ui/Button/Button';
import { Drawer } from '@/shared/ui/Drawer/Drawer';
import { Money } from '@/shared/ui/Money/Money';
import { Stepper } from '@/shared/ui/Stepper/Stepper';

import styles from './CartPanel.module.css';
import { cartClosed, itemRemoved, selectCartIsOpen, selectCartLines, unitsSet } from './cartSlice';
import { viewCart, type CartRow } from './cartView';

/** The cart's side panel, opened from the header or after adding a product. */
export const CartPanel = (): ReactNode => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isOpen = useAppSelector(selectCartIsOpen);
  const lines = useAppSelector(selectCartLines);
  // Only asked for while the panel is open; the catalogue is usually cached already.
  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useListCatalogueQuery(undefined, { skip: !isOpen });
  const cart = viewCart(lines, products ?? []);
  // Without the catalogue nothing is known about the lines: saying they are
  // unavailable would ask the buyer to empty a cart that may be fine.
  const failed = products === undefined && isError;

  const close = (): void => {
    dispatch(cartClosed());
  };

  const checkout = (): void => {
    dispatch(orderStarted({ items: cart.checkoutItems, source: 'cart' }));
    close();
    void navigate('/checkout');
  };

  const empty = lines.length === 0;

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={t('cart.title')}
      closeLabel={t('cart.close')}
      footer={
        empty || isLoading || failed ? undefined : (
          <>
            <p className={styles.subtotal}>
              <span>{t('cart.subtotal')}</span>
              <Money cents={cart.subtotalInCents} currency={cart.currency} />
            </p>
            <p className={styles.note}>
              {cart.hasUnavailable ? t('cart.unavailableNote') : t('cart.feesNote')}
            </p>
            <Button onClick={checkout} disabled={cart.hasUnavailable}>
              {t('cart.checkout')}
            </Button>
            <Button variant="secondary" onClick={close}>
              {t('cart.keepShopping')}
            </Button>
          </>
        )
      }
    >
      {empty ? (
        <div className={styles.empty}>
          <ShoppingBag aria-hidden className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>{t('cart.empty')}</p>
          <p>{t('cart.emptyHint')}</p>
          <Link to="/" className={styles.browse} onClick={close}>
            {t('cart.browse')}
          </Link>
        </div>
      ) : isLoading ? (
        <p role="status">{t('cart.loading')}</p>
      ) : failed ? (
        <div className={styles.problem} role="alert">
          <p>{t('cart.loadError')}</p>
          <Button variant="secondary" onClick={() => void refetch()}>
            <RefreshCw aria-hidden className={styles.retryIcon} />
            {t('catalog.retry')}
          </Button>
        </div>
      ) : (
        <ul className={styles.lines}>
          {cart.rows.map((row) => (
            <CartLine
              key={row.productId}
              row={row}
              onUnits={(units) => dispatch(unitsSet({ productId: row.productId, units }))}
              onRemove={() => dispatch(itemRemoved(row.productId))}
              onNavigate={close}
            />
          ))}
        </ul>
      )}
    </Drawer>
  );
};

const CartLine = ({
  row,
  onUnits,
  onRemove,
  onNavigate,
}: {
  row: CartRow;
  onUnits: (units: number) => void;
  onRemove: () => void;
  onNavigate: () => void;
}): ReactNode => {
  const { product } = row;
  const name = product?.name ?? row.productId;

  return (
    <li className={styles.line}>
      {product === undefined ? (
        <div className={styles.thumb} />
      ) : (
        <ProductImage src={product.imageUrl} alt="" className={styles.thumb} compact />
      )}
      <div className={styles.details}>
        {product === undefined ? (
          <p className={styles.name}>{name}</p>
        ) : (
          <Link to={productPath(product.id)} className={styles.name} onClick={onNavigate}>
            {name}
          </Link>
        )}
        {row.available && product !== undefined ? (
          <>
            <p className={styles.unitPrice}>
              {t('cart.unitPrice', { price: formatMoney(product.priceInCents, product.currency) })}
            </p>
            <div className={styles.controls}>
              <Stepper
                label={t('cart.units', { name })}
                value={row.units}
                min={1}
                max={row.maxUnits}
                onChange={onUnits}
                decreaseLabel={t('product.decrease')}
                increaseLabel={t('product.increase')}
                hideLabel
              />
              <Money
                className={styles.lineTotal}
                cents={row.lineTotalInCents}
                currency={product.currency}
              />
            </div>
          </>
        ) : (
          <p className={styles.unavailable}>{t('cart.unavailable')}</p>
        )}
      </div>
      <button
        type="button"
        className={styles.remove}
        aria-label={t('cart.remove', { name })}
        onClick={onRemove}
      >
        <Trash2 aria-hidden />
      </button>
    </li>
  );
};
