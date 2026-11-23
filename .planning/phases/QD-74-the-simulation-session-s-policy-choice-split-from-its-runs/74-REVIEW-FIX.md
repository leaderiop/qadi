---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
fixed_at: 2026-11-23T05:52:20Z
review_path: .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW.md
iteration: 2
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 74: Code Review Fix Report (iteration 2)

**Fixed at:** 2026-11-23T05:52:20Z
**Source review:** .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 7 (2 warnings, 5 info; fix scope `all`)
- Fixed: 7
- Skipped: 0

`workflow.use_worktrees` is `false`, so every edit, commit and gate ran in the main checkout on `arch-wave-13`. You
can reproduce the gate numbers below from that tree.

## Fixed Issues

### WR-01: The type pin's traceability row still says every transition answers a seeded choice

**Files modified:** `spec/traceability.md`, `spec/README.md`
**Commit:** af19ea52
**Applied fix:**
- The `SeededChoice.tst.ts` row now ends "…the menu option shape, and what each transition answers: a `SeededChoice`
  from `withSightings` and `choose`, a `Seeding` from `seededChoice` and `seedFrom`". That is the rule as
  `SeededChoice.ts`, ADR-QD-187 decision 1 and INV-QD-393 state it.
- `spec/traceability.md` moved to Rev 1.263 through `spec-revise`. CCR-QD-466's row cites it, and `spec/README.md`
  moved to Rev 1.319 with the row (1.320 after IN-05).
- I grepped all of `spec/` and `packages/devtools` for "every transition", "answering a seeded", "returns a new
  object" and "no-op returns". No other text in the phase makes the old claim. The remaining hits are about other
  modules (the audit pipeline's `Ref.modify`, `getSnapshot` merges and `withAction`), plus `SeededChoice.ts:5`
  ("every transition and every reading is a function of plain values"), which is true.

### WR-02: The characterisation check passes edits that change what a row asserts or runs

**Files modified:** `74-characterisation-check.mjs`, `74-RED-EVIDENCE.md`
**Commit:** 59186a74
**Applied fix:** The check now also reads `simulationFixtures.ts` as `e25c8cfd` holds it. It fails unless all four
rules below hold.

- **(a) Statements.** Every top-level statement of the characterisation other than its imports matches the first
  commit's, whitespace collapsed and in order, once the 13 moved helpers are left out. There are 29. So a `describe`
  body, a helper kept in place and any new statement are compared whole. The leading header comment is not compared,
  because a statement's text starts after its leading comments. The row multiset is still compared, so a changed row
  is named.
- **(b) Fixture helpers.** Each helper the first commit imported from the fixtures (`counted`, `entryOf`, `ran`,
  `sighting`, `slow`, `startRun`) keeps its first text in the fixtures. So does each fixture helper a moved helper
  reads, and each fixture helper those read, which brings in `settled` under `ran`. Each name such a helper imports
  must come from the module it came from at the first commit. A moved helper keeps its first-commit text, or the text
  `REVIEWED` gives it. `REVIEWED` still holds exactly one entry, `PolicyView`. A moved helper may not read a name the
  characterisation still declares if the fixtures declare it separately.
- **(c) Imports.** Every name the characterisation imports keeps its first commit's module. Modules are compared as
  repository paths, so a relative specifier from the fixtures and one from the characterisation compare equal. The
  exceptions are the `IMPORT_MOVES` table, which holds exactly `PolicyChoice` and `PolicyMenu` (from
  `SimulationSession.ts` to `SeededChoice.ts`), and a moved helper, which must come from `../simulationFixtures.ts`.
  A name the characterisation no longer imports must be one a moved helper reads, and the fixtures must import it
  from the same module or as the table moves it. A newly imported name must be a moved helper. An unused `IMPORT_MOVES`
  or `REVIEWED` entry fails. Both table entries are used on HEAD: `PolicyMenu` by the characterisation's own import,
  `PolicyChoice` by the fixtures' import under `PolicyView` and `policyView`.
- The vacuous "and is declared nowhere else" clause is gone. The rule (a) comparison replaced the old "is still
  declared here, with other text" message.

The self-test now has 23 cases. Each one asserts the exact list of problem messages it expects, in order, not only
pass or fail. There is one case for each of the reviewer's three holes and a top-level `beforeEach`. Others cover a
transitively read fixture helper, a fixture import re-pointed under a compared helper, an import dropped, added or
re-pointed, a moved helper's import from the wrong module, and an unused move.

Results:
- On HEAD: `characterisation-check: 35 rows and 29 statements as at e25c8cfd; 21 helpers kept, 13 moved (KEYS,
  rowRead, orphan, carolDraft, PolicyView, policyView, listed, evictedOf, seededOf, zero, menu, seededEntry,
  evictedEntry)`, exit 0.
- `--self-test`: `self-test: 23 passed`.

I made the reviewer's three scratch edits on the working tree, ran the check on each, and reverted each with
`git checkout --`. Each exits 1, and each reports exactly one problem:

| Edit | Problem reported |
| ---- | ---------------- |
| `const listed = (value: PolicySighting, index: number) => ({ _tag: "Listed", value, index: index + 1 });` added as the first line of `describe("seeding")` | `statement 22 after the imports is not the first commit's: it had «describe("seeding", () => { it.effect("built with no seed, a session holds the h», this has «describe("seeding", () => { const listed = (value: PolicySighting, index: number»` |
| `sighting`'s `count: 1` made `count: 2` in `simulationFixtures.ts` | `sighting in the fixtures is not its first commit's text` |
| `slow` dropped from the fixtures import and imported from `./elsewhere.ts` | `slow came from ../simulationFixtures.ts and is imported from ./elsewhere.ts here` |

A fourth edit changed `settled`'s idle test (`!== "Running"` to `=== "Idle"`), which only `ran` reads. It reports
`settled in the fixtures is not its first commit's text`.

`74-RED-EVIDENCE.md` gains a dated section, "The characterisation check hardened (2026-11-23, code review, second
pass)". It records the new rules, the counts and the three edits. No earlier note was rewritten.

