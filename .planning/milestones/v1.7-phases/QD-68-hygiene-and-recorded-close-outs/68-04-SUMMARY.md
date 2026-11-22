---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 04
subsystem: core, devtools
status: complete
tags: [oi-09, oi-10, oi-02, oi-03, oi-04, hygn-01, hygn-07, timeline-feed, admission]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-03's red tests (TF26 to TF29, F31, F32, E11 to E13) and the phase base
provides:
  - "TimelineFeed.configure starts the refilling read in a finally after the emptied timeline's publish"
  - "admit reads policy, maxDepth and subject once"
  - "comment fixes OI-02, OI-04, the ingest doc's envelope (HYGN-07) and HYGN-01's three hand-wraps"
affects: [68-05, 68-11]

actuals:
  tokens: 6000
  tasks: 3
  commits: 5
plan_head_before: bbcbf10796e8cc709ac3673cbdf56d9f173b88b6
plan_head_after: d9e2e96b80e9e4e79fe032b9e36e4ee3dcc99a30
commits: 5

tech-stack:
  added: []
  patterns:
    - "a fix is committed only after the planned file hash matches and the previously red tests are green"

key-files:
  created: []
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/README.md
    - packages/core/src/Admission.ts
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/core/src/UntrustedDecode.ts
    - packages/core/src/DecisionLog.ts
    - packages/core/src/SinkCodec.ts
    - features/features/decision-log/decision-log.steps.test.ts
    - packages/core/test/UntrustedDecode.test.ts

key-decisions:
  - "OI-09 by fix B (try/finally around the emptied timeline's publish); its one residue is stated in every text and pinned by TF29: on a Stopped feed a status listener that throws on the Reading the read publishes replaces the timeline listener's throw, and no read is started"
  - "OI-03 is subsumed by OI-09: the caveat lines it named are gone from TimelineFeed.ts and the devtools README"

requirements-completed: []

coverage:
  - id: D1
    description: "OI-09: a capacity change's publish stops no read; TF25 to TF29 pass and the devtools suite is green"
    requirement: "WX-06"
    verification:
      - kind: other
        ref: "the plan's Task 1 verify command: OI-09 fixed: TF25 to TF29 pass and the devtools suite is green"
        status: pass
    human_judgment: false
  - id: D2
    description: "OI-10: admit reads each field of the question once; E7 to E13 pass, core suite and typecheck green"
    requirement: "WX-06"
    verification:
      - kind: other
        ref: "the plan's Task 2 verify command: OI-10 fixed: E7 to E13 pass, core and typecheck green"
        status: pass
    human_judgment: false
  - id: D3
    description: "OI-02, OI-04, HYGN-07 and HYGN-01 are comment or whitespace edits the compiler comparison proves identical; house-style, lint and the BDD suite hold"
    requirement: "HYGN-01"
    verification:
      - kind: other
        ref: "the plan's Task 3 verify command: the comment-only fixes and wraps compile the same and are committed"
        status: pass
    human_judgment: false
---

# Phase QD-68 Plan 04: Source fixes before the bench Summary

**A capacity change's emptied-timeline publish now stops no read (try/finally), `admit` reads each question field once, and the comment-only and hand-wrap edits are proven emitted-identical, so every `packages/*/src` change of the phase is in before the bench.**

## Accomplishments

- OI-09 and OI-03: `TimelineFeed.configure` publishes the emptied timeline inside `try { push(); } finally { readSource(next.source); }`; the `else if` keeps a source-only change reading once. The `subscribe`, `timeline` and `configure` docs and the devtools README state the rethrow and the one residue together. Commit `456be457`.
- OI-10: `admit` reads `policy`, `maxDepth` and `subject` into locals once; the `Admitted` and `admit` docs say each field is read once. E7 to E13 pass. Commit `0136e327`.
- OI-02 and OI-04: `DiagnosticsFeed.ts` says the `Stopped` is held when a listener throws on that publish too; `UntrustedDecoderOptions` says `ignore` keeps the keys of the member the input's `_tag` selects for a schema of more than one member. Commit `2bea33b3`.
- HYGN-01 and HYGN-07: three over-width lines hand-wrapped, and the `ingest` doc says an envelope carries the label where it said rows were stamped. Commit `d9e2e96b`. `68-compare.mjs` reports `same` for all five files of the two comment/wrap commits.
- Final state: core and devtools projects together, 152 files, 4338 tests, 0 failed (TF26 to TF29 and E11 to E13 included); `pnpm typecheck`, `pnpm lint`, `pnpm test:bdd` exit 0; house-style prints `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`; no `*.characterisation.test.tsx` differs from the phase base.

## Commits

| Commit | Message |
| ------ | ------- |
| `456be457` | fix(68-04): a capacity change's publish stops no read |
| `0136e327` | fix(68-04): admit reads each field of the question once |
| `8016587b` | test(68-04): narrow U31's refusals to Malformed so the test typechecks |
| `2bea33b3` | docs(68-04): the diagnostics poll's stop and the ignore projection's members, as the code holds them |
| `d9e2e96b` | style(68-04): hand-wrap the three over-width lines, and the ingest doc names the envelope |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 68-03's U31 did not typecheck**
- **Found during:** Task 2 (`pnpm typecheck`)
- **Issue:** `UntrustedDecode.test.ts` U31 (added in 68-03) read `.failure.message` on `UntrustedValueRefusal`, whose `TooDeep` member has no `message` (TS2339 at three lines). Vitest does not typecheck, so 68-03 did not see it.
- **Fix:** the guard now also states `failure._tag === "Malformed"` for both refusals; the assertions are unchanged.
- **Files modified:** `packages/core/test/UntrustedDecode.test.ts` (a test file, outside the plan's `files_modified`)
- **Verification:** `pnpm typecheck` exit 0; the file's 53 tests pass.
- **Commit:** `8016587b`

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** a test-only edit of lines 68-03 added; no source change.

## Known Stubs

None.

## Threat Flags

None.

## Notes

- The residue of OI-09 is as stated and pinned (TF29): on a `Stopped` feed, a status listener that throws on the `Reading` the `finally`'s read publishes escapes in place of what `push()` threw, and no read is started.
- The per-plan commit ledger of the executor protocol was not written at the first commit; `plan_head_before` is the HEAD at plan start (`bbcbf107`), and `commits: 5` is measured with `git rev-list --count bbcbf107..HEAD` at the last task commit.

## Self-Check: PASSED

All five commits are ancestors of HEAD; the nine modified files exist; the three task verify commands passed on HEAD after the last commit.
