# Forms

Two forms carry the checkout: the **card** and the **delivery details**. Both use
react-hook-form with zod schemas.

## Why this pairing

| Need                                         | How                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| Card data must stay out of Redux and storage | react-hook-form keeps values in the form, which unmounts with the modal         |
| Typing must stay fast on low-end phones      | Uncontrolled inputs: a keystroke does not re-render the whole form              |
| One definition of "valid"                    | The zod schema drives the form, and the same schema is unit-tested on its own   |
| Strong types                                 | The form's value type is inferred from the schema: `z.infer<typeof cardSchema>` |

## Schemas

Schemas live in `features/checkout/schemas/` and are pure: no React, no DOM.

```ts
export const cardSchema = z.object({
  number: z
    .string()
    .transform(digitsOnly)
    .refine(passesLuhn, 'card.number.invalid')
    .refine((n) => detectBrand(n) !== 'unknown', 'card.number.unsupported'),
  expiry: z
    .string()
    .regex(/^\d{2}\/\d{2}$/, 'card.expiry.format')
    .refine(notExpired, 'card.expiry.past'),
  cvc: z.string().regex(/^\d{3,4}$/, 'card.cvc.invalid'),
  holder: z
    .string()
    .trim()
    .min(5, 'card.holder.short')
    .max(60)
    .regex(/^[\p{L} ]+$/u, 'card.holder.letters'),
  installments: z.coerce.number().int().min(1).max(36),
});
```

Messages in schemas are **copy keys**, not text. The form renders them through the es-CO copy
catalogue, so validation messages follow the same language rule as everything else the buyer
sees.

The delivery schema mirrors the API's own rules (see the API's `DeliveryAddress` and
`Customer`), so the buyer finds out in the form, not after pressing Pay:

| Field        | Rule, same as the API                         |
| ------------ | --------------------------------------------- |
| Full name    | 3–100 characters                              |
| Email        | a plausible address, normalised to lower case |
| Phone        | 7–15 digits, optional `+`                     |
| Address      | 5–120 characters                              |
| City, region | 2–60 characters                               |
| Postal code  | optional, 6 digits                            |
| Country      | Colombia only                                 |

## Behaviour

| Rule                                                                                                       | Why                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Validate on blur, then on change once a field has been touched                                             | No red text while the buyer is still typing a field for the first time; live correction afterwards |
| The card number is grouped as `4242 4242 4242 4242` while typing                                           | Easier to read back and compare with the card                                                      |
| The brand logo appears as soon as the first digits identify it                                             | The brief's VISA / Mastercard detection                                                            |
| Expiry is typed as `MM/AA`, with the slash inserted automatically                                          | Fewer keystrokes on a phone keypad                                                                 |
| `inputmode="numeric"` on number, expiry and CVC                                                            | The numeric keypad on mobile                                                                       |
| `autocomplete="cc-number"`, `cc-exp`, `cc-csc`, `cc-name`, and address tokens on delivery                  | Browser autofill works, and payment fields are treated as sensitive                                |
| Errors are linked to their input with `aria-describedby`, and the first invalid field is focused on submit | Accessible, and the buyer lands on what to fix                                                     |
| The submit button stays enabled; submitting shows every error at once                                      | A disabled button gives no reason why                                                              |
| Delivery details are saved to the `checkout` slice on a valid submit; card details are not                 | See [state.md](./state.md)                                                                         |

## Components

Form fields are built once in `shared/ui/` (`Field`, `TextInput`, `Select`, `Checkbox`) on Radix
Primitives where a primitive exists, and wired to react-hook-form through `Controller` only
where an input is not a native element (Radix Select and Checkbox).
