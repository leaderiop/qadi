---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 01
subsystem: devtools-model-mutation
tags: [mutation-base, stryker, devtools, phase-check]
requires: []
provides:
  - the mutation floor of DockModel.ts at the phase base, and the close-only lens group's absolute bar
  - the base gate lines, the devtools and react test counts, and the rerun instrument search
  - 80-check.mjs, the phase's shared commit, unchanged, seen-failing, scan and trailer check
affects: [80-02, 80-03, 80-04, 80-05, 80-06, 80-07, 80-08, 80-12, 80-13]
key-files:
  created:
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-mutation.mjs
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-mutation-base.json
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-check.mjs
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-RED-EVIDENCE.md
  modified: []
key-decisions:
  - "The base is recorded as measured: DockModel.ts is 69/69 (the plan-time figure of 72/72 was wrong; Phase 79's own close record holds 69/69 too)"
  - "The instrument search counts the options object of the react test support as no reader of the context field"
requirements-completed: [WX-05, WX-06, WX-07]
metrics:
  duration: 50min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 55c79a96db057952465918e410c529b85dc3e4e7
plan_head_after: fcc561a6d993e1530c21ef6d74c396a4226bdf5b
actuals:
  tokens: 13486
  tasks: 3
  commits: 2
coverage:
  - deliverable: "80-mutation.mjs, the phase scorer with the dock group and the close-only lens group, self-test 28 passed"
    verification:
      - kind: command
        ref: "node 80-mutation.mjs --self-test (ends self-test: 28 passed); pnpm exec oxlint 80-mutation.mjs; record base lens refused"
        status: pass
    human_judgment: false
  - deliverable: "80-mutation-base.json, the dock group measured on phase_base and committed alone, first, with the unmeasured list"
    verification:
      - kind: command
        ref: "the plan's Task 1 verify one-liner"
        status: pass
    human_judgment: false
  - deliverable: "80-check.mjs with a passing self-test, every run mode seen failing once in 80-RED-EVIDENCE.md"
    verification:
      - kind: command
        ref: "the plan's Task 3 verify one-liner"
        status: pass
    human_judgment: false
---

# Phase QD-80 Plan 01: the mutation base of the dock model and the phase check Summary

The phase scorer `80-mutation.mjs` (the `dock` group, and the close-only `lens` group for the file 80-05 adds; every
record names the four files outside a Stryker config), the Stryker record of `DockModel.ts` measured on the untouched
phase base and committed alone first, the base facts, the rerun of the `instrument` search, and `80-check.mjs`, the
shared check every later plan calls, with each run mode seen failing once.

phase_base: 55c79a96db057952465918e410c529b85dc3e4e7

`phase_base` is the orchestrator's planning commit; it equals `54a8b9cb` on every path outside `.planning/` (`git diff
--quiet` over `packages spec scripts features apps examples AGENTS.md stryker.devtools.mjs stryker.react.mjs .changeset
package.json pnpm-lock.yaml` holds). The same sha is in `<S>/phase_base`, with `<S>` = `$(cd "${TMPDIR:-/tmp}" && pwd
-P)/qd80`.

## Base facts

```
house-style: 596 file(s) clean (3 declared switch(es), 76 type-test file(s))
api-surface: 942 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 167 reference(s) resolve
doc-examples: 119 block(s) compile
devtools-claims: 8 claim(s) registered across 6 file(s)
website-doc-examples: 75 block(s) compile

