---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
fixed_at: 2026-11-23T05:30:55Z
review_path: .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW.md
iteration: 1
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
---

# Phase 74: Code Review Fix Report

**Fixed at:** 2026-11-23T05:30:55Z
**Source review:** .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 13 (9 warnings, 4 info; fix scope `all`)
- Fixed: 13
- Skipped: 0

`workflow.use_worktrees` is `false`, so every edit, commit and gate ran in the main checkout on `arch-wave-13`. The
gate numbers below can be reproduced from that tree.

## Fixed Issues

### WR-01: "Every transition is SeededChoice → SeededChoice, and a no-op returns its input" is false for `seededChoice` and `seedFrom`

**Files modified:** `packages/devtools/src/model/SeededChoice.ts`, `packages/devtools/test/model/SeededChoice.test.ts`, `packages/devtools/test/model/SeededChoice.tst.ts`, `spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md`, `spec/invariants.md`, `spec/README.md`
**Commits:** 9349bbd2, b3939e1f (wraps the new no-op row inside 90 columns)
**Status:** fixed: requires human verification (logic change in `seedFrom`)
**Applied fix:**
- The code now keeps the rule. `seedFrom` keeps the seed row it already holds when the entry is the same row and its
  replayed policy is held exactly when the row replays. A row decodes to the same replay every time, so nothing else
  about it can differ. When the seed and the held sighting both come out unchanged, `seedFrom` answers the input
  choice itself inside the `Seeding`. That covers `seedFrom(c, undefined)` on a choice with no seed, the held
  replaying row, and the held orphan row. The input still comes back for the held row, so `replay` still re-seeds
  the draft. The session never compared `seedFrom`'s choice by reference, so nothing it does changed.
- The no-op paths of the other transitions were checked as well. `withSightings` and `choose` already answered their
  input. `seededChoice` takes no choice, so it has none.
- New rows pin each no-op with `strictEqual`:
  - "seedFrom the row a choice holds answers the same choice and the row decoded" replaces the old "seedFrom answers
    a new choice even for the row it holds".
  - "seedFrom(undefined) on a choice with no seed answers the same choice".
  - "seedFrom another row, or the held row after a choice, answers a new seed" covers the paths that must still
    answer a new choice.
- A scratch gut showed the new rows fail. Forcing a new choice failed 2 rows. Never keeping the held row failed 1.
  Both guts were reverted.
- The rule is now stated identically in four places: the `SeededChoice.ts` header (the line 5 vs line 24
  contradiction is gone), ADR-QD-187 decision 1, and INV-QD-393's statement and Enforcement. The wording:
  `withSightings` and `choose` map a `SeededChoice` to a `SeededChoice`. `seededChoice` and `seedFrom` answer a
  `Seeding`, which is the choice and the input a replayed row gives. A transition that changes nothing answers its
  input object, inside the `Seeding` for `seedFrom`.
- The tst pin is retitled "choose and withSightings answer a SeededChoice; seededChoice and seedFrom a Seeding".
- Spec revisions:
  - ADR-QD-187 is at Rev 1.1. CCR-QD-466 cites it as "Rev 1.1 (new at 1.0; corrected at 1.1, in code review)".
  - `spec/invariants.md` is at Rev 1.189.
  - `spec/README.md` is at Rev 1.317. It moved again under IN-04.
- The characterisation still passes 35/35, so behaviour is unchanged.

### WR-02: ADR-QD-187 decision 10 says `edit`'s comment claims to be the one path

**Files modified:** `spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md`
**Commit:** 74ae8be5
**Applied fix:** Decision 9 now states only the clear. Decision 10 states the `writeDraft` rule once, and closes with
"The session's header names `writeDraft` the one place". That is what the code says: `writeDraft`'s own comment does
not claim it. This edit falls within ADR Rev 1.1.

### WR-03: ADR-QD-187 says `spec/overview.md` does not change

**Files modified:** `spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md`
**Commit:** 76c85de4
**Applied fix:** The sentence now reads "…so there is no changeset; `spec/overview.md` names the three types from
`model/SeededChoice.ts` (Rev 1.133) under the same names." This edit falls within ADR Rev 1.1.

### WR-04: The characterisation header claims every row checks the notification count

