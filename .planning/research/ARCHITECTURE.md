# Architecture Research: v1.9 Arch Wave 14 (integration of four internal deepenings)

**Domain:** Effect v4 authorization library monorepo (`@qadi/*`); architecture-deepening milestone, no new product features
**Researched:** 2026-11-23 (branch `arch-wave-14`, base `5784bbd6`)
**Confidence:** HIGH for every file:line and every "what exists today" claim (read in the tree). MEDIUM for the live-defect hypothesis in Phase 77 (derived by reading, not run) and for the design recommendations marked *recommendation* (they are mine, not decided; `.planning/phases/_WAVE14-CONTEXT.md` does not exist yet, so nothing below is locked by an owner decision).

Scope: how Phases 77 to 80 plug into code that already exists, which files each touches, what is new and what is modified, how data flows before and after, and the safe build order. Strictly serial 77 → 78 → 79 → 80; `use_worktrees` is false.

## Standard Architecture

### System Overview

```
 pnpm check (package.json:42) = the one definition of "done"; check:pr skips mutation
 ┌───────────────────────────────────────────────────────────────────────────────────────┐
 │ typecheck · lint · circular · test:tstyche · coverage · test:bdd · spec:examples      │
 │ spec:verify:strict · spec:gates · spec:claims · spec:api · spec:package · example      │
 │ mutation · spec:website-examples · website · spec:publish · bench:self-test           │
 └───────────────────────────────────────────────────────────────────────────────────────┘

 PHASE 77  @qadi/audit  (+ @qadi/core read-only precedent)
 ┌─────────────────────────────────────────────────────────────────────────────────────┐
 │ caller store ──JSON──▶ decodeAuditEntry ─▶ [AuditEntry, branded] ◀─ encodeAuditEntry │
 │                          │ envelope first (row fields, record unwalked)             │
 │                          │ then core decodeSinkRecordWithJson(record)               │
 │                          ▼                                                          │
 │   ArchiveFacts.archiveFacts ─▶ AuditArchive.archiveAuditTrail / readAuditArchive    │
 │   Retention.planRetention / planPurge(VerifiedArchive)                              │
 │   (all three TRUST the brand: no isSequenceNumber, no isFinite(at) re-check)        │
 └─────────────────────────────────────────────────────────────────────────────────────┘

 PHASES 78-80  @qadi/devtools (model = headless, mutation-gated; react = adapters)
 ┌─────────────────────────────────────────────────────────────────────────────────────┐
 │ react/  DevtoolsDock ─▶ useDockModel ─┐                                             │
 │         useTimeline ──────────────────┼─▶ useScoped (scope)  [79: + configure]      │
 │         useDiagnostics ───────────────┘                                             │
 │         QuestionsPanel ─▶ useLens (DOM adapter)  [80: shrinks, drives a session]    │
 │ ──────────────────────────── model/ (stryker.devtools.mjs mutates src/model/**) ────│
 │ DockModel ─┬─ TimelineFeed ─▶ TimelineStore  [78: owns capacity via resize]         │
 │            ├─ DiagnosticsFeed ─▶ DiagnosticsStore, SupersedingRun                   │
 │            ├─ GatesFeed ─▶ SupersedingRun                                           │
 │            ├─ DockSession, ExplorerSession, SimulationSession, HeldChoice(roles)    │
 │            ├─ derived stores: shownReading, questions, services  (ExternalStore.ts)│
 │            └─ [80: + LensSession, the tenth store]                                  │
 │ ExternalStore.ts: makeExternalStore, makeDerivedStore, sameFields [79: shared rule] │
 └─────────────────────────────────────────────────────────────────────────────────────┘

 PHASE 80 tail  @qadi/react: QadiProvider.tsx QadiContextValue.instrument (unread) removed
```

### Component Responsibilities

| Component | Responsibility today | Wave-14 change |
|-----------|---------------------|----------------|
| `AuditEntry.ts` | Row schema (`Schema.Struct`, structural type), `encodeAuditEntry`, `decodeAuditEntry` | Row type becomes a brand only these two functions mint; decode goes envelope-first |
| `ArchiveFacts.ts` | Order, claim, break, `outOfOrderAt`, `invalidSequenceNumber` re-check (`isSequenceNumber`, :64), public `SequenceNumberInvalid` (:138) | Re-check disappears for branded rows; public error and `invalidSequenceNumber` become unreachable |
| `AuditArchive.ts` | `archiveAuditTrail` (:110) and `readAuditArchive` (:290), `VerifiedArchiveImpl` (nominal via `#counts`) | Writer takes branded rows; reader unchanged in shape |
| `Retention.ts` | `planRetention` (:66) with an `isFinite(at)` "undated" branch, `planPurge` (:129) | `undated` branch and `RetentionPlan.undated` / `PurgePlan.undated` unreachable |
| `TimelineStore.ts` | Timeline + pause freeze over `makeExternalStore`; capacity fixed at build | `resize(capacity)` command; store owns capacity |
| `TimelineFeed.ts` | Source read in a scope; **mirror store** (`view`, :129), six-member forwarder (:135-142), abandoned `inner.subscribe(push)` (:133, :180) | Forwarder, mirror, `bounded`, `push` deleted; feed exposes the one store |
| `DiagnosticsFeed.ts`, `GatesFeed.ts`, `TimelineFeed.ts`, `DockModel.ts` | Take `init` AND `configure`; each decides "did it change" by its own hand-written compare | Take inputs only via `configure`; one per-field rule |
| `useScoped.ts`, `useDockModel.ts`, `useTimeline.ts`, `useDiagnostics.ts` | `useScoped(make(init))` then a layout effect `configure(sameInputs)` | One package-private hook: scope, then configure |
| `useLens.ts` | `useState` x3 + DOM listeners: all lens state and rules in React | DOM adapter over a headless `LensSession` the dock model owns |
| `QadiProvider.tsx` | Public `QadiContextValue.instrument` (:62, :307) that nothing reads | Removed (or the reason it stays is recorded) |

## Recommended Project Structure (changes only)

