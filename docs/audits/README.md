# Audits

Technical audits of this codebase, newest first. Each is a point-in-time diagnosis
against the method in `docs/prompts/audit-prompt.md`.

| Date       | Audit                                            | Scope                                  | Critical | High | Medium | Low |
| ---------- | ------------------------------------------------ | -------------------------------------- | -------: | ---: | -----: | --: |
| 2026-09-26 | [Frontend audit](./2026-09-26-frontend-audit.md) | `8152be4` — every module, build and CI |        0 |    1 |      6 |  11 |

## Conventions

- One file per audit, named `YYYY-MM-DD-<scope>.md`.
- Audits are **diagnosis only**. No code is changed while auditing — the fixes land in
  their own pull requests, referencing the finding ID.
- Findings are identified per module (`C-1` checkout, `K-1` cart, `A-1` app shell…), so
  commits and pull requests can cite them.
- Anything that cannot be verified from the code is recorded as
  "not verifiable with the available code" rather than assumed.

## Separation from `docs/guide/`

`docs/guide/` holds the standards the codebase is held to. `docs/audits/` records how
the codebase measured against them on a given date. Guides are living documents;
audits are immutable once written — supersede them with a newer audit rather than
editing them.
