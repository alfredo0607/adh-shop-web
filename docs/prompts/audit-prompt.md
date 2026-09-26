# COMPLETE TECHNICAL AUDIT — REACT / TYPESCRIPT FRONTEND

I want you to act as a Senior Software Architect + Senior Frontend Engineer + Senior React/TypeScript Developer + Security Reviewer + Code Reviewer, with experience in enterprise frontend applications, SPAs, state management, scalable architectures and production applications.

Your standard must be that of a Tech Lead reviewing the frontend of an application that will have to be maintained for several years and support real growth in users, traffic and functionality.

I do NOT want a superficial audit.

I do NOT want you to simply run through a checklist.

I want you to understand the architecture, the data flow and the responsibilities of each module before drawing conclusions.

---

## 1. PRIMARY OBJECTIVE

You must carry out a deep technical audit of the frontend, module by module.

The application is built primarily with:

- React
- TypeScript
- Redux (Redux Toolkit / RTK Query / Redux Saga / Redux Thunk, where applicable)
- React Router / TanStack Router, where applicable
- Hooks (useState, useEffect, useMemo, useCallback, custom hooks)
- Context API, where applicable
- Functional components
- Class components (if any exist)
- Forms (React Hook Form, Formik, etc.)
- Validation (Zod, Yup, etc.)
- Data fetching (fetch, axios, RTK Query, React Query, SWR)
- Styling (CSS Modules, styled-components, Tailwind, Emotion, SCSS)
- Testing (Jest, Vitest, React Testing Library, Cypress, Playwright)
- Build tools (Vite, Webpack, Next.js, CRA)
- Linting (ESLint, Prettier)
- Global and local state management
- Error handling (Error Boundaries)
- Suspense / lazy loading
- Accessibility (a11y)
- Internationalization (i18n), where applicable
- PWA / Service Workers, where applicable
- Environment variables
- Frontend observability (Sentry, LogRocket, etc.)
- CI/CD
- Docker, where applicable

Adapt the audit to the technologies that actually exist in the project.

Do not assume a technology is present simply because it is common in React.

---

## 2. MAIN RULE: ANALYSE MODULE BY MODULE

You must first identify the application's real modules/features.

For example:

- Auth
- Users
- Dashboard
- Products
- Cart / Checkout
- Orders
- Notifications
- Reports
- Settings
- Admin
- etc.

These are only examples.

You must use the real modules found in the code.

For each module:

1. Understand its responsibility.
2. Identify every related file.
3. Understand the complete data flow.
4. Review Components → Hooks → Redux/State → API → UI.
5. Review the TypeScript types.
6. Review the slices / reducers / actions / thunks.
7. Review the selectors.
8. Review the custom hooks.
9. Review form handling.
10. Review validation.
11. Review data fetching.
12. Review error handling.
13. Review loading / empty states.
14. Review performance.
15. Review security.
16. Review testing.
17. Review architecture.
18. Review maintainability.
19. Review scalability.
20. Review accessibility.

Do NOT draw conclusions about a module after reviewing only one or two files.

---

## 3. FUNDAMENTAL RULE: DO NOT INVENT

Do not invent problems.

Do not invent functionality.

Do not assume behaviour that cannot be demonstrated from the code.

If something cannot be verified, you must state:

Not verifiable with the available code.

Clearly distinguish between:

**Confirmed problem**

There is direct evidence in the code.

**Potential risk**

A situation exists that could cause a problem depending on conditions that cannot be fully verified.

**Recommendation**

Not necessarily a bug, but a technically justifiable improvement.

**Optional improvement**

A quality improvement that is not required for correct operation.

Do NOT flag as a problem something that is merely a personal architectural preference.

---

## 4. UNDERSTAND THE ARCHITECTURE FIRST

Before auditing the modules, identify:

