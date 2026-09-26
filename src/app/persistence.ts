import { createSlice } from '@reduxjs/toolkit';
import { REMEMBER_REHYDRATED, type Driver } from 'redux-remember';

/**
 * The slices written to localStorage: the order in progress and the cart.
 * Neither can hold card data, by construction. Everything else, including the
 * RTK Query cache, is deliberately left out. See docs/guide/state.md.
 */
export const PERSISTED_SLICES = ['checkout', 'cart'] as const;

export const STORAGE_PREFIX = 'adh-shop:';

/**
 * localStorage, tolerant of browsers that refuse it (private modes, full
 * quota): the store keeps working in memory rather than crashing the app.
 */
export const browserStorage: Driver = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value as string);
    } catch {
      // Persistence is a convenience; the order still works without it.
    }
  },
};

/**
 * Whether persisted state has been read back yet. Rehydration is asynchronous,
 * so anything that decides from saved state (where to resume an order) waits
 * for this instead of acting on the empty initial state.
 */
export const persistenceSlice = createSlice({
  name: 'persistence',
  initialState: { rehydrated: false },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(REMEMBER_REHYDRATED, (state) => {
      state.rehydrated = true;
    });
  },
});

export const selectRehydrated = (state: { persistence: { rehydrated: boolean } }): boolean =>
  state.persistence.rehydrated;
