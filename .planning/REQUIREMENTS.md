# Requirements: Qadi — v1.1 Architecture Wave 6

**Defined:** 2026-11-10
**Core Value:** An authorization decision is never wrong and never silent.
**Source:** 2026-11-10 architecture review (9 candidates), plus the re-verification of the lost 2026-10-13 wave
(`.planning/phases/_SALVAGE.md`).

## v1.1 Requirements

### Planning reconciliation (Phase 10)
- [ ] **REC-01**: `.planning/milestones/archive-pre-gsd/architecture/README.md` carries a "superseded 2026-11-10" banner that maps every lost ARCH-46…57 plan to a wave-6 phase or a recorded disposition.
- [ ] **REC-02**: Every lost plan file's `status:` is one of `superseded-by-phase-NN`, `fixed-on-main (<sha>)`, `obsolete` or `deferred`, with a reason.
- [ ] **REC-03**: The tracking decision for `.planning/milestones/archive-pre-gsd/architecture/` (track, ignore or archive) is taken and applied.
- [ ] **REC-04**: No orphan `packages/*/lib/**/*.js` without a `src` counterpart remains after the repo's own clean/build.

### Lost-wave security (Phase 11)
- [ ] **SEC-01**: A signature obligation discharged on a resource whose id is not a string is refused (`SignatureCaptureError`); `capture` is not called and nothing is stored.
- [ ] **SEC-02**: `hasSignature(…, { scope: "Any" })` never allows on a resource from a signature recorded for another resource. The ledger is a keyed store and the exact-pair read rule is derived once.
- [ ] **SEC-03**: Signature ledger adapters have a shipped conformance suite.
- [ ] **SEC-04**: ADR-058, `explain()` and the website docs describe signature `scope: "Any"` correctly (not "for anything" / "same semantics as HasActed").
- [ ] **SEC-05**: `guardApi` builds a closed access plan from its API value. An endpoint served by a different API value (reused names, an API-level requirement, a prefix) fails closed with a 500 and one log line.
- [ ] **SEC-06**: Every path that is served is listed in `/__permissions` and enforced. With `guardApi(P)` wired to the API it serves (including a prefixed one), the registry lists exactly the served paths. A mis-wired prefix (`guardApi(A)` on `layer(A.prefix(…))`) fails closed with a 500 on the served path. *(Amended 2026-11-10: the registry registers at layer build and cannot see the builder's mount prefix, per `HttpApiBuilder` per-request middleware.)*

### Lost-wave integrity (Phase 12)
- [ ] **INT-01**: A decision-stream reconnect during or after the backlog never loses or skips a record; the cursor and the send order have one owner in core.
- [ ] **INT-02**: SSE bytes stay in `@qadi/http` and `EventSource` stays in `@qadi/devtools`; both use core's stream order.
- [ ] **INT-03**: `dehydrateDecisions` never throws on a policy the public constructors accept; an unencodable entry is dropped and counted.
- [ ] **INT-04**: A throwing `onDropped` or `onHydrationMismatch` cannot change what is seeded, dehydrated or counted, and cannot throw into render.
- [ ] **INT-05**: A refused payload is counted at least once (INV-QD-045), including a zero-entry subject mismatch.
- [ ] **INT-06**: A hydration outcome is one closed `HydrationEvent`, projected once to the counter and to the reporter.

### Lost-wave gaps (Phase 13)
- [ ] **GAP-01**: A `publicEndpoint` handler's own `guard` denial logs like any handler-site denial; the enforcement matrix covers the public-endpoint caller.
- [ ] **GAP-02**: Each simulation input field is described once in a closed field table; the sweep, remedies, rename, unseeded list, fixture ports and chips derive from it.
- [ ] **GAP-03**: `DropSignature` is an `EditKind`; the sweep offers a signature row on `hasSignature` policies.
- [ ] **GAP-04**: `hasSignature` and `hasCustom` get a remedy or a named skip with its reason (BEH-QD-222).
- [ ] **GAP-05**: Evaluation metrics are declared once in an exported module; tests read them by typed reference, so a negative "not counted" test cannot pass vacuously.
- [ ] **GAP-06**: Every `qadi_*` metric is listed once and gated.
- [ ] **GAP-07**: A test pins that a missing resource wins over a missing action on `HasResourceAttribute`.
- [ ] **GAP-08**: Both unguarded-route logging cadences are pinned by tests.
- [ ] **GAP-09**: INV-QD-016 is true under a decision cache, and a batch runs under a cache and a sink in a test.
- [ ] **GAP-10**: Every remaining lost ARCH-57 item is ported or recorded as obsolete with the commit that made it so.
- [ ] **GAP-11**: The listed doc defects are fixed (PortMetrics block, BEH-QD-076 fence, MissingResourceId doc, 7 stale citations, 7 `ADR-QD-NEXT`).
- [ ] **GAP-12**: A house-style gate refuses `ADR-QD-NEXT` (and other `…-NEXT` placeholders) in `packages/*/src` and in test titles.

### Audit sink deadline (Phase 14)
- [ ] **AUD-01**: A store call (stage, write, commit) that never settles cannot stall `evaluate`/`guard`; the sink bounds it with a deadline.
- [ ] **AUD-02**: A timed-out call is a failed attempt the circuit breaker counts; enough of them open the breaker, and a hung half-open probe releases its claim.
- [ ] **AUD-03**: The deadline is configurable, with a documented default (or the route the checkpoint picks).
- [ ] **AUD-04**: `AuditTrailPortTest`/`AuditStagingPortTest` take a per-call script (`Ok | Fail | Die | Never | Latch`); the hand-written failing audit port layers and `driveExit`'s mode table are gone.
- [ ] **AUD-05**: BEH-QD-251 is amended so that the sink's own deadline is a failure while a caller's interruption is still not one; a new BEH states the bound.

### Dock session (Phase 15)
- [ ] **DOCK-01**: Replaying the same timeline row again, after choosing another policy or editing the form, re-seeds the simulator.
- [ ] **DOCK-02**: The dock's tab, filters, selection and replay are owned by a headless dock session; `DevtoolsDock.tsx` holds no `useState` for them.
- [ ] **DOCK-03**: "Pair the whole timeline, then filter" and "count the whole timeline" are rules of the session, tested without rendering.
- [ ] **DOCK-04**: The simulation session tells a deliberate replay command apart from an effect re-run in its interface.
- [ ] **DOCK-05**: The existing `DevtoolsDock.test.tsx` behaviour stays green.

### Role-graph walk (Phase 16)
- [ ] **ROLE-01**: One traversal in `Role.ts` (identity-keyed, iterative, pre-order, first path wins, reports revisits) backs `flattenPermissions`, `roleNames`, `permissionProvenance` and `fromRoles`.
- [ ] **ROLE-02**: `fromRoles` walks the graph once.
- [ ] **ROLE-03**: The devtools role tree is a projection of core's traversal: distinct same-named roles are not "repeated", depth is stack-safe (20,000+), and the node count is linear in roles.
- [ ] **ROLE-04**: INV-QD-038 holds by construction, pinned by a property test over random DAGs.
- [ ] **ROLE-05**: The flatten/fromRoles benchmark shows no regression beyond noise.

### Injective request key (Phase 17)
- [ ] **KEY-01**: `canonicalKey(a) === canonicalKey(b)` if and only if `a` and `b` are equal under the documented equality, as a property test over arbitrary values (Date, NaN, ±Infinity, -0, undefined keys, Set, Map, bigint, nested).
- [ ] **KEY-02**: All five port descriptions derive `key` through `PortKey`.
- [ ] **KEY-03**: Cyclic or unsupported values get a defined, typed outcome, never a stack overflow or silent collision.
- [ ] **KEY-04**: Devtools replay of a capture miss on the four undecided ports follows the decided policy (fail closed recommended), with a test per port.
- [ ] **KEY-05**: ADR-QD-094's key law names the equality `PortKey` implements.

### Devtools HTTP surface (Phase 18)
- [ ] **SURF-01**: The decision stream, backlog and permission registry routes are served under an optional prefix with one address rule.
- [ ] **SURF-02**: The devtools client derives its URLs from the same rule; a round trip under a non-default prefix passes.
- [ ] **SURF-03**: (if the checkpoint picks B) One call mounts all three guarded routes with one guard pair; BEH-QD-202 holds.
- [ ] **SURF-04**: Both examples use the rule; the Next.js example drops its rewrite if the prefix makes it unnecessary.

### Verdict presentation (Phase 19)
- [ ] **VIEW-01**: One treatment module maps every displayable state (a closed union) to its visual treatment; Deny and Error/Failed never share a treatment in any panel.
- [ ] **VIEW-02**: `VerdictTag`, `QuestionsPanel` and `PolicyTree` read only that module; `stateColour(string)` is gone.
- [ ] **VIEW-03**: One headless outcome reading in `Inspect.ts` returns the failure, or the tree with the allow's fields, duties and obligation state, as a closed union.
- [ ] **VIEW-04**: The Inspector and the Simulator consume that reading; the Inspector has tests of its own.

### DecisionCache shared computation (Phase 20)
- [ ] **CACHE-01**: The #64 follow-up gap is reproduced as a RED test, or shown unreachable with written evidence (and the phase stops there).
- [ ] **CACHE-02**: (if reproduced) The single-flight regime is an internal module tested with plain keys and latches.
- [ ] **CACHE-03**: (if reproduced) #64 is fixed; `DecisionCache`'s interface and its existing tests are unchanged.
- [ ] **CACHE-04**: No hot-path regression (bench row) and UNTRACED_BUDGET is unchanged.

### Cross-cutting (every phase)
- [ ] **XC-01**: `pnpm check:pr` is green at the end of each phase.
- [ ] **XC-02**: Each phase records its ADR (or states why none is needed), a CCR row, and the BEH/INV/traceability changes, using only its reserved numbers.
- [ ] **XC-03**: `spec/overview.md` names every added export and drops every removed one (gate 13).
- [ ] **XC-04**: No new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock; budgets change only with their AGENTS.md table.
- [ ] **XC-05**: Coverage thresholds hold (core at least 95%, others at least 90%); the Stryker score of touched files doesn't fall.
- [ ] **XC-06**: Every defect fix is preceded by a regression test seen RED on `1721a42` (or on the phase's base).

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
| REC-01..04 | Phase 10 | Pending |
| SEC-01..06 | Phase 11 | Pending |
| INT-01..06 | Phase 12 | Pending |
| GAP-01..12 | Phase 13 | Pending |
| AUD-01..05 | Phase 14 | Pending |
| DOCK-01..05 | Phase 15 | Pending |
| ROLE-01..05 | Phase 16 | Pending |
| KEY-01..05 | Phase 17 | Pending |
| SURF-01..04 | Phase 18 | Pending |
| VIEW-01..04 | Phase 19 | Pending |
| CACHE-01..04 | Phase 20 | Pending |
| XC-01..06 | All phases | Pending |

**Coverage:** 66 v1.1 requirements (60 + 6 cross-cutting); mapped 66; unmapped 0.

---
*Requirements defined: 2026-11-10*
