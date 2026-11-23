---
phase: QD-76-remedies-uses-core-s-signature-match
plan: 06
subsystem: testing
tags: [mutation, red-evidence, guts, response-body, stryker]
phase_base: bf339146723bd1eabd1f08dd94f489d8480027ef
plan_head_before: 3bf6f80f6dd05f83491fedcabd29c876c77f7107
plan_head_after: 525f46d8d44774884f40f39a2ed9144f95443ea4

requires: ["76-05"]
provides:
  - "each signature, acted, remedy and record guarantee seen failing once on a scratch edit and recorded in 76-RED-EVIDENCE.md (19 guts, none left in the tree or in a commit)"
  - "76-mutation-close.json: core 200/201, devtools 467/467 and http 34/34 on one head (7fe82541), every group by the base's invocation, compare passing"
  - "every mutant on a line the phase wrote, static ones included, run by hand with ignoreStatic false and Killed"
  - "EXAMINED in 76-mutation.mjs: the seven Ignored mutants the close holds beyond its base, each Killed by hand on its own line"
affects: [76-07, 76-08]

actuals:
  tokens: 30000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "a response-body test that pins a conditional member checks the key is absent, not only toEqual (toEqual reads undefined as absent)"

key-files:
  created:
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-mutation-close.json
  modified:
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-RED-EVIDENCE.md
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-mutation.mjs
    - packages/http/test/QadiHttpError.test.ts

key-decisions:
  - "Two http rows were too weak for the gut that names them, so they were strengthened by added lines (the key must be absent) and a row was added for the present case; no source changed"
  - "The one base survivor (SignatureHistory.ts, now line 362) is equivalent (Brand.nominal is the identity) and is explained, not removed: it is not a line the phase wrote"

requirements-completed: []  # WX-05 and WX-06 are held by this plan but stay Pending: only 76-08 marks requirements

duration: about 40 min
completed: 2026-11-23
status: complete
---

# Phase 76 Plan 06: Each guarantee seen failing once, and the mutation close on one head

Nineteen guts show every guarantee the phase claims can fail, for the reason its test names, and the three mutation groups close against the base with every mutant on a written line killed.

## Accomplishments

- **Signature rules (7 guts)** and **acted, remedy and record rules (12 guts)**: each edited on the working tree, run through the named commands, read from the JSON report by exact title, reverted with `git checkout -- <file>`. The two type pins (PS, PA) and the API-surface gate failed as their rows say. No gut is committed and none is left in the tree.
- **`lookup-shared-scoping` corrects D-11's first prediction**: it fails only the fixture's own scoping tests (the subject-global row and the colliding-pair row) and leaves the conformance and the agreement green, because the layer and the judgement read the one lookup; `lookup-unshared` realises D-11's intent.
- **The triple gut brings back exactly the 14 base divergences** (2, 4, 4 and 4, all `Any` scope) and fails both refusal rows.
- **Mutation close** on `7fe82541`: core 200/201 (base 164/165), devtools 467/467 (487/487), http 34/34 (26/26). `compare` prints its success line. Every mutant on a written line (159 across the eight files), static ones included, is Killed in the by-hand `ignoreStatic: false` run.

## Measured facts for later plans

### Guts (every one: the tree identical to HEAD after it)

