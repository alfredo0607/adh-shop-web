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

| Piece       | Configuration                                                                 | Why                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| S3 bucket   | Private, versioned, public access blocked, SSE                                | Only CloudFront reads it; versions allow rolling back a bad upload                                                         |
| CloudFront  | Origin Access Control, HTTPS only, HTTP/2 and HTTP/3, `PriceClass_100`        | Global delivery; the bucket is never public                                                                                |
| Certificate | ACM in `us-east-1` for `adh-shop.alfredo-dominguez.dev`                       | CloudFront reads certificates only from `us-east-1`                                                                        |
| App routes  | A CloudFront Function serves `/index.html` for paths without a file extension | Deep links such as `/orders/{id}` work on reload, while a missing `/assets/x.js` stays an error instead of HTML with a 200 |
| Headers     | Response headers policy from [security.md](./security.md)                     | CSP and HSTS at the edge, for every file                                                                                   |

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

1. **CI on every pull request** (`ci.yml`): format, lint, typecheck, tests with coverage,
   build, `pnpm audit`.
2. **CD on merge to `main`** (`deploy.yml`): the same checks run again on the merged commit,
   through `workflow_call`, and the release starts only if they pass. Then, in the
   `production` environment:
   - fail early if any of the environment's variables is missing;
   - `vite build` with the production `VITE_API_BASE_URL`;
   - assume the deploy role through OIDC, scoped to this bucket and this distribution;
   - `aws s3 sync dist/assets` with the immutable cache header;
   - `aws s3 sync dist --exclude "assets/*" --delete` with `no-cache`;
   - `aws cloudfront create-invalidation` for `/index.html`. App routes are rewritten to
     `/index.html` before the cache, so that one path covers them all.

Source maps are built with `sourcemap: 'hidden'`: the bundles do not reference them, and the
release does not upload them. Old hashed bundles stay in the bucket, so a visitor still running
the previous release can finish loading it.

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

The `production` environment in GitHub holds it with the release's other variables
(`AWS_DEPLOY_ROLE`, `AWS_REGION`, `SITE_BUCKET`, `DISTRIBUTION_ID`), all taken from the
infrastructure stack's `github_environment_variables` output. None is a secret. The
environment only accepts deployments from `main`.

Nothing else is configured at build time. The gateway's public key and tokenisation URL come
from `GET /payment-terms` at runtime.
