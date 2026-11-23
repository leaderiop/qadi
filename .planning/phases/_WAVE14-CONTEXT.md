# Wave 14 (v1.9): shared context for Phases 77–80

**Read first:** `.planning/phases/_SHARED-CONTEXT.md`. Its house rules, user preferences, verify-command hygiene and the
XC-05 mutation procedure all apply. **This file overrides only what it names:** the source, the base commit, the
numbering, the owner decisions and the per-phase evidence below.

**Source:** the 2026-11-23 architecture review,
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/8b5d3789-bd5e-4ce2-bf7e-0b31a0ae4995/scratchpad/architecture-review-20261123.html`
(session-scoped, outside the repo; it may be gone). One read-only explorer walked the files most often changed in the
last six milestone commits, and four researchers then wrote `.planning/research/` (STACK, FEATURES, ARCHITECTURE,
PITFALLS, SUMMARY). The milestone resolves all four candidates and the review's one small find, by a change or by a
recorded decision.

**Base commit:** the head of `arch-wave-14`, off `main` at `5784bbd6` (v1.8 merged as #164, not released). Each phase's
base is its first commit's parent; that rule is unchanged from `_SHARED-CONTEXT.md`.

## Owner decisions (asked once, 2026-11-23; locked)
- **D1 (scope):** all four review candidates become phases, and the small find (`QadiContextValue.instrument`, public,
  never read) folds into Phase 80.
- **D2 (order):** 77 → 78 → 79 → 80. The audit row goes first because it holds the only live defect; 78 must precede 79.
- **D3 (branch):** `arch-wave-14` off `main` at `5784bbd6`. No merge, no release.
- **D4 (research):** run; `.planning/research/` is this wave's research.

Decisions still to be asked, each once, at that phase's discuss step (the researchers disagree or the spec is silent):
- **Phase 77:** the brand mechanism (a type-level `Brand.nominal` on a plain object vs. a private-constructor class with
  a private marker, Phase 65's `admit` form, vs. `Schema.brand`). It must keep structural `Equal`/`Hash` for
  `VerifiedArchiveImpl.holds` and `planPurge` (`Retention.test.ts:198-232`) and the `JSON.stringify` bytes, and it must
  not survive a spread (`{...entry, sequenceNumber: 1.5}` keeps a type-level brand). Also: whether the exported
  `AuditEntry` schema value stays (it is a second way to mint), the fate of `undated` (INV-QD-101), how a host's store
  sets `sequenceNumber` after `encodeAuditEntry`, and the refusal-message table for the envelope-first decode.
- **Phase 79:** how `configure` folds into the build hook without the `Off → Starting` flash (configure inside the
  scoped build vs. a latest-inputs ref vs. keeping the second effect); omitted vs. `undefined` under `sameFields`;
  diagnostics `undefined` (off) vs. `{}` (on); how `GatesFeed`'s restart on `watchFailure !== undefined` (G43) fits
  "one rule"; whether `capacity: undefined` vs. the default capacity still wipes the timeline.
- **Phase 80:** whether `picking`/`picked` survive a tab switch (`spec/devtools-spec/01-shell.md:72`, BEH-QD-234's
  "three exits", INV-QD-107), the stale-pick rule (reuse `HeldChoice.resolveHeld`), and removing `instrument`
  (Breaking `@qadi/react`, amends ADR-QD-111).

## Execution order
Phases run strictly one at a time, in numeric order (77 → 80): every records plan edits the same spec registers, and
`use_worktrees` is false.

1. **77 first:** the live defect. It opens with a regression test seen RED on the phase base.
2. **78 before 79 (hard):** after 78, `TimelineFeed.configure` is two comparisons, so 79 does not rewrite plumbing 78
   deletes.
3. **79:** opens with a characterisation test of the first-render sequence, plain and under StrictMode.
4. **80 last:** adds a tenth dock-model store and no input, so it sits on 79's `configure`.

## Numbering reserved for v1.9
Next free on `ab8ccb75`: ADR-QD-190, CCR-QD-469, BEH-QD-721, INV-QD-399. The highest ARCH id in use is ARCH-123
(ARCH-124…127 are this wave's).

**The whole block below is reserved** in the shared reservation file
(`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`), set to CCR 472, ADR 193, BEH 740, INV 406 on 2026-11-23.
- **Never run `node scripts/next-id.mjs` while executing these phases**: every call writes a reservation.
- If a reservation goes unused, name it in the phase's CCR row ("Unused: …"). A phase that needs no new ADR (an amendment
  of an existing one suffices) leaves its ADR number unused and says so.
- Pass `--date 2026-11-23` (or the real date of the edit) to `spec-revise`.

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 77 | 124 | 190 | 469 | 721–725 | 399–400 |
| 78 | 125 | 191 | 470 | 726–730 | 401–402 |
| 79 | 126 | 192 | 471 | 731–735 | 403–404 |
| 80 | 127 | 193 | 472 | 736–740 | 405–406 |

ADR Document IDs must equal the file number (gate 10).

## Per-phase evidence

### Phase 77: An audit row is a value only its codec makes (ARCH-124, audit; live defect; Breaking)
- `AuditEntry` is a plain struct type any caller can build (`packages/audit/src/AuditEntry.ts:80-84`).
- **Live defect, confirmed by a throwaway probe (2026-11-23, deleted afterwards):** a type-valid row
  `{...e, record: {...e.record, at: NaN}}` is archived by `archiveAuditTrail` (`AuditArchive.ts:110-127`, which checks
  only sequence facts via `ArchiveFacts.ts:104-130`), `JSON.stringify` turns `at` into `null`, and `readAuditArchive`
  refuses the bundle with `EntryNotDecodable` (`AuditArchive.ts:290-306`). The package writes an archive its own reader
  refuses: the same class ADR-QD-110's WR-01 fixed for `sequenceNumber` only. A second, archive-level variant to
  include in the RED table: `archiveAuditTrail(entries, NaN)` writes `createdAt: null`. Enumerate the writer inputs and
  pin each one RED.
- **Restated rule:** the safe-integer rule for `sequenceNumber` is written twice, `AuditEntry.ts:56`
  (`Schema.optional(Schema.Int)`) and `ArchiveFacts.ts:56-64` (`Schema.is(Schema.Int)`), documented as kept in step at
  `AuditEntry.ts:50-54`.
- **Decode order:** `decodeAuditEntry` reads the record first, then the row (`AuditEntry.ts:149-157`, with a hand
  `hasProperty(input, "record")` pre-check and its own message). Core's stored record is envelope-first with `record`
  unwalked (`packages/core/src/SinkCodec.ts:603-651`, ADR-QD-170). `untrustedDecoder` already supports `unwalked`
  (`UntrustedDecode.ts:121-158`); no core change, no `UNTRUSTED_DECODE_BUDGET` change.
- **Pins that move:** UntrustedSeams A11/A12 pin `"an audit row has no record"` and the long `Expected {...}` text; tags
  stay. `AuditEntryDifferential.test.ts` must be re-pointed. Add a both-bad row (row and record invalid), since the
  refusal order flips.
- **Becomes dead if the brand holds:** `isSequenceNumber` (`ArchiveFacts.ts:64`), the public `SequenceNumberInvalid`
  (`:138`) on the write path, and `Retention.ts`'s `undated` branch (`:80-90`, `RetentionPlan`/`PurgePlan`). Removal is
  Breaking for `@qadi/audit` and amends ADR-QD-110.
- **Test churn:** about 35 literal or spread row sites across 9 audit test files, 5 type-pin files and one features
  step file. A `numbered(entry, n)` helper through the codec avoids hand-built rows.

### Phase 78: `TimelineStore` owns its capacity (ARCH-125, devtools)
- Capacity is captured once (`packages/devtools/src/model/TimelineStore.ts:49`). `TimelineFeed.ts:126-193` works around
  it: a mutable `inner`, a mirror `view` ExternalStore (`:129`), a `push` listener (`:132-133`), a six-member forwarder
  (`:136-141`), and a resize that drops the old store without unsubscribing (`:178`). `idleTimeline` (`:106`) writes the
  six members a third time.
- **Shape:** `resize(capacity)` on the store: validate before mutating, same effective capacity is a no-op, empty at the
  new bound, release the pause (today's behaviour, because a new inner store is unpaused), publish once (`publish`, not
  `set`, so the pause reset is heard).
- **Keep:** `try { resize } finally { readSource }` (ADR-QD-177, Phase 64 WR-01) and the `reads.closed()` guard
  (Phase 60 WR-02). TF4, TF14, TF26, TF27 and TF29 pass unedited.
- **Undecided today:** `inputs = next` is assigned before an invalid capacity throws (half-applied); `accept` at
  capacity 0; resize while paused is untested.
- `TimelineStore` is a public type, so a new member is a type-level change: a changeset and a `spec/overview.md` row
  (gate 13). Keeps ADR-QD-137.

### Phase 79: Feeds and the dock model take inputs only through `configure` (ARCH-126, devtools; Breaking)
- `useDockModel.ts:51-57` lists the eight inputs three times; the same field set is three types: `DevtoolsDockProps`
  (`DevtoolsDock.tsx:80`), `UseDockModelInput` (`useDockModel.ts:28`), `DockModelInputs` (`DockModel.ts:73`).
- `DockModel` maps inputs twice: `{ capacity, source }` at `:188` and `:283`; `{ gates, questions, intervalMillis }` at
  `:227-230` and `:293-296`.
- **Four hand-written restart rules:** Timeline (capacity, then source), Diagnostics (`DiagnosticsFeed.ts:197-200`:
  `undefined` is off, else three fields by identity), Gates (`GatesFeed.ts:261-268`, also restarts when
  `watchFailure !== undefined`, pinned by G43), Dock (unconditional `refresh()`). A new options field compiles and never
  restarts. The shared rule is `sameFields` (`ExternalStore.ts:133-146`, private, used by `makeDerivedStore` with a
  `Required<K>` bound on that function only).
- **Traps:** `sameFields` counts `{a}` vs `{a, b: undefined}` as a change; inputs must be normalised. Diagnostics
  presence is not a field comparison. `intervalMillis` crosses from diagnostics to gates.
- **Constructors lose `init`:** `TimelineFeed.ts:123`, `DiagnosticsFeed.ts:121`/`:196`, `GatesFeed.ts:157`,
  `DockModel.ts:209`, and `makeSimulationSession(init?)` per ADR-QD-137. Breaking; amends ADR-QD-137 and ADR-QD-173.
- **Same plan as the signature change:** gate 14's consumer (`scripts/check-package-install.mjs:653-712`, fails only in
  `pnpm spec:package`), `surface.tst.ts:302-305`, the compiled README fence (`packages/devtools/README.md:218-220`),
  website `devtools.md`, `spec/behaviors/28-*` and ADR fences, `spec/overview.md`.
- **First render:** today it is `Starting` then `Starting` (the idle stand-ins hide the unconfigured feed). Children's
  layout effects run before the parent's configure effect, and `isUnsampled(Off)` is false, so a bare constructor would
  make the Questions join briefly claim "not handed over". Pin the sequence on the phase base, plain and under
  StrictMode, before any change. `useScoped`'s `make` is read once, so folding configure into the build needs the
  latest inputs after a hidden `Activity`.
- **Test churn:** about 190–213 construction sites (`DockModel.test.ts` 77, `GatesFeed.test.ts` 38,
  `DiagnosticsFeed.test.ts` 33, `TimelineFeed.test.ts` 30); use one fixture helper.

### Phase 80: The highlight lens is a headless session; `instrument` resolved (ARCH-127, devtools + react)
- `packages/devtools/src/react/useLens.ts:43-120` holds `highlighted`, `picking`, `picked` in three `useState`s; the
  rules are in DOM handlers (a pick swallows the click only when a guard was found; Escape cancels picking and does not
  reset `picked`; toggle clears both; hovering nothing clears the highlight). Listeners are torn down and re-added on
  every `instances` change. Only DOM tests cover it (`QuestionsPanel.gates.test.tsx:267-410`), so the rules are outside
  the model's tests and Stryker gate: the defect class `ExplorerSession.ts`'s header records fixing.
- **Shape:** `model/LensSession.ts`, a plain `make…` session (like `makeDockSession`), the dock model's tenth store, no
  inputs. `choose(id)` returns whether the click is consumed, decided synchronously in the capture listener. `useLens`
  keeps three listeners, `drawLens`/`clearLens` (`react/Lens.ts`), and a cleanup that calls `cancel()` so BEH-QD-234's
  exit-on-unmount holds. `QuestionsPanel` takes a `lens` prop; `questionsPanelInput.ts` is the single seam for about 42
  panel renders.
- **Records that move:** the store list in `DockModel.test.ts:1743-1753`, BEH-QD-700 ("nine"), INV-QD-390, ADR-QD-185;
  `DockModel.ts` holds a mutation score of 1 (ADR-QD-168). `InstanceRow`'s `scrollIntoView` must not re-fire on remount.
- **Small find:** `QadiContextValue.instrument` (`packages/react/src/QadiProvider.tsx:62`, written at `:307-308`) has
  no reader in `packages/*/src` or tests; the provider's own `instrument` prop stays. Public through the barrel, so
  removal is a Breaking `@qadi/react` minor: changeset, the `0.13` upgrade-guide section, `spec/overview.md:570`, a
  dated ADR-QD-111 amendment (its "unchanged" sentence at `:40`), and the `useMemo` deps at `:91`.

## Cross-cutting
- Measure each touched file's mutation baseline at the phase base, and re-close after the review.
- Phases 78–80 edit the same files, so the milestone close re-verifies 77–79 and re-runs each phase's record scripts.
- Budgets that can move: `NOT_CALLABLE_PIN_BUDGET` (+ AGENTS.md §6 table) for new `.tst.ts` pins; `MODULE_STATE_BUDGET`
  must not grow; `SWITCH_BUDGET` and `UNTRACED_BUDGET` must not move.
- No plan-local ids (`D-01`, `WR-01`) in shipped titles; no `*-NEXT` placeholders.

## Considered and dropped by the review (do not re-propose in this wave)
- A general "unwalked member decoded by its own decoder" option on `untrustedDecoder`: its four users have different
  refusal policies (refuse, drop per entry, refuse by index). Phase 77 takes the one concrete inconsistency.
- Merging the tag-keyed error tables (`ERROR_CODES`, `ENFORCEMENT_ERROR_CLASSES`, `EVALUATION_ERROR_TAGS_BY_TAG`, the
  HTTP wire table): each is compiler-checked, and `catchTag` needs a literal tuple.
- Already deep, checked and left: HydrationEngine, PortWire/PortSpan/SinkCodec, QadiHttpError's wire table,
  SimulationFields, PortCards/ServicesPanel, unguardedRoutes, the two predicate compilers, DevtoolsFeed.
