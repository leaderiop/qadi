# 28 — The Devtools Screens

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-28                                    |
> | Revision       | 1.19                                           |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.19 (2026-11-12): review fixes: a closed feed and a repeated command publish nothing; the notice keeps a persistent status region, alerts once per stop and shows its focus (ARCH-82, BEH-QD-507, BEH-QD-509, INV-QD-313, CCR-QD-425)<br>1.18 (2026-11-12): BEH-QD-465 restated (seven stores) and BEH-QD-323 restated (the model polls; useDiagnostics returns { status, reading }); BEH-QD-506..510 new (ARCH-82, CCR-QD-425)<br>1.17 (2026-11-11): The one internal hook, useGates, is in useGate.ts (ARCH-76, CCR-QD-418, ADR-QD-140)<br>1.16 (2026-11-11): BEH-QD-465 — the dock is one model (makeDockModel owns the six stores and pushes the rail, one configure, the model reads its source in its own scope); BEH-QD-466 — a choice from a list has one shape (HeldChoice's three arms, one cell in both sessions); BEH-QD-389's note names the dock model, not the owned hook (ARCH-74, ADR-QD-047 amendment, CCR-QD-416)<br>1.15 (2026-11-10): BEH-QD-429 (every panel shows a verdict through one treatment) and BEH-QD-430 (a record's outcome and obligation are read once) (ARCH-67, CCR-QD-409)<br>1.14 (2026-11-10): BEH-QD-399 added: the role tree is the role walk as flat rows, keyed by identity, stack-safe at 20,000 deep, a repeated role a leaf pointing at its first occurrence; BEH-QD-214's diamond requirement amended to match (ADR-QD-128, ARCH-64, CCR-QD-406)<br>1.13 (2026-11-10): BEH-QD-389 — the dock's tab, filters, selection and replay are a session the dock owns: pair the whole timeline then filter, count the whole timeline, select opens the inspector, replay opens the simulator and re-seeds (ARCH-63, ADR-QD-047, CCR-QD-405)<br>1.12 (2026-11-09): BEH-QD-337 — what the explorer shows is a session the dock owns; BEH-QD-211 and BEH-QD-213 gain a sentence each (ARCH-58, ADR-QD-047, CCR-QD-394)<br>1.11 (2026-11-08): BEH-QD-233 — every surface registers through one internal useGates over a writer the provider resolves once (ARCH-49, ADR-QD-111, CCR-QD-388)<br>1.10 (2026-10-08): the screens' mechanics (`policiesSeen`, `PolicyTree`, the lens) are package-private; specified here because the dock relies on them (ARCH-40, ADR-QD-047, CCR-QD-321)<br>1.9 (2026-10-08): BEH-QD-323 — a reading supplied to the dock is one `reading` prop of `DiagnosticsReading`, merged field by field by `mergeReading`, replacing the five props `wiring`, `activity`, `portCalls`, `questions` and `hydration`; the superseded `hydrationMismatches` is removed from the dock and `QuestionsPanel` (**breaking**, ARCH-44, reverses the layout half of ARCH-24's D-24-c, CCR-QD-241)<br>1.8 (2026-10-08): BEH-QD-323 — under a `QadiProvider` the shared build comes from `useDevtoolsFeed()`'s layer, the provider's own build, rather than a hoisted context (ARCH-34, BEH-QD-327, CCR-QD-240)<br>1.7 (2026-10-08): BEH-QD-233 — a registry built by `makeGateRegistry` reports a colliding id by default (ARCH-43, CCR-QD-250)<br>1.6 (2026-10-08): BEH-QD-211 — two structurally equal *declared* policies are one entry under the first declared name, and the explorer and the role viewer keep what they show when their list moves (ARCH-33, INV-QD-107, CCR-QD-206)<br>1.5 (2026-10-07): BEH-QD-233 — a hook that asks several questions (`usePolicies`, `useQuestions`) lists one instance per question, each under `<useId>/<name>`; the panel shows the new kind strings as they are (ARCH-23, ADR-QD-103, CCR-QD-201)<br>1.4 (2026-10-07): BEH-QD-323 — diagnostics are sampled by the model, and a sample that changed nothing changes nothing; BEH-QD-218's table says what the dock can obtain for itself when handed `diagnostics` (ARCH-24, CCR-QD-200)<br>1.3 (2026-10-07): BEH-QD-215 — all seven required services are listed (`CustomPredicate` and `SignatureHistory` were missing); the five port rows are the registry's, in its order, and each says whether it is the description's fail-closed default, or a wrapper around it (`PortReport.defaulted`) (ARCH-21, CCR-QD-198)<br>1.2 (2026-10-05): BEH-QD-216 names a decision log's `clear` rather than the removed `decisionSinkRing`'s (CCR-QD-181)<br>1.1 (2026-08-24): BEH-QD-233, BEH-QD-234 — a guard may record that it exists, and the lens points at one; BEH-QD-217's per-instance prohibition withdrawn and its keying requirement restated; its hydration-counts requirement superseded by BEH-QD-231 (CCR-QD-072, CCR-QD-073)<br>1.0 (2026-08-24): Initial release (CCR-QD-068) |

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

> Package-private since [CCR-QD-321](../README.md#document-history): `policiesSeen`. Specified because the screens rely on it; a host reaches the behaviour through `DevtoolsDock`, not through these names (ADR-QD-047).

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
evaluator already does. Declared policies are included: two declared names for one
structure are one entry under the first declared name, run or not, as a declared
name already replaces the derived one for a policy that ran.

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

```
REQUIREMENT: The explorer MUST keep the policy it shows when the rail moves.
```

That order moves under a reader: a decision on a policy below the head moves it to
the head, and a policy's first decision shifts every position. The explorer (and the
role viewer, whose list a host may rebuild in any order) therefore holds its
selection by value, through one rule, `resolveHeld` (`HeldChoice.ts`). A selection
that leaves the list stays shown, marked as no longer there, and the first item
shown is held, so nothing here changes without the reviewer
([INV-QD-107](../invariants.md)). The rule runs in a session the dock owns
([BEH-QD-337](#beh-qd-337-what-the-explorer-shows-is-a-session-the-dock-owns)), so a
tab switch is not a choice either.

## BEH-QD-212: A structural view states no verdict

```ts
export const PolicyTree: FC<{ node: InspectNode; showStatus: boolean }>;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `PolicyTree`. Specified because the screens rely on it; a host reaches the behaviour through `DevtoolsDock`, not through these names (ADR-QD-047).

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
rewrites the tree a reviewer is reading. What is applied is what was previewed
([BEH-QD-337](#beh-qd-337-what-the-explorer-shows-is-a-session-the-dock-owns)).

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

The edge is shown — hiding it would misrepresent the catalogue — but the
permissions beneath it were counted once, and a reader summing tinted rows would
otherwise double-count. First path wins, exactly as provenance resolves it.

> **Amended (CCR-QD-406).** The second arm is one leaf row, marked repeated and
> linked to its first occurrence; its subtree is not drawn again (decision
> 16-01 T1 = A, [ADR-QD-128](../decisions/128-one-walk-of-the-role-graph.md)).
> The tree used to re-walk it, which drew about 2^k rows for k stacked diamonds.
> The subtree appears once, under the first occurrence. See
> [BEH-QD-399](#beh-qd-399-the-role-tree-is-the-role-walk).

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
REQUIREMENT: `AttributeResolver`, `DecisionHistory`, `RelationshipResolver`,
             `CustomPredicate`, `SignatureHistory`, `EvaluationId` and
             `CurrentSubject` MUST NOT be described as unwired.
```

They are in `EvaluationServices`: a program that has not provided them does not
run. What a card can truthfully report is that one is **defaulted to a
fail-closed implementation** ([INV-QD-007](../invariants.md)), and it carries the
consequence of that default. `DecisionCache` and `DecisionSink` are the only two
genuinely optional ones.

```
REQUIREMENT: The port rows MUST be the registry's ports (`forEveryPort`), in its
             order, followed by the four services that are not ports.
```

A sixth port is a row without an edit to `wiringReport`, and its consequence line
is a compile error until written. `EvaluationId`, `CurrentSubject`,
`DecisionCache` and `DecisionSink` stay hand-listed: they are not ports (no
request, no typed failure, or optional).

```
REQUIREMENT: A port at its description's fail-closed default, or a wrapper around
             it, MUST be reported as defaulted (`defaulted: true`); a wired
             adapter MUST be reported `false`; an absent port, and a row that is
             not a port, `undefined`.
```

The default names itself (`none.name`), and a wrapper composes it as
`"<default> (retrying)"` ([BEH-QD-196](./25-inspection.md)), so a wrapped default is
still a fail-closed port. `defaulted` is a **reader's label derived from `name`**:
core never branches on a name, and a host that names its own adapter after a
default is reported as defaulted, which is what it asked for.

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
cache card must also not be confused with the record log — a decision log has
its own `clear`.

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
the React glue is still one `useSyncExternalStore` call in `QadiProvider.tsx`.

> **Correction.** This paragraph previously ended "because it is `@qadi/devtools`
> that subscribes." `@qadi/devtools` has no dependency on `@qadi/react` and
> `DevtoolsDock.tsx` takes `gates` as a plain, one-shot prop — it subscribes to
> nothing. The `useSyncExternalStore(subscribeGates, gateInstances,
> gateInstances)` call is made by the **host**, wiring the two packages
> together (`examples/nextjs-newsroom/src/client/Dock.tsx` does this); that is
> the correct place for it, since `@qadi/devtools`'s panel renders for any host,
> including one with no `@qadi/react` at all.

> **Correction (2026-10-04, ADR-QD-080).** The host call is now `useGateInstances()`
> inside the provider, or `useSyncExternalStore(atoms.gates.subscribe,
> atoms.gates.instances, atoms.gates.instances)` outside it; the module-scope
> pair named above no longer exists.

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

Four of the six screens read data the dock cannot obtain for itself without
being told where to look: it samples the diagnostics only when handed
`diagnostics` ([BEH-QD-323](#beh-qd-323-diagnostics-are-sampled-by-the-model-and-a-sample-that-changed-nothing-changes-nothing)),
and with no props it samples nothing. A blank panel is indistinguishable from a
broken one; an empty state naming the prop, or naming what the log cannot
observe, is not.

The distinctions each empty state must keep:

| Screen | Absent | Present but empty |
| ------ | ------ | ----------------- |
| Policies | nothing has been evaluated and nothing declared | — |
| Roles | roles are not observable; they come from `catalogue` | — |
| Services | no layer was handed to the dock (`diagnostics.layer`, or a `wiring` report) | metrics render once `diagnostics` is handed over; a layer that failed to build says so |
| React | no atom set was handed to the dock | an atom set asked nothing yet |

## BEH-QD-233: A guard may record that it exists

> **Invariant:** [INV-QD-046](../invariants.md#inv-qd-046-instrumentation-never-changes-what-a-guard-renders)

```ts
export const makeGateRegistry: (options?: GateRegistryOptions) => GateRegistry;
export interface GateRegistry {
  readonly instances: () => ReadonlyArray<GateInstance>;
  readonly subscribe: (listener: () => void) => () => void;
}
// QadiAtoms.gates: GateRegistry — the registry this atom set's guards write to.
// QadiProviderProps.gates?: GateRegistry — an override, built by makeGateRegistry;
// it warns on an id collision in development unless GateRegistryOptions.onIdCollision is given.
export const useGateInstances: () => ReadonlyArray<GateInstance>;
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

```
REQUIREMENT: A hook asking several questions (`usePolicies`, `useQuestions`)
             MUST register one instance per question, each a hook with no
             marker element, and the panel MUST show each as an instance of the
             question it asks.
```

`GateInstance`'s shape does not change for it: `id` is the hook's `useId` and the
entry's name, and `kind` is `usePolicies` or `useQuestions`. `kind` is already an
open string to the panel, which shows an unknown one as itself, so no devtools
change is needed ([BEH-QD-068](./09-react.md#beh-qd-068-hooks-and-components)).

Off means **absent**, not inert. Not a wrapper that does nothing — no wrapper. A
consumer's DOM must not change because they upgraded this package, and the
assertion that keeps that honest is that the React suite's existing tests pass
untouched.

```
REQUIREMENT: One instance MUST register exactly once, under the surface its
             author wrote.
```

The five surfaces nest: `Can` reads a decision the way `useDecision` does. Every
surface goes through one internal hook, `useGates` (`useGate.ts`, ADR-QD-111, ADR-QD-140),
naming itself, because registering in the primitive *and* in its callers reports
one component as two instances with the inner one labelled a hook nobody called.
The provider resolves its registry's writer once and hands it, absent unless
instrumented, to every gate, so no guard resolves it.

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

```
REQUIREMENT: A guard MUST be listed only by the registry its provider writes to;
             two atom sets MUST NOT see each other's guards.
```

The registry belongs to the atom set (`atoms.gates`), the scope `asked()` already
has, unless the provider is handed another. Two providers over one atom set share
it, exactly as they share `asked()`
([ADR-QD-080](../decisions/080-a-gate-registry-belongs-to-its-atom-set.md),
[INV-QD-064](../invariants.md#inv-qd-064-a-guard-is-listed-only-by-the-registry-its-provider-writes-to)).

```
REQUIREMENT: Two live registrations MUST NOT overwrite each other; the ids in one
             snapshot MUST be distinct.
```

Two hydrated roots derive `useId` from tree position and so mint the same id. The
registry keeps both, the second under `${id}~${n}`, and reports the collision once;
`data-qadi-gate` keeps React's raw id, which is hydration-stable.

```
REQUIREMENT: A registry built by `makeGateRegistry` MUST report a colliding id once,
             through `onIdCollision` when supplied, otherwise by a development-mode
             warning.
```

The default is the same warning an atom set's own registry gives (ADR-QD-080
amendment, CCR-QD-250), so a host-built registry over several roots is not silent.

```
REQUIREMENT: A registry not built by `makeGateRegistry` MUST receive no
             registration, and its guards MUST render no marker.
```

A hand-built `{ instances, subscribe }` has no writer. Off means absent extends to a
registry nothing here can write to.

## BEH-QD-234: The lens points at a guard, in both directions

```ts
export const boxesOf: (instances: ReadonlyArray<{ id: string; element?: unknown }>) => ReadonlyArray<GateBox>;
export const drawLens: (target: Document, boxes: ReadonlyArray<GateBox>) => void;
export const gateIdAt: (target: Document, x: number, y: number, instances: …) => string | undefined;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `GateBox`, `boxesOf`, `drawLens`, `gateIdAt`. Specified because the screens rely on it; a host reaches the behaviour through `DevtoolsDock`, not through these names (ADR-QD-047).

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

## BEH-QD-323: Diagnostics are sampled by the model, and a sample that changed nothing changes nothing

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-200, CCR-QD-425)

```ts
export const runDiagnostics: <ROut, E>(
  store: DiagnosticsStore,
  options?: DiagnosticsOptions<ROut, E>,
) => Effect<void>;
export const makeDiagnosticsStore: () => DiagnosticsStore;
export interface DiagnosticsReading {
  readonly wiring?: WiringRead;
  readonly activity?: ReadonlyArray<PortActivity>;
  readonly hydration?: HydrationActivity;
  readonly portCalls?: PortCallLog;
  readonly questions?: ReadonlyArray<AskedQuestionLike>;
}
export const mergeReading: (
  sampled: Diagnostics,
  supplied: DiagnosticsReading | undefined,
) => Diagnostics;
export const useDiagnostics: (options?: DiagnosticsDockOptions) => DiagnosticsSnapshot;
// <DevtoolsDock diagnostics={{ layer, collector, questions, intervalMillis }} />
// <DevtoolsDock reading={{ wiring, activity, hydration, portCalls, questions }} />
```

The Services and React panels read four things that are pulled rather than
pushed: the wiring report, port activity, hydration counts and the port-call
collector's snapshot. Keeping them current used to be a loop each host wrote —
a timer, an `Effect.runSync` and a layer provided by hand — and the one host
that wrote it did so twice and read a throwaway cache. It is written once, in
the headless model.

The dock's model runs the poll in its own scope, as one of its stores
([BEH-QD-506](#beh-qd-506-the-diagnostics-poll-is-the-dock-models-seventh-store-with-a-closed-status)),
and `useDiagnostics` is an adapter over the same feed for a host that wants the reading
without the dock. It returns `{ status, reading }`: the poll's closed status beside the
latest reading, so a host can tell a reading that is current from one a stopped sampler
left behind ([BEH-QD-510](#beh-qd-510-the-public-hooks-are-adapters-over-scoped-feeds-read-through-one-store-snapshot-hook)).

```
REQUIREMENT: Sampling MUST be pull-based: a read on a schedule, never a write on
             an evaluation's hot path.
```

[BEH-QD-216](#beh-qd-216-port-activity-is-a-passive-process-wide-aggregate) and
[ADR-QD-052](../decisions/052-hydration-is-counted-where-both-ends-can-see-it.md)
already say why. This behavior writes the pull once; it does not turn it into a
push.

```
REQUIREMENT: A layer handed over MUST be built once per run, and released when
             the run is interrupted.
```

Building it per sample rebuilt every port every tick, and could not run an
asynchronous layer. It is still *its own build*: a service that keeps state in
its constructor, such as `decisionCacheLayer`'s cache, is shared with the
application only when the host shares it by value, by handing the same context
to both as `Layer.succeedContext` — or, under a `QadiProvider`, by handing
`useDevtoolsFeed()`'s layer, which is the provider's own build
([BEH-QD-327](./09-react.md#beh-qd-327-a-devtools-feed-reads-the-providers-own-runtime)).

```
REQUIREMENT: A snapshot MUST keep its identity while it is structurally
             unchanged, and a field that did not change MUST keep its own
             reference.
```

`useSyncExternalStore` compares by identity and every read builds fresh objects,
so without this a dock re-renders on every tick whether or not anything moved.

```
REQUIREMENT: A layer that fails to build MUST be stated, and the other reads MUST
             keep sampling.
```

The wiring read is a closed `WiringRead`: `NotHanded`, `Failed` with the reason,
or `Read` with the report. A run that died on the failure would leave every
panel blank, which [BEH-QD-218](#beh-qd-218-every-screen-degrades-to-an-explanation)
forbids.

```
REQUIREMENT: A reading supplied explicitly to the dock, as its `reading` prop,
             MUST take precedence over a sampled one, field by field: a field
             the reading carries wins, a field it omits falls through to the
             sample, and an explicit empty list is a value.
```

A supplied reading answers a different question: what another process, or a
fixture, reported. Sampling this process cannot supply it. It is one value, a
`DiagnosticsReading`, rather than five props that each restated the rule, and
the rule is written once, in the model's `mergeReading`, where it is tested
without React. Its fields are `Diagnostics`' own types, so a reading from
elsewhere can state a failed wiring read (`WiringRead.Failed`) as well as a
report, which the old `wiring` prop, typed as a bare `WiringReport`, could not.

```
REQUIREMENT: The dock MUST NOT show a host-counted mismatch total.
```

The count a host used to accumulate from `onHydrationMismatch` and pass as
`hydrationMismatches` is `hydration.mismatched`, which `@qadi/react` counts
whether or not a reporter is supplied
([ADR-QD-052](../decisions/052-hydration-is-counted-where-both-ends-can-see-it.md)).
The prop and the panel branch that showed it only when `hydration` was absent are
removed; with nothing read, the panel says how to read it.

Gates are not sampled. They stay a prop the host feeds from its subscription to
`@qadi/react`'s registry ([ADR-QD-080](../decisions/080-a-gate-registry-belongs-to-its-atom-set.md)).

```typescript
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import { decisionCacheLayer } from "@qadi/core";
import { makeDiagnosticsStore, runDiagnostics } from "@qadi/devtools";

export const sampleOnce = Effect.gen(function* () {
  const store = makeDiagnosticsStore();
  const run = yield* Effect.forkChild(
    runDiagnostics(store, { layer: decisionCacheLayer() }),
    { startImmediately: true },
  );
  const wiring = store.getSnapshot().wiring._tag;
  yield* Fiber.interrupt(run);
  return wiring;
});
```

## BEH-QD-337: What the explorer shows is a session the dock owns

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-394)

```ts
export const makeExplorerSession: (init?: ExplorerSessionInit) => ExplorerSession;
export const makeHeldChoiceStore: <A>(
  list: ReadonlyArray<A>,
  same: (a: A, b: A) => boolean,
) => HeldChoiceStore<A>;
```

> Package-private since [CCR-QD-394](../README.md#document-history): `ExplorerSession`
> and `HeldChoiceStore`. Specified because the dock relies on them; a host reaches the
> behaviour through `DevtoolsDock`, not through these names (ADR-QD-047).

The explorer's chosen policy, draft, preview and JSON pane, and the role viewer's
chosen role, used to be component state: lost with the tab, and governed by event
handlers no model test could see.

```
REQUIREMENT: Leaving the Policies or Roles tab and returning MUST NOT change what
             it shows.
```

A screen is unmounted when its tab is left, so the dock owns the state, as it owns the
simulator's ([INV-QD-107](../invariants.md)). The chosen policy, a pasted or
simplified draft, the Tree or JSON view, an unloaded edit and the chosen role are kept;
a decision that arrives during the visit does not move them.

```
REQUIREMENT: A preview MUST be of the policy shown, and `apply` MUST apply exactly the
             tree that was previewed.
```

A preview is a flag, never a stored policy: the tree previewed is always `simplify`
of the policy on screen, and every change of the shown policy (a choice, a load, an
apply) ends it. A preview of some other policy is unrepresentable.

```
REQUIREMENT: Everything the JSON pane shows MUST describe the text in it.
```

An unloaded edit belongs to the policy shown and survives a Tree/JSON switch and a
reorder of the rail; it is dropped when the shown policy changes. A refusal belongs to
the text it refused: it leaves when the text changes or the shown policy does. Loading
text equal to the policy already shown makes no draft.

```
REQUIREMENT: A paste MUST decode through `fromJson`, in the model.
```

The refusal sentence (path-relative issues, the decode-limit sentence, and a stated
refusal for a defect inside the decoder rather than a throw from a click handler) is
the model's, so it is under the model's coverage bar and the mutation gate.

## BEH-QD-389: The dock's choices are a session

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-405)

```ts
export type TabId = "log" | "inspector" | "policies" | "roles" | "services" | "simulator" | "questions";
export const makeDockSession: (init: DockSessionInit) => DockSession;
export interface DockSessionInit {
  readonly timeline: Timeline;
  readonly simulation: { readonly replay: (entry: TimelineEntry) => void };
}
export interface DockSession {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => DockSnapshot;
  readonly setTimeline: (timeline: Timeline) => void;
  readonly setTab: (tab: TabId) => void;
  readonly setFilters: (filters: Filters) => void;
  readonly select: (key: string) => void;
  readonly replay: (entry: TimelineEntry) => void;
}
```

> Package-private since [CCR-QD-405](../README.md#document-history): `DockSession`, and the
> hook that owned it, now owned by the dock model
> ([BEH-QD-465](#beh-qd-465-the-dock-is-one-model)). Specified because the dock relies on
> it; a host reaches the behaviour through `DevtoolsDock`, not through this name
> (ADR-QD-047).

The dock's tab, the log's filters and the selected row used to be `useState`s, and the
rows, counts and selection memos over them: rules a reviewer acts on, reachable only
by rendering the whole dock. They are `DockSession` now, which the dock owns and is a
view of, as it is of the explorer's and the simulator's sessions.

```
REQUIREMENT: Rows MUST be paired against the whole timeline and filtered afterwards.
```

A row never looks unpaired because its partner sat in an environment the reader
filtered away: the `Client` half of a Server/Client pair, filtered to `Client`, keeps
its partner.

```
REQUIREMENT: The counts and the environments MUST be of the whole timeline, never
             of the rows shown.
```

A header cannot read "0 errors" because someone typed in the search box.

```
REQUIREMENT: `select` MUST hold the row's key and open the inspector, and a
             selection MUST survive a filter that hides its row.
```

A key the timeline later drops reads as evicted, not as nothing selected.

```
REQUIREMENT: `replay` MUST open the simulator and command the simulation to
             re-seed from the entry on every call.
```

Replaying is an act, not a consequence of state
([BEH-QD-390](./29-devtools-simulator.md#beh-qd-390-replay-is-an-act)). The session
reaches the simulation through the `{ replay }` it was built with and imports neither
React nor `SimulationSession`. Replaying leaves the selection alone.

```
REQUIREMENT: A command that changes nothing MUST notify no one.
```

The same tab, filters equal field by field, the same key while already on the
inspector, the same timeline object, and a replay while already on the simulator
each publish nothing (the replay still reaches the simulation). The tab survives
leaving a screen and coming back, and a new timeline keeps the filters
([INV-QD-107](../invariants.md)).

Pinned by `DockSession.test.ts`, headlessly, and through the dock by
`DevtoolsDock.test.tsx`.

## BEH-QD-465: The dock is one model

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-416, CCR-QD-425) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md)

```ts
export interface DockModelInputs {
  readonly capacity?: number | undefined;
  readonly catalogue?: Catalogue | undefined;
  readonly diagnostics?: DiagnosticsDockOptions | undefined;
  readonly ports?: EvaluationPortsLayer | undefined;
  readonly reading?: DiagnosticsReading | undefined;
  readonly source?: Source | undefined;
}
export interface DockModel {
  readonly timeline: TimelineStore;
  readonly diagnostics: DiagnosticsReadout;
  readonly dock: DockSession;
  readonly explorer: ExplorerSession;
  readonly roles: HeldChoiceStore<Role>;
  readonly simulation: SimulationSession;
  readonly sightings: () => ReadonlyArray<PolicySighting>;
  readonly configure: (inputs: DockModelInputs) => void;
}
export const makeDockModel: (
  init?: DockModelInputs,
) => Effect.Effect<DockModel, never, Scope.Scope>;
```

> Package-private (ADR-QD-099), like `DockSession`: a host reaches the behaviour
> through `DevtoolsDock`. Specified because the dock relies on it.

The dock built the timeline, the policy rail, the explorer, the role choice, the
simulation and its own session in React and joined them with layout effects, so the
rules between them were reachable only by rendering. `makeDockModel` owns them, and
`DevtoolsDock` is a view of it, through the one hook that builds it in a scope
(`useDockModel`). The diagnostics poll and the reading the Services and React screens
show are the model's seventh store, beside the timeline, the dock session, the
explorer, the role choice and the simulation
([BEH-QD-506](#beh-qd-506-the-diagnostics-poll-is-the-dock-models-seventh-store-with-a-closed-status)).

```
REQUIREMENT: Every screen's store MUST be the model's, and it MUST outlive its tab.
```

Leaving a screen and coming back finds the explorer's choice, the role choice, the
simulation's form and the dock's tab where they were left.

```
REQUIREMENT: Each shown timeline, and each catalogue, MUST reach the dock session and
             both rails before any reader sees it.
```

`catalogueOf` is computed once per change and handed to every store, so no two screens
read different timelines ([INV-QD-296](../invariants.md)). A pause toggle moves the
reading but not the shown timeline, and so reaches the host and not the rail.

```
REQUIREMENT: `configure` MUST dispatch only an input whose identity changed.
```

An unchanged prop resets nothing: not a capture, not a half-filled form, not a held
choice. An omitted input reads as `undefined`.

```
REQUIREMENT: The dock model MUST own the diagnostics feed and the merged reading as
             its seventh store, and `DevtoolsDock` MUST NOT sample or merge.
```

The dock renders `model.diagnostics`, whose snapshot is already the merge of the polled
reading and the one a host supplied, so no render computes it.

```
REQUIREMENT: A tab change MUST change no other store.
```

```
REQUIREMENT: A capacity change MUST empty the timeline and keep every choice.
```

A different bound is a different buffer, not a different review session: the timeline
store the host holds is the same object, and the explorer's, the roles' and the
simulation's choices stay held.

```
REQUIREMENT: The model MUST read its source in its own scope, and a new source MUST
             supersede the previous read.
```

A source that goes away is replaced by an empty one.

```
REQUIREMENT: Closing the model's scope MUST interrupt the source read and a simulation
             run in flight.
```

The model has no `dispose` and no `read` command; the scope is the lifetime
(ADR-QD-137).

Pinned by `DockModel.test.ts`, headlessly (M1 to M17 and the property P1), and through
the dock by `DevtoolsDock.test.tsx`, which keeps the layout and the wiring only, with
M18 to M28 for the seventh store. A hide and a show of the dock in a React `Activity`
rebuilds the model, so a paused dock returns to live, the backlog is read again and the
diagnostics start at `Starting` with no reading; this is accepted
(ADR-QD-047, CCR-QD-416, CCR-QD-425).

## BEH-QD-466: A choice from a list has one shape

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-416)

```ts
export type HeldChoice<A> =
  | { readonly _tag: "Empty" }
  | { readonly _tag: "Listed"; readonly value: A; readonly index: number }
  | { readonly _tag: "Evicted"; readonly value: A };
export const heldValue: <A>(choice: HeldChoice<A>) => A | undefined;
export const heldIndex: <A>(choice: HeldChoice<A>) => number | undefined;
```

A choice from a list is held by value, and where it is, against the list as it is now,
is one of three arms. The simulation session, the explorer session and the role
viewer's store each re-implemented that and each mapped it into a local union; they now
embed one cell (`makeHeldChoice`), or use the store around it
(`makeHeldChoiceStore`), and their own types carry its arms: `PolicyChoice` adds
`Seeded`, `ExplorerShown` adds `Draft`.

```
REQUIREMENT: A held choice MUST read `Empty` when nothing is held and the list is
             empty, `Listed` with its current index when the list holds it, and
             `Evicted` when it does not.
```

A choice that leaves the list stays chosen; it is neither dropped nor replaced by a
neighbour ([INV-QD-107](../invariants.md)). A listed choice resolves to the list's own
element, the newest object, so a label or a tally read from it is current.

```
REQUIREMENT: Nothing held MUST read as the head, and a caller that wants the default not
             to follow the head MUST pin it.
```

```
REQUIREMENT: A listed choice's `index` MUST be a reading of the list as it is now, never
             an input.
```

`heldValue` and `heldIndex` are the two readers; a view that wants the value or the
position does not match on the arm to get them.

Pinned by `HeldChoice.test.ts`, `SimulationSession.test.ts` and `ExplorerSession.test.ts`.

## BEH-QD-399: The role tree is the role walk

> **Decision:** [ADR-QD-128](../decisions/128-one-walk-of-the-role-graph.md) ·
> **Behaviour:** [BEH-QD-400](./25-inspection.md#beh-qd-400-the-role-walk-visits-each-reachable-role-once)

```ts
interface RoleRow {
  readonly name: string;
  readonly index: number;
  readonly depth: number;
  readonly own: ReadonlyArray<PermissionKey>;
  readonly repeated: boolean;
  readonly first: number | undefined;
}
```

> Package-private: `RoleRow` and `roleSummary` (`packages/devtools/src/model/RoleTree.ts`).
> Specified because the role viewer relies on them; a host reaches the behaviour
> through `DevtoolsDock`.

The role viewer drew its tree from a copy of the role walk of its own. That copy
keyed roles by name, recursed natively and re-walked every repeated subtree. It is
`roleWalk` now, read as flat rows: one row per step, in walk order.

```
REQUIREMENT: Rows MUST be keyed by the role's identity, through its walk step,
             never by its name. Two distinct roles that share a name MUST be
             two rows, neither marked repeated.
```

```
REQUIREMENT: A 20,000-deep chain MUST be modelled and rendered without a stack
             overflow.
```

Rows are siblings indented by `depth`, never nested elements, so neither the
model nor the render recurses.

```
REQUIREMENT: A role reached a second time MUST be one leaf row, marked repeated,
             whose `first` (rendered as `data-first`) is the `index` of its first
             occurrence. Its subtree MUST NOT be drawn again.
```

So the row count is the number of reachable roles plus the number of revisits:
linear in the graph, where re-walking drew about 2^k rows for k stacked diamonds.

Pinned by `packages/devtools/test/model/RoleTree.test.ts` (same-named pair, 10,000-
and 20,000-deep chains, stacked diamonds) and through the viewer by
`packages/devtools/test/react/RoleViewer.test.tsx` (a 20,000-deep chain renders;
rows are siblings; the diamond's repeated row points at its first occurrence).

## BEH-QD-429: Every panel shows a verdict through one treatment

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) ·
> **Invariant:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)

```ts
type DisplayState =
  | "Allow" | "Deny" | "Error" | "Unknown"
  | "Pending" | "Rechecking" | "NotReached" | "Unrecognised";
const treatmentOf: (state: DisplayState) => Treatment;
```

> Package-private: `DisplayState` (`model/Verdict.ts`), `displayOfGateState`
> (`model/Gates.ts`) and `treatmentOf` (`react/VerdictTreatment.ts`). Specified
> because every panel relies on them; a host reaches the behaviour through
> `DevtoolsDock`.

The verdict badge, a live guard's state in the questions panel and a policy
node's mark in the tree each chose their own colours. The questions panel coloured
a denied guard and a failed one alike, and the tree drew a denied node in the
amber the dock reserves for errors.

```
REQUIREMENT: Every displayable state MUST have exactly one treatment, read from
             `VerdictTreatment.ts`, and every panel MUST take its verdict colour,
             weight and label from it.
```

A verdict, a guard's render state and a node's status each map into the closed
`DisplayState` through one total table, so a state added to any of them is a
compile error at its table rather than a guard drawn like some other one.

```
REQUIREMENT: Deny and Error MUST differ in ink, background, border and label.
```

A denial is solid red and heavier as text; a failure is outlined amber. The
difference is in treatment and not only in hue, so it survives a reader who
cannot tell the two colours apart (INV-QD-006). Pending and Rechecking share one
muted treatment by choice and differ by their word: neither is an answer.

```
REQUIREMENT: A guard state this build does not know MUST be shown as itself,
             muted, never coloured as though it were an answer.
```

Pinned by `packages/devtools/test/react/VerdictTreatment.test.tsx` (every state
has a treatment; Deny and Error differ in every channel; the badge, the questions
panel and the tree read it), `packages/devtools/test/react/QuestionsPanel.gates.test.tsx`
("SHOWS A DENIAL AND A FAILURE DIFFERENTLY (INV-QD-006)") and
`packages/devtools/test/model/Gates.test.ts` (`displayOfGateState`, and an
unknown or inherited-name state read as `Unrecognised`).

## BEH-QD-430: A record's outcome and obligation are read once

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) ·
> **Invariants:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial),
> [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)

```ts
type RecordOutcome =
  | { _tag: "Failed"; error: EvaluationError; obligation: ObligationState }
  | { _tag: "Denied"; tree: InspectNode; obligation: ObligationState }
  | { _tag: "Allowed"; tree: InspectNode; fields: Allow["visibleFields"];
      duties: ReadonlyArray<Obligation>; obligation: ObligationState };
type ObligationState =
  | { _tag: "NoneOwed" } | { _tag: "Unreported" }
  | { _tag: "Reported"; outcome: ObligationOutcome };
const readOutcome: (
  policy: Policy,
  outcome: DecisionOutcome,
  reported: ObligationRecord | undefined,
) => RecordOutcome;
```

> Package-private: `readOutcome`, `RecordOutcome` and `ObligationState`
> (`packages/devtools/src/model/Inspect.ts`). Specified because the Inspector and
> the Simulator rely on them; a host reaches the behaviour through `DevtoolsDock`.

The Inspector and the Simulator each re-derived a decision's tree, fields, duties
and obligation state from its outcome, through their own helpers and a nested
ternary: two readings of one record, and two places that could disagree.

```
REQUIREMENT: The Inspector and the Simulator MUST read a decision's outcome and
             obligation state only through `readOutcome`, and render from what
             it returns.
```

A failure carries no tree, because an empty one would read as allowed
(INV-QD-006). An allow's `fields` of `undefined` means every field (INV-QD-004).
A report wins over the duty count: an obligation outcome that arrived is shown on
any row, whatever the decision listed. The Simulator passes no report, because a
simulation discharges nothing.

Pinned by `packages/devtools/test/model/Inspect.test.ts` ("readOutcome") and,
through the screen, by `packages/devtools/test/react/Inspector.test.tsx`, whose
characterisation pins were written before the change and hold unchanged after it.

## BEH-QD-506: The diagnostics poll is the dock model's seventh store, with a closed status

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-425) ·
> **Invariant:** [INV-QD-314](../invariants.md#inv-qd-314-the-merged-diagnostics-reading-is-the-models-computed-when-an-input-changes-and-keeps-its-identity)

```ts
export type DiagnosticsStatus = Data.TaggedEnum<{
  Off: {};
  Starting: {};
  Live: {};
  Stopped: { readonly reason: string; readonly sampled: boolean };
}>;
export interface DiagnosticsSnapshot {
  readonly status: DiagnosticsStatus;
  readonly reading: Diagnostics;
}
export interface DiagnosticsReadout {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => DiagnosticsSnapshot;
  readonly restart: () => void;
}
```

> `DiagnosticsStatus`, `DiagnosticsSnapshot` and `DiagnosticsDockOptions` are public
> (the React entry re-exports them); `DiagnosticsReadout` and the feed that builds it
> are package-private (ADR-QD-099), reached through `DockModel.diagnostics`.

The dock forked its poll from a React effect and merged the supplied reading in a memo.
The poll is now a feed the dock model builds in its own scope, and the reading the
screens show is the model's seventh store.

```
REQUIREMENT: The poll MUST run as one fiber in its owner's scope, forked while the owner
             is built, so building the owner never waits on the application's layer.
```

Until the first sample lands the status is `Starting`.

```
REQUIREMENT: A run MUST restart only when `layer`, `collector`, `questions` or
             `intervalMillis` changes identity, or when the options go from absent to
             handed or back. A change to the supplied reading alone MUST NOT restart it.
```

An options object equal field by field to the previous one restarts nothing, so an
inline literal does not tear the layer down on every render. Absent options end the run
and read `Off` with no reading.

```
REQUIREMENT: The snapshot the screens read MUST be the merge of the feed's reading and
             the supplied one, recomputed when the feed publishes or the supplied reading
             changes, and never in `getSnapshot`. With nothing supplied it MUST be the
             feed's own snapshot.
```

A supplied field wins field by field (BEH-QD-323). Returning the feed's snapshot itself
when nothing is supplied means a dock with no `reading` re-renders exactly when the poll
publishes.

Pinned by `packages/devtools/test/model/DiagnosticsFeed.test.ts` under `TestClock` (F1 to
F26), `packages/devtools/test/model/DockModel.test.ts` (M18 to M28), and through the dock
by `packages/devtools/test/react/DiagnosticsScreens.test.tsx`. Specified in
ADR-QD-047 (CCR-QD-425).

## BEH-QD-507: A defect stops the poll visibly, and a restart resumes it

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-425) ·
> **Invariant:** [INV-QD-313](../invariants.md#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes)

A sample that dies (a throwing `questions`, for one) ends the poll fiber, and a fiber
handle drops a dead fiber without a word. The panels used to freeze on the last reading
with nothing said.

```
REQUIREMENT: A run that ends on a defect MUST produce `Stopped { reason, sampled }`, keep
             the last accepted reading, and publish both in one snapshot.
```

`reason` is `Cause.pretty` of the cause, kept verbatim and uncapped. It lives only in the
model's in-memory snapshot and is rendered as React text; it is never sent to a sink
record, a response, a log or a metric. `sampled` says whether the reading shown holds an
accepted sample.

```
REQUIREMENT: An interruption MUST NOT produce `Stopped`: not a restart, not absent
             options, not the scope closing.
```

A layer whose release dies while the scope closes ends the run on a defect, but the feed is
closed by then, so nothing is published: a closed feed never says `Stopped`.

```
REQUIREMENT: A run that has been replaced MUST NOT write: not a sample, not a stop.
```

A late exit from the run a restart replaced would otherwise stamp `Stopped` over the
fresh one and undo the restart.

```
REQUIREMENT: A layer that fails to build MUST stay a stated `WiringRead.Failed` inside a
             feed that is `Live`, and MUST NOT be a stop.
```

```
REQUIREMENT: A restart, by a changed field or by `restart()`, MUST pass through `Starting`
             and keep no stop from the run it replaces.
```

`restart()` with no options held does nothing, and so does `configure(undefined)` on a
feed that already holds none: it is not an `Off` over an `Off`.

```
REQUIREMENT: A closed feed MUST ignore `restart()` and `configure`, and publish nothing.
```

A command held across a rebuild (a stale `restart` captured before a hidden `Activity`
closed the scope) would otherwise publish `Starting` on a feed whose run is interrupted at
once, and nothing would ever follow it.

Pinned by `packages/devtools/test/model/DiagnosticsFeed.test.ts` (F1 to F26) and, through
the screens, by `packages/devtools/test/react/DiagnosticsScreens.test.tsx` (D4 to D11).
Specified in ADR-QD-047 (CCR-QD-425).

## BEH-QD-508: The diagnostics and the timeline live as long as their owner's scope

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-425) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md)

The dock model, `useDiagnostics` and `useTimeline` each build their feed in a scope their
component holds, so each lives exactly as long as that component's effects do.

```
REQUIREMENT: A hidden-then-shown dock or hook MUST start at `Starting` with `noDiagnostics`
             and a fresh, unpaused timeline.
```

A hidden React `Activity` runs the cleanup and keeps state, so the scope closes and the
next show builds a new one. The reading does not survive a hide, and the gap is stated by
`Starting` rather than bridged by a held reading, which would give the dock a second owner
of what the model owns.

```
REQUIREMENT: Absent diagnostics options MUST read `Off` with `noDiagnostics`.
```

```
REQUIREMENT: StrictMode's double mount MUST release the first build before the second runs.
```

```
REQUIREMENT: A change to the timeline's capacity MUST keep the store the host holds.
```

Pinned by `packages/devtools/test/react/DiagnosticsLifetime.test.tsx` (H1 to H3, K1 to K5),
`packages/devtools/test/react/TimelineLifetime.test.tsx` (L1 to L4) and
`packages/devtools/test/model/TimelineFeed.test.ts` (TF1 to TF8). Specified in ADR-QD-047
(CCR-QD-425), ADR-QD-137.

## BEH-QD-509: Every screen that reads the diagnostics states its status the same way

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-425)

The Services and React screens read the diagnostics. Both render one shared notice first
and write no notice markup of their own, so they cannot disagree about a stop.

```
REQUIREMENT: `Starting` MUST render a polite status, and `Stopped` an alert the first
             time a stop is shown, with the verbatim reason and a restart that moves
             focus to the screen root.
```

A stop that is already announced stays visible without a second alert, however many
screens the reviewer visits. `Starting` is the expected first moment and stays quiet.
The reason is a height-bounded block of text, not markup.

```
REQUIREMENT: While no sample is accepted, the messages that read an absent field as "not
             handed over" MUST be withheld.
```

Before the first sample, and after a stop that preceded it, a missing field means it has
not been read yet, not that the host never supplied it.

```
REQUIREMENT: `Off` and `Live` MUST add nothing to a screen.
```

Pinned by `packages/devtools/test/react/DiagnosticsNotice.test.tsx` (N1 to N10) and
`packages/devtools/test/react/DiagnosticsScreens.test.tsx` (D1 to D11). Specified in
ADR-QD-047 (CCR-QD-425).

## BEH-QD-510: The public hooks are adapters over scoped feeds, read through one store-snapshot hook

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-425) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md)

```ts
export const useDiagnostics: (options?: DiagnosticsDockOptions) => DiagnosticsSnapshot;
export const useTimeline: (
  source: Source,
  options?: { readonly capacity?: number },
) => UseTimeline;
```

`useDiagnostics` and `useTimeline` decide nothing: each builds its feed in a scope its
component holds and reads it. The React layer reads every store through one hook,
`useStoreSnapshot`, in place of the `useRunningStore` that forked a run from an effect
(deleted).

```
REQUIREMENT: Nothing in the React layer MUST fork a run from an effect.
```

```
REQUIREMENT: Every store the React layer reads MUST be read through `useStoreSnapshot`.
```

```
REQUIREMENT: `useDiagnostics` on the pass before its feed exists MUST read `Off` when it
             holds no options and `Starting` when it holds some, never a reading that
             looks sampled.
```

The same two constants are returned on every such pass, so the first render keeps one
identity. The timeline's placeholder before its feed exists is an inert module-scope
store, so one component's feed can never be read by another.

```tsx
import { DiagnosticsStatus, useDiagnostics } from "@qadi/devtools/react";

const sampling = { intervalMillis: 1_000 };

export const SamplerLine = () => {
  const { status, reading } = useDiagnostics(sampling);
  return (
    <p>
      {DiagnosticsStatus.$is("Stopped")(status)
        ? status.reason
        : `${reading.hydration?.seeded ?? 0} seeded`}
    </p>
  );
};
```

Pinned by `packages/devtools/test/react/useStoreSnapshot.test.tsx` (S1 to S3),
`packages/devtools/test/react/useDiagnostics.test.tsx`, `useTimeline.test.tsx`,
`DiagnosticsLifetime.test.tsx` and `TimelineLifetime.test.tsx`. Specified in ADR-QD-047
(CCR-QD-425).
