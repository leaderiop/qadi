---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 06
subsystem: testing
status: complete
tags: [core, bench, ab-gate, scoped-read, routing, ports]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: e93fc08cd8a2ba5e5bf8cbe834ff3edcafc96533
plan_head_after: e28d64ee84d2c7b7c3c658222eac90f7701aec1a

gate: pass
gate_patch: routing.patch
gate_patch_sha256: fedbbea7e812b446f6c6c26b79472606d2bca8143d0782b16c43b2c2d6b04e84
fixing_commits:
  - 77a2209f2f867c018b5e457633066591541cb77f

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: spike/f.patch and spike/g.patch (plan 05), 90-check.mjs bench modes (plan 02), scripts/bench/ab.sh and analyze.mjs
provides:
  - two scoped-heavy workloads in packages/core/bench/Evaluate.bench.ts and bench/workloads.txt naming the gate's 37 workloads
  - bench/routing.patch with its sidecar hash, fixed before its run
  - bench/routing.meta.txt, bench/analysis.txt and 90-BENCH.md, the gate of record with its verdict
affects: [QD-90 plan 12 lands the routing, plan 15 and the close cite 90-BENCH.md, the verifier reads PFACT-03 as met]

requirements-completed: []

actuals:
  tokens: 8300
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a bench gate is a fixed workloads file, a patch committed with its sha256 before its run, a run whose meta.txt head is that commit, and the analysis's last `# gate:` line as the only verdict"

key-files:
  created:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/bench/workloads.txt
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/bench/routing.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/bench/routing.patch.sha256
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/bench/routing.meta.txt
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/bench/analysis.txt
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-BENCH.md
  modified:
    - packages/core/bench/Evaluate.bench.ts

key-decisions:
  - "The routing (f)+(g) with the per-call closure in the ByScope arm passes the gate as written, so the hoisted-predicate fallback is not measured and no routing-hoisted file exists (D-16)."

duration: 25min
completed: 2026-11-26
---

# Phase 90 Plan 06: The Bench Gate Summary

**The routing passes its gate: over 37 workloads at 4 + 4 rounds no workload is slower than 5% (worst +3.0%) and the geometric mean of the deltas is +0.75%, with the two scoped-heavy workloads at +1.0% and +2.4%; `gate: pass`.**

## Accomplishments

- Two workloads were added to the `evaluate` group before any measurement: `scoped-heavy — allOf of 8 resource-scoped port leaves, id present` (acted, relationship and signature leaves over `{ resource: { id: "doc-1" } }`) and `scoped-heavy — allOf of 8 Any-scoped port leaves` (acted, not-acted and signature leaves at `scope: "Any"`, no resource). One extra `ManagedRuntime` serves both, over `fixturePortsLayer` with the relationship edges, acted events and signature rows of the interfaces, the signature fixture holding `{ subjectId: "alice", meaning: "approved" }`. Each workload is asserted to allow before timing.
- `bench/workloads.txt` names the 37 keys (Phase 68's 35 with the two new `evaluate` keys after the seventeen existing ones); `90-check.mjs bench --smoke` confirms each is declared once and the run, assertions included, exits 0.
- `bench/routing.patch` is `spike/f.patch` then `spike/g.patch` applied on a scratch clone at HEAD (297 lines, `packages/core/src` only), checked with `git apply --check` on the main tree, and committed with its sha256 before any run.
- The A/B ran once, on a quiet host (`load 3.47 on 12 cpus`), 4 + 4 rounds (`base-1 routing-1 routing-2 base-2 base-3 routing-3 routing-4 base-4`).

## The measurement

| form | workloads | slower | geometric mean | worst | scoped-heavy, id present | scoped-heavy, Any | gate |
| ---- | --------- | ------ | -------------- | ----- | ------------------------ | ----------------- | ---- |
| `routing.patch` (per-call closure in the `ByScope` arm) | 37 | 0 | +0.75% | +3.0% (`field-heavy — allOf of 8 under Intersection`, `depth 40`) | +1.0% | +2.4% | pass |

The deltas of the 37 workloads run from -1.3% to +3.0%. The hoisted-predicate form was not measured: the first form passed, so the plan's fallback was not reached.

## Task Commits

1. **Task 1: the two workloads and the workloads file** - `c4349bf6` `test(90-06): add the scoped-heavy bench workloads`
2. **Task 2: the patch, fixed before its bench** - `77a2209f` `docs(90-06): fix the routing patch before its bench`
3. **Task 2: the record** - `e28d64ee` `docs(90-06): record the bench gate`

## Deviations from Plan

None - plan executed exactly as written. Two small choices the plan left open, taken as the file's own idiom:

- The extra runtime is built like the file's `resolving` environment (`Layer.mergeAll(fixturePortsLayer(…), EvaluationIdLive, currentSubjectLayer(alice))`), not by merging over `services`: `services` already carries every port at its default, and a second layer for the same service in one merge would not be the override the plan means.
- The file disposes none of its runtimes, so the new one is not disposed either.

## Known Stubs

None.

## Threat Flags

None. T-90-13 is held by the A/B of record (`gate: pass`), T-90-14 by `ab.sh`'s restore (`packages/` clean after the run, `git status --short -- packages` prints nothing), T-90-34 by the sidecar hash, the fixing commit and the run's `meta.txt` (`head:` is `77a2209f`, `patch_sha256:` is the committed hash), all checked by `90-check.mjs bench`.

## Issues Encountered

None.

## Denied commands

None.

## Self-Check: PASSED

- `packages/core/bench/Evaluate.bench.ts`, `bench/workloads.txt`, `bench/routing.patch`, `bench/routing.patch.sha256`, `bench/routing.meta.txt`, `bench/analysis.txt` and `90-BENCH.md` exist; commits `c4349bf6`, `77a2209f` and `e28d64ee` are ancestors of HEAD, and each has the one trailer.
- `node 90-check.mjs commit "test(90-06): add the scoped-heavy bench workloads" …` and `commit "docs(90-06): fix the routing patch before its bench" …` exit 0; `bench`, `bench --pass`, `bench --smoke` and `trailers` exit 0 (19 commits since phase_base).
- `pnpm exec tsc -p tsconfig.test.json --noEmit` is clean and `check-house-style` reports 648 files clean.
