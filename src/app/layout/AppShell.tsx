import type { ReactNode } from 'react';
import { Link, Outlet, ScrollRestoration } from 'react-router';

import { t } from '@/shared/copy/es-CO';

import styles from './AppShell.module.css';

/** The frame around every screen: header, main content, footer. */
export const AppShell = ({ children }: { children?: ReactNode }): ReactNode => (
  <div className={styles.shell}>
    {/* A new screen opens at the top; going back returns to where the buyer was. */}
    <ScrollRestoration />
    <a className={styles.skipLink} href="#main">
      {t('nav.skipToContent')}
    </a>

    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link to="/" className={styles.brand} aria-label={`${t('brand.name')}, ${t('nav.home')}`}>
          <span className={styles.brandName}>{t('brand.name')}</span>
          <span className={styles.brandTagline}>{t('brand.tagline')}</span>
        </Link>
      </div>
    </header>

    <main id="main" className={styles.main} tabIndex={-1}>
      {children ?? <Outlet />}
    </main>

    <footer className={styles.footer}>
      <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
    </footer>
  </div>
);
