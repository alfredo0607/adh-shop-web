import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { t } from '@/shared/copy/es-CO';

export interface Notification {
  /** Identical messages share an id, so a repeated failure updates one toast instead of stacking. */
  id: string;
  tone: 'error' | 'info';
  message: string;
  requestId?: string;
}

export interface NotificationsState {
  items: Notification[];
}

const initialState: NotificationsState = { items: [] };

/** How many toasts may be visible at once; older ones make room. */
export const MAX_VISIBLE_NOTIFICATIONS = 3;

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notified: (state, action: PayloadAction<Notification>) => {
      const others = state.items.filter((item) => item.id !== action.payload.id);
      state.items = [...others, action.payload].slice(-MAX_VISIBLE_NOTIFICATIONS);
    },
    dismissed: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
  },
});

export const { notified, dismissed } = notificationsSlice.actions;

export const selectNotifications = (state: { notifications: NotificationsState }): Notification[] =>
  state.notifications.items;

/**
 * For the controls that are part of the storefront's layout but not of this
 * exercise (favourites, the account): an honest "coming soon" rather than a
 * button that silently does nothing.
 */
export const comingSoon = (): PayloadAction<Notification> =>
  notified({ id: 'coming-soon', tone: 'info', message: t('header.comingSoon') });
