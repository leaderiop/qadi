---
phase: QD-76-remedies-uses-core-s-signature-match
plan: 02
subsystem: testing
tags: [agreement-test, refusal-rows, red-on-base, remedies, fixtures, agreement-check]
phase_base: bf339146723bd1eabd1f08dd94f489d8480027ef
plan_head_before: 70872b8acec43af7ba29705ecf3815c84d399ee5
plan_head_after: 2df249f4fd836967d75185cdab906783e72a162f

requires: ["76-01"]
provides:
  - "remedyAgreement.ts: the core reference (outcomeOf) and the four sites both agreement tests share"
  - "two agreement tests over a closed product (signature 1184 cases, acted 144) comparing remedyEdits with core's evaluate run over fixturePortsLayer"
  - "five core and devtools refusal rows, red on the base, pinning that a refused request or fixture row fails typed and never dies, throws or answers NotActed"
  - "76-agreement-check.mjs: three files frozen, three append-only from the agreement commit; self-test ends 18 passed"
affects: [76-03, 76-04, 76-05, 76-06, 76-07, 76-08]

actuals:
  tokens: 34000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "an agreement test whose expected outcome is core's own, run (outcomeOf), never a hand-written value"
    - "a phase-local check holding tests frozen or append-only to their first commit, through TypeScript's own parse"

key-files:
  created:
    - packages/devtools/test/remedyAgreement.ts
    - packages/devtools/test/model/RemedySignatureConformance.test.ts
    - packages/devtools/test/model/RemedyActedConformance.test.ts
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-RED-EVIDENCE.md
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-agreement-check.mjs
  modified:
    - packages/core/test/SignatureHistory.test.ts
    - packages/core/test/DecisionHistory.test.ts

key-decisions:
  - "The site-subject refusal rows give core an empty fixture ({ answers: [] }), not the port's default: the default port never reads the request, so no fixture change could make core fail there"
  - "A title longer than the 90-column limit is one string literal continued with a backslash at column 0, broken just after an 'as' where the title holds one, because the house-style scanner reads one physical line at a time and flags an unbalanced 'as <word>'"

patterns-established:
  - "A frozen-or-append-only check reads statement text with whitespace collapsed outside literals and every literal exact"

requirements-completed: []  # SIGM-01, WX-06 and WX-07 are held by this plan but stay Pending: only 76-08 marks SIGM rows, and no plan marks a WX row

duration: 12 min
completed: 2026-11-23
status: complete
---

# Phase 76 Plan 02: The remedy agreement and refusal tests, written on the base Summary

The remedy table is compared with `@qadi/core` actually run, over a closed product of sites, leaves and fixture rows, and the
refusal rows for a request or fixture row the key refuses are written, all on the base and before any source change. The
signature product (1184 cases) is green on the base, the acted product (144 cases) is red on exactly the 14 `Any`-scope
divergences, and every refusal row is red for the defect it names. `76-agreement-check.mjs` holds the agreement files frozen
and the core and remedy test files append-only from that commit. No file under `packages/*/src` changed.

## Performance

- **Duration:** about 12 min
- **Tasks:** 2 of 2
- **Files:** 7 (5 created, 2 modified)

## Accomplishments

- `packages/devtools/test/remedyAgreement.ts` exports exactly `asker`, `SITES` and `outcomeOf` (core's `evaluate` over
  `fixturePortsLayer`, sequential ids, `Effect.result`).
- The two agreement tests follow the plan's axes, correspondence table, titles and refusal rows. Each case compares
  `remedyEdits` with core, and a Deny case evaluates core again on the offered row and requires Allow.
- Each core file gained one appended top-level `describe` and lost or changed no line (`git diff -U0` shows no removed
  line); no test builds a port error with `new`.
- `76-agreement-check.mjs` (`BASE` = `22d5b10c050edb325ea797861b98695699e38fc7`) with the declared substitution for
  `Remedies.test.ts`; `--self-test` ends `self-test: 18 passed`; on HEAD it prints
  `agreement-check: 3 frozen and 3 append-only file(s) hold the statements of 22d5b10c`.

## Measured facts for later plans

Three base runs of each file gave identical results (`76-RED-EVIDENCE.md` holds the commands, durations and first failure
lines).