```
packages/audit/src/
├── AuditEntry.ts            # M  brand, envelope-first decode            (77)
├── ArchiveFacts.ts          # M  drop isSequenceNumber re-check          (77)
├── Retention.ts             # M  drop undated branch                     (77)
├── AuditArchive.ts          # M  signature follows the brand             (77)
└── SequenceIntegrity.ts     # M  re-exports shrink if SequenceNumberInvalid goes (77)
packages/devtools/src/model/
├── TimelineStore.ts         # M  resize command                          (78)
├── TimelineFeed.ts          # M  forwarder/mirror deleted (78); init removed (79)
├── DiagnosticsFeed.ts       # M  init removed, per-field rule            (79)
├── GatesFeed.ts             # M  init removed, per-field rule            (79)
├── DockModel.ts             # M  init removed, inputs type stated once (79); + lens store (80)
├── ExternalStore.ts         # M  export the per-field rule (sameFields)  (79)
└── LensSession.ts           # N  headless lens session                   (80)
packages/devtools/src/react/
├── useConfigured.ts         # N  scope-then-configure hook (name is a recommendation) (79)
├── useScoped.ts             # M  stays the low-level piece or is folded in (79)
├── useDockModel.ts, useTimeline.ts, useDiagnostics.ts, DevtoolsDock.tsx # M (79)
├── useLens.ts               # M  shrinks to a DOM adapter                (80)
├── QuestionsPanel.tsx       # M  takes a `lens` session prop             (80)
└── Lens.ts                  # unchanged (pure DOM ops)
packages/react/src/QadiProvider.tsx   # M  remove `instrument` from the context value (80)
```

N = new, M = modified. Only one new module in `src/` per slice that adds one (`LensSession.ts`, the hook); everything else edits in place.

## Phase 77: the audit row is branded, made only by its codec

### What exists (verified)

- `AuditEntry` is a `Schema.Struct({ record: SinkRecordJson, sequenceNumber: Schema.optional(Schema.Int) })` with `type AuditEntry = typeof AuditEntry.Type` (`AuditEntry.ts:80-84`). Structural: anyone can write `{ record, sequenceNumber: 1.5 }` and hand it to `archiveAuditTrail`.
- Writer-side re-checks that exist only because the type admits invalid rows: `isSequenceNumber = Schema.is(Schema.Int)` (`ArchiveFacts.ts:64`) feeding `invalidSequenceNumber` and the public `SequenceNumberInvalid` (`ArchiveFacts.ts:138`, ADR-QD-110 D-48-g); `Number.isFinite(at)` and the `undated` partition (`Retention.ts:80-90`, `RetentionPlan.undated`, `PurgePlan.undated`; INV-QD-101 says outright "a hand-built `AuditEntry` never passes through decode, so retention guards itself", `spec/invariants.md:2434`).
- `decodeAuditEntry` (`AuditEntry.ts:149-159`) is **record-first**: it checks `hasProperty(input, "record")` by hand (message `"an audit row has no record"`), decodes the record through core's `decodeSinkRecordWithJson`, then decodes the row envelope (`decodeRow`, `AuditEntry.ts:117`, `refuse`, `unwalked: ["record"]`). Core's stored record is **envelope-first**: `storedWire.decode(input)` (`SinkCodec.ts:603`) with `record` unwalked, then `decodeSinkRecord(record)` from its own root (`fromEnvelope`, `SinkCodec.ts:611-622`, `decodeStoredRecord` at `:651`).
- `at` is `Schema.Finite` on the wire (`packages/core/src/SinkRecordFields.ts:69,125`), so a row whose `at` is `NaN` or `±Infinity` is refused on read.

### Suspected live defect (MEDIUM, derived by reading; confirm with the RED test)

`Retention.test.ts:18` builds a row with `at = NaN` by hand (`entryWithAt`). Nothing in `archiveAuditTrail` re-checks `record`, so such a row archives, `JSON.stringify` turns `NaN` into `null`, and `readAuditArchive` refuses the bundle as `EntryNotDecodable` (decode requires `Finite`). This is the same class as ADR-QD-110's WR-01 (a safe-integer `sequenceNumber`), which was patched with a re-check at the writer instead of by making the invalid row unrepresentable. The RED test the roadmap asks for should be: hand-build or `{...encoded, record: {...record, at: NaN}}` row, `archiveAuditTrail` succeeds, `JSON.parse(JSON.stringify(archive))` then `readAuditArchive` returns `ArchiveNotVerified(EntryNotDecodable)`. It must be seen RED on `5784bbd6` before the fix. Other candidates to probe in the same test: a row with an embedded policy typo (the schema alone strips it, `AuditEntry.ts` header says so) and `sequenceNumber: 1.5`.

### Data flow: before and after

```
BEFORE  any literal {record, sequenceNumber} ─▶ archiveAuditTrail ─▶ JSON ─▶ readAuditArchive ─✗ (refuses what the writer wrote)
                                                  └─ patches: isSequenceNumber at the writer; Retention guards `at`

AFTER   encodeAuditEntry(SinkRecord) ─┐
        decodeAuditEntry(unknown)  ───┴▶ AuditEntry (brand) ─▶ archiveFacts / archiveAuditTrail / planRetention
        (the only two mints)              no re-check anywhere downstream
        readAuditArchive: envelope ─▶ each raw entry ─▶ decodeAuditEntry ─▶ VerifiedArchive
```

`decodeAuditEntry` after: `decodeRow(input)` first (row fields, `record: unknown`, unwalked, `refuse`) then `decodeSinkRecordWithJson(row.record)`; the entry is `{ record: decoded.json, sequenceNumber: row.sequenceNumber }` minted through the private constructor. This deletes the hand `hasProperty` check and `malformed()` (`AuditEntry.ts:122-123`).

### Integration points (file:line)

| Concern | Where |
|---------|-------|
| Brand type and the only constructor | `packages/audit/src/AuditEntry.ts:80-84` (replace structural type), `:102-109` (`encodeAuditEntry` builds the literal at `:107`), `:149-159` (`decodeAuditEntry` builds the literal at `:156`) |
| Envelope-first order | `AuditEntry.ts:117-120` (`decodeRow`, already `unwalked: ["record"]`), `:149-159`; precedent `core/src/SinkCodec.ts:585-622,651` |
| Re-checks that become dead | `ArchiveFacts.ts:64,104-125,138-141,154-170`; `Retention.ts:80-90`, `:50-54` (`undated`), `:104-110` (`PurgePlan.undated`), `:129-162` |
| Readers that already mint through the codec (no change needed) | `AuditArchive.ts:290-` (`decodeAuditEntry` per entry, `entries.push(decoded.success.entry)`) |
| Consumers that only take the type | `AuditTrailPort.ts:36,41`, `AuditStagingPort.ts:37,49`, `AuditWriteOutcome.ts:82-84`, `AuditPortReply.ts:56,62,71`, `AuditTrailPortTest.ts:37-52`, `AuditStagingPortTest.ts:48-71`, `AuditDecisionSinkLive.ts:176-243` (calls `encodeAuditEntry`, so it keeps compiling) |

### Design recommendations (open decisions the plan must close; all `ADR`-worthy)