Qadi specification verification
| Status | Check                                      | Detail
| ------ | ------------------------------------------ | ------
| PASS   | appendices/index.yaml -> disk              | 1 entr(y|ies) resolve
| PASS   | appendices/ disk -> index.yaml             | no orphans
| PASS   | behaviors/index.yaml -> disk               | 34 entr(y|ies) resolve
| PASS   | behaviors/ disk -> index.yaml              | no orphans
| PASS   | decisions/index.yaml -> disk               | 149 entr(y|ies) resolve
| PASS   | decisions/ disk -> index.yaml              | no orphans
| PASS   | devtools-spec/index.yaml -> disk           | 5 entr(y|ies) resolve
| PASS   | devtools-spec/ disk -> index.yaml          | no orphans
| PASS   | models/index.yaml -> disk                  | 38 entr(y|ies) resolve
| PASS   | models/ disk -> index.yaml                 | no orphans
| PASS   | process/index.yaml -> disk                 | 3 entr(y|ies) resolve
| PASS   | process/ disk -> index.yaml                | no orphans
| PASS   | invariants -> traceability                 | all 176 invariant(s) traced
| PASS   | decisions -> traceability                  | 149 ADR(s) traced
| PASS   | ADR Document ID = file number              | 125 ADR(s) agree
| PASS   | urs -> traceability table                  | 38 requirement(s) traced
| PASS   | features -> traceability                   | all REQ tags defined
| PASS   | relative link integrity                    | 5251 link(s) resolve, none gitignored
| PASS   | §4 test files -> disk                     | 337 file(s) exist
| PASS   | CCR register coverage                      | known, tracked gap unchanged: 078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137
| PASS   | Revision = newest history entry            | every header agrees

PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)

