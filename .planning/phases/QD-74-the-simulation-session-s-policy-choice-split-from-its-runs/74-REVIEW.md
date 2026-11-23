---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
reviewed: 2026-11-23T05:07:04Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - packages/devtools/src/model/SeededChoice.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/model/HeldChoice.ts
  - packages/devtools/src/index.ts
  - packages/devtools/test/model/SeededChoice.test.ts
  - packages/devtools/test/model/SeededChoice.tst.ts
  - packages/devtools/test/model/SimulationSession.characterisation.test.ts
  - packages/devtools/test/model/SimulationSession.test.ts
  - packages/devtools/test/model/SimulationSession.runs.test.ts
  - packages/devtools/test/simulationFixtures.ts
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
  - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-RED-EVIDENCE.md
  - packages/devtools/src/model/ExplorerSession.ts
findings:
  critical: 0
  warning: 9
  info: 4
  total: 13
  necessity: 1
status: issues_found
---

# Phase 74: Code Review Report

**Reviewed:** 2026-11-23T05:07:04Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

I compared the phase diff (`b22d97f9..HEAD`) line by line with the base session, at standard depth. Behaviour is preserved:

- **Construction with a seed.** The base published once to an empty subscriber set and called `supersede()` on a run that did not exist. Neither is observable. The seed guard, the run state, staleness and the resource text are identical. The unseeded `resourceTextOf(blank)` equals the base's `{ text: "", error: undefined }`.
- **`renameSubject` through `edit`.** `renameSubject` always answers a new object and never touches `resource`, so the publish and the text are unchanged.
- **`choose`'s `same ? choice.held : …`.** This equals the base, where `cell.choose` was a no-op for a value equal under `sameSighting`.
- **`sightingAt` on unusual positions.** Negative, fractional, NaN, `-0` and past-the-end positions answer the same as the base's `Number.isInteger` guard.

The other structural claims also hold:

