import type { ReactNode } from 'react';

import { t } from '@/shared/copy/es-CO';

import styles from './HomePage.module.css';
import { ProductGrid } from './ProductGrid';

/** The storefront's landing screen: a short welcome, then the catalogue. */
export const HomePage = (): ReactNode => (
  <div className={styles.page}>
    <title>{`${t('brand.name')} · ${t('brand.tagline')}`}</title>
    <section className={styles.hero} aria-labelledby="home-title">
      <p className={styles.eyebrow}>{t('brand.tagline')}</p>
      <h1 id="home-title" className={styles.title}>
        {t('home.title')}
      </h1>
      <p className={styles.lead}>{t('home.lead')}</p>
    </section>
    <ProductGrid />
  </div>
);
