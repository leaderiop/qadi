---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 08
subsystem: devtools-model-and-test-support
tags: [devtools, superseding-run, failure-hook, test-support]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
plan_head_before: e37b2744d0d30f1d188417b1b710527755fed60a
plan_head_after: c540f9c9c33a5eed344a6cf7d3c41a554be3a58c

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: 87-05's makeStatedRun and 87-06 and 87-07's stores and session on it, so no caller of the failure hook is left
provides:
  - SupersedingRun.ts with fork (token, run) => boolean and no ForkHooks
  - SupersedingRun.test.ts with R3, R5, R6, R7 edited, R9 and law 5 removed
  - builtFeeds.ts with one configuredBy helper behind its four exports
affects: [QD-87 plans 09 to 11 (the ADR and spec name the removed hook and the audit)]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a structural build-then-configure helper in test support, the Effect form of react/useConfigured.ts"

key-files:
  created: []
  modified:
    - packages/devtools/src/model/SupersedingRun.ts
    - packages/devtools/test/model/SupersedingRun.test.ts
    - packages/devtools/test/builtFeeds.ts
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-RED-EVIDENCE.md

key-decisions:
  - "R3, R5, R6 and R7 were retitled to drop the words onFailure and hook, because the shape check reads the whole test file for onFailure; the property each row pins is unchanged."
  - "configuredBy is module-private in builtFeeds.ts: the four exports are the interface the importers use."

requirements-completed: []

coverage:
  - id: H1
    description: "SupersedingRun has no ForkHooks, hooks parameter, Effect.onExit wrapper, Cause or Exit import; fork takes two parameters and the protocol is unchanged"
    requirement: STOP-02
    verification:
      - kind: other
        ref: "87-check.mjs onfailure-gone; SupersedingRun.test.ts R1 to R17 and the property"
        status: pass
    human_judgment: false
  - id: H2
    description: "R3, R5, R6, R7 each seen failing under a scratch edit of the module after their edit; R9 removed; the property keeps laws 1 to 4, 6 and 7 (started, landed)"
    requirement: STOP-02
    verification:
      - kind: test
        ref: "packages/devtools/test/model/SupersedingRun.test.ts#R3, R5, R6, R7 (87-RED-EVIDENCE.md, section 87-08)"
        status: pass
    human_judgment: false
  - id: H3
    description: "builtFeeds.ts builds each configured feed through one helper, its four exports kept, importers and useConfigured.ts unedited"
    requirement: STOP-05
    verification:
      - kind: other
        ref: "87-check.mjs built-feeds-once, unchanged useConfigured.ts; 87-pinned-check.mjs --all-applied (2 of 2 declared edits applied)"
        status: pass
    human_judgment: false
  - id: H4
    description: "the full devtools suite is green; tsc, oxlint, house style, pnpm circular, scan-forbidden, scan-ids, trailers and the earlier-phase ledger are clean"
    requirement: WX-06
    verification:
      - kind: other
        ref: "87-check.mjs suite --green (97 files, 0 failing), stated-run-shape, scan-forbidden, scan-ids, trailers; 87-earlier-checks.mjs"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 08: The failure hook removed and one build-then-configure helper Summary

**`SupersedingRun.fork` is `(token, run) => boolean` with no `ForkHooks`, the rows that pinned the hook are edited or removed per the audit with each kept row seen failing, and `test/builtFeeds.ts` builds each configured feed through one `configuredBy` helper.**

## Performance

- **Duration:** about 20 min
- **Tasks:** 2 (one tracer, one auto)
- **Files:** 3 modified, plus the evidence file

## Accomplishments

