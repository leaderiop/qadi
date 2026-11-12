# Qadi — Architecture Waves (current: v1.3 Arch Wave 8, from ARCH-78)

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

v1.2 Arch Wave 7 completed 2026-11-12 on branch `arch-wave-7` (272 commits, 170 files, +9,900 / −3,457
outside `.planning`): ARCH-69 to ARCH-77, ADR-QD-133..140 (136, 138, 139 and 141 unused), CCR-QD-411..419.
All 9 phases `passed`. The milestone audit is `tech_debt`, accepted by the user: 44/44 requirements, 25 open
info-level review findings and one skipped warning. `pnpm check:pr` exited 0 at the end of every phase. **Not
merged and not released.** Archive: `.planning/milestones/v1.2-ROADMAP.md`, `v1.2-REQUIREMENTS.md`,
`v1.2-MILESTONE-AUDIT.md`.

v1.1 Arch Wave 6 (ARCH-59 to ARCH-68) is merged to `main` as #155. It was never archived as a GSD milestone,
so its phases 10–20 are still in `.planning/phases/`, and its requirements are in git at `965ff14c:.planning/REQUIREMENTS.md`.

v1.0 Arch Wave 5 shipped 2026-11-09 on branch `arch-wave-5` (240 commits, 134 files, +7,660 / −1,815
outside `.planning`): ARCH-46 to ARCH-54, ADR-QD-108..116 (112, 113 and 115 left unused), CCR-QD-385..393.
All 9 phases verified `passed` against the final tree; the full `pnpm check` is green on Node 22.12.0
(CI run 42676403473 at 127d6fa). Archive: `.planning/milestones/v1.0-ROADMAP.md`.

## Current Milestone: v1.3 Arch Wave 8

**Goal:** Resolve all six candidates of the 2026-11-12 architecture review and clear
the v1.2 spec debt (Phases 30–36, from ARCH-78).

