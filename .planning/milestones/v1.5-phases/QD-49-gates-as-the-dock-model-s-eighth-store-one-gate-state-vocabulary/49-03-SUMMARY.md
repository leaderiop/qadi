---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
plan: 03
subsystem: core
tags: [gate-state, keyed-table, type-pin, adr-qd-152, arch-96]
phase_base: 76330fbd24b7aadcfc65bc78e5053f9690cc6227
plan_head_before: ba12702e8e6d2f892c622ce8562794d06cadcd18
plan_head_after: c19540ef8a6c52966c86c204e493ec7b20492b16
commits: 3
requires: [49-02]
provides:
  - "@qadi/core GateState, gateStates, isGateState over a module-private keyed table"
  - "react GateRenderState = GateState; the two-way pin to DecisionOutcome[\"_tag\"]"
  - "devtools GATE_DISPLAY keyed by GateState; GATE_STATES is gateStates; displayOfGateState on isGateState"
affects: [49-04, 49-07, 49-08, 49-09]
tech-stack:
  patterns: ["ADR-QD-152 keyed table: private as const satisfies, type from keyof, Object.hasOwn guard, list via .filter(guard)"]
key-files:
  created:
    - packages/core/src/GateState.ts
    - packages/core/test/GateState.test.ts
    - packages/core/test/GateState.tst.ts
  modified:
    - packages/core/src/index.ts
    - packages/react/src/GateWriter.ts
    - packages/react/src/DecisionOutcome.ts
    - packages/react/test/DecisionOutcome.tst.ts
    - packages/devtools/src/model/Gates.ts
    - spec/overview.md
    - spec/README.md
key-decisions:
  - "GateStateRow is an empty interface and lint accepted it: no deviation on the empty row (D-02)"
  - "Display words stay in devtools; core's rows are empty"
metrics:
  tasks: 3
  files: 10
actuals:
  tokens: 37700
  tasks: 3
  commits: 3
status: complete
---

# Phase QD-49 Plan 03: One gate-state vocabulary Summary

The five gate-state words (`Failed`, `Denied`, `Rechecking`, `Pending`, `Allowed`, worst news first) are stated once in `@qadi/core` as `GateState`, `gateStates` and `isGateState` over a private keyed table; react's `GateRenderState` is `GateState`, devtools' display is keyed by it, and a sixth word is a compile error in both places.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `8d88068a` | `test(49-03)`: the gate states stated once in core, and react's tags tied to them, RED |
| 2 | `4048669e` | `feat(49-03)`: the five gate states stated once in core, read by react and devtools |
| 3 | `c19540ef` | `docs(49-03)`: the overview names core's gate states; CCR-QD-440 started |

## RED proof (Task 1)

Run before `packages/core/src/GateState.ts` existed:

- vitest `packages/core/test/GateState.test.ts`: failed on the import of `../src/GateState.ts` (`❯ test/GateState.test.ts:13:1`, "no tests").
- tstyche `GateState.tst.ts` and `DecisionOutcome.tst.ts`: both failed, `Module '"@qadi/core"' has no exported member 'GateState'` (ts2305).
- The plan's gate printed `RED as expected: GateState.ts does not exist yet`; the commit check printed `RED committed alone, the react pin the only react test edit`.

## Verification (Task 2 and the close)

GateState vitest, both tstyche files, `Gates.test.ts`, `VerdictTreatment.test.tsx`, the twelve-cell characterisation (unchanged, byte-identical green), the whole react suite, `tsc -p tsconfig.test.json`, `pnpm lint` and `pnpm circular` all passed. `pnpm check:pr < /dev/null` exited 0 at the plan's end: 16 of 17 steps run, `pnpm mutation` skipped by design; coverage 224 files / 5448 tests, tstyche 58 files, BDD 34 files / 568 tests, `spec:verify:strict` all PASS. Task 3's `pnpm spec:api`, `spec-revise.mjs --check` and `pnpm spec:verify` passed (21 PASS, 0 FAIL).

