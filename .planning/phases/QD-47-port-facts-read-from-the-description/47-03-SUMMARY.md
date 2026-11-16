---
phase: QD-47-port-facts-read-from-the-description
plan: 03
subsystem: core-ports
tags: [ports, fail-closed-default, unique-symbol, tdd, spec]
phase_base: 9f2051228ef4d577262891a4e7882a8683b7754e
plan_head_before: 50f85d96781725734c885c3c859b97e3337ca9f4
plan_head_after: 98337fcb7c6236bc9d192043f5ad68dd7496c13e
commits: 3
requires: [47-02]
provides:
  - "PortDefault.ts (package-private): a unique-symbol mark holding the PortName a default belongs to"
  - "isPortDefault(d, service) in PortDescription.ts, public through the existing export *"
  - "nonePort marks; wrapPort, boundedPort and decoratePorts carry the mark"
  - "PortDefault.test.ts (27 rows) and PortDefault.tst.ts"
  - "overview row for isPortDefault; CCR-QD-438 row started"
affects: [47-04, 47-05, 47-06, 47-07]
tech-stack:
  added: []
  patterns: ["a package-private unique symbol as an own, enumerable, symbol-keyed mark; a wrapper keeps it by spreading inner"]
key-files:
  created:
    - packages/core/src/PortDefault.ts
    - packages/core/test/PortDefault.test.ts
    - packages/core/test/PortDefault.tst.ts
  modified:
    - packages/core/src/PortDescription.ts
    - packages/core/src/PortDerivation.ts
    - packages/core/src/Ports.ts
    - spec/overview.md
    - spec/README.md
key-decisions:
  - "The mark is keyed by a `unique symbol` built with `Symbol(\"qadi.PortDefault\")`, never `Symbol.for`, in a module the barrel does not export (D-03, D-20)."
  - "The reader takes `{ readonly port: PortName }` and `service: unknown` and reads the own property descriptor, so an inherited mark (Object.create) reads false."
  - "Both the 4-deep stacks keep boundedPort outermost: every derivation takes an error-free layer, so a bounded layer (error InvalidBoundedPermits) can only be last."
requirements-completed: [PFCT-01, WX-03, WX-06]
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
status: complete
---

# Phase 47 Plan 03: A port's fail-closed default carries a mark, and isPortDefault reads it

`nonePort` marks the default it builds with a package-private unique symbol holding its `PortName`; `wrapPort` (so retrying, timing out and recording), `boundedPort` and `decoratePorts` copy the mark from what they wrap; `isPortDefault` answers it. 27 rows and a type pin hold it, each written before its implementation.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (tracer) | `368e3a1d` | `feat(47-03): a port's fail-closed default carries a mark, and isPortDefault reads it (tracer)` |
| 2 | `f354600f` | `feat(47-03): every derived wrapper and decoratePorts carry the default's mark` |
| 3 | `98337fcb` | `docs(47-03): the overview names isPortDefault, and CCR-QD-438 is started` |

Each ends with the `Co-Authored-By: Claude Sonnet 5.5` trailer. No file was deleted.

## RED before the reader

`pnpm exec tsc -p tsconfig.test.json` (the reader absent):

```
packages/core/test/PortDefault.test.ts(20,10): error TS2305: Module '"../src/PortDescription.ts"' has no exported member 'isPortDefault'.
packages/core/test/PortDefault.tst.ts(8,10): error TS2305: Module '"../src/PortDescription.ts"' has no exported member 'isPortDefault'.
```

`pnpm exec vitest run --project core packages/core/test/PortDefault.test.ts`:

```
 Test Files  1 failed (1)
      Tests  13 failed (13)
```

After the mark, the reader and `nonePort`'s marking: `Tests  13 passed (13)`.

## RED before the carry

With the nine W rows and the five `decoratePorts` rows appended and no carry yet:

```
 Test Files  1 failed (1)
      Tests  12 failed | 15 passed (27)
```

W1 to W7 and the five `decoratePorts` rows failed; W8, W9 and Task 1's 13 passed.

## After the carry

```
 Test Files  1 passed (1)
      Tests  27 passed (27)
```

Whole core project 2393 passed, devtools project (without `WiringDefaulted.test.ts`) 1462 passed; `pnpm typecheck`, `pnpm lint`, `pnpm circular` exit 0. tstyche, after Task 1:

```
Targets:    1 passed, 1 total
Test files: 55 passed, 55 total
Tests:      281 passed, 281 total
Assertions: 598 passed, 598 total
```

`./packages/core/test/PortDefault.tst.ts` is among the passing files.

## Gate 13 before the overview row (Task 3 RED)

```
packages/core/src/PortDescription.ts  [missing] `isPortDefault` is exported by @qadi/core and is not named in spec/overview.md's Public API surface section. Add it to a table, or to "Not listed above" with a reason.
1 API-surface drift(s).
```

After the row: `api-surface: 929 export(s) documented across 9 package(s)`; `pnpm spec:verify:strict` `PASS: 21 FAIL: 0 SKIP: 0`. `spec/overview.md` is Rev 1.113 and `spec/README.md` Rev 1.200 (both printed by `spec-revise`); the CCR-QD-438 row lists them.

## Deviations from Plan

None - plan executed exactly as written. (Both four-deep stacks keep `boundedPort` outermost, as the plan's flagged assumption said.)

## Known Stubs

None.

## Threat Flags

None. The mark is read only by `isPortDefault`; `PortDoubles.ts` and `PortRemote.ts` do not mention it; the barrel does not name `PortDefault`.

## Notes for 47-04

`WiringDefaulted.test.ts` is still RED by design: devtools' `Wiring.ts` still parses `isDefaultName`; 47-04 reads `isPortDefault` instead.

## Self-Check: PASSED

Files exist (`PortDefault.ts`, `PortDefault.test.ts`, `PortDefault.tst.ts`); commits `368e3a1d`, `f354600f`, `98337fcb` are ancestors of HEAD; the three Task verifies' node checks print their OK lines.
