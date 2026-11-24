---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 16
subsystem: mutation-close
tags: [stryker, mutation, close-scans, refactor, devtools]
requires: ["79-15"]
provides:
  - 79-mutation-close.json, the five groups measured on one head with 0 Survived and 0 NoCoverage each, compare exiting 0
  - five tests that close the base survivor and the first close's survivors (list identity, the gates feed's held subscription and reads, the NaN list)
  - the bare build of the timeline and gates feeds applies no inputs (orchestrator-decided refactor)
  - six module-scope arrows entered in EXAMINED, each Killed by hand with ignoreStatic false
affects: [79-17]
key-files:
  created:
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-mutation-close.json
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-16-SUMMARY.md
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/model/GatesFeed.ts
    - packages/devtools/test/model/ExternalStore.test.ts
    - packages/devtools/test/model/GatesFeed.test.ts
    - packages/devtools/test/model/DockModel.test.ts
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-mutation.mjs
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-16-PLAN.md
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-RED-EVIDENCE.md
key-decisions:
  - "A bare build applies no inputs: the build-time application of the always-empty record is deleted, not pinned"
  - "The by-hand clause of the Task 1 verify judges undetected static mutants against the base's Ignored multiset by kind"
  - "A scan that found two evidence gaps was fixed at its cause: the two registry-read cells the first scratch edit passed were each shown failing against an edit of their own"
requirements-completed: []
metrics:
  duration: 95min
  completed: 2026-11-24
status: complete
commits: 5
plan_head_before: 74583ee9df6a7412c46f974395a52979bb7cd911
plan_head_after: bddd03d00d7df321bff584347ab5af66b7da4117
actuals:
  tokens: 14000
  tasks: 2
  commits: 5
---

# Phase QD-79 Plan 16: The mutation close

**All five mutated model files close at 0 Survived and 0 NoCoverage on one head, the dock keeps its score of 1, `compare` exits 0, and every close scan passes on the final tree.**

## Accomplishments

- `0729b9eb` (`test(79-16)`, the first executor): five tests close the base survivor `ExternalStore.ts:113` (a list holding NaN is the same as itself) and the survivors the first close found in the gates feed (the identity kept by `readRegistry`, the held subscription kept by a new thunk alone, the held thunk and interval kept by a new registry alone) and the dock model (both rails hand one list).
- `b20a807f` (`refactor(79-16)`, orchestrator-decided): see Deviations.
- `c9186646` (`docs(79-16)`, orchestrator-decided): the verify text fix, see Deviations.
- `3b9a7d3e` (`docs(79-16)`): the close record alone, with the scorer's six `EXAMINED` entries.
- `bddd03d0` (`docs(79-16)`): two registry-read cells shown failing, see Deviations.

### Mutation close (detected/valid, base then close)

| File | Base | Close | Survived | NoCoverage | Ignored |
| ---- | ---- | ----- | -------- | ---------- | ------- |
| `TimelineFeed.ts` | 41/41 | 35/35 | 0 | 0 | 10 to 11 |
| `DiagnosticsFeed.ts` | 73/73 | 58/58 | 0 | 0 | 13 to 14 |
| `GatesFeed.ts` | 117/117 | 119/119 | 0 | 0 | 3 to 4 |
| `ExternalStore.ts` | 77/78 | 88/88 | 1 to 0 | 0 | 2 to 3 |
| `DockModel.ts` | 72/72 | 72/72 | 0 | 0 | 10 to 12 |

The dock score is 72/72 against a base of 72/72 (cross-multiplied, not below). The scores of the timeline and diagnostics files fell only because killed mutants went with the code that held them.

### Examined entries (`EXAMINED` in `79-mutation.mjs`)

Each is one `ArrowFunction () => undefined` mutant of a module-scope arrow the phase added, run by hand with `ignoreStatic: false` on the final head and Killed there:

- `TimelineFeed.ts`: `completeTimelineInputs` (1)
- `DiagnosticsFeed.ts`: `completeDiagnosticsOptions` (1)
- `GatesFeed.ts`: `completeGatesInputs` (1)
- `ExternalStore.ts`: `sameFieldsOrAbsent` (1)
- `DockModel.ts`: `completeDockInputs` and `feedInputsOf` (2)

### Inherited static survivors, out of scope

Six static mutants survive the by-hand run. All six are in the base's own Ignored lists and were not touched by this phase, so they are out of scope here:

- `TimelineFeed.ts:150`, `subscribe: () => () => {}` of the idle status readout, to `() => undefined` (equivalent: a caller of the idle readout never reads what `subscribe` returns)
- `DockModel.ts:240`, `Unwatched: () => ({})`, to `() => undefined` (equivalent)
- the three `Effect.fn` span-name literals: `TimelineFeed.ts:161`, `DiagnosticsFeed.ts:160`, `DockModel.ts:310` (a candidate for a later span-name test)
- `GatesFeed.ts:116`, `UNREADABLE_KEY`

## Deviations from Plan

### Orchestrator-decided corrections

