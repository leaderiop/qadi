---
phase: 11-lost-wave-security
plan: 06
subsystem: spec
tags: [security, spec, adr, traceability, overview, gate-13, lost-wave-port]

requires: ["11-04", "11-05"]
provides:
  - "ADR-QD-117 (a signature ledger is a keyed store; amends ADR-QD-105, ADR-QD-058) and ADR-QD-118 (guardApi plans access from the API value; amends ADR-QD-036, ADR-QD-108), both indexed (XC-02)"
  - "ADR-QD-058 no longer says a signature's scope \"Any\" has HasActed's semantics (SEC-04)"
  - "BEH-QD-092, -174, -180, -256, -320, -326, -328, -335; INV-QD-034, -120, -180 and INV-QD-243's Source; ADR-QD-108's D-46-e row: corrected"
  - "BEH-QD-339 (a ledger adapter can be checked) with a compiled `typescript` fence and traced tests"
  - "CCR-QD-395 (signature) and CCR-QD-396 (guardApi) register rows"
  - "spec/overview.md names every export 11-01..11-05 added and drops the three readers 11-04 made private: gate 13 (`pnpm spec:api`) green (XC-03)"
affects: [11-07]

actuals:
  tokens: 60000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - spec/decisions/117-a-signature-ledger-is-a-keyed-store.md
    - spec/decisions/118-guardapi-plans-access-from-the-api-value.md
    - .planning/phases/11-lost-wave-security/11-06-SUMMARY.md
  modified:
    - spec/decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md
    - spec/decisions/105-an-obligation-is-discharged-against-the-question-it-answered.md
    - spec/decisions/036-qadi-http-package-shape.md
    - spec/decisions/108-a-request-is-enforced-once-through-one-module.md
    - spec/decisions/index.yaml
    - spec/behaviors/12-history.md
    - spec/behaviors/33-audit-pipeline.md
    - spec/behaviors/23-http.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/README.md

key-decisions:
  - "No `checkpoint:decision` in this plan; `_DECISIONS.md` has no row for 11-06"
  - "BEH-QD-339's example is a compiled `typescript` fence (the lost map-ledger adapter + `checkSignatureLedger`), not a `ts` listing; it compiles under `pnpm spec:examples`"
  - "ADR-QD-108's D-46-e row kept as history, with a 'Superseded by ADR-QD-118' note in the same cell (AGENTS.md §15)"

requirements-completed: [XC-02, XC-03]

coverage:
  - id: D1
    description: "ADR-QD-117 and ADR-QD-118 exist and are indexed; ADR-058's 'same semantics' gone; ADR-036/105/108 point at the new ADRs"
    requirement: XC-02
    verification:
      - kind: other
        ref: "Task 1 verify (greps + spec-revise --check)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Behaviours, invariants, traceability, CCR rows; BEH-QD-339 traced to SignatureLedgerConformance.test.ts"
    requirement: XC-02
    verification:
      - kind: other
        ref: "pnpm spec:verify:strict (21/21) + pnpm spec:examples (102 blocks)"
        status: pass
    human_judgment: false
  - id: D3
    description: "overview rows match the barrels"
    requirement: XC-03
    verification:
      - kind: other
        ref: "pnpm spec:api (869 exports, 9 packages)"
        status: pass
    human_judgment: false

completed: 2026-11-10
status: complete
---

# Phase 11 Plan 06: Record Phase 11 in the spec — Summary

**The spec now describes the code 11-01..11-05 shipped: two new ADRs, corrected behaviours and invariants, the
traceability rows, two CCR rows, and the overview rows that turn gate 13 green again.**

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | `93d9ded` | docs(11-06): record the keyed signature ledger and guardApi's access plan as ADR-QD-117 and ADR-QD-118 |
| 2 | `8e13556` | docs(11-06): bring the spec in line with the keyed ledger and the access plan; gate 13 green |

## Records written

