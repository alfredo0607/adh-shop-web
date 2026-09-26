import type { ReactNode } from 'react';
import { Link } from 'react-router';

import type { ProductResponse } from '@/api';
import { Money } from '@/shared/ui/Money/Money';

import { productPath } from './paths';
import styles from './ProductCard.module.css';
import { ProductImage } from './ProductImage';
import { StockBadge } from './StockBadge';

/**
 * One product in the catalogue. The whole card is clickable, but only the name
 * is a link, so a screen reader hears each product once, by name.
 */
export const ProductCard = ({ product }: { product: ProductResponse }): ReactNode => (
  <article className={styles.card}>
    <ProductImage src={product.imageUrl} alt="" className={styles.image} />
    <div className={styles.body}>
      <h3 className={styles.name}>
        <Link to={productPath(product.id)} className={styles.link}>
          {product.name}
        </Link>
      </h3>
      <Money className={styles.price} cents={product.priceInCents} currency={product.currency} />
      <StockBadge product={product} />
    </div>
  </article>
);
