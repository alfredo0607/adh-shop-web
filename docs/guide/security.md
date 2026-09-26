# Security

## Card data

The single most important rule in this codebase: **card data never leaves the card form
except to the payment gateway.**

- The number, expiry, CVC and holder name live in the form component's local state.
  Neither persisted slice has anywhere to hold them: the cart stores product ids and units,
  the checkout the order's items, delivery and status. They are
  never put in Redux, never persisted, never logged, never sent to the ADH Shop API.
- On submit, `payOrder` sends them directly to the gateway's tokenisation endpoint with the
  public key, and receives a single-use token. Only the token goes to the API.
- They never pass through a Redux action either. `payOrder` is a plain thunk rather than
  `createAsyncThunk`, which would copy its argument into every action's `meta`, and
  tokenisation is a plain function rather than an RTK Query endpoint, which would keep its
  arguments in the cache. See [architecture.md](./architecture.md#when-to-use-a-thunk).
- Between the form and the summary, the card lives in the React state of the `/checkout`
  route (`features/checkout/session.ts`), handed to its child routes through the router's
  outlet context. Leaving the checkout unmounts the route and the card with it; a reload on
  the summary sends the buyer back to the form, because there is nothing to restore it from.
- The summary shows only the brand, the last four digits and the installments.
- On a failed payment the buyer re-enters the card.
- Inputs use `autocomplete="cc-number"`, `cc-exp`, `cc-csc` and `cc-name`, so browsers and
  password managers treat them as payment fields, and `inputmode="numeric"` for the mobile
  keypad.
- What the UI may show after entry: the brand and the last four digits, both kept in memory
  only.

This keeps the storefront, and the API behind it, outside the scope of storing or processing
card data.

## Secrets

There are none in the bundle, because a browser bundle cannot keep one. The gateway's public
key is public by design and arrives at runtime from `GET /payment-terms`, with the
tokenisation URL and the acceptance documents. The storefront carries no payment
configuration of its own. Build-time variables (`VITE_*`) hold only non-secret values such as
the API base URL.

## Storage

- `localStorage` holds only the allowlisted `checkout` slice (see [state.md](./state.md)).
- Personal data in it (the buyer's name, email, phone and address) is what the buyer typed to
  finish their own order, is cleared when the order closes, and never includes payment data.
- No cookies are set. The API does not use credentials, and CORS is configured without them.

## Transport and headers

Served only over HTTPS by CloudFront, with a response headers policy:

| Header                      | Value                                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains`                                                                                                                                              |
| `Content-Security-Policy`   | `default-src 'self'`; `connect-src` the API, the gateway's tokenisation host; `img-src 'self'` and the image CDN; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'` |
| `X-Content-Type-Options`    | `nosniff`                                                                                                                                                                          |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                                                                                                                  |
| `Permissions-Policy`        | camera, microphone and geolocation disabled                                                                                                                                        |

The CSP means that even an injected script could not send card data anywhere except the two
hosts the page already talks to.

## Rendering

- No `dangerouslySetInnerHTML`. React escapes everything else.
- Links to the acceptance documents open with `rel="noopener noreferrer"`.
- Error messages shown to buyers come from a mapping of API error codes, never from raw server
  text.

## Dependencies

`pnpm audit --prod` runs in CI and fails on high-severity vulnerabilities, as in the API.
