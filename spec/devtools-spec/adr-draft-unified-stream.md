# Draft — One timeline, paired by evaluation id

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-0XX (unallocated)                     |
> | Revision       | 0.4                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Draft — **implementable**; allocation still pending CCR |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record (draft)           |
> | Change History | 0.4 (2026-10-05): the badge's source and the transport item name the decision log that replaced the ring and the feed (ADR-QD-904, CCR-QD-905)<br>0.3 (2026-08-24): Two of the four remaining gaps are closed — the id is threaded and a transport exists (CCR-QD-066)<br>0.2 (2026-08-24): The pairing mechanism corrected — it did not exist when this was written, and half of it exists now (CCR-QD-060)<br>0.1 (2026-08-22): Initial draft from devtools design session |

---

## Context

The same logical decision can exist twice: made on the server, dehydrated
([ADR-QD-028](../decisions/028-decision-hydration.md)), hydrated on the client,
then re-checked. Two tools — or two lanes — would make the developer correlate by
eye.

## Decision

The devtools renders **one chronological stream**; environment is a badge on the
row, not a mode of the tool. Rows are **paired by evaluation id**.

## Correction — this draft's central claim was false when written

Revision 0.1 said the pairing needed nothing new:

> the dehydrated payload already carries it, and the client re-check records it,
> so a server decision and its client counterpart link with no new protocol.

The first half was true. **The second half was false, and the pairing was in fact
deliberately designed out of the evaluator.** Three separate reasons:

1. `evaluate` minted a fresh id on every call and `EvaluateOptions` had **no
   field** to supply one. `Evaluate.ts` argued for that explicitly — a cached
   decision reusing an id would mean "two log lines claiming to be the same
   event".
2. Nothing recorded the pair. The moment the client's own result leaves
   `Initial`, `QadiAtoms` discards the seed. The only scope ever holding both is
   the hydration-mismatch report, which fires at most once per question, only on
   verdict *disagreement* — so when server and client **agree**, the common case,
   nothing is recorded at all.
3. `Trace` carries no evaluation id; it is on `Allow`/`Deny` only.

## What exists now

**`EvaluateOptions.evaluationId`** ([BEH-QD-186](../behaviors/24-decision-sink.md)).
A caller may name the evaluation a re-check continues. The default is unchanged —
a fresh id per call, hit or miss — because a cache hit is a *repeat* while a
hydrated re-check is a *continuation*, and only a caller can tell those apart.
[ADR-QD-012](../decisions/012-deterministic-time-and-ids.md) is amended to say so.

**A complete record** ([BEH-QD-183](../behaviors/24-decision-sink.md)) carrying
the policy, resource, action and start time — so two rows can be shown as one
story rather than two ids that happen to match.

**The environment badge is real, and comes from the sink**, not from core:
a decision log requires an `environment` and stamps it, once, where the log is
made; over SSE it travels inside each frame. Core's evaluator deliberately does
not claim one, since it cannot know whether it is in a browser, on a server or
at an edge.

> **Corrected 2026-10-05 (CCR-QD-905).** This paragraph read:
>
> `decisionSinkRing` requires an `environment` and stamps it.
>
> The ring is replaced by the decision log
> ([ADR-QD-904](../decisions/904-a-decision-log-is-a-sink-and-its-own-history.md)).
> Under the ring the badge was stated a second time by the SSE reader, and the
> reader's label won for every live row.

## What is still missing

Naming these so the draft cannot again claim more than it has.

**Closed since revision 0.2:**

- **`@qadi/react` threads the id.** `QadiAtoms` reads the seed with `get.once` —
  non-reactively, since the id is correlation metadata and not an input to the
  decision — and passes it as `EvaluateOptions.evaluationId`. A hydrated decision
  and its client re-check now carry one id, and `Hydration.test.ts` asserts both
  that and the no-seed case minting a fresh one. The seed lookup stayed out of
  the barrel: threading was an internal change, as this draft required.
- **A transport exists.** `decisionSinkForwarding` + a decision log +
  `decisionStreamRoute` carry server decisions to a reader over guarded SSE —
  the backlog first, then live — and `ingest` merges several processes into one
  timeline
  ([ADR-QD-045](../decisions/045-the-topology-is-a-choice-of-sink.md),
  [ADR-QD-046](../decisions/046-a-decision-feed-is-sse-and-guarded.md),
  [ADR-QD-904](../decisions/904-a-decision-log-is-a-sink-and-its-own-history.md)).

  > **Corrected 2026-10-05 (CCR-QD-905).** This item named
  > `decisionSinkFeed`, since replaced by the decision log.

**Still open:**

- **The server half is near-empty by default.** `dehydrateDecisions` ships a
  tagged `Withheld` disclosure unless `includeTrace: true`, so a hydrated
  decision has no trace for a paired row's explanation panel to render until a
  payload opts in. That is a disclosure boundary rather than a defect, and the
  type now says so: a seed (`SeededAllow`/`SeededDeny`) carries no trace at all
  unless it was `Disclosed`, so there is no fabricated tag to mistake for a real
  one, and the UI's job is to say "trace not disclosed" for a `Withheld` seed
  rather than for the payload to loosen.

  > **Superseded in CCR-QD-156.** This bullet previously read: "`dehydrateDecisions`
  > ships a reduced trace unless `includeTrace: true`, the rebuild fallback hardcodes
  > `policyTag: "AllOf"`, and a denial's reason becomes the literal `"hydrated"`."
  > The reduced trace and the `"hydrated"` reason are gone, replaced by `Withheld`.
  > The `"AllOf"` claim was only ever true of a payload with **no** `trace` field at
  > all — hand-crafted or version-skewed input; a default payload's reduced trace
  > carried the real root tag.
- ~~**Nothing renders any of it.**~~ Closed. The timeline was built in
  CCR-QD-067 and `mergeSources` (BEH-QD-235, CCR-QD-076) is what finally lets a
  server's decisions and a browser's re-checks reach **one** of them, which is
  what a pair needs. `examples/nextjs-newsroom` wires it.

  > Read, until CCR-QD-076: "The pair is expressible and reachable; the timeline
  > that would show it is increment 3." True when written and stale for eight
  > increments. The phrase list in `check-devtools-claims.mjs` does not include
  > "Nothing renders", so gate 12 did not see it — a reminder that the gate is a
  > net rather than a proof, which it says of itself.

## Alternatives considered

- **Environment switcher** — hides exactly the cross-environment story the tool
  exists to show.
- **Dual-lane layout** — the pairing as layout; strong for hydration debugging,
  wrong as the permanent shape of every other screen. Kept as a wireframe; could
  return as a log view mode.

## Consequences

- (+) "Watch a decision hydrate then get re-checked" is one glance.
- (+) The correlation needs no new protocol *on the wire* — but it did need a new
  option on `evaluate`, which revision 0.1 denied.
- (−) A busy stream interleaves environments; the env filter and pair tinting
  carry the legibility burden.
- (−) A pair is only as good as the payload: a default dehydration produces a
  server row with almost nothing to inspect.