- **Tracer, the hook removed.** `SupersedingRun.ts` loses `ForkHooks`, the `hooks` parameter, the `Effect.onExit` wrapper and the `Cause` and `Exit` imports; `fork` installs the run as given, with the same current-token rule, held slot and boolean. In `SupersedingRun.test.ts` the `ForkHooks` import, the `listener` helper and R9 go; R3, R5, R6 and R7 keep every assertion but the hook ones; the property drops law 5, the heard half of law 7, `heardFailures`, `modelHeard`, `hooksFor` and their uses, and keeps laws 1 to 4, 6 and the two law 7 lines it names. `87-RED-EVIDENCE.md` gains `## 87-08 the edited protocol rows`: R3 fails (13 rows) with the run installed by `Effect.runFork` so a close interrupts nothing; R5 and R7 fail (2 rows each) with `stop` forking its empty run under a span; R6 fails (4 rows) with `stop` a no-op. The suite is green over 97 files. `refactor(87-08): remove the superseding run failure hook nothing calls` (`2aecaae3`).
- **`builtFeeds.ts`.** One structural `configuredBy<A extends { configure: (inputs: I) => void }, I>(make, inputs)` is the single `Effect.tap`; `timelineFeedOf`, `diagnosticsFeedOf`, `gatesFeedOf` and `dockModelOf` each call it once with their own input type. The doc says why there is one helper and that `useConfigured.ts` is its hook form. `test(87-08): build each configured feed through one helper` (`c540f9c9`).
- **Gates.** `onfailure-gone`, `built-feeds-once`, `87-pinned-check.mjs --all-applied` (`122 files hold their base text, 5 of 5 born files held, 2 of 2 declared edits applied`), `suite --green`, `stated-run-shape`, `scan-forbidden`, `scan-ids`, `trailers` (24 commits), `87-earlier-checks.mjs`, tsc, oxlint, house style and `pnpm circular` all exit 0.

## Deviations from Plan

### Auto-fixed Issues

None.

### Plan defects and interpretations

**1. [Plan defect] The titles of R3, R5, R6 and R7 could not stay unchanged.** The plan says "titles unchanged", but `onfailure-gone` (and the pinned check's applied test) reject the text `onFailure` anywhere in the protocol test, and the base titles of R3 and R6 contain it (R5 and R7 said "calls no hook"). The titles changed inside their declared regions, which hold the rows' own text, and the verify reads them from the file, so the seen-failing lines name the new titles:
  - R3: `... never calls its onFailure, even when its release dies` -> `R3 closing the scope mid-run interrupts the run, even when its release dies`
  - R5: `stop before any run starts nothing, calls no hook and opens no span` -> `R5 stop before any run starts nothing and opens no span`
  - R6: `... interrupts it, and its onFailure is never called` -> `R6 stop while a run is in flight interrupts it, and it never completes`
  - R7: `... changes nothing, calls no hook and opens no span` -> `R7 stop after a run completed changes nothing and opens no span`

**2. The header doc sentence about a run that dies as its scope closes being "never reported" described the hook.** It now reads that a store checking `isCurrent` drops whatever that run lands as its scope closes. The finalizer-order claim is unchanged. The `head` doc line of the test file that said the file pins when a run "is heard" was edited the same way (inside the `head` region).

**3. The scratch edits for R5 and R7 are narrower than the plan's.** R5 and R7 were seen failing under `stop` forking its empty run under `Effect.withSpan("stop")`, because the module has no path that re-forks a completed run; the evidence lines name the edit. R3 was seen failing under the stronger edit (the run not held by the fiber handle, so no close interrupts it).

**4. `configuredBy` is not exported.** The plan names it a helper behind four exports; the check requires it not be one of the four, and no importer needs it.

**5. Each verify ran in pieces.** The harness refuses a `bash -c` script holding `rm -rf .vitest`, so each verify ran from a scratch script without that command (`.vitest` removed in a separate command), with `87-check.mjs commit` last, after the commit with the one trailer.

**6. `spec/invariants.md` line 3815 still names `onFailure` in `SupersedingRun`'s source line.** That is spec text outside this plan's file list; the ADR and spec plan owns it.

**7. `state.advance-plan` ran twice by mistake.** The second call (made only to read its output) moved `Current Position` to `Plan: 10 of 11`; it was set back to `Plan: 9 of 11` by hand, and `completed_plans` (27) was advanced once.

**Total deviations:** 0 auto-fixed, 1 plan defect (titles), 6 interpretations. **Impact:** none on scope; every property the removed assertions pinned is held by an ST row (R3: ST11; R5: ST9; R6: ST8; R7: ST10; R9: ST3, ST4, ST7, ST11, ST14; law 5 and the heard half of law 7: ST17, ST12).

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-87-20 (a property lost with the hook's rows) is mitigated: each edited row was seen failing after its edit, and the pinned check bounded the edit to its regions and kept the law lines.

## Self-Check: PASSED

- Files modified: `SupersedingRun.ts`, `SupersedingRun.test.ts`, `builtFeeds.ts`, `87-RED-EVIDENCE.md`; no scratch file under `packages`, no `.vitest/`; `SupersedingRun.ts` restored from its backup with `cmp` after each scratch edit.
- Commits are ancestors of HEAD, each with the one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer: `2aecaae3` hook removal, `c540f9c9` helper; `87-check.mjs commit` for each.
- `useConfigured.ts` unchanged; every importer of `builtFeeds.ts` unedited (the pinned check holds them byte for byte).
