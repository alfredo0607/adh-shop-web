import { ArrowLeft, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useGetProductQuery, type ProductResponse } from '@/api';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { productChosen, selectCheckout } from '@/features/checkout/checkoutSlice';
import { t } from '@/shared/copy/es-CO';
import { isAppError } from '@/shared/errors/appError';
import { Button } from '@/shared/ui/Button/Button';
import { ErrorScreen } from '@/shared/ui/ErrorScreen/ErrorScreen';
import { Money } from '@/shared/ui/Money/Money';
import { PaymentMethods } from '@/shared/ui/PaymentMethods/PaymentMethods';
import { Stepper } from '@/shared/ui/Stepper/Stepper';

import { CATEGORY_SLUGS } from './filters';
import styles from './ProductPage.module.css';
import { ProductImage } from './ProductImage';
import { MAX_UNITS_PER_ORDER, maxSelectableUnits, stockLevel } from './stock';
import { StockBadge } from './StockBadge';

/**
 * Route `/products/:id`. Stock is refetched every time the page opens, so a
 * buyer coming back from a purchase sees what is left, not a cached count.
 */
export const ProductPage = (): ReactNode => {
  const { id = '' } = useParams();
  const { data, error, isLoading, refetch } = useGetProductQuery(
    { id },
    { refetchOnMountOrArgChange: true },
  );

  if (isLoading) {
    return (
      <div className={styles.loading} aria-busy>
        <p className="visually-hidden" role="status">
          {t('product.loading')}
        </p>
        <div className={styles.skeletonImage} />
        <div className={styles.skeletonText} />
      </div>
    );
  }

  if (data === undefined) {
    // A 4xx means there is no such product (unknown or malformed id). Anything
    // else is a failure the global listener has already announced.
    const missing = isAppError(error) && error.kind === 'api' && error.status < 500;

    return missing ? (
      <ErrorScreen title={t('product.notFoundTitle')} body={t('errors.api.productNotFound')}>
        <Link to="/">{t('product.back')}</Link>
      </ErrorScreen>
    ) : (
      <ErrorScreen title={t('product.loadError')} body={t('errors.api.generic')}>
        <Button variant="secondary" onClick={() => void refetch()}>
          <RefreshCw aria-hidden className={styles.icon} />
          {t('catalog.retry')}
        </Button>
        <Link to="/">{t('product.back')}</Link>
      </ErrorScreen>
    );
  }

  return <ProductDetails key={data.id} product={data} />;
};

const ProductDetails = ({ product }: { product: ProductResponse }): ReactNode => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const saved = useAppSelector(selectCheckout);

  const soldOut = stockLevel(product) === 'soldOut';
  const max = maxSelectableUnits(product);
  // Coming back to the product of an order in progress keeps the units chosen.
  const [chosen, setChosen] = useState(() => (saved.productId === product.id ? saved.units : 1));
  // Stock can drop between visits; never offer more than there is.
  const units = Math.max(1, Math.min(chosen, max));

  const pay = (): void => {
    dispatch(productChosen({ productId: product.id, units }));
    void navigate('checkout');
  };

  return (
    <article className={styles.product}>
      <title>{`${product.name} · ${t('brand.name')}`}</title>

      <Link to="/" className={styles.back}>
        <ArrowLeft aria-hidden className={styles.icon} />
        {t('product.back')}
      </Link>

      <div className={styles.layout}>
        <ProductImage src={product.imageUrl} alt={product.name} priority />

        <div className={styles.info}>
          {product.category === undefined ? null : (
            <Link
              to={`/?categoria=${CATEGORY_SLUGS[product.category]}`}
              className={styles.category}
            >
              {t(`categories.${product.category}`)}
            </Link>
          )}
          <h1 className={styles.name}>{product.name}</h1>
          <Money
            className={styles.price}
            cents={product.priceInCents}
            currency={product.currency}
          />
          <StockBadge product={product} />
          <p className={styles.description}>{product.description}</p>

          {soldOut ? (
            <p className={styles.soldOut} role="status">
              {t('product.soldOut')}
            </p>
          ) : (
            <Stepper
              label={t('product.unitsLabel')}
              value={units}
              min={1}
              max={max}
              onChange={setChosen}
              decreaseLabel={t('product.decrease')}
              increaseLabel={t('product.increase')}
              hint={
                max < MAX_UNITS_PER_ORDER
                  ? t('product.maxInStock', { max })
                  : t('product.maxPerOrder', { max })
              }
            />
          )}

          <div className={soldOut ? styles.actions : `${styles.actions} ${styles.pinned}`}>
            {soldOut ? null : (
              <p className={styles.subtotal}>
                <span>{t('product.subtotal')}</span>
                <Money cents={product.priceInCents * units} currency={product.currency} />
              </p>
            )}
            <Button className={styles.pay} disabled={soldOut} onClick={pay}>
              <CreditCard aria-hidden className={styles.icon} />
              {t('product.pay')}
            </Button>
            <p className={styles.note}>{t('product.feesNote')}</p>
          </div>

          <div className={styles.payments}>
            <p className={styles.secure}>
              <ShieldCheck aria-hidden className={styles.icon} />
              {t('product.secure')}
            </p>
            <PaymentMethods />
          </div>
        </div>
      </div>
    </article>
  );
};
