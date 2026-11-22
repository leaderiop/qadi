---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
plan: 01
subsystem: testing
tags: [stryker, mutation-base, characterisation, dock-model, devtools]

requires: []
provides:
  - "72-mutation.mjs: the phase's mutation scorer (groups model, store; --restart; self-test of 29 cases)"
  - "72-mutation-base.json: DockModel.ts and ExternalStore.ts measured on phase_base"
  - "packages/devtools/test/dockModelFixtures.ts: eight fixtures two dock test files share"
  - "DockModel.characterisation.test.ts: 15 rows pinning the three computed stores through makeDockModel"
  - "72-RED-EVIDENCE.md opened with the characterisation green on the base"
affects: [72-02, 72-04, 72-05, 72-06, 72-08]

phase_base: 74f631ada0e04a6003e4dbf959db93ca161f6136
plan_head_before: 74f631ada0e04a6003e4dbf959db93ca161f6136
plan_head_after: 13be13cfaf6c545c8a459b8cf304295f21cc3b3a

actuals:
  tokens: 12500
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "one Stryker group per file, one record per commit, recorded right after its own run"
    - "a characterisation committed alone before any source change"

key-files:
  created:
    - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-mutation.mjs
    - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-mutation-base.json
    - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-RED-EVIDENCE.md
    - packages/devtools/test/dockModelFixtures.ts
    - packages/devtools/test/model/DockModel.characterisation.test.ts
  modified:
    - packages/devtools/test/model/DockModel.test.ts

key-decisions:
  - "The mutation base was measured before any file of the phase existed (reverses CONTEXT's suggested order), so a phase test cannot inflate it"
  - "The characterisation takes the base's behaviour as truth; every row matched the plan's expected value, so none was corrected"

requirements-completed: []  # DERV-01, DERV-05, WX-05, WX-06, WX-07 stay Pending by instruction; only 72-08 marks requirements

duration: ~35min
completed: 2026-11-22
status: complete
---

# Phase 72 Plan 01: Mutation base and characterisation of the dock model's computed stores Summary

**A committed Stryker scorer with its base record of `DockModel.ts` (114/114) and `ExternalStore.ts` (41/42), then a 15-row characterisation of the `diagnostics`, `questions` and `services` stores through `makeDockModel`, green on the unchanged base.**

## Performance

- **Duration:** about 35 min (start time was not captured at the first command; estimated from the log timestamps)
- **Tasks:** 2 of 2
- **Files:** 5 created, 1 modified; no `packages/*/src` file touched

## Accomplishments

- Task 1 (tracer): gate lines and the proving grep recorded on the base, the scorer written from `71-mutation.mjs`
  (self-test `29 passed`, oxlint clean), both Stryker groups measured one at a time with nothing else running, one
  commit holding the scorer and its record.
- Task 2: the eight shared fixtures moved into `dockModelFixtures.ts` (`DockModel.test.ts` still passes 61 tests, no
  title or value changed), then the characterisation, then the evidence file.

## Task Commits

1. Task 1: `0df84562` docs(72-01): record the mutation base of the dock model and its store
2. Task 2a: `8d3c59b4` test(72-01): share the dock model test fixtures
3. Task 2b: `66ba2bdf` test(72-01): characterise the three computed stores of the dock model
4. Task 2c: `13be13cf` docs(72-01): record the characterisation green on the base

## Base facts

Copied from `<scratch>/base-facts.txt` (scratch is `$TMPDIR/qd72`):

```
house-style: 569 file(s) clean (3 declared switch(es), 68 type-test file(s))
api-surface: 941 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 154 reference(s) resolve
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 118 block(s) compile
spec-revise: every Revision matches its newest Change History entry
| PASS   | decisions -> traceability                  | 141 ADR(s) traced
| PASS   | invariants -> traceability                 | all 160 invariant(s) traced
| PASS   | ADR Document ID = file number              | 117 ADR(s) agree
| PASS   | §4 test files -> disk                     | 312 file(s) exist
reservation-sha256: 07a779c95ed6f98639077d67dedd68179830521c7aeb5adf925ad6b21749836f
```

