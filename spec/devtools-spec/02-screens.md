# Devtools 02 — Screens

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-DVT-02                                    |
> | Revision       | 0.8 (draft)                                    |
> | Effective Date | 2026-08-24                                     |
> | Status         | Draft — pending CCR                            |
> | Author         | Qadi Engineering                               |
> | Classification | Design Specification (draft)                   |
> | Change History | 0.8 (2026-08-24): §7's gap notes closed against what was built — hydration counts (CCR-QD-072) and the instance registry and lens (CCR-QD-073); recorded in CCR-QD-074<br>0.7 (2026-08-24): The resolver-call gap closed, and the note corrected — annotating the spans was half of it, and a reader was the other half (CCR-QD-071)<br>0.6 (2026-08-24): Screen 5 built, and §5 corrected on two counts it had asserted since the first draft — it runs on `@qadi/core`'s own layers rather than `@qadi/testing`'s, and "never against live resolvers" was the wrong rule (CCR-QD-070)<br>0.5 (2026-08-24): Screens 3, 4, 6 and 7 built; three of the five remaining gaps had already closed in earlier increments and this document had not been told (CCR-QD-068)<br>0.4 (2026-08-24): Screens 1 and 2 built; their normative rules are BEH-QD-203–210 (CCR-QD-067)<br>0.3 (2026-08-24): Six gaps resolved in code rather than left recorded — depth, provenance, unknown-parent reporting, trace diff, per-decision cache outcome, cache flush (CCR-QD-061)<br>0.2 (2026-08-24): Audited against the code; four screens described capabilities that do not exist, each now marked **Gap** rather than left to be discovered during implementation (CCR-QD-060)<br>0.1 (2026-08-22): Initial draft from devtools design session |

---

**All seven screens are built.** Screen 5 came last because it *runs*
evaluations rather than reading records, which is a different risk class — and
the class turned out to name the design: `Effect.provide` cannot remove a service
from a context, so a simulator that supplied only what it needed would write a
fabricated audit row per run wherever a real sink is wired
([INV-QD-042](../invariants.md), [ADR-QD-050](../decisions/050-a-simulation-is-sealed.md)).

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

**Resolver calls and history touches — closed, and it was two jobs rather than
one** (CCR-QD-071, [ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md)).

`readAttribute`'s port call is now a `qadi.attribute` span, and all three port
spans carry what they asked and what they heard. That half was the recorded gap.

The half the note missed is that **annotating a span does nothing for this
screen**: the devtools model read `Metric` and only `Metric`, and spans reach an
OpenTelemetry backend rather than the dock. So `collectPortCalls` is the reader —
a tracer layer that wraps the one already in scope and keeps the three port
spans. Richer metrics could not have done it (`PortMetrics.ts` keys on the port
name for cardinality, and an attribute name is unbounded) and a per-call sink was
already rejected there for putting a write on the hot path.

**The value never travels.** `qadi.resolved` says a value came back, not what it
was ([INV-QD-044](../invariants.md)) — the other two ports answer with closed
enums and are reported in full. A subject-carried attribute emits nothing at all,
so the span and `portCallsTotal` agree about what a port call is.

Measured rather than asserted: +4.7 µs on a resolver miss against a
zero-latency resolver, of which the annotations are ≈0.75 µs and the rest is the
cost `qadi.acted` and `qadi.hasRelationship` have always paid.

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

**Built** (CCR-QD-070). Three input cards, not two, and the third is why: without
**Fixtures** — resolver attributes, relationship edges and past events — a policy
using `hasRelationship`, `hasActed` or a resource attribute denies for want of a
fixture rather than because the rule says so. So the cards are **Subject** (id,
roles, permissions and attributes as removable chips), **Check** (action,
resource) and **Fixtures**, plus a source selector, a clock selector, `run` and
`what if`.

The results card shows the verdict, the requirement tree, the visible fields, the
duties, and the duration labelled with the clock that measured it. When the form
was seeded from a logged row a **baseline** card says whether the reconstruction
reproduces it, and a **what-if** table lists one row per variation with the node
that flipped, if one did.

Two corrections to this section, both found by re-deriving it from the code
([ADR-QD-050](../decisions/050-a-simulation-is-sealed.md)):

