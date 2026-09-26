import { formatMoney } from '@/shared/lib/money';

import { MAX_UNITS_PER_ORDER, maxSelectableUnits, stockLabel, stockLevel } from './stock';

const stock = (availableUnits: number, isPurchasable = true) => ({ availableUnits, isPurchasable });

describe('stock rules', () => {
  it.each([
    [stock(0), 'soldOut', 0, 'Agotado'],
    [stock(8, false), 'soldOut', 0, 'Agotado'],
    [stock(1), 'low', 1, 'Última unidad'],
    [stock(5), 'low', 5, 'Últimas 5 unidades'],
    [stock(6), 'available', 6, '6 disponibles'],
    [stock(38), 'available', MAX_UNITS_PER_ORDER, '38 disponibles'],
  ])('%p is %s, allows %i units, reads "%s"', (product, level, max, label) => {
    expect(stockLevel(product)).toBe(level);
    expect(maxSelectableUnits(product)).toBe(max);
    expect(stockLabel(product)).toBe(label);
  });
});

describe('formatMoney', () => {
  it('turns cents into whole Colombian pesos', () => {
    expect(formatMoney(8_999_000)).toBe('$ 89.990');
    expect(formatMoney(480_000, 'COP')).toBe('$ 4.800');
  });
});
