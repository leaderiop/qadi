---
phase: "19"
slug: "verdict-presentation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-10"
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 (`@effect/vitest`), React Testing Library in the `devtools` project |
| **Config file** | `vitest.config.ts` (project name used here: `devtools`) |
| **Quick run command** | `pnpm vitest run --project devtools packages/devtools/test/react/VerdictTreatment.test.tsx` |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time; per-task commands are single-project vitest runs plus `pnpm typecheck`/`pnpm lint` |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands.
- **Order:** 19-01 (W1), then 19-02 (W2), then 19-03 (W3): serialised, so no plan's verify runs a suite holding another plan's RED test.
- **After 19-01 and after 19-02:** `pnpm vitest run --project devtools && pnpm typecheck && pnpm lint && pnpm circular`.
- **Mutation (XC-05):** per-file Stryker base for `model/Verdict.ts`, `model/Gates.ts`, `model/Inspect.ts` in `19-mutation-base.json` (19-01 Task 1), compared in 19-03 Task 3.
- **Before verify-work:** `pnpm check:pr` green (19-03 Task 3).
- **Max feedback latency:** under 60 s per task; the full gate runs once.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | VIEW-01, XC-06 | T-19-01 | Denied and Failed rows differ; a denied node is not amber (RED) | component (RED) | `! pnpm vitest run --project devtools …QuestionsPanel.gates.test.tsx -t "INV-QD-006"`; `! … VerdictTreatment.test.tsx` | ❌ W0 → `VerdictTreatment.test.tsx` created in-task | ⬜ pending |
| 19-01-02 | 01 | 1 | VIEW-01 | T-19-02 | Gate state maps closed; unknown is Unrecognised | unit | `pnpm vitest run --project devtools …/model/Gates.test.ts && pnpm typecheck` | ✅ | ⬜ pending |
| 19-01-03 | 01 | 1 | VIEW-01, VIEW-02, XC-04 | T-19-01 | One treatment map; three components read it | component + greps | `pnpm vitest run --project devtools && pnpm typecheck && pnpm lint && pnpm circular`; `stateColour`/`statusColor` count 0 | ✅ | ⬜ pending |
| 19-02-01 | 02 | 2 | VIEW-03 | T-19-04 | Inspector behaviour pinned before refactor | component (characterisation, GREEN) | `pnpm vitest run --project devtools …/react/Inspector.test.tsx` | ❌ W0 → created in-task | ⬜ pending |
| 19-02-02 | 02 | 2 | VIEW-03, XC-06 | T-19-05 | Outcome and obligation read once (RED then GREEN) | unit | `pnpm vitest run --project devtools …/model/Inspect.test.ts && pnpm typecheck` | ✅ | ⬜ pending |
| 19-02-03 | 02 | 2 | VIEW-04 | T-19-04, T-19-06 | Both screens consume `readOutcome`; pins unedited | component + greps | `pnpm vitest run --project devtools && pnpm typecheck && pnpm lint && pnpm circular`; `allowOf`/`isAllowed` count 0; pin file diff empty | ✅ | ⬜ pending |
| 19-03-01 | 03 | 3 | XC-02 | T-19-08 | Records name only what exists | doc gate | `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples && pnpm spec:claims` | ✅ | ⬜ pending |
| 19-03-02 | 03 | 3 | XC-02 | T-19-07 | Change recorded | doc gate | CCR row count, changeset grep | ✅ | ⬜ pending |
| 19-03-03 | 03 | 3 | XC-01, XC-04, XC-05 | T-19-09 | Merge gate unmodified and green | full gate | `pnpm check:pr` (background); per-file mutation comparison | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. `VerdictTreatment.test.tsx` and `Inspector.test.tsx` are created by the tasks that need them; every other suite exists. Nothing to install.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A denial and a failure are distinguishable at a glance in the running dock | VIEW-01 | Colour legibility is a human judgement; the tests prove only that the channels differ | Optional: open the example app's dock, trigger one denied and one failed guard, compare the questions list and the policy tree |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
