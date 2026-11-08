# Qadi — Architecture Wave 5 (ARCH-46 to ARCH-54)

## What This Is

Qadi is an Effect v4-native authorization library: a pnpm monorepo of `@qadi/core`,
`@qadi/http`, `@qadi/react`, `@qadi/audit`, `@qadi/promise`, `@qadi/testing`,
`@qadi/devtools`, `@qadi/predicate-sql` and `@qadi/predicate-prisma`. This milestone is the
fifth architecture-deepening wave. It resolves the nine findings from the 2026-11-08
architecture review: one live logging defect and eight places where knowledge about one
concept is spread across several modules (poor locality) or where a module is a shallow
pass-through.

The review is at https://claude.ai/artifact/LH5dLGadz28NyzmZez9jcX, with a local copy at
`/tmp/claude-1002/-home-yopu-Project-Perso-qadi/588341bb-9f42-4e6e-b1a3-ed991ed47acf/scratchpad/qadi-architecture-review.html`.

## Core Value

**An authorization decision is never wrong and never silent.** Each deepening must keep
evaluation fail-closed. It must also keep every denial, refusal and failure observable:
logged, counted or spanned.

## Requirements

### Validated

- ARCH-01 to ARCH-45 (waves 1–4, commits #140, #148, #150), ADR-QD-077 to ADR-QD-107.
- ✓ ARCH-46 HTTP request enforcement (ENF-01..06): every `@qadi/http` request path (guardRoute, port routes, RequirePermission middleware, decision-stream recheck) enforces and logs through the package-private `AuthorizeRequest.ts`; unguarded port routes now log `SubjectExtractionFailed` — Phase 1 (ADR-QD-108, CCR-QD-385, INV-QD-243, BEH-QD-335/336)
- ✓ ARCH-47 One port read (PORT-01..06): a port's span projection is stated once (`pose`/`disclose`) and every local and served read runs through `readPort` — Phase 2 (ADR-QD-109, CCR-QD-386, INV-QD-244)
- ✓ ARCH-48 Audit archive facts (ARC-01..04): the archive's order, claim, sequence break and sequence-number domain are stated once in the package-private `ArchiveFacts.ts`; `archiveAuditTrail` builds from them and `readAuditArchive` recomputes them; a whole-number-domain property proves the reader accepts every bundle the writer writes — Phase 3 (ADR-QD-110, CCR-QD-387; `@qadi/audit` minor: new `SequenceNumberInvalid`)
- ✓ ARCH-49 Gate instrumentation hook (GATE-01..05): `QadiProvider` resolves the gate writer once (`gateWriterFor` has one call site) and carries it on the package-private `GateScopeContext`; every gate kind's hook, `useGate` and `useQuestionsAs` included, is a thin caller of `useGates`; `usePolicies` is pinned not to re-create its group atom across equal re-renders — Phase 4 (ADR-QD-111, CCR-QD-388; `@qadi/react` patch)
- ✓ ARCH-50 Decision log over HTTP (LOGH-01..04): `/__decisions` and `/__decisions/backlog` encode and report refusals through one package-private `DecisionLogHttp.ts` (one `reportRefused` factory, per-route span and words); the backlog route no longer imports the stream route; one 12-cell table pins refusal in JSON, SSE backlog and SSE live — Phase 5 (no ADR, CCR-QD-389, BEH-QD-337; `@qadi/http` patch)
- ✓ ARCH-51 Dehydration in the engine (HYD-01..04): `HydrationEngine` exposes `dehydrateWith(entries, options)` beside `hydrateWith`, so both directions of the payload have one owner; `dehydrateEntry`/`dehydratedPayload` are private to the engine and the identity wrapper `resolveMismatchReporter` is deleted; a round-trip test drives both directions through the engine's interface — Phase 6 (ADR-QD-078 amended, ADR-QD-113 unused, CCR-QD-390, BEH-QD-146/INV-QD-022/INV-QD-045 restated; `@qadi/react` patch)
- ✓ ARCH-52 One port route address (ADDR-01..03): the default prefix `/__ports` and `portPath` live once in the package-private leaf `PortRouteAddress.ts`, used by both `portRoutes` and `remotePortsLayer`; the "decode the body whatever the status" reply contract is stated beside it; a round trip under `/x/ports` (guarded and unguarded) proves server and client agree, and `portPath` normalizes trailing slashes (WR-01) — Phase 7 (no ADR, CCR-QD-391, BEH-QD-338; `@qadi/http` patch)

### Active

See `.planning/REQUIREMENTS.md`. There is one requirement group per phase (ENF, PORT, ARC, GATE,
LOGH, HYD, ADDR, SERV, SINK), plus the cross-cutting group XC.

### Out of Scope

- Re-opening any ADR in 077–107 except ADR-QD-094, which Phase 8 amends under an explicit
  human checkpoint.
- Changing AGENTS.md budgets: UNTRACED_BUDGET, SWITCH_BUDGET, ANY_BUDGET, SCHEMA_ERROR_BUDGET,
  HAS_CUSTOM_BUDGET, DECISION_READ_BUDGET. Each needs a benchmark or an ADR. A phase that
  changes a budgeted count updates the table and the budget together, in the same plan.
- Formatting with `oxfmt` (AGENTS.md §17).
- Splitting the Port* family files that exist to break madge import cycles (ADR-QD-037), i.e.
  PortInterpreter, PortSpanDecode, PortSpanEncode and PortKey.
- The audit `*PortTest` doubles. Core's PortDoubles registry is closed, so they stay
  hand-written.

## Context

- **House rules:** `AGENTS.md` is authoritative. That means submodule namespace imports from
  `effect/*`, `.ts` relative imports, `Context.Service` with a separate `…Shape`, top-level
  layer consts, `Data.TaggedError`, `Effect.fn`, `Match` rather than `switch`, and no `as`, `!`
  or `any`.
- **Merge gate:** `pnpm check` and nothing else. During development, use `pnpm check:pr`,
  which skips mutation testing. A phase is done only when `pnpm check:pr` is green.
- **Spec is normative** (AGENTS.md §11). A change to public behavior updates in the same
  change: the behavior doc in `spec/behaviors/`, `spec/invariants.md`, `spec/traceability.md`,
  the Document history register and change history in `spec/README.md` (a CCR row), a new ADR
  in `spec/decisions/` plus `spec/decisions/index.yaml`, `spec/overview.md` (gate 13,
  `check-api-surface.mjs`) for any export that is added or removed, and a `.changeset/*.md`
  entry.
- **Numbering reserved for this wave.** The executor must confirm each number is still free
  by grepping `spec/` before using it:
  - ARCH ids: ARCH-46 (Phase 1) to ARCH-54 (Phase 9), in phase order.
  - ADR ids: ADR-QD-108 (Phase 1) to ADR-QD-116 (Phase 9), in phase order. A phase that
    turns out not to need an ADR (only a CCR) leaves its number unused and says so in its
    SUMMARY.
  - CCR ids: CCR-QD-385 (Phase 1) to CCR-QD-393 (Phase 9). The highest CCR in use on
    2026-11-08 is CCR-QD-384.
  - ADR Document IDs must equal the file number (`verify-traceability.sh`, gate 10).
- **Hot spots** (churn over the last 15 commits): react `QadiAtoms`/`Hydration`/`hooks`; http
  `RequirePermission`/`DecisionStreamRoute`; core `SinkCodec`/`Evaluate`/`PortAccess`.

## Constraints

- **Tech stack**: Effect v4 (`effect@4.1.2`), TypeScript with `verbatimModuleSyntax`, `@effect/vitest`.
- **Coverage**: `packages/core` at 95% or more, every other package at 90% or more, enforced.
- **Mutation**: Stryker runs only on release PRs. Plans must not lower the mutation score for
  touched files, so they add tests at the new seam before deleting the old ones.
- **Compatibility**: a removed public export is a breaking change. Record it in the changeset
  as **Breaking** (package-scoped) and in `apps/website/.../reference/upgrading.md` when a
  consumer-visible name moves.
- **Security**: fail-closed. Never `Effect.orDie` on evaluation or enforcement paths.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| One phase per review finding | Each finding is an independent deepening with its own ADR, CCR and changeset, matching ARCH-NN practice | Accepted |
| Phase 1 first | It is the only finding with a live defect (a missing `SubjectExtractionFailed` log) | Accepted; shipped (Phase 1) |
| Phase 8 amends ADR-QD-094 behind a human checkpoint | Serving facts belong to the port, but ADR-094 kept non-behavioral data out of descriptions | Pending human confirmation |
| `AuthorizeRequest.ts` leaves the barrel; `authorizeRequest`/`AuthorizedRequest` re-exported by name from `GuardApi.ts` | Keeps the module package-private (ADR-QD-099) with no export added or removed | Accepted (Phase 1, ADR-QD-108) |
| Signature request key includes the requirement (meaning, signerRole) | A store receives the requirement and may filter on it, so the key must be injective over it (INV-QD-043) | Accepted (Phase 2) |
| Devtools replay fails closed on an unseen signature request | An empty list would let `not(hasSignature)` show an allow the real store might not give | Accepted (Phase 2, WR-04); the other four ports undecided |
| The archive writer refuses a sequence number the reader cannot decode (`SequenceNumberInvalid`), rather than scoping BEH-QD-254's agreement to safe integers | Scoping would have written writer/reader drift into the spec; refusing at the writer keeps the agreement true and closes the gap check's `2 ** 53` blind spot | Accepted (Phase 3, WR-01, D-48-g); widens the failure union, so `@qadi/audit` takes a minor |
| The per-entry decision lookup lives in `useGates`, memoised on the group atom, rather than using the group atom as each entry's identity | No `QadiAtoms` member returns entry atoms (widening it would break), and group-atom identity would re-register every sibling when one entry changes (BEH-QD-068) | Accepted (Phase 4, D-03, ADR-QD-111); D-07 pin found no re-creation, so no `Equal`-keyed memo was added |
| No ADR for ARCH-50; reserved ADR-QD-112 left unused | The refusal policy's documented owner is still core's `reportEncodeRefusal` (ADR-QD-095 D-09-e); the http module only frames and applies it per route | Accepted (Phase 5, CCR-QD-389) |
| `PortRouteAddress.ts` is a leaf module, not part of `PortRoutes.ts`; no ADR for ARCH-52 (ADR-QD-114 stays reserved for ARCH-53) | The browser-bundled client must not import server route code; no export changes and ADR-QD-107's route design is unchanged | Accepted (Phase 7, CCR-QD-391) |

---
*Last updated: 2026-11-08 after Phase 7*
