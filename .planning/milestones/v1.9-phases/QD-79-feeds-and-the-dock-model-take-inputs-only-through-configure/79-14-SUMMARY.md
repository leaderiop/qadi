---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 14
subsystem: spec-behaviours
tags: [behaviours, invariants, traceability, spec-revise, ccr, registry-reads]
requires: ["79-13"]
provides:
  - BEH-QD-731 to BEH-QD-735 in doc 28 (Rev 1.58), each with decision, scope and invariant links, REQUIREMENT lines and a Pinned by line naming test files and cell labels
  - BEH-QD-465, BEH-QD-584, BEH-QD-619 and BEH-QD-636 to BEH-QD-639 restated in place, each ending "Restated by ADR-QD-192 (CCR-QD-471)."
  - INV-QD-403 and INV-QD-404 (invariants Rev 1.216) and INV-QD-389's Source restated
  - traceability Rev 1.299 with the §2 rows of both invariants, doc 28's row listing BEH-QD-731 to BEH-QD-735, and a row for each new test file and helper
  - the CCR-QD-471 row listing every revision this plan wrote (README Rev 1.366), no reserved number left Unused
  - packages/devtools/test/react/DockRegistryReads.test.tsx, the orchestrator-decided pin of the gate registry read counts ADR-QD-192 states
affects: [79-15, 79-16, 79-17]
key-files:
  created:
    - packages/devtools/test/react/DockRegistryReads.test.tsx
  modified:
    - spec/behaviors/28-devtools-screens.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-14-PLAN.md
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-RED-EVIDENCE.md
key-decisions:
  - "The five behaviours are split by what a host can rely on: bare builds (731), the one rule (732), the retry exception and the quiet mend (733), the hooks and the registry reads under them (734), the dock's inputs stated once and what a pre-subscribed reader hears (735)"
  - "The exact registry read counts held on the installed React, so the ADR and BEH-QD-734 state them and the new test file pins them; no property-only fallback was needed"
  - "INV-QD-403 and INV-QD-389 say the dock applies the rule through the feeds, because DockModel.ts calls no sameFields itself and compares only its catalogue"
requirements-completed: []
metrics:
  duration: 95min
  completed: 2026-11-24
status: complete
commits: 4
plan_head_before: 5ee3a16cb30b00b5c4db607bb0be9a686ecb44b2
plan_head_after: 82fa22a9ec3a8f44fa78be93c9f3781625d1aea4
actuals:
  tokens: 60000
  tasks: 3
  commits: 4
coverage:
  - deliverable: "BEH-QD-731 to BEH-QD-735 and the seven restated blocks in doc 28, each citing its decision and the tests that pin it"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-14-PLAN.md (exit 0, after the quoting fix recorded below)"
        status: pass
    human_judgment: false
  - deliverable: "INV-QD-403, INV-QD-404, INV-QD-389 restated, the traceability rows and the completed CCR-QD-471 row"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-14-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
  - deliverable: "the gate registry read counts ADR-QD-192 states, held by a test shown failing once"
    verification:
      - kind: command
        ref: "pnpm exec vitest run --project devtools packages/devtools/test/react/DockRegistryReads.test.tsx (4 pass; 2 fail against the scratch edit R1 in 79-RED-EVIDENCE.md)"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 14: The behaviours and invariants of the bare feeds and the one rule

**Doc 28 gains BEH-QD-731 to BEH-QD-735 and restates seven of its blocks, the invariants gain INV-QD-403 and INV-QD-404, every new id is traced to the cells that pin it, and the registry read counts the ADR states are now held by `DockRegistryReads.test.tsx`.**

## Accomplishments

