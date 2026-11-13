# Phase 11: Lost-wave security defects — signature ledger and guardApi access plan - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** ARCH-59 (ports lost ARCH-52 `8900b7e` and lost ARCH-49 `2ea89d6`)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, `.planning/phases/_SALVAGE.md`

<domain>
## Phase Boundary

Two security defects that are live on `main`, each fixed by porting the lost wave's implementation onto current
`main`:
1. **Signature ledger** (lost ARCH-52). A signature captured on a resource whose id is not a string is no longer
   stored subject-wide: the discharge is refused, so nothing is stored. The ledger becomes a keyed store; the
   exact-pair read rule is derived once in `signatureHistoryFromLedger`; adapters get a conformance suite
   (`SignatureLedgerConformance.ts`). The signature `scope: "Any"` wording is corrected in ADR-058, `explain()` and the docs.
2. **guardApi access plan** (lost ARCH-49). `guardApi` builds a closed access plan from the API **value** it was
   given. The middleware only looks an endpoint up, by identity, not by a group/endpoint name string. Serving an
   API `guardApi` didn't vet, including one that reuses names, fails closed with a 500 and a log line, and the
   registry lists only paths that are served.
</domain>

<evidence>
## Evidence (probes reproduced on 1721a42)
- Signature: `guard(approve, obliged(…), {onObligations: signatureObligationHandler(port,"approved",{ledger})})` with
  resource `{id: 7}` succeeds and stores an entry with no `resourceId`; then `decide(hasSignature("approved",{scope:"Any"}),
  {resource:{id:"doc-99"}})` → **Allow**. `packages/core/src/Resource.ts:28-31` `resourceIdOf` returns `undefined`
  for a non-string id; `packages/audit/src/SignatureLedger.ts:103-113` `ledgerEntryOf` stores it.
  `packages/audit/test/SignatureLedger.test.ts:190-205` **asserts the wrong behaviour** and must be inverted.
- guardApi: membership is the string `endpointMemberKey` (`packages/http/src/AuthorizeRequest.ts:53`,
  `RequirePermissionMiddleware.ts:90`). Probe with A = group `g`, endpoint `read`, `GET /a`, needs read:
  B1 (public `/b`) anonymous → 204; B2 (needs write) → writer 204, `/__permissions` lists only `GET /a`;
  B4 (API-level `RequiredPermission`, public endpoint) anonymous → 204. `A.prefix("/v1")` → `/v1/a` is served,
  but the registry lists `GET /a`.
- Reference implementations: `git show 8900b7e` (33 files) and `git show 2ea89d6` (22 files, new `AccessPlan.ts`,
  `RequirePermission.ts` −59). The lost plans `.planning/milestones/archive-pre-gsd/architecture/ARCH-52-*.md` and `ARCH-49-*.md` hold the
  decisions D-52-a…h and D-49-a…e with their recommendations.
</evidence>

<decisions>
## Implementation Decisions
- **D-01 (test first, both):** each defect's probe becomes a RED test in the repo before any port:
  - Signature: the discharge on `{id: 7}` fails with `SignatureCaptureError`, `capture` is not called, no entry is
    stored, and `hasSignature(…,"Any")` on another resource **denies**. Invert `SignatureLedger.test.ts:190`.
  - guardApi: B1/B2/B4 each answer **500** with exactly one log line; the prefix case lists the served path.
- **D-02:** take the lost plans' **recommended** option on every D-52-* and D-49-* decision (the lost implementer took
  all of them), **except** where main has changed the premise. The planner re-reads each decision against `main`
  and lists the ones whose premise moved. Only a moved premise that is one-way (public export shape, a breaking
  change) becomes a `checkpoint:decision`, and all such decisions go in **one** checkpoint (user: ask once).
- **D-03:** **port, don't cherry-pick.** ARCH-49 must be re-applied on top of merged ARCH-46's `AuthorizeRequest.ts`
  enforcement modes (`enforceRequest`/`enforceSubject`, `endpointMemberKey` built once). The access plan
  replaces the string membership that merged ARCH-46 centralised. ARCH-52 touches `core/SignatureHistory.ts`
  and `Explanation.ts`; check them against merged ARCH-47's `readPort`/span projection (`pose`/`disclose`).
- **D-04:** release hygiene. Merged #153 shipped in 0.10.x/0.12.x (the planner checks `CHANGELOG.md`s and the
  `.changeset/` dir). Names the lost plans called "never published" (`endpointAccess`/`EndpointAccess`/`misplacedDeclarations`,
  the `SignatureLedger` shape) may be published now. Every removed or renamed public export is **Breaking** in the
  changeset, with an `apps/website/.../reference/upgrading.md` entry.
- **D-05:** threat model (security_enforcement is on): STRIDE for both, i.e. elevation of privilege (an unvetted
  endpoint served, a signature over-granting), plus information disclosure (the registry listing paths). Every
  threat has the disposition `mitigate`.
- **D-06:** numbering: new ADR, CCR, BEH and INV from the Phase 11 reservations (`PROJECT.md`). Rewrite the lost ids
  (ADR-QD-110, CCR-QD-389, BEH-QD-336, INV folded into 120) in every ported line.
- **D-07:** two plans in wave 1, one per defect, since their `files_modified` overlap only in `spec/` and the
  changesets. Then one records/finalize plan in wave 2 that also runs `pnpm check:pr`.
</decisions>

<canonical_refs>
## Canonical References
- `git show 8900b7e`, `git show 2ea89d6`; `.planning/milestones/archive-pre-gsd/architecture/ARCH-52-signature-ledger-read-seam.md`, `ARCH-49-guardapi-access-plan.md`
- `packages/audit/src/SignatureLedger.ts`, `SignatureLedgerTest.ts`, `SignatureCapturePort.ts`; `packages/core/src/Resource.ts`, `SignatureHistory.ts`, `Explanation.ts`
- `packages/http/src/GuardApi.ts`, `AuthorizeRequest.ts`, `RequirePermission.ts`, `RequirePermissionMiddleware.ts`, `PermissionRegistry.ts`
- ADR-QD-058, ADR-QD-108 (merged), ADR-QD-036; INV-QD-120; `spec/behaviors/23-http.md`
</canonical_refs>

<deferred>
## Deferred Ideas
- Removing `SignatureCapturePort`/`SignatureLedger` static accessors that nothing calls, and `validate`'s unused slot
  (review candidate "signature tags", Speculative). The planner may fold it in if the port touches those lines anyway.
</deferred>

---
*Phase: 11-lost-wave-security · Context gathered: 2026-11-10*
