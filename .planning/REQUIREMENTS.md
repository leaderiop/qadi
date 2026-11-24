# Requirements: Qadi v1.9 Arch Wave 14

**Defined:** 2026-11-23
**Core Value:** An authorization decision is never wrong and never silent.

**Source:** the 2026-11-23 architecture review and `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS,
SUMMARY). Per-phase evidence, owner decisions and reserved numbers are in `.planning/phases/_WAVE14-CONTEXT.md`. Every
phase runs on branch `arch-wave-14`, strictly serial (77 → 80).

## v1.9 Requirements

### An audit row is a value only its codec makes (Phase 77, ARCH-124, audit; live defect; Breaking)

- [x] **AROW-01**: A regression test written on the phase base, without `as`, is RED for each writer input the reader refuses: at least a type-valid row whose record has `at: NaN` (`archiveAuditTrail` writes it, `readAuditArchive` refuses it as `EntryNotDecodable`) and `archiveAuditTrail(entries, NaN)` (`createdAt: null`). Every other writer input enumerated (including `keyMaterial`) is either RED or recorded as "refuted at the base". All are GREEN after the change: every archive `archiveAuditTrail` returns is read back by `readAuditArchive(JSON.parse(JSON.stringify(archive)))`.
- [x] **AROW-02**: `AuditEntry` can be obtained only from `encodeAuditEntry` or `decodeAuditEntry`. A literal, a spread of an existing row with a changed field, and the exported schema value cannot produce one without a compile error, pinned by type tests that can fail (`@ts-expect-error` with `toRaiseError`, plus a positive twin). The mechanism is decided at the discuss step after a probe, and recorded. The row keeps its `JSON.stringify` bytes, its key-absent `sequenceNumber` and the structural `Equal`/`Hash` that `holds()` and `planPurge` use.
- [x] **AROW-03**: A host can still assign a `sequenceNumber` after encoding, through a route the codec owns (for example, re-reading through `decodeAuditEntry` or a codec-owned setter). The route is decided and recorded.
- [x] **AROW-04**: `decodeAuditEntry` reads the envelope first, with `record` unwalked, then the record, as core's stored-record read does. It uses `untrustedDecoder` and adds no `Schema.decode*` or `JSON.parse` token. The refusal tags are unchanged. A characterisation matrix written on the phase base, including a row where both the envelope and the record are bad, shows every message and precedence change, and the ADR tabulates them.
- [x] **AROW-05**: The checks the brand makes dead are removed, or kept with a recorded reason: `ArchiveFacts`' `isSequenceNumber` and the write-path `SequenceNumberInvalid`, and `Retention`'s `undated` branch and fields. `sequenceNumber`'s safe-integer rule is stated in one place. A record-domain round-trip property mirrors `ArchiveRoundTrip.test.ts`'s sequence-number one.
- [x] **AROW-06**: ADR-QD-190 records the brand, the decode order and the refusal table, and amends ADR-QD-110. INV-QD-101, BEH-QD-253 and the affected `spec/overview.md` rows move with the decision. A `@qadi/audit` changeset marks the change **Breaking**, with an upgrade-guide entry.

### `TimelineStore` owns its capacity (Phase 78, ARCH-125, devtools)

- [ ] **TRSZ-01**: `TimelineStore` has a `resize(capacity)` command. It validates the capacity before changing anything, does nothing for the same effective capacity, empties the timeline at the new bound, releases the pause, and notifies subscribers once. Each of these is pinned in `TimelineStore.test.ts` without a scope or a source.
- [ ] **TRSZ-02**: `makeTimelineFeed` returns its one store. The six-member forwarder, the mirror `view` store, the `push` listener and the subscription left on a dropped store are deleted. `idleTimeline` gains the member.
- [ ] **TRSZ-03**: The host's store keeps the same identity across a capacity change. `try { resize } finally { readSource }` and the `reads.closed()` guard stay. TF4, TF14, TF26, TF27 and TF29 pass unedited. A capacity change that throws leaves the feed's inputs unchanged (no half-applied state).
- [ ] **TRSZ-04**: ADR-QD-191 records the command, or ADR-QD-137 is amended and 191 is named unused. `spec/overview.md` and a `@qadi/devtools` changeset cover the new public member.

### Feeds and the dock model take inputs only through `configure` (Phase 79, ARCH-126, devtools; Breaking)

- [ ] **CONF-01**: A characterisation test written on the phase base, and green there, pins the dock's first-render sequence (diagnostics, gates and the Questions join), plainly and under StrictMode. The same test is green after the change: no reader sees an unconfigured model.
- [ ] **CONF-02**: `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed`, `makeDockModel` (and `makeSimulationSession`, if it has the same shape) are built with no inputs, and `configure` is the only way inputs arrive. The first `configure` produces what today's `init` produces.
- [ ] **CONF-03**: Whether an input moved is decided by one per-field identity rule, the one `makeDerivedStore` uses. Omitted and `undefined` inputs are treated alike, diagnostics on and off stays a distinct transition, and the gates feed's re-watch after a failed watch (G43) is either part of the rule or a stated exception. A new input field cannot compile without being compared.
- [ ] **CONF-04**: One package-private hook does "build in a scope, then configure with the latest inputs". `useDockModel`, `useTimeline`, `useDiagnostics` (and `useSimulationSession`, where it fits) use it. A hidden `Activity` or a StrictMode rebuild configures with the current inputs, not stale ones.
- [ ] **CONF-05**: The dock's input type is stated once: `UseDockModelInput` is gone, and `DevtoolsDockProps` is `DockModelInputs` plus the host-only props. Inputs are mapped onto each feed in one place in `DockModel`.
- [ ] **CONF-06**: Gate 14's packed consumer, `surface.tst.ts`, the compiled README fence, the website's devtools page, `spec/behaviors` and the ADR fences use the new signatures, in the same plan as the change. ADR-QD-192 amends ADR-QD-137, ADR-QD-173 and ADR-QD-185. A `@qadi/devtools` changeset marks it **Breaking**, with an upgrade-guide entry.

### The highlight lens is a headless session (Phase 80, ARCH-127, devtools + react)

- [ ] **LENS-01**: A package-private `LensSession` in `model/` holds `highlighted`, `picking` and `picked`. Its transitions are toggle, hover, choose (which says whether the click is consumed), cancel, highlight and clear. Each rule that today lives in `useLens`'s handlers is pinned by plain calls, under the model's mutation gate.
- [ ] **LENS-02**: The dock model owns the session as its tenth store. BEH-QD-700, INV-QD-390, ADR-QD-185 and the store-list test move together. `DockModel.ts`'s mutation score does not fall.
- [ ] **LENS-03**: `useLens` keeps only the document listeners and `drawLens`/`clearLens`. The click is swallowed synchronously in the capture listener, and the listeners are not re-added on every instance change. `QuestionsPanel.gates.test.tsx` and `Lens.test.ts` keep passing. Any behaviour change is preceded by a characterisation test.
- [ ] **LENS-04**: What happens to `picking` and `picked` across a tab switch, and to a picked id whose guard has gone, is decided at the discuss step against `spec/devtools-spec/01-shell.md:72`, BEH-QD-234 and INV-QD-107 (reusing `HeldChoice`'s rule where it fits). It is pinned by tests and recorded in ADR-QD-193.
- [ ] **LENS-05**: `QadiContextValue.instrument` is removed from `@qadi/react` (the provider's `instrument` prop stays), or the reason it stays is recorded with a first reader. A repo-wide search, including `examples/` and `website/`, is done first. Removing it comes with a **Breaking** `@qadi/react` changeset, an upgrade-guide entry, a `spec/overview.md` edit and a dated ADR-QD-111 amendment.

### Cross-cutting (every v1.9 phase)

- [x] **WX-01**: `pnpm check:pr < /dev/null` is green at the end of each phase.
- [x] **WX-02**: Each phase records its ADR (or names it "Unused" in its CCR row), its CCR row, and its BEH/INV/traceability changes, using only its reserved numbers. `node scripts/next-id.mjs` is never run.
- [x] **WX-03**: `spec/overview.md` names every added export and drops every removed one (gate 13). Gate 14 probes every changed `make*Feed` signature.
- [x] **WX-04**: Nothing new is added from this list: `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock, `Record<string, unknown>`, `// Stryker disable`, a module-scope `let`. A budget changes only together with its AGENTS.md table.
- [x] **WX-05**: Coverage thresholds hold (core at least 95%, the others at least 90%). The Stryker score of touched files does not fall: recorded per phase in `NN-mutation-base.json`, measured with the same invocation at the phase base and at close. A drop is closed with a test, never re-baselined.
- [x] **WX-06**: Every behaviour change is preceded by a characterisation or regression test written on the phase base: RED for a defect, green for preserved behaviour. Every new check is shown failing once.
- [x] **WX-07**: No D-numbers, plan-local ids or phase numbers enter shipped source, test titles or BDD scenarios. Nothing is released or published, and no version-packages PR is merged.

