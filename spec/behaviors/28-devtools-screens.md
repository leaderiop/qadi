# 28 — The Devtools Screens

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-28                                    |
> | Revision       | 1.55                                           |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.55 (2026-11-24): DiagnosticsOptions accepts undefined per field (ADR-QD-192, CCR-QD-471)<br>1.54 (2026-11-24): BEH-QD-726, BEH-QD-727 and BEH-QD-730 new; BEH-QD-636 and BEH-QD-656 restated for the one store and the bound a capacity means (ADR-QD-191, CCR-QD-470)<br>1.53 (2026-11-24): BEH-QD-728 and INV-QD-401: a capacity the timeline refuses changes nothing in configure (ADR-QD-191, CCR-QD-470)<br>1.52 (2026-11-23): BEH-QD-466: the simulation session holds a SeededChoice (ADR-QD-187, CCR-QD-466)<br>1.51 (2026-11-22): BEH-QD-696: the inherited, non-enumerable and symbol-keyed cases are pinned by one test of a key whose such fields differ (CCR-QD-464)<br>1.50 (2026-11-22): BEH-QD-615 and BEH-QD-699: the questions and services store tests are titled for what they hold, once per key field (CCR-QD-464)<br>1.49 (2026-11-22): BEH-QD-698: the two release tests' titles are shortened (CCR-QD-464)<br>1.48 (2026-11-22): BEH-QD-700: the store-list test compares names as a set and the section claims no order (CCR-QD-464)<br>1.47 (2026-11-22): BEH-QD-698: a build whose parent subscribe throws, and a close whose release throws, are stated; its pinned-by paragraph is wrapped (CCR-QD-464)<br>1.46 (2026-11-22): BEH-QD-696 to BEH-QD-700: own enumerable string-keyed key fields, a parent whose subscribe throws, the derived stores named, the ordinal history in a dated note, and what the store-list test holds (CCR-QD-464)<br>1.45 (2026-11-22): BEH-QD-700 cites ADR-QD-185 and the change register only (CCR-QD-464)<br>1.44 (2026-11-22): BEH-QD-696 to BEH-QD-700: a derived store behind the dock model's stores; BEH-QD-465, BEH-QD-583 and BEH-QD-656 amended (ARCH-119, CCR-QD-464)<br>1.43 (2026-11-22): BEH-QD-615 drops the ordinal and is pinned by the per-store test<br>1.42 (2026-11-22): BEH-QD-616: the model holds no gate-watch state; its join is a derived store<br>1.41 (2026-11-22): BEH-QD-465 and BEH-QD-583 name the read half of a store ReadableStore (ARCH-119, CCR-QD-464)<br>1.40 (2026-11-22): BEH-QD-692: a throwing reporter is named by the option the caller passed (ARCH-118, ADR-QD-184, CCR-QD-463)<br>1.39 (2026-11-22): BEH-QD-507, BEH-QD-519 and BEH-QD-637 amended: a stopped reason is causeMessage's text of the cause (ADR-QD-182, CCR-QD-461)<br>1.38 (2026-11-21): BEH-QD-656: a capacity change's publish stops no read, and the diagnostics poll's Stopped is held (ARCH-115, CCR-QD-459)<br>1.37 (2026-11-20): BEH-QD-656 new; BEH-QD-638 amended: every listener is called, and what they threw is rethrown (ARCH-111, ADR-QD-177, CCR-QD-455)<br>1.36 (2026-11-19): BEH-QD-638 says a release that throws is swallowed, not stated (BEH-QD-584) (review iteration 3)<br>1.35 (2026-11-19): BEH-QD-638 narrows its no-escape rule to the registry and the thunk; a feed subscribe listener must not throw; BEH-QD-636's pin names TF24 (review iteration 2)<br>1.34 (2026-11-19): BEH-QD-636: a configure after the scope closed reads and publishes nothing (Phase 60 review WR-02)<br>1.33 (2026-11-19): BEH-QD-636..640; BEH-QD-323, 465, 506, 510 amended (ARCH-107, CCR-QD-451)<br>1.32 (2026-11-18): BEH-QD-616..620; BEH-QD-323, 465, 506, 507, 583, 584, 585 amended (ARCH-103, CCR-QD-447)<br>1.31 (2026-11-18): BEH-QD-611..615; BEH-QD-465, 573, 575, 216 amended (ARCH-102, CCR-QD-446)<br>1.30 (2026-11-16): BEH-QD-583: pinned by M38 and M45, M46 (review iteration 3 IN-04, IN-06; ARCH-96, CCR-QD-440)<br>1.29 (2026-11-16): BEH-QD-584: an unsubscribe that throws is not stated; configure swaps the registry before it re-merges; the same registry is not subscribed again after a watch that worked; an unrenderable throw is a fixed sentence (review iteration 3 IN-01, IN-02, IN-05; ARCH-96, CCR-QD-440)<br>1.28 (2026-11-16): BEH-QD-584: a configure after a failed subscribe subscribes again, with the same registry or another; a silent mend stays Failed until read (review iteration 2 IN-03; ARCH-96, CCR-QD-440)<br>1.27 (2026-11-16): BEH-QD-583: the same failure is the same name and message, not the stack (review iteration 2 IN-02; ARCH-96, CCR-QD-440)<br>1.26 (2026-11-16): BEH-QD-584: an unsubscribe that throws is stated and never repeated (review iteration 2 WR-01; ARCH-96, CCR-QD-440)<br>1.25 (2026-11-16): BEH-QD-583 and BEH-QD-584: a registry that throws is stated as the Failed gates view and its rows make no claim; Listed carries nothing; a closed model reads no registry (review WR-01, IN-02, IN-03; ARCH-96, CCR-QD-440)<br>1.24 (2026-11-16): BEH-QD-581 to 585; BEH-QD-465 amended and BEH-QD-217 corrected: the gate registry is the dock model's eighth store (ARCH-96, CCR-QD-440)<br>1.23 (2026-11-16): BEH-QD-215: a defaulted port with no name reads 'defaulted — unnamed' (ARCH-94 review WR-01)<br>1.22 (2026-11-16): BEH-QD-573 and BEH-QD-575 new; BEH-QD-215's defaulted is read from isPortDefault, not a name (ARCH-94, CCR-QD-438)<br>1.21 (2026-11-14): BEH-QD-521 to BEH-QD-525 new: one module owns a run a newer run supersedes (CCR-QD-428)<br>1.20 (2026-11-12): BEH-QD-519 and BEH-QD-520 new: the timeline states a stop and restarts; BEH-QD-465 (eight readouts), BEH-QD-509 and BEH-QD-510 restated (CCR-QD-427)<br>1.19 (2026-11-12): review fixes: a closed feed and a repeated command publish nothing; the notice keeps a persistent status region, alerts once per stop and shows its focus (ARCH-82, BEH-QD-507, BEH-QD-509, INV-QD-313, CCR-QD-425)<br>1.18 (2026-11-12): BEH-QD-465 restated (seven stores) and BEH-QD-323 restated (the model polls; useDiagnostics returns { status, reading }); BEH-QD-506..510 new (ARCH-82, CCR-QD-425)<br>1.17 (2026-11-11): The one internal hook, useGates, is in useGate.ts (ARCH-76, CCR-QD-418, ADR-QD-140)<br>1.16 (2026-11-11): BEH-QD-465 — the dock is one model (makeDockModel owns the six stores and pushes the rail, one configure, the model reads its source in its own scope); BEH-QD-466 — a choice from a list has one shape (HeldChoice's three arms, one cell in both sessions); BEH-QD-389's note names the dock model, not the owned hook (ARCH-74, ADR-QD-047 amendment, CCR-QD-416)<br>1.15 (2026-11-10): BEH-QD-429 (every panel shows a verdict through one treatment) and BEH-QD-430 (a record's outcome and obligation are read once) (ARCH-67, CCR-QD-409)<br>1.14 (2026-11-10): BEH-QD-399 added: the role tree is the role walk as flat rows, keyed by identity, stack-safe at 20,000 deep, a repeated role a leaf pointing at its first occurrence; BEH-QD-214's diamond requirement amended to match (ADR-QD-128, ARCH-64, CCR-QD-406)<br>1.13 (2026-11-10): BEH-QD-389 — the dock's tab, filters, selection and replay are a session the dock owns: pair the whole timeline then filter, count the whole timeline, select opens the inspector, replay opens the simulator and re-seeds (ARCH-63, ADR-QD-047, CCR-QD-405)<br>1.12 (2026-11-09): BEH-QD-337 — what the explorer shows is a session the dock owns; BEH-QD-211 and BEH-QD-213 gain a sentence each (ARCH-58, ADR-QD-047, CCR-QD-394)<br>1.11 (2026-11-08): BEH-QD-233 — every surface registers through one internal useGates over a writer the provider resolves once (ARCH-49, ADR-QD-111, CCR-QD-388)<br>1.10 (2026-10-08): the screens' mechanics (`policiesSeen`, `PolicyTree`, the lens) are package-private; specified here because the dock relies on them (ARCH-40, ADR-QD-047, CCR-QD-321)<br>1.9 (2026-10-08): BEH-QD-323 — a reading supplied to the dock is one `reading` prop of `DiagnosticsReading`, merged field by field by `mergeReading`, replacing the five props `wiring`, `activity`, `portCalls`, `questions` and `hydration`; the superseded `hydrationMismatches` is removed from the dock and `QuestionsPanel` (**breaking**, ARCH-44, reverses the layout half of ARCH-24's D-24-c, CCR-QD-241)<br>1.8 (2026-10-08): BEH-QD-323 — under a `QadiProvider` the shared build comes from `useDevtoolsFeed()`'s layer, the provider's own build, rather than a hoisted context (ARCH-34, BEH-QD-327, CCR-QD-240)<br>1.7 (2026-10-08): BEH-QD-233 — a registry built by `makeGateRegistry` reports a colliding id by default (ARCH-43, CCR-QD-250)<br>1.6 (2026-10-08): BEH-QD-211 — two structurally equal *declared* policies are one entry under the first declared name, and the explorer and the role viewer keep what they show when their list moves (ARCH-33, INV-QD-107, CCR-QD-206)<br>1.5 (2026-10-07): BEH-QD-233 — a hook that asks several questions (`usePolicies`, `useQuestions`) lists one instance per question, each under `<useId>/<name>`; the panel shows the new kind strings as they are (ARCH-23, ADR-QD-103, CCR-QD-201)<br>1.4 (2026-10-07): BEH-QD-323 — diagnostics are sampled by the model, and a sample that changed nothing changes nothing; BEH-QD-218's table says what the dock can obtain for itself when handed `diagnostics` (ARCH-24, CCR-QD-200)<br>1.3 (2026-10-07): BEH-QD-215 — all seven required services are listed (`CustomPredicate` and `SignatureHistory` were missing); the five port rows are the registry's, in its order, and each says whether it is the description's fail-closed default, or a wrapper around it (`PortReport.defaulted`) (ARCH-21, CCR-QD-198)<br>1.2 (2026-10-05): BEH-QD-216 names a decision log's `clear` rather than the removed `decisionSinkRing`'s (CCR-QD-181)<br>1.1 (2026-08-24): BEH-QD-233, BEH-QD-234 — a guard may record that it exists, and the lens points at one; BEH-QD-217's per-instance prohibition withdrawn and its keying requirement restated; its hydration-counts requirement superseded by BEH-QD-231 (CCR-QD-072, CCR-QD-073)<br>1.0 (2026-08-24): Initial release (CCR-QD-068) |

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

`defaulted` is read from the fact core states (`isPortDefault`,
[BEH-QD-571](./25-inspection.md#beh-qd-571-a-ports-fail-closed-default-is-a-fact-its-service-carries-through-every-derived-wrapper)),
so a derived wrapper around a default and a hand-written one that spreads it both
read defaulted, and a fresh object reads as a real adapter whatever it is called
([BEH-QD-572](./25-inspection.md#beh-qd-572-a-hand-written-wrapper-keeps-the-default-only-by-spreading-it)).
A name is shown, never parsed.

A card's consequence line is a compile error until written: it is one row of
[BEH-QD-573](#beh-qd-573-each-ports-consequence-and-call-reading-are-stated-once)'s
table.

```
REQUIREMENT: An unnamed implementation MUST be reported as unnamed.
```

A different fact from absent, and the one a `name?` was added to answer. The
defaulted fact is checked first: a default with no name reads `defaulted — unnamed`
(never `wired, unnamed`), because `defaulted` no longer depends on the name.

```
REQUIREMENT: `wiringReport` MUST run with no layer at all.
```

Every read goes through `Effect.serviceOption`, so `R` is `never`. A panel that
could only run inside a fully-wired program would be unavailable exactly when a
wiring question arises.

## BEH-QD-573: Each port's consequence and call reading are stated once

```
REQUIREMENT: Each port's fail-closed consequence sentence and its call-row
             reading MUST be one row of one table keyed by `PortName`
             (`PortReading.ts`), so a port without a row is a compile error.
             The services view MUST keep one generic `describe` that dispatches
             through the table, adding only the `attempts` suffix, and MUST name
             no port's span field.
```

Before ARCH-94 the consequence sentences sat in `Wiring.ts` and the call readings
in per-port arms of `ServicesPanel.tsx`, so a port's wording was two edits in two
files and one of them was not checked. The wording is pinned byte for byte by
`ServicesPanel.reading.test.tsx`, which passed unchanged on the phase base and
after.

> **Amended 2026-11-18 (CCR-QD-446).** The generic `describe` and its `attempts` suffix now live in `PortCards.ts`, which prints
> `describeCall`'s sentence plus the suffix as a call row's text ([BEH-QD-613](#beh-qd-613-a-cards-recent-calls-are-a-closed-union-the-panel-prints)), and not in `ServicesPanel.tsx`.
> `ServicesPanel.reading.test.tsx` keeps one case, the five consequences byte for byte, and the call readings are pinned in
> `PortCards.test.ts`. The paragraph above is kept as written.

## BEH-QD-575: A new port asks devtools only for what the compiler names

```
REQUIREMENT: Adding a port to core's registry MUST require, in
             `@qadi/devtools`' source, only the edits the compiler flags.
```

Measured with a throwaway sixth port (47-05, reverted): exactly four entries, each
a mapped type over `PortName` that is a compile error until written:

- `PortReading.ts`'s reading row, the consequence and the call sentence
  ([BEH-QD-573](#beh-qd-573-each-ports-consequence-and-call-reading-are-stated-once));
- `PortCalls.ts`'s `ROWS` entry
  ([BEH-QD-574](./30-port-calls.md#beh-qd-574-call-rows-are-built-by-one-checked-row-builder-and-portcall-is-derived-from-the-registry));
- `SimulationFields.ts`'s extractor table and `SimulationSource.ts`'s answers
  table, the two simulation fixture tables.

`Wiring.ts` and `ServicesPanel.tsx` need no edit: neither names a port. The two
simulation tables are there because core's `PortFixtureData` requires them;
deriving them is out of scope, so they are two of the four lines a sixth port
costs ([ADR-QD-160](../decisions/160-port-facts-are-read-from-the-description.md)).

> **Amended 2026-11-18 (CCR-QD-446).** `PortCards.ts` needs no edit for a new port either: its activity and call records are built
> by `tabulatePorts` over the registry and `isPortName` reads the registry, so a sixth port is still the four lines the
> list above names ([BEH-QD-611](#beh-qd-611-a-port-card-is-one-model-row-keyed-by-its-wired-service)). The paragraph above is kept as written.

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

> **Amended 2026-11-18 (CCR-QD-446).** `PortActivity.port` is a `PortName`, and `portActivity` reads one entry per registry port, so a
> word written to a port metric outside the registry is no longer reported
> ([BEH-QD-614](#beh-qd-614-port-activity-reads-one-entry-per-registry-port)). **Breaking** for `@qadi/devtools`. The requirements above are unchanged.

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
>
> **Correction (2026-11-16, ADR-QD-162).** The host no longer subscribes. `DevtoolsDock`
> takes the registry itself (`gates: GateRegistryLike`, usually the feed's `gates` or
> `atoms.gates`) and its model subscribes in its own scope
> ([BEH-QD-584](#beh-qd-584-the-gate-registry-is-a-model-input-subscribed-for-the-models-scope)); the feed hands the
> registry over ([BEH-QD-585](#beh-qd-585-the-dock-takes-the-registry-and-the-feed-hands-it-over)). The host calls above
> are kept as written, as the history of the wiring.

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
>
> **Amended 2026-11-18 (CCR-QD-447).** The poll no longer samples the questions: `questions` is a dock input beside `gates`,
> read by the model's gates feed ([BEH-QD-617](#beh-qd-617-the-questions-are-a-dock-input-read-on-the-diagnostics-cadence)),
> so the dock comment below hands it beside `diagnostics`. `DiagnosticsReading.questions` stays, carried by a supplied reading.
>
> **Amended 2026-11-19 (ARCH-107, CCR-QD-451).** The poll's headless interface is `makeDiagnosticsFeed`, exported from the
> root ([BEH-QD-637](#beh-qd-637-the-diagnostics-feed-is-the-roots-poll-and-its-stop-is-stated)); `runDiagnostics` and
> `makeDiagnosticsStore` are no longer exported ([BEH-QD-640](#beh-qd-640-the-runners-are-the-feeds-engines-not-the-interface)),
> and `DiagnosticsOptions` is the one option shape the feed, `useDiagnostics` and the dock take
> ([BEH-QD-639](#beh-qd-639-one-option-shape-configures-the-poll)). The listing and the `sampleOnce` fence below are the
> current text.

```ts
export const makeDiagnosticsFeed: (
  options?: DiagnosticsOptions,
) => Effect<DiagnosticsFeed, never, Scope>;
export interface DiagnosticsOptions {
  readonly layer?: Layer.Layer<never, unknown> | undefined;
  readonly collector?: PortCallCollector | undefined;
  readonly intervalMillis?: number | undefined;
}
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
export const useDiagnostics: (options?: DiagnosticsOptions) => DiagnosticsSnapshot;
// <DevtoolsDock diagnostics={{ layer, collector, intervalMillis }} questions={atoms.asked} />
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
import { decisionCacheLayer } from "@qadi/core";
import { makeDiagnosticsFeed } from "@qadi/devtools";

export const sampleOnce = Effect.scoped(
  Effect.gen(function* () {
    const feed = yield* makeDiagnosticsFeed({ layer: decisionCacheLayer() });
    yield* Effect.yieldNow;
    return feed.getSnapshot().reading.wiring._tag;
  }),
);
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

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-416, CCR-QD-425, CCR-QD-427) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md)
>
> **Amended 2026-11-24 (ARCH-125, CCR-QD-470).** `configure` compares a capacity by the bound it means, reads an omitted one
> as `DEFAULT_TIMELINE_CAPACITY`, and applies a capacity whole or not at all: one the timeline refuses throws before the dock
> moves, and a timeline listener's throw is rethrown once every other input is applied
> ([BEH-QD-728](#beh-qd-728-a-capacity-the-timeline-refuses-changes-nothing-in-configure)).
>
> **Amended 2026-11-22 (ARCH-119, CCR-QD-464).** The model's stores are listed once, in
> [BEH-QD-700](#beh-qd-700-the-dock-models-stores-are-listed-once); the counts and ordinals in the notes below are kept as
> written. `questions` and `services` are typed `ReadableStore`, and they and the shown reading are derived stores
> ([BEH-QD-699](#beh-qd-699-the-dock-models-three-computed-stores-are-derived-stores)).
>
> **Amended 2026-11-19 (ARCH-107, CCR-QD-451).** `DockModelInputs.diagnostics` is `DiagnosticsOptions`, the one option shape
> ([BEH-QD-639](#beh-qd-639-one-option-shape-configures-the-poll)); `DiagnosticsDockOptions` is gone. The model's three feeds
> are the root's headless interface ([BEH-QD-636](#beh-qd-636-the-timeline-feed-is-the-roots-timeline-interface)).
>
> **Amended 2026-11-12 (CCR-QD-427).** The timeline's status is the dock model's eighth readout,
> `timelineStatus`, with its restart ([BEH-QD-519](#beh-qd-519-a-defect-stops-the-timeline-visibly-and-a-restart-resumes-it)).
>
> **Amended 2026-11-16 (CCR-QD-440).** The gate registry is the model's eighth store, `questions`: the polled questions
> joined to the registry's guards at one moment
> ([BEH-QD-583](#beh-qd-583-the-questions-store-is-one-moment-and-keeps-its-reference-when-nothing-moved)), over a registry
> the model subscribes to in its own scope
> ([BEH-QD-584](#beh-qd-584-the-gate-registry-is-a-model-input-subscribed-for-the-models-scope)). The count is the one
> [ADR-QD-162](../decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) states: seven
> stores before (the timeline, the dock session, the explorer, the role choice, the simulation, the diagnostics and the
> timeline status), `questions` the eighth, and `sightings` a thunk the model reads and not a store. The earlier ordinals
> in this section counted the policy rail among the stores, so they called the diagnostics the seventh and the timeline
> status the eighth readout; they are kept as written.
>
> **Amended 2026-11-18 (CCR-QD-446).** The Services tab's port cards are the model's ninth store, `services`: the wiring read, the
> activity and the call log joined to one `ServicesView` at one moment
> ([BEH-QD-615](#beh-qd-615-the-services-store-is-one-moment-and-keeps-its-reference-when-nothing-moved)). Counting as the note above does, the eight stores before it and `services` the ninth.
> `DockModel` below lists it after `questions`.
>
> **Amended 2026-11-18 (CCR-QD-447).** The model composes three feeds, not two: the timeline's, the diagnostics poll's and the
> gates feed, which owns the registry watch and the questions input
> ([BEH-QD-616](#beh-qd-616-one-feed-owns-the-gate-watch-and-the-questions-input)). `questions` is a dock input beside `gates`,
> listed below between `ports` and `reading`.

```ts
export interface DockModelInputs {
  readonly capacity?: number | undefined;
  readonly catalogue?: Catalogue | undefined;
  readonly diagnostics?: DiagnosticsOptions | undefined;
  readonly gates?: GateRegistryLike | undefined;
  readonly ports?: EvaluationPortsLayer | undefined;
  readonly questions?: (() => ReadonlyArray<AskedQuestionLike>) | undefined;
  readonly reading?: DiagnosticsReading | undefined;
  readonly source?: Source | undefined;
}
export interface DockModel {
  readonly timeline: TimelineStore;
  readonly diagnostics: DiagnosticsReadout;
  readonly timelineStatus: TimelineStatusReadout;
  readonly questions: ReadableStore<QuestionsSnapshot>;
  readonly services: ReadableStore<ServicesView>;
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
The status of the timeline's own read, and the command that reads it again, are its eighth
readout, `timelineStatus`, taken from the timeline feed the model already owns
([BEH-QD-519](#beh-qd-519-a-defect-stops-the-timeline-visibly-and-a-restart-resumes-it)).

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
REQUIREMENT: `configure` MUST dispatch only an input whose identity changed, and a capacity
             only when the bound it means changed.
```

An unchanged prop resets nothing: not a capture, not a half-filled form, not a held
choice. An omitted input reads as `undefined` and an omitted capacity as
`DEFAULT_TIMELINE_CAPACITY`.

```
REQUIREMENT: The dock model MUST own the diagnostics feed and the merged reading as
             its seventh store, and `DevtoolsDock` MUST NOT sample or merge.
```

The dock renders `model.diagnostics`, whose snapshot is already the merge of the polled
reading and the one a host supplied, so no render computes it.

```
REQUIREMENT: The dock model MUST expose the timeline's status and its restart as its
             eighth readout, `timelineStatus`, read from the timeline feed and not merged
             (BEH-QD-519).
```

Unlike the diagnostics, there is nothing to merge: a timeline has no second source of its
status, so the readout is the feed's own, and a hide and a show of the dock rebuilds it at
`Reading`.

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

Pinned by `DockModel.test.ts`, headlessly (M1 to M17 and the property P1, and M55 and M56 for a capacity the
timeline refuses or a listener interrupts, [BEH-QD-728](#beh-qd-728-a-capacity-the-timeline-refuses-changes-nothing-in-configure)), and through
the dock by `DevtoolsDock.test.tsx`, which keeps the layout and the wiring only, with
M18 to M28 for the seventh store and M29 and M30 for the eighth. A hide and a show of the dock in a React `Activity`
rebuilds the model, so a paused dock returns to live, the backlog is read again and the
diagnostics start at `Starting` with no reading; this is accepted
(ADR-QD-047, CCR-QD-416, CCR-QD-425, CCR-QD-427).

## BEH-QD-700: The dock model's stores are listed once

> **Decision:** [ADR-QD-185](../decisions/185-the-dock-models-computed-stores-are-derived-stores.md) ·
> **Scope:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) ·
> **Invariant:** [INV-QD-390](../invariants.md#inv-qd-390-the-dock-models-computed-stores-are-derived-stores-and-their-count-is-stated-once)

```
REQUIREMENT: The dock model's stores MUST be exactly the members of `DockModel` that have
             `subscribe` and `getSnapshot`: `timeline`, `dock`, `explorer`, `roles`,
             `simulation`, `diagnostics`, `timelineStatus`, `questions` and `services`;
             `sightings` is a thunk and not a store.
```

This section is the one place the model's stores are named and counted, nine of them, in no particular order. A test of
a built model compares the names of the members that have `subscribe` and `getSnapshot` with a list, as a set, and fails
when one is added or removed; the list there and the list here are kept equal by review, not by a gate. `timeline`,
`dock`, `explorer`, `roles` and `simulation` are the timeline, the dock session, the explorer, the role choice and the
simulation; `diagnostics` is the poll's status with the sampled reading and a supplied one laid over it;
`timelineStatus` is whether the timeline's read is running or stopped, with the one command that reads it again;
`questions` is the gates feed's snapshot joined to the questions and the poll's status
([BEH-QD-583](#beh-qd-583-the-questions-store-is-one-moment-and-keeps-its-reference-when-nothing-moved)); `services` is
the Services tab's port cards
([BEH-QD-615](#beh-qd-615-the-services-store-is-one-moment-and-keeps-its-reference-when-nothing-moved)). `diagnostics`,
`questions` and `services` are derived stores
([BEH-QD-699](#beh-qd-699-the-dock-models-three-computed-stores-are-derived-stores)).

> **Noted 2026-11-22 (CCR-QD-464).** Earlier records counted the policy rail among the stores. They call the diagnostics
> the seventh store, the timeline status the eighth readout, `questions` the eighth store and `services` the ninth; those
> ordinals stay as written where they appear, and none of them is this list.

Pinned by `packages/devtools/test/model/DockModel.test.ts`, which compares the names of the members of a built model that
have `subscribe` and `getSnapshot` with a list, whatever their order, and fails when one is added or removed ("a built
model's members with subscribe and getSnapshot are exactly this list"). Specified in ADR-QD-185 (CCR-QD-464).

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

> **Amended 2026-11-23 (ADR-QD-187, CCR-QD-466).** The simulation session no longer embeds a
> `makeHeldChoice` cell: it holds one `SeededChoice` (`SeededChoice.ts`), a pure value built on
> `resolveHeld`, `pinHead` and `heldValue`, with `makeHeldChoice` and its store kept for the explorer
> session and the role viewer. `PolicyChoice`, declared in `SeededChoice.ts`, still carries the three
> arms of `HeldChoice<PolicySighting>` and adds `Seeded`; `ExplorerShown` is unchanged. The simulation
> half of the pinning moved from `SimulationSession.test.ts` to `SeededChoice.test.ts` and
> `SeededChoice.tst.ts`. See [ADR-QD-187](../decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md).

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
>
> **Amended 2026-11-18 (CCR-QD-447).** `questions` is no longer a diagnostics option, so it is no longer a reason to restart the
> run: the questions are read by the gates feed ([BEH-QD-617](#beh-qd-617-the-questions-are-a-dock-input-read-on-the-diagnostics-cadence)).

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

> **Amended 2026-11-19 (ARCH-107, CCR-QD-451).** `DiagnosticsStatus`, `DiagnosticsSnapshot`, `DiagnosticsReadout`,
> `DiagnosticsFeed` and `makeDiagnosticsFeed` are public, exported from the root, and the React entry re-exports the status
> and the snapshot; `DiagnosticsDockOptions` is `DiagnosticsOptions`. A headless shell builds the same feed the dock model
> builds ([BEH-QD-637](#beh-qd-637-the-diagnostics-feed-is-the-roots-poll-and-its-stop-is-stated), ADR-QD-173); the idle
> readouts stay package-private.

The dock forked its poll from a React effect and merged the supplied reading in a memo.
The poll is now a feed the dock model builds in its own scope, and the reading the
screens show is the model's seventh store.

```
REQUIREMENT: The poll MUST run as one fiber in its owner's scope, forked while the owner
             is built, so building the owner never waits on the application's layer.
```

Until the first sample lands the status is `Starting`.

```
REQUIREMENT: A run MUST restart only when `layer`, `collector` or `intervalMillis`
             changes identity, or when the options go from absent to handed or back.
             A change to the supplied reading alone MUST NOT restart it.
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
F27), `packages/devtools/test/model/DockModel.test.ts` (M18 to M28), and through the dock
by `packages/devtools/test/react/DiagnosticsScreens.test.tsx`. Specified in
ADR-QD-047 (CCR-QD-425).

## BEH-QD-507: A defect stops the poll visibly, and a restart resumes it

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-425) ·
> **Invariant:** [INV-QD-313](../invariants.md#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes)
>
> **Amended 2026-11-18 (CCR-QD-447).** A throwing `questions` input no longer reaches the poll: it is stated in the questions
> panel and the poll keeps running ([BEH-QD-618](#beh-qd-618-a-questions-input-that-throws-is-stated-and-the-poll-keeps-running)).
> The example below is now a collector whose snapshot throws.

A sample that dies (a collector whose snapshot throws, for one) ends the poll fiber, and a fiber
handle drops a dead fiber without a word. The panels used to freeze on the last reading
with nothing said.

```
REQUIREMENT: A run that ends on a defect MUST produce `Stopped { reason, sampled }`, keep
             the last accepted reading, and publish both in one snapshot.
```

`reason` is `causeMessage` of the cause (its `Cause.pretty` text whenever that renders,
`a value that could not be described` otherwise), kept verbatim and uncapped. It lives only in the
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

A restart while the feed is already `Starting` publishes nothing: `Starting` is one value, so
a repeat is the same state and no listener is told twice.

`restart()` with no options held does nothing, and so does `configure(undefined)` on a
feed that already holds none: it is not an `Off` over an `Off`.

```
REQUIREMENT: A closed feed MUST ignore `restart()` and `configure`, and publish nothing.
```

A command held across a rebuild (a stale `restart` captured before a hidden `Activity`
closed the scope) would otherwise publish `Starting` on a feed whose run is interrupted at
once, and nothing would ever follow it.

Pinned by `packages/devtools/test/model/DiagnosticsFeed.test.ts` (F1 to F27) and, through
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

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-425, CCR-QD-427)
>
> **Amended 2026-11-12 (CCR-QD-427).** The stopped notice's box is one component shared with the
> timeline's ([BEH-QD-520](#beh-qd-520-every-screen-that-reads-the-timeline-states-a-stop-the-same-way)),
> and its Restart button reads the body colour inside an amber border.

The Services and React screens read the diagnostics. Both render one shared notice first
and write no notice markup of their own, so they cannot disagree about a stop.

```
REQUIREMENT: `Starting` MUST fill a polite status region, and `Stopped` MUST render an
             alert the first time a stop is shown, with the verbatim reason after it and
             a restart that moves focus to the screen root.
```

A stop that is already announced stays visible without a second alert, however many
screens the reviewer visits. `Starting` is the expected first moment and stays quiet.
The reason is a height-bounded block of text, not markup.

```
REQUIREMENT: The alert MUST hold the lead and the body only, and a second stop MUST
             remount it.
```

The reason is a stack trace, so it follows the alert inside the notice and a screen reader
does not read it aloud. A role added to an element already in the tree is generally not
announced, so every new stop is a new mount and its alert is decided as it mounts.

```
REQUIREMENT: The polite status region MUST exist before its text arrives, and MUST stay
             mounted while the status changes.
```

A live region announces reliably only when it is in the tree before its content is. It is
rendered empty for `Off`, `Live` and `Stopped`, so it adds no visible space, and holds the
`Starting` copy while the poll is starting.

```
REQUIREMENT: The screen root a restart moves focus to MUST keep a visible focus indication.
```

The root is a programmatic focus target and not a tab stop, and it sets no `outline`, so the
browser's own focus ring shows where a keyboard user's focus went when the button left.

```
REQUIREMENT: While no sample is accepted, the messages that read an absent field as "not
             handed over" MUST be withheld.
```

Before the first sample, and after a stop that preceded it, a missing field means it has
not been read yet, not that the host never supplied it.

```
REQUIREMENT: `Off` and `Live` MUST add nothing visible to a screen.
```

Pinned by `packages/devtools/test/react/DiagnosticsNotice.test.tsx` (N1 to N15: N14 is the
screen root's focus ring and N15 is Restart's colours), `packages/devtools/test/react/theme.contrast.test.ts`
(CT1 to CT6, the notice's colour pairs measured from the tokens) and
`packages/devtools/test/react/DiagnosticsScreens.test.tsx` (D1 to D11). Specified in
ADR-QD-047 (CCR-QD-425, CCR-QD-427).

## BEH-QD-510: The public hooks are adapters over scoped feeds, read through one store-snapshot hook

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-425, CCR-QD-427) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md)
>
> **Amended 2026-11-19 (ARCH-107, CCR-QD-451).** `useDiagnostics` takes `DiagnosticsOptions`, the feed's own option shape
> ([BEH-QD-639](#beh-qd-639-one-option-shape-configures-the-poll)).
>
> **Amended 2026-11-12 (CCR-QD-427).** `useTimeline`'s result carries the feed's `status` and
> `restart` ([BEH-QD-519](#beh-qd-519-a-defect-stops-the-timeline-visibly-and-a-restart-resumes-it)).

```ts
export const useDiagnostics: (options?: DiagnosticsOptions) => DiagnosticsSnapshot;
export const useTimeline: (
  source: Source,
  options?: { readonly capacity?: number },
) => UseTimeline;
```

`UseTimeline` carries `status` and `restart` beside its store
([BEH-QD-519](#beh-qd-519-a-defect-stops-the-timeline-visibly-and-a-restart-resumes-it)).

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
`packages/devtools/test/react/useDiagnostics.test.tsx`, `useTimeline.test.tsx` (UT1 to UT3
for the timeline's status and restart), `DiagnosticsLifetime.test.tsx` and
`TimelineLifetime.test.tsx`. Specified in ADR-QD-047 (CCR-QD-425, CCR-QD-427).

## BEH-QD-519: A defect stops the timeline visibly, and a restart resumes it

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-427) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-313](../invariants.md#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes)

The timeline feed's read ends the way the diagnostics poll does, and is watched the same
way. A source whose backlog or live stream dies ended its fiber, a fiber handle drops a
dead fiber without a word, and the screens kept showing the entries it had delivered as if
more were coming. A read that was replaced while it was still delivering its backlog could
also keep writing after the re-entrant replace that superseded it.

```
REQUIREMENT: A read that ends on a defect MUST produce `Stopped { reason }` and keep what
             the timeline delivered.
```

`reason` is `causeMessage` of the cause (its `Cause.pretty` text whenever that renders,
`a value that could not be described` otherwise), kept verbatim. It lives only in the model's
in-memory snapshot and is rendered as React text; it is never sent to a sink record, a
response, a log or a metric. The entries the read delivered before it died stay in the
timeline.

```
REQUIREMENT: An interruption MUST NOT produce `Stopped`: not a new source, not no source,
             not a capacity change, not the scope closing, and not a replaced read whose
             release dies.
```

```
REQUIREMENT: A read that has been replaced MUST NOT write: not a record and not a stop.
```

```
REQUIREMENT: A source that ends by itself MUST stay `Reading`.
```

A source with nothing more to deliver is not a defect, so a finished backlog stays quiet.

```
REQUIREMENT: `restart()` MUST start a fresh read from the source the feed holds, from
             `Stopped` or from `Reading`, and a closed feed MUST ignore it and publish
             nothing.
```

A restart replays the source's backlog into the same timeline, and the timeline's dedupe
keeps each entry single. A command held across a rebuild (a stale `restart` captured before
a hidden `Activity` closed the scope) would otherwise read a source nobody owns.

```
REQUIREMENT: `useTimeline` MUST return `status` and `restart`, reading `Reading` with an
             inert `restart` before its feed exists, and `useTimelineStore` MUST return
             the same shape with a `Reading` that never changes.
```

A store fed by hand has no read, so it has no stop to state.

```tsx
import type { Source } from "@qadi/devtools";
import { TimelineStatus, useTimeline } from "@qadi/devtools/react";

export const TimelineLine = ({ source }: { readonly source: Source }) => {
  const { timeline, status, restart } = useTimeline(source);
  return TimelineStatus.$is("Stopped")(status) ? (
    <button type="button" onClick={restart}>
      {status.reason}
    </button>
  ) : (
    <p>{timeline.entries.length} decisions</p>
  );
};
```

Pinned by `packages/devtools/test/model/TimelineFeed.test.ts` (TF9 to TF17: TF9 a replaced read
writes nothing more, TF10 and TF11 a defect is a stop, TF12 and TF13 an interruption and an
end by itself are not, TF14 to TF17 the restart), `packages/devtools/test/model/DockModel.test.ts`
(M29, the eighth readout) and `packages/devtools/test/react/useTimeline.test.tsx` (UT1 to UT3).
Specified in ADR-QD-047 (CCR-QD-427).

## BEH-QD-520: Every screen that reads the timeline states a stop the same way

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-427)

The Log, the Inspector, the Policies explorer and the Simulator render from the timeline.
Roles, Services and Questions do not. The dock renders one notice above the four, built
from the same stopped box the diagnostics notice uses
([BEH-QD-509](#beh-qd-509-every-screen-that-reads-the-diagnostics-states-its-status-the-same-way)),
so a stop reads the same wherever it is first seen.

```
REQUIREMENT: A stopped timeline MUST render the notice as the dock body's first child on
             the Log, Inspector, Policies and Simulator screens, and the other three MUST
             render none.
```

Which screens read the timeline is data, a record closed over the tab ids, so a tab added
later must state which it is before it compiles.

```
REQUIREMENT: The alert MUST hold the lead "Timeline stopped." and the body "The source
             failed with an unexpected error and is no longer delivering decisions. What
             it delivered before it stopped is kept, and nothing new will arrive."
             verbatim, with the reason after it in a labelled block.
```

The alert carries the lead and the body only. The reason is a stack trace, so it follows the
alert in a block labelled "Why the timeline stopped", and a screen reader does not read it
aloud.

```
REQUIREMENT: A stop MUST be announced once however many screens the reviewer visits,
             including a stop first seen on a screen that does not read the timeline and
             under StrictMode, and a new stop after a restart, or after the dock is hidden
             and shown, MUST be announced afresh.
```

Moving among the four screens keeps the same notice mounted, so it does not alert again. A
stop that happened while the reviewer was on Roles, Services or Questions has not been
announced, so the first of the four screens visited announces it.

```
REQUIREMENT: Restart MUST remove the notice and move focus to the dock body, which MUST
             show a visible focus indication.
```

The button unmounts with the notice, which would leave focus on the page. The dock body is a
programmatic focus target and not a tab stop, and it draws the dock's own focus ring.

```
REQUIREMENT: The notice MUST use the same stopped box as the diagnostics notice.
```

One box means one place for the alert-once rule, the reason block and the Restart button's
colours, so the two feeds cannot disagree about how a stop looks.

Pinned by `packages/devtools/test/react/TimelineNotice.test.tsx` (TN1 to TN10),
`packages/devtools/test/react/theme.contrast.test.ts` (CT1 to CT6) and
`packages/devtools/test/react/DiagnosticsNotice.test.tsx` (N14, N15). Specified in
ADR-QD-047 (CCR-QD-427).

## BEH-QD-521: A superseded run never lands, and a newer run interrupts it

> **Decision:** [ADR-QD-150](../decisions/150-a-scoped-run-that-a-newer-run-supersedes.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-319](../invariants.md#inv-qd-319-only-the-current-run-lands-and-nothing-starts-or-lands-after-close)

The timeline feed, the diagnostics feed and the simulation session each run one run at a
time, and each does it through one package-private module, `SupersedingRun.ts`. A command
that supersedes the run in flight takes a token from the module and the old token is no
longer current. A store writes a result only while its run's token is current, so the order
in which two fibers finish decides nothing.

```
REQUIREMENT: A superseded run MUST NOT write a record, a sample, a stop or a result.
```

```
REQUIREMENT: A newer run MUST interrupt the run in flight before the command that starts
             it returns.
```

A store that reads its token and compares it with its own counter has restated the module.
The token is opaque: a store asks whether it is current and nothing else.

Pinned by `packages/devtools/test/model/SupersedingRun.test.ts` (R1 and R2 a newer fork
interrupts the older run and the superseded one starts nothing, R9 a superseded run is never
reported, R15 a `begin` with no `fork` leaves the older run running but no longer current,
and the `PROPERTY` describe, which runs random command sequences against a model),
`packages/devtools/test/model/TimelineFeed.test.ts` (TF9) and the session's supersession
cases in `packages/devtools/test/model/SimulationSession.test.ts`. Specified in ADR-QD-150
(CCR-QD-428).

## BEH-QD-522: Stopping a run is one unconditional rule

> **Decision:** [ADR-QD-150](../decisions/150-a-scoped-run-that-a-newer-run-supersedes.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-319](../invariants.md#inv-qd-319-only-the-current-run-lands-and-nothing-starts-or-lands-after-close)

A stop supersedes the current run and starts nothing. The session once forked only when its
handle held a fiber, and that guard saved one throwaway fiber that no host could observe, in
the one place the three stores disagreed about what a stop is.

```
REQUIREMENT: A stop MUST supersede the current run and interrupt any run in flight.
```

```
REQUIREMENT: A stop with no run in flight (never started, completed, or after close) MUST
             change nothing a host can see: no notification, no failure hook and no span.
```

"A stop must not allocate a fiber" was never a requirement; a store never needs to ask
whether a run is in flight before it stops.

Pinned by `packages/devtools/test/model/SupersedingRun.test.ts` (R5 to R8: no run, a run in
flight, a completed run and a closed scope),
`packages/devtools/test/model/SimulationSession.runs.test.ts` (SR2 to SR4: a command that
supersedes on a session that never ran, after a finished run and on a closed session asks no
resolver and opens no span) and `packages/devtools/test/model/DiagnosticsFeed.test.ts` (F26).
Specified in ADR-QD-150 (CCR-QD-428, D-05).

## BEH-QD-523: Closing the owner's scope interrupts the run and is never reported

> **Decision:** [ADR-QD-150](../decisions/150-a-scoped-run-that-a-newer-run-supersedes.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-319](../invariants.md#inv-qd-319-only-the-current-run-lands-and-nothing-starts-or-lands-after-close)

The module registers a finalizer after the handle that holds the run, so on a close it
clears the current token and marks the module closed before the handle interrupts the run.
The run the handle then interrupts is no longer current.

```
REQUIREMENT: Closing the owner's scope MUST interrupt the run in flight, and that run MUST
             NOT land and MUST NOT be reported as a failure, even when its release dies.
```

```
REQUIREMENT: After the scope has closed no command MUST start a run, and no command
             MUST throw.
```

This holds for a store built in a sequential scope, which is the default. A scope made with
`Scope.make("parallel")` forks its finalizers and so voids the ordering: a run that dies as
its scope closes could then be reported. No store is built in one, and a later store must not
be.

Pinned by `packages/devtools/test/model/SupersedingRun.test.ts` (R3 a close mid-run never
calls `onFailure` even when the release dies, R4 a `begin` after the close gives a token that
is never current, R8 a stop after the close, R14 a close inside a run's synchronous start),
`packages/devtools/test/model/DiagnosticsFeed.test.ts` (F24),
`packages/devtools/test/model/TimelineFeed.test.ts` (TF19) and the session's close case in
`packages/devtools/test/model/SimulationSession.test.ts`. Specified in ADR-QD-150
(CCR-QD-428).

## BEH-QD-524: A restart issued before the run starts leaves the newest run live

> **Decision:** [ADR-QD-150](../decisions/150-a-scoped-run-that-a-newer-run-supersedes.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-320](../invariants.md#inv-qd-320-a-newer-run-is-never-interrupted-by-an-older-runs-start)

A store publishes what it shows (`Reading`, `Starting`, `Running`) between taking a token and
forking the run. A subscriber notified by that publish may restart the store, which takes a
newer token. The two feeds forked the stale run anyway and interrupted nothing that was live.

```
REQUIREMENT: A run whose token is no longer current when it is forked MUST start nothing,
             and the newest run MUST be live.
```

`fork` re-checks the token and says whether it started the run, so the outer start forks
nothing and the restart's run is the one left running.

Pinned by `packages/devtools/test/model/SupersedingRun.test.ts` (R1 a superseded token
forks nothing, R16 `fork` says whether it started or held a run and refuses a token that is
not current), `packages/devtools/test/model/TimelineFeed.test.ts` (TF21),
`packages/devtools/test/model/DiagnosticsFeed.test.ts` (F28) and the session's subscriber
cases in `packages/devtools/test/model/SimulationSession.test.ts`. Specified in ADR-QD-150
(CCR-QD-428, D-06).

## BEH-QD-525: A restart issued from a run's synchronous start leaves the newest run live

> **Decision:** [ADR-QD-150](../decisions/150-a-scoped-run-that-a-newer-run-supersedes.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-320](../invariants.md#inv-qd-320-a-newer-run-is-never-interrupted-by-an-older-runs-start)

A run starts synchronously: its body's first steps run inside `fork`, before the fiber is
installed in the handle. A body that starts a command that starts a newer run therefore
installed the newer fiber first and the stale outer fiber after it, and replacing a fiber
interrupts the one it replaces, so the newest run was the one interrupted.

```
REQUIREMENT: A run started while another run's synchronous start is still running MUST be
             installed once that start returns, interrupting the stale outer run, to any
             depth.
```

```
REQUIREMENT: A stop or a close issued inside a run's synchronous start MUST be honoured and
             MUST NOT throw.
```

The module holds the fork requested inside another fork's start in one slot (each `begin`
supersedes the one before it, so one is enough) and installs it when the outer start
returns, re-checking the slot until nothing is held. The synchronous start itself is kept:
36 existing tests read the state a first step reaches before `fork` returns.

Pinned by `packages/devtools/test/model/SupersedingRun.test.ts` (R11 a fork inside a start is
held and then installed, R12 three nested forks leave the innermost live, R13 a stop and R14
a close inside a start),
`packages/devtools/test/model/TimelineFeed.test.ts` (TF22 and TF23),
`packages/devtools/test/model/DiagnosticsFeed.test.ts` (F29) and
`packages/devtools/test/model/SimulationSession.runs.test.ts` (SR5). Specified in ADR-QD-150
(CCR-QD-428, D-07, D-08).

## BEH-QD-581: A guard's render states are stated once, in core

> **Decision:** [ADR-QD-162](../decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) ·
> **Scope:** [ADR-QD-152](../decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md) ·
> **Invariant:** [INV-QD-344](../invariants.md#inv-qd-344-the-five-gate-states-are-stated-once-and-each-reader-is-tied-to-them-by-its-type)

The five words a guard reports it rendered were written twice, in two packages that cannot see each other: `@qadi/react`
derived `GateRenderState` from `DecisionOutcome`'s tags and `@qadi/devtools` restated the union privately for its display
table. Nothing tied the two, so a sixth outcome in react compiled and was shown as `Unrecognised`.

```ts
export type GateState = "Failed" | "Denied" | "Rechecking" | "Pending" | "Allowed";
export const isGateState: (word: string) => word is GateState;
export const gateStates: ReadonlyArray<GateState>;
```

```
REQUIREMENT: `@qadi/core` MUST state the five gate states once, in one module-private table
             whose keys are `GateState`; `gateStates` MUST list them in declaration order,
             worst news first (Failed, Denied, Rechecking, Pending, Allowed), and
             `isGateState` MUST test an own key only, so an inherited name such as
             `toString` is not a state.
```

```
REQUIREMENT: `@qadi/react`'s `GateRenderState` MUST be `GateState`, and
             `DecisionOutcome["_tag"]` MUST equal it in both directions.
```

A sixth outcome added to the decision's outcome, or a sixth state added to core's table, is a type-test failure in react
until the other moves with it.

```
REQUIREMENT: `@qadi/devtools` MUST key its display of a state by `GateState`, so a sixth
             state is a compile error there, and MUST read the list and the guard from
             core rather than restate them.
```

The rows of core's table are empty on purpose: the display words (`Error`, `Deny`, `Allow`) are devtools' vocabulary and
nothing else about a state is generic.

Pinned by `packages/core/test/GateState.test.ts` (the five words in their order, the barrel, an inherited name is not a
state), `packages/core/test/GateState.tst.ts`, `packages/react/test/DecisionOutcome.tst.ts` (a gate's render state is
core's `GateState`, and core's states are the outcome's tags, both ways) and `packages/devtools/test/model/Gates.test.ts`
(`displayOfGateState`: GATE_STATES lists exactly the mapped states, worst news first). Specified in ADR-QD-162
(CCR-QD-440, D-01 to D-07).

## BEH-QD-582: A render state the dock does not know is shown as itself

> **Decision:** [ADR-QD-162](../decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) ·
> **Scope:** [ADR-QD-053](../decisions/053-a-gate-can-be-found.md) ·
> **Invariant:** [INV-QD-344](../invariants.md#inv-qd-344-the-five-gate-states-are-stated-once-and-each-reader-is-tied-to-them-by-its-type)

`GateInstanceLike.state` stays `string`: the dock takes a guard structurally from a package it does not depend on, and a
newer `@qadi/react` may report a word this build has never seen.

```
REQUIREMENT: A state outside the five, a newer react's word or an inherited name such as
             `toString`, MUST be displayed as `Unrecognised` with its own name, and MUST
             NOT be shown as a known state, as an answer, or dropped.
```

`displayOfGateState` is decided by `isGateState`, an own-key test, so `toString` is not a state and `__proto__` is not
either. A failure is displayed `Error` and never `Deny`: a guard that failed to answer has not been refused.

Pinned by `packages/devtools/test/model/Gates.test.ts` (`displayOfGateState`: maps each of the five render states, a
failure to Error and never to Deny; calls a state this build does not know Unrecognised, not an answer) and
`packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx` (the `unrecognised and toString` cell). Specified
in ADR-QD-162 (CCR-QD-440, D-06).

## BEH-QD-583: The questions store is one moment, and keeps its reference when nothing moved

> **Decision:** [ADR-QD-162](../decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) ·
> **Scope:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) ·
> **Invariant:** [INV-QD-343](../invariants.md#inv-qd-343-a-questions-snapshot-pairs-each-asked-question-with-the-guards-asking-it-at-one-moment)
>
> **Amended 2026-11-22 (ARCH-119, CCR-QD-464).** The sentence below no longer gives the store an ordinal: the stores are listed
> once, in [BEH-QD-700](#beh-qd-700-the-dock-models-stores-are-listed-once), and the join is a derived store
> ([BEH-QD-699](#beh-qd-699-the-dock-models-three-computed-stores-are-derived-stores)).
>
> **Amended 2026-11-18 (CCR-QD-447).** The questions joined to the guards are the questions input's answer, read by the gates feed,
> and not a list the diagnostics poll samples. `QuestionsView` gains `Failed { reason }`, a questions input that threw
> ([BEH-QD-618](#beh-qd-618-a-questions-input-that-throws-is-stated-and-the-poll-keeps-running)), and `Unsampled` and `Absent`
> name the questions input below ([BEH-QD-619](#beh-qd-619-the-questions-store-joins-three-readings-and-reads-no-host-code)).

The question panel used to pair a polled list with a `gates` prop in the view, from two sources read at two moments.
`DockModel.questions` is a store of the dock model ([BEH-QD-700](#beh-qd-700-the-dock-models-stores-are-listed-once)) and a
derived store ([BEH-QD-699](#beh-qd-699-the-dock-models-three-computed-stores-are-derived-stores)), and the join is made
once, in the model.

```ts
export interface QuestionRow {
  readonly question: AskedQuestionLike;
  // undefined while the registry could not be read: no claim about who is asking
  readonly asking: ReadonlyArray<GateInstanceLike> | undefined;
}
export type GatesView = Data.TaggedEnum<{
  Absent: {};
  Empty: {};
  Listed: {};
  Failed: { readonly reason: string };
}>;
export type QuestionsView = Data.TaggedEnum<{
  Unsampled: {};
  Absent: {};
  Empty: {};
  Rows: { readonly rows: ReadonlyArray<QuestionRow> };
  Failed: { readonly reason: string };
}>;
export interface QuestionsSnapshot {
  readonly gates: GatesView;
  readonly questions: QuestionsView;
  readonly instances: ReadonlyArray<GateInstanceLike>;
}
// on DockModel
readonly questions: ReadableStore<QuestionsSnapshot>;
```

```
REQUIREMENT: The model MUST recompute `questions` from the questions input's answer and
             the registry's `instances()` in one synchronous step, whichever of the two
             moved, so no row pairs a question from one moment with a guard from another.
```

```
REQUIREMENT: `QuestionsSnapshot.instances` MUST be the registry's own array, or one
             constant when there is no registry or it could not be read; a recompute that
             finds the same questions, the same instances array, the same failure (an error's
             name and message, not the stack its reason renders, which differs by call path)
             and the same unsampled flag MUST publish nothing.
```

```
REQUIREMENT: A registry that throws from `instances()`, on the build, on `configure`, on a
             registry notification or on a poll tick, MUST NOT throw out of the model, MUST
             NOT end the poll or skip another store's listeners, and MUST be stated as the
             `Failed` gates view carrying the reason. While it is `Failed`, every row's
             `asking` MUST be `undefined`, and no row MUST be rendered as "asked, nothing
             mounted" nor as listing a guard.
```

A quiet tick therefore redraws nothing, and a lens that follows `instances` is not rebuilt by one.

```
REQUIREMENT: `Unsampled` MUST mean a running poll that has taken no sample yet, with no
             supplied questions, and `Absent` that no questions input was handed and none
             was supplied; the panel renders the first as nothing at all and the second as
             its explanation.
```

`joinQuestions` is pure over one input and is the one place the panel's rows are decided; the panel calls neither
`gateGroups` nor `instancesAsking`. The listing is a `ts` fence: `makeDockModel` and the views are package-private
(ADR-QD-099), so it is not compiled, as BEH-QD-465's is not.

Pinned by `packages/devtools/test/model/GatesFeed.test.ts` (G31 a registry change is published at once with the registry's own
array, and a quiet tick publishes nothing; G37 to G39 and G41 a registry that throws, on the build, on a notification the
registry swallows, on a tick and from `configure`; G38 and G45 a failure is the same failure by an error's name and message,
or by the rendering of a value that is not an error; G46 a thrown value that cannot be rendered is still stated; GP2 each
snapshot is the registry's own array and the last tick's answer), `packages/devtools/test/model/DockModel.test.ts` (M32 and
M32 b the gates and questions views; J1 to J8 the join of the three feeds; P2 each snapshot's rows are the questions and guards
of one moment) and `packages/devtools/test/model/Gates.test.ts` (`joinQuestions`: the panel's rows, decided once, a failed
registry read and a failed questions read). Specified in ADR-QD-162 (CCR-QD-440, D-08, D-10, D-14) and ADR-QD-169
(CCR-QD-447, D-06).

## BEH-QD-584: The gate registry is a model input, subscribed for the model's scope

> **Decision:** [ADR-QD-162](../decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-343](../invariants.md#inv-qd-343-a-questions-snapshot-pairs-each-asked-question-with-the-guards-asking-it-at-one-moment)
>
> **Amended 2026-11-18 (CCR-QD-447).** The subscription, its release and its failure state are the gates feed's, built in the
> model's scope ([BEH-QD-616](#beh-qd-616-one-feed-owns-the-gate-watch-and-the-questions-input)); every rule below holds of the
> feed as it did of the model, and the Pinned-by paragraph names the feed's cases.

```ts
export interface GateRegistryLike {
  readonly instances: () => ReadonlyArray<GateInstanceLike>;
  readonly subscribe: (listener: () => void) => () => void;
}
// DockModelInputs gains
readonly gates?: GateRegistryLike | undefined;
```

`GateRegistryLike` is structural, and `@qadi/react`'s `GateRegistry` satisfies it without devtools importing it
(ADR-QD-053). A registry holds who is asking and what each guard rendered, never a verdict (ADR-QD-080).

```
REQUIREMENT: The model's gates feed MUST subscribe to the registry in the model's scope and
             MUST release the subscription with a finalizer on that scope; nothing MUST be
             delivered to the model after close.
```

```
REQUIREMENT: `configure` with a different registry MUST release the old subscription,
             subscribe to the new registry and re-join at once, before it re-merges the
             reading, so that one `configure` publishes one snapshot and reads no registry
             the host has handed away; with the same registry, after a watch that worked,
             it MUST NOT subscribe again.
```

```
REQUIREMENT: With no registry the model MUST subscribe to nothing and the gates view MUST
             be `Absent`.
```

```
REQUIREMENT: A registry whose `subscribe` throws MUST be stated as the `Failed` gates view
             too, and a later `configure` MUST subscribe again and recover it, with the same
             registry once its `subscribe` works or with another registry that subscribes;
             after close the model MUST read no registry and subscribe to none.
```

```
REQUIREMENT: An unsubscribe that throws MUST NOT be stated as the `Failed` gates view, which
             would outlast the swap for a registry the model no longer reads, and MUST NOT
             stop `configure` from subscribing to the new registry and re-joining; it MUST be
             called once, not again by a later `configure` or on close, and a close that
             meets one MUST NOT throw. A thrown value that cannot be rendered MUST be stated
             as a fixed sentence, and MUST NOT throw out of the model.
```

Instrumentation off means absent (AGENTS.md §13): a dock handed no registry renders and subscribes to nothing. A registry
that throws is stated, not caught silently and not left uncaught: `@qadi/react`'s own registry swallows a listener's throw, so an
uncaught one froze the panel with nothing said (ADR-QD-162, decision 5). The panel says it under `qadi-gates-failed`, with the
reason, and its rows keep the question and say nothing about who is asking. A registry that mends without announcing it stays `Failed` until the registry announces, a feed tick whose questions changed
joins them, or a `configure` reads it, since a quiet tick reads nothing. A hide and a show of the dock rebuilds the model,
and with it the subscription.

Pinned by `packages/devtools/test/model/GatesFeed.test.ts` (G33 the registry subscription lives as long as the feed's scope,
follows a new registry and never outlives close; G35 and G36 a closed feed subscribes to nothing and reads nothing; G40 a
registry whose `subscribe` throws is stated and a working one replaces it; G42 and G42 b an unsubscribe that throws is not
stated, applies the new registry in full and is called once, on a swap and on close; G43 a `subscribe` that threw is tried
again by a `configure` with the same registry, and the same failure thrown afresh publishes nothing; G44 a registry that
mends without announcing stays `Failed` until something reads it; G45 a thrown string or object is compared by what it
renders as; G46 a thrown value that cannot be rendered is stated all the same; G47 one `configure` publishes one snapshot
and reads no registry the host handed away), `packages/devtools/test/model/DockModel.test.ts` (M36 a model whose scope closed
reads no registry a later configure hands it; M47 one `configure` publishes one snapshot, through the model) and `packages/devtools/test/react/DevtoolsDock.test.tsx` (the
gate registry lives as long as the dock: one subscription under StrictMode, one moved to a swapped registry, none when
handed no registry; a registry that throws is stated and mounts without throwing) and
`packages/devtools/test/react/QuestionsPanel.gates.test.tsx` (a registry that could not be read). Specified in ADR-QD-162 (CCR-QD-440, D-08, D-10, D-11) and ADR-QD-169 (CCR-QD-447, D-06).

## BEH-QD-585: The dock takes the registry, and the feed hands it over

> **Decision:** [ADR-QD-162](../decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) ·
> **Scope:** [ADR-QD-053](../decisions/053-a-gate-can-be-found.md)
>
> **Amended 2026-11-18 (CCR-QD-447).** The feed hands `questions` beside `gates`, so `<DevtoolsDock {...feed} />` wires both
> ([BEH-QD-620](#beh-qd-620-the-devtools-feed-hands-the-questions-beside-the-gates)).

```
REQUIREMENT: `DevtoolsDockProps.gates` MUST be a `GateRegistryLike`, with no array form.
```

The prop used to take `ReadonlyArray<GateInstanceLike>` and a host re-rendered on every guard change to feed it. A host now
hands over the registry once and the dock subscribes (BEH-QD-584); `useGateInstances` is unchanged for a component that
wants the list itself.

```
REQUIREMENT: `useDevtoolsFeed().gates` MUST be the provider's effective registry (its
             `gates` prop, else `atoms.gates`), so that `<DevtoolsDock {...feed} />` is
             unchanged.
```

```
REQUIREMENT: `@qadi/devtools` MUST take the registry structurally, with no dependency on
             `@qadi/react`.
```

One copy edit reaches the browser (D-12a, a user decision during the UI contract). The gates-absent message's advice read
"Pass gates — usually useGateInstances(), or atoms.gates.instances() — to list who is asking." and now reads "Pass gates —
usually atoms.gates, from @qadi/react — to list who is asking.", because the old advice no longer type-checks once `gates`
takes the registry. Every other string is byte-identical.

Pinned by `packages/react/test/DevtoolsFeed.test.tsx` (gates are the provider's effective registry: one per instrumented
guard, none otherwise), `packages/devtools/test/react/QuestionsPanel.gates.test.tsx` (the advice names `atoms.gates, from
@qadi/react`), `packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx` (twelve cells, the two literals
that carry the sentence), `packages/devtools/test/surface.tst.ts` (`GateRegistryLike` is the two methods react's registry
has, and no more) and `examples/nextjs-newsroom/test/dock-wiring.test.tsx` (the dock's gate registry). Specified in
ADR-QD-162 (CCR-QD-440, D-09, D-12a, D-18).

## BEH-QD-611: A port card is one model row, keyed by its wired service

> **Decision:** [ADR-QD-168](../decisions/168-a-port-card-is-a-model-row.md) ·
> **Scope:** [ADR-QD-162](../decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) ·
> **Invariant:** [INV-QD-355](../invariants.md#inv-qd-355-a-port-cards-readings-are-joined-by-portname-in-one-pure-model-function)

The Services panel used to pair the wiring report with the activity and the call log in its render. The pairing is now
made once, in the model, by one pure function.

```ts
export interface ServicesInput {
  readonly wiring: WiringRead;
  readonly activity: ReadonlyArray<PortActivity>;
  readonly portCalls: PortCallLog | undefined;
  readonly unsampled: boolean;
}
export type ServicesView = Data.TaggedEnum<{
  Withheld: {};
  NotHanded: {};
  Failed: { readonly reason: string };
  Read: { readonly rows: ReadonlyArray<PortCardRow>; readonly cache: string };
}>;
export const portCards: (input: ServicesInput) => ServicesView;
```

```
REQUIREMENT: `portCards` MUST return the Services screen as one `ServicesView`:
             `Withheld` while no layer is handed and no sample was taken,
             `NotHanded` once a sample found no layer, `Failed` with the reason
             the layer did not build, and `Read`. Each `Read` row MUST carry its
             state, its activity line, its consequence and tone, its
             `data-defaulted` value and its calls. A row that is not a registry
             port MUST take the not-a-port branch through `isPortName`, and no
             port MUST be compared as a string.
```

`Withheld` is a tag so that the panel never reads `unsampled` itself. The four wired services that are not ports
(`EvaluationId`, `CurrentSubject`, `DecisionCache` and `DecisionSink`) are rows of the same view; their activity line still
reads `never called` (or `no activity reading` while unsampled), as it always did, although no metric counts them. That is
kept byte-identical and left for a later phase.

Pinned by `packages/devtools/test/model/PortCards.test.ts` (the wiring states, the rows, the cache, `isPortName` and
`activityByPort`, the four rows that are not ports from the real wiring report) and `packages/devtools/test/model/PortCards.tst.ts`
(a misspelt port is a compile error in a `PortActivity` literal and in the per-port records). Specified in ADR-QD-168
(CCR-QD-446, D-01, D-02, D-07, D-08).

## BEH-QD-612: A card's wording is stated once, in the model

> **Decision:** [ADR-QD-168](../decisions/168-a-port-card-is-a-model-row.md) ·
> **Scope:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) ·
> **Invariant:** [INV-QD-356](../invariants.md#inv-qd-356-the-services-panel-computes-nothing)

```
REQUIREMENT: Every word a card prints MUST be written in `PortCards.ts` and printed
             unchanged by `ServicesPanel`: the state, the activity line and
             `no activity reading`, the consequence in its own voice (`if
             defaulted:` for a wired port), and the cache's `N completed entries`
             or `absent`. The fixed prose (the process-wide scope note, the cache
             card's sentences and the two notes) MUST stay in the view.
```

The line between the two is that a word the model chooses from the reading is a rule, and a sentence that is the same for
every reading is text. The panel's remaining code maps a tag to JSX and prints fields, through two hoisted exhaustive
matchers and a tone table keyed by the closed `CardTone`. Every word and `data-testid` is byte-identical to the base.

Pinned by `packages/devtools/test/react/ServicesPanel.characterisation.test.tsx` (sixteen cells, written on the phase base
before any source edit and never edited), `packages/devtools/test/model/PortCards.test.ts` and
`packages/devtools/test/react/ServicesPanel.test.tsx` (the tag-to-JSX mapping and the `data-testid`s). Specified in ADR-QD-168
(CCR-QD-446, D-04, D-09, D-13, D-14).

## BEH-QD-613: A card's recent calls are a closed union the panel prints

> **Decision:** [ADR-QD-168](../decisions/168-a-port-card-is-a-model-row.md) ·
> **Invariant:** [INV-QD-355](../invariants.md#inv-qd-355-a-port-cards-readings-are-joined-by-portname-in-one-pure-model-function)

```ts
export type CallsView = Data.TaggedEnum<{
  Hidden: {};
  Uncollected: {};
  Listed: { readonly calls: ReadonlyArray<CallRow>; readonly earlier: string | undefined };
}>;
export interface CallRow {
  readonly key: string;
  readonly text: string;
  readonly interpreter: string | undefined;
  readonly duration: string;
}
```

```
REQUIREMENT: A row's calls MUST be `Hidden`, `Uncollected` or `Listed`. `Listed` MUST
             hold the newest five calls, newest first, with `and N earlier` when
             more are held. Each call MUST carry its text (the reading table's
             sentence, plus ` · N attempts` only when it ran more than once), its
             interpreter label (`translation` for a translation's read, `served`
             for a read made to answer a remote asker, else none), its duration
             (`in flight` when unfinished, else the milliseconds to one decimal)
             and its React key.
```

`Hidden` covers both a collector that is not yet known (no `portCalls` while unsampled) and one that saw nothing for this
row, and `Uncollected` is the note that the detail needs `portCalls`, so the panel never inspects an empty list or the flag.
The key is the span, when the call started and the text, the value it had at the base. See also
[BEH-QD-573](#beh-qd-573-each-ports-consequence-and-call-reading-are-stated-once) and
[INV-QD-044](../invariants.md): a call row says whether a value came back and never what it was.

Pinned by `packages/devtools/test/model/PortCards.test.ts` (recent calls; the calls a row holds, by collection state) and the
characterisation. Specified in ADR-QD-168 (CCR-QD-446, D-02, D-10, D-11, D-12).

## BEH-QD-614: Port activity reads one entry per registry port

> **Decision:** [ADR-QD-168](../decisions/168-a-port-card-is-a-model-row.md) ·
> **Scope:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) ·
> **Invariant:** [INV-QD-355](../invariants.md#inv-qd-355-a-port-cards-readings-are-joined-by-portname-in-one-pure-model-function)

```
REQUIREMENT: `PortActivity.port` MUST be a `PortName`. `portActivity` MUST read each
             registry port's own name in the four port metrics, MUST report only
             the ports that were reached, in the registry's order, and MUST NOT
             report a word written to a metric outside the registry.
```

This is **Breaking** for `@qadi/devtools`, which exports `PortActivity`: a host that built one with a free-text `port` must
use a registry name. It also changes one behaviour of the base, which iterated the metrics' own string keys and so reported
a word the registry does not know. No card could show such a word, and a misspelt port is now a compile error in the type
and a word nothing reads at run time. The reached filter (issue #107) is kept.

Pinned by `packages/devtools/test/model/Wiring.test.ts` (a word written to a port metric outside the registry is not port
activity; the reached ports in the registry's order, whatever order they were reached in) and
`packages/devtools/test/model/PortCards.tst.ts`. Specified in ADR-QD-168 (CCR-QD-446, D-05, D-06, D-16).

## BEH-QD-615: The services store is one moment, and keeps its reference when nothing moved

> **Decision:** [ADR-QD-168](../decisions/168-a-port-card-is-a-model-row.md) ·
> **Scope:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) ·
> **Invariant:** [INV-QD-355](../invariants.md#inv-qd-355-a-port-cards-readings-are-joined-by-portname-in-one-pure-model-function)
>
> **Amended 2026-11-22 (ARCH-119, CCR-QD-464).** The requirement no longer says which store this is: the stores are listed once,
> in [BEH-QD-700](#beh-qd-700-the-dock-models-stores-are-listed-once), which says how a test of a built model holds the list. The four
> per-input cases (the hydration or the questions moving alone, then the wiring, the activity and the call log alone) are now one
> test of the store, which moves it once per key field.

```
REQUIREMENT: `DockModel.services` MUST be computed from one shown reading, and MUST keep
             its reference, notifying no subscriber, unless the wiring read, the
             activity, the call log or the unsampled flag changed identity.
```

As [BEH-QD-583](#beh-qd-583-the-questions-store-is-one-moment-and-keeps-its-reference-when-nothing-moved) does for the
questions, the join is made once and a poll that changed none of its four inputs notifies nothing. The rule is the identity of
the four inputs and not a promise about any one status transition. A feed that stops after it has sampled (`Live` to
`Stopped`) changes only its status and keeps the view. A feed switched on (`Off` to `Live`) passes through `Starting`, which
is unsampled, so the store notifies twice and ends on a new, structurally equal view, a re-render and not a change a card
shows.

Pinned by `packages/devtools/test/model/DockModel.test.ts` (M48 the first snapshot holds the port cards of the shown reading;
the services store moves once per key field: a new wiring, activity or call log alone, or the
`Starting` to `Live` flip, recomputes once, and only the hydration or the supplied questions moving keeps the reference; M53 the
`Starting` to `Live` flip recomputes with every input supplied; M54 a status change that leaves the sampled flag alone keeps
the view) and, for the rule that makes a store keep its reference, by the derived store's rules in
`packages/devtools/test/model/ExternalStore.test.ts`. Specified in ADR-QD-168 (CCR-QD-446, D-03).

## BEH-QD-616: One feed owns the gate watch and the questions input

> **Decision:** [ADR-QD-169](../decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-357](../invariants.md#inv-qd-357-one-feed-owns-the-gate-registry-its-subscription-its-failure-state-and-the-questions-input)
>
> **Amended 2026-11-22 (ARCH-119, CCR-QD-464).** The second requirement allowed the model a closed flag and a last
> join and now allows none: its join is a derived store ([BEH-QD-699](#beh-qd-699-the-dock-models-three-computed-stores-are-derived-stores)).

```
REQUIREMENT: The gates feed, built in the model's scope, MUST own the registry
             subscription, its guarded reads, its failure state and its release, and the
             questions input's reads. A closed feed MUST read and subscribe to nothing.
```

```
REQUIREMENT: `DockModel` MUST hold no gate-watch state; its join MUST be a derived store.
```

```
REQUIREMENT: One failure arriving by two paths (a throw read on a notification and the
             same throw read on a tick, say) MUST publish once.
```

```ts
export type RegistryRead = Data.TaggedEnum<{
  Unwatched: {};
  Read: { readonly instances: ReadonlyArray<GateInstanceLike> };
  Failed: { readonly reason: string };
}>;
export type AskedRead = Data.TaggedEnum<{
  Unhanded: {};
  Read: { readonly questions: ReadonlyArray<AskedQuestionLike> };
  Failed: { readonly reason: string };
}>;
export interface GatesSnapshot {
  readonly registry: RegistryRead;
  readonly asked: AskedRead;
}
```

> Package-private (ADR-QD-099), like the model: a host reaches the feed through `DevtoolsDock`.

The registry watch used to live in the model as eight mutable bindings, and the questions thunk was sampled by the diagnostics
poll. Both are host code and both can throw, so one module holds both with one policy: a throw is a statement in the snapshot
and never a stop. Two failures are the same failure by a key, an error's name and message, because one throw renders a
different stack from each call path ([BEH-QD-583](#beh-qd-583-the-questions-store-is-one-moment-and-keeps-its-reference-when-nothing-moved)).
The registry rules ([BEH-QD-584](#beh-qd-584-the-gate-registry-is-a-model-input-subscribed-for-the-models-scope)) moved with the
code and changed in no word.

Pinned by `packages/devtools/test/model/GatesFeed.test.ts` (the G cases, T1 to T7 and GP2).
Specified in ADR-QD-169 (CCR-QD-447, D-01, D-02, D-03).

## BEH-QD-617: The questions are a dock input, read on the diagnostics cadence

> **Decision:** [ADR-QD-169](../decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md) ·
> **Invariant:** [INV-QD-357](../invariants.md#inv-qd-357-one-feed-owns-the-gate-registry-its-subscription-its-failure-state-and-the-questions-input)

```
REQUIREMENT: `questions` MUST be a dock input beside `gates` (`DockModelInputs.questions`,
             `DevtoolsDockProps.questions`) and MUST NOT be a diagnostics option; the poll
             MUST take no questions thunk.
```

```
REQUIREMENT: The thunk MUST be read when the model is built, on `configure` with a new
             thunk, and every `diagnostics.intervalMillis` (else
             `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`). An answer `Equal.equals` to the last
             MUST publish nothing.
```

`asked()` returns a fresh array on every call and has no change signal, so the answers are compared by value and the first tick
after a start is one interval away, the build and each new thunk having read it themselves. This is **Breaking** for
`@qadi/devtools`: a host that wrote `diagnostics={{ ..., questions }}` gets a compile error and hands `questions` beside
`gates`. `Diagnostics.questions` and `DiagnosticsReading.questions` stay, carried only by a supplied reading.

Pinned by `packages/devtools/test/model/GatesFeed.test.ts` (T4 a new thunk is read at once and restarts the cadence, no thunk
stops it; T5 the cadence follows `intervalMillis`; T6 a fresh array of equal questions keeps its reference),
`packages/devtools/test/model/DockModel.test.ts` (J3 a questions input with no diagnostics is read at once; J6
`diagnostics.intervalMillis` paces it) and `packages/devtools/test/model/DiagnosticsStore.tst.ts` (the poll takes no thunk).
Specified in ADR-QD-169 (CCR-QD-447, D-04).

## BEH-QD-618: A questions input that throws is stated, and the poll keeps running

> **Decision:** [ADR-QD-169](../decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md) ·
> **Invariant:** [INV-QD-358](../invariants.md#inv-qd-358-the-questions-panels-two-host-inputs-fail-the-same-way-and-neither-stops-the-diagnostics-poll)

```
REQUIREMENT: A questions input that throws MUST be stated as `QuestionsView.Failed { reason }`,
             which the panel renders under `qadi-questions-failed` as "The questions handed
             to the dock threw, so what has been asked cannot be shown: " and the reason,
             with no rows.
```

```
REQUIREMENT: A questions input that throws MUST NOT end, stop or restart the diagnostics
             poll. A thrown value that cannot be described MUST be stated as a fixed
             sentence, and a later answer MUST mend the failure.
```

On the base a throwing thunk was a defect in the poll's sample, which ended the whole poll and froze wiring, activity and calls
on every tab, while a throwing registry was only `GatesView.Failed`. The two inputs now fail the same way and independently:
a failed questions read leaves the registry's view alone, and the reverse. See also
[BEH-QD-507](#beh-qd-507-a-defect-stops-the-poll-visibly-and-a-restart-resumes-it).

Pinned by `packages/devtools/test/model/GatesFeed.test.ts` (T1 a thunk that throws is stated and the cadence keeps reading it;
T2 one failure is published once and an answer mends it; T3 an answer that throws when compared is stated),
`packages/devtools/test/model/DockModel.test.ts` (J2 a throwing input is `Failed` while the poll stays `Live`; J4 a `Starting`
poll withholds the rows but states the failure), `packages/devtools/test/react/QuestionsPanel.thunk.test.tsx` (Q1 to Q5) and
`packages/devtools/test/model/Gates.test.ts`. Specified in ADR-QD-169 (CCR-QD-447, D-01, D-06, D-13).

## BEH-QD-619: The questions store joins three readings, and reads no host code

> **Decision:** [ADR-QD-169](../decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md) ·
> **Scope:** [ADR-QD-162](../decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) ·
> **Invariant:** [INV-QD-357](../invariants.md#inv-qd-357-one-feed-owns-the-gate-registry-its-subscription-its-failure-state-and-the-questions-input)

```
REQUIREMENT: `DockModel.questions` MUST be joined, purely, from the feed's snapshot, the
             supplied reading's questions and the poll's status, on the build and whenever
             one of the three changes identity, and its listeners MUST be registered
             before any host listener.
```

```
REQUIREMENT: A supplied question list MUST win over the thunk, and the thunk's failure MUST
             then not be stated. One `configure` MUST publish one snapshot.
```

The join reads no host code: the feed has already read it and stated any throw. One read went away (D-04 as amended): a
diagnostics publish that changes no question no longer re-reads the registry. The feed reads it on its own notification, on
`configure` and on a tick whose questions changed, because the registry announces its own changes and a quiet tick reads
nothing. See also [BEH-QD-583](#beh-qd-583-the-questions-store-is-one-moment-and-keeps-its-reference-when-nothing-moved).

Pinned by `packages/devtools/test/model/DockModel.test.ts` (J1 the join moves first, so a host listener reads a joined
snapshot; J5 a supplied list wins; J7 a failed registry still reaches the rows, as no claim; J8 one `configure` that moves
the registry, the thunk and the reading publishes one join; M32, M34, M47 and P2). Specified in ADR-QD-169 (CCR-QD-447, D-04,
D-07, D-08).

## BEH-QD-620: The devtools feed hands the questions beside the gates

> **Decision:** [ADR-QD-169](../decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md) ·
> **Scope:** [ADR-QD-053](../decisions/053-a-gate-can-be-found.md) ·
> **Invariant:** [INV-QD-357](../invariants.md#inv-qd-357-one-feed-owns-the-gate-registry-its-subscription-its-failure-state-and-the-questions-input)

```
REQUIREMENT: `useDevtoolsFeed().questions` MUST be `atoms.asked`, beside `gates` and
             `onInvalidate`, and `diagnostics` MUST be `extra` plus `layer`.
```

```
REQUIREMENT: Setting `layer` or `questions` in `extra` MUST be a compile error, so
             `<DevtoolsDock {...feed} />` hands `questions` to the prop the dock reads.
```

This is **Breaking** for `@qadi/react`: `questions` moved from `diagnostics` to the top level of the feed. A host that spreads the
feed into the dock changes nothing; a host that read `feed.diagnostics.questions` reads `feed.questions`
([BEH-QD-327](./09-react.md#beh-qd-327-a-devtools-feed-reads-the-providers-own-runtime)).

Pinned by `packages/react/test/DevtoolsFeed.test.tsx`, `packages/react/test/DevtoolsFeed.tst.ts` and
`examples/nextjs-newsroom/test/dock-wiring.test.tsx` (the dock reads the feed's questions).
Specified in ADR-QD-169 (CCR-QD-447, D-02, D-05).

## BEH-QD-636: The timeline feed is the root's timeline interface

> **Decision:** [ADR-QD-173](../decisions/173-the-devtools-headless-interface-is-its-feeds.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-365](../invariants.md#inv-qd-365-every-read-the-dock-runs-is-reachable-headless-and-none-the-root-exports-goes-unwatched)

```ts
export const makeTimelineFeed: (inputs?: TimelineFeedInputs) => Effect<TimelineFeed, never, Scope>;
export interface TimelineFeed {
  readonly timeline: TimelineStore;
  readonly status: TimelineStatusReadout;
  readonly configure: (inputs: TimelineFeedInputs) => void;
}
```

```
REQUIREMENT: `makeTimelineFeed(inputs?)` MUST build the feed in the caller's scope and return
             `{ timeline, status, configure }`. Closing the scope MUST end the read, and a close
             MUST NOT be a `Stopped`.
REQUIREMENT: A feed given no source MUST be a hand-fed timeline: the read is empty and ends at once,
             and `timeline.accept` feeds it.
REQUIREMENT: `configure` MUST replace the whole input set, so an omitted source reads as `undefined` and an
             omitted capacity as `DEFAULT_TIMELINE_CAPACITY`.
REQUIREMENT: `configure` on a feed whose scope has closed MUST read nothing and publish nothing, as `restart` does.
```

> **Amended 2026-11-24 (ARCH-125, CCR-QD-470).** An omitted capacity reads as `DEFAULT_TIMELINE_CAPACITY` and is compared by
> the bound it means, so `configure` changes the bound only when the store holds another. `timeline` is the one store the
> read feeds, for the feed's life
> ([BEH-QD-727](#beh-qd-727-a-timeline-feed-holds-one-store-for-its-life)), and a capacity the timeline refuses changes
> nothing ([BEH-QD-728](#beh-qd-728-a-capacity-the-timeline-refuses-changes-nothing-in-configure)).
>
> **Amended 2026-11-19 (Phase 60 review, WR-02).** `configure` after the scope closed re-read nothing but emptied the
> timeline on a resize and published `Reading` over a `Stopped` status. It now returns at once, like the diagnostics and gates
> feeds' `configure`.

`status` is `Reading` or `Stopped { reason }`. A source an earlier call set and a later `configure` omits reads as
`undefined`, and a capacity as `DEFAULT_TIMELINE_CAPACITY`, so `configure({ source })` after a capacity was set changes the
bound only when the store holds another: then the timeline empties and the source is read again. A headless caller, unlike `useTimeline`, calls `configure` by hand, so it hands the whole set each time.

Pinned by `packages/devtools/test/model/TimelineFeed.test.ts`, through the root (TF6, TF19, TF24).

## BEH-QD-637: The diagnostics feed is the root's poll, and its stop is stated

> **Decision:** [ADR-QD-173](../decisions/173-the-devtools-headless-interface-is-its-feeds.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-365](../invariants.md#inv-qd-365-every-read-the-dock-runs-is-reachable-headless-and-none-the-root-exports-goes-unwatched)

```ts
export const makeDiagnosticsFeed: (
  options?: DiagnosticsOptions,
) => Effect<DiagnosticsFeed, never, Scope>;
export interface DiagnosticsFeed {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => DiagnosticsSnapshot;
  readonly restart: () => void;
  readonly configure: (options: DiagnosticsOptions | undefined) => void;
}
export interface DiagnosticsSnapshot {
  readonly status: DiagnosticsStatus;
  readonly reading: Diagnostics;
}
```

```
REQUIREMENT: The feed MUST only fork the poll in the caller's scope. Closing the scope, or an
             interruption, MUST NOT be a `Stopped`.
REQUIREMENT: The status MUST be `Off | Starting | Live | Stopped { reason, sampled }`, and a run
             that ends on a defect MUST be stated as `Stopped`.
REQUIREMENT: An unchanged `intervalMillis` MUST restart nothing and notify nothing; a changed one
             MUST restart the poll once.
REQUIREMENT: `configure(undefined)` on an off feed MUST change and notify nothing.
REQUIREMENT: `Stopped.reason` is `causeMessage`'s text of the cause, a `Cause.pretty` trace
             whenever one renders, which MUST NOT cross a trust boundary (D-17): it names
             stack frames and layer internals, so a shell forwards it to a browser, a shared
             log or a client response only after redacting it.
```

Amended 2026-11-22 (ARCH-116, CCR-QD-461): the timeline feed, the diagnostics feed, the
diagnostics store's wiring read, the explorer's exits and the gates feed render a cause
through `causeMessage`, so a run that dies with a value `Cause.pretty` cannot render is
still stated, with the placeholder, where it used to leave the panel on its last reading
([INV-QD-384](../invariants.md#inv-qd-384-no-shipped-code-renders-a-cause-to-text-through-a-call-that-can-throw)).

The poll takes one sample per interval through the `sampleOnce` fence of
[BEH-QD-323](#beh-qd-323-diagnostics-are-sampled-by-the-model-and-a-sample-that-changed-nothing-changes-nothing): a
sample that changed nothing changes nothing. This is the loop the README once claimed `runDiagnostics` was without React; it
was not, because the runner lacked the stop detection amendment 1.13 of
[ADR-QD-047](../decisions/047-a-headless-devtools-model.md) added.

Pinned by `packages/devtools/test/model/DiagnosticsFeed.test.ts`, through the root (F12, F13, F15, F17, F24, F26).

## BEH-QD-638: The gates feed is the root's gate watch

> **Decision:** [ADR-QD-173](../decisions/173-the-devtools-headless-interface-is-its-feeds.md) ·
> **Scope:** [ADR-QD-169](../decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md) ·
> **Invariant:** [INV-QD-365](../invariants.md#inv-qd-365-every-read-the-dock-runs-is-reachable-headless-and-none-the-root-exports-goes-unwatched)

```ts
export const makeGatesFeed: (inputs?: GatesFeedInputs) => Effect<GatesFeed, never, Scope>;
export interface GatesFeed {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => GatesSnapshot;
  readonly configure: (next: GatesFeedInputs) => void;
}
export interface GatesSnapshot {
  readonly registry: RegistryRead;
  readonly asked: AskedRead;
}
```

```
REQUIREMENT: The feed MUST be built in the caller's scope, and its snapshot MUST be
             `{ registry: RegistryRead, asked: AskedRead }`, both halves in one value.
REQUIREMENT: Nothing the host throws from the registry (`instances`, `subscribe`, the release
             handle) or the questions thunk MUST leave the feed. A throw from `instances`,
             `subscribe` or the thunk is a `Failed { reason }` in the snapshot; a release that
             throws is swallowed and not stated (BEH-QD-584). A listener given to the feed's own
             `subscribe` is the caller's: what it throws MUST NOT stop the feed's other listeners,
             and MUST be rethrown as BEH-QD-656 states (amended 2026-11-19, review iterations 2
             and 3, and 2026-11-20).
```

> **Amended 2026-11-20 (ARCH-111, CCR-QD-455).** A throw from a listener given to the feed's own `subscribe` no longer
> stops the others: every listener is called, and what they threw is rethrown afterwards, one value as itself and
> several as one `AggregateError` ([BEH-QD-656](#beh-qd-656-a-throwing-listener-does-not-silence-the-others),
> [ADR-QD-177](../decisions/177-one-throwing-listener-cannot-silence-the-rest.md)).

This restates [BEH-QD-616](#beh-qd-616-one-feed-owns-the-gate-watch-and-the-questions-input) and
[BEH-QD-618](#beh-qd-618-a-questions-input-that-throws-is-stated-and-the-poll-keeps-running) for a
headless caller, who now builds the feed the dock model builds.

Pinned by `packages/devtools/test/model/GatesFeed.test.ts`, through the root.

## BEH-QD-639: One option shape configures the poll

> **Decision:** [ADR-QD-173](../decisions/173-the-devtools-headless-interface-is-its-feeds.md) ·
> **Invariant:** [INV-QD-366](../invariants.md#inv-qd-366-the-diagnostics-poll-has-one-option-shape-read-without-translation)

```ts
export interface DiagnosticsOptions {
  readonly layer?: Layer.Layer<never, unknown> | undefined;
  readonly collector?: PortCallCollector | undefined;
  readonly intervalMillis?: number | undefined;
}
```

```
REQUIREMENT: `makeDiagnosticsFeed`, `useDiagnostics`, `DevtoolsDock`'s `diagnostics` prop and the
             dock model's input MUST take `DiagnosticsOptions` unchanged, and `@qadi/devtools/react`
             MUST re-export the root's.
REQUIREMENT: `DiagnosticsOptions` MUST NOT be generic and MUST NOT carry `schedule`, and a layer with
             an unmet requirement MUST be refused at compile time.
REQUIREMENT: `DiagnosticsDockOptions` MUST NOT exist.
```

This is **Breaking** for `@qadi/devtools`: `<ROut, E>`, `schedule` and the `DiagnosticsDockOptions` name each become a
compile error. `schedule` goes because the feed restarts its poll when the interval changes, and a restart needs a value it
can compare.

Pinned by `packages/devtools/test/model/DiagnosticsStore.tst.ts`, `packages/devtools/test/surface.tst.ts` and
`packages/devtools/test/model/DiagnosticsStore.test.ts` (the interval override).

## BEH-QD-640: The runners are the feeds' engines, not the interface

> **Decision:** [ADR-QD-173](../decisions/173-the-devtools-headless-interface-is-its-feeds.md) ·
> **Scope:** [ADR-QD-099](../decisions/099-entry-points-are-a-closed-list.md) ·
> **Invariant:** [INV-QD-365](../invariants.md#inv-qd-365-every-read-the-dock-runs-is-reachable-headless-and-none-the-root-exports-goes-unwatched)

```
REQUIREMENT: `makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`,
             `noDiagnostics` and the `DiagnosticsStore` type MUST NOT be importable from
             `@qadi/devtools` or `@qadi/devtools/react`.
```

Their modules stay, package-private, because the feeds are built on them. Adding a root name is one barrel line, one row in
`spec/overview.md` and one line in `test/surface.test.ts`, which gate 13 (`check-api-surface.mjs`) checks in both
directions.

Pinned by `packages/devtools/test/surface.test.ts`, `packages/devtools/test/surface.tst.ts` and
gate 14 (`check-package-install.mjs`), whose consumer builds a `makeTimelineFeed` from the packed root.

## BEH-QD-656: A throwing listener does not silence the others

> **Decision:** [ADR-QD-177](../decisions/177-one-throwing-listener-cannot-silence-the-rest.md) ·
> **Scope:** [ADR-QD-173](../decisions/173-the-devtools-headless-interface-is-its-feeds.md) ·
> **Invariant:** [INV-QD-373](../invariants.md#inv-qd-373-every-listener-is-called-and-what-one-throws-is-never-swallowed)
>
> **Amended 2026-11-22 (ARCH-119, CCR-QD-464).** A derived store is built on `makeExternalStore`, its refresh one listener in
> each parent's set, so it is among the stores this section covers
> ([BEH-QD-697](#beh-qd-697-a-derived-store-notifies-once-per-change-before-the-listeners-added-after-it)).

```
REQUIREMENT: A notification of a store `@qadi/devtools` builds on `makeExternalStore`, the
             timeline, diagnostics and gates feeds' and every derived store among them, MUST
             call every listener in subscription order, whether or not one before it threw.
REQUIREMENT: After the last listener, the notification MUST throw nothing when no listener
             threw; the thrown value itself when exactly one did, `undefined` and `null`
             included; and otherwise one `AggregateError` whose `errors` are the thrown values
             in call order and whose message is exactly
             "More than one of the store's listeners threw."
REQUIREMENT: An `AggregateError` a listener throws MUST be kept as one value, never flattened.
REQUIREMENT: A listener removed during a notification before its turn MUST NOT be called, and one
             added during it MUST be called in the same pass.
REQUIREMENT: The store MUST hold the new value before any listener runs, and keep it when one
             throws.
```

What a notification rethrows leaves through whatever published (`configure`, `restart`, a read, a tick or the host
registry's own notification), and the rest of that call does not run. The window between a feed's run `begin()` and
its `fork()` is out of scope: a throw on the `Reading` the timeline feed publishes over a `Stopped`, or on the
`Starting` the diagnostics feed publishes, still leaves before the new read or poll is forked, so the timeline says
`Reading` with nothing reading and the diagnostics feed stays `Starting` with no new poll; and a throw on a gates feed
tick ends its questions cadence. A throw on a publish from the diagnostics poll is stated as the poll's stop, and the
`Stopped` is held even when a listener throws on that publish too. A `configure` with a capacity other than the one the store holds publishes the
emptied timeline and then starts the read that refills it, from the same source or a new one: a throw on that publish
is rethrown once the read has started, so it stops no read, unless the timeline was `Stopped` and a status listener
throws on the `Reading` that read publishes, in the window above: that throw escapes instead, replaces the timeline
listener's, and no read is started.

Pinned by `packages/devtools/test/model/ExternalStore.test.ts`, and through the root by
`packages/devtools/test/model/TimelineFeed.test.ts` (TF25 to TF29),
`packages/devtools/test/model/DiagnosticsFeed.test.ts` (F30 to F32) and
`packages/devtools/test/model/GatesFeed.test.ts` (G48).

## BEH-QD-692: A throwing reporter is named by the option the caller passed

> **Invariant:** [INV-QD-387](../invariants.md#inv-qd-387-every-developer-signal-has-exactly-one-row-and-a-throwing-reporter-is-named-by-the-option-the-caller-passed), [INV-QD-251](../invariants.md#inv-qd-251-a-supplied-reporter-cannot-change-a-hydration-outcome)
> **See:** [ADR-QD-184](../decisions/184-developer-signal-reporters-are-resolved-through-one-table.md)

```
REQUIREMENT: A reporter passed to `makeGateRegistry` as `onIdCollision` that throws MUST
             be announced as `ReporterThrew` naming `onIdCollision`, and one passed to
             `makeQadiAtoms` as `onGateIdCollision` that throws MUST be announced naming
             `onGateIdCollision`, each once, in every environment, with the registry's
             entries kept.
```

The atom set resolves its own reporter under its own option and hands the registry one
already resolved, so each entry point names the option its caller passed and no throw is
contained twice. A direct `makeGateRegistry` caller whose reporter threw used to be told
about `onGateIdCollision`, an option it never passed.

Pinned by `packages/react/test/GateRegistry.store.test.ts` ("a throwing collision
reporter is named by the option it was passed through": a throwing `onIdCollision` on
`makeGateRegistry` and a throwing `onGateIdCollision` on `makeQadiAtoms`, each in
development and in production, with both ids still listed) and the characterisation
`packages/react/test/DeveloperSignalReporters.test.tsx`.

## BEH-QD-696: A derived store recomputes exactly when a field of its key changes identity

> **Decision:** [ADR-QD-185](../decisions/185-the-dock-models-computed-stores-are-derived-stores.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-389](../invariants.md#inv-qd-389-a-derived-store-recomputes-exactly-when-its-key-changes-and-does-nothing-after-its-scope-closes)

```
REQUIREMENT: A derived store (`makeDerivedStore`, `@qadi/devtools`'s package-private store
             computed from parent stores) MUST compute once when it is built and notify no
             listener; on each notification of a parent and each `refresh` it MUST read its
             key and recompute exactly when some own enumerable string-keyed field of either
             key differs by identity or is present on one side only.
```

```
REQUIREMENT: A key type with an optional field, an empty parent list and a compute that
             reads a field outside its key MUST each be a compile error.
```

A key is a record of the inputs a compute reads, and the store compares the two records field by field with one
comparison over their own enumerable string-keyed fields. A field that holds `undefined` on one side and is absent on the
other is a change, so a key that loses or gains a field recomputes. A field that is inherited, non-enumerable or
symbol-keyed is not part of the key and is not compared: a key whose only such field differs recomputes nothing, and a key
with an inherited enumerable field is equal to itself. The key is a thunk read on every trigger and not a value held at
construction, so a trigger that arrives after an input was assigned sees it: one `configure` that moves several inputs
publishes one recompute. A refresh serves a key input that is no parent.

Pinned by `packages/devtools/test/model/ExternalStore.test.ts`, `describe("makeDerivedStore")` ("the first compute runs at
construction and notifies no listener", "each field of a three-field key moved alone recomputes and notifies once", "a
one-field and a five-field key each recompute once when one field moves", "an unchanged key calls neither the compute nor
any listener", "a repeat trigger after a change calls neither the compute nor a listener", "a key that loses a field
holding undefined counts as changed", "a key that gains a field counts as changed", "a key that swaps a field for another
holding undefined counts as changed", "a key with an inherited enumerable field compares equal to itself", "a key differing
only in an inherited, non-enumerable or symbol-keyed field is equal" and "refresh recomputes once for a key input that is not
a parent"), and the three refusals by `packages/devtools/test/model/ExternalStore.tst.ts`. Specified in
ADR-QD-185 (CCR-QD-464).

## BEH-QD-697: A derived store notifies once per change, before the listeners added after it

> **Decision:** [ADR-QD-185](../decisions/185-the-dock-models-computed-stores-are-derived-stores.md) ·
> **Scope:** [ADR-QD-177](../decisions/177-one-throwing-listener-cannot-silence-the-rest.md) ·
> **Invariant:** [INV-QD-389](../invariants.md#inv-qd-389-a-derived-store-recomputes-exactly-when-its-key-changes-and-does-nothing-after-its-scope-closes)

```
REQUIREMENT: On a change of its key a derived store MUST compute, then commit the key, then
             set the value: a compute that throws MUST commit nothing and the next trigger
             MUST recompute; a compute that returns the held reference MUST notify nothing;
             a `refresh` from inside the store's own listener MUST notify once.
```

```
REQUIREMENT: A derived store MUST be subscribed to its parents in the order listed when it
             is built, so a listener added to a parent afterwards MUST hear the store's new
             value.
```

```
REQUIREMENT: The listeners of a derived store MUST follow
             [BEH-QD-656](#beh-qd-656-a-throwing-listener-does-not-silence-the-others), and
             what they throw MUST reach the parent's loop as one value.
```

A derived store is a store built on `makeExternalStore`, and its refresh is one listener in each parent's set, so a host
listener that throws silences neither the store's other listeners nor the parent's
([ADR-QD-177](../decisions/177-one-throwing-listener-cannot-silence-the-rest.md)). It commits the key only after its
compute returned, so a compute that failed leaves the previous key and the next trigger retries it.

Pinned by `packages/devtools/test/model/ExternalStore.test.ts`, `describe("makeDerivedStore")` ("a compute that returns the
held reference notifies nothing", "a throwing compute commits nothing and the next trigger recomputes", "a listener that
calls refresh during its notification hears it once", "a listener added to either parent after construction reads the new
value", "one throwing listener: the rest run and the parent rethrows that value" and "two throwing listeners: the rest run
and the parent rethrows one AggregateError"). Specified in ADR-QD-185 (CCR-QD-464).

## BEH-QD-698: A derived store does nothing after its scope closes

> **Decision:** [ADR-QD-185](../decisions/185-the-dock-models-computed-stores-are-derived-stores.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-389](../invariants.md#inv-qd-389-a-derived-store-recomputes-exactly-when-its-key-changes-and-does-nothing-after-its-scope-closes)

```
REQUIREMENT: After the scope that built a derived store closes, it MUST read no key, call no
             compute, release every parent, ignore `refresh` and keep its last snapshot.
REQUIREMENT: When a parent's `subscribe` throws while the store is being built, the build MUST
             fail with that throw as a defect and return no store, and closing the scope MUST
             release every parent subscribed before it.
REQUIREMENT: Closing the scope MUST release every parent even when a release throws, and MUST
             then fail the close with what was thrown: one value as itself, more than one as
             one `AggregateError` in release order.
```

The scope is the lifetime ([ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md)): a store
that kept reading after it would hold its parents and report a value for a model that no longer exists.

The finalizer is registered before the parents are subscribed, so a store that failed to build leaves nothing subscribed
once the scope closes. Until then every parent before the one that threw is still subscribed, and no store was returned.

A release that throws is not swallowed, as the gates feed swallows the release of a registry the host handed it
([BEH-QD-638](#beh-qd-638-the-gates-feed-is-the-roots-gate-watch)): every parent here is the package's own store, so a
release that throws is a defect in it, and the close is the place that can state it. The close runs every release and then
throws what they threw, the rule a store's listeners follow
([BEH-QD-656](#beh-qd-656-a-throwing-listener-does-not-silence-the-others)). A parent's `subscribe` must return a release
that cannot throw; every parent of the dock's three stores is an `ExternalStore`, whose release is a `Set` delete.

Pinned by `packages/devtools/test/model/ExternalStore.test.ts` ("after the scope closes nothing is read or computed and
each parent is released", "a parent whose subscribe throws leaves no earlier parent subscribed after close", "a release
that throws leaves no later parent subscribed and fails the close" and "two throwing releases fail the close with one
AggregateError holding both"). Specified in ADR-QD-185 (CCR-QD-464).

## BEH-QD-699: The dock model's three computed stores are derived stores

> **Decision:** [ADR-QD-185](../decisions/185-the-dock-models-computed-stores-are-derived-stores.md) ·
> **Scope:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) ·
> **Invariant:** [INV-QD-390](../invariants.md#inv-qd-390-the-dock-models-computed-stores-are-derived-stores-and-their-count-is-stated-once)

```
REQUIREMENT: The dock model's shown reading (its key: the diagnostics feed's snapshot and the
             supplied reading), `questions` (its key: the gates feed's snapshot, the supplied
             questions and whether the poll has not sampled) and `services` (its key: the
             wiring, the activity, the call log and whether the poll has not sampled) MUST be
             derived stores, built in that order.
```

```
REQUIREMENT: `configure` MUST refresh the shown reading after it configured both feeds, and a
             model whose scope closed MUST merge no reading a later `configure` hands it.
```

The key reads the model's inputs after `configure` assigns them, so one `configure` that moves the registry and the reading
publishes one join, and a model that was closed takes in nothing, as the two stores built on feeds already did.
`DockModel` itself holds no last key, no closed state and no subscription of its own for any of the three.

Pinned by `packages/devtools/test/model/DockModel.test.ts` ("the diagnostics store moves once per key field and not for
gates or questions", "the questions store moves once per key field", "the services store moves once per key field" and
"a model whose scope closed merges no reading a later configure hands it") and
`packages/devtools/test/model/DockModel.characterisation.test.ts`. Specified in ADR-QD-185 (CCR-QD-464).

## BEH-QD-726: A timeline store resizes itself and answers whether it did

> **Decision:** [ADR-QD-191](../decisions/191-a-timeline-store-owns-its-capacity.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-401](../invariants.md#inv-qd-401-a-capacity-the-timeline-refuses-changes-nothing)

```ts
export interface TimelineStore {
  readonly resize: (capacity: number) => boolean;
}
```

```
REQUIREMENT: `resize(capacity)` MUST build the new empty timeline through `emptyTimeline` before any
             field of the store moves, so a capacity the timeline refuses throws its error and
             leaves the timeline, a pause's frozen view and the subscribers untouched, with
             nothing published.
REQUIREMENT: The capacity the store already holds MUST answer `false`, publish nothing and keep the
             entries and a pause.
REQUIREMENT: Any other capacity MUST empty the timeline at the new bound, release a pause, publish
             once and answer `true`.
REQUIREMENT: What a listener throws on that publish MUST be rethrown after the change is made, as the
             store's listeners' throws always are.
REQUIREMENT: `clear` MUST empty the timeline at the capacity the store holds.
```

The store compares the number it is given with its timeline's own `capacity`, so a caller that omits a capacity and one
that passes `DEFAULT_TIMELINE_CAPACITY` ask for one bound. A resize publishes with `publish` and not `set`, so a second
subscription that reads `isPaused` hears a pause's release even where the emptied snapshot would compare equal to the
old one. `clear` takes the bound from the timeline and not from an option the store was built with, so a clear after a
resize keeps the bound it was resized to. A listener's throw leaves with whatever published, one value as itself and
several as one `AggregateError` ([BEH-QD-656](#beh-qd-656-a-throwing-listener-does-not-silence-the-others)).

Pinned by `packages/devtools/test/model/TimelineStore.test.ts` (the `resizing` describe, and "a clear after a resize
keeps the capacity it was resized to") and `packages/devtools/test/surface.tst.ts` ("a timeline store resizes itself and
answers whether it did"). Specified in ADR-QD-191 (CCR-QD-470).

## BEH-QD-727: A timeline feed holds one store for its life

> **Decision:** [ADR-QD-191](../decisions/191-a-timeline-store-owns-its-capacity.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-402](../invariants.md#inv-qd-402-a-timeline-feed-hands-its-host-one-store-for-its-life)

```
REQUIREMENT: `feed.timeline` MUST be the store the feed's read feeds, and the same object from the
             feed's build until its scope closes.
REQUIREMENT: A capacity change MUST be that store's `resize`, so a subscription taken before it hears
             the emptied timeline once; the feed MUST read its source again when the store resized
             or the source moved, and not otherwise.
REQUIREMENT: The idle timeline a hook returns before its feed exists MUST answer every `resize` with
             `false` and change nothing.
```

The feed builds one store at the effective capacity and returns it, with no second store fed by a listener and no
forwarder restating the store's members, so what a host holds cannot drift from what the read feeds. An omitted capacity
and `DEFAULT_TIMELINE_CAPACITY` are one bound, so moving between them keeps the timeline and reads nothing again. A
capacity change while paused releases the pause and shows the emptied live timeline. `idleTimeline` is inert: it is
never paused and never fed, so `accept`, `clear`, `resize` and `setPaused` do nothing.

Pinned by `packages/devtools/test/model/TimelineFeed.test.ts` (TF33, an omitted capacity and the default are one bound;
TF34, one object for the feed's life, so a listener added before two capacity changes hears each emptied timeline once;
TF35, a capacity change while paused releases the pause; TF36, the idle timeline answers any resize with `false`),
`packages/devtools/test/model/DockModel.test.ts` (M11) and `packages/devtools/test/react/TimelineLifetime.test.tsx` (L3,
a capacity change keeps the store and reads the source again into the new bound). Specified in ADR-QD-191 (CCR-QD-470).

## BEH-QD-728: A capacity the timeline refuses changes nothing in configure

> **Decision:** [ADR-QD-191](../decisions/191-a-timeline-store-owns-its-capacity.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-401](../invariants.md#inv-qd-401-a-capacity-the-timeline-refuses-changes-nothing)

```ts
// Package-private: the dock model and the timeline feed share it, and the root does not export it.
export function effectiveCapacity(capacity: number | undefined): number;
```

```
REQUIREMENT: The timeline feed's `configure` and the dock model's `configure` MUST check the capacity
             before any input moves. A capacity the timeline refuses MUST throw `emptyTimeline`'s
             error and leave the feed's inputs, its timeline, its read and a later `restart` as they
             were, and in the dock the catalogue spread and the roles, the ports, the gates feed and
             the diagnostics feed as well.
REQUIREMENT: A `configure` after a refused one MUST compare with the inputs the feed or the dock
             held, not with the ones the refused call carried.
REQUIREMENT: Past the check, what a timeline listener throws on the capacity change MUST be rethrown
             only after the feed has started its read, and after the dock has applied every other
             input of that `configure`.
```

The rule is stated once, in `emptyTimeline`: a non-negative integer, or its error. Both `configure`s reach it through
`effectiveCapacity`, which reads an omitted capacity as `DEFAULT_TIMELINE_CAPACITY` and returns the bound the number
means, so neither holds a check of its own and a refusal is told from a listener's throw by position, never by reading
the error. The feed's `configure` returns first for a feed whose scope has closed, as it did before the check; then the
check; then the inputs are assigned, `resize` is called in a `try`, and the read starts in the `finally` when the store
resized or the source moved. The dock's `configure` checks, assigns its inputs, calls the feed's `configure` in a `try`,
and in the `finally` applies the catalogue and the roles, the ports, the gates feed, the diagnostics feed and the shown
reading. Past the check the feed's `configure` throws only from a listener on a publish it has already made, so that
throw is rethrown once the rest is applied, as one throwing listener never silences the rest
([BEH-QD-656](#beh-qd-656-a-throwing-listener-does-not-silence-the-others)).

Pinned by `packages/devtools/test/model/TimelineFeed.test.ts` (TF27, TF30 and TF31: a listener that throws on a
capacity-only change stops no read, a refused capacity changes nothing so a later `configure` compares with the inputs
the feed held, and a `restart` after it reads the source the feed held) and
`packages/devtools/test/model/DockModel.test.ts` (M55, a refused capacity changes nothing in the dock, and M56, a
listener's throw is rethrown once the dock has applied the rest). Specified in ADR-QD-191 (CCR-QD-470).

## BEH-QD-730: The hand-fed timeline store follows its capacity option

> **Decision:** [ADR-QD-191](../decisions/191-a-timeline-store-owns-its-capacity.md) ·
> **Scope:** [ADR-QD-137](../decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md) ·
> **Invariant:** [INV-QD-401](../invariants.md#inv-qd-401-a-capacity-the-timeline-refuses-changes-nothing)

```
REQUIREMENT: `useTimelineStore` MUST build its store at its `capacity` option, or at
             `DEFAULT_TIMELINE_CAPACITY` when it is omitted, and keep that one store for its life.
REQUIREMENT: It MUST call the store's `resize` from a layout effect keyed on the store and the
             capacity, never during render, so a changed capacity empties the store at the new bound
             and releases a pause before the next paint.
REQUIREMENT: A re-render with the same capacity, or with none after none, MUST change nothing.
```

The hook's first run of that effect is a no-op, because the store was built at that bound. Its reading is the hand-fed one
([BEH-QD-519](#beh-qd-519-a-defect-stops-the-timeline-visibly-and-a-restart-resumes-it)): always `Reading`, with an inert
`restart`.

Pinned by `packages/devtools/test/react/useTimeline.test.tsx` (UT4, a changed capacity empties the hand-fed store at the
new bound and keeps the store; UT5, a re-render with the same capacity, or with none after none, keeps the hand-fed
entries). Specified in ADR-QD-191 (CCR-QD-470).
