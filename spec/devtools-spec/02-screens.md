# Devtools 02 — Screens

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-DVT-02                                    |
> | Revision       | 0.2 (draft)                                    |
> | Effective Date | 2026-08-24                                     |
> | Status         | Draft — pending CCR                            |
> | Author         | Qadi Engineering                               |
> | Classification | Design Specification (draft)                   |
> | Change History | 0.2 (2026-08-24): Audited against the code; four screens described capabilities that do not exist, each now marked **Gap** rather than left to be discovered during implementation (CCR-QD-060)<br>0.1 (2026-08-22): Initial draft from devtools design session |

---

Each screen below carries a **Gap** note where it asks for something the library
cannot yet supply. Those are the implementation backlog, in preference to
discovering them one at a time. See
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

**Ready.** A `DecisionRecord` supplies every column: `action` and `resource` were
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

The Explanation panel works because a record carries its `Policy`. `explain()`
takes a `Policy` and a `Decision` carries only `trace.policyTag`, a string — so
before [BEH-QD-183](../behaviors/24-decision-sink.md) *the explanation of a
denial was unreachable from the denial*. Dotting short-circuited nodes needs the
policy zipped against the trace, which the same record makes possible.

> **Gap — obligations.** `Obligation` is `{ id, attributes, advisory }` with no
> state field, and `discharge` returns `Effect<void>` recording nothing. There is
> no way to know which obligations were discharged. The panel can list them and
> state the rule; it cannot show discharged/pending.

> **Gap — the Trace panel.** None of its three contents exist.
> **Resolver calls**: `readAttribute` is a plain function, not an `Effect.fn`, so
> it has no span, and nothing records that an attribute was resolved.
> **Cache hit/miss**: `getOrCompute` returns a bare `Trace` and `Evaluate.ts`
> states a hit is deliberately "indistinguishable from a fresh evaluation except
> that it was faster"; the only signal is a process-global frequency metric.
> **History touches**: `qadi.acted` and `qadi.hasRelationship` are spans carrying
> no attributes, so a consumer sees that one happened and how long it took, not
> for whom or what it returned.

## 3. Policy explorer

Left rail: named policies. Main: the ADT rendered as a tree (combining algorithm
and maxDepth on the root), with a Tree/JSON toggle — the JSON view is the real
codec round-trip (`toJson`/`fromJson`, BEH series 08); pasting JSON loads a
policy. **Simplify** runs
[ADR-QD-030](../decisions/030-policy-simplification.md) simplification as an
explicit action (never automatic) and previews rewrites before applying.

> **Gap — the left rail has no source.** Nothing enumerates named policies; a
> policy is a value the app holds. The `Labeled` variant carries a label but is
> findable only by walking a policy you already have. Either the devtools is
> handed a policy map by the app, or a registry is designed.

> **Correction — the Simplify example.** Revision 0.1 illustrated this with
> `not(not(x)) → x`, which is **the one rewrite `simplify` refuses**:
> `Simplify.ts` documents "double negation is NOT eliminated, and that is a
> finding rather than an omission". It does exactly two things — single-child
> composite collapse, and same-tag/same-strategy flattening. The preview must
> show those.

> **Gap — maxDepth "on the root".** `maxDepth` is an evaluation *input*
> defaulting to 64, not a property of a policy, and no function computes a given
> policy's actual depth.

## 4. Role DAG viewer

The role graph drawn top-down (acyclic by construction,
[ADR-QD-015](../decisions/015-role-dag-acyclic-by-construction.md); the UI still
surfaces the cycle-check result). Clicking a node shows its **flattened
permission set** with provenance: own permissions tinted, inherited ones gray
with the path ("via viewer").

> **Gap — provenance is computed and thrown away.** `flattenPermissions` returns
> `ReadonlySet<PermissionKey>`; its `visit` closure holds the granting role's
> name and does not record it. This is the cheapest gap on the list to close.

> **Correction — the cycle check.** There is no positive "acyclic ✓" to display
> for the common case. A by-value `Role` **cannot represent a cycle**, so the
> check is vacuous there; `resolveRoleGraph` applies only to the
> name-referenced `RoleDefinition[]` path, and that path silently drops an
> unknown parent name rather than reporting it.

## 5. Subject simulator / what-if

Two input cards — **Subject** (id, roles, attributes as removable chips) and
**Check** (action, resource) — plus **Evaluate**. Results card shows the verdict,
a comparison to the seeding baseline when replaying a logged record ("matches
baseline e-91"), and what-if rows: a single edited input, the flipped verdict,
and the node that flipped it.

Runs on `@qadi/testing` layers; never against live resolvers.

> **Gap — "the node that flipped it".** No trace diff exists anywhere in the
> library. `isMismatch` compares two decisions by *verdict only*, returns a
> boolean, and names no node.

> **Gap — reproducible durations.** `@qadi/testing` wires deterministic ids but
> **no clock**. A simulator in a browser must wire `TestClock` itself.

## 6. Services & cache

One card per port: CurrentSubject, AttributeResolver, RelationshipResolver,
DecisionHistory, EvaluationId, DecisionCache and DecisionSink (the last two
marked optional). Each card: wiring state tag, and a meta line with the
fail-closed consequence when defaulted. DecisionHistory's card names the
three-valued default (denies `hasActed` and `hasNotActed` alike,
[ADR-QD-020](../decisions/020-decision-history-port.md)).

> **Gap — "which implementation is wired" is not obtainable.** A service value is
> an anonymous object literal with no name, tag or brand. The only way to tell
> `AttributeResolverNone` from a real resolver is to call it and observe the
> answer. Note also that "unwired" is a misnomer for five of the seven services:
> they are in `EvaluationServices`, so a program cannot run without them, and
> what the card really reports is *defaulted to a fail-closed implementation*.

> **Gap — call counts and retry stats do not exist.** No counter on any port; the
> retrying and bounded wrappers keep no attempt log and the semaphore exposes no
> permit stats. The `.calls` recorders are `@qadi/testing` fixtures recording a
> bare string per call.

> **Correction — the cache card.** Revision 0.1 asked for "hit rate, entry count,
> ttl, flush". Entry count exists (`size`). Hit rate exists only as a
> **process-global** frequency shared by every `decisionCacheLayer()` in the
> process, so a per-request cache cannot be separated from an app-scoped one.
> **There is no TTL concept** — the bound is `capacity`, evicted FIFO, not by
> age. **There is no flush** — the shape is `getOrCompute` and `size`, and the
> only way to empty it is to discard the layer scope. `useInvalidate` invalidates
> *atoms*, not the cache.
>
> `decisionSinkRing` does have `clear`, so the **record log** is flushable even
> though the cache is not; the card must not conflate them.

## 7. React panel (client only)

- **Gates & hooks in tree** — every `<Can>`/`<Cannot>`/`useCan`/
  `useDecisionSuspense` instance with its render state; hydrated entries show
  their pair id; stale entries show `stale — re-checking` (never the old verdict,
  [ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)); each gate
  has a "highlight" → lens.
- **Hydration** — dehydrated entry count, re-checked count, mismatch count (a
  mismatch = the server allow no longer holds client-side), and "Invalidate all".

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