1. **Brand mechanism: type-level brand, not a nominal class.** `Brand.nominal` is this repo's idiom (`core/src/Identity.ts:44-45`), and `Admitted` (`core/src/Admission.ts`) uses a class, but `planPurge` keys a `MutableHashMap<AuditEntry, number>` by **structural** equality (`Retention.ts:134-146`, `VerifiedArchiveImpl.holds`). Effect's `Equal.equals` is structural for plain objects only, so a class instance without an `Equal` implementation would silently make `holds` return 0 and a purge select nothing (fail-closed, but wrong). A phantom brand on a plain object keeps structural equality and `JSON.stringify(entry)` byte-identical (the documented store contract).
2. **Spread loophole.** `{ ...entry, sequenceNumber: 1.5 }` keeps the type brand under TS spread, so it is a branded invalid row. Tests today spread rows everywhere (`AuditArchive.test.ts:14,15,43,44,64-66,98,115,147,161,188-190`, `ArchiveRoundTrip.test.ts:53`). Recommendation: the supported way to give a row a sequence number is `decodeAuditEntry({ record: entry.record, sequenceNumber: n })` (that is what a store does after assigning its column and reading back), expose a test helper `numbered(entry, n)` in `packages/audit/test/helpers.ts`, and say in the ADR that the type brand cannot stop a spread (a runtime guarantee would need a class, see 1). Do not add a public `withSequenceNumber` unless the owner wants one.
3. **The exported `AuditEntry` schema value.** If it stays and is decodable alone (`Schema.decodeUnknown(AuditEntry)`), it is a second mint. Recommendation: keep `const AuditEntry` as an un-branded *description* (its doc already says it is "not a reader") and declare the branded `type AuditEntry` separately, or drop the value. Both are Breaking for `@qadi/audit`; `spec/overview.md:763` row currently says "schema + type" and must change.
4. **What becomes unreachable and therefore leaves (Breaking, 0.x minor):** `SequenceNumberInvalid` (public, re-exported via `SequenceIntegrity.ts`), `ArchiveFacts.invalidSequenceNumber`/`InvalidSequenceNumber`, `RetentionPlan.undated`, `PurgePlan.undated`. The widened failure type of `verifySequenceIntegrity`/`archiveAuditTrail` narrows back (ADR-QD-110 amendment). This is the "complete over simple" option (owner standing instruction); keeping dead public members would repeat the drift ADR-QD-110 exists to remove.
5. **Refusal precedence and messages change** (same as ADR-QD-170 D-17 did for the stored envelope): a row with both a bad record and an extra row key now reports the envelope's refusal first; a non-object or record-less row reports the strict decoder's message (`Expected object`, `Missing key` at `["record"]`) instead of `"an audit row has no record"`. `AuditEntryDifferential.test.ts` ("identical to before over every existing case") must be re-pointed and the changes tabulated in the ADR. The `refuse` policy for the row envelope stays (ADR-QD-170 D-09).

### Files touched (Phase 77)

