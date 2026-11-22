# 19 — Decision Hydration

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-19                                    |
> | Revision       | 1.27                                           |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.27 (2026-11-22): BEH-QD-686 and BEH-QD-690's prose is rewrapped to the file's width<br>1.26 (2026-11-22): BEH-QD-686: no type checks that code collects an entry under a reason (ADR-QD-183, CCR-QD-462)<br>1.25 (2026-11-22): BEH-QD-688 and BEH-QD-690: the compiler cannot check that a call site raises a producer, and the characterisation's rows are unchanged, not unedited (ADR-QD-183, CCR-QD-462)<br>1.24 (2026-11-22): BEH-QD-686 to BEH-QD-690: each side's drop events come from one record of buckets, every whole-payload reason has a stated producer, the order is declared once per side and every bucketed entry is counted once (ADR-QD-183, CCR-QD-462)<br>1.23 (2026-11-22): BEH-QD-230 amended: a reporter's thrown value is named through thrownMessage, once, so the containment holds whatever was thrown (ADR-QD-182, CCR-QD-461)<br>1.22 (2026-11-15): BEH-QD-556 added; BEH-QD-148 amended: a seed's fields are the wire's (ADR-QD-157, CCR-QD-435)<br>1.21 (2026-11-14): BEH-QD-151 amended: the announced guard is in SeededQuestion.ts (ADR-QD-155, CCR-QD-433)<br>1.20 (2026-11-14): BEH-QD-517 and BEH-QD-518: Source names SeededQuestion.ts (ADR-QD-155, CCR-QD-433)<br>1.19 (2026-11-14): BEH-QD-230 and BEH-QD-231 amended: each drop reason is a row with its kind; four payload-level reasons (ADR-QD-152, CCR-QD-430)<br>1.18 (2026-11-12): BEH-QD-517 and BEH-QD-518 new; BEH-QD-149, BEH-QD-151 and BEH-QD-152 restated: a seed is held by its question (ADR-QD-149, CCR-QD-427); BEH-QD-151's second requirement reads "a re-check" as the Success(previous, waiting) result of an invalidation, a seed still covering any Initial result until this client answers<br>1.17 (2026-11-12): BEH-QD-230 and BEH-QD-269 decode through untrustedDecoder; BEH-QD-259 restated (exceedsJsonDepth is no longer barrel-reachable); the ninth reason PayloadTooDeep; BEH-QD-488 new (ARCH-78, CCR-QD-421)<br>1.16 (2026-11-10): BEH-QD-146 — dehydrateDecisions never throws: an unencodable policy is left out as UnencodablePolicy; DehydrateOptions.onDropped takes the one HydrationDrop shape; BEH-QD-152 — a throwing onHydrationMismatch is contained; BEH-QD-230 — HydrationDrop gains its reason parameter, eight reasons, a supplied reporter cannot change the outcome (ReporterThrew, every environment); BEH-QD-231 — a refused payload is counted at least once, including with no entries (ARCH-60, CCR-QD-398)<br>1.15 (2026-11-08): BEH-QD-146 — the subject filter, its count, its report and the envelope are one engine function, dehydrateWith, which dehydrateDecisions delegates to; the payload builders are reachable by no other path (ARCH-51, ADR-QD-078 amendment, CCR-QD-390)<br>1.14 (2026-10-08): BEH-QD-151 — a re-check's ports may be remote; links behaviour 34 (ARCH-31, CCR-QD-382)<br>1.13 (2026-10-08): BEH-QD-148 — a `Disclosed` seed that contradicts its own trace (verdict, `visibleFields`, `obligations` or a denial's `reason`) is dropped as `MalformedEntry`, by `@qadi/core's` `decisionDisagreement` (ADR-QD-106, INV-QD-170, CCR-QD-301)<br>1.12 (2026-10-08): BEH-QD-231 — hydration counts are written to and read from the default registry, by construction (ARCH-45, CCR-QD-269)<br>1.11 (2026-10-08): BEH-QD-230 — a refusal of the whole payload is announced as a refusal (`HydrationDrop.wholePayload`), the "two whole-payload refusals" count is corrected to the three it names, and each reason's meaning is `hydrationDropMeaning(reason)`; BEH-QD-231/232 name the panel's sentence as its `summary` (ADR-QD-041 amendment, CCR-QD-203)<br>1.10 (2026-10-06): BEH-QD-268 — the version-1 payload reader is removed as scheduled: only `version: 2` is read, and a payload with no `version` is dropped whole as `UnsupportedPayloadVersion`; `DehydratedDecisionsV1`, `DehydratedEntryV1` and `DehydratedPayload` removed, so BEH-QD-145's `hydrateDecisions` takes `DehydratedDecisions` (ADR-QD-078 amendment, CCR-QD-182)<br>1.9 (2026-10-05): references to `SinkCodec.ts`'s retired `decodeRecordWire`/`decodeSinkRecordWireUnknown` now name `decodeSinkRecord` (ADR-QD-095, CCR-QD-179)<br>1.8 (2026-10-04): ARCH-05 — hydration is one module. BEH-QD-147: withholding is a tagged `Withheld` disclosure on the wire, not a reduced trace and a stand-in "hydrated" reason. BEH-QD-148/149: a hydrated decision is a `SeededAllow`/`SeededDeny`, a type of its own, and a seed reads as a non-`waiting` success holding a `SeededDecision`. BEH-QD-152: `HydrationMismatch.seeded` is a `SeededDecision`; the "stand-in naming nothing" reason for naming the policy from `decided.trace` was wrong (a default payload named the real root) and is replaced by the true one. BEH-QD-230: `UnregisteredAtoms` removed (the atom set owns the capability, so the situation cannot arise), `UnsupportedPayloadVersion` and `MalformedPayload` added, and `hydrateDecisions` never throws. New BEH-QD-268 (the payload is versioned) and BEH-QD-269 (a malformed envelope is dropped, never thrown on). `BEH-QD-145`'s `hydrateDecisions` takes `DehydratedPayload` (CCR-QD-156)<br>1.7 (2026-09-09): BEH-QD-230 gains an explicit requirement that `decodeEntryFields`/`decodePolicy` reject an excess property in an entry or its embedded `Policy` — both called `Schema.decodeUnknownOption` with no `ParseOptions` at all, unlike every one of `Policy.ts`'s own untrusted entry points and `SinkCodec.ts`'s `decodeSinkRecordWireUnknown` (CCR-QD-139); an excess-carrying entry now decodes with `UNTRUSTED_DECODE_OPTIONS` and is refused rather than silently accepted with the extra key dropped (issue #105, CCR-QD-144)<br>1.6 (2026-09-08): BEH-QD-259 — a fifth hydrate-side drop reason, `EntryTooDeep`: `hydrateDecisions` now runs `exceedsJsonDepth` ahead of any recursive `Schema` decode, closing the one recursive decode boundary left unguarded; the total across both ends is six, not five (issue #78, CCR-QD-139)<br>1.5 (2026-09-08): BEH-QD-230 corrected — a fourth hydrate-side silent exit, `MalformedEntry` (a field other than `policy` failing `DehydratedEntry`'s shape check, before `decodePolicy` runs), was missing from the enumeration and the "three" count; the total across both ends is five, not four (CCR-QD-129)<br>1.4 (2026-08-24): BEH-QD-230–232 — hydration's three remaining silent exits announced and every entry counted; INV-QD-045, ADR-QD-052. BEH-QD-146's claim to have closed "the last quiet failure" corrected (CCR-QD-072)<br>1.3 (2026-08-23): BEH-QD-146 — `dehydrateDecisions` reports what it dropped (ADR-QD-041 shape, CCR-QD-057)<br>1.2 (2026-08-23): BEH-QD-152 added — a superseded seed is announced (ADR-QD-041, CCR-QD-056)<br>1.1 (2026-08-23): BEH-QD-151 added — a seed is superseded by this client's own answer; BEH-QD-148 scoped and BEH-QD-149 restated (ADR-QD-039, INV-QD-028, CCR-QD-052)<br>1.0 (2026-07-26): Initial release (CCR-QD-029) |

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
  options?: HydrateOptions,
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
REQUIREMENT: `dehydrateDecisions` MUST NOT throw on an entry the public
             constructors build. An entry whose policy the policy schema does
             not accept MUST be left out as `UnencodablePolicy`, counted and
             reported once, and the rest of the payload MUST still be written.