- Overall architecture (feature-based, atomic design, layered, etc.).
- Folder organisation.
- Component structure.
- Redux structure (slices, store, middleware).
- Dependencies between modules.
- Application entry point.
- Global configuration.
- Routing.
- Frontend authentication system.
- Authorization system (roles, permissions in the UI).
- Data fetching.
- Global vs local state management.
- Data cache.
- Form handling.
- Styling system.
- Logging system.
- Testing.
- Build and bundling.
- Production configuration.

Briefly explain how the architecture currently works.

Do NOT propose changing the architecture yet.

Understand the existing architecture first.

---

## 5. REACT ARCHITECTURE REVIEW

Analyse specifically:

### Folder structure and features

Review:

- Responsibility of each folder/feature.
- Cohesion.
- Coupling.
- Unnecessary imports.
- Barrel files (index.ts) — do they help or create circular dependencies?
- Oversized modules.
- Folders with too many responsibilities.
- Dependencies between features.
- Code reuse.
- Shared code (`shared`, `common`, `ui`).
- Dead code.

Ask:

Does the feature separation genuinely represent the responsibilities of the domain?

### Components

Review:

- Oversized components.
- Business logic inside the component.
- Direct API calls from presentational components.
- Unnecessary manual validation.
- Transformations that belong in hooks or services.
- Duplicated code.
- Components with too many props (prop drilling).
- Components doing too many things.
- Components without memoization where needed.
- Components memoized unnecessarily.
- Presentational vs container components.

A component should mainly handle:

UI → interaction → delegation → render.

Detect any significant deviation.

### Hooks

Review:

- Oversized custom hooks.
- God hooks.
- Mixed responsibilities.
- Duplicated business logic.
- Excessive dependencies.
- Misused useEffect.
- useEffect that should be useMemo / useCallback / event handler.
- useEffect with incorrect dependencies.
- useEffect to sync state (anti-pattern).
- useEffect with derived logic that should be computed during render.
- Missing cleanup in useEffect (subscriptions, timers, listeners).
- Unnecessary useMemo / useCallback (premature optimization).
- Rules of hooks violations.

Determine whether the hooks correctly represent the domain logic.

### Redux / State Management

Review:

- Store structure.
- Slices per feature.
- Pure reducers.
- Well-typed actions.
- Memoized selectors (createSelector).
- Correct use of Redux Toolkit.
- RTK Query for data fetching (if applicable).
- Middleware (thunk, saga, listener).
- State normalization.
- Duplicated state.
- Derived state stored in Redux (anti-pattern).
- Local vs global state — is the decision correct?
- Excessive use of Redux for state that should be local.
- Use of Context API where Redux would be better, or vice versa.
- Persistence (redux-persist) — is it well configured?
- DevTools in production.
- Non-serializable data.

Ask:

Is global state justified, or is Redux being used for everything out of habit?

---

## 6. ARCHITECTURE AND SEPARATION OF RESPONSIBILITIES

Determine whether there is a reasonable separation between:

```
UI (Presentational components)
    ↓
Containers / Features
    ↓
Hooks / Business logic
    ↓
Redux / Global state
    ↓
API / Services
```

Where the architecture in use differs, explain why it may be valid.

Look for:

- Business logic inside UI components.
- API calls inside presentational components.
- Fetching logic inside components that should only render.
- Data transformation in the component instead of the selector/hook.
- Business rules duplicated between components.
- Services mixed with UI.
- Scattered direct access to `localStorage` / `sessionStorage`.

---

## 7. COMPONENT DESIGN AND INTERNAL API

Review each main component.

Analyse:

- Props API.
- Prop types.
- Optional vs required props.
- Default values.
- Composition vs inheritance.
- Use of `children`.
- Render props.
- Compound components.
- Controlled vs uncontrolled.
- Event handling.
- Ref forwarding.
- Consistency between components.
- Naming.
- Reusability.

Detect:

- Components with too many props.
- Ambiguous props.
- Components that are hard to reuse.
- Inconsistent APIs between similar components.
- Components exposing internal details.

---

## 8. TYPESCRIPT TYPES AND VALIDATION

Review:

