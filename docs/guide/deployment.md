# Deployment

The storefront is static files. They are served from AWS, next to the API, and provisioned in
[adh-shop-infra](https://github.com/alfredo0607/adh-shop-infra).

## Hosting

```
Browser ──HTTPS──▶ adh-shop.alfredo-dominguez.dev (Cloudflare DNS, CNAME)
                        │
                        ▼
                  CloudFront ── response headers policy (HSTS, CSP, …)
                        │  Origin Access Control
                        ▼
                  S3 bucket (private, versioned, encrypted)
```

| Piece        | Configuration                                                          | Why                                                                |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| S3 bucket    | Private, versioned, public access blocked, SSE                         | Only CloudFront reads it; versions allow rolling back a bad upload |
| CloudFront   | Origin Access Control, HTTPS only, HTTP/2 and HTTP/3, `PriceClass_100` | Global delivery; the bucket is never public                        |
| Certificate  | ACM in `us-east-1` for `adh-shop.alfredo-dominguez.dev`                | CloudFront reads certificates only from `us-east-1`                |
| SPA fallback | 403 and 404 from the origin answered with `/index.html` and 200        | Deep links such as `/orders/{id}` work on reload                   |
| Headers      | Response headers policy from [security.md](./security.md)              | CSP and HSTS at the edge, for every file                           |

This distribution is separate from the product-image CDN. That one rejects any request without
a signature, and a browser loading `index.html` has no signature to present.

## Caching

| Files                       | `Cache-Control`                       | Why                                                              |
| --------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| `assets/*` (hashed by Vite) | `public, max-age=31536000, immutable` | The name changes with the content, so they can be cached forever |
| `index.html`                | `no-cache`                            | Always revalidated, so a release is visible immediately          |

A release uploads the hashed assets first and `index.html` last, so no visitor ever loads an
`index.html` that points at files not yet uploaded.

## Release pipeline

Same model as the API: no AWS keys in GitHub.

1. **CI on every pull request**: lint, typecheck, tests with coverage, `pnpm audit`, build.
2. **CD on merge to `main`**: GitHub Actions assumes a deploy role through OIDC, scoped to this
   bucket and this distribution, then:
   - `vite build` with the production `VITE_API_BASE_URL`
   - `aws s3 sync dist/assets` with the immutable cache header
   - `aws s3 cp dist/index.html` with `no-cache`
   - `aws cloudfront create-invalidation --paths /index.html`

Rollback: re-run the deploy workflow on the previous commit, or restore the previous object
versions in the bucket.

## One-time DNS steps (Cloudflare)

These are done by the domain owner in the Cloudflare dashboard, since the DNS lives there.

1. The **ACM validation** CNAME that Terraform outputs, set to **DNS only** (grey cloud), until
   the certificate shows as issued.
2. `adh-shop` → **CNAME** to the CloudFront domain Terraform outputs, set to **DNS only**.
   CloudFront is already the CDN and terminates TLS with the ACM certificate. Proxying through
   Cloudflare as well would put two CDNs in series.

## Environments and configuration

| Variable            | Local                                                  | Production                              |
| ------------------- | ------------------------------------------------------ | --------------------------------------- |
| `VITE_API_BASE_URL` | empty: same origin, and Vite proxies `/api` to the API | `https://adh-api.alfredo-dominguez.dev` |

Nothing else is configured at build time. The gateway's public key and tokenisation URL come
from `GET /payment-terms` at runtime.
