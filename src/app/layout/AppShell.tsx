import type { ReactNode } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';

import { CartPanel } from '@/features/cart/CartPanel';
import { t } from '@/shared/copy/es-CO';

import styles from './AppShell.module.css';
import { Footer } from './Footer';
import { Header } from './Header';

/** The frame around every screen: header, main content, footer. */
export const AppShell = ({ children }: { children?: ReactNode }): ReactNode => (
  <div className={styles.shell}>
    {/* A new screen opens at the top; going back returns to where the buyer was. */}
    <ScrollRestoration />
    <a className={styles.skipLink} href="#main">
      {t('nav.skipToContent')}
    </a>

    <Header />

    <main id="main" className={styles.main} tabIndex={-1}>
      {children ?? <Outlet />}
    </main>

    <Footer />
    <CartPanel />
  </div>
);
