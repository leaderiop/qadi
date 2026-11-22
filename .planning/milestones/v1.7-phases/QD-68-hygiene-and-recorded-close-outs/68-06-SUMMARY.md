---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 06
subsystem: core, devtools tests
status: complete
tags: [hygn-02, oi-08, oi-14, test-wording, race-test]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-04's source fixes (HEAD 1e8c9b2b) and the owner's run-order commit b34cf1e5
provides:
  - "StoredEnvelope.test.ts's header and describe titles with no plan-local id; Source.test.ts's stamp wording says envelope or label"
  - "DecisionCache.test.ts's three capacity tests describe the validation and the split eviction, not the deleted eviction loop (OI-08)"
  - "the race test without its redundant sides/oneSided assertion (OI-14)"
affects: [68-05, 68-15]

actuals:
  tokens: 2670
  tasks: 2
  commits: 2
plan_head_before: b34cf1e59e16f3fdd297d57c1a3bdafb8d12332f
plan_head_after: d06f8bc5d4e43d6cb398372c7fb7a50a5d30ca2d
commits: 2

tech-stack:
  added: []
  patterns:
    - "a wording edit is proven by 68-compare.mjs reporting the emitted code identical with titles masked"

key-files:
  created: []
  modified:
    - packages/core/test/StoredEnvelope.test.ts
    - packages/devtools/test/model/Source.test.ts
    - packages/core/test/DecisionCache.test.ts

key-decisions:
  - "The race test keeps every per-run assertion; only sides, oneSided and their comment went, since capped already proves both sides of the owner's completion"

requirements-completed: [HYGN-02, HYGN-07, WX-06, WX-07]
completed: 2026-11-21
---

# Phase 68 Plan 06: stale test wording and the race test's redundant assertion Summary

Three test files now say what they test: no plan-local id in `StoredEnvelope.test.ts`, "envelope" where `Source.test.ts` said "stamp", the capacity tests describing the validation that exists, and the race test without a second assertion that proved nothing `capped` did not.

## Commits

- `e5d4525c` `test(68-06): the stored-envelope and source tests say what they test, with no plan ids` (HYGN-02)
- `d06f8bc5` `test(68-06): the capacity tests describe the validation, and the race test drops its redundant assertion` (OI-08, OI-14)

## HYGN-02 (task 1)

- The roadmap's "10" is a line count. `\b(STOR-0[1-9]|D-[0-9]+)\b` matches **10 lines holding 16 occurrences of 7 distinct ids** (D-01, D-05, D-07, D-12, STOR-01, STOR-02, STOR-03) at the phase base, and 0 after. It does not match the spec ids beside them (`ADR-QD-171`, `INV-QD-039`), which stay.
- `68-compare.mjs <B>` reports `same: …StoredEnvelope.test.ts (22 tests, 4 describes)` and `same: …Source.test.ts (42 tests, 9 describes)`: only titles and comments changed, order and counts intact.
- `SinkCodec.test.ts:2233` and `spec/behaviors/26-decision-stream.md:406` are unchanged against the base.
- Both files have the planned SHA-256 (`64854b1d…`, `05f0d955…`); the core `StoredEnvelope` run passes 22 tests, the devtools `Source` run (which also picks up a second file matching the filter) passes 59.

## OI-08 (task 2)

`dc-wording.patch` alone compiles `same` against the base: `DecisionCache.test.ts` (42 tests, 3 describes). The negative-capacity title now says "rather than retaining nothing"; the negative, NaN and fraction comments say what the unguarded value does to `Chunk.splitAt` (evicts everything, evicts nothing).

## OI-14 (task 2)

`dc-oi14.patch` deletes `sides`, its `push`, `oneSided` and its comment. The comparison now reports `differs … token 7391` (the deletion is code), the file still holds 42 tests, and the file passes.

RED proof, with nothing else running: with `split68.patch` applied to `SharedComputation.ts`, `vitest run --project core -t "a joiner racing its owner"` fails with `expected [ …(5) ] to deeply equal []` (`$S/dc-split.log`); `git apply -R` restored `SharedComputation.ts` to its committed text and the full file is green again. The committed file has SHA-256 `af406143…`.

## Deviations from Plan

**1. [Rule 1 - plan check defect] Task 2's `oneSided or sides remains` grep is wider than the invariant**
- **Found during:** Task 2 verify.
- **Issue:** the plan's `grep -qE "\boneSided\b|\bsides\b"` also matches the English word "sides" in three prose comments the planned file text (and its pinned SHA-256) deliberately keeps ("both sides at every budget", "both sides within `cap` gaps", "never lands on both sides"). The verify therefore fails on the planned file, though the identifiers are gone. The base held 7 matches for `\bsides\b`; the 3 left are all prose.
- **Fix:** no file change. I ran the verify with that one grep narrowed to the identifiers, `\boneSided\b|\bsides(\.| *=)` (no `const sides =`, no `sides.push`), on a scratch copy; every other check in it is unchanged and passed. The check is narrowed to the invariant it states, not relaxed: the prose is not a use of the deleted variable.
- **Files modified:** none. **Commit:** n/a.

**Total deviations:** 1 (a check regex wider than its invariant; no code or text change).

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None. No source, network, auth or schema surface changed; three test files changed titles, comments and one deleted assertion.

## Self-Check: PASSED

- Files modified exist and carry the planned SHA-256 (`StoredEnvelope` `64854b1d…`, `Source` `05f0d955…`, `DecisionCache` `af406143…`).
- Commits `e5d4525c` and `d06f8bc5` are on `arch-wave-12`; `git rev-list --count b34cf1e5..HEAD` was 2 before this SUMMARY.
- Task 1 verify passes as written; task 2 verify passes with the one narrowed grep above.
- `packages/*/src`, `packages/*/bench` and `package.json` are untouched; `.planning/config.json`, `.agents/`, `.codex/` and the `*.iter*.md` files were never staged.
