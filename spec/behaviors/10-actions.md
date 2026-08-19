# 10 — The Action Dimension

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-10                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-012) |

_Previous: [09 — React Integration](./09-react.md)_

---

## BEH-QD-073: The action is a request input

> **See:** [ADR-QD-018](../decisions/018-action-dimension.md)

```ts
export interface EvaluateOptions {
  readonly resource?: Resource;
  readonly action?: string;
  readonly maxDepth?: number;
}
```

```
REQUIREMENT: The action MUST enter evaluation as request-scoped input, beside
             the resource. It MUST NOT be derived from, or compared against, a
             permission token's action segment.
```

A permission is a grant the subject holds; an action is a property of the call.
`doc:write` means *may write*; an action of `"write"` means *is writing*. They
share a word and nothing else, and conflating them would put
[INV-QD-001](../invariants.md#inv-qd-001-permission-key-uniqueness) at risk from
a direction it was never designed to resist.

```
REQUIREMENT: The action MUST reach every node of the policy tree unchanged, so
             that a rule nested under `AllOf`, `AnyOf`, `Not` or `Labeled` reads
             the same verb as one at the root.
```

## BEH-QD-074: `HasAction`

```ts
export const hasAction: (action: string, options?: FieldOptions) => Policy;
```

A tenth variant of the policy union, carrying the same optional `fields` as the
other leaves.

```
REQUIREMENT: `HasAction` MUST allow when the supplied action equals the one it
             names, and deny otherwise. The denial reason MUST name both, since
             "action is 'read', not 'write'" is the whole diagnosis.
```

## BEH-QD-075: `action()`

```ts
export const action: () => ValueRef;
```

A fifth value reference, so the verb can be compared against subject or resource
data rather than only against a constant.

```
REQUIREMENT: `action()` MUST resolve to the supplied action within any matcher
             that accepts a `ValueRef` — `eq` and `neq`, at any nesting depth
             reachable through `fieldMatch`, `someMatch`, `everyMatch` or `size`.
```

## BEH-QD-076: An absent action is an error

> **Invariant:** [INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one)

```ts
export class MissingAction extends Data.TaggedError("MissingAction")<{
  readonly expected: string | undefined;
}> {}
```

```
REQUIREMENT: A policy that reads the action while none was supplied MUST fail
             with `MissingAction`. It MUST NOT deny. This is the rule an absent
             resource already follows with `MissingResource`, and for the same
             reason: a forgotten argument is a wiring error, and reporting it as
             "not authorized" sends an engineer to audit permissions.
```

```
REQUIREMENT: The check MUST happen before the matcher runs. `evaluateMatcher` is
             total, so an unguarded `action()` would resolve to `undefined`,
             satisfy nothing, and be indistinguishable from a genuine denial.
             `referencesAction` is the guard.
```

`expected` names the required action when the policy named one. A matcher
comparing against `action()` requires nothing, so it reports `undefined`.

## BEH-QD-077: Observability

> **See:** [ADR-QD-009](../decisions/009-observability-via-effect.md)

```
REQUIREMENT: The `qadi.evaluate` span MUST carry `qadi.action` when an action
             was supplied, and MUST omit the attribute entirely when none was.
             Two evaluations of one policy differing only in the verb are
             otherwise indistinguishable in a trace.
```

## BEH-QD-078: Worked example — the ★-property

Bell–LaPadula's two rules as a single stored policy. The verb selects the
comparison, and both arms survive a round trip through JSON.

```typescript
import {
  allOf,
  anyOf,
  gte,
  hasAction,
  hasResourceAttribute,
  lt,
  type Policy,
} from "@qadi/core";

const starProperty: Policy = anyOf([
  // read down: no higher than the subject's clearance
  allOf([hasAction("read"), hasResourceAttribute("level", lt(3))]),
  // write up: no lower, so information cannot be declassified by copying
  allOf([hasAction("write"), hasResourceAttribute("level", gte(3))]),
]);
```

Comparing the verb against data rather than a constant uses the value reference:

```typescript
import { eq, action, hasResourceAttribute, type Policy } from "@qadi/core";

// "the resource says which operation it requires, and this is it"
const performsRequiredOperation: Policy = hasResourceAttribute(
  "requiredOp",
  eq(action()),
);
```

---

_Previous: [09 — React Integration](./09-react.md) | Next: [11 — Obligations](./11-obligations.md)_
