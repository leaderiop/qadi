# Architecture Research: v1.4 Arch Wave 9 (Phases 37-42, ARCH-84..89)

**Domain:** Effect v4 authorization library, six deepenings of an existing pnpm monorepo
**Researched:** 2026-11-14, against base `637c0601` (branch `arch-wave-9`; HEAD `bb48bbfb` adds only planning files)
**Confidence:** HIGH for 37, 38, 39, 41 (read every named file and the ADRs, checked budgets and gates); MEDIUM for 40 (one real design choice: how audit gets the record's JSON form from one decode); MEDIUM for 42 (the review's shape works, but a cheaper shape exists and the ADR conflict is narrower than `_WAVE9-CONTEXT.md` says)

Method: read `_WAVE9-CONTEXT.md`, `_SHARED-CONTEXT.md`, `PROJECT.md`, AGENTS.md and ADRs 037, 039, 052, 095, 096, 099, 103, 110, 116, 123, 137, 143, 148 and 149. Then read every source file named in the review's evidence, the tests that pin them, `scripts/check-house-style.mjs` budgets and the stryker scopes. I ran no tests and did not run `madge`; every "no cycle" claim below is read from the import lines, so each phase must still run `pnpm circular`. Nothing here reproduces the review's latent defect in Phase 41.

## Recommended Architecture

Wave 9 adds no new package and no new public service. Each phase moves one fact to one owner and deletes the copies. Three of the six (38, 39, 40) live in `@qadi/core` leaves that are public through `export *`; two (37, 41) are package-private devtools modules; one (42) is a react-internal restructuring.

```
@qadi/core (leaves, imports only effect + type-only)         downstream readers
┌──────────────────────────────────────────────┐
│ SinkWire.ts   WireVersion, WIRE_VERSIONS,    │──► SinkCodec.ts (schema literals, encoder, version check)  [38]
│               DecodeRefusal (+ describer) [40]│──► devtools Source.ts: passes DecodeRefusal through       [40]
│ HydrationMetrics.ts  one keyed drop table [39]│──► react HydrationEvent.ts / HydrationEngine.ts           [39]
│                                              │──► devtools model/Hydration.ts (reads, unchanged)
└──────────────────────────────────────────────┘
@qadi/audit  AuditEntry.decodeAuditEntry: one decode of record [40]
@qadi/devtools model/ (headless, package-private modules)
┌──────────────────────────────────────────────┐
│ SupersedingRuns.ts (new) [37]                │◄── TimelineFeed / DiagnosticsFeed / SimulationSession
│ ValueText.ts (new)       [41]                │◄── Filters / Remedies / Inspect / SimulationForm / react QuestionsPanel
└──────────────────────────────────────────────┘
@qadi/react
┌──────────────────────────────────────────────┐
│ SeededQuestion (own file, recommended) [42]  │◄── QadiAtoms.ts (one call, no callback)
│ HydrationEngine.ts keeps payload plan only   │──► type-only SeedSlot from SeededQuestion
└──────────────────────────────────────────────┘
```

### Component Boundaries (what each phase creates, changes, deletes)

