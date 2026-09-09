# 19 — Decision Hydration

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-19                                    |
> | Revision       | 1.7                                            |
> | Effective Date | 2026-09-09                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.7 (2026-09-09): BEH-QD-230 gains an explicit requirement that `decodeEntryFields`/`decodePolicy` reject an excess property in an entry or its embedded `Policy` — both called `Schema.decodeUnknownOption` with no `ParseOptions` at all, unlike every one of `Policy.ts`'s own untrusted entry points and `SinkCodec.ts`'s `decodeSinkRecordWireUnknown` (CCR-QD-139); an excess-carrying entry now decodes with `UNTRUSTED_DECODE_OPTIONS` and is refused rather than silently accepted with the extra key dropped (issue #105, CCR-QD-144)<br>1.6 (2026-09-08): BEH-QD-259 — a fifth hydrate-side drop reason, `EntryTooDeep`: `hydrateDecisions` now runs `exceedsJsonDepth` ahead of any recursive `Schema` decode, closing the one recursive decode boundary left unguarded; the total across both ends is six, not five (issue #78, CCR-QD-139)<br>1.5 (2026-09-08): BEH-QD-230 corrected — a fourth hydrate-side silent exit, `MalformedEntry` (a field other than `policy` failing `DehydratedEntry`'s shape check, before `decodePolicy` runs), was missing from the enumeration and the "three" count; the total across both ends is five, not four (CCR-QD-129)<br>1.4 (2026-08-24): BEH-QD-230–232 — hydration's three remaining silent exits announced and every entry counted; INV-QD-045, ADR-QD-052. BEH-QD-146's claim to have closed "the last quiet failure" corrected (CCR-QD-072)<br>1.3 (2026-08-23): BEH-QD-146 — `dehydrateDecisions` reports what it dropped (ADR-QD-041 shape, CCR-QD-057)<br>1.2 (2026-08-23): BEH-QD-152 added — a superseded seed is announced (ADR-QD-041, CCR-QD-056)<br>1.1 (2026-08-23): BEH-QD-151 added — a seed is superseded by this client's own answer; BEH-QD-148 scoped and BEH-QD-149 restated (ADR-QD-039, INV-QD-028, CCR-QD-052)<br>1.0 (2026-07-26): Initial release (CCR-QD-029) |

_Previous: [18 — Policy Explanation](./18-explanation.md)_

---

## BEH-QD-145: Two pure functions, no React

> **See:** [ADR-QD-028](../decisions/028-decision-hydration.md)

```ts
export const dehydrateDecisions: (
  entries: ReadonlyArray<DecisionEntry>,
  options?: DehydrateOptions,
) => DehydratedDecisions;

export const hydrateDecisions: (
  atoms: QadiAtoms,
  dehydrated: DehydratedDecisions,
  subject: AuthSubject,
) => InitialValues;
```

```
REQUIREMENT: Both functions MUST be synchronous and free of React imports.
             `hydrateDecisions` MUST return a value assignable to
             `QadiProviderProps.initialValues`.
```

Seeding through `initialValues` rather than an effect after mount is the whole
point: a value written after mount shows the pending state for a frame, which is
the problem being solved.

## BEH-QD-146: A payload is bound to one subject, and fails closed

> **Invariant:** [INV-QD-022](../invariants.md#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it)

```
REQUIREMENT: `DehydratedDecisions` MUST carry the subject id its decisions were
             made for.
```

```
REQUIREMENT: `hydrateDecisions` MUST seed nothing when that id is not the
             hydrating subject's, and MUST NOT throw.
```

The failure mode is a page cached or reused across users: one subject's allows
seeding another's registry, which is a privilege escalation with no lookup to
catch it. A refused payload leaves every atom `Initial`, so the client asks
properly — the page flashes, which is what would have happened without hydration
and is the correct outcome for a payload that cannot be verified.

Not throwing is deliberate. A cache misconfiguration turning into a blank page is
worse than re-deciding; trusting it would be a breach.

```
REQUIREMENT: `dehydrateDecisions` MUST drop any entry whose decision belongs to a
             different subject than the payload's.
```

```
REQUIREMENT: `hydrateDecisions` MUST drop any entry whose policy does not decode.
```

The payload is untrusted input on the client, so a malformed entry gets the same
treatment as a mismatched subject.

```
REQUIREMENT: `dehydrateDecisions` MUST report what it dropped.
```

The drop is right; the silence was not. A server that accidentally mixes
subjects — a cache key that lost its user, a batch assembled from two requests —
shipped a payload of one row where it meant to ship a thousand, and saw nothing
wrong with it.

> **Correction.** This paragraph said this was "the last quiet failure left in
> hydration, the mismatch reporter having covered the other one". It was not.
> **Three** remained, all on the hydrate side, and they are the subject of
> [BEH-QD-230](#beh-qd-230-a-payload-that-seeds-nothing-says-why). The claim was
> made after closing the drop that had been *looked for*, and nothing had
> enumerated the exits (CCR-QD-072).

`DehydrateOptions.onDropped` takes the same shape and for the same reasons: a
development-mode `console.warn` by default, replaced outright by a supplied
callback which then runs in production too, because a payload mixing subjects is
a server-side bug worth alerting on rather than only logging.

The default message **names no subject and no policy**, only a count. A dropped
decision belongs to another user, so printing it would be precisely the
disclosure the drop exists to prevent. A caller who supplies `onDropped` receives
the entries and decides for themselves.

It observes; it cannot change the outcome. The entries are dropped either way.

## BEH-QD-147: The trace is withheld by default

```
REQUIREMENT: A dehydrated decision MUST NOT carry its trace or a denial's reason
             unless `includeTrace` is set.
```

A `Trace` names every node's `policyTag`, its `label`, and the sentence explaining
why it refused — the policy's internal structure plus which branch *this* subject
failed, shipped to a browser where any script on the page can read it.

The default is the safe direction, which is how every default in this library is
chosen ([INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)) — here
applied to information rather than to decisions.

```
REQUIREMENT: Obligations MUST be carried, and this MUST be documented as a
             disclosure the caller controls.
```

A UI that has to discharge a duty needs to know about it, so redacting obligations
would break the feature rather than protect it. Qadi cannot tell a sensitive
obligation attribute from an ordinary one, so a caller putting secrets there must
not hydrate that policy.

## BEH-QD-148: A hydrated decision is a projection, not a copy

```
REQUIREMENT: A hydrated decision MUST carry the same verdict, the same
             `visibleFields` and the same obligations as the server's.
```

```
REQUIREMENT: It MUST keep the server's `evaluationId`.
```

Correlating a client-side decision with a server-side log entry is the one thing
an identifier is for. `durationMillis` is likewise the server's, and is preserved
rather than zeroed so it cannot be mistaken for a client measurement.

> **Scope, amended in CCR-QD-052.** This is a requirement on the payload and on
> the decision rebuilt from it — not a guarantee about what a consumer will read.
> Per [BEH-QD-151](#beh-qd-151-a-seed-is-superseded-by-this-clients-own-answer) a
> seed is superseded the moment this client answers, and for a policy that
> evaluates synchronously that is the first read — so the id observed is the
> client's own. That is the honest outcome: the decision on screen is the one this
> client made. The correlation remains available wherever the seed is what is
> being read, which is every asynchronously-evaluated policy and any point before
> the subject is known.

The type is named `DehydratedDecisions` rather than `ReadonlyArray<Decision>`
because the trace is reduced — a name that admits it is a projection.

## BEH-QD-149: A seeded decision is a decision, not a pending state

> **See:** [ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)

```
REQUIREMENT: While a seed is what a consumer reads, it MUST read as an
             `AsyncResult` success that is not `waiting`, so `currentDecision`
             returns it.
```

A seeded *denial* must read as a denial rather than as "not decided yet"; those are
different answers and the whole of `currentDecision` is keeping them apart.

> **Restated in CCR-QD-052.** The requirement was written as "a seeded value MUST
> be an `AsyncResult` success", which described where the value was stored rather
> than how it reads. A seed is now held as a `Decision` in its own atom and lifted
> into a non-`waiting` success by the atom a consumer reads
> ([ADR-QD-039](../decisions/039-a-seed-is-not-an-authority.md)). The observable
> requirement is unchanged; what it constrains is now the reading rather than the
> storage.

## BEH-QD-150: Policies identify themselves structurally

```
REQUIREMENT: A payload MUST identify each policy by its serialized form, not by a
             caller-supplied key.
```

Hydration re-parses the policy and looks up the seed atom standing behind
`atoms.decision(policy)`. That works because `Atom.family` keys **structurally**
([BEH-QD-071](./09-react.md)): a policy parsed on the client is a different object
from the one the server evaluated, and equal, so it maps to the same atom.

The structural keying that once looked like an implementation detail is what makes
hydration expressible without a caller-maintained key registry — and a key registry
is rejected precisely because nothing would check that a key referred to the policy
the server actually evaluated.

## BEH-QD-151: A seed is superseded by this client's own answer

> **See:** [ADR-QD-039](../decisions/039-a-seed-is-not-an-authority.md),
> [INV-QD-028](../invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer)

```
REQUIREMENT: Once this client has produced a decision of its own — an allow, a
             denial, or a failure — that decision MUST be what every consumer
             reads, and the seed MUST NOT be read again.
```

```
REQUIREMENT: A seed MUST NOT be read while a re-check is in flight, and MUST NOT
             cover a client-side evaluation failure.
```

A seed is a first-paint cover, not an authority. The server answered earlier, with
its own resolvers, about a subject whose grants may since have changed; this
client's answer is the current one and supersedes it.

The two negative clauses are where the rule earns its keep. A re-checking result
already carries its own previous decision, so falling back to the seed there would
resurrect something older still. And a failure means the client could not answer —
covering it with the server's allow would report an outage as permission, which is
[INV-QD-006](../invariants.md) in reverse.

For a policy that evaluates synchronously — every policy needing no resolver — the
client answers on the first read, so the seed is never observed at all. That is not
a defect: there is no flash to cover when the answer is already there.

The predecessor of this rule was an assumption rather than a requirement, and it did
not hold. Seeding the decision atom directly placed the seed under `AtomRegistry`'s
`preserveInitialValueOnBuild`, which keeps a seeded value over the one the node
computes; a synchronous evaluation publishes by returning, and was discarded. A
subject kept an allow they no longer qualified for, for the life of the page.

## BEH-QD-152: A superseded seed is announced

> **See:** [ADR-QD-041](../decisions/041-a-mismatch-is-announced.md)

```ts
export interface HydrationMismatch {
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly seeded: Decision;
  readonly decided: Decision;
}

export type HydrationMismatchReporter = (mismatch: HydrationMismatch) => void;
```

```
REQUIREMENT: When this client's own answer disagrees with the seed, that
             disagreement MUST be reported once, and MUST NOT change the outcome.
```

[BEH-QD-151](#beh-qd-151-a-seed-is-superseded-by-this-clients-own-answer) made the
client's answer win, silently. Seen from outside, a mismatch is a guarded control
that renders on first paint and disappears on hydration — on every page, with no
explanation. The usual cause is not a grant that changed in the last two hundred
milliseconds; it is a client wired differently from the server, most often one
with no `RelationshipResolver` where the server has one. A configuration error
presenting as a rendering glitch is close to the worst available presentation for
it.

```
REQUIREMENT: A mismatch is a difference of VERDICT. Two allows differing in
             visible fields or obligations MUST NOT be reported.
```

```
REQUIREMENT: A client-side FAILURE MUST NOT be reported as a mismatch.
```


The client could not answer, so there is nothing for the server's answer to
disagree with; reporting one would be
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) in reverse. This
is the rule [BEH-QD-072](./09-react.md) applies to a function `fallback`, at a
different surface.

```
REQUIREMENT: Whether a disagreement is reported MUST NOT depend on how the
             decision is being read.
```

A seed lives in an atom beside the decision's, and it is only ever a
*dependency* of that decision — nothing mounts it. A registry may therefore drop
its value, and one did: under `registry.mount` the seed survived to be compared
against and the disagreement was announced, while under a `QadiProvider`, which
subscribes rather than mounts, it did not and the announcement was skipped in
silence.

That made the report a fact about registry lifetime rather than about the
decision. Every existing test used the first shape and passed; the second is what
every application uses. Found by driving one (CCR-QD-077).


```
REQUIREMENT: The default reporter MUST be development-only. A supplied
             `onHydrationMismatch` MUST replace it and MUST run in production.
```

The default is a `console.warn`, which is what a developer who has read no
documentation needs at the moment they need it. The callback exists because a
server and a client disagreeing about an authorization question is signal worth
reporting in production — it can indicate a page cached and served to the wrong
user as readily as a wiring error.

The message names the policy from **`decided.trace`**, never from `seeded.trace`:
a hydrated trace is a reduced projection whose `policyTag` is the server's root,
and without `includeTrace` it is a stand-in naming nothing
([BEH-QD-147](#beh-qd-147-the-trace-is-withheld-by-default)). Its trailing clause
is `decided.reason`, which is where
[BEH-QD-045](./06-services.md) pays off: a client with no relationship resolver
says so there, turning "why did this button vanish" into an answer in one line.

## BEH-QD-230: A payload that seeds nothing says why

```ts
export interface HydrateOptions {
  readonly onDropped?: HydrationDropReporter<DehydratedEntry>;
}
```

```
REQUIREMENT: Every exit by which `hydrateDecisions` declines to seed an entry
             MUST be announced.
```

There are **five**, and until now only the sixth — the one on the dehydrate
side ([BEH-QD-146](#beh-qd-146-a-payload-is-bound-to-one-subject-and-fails-closed))
— had ever been closed. A payload could name the wrong subject, reach an atom set
`makeQadiAtoms` did not build, carry an entry whose non-`policy` field did not
match `DehydratedEntry`'s shape, carry entries whose policy would not decode, or
nest an entry past the structural depth guard, and in every case the function
returned and said nothing at all. The page then re-decided everything from
scratch, which is *correct* and is also indistinguishable from a page with
nothing to hydrate.

> **Corrected in CCR-QD-129.** This originally enumerated three hydrate-side
> exits and named the dehydrate-side one "the fourth" — a fifth,
> `MalformedEntry`, was missing from both the count and the list.
> `hydrateDecisions` checks a decoded entry's non-`policy` fields against
> `DehydratedEntry`'s shape *before* attempting `decodePolicy`, and reports that
> failure under its own reason rather than folding it into `UndecodablePolicy`.
> The total across dehydrate and hydrate is **five**
> (`ClientHydrationDropReason`'s four plus `DehydrationDropReason`'s one, per
> `HydrationMetrics.ts`'s `hydrationDropReasons`), not four.

> **Extended in CCR-QD-139.** A fifth hydrate-side reason, `EntryTooDeep`,
> joined the set in
> [BEH-QD-259](#beh-qd-259-an-entry-nested-past-the-structural-depth-guard-is-dropped-not-a-defect):
> an entry nested past the structural depth guard is dropped the same way,
> rather than raising an uncaught defect. The total across dehydrate and
> hydrate is now **six**, not five.

```
REQUIREMENT: `decodeEntryFields` and `decodePolicy` MUST reject an excess
             property in an entry or its embedded `Policy`, not silently
             strip it.
```

Both share `Policy.ts`'s `UNTRUSTED_DECODE_OPTIONS`
(`{ onExcessProperty: "error" }`) — the same stance `SinkCodec.ts`'s
`decodeSinkRecordWireUnknown` adopted in CCR-QD-139, and the same reasoning:
`Schema`'s default (`"ignore"`) would silently strip an unrecognized key from
an otherwise-valid entry or policy tag instead of refusing to decode it, the
class of silent data loss ADR-QD-002 exists to rule out. Before CCR-QD-144
neither call passed any `ParseOptions` at all — a hydrated entry, or a policy
inside one, carrying a typo'd field decoded successfully with the typo'd key
dropped, rather than being refused. An entry failing this check is reported as
`MalformedEntry`; a policy failing it, as `UndecodablePolicy` — the same two
reasons an entry or policy failing any other part of the shape check already
gets, since this is one more way that check can fail, not a new exit.

`DehydratedEntryFields` (the schema `decodeEntryFields` runs) declares `policy`
as `Schema.Unknown` rather than omitting it, even though `policy`'s own decode
happens separately through `decodePolicy`: `decodeEntryFields` runs against the
whole entry object, `policy` included, and with `onExcessProperty: "error"` an
omitted field is indistinguishable from a genuinely unrecognized one — every
entry would otherwise be refused for carrying its own required field.

```
REQUIREMENT: A drop MUST carry a reason.
```

Not a count. The five have five causes and five different fixes: a payload
reaching the wrong client is a cache-key bug on the server, an unregistered atom
set is a wiring mistake in the call, a malformed entry is envelope corruption or
a shape the two ends have drifted on below the policy, an undecodable policy is
version skew between the two ends, and an entry nested past the structural depth
guard is an adversarial or corrupt payload rather than a version-skew signal. A
number cannot tell a developer which of those they have, and it is the only
thing they will see.

```
REQUIREMENT: Undecodable entries MUST be reported once, not once each.
```

A version skew makes *every* entry of a shape undecodable at once, so per-entry
reporting buries the rest of the page's output under a payload's worth of
identical lines — and the count, which is the useful part, is the one thing that
form loses.

```
REQUIREMENT: A refused payload MUST NOT prevent the entries that did decode from
             being seeded.
```

The undecodable ones are dropped; the rest are not held hostage to them. Only the
two whole-payload refusals seed nothing, and those are refusals of the payload
rather than of its contents.

```
REQUIREMENT: The default reporter MUST be development-only, and MUST name no
             entry's contents. A supplied reporter MUST replace it and MUST run
             in production.
```

The shape [BEH-QD-152](#beh-qd-152-a-superseded-seed-is-announced) and
[BEH-QD-146](#beh-qd-146-a-payload-is-bound-to-one-subject-and-fails-closed)
already use, for the third time and the same reasons.

The **supplied** reporter receives the entries, and for `PayloadSubjectMismatch`
that is not a disclosure: they are the caller's own argument handed back. The
default withholds them anyway, because the console is read by whoever is looking
at the page rather than by whoever called the function.

## BEH-QD-231: What crossed the network is counted, at both ends

> **Invariant:** [INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for)

```ts
// packages/core/src/HydrationMetrics.ts
hydrationDehydratedTotal   // counter
hydrationSeededTotal       // counter
hydrationDroppedTotal      // frequency, keyed on HydrationDropReason
hydrationRechecksTotal     // counter
hydrationMismatchesTotal   // counter
```

```
REQUIREMENT: Every entry a payload gains or loses MUST be counted.
```

[INV-QD-045](../invariants.md). Both functions returned their entries and forgot
them, so the only hydration number a panel could show was the mismatch count —
and even that was accumulated by the **host**, through a callback, because
`@qadi/react` had no counter of its own.

```
REQUIREMENT: The counts MUST be readable with no wiring.
```

`Metric`'s default registry is memoised on the reference, which is what lets a
panel read these the way it reads `portActivity`. Hydration runs where no Effect
runtime need exist — a server rendering a page, a client's first render — so the
write side is `updateUnsafe`, the only form available off a fiber.

```
REQUIREMENT: The metric declarations MUST be shared by the writer and the reader,
             not restated.
```

`@qadi/core` declares them; `@qadi/react` writes and `@qadi/devtools` reads. The
alternative compiles and reads **zero forever**: the registry key is
`type:id:description`, so a reader that re-declares a metric with a description
differing by a word gets its own registry entry and no error anywhere. That makes
`PortMetrics.ts`'s note — that nothing reads a description back, so mutation
testing cannot tell one from none — false for these five, and each is pinned.

```
REQUIREMENT: The drop reasons MUST be a closed set, reported in full including at
             zero.
```

Closed, because an unbounded frequency key grows a permanent registry entry per
distinct value — the cardinality objection `PortMetrics.ts` records for keying on
a port name. Reported in full, because a healthy system and a build that has lost
a reason otherwise look identical, and it is the reasons sitting at zero that
tell a reader they are watched for at all.

```
REQUIREMENT: A re-check MUST be counted only where the question was seeded.
```

A first answer is not a re-check. Counting one would make the ratio against the
mismatch count mean nothing, and the ratio is what the pair is for.

## BEH-QD-232: The counts are process-wide, and the panel refuses the subtraction

```ts
export const hydrationActivity: Effect.Effect<HydrationActivity>;
export const unaccountedEntries: (self: HydrationActivity) => number | undefined;
```

```
REQUIREMENT: A panel showing these MUST say they are process-wide.
```

As `portActivity`'s are, and for the same reason. On a server they accumulate
across every request the process has served, so `dehydrated` is not *this page's
payload* — and a reader will subtract one number from the other whether or not
they were invited to.

```
REQUIREMENT: `dehydrated − seeded` MUST NOT be reported where it would be
             negative.
```

A browser seeds from payloads it did not build, so `seeded` exceeding
`dehydrated` is the **ordinary** case there rather than a fault. Reporting
"−4 unaccounted" would send a reader hunting a bug that is not one, so
`unaccountedEntries` returns `undefined` and the panel says what that state means
instead.

```
REQUIREMENT: A clean reading MUST be stated, not left blank.
```

"Nothing was dropped, all N reasons are watched" is a finding — the panel states
the count it read rather than a number written into its source, so a reason
joining the set (as `EntryTooDeep` did, CCR-QD-139) changes what it reports with
no edit to this file. An empty area reads as *not implemented*, which is what the
panel used to have to admit to.

## BEH-QD-259: An entry nested past the structural depth guard is dropped, not a defect

> **Invariant:** [INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for)

```ts
// packages/core/src/DecodeDepthGuard.ts
export const exceedsJsonDepth: (root: unknown, maxDepth: number) => boolean;
// packages/core/src/Policy.ts
export const MAX_DECODE_DEPTH: number;
```

```
REQUIREMENT: `hydrateDecisions` MUST reject a structurally-too-deep entry before
             any recursive `Schema` decode touches it, and MUST drop it the same
             way the other four hydrate-side reasons are dropped rather than let
             the decode raise.
```

`decodeEntryFields` and `decodePolicy` both recurse through a `Schema.suspend`
shape — `DehydratedEntryFields`'s `trace` and `PolicySchema` itself — with no
depth cap of its own, the same gap `Policy.ts`'s `fromJson`/`fromJsonValue` and
`SinkCodec.ts`'s `decodeRecordWire` guard against for the identical reason: an
adversarial payload nested past the call stack's limit makes `Schema`'s own
descent raise a raw `RangeError` *defect*, not a typed failure, confirmed
empirically at 60,000 levels. This module's own doc comments (`DecodeDepthGuard.ts`,
`SinkCodec.ts`) had named `Hydration.ts` as the one recursive decode boundary
still missing the guard, "tracked separately" — a payload is authorization state
crossing a network
([ADR-QD-028](../decisions/028-decision-hydration.md)), and a page rendering it
should not be one crafted-deep entry away from an uncaught exception.

```
REQUIREMENT: The guard MUST run ahead of `decodeEntryFields`/`decodePolicy`, not
             after — mirroring `SinkCodec.ts`'s `decodeRecordWire` order for the
             identical trust boundary.
```

A depth check that ran after either decode would already have let `Schema`
recurse into the offending shape, which is exactly the crash this exists to
prevent. `exceedsJsonDepth` walks the parsed entry with an explicit
array-backed stack, so the guard itself cannot be what overflows.

```
REQUIREMENT: `exceedsJsonDepth` and `MAX_DECODE_DEPTH` MUST be reachable from
             `@qadi/core`'s own barrel, not only its `./DecodeDepthGuard` and
             `./Policy` wildcard subpaths.
```

A third consumer needing a depth guard cannot share `Policy.ts`'s and
`SinkCodec.ts`'s implementation without importing it, and `@qadi/react` — which
has no reason to reach into `@qadi/core`'s internal module layout — is exactly
that consumer.

---

_Previous: [18 — Policy Explanation](./18-explanation.md)_
