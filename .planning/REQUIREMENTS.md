# Requirements: Qadi v1.11 Arch Wave 16

**Defined:** 2026-11-25
**Core Value:** An authorization decision is never wrong and never silent.

**Source:** the 2026-11-25 architecture review (`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/b04729bd-9815-4720-957d-3637602848ac/scratchpad/architecture-review-20261125.html`, session-scoped) and `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY). Per-phase evidence, decisions and reserved numbers go in `.planning/phases/_WAVE16-CONTEXT.md`. Every phase runs on branch `arch-wave-16` (off `main` at `ac7578f3`), strictly serial (85 → 91). Scope (all seven candidates), the Phase 91 fold rule (fold, prove acyclic) and research (run) were chosen by the owner on 2026-11-25; every other grey area is decided at its phase's discuss step, taking the most complete, clean design.

## v1.11 Requirements

### The dock's hydration block is a model row (Phase 85, ARCH-132, devtools)

- [ ] **HYDV-01**: A characterisation written on the phase base, green there and after, pins every hydration block state the panel renders today (Pending, Unwired, Counts with its rate sentence, raised-drops filter and unaccounted scope text, the activity-over-status precedence, the "0 dehydrated entries" wording), using the two `QuestionsPanel` HTML-string files as the byte oracle plus the cells they lack.
- [ ] **HYDV-02**: A pure hydration view beside `portCards` returns a closed tagged union (Pending / Unwired / Counts with its text worked out) and is tested as a table, under `src/model/` and the devtools mutation gate. No JSX enters `model/`.
- [ ] **HYDV-03**: The dock model serves the view (as its own derived store or on an existing one, decided at discuss) keyed per field so an unchanged reading publishes nothing; the three distinct "unsampled" predicates (questions with `supplied === undefined`, services unguarded, hydration with activity precedence) each stay as they are and are stated once each, not flattened into one.
- [ ] **HYDV-04**: `QuestionsPanel` renders the view's tag and decides nothing; `DockFrame` no longer subscribes to the whole merged reading to pass `hydration` along, and keeps only what its notice needs (status). Every `data-testid` is unchanged.
- [ ] **HYDV-05**: ADR-QD-198 records the phase (or ADR-QD-185 is amended and 198 named unused); BEH-QD-700/699/735, INV-QD-390, BEH-QD-218's table (a hydration row) and the store-name pins move with it.

### `QadiProvider`'s registry lifetime has a React-free owner (Phase 86, ARCH-133, react)

- [ ] **PREG-01**: The existing lifetime suites (LT1–LT18, RL1–RL10 and the `QadiProvider.*.test.tsx` files) stay green and unedited across the phase, and a characterisation of create / seed / subject write / recycle / atoms-replaced is written on the base before anything moves.
- [ ] **PREG-02**: One package-private, React-free module owns the registry: create, seed (subject and `initialValues`), write the subject, recycle (`reset`, never `dispose`) and hold/release through the unchanged `RegistryLease`. It is inert at construction and is added to `stryker.react.mjs`.
- [ ] **PREG-03**: The owner is tested without rendering, against a real `AtomRegistry` and an injected `defer`: never-run, cancel-once, run-after-cancel recycles nothing, a long hide recycles exactly once and re-seeds from the latest props before any read. Every "recycles nothing" test has a "recycles once" twin that fails if the recycle is removed.
- [ ] **PREG-04**: `QadiProvider` keeps one lifetime ref and forwards hold, release and subject changes; it holds no branch of lifetime logic (it stays outside the mutate list). Effect order is unchanged (commit before hold, hold last), and every alternative ADR-QD-195 rejected stays rejected.
- [ ] **PREG-05**: ADR-QD-199 records the owner (or ADR-QD-195 is amended and 199 named unused); BEH/INV/traceability move with it; the render suite shrinks to StrictMode, `<Activity>` and SSR smoke tests only where the owner's tests now hold the property.

### One scoped run that states its stop (Phase 87, ARCH-134, devtools)

- [ ] **STOP-01**: A test written on the phase base is RED there and GREEN after: a `SimulationSession` run that dies reports `Broke.message` equal to `causeMessage(cause)` (today it is `String(exit.cause)`, `Cause([Die(...)])`), with a hostile-value case. A characterisation pins each feed's current status sequence, including what a self-interrupt does today (SR1: the session reads `Broke`).
- [ ] **STOP-02**: One package-private module above `SupersedingRun` owns, once: publish-then-fork through a callback (a listener's throw on the start-up publish is rethrown after the new run has started, ADR-QD-194), failure → stopped with `causeMessage`, `restart`, the closed guard and the token-guarded sink. `TimelineFeed` and `DiagnosticsFeed` supply only their engine and states.
- [ ] **STOP-03**: The configure prologue (closed guard, normaliser, identity gate) is stated once with a parameterised gate, used by the timeline, diagnostics (`sameFieldsOrAbsent`) and gates (`watchFailure` retry) feeds; `GatesFeed` keeps forking before it publishes (INV-QD-408).
- [ ] **STOP-04**: `SimulationSession` shares publish-then-fork and the stop-message rule, and keeps its own exit read so a self-interrupted run still reads `Broke`. The feeds' self-interrupt behaviour is decided and pinned (kept or changed, with its own test and ADR line).
- [ ] **STOP-05**: A new ADR-QD-200 applies (does not reopen) ADR-QD-150 point 2 and extends ADR-QD-182 decision 10 to the session; ADR-QD-192/194 and the `ThrownMessage.ts` doc are amended in the same change; the per-feed tests (TF21–23, TF28, F28–31, F33, SR5–6) stay unedited; a `@qadi/devtools` patch changeset records the Simulator text change.

### `StoppedBox` keys itself and owns the announce-once rule (Phase 88, ARCH-135, devtools)

- [ ] **SBOX-01**: A characterisation written on the base pins the announce-once behaviour (a stop is announced once per stop, not again on a tab switch, not lost under StrictMode), including TN14 and D7 and the `DockFrame` stop characterisation.
- [ ] **SBOX-02**: `StoppedBox` derives its own key and writes the ledger (an outer keyed wrapper over an inner body): callers stop calling `stoppedKey` and stop threading the ledger ref through private bindings. The ledger stays above the screens (per feed), so it outlives tab switches.
- [ ] **SBOX-03**: The ledger transition is a pure function with a table test; the alert is decided at mount and recorded at commit, never written during render. No module-scope ledger.
- [ ] **SBOX-04**: ADR-QD-201 records the change (or ADR-QD-197 is amended and 201 named unused); BEH/INV/traceability move with it; the unmeasured React files are listed in the phase's `UNMEASURED` and proved with scratch variants.

### One admission step for a host's audit batch (Phase 89, ARCH-136, audit)

- [ ] **ADMIT-01**: A characterisation written on the base pins, for each entry point (`archiveAuditTrail`, `planRetention`, `planPurge`, `verifiedArchiveFacts`, the public verify), which refusal wins for every pair of faults, and the spans each opens on a refusal.
- [ ] **ADMIT-02**: One package-private admission step checks a host batch (`now`, rows, the terms each caller adds) in the order the characterisation pins, and every entry point calls it first. It is a plain function (no new span); `CodecMade.ts` stays an import-free leaf.
- [ ] **ADMIT-03**: `NowNotFinite` is stated once (a fragment shared into both public refusal unions, as `RowsRefusalCases` is); both unions, both error classes, every tag and member are unchanged (no Breaking change, `SCHEMA_ERROR_BUDGET` stays 12), and a type pin proves each union equals its fragments plus its own members.
- [ ] **ADMIT-04**: The check order is tested once at the admission step; `ForeignRows.test.ts` keeps one case per entry point proving it calls the step, rather than re-testing the order.
- [ ] **ADMIT-05**: ADR-QD-202 records the step (or ADR-QD-190 is amended and 202 named unused); BEH-QD-722 and INV/traceability move with it.

### The remaining per-port facts live on the port description (Phase 90, ARCH-137, core)

- [ ] **PFACT-01**: Plan 1 is a spike on the base: a `pnpm circular` simulation of each proposed derivation and the benchmark gate for routing `readScoped` off `LEAF_NEEDS`. Its verdict decides which facts move; a recorded subset is an acceptable outcome, a cycle is not.
- [ ] **PFACT-02**: `PortName.ts` stays an import-free leaf holding one tuple; every other per-port table the spike clears (span names, fixture data type, serving shape, `PORT_NAMES_BY_NAME`, `ScopedPort`) is derived from the descriptions or the tuple, with registry order preserved so no metric key moves (ADR-QD-052).
- [ ] **PFACT-03**: `readScoped` routes off the `LEAF_NEEDS` row: an id is required only where the row says so (a by-scope leaf only at `Resource` scope), it stays a plain function with no new span, it dispatches with a hoisted `Match` (no `switch`), and the annotate-before-fail order (BEH-QD-445) holds. The tying test is replaced, not deleted.
- [ ] **PFACT-04**: A golden of `tabulatePorts`, a metric snapshot and the served/wire bytes are pinned on the base and unchanged after; `PortServing.tst.ts` passes unedited; a fake sixth port without its facts is a compile error.
- [ ] **PFACT-05**: ADR-QD-203 records the change, amending ADR-QD-163 D-06 and ADR-QD-094, with a dated ADR-QD-114 note if `PortServing` stops being hand-written; AGENTS.md §3 prose and BEH/INV/traceability move with it.

### Named barrels, and visibility-only files folded away (Phase 91, ARCH-138, core / react / audit)

- [ ] **BARL-01**: A surface-diff tool (`{name, value-or-type}` per package, from the built `lib/` and the compiler, with a planted-defect self-test) is committed before any barrel changes; the public surface at the phase base is the baseline and is identical at the end (gate 13 count and every name's kind).
- [ ] **BARL-02**: `@qadi/core`, `@qadi/react` and `@qadi/audit` barrels name their exports per module (generated from compiler symbol flags, never hand-typed), one commit per barrel, with no mixed `export *` state; `useQadiContext` stays public; no dependent package's `.d.ts` reaches into another's `src` (a `../../` escape check added to gate 14).
- [ ] **BARL-03**: Each visibility-only file folds into the module that owns its concept, one fold per commit, `pnpm circular` clean after each: `PortSpanDecode` into `PortSpanEncode`, `PortInterpreter` into `PortSpan`, `GateRegistry` into `GateWriter`, `SequenceIntegrity` into `ArchiveFacts` (its "not tamper-evident" disclaimer and its four citations re-pointed). `Hydration.ts` folds only if `hydrateDecisions` takes a structural parameter that removes the cycle; otherwise it stays and the cycle is recorded. Every fold madge refuses is recorded with its verdict.
- [ ] **BARL-04**: The house-style rule `devtools-named-barrel` becomes a named-barrel rule over all five named barrels (with a self-test planting an `export *`); `SPAN_KEY_SHARED`, the `UNTRUSTED_DECODE_BUDGET` row and AGENTS.md §7a follow the folded span file in the same commit; AGENTS.md §9, §16 and CONTRIBUTING.md are rewritten for the new rule.
- [ ] **BARL-05**: ADR-QD-204 records the barrel rule and the folds, amending ADR-QD-037, 047 and 099 and removing the PROJECT.md Out of Scope line the folds supersede; `spec/overview.md` names each export at its new home; a changeset records any public declaration change (the structural `hydrateDecisions` parameter, if taken).

### Cross-cutting (every v1.11 phase)

- [ ] **WX-01**: `pnpm check:pr < /dev/null` is green at the end of each phase.
- [ ] **WX-02**: Each phase records its ADR (or names it "Unused" in its CCR row), its CCR row, and its BEH/INV/traceability changes, using only its reserved numbers (ADR-QD-198..204, CCR-QD-477..483, BEH-QD-761..795, INV-QD-415..428; per phase in order: one ADR, one CCR, five BEH, two INV). `node scripts/next-id.mjs` is never run.
- [ ] **WX-03**: `spec/overview.md` names every added export and drops every removed one (gate 13). Gate 14 probes every changed public signature. The changeset policy (a patch per edited public package, or none for package-private moves) is decided once at Phase 85's discuss and applied across the wave.
- [ ] **WX-04**: Nothing new is added from this list: `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await` in src, ambient `console`/`process.env`/clock, `Record<string, unknown>`, `// Stryker disable`, a module-scope `let`. A budget changes only together with its AGENTS.md table, in one commit.
- [ ] **WX-05**: Coverage thresholds hold (core at least 95%, the others at least 90%). The Stryker score of touched files does not fall: re-taken per phase in `NN-mutation-base.json` at the phase base and at close with the same invocation (a `RENAMED` map for folds). A drop is closed with a test, never re-baselined. Unmeasured React files are listed per phase.
- [ ] **WX-06**: Every behaviour change is preceded by a characterisation or regression test written on the phase base: RED for a change, green for preserved behaviour. Every new check is shown failing once, with the scratch variant and failing text recorded.
- [ ] **WX-07**: No D-numbers, plan-local ids or phase numbers enter shipped source, test titles or BDD scenarios. Nothing is released, published, pushed or merged, and no version-packages PR is merged. Nothing under `.planning/milestones` is staged with `git add -A`.

