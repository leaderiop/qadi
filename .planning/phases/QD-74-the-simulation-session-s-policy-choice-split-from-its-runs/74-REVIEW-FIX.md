---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
fixed_at: 2026-11-23T06:23:02Z
review_path: .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW.md
iteration: 3
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 74: Code Review Fix Report (iteration 3)

**Fixed at:** 2026-11-23T06:23:02Z
**Source review:** .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 5 (2 warnings, 3 info; fix scope `all`)
- Fixed: 5
- Skipped: 0

`workflow.use_worktrees` is `false`, so every edit, commit and gate ran in the main checkout on `arch-wave-13`. You
can reproduce the gate numbers below from that tree.

This report replaces the iteration-2 report that was committed as `74-REVIEW-FIX.md` (`b41eb85d`). That report is
kept unchanged as `74-REVIEW-FIX.iter2.md`. Where it is out of date, see "Corrections to iteration 2's report" below.

## Fixed Issues

### WR-01: The characterisation check still passes import and fixture edits that change what a row runs

**Files modified:** `74-characterisation-check.mjs`, `74-RED-EVIDENCE.md`
**Commit:** fbed827d
**Applied fix:** The check now treats each hole as a rule, not a case.

How it reads imports:
- `readAll` reads every import form: named, namespace (`*`), default and type-only, including inline `type`
  modifiers.
- It records each binding by four things: its local name, the name it imports (`propertyName ?? name`, `*` or
  `default`), its module as a path from the repository root, and whether it imports a type.
- An import that binds no name (`import "x"`, or `import {} from "x"`) is recorded in order.
- It records the modules each file loads, meaning every import that is not `import type`.

The rules now enforced:
- **Characterisation imports.** Every binding must equal the first commit's in all four parts. The exceptions are a
  module that `IMPORT_MOVES` moves, and a moved helper, which must be imported under its own name from
  `../simulationFixtures.ts`. The imports that bind no name must be the first commit's list, in order. So an added or
  removed side-effect import fails, and so do `counted as slow`, a namespace re-point and a type-only or default
  rebinding.
- **What a compared helper reads.** This is one rule, for both moved helpers and fixture helpers. The fixtures must
  provide each name the way the first commit did:
  - an import must bind the same name of the same module, of the same kind, unless `IMPORT_MOVES` moves the module;
  - a name the first commit neither imported nor declared must still be neither (this closes shadowing a global or a
    free name);
  - a name the characterisation still declares fails however the fixtures provide it. This also covers the reviewer's
    line-273 gap, where the fixtures *import* a kept name.
- **Fixture helpers** are compared with their `export`. This absorbed the old "imported … but not exported by it"
  message, so that message is deleted.
- **Fixtures statements.** Each top-level statement must be an import or a declaration of one name: a `const`, a
  function, a type or an interface. So a `beforeEach(...)`, a mutating statement, a `let`, a class and an
  `export … from` all fail.
- **Load-time code in the fixtures.** A `const` that no rule compares must run nothing as the module loads. Its
  initialiser must be a function, a literal, a name, or an array or object literal of those.
- **Modules the fixtures load.** Every module the fixtures load must be one that the two files loaded at the first
  commit.

Messages:
- The "not declared in the fixtures of the first commit" branch is deleted. It cannot fire against the fixed `BASE`.
- The `no parse` throw is deleted for the same reason.
- The old throws for destructured and shared declarations are gone. Such a statement now fails the rules as a
  statement.
- The self-test grew from 23 cases to 49. Each asserts its exact problem list, in order.
- Every message the script can emit has at least one case. That includes the eight messages in the review's table
  that the self-test did not exercise; the deleted ones are noted above. The read rule has a case for each of its
  eight failing pairs of "was" and "now".
- I confirmed the self-test fails when a message is changed: I altered `" than reviewed"` and one case failed.

