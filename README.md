# ADH Shop — Storefront

Mobile-first single-page storefront for ADH Shop: browse the catalogue, pay by card, and
follow the order to delivery. Built with React, Redux Toolkit and RTK Query, and backed by
the [ADH Shop API](https://github.com/alfredo0607/adh-shop-api).

Work in progress, built step by step following the [roadmap](docs/guide/roadmap.md). The
plan, the architecture and the rules this codebase follows are in
[`docs/guide/`](docs/guide/README.md).

## Stack

React 19 · TypeScript (strict) · Vite · Redux Toolkit and RTK Query · React Router ·
react-hook-form and zod · Radix UI Primitives (unstyled) · CSS Modules on design tokens ·
Jest, React Testing Library and MSW.

## Getting started

Requirements: Node 24 and pnpm.

```bash
pnpm install
pnpm dev            # http://localhost:5173, with /api proxied to the ADH Shop API
```

## Scripts

| Command             | What it does                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `pnpm dev`          | Development server with hot reload                                 |
| `pnpm build`        | Typecheck, then the production bundle in `dist/`                   |
| `pnpm preview`      | Serves the production bundle locally                               |
| `pnpm lint`         | ESLint, with type-aware rules, accessibility and import boundaries |
| `pnpm typecheck`    | TypeScript, no output                                              |
| `pnpm format:check` | Prettier, as CI runs it                                            |
| `pnpm test`         | Jest                                                               |
| `pnpm test:cov`     | Jest with coverage; fails below 80%                                |

## Pull request checks

Every pull request to `main` runs, and must pass:

1. Formatting (Prettier)
2. Lint (ESLint)
3. Typecheck (TypeScript)
4. Tests with coverage, gated at 80% as the brief requires
5. Production build
6. Dependency audit (high severity and above)

The job summary of each run shows its coverage table.