- Props types.
- State types.
- Redux types.
- API types.
- Zod / Yup / runtime validation.
- Generated types (OpenAPI, GraphQL codegen).
- `any` — usage and justification.
- `unknown`.
- `never`.
- Type assertions (`as`).
- Non-null assertions (`!`).
- Generics.
- Interfaces vs types.
- Utility types (`Partial`, `Pick`, `Omit`, etc.).
- Discriminated unions.
- Event typing.
- Ref typing.
- Hook typing.

Analyse whether validation happens in the right place.

Verify in particular:

```
User input
    ↓
Validation (form + runtime)
    ↓
Transformation
    ↓
Business logic / API
```

Untrusted data must never reach sensitive logic without validation.

Review especially:

- API responses without validation (assuming types).
- `as` to silence errors.
- Excessive use of `any`.
- Duplicated types between frontend and backend.

---

## 9. AUTHENTICATION (FRONTEND)

Audit in depth:

- Login.
- Logout.
- Registration.
- Token refresh.
- Token storage (localStorage vs sessionStorage vs httpOnly cookies).
- Expiration handling.
- Axios/fetch interceptors.
- Redirect on 401.
- Protected routes.
- Session persistence.
- Logout across multiple tabs.
- Token handling in Redux.

Review:

- Tokens in localStorage (XSS risk).
- Tokens in Redux without secure persistence.
- Poorly implemented refresh token.
- Tokens written to logs.
- Missing expiration handling.
- Missing global logout.
- Protected routes only in the UI (without backend validation).

---

## 10. AUTHORIZATION (FRONTEND)

Verifying that the user is authenticated is not enough.

Review:

- Roles.
- Permissions.
- Route guards.
- Conditional rendering by permissions.
- Protected components.
- Authorization hooks.
- RBAC.
- ABAC, where applicable.

Look specifically for:

### UI that assumes authorization

For example:

- Buttons hidden but the action still available via API.
- Routes protected only on the client.
- Sensitive data conditionally rendered but present in state.

Real authorization must be on the backend. The frontend only improves UX.

Verify whether the frontend confuses "hiding UI" with "protecting actions".

---

## 11. SECURITY (FRONTEND)

Carry out a security audit based on real risks.

Review:

- OWASP Top 10 (frontend).
- XSS.
- dangerouslySetInnerHTML.
- HTML injection.
- CSRF (if applicable).
- Misconfigured CORS.
- Content Security Policy.
- Secrets exposed in the bundle.
- API keys on the client.
- Tokens in localStorage.
- Sensitive data in Redux DevTools.
- Sensitive data in logs.
- Vulnerable dependencies.
- `target="_blank"` without `rel="noopener noreferrer"`.
- Iframes.
- PostMessage.
- Insecure deserialization.
- Open redirects.
- URL manipulation.

Also review:

- .env.
- `VITE_` / `REACT_APP_` variables (visible in the bundle).
- Hardcoded secrets.
- Build configuration.

Never assume something is secure merely because it uses React.

React escapes HTML by default, but there are many ways to bypass that protection.

---

## 12. DATA FETCHING AND CACHING

Identify the technology in use:

- fetch
- axios
- RTK Query
- React Query / TanStack Query
- SWR
- GraphQL (Apollo, urql)
- etc.

Audit:

- Loading handling.
- Error handling.
- Empty states.
- Retries.
- Request cancellation (AbortController).
- Race conditions in searches.
- Debouncing / throttling.
- Cache.
- Cache invalidation.
- Refetch.
- Polling.
- Pagination.
- Infinite scroll.
- Prefetching.
- Optimistic updates.
- Normalization.

Look especially for:

**Race conditions** — demonstrate the concrete scenario.

**Duplicated requests.**

**Missing cancellation** on component unmount.

**Missing cache** where it would be beneficial.

**Poorly invalidated cache.**

---

## 13. STATE MANAGEMENT AND CONSISTENCY

Review operations that modify multiple parts of the state.

Determine whether there is a risk of inconsistency.

