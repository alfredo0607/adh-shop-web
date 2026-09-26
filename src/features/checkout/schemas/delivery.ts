import { z } from 'zod';

import type { DeliveryDetails } from '../checkoutSlice';

/**
 * The delivery form's rules. They mirror the API's own (its Customer and
 * DeliveryAddress), so the buyer finds a mistake in the form rather than
 * after pressing Pay. Messages are copy keys.
 */

/** Colombia's departments and its capital district, the `region` the API stores. */
export const COLOMBIAN_REGIONS = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlántico',
  'Bogotá D.C.',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada',
] as const;

const collapse = (value: string): string => value.trim().replace(/\s+/g, ' ');

const text = (min: number, max: number, message: string) =>
  z
    .string()
    .transform(collapse)
    .refine((value) => value !== '', { message: 'checkout.errors.required', abort: true })
    .refine((value) => value.length >= min && value.length <= max, message);

/** The same patterns the API applies. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9]{7,15}$/;

export const deliverySchema = z.object({
  fullName: text(3, 100, 'checkout.errors.fullName'),
  email: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => value !== '', { message: 'checkout.errors.required', abort: true })
    .refine((value) => value.length <= 254 && EMAIL.test(value), {
      message: 'checkout.errors.email',
      abort: true,
    }),
  phone: z
    .string()
    .transform((value) => value.replace(/[\s()-]/g, ''))
    .refine((value) => value !== '', { message: 'checkout.errors.required', abort: true })
    .refine((value) => PHONE.test(value), { message: 'checkout.errors.phone', abort: true }),
  addressLine1: text(5, 120, 'checkout.errors.address'),
  addressLine2: z
    .string()
    .transform(collapse)
    .refine((value) => value.length <= 120, { message: 'checkout.errors.address', abort: true }),
  city: text(2, 60, 'checkout.errors.city'),
  region: z
    .string()
    .refine(
      (value) => (COLOMBIAN_REGIONS as readonly string[]).includes(value),
      'checkout.errors.region',
    ),
  postalCode: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value === '' || /^\d{6}$/.test(value), {
      message: 'checkout.errors.postalCode',
      abort: true,
    }),
});

export type DeliveryFormValues = z.input<typeof deliverySchema>;
export type DeliveryValues = z.output<typeof deliverySchema>;

/** Optional fields left blank are left out, as the API expects. */
export const toDeliveryDetails = (values: DeliveryValues): DeliveryDetails => ({
  fullName: values.fullName,
  email: values.email,
  phone: values.phone,
  addressLine1: values.addressLine1,
  ...(values.addressLine2 === '' ? {} : { addressLine2: values.addressLine2 }),
  city: values.city,
  region: values.region,
  ...(values.postalCode === '' ? {} : { postalCode: values.postalCode }),
  country: 'CO',
});

/** Pre-fills the form from details saved earlier, if any. */
export const toDeliveryFormValues = (details: DeliveryDetails | null): DeliveryFormValues => ({
  fullName: details?.fullName ?? '',
  email: details?.email ?? '',
  phone: details?.phone ?? '',
  addressLine1: details?.addressLine1 ?? '',
  addressLine2: details?.addressLine2 ?? '',
  city: details?.city ?? '',
  region: details?.region ?? '',
  postalCode: details?.postalCode ?? '',
});
