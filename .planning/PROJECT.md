# Qadi — Architecture Waves (current: v1.1 Arch Wave 6, ARCH-59 to ARCH-68)

## What This Is

Qadi is an Effect v4-native authorization library: a pnpm monorepo of `@qadi/core`,
`@qadi/http`, `@qadi/react`, `@qadi/audit`, `@qadi/promise`, `@qadi/testing`,
`@qadi/devtools`, `@qadi/predicate-sql` and `@qadi/predicate-prisma`. Milestone v1.0
(shipped 2026-11-09) was the fifth architecture-deepening wave. It resolved the nine findings
from the 2026-11-08 architecture review: one live logging defect and eight places where
knowledge about one concept was spread across several modules (poor locality) or where a
module was a shallow pass-through.

The review is at https://claude.ai/artifact/LH5dLGadz28NyzmZez9jcX, with a local copy at
`/tmp/claude-1002/-home-yopu-Project-Perso-qadi/588341bb-9f42-4e6e-b1a3-ed991ed47acf/scratchpad/qadi-architecture-review.html`.

## Current State

v1.0 Arch Wave 5 shipped 2026-11-09 on branch `arch-wave-5` (240 commits, 134 files, +7,660 / −1,815
outside `.planning`): ARCH-46 to ARCH-54, ADR-QD-108..116 (112, 113 and 115 left unused), CCR-QD-385..393.
All 9 phases verified `passed` against the final tree; the full `pnpm check` is green on Node 22.12.0
(CI run 42676403473 at 127d6fa). Archive: `.planning/milestones/v1.0-ROADMAP.md`.

## Current Milestone: v1.1 Arch Wave 6

**Goal:** Resolve the nine candidates of the 2026-11-10 architecture review, and recover the lost 2026-10-13 wave.

**The lost wave.** A second set of plans numbered ARCH-46…57 (2026-10-13 review; untracked until Phase 10 archived it to `.planning/milestones/archive-pre-gsd/architecture/`)
was implemented on `wave5/architecture-deepenings` and never merged. Its commits were recovered from the reflog on
2026-11-10 and pinned **locally** as `rescue/wave5-1013` (tip `950977f`), with `rescue/arch50-stash-a`/`-b` (superseded).
Its ids collide with merged #153, so it is ported under new numbers, never cherry-picked. Live defects and their
salvage sources: `.planning/phases/_SALVAGE.md`.

**Target features:** see `.planning/REQUIREMENTS.md` (REC, SEC, INT, GAP, AUD, DOCK, ROLE, KEY, SURF, VIEW, CACHE, XC).

**Review report (local, outside the repo):** `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261110-004912.html`.

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

- ✓ ARCH-53 Port serving from the registry (SERV-01..05): D-01 approved, so ADR-QD-094 is amended and every port description carries a serving facet (`PortServingFacet`, `PortServing.ts`); `servingFor` and `answerRemotely` derive admission from it, and a required port with a missing allowlist is refused (WR-01); `tabulatePorts` is two overloads over one body; `fixturePortsLayer` is derived from the registry; `mapPorts` removed (**Breaking**, shipped in 0.10.0) — Phase 8 (ADR-QD-114, CCR-QD-392, INV-QD-095 amended; 08-SECURITY.md 17/17 closed)

- ✓ ARCH-54 Sink record projection (SINK-01..03): `SinkEmit.ts` owns all three record projections (failed, decided, obligation), and `new ObligationRecord` is built only there and in the codec's decoder; the obligation record is projected once, before the handler runs (WR-01); the refusal vocabulary moved to the public leaf `JsonRefusal.ts`, and `SinkWire.ts` keeps only record-side words, so no port module imports the sink wire — Phase 9 (ADR-QD-116, ADR-QD-115 unused, CCR-QD-393)

### Active

(None. Every v1.0 requirement shipped. The next milestone defines new ones.)

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
  hand-written. (Revisited in v1.1 Phase 14: scripted, still not registry ports.)

## Context

- **Numbering reserved for v1.1 (Wave 6).** Next free on `1721a42`: ADR-QD-117, CCR-QD-395, BEH-QD-339, INV-QD-245.
  Executors grep `spec/` before using a number; an unused reservation is stated in the phase SUMMARY.

  | Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
  |---|---|---|---|---|---|
  | 10 | — | — | — | — | — |
  | 11 | 59 | 117–118 | 395–396 | 339–348 | 246–249 (245 is a lost-wave id; never use) |
  | 12 | 60 | 119–120 | 397–398 | 349–358 | 250–254 |
  | 13 | 61 | 121–125 | 399–403 | 359–378 | 255–264 |
  | 14 | 62 | 126 | 404 | 379–388 | 265–269 |
  | 15 | 63 | 127 | 405 | 389–398 | 270–274 |
  | 16 | 64 | 128 | 406 | 399–408 | 275–279 |
  | 17 | 65 | 129 | 407 | 409–418 | 280–284 |
  | 18 | 66 | 130 | 408 | 419–428 | 285–289 |
  | 19 | 67 | 131 | 409 | 429–438 | 290–294 |
  | 20 | 68 | 132 | 410 | 439–448 | 295–299 |

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

