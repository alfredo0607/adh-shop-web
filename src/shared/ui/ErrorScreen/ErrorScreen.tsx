import type { ReactNode } from 'react';

import styles from './ErrorScreen.module.css';

export interface ErrorScreenProps {
  title: string;
  body: string;
  /** Actions the buyer can take: retry, go home. */
  children?: ReactNode;
}

/**
 * The full-page state for something that went wrong: a crash, a missing page.
 * Calm and specific rather than technical: the buyer needs a way forward, not a
 * stack trace.
 */
export const ErrorScreen = ({ title, body, children }: ErrorScreenProps): ReactNode => (
  <section className={styles.screen} role="alert" aria-labelledby="error-screen-title">
    <div className={styles.mark} aria-hidden="true">
      ☕
    </div>
    <h1 id="error-screen-title" className={styles.title}>
      {title}
    </h1>
    <p className={styles.body}>{body}</p>
    {children !== undefined && <div className={styles.actions}>{children}</div>}
  </section>
);
