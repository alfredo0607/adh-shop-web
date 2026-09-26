import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

/**
 * A dialog over the page: the whole screen on a phone, a centred panel from
 * 600 px. Radix traps focus inside, closes on Escape and returns focus to
 * where it was. The content scrolls; the title and close button stay.
 */
export const Modal = ({
  open,
  onOpenChange,
  title,
  closeLabel,
  children,
}: ModalProps): ReactNode => (
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
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
