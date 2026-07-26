# 07 — Enforcement

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-07                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.1 (2026-07-26): Enforcing entry points take `EnforceOptions` and refuse an undischarged obligation (CCR-QD-015)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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
export class AccessDenied extends Data.TaggedError("qadi/AccessDenied")<{
  readonly subjectId: string;
  readonly policyTag: string;
  readonly reason: string;
}> {}
```

```
REQUIREMENT: `AccessDenied` MUST be catchable by tag and MUST carry the subject,
             the policy tag and a human-readable reason.
```

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

---

_Previous: [06 — Services and Layers](./06-services.md) | Next: [08 — Serialization](./08-serialization.md)_
