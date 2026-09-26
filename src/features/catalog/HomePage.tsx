import type { ReactNode } from 'react';

import { t } from '@/shared/copy/es-CO';

import styles from './HomePage.module.css';

/** The storefront's landing screen. The catalogue itself arrives in step 3 of the roadmap. */
export const HomePage = (): ReactNode => (
  <section className={styles.hero} aria-labelledby="home-title">
    <p className={styles.eyebrow}>{t('brand.tagline')}</p>
    <h1 id="home-title" className={styles.title}>
      {t('home.title')}
    </h1>
    <p className={styles.lead}>{t('home.lead')}</p>
  </section>
);
