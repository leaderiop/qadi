---
title: "@qadi/audit"
description: An optional, dependency-free companion package assembling an audit trail, staging, a circuit breaker, retention, and e-signature capture onto @qadi/core's DecisionSink.
---

`@qadi/audit` is an optional companion package that narrows
[ADR-QD-016](https://github.com/leaderiop/qadi/blob/main/spec/decisions/016-gxp-out-of-scope.md)'s
GxP-out-of-scope boundary: rather than a set of individually correct pieces
that the real enforcement path never calls, it ships a real, assembled audit
pipeline — audit trail write, best-effort staging, and an internal circuit
breaker composed into one sequence reachable through the single call every
evaluation already makes.

It composes onto `@qadi/core`'s `DecisionSink` seam — write-only, read
through `Effect.serviceOption`, error channel `never` by design — so
`@qadi/core` itself gains zero new dependencies through this package
existing. `@qadi/audit` is dependency-free too: it opens no connection,
generates no key, and assumes no schema. Every capability that needs real
storage, identity or cryptography is a caller-supplied port.

## What's in it

- The assembled `DecisionSink` implementation and the ports it composes:
  audit trail, staging, and the internal circuit breaker — see
  [Capabilities](/docs/packages/audit/capabilities/).
- E-signature *capture* (`SignatureCapturePort`, `signatureObligationHandler`)
  — see [E-Signatures](/docs/packages/audit/signatures/).
- Retention, chain-integrity verification, archival, and a decommissioning
  checklist — pure, caller-invoked functions structurally outside the
  `DecisionSink` pipeline.

For the exhaustive export list, see
[`spec/overview.md`](https://github.com/leaderiop/qadi/blob/main/spec/overview.md#qadiaudit).
For what this package's boundaries mean for a regulated environment, see
[Compliance](/compliance/).
