---
phase: 11-lost-wave-security
plan: 07
subsystem: release-records
tags: [security, changesets, upgrading, lost-id-sweep, phase-gate, lost-wave-port]

requires: ["11-06"]
provides:
  - "Four changesets that state what Phase 11 changed against the published 0.11.0, Breaking where it is (D-04)"
  - "Three 0.12 entries in `upgrading.md`: undeclared endpoints refused at build, `guardApi` given the served value, non-string-id discharge refused"
  - "The lost-id sweep over every word Phase 11 added: ten pairs, all merged meanings (D-06)"
  - "`pnpm check:pr` green at the end of Phase 11 (XC-01)"
affects: [12-01]

actuals:
  tokens: 40000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .changeset/access-plan.md
    - .changeset/explain-signature-scope.md
    - .planning/phases/11-lost-wave-security/11-07-SUMMARY.md
  modified:
    - .changeset/signature-capture-keyed-by-question.md
    - .changeset/endpoint-access.md
    - apps/website/src/content/docs/docs/reference/upgrading.md

key-decisions:
  - "No `checkpoint:decision` in this plan; `_DECISIONS.md` has no row for 11-07"
  - "D-52-h / D-49-e (A, per D-02): names never published are amended in their pending changeset (the keyed ledger shape and conformance checks; the private readers dropped), not marked Breaking"
  - "Breaking against 0.11.0 only where 0.11.0 behaved otherwise: the non-string-id discharge (0.11.0 captured it and it was stored subject-wide) and the undeclared endpoint (0.11.0's `RequirePermissionLive` answered 500 per request)"
  - "`guardApi` and `ApiGuardRefusal` are themselves unpublished (pending `guarded-httpapi.md`), so `access-plan.md` states `ApiGuardRefusal`'s three members rather than calling the union's growth Breaking"

patterns-established: []

requirements-completed: [SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, XC-01, XC-02, XC-04, XC-05, XC-06]

coverage:
  - id: D1
    description: "Changesets and upgrade notes"
    requirement: XC-02
    verification:
      - kind: command
        ref: "Task 1 verify: greps + pnpm spec:website-examples (41 blocks) + pnpm spec:publish"
        status: pass
    human_judgment: false
  - id: D2
    description: "Lost-id sweep: every pair listed below"
    requirement: XC-02
    verification:
      - kind: command
        ref: "Task 2 verify: word-diff sweep vs this SUMMARY's list"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full PR gate"
    requirement: XC-01
    verification:
      - kind: command
        ref: "pnpm check:pr"
        status: pass
    human_judgment: false

completed: 2026-11-10
status: complete
---

# Phase 11 Plan 07: Changesets, the lost-id sweep and the phase gate — Summary

**Phase 11 is recorded for its consumers: four changesets and three upgrade entries say what changed against 0.11.0, no
lost-wave id was reused, and `pnpm check:pr` is green.**

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | `77bde66` | docs(11-07): changesets and upgrade notes for the keyed ledger and guardApi's access plan |
| 2 | (this SUMMARY, with the plan-complete commit) | docs(11-07): complete plan |

## Changesets

| Changeset | Bump | What |
|-----------|------|------|
| `signature-capture-keyed-by-question.md` (amended) | `@qadi/audit` minor | Keyed ledger (`append(key, entry)`, `entriesAt(key)`, `ledgerKeyOf`, `SignatureLedgerKey`, `LedgerPair`, `SignatureLedgerReadError`) and the conformance checks (`checkSignatureLedger`, `checkSignatureHistoryScoping`, `LedgerConformanceViolation`, `LedgerConformanceOptions`) folded into the pending text. New **Breaking** sentence: a discharge whose resource has no string id is refused with `SignatureCaptureError` before `capture` |
| `endpoint-access.md` (amended) | `@qadi/http` minor | Opening line: read once "by `guardApi`'s access plan, which both the middleware and the registry use". The misplaced bullet: `guardApi` fails to build. Added: only `AccessDeclarationKey`, `MisplacedAccessDeclaration`. Migration: "composes `guardApi`". No `endpointAccess`/`EndpointAccess`/`misplacedDeclarations`/`registerApi` remains |
| `access-plan.md` (new) | `@qadi/http` minor | **Breaking**: undeclared endpoint fails `guardApi`'s build with `AccessNotDeclared` (was 500 per request); an endpoint of any other `HttpApi` value, same names or a `prefix`ed copy, answers 500 with one log line; `ApiGuardRefusal`'s three members and precedence; migration with `Api.prefix` |
| `explain-signature-scope.md` (new) | `@qadi/core` patch | `explain()` "on file subject-wide, not for a resource"; `signatureHistoryFromSignatures` groups by the requirement-free pair |

