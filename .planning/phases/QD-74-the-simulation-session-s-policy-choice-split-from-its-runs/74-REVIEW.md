---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
reviewed: 2026-11-23T06:01:47Z
depth: standard
iteration: 3
files_reviewed: 25
files_reviewed_list:
  - packages/devtools/src/model/SeededChoice.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/model/HeldChoice.ts
  - packages/devtools/src/index.ts
  - packages/devtools/test/model/SeededChoice.test.ts
  - packages/devtools/test/model/SeededChoice.tst.ts
  - packages/devtools/test/model/SimulationSession.test.ts
  - packages/devtools/test/model/SimulationSession.runs.test.ts
  - packages/devtools/test/model/SimulationSession.characterisation.test.ts
  - packages/devtools/test/simulationFixtures.ts
  - packages/devtools/test/react/Simulator.test.tsx
  - packages/devtools/test/react/useSimulationSession.test.tsx
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs
  - spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md
  - spec/decisions/index.yaml
  - spec/behaviors/29-devtools-simulator.md
  - spec/behaviors/28-devtools-screens.md
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
  - spec/README.md
  - AGENTS.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-CONTEXT.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW.iter2.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW-FIX.md
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
  necessity: 0
status: issues_found
---

# Phase 74: Code Review Report (iteration 3)

**Reviewed:** 2026-11-23T06:01:47Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

I re-reviewed the phase after the iteration-2 fixes (`af19ea52..b41eb85d`), against the full phase diff
(`b22d97f9..HEAD`). No source file changed in iteration 2. The edits were to tests, the fixtures, the check
script and the spec.

**What I checked and found sound:**

- **IN-01's edits to `SimulationSession.test.ts`.**
  - No title changed.
  - No expected value changed.
  - None of the three rows that now read the shared `orphan` reads its evaluation id. Those rows were `ev-9` twice and `ev-late`.
  - The `seeding` row's asserted fields are exactly `rowRead`'s.
  - The renamed `orphaned` leaves no local `orphan`, `rowRead` or `seed` shadowing an import.
  - The six affected suites pass (186 tests).
- **IN-02 and IN-03 are applied as described.** Every exported fixture helper has two readers, or one reader and
  a caller in the fixtures (`settled`, under `ran`).
- **The check's hardened rules hold for the classes the last pass found, and for two more.** I ran a scratch copy
  of the check that reads a modified characterisation or fixtures file. Each of these edits fails, with the right
  message:
  - a declaration inside a `describe`;
  - a top-level `beforeEach`;
  - a changed `sighting`;
  - a re-pointed named import;
  - a changed default parameter (`kind = "Sweep"` in `startRun` and `ran`);
  - a re-ordered `describe`, with `the ports` moved before `the rail`;
  - a fixture that declares `policyLabel` instead of importing it.
- **On HEAD, the check passes.** It prints 35 rows and 29 statements, and `--self-test` reports 23 passed.
- **The spec text.**
  - All 39 quoted titles exist verbatim, each in the file it is cited from. That covers BEH-QD-706 to BEH-QD-710, INV-QD-393, INV-QD-394 and ADR-QD-187's "What enforces it", with titles that wrap across lines joined.
  - The traceability rows name every cited test file.
  - CCR-QD-466's file list, braces expanded, equals `git diff --name-only b22d97f9 HEAD -- packages spec` (20 files).
  - Six of its seven cited revisions equal the headers (ADR 1.2, 28 at 1.52, 29 at 1.26, invariants 1.189, overview 1.133, traceability 1.263).
  - `spec-revise --check` passes.
- **House rules.**
  - The phase adds no `as` cast, `!`, `any`, `switch` or `Record<string, unknown>` in `packages`.
  - No added `.ts` or `.tsx` line is longer than 90 characters.
  - No shipped file has phase-relative wording.
  - The 91 to 93 character lines in ADR-QD-187 match its sibling ADRs (183 to 186), so I did not flag them.

