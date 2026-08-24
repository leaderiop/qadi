# 28 — The Devtools Screens

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-28                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-068) |

_Previous: [27 — The Devtools Timeline](./27-devtools-timeline.md)_

---

The four screens that only **read**: the policy explorer, the role viewer, the
services panel, and the React panel rescoped to questions. See
[ADR-QD-048](../decisions/048-an-observed-catalogue.md).

Three of the five screens this increment inherited had gaps that had already
closed — `permissionProvenance`, the `name?` on four port shapes, `PortMetrics`,
`DecisionCache.size`/`clear`, and `QadiAtoms.asked()` all landed in earlier
increments and `02-screens.md` had not been told. What remained was one gap
shared by two screens: nothing enumerated named policies or roles.

## BEH-QD-211: The catalogue is observed, and declaration is additive

```ts
export const policiesSeen: (self: Timeline) => ReadonlyArray<PolicySighting>;
export const catalogueOf: (self: Timeline, declared?: Catalogue) => ReadonlyArray<PolicySighting>;
```

```
REQUIREMENT: The policy list MUST be derivable from the timeline alone.
```

Every `DecisionRecord` carries the `Policy` it evaluated
([BEH-QD-183](./24-decision-sink.md)), so the policies an application actually
uses need no registry, no registration call sites, and no service that exists
for a debug view. A `Catalogue` adds names and the policies that have not run;
it is never required.

```
REQUIREMENT: Two structurally-equal policies MUST be one entry.
```

By `Equal.equals`, which is structural for plain objects in Effect v4 — the
property `Atom.family` relies on to share one atom between two independently
built equal policies, pinned by `v4-reactivity-smoke.test.ts`. Two components
building the same policy inline contribute to one row, which is what the
evaluator already does.

```
REQUIREMENT: A label MUST NOT be an identity.
```

Two different policies can derive the same display string and stay two entries.
A `Labeled` policy takes its author's name; anything else gets a structural
summary.

```
REQUIREMENT: Order MUST be the timeline's own, reversed.
```

Borrowed rather than re-derived, so the rail cannot disagree with the log about
which decision came last — and so `NaN`, which the timeline already solved once
([INV-QD-039](../invariants.md)), is not solved a second way.

## BEH-QD-212: A structural view states no verdict

```ts
export const PolicyTree: FC<{ node: InspectNode; showStatus: boolean }>;
```

```
REQUIREMENT: A policy rendered without an evaluation MUST carry no verdict
             mark, no status, and no reason.
```

