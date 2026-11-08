---
phase: 08-port-serving-from-registry
verified: 2026-11-08T16:10:00Z
status: human_needed
score: 8/8 must-haves verified
covered_files:
  - ".planning/phases/08-port-serving-from-registry/08-01-PLAN.md"
  - ".planning/phases/08-port-serving-from-registry/08-01-SUMMARY.md"
  - ".planning/phases/08-port-serving-from-registry/08-02-PLAN.md"
  - ".planning/phases/08-port-serving-from-registry/08-02-SUMMARY.md"
  - ".planning/phases/08-port-serving-from-registry/08-03-PLAN.md"
  - ".planning/phases/08-port-serving-from-registry/08-03-SUMMARY.md"
  - ".planning/phases/08-port-serving-from-registry/08-04-PLAN.md"
  - ".planning/phases/08-port-serving-from-registry/08-04-SUMMARY.md"
  - ".planning/phases/08-port-serving-from-registry/08-05-PLAN.md"
  - ".planning/phases/08-port-serving-from-registry/08-05-SUMMARY.md"
  - ".planning/phases/08-port-serving-from-registry/08-06-PLAN.md"
  - ".planning/phases/08-port-serving-from-registry/08-06-SUMMARY.md"
  - "packages/core/src/PortDescription.ts"
  - "packages/core/src/PortRemote.ts"
  - "packages/core/src/PortServing.ts"
  - "packages/core/src/Ports.ts"
  - "packages/testing/src/QadiReviewLayer.ts"
covered_digest: "v4:sha256:67e8ba9df91cc17500b89b7cc7080e7ba8cc3819d6b239002f0e772edbc882d1"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Run `pnpm check:pr` end to end on a host with passwordless sudo, or read CI for this branch"
    expected: "Exit 0 across all 16 steps, including step 13 (`pnpm example`, whose `playwright install --with-deps chromium` needs sudo)"
    why_human: "On this host the single run exited 1 at step 13 for a sudo-password reason. Every individual step was re-run and passes (see Behavioral Spot-Checks), but no single `check:pr` run has exited 0, and XC-01 is worded as that."
---

# Phase 8: Port serving from the registry Verification Report

**Phase Goal:** The serving allowlist and leaf-to-port mapping derive from port descriptions, and pass-through port enumerations are removed.
**Verified:** 2026-11-08
**Status:** human_needed (all code truths verified; one environmental confirmation of XC-01 outstanding)
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria plus plan must-haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A human checkpoint on amending ADR-QD-094 is resolved before code changes (SERV-01) | VERIFIED | `08-01-SUMMARY.md` frontmatter `d01_outcome: approved`, `d01_date: 2026-11-08`. 08-01 touched only `spec/README.md`; the first `packages/` commit belongs to 08-02. The CCR-QD-392 row is present in `spec/README.md`. |
| 2 | Each port description states its `serving` facet; `ADMITTED`, `Collector`, `collectNames` and the per-port sets in `servingFor` are derived from the registry (SERV-02) | VERIFIED | `grep ADMITTED\|collectNames\|interface Collector\|mapPorts\|answersOf\|layersOf packages/*/src` returns nothing. `PortDescription.ts:120` has a required `serving: PortServingFacet<N, Args>`. All five modules set `serving:` (`AttributeResolver.ts:177`, `CustomPredicate.ts:213`, `DecisionHistory.ts:183`, `RelationshipResolver.ts:233`, `SignatureHistory.ts:245`). `answerRemotely` admits through `d.serving.admitted(serving)` and `d.serving.asked(args)` (`PortRemote.ts:69-73`). `servingFor` (`PortRemote.ts:~190-205`) is a fold over `forEveryPort` using `d.serving.leaves` and `d.serving.declare`, with no port or field name literal inside it. A facet's `allowlist` word is type-checked against its `PortServing` slot (`PortServing.ts` `AllowlistOf`). |
| 3 | The public `PortServing` shape is unchanged (SERV-03) | VERIFIED | `PortServing.ts` has the same five optional members (`attributes` required list, `relations?`, `events?`, `names` required list, `signatures: "own-records"`). `PortServing` and `PortServingOf` moved file only; they are still exported through the `index.ts` barrel. The `@qadi/http` consumer compiles unchanged (`pnpm typecheck` exit 0). |
| 4 | `mapPorts` no longer exists apart from `tabulatePorts` (SERV-04) | VERIFIED | `Ports.ts:175-187`: one `tabulatePorts` with two overloads over a single five-row body. No `mapPorts` under `packages/*/src` or `packages/*/test`. It survives only in CHANGELOG history, ADR/README history and the upgrading page's migration note. |
| 5 | `fixturePortsLayer` derives from the registry (SERV-04) | VERIFIED | `fixturePortsLayer(setups?)` is `mergePorts(tabulatePorts(...))` over `PORT_FIXTURES`/`NONE` with no per-port enumeration (08-02 SUMMARY; `Ports.ts` ~L205-260). `Ports.test.ts`, `PortsLayer.test.ts` (including layer-wins and fail-closed cases) pass. |
| 6 | `@qadi/testing` has no `answersOf`/`layersOf` split (SERV-04) | VERIFIED | `QadiReviewLayer.ts:149` calls `fixturePortsLayer(options?.ports)`; there is no match for `answersOf` or `layersOf` anywhere in `packages/`. |
| 7 | SERV-05 (rejection branch) | VERIFIED by branch | D-01 was approved, so the conditional "if the checkpoint rejects" does not apply. SERV-04 shipped regardless (truths 4-6). 08-05 is correctly `status: skipped` with `skipped_reason`, no ADR-094 rejection note was written, and ADR-QD-114 exists in its place. The requirement is not missing. |
| 8 | ADR-QD-114, CCR-QD-392 and a changeset are recorded (ROADMAP SC4, XC-02) | VERIFIED | `spec/decisions/114-a-port-states-what-it-serves.md` exists. ADR-094 is at Rev 1.7 with the serving and always-ship amendments. `spec/behaviors/34-remote-ports.md` has BEH-QD-331 (Rev 1.4). `spec/README.md` has the CCR-QD-392 row. `.changeset/port-serving.md` is present, states `mapPorts` as Breaking with a migration, and gives published status accurately. |

