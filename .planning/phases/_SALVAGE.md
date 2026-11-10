# Salvage guide: the lost 2026-10-13 wave (read for phases 10–13)

## What happened
Two different "wave 5"s exist:
- **Merged** (PR #153, `e0365e0`): the 2026-11-08 review, ARCH-46…54, recorded in the tracked `.planning/ROADMAP.md`,
  `.planning/PROJECT.md` and `.planning/milestones/`. ARCH-58 (`1721a42`) followed it.
- **Lost**: the 2026-10-13 review, plans in the untracked `.planning/architecture/ARCH-46…57-*.md`. These were
  implemented on `wave5/architecture-deepenings` as a linear chain on `b655b3b`, but the branch was never merged and
  then disappeared. On 2026-11-10 the commits were recovered from the reflog and **pinned locally**:

| Branch | Tip | Contents |
|---|---|---|
| `rescue/wave5-1013` | `950977f` | `b0b9363` ARCH-47 → `2ea89d6` ARCH-49 → `903be15` ARCH-46 (T1–T3 only) → `9cf0e5f` ARCH-51 → `d089c1d` ARCH-56 → `6c67e44` ARCH-54 → `8900b7e` ARCH-52 → `4b1ed49` ARCH-57 → `f27d049` ARCH-53 → `950977f` ARCH-48 |
| `rescue/arch50-stash-a` | `4b4c439` | ARCH-50 explorer session (stash). Superseded by ARCH-58 — do not salvage |
| `rescue/arch50-stash-b` | `fc35d5e` | ARCH-50 WIP (stash). Superseded — do not salvage |

ARCH-55 (named core barrel) was never committed and stays deferred.

## The id collision (why wave 6 renames everything)
The lost commits use ARCH-46…57, ADR-QD-108…110, CCR-QD-383…391, BEH-QD-334…336 and INV-QD-242…245 (245 = the simulation sweep in `950977f`), all of which
are **taken on main** by #153. A salvaged change is **ported, not cherry-picked**: read `git show <sha>` as the
reference implementation, re-apply it onto current `main` (which has merged-wave modules the lost chain never saw:
`AuthorizeRequest.ts` enforcement modes, `readPort`, `ArchiveFacts.ts`, `DecisionLogHttp.ts`, `dehydrateWith`,
`PortRouteAddress.ts`, `PortServing.ts`, `JsonRefusal.ts`, `ExplorerSession.ts`, `HeldChoice.ts`), and take **new**
spec numbers from the wave-6 reservations in `.planning/PROJECT.md`. Every lost spec id in a ported comment, test
title or doc is rewritten.

## Live defects on 1721a42 (verified 2026-11-10; probes in the session scratchpad `wave6-verify/`, ephemeral)
| Lost row | Defect | Verdict | Salvage source | Wave-6 phase |
|---|---|---|---|---|
| ARCH-52·T1 | A signature on a non-string resource id is stored subject-wide; `hasSignature(…,{scope:"Any"})` then allows on any resource | **LIVE, security** | `8900b7e` | 11 |
| ARCH-52·T2 | `explain()` "for anything", ADR-058:93 "same semantics", docs `concepts/signatures.md:51` | LIVE, doc | `8900b7e` | 11 |
| ARCH-49·T1 | `guardApi(A)` under `HttpApiBuilder.layer(B)` with reused names: B1 public → 204 anon; B2 needs write → writer 204, registry lists only A; B4 API-level requirement ignored → 204 anon. Each should be 500 plus a log line | **LIVE, security** | `2ea89d6` | 11 |
| ARCH-49·T1 (low) | `A.prefix("/v1")`: the registry lists `GET /a`, which nothing serves | LIVE | `2ea89d6` | 11 |
| ARCH-54·T1 | A reconnect mid-backlog loses records (`DecisionLog.ts:215` sorts the backlog by `storedRecordOrder`; `:326` resumes on `seq > resumeAfter`) | **LIVE, data loss** | `6c67e44` | 12 |
| ARCH-53·T4 | `dehydrateDecisions` throws `SchemaError` on `gte(-Infinity)`, `gte(NaN)`, `depth:1.5` (`HydrationEngine.ts:155` `encodeSync`), and the kept entry is counted nowhere | **LIVE** | `f27d049` | 12 |
| ARCH-53·T1 | A throwing `onDropped` changes the outcome (hydrate seeds 0; dehydrate throws); `onHydrationMismatch` is unguarded (`HydrationEngine.ts:652`) | **LIVE** | `f27d049` | 12 |
| ARCH-53·T2 | A zero-entry `PayloadSubjectMismatch` counts 0 (`HydrationEngine.ts:465`) | LIVE | `f27d049` | 12 |
| ARCH-47·T3/T4 | A `publicEndpoint` handler's own `guard` denial: 403, no log line (`RequirePermissionMiddleware.ts:~124`) | LIVE | `b0b9363` (that part only) | 13 |
| ARCH-48·T1 | No `DropSignature` in `EditKind` (`SimulationEdit.ts:40-57`) | LIVE | `950977f` | 13 |
| ARCH-48·T2 | `hasSignature`/`hasCustom` get neither a remedy nor a named skip (`Remedies.ts:354,359`) | LIVE | `950977f` | 13 |
| ARCH-56·T1 | Metric ids are strings, so negative tests pass vacuously (`GuardHealthCheck.test.ts:147`, the only BEH-QD-317 guard) | LIVE | `d089c1d` | 13 |
| ARCH-51·T2 | No test that a missing resource wins over a missing action on `HasResourceAttribute` | LIVE, test gap | `9cf0e5f` (test only) | 13 |
| ARCH-57·T3 | Unguarded logging cadences not pinned | LIVE, test gap | `4b1ed49` | 13 |
| ARCH-57·T12 | INV-QD-016 "nothing is memoised" is false under a cache; no batch-under-cache/sink test | LIVE | `4b1ed49` | 13 |
| ARCH-46·T2/51·T3/57·T10/T13 | Doc defects: `PortMetrics.ts:146` misplaced block; BEH-QD-076 fence shows `Data.TaggedError` (`10-actions.md:83`); `MissingResourceId` doc omits HasSignature (`Errors.ts:103`); 7 stale citations (incl. `Role.ts:105` "Role.test.ts"); 7 `ADR-QD-NEXT` left (4 src, 3 test titles) | LIVE | `903be15`/`9cf0e5f`/`4b1ed49` | 13 |

## Fixed or obsolete on main (no work; Phase 10 records them)
ARCH-46·T1 (fixed by merged ARCH-47 `readPort`); ARCH-47·T1/T2 (merged ARCH-46 ENF-03); ARCH-50·T1, T2→T4/T5, T7
(ARCH-58); ARCH-51·T1 (`collectNames` deleted by merged ARCH-53). ARCH-55·T3 is latent and only matters if a
named core barrel is ever adopted (deferred).
