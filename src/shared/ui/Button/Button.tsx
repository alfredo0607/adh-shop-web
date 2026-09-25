import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

/** The storefront's button. Always at least 44 px tall: a thumb-sized target. */
export const Button = ({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps): ReactNode => (
  <button
    type={type}
    className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
    {...props}
  />
);
