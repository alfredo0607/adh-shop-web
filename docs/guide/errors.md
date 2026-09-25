# Errors

Every failure in the storefront goes through one pipeline, so no error is shown twice, none
is swallowed, and none reaches the buyer as raw server text.

## The convention

> **Expected errors are handled where they happen. Unexpected errors are handled globally.**

| Kind                                                        | Examples                                                                                             | Handled by                       | The buyer sees                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| **Expected**: business outcomes the flow is designed around | `INSUFFICIENT_STOCK`, `AMOUNT_MISMATCH`, `RESERVATION_EXPIRED`, `PAYMENT_REJECTED`, field validation | The screen that made the request | A message next to the field or button concerned, and a way forward |
| **Unexpected**: the service or the network failed           | 5xx, `PAYMENT_GATEWAY_UNAVAILABLE`, `429`, timeouts, offline                                         | The global error listener        | A toast, with the request id when there is one                     |
| **Defects**: a component crashed while rendering            | an exception in render                                                                               | Error boundaries                 | A recovery screen with "Volver a la tienda"                        |

A declined card is neither: it is a **successful request** whose payment failed, returned as
a status, and shown on the status screen like any other outcome.

## Layer 1: normalise

Every failure becomes one type before any code sees it. The RTK Query `baseQuery` does the
conversion, so nothing downstream parses a response body or checks `navigator.onLine`.

```ts
// shared/errors/appError.ts
export type AppError =
  | {
      kind: "api";
      status: number;
      code: ApiErrorCode;
      requestId?: string;
      details?: unknown;
    }
  | { kind: "rate-limited"; retryAfterSeconds: number }
  | { kind: "network" } // offline, DNS, CORS, connection reset
  | { kind: "timeout" }
  | { kind: "unknown"; cause: unknown };
```

| Source                                           | Becomes                                             |
| ------------------------------------------------ | --------------------------------------------------- |
| API envelope `{ error: { code, … }, requestId }` | `{ kind: 'api', status, code, requestId, details }` |
| `429` with `Retry-After`                         | `{ kind: 'rate-limited', retryAfterSeconds }`       |
| `fetch` rejected (`TypeError`)                   | `{ kind: 'network' }`                               |
| Aborted after the request timeout (15 s)         | `{ kind: 'timeout' }`                               |
| A body that is not the envelope                  | `{ kind: 'unknown' }`, logged in development        |

`ApiErrorCode` is a union of the codes the API documents. A code the storefront does not know
yet falls back to a generic message rather than crashing.

## Layer 2: translate

One catalogue maps each error to a key in the copy catalogue (`shared/copy/es-CO.ts`). Components
never write error text themselves.

| Code                          | Copy (es-CO)                                                        |
| ----------------------------- | ------------------------------------------------------------------- |
| `INSUFFICIENT_STOCK`          | "Solo quedan {available} unidades de este producto."                |
| `AMOUNT_MISMATCH`             | "El total cambió desde que lo viste. Revisa el nuevo resumen."      |
| `RESERVATION_EXPIRED`         | "Tu reserva expiró. Vuelve a empezar la compra."                    |
| `PAYMENT_REJECTED`            | "No pudimos procesar la tarjeta. Revisa los datos o usa otra."      |
| `TRANSACTION_NOT_PAYABLE`     | "Este pedido ya tiene un pago en curso."                            |
| `PAYMENT_GATEWAY_UNAVAILABLE` | "El servicio de pagos no responde. Intenta de nuevo en un momento." |
| `rate-limited`                | "Demasiados intentos. Intenta de nuevo en {seconds} segundos."      |
| `network`                     | "Sin conexión. Revisa tu internet."                                 |
| `timeout`                     | "La solicitud tardó demasiado. Intenta de nuevo."                   |
| anything else                 | "Algo salió mal. Intenta de nuevo."                                 |

The server's `message` field is in English and written for developers. It is never shown.

## Layer 3: present

### Where the error happened (expected errors)

Screens read the normalised error from the RTK Query hook or the thunk result, and render it
in place: under the field, above the button, or as the screen's own state. An expected error
**never** also triggers the global toast.

### Globally (unexpected errors)

An RTK **listener middleware** watches every rejected query, mutation and thunk. For an
unexpected kind it dispatches a toast (Radix Toast, styled by us) with the translated message
and, for API errors, the request id in small print so the buyer can quote it.

Endpoints opt out of the global toast by declaring that they handle their own errors; the
payment and transaction endpoints do. Without that flag, a stock error would appear twice.

### Crashes (defects)

- A **root error boundary** catches anything, showing a full-page recovery screen.
- **Each route has its own boundary**, so a crash in the status screen does not take down the
  product page, and the buyer can navigate away.
- Boundaries log the error in development, and reset when the route changes.

## Retrying

| Situation                                            | Retry                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Reads (`GET`) that failed on network, timeout or 5xx | Automatic, up to 2 times with backoff (RTK Query `retry`)                                     |
| `429`                                                | Never automatic; wait `Retry-After`, then the buyer retries                                   |
| Creating a transaction                               | Never automatic: a new transaction would reserve stock twice                                  |
| Paying                                               | The buyer retries, and the **same idempotency key** is reused, so the API cannot charge twice |

## Testing

Each layer is tested alone: the normaliser against every source shape, the translator against
every code, the listener against expected and unexpected failures, and each boundary with a
component that throws. See [testing.md](./testing.md).
