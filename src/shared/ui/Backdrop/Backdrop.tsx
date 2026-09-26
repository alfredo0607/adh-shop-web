import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import styles from './Backdrop.module.css';

export interface BackdropProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  /** Pinned under the content: the total and the main action. */
  footer?: ReactNode;
}

/**
 * The Material backdrop pattern: a front layer that slides up over the page,
 * which stays in view above it. Used for the order summary, so the buyer
 * still sees what they are paying for. A dialog underneath (Radix): focus
 * stays inside, Escape closes it, and focus returns where it was.
 */
export const Backdrop = ({
  open,
  onOpenChange,
  title,
  closeLabel,
  children,
  footer,
}: BackdropProps): ReactNode => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={styles.layer} aria-describedby={undefined}>
        <span className={styles.handle} aria-hidden />
        <header className={styles.header}>
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          <Dialog.Close className={styles.close} aria-label={closeLabel}>
            <X aria-hidden />
          </Dialog.Close>
        </header>
        <div className={styles.body}>{children}</div>
        {footer === undefined ? null : <footer className={styles.footer}>{footer}</footer>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
