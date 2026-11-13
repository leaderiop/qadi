---
phase: 36-carried-spec-debt-and-stale-records
plan: 10
subsystem: comments
tags: [comments, test-wording, stale-citations, stryker, comment-only]
requires:
  - phase: 36-09
    provides: the green base this plan edits comments on
provides:
  - sixteen src comments name the module that holds the code they describe (Walk.ts, PortAccess.ts, RelationshipResolver.ts, Lifecycle.ts, SinkEmit.ts, EvaluationMetrics.ts)
  - GuardRoute.ts names enforceRequest (27 IN-01); GateWriter.ts names four types and useGates in useGate.ts (28 IN-01, IN-02); useScoped.ts loses its inert lint directive (C5d)
  - DecisionCache, v4-http-smoke, Simulator and DockModel tests describe the mechanism that exists (C5a, DEBT-05, 25 IN-02, 26 IN-03)
  - stryker.http.mjs names GuardRoute.ts's addGuardedRoute
affects: [36-14]
tech-stack:
  added: []
  patterns: ["a comment-only edit is proved by comparing ts.transpileModule(removeComments) output before and after"]
key-files:
  created: []
  modified:
    - packages/core/src/DecisionSink.ts
    - packages/core/src/AuthSubject.ts
    - packages/core/src/Policy.ts
    - packages/core/src/Explanation.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/Matcher.ts
    - packages/core/src/UntrustedDecode.ts
    - packages/core/src/SecurityLabel.ts
    - packages/audit/src/AuditDecisionSinkLive.ts
    - packages/audit/src/CircuitBreaker.ts
    - packages/http/src/QadiHttpError.ts
    - packages/http/src/GuardRoute.ts
    - packages/react/src/GateWriter.ts
    - packages/devtools/src/react/useScoped.ts
    - packages/core/test/DecisionCache.test.ts
    - packages/http/test/v4-http-smoke.test.ts
    - packages/devtools/test/react/Simulator.test.tsx
    - packages/devtools/test/model/DockModel.test.ts
    - stryker.http.mjs
key-decisions:
  - "Comment-only edits stay out of the mutation base and need no changeset (D-17)"
requirements-completed: [DEBT-04, DEBT-05]
status: complete
commits: 3
plan_head_before: 8ea8889ecce1cd6d77792d230c5f180073c71bb2
plan_head_after: 161464364810d2fcdb257a3cca1951e76f17990c
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
duration: n/a
completed: 2026-11-13
---

# Phase 36 Plan 10: Comment and test-wording corrections Summary

Every comment and test title the ledger marks fixed for this plan now names the module or mechanism that exists, each edit proved comment-only by a comment-stripped compile comparison, and the one judging-file edit sits inside `stryker.http.mjs`'s leading comment with its body byte-identical to the phase base.

## Commits

| Commit | What |
| ------ | ---- |
| ec4a0384 | Task 1: 15 src files' comments (16 research-table replacements, 27 IN-01, 28 IN-01, 28 IN-02, C5d) |
| 8f232992 | Task 2: DecisionCache (C5a), v4-http-smoke (DEBT-05), Simulator (25 IN-02), DockModel (26 IN-03) wording |
| 16146436 | Task 3: `stryker.http.mjs` comment, alone (DEBT-05) |

All three end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Verification

- Task 1 comparison: `ok` (15 files changed, each compiles to the same output with comments removed; literal `Evaluate.ts` counts match the expected table; `PortMetrics.ts`, `PortName.ts`, `Identity.ts` unchanged). `pnpm typecheck` and `pnpm lint` exit 0 (`house-style: 493 file(s) clean (3 declared switch(es))`; the oxlint warnings listed are pre-existing).
- Task 2 comparison: `ok` (three files identical without comments; DockModel differs from HEAD only in comments and the 11 stripped parentheticals; header counts eight readouts). Tests: DecisionCache 39/39, v4-http-smoke 7/7, Simulator + DockModel 65/65.
- Task 3: config body from `export default` byte-identical to `phase_base`; `node --check stryker.http.mjs` ok; `pnpm spec:gates`: `dod-table: 25 step(s) match pnpm check, 141 reference(s) resolve`.

## Deviations from Plan

**1. [Rule 3 - Tooling] Task 3's `other files changed with it` check tripped on a tool-managed file**
- **Found during:** Task 3 verify
- **Issue:** the plan's check lists every file in `git diff --name-only HEAD` other than `stryker.http.mjs`; the tool-managed, deliberately unstaged `.planning/config.json` is always in that list.
- **Fix:** none to the work; every other check in that script (body identity, comment names `GuardRoute.ts`, registry credit gone) passed, and the commit staged `stryker.http.mjs` only (`git show --stat`: 1 file, 1 line).
- **Files modified:** none.

**2. Re-wrap beyond the replaced phrase** (not a rule deviation). Where a replacement lengthened a line past the ~90-column hand wrap (Policy.ts depth block, RelationshipResolver.ts, GuardRoute.ts, GateWriter.ts, DockModel header), the surrounding comment lines were re-flowed, as the plan's action asks ("re-wrapping the comment to the file's hand wrap").

**3. DockModel header** says "eight readouts" (the plan's text and `DockModel.ts`'s header) rather than research's "seven stores".

**Total deviations:** 0 auto-fixed. **Impact:** none.

## Known Stubs

None.

## Threat Flags

None. No trust boundary touched (T-36-20 and T-36-21 mitigated by the comparisons above).

## Self-Check: PASSED

- Commits ec4a0384, 8f232992, 16146436 present on `arch-wave-8`; `git rev-list --count` from the ledger base: 3.
- All 20 files in `key-files.modified` exist and are in the three commits.
