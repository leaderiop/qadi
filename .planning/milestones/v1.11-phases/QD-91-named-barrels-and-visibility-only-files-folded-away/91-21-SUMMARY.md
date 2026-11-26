---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 21
subsystem: testing
tags: [stryker, mutation-close, coverage-close, phase-close, span-decoder]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the mutation and coverage bases (91-01), every judge of the phase check (91-02 to 91-07), every fold, record and sweep commit (91-09 to 91-20)
provides:
  - the mutation close of core, audit and react, each folded file at or above its combined base, every base survivor killed
  - the coverage close of core, react and audit, every total at its threshold and every touched file at or above its line-weighted base
  - a named refusal where compare, probe and record close read an absent record or report
  - 91-check.mjs close, 91-pinned-check.mjs --all-applied and 91-earlier-checks.mjs green on the landed tree
affects: [phase verifier, phase close]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 04a6c190668bc9cf94d77fda64e560e2ca560aaa
plan_head_after: 8b8fd980e0957fea47081d9d1277951d5ad15027
commits: 4

actuals:
  tokens: 9000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a mutant a test can reach is killed by a test, seen failing with the mutant applied on a scratch clone, never labelled equivalent"
    - "an examined static mutant needs an allowance only when the close holds more Ignored mutants of its kind than the base side did"

key-files:
  created:
    - packages/core/test/PortSpanFold.mutation.test.ts
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-mutation-close.json
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-coverage-close.json
  modified:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-mutation.mjs
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md

key-decisions:
  - "The four base survivors on PortSpanEncode.ts line 59 are killed by test rows, not carried: the base survivors were reachable, and the owner's rule is that a reachable mutant is killed (decided autonomously)"
  - "No EXAMINED entry is recorded: portInterpreter's four literal mutants are the four Ignored mutants PortInterpreter.ts held at the base, so PortSpan.ts holds none beyond its base side and an entry would fail compare as an allowance no close needs; the examined run and its result are written as a comment on EXAMINED (decided autonomously)"
  - "The close commit's second path is 91-mutation.mjs because the landed check names exactly that pair; the comment on EXAMINED is the honest edit that file carries"

requirements-completed: []
status: complete
---

# Phase QD-91 Plan 21: The mutation close, the coverage close and the phase check's close Summary

**The folds lowered nothing the tests prove: core's PortSpanEncode.ts closes at 23 of 23 (base sum 17 of 21, all four base survivors now killed), ArchiveFacts.ts at 54 of 54, RegistryLease.ts at 28 of 28, coverage holds every total, and `91-check.mjs close` passes all 24 checks on the landed tree.**

## Accomplishments

- The named refusal for an absent record or report, with a self-test row (125 passed, from 122).
- The mutation close taken one config at a time, alone, with the exact base close invocations.
- Four survivors of the base killed with three test rows in the one born test file, each seen failing with its mutant applied.
- The coverage close, the pinned check fully applied, the earlier checks, the phase close and `pnpm check:pr`.

## Commits

| Hash | Subject |
| ---- | ------- |
| 84727bb9 | fix(91-21): refuse a missing record or report with a named message |
| 5165ac9e | test(91-21): kill the new open mutants of the folded files |
| 98d4c1f4 | docs(91-21): record the mutation close |
| 8b8fd980 | docs(91-21): record the coverage close |

## Mutation close beside the base

Each group was closed with its exact base close invocation, alone, with the tree clean, and recorded with `record close --group <g>`; after the killing-test commit all three groups were re-measured with `--restart` at the close commit's parent `5165ac9e` (the landed check wants every group's head to be that parent).

| File | Base side | Close | Open at close |
| ---- | --------- | ----- | ------------- |
| `packages/core/src/PortSpanEncode.ts` (with `PortSpanDecode.ts`) | 17 of 21 (16/20 + 1/1), 4 survived | 23 of 23 | 0 |
| `packages/core/src/PortSpan.ts` (with `PortInterpreter.ts`) | n/a (0/0 + 0/0) | n/a, no valid mutant | 0 |
| `packages/audit/src/ArchiveFacts.ts` (with `SequenceIntegrity.ts`) | 54 of 54 | 54 of 54 | 0 |
| `packages/react/src/RegistryLease.ts` | 28 of 28 | 28 of 28 | 0 |

`PortSpanEncode.ts` valid rose from 21 to 23 and Ignored fell from 15 to 13: the new rows reach two static mutants the base config had ignored, and both are Killed.

