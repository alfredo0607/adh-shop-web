import {
  cardSchema,
  detectBrand,
  expiryIsValid,
  formatCardNumber,
  formatExpiry,
  passesLuhn,
  toCardInput,
} from './card';
import { deliverySchema, toDeliveryDetails, toDeliveryFormValues } from './delivery';

const validCard = {
  number: '4242 4242 4242 4242',
  expiry: '12/34',
  cvc: '123',
  holder: 'Laura Gómez',
  installments: '1',
};

/** The first message per field: the one the form shows. */
const errorsOf = (result: {
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}): Record<string, string> => {
  const first: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    first[String(issue.path[0])] ??= issue.message;
  }
  return first;
};

describe('card rules', () => {
  it.each([
    ['4242424242424242', true],
    ['4111111111111111', true],
    ['5555555555554444', true],
    ['2223003122003222', true],
    ['4242424242424241', false],
    ['1234', false],
    ['', false],
    ['4242x', false],
  ])('Luhn: %s → %s', (digits, valid) => {
    expect(passesLuhn(digits)).toBe(valid);
  });

  it.each([
    ['4', 'visa'],
    ['4242 42', 'visa'],
    ['51', 'mastercard'],
    ['55', 'mastercard'],
    ['2221', 'mastercard'],
    ['2720 99', 'mastercard'],
    ['2220', 'unknown'],
    ['2721', 'unknown'],
    ['222', 'unknown'],
    ['50', 'unknown'],
    ['56', 'unknown'],
    ['3782', 'unknown'],
    ['', 'unknown'],
  ])('brand of %s is %s', (digits, brand) => {
    expect(detectBrand(digits)).toBe(brand);
  });

  it('groups the number in fours and stops at 19 digits', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('4242-42')).toBe('4242 42');
    expect(formatCardNumber('4'.repeat(25)).replace(/ /g, '')).toHaveLength(19);
  });

  it.each([
    ['0', '', '0'],
    ['1', '', '1'],
    ['8', '', '08/'],
    ['12', '', '12/'],
    ['123', '12/', '12/3'],
    ['12/345', '12/34', '12/34'],
    ['12', '12/', '1'],
  ])('expiry typed as %s (was %s) shows %s', (typed, previous, shown) => {
    expect(formatExpiry(typed, previous)).toBe(shown);
  });

  it('accepts an expiry until the end of its month, and not decades ahead', () => {
    const now = new Date(2026, 8, 25);

    expect(expiryIsValid('09/26', now)).toBe(true);
    expect(expiryIsValid('08/26', now)).toBe(false);
    expect(expiryIsValid('13/30', now)).toBe(false);
    expect(expiryIsValid('00/30', now)).toBe(false);
    expect(expiryIsValid('12/46', now)).toBe(true);
    expect(expiryIsValid('12/47', now)).toBe(false);
    expect(expiryIsValid('1230', now)).toBe(false);
  });
});

describe('cardSchema', () => {
  it('accepts a well-formed test card and normalises it', () => {
    const result = cardSchema.safeParse({ ...validCard, holder: '  Laura   Gómez ' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      number: '4242424242424242',
      expiry: '12/34',
      cvc: '123',
      holder: 'Laura Gómez',
      installments: 1,
    });
  });

  it.each([
    ['number', '', 'checkout.errors.required'],
    ['number', '3782 822463 10005', 'checkout.errors.cardUnsupported'],
    ['number', '4242 4242 4242 4241', 'checkout.errors.cardNumber'],
    ['number', '4242 4242', 'checkout.errors.cardNumber'],
    ['expiry', '', 'checkout.errors.required'],
    ['expiry', '1/3', 'checkout.errors.expiryFormat'],
    ['expiry', '01/20', 'checkout.errors.expiryPast'],
    ['cvc', '12', 'checkout.errors.cvc'],
    ['cvc', '1234', 'checkout.errors.cvc'],
    ['holder', 'Ana', 'checkout.errors.holderLength'],
    ['holder', 'Laura G0mez', 'checkout.errors.holderLetters'],
  ])('rejects %s = %p with %s', (field, value, message) => {
    const result = cardSchema.safeParse({ ...validCard, [field]: value });

    expect(errorsOf(result)[field]).toBe(message);
  });

  it('keeps the installments between 1 and 36', () => {
    expect(cardSchema.safeParse({ ...validCard, installments: '0' }).success).toBe(false);
    expect(cardSchema.safeParse({ ...validCard, installments: '37' }).success).toBe(false);
    expect(cardSchema.safeParse({ ...validCard, installments: '36' }).success).toBe(true);
  });

  it('turns valid values into what tokenisation and the summary need', () => {
    const parsed = cardSchema.parse({
      ...validCard,
      number: '5555 5555 5555 4444',
      installments: '3',
    });

    expect(toCardInput(parsed)).toEqual({
      details: {
        number: '5555555555554444',
        expiryMonth: '12',
        expiryYear: '34',
        cvc: '123',
        holder: 'Laura Gómez',
      },
      installments: 3,
      brand: 'mastercard',
      lastFour: '4444',
    });
  });
});

describe('deliverySchema', () => {
  const valid = {
    fullName: '  Laura   Gómez ',
    email: ' Laura@Example.COM ',
    phone: '+57 300 123 4567',
    addressLine1: 'Calle 93 # 11-26',
    addressLine2: '',
    city: 'Bogotá',
    region: 'Bogotá D.C.',
    postalCode: '',
  };

  it('normalises what the buyer typed, the way the API does', () => {
    const parsed = deliverySchema.parse(valid);

    expect(toDeliveryDetails(parsed)).toEqual({
      fullName: 'Laura Gómez',
      email: 'laura@example.com',
      phone: '+573001234567',
      addressLine1: 'Calle 93 # 11-26',
      city: 'Bogotá',
      region: 'Bogotá D.C.',
      country: 'CO',
    });
  });

  it('keeps the optional fields when given', () => {
    const parsed = deliverySchema.parse({
      ...valid,
      addressLine2: 'Apartamento 502',
      postalCode: '110221',
    });

    expect(toDeliveryDetails(parsed)).toMatchObject({
      addressLine2: 'Apartamento 502',
      postalCode: '110221',
    });
  });

  it.each([
    ['fullName', 'Al', 'checkout.errors.fullName'],
    ['fullName', '   ', 'checkout.errors.required'],
    ['email', 'laura@', 'checkout.errors.email'],
    ['phone', '12345', 'checkout.errors.phone'],
    ['phone', '300-abc-4567', 'checkout.errors.phone'],
    ['addressLine1', 'Cl 1', 'checkout.errors.address'],
    ['city', 'B', 'checkout.errors.city'],
    ['region', 'Florida', 'checkout.errors.region'],
    ['postalCode', '1102', 'checkout.errors.postalCode'],
  ])('rejects %s = %p with %s', (field, value, message) => {
    const result = deliverySchema.safeParse({ ...valid, [field]: value });

    expect(errorsOf(result)[field]).toBe(message);
  });

  it('pre-fills the form from saved details, and starts empty without them', () => {
    const details = toDeliveryDetails(deliverySchema.parse(valid));

    expect(toDeliveryFormValues(details)).toMatchObject({
      fullName: 'Laura Gómez',
      postalCode: '',
    });
    expect(toDeliveryFormValues(null).email).toBe('');
  });
});
