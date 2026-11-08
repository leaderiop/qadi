---
gsd_state_version: "1.0"
current_phase: 08
current_phase_name: Port serving from the registry
status: executing
stopped_at: Completed 08-02-PLAN.md
last_updated: "2026-11-08T13:31:33.457Z"
last_activity: 2026-11-08
last_activity_desc: Phase 08 execution started
state_head: a0333efc8a47dd389687fa2a0a7ab0655ca827a4
progress:
  total_phases: 9
  completed_phases: 7
  total_plans: 33
  completed_plans: 25
  percent: 76
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-08)

**Core value:** An authorization decision is never wrong and never silent.
**Current focus:** Phase 08 — Port serving from the registry

## Current Position

Phase: 08 (Port serving from the registry) — EXECUTING
Plan: 3 of 6
Status: Ready to execute
Last activity: 2026-11-08 — Phase 08 execution started

Progress: [██████████████░░░░░░] 23/33 plans ([████████░░] 76%); 7/9 phases

## Performance Metrics

**Velocity:**
- Total plans completed: 23
- Average duration: -
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 | 4 | - | - |
| 01 | 5 | - | - |
| 03 | 3 | - | - |
| 04 | 4 | - | - |
| 05 | 2 | - | - |
| 06 | 2 | - | - |
| 06 | 2 | - | - |
| 07 | 3 | - | - |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02 P01 | 8 min | 2 tasks | 12 files |
| Phase 02 P02 | 6 min | 2 tasks | 12 files |
| Phase 02 P03 | 18 min | 3 tasks | 10 files |
| Phase 02 P04 | 25min | 3 tasks | 7 files |
| Phase 03 P01 | 5 min | 2 tasks | 1 files |
| Phase 03 P02 | 3 min | 3 tasks | 6 files |
| Phase 03 P03 | 20 min | 3 tasks | 9 files |
| Phase 04 P01 | 3 min | 2 tasks | 6 files |
| Phase 04 P02 | 5 min | 3 tasks | 3 files |
| Phase 04 P03 | 10 min | 3 tasks | 10 files |
| Phase 04 P04 | 3 min | 2 tasks | 0 files |
| Phase 05 P01 | 4 min | 2 tasks | 5 files |
| Phase 05 P02 | 6 min | 3 tasks | 6 files |
| Phase 06 P01 | 6 min | 2 tasks | 6 files |
| Phase 06 P02 | 6 min | 3 tasks | 7 files |
| Phase 07 P01 | 5 min | 2 tasks | 4 files |
| Phase 07 P02 | 10 min | 2 tasks | 5 files |
| Phase 07 P03 | ~1h | 2 tasks | 0 files |
| Phase 08 P01 | 10min | 2 tasks | 1 files |
| Phase 08 P02 | 25min | 2 tasks | 11 files |

## Accumulated Context

### Decisions

- 2026-11-08: There is one phase per review finding; ARCH-46..54, ADR-QD-108..116 and CCR-QD-385..393 are reserved in phase order.
- 2026-11-08: Phase 8 waits on a human checkpoint before amending ADR-QD-094.

