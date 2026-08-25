# 27 — The Devtools Timeline

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-27                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-08-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.1 (2026-08-25): BEH-QD-235 — several sources are one source, so a server's decisions and a browser's re-checks reach one timeline and can be paired (CCR-QD-076)<br>1.0 (2026-08-24): Initial release (CCR-QD-067) |

_Previous: [26 — The Decision Stream](./26-decision-stream.md)_

---

The surface. `@qadi/core` made a decision observable
([24](./24-decision-sink.md)) and `@qadi/http` made it reachable
([26](./26-decision-stream.md)); this is what turns it into something a person
reads. See
[ADR-QD-047](../decisions/047-a-headless-devtools-model.md).

Everything here is in `@qadi/devtools`, which ships **two entry points**: the
headless model at `@qadi/devtools`, and the React dock at
`@qadi/devtools/react`.

## BEH-QD-203: A source is what the devtools reads, never a transport

```ts
export interface Source {
  readonly backlog?: Effect<ReadonlyArray<StoredRecord>>;
  readonly live: Stream<StoredRecord>;
}
```

```
REQUIREMENT: Every screen MUST consume a `Source`, and no screen may know what
             produced it.
```

The mirror image of the write-only `DecisionSink`
([BEH-QD-181](./24-decision-sink.md)): core knows nothing about transports
because the port cannot be read, and the devtools knows nothing about them
because a `Source` is the only shape it consumes. `sourceFromRecords`,
`sourceFromFeed` and `sourceFromEventSource` are the three that exist; a fourth
costs no change anywhere else.

```
REQUIREMENT: `backlog` MUST be absent when the sink cannot answer for the past,
             and MUST NOT default to an empty array.
```

Two different facts. Absent is "this sink has no history to give" — true of a
bare `decisionSinkFeed` — while an empty array is "it has, and there is none". A
reader can say *no history available* for the first and *no decisions yet* for
the second, and a defaulted empty array would make the first unsayable.

```
REQUIREMENT: The environment MUST be stamped by the source, not read off a
             record.
```

Core deliberately does not claim one, because it cannot know whether it is in a
browser, on a server or at an edge ([BEH-QD-182](./24-decision-sink.md)). The
adapter does, and applies it at the same boundary `decisionSinkRing` does.

## BEH-QD-235: Several sources are one source

```ts
export const mergeSources: (sources: ReadonlyArray<Source>) => Source;
```

```
REQUIREMENT: The merged `live` MUST carry every input's records.
```

