---
phase: 05-decision-log-over-http
plan: 02
subsystem: spec
tags: [spec, behaviors, invariants, traceability, ccr, changeset, http, decision-log]

requires:
  - phase: 05-decision-log-over-http
    provides: "05-01's package-private DecisionLogHttp.ts and its table test, which these records describe"
provides:
  - "BEH-QD-337: the stream and the backlog encode, and refuse, alike"
  - "INV-QD-097's Source and Enforcement name DecisionLogHttp.ts and DecisionLogHttp.test.ts"
  - "Traceability rows for DecisionLogHttp.ts, DecisionLogHttp.test.ts and DecisionLogHttp.tst.ts"
  - "CCR-QD-389 (ARCH-50) and the @qadi/http patch changeset"
affects: [ARCH-50, CCR-QD-389]

plan_head_before: ae735217b5a701465bba98027fa7799b2f1463fd
plan_head_after: ddc3c8767648eb7d6383e57bc8258cfcf7f51014

actuals:
  tokens: 4500
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A package-private module with a public name is recorded in overview.md's Source column as 'X.ts (public through Y.ts)', as for NO_RESOURCE"

key-files:
  created:
    - .changeset/decision-log-http.md
  modified:
    - spec/behaviors/26-decision-stream.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/README.md

key-decisions:
  - "No ADR. The refusal policy's documented owner is unchanged: core's reportEncodeRefusal, with each adapter keeping its own message and hook (ADR-QD-095 D-09-e). grep -rn reportRefused spec/decisions was empty at execution time, so the reserved ADR-QD-112 is left unused. CCR-QD-389 says so."
  - "The new behaviour goes in spec/behaviors/26-decision-stream.md (BEH-QD-337), not 23-http.md, because BEH-QD-311 and BEH-QD-315 both live there."

patterns-established: []

requirements-completed: [XC-01, XC-02, XC-03, XC-04, XC-05]

coverage:
  - id: D1
    description: "BEH-QD-337 states once that /__decisions and /__decisions/backlog encode through one encoder and refuse through one module, each in its own words and span, with a throwing hook contained; BEH-QD-311 and BEH-QD-315 listings show the shared options shape"
    requirement: XC-02
    verification:
      - kind: other
        ref: "pnpm spec:examples; node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
  - id: D2
    description: "INV-QD-097, traceability (section 1, 2 and 4) and overview.md name DecisionLogHttp.ts with no export added or removed"
    requirement: XC-03
    verification:
      - kind: other
        ref: "pnpm spec:verify:strict (21 PASS, 0 FAIL); pnpm spec:api (862 exports documented)"
        status: pass
    human_judgment: false
  - id: D3
    description: "CCR-QD-389 row in numeric position and the @qadi/http patch changeset"
    requirement: XC-02
    verification:
      - kind: other
        ref: "grep '^| CCR-QD-389 |' spec/README.md; grep -o '^| CCR-QD-3[89][0-9] |' spec/README.md | sort -c; pnpm spec:verify:strict check 7"
        status: pass
    human_judgment: false
  - id: D4
    description: "The merge gate pnpm check:pr is green on the final tree"
    requirement: XC-01
    verification:
      - kind: other
        ref: "pnpm check:pr: steps 1-12 passed; step 13 failed only at 'playwright install --with-deps' (sudo needed on this host); the example's typecheck, test, build and test:e2e, and steps 14-16, were then run by hand and passed"
        status: unknown
    human_judgment: true
    rationale: "check:pr itself did not exit 0 in this environment because Playwright's --with-deps step needs sudo. Every step it contains has passed when run directly, but only a host where that step can run can show the single command green."

duration: 6min
completed: 2026-11-08
status: complete
---

# Phase 05 Plan 02: Record the decision-log HTTP module Summary

