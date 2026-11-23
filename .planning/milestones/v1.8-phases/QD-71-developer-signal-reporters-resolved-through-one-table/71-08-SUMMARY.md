---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
plan: 08
subsystem: mutation-close-and-phase-close
tags: [mutation, stryker, examined, check-pr, requirements]
phase_base: d147287a94a3bb3cad176e4f99bad7a0b76d8939
requires: ["71-07"]
provides:
  - "71-mutation-close.json: the five groups measured on one commit (9a480334), each by its base's invocation; compare exits 0"
  - "71-mutation.mjs: EXAMINED holds the table's static Ignored mutants beyond the base, each shown Killed by a run by hand"
  - "71-RED-EVIDENCE.md: ## The throwaway signal on the closed tree (TS2741 at the table)"
  - "REQUIREMENTS.md: SIGR-01 to SIGR-05 complete (no WX line or row touched)"
affects: []
tech-stack:
  added: []
  patterns: ["a row that speaks everywhere gets an overload whose result has no undefined, so its caller carries no dead guard", "a cache whose staleness is the absence of the value, not a flag beside it"]
key-files:
  created:
    - .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-mutation-close.json
  modified:
    - packages/react/src/DeveloperSignals.ts
    - packages/react/src/GateWriter.ts
    - .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-mutation.mjs
    - .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-RED-EVIDENCE.md
    - .planning/REQUIREMENTS.md
key-decisions:
  - "Decided autonomously: three new Survived mutants were equivalent mutants (no test can kill them), so the source was changed until none existed instead of re-baselining or loosening the scorer: GateWriter's snapshot is `undefined` while stale (no `stale` flag), an update reads the entry its handle wrote (no second existence check after `live`), and `defaultOf` has an overload for a row that speaks everywhere so `contain` calls ReporterThrew's default without `?.`."
  - "Decided autonomously: the Ignored mutants beyond the base (the developer-signal table's module-scope literals and `makeGateRegistry`'s arrow) are admitted through EXAMINED only after a by-hand run with ignoreStatic false killed every one of the 80 Ignored mutants of the grown kinds."
requirements-completed: [SIGR-01, SIGR-02, SIGR-03, SIGR-04, SIGR-05]
duration: 30 min
completed: 2026-11-22
status: complete
commits: 5
plan_head_before: ba78184316417d14516bbe5d2e287e449dbf7bfd
plan_head_after: 40bc1a9e48e2d54a459c1c145481fef77e295ff1
actuals:
  tokens: 8500
  tasks: 2
  commits: 5
---

# Phase 71 Plan 08: The mutation close, the success test on the closed tree, check:pr, SIGR-01 to SIGR-05 complete Summary

The phase leaves no new open mutant in the five files it touched, the throwaway signal is refused at the table on the closed tree, `pnpm check:pr` passes, and SIGR-01 to SIGR-05 are recorded complete.

## Accomplishments

- Task 1 (tracer): scorer self-test (`self-test: 32 passed`), then the five close runs and `record close` calls. The first close (head `ba781843`) failed `compare` on three new Survived mutants and 57 + 1 new Ignored ones; see Deviations for the Survived ones. The final close is on `9a480334`, recorded by `264bfdb1`:

  | group | file | detected/valid | survived | no coverage | ignored | base |
  | --- | --- | --- | --- | --- | --- | --- |
  | `signals` | `DeveloperSignals.ts` | 96/99 | 3 | 0 | 80 | 96/99, 3, 0, 23 |
  | `registry` | `GateRegistry.ts` | 2/2 | 0 | 0 | 1 | 54/56, 2, 0, 0 |
  | `writer` | `GateWriter.ts` | 95/96 | 1 | 0 | 2 | 48/49, 1, 0, 3 |
  | `atoms` | `QadiAtoms.ts` | 34/38 | 4 | 0 | 1 | 36/40, 4, 0, 1 |
  | `engine` | `HydrationEngine.ts` | 128/128 | 0 | 0 | 42 | 126/126, 0, 0, 42 |

  The Survived ones are the base's own, carried by line (`DeveloperSignals.ts` three, `GateWriter.ts` one, `QadiAtoms.ts` four); the registry's two base survivors went with the code that moved into the writer. `compare` exits 0 with its verdict line.
