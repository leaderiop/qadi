---
phase: "22"
slug: "scoped-port-read"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest`; tstyche 7.2.5 for type tests |
| **Config file** | `vitest.config.ts` (project `core`); `tstyche.json` |
| **Quick run command** | `pnpm vitest run --project core packages/core/test/PortAccess.test.ts -t "D-07"`, `pnpm exec tstyche PortAccess` and `pnpm exec tstyche PortAsks` |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time (no build or test was run); per-task commands are single-file vitest and tstyche runs |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands.
- **Plans run one at a time** (shared tree, `use_worktrees` false), after Phase 21 has finished: 22-01 → 22-02 → 22-03 → 22-04.
- **After 22-01:** nothing executable changed; `22-01-SUMMARY.md` carries `d02_outcome: A`, `d05_outcome: state-once` and
  `reserved_numbers_free: true`.
- **After 22-02:** the D-07 table fails on exactly two rows (acted, signature); `PortAccess.tst.ts` and `PortAsks.tst.ts` fail on their
  assertions only; the rest of core and `pnpm typecheck` green.
- **After 22-03 Task 1** (not committed alone): `PortRemote`/`PortConformance`/`PortDescription`/`SignatureHistory` suites,
  `tstyche PortAsks` and `PortServing`, `tsc -b packages/core`, `pnpm circular`. Never `PortAccess.test.ts` (its D-07 table is still RED).
- **After 22-03:** core (`PortAccess`, `PortRemote`, `Evaluate`, `Predicate`, `EvaluationMetrics`), every tstyche file, http, BDD;
  `pnpm typecheck && pnpm lint && pnpm circular`.
- **Before verify-work:** `pnpm check:pr` green and the per-file mutation comparison (22-04 Task 3).
- **Max feedback latency:** under 60 s per task command; the mutation runs (22-02, 22-04) are slower by nature.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | SCOPE-02, SCOPE-04, WX-02 | T-22-01, T-22-02, T-22-03 | Both answers taken from `_DECISIONS-v1.2.md` and quoted; base and free numbers recorded | doc gate | `d02_outcome: A`, `d05_outcome: state-once`, dates, reasons, instruction greps; `22-base.txt` exists; only `.planning/` committed | ✅ | ⬜ pending |
| 22-02-01 | 02 | 2 | SCOPE-02, WX-05, WX-06 | T-22-04, T-22-05, T-22-06 | The table pins the span list (port span only) and `relation` per scoped port; the port is not called | unit (RED) + baseline | `22-mutation-base.json` holds every touched src file; D-07 table fails on exactly 2 rows | ✅ | ⬜ pending |
| 22-02-02 | 02 | 2 | SCOPE-03, WX-06 | T-22-06 | Loose-string calls rejected by the type of every port read | type (RED) | `! pnpm exec tstyche PortAccess` on the call assertions; `pnpm typecheck` | ❌ W0 → created in-task | ⬜ pending |
| 22-02-03 | 02 | 2 | SCOPE-04, WX-06 | T-22-06, T-22-07 | The leaf-to-request function is the description's; the facet keeps no leaf map | type (RED) | `! pnpm exec tstyche PortAsks` on the property assertions; `pnpm typecheck` | ❌ W0 → created in-task | ⬜ pending |
| 22-03-01 | 03 | 3 | SCOPE-04 | T-22-10 | `servingFor` derives every name from `asks`; names do not depend on the site; property guard unchanged | unit + law + type + static | PortRemote/PortConformance/PortDescription/SignatureHistory; `tstyche PortAsks && tstyche PortServing && tsc -b packages/core && pnpm circular`; no `ServedLeaves`, no `leaves:`, no pseudo-name, five `asks:` | ✅ | ⬜ pending |
| 22-03-02 | 03 | 3 | SCOPE-01, SCOPE-02, SCOPE-03, WX-06 | T-22-08, T-22-09, T-22-11, T-22-12 | One scoped read, shape A; every read takes its leaf; serving stays off the evaluation path | unit + type + static | PortAccess/PortRemote/Evaluate/Predicate/EvaluationMetrics; `tstyche PortAccess && tstyche PortAsks && pnpm typecheck`; PortAccess counts (0, 0, 0, ≥3, ≥5); no `.serving` in PortAccess/Walk/Predicate; Walk call-site greps | ✅ | ⬜ pending |
| 22-03-03 | 03 | 3 | SCOPE-05, WX-04 | T-22-08 | Budgets unchanged; no fail-open regression | static + unit + BDD | no `scripts/` diff since base; `pnpm lint && pnpm circular && pnpm test:tstyche && core && http && pnpm test:bdd` | ✅ | ⬜ pending |
| 22-04-01 | 04 | 4 | SCOPE-02, SCOPE-04, SCOPE-05, WX-02, WX-03 | T-22-13, T-22-14 | The span change, the type change and the human's override recorded as behaviour, decision and export table | doc gate | ADR/index/four-amendment greps; BEH/INV headings and traceability; overview names `LeafRequests`, not `ServedLeaves`; `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples && pnpm spec:api` | ✅ | ⬜ pending |
| 22-04-02 | 04 | 4 | WX-02, WX-03 | T-22-13 | Register row, AGENTS.md §3/§5, upgrading note and changesets match the code | doc gate | CCR row count; AGENTS.md, changeset and upgrading greps | ✅ | ⬜ pending |
| 22-04-03 | 04 | 4 | WX-01, WX-03, WX-04, WX-05 | T-22-15 | Merge gate green and unweakened; mutation per file not lower | full gate | `pnpm check:pr` (background); no `scripts/`/threshold edit since base; per-file Stryker comparison | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. `packages/core/test/PortAccess.tst.ts` and `packages/core/test/PortAsks.tst.ts` are created by the tasks that need them
(22-02-02, 22-02-03); every other suite exists.
Nothing to install. All shell checks run under `bash -c` or call `/usr/bin/grep`; no plan runs `node scripts/next-id.mjs` (it
writes a reservation).

---

## Manual-Only Verifications

None. Both human decisions of this phase (D-02 = `A`, D-05 = `state once`) were answered on 2026-11-11 in
`.planning/phases/_DECISIONS-v1.2.md`; 22-01 records them and 22-04 quotes them in ADR-QD-134, both machine-checked.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (no checkpoint remains: both decisions are answered)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (`PortAccess.tst.ts` and `PortAsks.tst.ts` created in-task)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
