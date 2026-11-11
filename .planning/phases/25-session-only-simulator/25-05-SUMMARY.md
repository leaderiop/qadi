---
phase: 25-session-only-simulator
plan: 05
subsystem: spec
tags: [adr, behaviour-spec, ccr, changeset, mutation-gate, merge-gate]
requires:
  - phase: 25-session-only-simulator
    provides: "25-01..04: D-01 option D, the red contract, the scoped session and the session-only view"
provides:
  - "ADR-QD-137 (A devtools session owns its runs through a scope), superseding ARCH-20 D-20-b with the user's D-01 answer quoted"
  - "ADR-QD-047 amendment (the simulator is a view of its session), BEH-QD-460, BEH-QD-461, BEH-QD-322 updated with a scoped compiled example"
  - "CCR-QD-415, a @qadi/devtools minor changeset, two pending changesets edited in place"
  - "25-mutation-after.json and a green pnpm check:pr"
affects: [26]
actuals:
  tokens: 21000
  tasks: 3
  commits: 3
plan_head_before: fb910848a8bab373ba7a2d643360a5902eb9dcc5
plan_head_after: 77a47f8017f5b4bc4778f921eca2cf84996fb8d3
commits: 3
tech-stack:
  added: []
  patterns:
    - "a devtools store that owns fibers is built in a scope its owner holds (ADR-QD-137); Phase 26's dock model follows it"
key-files:
  created:
    - spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md
    - .changeset/simulator-session-only.md
    - .planning/phases/25-session-only-simulator/25-mutation-after.json
  modified:
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/index.yaml
    - spec/behaviors/29-devtools-simulator.md
    - spec/devtools-spec/02-screens.md
    - spec/traceability.md
    - spec/README.md
    - .changeset/simulation-session.md
    - .changeset/devtools-headless-interface.md
key-decisions:
  - "ADR-QD-137 gets its own number (D-08): it reverses a recorded decision (ARCH-20 D-20-b) and sets a package rule, so it is not folded into ADR-QD-047's amendment about the view"
  - "No new invariant: BEH-QD-461's requirements carry the lifecycle and INV-QD-107 is unchanged (INV-QD-294..295 and BEH-QD-462..464 unused)"
requirements-completed: [SIM-01, SIM-02, SIM-03, SIM-04, SIM-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06]
coverage:
  - id: D1
    description: "ADR-QD-137 records the lifecycle override with the human's D-01 words and the rejected alternatives; ADR-QD-047 records the session-only simulator and notes D-20-b superseded"
    requirement: SIM-04
    verification:
      - kind: other
        ref: "pnpm spec:verify:strict (21 PASS: ADR Document ID = file number, decisions -> traceability, Revision = newest history entry), node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
  - id: D2
    description: "BEH-QD-460 and BEH-QD-461 exist with enforcement; BEH-QD-322's fence, prose and compiled example show the scoped constructor, run as a command and no reap or dispose; the devtools-spec sentence exists"
    requirement: SIM-01
    verification:
      - kind: other
        ref: "pnpm spec:examples (108 blocks compile), pnpm spec:claims, the plan's two grep verifies"
        status: pass
    human_judgment: false
  - id: D3
    description: "spec/overview.md names every added type and member and none removed; gate 13 green; a @qadi/devtools minor changeset states the interface change and that the session is unreleased"
    requirement: SIM-05
    verification:
      - kind: other
        ref: "pnpm spec:api (906 exports documented), the changeset grep verify"
        status: pass
    human_judgment: false
  - id: D4
    description: "CCR-QD-415 lists every changed file, the D-01 outcome and who decided it, the numbers used and unused, the mutation comparison and the red-first commits"
    requirement: WX-02
    verification:
      - kind: other
        ref: "pnpm spec:verify:strict (CCR register coverage), grep -c '| CCR-QD-415 |' spec/README.md = 1"
        status: pass
    human_judgment: false
  - id: D5
    description: "No touched model file's Stryker score fell below 25-mutation-base.json; pnpm check:pr exits 0; no gate script, budget or threshold was edited"
    requirement: WX-05
    verification:
      - kind: other
        ref: "pnpm exec stryker run stryker.devtools.mjs --mutate SimulationSession.ts,Replay.ts: 0.9694 and 1.0 against 0.9641 and 1.0"
        status: pass
      - kind: other
        ref: "pnpm check:pr exit 0 (16 of 17 steps, mutation skipped by design); git diff 17fa6738 over scripts, AGENTS.md, vitest configs, stryker configs, .oxlintrc.json is empty"
        status: pass
    human_judgment: false
  - id: D6
    description: "The simulator's on-screen contract (no theme value, string, test id or style moved) is unchanged"
    requirement: SIM-01
    verification: []
    human_judgment: true
    rationale: "Carried forward from 25-04: the DOM tests assert strings and test ids, not pixels, so a visual preserve check needs a human or a visual-regression run"