## Negative control

A sixth key `Suspended: {}` was added to `GATE_STATE_TABLE` (never committed), then:

`pnpm exec tsc -p tsconfig.test.json`:

```
packages/devtools/src/model/Gates.ts(78,7): error TS2741: Property 'Suspended' is missing in type '{ Failed: "Error"; Denied: "Deny"; Rechecking: "Rechecking"; Pending: "Pending"; Allowed: "Allow"; }' but required in type '{ readonly Allowed: DisplayState; readonly Denied: DisplayState; readonly Failed: DisplayState; readonly Pending: DisplayState; readonly Rechecking: DisplayState; readonly Suspended: DisplayState; }'.
```

`pnpm exec tstyche packages/react/test/DecisionOutcome.tst.ts packages/core/test/GateState.tst.ts`:

```
fail ./packages/core/test/GateState.tst.ts
Error: Type '"Failed" | "Denied" | "Rechecking" | "Pending" | "Allowed" | "Suspended"' is not the same as type '"Failed" | "Denied" | "Rechecking" | "Pending" | "Allowed"'.
fail ./packages/react/test/DecisionOutcome.tst.ts
Error: Type '"Pending" | "Rechecking" | "Allowed" | "Denied" | "Failed" | "Suspended"' is not the same as type '"Pending" | "Rechecking" | "Allowed" | "Denied" | "Failed"'.
Error: Type '"Suspended"' is not the same as type 'never'.
```

Reverted with `git checkout -- packages/core/src/GateState.ts`; afterwards `git status --porcelain -- packages` printed nothing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `GateState.tst.ts` refusal fragment**
- **Found during:** Task 2 (first tstyche run after the module existed)
- **Issue:** The test's `@ts-expect-error` fragment `no exported member` did not match the compiler's TS2459 wording for a non-exported local (`declares 'GATE_STATE_TABLE' locally, but it is not exported`). It could not be seen while RED (the module did not exist, so the message was TS2307).
- **Fix:** Fragment is now `but it is not exported`. Same directive, same intent (the table is refused).
- **Files modified:** `packages/core/test/GateState.tst.ts` (carried in the Task 2 commit)
- **Commit:** `4048669e`

**2. [Plan check too broad] Task 2's source check `devtools names @qadi/react`**
- **Found during:** Task 2's second automated verify
- **Issue:** The clause greps the whole of `model/Gates.ts` for `@qadi/react`, but that file's doc comments (five mentions at the phase base, e.g. "does not depend on `@qadi/react`", all required context) name the package in prose, so the clause fails on the base too.
- **Fix:** Applied the clause's intent: no import or dependency. A code-only (comments stripped) check found no `@qadi/react`; `packages/devtools/package.json` has no `@qadi/react`; the only import-line match was prose ("not imported from it"). Every other clause of the check passed unchanged. No gate weakened; no file changed for this.

Empty-row lint note: `interface GateStateRow {}` was accepted by `pnpm lint`; no lint deviation.

## Decisions Made

- Core's rows stay empty; `Error`, `Deny`, `Allow` live only in devtools (D-02).
- `GATE_STATES` keeps its `ReadonlyArray<string>` type (`rank` calls `indexOf` with a string) and stays out of the devtools barrel.

## Known Stubs

None.

## Threat Flags

None. T-49-06 to T-49-08 mitigated as planned: own-key guard (inherited names, `Suspended`, `""`, `"failed"` refused in `GateState.test.ts`), the mapped `GATE_DISPLAY` and the two-way pin (demonstrated above), and no `@qadi/react` dependency in devtools.

## Self-Check: PASSED

- FOUND: packages/core/src/GateState.ts, packages/core/test/GateState.test.ts, packages/core/test/GateState.tst.ts
- FOUND commits: 8d88068a, 4048669e, c19540ef
- react tests changed since `phase_base`: only `packages/react/test/DecisionOutcome.tst.ts`.
