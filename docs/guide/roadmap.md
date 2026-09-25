# Roadmap

The storefront is built in the order below, one pull request per step. Each step leaves `main`
working and deployable. The status column is updated by the pull request that completes the
step.

| Step | Deliverable                  | Scope                                                                                                                                                                              | Status  |
| ---: | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
|    0 | **Engineering guide**        | This documentation: stack, architecture, state, flow, security, styling, testing, deployment, workflow                                                                             | ✅ Done |
|    1 | **Scaffold and CI**          | Vite + React + TypeScript strict · ESLint (with import rules) and Prettier · Jest + React Testing Library + MSW · coverage threshold · GitHub Actions CI · design tokens and reset | ⏳ Next |
|    2 | **Data layer**               | RTK Query codegen from the API's OpenAPI document · base API with normalised errors · gateway tokenisation endpoint · store · `checkout` slice · redux-remember with the allowlist | ⬜      |
|    3 | **Product pages**            | Catalogue and product page: stock, price, description, signed images, unit selector, "Pay with credit card"                                                                        | ⬜      |
|    4 | **Card and delivery modal**  | Card number with Luhn and live VISA / Mastercard detection and logos, expiry, CVC, holder, installments · delivery form · validation in `validation/`                              | ⬜      |
|    5 | **Summary and payment**      | Backdrop with product amount, base fee and delivery fee · acceptance of the gateway's terms · create the transaction · the `payOrder` thunk                                        | ⬜      |
|    6 | **Status and resilience**    | Status screen with polling · approved / declined / expired states · delivery details · resuming after a reload · back to the product with fresh stock                              | ⬜      |
|    7 | **Hosting** (adh-shop-infra) | S3 + CloudFront + OAC + ACM · SPA fallback · security headers and CSP · OIDC deploy role                                                                                           | ⬜      |
|    8 | **Release and README**       | CD pipeline · production build · README with screenshots, the live URL and coverage results                                                                                        | ⬜      |

## Definition of done, for every step

- Tests cover the new behaviour; coverage stays above the threshold.
- Lint, typecheck and build pass in CI.
- Works at 320 px, 375 px and desktop width, with no horizontal scroll.
- This guide is updated wherever the step changed or refined a decision.

## Open decisions

| Decision                                      | Needed by | Status                                                               |
| --------------------------------------------- | --------- | -------------------------------------------------------------------- |
| Visual direction ([palette.md](./palette.md)) | Step 3    | ✅ Confirmed: "Coffee & Origin" palette, contrast-checked to WCAG AA |
| Storefront domain                             | Step 7    | `adh-shop.alfredo-dominguez.dev`, already allowed by the API's CORS  |
