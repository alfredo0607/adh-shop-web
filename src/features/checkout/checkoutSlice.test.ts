import { REMEMBER_REHYDRATED } from 'redux-remember';

import {
  checkoutSlice,
  deliverySaved,
  initialCheckoutState,
  orderClosed,
  parsePersistedCheckout,
  paymentFailed,
  paymentSubmitted,
  paymentSubmitting,
  productChosen,
  selectHasOpenTransaction,
  selectResumeTarget,
  transactionOpened,
  unitsChanged,
  type CheckoutState,
  type DeliveryDetails,
} from './checkoutSlice';

const reduce = checkoutSlice.reducer;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const DELIVERY: DeliveryDetails = {
  fullName: 'Laura Gómez',
  email: 'laura@example.com',
  phone: '3001234567',
  addressLine1: 'Calle 93 # 11-26',
  city: 'Bogotá',
  region: 'Cundinamarca',
  country: 'CO',
};

const withState = (checkout: Partial<CheckoutState>): { checkout: CheckoutState } => ({
  checkout: { ...initialCheckoutState, ...checkout },
});

describe('checkout slice', () => {
  it('starts a new order when a product is chosen, dropping any previous transaction', () => {
    const previous: CheckoutState = {
      ...initialCheckoutState,
      productId: 'old',
      delivery: DELIVERY,
      transactionId: 't-1',
      idempotencyKey: 'k-1',
      paymentStatus: 'failed',
    };

    const state = reduce(previous, productChosen({ productId: 'prod-01', units: 2 }));

    expect(state).toEqual({
      ...initialCheckoutState,
      productId: 'prod-01',
      units: 2,
      delivery: DELIVERY,
    });
  });

  it('records units and delivery details', () => {
    let state = reduce(initialCheckoutState, unitsChanged(3));
    state = reduce(state, deliverySaved(DELIVERY));

    expect(state.units).toBe(3);
    expect(state.delivery).toEqual(DELIVERY);
  });

  it('gives every opened transaction a fresh idempotency key', () => {
    const first = reduce(initialCheckoutState, transactionOpened('t-1'));
    const second = reduce(first, transactionOpened('t-2'));

    expect(first.transactionId).toBe('t-1');
    expect(second.transactionId).toBe('t-2');
    expect(first.idempotencyKey).toMatch(UUID_V4);
    expect(second.idempotencyKey).toMatch(UUID_V4);
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it('tracks the payment through submitting, submitted and failed', () => {
    let state = reduce(initialCheckoutState, paymentSubmitting());
    expect(state.paymentStatus).toBe('submitting');

    state = reduce(state, paymentFailed('PAYMENT_REJECTED'));
    expect(state).toMatchObject({ paymentStatus: 'failed', lastError: 'PAYMENT_REJECTED' });

    state = reduce(state, paymentSubmitting());
    expect(state.lastError).toBeNull();

    state = reduce(state, paymentSubmitted());
    expect(state.paymentStatus).toBe('submitted');
  });

  it('forgets everything, personal data included, once the order closes', () => {
    const state = reduce(
      { ...initialCheckoutState, delivery: DELIVERY, transactionId: 't-1' },
      orderClosed(),
    );

    expect(state).toEqual(initialCheckoutState);
  });

  it('takes back a valid persisted record on rehydration', () => {
    const saved = { ...initialCheckoutState, productId: 'prod-01', delivery: DELIVERY };

    const state = reduce(initialCheckoutState, {
      type: REMEMBER_REHYDRATED,
      payload: { checkout: saved },
    });

    expect(state).toEqual(saved);
  });

  it('ignores a malformed persisted record and keeps the current state', () => {
    const state = reduce(initialCheckoutState, {
      type: REMEMBER_REHYDRATED,
      payload: { checkout: { units: 'many' } },
    });

    expect(state).toBe(initialCheckoutState);
  });

  it('keeps what the buyer did before rehydration finished over the stored record', () => {
    const current = reduce(initialCheckoutState, productChosen({ productId: 'new', units: 4 }));

    const state = reduce(current, {
      type: REMEMBER_REHYDRATED,
      payload: { checkout: { ...initialCheckoutState, productId: 'old', units: 1 } },
    });

    expect(state).toBe(current);
  });
});

describe('parsePersistedCheckout', () => {
  it.each([
    ['not an object', 'checkout'],
    ['null', null],
    ['units below one', { ...initialCheckoutState, units: 0 }],
    ['an unknown payment status', { ...initialCheckoutState, paymentStatus: 'charged' }],
    [
      'a delivery outside Colombia',
      { ...initialCheckoutState, delivery: { ...DELIVERY, country: 'US' } },
    ],
    ['a delivery missing a field', { ...initialCheckoutState, delivery: { fullName: 'x' } }],
  ])('rejects %s', (_case, value) => {
    expect(parsePersistedCheckout(value)).toBeNull();
  });
});

describe('selectors', () => {
  it('knows whether a transaction is open', () => {
    expect(selectHasOpenTransaction(withState({ transactionId: 't-1' }))).toBe(true);
    expect(selectHasOpenTransaction(withState({}))).toBe(false);
  });

  it.each<[string, Partial<CheckoutState>, ReturnType<typeof selectResumeTarget>]>([
    [
      'a submitted payment',
      { transactionId: 't-1', paymentStatus: 'submitted' },
      { screen: 'status', transactionId: 't-1' },
    ],
    [
      'a payment in flight',
      { transactionId: 't-1', paymentStatus: 'submitting' },
      { screen: 'status', transactionId: 't-1' },
    ],
    [
      'a product and delivery, no payment yet',
      { productId: 'p', delivery: DELIVERY },
      { screen: 'summary' },
    ],
    ['nothing', {}, { screen: 'store' }],
  ])('resumes %s in the right place', (_case, checkout, target) => {
    expect(selectResumeTarget(withState(checkout))).toEqual(target);
  });
});
