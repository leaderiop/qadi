---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
plan: 04
subsystem: devtools-model
tags: [simulation-session, seeded-choice, write-draft, clear-run, red-evidence]
phase_base: b22d97f9af293734787b3f771400d6f5f6e87065
plan_head_before: 480d0ed18f533dc0e1ac2ef102e50a7a2db57719
plan_head_after: 6bca85144a4e4164705ef6157ee55ec4d3d74093

requires: ["74-03"]
provides:
  - "SimulationSession.ts holds one `let choice` (a SeededChoice) and reads every choice fact from SeededChoice.ts"
  - "writeDraft: the one place the draft and its resource text are assigned; clearRun: the one run clear"
  - "74-RED-EVIDENCE.md: each of six session guts seen failing once"
affects: [74-05, 74-06, 74-07]

actuals:
  tokens: 24000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "the session replaces its choice with what a transition answers and detects a no-op with ==="
    - "one function writes the draft and its resource text; one operation stops and idles the run"

key-files:
  created: []
  modified:
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/src/model/HeldChoice.ts
    - packages/devtools/test/model/SimulationSession.characterisation.test.ts
    - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-RED-EVIDENCE.md

key-decisions:
  - "Decided autonomously (orchestrator): the types' second home in the session is removed. The characterisation's two type imports move to SeededChoice.ts in their own commit, and the session no longer re-exports PolicyChoice, PolicyMenu or PolicyMenuOption"
  - "writeDraft's resource-text rule is two statements (a `kept` flag, then the assignment) so the one assignment stays on one line within 90 columns and evaluates resourceTextOf only when it is needed"

requirements-completed: []  # CHSE-03, CHSE-04, WX-04, WX-06, WX-07 are held by this plan but stay Pending: only 74-07 marks requirements

duration: 12 min
completed: 2026-11-23
status: complete
---

# Phase 74 Plan 04: The session on the seeded choice, with one draft path and one run clear Summary

`SimulationSession.ts` now keeps only its runs and its form: its policy choice is one `SeededChoice` replaced by what a
transition answers, every draft write goes through `writeDraft`, and every run clear through `clearRun`. The
characterisation (35 rows), written on the base, passed unedited after every task, and each new rule was seen failing once.

## Task Commits

0. Orchestrator step: `5022cec1` `test(74-04): import the choice types from the seeded choice module` (the
   characterisation's imports only: `PolicyChoice` and `PolicyMenu` now come from `SeededChoice.ts`; the diff is one
   added and two removed import lines, no title, input or expected value)
1. Task 1 (tracer): `c66c3c46` `refactor(74-04): hold the policy choice of the simulation session as one seeded choice`
   (`SimulationSession.ts`, `HeldChoice.ts`; the re-export line and its comment are gone)
2. Task 2: `0caa34a6` `refactor(74-04): write the draft in one place and clear the run through one operation`
3. Task 3: `6bca8514` `docs(74-04): record the run clear and the draft path red once`

## What was built

- One `const seeding = seededChoice(init?.sightings ?? [], init?.seed)`, `let choice: SeededChoice = seeding.choice`,
  `let draft = seeding.input ?? blank` and `let resourceText = resourceTextOf(draft)`. The construction-time
  `session.seed(init.seed)` is gone. `build`, `start`, `stale` and the baseline read `policyChoice`, `policyOf`, `seedOf`
  and `menuOf`; `seedOf(choice)` is read once in `build` and once in `start`.
- `choice` is replaced only with what `withSightings`, `seedFrom` or `choose` answers. `choosePolicy` publishes nothing
  only when `choose` returned its input and the run is `Idle`; `choosePolicyAt` reads `sightingAt`; `seed` compares with
  `seededFrom`.
- `clearRun` (`supersede(); run = { _tag: "Idle" }`) is called from `reseed`, `choosePolicy` and `setPorts` (inside its
  `Running` test); `start`'s `Refused` path still calls `supersede`.
