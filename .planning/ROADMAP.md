# Roadmap: Qadi — Architecture Wave 5 (ARCH-46 to ARCH-54)

## Overview

This roadmap resolves the nine findings of the 2026-11-08 architecture review. It starts with
the only live defect (HTTP request enforcement), then the two strongest deepenings in core and
audit. The remaining work is locality fixes in react and http, and finally two speculative
core changes. One of those amends ADR-QD-094 behind a human checkpoint. Each phase is one
ARCH ticket with its own ADR, CCR and changeset, and each ends with `pnpm check:pr` green.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): planned milestone work
- Decimal phases (2.1, 2.2): urgent insertions (marked INSERTED)

- [ ] **Phase 1: HTTP request enforcement** - Put the whole enforcement chain behind one module and fix the missing log on unguarded port routes (ARCH-46)
- [ ] **Phase 2: One port read** - Give the span projection one home on the port description and send every port read through one body (ARCH-47)
- [ ] **Phase 3: Audit archive facts** - Use one module for the archive's rules, shared by writer and reader (ARCH-48)
- [ ] **Phase 4: Gate instrumentation hook** - Resolve the writer once and use one `useGates` hook for every gate kind (ARCH-49)
- [ ] **Phase 5: Decision log over HTTP** - Use one encoder and one refusal policy for both stream and backlog (ARCH-50)
- [ ] **Phase 6: Dehydration in the engine** - Add `dehydrateWith` beside `hydrateWith`; both directions get one owner (ARCH-51)
- [ ] **Phase 7: One port route address** - Server and client share one address and one status contract (ARCH-52)
- [ ] **Phase 8: Port serving from the registry** - Derive the serving tables from descriptions behind an ADR-094 checkpoint, and remove pass-through enumerations (ARCH-53)
- [ ] **Phase 9: Sink record projection** - SinkEmit owns every record projection, and JSON refusal words leave the sink wire (ARCH-54)

## Phase Details