**Base commit:** `aab87576` (v1.2 merged as #156). **Shared rules:** `.planning/phases/_SHARED-CONTEXT.md`, overridden where
stated by `.planning/phases/_WAVE8-CONTEXT.md` (base, numbering, per-phase evidence from the review).

**Target features:**
- One strict-decode module (parse → depth guard → strict decode → closed refusal) for every untrusted JSON seam; each seam keeps only its error mapping (review 1)
- Diagnostics as the dock model's seventh store: the poll runs in the model's scope, the reading merge leaves the view (review 2, completes ARCH-74)
- `SharedComputation.reset` supersedes its claims; `DecisionCache`'s generation counter goes (review 3, extends ADR-QD-132)
- `EvaluateOptions`/`EvaluationServices` declared once in a leaf; `LifecycleOptions` deleted (review 4)
- The atom set owns its eviction sweep, so the limit holds without a provider (review 5, speculative: opens on a mechanism spike)
- One sealed evaluation layer in core shared by `@qadi/testing` and devtools' Simulation (review 6)
- Carried spec debt: duplicate BEH-QD-219..221, `Sources.ts` in traceability, selected open info findings, and the stale
  "replay fail-open undecided" known issue (already closed in v1.1 by ADR-QD-129 / CCR-QD-407: a replay miss is an outage on every port)

**Review report (local, outside the repo):** `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261112-022336.html`.

## Previous Milestone: v1.2 Arch Wave 7 (completed 2026-11-12; not released)

**Goal:** Resolve the eight candidates and three footnotes of the 2026-11-11 architecture review (Phases 21–29, ARCH-69…77).

**Base commit:** `965ff14c` (v1.1 merged as #155). **Shared rules:** `.planning/phases/_SHARED-CONTEXT.md`, overridden where
stated by `.planning/phases/_WAVE7-CONTEXT.md` (base, numbering, evidence, and the correction to the review's candidate 1: port
keys are read by devtools replay and test doubles, not by evaluation).

**Target features:** see `.planning/milestones/v1.2-REQUIREMENTS.md` (PREQ, SCOPE, SREC, SRC, SIM, DMOD, ROUTE, GATE, TIDY, WX).

**Numbering reserved for v1.2:** the table in `.planning/phases/_WAVE7-CONTEXT.md` (ADR-QD-133–141, CCR-QD-411–419,
BEH-QD-440–484, INV-QD-286–303, ARCH-69–77).

**Review report (local, outside the repo):** `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261111-011702.html`.

<details>
<summary>v1.1 Arch Wave 6 (all phases complete 2026-11-10; merged as #155; not released)</summary>


**Goal:** Resolve the nine candidates of the 2026-11-10 architecture review, and recover the lost 2026-10-13 wave.

**The lost wave.** A second set of plans numbered ARCH-46…57 (2026-10-13 review; untracked until Phase 10 archived it to `.planning/milestones/archive-pre-gsd/architecture/`)
was implemented on `wave5/architecture-deepenings` and never merged. Its commits were recovered from the reflog on
2026-11-10 and pinned **locally** as `rescue/wave5-1013` (tip `950977f`), with `rescue/arch50-stash-a`/`-b` (superseded).
Its ids collide with merged #153, so it is ported under new numbers, never cherry-picked. Live defects and their
salvage sources: `.planning/phases/_SALVAGE.md`.

**Target features:** see `965ff14c:.planning/REQUIREMENTS.md` in git (REC, SEC, INT, GAP, AUD, DOCK, ROLE, KEY, SURF, VIEW, CACHE, XC).

**Review report (local, outside the repo):** `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261110-004912.html`.

</details>

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

- ✓ ARCH-69 Port request derived from its description (PREQ-01..05): four ports derive their request `key` and `defect` from the wire question (`makePortDescription`); the wire and span questions are exhaustive by type, so a dropped member is a compile error; CustomPredicate keeps its own `key`/`defect`; a property law ties each derived key to `canonicalKey` of its wire question — Phase 21 (ADR-QD-133, ADR-QD-094 and ADR-QD-107 amended, CCR-QD-411, BEH-QD-440/441, INV-QD-286)
- ✓ ARCH-70 One scoped port read (SCOPE-01..05): each port description states once, as `asks`, the request every policy leaf puts to it; the reads and `servingFor` derive from it (`ServedLeaves` and the facet's `leaves` removed, `LeafRequests`/`ReadSite`/`LeafOf`/`AskedOf` added); the three resource-scoped reads go through one `readScoped`, and a missing resource id leaves only the port span (`requireResourceId` deleted); every read takes its policy leaf — Phase 22 (ADR-QD-134, CCR-QD-412, BEH-QD-445/446, INV-QD-288/289; `@qadi/core` minor, `PortDescription` change marked Breaking)
- ✓ ARCH-71 Sink record fields stated once (SREC-01..05): each record's fields are one `Schema.Struct` in the package-private `SinkRecordFields.ts`; the record class is a `Data.TaggedClass` typed by it and the v2 wire struct spreads it; absent keys stay absent, wire byte-identical — Phase 23 (ADR-QD-135, ADR-QD-095 amended, CCR-QD-413, BEH-QD-450/451, INV-QD-290; `@qadi/core` patch)
- ✓ ARCH-72 Simulation source preparation (SRC-01..03): `prepareSource(choice, { ports, capture })` in `SimulationSource.ts` owns availability, refusal and the Live capture from one table closed over `SourceChoice`; the session branches only on `Ready`/`Refused` (`resolveSource`, `sourceOptions`, `ResolvedSource` removed, package-private) — Phase 24 (ADR-QD-050 Rev 1.4 amended, CCR-QD-414, BEH-QD-455; `@qadi/devtools` patch)
- ✓ ARCH-73 Session-only Simulator (SIM-01..05): `Simulator` is a view of its session (`OwnedSimulator` and the `sightings` prop removed); `setAction`, `choosePolicyAt`, `policyMenu`, `cost`, `baselineReading` and `Ran.reading` live in the session; `makeSimulationSession` is an `Effect.fn` in a `Scope` that owns its runs through a `FiberHandle`, `supersede()` interrupts a replaced run, and `reap`/`hasRetired`/`dispose` are gone; React owns the scope through the package-private `useScoped` — Phase 25 (ADR-QD-137 supersedes ARCH-20 D-20-b, ADR-QD-047 Rev 1.11, CCR-QD-415, BEH-QD-460/461; `@qadi/devtools` minor)
- ✓ ARCH-74 Headless dock model (DMOD-01..05): the dock's six stores and the rules between them live in the package-private scoped `makeDockModel` (one rail push per timeline or catalogue change, per-field identity `configure`, the source read through its own `FiberHandle`); React owns one model through `useDockModel` and the four owned hooks are gone; both sessions embed one `makeHeldChoice` cell, `PolicyChoice` is `Empty | Listed | Evicted | Seeded` and `HeldChoice` is public; 13 DOM duplicates moved to headless model tests — Phase 26 (ADR-QD-047 Rev 1.12, CCR-QD-416, BEH-QD-465/466, INV-QD-296; `@qadi/devtools` patch)
- ✓ ARCH-75 Bare-route module (ROUTE-01..03): `addGuardedRoute` is written once in `GuardRoute.ts` (`guardRoute`/`buildGuardedRoute` removed); its typing rule (the handler's `CurrentSubject` discharged, the loader's not, no "Error" marker) and method agreement are pinned on the public function in `GuardRoute.tst.ts`; `RouteMethod` is stated once in the package-private `UnguardedRoute.ts`; `PermissionRegistry.ts` holds only the registry and `/__permissions` moved to `PermissionRegistryRoute.ts`; export names unchanged, no import cycle — Phase 27 (ADR-QD-036 Rev 1.10 amended, CCR-QD-417, BEH-QD-470; `@qadi/http` patch)
- ✓ ARCH-76 Gate registry dependency (GATE-01..04): outcome A (the human's, from `_DECISIONS-v1.2.md`): `GateWriter.ts` is the React-free write side, a leaf below the registry with type-only imports, holding a pure `reconcile` tested against a fake writer without rendering; the hooks moved to `useGate.ts` above `QadiAtoms` and `GateAtoms` is `Pick<QadiAtoms, "decision" | "decisions">`; the test-only `useGateRegistration` is gone (its seven cases run on `useGateRegistrations`); public surface unchanged, no cycle — Phase 28 (ADR-QD-140 amends ADR-QD-111 and ADR-QD-080, CCR-QD-418; `@qadi/react` patch)
- ✓ ARCH-77 Small restated facts (TIDY-01..03): a port's name and span are stated once in the import-free `PortName.ts` (one five-row table; `PortName`, `PortSpanName` and the new `PortSpanOf<N>` read from it; metrics untouched), and `PortDescription.span` is `PortSpanOf<N>`, so a description can name only its own port's span; `HydrationEngine.ts` states each entry's withheld fields once (`ALLOW_WITHHELD`/`DENY_WITHHELD`); `FAILURE_IS_NOT_A_DENIAL` in devtools' `model/Verdict.ts` serves the Inspector and the Simulator — Phase 29 (ADR-QD-094 and ADR-QD-123 amended, CCR-QD-419, ADR-QD-141 unused; `@qadi/core` minor, `@qadi/react` and `@qadi/devtools` patch)
- ✓ ARCH-78 One strict decode module (DEC-01..08): `UntrustedDecode.ts` is the one way to strict-decode untrusted JSON (parse, depth guard, an optional seam `prepare`, strict decode; closed `NotJson | TooDeep | Malformed`), and the nine seams (`Policy.fromJson`/`fromJsonValue`, `SinkCodec`, the three port-wire decoders, `PortRemote`, hydration, the audit archive and row) keep only an exhaustive refusal mapping; `unwalked` replaces the hand-built partial-walk copies; `PolicyFromJson` removed, `UNTRUSTED_DECODE_OPTIONS`/`exceedsJsonDepth` off the surface, `PolicyNotJson`, `PayloadTooDeep` and `ArchiveRefusal.TooDeep` added (all **Breaking**); `[untrusted-decode]` budgets strict decode and `JSON.parse` outside the leaf both ways — Phase 30 (ADR-QD-143, ADR-QD-002/096/107 amended, CCR-QD-421, BEH-QD-486..489, INV-QD-305/306; `@qadi/core`, `@qadi/react`, `@qadi/audit` minor, `@qadi/devtools` patch)
- ✓ ARCH-79 A reset supersedes its claims (SUPR-01..05): `SharedComputation` owns its staleness rule — each in-flight claim carries a closed `standing: "Live" | "Superseded" | "Abandoned"`, `reset` supersedes every in-flight claim in one synchronous step, and only a Live claim's exit reaches the adapter through the new `settle(key, exit)` hook (replacing `claim`); a superseded claim still answers every waiter and is still interrupted when its last waiter leaves; `DecisionCache` keeps no generation counter (`clear` empties the map and calls `shared.reset()`); four clear-mid-compute races (RED first) and a model-based property (seed 3101, 300 runs) pin it, `DecisionCache.test.ts` unchanged; no public API change — Phase 31 (ADR-QD-132 amended, CCR-QD-422, BEH-QD-491, INV-QD-307, ADR-QD-144 unused; `@qadi/core` patch)
- ✓ ARCH-80 Evaluation options and services stated once (EOPT-01..04): `EvaluateOptions` is declared once, beside `QuestionOptions` in `Question.ts`; `EvaluationServices` and `StandingEvaluationServices` live in a new type-only leaf `EvaluationServices.ts`; `Evaluate.ts` declares only `evaluate`, with no re-export; `Lifecycle.ts` deleted its restated `LifecycleOptions` — `decideQuestion` takes `Omit<EvaluateOptions, keyof QuestionOptions>` and `ask` requires `EvaluationServices` by name. Public names and shapes unchanged, proven by a barrel tstyche pin committed on the phase base and kept byte-identical; mutation scores unchanged; `@qadi/core` patch changeset; CCR-QD-423 — v1.3 Phase 32

### Active

v1.3 Arch Wave 8: see `.planning/REQUIREMENTS.md` (one category per phase, 30–36).

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

### Known Issues (carried forward from v1.2)

- The tech debt the v1.2 audit accepted is listed in `.planning/milestones/v1.2-MILESTONE-AUDIT.md`. Its main items:
  - 25 open info-level review findings across Phases 24–29;
  - Phase 25 WR-01 skipped (unreachable while `simulate` goes through `DecisionCache`);
  - `signatureHistoryFromSignatures` dies, rather than failing typed, on an untyped query with an unkeyable subject;
  - devtools `Inspector.tsx` (0.68) and `Simulator.tsx` (0.54) mutation scores are below the 80 break threshold;
  - `useSimulationSession` stays a public second entry point (design to confirm);
  - two Phase 24 spec items were acknowledged at close (the duplicate BEH-QD-219..221 blocks, and `Sources.ts` in traceability).
- `astro check` (gate 15, `pnpm website`) shows an interactive `@astrojs/check` install prompt, so `pnpm check:pr` must run with
  stdin closed (`< /dev/null`), which makes the website typecheck effectively skipped.
- `scripts/spec-revise.mjs` drops its document argument when `--date` is omitted; always pass `--date`.

### Known Issues (carried forward from v1.0)

- CI: the Node 26 matrix leg exceeds the 60-minute `timeout-minutes` during mutation on a full
  `pnpm check` (seen at c807b64 and 127d6fa); release PRs will hit it.
- ~~Devtools replay fail-open on four ports~~: closed in v1.1 (ADR-QD-129, CCR-QD-407); this line was stale until 2026-11-12.
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
| Devtools replay fails closed on an unseen signature request | An empty list would let `not(hasSignature)` show an allow the real store might not give | Accepted (Phase 2, WR-04); the other four ports closed in v1.1 (ADR-QD-129, CCR-QD-407) |
| The archive writer refuses a sequence number the reader cannot decode (`SequenceNumberInvalid`), rather than scoping BEH-QD-254's agreement to safe integers | Scoping would have written writer/reader drift into the spec; refusing at the writer keeps the agreement true and closes the gap check's `2 ** 53` blind spot | Accepted (Phase 3, WR-01, D-48-g); widens the failure union, so `@qadi/audit` takes a minor |
| The per-entry decision lookup lives in `useGates`, memoised on the group atom, rather than using the group atom as each entry's identity | No `QadiAtoms` member returns entry atoms (widening it would break), and group-atom identity would re-register every sibling when one entry changes (BEH-QD-068) | Accepted (Phase 4, D-03, ADR-QD-111); D-07 pin found no re-creation, so no `Equal`-keyed memo was added |
| No ADR for ARCH-50; reserved ADR-QD-112 left unused | The refusal policy's documented owner is still core's `reportEncodeRefusal` (ADR-QD-095 D-09-e); the http module only frames and applies it per route | Accepted (Phase 5, CCR-QD-389) |
| `tabulatePorts` is two overloads over one body; the separate layer builder and `mapPorts` are removed | One enumeration of the five ports instead of pass-through copies; overload 1 is checked at every call site | Accepted (Phase 8, D-07); `mapPorts` removal is Breaking |
| `PortRouteAddress.ts` is a leaf module, not part of `PortRoutes.ts`; no ADR for ARCH-52 (ADR-QD-114 stays reserved for ARCH-53) | The browser-bundled client must not import server route code; no export changes and ADR-QD-107's route design is unchanged | Accepted (Phase 7, CCR-QD-391) |
| The refusal vocabulary lives in a new public leaf `JsonRefusal.ts`, not in `JsonHazard.ts` | The moved names are public and `JsonHazard.ts` is package-private (ADR-QD-099); a leaf keeps the port wire off the sink wire | Accepted (Phase 9, ADR-QD-116) |
| The obligation record is projected before the handler runs | A handler reassigning `resource.id` must not change the record it is logged under (WR-01) | Accepted (Phase 9, dafe9e1) |
| Audit doubles are scripted per call, outside core's port registry (D-05, ADR-QD-126); each audit store call gets a 5 s overridable `storeCallTimeout` (route A, `A interrupt remove`) | A store call that never settled held the decision and kept the breaker `Closed`; eleven hand-written failing layers restated the ports' error shapes, and core's closed registry is for the five evaluation ports | Accepted (Phase 14, ARCH-62, CCR-QD-404); removing `failWith`/`failStageWith`/`failCommitWith` is Breaking; the buffered sink (route C) is deferred |
| The leaf→request mapping is stated once, on each port description (`asks`), not in the reads and the serving facet separately (D-05, `state once`) | The human overrode the planner's decision: "the recommendation should be the cleanest solution, not the simplest one"; two statements could disagree | Accepted (Phase 22, ADR-QD-134); `ServedLeaves` removed (public); review WR-01 fixed: one shared scope test (`ScopedLeaf.ts`) plus a law test (23e54421) |
| A missing resource id leaves only the port span on every scoped port (D-02 = `A`) | One trace shape, whichever copy of the check ran; the nested `qadi.requireScopedResourceId` span is gone | Accepted (Phase 22, ADR-QD-134) |
| A sink record's fields are one `Schema.Struct`; the class is a `Data.TaggedClass` typed by it, keys absent (23-01 = A/absent) | One field list instead of four; `Schema.TaggedClass` measured 5.3x to 140x per record on the evaluation path | Accepted (Phase 23, ADR-QD-135); small-record encode 5 to 10 percent slower, inherent to the spread |
| Source availability moved into `SimulationSource.ts` as an amendment to ADR-QD-050, not a new ADR (ADR-QD-136 unused) | The rule moved; no new decision was made | Accepted (Phase 24, CCR-QD-414) |
| A run reads its generation before its last teardown yield and returns if a command moved the session (review WR-01) | A ports change or replay during a superseded Live run's teardown must not start the waiting run with the old environment's capture | Accepted (Phase 24, 1ad24867); the replayed policy is held with its row (6c198da1) so `SimulationSession.ts` stays above its mutation base |
| A devtools session owns its runs through a `FiberHandle` in a `Scope` (25-01 = D, from `_DECISIONS-v1.2.md`) | A host that never forked `reap` left runs querying live resolvers; the scope's close and `supersede()` interrupt through one handle | Accepted (Phase 25, ADR-QD-137, supersedes ARCH-20 D-20-b); `SimulationSession.ts` mutation 0.9641 to 0.9694 |
| `useScoped` clears its value on cleanup and closes the scope when the build throws (review WR-02, WR-03) | A hidden `<Activity>` kept a child reading a closed session; a throwing build leaked its scope | Accepted (Phase 25, 0a6872c6, df588d1a); WR-01 (synchronous-settle race) skipped: no run lands synchronously while `simulate` goes through `DecisionCache` |
| The dock is one headless model (`makeDockModel` in a `Scope`), owned by React through one hook (Phase 26, ARCH-74) | Cross-store rules were reachable only by rendering six hooks and their layout effects; the model states them once, under the model's coverage and mutation bar | Accepted (Phase 26, ADR-QD-047 Rev 1.12); `DockModel.ts` mutation 100; a hidden `<Activity>` rebuilds the model (pause returns to live, backlog re-read), accepted per 26-UI-SPEC |
| `PolicyChoice` keeps `HeldChoice`'s arms by use, not a standalone type assertion (26-03) | `noUnusedLocals` rejects an unused assertion constant; `policyChoice` returning `chosen.resolve()` as a `PolicyChoice` already makes a new arm a compile error | Accepted (Phase 26, verifier and code review concurred) |
| `unguardedRoutes` and `RouteMethod` stay in a package-private sibling; `/__permissions` moves to `PermissionRegistryRoute.ts` (27-CONTEXT D-02, D-03) | One module holding all three would export the unguarded internals through the barrel (ADR-QD-099); keeping `/__permissions` in `PermissionRegistry.ts` closes an import cycle (ADR-QD-037) | Accepted (Phase 27, CCR-QD-417, ADR-QD-036 Rev 1.10); ROUTE-01/ROUTE-03 annotated in REQUIREMENTS.md as delivered by intent |
| A phase that deletes duplicated code keeps the aggregate mutation bar by killing the survivors the baseline already had (27-03) | Removing code shrank the mutant total by one while two known survivors stayed, so the aggregate dipped below base with every file at or above its own | Accepted (Phase 27, 010d9f1e: two span-name tests); `AuthorizeRequest.ts` 0.9 to 1.0, aggregate 137/139 to 138/138 |
| The gate write side is a React-free leaf below the registry; the hooks sit above the atom set (28-01 = A, from `_DECISIONS-v1.2.md`) | The reconcile rules were reachable only through `renderHook`; the review's uncorrected A (types into `GateRegistry.ts`) would publish `gateWriterFor` or close a cycle | Accepted (Phase 28, ADR-QD-140); GATE-03 annotated (types in the leaf, re-exported by the registry); mutation aggregate 0.8239 → 0.8502 |
| A survivor that surfaces in an untouched file after a split is killed with a test, not re-baselined (28-05) | Moving tests between `GateWriter.ts` and `useGate.ts` exposed a real `GateRegistry.ts` survivor (a stale handle's `update` after a same-id re-registration) | Accepted (Phase 28, 8fbd9f58) |
| A port's span union is derived from a leaf table, not from the descriptions (29-CONTEXT D-02) | Each annotated description's `span` type is the whole union, and the leaf cannot import descriptions without a cycle; the inverse derivation also narrows `span` to `PortSpanOf<N>` | Accepted (Phase 29, ADR-QD-094 amendment, CCR-QD-419); TIDY-01 annotated as delivered by the inverse derivation |
| Moving per-call literals to module-scope constants can lower a file's mutation score with nothing worse; close it with a test (29-03) | `ignoreStatic` drops the moved lists' killed mutants while survivors stay (`HydrationEngine.ts` 0.9619 → 0.9605) | Accepted (Phase 29, 94841eb0: a nameless payload with entries is refused whole); 0.9619 → 0.9693 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-12 after Phase 32*