Results:
- On HEAD: `characterisation-check: 35 rows and 29 statements as at e25c8cfd; 21 helpers kept, 13 moved (KEYS,
  rowRead, orphan, carolDraft, PolicyView, policyView, listed, evictedOf, seededOf, zero, menu, seededEntry,
  evictedEntry)`, exit 0.
- `--self-test`: `self-test: 49 passed`.

What the check does not compare, by design:
- The order of the imports that bind a name. The header says so.
- The read rule matches identifiers, so a property name that equals a new top-level fixtures name fails it. This errs
  on the strict side, and nothing on HEAD trips it.

**Reviewer's probes, re-run.** I made each edit on the working tree, ran the check, and reverted with
`git checkout --`. Each exits 1 with exactly the problems shown:

| Edit | Problems reported |
| ---- | ----------------- |
| characterisation: `TestClock` imported from `../fakeClock.ts` | `` TestClock was imported as `* as TestClock from effect/testing/TestClock` and is imported as `* as TestClock from packages/devtools/test/fakeClock.ts` here `` |
| fixtures: `TestClock` imported from `./fakeClock.ts` | `` TestClock, which startRun reads, was imported as `* as TestClock from effect/testing/TestClock` and the fixtures import it as `* as TestClock from packages/devtools/test/fakeClock.ts` ``; `the fixtures load packages/devtools/test/fakeClock.ts, which neither file loaded at the first commit` |
| characterisation: `import "../setup.ts";` added | `the imports that bind no name were none and are packages/devtools/test/setup.ts here` |
| characterisation: `import * as Extra from "./extra.ts";` added | `Extra is imported here, and the first commit neither imports nor declares it` |
| fixtures: `import "./setup.ts";` added | `the fixtures load packages/devtools/test/setup.ts, which neither file loaded at the first commit` |
| characterisation: `counted as slow` in the fixtures import | `` slow was imported as `{ slow } from packages/devtools/test/simulationFixtures.ts` and is imported as `{ counted as slow } from packages/devtools/test/simulationFixtures.ts` here `` |
| fixtures: `emptyTimeline as ingestAll` | `` ingestAll, which entryOf reads, was imported as `{ ingestAll } from packages/devtools/src/model/Timeline.ts` and the fixtures import it as `{ emptyTimeline as ingestAll } from packages/devtools/src/model/Timeline.ts` `` |
| fixtures: `beforeEach(() => {});` appended | `a top-level statement of the fixtures is not an import or a declaration of one name: «beforeEach(() => {});»` |
| fixtures: `Object.assign(carolDraft, { action: "write" });` appended | `a top-level statement of the fixtures is not an import or a declaration of one name: «Object.assign(carolDraft, { action: "write" });»` |
| fixtures: `export const hook = beforeEach(() => {});` appended | `hook in the fixtures runs code as the module loads, and no first commit's text pins it` |

`74-RED-EVIDENCE.md` gains a dated section, "The characterisation check reads every import and every fixtures
statement (2026-11-23, code review, third pass)". It records the rules, the counts and the table above. No earlier
note was rewritten.

### WR-02: CCR-QD-466 cites `spec/README.md` at Rev 1.320; the header is 1.321

**Files modified:** `spec/README.md`
**Commit:** 1f4f387c
**Applied fix:**
- The row now cites `` `spec/README.md` Rev 1.322 ``.
- `spec-revise` then bumped README once, to 1.322, with the entry "CCR-QD-466's row cites the master index at its own
  revision and lists the devtools tests that now read the shared test helpers (code review)". The header and the
  row's citation agree.
- The same edit brought the row's file list up to date for IN-03's second commit. The 19 test files it touched are
  listed, and one sentence in the summary says the devtools tests read `read`, `readPolicy`, `sighting`, `entryOf`
  and `slow` from the shared test helpers.
- Checked with a script:
  - The row's file list, braces expanded, equals `git diff --name-only b22d97f9 HEAD -- packages spec` (39 files).
  - All seven cited revisions equal their headers: ADR 1.2, 28 at 1.52, 29 at 1.26, invariants 1.189, overview
    1.133, traceability 1.263 and README 1.322.