**Files modified:** `packages/devtools/test/model/SimulationSession.characterisation.test.ts`
**Commit:** 269de2fb
**Applied fix:** Only the header comment changed. It now says each row compares the whole `view` projection, the
snapshot's own identity for a no-op, or both. It also says a row that counts notifications through `subscribe`
asserts an exact count where it reads one, and that not every row counts them. Every one of the 35 rows was checked
against that claim. No row, title, input or expected value was touched.

### WR-05: Two "pins nothing" rows cannot fail if a replayed seed does pin

**Files modified:** `packages/devtools/test/model/SeededChoice.test.ts`
**Commit:** 817a9a28
**Applied fix:**
- "a replayed seed pins nothing and answers the row decoded" now asserts that `held` is `undefined`, both for the
  constructed choice and after the rail grows.
- "a held replayed policy pins nothing, and leaving it pins the head" asserts that `grown.held` is `undefined`. It
  then moves the rail to `[sB, sA]` before leaving and expects `listed(sB, 0)`, which only an unpinned choice gives.

Evidence that each row now fails if a replayed seed pins:
- The scratch gut made `pinUnlessReplayed` always call `pinHead(sightings, held)`. It ran on 269de2fb with the
  strengthened rows in the working tree.
- Command: `pnpm exec vitest run --project devtools packages/devtools/test/model/SeededChoice.test.ts`
- Result: 3 failed, 32 passed. The failing rows and their first failure lines:
  - "a replayed seed pins nothing and answers the row decoded": `AssertionError: expected { …(7) } to equal undefined`
    at `SeededChoice.test.ts:172`
  - "a held replayed policy pins nothing, and leaving it pins the head": the same error at `:188`
  - "leaving a replayed policy pins the head of that moment, not an earlier one": failed as before.
- The gut was reverted with `git checkout -- packages/devtools/src/model/SeededChoice.ts`, and
  `git status --porcelain -- packages` then showed only the test edit.

### WR-06: `SeededChoice.test.ts` copies about a dozen helpers from the characterisation

**Files modified:** `packages/devtools/test/simulationFixtures.ts`, `packages/devtools/test/model/SeededChoice.test.ts`, `packages/devtools/test/model/SimulationSession.characterisation.test.ts`, `.planning/phases/QD-74-…/74-characterisation-check.mjs` (new), `.planning/phases/QD-74-…/74-RED-EVIDENCE.md`
**Commit:** 21e0dd3e
**Applied fix:**
- **The moved helpers.** Thirteen helpers now live in `simulationFixtures.ts`, with the characterisation's
  declaration text: `KEYS`, `rowRead`, `orphan`, `carolDraft`, `PolicyView`, `policyView`, `listed`, `evictedOf`,
  `seededOf`, `zero`, `menu`, `seededEntry` and `evictedEntry`.
  - Two lines were re-wrapped inside 90 columns once `export` was added. Their whitespace-collapsed text is
    identical.
  - `KEYS` stays unexported, because only `seededOf` reads it.
  - `PolicyView.unseeded` is now `ReadonlyArray<SimulationField>`. That is the snapshot's real type
    (`UnseededField.key`), where the characterisation had `string`.
- **The characterisation.** It deletes those declarations and imports them under the same names. Every
  `it.effect` call is byte-identical once whitespace is collapsed. Its header now says an edit may touch the
  header, the imports and where a helper is declared, never a row.
- **`SeededChoice.test.ts`.** It imports the same helpers. `carolInput` became `carolDraft`. `pc` is now
  `policyView(policyChoice(choice))`.
- **The fixtures header.** It names exactly its importers and states the importer rule.
- **The new check.** `74-characterisation-check.mjs` replaces the "identical once imports are dropped" rule. It uses
  TypeScript 7's parse through `typescript/unstable/sync` over a virtual file system. It fails unless both of these
  hold:
  - The multiset of every `it`/`it.*` call's whitespace-collapsed text is identical to that of the first commit
    (`e25c8cfd`). Each call is prefixed with its `describe` titles, which goes slightly beyond the brief: a row moved
    to another section also fails.
  - Every first-commit top-level helper is either still declared identically or declared in the fixtures with the
    identical text once `export` is dropped. When the characterisation names it, it is exported and imported from
    `../simulationFixtures.ts`.
- **Deviations from the brief.**
  - A moved helper only has to be *declared* in the fixtures. It has to be *exported* only when the characterisation
    names it. That is what lets `KEYS` stay private.
  - The one changed text, `PolicyView`, is admitted through a `REVIEWED` table that holds its exact first and moved
    text and the reason. An unused entry fails.
