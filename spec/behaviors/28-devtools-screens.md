# 28 — The Devtools Screens

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-28                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.1 (2026-08-24): BEH-QD-233, BEH-QD-234 — a guard may record that it exists, and the lens points at one; BEH-QD-217's per-instance prohibition withdrawn and its keying requirement restated; its hydration-counts requirement superseded by BEH-QD-231 (CCR-QD-072, CCR-QD-073)<br>1.0 (2026-08-24): Initial release (CCR-QD-068) |

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

## BEH-QD-217: The React panel is keyed by question

> **Revised in CCR-QD-073.** This section's first requirement read *"One row per
> question. A per-instance count MUST NOT be claimed."* The prohibition is
> withdrawn; the keying requirement it was attached to stands unchanged, and is
> restated below. See [ADR-QD-053](../decisions/053-a-gate-can-be-found.md) and
> [BEH-QD-233](#beh-qd-233-a-guard-may-record-that-it-exists).

```
REQUIREMENT: One row per question. A question's row MUST NOT be split by the
             components asking it.
```

`Atom.family` compares with `Equal.equals`, so ten `<Can policy={isAdmin}>` in
different places in the tree are **one atom**. That is what the evaluator sees,
and a panel showing ten *questions* would invent a distinction the architecture
does not have. `gateGroups` groups through the same `Equal.equals`, so a group is
exactly an atom.

The screen says this in words, because a reader counting rows against their
component tree would otherwise conclude the panel is broken — and it now has to
say both halves, since the guards asking each question are listed underneath it.

**Why the prohibition was wrong.** The argument above establishes that the *atom
layer* cannot distinguish instances. It was read as establishing that nothing
can, and the original note went further still: *"an instance registry would
breach AGENTS.md §13 twice over."* It breaches neither. Decisions stay out of
React state — the registry holds who is asking, never what the answer was — and
the React glue is still one `useSyncExternalStore` call in `QadiProvider.tsx`,
because it is `@qadi/devtools` that subscribes.

A component knows perfectly well that it exists. Nothing was asking it.

```
REQUIREMENT: The same policy with and without a resource MUST be two rows.
```

They are two questions.

```
REQUIREMENT: Hydration counts that are not obtainable MUST be named as such.
```

> **Superseded in CCR-QD-072.** All four counts are obtainable now, read
> passively from metrics `@qadi/core` declares
> ([BEH-QD-231](./19-hydration.md)). The rule survives as its general form —
> *name what cannot be shown rather than leaving a blank* — which is what
> BEH-QD-218 states for every screen. No reporter wired still shows *no
> reporter*, never zero: zero would claim there were no mismatches when there is
> simply nobody counting.

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

## BEH-QD-233: A guard may record that it exists

> **Invariant:** [INV-QD-046](../invariants.md#inv-qd-046-instrumentation-never-changes-what-a-guard-renders)

```ts
export const gateInstances: () => ReadonlyArray<GateInstance>;
export const subscribeGates: (listener: () => void) => () => void;
```

```
REQUIREMENT: Instrumentation MUST be opt-in, and MUST be off by default.
```

`QadiProvider`'s `instrument`. It is a debug affordance, and on a production page
it hands any script a list of what the current user may and may not do — so it is
guarded the way the dock itself is.

```
REQUIREMENT: With it off, no guard MUST register and no marker element MUST be
             rendered.
```

Off means **absent**, not inert. Not a wrapper that does nothing — no wrapper. A
consumer's DOM must not change because they upgraded this package, and the
assertion that keeps that honest is that the React suite's existing tests pass
untouched.

```
REQUIREMENT: One instance MUST register exactly once, under the surface its
             author wrote.
```

The five surfaces nest: `Can` reads a decision the way `useDecision` does. All of
them go through one internal `useGate` naming themselves, because registering in
the primitive *and* in its callers reports one component as two instances with
the inner one labelled a hook nobody called.

```
REQUIREMENT: A guard's recorded state MUST be what it rendered, including
             `Rechecking` and `Pending` as distinct.
```

Read off the same `AsyncResult` the component branches on, in the same order, so
the panel cannot disagree with the screen. The two waiting states stay apart
because they are separate facts: one has never had an answer, the other has one it
no longer trusts. Neither carries the previous verdict
([ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)).

```
REQUIREMENT: An instance MUST be dropped when it unmounts.
```

An entry holds a DOM element, so a leaked one keeps a detached subtree alive.

## BEH-QD-234: The lens points at a guard, in both directions

```ts
export const boxesOf: (instances: ReadonlyArray<{ id: string; element?: unknown }>) => ReadonlyArray<GateBox>;
export const drawLens: (target: Document, boxes: ReadonlyArray<GateBox>) => void;
export const gateIdAt: (target: Document, x: number, y: number, instances: …) => string | undefined;
```

```
REQUIREMENT: The marker MUST NOT change the host's layout.
```

`display: contents` generates **no box**, so children lay out exactly as if it
were not there — no flex, grid, margin or adjacency selector changes. It is the
only way to put a handle in the tree without putting a box in it.

```
REQUIREMENT: A guard MUST be measured by its contents, never by the marker.
```

The consequence of the rule above: an element with no box has no rect, so
`marker.getBoundingClientRect()` is zeros and a lens built on it would draw every
overlay in the top-left corner. A `Range` over the contents measures what is
actually there, text nodes included.

```
REQUIREMENT: A guard that rendered nothing MUST be reported, not filtered.
```

A zero-area rect is a **place with no thing in it**, and pointing at it is the
answer to "why is this button missing" — the question this screen exists for. It
gets a caret and its own colour rather than a 0×0 box, which would draw nothing
and report success.

```
REQUIREMENT: An instance the lens cannot point at MUST be named as such, and MUST
             NOT be offered a highlight.
```

A hook has no node of its own: enumerable, and not locatable. The control is
disabled and carries the reason, because a button that silently does nothing is
worse than an absent one.

```
REQUIREMENT: The lens MUST NOT intercept the page's own input, except on a pick
             that found a guard.
```

Overlays are `pointer-events: none`. Picking swallows the click only where a
guard was actually found — so picking a guarded button does not also press it,
and the dock's own controls keep working while the mode is on.

```
REQUIREMENT: Picking MUST have an exit that does not require a reload.
```

Three: the pick, `Escape`, and unmount. Unmount also removes every overlay — a
dock that left them behind would deface the page it was debugging.

```
REQUIREMENT: A guard MUST be found by element identity, never by a selector.
```

The `data-qadi-gate` attribute exists for a person reading the DOM in a browser
inspector. Making it the lookup would put a string contract between two packages
that do not import each other, which is the silent-failure shape
[ADR-QD-052](../decisions/052-hydration-is-counted-where-both-ends-can-see-it.md)
was written about. An identity comparison cannot drift.

---

_Previous: [27 — The Devtools Timeline](./27-devtools-timeline.md)_

---

_Next: [29 — The Subject Simulator](./29-devtools-simulator.md)_
