import type { ReactNode } from 'react';

import { t } from '@/shared/copy/es-CO';
import { Toast, ToastProvider } from '@/shared/ui/Toast/Toast';

import { useAppDispatch, useAppSelector } from '../hooks';
import { dismissed, selectNotifications } from './notificationsSlice';

/** Renders the notifications held in the store. */
export const ToastRegion = ({ children }: { children: ReactNode }): ReactNode => {
  const notifications = useAppSelector(selectNotifications);
  const dispatch = useAppDispatch();

  return (
    <ToastProvider label={t('notifications.region')}>
      {children}
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          tone={notification.tone}
          message={notification.message}
          {...(notification.requestId === undefined
            ? {}
            : { detail: t('notifications.reference', { requestId: notification.requestId }) })}
          dismissLabel={t('notifications.dismiss')}
          onDismiss={() => dispatch(dismissed(notification.id))}
        />
      ))}
    </ToastProvider>
  );
};
