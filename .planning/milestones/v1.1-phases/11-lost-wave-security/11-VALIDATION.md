---
phase: "11"
slug: "lost-wave-security"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-10"
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Mutation base** | per-file scores recorded at the phase base in `11-mutation-base-{audit,core,http}.json` (11-01/11-02 Task 1) and compared by a node one-liner that fails on any drop (11-03, 11-04, 11-05) |
| **Framework** | vitest via `@effect/vitest` (projects `core`, `audit`, `http`), `tstyche` for type tests, the `@qadi/features` BDD suite, Stryker for mutation, the repo's spec gates |
| **Config file** | `vitest.config.ts` (projects), `stryker.audit.mjs`, `stryker.http.mjs`, `scripts/check-*.mjs` |
| **Quick run command** | `pnpm vitest run --project <audit\|http\|core> <file>` for the file a task touches |
| **Full suite command** | `pnpm check:pr` |
| **Estimated runtime** | one test file: 2–10 s; `pnpm typecheck` about 1 min; a package's Stryker run several minutes; `pnpm check:pr` well over 10 min (run once, in 11-07) |

---

## Sampling Rate

- **After every task commit:** that task's `<automated>` gate (file-scoped vitest plus the grep baselines).
- **After every plan wave:** `pnpm typecheck && pnpm lint && pnpm vitest run --project audit && pnpm vitest run --project http && pnpm vitest run --project core`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` green (11-07 Task 2).
- **Max feedback latency:** about 10 s for a file-scoped gate; `pnpm typecheck` is the slowest per-task step.
- **Known red between plans:** gate 13 (`pnpm spec:api`) is red from 11-02 until 11-06 adds and removes the overview rows;
  no per-task gate runs it before 11-06.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | SEC-01, SEC-02, SEC-04, XC-05, XC-06 | T-11-01, T-11-02 | The non-string-id discharge and the `scope: "Any"` over-grant fail as tests on the base; audit and core mutation bases recorded | unit + integration (RED) | `! pnpm vitest run --project audit … -t "not a string is refused\|no string id is refused\|does not grant scope 'Any'"` | ✅ (files exist; tests new) | ⬜ pending |
| 11-01-02 | 01 | 1 | SEC-01, SEC-02 | T-11-01, T-11-02 | Discharge refused before `capture`; nothing stored; Deny on `doc-99` | unit + integration | `pnpm vitest run --project audit packages/audit/test/SignatureCapturePort.test.ts packages/audit/test/SignatureLedger.test.ts packages/audit/test/SignatureLoop.test.ts` | ✅ | ⬜ pending |
| 11-01-03 | 01 | 1 | SEC-04 | T-11-03 | `explain()` says subject-wide | unit | `pnpm vitest run --project core packages/core/test/Explanation.test.ts && pnpm spec:website-examples` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 1 | SEC-05, SEC-06, XC-05, XC-06 | T-11-04, T-11-05, T-11-06 | Six foreign API values (incl. the CONTEXT's `guardApi(A)` on `layer(A.prefix("/v1"))`) and an undeclared endpoint fail as tests on the base; http mutation base recorded | integration (RED) | `! pnpm vitest run --project http packages/http/test/GuardApi.test.ts -t "the plan is the API value"` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 1 | SEC-05, SEC-06 | T-11-04, T-11-06, T-11-07 | Lookup by identity; 500 plus one log line; registry lists served paths | integration | `pnpm vitest run --project http packages/http/test/GuardApi.test.ts` plus the string-key and member-key counts = 0 | ✅ / `AccessPlan.ts` new | ⬜ pending |
| 11-02-03 | 02 | 1 | SEC-05 | T-11-05 | Every placement decided through `guardApi`; undeclared refused at build | integration + types | `pnpm vitest run --project http && pnpm exec tstyche packages/http/test && pnpm circular` | `accessPlan.test.ts` new | ⬜ pending |
| 11-03-01 | 03 | 2 | SEC-02, XC-06 | T-11-08, T-11-09 | Foreign and forged rows, key law, golden bytes fail as tests before the keyed store | unit (RED) | `! pnpm vitest run --project audit packages/audit/test/SignatureLedger.test.ts` | `SignatureLedger.tst.ts` new | ⬜ pending |
| 11-03-02 | 03 | 2 | SEC-02 | T-11-08…T-11-11 | One read rule; requirement-free projection | unit + types + BDD | `pnpm vitest run --project audit … && pnpm exec tstyche packages/audit/test/SignatureLedger.tst.ts && pnpm test:bdd` | ✅ | ⬜ pending |
| 11-03-03 | 03 | 2 | XC-05 | — | Coverage holds; no per-file mutation score below the phase base | coverage + mutation | `pnpm coverage`, Stryker audit and core, node compare against `11-mutation-base-{audit,core}.json` | ✅ | ⬜ pending |
| 11-04-01 | 04 | 2 | SEC-05 | T-11-12 | Readers private to the plan | integration + types | reader export count = 0; `pnpm vitest run --project http && pnpm circular` | ✅ | ⬜ pending |
| 11-04-02 | 04 | 2 | SEC-05, SEC-06, XC-05 | T-11-13 | Docs state the same-value rule | docs gate + mutation | `pnpm spec:website-examples && pnpm exec stryker run stryker.http.mjs` | ✅ | ⬜ pending |
| 11-05-01 | 05 | 3 | SEC-03 | T-11-14, T-11-15, T-11-16 | Six wrong adapters each reported | unit (RED then GREEN) | `pnpm vitest run --project audit packages/audit/test/SignatureLedgerConformance.test.ts packages/audit/test/SignatureLoop.test.ts` | new | ⬜ pending |
| 11-05-02 | 05 | 3 | SEC-01 | T-11-01 | Acceptance: no-string-id discharge refused | BDD | `pnpm test:bdd` | ✅ | ⬜ pending |
| 11-05-03 | 05 | 3 | SEC-03, SEC-04 | T-11-14 | Adapter docs show the check | docs gate + mutation | `pnpm spec:website-examples && pnpm exec stryker run stryker.audit.mjs` | ✅ | ⬜ pending |
| 11-06-01 | 06 | 4 | SEC-04, XC-02 | T-11-19 | ADR-058 corrected; ADR-117/118 | records gate | `node scripts/spec-revise.mjs --check` plus greps | new ADRs | ⬜ pending |
| 11-06-02 | 06 | 4 | XC-02, XC-03 | T-11-17 | Spec matches code; gate 13 green | spec gates | `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict` | ✅ | ⬜ pending |
| 11-07-01 | 07 | 5 | XC-02 | T-11-18 | Breaking changes announced | records gate | `pnpm spec:website-examples && pnpm spec:publish` plus greps | new changesets | ⬜ pending |
| 11-07-02 | 07 | 5 | XC-01, XC-04, XC-06 | T-11-17 | No lost meaning reused; full gate | full gate | word-diff lost-range sweep, every hit listed in `11-07-SUMMARY.md`; `pnpm check:pr` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The RED tests are written inside each defect plan's first task
(XC-06 asks for them before the fix, in the same plan), so no separate wave 0 is needed. Nothing to install.

---

## Manual-Only Verifications

All phase behaviors have automated verification. No checkpoint: no premise that moved on `main` is one-way (see 11-03's
objective: the requirement-keyed port key is handled by projection, and the ledger and reader names were never published).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags
- [ ] Feedback latency < 10 s per task (Stryker and coverage tasks are slower by nature: 11-03-03, 11-04-02, 11-05-03)
- [ ] `nyquist_compliant: true` set in frontmatter (set by validate-phase after execution)

**Approval:** pending
