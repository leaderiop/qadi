# Devtools 02 — Screens

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-DVT-02                                    |
> | Revision       | 0.5 (draft)                                    |
> | Effective Date | 2026-08-24                                     |
> | Status         | Draft — pending CCR                            |
> | Author         | Qadi Engineering                               |
> | Classification | Design Specification (draft)                   |
> | Change History | 0.5 (2026-08-24): Screens 3, 4, 6 and 7 built; three of the five remaining gaps had already closed in earlier increments and this document had not been told (CCR-QD-068)<br>0.4 (2026-08-24): Screens 1 and 2 built; their normative rules are BEH-QD-203–210 (CCR-QD-067)<br>0.3 (2026-08-24): Six gaps resolved in code rather than left recorded — depth, provenance, unknown-parent reporting, trace diff, per-decision cache outcome, cache flush (CCR-QD-061)<br>0.2 (2026-08-24): Audited against the code; four screens described capabilities that do not exist, each now marked **Gap** rather than left to be discovered during implementation (CCR-QD-060)<br>0.1 (2026-08-22): Initial draft from devtools design session |

---

**Screens 1, 2, 3, 4, 6 and 7 are built.** Only screen 5, the simulator, is not
— it *runs* evaluations rather than reading records, which is a different risk
class, and `@qadi/testing` still wires no clock.

A caution about the Gap notes below, learned by auditing them: **three of the
five recorded against screens 4, 6 and 7 had already closed** in increments that
never came back to mark it. `permissionProvenance` returns paths, four port
shapes carry `name?`, `PortMetrics` exists, `DecisionCache` has `size` and
`clear`, and `QadiAtoms.asked()` was built precisely so screen 7 could be keyed
by question. What was actually left was one gap shared by screens 3 and 4 —
nothing enumerated named policies or roles — and
[ADR-QD-048](../decisions/048-an-observed-catalogue.md) closes it by observing
the timeline rather than by adding a registry.

The normative rules for these screens are
[behaviour 28](../behaviors/28-devtools-screens.md); where this document and that
one disagree, that one wins.

