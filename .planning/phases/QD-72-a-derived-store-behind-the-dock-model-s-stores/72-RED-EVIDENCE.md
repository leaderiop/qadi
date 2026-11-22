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

## The closed-model regression on the base

Command (from the repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts --reporter=json --outputFile=<scratch>/red-01.json
```

Head: `060735e1777efd08544df9cb2387101d820d1c02` (the regression test's commit; no `packages/*/src` file differs from
the phase base `74f631ada0e04a6003e4dbf959db93ca161f6136`).

Result: `61 passed, 1 failed` (62 distinct titles).

Failing title: `a model whose scope closed merges no reading a later configure hands it`

First failure line, verbatim:

```
AssertionError: expected { status: { _tag: 'Off' }, …(1) } to equal { status: { _tag: 'Off' }, …(1) }
```

The base merges the reading a later `configure` hands a closed model into the diagnostics store and tells its listener.