The deployment this exists for is the second of the six: a server deciding
during the render and a browser re-checking after it
([00-overview](../devtools-spec/00-overview.md)). Their two records share an
`evaluationId` — which is what `EvaluateOptions.evaluationId` is for
([BEH-QD-186](./24-decision-sink.md)) — so pairing them is the whole point of
that row saying *pairs shown*, and [BEH-QD-207](#beh-qd-207-rows-are-paired-by-evaluation-and-roles-come-from-time)
can only pair what reached one `Timeline`.

It was unreachable through the public API. `decisionSinkRing.ingest` accepts a
record from elsewhere, but a ring answers for the past and not for the future, so
a **second live stream** had nowhere to go. The three constructors each produce
one `Source` and `useTimeline` consumes one; nothing joined them.

```
REQUIREMENT: The merged `backlog` MUST be absent when every input's is absent.
```

The direct consequence of [BEH-QD-203](#beh-qd-203-a-source-is-what-the-devtools-reads-never-a-transport)'s
second requirement, and the reason this function is not a one-liner. Absent means
*cannot answer for the past*; empty means *can, and there was nothing*. Merging
two bare feeds and answering `[]` would report a history as checked and empty
when none could be checked at all — the exact distinction that requirement exists
to preserve, destroyed by the operation meant to combine them.

```
REQUIREMENT: A merged backlog MUST be ordered by time.
```

The reader is one chronological table and two processes interleave. Ordering by
source would put every server row before every browser row regardless of when
either happened, which is the one arrangement that makes a pair unreadable.

```
REQUIREMENT: `mergeSources` MUST NOT deduplicate.
```

Duplicates are expected: a feed built with `replay` re-delivers, and `EventSource`
reconnects on its own. The timeline already folds by evaluation id
([BEH-QD-205](#beh-qd-205-one-timeline-ordered-unique-and-joined)), so doing it
here as well would be two places to be wrong — and the one that silently hid a
replay would be the one nobody was looking at.

## BEH-QD-204: A malformed frame degrades one row, and says which way it broke

```
REQUIREMENT: A frame that is not JSON, a frame that does not decode, and a
             dropped connection MUST each leave the stream running.
```

A devtools panel is what you are looking at when something is already wrong. A
panel that dies on a bad frame fails exactly when it is needed.

```
REQUIREMENT: `onMalformed` MUST distinguish `"not-json"` from `"not-a-record"`.
```

They are different problems with different fixes — a truncating proxy versus a
`@qadi/core` on the far side that disagrees about the wire form — and a reader
who cannot tell them apart debugs the wrong one. Reported rather than silent,
on the precedent of `onDropped`, `onUnknownParent` and `onFailure`: a reader
dropping every frame while looking healthy is the defect, not the drop.

## BEH-QD-205: One timeline, ordered, unique and joined

```ts
export const ingest: (self: Timeline, record: StoredRecord) => Timeline;
```

```
REQUIREMENT: Entries MUST be ordered by `at`, under a total order.
```

`at` comes off a `Clock` in whichever process made the decision and a merge
interleaves several, so it can be any number a caller's clock produced —
including `NaN` from a hand-built or hostile record. An unknown time sorts after
every known one and two unknowns keep arrival order. A comparator that left a
pair unordered would let the view rearrange itself between renders for no
visible reason.

```
REQUIREMENT: A record is identified by `(_tag, environment, evaluationId, at)`,
             and a repeat of one MUST return the identical timeline.
```

**Not the evaluation id alone**: a server decision and its client re-check
deliberately share one, and that pairing is the whole reason
`EvaluateOptions.evaluationId` exists ([BEH-QD-186](./24-decision-sink.md)).
Collapsing them would erase the story the tool is for.

*Identical*, not merely equal: `useSyncExternalStore` compares snapshots by
identity, so rebuilding an equal timeline would re-render the panel on every
replayed frame — and `EventSource` reconnects on its own.

```
REQUIREMENT: A `Decision` and its `Obligations` record MUST be one entry, in
             either arrival order.
```

The obligation outcome is emitted from `Qadi.ts` after `evaluate` returned, so
it can win the race to a reader. An outcome whose decision never arrives is
**kept** as an orphan rather than dropped: a binding duty nobody discharged
turned someone's allow into a refusal, and "something was refused and I cannot
show you what" is a fact a reviewer needs.

```
REQUIREMENT: Capacity MUST be a non-negative integer, and the oldest entry goes
             first.
```

Agreeing with `decisionSinkRing` in both respects, so a reader sees one eviction
policy rather than two.

## BEH-QD-206: Four verdict classes, and ERROR is one of them

```ts
export type Verdict = "Allow" | "Deny" | "Error" | "Unknown";
```

```
REQUIREMENT: A `Failed` outcome MUST render as ERROR and MUST NOT render as
             DENY.
```

[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) seen from a
reader's position, and the single most consequential rule in this document. A
lookup broke, so **no verdict exists**; a reviewer who reads that row as a
denial concludes their policy is working when it never ran.

```
REQUIREMENT: The three classes MUST differ in treatment, not only in colour.
```

ALLOW is tinted, DENY solid, ERROR outlined. The distinction has to survive a
reader who cannot tell two hues apart, because this is the one it is least
affordable to lose.

```
REQUIREMENT: Counts MUST be of the whole timeline and MUST NOT follow the
             filter.
```

A header reading "0 errors" because the reader happened to be filtering by
subject hides the thing they most need to see. Filtering answers *show me these
rows*; the counts answer *what is going on*, and the second question does not
take a filter.

`Unknown` is the absence of a verdict rather than a fourth one — an orphaned
obligation outcome has no decision to report.

## BEH-QD-207: Rows are paired by evaluation, and roles come from time

```ts
export const pairedEntries: (self: Timeline) => ReadonlyArray<PairedEntry>;
```

```
REQUIREMENT: Rows sharing an evaluation id MUST be linked in both directions,
             and MUST NOT be regrouped out of chronological order.
```

Environment is a badge on the row, never a mode of the tool: the
cross-environment story is what this exists to show and a switcher would hide
exactly that. Clustering pairs together would destroy the one property a
chronological log has.

```
REQUIREMENT: The `Origin` is the earliest row of an evaluation. Roles MUST NOT
             be derived from the environment label.
```

The draft design called the halves `hydrated` and `recheck`. **Nothing in a
record says which is which**: `environment` is a free-form label a sink stamped,
and no field marks a record as having come from a dehydrated payload. Guessing
that `"Client"` means a re-check is false the moment a deployment labels its
processes `"eu-west"` and `"us-east"`, which is the ordinary replica case.

```
REQUIREMENT: A pair whose members disagree MUST be marked on every row of it.
```

A server allow that no longer holds client-side is a hydration mismatch and the
most interesting thing the tool can surface. Three replicas where one dissents
is a disagreement on all three, not on two.

```
REQUIREMENT: An unpaired row MUST carry no badge.
```

A column full of "unpaired" costs a glance per row and says nothing.

## BEH-QD-208: A short-circuited node is not a denied one

```ts
export const inspect: (policy: Policy, trace: Trace | undefined) => InspectNode;
export type NodeStatus = "Allowed" | "Denied" | "NeverResolved";
```

```
REQUIREMENT: A policy node with no corresponding trace node MUST render as
             `NeverResolved`, and MUST NOT render as denied.
```

The display half of
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), and the
one place where a rendering bug becomes a security misreading: a branch that was
never reached performed no lookup, and a reviewer who reads it as a denial
concludes their policy rejected something it never examined.

The alignment is by index and is sound by construction — `evaluateNode` emits
one trace node per policy node in declaration order, every wrapper produces a
single child, and `AllOf` / `AnyOf` / `Rules` push one child per element they
evaluated. Where the trace has *fewer* children than the explanation has parts,
those parts were short-circuited.

```
REQUIREMENT: A `Failed` outcome MUST produce no tree at all.
```

An empty requirement tree reads as *no requirements*, which reads as *allowed*.
`inspectEntry` returns nothing so the caller is forced to render an error panel.

```
REQUIREMENT: A trace truncated below the root MUST be reported as undisclosed
             rather than as unexamined.
```

`dehydrateDecisions` ships a reduced trace unless `includeTrace: true`, so a
hydrated decision arrives with a root and no children. That is a **disclosure
boundary, not a defect** — the fix is to say so, never to fabricate a tree and
never to loosen the payload. It is distinguishable from short-circuiting because
a composite that short-circuits always evaluates its first child.

```
REQUIREMENT: `visibleFields: undefined` MUST render as *every field*.
```

It is the top of the lattice
([INV-QD-004](../invariants.md#inv-qd-004-the-field-lattice)), not the bottom.
Rendering an empty list understates a full grant into a grant of nothing, which
is the one direction of error a reviewer acts on.

## BEH-QD-209: The inspector states what it cannot know

```
REQUIREMENT: Obligation state MUST be reported per decision, never per duty.
```

`ObligationHandler` receives the whole array and returns `void`, so the library
observes that a set was presented and that the handler succeeded or failed —
never which individual duty was met. A per-duty tick would be an invention, and
one a reviewer would act on.

```
REQUIREMENT: An absent `cache` MUST be worded differently from `"miss"`.
```

Absent means no cache was consulted at all; `"miss"` means one was asked and did
not have it. Two facts, two sentences.

```
REQUIREMENT: A selection lost to capacity MUST say so.
```

A third state rather than a silent return to the placeholder: nothing selected
is a starting position, while a row that scrolled off the end of a bounded
buffer is an event, and a panel that empties itself without explanation reads as
a bug in the tool.

```
REQUIREMENT: A denial MUST NOT be given a field panel.
```

`Deny` carries neither `visibleFields` nor `obligations` and the type says so: a
denial permits nothing, so it has nothing to narrow and nothing it can oblige.

## BEH-QD-210: The dock does not mount itself

```
REQUIREMENT: Nothing in `@qadi/devtools` may run on import.
```

The host renders `<DevtoolsDock />` where it wants it. The package declares
`"sideEffects": false`, so a bundler is entitled to drop a module whose only job
is a side effect — an overlay that installed itself would vanish in exactly the
production build nobody tests.

```
REQUIREMENT: Styling MUST be inline, with no stylesheet and no injected
             `<style>`.
```

There is no bundler in this repository and no CSS pipeline; adding one for a
devtools panel would put a second build graph beside `tsconfig.build.json` for
the sake of a dozen colours. Inline styles also survive a host page whose own
CSS would otherwise inherit into the dock.

```
REQUIREMENT: `clear` MUST empty the view only.
```

It does not reach back to any sink's own log. A devtools panel emptying a
server's record buffer is a surprising amount of authority for a button, and
`decisionSinkRing` has its own `clear` for callers who mean that.

```
REQUIREMENT: Pausing MUST freeze the view without stopping the recording.
```

A reader who pauses to study a row wants the rows to stop moving, not the
recording to stop. Resuming and finding a gap where the interesting decision was
is the one outcome that makes the button worse than useless.

**The dock is one surface, not the only one.** It presupposes a browser page
running the host application, and three of the six deployments have none — a
backend-only service, a serverless function, a replicated server. Their
decisions are reachable at `/__decisions`; what renders them is not built.

---

_Previous: [26 — The Decision Stream](./26-decision-stream.md)_