Release these make: 0.12 (every package is 0.11.0; pending minors). `upgrading.md` gains three `## 0.12:` sections, linking
ADR-QD-118 and ADR-QD-117. Its one new fence is a `ts` listing (not compiled); `pnpm spec:website-examples` 41 blocks.

## Requirement → evidence (Phase 11)

| Req | Evidence |
|-----|----------|
| SEC-01 | 11-01 `5a9979a`: `signatureObligationHandler` refuses before `capture`; `SignatureCapturePort.test.ts` (3 resources), `SignatureLedger.test.ts` inverted test (RED `902142b`); BDD scenario (11-05 `b0d235a`) |
| SEC-02 | 11-01 `SignatureLoop.test.ts` doc-99 denies in both modes (RED `902142b`); 11-03 `bb9a689` keyed store, read rule once in `signatureHistoryFromLedger`, foreign/forged rows fail (RED `4aa4cfb`, foreign-row Allow probe) |
| SEC-03 | 11-05 `799964f`: `checkSignatureLedger`, `checkSignatureHistoryScoping`; `SignatureLedgerConformance.test.ts` (13 tests), capture-persists store passes |
| SEC-04 | 11-01 `469d90b` (`explain()`, concept page); 11-05 `214329b` (README, website); 11-06 ADR-QD-058 Rev 1.2, BEH-QD-092/256/326 |
| SEC-05 | 11-02 `1b6c685`: `planApi`, identity lookup, `AccessNotDeclared` at build; six-row `GuardApi.test.ts` (RED `8bfb81d`); 11-04 `99bfa88` readers private |
| SEC-06 | 11-02: `guardApi(P)` on `layer(P)` lists exactly `GET /v1/a`; mis-wired prefix answers 500 (`SamePrefixed`). **Stated limit:** under the mis-wired prefix the registry still lists `GET /a` (ARCH-36 accepted residual: registration is at layer build, `HttpApiBuilder` resolves the middleware per request); ADR-QD-118, BEH-QD-180, INV-QD-180 state it |
| XC-01 | `pnpm check:pr` exit 0 at the end of this plan (below) |
| XC-02 | ADR-QD-117, ADR-QD-118; CCR-QD-395, CCR-QD-396; BEH-QD-339 and the corrected BEH/INV; traceability (11-06); changesets (this plan) |
| XC-03 | 11-06: `pnpm spec:api` green (869 exports, 9 packages); green again inside `check:pr` |
| XC-04 | `git diff 5736c96 -- AGENTS.md scripts/check-house-style.mjs` empty; `pnpm lint` (house-style) green in `check:pr` |
| XC-05 | Coverage thresholds hold (`pnpm coverage` in `check:pr`). Mutation, phase base → after, no touched file fell: audit `SignatureCapturePort.ts` 88.0 → 91.43, `SignatureLedger.ts` 100 → 100, `SignatureLedgerTest.ts` 100 → 100, `SignatureLedgerConformance.ts` new 100; core `Explanation.ts` 98.67 → 98.67, `SignatureHistory.ts` 82.72 → 84.52, `Resource.ts` 100; http `GuardApi.ts` 84.8 → 100, `RequirePermissionMiddleware.ts` 96.8 → 100, `AuthorizeRequest.ts` 84.2 → 88.9, `PermissionRegistry.ts` 100 → 100, `RequirePermission.ts` 100 → 100, `AccessPlan.ts` new 100 (11-01..11-05, against `11-mutation-base-{core,http,audit}.json`). 11-07 touches no source |
| XC-06 | RED commits: 11-01 `902142b`, 11-02 `8bfb81d`, 11-03 `4aa4cfb` (each against unmodified `src/`); 11-05 `bdfefcf` RED for the missing module |

## Reservations