### Survivors of the base, each killed

All four were on `PortSpanEncode.ts` line 59 at the base (line 70 in the folded file): `if (raw === undefined || field === undefined) continue;`. Each is applied by hand on a scratch clone of `84727bb9` and seen failing; the evidence blocks are in `91-RED-EVIDENCE.md`.

| Mutant | Evidence block | Killed by (test file `PortSpanFold.mutation.test.ts`) |
| ------ | -------------- | ------------------------------------------------------ |
| the whole skip condition replaced by `false` | `## fold-if-false` | "skips a key the struct names but declares no field for, and keeps the other fields" (TypeError reading `ast`) and "reads a key with no attribute as absent, even for a field that would accept undefined" |
| `raw === undefined` replaced by `false` | `## fold-raw-false` | "reads a key with no attribute as absent, even for a field that would accept undefined" (`{ loose: undefined }` against `{}`) |
| `field === undefined` replaced by `false` | `## fold-field-false` | "skips a key the struct names but declares no field for, and keeps the other fields" |
| `||` replaced by `&&` | `## fold-and` | the same two rows |

None is labelled EQUIVALENT: `EQUIVALENT` is empty. The `raw === undefined` arm is reachable through a field that accepts `undefined` (`Schema.optionalKey(Schema.Any)`, a legal `SpanFields` member since its `Type` is `any`).

### EXAMINED and EQUIVALENT entries

`EQUIVALENT = []`. `EXAMINED = {}`, deliberately (see deviation 2). The examination itself was done: a config under the scratch root spreads `stryker.config.mjs` with `ignoreStatic: false` and a JSON reporter writing under the scratch root, run alone with `--mutate packages/core/src/PortSpan.ts`:

| Mutant (`PortSpan.ts` line 93) | Result before the new row | Result after |
| ------------------------------ | ------------------------- | ------------ |
| `[]` for the member list (col 48) | Killed | Killed |
| `""` for `evaluate` (col 49) | Killed | Killed |
| `""` for `toPredicate` (col 61) | Killed | Killed |
| `""` for `remote` (col 76) | **Survived** | Killed |

The `remote` mutant was a real open mutant hidden by `ignoreStatic: true`: no test read `remote` as itself. The row "reads each of the three interpreters as itself" kills it (seen failing as `## fold-remote-literal`: expected `{}` to equal `{ interpreter: 'remote' }`).

## Coverage close beside the base

Taken by the base command (`vitest run packages/<p>/test --coverage.enabled …`, path-filtered), alone, with Stryker not running.

| Package | Files base to close | lines | functions | branches | statements | threshold |
| ------- | ------------------- | ----- | --------- | -------- | ---------- | --------- |
| core | 94 to 92 | 99.89 (base 99.89) | 99.78 (99.78) | 98.4 (98.4) | 99.64 (99.64) | 95 |
| react | 21 to 19 | 99.5 (99.5) | 98.68 (98.68) | 99.04 (99.04) | 99.54 (99.54) | 90 |
| audit | 24 to 23 | 100 (100) | 100 (100) | 100 (100) | 100 (100) | 90 |

Touched files, lines covered of total (the file counts fall by the five deleted files plus the two react ones the folds absorbed): core `PortSpanEncode.ts` 39/39 (base 37/37 + `PortSpanDecode.ts` 2/2), `PortSpan.ts` 1/1 (base 0/0 + `PortInterpreter.ts` 1/1); react `GateWriter.ts` 58/58 (56 + `GateRegistry.ts` 2), `HydrationEngine.ts` 100/100 (96 + `Hydration.ts` 4), `QadiAtoms.ts` 29/29, `QadiProvider.tsx` 35/35, `DevtoolsFeed.ts` 12/12, `hooks.ts` 30/30, `RegistryLease.ts` 21/21; audit `ArchiveFacts.ts` 28/28 (28 + `SequenceIntegrity.ts` 0/0).

## The four UNMEASURED proofs (react fold targets and barrels no Stryker config reaches)

By their evidence headings in `91-RED-EVIDENCE.md`: `## hydrate-wrong-subject`, `## dehydrate-drops-options`, `## gate-collision-ignored`, `## sequence-check-type-only`. The eleven unmeasured files and their reasons are in `91-mutation-base.json`.

## Phase close figures

