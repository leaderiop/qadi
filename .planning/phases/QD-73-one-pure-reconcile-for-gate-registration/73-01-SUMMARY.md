---
phase: QD-73-one-pure-reconcile-for-gate-registration
plan: 01
subsystem: testing
tags: [stryker, mutation-base, characterisation, gate-registration, react]

requires: []
provides:
  - "73-mutation.mjs: the phase's mutation scorer (groups writer, hook; --restart; empty EXAMINED; self-test of 29 cases)"
  - "73-mutation-base.json: GateWriter.ts and useGate.ts measured on phase_base"
  - "packages/react/test/support/gates.ts: notificationsOf, the one registry notification counter"
  - "packages/react/test/support/trees.tsx: the fixtures, atoms, providerTree, guardTrees, Group, listed and snapshotOf the gate tests share"
  - "GateRegistration.characterisation.test.tsx: 19 rows pinning gate registration through the real QadiProvider"
  - "73-RED-EVIDENCE.md: the characterisation green on the base and the update half red on the base"
affects: [73-02, 73-03, 73-04, 73-05, 73-06, 73-07]

phase_base: 1dbaf1a932109af41278b9b56892083c6ec40913
plan_head_before: 1dbaf1a932109af41278b9b56892083c6ec40913
plan_head_after: cd78c996ecc5ba66373333eba157ad32a8962ca7

actuals:
  tokens: 15800
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "one Stryker group per file, recorded right after its own run, on a commit before any phase file exists"
    - "a characterisation committed alone before any source change, through shared support modules"
    - "a RED shown once with an uncommitted scratch test, recorded with its command and first failure line"

key-files:
  created:
    - .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-mutation.mjs
    - .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-mutation-base.json
    - .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-RED-EVIDENCE.md
    - packages/react/test/support/gates.ts
    - packages/react/test/support/trees.tsx
    - packages/react/test/GateRegistration.characterisation.test.tsx
  modified:
    - packages/react/test/GateRegistry.test.tsx

key-decisions:
  - "The mutation base was measured before any file of the phase existed (reverses CONTEXT's suggested order), so a phase test cannot inflate it"
  - "The characterisation takes the base's behaviour as truth; every row matched the plan's expected value, so none was corrected"
  - "guardTrees returns a named GuardTrees interface: the inferred return type holds a Testing Library type tsc cannot name (TS2883)"

requirements-completed: []  # RECN-01, RECN-04, WX-05, WX-06, WX-07 stay Pending by instruction; only 73-07 marks requirements

duration: ~20min
completed: 2026-11-23
status: complete
---

# Phase 73 Plan 01: Mutation base and characterisation of gate registration Summary

**A committed Stryker scorer with its base record of `GateWriter.ts` (95/96) and `useGate.ts` (62/74), then a 19-row characterisation of what registers, under which id, with what state and how many registry notifications each step makes, rendered through the real `QadiProvider` and green on the unchanged base, plus the update half of the reconcile shown red once.**

## Performance

- **Duration:** about 20 min (start time was not captured at the first command; estimated from the Stryker log timestamps)
- **Tasks:** 3 of 3
- **Files:** 6 created, 1 modified; no `packages/react/src` file touched (`git diff --quiet <phase_base> -- packages/react/src` holds)

## Accomplishments

- Task 1 (tracer): `73-mutation.mjs` is the Phase 72 scorer with groups `writer` and `hook`, an empty `EXAMINED`, and a self-test that ends `self-test: 29 passed`. Both groups were measured on `phase_base` with `pnpm exec stryker run stryker.react.mjs --mutate <file>`, alone, stdin closed. Its commit is the first after `phase_base` and holds exactly the scorer and its record.
- Task 2: the two support modules and the move of `GateRegistry.test.tsx` onto them are one commit (the file passes its 40 tests with every title, matcher, expected value and `expect` count unchanged); the characterisation is the next commit, alone (19 rows, 19 distinct titles of at most 80 characters, three runs out of three, whole react project green at 644 tests).
- Task 3: the update half failed `0 passed, 2 failed` against the base `reconcile` (the log is empty where `["update", "a", <state>]` is expected); the scratch test is deleted and in no commit.

## Base facts

Copied from `<scratch>/base-facts.txt` (measured on `phase_base`, 2026-11-23):

```
house-style: 571 file(s) clean (3 declared switch(es), 69 type-test file(s))
api-surface: 941 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 154 reference(s) resolve
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 118 block(s) compile
spec-revise: every Revision matches its newest Change History entry
| PASS   | invariants -> traceability                 | all 162 invariant(s) traced
| PASS   | decisions -> traceability                  | 142 ADR(s) traced
| PASS   | ADR Document ID = file number              | 118 ADR(s) agree
| PASS   | §4 test files -> disk                     | 314 file(s) exist
reservation-sha256: 07a779c95ed6f98639077d67dedd68179830521c7aeb5adf925ad6b21749836f
```

Every count equals the plan-time evidence.

### The proving grep on the base (20 lines)

