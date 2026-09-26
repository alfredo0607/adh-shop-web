import { REMEMBER_REHYDRATED } from 'redux-remember';

import { aProduct } from '@/test/fixtures';

import {
  cartCleared,
  cartSlice,
  initialCartState,
  itemAdded,
  itemRemoved,
  parsePersistedCart,
  selectCanAdd,
  selectCartCount,
  unitsSet,
  type CartState,
} from './cartSlice';
import { viewCart } from './cartView';

const reduce = cartSlice.reducer;
const withLines = (lines: CartState['lines']): CartState => ({ lines });
const root = (cart: CartState) => ({ cart, cartPanel: { isOpen: false } });

describe('cart slice', () => {
  it('adds a product, and more units of one already there', () => {
    let state = reduce(initialCartState, itemAdded({ productId: 'a', units: 1 }));
    state = reduce(state, itemAdded({ productId: 'b', units: 2 }));
    state = reduce(state, itemAdded({ productId: 'a', units: 3 }));

    expect(state.lines).toEqual([
      { productId: 'a', units: 4 },
      { productId: 'b', units: 2 },
    ]);
    expect(selectCartCount(root(state))).toBe(6);
  });

  it('never holds more units of a product than an order may', () => {
    const state = reduce(
      withLines([{ productId: 'a', units: 8 }]),
      itemAdded({ productId: 'a', units: 5 }),
    );

    expect(state.lines).toEqual([{ productId: 'a', units: 10 }]);
  });

  it('refuses an eleventh distinct product, and says whether one fits', () => {
    const full = withLines(
      Array.from({ length: 10 }, (_, i) => ({ productId: `p${i}`, units: 1 })),
    );

    expect(reduce(full, itemAdded({ productId: 'new', units: 1 })).lines).toHaveLength(10);
    expect(selectCanAdd('new')(root(full))).toBe(false);
    expect(selectCanAdd('p3')(root(full))).toBe(true);
  });

  it('sets units within the limits, removes a line and empties the cart', () => {
    let state = withLines([
      { productId: 'a', units: 1 },
      { productId: 'b', units: 1 },
    ]);

    state = reduce(state, unitsSet({ productId: 'a', units: 25 }));
    expect(state.lines[0]?.units).toBe(10);
    state = reduce(state, unitsSet({ productId: 'a', units: 0 }));
    expect(state.lines[0]?.units).toBe(1);
    state = reduce(state, unitsSet({ productId: 'missing', units: 3 }));
    state = reduce(state, itemRemoved('a'));
    expect(state.lines).toEqual([{ productId: 'b', units: 1 }]);
    expect(reduce(state, cartCleared()).lines).toEqual([]);
  });

  it('takes the stored cart back only while this session has not touched it', () => {
    const stored = { lines: [{ productId: 'old', units: 1 }] };
    const rehydrate = { type: REMEMBER_REHYDRATED, payload: { cart: stored } };

    expect(reduce(initialCartState, rehydrate).lines).toEqual(stored.lines);
    expect(reduce(withLines([{ productId: 'new', units: 2 }]), rehydrate).lines).toEqual([
      { productId: 'new', units: 2 },
    ]);
  });

  it.each([
    ['nothing', undefined],
    ['lines that are not a list', { lines: 'a:1' }],
    ['too many units', { lines: [{ productId: 'a', units: 50 }] }],
    ['a strange product id', { lines: [{ productId: '<script>', units: 1 }] }],
  ])('drops a stored cart with %s', (_case, value) => {
    expect(parsePersistedCart(value)).toBeNull();
  });
});

describe('viewCart', () => {
  const espresso = aProduct({ id: 'espresso', priceInCents: 100_000, availableUnits: 3 });
  const grinder = aProduct({ id: 'grinder', priceInCents: 50_000, availableUnits: 20 });
  const soldOut = aProduct({ id: 'beans', availableUnits: 0, isPurchasable: false });

  it('prices each line with today’s price and adds them up', () => {
    const view = viewCart(
      [
        { productId: 'espresso', units: 2 },
        { productId: 'grinder', units: 1 },
      ],
      [espresso, grinder],
    );

    expect(view.rows.map((row) => row.lineTotalInCents)).toEqual([200_000, 50_000]);
    expect(view.subtotalInCents).toBe(250_000);
    expect(view.hasUnavailable).toBe(false);
    expect(view.checkoutItems).toEqual([
      { productId: 'espresso', units: 2 },
      { productId: 'grinder', units: 1 },
    ]);
  });

  it('offers no more than is in stock now', () => {
    const view = viewCart([{ productId: 'espresso', units: 7 }], [espresso]);

    expect(view.rows[0]).toMatchObject({ units: 3, maxUnits: 3, lineTotalInCents: 300_000 });
    expect(view.checkoutItems).toEqual([{ productId: 'espresso', units: 3 }]);
  });

  it('flags what sold out or left the catalogue, and keeps it out of the order', () => {
    const view = viewCart(
      [
        { productId: 'beans', units: 1 },
        { productId: 'gone', units: 2 },
        { productId: 'grinder', units: 1 },
      ],
      [soldOut, grinder],
    );

    expect(view.rows.map((row) => row.available)).toEqual([false, false, true]);
    expect(view.rows[1]?.product).toBeUndefined();
    expect(view.hasUnavailable).toBe(true);
    expect(view.subtotalInCents).toBe(50_000);
    expect(view.checkoutItems).toEqual([{ productId: 'grinder', units: 1 }]);
  });
});
