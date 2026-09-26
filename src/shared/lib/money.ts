const formatters = new Map<string, Intl.NumberFormat>();

const formatterFor = (currency: string): Intl.NumberFormat => {
  let formatter = formatters.get(currency);
  if (formatter === undefined) {
    // Prices are whole pesos; showing ",00" on every amount is noise.
    formatter = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    formatters.set(currency, formatter);
  }
  return formatter;
};

/**
 * Formats an amount the API sends in integer minor units (cents) for display.
 * The conversion happens here, at render time only: amounts are never stored
 * or added up as decimals.
 */
export const formatMoney = (cents: number, currency = 'COP'): string =>
  formatterFor(currency).format(cents / 100);