### IN-01: `74-REVIEW-FIX.md` reports revisions that `e0c6b67a` superseded before the report was committed

**Files modified:** `74-REVIEW-FIX.md` (this report, not committed by the fixer)
**Commit:** none (the orchestrator commits this report)
**Applied fix:** This report replaces the iteration-2 record, and the section below corrects it. I did not edit
`74-REVIEW-FIX.iter2.md`.

### IN-02: `SeededChoice.test.ts` shadows the imported fixture helper `sighting`

**Files modified:** `packages/devtools/test/model/SeededChoice.test.ts`
**Commit:** b89fa22f
**Applied fix:** I renamed the local in "each option of the menu names the sighting sightingAt reads at its position"
to `expected`. No title and no expected value changed.

### IN-03: `Simulator.test.tsx` builds its own orphan row and its own `read`

**Commits:** 79c78650 (the simulator test) and 3a6f18df (every other copy)

**`Simulator.test.tsx` (79c78650).**
- "says a comparison is unavailable for a row that carries no decision" now seeds the shared `orphan`.
- `read` comes from `../helpers.ts`.
- The local copies are gone, and so are the `obligationRecord` and `permission` imports.
- Both shared definitions behave identically to the copies:
  - `read` is the same `permission("doc", "read")`.
  - The orphan differs only in its evaluation id (`ev-orphan` against `ev-9`). The row never reads the id; it asserts
    only "an orphan carries no decision".

**Every other copy (3a6f18df).** I grepped `packages/devtools/test` for top-level declarations that share a name with
an export of `helpers.ts` or `simulationFixtures.ts`. I also grepped for each export's body under any name. I folded
every copy that behaves identically:

| Copy | Files | Now reads |
| ---- | ----- | --------- |
| `const read = permission("doc", "read")` | `SimulationSource`, `Simulation`, `WhatIf`, `Inspect`, `Wiring`, `ExplorerSession`, `RoleTree`, `Catalogue`, `ExplorerSessionRefusal`, `Replay` (`model/*.test.ts`); `PolicyExplorer`, `QuestionsPanel`, `DevtoolsDock`, `RoleViewer`, `WhatIfTable` (`react/*.test.tsx`) | `read` from `../helpers.ts` |
| `const canRead = hasPermission(permission("doc", "read"))` | `model/Gates.test.ts`, `react/QuestionsPanel.gates.test.tsx` | `readPolicy` from `../helpers.ts` |
| `sightingOf`, the same body as `sighting` | `model/ExplorerSessionRefusal.test.ts` | `sighting` from `../simulationFixtures.ts` |
| `entryOf` | `model/Replay.test.ts`, `react/DecisionLog.test.tsx` | `entryOf` from `../simulationFixtures.ts` |
| `slow` | `model/DockModel.test.ts` | `slow` from `../simulationFixtures.ts` |

Notes on the folds:
- Imports left unused were dropped: `permission`, `policyLabel`, `Policy`, `StoredRecord`, `emptyTimeline`,
  `ingestAll` and `AttributeResolver`, each where nothing else used it.
- The four lines the fold pushed past 90 columns are rewrapped.
- `DecisionLog`'s `entryOf` threw "expected a timeline entry" where the shared one throws "expected an entry". No
  input reaches either throw: `ingestAll` of one record always yields one entry, an orphan included. So the two
  behave identically.
- `simulationFixtures.ts`'s header now names the four tests of other modules that read it. The characterisation check
  does not compare comments, and it still passes.

Kept local, and why:
- `react/QuestionsPanel.characterisation.test.tsx` and `react/QuestionsPanel.feed.characterisation.test.tsx` keep
  their `canRead`. They are characterisations whose headers fix their statements: "names nothing the base lacks", and
  "Never edited after it is written".
- `react/QuestionsPanel.thunk.test.tsx` keeps its `canRead`. Its header says "Never weakened after its commit: the
  move makes it green unedited".
