---
phase: QD-66-the-decoder-reads-only-what-it-declares
plan: 03
subsystem: bench
tags: [untrusted-decode, bench, gate, ab-harness]
phase_base: 48921088b0228724469b6624de91658c650e46c3
plan_head_before: bc00284672440e568e36985623eb19fb048f1b11
plan_head_after: ed3c44f0bf0401ee6e238f6f86f328aea3d11502
requires:
  - phase: QD-66
    provides: "66-02's projection that reads only the declared keys"
provides:
  - "the parameterised A/B harness (ab.sh, analyze.mjs) with the 5% band and the +2% geomean bound fixed before any run"
  - "the ignore group's four benches in UntrustedDecode.bench.ts"
  - "the bench of record: 3 + 3 interleaved, committed source against phase_base, gate pass"
affects: [QD-66-04, QD-66-05]
actuals:
  tokens: 9000
  tasks: 2
  commits: 3
tech-stack:
  added: []
  patterns: ["interleaved A/B with the patched arm applied and reversed around each run, decision on the median of per-run minima"]
key-files:
  created:
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/ab.sh
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/analyze.mjs
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/final/
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-BENCH.md
  modified:
    - packages/core/bench/UntrustedDecode.bench.ts
key-decisions:
  - "The gate (no workload more than 5% slower, a band the base arm's spread never widens; geomean of deltas at most +2%) is in the committed analyzer before the run; one run of record, no re-run"
  - "Phase 59's harness is copied and parameterised in this phase's directory, not edited (add-alongside)"
requirements-completed: []
coverage:
  - id: D1
    description: "No workload more than 5% slower and a geomean no worse than +2% on the six decode workloads, 3 + 3 interleaved"
    requirement: DECL-04
    verification:
      - kind: other
        ref: "bench/final/analysis.tsv: # workloads: 6, # slower: 0, # geomean_d_min_pct: -2.13, # gate: pass; task 2 verify exited 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "The harness fails on a spread-widened band, a dropped geomean condition and doctored runs"
    requirement: WX-06
    verification:
      - kind: other
        ref: "self-test: 7 passed; band plant and geomean plant each exit 1 naming their case; doctored 1.06/1 fail, 1.049/1 pass, 1.025/1.025 fail, 1.019/1.019 pass; task 1 verify exited 0"
        status: pass
    human_judgment: false
duration: 9min
completed: 2026-11-20
status: complete
---

# Phase 66 Plan 03: The decode bench of record Summary

**The committed `ignore` projection against the phase base on six decode workloads, 3 + 3 interleaved: no workload slower, geometric mean -2.13%, gate pass, measured on a loaded host and under a harness shown able to fail.**

## Accomplishments

- Task 1 (tracer, `4fbc4cb3`, `b7fad179`): `ab.sh` and `analyze.mjs` extracted with the planned SHA-256 values and committed as `docs(66-03): the parameterised bench harness`; `bench.patch` (SHA-256 `940802f5…`) applied, the bench file is `3615ccac…`, committed as `test(66-03): bench the ignore projection's workloads`. `bash -n`, oxlint, `pnpm typecheck` and house-style (`560 file(s) clean (3 declared switch(es), 66 type-test file(s))`, unchanged) pass. A smoke run of the filter `^(audit|ignore) — ` read six workloads and an identical-arm gate pass. Phase 59's harness is unchanged.
- Task 2 (`ed3c44f0`): `to-base.patch` is `git diff HEAD <phase_base> -- packages/core/src` (SHA-256 `4a809df0…`). `ab.sh … 3 final base` exited 0 in 56 s, left `done.txt`, and `packages` clean. The analyzer's output is `bench/final/analysis.tsv`; the task 2 verify exited 0.

## Result

```text
# workloads: 6
# slower: 0
# geomean_d_min_pct: -2.13
# max_slowdown_pct: 5.0
# max_geomean_pct: 2.0
# worst_d_min: 3.5 ignore — … :: decodeStoredRecord, one undeclared key
# gate: pass
```

