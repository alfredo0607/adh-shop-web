# State

Three homes for state, each with one job. Mixing them is how an app ends up persisting card
numbers or refetching data it already has.

| Home                       | Holds                                                                  | Persisted to `localStorage`                                        |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **RTK Query cache**        | Products, quote, payment terms, the transaction (polled), its delivery | **No.** It is refetched; stale server data is worse than a request |
| **`checkout` slice**       | What the buyer chose and where the order stands                        | **Yes, and only this slice**                                       |
| **Form state** (component) | Card number, expiry, CVC, holder name                                  | **Never**, not in Redux and not on disk                            |

## The `checkout` slice

```ts
interface CheckoutState {
  productId: string | null;
  units: number;
  delivery: DeliveryDetails | null; // buyer name, email, phone, address
  transactionId: string | null; // set once POST /transactions succeeds
  idempotencyKey: string | null; // one per payment attempt
  paymentStatus: "idle" | "submitting" | "submitted" | "failed";
  lastError: ApiErrorCode | null; // the API's error code, never a message
}
```

### Reducers

| Action                                    | Effect                                                               |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `productChosen({ productId, units })`     | Starts or changes the order; clears any previous transaction         |
| `deliverySaved(details)`                  | Stores validated delivery details                                    |
| `transactionOpened({ transactionId })`    | Records the PENDING transaction and creates a fresh `idempotencyKey` |
| `payOrder.pending / fulfilled / rejected` | Moves `paymentStatus`; `rejected` stores `lastError`                 |
| `orderClosed()`                           | Resets everything after the buyer returns to the store               |

### Why the idempotency key is persisted

The key is what makes a payment safe to retry. If the page reloads while the payment request
is in flight, the buyer cannot know whether it reached the API. Retrying **with the same key**
makes the API return the original response instead of charging again, and the API refuses a
second payment for the same transaction under a new key as well. The key is created per
attempt, when a transaction is opened, and cleared with the order.

## Persistence

redux-remember stores exactly one key: `checkout`. Everything else is left out on purpose.

```ts
// app/persistence.ts
export const PERSISTED_SLICES = ["checkout"] as const;
```

- **Never persisted:** card number, CVC, expiry, holder name, the card token (single-use and
  short-lived), and the RTK Query cache.
- **Persisted:** the product and units, delivery details, the transaction id, the idempotency
  key, and the payment status.

A reload on the summary screen therefore keeps the product and the delivery details but asks
for the card again. That is a deliberate security trade: card data never touches storage that
outlives the page.

## Server state rules

- Every request is an RTK Query endpoint, generated from the API's OpenAPI document.
- Tags: `Product` (invalidated when an order closes, so stock is fresh on the product page) and
  `Transaction` (per id).
- The status screen polls `GET /transactions/{id}` every 2 seconds and stops at the first final
  status, or after 2 minutes with a "still processing" message and a manual refresh.
- The quote is never cached across screens (`refetchOnMountOrArgChange`): prices and stock move.

## Selectors

Components read state only through selectors exported by the feature
(`selectCheckout`, `selectOrderTotal`, `selectCanPay`…). A component that reaches into
`state.checkout.something` directly couples itself to the slice's shape.
