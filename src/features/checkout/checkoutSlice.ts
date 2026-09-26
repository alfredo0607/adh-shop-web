import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { REMEMBER_REHYDRATED } from 'redux-remember';

import type { ApiErrorCode } from '@/shared/errors/appError';
import { createIdempotencyKey } from '@/shared/lib/ids';

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

export interface CheckoutState {
  productId: string | null;
  units: number;
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
  productId: null,
  units: 1,
  delivery: null,
  transactionId: null,
  idempotencyKey: null,
  paymentStatus: 'idle',
  lastError: null,
};

const PAYMENT_STATUSES: readonly PaymentStatus[] = ['idle', 'submitting', 'submitted', 'failed'];

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
    isNullableString(v['productId']) &&
    typeof v['units'] === 'number' &&
    Number.isInteger(v['units']) &&
    v['units'] >= 1 &&
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
  (Object.keys(initialCheckoutState) as (keyof CheckoutState)[]).every(
    (key) => state[key] === initialCheckoutState[key],
  );

export const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: initialCheckoutState,
  reducers: {
    /** Starts or changes an order. Any transaction from a previous order is dropped. */
    productChosen: (state, action: PayloadAction<{ productId: string; units: number }>) => ({
      ...initialCheckoutState,
      delivery: state.delivery,
      productId: action.payload.productId,
      units: action.payload.units,
    }),

    unitsChanged: (state, action: PayloadAction<number>) => {
      state.units = action.payload;
    },

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
  productChosen,
  unitsChanged,
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
  const { transactionId, paymentStatus, productId, delivery } = state.checkout;

  if (transactionId !== null && (paymentStatus === 'submitted' || paymentStatus === 'submitting')) {
    return { screen: 'status', transactionId };
  }
  if (productId !== null && delivery !== null) {
    return { screen: 'summary' };
  }
  return { screen: 'store' };
};
