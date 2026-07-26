# 22 — The Promise Facade

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-22                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-033) |

_Previous: [21 — Decision Cache](./21-decision-cache.md)_

---

## BEH-QD-169: The facade contains no evaluation logic

> **See:** [ADR-QD-032](../decisions/032-promise-facade.md)

```ts
export const makeQadi: (layer: QadiLayer) => Qadi;
```

```
REQUIREMENT: Every method of `@qadi/promise` MUST be `runtime.runPromise` applied
             to a `@qadi/core` function. No branch in the package MAY decide an
             authorization outcome.
```

The predecessor had a synchronous `evaluate` and an `evaluateAsync` that pre-resolved
the whole tree before delegating back: short-circuiting destroyed, the asynchronous
relationship API unreachable, and the second path rotted because nothing exercised it
([ADR-QD-004](../decisions/004-single-effect-evaluator.md)). A facade that only
forwards cannot repeat that. A facade that decides anything can.

```
REQUIREMENT: The facade MUST live in its own package, so the boundary is visible in
             the dependency graph.
```

## BEH-QD-170: A denial resolves, a failure rejects

> **Invariant:** [INV-QD-026](../invariants.md#inv-qd-026-the-facade-answers-what-the-core-answers)

| Outcome | JavaScript |
| ------- | ---------- |
| Allowed | `check` resolves `true`; `decide` resolves an `Allow` |
| Denied | `check` resolves **`false`**; `decide` resolves a `Deny` |
| Resolver failure, missing action, tree too deep | the promise **rejects** |

```
REQUIREMENT: A denial MUST resolve. An evaluation error MUST reject and MUST NOT
             resolve `false`.
```

This is [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) crossing the
boundary. Collapsing the two — `try { check() } catch { return false }` — is what
turns an attribute-store outage into a silent lockout, and it is the exact shape a
Promise API invites.

```
REQUIREMENT: `assert` MUST reject on a denial, with the same `AccessDenied` the
             Effect API fails with.
```

The one place a denial is exceptional, because the caller has said "proceed only if
permitted".

## BEH-QD-171: The subject travels per call

```
REQUIREMENT: `QadiLayer` MUST exclude `CurrentSubject`, and every method MUST take
             the subject as its first argument.
```

A login must not rebuild the attribute resolver, and a long-lived runtime holding one
subject would be a per-process subject — the wrong shape for a server and a hazard in
a multi-tenant one. `@qadi/react` excludes it for the same reason
([BEH-QD-065](./09-react.md)).

## BEH-QD-172: The runtime is the caller's to close

```
REQUIREMENT: `dispose` MUST release what the layer built, and the facade MUST NOT
             call it itself.
```

Closing its own runtime would be guessing at the process lifetime, which is the
caller's to know — the same refusal [BEH-QD-164](./21-decision-cache.md) makes about
the request lifetime.

## BEH-QD-173: Worked example

```typescript
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  hasRole,
  makeSubject,
} from "@qadi/core";
import * as Layer from "effect/Layer";
import { makeQadi } from "@qadi/promise";

const qadi = makeQadi(
  Layer.mergeAll(
    AttributeResolverNone,
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
  ),
);

const subject = makeSubject({ id: "u-1", roles: ["editor"] });

declare const respond: (allowed: boolean) => void;

// A denial is a value; a broken resolver would reject instead.
const handle = async (): Promise<void> => {
  const allowed = await qadi.check(subject, hasRole("editor"));
  respond(allowed);
};
```

---

_Previous: [21 — Decision Cache](./21-decision-cache.md)_