## Future Requirements

- Align `@qadi/react`'s gate registry, which swallows listener errors, with ADR-QD-177's rethrow contract (carried from v1.7).
- Guard the publish-between-`begin()`-and-`fork()` window in the devtools feeds (carried from v1.7, D7).
- Truncate-on-resize or grow-keeps-entries for the timeline: a resize empties today, and nobody has asked for more.
- Structural (deep) identity for feed inputs (`source`, `layer`, `collector`, `catalogue`, `ports`): identity is the rule today.
- Exporting the lens session from `@qadi/devtools`' barrel.

## Out of Scope

| Item | Reason |
|------|--------|
| A general "unwalked member decoded by its own decoder" option on `untrustedDecoder` | Its four users have different refusal policies; Phase 77 takes the one concrete inconsistency |
| Merging the tag-keyed error tables | Each is compiler-checked, and `catchTag` needs a literal tuple |
| Changing `ArchiveRefusal`'s members or `ARCHIVE_VERSION` | Phase 77 changes what the writer accepts, not the archive format |
| Upgrading any dependency | STACK: every API needed is installed |
| Formatting with `oxfmt` | AGENTS.md §17 |
| Merge, release or publish | Standing instruction: release only when the user explicitly asks for "the release" |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AROW-01 | Phase 77 | Complete |
| AROW-02 | Phase 77 | Complete |
| AROW-03 | Phase 77 | Complete |
| AROW-04 | Phase 77 | Complete |
| AROW-05 | Phase 77 | Complete |
| AROW-06 | Phase 77 | Complete |
| TRSZ-01 | Phase 78 | Pending |
| TRSZ-02 | Phase 78 | Pending |
| TRSZ-03 | Phase 78 | Pending |
| TRSZ-04 | Phase 78 | Pending |
| CONF-01 | Phase 79 | Pending |
| CONF-02 | Phase 79 | Pending |
| CONF-03 | Phase 79 | Pending |
| CONF-04 | Phase 79 | Pending |
| CONF-05 | Phase 79 | Pending |
| CONF-06 | Phase 79 | Pending |
| LENS-01 | Phase 80 | Pending |
| LENS-02 | Phase 80 | Pending |
| LENS-03 | Phase 80 | Pending |
| LENS-04 | Phase 80 | Pending |
| LENS-05 | Phase 80 | Pending |
| WX-01 | All v1.9 phases | Complete |
| WX-02 | All v1.9 phases | Complete |
| WX-03 | All v1.9 phases | Complete |
| WX-04 | All v1.9 phases | Complete |
| WX-05 | All v1.9 phases | Complete |
| WX-06 | All v1.9 phases | Complete |
| WX-07 | All v1.9 phases | Complete |

**Coverage:**
- v1.9 requirements: 28 total (21 phase-specific + 7 cross-cutting)
- Mapped to phases: 28 (21 phase-specific, each to exactly one of Phases 77 to 80; 7 cross-cutting, each applying to all four)
- Unmapped: 0

---
*Requirements defined: 2026-11-23*
*Last updated: 2026-11-23 after roadmap creation (traceability verified against ROADMAP.md: 28/28 mapped)*
