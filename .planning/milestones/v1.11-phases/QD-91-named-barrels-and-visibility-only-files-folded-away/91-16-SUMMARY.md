---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 16
subsystem: spec
tags: [adr, named-barrel, amendments, traceability, planning-record]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the named barrels (91-09), the folds (91-10 to 91-13), the spike, fold, barrel and surface records, the named-barrel rule (91-15)
provides:
  - ADR-QD-204 at Revision 1.0, indexed and traced, with a "What enforces it" section that names commands only
  - dated amendments to ADR-QD-037 (1.8), ADR-QD-047 (1.25) and ADR-QD-099 (1.3)
  - the planning record without the Out of Scope line the folds supersede
affects: [91-17 (behaviours, invariants, overview, urs, purpose; extends the CCR-QD-483 row and the ADR-QD-204 traceability row), 91-18 (decision notes, changesets), 91-21 (close runs records --close)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 5525ee8d247545eca17205e0b99e2bca6bdce439
plan_head_after: dde9c676cbd0f897d7bb9fd670ae523ad91b1d59
commits: 5

actuals:
  tokens: 9500
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "an amendment is a `> **Amended (<date>, ADR, CCR): title.**` block placed after every line that still names the thing it renames, so the record check reads the old name as history"

key-files:
  created:
    - spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md
  modified:
    - spec/decisions/index.yaml
    - spec/README.md
    - spec/traceability.md
    - spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/099-entry-points-are-a-closed-list.md
    - .planning/PROJECT.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-earlier-checks.mjs

key-decisions:
  - "The ADR names the six fold commits by eight-hex SHA from `git log` (136830bf, 92096e06, 45e366ac, 8eadbc55, 0d8c82e8, b06f18ce) and the ten spike candidates by id, with each candidate's measured madge and tsc verdict"
  - "ADR-QD-037 lists no cycle-breaking files, so its amendment names the remaining ones from the leaf headers (PortSpanEncode, PortKey, SinkWire, JsonRefusal, SinkRecordFields in core; QuestionBook, MissingQadiProviderError in react)"

requirements-completed: []

duration: 75min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 16: Record the named barrels decision Summary

**ADR-QD-204 states the barrel rule, the home rule, the ten-candidate fold verdict table with each fold's commit, the structural `HydrationTarget`, the `EvaluationSpan.ts` verdict (not folded), the surface baseline (948 over 10 entries, `gate13: 943`) and the escape check, and ADR-QD-037, 047 and 099 each carry the dated amendment that follows from it.**

## Accomplishments

- Decision (`6bda9c04`): `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md` at Revision 1.0 (Status "Accepted — amends ADR-QD-037, ADR-QD-047 and ADR-QD-099"), its `spec/decisions/index.yaml` entry, its `spec/traceability.md` row (after ADR-QD-203's), rows for the three `surface.test.ts` files and `HydrationTarget.tst.ts`, a tool cell naming `scripts/surface-diff.mjs`, and the `named-barrel` rename at the ADR-QD-099 row. `spec/traceability.md` 1.335 to 1.336 once; `spec/README.md` stays at 1.417 and its CCR-QD-483 row grows in place (it now names `spec/roadmap.md` 1.35 and `spec/process/definitions-of-done.md` 1.21 as well as the new documents).
- Amendments (`feb8264e`): ADR-QD-037 1.7 to 1.8 (the cycle-breakers that remain, the five folded, the measured verdicts, the removed out-of-scope line), ADR-QD-047 1.24 to 1.25 (the named-barrel form is the rule for five barrels, the three-edit rule, the rule's new name), ADR-QD-099 1.2 to 1.3 (the form covers core, react and audit, and a part-public module's other names are package-private). Each Status and each index status names ADR-QD-204. The old rule name stays in the earlier amendment text (history) and in none of the new text.
- Planning record (`5ab977e5`): `.planning/PROJECT.md` loses the "Splitting the Port* family files" line and the provider-order Known Issue gains `(re-run in Phase 91 through the earlier-phase checks)`.

## Task Commits

1. Task 1: `6bda9c04` `docs(91-16): record the named barrels decision` (four paths); `91-check.mjs commit` accepts it.
2. Task 2: `feb8264e` `docs(91-16): amend the cycle, devtools-model and entry-points decisions` (five paths); `91-check.mjs commit` accepts it.
3. Task 3: `5ab977e5` `docs(91-16): drop the superseded out-of-scope line` (`.planning/PROJECT.md` only); `91-check.mjs commit` accepts it.
4. Off-table: `8b5fac85` `fix(91-16): ledger the earlier close that pins the devtools-model decision's revision` (`91-earlier-checks.mjs` only).
5. Off-table: `dde9c676` `fix(91-16): word the decision's enforcement section as the record check reads it` (the ADR only).

## Checks run

- `pnpm spec:verify:strict` (21 pass, 0 fail), `node scripts/spec-revise.mjs --check`, `node scripts/check-doc-examples.mjs` (122 blocks compile), `91-check.mjs scan-ids`, `scan-forbidden`, `trailers` (56 commits, each with the one trailer), `records` and `rule` exit 0. `rule` prints `the named-barrel rule governs the five barrels and no live old rule name remains`.
- `91-check.mjs records --close` exits non-zero by design at this plan: every remaining reason is a record a later plan writes (the BEH-QD-791 to BEH-QD-795 and INV-QD-427 and INV-QD-428 headings and traceability rows, the overview cells, the notes on nine decisions, the `urs.md` and `17-purpose.md` revisions, the `09-react.md` token in the CCR row, the PROJECT.md IN-02 line, AGENTS.md section 16's wording, the `RegistryLease.ts` header). None names the ADR, its index entry, its Status, its Change History, its "What enforces it" section, the ten spike ids, the six SHAs, the three amendments or the three index statuses.
- `91-earlier-checks.mjs`: exit 0, `87 runs, all match their rows`, after the ledger fix below. Before it, the run after the amendments commit failed on one row: `87-check.mjs records --close: expected exit 0, got exit 1: ADR-QD-047 is not at Revision 1.24`. The prediction the brief gave (the decision subject moves the traceability line of the 88, 89 and 90 closes) held and matched.

## Deviations from Plan

### Plan defects

**1. The earlier-phase ledger had no row for the amendments commit.** The plan's verification says `91-earlier-checks.mjs` exits 0, and the ledger predicted only the traceability line moving. Phase 87's `records --close` pins ADR-QD-047 at its own Revision 1.24, so the amendment this plan is required to make (one minor above `phase_base`) is a finding no commit subject explained. Before: `87-check.mjs records --close` was a fixed row printing the clean line. After: a computed row `close87` whose only line, `ADR-QD-047 is not at Revision 1.24`, appears once the subject `docs(91-16): amend the cycle, devtools-model and entry-points decisions` exists (that subject is already in the table of `91-01-PLAN.md`), the subject added to `SUBJECT` and `MOVES_BY_SUBJECT`, and the two self-test cases that count computed rows and subjects (the computed-rows list, the subject count 12 to 13) and the "a close passes in each of its states" case extended to 87 and the new subject. The self-test passes (75) and no check is weakened: the row still fails in both directions when the subject and the line disagree. The ledger edit is an off-table commit (`8b5fac85`), the same course the earlier `1bc8e418` took. Later plans that amend or note decisions an earlier phase's close pins (91-18's notes on nine decisions) may need the same.

**2. "What enforces it" had to carry two literal words.** `records --close` requires the exact text ``in `pnpm check` `` and `phase-local` in that section; the first draft capitalised both at the start of a sentence. Reworded in place (`dde9c676`), ADR still at 1.0.

### Choices the plan left open (autonomous, most complete option)

**3. The ADR-QD-037 amendment names the remaining cycle-breakers from the leaf headers, not from the ADR.** The plan says "every other file the ADR lists that still exists, read from the ADR", but ADR-QD-037 lists none (it lists test files). The amendment names the seven the plan's list and each file's own header give (`PortSpanEncode.ts`, `PortKey.ts`, `SinkWire.ts`, `JsonRefusal.ts`, `SinkRecordFields.ts`, `QuestionBook.ts`, `MissingQadiProviderError.ts`), each for the reason its header states, and records that the five folded files were not cycle-breakers but files that kept a name public.

**4. Amendment placement.** ADR-QD-047's amendment goes at the end of the file (the form its twenty-two earlier amendments take) and ADR-QD-099's right after the 2026-10-08 section that states the form and before the later amendment, both after every line that still names the old rule, because the rule check reads an old name after an amendment as live. ADR-QD-099's Status row, which lacked its 2026-11-19 amendment, now names it too.

**5. The new ADR's text names no gate by number, no decision, plan or phase id and no phase-relative wording**, and does not use the old rule name in an amendment or the traceability row; it names it once in the ADR as the rule `@qadi/devtools`' two barrels had.

**Total deviations:** 2 plan defects, 3 open choices. **Impact:** one extra ledger commit and one wording commit; no check weakened.

## Known Stubs

None.

## Threat Flags

None. T-91-32 (a fold verdict or an enforcement claim with no evidence) is mitigated: the ADR cites each candidate's verdict and each fold's short SHA, names commands and no gate numbers, and `records --close` checks every named item (its remaining findings are later plans' records).

## Self-Check: PASSED

- `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md` exists at Revision 1.0; `/usr/bin/grep -nE 'gate\s+[0-9]'` finds no text in its "What enforces it" section; it names the ten candidate ids, `136830bf`, `92096e06`, `45e366ac`, `8eadbc55`, `0d8c82e8`, `b06f18ce`, `HydrationTarget`, `EvaluationSpan.ts`, `not folded`, `named-barrel`, `[named-barrel-self-test]`, `surface:self-test` and `gate13:`.
- `spec/decisions/index.yaml` holds the ADR-QD-204 entry and names it in the 037, 047 and 099 statuses; `spec/traceability.md` (1.336, one above `phase_base`) holds the ADR row, the four test rows and the tool cell; `/usr/bin/grep -c devtools-named-barrel spec/traceability.md` is 0; 037, 047 and 099 are each one minor above their `phase_base` revision.
- `/usr/bin/grep -c '^- Splitting the Port\* family files' .planning/PROJECT.md` is 0 and the provider-order line holds `re-run in Phase 91`.
- Commits `6bda9c04`, `feb8264e`, `5ab977e5`, `8b5fac85` and `dde9c676` are ancestors of HEAD, each with the one trailer.
