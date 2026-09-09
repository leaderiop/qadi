# 07 — Enforcement

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-07                                    |
> | Revision       | 1.7                                            |
> | Effective Date | 2026-09-09                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.7 (2026-09-09): BEH-QD-054's example replaced `error._tag === "AccessDenied"` narrowing with `Effect.catchTag`, per AGENTS.md §4's array-form-only rule (issue 110, CCR-QD-147)<br>1.6 (2026-09-08): BEH-QD-056 gains a fourth requirement — projecting a record never exhausts the call stack; `FieldPath.ts`'s `projectAt` walked recursively over a `fields` spec's uncapped segment count and raised a raw `RangeError` out of the enforcement path, and now uses the explicit array-backed stack `DecodeDepthGuard.ts` and `SinkCodec.ts` already use (issue 66, INV-QD-004, CCR-QD-115)<br>1.5 (2026-09-07): Brought current against `EnforceOptions`/`filterStream`, which the document predated — BEH-QD-049's `enforce`, BEH-QD-050's `assert`/`filter`, and BEH-QD-055's `guard` corrected to their real `EnforceOptions<EO, RO>`-generic signatures; `filterStream` added to BEH-QD-050 as `filter`'s streamed sibling (CCR-QD-110)<br>1.4 (2026-08-25): BEH-QD-056 — a field spec may be a dot-path, `*` reaches exactly one level, `**` and a literal terminal are containment-equivalent; BEH-QD-051 revised to match (INV-QD-004, CCR-QD-078)<br>1.3 (2026-08-23): BEH-QD-055 — a guarded resource is the evaluated resource; the first requirement `guard` has carried (ADR-QD-043, INV-QD-032, CCR-QD-058)<br>1.2 (2026-08-23): BEH-QD-054 — a denial carries the trace, not only the sentence (ADR-QD-039, CCR-QD-053)<br>1.1 (2026-07-26): Enforcing entry points take `EnforceOptions` and refuse an undischarged obligation (CCR-QD-015)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-049: Enforcement is an aspect

> **See:** [ADR-QD-011](../decisions/011-enforce-as-aspect.md)

```ts
export const enforce: <EO = never, RO = never>(
  policy: Policy,
  options?: EnforceOptions<EO, RO>,
) => <A, E, R>(
  self: Effect.Effect<A, E, R>,
) => Effect.Effect<A, E | EnforcementError | EO, R | EvaluationServices | RO>;
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
export const assert: <E = never, R = never>(
  policy: Policy,
  options?: EnforceOptions<E, R>,
) => Effect.Effect<void, EnforcementError | E, EvaluationServices | R>;
export const filter: <A extends Resource, EO = never, RO = never>(
  policy: Policy,
  items: ReadonlyArray<A>,
  options?: EnforceOptions<EO, RO>,
) => Effect.Effect<
  ReadonlyArray<A>,
  EvaluationError | UndischargedObligation | EO,
  EvaluationServices | RO
>;
export const filterStream: <A extends Resource, E2 = never, R2 = never, EO = never, RO = never>(
  policy: Policy,
  items: Stream.Stream<A, E2, R2>,
  options?: EnforceOptions<EO, RO>,
) => Stream.Stream<
  A,
  EvaluationError | UndischargedObligation | EO | E2,
  EvaluationServices | RO | R2
>;
```

`filter` evaluates the policy once per element, with the element as the
resource, which expresses row-level authorization over a collection. An
element whose allow carries a binding obligation fails the whole call rather
than being silently dropped — dropping it would report a wiring mistake as a
denial, which [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)
exists to prevent.

`filterStream` is `filter`'s streamed sibling, for a collection too large to
hold as a `ReadonlyArray` or too large to wait on in full before the first
admitted item is usable — paginated rows from a database, say. It shares
`filter`'s per-item decision logic, so the two can never disagree about who
passes, and it is additive: `filter` is unchanged and stays the default entry
point for a collection already in hand.

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
             A field spec MAY be a dot-path; a spec expecting more depth than
             the record has MUST degrade to omission, never a thrown error
             (BEH-QD-056).
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
  Effect.catchTag("AccessDenied", (error) =>
    Effect.logDebug(renderTrace(error.trace)).pipe(Effect.andThen(Effect.fail(error))),
  ),
);
```

`Effect.catchTag` narrows on `_tag` the way a hand-written `error._tag === "..."`
check would, but without discarding the rest of `EnforcementError` from the
type: `guarded`'s failure channel is still `EvaluationError | UndischargedObligation
| AccessDenied` after the `catchTag`, because the handler re-fails with the same
`error` rather than returning `Effect.void`. Reaching for more than one tag at
once is the array form — `Effect.catchTag(["AccessDenied", "UndischargedObligation"],
…)`, as `packages/http/src/RequirePermission.ts` does — never
`Effect.catchTags({...})`'s object form (AGENTS.md §4).

## BEH-QD-055: A guarded resource is the evaluated resource

> **Invariant:** [INV-QD-032](../invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource)
> **See:** [ADR-QD-043](../decisions/043-a-decision-is-computed-from-its-inputs.md),
> [ADR-QD-035](../decisions/035-witness-guard-primitive.md)

```ts
export const guard: <P extends Permission, EO = never, RO = never>(
  permission: P,
  policy: Policy,
  options?: EnforceOptions<EO, RO>,
) => <A extends Resource, B, E, R>(
  resource: A,
  handler: (authorized: Authorized<P>, resource: A) => Effect.Effect<B, E, R>,
) => Effect.Effect<B, E | EnforcementError | EO, R | EvaluationServices | RO>;
```

```
REQUIREMENT: The policy MUST be evaluated against `resource`. A `resource`
             supplied in `options` MUST NOT override it.
