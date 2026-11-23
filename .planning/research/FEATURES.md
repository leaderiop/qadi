# Feature Landscape

**Domain:** Internal architecture deepenings of an Effect v4 authorization library (Qadi), milestone v1.9 Arch Wave 14 (Phases 77-80, ARCH-124..127, strictly serial)
**Researched:** 2026-11-23
**Scope:** Only the four new changes. "Users" here are (a) host applications that import `@qadi/audit`, `@qadi/devtools`, `@qadi/react`, and (b) the maintainers' own test and spec suites, which are the pinned behaviour.
**Overall confidence:** HIGH for what exists today (read from source and tests, one defect reproduced). MEDIUM for the recommended shapes (design choices, not facts).

Note on sources: `.planning/phases/_WAVE14-CONTEXT.md` is cited by PROJECT.md:34 but does not exist on disk (checked). Everything below comes from the code, the tests, `spec/`, and PROJECT.md. Paths are relative to `/Users/mohammadalmechkor/Projects/Perso/qadi`.

---

## Reading guide

For each phase: **Pinned** (must not move; each row is a test or spec line that will fail if it does), **Table stakes** (the change is not done without it), **Edge cases the new interface must decide** (each needs an explicit decision recorded in the phase's ADR, because today the answer is implicit), **Differentiators**, **Anti-features**, **Public export impact**.

Complexity: Low (< 1 plan), Med (1-2 plans), High (3+ plans or a human checkpoint).

---

# Phase 77 - `@qadi/audit`: an audit row is a value only its codec makes (ARCH-124)

**Complexity:** Med-High. Small code, wide blast radius: every test and fixture that builds an `AuditEntry` by spread (about 35 sites in 9 test files, grep `sequenceNumber:`), plus `features/features/wire-versions/wire-versions.steps.test.ts`.
**Breaking:** Yes (host-constructed `AuditEntry` literals stop compiling). Amends ADR-QD-110 (`spec/decisions/110-an-archives-facts-are-computed-once.md`).

## The live defect, confirmed (do this RED first)

`archiveAuditTrail` calls `verifiedArchiveFacts(entries)` only (`packages/audit/src/AuditArchive.ts:115`). `archiveFacts` reads `sequenceNumber` and nothing of `record` (`packages/audit/src/ArchiveFacts.ts:104-130`). `readAuditArchive` then runs every entry through `decodeAuditEntry` (`AuditArchive.ts:300-306`) and refuses with `EntryNotDecodable`.

I reproduced it with a throwaway vitest file (deleted afterwards). Each entry was a one-entry archive built from `encodeAuditEntry(decisionRecord({}))`:

| Hand-built entry | Type-valid? | `archiveAuditTrail` | `readAuditArchive` of its own output |
|---|---|---|---|
| `{...e, record: {...e.record, at: NaN}}` | **yes** | succeeds | `EntryNotDecodable` index 0, `Malformed: Expected number at ["at"]` |
| `record.version = 3` | cast | succeeds | `EntryNotDecodable`, `UnsupportedVersion {version: 3, supported: [2]}` |
| `record.subjectId = 5` | cast | succeeds | `EntryNotDecodable`, `Malformed: Expected string at ["subjectId"]` |
| `record = {}` | cast | succeeds | `EntryNotDecodable`, `UnsupportedVersion` |

The `at: NaN` row needs no cast, so this is reachable by a host with correct types (an `at` computed from a bad clock). Consequence: a purge is blocked, the exact failure ADR-QD-110 describes for `sequenceNumber` (`spec/decisions/110-...md`, Decision bullet 6, D-48-g). ADR-QD-110 fixed one domain (the sequence number) and left the other (the record) open. The `ArchiveRoundTrip.test.ts` property "the writer refuses what the reader would refuse" is scoped to `sequenceNumber` only (`packages/audit/test/ArchiveRoundTrip.test.ts:259-309`). Phase 77's RED test is the same property over the record domain.

## Pinned (must keep, exactly)

| Behaviour | Where it is pinned |
|---|---|
| Writer fails `SequenceNumberInvalid` (index, number) **before** any gap check; reader and writer agree over the whole `number` domain | `spec/behaviors/33-audit-pipeline.md:757-763`, `ArchiveRoundTrip.test.ts:259-309` |
| Writer stores sequenced entries by number (stable), unsequenced after, in the order given; never sorts by `at` | `33-audit-pipeline.md:765-771`, `ArchiveFacts.test.ts:38-52` |
| `sequenceIntegrityVerified` is exactly `sequencedCount >= 2` | `33-audit-pipeline.md:772-783`, `ArchiveFacts.test.ts:54-79` |
| Each `ArchiveRefusal` member and payload unchanged (`TooDeep`, `Malformed`, `UnsupportedArchiveVersion`, `EntryNotDecodable{index,refusal}`, `CountMismatch`, `SequenceBroken`, `NotInSequenceOrder`, `UnbackedClaim`), checked in that order | `AuditArchive.ts:154-163`, `ADR-QD-110` "refusal vocabulary unchanged" (D-48-e) |
| Span name `qadi.audit.verifySequenceIntegrity` under both `archiveAuditTrail` and the public check | `ArchiveFacts.ts:158` |
| An entry nested past the bound is `EntryNotDecodable` at its index with `TooDeep`, never `TooDeep` of the bundle | `33-audit-pipeline.md:1077-1099` (BEH-QD-489) |
| Row decode is `refuse` at the row's own top level (excess key is `Malformed`, one nested past the bound is `TooDeep`); the **record** tolerates an unknown top-level key, however deep, and refuses an unknown key one level down | `33-audit-pipeline.md:1100-1125` (BEH-QD-625), `UntrustedSeams.test.ts:136-250`, ADR-QD-170 |
| The entry holds the strict decode's **JSON form**, byte for byte; an unknown envelope key is dropped by the decode, not by a second lenient read | `AuditEntry.test.ts:433-476`, changeset `.changeset/audit-entry-decoded-once.md` |
| Wire version 2 only; a pre-0.10 row is `UnsupportedVersion{version: undefined}`, never upgraded | `33-audit-pipeline.md:208-212`, `AuditEntry.test.ts:373-431` |
| `at: 1e400` reads as Malformed, not `Infinity` | `AuditEntry.test.ts:266-273`, `33-audit-pipeline.md:204-207` |
| 60,000-deep row is typed `TooDeep`, never a `RangeError` | `AuditEntry.test.ts:195-206` |
| `JSON.stringify(entry.record)` equals the SSE frame data and forwarding's `send` value for one record | `AuditEntry.test.ts:208-227` |
| `planPurge` needs a `VerifiedArchive`, obtainable only from `readAuditArchive`; the type is nominal (`#counts`) so an object literal is not assignable | `Retention.tst.ts:15-23`, `AuditArchive.tst.ts:10-17`, `AuditArchive.ts:186-220` |
| `holds()` counts by **structural equality**: a row read back from a store matches the archived one, a row edited after archiving does not, two identical rows need two archived copies | `Retention.test.ts:198-232`, `AuditArchive.ts:213-219` |
| Partition identities (`retained ∪ expired`, `purge ∪ retain`) over NaN/Infinity timestamps | `Retention.test.ts:278-364`, INV-QD-053, INV-QD-101 |

## Table stakes

| Feature | Why expected | Complexity | Notes |
|---|---|---|---|
| `archiveAuditTrail` can no longer write a bundle `readAuditArchive` refuses, over the **record** domain too | The defect above; the package's own agreement property (BEH-QD-254 "reader accepts every bundle the writer writes") is currently false | Low | Either route works: the brand makes the bad row unconstructible, or the writer refuses. The brand is the milestone's choice; keep a writer-side refusal only if the brand can be bypassed (see edge case 1) |
| `AuditEntry` is obtainable only from `encodeAuditEntry` and `decodeAuditEntry` | The milestone goal; makes archive, retention and facts "trust a row" | Med | Type-level brand vs nominal class is a decision (edge case 1) |
| Host can still assign a `sequenceNumber` after `encode` | `sequenceNumber` is *by design* assigned by the caller's store after encode (`AuditEntry.ts:72-78`, README "autoincrement column"). A brand that forbids `{...entry, sequenceNumber: n}` with no replacement removes the documented flow | Low | Needs a named, codec-owned way: read the row back through `decodeAuditEntry` (the documented flow, README.md:140-170) or a new `withSequenceNumber(entry, n)` that validates `Schema.Int` |
| Archive, retention and facts stop re-checking a row | Milestone goal | Low | `Retention.ts:81` reads `entry.record.at` and guards `Number.isFinite`; see edge case 3 |
| Decode is envelope-first, as `decodeStoredRecord` is | Milestone goal; `SinkCodec.ts:590-651` is the model: `untrustedDecoder(envelope, {unwalked:["record"]})` then `decodeSinkRecord(record)` | Med | Today it is record-first: `AuditEntry.ts:152-157` guards `record`, decodes it, then decodes the row |
| RED test first, then GREEN | PROJECT.md:18-20 | Low | Property over arbitrary record fields: writer refusal set equals reader refusal set |

## Edge cases the new interface must decide

1. **Brand strength.** A `Schema.brand` is type-level only, and a TypeScript spread of a branded object keeps the phantom brand property, so `{...entry, record: {...entry.record, at: NaN}}` would still typecheck as branded. That is exactly how 6 sites in `Retention.test.ts` (lines 18-25, 199, 207, 215) and `ArchiveRoundTrip.test.ts:41-47` build rows today. "Only its codec makes" is only true if the type is nominal: the repo already has the pattern (`VerifiedArchiveImpl`'s `#counts`, `AuditArchive.ts:186-239`, pinned by `AuditArchive.tst.ts`). A `#private`-style class also has to keep **structural `Equal`/`Hash`** or `holds()` and `planPurge`'s `MutableHashMap` break (`Retention.test.ts:232`). Core already chose `Data.Class` for the analogous `StoredRecord` (ADR-QD-171 D-01) and rejected `Schema.TaggedClass` for constructor cost (AGENTS.md section 7). Recommendation: decide this first; whichever is picked, add a negative type pin with a positive twin (`NOT_CALLABLE_PIN_BUDGET`, AGENTS.md section 6) so the pin can be seen to fail, and update the budget table.
2. **Does `JSON.stringify(entry)` still yield exactly the stored bytes?** A store persists `JSON.stringify(entry)` (`AuditEntry.ts:13-24`). A class instance must not add or hide own enumerable keys, and `sequenceNumber: undefined` must stay absent after the round trip (`AuditEntry.test.ts:231-244` asserts "Absent, not present-and-undefined").
3. **The fate of `undated`.** `RetentionPlan.undated` and `PurgePlan.undated` exist because a row's `at` could be non-finite (`Retention.ts:50-54, 81-84`; INV-QD-101 at `spec/invariants.md:2415-2420`). If the codec refuses non-finite `at`, `undated` is unreachable for a codec-made row. Two options: keep the field and the guard as a fail-closed deletion selector (a purge selector should not trust a type; `Retention.test.ts:80-125` pins NaN, +-Infinity), or delete the field (Breaking, removes INV-QD-101's second clause). Retention tests build non-finite rows by hand (`entryWithAt`, line 18), so removing `undated` also removes the only way to test it. Recommend: **keep the guard**, state it as defence in depth for a hostile in-process value, and keep the tests by constructing through a test-only escape that is itself counted. If instead the guard goes, INV-QD-101, BEH-QD-253 and `spec/overview.md:777` must change in the same commit (AGENTS.md section 11).
4. **Envelope-first changes refusal text for malformed rows.** Pinned today: `{}`, `5`, `null`, `[]` refuse as `Malformed{message: "an audit row has no record"}` (`AuditEntry.ts:152`, `UntrustedSeams.test.ts:141-142, 227`), and `record: 5|null` refuses with the long `Expected {... "_tag": "Decision" ...}` message (`UntrustedSeams.test.ts:229-236`). An envelope-first strict decode gives `Expected object` / `Missing key at ["record"]` instead (compare `SinkCodec.ts:667-674` doc: "`Expected object` for a non-object, `Missing key`"). Decide: accept the new messages (update A11, A12 and the BEH-QD-312 prose) or keep the old string for the no-record case. Tags must not move.
5. **Order of refusal when both row and record are bad.** Record-first today: a row with an excess key *and* a bad record reports the record's refusal. Envelope-first reports the row's. `UntrustedSeams.test.ts:158-162` pins "excess row key holding a value nested past the bound -> `TooDeep`" with a valid record, which holds either way, but a combined case has no test. Add one so the new order is stated, not accidental.
6. **A hand-built entry from a host that still arrives** (an old store row spread, or a mock in a host's tests). With the brand, it fails at compile time. At runtime from untyped data it must go through `decodeAuditEntry`; say so in the changeset. The `AuditTrailPortTest` doubles and `AuditPortReply` scripts receive entries from the sink, so they are unaffected (`AuditTrailPortTest.ts:37-44`).
7. **Should the writer also re-validate (belt and braces)?** If the brand is type-level only, an `as`-cast or untyped host data still reaches `archiveAuditTrail`. A cheap decode per entry would make the agreement property unconditional but costs one record decode per row on a batch job and restates the rule (the thing ADR-QD-110 removed). Recommend: no re-decode in the writer, nominal type is the guarantee; the RED property test covers it.

## Differentiators

| Feature | Value | Complexity | Notes |
|---|---|---|---|
| One property test, record domain, mirroring `ArchiveRoundTrip.test.ts:259-309` | Makes the agreement unconditional and keeps it from drifting again | Low | Generate record fields from the same hostile set (`NaN`, `+-Infinity`, huge, wrong tag, wrong version) |
| `VerifiedArchive.entries` typed as the branded entry | The evidence a purge reads is itself codec-made | Low | Already follows if `holds`/`entries` use `AuditEntry` |
| Mutation score held on `ArchiveFacts.ts`, `AuditArchive.ts`, `Retention.ts` | ADR-QD-110 left one survivor, the `Malformed` message literal (`110-...md` Consequences) | Med | Envelope-first moves that literal into the strict decode; it may go away |
| A short upgrade note in the 0.13/0.14 guide: "rows from your store go through `decodeAuditEntry`" | The only migration | Low | |

## Anti-features

| Anti-feature | Why avoid | Instead |
|---|---|---|
| `Schema.TaggedClass` for the entry | Constructor parses the whole policy per evaluation; measured and rejected (AGENTS.md section 7, ADR-QD-135) | `Data.Class` or a private-field class typed by the schema's `Type` |
| Re-decoding the record in `archiveAuditTrail` | Restates the rule ADR-QD-110 centralised; O(n) decodes on a batch job | Trust the nominal type |
| Silently dropping or repairing a bad row in the writer | The package's rule is "refuses rather than approximates" (`AuditEntry.ts:93-97`) | Typed refusal or unconstructible |
| Changing `ArchiveRefusal` members or `ARCHIVE_VERSION` | Pinned vocabulary; no bundle format change is needed | Leave both |
| Making `sequenceNumber` writable only by `@qadi/audit` | `@qadi/audit` never has cross-restart write order (`AuditEntry.ts:72-78`, BEH-QD-252) | A codec-owned setter the host calls |
| Raising a new `unknownKeys: "ignore"` on the row | BEH-QD-625 states the row and archive envelopes are `refuse` | Keep `refuse` |

## Public export impact (`@qadi/audit`, barrel `packages/audit/src/index.ts:1-16`, `export *`)

| Export | Change |
|---|---|
| `AuditEntry` (schema + type, `AuditEntry.ts:80-84`) | Type becomes nominal/branded. **Breaking** for any host that builds a literal. The schema's `Type` is also what `Schema.decodeUnknownEffect(AuditEntry)` returns (`AuditEntry.test.ts:310-320`); decide whether that test survives (it pins "the row schema alone is a description, not a reader") |
| `encodeAuditEntry`, `decodeAuditEntry` | Same names and result shapes. `decodeAuditEntry` messages may change (edge case 4) |
| `archiveAuditTrail`, `readAuditArchive`, `VerifiedArchive`, `AuditArchive` | `AuditArchive.entries` is `ReadonlyArray<AuditEntry>` (branded). `JSON.parse(JSON.stringify(archive))` is still the read-back input, typed `unknown` |
| `planRetention`, `planPurge`, `RetentionPlan`, `PurgePlan` | Entry types branded; `undated` fate (edge case 3) |
| `AuditTrailPort.write`, `AuditStagingPort.stage`, `AuditWriteOutcome`, `AuditTrailPortTest`, `AuditStagingPortTest` | Parameter and member types become the branded entry; no runtime change |
| New: a sequence-number setter (name to be chosen) | Additive. `spec/overview.md` must list it (gate 13, AGENTS.md section 15), plus a probe in gate 14 |

Spec rows to update together: BEH-QD-312 (`33-audit-pipeline.md:180-253`), BEH-QD-254, BEH-QD-253, INV-QD-097/101/130/054, ADR-QD-110 (amend, do not rewrite), `spec/overview.md:777`, `spec/traceability.md`, `packages/audit/README.md:140-170`.

---

# Phase 78 - `@qadi/devtools`: `TimelineStore` owns its capacity (ARCH-125)

**Complexity:** Med. Small production diff; large pinned surface (TF1-TF29, M11, M15, L3).
**Breaking:** Type-level only (`TimelineStore` gains a member). Keeps ADR-QD-137. No behaviour change intended.

## What exists

`makeTimelineFeed` builds a fresh inner `TimelineStore` on every capacity change and mirrors it through a second store `view` so the host's reference is stable (`packages/devtools/src/model/TimelineFeed.ts:126-142, 176-189`). That is the "six-member forwarder": `timeline` (`:135-142`) re-exposes `subscribe`, `getSnapshot`, `accept`, `clear`, `setPaused`, `isPaused`. The "abandoned subscription" is `inner.subscribe(push)` on the old inner, never removed (`:178-180`). The store itself has no way to change its capacity (`TimelineStore.ts:43-45`, `capacity` is read once into `emptyTimeline(options)`).

## Pinned (must keep, exactly)

| Behaviour | Where |
|---|---|
| The host's `timeline` object is the same object across a capacity change | TF4 (`TimelineFeed.test.ts:130-148`), M11 (`DockModel.test.ts:407-432`), BEH-QD-481 prose `28-devtools-screens.md:1039-1043, 1469` |
| A capacity change **empties** the timeline, then **re-reads the source** (same or new) into the new bound; the dock's tab, filters, explorer and role choices survive | TF4, M11, M15(c) (`DockModel.test.ts:595-613`), BEH `28-devtools-screens.md:1039` |
| Capacity is compared by **raw identity of the input**, an omitted one reads `undefined`, so `configure({source})` after `{capacity: 5}` counts as a resize | `TimelineFeed.ts:176`, spec `28-devtools-screens.md:2537-2540` |
| Configuring the same source and capacity reads nothing and notifies nothing | TF2 |
| A resize publishes the emptied timeline **first**; a listener that throws on it does not stop the refill read: `configure` rethrows after the read has started | TF26, TF27 (`TimelineFeed.test.ts:543-590`), `TimelineFeed.ts:185-189` (try/finally) |
| A status listener throwing on the `Reading` a resize publishes over `Stopped` replaces the timeline listener's throw and starts no read | TF29 (`:616-`), TF14 `:310` |
| Pausing notifies timeline listeners with the snapshot it already held; no change of `getSnapshot` identity | TF7 (`:182-196`), `TimelineStore.test.ts:104-114` |
| `clear` while paused also resumes; `clear` keeps the capacity | `TimelineStore.test.ts:157-176`, `TimelineStore.ts:63-67` |
| A store's own listeners all run, then the throw is rethrown (one value as itself, several as one `AggregateError`) | TF25 (`:523`), ADR-QD-177, `ExternalStore.ts:63-84` |
| `idleTimeline` is one empty snapshot nothing can change | TF8 (`:198-215`) |
| Closed feed: `configure` and `restart` read nothing, publish nothing | TF17, TF18, TF24 |
| Non-integer or negative capacity throws from `emptyTimeline` | `Timeline.ts:~68-74`; zero is legal (`Timeline.test.ts:33`) |

## Table stakes

| Feature | Why expected | Complexity | Notes |
|---|---|---|---|
| `TimelineStore` gains a resize command; `makeTimelineFeed` returns the store itself as `timeline` | Milestone goal; deletes the forwarder, the mirror `view`, and the abandoned subscription | Med | The feed keeps its read supersession; only the store/forwarder layer changes |
| Resize = empty + new bound + **one** notification | Today one `push()` publishes once (`TimelineFeed.ts:186`); two notifications would double-render hosts and break M11/TF4 listener counts | Low | Must also clear a freeze (see edge case 2) |
| `accept` after a resize is bounded by the new capacity | TF4 `:144-147` (`capacity` 2, three records, two kept) | Low | |
| `idleTimeline` gets an inert `resize` | It is typed `TimelineStore` (`TimelineFeed.ts:106-113`) | Low | |
| Same listener-throw semantics through one layer instead of two | TF25-TF29 | Med | Verify no double-wrapping: today a throw crosses `inner.notify` then `view.notify`; one layer must give the same single value or the same `AggregateError` |

## Edge cases the new interface must decide

1. **Resize to the same effective capacity.** `undefined` and `DEFAULT_TIMELINE_CAPACITY` resolve to the same bound (`TimelineFeed.ts:95-96`, `Timeline.ts` default), but the feed compares raw inputs, so `configure({capacity: undefined})` after `{capacity: 25}`-equal-to-default currently empties and re-reads for no visible difference. Decide: does the *store's* `resize(n)` no-op when `n` equals the current capacity (and publish nothing), while the *feed's* identity rule still decides whether to re-read? Recommended: store-level no-op on equal effective capacity; feed keeps "omitted reads as `undefined`" so spec `28-devtools-screens.md:2537-2540` stays true, and state the interaction in one sentence. Add a test (none exists for equal effective capacity).
2. **Resize while paused.** Today a new inner store is unpaused, so a resize resumes (and `isPaused()` flips to `false`), through one `push()`. This is unstated and untested (`TimelineStore.test.ts:157` only tests `clear`). Decide and pin: recommend resize behaves like `clear` (resume), because `clear` already "also resumes, rather than freezing an empty view" and the pause froze a buffer that no longer exists.
3. **Invalid capacity (`NaN`, `-1`, `1.5`, `Infinity`).** Today `configure` assigns `inputs = next` *before* building the new store (`TimelineFeed.ts:174-179`), so a throw from `emptyTimeline` leaves `inputs` updated, the old store live, and the read not restarted: a latent half-applied state. The resize command should validate before mutating and leave the store untouched on refusal; decide throw vs typed result (the house rule is a thrown `Error` from `emptyTimeline` today, `PortCalls.test.ts:510-511` for the sibling).
4. **Resize to 0.** Legal ("keep nothing"). `bound` slices from a clamped offset; resize(0) then `accept` must keep an empty list and still dedupe/notify correctly (`Timeline.ts` `bound`). No test covers `accept` at capacity 0 through the store.
5. **Resize to a *larger* capacity: empty or keep?** The pinned rule is "a capacity change MUST empty the timeline" (`28-devtools-screens.md:1039`), with the source re-read as the refill. A smarter "grow keeps entries, shrink truncates newest" is a differentiator, not table stakes, and breaks TF4/M11/M15(c) and L3 (`TimelineLifetime.test.tsx:119`). Do not change in this phase.
6. **Where the "re-read" lives.** The store resizes; the feed still decides to restart the read after it. Keep the order: resize (publishes emptied timeline) then `readSource`, inside the same try/finally so TF26/TF27 hold.
7. **`useTimelineStore(options)` ignores a changed `capacity`** (`useTimeline.ts:90-91`, `useState(() => makeTimelineStore(options))`). With a resize command this becomes fixable. Decide: leave as is (documented "survives re-render with different arguments"), or call `resize` on a changed `capacity`. Recommend leaving it and recording why, to keep the hook a no-op on options (scope).
8. **Public type.** `TimelineStore` is exported as a type (`index.ts:134`); a host that implements the type (a test double) gets a compile error for the missing `resize`. `makeTimelineStore` itself is package-private (ADR-QD-173 D-04), so no runtime constructor is lost.

## Differentiators

| Feature | Value | Complexity |
|---|---|---|
| `DockModel.timeline` and `TimelineFeed.timeline` are the same value the feed built, so `model.timeline === feed.timeline` is directly testable | Removes a layer a reader had to trace | Low |
| A direct `TimelineStore.test.ts` section for resize (equal, paused, 0, invalid, notifications) instead of only feed-level tests | The command is now the store's own, so its tests move down to where mutation scoring (TimelineStore held at the model's bar) measures it | Low-Med |
| Mutation score on `TimelineFeed.ts` held at 1 (v1.4 measured 1, PROJECT.md:337) | The deletion should not lower it | Med |

## Anti-features

| Anti-feature | Why avoid | Instead |
|---|---|---|
| Truncate-on-resize ("keep the newest N") | Contradicts the pinned "empty then re-read" and `28-devtools-screens.md:1039` | Keep empty-and-refill |
| A second subscription or mirror "for compatibility" | The point of the phase | The feed returns the store |
| Changing the throw ordering (publish then read) | TF26-TF29 pin the window | Keep try/finally |
| Making the store aware of sources or reads | Source reading is the feed's; ADR-QD-137 scope | Store: capacity only |
| Resizing through `clear()` with a flag | Muddles `clear`'s "keeps the capacity" pin (`TimelineStore.test.ts:167`) | Separate `resize` command |

## Public export impact (`@qadi/devtools`)

`TimelineStore` (type) adds a member: type-level Breaking for implementers. `TimelineFeed`, `TimelineFeedInputs`, `makeTimelineFeed` unchanged here (Phase 79 changes them). `README.md` and `spec/overview.md:873-874` describe the feed; no new export, so gate 13 (`check-api-surface.mjs`) has nothing to add beyond a changed row.

---

# Phase 79 - `@qadi/devtools`: feeds and the dock model are configure-only (ARCH-126)

**Complexity:** High. Touches three public factories, the dock model, three hooks, the dock props, four pinned suites, gate 14 probes and the README. Opens with a characterisation test, per PROJECT.md:28-29.
**Breaking:** Yes (`makeTimelineFeed(init)`, `makeDiagnosticsFeed(init)`, `makeGatesFeed(init)` lose their argument). Amends ADR-QD-137 and ADR-QD-173.

## What exists

Each feed and the dock model take inputs twice: at build (`init`) and in `configure`, and each hand-writes its own "did it move" rule:

| Owner | Build input | Restart rule today | Where |
|---|---|---|---|
| Timeline feed | `init?: {capacity, source}` | `capacity !== before.capacity` => resize + re-read; else `source !== before.source` => re-read | `TimelineFeed.ts:126-127, 171-191` |
| Diagnostics feed | `init?: DiagnosticsOptions` | `undefined` => off; start if `before === undefined` or `layer`, `collector` or `intervalMillis` identity moved | `DiagnosticsFeed.ts:150, 175-193, 205` |
| Gates feed | `init?: {gates, questions, intervalMillis}` | re-watch if `gates !== registryNow` **or `watchFailure !== undefined`**; re-read + restart cadence if `questions` or `intervalMillis` moved | `GatesFeed.ts:~118, 262-274` |
| Dock model | `init?: DockModelInputs` | spreads to the three feeds, `catalogue` identity, `simulation.setPorts`, then `shownReading.refresh()` | `DockModel.ts:186, 280-302` |
| Derived store (the reference rule) | n/a | per-field identity over own enumerable string-keyed fields; a field on one side only counts as a change | `ExternalStore.ts:134-142, 166-` |

The dock's input type is written three times: `DockModelInputs` (`DockModel.ts:73-92`), `UseDockModelInput` (`useDockModel.ts:28-37`) and `DevtoolsDockProps` (`DevtoolsDock.tsx:~66-155`, same eight names plus host-only `unknownParents`, `onInvalidate`). Three hooks repeat "scope, then configure" (`useTimeline.ts:58-64`, `useDiagnostics.ts:38-44`, `useDockModel.ts:51-57`); `useSimulationSession.ts:69` shares only the scope half.

## Pinned (must keep, exactly)

| Behaviour | Where |
|---|---|
| An equal inline `diagnostics` literal on re-render builds the layer **once** (K1); a fresh literal holding the same field references restarts nothing and notifies nothing (F12); a changed `layer`, `collector` or `intervalMillis` each restart exactly once (F13) | `DiagnosticsLifetime.test.tsx:145-171`, `DiagnosticsFeed.test.ts:296-331` |
| StrictMode builds the layer twice and releases the first, in the hook and in the dock (H1, K4); hidden-then-shown samples afresh from `Starting` (H2, K5); `undefined` options release the layer, defined again start a fresh run (H3, K3) | `DiagnosticsLifetime.test.tsx:72-143, 190-250` |
| `configure(undefined)` is **Off**, a different state from `configure({})` (metric reads only, Live) | F10, F11, F26, F2 |
| A closed feed's `configure` and `restart` read nothing, publish nothing, and leave a `Stopped` feed `Stopped` | F25, TF24, G35, G36 |
| **A registry whose `subscribe` threw is subscribed again by a `configure` with the *same* registry** (an exception to pure per-field identity) | **G43** (`GatesFeed.test.ts:665-693`), `GatesFeed.ts:262-267` |
| A registry that mends without announcing stays `Failed` until something reads it again | G44 (`:695`) |
| `configure` with a throwing registry applies in full and never throws; old subscription released once | G41 (`:570`), G42 |
| One `configure` publishes one snapshot and reads no registry the host has handed away | G47 (`:786`) |
| Same thunk and interval: reads nothing; a new interval reads at once and re-times the cadence | T4, T8 (`:220, :306`) |
| A subscriber that reconfigures inside its own notification leaves the newest run live | TF21-TF23, F28, F29 (ADR-QD-150 / `SupersedingRun.ts`) |
| A throwing listener does not silence the next; `configure` rethrows after the work | TF25-TF29, F30-F32, G48 |
| The dock: a new timeline reaches every screen once; `configure` dispatches only inputs whose identity moved; an unchanged `ports` or `catalogue` wipes no capture or half-filled form | `DockModel.test.ts` (M1-M17, P1), ARCH-63, `DockModel.ts:13-18` |
| Store order: diagnostics reading, then questions join, then services cards, built before any host listener | `DockModel.characterisation.test.ts:274-356` |
| The dock model's stores are exactly the nine listed | `DockModel.test.ts:1727-1760`, BEH-QD-700 (`28-devtools-screens.md:1068-1086`) |
| Gate 14 builds `makeTimelineFeed({source})`, `makeGatesFeed()` and `makeGatesFeed({gates})`, `makeDiagnosticsFeed()` and `makeDiagnosticsFeed({})` through the packed `exports` map and fails if a `make*Feed` is left unprobed | `scripts/check-package-install.mjs:653, 680-681, 711-712` |
| `surface.tst.ts` pins `makeTimelineFeed()` / `makeDiagnosticsFeed()` / `makeGatesFeed()` return types and `makeDiagnosticsFeed({intervalMillis})` | `packages/devtools/test/surface.tst.ts:302-305` |

## Table stakes

| Feature | Why expected | Complexity | Notes |
|---|---|---|---|
| `makeTimelineFeed()`, `makeDiagnosticsFeed()`, `makeGatesFeed()`, `makeDockModel()` take no inputs; inputs arrive only through `configure` | Milestone goal | Med | A feed built and never configured is the **idle** state: timeline reads nothing, diagnostics `Off`, gates `Unwatched`/`Unhanded` |
| One per-field identity rule decides a restart, the one `makeDerivedStore` uses (`sameFields`) | Today four hand-written rules drifted (the gates feed's failed-watch retry, the diagnostics `undefined` branch, the timeline's capacity-then-source ladder) | Med-High | Extract the helper next to `sameFields` (`ExternalStore.ts:134`) and have each feed ask "which fields moved" |
| One package-private hook that does "scope, then configure" | Milestone goal; three copies today | Med | Must apply the first `configure` **inside the same layout effect that builds** (see edge case 1) |
| Dock input type stated once | Three copies today | Low | `DevtoolsDockProps` = that type plus host-only fields; `UseDockModelInput` and `DockModelInputs` become aliases or are deleted |
| Characterisation test of diagnostics' first-render sequence, committed **before** the change | PROJECT.md:28-29 | Low | Record the exact sequence of `status` snapshots a reader sees from the pass before the feed exists to the first `Live` |
| Gate 14, README (`README.md:183-220`), `spec/overview.md:847-919`, `surface.tst.ts` updated in the same change | AGENTS.md sections 11, 15, 16 | Med | `makeGatesFeed(host)` in the README example is a build-time input today |

## Edge cases the new interface must decide

1. **First-render flash of the unconfigured state.** Today `useDiagnostics` builds the feed *with* options, so the feed's first snapshot is `Starting`, matching `idleDiagnostics(options)`'s `IDLE_STARTING` (`DiagnosticsFeed.ts:150-155, 205`). `useScoped` does `setValue(built)` in a layout effect (`useScoped.ts:28-35`), and the hook's own `configure` effect runs a commit later (`useDiagnostics.ts:42-44`). If the feed is built unconfigured, a reader committed on that intermediate pass sees `Off`, then `Starting`: a one-pass lie that `DiagnosticsNotice`'s stop ledger and the dock's "announced" ref (`DevtoolsDock.tsx`, `StopLedger`) can latch on. The single hook must therefore **configure before it publishes the value** (call `configure(inputs)` inside the build effect, before `setValue`), and the characterisation test must show no `Off` between `Starting`-on-idle and `Starting`-on-feed. This is the highest-risk edge in the milestone.
2. **Configure before the first render / on a closed scope.** After the hook change, a `configure` can reach a feed before any subscriber exists, and after close. Closed already returns at once (F25, TF24, G35); keep it. Decide that a `configure` before anything subscribes is **not** coalesced away: it must still start the read (a headless shell calls `makeX()` then `configure(...)` with no subscriber).
3. **`undefined` vs `{}` vs absent (diagnostics).** `configure(undefined)` is Off, `{}` samples. With "per-field identity" a plain `sameFields(before, next)` over `DiagnosticsOptions` would treat `undefined -> {}` as "no field moved". The restart rule must have a separate first-class "was off / is off" transition. Pin with F1, F10, F11, F26.
4. **The gates feed's retry-on-failed-watch exception (G43).** A pure per-field rule says "same registry, nothing moved". G43 and G41 require a re-subscribe because the *state* (`watchFailure`) is part of the effective key. Decide: either the "one rule" takes a key that includes the failure marker, or G43 is deliberately restated as the one documented exception. Do not drop G43 silently. Same for the timeline: a `Stopped` feed with the same source does **not** re-read on `configure` (F6/TF15 use `restart`, `restart()` is the explicit command), so a stopped read is not part of the key there; state the asymmetry.
5. **Omitted input reads as `undefined`** (`configure` replaces the whole set; spec `28-devtools-screens.md:2535-2540`). Keep. In particular `configure({source})` after a capacity was set is a resize (interacts with Phase 78 edge case 1).
6. **Derived-store key must not take optional fields.** `makeDerivedStore<K extends object & Required<K>>` refuses a key with an optional field (`ExternalStore.ts:~163-166`, doc "the compiler refuses a key type with an optional field"). If the shared rule is typed against input objects like `DockModelInputs` (all optional), it needs its own signature or a normalising step. Decide whether the rule compares own enumerable string keys (as `sameFields`) or declared fields; an inline literal with an *extra* undefined key (`{capacity: undefined}` vs `{}`) is "a field on one side only counts as a change" in `sameFields` (`ExternalStore.ts:134-142`) and would restart a timeline for no reason. Normalise omitted to `undefined` before comparing.
7. **`intervalMillis` crosses feeds.** The dock passes `diagnostics?.intervalMillis` to the gates feed (`DockModel.ts:227-231, 293-297`). The one rule must not restart the gates cadence when only `diagnostics.layer` changed.
8. **`shownReading.refresh()` after every dock configure** (`DockModel.ts:301`) is today unconditional; with one rule it can become "only if `diagnostics` or `reading` moved". Do it only if the characterisation tests (notify-once, `DockModel.characterisation.test.ts:49-90`) stay green.
9. **Dock inputs vs host-only props.** `unknownParents` and `onInvalidate` never reach the model (`DevtoolsDock.tsx` `HostProps`). Keep that split in the single type.
10. **`useScoped` comment** says later inputs "arrive as commands, which is how every owner here takes its props" (`useScoped.ts:43-44`): after this phase that sentence becomes literally true; update it rather than leave history.

## Differentiators

| Feature | Value | Complexity |
|---|---|---|
| One exported-from-package-private helper, `changedFields(before, after)`, shared by `makeDerivedStore`'s refresh and the feeds | A new input field is covered by one definition; a mutation test over it covers all four owners | Med |
| `useSimulationSession` also built on the one hook | It already uses `useScoped`; removes a fourth near-copy | Low |
| A headless shell example in the README that is two lines: `const feed = yield* makeTimelineFeed(); feed.configure({source})` | Makes the new contract the documented one | Low |
| A property test: for any two input objects, `configure(a); configure(b)` starts the same number of runs as comparing by `sameFields` | Pins "one rule" so a fifth owner cannot drift | Med |

## Anti-features

| Anti-feature | Why avoid | Instead |
|---|---|---|
| Keeping `init` as an optional argument "for compatibility" | Two ways to say the same thing is the defect; the owner's standing rule is most-complete, compat is never the tiebreaker (project memory) | Remove it; record Breaking |
| Deep or structural comparison of `source`, `layer`, `collector`, `catalogue`, `ports` | Identity is the pinned rule (F12, K1); a deep walk of a policy tree is the cost the timeline comments avoid | Per-field identity |
| Configuring after `setValue` in the hook | Reintroduces the first-render flash (edge case 1) | Configure in the build effect |
| A restart rule that peeks at the feed's `Stopped` state to auto-retry | A stop must be stated and restart is an explicit command (`DiagnosticsFeed.ts:138-142`, TF15) | Keep `restart()` |
| Merging `diagnostics` and `gates` configure into one feed | Separate lifetimes, separate failure statements (ADR-QD-169) | Keep three feeds |
| Adding a new store to the model for "inputs" | BEH-QD-700 counts stores; the list test fails | Inputs are not a store |

## Public export impact (`@qadi/devtools` root, `src/index.ts:25-30, 49-51, 128-133`)

| Export | Change |
|---|---|
| `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` | **Breaking**: signature loses `init`. Return types unchanged. Gate 14 probes and `surface.tst.ts:302-305` must be rewritten (the `makeDiagnosticsFeed({intervalMillis})` pin becomes a `configure` pin) |
| `TimelineFeedInputs`, `GatesFeedInputs` (types) | Stay (they type `configure`); doc loses "given" |
| `DiagnosticsOptions` | Stays; `configure(options \| undefined)` unchanged |
| `@qadi/devtools/react` `DevtoolsDockProps` | Same props; now derived from the one input type. Not Breaking if the shape is equal |
| `useTimeline`, `useDiagnostics` | Same signatures |
| `DockModel`/`makeDockModel` | Package-private (ADR-QD-099): not an export change |
| Specs/docs | ADR-QD-137 and ADR-QD-173 (amend), BEH-QD-700 unchanged count, BEH `28-devtools-screens.md:2515-2545` ("`makeTimelineFeed(inputs?)` MUST build the feed...") rewritten, `spec/overview.md:847, 873-874, 918-919`, `packages/devtools/README.md:26-27, 183-220`, `scripts/check-package-install.mjs:653-712` |

---

# Phase 80 - `@qadi/devtools` + `@qadi/react`: a headless lens session (ARCH-127)

**Complexity:** High. A new model-owned session (a tenth store), a thinned DOM adapter, a decision on a public `@qadi/react` field. Pinned DOM tests are heavy.
**Breaking:** `@qadi/react` `QadiContextValue.instrument` removal is Breaking for readers of the context; the devtools side is package-private (`useLens`, `Lens.ts` are not exported).

## What exists

`useLens(instances)` (`packages/devtools/src/react/useLens.ts:43-122`) holds three `useState`s (`highlighted`, `picking`, `picked`), two effects (draw; pick listeners) and four callbacks, and is called by `QuestionsPanel` (`QuestionsPanel.tsx:106`), so the state dies with the panel. `Lens.ts` is pure DOM (`boxOf`, `boxesOf`, `drawLens`, `clearLens`, `gateIdAt`). The model already carries every guard for the lens: `QuestionsSnapshot.instances` (`Gates.ts:296` "every guard for the lens"). `QadiContextValue.instrument` (`QadiProvider.tsx:51-62`) is set at `:307-308` and read by no source file (grep over `packages/*/src`: only the provider writes it; `useQadiContext` callers destructure `atoms`, `registry`, `gates`).

## Pinned (must keep, exactly)

| Behaviour | Where |
|---|---|
| `highlight(ids)` **replaces** what was drawn; `clear()` empties; `[]` is how a caller clears | `useLens.ts:107-113`, `Lens.test.ts:184-197` |
| `togglePicking` flips picking **and resets `highlighted` and `picked`**, both entering and leaving | `useLens.ts:115-119` |
| While picking, `pointermove` highlights the nearest guard under the pointer, or `[]` over nothing guarded (including over the dock itself) | `useLens.ts:67-73`, `QuestionsPanel.gates.test.tsx:292` |
| `click` (capture phase) on a guard: `preventDefault` + `stopPropagation`, picking off, highlight cleared, `picked = id`. On **no** guard: nothing is swallowed, the dock's own controls keep working, picking stays on | `useLens.ts:75-86`, `QuestionsPanel.gates.test.tsx:310-380` |
| `Escape` ends picking and clears the highlight; `picked` is **not** reset | `useLens.ts:88-92`, `QuestionsPanel.gates.test.tsx:382-392` |
| Three exits: pick, Escape, **unmount**; unmount also removes every overlay | BEH-QD-234 (`28-devtools-screens.md:559-640`, the "three" requirement), `QuestionsPanel.gates.test.tsx:252-265, 394-` |
| The highlight draws only instances that are measurable; a hook (no element) is enumerable but not locatable and is not offered a highlight | `Lens.ts:82-90`, `QuestionsPanel.tsx:~225-232`, `QuestionsPanel.gates.test.tsx:226-250` |
| The overlay is `pointer-events: none`, `aria-hidden`, positioned in document coordinates; an empty guard gets a caret | `Lens.test.ts:151-208` |
| A guard is found by **element identity**, walking up from the element under the point, nearest first; never by a selector | `Lens.ts:~170-189`, `Lens.test.ts:232-320`, BEH-QD-234 |
| The row of `picked` reveals itself from its own ref (`scrollIntoView({block:"nearest"})` on `picked` becoming true) and carries `data-qadi-picked` | `QuestionsPanel.tsx:242-270` |
| A quiet tick redraws nothing; a lens that follows `instances` is not rebuilt by a tick | BEH `28-devtools-screens.md:2043`, INV `spec/invariants.md:4042` |
| `@qadi/react` calls no DOM API; every DOM call stays in `@qadi/devtools` | AGENTS.md section 13, `Lens.ts` header |
| Dock model stores are exactly the listed set | `DockModel.test.ts:1727-1760`, BEH-QD-700 |
| Tabs keep their own state across a switch | INV-QD-107 (cited in `DockSession.ts:19-22`) |

## Table stakes

| Feature | Why expected | Complexity | Notes |
|---|---|---|---|
| A headless session with `toggle`, `hover`, `choose`, `cancel`, `highlight`, `clear` and a snapshot `{ highlighted, picking, picked }` | Milestone goal; the six actions are exactly `useLens`'s callbacks and listener bodies | Med | Pure, no `document`; tested without rendering (AGENTS.md section 13 "test the graph, not the DOM") |
| `choose(id)` is resolved against the **current** gate instances and **returns whether it found a guard** | The adapter needs that boolean to decide whether to swallow the click (`useLens.ts:77-82`); resolving inside the session removes the stale-`instances` closure that today re-subscribes document listeners on every instance change (`useLens.ts:105`) | Med | |
| `useLens` shrinks to the DOM adapter: measure, draw, hit-test, three listeners, no `useState` | Milestone goal | Med | Listeners attach only while `picking`; draw effect still runs after React commits (`useLens.ts:48-62` comment) |
| The session is owned by the dock model and added to the pinned store list | "owned by the dock model" (PROJECT.md:30) | Med | A tenth store: update `DockModel.test.ts:1743-1753`, BEH-QD-700 ("nine of them"), INV-QD-390, ADR-QD-185's count; the list test fails otherwise |
| Panel unmount still ends picking and clears the overlay | BEH-QD-234 "three exits" | Low | The model outlives the panel (a tab switch unmounts `QuestionsPanel`); the adapter's cleanup must call `cancel()` + `clear()`, or those two pinned tests fail |
| `QadiContextValue.instrument` removed **or** its keep-reason recorded | Milestone goal | Low | Edge case 6 |
| Existing pinned panel and `Lens.ts` tests pass unchanged | The change is internal | Med | `QuestionsPanel.gates.test.tsx`, `Lens.test.ts`, the two `QuestionsPanel.characterisation` suites |

## Edge cases the new interface must decide

1. **A picked gate id whose guard unmounted.** Today `picked` is a bare string kept until the next `togglePicking` (`useLens.ts:85, 118`); `InstanceRow` simply never matches (`QuestionsPanel.tsx:236`) and nothing says the pick went away. The codebase has a precedent for this exact situation: `HeldChoice` (`Empty | Listed | Evicted`, `spec/behaviors/28-devtools-screens.md:1100-1115`) and `Selection.Evicted` ("A selection lost to capacity MUST say so", `27-devtools-timeline.md:484`). Recommend `picked` reads as held-by-id against the current instances, with an explicit `Evicted` state, **not** auto-cleared (clearing would erase the user's choice on a registry blip) and **not** silently kept. Decide and add a test; none exists.
2. **`highlight(ids)` containing an id with no instance.** Today the draw filter just drops it (`useLens.ts:56`), `highlighted` keeps it. Decide whether the session stores what was asked or what resolves; recommend: store what was asked, resolve at draw time against current instances (so a guard that remounts re-lights), matching today and the "lens follows instances" requirement.
3. **`hover(id)` for an id not in the instances**, and `hover(undefined)`. Today the DOM adapter only produces ids from `gateIdAt(…, instances)`, so it cannot happen. A headless interface can be called with anything; decide: unknown id behaves as "over nothing" (`highlighted = []`).
4. **Hover while not picking; `choose` while not picking.** Today the listeners do not exist when `picking` is false. A session called directly must ignore both (otherwise a stray `choose` sets `picked` outside the mode).
5. **`choose` on a hook (an instance with no element).** `gateIdAt` only matches elements, so a hook can never be picked off the page; but `choose(id)` headless could name one. Decide: allowed (it is a real instance, the row reveals) or refused (not locatable). The pinned `highlight` refusal is for locatability, not for choosing.
6. **`toggle` resets `picked`**, so a previously picked row loses its mark the moment the next pick begins, and also when picking is **left** by toggling off. `Escape`/`cancel` does *not* reset it. Keep both exactly; they are a pair of distinct commands in the session.
7. **Where the lifetime ends.** Session in the model's scope: closing the dock must clear overlays (they live in `document`, outside React). Decide the owner of that: the adapter's effect cleanup (current behaviour: `clearLens` in the draw effect cleanup, `useLens.ts:59-61`) is the only place that touches `document`, so the model's scope cannot. State it.
8. **Two panels, one session.** A model-owned session is shared; today each `QuestionsPanel` mount has its own lens. Only one panel uses it, so no behaviour changes, but a second consumer would share picking state: say so.
9. **Session snapshot identity.** `useStoreSnapshot` needs a stable reference between changes (`TimelineStore.ts:27-34` doc). `togglePicking` on an already clear state must publish **one** change, `highlight([])` over `[]` none (compare `DockSession`'s "a command that changes nothing publishes nothing", `DockSession.test.ts:289-310`).
10. **`QadiContextValue.instrument`: remove, or record why it stays.** Facts: (a) the field is public via the barrel (`packages/react/src/index.ts` `export * from "./QadiProvider.tsx"`; `spec/overview.md:570`), so removal is Breaking for a host reading `useQadiContext("x").instrument`; (b) no source file reads it, the gate writer is resolved once from the `instrument` **prop** (`QadiProvider.tsx:207-208`) and read from `GateScopeContext`, not from the public context (ADR-QD-111 D-49-a, `111-...md:40, 100-110`); (c) the one reason to keep it is the doc "a test can turn it on without touching process state" (`QadiProvider.tsx:55-61`), which is true of the **prop**, not the context field. Recommend removal (Breaking minor for `@qadi/react`, listed in the changeset), with the context type shrinking to `{ atoms, registry, gates }`; spec rows `spec/overview.md:570`, ADR-QD-111 note, and the doc at `QadiProvider.tsx:89-93` (which names `instrument` as a field `useQadiContext` callers read) update together. If the owner wants it kept, record "readable by tooling to know whether the subtree is instrumented" and add the first reader (none today), or the unread field stays a lie.

## Differentiators

| Feature | Value | Complexity |
|---|---|---|
| The session resolves against instances read from the model's `questions` snapshot, so the adapter passes no `instances` at all | Removes the closure that tears down and re-adds the document listeners on every registry change (`useLens.ts:105`) | Med |
| `picked` exposed as a held value with `Evicted`, and the panel marks an evicted pick (e.g. "picked guard is gone") | Matches `Selection`/`HeldChoice` precedent; closes a silent gap | Med |
| The panel's `scrollIntoView` stays a ref effect but is driven by `session.picked`, now a model fact a second panel could read | Keeps the "no string lookup" rationale | Low |
| Mutation-scored session module held at 1 like `DockModel.ts` (ADR-QD-168) | New logic is small and pure, so it is cheap to kill every mutant | Med |

## Anti-features

| Anti-feature | Why avoid | Instead |
|---|---|---|
| Moving `document` listeners, `gateIdAt` or `clearLens` into the model | The model is headless and server-safe (`src/index.ts` doc; `useLens.ts:9-12`) | Adapter keeps every `document` reference inside an effect |
| Putting `picked` or `highlighted` in React state in the panel as well | AGENTS.md section 13: no React state for what the model owns | Read the session through `useStoreSnapshot` |
| A `DOM` field on the session (the element, the box) | Instances carry `element: unknown` precisely so the model never knows what one is (`Lens.ts` `isMeasurable` doc) | Session holds ids only |
| Auto-clearing `picked` when its guard unmounts | Erases a user choice on a transient registry change; `HeldChoice` precedent is `Evicted`, not clear | State the eviction |
| Exporting the session from the barrel | `src/index.ts` is "the interface" (feeds, session, wiring); `useLens` and `Lens.ts` are package-private today (BEH-QD-234 note, ADR-QD-099) | Keep package-private; dock model member only |
| Letting `choose` swallow the click inside the session | The session has no event | Return a boolean; the adapter calls `preventDefault`/`stopPropagation` |
| Keeping `instrument` "just in case" with no reader | An unread public field is documentation that can be wrong | Remove it (edge 10) |

## Public export impact

| Package | Export | Change |
|---|---|---|
| `@qadi/devtools` | Lens session, `useLens`, `Lens.ts` | None public. `DockModel` gains a member (package-private) |
| `@qadi/devtools` | BEH-QD-700 | "nine" becomes "ten"; `DockModel.test.ts` list gains the member |
| `@qadi/react` | `QadiContextValue.instrument` | **Breaking** if removed (type + runtime field) |
| `@qadi/react` | `useQadiContext` | Return type shrinks |
| Spec | BEH-QD-234 (add the session's own requirements), BEH-QD-700, INV-QD-390 count, ADR-QD-185 (amend), ADR-QD-111 note, `spec/overview.md:570` | |

---

# Cross-phase dependencies and ordering

```
77 (audit)   independent of 78-80; goes first because it may hide a live defect
78 (resize)  -> 79 (configure-only): 79's timeline rule must treat "omitted capacity = undefined" and the store-level
                no-op on equal effective capacity that 78 decides. Do 78 first.
79 (configure-only) -> 80 (lens session): 80 adds a store to the model and a member the single input type must not
                gain; 80's session reads the model's `questions` snapshot, which 79's one-rule configure feeds.
80 uses nothing from 77.
```

Shared files that serialise the work: `packages/devtools/src/model/TimelineFeed.ts` (78, 79), `DockModel.ts` (79, 80), `DockModel.test.ts` store list and BEH-QD-700 (80 only), `useTimeline.ts`/`useDiagnostics.ts`/`useDockModel.ts` (79), `spec/overview.md` devtools rows (78, 79, 80), `scripts/check-package-install.mjs` (79).

# MVP recommendation

Prioritise (each is a phase):
1. **77**: RED property test, then nominal `AuditEntry`, envelope-first decode, keep the retention fail-closed guard. Highest value (live defect), lowest risk to devtools.
2. **78**: `resize` on the store; delete forwarder, mirror, abandoned subscription; pin the three undecided edges (equal capacity, paused, invalid).
3. **79**: characterisation test first; configure-only; one `changedFields` rule with G43 as a stated key; one hook that configures before publishing.
4. **80**: lens session as the model's tenth store; `useLens` as the DOM adapter; remove `instrument` (Breaking, recorded).

Defer: truncate-on-resize, grow-keeps-entries, a structural identity rule, exporting the lens session, any change to `ArchiveRefusal` or the archive version.

# Confidence

| Claim | Level | Basis |
|---|---|---|
| The writer/reader disagreement over `record` is real | HIGH | Reproduced in a scratch vitest run (4 of 4 rows; `at: NaN` type-valid) |
| Pinned behaviour lists | HIGH | Read from source and from test titles/bodies, with file:line |
| Spread bypasses a type-level brand | HIGH | TypeScript semantics; `Retention.test.ts` and `ArchiveRoundTrip.test.ts` already rely on spread to build rows |
| First-render `Off` flash under configure-only | MEDIUM | Derived by tracing `useScoped.ts:18-47`, `useDiagnostics.ts:38-46` and `DiagnosticsFeed.ts:150-205`; not run. The characterisation test is exactly the way to settle it |
| Resize-while-paused currently resumes | MEDIUM | Derived from `TimelineFeed.ts:179` (a new unpaused inner store); no test pins it |
| Half-applied state on an invalid capacity | MEDIUM | Derived from `TimelineFeed.ts:174-179` ordering; not run |
| `instrument` has no reader | HIGH for `packages/*/src` (grep), MEDIUM for `examples/` and `website/` (not exhaustively searched) |
| Recommended shapes | MEDIUM | Design judgement; each needs the phase's decision record |

# Gaps

- `.planning/phases/_WAVE14-CONTEXT.md` and the review HTML are not on disk; the planner should not expect either.
- Not searched: `examples/**` and `website/**` for `AuditEntry` literals, `instrument` readers, or `makeXFeed(init)` calls (the grep over packages, features and the README found only the sites listed). Run a repo-wide grep at plan time.
- I did not run the devtools or react suites, so the Phase 78 and 79 "currently" claims marked MEDIUM are code-trace, not observed.
- Mutation baselines for `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `DockModel.ts` and the audit modules should be measured at the start of each phase (house rule: each phase re-closes its scoped mutation compare).

## Sources

All first-party, read from the working tree at branch `arch-wave-14` (HEAD `ab8ccb75`):
- `packages/audit/src/{AuditEntry,AuditArchive,ArchiveFacts,Retention,SequenceIntegrity,index}.ts`; `packages/audit/test/{AuditEntry,UntrustedSeams,ArchiveRoundTrip,ArchiveFacts,AuditArchive,Retention,helpers}.test.ts`, `Retention.tst.ts`, `AuditArchive.tst.ts`
- `packages/core/src/SinkCodec.ts:590-651` (envelope-first model)
- `packages/devtools/src/model/{TimelineFeed,TimelineStore,Timeline,DiagnosticsFeed,GatesFeed,DockModel,DockSession,ExternalStore}.ts`, `src/react/{useLens,Lens,useTimeline,useDiagnostics,useDockModel,useScoped,QuestionsPanel,DevtoolsDock}.ts(x)`, `src/index.ts`
- `packages/devtools/test/model/{TimelineFeed,TimelineStore,DiagnosticsFeed,GatesFeed,DockModel,DockModel.characterisation,DockSession}.test.ts`, `test/react/{Lens,QuestionsPanel.gates,DiagnosticsLifetime,TimelineLifetime,useTimeline,useDiagnostics}.test.ts(x)`, `test/surface.tst.ts`
- `packages/react/src/QadiProvider.tsx`, `src/index.ts`
- `spec/behaviors/33-audit-pipeline.md`, `spec/behaviors/28-devtools-screens.md` (BEH-QD-234, 700, 466, and the timeline feed section at ~2515), `spec/invariants.md` (INV-QD-101, 107, 130), `spec/decisions/{110,111,137,171,173}-*.md`, `spec/overview.md`
- `scripts/check-package-install.mjs:653-712`, `AGENTS.md`, `.planning/PROJECT.md`
