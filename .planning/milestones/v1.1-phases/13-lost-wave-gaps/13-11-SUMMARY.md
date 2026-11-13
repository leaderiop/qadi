---
phase: 13-lost-wave-gaps
plan: 11
subsystem: spec-registers
tags: [spec, invariants, traceability, overview, adr-index, ccr-register, lost-wave-port]

phase_base: 0925c2f
requires: ["13-01", "13-04", "13-07", "13-08", "13-09", "13-10"]
provides:
  - "INV-QD-016 true under a decision cache; INV-QD-243 names the public mode; INV-QD-257 and INV-QD-259 written (`spec/invariants.md` Rev 1.93)"
  - "Traceability rows for 13-01..13-09 (`spec/traceability.md` Rev 1.135)"
  - "`spec/overview.md` Rev 1.80: the 10 API drifts closed, `CacheOutcome`'s new home, `addGuardedRoute`'s optional loader"
  - "`spec/decisions/index.yaml`: ADR-QD-123; ADR-QD-047, ADR-QD-052, ADR-QD-108 amendments"
  - "CCR-QD-399..403 in `spec/README.md` (Rev 1.135); the lost commit `4b1ed49`'s triage in CCR-QD-402"
affects: [13-12, 13-13]

actuals:
  tasks: 3
  commits: 4

key-files:
  modified:
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/decisions/index.yaml
    - spec/README.md
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/behaviors/25-inspection.md
    - .planning/REQUIREMENTS.md

requirements-completed: [GAP-09, GAP-10, XC-02, XC-03]
---

# 13-11 — Phase 13's shared registers, written once

`phase_base: 0925c2f`. Spec registers only; no file under `packages/` changed.

## Decisions applied

No `checkpoint:decision` in this plan; `_DECISIONS.md` has no 13-11 row. The decisions quoted in the CCR rows are
the earlier plans': 13-04 (D-48-d) **`A`**, "Chip typing buffer stays in the view; `addChip(field, text): ChipAdded`"
(in CCR-QD-400).

## What was done

