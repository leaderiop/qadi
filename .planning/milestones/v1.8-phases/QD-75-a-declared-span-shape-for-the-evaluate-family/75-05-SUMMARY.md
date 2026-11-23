---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
plan: 05
subsystem: core
tags: [spans, tests, type-pins, mutation-evidence, declaration]
phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314
plan_head_before: cb4bf81cafb9747db82379a500d466a4e25305b8
plan_head_after: a11766d8345ac2ba912c9a84f03c5809beaf164e

requires:
  - phase: QD-75
    provides: "75-04: every span of the evaluate family declared in EvaluationSpan.ts and written through it"
provides:
  - "EvaluationSpan.test.ts: nine plain-value rows over the declaration, every key read from a declaration"
  - "EvaluationSpan.tst.ts: six type tests, two expect-error refusals, no negative callable pin"
  - "75-RED-EVIDENCE.md: the translation, probe and outcome-tie guarantees each seen failing once"
affects: [75-06, 75-07, 75-08, 75-09]

actuals:
  tokens: 9500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a type-test refusal held in a const and read by an expect, so noUnusedLocals holds and the directive is checked twice"
    - "a gut recorded as the edit, the command and the first failure lines, then reverted with git checkout -- <file>"

key-files:
  created:
    - packages/core/test/EvaluationSpan.test.ts
    - packages/core/test/EvaluationSpan.tst.ts
  modified:
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-RED-EVIDENCE.md

key-decisions:
  - "The runtime rows compare fields and keys by identity (assert.strictEqual) rather than by value, so two structs that merely spell the same schema would still fail row 2 and 3"
  - "The type test words its header without the literal expect-error token: the task verify counts that token and must find exactly the two refusals"

requirements-completed: []  # ESPN-03, ESPN-04, WX-04, WX-06, WX-07 are held by this plan but stay Pending: only 75-09 marks ESPN rows, and no plan marks a WX row

duration: 14 min
completed: 2026-11-23
status: complete
---

# Phase 75 Plan 05: The declaration tested, pinned and seen failing Summary

The evaluate family's declaration now has its own standing checks: nine plain-value rows that read every key from a
declaration, six type pins for the outcome tie, policy tag, leaf-only fields and span names, and four guts (translation
failure tap, probe question, an extra outcome, a missing outcome) each seen failing once and reverted.

phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314

## Accomplishments

- `EvaluationSpan.test.ts` holds the nine rows by their plan titles. Row 2 and 3 compare each shared field with
  `assert.strictEqual` (identity) and each shared key by value; row 5 compares the encoded question as a set of keys read
  from `evaluateSpan.question.keys`; row 8 round-trips all nine structs through `encodeSpan` and `decodeSpan`. It writes no
  `"qadi.<key>"` literal.
- `EvaluationSpan.tst.ts` pins the outcome as exactly `Decision["_tag"] | "Failed"` (and `SpanOutcome` as the three
  literals), the policy tag as exactly `Policy["_tag"]`, every field of the nine structs as a `SpanValue | undefined`, and
  each span name as a `SpanKey`. Two `@ts-expect-error` refusals, each with a positive twin: an outcome of `Abstain`, and a
  list where the joined obligations string goes. No negative `toBeCallableWith` or `toBeConstructableWith` pin, so no
  `NOT_CALLABLE_PIN_BUDGET` row was added; house-style counts 72 type-test files.
- Guts (all reverted, none committed; recorded in `75-RED-EVIDENCE.md`):
  - `translation-failure` (remove `Effect.tapError` from `toPredicate`): exactly C9, C10, C11, C12 fail, 29 pass.
  - `probe-question` (remove the probe's question annotation): exactly C13, C14, C15 fail, 30 pass.
  - `tie-extra` (add `"Abstain"` to the outcome list): `pnpm typecheck` fails at `EvaluationSpan.ts(75,3)` and the outcome
    pin fails under `pnpm test:tstyche`.
  - `tie-missing` (remove `"Deny"`): `pnpm typecheck` fails at `Lifecycle.ts(159,5)` and the outcome pin fails.
- No file under `packages/core/src` changed (`git diff cb4bf81c HEAD -- packages/core/src` is empty), and the contract
  test is untouched since its one commit `ecb0256f`.

## Task Commits

1. **Task 1 (tracer): the declaration tested and pinned** - `683ee88a` (test) - the two test files only.
2. **Task 2: the translation, probe and outcome tie rules seen red** - `a11766d8` (docs) - `75-RED-EVIDENCE.md` only.

The tracer gate ran: Task 1's verify passes, and was re-run end to end after Task 2 (pass), so the expansion was clear.

## Verifications run

| Verify | Result |
| ------ | ------ |
| `vitest run --project core EvaluationSpan.test.ts` | 9 passed, 0 failed |
| `pnpm typecheck` | clean |
| `pnpm test:tstyche` | 72 test files passed, 386 tests passed, 76 suppressed matched, both passes |
| `node scripts/check-house-style.mjs` | `house-style: 581 file(s) clean (3 declared switch(es), 72 type-test file(s))` |
| `node scripts/check-api-surface.mjs` | `api-surface: 941 export(s) documented across 9 package(s)` |
| Task 1 `<automated>` | pass: `the declaration is tested and pinned` (equivalent form, see deviations) |
| Task 2 `<automated>` | pass: `the translation, probe and tie rules seen red` |

## Deviations from Plan

None to the code. One verification-only note, no gate weakened:

- **Verification-only (forbidden-token scan).** Task 1's verify greps added lines for `[^a-zA-Z_]as [A-Za-z{(]`. Two of
  the plan's mandatory row titles contain the words `reads as absent`, so the scan matched the titles, not a cast. The
  check was run as written with those `it("…")` title lines excluded (`$TMPDIR/qd75/v75-05-t1b.sh`); every other added line
  still goes through every pattern, and the scan finds no other token.
- **Header wording.** The verify counts lines holding the literal `@ts-expect-error` and requires exactly two, so the type
  test's header describes the directive as "an expect-error directive" instead of quoting the token. The commit was amended
  once before anything else built on it.

## Known Stubs

None.

## Threat Flags

None. T-75-10 is mitigated by rows 6 and 7 (a value outside the outcome or policy-tag set reads as absent); T-75-11 by the
type test refusing a list where a joined string goes and pinning every field as a `SpanValue`. No endpoint, auth path or
schema was added; no source file changed.

## Next Phase Readiness

Ready for 75-06: the declaration, its contract, its own tests and its type pins all stand, and the mutation guarantees
claimed so far were each seen failing once.

## Self-Check: PASSED

- FOUND: `packages/core/test/EvaluationSpan.test.ts`, `packages/core/test/EvaluationSpan.tst.ts`,
  `75-RED-EVIDENCE.md`, `75-05-SUMMARY.md`
- FOUND commits: `683ee88a`, `a11766d8` (both ancestors of HEAD)
