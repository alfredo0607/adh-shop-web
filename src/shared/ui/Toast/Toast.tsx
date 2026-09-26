import * as RadixToast from '@radix-ui/react-toast';
import { AlertCircle, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

import styles from './Toast.module.css';

export interface ToastProps {
  tone: 'error' | 'info';
  message: string;
  /** Small print under the message, such as a request reference. */
  detail?: string;
  dismissLabel: string;
  onDismiss: () => void;
  /** Milliseconds before it closes on its own. Errors stay longer: they need reading. */
  duration?: number;
}

/**
 * A notification, on Radix Toast for its behaviour: announced to screen readers,
 * paused while hovered or focused, dismissable by swipe and by keyboard. The
 * look is entirely ours.
 */
export const Toast = ({
  tone,
  message,
  detail,
  dismissLabel,
  onDismiss,
  duration = tone === 'error' ? 8000 : 5000,
}: ToastProps): ReactNode => {
  const Icon = tone === 'error' ? AlertCircle : Info;

  return (
    <RadixToast.Root
      className={`${styles.toast} ${styles[tone]}`}
      duration={duration}
      type={tone === 'error' ? 'foreground' : 'background'}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <Icon className={styles.icon} aria-hidden="true" />
      <div className={styles.text}>
        <RadixToast.Description className={styles.message}>{message}</RadixToast.Description>
        {detail !== undefined && <p className={styles.detail}>{detail}</p>}
      </div>
      <RadixToast.Close className={styles.close} aria-label={dismissLabel}>
        <X aria-hidden="true" />
      </RadixToast.Close>
    </RadixToast.Root>
  );
};

export interface ToastViewportProps {
  label: string;
  children: ReactNode;
}

/** Hosts the toasts: bottom of the screen on phones, top-right on wider screens. */
export const ToastProvider = ({ label, children }: ToastViewportProps): ReactNode => (
  <RadixToast.Provider swipeDirection="down" label={label}>
    {children}
    <RadixToast.Viewport className={styles.viewport} />
  </RadixToast.Provider>
);
