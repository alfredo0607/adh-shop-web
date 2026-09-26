import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { REMEMBER_REHYDRATED } from 'redux-remember';

import type { ApiErrorCode } from '@/shared/errors/appError';
import { createIdempotencyKey } from '@/shared/lib/ids';
import { isOrderItemList, type OrderItem } from '@/shared/lib/order';

/**
 * What the buyer chose and where the order stands. The only slice persisted to
 * localStorage, so it must never hold card data. See docs/guide/state.md.
 */

export interface DeliveryDetails {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  postalCode?: string;
  country: 'CO';
}

export type PaymentStatus = 'idle' | 'submitting' | 'submitted' | 'failed';

/**
 * Where the order came from. An order from the cart empties the cart once it
 * is paid; "buy now" on a product page leaves the cart as it was.
 */
export type OrderSource = 'cart' | 'buy-now';

export interface CheckoutState {
  /** The products being bought, each with its units. Empty until an order starts. */
  items: OrderItem[];
  source: OrderSource | null;
  delivery: DeliveryDetails | null;
  /** Set once POST /transactions succeeds. */
  transactionId: string | null;
  /**
   * One per payment attempt, created when the transaction opens. Persisted so a
   * payment retried after a reload reuses it and cannot be charged twice.
   */
  idempotencyKey: string | null;
  paymentStatus: PaymentStatus;
  /** The API's error code, never its message. */
  lastError: ApiErrorCode | 'UNKNOWN' | null;
}

export const initialCheckoutState: CheckoutState = {
  items: [],
  source: null,
  delivery: null,
  transactionId: null,
  idempotencyKey: null,
  paymentStatus: 'idle',
  lastError: null,
};

const PAYMENT_STATUSES: readonly PaymentStatus[] = ['idle', 'submitting', 'submitted', 'failed'];
const ORDER_SOURCES: readonly (OrderSource | null)[] = ['cart', 'buy-now', null];

const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null =>
  value === null || isString(value);

/**
 * Validates what came back from localStorage before trusting it. Storage is
 * input like any other: an old version of the app, or a buyer with developer
 * tools, can leave anything there. A malformed record is dropped whole, and
 * the buyer simply starts a fresh order.
 */
export const parsePersistedCheckout = (value: unknown): CheckoutState | null => {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const delivery = v['delivery'];

  const valid =
    isOrderItemList(v['items']) &&
    ORDER_SOURCES.includes(v['source'] as OrderSource | null) &&
    isNullableString(v['transactionId']) &&
    isNullableString(v['idempotencyKey']) &&
    PAYMENT_STATUSES.includes(v['paymentStatus'] as PaymentStatus) &&
    isNullableString(v['lastError']) &&
    (delivery === null ||
      (typeof delivery === 'object' &&
        ['fullName', 'email', 'phone', 'addressLine1', 'city', 'region'].every((field) =>
          isString((delivery as Record<string, unknown>)[field]),
        ) &&
        (delivery as Record<string, unknown>)['country'] === 'CO'));

  return valid ? (v as unknown as CheckoutState) : null;
};

interface RehydrationAction {
  type: typeof REMEMBER_REHYDRATED;
  payload?: { checkout?: unknown };
}

const isRehydration = (action: { type: string }): action is RehydrationAction =>
  action.type === REMEMBER_REHYDRATED;

/** True while nothing has happened to the order in this session. */
const isUntouched = (state: CheckoutState): boolean =>
  JSON.stringify(state) === JSON.stringify(initialCheckoutState);

export const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: initialCheckoutState,
  reducers: {
    /**
     * Starts an order, from the cart or from "buy now". Any transaction of a
     * previous order is dropped; delivery details the buyer already gave are kept.
     */
    orderStarted: (state, action: PayloadAction<{ items: OrderItem[]; source: OrderSource }>) => ({
      ...initialCheckoutState,
      delivery: state.delivery,
      items: action.payload.items,
      source: action.payload.source,
    }),

    deliverySaved: (state, action: PayloadAction<DeliveryDetails>) => {
      state.delivery = action.payload;
    },

    transactionOpened: {
      reducer: (
        state,
        action: PayloadAction<{ transactionId: string; idempotencyKey: string }>,
      ) => {
        state.transactionId = action.payload.transactionId;
        state.idempotencyKey = action.payload.idempotencyKey;
        state.paymentStatus = 'idle';
        state.lastError = null;
      },
      // The key is created here, not in the reducer: reducers stay pure.
      prepare: (transactionId: string) => ({
        payload: { transactionId, idempotencyKey: createIdempotencyKey() },
      }),
    },

    /**
     * A fresh idempotency key for the next attempt, after the API refused the
     * previous one outright (a rejected card). Reusing that key would only
     * replay the refusal. After a network failure the key is kept instead: the
     * request may have arrived, and the same key makes a retry safe.
     */
    attemptRenewed: {
      reducer: (state, action: PayloadAction<string>) => {
        state.idempotencyKey = action.payload;
      },
      prepare: () => ({ payload: createIdempotencyKey() }),
    },

    /** The reservation ran out: the next attempt opens a new transaction. */
    transactionDiscarded: (state) => {
      state.transactionId = null;
      state.idempotencyKey = null;
      state.paymentStatus = 'idle';
    },

    paymentSubmitting: (state) => {
      state.paymentStatus = 'submitting';
      state.lastError = null;
    },

    paymentSubmitted: (state) => {
      state.paymentStatus = 'submitted';
    },

    paymentFailed: (state, action: PayloadAction<CheckoutState['lastError']>) => {
      state.paymentStatus = 'failed';
      state.lastError = action.payload;
    },

    /**
     * The buyer is back at the store: the next order starts clean. Delivery details
     * go too; personal data is kept only while the order it belongs to is open.
     */
    orderClosed: () => initialCheckoutState,
  },
  extraReducers: (builder) => {
    // Only this slice takes its part of the rehydrated state. Rehydration is
    // asynchronous, and replacing the whole store at that moment would discard
    // whatever happened meanwhile, such as requests already in flight.
    // What the buyer did in this session is newer than anything stored, so the
    // stored order only applies while the slice is untouched. It matters because
    // when storage is empty, the rehydration payload holds the state as it was
    // when the store was created, which would undo an earlier action.
    builder.addMatcher(isRehydration, (state, action) => {
      if (!isUntouched(state)) return state;
      return parsePersistedCheckout(action.payload?.checkout) ?? state;
    });
  },
});

export const {
  orderStarted,
  attemptRenewed,
  transactionDiscarded,
  deliverySaved,
  transactionOpened,
  paymentSubmitting,
  paymentSubmitted,
  paymentFailed,
  orderClosed,
} = checkoutSlice.actions;

type WithCheckout = { checkout: CheckoutState };

export const selectCheckout = (state: WithCheckout): CheckoutState => state.checkout;

export const selectHasOpenTransaction = (state: WithCheckout): boolean =>
  state.checkout.transactionId !== null;

/** Where to take a buyer who reloads the page. See docs/guide/checkout-flow.md. */
export const selectResumeTarget = (
  state: WithCheckout,
): { screen: 'status'; transactionId: string } | { screen: 'summary' } | { screen: 'store' } => {
  const { transactionId, paymentStatus, items, delivery } = state.checkout;

  if (transactionId !== null && (paymentStatus === 'submitted' || paymentStatus === 'submitting')) {
    return { screen: 'status', transactionId };
  }
  if (items.length > 0 && delivery !== null) {
    return { screen: 'summary' };
  }
  return { screen: 'store' };
};
