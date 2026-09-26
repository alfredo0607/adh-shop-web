import { Heart, ShoppingBag } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import type { ProductResponse } from '@/api';
import { useAppDispatch } from '@/app/hooks';
import { comingSoon } from '@/app/notifications/notificationsSlice';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { t } from '@/shared/copy/es-CO';
import { Money } from '@/shared/ui/Money/Money';

import { productPath } from './paths';
import styles from './ProductCard.module.css';
import { ProductImage } from './ProductImage';
import { stockLevel } from './stock';
import { StockBadge } from './StockBadge';

/**
 * One product in the catalogue. The whole card is clickable, but only the name
 * is a link, so a screen reader hears each product once, by name.
 */
export const ProductCard = ({ product }: { product: ProductResponse }): ReactNode => {
  const dispatch = useAppDispatch();
  const addToCart = useAddToCart();

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <ProductImage src={product.imageUrl} alt="" className={styles.image} />
        <button
          type="button"
          className={styles.favorite}
          aria-label={t('product.favorite', { name: product.name })}
          onClick={() => dispatch(comingSoon())}
        >
          <Heart aria-hidden />
        </button>
      </div>
      <div className={styles.body}>
        {product.category === undefined ? null : (
          <p className={styles.category}>{t(`categories.${product.category}`)}</p>
        )}
        <h3 className={styles.name}>
          <Link to={productPath(product.id)} className={styles.link}>
            {product.name}
          </Link>
        </h3>
        <Money className={styles.price} cents={product.priceInCents} currency={product.currency} />
        <div className={styles.footer}>
          <StockBadge product={product} />
          {stockLevel(product) === 'soldOut' ? null : (
            <button
              type="button"
              className={styles.add}
              aria-label={t('cart.addNamed', { name: product.name })}
              onClick={() => addToCart(product, 1, 'notify')}
            >
              <ShoppingBag aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