Example:

```
Add product to cart
    ↓
Update counter
    ↓
Update total
```

If one step fails, what happens to the others?

Look for:

- Partially updated states.
- Missing rollback in optimistic updates.
- Duplicated state across different slices.
- Missing normalization.
- Race conditions between actions.

Do not flag an operation as problematic merely because it does not use a specific library.

Explain first why it would be problematic.

---

## 14. CONCURRENCY AND RACE CONDITIONS

Pay particular attention to:

- Simultaneous requests.
- Searches with poorly implemented debounce.
- Concurrent updates to the same state.
- Double submit.
- Effects firing multiple times.
- useEffect with unstable dependencies.
- Forms submitting multiple times.
- Overlapping polling.
- Race conditions in RTK Query / React Query.

Do not assume a race condition exists merely because the code is async.

You must demonstrate:

1. The scenario.
2. Action A.
3. Action B.
4. The shared state.
5. The incorrect result.

---

## 15. ASYNC / PROMISES

Review:

- async/await.
- Promises.
- Promise.all.
- Promise.allSettled.
- Error handling.
- Unnecessary sequential requests.
- Parallelisable requests.
- Fire-and-forget.
- Unhandled promises.
- Missing awaits.
- Blocking operations on the main thread.

Look for:

```
await A()
await B()
await C()
```

where it would actually be safe to run:

```
await Promise.all([A(), B(), C()])
```

But do NOT optimise automatically.

First determine whether a dependency exists between the operations.

---

## 16. FRONTEND PERFORMANCE

Audit:

- Initial load time.
- Bundle size.
- Code splitting.
- Route lazy loading.
- Lazy loading of heavy components.
- Tree shaking.
- Unnecessary re-renders.
- Memoization (React.memo, useMemo, useCallback).
- Large lists (virtualization).
- Images (lazy, responsive, modern formats).
- Fonts.
- CSS-in-JS vs static CSS.
- Animations.
- Debouncing / throttling.
- Web Vitals (LCP, FID, CLS).
- Blocking rendering.

Look especially for operations that can block the main thread:

- heavy processing during render;
- large loops;
- expensive calculations on every render;
- large JSON.parse / JSON.stringify;
- expensive synchronous operations.

---

## 17. MEMOIZATION AND RE-RENDERS

Review:

- Components that re-render unnecessarily.
- Missing memoization in lists.
- Missing stable keys in lists.
- Keys using the index (anti-pattern).
- Objects/functions created on every render passed as props.
- Correct use of React.memo.
- Correct use of useMemo / useCallback.
- Excessive memoization (premature optimization).
- Context that re-renders the whole tree.

Ask:

Does the memoization solve a real problem or just add complexity?

Do not recommend memoizing without a demonstrable need.

---

## 18. ERROR HANDLING

Review:

- Error Boundaries.
- Error handling in data fetching.
- Error handling in forms.
- Error handling in Redux.
- Error handling in hooks.
- UI fallbacks.
- Error messages to the user.
- Error logging.

Look for unnecessary try/catch blocks.

But also look for missing handling where it is genuinely needed.

Determine whether the system can:

- hide sensitive information;
- avoid showing stack traces to the user;
- maintain a consistent error structure;
- recover from partial errors.

---

## 19. LOGGING AND OBSERVABILITY

Review:

- console.log.
- Sentry / LogRocket / Datadog.
- Structured logging.
- Log levels.
- Correlation IDs.
- Request IDs.
- User tracking.
- Performance monitoring.
- Web Vitals reporting.

The following must never appear in logs:

- passwords;
- JWTs;
- refresh tokens;
- API keys;
- secrets;
- sensitive information.

Assess whether the logs would allow a production incident to be investigated.

---

## 20. CONFIGURATION

Audit:

- .env.
- Environment variables.
- `VITE_` / `REACT_APP_` variables.
- Per-environment configuration (dev, staging, prod).
- Defaults.
- Secrets (which must NOT be on the client).
- Hardcoded configuration.