### Phase 1: HTTP request enforcement
**Goal**: Every `@qadi/http` request path enforces and logs through one internal module, and an unguarded port route logs a subject-extraction failure.
**Depends on**: Nothing (first phase)
**Requirements**: ENF-01, ENF-02, ENF-03, ENF-04, ENF-05, ENF-06, XC-01, XC-02, XC-03, XC-04, XC-05
**Success Criteria** (what must be TRUE):
  1. An unguarded port route whose extractor fails emits the same `SubjectExtractionFailed` log line as a guarded route (regression test fails on today's `main`).
  2. GuardRoute, RequirePermissionMiddleware, DecisionStreamRoute's recheck and both port-route variants contain no `tapErrorTag(ENFORCEMENT_DENIAL_TAGS` or `catchTag(HTTP_ENFORCEMENT_TAGS` calls of their own.
  3. One table-driven test asserts the log line per failure tag for every caller.
  4. The endpoint member key is built in exactly one function.
  5. `pnpm check:pr` is green, and ADR-QD-108, CCR-QD-385 and a changeset are recorded.
**Plans**: 5/5 plans executed

Plans:
- [x] 01-01 (W1): Tracer: red regression test, then `enforceSubject` subject-only mode; `AuthorizeRequest.ts` grows into the enforcement module; guarded mode `enforceRequest`; GuardRoute rewired
- [x] 01-02 (W2): `endpointMemberKey` built once; middleware and stream recheck go through `enforceRequest`
- [x] 01-03 (W3): Table-driven `RequestEnforcement.test.ts` (5 callers × 6 columns); prune redundant per-route log assertions
- [x] 01-04 (W3): ADR-QD-108, ADR-036 amendment, new BEHs/INV, traceability §1–§3
- [x] 01-05 (W4): Traceability §4, CCR-QD-385, changeset, `pnpm check:pr`

### Phase 2: One port read
**Goal**: A port's span projection is stated once on its description, and every local and served read shares one body, so local and served spans cannot diverge.
**Depends on**: Nothing (independent of Phase 1)
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, PORT-06, XC-01..05
**Success Criteria** (what must be TRUE):
  1. A served signature read and a local signature read for the same question produce identical span attributes, including `meaning`, `signerRole` and `matched` (BEH-QD-227). `onFile` is on neither span: it was never a span attribute, per ARCH-21.
  2. No port module's `wire` block declares `spanQuestion` or `spanAnswer`.
  3. `PortAccess.ts` has one generic read body, and each `ask*` contains only argument shaping and its own validation.
  4. The traced span names from AGENTS.md §5 are unchanged, and UNTRACED_BUDGET is unchanged.
  5. `pnpm check:pr` is green, and ADR-QD-109, CCR-QD-386 and a changeset are recorded.
**Plans**: 3/4 plans executed

Plans:
- [x] 02-01 (W1): `attributes.pose` beside `disclose` on every port; one plain `readPort` body; per-port local-equals-served span table; fixes the served-read synchronous-throw Die
- [x] 02-02 (W2): Signature requirement crosses the wire and keys the request; delete `spanQuestion`/`spanAnswer`/`PortWireSpan`
- [x] 02-03 (W2): ADR-QD-109; amendments to ADR-077/094/107/058; BEH-QD-227/332; new INV; traceability
- [ ] 02-04 (W3): Overview rows, CCR-QD-386, changeset (and ARCH-31 changeset correction), website pages, `pnpm check:pr`

### Phase 3: Audit archive facts
**Goal**: The archive's ordering, claim and sequence rules are each stated once, and the writer and reader both use them.
**Depends on**: Nothing
**Requirements**: ARC-01, ARC-02, ARC-03, ARC-04, XC-01..05
**Success Criteria** (what must be TRUE):
  1. `sequencedCount >= 2` and the ordering comparator each appear once in `packages/audit/src`.
  2. A property test shows the reader accepts every archive the writer produces.
  3. Each `ArchiveRefusal` kind still fires on a tampered bundle.
  4. `pnpm check:pr` is green, and ADR-QD-110 (or a CCR-only justification), CCR-QD-387 and a changeset are recorded.
**Plans**: 3 plans

Plans:
- [ ] 03-01 (W1): Writer/reader agreement property tests and tamper cases, written before any refactor (fast-check)
- [ ] 03-02 (W2): `ArchiveFacts.ts` owns the ordering, claim and sequence-break rules; fold in SequenceBreak; SequenceIntegrity becomes a re-export; scoped Stryker
- [ ] 03-03 (W3): ADR-QD-110, ADR-056 amendment, BEH-QD-254, INV-QD-054/130, CCR-QD-387, changeset, `pnpm check:pr`

### Phase 4: Gate instrumentation hook
**Goal**: Gate instrumentation is one hook over a writer the provider resolved once, so each gate kind's hook is a thin caller.
**Depends on**: Nothing
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04, GATE-05, XC-01..05
**Success Criteria** (what must be TRUE):
  1. `gateWriterFor(` is called from exactly one place in `packages/react/src`.
  2. `useGate` and `useQuestionsAs` hold no `GateIdentity` construction of their own.
  3. A test pins how often `usePolicies` re-creates its group atom across re-renders.
  4. With `instrument` off the existing React suite passes untouched.
  5. `pnpm check:pr` is green, and ADR-QD-111 (or CCR-only), CCR-QD-388 and a changeset are recorded.
**Plans**: 4 plans

Plans:
- [ ] 04-01 (W1): Provider resolves the gate writer once (`GateScopeContext`); `useGates` in GateWriter; useGate thin; useDecisionSuspense opens its atom once
- [ ] 04-02 (W2): `usePolicies` re-render pin; useQuestionsAs onto `useGates`; table over all eight gate kinds
- [ ] 04-03 (W3): ADR-QD-111, ADR-053/080 amendments, BEH-QD-233, INV-QD-046, CCR-QD-388, changeset
- [ ] 04-04 (W4): Recheck success criteria; prove pre-existing React tests untouched; `pnpm check:pr`

### Phase 5: Decision log over HTTP
**Goal**: The HTTP side of the decision log encodes and reports refusals in one module, for both SSE and JSON.
**Depends on**: Phase 1 (both phases touch DecisionStreamRoute.ts)
**Requirements**: LOGH-01, LOGH-02, LOGH-03, LOGH-04, XC-01..05
**Success Criteria** (what must be TRUE):
  1. One `reportRefused` exists in `packages/http/src`.
  2. DecisionBacklogRoute imports nothing from DecisionStreamRoute.
  3. One table-driven test covers refusal in both framings.
  4. `pnpm check:pr` is green, and CCR-QD-389 and a changeset are recorded (ADR-QD-112 if a decision is made).
**Plans**: 2 plans

Plans:
- [ ] 05-01 (W1): Package-private `DecisionLogHttp.ts` (one `reportRefused`, shared encode-or-report, `frame`); both routes go through it
- [ ] 05-02 (W2): New BEH in 26-decision-stream, INV-QD-097, CCR-QD-389, changeset, `pnpm check:pr` (ADR-QD-112 unused)

### Phase 6: Dehydration in the engine
**Goal**: The hydration engine owns both directions of the seed payload.
**Depends on**: Nothing
**Requirements**: HYD-01, HYD-02, HYD-03, HYD-04, XC-01..05
**Success Criteria** (what must be TRUE):
  1. `dehydrateEntry` and `dehydratedPayload` are not exported from HydrationEngine.ts.
  2. `Hydration.ts`'s `dehydrateDecisions` holds no subject filter and no count of its own.
  3. `resolveMismatchReporter` no longer exists.
  4. A round-trip test runs both directions through the engine.
  5. `pnpm check:pr` is green, and ADR-078 is amended (or ADR-QD-113 written), with CCR-QD-390 and a changeset recorded.
**Plans**: 2 plans

Plans:
- [ ] 06-01 (W1): Pin `dehydrateDecisions` output; `dehydrateWith` in the engine; round-trip test; privatise the helpers; delete the identity wrapper
- [ ] 06-02 (W2): BEH-QD-146, INV-QD-022/045, ADR-078 amendment (ADR-QD-113 unused), CCR-QD-390, changeset, `pnpm check:pr`

### Phase 7: One port route address
**Goal**: The server and client adapters for remote ports share one address definition and one status contract.
**Depends on**: Phase 1 (both phases touch PortRoutes.ts)
**Requirements**: ADDR-01, ADDR-02, ADDR-03, XC-01..05
**Success Criteria** (what must be TRUE):
  1. The string `"/__ports"` appears once in `packages/http/src` (excluding comments).
  2. A round trip with a non-default prefix succeeds end to end.
  3. `pnpm check:pr` is green, and CCR-QD-391 and a changeset are recorded.
**Plans**: 3 plans

Plans:
- [ ] 07-01 (W1): Round-trip test under `/x/ports`; leaf `PortRouteAddress.ts` (`PORT_ROUTE_PREFIX`, `portPath`); reply-body contract beside it
- [ ] 07-02 (W1): BEH in 23-http (pointer from BEH-QD-333), traceability, CCR-QD-391, changeset
- [ ] 07-03 (W2): Check the records against what was built; roadmap gates; `pnpm check:pr`

### Phase 8: Port serving from the registry
**Goal**: The serving allowlist and leaf-to-port mapping derive from port descriptions, and pass-through port enumerations are removed.
**Depends on**: Phase 2 (both phases touch port descriptions and PortRemote.ts)
**Requirements**: SERV-01, SERV-02, SERV-03, SERV-04, SERV-05, XC-01..05
**Success Criteria** (what must be TRUE):
  1. A human checkpoint on amending ADR-QD-094 is resolved before code changes.
  2. If approved: `ADMITTED`, `Collector` and `collectNames` are derived from the registry, and the `PortServing` shape is unchanged.
  3. `mapPorts` no longer exists separately from `tabulatePorts`, and `@qadi/testing` has no `answersOf`/`layersOf` split.
  4. `pnpm check:pr` is green, and ADR-QD-114 (or an ADR-094 rejection note), CCR-QD-392 and a changeset are recorded.
**Plans**: 6 plans

Plans:
- [ ] 08-01 (W1, **human checkpoint**): D-01: approve or reject amending ADR-QD-094 for a `serving` facet; opens CCR-QD-392
- [ ] 08-02 (W2, always): `fixturePortsLayer` derived from the registry; `mapPorts` merged into `tabulatePorts` (Breaking: shipped in 0.10.0); testing passes `ports` through
- [ ] 08-03 (W3, if approved): `PortServing.ts` leaf; `serving` facet per port; derived `servingFor`; delete ADMITTED/Collector/collectNames
- [ ] 08-04 (W4, if approved): ADR-QD-114, ADR-094/107 amendments, BEH-QD-331, INV-QD-095
- [ ] 08-05 (W2, if rejected): Dated 'Considered and rejected' note on ADR-094
- [ ] 08-06 (W5): Records, CCR-QD-392 completed, changeset, upgrading page, `pnpm check:pr`

### Phase 9: Sink record projection
**Goal**: Each sink record is projected from its question in one module, and the port wire no longer depends on the sink wire.
**Depends on**: Phase 2 (both phases touch PortWireEncode.ts and the port modules)
**Requirements**: SINK-01, SINK-02, SINK-03, XC-01..05
**Success Criteria** (what must be TRUE):
  1. `Qadi.ts` builds no `ObligationRecord` literal.
  2. No module under `packages/core/src/Port*` or any port module imports `./SinkWire.ts`.
  3. `pnpm circular` is green.
  4. `pnpm check:pr` is green, and ADR-QD-115/116 (or a CCR-only justification), CCR-QD-393 and a changeset are recorded.
**Plans**: 4 plans

Plans:
- [ ] 09-01 (W1): `obligationRecord` in SinkEmit; `discharge` calls it (whole-record pin first)
- [ ] 09-02 (W1): `JsonRefusal.ts` leaf holds the encode-refusal vocabulary; importers retargeted; house-style exemption re-keyed
- [ ] 09-03 (W2): CCR-QD-393 row first, then ADR-QD-116 (ADR-QD-115 unused), ADR-095/102/100 amendments, traceability
- [ ] 09-04 (W3): Overview prose, README revision, changeset, `pnpm check:pr`

## Progress

**Execution Order:**
1 → 2 → 3 → 4 → 6 → 5 → 7 → 8 → 9. Phases 2, 3, 4 and 6 have no dependency on each other and may run in parallel.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. HTTP request enforcement | 5/5 | In Progress | - |
| 2. One port read | 3/4 | In Progress | - |
| 3. Audit archive facts | 0/3 | Planned | - |
| 4. Gate instrumentation hook | 0/4 | Planned | - |
| 5. Decision log over HTTP | 0/2 | Planned | - |
| 6. Dehydration in the engine | 0/2 | Planned | - |
| 7. One port route address | 0/3 | Planned | - |
| 8. Port serving from the registry | 0/6 | Planned | - |
| 9. Sink record projection | 0/4 | Planned | - |