**What remains:**

- **WR-01.** The check still passes three kinds of edit that change what a row runs. Eight of its problem messages
  have no self-test case.
- **WR-02.** CCR-QD-466 cites `spec/README.md` one revision behind its header.
- **Info.** The fix report is stale on revisions, a test shadows a fixture helper, and the simulator's React test keeps a near-copy of
  the shared `orphan`.

## Warnings

### WR-01: The characterisation check still passes import and fixture edits that change what a row runs

**File:** `.planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs:20-24,150-157,283-325`

**Issue:** The header says "every name the characterisation imports comes from the module its first commit
imported it from", and "an import, a comment and where a helper is declared may change; a row and what it runs may
not". The script supports neither claim. I ran a scratch copy that reads a modified characterisation (`HEADF`) or
fixtures file (`FIXF`). Each edit below exits 0 with "35 rows and 29 statements as at e25c8cfd":

1. **Namespace, default and side-effect imports are never read.** Lines 151-157 record only
   `importClause.namedBindings.elements`. A `NamespaceImport` has no `elements`, a default import's `importClause.name` is never read, and `import "x"` has no clause. So each of these passes:
   - `import * as TestClock from "../fakeClock.ts"` in the characterisation;
   - `import "../setup.ts"`, or `import * as Extra from "./extra.ts"`, added to the characterisation;
   - `import * as TestClock from "./fakeClock.ts"` in `simulationFixtures.ts`, where `startRun` reads it.

   The characterisation reads `Effect` and `TestClock` this way. The fixtures read `Effect`, `Layer` and `TestClock`.
2. **An import's exported name is never compared.** Only `element.name` (the local name) is keyed, and
   `element.propertyName` is ignored. Two edits that pass:
   - `counted as slow` in the characterisation's fixtures import, with `counted` still imported. Every row that
     calls `slow()` now gets a notification counter.
   - `emptyTimeline as ingestAll` in the fixtures, under the compared `entryOf`.
3. **The fixtures' other statements are never compared.** Rule (b) compares only the declarations it reaches from
   a seed. A top-level statement appended to `simulationFixtures.ts`, such as a `beforeEach(...)` or a call that mutates a
   compared helper's value, passes. The same holds for a new declaration whose initialiser does either. The
   fixtures run in the characterisation's module graph, so a hook registered there runs before its rows.

Separately, the self-test does not assert every reason the script can give. These problem messages have no case:

| Line | Message |
| ---- | ------- |
| 248 | "reviewed first text is not its first commit's" |
| 250 | "with other text than reviewed" |
| 271 | "came from … and the fixtures declare it" (moved helper) |
| 274 | "is declared here and apart in the fixtures" |
| 293 | "is not declared in the fixtures of the first commit" |
| 296 | "is no longer declared in the fixtures" |
| 315 | "came from … and the fixtures declare it" (fixture helper) |
| 323 | "is imported from … but not exported by it" |

Line 293 cannot fire in `main` at all: `BASE` is a fixed commit whose characterisation compiled against its own
fixtures.

Line 273 has a related gap. It flags a kept characterisation name that the fixtures *declare* for a moved helper, but not one the fixtures *import*.

**Fix:**
- In `readAll`, record every import form, each as a binding:
  - its local name, its exported name (`propertyName ?? name`) and its module for a named import;
  - `*` for a namespace import and `default` for a default import;
  - a side-effect import as an entry with no binding, compared as a list.
- Compare the exported name as well as the module in rule (c), and in rule (b)'s fixture-import checks.
- Compare every top-level statement of the fixtures that is not a declaration, and require that list to equal the
  first commit's (empty). Alternatively, require every new fixtures statement to be a declaration whose initialiser is a function
  or literal.
- Add one self-test case per line in the table above, asserting its exact message. Delete line 292-295's branch,
  or say in a comment that it guards only the self-test's synthetic base.
