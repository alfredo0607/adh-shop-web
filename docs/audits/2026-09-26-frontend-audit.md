# Frontend Technical Audit — 2026-09-26

| Field       | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Commit      | `8152be4` (`main`, after #9: summary, payment and order status)              |
| Scope       | Every module under `src/`, build and CI configuration, the production bundle |
| Method      | `docs/prompts/audit-prompt.md`                                               |
| Code change | None. Diagnosis only (method §42); fixes land in their own pull requests     |

## 0. Scope and honest limitations

- All non-test source was read: 4,300 lines of TypeScript and TSX across 7 modules, plus
  `vite.config.ts`, `eslint.config.js`, `tsconfig.app.json`, `jest.config.js` and
  `.github/workflows/ci.yml`. The 3,800 lines of tests were read where a finding depends on
  what they cover.
- **Confirmed** findings are proven from the code, and where it mattered reproduced. C-1 was
  reproduced with a throwaway test (double click on "Pagar", then counting requests); the
  test was deleted afterwards and is not part of the codebase.
- The storefront is **not deployed yet** (roadmap step 7). Everything that depends on the
  hosting is recorded as not verifiable instead of assumed:

| Method section                          | Status                                                        |
| --------------------------------------- | ------------------------------------------------------------- |
| §11 Content-Security-Policy, headers    | Not verifiable — no hosting yet; planned in step 7            |
| §30 Compression, CDN, cache headers     | Not verifiable — no hosting yet                               |
| §16 Web Vitals in production (LCP, CLS) | Not verifiable — no production traffic; measured locally only |
| §9 Authentication                       | Not applicable — the brief has no user accounts               |
| §10 Authorization                       | Not applicable — no roles; every screen is public by design   |
| §40 i18n                                | Not applicable beyond one locale; copy is centralised (es-CO) |

## 1. Architecture as it is

- **Feature-based folders** with a shared kernel and a composition root:
  - `features/{catalog,cart,checkout,orders}` hold screens, slices and the rules of each feature.
  - `api/` holds the generated RTK Query endpoints plus hand-written tags and `listCatalogue`,
    and `gateway.ts` for card tokenisation.
  - `shared/{ui,errors,copy,lib,styles}` is the vocabulary every feature uses.
  - `app/` is the composition root: store, persistence, router, layout, notifications and
    error screens.
- **Enforced boundaries.** ESLint forbids `shared/` from importing `features/` or `app/`, and
  Radix outside `shared/ui`.
- **State has three homes:**

  | Where                        | What                                                        |
  | ---------------------------- | ----------------------------------------------------------- |
  | RTK Query cache              | server data                                                 |
  | `cart` and `checkout` slices | persisted with redux-remember and validated when read back  |
  | component state              | forms; the card lives only in the `/checkout` route's state |

- **URL state:** catalogue filters and page live in the query string (`filters.ts`, pure and
  tested).
- **Errors** follow a single pipeline:
  - `baseQuery` normalises every failure to an `AppError`;
  - a listener middleware toasts unexpected failures;
  - screens handle expected ones;
  - route and root error boundaries catch crashes.
- **Payment:** `payOrder` is a plain thunk, so the card never enters an action. The token
  request is reset after use.
- **Build and quality:** Vite 8 with vendor chunks; TypeScript strict with
  `noUncheckedIndexedAccess`; Jest with Testing Library and MSW at 98.5% statement coverage;
  CI covers format, lint, types, tests, build and the dependency audit.

The architecture is deliberate, documented in `docs/guide/`, and proportionate to the product.
No finding below asks for a different architecture.

---

## 2. Modules

### MODULE: App shell and infrastructure (`src/app/`)

**Responsibility.** It creates the store, with persistence and the error listener, and the
router. It renders the shell (header, footer, skip link, scroll restoration, cart panel)
and resumes an in-flight payment after a reload. It also shows toasts and error boundaries.

**Grade — 8.3 / 10**

| Category           | Grade |
| ------------------ | ----: |
| React architecture |  9/10 |
| Code               |  9/10 |
| TypeScript         |  9/10 |
| Redux / State      |  9/10 |
| Components         |  8/10 |
| Hooks              |  9/10 |
| Data fetching      |  8/10 |
| Performance        |  7/10 |
| Security           |  8/10 |
| Auth               |   n/a |
| Errors             |  9/10 |
| Accessibility      |  9/10 |
| Forms              |   n/a |
| Testing            |  9/10 |
| Maintainability    |  9/10 |
| Scalability        |  7/10 |

**What is good**

- **Rehydration without the classic pitfall.** `rememberReducer` is not used, so in-flight
  queries survive rehydration (`store.ts:33`). Session changes win over stored data, and a
  `rehydrated` flag gates decisions such as the resume.
- **A safe storage driver.** It tolerates browsers that refuse storage (`persistence.ts:17-32`).
- **DevTools only in development** (`store.ts:48`).
- **Error boundaries at two levels.** The route boundary keeps the header usable, and
  `RootErrorFallback` covers the providers.
- **The error listener honours `HANDLES_OWN_ERRORS`**, so no error is shown twice.

**Findings**

**A-1 — The checkout's form libraries ship in the first page's bundle**

- **Type / severity:** Recommendation · MEDIUM · P2
- **Location:** `src/app/router.tsx:3-8` (static imports of every screen); build output.
- **Evidence:**
  - `index-*.js` is 202 KB (63.3 KB gzip).
  - It contains react-hook-form, zod and `@hookform/resolvers`, which only `CheckoutForm`
    uses.
  - Initial JS is about 215 KB gzip in total (react 99.6 + index 63.3 + state 30.3 + ui 21.8).
- **Impact:** every visitor, including those only browsing, downloads and parses the form
  stack. This matters on the brief's reference device (iPhone SE class) over mobile data.
- **Fix:** route-level `lazy` for `checkout`, `checkout/resumen` and `orders/:id`. A local
  trial of exactly this reduced `index` from 63 KB to about 21 KB gzip, with the form stack
  in its own chunk.

**A-2 — Production source maps are published**

- **Type / severity:** Recommendation · LOW · P3
- **Location:** `vite.config.ts` → `build.sourcemap: true`
- **Evidence:** every chunk has a `.map` (1.6 MB for react, 1.06 MB for index) that will be
  uploaded with the site.
- **Impact:** small, because the repository is public and no secret lives in the bundle.
  The cost is upload size and a larger surface to scrape.
- **Fix:** use `'hidden'`, and upload the maps to the error tracker once one exists (A-3).

**A-3 — No production observability**

- **Type / severity:** Recommendation · MEDIUM · P2
- **Location:** `src/app/errors/RouteErrorScreen.tsx:20-22` only logs when `isDevelopment`.
  There is no error tracker and no Web Vitals reporting.
- **Scenario:** a render crash or an unexpected API shape in production shows the recovery
  screen, and nobody learns it happened.
- **Fix:** Sentry, or a minimal `window.onerror` beacon, from both error boundaries and the
  error listener, carrying the API's `requestId` that `AppError` already holds. Add
  `web-vitals` for LCP, CLS and INP.

**A-4 — A production build without `VITE_API_BASE_URL` fails silently**

- **Type / severity:** Potential risk · LOW · P2
- **Location:** `src/shared/lib/runtime.ts:17` defaults to `''` (same origin).
- **Scenario:** the deploy pipeline forgets the variable. The site builds and deploys, then
  every API call goes to `https://<storefront>/api/...` on CloudFront and fails.
- **Fix:** in `vite.config.ts`, fail `vite build` in production mode when the variable is
  missing.

**A-5 — Stale documentation**

- **Type / severity:** Confirmed · LOW · P3
- **Evidence:**
  - The `ToastProvider` comment says "top-right on wider screens" (`shared/ui/Toast/Toast.tsx:59`),
    but the viewport is bottom-right since the cart pull request.
  - `docs/guide/errors.md` says a retried payment after a network failure is replayed under
    the same key, which does not hold (see C-2).
- **Fix:** correct both when C-2 is fixed.

**Action plan:** A-1 → A-4 → A-3 → A-2 → A-5.

---

### MODULE: API layer (`src/api/`)

**Responsibility.** It holds:

- RTK Query endpoints generated from the committed OpenAPI snapshot;
- hand-written tags, cache rules and `listCatalogue`;
- the normalising base query with timeout and GET-only retries;
- card tokenisation with the gateway (`gateway.ts`).

**Grade — 8.6 / 10**

| Category           | Grade |
| ------------------ | ----: |
| React architecture |  9/10 |
| Code               |  9/10 |
| TypeScript         |  8/10 |
| Redux / State      |  9/10 |
| Components         |   n/a |
| Hooks              |   n/a |
| Data fetching      |  9/10 |
| Performance        |  8/10 |
| Security           |  9/10 |
| Auth               |   n/a |
| Errors             |  9/10 |
| Accessibility      |   n/a |
| Forms              |   n/a |
| Testing            |  9/10 |
| Maintainability    |  9/10 |
| Scalability        |  7/10 |

**What is good**

- **Retries are safe.** Only GET requests are retried, and only on network, timeout or 5xx
  (`baseQuery.ts:52-66`). A write is never retried, which is correct for
  `POST /transactions`.
- **One error shape.** `normalizeError` never trusts the server's message, and unknown codes
  map to `UNKNOWN`.
- **Tokenisation stays out of Redux.** It is a plain `fetch`, so the card never enters
  `originalArgs`. The gateway's own error text is never shown, and timeouts are detected by
  error name, which is realm-safe.
- **Types come from the contract.** They are generated from the snapshot, and
  `pnpm api:schema` verifies the snapshot against production.

**Findings**

**P-1 — Responses are trusted through their generated types**

- **Type / severity:** Recommendation · LOW · P3
- **Location:** `src/api/index.ts:76` (`result.data as ListProductsApiResponse`); every
  generated hook.
- **Scenario:** the API deploys a breaking change before the storefront regenerates. Screens
  then read `undefined` fields at runtime, and TypeScript cannot see it.
- **Fix:** no runtime schemas for everything, since that would duplicate the contract.
  Instead, a scheduled CI job runs `pnpm api:schema` against production and fails on a diff.

**P-2 — `listCatalogue` silently stops at 500 products**

- **Type / severity:** Scalability risk · LOW · P3
- **Location:** `src/api/index.ts:11` (`MAX_CATALOGUE_PAGES = 10`) × 50.
- **Scenario:** the catalogue grows past 500. The rest never appears, and nothing says so.
- **Fix:** report when the cap is reached. Beyond a few hundred products, move filtering
  server-side, as `docs/guide/state.md` already anticipates.

**Action plan:** P-1 (with the CI contract check) → P-2 when the catalogue grows.

---

### MODULE: Shared kernel (`src/shared/`)

**Responsibility.** It holds:

- the UI kit: Button, Field, TextInput, SelectInput, Stepper, Pagination, Modal, Drawer,
  Backdrop, Toast, Money, PaymentMethods and ErrorScreen;
- `AppError` and its messages;
- the es-CO copy with typed keys;
- money formatting, order limits and validation, and idempotency keys;
- the design tokens.

**Grade — 8.8 / 10**

| Category           | Grade |
| ------------------ | ----: |
| React architecture |  9/10 |
| Code               |  9/10 |
| TypeScript         |  9/10 |
| Redux / State      |   n/a |
| Components         |  9/10 |
| Hooks              |   n/a |
| Data fetching      |   n/a |
| Performance        |  9/10 |
| Security           |  9/10 |
| Auth               |   n/a |
| Errors             |  9/10 |
| Accessibility      |  9/10 |
| Forms              |  9/10 |
| Testing            |  8/10 |
| Maintainability    |  9/10 |
| Scalability        |  8/10 |

**What is good**

- **Copy keys are typed.** `CopyKey` makes a missing text a compile error, and all
  customer-facing text is in one catalogue.
- **`Field` wires accessibility for native controls.** It connects label, hint and error with
  `aria-describedby` and `aria-invalid`, and keeps the controls native.
- **Dialogs are wrapped once.** Radix is used only in `shared/ui`, which ESLint enforces.
- **Money is handled in integer minor units**, and formatted only at render.

**Findings**

**S-1 — `ErrorScreen` uses a fixed element id**

- **Type / severity:** Confirmed · LOW · P3
- **Location:** `src/shared/ui/ErrorScreen/ErrorScreen.tsx:18,22` (`id="error-screen-title"`).
- **Scenario:** two error screens render at once, for example a route error inside a page
  that shows a load error. The ids collide and `aria-labelledby` may name the wrong heading.
- **Fix:** `useId()`.

**S-2 — Three dialog wrappers share most of their markup**

- **Type / severity:** Optional · P3
- **Location:** `shared/ui/Modal`, `Drawer` and `Backdrop` are three Radix Dialog wrappers
  with different layouts.
- **Recommendation:** keep them as they are. Their presentations differ and an abstraction
  would not simplify them (method §26).

---

### MODULE: Catalogue (`src/features/catalog/`)

**Responsibility.** The home page and the catalogue grid, with search, filters, sort and
numbered pagination held in the URL. It also covers product cards, the product page (units,
buy now, add to cart) and stock rules.

**Grade — 8.6 / 10**

| Category           | Grade |
| ------------------ | ----: |
| React architecture |  9/10 |
| Code               |  9/10 |
| TypeScript         |  9/10 |
| Redux / State      |  9/10 |
| Components         |  8/10 |
| Hooks              |  9/10 |
| Data fetching      |  8/10 |
| Performance        |  8/10 |
| Security           |  9/10 |
| Auth               |   n/a |
| Errors             |  9/10 |
| Accessibility      |  9/10 |
| Forms              |  8/10 |
| Testing            |  9/10 |
| Maintainability    |  9/10 |
| Scalability        |  7/10 |

**What is good**

- **The URL is the single source of truth for filters.** Unknown values are ignored instead
  of breaking the page, and the logic is pure functions with 30 unit tests.
- **Stock is always fresh on the product page** (`refetchOnMountOrArgChange`), and the units
  offered are capped by stock and by the order limit.
- **Accessible cards.** A stretched link means one announcement per product, and stock is
  shown as a word plus an icon, never colour alone.
- **Images do not shift the layout.** They have fixed dimensions, lazy loading below the fold
  and a placeholder when they fail.

**Findings**

**G-1 — Signed image URLs are never refreshed**

- **Type / severity:** Potential risk · LOW · P3
- **Location:** `ProductImage.tsx:57`. The fallback shows, but nothing asks for a new URL.
- **Scenario:**
  1. The catalogue stays open past the signature's lifetime: one hour, set by the API's
     `IMAGE_URL_TTL_SECONDS`.
  2. The buyer then scrolls to images that are still lazy.
  3. They load with an expired signature and show the placeholder.
- **Fix:** on the first image error, refetch the catalogue or product once. The new signed
  URLs replace the old ones, and `ProductImage` already retries a changed `src`.

**G-3 — Dead checks for `product.category === undefined`**

- **Type / severity:** Optional · P3
- **Location:** `ProductCard.tsx:40` and `ProductPage.tsx:104`.
- **Evidence:** the contract now declares `category` as required.

---

### MODULE: Cart (`src/features/cart/`)

**Responsibility.** A persisted cart of up to 10 products, holding ids and units only. It
has a side panel with live prices and stock (`viewCart`), a header counter and add-to-cart
from cards and the product page. It starts a `source: 'cart'` order.

**Grade — 7.8 / 10**

| Category           | Grade |
| ------------------ | ----: |
| React architecture |  9/10 |
| Code               |  9/10 |
| TypeScript         |  9/10 |
| Redux / State      |  9/10 |
| Components         |  8/10 |
| Hooks              |  8/10 |
| Data fetching      |  6/10 |
| Performance        |  9/10 |
| Security           |  9/10 |
| Auth               |   n/a |
| Errors             |  6/10 |
| Accessibility      |  9/10 |
| Forms              |   n/a |
| Testing            |  8/10 |
| Maintainability    |  9/10 |
| Scalability        |  8/10 |

**What is good**

- **Prices are never stored.** `viewCart` re-prices every line from the catalogue, clamps
  units to current stock and holds back checkout for unavailable lines.
- **The limits mirror the API's.** The buyer is told when the cart is full.
- **The panel's open state is a separate, unpersisted slice**, so a reload closes it.

**Findings**

**K-1 — When the catalogue cannot be read, the cart tells the buyer that every product is unavailable**

- **Type / severity:** Confirmed · MEDIUM · P1
- **Location:** `CartPanel.tsx:28-29` reads only `isLoading`, never `isError`.
  `cartView.ts:37-45` treats an unknown product as unavailable.
- **Scenario:**
  1. The buyer opens the cart while `GET /products` fails (API down, offline).
  2. `products` is `undefined`, so `viewCart(lines, [])` marks every line "No disponible".
  3. The footer says "Quita los productos que ya no están disponibles para continuar", and
     "Ir a pagar" is disabled.
- **Impact:** the buyer is invited to delete a valid cart because of a transient network
  error.
- **Fix:** branch on `isError` before building the view. Show a load error with a retry
  (`refetch`) instead of the lines, and never infer "unavailable" without data.

**Action plan:** K-1, with a test that answers `GET /products` with 500 while the cart holds
lines.

---

### MODULE: Checkout (`src/features/checkout/`)

**Responsibility.** It covers:

- the `/checkout` route: the order recap with the card and delivery form in a modal;
- `/checkout/resumen`: the summary backdrop with the fees from `GET /quotes`, the gateway's
  terms and "Pagar";
- `payOrder`: create the transaction, tokenise, pay;
- `orderSettled`, which closes the order;
- the `checkout` slice, persisted.

**Grade — 6.9 / 10**

| Category           | Grade |
| ------------------ | ----: |
| React architecture |  9/10 |
| Code               |  8/10 |
| TypeScript         |  9/10 |
| Redux / State      |  8/10 |
| Components         |  8/10 |
| Hooks              |  8/10 |
| Data fetching      |  6/10 |
| Performance        |  8/10 |
| Security           |  8/10 |
| Auth               |   n/a |
| Errors             |  7/10 |
| Accessibility      |  9/10 |
| Forms              |  9/10 |
| Testing            |  7/10 |
| Maintainability    |  8/10 |
| Scalability        |  8/10 |

The grade is held down by C-1. The payment is the one flow where a defect costs the buyer
money.

**What is good**

- **Card data handling is exemplary for an SPA.**
  - The card lives only in the `/checkout` route's React state and is passed through the
    outlet context.
  - `payOrder` takes it as a function argument, never as an action.
  - The token request is `reset()` after use.
  - A test asserts that neither the number nor the token appears anywhere in the store or
    storage.
- **The form rules mirror the API's.** Luhn, BIN ranges for VISA and Mastercard, and expiry;
  each field reports its first failing rule; focus goes to the first error; autocomplete
  tokens are set.
- **Stored data is validated before it is trusted** (`parsePersistedCheckout`, `isOrderItemList`).
- **Business errors are explained in place.** Short stock names the product, and a moved
  total refreshes the quote.

**Findings**

**C-1 — A double tap on "Pagar" opens two transactions and sends two payments**

- **Type / severity:** Confirmed · HIGH · P0
- **Location:**
  - `OrderSummary.tsx:79,139`: the button is disabled only while
    `paymentStatus === 'submitting'`.
  - `payOrder.ts:55-80`: `paymentSubmitting()` is dispatched **after** `await createTransaction`.
- **Evidence:** reproduced with a throwaway test (`userEvent.dblClick` on "Pagar", 150 ms API
  latency). Result: `created = [T1, T2]`, then `paid = [T1 key=a383…, T2 key=a383…]`, and the
  store ends on `T2`.
- **Why it happens:** between the click and the first state change there is a whole network
  round trip, and nothing marks the payment as started during it.
- **Scenario:**

  ```
  Tap 1 → payOrder: transactionId null → POST /transactions (T1)
  Tap 2 → payOrder: transactionId still null → POST /transactions (T2)
  T1 created → transactionOpened(T1, key k1) → tokenise → pay T1 with getState().key
  T2 created → transactionOpened(T2, key k2) → tokenise → pay T2 with k2
  ```

- **Impact:**
  - **Always:** stock is reserved twice, and the second reservation holds its units for
    15 minutes. The store is left pointing at T2 while T1 may be the one that was paid, so
    the status screen can show the wrong order.
  - **Depending on latency:** if T1's payment reads its key before `transactionOpened(T2)`
    replaces it, the two payments carry **different keys and different transactions**. The
    API accepts both, and **the card is charged twice**. The run above shared one key only
    because of its timing.
- **Fix:** mark the attempt as started before the first `await`. Either dispatch
  `paymentSubmitting()` at the top of `payOrder`, before creating the transaction, or have
  the thunk refuse to start while `paymentStatus === 'submitting'`. Add a regression test
  with `dblClick` that asserts exactly one `POST /transactions` and one payment.

**C-2 — Retrying after a lost connection does not replay the payment: the card is tokenised again**

- **Type / severity:** Confirmed · MEDIUM · P1
- **Location:**
  - `payOrder.ts`: every attempt calls `tokenizeCard` again, and the token goes in the body.
  - The API's `IdempotencyInterceptor` fingerprints method, path **and body**, and stores
    only successful responses.
- **Scenario:**
  1. The payment reaches the API and succeeds, but the response is lost (mobile network).
  2. The buyer taps "Pagar" again. It uses the same key, but a new token, so the body is
     different.
  3. The API answers `IDEMPOTENCY_KEY_REUSED`. The storefront shows the generic "Algo salió
     mal" and renews the key.
  4. A third tap receives `TRANSACTION_NOT_PAYABLE`, and only then does the buyer reach the
     status screen.
- **Impact:** there is no double charge, because the API's conditional payment claim
  prevents it. But the idempotent replay the design and `docs/guide/errors.md` rely on never
  happens. The buyer sees an error after a payment that went through, and needs two more
  taps. The existing test ("retries after a lost connection…") simulates a failure
  **before** the request reaches the API, so it does not cover this case.
- **Fix:**
  - After a network or timeout failure on the payment, read `GET /transactions/{id}` before
    trying again. If `paymentSubmitted`, go to the status screen.
  - Treat `IDEMPOTENCY_KEY_REUSED` like `TRANSACTION_NOT_PAYABLE` (payment already sent).
  - Correct `docs/guide/errors.md`.

**C-3 — If the payment terms fail to load, the summary is a dead end**

- **Type / severity:** Confirmed · MEDIUM · P1
- **Location:** `OrderSummary.tsx`, the terms `<fieldset>`: it shows `termsError` text only,
  and "Pagar" stays disabled while `terms.data` is undefined.
- **Scenario:** `GET /payment-terms` fails three times (the request plus two automatic
  retries). The buyer sees "No pudimos cargar los términos de pago" with no action on the
  screen.
- **Fix:** a retry button calling `terms.refetch()`, as the quote block already has.

**C-4 — The order recap shows ids and $0 when the catalogue cannot be read**

- **Type / severity:** Confirmed · LOW · P2
- **Location:** `CheckoutLayout.tsx`, which builds the recap from `useListCatalogueQuery`
  through `viewCart`.
- **Scenario:** the catalogue request fails while the checkout is open. Each line shows the
  raw product id and `$ 0`. The summary itself uses the authoritative quote, so nothing is
  charged wrongly.
- **Fix:** hide the amounts when there is no data, or build the recap from the quote
  response, which has names and line totals.

**C-5 — Delivery details of an abandoned checkout stay in `localStorage` indefinitely**

- **Type / severity:** Potential risk (privacy) · LOW · P2
- **Location:** the `checkout` slice (`delivery`: name, email, phone, address) is persisted
  and cleared only by `orderClosed` or `orderSettled`.
- **Scenario:** a buyer on a shared computer fills in the form and leaves. The next person
  can read the details in DevTools, and the form pre-fills them.
- **Fix:** store a `savedAt` time with the slice and drop `delivery` in
  `parsePersistedCheckout` when it is older than, say, 24 hours.

**C-6 — The gateway's acceptance token can expire while the summary is open**

- **Type / severity:** Potential risk · LOW · P3
- **Location:** `OrderSummary.tsx` fetches `GET /payment-terms` once per mount. The token is
  a JWT with an `exp` claim (observed about one hour ahead in production).
- **Scenario:** the buyer leaves the summary open for more than an hour, then pays.
- **Not verifiable:** how the gateway answers an expired acceptance token depends on the
  gateway.
- **Fix:** refetch the terms just before paying, or when the token's `exp` has passed.

**C-7 — Stored delivery details are only partly validated**

- **Type / severity:** Confirmed · LOW · P3
- **Location:** `checkoutSlice.ts:84-90` checks the required string fields of `delivery`,
  but not the optional `addressLine2` and `postalCode`. `lastError` is accepted as any string.
- **Scenario:** a tampered or corrupted record carries `addressLine2: {}`. It is sent to
  `POST /transactions`, which answers 422, and the buyer sees a generic message.
- **Fix:** validate the optional fields as `string | undefined` too.

**Action plan:** C-1 (P0, before deployment) → C-2 → C-3 → C-4 → C-5 → C-7 → C-6.

---

### MODULE: Orders (`src/features/orders/`)

**Responsibility.** `/orders/:id`: it polls a pending payment, shows the final outcome and
the delivery, closes the buyer's own order and offers a retry. It is also reached through
`ResumeOrder` after a reload.

**Grade — 8.5 / 10**

| Category           | Grade |
| ------------------ | ----: |
| React architecture |  9/10 |
| Code               |  9/10 |
| TypeScript         |  9/10 |
| Redux / State      |  9/10 |
| Components         |  8/10 |
| Hooks              |  8/10 |
| Data fetching      |  9/10 |
| Performance        |  9/10 |
| Security           |  9/10 |
| Auth               |   n/a |
| Errors             |  8/10 |
| Accessibility      |  9/10 |
| Forms              |   n/a |
| Testing            |  9/10 |
| Maintainability    |  8/10 |
| Scalability        |  8/10 |

**What is good**

- **Polling is bounded.** It checks every 2 s for at most 2 minutes, then hands over to a
  manual check.
- **`orderSettled` touches only this browser's order.** A shared link never resets someone's
  cart, and a test covers this.
- **Stock is refreshed after a purchase** by invalidating the product tags.
- **Outcomes are announced with `aria-live`**, and each has its own icon and wording.

**Findings:** none above LOW. The only coupling worth noting is that the status page's retry
depends on `orderSettled` returning the order's source, which is captured in a ref. It is
correct and tested, but subtle, and deserves its comment if the component grows.

---

## 3. Global summary

| Module             | Grade | Critical |  High | Medium |
| ------------------ | ----: | -------: | ----: | -----: |
| App shell & infra  |   8.3 |        0 |     0 |      2 |
| API layer          |   8.6 |        0 |     0 |      0 |
| Shared kernel      |   8.8 |        0 |     0 |      0 |
| Catalogue          |   8.6 |        0 |     0 |      0 |
| Cart               |   7.8 |        0 |     0 |      1 |
| Checkout           |   6.9 |        0 |     1 |      2 |
| Orders             |   8.5 |        0 |     0 |      0 |
| Cross-cutting (§4) |     — |        0 |     0 |      1 |
| **Total**          |       |    **0** | **1** |  **6** |

Low: 11 (A-2, A-4, A-5, P-1, P-2, S-1, G-1, C-4, C-5, C-6, C-7). Optional: 3 (S-2, G-3, and
the note on Orders).

**Overall: 8.1 / 10.** The architecture, typing, accessibility and card-data handling are at
a senior level. The frontend is not ready to deploy until **C-1** is fixed: a double tap
must never open two transactions.

## 4. Cross-cutting issues

**T-1 — Nothing exercises the real purchase flow end to end**

- **Type / severity:** Recommendation · MEDIUM · P2
- **Evidence:** 286 Jest tests with 98.5% statement coverage, all against MSW. There is no
  browser test of the real flow. C-1 and C-2 both went unnoticed because the tests never
  double-tap, and never let a payment reach the server and then drop the response.
- **Fix:**
  - A Playwright smoke test against the API sandbox: card 4242 is approved and card 4111 is
    declined.
  - Jest regressions for C-1 (`dblClick`) and C-2 (an MSW handler that records the payment,
    then fails the connection).

Other cross-cutting observations, all already in a module above:

- **Observability** (A-3).
- **Data fetching error states when the catalogue fails** in consumers other than the grid
  (K-1, C-4).
- **Bundle composition** (A-1).

## 5. Technical debt

| Item                                   | Class     | Origin                                        | Cost        | Priority |
| -------------------------------------- | --------- | --------------------------------------------- | ----------- | -------- |
| C-1 double submit                      | Critical  | Guard placed after the first `await`          | ~1 h        | P0       |
| C-2 idempotent retry                   | Important | Token re-created per attempt; API fingerprint | ~3 h        | P1       |
| K-1, C-3 missing error branches        | Important | Only `isLoading` handled in two consumers     | ~2 h        | P1       |
| A-1 no route splitting                 | Moderate  | Static route imports                          | ~1 h        | P2       |
| A-3 no observability                   | Moderate  | Not yet planned                               | ~half a day | P2       |
| T-1 no end-to-end test                 | Moderate  | Jest-only strategy                            | ~half a day | P2       |
| A-4, C-4, C-5                          | Moderate  | Defaults and persistence choices              | ~2 h        | P2       |
| A-2, A-5, P-1, P-2, S-1, G-1, C-6, C-7 | Minor     | Small gaps                                    | ~3 h        | P3       |

## 6. Refactoring roadmap

- **Phase 1 — Security and stability (before deployment):** C-1.
- **Phase 2 — P1 bugs:** C-2 and its guide correction (A-5), K-1, C-3.
- **Phase 3 — Architecture:** none needed. The structure is sound.
- **Phase 4 — Performance and scalability:** A-1 route splitting; A-4 build guard; P-2 when
  the catalogue grows.
- **Phase 5 — Testing:** T-1, the Playwright smoke test plus the C-1 and C-2 regressions.
- **Phase 6 — Maintainability and hygiene:** A-3 observability, A-2, C-4, C-5, C-6, C-7, G-1,
  S-1, and G-3 cleanup.