### Known Issues (carried forward from v1.0)

- CI: the Node 26 matrix leg exceeds the 60-minute `timeout-minutes` during mutation on a full
  `pnpm check` (seen at c807b64 and 127d6fa); release PRs will hit it.
- Devtools replay: the other four ports' `none` answers still grant under `not(...)` on a
  capture miss (INV-QD-007 fail-open); flipping each is one word in `Capture.ts`. Needs a decision.
- Open review findings, all warning or info: Phase 01 WR-02/WR-03/IN-03, Phase 02 IN-01..07,
  Phase 04 IN-01..03, Phase 05 WR-01/IN-01/IN-02, Phase 07 IN-01..03, Phase 09 IN-01
  (see each phase's `*-REVIEW-DISPOSITION.md` in the archive).
- `pnpm example` needs sudo on the Fedora dev host (`playwright install --with-deps`); use CI or
  the podman Ubuntu Playwright container route.
- Running vitest from inside a package directory fails at collection; run from the repo root
  with `--project`.

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
| Phase 8 amends ADR-QD-094 behind a human checkpoint | Serving facts belong to the port, but ADR-094 kept non-behavioral data out of descriptions | Accepted (Phase 8, D-01 approved, ADR-QD-114); 08-05 skipped |
| `AuthorizeRequest.ts` leaves the barrel; `authorizeRequest`/`AuthorizedRequest` re-exported by name from `GuardApi.ts` | Keeps the module package-private (ADR-QD-099) with no export added or removed | Accepted (Phase 1, ADR-QD-108) |
| Signature request key includes the requirement (meaning, signerRole) | A store receives the requirement and may filter on it, so the key must be injective over it (INV-QD-043) | Accepted (Phase 2) |
| Devtools replay fails closed on an unseen signature request | An empty list would let `not(hasSignature)` show an allow the real store might not give | Accepted (Phase 2, WR-04); the other four ports undecided |
| The archive writer refuses a sequence number the reader cannot decode (`SequenceNumberInvalid`), rather than scoping BEH-QD-254's agreement to safe integers | Scoping would have written writer/reader drift into the spec; refusing at the writer keeps the agreement true and closes the gap check's `2 ** 53` blind spot | Accepted (Phase 3, WR-01, D-48-g); widens the failure union, so `@qadi/audit` takes a minor |
| The per-entry decision lookup lives in `useGates`, memoised on the group atom, rather than using the group atom as each entry's identity | No `QadiAtoms` member returns entry atoms (widening it would break), and group-atom identity would re-register every sibling when one entry changes (BEH-QD-068) | Accepted (Phase 4, D-03, ADR-QD-111); D-07 pin found no re-creation, so no `Equal`-keyed memo was added |
| No ADR for ARCH-50; reserved ADR-QD-112 left unused | The refusal policy's documented owner is still core's `reportEncodeRefusal` (ADR-QD-095 D-09-e); the http module only frames and applies it per route | Accepted (Phase 5, CCR-QD-389) |
| `tabulatePorts` is two overloads over one body; the separate layer builder and `mapPorts` are removed | One enumeration of the five ports instead of pass-through copies; overload 1 is checked at every call site | Accepted (Phase 8, D-07); `mapPorts` removal is Breaking |
| `PortRouteAddress.ts` is a leaf module, not part of `PortRoutes.ts`; no ADR for ARCH-52 (ADR-QD-114 stays reserved for ARCH-53) | The browser-bundled client must not import server route code; no export changes and ADR-QD-107's route design is unchanged | Accepted (Phase 7, CCR-QD-391) |
| The refusal vocabulary lives in a new public leaf `JsonRefusal.ts`, not in `JsonHazard.ts` | The moved names are public and `JsonHazard.ts` is package-private (ADR-QD-099); a leaf keeps the port wire off the sink wire | Accepted (Phase 9, ADR-QD-116) |
| The obligation record is projected before the handler runs | A handler reassigning `resource.id` must not change the record it is logged under (WR-01) | Accepted (Phase 9, dafe9e1) |
| Audit doubles are scripted per call, outside core's port registry (D-05, ADR-QD-126); each audit store call gets a 5 s overridable `storeCallTimeout` (route A, `A interrupt remove`) | A store call that never settled held the decision and kept the breaker `Closed`; eleven hand-written failing layers restated the ports' error shapes, and core's closed registry is for the five evaluation ports | Accepted (Phase 14, ARCH-62, CCR-QD-404); removing `failWith`/`failStageWith`/`failCommitWith` is Breaking; the buffered sink (route C) is deferred |

---
*Last updated: 2026-11-10 — v1.1 Arch Wave 6 started*