```
packages/react/src/useGate.ts:90:  const stableRef = useRef(identities);
packages/react/src/useGate.ts:91:  const previous = stableRef.current;
packages/react/src/useGate.ts:94:    !identities.every((identity, i) => {
packages/react/src/useGate.ts:99:    stableRef.current = identities;
packages/react/src/useGate.ts:101:  const stable = stableRef.current;
packages/react/src/useGate.ts:103:  latest.current = identities;
packages/react/src/useGate.ts:104:  const statesRef = useRef(states);
packages/react/src/useGate.ts:105:  statesRef.current = states;
packages/react/src/useGate.ts:131:        const now = latest.current[i];
packages/react/src/useGate.ts:134:          : { policy: now.policy, resource: now.resource, state: statesRef.current[i] ?? "Pending" };
packages/react/src/useGate.ts:144:  const stateKey = states.join("|");
packages/react/src/useGate.ts:148:      const state = statesRef.current[i];
packages/react/src/useGate.ts:297:    Record.values(identities),
packages/react/src/useGate.ts:298:    Record.values(entries).map((entry) => entry.outcome._tag),
packages/react/src/GateWriter.ts:271:  a.id === b.id &&
packages/react/src/GateWriter.ts:284:export interface GateCurrent {
packages/react/src/GateWriter.ts:308:  current: ReadonlyArray<GateCurrent | undefined>,
packages/react/src/GateWriter.ts:312:    const identity = wanted.find((one) => one.id === id);
packages/react/src/GateWriter.ts:318:    const now = current[i];
packages/react/src/GateWriter.ts:326:        state: now?.state ?? "Pending",
```

### The base mutation counts (`73-mutation-base.json`, head `phase_base`)

| Group | File | Detected / valid | Survived | NoCoverage | Ignored |
|-------|------|------------------|----------|------------|---------|
| `writer` | `packages/react/src/GateWriter.ts` | 95 / 96 | 1 (line 271, `ConditionalExpression -> true`) | 0 | 2 |
| `hook` | `packages/react/src/useGate.ts` | 62 / 74 | 11 | 1 (line 134, `StringLiteral -> ""`) | 25 |

`useGate.ts` had never been measured; its 12 open mutants are the base the close compares against.

### Characterisation rows whose value was taken from the base

None. All 19 rows, the registration orders and every notification count, gave the value the plan reasoned from the code on the first run (including row 10's count of 2 for a grouped hook, which settles in the first render under `EvaluationServicesNone`).

## Task Commits

1. Task 1 (tracer): `387a5a5b` docs(73-01): record the mutation base of the gate writer and its hook
2. Task 2a: `06060b79` test(73-01): share the gate test helpers in two support modules
3. Task 2b: `2680ab4d` test(73-01): characterise gate registration through the provider
4. Task 2c: `0ba19ee4` docs(73-01): record the gate registration characterisation green on the base
5. Task 3: `cd78c996` docs(73-01): record the update half red on the base

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `guardTrees` needed a named return type**
- **Found during:** Task 2 (`tsc -p tsconfig.test.json`)
- **Issue:** TS2883, the inferred return type names a `@testing-library/dom` type through a pnpm path.
- **Fix:** an exported `GuardTrees` interface (`mount` returning `RenderResult`, `adopt`, `instances`) and an explicit annotation. The plan's export list for `trees.tsx` gains `GuardTrees`.
- **Files modified:** `packages/react/test/support/trees.tsx`
- **Commit:** `06060b79`

**2. [Rule 1 - Layout] Three history-neutral adjustments**
- Two file-local helpers beyond `settled` in the characterisation, `firstId` and `hookId`, so ids are read from the registry (or built as `${base}/name`) and no id literal appears.
- The characterisation's expected objects and long `it(` lines were wrapped at 90 columns with `oxfmt` run on a scratch copy at `printWidth` 90 (no config is added to the repository, AGENTS.md section 17), then the six titles whose `it(` line passed 90 columns were put on their own line, as the plan says.
- The one long `waitFor` line of `GateRegistry.test.tsx` is wrapped so its matcher text stays `.toEqual(["Denied", "Allowed"]));`, identical to the base's, because Task 2's verify compares matcher text literally. The first wrap added a trailing comma and failed that comparison. The fix was made before anything was pushed: the three Task 2 commits were re-made on top of `387a5a5b` (`git reset` to it, then re-committed in the same order with the same messages), so the verify's "no change to the moved file after the helper commit" holds.

### Verification-only

- Task 1's verify and the base facts read the traceability run's `PASS: 21   FAIL: 0   SKIP: 0 …` line; the script's log ends with two blank lines, so that line was taken with `grep` rather than `tail -n 1`. Its text is exactly the plan's.
- Task 2's verify, when first run, failed `a matcher or an expected value of GateRegistry.test.tsx changed (90 vs 90)`: one matcher differed only by a trailing comma from my wrap (deviation 2 above). It was corrected in the source layout, never by loosening the check.

**Total deviations:** 1 auto-fixed (Rule 3), 3 layout adjustments, 2 verification-only. **Impact:** none on scope or on any expected value.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. The plan changes planning records and test files only.

## Next Phase Readiness

Ready for 73-02. The characterisation stays unchanged to the end of the phase; every later change is held to its 19 rows, and the close compares both groups against `73-mutation-base.json`.

## Self-Check: PASSED

- Files exist: `73-mutation.mjs`, `73-mutation-base.json`, `73-RED-EVIDENCE.md`, `packages/react/test/support/gates.ts`, `packages/react/test/support/trees.tsx`, `packages/react/test/GateRegistration.characterisation.test.tsx` (all found on disk).
- Commits `387a5a5b`, `06060b79`, `2680ab4d`, `0ba19ee4`, `cd78c996` are ancestors of HEAD.
- Verifies of Tasks 1 to 3 printed `base measured and recorded`, `characterisation green on the base` and `update half red on the base`; `git diff --quiet <phase_base> -- packages/react/src` holds; the whole react project passes (38 files, 644 tests); `pnpm exec tsc -p tsconfig.test.json` is clean.
