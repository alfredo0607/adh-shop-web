import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { PRODUCT_PAGE_SIZE, useListProductPagesInfiniteQuery } from '@/api';
import { t } from '@/shared/copy/es-CO';
import { Button } from '@/shared/ui/Button/Button';

import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

const TITLE_ID = 'catalog-title';

/**
 * The catalogue. A failed request is announced by the global error listener;
 * this screen only has to offer a way forward when it has nothing to show.
 */
export const ProductGrid = (): ReactNode => {
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useListProductPagesInfiniteQuery();
  const products = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className={styles.section} aria-labelledby={TITLE_ID} aria-busy={isLoading}>
      <h2 id={TITLE_ID} className={styles.title}>
        {t('catalog.title')}
      </h2>

      {isLoading ? (
        <>
          <p className="visually-hidden" role="status">
            {t('catalog.loading')}
          </p>
          <ul className={styles.grid} aria-hidden>
            {Array.from({ length: Math.min(PRODUCT_PAGE_SIZE, 6) }, (_, index) => (
              <li key={index} className={styles.skeleton} />
            ))}
          </ul>
        </>
      ) : products.length === 0 ? (
        <div className={styles.empty}>
          <p>{isError ? t('catalog.loadError') : t('catalog.empty')}</p>
          {isError ? (
            <Button variant="secondary" onClick={() => void refetch()}>
              <RefreshCw aria-hidden className={styles.icon} />
              {t('catalog.retry')}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className={styles.grid} aria-labelledby={TITLE_ID}>
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
          {hasNextPage ? (
            <div className={styles.more}>
              <Button
                variant="secondary"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? t('catalog.loadingMore') : t('catalog.loadMore')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
};
