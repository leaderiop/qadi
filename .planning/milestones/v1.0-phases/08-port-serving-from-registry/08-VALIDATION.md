---
phase: "08"
slug: "port-serving-from-registry"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-08"
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest`; tstyche 7.2.5 for type tests |
| **Config file** | `vitest.config.ts` (projects `packages/*`; project names `core`, `testing`, `devtools`, `http`), `tstyche.json` (uses `tsconfig.test.json`) |
| **Quick run command** | `pnpm vitest run --project core packages/core/test/PortsLayer.test.ts packages/core/test/PortRemote.test.ts` |
| **Full suite command** | `pnpm check:pr` (background) |
| **Estimated runtime** | measured at HEAD c3ce9d2: quick 0.6 s; core+testing+devtools+http suites 4.1 s; `pnpm typecheck` 1.3 s; `pnpm lint` 0.3 s; `pnpm circular` 0.8 s; `pnpm test:tstyche` 5.6 s (one file 2.5 s); `pnpm spec:api` 0.2 s; `pnpm spec:verify:strict` 3.8 s. The full gate is well over 10 minutes (example app, website build, package install), so it runs in the background |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands:
  - code tasks: the touched projects' vitest suites, `pnpm typecheck`, `pnpm lint`, `pnpm circular`, the task's tstyche file, and its grep gates;
  - record tasks: `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict`, plus `pnpm spec:api` / `pnpm spec:gates` / `pnpm spec:examples` where the task touches those documents.
- **After wave 2 (08-02):** `pnpm vitest run --project core --project testing --project devtools --project http && pnpm typecheck && pnpm lint && pnpm circular && pnpm test:tstyche && pnpm spec:api`.
- **After wave 3 (08-03, approved path only):** the same, plus `pnpm spec:verify:strict`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` green (08-06 Task 3).
- **Max feedback latency:** under 60 s for every per-task command. Only 08-06 Task 3 runs the full gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | SERV-01 | T-08-01 | A human, not automation, decides the ADR amendment (`gate="blocking-human"`, no `auto_select`) | manual decision | — (checkpoint:decision) | n/a | ⬜ pending |
| 08-01-02 | 01 | 1 | SERV-01, XC-02 | T-08-02, T-08-03 | Outcome recorded once, machine-checkable; reserved numbers confirmed free | doc gate | `d01_outcome`/`d01_date`/`d01_reason` greps, CCR-QD-392 row count, `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict`, no uncommitted `packages/` change | ✅ | ⬜ pending |
| 08-02-01 | 02 | 2 | SERV-04, SERV-05 | T-08-04, T-08-06 | Every slot ends at the fail-closed default; a layer wins over answers | unit + end-to-end through `@qadi/testing` (its suite unchanged) | `pnpm vitest run --project core --project testing --project devtools && pnpm typecheck && pnpm lint && pnpm circular && pnpm exec tstyche packages/testing/test/TestLayerOptions.tst.ts`, plus split-helper and per-port-row grep gates | ✅ (`Ports.test.ts` rewritten red first) | ⬜ pending |
| 08-02-02 | 02 | 2 | SERV-04, XC-03, XC-04 | T-08-05 | Each slot stays typed by its own service; no `as` | unit + type + gates | `pnpm vitest run --project core --project devtools --project http --project testing && pnpm typecheck && pnpm lint && pnpm circular && pnpm exec tstyche packages/core/test/Ports.tst.ts && pnpm spec:api && node scripts/spec-revise.mjs --check && pnpm spec:verify:strict`, plus the removed-builder (15→0), row-count (25→15) and UNTRACED_BUDGET gates | ✅ | ⬜ pending |
| 08-03-01 | 03 | 3 | SERV-02 | T-08-07 | An empty required list refuses `constructor`/`__proto__` without reaching the store | integration (`answerRemotely` per registry row) | `pnpm vitest run --project core --project http && pnpm typecheck && pnpm lint && pnpm circular`, plus the serving-member, admission-table and leaf-module grep gates (skipped when D-01 rejected) | ✅ | ⬜ pending |
| 08-03-02 | 03 | 3 | SERV-02, SERV-03 | T-08-08, T-08-09 | The signature port is served only when declared; each leaf maps to exactly one port | unit + property + type | `pnpm vitest run --project core --project http packages/core/test/PortRemote.test.ts packages/http/test/PortRoutes.test.ts && pnpm typecheck && pnpm lint && pnpm exec tstyche packages/core/test/PortServing.tst.ts`, plus the collector, leaf-literal and servingFor-body grep gates | ❌ W0 → created in-task (`PortServing.tst.ts`) | ⬜ pending |
| 08-03-03 | 03 | 3 | SERV-02, XC-03, XC-04 | T-08-07 | Wire stays JSON-only; no admission bypass introduced | full core/http/devtools + gates | `pnpm vitest run --project core --project http --project devtools && pnpm typecheck && pnpm test:tstyche && pnpm lint && pnpm circular && pnpm spec:api && node scripts/spec-revise.mjs --check && pnpm spec:verify:strict`, plus the wire-asked gates (region-scoped) and UNTRACED_BUDGET | ✅ | ⬜ pending |
| 08-04-01 | 04 | 4 | SERV-02, XC-02 | T-08-11 | — | doc gate | ADR-114 file/ID/index/traceability greps, `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict` (skipped unless approved) | ✅ | ⬜ pending |
| 08-04-02 | 04 | 4 | SERV-02, XC-02 | T-08-12 | — | doc gate | ADR-094/107 amendment greps, region-scoped BEH-QD-331 and INV-QD-095 greps, `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 08-05-01 | 05 | 2 | SERV-05, XC-02 | T-08-13 | — | doc gate | outcome-conditional "Considered and rejected" / untouched check, `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict` | ✅ | ⬜ pending |
| 08-06-01 | 06 | 5 | XC-02, XC-03 | T-08-15 | Records name only what exists | doc gate | CCR row and §4 traceability greps, `pnpm spec:api && node scripts/spec-revise.mjs --check && pnpm spec:verify:strict && pnpm spec:gates` | ✅ | ⬜ pending |
| 08-06-02 | 06 | 5 | XC-02 | T-08-14 | — | doc gate | changeset and upgrading-page greps, `pnpm spec:website-examples` | ✅ | ⬜ pending |
| 08-06-03 | 06 | 5 | XC-01, XC-04, XC-05 | T-08-16 | The merge gate runs unmodified and is green | full gate | `pnpm check:pr` (background), and no edit under `scripts/`, `vitest.config.ts` or `stryker.config.mjs` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. Every suite these tasks extend already exists: `packages/core/test/Ports.test.ts`, `PortsLayer.test.ts`, `Ports.tst.ts`, `PortRemote.test.ts`, `PortDescription.test.ts`, `packages/devtools/test/model/Capture.test.ts`, and `packages/testing/test/TestLayers.test.ts` and `TestLayerOptions.tst.ts`. The one new file, `packages/core/test/PortServing.tst.ts`, is created by the task that needs it (08-03-02), and it is picked up by `tstyche.json`'s default `*.tst.ts` match and by `tsconfig.test.json`'s `packages/*/test/**/*.ts` include. Nothing to install.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Approve or reject amending ADR-QD-094 for a serving facet | SERV-01 | A human decision by design (D-01); automation must not take it | Read 08-01 Task 1's context and options, then reply `approve` or `reject: <reason>` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (the checkpoint is the one manual-only item)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (`PortServing.tst.ts` created in-task)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