- 2026-11-08 (planner): Phase 1 takes `AuthorizeRequest.ts` out of the barrel and re-exports `authorizeRequest`/`AuthorizedRequest` from `GuardApi.ts`, so no export is added or removed.
- 2026-11-08 (planner): Phase 2 keeps `onFile` off both spans (BEH-QD-227 does not promise it). `SignatureQuery` gains optional `meaning`/`signerRole`, which also amends ADR-QD-058.
- 2026-11-08 (planner): Phase 4 implements D-03 by intent. The per-entry lookup lives in `useGates`, memoised on the group atom, because reusing group atoms would break BEH-QD-068.
- 2026-11-08 (planner): Phases 5, 6 and 9 leave ADR-QD-112, ADR-QD-113 and ADR-QD-115 unused (CCR/amendment instead).
- 2026-11-08 (planner): Phase 8 removes `mapPorts`, which is **Breaking** (shipped in @qadi/core 0.10.0). The overloaded `tabulatePorts` implementation signature needs reviewer attention.
- [Phase 02]: Phase 02 P01: pose beside disclose on each port description's span attributes; readPort is the one read body, a plain function that opens no span
- [Phase 02]: Phase 02 P01: D-03 recorded, local and served signature spans are equal including meaning, signer_role and matched; onFile is on neither span
- [Phase 02]: Phase 02 P01: the three resource-scoped reads annotate the question twice with agreeing values on the success path, to keep annotate-then-validate literal (ADR-QD-109 consequence)
- [Phase 02]: 02-02: signature request key is [subjectId, resourceId, meaning, signerRole]; wire question gains optional meaning/signerRole — Injective over every argument the port receives (INV-QD-043). (The original claim that over-keying "can only miss and deny" was false under `not(hasSignature)`; corrected by WR-03/WR-04, see below.) SignatureLedgerTest groups by the requirement-less key because a store answers every signature on file.
- [Phase 02]: INV-QD-244 used for the new span invariant (next-id printed 244; phase 1 took 243)
- [Phase 02]: ADR-QD-109 records onFile on neither span and names PORT-04's inaccurate premise
- [Phase 02]: 02-04: the one-port-read changeset is not marked Breaking; the reshaped PortSpanAttributes and removed PortWireSpan/spanQuestion/spanAnswer were never published (0.11.0 predates ARCH-21 and ARCH-31)
- [Phase 02] review fix WR-01: `disclose` runs under `catchPortDefect`, so a malformed store answer is the port's typed error. Wire-visible change: a served read of one now replies `Unavailable` (was `Refused: Unencodable`)
- [Phase 02] review fix WR-02: the annotate-before-validate question is `pose` of the request plus the read's own `scope: "Resource"`, not hand-written
- [Phase 02] review fix WR-04 (user decision): devtools replay answers an unseen SignatureHistory request as `SignatureHistoryUnavailable`, not an empty list; per-port `UNSEEN_REQUEST_IS_AN_OUTAGE` table in Capture.ts (INV-QD-043 1.80, ADR-QD-109 1.4, BEH-QD-221)
- [Phase 03]: 03-01: ArchiveRoundTrip.test.ts imports only AuditArchive.ts, AuditEntry.ts and helpers.ts so it stays unchanged through plan 03-02 and proves the refactor preserved behavior
- [Phase 03]: ArchiveFacts.ts owns the archive order, claim rule and sequence break; the reader derives its out-of-order index from the writer's comparator and never sorts or repairs
- [Phase 03]: verifySequenceIntegrity is an unnamed Effect.fn over verifiedArchiveFacts, so span qadi.audit.verifySequenceIntegrity opens once per call and UNTRACED_BUDGET is unchanged
- [Phase 03]: ADR-QD-110 and CCR-QD-387 used as reserved; ADR-QD-056 amended; INV-QD-054 Implication left untouched
- [Phase 03] review fix WR-01 (decision delegated by user): the writer refuses a non-safe-integer sequenceNumber with the new public `SequenceNumberInvalid` (ArchiveFacts.ts states the domain with the codec's `Schema.Int`); changeset is now minor with a **Breaking.** note (ADR-QD-110 D-48-g)
- [Phase 04]: Gate writer resolved once in QadiProvider and carried to gates on an internal GateScopeContext declared in GateWriter.ts, never on public QadiContextValue (D-01)
- [Phase 04]: useDecisionSuspense suspends on the atom useGate opened; decision opener count 2 -> 1 (D-04)
- [Phase 04]: 04-02: usePolicies does not re-create its group atom or registrations across equal re-renders (pinned by hooks.rerender.test.tsx); GateWriter.ts needs no Equal-keyed memo (D-07)
- [Phase 04]: 04-02: the one per-entry decision lookup lives in useGates, memoised on the group, not the group atom as identity, so a changed entry re-registers alone (D-03, BEH-QD-068)
- [Phase 04]: ADR-QD-111 written (not a CCR-only note) because ADR-QD-080's amendment names the writer lookup as serving every guard; CCR-QD-388 registered; patch changeset for @qadi/react
- [Phase 04]: 04-04: Playwright's sudo-only dependency install was skipped in check:pr step 13; test:e2e run directly (30 passed) and steps 14-16 run individually
- [Phase 05]: 05-01: frame moves into DecisionLogHttp.ts and is re-exported by name from DecisionStreamRoute.ts (avoids a module cycle); syncedFrame stays in the stream route
- [Phase 05]: 05-01: DecisionStreamOptions extends DecisionLogServeOptions; one reportRefused factory with per-route span and message (byte-identical to HEAD)
- [Phase 05]: 05-02: no ADR for ARCH-50 — the refusal policy's documented owner is still core's reportEncodeRefusal (ADR-QD-095 D-09-e); reserved ADR-QD-112 left unused, CCR-QD-389 records it
- [Phase 05]: 05-02: new behaviour is BEH-QD-337 in 26-decision-stream.md; pnpm check:pr step 13 (playwright install --with-deps) needs sudo on this host, all other steps and the example e2e passed when run directly
- [Phase 05]: UAT: full `pnpm check:pr` exit 0 (16/16) with Playwright's `--with-deps` apt install neutralized by a no-op `sudo` on PATH for that one process — on Fedora it falls back to Ubuntu `apt-get`, so it cannot pass here even with sudo
- [Phase 06]: dehydrateWith resolves its dropped-entries reporter inside the drop branch (as dehydrateDecisions did); option names includeTrace/onDropped unchanged; D-09 grep clean so removing the private builders and wrapper is not breaking
- [Phase 06]: ADR-QD-078 amended (2026-11-08) rather than superseded by ADR-QD-113; ADR-QD-113 left unused — The amendment fits in one paragraph (D-08 threshold); CCR-QD-390 used as reserved
- [Phase 06]: UAT: literal `pnpm check:pr` exit 0 (16/16, step 13 including `playwright install --with-deps chromium`) in a rootless podman Ubuntu 24.04 container (`mcr.microsoft.com/playwright:v1.65.0-noble`, Node 26.13.0, pnpm 10.17.1) from a clean copy of the working tree — no host workaround needed. Node 26 ships no corepack (install pnpm via npm); copy only `git ls-files -co --exclude-standard` so stale `.tsbuildinfo` doesn't fake a built `lib/`
- [Phase 07]: PortRouteAddress.ts is a leaf module (not PortRoutes.ts) so the browser-bundled client does not depend on the server route code; portPath takes and returns template-literal path types; PORT_REPLY_STATUS stays in PortRoutes.ts and only the reply-body contract moved beside the address.
- [Phase 07]: 07-02: no ADR for ARCH-52 (no export change, ADR-QD-107 route design unchanged); BEH-QD-338 holds the address and reply-body contract, BEH-QD-333 points to it; CCR-QD-391 recorded; ADR-QD-114 stays reserved for ARCH-53
- [Phase 07]: 07-03: records matched the built tree, nothing corrected; pnpm check:pr steps 13-16 run individually after sudo-blocked Playwright install, accepted by the user for XC-01
- [Phase 07] review fix WR-01: `portPath` strips trailing slashes from the prefix (`/x/ports/` and `/x/ports//` → `/x/ports/<Port>`); BEH-QD-338 updated; re-verified 9/9 passed after the fix
- [Phase 07]: UAT: literal `pnpm check:pr` exit 0 (16/16) on a clean clone of 88187a5 in the podman Ubuntu Playwright container (same route as Phase 06); vitest 3974+559+42, e2e 30/30
- [Phase 08]: D-01 approved: port descriptions may carry a serving facet (amends ADR-QD-094); plans 08-03/08-04 run, 08-05 skips
- [Phase 08]: D-07: tabulatePorts is two overloads over one body; separate layer builder removed. D-08: fixturePortsLayer derived from the registry with no as. D-09: testing passes ports to core unchanged

### Pending Todos

- Confirm the reserved ADR/CCR/ARCH numbers are still free before each phase executes.

### Blockers/Concerns

- [Phase 01] `pnpm example` cannot finish on this Fedora host without sudo (`playwright install --with-deps`); UAT ran its e2e suite directly (30/30). A single uninterrupted `pnpm check` run still needs CI or a host with sudo. [Phase 03] Workaround used: the check:pr chain run in order with only that one command as `playwright install chromium` (browser and system libs already present) — all steps green, e2e 30/30. [Phase 06] Resolved route: run the literal `pnpm check:pr` in a podman Ubuntu Playwright container (see the Phase 06 UAT decision) — exits 0 with no workaround.
- [Phase 01] 01-VALIDATION.md is still `draft` (nyquist audit not completed); REQUIREMENTS.md has no Traceability rows for ENF-01..06/XC-01..05 and ENF-03 is unregistered (phase.complete warnings).

- Phase 8 Plan 08-01 is a blocking human checkpoint (SERV-01: amend ADR-QD-094 or not).
- `.planning/` is gitignored (`.gitignore:43`) even though `commit_docs: true`. Committing planning docs needs `git add -f` or a .gitignore change.
- Shared spec files (README, traceability, invariants, overview, decisions/index.yaml) are edited by every phase, so parallel worktrees will conflict on revision lines. Use `scripts/spec-revise.mjs`.
- BEH/INV ids are allocated at execution time with `node scripts/next-id.mjs`.
- [Phase 02] Pre-existing, out of scope: in devtools replay the other four ports' `none` answers (attribute `undefined`, relationship/history `Unknown`, custom `false`) still grant under `not(...)` on a capture miss — the INV-QD-007 fail-open an unwired deployment also has. Flipping them is one word each in Capture.ts's `UNSEEN_REQUEST_IS_AN_OUTAGE`; needs a decision.
- Seven info-level review findings for Phase 02 remain open (02-REVIEW-DISPOSITION.md: IN-01..07).
- Three info-level review findings for Phase 07 remain open (07-REVIEW-DISPOSITION.md: IN-01..03).
- [Phase 05] Three review findings open (05-REVIEW-DISPOSITION.md): WR-01, no route-level test that `decisionStreamRoute` threads `onRefused` to `decisionFrames`; IN-01 (`DecisionLogServeOptions` package-private yet shapes public options); IN-02 (refusal table's SSE cells don't assert `event:`/`id:`).
- Every other ROADMAP phase still lists `XC-01..05` as a range, which `phase.complete` cannot parse (Phase 05's line was expanded); `XC-01..05` traceability row stays Pending as cross-cutting.
- [Phase 04] Five review findings open (04-REVIEW-DISPOSITION.md): WR-01, the D-04 test never exercises a cold suspend (needs a latched-port cold case); IN-01..04 (unused `useGateRegistration`, stale `useAtomValue` comment, unmarked dep-array omissions, overstated test header).

## Session Continuity

Last session: 2026-11-08T13:31:33.361Z
Stopped at: Completed 08-02-PLAN.md
Resume file: None
