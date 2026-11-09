# Phase 1: HTTP request enforcement - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning
**Ticket:** ARCH-46 · reserved ADR-QD-108 · reserved CCR-QD-385

<domain>
## Phase Boundary

At the end of this phase, every `@qadi/http` request path that enforces or extracts a subject
goes through one internal request-enforcement module. That module owns: subject extraction and
its log, the edge decision and its log, providing `CurrentSubject`, and the handler-raised
denial and its log. Its callers are GuardRoute, RequirePermissionMiddleware, DecisionStreamRoute's
`recheck`, and both port-route variants (`portRoutes`, `portRoutesUnguarded`). The live defect
is fixed: an unguarded port route currently drops the `SubjectExtractionFailed` log.

The error tables and their contents (QadiHttpError.ts) stay as they are (ADR-QD-102). Only
*who applies them* changes.
</domain>

<decisions>
## Implementation Decisions

### Shape of the deepened module
- **D-01:** Extend `packages/http/src/AuthorizeRequest.ts` into the request-enforcement module
  rather than creating a parallel file. It already owns the edge step and the
  `logSubjectExtractionFailed` tap (AuthorizeRequest.ts:100). Deletion test: GuardRoute is
  shallow, and `authorizeRequest` earns its keep but sits one level too low.
- **D-02:** The interface takes the permission or policy (or a subject-only mode), a resource
  loader where one applies, and a caller-supplied failure projection. The two projections in
  use today are `toResponse` (GuardRoute, port routes) and `projectHttpEnforcementFailure`
  (middleware, in-channel wire value). The stream recheck keeps its own projection.
- **D-03:** Subject-only mode means: extract the subject, log an extraction failure through
  `logSubjectExtractionFailed`, provide `CurrentSubject`, and run the handler. It applies no
  policy. `portRoutesUnguarded` (PortRoutes.ts:170-186) must use it. Today it calls
  `SubjectExtractor.extract(request)` directly and returns `toResponse(extracted.failure)`
  without logging.
- **D-04:** The handler step owns `Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenialAt("handler"))`
  and `Effect.catchTag(HTTP_ENFORCEMENT_TAGS, project)`. No caller repeats either. Use the
  array form of catchTag (AGENTS.md §4). `catchTags({...})` is forbidden.
- **D-05:** The endpoint member key `` `${group.identifier}/${endpoint.identifier}` `` (GuardApi.ts:143,
  and rebuilt in RequirePermissionMiddleware.ts) becomes one function in the module that owns
  endpoint identity. Choose whichever of GuardApi.ts and the enforcement module avoids a
  madge cycle, and record that choice.

### Tests
- **D-06:** Write the regression test for D-03 FIRST (red on the current tree). It serves
  `portRoutesUnguarded` with a SubjectExtractor that fails, and asserts that
  `collectingLogger()` (from `@qadi/testing`, or core's test twin if inside core) captured the
  `SubjectExtractionFailed` line.
- **D-07:** Add one table-driven suite over the enforcement module: rows are
  {guard, middleware, stream recheck, guarded port, unguarded port} × {extraction failure,
  edge denial, handler denial, success}, asserting the log line (or its absence) and the
  projected result. It replaces per-route log assertions only where they become redundant.
  Keep any assertion about a route's own response shape.

### Records
- **D-08:** Write ADR-QD-108 ("A request is enforced once, through one module"). It amends
  ADR-QD-036 (http package shape) and reads ADR-QD-081 and ADR-QD-102. Also add CCR-QD-385, a
  `spec/README.md` change-history line, `spec/behaviors/23-http.md` (new BEH rows for the
  subject-only mode and the unguarded-route log), invariant(s) in `spec/invariants.md`, rows in
  `spec/traceability.md`, and `.changeset/request-enforced-once.md` (patch for @qadi/http,
  noting the log fix).
- **D-09:** If a public export of `@qadi/http` is added or removed, update `spec/overview.md`
  (gate 13). Prefer keeping the new module internal (not in the barrel, per ADR-QD-099).

### Claude's Discretion
- The exact function names (e.g. `enforceRequest`, `withSubject`), as long as they follow
  AGENTS.md §8 naming.
- Whether GuardRoute.ts survives as a file or folds into `addGuardedRoute`.
</decisions>

<specifics>
## Specific Ideas

Evidence from the review (verify the line numbers before editing):
- `packages/http/src/GuardRoute.ts:75-90`: provide CurrentSubject → tapErrorTag(handler log) → catchTag → `toResponse`.
- `packages/http/src/RequirePermissionMiddleware.ts`, inner `enforce` closure: the same chain, ending in `projectHttpEnforcementFailure`.
- `packages/http/src/DecisionStreamRoute.ts`, `recheck` (~245-256): re-runs the edge step per element.
- `packages/http/src/PortRoutes.ts:179-180`: `const extracted = yield* Effect.result(SubjectExtractor.extract(request)); if (extracted._tag === "Failure") return toResponse(extracted.failure);`
</specifics>

<canonical_refs>
## Canonical References

- `AGENTS.md` §1–§6, §11, §15 — house rules, spec obligations, gates
- `spec/decisions/036-qadi-http-package-shape.md` — package shape (amend)
- `spec/decisions/081-enforcement-error-classes-live-in-core.md` — derived HTTP table
- `spec/decisions/102-the-error-tables-stay-tables.md` — do not restructure the tables
- `spec/decisions/075-clienterror-typing-for-requirepermission.md` — RequirePermission typing (do not regress)
- `spec/decisions/099-entry-points-are-a-closed-list.md` — internal modules stay out of the barrel
- `spec/behaviors/23-http.md` — HTTP behaviours (ARCH-19 edge step, ARCH-45 handler-denial log)
- `spec/process/definitions-of-done.md` — the gate table
- `packages/http/src/QadiHttpError.ts` — `logSubjectExtractionFailed` (:430), `HTTP_ENFORCEMENT_TAGS`, `ENFORCEMENT_DENIAL_TAGS`
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `authorizeRequest` (AuthorizeRequest.ts): already composes extraction, its log and the edge decision.
- `logDenialAt(stage)`, `toResponse`, `projectHttpEnforcementFailure`: the projections to reuse.
- `collectingLogger()` in `@qadi/testing`: log capture for tests.

### Established Patterns
- ARCH-19 (CCR-QD-197) introduced the edge step, and ARCH-45 I3 (CCR-QD-263..269) logged handler denials. Follow their test style in `packages/http/test/`.

### Integration Points
- `addGuardedRoute`, `RequirePermissionMiddleware` layer, `decisionStreamRoute`, `portRoutes`/`portRoutesUnguarded`.
</code_context>

<deferred>
## Deferred Ideas

- The decision-log refusal duplication in DecisionStreamRoute/DecisionBacklogRoute → Phase 5.
- The duplicated `"/__ports"` address → Phase 7.
</deferred>

---

*Phase: 01-http-request-enforcement*
*Context gathered: 2026-11-08*
