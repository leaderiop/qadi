# Project Research Summary

**Project:** Qadi, milestone v1.11 "Arch Wave 16" (Phases 85-91, ARCH-132..138)
**Domain:** internal architecture deepening of an Effect v4 authorization monorepo (devtools dock model, `@qadi/react` provider, `@qadi/audit` admission, `@qadi/core` port descriptions, named barrels)
**Researched:** 2026-11-25 (branch `arch-wave-16` off `main` at `ac7578f3`; overwrites the v1.10 file)
**Confidence:** HIGH for mechanics and current behaviour (all four researchers read source and ran madge, `check-api-surface` and `Cause` probes on this tree); MEDIUM for the exact shape of Phases 87, 90 and the 91 Hydration fold.

## Executive Summary

This is not a product build. It is seven strictly serial refactors of an existing codebase, each of which moves a rule that is written in several places into one place, with the observable behaviour pinned first. No phase adds a dependency or changes a version (effect 4.1.2, React 19.3.1, TypeScript 7.0.2, vitest 5.1.0, madge 8.0.0, Stryker 10.1.1 are all as installed). No phase is Breaking: gate 13 stays at 942 exports with names unchanged. Phase 87 is a patch-level text change (the Simulator's broken-run message). The proven way to do each phase is already in the repo: a pure view beside a derived store (85), an owner module with an injected `defer` composing the unchanged lease (86), publish-then-fork through a callback (87), decide-at-mount and record-at-commit (88), admission as a plain function ahead of the facts (89), facts stated once on a port description with the registry derived (90), and named barrels generalised from the devtools precedent (91).

The recommended approach is to keep the 85 -> 91 order and treat each phase as "characterise on the base first, move, prove nothing moved". The four researchers agree on every load-bearing point: Phase 87's `String(exit.cause)` never throws, so its RED test asserts equality with `causeMessage`'s text (an inconsistency, not a live defect), and ADR-QD-182 decision 10 and `ThrownMessage.ts` get amended; `SimulationSession` must keep its own `Effect.exit` so SR1's self-interrupt still reads `Broke`; `Hydration.ts` cannot fold into `HydrationEngine.ts` without a cycle unless `hydrateDecisions` takes a structural parameter; `PortName.ts` must stay a leaf; barrels must be converted before any fold and generated from compiler symbol flags, because gate 13 cannot see `export type` against a value.

The main risks are checks that cannot fail (a bare negative tstyche pin on an `Effect`, a one-tick hide-and-show test, a fake `defer` nobody asserts on, a RED test that cannot be RED), budgets that move in only one of their two tables (`UNTRUSTED_DECODE_BUDGET`, `SPAN_KEY_SHARED`, the named-barrel rule), and Stryker lists that name files by path (`stryker.react.mjs` needs the Phase 86 owner added; Phase 88 code is outside every Stryker config). Mitigations are in the per-phase flags below, plus one cross-cutting rule: every new test or record script names the scratch variant that must turn it RED and records the failing assertion.

## Key Findings

### Recommended Stack

No stack change. All seven phases are TypeScript restructuring over APIs already installed. The facts the planner needs are version- and API-specific traps, not choices (full detail in STACK.md).

**Core technologies and what each phase relies on:**
- `AtomRegistry` (effect 4.1.2): `reset()` clears nodes and rethrows the first finalizer error after all are destroyed; `dispose()` is irreversible (the Wave 15 defect); `initialValues` is consumed once in the constructor, so pass an array. The recycle's `try/finally` subject write-back is load-bearing. Phase 86.
- `Effect.fork` does not exist in 4.1.2 (`forkChild`, `forkScoped`, `FiberHandle.runtime` do). The "fork" in the milestone text is `SupersedingRun.fork`. Phase 87.
- `causeMessage` from `@qadi/core` is `Cause.pretty` with a `thrownMessage` fallback. `String(cause)` is `Cause([Die(...)])` and never throws (reproduced). Phase 87.
- `madge` (`pnpm circular`, 245 files, clean today) counts type-only edges (ADR-QD-037); 2.6 s, so run after every fold. Phases 90 and 91.
- `check-api-surface.mjs` already parses named barrels; the 942 count is a mechanical invariant. `check-package-install.mjs` (gate 14) changes nothing for a named barrel.
- TypeScript 7 has no classic `ts.*` API; the parse API is `typescript/unstable/{sync,ast}` (used by `scripts/lib/module-state-scan.mjs`). Use it for the throwaway barrel generator; do not commit the generator.
- Stryker: `stryker.devtools.mjs` mutates `src/model/**` only (not `src/react/`); `stryker.react.mjs` lists five files by name; `stryker.audit.mjs` and the core config use globs minus `index.ts`. Committed baseline reports are stale; re-take at each phase base.

### Expected Features

"Features" here are the behaviours each deepening must keep or change.

**Must have (table stakes, all phases):**
- A characterisation committed and green on the phase base before the move (85: the two QuestionsPanel HTML-string files plus missing cells; 86: LT1-LT18 and RL1-RL10; 87: SR1, TF21-23, TF28, F28-31, F33, SR5-6; 88: TN14, D7; 89: a pair-fault table; 90: `tabulatePorts` golden plus metric snapshot; 91: surface diff).
- Public surface unchanged (942). Every `data-testid`, span name, refusal tag and status value identity stays.
- Spec edited in the same change: one ADR (dated amendments, never rewrites), one CCR, five BEH, two INV per phase, plus the traceability rows.
- Phase 87: RED test that the session's `Broke.message` equals `causeMessage(cause)` plus a hostile-value placeholder case; new ADR that applies (does not reopen) ADR-QD-150 point 2 and extends ADR-QD-182 decision 10 to the session.

**Should have (differentiators worth taking):**
- 85: `DockFrame` reads status only via a selector on `useStoreSnapshot`; `QuestionsPanel` reads the view store itself.
- 86: owner also holds `latest` and the subject write, so the "write the subject" rule exists once with the recycle's write-back.
- 87: record the feeds' self-interrupt policy deliberately; render `Broke.message` in the same `<pre>` treatment as `Stopped.reason` (it is multi-line now).
- 89: a type pin that both refusal unions equal fragments plus own members.
- 90: derive `PORT_NAMES_BY_NAME`, `PortFixtures` and `ScopedPort` from the same fact row; a fake-sixth-port compile-error test.
- 91: a `surface.test.ts` for core and audit (devtools has one).

**Defer / anti-features (do not do):**
- Merging the two audit refusal unions or error classes (Breaking, reopens ADR-QD-190); exporting the admission step.
- A one-call `run(effect)`; routing `SimulationSession` through `onFailure` unchanged; forcing `GatesFeed` through publish-then-fork (INV-QD-408 says the gates feed forks first).
- A fourth "nothing hydrated" hydration state; flattening the three `unsampled` predicates; fixing the "0 dehydrated entries" plural in passing.
- `dispose()`, a registry in state or an effect, re-applying seeds or `initialValues` on recycle, any module-scope `let` (MODULE_STATE_BUDGET).
- Any `export *` as a stepping stone in Phase 91; any public name added or removed; converting http, testing, predicate-* or promise barrels.

### Architecture Approach

Seven independent deepenings that share a gate surface, not a data flow. The only same-file overlaps are 85/88 (`DevtoolsDock.tsx` lines 110-115), 89/91 (`ArchiveFacts.ts`), 86/91 (`QadiProvider.tsx` imports), 90/91 (exported names), and each already has the earlier phase first.

**Major components (new or reshaped):**
1. `devtools/src/model/HydrationView.ts` (85): pure closed `Data.TaggedEnum` (`Pending | Unwired | Counts{rate, drops, scope}`), served by a fifth derived store, the eleventh `DockModel` store.
2. `react/src/ProviderRegistry.ts` (86): React-free owner (create, seed, commit, hold, release) composing the unchanged `RegistryLease.ts`; inert at construction; imports neither React nor the provider.
3. `devtools/src/model/StatedRun.ts` (87): publish-then-fork through a callback above the unchanged `SupersedingRun`; configure prologue (`admit`) shared with `GatesFeed`; stop text via `causeMessage`.
4. `StoppedBox` wrapper plus inner body (88): wrapper derives the key and writes the ledger; the ledger stays per feed in `useStopNotice`/`DockFrame` scope so it outlives screens.
5. `audit/src/HostBatch.ts` (89): plain-function admission, a `NowRefusalCases` type fragment intersected into both enums as `RowsRefusalCases` is; `CodecMade.ts` stays a leaf.
6. Port facts on the description (90): `PortName.ts` keeps one tuple and stays a leaf; everything else derives downwards from descriptions; `readScoped` routing reads `LEAF_NEEDS`.
7. Three named barrels (91): generated, then folds one per commit, `pnpm circular` after each.

**Fold verdicts (madge simulation; STACK and ARCHITECTURE agree):**

| Fold | Verdict |
|------|---------|
| `PortSpanDecode` into `PortSpanEncode` | acyclic, do |
| `PortInterpreter` into `PortSpan.ts` | acyclic, do (into `PortSpanEncode` is a cycle) |
| `PortSpanDecode` into `PortSpan.ts` | cycle, no |
| `GateRegistry` into `GateWriter` | acyclic, do |
| `SequenceIntegrity` into `ArchiveFacts` | acyclic, do (after Phase 89) |
| `Hydration.ts` into `HydrationEngine.ts` | cycle as written (`HydrationEngine -> QadiAtoms -> HydrationEngine`); folds only if `hydrateDecisions` takes a structural parameter declared in the engine |
| `EvaluationSpan` into the port span files | risky; keep apart unless `pnpm circular` proves it |
| `PortName` derived from `Ports.ts` | cycle, no |

### Critical Pitfalls

1. **A check that cannot fail (X-1).** Bare negative tstyche pins on `Effect`-returning functions pass for any args (use `Params<typeof f>` with a positive twin); one-tick hide-and-show tests never reach the recycle; a recording `defer` must assert never-run, cancel-once and run-after-cancel-recycles-nothing with a real `AtomRegistry`; Phase 87's RED cannot assert a throw. Prevention: name the scratch variant that turns each check RED and record the failing text in `NN-RED-EVIDENCE.md`; every record script gets a `--self-test`.
2. **Budgets that move in one table only (X-2).** `UNTRACED_BUDGET` (no `fnUntraced` in 87/90), `SWITCH_BUDGET` (use hoisted `Match.type` for `LEAF_NEEDS.resourceId` routing), `MODULE_STATE_BUDGET` (closure state only in 86/88), `UNTRUSTED_DECODE_BUDGET` and AGENTS.md section 7a (row follows `PortSpanEncode.ts`), `SPAN_KEY_SHARED`/`SPAN_KEY_DECLARATION` (folding span files makes the declaration file spell `qadi.subject_id`), `NOT_CALLABLE_PIN_BUDGET` (a renamed `.tst.ts` changes a key), `devtools-named-barrel` (hard-coded to two devtools paths; `barrel-order` skips named barrels). Edit script, `_NAMES` guard and AGENTS.md table in one commit.
3. **Phase 87 interrupt asymmetry.** `SupersedingRun.fork`'s `onFailure` skips interrupt-only causes; the session maps every non-success exit of a current run to `Broke` (SR1). Routing the session through `onFailure` leaves a self-interrupted run `Running` forever. Keep `Effect.exit` in the run body; keep `GatesFeed` forking first; keep `try { publish } finally { fork }` inside the helper (ADR-QD-194).
4. **Phase 91 type/value and cycle traps.** `export type { X }` of a const+type pair or a class compiles, passes gate 13, and deletes the value (about 34 names in core, 1 in react, 7 in audit). A named barrel that omits a type makes a dependent package emit `import("../../a/src/priv")` with exit 0 and no TS2883. Prevention: compiler-generated barrels from symbol flags, a before/after `{name, flags}` surface diff with a planted-defect self-test run after each barrel commit; a `.d.ts` `../../` escape check (ideally in gate 14) after `pnpm typecheck`; `pnpm build` and `pnpm spec:package` after each barrel.
5. **Phase 90 `PortName` and `readScoped`.** Deriving `PortName` from the registry closes a cycle and risks metric-key drift (ADR-QD-052); `ByScope` leaves (HasActed, HasNotActed, HasSignature) must require an id only for `Resource` scope, or scope-`Any` decisions are wrongly denied; `readScoped` stays a plain function (no new span); bench gate first (`pnpm bench`, 3+3 interleaved, median of per-run minima).
6. **Stale or wrong baselines.** Committed mutation reports predate the last two commits; re-take at each phase base. Archived record scripts under `.planning/milestones/v1.*-phases/` hard-code moved paths (ENOENT is not a regression); only this milestone's own scripts run at phase close, with an expected-reports ledger. Never `git add -A` under `.planning/milestones` (untracked `*REVIEW*.iter*.md` backups exist). `gsd-tools query commit` writes no co-author trailer; amend and verify.

## Implications for Roadmap

Keep the strictly serial order 85 -> 91. Research found no overlap that forces a different order, and 91 must be last (it names every export 89 and 90 settle and edits `QadiProvider.tsx` imports after 86). Reserved ids per phase, in order: one ADR (198..204), one CCR (477..483), five BEH (761..795 in blocks of five), two INV (415..428 in pairs). Never run `scripts/next-id.mjs` during execution; write the reserved numbers into `_WAVE16-CONTEXT.md` in plan 1 of Phase 85 (it does not exist yet, and PROJECT.md has no reserved-numbers block). Where an id goes unused, record it in the phase SUMMARY; never renumber.

### Phase 85: Hydration block as a dock-model row (ARCH-132)
**Rationale:** Cheapest, oracle exists (two HTML-string characterisation files), and it must precede 88 because both edit `DevtoolsDock.tsx` lines 110-115.
**Delivers:** pure `HydrationView`, fifth derived store (eleventh store; ADR-QD-185 amended, BEH-QD-700 "eleven", CR22 and DL sweeps, BEH-QD-699/735, INV-QD-390), `DockFrame` status-only selector, hydration row in BEH-QD-218's table.
**Avoids:** flattening the three unsampled predicates (the view takes activity and status with activity precedence; questions key keeps `supplied === undefined &&`; services key stays unguarded); a derived key that spreads a fresh object (identity per field; `foldReading` keeps references); JSX in `model/` (static Unwired advice stays a panel constant); the "0 dehydrated entries" quirk (pin it).
**Ids:** ADR-QD-198, CCR-QD-477, BEH-QD-761..765, INV-QD-415/416. **Stryker:** `stryker.devtools.mjs` (new view under `model/**`, own bar; `QuestionsPanel.tsx` and `DockFrame` unmeasured, declare in `UNMEASURED`).

### Phase 86: React-free provider registry owner (ARCH-133)
**Rationale:** Independent of 85/87/88; must land before 91 so folds move files over a settled `QadiProvider.tsx`.
**Delivers:** `ProviderRegistry.ts` composing unchanged `RegistryLease` (reasons: its own test seam and mutation entry, ADR-QD-195 d2/d7); owner tests with injected `defer` and a real `AtomRegistry`; render suite shrinks to StrictMode, `<Activity>` and SSR smoke; ADR-QD-195 amended (not reversed); `stryker.react.mjs` gets the new file.
**Avoids:** construction that schedules anything (only `release` calls `defer`); changing effect order (the hold effect stays last, commit before hold); the rejected list in ADR-QD-195 (dispose, state, proxy, seed re-apply, render-phase write); `scheduleTask`/`defaultIdleTTL`; module-scope `let`; fake-`defer` and one-tick tests. LT1-LT18 and RL1-RL10 stay unedited and green; add before deleting.
**Ids:** ADR-QD-199, CCR-QD-478, BEH-QD-766..770, INV-QD-417/418. **Stryker:** `stryker.react.mjs` (add owner; update header and covering-tests comment; `QadiProvider.tsx` stays unmeasured and branch-free).

### Phase 87: Scoped run that states its stop (ARCH-134)
**Rationale:** Highest-risk devtools phase; before 88 so one reviewer holds "what a stop is". `TimelineStatus`/`DiagnosticsStatus` keep their shape so 88 keys on identity.
**Delivers:** `StatedRun.ts` (publish callback between `begin` and `fork`, shared configure prologue with parameterised gate, one stop rule via `causeMessage`, shared `Readout` doc); `SimulationSession` shares only publish-then-fork and the message rule and keeps `Effect.exit` in the run (SR1 stays Broke); `GatesFeed` shares only the configure prologue (three different prologue rules exist: closed guard first; `sameFieldsOrAbsent` for diagnostics' absent options; `sameFields && watchFailure === undefined` for gates); new ADR answers ADR-QD-150 point 2 as an application of 150 (dated note on 150; amend 182 d10, 192, 194 and `ThrownMessage.ts` in the same commit).
**Avoids:** claiming a live defect (it is an inconsistency: `Cause([Die(...)])` versus a pretty trace); renaming `Broke` or changing `GatesSnapshot` (Breaking); named `Effect.fn` or `fnUntraced` on the factory; losing `root: true` on `land`. Open with SR1 green; TF21-23, TF28, F28-31, F33, SR5-6 held unedited; add the row nobody has (a publish that throws and a superseding command from the same listener).
**Ids:** ADR-QD-200, CCR-QD-479, BEH-QD-771..775, INV-QD-419/420. **Stryker:** `stryker.devtools.mjs` over `SupersedingRun`, three feeds, `SimulationSession`, `GatesFeed` and the new module; patch changeset for the Simulator text.

### Phase 88: `StoppedBox` keys itself, owns the ledger rules (ARCH-135)
**Rationale:** Smallest phase; after 85 and 87. The review rates it speculative; keep it narrow.
**Delivers:** an outer `StoppedBox` that derives the key and writes the ledger, rendering a keyed inner body; callers stop calling `stoppedKey`; ledger made opaque; ADR-QD-197 d4 amended.
**Avoids:** a ledger inside the box or a screen (it must outlive screens or every tab switch re-announces); one ref for both feeds; a memo keyed on `status` alone; writing the ledger during render (StrictMode loses the alert in dev; discarded renders record a stop that never committed): decide at mount, record at commit; adding `role="alert"` to a mounted element; a module-scope ledger.
**Ids:** ADR-QD-201, CCR-QD-480, BEH-QD-776..780, INV-QD-421/422. **Stryker:** none reaches `src/react`; put the one real decision (the ledger transition, `nextKey`) in a pure function with a table test, ideally under `model/`, and list the rest in `UNMEASURED`. Prove with scratch variants.

### Phase 89: One admission step for an audit batch (ARCH-136)
**Rationale:** Independent but must precede 91, which folds `SequenceIntegrity.ts` into `ArchiveFacts.ts`; keep admission out of `ArchiveFacts.ts`.
**Delivers:** `HostBatch.ts` (plain function, refusal or undefined, wrapped by `Effect.fail` or `Result.fail` per caller); `NowNotFinite` stated once as a type fragment intersected into both public enums, same members and tags; check order tested once; per-entry-point order characterised first on the base (pair-fault table); public refusal enums, error classes and spans unchanged; `CodecMade.ts` stays a leaf.
**Avoids:** one flat "now, rows, then terms" order (key-material vs rows and max-age vs rows would change which refusal wins); an `Effect.fn` admission (adds a span and makes `planRetention` effectful); exporting the step (gate 13); `Number.isFinite` to `isFinite`, `-0`, `+Infinity` `maxAgeMs`, key material read once; SCHEMA_ERROR_BUDGET stays 12.
**Ids:** ADR-QD-202, CCR-QD-481, BEH-QD-781..785, INV-QD-423/424. **Stryker:** `stryker.audit.mjs` (glob; new file under floor from day one; record the 89 post-review score as 91's base for `ArchiveFacts.ts`).

### Phase 90: Per-port facts on the description (ARCH-137)
**Rationale:** Before 91 (91 names `Ports.ts`/`PortServing.ts` exports). Highest uncertainty; a recorded subset is an acceptable outcome.
**Delivers:** open with a `pnpm circular` spike; `PortName` stays a leaf with its own tuple and everything derives downwards (`PORT_NAMES_BY_NAME` read from the tuple, registry order preserved so ADR-QD-052 keys do not move); `readScoped` routing off `LEAF_NEEDS.resourceId` behind the bench gate; description gains fixture and serving facets as the spike allows; amend ADR-QD-163 D-06 and ADR-QD-094, plus a dated ADR-QD-114 note for `PortServing` (guarded by `PortServing.tst.ts` passing unedited); AGENTS.md section 3 prose updated.
**Avoids:** `PortName.ts` importing `Ports.ts`; `ByScope` treated as always; a `switch` (hoisted `Match.type`); `Effect.fn` on `readScoped`; span-name literals in `PortAccess.ts`/`PortDerivation.ts`/`PortCalls.ts`; deleting the tying test without a replacement; metric ids or descriptions changing; wire or served-route bytes changing (golden them).
**Ids:** ADR-QD-203, CCR-QD-482, BEH-QD-786..790, INV-QD-425/426. **Stryker:** core config; static description tables are invisible under `ignoreStatic`, so the proof is a `tabulatePorts` golden and a metric snapshot, not a score.

### Phase 91: Named barrels for core, react, audit; folds (ARCH-138)
**Rationale:** Last by design; biggest behaviour-free diff.
**Delivers, in this plan order:** (1) surface-diff tool with self-test plus the three named barrels, zero file moves, one commit per barrel, no mixed `export *` state; (2) each fold, one per commit, `pnpm circular` after each, madge verdict recorded in the ADR-QD-037 amendment; (3) generalise `devtools-named-barrel` to a named-barrel table (rule renamed, five barrels, self-test with a planted `export *`), keep `barrel-order` for the rest; edit AGENTS.md section 9, section 16 text and CONTRIBUTING; (4) `SPAN_KEY_SHARED`, `UNTRUSTED_DECODE_BUDGET` row and AGENTS.md section 7a move together; (5) `SequenceIntegrity` disclaimer citations re-pointed (README, `spec/urs.md`, `spec/models/17-purpose.md`, ADR-QD-009); (6) stale sweep as the last plan, mutation as the very last. `Hydration.ts` folds only via a structural `hydrateDecisions` parameter; otherwise keep it and record the cycle in ADR-QD-204.
**Avoids:** `export type { X }` of const+type pairs and classes; TS2883 non-portable `.d.ts` (the `../../` escape check); `GateWriter` stops being a zero-import leaf (update its wording); `QadiProvider.tsx` publishes names by accident today (`useQadiContext` is documented public and must stay).
**Ids:** ADR-QD-204, CCR-QD-483, BEH-QD-791..795, INV-QD-427/428. **Stryker:** `stryker.config.mjs`, `stryker.audit.mjs`; compare folded files against the sum of their sources' latest post-review records with a `RENAMED` map; react folds target files not in `stryker.react.mjs`.

### Research Flags

Needs `/gsd-plan-phase --research-phase` (or a spike as plan 1):
- **Phase 90:** unproven acyclic derivation; hot-path benchmark; wire and fixture surfaces only partly read (`PortServing.ts` and the remote wire were not read in full).
- **Phase 87:** several valid shapes; characterise the feeds' self-interrupt behaviour before choosing a policy; reentrancy semantics (ADR-QD-150 d7-9).
- **Phase 91:** the `Hydration.ts` decision and `EvaluationSpan` placement need a pre-fold madge simulation on the Phase 91 base; the barrel generator is new tooling.

Standard patterns (characterisation plus discuss is enough):
- **Phase 85** (precedent ADR-QD-168/185), **Phase 86** (precedent ADR-QD-195, lease), **Phase 88** (small, precedent ADR-QD-197), **Phase 89** (precedent ADR-QD-190 `RowsRefusalCases`).

### Where the researchers disagree (open questions for each phase's discuss step)

- **85, DockFrame status read:** ARCHITECTURE and FEATURES recommend an optional selector on `useStoreSnapshot` (precedent `usePaused`) and reject a status-only store; PITFALLS (85-B) allows "a status readout or a status store". Open: selector (recommended) versus store. Also the view input shape: ARCHITECTURE keys `{hydration, unsampled}` with plain `isUnsampled(status)`; PITFALLS wants the view to take `status` itself. Both keep activity precedence; decide which the BEH states. The store is exposed as `model.hydration` (eleventh), not internal.
- **86, how many effects:** ARCHITECTURE collapses latest, subject write and atoms-replaced detection into one commit effect (before the last hold effect); PITFALLS (86-B) insists on three separate effects in fixed order with LT1-LT18 unedited. FEATURES keeps `AtomsReplaced` detection in the component; ARCHITECTURE moves detection into the owner (reporting stays in the component). Open: one commit effect or three; where identity detection lives. Tie-break: LT6, LT8, LT13, LT16-LT18 stay green unedited.
- **87, interrupt policy for the feeds:** FEATURES wants an explicit decision (state a stop or state why not); ARCHITECTURE keeps current behaviour and characterises it; PITFALLS leaves it to discuss. Today feeds show `Reading`/`Live` with nothing running after a self-interrupt, and BEH-QD-519 is silent. Changing it is a behaviour change needing its own test and ADR line. Also open: whether `restart` on a bare timeline feed stays an empty read (recommended; characterise first). The session's exit read is settled: keep it.
- **88, removing the render-phase ref read:** FEATURES lists "remove it, key from a React-held value" as a differentiator; ARCHITECTURE recommends centralising it (wrapper plus opaque ledger closure) and rejects a `WeakMap` because it changes what "announced" means for a never-mounted stop; PITFALLS adds that the ledger could be a per-feed model store. Open: relocate (recommended) or remove. Either way the ledger stays above the screens and the prop type names stay.
- **89, span and brand:** ARCHITECTURE would return an admitted-rows brand and run admission before the `qadi.audit.verifySequenceIntegrity` span, so a refused public verify no longer opens that span (record and pin it); PITFALLS (89-B) wants a plain refusal-or-undefined function with spans unchanged and an ordered per-caller check list. Open: brand versus plain function, and whether the span change is acceptable. Tie-break: spans unchanged unless the owner accepts the pinned trace change.
- **90, how much moves:** ARCHITECTURE deletes `PortSpans` and moves span, fixture and serving declaration onto descriptions (reversing ADR-QD-114; loses `PortSpanOf<N>`'s cross-check unless a pairwise-distinct type check is added); PITFALLS (90-A/C) wants to keep one closed table the types read from; FEATURES makes a madge spike the first plan and accepts "only `readScoped`/`resourceId` is feasible". Settled: `PortName` stays a leaf with its own tuple, derive downwards, `readScoped` stays plain. Open: which of span, serving, fixture move, decided by the spike.
- **91, Hydration fold and changeset:** all agree the fold is blocked as written. ARCHITECTURE recommends the structural parameter (a public `.d.ts` parameter type change, with a changeset line); FEATURES and STACK say keep the file unless proven. Open: option (a) structural parameter versus (c) keep and record. Related disagreement on changesets: FEATURES says no changeset for package-private moves; PITFALLS (M-1) says a patch per public-package edit (v1.10's Phase 84 shipped one saying "no export changes"). Decide once in 85's discuss and apply across the wave. Also: the 942 baseline is the Phase 91 base figure (Phases 85-90 may legitimately change it), not a literal.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions read from `node_modules`; `AtomRegistry`, `Effect.fork` absence, `Cause` renderings reproduced; TS2883 portability reproduced on tsc 7.0.2 with a two-project probe (MEDIUM for how often the real graph hits it). |
| Features | HIGH / MEDIUM | Current behaviour and surface read in source and spec; the shape of each fix is the planner's (MEDIUM). |
| Architecture | HIGH / MEDIUM | Integration points, ADR quotes and the madge fold simulation are HIGH; Phases 87 and 90 shape is MEDIUM. |
| Pitfalls | HIGH / MEDIUM | Repo mechanics and prior-wave records HIGH; unverified: Stryker behaviour on a missing explicit `mutate` path, `PortServing.ts` and the remote wire in full, `Equal.equals` on `HydrationActivity`. |

**Overall confidence:** HIGH that the wave is feasible with no stack change and no Breaking phase; MEDIUM on Phases 87, 90 and the 91 Hydration fold.

### Gaps to Address

- `_WAVE16-CONTEXT.md` does not exist and PROJECT.md has no reserved-numbers block: write the reserved ids into it in Phase 85 plan 1.
- Mutation baselines are stale (core 11-23, audit 11-24, react 11-25, all before recent source changes): re-take `NN-mutation-base.json` at each phase base with `83-mutation.mjs`'s recipe (stdin closed, quiet host, `RENAMED` map for folds). `pnpm check:pr` skips mutation, so this is a deliberate per-phase step.
- Stryker on a missing explicit `mutate` path is unverified: run `stryker.react.mjs` once in Phase 86 if `RegistryLease.ts` is renamed or folded.
- The `.d.ts` escape check is not yet a gate: add it to `check-package-install.mjs` in Phase 91 (AGENTS.md section 15). Baseline grep shows two hits, both comments.
- The unmeasured React zones (`QadiProvider.tsx`, devtools `src/react/`, `QuestionsPanel`) stay unmeasured; list them in each phase's `UNMEASURED` and prove with scratch variants.
- Archived record scripts will report on moved or deleted files (88, 91): write an expected-reports ledger per phase close; do not edit their path constants.
- Tooling: `gsd-tools query commit` writes no co-author trailer (amend and read `%(trailers)`); `pnpm check:pr` needs `< /dev/null` and a quiet host; run vitest from the repo root with `--project`; use `/usr/bin/grep` or `bash -c` (zsh aliases grep); pass `--date` to `spec-revise.mjs`; do not release or approve a version-packages PR.

## Sources

### Primary (HIGH confidence)
- `node_modules/effect` 4.1.2 (`AtomRegistry`, `Effect`, `FiberHandle`, `Cause`) and the repo source named in STACK, FEATURES, ARCHITECTURE and PITFALLS (devtools model and react, `@qadi/react` provider, audit, core port modules).
- `AGENTS.md` sections 3-9, 13, 15, 16; `spec/decisions` ADR-QD-037, 047, 080, 094, 099, 114, 134, 148, 150, 163, 168, 182, 185, 190, 192, 194, 195, 197; BEH-QD-218, 227, 445, 507, 509, 519, 699, 700, 722, 735, 746-750; INV-QD-313, 389, 390, 408-411.
- `scripts/check-api-surface.mjs`, `check-package-install.mjs`, `check-house-style.mjs`, `stryker.{config,devtools,react,audit}.mjs`, `vitest.config.ts`, `package.json`.
- Runs on this tree: `madge --json` per package and `pnpm circular` (245 files, clean), `node scripts/check-api-surface.mjs` (942 across 9 packages), `Cause` rendering probe, TS2883 probe.

### Secondary (MEDIUM confidence)
- `.planning/RETROSPECTIVE.md`, `v1.10-MILESTONE-AUDIT.md`, `.planning/phases/_SHARED-CONTEXT.md` (prior-wave lessons).
- Architecture review `architecture-review-20261125.html` (session scratchpad, read as text).

### Tertiary (LOW confidence)
- None. Items marked "not verified" under Gaps need a run before relying on them.

---
*Research completed: 2026-11-25*
*Ready for roadmap: yes*