reservation-sha256: 6ecf5abaa27f01c2111be0eef954e393e3a176b7d0c611f3a980f506fe904b56
devtools-tests: Tests  1869 passed (1869)
react-tests: Tests  647 passed (647)
characterisation: packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)
pinned: 15 tests hold their assertions
```

- differs from plan time: none of the gate lines, the reservation sha256, the devtools and react test counts or the two
  Phase 79 check lines differ from the plan-time evidence (`house-style: 596 file(s)`, `api-surface: 942 export(s)`,
  `website-doc-examples: 75 block(s)`, devtools 1869 tests in 80 files, `pinned: 15 tests hold their assertions`).
- differs from plan time: dock base score 69/69, not the 72/72 the plan's evidence note gives (that figure does not
  match any record: Phase 79's own close record for `DockModel.ts`, head `92cfd986`, is 69/69 with 12 Ignored too, and
  no source file changed between that close and this base).

dock base score: 69/69

`DockModel.ts` at `phase_base`: 69 Killed, 0 Timeout, 0 Survived, 0 NoCoverage, 12 Ignored. The Ignored mutants, by line:
177 `ArrowFunction () => undefined`, 205 `ArrowFunction () => undefined`, 245 `ObjectLiteral {}`, 246, 247 and 248
`ArrowFunction () => undefined`, 257 `ObjectLiteral {}`, 258, 259 and 260 `ArrowFunction () => undefined`, 308
`ArrayDeclaration ["Stryker was here"]` and 317 `StringLiteral ""`.

## Search

```
QadiContextValue: packages/devtools/CHANGELOG.md:325; packages/react/CHANGELOG.md:145; packages/react/src/QadiProvider.tsx:51,70,78; packages/react/src/useGate.ts:10,139; spec/README.md:326; spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md:40,65,107; spec/overview.md:570
instrument-read: none
package-install: none
prop-uses: examples/nextjs-newsroom/app/page.tsx:76; examples/nextjs-newsroom/e2e/lens.spec.ts:98; examples/nextjs-newsroom/src/client/Providers.tsx:55,59,79; examples/nextjs-newsroom/src/ui/Shell.tsx:43,55,109; features/features/gate-instances/gate-instances.steps.test.ts:145,164,179; packages/devtools/src/model/DockModel.ts:126; packages/devtools/src/react/QuestionsPanel.tsx:87; packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx:70; packages/devtools/test/react/QuestionsPanel.gates.test.tsx:56; packages/react/src/DeveloperSignals.ts:202,204,516,518; packages/react/src/DevtoolsFeed.ts:82; packages/react/src/GateRegistry.ts:24; packages/react/src/QadiProvider.tsx:58,62,91,151,167,169,196,207,208,266,273,280,283,286,307,308; packages/react/src/hooks.ts:170; packages/react/test/DeveloperSignalReporters.test.tsx:483,487,512,513,518,521,529,536,539; packages/react/test/DeveloperSignals.test.ts:267,269; packages/react/test/DevtoolsFeed.test.tsx:172; packages/react/test/GateRegistration.characterisation.test.tsx:5,78,98,126,153,158,172,179,199,212,228,249,262,287,319,348,355,383,389,411,418,452,494,500,528,551,569,599,605,613; packages/react/test/GateRegistry.test.tsx:58,61,72,174,341,360,363,378,413,427,443,460,515,534,558; packages/react/test/GateWriter.kinds.test.tsx:108,149; packages/react/test/GateWriter.useGates.test.tsx:48,52,176; packages/react/test/QadiProvider.production.test.tsx:18,19,20,31,36,43; packages/react/test/QadiProvider.signals.test.tsx:36,52,108,149; packages/react/test/hooks.rerender.test.tsx:91; packages/react/test/support/trees.tsx:39,54
```

The one `.instrument` property read is `packages/react/test/support/trees.tsx:54`, `options.instrument`: that is the test
helper's own options object being passed on as the provider prop, not a read of the context value. Every consumer of
`useQadiContext` destructures other fields (`atoms`, `registry`, `gates`): `DevtoolsFeed.ts:126`, `hooks.ts:22`,
`hooks.ts:155` and `hooks.ts:174`, and the two tests `DevtoolsFeed.test.tsx:53` and `GateWriter.useGates.test.tsx:69`.
No example, app, feature or script reads the field, and `scripts/check-package-install.mjs` names neither `instrument`
nor `QadiContextValue`. The search used `git grep` (tracked files), because a recursive `grep` over the working tree
walks the `.next` and `dist` build output of the examples and finds the compiled library, which is not source.

## Task Commits

1. Task 1 (tracer): `a4d5d860` docs(80-01): record the mutation base of the dock model (`80-mutation.mjs`, `80-mutation-base.json`); the first commit after `phase_base`, with one trailer.
2. Task 2: no commit of its own; its output (base facts, search) is recorded in this file.
3. Task 3: `fcc561a6` chore(80-01): add the phase check helper (`80-check.mjs`, `80-RED-EVIDENCE.md`).

## Decisions made autonomously

- `80-check.mjs scan-ids` exempts a prefixed id (`ADR-QD-80`, `BEH-QD-`, `INV-QD-`, `CCR-QD-`, `ARCH-`) from the bare
  `QD-80` phase-id test, because ADR-QD-80 is a real decision number; a bare `QD-80`, `80-NN`, `Phase 80`, `D-NN`,
  `LENS-0N`, `WX-0N` and any `-NEXT` id is still flagged.
- Spec Change History rows are exempt from the phase-relative wording scan only (the brief's rule), found as lines after
  a `Change History` heading of a file under `spec/`; ids are scanned there too.
- `80-check.mjs scan-forbidden` reads each file whole, blanks comments and string text, and then judges only the added
  line numbers, so a multi-line comment or template cannot hide or fake a token. Known limit, stated in its header: it
  does not parse regex literals.
- Each scratch edit of the RED evidence run was taken from a copy in `<S>` and restored with `cp`; `git status
  --porcelain -- packages` printed nothing afterwards.
- The `lens` group is declared `closeOnly: true`, so `record base lens` is refused with the usage line; 80-12 measures it
  at the close and its bar is absolute (no open mutant).

## Deviations from Plan

None - plan executed exactly as written, apart from one recorded difference: the plan-time dock score of 72/72 does
not hold, and the measured 69/69 is the base (above). No verify text needed a fix.

## Issues Encountered

A first recursive `grep` over the working tree for the search ran into the example apps' build output and timed out;
the search was rerun with `git grep` over tracked files (above). No file outside `.planning/` changed in this plan.

## Known Stubs

None.

## Threat Flags

None: no source file, endpoint or schema changed.

## Next phase readiness

Later plans call `node <D>80-check.mjs <mode>`; `base` prints `phase_base`. `80-mutation.mjs record close dock` and
`record close lens` are the close-time calls (80-12), and `compare` judges `dock` against the base and `lens` against
the absolute bar. `EXAMINED` is empty and gains an entry only when 80-12 has run a mutant by hand and seen it Killed.
The `branch` mode needs a `- useId:` line in `80-RED-EVIDENCE.md` (80-03 writes it).

## Self-Check: PASSED
