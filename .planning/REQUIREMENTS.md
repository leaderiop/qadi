# Requirements: Qadi — v1.1 Architecture Wave 6

**Defined:** 2026-11-10
**Core Value:** An authorization decision is never wrong and never silent.
**Source:** 2026-11-10 architecture review (9 candidates), plus the re-verification of the lost 2026-10-13 wave
(`.planning/phases/_SALVAGE.md`).

## v1.1 Requirements

### Planning reconciliation (Phase 10)
- [x] **REC-01**: `.planning/milestones/archive-pre-gsd/architecture/README.md` carries a "superseded 2026-11-10" banner that maps every lost ARCH-46…57 plan to a wave-6 phase or a recorded disposition.
- [x] **REC-02**: Every lost plan file's `status:` is one of `superseded-by-phase-NN`, `fixed-on-main (<sha>)`, `obsolete` or `deferred`, with a reason.
- [x] **REC-03**: The tracking decision for `.planning/milestones/archive-pre-gsd/architecture/` (track, ignore or archive) is taken and applied.
- [x] **REC-04**: No orphan `packages/*/lib/**/*.js` without a `src` counterpart remains after the repo's own clean/build.

### Lost-wave security (Phase 11)
- [x] **SEC-01**: A signature obligation discharged on a resource whose id is not a string is refused (`SignatureCaptureError`); `capture` is not called and nothing is stored.
- [x] **SEC-02**: `hasSignature(…, { scope: "Any" })` never allows on a resource from a signature recorded for another resource. The ledger is a keyed store and the exact-pair read rule is derived once.
- [x] **SEC-03**: Signature ledger adapters have a shipped conformance suite.
- [x] **SEC-04**: ADR-058, `explain()` and the website docs describe signature `scope: "Any"` correctly (not "for anything" / "same semantics as HasActed").
- [x] **SEC-05**: `guardApi` builds a closed access plan from its API value. An endpoint served by a different API value (reused names, an API-level requirement, a prefix) fails closed with a 500 and one log line.
- [x] **SEC-06**: Every path that is served is listed in `/__permissions` and enforced. With `guardApi(P)` wired to the API it serves (including a prefixed one), the registry lists exactly the served paths. A mis-wired prefix (`guardApi(A)` on `layer(A.prefix(…))`) fails closed with a 500 on the served path. *(Amended 2026-11-10: the registry registers at layer build and cannot see the builder's mount prefix, per `HttpApiBuilder` per-request middleware.)*

### Lost-wave integrity (Phase 12)
- [x] **INT-01**: A decision-stream reconnect during or after the backlog never loses or skips a record; the cursor and the send order have one owner in core.
- [x] **INT-02**: SSE bytes stay in `@qadi/http` and `EventSource` stays in `@qadi/devtools`; both use core's stream order.
- [x] **INT-03**: `dehydrateDecisions` never throws on a policy the public constructors accept; an unencodable entry is dropped and counted.
- [x] **INT-04**: A throwing `onDropped` or `onHydrationMismatch` cannot change what is seeded, dehydrated or counted, and cannot throw into render.
- [x] **INT-05**: A refused payload is counted at least once (INV-QD-045), including a zero-entry subject mismatch.
- [x] **INT-06**: A hydration outcome is one closed `HydrationEvent`, projected once to the counter and to the reporter.

### Lost-wave gaps (Phase 13)
- [x] **GAP-01**: A `publicEndpoint` handler's own `guard` denial logs like any handler-site denial; the enforcement matrix covers the public-endpoint caller.
- [x] **GAP-02**: Each simulation input field is described once in a closed field table; the sweep, remedies, rename, unseeded list, fixture ports and chips derive from it.
- [x] **GAP-03**: `DropSignature` is an `EditKind`; the sweep offers a signature row on `hasSignature` policies.
- [x] **GAP-04**: `hasSignature` and `hasCustom` get a remedy or a named skip with its reason (BEH-QD-222).
- [x] **GAP-05**: Evaluation metrics are declared once in an exported module; tests read them by typed reference, so a negative "not counted" test cannot pass vacuously.
- [x] **GAP-06**: Every `qadi_*` metric is listed once and gated.
- [x] **GAP-07**: A test pins that a missing resource wins over a missing action on `HasResourceAttribute`.
- [x] **GAP-08**: Both unguarded-route logging cadences are pinned by tests.
- [x] **GAP-09**: INV-QD-016 is true under a decision cache, and a batch runs under a cache and a sink in a test.
- [x] **GAP-10**: Every remaining lost ARCH-57 item is ported or recorded as obsolete with the commit that made it so.
- [x] **GAP-11**: The listed doc defects are fixed (PortMetrics block, BEH-QD-076 fence, MissingResourceId doc, 7 stale citations, 14 numbering placeholders: 7 `ADR-QD-NEXT`, 5 `INV-QD-NEXT`, 2 `BEH-QD-NEXT-x`).
- [x] **GAP-12**: A house-style gate refuses `ADR-QD-NEXT` (and other `…-NEXT` placeholders) in `packages/*/src` and in test titles.

### Audit sink deadline (Phase 14)
- [x] **AUD-01**: A store call (stage, write, commit) that never settles cannot stall `evaluate`/`guard`; the sink bounds it with a deadline.
- [x] **AUD-02**: A timed-out call is a failed attempt the circuit breaker counts; enough of them open the breaker, and a hung half-open probe releases its claim.
- [x] **AUD-03**: The deadline is configurable, with a documented default (or the route the checkpoint picks).
- [x] **AUD-04**: `AuditTrailPortTest`/`AuditStagingPortTest` take a per-call script (`Ok | Fail | Die | Never | Latch`); the hand-written failing audit port layers and `driveExit`'s mode table are gone.
- [x] **AUD-05**: BEH-QD-251 is amended so that the sink's own deadline is a failure while a caller's interruption is still not one; a new BEH states the bound.

### Dock session (Phase 15)
- [x] **DOCK-01**: Replaying the same timeline row again, after choosing another policy or editing the form, re-seeds the simulator.
- [x] **DOCK-02**: The dock's tab, filters, selection and replay are owned by a headless dock session; `DevtoolsDock.tsx` holds no `useState` for them.
- [x] **DOCK-03**: "Pair the whole timeline, then filter" and "count the whole timeline" are rules of the session, tested without rendering.
- [x] **DOCK-04**: The simulation session tells a deliberate replay command apart from an effect re-run in its interface.
- [x] **DOCK-05**: The existing `DevtoolsDock.test.tsx` behaviour stays green.

### Role-graph walk (Phase 16)
- [x] **ROLE-01**: One traversal in `Role.ts` (identity-keyed, iterative, pre-order, first path wins, reports revisits) backs `flattenPermissions`, `roleNames`, `permissionProvenance` and `fromRoles`.
- [x] **ROLE-02**: `fromRoles` walks the graph once.
- [x] **ROLE-03**: The devtools role tree is a projection of core's traversal: distinct same-named roles are not "repeated", depth is stack-safe (20,000+), and the node count is linear in roles.
- [x] **ROLE-04**: INV-QD-038 holds by construction, pinned by a property test over random DAGs.
- [x] **ROLE-05**: The flatten/fromRoles benchmark shows no regression beyond noise.

### Injective request key (Phase 17)
- [x] **KEY-01**: `canonicalKey(a) === canonicalKey(b)` if and only if `a` and `b` are equal under the documented equality, as a property test over arbitrary values (Date, NaN, ±Infinity, -0, undefined keys, Set, Map, bigint, nested).
- [x] **KEY-02**: All five port descriptions derive `key` through `PortKey`.
- [x] **KEY-03**: Cyclic or unsupported values get a defined, typed outcome, never a stack overflow or silent collision.
- [x] **KEY-04**: Devtools replay of a capture miss on the four undecided ports follows the decided policy (fail closed recommended), with a test per port.
- [x] **KEY-05**: ADR-QD-094's key law names the equality `PortKey` implements.

### Devtools HTTP surface (Phase 18)
- [x] **SURF-01**: The decision stream, backlog and permission registry routes are served under an optional prefix with one address rule.
- [x] **SURF-02**: The devtools client derives its URLs from the same rule; a round trip under a non-default prefix passes.
- [x] **SURF-03**: (if the checkpoint picks B) One call mounts all three guarded routes with one guard pair; BEH-QD-202 holds.
- [x] **SURF-04**: Both examples use the rule; the Next.js example drops its rewrite if the prefix makes it unnecessary.

### Verdict presentation (Phase 19)
- [x] **VIEW-01**: One treatment module maps every displayable state (a closed union) to its visual treatment; Deny and Error/Failed never share a treatment in any panel.
- [x] **VIEW-02**: `VerdictTag`, `QuestionsPanel` and `PolicyTree` read only that module; `stateColour(string)` is gone.
- [x] **VIEW-03**: One headless outcome reading in `Inspect.ts` returns the failure, or the tree with the allow's fields, duties and obligation state, as a closed union.
- [x] **VIEW-04**: The Inspector and the Simulator consume that reading; the Inspector has tests of its own.

### DecisionCache shared computation (Phase 20)
- [x] **CACHE-01**: The #64 follow-up gap is reproduced as a RED test, or shown unreachable with written evidence (and the phase stops there).
- [x] **CACHE-02**: (if reproduced) The single-flight regime is an internal module tested with plain keys and latches.
- [x] **CACHE-03**: (if reproduced) #64 is fixed; `DecisionCache`'s interface and its existing tests are unchanged.
- [x] **CACHE-04**: No hot-path regression (bench row) and UNTRACED_BUDGET is unchanged.

### Cross-cutting (every phase)
- [x] **XC-01**: `pnpm check:pr` is green at the end of each phase. Phase 10: green (10-03, 2026-11-10); Phase 11: green (11-07, 2026-11-10); Phase 12: green (12-05, 2026-11-10); Phase 13: green (13-12, 2026-11-10); Phase 14: green (14-07, 2026-11-10); Phase 15: green (15-04, 2026-11-10); Phase 16: green (16-04, 2026-11-10); Phase 17: green (17-06, 2026-11-10); Phase 18: green (18-03, 2026-11-10); Phase 19: green (19-03, 2026-11-10); Phase 20: green (20-04, 2026-11-10).
- [x] **XC-02**: Each phase records its ADR (or states why none is needed), a CCR row, and the BEH/INV/traceability changes, using only its reserved numbers.
- [x] **XC-03**: `spec/overview.md` names every added export and drops every removed one (gate 13).
- [x] **XC-04**: No new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock; budgets change only with their AGENTS.md table.
- [x] **XC-05**: Coverage thresholds hold (core at least 95%, others at least 90%); the Stryker score of touched files doesn't fall.
- [x] **XC-06**: Every defect fix is preceded by a regression test seen RED on `1721a42` (or on the phase's base).

## Out of Scope
| Item | Reason |
|------|--------|
| Lost ARCH-55 named core barrel | Speculative; its gate gap is latent only under that change |
| Lost ARCH-51 full `LeafNeeds.ts` deepening | Its defect is obsolete on main; needs a fresh review |
| Lost ARCH-50 stashes | Superseded by ARCH-58 |
| Lost ARCH-46 generic port read (T4–T9) | Benchmark NO-GO; merged ARCH-47 delivered one port read differently |
| `Qadi` filter/enforce matrix, two trace-equality rules, `@qadi/promise`, shared HTTP stack helper, Simulator typing buffers | Rejected in the 2026-11-10 review (deliberate or already deep) |
| Releasing or merging a version-packages PR | Only on the user's explicit request |

## Traceability
| Requirement | Phase | Status |
|---|---|---|
| REC-01..04 | Phase 10 | Complete |
| SEC-01..06 | Phase 11 | Complete |
| INT-01..06 | Phase 12 | Complete |
| GAP-01..12 | Phase 13 | Complete |
| AUD-01..05 | Phase 14 | Complete |
| DOCK-01..05 | Phase 15 | Complete |
| ROLE-01..05 | Phase 16 | Complete |
| KEY-01..05 | Phase 17 | Complete |
| SURF-01..04 | Phase 18 | Complete |
| VIEW-01..04 | Phase 19 | Complete |
| CACHE-01..04 | Phase 20 | Complete |
| XC-01..06 | All phases | Complete (XC-01 green for Phases 10–20; evidence for XC-01..06 in 20-04-SUMMARY.md) |

**Coverage:** 66 v1.1 requirements (60 + 6 cross-cutting); mapped 66; unmapped 0.

---
*Requirements defined: 2026-11-10*

---

# Requirements: Qadi — v1.2 Architecture Wave 7

**Defined:** 2026-11-11
**Core Value:** An authorization decision is never wrong and never silent.
**Source:** 2026-11-11 architecture review (8 candidates + 3 footnotes). Evidence and numbering: `.planning/phases/_WAVE7-CONTEXT.md`.
**Base commit:** `965ff14c`.

## v1.2 Requirements

### Port request derived from its description (Phase 21)
- [x] **PREQ-01**: A port description derives `key` from its wire question by default; no derived port lists its request fields for the key by hand.
- [x] **PREQ-02**: A port description derives `defect` from `failure` and `Cause.squash` by default; CustomPredicate keeps an explicit, documented override for `key` and `defect`.
- [x] **PREQ-03**: One law test at `PortDescription`'s interface states "a derived key equals `canonicalKey` of the wire question" as a property over every derived port; the per-port key and defect pins it replaces are deleted only after it is green.
- [x] **PREQ-04**: A field missing from a derived port's question cannot compile silently (RED first: drop a field from a hand key on the phase base and show only conformance catches it).
- [x] **PREQ-05**: Wherever a request field is still restated inside a port module (span struct, `pose`, `toQuestion`/`fromQuestion`), it is derived from one struct, or the plan records why it cannot be.

### One resource-scoped port read (Phase 22)
- [x] **SCOPE-01**: `PortAccess.ts` has one scoped read that owns the early `pose` annotation, the resource-id check, `MissingResourceId` and `readPort`; `askActedForResource`, `askRelationship` and `askSignature` go through it.
- [x] **SCOPE-02**: A missing resource id produces the same trace shape on every scoped port (the shape chosen at the phase's checkpoint), pinned by one parameterised test over the three descriptions.
- [x] **SCOPE-03**: No scoped read takes two adjacent positional `string`s that can be swapped; `askSignature`'s meaning and signer role cannot be transposed and still typecheck.
- [x] **SCOPE-04**: The leaf→request mapping is stated once: each port description's `asks` drives both the evaluation reads and `servingFor` (`LeafRequests` replaces `ServedLeaves`); the `servingFor` property test stays as a guard (decision 2026-11-11, overrides the planner's D-05).
- [x] **SCOPE-05**: The span change is recorded as public behaviour (ADR-QD-051): BEH and traceability updated, and no `UNTRACED_BUDGET` change.

### Sink record fields stated once (Phase 23)
- [x] **SREC-01**: A benchmark at the phase base measures record construction (and one `Evaluate.bench.ts` workload) for the candidate record shapes; the GO/NO-GO is a `checkpoint:decision` with the numbers.
- [x] **SREC-02**: The decision and obligation records' fields are stated once; the record class's field type and the v2 wire struct derive from that one statement.
- [x] **SREC-03**: Leaving an optional field out of `project`/`rebuild` is a compile error or a failing generated round trip (RED first on the phase base).
- [x] **SREC-04**: `failedRecord` and `decidedRecord` are one projection; `SinkWire.ts`'s restated `SinkRecordTag` is gone, or the plan records why the cycle still forces it.
- [x] **SREC-05**: Wire goldens in `SinkCodec.test.ts` are unchanged; the v2 wire is byte-identical.

### Simulation source preparation (Phase 24)
- [x] **SRC-01**: `SimulationSource.ts` owns `prepareSource(choice, { ports, capture })`, returning the options and a `Ready`/`Refused` result; availability is written once.
- [x] **SRC-02**: "A Live run captures so Snapshot unlocks" is implemented in `SimulationSource.ts` alone; the session no longer inspects a source variant's `_tag`.
- [x] **SRC-03**: One table test covers every (choice × ports × capture) combination; the session tests only check that a `Refused` becomes the run state.

### Session-only Simulator (Phase 25)
- [x] **SIM-01**: `Simulator` renders from a session only; `OwnedSimulator` and the ignored `sightings` prop are gone, and tests build a session directly.
- [x] **SIM-02**: The session gains `setAction(text)` and `choosePolicyAt(index)` commands; the view composes no form codec and parses no select value.
- [x] **SIM-03**: The run's reading, the sweep-cost sentence and the baseline summary/match are in the session snapshot and under the devtools mutation gate.
- [x] **SIM-04**: The session is constructed in a `Scope` and owns its runs through an `effect/FiberHandle`: a new run or a superseding command interrupts the previous run promptly, closing the scope interrupts the run in flight, and `reap`/`hasRetired`/`dispose` leave the interface (decision 2026-11-11; supersedes ARCH-20 D-20-b via ADR-QD-137).
- [x] **SIM-05**: Any public interface change of `@qadi/devtools` is in `spec/overview.md` and a changeset.

### Headless dock model (Phase 26)
- [x] **DMOD-01**: The scoped `makeDockModel` owns the timeline, sightings, simulation, explorer, held choice, dock session and the source read (through its own FiberHandle), and pushes sightings itself; React has one owned-model hook that forks nothing.
- [x] **DMOD-02**: Every cross-store rule now tested through `DevtoolsDock.test.tsx` has a model test that renders nothing; the DOM duplicates are removed only after the model tests are green.
- [x] **DMOD-03**: The three `useOwnedX` hooks and their per-input `useLayoutEffect`s are deleted; `Screen`'s pass-through props shrink to the model.
- [x] **DMOD-04**: The sessions embed one held-choice store; `HeldChoice` is no longer re-mapped in `SimulationSession`, `ExplorerSession` and `RoleViewer`.
- [x] **DMOD-05**: AGENTS.md §13 holds: no React state for decisions, decisions read through `outcomeOf`.

### Bare-route module (Phase 27)
- [x] **ROUTE-01**: One module owns `addGuardedRoute` (absorbing `guardRoute`), `unguardedRoutes` and one route-method union. *Delivered (Phase 27): `addGuardedRoute` is written once in `GuardRoute.ts`; `unguardedRoutes` and the one `RouteMethod` union stay in the package-private sibling `UnguardedRoute.ts` so the barrel never exposes them (27-CONTEXT D-02, CCR-QD-417, ADR-QD-036 Rev 1.10).*
- [x] **ROUTE-02**: The `CurrentSubject` exclusion rule is pinned by type tests on the public `addGuardedRoute`.
- [x] **ROUTE-03**: `PermissionRegistry.ts` keeps only the registry and `/__permissions`; the public surface of `@qadi/http` is unchanged (or the change is in `spec/overview.md` and a changeset). *Delivered (Phase 27): `PermissionRegistry.ts` keeps only the registry; `/__permissions` moved to `PermissionRegistryRoute.ts` to break the import cycle that keeping it would cause (27-CONTEXT D-03, ADR-QD-037, CCR-QD-417, ADR-QD-036 Rev 1.10); export names unchanged (`pnpm spec:api`).*

### Gate registry dependency (Phase 28)
- [x] **GATE-01**: The checkpoint records the human's answer on reopening ADR-QD-111 (invert, extract-only, or keep with a recorded reason).
- [x] **GATE-02**: (if not "keep") A pure `reconcile(live, wanted)` is tested against a fake writer without `renderHook`.
- [x] **GATE-03**: (if "invert") The registry's types live in `GateRegistry.ts`, `GateAtoms` is derived from `QadiAtoms`, and `pnpm circular` is green. *Delivered (Phase 28, outcome A from `_DECISIONS-v1.2.md`): the types live in the React-free leaf `GateWriter.ts` below the registry and `GateRegistry.ts` re-exports the public ones (placing them in `GateRegistry.ts` would publish `gateWriterFor` or close a cycle, ADR-QD-140); `GateAtoms` = `Pick<QadiAtoms, "decision" | "decisions">`; `pnpm circular` green.*
- [x] **GATE-04**: `useGateRegistration` either gains a production reason or is removed with its test.

### Small restated facts (Phase 29)
- [x] **TIDY-01**: `PortName`/`PortSpanName` live in a leaf module with no metrics; `PortSpanName` derives from the descriptions' span literals if the compiler allows. *Delivered (Phase 29) by the inverse derivation (29-CONTEXT D-02): one five-row table in the import-free `PortName.ts` states each port's name and span, and `PortDescription.span` is narrowed to `PortSpanOf<N>`; deriving from the descriptions is not possible (each annotated description's `span` type is the whole union, and the leaf cannot import descriptions without a cycle), recorded in the ADR-QD-094 amendment and CCR-QD-419.*
- [x] **TIDY-02**: `HydrationEngine.ts`'s entry `omit` lists are stated once and used by both the schemas and `dehydrateDecision`. *Delivered (Phase 29): `ALLOW_WITHHELD`/`DENY_WITHHELD`; the D-04 decode guard already existed (`HydrationPayload.test.ts`), so none was added.*
- [x] **TIDY-03**: The "This is not a denial" sentence is one constant used by the Inspector and the Simulator.

### Cross-cutting (every v1.2 phase)
- [x] **WX-01**: `pnpm check:pr` is green at the end of each phase.
- [x] **WX-02**: Each phase records its ADR (or states why none is needed), a CCR row, and the BEH/INV/traceability changes, using only its reserved numbers.
- [x] **WX-03**: `spec/overview.md` names every added export and drops every removed one (gate 13).
- [x] **WX-04**: No new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock; budgets change only with their AGENTS.md table.
- [x] **WX-05**: Coverage thresholds hold (core at least 95%, others at least 90%); the Stryker score of touched files does not fall (per-phase `NN-mutation-base.json`).
- [x] **WX-06**: Every defect fix is preceded by a regression test seen RED on the phase base.

## v1.2 Out of Scope
| Item | Reason |
|------|--------|
| Merging `PortInterpreter.ts`/`PortSpanDecode.ts`/`SinkWire.ts` leaves | Barrel-policy change (AGENTS.md §9, ADR-099), not a deepening |
| Re-planning modules listed "Already deep" in `_WAVE7-CONTEXT.md` | Reviewed 2026-11-11 |
| Releasing or merging a version-packages PR | Only on the user's explicit request |

## v1.2 Traceability
| Requirement | Phase | Status |
|---|---|---|
| PREQ-01, PREQ-02, PREQ-03, PREQ-04, PREQ-05 | Phase 21 | Complete (2026-11-11; re-verified at HEAD 2026-11-12) |
| SCOPE-01, SCOPE-02, SCOPE-03, SCOPE-04, SCOPE-05 | Phase 22 | Complete (2026-11-11; re-verified at HEAD 2026-11-12) |
| SREC-01, SREC-02, SREC-03, SREC-04, SREC-05 | Phase 23 | Complete (2026-11-11; re-verified at HEAD 2026-11-12) |
| SRC-01, SRC-02, SRC-03 | Phase 24 | Complete (2026-11-11) |
| SIM-01, SIM-02, SIM-03, SIM-04, SIM-05 | Phase 25 | Complete (2026-11-11) |
| DMOD-01, DMOD-02, DMOD-03, DMOD-04, DMOD-05 | Phase 26 | Complete (2026-11-11) |
| ROUTE-01, ROUTE-02, ROUTE-03 | Phase 27 | Complete (2026-11-11) |
| GATE-01, GATE-02, GATE-03, GATE-04 | Phase 28 | Complete (2026-11-11) |
| TIDY-01, TIDY-02, TIDY-03 | Phase 29 | Complete (2026-11-12) |
| WX-01, WX-02, WX-03, WX-04, WX-05, WX-06 | All v1.2 phases | Pending |

**Coverage:** 44 v1.2 requirements (38 + 6 cross-cutting); mapped 44; unmapped 0.

---
*v1.2 requirements defined: 2026-11-11*