Look for:

```
if (import.meta.env.MODE === ...)
```

repeated throughout the application.

Assess whether a centralised configuration strategy exists.

Remember: everything that goes into the bundle is public. There are never real secrets in the frontend.

---

## 21. TYPESCRIPT

Review:

- any.
- unknown.
- never.
- Type assertions.
- as.
- Non-null assertions (!).
- Interfaces.
- Types.
- Generics.
- Utility types.
- Discriminated unions.
- Props types.
- State types.
- API types.
- Event types.

Look for types that hide errors.

Example:

```typescript
const data = response.data as User;
```

Determine whether there is any actual guarantee that `data` is a `User`.

Also grade the quality of the typing.

Review `tsconfig.json`:

- `strict`.
- `noImplicitAny`.
- `strictNullChecks`.
- `noUncheckedIndexedAccess`.
- `exactOptionalPropertyTypes`.
- `noImplicitReturns`.

---

## 22. STYLING AND DESIGN

Review:

- Style consistency.
- Design system (design tokens, theme).
- CSS Modules vs styled-components vs Tailwind.
- Inline styles.
- Duplicated CSS.
- Dead CSS.
- Responsive design.
- Mobile first.
- Breakpoints.
- Dark mode.
- Theming.
- Visual accessibility (contrast).
- CSS variables.

Determine whether a coherent design system exists or whether styles are scattered.

---

## 23. ACCESSIBILITY (A11Y)

Review:

- Semantic HTML.
- ARIA roles.
- Labels on inputs.
- Alt on images.
- Color contrast.
- Keyboard navigation.
- Focus management.
- Visible focus.
- Skip links.
- Accessible forms.
- Accessible modals.
- Accessible custom components.
- Screen readers.

Determine whether the application is usable by people with disabilities.

Accessibility is not optional in enterprise applications.

---

## 24. FORMS

Review:

- Form state handling.
- Validation (client and server).
- Error messages.
- Required fields.
- Correct input types.
- Autocomplete.
- Accessibility.
- Submit handling.
- Double submit.
- Reset.
- Dirty state.
- Touched state.
- Async validation.
- Server error handling.

Determine whether the forms are robust and accessible.

---

## 25. ROUTES AND NAVIGATION

Review:

- Route structure.
- Nested routes.
- Protected routes.
- Navigation guards.
- Route lazy loading.
- Route parameters.
- Query params.
- 404 handling.
- Redirects.
- History.
- Scroll restoration.
- Deep linking.

Determine whether navigation is consistent and predictable.

---

## 26. CLEAN CODE AND MAINTAINABILITY

Look for:

- God components.
- God hooks.
- Overly long files.
- Overly long functions.
- Duplicated code.
- Dead code.
- Unnecessary imports.
- Magic numbers.
- Magic strings.
- Hardcoding.
- Unclear names.
- Unnecessary abstractions.
- Obsolete comments.
- Important TODOs.
- Excessive cyclomatic complexity.
- Style consistency.

Do not recommend abstracting code merely because it appears twice.

Determine whether the abstraction genuinely improves maintenance.

---

## 27. SOLID AND PATTERNS

Evaluate where genuinely applicable:

- Single Responsibility.
- Open/Closed.
- Liskov Substitution.
- Interface Segregation.
- Dependency Inversion.
- DRY.
- Separation of Concerns.
- Composition.
- Container / Presentational.
- Custom hooks as abstraction.
- Compound components.
- Render props.
- HOC (where applicable).

IMPORTANT:

I do NOT want you to force patterns.

A simple, clear architecture is preferable to an excessively complex one.

If there is no real need for HOC, render props, or advanced patterns, do not recommend them merely because they are "best practice".

---

## 28. TESTING

Review:

- Unit tests.
- Integration tests.
- E2E tests (Cypress, Playwright).
- Component tests (React Testing Library).
- Hook tests.
- Redux tests (reducers, selectors).
- Form tests.
- Route tests.
- Authentication tests.
- Authorization tests.
- Error cases.
- Edge cases.
- Accessibility in tests.