**It does not run on `@qadi/testing` layers.** Everything it needs is already
public in `@qadi/core` — `attributeResolverFromRecord`,
`relationshipResolverFromEdges`, `decisionHistoryFromEvents`,
`evaluationIdSequential` — and shipping test fixtures into an application's
production bundle to power a debug panel would be a strange trade.

**"Never against live resolvers" was the wrong rule.** A reviewer investigating a
real denial wants the answers the real ports gave, so `Live` exists — opt-in by
the application author, who passes a `ports` layer to the dock, and never
reachable from the input type. `Snapshot` captures those answers once and
replays them, which is the mode a sweep should use: N edits against `Live` is N
live sweeps, against a snapshot it is one live run plus N in-memory folds. What
*is* absolute is the seal — no mode can reach `CurrentSubject`, write a record,
or touch the application's cache ([INV-QD-042](../invariants.md)).

**What-if runs in both directions.** Dropping each grant answers the question a
reviewer holding an *allow* has and is silent for one holding a **denial**, since
no removal turns a denial into an allow — so the sweep also reads the policy for
what it asks for, including attribute values derived backwards out of the matcher
that demands them.

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

**And each card now lists what its port was actually asked** (CCR-QD-071,
BEH-QD-229). `collectPortCalls` reads it from the spans, which is a different
scope from the counts and is labelled as one: the counts come from metrics and
are process-wide, the calls come from spans and are the recent ones this reader
collected. It is opt-in — the collector's tracer layer has to be wired where
evaluations run — and a card with no collector says so rather than looking like a
port nothing asked.

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
  `useDecisionSuspense` instance with its render state; stale entries show
  `Rechecking` rather than the old verdict
  ([ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)); each
  question has a "highlight" → lens, and the page can be picked from. **Built**,
  behind `QadiProvider`'s `instrument`. Hydrated entries do not show a pair id:
  a seed is superseded the moment the client answers (BEH-QD-151), so an instance
  row would be showing the client's own decision and calling it the server's.
- **Hydration** — dehydrated and seeded entry counts, re-checked count, mismatch
  count (a mismatch = the server allow no longer holds client-side), one row per
  drop reason that fired, and "Invalidate all". **Built**, read passively with
  `hydrationActivity`.

**Rescoped, built, and then built the rest of the way.** The panel is keyed by
**question** and says so on screen, because a reader counting rows against their
component tree would otherwise think it broken — `QadiAtoms.asked()` records the
questions in the atom layer (BEH-QD-217), and that half is unchanged.

The other half was declared **unobtainable** below and was not
([ADR-QD-053](../decisions/053-a-gate-can-be-found.md)). The premise is true —
`Atom.family` keys structurally, so the atom layer genuinely cannot tell ten
`<Can>` apart — and the conclusion does not follow from it. A component knows
perfectly well that it exists; nothing was asking it. `gateInstances()` now
lists them under their question, with what each rendered, and the lens points at
them in **both** directions: highlight from the panel, pick from the page. The
claim that an instance registry "would breach AGENTS.md §13 twice over" was also
wrong, and §13 now says why neither rule is breached.

The original note, kept because half of its reasoning is still the design and the
other half is the correction:

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

**Closed, and it was larger than the note.** All the counts are now read from
metrics `@qadi/core` declares and `@qadi/react` writes
([ADR-QD-052](../decisions/052-hydration-is-counted-where-both-ends-can-see-it.md)).
Exploring it found something this note had not: `hydrateDecisions` had **three**
silent exits — a payload naming another subject, an unregistered atom set, and an
entry whose policy would not decode — and announced none of them, so a page that
re-decided everything from scratch was indistinguishable from one with nothing to
hydrate ([BEH-QD-230](../behaviors/19-hydration.md),
[INV-QD-045](../invariants.md)). The original note, kept because it is what the
screen was scoped against:

> **Gap — hydration counts.** Only the mismatch count is obtainable, and only for
> verdict disagreements, once per question. `hydrateDecisions` returns an array
> and forgets it, so the dehydrated-entry count is not retained; nothing counts
> re-evaluations. **"Invalidate all" exists** (`useInvalidate`).