### IN-01: `SimulationSession.test.ts` keeps an identical copy of the fixtures' `orphan`, and a near-copy of `rowRead`

**Files modified:** `packages/devtools/test/model/SimulationSession.test.ts`
**Commit:** e517dfd3
**Applied fix:**
- The file now imports `orphan` and `rowRead` from `../simulationFixtures.ts`. The identical local `orphan` in
  "replaying a row that cannot be replayed leaves the seed as seed does" is deleted.
- Importing `orphan` at module scope would have left three older local `orphan`s shadowing it, so I removed those
  too. "says an orphan carries no decision to compare against" (`ev-9`) and "never shows a result as answering a row
  replayed while that run was starting" (`ev-late`) now read the shared row. Neither reads the row's evaluation id.
  In "is absent for an orphan, for a stale result, and before any run", the session that was named `orphan` is now
  `orphaned`, beside its sibling `decided`, and is seeded with the shared `orphan`. The file now has one orphan
  definition. `obligationRecord` is no longer imported.
- `describe("seeding")`'s local `seed` (`ev-3`) is gone, and its one row seeds `rowRead`. I did not give `rowRead` an
  `id` parameter. The one difference, the evaluation id, is read by no row, so one definition remains without one.
  `rowRead` is also a moved helper whose first-commit text the characterisation check pins, and a parameter would
  have needed a second `REVIEWED` entry, which the brief keeps at exactly `PolicyView`. Every expected value in the
  row is unchanged.
- The session tests still hold 80, all passing.

### IN-02: The fixtures' new section comment now heads `slow` and `counted`

**Files modified:** `packages/devtools/test/simulationFixtures.ts`
**Commit:** 5a9d8381
**Applied fix:** `slow` and `counted` moved back above the "Two logged rows…" section comment, right after
`sighting` and `entryOf`, which is where the first commit had them. That comment now heads only `KEYS` through
`evictedEntry`, and the run-helpers comment heads `startRun`, `settled` and `ran`. No declaration's text changed, and
the characterisation check still passes.

### IN-03: A double blank line left where `slow` was removed

