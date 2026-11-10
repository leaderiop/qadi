---
phase: "14"
slug: "audit-sink-deadline"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: "2026-11-10"
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 through `@effect/vitest` (`it.effect`, `TestClock`), tstyche for `.tst.ts` |
| **Config file** | `vitest.config.ts` (projects `packages/*`, project name `audit`), `packages/audit/vitest.config.ts` |
| **Quick run command** | `pnpm vitest run --project audit <file>` from the repo root |
| **Full suite command** | `pnpm check:pr` (the merge gate without mutation) |
| **Estimated runtime** | quick: about 1 s per file. Full: many minutes |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command (audit tests it touches, plus `pnpm exec tsc -p tsconfig.test.json` and `pnpm lint:style` where code changed).
- **After every plan wave:** `pnpm vitest run --project audit && pnpm exec tsc -p tsconfig.test.json && pnpm lint:style && pnpm circular && pnpm spec:api`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` green (14-07 Task 2).
- **Max feedback latency:** about 10 s per task, except the scoped Stryker runs (14-01 Task 2, 14-04 Task 3, 14-07 Task 2) and `pnpm check:pr`.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | AUD-03 | T-14-01 | The deadline route is a human decision | checkpoint | — (blocking-human) | n/a | ⬜ pending |
| 14-01-02 | 01 | 1 | XC-02, XC-05 | T-14-16 | Phase 13 closed; decision recorded; numbers free; per-file mutation base written | record + mutation | SUMMARY keys + `14-mutation-base.json` check (node) | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | AUD-01, AUD-02, AUD-03, XC-06 | T-14-01..04 | A hung write/probe/stage/commit is seen RED on the base | regression (RED) | `pnpm vitest run --project audit packages/audit/test/AuditSinkDeadline.test.ts` expecting 5 failed | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 2 | AUD-04, XC-04 | T-14-05, T-14-08 | Never/Latch never settle; reply union closed | tracer unit | `pnpm vitest run --project audit packages/audit/test/AuditPortReply.test.ts packages/audit/test/AuditTrailPortTest.test.ts` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 2 | AUD-04 | T-14-06 | Commit error carries the staged entry | unit | `pnpm vitest run --project audit packages/audit/test/AuditStagingPortTest.test.ts` | ✅ | ⬜ pending |
| 14-02-03 | 02 | 2 | XC-03 | T-14-07 | Reply exported and named in overview | type + gate | `pnpm exec tstyche packages/audit/test/AuditPortReply.tst.ts && pnpm spec:api` + audit project with `--exclude` 14-01's RED file | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 3 | AUD-03 | — | Route read; C stops the plan | record | `grep -qE '^d02_outcome: (A\|B\|C)$' …14-01-SUMMARY.md` | ❌ W0 | ⬜ pending |
| 14-03-02 | 03 | 3 | AUD-01, AUD-02, AUD-03 | T-14-01..03 | Store calls bounded; deadline counted on the breaker | regression (GREEN) | `pnpm vitest run --project audit` | ✅ | ⬜ pending |
| 14-03-03 | 03 | 3 | AUD-02, XC-06 | T-14-04, T-14-09 | Caller interruption not counted; opt-out and zero pinned | unit | `pnpm vitest run --project audit packages/audit/test/AuditSinkDeadline.test.ts` | ✅ | ⬜ pending |
| 14-04-01 | 04 | 4 | AUD-04 | T-14-11 | Mode table gone; Never rows match Fail twins | matrix | `pnpm vitest run --project audit packages/audit/test/AuditWriteExits.test.ts packages/audit/test/Metrics.test.ts` | ✅ | ⬜ pending |
| 14-04-02 | 04 | 4 | AUD-04, XC-05 | T-14-10 | Hand layers converted, assertions kept | unit | `pnpm vitest run --project audit` + hand-layer grep ≤ 1 | ✅ | ⬜ pending |
| 14-04-03 | 04 | 4 | XC-05 | T-14-10 | Assertion counts and per-file mutation score not lower | script | assertion compare vs `14-04-assert-base.txt` + MUTATION-COMPARE vs `14-mutation-base.json` | ✅ | ⬜ pending |
| 14-05-01 | 05 | 5 | AUD-04 | T-14-14 | Legacy options removed or demoted per decision | unit | `pnpm vitest run --project audit` + `rg` for `failWith` family | ✅ | ⬜ pending |
| 14-05-02 | 05 | 5 | AUD-04, XC-04 | T-14-12, T-14-13 | Hand-built audit layer/error in a test fails the gate (probe proven) | gate | `pnpm lint:style && pnpm spec:gates` | ✅ | ⬜ pending |
| 14-06-01 | 06 | 6 | XC-02 | T-14-16 | ADR-QD-126 and amendments; numbers free at phase base | doc gate | `node scripts/spec-revise.mjs --check` + `/usr/bin/grep -qF` checks | ❌ W0 | ⬜ pending |
| 14-06-02 | 06 | 6 | AUD-05, XC-02 | T-14-17, T-14-18 | BEH-QD-251 amended, BEH-QD-379/380, fences compile | doc gate | `pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 14-07-01 | 07 | 7 | XC-03 | T-14-15 | Overview, website, README, changeset, PROJECT.md row | doc gate | `pnpm spec:api && pnpm spec:website-examples && pnpm spec:verify:strict` | ✅ | ⬜ pending |
| 14-07-02 | 07 | 7 | XC-01, XC-05 | T-14-19 | Whole merge gate minus mutation; per-file mutation not lower | gate + mutation | MUTATION-COMPARE vs `14-mutation-base.json` + `pnpm check:pr` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/audit/test/AuditSinkDeadline.test.ts` — created RED by 14-01 Task 3 (D-01), before any source change.
- [ ] `packages/audit/test/AuditPortReply.test.ts`, `AuditPortReply.tst.ts` — created by 14-02.

Everything else (vitest, `@effect/vitest`, tstyche, Stryker `stryker.audit.mjs`) is installed and configured.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deadline route, script union, legacy options | AUD-03, AUD-04 | A one-way public-API choice (D-02) | 14-01 Task 1 checkpoint; reply e.g. `A interrupt remove` |
| `pnpm check:pr` as one uninterrupted run | XC-01 | locally `pnpm example` may need sudo for `playwright install --with-deps` | run in CI or a shell with sudo |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (14-01-01 is the one human checkpoint)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency under 10 s for per-task checks (except Stryker and `pnpm check:pr`)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