If there are no tests, do NOT simply say "tests are missing".

Determine:

1. Which parts should have tests.
2. What risk exists.
3. Which tests are the highest priority.
4. Which critical behaviour is unprotected.

Prioritise tests covering:

- authentication;
- authorization;
- business logic;
- critical flows (checkout, payments);
- forms;
- API integrations.

---

## 29. E2E AND API CONTRACTS

Review whether critical flows have E2E coverage.

Analyse:

- Navigation.
- Authentication.
- API interaction.
- Validation.
- Business logic.
- Final UI.
- Error handling.

If Swagger/OpenAPI exists, review:

- Whether frontend types are generated or hand-written.
- Whether there is a risk of desynchronization with the backend.
- Whether there is runtime validation of responses.

Determine whether the contract with the backend is protected.

---

## 30. PRODUCTION

Determine whether the frontend is ready for production.

Review:

- Console.logs in production.
- Source maps.
- Minification.
- Compression (gzip, brotli).
- CDN.
- Cache headers.
- Service workers.
- PWA.
- SEO (if applicable).
- Meta tags.
- Favicon.
- Analytics.
- Error tracking.
- Web Vitals.
- Versioning.
- Rollback strategy.

---

## 31. BUILD AND BUNDLING

Review:

- Vite / Webpack / Next.js.
- Code splitting.
- Chunk strategy.
- Vendor splitting.
- Tree shaking.
- Bundle size.
- Bundle analysis.
- Assets (images, fonts).
- Source maps.
- Build time.
- Build cache.

Determine whether the build is optimised for production.

---

## 32. SCALABILITY

Ask for each module:

"If this module had ten times the data, users and functionality, would it still work correctly?"

Analyse:

- Global state.
- Components.
- Routes.
- Lists.
- Forms.
- Data fetching.
- Bundle size.
- Maintainability.

Distinguish between:

**Current problem** — there is already evidence that the design causes a problem.

**Scalability risk** — it currently works, but there is a demonstrable limitation as it grows.

Do not invent hypothetical problems without justifying the scenario.

---

## 33. RED FLAGS

Identify specifically:

- God components
- God hooks
- Redux used for everything
- Duplicated state
- Excessive prop drilling
- Misused useEffect
- Missing cleanup
- Massive re-renders
- Missing memoization in large lists
- Using index as key
- Excessive `any`
- Dangerous type assertions
- Tokens in localStorage
- Secrets in the bundle
- Potential XSS
- Vulnerable dependencies
- Duplicated code
- Hardcoded values
- Missing Error Boundaries
- Missing loading / error handling
- Missing accessibility
- Missing tests in critical flows

---

## 34. SEVERITY

Classify every problem:

**CRITICAL** — can cause:

- a serious vulnerability;
- data loss;
- exposure of sensitive information;
- significant system outage;
- serious production errors.

**HIGH** — an important problem that should be fixed soon.

**MEDIUM** — affects maintainability, performance, quality or scalability.

**LOW** — a minor improvement.

**OPTIONAL** — a quality improvement that is not necessary.

---

## 35. MANDATORY EVIDENCE

Every confirmed problem must include:

- Problem
- File
- Line/section
- Evidence
- Impact
- Why it happens
- The scenario in which it manifests
- Recommended fix
- Code example, where necessary

Do NOT make claims such as:

"This may cause performance problems."

You must explain: which operation causes the problem → why → under what scenario → what impact it produces.

---

## 36. RACE CONDITIONS

When you detect a possible race condition you must demonstrate it.

Use this format:

```
Action A (search "coffee")
    ↓
Fires request 1
Action B (search "tea")
    ↓
Fires request 2
Request 2 responds first
    ↓
UI shows "tea"
Request 1 responds later
    ↓
UI shows "coffee" (incorrect)
```

Then explain the incorrect result.

Do not flag asynchronous code as a race condition without more.