| Reserved | Used |
|----------|------|
| ARCH-59 | yes |
| ADR-QD-117, ADR-QD-118 | both |
| CCR-QD-395, CCR-QD-396 | both |
| BEH-QD-339 | yes |
| BEH-QD-340..348 | unused |
| INV-QD-246..249 | unused (folded into INV-QD-034/-120/-180) |

## Merged-id citations

Sweep: `git diff --word-diff=porcelain 5736c96 -- spec packages apps examples features .changeset stryker.audit.mjs stryker.http.mjs`,
added segments, full lost range. Ten pairs, every one a citation of the id's merged meaning; none is a lost meaning reused.

- `spec/behaviors/23-http.md` ARCH-46 — the merged wave-5 ticket that centralised the endpoint member key (HTTP request enforcement)
- `spec/decisions/117-a-signature-ledger-is-a-keyed-store.md` ADR-QD-109 — the merged "a port's span is projected once" (the signature query carries the requirement as optional context)
- `spec/decisions/118-guardapi-plans-access-from-the-api-value.md` ADR-QD-108 — the merged "a request is enforced once through one module", which ADR-QD-118 amends (D-46-e)
- `spec/decisions/118-guardapi-plans-access-from-the-api-value.md` BEH-QD-335 — the merged request-enforcement behaviour whose listing drops the member key
- `spec/decisions/index.yaml` ADR-QD-108 — ADR-QD-118's status line, "amends ADR-QD-036, ADR-QD-108" (merged)
- `spec/invariants.md` INV-QD-243 — the merged request-enforcement invariant's Source and Change History mention
- `spec/README.md` ADR-QD-108 — CCR-QD-396's file list (ADR-QD-108 Rev 1.1, D-46-e superseded)
- `spec/README.md` BEH-QD-335 — CCR-QD-396's file list (the merged behaviour in `23-http.md`)
- `spec/README.md` INV-QD-243 — CCR-QD-396's file list (the merged invariant's Source)
- `spec/traceability.md` ADR-QD-108 — ADR-QD-118's row, "amends ADR-QD-036, ADR-QD-108"

The changesets this plan wrote cite only BEH-QD-320 and no lost-range id; `upgrading.md` cites ADR-QD-117/-118.

## Gate results

- Task 1 verify: greps pass; `pnpm spec:website-examples` 41 blocks compile; `pnpm spec:publish` 9 packages and 6 documents
  agree on 0.11.0. Pass.
- Task 2 verify: sweep list equals this SUMMARY's list; `git diff 5736c96 -- AGENTS.md scripts/check-house-style.mjs`
  empty; `pnpm check:pr` exit 0 from a clean tree at `77bde66`: 16 of 17 steps, mutation skipped by design. Lint and
  house-style, circular (none), tstyche 168/168, coverage 4091/4091 in 159 files (thresholds held), BDD 562/562,
  `spec:examples`, `spec:verify:strict` 21/21, `spec:gates`, `spec:claims`, `spec:api`, `spec:package`, the Next.js
  example (42 unit, 30 e2e), `spec:website-examples`, the website build (45 pages), `spec:publish`. Pass.

## Deviations from Plan

1. **`endpoint-access.md` also lost its `registerApi` clauses.** The plan named the opening line and the Added bullet.
   The misplaced bullet said `registerApi` fails and gave its layer type, and the migration line named `registerApi`,
   which the pending `guarded-httpapi.md` removes in the same release. Both now name `guardApi`, so the combined 0.12
   notes no longer describe a removed function.
2. **The foreign-value bullet is not called Breaking against 0.11.0 on its own.** `guardApi` is unpublished (added by
   `guarded-httpapi.md`), so 0.11.0 had no membership rule to break; the bullet sits under the changeset's Breaking
   header, and `upgrading.md` gives it its own migration entry, as the plan asks.

## Threat Flags

None new. T-11-17 mitigated: the sweep found only merged meanings. T-11-18 mitigated: both refusals are marked Breaking in
their changesets and have `upgrading.md` entries.

## Notes for next phases

- Phase 12 starts from this plan's last commit; its phase base is that commit.
- The pending changesets now hold every Phase 11 change; a later phase that touches `guardApi` or the ledger amends
  `access-plan.md` or `signature-capture-keyed-by-question.md` rather than adding another.
