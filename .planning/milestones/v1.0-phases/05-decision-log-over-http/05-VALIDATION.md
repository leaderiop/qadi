---
phase: "05"
slug: "decision-log-over-http"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-08"
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest` (runtime); tstyche 7 (type level) |
| **Config file** | `vitest.config.ts` (projects `packages/*`, coverage thresholds), `packages/http/vitest.config.ts` (project `http`), `tstyche.config.json` (reads `tsconfig.test.json`) |
| **Quick run command** | `pnpm vitest run --project http <file>` and `pnpm exec tstyche <file.tst.ts>` |
| **Full suite command** | `pnpm check:pr` |
| **Estimated runtime** | Quick: `decisionBacklog.test.ts` + `decisionStream.test.ts` (44 tests) took 0.7 s at HEAD; `DecisionStreamRoute.tst.ts` took 2.6 s; `pnpm typecheck`, `pnpm lint`, `pnpm circular` and `pnpm spec:api` each took about 1 s; `pnpm spec:verify:strict` took 4 s. Full: well over 10 minutes (example app, website build, package install), so run it in the background |

---

## Sampling Rate

- **After every task commit:** run the task's `<automated>` command. For Plan 01 that is the http test file(s), the tstyche file(s), `pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api`, and grep gates. For Plan 02 it is the spec gates and greps.
- **After every plan wave:** `pnpm vitest run --project http && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` must be green (Plan 02 Task 3).
- **Max feedback latency:** under 60 s for every per-task command. Only Plan 02 Task 3 runs the full gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | LOGH-01, LOGH-03, LOGH-04 | T-05-01..04, T-05-06 | JSON: a refused record drops only its element, is reported once (hook, or the backlog's warning and span), and a throwing hook is contained; the backlog route no longer imports the stream route | unit (table at the module seam) + integration (route test unedited) + type | `pnpm vitest run --project http packages/http/test/DecisionLogHttp.test.ts packages/http/test/decisionBacklog.test.ts && pnpm exec tstyche packages/http/test/DecisionLogHttp.tst.ts && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api` + grep gates | ✅ (created red, now green) | ✅ green |
| 05-01-02 | 01 | 1 | LOGH-01, LOGH-02, LOGH-04 | T-05-01..06 | SSE backlog and live agree with JSON cell for cell; one reporter and one encode-or-report remain; the export set is unchanged | unit (table) + integration (whole http project, unedited) + type | `pnpm vitest run --project http && pnpm exec tstyche packages/http/test/DecisionLogHttp.tst.ts packages/http/test/DecisionStreamRoute.tst.ts && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api` + grep gates | ✅ (extended in this task) | ✅ green |
| 05-02-01 | 02 | 2 | XC-02, XC-03 | T-05-07 | — | doc gates | `node scripts/spec-revise.mjs --check && pnpm spec:examples && pnpm spec:api` + greps | ✅ | ✅ green |
| 05-02-02 | 02 | 2 | XC-02 | T-05-07, T-05-08 | — | doc gates | `pnpm spec:verify:strict && pnpm spec:api && pnpm spec:gates && pnpm spec:examples` + register order check | ✅ | ✅ green |
| 05-02-03 | 02 | 2 | XC-01, XC-04, XC-05 | T-05-08, T-05-09 | Merge gate unmodified and green | full gate | `pnpm check:pr` + phase greps + the refusal table by file | ✅ | ⚠️ manual-only (host: playwright deps need sudo) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `packages/http/test/DecisionLogHttp.test.ts`: the framing × scenario refusal table, written red at the start of 05-01-01 (D-06) and extended red at the start of 05-01-02.
- [x] `packages/http/test/DecisionLogHttp.tst.ts`: compatibility pins (D-04). They pass on HEAD by design; their job is to keep passing after the move.

Existing infrastructure (vitest projects, tstyche, `collectingLogger` and `collectingTracer` from `@qadi/testing`) covers everything else. Nothing needs installing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full merge gate green | XC-01 | `pnpm check:pr` step 13 (`pnpm example`) runs `playwright install --with-deps chromium`, which needs sudo on this Fedora host; all later sub-steps (`test:e2e` 30 passed, `spec:website-examples`, `website`, `spec:publish`) passed when run directly | Run `pnpm check:pr` on a host where Playwright's dependency install works (CI, or locally with sudo) and confirm exit 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-08 — 4/5 tasks automated green, 05-02-03 (XC-01) manual-only

## Validation Audit 2026-11-08

| Metric | Count |
|---|---|
| Gaps found | 1 |
| Resolved | 0 |
| Escalated | 1 |
