# ADR-QD-049 — The second shell is a CLI, not a served page

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-049                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Accepted — implementation deferred             |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-068) |

---

## Context

Three of Qadi's six deployments have nowhere to put an in-page dock: a
backend-only service, a serverless function, and a replicated server. Their
decisions are reachable — `/__decisions` serves them and `ingest` merges several
processes into one timeline ([ADR-QD-046](./046-a-decision-feed-is-sse-and-guarded.md)) —
and the model that merges them imports no React
([ADR-QD-047](./047-a-headless-devtools-model.md)). So a second shell is a
second *presentation*, not a second implementation.

[ADR-QD-047](./047-a-headless-devtools-model.md) considered a served dev page
and rejected it **on cost rather than merit**, deferring the choice. This
records the choice.

## Decision

**A CLI**, reading `/__decisions` and rendering the merged timeline to a
terminal. Not a page served by `@qadi/http`.

The deciding argument is that a CLI needs **no bundler**. It is `tsc` output
like everything else this repository ships, and the seam it needs already
exists: `sourceFromEventSource` takes an `open` callback precisely so a runtime
without a global `EventSource` can supply its own reader — which Node needs
anyway, because it has none at the version this repository targets.

A served page needs a bundler, an embedding step in `pnpm build`, and therefore
a second build graph beside `tsconfig.build.json`. `@qadi/promise` was missing
from that file for six commits and nobody noticed
([ADR-QD-033](./033-the-packed-artifact-is-the-product.md)), because `pnpm typecheck` uses a
different graph and leaves something on disk that looks like a build product.
Adding a second graph is not free, and the thing it would buy — a browser view
for deployments that have no browser — is the weaker half of the case.

A CLI also reaches somewhere a page cannot: a production host over SSH, which is
where a backend-only service is usually being debugged.

## Consequences

- (+) No new build tooling, so `pnpm check` remains the whole definition of done.
- (+) The model is consumed exactly as the dock consumes it, so a divergence
  between the two shells is a test failure rather than a design drift.
- (+) Works where a browser cannot.
- (−) The repository's first `bin` entry, and `check-package-install.mjs` will
  need to know about it.
- (−) A terminal cannot render the explanation tree as richly as the dock does.
  It is a log reader first; the inspector is a stretch goal.
- (−) The three page-less deployments **still have no surface** until this is
  built. The documents say so rather than implying otherwise.

## Not decided here

Whether a served page follows later. If one ever does, this decision does not
forbid it — it says the CLI comes first, and that a bundler needs a reason
beyond "a page would be nicer".
