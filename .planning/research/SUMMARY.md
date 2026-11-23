# Project Research Summary

**Project:** Qadi, milestone v1.9 Arch Wave 14 (Phases 77-80, ARCH-124..127)
**Domain:** Internal architecture deepening of an Effect v4 authorization monorepo (`@qadi/audit`, `@qadi/devtools`, `@qadi/react`). No new features, no new dependencies.
**Researched:** 2026-11-23 (branch `arch-wave-14`, base `ab8ccb75`)
**Confidence:** HIGH on what exists today; MEDIUM on recommended shapes (each is a design call that needs its phase's decision record)

## Executive Summary

This is four serial deepenings, not a product build. Effect 4.1.2, React 19.3.1, TypeScript 7 and every API needed (`Brand.nominal`, `Schema.brand`, `untrustedDecoder` with `unwalked`, `makeExternalStore`, `sameFields`, `useScoped`, `useStoreSnapshot`) are already installed and used. STACK says add nothing and upgrade nothing. The work is moving rules out of callers and into one owner: the audit row into its codec (77), capacity into the timeline store (78), input identity into one configure-only rule and one hook (79), and the highlight-lens rules into a headless model session (80). The house budgets (UNTRACED, SWITCH, MODULE_STATE, UNTRUSTED_DECODE, NOT_CALLABLE_PIN) and gates 13 and 14 are the main way these phases fail, so every phase must edit its budget rows, spec registers and gate fixtures in the same change.

**Phase 77 fixes a live defect, and it is confirmed.** The features researcher reproduced it with a throwaway vitest run. A type-valid hand-built row `{...e, record: {...e.record, at: NaN}}` passes `archiveAuditTrail`, because `archiveFacts` reads only `sequenceNumber`. `readAuditArchive` then refuses the bundle's own output as `EntryNotDecodable` (`Malformed: Expected number at ["at"]`). Three cast variants (`version: 3`, `subjectId: 5`, `record: {}`) fail the same way. ADR-QD-110 closed this for `sequenceNumber` only, and `ArchiveRoundTrip.test.ts:259-309` is scoped to that domain. The pitfalls researcher, who did not see that probe, independently names an archive-level variant: `archiveAuditTrail(entries, now: NaN)` writes `createdAt: null`, which the reader refuses as `Malformed` (`AuditArchive.ts:196-206, 278-287`). A brand on entries does not touch it. Both belong in the RED test, and the test must be written without `as` and seen RED on `ab8ccb75`. `keyMaterial` is a third unchecked pass-through the pitfalls researcher lists, still unverified.

**Phase 79 is the riskiest and Phase 78 hard-precedes it.** Removing the constructor `init` from three feeds and the dock model creates a first-render window in which a reader can see an unconfigured model (`Off` diagnostics, `Unwatched` gates). The phase must open with a characterisation test of the current first-render sequence, plain and under StrictMode. Removing `init` is a public Breaking change, and gate 14's packed-install fixture (`scripts/check-package-install.mjs:653-712`) must change in the same plan. Ids are reserved in `.planning/phases/_WAVE14-CONTEXT.md`: ADR-QD-190, CCR-QD-469, BEH-QD-721, INV-QD-399 onward, and ARCH-124..127.

## Key Findings

### Recommended Stack (STACK.md)

No new dependency and no version change. Per phase:

- **77:** `effect/Brand` (`Brand.nominal`, already used in `SignatureLedger.ts:46-48` and `Identity.ts:44-51`), `effect/Schema`, and `untrustedDecoder({ unwalked })`. STACK probed `Brand.nominal<T>()` on an object under `tsconfig.base.json`: it is runtime-free, and a bare literal is rejected. STACK recommends `Brand.nominal` minted inside the two codec functions over `Schema.brand`.
- **78:** `makeExternalStore` `set`/`publish` and `emptyTimeline(options)`. Only a shape change.
- **79:** the existing module-private `sameFields` (export it from the file, not the barrel), `useScoped`, `useLayoutEffect`, and `useStoreSnapshot` unchanged.
- **80:** the `makeDockSession`-style plain closure session over `makeExternalStore`, and `useStoreSnapshot`. No `Context.Service`, no `@effect/atom-react` in devtools.

Gates a stack change would trip: gate 13 (`spec/overview.md` rows for any new or renamed export), gate 14 (`make*Feed` signature), `UNTRUSTED_DECODE_BUDGET` (no `Schema.decode*`, `JSON.parse`, `onExcessProperty` or `exceedsJsonDepth` token in `AuditEntry.ts`), `NOT_CALLABLE_PIN_BUDGET`, and the `SWITCH`, `UNTRACED`, `MODULE_STATE` and `ANY` budgets.

### Expected Features (FEATURES.md)

"Features" here means pinned behaviour that must not move plus the table stakes of each deepening.

**Must have, per phase:**
- **77:** the writer can no longer write a bundle the reader refuses, over the record domain as well as `sequenceNumber`. `AuditEntry` is obtainable only from `encodeAuditEntry` and `decodeAuditEntry`. A host can still assign a `sequenceNumber` after encode (a documented flow, `AuditEntry.ts:72-78`), so a codec-owned route must remain. Decode is envelope-first, as core's `decodeStoredRecord` is. RED first.
- **78:** `TimelineStore.resize` does one notification, empties the buffer and releases the pause. `makeTimelineFeed` returns the one store. The forwarder, the mirror `view`, `bounded`, `push` and the abandoned `inner.subscribe(push)` are deleted. TF4, TF14, TF26, TF27, TF29 and M11 pass unedited.
- **79:** constructors take no inputs. One per-field identity rule, one "scope then configure" hook, and the dock input type stated once. The diagnostics first-render characterisation test is committed first. Gate 14, README, `spec/overview.md` and `surface.tst.ts` change in the same phase.
- **80:** a headless lens session (`toggle`, `hover`, `choose`, `cancel`, `highlight`, `clear`, snapshot `{highlighted, picking, picked}`) owned by the dock model as its tenth store. `useLens` shrinks to the DOM adapter. `QadiContextValue.instrument` is removed or its keep-reason recorded.

**Should have (differentiators):**
- A record-domain property test mirroring `ArchiveRoundTrip.test.ts:259-309`.
- Direct `TimelineStore.test.ts` resize cases.
- A `changedFields` helper shared with `makeDerivedStore`.
- `useSimulationSession` on the same hook.
- `picked` held with an explicit `Evicted` state.
- `LensSession.ts` mutation score held at 1.

**Defer:**
- Truncate-on-resize and grow-keeps-entries.
- Structural (deep) identity comparison for `source`, `layer`, `collector`, `catalogue` and `ports`.
- Exporting the lens session from the barrel.
- Any change to the `ArchiveRefusal` members or `ARCHIVE_VERSION`.
- `unknownKeys: "ignore"` on the audit row (FEATURES says keep `refuse`; STACK flags it as a decision).

### Architecture Approach (ARCHITECTURE.md)

Each phase is an in-place edit with at most one new module. The dependency chain is 77 (independent package), 78, then 79 (needs 78), then 80 (adds a store to the `DockModel` that 79 reshaped). Patterns to follow:
- a value only its codec makes;
- a command on the owner rather than replacement of the owned;
- scope-then-configure exposed already configured;
- a headless session with a thin DOM adapter, with `ExplorerSession` as precedent.

**Major components:**
1. `AuditEntry.ts` with `ArchiveFacts.ts`, `AuditArchive.ts` and `Retention.ts` (77). The re-checks (`isSequenceNumber`, the `isFinite(at)` "undated" branch) are the symptoms of a structurally typed row.
2. `TimelineStore.ts` and `TimelineFeed.ts` (78). `resize` replaces the mirror-store forwarder.
3. `ExternalStore.ts`, the four `configure` methods, `useDockModel`, `useTimeline`, `useDiagnostics`, `useScoped` and `DevtoolsDock.tsx` (79). One rule and one hook.
4. A new package-private `model/LensSession.ts` (the tenth store), a thinner `useLens.ts`, and `QuestionsPanel.tsx` taking the session as a prop (80). `QadiProvider.tsx` loses `instrument` from the context value.

### Critical Pitfalls (PITFALLS.md, top five)

1. **A brand that a spread, an exported schema or an `as` can mint (77).** `Schema.brand` is type-level only and keeps `Schema.make`. TypeScript spread keeps an intersection brand, so `{...entry, sequenceNumber: 1.5}` still type-checks as `AuditEntry`. Tests spread rows today (`ArchiveFacts.test.ts:21`, `Retention.test.ts`). Do not delete the integer re-check unless the type really proves it. Pin refusals with `@ts-expect-error` plus `toRaiseError(<code>)` plus a positive twin, never reason-blind `not.toBeConstructableWith`.
2. **A class brand changes the runtime shape that `holds()`, `planPurge` and the stores rely on (77).** Characterise `JSON.stringify(entry)` bytes and structural equality (including key-absent vs `undefined` for `sequenceNumber`) before the edit. The `Equal`/`Hash` behaviour of a class-instance brand is unverified.
3. **Envelope-first reorders refusals (77).** Which refusal wins on a double-defect input changes, and the messages `"an audit row has no record"` and the long `Expected {... "_tag": "Decision" ...}` become `Expected object`/`Missing key`. Run a characterisation matrix first and decide the order in the ADR. Introduce no `Schema.decode*` token; reuse `untrustedDecoder`.
4. **Removing `init` shows an unconfigured model on first render (79).** This is the `Off`-then-`Starting` transient; `idleDiagnostics` exists to hide it. Related: folding `configure` into the build must not use stale props after a hidden `Activity` or StrictMode rebuild (`useScoped` reads `make` once per mount). Related: the first `configure` must equal today's `init` for every feed and the model, and `DockModel.configure`'s dispatch order (gates, then diagnostics, then `shownReading.refresh()`) must stay written once.
5. **`sameFields` contract differs from the feeds' contract (79).** Omitted vs `undefined` reads as a change (a spurious timeline wipe). `makeDerivedStore` requires `Required<K>` but all input types are optional. Diagnostics `undefined` vs `{}` is invisible to a field rule. `diagnostics.intervalMillis` also feeds the gates feed. G43 (retry on a failed watch) is a state, not a field.

Also high-value: resizing in place must keep the pause reset, the listener-throw `try/finally` ordering (TF26/27/29) and the closed-scope guard (78); mutation baselines must be committed first and re-closed after review fixes (every phase); gate 14's fixture is a template string that only gate 14 compiles (79); and `instrument` removal is Breaking in `@qadi/react` (80).

## Implications for Roadmap

### Phase 77: `@qadi/audit`, an audit row is a value only its codec makes (ARCH-124)
**Rationale:** First because it fixes a confirmed live defect and is an independent package, so devtools work cannot disturb it.
**Delivers:** RED test (record-domain `at: NaN` row plus the `archiveAuditTrail(now: NaN)` variant, written without `as`, seen RED on `ab8ccb75`), then a branded row minted only by `encodeAuditEntry` and `decodeAuditEntry`, envelope-first decode, dead re-checks removed, `AuditEntry.ts` mutation baseline held or raised.
**Addresses:** the FEATURES 77 table stakes. **Avoids:** Pitfalls 1, 2, 3, 4, 20, 21.
**Breaking:** yes (`@qadi/audit`). Amends ADR-QD-110.

### Phase 78: `@qadi/devtools`, `TimelineStore` owns its capacity (ARCH-125)
**Rationale:** Smallest devtools change. It makes `TimelineFeed.configure` a three-line decision before Phase 79 rewrites its input path, and makes the feed's `timeline` the one store.
**Delivers:** `resize` with validate-before-mutate, pause release and a single `publish`. The forwarder, mirror and abandoned subscription are deleted. `idleTimeline` gains an inert member. `TimelineStore.test.ts` gets its own resize cases.
**Avoids:** Pitfall 8 (pause reset, throw ordering, closed guard, identity). Keeps ADR-QD-137.
**Breaking:** type-level (public `TimelineStore` gains a member).

### Phase 79: `@qadi/devtools`, feeds and the dock model are configure-only (ARCH-126)
**Rationale:** Needs 78. It reshapes `DockModel`'s constructor and inputs, so it must land before 80 adds a member to the same record.
**Delivers:** characterisation test of the diagnostics first-render sequence (plain and StrictMode) committed green on the unchanged tree; no-argument `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` and `makeDockModel`; one exported per-field rule; one package-private hook; `DockModelInputs` as the one input type with `UseDockModelInput` deleted and `DevtoolsDockProps = DockModelInputs & HostProps`; gate 14 fixture, README, website and ADR fences rewritten.
**Avoids:** Pitfalls 5, 6, 7, 11, 17, 18, 19.
**Breaking:** yes (three root feed makers). Amends ADR-QD-137, 173 and 185 D-02.

### Phase 80: `@qadi/devtools` + `@qadi/react`, a headless lens session (ARCH-127)
**Rationale:** Last, so it edits the final `DockModel` shape once. It adds a store with no input, so it needs nothing from `configure`.
**Delivers:** `LensSession.ts` (`toggle`, `hover`, `choose` returning whether it found a guard, `cancel`, `highlight`, `clear`; ids only), `DockModel.lens` as the tenth store (BEH-QD-700 "nine" to "ten", INV-QD-390, ADR-QD-185 count), `useLens` as the DOM adapter, and `QadiContextValue.instrument` removed. `QuestionsPanel.gates.test.tsx` and `Lens.test.ts` pass unedited.
**Avoids:** Pitfalls 12, 13, 14, 22.
**Breaking:** `@qadi/react` (context member). Amends ADR-QD-047, 111 and 185.

### Phase Ordering Rationale

Build order is 77, 78, 79, 80, strictly serial (`use_worktrees` is false; the spec registers are shared).
- 77 is first because it hides a live defect and touches an independent package.
- 78 hard-precedes 79. After 78 the timeline `configure` is two comparisons rather than the mirror-store plumbing, and doing 79 first would rewrite `configure` around `inner`/`push` and then delete it. The feed's `timeline` becoming the single store also lets the dock model and `useTimeline` hand the same object to everything.
- 79 precedes 80 (soft dependency). 80 adds a record member to `DockModel` and edits `DevtoolsDock.tsx`, both of which 79 reshapes.
- Within each phase: RED or characterisation test on the unchanged tree; source change; test migration; spec records and changeset; docs and gate-14 scripts; scoped mutation re-close after the last review fix.
- Ids are reserved in `_WAVE14-CONTEXT.md`; amended ADRs: 110, 137, 173, 047, 111, 168, 185. Run `spec-revise` with `--date 2026-11-23`.

### Open Decisions (researchers disagree or left it open; leave each to that phase's discuss step)

**Phase 77**
- **Brand mechanism for `AuditEntry`.** Four positions:
  - STACK: `Brand.nominal` minted inside the two codec functions; reject `Schema.brand`.
  - ARCHITECTURE: type-level (phantom) brand on a plain object, because `holds()` and `planPurge` need structural `Equal`/`Hash`. It names a class brand an anti-pattern.
  - PITFALLS: the Phase 65 private-constructor nominal class with a `declare private readonly` marker, because a type-only brand lets a spread or an exported schema mint. Its `Equal`/`Hash` behaviour is **[verify]**, and the marker compile in the audit tsconfig is unprobed.
  - FEATURES: nominal in the `#counts` style, but it must keep structural `Equal`/`Hash`; it rejects `Schema.TaggedClass` and suggests `Data.Class`.
  - Common ground: whatever is chosen must keep `JSON.stringify(entry)` byte-identical, the key-absent `sequenceNumber`, and structural equality; and spread keeps a type-level brand, so "only its codec makes" is unenforceable at runtime with a type brand. Decide first, and probe `Equal`/`Hash` and the marker before planning.
- **Does the exported `AuditEntry` schema value stay?** Keep an unbranded description under the same name, rename it (e.g. `AuditRow`), or drop it. A decodable branded schema is a second mint (STACK, ARCHITECTURE, PITFALLS agree on that risk). `AuditEntry.test.ts:310-320` and `spec/overview.md:763` depend on the answer.
- **Fate of `undated`, `SequenceNumberInvalid`, `invalidSequenceNumber`.** FEATURES: keep the `isFinite(at)` guard as defence in depth. ARCHITECTURE: remove them (complete over simple; Breaking). PITFALLS: do not delete a check the type cannot enforce. INV-QD-101, BEH-QD-253 and `spec/overview.md:777` move with whichever is chosen.
- **Row `unknownKeys`.** `refuse` (FEATURES, ARCHITECTURE; BEH-QD-625) or `ignore` (STACK notes it matches core, but it changes the reader/writer agreement).
- **Refusal-message table.** The no-record message `"an audit row has no record"` changes under envelope-first; precedence flips on double-defect rows. Tags must not move. Decide and tabulate in the ADR.
- **How a host assigns `sequenceNumber`.** Re-read via `decodeAuditEntry` (ARCHITECTURE: no public setter, add a test helper `numbered`) or a public codec-owned `withSequenceNumber` (FEATURES). The second adds a gate-13 row and a gate-14 probe.
- **Should the writer re-validate?** FEATURES: no (trust the type, cover with the property test). Revisit if the brand is type-only.

**Phase 78**
- Equal-effective-capacity resize: store-level no-op (recommended by FEATURES and ARCHITECTURE) and how it interacts with the feed's "omitted reads as `undefined`" identity rule.
- Resize while paused: release the pause like `clear` (both agree, but it is untested today).
- Invalid capacity: validate before mutating (today `configure` assigns `inputs = next` first, leaving a half-applied state); throw vs typed result.
- Whether `useTimelineStore(options)` honours a changed `capacity` (FEATURES: leave it).

**Phase 79**
- **First-render sequence, and how configure folds into the build hook.** STACK: a post-build `useLayoutEffect(..., [value, inputs])`, then check for an `Off` flash. FEATURES and ARCHITECTURE: configure inside the build, before `setValue`. PITFALLS: configure inside the build is unsafe after a hidden `Activity` rebuild unless it reads a latest-inputs ref or keeps a second effect. Choose between latest-inputs ref vs second effect.
- **`sameFields`' omitted-vs-`undefined` handling.** Normalise inputs to explicit `undefined` (STACK, FEATURES) vs a closed field list per feed (ARCHITECTURE). `sameFields<K extends object>` has no `Required` bound; `makeDerivedStore` does.
- **Diagnostics `undefined` vs `{}` presence rule.** It must be a separate first-class on/off transition (FEATURES, ARCHITECTURE, PITFALLS agree), but the mechanism is open.
- **`GatesFeed` restart-on-`watchFailure` (G43).** Part of the rule's key, or a stated documented exception. Do not drop silently.
- **`DockModel.configure` dispatch order and `shownReading.refresh()` only-if-moved.** The rule decides whether a feed restarts, not the order.
- **Throw during first `configure` inside the build.** Scope closed vs model kept.

**Phase 80**
- **Do `picking`/`picked` survive a tab switch?** The review and PITFALLS treat "pick survives a tab switch" as the point. ARCHITECTURE and FEATURES insist the adapter's unmount cleanup calls `cancel()` and `clear()` (BEH-QD-234's third exit; `QuestionsPanel.gates.test.tsx:252-265, 394-`). `spec/devtools-spec/01-shell.md:72` says "opening the inspector exits lens mode". A persisted `picked` re-runs `scrollIntoView` on remount, and a persisted highlight redraws unasked. This needs an explicit decision and an ADR row for every changed behaviour.
- **Stale-pick rule.** Reuse `HeldChoice.resolveHeld` with an `Evicted` state (INV-QD-107, the precedent; FEATURES and PITFALLS agree) vs inventing a new rule. Auto-clearing is rejected by FEATURES.
- **`choose` on a hook, `hover` for an unknown id, hover/choose while not picking.** Headless-only edge cases with no current test.
- **Where the overlay's lifetime ends.** Only the adapter touches `document`, so the model's scope cannot clear it.
- **`instrument` removal.** All three of STACK, FEATURES and ARCHITECTURE recommend removal (no reader in `packages/*/src`; the `instrument` prop stays). It is Breaking for `@qadi/react`. Keeping it requires recording a reason and a first reader. Readers in `examples/` and `website/` were not exhaustively searched.

