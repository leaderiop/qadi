---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
verified: 2026-11-23T07:00:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-01-PLAN.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-01-SUMMARY.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-02-PLAN.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-02-SUMMARY.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-03-PLAN.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-03-SUMMARY.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-04-PLAN.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-04-SUMMARY.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-05-PLAN.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-05-SUMMARY.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-06-PLAN.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-06-SUMMARY.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-07-PLAN.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-07-SUMMARY.md
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/HeldChoice.ts
  - packages/devtools/src/model/SeededChoice.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/test/model/SeededChoice.test.ts
  - packages/devtools/test/model/SeededChoice.tst.ts
  - packages/devtools/test/model/SimulationSession.characterisation.test.ts
  - packages/devtools/test/model/SimulationSession.test.ts
  - packages/devtools/test/simulationFixtures.ts
  - spec/behaviors/28-devtools-screens.md
  - spec/behaviors/29-devtools-simulator.md
  - spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
covered_digest: "v4:sha256:5dfd843c2caef8aa6ebd22d7984bf4924459ce767f2a6d7a78c4a9dfa7cd6eac"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 74: The simulation session's policy choice split from its runs — Verification Report

**Phase Goal:** The simulation session's policy-choice and seed rules live in one pure module beside `HeldChoice.ts`, and the session keeps only runs.
**Verified:** 2026-11-23
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | A characterisation of seeding, replay, choosing, the menu and its order, and staleness is written on the phase base and stays green | ✓ VERIFIED | `SimulationSession.characterisation.test.ts` first committed alone at `e25c8cfd` (a descendant of `b22d97f9`; `git diff b22d97f9 e25c8cfd -- packages/*/src` is empty), 35 `it` rows. `74-characterisation-check.mjs` exit 0 ("35 rows and 29 statements as at e25c8cfd; 21 helpers kept, 13 moved"); `--self-test` exit 0 (49 passed). The file passes in the targeted vitest run. |
| 2 | One pure module beside `HeldChoice.ts` owns the pin rule, the orphan rule, the menu and its reverse lookup (order written once) and the same-policy no-op; its rules are tested as plain values and the session tests that only exercised them moved | ✓ VERIFIED | `packages/devtools/src/model/SeededChoice.ts`: no `let`/`var`, no `effect/Effect` import (only `Equal`, `Match`), no mutation. Pin rule in `pinUnlessReplayed` (used by `seedFrom`, `seededChoice` via `seedFrom`, `withSightings`; `choose` pins nothing). Orphan rule in `seedOf`. One `menuEntries` list read by both `menuOf` and `sightingAt`; `leading` is gone. `choose` returns `choice` when the held policy is equal and no replay is held; `seedFrom`/`withSightings` answer their input on a no-op. `SeededChoice.test.ts` (35 rows, plain `it`, no Effect/scope) and `SeededChoice.tst.ts` pass. Session tests: 97 → 79 at `81972903` (18 removed, matching the move table in 74-RED-EVIDENCE.md), then 2 more dropped in review (WR-09, `3faf071c`) as pinned by the characterisation. |
| 3 | `SimulationSession.ts` keeps only runs and uses that module; "clear the run" is one operation called from `reseed`, `choosePolicy` and `setPorts` | ✓ VERIFIED | One `let choice: SeededChoice` (line 287); every read goes through `policyChoice`/`policyOf`/`seedOf`/`menuOf`/`sightingAt`/`seededFrom`; no `chosen`, `seedEntry`, `seeded`, `selectedOf`, `leading`, `policyMenuOf` remain. `clearRun` (366-370) is the only `run = { _tag: "Idle" }` after construction; called at 482 (`reseed`), 492 (`choosePolicy`), 527 (`setPorts`). `start`'s Refused path calls `supersede` and sets `Refused`, as ADR-QD-187 decision 9 states. Behaviour pinned by passing characterisation rows ("seeding a row after a run clears it…", "choosing another policy after a run clears it…", "new ports during a run clear it and stop it", "new ports after a finished run keep the result"). |
| 4 | The `edit` comment is true: every draft write goes through one path | ✓ VERIFIED | After construction `draft =` and `resourceText =` occur only in `writeDraft` (463-464). `edit`, `reseed`, `editResourceText` call it; `renameSubject` goes through `edit` (rename never touches `resource`: `renameSubject` spreads `input` and no field in `FIELD_ORDER` is the resource, so behaviour equals the base). `edit`'s doc now says it writes through `writeDraft`; the header names `writeDraft` the one place. Draft rows of the characterisation pass. |
| 5 | ADR-QD-187 records the split; ADR-QD-137 and ADR-QD-150 untouched; ADR-QD-047 v1.11 still holds | ✓ VERIFIED | `spec/decisions/187-…pure-seeded-choice.md` present (Rev 1.2) and indexed. `git diff b22d97f9 HEAD -- spec/decisions/137-* spec/decisions/150-* spec/decisions/047-*` is empty. The menu is still computed into `SimulationSnapshot.policyMenu` in the session's `build` (line 332), so v1.11's "policyMenu is the session's" holds. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Requirements Coverage

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| CHSE-01 | ✓ SATISFIED | Truth 1. |
| CHSE-02 | ✓ SATISFIED | Truth 2 (module half). |
| CHSE-03 | ✓ SATISFIED | Truth 3. |
| CHSE-04 | ✓ SATISFIED | Truth 2 (tests as plain values, 18 session tests moved) and truth 4 (`writeDraft`). |
| CHSE-05 | ✓ SATISFIED | Truth 5. |
| WX-01 (phase share) | ✓ contributed | Reported `pnpm check:pr` exit 0 at `6b706712`; `packages`/`spec`/`scripts` unchanged since `1ae6035b` and clean in the working tree. Re-run here: house-style exit 0 (578 files), api-surface 941, `pnpm test:tstyche` 71 files pass, devtools project 73 files / 1760 tests pass. `check:pr` itself not re-run (per brief). |
| WX-02 (phase share) | ✓ contributed | Uses only reserved ids: ADR-QD-187, CCR-QD-466, BEH-QD-706..710, INV-QD-393..394; traceability rows present; BEH-QD-460/466 and INV-QD-107 amended by dated blockquote only. |
| WX-03 (phase share) | ✓ contributed | No export added or removed: the three types moved module with identical shapes (compared with `b22d97f9`), barrel names them from `model/SeededChoice.ts`; `check-api-surface` 941. |
| WX-04 (phase share) | ✓ contributed | Diff scan of added lines in `packages` finds no `as` cast, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, ambient console/env/clock, `Record<string, unknown>` or `Stryker disable`; house-style budgets pass. |
| WX-05 (phase share) | ✓ contributed | `74-mutation.mjs compare` exit 0: SimulationSession.ts 325/331 → 244/248 (removed mutants were killed ones), HeldChoice.ts 63/63 → 63/63, SeededChoice.ts 122/122 with 11 static mutants examined, 0 new open or Ignored. Coverage thresholds rest on the reported `check:pr` run (see Notes). |
| WX-06 (phase share) | ✓ contributed | Characterisation committed before any source change and green on the base; 74-RED-EVIDENCE.md records each module rule and each clear/draft rule gutted once with its failing titles. |
| WX-07 (phase share) | ✓ contributed | No D-number, plan id or phase number in added source/test lines; no changeset, `package.json` or CHANGELOG change since base. |