---

## 37. KEEP / IMPROVE / REFACTOR / REMOVE / ADD

For each module produce:

**Keep** — what is well implemented.

**Improve** — what can be improved without major refactoring.

**Refactor** — what needs a structural change.

**Remove** — what code, abstractions or complexity should be removed.

**Add** — what technical functionality is missing.

---

## 38. GRADING

Each module must receive a grade:

X / 10

Use:

- 9 – 10: Excellent.
- 8 – 8.9: Very good.
- 7 – 7.9: Good.
- 6 – 6.9: Acceptable.
- 5 – 5.9: Fair.
- 4 – 4.9: Poor.
- 1 – 3.9: Critical.

Do NOT be generous.

The grade must be supported by evidence.

---

## 39. EVALUATION MATRIX

For each module:

| Category                 | Grade |
| ------------------------ | ----: |
| React architecture       |  X/10 |
| Code quality             |  X/10 |
| TypeScript               |  X/10 |
| Redux / State management |  X/10 |
| Components / UI          |  X/10 |
| Hooks                    |  X/10 |
| Data fetching / Cache    |  X/10 |
| Performance              |  X/10 |
| Security                 |  X/10 |
| Authentication           |  X/10 |
| Authorization            |  X/10 |
| Error handling           |  X/10 |
| Accessibility            |  X/10 |
| Forms                    |  X/10 |
| Testing                  |  X/10 |
| Maintainability          |  X/10 |
| Scalability              |  X/10 |

Then calculate an overall grade for the module and explain how you arrived at it.

---

## 40. PER-MODULE AUDIT FORMAT

Use exactly this structure:

### MODULE: [Name]

**Responsibility** — explain what the module actually does according to the code.

**Grade** — X / 10

**Evaluation**

| Category           | Grade |
| ------------------ | ----: |
| React architecture |  X/10 |
| Code               |  X/10 |
| TypeScript         |  X/10 |
| Redux / State      |  X/10 |
| Components         |  X/10 |
| Hooks              |  X/10 |
| Data fetching      |  X/10 |
| Performance        |  X/10 |
| Security           |  X/10 |
| Auth               |  X/10 |
| Errors             |  X/10 |
| Accessibility      |  X/10 |
| Forms              |  X/10 |
| Testing            |  X/10 |
| Maintainability    |  X/10 |
| Scalability        |  X/10 |

**What is good** — list only genuine strengths found.

**Critical problems** — confirmed problems.

**Important problems** — high-priority problems.

**Recommended improvements** — medium priority.

**Minor improvements** — low priority.

**Technical findings** — for each finding:

- Problem
- Type: Confirmed problem / Potential risk / Recommendation
- Severity
- File
- Location
- Evidence
- Impact
- Why it happens
- Scenario
- Recommended fix
- Code example

**Recommended architecture** — explain how the module should look after a possible refactor. Do NOT write the full refactoring code yet. Explain the proposed architecture first.

**Action plan** — order the tasks.

---

## 41. PRIORITIES

At the end of each module:

**P0 — Critical.** Must be fixed immediately.

**P1 — High.** Must be fixed before adding further significant functionality.

**P2 — Medium.** Must be planned.

**P3 — Low.** Optional improvement.

---

## 42. DO NOT REFACTOR DURING THE AUDIT

IMPORTANT:

Do NOT change code.

Do NOT write commits.

Do NOT generate patches.

Do NOT refactor automatically.

Complete the diagnosis first.

I want to know:

1. What is wrong.
2. Why it is wrong.
3. What impact it has.
4. How urgent it is.
5. How it should be fixed.

Once the whole audit is finished you may produce the refactoring plan.

---

## 43. GLOBAL SUMMARY

After reviewing ALL modules:

| Module | Grade | Critical | High | Medium |
| ------ | ----: | -------: | ---: | -----: |
| Auth   |  X/10 |        X |    X |      X |
| Users  |  X/10 |        X |    X |      X |
| …      |     … |        … |    … |      … |

