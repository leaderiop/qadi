# 07 — Enforcement

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-07                                    |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.2 (2026-08-23): BEH-QD-054 — a denial carries the trace, not only the sentence (ADR-QD-039, CCR-QD-053)<br>1.1 (2026-07-26): Enforcing entry points take `EnforceOptions` and refuse an undischarged obligation (CCR-QD-015)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-049: Enforcement is an aspect

> **See:** [ADR-QD-011](../decisions/011-enforce-as-aspect.md)

```ts
export const enforce: (
  policy: Policy,
  options?: EvaluateOptions,
) => <A, E, R>(
  self: Effect.Effect<A, E, R>,
) => Effect.Effect<A, E | EvaluationError | AccessDenied, R | EvaluationServices>;
```

```ts
const handler = updateDocument(id).pipe(Qadi.enforce(canEditDocument));
```

```
REQUIREMENT: When the policy denies, the guarded effect MUST NOT run. It is not
             enough to discard its result — the protected work must never start.
```

## BEH-QD-050: The enforcement surface

```ts
export const decide: (policy: Policy, options?: EvaluateOptions) => Effect.Effect<Decision, ...>;
export const check: (policy: Policy, options?: EvaluateOptions) => Effect.Effect<boolean, ...>;
export const assert: (policy: Policy, options?: EnforceOptions) => Effect.Effect<void, ...>;
export const filter: <A extends Record<string, unknown>>(
  policy: Policy,
  items: ReadonlyArray<A>,
) => Effect.Effect<ReadonlyArray<A>, ...>;
```

`filter` evaluates the policy once per element, with the element as the
resource, which expresses row-level authorization over a collection.

## BEH-QD-051: Field-level projection

> **Invariant:** [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)

```ts
export const enforceProjected: (
  policy: Policy,
  options?: EvaluateOptions,
) => <A extends Record<string, unknown>, E, R>(
  self: Effect.Effect<A, E, R>,
) => Effect.Effect<Partial<A>, E | EvaluationError | AccessDenied, R | EvaluationServices>;

export const project: <A extends Record<string, unknown>>(
  decision: Decision,
  data: A,
) => Partial<A>;
```

```
REQUIREMENT: A denial MUST project to the empty object.
             An allow carrying no field restriction MUST project to the whole
             record, since an absent set is the top of the lattice.
             Fields listed but absent from the record MUST be skipped silently.
```

## BEH-QD-052: Denial carries its reason

```ts
export class AccessDenied extends Data.TaggedError("AccessDenied")<{
  readonly subjectId: SubjectId;
  readonly policyTag: string;
  readonly reason: string;
  readonly trace: Trace;
}> {}
```

```
REQUIREMENT: `AccessDenied` MUST be catchable by tag and MUST carry the subject,
             the policy tag and a human-readable reason.
```

The `trace` field is [BEH-QD-054](#beh-qd-054-a-denial-carries-the-tree-not-only-the-sentence).

## BEH-QD-053: Worked example

```typescript
import * as Effect from "effect/Effect";
import {
  enforce,
  enforceProjected,
  hasPermission,
  permission,
} from "@qadi/core";

const readDoc = permission("doc", "read");

declare const deleteDocument: (id: string) => Effect.Effect<void>;
declare const loadDocument: (
  id: string,
) => Effect.Effect<{ id: string; title: string; internalNotes: string }>;

// Denied: the deletion never starts.
const remove = deleteDocument("doc-1").pipe(enforce(hasPermission(readDoc)));

// Allowed: only the exposed fields come back.
const read = loadDocument("doc-1").pipe(
  enforceProjected(hasPermission(readDoc, { fields: ["id", "title"] })),
);
```

## BEH-QD-054: A denial carries the tree, not only the sentence

> **See:** [ADR-QD-039](../decisions/039-a-seed-is-not-an-authority.md),
> [BEH-QD-144](./18-explanation.md)

```
REQUIREMENT: `AccessDenied` MUST carry the denied decision's `trace`, and its
             `reason` MUST be that trace's root reason.
```

Enforcement is where most callers meet a denial: `assert`, `enforce`,
`enforceProjected` and `guard` all fail with this value, `@qadi/promise` rejects
with it, and `@qadi/http` maps it to a status. It was also the one path that
built the whole trace and then dropped it, keeping a single sentence — the root
node's — so the question "which branch refused?" could only be answered by
re-evaluating with `decide`, which means dismantling the enforcement wiring in
order to debug it.

`reason` is retained rather than replaced. It is the summary a log line wants,
and the invariant that it equals `trace.reason` is what stops the two drifting.

Note the disclosure boundary this does **not** cross. A trace names every node's
tag, its label and the sentence explaining why it refused, so it belongs in a log,
a thrown error or a test failure — not in a response body.
`toResponse` continues to return an empty body for every enforcement tag, and
`@qadi/react`'s hydration continues to withhold the trace by default
([BEH-QD-147](./19-hydration.md)).

```typescript
import * as Effect from "effect/Effect";
import { enforce, hasPermission, permission, renderTrace } from "@qadi/core";

declare const deleteDocument: (id: string) => Effect.Effect<void>;

const guarded = deleteDocument("doc-1").pipe(
  enforce(hasPermission(permission("doc", "delete"))),
  Effect.tapError((error) =>
    error._tag === "AccessDenied"
      ? Effect.logDebug(renderTrace(error.trace))
      : Effect.void,
  ),
);
```

---

_Previous: [06 — Services and Layers](./06-services.md) | Next: [08 — Serialization](./08-serialization.md)_