- **Self-test.** `--self-test` runs 13 cases:
  - A title change, an expected-value change, a section move, a changed moved helper, a helper changed in place, a
    helper declared nowhere, one imported from elsewhere, one not exported, an unreviewed text change and an unused
    reviewed entry each fail.
  - An import move with a header edit and an identical helper move, the first commit itself, and a reviewed change
    each pass.
- **Tried by hand.** Changing a real row's expected count fails the check, and so does changing a moved helper in
  the fixtures. Both were reverted.
- **RED evidence.** `74-RED-EVIDENCE.md` gains a dated section explaining the replacement. Earlier sections are
  untouched.

### WR-07: A plan-relative reference shipped in a test comment

**Files modified:** `packages/devtools/test/model/SeededChoice.test.ts`
**Commit:** 612db5e2
**Applied fix:** The comment is now `/** A choice that held sB and then lost it from the rail, so it reads as Evicted. */`.

### WR-08: The barrel type pin cannot fail for the reason its title names

**Files modified:** `packages/devtools/test/model/SeededChoice.tst.ts`
**Commit:** 42fb82c1
**Applied fix:** The pin is retitled "the barrel's PolicyChoice, PolicyMenu and PolicyMenuOption are the module's
shapes", which is what tstyche's `toBe` can prove. Three things keep the barrel naming `./model/SeededChoice.ts`:
- the barrel line itself (`packages/devtools/src/index.ts:93`,
  `export type { PolicyChoice, PolicyMenu, PolicyMenuOption } from "./model/SeededChoice.ts";`);
- `spec/overview.md`'s row naming `model/SeededChoice.ts`, which `check-api-surface` checks;
- review.

No type test can tell an identical structural copy from the declaration.

### WR-09: The characterisation duplicates session tests that stayed in `SimulationSession.test.ts`

**Files modified:** `packages/devtools/test/model/SimulationSession.test.ts`
**Commit:** 3faf071c
**Applied fix:** Duplicates were removed only where the characterisation pins the same rule at the same or higher
precision:

| Removed or trimmed in `SimulationSession.test.ts` | Surviving characterisation row |
| ------------------------------------------------- | ------------------------------ |
| "resets the resource field and any unparsed text on a re-seed" (removed) | "seeding another row replaces the policy, the draft and the resource text" (a refused text `[1]`, then a re-seed; whole view and count) |
| "seed with the entry it holds is a no-op, so an effect re-run keeps the edited form" (removed) | "seeding the row it already holds changes nothing and notifies no one" (count 0, snapshot identity, kept edit) |
| "every no-op command…": its `setSightings`, `choosePolicy`, `edit` and `renameSubject` no-ops (trimmed) | "a rail of the same elements in a new array changes nothing", "choosing an equal copy of the held policy while idle changes nothing", "editing to the draft it holds changes nothing", "renaming to the current id changes nothing, and a rename keeps the text" |

- The trimmed row still pins the no-ops the characterisation does not cover: `seed(undefined)` with no seed,
  `setPorts`, `chooseSource`, `setClock`, `setPairs`, `removeChip` and a refused `addChip`.
- It is retitled "a no-op seed, ports, source, clock, pairs or chip command leaves the snapshot alone".
- No spec Pinned-by or traceability text quoted the removed titles (searched under `spec/`). The RED evidence gains
  a dated note, and the session tests now hold 80.

### IN-01: Two `SeededChoice.test.ts` titles omit the input that makes the row meaningful

**Files modified:** `packages/devtools/test/model/SeededChoice.test.ts`, `.planning/phases/QD-74-…/74-RED-EVIDENCE.md`
**Commit:** 22afa862
**Applied fix:**
- The two tests are renamed:
  - "choosing the evicted policy while a replay is held keeps the evicted sighting". This is shorter than the
    reviewer's wording so the line fits in 90 columns.
  - "on an empty rail, an orphan seeds no policy and answers no input".
- Both new titles are unique in the file and each is a single string literal.
- No spec text quoted the old titles. The RED evidence's moved-tests table quoted one, so a dated note now records
  both renames (and the WR-01 and WR-09 title changes) without rewriting the table.

### IN-02: `SeededChoice.ts` doc comments overstate or misstate three details

**Files modified:** `packages/devtools/src/model/SeededChoice.ts`
**Commit:** 58c634a9
**Applied fix:**
- The "two contracts it does not check" paragraph is dropped. `sightingFor`'s non-optional return and `replayInput`'s
  closed `Replay` union already give both facts.
