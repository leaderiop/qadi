---
phase: "16"
slug: "role-graph-walk"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-10"
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest via `@effect/vitest` (projects `core`, `devtools`), `fast-check` (already a devDependency of both), `@testing-library/react` for the viewer, `vitest bench` for ROLE-05, Stryker |
| **Config file** | `vitest.config.ts`, `packages/core/vitest.config.ts` (`benchmark.include: bench/**/*.bench.ts`), `stryker.config.mjs`, `stryker.devtools.mjs` |
| **Quick run command** | `pnpm vitest run --project <core\|devtools> <file>` |
| **Full suite command** | `pnpm check:pr` |
| **Estimated runtime** | a test file 2–10 s (the 20,000-deep render test up to about 60 s); bench five runs about 1–2 min; `pnpm check:pr` well over 10 min, once, in 16-04 |

---

## Sampling Rate

- **After every task commit:** that task's `<automated>` gate.
- **After every plan wave:** `pnpm typecheck && pnpm lint && pnpm circular && pnpm vitest run --project core && pnpm vitest run --project devtools`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` green (16-04 Task 3).
- **Max feedback latency:** about 10 s per file-scoped gate, except the deep render test.
- **Known red between plans:** gate 13 (`pnpm spec:api`) is knowingly red for `roleWalk`/`RoleStep` from 16-01 until 16-04; no earlier plan adds overview rows.
- **Order:** phases run strictly in numeric order, so the phase base is after Phase 15; plans run serially (16-03 in wave 3 and 16-04 in wave 4, so no two `pnpm coverage` runs share the tree).
- **Mutation base:** scoped per-file scores at the phase base in `16-mutation-base-{core,devtools}.json` (16-01 Task 2), compared by a node one-liner that fails on any drop (16-02, 16-03).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | ROLE-03 | T-16-01 | — | checkpoint:decision | — (A: repeated role is a leaf; B: capped re-walk) | — | ⬜ pending |
| 16-01-02 | 01 | 1 | ROLE-03, ROLE-04, XC-05, XC-06 | T-16-01, T-16-02, T-16-03 | Devtools defects fail fast on the base (k = 16 asserted before k = 30); INV-QD-038 pinned by property; scoped mutation base recorded | unit + property (RED) | `pnpm vitest run --project core packages/core/test/RolesAndDepth.test.ts && ! pnpm vitest run --project devtools packages/devtools/test/model/RoleTree.test.ts` | ✅ / `RoleWalk.test.ts` new | ⬜ pending |
| 16-01-03 | 01 | 1 | ROLE-01, ROLE-03 | T-16-01, T-16-02 | Identity-keyed, iterative, linear tree | unit + property | `pnpm vitest run --project core packages/core/test/RoleWalk.test.ts … && pnpm vitest run --project devtools packages/devtools/test/model/RoleTree.test.ts` plus name-key/recursion counts = 0 | `RoleTraversal.ts` new | ⬜ pending |
| 16-02-01 | 02 | 2 | ROLE-05 | T-16-05 | — | bench (before) | `pnpm vitest bench --run --project core packages/core/bench/Role.bench.ts` | `Role.bench.ts` new | ⬜ pending |
| 16-02-02 | 02 | 2 | ROLE-01, ROLE-02, ROLE-04 | T-16-04, T-16-06 | Same grants as before; one pass | unit + property | `pnpm vitest run --project core packages/core/test/RolesAndDepth.test.ts packages/core/test/RoleWalk.test.ts packages/core/test/AuthSubject.test.ts` plus walker counts | ✅ | ⬜ pending |
| 16-02-03 | 02 | 2 | ROLE-05, XC-05 | T-16-05 | No flatten regression beyond noise; no per-file mutation drop | bench (after) + coverage + mutation | bench five runs; `pnpm coverage`; scoped core Stryker run; node compare against `16-mutation-base-core.json` | ✅ | ⬜ pending |
| 16-03-01 | 03 | 3 | ROLE-03, XC-06 | T-16-07 | 20,000-deep render fails on the base | component (RED) | `! pnpm vitest run --project devtools packages/devtools/test/react/RoleViewer.test.tsx -t "20,000-deep chain renders\|rows are siblings"` | ✅ | ⬜ pending |
| 16-03-02 | 03 | 3 | ROLE-03, XC-05 | T-16-07, T-16-08 | Flat rows, same order and markers | component + coverage + mutation | `pnpm vitest run --project devtools`; `pnpm coverage` (covers `RoleViewer.tsx`, outside the Stryker glob); scoped devtools Stryker run compared with `16-mutation-base-devtools.json` | ✅ | ⬜ pending |
| 16-04-01 | 04 | 4 | XC-02 | T-16-09 | — | records gate | `node scripts/spec-revise.mjs --check` plus greps | `128-…md` new | ⬜ pending |
| 16-04-02 | 04 | 4 | XC-02, XC-03 | T-16-09 | — | spec gates | `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict` | ✅ | ⬜ pending |
| 16-04-03 | 04 | 4 | XC-01, XC-04 | T-16-10 | — | full gate | id-reservation word diff; `pnpm check:pr` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements: `fast-check` is installed in core and devtools, the core bench
project exists. RED tests are each defect plan's first task (XC-06). Nothing to install.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| How a repeated role is shown | ROLE-03 | D-04 is a display decision the user makes (checkpoint, asked once) | Answer 16-01 Task 1: A or B |
| Bench "no regression beyond noise" | ROLE-05 | Throughput moves about 30% between runs; the judgement is over ranges (house-rules-evidence §2), not a CI threshold | Compare 16-02's before/after ranges in its SUMMARY |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (the checkpoint task excepted)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags
- [ ] Feedback latency < 10 s per task (the deep render, bench and mutation tasks are slower by nature)
- [ ] `nyquist_compliant: true` set in frontmatter (set by validate-phase after execution)

**Approval:** pending
