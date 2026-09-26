import { RefreshCw, SearchX } from 'lucide-react';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';

import { useListCatalogueQuery } from '@/api';
import { t } from '@/shared/copy/es-CO';
import { Button } from '@/shared/ui/Button/Button';
import { Pagination } from '@/shared/ui/Pagination/Pagination';

import { FilterBar } from './FilterBar';
import {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  applyFilters,
  pageItems,
  paginate,
  parseFilters,
  toSearchParams,
} from './filters';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

const TITLE_ID = 'catalog-title';

/**
 * The catalogue: filters, the products of the current page and the page
 * links, all driven by the address bar. A failed request is announced by the
 * global error listener; this screen only has to offer a way forward when it
 * has nothing to show.
 */
export const ProductGrid = (): ReactNode => {
  const { data, isLoading, isError, refetch } = useListCatalogueQuery();
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const filters = useMemo(() => parseFilters(new URLSearchParams(query)), [query]);
  const matches = useMemo(() => applyFilters(data ?? [], filters), [data, filters]);
  const page = paginate(matches, filters.page);

  // Changing page starts at the top of the grid, not of the whole store.
  const sectionRef = useRef<HTMLElement>(null);
  const shownPage = useRef(page.page);
  useEffect(() => {
    if (shownPage.current === page.page) return;
    shownPage.current = page.page;
    sectionRef.current?.scrollIntoView({ block: 'start' });
  }, [page.page]);

  const hrefFor = (target: number): string => {
    const search = toSearchParams({ ...filters, page: target }).toString();
    return search === '' ? '/' : `/?${search}`;
  };

  const content = ((): ReactNode => {
    if (isLoading) {
      return (
        <>
          <p className="visually-hidden" role="status">
            {t('catalog.loading')}
          </p>
          <ul className={styles.grid} aria-hidden>
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <li key={index} className={styles.skeleton} />
            ))}
          </ul>
        </>
      );
    }

    if (data === undefined || data.length === 0) {
      return (
        <div className={styles.empty}>
          <p>{isError ? t('catalog.loadError') : t('catalog.empty')}</p>
          {isError ? (
            <Button variant="secondary" onClick={() => void refetch()}>
              <RefreshCw aria-hidden className={styles.icon} />
              {t('catalog.retry')}
            </Button>
          ) : null}
        </div>
      );
    }

    if (page.total === 0) {
      return (
        <div className={styles.empty}>
          <SearchX aria-hidden className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>{t('catalog.noMatches')}</p>
          <p>{t('catalog.noMatchesHint')}</p>
          <Button
            variant="secondary"
            onClick={() =>
              setParams(toSearchParams({ ...DEFAULT_FILTERS, sort: filters.sort }), {
                preventScrollReset: true,
              })
            }
          >
            {t('catalog.clearFilters')}
          </Button>
        </div>
      );
    }

    return (
      <>
        <ul className={styles.grid} aria-labelledby={TITLE_ID}>
          {page.items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
        <Pagination
          page={page.page}
          pageCount={page.pageCount}
          items={pageItems(page.page, page.pageCount)}
          hrefFor={hrefFor}
        />
      </>
    );
  })();

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      aria-labelledby={TITLE_ID}
      aria-busy={isLoading}
    >
      <div className={styles.heading}>
        <h2 id={TITLE_ID} className={styles.title}>
          {t('catalog.title')}
        </h2>
        {/* Announced when a filter changes what is shown. */}
        <p className={styles.count} aria-live="polite">
          {page.total === 0
            ? ''
            : page.total === 1
              ? t('catalog.showingOne')
              : t('catalog.showing', { from: page.from, to: page.to, total: page.total })}
        </p>
      </div>
      <FilterBar />
      {content}
    </section>
  );
};