- `writeDraft(next, text?)` is the only code line assigning `draft` (once) or `resourceText` (once) after the
  declarations; `edit`, `reseed` and both `editResourceText` branches call it (four calls), and `renameSubject` keeps its
  same-id no-op and goes through `edit`. `editResourceText` still publishes unconditionally.
- Removed: `chosen`, `seedEntry`, `seeded`, `pin`, the local `policyChoice`/`policyOf`/`seedOf`, `selectedOf`,
  `leading`, `policyMenuOf`, the `effect/Match`, `sameSighting`, `sightingFor`, `heldValue`, `makeHeldChoice`,
  `replayInput` and `UnseededField` imports. The proving grep of 74-01 prints nothing (26 lines on the base).
- Header: the "policy and where it came from are one value" paragraph, then rule sentence 5 verbatim as its own paragraph.
- `HeldChoice.ts` changed in comments only: it names `SeededChoice.ts`, says `makeHeldChoice` is what the explorer session
  embeds (double-publish reason kept) and that the simulator holds a pure value built on `resolveHeld`, `pinHead` and
  `heldValue` (ADR-QD-187), and no longer names the simulator as an owner of the cell. `ExplorerSession.ts` is untouched.

## Single-assignment counts (code lines, comments excluded)

| Pattern | Count | Where |
| ------- | ----- | ----- |
| `draft = ` | 1 | `writeDraft` |
| `resourceText = ` | 1 | `writeDraft` |
| `run = { _tag: "Idle" }` | 1 | `clearRun` |
| `supersede();` | 2 | `clearRun`, `start`'s `Refused` path |
| `clearRun();` | 3 | `reseed`, `choosePolicy`, `setPorts` (`if (run._tag === "Running") clearRun();`) |
| `writeDraft(` calls | 4 | `edit`, `reseed`, both `editResourceText` branches |

## Rename rows checked

`renameSubject` (`SimulationFields.ts:503-506`) folds `fieldOps(key).rename` over `FIELD_ORDER`; the generic `rename`
(`:459-467`) returns the input unchanged when a row has no `attribution` and otherwise writes only that row's own list
through `row.write`. Every row's `write` was read, and none touches `resource`, so routing the rename through `edit`
keeps the resource text:

- `roles` (`:248`) writes `subject.roles`, `attribution: undefined` (`:253`)
- `permissions` (`:261`) writes `subject.permissions`, `attribution: undefined` (`:266`)
- `subjectAttributes`, the pairs row (`:274`) writes `subject.attributes`, `attribution: undefined` (`:282`)
- `attributes` (`:290`) writes `attributes`, `attribution: undefined` (`:295`)
- `relationships` (`:303`) writes `relationships`, `attribution: follow` (`:308`)
- `history` (`:319`) writes `history`, `attribution: follow` (`:324`)
- `signatures` (`:335`) writes `signatures`, `attribution: follow` (`:340`)

## The six guts

Each was a scratch edit to `SimulationSession.ts`, run against the characterisation alone (reports in
`<S>/gut-<name>.json`), and reverted with `git checkout`; none was committed and `git status --porcelain -- packages`
read empty after the last. Details and first failure lines: `74-RED-EVIDENCE.md`.

| Gut | Edit | Caught by (named row) | Failed |
| --- | ---- | --------------------- | ------ |
| clear-reseed | `reseed` does not call `clearRun` | `seeding a row after a run clears it, and a new run checks the row` | 2 |
| clear-choose | `choosePolicy` does not call `clearRun` | `choosing another policy after a run clears it, so nothing is stale` | 2 |
| clear-ports | `setPorts` does not call `clearRun` | `new ports during a run clear it and stop it` | 1 |
| idle | `choosePolicy` returns whenever `choose` returned its input | `choosing the held policy after a run clears the run, notifying once` | 1 |
| draft-noop | `writeDraft` drops its first line | `editing to the draft it holds changes nothing` | 1 |
| draft-text | `writeDraft` always re-encodes the text | `an edit that keeps the resource keeps the typed resource text` | 2 |