| Phase | New | Modified | Deleted | Public surface |
|-------|-----|----------|---------|----------------|
| 37 | `devtools/src/model/SupersedingRuns.ts` (name is the planner's; package-private) | `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `SimulationSession.ts` | per-store `generation`/`closed`/`FiberHandle.make`/finalizer/failure-check code | none |
| 38 | none (constant lives in existing leaf) | `core/src/SinkWire.ts`, `SinkCodec.ts` | `WIRE_VERSION` const in `SinkCodec.ts:453`, four hand-typed `2` | one new core export if the constant is exported (see 38) |
| 39 | none (table lives in `HydrationMetrics.ts`) | `core/src/HydrationMetrics.ts`, `react/src/HydrationEvent.ts`, `react/src/HydrationEngine.ts` (two small regions) | the two hand unions, hand list `hydrationDropReasons`, react's two hand unions, `MEANINGS` as a separate table (fold into the one table) | new type names in core (see 39); existing names keep their meaning |
| 40 | core describer in `SinkWire.ts` (no new file) | `core/src/SinkWire.ts`, `SinkCodec.ts` (decode-once seam), `devtools/src/model/Source.ts`, `devtools/src/index.ts`, `audit/src/AuditEntry.ts` | `reasonOf`, `MalformedReason`, `recordJsonOf`, the second decode | **Breaking** devtools (`MalformedReason`, `onMalformed`); core addition |
| 41 | `devtools/src/model/ValueText.ts` (package-private; name is the planner's) | `Filters.ts`, `Remedies.ts`, `Inspect.ts`, `SimulationForm.ts`, `react/QuestionsPanel.tsx` | four local `render`/`stringify`/`outsideUnion` guards | none |
| 42 | `react/src/SeededQuestion.ts` (recommended extraction; checkpoint decides) | `HydrationEngine.ts` (lines 600-779 leave), `QadiAtoms.ts` (`seededDecision` collapses) | the `computedFor`-receives-`seededIn` inversion, the `track` callback, `DECISIONS_KEY` stays in `QadiAtoms.ts` or moves with the question | none intended |

## Per-phase integration

### Phase 37: one module for a scoped run that a newer run supersedes (ARCH-84, ADR-QD-150, CCR-QD-428, BEH-QD-521..525, INV-QD-319..320)

**Verified against code.** Three stores hand-write the same protocol, as the review says:
- `TimelineFeed.ts:122-161`: `generation`, `closed`, `FiberHandle.make`, finalizer added after it, `FiberHandle.runtime(reads)<never>()`, `readSource` bumps then forks, `marking.accept` checks `mine`, `onExit` checks `mine === generation && isFailure && !hasInterruptsOnly`.
- `DiagnosticsFeed.ts:170-240`: same, plus `off()` forks `Effect.void`.
- `SimulationSession.ts:350-362, 460-462, 538-544`: same handle and finalizer; `supersede()` is guarded by `Option.isSome(FiberHandle.getUnsafe(runs))`; `start` bumps, commits (a subscriber may supersede during the commit), then forks only `if (mine === generation)`; `land` checks `mine !== generation` after `Effect.exit` instead of using `onExit`.
- No other `FiberHandle` or `generation` in `packages/*/src` besides `audit/src/CircuitBreaker.ts`, which is a different thing (breaker state, not a superseded run) and stays out. Do not try to unify with core's `SharedComputation` `standing` (ADR-QD-132 amended by ARCH-79): different package, different protocol.

**The drift is semantically harmless, and the phase should say so.** `FiberHandle`'s `setUnsafe` interrupts the previous fiber when a new one is installed, and a completed fiber clears itself from the handle (`dist/FiberHandle.js` lines 228-245). So `fork(Effect.void)` on an empty handle installs a fiber that finishes and removes itself: observably the same as the guarded form, one fiber allocation dearer. Recommended decision: the module's single `stop` uses the guarded form, because ADR-QD-137 point 3 already states it ("when the handle holds a fiber"). Pin it with a test of the module's own interface (stop with and without a run). This is my reading of the FiberHandle source; I did not execute it.

**Shape the three stores need** (the API is the planner's, but it must cover these four call patterns or a store keeps its copy):
1. begin a run: bumps the generation synchronously and returns a token (`Timeline.readSource`, `Diagnostics.start`, `SimulationSession.start`).
2. fork into the handle only if the token is still current, because a commit between begin and fork can supersede it (only `SimulationSession.start` needs this; the module should make it the default so the other two get it free).
3. a landing guard for partial results inside a run (`marking.accept` in both feeds) and for the final result (`SimulationSession.land`).
4. an exit hook that fires only for the current run's non-interrupt failure (the verbatim check at `TimelineFeed.ts:150` and `DiagnosticsFeed.ts:221`).
Plus `supersede`/`stop` (bump and interrupt) and `closed`. One finalizer, registered after the handle so it runs first on scope close (the ordering comment is repeated three times today). Constraints: `Effect.fn("qadi.devtools.…")`, no `Effect.fnUntraced` (`UNTRACED_BUDGET` unchanged), no `Context.Service` (closures in a scope), requirements stay `never` on the forked effects (ADR-QD-137 point 5: the run uses the constructing context).

**Import direction.** New module imports only `effect/*` (Cause, Effect, Exit, FiberHandle, type Scope). The three stores import it. No cycle possible. Out of `index.ts`, so ADR-QD-099 and the `devtools-named-barrel` rule need nothing and `spec/overview.md` gate 13 does not move.

**ADRs.** Amends ADR-QD-137 (its point 7 "the rule is general for the package" gains an owner; its 2026-11-12 amendment for the timeline stays true). Must not contradict ADR-QD-047 (headless model) and ADR-QD-137 points 3-5: interruption still happens inside the superseding command, the generation still guards what lands, a run's span stays a root (`{ root: true }` on `land`), and a closed scope leaves the session inert. Also reads ADR-QD-099 (package-private).

**Tests that pin it today, and where they go.**
- `devtools/test/model/TimelineFeed.test.ts` TF3, TF5, TF6, TF9, TF10-TF19 (supersede, close, restart after close, failure vs interrupt, replaced read whose release dies).
- `devtools/test/model/DiagnosticsFeed.test.ts` F6-F10, F16, F17, F24-F27 (restart, replaced layer never Stopped, close records no Stopped, closed feed ignores commands, off twice).
- `devtools/test/model/SimulationSession.test.ts` the "superseded run never lands (C4)", "a superseded run stops at once (ARCH-73)", "closing the session's scope stops its run", "a subscriber that moves the session while a run is announced" and "a run is its own trace" blocks (lines ~305-470).
- Move: write the new module's own test file first (supersede, close mid-run, stop with/without a run, interrupt vs failure, begin-then-superseded-before-fork, a partial result from a replaced run). Then delete from each store test only the cases the module now proves, keeping what each store does with a landed result (TF1/TF2/TF4/TF7, F1-F5, F12-F15, F18-F23, SimulationSession's reading/capture/clock cases). Replace, do not layer: a case proven at the module seam is removed from the store file in the same plan. Roughly 5 + 4 + 25 matching lines shrink, as the review estimates.
- Mutation (XC-05): `stryker.devtools.mjs` mutates `src/model/**/*.ts`, so the new file is in scope automatically and the three stores are too. Record per-file scores at the base (TimelineFeed, DiagnosticsFeed 92.8, SimulationSession 0.9694, from PROJECT.md) and make the new module's tests land before any store test is deleted. A store losing its tests while the module is not yet at ~100 is exactly how a file's score falls.

**Budgets.** None expected to move. `UNTRACED_BUDGET`, `SWITCH_BUDGET` unchanged. Watch `[no-ambient-console]`/forbidden list (nothing relevant).

**Spec/gates to touch.** BEH/INV rows, traceability, `spec/README.md` CCR-QD-428, ADR-QD-150 plus `index.yaml`; `check-devtools-claims.mjs` (gate 12) if any `spec/devtools-spec/` sentence says absence of such a module; a patch changeset for `@qadi/devtools`.

### Phase 38: the sink record wire version stated once (ARCH-85, ADR-QD-151, CCR-QD-429, BEH-QD-526..530, INV-QD-321..322)

**Verified.** `SinkWire.ts:48` `WireVersion = 2`, `:51` `WIRE_VERSIONS = [2]`; `SinkCodec.ts:146, 154` `Schema.Literal(2)`, `:224, 226` `version: 2 as const`, `:453` a second `WIRE_VERSION: WireVersion = 2`, `:470` the decoder's `version === WIRE_VERSION`. Retyping `WireVersion` to `2 | 3` compiles with the encoder still writing 2: confirmed by reading, not run.

**Shape.** One constant in `SinkWire.ts` that every site reads. Recommended form: `WireVersion` derived from a tuple or constant, the write version a named value, `Schema.Literal(thatValue)` in both V2 field structs, the encoder spreads the same value (no `2 as const`), the decoder checks membership in `WIRE_VERSIONS` with `.some(v => v === version)` (a `.includes(unknown)` does not typecheck on a literal tuple). A future v3 is then an edit to the tuple plus a v3 field struct, which is what ADR-QD-096 already promises ("a full-union edit").

**Decision the phase must make: exported or not.** `SinkWire.ts` has no non-public exports: the barrel is `export *` (`index.ts:55`) and ADR-QD-116 forbids re-exports from it. A new exported `WIRE_VERSION` is a public addition: `spec/overview.md` row near line 518 (gate 13), `spec/behaviors/25-inspection.md:839-840` signature block (a ` ```ts ` fence, not compiled), `@qadi/core` changeset (minor if exported, patch if the value is reachable only through the tuple). I recommend exporting it: the encoder side must read the write version by name, and `WIRE_VERSIONS[0]` for "the current one" would break on the first v3. The alternative is a package-private leaf, which adds a file for one constant.

**Not the same version.** `react/src/Hydration.ts:80` and `HydrationEngine.ts:208` read a hydration payload `version: 2`; `audit/src/AuditArchive.ts:78` mentions bundle `version: 2`. These are separate wires (ADR-QD-078, ADR-QD-110). Do not fold them into this constant; the phase should say so in the ADR to stop the next reader trying.

**Import direction.** `SinkWire.ts` is a leaf: imports `effect/Data`, one type from `Decision.ts`, two types from `SinkRecordFields.ts` (ADR-QD-037 counts type-only edges). `SinkCodec.ts` already imports it. Adding a value constant there changes no edge.

**ADRs.** Amends ADR-QD-096 (D-15-b "version", and its "future version 3 is a full-union edit" promise, now mechanical) and touches ADR-QD-095 (the codec owns both directions; the new constant is the one place both directions read). Must not contradict ADR-QD-096's 2026-10-06 amendment (version 2 only, v1 refused with `version: undefined`), ADR-QD-116 (SinkWire stays record-wire words only; no re-export), ADR-QD-143 (decode only through `untrustedDecoder`; `versionThenEnvelope` stays the `prepare`).

**Tests.** Pins today: `core/test/SinkCodec.test.ts` lines 1957-1995 (`UnsupportedVersion({version, supported: WIRE_VERSIONS})`, "the supported version is 2, alone" at 1971), golden V2 byte fixtures (wire bytes must not change), `core/test/SinkCodecAgreement.test.ts`, `core/test/Errors.tst.ts`, `features/features/wire-versions/wire-versions.steps.test.ts`, `audit/test/AuditEntry.test.ts:378`. Add at the seam: a `.tst.ts` pin that `SinkRecordJson["version"]` equals `WireVersion` and the write version is a member of it (this is the test that would have failed on the retype); a runtime property that encode then decode round-trips and the encoder's version equals the constant. Replace, do not layer: keep the existing round-trip and golden tests unchanged (the context says so); "the supported version is 2, alone" can be restated against the constant rather than the literal `[2]`.

**Budgets.** `UNTRUSTED_DECODE_BUDGET` for `SinkCodec.ts` stays 1 (`decodeStoredRecordString`'s `JSON.parse`): do not add any `Schema.decode*` or `onExcessProperty` token. Nothing else moves. Mutation: core mutates all of `src/**`; a new constant mutates a literal, so the round-trip and golden tests must kill it.

**Shared file.** `SinkWire.ts` and `SinkCodec.ts` again in 40. Run 38 first (see build order).

### Phase 39: each hydration drop reason stated once, with its kind (ARCH-86, ADR-QD-152, CCR-QD-430, BEH-QD-531..535, INV-QD-323..324)

**Verified.** `HydrationMetrics.ts`: `DehydrationDropReason` (:48), `ClientHydrationDropReason` (:71), `HydrationDropReason` (:121), hand list `hydrationDropReasons` (:130-140), a second keyed table `MEANINGS` already typed `{ [R in HydrationDropReason]: … }` (:166). `HydrationEvent.ts:85` and `:92` restate the client split by hand, saying so in their own doc. `HydrationEngine.ts:229-250` maps refusals to those two types, and `:517` `bucketOf: Record<EntryDropReason, …>` forces every entry-kind reason to have a bucket (good: a new `entry` reason is already a compile error there).

**Shape.** One keyed const table in `HydrationMetrics.ts` per reason carrying `kind` (`dehydration | payload | entry`), `summary`, `remedy`; fold `MEANINGS` into it (it is already keyed by reason; keeping two tables is the same defect one level down). `HydrationDropReason = keyof` the table; the three kind unions are derived by kind; `DehydrationDropReason` and `ClientHydrationDropReason` keep their names and meaning (public, in `spec/overview.md:322`). `hydrationDropReasons` is `Struct.keys(table)` (effect's `Struct.keys` returns `Array<keyof S & string>`, so no cast). A reason without a `kind` fails `satisfies Record<string, { kind: HydrationDropKind; … }>`.

**Hazards.**
- **Order is observable.** `preregisteredWords: hydrationDropReasons` and `devtools/test/model/Hydration.test.ts:103-104` compare the metric's key order with the list. Key insertion order in the table must stay `ForeignSubject, UnencodablePolicy, PayloadSubjectMismatch, MalformedEntry, UndecodablePolicy, EntryTooDeep, UnsupportedPayloadVersion, MalformedPayload, PayloadTooDeep` (kinds interleave: dehydration, dehydration, payload, entry, entry, entry, payload, payload, payload).
- **Metric key is `type:id:description`** (ADR-QD-052/123). The metric's id, description and label set must not change, or a reader silently reads zero. `[metric-declaration]` requires `Metric.frequency("qadi_hydration_dropped_total", {` on one line; `[metric-table]` checks the row in `spec/behaviors/25-inspection.md`. Both stay green only if the declaration line is untouched.
- **Per-reason JSDoc currently lives on the union members** and documents real distinctions (`EntryTooDeep` vs `MalformedEntry`, `PayloadTooDeep` vs `MalformedPayload`). It must move into the table entries, not vanish.
- **New public type names.** react needs the `payload` and `entry` subsets by name. Either core exports `PayloadRefusalReason`/`EntryDropReason` (public) or a generic `HydrationDropReasonOf<K>` plus `HydrationDropKind`. Both are `spec/overview.md` rows (gate 13) and a `@qadi/core` minor. Recommended: the generic, so a fourth kind is not a new export. react's `HydrationEvent.ts` then declares its two aliases from it (or drops them) and its own doc sentence "Written out rather than `Extract`ed" is deleted.

**Import direction.** `HydrationMetrics.ts` imports only `effect/Metric`. react and devtools import from `@qadi/core` by named import (AGENTS.md §1). No cycle: nothing in core imports hydration.

**ADRs.** Amends ADR-QD-123 (a metric's label set stated once; the word list is now derived) and ADR-QD-052 (hydration counted where both ends can see it; its ARCH-60 amendment says `HydrationEvent.ts` is the one write side). Reads ADR-QD-037 (drop-reason meaning lives in core, `MEANINGS` comment), ADR-QD-143 (`PayloadTooDeep`/`EntryTooDeep` semantics), ADR-QD-078 (payload `version`).

**Tests that pin it today.**
- `core/test/HydrationMetrics.test.ts` (:174 `hydrationDropReasons` equals a written-out list; :220-260 per-reason summary/remedy pins and uniqueness; the five `qadi_hydration_*` literal pins), `core/test/HydrationMetrics.tst.ts` (`hydrationDropMeaning` takes exactly `HydrationDropReason`; `isHydrationDropReason`).
- `react/test/Hydration.tst.ts:90-91` pins `PayloadRefusalReason | EntryDropReason` equals `ClientHydrationDropReason` and are disjoint: this is the partition test and it moves to core, stated over the kind table.
- `react/test/HydrationEvent.test.ts`, `react/test/HydrationCounts.test.ts:210`, `features/features/hydration-counts/…`: iterate `hydrationDropReasons`; unchanged.
- `devtools/test/model/Hydration.test.ts:109` `assert.strictEqual(hydrationDropReasons.length, 9)`: this hand count is the completeness pin the table replaces. Delete it, and keep the order check at :103. Replace, do not layer: a hand-written `REASONS` list in `HydrationMetrics.test.ts` stays only as the deliberate "written out, not read from the constant" pin the file's own comment explains (it guards the table itself), but the count assertion in devtools goes.

**Budgets.** `METRIC_ID_LITERAL_BUDGET["packages/core/test/HydrationMetrics.test.ts"] = 5` (the five hydration pins). Keep those five literals or update the budget and AGENTS.md in the same task (the budget is exact, both directions). Mutation: `HydrationEvent.ts` is in `stryker.react.mjs` (its `mutate` list is only `DecisionOutcome`, `QuestionBook`, `HydrationEvent`, `SweepScheduler`), so its score must not fall; core mutates everything including `HydrationMetrics.ts`. `HydrationEngine.ts` is not mutated.

**Shared file with 42.** `HydrationEngine.ts`. 39 touches the import line and `:229-250`, `:482`, `:517`; 42 moves `:600-779`. Run 39 first so 42's extraction does not carry stale reason types.

### Phase 40: core owns describing a decode refusal (ARCH-87, ADR-QD-153, CCR-QD-431, BEH-QD-536..540, INV-QD-325..326)

**Verified.** Encode side: `describeEncodeRefusal`, `encodeRefusalAnnotations` in the leaf `JsonRefusal.ts` (ADR-QD-116), `reportEncodeRefusal` in `EncodeRefusalReport.ts` (kept apart because the leaf stays free of `Effect`). Decode side: `devtools/src/model/Source.ts:220` `reasonOf` is a 1:1 kebab renaming of `DecodeRefusal`'s five tags; `:273` `MalformedReason` is the same five as strings; the `:250-268` comment re-explains what `SinkWire.ts:53-83` documents. The same mapping is also written twice inside the decode stack: `SinkCodec.ts` `asDecodeRefusal` (UntrustedRefusal | UnsupportedVersion) and `audit/src/AuditEntry.ts:159` `asDecodeRefusal` (UntrustedValueRefusal). Only consumer that reports a `DecodeRefusal`: devtools. `audit/src/AuditArchive.ts:158,303` carries it inside `ArchiveRefusal.EntryNotDecodable`.

**Two sub-changes, one phase.**
1. *Describer.* Add `describeDecodeRefusal` beside `DecodeRefusal` in `SinkWire.ts` (the decode-vocabulary leaf, the mirror of ADR-QD-116's placement). A `Match.type<DecodeRefusal>().pipe(Match.tagsExhaustive(...))` built at module scope. No reporter: devtools is the only reporting consumer (the review says "if a consumer needs one"), so a reporter would be shared by one adapter. `Inconsistent`'s sentence reads only `disagreement`'s tag (type-only import of `Decision.ts`, already present). **Hazard:** `Malformed.message` is Schema issue text and may quote input values. INV-QD-104 ("says where, never what") governs encode annotations; for decode, devtools already annotates the whole frame (`qadi.frame`), so including `message` in a sentence is no new disclosure there, but a describer in core is public and any other adapter could log it. Document this on the function, as `describeEncodeRefusal` does for `EncodeFailed`.
2. *Devtools passes it through.* `onMalformed?: (frame: string, refusal: DecodeRefusal) => void`; `MalformedReason` and `reasonOf` deleted. The default log annotates `qadi.refusal` (the tag) and the sentence rather than the kebab string, so the annotation key/value is an observable change (pin it at `Source.test.ts:523`). Meaning shifts: the old `not-a-record` covered both `Malformed` and a bare record, which are both `Malformed` today; `DecodeRefusal` has no separate bare-record tag, so the distinction was never in the type. State that in the ADR.

**The audit double decode (the real design choice, MEDIUM).** `decodeAuditEntry` (`AuditEntry.ts:198-209`) runs `decodeSinkRecord(input.record)` (strict, returns a `SinkRecord`) and then `recordJsonOf(input.record)` (`Schema.decodeUnknownResult(SinkRecordJson)`, lenient) only to get the envelope-pruned JSON form. `SinkRecordJson` is `Schema.toEncoded(SinkRecordWire)`, i.e. the encoded side, and the strict decode's output is the *decoded* side, so the JSON form cannot be read off the decoded wire value directly (`Schema.Defect` on resolver `cause` and similar transforms differ). Options:
- A (recommended): core's decode seam returns the JSON form together with the record from one strict decode: `prepare` (`versionThenEnvelope`, which already projects `envelopeOf(input)`) already produces exactly the pruned JSON the lenient decode reproduces, since the strict decode has validated everything nested. A new core function (name the planner's) returns `{ record, json }`, with `json` typed `SinkRecordJson` through one narrow, checked step. New public export (overview row, core minor), no new `Schema.decode*` token.
- B: audit calls `encodeSinkRecord(record)` on the decoded record. No new core export, but it re-runs the encode walk, can refuse (`SinkRecordNotEncodable`) for a record that decoded fine, and round-trip byte identity for `Defect` causes is unproven; a property test would have to establish it first.
- C: keep two decodes. Rejected by the review.
Whichever is chosen, `readAuditArchive` calls `decodeAuditEntry` once per entry, so the saving is per archive entry too (ADR-QD-110's principle: a fact computed once; D-48-f's "round trip pinned by a property" is the template for the new pin).

**Import direction.** `SinkWire.ts` stays a leaf (add `effect/Match`, no local edge). `Source.ts` already imports `DecodeRefusal` from `@qadi/core`. `AuditEntry.ts` imports from `@qadi/core`. No cycle.

**ADRs.** New ADR-QD-153 amends ADR-QD-095 D-09-f ("`MalformedReason` is the closed union … mapped from `DecodeRefusal`") and ADR-QD-096 D-15-e/D-15-f (`MalformedReason` gains `"unsupported-version"`; also lines in ADR-QD-106 that say `MalformedReason` gains `"inconsistent"`), amends ADR-QD-110 (audit facts computed once) for the row decode, and extends ADR-QD-116 (decode words get the same leaf treatment). Must not contradict ADR-QD-143 (all untrusted decode only through `untrustedDecoder`), ADR-QD-096 D-15-c (an unknown envelope key is ignored and dropped from the audit entry), and ADR-QD-097/BEH-QD-204 (a malformed frame degrades a row, never the stream).

**Tests.** Today: `devtools/test/model/Source.test.ts` (about 14 cases that pass `onMalformed` and a `MalformedReason`, lines 260-523), `Source.tst.ts:13,35`, `devtools/test/surface.tst.ts:48` (public type list names `MalformedReason`), `core/test/SinkCodec.test.ts` (the five refusals), `audit/test/AuditEntry.test.ts` (:404 "a row whose record carries an unknown envelope key decodes, and the entry drops the key", :351 the row-schema-alone control), `audit/test/AuditArchive*.test.ts`. Move: new core test for `describeDecodeRefusal` (one sentence per tag, a per-variant table like `EncodeRefusalReport.test.ts`); Source tests change from kebab strings to `DecodeRefusal` values and lose any case that only re-proved the renaming; audit gets a property "decode-once agrees with decode-then-lenient-decode on every accepted row" written and seen green before `recordJsonOf` is deleted.

**Budgets (the one that moves).** `UNTRUSTED_DECODE_BUDGET["packages/audit/src/AuditEntry.ts"] = 1` exists only for `recordJsonOf`. Deleting it removes that row from the budget, from `UNTRUSTED_DECODE_BUDGET_NAMES`, and from AGENTS.md §7a's table in the same task (gate checks all three: `[untrusted-decode]`, `[untrusted-decode-names]`, `[untrusted-decode-table]`). `core/src/SinkCodec.ts` stays 1; `UntrustedDecode.ts` stays 5 as long as the new core function adds no counted token. `AuditEntry.ts` keeps its `untrustedDecoder` for the row (`decodeRow`), which is not a counted token. `devtools-named-barrel` rule: removing `MalformedReason` from `devtools/src/index.ts:116` must keep the list alphabetical.

**Docs and spec that name the old strings.** `spec/behaviors/27-devtools-timeline.md:178` (BEH-QD-204 REQUIREMENT lists the five kebab strings), `spec/overview.md:849` (row), `packages/devtools/README.md:100`, `apps/website/.../packages/devtools.md:108`, `apps/website/.../reference/upgrading.md` (Breaking entry), `packages/http/src/DecisionStreamRoute.ts:32` (a doc comment saying `not-a-record`), `spec/behaviors/26-decision-stream.md:322,419,585,597`, `.changeset` Breaking for `@qadi/devtools`, minor for `@qadi/core` and `@qadi/audit`.

### Phase 41: one guarded value-to-text function in devtools (ARCH-88, ADR-QD-154, CCR-QD-432, BEH-QD-541..545, INV-QD-327..328)

**Verified, with a correction to the review's framing.** The five sites are not five copies of one function; they answer different questions:
- `Filters.ts:136-146` `render`: a value to `ReadonlyArray<string>` of search text (string as is, `[]` for `undefined`-valued or throwing). Guarded.
- `SimulationForm.ts:95-103` `stringify`: `string | undefined`, throws become `undefined`. Guarded; used with a round-trip check.
- `Remedies.ts:574` `render`: a row label (`string` bare, else `String(JSON.stringify(v))`, so `undefined` prints as the word). **Unguarded**, used at `:255`, `:481`, `:496` on `satisfyingValue`'s witness, which for `contains(value: unknown)` (`core/Matcher.ts:284`) can be a bigint or circular object. This is the only site that can throw while rendering, as the review says; it is read from code, not reproduced, and the context makes reproducing it RED first the phase's first task.
- `Inspect.ts:300-310` `outsideUnion`: `JSON.stringify` is applied to a string only (cannot throw), objects become the words "an object", everything else `String(value)` (does not throw on bigint or symbol). Not a defect; it is a fifth set of rules.
- `QuestionsPanel.tsx:388` `resourceOf`: an `id` string or the key list. Never stringifies a value; it is a resource label, not value text. Likely out of scope unless the phase wants a shared "resource label".

So the one shared module owns only the primitive that must be uniform: a total `JSON.stringify` (never throws, answers `undefined` instead), and the adapters (search text array, row label with the `undefined` word, round-trip-checked text) stay thin and local on top of it. Forcing one output shape on all five would change visible labels. Recommended: `model/ValueText.ts` exporting the guarded primitive and the one test table (bigint, circular, function, symbol, `undefined`, `NaN`, `-0`, nested bigint, a `toJSON` that throws, a getter that throws). If the RED reproduction in `Remedies` does not fail, the phase downgrades to a locality change as the context says, and the same module still lands.

**Import direction.** New leaf imports nothing local. Four model files and one react file import it. No cycle. Out of `index.ts`; devtools barrel unchanged. Remember a throwing `toJSON`/getter is also reachable: `JSON.stringify` calls them, so the guard is a `try`/`catch` around the call, as `Filters.ts` and `SimulationForm.ts` already do, not a pre-check.

**ADRs.** None directly. Closest: ADR-QD-047 (headless model: panels read from the model), ADR-QD-099 (package-private). A new ADR-QD-154 is optional; the reserved numbers allow one. Must not contradict the passage in `Filters.ts` that a locally built resource may be circular and neither a filter nor its panel may fall over (BEH for Filters).

**Tests.** `devtools/test/model/Filters.test.ts:125-127, 327-329` (circular resource), `SimulationForm.test.ts:129` (`1n`), `Remedies.test.ts` (no bigint/circular case; the gap), `Inspect.test.ts` (outside-union rendering), `QuestionsPanel` DOM tests. Move: the module's table is written once; delete the per-site try/catch tests only when the module's table covers the same input, and add one case per adapter to prove it reads through the module (a bigint contains-witness in Remedies; a circular resource in Filters stays as the regression the review names).

**Budgets.** None. Mutation: `src/model/**` is covered, so the module and all four model files count. `react/QuestionsPanel.tsx` is not mutated.

### Phase 42: a seeded question builds its own computing atom (ARCH-89, ADR-QD-155, CCR-QD-433, BEH-QD-546..550, INV-QD-329..330) behind a human checkpoint

**Verified.** `HydrationEngine.ts:692-779` `makeSeededQuestion` takes `computedFor(seededIn)` and `track(get)`; `QadiAtoms.ts:257-298` `seededDecision` builds the `runtime.atom` that reads `subject`, calls `seededIn(get.registry)` for the server's `evaluationId` (BEH-QD-186), then `evaluate(...)`, and passes `track: (get) => get.addFinalizer(live())`. The "`live()` first inside the reader, release in its finalizer" rule appears in `QuestionBook.ts` (`BookOptions.build` doc, ~line 105), `QadiAtoms.ts:289-296` and `HydrationEngine.ts:704-707`. Tests: `HydrationEngine.test.ts:54-140` call `makeSeededQuestion` with a fake `computedFor` (four cases, one asserting `track` runs before `computed`), so they exercise a path production never takes.

**The ADR conflict is narrower than the context says.** ADR-QD-148's decisions concern the book signalling and `SweepScheduler`; `makeSeededQuestion` is not in them. ADR-QD-149 says the handle holds the seed through `makeSeededQuestion`'s `WeakMap<SeedGrant, …>` and a registry holds only a grant; that survives intact whether or not the computing atom is built inside. ADR-QD-103's "the atom set is its one adapter" and "`QuestionBook` generic over its handle" also survive. ADR-QD-039 requires that no consumer can reach a seed atom: still true if the new constructor runs inside `makeQadiAtoms`'s closure. What actually changes is text (ADR-149 names `HydrationEngine.ts` as the home of `makeSeededQuestion`; ADR-103's adapter sentence) and one dependency direction. The checkpoint should say this plainly instead of presenting a three-ADR conflict. Genuine risks to put in front of the human:
1. **Dependency direction.** The constructor now needs `evaluate`, `CurrentSubject` (from `@qadi/core`), `Atom.runtime`'s atom factory with `withReactivity([DECISIONS_KEY])`, and the `subject` atom. `DECISIONS_KEY` and `QadiRuntimeServices` currently live in `QadiAtoms.ts`; `HydrationEngine.ts` importing them back would be a cycle (`QadiAtoms` imports `HydrationEngine`; ADR-QD-037 counts type-only edges). They must move down (to the new module or a leaf), not be imported up.
2. **HydrationEngine grows evaluation knowledge** if the constructor stays in it (already 779 lines of payload planning).
3. **Test honesty improves but cost moves.** A self-building question needs a real `Atom.runtime` in tests. The fake-`computedFor` precedence controls can be reproduced with a real runtime (no subject yields `Effect.never`, i.e. `Initial`; setting the subject settles it), which is closer to production. `QadiAtoms.test.ts`, `Hydration.test.ts`, `ServerRender.test.tsx` and `hooks.test.tsx` (BEH-QD-186, BEH-QD-151, INV-QD-028) already go through the real path.

**Options for the checkpoint (not for me to choose; the human decides go / amend / reject):**
- A (review's shape, extended): `react/src/SeededQuestion.ts` holds `SeedGrant`, `SeedSlot`, `SeededQuestion`, `makeSeededQuestion({ policy, resource, runtime, subject, report, live })`, builds the computing atom, calls `get.addFinalizer(live())` itself (the `track` callback and the liveness restatement in `QadiAtoms.ts` and `HydrationEngine.ts` disappear; `QuestionBook.ts` keeps the one statement). `HydrationEngine.ts` keeps payload planning and imports only the types `SeedSlot`/`HydrationSeedLookup`. `QadiAtoms.seededDecision` becomes a one-line call. Cost: moving `makeSeededQuestion` changes `DECISION_READ_BUDGET` and `DECISION_READ_BUDGET_NAMES` keys (file path), the §13 `DECISION_READ_BUDGET` sentence in AGENTS.md ("two budgeted files: `DecisionOutcome.ts`, and `HydrationEngine.ts`'s seed precedence") and ADR-QD-149's file citation, checked both directions.
- B (smaller, keeps evaluation out of the engine): replace the callback-receiving-callback with a first-class value, a seed lookup object created once per question and handed to both the computing atom (in `QadiAtoms`) and `makeSeededQuestion`. Removes the inversion without a new dependency, but the seed-to-evaluation relationship is still split across two modules, so it only half answers the review.
- C: record a rejection ADR and leave the code, correcting only the three-times-stated liveness rule.

**Mutation.** `stryker.react.mjs` does not mutate `HydrationEngine.ts` or `QadiAtoms.ts` (only `DecisionOutcome`, `QuestionBook`, `HydrationEvent`, `SweepScheduler`). If A creates `SeededQuestion.ts`, deciding whether to add it to that list is part of the plan; no existing score can fall from the move itself.

**Other budgets and gates.** `UNTRACED_BUDGET`: no `Effect.fnUntraced`. `[untrusted-decode]`: HydrationEngine's decode seam stays where it is (it reads payloads, not questions). `circular` (gate 5, `pnpm circular`) is the one that can fail here: run it after every move. `stryker.react.mjs` aside, devtools `useDevtoolsFeed` and `DevtoolsFeed.ts` import `QadiRuntimeServices` from `QadiAtoms.ts` as a type; keep that export.

## Cross-phase shared files and dependencies

| File | Phases | Regions | Order consequence |
|------|--------|---------|-------------------|
| `core/src/SinkWire.ts` | 38, 40 | 38: `WireVersion`/`WIRE_VERSIONS` (lines 33-51); 40: new describer next to `DecodeRefusal` (53-83), and the `UnsupportedVersion` sentence reads `supported` | 38 first: 40's describer prints `supported`, so it should read the settled vocabulary |
| `core/src/SinkCodec.ts` | 38, 40 | 38: lines 146, 154, 224-226, 453, 470; 40: the decode seam near 509-527 and `asDecodeRefusal` | disjoint regions; no conflict if 38 lands first |
| `spec/behaviors/25-inspection.md` | 38 (`:839` signature block), 39 (metric table, `hydrationDropReasons`) | different sections | none |
| `spec/overview.md` | 38?, 39, 40 | rows near 322-323, 456, 518-521, 849 | each phase edits its own rows; gate 13 per phase |
| `react/src/HydrationEngine.ts` | 39, 42 | 39: imports + `:229-250,482,517`; 42: `:600-779` | 39 before 42 |
| `devtools/src/index.ts` | 40 | `MalformedReason` removal | alone |
| `AGENTS.md` | 40 (§7a table), 42 (§13 if the read budget moves) | | each updates its table with its budget in one task |
| `scripts/check-house-style.mjs` | 40 (`UNTRUSTED_DECODE_BUDGET`, `_NAMES`), 42 (`DECISION_READ_BUDGET`, `_NAMES` if A), 39 (`METRIC_ID_LITERAL_BUDGET` only if pin count changes) | | exact counts, both directions |
| `core` barrel `index.ts` | 38, 39, 40 | `export *`, alphabetical | all additions public; every one needs an overview row (gate 13) or a "Not listed above" row |
| devtools stores | 37 (`TimelineFeed`, `DiagnosticsFeed`, `SimulationSession`), 41 (`SimulationForm` only) | different files | none |

Hard dependencies: 38 before 40 (shared leaf vocabulary), 39 before 42 (shared engine file). Everything else is independent. Phases 38, 39, 40 each add public core names, so each needs its own `@qadi/core` changeset; none releases (standing instruction: never merge or approve a version-packages PR, never publish).

## Recommended build order

The context's strict numeric order 37 -> 42 is sound and I recommend keeping it. Reasons:
1. **37** first: self-contained devtools model work, the review's top recommendation, and nothing else depends on it. Its new module's test table is also the cleanest place to practise the "tests at the new seam before deleting the old ones" mutation rule the later phases repeat.
2. **38** before **40** (hard): shared `SinkWire.ts`/`SinkCodec.ts`; also the smallest phase, so it de-risks the codec files cheaply.
3. **39** before **42** (hard): shared `HydrationEngine.ts`; independent of 38/40.
4. **40** after 38: it is the only Breaking phase (devtools), and it removes a budgeted `UNTRUSTED_DECODE_BUDGET` row, so it benefits from a clean `SinkCodec.ts`.
5. **41**: independent devtools phase; its first task may refute the defect, so it is cheap to place late. A defensible swap is 41 ahead of 40 (a latent crash is higher severity than a Breaking rename), but the two share no file, and the user fixed the order. Raise it only if the user wants defects first.
6. **42** last: speculative, behind the human checkpoint, and the context already says it corrects anything stale left by 37-41.

Parallelism is off (`use_worktrees` false), so phases run one at a time, as the context states.

## Patterns to Follow

### Pattern 1: one table, everything else derived (38, 39, 40)
**What:** a closed const (or tuple) in the leaf, `satisfies`-checked, from which unions, value lists and adapters derive; adding a member without its facts is a compile error.
**When:** a closed set whose members carry facts read by more than one package.
**Example:**
```typescript
const DROPS = {
  ForeignSubject: { kind: "dehydration", summary: "...", remedy: "..." },
  // ...
} as const satisfies Record<string, { kind: HydrationDropKind; summary: string; remedy: string }>;
export type HydrationDropReason = keyof typeof DROPS;
export const hydrationDropReasons: ReadonlyArray<HydrationDropReason> = Struct.keys(DROPS);
```
`as const satisfies` is the compile-checked form already used elsewhere in the codebase (`2 as const`); `satisfies` is not an `as` cast.

### Pattern 2: a package-private module owns a protocol, stores own results (37, 41)
**What:** the module holds the mechanics (generation, close, finalizer order, interrupt, "land if current"), the store keeps only what it does with a landed value.
**When:** three copies have already drifted once.
**Trade-off:** one more indirection per store; paid back by one test file for the protocol.

### Pattern 3: replace the test at the new seam, do not layer (all)
Write the seam's tests first, watch them pass against the old code where the behaviour is unchanged (or RED where a defect is claimed), then delete exactly the store-level cases the seam now proves, in the same plan. Compare per-file Stryker scores from the phase base (XC-05).

## Anti-Patterns to Avoid

### Anti-Pattern 1: unifying the lookalike
**What:** folding hydration payload `version: 2`, audit bundle `archiveVersion`, and the sink wire version into one constant (38), or forcing one output shape on five value-to-text sites (41).
**Why bad:** they answer different questions; the first changes meaning on a version bump of the wrong wire, the second changes visible labels.
**Instead:** share the primitive that must be uniform, keep the adapters.

### Anti-Pattern 2: importing up
**What:** `HydrationEngine.ts` importing `DECISIONS_KEY` or `QadiRuntimeServices` from `QadiAtoms.ts` (42); a new devtools module importing a store (37).
**Why bad:** madge counts type-only edges (ADR-QD-037).
**Instead:** move the shared fact down into the lower module.

### Anti-Pattern 3: a counted decode token outside the leaf (38, 40)
**What:** any `Schema.decode*`, `onExcessProperty`, `exceedsJsonDepth` or `JSON.parse` in a new place.
**Why bad:** `UNTRUSTED_DECODE_BUDGET` fails both ways.
**Instead:** return the already-decoded value from the one decoder, or use `Schema.encodeResult` (not a counted token).

## Scalability Considerations (internal)

| Concern | Now | After |
|---------|-----|-------|
| Audit archive read | each entry's record decoded twice | once per entry (40) |
| Wire version bump | six edits, four unchecked | one tuple edit, compiler-checked (38) |
| New hydration reason | three hand lists + two tests | one table row; kind decides the bucket (39) |
| A fourth devtools store that owns a run | a fourth hand copy | one call into the module (37) |

## Sources

- `.planning/phases/_WAVE9-CONTEXT.md`, `_SHARED-CONTEXT.md`, `.planning/PROJECT.md`, `/Users/mohammadalmechkor/Projects/Perso/qadi/AGENTS.md` (HIGH: project's own records, read in full).
- ADRs read: `spec/decisions/037`, `039`, `052`, `095`, `096`, `099` (via AGENTS.md section 9 and ADR text), `103`, `110`, `116`, `123` (headers and decisions), `137`, `143`, `148`, `149` (HIGH).
- Code read at `637c0601`: `devtools/src/model/{TimelineFeed,DiagnosticsFeed,SimulationSession,Source,Filters,Remedies,Inspect,SimulationForm}.ts`, `core/src/{SinkWire,SinkCodec,HydrationMetrics,JsonRefusal,EncodeRefusalReport}.ts`, `react/src/{HydrationEvent,HydrationEngine,QadiAtoms,QuestionBook}.ts`, `audit/src/AuditEntry.ts` (HIGH).
- `scripts/check-house-style.mjs` budgets and `stryker.*.mjs` mutate lists (HIGH).
- `node_modules/effect/dist/FiberHandle.js` for replace-interrupts and self-clearing semantics (MEDIUM: read, not executed).
- Not verified by running anything: `pnpm circular`, `pnpm check:pr`, any test, the Phase 41 defect, and that deriving a union via `keyof typeof` leaves the tstyche `toBe<HydrationDropReason>()` pins green (expected, unproven).
