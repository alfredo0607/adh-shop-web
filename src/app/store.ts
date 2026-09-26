import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { rememberEnhancer, type Driver } from 'redux-remember';

import { api } from '@/api';
import { cartPanelSlice, cartSlice } from '@/features/cart/cartSlice';
import { checkoutSlice } from '@/features/checkout/checkoutSlice';
import { isDevelopment } from '@/shared/lib/runtime';

import { errorListener } from './listeners';
import { notificationsSlice } from './notifications/notificationsSlice';
import { PERSISTED_SLICES, STORAGE_PREFIX, browserStorage, persistenceSlice } from './persistence';

const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  cart: cartSlice.reducer,
  cartPanel: cartPanelSlice.reducer,
  checkout: checkoutSlice.reducer,
  notifications: notificationsSlice.reducer,
  persistence: persistenceSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export interface StoreOptions {
  /** Where persisted slices live. localStorage in the browser; memory in tests. */
  storage?: Driver;
  preloadedState?: Partial<RootState>;
}

const buildStore = ({ storage = browserStorage, preloadedState }: StoreOptions) => {
  const store = configureStore({
    // Not wrapped in rememberReducer: that wrapper replaces the whole state on
    // rehydration. The checkout slice takes its own part instead.
    reducer: rootReducer,
    ...(preloadedState === undefined ? {} : { preloadedState }),
    middleware: (getDefault) =>
      getDefault().prepend(errorListener.middleware).concat(api.middleware),
    enhancers: (getDefault) =>
      getDefault().concat(
        rememberEnhancer(storage, [...PERSISTED_SLICES], {
          prefix: STORAGE_PREFIX,
          // Writes are batched: a buyer typing a delivery address should not
          // cost a synchronous localStorage write per keystroke.
          persistThrottle: 200,
        }),
      ),
    devTools: isDevelopment,
  });

  // Refetch on focus and reconnect, where an endpoint asks for it.
  setupListeners(store.dispatch);

  return store;
};

export type AppStore = ReturnType<typeof buildStore>;

export const createStore = (options: StoreOptions = {}): AppStore => buildStore(options);
export type AppDispatch = AppStore['dispatch'];