[INV-QD-041](../invariants.md#inv-qd-041-a-structural-view-states-no-verdict).
`inspect(policy, undefined)` marks every node `NeverResolved`, which in the
*inspector* correctly reads "this branch was short-circuited" and in the
explorer would say a policy was skipped when it was never run. `showStatus` is
therefore not a display preference — it is the difference between reporting an
evaluation and describing a rule, and one component carries both so the
difference lives in one place.

A field restriction **is** shown, because it is a property of the rule: a
narrowed permission described as a bare requirement overstates the grant.

## BEH-QD-213: Simplification is previewed, explicit, and honest about its scope

```
REQUIREMENT: `simplify` MUST be offered as an explicit action and MUST be
             previewed before it is applied.
```

Never automatic ([ADR-QD-030](../decisions/030-policy-simplification.md)): it
rewrites the tree a reviewer is reading.

```
REQUIREMENT: The screen MUST NOT offer a rewrite `simplify` does not perform.
```

It does exactly two things — single-child composite collapse, and same-tag,
same-strategy flattening. It deliberately does **not** eliminate double
negation, which `Simplify.ts` records as a finding rather than an omission. A
policy containing one is reported as already simplified.

```
REQUIREMENT: The JSON view MUST be the real codec.
```

`toJson` and `fromJson`, not an approximation: what the screen shows is what a
caller would persist, and what it accepts is what would be read back. A paste
that does not decode reports the issue and keeps the panel.

```
REQUIREMENT: Depth MUST be shown against the bound it would be evaluated under.
```

`policyDepth(p) <= n` is exactly the condition under which
`evaluate(p, { maxDepth: n })` will not raise ([INV-QD-037](../invariants.md)),
so the comparison is a fact rather than a hint.

## BEH-QD-214: Provenance is shown, and the cycle check is not claimed

```
REQUIREMENT: The permission set shown MUST be the set that decides.
```

`permissionProvenance`'s, which [INV-QD-038](../invariants.md) holds equal to
`flattenPermissions`'. A screen showing a different set from the one that
decides is the failure this agreement exists to prevent.

```
REQUIREMENT: Every permission MUST be marked own or carry the path that
             granted it.
```

A single-element path is own; anything longer reads as *via …*.

```
REQUIREMENT: A diamond's second arm MUST be marked as already reached.
```

The structure is shown — hiding it would misrepresent the catalogue — but the
permissions beneath it were counted once, and a reader summing tinted rows would
otherwise double-count. First path wins, exactly as provenance resolves it.

```
REQUIREMENT: The screen MUST NOT display an "acyclic" result.
```

A by-value `Role` **cannot express a cycle** (ADR-QD-015); a cycle is only
representable through name-referenced definitions, which `resolveRoleGraph`
rejects. A tick here would report a check that never ran, which is worse than
reporting nothing — so the screen says why there is nothing to report.

```
REQUIREMENT: A dropped parent name MUST be surfaced.
```

Dropping is right — a partial catalogue is a normal deployment state and failing
closed would deny everything — but doing it silently was not
([BEH-QD-193](./25-inspection.md)).

## BEH-QD-215: A required port is never reported as unwired

```ts
export const wiringReport: Effect<WiringReport>;
```

```
REQUIREMENT: `AttributeResolver`, `RelationshipResolver`, `DecisionHistory`,
             `EvaluationId` and `CurrentSubject` MUST NOT be described as
             unwired.
```

They are in `EvaluationServices`: a program that has not provided them does not
run. What a card can truthfully report is that one is **defaulted to a
fail-closed implementation** ([INV-QD-007](../invariants.md)), and it carries the
consequence of that default. `DecisionCache` and `DecisionSink` are the only two
genuinely optional ones.

```
REQUIREMENT: An unnamed implementation MUST be reported as unnamed.
```

A different fact from absent, and the one a `name?` was added to answer.

```
REQUIREMENT: `wiringReport` MUST run with no layer at all.
```

Every read goes through `Effect.serviceOption`, so `R` is `never`. A panel that
could only run inside a fully-wired program would be unavailable exactly when a
wiring question arises.

## BEH-QD-216: Port activity is a passive, process-wide aggregate

```ts
export const portActivity: Effect<ReadonlyArray<PortActivity>>;
```

```
REQUIREMENT: Reading port activity MUST require no wiring.
```

`Metric`'s default registry is memoised on the reference, which is why
`PortMetrics` counts aggregates rather than emitting a record per call: a
per-call record would need a sink wired and would put a write on the
evaluation's hot path for a debug view.

```
REQUIREMENT: A port wired but never reached MUST be distinguishable from an
             absent one.
```

Opposite problems with the same symptom. `name` answers the first question and
the counts answer the second.

```
REQUIREMENT: The screen MUST state that the counts are process-wide.
```

Not per request and not per decision. Correlating a call with one evaluation
would mean threading a collector through `evaluateNode`, which risks the
short-circuit guarantee ([INV-QD-005](../invariants.md)) for a panel.

```
REQUIREMENT: No time-to-live may be offered.
```

There is none: the bound is `capacity`, evicted by insertion order rather than
by age. A TTL control would imply a cache design the library does not have. The
cache card must also not be confused with the record log — `decisionSinkRing`
has its own `clear`.

## BEH-QD-217: The React panel is keyed by question, not by instance

```
REQUIREMENT: One row per question. A per-instance count MUST NOT be claimed.
```

`Atom.family` compares with `Equal.equals`, so ten `<Can policy={isAdmin}>` in
different places in the tree are **one atom**. The library cannot tell them
apart, and a panel showing ten rows would invent a distinction the architecture
does not have. `QadiAtoms.asked()` records the questions in the atom layer
rather than by components registering themselves — an instance registry would
breach AGENTS.md §13 twice over.

The screen says this in words, because a reader counting rows against their
component tree would otherwise conclude the panel is broken.

```
REQUIREMENT: The same policy with and without a resource MUST be two rows.
```

They are two questions.

```
REQUIREMENT: Hydration counts that are not obtainable MUST be named as such.
```

Only a verdict **disagreement** is reported, once per question:
`hydrateDecisions` returns its entries and does not retain them, and nothing
counts re-evaluations. No reporter wired shows *no reporter*, never zero — zero
would claim there were no mismatches when there is simply nobody counting.

## BEH-QD-218: Every screen degrades to an explanation

```
REQUIREMENT: A dock mounted with no optional props MUST render every tab, and
             each empty screen MUST say why it is empty.
```

Four of the six screens read data the dock cannot obtain for itself. A blank
panel is indistinguishable from a broken one; an empty state naming the prop, or
naming what the log cannot observe, is not.

The distinctions each empty state must keep:

| Screen | Absent | Present but empty |
| ------ | ------ | ----------------- |
| Policies | nothing has been evaluated and nothing declared | — |
| Roles | roles are not observable; they come from `catalogue` | — |
| Services | no layer was handed to the dock | metrics still render |
| React | no atom set was handed to the dock | an atom set asked nothing yet |

---

_Previous: [27 — The Devtools Timeline](./27-devtools-timeline.md)_
