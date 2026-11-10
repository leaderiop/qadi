---
phase: "17"
slug: "injective-request-key"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-10"
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest`; fast-check 4.10.2 (devDependency of `@qadi/core` and `@qadi/devtools`); tstyche for type tests |
| **Config file** | `vitest.config.ts` (projects `packages/*`; names used here: `core`, `devtools`, `audit`, `testing`) |
| **Quick run command** | `pnpm vitest run --project core packages/core/test/PortKey.test.ts` |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time (no command that builds or tests was run); per-task commands are single-project vitest runs plus `pnpm typecheck`/`pnpm lint` |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands (single-project vitest, then `pnpm exec tsc -b packages/core` or `pnpm typecheck`, `pnpm lint`, and the task's grep gates).
- **Wave 1:** 17-01 then 17-02, one at a time (shared tree, `use_worktrees` false).
- **After wave 2 (17-03):** only the key's own tests (`PortKey.test.ts`, PortConformance's key describes); the consumers are red by design until 17-04.
- **After wave 3 (17-04):** `pnpm vitest run --project core --project devtools --project audit --project testing && pnpm typecheck && pnpm lint && pnpm circular && pnpm test:tstyche && pnpm spec:api`.
- **After wave 4 (17-05):** `pnpm vitest run --project devtools && pnpm typecheck && pnpm lint`.
- **Before verify-work:** `pnpm check:pr` green and the per-file mutation comparison (17-06 Task 3).
- **Max feedback latency:** under 60 s for per-task commands; the mutation base (17-02) and 17-06 Task 3 are slower by nature.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | KEY-04 | T-17-01 | A human decides the miss policy and confirms the `Result`-typed key (one question) | manual decision | — (checkpoint:decision, blocking-human) | n/a | ⬜ pending |
| 17-01-02 | 01 | 1 | KEY-04, XC-02 | T-17-02, T-17-03 | Outcome recorded machine-checkably; reserved numbers free | doc gate | `d04_*`/`key_type_confirmed` greps; 17-01's commits touch only `.planning/` | ✅ | ⬜ pending |
| 17-02-01 | 02 | 1 | KEY-01, KEY-03, XC-05, XC-06 | T-17-05, T-17-06 | Law and totality red on the base; mutation base recorded | property (RED) | `! pnpm vitest run --project core packages/core/test/PortKey.test.ts`; `17-mutation-base.json` names PortKey.ts and Capture.ts | ❌ W0 → created in-task | ⬜ pending |
| 17-02-02 | 02 | 1 | KEY-01, XC-06 | T-17-04 | Date-vs-ISO replay collision red | integration (RED) | `! pnpm vitest run --project devtools …Capture.test.ts -t "ARCH-65"` | ✅ | ⬜ pending |
| 17-03-01 | 03 | 2 | KEY-01, KEY-02, KEY-03 | T-17-07, T-17-08 | Injective, total, stack-safe key | property + unit | `pnpm vitest run --project core packages/core/test/PortKey.test.ts`; region-scoped key greps | ✅ | ⬜ pending |
| 17-03-02 | 03 | 2 | KEY-02, XC-03 | T-17-07 | Every argument reaches the key | unit + gates | PortConformance `-t "request keys\|reaches the key"`, `pnpm spec:api`, `pnpm lint` | ✅ | ⬜ pending |
| 17-04-01 | 04 | 3 | KEY-03 | T-17-19 | Consumer inventory re-derived on the post-11/13 tree | inventory | "Key consumers" in SUMMARY | ✅ | ⬜ pending |
| 17-04-02 | 04 | 3 | KEY-01, KEY-03, XC-06 | T-17-09, T-17-10, T-17-18 | Every consumer finds what it stored and fails closed on a refusal | unit + integration (RED then GREEN) | `pnpm vitest run --project core --project devtools --project audit --project testing && pnpm typecheck && pnpm test:tstyche` | ✅ | ⬜ pending |
| 17-04-03 | 04 | 3 | KEY-03, XC-04 | T-17-18 | No key `Result` used as a map key or identity operand | static gate | the two `/usr/bin/grep` gates print nothing | ✅ | ⬜ pending |
| 17-05-01 | 05 | 4 | KEY-04, XC-06 | T-17-12, T-17-14 | Per-port miss row red (A/B) or pinned (C) | integration | outcome-conditional vitest `-t "D-04"` | ✅ | ⬜ pending |
| 17-05-02 | 05 | 4 | KEY-04 | T-17-12, T-17-13 | `not(leaf)` cannot allow on a miss (A/B) | integration | `pnpm vitest run --project devtools && pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 17-06-01 | 06 | 5 | KEY-05, XC-02 | T-17-16 | Records name only what exists | doc gate | ADR/BEH/INV greps, `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 17-06-02 | 06 | 5 | XC-02 | T-17-15 | Breaking change recorded | doc gate | CCR row count, changeset greps, `pnpm spec:website-examples` | ✅ | ⬜ pending |
| 17-06-03 | 06 | 5 | XC-01, XC-04, XC-05 | T-17-17 | Merge gate unmodified and green; mutation per file not lower | full gate | `pnpm check:pr` (background); no `scripts/`/threshold edit since the phase base; per-file Stryker comparison | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. `packages/core/test/PortKey.test.ts` is created by the task that needs it (17-02-01); every other suite exists. Nothing to install. All shell checks run under `bash -c` or call `/usr/bin/grep` (the executor's `grep` is a ugrep alias).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Choose the replay miss policy for the four undecided ports, and confirm the `Result`-typed key | KEY-04 | A human decision by design (D-04, one-way for replay semantics) | Read 17-01 Task 1 and reply `A`, `B` with one line per port, or `C`; add `key: object — <reason>` only to object to 17-03's Breaking type |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are the one checkpoint
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (`PortKey.test.ts` created in-task)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