**Score:** 8/8 truths verified (0 present, behavior-unverified).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/PortServing.ts` | Leaf module: `PortServing`, `PortServingOf`, `PortServingFacet`, `ServedLeaves` | VERIFIED | Substantive and type-only. It imports only `Policy` and `PortName` as types; `pnpm circular` exits 0. |
| `packages/core/src/PortDescription.ts` | Required `serving` member | VERIFIED | Line 120. |
| `packages/core/src/PortRemote.ts` | Admission and `servingFor` through facets | VERIFIED | See truth 2. |
| `packages/core/src/Ports.ts` | `tabulatePorts` as the one builder | VERIFIED | Truth 4. |
| `packages/testing/src/QadiReviewLayer.ts` | Pass `ports` through | VERIFIED | Truth 6. |
| `spec/decisions/114-a-port-states-what-it-serves.md` | ADR | VERIFIED | Exists, listed in the index (gates pass). |
| `.changeset/port-serving.md` | Release note | VERIFIED | Content checked against the actual removals. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `answerRemotely` | each port's facet | `d.serving.admitted` / `d.serving.asked` | WIRED | `PortRemote.ts:69-73`. |
| `servingFor` | each port's facet | `forEveryPort` + `d.serving.leaves` / `declare` | WIRED | Pinned by the unchanged generated-policy property test in `PortRemote.test.ts` (123 tests across PortRemote, Ports and PortsLayer pass). |
| `@qadi/testing` | core | `fixturePortsLayer(options?.ports)` | WIRED | `QadiReviewLayer.ts:149`. |
| `@qadi/devtools` | core | `fixturePortsLayer` (`SimulationSource.ts`, `Capture.ts`) | WIRED | Typecheck and devtools tests pass (orchestrator: 157 files / 3986 tests). |

### Data-Flow Trace (Level 4)

Not applicable. This is a library-internal derivation with no rendered dynamic data. The data flow is registry to facet to admission and declaration, covered by the tests above.

### Behavioral Spot-Checks

Run independently by the verifier on HEAD:

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Port serving, ports, layer tests | `vitest run --project core PortRemote Ports PortsLayer` | 123 passed | PASS |
| Typecheck | `pnpm typecheck` | exit 0 | PASS |
| Cycles | `pnpm circular` | exit 0 | PASS |
| Type tests | `pnpm test:tstyche` | exit 0 | PASS |
| Lint and house style | `pnpm lint` | "407 file(s) clean (3 declared switch(es))"; remaining warnings are in untouched files | PASS |
| Coverage | `pnpm coverage` | exit 0; statements 99.1%, branches 96.81%, functions 99.08%, lines 99.54% | PASS |
| Spec gates | `spec:api`, `spec:verify:strict`, `spec:gates`, `spec:claims`, `spec:examples`, `spec:package` | all exit 0 | PASS |
| Full `pnpm check:pr` | `node scripts/run-check.mjs --skip-mutation` | Not re-run. 08-06 reports exit 1 at step 13 on a sudo prompt; steps 14-16 plus e2e were run by hand and passed | SEE HUMAN ITEM |

### Probe Execution

No phase-declared probes (`probe-*.sh`). Skipped.

### Requirements Coverage

Every ID in the PLAN frontmatter and the ROADMAP is accounted for in REQUIREMENTS.md (the traceability table uses the ranges `SERV-01..05` and `XC-01..05`, both mapped to Phase 8). No orphaned requirement.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SERV-01 | 08-01 | Human checkpoint on the ADR-094 amendment before code | SATISFIED | Truth 1. |
| SERV-02 | 08-03, 08-04 | Serving facet per port; allowlist and tables derived | SATISFIED | Truth 2. |
| SERV-03 | 08-03 | `PortServing` shape unchanged | SATISFIED | Truth 3. |
| SERV-04 | 08-02 | Pass-through enumerations removed | SATISFIED | Truths 4-6. |
| SERV-05 | 08-05 (skipped) | Rejection branch records an ADR-094 note | SATISFIED by branch | Truth 7. |
| XC-01 | 08-06 | `check:pr` green | SATISFIED WITH CAVEAT | Every constituent step passes; no single exit-0 run (human item). |
| XC-02 | 08-04, 08-06 | ADR, CCR row, spec/README history line, traceability rows, changeset | SATISFIED | Truth 8; `spec-revise --check` and `spec:verify:strict` pass. |
| XC-03 | 08-02, 08-03 | `spec/overview.md` names added exports and drops removed ones | SATISFIED | `pnpm spec:api` exit 0; the overview is at Rev 1.76. |
| XC-04 | all | No new `as`, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, `console.*` | SATISFIED | A scan of the `packages/*/src` diff (799a928..HEAD) for those tokens, excluding comments, found nothing. House-style reports 3 switches, the budget. |
| XC-05 | all | Coverage thresholds | SATISFIED | Truth above: the coverage run exited 0 at the stated figures. |

### Anti-Patterns Found

No TBD/FIXME/XXX markers or stubs in the changed source. Findings from `08-REVIEW.md`, independently confirmed:

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/core/src/PortRemote.ts` | 69-73 | WR-01: `admitted === undefined` serves the port open even for `allowlist: "required"`; nothing reads `.allowlist` at runtime | Warning | Reachable only through an untyped or config-loaded declaration. Pre-existing: the removed `ADMITTED` check at `799a928:PortRemote.ts:101-103` had the identical condition, so there is no regression. No SERV requirement demands the stricter behavior. Left open in the disposition. |
| `packages/core/src/PortRemote.ts` | 175 | IN-01: `leaves[tag]` plain-object lookup | Info | Low severity; a typed `Policy` cannot carry a prototype tag. |
| `packages/core/src/SignatureHistory.ts` | 210-214 | IN-02: `"own-records"` sentinel passed through the name channel | Info | Readability only. |

### Human Verification Required

#### 1. Confirm `pnpm check:pr` green end to end (XC-01)

**Test:** Run `pnpm check:pr` on a host where `playwright install --with-deps` can use sudo, or check CI for the branch.
**Expected:** Exit 0 for all 16 steps.
**Why human:** The only failing step on this host is environmental (sudo password). The verifier re-ran typecheck, lint, circular, tstyche, coverage, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api and spec:package, all exit 0. The 08-06 summary reports e2e (30 tests), `spec:website-examples`, `website` and `spec:publish` all exit 0, which the verifier did not re-run. Step 13's sandbox failure is not a code failure, but an exit-0 run has not been observed.

### Gaps Summary

There are no gaps. Every code-level truth (SERV-01 through SERV-05 and XC-02 through XC-05) is verified against the tree, not against the summaries. The `mapPorts`/`answersOf`/`layersOf`/`ADMITTED`/`Collector`/`collectNames` removals are real, the facets are required on the description type, and the admission and `servingFor` paths run through them. D-01 was approved, so skipping 08-05 follows the plan and SERV-05 is satisfied by that branch. Two items remain for a human: confirm `check:pr` on a sudo-capable host or in CI (XC-01), and decide whether to schedule the open WR-01 warning. WR-01 is pre-existing behavior and does not block the phase goal.

---

_Verified: 2026-11-08_
_Verifier: Claude (gsd-verifier)_
