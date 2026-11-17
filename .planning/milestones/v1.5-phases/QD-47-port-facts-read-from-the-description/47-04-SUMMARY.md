---
phase: QD-47-port-facts-read-from-the-description
plan: 04
subsystem: devtools-model
tags: [devtools, ports, wiring, port-reading, row-builder]
phase_base: 9f2051228ef4d577262891a4e7882a8683b7754e
plan_head_before: 95058d13c47f73ad22cd9635d7c47b1e9c530307
plan_head_after: 83dca085c54d8557fba9254965f4f576776e4dbf
commits: 3
requires: [47-03]
provides:
  - "Wiring.ts: defaulted read from core's isPortDefault; isDefaultName and the noneName parameter are gone"
  - "PortReading.ts (package-private): PortReader, PORT_READING, describeCall"
  - "ServicesPanel.tsx: one generic describe over describeCall; describeOne gone"
  - "PortCalls.ts: rowOf (R6, monomorphic) builds ROWS; PortCall derived from the registry"
affects: [47-05, 47-06, 47-07]
tech-stack:
  added: []
  patterns: ["a mapped type over PortName holds each port's display facts; a monomorphic row builder applied once per port instead of a widened registry-wide one"]
key-files:
  created:
    - packages/devtools/src/model/PortReading.ts
  modified:
    - packages/devtools/src/model/Wiring.ts
    - packages/devtools/src/react/ServicesPanel.tsx
    - packages/devtools/src/model/PortCalls.ts
key-decisions:
  - "ROWS uses R6 (D-18): five rowOf(PORTS.<Port>) lines, every entry checked against PortCallOf<K>, no overload or widened implementation type."
  - "PortCall is { [K in PortName]: PortCallOf<K> }[PortName] (D-19); the five aliases, PortCallOf and PortCallPort stay exported."
requirements-completed: [PFCT-01, PFCT-02, PFCT-03, PFCT-04]
actuals:
  tokens: 6000
  tasks: 3
  commits: 3
status: complete
---

# Phase 47 Plan 04: Devtools reads the port facts

Devtools reports a default by the fact core states (`isPortDefault`) instead of parsing a display name; each port's consequence and call-row reading live once in `PortReading.ts`; `ROWS` is built by one fully type-checked row builder; `PortCall` is derived from the registry. Rendered wording is unchanged.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (tracer) | `19914fd7` | `feat(47-04): the wiring report reads defaulted from the port, not its name (tracer)` |
| 2 | `90f51716` | `feat(47-04): one reading per port in PortReading.ts; the panel keeps a generic describe` |
| 3 | `83dca085` | `feat(47-04): ROWS by one checked row builder, and PortCall derived from the registry` |

Each ends with the `Co-Authored-By: Claude Sonnet 5.5` trailer. No file was deleted.

## Evidence

`WiringDefaulted.test.ts`, unedited since 47-01, was `Tests  7 failed (7)` after 47-03 and after Task 1:

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

Whole devtools project after Task 2: `Test Files  63 passed (63)`, `Tests  1469 passed (1469)`. After Task 3 the PortCalls, panel and characterisation files: `Tests  84 passed (84)`; tstyche `Tests: 281 passed`.

Held-lines check (Task 2's node verify): `held lines unchanged; no span field in the view; one reading table`. `ServicesPanel.tsx` differs from the base only in the import block and the `describe` region; `DockModel.ts` is unchanged; neither barrel names `PortReading`.

Task 3's scan: `R6 rows, derived PortCall, no widened type` (no `unknown`, overload, `as`, `any` or `!` in the added lines).

`pnpm check:fast`: all 13 steps passed (typecheck, lint, circular, tstyche, vitest, bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:website-examples, spec:publish).

## Deviations from Plan

None - plan executed exactly as written. (`rowOf` is formatted with its type parameters on one line so the plan's signature check matches.)

## Known Stubs

None.

## Threat Flags

None. No new boundary: `isPortDefault` is pure and total, and `PortReading.ts` is display prose.

## Self-Check: PASSED

`PortReading.ts` exists; commits `19914fd7`, `90f51716`, `83dca085` are ancestors of HEAD; no test file was edited (`git diff --stat 95058d13 -- packages/devtools/test` is empty).
