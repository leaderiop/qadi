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

## The derived store rules on the base

Command (from the repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/ExternalStore.test.ts --reporter=json --outputFile=<scratch>/red-02.json
```

Head: `37fe4c60` (the rules' commit; no `packages/*/src` file differs from the phase base
`74f631ada0e04a6003e4dbf959db93ca161f6136`).

Result: `15 passed, 16 failed` (31 distinct tests): the 15 of `describe("makeExternalStore")` pass and all 16 of
`describe("makeDerivedStore")` fail, because `makeDerivedStore` is not exported.

First failing row: `the first compute runs at construction and notifies no listener`; its first failure line, verbatim:

```
TypeError: yield* (intermediate value)(intermediate value)(intermediate value)(intermediate value)(intermediate value)(intermediate value) is not iterable
```

(The engine words the call of the missing export this way when the call is the operand of `yield*`; the row that does
not `yield*` the call, `makeDerivedStore is built under a span named for it`, reports
`TypeError: (0 , __vite_ssr_import_5__.makeDerivedStore) is not a function`.)

## The derived store type pins on the base

Command (from the repository root, stdin closed):

```
pnpm test:tstyche ExternalStore
```

Head: `c819095473f9350cc6ac1107c2a5c650a7d26fd3` (the type pins' commit). Result: exit 1, pass 1 of 2 (the floating-Effect
rule off) fails on `packages/devtools/test/model/ExternalStore.tst.ts`; the second pass is not reached.

First error line, verbatim:

```
Error: The diagnostic message did not match.
```

(it concerns the compute refusal's `@ts-expect-error` at `ExternalStore.tst.ts:65`, whose suppressed error is not yet
the property error, because the call itself does not resolve), and the line that names the cause:

```
Error: Module '"../../src/model/ExternalStore.ts"' has no exported member 'makeDerivedStore'. ts(2305)
```

Also missing on the base: `DerivedStore` and `ReadableStore`. The fragments of the three directives are checked
against the real messages once the API exists; if one is reported unmatched, 72-04's evidence records the final text.
