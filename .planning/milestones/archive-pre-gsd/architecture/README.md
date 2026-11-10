> **Superseded 2026-11-10.** This tracker is history, not status.
>
> - Waves 1–4 (ARCH-01…45) were merged in #140, #148 and #150. Their plans here are the only record of those
>   decisions, and `.planning/PROJECT.md`'s "Validated" list cites them.
> - The 2026-10-13 wave below (ARCH-46…57) was implemented on `wave5/architecture-deepenings` and **never merged**.
>   Its ids collide with the merged 2026-11-08 wave (#153), which reused ARCH-46…54 for different work, so a lost
>   plan's id says nothing about what is on `main`.
> - The lost commits were recovered on 2026-11-10 and pinned as **local-only** branches, not pushed until Phases
>   11–13 merge (D-04): `rescue/wave5-1013` (`950977f`), `rescue/arch50-stash-a` (`4b4c439`),
>   `rescue/arch50-stash-b` (`fc35d5e`). Phase 13 asks whether to delete them.
> - What is still live, and where it goes: [`.planning/phases/_SALVAGE.md`](../../../phases/_SALVAGE.md).
>
> Each lost plan's frontmatter `status:` and `disposition:` say the same as this table; its body is unchanged history.

| Lost plan | Status | Where it went |
|---|---|---|
| [ARCH-46](ARCH-46-port-read-module.md) | superseded-by-phase-13 | T1 fixed on main by merged ARCH-47 readPort (e0365e0); T2's PortMetrics.ts block → Phase 13 (GAP-11); T4–T9 out of scope (bench NO-GO); partial work on rescue 903be15 |
| [ARCH-47](ARCH-47-edge-step-owns-the-request.md) | superseded-by-phase-13 | T1/T2 fixed on main by merged ARCH-46 ENF-03 (e0365e0); public-endpoint denial log → Phase 13 (GAP-01) from b0b9363 |
| [ARCH-48](ARCH-48-simulation-fixture-fields.md) | superseded-by-phase-13 | Phase 13 (GAP-02…GAP-04) from 950977f |
| [ARCH-49](ARCH-49-guardapi-access-plan.md) | superseded-by-phase-11 | Phase 11 (ARCH-59; SEC-05, SEC-06) from 2ea89d6 |
| [ARCH-50](ARCH-50-explorer-session.md) | fixed-on-main (1721a42) | superseded by merged ARCH-58 (#154); rescue/arch50-stash-a/-b not salvaged |
| [ARCH-51](ARCH-51-leaf-needs-table.md) | superseded-by-phase-13 | T1 obsolete (merged ARCH-53, e0365e0); T2 test and T3 doc fix → Phase 13 (GAP-07, GAP-11); full LeafNeeds.ts out of scope (9cf0e5f) |
| [ARCH-52](ARCH-52-signature-ledger-read-seam.md) | superseded-by-phase-11 | Phase 11 (ARCH-59; SEC-01…SEC-04) from 8900b7e |
| [ARCH-53](ARCH-53-hydration-event.md) | superseded-by-phase-12 | Phase 12 (ARCH-60; INT-03…INT-06) from f27d049 |
| [ARCH-54](ARCH-54-decision-stream-order.md) | superseded-by-phase-12 | Phase 12 (ARCH-60; INT-01, INT-02) from 6c67e44 |
| [ARCH-55](ARCH-55-core-named-barrel.md) | deferred | never committed; speculative (REQUIREMENTS.md Out of Scope) |
| [ARCH-56](ARCH-56-evaluation-metrics.md) | superseded-by-phase-13 | Phase 13 (GAP-05, GAP-06) from d089c1d |
| [ARCH-57](ARCH-57-loose-ends.md) | superseded-by-phase-13 | Phase 13 (GAP-08…GAP-11), ported or recorded obsolete, from 4b1ed49 |

# Architecture deepening — tracker

These plans resolve the seven candidates from the 2026-10-02 architecture
review. The original HTML report lives outside the repo, at
`/private/tmp/claude-502/…/scratchpad/architecture-review-qadi.html`. Each plan
re-checked the review's evidence against **`1caf04c`** before planning against
it, using scratch probes that ran outside the repo.

> This directory was `.planning/architecture/`, neither tracked nor ignored on `1721a42`
> (`e0365e0` removed its `.gitignore` lines). Phase 10 (plan 10-03) archived it here,
> tracked, on 2026-11-10 (D-02: `archive`).

## How to track

- **Plan status** is the `status:` field in each plan's frontmatter:
  `not-started | implemented | ready | in-progress | blocked | done | dropped`.
  Mirror it in the table below.
- **Task status** is the `- **Status:** [ ] todo` line under each `### Tn`.
  Change it to `[~] in progress`, `[x] done`, or `[-] dropped`.
- **Decisions:** record the outcome in the plan's §5 entry, as
  `status: decided (<date>, <choice>)`, and in the register below. When every
  decision a plan needs is settled, its status moves to `ready`.
- **Progress log:** add one row per change to the plan's §10. Use
  `CCR-QD-NEXT` / `ADR-QD-NEXT` in plans, and assign real numbers only when the
  work lands, so parallel plans don't collide.
- Quick status check:
  `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-*.md | sort | uniq -c`

## Waves

| Wave | Review | Plans | Where |
| ---- | ------ | ----- | ----- |
| 1 | 2026-10-02 | ARCH-01 to ARCH-07 | [WAVE-1.md](WAVE-1.md) |
| 2 | 2026-10-05 | ARCH-08 to ARCH-15 | [WAVE-2.md](WAVE-2.md) |
| 3 | 2026-10-06 | ARCH-16 to ARCH-29 | [WAVE-3.md](WAVE-3.md) |
| 4 | 2026-10-07 | ARCH-30 to ARCH-45 | [WAVE-4.md](WAVE-4.md) |
| 5 | 2026-10-13 | ARCH-46 to ARCH-57 | below (active) |

Quick status of any wave: `./progress.sh <ids>`. A wave's file holds its plan table,
defects found while planning, decision register, overlaps and suggested order.


# Wave 5: the 2026-10-13 review (ARCH-46 to ARCH-57)

These plans resolve the 11 candidates from the 2026-10-13 architecture review, plus one plan (ARCH-57) for the review's
three "also seen, low leverage" entries and the small findings verification turned up. The report lives outside the repo, at
`/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261013-004214.html`.
Every plan re-verified its evidence against **`b655b3b`** (`main`, after #150). Throwaway probes are in the session scratchpad
under `wave5/<ARCH-id>/` (and `wave5/orchestrator/` for the cross-plan check below). They are **ephemeral**; each plan's §1
records the command that settles every claim, so T0 can re-run it.

**Prerequisite:** none. Every plan branches from `main`. Mind the ordering in "Cross-plan conflicts" below.

**Releases:** many decisions below are breaking or reshape names, so they ship as changesets only. Merging a version-packages
PR or publishing still needs the user's explicit go-ahead (standing instruction since 2026-10-06). **Read "Release hygiene" first.**

**Progress at a glance:** `./progress.sh 46 47 48 49 50 51 52 53 54 55 56 57`.

## Plans (wave 5)

| ID | Plan | Review strength | Status | Tasks | Decisions | Estimate | Depends on |
| -- | ---- | --------------- | ------ | ----- | --------- | -------- | ---------- |
| [ARCH-46](ARCH-46-port-read-module.md) | One port-read module behind the port description: one generic read per port (span, metric, defect, both annotations), thin request formers, a wire that keeps only the wire | Strong | needs-decision | 0/13 | 6 (D-46-a…f) | L (defect path ½ d; bench 1 d) | — (before ARCH-51, ARCH-55) |
| [ARCH-47](ARCH-47-edge-step-owns-the-request.md) | The HTTP edge step owns the whole request: `identifyRequest` once, `serveRequest` as the subject once; each surface supplies only its answer | Strong | needs-decision (T0–T4 free) | 0/12 | 3 (D-47-a…c) | M (defect path ½ d) | — (before ARCH-49, ARCH-57 L1b) |
| [ARCH-48](ARCH-48-simulation-fixture-fields.md) | Describe each simulation input field once: one closed field table in the devtools model; sweep, remedies, rename, unseeded list, fixture ports and chip commands derived from it | Strong | needs-decision (T1 free) | 0/14 | 8 (D-48-a…h) | L (defect path 2–3 h) | ARCH-57 L2 (soft) |
| [ARCH-49](ARCH-49-guardapi-access-plan.md) | `guardApi` builds a closed access plan from the API value it was given; the middleware only looks an endpoint up and answers | Strong | needs-decision (T0–T2 free) | 0/9 | 5 (D-49-a…e) | M (T0+T1 2–3 h) | ARCH-47 (soft: T2/T3 rebase) |
| [ARCH-50](ARCH-50-explorer-session.md) | A headless `ExplorerSession` owned by the dock; the explorer's choice, draft, preview and paste survive a tab switch | Worth exploring | needs-decision (T1, T3 free) | 0/12 | 7 (D-50-a…g) | M (T1 ≈2 h) | — |
| [ARCH-51](ARCH-51-leaf-needs-table.md) | A package-private `LeafNeeds.ts`: each policy leaf's request needs and port stated once; `servingFor` exhaustive by type | Worth exploring | needs-decision (T1–T3 free) | 0/13 | 6 (D-51-a…f) | M (patch ½ d) | ARCH-46 (soft) |
| [ARCH-52](ARCH-52-signature-ledger-read-seam.md) | The signature ledger becomes a keyed store; the exact-pair read rule is derived once in `signatureHistoryFromLedger`; conformance checks for adapters | Worth exploring | needs-decision | 0/13 | 8 (D-52-a…h) | L (defect path ½ d) | — |
| [ARCH-53](ARCH-53-hydration-event.md) | A hydration outcome is one closed `HydrationEvent`, projected once to counter and reporter; a reporter or an unencodable policy can no longer break the accounting | Worth exploring | needs-decision (T2 free) | 0/12 | 7 (D-53-a…g) | L (defect path ≈1 d) | — |
| [ARCH-54](ARCH-54-decision-stream-order.md) | The decision stream's order has one owner in core (`DecisionStream.ts` encode/decode); SSE bytes stay in http, `EventSource` in devtools; a reconnect mid-backlog stops losing records | Worth exploring | needs-decision | 0/11 | 6 (D-54-a…f) | L (T1 ½ d) | — |
| [ARCH-55](ARCH-55-core-named-barrel.md) | `@qadi/core`'s barrel names its exports; the port-span quartet and port-wire pair merge into one module each | Speculative | needs-decision | 0/9 (+1 conditional) | 5 (D-55-a…e) | M | **last**: after 46, 51, 54, 56, 57 |
| [ARCH-56](ARCH-56-evaluation-metrics.md) | One exported `EvaluationMetrics` module the three writers write through; typed reads replace id-string matching; every `qadi_*` metric listed once and gated | Speculative | needs-decision (T1 free) | 0/12 | 8 (D-56-a…h) | M (T1 ≈1 h) | ARCH-46 (T7 only) |
| [ARCH-57](ARCH-57-loose-ends.md) | Loose ends: optional no-resource loader, one unguarded-route constructor, fixture setups as one union, gate writer resolved once, stale citations, cache-capacity docs, subject-set lifecycle, `ADR-QD-NEXT` placeholders | n/a | needs-decision (T3, T10–T12 free) | 0/17 | 11 (D-57-a…k) | L (≈2 d without L1b) | ARCH-47 (L1b only) |

**Totals:** 147 active tasks (one conditional, dropped by default) and 80 decisions (79 open, one forced). 9,015 lines of plan.

## Release hygiene (found while planning, act before any release)

- **Version PR #151 (`changeset-release/main`, 0.12.0) is open** and carries wave 4's pending changesets. It must not be merged
  without the user's go-ahead. Several wave-5 decisions reshape names that have **never been published** (last release 0.11.0):
  ARCH-46's `PortWireSpan`/span projections, ARCH-49's `endpointAccess`/`EndpointAccess`/`misplacedDeclarations` (D-49-c),
  ARCH-52's `SignatureLedger` shape, ARCH-57's `PortSetup`/`PortSetups`/`PortFixtures` (D-57-e/f). If those land **before** #151
  merges, they amend the pending changesets with no breaking note; **after**, each becomes a breaking removal with an upgrading
  entry. Decide whether wave 5's unreleased reshapes go in before 0.12.0 (each plan's §8 covers both paths).
- **Probe hygiene.** During planning, a `tsc` probe with declaration emit wrote 154 untracked `*.d.ts`/`.map` files into
  `packages/core/src` and `packages/http/src` (`stryker.http.mjs` mutates `packages/http/src/**/*.ts`; madge's file count
  doubles). They were deleted and the tree is clean at `b655b3b`. **Every probe runs with `noEmit`**, and every plan's T0 and
  final gate start with `git status --porcelain` empty (ARCH-57 T0/T15 make this explicit).

## Defects found while planning (wave 5): ship these first

Each row is a test-first task that ships on its own as a patch, ahead of its plan's refactor. Ordered by severity.
**CONFIRMED** means a probe or test in the plan's §1 reproduced it at `b655b3b`.

| Plan · task | Defect | Severity | Found by | Blocked on |
| ----------- | ------ | -------- | -------- | ---------- |
| ARCH-52 · T1 | A signature captured on a resource whose id is not a string (`{ id: 7 }`) is recorded **with no resource**, so `hasSignature(…, { scope: "Any" })` then **allows on every resource**. Breaks INV-QD-120. `SignatureLedgerTest` and an existing test pin the wrong behavior | **security** | planning (new) | D-52-d |
| ARCH-49 · T1 | `guardApi(A)` provided to `HttpApiBuilder.layer(B)` where B reuses A's group/endpoint **names** serves B's endpoints `guardApi` never vetted: B's route enforced a different permission than `/__permissions` listed, and B's API-level requirement (which `guardApi(B)` refuses) was **silently ignored — anonymous got 204**. Unreleased | **security** (misconfiguration) | planning (new) | nothing |
| ARCH-54 · T1 | A stream that drops **during the backlog** and reconnects **silently loses records**: backlog frames go out sorted by `at`, each frame's SSE id is a log position, and resume returns `seq > Last-Event-ID`. Triggered by overlapping evaluations and Edge ingests. An existing http test asserts the defective order. (P2, same fix: a reconnect after the backlog re-sends records) | medium (data loss) | planning (new) | D-54-c |
| ARCH-53 · T4 | `dehydrateDecisions` **throws** `SchemaError` on policies the public constructors accept (`gte(-Infinity)`, `gte(NaN)`, `hasRelationship(…, { depth: 1.5 })`), **crashing the server render**; the kept entry is counted nowhere (INV-QD-045). See orphan O1 for the core half | medium | planning (new) | D-53-b, D-53-d |
| ARCH-53 · T1 | A supplied `onDropped`/`onHydrationMismatch` that throws **changes the outcome**: `hydrateDecisions` throws and decoded entries are neither seeded nor counted; `dehydrateDecisions` aborts; the mismatch hook throws into React render | medium | planning (new) | D-53-e |
| ARCH-46 · T1 | A served port read whose adapter **throws synchronously** dies instead of failing typed; `answerRemotely` ("never fails") defects and the port route answers **500 instead of 503 `Unavailable`**. Breaks BEH-QD-261, BEH-QD-332 | medium | planning (new) | nothing |
| ARCH-47 · T1/T2 | `portRoutesUnguarded` answers a broken credential store with a **502 and no log line** (`toResponse` logs nothing; only `authorizeRequest` calls `logSubjectExtractionFailed`). No test covered extraction failure on either port-route form | medium | review | nothing |
| ARCH-48 · T1 | No `DropSignature` in `EditKind`: the "which grant is load-bearing?" sweep (`singleEdits`, `sweepPlan`, the session's `plan`) never offers a signature row on a `hasSignature` policy | medium | review | nothing (uses D-48-b's rec. label) |
| ARCH-50 · T1 | After loading a paste, the explorer's tree still shows the **previous** policy's simplification while the toolbar describes the new one, and `apply` applies a third tree. Breaks BEH-QD-213. Also: a paste refusal survives `apply` (low); an unloaded paste is lost by Tree → JSON → Tree (low) | medium | planning (new) | nothing |
| ARCH-50 · T2 → T4/T5 | A tab switch loses the explorer's chosen policy, draft, view and unloaded paste; on return it shows whatever is head now. Breaks INV-QD-107 | medium | review | D-50-a, D-50-b |
| ARCH-47 · T3/T4 | A `publicEndpoint` handler's own `guard` denial becomes a **403 with no log line** (BEH-QD-321; ARCH-45 I3 never touched the `Public` arm). Redaction there holds only because the encoder strips extra fields | low–medium | planning (new) | nothing |
| ARCH-50 · T7 | The role viewer loses its chosen role on a tab switch | low–medium | planning (new) | D-50-e |
| ARCH-53 · T2 | A payload naming another subject with **zero** entries warns but moves the counter by 0 (INV-QD-045: "a refused payload is counted at least once") | low | planning (new) | nothing |
| ARCH-52 · T2 | ADR-058 says a signature's `scope: "Any"` has "the same semantics" as `HasActed`'s (which means "ever, on any resource"); `explain()` renders it "for anything". Both teach adapter authors the over-wide reading | low (spec + explain) | planning (new) | D-52-e |
| ARCH-48 · T2 | `hasSignature` and `hasCustom` get neither a remedy nor a named skip; BEH-QD-222 requires the skip with its reason | low | planning (new) | D-48-c |
| ARCH-49 · T1 | `guardApi(A)` serving `A.prefix("/v1")` lists a path nothing serves | low | planning (new) | nothing |
| ARCH-51 · T1 | `PortRemote.collectNames` uses `Match.orElse`: a new leaf compiles unserved, and `servingFor` would omit a sixth port silently (latent) | low | review | nothing |
| ARCH-56 · T1 | Renaming the six evaluation metric ids fails 12 tests but **6 negative "not counted" tests still pass vacuously** — one is the only guard for BEH-QD-317 (a readiness probe must not update `qadi_decisions_total`); same pattern at `PortServe.test.ts`. No evaluation metric's description/type/attributes is pinned | test gap | planning (new) | nothing |
| ARCH-51 · T2 | No test pins that a missing resource wins over a missing action on `HasResourceAttribute` | test gap | planning (new) | nothing |
| ARCH-57 · T3 | Neither unguarded-route logging cadence is pinned (construction warning untested; `/__permissions` test makes one request) | test gap | planning (new) | nothing |
| ARCH-57 · T12 | INV-QD-016 says "nothing is memoised across elements" — false once a cache is wired; no test runs a batch under a cache or a sink | spec + test gap | planning (new) | nothing |
| ARCH-55 · T3 | Gate 13 blind spot: 38 core names are documented only in prose and STALE reads only a table's first column, so dropping `WireVersion` from a named barrel would pass | gate gap (bites under D-55-a) | planning (new) | D-55-b |
| ARCH-46 · T2 · ARCH-51 · T3 · ARCH-57 · T10/T13 | Doc defects: a `PortMetrics.ts` comment on the wrong export; four `LeafNeeds`-area comments/spec rows (incl. BEH-QD-076 showing `MissingAction` as `Data.TaggedError`); 7 present-tense citations of deleted test files (one in shipped `Role.ts`); 11 `ADR-QD-NEXT` placeholders left in shipped comments and test titles | docs | planning (new) | D-57-i, D-57-k (for the gate halves only) |

**Startable now, no decision needed:** ARCH-49 T1 · ARCH-46 T1/T2 · ARCH-47 T1–T4 · ARCH-48 T1 · ARCH-50 T1, T3 · ARCH-53 T2 ·
ARCH-51 T1–T3 · ARCH-56 T1 · ARCH-57 T3, T10, T12 · ARCH-52 T3. Benchmark baseline ARCH-46 T3 also needs no decision.

## Claims the review got wrong (wave 5)

- **ARCH-46:** the signature match living in `PortAccess.ts` is a decision (D-01-b, D-21-c), not drift; `withSpan` is unnecessary
  (one named `Effect.fn` per port, built once, keeps today's hot-path mechanism; a spike passes 1831/1832 core tests, the one
  failure intended). Missed: the three spellings of the resource-id rule already produce **different spans**, and span-question
  key typos compile today.
- **ARCH-47:** the open-error tap caveat is true but not blocking: closed overloads compile for all three surfaces (refines
  D-19-a). There is a **fourth** copy of the request tail, in the website's "Building your own surface". `refuse` contains a no-op
  `provideService(CurrentSubject, anonymous)`.
- **ARCH-48:** 8 `session.edit` calls (7 field writes), not 9. Nothing in code joins the unseeded labels to the form's labels (they
  already disagree cosmetically). Chip functions are already tested without the DOM; only the per-field wiring is DOM-only and
  outside the mutation gate.
- **ARCH-49:** the middleware does **not** re-read per request: Effect calls it once per endpoint at route build. Only the refusal
  runs per request, so the case is locality and test surface, not speed. The group-misplaced branch is reachable, through the
  name-collision defect.
- **ARCH-50:** `SimulationSession` already uses `HeldChoice`; the duplicates are the render-time pins in `PolicyExplorer.tsx` and
  `RoleViewer.tsx` and a policy-equality check written twice. `runSync` in a view breaks no rule; the cost is coverage and mutation.
  28 render tests, not "20+".
- **ARCH-51:** the property generator does cover every tag (TS2741) and catches a new leaf on an existing port by chance (7–27 of
  150 runs); it cannot see a sixth port. `RequirementKind` is a reader-facing category, not a duplicate. `leafCases` is the wrong
  tool. Refusal reason strings can't be derived (pinned verbatim in tests, website and spec).
- **ARCH-52:** not breaking: `SignatureLedger` has never been released. The `scope: "Any"` label is in `signatureWire.spanQuestion`,
  not `SignatureHistory.ts`. `SignatureLoop.test.ts` runs two modes. No wrong adapter exists in `examples/` or the website. The write
  side is not fully "by construction" either (the security defect above).
- **ARCH-53:** the dehydrate side loses no information at HEAD (one reason; the asymmetry is documented) until T4 adds a second
  reason. Five modules, not four. INV-QD-045 covers counting; "announced" is BEH-QD-230. The one-line read delegate is intended (ADR-078).
- **ARCH-54:** the missing `synced{n}` check is **not** the gap: D-28-e decided against it, and the lossy reconnect sends a correct
  per-connection count, so it could not have caught P1. "ARCH-19/28 settled the three exports" is wrong: each deferred to the other.
- **ARCH-55:** `PortSpanDecode` is also imported by `PortSpan.test.ts`, and its comment cites madge, not §9. The `SinkRecordTag`
  restatement is not fixed by a named barrel (only by D-55-c = B). Cost understated: 91 statements and 498 names vs 51 lines today.
  Only 4 of 18 private modules are split purely because of `export *`.
- **ARCH-56:** no package or example re-declares a metric, so there is no silent-zero defect. `HydrationMetrics` lives in core, not
  react. Devtools needs no metric reader (per-decision cache outcome travels on the record). Port-metric tests match id strings too.
- **ARCH-57:** putting the gate writer on `QadiContextValue` would expose it publicly (contradicts ADR-080, D-43-b); the double
  subscription costs nothing (identical render counts). The capacity throw is specified (BEH-QD-166). `decideSubject` skips nothing,
  and calling `decideQuestion` directly would break ADR-100's single call site. Both unguarded cadences are specified. The helper is
  `mapPorts`, not `tabulatePorts`.

## Decisions that need the user, not just a reviewer (wave 5)

| ID | What | Why it needs sign-off |
| -- | ---- | --------------------- |
| D-46-b | `disclose` takes the port's own answer; the signature judgement is hoisted | Reopens ARCH-21's decided D-21-c |
| D-46-d | Drop the empty `qadi.requireScopedResourceId` child span | Tracer-visible change (ADR-051: spans are product observability) |
| D-47-b | `identifyRequest`, `IdentifiedRequest`, `serveRequest` public | Public API (gate 13) |
| D-47-c, D-51-e, D-55-b, D-56-f, D-57-k | House-style rules `edge-step-owns-identity`, `leaf-needs-once`, `named-barrel` + `core-barrel-complete`, three metric rules; `ADR-QD-NEXT` refusal in gate 10 | Gate changes |
| D-49-b | Refuse an endpoint that declares neither, at layer build (`AccessNotDeclared`) | Behavior change (BEH-QD-174, INV-QD-034) |
| D-49-c | `endpointAccess`, `EndpointAccess`, `misplacedDeclarations` leave the public surface | Reverses ARCH-18's D-18-c (never published) |
| D-52-a | Ledger becomes `append(key, entry)` / `entriesAt(key)` + exported conformance checks | Public port shape in `@qadi/audit` |
| D-53-b | One `HydrationDrop<A, R>` for both ends | Breaking for the dehydrate `onDropped` hook |
| D-53-g | Add `HydrationEvent.ts` to `stryker.react.mjs` | Widens a gate's input |
| D-54-e | Remove http's `frame`, `syncedFrame`, `decisionFrames`, no shims | Breaking `@qadi/http` |
| D-54-f | Core owns refusal reporting for stream + backlog | Log text `qadi/http:` → `qadi:` and span names change |
| D-55-a | Named-export core barrel | Edits AGENTS.md §9, amends ADR-099 |
| D-56-a | Evaluation metrics public from the core root | Public API (gate 13) |
| D-57-f | `@qadi/testing` stops exporting `PortSetup`/`PortSetups` | Removes (unreleased) exports |

## Decision register (wave 5)

Full options and tradeoffs are in each plan's §5. "Rec." is the plan's recommendation. Status is `open` until recorded here and in the plan.

| ID | Question | Rec. | Status |
| -- | -------- | ---- | ------ |
| D-46-a | What a generic read takes as its request | `Result<Args, Unformed{asked, error}>`; the question of a formed request stated once on the description (`attributes.ask`) | open |
| D-46-b | How the signature judgement reaches the span | `disclose` takes the port's own answer for all five ports; a hoisted judgement writes `meaning`/`signerRole`/`matched` | open |
| D-46-c | Where the signature judgement lives | `PortAccess.ts`, module-private (D-01-b); not `Walk.ts`, not `SignatureHistory.ts` | open |
| D-46-d | The empty `qadi.requireScopedResourceId` child span | drop it | open |
| D-46-e | Span mechanism of the generic read | one named `Effect.fn(d.span)` per port, built once in a table | open |
| D-46-f | Bench gate before conversion | ARCH-26 protocol; 5% budget, resolver miss ≤ 3% | open |
| D-47-a | Shape of "run as the subject" | `serveRequest(who, handler, answer)`, two closed overloads; owns the `CurrentSubject` scope, handler-denial log and catch | open |
| D-47-b | Are the two steps public? | yes, additive minor | open |
| D-47-c | Gate "only the edge step extracts, provides and taps" | yes, house-style rule scoped to `packages/http/src` | open |
| D-48-a | How fields are described | one closed table in new `model/SimulationFields.ts`; every per-field operation derived | open |
| D-48-b | `DropSignature` label | prose; the chip's JSON text when `signedAt`/`algorithm`/`keyId` is present | open |
| D-48-c | Signature remedy; silent `hasCustom` | `AddSignature` built from the node; `hasCustom` a named skip | open |
| D-48-d | Where a chip's refusal lives | `addChip` returns it; the view keeps its buffer (ARCH-20) | open |
| D-48-e | `UnseededField` shape | add `key: SimulationField`, keep `field` | open |
| D-48-f | Fixture half keyed by `PortName` | yes; `CustomPredicate` typed as having no form field | open |
| D-48-g | Spec shape | amend ADR-047 (Rev 1.7) + one invariant | open |
| D-48-h | Snapshot carries the form reading | yes (three exported types) | open |
| D-49-a | Plan key | the walked group/endpoint **objects**, not identifier strings | open |
| D-49-b | Undeclared endpoint | refused at build, new `AccessNotDeclared` | open |
| D-49-c | Readers leave the public surface | yes; keep `AccessDeclarationKey` | open |
| D-49-d | Where the plan lives | package-private `AccessPlan.ts`, also declaring the refusal classes | open |
| D-49-e | Release notes | before 0.12.0: new changeset + edit pending `endpoint-access.md`; else a "Removed" changeset | open |
| D-50-a | Explorer session public? | package-private (ADR-047 1.6) | open |
| D-50-b | Ownership | the dock; `PolicyExplorer` takes a required `session` | open |
| D-50-c | Preview representation | a boolean; the tree is always `simplify(shown)` | open |
| D-50-d | Lifetime of an unloaded paste and its refusal | both belong to the shown policy; paste survives Tree/JSON; refusal cleared on edit or change | open |
| D-50-e | Role viewer | same fix, dock-owned `makeHeldChoiceStore` in `HeldChoice.ts` | open |
| D-50-f | Where decode runs | the model, `Effect.runSyncExit`; a defect becomes a refusal | open |
| D-50-g | Spec shape | amend ADR-047 (Rev 1.7), new behavior in doc 28, restate INV-QD-107 | open |
| D-51-a | Owner of the resource-id rule | split: ARCH-51 states which leaves key by id; ARCH-46 raises it where the span opens (ADR-077); T10 fallback | open |
| D-51-b | Where the table lives | new package-private `LeafNeeds.ts` | open |
| D-51-c | `PredicatePortName` | checked against the table by a tstyche test, not moved | open |
| D-51-d | How `Walk.ts` consults it | one check atop `evaluateNode` if the interleaved bench is within noise, else in the three arms | open |
| D-51-e | Gate the single construction site | yes, `leaf-needs-once` | open |
| D-51-f | ADR | new ADR amending 077 and 107 | open |
| D-52-a | Ledger interface | keyed store + `checkSignatureLedger`, `checkSignatureHistoryScoping` | open |
| D-52-b | Persisted key | ledger-owned versioned `ledgerKeyOf = [1, subjectId, resourceId ?? null]`, bytes pinned, law-tied to `signatureHistoryPort.key` | open |
| D-52-c | Entry under another key / signer ≠ subject | fail typed `SignatureHistoryUnavailable` | open |
| D-52-d | Discharge on a resource with no string id | refuse before `capture` (`HandlerFailed`) | open |
| D-52-e | Meaning of signature `"Any"` | "on file with no resource"; fix `explain()`, amend ADR-058, note BEH-QD-092 | open |
| D-52-f | Ledger a registry port? | no | decided in plan (forced: BEH-QD-255 forbids the default a registry port needs) |
| D-52-g | ADR | new ADR amending 058 and 105 | open |
| D-52-h | Changeset framing | settled mechanically at T0 (released or not) | open |
| D-53-a | Event shape | split by tag (`Dehydrated`, `LeftOut`, `PayloadRefused`, `EntriesDropped`, `Seeded`, `Rechecked`), reasons narrowed per tag | open |
| D-53-b | Dehydrate-side `onDropped` | one public `HydrationDrop<A, R = ClientHydrationDropReason>` | open |
| D-53-c | Where it lives | private `HydrationEvent.ts` absorbing `HydrationCounts.ts`; `DecisionEntry` moves in; planners return events, emit once | open |
| D-53-d | Unencodable policy | drop under `DehydrationDropReason` `"UnencodablePolicy"` | open |
| D-53-e | Reporter that throws | caught inside every resolver in `DeveloperSignals.ts`; outcome finishes; new `ReporterThrew` signal | open |
| D-53-f | ADR | amend ADR-052 (+ notes in 041, 078); new invariant "a reporter observes; it cannot change the outcome" | open |
| D-53-g | Mutation scope | add `HydrationEvent.ts` to `stryker.react.mjs` | open |
| D-54-a | What core owns | `encodeDecisionStream(log, {after, onRefused})` and `decodeDecisionStream(frames, {syncTimeout, onUnreadable})` | open |
| D-54-b | Where | new `core/src/DecisionStream.ts`, taking the vocabulary and `format`/`parseLogCursor` from `DecisionLog.ts` (extends D-28-a) | open |
| D-54-c | P1 fix | encoder sends the backlog in cursor order; the reader sorts for display | open |
| D-54-d | Decoder checks `synced{n}`? | no (D-28-e stands); writer-side round-trip property instead | open |
| D-54-e | http's three frame exports | removed, no shims | open |
| D-54-f | Refusal reporting for stream + backlog | core, via `encodeDecisionStream` and new `encodeDecisionBacklog` | open |
| D-55-a | Named core barrel? | yes: surface-identical, generated, then the two merges | open |
| D-55-b | Keeping it complete | `named-barrel` (generalized) + `core-barrel-complete`; no `stripInternal` | open |
| D-55-c | madge `skipTypeImports` | no, keep counting type-only edges (ADR-037's own example) | open |
| D-55-d | Five re-export shims | keep | open |
| D-55-e | Order in wave 5 | last | open |
| D-56-a | Public or private | public from the core root | open |
| D-56-b | Module | new `EvaluationMetrics.ts`, separate from `PortMetrics` | open |
| D-56-c | `CacheOutcome` | moves into `EvaluationMetrics.ts` (breaks the madge cycle) | open |
| D-56-d | `qadi_decisions_total` export | `decisionsTotal` record keyed `Allow`/`Deny`; never the untagged base; camelCase names | open |
| D-56-e | Scope beyond core | typed test reads for audit and compiler metrics via package-private modules, phased | open |
| D-56-f | Gate shape | three rules in gate 4 + a 22-row table in `25-inspection.md` | open |
| D-56-g | Devtools reader now | no | open |
| D-56-h | ADR | new ADR amending 052 | open |
| D-57-a | Optional `addGuardedRoute` loader | yes, by overloads (cast-free; refutes ARCH-19's note) | open |
| D-57-b | One unguarded-route constructor | package-private `unguardedRoutes(declared, routes)` with required `announce` | open |
| D-57-c | Merge the two `reportRefused` | no (ARCH-25 kept a span per route); moot if D-54-f = A | open |
| D-57-d | Where the port route's cadence is specified | one sentence in behavior doc 34 | open |
| D-57-e | `fixturePortsLayer` argument | `fixturePortsLayer(setups: PortSetups)` via `mapPorts`; drop `PortFixtures`, overrides, precedence | open |
| D-57-f | Who exports `PortSetup`/`PortSetups` | core only | open |
| D-57-g | Where the resolved gate writer lives | package-private React context set by the provider | open |
| D-57-h | `useDecisionSuspense` reuses `useGate`'s atom | yes (cosmetic) | open |
| D-57-i | Gate cited test files | no; fix the 7 by hand | open |
| D-57-j | Cache capacity validation | stays a defect (BEH-QD-166); document why | open |
| D-57-k | `ADR-QD-NEXT` in source | replace all; refuse new ones in gate 10 | open |

## Cross-plan conflicts and overlaps (wave 5)

**Conflicts to resolve before work starts:**
1. **The resource-id rule: ARCH-46 vs ARCH-51.** Decide D-51-a with D-46-a. Recommended split: ARCH-51 states which leaves key
   by a resource id; ARCH-46's generic read raises `MissingResourceId` where the span opens. If ARCH-46 is dropped, ARCH-51 T10 runs.
2. **The edge step: ARCH-47 → ARCH-49 → ARCH-57 L1b.** ARCH-47's `serveRequest` lands first; ARCH-49's plan arms call it; ARCH-57's
   `unguardedRoutes` is built on `identifyRequest`/`serveRequest` (D-47-c's rule would fail a hand extraction).
3. **ADR-107 and BEH-QD-332: ARCH-46 and ARCH-47** both amend them and ARCH-46 T1 changes a port route's status for a throwing
   store. Serialise: whichever lands second takes the next revision.
4. **`reportRefused`: ARCH-54 D-54-f vs ARCH-57 D-57-c.** If D-54-f = A, ARCH-54 owns both refusal reporters and D-57-c is moot.
5. **The core barrel: ARCH-55 last.** ARCH-46 removes members from the modules ARCH-55 merges; ARCH-54, ARCH-56 and ARCH-57 add or
   reshape core exports. ARCH-55 regenerates the barrel once, after them. Names other plans need kept: `PortName`,
   `PortFixtureData`, `fixturePortsLayer` (48), `fromJson`, `toJson`, `simplify`, `policyDepth`, `DEFAULT_MAX_DEPTH`,
   `PolicyDecodeTooDeep` (50), `ENFORCEMENT_DENIAL_TAGS`, `CurrentSubject`, `anonymous` (47).
6. **Gate-change cluster:** D-47-c, D-51-e, D-55-b, D-56-f, D-57-k all edit `check-house-style.mjs` or `verify-traceability.sh`.
   Settle them in one sitting; each needs the DoD table check (gate 11).

**Ordering overlaps (same files):**

| Files | Plans | Rule |
| ----- | ----- | ---- |
| `core/PortAccess.ts`, `Walk.ts` | ARCH-46, 51 | 46 first; 51 edits three leaf arms + `evaluateNode`'s start, 46 the port arms |
| `core/PortWire*.ts`, `PortSpan*.ts`, `PortInterpreter.ts` | ARCH-46, 55 | 46 → 55 |
| `core/PortMetrics.ts`, `Lifecycle.ts`, `DecisionCache.ts`, `Predicate.ts` | ARCH-46, 56, 51 | 56 phase 1 → 55; 56 T7 only if 46 hasn't rewritten the port tests; 51 one import line |
| `core/SignatureHistory.ts`, `Explanation.ts` | ARCH-46, 52, 51 | either order; D-52-b protects persisted keys; one-line `HasSignature` arm conflict |
| `core/DecisionLog.ts` → `DecisionStream.ts` | ARCH-54 | — |
| `core/Ports.ts` (`fixturePortsLayer`) · `devtools/model/SimulationSource.ts` | ARCH-57 L2, ARCH-48 | 57 L2 first; 48 T8 adapts either way |
| `core/HydrationMetrics.ts` · `react/DeveloperSignals.ts` | ARCH-53, 56, 57 | 53 T1 first; textual |
| `http/RequirePermissionMiddleware.ts`, `AuthorizeRequest.ts`, `GuardRoute.ts` | ARCH-47, 49 | 47 → 49 (49 T1 either way) |
| `http/PortRoutes.ts`, `PermissionRegistry.ts`, `DecisionBacklogRoute.ts` | ARCH-47, 57, 54 | 47 → 57 L1b; 57 T2's one-argument edits rebase over 49/54 |
| `http/DecisionStreamRoute.ts` | ARCH-54, 47, 57 | independent hunks; rebase only |
| `spec/behaviors/23-http.md`, ADR-036 | ARCH-47, 49, 57 | second takes next revision numbers |
| `devtools/model/SimulationSession.ts`, `Catalogue.ts`, `HeldChoice.ts` | ARCH-48, 50 | free order; ARCH-50 T3 moves `choosePolicy`'s lookup into `Catalogue.ts` |
| ADR-047 (Rev 1.7) | ARCH-48, 50, 54 | second takes the next revision |
| `spec/overview.md`, `spec/traceability.md` | most | second rebases rows |

## Suggested order (wave 5)

1. **Release decision:** decide whether wave 5's unreleased reshapes go in before #151 merges (no merge without the user's go-ahead).
2. **Security patches, independently:** ARCH-49 T1 (no decision) · ARCH-52 T1 once D-52-d is decided.
3. **Other defect patches, no decisions:** ARCH-46 T1/T2 · ARCH-47 T1–T4 · ARCH-48 T1 · ARCH-50 T1 · ARCH-53 T2 · ARCH-51 T1–T3 ·
   ARCH-56 T1 · ARCH-57 T3, T10, T12 · ARCH-52 T3. Then, as their decisions settle: ARCH-54 T1 (D-54-c) · ARCH-53 T1 (D-53-e),
   T4 (D-53-b/d) · ARCH-52 T2 (D-52-e) · ARCH-48 T2 (D-48-c) · ARCH-50 T2 (D-50-a/b).
4. **Settle the cross-cutting decisions:** D-46-a with D-51-a; D-54-f with D-57-c; the gate-change cluster; the sign-offs above.
5. **core:** ARCH-46 (bench T3/T4 first) → ARCH-51 → ARCH-56 phase 1 → ARCH-54 → ARCH-57 L2 → **ARCH-55 last**.
6. **http:** ARCH-47 → ARCH-49 → ARCH-57 L1.
7. **audit:** ARCH-52.
8. **react:** ARCH-53 → ARCH-57 L3.
9. **devtools:** ARCH-57 L2 → ARCH-48 ⇄ ARCH-50 (free order).

## Orphan findings (wave 5): not owned by any plan yet

- **O1 — Policy constructors accept what the Policy codec refuses** (core). `Matcher.ts` declares `Gte`/`Lt` with
  `Schema.Finite` and `Policy.ts` declares `RelationshipDepth` as `Schema.Int.check(…)`, but `gte(value: number)` and
  `hasRelationship(relation, { depth?: number })` accept any number. Orchestrator probe (`wave5/orchestrator/nan.mts`):
  `toJson(hasRelationship("editor", { depth: 1.5 }))` and `depth: NaN` fail with `SchemaError(Expected an integer at ["depth"])`.
  `toJson` fails typed, but any surface that persists or ships a policy (SinkCodec records, hydration — ARCH-53 C9, devtools
  `toJson`) inherits the gap. INV-QD-018 shows the evaluator decides `gte(-Infinity)`. Needs a decision: constructors refuse
  (typed or branded inputs), or the schemas widen. Suggested owner: a wave-6 plan or an ARCH-57 addendum.
- **O2 — `portCallsTotal`'s description names `translateNode`, which no longer exists.** Registry-keyed, so fixing it re-keys the
  series; pinned by `Ports.test.ts`. ARCH-56 (C13) and ARCH-51 assign it to ARCH-46, and ARCH-46 does not list it. Add it to ARCH-46 T11.
- **O3 — `Lifecycle.LifecycleOptions` is an unpinned restatement** (found by ARCH-55, handed to ARCH-57, not taken).
- **O4 — `MissingResource.attribute` names the subject attribute instead of the resource path** (found by ARCH-51, offered to ARCH-57, not taken).
- **O5 — devtools keeps a private copy of `resourceIdOf`** (found by ARCH-51, offered to ARCH-57, not taken).
- **O6 — A resume across log eviction is silent** (ARCH-54 P3). Working as documented (BEH-QD-201, "a display buffer, not a
  retention policy"); signalling it would be a protocol extension (a field on `synced`). Recorded, not a defect.
- **O7 — Residual of ARCH-49:** an API with no `RequirePermission` attached, served with someone else's `guardApi`, cannot be
  refused by any middleware. That is the "served form" ARCH-36 rejected under D-36-a; reopening it needs a new argument.