| Document | Rev | What |
|----------|-----|------|
| `spec/decisions/117-a-signature-ledger-is-a-keyed-store.md` | 1.0 (new) | Ports the lost `110-…` body with ids rewritten, and adds "What moved on `main`": the port key now carries the requirement (INV-QD-043, ADR-QD-109), so `ledgerKeyOf` reads only the pair and the core fixture groups by the requirement-free projection. Decisions: refuse a non-string-id discharge (not store it subject-wide); keyed `append`/`entriesAt`; read rule derived once; conformance as data, no default instance |
| `spec/decisions/118-guardapi-plans-access-from-the-api-value.md` | 1.0 (new) | B1/B2/B4 and prefix probes; closed plan by group/endpoint value; middleware only looks up; `AccessNotDeclared` at build, precedence misplaced > unattached > undeclared; readers private; `Public` carries nothing. States the ARCH-36 residual and why (registration at layer build from the given value; `HttpApiBuilder` never tells the middleware which value it serves): SEC-06 = every served path is listed and enforced |
| ADR-QD-058 | 1.2 | `:93` "same semantics" clause replaced (signature `"Any"` = on file subject-wide, unlike `HasActed`'s any resource), plus an amendment section citing ADR-QD-117 |
| ADR-QD-105 | 1.1 | Amendment section: keyed store; a discharge on a resource without a string id is refused |
| ADR-QD-036 | 1.9 | The middleware paragraph looks up the plan (ADR-QD-118); a Rev 1.9 paragraph after Rev 1.8 |
| ADR-QD-108 | 1.1 | D-46-e row marked superseded by ADR-QD-118 (history kept) |
| `spec/decisions/index.yaml` | - | ADR-QD-117, ADR-QD-118 after ADR-QD-116 |
| `12-history.md` | 1.1 | BEH-QD-092: a signature's `"Any"` is narrower; a non-string-id discharge is refused |
| `33-audit-pipeline.md` | 1.17 | BEH-QD-256 refusal requirement; BEH-QD-326 keyed store, foreign-row refusal, `"Any"` reads subject-wide rows (its `typescript` fence unchanged and compiling); BEH-QD-339 new, with a fourth requirement (a shared table's foreign row is not a violation, the 11-05 `a21cb8a` behaviour) |
| `23-http.md` | 1.13 | BEH-QD-174 (build refusal), -180 (registry from the plan; new "every served path listed" requirement; the ARCH-36 residual stated), -320 (listing: `AccessDeclarationKey`, `MisplacedAccessDeclaration`, `AccessNotDeclared`, the three-member `ApiGuardRefusal`; readers private), -328 (value membership, precedence, three refusals), -335 (listing drops the member key; membership is the plan's). Ported from `2ea89d6` with `git apply` (applied clean), ids rewritten |
| `invariants.md` | 1.88 | INV-QD-120 (ported from `8900b7e`, law stated over the requirement-free projection); INV-QD-034 (Source = `planApi`; "500 rather than 403" restated as "never a 403", now a build failure; Enforcement names the build-time test); INV-QD-180 (one plan; ARCH-36 residual); INV-QD-243's Source drops `endpointMemberKey` |
| `traceability.md` | 1.133 | 23's module list gains `AccessPlan`; 33 gains BEH-QD-339 and the ledger modules; INV-034/120/180 rows; `accessPlan.test.ts` replaces `endpointAccess.test.ts`; rows for `SignatureLedger.tst.ts`, `SignatureLedgerConformance.test.ts`; 11-01/11-02 regression tests under BEH-QD-256/326/328; REQ-QD-034 gains BEH-QD-256, ADR-QD-117; ADR-QD-117/-118 rows |
| `overview.md` | 1.78 | audit: `SignatureLedgerKey`, `LedgerPair`, `ledgerKeyOf`, `SignatureLedgerReadError`, `checkSignatureLedger`, `checkSignatureHistoryScoping`, `LedgerConformanceViolation`, `LedgerConformanceOptions`; `SignatureLedger` row says keyed store. http: `endpointAccess`/`EndpointAccess`/`misplacedDeclarations` rows deleted; `AccessDeclarationKey` row from `GuardApi.ts`; `AccessNotDeclared` added; `ApiGuardRefusal` lists three; `guardApi` row describes the plan |
| `README.md` | 1.129 | CCR-QD-395, CCR-QD-396 after CCR-QD-394 |

`Public(declaration)`: no spec text described the plan's `Public` payload; ADR-QD-118 states it carries nothing.

## Reservations

| Reserved | Used |
|----------|------|
| ARCH-59 | yes (cited throughout) |
| ADR-QD-117, ADR-QD-118 | both |
| CCR-QD-395, CCR-QD-396 | both |
| BEH-QD-339 | yes |
| BEH-QD-340..348 | **unused** (no further behaviour stated) |
| INV-QD-246..249 | **unused** (folded into INV-QD-034/-120/-180, as the lost wave did) |

## Merged-id citations (for 11-07's lost-id sweep)

Word-diff of `spec/` since `eba22de` over the lost range finds only merged meanings:
- `spec/decisions/118-…md` ADR-QD-108 — the merged "a request is enforced once through one module" (amended by 118)
- `spec/decisions/118-…md` BEH-QD-335 — the merged "a request is enforced through one module"
- `spec/decisions/117-…md` ADR-QD-109 — the merged "a port's span is projected once" (signature query carries the requirement)
- `spec/decisions/index.yaml`, `spec/traceability.md`, `spec/README.md` ADR-QD-108 — the merged ADR (status line / ADR-QD-118 row / CCR-QD-396 row)
- `spec/README.md` BEH-QD-335, INV-QD-243 — the merged request-enforcement behaviour and invariant (CCR-QD-396 file list)
- `spec/invariants.md` INV-QD-243 — the merged invariant's own Change History mention
- `spec/behaviors/23-http.md` ARCH-46 — the merged ticket that centralised the member key

Lost ids that 11-01..05 text would have carried (ADR-QD-110, CCR-QD-389/384, BEH-QD-336, ARCH-49/52) were rewritten; the CCR rows cite the lost commits by hash, not by id.

## Gate results

- Task 1 verify (files, index entries, no "same semantics" in ADR-058, ADR-QD-118 in ADR-108, `spec-revise --check`): pass.
- Task 2 verify: the greps pass; `pnpm spec:api` 869 exports across 9 packages (gate 13 **green**); `pnpm spec:examples`
  102 blocks compile (BEH-QD-339's fence and BEH-QD-326's included); `pnpm spec:verify:strict` 21/21 PASS;
  `node scripts/spec-revise.mjs --check` clean. Also run: `pnpm spec:claims`, `pnpm spec:gates` pass.
- Mutation: not applicable (no source touched).

## Deviations from Plan

1. **[Rule 1] ADR-QD-058's own Change History entry first contained the phrase "same semantics"**, failing Task 1's
   `! grep -q "same semantics"`; reworded the history line ("Resource" keeps HasActed's meaning) before committing.
2. **[Rule 1] 23-http.md history prose first named `endpointMemberKey`**, failing Task 2's negative grep; reworded to
   "the endpoint member key (`"<group>/<endpoint>"`)". The identifier remains only in ADR-QD-108 (history row),
   ADR-QD-118 and README's CCR-QD-385/396 rows.
3. **[Rule 2] INV-QD-034's "500 rather than 403" paragraph and Enforcement were stale** (not named in the plan): an
   undeclared endpoint is now a build failure, so the paragraph says "never a 403" and the Enforcement names the
   build-time `http.test.ts` test, `GuardApi.test.ts` and `accessPlan.test.ts`.
4. ADR-QD-118 says the `Public` arm serves with `CurrentSubject = anonymous` (checked in `RequirePermissionMiddleware.ts`),
   not via `enforceSubject` as a first draft said.
5. Changesets are not touched here (11-07), so the CCR rows list no `.changeset/` file.

## Threat Flags

None new. T-11-17 mitigated (reserved numbers only; merged-id citations listed above for 11-07). T-11-19 mitigated
(ADR-058, BEH-QD-092/256/326 say a signature's "Any" is subject-wide).

## Notes for next plans

- 11-07: amend `.changeset/signature-capture-keyed-by-question.md` and `.changeset/endpoint-access.md`; add the
  `AccessNotDeclared` Breaking entry; if a changeset is added/renamed, CCR-QD-395/396's file lists may want it.
  The sweep list above is ready to copy.
