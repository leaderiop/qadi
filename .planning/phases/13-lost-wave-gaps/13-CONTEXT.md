# Phase 13: Lost-wave remaining defects, test gaps and doc defects - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** ARCH-61 (ports parts of lost ARCH-47 `b0b9363`, ARCH-48 `950977f`, ARCH-56 `d089c1d`, ARCH-51 `9cf0e5f`,
ARCH-57 `4b1ed49`, ARCH-46 `903be15`)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, `.planning/phases/_SALVAGE.md`

<domain>
## Phase Boundary

Every remaining LIVE row of `_SALVAGE.md`, one plan per salvage source:
- **13-A public endpoint denial logged** (lost ARCH-47 T3/T4): a `publicEndpoint` handler's own `guard` denial logs
  exactly like any other handler-site denial (BEH-QD-321), through merged ARCH-46's `AuthorizeRequest.ts` handler
  step. The enforcement matrix (`RequestEnforcement.test.ts`) gains a public-endpoint caller row. Port **only**
  this part; the rest of lost ARCH-47 is superseded by merged ARCH-46.
- **13-B simulation fields** (lost ARCH-48): each simulation input field is described once in a closed field
  table (`SimulationFields.ts`). The sweep, remedies, rename, unseeded list, fixture ports and chip commands are
  derived from it. `DropSignature` joins `EditKind`. `hasSignature`/`hasCustom` get a remedy or a named skip with
  its reason (BEH-QD-222).
- **13-C evaluation metrics** (lost ARCH-56): one exported `EvaluationMetrics` module that the three writers write
  through. Typed reads replace id-string matching in tests, so negative "not counted" tests can't pass vacuously.
  Every `qadi_*` metric is listed once and gated.
- **13-D core test gaps and loose ends** (lost ARCH-51 T2, ARCH-57 T3/T12):
  - a missing resource wins over a missing action on `HasResourceAttribute`;
  - both unguarded-route logging cadences are pinned;
  - INV-QD-016 is corrected for the cache case, and a batch runs under a cache and a sink.
  - Triage every other ARCH-57 item (optional no-resource loader, one unguarded-route constructor, fixture
    setups as one union, cache-capacity docs, subject-set lifecycle) against `main`: port, or record as obsolete
    with the commit that made it so.
- **13-E doc defects** (lost ARCH-46 T2, ARCH-51 T3, ARCH-57 T10/T13): `PortMetrics.ts:146` block placement; the
  BEH-QD-076 fence (`spec/behaviors/10-actions.md:83`) shows `Data.TaggedError` for a Schema class; the
  `MissingResourceId` doc omits HasSignature (`Errors.ts:103`); 7 stale citations (incl. `Role.ts:105`
  "Role.test.ts"); 7 `ADR-QD-NEXT` placeholders (4 src, 3 test titles). Add a gate so `ADR-QD-NEXT` can't
  reach `packages/*/src` or test titles again (lost D-57-i/k).
- **13-F wrap-up**: run `pnpm check:pr`; then a human checkpoint proposing to delete the rescue branches.
</domain>

<evidence>
## Evidence (1721a42; see `_SALVAGE.md` for each row)
- Public endpoint: the Public arm is still `Effect.provideService(httpEffect, CurrentSubject, anonymous)`
  (`packages/http/src/RequirePermissionMiddleware.ts:~124`). Probe: 403 with body `{"_tag":"AccessDenied",…}` and log lines `[]`.
- Simulation: `packages/devtools/src/model/SimulationEdit.ts:40-57` (no DropSignature); `Remedies.ts:354,359` (`() => []`).
- Metrics: `packages/core/src/Lifecycle.ts:56` holds the metric ids as private strings; `GuardHealthCheck.test.ts:147` uses `find(id === "qadi_decisions_total")` being undefined.
- Tests: no missing-resource-over-action test in `packages/core/test`; `http.test.ts:313-337` makes one request; no test
  mentions "serving port routes unguarded" (`PortRoutes.ts:170`); `spec/invariants.md:~460` INV-QD-016; `SubjectSet.test.ts` has no cache or sink.
- Reference implementations: `git show b0b9363 950977f d089c1d 9cf0e5f 4b1ed49 903be15`. Lost plans: `ARCH-47/48/56/51/57/46-*.md`.
</evidence>

<decisions>
## Implementation Decisions
- **D-01 (test first):** every LIVE defect row gets a RED test before its fix. Doc rows get a gate or grep check instead.
- **D-02:** same rule as Phases 11–12. Take each lost plan's recommended option unless main moved the premise.
  Moved one-way premises go to one `checkpoint:decision` per plan.
- **D-03:** 13-B ports onto a devtools that has moved since `b655b3b` (ARCH-58's `ExplorerSession`/`HeldChoice`;
  merged Phase 2's "devtools replay fails closed on an unseen signature"). Phase 15 (dock session) also touches
  `SimulationSession.ts`/`useSimulationSession.ts`, so **13-B lands before Phase 15**. Its `files_modified` must
  be listed so Phase 15 can rebase.
- **D-04:** 13-C touches `Lifecycle.ts`, `DecisionCache.ts`, `PortMetrics.ts`, `Predicate.ts`, the audit metrics and both
  predicate packages. Phase 20 (DecisionCache) and Phase 14 (audit) touch some of the same files, so **13-C lands
  before 14 and 20**.
- **D-05:** the new `ADR-QD-NEXT` gate is a `scripts/check-house-style.mjs` rule. It is documented in AGENTS.md, and
  `spec/process/definitions-of-done.md` is updated **only** if a new `pnpm check` step is added (gate 11 checks
  that table against `pnpm check`).
- **D-06:** numbering from the Phase 13 reservations (one ADR per sub-plan that needs one; CCRs per sub-plan).
  Changesets per touched package.
- **D-07:** waves: 13-A, 13-C, 13-D and 13-E in wave 1 where their `files_modified` don't overlap (the planner computes
  this; `spec/` overlaps are fine if each plan edits disjoint sections). 13-B in wave 1 or 2. 13-F last.
</decisions>

<canonical_refs>
## Canonical References
- `.planning/milestones/archive-pre-gsd/architecture/ARCH-46…57-*.md` (lost plans and their §1 probes); `git show <sha>` for each source
- `packages/http/src/RequirePermissionMiddleware.ts`, `AuthorizeRequest.ts`, `test/RequestEnforcement.test.ts`
- `packages/devtools/src/model/Simulation*.ts`, `Edits.ts`, `Remedies.ts`, `Replay.ts`, `react/Simulator.tsx`
- `packages/core/src/Lifecycle.ts`, `PortMetrics.ts`, `DecisionCache.ts`, `Predicate.ts`, `Errors.ts`, `Role.ts`
- `scripts/check-house-style.mjs`, `AGENTS.md`, `spec/invariants.md`, `spec/behaviors/10-actions.md`
</canonical_refs>

<deferred>
## Deferred Ideas
- Lost ARCH-51's full `LeafNeeds.ts` deepening. Its defect (T1) is obsolete after merged ARCH-53, so the deepening
  needs a fresh review before it is re-proposed.
- Lost ARCH-55 (named core barrel).
</deferred>

---
*Phase: 13-lost-wave-gaps · Context gathered: 2026-11-10*
