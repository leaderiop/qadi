---
phase: "21"
slug: "port-request-derivation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest`; fast-check (devDependency of `@qadi/core`); tstyche 7.2.5 for type tests |
| **Config file** | `vitest.config.ts` (projects `packages/*`; names used here: `core`, `devtools`, `audit`); `tstyche.json` |
| **Quick run command** | `pnpm vitest run --project core packages/core/test/PortDescription.test.ts -t "ARCH-69"` and `pnpm exec tstyche PortRequest` |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time (no build or test was run); per-task commands are single-project vitest runs, single-file tstyche runs and `pnpm exec tsc -b packages/core` |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands.
- **Plans run one at a time** (shared tree, `use_worktrees` false): 21-01 → 21-02 → 21-03 → 21-04 → 21-05.
- **After 21-02:** core vitest minus the ARCH-69 law; `PortRequest --only question` green; pose assertions red by design.
- **After 21-03:** core, devtools `Capture.test.ts`, audit `SignatureLedger.test.ts`; `pnpm typecheck && pnpm lint && pnpm circular`.
- **After 21-04:** every tstyche file named in its verify; core vitest; lint.
- **Before verify-work:** `pnpm check:pr` green and the per-file mutation comparison (21-05 Task 3).
- **Max feedback latency:** under 60 s per task command; the mutation runs (21-01, 21-05) are slower by nature.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | PREQ-04, WX-02, WX-05 | T-21-03 | Base and baseline recorded; a dropped key field shown to compile on the base | manual demo + baseline | `21-base.txt` exists; `git diff --quiet -- packages/core/src`; baseline names the touched files | ✅ | ⬜ pending |
| 21-01-02 | 01 | 1 | PREQ-04, PREQ-05, WX-06 | T-21-01, T-21-03 | A question or pose missing a member is assignable today | type (RED) | `! pnpm exec tstyche PortRequest` | ❌ W0 → created in-task | ⬜ pending |
| 21-01-03 | 01 | 1 | PREQ-03, WX-06 | T-21-01, T-21-02 | Key law red for four ports; wire bytes pinned | property (RED) + golden | `! pnpm vitest run --project core …PortDescription.test.ts -t "ARCH-69"`; goldens green | ✅ | ⬜ pending |
| 21-02-01 | 02 | 2 | PREQ-04 | T-21-04 | `toQuestion` typed by `QuestionOf<Q>`, encode strips `undefined` | static gate | `QuestionOf<Q>` and `encodeUnknownResult` greps | ✅ | ⬜ pending |
| 21-02-02 | 02 | 2 | PREQ-04, PREQ-05, WX-04 | T-21-04, T-21-05 | No conditional spread in any `toQuestion`; bytes unchanged | unit + type + gates | spread-count gate; `pnpm exec tsc -b packages/core`; core vitest minus ARCH-69; `tstyche PortRequest --only question` | ✅ | ⬜ pending |
| 21-03-01 | 03 | 3 | PREQ-01, PREQ-02, PREQ-03 | T-21-06, T-21-07 | Four ports derive key/defect; law green; pair grouping intact | property + unit | ARCH-69 law; `SignatureHistory.test.ts`; no `key:`/`defect:`/`canonicalKey` in the four modules; `tsc` + `circular` | ✅ | ⬜ pending |
| 21-03-02 | 03 | 3 | PREQ-02, PREQ-03 | T-21-08 | Override documented; replaced pins deleted only after the law is green | unit + gates | PortConformance/PortDescription/PortAccess/PortRemote; pin-count gate; devtools Capture; audit SignatureLedger | ✅ | ⬜ pending |
| 21-03-03 | 03 | 3 | WX-04 | — | No budget or lint regression | static | `pnpm typecheck && pnpm lint && pnpm vitest run --project core` | ✅ | ⬜ pending |
| 21-04-01 | 04 | 4 | PREQ-05 | T-21-09, T-21-10 | A pose cannot leave a member out | type | `tstyche PortRequest`; `tstyche PortSpan Ports PortServing PortWire`; `portSpan({` in 5 modules; `tsc` | ✅ | ⬜ pending |
| 21-04-02 | 04 | 4 | PREQ-05 | T-21-10 | Encoded span questions unchanged | unit | PortSpan/PortAccess/Evaluate/Predicate tests; core vitest; lint | ✅ | ⬜ pending |
| 21-05-01 | 05 | 5 | WX-02 | T-21-12 | Records name only what exists | doc gate | ADR/BEH/INV greps; `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 21-05-02 | 05 | 5 | WX-02 | T-21-11 | Key-text change recorded | doc gate | CCR row count; changeset and AGENTS.md greps | ✅ | ⬜ pending |
| 21-05-03 | 05 | 5 | WX-01, WX-03, WX-04, WX-05 | T-21-13 | Merge gate green and unweakened; mutation per file not lower | full gate | `pnpm check:pr` (background); no `scripts/`/threshold/overview edit since base; per-file Stryker comparison | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. `packages/core/test/PortRequest.tst.ts` is created by the task that needs it (21-01-02); every other suite exists.
Nothing to install. All shell checks run under `bash -c` or call `/usr/bin/grep` (the executor's `grep` is a ugrep alias); no
plan runs `node scripts/next-id.mjs` (it writes a reservation).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A key field dropped on the phase base compiles and only PortConformance catches it | PREQ-04 | A demonstration on the base, not a test to keep: the committed pin is `PortRequest.tst.ts` | 21-01 Task 1 step 4: edit, run `tsc` and PortConformance, record, `git checkout` the file |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (`PortRequest.tst.ts` created in-task)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
