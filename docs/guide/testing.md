# Testing

## Tools

| Tool                                                      | Role                                                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Jest** with `@swc/jest`                                 | Test runner. The brief asks for tests "created with Jest"; SWC keeps it fast with TypeScript and JSX           |
| **React Testing Library** + `@testing-library/user-event` | Components tested through what a user sees and does: roles, labels, text, typing, clicking                     |
| **MSW** (Mock Service Worker)                             | The API and the gateway, mocked at the network layer, so RTK Query, the thunk and the components run unchanged |
| **jsdom**                                                 | Browser environment                                                                                            |

Vitest would be the natural pairing with Vite, and it was considered. The brief names Jest,
so points are not risked on it.

### ESM-only dependencies

Tests run with Node's `--experimental-vm-modules` (set in the `test` scripts). React Router 8
is published as ESM only and uses `import.meta`, which cannot be compiled down to the
CommonJS that Jest runs by default. With VM modules, Jest loads such packages natively, and
no third-party code is transformed. Our own code still goes through SWC.

`import.meta.env` is read in exactly one module, `shared/lib/runtime.ts`, which tests replace
with a stub.

### jsdom setup for Radix

Radix Primitives rely on browser APIs that jsdom does not implement. The shared setup file
(`src/test/setup.ts`) provides them once, so no test has to:

- `ResizeObserver` (used by Select and positioning)
- `Element.prototype.hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`
- `Element.prototype.scrollIntoView`
- `window.matchMedia` (also used by the reduced-motion styles)

## Coverage policy

- **Over 80% for statements, branches, functions and lines**, enforced in `jest.config` so CI
  fails on a regression. The target in practice is well above: pure logic at 100%.
- Results are published in the README, as the brief requires.
- Excluded from coverage: generated API code, `main.tsx`, type-only files and test utilities.

## What is tested, by layer

| Layer                    | How                            | Focus                                                                                                       |
| ------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Schemas** (`schemas/`) | Plain unit tests, table-driven | Luhn, brand detection per BIN range, expiry edge cases (this month, last month), every delivery rule        |
| **Slice**                | Reducer in, state out          | Each action; reset; that nothing sensitive can enter the state                                              |
| **Persistence**          | The store's serialised output  | Only `checkout` is written; card fields and the RTK Query cache are absent                                  |
| **`payOrder` thunk**     | Real store + MSW               | Happy path; each API error code; gateway failure; retries; a double tap opening one transaction             |
| **Components**           | React Testing Library          | Loading, error and success states; the brand logo appearing; accessible names                               |
| **Flows**                | Rendered app + MSW + router    | Product → pay → approved; declined; reload during payment resumes on the status screen; expired reservation |

| **Errors** | Unit tests + a store | The normaliser for every source shape, the code-to-copy mapping, the global listener, each error boundary |
| **Copy** | Unit test | Every error code and form message key exists in `es-CO.ts` |

## Rules

- **Test behaviour, not implementation.** Query by role and label, not by class names or
  component internals. A refactor that keeps the behaviour must keep the tests green.
- **One MSW handler set**, in `src/test/`, matching the real API's shapes. It uses the
  generated types, so a contract change breaks the mocks too.
- **No snapshot tests** of whole screens. They pass whatever changed and teach nothing.
- **Deterministic time and ids.** Fake timers for polling; an injected id generator for
  idempotency keys.
- A bug fix starts with a failing test.
