# Phase 72 — RED and characterisation evidence

This file records the evidence the phase's tests rest on: the characterisation of the dock model's three computed
stores shown green on the base, each RED test shown failing once on the base, each type guarantee gutted once and
shown failing, and their greens. The characterisation's expected values are fixed for the rest of the phase.

## The characterisation on the base

Command (from the repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.characterisation.test.ts --reporter=json --outputFile=<scratch>/char-01.json
```

Phase base: `74f631ada0e04a6003e4dbf959db93ca161f6136` (no `packages/*/src` file differs from it when the run was made).

Result: `15 passed, 0 failed`.

No row was corrected. Rows 13 and 14, which the plan reasoned from the code rather than ran, hold the values the plan
gave: a throwing questions listener lets the services store recompute and the diagnostics listener run, and
`configure` rethrows that very value; a guard and three reading configures notify `questions`, `services`,
`diagnostics`, `questions`, `diagnostics`, in that order.