| Gut | Turned red | Others it failed |
| --- | ---------- | ---------------- |
| lookup-unshared | core SA1; devtools W1, W0, W7, WU | core SA2, SA4; devtools RF, RS |
| lookup-shared-scoping | core SG (as D-11's correction says, SA1..SA4, SR1 and devtools W*, RF, RS stay green) | core "each colliding-looking pair answers only its own row" |
| missing-id-skipped | core SA1, SA3; devtools W0, W7, WU | none |
| signature-refusal-as-unmet | core SA2, SA4; devtools RF, RS | none |
| signature-member-unchecked | core SR1, SA4; devtools RS | none |
| signature-failures-widened | tstyche (PS, 1 failed); typecheck exit 2 naming `Remedies.ts(585,80)` | none |
| http-signature-member-projected | http HP1 (only after the row was strengthened) | none |
| acted-lookup-unshared | core AA1, AA2, AA3; devtools W1, W0, W7, WU, RF, RS | none |
| acted-any-as-resource | core AA1; devtools W1 | none |
| acted-unknown-added | tstyche (PA, 1 failed in each of its two passes) | none |
| history-member-unchecked | core HR2, AA3 | none |
| history-refusal-as-unacted | core HR1, HR2, HR3, HR4, AA2, AA3; devtools RF, RS | none |
| http-history-member-projected | http HP2 | none |
| remedy-missing-id-met | devtools W0, W7, WU, RD | none |
| remedy-row-from-site | devtools W1, RA | "offers the signature the policy names, built from its node", "offers a signature when the fixtures hold a different one" |
| remedy-refusal-text-dropped | devtools RF, RS | none |
| remedy-acted-triple | devtools W1 (2), W0 (4), W7 (4), WU (4), RF, RS | none |
| custom-cell-copied | devtools ID | none |
| overview-row-deleted | api-surface exit 1 naming `signatureAnswerFromSignatures` | none |

### Mutation close (head `7fe825414c699d9f2e52c52d58ca20d7750dfbec`; first close was `0bdfe042`, re-measured after the http row)

| File | Base | Close | Ignored base to close |
| ---- | ---- | ----- | --------------------- |
| core `SignatureHistory.ts` | 71/72 | 87/88 | 36 to 36 |
| core `SignatureMatch.ts` | 13/13 | 14/14 | 1 to 2 |
| core `PortAccess.ts` | 47/47 | 46/46 | 17 to 17 |
| core `DecisionHistory.ts` | 32/32 | 52/52 | 41 to 41 |
| core `Errors.ts` | 1/1 | 1/1 | 35 to 35 |
| devtools `Remedies.ts` | 297/297 | 277/277 | 48 to 54 |
| devtools `SimulationFields.ts` | 190/190 | 190/190 | 108 to 108 |
| http `QadiHttpError.ts` | 26/26 | 34/34 | 45 to 45 |

Stryker final scores (close): core 99.50, devtools 100.00, http 100.00. By hand (`ignoreStatic: false`): core 98.15, devtools 100.00, http 100.00.

### By-hand static mutants by file:line

Every mutant on a written line was Killed; the full per-mutant table (file:line, mutator, replacement, status) is under `## Static mutants run by hand` in the evidence. Written-line mutants per file: `SignatureHistory.ts` 25, `SignatureMatch.ts` 2, `PortAccess.ts` 0, `DecisionHistory.ts` 32, `Errors.ts` 0, `Remedies.ts` 63, `SimulationFields.ts` 3, `QadiHttpError.ts` 18 (all Killed). No Timeout and no RuntimeError sits on a written line. Fifteen non-Killed by-hand mutants exist on lines the phase did not write, all of a kind the base already held: `DecisionHistory.ts` 63, 100, 112 (Survived), 172, 199, 211, 231 (RuntimeError); `SignatureHistory.ts` 94, 135, 362 (Survived), 238, 260, 287 (RuntimeError); `QadiHttpError.ts` 177, 251 (RuntimeError).

`EXAMINED` (one line): `SignatureMatch.ts` `ArrowFunction () => undefined` 1 (line 39); `Remedies.ts` `StringLiteral ""` 1 (439), `ObjectLiteral {}` 1 (489), `ArrowFunction () => undefined` 4 (559, 580, 608, 620); each Killed by hand on its own line. Self-test still `self-test: 38 passed`.

### The base survivor

`SignatureHistory.ts:366` (`ConditionalExpression -> false`) is the file's one survivor, now at line 362. It is equivalent: `makeResourceId` is `Brand.nominal`, the identity, so `makeResourceId(undefined)` is `undefined`, the true branch's value. Explained in the evidence, not removed; not a line the phase wrote.

### Deleted code

`compare` found no new mutant from the lines 76-04 deleted from `DecisionHistory.ts`; its score rose (32/32 to 52/52), so the removed-mutant rule is not exercised for it. The base record keeps only counts, open and Ignored mutants (its Killed mutants are not retained), so the evidence lists the one Ignored base mutant on a removed line (225) and the per-file counts of Ignored base mutants on removed lines (SignatureHistory 0, SignatureMatch 0, PortAccess 0, DecisionHistory 1, Errors 0, Remedies 4, SimulationFields 3, QadiHttpError 4). `Remedies.ts` (297 to 277) and `PortAccess.ts` (47 to 46) lost valid mutants with the code that held them and neither score fell.

### Rows added

- `QadiHttpError.test.ts`: two assertions each added inside the HP1 and HP2 rows (`"subjectId" in …` and `"event" in …` are false, for the projection and the encoded body), and one new row, `DecisionHistoryUnavailable's projection and response body carry the event when the error had one`, which killed the two `QadiHttpError.ts:283` survivors of the first close.

### Close head and checks

Close head `7fe825414c699d9f2e52c52d58ca20d7750dfbec`; `git diff --quiet 7fe82541 HEAD -- packages` holds. House-style 584 files clean; agreement check `3 frozen and 3 append-only file(s) hold the statements of 22d5b10c`; http project 310 passed.

## Task Commits

1. **Strengthen the two history response-body rows** (found by Task 1's http gut) - `e73b71a3` (test) - `QadiHttpError.test.ts`.
2. **Task 1 (tracer): each signature rule red once** - `2bdb693d` (docs) - `76-RED-EVIDENCE.md`.
3. **Task 2: each acted, remedy and record rule red once** - `0bdfe042` (docs) - `76-RED-EVIDENCE.md`.
4. **Drop-closing row for the event** - `7fe82541` (test) - `QadiHttpError.test.ts`.
5. **Task 3: the mutation close** - `525f46d8` (docs) - `76-mutation-close.json`, `76-mutation.mjs`, `76-RED-EVIDENCE.md`.

Each task's `<verify>` was extracted from the plan and run unchanged after its commit (`each signature rule seen red`, `each acted, remedy and record rule seen red`, `mutation close compared`).

## Deviations from Plan

**1. [Rule 1 - Bug, a test too weak for its gut] The two history response-body rows**
- **Found during:** Task 1, `http-signature-member-projected`.
- **Issue:** with HP1 and HP2 as 76-03 and 76-04 wrote them, the gut (an unconditional `subjectId: error.subjectId`) passed all 54 tests, because `toEqual` reads a member stated `undefined` as absent.
- **Fix:** an added `"<member>" in …` is false assertion for the projection and the encoded body in each row, added lines only, committed alone (`e73b71a3`); `start-76-06` was moved to that commit so Task 1's "no gut committed" check measures from it. Both http guts were then run on the strengthened rows.
- **Files modified:** `packages/http/test/QadiHttpError.test.ts`.

**2. [Rule 2 - a survivor the close showed] `QadiHttpError.ts:283`**
- **Found during:** Task 3, first close.
- **Issue:** two new survivors on the `event` conditional spread: no row projected an error that carries an event.
- **Fix:** one row appended, building the error through `decisionHistoryPort.failure` so `PORT_DOUBLE_BUDGET` stays at 12 (a first draft with `new DecisionHistoryUnavailable(…)` failed house-style at once and was changed before commit); every group re-measured with `record close core --restart` and re-run by hand (`7fe82541`).

**3. [Verification-only] Tasks 1 and 2 verifies read `git diff "$P" HEAD -- packages`**
- Both pass as written on their own commits. After Task 3's drop-closing test commit they report `a gut was committed` against HEAD, by construction (a `packages` change exists after their baseline). Run with `HEAD` replaced by each task's own evidence commit in that one clause, both pass.

**4. [Verification-only] the plan-head ledger** did not exist; `plan_head_before` is the HEAD recorded at the start (`3bf6f80f`), and `git rev-list --count 3bf6f80f..HEAD` reads 5 before this summary.

**5. [Reported, not a gap] The base's Killed mutants on deleted lines are not recoverable**: the base record retains counts, open and Ignored mutants only, and the base Stryker report was overwritten by the close runs. The evidence lists what the record holds and says so; no score fell on those files.

**Total deviations:** 2 auto-fixed (one Rule 1, one Rule 2), 3 verification-only or reported. **Impact:** two http rows strengthened and one added; no source file changed, no suppression added, nothing re-baselined.

## Known Stubs

None.

## Threat Flags

None. T-76-15 and T-76-16 are mitigated as the plan states: each required title is read from a JSON report by file and exact title, and the close is one head with every written-line mutant checked by file and line.

## Issues Encountered

None beyond the deviations above.

## Next Phase Readiness

76-07 can read `76-mutation-close.json` (head `7fe82541`) as the close; `packages/` must not change again before it, or every group is re-measured with `record close <group> --restart`.

## Self-Check: PASSED

Commits `e73b71a3`, `2bdb693d`, `0bdfe042`, `7fe82541`, `525f46d8` are ancestors of HEAD; `76-mutation-close.json`, `76-mutation.mjs` and `76-RED-EVIDENCE.md` exist; the three task verifies pass on HEAD (Tasks 1 and 2 with the clause noted in deviation 3); the agreement check passes; `compare` prints its success line.