### Spec consistency

ADR-QD-187 decisions 1-10, INV-QD-393/394, BEH-QD-706..710 read against the code: each statement holds (transition return types, the no-op `===` rule, pin inside the transitions, one menu list, `clearRun`/`writeDraft` as the sole sites, `start`'s Refused path not a clear). Each states plainly what the compiler, the tests and review alone keep ("no gate counts the assignments", "nothing counts the callers of `pinHead`"). Every test title cited by INV-QD-394/BEH-QD-710 and the two `.tst.ts` titles cited by INV-QD-393 exist verbatim.

### Behavioural equivalence (read against base `b22d97f9`)

Checked each changed path: construction with/without a seed (resource text `resourceTextOf(blank)` equals base's `{ text: "", error: undefined }` since `encodeResource(undefined)` is `ok("")`), `seed`'s same-entry guard, `reseed` draft/text, `choose` vs the cell's `choose`, `withSightings` vs `setList`+`pin`, `choosePolicyAt` (base `Number.isInteger` guard vs array index; negative, fractional, NaN and `-0` all agree), `seedOf`, `stale`, `baseline`, `editResourceText`, `renameSubject`. No divergence found.

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX in the touched source.

### Notes (informational)

- 74-RED-EVIDENCE.md says the session tests went "100 → 82"; a grep of `it(`/`it.effect(` calls gives 97 → 79. The difference of 18 matches either way.
- An earlier section of 74-RED-EVIDENCE.md gives the session close as 242/248; the later re-recorded section and `74-mutation-close.json` give 244 detected (242 killed + 2 timeout) / 248.
- Coverage was not re-measured independently: a project-scoped `vitest --coverage` reports no files under this config, so the threshold claim rests on the reported `pnpm check:pr` exit 0.

### Human Verification Required

None.

### Gaps Summary

No gaps. The policy choice is a pure value module, the session holds one `choice` and its runs and form, the clear and the draft write each have one site, the characterisation is intact and green, and the ADR record is as required.

---

_Verified: 2026-11-23_
_Verifier: Claude (gsd-verifier)_
