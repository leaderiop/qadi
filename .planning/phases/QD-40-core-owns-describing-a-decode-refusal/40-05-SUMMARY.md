---
phase: QD-40-core-owns-describing-a-decode-refusal
plan: 05
subsystem: devtools-source
tags: [decode-refusal, devtools, breaking-change, example]
phase_base: eb5a94063ac2ba730eaff53ac7095b3e0add36ca
plan_head_before: 1ae1838a8f46963f11d90d16286cf07f7ae25cda
plan_head_after: 6ce8f60fa5df4d9ae963733fcaa4e9c5944766c2
requires: [40-04]
provides:
  - "sourceFromEventSource's onMalformed?: (frame: string, refusal: DecodeRefusal) => void, the refusal unrenamed"
  - "MalformedReason and reasonOf deleted with no alias; the default warning annotated qadi.refusal (core's helper) plus qadi.frame"
  - "the Next.js example reading core's describeDecodeRefusal in Dock.tsx and the ingest route"
affects: [40-06, 40-07, 40-08, 40-09]
actuals:
  tokens: 8300
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [devtools passes core's refusal through; the default log's annotations come from core's tag-only helper]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/Source.ts
    - packages/devtools/src/index.ts
    - packages/devtools/test/model/Source.test.ts
    - packages/devtools/test/model/Source.tst.ts
    - packages/devtools/test/surface.tst.ts
    - examples/nextjs-newsroom/src/client/Dock.tsx
    - examples/nextjs-newsroom/src/server/api.ts
key-decisions:
  - "The default warning keeps its fixed message and never calls the describer; annotations are decodeRefusalAnnotations(refusal) plus qadi.frame (INV-QD-104)"
  - "The example's exhaustive refusedBecause is replaced by describeDecodeRefusal, so a new refusal fails in packages/core/src only"
requirements-completed: [DREF-04, DREF-07, WX-04]
duration: ~3 min
completed: 2026-11-14
status: complete
commits: 2
---

# Phase 40 Plan 05: Devtools passes core's DecodeRefusal through Summary

`onMalformed(frame, refusal)` hands devtools' reader `@qadi/core`'s `DecodeRefusal` as decoded, `MalformedReason` and `reasonOf` are gone with no alias, and the example's two readers use core's describer, so a new refusal is a compile error in core only.

## Commits

- `53628f75` feat(40-05): onMalformed receives core's DecodeRefusal (the five devtools files; body carries `BREAKING CHANGE:`)
- `6ce8f60f` refactor(40-05): the example reads core's decode refusal sentence (Dock.tsx, api.ts)

Trailer: both end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, not the `Opus 5.5` line the plan and 40-01 to 40-04 use (see Deviations).

## What changed

- `Source.ts`: option type, `decodeFrame` and `malformed` take `DecodeRefusal`; `Match` import, `reasonOf`, the five-reason essay and `MalformedReason` deleted; the module doc says a bare record is reported as a `Malformed` refusal. The warning message is the same fixed string; annotations are `{ ...decodeRefusalAnnotations(refusal), "qadi.frame": frame }`. No `"qadi.refusal"` literal and no kebab word in `packages/devtools/src`; `check-house-style` prints 498 files clean with no devtools exemption.
- `index.ts`: `MalformedReason` dropped from the named barrel.
- `Source.test.ts`: the five-row pin's titles are the base titles mapped by the upgrade map (`NotJson`, `TooDeep`, `Malformed`, `UnsupportedVersion`, `Inconsistent`) and each asserts the whole value; the older cases assert the refusal (whole value where known, `_tag` for the `Malformed` frames whose message core owns); new case `the default warning says which refusal, never the decoder's message`. 39 tests, all green.
- `Source.tst.ts` pins the new option type; `surface.tst.ts` refuses `MalformedReason` with a checked `// @ts-expect-error no exported member`.
- Example: `Dock.tsx` logs `describeDecodeRefusal(refusal)`; `api.ts` answers a refused body with `describeDecodeRefusal(record.failure.refusal)`, `refusedBecause`, the `Match` import and the `DecodeRefusal` type import deleted.

## Inconsistent frame's disagreement

`Inconsistent({ disagreement: "Verdict" })`, as the plan predicted (an `Allow` beside a trace that denies).

## New refusal after the change

- edit: added `Throwaway: Record<never, never>;` to the `DecodeRefusal` `Data.TaggedEnum` in `packages/core/src/SinkWire.ts` (after `UnsupportedVersion`), on top of `6ce8f60f`
- tsc files with errors: 1 file, `packages/core/src/SinkWire.ts` (`:194:24`, TS2345, `describeDecodeRefusal`'s `Match.tagsExhaustive` handlers lack `Throwaway`); `pnpm exec tsc -p tsconfig.test.json`
- exhaustive reads outside core: none; `git grep -n "Match.type<DecodeRefusal>" -- examples packages` prints only `packages/core/src/SinkWire.ts:193`
- reverted: `git checkout -- packages/core/src/SinkWire.ts`, `git status --porcelain -- packages examples` empty afterwards

Against 40-02's base record: there tsc named `packages/devtools/src/model/Source.ts` (`reasonOf`) and a second exhaustive read sat in the example's `api.ts`; now tsc names the one core file and no read is left outside core. (A first attempt of this experiment used a BSD `sed` form that did not apply the edit and so produced no tsc output; it was rerun with the edit applied and the table above is from that run.)

## Deviations from Plan

**1. [Attribution] Commit trailer is `Claude Sonnet 5.5`, not `Claude Opus 5.5`**
- **Found during:** both commits
- **Issue:** the plan and the brief require `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ("not Sonnet"); this executor runs as Sonnet 5.5, and the session's attribution instruction gives that line. A repo plan or an agent brief is not a CLAUDE.md or memory rule that would override it, and the Opus line would misstate the author.
- **Fix:** used `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` as the last line of both messages. If the milestone's uniform trailer matters, amend the two commits (`53628f75`, `6ce8f60f`) before they are pushed.
- **Files modified:** none
- **Commit:** 53628f75, 6ce8f60f

**2. [Plan-verify note] Docs outside this plan's scope still name the old words**
- **Found during:** Task 1 (`git grep onMalformed`)
- **Issue:** `packages/devtools/README.md:100` (`onMalformed: (frame, reason)`), `apps/website/.../packages/devtools.md:108`, `apps/website/.../reference/upgrading.md:78` and `packages/http/src/DecisionStreamRoute.ts:32` (a comment: "as `not-a-record`") still use the old vocabulary. The plan's scope and its verify regexes are `packages/devtools/src`, so none was edited; 40-07 and 40-08 own the records and docs. `DecisionStreamRoute.ts` is a comment outside devtools src and is not in any plan-05 file list.
- **Fix:** none here; flagged for 40-07/40-08.

**Total deviations:** 1 attribution, 1 follow-up note. **Impact:** none on behaviour.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-40-12: the message is the fixed literal, annotations are `decodeRefusalAnnotations` plus `qadi.frame`, `Source.ts` never calls the describer, and the new test asserts `qadi.refusal` is `"Malformed"`, `qadi.reason` is absent and the decoder's text (`Missing key`) appears in no other annotation. T-40-13 and T-40-14 accepted as planned. T-40-SC: no manifest or lockfile change.

## Self-Check: PASSED

- `53628f75` and `6ce8f60f` are ancestors of HEAD; the seven plan files exist; `git status --porcelain -- packages examples` is empty.
- Task 1 verifies (devtools suite 5-row pin and default-warning case green, tstyche `Source.tst` and `surface.tst` green, source pattern check, `pnpm typecheck`, `pnpm lint` (only pre-existing `.codex` warnings), `pnpm circular`, `pnpm run build`) and Task 2 verifies (`pnpm run build`, example typecheck, example vitest 42 tests) exit 0.
