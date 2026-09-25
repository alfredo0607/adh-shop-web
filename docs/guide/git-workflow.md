# Git workflow

The same conventions as the API repository.

## Branches

- `main` is always deployable, and every merge to it is released.
- One branch per change, named `type/short-description`: `feat/checkout-modal`,
  `fix/expiry-validation`, `docs/engineering-guide`, `test/pay-order-thunk`.
- Every change reaches `main` through a pull request with a green CI. No direct pushes, except
  the repository's first commit.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): what changed, in the imperative`.

| Type                   | For                                         |
| ---------------------- | ------------------------------------------- |
| `feat`                 | Something a user can see or do              |
| `fix`                  | A defect                                    |
| `test`                 | Tests only                                  |
| `refactor`             | Structure changes without behaviour changes |
| `docs`                 | Documentation                               |
| `ci`, `chore`, `build` | Pipeline, tooling, dependencies             |

- The subject says **what changed**; the body says **why**, and what was considered and
  rejected when that matters.
- Everything in the repository is written in **English**: code, comments, tests, commit
  messages, pull requests, documentation.
- Commits are authored by the repository owner.

## Pull requests

- One step of the [roadmap](./roadmap.md) per pull request, small enough to review in one
  sitting.
- The description explains the change, the decisions behind it, and how it was verified, with
  screenshots for anything visual (phone and desktop widths).
- The roadmap's status is updated in the same pull request that completes a step.
