import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router';

import { t } from '@/shared/copy/es-CO';

import {
  CATEGORIES,
  DEFAULT_FILTERS,
  PRICE_RANGES,
  SORTS,
  hasActiveFilters,
  parseFilters,
  toSearchParams,
  type CatalogueFilters,
  type Category,
  type PriceRange,
  type Sort,
} from './filters';
import styles from './FilterBar.module.css';

/** Navigation state that asks the catalogue to focus its search, e.g. from the header. */
export interface FocusSearchState {
  focusSearch?: boolean;
}

/**
 * The catalogue's controls. Every change is written to the address bar, which
 * is the one source of truth for what the grid shows, and goes back to the
 * first page.
 */
export const FilterBar = (): ReactNode => {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const filters = parseFilters(params);
  const searchRef = useRef<HTMLInputElement>(null);

  const update = (changes: Partial<CatalogueFilters>): void => {
    setParams(toSearchParams({ ...filters, ...changes, page: 1 }), { preventScrollReset: true });
  };

  // The header's search button lands here and hands over the keyboard.
  const focusSearch = (location.state as FocusSearchState | null)?.focusSearch === true;
  useEffect(() => {
    if (!focusSearch) return;
    searchRef.current?.focus();
    searchRef.current?.scrollIntoView({ block: 'center' });
  }, [focusSearch, location.key]);

  const search = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    update({ query: searchRef.current?.value.trim() ?? '' });
  };

  const toggleCategory = (category: Category): void => {
    const chosen = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];
    update({ categories: chosen });
  };

  return (
    <div className={styles.bar}>
      <form role="search" className={styles.search} onSubmit={search}>
        <label htmlFor="catalogue-search" className="visually-hidden">
          {t('catalog.searchLabel')}
        </label>
        <Search aria-hidden className={styles.searchIcon} />
        {/* Keyed on the applied query, so clearing the filters also clears the box. */}
        <input
          key={filters.query}
          ref={searchRef}
          id="catalogue-search"
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={80}
          defaultValue={filters.query}
          placeholder={t('catalog.searchPlaceholder')}
          className={styles.searchInput}
        />
        {filters.query === '' ? null : (
          <button
            type="button"
            className={styles.clearSearch}
            aria-label={t('catalog.clearSearch')}
            onClick={() => update({ query: '' })}
          >
            <X aria-hidden />
          </button>
        )}
        <button type="submit" className={styles.searchButton}>
          {t('catalog.searchLabel')}
        </button>
      </form>

      <fieldset className={styles.categories}>
        <legend className="visually-hidden">{t('catalog.categoriesLabel')}</legend>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={filters.categories.length === 0}
          onClick={() => update({ categories: [] })}
        >
          {t('catalog.allCategories')}
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={styles.chip}
            aria-pressed={filters.categories.includes(category)}
            onClick={() => toggleCategory(category)}
          >
            {t(`categories.${category}`)}
          </button>
        ))}
      </fieldset>

      <div className={styles.refine}>
        <label className={styles.select}>
          <span className={styles.selectLabel}>{t('catalog.priceLabel')}</span>
          <span className={styles.selectControl}>
            <select
              value={filters.price ?? ''}
              onChange={(event) =>
                update({
                  price: event.target.value === '' ? null : (event.target.value as PriceRange),
                })
              }
            >
              <option value="">{t('catalog.anyPrice')}</option>
              {(Object.keys(PRICE_RANGES) as PriceRange[]).map((range) => (
                <option key={range} value={range}>
                  {t(`prices.${range}`)}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className={styles.chevron} />
          </span>
        </label>

        <label className={styles.select}>
          <span className={styles.selectLabel}>{t('catalog.sortLabel')}</span>
          <span className={styles.selectControl}>
            <select
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value as Sort })}
            >
              {SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {t(`sorts.${sort}`)}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className={styles.chevron} />
          </span>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(event) => update({ inStockOnly: event.target.checked })}
          />
          {t('catalog.inStockOnly')}
        </label>

        {hasActiveFilters(filters) ? (
          <button
            type="button"
            className={styles.clear}
            onClick={() => update({ ...DEFAULT_FILTERS, sort: filters.sort })}
          >
            {t('catalog.clearFilters')}
          </button>
        ) : null}
      </div>
    </div>
  );
};