- `SeedRow` now says `replayed` is absent "once the reviewer has chosen a policy".
- `choose` now says "the row stays the one it was seeded from (`seededFrom`)".

### IN-03: The staleness guards for a moved seed or a missing policy cannot be true while a run is shown

**Category:** necessity
**Files modified:** `packages/devtools/src/model/SimulationSession.ts`
**Commit:** 7839de1d
**Status:** fixed: requires human verification (necessity finding; no code removed, doc only)
**Applied fix:**
- Both disjuncts are kept, because BEH-QD-322 says `stale` covers the form, the policy and the seed.
- The `stale` field's doc now says the policy and seed checks (no policy, another policy, another seed) state
  BEH-QD-322's rule where it is read. It also says they are not there because one can hold while a run is shown,
  since every command that changes the policy or the seed also clears the run.

**The reviewer's claim, re-checked.** It holds, and it extends to the policy-equality disjunct too:
- `pinHead` is `held ?? list[0]`, so a held sighting is never unset.
- `choose` always holds a sighting.
- A replayed policy is dropped only by `choose` or `seedFrom`, and both callers clear the run.
- `setSightings` changes neither the held sighting's policy nor the replay.

A scratch session test (deleted afterwards) confirmed two cases. A run on `[sA]` followed by `setSightings([])` reads
`Evicted`, with `run` still `Ran` and `stale` false. A replayed run followed by emptying and refilling the rail
stays `Seeded` with `run` `Ran`. So `policyNow === undefined` was not reachable there.

### IN-04: The shared fixtures' "one definition" claim leaves two identical copies elsewhere

**Files modified:** `packages/devtools/test/react/Simulator.test.tsx`, `packages/devtools/test/react/useSimulationSession.test.tsx`, `packages/devtools/test/simulationFixtures.ts`, `spec/README.md`
**Commit:** ded61ecf
**Applied fix:**
- **`Simulator.test.tsx`** deletes its identical `sighting` and `entryOf` and imports them.
- **`useSimulationSession.test.tsx`** deletes its identical `slow` and builds its sighting as
  `sighting(clearance)`, which gives the same fields as the old object literal. Its inline
  `ingestAll(emptyTimeline(), …)` read now goes through `entryOf`, which throws where the old `assert.isDefined`
  failed.
- **Kept local:** `Simulator.test.tsx`'s `slowPorts`. It is a different resolver (a 40 ms sleep for a real-timer
  test).
- **The fixtures header** names all six importers.
- **CCR-QD-466** lists `packages/devtools/test/react/{Simulator,useSimulationSession}.test.tsx`. `spec/README.md` is
  at Rev 1.318, and the row cites it. The CCR file list equals `git diff --name-only b22d97f9 HEAD -- packages spec`
  (20 files).

## Verification

All gates ran in the main checkout at `ded61ecf` (no worktree):

| Gate | Result |
| ---- | ------ |
| `pnpm exec vitest run --project devtools < /dev/null` | 73 files, 1760 tests passed |
| `pnpm typecheck` | clean |
| `pnpm test:tstyche` | both passes: 71 files passed (381 passed / 1 skipped; 380 passed / 2 skipped, as designed) |
| `node scripts/check-house-style.mjs` | 578 files clean |
| `node scripts/check-doc-examples.mjs` | 118 blocks compile |
| `node scripts/check-api-surface.mjs` | 941 exports across 9 packages |
| `pnpm exec oxlint` on the 9 touched package files | clean |
| `node scripts/spec-revise.mjs --check` | every Revision matches |
| `74-characterisation-check.mjs` | 35 rows as at e25c8cfd; 21 helpers kept, 13 moved |
| `74-characterisation-check.mjs --self-test` | 13 passed |
| `bash spec/scripts/verify-traceability.sh --strict` | PASS 21, FAIL 0, SKIP 0 |

No added `.ts`/`.tsx` line passes 90 columns.

**For the orchestrator, outside this fixer's remit:**
- `SimulationSession.ts`'s `stale` expression moved down 6 lines (IN-03's doc comment). `SeededChoice.ts` changed
  `seedFrom`, which adds mutants, and shifted line numbers (WR-01, IN-02).
- `74-mutation.mjs`'s `MOVED` entry (close line 313) and any line-keyed `EXAMINED` facts will need re-pairing when
  the close is re-recorded.

---

_Fixed: 2026-11-23T05:30:55Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