### Research Flags

Phases likely needing deeper research or a spike during planning:
- **Phase 77:** deepest pre-planning probe. Compile the brand form, probe `Equal`/`Hash` on the chosen form, and enumerate whole-archive writer inputs (entries, `now`, `keyMaterial`) through `readAuditArchive(JSON.parse(JSON.stringify(archive)))`. Run `/gsd-plan-phase --research-phase 77`.
- **Phase 79:** render-sequence spike (first-render, StrictMode, hidden `Activity`) before planning. Run `/gsd-plan-phase --research-phase 79`.

Phases with standard patterns (skip research-phase):
- **Phase 78:** `clear`, `setPaused` and `SupersedingRun` are direct precedents, and TF1-TF29 are the pinned proof.
- **Phase 80:** `DockSession`, `ExplorerSession` and `HeldChoice` are precedents; the open items are decisions, not unknown technology.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions read from `node_modules` and the lockfile; brand behaviour probed with a throwaway typechecked and run file. Unverified: `Brand.nominal` on the exact `AuditEntry` shape with `record: SinkRecordJson`. |
| Features | HIGH / MEDIUM | HIGH for pinned behaviour (read with file:line) and for the Phase 77 defect (reproduced, 4 of 4 rows). MEDIUM for recommended shapes, and for the Phase 78 resize-while-paused and half-applied-state claims (code trace, not run). |
| Architecture | HIGH / MEDIUM | HIGH for what exists and file:line. MEDIUM for the live defect as ARCHITECTURE stated it (superseded by the FEATURES reproduction) and for recommendations. |
| Pitfalls | HIGH / MEDIUM | HIGH for repo mechanics and wave history. Three runtime claims marked **[verify]** (class-brand `Equal`/`Hash`, which writer inputs the reader refuses, the `declare private readonly` marker compiling in audit). |

