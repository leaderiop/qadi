---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
reviewed: 2026-11-23T05:40:56Z
depth: standard
iteration: 2
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
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW.iter1.md
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW-FIX.md
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
  necessity: 0
status: issues_found
---

# Phase 74: Code Review Report (iteration 2)

**Reviewed:** 2026-11-23T05:40:56Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

I re-reviewed the phase after the iteration-1 fixes (`f99e7cc9..ded61ecf`), against the full phase diff (`b22d97f9..HEAD`).

**WR-01, the `seedFrom` no-op, is correct and changes no observable session behaviour.** I traced every case of `keeps = kept?.entry === entry && (kept?.replayed === undefined) === (replayable === undefined)`:

| Case | Result |
| ---- | ------ |
| No seed held, no entry | `keeps`. The seed stays `undefined`. `held` is re-pinned, so the constructor (`held: undefined` over a non-empty rail) still answers a new, pinned choice. |
| Held replaying row, same entry | `keeps`. `pinUnlessReplayed` answers `choice.held`, so the input choice comes back. |
| Held row after `choose` (replay dropped), same replayable entry | Not kept. A new seed restores the replay. |
| Held orphan, same entry | `keeps`. `held` is already pinned, so the input comes back. |
| Replay held but the row now non-replayable | Unreachable: a row decodes the same way every time. |
| Any other entry, or `undefined` while a seed is held | Not kept. |

So the choice comes back unchanged exactly when the seed reference and the held sighting are both unchanged. Each conjunct is load-bearing, and a row catches its mutant:

- dropping the entry test: "seedFrom another row…";
- dropping the replay-state test: the `back` half of that row;
- dropping `held === choice.held`: "with no seed, the constructor pins the head of the rail", through its `withSightings` step.

**The session is unchanged.**

- `reseed` never compares `seeding.choice` by reference. It still writes `seeding.input ?? draft` with a re-encoded text, calls `clearRun()` and publishes on every call.
- `replay` of the held row still answers the freshly decoded input.
- The `seed` guard (`entry === seededFrom(choice)`) is untouched.
- The only difference is that `snapshot.policy.policy` keeps its old object identity on a re-replay. `stale` compares it with `Equal.equals`, and nothing in `src/react` reads it by reference.

The rule's sentence is word for word the same in `SeededChoice.ts:24-27`, INV-QD-393's statement and ADR-QD-187 decision 1. The ADR places its readings sentence between the two halves. One record still has the old claim (WR-01).

**What I checked and found sound:**

- **The check script.** `74-characterisation-check.mjs` resolves `typescript/unstable/sync` against the installed TypeScript 7.0.2. It parses all three files, prints "35 rows as at e25c8cfd; 21 helpers kept, 13 moved", and its 13 self-test cases pass. `REVIEWED` is exact and minimal: one entry, `PolicyView`, and its from/to text matches.
- **The helper moves.** The 13 moved declarations are text-identical once whitespace is collapsed. The fixtures declare no `let`/`var`. The header names exactly the six importers. Every exported helper meets the header's rule of two readers, or one reader plus a caller in the fixtures.
- **The React moves.** `Simulator.test.tsx` and `useSimulationSession.test.tsx` behave as before. The five affected suites pass: 181 tests.
- **WR-09's removals.** Each survivor pins the same rule at the same or higher precision:
  - The `[1]` refusal takes the same `editResourceText` refused branch as `{oops`.
  - The kept-edit seed no-op takes the same `seededFrom` guard.
  - The four no-ops each assert snapshot identity and a count of 0 on their own.
- **WR-05.** Both rows now fail under an always-pin mutant.
- **WR-02, WR-03, WR-07, WR-08, IN-01 and IN-02** are applied as described.
- **IN-03.** The new `stale` doc is true.
- **The spec text.**
  - Every quoted title in the phase's Pinned-by and Enforcement text exists verbatim.
  - CCR-QD-466's seven cited revisions equal the document headers.
  - Its file list equals `git diff --name-only b22d97f9 HEAD -- packages spec` (20 files).
- **House rules and wording.** No phase-added `.ts`/`.tsx` line is longer than 90 characters. There is no `as`, `!`, `any`, `switch` or `Record<string, unknown>`, and no phase-relative wording in shipped files.

**What remains:**

- **WR-01.** The traceability row of the type pin still says "every transition answering a seeded choice", which is the claim WR-01 removed everywhere else.
- **WR-02.** The characterisation check misses three kinds of edit that change what a row asserts or runs. I confirmed each with a scratch copy of the script: all three exit 0.
- **Info.** Five small cleanliness items.

## Warnings

### WR-01: The type pin's traceability row still says every transition answers a seeded choice

**File:** `spec/traceability.md:583`

**Issue:** The row for `packages/devtools/test/model/SeededChoice.tst.ts` ends with "…the menu option shape and every transition answering a seeded choice". That is the false claim WR-01 corrected in `SeededChoice.ts`, ADR-QD-187 decision 1, INV-QD-393 and the pin's own title. `seededChoice` and `seedFrom` answer a `Seeding`, and the pin asserts exactly that ("choose and withSightings answer a SeededChoice; seededChoice and seedFrom a Seeding"). The fix loop never touched `spec/traceability.md`: it is still at Rev 1.262, and its last change-history entry predates the review.

**Fix:** Restate the row's tail as "…the menu option shape, and what each transition answers: a `SeededChoice` from `withSightings` and `choose`, a `Seeding` from `seededChoice` and `seedFrom`". Bump `spec/traceability.md` to Rev 1.263 with a change-history line, and update CCR-QD-466's cited revision, then `spec/README.md`'s revision with it.

### WR-02: The characterisation check passes edits that change what a row asserts or runs

**File:** `.planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs:6-15,114-139,159-188`