```

The constructors accept what the schema refuses: `gte(NaN)`, `gte(-Infinity)` and
`hasRelationship(…, { depth: 1.5 })` all build, and the evaluator decides them,
but the schema's finite and integer checks reject them on the way out. Such an
entry is left out and the client asks the question itself, as it does for any
entry that did not cross; the payload stays JSON-safe. An entry that is both
foreign and unencodable is `ForeignSubject`: the subject filter runs first, and a
foreign entry is never encoded.

> **Corrected in CCR-QD-398 (ARCH-60).** The engine encoded each policy with
> `encodeSync`, on the stated ground that encoding a typed policy cannot fail. It
> could: `dehydrateDecisions` threw a `SchemaError` on a server's render path out
> of a function documented as total, and the entry was counted nowhere. It now
> encodes with `Schema.encodeOption` and an entry that does not encode is a
> `LeftOut` event like a foreign one.

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

```ts
export interface DehydrateOptions {
  readonly includeTrace?: boolean;
  readonly onDropped?: HydrationDropReporter<DecisionEntry, DehydrationDropReason>;
}
```

`DehydrateOptions.onDropped` takes the same `HydrationDrop` record as
`HydrateOptions.onDropped` ([BEH-QD-230](#beh-qd-230-a-payload-that-seeds-nothing-says-why)),
`{ reason, entries, wholePayload }`, called once per reason with `wholePayload`
always `false`, because this side builds a payload and never refuses one. The
reasons here are `ForeignSubject` and `UnencodablePolicy`, so one function over
the whole `HydrationDropReason` serves both ends. The default is a
development-mode `console.warn`, replaced outright by a supplied callback which
then runs in production too, because a payload mixing subjects is a server-side
bug worth alerting on rather than only logging.

> **Amended in CCR-QD-398 (ARCH-60).** This paragraph read "`DehydrateOptions.onDropped`
> takes the same shape and for the same reasons", where "the same shape" meant
> only the resolution rule (a development default replaced by a supplied hook):
> the hook was handed a bare array of entries. With a second reason a bare array
> cannot say which one it is looking at, so the hook now takes the same
> `HydrationDrop`. Migrate `(entries) => …` to `(drop) => …drop.entries…`.

The default message **names no subject and no policy**, only a count. A dropped
decision belongs to another user, so printing it would be precisely the
disclosure the drop exists to prevent. A caller who supplies `onDropped` receives
the entries and decides for themselves.

It observes; it cannot change the outcome. The entries are dropped either way,
and a supplied hook that throws is contained and announced as such
([BEH-QD-230](#beh-qd-230-a-payload-that-seeds-nothing-says-why),
[INV-QD-251](../invariants.md#inv-qd-251-a-supplied-reporter-cannot-change-a-hydration-outcome)).

```
REQUIREMENT: `dehydrateDecisions` MUST build its payload only from entries it has
             already filtered to the payload's subject, counted and reported; the
             per-entry projection and the envelope MUST NOT be reachable by any
             other path.
```

Before, both builders were exported from `HydrationEngine.ts`, and "already
filtered to one subject" was stated only in a doc comment on the envelope builder,
so a second caller inside `@qadi/react` could have built a payload that skipped
the filter, its count or its report. Since ARCH-51, the filter, the
`ForeignSubject` count, the report, `includeTrace` and the envelope are one
function, `dehydrateWith`, beside `hydrateWith`. The builders are private to it,
and `dehydrateDecisions` delegates to it
([ADR-QD-078](../decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md),
2026-11-08 amendment). The signature and the bytes it returns are unchanged,
pinned by tests written before the change.

## BEH-QD-147: The trace is withheld by default

```
REQUIREMENT: A dehydrated decision MUST NOT carry its trace or a denial's reason
             unless `includeTrace` is set. What it carries instead MUST be a
             tagged `Withheld` disclosure, not a reduced trace and not a
             stand-in reason.
