import { Heart, Search, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';

import { CartButton } from '@/features/cart/CartButton';
import { CATEGORIES, CATEGORY_SLUGS } from '@/features/catalog/filters';
import type { FocusSearchState } from '@/features/catalog/FilterBar';
import { t } from '@/shared/copy/es-CO';

import { useAppDispatch } from '../hooks';
import { comingSoon } from '../notifications/notificationsSlice';
import styles from './Header.module.css';

/**
 * The store's header: brand, quick actions and, on wider screens, the
 * categories. Search takes the buyer to the catalogue's search box; favourites
 * and the account are not part of this exercise and say so.
 */
export const Header = (): ReactNode => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const onCatalogue = location.pathname === '/';
  const activeCategories = onCatalogue ? params.getAll('categoria') : [];

  const openSearch = (): void => {
    const state: FocusSearchState = { focusSearch: true };
    // On the catalogue, keep whatever it is showing; elsewhere, go to it.
    void navigate(onCatalogue ? `/${location.search}` : '/', { state, preventScrollReset: true });
  };

  return (
    <>
      <p className={styles.announcement}>{t('header.announcement')}</p>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand} aria-label={`${t('brand.name')}, ${t('nav.home')}`}>
            <span className={styles.brandName}>{t('brand.name')}</span>
            <span className={styles.brandTagline}>{t('brand.tagline')}</span>
          </Link>

          <div className={styles.actions} role="group" aria-label={t('header.actions')}>
            <button
              type="button"
              className={styles.action}
              aria-label={t('header.search')}
              onClick={openSearch}
            >
              <Search aria-hidden />
            </button>
            <button
              type="button"
              className={styles.action}
              aria-label={t('header.favorites')}
              onClick={() => dispatch(comingSoon())}
            >
              <Heart aria-hidden />
            </button>
            <button
              type="button"
              className={styles.action}
              aria-label={t('header.account')}
              onClick={() => dispatch(comingSoon())}
            >
              <UserRound aria-hidden />
            </button>
            <CartButton className={styles.action} />
          </div>
        </div>

        <nav className={styles.categories} aria-label={t('nav.categories')}>
          <ul className={styles.categoryList}>
            {CATEGORIES.map((category) => {
              const slug = CATEGORY_SLUGS[category];
              const current = activeCategories.length === 1 && activeCategories[0] === slug;
              return (
                <li key={category}>
                  <Link
                    to={`/?categoria=${slug}`}
                    className={styles.category}
                    aria-current={current ? 'page' : undefined}
                  >
                    {t(`categories.${category}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
    </>
  );
};