**Issue:** The script says it fails unless "no row's title, input, expected value, body or section moved". The locked rule is narrower: only the header, imports and moved helper declarations may change. The script reads only two things: the `it` calls, and the top-level declarations the first commit had. I ran a scratch copy that reads a modified characterisation or fixtures file. Each edit below changes what a row asserts or runs, and each exits 0 with "35 rows as at e25c8cfd":

1. **A shadowing declaration inside a `describe` body.** The probe added `const listed = (…) => ({ _tag: "Listed", value, index: index + 1 })` under the first `describe`. Every row in that section now expects a different index. The row text is unchanged, the `describe` statement is neither a helper nor a row, and so nothing compares it. A new top-level non-declaration statement, such as a `beforeEach(…)`, is not compared either.
2. **A helper the characterisation already imported at `e25c8cfd`, changed in `simulationFixtures.ts`.** The probe changed `sighting`'s `count: 1` to `count: 2`. `sighting`, `entryOf`, `slow`, `counted`, `startRun` and `ran` (with `settled` under it) are never compared with their first-commit text.
3. **One of those pre-existing imports re-pointed.** The probe used `import { slow } from "./elsewhere.ts"`. The specifier is checked only for the 13 moved helpers.

Two smaller gaps:

- The self-test checks only pass or fail, never the reason. A case can stay green after it starts failing for an unrelated reason.
- Line 12's "and is declared nowhere else" is vacuous. That branch only runs when the name is absent from the characterisation, and no other file is searched.

**Fix:**
- Compare every non-import top-level statement of the checked-out characterisation, other than the moved helpers, with the first commit's, as a multiset of collapsed text. That covers `describe` bodies and any new statement. The row multiset can then stay as the precise message.
- For each name the first commit imported, require the same specifier, except a moved helper, which must come from `../simulationFixtures.ts`.
- Read `git show e25c8cfd:packages/devtools/test/simulationFixtures.ts`, and require each pre-existing fixture helper the characterisation names to keep its text.
- Have each self-test case name the problem it expects, for example by matching a substring of the message. Add one case for each of the three holes above.
- Drop "and is declared nowhere else", or check it.

## Info

### IN-01: `SimulationSession.test.ts` keeps an identical copy of the fixtures' `orphan`, and a near-copy of `rowRead`

**File:** `packages/devtools/test/model/SimulationSession.test.ts:1047`, `packages/devtools/test/model/SimulationSession.test.ts:919-927`

**Issue:** "replaying a row that cannot be replayed leaves the seed as seed does" declares `const orphan = entryOf(obligationRecord({ evaluationId: "ev-orphan" }));`. That is byte-identical to the exported `orphan` in `simulationFixtures.ts:70`, in a file the fixtures header lists as an importer under "one definition rather than a copy a file keeps beside its own tests". The `describe("seeding")` block's `seed` (`ev-3`: `hasPermission(read)`, carol, read, doc-1) differs from `rowRead` only by its `evaluationId`. Its first row asserts exactly `carolDraft`'s fields. IN-04 removed the React copies but missed these.

**Fix:** Import `orphan` from `../simulationFixtures.ts` and delete the local copy. Optionally replace `seed` with `rowRead` as well, which leaves the asserted values unchanged.

### IN-02: The fixtures' new section comment now heads `slow` and `counted`

**File:** `packages/devtools/test/simulationFixtures.ts:46-47,140-174`

**Issue:** The 13 moved helpers were inserted between `entryOf` and `slow` under `// Two logged rows, the form a replay of one fills in, and a policy choice and a menu as a row compares them.` The section runs until the run-helpers comment at line 176. So `slow` (a resolver) and `counted` (a notification counter) now sit under a heading that does not describe them.

**Fix:** Move `slow` and `counted` above the new section, next to `sighting` and `entryOf` where they were. Or give them their own one-line heading.

### IN-03: A double blank line left where `slow` was removed

**File:** `packages/devtools/test/react/useSimulationSession.test.tsx:32-33`

**Issue:** Removing the local `slow` (IN-04) left two consecutive blank lines between `const source = sourceFromRecords([]);` and the first `describe`.

**Fix:** Delete one of the blank lines.

### IN-04: BEH-QD-709 cites a `withSightings` test as evidence that choosing the held policy is a no-op

**File:** `spec/behaviors/29-devtools-simulator.md:1083-1086`

**Issue:** BEH-QD-709 is "Choosing the held policy again changes nothing while the run is idle". Its Pinned-by list includes "withSightings with the same elements in a new array returns the same choice". That row pins a different transition's no-op, which INV-QD-393 already cites. The title exists, so the gates pass, but the citation does not pin this behaviour.

**Fix:** Drop that title from BEH-QD-709's Pinned-by list. INV-QD-393's Enforcement keeps it.

### IN-05: ADR-QD-187's "What enforces it" omits the transition-signature pin and decision 1's no-op rows

**File:** `spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md:94-100`

**Issue:** "The compiler enforces" names two facts, the three arms and the menu option shape. INV-QD-393's Enforcement names three: it also says the compiler holds what each transition answers, through the retitled tst pin. "Tests alone enforce: the rules of decisions 2 to 6" leaves out decision 1's no-op rule, which WR-01 gave its own rows ("seedFrom the row a choice holds answers the same choice and the row decoded", "seedFrom(undefined) on a choice with no seed answers the same choice"). The ADR is now less complete than the invariant that cites it.

**Fix:** Add "and what each transition answers" to the compiler sentence, and change "decisions 2 to 6" to "decision 1's no-op rule and decisions 2 to 6". This is an ADR wording edit, so cut a Rev 1.2 and update CCR-QD-466's citation with it.

---

_Reviewed: 2026-11-23T05:40:56Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
