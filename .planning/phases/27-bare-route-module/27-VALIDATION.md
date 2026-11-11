---
phase: "27"
slug: "bare-route-module"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest`; tstyche 7 for type tests (root `tstyche.json`) |
| **Config file** | `vitest.config.ts` (projects `packages/*`; this phase uses `http`) |
| **Quick run command** | `pnpm exec tstyche packages/http/test/GuardRoute.tst.ts && pnpm vitest run --project http packages/http/test/http.test.ts` |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time (no build or test was run while planning) |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands.
- **Wave 1 (27-01):** tstyche on `GuardRoute.tst.ts`/`PermissionRegistry.tst.ts` and the http `http.test.ts`, all green on the phase base.
- **Wave 2 (27-02):** Task 1 runs lint, madge, gate 13 and grep gates (the importers are mid-move); Task 2 runs the whole http project, every tstyche file, typecheck, lint, madge, gate 13; Task 3 runs the sweep gates (no live `guardRoute`, overview rows, comment-only diff), lint, gate 13 and spec-revise.
- **Before verify-work:** `pnpm check:pr` green and the per-file plus aggregate mutation comparison (27-03 Task 3).
- **Max feedback latency:** under 60 s per task command; the mutation runs (27-01 Task 1, 27-03 Task 3) are slower by nature.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | WX-02, WX-05 | — | Reserved numbers free; mutation baseline per file and aggregate for every src file the phase changes | doc gate + mutation | baseline JSON holds exactly the nine files (GuardRoute, PermissionRegistry, UnguardedRoute, PortRoutes, DecisionStreamRoute, DecisionBacklogRoute, DevtoolsRoutes, AuthorizeRequest, NoResource) and `__aggregate__`; baseline commit touches no package or spec file | ✅ | ⬜ pending |
| 27-01-02 | 01 | 1 | ROUTE-02, WX-06 | T-27-01, T-27-02 | `CurrentSubject` rule and closed error channel pinned on `addGuardedRoute` (with a positive control for the error-marker extract); method agreement pinned; ordering test through `addGuardedRoute` (green on base, no defect) | type + integration | `pnpm exec tstyche packages/http/test/GuardRoute.tst.ts packages/http/test/PermissionRegistry.tst.ts`; `pnpm vitest run --project http packages/http/test/http.test.ts` | ✅ | ⬜ pending |
| 27-02-01 | 02 | 2 | ROUTE-01, ROUTE-03, WX-03, WX-04 | T-27-03, T-27-04, T-27-05 | `addGuardedRoute` written once; one method union; registry module holds the registry; no export change; no cycle | static + gates | `pnpm lint && pnpm circular && pnpm spec:api`; union/`guardRoute`/declaration grep gates | ✅ | ⬜ pending |
| 27-02-02 | 02 | 2 | ROUTE-02 | T-27-03 | Every importer re-pointed; old shim tests deleted only after the new ones are green; behaviour unchanged | full project | `pnpm vitest run --project http && pnpm test:tstyche && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api` | ✅ | ⬜ pending |
| 27-02-03 | 02 | 2 | ROUTE-01, WX-03 | — | No comment or overview row names `guardRoute` as live code or places a route in `PermissionRegistry.ts`; the sweep changes comment lines only | doc gate | `guardRoute`/citation greps; overview row greps; comment-only diff since the refactor commit; `pnpm lint && pnpm spec:api && node scripts/spec-revise.mjs --check` | ✅ | ⬜ pending |
| 27-03-01 | 03 | 3 | ROUTE-02, WX-02 | T-27-06 | BEH-QD-470 traced; ADR-036 amended with both deviations | doc gate | BEH/trace greps; added-lines `guardRoute` gate; `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 27-03-02 | 03 | 3 | WX-02 | T-27-06 | CCR-QD-417 and patch changeset | doc gate | CCR row count; changeset grep | ✅ | ⬜ pending |
| 27-03-03 | 03 | 3 | WX-01, WX-04, WX-05 | T-27-07 | Gate green and unweakened; mutation not lower | full gate | `pnpm check:pr`; no `scripts/`/threshold edit since base; per-file + aggregate Stryker comparison that also fails on a baselined file missing from the after report or a changed src file never baselined | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None. Every suite exists; `PermissionRegistryRoute.ts` is created by 27-02 and covered by the existing registry route tests. Nothing to install. Shell checks run under `bash -c` or call `/usr/bin/grep`.

---

## Manual-Only Verifications

None: the phase has no checkpoint. The two deviations from ROUTE-01/ROUTE-03's wording are decided in 27-CONTEXT.md (findings 1 and 2) and recorded in CCR-QD-417; the orchestrator may reword the requirements.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