Do NOT order modules from best to worst.

Respect the application's original order.

---

## 44. CROSS-CUTTING ISSUES

Identify problems affecting several modules:

- Architecture
- Security
- Authentication
- Authorization
- State management
- Data fetching
- Components
- Hooks
- Performance
- Error handling
- Accessibility
- Forms
- Routing
- Styling
- Configuration
- Logging
- Observability
- Testing
- Typing
- Dependencies
- Build / Bundling

---

## 45. TECHNICAL DEBT

Classify:

**Critical debt** — must be resolved.

**Important debt** — should be resolved before adding further functionality.

**Moderate debt** — can be planned.

**Minor debt** — future improvements.

For each item explain:

- origin;
- impact;
- risk;
- approximate cost to resolve;
- priority.

---

## 46. GLOBAL REFACTORING ROADMAP

Finally produce:

**Phase 1 — Security and stability.** Security problems, crashes, data loss/corruption and critical issues.

**Phase 2 — P0/P1 bugs.** Correct incorrect behaviour.

**Phase 3 — Architecture.** Resolve structural problems.

**Phase 4 — Performance and scalability.** Optimise only demonstrated problems or clearly justifiable risks.

**Phase 5 — Testing.** Add coverage for critical behaviour.

**Phase 6 — Maintainability.** Cleanup, technical debt reduction and structural improvements.

---

## 47. FINAL RULES

1. Do not perform a superficial review.
2. Analyse module by module.
3. Read every related file before drawing conclusions.
4. Do not invent problems.
5. Do not invent functionality.
6. Do not assume an architectural decision is incorrect.
7. Distinguish real bugs from recommendations.
8. Prioritise real problems over personal preference.
9. Do not perform unnecessary refactoring.
10. Do not force design patterns.
11. Do not recommend microfrontends merely because the application may grow.
12. Do not recommend a state management library without a real need.
13. Do not recommend the container/presentational pattern by default.
14. Do not recommend memoization without justifying the problem it solves.
15. Do not recommend premature optimisation.
16. Treat security as a priority.
17. Consider concurrency and state consistency.
18. Consider behaviour in production.
19. Always provide evidence from the code.
20. If you find a good implementation, say so.
21. Do not change code during the audit.
22. Finish the diagnosis first.
23. Then produce the refactoring roadmap.
24. If something cannot be verified, say so explicitly.
25. Do not confuse "not ideal" with "incorrect".

---

## 48. FINAL CRITERION

I want you to think as a Senior Frontend Engineer + Tech Lead + Software Architect reviewing a pull request for an enterprise system that will have to be maintained for years.

Not as a linter.

Not as a teacher hunting for academic mistakes.

Not as someone trying to find as many problems as possible.

The objective is to find the real technical problems that have impact, demonstrate why they exist, determine their severity and explain what should be done about them.

A simple, correct implementation must be given credit even if it uses no sophisticated patterns.

A complex implementation must be challenged if that complexity is not justified.

---

## 49. DELIVERABLES

On completing the audit you must produce:

1. **Complete audit** — the detailed module-by-module review.
2. **Global summary** — with grades and problem counts.
3. **Cross-cutting issues** — problems affecting several modules.
4. **Technical debt** — classified by priority.
5. **Refactoring roadmap** — organised by phases.
6. **Documentation** — the audit must be organised so that it can become technical documentation for the project.

If a documentation structure such as the following exists:

```
docs/
├── guide/
└── audits/
```

use it as follows:

**`docs/guide/`** — for technical documentation and frontend guides.

**`docs/audits/`** — for audits, per-module reviews, findings and improvement plans.

Do NOT mix general project documentation with specific audit results.

---

## FINAL OBJECTIVE

The result must make it possible to answer clearly:

- How solid is this frontend really?
- What real problems does it have?
- Which are critical?
- What should be fixed first?
- Which parts are well built and should be kept?
- What technical debt exists?
- What would have to change to bring the frontend to a senior/production level?
