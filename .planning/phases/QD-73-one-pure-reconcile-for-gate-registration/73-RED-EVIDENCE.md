# Phase 73 — RED and characterisation evidence

This file records the evidence the phase's tests rest on: the rendered characterisation of gate registration shown green
on the base, and the update half of the reconcile shown RED once against the base, which has no update. The
characterisation's inputs and expected values are fixed for the rest of the phase.

## The characterisation on the base

Command (from the repository root, stdin closed, run three times, each alone):

```
pnpm exec vitest run --project react packages/react/test/GateRegistration.characterisation.test.tsx --reporter=json --outputFile=<scratch>/char-01-<n>.json
```

Phase base: `1dbaf1a932109af41278b9b56892083c6ec40913` (no `packages/react/src` file differs from it when the runs were
made).

Result: `19 passed, 0 failed`, three runs out of three, 19 distinct titles under `one guard`, `a grouped hook` and
`off means absent`.

No row was corrected. Every expected value the plan reasoned from the code, the registration orders and each notification
count included, is the value the base gave on its first run.