**Files modified:** `packages/devtools/test/react/useSimulationSession.test.tsx`
**Commit:** 443ced73
**Applied fix:** I deleted one of the two blank lines. No touched test file has a double blank line left.

### IN-04: BEH-QD-709 cites a `withSightings` test as evidence that choosing the held policy is a no-op

**Files modified:** `spec/behaviors/29-devtools-simulator.md`
**Commits:** 95935195, c925f1a9 (rewraps the citation inside 90 columns)
**Applied fix:**
- "withSightings with the same elements in a new array returns the same choice" is dropped from BEH-QD-709's
  Pinned-by list. INV-QD-393's Enforcement still cites it, and ADR-QD-187's "What enforces it" now does too (IN-05).
- The four remaining titles are verbatim. Each one appears once, as a string literal, in its test file.
- Revision: none. `spec-revise` does not require one, and BEH-QD-709 is new at Rev 1.25 in this phase. I applied the
  same rule as for the ADR in IN-05.

### IN-05: ADR-QD-187's "What enforces it" omits the transition-signature pin and decision 1's no-op rows

**Files modified:** `spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md`,
`spec/README.md`
**Commit:** e173aea3
**Applied fix:**
- **The compiler sentence.** It now also says each transition answers what decision 1 says: a `SeededChoice` from
  `withSightings` and `choose`, and a `Seeding` from `seededChoice` and `seedFrom`. It names the pin that holds this,
  "choose and withSightings answer a SeededChoice; seededChoice and seedFrom a Seeding".
- **The tests sentence.** It now reads "decision 1's no-op rule and the rules of decisions 2 to 6". It names decision
  1's rows: "withSightings with the same elements in a new array returns the same choice", "seedFrom the row a choice
  holds answers the same choice and the row decoded" and "seedFrom(undefined) on a choice with no seed answers the
  same choice". That is the set INV-QD-393's Enforcement cites.
- **Revision.** ADR-QD-187 stays at Rev 1.1. `spec-revise --check` requires no revision for the edit, and the 1.1
  entry ("corrected in code review: what each transition answers, …") already covers it. So CCR-QD-466 still cites
  "Rev 1.1 (new at 1.0; corrected at 1.1, in code review)".
- **CCR-QD-466 summary.** The summary said "the compiler holds the union arms and the menu option shape". It now adds
  "and what each transition answers", matching the ADR. `spec/README.md` moved to Rev 1.320, and the row cites it.

## Verification

Every gate ran in the main checkout, on HEAD `c925f1a9`, one runner at a time with stdin closed:

| Gate | Result |
| ---- | ------ |
| `pnpm exec vitest run --project devtools` | 73 files, 1760 tests passed |
| `pnpm typecheck` | exit 0 |
| `pnpm test:tstyche` | both passes: 71 files passed (381 passed / 1 skipped, then 380 / 2 skipped) |
| `node scripts/check-house-style.mjs` | `578 file(s) clean (3 declared switch(es), 71 type-test file(s))` |
| `node scripts/check-doc-examples.mjs` | `118 block(s) compile` |
| `node scripts/check-api-surface.mjs` | `941 export(s) documented across 9 package(s)` |
| `pnpm exec oxlint` on the touched test files and the check script | exit 0 |
| `node scripts/spec-revise.mjs --check` | every Revision matches its newest Change History entry |
| `74-characterisation-check.mjs` | 35 rows and 29 statements as at e25c8cfd; 21 kept, 13 moved |
| `74-characterisation-check.mjs --self-test` | 23 passed |
| `bash spec/scripts/verify-traceability.sh --strict` | `PASS: 21   FAIL: 0   SKIP: 0`, exit 0 |

Other checks:
- No added line in `packages`, `spec/behaviors` or `spec/decisions` is longer than 90 characters
  (`perl -CS -ne 'print if length > 91'` on added diff lines).
- CCR-QD-466's file list still equals `git diff --name-only b22d97f9 HEAD -- packages spec` (20 files).
- Its cited revisions equal the headers: traceability 1.263, README 1.320, ADR 1.1, invariants 1.189,
  29-devtools-simulator 1.25, 28-devtools-screens 1.52, overview 1.133.

---

_Fixed: 2026-11-23T05:52:20Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