```

The first requirement `guard` has carried. It was written after the reverse
shipped: `resource` reached only the handler, and the policy was evaluated with
`options.resource`, which no caller set.

That direction is **fail-open**, which is why it needs an invariant rather than a
note. An absent resource does not deny — a `ResourceRef` resolves to `undefined`
and `neq` against `undefined` is `true` — so a policy written to refuse a
mismatched tenant allowed one, and the handler was handed an `Authorized<P>`
witness for a check that had not happened.

```
REQUIREMENT: An empty resource MUST deny a resource-scoped policy, not fail.
```

The distinction between `{}` and absent is the distinction between a 403 and a
500 at an HTTP boundary. `@qadi/http`'s `RequirePermission` guards with `{}`
before any resource is loaded, precisely so that an endpoint-level policy
touching a resource attribute refuses rather than erroring.

## BEH-QD-056: Wildcard depth is exactly one level, never more

> **Invariant:** [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)

A field spec's terminal segment may be a literal name, `*`, or `**`. A
literal terminal and `**` are **containment-equivalent** — both grant the
value at that path whole and unrestricted, at any depth beneath it — which is
what makes a pre-existing flat field name (`"title"`) behave identically to
`"title.**"`, and is the entire backward-compatibility argument for this
feature: no existing `fields: [...]` array changes meaning.

`*` is narrower and does not generalize past one level:

```
REQUIREMENT: A "*" terminal MUST grant existence of every immediate child of
             the node it reaches, and MUST NOT disclose an object-valued
             child's own contents. Such a child MUST be present in the
             projection as an empty object, never omitted and never shown
             whole.
REQUIREMENT: A scalar- or array-valued child reached only by "*" MUST be
             shown whole — there is nothing further to redact, and an array
             is never itself descended into as if its indices were object
             keys.
REQUIREMENT: Comparing a "*" spec against a spec at a different depth on the
             same path MUST NOT claim a subset relationship in either
             direction, for `intersectFields`'s purposes — whether one
             discloses more than the other depends on the reached value's
             actual runtime shape (scalar vs. object), which the specs alone
             cannot say. The safe answer under ambiguity is the same one
             `PolicyNotTranslatable` gives elsewhere in this library: refuse
             to claim it, rather than guess.
REQUIREMENT: Projecting a record MUST NOT exhaust the call stack, whatever a
             field spec's segment count or the projected resource's nesting
             depth. A spec deeper than the data omits, and a spec deeper than
             any stack would hold projects — neither raises a `RangeError`.
```

The fourth requirement is a hardening, not a change of meaning: the
projection is identical node for node, and only the mechanism moved. It is
stated here because the property is not obvious from the projection rules
above and nothing else in this document implies it.

`FieldPath.ts`'s `projectAt` used real function-call recursion, one frame per
matching segment, over two inputs a policy author controls — a `fields` spec,
which `parseFieldPath` splits with no length cap, and the resource it
descends. Both arrive inside a `Policy` that
[ADR-QD-002](../decisions/002-schema-derived-policy-adt.md) says is persisted
and re-parsed from untrusted JSON, and a dot-path's segment count is invisible
to `MAX_DECODE_DEPTH`, which bounds a policy's *structural* nesting and never
looks inside one long string. A crafted spec against a correspondingly deep
resource therefore raised a raw `RangeError` out of the enforcement path
itself — `Decision.ts`'s `project`, reached on every field-restricted allow —
crashing the evaluating process instead of failing the one decision closed.
It now walks with an explicit array-backed stack, the same shape
`DecodeDepthGuard.ts`'s `exceedsJsonDepth` and `SinkCodec.ts`'s `isJsonSafe`
were converted to for exactly this reason; this was the walk that had been
missed (CCR-QD-115).

The third requirement was not a simplification decided in advance — it was a
defect caught by a differential test: an earlier version of this rule assumed
a `"*"` one level up always subsumed a literal spec one level down, verified
by hand-picked examples that happened not to include an object-valued target.
`intersectFields(["address.*"], ["address.street"])` under that rule returned
`["address.street"]`; the correct answer, once `street`'s own value shape is
accounted for, is that the two are incomparable, and the merge under
`Intersection` keeps neither.

---

_Previous: [06 — Services and Layers](./06-services.md) | Next: [08 — Serialization](./08-serialization.md)_
