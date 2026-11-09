# Requirements: Qadi — Architecture Wave 5

**Defined:** 2026-11-08
**Core Value:** An authorization decision is never wrong and never silent.

## v1 Requirements

### ENF — Request enforcement in @qadi/http (Phase 1, ARCH-46)

- [x] **ENF-01**: One internal `@qadi/http` module owns the whole request-enforcement chain:
  subject extraction plus its log, the edge decision plus its log, providing `CurrentSubject`,
  and the handler-raised denial plus its log. GuardRoute, RequirePermissionMiddleware,
  DecisionStreamRoute's recheck and the port routes all go through it.
- [x] **ENF-02**: The chain has a subject-only mode (extract, log, provide; no policy) that
  `portRoutesUnguarded` uses.
- [ ] **ENF-03 (bug)**: A `SubjectExtractionFailed` on an unguarded port route is logged
  through `logSubjectExtractionFailed`, exactly as it is on every guarded path. A regression
  test proves it.
- [x] **ENF-04**: Callers supply only the failure projection (an HTTP response, or an
  in-channel wire value). They no longer repeat `Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, …)`
  or `Effect.catchTag(HTTP_ENFORCEMENT_TAGS, …)` themselves.
- [x] **ENF-05**: The endpoint member key `${group.identifier}/${endpoint.identifier}` is built
  in one place, used by both GuardApi.ts and RequirePermissionMiddleware.ts.
- [x] **ENF-06**: One table-driven test covers every caller (guard, middleware, stream recheck,
  guarded port, unguarded port) and asserts the log line for each failure tag.

### PORT — One port read (Phase 2, ARCH-47)

- [x] **PORT-01**: Each port's question→span-attributes and answer→span-attributes projection
  is stated once, on the description's span attributes (`PortSpanAttributes`), not in
  `PortWire`.
- [x] **PORT-02**: The `spanQuestion`/`spanAnswer` fields are removed from all five port
  modules' `wire` blocks, and `PortWire` deals only with JSON.
- [x] **PORT-03**: One internal generic read in `PortAccess.ts` performs span annotation,
  metric counting, defect catching and answer annotation for every local read and for
  `servePortRead`.
- [x] **PORT-04**: Local and served spans for the same question carry identical attributes.
  This fixes the signature port's divergence: a served span lacked `meaning`/`signerRole`, and
  its answer span was `{}` while the local one carried `matched`. `onFile` stays off both spans, per BEH-QD-227 and ADR-QD-109.
- [x] **PORT-05**: Every read named in AGENTS.md §5 keeps its traced `Effect.fn(name)` span
  and span name. UNTRACED_BUDGET is unchanged.
- [x] **PORT-06**: The PortAccess tests become a per-port table that asserts span equality
  between local and served reads.

### ARC — Audit archive facts (Phase 3, ARCH-48)

- [x] **ARC-01**: One module computes the archive facts of a list of entries: the ordered
  entries, `sequenceIntegrityVerified` (sequencedCount ≥ 2), and the first sequence break.
- [x] **ARC-02**: `archiveAuditTrail` builds its bundle from those facts, and `readAuditArchive`
  recomputes them and compares them with the bundle's claims. Neither restates the ordering
  rule or the claim rule.
- [x] **ARC-03**: `SequenceIntegrity.ts` and `SequenceBreak.ts` are folded into the new module,
  or reduced to re-exports where a public name must survive.
- [x] **ARC-04**: A property test proves that `readAuditArchive` accepts every bundle
  `archiveAuditTrail` produces, and that each refusal kind (`OutOfOrder`, `SequenceBreak`,
  `UnbackedClaim`) still fires on a tampered bundle.

### GATE — Gate instrumentation hook (Phase 4, ARCH-49)

- [x] **GATE-01**: QadiProvider resolves the gate writer once and exposes it to hooks
  internally. `gateWriterFor(gates)` is called from exactly one place.
- [x] **GATE-02**: GateWriter offers one internal hook, `useGates(kind, questions)`, that owns
  atom lookup, `GateIdentity` construction, the `wraps` rule and the marker refs.
- [x] **GATE-03**: `useGate` and `useQuestionsAs` become thin callers of that hook, and
  `useDecisionSuspense` stops opening the decision atom twice.
- [x] **GATE-04**: The `usePolicies` per-render `questions` record is investigated. If it
  recreates the group atom or the identities on every render, it is fixed and pinned by a test.
  If it does not, a test pins that it does not.
- [x] **GATE-05**: With instrumentation off, the DOM is unchanged and the existing React suite
  passes untouched (AGENTS.md §13).

### LOGH — Decision log over HTTP (Phase 5, ARCH-50)

- [x] **LOGH-01**: One internal `@qadi/http` module encodes a decision-log read into records in
  SSE framing or as a JSON array, and owns refusal reporting: a refused record drops only its
  own frame.
