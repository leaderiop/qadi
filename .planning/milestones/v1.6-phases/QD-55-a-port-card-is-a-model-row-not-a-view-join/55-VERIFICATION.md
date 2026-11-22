---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
verified: 2026-11-18T18:10:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-01-PLAN.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-01-SUMMARY.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-02-PLAN.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-02-SUMMARY.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-03-PLAN.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-03-SUMMARY.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-04-PLAN.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-04-SUMMARY.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-05-PLAN.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-05-SUMMARY.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-06-PLAN.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-06-SUMMARY.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-07-PLAN.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-07-SUMMARY.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-08-PLAN.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-08-SUMMARY.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-09-PLAN.md"
  - ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-09-SUMMARY.md"
  - "packages/devtools/src/model/DockModel.ts"
  - "packages/devtools/src/model/PortCards.ts"
  - "packages/devtools/src/model/Wiring.ts"
  - "packages/devtools/src/react/ServicesPanel.tsx"
  - "packages/devtools/test/model/PortCards.test.ts"
  - "packages/devtools/test/model/PortCards.tst.ts"
  - "packages/devtools/test/react/ServicesPanel.characterisation.test.tsx"
  - "spec/decisions/168-a-port-card-is-a-model-row.md"
covered_digest: "v4:sha256:862bfd589b25e24a19b618f93d569a0ee4ee0903e173837964589156ee3b2a39"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 55: A port card is a model row, not a view join Verification Report

**Phase Goal:** A port card is one row of a pure devtools model keyed by `PortName`; a misspelt or renamed port is a compile error; `ServicesPanel.tsx` renders rows and computes nothing.
**Verified:** 2026-11-18
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | A characterisation of every port card's text and `data-testid`s is written on the base and stays byte-identical | VERIFIED | `ServicesPanel.characterisation.test.tsx` (16 cases, whole `outerHTML` of the panel root) was added by `7b9db6c0` and `51e6ff48`. Both commits precede the first src change (`0a66a45b`/`314082ea`), and git history shows no later edit to the file. It passes on the final tree. I did not re-run it on the base tree. |
| 2 | One pure model function takes wiring, activity, call log and unsampled flag and returns one row per `PortName` with state, activity line, recent calls plus count beyond, consequence voice | VERIFIED | `portCards(input: ServicesInput): ServicesView` in `PortCards.ts:278`. `rowOf` builds `PortCardRow` with state, activity, consequence, tone and `CallsView`. `Listed` carries `calls` and `earlier`. The rows are one per `report.ports` entry, typed by `WiredServiceName`, which includes the four non-port services (accepted deviation). The dock model's ninth store `services` (`DockModel.ts:256`) recomputes only when one of the four inputs changes identity. |
| 3 | All three readings are keyed by `PortName`; a misspelt/unknown port is a compile error shown by a type-level test; no `string` key comparison remains in the join | VERIFIED | `PortActivity.port` changed from `string` to `PortName` (`Wiring.ts`). `ActivityByPort` and `CallsByPort` are `{ [K in PortName]: ... }` built by `tabulatePorts`. `PortCards.tst.ts` has 3 tests and 11 assertions, which pass under tstyche. `/usr/bin/grep` finds no `.find(`, `.filter(` or `===` comparison on a port in `PortCards.ts` or `ServicesPanel.tsx`. Grouping uses `Map<PortName, _>`, and `isPortName` is an own-key guard. |
| 4 | `ServicesPanel.tsx` renders rows only; most render cases moved to headless model tests; a short render test keeps the testids; ADR-QD-168 restates ADR-047 | VERIFIED | The panel takes `services: ExternalStore<ServicesView>` and uses `Match.tagsExhaustive` on closed unions. The only logic left is `.map` over rows and calls, plus `undefined` checks on fields. `DevtoolsDock.tsx` passes `props.model.services`. Render tests fell from 32 cases (base `ServicesPanel.test.tsx`) to 12. `PortCards.test.ts` has 66 cases. `spec/decisions/168-...md` exists and is indexed in `index.yaml`. The ADR-047 amendment 1.17 restates that the panel computes nothing for the Services tab. |

**Score:** 4/4 truths verified.

### Required Artifacts and Key Links

| Artifact / link | Status | Details |
| --------------- | ------ | ------- |
| `packages/devtools/src/model/PortCards.ts` | VERIFIED | 278 lines, substantive. Imported by `DockModel.ts`, and `ServicesPanel.tsx` imports its types. |
| `DockModel.services` to `ServicesPanel` | WIRED | `DevtoolsDock.tsx` passes `model.services`. The store is fed through `shownReading.subscribe(reservice)`. |
| Data flow | FLOWING | The `services` store reads `shownReading` (wiring, activity, portCalls, status). There are no hardcoded inputs. |
| ADR-QD-168, BEH-QD-611..615, INV-QD-355/356, traceability | VERIFIED | Present in the spec files (diff stat shows `spec/behaviors/28`, `invariants`, `traceability`, `decisions/index.yaml` touched). |

### Behavioral Spot-Checks

| Check | Command | Result |
| ----- | ------- | ------ |
| Model, store, panel and characterisation tests | `vitest run --project devtools` on PortCards, DockModel, Wiring, ServicesPanel* | 6 files, 212 tests passed |
| Type-level compile-error pins | `tstyche PortCards.tst.ts` | 3 tests, 11 assertions passed |
| Typecheck | `pnpm typecheck` | clean |
| House style | `check-house-style.mjs` | 549 files clean, 3 declared switches (no new ones) |
| WX-05 mutation (D-15) | `55-mutation.mjs compare 55-mutation-static.json` | `WX-05 holds (D-15)`. `DockModel` 1 to 1, `Wiring` 1 to 1, `PortCards` 1 with 0 survivors. All 14 static-ignored mutants are Killed. |

### Requirements Coverage

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| CARD-01 | SATISFIED | Truth 1 |
| CARD-02 | SATISFIED | Truth 2 |
| CARD-03 | SATISFIED | Truth 3 |
| CARD-04 | SATISFIED | Truth 4 |
| CARD-05 | SATISFIED | ADR-QD-168 and ADR-047 amendment 1.17 |
| WX-01..07 | Pending by design | These stay Pending until the milestone closes. Phase-share evidence: mutation holds, the house-style gate is clean, and nothing is added to the `as`/`!`/`any`/`switch` lists in `PortCards.ts`. |

No orphaned requirements.

### Anti-Patterns Found

None. There are no `TBD`/`FIXME`/`XXX` markers in the touched source. The only oxlint warnings found are `HeldChoice.test.ts`, which this phase did not touch.

### Human Verification Required

None. The accepted deviations are not gaps: M54 pins Live to Stopped, the four non-port cards still read "never called", and IN-01..03 are deferred Info items.

### Gaps Summary

No gaps. Residual caveat: the characterisation's "green on the base" claim rests on commit ordering and the 55-02 record. I did not check out the base to re-run it. The final-tree pass plus an unedited file is the evidence of byte-identity.

---

_Verified: 2026-11-18_
_Verifier: Claude (gsd-verifier)_
