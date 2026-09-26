import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import styles from './Drawer.module.css';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  /** Pinned to the bottom of the panel: totals and the main action. */
  footer?: ReactNode;
}

/**
 * A panel that slides in from the side: the whole screen on a phone, a column
 * on the right from 600 px. Radix brings the dialog behaviour: focus trapped
 * inside, Escape and the overlay close it, and focus returns to the control
 * that opened it.
 */
export const Drawer = ({
  open,
  onOpenChange,
  title,
  closeLabel,
  children,
  footer,
}: DrawerProps): ReactNode => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={styles.panel} aria-describedby={undefined}>
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
