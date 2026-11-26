---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 11
subsystem: build
tags: [folds, react, gate-registry, barrels]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the named react barrel (91-BARRELS.md), 91-check.mjs structural/commit/variant, 91-pinned-check.mjs, 91-earlier-checks.mjs
provides:
  - makeGateRegistry and GateRegistryOptions declared in GateWriter.ts, and the visibility-only GateRegistry.ts deleted
  - the gate fold's structural block in 91-FOLDS.md (madge 248)
  - gate-collision-ignored seen failing on the existing suite
affects: [91-12 (the sequence fold appends its block), 91-15 (named-barrel rule), 91-18/19 (prose that names GateRegistry.ts)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: f5be28682ce42a92620a5cb64a5178637c94f295
plan_head_after: f50552ac76c8483f4487f5fcfe241d052dce3dfe
commits: 2

actuals:
  tokens: 4000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a public constructor is declared beside its store; the barrel names the six public names, so the writer slot stays unreachable"

key-files:
  created: []
  modified:
    - packages/react/src/GateWriter.ts
    - packages/react/src/QadiAtoms.ts
    - packages/react/src/QadiProvider.tsx
    - packages/react/src/DevtoolsFeed.ts
    - packages/react/src/hooks.ts
    - packages/react/src/index.ts
    - packages/react/test/DecisionOutcome.tst.ts
    - packages/react/test/DeveloperSignalReporters.test.tsx
    - packages/react/test/GateRegistration.characterisation.test.tsx
    - packages/react/test/GateRegistry.store.test.ts
    - packages/react/test/GateRegistry.test.tsx
    - packages/react/test/GateWriter.reconcile.test.ts
    - packages/react/test/GateWriter.test.tsx
    - packages/react/test/QadiProvider.tst.ts
    - packages/react/test/support/gates.ts
    - packages/react/test/support/trees.tsx
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-FOLDS.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md
  deleted:
    - packages/react/src/GateRegistry.ts

key-decisions:
  - "The gate registry's collision report needs no born test: the existing suite already fails the ignored-onIdCollision variant on seven tests"

requirements-completed: []

duration: 25min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 11: Gate fold Summary

**`makeGateRegistry` and `GateRegistryOptions` are declared in `GateWriter.ts` beside the store they build; `GateRegistry.ts` is gone, the public surface is unchanged (948 exports, gate 13 at 943), and the writer slot (`gateWriterFor`, `reconcile`, `buildGateRegistry` and the writer types) stays unreachable from the barrel.**

## Accomplishments

- Source side (staged by Task 1, committed with Task 2): `GateWriter.ts` takes `import { reporterFor, SIGNALS } from "./DeveloperSignals.ts";` beside its `@qadi/core` type import, declares `GateRegistryOptions` and `makeGateRegistry` verbatim under a section heading, and carries `GateRegistry.ts`'s long doc as that section's block comment (the registry's two-views, no-React-state and off-means-absent paragraphs; the pointer to `GateWriter.ts` reads "`buildGateRegistry`, above"). Its header now says the module is React-free and below the atom set, that its one local import is `DeveloperSignals.ts`, that the barrel names `makeGateRegistry`, `GateRegistryOptions` and the four public types here and nothing else, and carries the recast justification (the constructor sits with its store because a named barrel keeps the store's other names out). `GateRegistry.ts` is deleted. `QadiAtoms.ts:32`, `QadiProvider.tsx:49` (that line only), `DevtoolsFeed.ts:44` and `hooks.ts:13` import from `./GateWriter.ts`.
- Barrel: regenerated with the recorded generator; the module list's `./GateRegistry.ts` became `./GateWriter.ts only GateInstance GateKind GateRegistry GateRegistryOptions GateRenderState makeGateRegistry` (8 modules, 62 names, 0 collisions, 0 kind replacements). The regeneration changed the two specifiers only (lines 21 and 28 of `packages/react/src/index.ts`); `buildGateRegistry`, `gateWriterFor`, `reconcile`, `GateHandle`, `GateWriter`, `GateIdentity`, `Registered`, `GateWanted` are not named. `homes` (every name at its home, in its kind's group) and `barrels` (surface equals the base) exit 0.
- Tests: ten files, declared import lines only. Where a region held two imports from the same module in the same kind, they merged (`GateWriter.reconcile.test.ts`: value `gateWriterFor, makeGateRegistry, reconcile`, type list gains `GateRenderState`; `GateWriter.test.tsx`: value `gateWriterFor, makeGateRegistry`, type list gains `GateRenderState`); elsewhere the line was re-pointed. `91-pinned-check.mjs`: `516 held, 26 declared (12 applied), 3 born, 27 earlier-held, clean`.

### Structural block (`91-FOLDS.md`, every command exit 0)