Stryker base (`72-mutation-base.json`, both groups on `phase_base`):

| Group | File | Detected / valid | Survived | NoCoverage | Ignored |
| --- | --- | --- | --- | --- | --- |
| model | `packages/devtools/src/model/DockModel.ts` | 114/114 | 0 | 0 | 10 |
| store | `packages/devtools/src/model/ExternalStore.ts` | 41/42 | 1 | 0 | 1 |

The one base survivor is `ExternalStore.ts:89`, a `ConditionalExpression -> false` in `sameElements`
(`a === b || ...`). The scorer carries it through `git diff -U0`, so a close that keeps it passes and a new one fails.

The proving grep of the dock model on the base (`/usr/bin/grep -nE "let (last|fed|supplied|closed)|closed|remerge|rejoin|reservice|key\.[A-Za-z]+ === " packages/devtools/src/model/DockModel.ts`), 26 lines:

```
206:  let fed = diagnosticsFeed.getSnapshot();
207:  let supplied = inputs.reading;
213:  const remerge = () => {
220:  diagnosticsFeed.subscribe(remerge);
229:  // pairs a question from one moment with a guard from another. A closed model joins nothing further.
230:  let closed = false;
239:  let lastJoin = keyNow();
241:  const rejoin = () => {
242:    if (closed) return;
245:      key.feed === lastJoin.feed &&
246:      key.supplied === lastJoin.supplied &&
247:      key.unsampled === lastJoin.unsampled
264:  let lastServices = servicesKeyNow();
266:  const reservice = () => {
267:    if (closed) return;
270:      key.wiring === lastServices.wiring &&
271:      key.activity === lastServices.activity &&
272:      key.portCalls === lastServices.portCalls &&
273:      key.unsampled === lastServices.unsampled
281:  gatesFeed.subscribe(rejoin);
282:  shownReading.subscribe(rejoin);
283:  shownReading.subscribe(reservice);
286:      closed = true;
316:      // The feed re-reads the registry and the thunk before `remerge`, whose publish joins through them: one
324:      // A reading that moved is a new merged snapshot, which rejoins through its own subscription.
325:      remerge();
```

## Verification

- Task 1 verify (`base measured and recorded`): exit 0. The self-test, oxlint, the head and invocation checks of the
  record, and "the base record is the first commit after phase_base" all hold.
- Task 2 verify (`characterisation green on the base`): exit 0. 15 distinct passing titles, `DockModel.test.ts` 61
  passing, the devtools project green, oxlint clean, `house-style: 571 file(s) clean`, no forbidden token, no added
  line over 90 columns, three commits each with the one trailer, tree clean.
- `pnpm exec tsc -p tsconfig.test.json`: no error (the test half of `pnpm typecheck`).

Both verify scripts were run from copies of the plan's `<automated>` bodies saved outside the repository (the plan's
`bash -c '...'` wrapper unwrapped), unchanged apart from that; no check was weakened.

## Deviations from Plan

None - plan executed exactly as written. Two notes that are not deviations:

- Rows 13 and 14, which the plan reasoned from the code rather than ran, matched the base on the first run; no row
  took a value other than the plan's.
- The fixtures that had no doc comment in `DockModel.test.ts` (`wiringNamed`, `activityOf`, `logOf`, `heardOf`) gained
  one-line comments in the shared module; the plan asked for "each with its existing doc comment".

## Known Stubs

None.

## Threat Flags

None. The plan adds a planning-side script and test files; no endpoint, auth path or trust-boundary schema.

## Next Phase Readiness

Ready for 72-02. `phase_base` is in `$TMPDIR/qd72/phase_base` and in this file's frontmatter. The characterisation and
the base record are not to be edited again in this phase.

## Self-Check: PASSED

- Files exist: the scorer, the base record, the evidence file, the fixtures module and the characterisation (checked
  by the Task 1 and Task 2 verifies and the commit file lists).
- Commits `0df84562`, `8d3c59b4`, `66ba2bdf`, `13be13cf` are on `arch-wave-13`; `git rev-list --count
  74f631ad..HEAD` was 4 before this summary's commit.
