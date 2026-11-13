# Phase 36 ledger

Every item is re-verified at `phase_base` e018203500839e381f34734c68ad411cbd426c47 (the parent of the baseline commit; `git diff d31a25ee e0182035 -- packages spec scripts` is empty, so every file:line below is the one at the last code commit d31a25ee).

| Item | Base evidence | Disposition | Plan | Closed by |
|------|---------------|-------------|------|-----------|
| DEBT-01 | `spec/behaviors/29-devtools-simulator.md:28` and `:190` (BEH-QD-219 printed twice; duplicated by `1434c524`) | fixed | 36-11 | `8f35ead7` |
| DEBT-02 | `spec/traceability.md:71` (`Sources,` token; `Sources.ts` deleted by `dab09bc0`; the premise departs, so the stale token is deleted) | fixed | 36-11 | `45c59daa` |
| DEBT-03 | `.planning/MILESTONES.md:76` (the one live "replay fail-open undecided" claim) | fixed | 36-11 | `b4b970ff` |
| 24 IN-01 | `packages/devtools/src/model/SimulationSession.ts:401` (`build()` calls `prepareSource`, which builds a recorder per commit) | fixed | 36-08 | `00d04248` |
| 24 IN-02 | `spec/README.md:352` (CCR-QD-414 cites Rev 1.148; a history row) | exempt | 36-11 | exempt: a change-history row, true when written and not rewritten (AGENTS.md §15) |
| 24 IN-03 | `packages/devtools/src/model/SimulationSource.ts:187` (private `Ready`), `SimulationSession.ts:472` and `:493` (inline `Extract`) | fixed | 36-08 | `00d04248` |
| 24 IN-04 | `packages/devtools/test/model/SimulationSession.test.ts:978-1005` (asserts `Idle` strictly; the disjunction went with the v1.2 squash `aab87576`) | resolved | 36-11 | resolved before the phase: `SimulationSession.test.ts:978-1005` asserts `Idle` strictly since `aab87576` |
| 24 IN-05 | `6c198da1` (no "last yield" text remains in `packages/*/src`; `SimulationSession.ts:33` uses a `FiberHandle`) | resolved | 36-11 | resolved before the phase by `6c198da1` |
| 24 IN-06 | `.planning/milestones/v1.2-phases/24-simulation-source-preparation/deferred-items.md:8` (heading ends "RESOLVED 2026-11-11"), `12a6631c` | resolved | 36-11 | resolved before the phase by `12a6631c` (`deferred-items.md:8` reads RESOLVED 2026-11-11) |
| 25 IN-01 | `packages/devtools/src/react/Simulator.tsx:470` (`reading?.sentence`), `SimulationSession.ts:181-183` (two fields tied by a comment) | fixed | 36-08 | `0cbd2f95` |
| 25 IN-02 | `packages/devtools/test/react/Simulator.test.tsx:9-10` and `:414-420` (say a fixture run settles inside `runFork`) | fixed | 36-10 | `8f232992` |
| 26 IN-01 | `9f40fcbb` (dock) and `2086026d` (explorer, held choice) removed the constant-`undefined` run store | resolved | 36-11 | resolved before the phase by `9f40fcbb` and `2086026d` |
| 26 IN-02 | `packages/devtools/src/react/DevtoolsDock.tsx:44` (`const nothing`), duplicating `TimelineFeed.ts:35` (`NO_SOURCE`) | fixed | 36-07 | `0637ed52` |
| 26 IN-03 | `packages/devtools/test/model/DockModel.test.ts:14-16` (header) and eleven "was DevtoolsDock l.N" titles from `:186` | fixed | 36-10 | `8f232992` |
| 27 IN-01 | `packages/http/src/GuardRoute.ts:83-85` ("the one the module accepts") | fixed | 36-10 | `ec4a0384` |
| 27 IN-02 | `packages/http/src/GuardRoute.ts:79-80` ("lost ARCH-57's probe" is house terminology: `GuardRoute.tst.ts:20`, `UnguardedRoute.ts:11-12`) | refuted | 36-11 | refuted: the phrase is house terminology (`GuardRoute.tst.ts:20`, `UnguardedRoute.ts:11-12`) |
| 28 IN-01 | `packages/react/src/GateWriter.ts:7` ("three" re-exported types; `GateRegistry.ts:47` re-exports four) | fixed | 36-10 | `ec4a0384` |
| 28 IN-02 | `packages/react/src/GateWriter.ts:164` (`{@link useGates}` does not resolve) | fixed | 36-10 | `ec4a0384` |
| 28 IN-03 | `spec/invariants.md:2676-2680` (INV-QD-064 Source; the handle is built in `GateRegistry.ts:95-119`) | fixed | 36-11 | `8fbea283` |
| 28 IN-04 | `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md:106-107` ("the only test edit is one import") | fixed | 36-11 | `8fbea283` |
| 28 IN-05 | `spec/decisions/053-a-gate-can-be-found.md:73-77` (names `useGates` in `GateWriter.ts` in the present tense) | fixed | 36-11 | `8fbea283` |
| 28 IN-06 | `packages/react/test/GateRegistry.test.tsx:489` (StrictMode covers mount only; narrowed to the identity-changing rerender, the prototype passed at the base; pinned green by GR-S1, GR-S2, GW-S1, and it becomes fixed if one fails) | resolved | 36-03 | resolved by characterisation: `7b80df02` pins the rerender (GR-S1, GR-S2, GW-S1) and all three pass |
| 29 IN-01 | `packages/react/src/HydrationEngine.ts:98` (`DENY_WITHHELD` restates `ALLOW_WITHHELD`) | fixed | 36-09 | `2b12ee8a` |
| 29 IN-02 | `spec/README.md:357` (CCR-QD-419 says "six", the seven src modules are right; the correction is recorded in CCR-QD-427, the row is not edited) | exempt | 36-11 | exempt: a change-history row, not edited (AGENTS.md §15); the correction is CCR-QD-427 (`5768da39`) |
| 29 IN-03 | `spec/decisions/123-a-metric-is-declared-once.md:129` ("still imports") | fixed | 36-11 | `8fbea283` |
| DEBT-05 v4-http-smoke | `packages/http/test/v4-http-smoke.test.ts:106` and `:115` (`registerApi`, removed by `b655b3be`) | fixed | 36-10 | `8f232992` |
| DEBT-05 stryker.http.mjs | `stryker.http.mjs:22-23` (`PermissionRegistry.ts`'s `addGuardedRoute`; it lives in `GuardRoute.ts:113`) | fixed | 36-10 | `16146436` |
| C1 timeline late accept | `packages/devtools/src/model/TimelineFeed.ts:73` (`accept` passes through, no token) and `:82` (`forkRead(runSource(timeline, …))`) | fixed | 36-06 | `6cf983c0` |
| C2 timeline silent death | `packages/devtools/src/model/TimelineFeed.ts:79-83` (nothing watches the fiber's exit); surfaced in the dock by 36-07 | fixed | 36-06 | `6cf983c0` |
| C3 subject not keepAlive | `packages/react/src/QadiAtoms.ts:248-250` (the seeded `subject` node is removed on the next macrotask) | fixed | 36-09 | `94f35dce` |
| C4a focus ring | `packages/devtools/src/react/DiagnosticsNotice.tsx:60-71` (`tabIndex: -1`, no outline; `theme.ts:1-14`, inline styles only) | fixed | 36-06 | `b7b6c493` |
| C4b restart contrast | `packages/devtools/src/react/DiagnosticsNotice.tsx:153` (measured 4.81:1, passes 1.4.3; hardened) | fixed | 36-06 | `b7b6c493` |
| C5a DecisionCache.test.ts:864 | `packages/core/test/DecisionCache.test.ts:864-866` ("Advances `generation`"; the counter was removed by `ce9d2a46`) | fixed | 36-10 | `8f232992` |
| C5b ADR-QD-081 | `spec/decisions/081-enforcement-error-classes-live-in-core.md:51-52` (names `Evaluate.ts` for `StandingEvaluationServices`, now `EvaluationServices.ts:40`) | fixed | 36-11 | `8fbea283` |
| C5c Evaluate.ts comments | `packages/core/src/DecisionSink.ts:15` and the wrong `Evaluate.ts` citations across core, audit and http (16 comments, 36-RESEARCH § Q4 table) | fixed | 36-10 | `ec4a0384` |
| C5d useScoped.ts:45 | `packages/devtools/src/react/useScoped.ts:45` (the `eslint-disable` directive is inert under oxlint; its justification stays) | fixed | 36-10 | `ec4a0384` |
| C6 seed lost on a late mount | `packages/react/src/HydrationEngine.ts:694` (the seed atom is an unread, non-keepAlive node; the `observedSeed` compensation is at `:706-742`) | fixed | 36-09 | `ce4dadbb` |

## Not changed, with reasons

- `PortMetrics.ts:85`: a `Metric.frequency` description asserted at `packages/core/test/Ports.test.ts:385` and part of the registry key (`type:id:description`), so changing it would split the metric. **Changed in code review (`76abc28c`):** the description now names the evaluator, not `Evaluate.ts`, and the pin in `Ports.test.ts` moved with it; the new registry entry is recorded in `.changeset/port-calls-description.md` and the CCR-QD-427 row.
- `Identity.ts:14`: the pair of owning files the author meant is not confirmable, so it is not changed.
- `PortName.ts:28` and `PortMetrics.ts:26,35,36`: they name the `evaluate` entry point as opposed to `toPredicate`, consistent with the pinned description. **Changed in code review (`76abc28c`):** `Evaluate.ts` no longer calls any port (`PortAccess.ts` does, reached from `Walk.ts`), so these now say "the evaluator" and `PortName.ts` names `Walk.ts` through `PortAccess.ts`.

## Records

CCR-QD-427 is the one change row for the phase's records (36-11 adds it, 36-13 completes it); no other change-history row is written or rewritten.