- `node <D>91-check.mjs close`: exit 0, "close: 24 checks and the no-release facts pass" (pinned check with `--all-applied`, earlier checks, records, scans, trailers, barrels, homes, folds, rule, changesets, spike, circular, surface tests and their seen-failing, mutation `compare`, `landed close`, `landed coverage-close`, and `escape` last).
- `node <D>91-pinned-check.mjs --all-applied`: exit 0, "pinned: 515 held, 27 declared (27 applied), 5 born, 27 earlier-held, clean".
- `node <D>91-earlier-checks.mjs`: exit 0, "87 runs, all match their rows".
- Surface close figure: `surface: equal to the base, 948 exports` (the tool total); `gate13: 943` (gate 13 prints "943 export(s) documented across 9 package(s)").
- madge: "circular: 246 files, no circular dependency found".
- Escape check line: "escape: gate 14's declaration escape check ran clean over the packed declarations".
- `pnpm check:pr`: exit 0 at `8b8fd980` (18 of 19 steps, `pnpm mutation` skipped as the script states).
- Trailers: 79 commits since phase_base at the close run, each with the one trailer (this plan's final commit adds one more).

## Commits of the phase by subject (phase_base to this plan's last task commit)

```
d491c0c1 docs(91-01): record the mutation base
1aacd98a docs(91-01): record the coverage base
a672a6f3 chore(91-02): add the phase check
f6719e7f docs(91-02): record the phase check seen failing
e0c321d1 feat(91-03): add the surface-diff tool and run its self-test in the merge gate
e958e844 docs(91-03): record the surface baseline
1be6db32 docs(91-03): record the surface tool seen failing
8d9967bb docs(91-03): count the surface self-test in the README's gate line
02009ea4 test(91-04): pin each root's runtime values on the base
db2e6fd1 docs(91-04): record the value lists seen failing
24228231 feat(91-05): refuse a packed declaration that escapes its package
5ce96c01 docs(91-05): record the escape check seen failing
46432b6d chore(91-06): add the pinned-test check
0d1a0b46 docs(91-06): record the pinned-test check seen failing
2e8089e1 chore(91-07): add the earlier-phase checks
0cd6fc7c docs(91-07): record the earlier-phase checks seen failing
0e178658 docs(91-08): record the fold spike
b4878f9c refactor(91-09): name the core barrel's exports per module
400d27f0 refactor(91-09): name the react barrel's exports per module
b646c87b refactor(91-09): name the audit barrel's exports per module
22e83755 docs(91-09): record the barrel generation
136830bf refactor(91-10): fold the port span decoder into the span machinery
1bc8e418 fix(91-10): hold the interpreter fold to the three paths it changes
92096e06 refactor(91-10): fold the interpreter set into the span types
89bbb146 docs(91-10): record the core fold verdicts and the span rules biting
45e366ac refactor(91-11): fold the gate registry constructor into the gate writer
f50552ac docs(91-11): record the gate fold verdict
8eadbc55 refactor(91-12): fold the sequence check's public home into the archive facts
af405df2 docs(91-12): record the sequence fold verdict
0d8c82e8 feat(91-13): hydrateDecisions takes any value with the hydrate capability
b06f18ce refactor(91-13): fold the hydration entry points into the hydration engine
45a69112 docs(91-13): record the hydration fold verdicts
3d38da36 test(91-14): probe the structural hydrate parameter in the packed consumer
4b2fbffb docs(91-14): record the hydration variants
da1e5f4a feat(91-15): one named-barrel rule over the five named barrels
9015260c docs(91-15): record the named-barrel rule seen failing and the span couplings
3870cf5a docs(91-15): count the merge gate's twenty-seven steps in the roadmap
6bda9c04 docs(91-16): record the named barrels decision
feb8264e docs(91-16): amend the cycle, devtools-model and entry-points decisions
5ab977e5 docs(91-16): drop the superseded out-of-scope line
8b5fac85 fix(91-16): ledger the earlier close that pins the devtools-model decision's revision
dde9c676 fix(91-16): word the decision's enforcement section as the record check reads it
a2ddaa5e docs(91-17): state the folded behaviours and the surface invariants
685e7b4d fix(91-17): match an overview row that lists the name among others
e1e46d45 docs(91-17): name each folded export at its new home
fb1e1e4d docs(91-18): re-point the sequence check's disclaimer citations
7fceb163 docs(91-18): note the folds on the decisions they touch
94cea732 chore(91-18): add the core, react and audit patch changesets
2c6f9750 fix(91-18): read an edited package from every source file under src
0a7abe7e docs(91-19): name the registry lease's one caller
f961469b fix(91-19): let the pinned check declare one test comment line
484d0327 fix(91-19): key the 86 pinned row on the sweep's test comment
743f6f85 docs(91-19): sweep the deleted paths and the old rule name
c6ab1351 fix(91-19): key the 89 close on the sweep's decision note
3191f5d3 fix(91-15): read the section 16 sentence across its line wrap
84727bb9 fix(91-21): refuse a missing record or report with a named message
5165ac9e test(91-21): kill the new open mutants of the folded files
98d4c1f4 docs(91-21): record the mutation close
8b8fd980 docs(91-21): record the coverage close
```

(The per-plan `docs(91-NN): complete …` commits are omitted from the list.)

## Deviations from Plan

### Plan defects (checks fixed to be honest, nothing weakened)

**1. [Plan defect] `probe` takes a group.** The plan runs `node <D>91-mutation.mjs probe < /dev/null`; the script's `probe` requires `--group <g>` (plan 01 built it so). Before: `probe`. After: `probe --group core` (run once for core; audit and react are judged by `compare` and `landed close`).

**2. [Plan defect] An EXAMINED entry the close does not need.** The plan expects `portInterpreter`'s literal mutants to be recorded as EXAMINED entries. `judge` treats the four Ignored mutants of `PortInterpreter.ts` as part of `PortSpan.ts`'s base side, so `PortSpan.ts` holds no Ignored mutant beyond it and any entry would fail `compare` ("an allowance no close needs"). Before: an `EXAMINED` entry per literal mutant. After: no entry; the examined run (four mutants, one `remote` literal Survived and killed by the new row) is written as a comment on `EXAMINED` in `91-mutation.mjs` and in this summary.

**3. [Plan defect] The close commit needs a change in `91-mutation.mjs`.** The landed check requires the close commit to hold exactly `91-mutation.mjs` and `91-mutation-close.json`, and the plan's allowances were the change it assumed. With none needed, the commit carries the comment on `EXAMINED` above (no behaviour change).

**4. [Plan defect] `record close --restart` for all three groups.** The close commit's parent must be every group's head. After the killing-test commit, audit and react were re-measured too (not only core), so each group's head is `5165ac9e`.

### Auto-fixed issues

**5. [Rule 3 - Blocking] The raw ENOENT of compare, probe and record close** (the 91-02 finding, orchestrator decision 2). `readJson` now refuses an absent file through the pure `absentReasons` with a message naming the file; three self-test rows (125 passed). Commit `84727bb9`. Verified by running `compare` with no close record: the refusal names `91-mutation-close.json`.

**6. [Rule 1 - Bug, own mistake] Two variants recorded with a broken edit.** My first shell loop split the replacement text on `|`, so `fold-raw-false` and `fold-field-false` ran a syntax error ("Transform failed") instead of the mutant. Both blocks were removed from `91-RED-EVIDENCE.md` before commit and redone with the proper edit; the committed blocks show assertion failures. A stray `mv reports reports.save` I issued while testing the absent-report path was undone in the next command (nothing under `reports/` was lost; it is gitignored build output).

### Choices the plan left open (autonomous, most complete option)

**7.** The base survivors were killed rather than left as carried (the orchestrator's decision), with three rows rather than four: a fourth row (an interpreter outside the union reads as absent) failed under no mutant and was dropped, because `seen-failing` demands every title be seen failing.

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None. T-91-37 holds: the combined-base rule judged the folded files, and no allowance exists to hide a drop.

## WX-07 (flagged, unresolved)

WX-07 stays `unresolved` for the verifier to confirm: no tag, no version bump, no push and no `changeset version` were made by this plan; `91-check.mjs close` ends with the no-release facts and passes.

## Issues Encountered

None open. `.vitest/` and `.stryker-tmp/` were never left behind. The scratch root `$TMPDIR/qd91` is removed with `91-check.mjs scratch-clean` at the end of this plan (see the self-check).

## Self-Check: PASSED

- Created files exist: `packages/core/test/PortSpanFold.mutation.test.ts`, `91-mutation-close.json`, `91-coverage-close.json` (all FOUND).
- Commits exist and are ancestors of HEAD: `84727bb9`, `5165ac9e`, `98d4c1f4`, `8b8fd980` (all FOUND).
- `91-check.mjs close` exit 0, `91-pinned-check.mjs --all-applied` exit 0, `91-earlier-checks.mjs` exit 0, `pnpm check:pr` exit 0 at `8b8fd980`.
