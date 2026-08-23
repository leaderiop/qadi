# Draft — One timeline, paired by evaluation id

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-0XX (unallocated)                     |
> | Revision       | 0.2                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Draft — **partly implementable as of ADR-QD-044**; allocation still pending CCR |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record (draft)           |
> | Change History | 0.2 (2026-08-24): The pairing mechanism corrected — it did not exist when this was written, and half of it exists now (CCR-QD-060)<br>0.1 (2026-08-22): Initial draft from devtools design session |

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
`decisionSinkRing` requires an `environment` and stamps it. Core deliberately
does not claim one, since it cannot know whether it is in a browser, on a server
or at an edge.

## What is still missing

Naming these so the draft cannot again claim more than it has:

- **`@qadi/react` does not thread the id.** `QadiAtoms` calls `evaluate` without
  passing the seed's `evaluationId`, so in practice the halves still do not
  correlate. The mechanism exists; the wiring does not.
- **`hydrationSeedFor` is deliberately out of the barrel** as a security
  property, so the seed's id is not reachable from outside the package. Threading
  it is an internal change, not a new public export — and must stay that way.
- **The server half is near-empty by default.** `dehydrateDecisions` ships a
  reduced trace unless `includeTrace: true`, the rebuild fallback hardcodes
  `policyTag: "AllOf"`, and a denial's reason becomes the literal `"hydrated"`.
  A paired row's explanation panel will render nothing until a payload opts in.
- **No transport carries server decisions to the page.** That is increment 2 and
  is where the backend-only and multi-process topologies are decided.

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