- Add one case each for a re-pointed namespace import, an aliased named import and a top-level fixtures statement.

### WR-02: CCR-QD-466 cites `spec/README.md` at Rev 1.320; the header is 1.321

**File:** `spec/README.md:8,13,403`

**Issue:** Commit `e0c6b67a` bumped `spec/README.md` to Rev 1.321 ("CCR-QD-466's row cites ADR-QD-187 at Rev 1.2
and the simulator behaviours at Rev 1.26"). It edited the row's two other citations but left the row's own
`` `spec/README.md` Rev 1.320 ``. Every earlier code-review edit to this row kept the self-citation current: the
1.317 to 1.320 entries each moved it with the edit, as CCR-QD-465 cites 1.314, its own last edit. The brief's
check that "the CCR-QD-466 row's cited revisions equal each document's header" fails on exactly this one.

**Fix:** In one `spec-revise` edit, change the row's `` `spec/README.md` Rev 1.320 `` to the revision that edit
cuts (1.322). Add a Change History entry such as "1.322 (2026-11-23): CCR-QD-466's row cites the master index at
its own revision (code review)".

## Info

### IN-01: `74-REVIEW-FIX.md` reports revisions that `e0c6b67a` superseded before the report was committed

**File:** `.planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW-FIX.md` (IN-04 "Revision" bullet, IN-05 "Revision" bullet, the "Other checks" list)

**Issue:** The report was committed after `e0c6b67a` (`b41eb85d`), but it still says:
- for IN-04, "Revision: none";
- for IN-05, "ADR-QD-187 stays at Rev 1.1 … So CCR-QD-466 still cites 'Rev 1.1 …'";
- under "Other checks", "README 1.320, ADR 1.1, … 29-devtools-simulator 1.25".

HEAD has ADR-QD-187 at Rev 1.2, `29-devtools-simulator.md` at 1.26 and `spec/README.md` at 1.321, and CCR-QD-466
cites the first two. A reader auditing the loop from the report gets the opposite of what was decided, and the
brief records that decision: every code-review spec edit is a revision.

**Fix:** Correct the two bullets and the revisions list to 1.2, 1.26 and 1.321 (1.322 after WR-02), and name `e0c6b67a` as the commit that cut them.

### IN-02: `SeededChoice.test.ts` shadows the imported fixture helper `sighting`

**File:** `packages/devtools/test/model/SeededChoice.test.ts:249`

**Issue:** Inside "each option of the menu names the sighting sightingAt reads at its position",
`const sighting = leads ? undefined : c.sightings[Number(value)];` shadows the `sighting` this file imports from
`../simulationFixtures.ts` (line 44). The row is correct. But this is the shadowing pattern the last two passes
removed from the session tests, and a later edit inside that callback that calls `sighting(policy)` would not
compile for a confusing reason.

**Fix:** Rename the local, for example `const expected = leads ? undefined : c.sightings[Number(value)];
assert.strictEqual(sightingAt(c, index), expected);`.

### IN-03: `Simulator.test.tsx` builds its own orphan row and its own `read`

**File:** `packages/devtools/test/react/Simulator.test.tsx:43,46,556`

**Issue:**
- "says a comparison is unavailable for a row that carries no decision" seeds
  `entryOf(obligationRecord({ evaluationId: "ev-9" }))`. That is the fixtures' `orphan` with another evaluation id,
  which the row never reads. The fixtures header lists this file as an importer "rather than a copy a file keeps
  beside its own tests", and iteration 2's IN-01 removed the same copy from the session tests only.
- Line 46's `const read = permission("doc", "read");` duplicates `read` from `../helpers.ts`, which line 43 already
  imports from. This predates the phase, but the phase rewrote this import block.

**Fix:**
- Import `orphan` from `../simulationFixtures.ts`, seed it, and drop `obligationRecord` from the helpers import.
- Import `read` from `../helpers.ts` and delete the local copy.

---

_Reviewed: 2026-11-23T06:01:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