```

Withholding is a closed, tagged case on the wire (`disclosure: { _tag:
"Withheld" }`) and in the type (`AllowDisclosure`/`DenyDisclosure`), and
`includeTrace` is the only way to get `Disclosed`, which carries the server's own
trace and, for a denial, its reason. Before this the default shipped a single-node
"trace" and the literal reason `"hydrated"`: a projection posing as an evaluation
tree, and a sentence a `<Can fallback={(deny) => deny.reason}>` would render as if
the policy had said it.

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
because the trace is withheld — a name that admits it is a projection.

```
REQUIREMENT: The decision rebuilt from a payload MUST be a `SeededAllow` or a
             `SeededDeny`, not an `Allow` or a `Deny`.
```

A seed is a projection of the server's decision, and the type says so
([ADR-QD-028](../decisions/028-decision-hydration.md): a hydrated decision "is not
equal to the one the server made"). It carries `evaluationId`, `subjectId`,
`durationMillis`, a `disclosure`, and — for an allow — `visibleFields` and
`obligations`; it has no `trace` and no `reason` of its own, so none has to be
invented. Its `_tag` is distinct from `"Allow"`/`"Deny"`, so
`Match.tagsExhaustive` and `Equal` cannot confuse a seed with an evaluation
([ADR-QD-003](../decisions/003-tag-discriminant.md)). Read its verdict
with `permits`, which accepts every case of the closed `ClientDecision` union;
`isAllowed` from `@qadi/core` does not accept one. Code comparing
`decision._tag === "Allow"` keeps compiling and treats a seeded allow as not
allowed, which fails closed — it never grants anything.

> **Amended in CCR-QD-435 (ARCH-91).** The fields listed above are not written out
> in the seed's class. They are the decision wire form's minus what the payload
> withholds ([BEH-QD-556](#beh-qd-556-a-seed-carries-every-field-the-payload-discloses),
> [ADR-QD-157](../decisions/157-a-seeds-fields-are-the-wires-stated-once.md)), and an
> allow's `visibleFields` is absent, not `undefined`, when the server sent none.

## BEH-QD-556: A seed carries every field the payload discloses

> **See:** [ADR-QD-157](../decisions/157-a-seeds-fields-are-the-wires-stated-once.md),
> [INV-QD-333](../invariants.md#inv-qd-333-a-seeds-fields-are-the-wires)

```
REQUIREMENT: A seed rebuilt from a payload entry MUST carry every field the entry
             carries, with the same value, and nothing the entry does not carry
             except its own `_tag`, the hydrating subject's `subjectId` and the
             entry's `disclosure`.
```

```
REQUIREMENT: A field the decision's wire form gains MUST reach the seed with no
             change to `@qadi/react`.
```

```
REQUIREMENT: A field the payload withholds (the trace, and a denial's reason and
             obligations) MUST NOT appear on a seed except inside its `disclosure`.
```

A field written out in the seed's class and copied by name in `rebuild` was dropped
while everything compiled ([ARCH-91](../decisions/157-a-seeds-fields-are-the-wires-stated-once.md)):
the seed now takes its fields from the same structure the payload's entries do, so
the two cannot disagree about which fields exist. An allow's `visibleFields` is an
optional key: it is absent, not `undefined`, when the server sent none.

Source: `packages/react/src/SeededDecision.ts` (`AllowSeedFields`, `DenySeedFields`),
`packages/react/src/HydrationEngine.ts` (the `VERDICTS` table: `rebuild`).
Tests: `packages/react/test/HydrationSeedFields.test.ts` (the round-trip property; an
allow sent without `visibleFields`), `packages/react/test/Hydration.tst.ts` (a seed's
constructor input is its verdict's seed fields plus the subject).

## BEH-QD-149: A seeded decision is a decision, not a pending state

> **See:** [ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)

```
REQUIREMENT: While a seed is what a consumer reads, it MUST read as an
             `AsyncResult` success that is not `waiting` and carries a
             `SeededDecision`, so `currentDecision` returns it.
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

> **Amended 2026-11-12 (CCR-QD-427).** The seed is no longer held in its own atom for a
> registry to drop. The question's handle holds it, and a registry reaches it through a
> grant node `hydrate` gave that registry
> ([ADR-QD-149](../decisions/149-a-seed-is-held-by-its-question.md)). The requirement is
> unchanged.

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

> A re-check's ports may be **remote**: a client with no stores asks a server for each answer
> ([34 — Remote Ports](./34-remote-ports.md)). A remote outage is the port's own typed error, so it
> is a failure here and never a stand-in for the server's allow ([BEH-QD-329](./34-remote-ports.md)).

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

```
REQUIREMENT: The seed MUST NOT be read again after this client's answer,
             including when the decision atom is rebuilt (a remounted gate).
```

> **Amended 2026-11-12 (CCR-QD-427).** "A re-check" in the second requirement is the
> `Success(previous, waiting)` result an invalidation produces, which is how
> [ADR-QD-039](../decisions/039-a-seed-is-not-an-authority.md) words it; it is not the
> first check. The first check is covered: a seed covers any `Initial` result, in flight
> or not, until this client answers, and the client's own answer then replaces it. The
> requirement's meaning is otherwise unchanged. The third requirement is new in this
> revision: it held before only because the seed node was gone once its readers left, and
> it is now enforced by the `announced` guard in `HydrationEngine.ts`'s `read`
> ([ADR-QD-149](../decisions/149-a-seed-is-held-by-its-question.md)).
>
> **Amended 2026-11-14 (CCR-QD-433).** The `announced` guard is now in `SeededQuestion.ts`'s
> reader (`makeSeededQuestion`;
> [ADR-QD-155](../decisions/155-a-seeded-question-owns-its-computing-atom.md)), not in
> `HydrationEngine.ts`. The requirement is unchanged.

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

## BEH-QD-517: A seed lasts until this client answers or its question is dropped