Each screen below states what the library now supplies, and carries a **Gap**
note only where something genuinely remains. Six gaps recorded in revision 0.2
were closed in code rather than left as a backlog — see
[behaviour 25](../behaviors/25-inspection.md). What remains is listed honestly:
obligation discharge state, resolver-call recording, a policy registry, per-gate
enumeration, and cache TTL. See
[00-overview.md](./00-overview.md#feature-set-v1-by-what-its-data-plane-can-supply)
for the summary table.

## 1. Decision log

A single chronological table of records from every wired sink.

Columns: env badge (SRV/CLI) · subject · action · resource · verdict · duration ·
pair · evaluation id. Filters: free-text (subject/action/resource), env segment
(All/SRV/CLI), verdict segment (Any/Deny/Error). Header shows counts (decisions /
denies / errors) and live/paused state.

Rules:
- verdict tags: ALLOW = accent tint, DENY = solid dark, ERROR = outline — three
  visually distinct classes, never two;
- the **pair** column links rows sharing an evaluation id (`⇅ pair`,
  `⇅ hydrated`, `⇅ recheck`); the client half of a pair is tinted;
- row click opens the inspector on that evaluation.

**Built** — `DecisionLog` in `@qadi/devtools/react`, specified normatively by
[BEH-QD-205–207](../behaviors/27-devtools-timeline.md). One departure from the
design above, and it is deliberate: the pair badge reads *continued* /
*continues* / *differs* rather than *hydrated* / *recheck*. **Nothing in a
record says which half is which** — `environment` is a free-form label a sink
stamped — so the roles come from time instead, which is true of a hydrated
re-check, of replicas, and of anything else sharing an id.

A `DecisionRecord` supplies every column: `action` and `resource` were
`EvaluateOptions` inputs consumed and dropped before
[BEH-QD-183](../behaviors/24-decision-sink.md), and the wall-clock `at` did not
exist at all. The ERROR class is `outcome._tag === "Failed"`, which is
representable for the first time
([BEH-QD-184](../behaviors/24-decision-sink.md)). The env badge is stamped by the
sink, not by core.

## 2. Decision inspector

Header: env badge, `action · resource · subject`, verdict, evaluation id,
duration, span name (`qadi.evaluate`), and **Replay in simulator**.

Panels:
- **Explanation** — the tree from `explain()`
  ([ADR-QD-027](../decisions/027-policy-explanation.md)): ✓/✗ per node, combining
  algorithm named on combinators, short-circuited nodes dotted with "never
  resolved";
- **Visible fields** — fieldStrategy result; granted fields tinted, dropped
  fields struck through;
- **Obligations** — each obligation with discharged/pending state, and the
  reminder that enforcing calls refuse an undischarged allow
  ([ADR-QD-019](../decisions/019-obligations.md));
- **Trace** — resolver calls, cache hit/miss, history port touches.

**Built** — `Inspector` in `@qadi/devtools/react`, specified normatively by
[BEH-QD-208–209](../behaviors/27-devtools-timeline.md). The short-circuit
rendering is the load-bearing part: an unevaluated node reads *never resolved*
and never as a cross, and a trace truncated below the root reads *not disclosed*
rather than *never resolved* — the two are distinguishable because a composite
that short-circuits always evaluates its first child.

The Explanation panel works because a record carries its `Policy`. `explain()`
takes a `Policy` and a `Decision` carries only `trace.policyTag`, a string — so
before [BEH-QD-183](../behaviors/24-decision-sink.md) *the explanation of a
denial was unreachable from the denial*. Dotting short-circuited nodes needs the
policy zipped against the trace, which the same record makes possible.

> **Gap — obligations, narrowed.** `Obligation` is `{ id, attributes, advisory }`
> with no state field, and a handler receives the whole array and returns
> `void` — so per-duty state is not merely unimplemented, it is unobservable.
> The panel lists the duties, distinguishes advisory from binding, shows the
> **gate** outcome from an `ObligationRecord` when one has arrived, and says in
> words that per-duty state cannot be known. That is the honest version of this
> panel and it is what shipped.

**Cache hit/miss is now per decision.** A `DecisionRecord` carries `cache`:
`"hit"`, `"coalesced"`, `"miss"`, or absent when no cache was consulted at all
([BEH-QD-189](../behaviors/25-inspection.md)). It was a process-global frequency
shared by every cache in the process.

> **Gap — resolver calls and history touches.** `readAttribute` is a plain
> function, not an `Effect.fn`, so it has no span and nothing records that an
> attribute was resolved. `qadi.acted` and `qadi.hasRelationship` are spans
> carrying no attributes, so a consumer sees that one happened and how long it
> took, not for whom or what it returned. Closing this means annotating those
> spans, which is evaluator-adjacent work with its own review.

## 3. Policy explorer

Left rail: named policies. Main: the ADT rendered as a tree (combining algorithm
and maxDepth on the root), with a Tree/JSON toggle — the JSON view is the real
codec round-trip (`toJson`/`fromJson`, BEH series 08); pasting JSON loads a
policy. **Simplify** runs
[ADR-QD-030](../decisions/030-policy-simplification.md) simplification as an
explicit action (never automatic) and previews rewrites before applying.

**Closed — the rail is observed.** Every `DecisionRecord` carries the `Policy` it
evaluated, so the policies an application uses are already in the log;
`policiesSeen` groups them by `Equal.equals` and counts their verdicts. An
optional `catalogue` prop adds names and the policies that have not run. No
registry, no registration call sites (ADR-QD-048, BEH-QD-211).

> **Correction — the Simplify example.** Revision 0.1 illustrated this with
> `not(not(x)) → x`, which is **the one rewrite `simplify` refuses**:
> `Simplify.ts` documents "double negation is NOT eliminated, and that is a
> finding rather than an omission". It does exactly two things — single-child
> composite collapse, and same-tag/same-strategy flattening. The preview must
> show those.

**Depth is now measurable.** `policyDepth(policy)` counts the way the evaluator
counts, so `policyDepth(p) <= n` is exactly the condition under which
`evaluate(p, { maxDepth: n })` will not raise
([BEH-QD-191](../behaviors/25-inspection.md), INV-QD-037). The root card shows the
policy's own depth beside the bound it would be evaluated under.

## 4. Role DAG viewer

The role graph drawn top-down (acyclic by construction,
[ADR-QD-015](../decisions/015-role-dag-acyclic-by-construction.md); the UI still
surfaces the cycle-check result). Clicking a node shows its **flattened
permission set** with provenance: own permissions tinted, inherited ones gray
with the path ("via viewer").

**Provenance is now available.** `permissionProvenance(role)` returns each
permission with the role that granted it and the path walked to reach it, so
"own" is a single-element path and anything longer reads as "via …"
([BEH-QD-192](../behaviors/25-inspection.md)). It reports exactly the set
`flattenPermissions` returns (INV-QD-038), so the screen cannot show a different
set from the one that decides.

**An unknown parent is now reported.** `resolveRoleGraph` still drops it — a
partial catalogue is a normal deployment state and failing closed would deny
everything — but says so, at warning level or through `onUnknownParent`
([BEH-QD-193](../behaviors/25-inspection.md)). The screen surfaces that as a
warning on the graph.

> **Correction — the cycle check.** There is still no positive "acyclic ✓" for
> the common case: a by-value `Role` **cannot represent a cycle**, so the check
> is vacuous there and applies only to the name-referenced `RoleDefinition[]`
> path. That is a property of the type, not a gap to close.

## 5. Subject simulator / what-if

Two input cards — **Subject** (id, roles, attributes as removable chips) and
**Check** (action, resource) — plus **Evaluate**. Results card shows the verdict,
a comparison to the seeding baseline when replaying a logged record ("matches
baseline e-91"), and what-if rows: a single edited input, the flipped verdict,
and the node that flipped it.

Runs on `@qadi/testing` layers; never against live resolvers.

**"The node that flipped it" is now answerable.** `flippedAt(before, after)`
returns the outermost node whose verdict changed, and `diffTraces` returns every
difference — verdict, reason, fields, obligations — each addressed by a path from
the root ([BEH-QD-194](../behaviors/25-inspection.md)). An empty diff is the
check a replay wants: stronger than "the verdicts match".

**Reproducible durations — the gap dissolved twice over, and both halves are
worth writing down.**

The first half is that it was never a *correctness* gap. `diffTraces` compares
`allowed`, `reason`, `children`, `visibleFields` and `obligations`, and a `Trace`
carries **no time at all** — so replay comparison was already deterministic
under any clock. What a clock buys is a reproducible number on screen, which is
presentation.

The second half is that the presentation gap is closed anyway, in both places.
`simulate(policy, input, { clock: "deterministic" })` wires `TestClock` for one
simulation, and `qadiTestLayer(subject, { clock: "test" })` closes it for
`@qadi/testing`'s own users, who had exactly the problem this note described
(CCR-QD-069).

**A duration of `0` still does not mean "not measured".** A live run of a
trivial policy also reports zero, because an in-memory evaluation genuinely
takes under a millisecond. The panel therefore labels the clock it ran under
rather than inferring anything from the number.

## 6. Services & cache

One card per port: CurrentSubject, AttributeResolver, RelationshipResolver,
DecisionHistory, EvaluationId, DecisionCache and DecisionSink (the last two
marked optional). Each card: wiring state tag, and a meta line with the
fail-closed consequence when defaulted. DecisionHistory's card names the
three-valued default (denies `hasActed` and `hasNotActed` alike,
[ADR-QD-020](../decisions/020-decision-history-port.md)).

**Closed — `name?` exists on four port shapes**, and wrappers compose it
(`"fromRecord (retrying)"`). The card reports the name, or *wired, unnamed* — and
never "unwired" for a required port, because the misnomer this note identified
is real: five of the seven are in `EvaluationServices`, so what the card reports
is *defaulted to a fail-closed implementation* (BEH-QD-215).

**Closed — `PortMetrics` counts both**, and `portActivity` reads them with zero
wiring. That answers the question `name` cannot: a store that is wired but never
consulted and one that is not wired at all are opposite problems with the same
symptom. The counts are process-wide aggregates and the panel says so
(BEH-QD-216).

**Flush now exists** — `DecisionCacheShape.clear` discards every completed entry
and leaves in-flight work alone ([BEH-QD-190](../behaviors/25-inspection.md)).
Entry count exists (`size`), and per-decision hit/miss now comes off the record
rather than off a process-global metric.

> **Correction — TTL.** There is still **no TTL concept**: the bound is
> `capacity`, evicted FIFO by insertion rather than by age, and the card must not
> offer one. Adding time-based eviction is a cache design change, not a display
> change.

`decisionSinkRing` has its own `clear` for the **record log**; the card must not
conflate the two.

## 7. React panel (client only)

- **Gates & hooks in tree** — every `<Can>`/`<Cannot>`/`useCan`/
  `useDecisionSuspense` instance with its render state; hydrated entries show
  their pair id; stale entries show `stale — re-checking` (never the old verdict,
  [ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)); each gate
  has a "highlight" → lens.
- **Hydration** — dehydrated entry count, re-checked count, mismatch count (a
  mismatch = the server allow no longer holds client-side), and "Invalidate all".

**Rescoped and built**, exactly as this note proposed: the panel is keyed by
**question**, and says so on screen because a reader counting rows against their
component tree would otherwise think it broken. `QadiAtoms.asked()` records the
questions in the atom layer (BEH-QD-217). The original note, kept because its
reasoning is the design:

> **Gap — this screen needs rescoping, not implementing.** `Atom.family` keys
> **structurally**, so ten `<Can policy={isAdmin}>` in different places in the
> tree are **one atom**. `Can` and `Cannot` are pure functions of props with no
> registration, the family's map exposes no iteration, and the package never
> touches a DOM node — no `document`, no `createElement`, no `createPortal`, no
> `ref`. Per-instance enumeration and DOM highlighting are not unimplemented;
> they are unobtainable without adding an instance registry, which is a design
> change to `@qadi/react` and not a devtools feature.
>
> A panel keyed by **policy** rather than by instance is buildable today, and is
> probably the honest version of this screen.

> **Gap — hydration counts.** Only the mismatch count is obtainable, and only for
> verdict disagreements, once per question. `hydrateDecisions` returns an array
> and forgets it, so the dehydrated-entry count is not retained; nothing counts
> re-evaluations. **"Invalidate all" exists** (`useInvalidate`).
