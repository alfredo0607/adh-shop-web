import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

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
