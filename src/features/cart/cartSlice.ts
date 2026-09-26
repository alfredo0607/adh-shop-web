import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { REMEMBER_REHYDRATED } from 'redux-remember';

import {
  MAX_ITEMS_PER_ORDER,
  MAX_UNITS_PER_ORDER,
  isOrderItemList,
  type OrderItem,
} from '@/shared/lib/order';

/**
 * What the buyer means to buy, persisted so it survives a reload or a closed
 * tab. Only product ids and units: prices, names and stock are always read
 * fresh from the API, so the cart can never show a price that is out of date.
 */
export interface CartState {
  lines: OrderItem[];
}

export const initialCartState: CartState = { lines: [] };

const clampUnits = (units: number): number =>
  Math.min(MAX_UNITS_PER_ORDER, Math.max(1, Math.trunc(units)));

interface RehydrationAction {
  type: typeof REMEMBER_REHYDRATED;
  payload?: { cart?: unknown };
}

const isRehydration = (action: { type: string }): action is RehydrationAction =>
  action.type === REMEMBER_REHYDRATED;

/** Stored carts are untrusted input; a malformed one is dropped, not repaired. */
export const parsePersistedCart = (value: unknown): OrderItem[] | null => {
  if (typeof value !== 'object' || value === null) return null;
  const lines = (value as Record<string, unknown>)['lines'];
  return isOrderItemList(lines) ? lines : null;
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState: initialCartState,
  reducers: {
    /**
     * Adds units of a product, or more units of one already in the cart, up to
     * the per-order limit. A new product beyond the order's limit of distinct
     * products is not added; the caller checks `selectCanAdd` and says why.
     */
    itemAdded: (state, action: PayloadAction<OrderItem>) => {
      const { productId, units } = action.payload;
      const line = state.lines.find((item) => item.productId === productId);
      if (line !== undefined) {
        line.units = clampUnits(line.units + units);
      } else if (state.lines.length < MAX_ITEMS_PER_ORDER) {
        state.lines.push({ productId, units: clampUnits(units) });
      }
    },

    unitsSet: (state, action: PayloadAction<OrderItem>) => {
      const line = state.lines.find((item) => item.productId === action.payload.productId);
      if (line !== undefined) line.units = clampUnits(action.payload.units);
    },

    itemRemoved: (state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter((item) => item.productId !== action.payload);
    },

    /** After an order placed from the cart is paid. */
    cartCleared: (state) => {
      state.lines = [];
    },
  },
  extraReducers: (builder) => {
    // The same rule as the checkout: what the buyer did in this session wins
    // over what storage held, so a stored cart applies only to an empty one.
    builder.addMatcher(isRehydration, (state, action) => {
      if (state.lines.length > 0) return;
      const lines = parsePersistedCart(action.payload?.cart);
      if (lines !== null) state.lines = lines;
    });
  },
});

export const { itemAdded, unitsSet, itemRemoved, cartCleared } = cartSlice.actions;

/**
 * Whether the cart's side panel is showing. A slice of its own because the
 * cart is persisted and this is not: a reload closes the panel.
 */
export const cartPanelSlice = createSlice({
  name: 'cartPanel',
  initialState: { isOpen: false },
  reducers: {
    cartOpened: (state) => {
      state.isOpen = true;
    },
    cartClosed: (state) => {
      state.isOpen = false;
    },
  },
});

export const { cartOpened, cartClosed } = cartPanelSlice.actions;

type WithCart = { cart: CartState; cartPanel: { isOpen: boolean } };

export const selectCartLines = (state: WithCart): OrderItem[] => state.cart.lines;

/** Units across every line: what the header's counter shows. */
export const selectCartCount = (state: WithCart): number =>
  state.cart.lines.reduce((sum, line) => sum + line.units, 0);

export const selectCartIsOpen = (state: WithCart): boolean => state.cartPanel.isOpen;

/** Whether a product can go in: it is already there, or there is room for another. */
export const selectCanAdd =
  (productId: string) =>
  (state: WithCart): boolean =>
    state.cart.lines.some((line) => line.productId === productId) ||
    state.cart.lines.length < MAX_ITEMS_PER_ORDER;