**1. [Orchestrator decision, 2026-11-24 - dead code] A bare build applies no inputs**
- **Found during:** the first close, which left five equivalent survivors at head 74583ee9
- **Issue:** since the constructors lost their parameters, the build applied an input record that is always empty: `makeTimelineStore({ capacity: held.capacity })` (the store's own default), the build-time `readSource(held.source)` (a bare build's source is `undefined`, the empty source that ends at once) and the gates feed's build-time `watch(registryNow)`, `publish(readRegistry(), readAsked())` and `cadence()` (nothing handed, so no subscription, nothing new to publish and no cadence to start). Mutants of them were equivalent, so no test could kill them.
- **Fix:** the three gates calls and the timeline's build-time read are deleted, the store is built with `makeTimelineStore()`, and the doc comment of `GatesFeed.ts` no longer says the build reads the thunk. `restart` and `configure` keep their reads. Behaviour is preserved: the whole devtools project (80 files, 1867 tests), `79-pinned-check.mjs` (15 tests), `79-characterisation-check.mjs` and `pnpm typecheck` pass after it, and the close shows the code that remains still held (0 Survived).
- **Files modified:** `TimelineFeed.ts`, `GatesFeed.ts`, `79-RED-EVIDENCE.md` (entries R1 to R3 under "79-16 the close")
- **Commit:** b20a807f

**2. [Orchestrator decision, 2026-11-24 - verify text] The by-hand clause judges only what the phase added**
- **Found during:** the first executor's Task 1 verify run
- **Issue:** the clause `bad = static && !detected` over the whole by-hand report fails on six static survivors that all sit in the base's own Ignored lists (listed above).
- **Fix:** the plan's verify now judges the by-hand report's undetected static mutants against the base's Ignored multiset by kind (as `judge` does): one beyond what the base held fails, an inherited one does not. The same commit corrects the verify's `selftest-10.log` to `selftest-16.log`. The scorer's logic and `79-mutation-base.json` are not touched.
- **Files modified:** `79-16-PLAN.md`
- **Commit:** c9186646

### Auto-fixed Issues

**3. [Rule 2 - Missing critical evidence] Two registry-read cells never seen failing**
- **Found during:** Task 2's title scan
- **Issue:** `DockRegistryReads.test.tsx` (the read-count pin of an earlier plan) added four titles. The earlier scratch edit made two fail and the other two passed it, so "a registry whose subscribe throws is subscribed again by each build and read never" and "a re-render that moves an input of the gates feed reads the registry once" were on no `- failed:` line. The two lines that did exist also carried a parenthetical after the title, which the scan reads as part of it.
- **Fix:** each of the two cells was shown failing against an edit of its own (S7, S8 in `79-RED-EVIDENCE.md`), the source restored from a copy (`git status --porcelain -- packages` empty), and the two earlier lines now name the title alone with the counts in the sentence after them. No test or source changed.
- **Files modified:** `79-RED-EVIDENCE.md`
- **Commit:** bddd03d0

## Close scans

Every scan ran on the final tree (HEAD `bddd03d0`) from `phase_base` `910cb7838ac562608880f8e3b067fb2cc4c014b3`; the Task 2 verify of the plan exits 0 and the Task 1 verify exits 0.

- Manifests, lockfile, workspace file, budgets, gates and configs (`AGENTS.md`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, each `packages/*/package.json`, `stryker*.mjs`, the tsconfigs, `.oxlintrc.json`, `scripts/check-house-style.mjs`, `scripts/check-dod-table.mjs`, `scripts/run-check.mjs`, `scripts/lib`, the definitions of done): unchanged.
- Changesets: exactly `.changeset/devtools-feeds-take-inputs-through-configure.md` added, none deleted.
- Tags: none contain `phase_base`.
- House style: `house-style: 596 file(s) clean (3 declared switch(es), 76 type-test file(s))`.
- Forbidden constructs in added source and test lines (casts, `!`, `any`, `switch`, `fnUntraced`, `Record<string, unknown>`, `async`, `await`, `process.env`, `console`, clocks, module-scope `let`/`var`, `.skip`, `.todo`, `.only`, `.fails`): none.
- Mutation-suppression comments in added lines: none.
- Line length of added source lines: none past 90 columns.
- Id scan of new lines in `packages`, `spec`, `apps` and `.changeset` (decision numbers, plan ids, requirement ids, placeholders, phase wording): none.
- Every added test title in `packages/devtools/test` is on a `- failed:`, `- red on the base:` or `- red before the rule:` line of `79-RED-EVIDENCE.md`: yes, after deviation 3.
- Base-side test commits (`test(79-02)` to `test(79-06)`) precede the first source change: yes.
- Pinned check: `pinned: 15 tests hold their assertions`.
- Characterisation check: `characterisation: packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)`.
- Scorer self-test: `self-test: 32 passed`.

## Decisions Made (autonomous)

- Both orchestrator decisions were carried out as given (deviations 1 and 2); the refactor changed no spec, ADR, README, changeset or upgrade text, because none of them named the bare build's read.
- The six `EXAMINED` entries are keyed by the kind `ArrowFunction () => undefined` with the count each file gained, the form the scorer already reads; the doc comment above `EXAMINED` names each arrow and the cell that kills it.
- The evidence gap was closed by showing the two cells failing, not by narrowing the scan.

## Risks for later plans

- Cosmetic items stay for the code-review pass: the split imports in `ConfigureRule.test.ts` and the over-wide constructor signatures.
- If a review fix touches `packages/`, the close is measured again for all five groups on one head with `--restart` and committed alone (`docs(79-16): re-record the mutation close after review`), and the `EXAMINED` line comment may need new line numbers (it names arrows, not lines).
- The six inherited static survivors are a candidate for a later span-name test and a later idle-readout test; they are not this phase's.

## Known Stubs

None.

## Threat Flags

None. The change deletes build-time calls of two feeds and adds tests and records: no endpoint, auth path, file access or schema change.

## Self-Check: PASSED

- FOUND: .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-mutation-close.json
- FOUND commits: 0729b9eb, b20a807f, c9186646, 3b9a7d3e, bddd03d0