- **Orchestrator-decided pin (first commit, `test(79-14)`).** `packages/devtools/test/react/DockRegistryReads.test.tsx` mounts a dock through `useDockModel` over a registry that counts `instances()` and `subscribe`: healthy 1 read and 1 subscribe plain, 2 and 2 under StrictMode; a registry whose `subscribe` throws 0 reads, 2 subscribes plain and 3 under StrictMode; a re-render with a fresh record holding the same fields reads and subscribes nothing; a moved gates input reads once. The exact counts were not environment-dependent, so the property fallback was not used. Shown failing once: with `GatesFeed.ts`'s early return made unreachable, two cells failed (`expected 2 to equal 1`; `{ reads: 4, subscribes: 1 }` against `{ reads: 2, subscribes: 1 }`), and the source was restored from a copy (`git status` clean for `packages/devtools/src`). Recorded in `79-RED-EVIDENCE.md` under "79-14". The whole devtools project is green (1862 tests), `79-pinned-check.mjs` (15 tests) and `79-characterisation-check.mjs` pass, and `pnpm typecheck` passes.
- **Task 1.** BEH-QD-731 (four constructors take no argument, a bare build equals the empty build), BEH-QD-732 (a configure in which no input moved publishes nothing, restarts nothing and reads no host code; omitted equals `undefined`; capacity by its bound; presence a transition), BEH-QD-733 (any configure retries a failed watch; a quiet mend waits for a moved input), BEH-QD-734 (the hooks configure in the scoped build; remount and reveal use the latest committed inputs; a first throw closes the scope; the registry read counts under the hook), BEH-QD-735 (`DevtoolsDockProps` is `DockModelInputs` plus two host props; one mapping place; a pre-subscribed reader hears the first configure, with the counts quoted). BEH-QD-465, BEH-QD-584, BEH-QD-619 and BEH-QD-636 to BEH-QD-639 carry a dated "Restated" blockquote ending "Restated by ADR-QD-192 (CCR-QD-471)."; BEH-QD-584's quiet-mend sentence and BEH-QD-619's "one snapshot" requirement are rewritten ("a `configure` that moves an input reads it", "at most one snapshot"). Doc 28 is Rev 1.58.
- **Task 2.** INV-QD-403 and INV-QD-404 in INV-QD-402's form; INV-QD-389's Source restated (`sameFields` exported from its module, out of both barrels, applied by the feeds and so by the dock). Traceability Rev 1.299: doc 28's row lists BEH-QD-731 to BEH-QD-735 and `useConfigured`; §2 rows for both invariants; rows for `ConfigureRule.test.ts`, `ConfigureInputs.tst.ts`, `builtFeeds.ts`, `useConfigured.test.tsx`, `ConfigureFirstRender.characterisation.test.tsx` and `DockRegistryReads.test.tsx`; the new ids on the rows of `GatesFeed.test.ts`, `ExternalStore.test.ts`, `surface.tst.ts` and `QuestionsPanel.feed.characterisation.test.tsx`; the ADR-QD-192 row says which behaviours and invariants state it. The README row of CCR-QD-471 (README Rev 1.366) lists every revision and the new ids; every reserved number is used, none is Unused.
- **ADR-QD-192 Rev 1.1** (through `spec-revise`): the `instances()` consequence and a new "The registry reads" paragraph of "What enforces it" name `DockRegistryReads.test.tsx`; the Related list names BEH-QD-731 to BEH-QD-735, INV-QD-403 and INV-QD-404.
- Gates: both plan verifies exit 0; `pnpm spec:verify:strict` 21 pass, 0 fail; `spec-revise --check`, `check-doc-examples.mjs` (119 blocks) and `check-house-style.mjs` pass; no number outside the reserved set is written and `node scripts/next-id.mjs` was not run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1's verify scanned the Change History row for plan-local ids**
- **Found during:** the first run of Task 1's verify
- **Issue:** `spec-revise` rewrites doc 28's whole Change History line, so the "added lines" scan matched `D-24-c`, which an older row (1.9) quotes about another record. The plan's verify text has no way past it, and the brief's lesson says phrase scans of added lines exclude Change History rows.
- **Fix:** the verify in the PLAN now pipes the added lines through `grep -vE "^[+]> [|] Change History"` before the scan, committed separately as `docs(79-14): fix verify quoting`; the check is otherwise unchanged and passes.
- **Files modified:** `79-14-PLAN.md`
- **Commit:** efba484e

**2. [Rule 1 - Bug] A "Specified in" sentence wrapped across a line**
- **Found during:** Task 1's verify ("BEH-QD-732 does not cite its decision")
- **Issue:** the Pinned by lines of BEH-QD-732 and BEH-QD-733 broke "Specified in ADR-QD-192 (CCR-QD-471)." over two lines, which the verify (and a reader grepping) does not find.
- **Fix:** the sentence starts its own line in both. The Task 1 commit was amended before any later commit existed.
- **Files modified:** `spec/behaviors/28-devtools-screens.md`
- **Commit:** 03a8cf75

### Orchestrator-decided additions

**3. The `instances()` pin.** Carried out as the brief's last fact says: a new test file (not a pinned or characterisation file), shown failing once, recorded in `79-RED-EVIDENCE.md`, named in ADR-QD-192 (Rev 1.1, a `spec-revise` entry) and in BEH-QD-732, BEH-QD-734, INV-QD-403 and the traceability rows. It is a `test(79-14)` commit, separate from the spec commits. ADR-QD-192, which the plan's file list does not name, is therefore also modified by this plan.

No other deviation.

## Decisions Made (autonomous)

- The registry read counts are stated as requirements of BEH-QD-734 (the hook) and their no-op half in BEH-QD-732 and INV-QD-403, because that is where the tests pin them.
- The ADR said "every feed and the dock apply" `sameFields`; `DockModel.ts` calls it nowhere and compares only its catalogue, so the new text says the dock applies the rule through the feeds. The ADR's Decision 2 sentence is left as 79-13 wrote it (its Revision-1.1 edit is limited to the read-count test and the Related list).
- The new test file's titles state what holds (no plan or requirement id), and its cells build the dock through the real hook with a never-building diagnostics layer for the moved-input cell.

## Risks for later plans

- 79-15 completes the CCR-QD-471 row's last sentence ("The host-facing words follow in this change") and bumps the README again; its Rev citation must be updated with it, as Task 2's verify reads the README revision.
- 79-16's mutation close is unaffected (no source changed); `DockRegistryReads.test.tsx` adds one more test to the project (1862 tests) that closes no survivor by design.
- The registry read counts are exact numbers pinned on the installed React; a React release that changes StrictMode's double effect run would move them, and the file's titles name the counts so the failure says which.

## Known Stubs

None.

## Threat Flags

None. The change is spec text and one test file; no endpoint, auth path, file access or schema changes.

## Self-Check: PASSED

- FOUND: packages/devtools/test/react/DockRegistryReads.test.tsx
- FOUND commits: 332260eb (test), 03a8cf75 (behaviours), efba484e (verify fix), 82fa22a9 (invariants), each with the one trailer
