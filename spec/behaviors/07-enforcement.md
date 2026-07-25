# 07 — Enforcement

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-BEH-07                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-001) |

---

## BEH-EG-049: Enforcement is an aspect

> **See:** [ADR-EG-011](../decisions/011-enforce-as-aspect.md)

```ts
export const enforce: (
  policy: Policy,
  options?: EvaluateOptions,
) => <A, E, R>(
  self: Effect.Effect<A, E, R>,
) => Effect.Effect<A, E | EvaluationError | AccessDenied, R | EvaluationServices>;
```

```ts
const handler = updateDocument(id).pipe(Guard.enforce(canEditDocument));
```

```
REQUIREMENT: When the policy denies, the guarded effect MUST NOT run. It is not
             enough to discard its result — the protected work must never start.
```

## BEH-EG-050: The enforcement surface

```ts
export const decide: (policy: Policy, options?: EvaluateOptions) => Effect.Effect<Decision, ...>;
export const check: (policy: Policy, options?: EvaluateOptions) => Effect.Effect<boolean, ...>;
export const assert: (policy: Policy, options?: EvaluateOptions) => Effect.Effect<void, ...>;
export const filter: <A extends Record<string, unknown>>(
  policy: Policy,
  items: ReadonlyArray<A>,
) => Effect.Effect<ReadonlyArray<A>, ...>;
```

`filter` evaluates the policy once per element, with the element as the
resource, which expresses row-level authorization over a collection.

## BEH-EG-051: Field-level projection

> **Invariant:** [INV-EG-004](../invariants.md#inv-eg-004-field-visibility-lattice)

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

## BEH-EG-052: Denial carries its reason

```ts
export class AccessDenied extends Data.TaggedError("guard/AccessDenied")<{
  readonly subjectId: string;
  readonly policyTag: string;
  readonly reason: string;
}> {}
```

```
REQUIREMENT: `AccessDenied` MUST be catchable by tag and MUST carry the subject,
             the policy tag and a human-readable reason.
```

## BEH-EG-053: Worked example

```typescript
import * as Effect from "effect/Effect";
import {
  enforce,
  enforceProjected,
  hasPermission,
  permission,
} from "@guard/core";

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