## Future Requirements

- Align `@qadi/react`'s gate registry, which swallows listener errors, with ADR-QD-177's rethrow contract (carried from v1.7).
- Structural (deep) identity for feed inputs (carried from v1.9).
- Exporting the lens session from `@qadi/devtools`' barrel (carried from v1.9).
- Upstream: `@effect/atom-react`'s `RegistryProvider` has the same dispose-in-cleanup shape as the defect v1.10 Phase 82 fixed.
- HydrationEngine's tests consolidated onto the public seam (the review's "leave alone" note; ~75 lines exported only for a type test, ADR-QD-183).

## Out of Scope

| Item | Reason |
|------|--------|
| A one-call `run(effect)` for the feeds | ADR-QD-150 rejected it; Phase 87's callback keeps the publish gap |
| Routing `SimulationSession` through `SupersedingRun`'s `onFailure` | It skips interrupt-only causes; SR1's self-interrupt would sit `Running` forever |
| Merging the two audit refusal unions or error classes | Breaking, and ADR-QD-190 rejected restating the row refusals |
| Deriving `PortName` from `Ports.ts` | Closes a madge cycle through every port module (ADR-QD-037) |
| Converting the http, testing, predicate-sql, predicate-prisma or promise barrels | Not in the review; their barrels are not producing visibility-only files |
| `export *` as a stepping stone in Phase 91 | Makes folded internals public and is invisible to gate 13 |
| A shared child-walk driver for Walk/Predicate | ADR-QD-073; measured and rejected |
| Upgrading any dependency | STACK: every API needed is installed |
| Formatting with `oxfmt` | AGENTS.md §17 |
| Merge, release or publish | Standing instruction: release only when the user explicitly asks for "the release" |

## Traceability

Which phases cover which requirements. Filled in by the roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|

**Coverage:**
- v1.11 requirements: 41 total (34 phase + 7 cross-cutting)
- Mapped to phases: 0 (roadmap pending)

---
*Requirements defined: 2026-11-25*
*Last updated: 2026-11-25 after initial definition*