- `Gates.test.ts`'s two inline `hasPermission(permission("doc", "read"))` are not copies. They build two equal but
  separate policies on purpose.
- These differ in signature or body, so they are not copies:
  - `sighting` in `ExplorerSession.test.ts`, `PolicyExplorer.test.tsx` and `Catalogue.test.ts` (a `count` or `label`
    parameter);
  - `listed` in `NonJsonWitness.test.ts` (a `label` parameter);
  - `entryOf`, `settled` and `ran` in `DockModel.test.ts` (a `DockModel` parameter);
  - the `counted` helpers of the diagnostics tests (another subject);
  - the test-local `orphan`, `read`, `slow`, `hostile`, `guard`, `allow` and `deny` bindings inside test bodies.

Results:
- The devtools suite still holds 73 files and 1760 tests, all passing.
- No title or expected value changed.

## Corrections to iteration 2's report

The orchestrator's commit `e0c6b67a` ("docs(74): record the review's second edits to ADR-QD-187 and the simulator
behaviours") came after the iteration-2 fixer wrote its report and before that report was committed (`b41eb85d`). It
changed three things the report states otherwise:
- **IN-04's "Revision: none"** no longer holds. `spec/behaviors/29-devtools-simulator.md` went to **Rev 1.26** for
  BEH-QD-709's narrowed citation, and CCR-QD-466 cites it there.
- **IN-05's "ADR-QD-187 stays at Rev 1.1"** no longer holds. ADR-QD-187 went to **Rev 1.2** for "What enforces it"
  naming the transition pin and decision 1's no-op rows. CCR-QD-466 cites "Rev 1.2 (new at 1.0; corrected at 1.1 and
  1.2, in code review)".
- **"Other checks"** should have listed README 1.321, ADR 1.2 and 29-devtools-simulator 1.26, not README 1.320, ADR
  1.1 and 1.25. `e0c6b67a` bumped `spec/README.md` to 1.321 and left the row's own self-citation at 1.320. That is
  WR-02 above, which moved both to **1.322**.

The record of the decision is that every code-review spec edit is a revision.

## Verification

Every gate ran in the main checkout, on HEAD `1f4f387c`, one runner at a time with stdin closed:

| Gate | Result |
| ---- | ------ |
| `pnpm exec vitest run --project devtools` | 73 files, 1760 tests passed |
| `pnpm typecheck` | exit 0 |
| `pnpm test:tstyche` | exit 0; both passes, 71 files (the second: 380 passed, 2 skipped) |
| `node scripts/check-house-style.mjs` | `578 file(s) clean (3 declared switch(es), 71 type-test file(s))` |
| `node scripts/check-doc-examples.mjs` | `118 block(s) compile` |
| `node scripts/check-api-surface.mjs` | `941 export(s) documented across 9 package(s)` |
| `pnpm exec oxlint` on every touched test file and the check script | exit 0, no diagnostics |
| `node scripts/spec-revise.mjs --check` | every Revision matches its newest Change History entry |
| `74-characterisation-check.mjs` | 35 rows and 29 statements as at e25c8cfd; 21 kept, 13 moved |
| `74-characterisation-check.mjs --self-test` | 49 passed |
| `bash spec/scripts/verify-traceability.sh --strict` | `PASS: 21   FAIL: 0   SKIP: 0`, exit 0 |

Other checks:
- No added line in `packages` is longer than 90 characters (`perl -CS -ne 'print if length > 91'` on added diff
  lines).
- CCR-QD-466's file list equals `git diff --name-only b22d97f9 HEAD -- packages spec` (39 files). Its cited revisions
  equal the headers: ADR 1.2, 28-devtools-screens 1.52, 29-devtools-simulator 1.26, invariants 1.189, overview 1.133,
  traceability 1.263, README 1.322.
- I did not touch the characterisation, `74-mutation-base.json`, `74-mutation.mjs` or `74-mutation-close.json`.

---

_Fixed: 2026-11-23T06:23:02Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
