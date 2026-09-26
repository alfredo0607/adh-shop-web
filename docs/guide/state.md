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
  paymentStatus: 'idle' | 'submitting' | 'submitted' | 'failed';
  lastError: ApiErrorCode | null; // the API's error code, never a message
}
```

### Reducers

| Action                                   | Effect                                                               |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `productChosen({ productId, units })`    | Starts or changes the order; clears any previous transaction         |
| `deliverySaved(details)`                 | Stores validated delivery details                                    |
| `unitsChanged(units)`                    | Changes the units of the current order                               |
| `transactionOpened(transactionId)`       | Records the PENDING transaction and creates a fresh `idempotencyKey` |
| `paymentSubmitting / Submitted / Failed` | Moves `paymentStatus`; `paymentFailed(code)` stores `lastError`      |
| `orderClosed()`                          | Resets everything after the buyer returns to the store               |

The payment actions are dispatched by the `payOrder` thunk. None of them carries card data;
see [When to use a thunk](./architecture.md#when-to-use-a-thunk).

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
export const PERSISTED_SLICES = ['checkout'] as const;
```

- **Never persisted:** card number, CVC, expiry, holder name, the card token (single-use and
  short-lived), and the RTK Query cache.
- **Persisted:** the product and units, delivery details, the transaction id, the idempotency
  key, and the payment status.

A reload on the summary screen therefore keeps the product and the delivery details but asks
for the card again. That is a deliberate security trade: card data never touches storage that
outlives the page.

### How rehydration works

- The store uses `rememberEnhancer` with the `checkout` allowlist and the `adh-shop:` key
  prefix. Writes are throttled to one every 200 ms.
- The root reducer is **not** wrapped in `rememberReducer`. That wrapper replaces the whole
  state when the stored data arrives, which drops requests RTK Query started before
  rehydration finished. Instead, the `checkout` slice listens for `REMEMBER_REHYDRATED` and
  takes back only its own record.
- Stored data is untrusted: the user or an older version of the app may have written it.
  `parsePersistedCheckout` validates the record, and a malformed one is ignored, so the app
  starts empty instead of crashing.
- What the buyer did in this session wins over what storage holds. The stored record is
  applied only while the slice is still untouched. When storage is empty, the rehydration
  payload carries the state from when the store was created. Applying it anyway would undo
  an action dispatched before rehydration finished.
- `persistence.rehydrated` becomes `true` once the stored data has been read. The resume logic
  waits for it, so it never routes on the empty initial state.
- If the browser refuses storage (private mode, quota, blocked cookies), reads return nothing
  and writes are dropped. The app keeps working without persistence.

## Server state rules

- Every request is an RTK Query endpoint, generated from the API's OpenAPI document.
- The catalogue is **one query for the whole catalogue** (`listCatalogue`, added in
  `api/index.ts`). It follows the API's cursor in pages of 50, the most the API accepts, and
  stops after 10 pages. Filtering, sorting and pagination then happen in the browser: with
  a catalogue this size that is instant, and a filter applied by DynamoDB to a cursor-paged
  query would return short or empty pages.
- **Filters live in the URL**, not in Redux: `?q=&categoria=&precio=&disponibles=1&orden=&pagina=`.
  A filtered page can be shared, reloaded and reached with the back button, and there is no
  second copy to keep in sync. `features/catalog/filters.ts` reads and writes them, ignoring
  anything it does not recognise, and holds the pure filter, sort and pagination functions.
- The product page refetches its product every time it opens (`refetchOnMountOrArgChange`),
  so a buyer coming back from a purchase sees the stock that is left.
- Tags: `Product` (invalidated when an order closes, so stock is fresh on the product page) and
  `Transaction` (per id).
- The status screen polls `GET /transactions/{id}` every 2 seconds and stops at the first final
  status, or after 2 minutes with a "still processing" message and a manual refresh.
- The quote is never cached across screens (`refetchOnMountOrArgChange`): prices and stock move.

## Selectors

Components read state only through selectors exported by the feature
(`selectCheckout`, `selectOrderTotal`, `selectCanPay`…). A component that reaches into
`state.checkout.something` directly couples itself to the slice's shape.