- [x] **LOGH-02**: DecisionStreamRoute and DecisionBacklogRoute both use it. The two
  `reportRefused` copies and the two encode-or-report loops are gone.
- [x] **LOGH-03**: DecisionBacklogRoute no longer imports its options type from
  DecisionStreamRoute.
- [x] **LOGH-04**: One table-driven refusal test covers both framings.

### HYD — Dehydration in the engine (Phase 6, ARCH-51)

- [x] **HYD-01**: `HydrationEngine` exposes `dehydrateWith(entries, options)`, mirroring
  `hydrateWith`. It owns the subject filter, the `ForeignSubject` drop count, the dropped-entry
  reporting and the envelope.
- [x] **HYD-02**: `dehydrateEntry` and `dehydratedPayload` become private to the engine, and
  `Hydration.ts`'s `dehydrateDecisions` is a one-line delegation.
- [x] **HYD-03**: The identity wrapper `resolveMismatchReporter` is deleted.
- [x] **HYD-04**: A round-trip test exercises both directions through the engine's interface.

### ADDR — One port route address (Phase 7, ARCH-52)

- [x] **ADDR-01**: One exported definition of the port route address (the default prefix and
  `portPath(prefix?, port)`) is imported by both PortRoutes.ts and RemotePorts.ts.
- [x] **ADDR-02**: The "decode the body whatever the status" contract is stated beside that
  address and referenced by both adapters.
- [x] **ADDR-03**: A round-trip test serves `portRoutes` and calls `remotePortsLayer` with a
  non-default prefix.

### SERV — Port serving derived from the registry (Phase 8, ARCH-53)

- [x] **SERV-01**: A human checkpoint confirms amending ADR-QD-094 to allow a `serving` facet
  on a port description before any code changes.
- [x] **SERV-02**: Each port description states its serving facet: the allowlist kind and the
  policy leaf tags it answers. `ADMITTED`, `Collector`, `collectNames` and the per-port sets in
  `servingFor` are derived from the registry.
- [x] **SERV-03**: The public `PortServing` shape is unchanged.
- [x] **SERV-04**: Pass-through enumerations are removed: `mapPorts` merges into
  `tabulatePorts`, `fixturePortsLayer` derives from the registry, and `@qadi/testing`'s
  `answersOf`/`layersOf` split is gone.
- [x] **SERV-05**: If the checkpoint rejects the amendment, SERV-04 still ships and the
  rejection is recorded as an ADR-094 note so that future reviews do not suggest it again.

### SINK — Sink record projection and JSON refusal vocabulary (Phase 9, ARCH-54)

- [x] **SINK-01**: SinkEmit owns all three record projections: failed, decided and obligation.
  `Qadi.ts`'s `discharge` no longer builds an `ObligationRecord` inline.
- [x] **SINK-02**: `EncodeRefusal`, `OpaqueKind`, `WirePath` and `describeEncodeRefusal` move
  to a leaf module next to `JsonHazard.ts`. `SinkWire.ts` keeps `WireVersion`, `DecodeRefusal`
  and `SinkRecordTag`.
- [x] **SINK-03**: PortWireEncode, AttributeResolver and CustomPredicate no longer import from
  `SinkWire.ts`, and `pnpm circular` stays green.

### XC — Cross-cutting (every phase)

- [x] **XC-01**: `pnpm check:pr` is green at the end of each phase.
- [x] **XC-02**: Each phase records its ADR (or states why none is needed), a CCR row, the
  `spec/README.md` change history line, its traceability rows, and a `.changeset/*.md`.
- [x] **XC-03**: `spec/overview.md` names every added export and drops every removed one (gate 13).
- [x] **XC-04**: No new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await` or
  `console.*` outside their budgets.
- [x] **XC-05**: Coverage thresholds hold (core at least 95%, others at least 90%).

## v2 Requirements

None. Every finding in the review is in scope.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Merging the cycle-breaking Port* leaf files | ADR-QD-037: madge type-only cycles |
| Rewriting the audit `*PortTest` doubles | Core's PortDoubles registry is closed; they are acceptable |
| Merging Walk.ts denial text with Explanation.ts text | They are different sentences by design; Wording.ts holds what is shared |
| Changing the error tables in QadiHttpError.ts | ADR-QD-102: the tables stay tables |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENF-01..06 | Phase 1 | Pending |
| PORT-01..06 | Phase 2 | Complete |
| ARC-01..04 | Phase 3 | Complete |
| GATE-01..05 | Phase 4 | Pending |
| LOGH-01..04 | Phase 5 | Complete |
| HYD-01..04 | Phase 6 | Complete |
| ADDR-01..03 | Phase 7 | Complete |
| SERV-01..05 | Phase 8 | Complete |
| SINK-01..03 | Phase 9 | Complete |
| XC-01..05 | All phases | Pending |

**Coverage:** 45 requirements in v1, all mapped, none unmapped.

---
*Requirements defined: 2026-11-08*
