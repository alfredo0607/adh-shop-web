import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { t } from '@/shared/copy/es-CO';

import styles from './Pagination.module.css';

export type PageItem = number | 'gap';

export interface PaginationProps {
  page: number;
  pageCount: number;
  /** The pages to show, gaps included; see `pageItems` in the catalogue. */
  items: readonly PageItem[];
  /** The link to a page. Links, not buttons: every page has an address. */
  hrefFor: (page: number) => string;
}

/**
 * Numbered pages with previous and next. Scrolling is left to the caller
 * (`preventScrollReset`), which knows where the list starts.
 */
export const Pagination = ({ page, pageCount, items, hrefFor }: PaginationProps): ReactNode => {
  if (pageCount <= 1) return null;

  const edge = (target: number, label: string, icon: ReactNode, enabled: boolean): ReactNode =>
    enabled ? (
      <Link to={hrefFor(target)} preventScrollReset className={styles.step} aria-label={label}>
        {icon}
      </Link>
    ) : (
      <span className={`${styles.step} ${styles.disabled}`} aria-hidden>
        {icon}
      </span>
    );

  return (
    <nav className={styles.pagination} aria-label={t('pagination.label')}>
      {edge(page - 1, t('pagination.previous'), <ChevronLeft aria-hidden />, page > 1)}
      <ol className={styles.pages}>
        {items.map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} className={styles.gap} aria-hidden>
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                to={hrefFor(item)}
                preventScrollReset
                className={item === page ? `${styles.page} ${styles.current}` : styles.page}
                aria-label={t('pagination.page', { page: item })}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ol>
      {edge(page + 1, t('pagination.next'), <ChevronRight aria-hidden />, page < pageCount)}
    </nav>
  );
};