| Commit | madge files | circular | build | typecheck | surface (gate 13 at 943) | gate 14 | house-style |
| ------ | ----------: | -------- | ----- | --------- | ------------------------ | ------- | ----------- |
| `45e366ac` gate fold | 248 | exit 0 | exit 0 | exit 0 | equal to the base, 948 exports | exit 0, 9 packages, 528 runtime exports | exit 0, 649 files |

Also: `91-check.mjs vitest packages/react/test` (705 tests in 45 files, all passed), `scan-ids` and `scan-forbidden` clean, `91-check.mjs commit` accepts the 17 paths under the subject, `trailers` (37 commits, each with the one trailer), `homes`, `barrels`.

### The collision report seen failing (`91-RED-EVIDENCE.md`)

| Label | Scratch | Edit | Result |
| ----- | ------- | ---- | ------ |
| `gate-collision-ignored` | `gate-collision` at `45e366ac6d` | `makeGateRegistry` passes `undefined` to `buildGateRegistry` instead of the reporter resolved under `onIdCollision` | exit 1; seven titles seen failing across `DeveloperSignals.test.ts`, `GateRegistry.store.test.ts`, `GateWriter.reconcile.test.ts` and `DeveloperSignalReporters.test.tsx`, among them "three registrations of one id with no reporter warn once in development, in the exact words" and "says nothing in production unless onIdCollision is supplied" |

The existing suite fails the variant, so `packages/react/test/GateRegistryFold.test.ts` was not written and no `test(91-11)` commit exists; `seen-failing packages/react/test/GateRegistryFold.test.ts --if-present` exits 0 ("absent"). The scratch clone `gate-collision` is still under the scratch root.

### Earlier-phase checks

`node 91-earlier-checks.mjs` run once, after both commits: exit 0, `87 runs, all match their rows`. The prediction held: the 86 pinned row moved (`86-pinned-check.mjs: exit 1: packages/react/test/DecisionOutcome.tst.ts is reported as M against its base`, the row's recorded movement), and `86-check.mjs provider-forwards-only` stays exit 0 ("the provider builds the owner once and only forwards to it") after the `QadiProvider.tsx` line-49 edit.

## Task Commits

1. Tasks 1 and 2 (one commit, as the plan requires): `45e366ac` `refactor(91-11): fold the gate registry constructor into the gate writer` (17 paths, `GateRegistry.ts` deleted); `91-check.mjs commit` accepts it.
2. Task 3 record: `f50552ac` `docs(91-11): record the gate fold verdict` (`91-FOLDS.md`, `91-RED-EVIDENCE.md`); `91-check.mjs commit` accepts it.

## Deviations from Plan

### Plan defects

**1. Task 1's second acceptance criterion names a stale HEAD subject.** It says `git log -1 --format=%s` is still `docs(91-10): record the core fold verdicts and the span rules biting`; HEAD at task start was `docs(91-10): complete the core folds plan` (the summary commit lands after that record commit). The criterion's intent (no commit made between the two tasks) held: the index held exactly the seven paths and HEAD was unchanged until the single fold commit. No file was edited for this.

### Choices the plan left open (autonomous, most complete option)

**2.** The plan says to append `GateRegistry.ts`'s doc "as the section doc and as `makeGateRegistry`'s doc". The long doc sits once, as the section's block comment (`/* … */`, detached, under a rule heading), and `makeGateRegistry` keeps its own short doc ("Builds an empty gate registry …"); copying the long text twice would state the registry's contract in two places.

**3.** `QadiProvider.tsx` now has two imports from `./GateWriter.ts` (line 49 a type import, line 50 the value import), as `QadiAtoms.ts` already did; the plan holds the provider to line 49, so they were not merged.

## Known Stubs

None.

## Threat Flags

None. T-91-24 (a host writing a registration through `gateWriterFor`) is mitigated by the barrel naming six public names at `./GateWriter.ts`, with `homes`, the surface compare (948 exports) and gate 14 (9 packages, 528 runtime exports) clean; T-91-26 (a collision report dropped by the folded constructor) is mitigated by `gate-collision-ignored` seen failing on seven existing tests.

## Self-Check: PASSED

- `packages/react/src/GateRegistry.ts` does not exist; `GateWriter.ts` declares `makeGateRegistry` and `GateRegistryOptions` and imports `./DeveloperSignals.ts`; no `GateRegistry.ts` specifier remains under `packages/*/src` or `packages/*/test`.
- Commits `45e366ac` and `f50552ac` are ancestors of HEAD, each with the one trailer.
- `91-FOLDS.md` holds the gate block with every command exit 0 and `madge files: 248`; `91-RED-EVIDENCE.md` holds `gate-collision-ignored` with exit 1 and `- seen failing:` lines.