**BEH-QD-337, INV-QD-097's sources, traceability rows, overview prose, CCR-QD-389 and a `@qadi/http` patch changeset record ARCH-50 in the spec; no ADR, no export change, and every gate in `pnpm check:pr` passes except one step that needs `sudo` on this host.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-11-08T05:22:03Z
- **Completed:** 2026-11-08T05:28:09Z (the gate run and the manual re-runs came after the SUMMARY's last edit)
- **Tasks:** 3
- **Files modified:** 6 (5 spec/changeset files edited or created in 2 commits, plus this SUMMARY)

## Accomplishments

- **BEH id allocated: BEH-QD-337** (`node scripts/next-id.mjs BEH`). It sits after BEH-QD-316 in `26-decision-stream.md`, links INV-QD-097 and INV-QD-104, and has four REQUIREMENT lines: one encoder; a refused record dropped and reported once, in each route's own words; a throwing `onRefused` contained; no span unless refused. BEH-QD-311's and BEH-QD-315's listings now show `options?: { readonly onRefused?: ... }` with a comment tying it to `DecisionStreamOptions`.
- **New Revisions** (each through `scripts/spec-revise.mjs`): `26-decision-stream.md` 1.12 to **1.13**, `invariants.md` 1.82 to **1.83**, `traceability.md` 1.124 to **1.125**, `overview.md` 1.73 to **1.74**, `README.md` 1.121 to **1.122**. The plan's planning-time numbers (1.11, 1.77 and so on) were stale, as the plan warned, because phases 1 to 4 and 6 had already bumped them.
- **CCR-QD-389 position:** directly after CCR-QD-388 (line 327 of `spec/README.md`), before the CCR-QD-270 row that follows the 38x block. No CCR-QD-390 row exists yet. `sort -c` over the CCR-QD-38x/39x rows passes.
- **INV-QD-097:** Source now names `packages/http/src/DecisionLogHttp.ts` in place of the two route paths; Enforcement names `DecisionLogHttp.test.ts`.
- **Traceability:** section 1's behaviour 26 row gains BEH-QD-337 and `DecisionLogHttp`; INV-QD-097's section 2 row gains `DecisionLogHttp.test.ts`; section 4 gains rows for `DecisionLogHttp.test.ts` and `DecisionLogHttp.tst.ts`.
- **Overview:** `frame`'s Source reads "`DecisionLogHttp.ts` (public through `DecisionStreamRoute.ts`)"; the `DecisionStreamOptions`, `decisionBacklogRoute` and `decisionFrames` rows say where `onRefused` comes from. No Export column changed (`pnpm spec:api`: 862 exports, same as before).
- **Changeset:** `.changeset/decision-log-http.md`, `"@qadi/http": patch`.
- **ADR-QD-112 left unused.** `grep -rn reportRefused spec/decisions` printed nothing, and ADR-QD-095 D-09-e still reads true against the code: the stream's hook is `DecisionStreamOptions.onRefused` and its words are "could not be framed". The policy's owner is still core's `reportEncodeRefusal`, so a CCR is enough. CCR-QD-389's row and the changeset say so.

## Gate results

`pnpm check:pr` (run in the background, log in the scratchpad) reached step 13 of 16:

| Step | Result |
| ---- | ------ |
| 1 typecheck, 2 lint, 3 circular, 4 tstyche, 5 coverage, 6 BDD | pass |
| 7 spec:examples (101 blocks), 8 spec:verify:strict (21 PASS, 0 FAIL, 0 SKIP), 9 spec:gates, 10 spec:claims, 11 spec:api, 12 spec:package | pass |
| 13 example | typecheck, vitest (42 tests) and `next build` passed; **failed at `playwright install --with-deps chromium`** |
| 14 to 16 | not reached by `check:pr`; run by hand (below) |

The step-13 failure is the environment, not the tree: Playwright says "your OS is not officially supported" and tries `sudo` to install system packages, which needs a terminal password ("sudo: a password is required"). Chromium itself is already in `~/.cache/ms-playwright`. I did not edit the gate or skip it. Instead I ran what the rest of the chain contains, directly:

- `pnpm test:e2e` in `examples/nextjs-newsroom`: 30 passed.
- `pnpm spec:website-examples`: 40 blocks compile. `pnpm website`: 45 pages built. `pnpm spec:publish`: 9 packages and 6 documents agree on 0.11.0.

So every check in `check:pr` has passed on the final tree, but `pnpm check:pr` as a single command did not exit 0 here. XC-01 therefore needs one run on a host where Playwright's dependency install works (or already satisfied), and I recorded D4 above as `human_judgment: true` for that reason.

The three phase gates, re-run after the doc commits:

1. **One reporter:** `grep -rnE 'const reportRefused\b' packages/http/src | wc -l` = **1** (baseline 2).
2. **Backlog imports from the stream route:** `grep -c 'from "./DecisionStreamRoute.ts"' packages/http/src/DecisionBacklogRoute.ts` = **0** (baseline 1).
3. **Refusal table:** `pnpm vitest run --project http packages/http/test/DecisionLogHttp.test.ts`: 1 file, **12 tests passed**.

## Task Commits

1. **Task 1: behaviour doc, invariant, traceability, overview** - `5af0d8f` (docs)
2. **Task 2: CCR-QD-389, README history line, changeset** - `ddc3c87` (docs)
3. **Task 3: merge gate** - no commit; it changes no file. No fix was needed.

**Plan metadata:** the docs commit that follows this file.

## Files Created/Modified

- `spec/behaviors/26-decision-stream.md` - BEH-QD-337 added; BEH-QD-311 and BEH-QD-315 listings amended
- `spec/invariants.md` - INV-QD-097 Source and Enforcement
- `spec/traceability.md` - section 1, 2 and 4 rows
- `spec/overview.md` - four `@qadi/http` rows
- `spec/README.md` - CCR-QD-389 row and its Change History line
- `.changeset/decision-log-http.md` - new, `@qadi/http` patch

## Decisions Made

- No ADR (see Accomplishments). Rationale: D-07 says to write one only if the refusal policy's documented owner changes, and it did not.
- Behaviour doc: `26-decision-stream.md`, as the plan chose over `23-http.md`.

## Deviations from Plan

None to the work itself. Two things worth recording:

- **Environment (not a code deviation):** `pnpm check:pr` could not complete step 13 (see Gate results). No file was changed to work around it.
- **Tooling quirk found, not fixed (out of scope):** `scripts/spec-revise.mjs` drops its first positional argument when `--date` is absent (`index !== dateFlag + 1` with `dateFlag = -1` excludes index 0), so `spec-revise.mjs <doc> '<entry>'` prints its usage and exits 2. Passing `--date "$(date +%F)"` works. I used that for all five revisions. It is logged here for whoever owns the script; no `deferred-items.md` entry was made.

**Total deviations:** 0 auto-fixed. **Impact on plan:** none. No file outside the plan's list was touched.

## Issues Encountered

- The strict traceability run (Task 2) passed first time, so no row or link needed correcting and `spec/scripts/verify-traceability.sh` was not touched.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or schema. T-05-09 holds: `pnpm spec:api` and the package-install step (`spec:package`, step 12) passed, so no package-private name leaked into `@qadi/http`'s surface.

## Next Phase Readiness

Phase 05's two plans are done, with one open item: a single clean `pnpm check:pr` on a host that can run `playwright install --with-deps` (or has its system libraries already). Nothing in the tree is known to be failing.

## Self-Check: PASSED

- Files exist: `.changeset/decision-log-http.md`, `spec/behaviors/26-decision-stream.md`, `spec/README.md`.
- Commits `5af0d8f` and `ddc3c87` are ancestors of HEAD; `git rev-list --count` from the ledger base gives 2.

---
*Phase: 05-decision-log-over-http*
*Completed: 2026-11-08*