| Workload | base min ns | final min ns | delta | base spread | verdict |
| --- | --- | --- | --- | --- | --- |
| audit: row decoder, then decodeSinkRecord | 19416 | 19125 | -1.5% | 9.0% | ok |
| audit: decodeSinkRecord alone | 18542 | 18083 | -2.5% | 7.4% | ok |
| ignore: decodeSinkRecord, one undeclared key | 18458 | 18458 | -0.0% | 4.7% | ok |
| ignore: decodeStoredRecord, one undeclared key | 19000 | 19667 | +3.5% | 5.3% | ok |
| ignore: decodeStoredRecord | 19458 | 19792 | +1.7% | 5.1% | ok |
| ignore: eight declared keys and eight undeclared, sixteen decodes | 27917 | 24250 | -13.1% | 12.1% | ok |

The two `decodeStoredRecord` deltas (+1.7%, +3.5%) are inside the 4.7% to 12.1% spread of the base arm's minima, which this loaded run cannot separate from noise; the gate decides on the fixed band only.

## Host load

Run of record 22:15:19Z to 22:16:14Z (56 s). The host was loaded throughout by another project's `specforge` build processes, Spotlight (`mds_stores` at 417.7% in one sample) and background work; it was logged, not waited out. Load averages (1 min) read 37.45 at the first run's start and fell to 26.45 at the last run's end (5 min: about 23 to 24; 15 min: about 25). Immediately before: 35.05 23.09 25.33, top process 56.7% CPU; the orchestrator's reading just before this plan was 5.52 16.71 23.51 and had already risen when the plan started. The twelve load files and the per-run table are in `66-BENCH.md`. The arms alternate, so a trend lands on both arms; it is not removed.

## The harness proven

- `analyze.mjs --self-test`: `self-test: 7 passed`.
- A band widened by the spread (`Math.max(MAX_SLOWDOWN, rSpread)`) exits 1, naming `one workload 6% slower with a 20% reference spread still fails`; a gate with the geomean condition dropped exits 1, naming `every workload 2.5% slower fails on the geomean`.
- Doctored copies of the run of record: 1.06/1 `fail`, 1.049/1 `pass`, 1.025/1.025 `fail`, 1.019/1.019 `pass`.

## Deviations from Plan

**1. [Rule 1 - Bug] The planned `synth.mjs` scaled by position, not by workload**
- **Found during:** Task 2, step 4.
- **Issue:** the script scaled "the first task of each file". vitest orders the tasks of a benchmark by speed, so on the real run the first task was a different workload in each of the three files, and the 1.06/1 doctored copy passed (`# slower: 0`, geomean 0.00) instead of failing.
- **Fix:** the scratch script (`$TMPDIR/qd66/synth.mjs`, not committed, the planned text kept beside it as `synth.mjs.planned`) now scales the workload named `audit — a decision record: one decoder or two :: decodeSinkRecord alone` by the first factor and every other by the second. With it: fail, pass, fail, pass, as planned. The gate, the analyzer and the run are untouched.
- **Files modified:** scratch only. **Commit:** none.

**2. [Rule 3 - Blocking] The six `*.log` files of the run are not committed**
- **Found during:** Task 2, step 6.
- **Issue:** the repository's `.gitignore` carries `*.log` (line 10), so `bench/final/base-N.log` and `final-N.log` cannot be staged without `git add -f`, which the commit rules forbid. The plan's artifact list names six logs.
- **Fix:** left on disk beside the run and not committed. They hold vitest's console output only; the numbers, the loads and the patch that decide the gate are committed, and the verify requires none of them.

## Flagged for the owner

- The bench files 66-CONTEXT named besides `UntrustedDecode.bench.ts`, `SinkCodec.bench.ts` and `SinkRecord.bench.ts`, hold no decode workload (66-01's P7), so the decode workloads are all in that one file.
- The `add-alongside` harness debt: two copies of the A/B harness (Phase 59's and this phase's) live in phase directories. A third phase needing an A/B gate is what would force a promote, one harness under `scripts/` with the workload set and bands as inputs.
- The run was taken on a heavily loaded host (load averages 26 to 37 on an Apple M3 Pro). The verdict is a pass on the fixed gate; a quiet-machine rerun is not part of the plan and was not made.

## Known Stubs

None.

## Self-Check: PASSED

- Commits `4fbc4cb3`, `b7fad179` and `ed3c44f0` are ancestors of HEAD; `bench/ab.sh`, `bench/analyze.mjs`, `bench/final/analysis.tsv` and `66-BENCH.md` exist.
- Both task verifies exited 0; `git diff --quiet b7fad179 HEAD -- packages/*/src packages/*/bench scripts package.json` holds.