**Overall confidence:** HIGH that the scope is right and nothing new is needed; MEDIUM on the brand and first-render designs until the two spikes run.

### Gaps to Address

- **Brand mechanism, undated fate, lens-persistence, `instrument`:** open decisions above; resolve in each phase's discuss step, not here.
- **Writer-side agreement beyond entries:** the `now: NaN` and `keyMaterial` variants are reasoned, not run. The RED test enumerates them; if one does not reproduce, record "refuted at the base" for that half.
- **Repo-wide greps not done:** `examples/**` and `website/**` for `AuditEntry` literals, `instrument` readers and `makeXFeed(init)` calls. Run at plan time.
- **Mutation baselines:** none measured. Commit per-file Stryker baselines alone and first for `AuditEntry.ts`, `ArchiveFacts.ts`, `AuditArchive.ts`, `Retention.ts`, `TimelineStore.ts`, `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `ExternalStore.ts` and `DockModel.ts`. `LensSession.ts` is new and needs a bar set up front.
- **Serial-phase staleness:** shared `dockModelFixtures.ts` and `DockModel.ts` are edited by 79 and 80. Keep characterisation files out of shared helpers, re-run earlier phases' record scripts at each close, and re-verify 77-79 at milestone close.
- **Test churn:** about 35 audit row-spread sites in 9 test files (77); about 208-213 `make*Feed(init)` call sites (79; one fixture helper `built(make, inputs)` rather than hand edits).

## Sources

### Primary (HIGH confidence)
- `node_modules/effect` 4.1.2 declarations and source (`Brand`, `Schema.brand`, `Equal`, `Hash`), `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- Repo source and tests read at `ab8ccb75`: `packages/audit/src/*`, `packages/core/src/{SinkCodec,UntrustedDecode,Identity,Admission}.ts`, `packages/devtools/src/{model,react}/*`, `packages/react/src/QadiProvider.tsx`, `scripts/check-package-install.mjs`, `scripts/check-house-style.mjs`
- Spec registers and ADRs: ADR-QD-047, 099, 110, 111, 137, 168, 170, 171, 173, 177, 185; BEH-QD-234, 253, 254, 312, 481, 489, 625, 700; INV-QD-053, 101, 107, 390
- `AGENTS.md`, `.planning/PROJECT.md`, `.planning/RETROSPECTIVE.md`, v1.5-v1.8 audits and phase reviews
- Phase 77 defect reproduction (FEATURES): throwaway vitest run, deleted afterwards
- Brand probe (STACK): throwaway typecheck plus one `tsx` run, deleted afterwards

### Secondary (MEDIUM confidence)
- The owner's architecture review for this wave (session-scoped HTML). It flags its own audit claim as unreproduced; FEATURES has since reproduced it.

### Tertiary (LOW confidence, needs validation)
- Resize-while-paused behaviour and the half-applied invalid-capacity state (code trace, not executed).
- The first-render `Off` flash (derived by tracing; the characterisation test settles it).
- `Equal`/`Hash` on a class-instance brand.

---
*Research completed: 2026-11-23*
*Ready for roadmap: yes*
