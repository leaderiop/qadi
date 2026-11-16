---
phase: QD-47-port-facts-read-from-the-description
plan: 05
subsystem: spec-records
tags: [adr, changesets, upgrade-guide, sixth-port, ports]
phase_base: 9f2051228ef4d577262891a4e7882a8683b7754e
plan_head_before: b6bd934193b61bd9e92430134040d2dac1ceb6ad
plan_head_after: fec62fc03c7773c39f78c705d6ce81fb3388ea4e
commits: 2
requires: [47-04]
provides:
  - "ADR-QD-160 (spec/decisions/160-port-facts-are-read-from-the-description.md), its index.yaml entry and traceability row"
  - ".changeset/port-default-is-a-mark.md (@qadi/core minor) and .changeset/devtools-defaulted-from-core.md (@qadi/devtools patch)"
  - "upgrading.md: the last 0.13 entry, both directions, with a compiling fence"
  - "the sixth-port evidence (uncommitted scratch, reverted)"
affects: [47-06, 47-07]
tech-stack:
  added: []
  patterns: ["a scratch sixth port measures what a new port costs; the compiler's list is recorded and the scratch is reverted"]
key-files:
  created:
    - spec/decisions/160-port-facts-are-read-from-the-description.md
    - .changeset/port-default-is-a-mark.md
    - .changeset/devtools-defaulted-from-core.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
key-decisions:
  - "ADR-QD-160 names BEH-QD-571 to 575 and INV-QD-339 and INV-QD-340 in plain text; 47-06 links them once their headings exist."
  - "Neither changeset nor the upgrade entry says Breaking: the one export is additive and the mark is invisible to Object.keys and JSON; both directions of a wrapper's reading are still stated."
requirements-completed: [PFCT-05, WX-02, WX-07]
actuals:
  tokens: 9000
  tasks: 3
  commits: 2
status: complete
---

# Phase 47 Plan 05: The sixth port, ADR-QD-160, the changesets and the upgrade entry

A throwaway sixth port measured what the compiler asks devtools for (four files, as expected) and was reverted; ADR-QD-160 records the decision with its index entry and traceability row; two changesets (core minor, devtools patch) and the last 0.13 upgrade entry state the change in both directions, none Breaking.

## Sixth port

Recipe as applied (RESEARCH Q4): `packages/core/src/Probe6.ts` is `AttributeResolver.ts` with every `AttributeResolver`/`attributeResolver` renamed `Probe6`/`probe6`, service id `"qadi/Probe6"`, port `"Probe6"`, span `"qadi.probe6"`; one line each in `PortName.ts`, `PortMetrics.ts`, `PortServing.ts`, and the import plus six lines in `Ports.ts` (`PortTypes`, `PORTS`, `tabulatePorts`, `mergePorts`, `PortFixtureData`, `PORT_FIXTURES`), applied by the planner's `sixth.py`. Core src compiled (no `packages/core/src` diagnostic). `pnpm exec tsc -p tsconfig.test.json` then reported 39 lines.

Devtools src flagged (exactly the four expected):

```
packages/devtools/src/model/PortCalls.ts(274,7): error TS2741: Property 'Probe6' is missing in type '{ AttributeResolver: (span: Tracer.Span) => ...
packages/devtools/src/model/PortReading.ts(29,14): error TS2741: Property 'Probe6' is missing in type '{ AttributeResolver: { consequence: string; describe: ...
packages/devtools/src/model/SimulationFields.ts(568,14): error TS2741: Property 'Probe6' is missing in type '{ AttributeResolver: (input: SimulationInput) => ...
packages/devtools/src/model/SimulationSource.ts(145,91): error TS2741: Property 'Probe6' is missing in type '{ AttributeResolver: { readonly answers: ...
```

`model/Wiring.ts` and `react/ServicesPanel.tsx` are not flagged (D-19): neither names a port.

Devtools tests flagged: `packages/devtools/test/model/Capture.test.ts(914,9)` (TS2741, its port-keyed table). Outside PFCT-05 and not edited: core tests (`PortAccess`, `PortConformance`, `PortRemote`, `PortServe`, `PortSpan`, `Ports`, `PortsLayer`), `packages/http/test/PortRoutes.test.ts`, `packages/react/test/DecisionOutcome.test.ts`, `features/features/port-calls/port-calls.steps.test.ts` (`PortCallOf<"Probe6">` has no `answer`), and six TS2883 in `@qadi/http` src (the scratch port is not in the barrel, an artefact).

Revert: `git checkout -- packages/core/src/PortName.ts packages/core/src/PortMetrics.ts packages/core/src/PortServing.ts packages/core/src/Ports.ts`, `rm packages/core/src/Probe6.ts`. `git status --porcelain -- packages` then printed nothing (clean). No commit of this plan names `Probe6` in a packages change.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | none | evidence only, above |
| 2 | `dc9e3a77` | `docs(47-05): ADR-QD-160, port facts are read from the description` |
| 3 | `fec62fc0` | `docs(47-05): changesets and the 0.13 upgrade entry for the port-default fact` |

Each ends with the `Co-Authored-By: Claude Sonnet 5.5` trailer.

## What was recorded

- **ADR-QD-160** (Rev 1.0, `Accepted — reads ADR-QD-094, ADR-QD-109`): the mark, `isPortDefault`, the display name kept as display, `PORT_READING`, R6, the derived `PortCall`, the sixth-port cost; alternatives (string field, `WeakSet`, `Symbol.for`, R7, R1, a reader per row, deriving the fixture tables, a public naming helper); consequences in both directions. Indexed; traceability §3 row added (`spec/traceability.md` 1.195 to 1.196); the CCR-QD-438 row names it, `index.yaml`, traceability Rev 1.196, `PortReading.ts`, `Wiring.ts`, `PortCalls.ts` and `ServicesPanel.tsx` (`spec/README.md` 1.200 to 1.201).
- **Changesets:** `@qadi/core` minor (`isPortDefault`, the mark, the carries) and `@qadi/devtools` patch (reads the fact from core), separate files, neither Breaking.
- **Upgrade entry** `## 0.13: a port's defaulted state is read from the port, not its name`, after the sink entry: a spreading wrapper now reads defaulted (also when it replaces the method), a fresh-object or `Object.create` wrapper now reads as a real adapter, the duplicate-install limit, a compiling spreading-wrapper fence, and the ADR link.

## Verification

`pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0`. `node scripts/spec-revise.mjs --check`: every Revision matches. `pnpm spec:website-examples`: `65 block(s) compile`. `pnpm spec:gates` and `pnpm spec:claims` pass. Task 2's and Task 3's node verifies print their `ok` lines.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. T-47-17 is mitigated (the scratch is reverted and absent), T-47-18 mitigated (both directions in the upgrade entry and the ADR), T-47-19 accepted and stated.

## Self-Check: PASSED

`spec/decisions/160-port-facts-are-read-from-the-description.md`, both changesets and `upgrading.md` exist; `dc9e3a77` and `fec62fc0` are ancestors of HEAD; `packages/core/src/Probe6.ts` is absent and `git status --porcelain -- packages` is empty.
