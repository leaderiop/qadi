---
phase: "23"
slug: "sink-record-fields"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest`; fast-check (devDependency of `@qadi/core`); tstyche (`tstyche.json`, `tsconfig.test.json`); vitest bench (`packages/core/bench/*.bench.ts`, `pnpm bench <file>`) |
| **Config file** | `vitest.config.ts` (projects `packages/*`; used here: `core`, `audit`, `devtools`, `http`); `packages/core/vitest.config.ts` (bench include) |
| **Quick run command** | `pnpm vitest run --project core packages/core/test/SinkCodec.test.ts && pnpm test:tstyche packages/core/test/SinkRecord.tst.ts` |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time (no command that builds or tests was run). Benches: about 1.3 s per row (`time: 1000`, `warmupTime: 300`), and 23-01 runs three files five times |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands (single-project vitest or the four record-reading projects, tstyche, `pnpm circular`, and the task's grep gates).
- **Wave 1 (23-01):** tests and bench only; `git diff` against HEAD and the base proves no src change. The checkpoint blocks wave 2.
- **Wave 2 (23-02):** `pnpm vitest run --project core --project audit --project devtools --project http && pnpm test:tstyche && pnpm circular`, then `pnpm lint && pnpm typecheck` (no sibling is mid-RED: 23-03's RED test is written after 23-02 closes).
- **Wave 3 (23-03):** Task 1's RED (absent) is run by name; Task 1's second verify runs the rest of `DecisionSink.test.ts` with the RED test excluded by a `-t` negative lookahead; Task 2 runs core, audit and devtools.
- **Before verify-work:** `pnpm check:pr` green and the per-file mutation comparison (23-04 Task 3).
- **Max feedback latency:** under 60 s for per-task test commands; the mutation base, the benches and 23-04 Task 3 are slower by nature.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | SREC-03, SREC-05, WX-02, WX-05, WX-06 | T-23-01, T-23-03 | A dropped field compiles on the base (shown), the every-shape round trip catches m1–m3, today's values and types pinned, mutation base recorded | property + type + scratch mutation | SinkCodec.test.ts and SinkRecord.tst.ts green; no `packages/core/src` diff vs HEAD or base; mutation JSON names SinkCodec/DecisionRecord/SinkEmit | ❌ W0 → `SinkRecord.tst.ts` created in-task | ⬜ pending |
| 23-01-02 | 01 | 1 | SREC-01 | T-23-02 | Construction cost of today, A and B measured with Evaluate and the encode, interleaved | bench | bench file greps; SUMMARY has "Bench before" and a within-noise verdict; `tsc -p tsconfig.test.json` | ❌ W0 → `SinkRecord.bench.ts` created in-task | ⬜ pending |
| 23-01-03 | 01 | 1 | SREC-01 | T-23-04 | A human chooses A/B/C and the key convention | manual decision | — (checkpoint:decision, blocking-human) | n/a | ⬜ pending |
| 23-01-04 | 01 | 1 | SREC-01, WX-02 | T-23-04 | Outcome recorded machine-checkably; 23-01 committed no src | doc gate | `d01_*`/`d02_keys`/`phase_base` greps; commit paths limited to test, bench, `.planning` | ✅ | ⬜ pending |
| 23-02-01 | 02 | 2 | SREC-02, WX-03 | T-23-05 | One statement per record; classes derive; barrel unchanged | type + unit | `pnpm test:tstyche …SinkRecord.tst.ts && tsc -b packages/core && pnpm circular`; leaf absent from `index.ts` | ✅ | ⬜ pending |
| 23-02-02 | 02 | 2 | SREC-02, SREC-03, SREC-04, SREC-05 | T-23-05, T-23-06, T-23-07 | v2 bytes identical; no field list or spread in project/rebuild; ADR-106 checks intact; SinkRecordTag derived or forced | unit + golden + gates | `? {}` count 0 in SinkCodec.ts (base 12); golden fixture and golden test lines unchanged since base; no brand re-application; four projects + tstyche + circular | ✅ | ⬜ pending |
| 23-02-03 | 02 | 2 | WX-04, WX-05 | T-23-08 | Encode cost within noise; no forbidden construct on added code lines | bench + lint | `pnpm lint && pnpm typecheck`; "Bench after" in SUMMARY; added-line gate for `as`/`switch`/`fnUntraced`/`Schema.TaggedError` | ✅ | ⬜ pending |
| 23-03-01 | 03 | 3 | WX-06 | T-23-11 | Emitted record is not its own round trip (absent, RED) or today's keys pinned (as-is) | integration (RED or pin) | outcome-conditional vitest `-t "its own round trip"` / `-t "keeps today"`; rest of file green | ✅ | ⬜ pending |
| 23-03-02 | 03 | 3 | SREC-04, WX-05 | T-23-09, T-23-10 | One projection, every field from stamp/question, seam tests | unit + integration | core, audit, devtools green; no `failedRecord`/`decidedRecord` in `packages/core/src`; two `decisionRecordFor(` calls in Lifecycle.ts | ✅ | ⬜ pending |
| 23-04-01 | 04 | 4 | WX-02 | T-23-12 | Records name only what exists and match the outcome | doc gate | ADR/BEH/INV/AGENTS greps by outcome; `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 23-04-02 | 04 | 4 | WX-02, WX-03 | T-23-13 | Register row and changeset; overview unchanged | doc gate | CCR row count 1; changeset greps; `pnpm spec:api` | ✅ | ⬜ pending |
| 23-04-03 | 04 | 4 | WX-01, WX-04, WX-05 | T-23-14 | Merge gate unmodified and green; mutation per file not lower | full gate | `pnpm check:pr` (background); no gate script/threshold/budget-table edit since the base; per-file Stryker comparison, new leaf ≥ 0.8 | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. `packages/core/test/SinkRecord.tst.ts` and `packages/core/bench/SinkRecord.bench.ts` are created by the task that needs them (23-01-01, 23-01-02); every other suite exists. Nothing to install. All shell checks run under `bash -c` or call `/usr/bin/grep` (the executor's `grep` is a ugrep alias); baselines in verify comments were measured with the same invocation at `965ff14c` (`? {}` in SinkCodec.ts: 12; `makeSubjectId|makeResourceId` lines: 4; `? {}` in SinkEmit.ts: 2).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Choose the record shape (A Data.TaggedClass over a shared struct, B Schema.TaggedClass, C no-go) and the key convention (absent or as-is) | SREC-01 | A human GO/NO-GO by requirement, with the bench numbers | Read 23-01 Task 3 with its tables and reply `A`, `B` or `C`, then `keys: absent` or `keys: as-is` |
| Whether field doc comments still show on `DecisionRecord` in an editor's hover | SREC-02 (quality) | Hover is an editor behaviour; the `.d.ts` compiles either way | Open a file using `DecisionRecord` after 23-02 and hover `record.cache`; the SUMMARY records the answer |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are the one checkpoint
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (`SinkRecord.tst.ts`, `SinkRecord.bench.ts` created in-task)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task test command (benches, mutation and the full gate are measured runs)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
