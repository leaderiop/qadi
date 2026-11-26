---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 13
subsystem: react
tags: [folds, react, hydration, barrels, structural-parameter]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the named react barrel (91-BARRELS.md), 91-check.mjs structural/commit/variant/homes, 91-pinned-check.mjs, 91-earlier-checks.mjs, the barrel generator under the scratch root
provides:
  - HydrationTarget, the one statement of hydrate's signature, in HydrationEngine.ts; QadiAtoms extends it
  - hydrateDecisions takes any value with the hydrate capability (a public .d.ts parameter widening, no new public name)
  - dehydrateDecisions and hydrateDecisions declared in HydrationEngine.ts under the ADR-QD-028 security paragraph; Hydration.ts deleted
  - react's barrel names each hydration name at its declaring module
  - the hydration fold's two structural blocks in 91-FOLDS.md (madge 247, then 246)
  - hydrate-target-red and the three negative variants in 91-RED-EVIDENCE.md
affects: [91-14 (the packed consumer's probes for hydrateDecisions, WX-03), 91-16 (ADR-QD-204 and ADR-QD-037/039 notes), 91-18 (prose citations of Hydration.ts)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 57b8cd1f92f19458e1e6c4bca9ba5241817edece
plan_head_after: 45a691126f797c5a120f659e1c9cc20611954c51
commits: 3

actuals:
  tokens: 9000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a capability seam is a package-private interface the owner of the capability extends, so the public entry point can take it without importing the owner (no cycle)"

key-files:
  created:
    - packages/react/test/HydrationTarget.tst.ts
  modified:
    - packages/react/src/HydrationEngine.ts
    - packages/react/src/QadiAtoms.ts
    - packages/react/src/index.ts
    - packages/react/test/DecisionOutcome.test.ts
    - packages/react/test/Hydration.lifetime.test.ts
    - packages/react/test/Hydration.test.ts
    - packages/react/test/Hydration.tst.ts
    - packages/react/test/HydrationCounts.test.ts
    - packages/react/test/HydrationPayload.test.ts
    - packages/react/test/QadiAtoms.test.ts
    - packages/react/test/UntrustedSeams.test.ts
    - scripts/check-house-style.mjs
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-FOLDS.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md
  deleted:
    - packages/react/src/Hydration.ts

key-decisions:
  - "hydrateDecisions takes a package-private HydrationTarget; QadiAtoms extends it, so hydrate's signature is stated once and Hydration.ts folds without the cycle the fold as written closes"

requirements-completed: []

duration: 60min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 13: Hydration fold Summary

**`hydrateDecisions` takes any value with the `hydrate` capability through a package-private `HydrationTarget` that `QadiAtoms` extends, which removed the cycle and let `Hydration.ts` fold into `HydrationEngine.ts`; the public surface is unchanged (948 exports, gate 13 at 943) and `HydrationTarget` appears in no barrel and no dependent's declaration.**

## Accomplishments

- Structural commit (`0d8c82e8`): `HydrationEngine.ts` declares and exports `HydrationTarget` after `HydrateOptions`, carrying `QadiAtoms.hydrate`'s doc moved verbatim. `QadiAtoms extends HydrationTarget`, lost its `hydrate` member and the imports that left unused (`DehydratedDecisions`, `HydrateOptions`, `InitialValues`); the implementation arrow is unchanged. `hydrateDecisions` takes `HydrationTarget`, `Hydration.ts` lost its `QadiAtoms` import, and the doc's last paragraph delegates to the target's `hydrate`. `pnpm circular`: 247 files, clean.
- Fold (`b06f18ce`): `dehydrateDecisions` and `hydrateDecisions` and their docs sit at the end of `HydrationEngine.ts` under an "entry points" section; the header carries the pure-and-synchronous sentence, the ADR-QD-028 security paragraph, and says the module is package-private except the names the barrel names here (ADR-QD-039, ADR-QD-204), keeping the "imports nothing from `QadiAtoms.ts` or `QadiProvider.tsx`" sentence. `Hydration.ts` and its re-export block are deleted. `pnpm circular`: 246 files, clean.
- Barrel: regenerated with the recorded generator; the module list's `./Hydration.ts` became `./DeveloperSignals.ts only HydrationDrop HydrationDropReporter`, `./HydrationEngine.ts only DehydrateOptions DehydratedDecisions DehydratedEntry HydrateOptions dehydrateDecisions hydrateDecisions`, `./HydrationEvent.ts only DecisionEntry` and `./SeededDecision.ts only AllowDisclosure ClientDecision DenyDisclosure SeededAllow SeededDeny SeededDecision isSeeded permits` (11 modules, 62 names, 0 collisions, 2 kind replacements: `AllowDisclosure` and `DenyDisclosure` pinned `type` from the base snapshot). `homes` and `barrels` exit 0. `HydrationTarget`, `hydrateWith`, `dehydrateWith`, `InitialValues` and the seed slots are named in no barrel; `packages/devtools/src/model/Hydration.ts` is untouched.
- Tests: the eight hydration-group files and `HydrationTarget.tst.ts` changed import lines only, each name now imported from its home module. `91-pinned-check.mjs`: `516 held, 26 declared (26 applied), 4 born, 27 earlier-held, clean`.
- `scripts/check-house-style.mjs`'s multi-line-rename example (`Policy as PolicySchema`) now names `packages/react/src/HydrationEngine.ts`, the one file under `packages/*/src` that holds such a continuation-line rename (`grep -c 'packages/react/src/Hydration.ts'` is 0).

### The structural parameter pin, RED first (`91-RED-EVIDENCE.md`)

`packages/react/test/HydrationTarget.tst.ts` (four titles, positive pins and `not.toBeAssignableTo` only; `NOT_CALLABLE_PIN_BUDGET` unchanged, `[not-callable-pin]` clean).

| Label | Scratch | Edit | Result |
| ----- | ------- | ---- | ------ |
| `hydrate-target-red` | `hydration-red` at `57b8cd1f92` (HEAD) | the born file added, no source change | exit 1 in both tstyche passes: `Expression is not callable with the given arguments. Argument of type '{ readonly hydrate: Written; }' is not assignable to parameter of type 'QadiAtoms'. Type … is missing the following properties from type 'QadiAtoms': runtime, subject, decision, decisions, and 3 more.`; `hydrateDecisions accepts any value that has the hydrate capability` seen failing (1 failed, 3 passed) |
| `hydrate-target-atoms-lack-hydrate` | `hydrate-target-neg` at `0d8c82e866` | `QadiAtoms` stops extending `HydrationTarget` | exit 1: `an atom set is a hydrate target`, `the atom set states hydrate through the one signature` seen failing |
| `hydrate-target-accepts-anything` | `hydrate-target-neg` | `hydrateDecisions`' parameter also accepts `{ readonly decision: unknown }` | exit 1: `a value without hydrate is not a hydrate target` seen failing |

After commit A all four pass in both passes (`4 passed, 4 total` each). `91-check.mjs seen-failing packages/react/test/HydrationTarget.tst.ts`: 4 titles, each seen failing.

### Structural blocks (`91-FOLDS.md`, every command exit 0)

| Commit | madge files | circular | build | typecheck | surface (gate 13 at 943) | gate 14 | house-style |
| ------ | ----------: | -------- | ----- | --------- | ------------------------ | ------- | ----------- |
| `0d8c82e8` structural parameter | 247 | exit 0 | exit 0 | exit 0 | equal to the base, 948 exports | exit 0, 9 packages, 528 runtime exports | exit 0, 648 files, 83 type-test files |
| `b06f18ce` hydration fold | 246 | exit 0 | exit 0 | exit 0 | equal to the base, 948 exports | exit 0, 9 packages, 528 runtime exports | exit 0, 647 files, 83 type-test files |

Also: after `pnpm build`, `grep -rl HydrationTarget packages/devtools/lib packages/http/lib` printed nothing (react's own `Hydration.d.ts`, `HydrationEngine.d.ts` and `QadiAtoms.d.ts` hold it, by relative import); gate 14's escape check: 257 packed `.d.ts`, none names a path outside its package or into `src/`; `pnpm spec:api` 943 documented; `91-check.mjs vitest packages/react/test` (705 tests in 45 files, all passed, at each commit); `pnpm test:tstyche` 83 files green in both passes at the fold; `scan-ids`, `scan-forbidden`, `trailers` (44 commits, each with the one trailer), `barrels`, `homes` all exit 0; `91-check.mjs commit` accepts all three subjects with their path sets.

### Earlier-phase checks

`node 91-earlier-checks.mjs` run once, after both code commits: exit 0, `87 runs, all match their rows`. The prediction held: `86-pinned-check.mjs` moved to exit 1 (`packages/react/test/DecisionOutcome.test.ts is reported as M against its base, not unchanged`, the row's recorded movement for the hydration-group files), and its row matched. The 89 and 90 pinned rows still show their earlier recorded movers (`SequenceIntegrity.ts was deleted`, `PortSpan.test.ts … line 19`), also matched.

## Task Commits

1. Task 1: `0d8c82e8` `feat(91-13): hydrateDecisions takes any value with the hydrate capability` (four paths); `91-check.mjs commit` accepts it.
2. Tasks 2 and 3 (one commit, nothing committed between): `b06f18ce` `refactor(91-13): fold the hydration entry points into the hydration engine` (13 paths, `Hydration.ts` deleted); `91-check.mjs commit` accepts it.
3. Task 3 record: `45a69112` `docs(91-13): record the hydration fold verdicts` (`91-FOLDS.md`, `91-RED-EVIDENCE.md`).

## Deviations from Plan

### Plan defects

**1. The `'QadiAtoms'` failing text is not recorded by the tool.** Task 1's acceptance wants `91-RED-EVIDENCE.md` to hold the `'QadiAtoms'` text; `91-check.mjs variant … tstyche` records only the `Error:` line of each pass (its self-test pins that). Fix: two `- failing text:` lines copied verbatim from the real run were appended to the `hydrate-target-red` block (`Argument of type '{ readonly hydrate: Written; }' is not assignable to parameter of type 'QadiAtoms'.` and the `missing the following properties` line). The script was not changed.

**2. The close's `seen-failing` needs all four titles, the plan seeds one.** `91-check.mjs close` runs `seen-failing packages/react/test/HydrationTarget.tst.ts`, which requires every title seen failing; only the first is RED on the base (the other three are preservation pins, green by design). Fix: two negative variants on a scratch clone of commit A (`hydrate-target-atoms-lack-hydrate`, `hydrate-target-accepts-anything`) made the remaining three titles fail for the reason each names; `seen-failing` now passes for the file. The two scratch clones (`hydration-red`, `hydrate-target-neg`) were removed by name.

**3. Task 1's `91-pinned-check.mjs` and Task 3's cannot be clean before their commit.** As in 91-12, declared edits are held against base until the commit exists; the run before the fold reported the eight files plus the born file, and was `516 held, 26 declared (26 applied), 4 born … clean` right after.

### Choices the plan left open (autonomous, most complete option)

**4.** `HydrationTarget` got a short doc of its own (what the capability is, that `QadiAtoms` extends it, that it is package-private) above the moved `hydrate` doc, rather than the moved doc alone.

**5.** The `HydrationPayload.test.ts` value imports of `dehydrateDecisions` and `hydrateDecisions` were merged into the existing `PAYLOAD_PRODUCERS` import line from `../src/HydrationEngine.ts` (its declared second region), so no module is imported twice by value.

### Not done, on purpose

The prose citations of `Hydration.ts` outside this plan's file list stay for plan 18's sweep: `packages/core/src/Decision.ts:69`, `packages/core/src/FieldLattice.ts:71`, `packages/react/src/SeededDecision.ts:15`, `packages/react/src/SeededQuestion.ts:18`, `packages/react/src/HydrationEvent.ts:23` and `packages/react/test/ServerRender.test.tsx:189` (comments). Gate 14's probes of `hydrateDecisions` (atoms, a forwarding object, the `@ts-expect-error` refusal) are plan 14's (WX-03).

**Total deviations:** 3 plan defects, 2 open choices. **Impact:** none on the shipped tree; no check weakened.

## Known Stubs

None.

## Threat Flags

None. T-91-27 (a consumer reaching a seed slot through the folded module) is mitigated: the barrel names only the six engine names, `HydrationTarget`, `hydrateWith` and the seed slots stay unnamed, `homes` and the surface compare exit 0, and gate 14's escape check found no `src/` path in any packed declaration.

## Self-Check: PASSED

- `packages/react/src/Hydration.ts` does not exist; `HydrationEngine.ts` declares `HydrationTarget`, `dehydrateDecisions` and `hydrateDecisions`; `QadiAtoms.ts` holds `extends HydrationTarget` and no `readonly hydrate:`; no file under `packages/react/src` or `packages/react/test` imports `./Hydration.ts`; `packages/react/test/HydrationTarget.tst.ts` exists.
- Commits `0d8c82e8`, `b06f18ce` and `45a69112` are ancestors of HEAD, each with the one trailer.
- `91-FOLDS.md` holds the structural block of each commit with every command exit 0, `madge files: 247` then `246`; `91-RED-EVIDENCE.md` holds `hydrate-target-red` with the `'QadiAtoms'` text and the two negative variants.