| File | Base result | Red rows and why |
| ---- | ----------- | ---------------- |
| `RemedySignatureConformance.test.ts` | 5 passed, 2 failed | the two refusal rows: the fixture-row case (remedy table offers `with signature approved`, core fails typed) and the site-subject case (core's read dies, `Schema validation failed`: the error refuses the symbol subject id) |
| `RemedyActedConformance.test.ts` | 1 passed, 6 failed | four site rows with 2, 4, 4 and 4 distinct mismatches (14 in all), every one `hasActed approved at scope Any`; two refusal rows (the history fixture answers `NotActed`, so core denies instead of failing; the site-subject case then dies on the denial's reason, `Cannot convert a Symbol value to a string`) |
| `SignatureHistory.test.ts`, `DecisionHistory.test.ts` | 22 passed, 5 failed | the five refusal rows: signature read dies (`Schema validation failed`); three history rows answer `NotActed`; one throws while the layer is built (`Cannot perform 'getPrototypeOf' on a proxy that has been revoked`) |

The 14 acted mismatches: at the site whose resource id is doc-1, the lists `alice approved doc-2` alone and after the decoy
(core Allow, the remedy table offers `with event approved on doc-1`); at each of the three sites with no usable id (resource
with no id, an id that is not a string, no resource), the lists `alice approved doc-1` and `alice approved doc-2`, alone and
after the decoy (core Allow, the remedy table skips).

Counts the agreement files hold: signature product 4 sites x 4 leaves x 74 lists = 1184 (36 single rows); acted product
4 sites x 2 leaves x 18 lists = 144 (8 single rows). Agreement commit `22d5b10c050edb325ea797861b98695699e38fc7`; the
check script's self-test count is 18. House-style after the commit: `584 file(s) clean (3 declared switch(es), 72
type-test file(s))` (the file count rose by the three new files; the switch and type-test counts are the base's).

## Task Commits

1. **Task 1 (tracer): the agreement and refusal tests on the base** - `22d5b10c` (test) - five files, the first
   `packages/` change after `phase_base` and after the fixture-judgement decision commit.
2. **Task 2: the base recorded and the tests held** - `2df249f4` (docs) - `76-RED-EVIDENCE.md` and `76-agreement-check.mjs`.

## Verification

| Check | Result |
| ----- | ------ |
| Task 1 `<automated>` (run from a script file, on HEAD after the commit; this is the tracer gate) | `the agreement is on the base` |
| Task 2 `<automated>` (from a script file) | `the agreement on the base is recorded and held` |
| `node 76-agreement-check.mjs --self-test` | `self-test: 18 passed` |
| `node 76-agreement-check.mjs` | `agreement-check: 3 frozen and 3 append-only file(s) hold the statements of 22d5b10c` |
| `pnpm typecheck` | clean |
| `node scripts/check-house-style.mjs` | `584 file(s) clean (3 declared switch(es), 72 type-test file(s))` |
| oxlint on the five test files and on the check | clean |
| `git diff --quiet phase_base HEAD -- packages/core/src packages/devtools/src packages/http/src` | holds |

## Deviations from Plan

### Verification-only

**1. [Verification-only] The two verify one-liners were run from script files**
- **Found during:** Tasks 1 and 2
- **Issue:** the one-liners are long and zsh splits file-list variables differently; running them verbatim under `bash -c`
  from the tool risked a transcription slip.
- **Fix:** each was saved byte for byte to a script in the scratchpad and run with `bash`; nothing it checks was weakened.

### Auto-fixed Issues

**2. [Rule 3 - Blocking] Long test titles and reason sentences are string literals continued with a backslash**
- **Found during:** Task 1
- **Issue:** the plan fixes titles that run past 90 columns, and its verify refuses any added line over 90 columns;
  `scripts/check-house-style.mjs` reads one physical line at a time, so a title split across lines left an unbalanced
  `as <word>` that `no-type-assertion` flags ("fails as SignatureHistoryUnavailable").
- **Fix:** each over-long title (and each refusal reason template) is still one literal, continued with a backslash at
  column 0, broken just after an `as` where the title holds one (so no physical line reads `as <word>`). The report holds
  the exact titles; the verify matches them. The agreement header's one-line summary is wrapped over two comment lines for
  the same limit.
- **Files modified:** the three devtools test files and the two core files
- **Commit:** `22d5b10c`

**3. [Rule 1 - Bug] The site-subject refusal rows use an empty fixture for core**
- **Found during:** Task 1
- **Issue:** with the table's literal "no signatures field" mapped to `answers: undefined`, core runs the port's default,
  which never reads the request, so the row could not become green by any fixture change (the base failure was the denial
  reason's `Cannot convert a Symbol value to a string`, not the plan's "the error refuses the symbol subject id").
- **Fix:** the two site-subject rows pass `{ answers: [] }` to `outcomeOf` (a fixture is what the read goes through); the
  base failure for the signature row is then exactly the plan's `Schema validation failed`. The product rows pass the
  list as it is: no field answers the same as an empty fixture on every product case. Recorded in `76-RED-EVIDENCE.md`.
- **Commit:** `22d5b10c`

**Total deviations:** 3 (one verification-only, one blocking house-style conflict, one row-design fix). **Impact:** none on
the results the plan states: every count, red row and mismatch equals the plan's description.

## Known Stubs

None.

## Threat Flags

None. Only test files, a phase-local script and a planning document changed.

## Issues Encountered

None beyond the deviations above.

## Next Phase Readiness

76-03 to 76-05 may change source: the five core rows and the six devtools rows named above turn green by source changes
alone, and `node .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-agreement-check.mjs` must keep printing its
success line. The expected cause of every core row is `describeKeyRefusal` of the description's `key` for the same request
or row; I probed that the key gives `subjectId: an unkeyable symbol (Symbol) has no request key` for a symbol subject id
whether the request carries a requirement or not, and the fixtures must report the same sentence.

## Self-Check: PASSED

Created files exist (`remedyAgreement.ts`, the two agreement tests, `76-RED-EVIDENCE.md`, `76-agreement-check.mjs`); commits
`22d5b10c` and `2df249f4` are ancestors of HEAD; no file under `packages/*/src` differs from `phase_base`.
