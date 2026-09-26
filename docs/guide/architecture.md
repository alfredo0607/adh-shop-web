# Architecture

## Technology choices

| Concern          | Choice                                                           | Why                                                                                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI               | **React 19 + TypeScript (strict)**                               | The brief allows React or Vue. Strict TypeScript matches the API and turns contract drift into a compile error.                                                                                                                                  |
| Build            | **Vite**                                                         | Instant dev server and small, hashed production bundles.                                                                                                                                                                                         |
| State            | **Redux Toolkit** (slices)                                       | The brief requires Redux following Flux. Slices are Redux without the boilerplate.                                                                                                                                                               |
| Server data      | **RTK Query**                                                    | Caching, loading and error states, invalidation, and polling for the payment outcome, with no hand-written fetch code.                                                                                                                           |
| Orchestration    | **One plain thunk: `payOrder`**                                  | See [When to use a thunk](#when-to-use-a-thunk).                                                                                                                                                                                                 |
| Persistence      | **redux-remember**, with an allowlist                            | Lighter and better maintained than redux-persist. Only an allowlisted slice is stored; see [state.md](./state.md).                                                                                                                               |
| API types        | **`@rtk-query/codegen-openapi`** from the API's `/api/docs-json` | Endpoints and types are generated from the live contract, so a breaking API change fails the build instead of a user's checkout.                                                                                                                 |
| Routing          | **React Router**                                                 | Each step has a URL, so reloading and the back button behave.                                                                                                                                                                                    |
| Forms            | **react-hook-form** + **zod** (`@hookform/resolvers`)            | Uncontrolled inputs keep typing fast on phones. Card data stays in the form, out of Redux. One schema validates both the form and the tests. See [forms.md](./forms.md).                                                                         |
| UI behaviour     | **Radix UI Primitives** (unstyled)                               | Dialog (modal and side panel) and Toast with correct focus management, keyboard support and ARIA across browsers. **Primitives only**: they ship no styles, so every visual decision is our own CSS. Radix Themes, which is styled, is not used. |
| Icons            | **lucide-react**, plus the card brands' own marks as local SVGs  | Consistent, tree-shaken line icons. Lucide has no brand logos, so VISA and Mastercard use their official acceptance marks.                                                                                                                       |
| Error boundaries | **react-error-boundary**                                         | A render crash shows a recovery screen instead of a blank page. See [errors.md](./errors.md).                                                                                                                                                    |
| Styling          | **CSS Modules + CSS custom properties**, flexbox and grid        | The brief rewards CSS skill and favours flexbox and grid. No CSS framework: styling is ours, on top of unstyled primitives. See [styling.md](./styling.md).                                                                                      |
| Tests            | **Jest** + React Testing Library + MSW                           | The brief says "create them with Jest", so Jest it is, even though Vitest would be the Vite default. See [testing.md](./testing.md).                                                                                                             |

### Checked against the brief

| The brief says                                                                    | How this stack meets it                                                                                               |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| "ReactJS or VueJS. NO other frameworks are allowed"                               | React is the only application framework. Everything else is a library used inside it, as Redux is                     |
| "Use of either Redux or Vuex is mandatory, following Flux"                        | Redux Toolkit holds the application state. Form state is local and short-lived on purpose, because it holds card data |
| "Use CSS frameworks of your preference, but we foster you to use flexbox or grid" | No CSS framework. Radix Primitives brings behaviour, not styles; layout is our own flexbox and grid                   |
| "Unit tests… created with Jest"                                                   | Jest is the runner; see [testing.md](./testing.md)                                                                    |

## Language

| Audience                                                                                  | Language               | Where                                                          |
| ----------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| **Developers**: code, identifiers, comments, tests, commits, pull requests, documentation | **English**            | Everywhere in the repository                                   |
| **Customers**: every text the buyer sees, including error messages and order statuses     | **Spanish (Colombia)** | Only in `src/shared/copy/es-CO.ts`, never inline in components |

- Components take text from the copy catalogue by key, so the storefront could gain a
  language without touching a component.
- Money and dates are formatted with the `es-CO` locale: `$ 91.690` and `30 de septiembre`.
- The document declares `<html lang="es-CO">`, which screen readers and browsers use to
  pronounce and hyphenate correctly.

## Folder structure

Organised by feature. A feature owns its components, state, validation and tests.

```
src/
├── app/                    Composition root: store, persistence, router, <App/>
│   ├── store.ts
│   ├── persistence.ts      What redux-remember stores, and nothing else
│   ├── listeners.ts        Global error listener (toasts for unexpected failures)
│   ├── layout/             Shell, header (actions, category navigation) and footer
│   └── router.tsx          Routes, each with an error boundary
├── api/
│   ├── generated/          Endpoints and types generated from the API's OpenAPI document
│   ├── emptyApi.ts         The empty RTK Query API the generated endpoints attach to
│   ├── baseQuery.ts        Base URL, timeout, error normalisation, retries for reads
│   ├── index.ts            Tags and cache rules layered on the generated endpoints
│   ├── openapi.json        Snapshot of the API contract the code is generated from
│   └── gateway.ts          Card tokenisation: a plain function, not an endpoint
├── features/
│   ├── cart/               Cart slice, the side panel, the header button, viewCart
│   ├── catalog/            Catalogue grid, filters (URL state), product card and page, unit selector
│   ├── checkout/
│   │   ├── checkoutSlice.ts
│   │   ├── payOrder.ts     The one thunk: open the transaction, tokenise, pay
│   │   ├── orderSettled.ts Closes the order once the payment has an outcome
│   │   ├── schemas/        card.ts (Luhn, brand, expiry) · delivery.ts (zod)
│   │   ├── session.ts      The card, in memory, while the checkout is open
│   │   ├── CheckoutLayout  Route /checkout: the order, with the form or the summary over it
│   │   ├── CheckoutForm    Card and delivery form, in a modal
│   │   ├── OrderSummary    The summary in a backdrop: fees, terms, the pay button
│   │   └── SummaryBackdrop/
│   └── orders/             Final status, polling, delivery details
├── shared/
│   ├── ui/                 Our components: Modal, Drawer, Toast (on Radix Primitives), Field,
│   │                       TextInput, SelectInput, Button, Money, Stepper, Pagination,
│   │                       PaymentMethods (the accepted card brands), Drawer, Backdrop
│   ├── errors/             AppError, normalisation, error-code → copy key mapping
│   ├── copy/               es-CO.ts: every customer-facing text
│   ├── lib/                Formatting, idempotency keys, configuration
│   └── styles/             tokens.css, reset.css
└── test/                   MSW handlers, renderWithStore, fixtures, jsdom polyfills
```

### Dependency rules

- `shared/` depends on nothing in `features/` or `app/`. It is the vocabulary, not the story.
- A feature may use `shared/` and `api/`, and may read another feature's **exported
  selectors**, but it never reaches into another feature's files. Cross-feature flow goes
  through the router or the store.
- Radix is imported **only inside `shared/ui/`**. Features use our components, never Radix
  directly, so the look and the behaviour stay in one place.
- `app/` is the only place that knows every feature. It wires them together.
- Generated code in `api/generated/` is never edited by hand. It is regenerated.

These are enforced with ESLint import rules once the scaffold exists (step 1 of the
[roadmap](./roadmap.md)).

## Where logic goes

| Kind of work                      | Where                                        | Example                                                   |
| --------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| Talking to the API                | RTK Query endpoint                           | list products, quote, create a transaction, poll it       |
| Local state changes               | Slice reducer                                | choose units, save delivery details, reset after an order |
| A flow of several dependent calls | The `payOrder` thunk                         | tokenise the card → pay → mark the payment submitted      |
| Rules about input                 | zod schemas and pure functions in `schemas/` | Luhn check, brand detection, expiry in the future         |
| Turning a failure into a message  | `shared/errors/` + the copy catalogue        | `INSUFFICIENT_STOCK` → "Solo quedan 2 unidades"           |
| Rendering                         | Components                                   | no business rules; they read selectors and dispatch       |

### When to use a thunk

Only when an action is a **sequence of dependent asynchronous steps that must not live in a
component**. There is exactly one in the plan, `payOrder`:

1. Mark the attempt as started, so a second tap does nothing. Open the transaction on a first
   attempt; on a retry, check whether the previous payment arrived.
2. Turn the card into a token with the gateway, using the public key from `GET /payment-terms`.
   Reuse the stored `Idempotency-Key`, or create one for a first attempt.
3. `POST /transactions/{id}/payment` with the token.
4. Mark the payment as submitted; the status screen then polls for the outcome.

The thunk calls the API through RTK Query endpoints with
`dispatch(endpoint.initiate(...)).unwrap()`. A single API request is an RTK Query endpoint,
never a thunk. Wrapping one request in a thunk is the pre-RTK-Query pattern, and adds code
that RTK Query already provides.

Two exceptions, both about card data:

- **`payOrder` is a plain thunk, not `createAsyncThunk`.** `createAsyncThunk` puts its
  argument in `meta.arg` of every `pending`, `fulfilled` and `rejected` action, so the card
  would travel through the store, the listener middleware and the Redux DevTools. A plain
  thunk takes the card as a function argument and dispatches only `paymentSubmitting`,
  `paymentSubmitted` and `paymentFailed`, which carry no card data.
- **Tokenisation is a plain function in `api/gateway.ts`, not an RTK Query endpoint.** RTK
  Query keeps every call's arguments in the cache as `originalArgs`. `tokenizeCard` is a
  `fetch` call that returns the token and keeps nothing.

## The API contract

- **Base URL**: the API's origin, `https://adh-api.alfredo-dominguez.dev` in production, from
  `VITE_API_BASE_URL`. The generated endpoints carry the `/api/v1/...` path themselves.
- **CORS**: the production API answers preflights only for this storefront's origin,
  `https://adh-shop.alfredo-dominguez.dev`. Local development does not widen that: the Vite
  dev server proxies `/api` to the API, so the browser only ever talks to `localhost` and
  no cross-origin request is made.
- **Errors** share one envelope, `{ error: { code, message, details }, requestId }`. The UI
  branches on `code`, never on `message`, which is in English and meant for developers. See
  [errors.md](./errors.md).
- **Money** arrives in integer minor units (COP cents) and is formatted only at render time.