> **See:** [ADR-QD-149](../decisions/149-a-seed-is-held-by-its-question.md),
> [INV-QD-317](../invariants.md#inv-qd-317-a-seed-outlives-a-registrys-idle-removal-but-never-the-clients-answer-or-its-questions-row)

```
REQUIREMENT: A seed MUST remain readable from the moment its registry is built
             until this client has produced a decision of its own for that
             question, or the atom set drops the question (the sweep,
             BEH-QD-198). Whether a gate has mounted, unmounted or remounted,
             and whether a `QadiProvider` or a bare `AtomRegistry` holds the
             registry, MUST NOT change that. A seed MUST NOT depend on a timer.
```

A registry removes a node nothing holds one macrotask after it is built, and a seed node is
not held by a reader until a gate reads its question. A gate that mounted late, a gate under a
hidden-then-shown `<Activity>`, a gate that remounted and a bare registry read after one turn
each found no seed and rendered `pending`. The question's handle now holds the seed and the
registry holds a keepAlive grant to it, so none of them loses it.

ADR-QD-103's limit stands: a cold question past `maxTrackedQuestions` loses its seed with its
row, because the seed is forgotten with the handle.

Source: `packages/react/src/SeededQuestion.ts` (`makeSeededQuestion`).
Tests: `packages/react/test/QadiProvider.seed.test.tsx` (SD1 to SD5, SD5 the ordering pin: the
subject must be kept first), `packages/react/test/Hydration.lifetime.test.ts` (HL1 and HL2, a
bare registry and no timer; HL6, eviction forgets a cold seed).

## BEH-QD-518: A seed reaches only the registries it was given to

> **See:** [ADR-QD-149](../decisions/149-a-seed-is-held-by-its-question.md),
> [INV-QD-318](../invariants.md#inv-qd-318-a-registry-holds-a-grant-node-only-for-a-question-it-was-seeded-for)

```
REQUIREMENT: A registry MUST read a seed only if `initialValues` from that
             `hydrate` call was passed to it. Another registry over the same atom
             set, in the same process or the same test, MUST read none, and MUST
             NOT count a re-check as seeded (BEH-QD-231).
```

An atom set is module scope, and on a server module scope is state shared by every request.
A seed held by the atom set alone would be read by every later registry over it, so one
request's seed would reach another's: a user shown a decision made for someone else. A registry
holds a grant only for a question it was seeded for, and reads a seed only through that grant.
A question that was never hydrated leaves no node in the registry at all.

Source: `packages/react/src/SeededQuestion.ts` (`seededIn`, which asks `registry.getNodes()`
and never `registry.get`).
Tests: `packages/react/test/Hydration.lifetime.test.ts` (HL3, a registry never given a seed
reads none; HL5, an unhydrated question leaves no node; HL7, two registries over one atom set
each read their own seed).

## BEH-QD-152: A superseded seed is announced

> **See:** [ADR-QD-041](../decisions/041-a-mismatch-is-announced.md)

```ts
export interface HydrationMismatch {
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly seeded: SeededDecision;
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

A seed lived in an atom beside the decision's, and it was only ever a
*dependency* of that decision — nothing mounted it. A registry could therefore drop
its value, and one did: under `registry.mount` the seed survived to be compared
against and the disagreement was announced, while under a `QadiProvider`, which
subscribes rather than mounts, it did not and the announcement was skipped in
silence.

That made the report a fact about registry lifetime rather than about the
decision. Every existing test used the first shape and passed; the second is what
every application uses. Found by driving one (CCR-QD-077).

> **Amended 2026-11-12 (CCR-QD-427, [ADR-QD-149](../decisions/149-a-seed-is-held-by-its-question.md)).**
> A registry now holds a grant node per seeded question, so the announcement no longer
> depends on registry lifetime: the seed is found through the grant under a mount, a
> subscription or a bare read alike. The requirement is unchanged.


```
REQUIREMENT: The default reporter MUST be development-only. A supplied
             `onHydrationMismatch` MUST replace it and MUST run in production.
```

The default is a `console.warn`, which is what a developer who has read no
documentation needs at the moment they need it. The callback exists because a
server and a client disagreeing about an authorization question is signal worth
reporting in production — it can indicate a page cached and served to the wrong
user as readily as a wiring error.

A supplied `onHydrationMismatch` that throws is contained: the decision's read
returns as if it had not, the re-check and the mismatch are still counted, and
the throw is announced as `ReporterThrew`, in every environment
([INV-QD-251](../invariants.md#inv-qd-251-a-supplied-reporter-cannot-change-a-hydration-outcome)).

> **Amended in CCR-QD-398 (ARCH-60).** The first requirement's "MUST NOT change
> the outcome" held for a reporter that returned. One that threw was called
> unguarded, so the throw left the decision atom's read and reached React's
> render, where an error boundary caught what a guard should have rendered.

The message names the policy from **`decided.trace`**, never from the seed: a seed
carries no trace unless the server disclosed one
([BEH-QD-147](#beh-qd-147-the-trace-is-withheld-by-default)), and even a disclosed
one is the server's evaluation rather than the one now in effect. Its trailing clause
is `decided.reason`, which is where
[BEH-QD-045](./06-services.md) pays off: a client with no relationship resolver
says so there, turning "why did this button vanish" into an answer in one line.

> **Corrected in CCR-QD-156.** This section, ADR-QD-041, and the devtools draft
> said a default payload's trace was "a stand-in naming nothing" (`policyTag:
> "AllOf"`). It was not: the reduced trace the default produced carried the
> **real** root tag, and `"AllOf"` appeared only for a payload with no `trace`
> field at all, which is hand-crafted or version-skewed input. The conclusion — name
> the policy from `decided.trace` — stands; only the stated reason was wrong, and
> the case it described no longer exists, because a seed has no trace to name
> anything with.

## BEH-QD-230: A payload that seeds nothing says why

```ts
export interface HydrateOptions {
  readonly onDropped?: HydrationDropReporter<unknown>;
}

export interface HydrationDrop<A, R extends HydrationDropReason = ClientHydrationDropReason> {
  readonly reason: R;
  readonly entries: ReadonlyArray<A>;
  readonly wholePayload: boolean;
}
export type HydrationDropReporter<A, R extends HydrationDropReason = ClientHydrationDropReason> =
  (drop: HydrationDrop<A, R>) => void;
```

> **Amended in CCR-QD-398 (ARCH-60).** `HydrationDrop` and
> `HydrationDropReporter` gain the reason as a second type parameter, defaulting to
> the hydrate side's, so the one-argument spellings mean what they meant and
> `DehydrateOptions.onDropped` is `HydrationDropReporter<DecisionEntry,
> DehydrationDropReason>` ([BEH-QD-146](#beh-qd-146-a-payload-is-bound-to-one-subject-and-fails-closed)).

```
REQUIREMENT: A refusal of the whole payload MUST be announced as a refusal of
             the payload, and MUST NOT report zero lost decisions.
```

`wholePayload` is `true` for the four payload-level reasons, where `entries`
is everything the payload carried, which may be nothing. The default warning
then reads "refused the payload (N decision(s) in it)" and the per-entry form
keeps "did not seed N decision(s)". A payload that was not an envelope at all
used to print "did not seed 0 decision(s)" beside a counter that read one, and
a developer reads 0 as nothing lost.

```
REQUIREMENT: The default warning for each reason MUST print that reason's
             `remedy` from `@qadi/core`'s `hydrationDropMeaning`.
```

What each reason means is stated once, in `@qadi/core`, on the reason's row of the one
table that defines the reasons: `hydrationDropMeaning(reason)` is `{ summary, remedy }`.
The `remedy` names the fix for whoever caused the drop and is what the console
prints; the `summary` is read beside a count on a panel
([BEH-QD-231](#beh-qd-231-what-crossed-the-network-is-counted-at-both-ends)).
Neither names an entry's contents.

```
REQUIREMENT: Every exit by which `hydrateDecisions` declines to seed an entry
             MUST be announced.
```

There are **nine** reasons across both ends (see the amendments below), and until now only the one — the one on the dehydrate
side ([BEH-QD-146](#beh-qd-146-a-payload-is-bound-to-one-subject-and-fails-closed))
— had ever been closed. A payload could name the wrong subject, reach an atom set
`makeQadiAtoms` did not build (a case that has since been made unreachable),
carry an entry whose non-`policy` field did not
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

> **Amended in CCR-QD-156.** `UnregisteredAtoms` is **removed**: the capability to
> seed lives on the atom set itself (`QadiAtoms.hydrate`), so `hydrateDecisions`
> cannot be handed an atom set it has no seed atoms for, and a spread copy or a
> wrapper that forwards `decision`/`decisionFor` seeds the same questions its
> inner atom set does — correct, because its decision atoms are the real ones
> ([ADR-QD-039](../decisions/039-a-seed-is-not-an-authority.md)). Two reasons are
> **added** — `UnsupportedPayloadVersion` and `MalformedPayload`, both
> whole-payload ([BEH-QD-268](#beh-qd-268-a-payload-is-versioned-and-only-version-2-is-read),
> [BEH-QD-269](#beh-qd-269-a-malformed-envelope-is-dropped-never-thrown-on)). The
> hydrate-side reasons are now `PayloadSubjectMismatch`, `UnsupportedPayloadVersion`,
> `MalformedPayload`, `MalformedEntry`, `UndecodablePolicy` and `EntryTooDeep`;
> with the dehydrate-side `ForeignSubject`, **seven** across both ends — the
> count `hydrationDropReasons` holds.

> **Amended in CCR-QD-398 (ARCH-60).** The dehydrate side gained `UnencodablePolicy`
> ([BEH-QD-146](#beh-qd-146-a-payload-is-bound-to-one-subject-and-fails-closed)). The
> reasons across both ends are `ForeignSubject` and `UnencodablePolicy`
> (dehydrate), then `PayloadSubjectMismatch`, `UnsupportedPayloadVersion`,
> `MalformedPayload`, `MalformedEntry`, `UndecodablePolicy` and `EntryTooDeep`
> (hydrate): eight, the values `hydrationDropReasons` held then.

> **Amended in CCR-QD-421 (ARCH-78).** A ninth reason, `PayloadTooDeep`, joins the
> hydrate side ([BEH-QD-488](#beh-qd-488-a-payload-nested-past-the-bound-outside-its-entries-is-dropped-whole)):
> a payload nested past the decode bound outside its entries, which `MalformedPayload`
> used to cover. The hydrate-side reasons are now `PayloadSubjectMismatch`,
> `UnsupportedPayloadVersion`, `MalformedPayload`, `PayloadTooDeep`, `MalformedEntry`,
> `UndecodablePolicy` and `EntryTooDeep`; with the dehydrate-side `ForeignSubject` and
> `UnencodablePolicy`, **nine** across both ends — the values `hydrationDropReasons` holds.

> **Amended in CCR-QD-430 (ARCH-86).** Each of the nine reasons is now one row of a
> table in `HydrationMetrics.ts`, with its kind and its meaning. The four whole-payload
> reasons (`PayloadSubjectMismatch`, `UnsupportedPayloadVersion`, `MalformedPayload`,
> `PayloadTooDeep`) are the `payload` kind and `wholePayload` is true for exactly them; the
> three per-entry reasons (`MalformedEntry`, `UndecodablePolicy`, `EntryTooDeep`) are the
> `entry` kind; the two dehydrate-side reasons are the `dehydration` kind. `@qadi/react`'s
> groups are read off the table. The set and its order are unchanged
> ([ADR-QD-152](../decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md)).

```
REQUIREMENT: `decodeEntryFields` and `decodePolicy` MUST reject an excess
             property in an entry or its embedded `Policy`, not silently
             strip it.
```

Both decode through `untrustedDecoder` (`UntrustedDecode.ts`, BEH-QD-486), whose
strict options (`{ onExcessProperty: "error" }`) are private to it, and the payload
is decoded the same way with its `entries` unwalked (BEH-QD-269) — the same stance `SinkCodec.ts`'s inbound
decode (now `decodeSinkRecord`) adopted in CCR-QD-139, and the same reasoning:
`Schema`'s default (`"ignore"`) would silently strip an unrecognized key from
an otherwise-valid entry or policy tag instead of refusing to decode it, the
class of silent data loss ADR-QD-002 exists to rule out. Before CCR-QD-144
neither call passed any `ParseOptions` at all — a hydrated entry, or a policy
inside one, carrying a typo'd field decoded successfully with the typo'd key
dropped, rather than being refused. An entry failing this check is reported as
`MalformedEntry`; a policy failing it, as `UndecodablePolicy` — the same two
reasons an entry or policy failing any other part of the shape check already
gets, since this is one more way that check can fail, not a new exit.

`DehydratedEntryWire` (the schema each entry is decoded against) declares `policy`
as `Schema.Unknown` rather than omitting it, even though `policy`'s own decode
happens separately through `decodePolicy`: `decodeEntryFields` runs against the
whole entry object, `policy` included, and with `onExcessProperty: "error"` an
omitted field is indistinguishable from a genuinely unrecognized one — every
entry would otherwise be refused for carrying its own required field.

```
REQUIREMENT: A drop MUST carry a reason.
```

Not a count. The reasons have different causes and different fixes: a payload
reaching the wrong client is a cache-key bug on the server, a payload of an
unsupported version is a deploy in flight, a payload that is not an envelope is
not something a well-behaved server produces, a malformed entry is envelope
corruption or a shape the two ends have drifted on below the policy, an
undecodable policy is version skew between the two ends, and an entry nested past
the structural depth guard is an adversarial or corrupt payload rather than a
version-skew signal. A
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
whole-payload refusals (`PayloadSubjectMismatch`, `UnsupportedPayloadVersion`,
`MalformedPayload`) seed nothing, and those are refusals of the payload rather
than of its contents.

> **Corrected in CCR-QD-203.** This sentence said "Only the two whole-payload
> refusals seed nothing". There are three, and a count in prose is what let it
> rot; it now names them.

```
REQUIREMENT: The default reporter MUST be development-only, and MUST name no
             entry's contents. A supplied reporter MUST replace it and MUST run
             in production.
```

The shape [BEH-QD-152](#beh-qd-152-a-superseded-seed-is-announced) and
[BEH-QD-146](#beh-qd-146-a-payload-is-bound-to-one-subject-and-fails-closed)
already use, for the third time and the same reasons.

```
REQUIREMENT: A supplied reporter MUST NOT be able to change what is seeded,
             counted or returned. A supplied reporter that throws MUST be
             contained and announced as `ReporterThrew`, naming the hook and the
             error (the error as `name: message` when its own `message` is a
             string, and otherwise through `thrownMessage`, so naming it cannot
             throw and never names it twice) and no entry, in every environment.
```

[INV-QD-251](../invariants.md#inv-qd-251-a-supplied-reporter-cannot-change-a-hydration-outcome).
A throwing `onDropped` threw out of `hydrateDecisions`, which must not throw,
and left the entries that did decode unseeded; on the other end it threw out of
`dehydrateDecisions` after the foreign entries had been counted. Every resolver
in `DeveloperSignals.ts` now wraps a supplied hook once, and every hydration
outcome is counted before it is announced, so a throw has nothing left to stop.
The announcement is made in production too: the host replaced the default, so
nothing else will say it.

Amended 2026-11-22 (ARCH-116, CCR-QD-461): a reporter that threw a value whose `message`
or `toString` threw used to escape the containment from the line that named it, and an
`Error` whose `message` was not a string was named by that message after its name. The
line now reads the value through `thrownMessage` ([INV-QD-383](../invariants.md#inv-qd-383-a-function-stated-as-total-stays-total-whatever-value-it-caught)).

The **supplied** reporter receives the entries, and for `PayloadSubjectMismatch`
that is not a disclosure: they are the caller's own argument handed back. The
default withholds them anyway, because the console is read by whoever is looking
at the page rather than by whoever called the function.

## BEH-QD-231: What crossed the network is counted, at both ends

> **Invariant:** [INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for)

```ts
// packages/core/src/HydrationMetrics.ts — written only by
// packages/react/src/HydrationEvent.ts's `emitHydration`
hydrationDehydratedTotal   // counter
hydrationSeededTotal       // counter
hydrationDroppedTotal      // frequency, keyed on HydrationDropReason
hydrationRechecksTotal     // counter
hydrationMismatchesTotal   // counter
```

The devtools panel's sentence for a reason is
`hydrationDropMeaning(reason).summary` from `@qadi/core`, the same row whose
`remedy` the console prints, so a reworded cause changes one place. A key
outside the closed set (`isHydrationDropReason` is false) is reported as
unrecognised rather than hidden.

```
REQUIREMENT: Every entry a payload gains or loses MUST be counted.
```

[INV-QD-045](../invariants.md). Both functions returned their entries and forgot
them, so the only hydration number a panel could show was the mismatch count —
and even that was accumulated by the **host**, through a callback, because
`@qadi/react` had no counter of its own.

```
REQUIREMENT: A refusal of the whole payload MUST be counted at least once,
             whatever its reason and however many entries it carried.
```

A payload naming another subject with no entries was announced as refused and
counted zero times, beside a warning that said it had been: the disagreement
CCR-QD-203 closed for the other two whole-payload reasons. Every exit is now one
closed `HydrationEvent`, projected once to the counters and the hook
(`HydrationEvent.ts`), and the rule lives in the projection's `PayloadRefused`
arm rather than at each call site (CCR-QD-398, ARCH-60).

```
REQUIREMENT: The counts MUST be readable with no wiring.
```

The counts live in the **default registry**: the writer is off fiber and names
`Context.empty()`, and the reader names it too (`valueUnsafe(Context.empty())`), so
the two agree whatever `MetricRegistry` a host wired on a fiber (ADR-QD-052,
amended). That is what lets a panel read these the way it reads `portActivity`,
with no wiring. Hydration runs where no Effect
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

> **Amended in CCR-QD-430 (ARCH-86).** The closed set is the keys of that one table, in
> declaration order, which is the metric's preregistered order and the devtools panel's row
> order, so a reason added as a row reaches both at zero
> ([ADR-QD-152](../decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md)).

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
// packages/core/src/UntrustedDecode.ts
export const untrustedDecoder: <S extends Schema.ConstraintDecoder<unknown>, R extends { readonly _tag: string } = never>(
  schema: S,
  options?: UntrustedDecoderOptions<S["Type"], R>,
) => UntrustedDecoder<S["Type"], R>;
export const MAX_DECODE_DEPTH: number;
```

```
REQUIREMENT: `hydrateDecisions` MUST reject a structurally-too-deep entry before
             any recursive `Schema` decode touches it, and MUST drop it the same
             way the other six hydrate-side reasons are dropped rather than let
             the decode raise.
```

`decodeEntryFields` and `decodePolicy` both recurse through a `Schema.suspend`
shape — `DehydratedEntryFields`'s `trace` and `PolicySchema` itself — with no
depth cap of its own, the same gap `Policy.ts`'s `fromJson`/`fromJsonValue` and
`SinkCodec.ts`'s `decodeSinkRecord` guard against for the identical reason: an
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
             after — mirroring `SinkCodec.ts`'s `decodeSinkRecord` order for the
             identical trust boundary.
```

A depth check that ran after either decode would already have let `Schema`
recurse into the offending shape, which is exactly the crash this exists to
prevent. `exceedsJsonDepth` walks the parsed entry with an explicit
array-backed stack, so the guard itself cannot be what overflows.

```
REQUIREMENT: `hydrateDecisions` MUST reach the depth guard through
             `untrustedDecoder`, which `@qadi/core` exports with
             `MAX_DECODE_DEPTH`; the walk itself (`exceedsJsonDepth`,
             `DecodeDepthGuard.ts`) is package-private to `@qadi/core`.
```

This section once required the walk to be reachable from `@qadi/core`'s barrel,
because `@qadi/react` was a third consumer that needed a depth guard and had no
reason to reach into core's module layout. That is restated (ARCH-78, CCR-QD-421):
`@qadi/react` no longer assembles a guard at all. It reaches the whole recipe, the
guard, the strict options and the closed refusal, through the decoder, so the
barrel exports the decoder and the bound and not the walk (ADR-QD-143). The
property this section protects, that an entry is guarded before any recursive
decode touches it, is unchanged and is now a property of the decoder
([INV-QD-305](../invariants.md#inv-qd-305-every-untrusted-json-seam-is-guarded-by-construction)).

## BEH-QD-268: A payload is versioned, and only version 2 is read

> **See:** [ADR-QD-078](../decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md)

```ts
export type DehydratedDecisions = {
  readonly version: 2;
  readonly subjectId?: string | undefined;
  readonly entries: ReadonlyArray<DehydratedEntry>;
};
```

```
REQUIREMENT: `dehydrateDecisions` MUST write `version: 2`. `hydrateDecisions` MUST
             read a payload with that version, and MUST drop a payload whose
             `version` is anything else, or absent, as
             `UnsupportedPayloadVersion`.
```

> **Amended in CCR-QD-182 (0.11.0).** The requirement read: "…`hydrateDecisions`
> MUST read a payload with that version, and a payload with NO `version` (the
> format that predates it), and MUST drop a payload whose `version` is anything
> else as `UnsupportedPayloadVersion`." The heading read "A payload is versioned,
> and an older one is read as withheld". The version-1 reader was deprecated in
> 0.10 for removal in the next minor, and is removed
> ([ADR-QD-078](../decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md)'s
> 2026-10-06 amendment), with `DehydratedDecisionsV1`, `DehydratedEntryV1` and
> their union `DehydratedPayload`.

A page cached by one deploy and hydrated by the chunks of the next carries a format
the other end has not heard of. Today's handling was already fail-closed — an
older client dropped a newer entry as `MalformedEntry` and re-decided — but
indistinguishable from a real malformation for the length of the rollout. The
version names the cause.

A payload with no `version` is what `@qadi/react` 0.9 and earlier wrote. Until
0.11.0 it was read, every entry seeded `Withheld` — a version-1 trace was
indistinguishable in kind from a real one. It is now refused whole like any
other version this client does not read: the same drop reason, counted and
reported, so no new reason, metric key or devtools meaning exists for it, and
the page re-decides those questions itself.

> **Withdrawn in CCR-QD-182 (0.11.0).** A requirement stood here: "An entry read
> from a payload with no `version` MUST be seeded with its disclosure `Withheld`,
> even when the entry carried a `trace`." There is no longer such an entry to
> read.

```
REQUIREMENT: A `Disclosed` trace whose root `policyTag` is not the entry's own
             policy's `_tag` MUST be dropped as `MalformedEntry`.
REQUIREMENT: A `Disclosed` entry whose verdict, `visibleFields`, `obligations`
             or (for a denial) `reason` is not its trace root's MUST be
             dropped as `MalformedEntry`; the comparison is `@qadi/core's`
             `decisionDisagreement` (INV-QD-170). A `Withheld` entry carries
             the only copy of its fields and has nothing to compare.
```

The evaluator's root `trace.policyTag` always equals the policy's `_tag`
(checked across `HasRole`, `HasPermission`, `AllOf`, `AnyOf`, `Not`, `Labeled` and
`Obliged`). A trace that says otherwise is not a trace of this entry's policy —
hand-built, or spliced from another entry — and is refused rather than seeded.

```
REQUIREMENT: The entry's decision fields MUST be derived from `DecisionWire`, not
             restated.
```

`DehydratedEntry.decision` is `DecisionWireAllow`/`DecisionWireDeny` minus
`subjectId` (it lives on the envelope) and `trace`/`reason`/`obligations` where
they do not apply, plus `disclosure`. One definition means a field added to the
wire shape reaches the payload in the same change.

## BEH-QD-269: A malformed envelope is dropped, never thrown on

```
REQUIREMENT: `hydrateDecisions` MUST NOT throw, whatever it is handed. A value that
             is not an object, has no `entries` array, carries an unrecognised key,
             or is otherwise malformed MUST be dropped as `MalformedPayload`, counted
             and reported; one nested past the structural depth guard outside its
             entries is dropped as `PayloadTooDeep` (BEH-QD-488).
```

BEH-QD-230 already said "not throwing is deliberate", and the parameter is typed
`DehydratedDecisions`, but a payload arrives as JSON in a page and `JSON.parse` yields
`any` — so the type protects nothing. Only the entries were ever schema-decoded; the
envelope was read by property access, and `{ subjectId: "u1", entries: 5 }` threw
`TypeError: dehydrated.entries is not iterable`, and `null` threw on `.subjectId`.
The envelope is decoded the way an entry is, through `untrustedDecoder`, with
`entries` unwalked and the version check as its `prepare` step.

```
REQUIREMENT: A refused payload MUST be counted at least once, and every entry
             `hydrateDecisions` could see MUST be either seeded or counted against a
             reason.
```

A payload with no entries to count still moves a counter when it is refused, so a
dashboard sees the refusal at all; and `seeded + Σ dropped` equals the number of
entries visible whenever there are any (INV-QD-045).

## BEH-QD-488: A payload nested past the bound outside its entries is dropped whole

> **Invariant:** [INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for), [INV-QD-306](../invariants.md#inv-qd-306-an-unwalked-slot-is-unknown-and-has-its-own-guarded-decoder)
> **See:** [ADR-QD-143](../decisions/143-untrusted-json-is-decoded-through-one-module.md)

```
REQUIREMENT: `hydrateDecisions` MUST drop a payload nested past
             `MAX_DECODE_DEPTH` outside its `entries` whole, as
             `PayloadTooDeep`, counted and reported under that reason (and
             under no other), before any decode of the payload runs. It MUST
             NOT throw.
```

The guard walks the payload with `entries` left out (`unwalked`,
[INV-QD-306](../invariants.md#inv-qd-306-an-unwalked-slot-is-unknown-and-has-its-own-guarded-decoder)),
because each entry is guarded from its own root and an entry nested past the bound
is `EntryTooDeep`, not `PayloadTooDeep`. Before ARCH-78 the two were not told apart:
an excess envelope key, a `subjectId` or an array payload nested past the bound was
`MalformedPayload`, which says the payload is not an envelope and not that it is too
deep. The guard runs before `prepare`, so a payload that is both too deep and of
the wrong version is `PayloadTooDeep`, and a shallow array is still
`MalformedPayload`. The reason is a whole-payload one, so it is counted at least
once even when the payload shows no entries (BEH-QD-269).

## BEH-QD-686: The hydrate side reports its drops from one record of buckets

> **Invariant:** [INV-QD-385](../invariants.md#inv-qd-385-every-hydration-drop-reason-has-one-stated-source-and-one-reporting-path), [INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for)
> **See:** [ADR-QD-183](../decisions/183-hydration-drop-events-are-derived-from-their-buckets.md)

```
REQUIREMENT: `hydrateDecisions` MUST collect every entry it drops into one
             record keyed by every entry drop reason and built for that call,
             and MUST report and count each non-empty bucket as exactly one
             `EntriesDropped` event carrying that bucket's entries, followed
             by one `Seeded` event. An entry whose fields disagree with its
             policy MUST be collected under `MalformedEntry`.
```

The engine used to keep one named array per reason and write one emission line for
each, so a reason given an array and no line compiled, and its entries reached no
event and no count. A record keyed by the reason union cannot be built without a
bucket for every reason, and the events are derived from it by one function, so a
bucket without its event does not exist. No type checks that code collects an entry
under a reason; `HydrationDropEvents.test.ts` shows it. An entry whose fields
disagree with its policy goes through the same key as any other malformed entry, so
it is neither a special case nor a second path to the event.

## BEH-QD-687: The dehydrate side reports what it left out from one record of buckets

> **Invariant:** [INV-QD-385](../invariants.md#inv-qd-385-every-hydration-drop-reason-has-one-stated-source-and-one-reporting-path), [INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for)
> **See:** [ADR-QD-183](../decisions/183-hydration-drop-events-are-derived-from-their-buckets.md)

```
REQUIREMENT: `dehydrateDecisions` MUST check each entry's subject before it
             encodes the entry: an entry for another subject MUST be collected
             under `ForeignSubject` and never encoded, and one whose policy
             cannot be encoded MUST be collected under `UnencodablePolicy`.
             Each non-empty bucket MUST be exactly one `LeftOut` event,
             followed by one `Dehydrated` event counting the entries written.
```

The subject check runs first, so an entry that is both foreign and unencodable is
`ForeignSubject` and is never handed to the encoder. The entries it writes are the
ones in neither bucket, in their input order, and the subject of the payload is the
subject of the first entry offered.

## BEH-QD-688: Every whole-payload refusal reason has one stated producer

> **Invariant:** [INV-QD-385](../invariants.md#inv-qd-385-every-hydration-drop-reason-has-one-stated-source-and-one-reporting-path), [INV-QD-323](../invariants.md#inv-qd-323-each-hydration-drop-reason-has-exactly-one-kind-and-the-kinds-partition-the-reasons)
> **See:** [ADR-QD-183](../decisions/183-hydration-drop-events-are-derived-from-their-buckets.md)

```
REQUIREMENT: Every reason that refuses a payload whole MUST name what raises
             it, one of the payload decoder's refusals or the subject check.
             `hydrateDecisions` MUST refuse a payload under the reason its
             producer's row names, as exactly one `PayloadRefused` event with
             no buckets. A whole-payload reason with no producer MUST NOT
             compile.
```

A payload refusal is exclusive: one reason, never a partition of entries, so it has
no bucket and its source is a row of the payload producer record. The inverse
direction, from a decoder refusal to its reason, is typed against that record, so a
producer named by two rows or by none does not compile, and a refusal the decoder
gains is a missing property. The compiler checks that each reason names a producer
and each producer has its slot; it cannot check that a call site raises the
producer, which the conformance test, driving one refusal per row, shows instead.

## BEH-QD-689: Drop events are emitted in an order declared once per side

> **Invariant:** [INV-QD-386](../invariants.md#inv-qd-386-each-side-declares-its-drop-event-order-once-and-the-order-is-total)
> **See:** [ADR-QD-183](../decisions/183-hydration-drop-events-are-derived-from-their-buckets.md)

```
REQUIREMENT: `hydrateDecisions` MUST emit its drop events in the order
             `EntryTooDeep`, `MalformedEntry`, `UndecodablePolicy`, then
             `Seeded`; `dehydrateDecisions` MUST emit `ForeignSubject`,
             `UnencodablePolicy`, then `Dehydrated`; whatever order the entries
             were refused in.
```

The order is react's own, stated once per side as the key order of the side's bucket
constructor, and it is not the order of `@qadi/core`'s reason table
(`MalformedEntry`, `UndecodablePolicy`, `EntryTooDeep`): a reporter sees the events
in the order it always has. A bucket that is empty gives no event, and entries
within one event keep the order they were offered in.

## BEH-QD-690: Every bucketed entry is counted once under its reason

> **Invariant:** [INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for), [INV-QD-385](../invariants.md#inv-qd-385-every-hydration-drop-reason-has-one-stated-source-and-one-reporting-path)
> **See:** [ADR-QD-183](../decisions/183-hydration-drop-events-are-derived-from-their-buckets.md)

```
REQUIREMENT: Every entry collected in a bucket MUST be counted exactly once,
             under that bucket's reason, and reported once, in that bucket's
             event. The events, their order and their counts MUST equal those
             the engine gave before its drops were collected in records, for
             every input.
```

The change that collected the drops in records was a refactoring, not a behaviour
change: a characterisation of every drop event, written against the engine as it
was, passes on both sides of it, and no existing row of it has had its expected
values changed. It pins each reason alone, every pair and all three, the entries
that disagree with their policy, each whole-payload reason and each dehydration
reason alone and together, with the exact events, the reporter calls and the metric
deltas.

---

_Previous: [18 — Policy Explanation](./18-explanation.md)_
