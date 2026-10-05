# Traceability Matrix

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-RTM                                       |
> | Revision       | 1.79                                           |
> | Effective Date | 2026-10-04                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Verification Record                            |
> | Change History | 1.79 (2026-10-04): the predicate-compilation rows follow ADR-QD-079 — BEH-QD-271/265, INV-QD-061/059, `RenderablePredicate.ts`/`PredicateLiteral.ts` as sources, the retired JavaScript readers' test rows removed (`sqlInterpreter`, `matchesPrismaWhere`, and `matchesPrismaWhereEngine` after a mutation-score measurement), and `EngineAgreement.test.ts` (both packages), `RenderablePredicate.test.ts` and `PredicateLiteral.test.ts` added (CCR-QD-158)<br>1.78 (2026-10-04): ADR-QD-079 row; INV-QD-048 enforcement and the predicate-prisma test rows name the three-valued engine model and the null-guard/required-column tests (CCR-QD-157, CCR-QD-158)<br>1.77 (2026-10-04): ARCH-06 (ADR-QD-080, CCR-QD-160) — behaviour 28's file list gained `GateWriter.ts`; INV-QD-064 and ADR-QD-080 rows added; `GateRegistry.store.test.ts` and `GateWriter.test.tsx` rows added; `GateRegistry.test.tsx` row extended<br>1.76 (2026-10-04): ARCH-05 (ADR-QD-078, CCR-QD-156) — behaviour 19's row gained BEH-QD-268/265 and swapped `HydrationSeed.ts` for `HydrationEngine.ts`/`SeededDecision.ts`; INV-QD-059 added and INV-QD-022/028/045's Source and Enforcement updated; ADR-QD-078 added to §3; §4 gained `DecisionWire.test.ts`, `HydrationEngine.test.ts`, `HydrationPayload.test.ts`, `HydrationRender.test.tsx` and `Hydration.tst.ts`, and the edited `Hydration.test.ts`/`HydrationCounts.test.ts`/`AuthSubject.test.ts`/`SinkCodec.test.ts`; §5's `hydration-counts.feature` (`@REQ-QD-028`) swapped its `UnregisteredAtoms` scenario for a wrapper scenario and gained the two new reasons<br>1.75 (2026-10-04): ADR-QD-090, INV-QD-090, BEH-QD-300–304 — a tree is folded through one seam, and nesting depth is a property of the policy; INV-QD-037 corrected (CCR-QD-170)<br>1.74 (2026-10-04): ADR-QD-081, INV-QD-060, BEH-QD-270 — enforcement-error classes live in core and `@qadi/http` derives every status, wire schema and error list from `ENFORCEMENT_ERROR_WIRE`; §1 rows 07 and 26, §2 INV-QD-060, §3 ADR-QD-081, §4 `Errors.test.ts`, `Errors.tst.ts`, `QadiHttpError.tst.ts` and the extended `QadiHttpError.test.ts` row (CCR-QD-155)<br>1.73 (2026-10-04): ADR-QD-077, INV-QD-058, BEH-QD-264–267 — both interpreters read ports through `PortAccess.ts` and stop where `ShortCircuit.ts` says; §1 rows for behaviours 05, 16 and 30 gained the new Source files and ids, §2 gained INV-QD-058 and updated INV-QD-006/018/050/056/057, §3 gained ADR-QD-077 and ADR-QD-024 gained INV-QD-058, §4 gained `PortAccess.test.ts` and `ShortCircuit.test.ts`, §5 REQ-QD-016/027 rows updated (CCR-QD-153)<br>1.72 (2026-10-04): INV-QD-052 added to the `AuditDecisionSinkLive.test.ts` row — it now enforces the probe-release clause (CCR-QD-154)<br>1.71 (2026-09-14): ADR-QD-075 — `RequirePermission` sets `requiredForClient: true` with a `clientError` derived from its own `error:` schemas, and the new generic `passthroughClientLayer` (`HttpApiMiddlewareClient.ts`) discharges the resulting client requirement; BEH-QD-263 (behaviour 23); §1 row for behaviour 23 gained BEH-QD-263 and `HttpApiMiddlewareClient.ts`, §4 gained `RequirePermissionClient.test.ts` (CCR-QD-151)<br>1.70 (2026-09-13): ADR-QD-014's `@effect/atom-react` rejection reversed — the real package (not the similarly-named, v3-only `@effect-atom/atom-react` community package originally checked) tracks `effect` version-for-version and is built on the same `effect/reactivity` types this package already uses; it is now a dependency, `QadiProvider.tsx`'s `useAtomValue` re-exports its hook, and `settled.ts` (and its dedicated unit-test file) is retired, its one remaining test consumer (`Hydration.test.ts`) given a local one-shot replacement helper; §4's now-deleted `packages/react/test/settled.test.ts` row removed. A separately claimed idle-atom-GC gap (`AtomRegistry.make`'s `scheduleTask`/`defaultIdleTTL`) was tried and reverted after it broke `examples/nextjs-newsroom`'s `ssr.spec.ts` e2e suite — `scheduleTask` reroutes core dispatch, not just idle cleanup — and is not closed (CCR-QD-150)<br>1.69 (2026-09-11): ADR-QD-074 — the Node floor moves to `>=22.12.0`, forced by the `effect`/`vitest` bump, narrowing ADR-QD-059; §3 row added (CCR-QD-149)<br>1.68 (2026-09-09): BEH-QD-262 — `decideSubjects`/`filterSubjects` (`SubjectSet.ts`) now use `Effect.partition` and never fail; a subject's evaluation failure is reported in `failures` instead of discarding the whole batch's decisions; §1 row for behaviour 14 gained BEH-QD-262, §2's INV-QD-006 row gained BEH-QD-262 and `SubjectSet.test.ts`/`subject-sets.feature`, §4's `SubjectSet.test.ts` row gained BEH-QD-262, §5's REQ-QD-014 row gained BEH-QD-262 and INV-QD-006 (issue #107, CCR-QD-148)<br>1.67 (2026-09-09): BEH-QD-230's row note extended — `decodeEntryFields`/`decodePolicy` (`@qadi/react/Hydration.ts`) now decode with `UNTRUSTED_DECODE_OPTIONS`, refusing an excess property in an entry or its embedded `Policy` rather than silently stripping it, the same fix CCR-QD-139 made to `SinkCodec.ts`'s `decodeSinkRecordWireUnknown`; §4's `Hydration.test.ts` row gained BEH-QD-230, §5's `features/hydration-counts/hydration-counts.feature` gained one scenario (issue #105, CCR-QD-144)<br>1.66 (2026-09-09): ADR-QD-073 — `evaluateAllOf`/`evaluateAnyOf`/`evaluateRules` in `Evaluate.ts` converted from `Effect.fn` to `Effect.fnUntraced`, a measured, budgeted exception to AGENTS.md §5; §3 row added (issue #102, CCR-QD-145)<br>1.65 (2026-09-09): BEH-QD-261 — `Evaluate.ts`'s five port calls now convert a defect into that port's own typed error, so `Effect.retry` around `evaluate` sees a retryable failure at all nine `EvaluationError` tags; §1 row for behaviour 05 gained BEH-QD-261, §2's INV-QD-006 row gained BEH-QD-261 and `port-calls.feature`, §4's `Evaluate.test.ts` row gained BEH-QD-261, §5's REQ-QD-027 row gained BEH-QD-261 and INV-QD-006 (issue #100, CCR-QD-142)<br>1.64 (2026-09-08): ADR-QD-072 — `Schema.TaggedError` for `AccessDenied`/`UndischargedObligation`, narrowing ADR-QD-060; BEH-QD-260 (behaviour 23, the `HttpApiMiddleware` adapter's response body is no longer always empty); §1/§3/§4 rows updated (issue #98, CCR-QD-141)<br>1.63 (2026-09-08): ADR-QD-060 — `Schema.TaggedError` for the nine wire-crossing errors; §3 row added (CCR-QD-140)<br>1.62 (2026-09-08): Issue #78's untrusted-input sweep — BEH-QD-259 (behaviour 19, a fifth hydration drop reason, `EntryTooDeep`); BEH-QD-199's row note extended to the excess-property requirement added to it; §4 rows for `Hydration.test.ts`, `HydrationCounts.test.ts`, `SinkCodec.test.ts` and `http.test.ts` updated (CCR-QD-139)<br>1.61 (2026-09-08): §6 gained six coverage-target rows `vitest.config.ts` already enforces but this table never listed — `packages/devtools/src/model` (95%), `packages/http/src`, `packages/audit/src`, `packages/react/src`, `packages/promise/src`, `packages/testing/src` (90% each); §4 gained three test-file rows for files already on disk without one — `AuthSubject.test.ts` (the copy-on-build guarantee), `v4-http-smoke.test.ts` (the `effect/http`/`effect/http-api` canary, alongside `v4-api-smoke.test.ts` and `v4-reactivity-smoke.test.ts`), `DecisionLog.test.tsx` (BEH-QD-206's subject column, matching `Filters.ts`/`Replay.ts`'s model-level fix; its keyboard row selection has no behavior id of its own) (issue #72, CCR-QD-137)<br>1.60 (2026-09-08): both dialect packages' `Agreement.test.ts` rows gained BEH-QD-238 — each now carries a structural property that no non-finite operand is ever bound or emitted, which the row-by-row agreement property cannot state because a refused predicate has nothing to interpret (issue #65, CCR-QD-120)<br>1.59 (2026-09-07): C1 (issue 34) — `predicate-prisma`'s `Agreement.test.ts` row gained BEH-QD-239 (its new engine-accuracy property covers the same requirement `CompilePrismaWhere.test.ts` does), and a §4 row added for the new `MatchesPrismaWhereEngine.test.ts` (CCR-QD-111)<br>1.58 (2026-09-07): Audit sweep — the "Sections §1–§6 are parsed by `scripts/verify-traceability.sh`" claim corrected to the real path and narrowed to what it actually checks; §6's predicate-sql/predicate-prisma rows corrected from 95% to 90%, matching `vitest.config.ts` and AGENTS.md §10; two duplicate §4 rows (`TestLayers.test.ts`, `ServicesPanel.test.tsx`) merged; §1 behaviors 29/30 and §2 INV-QD-043 reordered numerically; REQ-QD-022's row notes that BEH-QD-131/BEH-QD-132 are asserted only in `Evaluate.test.ts`, not the BDD suite (tickets 169, 184, 192, 193, 194, 195, 197, 198, 199)<br>1.57 (2026-09-06): BEH-QD-258 — a column colliding with the compilation target's own syntax refuses; §1/§4 rows for behaviour 31 updated (CCR-QD-106)<br>1.56 (2026-09-06): six real behaviors mapped in neither §4 nor §5 now have their actual test rows — BEH-QD-072 (`QadiProvider.test.tsx`, the 1.29 entry that never landed a row edit), BEH-QD-134 (`Evaluate.test.ts`; no acceptance scenario exists for it, so §5 is left alone rather than fabricated), BEH-QD-189/190/195 (`DecisionCache.test.ts`/`DecisionSink.test.ts`), BEH-QD-198 (`QadiAtoms.test.ts`); seven test files present on disk since CCR-QD-082/CCR-QD-089-era additions gained §4 rows (`AttributeResolver`, `RelationshipResolver`, `DecisionHistory`, `SignatureHistory`, `Signature`, `GuardHealthCheck`, `react/settled`); the stale `#inv-qd-018-the-two-interpreters-agree` anchor at the ADR-QD-048 row repointed to the current heading (CCR-QD-099)<br>1.55 (2026-08-30): ADR-QD-059 — a gate runs where its toolchain runs; §3 row added (CCR-QD-092)<br>1.54 (2026-08-25): `hasSignature` — INV-QD-056, ADR-QD-057, ADR-QD-058; §2/§4 rows added (CCR-QD-089)<br>1.53 (2026-08-25): Behaviour 33, BEH-QD-249–257, INV-QD-051–055 — `@qadi/audit`'s ADR-QD-056 row corrected, §1/§2/§4 rows added (CCR-QD-086)<br>1.52 (2026-08-25): `@qadi/audit`, ADR-QD-056 — no `INV-QD-NNN` recorded yet (CCR-QD-085)<br>1.51 (2026-08-25): A named, registered custom predicate; behaviour 32, BEH-QD-245–248, INV-QD-049, INV-QD-050, ADR-QD-055, `@REQ-QD-031` (CCR-QD-082)<br>1.50 (2026-08-25): BEH-QD-244 — NULL-handling fix in both predicate compilers, found by manual verification against real PostgreSQL, MySQL, SQLite and Prisma (CCR-QD-081)<br>1.49 (2026-08-25): Mutation gates for `@qadi/predicate-sql`/`@qadi/predicate-prisma`; §4 rows for both packages' `Metrics.test.ts` (ADR-QD-054, CCR-QD-080)<br>1.48 (2026-08-25): A companion package may compile a dialect; behaviour 31, BEH-QD-236–243, INV-QD-047, INV-QD-048, ADR-QD-054, `@qadi/predicate-sql` and `@qadi/predicate-prisma` (CCR-QD-079)<br>1.47 (2026-08-25): A field spec may be a dot-path with a `*`/`**` wildcard terminal; BEH-QD-056, INV-QD-004 revised, `FieldPath.ts`/`FieldPath.test.ts` (CCR-QD-078)<br>1.46 (2026-08-25): Several sources are one source, so a server's decisions and a browser's re-checks reach one timeline; BEH-QD-235, `@REQ-QD-030`, and the `examples/nextjs-newsroom` proof of the SSR topology (CCR-QD-076)<br>1.45 (2026-08-24): A guard can say that it exists, and the lens points at one in both directions; BEH-QD-233, BEH-QD-234, INV-QD-046, ADR-QD-053, URS-QD-033, `@REQ-QD-029`; BEH-QD-217 revised and ADR-QD-014 amended (CCR-QD-073)<br>1.44 (2026-08-24): Hydration counted at both ends, and its three silent exits announced; BEH-QD-230–232, INV-QD-045, ADR-QD-052, `@REQ-QD-028` (CCR-QD-072)<br>1.43 (2026-08-24): What the ports were asked — a span on the third port, attributes on the other two, and a collecting tracer to read them back; behaviour 30, BEH-QD-227–229, INV-QD-044, ADR-QD-051, URS-QD-032, `@REQ-QD-027` (CCR-QD-071)<br>1.42 (2026-08-24): The subject simulator — a sealed engine, three answer sources, what-if in both directions, and replay against a logged row; behaviour 29, BEH-QD-219–226, INV-QD-042, INV-QD-043, ADR-QD-050, URS-QD-031, `@REQ-QD-026`, and `TestLayerOptions.clock` (CCR-QD-069, CCR-QD-070)<br>1.41 (2026-08-24): The four read-only screens — policy explorer, role viewer, services, and the React panel keyed by question; behaviour 28, BEH-QD-211–218, INV-QD-041, ADR-QD-048, ADR-QD-049, URS-QD-030, `@REQ-QD-025` (CCR-QD-068)<br>1.40 (2026-08-24): The surface — a headless devtools model and a React dock; behaviour 27, BEH-QD-203–210, INV-QD-039, INV-QD-040, ADR-QD-047, URS-QD-029, `@REQ-QD-024`, and the `@qadi/devtools` package (CCR-QD-067)<br>1.39 (2026-08-24): The transport — a buffering feed and a guarded SSE route; behaviour 26, BEH-QD-201, BEH-QD-202, ADR-QD-046 (CCR-QD-065)<br>1.38 (2026-08-24): The topology is a choice of sink; BEH-QD-187, BEH-QD-188, ADR-QD-045 (CCR-QD-064)<br>1.37 (2026-08-24): The record's wire form, so a sink can forward across a process boundary; BEH-QD-199, BEH-QD-200 (CCR-QD-063)<br>1.36 (2026-08-24): The remaining devtools gaps resolved in code; BEH-QD-195–198, behaviour 23 Rev 1.1 (`/__permissions` guarded by default), five package READMEs (CCR-QD-062)<br>1.35 (2026-08-24): Six questions the library could pose and not answer; behaviour 25, BEH-QD-189–194, INV-QD-037, INV-QD-038 (CCR-QD-061)<br>1.34 (2026-08-23): The decision sink — the first channel by which a decision can be observed at all; behaviour 24, BEH-QD-181–186, INV-QD-035, INV-QD-036, ADR-QD-044, and `qadi_evaluation_errors_total` (CCR-QD-060)<br>1.33 (2026-08-23): Behaviour 23 — HTTP Enforcement, the document `@qadi/http` shipped without; BEH-QD-174–180, INV-QD-034, and the package's first §1 and §4 rows (CCR-QD-059)<br>1.32 (2026-08-23): Two fail-opens found by auditing @qadi/http and fixed in core; INV-QD-032, INV-QD-033, ADR-QD-043, BEH-QD-055, BEH-QD-168 (CCR-QD-058)<br>1.31 (2026-08-23): A lossy projection is not an identity; INV-QD-030, INV-QD-031, ADR-QD-042, BEH-QD-167. `"use client"` and server rendering; BEH-QD-067. The 21 range corrected from 161–165, BEH-QD-166 having been added without it (CCR-QD-057)<br>1.30 (2026-08-23): An unwired port names its absence; INV-QD-029, ADR-QD-040, BEH-QD-045 (CCR-QD-055). A superseded seed is announced; ADR-QD-041, BEH-QD-152 (CCR-QD-056)<br>1.29 (2026-08-23): BEH-QD-072 — a guard hands its denial to the node that replaces it (CCR-QD-054)<br>1.28 (2026-08-23): `renderTrace` and the trace on `AccessDenied`; BEH-QD-144, BEH-QD-054 (ADR-QD-039, CCR-QD-053)<br>1.27 (2026-08-23): A seed never outlives the client's own answer; INV-QD-028, ADR-QD-039, BEH-QD-151 (CCR-QD-052)<br>1.26 (2026-08-22): ADR-QD-037, the circular-import/type-level-test gates; ADR-QD-038, changesets (CCR-QD-050)<br>1.25 (2026-08-22): ADR-QD-035, the witness/guard primitive; ADR-QD-036, the `@qadi/http` package shape (CCR-QD-044)<br>1.24 (2026-07-27): ADR-QD-034, the measured switch exception (CCR-QD-040)<br>1.23 (2026-07-26): The packed artifact; INV-QD-027, ADR-QD-033 (CCR-QD-038)<br>1.22 (2026-07-26): Four §1 ranges corrected — behaviour files 01, 03, 05 and 07 had gained identifiers the matrix never followed (CCR-QD-035)<br>1.21 (2026-07-26): `DecisionCache.ts` added to the services row (CCR-QD-034)<br>1.20 (2026-07-26): The Promise facade; behaviour 22, INV-QD-026, ADR-QD-032 (CCR-QD-033)<br>1.19 (2026-07-26): The decision cache; behaviour 21, INV-QD-025, ADR-QD-031 (CCR-QD-032)<br>1.18 (2026-07-26): Policy simplification; behaviour 20, INV-QD-024, ADR-QD-030 (CCR-QD-031)<br>1.17 (2026-07-26): `join` and `meet`; INV-QD-023, ADR-QD-029; MLS to Shipped (CCR-QD-030)<br>1.16 (2026-07-26): Decision hydration; behaviour 19, INV-QD-022, ADR-QD-028 (CCR-QD-029)<br>1.15 (2026-07-26): Policy explanation; behaviour 18, INV-QD-021, ADR-QD-027, `@REQ-QD-023` (CCR-QD-028)<br>1.14 (2026-07-26): Concurrent evaluation; behaviour 17, INV-QD-020, ADR-QD-026, `@REQ-QD-022` (CCR-QD-027)<br>1.13 (2026-07-26): ADR-QD-025, mutation testing as a merge gate (CCR-QD-026)<br>1.12 (2026-07-26): MLS verified; INV-QD-019 and BEH-QD-102, the order laws (CCR-QD-024)<br>1.11 (2026-07-26): Biba verified, both variants (CCR-QD-023)<br>1.10 (2026-07-26): Chinese Wall and task-based control verified (CCR-QD-022)<br>1.9 (2026-07-26): Separation of duty verified (CCR-QD-021)<br>1.8 (2026-07-26): Predicate output built (CCR-QD-020)<br>1.7 (2026-07-26): Rule tables built (CCR-QD-019)<br>1.6 (2026-07-26): Subject sets built (CCR-QD-018)<br>1.5 (2026-07-26): Label lattice built (CCR-QD-017)<br>1.4 (2026-07-26): Decision history built (CCR-QD-016)<br>1.3 (2026-07-26): Obligations built (CCR-QD-015)<br>1.2 (2026-07-26): Reactivity canary; BEH-QD-071 corrected (CCR-QD-013)<br>1.1 (2026-07-26): Action dimension built (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## Traceability chain

```
Behavior (BEH-QD-NNN)
    → Source module (packages/*/src/*.ts)
    → Test file (packages/*/test/*.test.ts)
    → Invariant (INV-QD-NNN)
    → Decision (ADR-QD-NNN)
    → Acceptance scenario (REQ-QD-NNN)
```

`spec/scripts/verify-traceability.sh` checks this document, but not by parsing
every section as a table: it confirms every `INV-QD-NNN` in `invariants.md`
appears somewhere in this file (§2's coverage), every `ADR-QD-NNN` decision
file appears here (§3's), every `URS`/`NFR` id in `urs.md` is referenced at
least twice, every `@REQ-QD-NNN` tag used in a `.feature` file is defined here
(§5's), that every test file path cited in §4 exists on disk, and that no
relative link anywhere in `spec/` is broken. It does **not** validate §1's
behavior ranges against the source files they name, that a §4 "Covers" cell is
accurate, or §6's coverage percentages against `vitest.config.ts`. Column order
is still a contract for readability, even where nothing enforces it.

## §1 Behavior to source

| Behavior file | Range | Source module |
| ------------- | ----- | ------------- |
| [01 — Permission Tokens](behaviors/01-permissions.md) | BEH-QD-001–006 | `packages/core/src/Permission.ts` |
| [02 — Roles and Inheritance](behaviors/02-roles.md) | BEH-QD-009–012 | `packages/core/src/Role.ts`, `AuthSubject.ts` |
| [03 — Policy ADT](behaviors/03-policy-adt.md) | BEH-QD-017–020 | `packages/core/src/Policy.ts` |
| [04 — Matcher DSL](behaviors/04-matchers.md) | BEH-QD-025–028, BEH-QD-304 | `packages/core/src/Matcher.ts` |
| [05 — Evaluator](behaviors/05-evaluator.md) | BEH-QD-033–040, BEH-QD-261 | `packages/core/src/Evaluate.ts`, `PortAccess.ts`, `Decision.ts` |
| [06 — Services and Layers](behaviors/06-services.md) | BEH-QD-041–045 | `packages/core/src/{CurrentSubject,AttributeResolver,RelationshipResolver,DecisionHistory,DecisionCache,EvaluationId}.ts` |
| [07 — Enforcement](behaviors/07-enforcement.md) | BEH-QD-049–056, BEH-QD-270 | `packages/core/src/Qadi.ts`, `Errors.ts`, `FieldPath.ts` |
| [08 — Serialization](behaviors/08-serialization.md) | BEH-QD-057–059 | `packages/core/src/Policy.ts` |
| [09 — React Integration](behaviors/09-react.md) | BEH-QD-065–072 | `packages/react/src/QadiAtoms.ts`, `QadiProvider.tsx`, `hooks.ts`, `components.tsx` |
| [10 — The Action Dimension](behaviors/10-actions.md) | BEH-QD-073–078 | `packages/core/src/Evaluate.ts`, `Policy.ts`, `Matcher.ts`, `Errors.ts` |
| [11 — Obligations](behaviors/11-obligations.md) | BEH-QD-081–087 | `packages/core/src/Obligation.ts`, `Decision.ts`, `Policy.ts`, `Evaluate.ts`, `Qadi.ts` |
| [12 — Decision History](behaviors/12-history.md) | BEH-QD-089–095 | `packages/core/src/DecisionHistory.ts`, `Policy.ts`, `Evaluate.ts`, `Errors.ts` |
| [13 — The Label Lattice](behaviors/13-labels.md) | BEH-QD-097–104 | `packages/core/src/SecurityLabel.ts`, `Matcher.ts` |
| [14 — Subject Sets](behaviors/14-subject-sets.md) | BEH-QD-105–109, BEH-QD-262 | `packages/core/src/SubjectSet.ts` |
| [15 — Rule Tables](behaviors/15-rules.md) | BEH-QD-111–117 | `packages/core/src/Policy.ts`, `Evaluate.ts` |
| [16 — Predicate Output](behaviors/16-predicates.md) | BEH-QD-121–128, BEH-QD-264–266 | `packages/core/src/Predicate.ts`, `PortAccess.ts`, `ShortCircuit.ts`, `Matcher.ts`, `Errors.ts` |
| [17 — Concurrent Evaluation](behaviors/17-concurrency.md) | BEH-QD-129–135 | `packages/core/src/Evaluate.ts` |
| [18 — Policy Explanation](behaviors/18-explanation.md) | BEH-QD-137–144, BEH-QD-303 | `packages/core/src/Explanation.ts`, `Decision.ts` |
| [19 — Decision Hydration](behaviors/19-hydration.md) | BEH-QD-145–152, BEH-QD-230–232, BEH-QD-259, BEH-QD-268–269 | `packages/react/src/Hydration.ts`, `HydrationEngine.ts`, `SeededDecision.ts`, `HydrationWarning.ts`, `HydrationCounts.ts`, `QadiAtoms.ts`, `packages/core/src/DecisionWire.ts`, `packages/core/src/HydrationMetrics.ts`, `packages/core/src/DecodeDepthGuard.ts`, `packages/devtools/src/model/Hydration.ts` |
| [20 — Policy Simplification](behaviors/20-simplification.md) | BEH-QD-153–156 | `packages/core/src/Simplify.ts` |
| [21 — Decision Cache](behaviors/21-decision-cache.md) | BEH-QD-161–168 | `packages/core/src/DecisionCache.ts`, `Evaluate.ts` |
| [22 — The Promise Facade](behaviors/22-promise-facade.md) | BEH-QD-169–173 | `packages/promise/src/index.ts` |
| [23 — HTTP Enforcement](behaviors/23-http.md) | BEH-QD-174–180, BEH-QD-260, BEH-QD-263 | `packages/http/src/{RequirePermission,GuardRoute,SubjectExtractor,PermissionRegistry,QadiHttpError,HttpApiMiddlewareClient,DecisionStreamRoute}.ts` |
| [24 — The Decision Sink](behaviors/24-decision-sink.md) | BEH-QD-181–188 | `packages/core/src/{DecisionRecord,DecisionSink,DecisionSinkRing,DecisionSinkForwarding,Evaluate}.ts` |
| [25 — Inspection](behaviors/25-inspection.md) | BEH-QD-189–200, BEH-QD-300–302 | `packages/core/src/{Policy,Role,TraceDiff,DecisionCache,PortMetrics,Qadi}.ts`, `packages/react/src/QadiAtoms.ts` |
| [26 — The Decision Stream](behaviors/26-decision-stream.md) (`reauthCheck` signature corrected, CCR-QD-155) | BEH-QD-201–202 | `packages/core/src/DecisionSinkFeed.ts`, `packages/http/src/DecisionStreamRoute.ts` |
| [27 — The Devtools Timeline](behaviors/27-devtools-timeline.md) | BEH-QD-203–210, BEH-QD-235 | `packages/devtools/src/model/{Source,Timeline,TimelineStore,Verdict,Pairing,Inspect,Filters,Selection}.ts`, `packages/devtools/src/react/*` |
| [28 — The Devtools Screens](behaviors/28-devtools-screens.md) | BEH-QD-211–218, BEH-QD-233, BEH-QD-234 | `packages/devtools/src/model/{Catalogue,RoleTree,Wiring}.ts`, `packages/devtools/src/react/{PolicyTree,PolicyExplorer,RoleViewer,ServicesPanel,QuestionsPanel}.tsx`, `packages/react/src/GateWriter.ts` |
| [29 — The Subject Simulator](behaviors/29-devtools-simulator.md) | BEH-QD-219–226 | `packages/devtools/src/model/{Simulation,SimulationInput,SimulationEdit,Sources,Capture,Edits,Remedies,WhatIf,Replay}.ts`, `packages/devtools/src/react/{Simulator,WhatIfTable,DecisionPanels}.tsx`, `packages/testing/src/QadiReviewLayer.ts` |
| [30 — Port Calls](behaviors/30-port-calls.md) | BEH-QD-227–229, BEH-QD-267 | `packages/core/src/PortAccess.ts`, `packages/devtools/src/model/PortCalls.ts`, `packages/devtools/src/react/ServicesPanel.tsx` |
| [31 — Predicate Compilation](behaviors/31-predicate-compilation.md) | BEH-QD-236–244, BEH-QD-258, BEH-QD-271–272 | `packages/core/src/RenderablePredicate.ts`, `packages/core/src/PredicateLiteral.ts`, `packages/predicate-sql/src/index.ts`, `packages/predicate-prisma/src/index.ts` |
| [32 — Custom Predicates](behaviors/32-custom-predicates.md) | BEH-QD-245–248 | `packages/core/src/{Policy,CustomPredicate,Evaluate,Explanation,Predicate}.ts` |
| [33 — Audit Pipeline](behaviors/33-audit-pipeline.md) | BEH-QD-249–257 | `packages/audit/src/*.ts` |

## §2 Invariant traceability

| Invariant | Description | Enforced by | Test |
| --------- | ----------- | ----------- | ---- |
| [INV-QD-001](invariants.md#inv-qd-001-permission-key-uniqueness) | Permission key uniqueness | Schema pattern `/^[^:]+$/` | `Tokens.test.ts`, `Policy.test.ts` |
| [INV-QD-002](invariants.md#inv-qd-002-role-graph-acyclicity) | Role graph acyclicity | By-value `inherits` | `Tokens.test.ts` |
| [INV-QD-003](invariants.md#inv-qd-003-codectype-identity) | Codec/type identity | Single schema definition | `Policy.test.ts` (property) |
| [INV-QD-004](invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top) | Field visibility lattice | `intersectFields`, `unionFields`, `FieldPath.ts`'s `compareFieldPaths`/`project` | `Matcher.test.ts`, `Evaluate.test.ts`, `FieldPath.test.ts` |
| [INV-QD-005](invariants.md#inv-qd-005-short-circuit-preservation) | Short-circuit preservation | Leaf-local resolution | `Evaluate.test.ts` (attribute and relationship call counts) |
| [INV-QD-006](invariants.md#inv-qd-006-failure-is-not-denial) | Failure is not denial | Effect error channel; `PortAccess.ts`'s port reads (both interpreters) `Effect.catchCause` a defect into that port's own typed error (BEH-QD-261, BEH-QD-264); `SubjectSet.ts`'s `decideSubjects`/`filterSubjects` report a subject's failure in `failures`, never as a `Deny` (BEH-QD-262) | `Evaluate.test.ts`, `Predicate.test.ts`, `PortAccess.test.ts`, `Policies.test.tsx`, `port-calls.feature`, `predicates.feature`, `SubjectSet.test.ts`, `subject-sets.feature` |
| [INV-QD-007](invariants.md#inv-qd-007-defaults-fail-closed) | Defaults fail closed | Default layer bodies | `Layers.test.ts` |
| [INV-QD-008](invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) | Reproducible given the same history | `Clock` + `EvaluationId`; the port is read-only | `Evaluate.test.ts` |
| [INV-QD-009](invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied) | Guarded effects do not run | `flatMap` after assert | `Qadi.test.ts` |
| [INV-QD-010](invariants.md#inv-qd-010-error-codes-are-injective) | Error codes are injective | `satisfies Record<Tag, …>` | `Tokens.test.ts` |
| [INV-QD-011](invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one) | Reading an absent action fails | `referencesAction` pre-check | `Evaluate.test.ts`, `Matcher.test.ts` |
| [INV-QD-012](invariants.md#inv-qd-012-obligations-are-never-narrowed) | Obligations are never narrowed | `unionObligations`, the only combinator | `Evaluate.test.ts` |
| [INV-QD-013](invariants.md#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation) | Enforcement refuses an undischarged obligation | One shared `permitted` path | `Qadi.test.ts` |
| [INV-QD-014](invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities) | An unwired history port denies both polarities | Three-valued port; `DecisionHistoryUnknown` | `Evaluate.test.ts`, `TestLayers.test.ts` |
| [INV-QD-015](invariants.md#inv-qd-015-incomparable-labels-deny-in-both-directions) | Incomparable labels deny both ways | `compareLabels` / `labelDominates` | `Matcher.test.ts`, `Evaluate.test.ts` |
| [INV-QD-016](invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone) | A batch decision equals the decision made alone | Per-element `provideService`; no batch state | `SubjectSet.test.ts` |
| [INV-QD-017](invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden) | A rule list stops at the first rule that cannot be overridden | Per-algorithm stopping condition in `evaluateRules` | `Rules.test.ts` (resolver call counts and trace child counts) |
| [INV-QD-018](invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows) | A predicate admits exactly the rows the evaluator allows | An executable predicate, compared against the evaluator | `Predicate.test.ts` (property over policies × rows, and three properties over faulty ports — INV-QD-058) |
| [INV-QD-060](invariants.md#inv-qd-060-an-enforcement-failure-is-reported-with-the-same-meaning-on-every-route) | An enforcement failure is reported with the same meaning on every route | `Errors.ts`'s `ENFORCEMENT_ERROR_CLASSES`; `QadiHttpError.ts`'s `ENFORCEMENT_ERROR_WIRE` and `HTTP_STATUS_BY_CLASS` | `Errors.test.ts`, `Errors.tst.ts`, `QadiHttpError.test.ts`, `QadiHttpError.tst.ts` |
| [INV-QD-058](invariants.md#inv-qd-058-translation-fails-only-as-evaluation-would) | Translation fails only as evaluation would | `PortAccess.ts` (one read per port, one defect rule), `ShortCircuit.ts` (one stop rule), `Predicate.ts`'s `compile`/`run` split | `Predicate.test.ts` (Properties A–C), `PortAccess.test.ts`, `ShortCircuit.test.ts` |
| [INV-QD-019](invariants.md#inv-qd-019-dominance-is-a-partial-order) | Dominance is a partial order | `>=` on level composed with containment on compartments | `Matcher.test.ts` (properties over sampled pairs and triples) |
| [INV-QD-020](invariants.md#inv-qd-020-concurrency-changes-lookups-never-decisions) | Concurrency changes lookups, never decisions | One fold per composite, driven by both paths in declaration order | `Evaluate.test.ts` (property over generated trees, sequential vs bounded vs unbounded) |
| [INV-QD-021](invariants.md#inv-qd-021-every-policy-explains) | Every policy explains | `Match.tagsExhaustive` over policies, matchers and refs; no error channel | `Explanation.test.ts` (property over generated trees, plus node counts) |
| [INV-QD-022](invariants.md#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it) | A hydrated decision belongs to the subject that hydrates it | Subject-id check that seeds nothing on mismatch; undecodable entries dropped; a disclosed trace must name the entry's own policy | `Hydration.test.ts` (cross-subject seeding asserted to deny), `HydrationPayload.test.ts` (a disclosed trace of another root dropped as malformed) |
| [INV-QD-023](invariants.md#inv-qd-023-every-pair-of-labels-has-a-least-upper-and-a-greatest-lower-bound) | Every pair of labels has a least upper and a greatest lower bound | `join` maxes the level and unions the compartments; `meet` mins and intersects | `Matcher.test.ts` (bound and absorption properties) |
| [INV-QD-024](invariants.md#inv-qd-024-simplification-changes-the-tree-and-nothing-a-caller-can-observe) | Simplification changes the tree and nothing observable | Two conditional rewrites; nothing in the library calls it | `Simplify.test.ts` (property over policies × four subjects) |
| [INV-QD-025](invariants.md#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity) | A cache hit differs only in speed and identity | The trace is cached; id and duration stamped per call; subject in the key | `DecisionCache.test.ts` (call counts, id inequality, two subjects through one cache) |
| [INV-QD-026](invariants.md#inv-qd-026-the-facade-answers-what-the-core-answers) | The facade answers what the core answers | Every method is `runPromise` over a core function; no branch decides | `facade.test.ts` (both paths compared, trace included; failure rejects) |
| [INV-QD-027](invariants.md#inv-qd-027-the-published-package-decides-what-the-sources-decide) | The published package decides what the sources decide | The build graph emits every public package; `pnpm pack` resolves the workspace protocols | `scripts/check-package-install.mjs` (merge gate 14; five deliberate breaks) |
| [INV-QD-028](invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer) | A seed never outlives the client's own answer | Seed held in its own atom (`HydrationEngine.ts`'s `makeSeededQuestion`); the atom a consumer reads consults it only while the computed result is `Initial` | `Hydration.test.ts` (a seeded allow for a failing policy asserted to read as a denial, immediately and after every scheduled turn) |
| [INV-QD-029](invariants.md#inv-qd-029-a-denial-names-only-what-was-consulted) | A denial names only what was consulted | `RelatedResult` is three-valued, so an unwired resolver answers `"Unknown"`; `attributeReason` distinguishes an unresolved attribute from one that compared wrong | `Evaluate.test.ts` (each sentence pinned against its neighbour), `relationships.feature` |
| [INV-QD-030](invariants.md#inv-qd-030-cache-key-uniqueness) | Cache key uniqueness | `DecisionCacheKey` is the `HashMap` key itself; Effect's structural `Equal`/`Hash` replace `JSON.stringify` | `DecisionCache.test.ts` (a `Date` beside its ISO string, an `undefined`-valued property beside an absent one — two evaluations each) |
| [INV-QD-031](invariants.md#inv-qd-031-a-rendered-explanation-denotes-exactly-one-policy) | A rendered explanation denotes exactly one policy | One `embed` helper parenthesises every non-atomic child of `renderExplanation` | `Explanation.test.ts` (the two groupings that collided, plus one case per embedding position), `explanation.feature` |
| [INV-QD-032](invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource) | A guarded resource is the evaluated resource | `guard` calls `enforce(policy, { ...options, resource })` | `Qadi.test.ts` (a resource that must be refused, one that must pass, an empty resource denying rather than erroring) |
| [INV-QD-033](invariants.md#inv-qd-033-a-cached-decision-belongs-to-the-grants-that-earned-it) | A cached decision belongs to the grants that earned it | `DecisionCacheKey` carries the whole `AuthSubject`, compared structurally | `DecisionCache.test.ts` (two tokens for one id, both orders; equal subjects still hit) |
| [INV-QD-034](invariants.md#inv-qd-034-an-endpoints-authorization-is-declared-not-inferred) | An endpoint's authorization is declared, not inferred | `RequirePermissionLive` refuses an endpoint carrying neither `RequiredPermission` nor `PublicEndpoint` | `http.test.ts` (neither → 500, declared public → 204) |
| [INV-QD-035](invariants.md#inv-qd-035-a-sink-cannot-change-a-decision) | A sink cannot change a decision | `record` returns `Effect<void>`; `evaluate` wraps the call in `Effect.catchCause` | `DecisionSink.test.ts` (failing sink, dying sink, dying sink on the failure path) |
| [INV-QD-036](invariants.md#inv-qd-036-a-decision-record-is-complete) | A decision record is complete | `DecisionRecord` carries `policy`, `resource`, `action` and `at` beside the outcome | `DecisionSink.test.ts` (policy round-trips into `explain`; `at` under `TestClock`) |
| [INV-QD-037](invariants.md#inv-qd-037-a-measured-depth-agrees-with-the-evaluated-bound) | A measured depth agrees with the evaluated bound | `policyDepth` (matcher nesting included) is checked against `maxDepth` before any node is visited, by `evaluate` and `toPredicate` | `RolesAndDepth.test.ts` (asserted against `evaluate`, both directions, over short-circuiting and matcher-bearing policies), `Evaluate.test.ts` (subject-independent `PolicyTooDeep`) |
| [INV-QD-090](invariants.md#inv-qd-090-a-pure-walk-over-a-caller-held-tree-never-exhausts-the-call-stack) | A pure walk over a caller-held tree never exhausts the call stack | `TreeFold.ts`'s `foldTree` behind `foldPolicy`/`foldExplanation`/`foldMatcher`; `Effect.suspend` on wrapper children; devtools' `TreeFold.ts` twin | `TreeFold.test.ts` (core and devtools), and a 100k-deep / 250k-wide test per walker |
| [INV-QD-038](invariants.md#inv-qd-038-provenance-and-flattening-agree) | Provenance and flattening agree | both walk depth-first with one visited set | `RolesAndDepth.test.ts` (sets compared directly; diamond yields one grant) |
| [INV-QD-039](invariants.md#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival) | The timeline is ordered, unique, and independent of arrival | total order over `at`; identity is `(_tag, environment, evaluationId, at)`; a duplicate returns the identical timeline | `Timeline.test.ts` (a closed product folded forward, reversed and twice), `TimelineStore.test.ts` (identity) |
| [INV-QD-040](invariants.md#inv-qd-040-the-inspector-never-claims-more-than-the-trace-does) | The inspector never claims more than the trace does | a part with no child trace at its index yields `NeverResolved`, recursively | `Inspect.test.ts` (every tree from a real `evaluate`), `DevtoolsDock.test.tsx` (the rendered wording) |
| [INV-QD-041](invariants.md#inv-qd-041-a-structural-view-states-no-verdict) | A structural view states no verdict | one `PolicyTree` serves both screens; `showStatus` is the only difference | `PolicyExplorer.test.tsx` (no status, no marks, no reasons), `DevtoolsDock.test.tsx` (both screens, one policy) |
| [INV-QD-042](invariants.md#inv-qd-042-a-simulation-reaches-no-port-it-was-not-given-and-records-nothing) | A simulation reaches no port it was not given, and records nothing | `simulationLayer` shadows `DecisionSink` and `DecisionCache` unconditionally; `CurrentSubject` is excluded from `LiveSource` by type | `Simulation.test.ts` (beside a real ring, and beside dying ports), `SimulationSource.test.ts` (all three modes), `WhatIf.test.ts` (a sweep of 20+ rows) |
| [INV-QD-043](invariants.md#inv-qd-043-a-snapshot-answers-what-the-live-layer-answered) | A snapshot answers what the live layer answered | answers rather than calls; failures replay as failures; keys written once and called from both sides | `Capture.test.ts` (`diffTraces` between the captured and replayed runs is empty), `devtools-simulator.feature` |
| [INV-QD-044](invariants.md#inv-qd-044-a-span-never-carries-a-resolved-attributes-value) | A span never carries a resolved attribute's value | `qadi.resolved` is a boolean; the other two ports answer with closed enums | `Evaluate.test.ts` (a sentinel value, searched for across every span the evaluation emitted), `PortCalls.test.ts` (no value on the decoded row) |
| [INV-QD-045](invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for) | No entry leaves hydration unaccounted for | Each function partitions its entries into counted-kept and counted-dropped, with a reason; `hydrateDecisions` never throws | `HydrationCounts.test.ts` (the partition asserted for both functions, and an empty payload landing in neither bin), `HydrationPayload.test.ts` (the accounting identity and no-throw over arbitrary JSON) |
| [INV-QD-046](invariants.md#inv-qd-046-instrumentation-never-changes-what-a-guard-renders) | Instrumentation never changes what a guard renders | `instrument` gates recording only; off renders no wrapper at all, on renders a `display: contents` span | `GateRegistry.test.tsx`, and the 127 pre-existing React tests passing untouched |
| [INV-QD-047](invariants.md#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits) | A compiled SQL fragment admits exactly the rows the predicate admits | the row set a real engine (PostgreSQL via PGlite, SQLite via `node:sqlite`) returns for the compiled fragment, compared against `evaluatePredicate`; MySQL structurally | `packages/predicate-sql/test/EngineAgreement.test.ts` (S1, S2, S4), golden fixtures per dialect |
| [INV-QD-048](invariants.md#inv-qd-048-a-compiled-prisma-whereinput-admits-exactly-the-rows-the-predicate-admits) | A compiled Prisma `WhereInput` admits exactly the rows the predicate admits | the row set Prisma Client 7.10 over SQLite returns for the compiled `WhereInput`, compared against `evaluatePredicate` | `packages/predicate-prisma/test/EngineAgreement.test.ts` (P1–P4) |
| [INV-QD-061](invariants.md#inv-qd-061-torenderable-preserves-evaluatepredicates-meaning-in-two-valued-logic) | `toRenderable` preserves `evaluatePredicate`'s meaning in two-valued logic | leaf classification reads what a leaf means on NULL from `evaluatePredicate` itself; `Gte`/`Lt` share `isRangeBound` | `packages/core/test/RenderablePredicate.test.ts` (R1–R3), `PredicateLiteral.test.ts` |
| [INV-QD-062](invariants.md#inv-qd-062-a-wrong-nullability-declaration-never-admits-a-row-the-predicate-denies) | A wrong nullability declaration never admits a row the predicate denies | polarity-aware `NULL_GUARD` table and the `NullOnNonNullableColumn` refusal | `packages/predicate-sql/test/EngineAgreement.test.ts` (S3), `packages/predicate-prisma/test/EngineAgreement.test.ts` (P2, P3), `RenderablePredicate.test.ts` (R7) |
| [INV-QD-049](invariants.md#inv-qd-049-an-unregistered-custom-predicate-name-is-an-error-never-a-denial) | An unregistered custom predicate name is an error, never a denial | `customPredicateFromRecord`'s table-miss fails rather than answers `false`; `evaluateNode` never converts `CustomPredicateError` to `Deny` | `CustomPredicate.test.ts`, `TestLayers.test.ts`, `custom-predicates.feature` |
| [INV-QD-050](invariants.md#inv-qd-050-a-hascustom-node-never-appears-in-a-compiled-predicate) | A `HasCustom` node never appears in a compiled `Predicate` | `compile`'s `HasCustom` arm refuses unconditionally | `Predicate.test.ts` |
| [INV-QD-051](invariants.md#inv-qd-051-staging-presence-or-absence-never-changes-the-committed-audit-entries) | Staging presence or absence never changes the committed audit entries | `AuditDecisionSinkLive`'s `stage`/`commit` are best-effort side effects that never gate `write` | `packages/audit/test/Agreement.test.ts` (property over generated `SinkRecord` sequences, staged vs. unstaged) |
| [INV-QD-052](invariants.md#inv-qd-052-once-a-circuit-breaker-trips-write-is-never-attempted-again-until-reset) | Once a circuit breaker trips, `write` is never attempted again until reset | every state transition is one atomic `Ref.modify` call, never a separate `Ref.get`/`Ref.set` pair | `packages/audit/test/CircuitBreaker.test.ts` (scripted threshold-boundary tests, concurrency stress tests, release-on-interrupt, model-based property), `packages/audit/test/AuditDecisionSinkLive.test.ts` (probe released when interrupted during staging) |
| [INV-QD-053](invariants.md#inv-qd-053-retained-and-purged-partition-entries) | Retained and purged partition entries | `getPurgeableEntries`/`enforceRetention` delegate to one internal single-pass partition | `packages/audit/test/Retention.test.ts` (property over generated timestamps/policies) |
| [INV-QD-054](invariants.md#inv-qd-054-verifysequenceintegrity-detects-every-gap-and-duplicate-sequence-number) | `verifySequenceIntegrity` detects every gap and duplicate sequence number | sorts defined sequence numbers, fails on the first that is not exactly one more than its predecessor | `packages/audit/test/SequenceIntegrity.test.ts` (property over generated contiguous/gapped sequences) |
| [INV-QD-055](invariants.md#inv-qd-055-signatureobligationhandler-calls-capture-exactly-once-and-the-obligationrecord-matches) | `signatureObligationHandler` calls `capture` exactly once, and the `ObligationRecord` matches | one `capture` call per discharge; `Qadi.ts`'s `discharge` maps the handler's outcome unconditionally | `packages/audit/test/SignatureCapturePort.test.ts` (unit + integration through `Qadi.assert`) |
| [INV-QD-056](invariants.md#inv-qd-056-a-hassignature-node-never-appears-in-a-compiled-predicate) | A `HasSignature` node never appears in a compiled `Predicate` | `compile`'s `HasSignature` arm refuses unconditionally | `Predicate.test.ts` |
| [INV-QD-059](invariants.md#inv-qd-059-a-seeded-decision-never-claims-a-trace-it-was-not-given) | A seeded decision never claims a trace it was not given | `SeededAllow`/`SeededDeny` have no `trace`/`reason`; withheld or shipped is a tagged `disclosure` | `Hydration.tst.ts` (`ClientDecision` closed, `isAllowed` rejects it), `HydrationPayload.test.ts` (differential: seed equals what the server decided, `Withheld` carries no trace) |
| [INV-QD-064](invariants.md#inv-qd-064-a-guard-is-listed-only-by-the-registry-its-provider-writes-to) | A guard is listed only by the registry its provider writes to | `makeGateRegistry`'s state is closure-local and ids are disambiguated; the write side is a per-registration handle | `GateRegistry.store.test.ts`, `GateRegistry.test.tsx`, `gate-instances.feature` |
| [INV-QD-057](invariants.md#inv-qd-057-hassignature-consults-no-clock) | `hasSignature` consults no clock | `PortAccess.ts`'s `askSignature` `matched` predicate tests only `s.meaning`/`s.signerRole`, never `s.signedAt` or `Clock` | `Evaluate.test.ts` ("HasSignature never compares signedAt to the clock", `TestClock` advanced ten years) |

## §3 Decision traceability

| Decision | Title | Affected invariants |
| -------- | ----- | ------------------- |
| [ADR-QD-001](decisions/001-effect-v4-as-effect-system.md) | Effect v4 as the effect system | — |
| [ADR-QD-002](decisions/002-schema-derived-policy-adt.md) | Schema-derived policy ADT | INV-QD-003 |
| [ADR-QD-003](decisions/003-tag-discriminant.md) | `_tag` discriminant | INV-QD-003 |
| [ADR-QD-004](decisions/004-single-effect-evaluator.md) | One Effect evaluator | INV-QD-005 |
| [ADR-QD-005](decisions/005-lazy-attribute-resolution.md) | Lazy attribute resolution | INV-QD-005 |
| [ADR-QD-006](decisions/006-field-strategy-always-encoded.md) | `fieldStrategy` always encoded | INV-QD-003, INV-QD-004 |
| [ADR-QD-007](decisions/007-permission-token-representation.md) | Permission representation | INV-QD-001 |
| [ADR-QD-008](decisions/008-error-taxonomy.md) | Error taxonomy | INV-QD-010 |
| [ADR-QD-009](decisions/009-observability-via-effect.md) | Observability via Effect | — |
| [ADR-QD-010](decisions/010-context-service-and-layers.md) | `Context.Service` + layer consts | INV-QD-007 |
| [ADR-QD-011](decisions/011-enforce-as-aspect.md) | `enforce` as an aspect | INV-QD-009 |
| [ADR-QD-012](decisions/012-deterministic-time-and-ids.md) | Deterministic time and ids | INV-QD-008 |
| [ADR-QD-013](decisions/013-short-circuit-default.md) | Short-circuit by default | INV-QD-005 |
| [ADR-QD-014](decisions/014-react-via-atoms.md) | React via Effect atoms | INV-QD-006 |
| [ADR-QD-015](decisions/015-role-dag-acyclic-by-construction.md) | Role DAG acyclic by construction | INV-QD-002 |
| [ADR-QD-016](decisions/016-gxp-out-of-scope.md) | GxP out of scope | — |
| [ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md) | A decision being re-checked is not a decision | INV-QD-007 |
| [ADR-QD-018](decisions/018-action-dimension.md) | The action is an evaluation input, not a permission segment | INV-QD-001, INV-QD-006, INV-QD-011 |
| [ADR-QD-019](decisions/019-obligations.md) | Obligations are a condition on permission | INV-QD-003, INV-QD-005, INV-QD-009, INV-QD-012, INV-QD-013 |
| [ADR-QD-020](decisions/020-decision-history-port.md) | History is a three-valued port | INV-QD-003, INV-QD-006, INV-QD-007, INV-QD-008, INV-QD-014 |
| [ADR-QD-021](decisions/021-label-lattice.md) | Dominance is four-valued; the label never enters the policy | INV-QD-003, INV-QD-007, INV-QD-015 |
| [ADR-QD-022](decisions/022-subject-set-evaluation.md) | A subject set is asked by nobody, and reports rather than enforces | INV-QD-006, INV-QD-008, INV-QD-016 |
| [ADR-QD-023](decisions/023-combining-algorithms.md) | A rule list stops at the first rule that cannot be overridden | INV-QD-003, INV-QD-004, INV-QD-005, INV-QD-006, INV-QD-017 |
| [ADR-QD-024](decisions/024-predicate-output.md) | A predicate is a second interpreter, shipped with its reference semantics | INV-QD-004, INV-QD-006, INV-QD-010, INV-QD-011, INV-QD-013, INV-QD-018, INV-QD-058 |
| [ADR-QD-025](decisions/025-mutation-testing.md) | Mutation testing as a merge gate | — (it verifies the others rather than adding one) |
| [ADR-QD-079](decisions/079-renderability-is-a-core-rule.md) | Renderability is a core rule: one `PredicateNotRenderable`, shared leaf rules, a declared nullability, amending ADR-QD-054 | [INV-QD-047](./invariants.md#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits), [INV-QD-048](./invariants.md#inv-qd-048-a-compiled-prisma-whereinput-admits-exactly-the-rows-the-predicate-admits) |
| [ADR-QD-026](decisions/026-concurrent-evaluation.md) | Concurrency changes lookups, never decisions | INV-QD-005 (scoped), INV-QD-006, INV-QD-017, INV-QD-020 |
| [ADR-QD-027](decisions/027-policy-explanation.md) | An explanation is a tree, and English is one rendering | INV-QD-021 |
| [ADR-QD-028](decisions/028-decision-hydration.md) | A hydrated decision is bound to a subject and carries no trace | INV-QD-007, INV-QD-022 |
| [ADR-QD-029](decisions/029-lattice-join-and-meet.md) | `join` and `meet` ship as utilities | INV-QD-019, INV-QD-023 |
| [ADR-QD-030](decisions/030-policy-simplification.md) | Simplification preserves the verdict, not the trace | INV-QD-004, INV-QD-012, INV-QD-024 |
| [ADR-QD-031](decisions/031-decision-cache.md) | A cache stores the trace, and the key is the security boundary | INV-QD-008, INV-QD-020, INV-QD-025 |
| [ADR-QD-032](decisions/032-promise-facade.md) | A Promise facade with no evaluator in it | INV-QD-006, INV-QD-026 |
| [ADR-QD-033](decisions/033-the-packed-artifact-is-the-product.md) | The packed artifact is the product, so a gate installs it | INV-QD-006, INV-QD-026, INV-QD-027 |
| [ADR-QD-034](decisions/034-the-switch-exception-is-measured.md) | The switch exception is measured, and two of the four were unguarded | INV-QD-004 |
| [ADR-QD-035](decisions/035-witness-guard-primitive.md) | A witness travels as a value, because Context cannot prove which permission it's for | INV-QD-009 |
| [ADR-QD-036](decisions/036-qadi-http-package-shape.md) | `@qadi/http`: two framework adapters, one enforcement path, one registry | — |
| [ADR-QD-037](decisions/037-circular-imports-and-type-level-tests-are-gates.md) | Two new merge gates: no circular imports, and type-level tests that outlive a comment | — (tooling gates, not an authorization invariant) |
| [ADR-QD-038](decisions/038-changesets-for-versioned-releases.md) | Changesets track versioned releases; publishing itself still doesn't run anywhere | — (release process, not an authorization invariant) |
| [ADR-QD-039](decisions/039-a-seed-is-not-an-authority.md) | A seed is not an authority, so it lives in its own atom | [INV-QD-028](invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer) |
| [ADR-QD-040](decisions/040-an-unwired-port-names-its-absence.md) | An unwired port names its own absence, because a denial that guesses sends the reader to the wrong system | [INV-QD-029](invariants.md#inv-qd-029-a-denial-names-only-what-was-consulted) |
| [ADR-QD-041](decisions/041-a-mismatch-is-announced.md) | A hydration mismatch is announced, not resolved | [INV-QD-028](invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer) |
| [ADR-QD-042](decisions/042-a-projection-is-not-an-identity.md) | A lossy projection is not an identity, in prose or in a cache key | [INV-QD-030](invariants.md#inv-qd-030-cache-key-uniqueness), [INV-QD-031](invariants.md#inv-qd-031-a-rendered-explanation-denotes-exactly-one-policy) |
| [ADR-QD-043](decisions/043-a-decision-is-computed-from-its-inputs.md) | A decision is computed from the inputs it claims, not from a proxy for them | [INV-QD-032](invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource), [INV-QD-033](invariants.md#inv-qd-033-a-cached-decision-belongs-to-the-grants-that-earned-it) |
| [ADR-QD-044](decisions/044-an-optional-decision-sink.md) | An optional decision sink: what ADR-QD-009 deleted, and what it did not | [INV-QD-035](invariants.md#inv-qd-035-a-sink-cannot-change-a-decision), [INV-QD-036](invariants.md#inv-qd-036-a-decision-record-is-complete) |
| [ADR-QD-045](decisions/045-the-topology-is-a-choice-of-sink.md) | The topology is a choice of sink, and core ships only the seam | [INV-QD-035](invariants.md#inv-qd-035-a-sink-cannot-change-a-decision) |
| [ADR-QD-046](decisions/046-a-decision-feed-is-sse-and-guarded.md) | A decision feed is Server-Sent Events, and it is guarded like any other route | [INV-QD-007](invariants.md#inv-qd-007-defaults-fail-closed), [INV-QD-035](invariants.md#inv-qd-035-a-sink-cannot-change-a-decision) |
| [ADR-QD-047](decisions/047-a-headless-devtools-model.md) | The devtools is a headless model with a React shell over it | [INV-QD-039](invariants.md#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival), [INV-QD-040](invariants.md#inv-qd-040-the-inspector-never-claims-more-than-the-trace-does) |
| [ADR-QD-048](decisions/048-an-observed-catalogue.md) | The catalogue is observed, not registered | [INV-QD-018](invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows), [INV-QD-039](invariants.md#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival) |
| [ADR-QD-049](decisions/049-the-second-shell-is-a-cli.md) | The second shell is a CLI, not a served page | [INV-QD-039](invariants.md#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival) |
| [ADR-QD-051](decisions/051-a-span-says-what-was-asked.md) | A span says what was asked, and a tracer is what reads it back | [INV-QD-044](invariants.md#inv-qd-044-a-span-never-carries-a-resolved-attributes-value), [INV-QD-005](invariants.md#inv-qd-005-short-circuit-preservation) |
| [ADR-QD-052](decisions/052-hydration-is-counted-where-both-ends-can-see-it.md) | Hydration is counted, and the counter is declared where both ends can see it | [INV-QD-045](invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for), [INV-QD-022](invariants.md#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it) |
| [ADR-QD-053](decisions/053-a-gate-can-be-found.md) | A guard can say that it exists, and be found on the page | [INV-QD-046](invariants.md#inv-qd-046-instrumentation-never-changes-what-a-guard-renders) |
| [ADR-QD-050](decisions/050-a-simulation-is-sealed.md) | A simulation is sealed, and it answers from one of three sources | [INV-QD-042](invariants.md#inv-qd-042-a-simulation-reaches-no-port-it-was-not-given-and-records-nothing), [INV-QD-043](invariants.md#inv-qd-043-a-snapshot-answers-what-the-live-layer-answered) |
| [ADR-QD-054](decisions/054-a-companion-package-may-compile-a-dialect.md) | A companion package may compile a dialect | [INV-QD-047](invariants.md#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits), [INV-QD-048](invariants.md#inv-qd-048-a-compiled-prisma-whereinput-admits-exactly-the-rows-the-predicate-admits) |
| [ADR-QD-055](decisions/055-a-named-registered-custom-predicate.md) | A named, registered custom predicate: the policy tree's one escape hatch | [INV-QD-049](invariants.md#inv-qd-049-an-unregistered-custom-predicate-name-is-an-error-never-a-denial), [INV-QD-050](invariants.md#inv-qd-050-a-hascustom-node-never-appears-in-a-compiled-predicate) |
| [ADR-QD-056](decisions/056-audit-companion-package.md) | `@qadi/audit`: a companion package narrows ADR-QD-016 | [INV-QD-051](invariants.md#inv-qd-051-staging-presence-or-absence-never-changes-the-committed-audit-entries), [INV-QD-052](invariants.md#inv-qd-052-once-a-circuit-breaker-trips-write-is-never-attempted-again-until-reset), [INV-QD-053](invariants.md#inv-qd-053-retained-and-purged-partition-entries), [INV-QD-054](invariants.md#inv-qd-054-verifysequenceintegrity-detects-every-gap-and-duplicate-sequence-number), [INV-QD-055](invariants.md#inv-qd-055-signatureobligationhandler-calls-capture-exactly-once-and-the-obligationrecord-matches) |
| [ADR-QD-057](decisions/057-audit-signature-harmonization.md) | `@qadi/audit` harmonizes with the canonical `Signature` | [INV-QD-055](invariants.md#inv-qd-055-signatureobligationhandler-calls-capture-exactly-once-and-the-obligationrecord-matches) (property unchanged, revised in place) |
| [ADR-QD-058](decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md) | `hasSignature`: a ninth service, and a decomposable leaf | [INV-QD-056](invariants.md#inv-qd-056-a-hassignature-node-never-appears-in-a-compiled-predicate) |
| [ADR-QD-059](decisions/059-a-gate-runs-where-its-toolchain-runs.md) | A gate runs where its toolchain runs, and says so where it does not | — (merge-gate scoping decision, not an authorization invariant) |
| [ADR-QD-060](decisions/060-schema-taggederror-for-the-nine-wire-crossing-errors.md) | `Schema.TaggedError` for the nine wire-crossing errors | — (wire-schema representation decision, not an authorization invariant) |
| [ADR-QD-072](decisions/072-schema-taggederror-for-accessdenied-and-undischargedobligation.md) | `Schema.TaggedError` for `AccessDenied` and `UndischargedObligation`, narrowing ADR-QD-060 | — (wire-schema representation decision, not an authorization invariant) |
| [ADR-QD-073](decisions/073-the-fnuntraced-exception-is-measured.md) | The `fnUntraced` exception is measured, and drawn at exactly three functions | — (performance/tracing-cost decision, not an authorization invariant) |
| [ADR-QD-074](decisions/074-node-floor-raised-to-22-12-for-effect-vitest.md) | The Node floor moves to `>=22.12.0`, forced by the `effect`/`vitest` bump, narrowing ADR-QD-059 | — (dependency/toolchain-floor decision, not an authorization invariant) |
| [ADR-QD-078](decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md) | A seed is its own type, the atom set owns hydration, and the payload is versioned, amending ADR-QD-028/039/041/052 | [INV-QD-059](invariants.md#inv-qd-059-a-seeded-decision-never-claims-a-trace-it-was-not-given), [INV-QD-022](invariants.md#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it), [INV-QD-028](invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer), [INV-QD-045](invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for) |
| [ADR-QD-080](decisions/080-a-gate-registry-belongs-to-its-atom-set.md) | A gate registry belongs to its atom set, amending ADR-QD-053 | [INV-QD-064](invariants.md#inv-qd-064-a-guard-is-listed-only-by-the-registry-its-provider-writes-to), [INV-QD-046](invariants.md#inv-qd-046-instrumentation-never-changes-what-a-guard-renders) |
| [ADR-QD-076](decisions/076-mutation-runs-skip-static-mutants.md) | Mutation runs skip static mutants (`ignoreStatic`), narrowing ADR-QD-025 | — (it verifies the others rather than adding one) |
| [ADR-QD-081](decisions/081-enforcement-error-classes-live-in-core.md) | Enforcement-error classes live in core; the HTTP description is one derived table, amending ADR-QD-072 and ADR-QD-075 | [INV-QD-060](invariants.md#inv-qd-060-an-enforcement-failure-is-reported-with-the-same-meaning-on-every-route), INV-QD-006 |
| [ADR-QD-077](decisions/077-both-interpreters-read-ports-through-one-module.md) | Both interpreters read ports through one module, and stop where the evaluator stops | [INV-QD-058](invariants.md#inv-qd-058-translation-fails-only-as-evaluation-would), INV-QD-006, INV-QD-018 |
| [ADR-QD-090](decisions/090-a-tree-is-folded-through-one-seam.md) | A tree is folded through one seam, and nesting depth is a property of the policy | [INV-QD-090](invariants.md#inv-qd-090-a-pure-walk-over-a-caller-held-tree-never-exhausts-the-call-stack), [INV-QD-037](invariants.md#inv-qd-037-a-measured-depth-agrees-with-the-evaluated-bound), INV-QD-018 |

## §4 Test file map

| Test file | Covers |
| --------- | ------ |
| `packages/core/test/v4-api-smoke.test.ts` | Effect v4 API canary |
| `packages/core/test/AuthSubject.test.ts` | `makeSubject`/`fromRoles`/`withAttributes`'s copy-on-build guarantee; `subjectEquivalence` (BEH-QD-067) |
| `packages/http/test/v4-http-smoke.test.ts` | `effect/http`/`effect/http-api` API canary |
| `packages/core/test/PortConformance.test.ts` | One suite over every port in the registry (INV-QD-901, BEH-QD-901): each port's named default, its retrying, bounded and timing-out wrappers (attempt annotation, retry and timeout metrics, permit validation, deadline message, composed names), its scripted and recording doubles and its defect constructor agree with its description; a port without a case is a compile error. Replaced the per-port wrapper tests in `AttributeResolver.test.ts` (deleted), `RelationshipResolver.test.ts`, `CustomPredicate.test.ts` and `Ports.test.ts` |
| `packages/core/test/PortDescription.test.ts` | The generic derivations (`PortDerivation.ts`) and doubles (`PortDoubles.ts`) against a test-local port: naming, retry accounting, permits, deadlines, scripted replies (BEH-QD-903), reply tables, recording |
| `packages/core/test/PortsLayer.test.ts` | The registry's environment functions: `portsLayer` defaults and per-slot overrides (BEH-QD-902), `forEveryPort` order, `mapPorts`/`mergePorts` round trip, `decoratePorts` building once |
| `packages/core/test/Ports.tst.ts` | Type level: the registry is keyed by exactly `PortName`; `PortServices` is the five services; `EvaluationServices` is `CurrentSubject \| EvaluationId \| PortServices`; an override must provide its own slot's service |
| `packages/core/test/RelationshipResolver.test.ts` | `RelationshipResolver`'s own depth, matching `DecisionCache.test.ts` — `Layers.test.ts` covers each default layer's happy path in one line |
| `packages/core/test/DecisionHistory.test.ts` | `DecisionHistory`'s own depth, matching `RelationshipResolver.test.ts` — `Evaluate.test.ts` covers `decisionHistoryFromEvents` through full policy evaluation |
| `packages/core/test/SignatureHistory.test.ts` | `SignatureHistory`'s own depth, matching `DecisionHistory.test.ts` — `Evaluate.test.ts` covers `hasSignature` through full policy evaluation |
| `packages/core/test/Signature.test.ts` | `Signature` in isolation |
| `packages/core/test/GuardHealthCheck.test.ts` | `createGuardHealthCheck` in isolation |
| `packages/react/test/v4-reactivity-smoke.test.ts` | `effect/reactivity` API canary, ADR-QD-014 |
| `packages/core/test/Tokens.test.ts` | BEH-QD-001–012, INV-QD-001, INV-QD-002, INV-QD-010 |
| `packages/core/test/Policy.test.ts` | BEH-QD-017–019, BEH-QD-057–059, BEH-QD-074, BEH-QD-081, BEH-QD-091–092, BEH-QD-245, BEH-QD-300–302, INV-QD-003, INV-QD-090 |
| `packages/core/test/Matcher.test.ts` | BEH-QD-025–028, BEH-QD-075, BEH-QD-097–104, BEH-QD-304, INV-QD-004, INV-QD-011, INV-QD-015, INV-QD-019, INV-QD-023, INV-QD-090 |
| `packages/core/test/FieldPath.test.ts` | BEH-QD-051, BEH-QD-056, INV-QD-004 |
| `packages/core/test/Evaluate.test.ts` | BEH-QD-033–040, BEH-QD-073–078, BEH-QD-081–086, BEH-QD-089–095, BEH-QD-098–101, BEH-QD-134, BEH-QD-261, INV-QD-005, INV-QD-006, INV-QD-008, INV-QD-011, INV-QD-012, INV-QD-014, INV-QD-015, INV-QD-029, INV-QD-037, INV-QD-090, ADR-QD-009 |
| `packages/core/test/SubjectSet.test.ts` | BEH-QD-105–109, BEH-QD-262, INV-QD-006, INV-QD-016 |
| `packages/core/test/Rules.test.ts` | BEH-QD-111–117, INV-QD-004, INV-QD-006, INV-QD-017 |
| `packages/core/test/PredicateLiteral.test.ts` | BEH-QD-238, BEH-QD-258, BEH-QD-271, INV-QD-061 |
| `packages/core/test/RenderablePredicate.test.ts` | BEH-QD-238, BEH-QD-239, BEH-QD-240, BEH-QD-244, BEH-QD-258, BEH-QD-271, BEH-QD-272, INV-QD-061, INV-QD-062 |
| `packages/core/test/Predicate.test.ts` | BEH-QD-121–128, BEH-QD-248, BEH-QD-264–267, INV-QD-006, INV-QD-011, INV-QD-018, INV-QD-037, INV-QD-050, INV-QD-056, INV-QD-058, INV-QD-090 |
| `packages/core/test/PortAccess.test.ts` | BEH-QD-261, BEH-QD-264, INV-QD-006 |
| `packages/core/test/ShortCircuit.test.ts` | BEH-QD-265, INV-QD-005, INV-QD-017, INV-QD-058 |
| `packages/core/test/Explanation.test.ts` | BEH-QD-137–143, BEH-QD-245, BEH-QD-303, INV-QD-021, INV-QD-031, INV-QD-090 |
| `packages/core/test/RenderTrace.test.ts` | BEH-QD-144, INV-QD-004, INV-QD-020 |
| `packages/react/test/Hydration.test.ts` | BEH-QD-145–152, BEH-QD-230, BEH-QD-259, INV-QD-022, INV-QD-028, INV-QD-045, ADR-QD-041 |
| `packages/react/test/HydrationCounts.test.ts` | BEH-QD-230, BEH-QD-231, BEH-QD-259, INV-QD-045, ADR-QD-052 |
| `packages/react/test/HydrationEngine.test.ts` | BEH-QD-151, BEH-QD-152 — `track` runs before any read, per-registry announce state, the seed window (INV-QD-028) |
| `packages/react/test/HydrationPayload.test.ts` | BEH-QD-147, BEH-QD-148, BEH-QD-230, BEH-QD-268, BEH-QD-269, INV-QD-022, INV-QD-045, INV-QD-059 — never throws over arbitrary JSON, the versioned payload, and the differential seed test |
| `packages/react/test/HydrationRender.test.tsx` | BEH-QD-147, BEH-QD-068 — a seeded denial through a function fallback never renders the old `"hydrated"` |
| `packages/react/test/Hydration.tst.ts` | BEH-QD-066, BEH-QD-148, INV-QD-059 (`tstyche`: `ClientDecision` is the closed four-case union and `isAllowed` rejects it) |
| `packages/core/test/DecisionWire.test.ts` | BEH-QD-199, ADR-QD-078 — the decision's wire form, both verdicts, `visibleFields` absent versus empty (INV-QD-004) |
| `packages/core/test/HydrationMetrics.test.ts` | BEH-QD-231, ADR-QD-052 (the `type:id:description` registry key) |
| `packages/react/test/ServerRender.test.tsx` | BEH-QD-067, BEH-QD-145, BEH-QD-151 (server rendering) |
| `packages/core/test/Simplify.test.ts` | BEH-QD-153–156, BEH-QD-300, INV-QD-024, INV-QD-090 |
| `packages/core/test/DecisionCache.test.ts` | BEH-QD-161–168, BEH-QD-189, INV-QD-025, INV-QD-030, INV-QD-033 |
| `packages/promise/test/facade.test.ts` | BEH-QD-169–173, INV-QD-006, INV-QD-026 |
| `packages/http/test/http.test.ts` | BEH-QD-174–180, BEH-QD-260, INV-QD-006, INV-QD-034, INV-QD-007 |
| `packages/http/test/RequirePermissionClient.test.ts` | BEH-QD-263 — the runtime half, proved through a real generated `HttpApiTest` client; `packages/http/test/RequirePermission.tst.ts` (`tstyche`) covers the static half |
| `packages/core/test/DecisionSink.test.ts` | BEH-QD-181–186, BEH-QD-190, BEH-QD-195, INV-QD-006, INV-QD-035, INV-QD-036 |
| `packages/core/test/TraceDiff.test.ts` | BEH-QD-194, INV-QD-004, INV-QD-020 |
| `packages/core/test/RolesAndDepth.test.ts` | BEH-QD-191–193, BEH-QD-300, INV-QD-037, INV-QD-038, INV-QD-090 |
| `packages/core/test/TreeFold.test.ts` | BEH-QD-300, BEH-QD-303, BEH-QD-304, INV-QD-090 |
| `packages/core/test/Ports.test.ts` | BEH-QD-196, BEH-QD-197, BEH-QD-267, INV-QD-005 |
| `packages/core/test/SinkCodec.test.ts` | BEH-QD-199, BEH-QD-200 — including the golden tests pinning the `Decided` record's bytes at 1caf04c |
| `packages/core/test/DecisionSinkForwarding.test.ts` | BEH-QD-187, BEH-QD-188, INV-QD-035 |
| `packages/core/test/DecisionSinkFeed.test.ts` | BEH-QD-201, INV-QD-035 |
| `packages/http/test/decisionStream.test.ts` | BEH-QD-202, INV-QD-007 |
| `packages/devtools/test/model/Source.test.ts` | BEH-QD-203, BEH-QD-204, BEH-QD-235 |
| `packages/devtools/test/model/Timeline.test.ts` | BEH-QD-205, INV-QD-039 |
| `packages/devtools/test/model/TimelineStore.test.ts` | BEH-QD-205, BEH-QD-210, INV-QD-039 |
| `packages/devtools/test/model/Pairing.test.ts` | BEH-QD-206, BEH-QD-207, INV-QD-006 |
| `packages/devtools/test/model/Inspect.test.ts` | BEH-QD-208, INV-QD-004, INV-QD-005, INV-QD-040, INV-QD-090 |
| `packages/devtools/test/model/TreeFold.test.ts` | BEH-QD-208, BEH-QD-222, INV-QD-090 |
| `packages/devtools/test/model/Filters.test.ts` | BEH-QD-206, BEH-QD-209 |
| `packages/devtools/test/react/useTimeline.test.tsx` | BEH-QD-210 |
| `packages/devtools/test/react/DecisionLog.test.tsx` | BEH-QD-206 (the subject column, matching `Filters.ts`/`Replay.ts`'s fix); row keyboard selection has no behavior id of its own (WCAG 2.1.1) |
| `packages/devtools/test/react/DevtoolsDock.test.tsx` | BEH-QD-206, BEH-QD-208–210, BEH-QD-218, INV-QD-040, INV-QD-041 |
| `packages/devtools/test/model/Catalogue.test.ts` | BEH-QD-211 |
| `packages/devtools/test/model/RoleTree.test.ts` | BEH-QD-214, INV-QD-038 |
| `packages/devtools/test/model/Wiring.test.ts` | BEH-QD-215, BEH-QD-216, INV-QD-007 |
| `packages/devtools/test/react/PolicyExplorer.test.tsx` | BEH-QD-212, BEH-QD-213, INV-QD-037, INV-QD-041 |
| `packages/devtools/test/react/RoleViewer.test.tsx` | BEH-QD-214 |
| `packages/devtools/test/react/QuestionsPanel.test.tsx` | BEH-QD-217 |
| `packages/devtools/test/model/Simulation.test.ts` | BEH-QD-219, BEH-QD-226, INV-QD-042 |
| `packages/devtools/test/model/SimulationSource.test.ts` | BEH-QD-220, INV-QD-042 |
| `packages/devtools/test/model/Capture.test.ts` | BEH-QD-221, BEH-QD-246, BEH-QD-247, INV-QD-043, INV-QD-049 |
| `packages/devtools/test/model/Edits.test.ts` | BEH-QD-222 |
| `packages/devtools/test/model/Remedies.test.ts` | BEH-QD-222, BEH-QD-223, INV-QD-090 |
| `packages/devtools/test/model/WhatIf.test.ts` | BEH-QD-222, BEH-QD-224, INV-QD-042, INV-QD-090 |
| `packages/devtools/test/model/Replay.test.ts` | BEH-QD-225, INV-QD-006 |
| `packages/devtools/test/react/Simulator.test.tsx` | BEH-QD-219, BEH-QD-225, BEH-QD-226, INV-QD-004 |
| `packages/devtools/test/react/WhatIfTable.test.tsx` | BEH-QD-222, BEH-QD-224 |
| `packages/devtools/test/model/PortCalls.test.ts` | BEH-QD-228, INV-QD-044 |
| `packages/devtools/test/model/Hydration.test.ts` | BEH-QD-231, BEH-QD-232, ADR-QD-052 |
| `packages/react/test/GateRegistry.test.tsx` | BEH-QD-233, INV-QD-046, INV-QD-064, ADR-QD-053, ADR-QD-080 |
| `packages/react/test/GateRegistry.store.test.ts` | BEH-QD-233, INV-QD-064, ADR-QD-080 — the store contract, headless, with a reference-model property test |
| `packages/react/test/GateWriter.test.tsx` | BEH-QD-233, INV-QD-064, ADR-QD-080 — `useGateRegistration` driven by `renderHook`, no provider |
| `packages/devtools/test/model/Gates.test.ts` | BEH-QD-217 (the keying that survives), BEH-QD-233 |
| `packages/devtools/test/react/Lens.test.ts` | BEH-QD-234, ADR-QD-053 |
| `packages/devtools/test/react/QuestionsPanel.gates.test.tsx` | BEH-QD-233, BEH-QD-234 |
| `packages/devtools/test/react/ServicesPanel.test.tsx` | BEH-QD-215, BEH-QD-216, BEH-QD-229 |
| `packages/devtools/test/manifest.test.ts` | BEH-QD-210 |
| `packages/http/test/QadiHttpError.test.ts` | BEH-QD-177, BEH-QD-260, INV-QD-006, INV-QD-060 |
| `packages/http/test/QadiHttpError.tst.ts` | BEH-QD-177, BEH-QD-263, INV-QD-060 |
| `packages/core/test/Errors.test.ts` | BEH-QD-270, INV-QD-006, INV-QD-060 |
| `packages/core/test/Errors.tst.ts` | BEH-QD-270, INV-QD-060 |
| `packages/core/test/Layers.test.ts` | BEH-QD-041–045, INV-QD-007 |
| `packages/core/test/CustomPredicate.test.ts` | BEH-QD-246, BEH-QD-247, INV-QD-007, INV-QD-049 |
| `packages/core/test/Qadi.test.ts` | BEH-QD-049–055, BEH-QD-085, INV-QD-009, INV-QD-013, INV-QD-032 |
| `packages/testing/test/TestLayers.test.ts` | Test fixtures and layers, BEH-QD-226, BEH-QD-246, BEH-QD-247, INV-QD-014, INV-QD-049 |
| `packages/react/test/QadiAtoms.test.ts` | BEH-QD-065, BEH-QD-069, BEH-QD-070, BEH-QD-071, BEH-QD-198 |
| `packages/react/test/QadiProvider.test.tsx` | BEH-QD-067, BEH-QD-068, BEH-QD-070, BEH-QD-072 |
| `packages/react/test/hooks.test.tsx` | BEH-QD-066, BEH-QD-068, BEH-QD-069, INV-QD-006, ADR-QD-017 |
| `packages/react/test/edges.test.tsx` | BEH-QD-067, BEH-QD-068 |
| `packages/predicate-sql/test/EngineAgreement.test.ts` | BEH-QD-238, BEH-QD-241, BEH-QD-244, BEH-QD-272, INV-QD-047, INV-QD-062 |
| `packages/predicate-sql/test/CompileSql.test.ts` | BEH-QD-236–240, BEH-QD-244, BEH-QD-258, BEH-QD-272 |
| `packages/predicate-sql/test/Metrics.test.ts` | BEH-QD-236 |
| `packages/predicate-prisma/test/EngineAgreement.test.ts` | BEH-QD-239, BEH-QD-242, BEH-QD-244, BEH-QD-272, INV-QD-048, INV-QD-062 |
| `packages/predicate-prisma/test/CompilePrismaWhere.test.ts` | BEH-QD-236, BEH-QD-238, BEH-QD-239, BEH-QD-240, BEH-QD-244, BEH-QD-258, BEH-QD-272 |
| `packages/predicate-prisma/test/Metrics.test.ts` | BEH-QD-236 |
| `packages/audit/test/AuditEntry.test.ts` | BEH-QD-250 |
| `packages/audit/test/AuditDecisionSinkLive.test.ts` | BEH-QD-249, BEH-QD-251, BEH-QD-252, INV-QD-052 |
| `packages/audit/test/Agreement.test.ts` | BEH-QD-252, INV-QD-051 |
| `packages/audit/test/CircuitBreaker.test.ts` | BEH-QD-251, INV-QD-052 |
| `packages/audit/test/Retention.test.ts` | BEH-QD-253, INV-QD-053 |
| `packages/audit/test/SequenceIntegrity.test.ts` | BEH-QD-254, INV-QD-054 |
| `packages/audit/test/AuditArchive.test.ts` | BEH-QD-254 |
| `packages/audit/test/DecommissioningChecklist.test.ts` | BEH-QD-254 |
| `packages/audit/test/SignatureCapturePort.test.ts` | BEH-QD-255, BEH-QD-256, INV-QD-055 |
| `packages/audit/test/AuditTrailPortTest.test.ts`, `packages/audit/test/AuditStagingPortTest.test.ts` | Test infrastructure, `AuditTrailPortTest`/`AuditStagingPortTest` |
| `packages/audit/test/Metrics.test.ts` | BEH-QD-249, BEH-QD-251, BEH-QD-252 |

## §5 Acceptance scenario traceability

| Tag | Feature file | Behavior |
| --- | ------------ | -------- |
| REQ-QD-001 | `features/features/permissions/permissions.feature` | BEH-QD-001–003 |
| REQ-QD-002 | `features/features/permissions/composition.feature` | BEH-QD-019 |
| REQ-QD-003 | `features/features/roles/roles.feature` | BEH-QD-011 |
| REQ-QD-004 | `features/features/attributes/attributes.feature` | BEH-QD-034 |
| REQ-QD-005 | `features/features/rebac/relationships.feature` | BEH-QD-036 |
| REQ-QD-006 | `features/features/attributes/resource-attributes.feature` | BEH-QD-036 |
| REQ-QD-007 | `features/features/field-visibility/field-visibility.feature` | BEH-QD-018 |
| REQ-QD-008 | `features/features/serialization/round-trip.feature` | BEH-QD-058, INV-QD-003 |
| REQ-QD-009 | `features/features/attributes/ownership.feature` | BEH-QD-026, BEH-QD-036 |
| REQ-QD-010 | `features/features/actions/actions.feature` | BEH-QD-073–076, INV-QD-011 |
| REQ-QD-011 | `features/features/obligations/obligations.feature` | BEH-QD-081–085, INV-QD-012, INV-QD-013 |
| REQ-QD-012 | `features/features/history/history.feature` | BEH-QD-090–093, INV-QD-014 |
| REQ-QD-013 | `features/features/labels/labels.feature` | BEH-QD-098–099, INV-QD-015 |
| REQ-QD-014 | `features/features/subject-sets/subject-sets.feature` | BEH-QD-105–108, BEH-QD-262, INV-QD-016, INV-QD-006 |
| REQ-QD-015 | `features/features/rules/rules.feature` | BEH-QD-111–116, INV-QD-017 |
| REQ-QD-016 | `features/features/predicates/predicates.feature` | BEH-QD-121–127, BEH-QD-264–266, INV-QD-018, INV-QD-058 |
| REQ-QD-017 | `features/features/separation-of-duty/separation-of-duty.feature` | BEH-QD-019, BEH-QD-026, BEH-QD-039 |
| REQ-QD-018 | `features/features/chinese-wall/chinese-wall.feature` | BEH-QD-019, BEH-QD-039, BEH-QD-092, BEH-QD-094, INV-QD-014 |
| REQ-QD-019 | `features/features/tbac/tbac.feature` | BEH-QD-019, BEH-QD-026, BEH-QD-036, BEH-QD-092 |
| REQ-QD-020 | `features/features/biba/biba.feature` | BEH-QD-034, BEH-QD-073, BEH-QD-098–099, INV-QD-015 |
| REQ-QD-021 | `features/features/mls/mls.feature` | BEH-QD-098–099, BEH-QD-102–103, INV-QD-015, INV-QD-019, INV-QD-023 |
| REQ-QD-022 | `features/features/concurrency/concurrency.feature` | BEH-QD-129–133, INV-QD-005, INV-QD-020 (BEH-QD-131's structural-fold requirement and BEH-QD-132's lookup-count requirement are asserted only in `Evaluate.test.ts`'s property tests — no scenario here counts resolver calls or checks fold structure directly; the same gap this table already notes for BEH-QD-134 in its 1.56 changelog entry) |
| REQ-QD-023 | `features/features/explanation/explanation.feature` | BEH-QD-137–141, INV-QD-021 |
| REQ-QD-024 | `features/features/devtools/devtools.feature` | BEH-QD-205–208, INV-QD-006, INV-QD-039, INV-QD-040 |
| REQ-QD-025 | `features/features/devtools-screens/devtools-screens.feature` | BEH-QD-211–217, INV-QD-038, INV-QD-041 |
| REQ-QD-026 | `features/features/devtools-simulator/devtools-simulator.feature` | BEH-QD-219–226, INV-QD-006, INV-QD-042, INV-QD-043 |
| REQ-QD-027 | `features/features/port-calls/port-calls.feature` | BEH-QD-227–229, BEH-QD-267, BEH-QD-261, INV-QD-005, INV-QD-006, INV-QD-044 |
| REQ-QD-028 | `features/features/hydration-counts/hydration-counts.feature` | BEH-QD-230–232, BEH-QD-268, BEH-QD-269, INV-QD-045 |
| REQ-QD-029 | `features/features/gate-instances/gate-instances.feature` | BEH-QD-217, BEH-QD-233, INV-QD-046, INV-QD-064 |
| REQ-QD-030 | `features/features/merged-sources/merged-sources.feature` | BEH-QD-203, BEH-QD-207, BEH-QD-235 |
| REQ-QD-031 | `features/features/custom-predicates/custom-predicates.feature` | BEH-QD-246, BEH-QD-247, INV-QD-049 |

## §6 Coverage targets

| Scope | Statements | Branches | Enforced by |
| ----- | ---------- | -------- | ----------- |
| `packages/core/src` | 95% | 95% | `vitest.config.ts` thresholds |
| `packages/devtools/src/model` | 95% | 95% | `vitest.config.ts` thresholds — held at core's bar, since a merge/pairing bug shows the wrong verdict beside the wrong subject; `src/react/` stays at the 90% default |
| `packages/http/src` | 90% | 90% | `vitest.config.ts` thresholds |
| `packages/audit/src` | 90% | 90% | `vitest.config.ts` thresholds |
| `packages/react/src` | 90% | 90% | `vitest.config.ts` thresholds |
| `packages/promise/src` | 90% | 90% | `vitest.config.ts` thresholds |
| `packages/testing/src` | 90% | 90% | `vitest.config.ts` thresholds |
| `packages/predicate-sql/src` | 90% | 90% | `vitest.config.ts` thresholds (no per-glob entry; falls to the workspace default, matching AGENTS.md §10's "core 95%, everything else 90%") |
| `packages/predicate-prisma/src` | 90% | 90% | `vitest.config.ts` thresholds (no per-glob entry; falls to the workspace default, matching AGENTS.md §10's "core 95%, everything else 90%") |
| Workspace | 90% | 90% | `vitest.config.ts` thresholds |

A shortfall fails the run; it is not merely reported.
