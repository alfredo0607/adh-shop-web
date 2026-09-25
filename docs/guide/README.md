# Engineering Guide

The plan for this storefront and the rules it is built to. Written before the first line of
code, so every later decision can be checked against what was agreed. When the code and the
guide disagree, one of them is wrong. Fix whichever it is, in the same pull request.

| Guide                                  | Covers                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------- |
| [roadmap.md](./roadmap.md)             | The build plan, step by step, with its current status                   |
| [architecture.md](./architecture.md)   | Technology choices and why, folder structure, dependency rules          |
| [state.md](./state.md)                 | Where each piece of state lives, what is persisted, and what never is   |
| [checkout-flow.md](./checkout-flow.md) | The five screens, routes, the payment sequence, resuming after a reload |
| [forms.md](./forms.md)                 | react-hook-form and zod: the card and delivery schemas, form behaviour  |
| [errors.md](./errors.md)               | The error convention: normalise, translate to es-CO, present            |
| [security.md](./security.md)           | Card data, secrets, storage, Content Security Policy                    |
| [styling.md](./styling.md)             | Design tokens, CSS Modules, mobile-first layout, images, accessibility  |
| [palette.md](./palette.md)             | The ADH Shop colour palette, the UI role of each colour, contrast       |
| [testing.md](./testing.md)             | Jest, React Testing Library, MSW, and the coverage policy               |
| [deployment.md](./deployment.md)       | Hosting on S3 and CloudFront, caching, headers, the release pipeline    |
| [git-workflow.md](./git-workflow.md)   | Branches, commits, pull requests                                        |

## How to use this

Every rule states its reason. A rule without one is a rule nobody follows under pressure,
and if you find one here, that is a defect in the guide.

Where a rule is a judgement call rather than a requirement, it says so.

## Precedence

1. The project brief.
2. These guides.
3. The [API's guides](https://github.com/alfredo0607/adh-shop-api/tree/main/docs/guide), for
   anything about the contract between the two.
4. Personal preference.

When a guide conflicts with the brief, the brief wins, and the guide is updated to record why.