## Verification

- Task 1 verify `session on the seeded choice`, Task 2 verify `one draft path and one run clear`, Task 3 verify `each run
  clear and draft rule seen red`; Tasks 1 and 2 re-run on the final HEAD, all passing (the first two through the adapted
  scripts in the deviations below).
- Characterisation 35 of 35 and `SimulationSession.test.ts` 100 of 100 (135 passed) after each task, unedited; the devtools
  project 73 files, 1778 passed; `pnpm typecheck` exit 0; oxlint clean on both files; `check-house-style` `578 file(s)
  clean (3 declared switch(es), 71 type-test file(s))`; `check-api-surface` `941 export(s) documented across 9
  package(s)`.
- No test file changed except the orchestrator-ordered import move; `SeededChoice.ts`, `ExplorerSession.ts`, the barrel
  and the spec are unchanged; no added line holds `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`, an ambient
  clock or console, `Record<string, unknown>`, a suppression comment, a forbidden token or passes 90 columns.

## Deviations from Plan

### Orchestrator decision (decided autonomously), supersedes 74-03 deviation 1

The characterisation's `PolicyChoice` and `PolicyMenu` imports moved to `SeededChoice.ts` in their own commit (`5022cec1`),
so the session's `export type { PolicyChoice, PolicyMenu, PolicyMenuOption }` re-export and its comment are removed in
`c66c3c46` and the types have one home. The barrel already names them from `SeededChoice.ts`, so the public surface is
unchanged (941). 74-07's close checks the characterisation is identical to its first commit once import lines are dropped.

### Verification-only deviations (no gate weakened)

**1. The plan-start commit moved past the import commit.** Tasks 1 and 2 verify `git diff --quiet "$P" -- packages/devtools/test ...`
against `<S>/p04-start`, recorded before the orchestrator-ordered import commit, so the verify refused that commit. The
original start is kept as `<S>/p04-start-orig` (`480d0ed1`); `p04-start` was set to `5022cec1`, so the same check ran
against everything after the sanctioned import commit. Separately, `git diff 480d0ed1 5022cec1` shows one added and two
removed import lines.

**2. Task 2's pattern-count loop split its own entries wrongly.** Entries are `<regex>|<count>` and `${p#*|}` cut at the
first `|`, which the first regexes also contain (`(^|[^A-Za-z_.])draft = `). Run with `${p##*|}` (cut at the last `|`),
checking the same patterns and counts.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `resourceText = ` on one line**
- **Found during:** Task 2 verify
- **Issue:** the plan's body for `writeDraft` assigns `resourceText = text ?? (next.resource === draft.resource ? ... )`
  on one line, which is over 90 columns; wrapping it left no `resourceText = ` token for the count.
- **Fix:** a `const kept = next.resource === draft.resource;` line, then `resourceText = text ?? (kept ? resourceText :
  resourceTextOf(next));`. Same behaviour, and `resourceTextOf` is still evaluated only when needed.
- **Files modified:** `packages/devtools/src/model/SimulationSession.ts`
- **Commit:** `0caa34a6` (amended before the verify passed)

**2. [Rule 3 - Blocking] The proving grep matched a local name**
- **Found during:** Task 1
- **Issue:** `const reseeded = seedFrom(...)` matches the grep's `seeded = `.
- **Fix:** the local is `seeding`, as the plan has it, shadowing the constructor's `seeding` const inside `reseed`;
  oxlint is clean.
- **Commit:** `c66c3c46`

## Known Stubs

None.

## Threat Flags

None. The run clear keeps `supersede` (T-74-08) and each of its three callers was gutted once; the draft and resource
text have one assignment each (T-74-09).

## Self-Check: PASSED

- `SimulationSession.ts`, `HeldChoice.ts`, the characterisation, `74-RED-EVIDENCE.md` exist; commits `5022cec1`,
  `c66c3c46`, `0caa34a6` and `6bca8514` are ancestors of HEAD.
