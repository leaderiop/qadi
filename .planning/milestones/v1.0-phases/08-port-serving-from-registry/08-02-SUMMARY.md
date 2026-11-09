---
phase: 08-port-serving-from-registry
plan: 02
subsystem: core
tags: [arch-53, adr-qd-094, ports, tabulate-ports, fixture-ports-layer, serv-04, serv-05, ccr-qd-392]
requires: ["08-01"]
provides:
  - "tabulatePorts: layer form and uniform form over one five-row body (two overloads)"
  - "fixturePortsLayer(setups?) derived from the registry over per-port { answers?, layer? }"
  - "qadiReviewLayer passing options.ports straight to core"
  - "spec/overview.md Revision 1.75"
affects: [08-03, 08-06]
key-files:
  created: []
  modified:
    - packages/core/src/Ports.ts
    - packages/core/src/PortRemote.ts
    - packages/core/test/Ports.test.ts
    - packages/core/test/PortsLayer.test.ts
    - packages/core/test/Ports.tst.ts
    - packages/testing/src/QadiReviewLayer.ts
    - packages/devtools/src/model/SimulationSource.ts
    - packages/devtools/src/model/Capture.ts
    - packages/devtools/test/model/Capture.test.ts
    - spec/overview.md
    - spec/traceability.md
decisions:
  - "D-07: tabulatePorts is two overloads (layer form first, uniform form second) over one implementation; the separate layer builder is deleted"
  - "D-08: fixturePortsLayer derives from the registry with no `as`; no explicit per-port rows were kept"
  - "D-09: qadiReviewLayer passes TestLayerOptions.ports to core unchanged; the answers/layers split helpers are gone"
metrics:
  duration: "~25 min"
  completed: 2026-11-08
status: complete
actuals:
  tokens: 23000
  tasks: 2
  commits: 3
plan_head_before: f140d61e11276d411465d0bb54226aa80950ef0d
plan_head_after: a0333efc8a47dd389687fa2a0a7ab0655ca827a4
---

# Phase 8 Plan 2: One per-port table builder and a registry-derived fixture environment Summary

`tabulatePorts` is now the one per-port table builder (a layer form and a uniform form over a single five-row body), `fixturePortsLayer(setups?)` names no port, and `@qadi/testing` hands `ports` to core unchanged. Nothing here reads 08-01's `d01_outcome`.

## TDD

### RED

Test: "each port answers from its data: the sampled question allows, a missing one denies" in `packages/core/test/Ports.test.ts`, rewritten to wrap each sample's data as `{ answers: sample.data }`. The describe also gained Test B (a layer wins over the same port's answers, other ports left alone) and Test C (no argument and entries naming neither field fail closed).

Why it failed: against the old `(data, overrides)` signature `{ answers: data }` was read as the data itself, so the attribute port saw no `tier` and answered `deny,deny` where `allow,deny` was planned. Three tests failed (each-port, no-argument, layer-wins); the classifier was run on the first.

Evidence: `pnpm --silent vitest run --project core packages/core/test/Ports.test.ts -t 'each port answers from its data' --reporter=tap-flat`, exit 1, `gsd_run check tdd-red-evidence` returned `RED_EVIDENCE_OK` (`target_test_failed`).

Semantic assessment: the target executed and failed on its own assertion (`expected 'deny,deny' to equal 'allow,deny'`), for the planned reason, not on an import, syntax or fixture fault. One adjustment to get a parseable report: the first run compared arrays, whose multi-line vitest diff broke the TAP parser (`Non-TAP data`, `Malformed TAP`, INVALID_RED `invalid_record`). The assertion was changed to compare an `"allow,deny"` string, so the diff is one line. No report was edited.

### GREEN

`fixturePortsLayer` rewritten over the registry; `qadiReviewLayer` and devtools' `fixtureLayer` updated. All 2880 tests in core, testing and devtools pass, `TestLayerOptions.tst.ts` and `TestLayers.test.ts` untouched.

### REFACTOR (Task 2)

`tabulatePorts` made the one builder; the separate layer builder removed everywhere.

### Commits

- `867c82b` test(08-02): failing tests for registry-derived fixturePortsLayer setups
- `77e3d6a` feat(08-02): derive fixturePortsLayer from the registry and pass testing's ports through
- `a0333ef` refactor(08-02): make tabulatePorts the one per-port table builder

## D-08 outcome (cited by plan 08-06)

The as-free, registry-derived form was used. The exact expression:

```ts
export const fixturePortsLayer = (setups: PortFixtures = {}): Layer.Layer<PortServices> =>
  mergePorts(
    tabulatePorts((d) => {
      const setup = setups[d.port];
      return setup?.layer ?? fixtureLayer(PORT_FIXTURES[d.port], setup?.answers) ?? NONE[d.port];
    }),
  );
```

The final `?? NONE[d.port]` is what lets it use the layer form. No `as`, `!` or `any`. `PortFixtures` is `{ readonly [K in PortName]?: { readonly answers?: PortFixtureData[K] | undefined; readonly layer?: Layer.Layer<ServiceOf<PortTypes[K]>> | undefined } | undefined }`, written inline so gate 13 sees no new export. `@qadi/testing`'s exclusive `PortSetups` is assignable to it as it stands.

## D-07 decision (cited by plan 08-06)

Two overloads over one implementation, as `createPermissionGroup` does in `Permission.ts`: overload 1 `tabulatePorts(f: PortLayerVisitor): PortLayers` (first, so an untyped call picks it), overload 2 `tabulatePorts<F extends { readonly [K in PortName]: unknown }>(f: <K extends PortName>(d: DescriptionOf<K>) => F[K]): { readonly [K in PortName]: F[K] }`, implementation `(f: PortVisitor<unknown>)` with the five `f(PORTS.X)` rows. The reason is TS #30769: `F[K]` as a return target is the intersection of every slot, so a per-port-typed value cannot be checked through `F`. The separate layer builder (published in `@qadi/core@0.10.0`) is deleted, so this is Breaking; the changeset and upgrading page are plan 08-06's. `PortLayerVisitor` stays, as overload 1's parameter.

## spec-revise outcome (cited by plan 08-06)

`spec/overview.md` Revision **1.74 -> 1.75** (2026-11-08): "tabulatePorts takes the per-port layer form and the separate layer builder is removed; PortFixtures is per-port answers or a layer and fixturePortsLayer takes one argument (ARCH-53, CCR-QD-392)". Rows edited: `PortFixtureData`/`PortFixtures`, `PORT_FIXTURES`/`fixturePortsLayer`, `tabulatePorts`, the merge/decorate/forEvery row (the removed name dropped) and the visitor-types row. `spec/traceability.md` row for `PortsLayer.test.ts` updated to say `tabulatePorts`.

## Measured gates

| Check | Before | After |
| ----- | ------ | ----- |
| mentions of the removed builder under `packages/` | 15 | 0 |
| `f(PORTS.` rows in `Ports.ts` | 10 | 5 |
| per-port object rows in `Ports.ts` | 25 | 15 |
| `answersOf`/`layersOf` in `QadiReviewLayer.ts` | 4 | 0 |
| `Effect.fnUntraced` in `packages/*/src` | 3 | 3 |

Green: `pnpm vitest run --project core --project devtools --project http --project testing` (3149 tests), `pnpm typecheck`, `pnpm lint` (house-style 406 files clean), `pnpm circular`, tstyche on `Ports.tst.ts` (9 tests) and `TestLayerOptions.tst.ts`, `pnpm spec:api`, `spec-revise --check`, `pnpm spec:verify:strict`, `pnpm spec:examples`. `packages/testing/test` has no changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] RED report rejected by the TAP classifier**
- **Found during:** Task 1 RED
- **Issue:** array `deepStrictEqual` diffs print multi-line values that the evidence classifier reads as non-TAP data.
- **Fix:** compare an `"allow,deny"` string in the rewritten test. Behavior asserted is unchanged.
- **Files modified:** `packages/core/test/Ports.test.ts`
- **Commit:** 867c82b

**2. [Rule 2 - Missing] Stale test description in the traceability matrix**
- **Found during:** Task 2 grep for the removed name
- **Issue:** `spec/traceability.md` described `PortsLayer.test.ts` with the removed name.
- **Fix:** renamed it in that one row (XC-03).
- **Files modified:** `spec/traceability.md`
- **Commit:** a0333ef

The `spec-revise.mjs` call needed `--date 2026-11-08` explicitly (the parsing defect 08-01 already logged).

## Known Stubs

None.

## Threat Flags

None. T-08-04 (fail-closed default): pinned by Test C and the untouched "defaults fail closed" tests. T-08-05 (wider implementation signature): body is the five rows only, both result types pinned in `Ports.tst.ts`, round trip in `PortsLayer.test.ts`. T-08-06 (answers and layer both given): "a layer wins" pinned by Test B.

## Self-Check: PASSED

- All eleven modified files exist; the removed builder has zero mentions under `packages/`.
- Commits 867c82b, 77e3d6a, a0333ef are ancestors of HEAD.
- `.planning/config.json` and `.planning/state.json` were not staged.
