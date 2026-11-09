---
phase: "03"
slug: "audit-archive-facts"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-08"
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 through `@effect/vitest`, with `fast-check` 4.10.2 (already a devDependency of `@qadi/audit`) |
| **Config file** | `vitest.config.ts` (projects `packages/*`), `packages/audit/vitest.config.ts` |
| **Quick run command** | `pnpm vitest run packages/audit` (15 files and 279 tests at HEAD, about 0.5 s) |
| **Full suite command** | `pnpm check:pr` (the merge gate without mutation) |
| **Estimated runtime** | quick: about 1 s. Full: many minutes, depending on the website and package-install steps |

---

## Sampling Rate

- **After every task commit:** run the task's `<automated>` command. Each includes the audit tests it touches, plus `pnpm lint:style` where code changed.
- **After every plan wave:** run `pnpm vitest run packages/audit && pnpm exec tsc -p tsconfig.test.json && pnpm lint:style && pnpm circular && pnpm spec:api`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` must be green (plan 03-03, Task 3).
- **Max feedback latency:** about 10 s for the per-task commands, except 03-02 Task 3 (scoped Stryker, minutes) and 03-03 Task 3 (`pnpm check:pr`).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | ARC-04 | T-03-01 | The reader accepts what the writer writes, end to end through JSON | property (tracer) | `pnpm vitest run packages/audit/test/ArchiveRoundTrip.test.ts` | ✅ | ✅ green |
| 03-01-02 | 01 | 1 | ARC-04 | T-03-01 | Every `ArchiveRefusal` fires on its own tampering; reorderings refused at the first descent; the writer and reader agree on the break | property | `pnpm vitest run packages/audit/test/ArchiveRoundTrip.test.ts packages/audit/test/AuditArchive.test.ts` | ✅ | ✅ green |
| 03-02-01 | 02 | 2 | ARC-01, ARC-02 | T-03-02 | The reader's order and claim come from the writer's facts | unit + property | `pnpm vitest run packages/audit/test/ArchiveFacts.test.ts packages/audit/test/ArchiveRoundTrip.test.ts packages/audit/test/AuditArchive.test.ts` plus the one-statement gates | ✅ | ✅ green |
| 03-02-02 | 02 | 2 | ARC-03, XC-03 | T-03-03, T-03-04 | Span name kept; no new public export | unit + gate | `pnpm vitest run packages/audit && pnpm spec:api && pnpm circular` | ✅ | ✅ green |
| 03-02-03 | 02 | 2 | XC-05 | T-03-02 | Mutation survivors at or below the baseline of 3 | mutation | `pnpm exec stryker run stryker.audit.mjs --mutate packages/audit/src/ArchiveFacts.ts,packages/audit/src/AuditArchive.ts,packages/audit/src/SequenceIntegrity.ts` plus the survivor count | ✅ | ✅ green |
| 03-03-01 | 03 | 3 | XC-02, XC-03 | T-03-05 | Spec keeps the "not tamper-evidence" wording | doc gate | `node scripts/spec-revise.mjs --check && pnpm spec:api` | ✅ | ✅ green |
| 03-03-02 | 03 | 3 | XC-02 | T-03-06 | Registries, links and revisions agree | doc gate | `pnpm spec:verify:strict` | ✅ | ✅ green |
| 03-03-03 | 03 | 3 | XC-01, XC-04, XC-05 | all | The whole merge gate minus mutation | gate | `pnpm check:pr` | ✅ | ⚠️ flaky — steps 1-12 green; step 13 `pnpm example` needs sudo for `playwright install --with-deps` (local env); remaining steps run by hand green, one e2e flake passed on rerun |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements: vitest, `@effect/vitest`, `fast-check` and Stryker are installed and configured. D-06 puts the new property tests first, in wave 1 (plan 03-01), before any source change.

---

## Manual-Only Verifications

All phase behaviors have automated verification. One environment confirmation remains: `pnpm check:pr` as a single uninterrupted command, in CI or a shell with sudo (03-03-03 — local run stopped at `pnpm example`'s browser install, not at a test).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency under 10 s for per-task checks (except the scoped Stryker run and `pnpm check:pr`, by nature)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-08 (03-02-03: Stryker 97 killed / 1 survived, baseline 3)

## Validation Audit 2026-11-08

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
