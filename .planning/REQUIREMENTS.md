# Requirements: Qadi v1.4 Arch Wave 9

**Defined:** 2026-11-14
**Core Value:** An authorization decision is never wrong and never silent.

Source: the 2026-11-14 architecture review, re-verified by `.planning/research/SUMMARY.md` (reconciliations R1–R6 are binding
unless a phase's planner records evidence against one). Per-phase evidence and reserved numbers: `.planning/phases/_WAVE9-CONTEXT.md`.

## v1.4 Requirements

### One module for a scoped run a newer run supersedes (Phase 37, ARCH-84, devtools)

- [x] **RUN-01**: A package-private devtools module owns the run handle, the generation token, the closed state, the finalizer ordering (registered after the handle so it runs first), interrupt-on-replace, `stop` and "land only while current", through a two-step `begin()` → publish → `fork(token, effect)` interface (R2).
- [x] **RUN-02**: `SimulationSession`, `TimelineFeed` and `DiagnosticsFeed` use the module, and none of them declares `let generation`, `let closed`, `FiberHandle.make`/`FiberHandle.runtime` or its own bump-in-finalizer block (negative grep scoped to the phase's added lines).
- [x] **RUN-03**: The module has its own tests through its interface: supersede, close mid-run (including a defecting finalizer), stop in each state (not started, running, completed, closed), interrupt vs failure, and two instances in two scopes.
- [x] **RUN-04**: `stop` is one unconditional rule (R1) used by both former call sites, pinned by one test: stopping with no run changes nothing and notifies nobody.
- [x] **RUN-05**: A restart from inside a store's Starting/Reading notification leaves the newest run live in all three stores (RED first on the phase base, or refuted with recorded evidence), and a run body that starts a command before its first yield is reported, not left silently idle.
- [x] **RUN-06**: Observable behaviour is unchanged: the session run is still a root span, interruption never reads as `Stopped` (INV-QD-313), and the session still reads a defect or self-interrupt as `Broke`; the feeds' interrupt-only filter is one named hook that the session does not use.
- [x] **RUN-07**: A seeded model-based property (ARCH-79 pattern) drives random interleavings of begin, fork, land, stop and close, and checks that only the current run's result lands and nothing lands after close.
- [x] **RUN-08**: ADR-QD-137 §7 and point 3 are corrected (no `useRunningStore`; the unconditional stop), and AGENTS.md §10 stops naming `it.scoped`, which `@effect/vitest@4.1.2` does not have.

### The sink wire version stated once (Phase 38, ARCH-85, core)

- [x] **WIRE-01**: One exported constant `WIRE_VERSION` in `SinkWire.ts` is the only place the record wire's version number appears in `packages/core/src/Sink*.ts`; `WIRE_VERSIONS`, `WireVersion`, both schema literals, the encoder and the decoder check derive from it.
- [x] **WIRE-02**: Retyping the version without editing the codec fails to compile (a tstyche pin, plus a recorded throwaway retype-to-3 experiment).
- [x] **WIRE-03**: Wire bytes are unchanged (byte golden with the key order, committed on the phase base), and every other version is still refused as `UnsupportedVersion({ version, supported })`.
- [x] **WIRE-04**: INV-QD-096 is amended to state that the codec reads what it writes for every supported version, without a duplicate invariant.
- [x] **WIRE-05**: The new export has its `spec/overview.md` row and a `@qadi/core` minor changeset, and the `WIRE_VERSIONS` narrowing to `readonly [2]` is recorded; hydration's payload version and audit's bundle version are untouched.

### Each hydration drop reason stated once, with its kind (Phase 39, ARCH-86, core + react)

- [x] **DROP-01**: One keyed table in `HydrationMetrics.ts` states each reason once with its kind (`dehydration` | `payload` | `entry`) and its meaning; the `MEANINGS` table is folded into it.
- [x] **DROP-02**: The reason unions, `hydrationDropReasons`, `isHydrationDropReason` (by `Object.hasOwn`) and react's payload/entry groups derive from the table, and a reason without a kind fails to compile (tstyche negative).
- [x] **DROP-03**: The list order is exactly today's interleaved order (a written-out nine-word snapshot committed on the phase base stays green), and the existing written-out lists and the `length === 9` pin stay as independent oracles.
- [ ] **DROP-04**: `qadi_hydration_dropped_total`'s declaration, id, description and `[metric-table]` row are unchanged, and a throwaway new row reaches the metric, the devtools panel and react's reporters with one edit (recorded).

### Core owns describing a decode refusal (Phase 40, ARCH-87, core + devtools + audit)

- [ ] **DREF-01**: A compatibility decision is recorded before any code: what devtools' malformed-frame callback and its log annotation carry after the change (recommended: the refusal's `_tag`, documented as Breaking).
- [ ] **DREF-02**: Core exports a total `describeDecodeRefusal` (module-scope `Match.tagsExhaustive`, safe for an `unknown` version or message), so a new refusal is a compile error in core only.
- [ ] **DREF-03**: Core exports a tag-only decode-refusal annotations helper and owns the one `UntrustedValueRefusal` → `DecodeRefusal` mapping; a sentinel-value test shows no annotation carries `Malformed.message` or `UnsupportedVersion.version` (INV-QD-104).
- [ ] **DREF-04**: Devtools passes `DecodeRefusal` through: `reasonOf` and `MalformedReason` are gone, and `onMalformed` receives the refusal.
- [ ] **DREF-05**: Audit decodes a row's record once, taking its JSON form from core's strict decode (no re-encode), with output identical on a differential over existing fixtures, a 60,000-deep record still `TooDeep`, and an unknown envelope key still dropped.
- [ ] **DREF-06**: `recordJsonOf` and audit's copy of the refusal mapping are deleted, and `UNTRUSTED_DECODE_BUDGET`, its `_NAMES`, and the AGENTS.md §7a table agree in the same task.
- [ ] **DREF-07**: The break is recorded: `@qadi/devtools` Breaking changeset with the five-word upgrade map, `upgrading.md`, the devtools README, the website devtools page, the Next.js example's `Dock.tsx`, the `DecisionStreamRoute.ts` comment, BEH-QD-204 and the overview rows.

### One guarded value-to-text function in devtools (Phase 41, ARCH-88)

- [ ] **TEXT-01**: RED on the phase base: tests show a bigint or circular value through `contains`, `inArray` and `eq(literal)` throws from `remedyEdits` and from a session command (`setPolicy`/`chooseSight`), in a new test file; they pass after.
- [ ] **TEXT-02**: One package-private total value-to-text primitive returns `string | undefined` and is never the cause of a throw (including a throwing `toJSON` or getter); its rules are asserted in one test table.
- [ ] **TEXT-03**: Remedies, Filters and SimulationForm read through it, no other `JSON.stringify` of an unknown value remains in those modules, and their existing outputs are pinned unchanged (bare strings, the word `undefined` in a remedy label, Filters' `[]`, the form's round-trip refusal).
- [ ] **TEXT-04**: How a remedy over a non-JSON value is shown (degraded label or skipped with a reason) is decided and pinned, and BEH-QD-223 is not weakened.

### A seeded question builds its own computing atom (Phase 42, ARCH-89, react; human checkpoint)

- [ ] **SEED-01**: Spike evidence for each option (lines moved, test fakes removed, render-sequence diff, mutation delta) is gathered before the human is asked.
- [ ] **SEED-02**: The phase's first plan presents the consolidated options (R4: invert in place, invert into its own module, a seed holder, reject) and records the human's decision before any source change.
- [ ] **SEED-03**: If the decision is to change code: `makeSeededQuestion` takes no function that receives a function, the seed-to-evaluation link is tested through a real atom runtime (no fake `computedFor`), and the liveness rule is stated once.
- [ ] **SEED-04**: If code changes, every existing pin holds: render sequences, the seed/lifetime/sweep suites, the 30 e2e scenarios, INV-QD-028/105/317/318, the `maxTrackedQuestions` proofs (StrictMode, `<Activity>`, no leaked fibers, one sweeper), and no `scheduleTask`/`defaultIdleTTL`.
- [ ] **SEED-05**: If the decision is to reject: ADR-QD-155 records the rejection, no source changes, and the CCR row names the unused numbers.
- [ ] **SEED-06**: A final sweep corrects anything Phases 37–41 left stale, and the milestone is re-verified at its final head with a mutation re-check of every touched file.

### Cross-cutting (every v1.4 phase)

- [x] **WX-01**: `pnpm check:pr < /dev/null` is green at the end of each phase.
- [x] **WX-02**: Each phase records its ADR (or names it "Unused" in its CCR row), its CCR row, and its BEH/INV/traceability changes, using only its reserved numbers. `node scripts/next-id.mjs` is never run.
- [x] **WX-03**: `spec/overview.md` names every added export and drops every removed one (gate 13), and its module column is corrected by hand for every moved declaration.
- [x] **WX-04**: No new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock. Budgets change only together with their AGENTS.md table.
- [x] **WX-05**: Coverage thresholds hold (core at least 95%, others at least 90%). The Stryker score of touched files does not fall (per-phase `NN-mutation-base.json`, same invocation at base and close), and a drop is closed with a test, never re-baselined.
- [x] **WX-06**: Every behaviour change is preceded by a characterisation or regression test written on the phase base (RED for a defect, green for preserved behaviour).
- [x] **WX-07**: Every public break is recorded in its package's changeset as **Breaking** and in `upgrading.md`. Nothing is released or published, and no version-packages PR is merged.

## v2 Requirements

None. Anything this wave defers goes to the next architecture review.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Moving `FIXTURE_DATA` into `SimulationSource.ts` | Both lists are compile-checked; locality only (review "not proposed") |
| The `"Decision"`/`"Obligations"` literals at `DecisionRecord.ts:145/149` | One-line nit |
| `CircuitBreaker.ts`'s generation, `DockModel.ts` | Different concern / no adopter of the run module |
| Unifying hydration's payload `version: 2` or audit's bundle version with the sink wire | Separate wires; unifying the lookalike is an anti-pattern |
| Folding `Inspect.outsideUnion` or `QuestionsPanel` `resourceOf` into the value-to-text primitive | Neither can throw; folding would change visible output |
| Re-opening ADRs 077–107; changing any budget except as named above | `_SHARED-CONTEXT.md` |
| `oxfmt` | AGENTS.md §17 |
| A release | Release only when the user asks for "the release" |

## Traceability

Which phases cover which requirements. One row per ID (`phase.complete` cannot parse grouped rows or ranges).
The seven WX rows apply to every phase 37 to 42, so each phase's Requirements line in `ROADMAP.md` lists all seven.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RUN-01 | Phase 37 | Complete |
| RUN-02 | Phase 37 | Complete |
| RUN-03 | Phase 37 | Complete |
| RUN-04 | Phase 37 | Complete |
| RUN-05 | Phase 37 | Complete |
| RUN-06 | Phase 37 | Complete |
| RUN-07 | Phase 37 | Complete |
| RUN-08 | Phase 37 | Complete |
| WIRE-01 | Phase 38 | Complete |
| WIRE-02 | Phase 38 | Complete |
| WIRE-03 | Phase 38 | Complete |
| WIRE-04 | Phase 38 | Complete |
| WIRE-05 | Phase 38 | Complete |
| DROP-01 | Phase 39 | Complete |
| DROP-02 | Phase 39 | Complete |
| DROP-03 | Phase 39 | Complete |
| DROP-04 | Phase 39 | Pending |
| DREF-01 | Phase 40 | Pending |
| DREF-02 | Phase 40 | Pending |
| DREF-03 | Phase 40 | Pending |
| DREF-04 | Phase 40 | Pending |
| DREF-05 | Phase 40 | Pending |
| DREF-06 | Phase 40 | Pending |
| DREF-07 | Phase 40 | Pending |
| TEXT-01 | Phase 41 | Pending |
| TEXT-02 | Phase 41 | Pending |
| TEXT-03 | Phase 41 | Pending |
| TEXT-04 | Phase 41 | Pending |
| SEED-01 | Phase 42 | Pending |
| SEED-02 | Phase 42 | Pending |
| SEED-03 | Phase 42 | Pending |
| SEED-04 | Phase 42 | Pending |
| SEED-05 | Phase 42 | Pending |
| SEED-06 | Phase 42 | Pending |
| WX-01 | All v1.4 phases | Complete |
| WX-02 | All v1.4 phases | Complete |
| WX-03 | All v1.4 phases | Complete |
| WX-04 | All v1.4 phases | Complete |
| WX-05 | All v1.4 phases | Complete |
| WX-06 | All v1.4 phases | Complete |
| WX-07 | All v1.4 phases | Complete |

**Coverage:**
- v1.4 requirements: 41 total (34 phase-specific, 7 cross-cutting)
- Mapped to phases: 41
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-14*
*Last updated: 2026-11-14 after roadmap creation (Phases 37-42)*
