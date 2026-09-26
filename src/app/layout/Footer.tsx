import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { CATEGORIES, CATEGORY_SLUGS } from '@/features/catalog/filters';
import { t } from '@/shared/copy/es-CO';
import { PaymentMethods } from '@/shared/ui/PaymentMethods/PaymentMethods';

import styles from './Footer.module.css';

export const Footer = (): ReactNode => (
  <footer className={styles.footer}>
    <div className={styles.inner}>
      <div className={styles.about}>
        <p className={styles.brand}>{t('brand.name')}</p>
        <p>{t('home.lead')}</p>
      </div>

      <nav aria-labelledby="footer-shop">
        <h2 id="footer-shop" className={styles.heading}>
          {t('footer.shop')}
        </h2>
        <ul className={styles.links}>
          {CATEGORIES.map((category) => (
            <li key={category}>
              <Link to={`/?categoria=${CATEGORY_SLUGS[category]}`}>
                {t(`categories.${category}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        <h2 className={styles.heading}>{t('payments.title')}</h2>
        <PaymentMethods />
      </div>
    </div>

    <p className={styles.rights}>{t('footer.rights', { year: new Date().getFullYear() })}</p>
  </footer>
);