duration: 9min
completed: 2026-11-11
status: complete
---

# Phase 25 Plan 05: Spec records and the green gate Summary

**ADR-QD-137 records that a devtools session owns its runs through a scope (quoting the user's D-01 answer, superseding ARCH-20 D-20-b), alongside ADR-QD-047's view amendment, BEH-QD-460/461, an updated BEH-QD-322 with a scoped compiled example, CCR-QD-415 and a `@qadi/devtools` minor changeset, with `pnpm check:pr` exiting 0 and no mutation score below the phase base.**

## Performance

- **Duration:** about 9 min
- **Started:** 2026-11-11T07:28:37Z
- **Completed:** 2026-11-11T07:37Z
- **Tasks:** 3
- **Files modified:** 11 (3 created)

## Accomplishments

- **ADR-QD-137** (Document ID `QADI-ADR-137`, Rev 1.0, Accepted, supersedes ARCH-20 D-20-b). Context quotes D-20-b; Decision quotes the `_DECISIONS-v1.2.md` D-01 answer and the standing instruction, then states the scoped constructor, the `FiberHandle`, `run` as a command, a superseding command interrupting the run in flight before it returns, the closing finalizer, the constructing context's services and the root span, and how React owns the scope (`useScoped`, StrictMode). It states the ordering change (a new run starts before the old one's finalizers end) and why it is safe, and lists the six rejected alternatives. It is in `index.yaml`.
- **ADR-QD-047 (Rev 1.11)** carries the CCR-QD-415 amendment (the simulator is a view of its session; the lifecycle is ADR-QD-137's), its Status cell and the index status list the amendment and that D-20-b is superseded, and the CCR-QD-199 sentence that said the hook forks `run`, `reap` and `dispose` now says it is superseded.
- **`29-devtools-simulator.md` (Rev 1.13).** BEH-QD-460 and BEH-QD-461 added with enforcement citing the ARCH-73 tests. BEH-QD-322's fence shows `Effect<SimulationSession, never, Scope.Scope>`, `run` returning `void`, `setAction` and `choosePolicyAt`, and no `reap` or `dispose`; its prose says a superseding command interrupts the run in flight before it returns; its compiled example builds the session in `Effect.scoped` and still compiles (`pnpm spec:examples`, 108 blocks).
- **`devtools-spec/02-screens.md` (Rev 0.16, by hand: the document's `0.15 (draft)` revision cell is outside `spec-revise`'s pattern).** §5 gains a presence sentence that the screen is a view of the dock's session.
- **Traceability (Rev 1.149)** names BEH-QD-460/461 in behaviour 29's list and on the `SimulationSession.test.ts` and `Simulator.test.tsx` rows, `useScoped.ts` in the module list, a new `useSimulationSession.test.tsx` row, an ADR-QD-137 row and the ADR-QD-047 row's amendment. `spec/overview.md` (1.92, from 25-03) already named every added type and member and none removed; checked, unchanged.
- **CCR-QD-415** (`spec/README.md` Rev 1.151) lists every file plans 25-01..25-05 changed outside `.planning`, the D-01 outcome decided by the user on 2026-11-11 with the override of D-20-b, the red-first commits (`33467093`, `a228864c`) and the defect they pin (WX-06), the mutation comparison, and the numbers: used ADR-QD-137, BEH-QD-460, BEH-QD-461; unused BEH-QD-462..464 and INV-QD-294..295. The CCR-QD-410 row's "Unused: … INV-QD-295–299" is change history and is left as written.
- **Changesets.** New `.changeset/simulator-session-only.md` (`@qadi/devtools` minor): the scoped constructor, `run` as a command, `reap`/`hasRetired`/`dispose` removed, `SimulationSessionView`, the hooks returning `undefined`, the new members and six new types, and that the session interface is unreleased. `simulation-session.md` and `devtools-headless-interface.md` were edited in place (the session is built in a scope; the migration line now reads `yield* makeSimulationSession(...)`). The website's `devtools.md` and the package README name the functions in prose only and state no lifecycle, so they were left alone.

## Task Commits

1. **Task 1: ADR-QD-137, ADR-QD-047 amended, BEH-QD-460/461, BEH-QD-322, devtools-spec, traceability** - `3ee3838c` (docs)
2. **Task 2: CCR-QD-415 and the changesets** - `04771ff7` (docs)
3. **Task 3: mutation comparison and the merge gate** - `77a47f80` (chore; `25-mutation-after.json`)

**Plan metadata:** the `docs(25-05): complete spec records and merge gate plan` commit (SUMMARY, STATE.md, ROADMAP.md, REQUIREMENTS.md).

## Mutation (WX-05, per file, `25-mutation-base.json` to `25-mutation-after.json`)

| File | Base | After |
| ---- | ---- | ----- |
| `SimulationSession.ts` | 0.9641 (295 killed, 11 survived) | **0.9694** (348 killed, 11 survived) |
| `Replay.ts` | 1.0 (55 killed) | **1.0** (93 killed, 0 survived) |

Measured at the final tree with `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/SimulationSession.ts,packages/devtools/src/model/Replay.ts'`; neither file changed after 25-03, so the numbers are 25-03's. The 11 survivors are the ones 25-03 documented: eight equivalent mutants the base already had and three in the lifecycle code that are equivalent by construction. No new survivor, no threshold lowered, no disable comment.

## `pnpm check:pr`

Exit 0, 16 of 17 steps (the mutation step skipped by design, as `check:pr` does): typecheck, lint, circular, tstyche, coverage (175 files, 4551 tests passed; all files 99.48% statements), BDD (568 passed), spec:examples, spec:verify:strict (21 PASS), spec:gates, spec:claims, spec:api, spec:package, example (42 passed), spec:website-examples, website, spec:publish. `pnpm check:fast` passed first. `git diff 17fa6738 -- scripts AGENTS.md vitest.config.ts 'packages/*/vitest.config.ts' stryker.config.mjs stryker.devtools.mjs .oxlintrc.json` is empty: no gate, budget or threshold was edited.

## Numbers

Used: ADR-QD-137, BEH-QD-460, BEH-QD-461, CCR-QD-415. Unused: BEH-QD-462..464, INV-QD-294..295 (no new property; INV-QD-107 unchanged).

## Decisions Made

- ADR-QD-137 has its own number (25-CONTEXT D-08), not a paragraph in ADR-QD-047.
- No new invariant: the lifecycle is BEH-QD-461's requirements.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1's `pnpm spec:verify:strict` could not pass before Task 2**
- **Found during:** Task 1
- **Issue:** the gate's "CCR register coverage" check fails once ADR-QD-137 and the docs cite CCR-QD-415 and the register has no row yet; the row is Task 2's.
- **Fix:** committed Task 1 after its two grep verifies, `spec:examples`, `spec:claims`, `spec:api` and `spec-revise --check` passed; `spec:verify:strict` ran green after Task 2's row (21 PASS) and again in `check:fast` and `check:pr`.
- **Files modified:** none beyond the plan's list.

**2. [Rule 1 - Bug] The plan's BEH-QD-460 field names did not match the code**
- **Found during:** Task 1
- **Issue:** the plan sketch did not fix names; the first draft of the fence used `text`/`summary`/`selected: number`, but the real types are `SweepCost.sentence`, `BaselineReading.sentence` and `PolicyMenu.selected: string` (the option `value`).
- **Fix:** the fence was corrected to the real types before the commit.
- **Files modified:** `spec/behaviors/29-devtools-simulator.md`

**3. [Rule 3 - Blocking] `devtools-spec/02-screens.md` is outside `spec-revise`**
- **Found during:** Task 1
- **Issue:** its revision cell is `0.15 (draft)`, which `spec-revise.mjs` does not match ("has no Revision / Change History rows"), as CCR-QD-414 also found.
- **Fix:** bumped the revision to 0.16 and prepended the history entry by hand, in the document's existing format.
- **Files modified:** `spec/devtools-spec/02-screens.md`

---

**Total deviations:** 3 (2 Rule 3, 1 Rule 1). **Impact on plan:** none on scope.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None: spec, changeset and planning files only.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 25 is complete. Phase 26's dock model follows ADR-QD-137's rule (a store that owns fibers is built in a scope its owner holds); `DevtoolsDock`'s owner and `DockFrame` split is the seam it replaces. The visual preserve check of the Simulator screen is still a human's (`human_judgment: true`, D6 above and 25-04 D4).

---
*Phase: 25-session-only-simulator*
*Completed: 2026-11-11*

## Self-Check: PASSED

- FOUND: spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md, .changeset/simulator-session-only.md, 25-mutation-after.json
- FOUND: commits 3ee3838c, 04771ff7, 77a47f80 (`git merge-base --is-ancestor` ok)
- `| CCR-QD-415 |` appears once in spec/README.md; `pnpm check:pr` exit 0
