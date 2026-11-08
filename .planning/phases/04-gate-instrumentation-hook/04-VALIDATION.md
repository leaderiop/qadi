---
phase: "04"
slug: "gate-instrumentation-hook"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-08"
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 (`happy-dom` environment for `@qadi/react`), `@testing-library/react` |
| **Config file** | `vitest.config.ts` (projects `packages/*`), `packages/react/vitest.config.ts` (project name `react`) |
| **Quick run command** | `pnpm vitest run --project react packages/react/test/<file>` |
| **Full suite command** | `pnpm check:pr` (the merge gate without mutation) |
| **Estimated runtime** | Whole React project: about 2 s (20 files, 344 tests at c3ce9d2). `pnpm typecheck` about 2 s, `pnpm circular` about 1 s, `node scripts/check-house-style.mjs` instant, `pnpm spec:verify:strict` about 4 s. `pnpm check:pr`: more than 10 minutes, run in the background |

---

## Sampling Rate

- **After every task commit:** run the task's `<automated>` command. Every code task runs the whole React project, because the D-06 acceptance check is that the pre-existing suite passes untouched. It also runs `pnpm typecheck` and `node scripts/check-house-style.mjs`, plus the task's structural grep gates. Every task in 04-01 and 04-02 also checks that `git status` shows no pre-existing React test file modified.
- **After every plan wave:** `pnpm vitest run --project react && pnpm typecheck && pnpm circular && node scripts/check-house-style.mjs && pnpm spec:api && pnpm spec:verify:strict`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` must be green (04-04 Task 2).
- **Max feedback latency:** about 10 s for every per-task command except 04-04 Task 2.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | GATE-01, GATE-02, GATE-05, XC-04 | T-04-01, T-04-02, T-04-03, T-04-04, T-04-05 | Uninstrumented means no registration and no marker. The writer never reaches the public context. A missing group entry reads Pending. Outside a provider, a gate throws `MissingQadiProviderError` naming its kind | characterization pins (tracer) + structural grep gates | `pnpm vitest run --project react && pnpm typecheck && pnpm circular && node scripts/check-house-style.mjs && pnpm spec:api` plus the `gateWriterFor(` count gate (exactly 1; 3 at HEAD) and the useGate.ts identity gate (0; 7 at HEAD) | ❌ W0 (created in Step A: `GateWriter.useGates.test.tsx`) | ⬜ pending |
| 04-01-02 | 01 | 1 | GATE-03 | — | `useDecisionSuspense` behaviour unchanged (suspend, throw, re-suspend on a re-check) | unit (RED 2 → GREEN 1) | `pnpm vitest run --project react && pnpm typecheck` plus the `useDecisionSuspense` body gate (0 lines; 2 at HEAD) | ✅ (file from 04-01-01) | ⬜ pending |
| 04-02-01 | 02 | 2 | GATE-04 | T-04-06 | No group-atom re-creation, no lookup and no registration churn across equal re-renders | pin, test first | `pnpm vitest run --project react packages/react/test/hooks.rerender.test.tsx && pnpm typecheck` | ❌ W0 (created by this task) | ⬜ pending |
| 04-02-02 | 02 | 2 | GATE-03, GATE-05, XC-04 | T-04-06, T-04-07 | Grouped registration stays exact (BEH-QD-068), and the untouched suite stays green | refactor + grep gates | `pnpm vitest run --project react && pnpm typecheck && pnpm circular && node scripts/check-house-style.mjs` plus the hooks.ts/useGate.ts gates (0 and 0; 17 and 4 at HEAD) | ✅ | ⬜ pending |
| 04-02-03 | 02 | 2 | GATE-02 | T-04-07 | Every kind registers once. A sibling's entry is untouched when another entry changes | table-driven + precision pin | `pnpm vitest run --project react packages/react/test/GateWriter.kinds.test.tsx && pnpm vitest run --project react` | ❌ W0 (created by this task) | ⬜ pending |
| 04-03-01 | 03 | 3 | XC-02 | T-04-08 | ADR, index, CCR register and traceability agree | doc gate | `pnpm spec:verify:strict` plus file and row greps | ✅ | ⬜ pending |
| 04-03-02 | 03 | 3 | XC-02 | T-04-08 | Amended documents keep their REQUIREMENT blocks verbatim, and revision headers agree | doc gate | `pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 04-03-03 | 03 | 3 | XC-02, XC-03 | T-04-08 | No export added or removed | doc gate | `pnpm spec:api && pnpm spec:verify:strict && pnpm spec:gates` | ✅ | ⬜ pending |
| 04-04-01 | 04 | 4 | GATE-01, GATE-05, XC-04 | T-04-09 | No phase-4 commit modified a pre-existing React test or a gate configuration | phase-wide gate batch | the Task 1 `<verify>` batch (commit-scoped `git log --fixed-strings --grep='(04-0'` checks) | ✅ | ⬜ pending |
| 04-04-02 | 04 | 4 | XC-01, XC-05 | T-04-09, T-04-10 | Off means absent through the packed artifact and the newsroom example. Coverage holds | gate | `pnpm check:pr` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/react/test/GateWriter.useGates.test.tsx`: created and committed alone in 04-01 Task 1 Step A, green against unmodified `packages/react/src` before any source edit.
- [ ] `packages/react/test/hooks.rerender.test.tsx`: created in 04-02 Task 1 and run against the code before `useQuestionsAs` moves (D-07: test first).
- [ ] `packages/react/test/GateWriter.kinds.test.tsx`: created in 04-02 Task 3.

Existing infrastructure covers everything else: vitest, `@testing-library/react` and `happy-dom` are installed and configured. No Stryker config mutates a file this phase touches (`stryker.react.mjs` mutates only `DecisionOutcome.ts` and `QuestionBook.ts`), so no mutation baseline is needed.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (the three new test files, each created by the task that first needs it)
- [x] No watch-mode flags
- [x] Feedback latency under 10 s for per-task checks (except `pnpm check:pr`, by nature)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