| Kind | Files |
|------|-------|
| src (M) | `packages/audit/src/AuditEntry.ts`, `ArchiveFacts.ts`, `Retention.ts`, `AuditArchive.ts`, `SequenceIntegrity.ts`, `index.ts` (only if a name leaves/enters; barrel is `export *`, alphabetical) |
| src (core) | none required. `SinkCodec.ts` and `UntrustedDecode.ts` are the precedent and are read-only unless the planner decides audit should reuse a shared "envelope then record" helper (not recommended: it would add a public core export, a `spec/overview.md` row and a gate-13 edit for one caller) |
| tests (M) | `packages/audit/test/`: `AuditEntry.test.ts`, `AuditEntryDifferential.test.ts`, `ArchiveFacts.test.ts` (:15 `entryAt`, :177-181 invalid sequence cases go), `ArchiveRoundTrip.test.ts` (:259-: the "over any number the writer refuses what the reader would" property becomes a type-level fact), `AuditArchive.test.ts`, `Retention.test.ts` (:18 `entryWithAt`, :95-100 `NaN`/`Infinity`, :115), `SequenceIntegrity.test.ts`, `UntrustedSeams.test.ts`, `Agreement.test.ts`, `helpers.ts`, `observeLeaf.ts`, `driveExit.ts`, `UnwrittenRow.test.ts`, `AuditTrailPortTest.test.ts`, `AuditStagingPortTest.test.ts`, `AuditPortReply.test.ts`, `AuditWriteOutcome.test.ts`; type pins `AuditArchive.tst.ts`, `Retention.tst.ts`, `AuditWriteOutcome.tst.ts`, `AuditPortReply.tst.ts`, `AuditRefusal.tst.ts`; BDD `features/features/wire-versions/wire-versions.feature` + `.steps.test.ts` (reads rows via `decodeAuditEntry`) |
| tests (N) | the RED round-trip test (suggest `packages/audit/test/ArchiveReadableBack.test.ts`) and a `.tst.ts` pin that a literal row is refused by `archiveAuditTrail`/`archiveFacts`/`planRetention` |
| spec | `spec/behaviors/33-audit-pipeline.md` (BEH-QD-253 retention partition, BEH-QD-254 sequence integrity :754-811, BEH-QD-312 stored-row guard :185-254, `AuditEntry` listing :66-67), `spec/invariants.md` (INV-QD-053, 054 :2446-2487, 101 :2414-2442, 130 :3460, 325 :3911-3920, plus a new INV that a row is minted only by its codec), `spec/traceability.md` (every changed test file row), `spec/overview.md` (rows :763-786, plus the Change History line), `spec/decisions/110-an-archives-facts-are-computed-once.md` (amend D-48-g: refusal at the writer replaced by unrepresentability), `spec/decisions/170-...md` (D-20 / audit row note), new ADR, `spec/decisions/index.yaml`, `spec/behaviors/index.yaml`, `spec/README.md` (CCR row + Document history). Reserve ids with `node scripts/next-id.mjs ADR|CCR|BEH|INV` before writing any (`[no-numbering-placeholder]` refuses a placeholder) |
| changeset | one `@qadi/audit` Breaking minor (existing precedent: `.changeset/audit-refusal-is-cores.md`, `audit-entry-decoded-once.md`) |
| docs | `packages/audit/README.md` (:42-48, :147-153 `undated`), `apps/website/src/content/docs/docs/packages/audit/capabilities.md` (:25-41, :125-156), `apps/website/src/content/docs/docs/reference/upgrading.md` (new 0.14-style section; `spec:website-examples` compiles fences), `apps/website/src/content/docs/docs/concepts/obligations.md` (mentions `AuditEntry`) |
| house-style | `scripts/check-house-style.mjs`: **`NOT_CALLABLE_PIN_BUDGET`** (`:753` `Retention.tst.ts` row, plus a row for any new `.tst.ts`; AGENTS.md section 6 table edited in the same change, both directions, each negative pin needs a positive twin, and `archiveAuditTrail` returns an `Effect` so its pin goes through `Params<typeof archiveAuditTrail>`). `UNTRUSTED_DECODE_BUDGET`: audit holds no counted token; envelope-first adds none (`untrustedDecoder` already used), so **no change expected**; verify with the gate. No `Effect.fnUntraced`/switch/`as` budget moves. Brand construction must not use `as` (use `Brand.nominal<AuditEntry>()` as `Identity.ts` does) |
| mutation | `stryker.audit.mjs` unchanged (mutates `packages/audit/src/**`). Record `AuditEntry.ts`, `ArchiveFacts.ts`, `AuditArchive.ts`, `Retention.ts` per-file scores at the phase base (ADR-QD-170 recorded 1 / ? / 1 / ?; XC-05 style `NN-mutation-base.json`) and re-close after the review iterations; deleting dead branches should raise, not lower, the score |
| gates it can break | gate 13 `check-api-surface.mjs` (overview rows), gate 14 `check-package-install.mjs` (audit consumer compiled through packed `exports`), `spec:verify:strict`, `spec:examples` (``` typescript fences in `33-audit-pipeline.md` are compiled), `spec:website-examples` |

## Phase 78: `TimelineStore` owns its capacity

### What exists (verified)

`makeTimelineStore(options?)` (`TimelineStore.ts:49`) captures `options` once and uses it for `emptyTimeline(options)` at build and at `clear` (`:70`). Capacity is therefore immutable per store. `makeTimelineFeed` (`TimelineFeed.ts:123-193`) works around that: it keeps a mutable `inner` store (`:127`), a mirror `view = makeExternalStore<Timeline>` (`:129`), `push` (`:132`), a **subscription on every `inner`, never removed** (`:133`, `:180`, acknowledged by the comment at `:178`), and a six-member forwarder `timeline` (`:135-142`: `subscribe`, `getSnapshot`, `accept`, `clear`, `setPaused`, `isPaused`). On a capacity change `configure` builds a fresh `inner`, `push()`es the empty timeline inside `try`, and `readSource` runs in `finally` (`:171-190`). That `try/finally` is what pins TF26, TF27, TF29 (a throwing listener never stops the refill; `devtools-capacity-change-reads.md` changeset).

### Target

`TimelineStore` gains one command, `resize(capacity: number | undefined): void`, with the semantics the feed gets today by replacement:

- same capacity: nothing, no notification;
- otherwise validate through `emptyTimeline({ capacity })` **before mutating anything** (it throws on a negative, fractional or `NaN` bound, `Timeline.ts:104-110`), then behave as `clear()` with the new bound: empty timeline, **pause released** (a replaced `inner` was unpaused; TF4/TF14 and `useTimeline.ts` docs say a capacity change empties and un-pauses), `view.publish` once (so `isPaused` subscribers hear it, as `push()` does now);
- `undefined` means `DEFAULT_TIMELINE_CAPACITY` (same `?? DEFAULT` rule `bounded` applies, `TimelineFeed.ts:95-96`).

`makeTimelineFeed` then exposes the one store (`timeline = makeTimelineStore({ capacity })`), deletes `inner`, `view`, `push`, the forwarder and `bounded`, and `configure` becomes `if (capacity moved) { try { store.resize(next.capacity) } finally { readSource(next.source) } } else if (source moved) readSource(next.source)`. Keep the `try/finally`: the TF26/27/29 contracts survive unchanged because `resize` publishes through `makeExternalStore`'s collect-then-rethrow `notify` (ADR-QD-177).

### Integration points

| Concern | Where |
|---------|-------|
| `TimelineStore` interface (public **type**: `export type { TimelineStore }`, `devtools/src/index.ts`) | `TimelineStore.ts:30-45` gains `resize`; `idleTimeline` (`TimelineFeed.ts:109-116`) gains `resize: () => {}` |
| Store closure | `TimelineStore.ts:49-83`: replace captured `options` with a `capacity` variable used by `clear` |
| Feed | `TimelineFeed.ts:123-193` (delete `:127-142`, `:95-96`; rewrite `:171-190`) |
| Hand-fed hook | `useTimeline.ts` `useTimelineStore` (`makeTimelineStore(options)`) is unaffected; `useTimeline` reads `feed.timeline` and `usePaused(store)` through `useStoreSnapshot.ts:25` unchanged |
| Dock model | `DockModel.ts` reads `timelineFeed.timeline` (`:210`), unchanged |

### Files touched (Phase 78)

| Kind | Files |
|------|-------|
| src (M) | `packages/devtools/src/model/TimelineStore.ts`, `TimelineFeed.ts` |
| tests (M) | `test/model/TimelineStore.test.ts` (new `resize` cases: same bound no-op, validate-before-mutate, un-pauses, publishes once, listener throw rethrown, `clear` after `resize` uses the new bound), `test/model/TimelineFeed.test.ts` (TF4 :130, TF14 :310, TF26 :543, TF27 :568, TF29 :616 must stay green **unedited**, they are the proof the refactor is behaviour-preserving; add a case that the feed's `timeline` is the identical object before and after a resize and that no mirror exists), `test/react/useTimeline.test.tsx`, `test/react/TimelineLifetime.test.tsx`, `test/react/useStoreSnapshot.test.tsx`, `test/model/Source.test.ts` (use `makeTimelineStore`), `test/surface.tst.ts` (the `TimelineStore` type member list, if pinned) |
| spec | `spec/behaviors/27-devtools-timeline.md` (BEH-QD-205 area, store contract), `spec/behaviors/28-devtools-screens.md` (BEH-QD-510 :1541, BEH-QD-519 :1608, BEH-QD-636 :2507: "stable across a capacity change"), `spec/decisions/137-...md` (amendment: the store outlives a capacity change by owning it; ADR says "keeps ADR-QD-137"), `spec/decisions/173-...md` only if wording about the store changes, new INV (one subscription path, no mirror), `spec/traceability.md`, `spec/README.md` CCR row, `spec/overview.md` (devtools `TimelineStore` row and Change History) |
| changeset | `@qadi/devtools` minor (a public type gains a required member: Breaking for a third-party `TimelineStore` implementer; the dock and hooks are unaffected). Recommendation: label Breaking because the owner treats type-surface changes that way (ADR-QD-173 precedent) |
| docs | `packages/devtools/README.md` (:170-176 capacity wording), `apps/website/.../packages/devtools.md` |
| house-style | none (no new `Effect.fnUntraced`, `switch`, module state; `MODULE_STATE_BUDGET` is for `let` at module scope only) |
| mutation | `stryker.devtools.mjs` mutates `src/model/**`: base-score `TimelineStore.ts` and `TimelineFeed.ts` first; deleting the forwarder removes mutants, `resize` adds some, add tests before deleting |

## Phase 79: configure-only feeds and the dock model

### What exists (verified)

- Three feeds and the dock model each have **two entry paths for inputs**: an optional `init` argument to the constructor and a `configure` command. `makeTimelineFeed(init?)` (`TimelineFeed.ts:123-126`), `makeDiagnosticsFeed(init?)` (`DiagnosticsFeed.ts:121-123`, `if (init !== undefined) start(init)` at `:196`), `makeGatesFeed(init?)` (`GatesFeed.ts:157-159`), `makeDockModel(init?)` (`DockModel.ts:209-211`).
- Every React adapter therefore passes the same inputs twice: `useScoped(() => make(inputs))` then a layout effect `configure(inputs)` that is a no-op on the render the scope appears (`useDockModel.ts:46-55`, `useTimeline.ts:56-63`, `useDiagnostics.ts:40-44`). `useScoped.ts` comments that `make` is read once per mount "later inputs arrive as commands".
- Each feed decides a restart by its own hand compare: timeline `capacity`/`source` identity (`TimelineFeed.ts:176-188`); diagnostics `layer`/`collector`/`intervalMillis` plus an on/off rule (`DiagnosticsFeed.ts:176-181`: `before === undefined || ...`); gates `gates`, `questions`, `intervalMillis` plus **a non-identity rule**, re-watch whenever `watchFailure !== undefined` (`GatesFeed.ts:261-263`); dock `catalogue` only, the rest delegated (`DockModel.ts:285`).
- The one shared rule is `makeDerivedStore`'s `sameFields` (`ExternalStore.ts:138-146`, module-private, ADR-QD-185 D-02).
- The dock's input type is written **three times**: `DockModelInputs` (`DockModel.ts:75-96`), `UseDockModelInput` (`useDockModel.ts:29-38`) and, field for field with docs, `DevtoolsDockProps` (`DevtoolsDock.tsx:93-150`) plus the destructure at `:163-172` and the object literal at `:186`.
- `useScoped.ts` is in the hot path of ADR-QD-137's StrictMode / hidden-`Activity` guarantee (value cleared on cleanup).

### Target design (recommendation)

1. **Constructors take no inputs.** `makeTimelineFeed()`, `makeDiagnosticsFeed()`, `makeGatesFeed()`, `makeDockModel()`; the first `configure` is the start. (Public API: the three feeds are root exports, so Breaking for `@qadi/devtools`.)
2. **One rule in `ExternalStore.ts`.** Export the per-field comparison (as a package-private export; `index.ts` stays unchanged) and have each feed ask it which fields moved. Two traps the planner must design around:
   - `sameFields` treats a key present on one side only as a change, so `{ source }` and `{ source, capacity: undefined }` differ, but the feeds' documented contract is "an omitted input reads as `undefined`" (`TimelineFeed.ts` doc, README `:250`). The feeds' inputs are optional-field types, and `makeDerivedStore`'s `K extends object & Required<K>` refuses those. Resolve with a closed field list per feed (read each declared key, absent reads as `undefined`) or make `configure` take a total input; do not feed optional-key objects to raw `sameFields`.
   - Diagnostics' input is `DiagnosticsOptions | undefined` where `{}` is **on** and `undefined` is **off** (`useDiagnostics.ts` doc: "`{}` is the one-token opt-in"). A per-field rule over all-`undefined` fields cannot see `undefined → {}`. On/off presence must stay a separate first-class rule beside the field rule.
   - `GatesFeed` restarts on a *state* (the last watch failed), not on a field; keep that as an explicit second condition of the same decision, not a hidden exception.
3. **One package-private hook, "scope, then configure".** Recommendation: `useConfigured(make, inputs)` in `react/`, built on `useScoped`, whose build step is `Effect.gen(feed = yield* make(); feed.configure(inputsNow); return feed)` so the value is **already configured when `setValue` publishes it**, plus the existing `useLayoutEffect(() => feed.configure(inputs), [feed, ...inputs])` for later changes. Used by `useDockModel`, `useTimeline`, `useDiagnostics`. `useSimulationSession` (init + three setters, `useSimulationSession.ts:63-87`) and `ExplorerSession`/`SimulationSession` keep their init-plus-setters shape: they are not feeds, and the milestone text names only feeds and the dock model.
4. **The dock's input type stated once.** `DockModelInputs` is the source of truth; `UseDockModelInput` is deleted (or an alias that adds nothing) and `DevtoolsDockProps = DockModelInputs & HostProps` with the per-prop doc comments moved onto the one declaration. This also removes the destructure/respread in `DevtoolsDock.tsx:163-186`.

### Why a characterisation test must open the phase (the owner's stated reason)

Today `useDiagnostics` passes `options` to the constructor, so the feed is `Starting` from its first value (`DiagnosticsFeed.ts:196`), and `idleDiagnostics(options)` shows `Starting` on the pass before the feed exists (`:119-127`). With a bare constructor the feed is built `Off` (`diagnosticsOff`, `:121`), and if configure only runs in the later layout effect the sequence a reader sees becomes `Starting` (idle) → `Off` (feed exists, not yet configured) → `Starting`. `DiagnosticsNotice` and the stop ledger (`StoppedBox.tsx` `StopLedger`) read the status, so a transient `Off` is observable. The hook design in item 3 above removes the transient by configuring inside the build; the characterisation test pins that the sequence stays exactly what it is today (suggest `packages/devtools/test/react/DiagnosticsFirstRender.characterisation.test.tsx`, modelled on `DockModel.characterisation.test.ts` and `QuestionsPanel.characterisation.test.tsx`). The same applies to the gates feed (`Unwatched`/`Unhanded` before the first configure) and to `DockModel.characterisation.test.ts`'s "questions absent, unsampled" cells.

### Dependency on Phase 78

After 78, `TimelineFeed.configure` is a three-line decision (capacity moved → `resize` + read; else source moved → read), so 79's per-field rule replaces two `!==` comparisons rather than the current mirror-store plumbing. Doing 79 first would rewrite `configure` around `inner`/`push` and then delete it again. 78 must also land before 79 because the feed's `timeline` becoming the single store is what lets the dock model (`DockModel.ts:210`) and `useTimeline` hand the same object to everything.

### Integration points

| Concern | Where |
|---------|-------|
| Feed constructors and `init` | `TimelineFeed.ts:123-126`, `DiagnosticsFeed.ts:121-123,196`, `GatesFeed.ts:157-166`, `DockModel.ts:209-215,224,236,248` (the three nested `make*` calls pass inputs) |
| Per-field rule | `ExternalStore.ts:138-146` (export), consumers in the four `configure`s (`TimelineFeed.ts:171`, `DiagnosticsFeed.ts:170-182`, `GatesFeed.ts:256-272`, `DockModel.ts:280-304`) |
| React adapters | `useScoped.ts:20-47`, `useDockModel.ts:40-59`, `useTimeline.ts:48-64`, `useDiagnostics.ts:38-46`, `DevtoolsDock.tsx:93-186` |
| Public input types | `TimelineFeedInputs` (`TimelineFeed.ts:21-26`), `GatesFeedInputs` (`GatesFeed.ts:81-87`), `DiagnosticsOptions` (`DiagnosticsStore.ts`), re-exported by `index.ts` and `react/index.ts` |
| Gate-14 consumer and compiled docs | `scripts/check-package-install.mjs:653,680-681,711-712` (strings inside a template literal: `makeTimelineFeed({source})`, `makeGatesFeed()`/`makeGatesFeed({gates})`, `makeDiagnosticsFeed()`/`({})`), `packages/devtools/README.md:218-220` (compiled `typescript` fence) and `:250` prose |

### Files touched (Phase 79)

| Kind | Files |
|------|-------|
| src (M) | `model/TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `DockModel.ts`, `ExternalStore.ts`; `react/useScoped.ts`, `useDockModel.ts`, `useTimeline.ts`, `useDiagnostics.ts`, `DevtoolsDock.tsx` |
| src (N) | `react/useConfigured.ts` (or the scope+configure folded into `useScoped.ts`; a new file is clearer and keeps `useScoped` generic) |
| tests (M) | `test/model/TimelineFeed.test.ts` (30 call sites), `DiagnosticsFeed.test.ts` (33), `GatesFeed.test.ts` (38), `DockModel.test.ts` (77), `DockModel.characterisation.test.ts` (15), `ExternalStore.test.ts` + `ExternalStore.tst.ts` (the exported rule), `test/dockModelFixtures.ts`, `test/helpers.ts`, `test/react/useTimeline.test.tsx`, `useDiagnostics.test.tsx`, `DiagnosticsLifetime.test.tsx`, `TimelineLifetime.test.tsx`, `DevtoolsDock.test.tsx`, `DiagnosticsScreens.test.tsx`, `test/surface.tst.ts` (:23-45 imports feed makers; constructor signatures are pinned there), `test/surface.test.ts` (no list change expected), `features/features/devtools*/…steps.test.ts` if they build feeds. About 213 construct-with-init call sites: introduce one fixture helper (`built(make, inputs)` = make then configure) rather than editing each by hand |
| tests (N) | the first-render characterisation above, written and run green on the unchanged tree **first**, a `useConfigured` lifetime test (StrictMode remount and hidden `Activity`, ADR-QD-137 WR-02), a `.tst.ts` pin that the constructors take no argument (negative pin on an `Effect`-returning maker goes through `Params<typeof makeXFeed>`; counts as `NOT_CALLABLE_PIN_BUDGET` rows) |
| spec | `spec/behaviors/28-devtools-screens.md`: BEH-QD-506 :1306, BEH-QD-507 :1375, BEH-QD-508 :1442, BEH-QD-510 :1541, BEH-QD-519 :1608, BEH-QD-616 :2344, BEH-QD-636/637/638/639 :2507-2634 (signatures and "a feed is built with inputs" wording), BEH-QD-696 :2749 (the rule is now shared); `spec/behaviors/27-devtools-timeline.md`; `spec/decisions/137-...md` (amend: scope, then configure), `173-...md` (amend decision 1 and 4: constructors take no inputs; input type names stay), `185-...md` (amend D-02: the per-field comparison is no longer module-private); new ADR; INV-QD-107/390 neighbours; `spec/traceability.md`; `spec/README.md`; `spec/overview.md` (feed rows and Change History); `spec/devtools-spec/*` only if a "Claims of absence" row names a constructor argument (`pnpm spec:claims`) |
| changeset | `@qadi/devtools` Breaking minor (root exports `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` change signature) |
| docs | `packages/devtools/README.md` (fence at :180-245 and prose :246-253), `apps/website/.../packages/devtools.md` (:177, :223), `reference/upgrading.md` (:1023-1052 shows the old form; add a new section, do not rewrite history) |
| house-style | `NOT_CALLABLE_PIN_BUDGET` rows if pins are added (`packages/devtools/test/surface.tst.ts` is not in the table today; `DiagnosticsStore.tst.ts` is, `:771`); no other budget |
| gates | gate 14 (`check-package-install.mjs`) **must be edited in the same plan** as the signature change or `pnpm spec:package` fails; the script also fails if a `make*Feed` export is left uncalled |
| mutation | `DockModel.ts` held at the score ADR-QD-168/185 set (the roadmap says it "keeps its mutation score of 1" in Wave 13; re-measure at the phase base), `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `ExternalStore.ts`; the new shared rule is the natural place for surviving-mutant pressure, so test the three trap cases above explicitly |

## Phase 80: the lens as a headless session; `instrument` leaves the context

### What exists (verified)

`useLens(instances)` (`react/useLens.ts:41-121`) holds three `useState`s (`highlighted`, `picking`, `picked`) and five transitions inline: `move` sets `highlighted` to `[id]` or `[]`; `choose` ends picking, clears highlight, sets `picked`; `cancel` (Escape) ends picking and clears highlight; `togglePicking` flips and clears highlight and `picked`; `highlight`/`clear`. Effects draw `boxesOf(instances.filter(highlighted))` and attach `pointermove`/`click`(capture)/`keydown` listeners on `document`. `QuestionsPanel.tsx:106` calls `useLens(snapshot.instances)` and passes a `Lens` (`ReturnType<typeof useLens>`, `:141`) to `PickButton` (`:290-298`), `lens.highlight(...)` (`:227`) and `lens.picked` (`:236`). The lens state dies with the tab (the panel unmounts when the reviewer switches tab), which is exactly BEH-QD-234's third exit "unmount" (`28-devtools-screens.md:614-618`). `ExplorerSession` is the precedent (`subscribe`/`getSnapshot` plus synchronous commands, built by the dock model, handed to `PolicyExplorer session={model.explorer}`, `DevtoolsDock.tsx:297`). The panel test seam is `test/react/questionsPanelInput.ts` (spread onto 42 renders).

### Target (recommendation)

- **`model/LensSession.ts` (N)**, package-private (ADR-QD-099), `subscribe`/`getSnapshot` over `makeExternalStore`, snapshot `{ highlighted: ReadonlyArray<string>; picking: boolean; picked: string | undefined }`, commands `highlight(ids)`, `clear()`, `togglePicking()`, `hover(id | undefined)` (**ignored unless picking**: today that rule is implicit in the listener only being attached while picking, so it becomes a model rule with a test), `pick(id)`, `cancel()`. No `document`, no `Element`, no instances: ids only. Snapshot identity rule: equal transitions keep the reference (the `useSyncExternalStore` contract in `ExternalStore.ts`).
- **`DockModel.lens: LensSession` (M)** is the **tenth store**. This is where Phase 79's reshaping matters: 80 adds one `makeLensSession()` and one member to the returned object, and **no input**, so it needs nothing from `configure` and does not conflict with the configure-only change. Build it with the other sessions (`DockModel.ts:228-231`), and add it to the returned record (`:263-284`).
- **`useLens` (M)** becomes a DOM adapter: `useLens(session, instances)` reads the session snapshot through `useStoreSnapshot`, keeps the draw effect (`drawLens`/`clearLens`/`boxesOf` from `Lens.ts`) and the three document listeners, and each listener becomes one session command (`gateIdAt` stays in the adapter since it needs `document`). Cleanup on unmount **must still call `session.cancel()`**; otherwise a session owned by the dock outlives the panel and picking would stay armed across tabs, which contradicts BEH-QD-234's third exit. If the owner prefers "picking survives a tab switch" that is a behaviour change to be recorded as a decision, not an accident.
- **`QuestionsPanel` (M)** takes `lens: LensSession` as a prop (like `PolicyExplorer`'s `session`), `DevtoolsDock.Screen` passes `props.model.lens` (`DevtoolsDock.tsx:~306`), and `panelInput` in `test/react/questionsPanelInput.ts` gains a lens double so the 42 panel renders do not each change.
- **`QadiContextValue.instrument` (M, `@qadi/react`)**: grep finds no reader in `packages/*/src` or `packages/*/test` (the field is set at `QadiProvider.tsx:307-308` and declared at `:62`; consumers destructure `atoms`, `registry`, `gates` only: `hooks.ts:22,155,174`, `DevtoolsFeed.ts:126`, `GateWriter.useGates.test.tsx:69`). The writer is resolved once by the provider and reaches gates through the internal `GateScopeContext` (ADR-QD-111), so the public field is vestigial. Recommendation, consistent with the owner's "most complete, clean" rule: remove it from the interface and the memo's value and dependency list (this also stops the context value changing identity when `instrument` toggles). It is a public type member, so Breaking for `@qadi/react`, and ADR-QD-111's sentence "`QadiContextValue`, which is public, is unchanged" (`:40`) needs a dated amendment. This work is independent of the lens session and can be its own plan inside Phase 80, ordered last so a revert is cheap.

### Data flow: before and after

```
BEFORE  pointer/click/key (document) ─▶ useLens setState x3 ─▶ QuestionsPanel render
        state dies with the panel; rules testable only by rendering

AFTER   pointer/click/key (document) ─▶ useLens (adapter: gateIdAt) ─▶ LensSession command
                                                         │
        DockModel.lens (store) ◀──────── commands ───────┘
                │ getSnapshot
                ▼
        useLens draw effect: drawLens(document, boxesOf(instances ∩ highlighted))
        QuestionsPanel reads picked/picking/highlight through the session
```

### Files touched (Phase 80)

| Kind | Files |
|------|-------|
| src (N) | `packages/devtools/src/model/LensSession.ts` |
| src (M) | `model/DockModel.ts`, `react/useLens.ts`, `react/QuestionsPanel.tsx`, `react/DevtoolsDock.tsx`; `react/Lens.ts` header comment ("`useLens.ts` wires the listeners", :14-17) and `model/Gates.ts:20` pointer; `packages/react/src/QadiProvider.tsx` (:51-68, :306-309, the memo deps) |
| tests (M) | `test/model/DockModel.test.ts` (the "a built model's members with subscribe and getSnapshot are exactly this list" test: nine → ten), `DockModel.characterisation.test.ts` (if it enumerates stores), `test/react/questionsPanelInput.ts`, `QuestionsPanel.gates.test.tsx` (:223-334 lens/pick DOM cases, must pass **unedited** as the adapter's proof), `QuestionsPanel.test.tsx`, `QuestionsPanel.characterisation.test.tsx`, `QuestionsPanel.feed.characterisation.test.tsx`, `QuestionsPanel.thunk.test.tsx`, `VerdictTreatment.test.tsx`, `Lens.test.ts` (unchanged), `packages/react/test/*` helpers (`support/trees.tsx`, `GateRegistry.test.tsx:61` pass `instrument` as a **prop**, which stays) |
| tests (N) | `test/model/LensSession.test.ts` (every transition, hover ignored when not picking, pick ends picking and clears highlight, togglePicking clears `picked`, cancel idempotent, identity kept on a no-op, listener contract), a lens case in `DockModel.test.ts` (the dock owns one, stable across `configure`), a `.tst.ts` only if a negative pin is wanted |
| spec | `spec/behaviors/28-devtools-screens.md`: amend BEH-QD-234 (:559-620, "three exits" now a session rule plus the adapter's unmount `cancel`), BEH-QD-700 (:1068, list gains `lens`, "nine" → "ten"; the note at :1090-1093 about ordinals), BEH-QD-699 neighbours if they restate the count; new BEH for the session; `spec/invariants.md` INV-QD-390 (count stated once), a new INV (lens rules live in the model; `@qadi/react` calls no DOM API, AGENTS.md section 13 unchanged); `spec/behaviors/09-react.md` (provider context shape), `spec/decisions/047-...md` (amendment), `185-...md` (count), `111-...md` (the "unchanged" sentence), new ADR; `spec/overview.md` (`QadiContextValue` row :570 and Change History; **no** new devtools export row since the session is package-private; `check-api-surface.mjs` must still pass); `spec/traceability.md`; `spec/README.md` |
| changeset | `@qadi/react` Breaking minor (`instrument` removed from `QadiContextValue`); `@qadi/devtools` patch or minor (internal session; behaviour intended unchanged) |
| docs | `apps/website/.../packages/react/hooks.md` (mentions `instrument`; confirm it is the prop, not the context field), `packages/react/README.md` if it shows the context |
| house-style | `MODULE_STATE_BUDGET`: `LensSession` must hold state in its closure, not at module scope; `no-ambient-console`; `@qadi/react` stays DOM-free (AGENTS.md section 13: the session has no `document`). No budget row changes expected |
| mutation | `stryker.devtools.mjs` (`src/model/**`) will mutate `LensSession.ts` and `DockModel.ts`: base-score `DockModel.ts`, write `LensSession.test.ts` first, hold or raise. `stryker.react.mjs` covers `packages/react/src` and `QadiProvider.tsx` (deleting a field removes mutants) |

## Build Order and Dependencies

```
77 audit brand ──(independent package)──▶ 78 TimelineStore.resize ──▶ 79 configure-only ──▶ 80 lens + instrument
                                              │  simplifies               │  reshapes DockModel's
                                              └─ TimelineFeed.configure ──┘  constructor/inputs; 80 adds
                                                 (79 builds on 78)           a store with NO input
```

| Order | Phase | Hard dependency | Why here |
|-------|-------|-----------------|----------|
| 1 | 77 | none | Only phase that may hide a live defect; independent package (`@qadi/audit`), so it cannot be disturbed by the devtools work and the RED test goes in first |
| 2 | 78 | none on 77 | Smallest devtools change; makes `TimelineFeed.configure` trivial before 79 rewrites its input path |
| 3 | 79 | **78** (`TimelineFeed` is one store; `configure` is two comparisons) | Reshapes `DockModel`'s constructor, `DockModelInputs`, the three hooks and gate 14's consumer |
| 4 | 80 | **79** (soft) | Adds `lens` to a `DockModel` whose constructor and input type 79 just fixed; it adds no input, so the only conflicts are the returned-record literal and the store-list test. Run 79 first so 80 edits the final shape once |

Within each phase, order the plans: (1) RED / characterisation test on the unchanged tree, (2) records-free source change, (3) test migration, (4) spec records and changeset, (5) docs and gate-14/consumer scripts, (6) scoped mutation re-close. The spec registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`) are shared across phases, which is why they are strictly serial and `use_worktrees` is false.

Two cross-phase files that **both** 79 and 80 edit and must be re-read at the head of 80: `DockModel.ts` and `DevtoolsDock.tsx`. Both 78/79/80 edit `spec/behaviors/28-devtools-screens.md`, `spec/decisions/137`, `173`, `185` and `047`; each phase appends a dated amendment rather than rewriting the previous one. BEH-QD-700's count changes only in 80.

## Patterns to Follow

### Pattern 1: a value only its codec makes

**What:** a type-level brand minted in exactly the encode and decode functions, with the constructor not exported.
**When:** Phase 77, mirrors `Admitted` (`core/src/Admission.ts`, "only `admit` builds one") and `Identity.ts`'s `Brand.nominal`.
**Example:**
```typescript
import * as Brand from "effect/Brand";

type AuditRow = { readonly record: SinkRecordJson; readonly sequenceNumber?: number | undefined };
export type AuditEntry = AuditRow & Brand.Brand<"AuditEntry">;
const mint = Brand.nominal<AuditEntry>(); // module-private: never exported
```

### Pattern 2: a command on the owner, not a replacement of the owned

**What:** the owner exposes a mutator for the thing that varies (`resize`) so the holder keeps one object and one subscription path.
**When:** Phase 78; same shape as `clear`, `setPaused`, `ExplorerSession.setSightings`.

### Pattern 3: scope, then configure, exposed already configured

**What:** the build effect calls `configure` before the scope's value is published to React, so no pass sees the unconfigured state.
**When:** Phase 79; keeps ADR-QD-137's StrictMode and hidden-`Activity` behaviour (`useScoped` clears its value on cleanup).

### Pattern 4: headless session with `subscribe`/`getSnapshot`, DOM adapter on top

**What:** the model holds the rules and a hook translates DOM events into commands.
**When:** Phase 80; precedent `ExplorerSession` + `PolicyExplorer`, `DockSession`, `SimulationSession` + `useSimulationSession`.

## Anti-Patterns to Avoid

### Anti-Pattern 1: a public `AuditEntry` schema that can decode alone
**Why bad:** a second mint defeats "only its codec makes it"; the schema alone strips a typo'd policy field (`AuditEntry.ts` header).
**Instead:** un-branded description or removed value, decision recorded in the ADR.

### Anti-Pattern 2: a nominal class for the audit row
**Why bad:** `planPurge`/`VerifiedArchiveImpl.holds` rely on `Equal.equals` over plain objects; a class without `Equal` degrades to reference equality and a purge silently selects nothing.
**Instead:** phantom type brand on a plain object.

### Anti-Pattern 3: feeding optional-key input objects to the raw per-field compare
**Why bad:** `{a}` vs `{a, b: undefined}` reads as changed, restarting a read; `undefined` vs `{}` (diagnostics Off vs On) reads as unchanged, never starting one.
**Instead:** closed field list per feed plus an explicit presence rule.

### Anti-Pattern 4: configuring in a later effect than the one that publishes the value
**Why bad:** one render sees an unconfigured feed (`Off` diagnostics, `Unwatched` gates).
**Instead:** configure inside the scoped build (Pattern 3); characterisation test first.

### Anti-Pattern 5: leaving picking armed past the panel
**Why bad:** a dock-owned lens session outlives the Questions tab; BEH-QD-234 requires the pick mode to end on unmount.
**Instead:** adapter cleanup commands `cancel()`.

## Scalability / Blast Radius

Not a throughput question; the useful axis is how far each phase's breakage reaches.

| Concern | 77 | 78 | 79 | 80 |
|---------|----|----|----|----|
| Public API | Breaking, `@qadi/audit` (row type, `SequenceNumberInvalid`, `undated`) | `TimelineStore` type gains a member | Breaking, three root feed makers | Breaking, `@qadi/react` `QadiContextValue`; devtools internal |
| Test churn | ~20 audit files | 5-6 devtools files | ~213 call sites; mitigate with one fixture | ~50 panel renders via one seam |
| Gates beyond unit tests | 13, 14, spec:examples, website-examples | traceability | 14 (consumer script), README fence, website-examples | 13 (overview row), traceability |
| Rollback | one package | one file pair | widest; keep plans small and ordered | `instrument` removal isolated |

## Sources

- Code read (file:line above): `packages/audit/src/{AuditEntry,ArchiveFacts,AuditArchive,Retention,SequenceIntegrity,index}.ts`; `packages/core/src/{SinkCodec,UntrustedDecode,Identity,Admission}.ts`; `packages/devtools/src/model/{TimelineStore,TimelineFeed,DiagnosticsFeed,GatesFeed,DockModel,ExternalStore,DockSession,ExplorerSession,Timeline}.ts`; `packages/devtools/src/react/{useScoped,useDockModel,useTimeline,useDiagnostics,useStoreSnapshot,useSimulationSession,useLens,Lens,QuestionsPanel,DevtoolsDock,index}.ts(x)`; `packages/react/src/QadiProvider.tsx`; `scripts/check-package-install.mjs`; `scripts/check-house-style.mjs`; `stryker.{audit,devtools}.mjs`. HIGH.
- ADRs: `spec/decisions/110`, `137`, `170`, `173`, `185` (full or Decision sections read), `111` (via grep), `099`/`153` (referenced). HIGH.
- Spec registers: `spec/behaviors/28-devtools-screens.md` (BEH-QD-234, 506-520, 616-640, 696-700), `33-audit-pipeline.md` (BEH-QD-253/254/312), `spec/invariants.md` (INV-QD-101, 325), `spec/overview.md` (:569-570, :763-786). HIGH.
- `AGENTS.md` sections 4-7a, 9, 13, 15-16 for the budgets and gates; `.planning/phases/_SHARED-CONTEXT.md` for the per-phase record and mutation-baseline conventions. HIGH.
- Not found: `.planning/phases/_WAVE14-CONTEXT.md` (referenced by `PROJECT.md:34` but absent), so ids (ADR/CCR/BEH/INV/ARCH-124..127) are unreserved; reserve with `node scripts/next-id.mjs`.
- Not run: the Phase 77 defect hypothesis and every mutation score. MEDIUM until the RED test and the phase-base Stryker runs exist.