- The Ignored mutants beyond the base: `DeveloperSignals.ts` 32 `StringLiteral ""`, 23 `ObjectLiteral {}` and 2 `ArrowFunction () => undefined`; `GateRegistry.ts` 1 `ArrowFunction () => undefined`. Run by hand from `<S>/stryker.examine.react.mjs` (`stryker.react.mjs` with `ignoreStatic: false`, JSON report to `<S>/examine-react.json`) over those two files, once: 179 mutants, 176 + 3 killed/survived with the 3 survivors being the carried ones at lines 160 and 78. All 80 close Ignored mutants of the grown kinds (79 in `DeveloperSignals.ts` including the base's 19 arrows, 1 in `GateRegistry.ts`), matched by line and column, are Killed there. `EXAMINED` records exactly the excess per file and kind, committed alone as `9a480334`, then every group was re-measured on that commit.
- Task 2: the throwaway `Throwaway: {};` member made `pnpm typecheck` exit `2` with `error TS2741: Property 'Throwaway' is missing ... but required in type 'SignalTable'` at `DeveloperSignals.ts(414,3)`; reverted (`git diff --quiet -- packages` holds); recorded in the evidence (`4e5636f0`). Close scan, `pnpm check:pr` and the requirements marking below.
- Close scan over `git diff d147287a..HEAD`, added lines (each count 0): casts, non-null assertions, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, `console.`, `process.env`, clock reads, `Record<string, unknown>` in `packages/*/src`: 0; mutation-suppression comments: 0; decision number, plan id, requirement id or phase number in source, tests, features and changesets: 0; added lines naming the console rule in `scripts/check-house-style.mjs`: 0; tracked files under `packages` naming a function 71-03 or 71-04 removed: 0. The reservation file's sha256 equals the base facts' (`07a779c9...`), the characterisation and the base record are each touched by one commit since `phase_base`, `api-surface` reads 941, `spec/overview.md` and `QadiProvider.tsx` equal `phase_base`, all seven evidence sections are present.
- `pnpm check:pr` on `4e5636f0` (no code change after it): status 0, last line `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).`; house-style `567 file(s) clean (3 declared switch(es), 68 type-test file(s))`, strict traceability 21 passed, `all 160 invariant(s) traced`, `312 file(s) exist`, `141 ADR(s) traced`, react project and the others green.
- `.planning/REQUIREMENTS.md`: SIGR-01 to SIGR-05 `- [x]` and `Complete` by editing the file (`40bc1a9e`); no WX line or row changed, `requirements.mark-complete` not run.

## Verification

- Task 1 verify (extracted verbatim from the plan): exit 0, `the mutation close holds against the base`.
- Task 2 verify: exit 0, `the phase is closed`, with the one verification-only deviation below.
- `git status --porcelain -- packages spec scripts AGENTS.md .changeset` is empty.

## Deviations from Plan

**1. [Rule 1 - Bug, found by the close] Three new Survived mutants that no test can kill**
- **Found during:** Task 1, the first `compare` (head `ba781843`).
- **Issue:** `GateWriter.ts:164` (`let stale = false` made `true`) and `:200` col 22 (`existing === undefined` made `false`) were the two survivors the base held in `GateRegistry.ts`, moved with the store in 71-03 and so unmappable by line; `DeveloperSignals.ts:234` (`?.` removed from `defaultOf(SIGNALS.ReporterThrew)?.(...)`) was new. Each is equivalent: the first read rebuilds an empty array either way, `live` already implies the entry exists, and `ReporterThrew` speaks everywhere so its default is never undefined. A test cannot kill an equivalent mutant, and the rule forbids re-baselining or weakening the scorer, so the code was changed until none existed.
- **Fix:** `GateWriter.ts` keeps `snapshot` as `ReadonlyArray<GateInstance> | undefined` (undefined is stale; `instances: () => (snapshot ??= [...entries.values()])`) and a handle's `update` reads a `current` entry it holds instead of `entries.get(key)`; `DeveloperSignals.ts` gives `defaultOf` an overload for `speaks: "Everywhere"` whose result is a function, so a row changed to speak under a condition fails to compile at `contain` and the guard that could never run is gone. Behaviour is unchanged: the react project (625 tests), `pnpm typecheck` and oxlint pass.
- **Files modified:** `packages/react/src/GateWriter.ts`, `packages/react/src/DeveloperSignals.ts`
- **Commit:** `ede26ad1` (`refactor(71-08)`, not a `test(71-08)` commit: no test was needed or could have killed them)

**2. [Verification-only] Task 2's verify greps ignored build output**
- The plan's `grep -rlE "<removed names>" packages/react` also matches the gitignored `packages/react/coverage` and `packages/react/node_modules/.vitest-cache`, so it cannot exit 0 on any tree that has run the react tests. I ran the same pattern as `git grep -lE ... -- packages/react` (tracked files), which finds nothing. Nothing a gate checks was weakened.

**Total deviations:** 1 auto-fixed (Rule 1), 1 verification-only. **Impact:** one source commit the plan did not list, behaviour-preserving, made before the final close so every group is measured on `9a480334`.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file surface.

## Self-Check: PASSED

- `71-mutation-close.json` found, the five groups on `9a480334`, the record commit `264bfdb1` follows it.
- Commits found as ancestors of HEAD: `ede26ad1`, `9a480334`, `264bfdb1`, `4e5636f0`, `40bc1a9e`; every one ends with exactly one `Co-Authored-By: Claude Opus 5.5` trailer.
- No Stryker config left in the repository (`<S>/stryker.examine.react.mjs` lives in the scratch directory).
