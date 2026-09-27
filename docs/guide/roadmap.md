# Roadmap

The storefront is built in the order below, one pull request per step. Each step leaves `main`
working and deployable. The status column is updated by the pull request that completes the
step.

| Step | Deliverable                  | Scope                                                                                                                                                                                                                                                                                              | Status  |
| ---: | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
|    0 | **Engineering guide**        | This documentation: stack, architecture, state, flow, security, styling, testing, deployment, workflow                                                                                                                                                                                             | ✅ Done |
|    1 | **Scaffold and CI**          | Vite + React + TypeScript strict · ESLint (type-aware, accessibility, import boundaries) and Prettier · Jest + React Testing Library + MSW · 80% coverage gate · GitHub Actions CI on every pull request · design tokens, reset and fonts · es-CO copy catalogue · root and route error boundaries | ✅ Done |
|    2 | **Data layer**               | RTK Query codegen from the API's OpenAPI document · base API with error normalisation · global error listener and toasts · gateway tokenisation function · store · `checkout` slice · redux-remember with the allowlist                                                                            | ✅ Done |
|    3 | **Product pages**            | Catalogue and product page: stock, price, description, signed images, unit selector, "Pay with credit card"                                                                                                                                                                                        | ✅ Done |
|   3b | **Store experience**         | Categories from the API · search, category, price and availability filters and sorting, kept in the URL · numbered pagination · header with search, favourites and account, and category navigation · footer · accepted card brands                                                                | ✅ Done |
|   3c | **Cart**                     | Cart of several products, persisted · side panel with quantities and subtotal · counter in the header · "Add to cart" on cards and the product page · the checkout works on a list of items                                                                                                        | ✅ Done |
|    4 | **Card and delivery modal**  | Card number with Luhn and live VISA / Mastercard detection and logos, expiry, CVC, holder, installments · delivery form · schemas in `schemas/`, react-hook-form                                                                                                                                   | ✅ Done |
|    5 | **Summary and payment**      | Backdrop with product amount, base fee and delivery fee · acceptance of the gateway's terms · create the transaction · the `payOrder` thunk                                                                                                                                                        | ✅ Done |
|    6 | **Status and resilience**    | Status screen with polling · approved / declined / expired states · delivery details · resuming after a reload · back to the product with fresh stock                                                                                                                                              | ✅ Done |
|    7 | **Hosting** (adh-shop-infra) | S3 + CloudFront + OAC + ACM · app routes served by a CloudFront Function · security headers and CSP · OIDC deploy role · CD on merge to `main` (live at https://adh-shop.alfredo-dominguez.dev)                                                                                                    | ✅ Done |
|    8 | **Release and README**       | README with screenshots of the live storefront, the live URL, the exercise checklist and the coverage results                                                                                                                                                                                      | ✅ Done |

Libraries are added by the step that first uses them (Redux Toolkit and RTK Query in step 2,
react-hook-form, zod and Radix in step 4), so no dependency is ever declared before it is
imported.

## Definition of done, for every step

- Tests cover the new behaviour; coverage stays above the threshold.
- Lint, typecheck and build pass in CI.
- Works at 320 px, 375 px and desktop width, with no horizontal scroll.
- This guide is updated wherever the step changed or refined a decision.

## Open decisions

| Decision                                      | Needed by | Status                                                               |
| --------------------------------------------- | --------- | -------------------------------------------------------------------- |
| Visual direction ([palette.md](./palette.md)) | Step 3    | ✅ Confirmed: "Coffee & Origin" palette, contrast-checked to WCAG AA |
| Storefront domain                             | Step 7    | ✅ Live: `adh-shop.alfredo-dominguez.dev`, allowed by the API's CORS |