- Outside construction, `draft` and `resourceText` are assigned only in `writeDraft`, and `run = { _tag: "Idle" }` appears only in `clearRun`.
- `SeededChoice.ts` holds no mutable cell and no Effect.
- `menuOf` and `sightingAt` read the one `menuEntries` list.
- The PolicyChoice to `HeldChoice<PolicySighting>` tie can fail. The source enforces both directions (`policyChoice` returns `resolveHeld`'s answer, and `policyOf` passes the narrowed arms to `heldValue`), and the type pin was seen failing.
- All 59 quoted test titles in the new spec text exist verbatim.
- The five rule sentences are word for word the same in ADR-QD-187, BEH-QD-706..710, INV-QD-394 and the source headers.
- The three amendments are dated additions only.
- The CCR-QD-466 file list and revisions match the diff and the document headers.
- No added `.ts` line is longer than 90 characters.
- The 18 removed session tests are each matched at equal or better precision.
- The RED evidence's reasoning for the moved `question.seed !== seed` survivor holds (see IN-03).

The defects are in what the records and tests *claim*:

- The ADR, the invariant, the module header and a type-pin title say every transition maps a `SeededChoice` to a `SeededChoice` and returns its input for a no-op. Neither is true of `seededChoice` or `seedFrom`.
- The ADR says `edit`'s comment calls itself the one path. It no longer does.
- The ADR says `spec/overview.md` does not change. It changed.
- The characterisation header says every row checks the notification count. Nine rows do not.
- Two "pins nothing" rows cannot detect a pin.
- One type pin cannot fail for the reason its title names.
- The new test file copies about a dozen helpers from the characterisation.
- A plan-relative "row 15" comment shipped.

## Warnings

### WR-01: "Every transition is SeededChoice → SeededChoice, and a no-op returns its input" is false for `seededChoice` and `seedFrom`

**File:** `spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md:41-44`, `spec/invariants.md:4525` (INV-QD-393 Enforcement), `spec/invariants.md:4519` (INV-QD-393 statement), `packages/devtools/src/model/SeededChoice.ts:5-6,24-25`, `packages/devtools/test/model/SeededChoice.tst.ts:59`

**Issue:**
- ADR decision 1 says "The transitions are `seededChoice`, `withSightings`, `seedFrom` and `choose`, each from a `SeededChoice` to a `SeededChoice`". INV-QD-393's Enforcement says "the compiler holds … every transition to a seeded choice in and out, so a no-op can return its input". The type pin titled "every transition answers a seeded choice, so a no-op can return its input" asserts the opposite for half its subjects: `seededChoice` takes `(sightings, seed?)`, and both it and `seedFrom` return a `Seeding`.
- Neither function can return its input. `seedFrom(c, undefined)` on an unseeded, already pinned choice changes nothing, yet answers a fresh object. That falsifies the general sentence in ADR decision 1, INV-QD-393 and `SeededChoice.ts:24` ("A transition that changes nothing returns its input object"). `SeededChoice.test.ts:390` pins exactly that exception.
- `SeededChoice.ts:5` ("Every transition answers a new value") contradicts its own line 24.

**Fix:** State the rule for the two transitions it covers. For example, in the ADR, the INV-QD-393 statement and Enforcement, and the module header: "`withSightings` and `choose` map a `SeededChoice` to a `SeededChoice` and return their input for a no-op; `seededChoice` and `seedFrom` answer a `Seeding`, and `seedFrom` always answers a new choice." Retitle the tst pin to match, for example "withSightings and choose answer a seeded choice; the constructor and seedFrom answer a Seeding". Drop "Every transition answers a new value" from `SeededChoice.ts:5-6`.

### WR-02: ADR-QD-187 decision 10 says `edit`'s comment claims to be the one path; the code's comment says nothing of the kind

**File:** `spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md:82-83`

**Issue:** The ADR ends decision 10 with "`edit`'s comment, which says it is the one path, is true." The phase replaced that comment. `SimulationSession.ts:462-465` now reads "Writes `next` through `writeDraft` and publishes; the draft already held publishes nothing." The one-path claim now lives on `writeDraft` and the module header. The ADR describes code that no longer exists. Decision 9 ("One clear") also opens with the `writeDraft` sentence that decision 10 ("One draft path") restates, so the draft rule is written twice and the clear rule is buried under the wrong heading.

**Fix:** Replace the last sentence of decision 10 with "`writeDraft`'s comment and the session header name it the one place." Move the `writeDraft` clause out of decision 9, so that 9 is the clear and 10 is the draft.

### WR-03: ADR-QD-187 says `spec/overview.md` does not change; the phase revised it

**File:** `spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md:123-124`

**Issue:** The Consequences section says "…so there is no changeset and `spec/overview.md` does not change." The phase moved Rev 1.132 to 1.133 and split the row, moving `PolicyChoice`, `PolicyMenu` and `PolicyMenuOption` to a new `model/SeededChoice.ts` row. CCR-QD-466 in `spec/README.md:403` lists `spec/overview.md` Rev 1.133. Two records of the same change contradict each other.

**Fix:** "…so there is no changeset; `spec/overview.md` names the three types from `model/SeededChoice.ts` (Rev 1.133) under the same names."

### WR-04: The characterisation header claims every row checks the notification count; nine rows do not

**File:** `packages/devtools/test/model/SimulationSession.characterisation.test.ts:8-9`

**Issue:** The header says "Every row compares the whole `view` projection and the exact notification count." These rows never call `counted`:

| Line | Row |
| ---- | --- |
| 511 | "choosing from the rail while an orphan is the seed keeps the orphan" |
| 532 | "the menu of an empty session is empty and selects nothing" |
| 662 | "a finished run goes stale when the form moves" |
| 685 | "a finished run stays current when the rail moves" |
| 703 | "choosing another policy after a run clears it, so nothing is stale" |
| 720 | "seeding a row after a run clears it, and a new run checks the row" |
| 796 | "a policy chosen before the rail has any is held once the rail lists it" |
| 473 | "choosing the held policy while seeded leaves the row, keeping the draft": counts the first command, not the run |
| 826 | "new ports during a run clear it and stop it": counts the clear only |

Other rows (`seeding the row it already holds…`, the no-op rows) compare snapshot identity rather than the `view` projection. That is stronger, but it is not what the header says. A reader relying on the header would believe that, for example, the publish count of a `clearRun` after `ran` is pinned when it is not. The file's own rule allows editing its header.

**Fix:** Make the header true without touching any row: "Each row compares the `view` projection, or the snapshot's identity for a no-op, and most count notifications through `subscribe`."

### WR-05: Two "pins nothing" rows cannot fail if a replayed seed does pin

**File:** `packages/devtools/test/model/SeededChoice.test.ts:166-172`, `packages/devtools/test/model/SeededChoice.test.ts:181-187`

**Issue:**
- In "a replayed seed pins nothing and answers the row decoded", `policyChoice` reads the replayed policy before `held`. If `pinUnlessReplayed` always pinned, `pc(s.choice)` and `pc(withSightings(...))` would still be `Seeded`. Nothing in the row observes `held`.
- In "a held replayed policy pins nothing, and leaving it pins the head", the rail is `[sA]` when the replay is left. An always-pin mutant has already held `sA`, and the correct code pins `sA` on leaving. Both reach `listed(sA, 1)`.
- The direction is caught only by "leaving a replayed policy pins the head of that moment, not an earlier one" and by the characterisation. Two titles claim a guarantee their rows cannot see. The RED evidence gutted only the never-pin direction, so this was not exposed.

**Fix:** Assert the held sighting directly. For example, `assert.strictEqual(s.choice.held, undefined)` in the first row. In the second row, move the rail before leaving:

```ts
const grown = withSightings(c, [sA]);
assert.strictEqual(grown.held, undefined);
const left = seedFrom(withSightings(grown, [sB, sA]), undefined).choice;
assert.deepStrictEqual(pc(left), listed(sB, 0));
```

### WR-06: `SeededChoice.test.ts` copies about a dozen helpers from the characterisation instead of sharing them

**File:** `packages/devtools/test/model/SeededChoice.test.ts:51-141` (against `SimulationSession.characterisation.test.ts:61-194`)

**Issue:** These are restated almost line for line: `KEYS`, `rowRead`, `orphan`, `carolInput`/`carolDraft`, `PolicyView`, `listed`, `evictedOf`, `seededOf`, `zero`, `menu`, `seededEntry`, `evictedEntry`, and the Seeded projection (`pc` against `policyView`). The copies have already drifted: `PolicyView.unseeded` is `ReadonlyArray<SimulationField>` in one file and `ReadonlyArray<string>` in the other. `simulationFixtures.ts` was created precisely so test files share "one definition rather than a copy a file keeps beside its own tests". Its own header fails here. `zero` also restates `sightingFor`'s fallback shape twice.

**Fix:** Move the shared helpers into `simulationFixtures.ts` and import them in `SeededChoice.test.ts`. Do the same in the characterisation. That relocates helper definitions only and leaves every input, title and expected value byte-identical. If the characterisation's "imports only" rule must stand, import them at least in `SeededChoice.test.ts`, and note in the fixtures header that the characterisation keeps frozen copies.

### WR-07: A plan-relative reference shipped in a test comment

**File:** `packages/devtools/test/model/SeededChoice.test.ts:143`

**Issue:** `/** The choice of row 15: sB was chosen, then the rail dropped it. */` refers to row 15 of the table in `74-03-PLAN.md`. The file has no numbered rows, so the reference means nothing to a reader of the code. This is the phase-relative wording the house rules forbid in tests. The RED evidence's "no plan id or phase wording" scan missed it.

**Fix:** `/** A choice that held sB and then lost it from the rail, so it reads as Evicted. */`

### WR-08: The barrel type pin cannot fail for the reason its title names

**File:** `packages/devtools/test/model/SeededChoice.tst.ts:72-76`

**Issue:** The test "the barrel names the three types from the seeded choice module" asserts `expect<BarrelPolicyChoice>().type.toBe<PolicyChoice>()`, and the same for the two menu types. tstyche's `toBe` is type identity, and two separately declared aliases with identical structure are identical. If the barrel still exported a structurally identical `PolicyChoice` from `SimulationSession.ts`, which is the base's state, the pin would pass. The title promises *where* the types are exported from. The assertion checks only that the shapes are equal, which the other three tests already pin.

**Fix:** Either delete the test, since `check-api-surface` and the barrel's one `export type … from "./model/SeededChoice.ts"` line are what hold the module, or retitle it to what it proves: "the barrel's PolicyChoice, PolicyMenu and PolicyMenuOption are the module's shapes".

### WR-09: The characterisation now permanently duplicates session tests that stayed in `SimulationSession.test.ts`

**File:** `packages/devtools/test/model/SimulationSession.test.ts:945,1050,1315` (against `SimulationSession.characterisation.test.ts:298,313,442,746,876,954`)

**Issue:** The phase goal was that each rule is written once. These pairs pin the same thing in both files:

| `SimulationSession.test.ts` | Characterisation |
| --------------------------- | ---------------- |
| "seed with the entry it holds is a no-op, so an effect re-run keeps the edited form" | "seeding the row it already holds changes nothing and notifies no one" |
| "resets the resource field and any unparsed text on a re-seed" | "seeding another row replaces the policy, the draft and the resource text", same `[1]`/unparsed setup |
| "every no-op command leaves the snapshot and the subscribers alone", which covers `setSightings`, `choosePolicy`, `edit` and `renameSubject` no-ops | "a rail of the same elements…", "choosing an equal copy…", "editing to the draft it holds…", "renaming to the current id…" |

The characterisation was the phase's safety net. Once the phase closes, it is a second session suite over the same commands, and a behaviour change has to be made in two places.

**Fix:** Now that the refactor has landed and the characterisation is frozen, remove the overlapping `SimulationSession.test.ts` rows. Alternatively, record in the characterisation header that it overlaps those rows on purpose, and name them.

## Info

### IN-01: Two `SeededChoice.test.ts` titles omit the input that makes the row meaningful

**File:** `packages/devtools/test/model/SeededChoice.test.ts:368`, `packages/devtools/test/model/SeededChoice.test.ts:407`

**Issue:**
- "choosing the evicted policy again keeps the evicted sighting" only exercises `choose`'s `same ? choice.held : …` branch because a replayed row is seeded first (`seedFrom(e, rowRead)`). Without the replay, `choose` returns its input, which is trivially "keeps". The title does not say a replayed policy is held.
- "an orphan seeds no policy and answers no input" runs on an empty rail, which the title omits. With a rail, an orphan pins the head, and line 174 already pins that. The two rows read as contradictory.

**Fix:** Rename them "choosing the evicted policy while a replayed policy is held keeps the evicted sighting" and "on an empty rail, an orphan seeds no policy and answers no input".

### IN-02: `SeededChoice.ts` doc comments overstate or misstate three details

**File:** `packages/devtools/src/model/SeededChoice.ts:27-30`, `packages/devtools/src/model/SeededChoice.ts:102-103`, `packages/devtools/src/model/SeededChoice.ts:188-189`

**Issue:**
- **Lines 27-30, the unchecked contracts.** The header says the module "relies on two contracts it does not check". Both are checked by the compiler. `sightingFor` returns a non-optional `PolicySighting`. `replayInput` returns the closed `Replay` union, whose `NotReplayable` arm `seedFrom` handles. `replayInput` does refuse an orphan, so "total … never refuses one" describes `seedFrom`, not `replayInput`.
- **Lines 102-103, when `replayed` is absent.** `SeedRow` says `replayed` is absent "once the reviewer has chosen another policy". `choose` also drops it for the *same* policy, per lines 192-201 and BEH-QD-709.
- **Lines 188-189, the seed after choosing.** `choose` says "the row stays the seed it was". For a decision row, `seedOf` answers `undefined` after a choice. The row stays `seededFrom`, not the seed.

**Fix:** Change "contracts it does not check" to "two facts its types already give", or drop the paragraph. Change "chosen another policy" to "chosen a policy". Change "the row stays the seed it was" to "the row stays the one it was seeded from (`seededFrom`)".

### IN-03: The staleness guards for a moved seed or a missing policy cannot be true while a run is shown

**File:** `packages/devtools/src/model/SimulationSession.ts:311,313`
**Category:** necessity

**Issue:** The RED evidence's argument for the moved survivor holds. `question.seed` is `seedOf(choice)` when the run starts. The only commands that change `seedOf(choice)` are `reseed` and `choosePolicy`, and each ends in `clearRun()`. Superseded runs never land, because `isCurrent` fails after `runs.stop()`. So `question.seed !== seed` is never the deciding disjunct.

The same argument covers `policyNow === undefined` on line 311, another base survivor (ConditionalExpression → false at 311:9 in `74-mutation-close.json`). `held` is never unset by any transition. `pinUnlessReplayed` only keeps or pins. A run needs a policy. So `policyOf` cannot become `undefined` while a question exists.

Both guards stay because BEH-QD-322 says `stale` covers the form, the policy and the seed. That is a recorded autonomous decision, so this is judgment, not a defect. The `stale` field's doc ("True when the form, the policy or the seed moved since the shown result ran", line 150) still promises cases that clear the run instead.

**Fix:** None required. If revisited, drop both guards together with `SimulationQuestion.seed` and amend BEH-QD-322, or add a one-line comment saying the guards are kept by BEH-QD-322 and are unreachable while `clearRun` guards every seed or policy change.

### IN-04: The shared fixtures' "one definition" claim leaves two identical copies elsewhere in the devtools tests

**File:** `packages/devtools/test/simulationFixtures.ts:1-7` (against `packages/devtools/test/react/Simulator.test.tsx:51-69`, `packages/devtools/test/react/useSimulationSession.test.tsx:31-71`)

**Issue:** `Simulator.test.tsx` keeps its own `sighting` and `entryOf`, and `useSimulationSession.test.tsx` keeps a byte-identical `slow`. Both test the simulation session. The fixtures header names its four importers correctly. It has no module-scope state and no unused helper. Still, "one definition rather than a copy a file keeps beside its own tests" is only half true for the session's tests as a whole. These files are outside the phase's diff.

**Fix:** In a follow-up, import `sighting`, `entryOf` and `slow` from `../simulationFixtures.ts` in those two files and add them to the header. Or scope the header to "the model's session tests".

---

_Reviewed: 2026-11-23T05:07:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
