---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 17
subsystem: spec
tags: [behaviours, invariants, traceability, overview, named-barrel]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the named barrels (91-09), the folds (91-10 to 91-13), ADR-QD-204 and the CCR-QD-483 row (91-16)
provides:
  - BEH-QD-791 to BEH-QD-795 and INV-QD-427 and INV-QD-428, pinned and traced
  - present-tense mentions of the five deleted files fixed to the module that declares each name
  - the overview's Source cells for the folded names at their new homes, and the Entry points sentence
affects: [91-18 (citations, decision notes, changesets), 91-19 (stale sweep), 91-20 (ledger reconcile), 91-21 (close)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: ab7225eb6715b63a25ca1e14f4fab7ca5f0a539c
plan_head_after: e1e46d456c918b86ab2cac7815b4ff4b5f78b5d1
commits: 3

actuals:
  tokens: 55000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a records judge reads an overview row by its first cell naming the name alone or among others, so a multi-name row needs no split"

key-files:
  created: []
  modified:
    - spec/behaviors/30-port-calls.md
    - spec/behaviors/19-hydration.md
    - spec/behaviors/09-react.md
    - spec/behaviors/33-audit-pipeline.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - spec/overview.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-check.mjs

key-decisions:
  - "BEH-QD-795 lives in 09-react.md (recorded in the CCR-QD-483 row): the document already states the react barrel's requirement, that the barrel carries no use client directive, and holds the provider"
  - "A present-tense mention of a deleted file in a document this plan bumps is fixed in that document's one revision here; a past-tense mention is history and stays"
  - "The overview's DecisionEntry stays in the one row of the four payload names, whose Source cell starts with HydrationEngine.ts and says DecisionEntry is declared in HydrationEvent.ts: the plan adds no row"

requirements-completed: []

duration: 70min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 17: State the folded behaviours and name each export at its new home Summary

**Five behaviours (BEH-QD-791 to 795) and two invariants (INV-QD-427, INV-QD-428) state, pin and trace the folds and the named barrels; every present-tense mention of a deleted file in the bumped documents names the declaring module; and the overview's Source cells for the folded names start with their new homes with no row added or removed (`node scripts/check-api-surface.mjs` prints 943, the `gate13:` figure).**

## Accomplishments

- Behaviours and invariants (`a2ddaa5e`), each document bumped exactly once: `spec/behaviors/30-port-calls.md` 1.26 to 1.27 (BEH-QD-791), `19-hydration.md` 1.30 to 1.31 (BEH-QD-792), `09-react.md` 3.23 to 3.24 (BEH-QD-793 and BEH-QD-795), `33-audit-pipeline.md` 1.33 to 1.34 (BEH-QD-794), `spec/invariants.md` 1.235 to 1.236 (INV-QD-427 and INV-QD-428). Each BEH has a Decision line naming ADR-QD-204 and the decision it touches, an Invariant line, `REQUIREMENT:` lines and a Pinned by paragraph with titles copied exactly from the test files; INV-QD-427 links `#inv-qd-027-` and names the three `surface.test.ts`, `node scripts/surface-diff.mjs`, `node scripts/check-api-surface.mjs` and `node scripts/check-package-install.mjs` check 3c; INV-QD-428 names `PortSpanEncode.ts`, `PortKey.ts` (and `SinkWire.ts`, `JsonRefusal.ts`, `SinkRecordFields.ts`, `QuestionBook.ts`, `MissingQadiProviderError.ts`) as the remaining cycle-breakers, `pnpm circular`, gate 14 (`scripts/check-package-install.mjs`, check 3b) and the `named-barrel` rule.
- Traceability (same commit, 1.336 amended in place): a "Named barrels and the visibility-only files folded away (ARCH-138, ADR-QD-204), behaviour by behaviour:" section with the `Behavior | Title | Source module | Test` rows for BEH-QD-791 to 795; the INV-QD-427 and INV-QD-428 rows; the four per-document rows (09, 19, 30, 33) gain the new ids and the declaring modules; the ADR-QD-204 row links the five behaviours and two invariants; the test-file rows of the three `surface.test.ts` files and `HydrationTarget.tst.ts` carry the new ids, and so do `PortSpan.test.ts`, `Hydration.test.ts`, `GateRegistry.store.test.ts`, `DeveloperSignalReporters.test.tsx` and `SequenceIntegrity.test.ts`.
- Overview (`e1e46d45`), `spec/overview.md` 1.147 to 1.148: the Source cells of `decodePortSpan` (`PortSpanEncode.ts`), `makeGateRegistry`, `GateRegistry`/`GateRegistryOptions` and the gate types (`GateWriter.ts`), `dehydrateDecisions`/`hydrateDecisions` and the payload and option types (`HydrationEngine.ts`), the seeded names and disclosures (`SeededDecision.ts`), `HydrationDrop`/`HydrationDropReporter` (`DeveloperSignals.ts`) and the two audit sequence rows (`ArchiveFacts.ts`); the "re-exported from" kind cells of the gate and drop rows drop it; the Entry points section says a part-public module's other names are package-private. `spec/README.md` stays at 1.417; the CCR-QD-483 row grew in place with the five behaviour and invariant revisions, the overview revision, and why BEH-QD-795 is in `09-react.md`. No id was left unused.

## Task Commits

1. Task 1: `a2ddaa5e` `docs(91-17): state the folded behaviours and the surface invariants` (the seven paths); `91-check.mjs commit` accepts it.
2. Task 2: `e1e46d45` `docs(91-17): name each folded export at its new home` (`spec/overview.md`, `spec/README.md`); `91-check.mjs commit` accepts it.
3. Off-table: `685e7b4d` `fix(91-17): match an overview row that lists the name among others` (`91-check.mjs` only).

## Checks run

- `pnpm spec:verify:strict` (21 pass, 0 fail), `node scripts/spec-revise.mjs --check`, `node scripts/check-doc-examples.mjs` (122 blocks compile), `node scripts/check-api-surface.mjs` (`api-surface: 943 export(s) documented across 9 package(s)`, equal to the baseline's `gate13: 943`), `node scripts/check-dod-table.mjs`, `91-check.mjs scan-ids`, `scan-forbidden`, `trailers` (61 commits, each with the one trailer), `records` all exit 0. A scripted anchor check found every new `#beh-qd-79x`, `#inv-qd-42x` link resolving.
- `91-check.mjs records --close` is expected to exit non-zero at this plan; after the overview commit none of its remaining reasons names a behaviour, an invariant, a traceability row, the CCR row or the overview (what remains is later plans' records: the notes on the decisions, `urs.md` and `17-purpose.md`, PROJECT.md IN-02, AGENTS.md section 16's wording, the `RegistryLease.ts` header). `91-check.mjs --self-test`: 474 passed.
- `91-earlier-checks.mjs`: exit 0, `87 runs, all match their rows`, with no ledger change needed. The predictions held: `docs(91-17): state the folded behaviours and the surface invariants` moved the records-close lines of the 88, 89 and 90 checks, and `docs(91-17): name each folded export at its new home` moved the 90 check's; each row matched on the run after the second commit, and no ledger row was added.

## Deviations from Plan

### Plan defects

**1. The records judge could not read a multi-name overview row.** `91-check.mjs records` required a row whose first cell is exactly `` `dehydrateDecisions` ``, but the overview's one row for it is `` `dehydrateDecisions`, `hydrateDecisions` ``, and the plan says no row is added or removed. Before: `overviewRows` filtered `l.startsWith("| \`name\` |")`. After: it filters rows whose first cell lists the name alone or among others (`(l.split("|")[1] ?? "").split(",").some((cell) => cell.trim() === name)`). The planted overview in the self-test now lists `dehydrateDecisions` beside `hydrateDecisions`, and a new self-test row ("a name that only another row's description holds") plants a row that mentions `makeGateRegistry` only in a description and requires "has no row for makeGateRegistry". The judge was seen failing on the real overview first (`spec/overview.md has no row for dehydrateDecisions`). No check is weakened. Off-table commit `685e7b4d`.

### Choices the plan left open (autonomous, most complete option)

**2. Two present-tense mentions the plan's list did not name were fixed in the same revision.** `spec/traceability.md` row 61 (`packages/react/src/Hydration.ts` as a source of the hydration behaviours) and row 76 (`PortInterpreter` in the brace list of the remote ports row). `spec/traceability.md:254`, `257` and `366` are live names of test files and modules that exist (`Hydration.tst.ts`, `HydrationEngine.ts`), so they stayed.

**3. The `PortInterpreter` overview row called its set of three a pair.** It read "the closed `evaluate` / `toPredicate` pair" beside the three-member union it had just stated. The row is edited for its Source cell, so the clause now says "the closed set `qadi.interpreter` carries".

**4. The one payload-type row keeps `DecisionEntry`.** The plan wants the cell of `DecisionEntry` to start with `HydrationEvent.ts`, but the overview lists it in one row with the other three payload names and adds no row. The row starts with `HydrationEngine.ts` (where three of its four names are declared) and says `DecisionEntry` is declared in `HydrationEvent.ts`.

**5. BEH-QD-795 names `QadiProvider` beside `useQadiContext`.** `09-react.md` holds neither name in a requirement today; the behaviour states that a consumer reaches every name the root lists, those two included, and its pin is the react `surface.test.ts` test titled "reaches useQadiContext from the package root".

**6. The disclaimer of BEH-QD-794 has no test.** No test reads a doc comment, so its Pinned by paragraph names the sequence tests and the surface test for the names and says the disclaimer is held by the four documents that cite it and by review.

### History kept

- `spec/behaviors/19-hydration.md:930` ("had named `Hydration.ts` as the one recursive decode boundary still missing the guard") is past tense and stays.
- `spec/behaviors/25-inspection.md:991` (`GateRegistry.ts` "was a module-scope map") is past tense, in a document this plan does not revise; it is for the sweep's record.
- `spec/README.md` rows of earlier change requests and the ADR-QD-204 traceability row name the deleted files as history.

**Total deviations:** 1 plan defect, 5 open choices. **Impact:** one extra commit; no check weakened.

## Known Stubs

None.

## Threat Flags

None. T-91-33 (a behaviour stated without a pinning test) is mitigated: each of the five behaviours names existing test files with exact titles, `records` checks the paths, and `spec:verify:strict` checks the cited ones.

## Self-Check: PASSED

- `## BEH-QD-791:` to `## BEH-QD-795:` each appear once (`30-port-calls.md`, `19-hydration.md`, `09-react.md` twice, `33-audit-pipeline.md`); `## INV-QD-427:` links `#inv-qd-027-the-published-package-decides-what-the-sources-decide`; `## INV-QD-428:` names `PortSpanEncode.ts`, `PortKey.ts` and `pnpm circular`.
- The five documents and `spec/overview.md` are each exactly one minor above their `phase_base` revision (1.27, 1.31, 3.24, 1.34, 1.236, 1.148); `spec/traceability.md` (1.336) and `spec/README.md` (1.417) keep this phase's earlier bump.
- `spec/overview.md` names no deleted file outside its Change History, the folded rows' Source cells start with their new homes, its Entry points section holds `package-private`, and no row was added or removed.
- Commits `a2ddaa5e`, `685e7b4d` and `e1e46d45` are ancestors of HEAD, each with the one trailer.
