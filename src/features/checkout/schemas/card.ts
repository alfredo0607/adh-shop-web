import { z } from 'zod';

import type { CardDetails } from '@/api/gateway';

/**
 * The card form's rules, as pure functions and a zod schema: no React, no DOM.
 * See docs/guide/forms.md. Validation messages are copy keys, rendered by the
 * form through the es-CO catalogue.
 */

export type CardBrand = 'visa' | 'mastercard' | 'unknown';

export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/**
 * The Luhn checksum every real card number satisfies. It catches a mistyped
 * digit or two swapped neighbours before the number goes anywhere.
 */
export const passesLuhn = (digits: string): boolean => {
  if (!/^\d+$/.test(digits)) return false;

  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

/**
 * The brand, from the first digits (the BIN): VISA starts with 4, Mastercard
 * with 51–55 or 2221–2720. Known from the first digit or four, so the logo can
 * appear while the buyer is still typing.
 */
export const detectBrand = (value: string): CardBrand => {
  const digits = digitsOnly(value);
  if (digits.startsWith('4')) return 'visa';

  const two = Number(digits.slice(0, 2));
  if (two >= 51 && two <= 55) return 'mastercard';

  const four = Number(digits.slice(0, 4));
  if (digits.length >= 4 && four >= 2221 && four <= 2720) return 'mastercard';

  return 'unknown';
};

/** Lengths each brand issues. */
const LENGTHS: Readonly<Record<Exclude<CardBrand, 'unknown'>, readonly number[]>> = {
  visa: [13, 16, 19],
  mastercard: [16],
};

export const MAX_CARD_DIGITS = 19;

/** `4242424242424242` → `4242 4242 4242 4242`, as the buyer types. */
export const formatCardNumber = (value: string): string =>
  digitsOnly(value)
    .slice(0, MAX_CARD_DIGITS)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

/**
 * `08` → `08/`, `082` → `08/2`: the slash is typed for the buyer. A first
 * digit above 1 can only be a month on its own, so `8` becomes `08/`.
 */
export const formatExpiry = (value: string, previous = ''): string => {
  let digits = digitsOnly(value).slice(0, 4);
  if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`;

  // Deleting the slash deletes the digit before it, rather than putting it back.
  const deletingSlash = previous.endsWith('/') && value.length < previous.length;
  if (deletingSlash) return digits.slice(0, 1);

  return digits.length >= 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

/** How far ahead an expiry date is believable. */
const MAX_YEARS_AHEAD = 20;

/**
 * A card is valid until the end of its expiry month. `now` is a parameter so
 * the rule can be tested against any date.
 */
export const expiryIsValid = (value: string, now: Date = new Date()): boolean => {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (match === null) return false;

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;

  const endOfMonth = new Date(year, month, 1);
  const latest = new Date(now.getFullYear() + MAX_YEARS_AHEAD + 1, 0, 1);
  return endOfMonth > now && endOfMonth <= latest;
};

export const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24, 36] as const;

export const cardSchema = z.object({
  number: z
    .string()
    .transform(digitsOnly)
    .refine((digits) => digits.length > 0, { message: 'checkout.errors.required', abort: true })
    .refine((digits) => detectBrand(digits) !== 'unknown', {
      message: 'checkout.errors.cardUnsupported',
      abort: true,
    })
    .refine(
      (digits) => {
        const brand = detectBrand(digits);
        return brand !== 'unknown' && LENGTHS[brand].includes(digits.length) && passesLuhn(digits);
      },
      { message: 'checkout.errors.cardNumber', abort: true },
    ),
  expiry: z
    .string()
    .refine((value) => value !== '', { message: 'checkout.errors.required', abort: true })
    .refine((value) => /^\d{2}\/\d{2}$/.test(value), {
      message: 'checkout.errors.expiryFormat',
      abort: true,
    })
    .refine((value) => expiryIsValid(value), {
      message: 'checkout.errors.expiryPast',
      abort: true,
    }),
  cvc: z
    .string()
    .refine((value) => value !== '', { message: 'checkout.errors.required', abort: true })
    .refine((value) => /^\d{3}$/.test(value), { message: 'checkout.errors.cvc', abort: true }),
  holder: z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, ' '))
    .refine((value) => value !== '', { message: 'checkout.errors.required', abort: true })
    .refine((value) => value.length >= 5 && value.length <= 60, {
      message: 'checkout.errors.holderLength',
      abort: true,
    })
    .refine((value) => /^[\p{L} ]+$/u.test(value), {
      message: 'checkout.errors.holderLetters',
      abort: true,
    }),
  installments: z.coerce.number().int().min(1).max(36),
});

/** What the form holds while the buyer types. */
export type CardFormValues = z.input<typeof cardSchema>;

/** What a valid form produces. */
export type CardValues = z.output<typeof cardSchema>;

/** The card as the gateway's tokenisation takes it, plus the installments for the payment. */
export interface CardInput {
  details: CardDetails;
  installments: number;
  brand: Exclude<CardBrand, 'unknown'>;
  /** For the summary: the brand and these digits are all it may show. */
  lastFour: string;
}

export const toCardInput = (values: CardValues): CardInput => {
  const [month = '', year = ''] = values.expiry.split('/');
  const brand = detectBrand(values.number);

  return {
    details: {
      number: values.number,
      expiryMonth: month,
      expiryYear: year,
      cvc: values.cvc,
      holder: values.holder,
    },
    installments: values.installments,
    brand: brand === 'unknown' ? 'visa' : brand,
    lastFour: values.number.slice(-4),
  };
};
