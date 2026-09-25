# Architecture

## Technology choices

| Concern       | Choice                                                           | Why                                                                                                                                          |
| ------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| UI            | **React 19 + TypeScript (strict)**                               | The brief allows React or Vue. Strict TypeScript matches the API and turns contract drift into a compile error.                              |
| Build         | **Vite**                                                         | Instant dev server and small, hashed production bundles.                                                                                     |
| State         | **Redux Toolkit** (slices)                                       | The brief requires Redux following Flux. Slices are Redux without the boilerplate.                                                           |
| Server data   | **RTK Query**                                                    | Caching, loading and error states, invalidation, and polling for the payment outcome, with no hand-written fetch code.                       |
| Orchestration | **One `createAsyncThunk`: `payOrder`**                           | See [When to use a thunk](#when-to-use-a-thunk).                                                                                             |
| Persistence   | **redux-remember**, with an allowlist                            | Lighter and better maintained than redux-persist. Only an allowlisted slice is stored; see [state.md](./state.md).                           |
| API types     | **`@rtk-query/codegen-openapi`** from the API's `/api/docs-json` | Endpoints and types are generated from the live contract, so a breaking API change fails the build instead of a user's checkout.             |
| Routing       | **React Router**                                                 | Each step has a URL, so reloading and the back button behave.                                                                                |
| Validation    | **zod** + pure functions (Luhn, card brand, expiry)              | Pure and deterministic, cheap to test to 100%.                                                                                               |
| Styling       | **CSS Modules + CSS custom properties**, flexbox and grid        | The brief rewards CSS skill and favours flexbox and grid. No component library, so the work is visibly ours. See [styling.md](./styling.md). |
| Tests         | **Jest** + React Testing Library + MSW                           | The brief says "create them with Jest", so Jest it is, even though Vitest would be the Vite default. See [testing.md](./testing.md).         |

## Folder structure

Organised by feature. A feature owns its components, state, validation and tests.

```
src/
├── app/                    Composition root: store, persistence, router, <App/>
│   ├── store.ts
│   ├── persistence.ts      What redux-remember stores, and nothing else
│   └── router.tsx
├── api/
│   ├── generated/          Endpoints and types generated from the API's OpenAPI document
│   ├── api.ts              RTK Query base: base URL, tags, normalised errors
│   └── gateway.ts          Card tokenisation, sent straight to the payment gateway
├── features/
│   ├── catalog/            Product page, product card, unit selector
│   ├── checkout/
│   │   ├── checkoutSlice.ts
│   │   ├── payOrder.ts     The one thunk
│   │   ├── validation/     card.ts (Luhn, brand, expiry) · delivery.ts (zod)
│   │   ├── CheckoutModal/  Card and delivery form
│   │   └── SummaryBackdrop/
│   └── order-status/       Final status, polling, delivery details
├── shared/
│   ├── ui/                 Button, Modal, Backdrop, Field, CardBrandIcon, Money, Spinner
│   ├── lib/                Money formatting, idempotency keys, configuration
│   └── styles/             tokens.css, reset.css
└── test/                   MSW handlers, renderWithStore, fixtures
```

### Dependency rules

- `shared/` depends on nothing in `features/` or `app/`. It is the vocabulary, not the story.
- A feature may use `shared/` and `api/`, and may read another feature's **exported
  selectors**, but it never reaches into another feature's files. Cross-feature flow goes
  through the router or the store.
- `app/` is the only place that knows every feature. It wires them together.
- Generated code in `api/generated/` is never edited by hand. It is regenerated.

These are enforced with ESLint import rules once the scaffold exists (step 1 of the
[roadmap](./roadmap.md)).

## Where logic goes

| Kind of work                      | Where                           | Example                                                   |
| --------------------------------- | ------------------------------- | --------------------------------------------------------- |
| Talking to the API                | RTK Query endpoint              | list products, quote, create a transaction, poll it       |
| Local state changes               | Slice reducer                   | choose units, save delivery details, reset after an order |
| A flow of several dependent calls | The `payOrder` thunk            | tokenise the card → pay → mark the payment submitted      |
| Rules about input                 | Pure functions in `validation/` | Luhn check, brand detection, expiry in the future         |
| Rendering                         | Components                      | no business rules; they read selectors and dispatch       |

### When to use a thunk

Only when an action is a **sequence of dependent asynchronous steps that must not live in a
component**. There is exactly one in the plan, `payOrder`:

1. Turn the card into a token with the gateway, using the public key from `GET /payment-terms`.
2. Reuse the stored `Idempotency-Key`, or create one for a first attempt.
3. `POST /transactions/{id}/payment` with the token.
4. Mark the payment as submitted; the status screen then polls for the outcome.

The thunk calls RTK Query endpoints with `dispatch(endpoint.initiate(...)).unwrap()`; it
never calls `fetch` itself. A single request is a RTK Query endpoint, never a thunk.
Wrapping one request in a thunk is the pre-RTK-Query pattern, and adds code that RTK Query
already provides.

## The API contract

- **Base URL**: `https://adh-api.alfredo-dominguez.dev/api/v1` in production, from
  `VITE_API_BASE_URL`.
- **CORS**: the production API answers preflights only for this storefront's origin,
  `https://adh-shop.alfredo-dominguez.dev`. Local development does not widen that: the Vite
  dev server proxies `/api` to the API, so the browser only ever talks to `localhost` and
  no cross-origin request is made.
- **Errors** share one envelope, `{ error: { code, message, details }, requestId }`. The UI
  branches on `code`, never on `message`.
- **Money** arrives in integer minor units (COP cents) and is formatted only at render time.