- **Task 1 (502e156).** INV-QD-016's Source: "Nothing is memoised across elements" replaced by the batch holding no
  state, a wired `decisionCacheLayer` memoising across elements keyed on the whole subject and the question (INV-QD-033),
  and each element keeping its own evaluation id and sink record (INV-QD-025); Enforcement leads with `SubjectSet.test.ts`'s
  "under a decision cache and a sink". INV-QD-243 gains 13-01's sentence on the public mode, `enforcePublic` in its
  Source, six callers in its Enforcement and BEH-QD-359 in Related. INV-QD-257 ("Each simulation input field is described
  once") and INV-QD-259 ("A metric has one declaration, and its readers import it", 13-07's draft) added after INV-QD-251.
  The anchorless `../invariants.md` links in BEH doc 29, ADR-QD-047 and BEH-QD-368 now carry their anchors. Four
  `spec-revise` entries (CCR-QD-399, 400, 401, 402): 1.89 → 1.93.
- **Task 2 (c28573b).** Traceability: §1 rows 23 (BEH-QD-359, `UnguardedRoute.ts`), 25 (BEH-QD-368, every metric
  module), 29 (`SimulationFields.ts`), 31 (`CompileMetrics.ts`); §2 INV-QD-016/243 updated, INV-QD-257/259 rows; §3
  ADR-QD-123 row, ADR-QD-047/052/108 rows; §4 new rows `EvaluationMetrics.test.ts`, `SimulationFields.{test,tst}.ts`,
  `PermissionRegistry.tst.ts`, `Lifecycle.tst.ts`, and every converted test row (core metric tests, audit, compilers,
  simulator tests, http, `SubjectSet.test.ts`, the `Evaluate.test.ts` precedence pin, `RequestEnforcement` now six
  callers / ten not-applicable cells); §5 REQ-QD-026 names the signature scenario. Overview: one metric row for the six
  evaluation metrics, `CacheOutcome` split to `EvaluationMetrics.ts` (`CacheLookup` stays `DecisionCache.ts`),
  `addGuardedRoute`'s loader optional, `EditKind`'s two members, a row for `SimulationField`/`FieldView`/`ChipView`/
  `ChipAdded`, `UnseededField.key`, the session's `addChip`/`removeChip`/`SimulationSnapshot.fields`. Index: ADR-QD-123
  ("Accepted — amends ADR-QD-052"); ADR-QD-047 "amended 2026-11-10 (each simulation field is described once)", ADR-QD-052
  "amended 2026-11-10 (generalised by ADR-QD-123)", ADR-QD-108 "amended 2026-11-10 (the public mode)".
- **Task 3 (918377e).** CCR-QD-399..403 after CCR-QD-398 (the plan said after 394; 395..398 landed since), each
  listing its documents with new revisions and its unused reservations; README 1.130 → 1.135, one entry per row.
  CCR-QD-403 holds 13-10's half and says the remaining doc defects are 13-13's and extend the row (13-13 has not run).
- `.planning/REQUIREMENTS.md`: GAP-11's text corrected to 14 placeholders (7 ADR, 5 INV, 2 BEH). Not ticked; 13-13 owns it.

## ARCH-57 triage (lost commit `4b1ed49`, verified on the tree; recorded in CCR-QD-402)

| Item | Verdict |
|------|---------|
| optional `addGuardedRoute` loader | ported, 13-08 (`48ac5b3`) |
| one constructor for the declared-unguarded routes | ported, 13-08 (`0447b30`); premise met by merged `enforceSubject` |
| both cadence tests + spec 34's sentence | ported, 13-08 (`f7ffa91`) |
| shared `reportRefused` | obsolete — `e0365e0` (one adapter in `DecisionLogHttp.ts`, checked) |
| fixture setups as one union | obsolete — `e0365e0` (`fixturePortsLayer(setups: PortFixtures)` at `Ports.ts:297`, CCR-QD-392) |
| gate writer resolved once | obsolete — `e0365e0` (ADR-QD-111, `GateScopeContext`; `gateWriterFor` called only at `QadiProvider.tsx:237`) |
| seven stale test-file citations | 13-13 (CCR-QD-403) — not yet run |
| cache-capacity docs | 13-13 (CCR-QD-403) — not yet run |
| batch under cache and sink | ported, 13-09 (`ab5a966`) + INV-QD-016 here |
| `…-QD-NEXT` gate | ported, 13-10 (`a1aef7a`, `f6c48a9`), a `check-house-style.mjs` rule |
| `LifecycleOptions` pin | ported, 13-09 (`04332fa`) |
| devtools-private `resourceIdOf` | ported, 13-02 (`96854d7`) |
| `MissingResource.attribute` wire change | not taken by the lost commit either; recorded, not ported |
| render-count test for `useDecisionSuspense` | obsolete — skipped by the lost commit, subject settled by `e0365e0` |
| constructors accept what the codec refuses | not an item of that commit; recorded, needs its own decision |
| `portCallsTotal`'s description names `translateNode` | not an item; recorded — a fix re-keys `qadi_port_calls_total` (ADR-QD-052) |
| silent resume across eviction; API without `RequirePermission` under another `guardApi` | not items; working as documented (BEH-QD-201) / ARCH-36's rejected served form |

Lost ids are cited only by commit hash in the new rows (`b0b9363`, `950977f`, `d089c1d`, `4b1ed49`, `9cf0e5f`, `903be15`).

## Numbers

| CCR | Used | Unused (stated in the row) |
|-----|------|-----------------------------|
| CCR-QD-399 | BEH-QD-359, ADR-QD-108 addendum | BEH-QD-360–362, ADR-QD-121, INV-QD-255–256 |
| CCR-QD-400 | INV-QD-257, ADR-QD-047 amendment | ADR-QD-122, BEH-QD-363–367, INV-QD-258 |
| CCR-QD-401 | ADR-QD-123, BEH-QD-368, INV-QD-259, ADR-QD-052 amendment | BEH-QD-369–372, INV-QD-260 |
| CCR-QD-402 | INV-QD-016 correction | BEH-QD-373–375, INV-QD-261–262, ADR-QD-124 |
| CCR-QD-403 | — | ADR-QD-125, BEH-QD-376–378, INV-QD-263–264 |

Every unused number was grepped free across `spec`, `packages`, `features`, `apps`, `scripts` and `AGENTS.md`.
INV-QD-255/256 were in the phase reservation but in no plan's table; they are listed under CCR-QD-399.

## Baselines re-measured

- `grep -c '^## INV-QD-2[45][0-9]'`: plan said 3 on `1721a42`; on the base it is 5 (INV-QD-250/251 landed in Phase 12); now 7.
- Register revisions on entry: invariants 1.89, traceability 1.134, overview 1.79, README 1.130 (the plan's 1.87/1.132/1.77/1.128
  were `1721a42`'s). The CCR rows go after CCR-QD-398, not 394.

## Deviations

1. **[Plan order]** The plan lists 13-13 as a dependency, but 13-13 has not run. CCR-QD-403 is written with 13-10's half
   and an explicit sentence that 13-13's doc defects extend it; no placeholder text.
2. **[Doc revisions]** The anchor fixes in BEH 29, ADR-QD-047 and 25-inspection add no content, so those documents were not
   re-revised. ADR-QD-052's and ADR-QD-108's own Status rows were not touched; only the index carries the new status text.
3. `spec-revise.mjs` run with `--date 2026-11-10` (13-01's note).

## Gate results

- Task 1 verify: `VERIFY-OK`.
- Task 2 verify: `pnpm spec:api` green (882 exports, 9 packages), ADR-QD-123 in the index, `EvaluationMetrics.test.ts` in
  traceability, `spec-revise --check` green → `VERIFY-OK`.
- Task 3: `pnpm spec:verify:strict` 21 pass, 0 fail, 0 skip; `pnpm spec:verify` green; `pnpm spec:api` green;
  `spec-revise --check` green; `pnpm spec:examples` 103 blocks compile; `pnpm spec:claims` 8 claims; `pnpm spec:gates`
  25 steps, 139 references; five CCR rows; no lost-wave id defined in an added `spec/` line and no INV-QD-242/245 in one.

## For 13-12 / 13-13

- **13-13:** extend CCR-QD-403's row (its documents with revisions; it already names the defects as 13-13's) and revise
  `spec/README.md` once for it; add traceability for BEH-QD-166 if it changes; tick GAP-11 (text already corrected).
- **13-12:** the phase's `requirements-completed` ticks (GAP-01..12, XC-02/03 as recorded) on the phase's last plan.

## Commits

| sha | subject |
|---|---|
| 502e156 | docs(13-11): INV-QD-016 true under a cache, INV-QD-243 names the public mode, INV-QD-257 and INV-QD-259 |
| c28573b | docs(13-11): traceability, overview and ADR index for Phase 13 |
| 918377e | docs(13-11): CCR-QD-399..403 in the Document history register |
