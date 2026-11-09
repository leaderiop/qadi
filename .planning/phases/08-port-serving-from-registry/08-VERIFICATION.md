---
phase: 08-port-serving-from-registry
verified: 2026-11-09T00:00:00Z
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
  - "packages/core/test/PortRemote.test.ts"
  - "packages/testing/src/QadiReviewLayer.ts"
  - "spec/behaviors/34-remote-ports.md"
covered_digest: "v4:sha256:83bfed77659c33e391ed762bfa2f50958336b752ab085b305bb97d4b6d07eed9"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 8/8
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run `pnpm check:pr` end to end on a host with passwordless sudo, or read CI for this branch"
    expected: "Exit 0 across all 16 steps, including step 13 (`pnpm example`, whose `playwright install --with-deps chromium` needs sudo)"
    why_human: "On this host the single run exited 1 at step 13 for a sudo-password reason. Every individual step was re-run and passes (see Behavioral Spot-Checks), but no single `check:pr` run has exited 0, and XC-01 is worded as that. Also persisted in 08-UAT.md."
---

# Phase 8: Port serving from the registry Verification Report

**Phase Goal:** The serving allowlist and leaf-to-port mapping derive from port descriptions, and pass-through port enumerations are removed.
**Verified:** 2026-11-09
**Status:** human_needed (all code truths verified; one environmental confirmation of XC-01 outstanding)
**Re-verification:** Yes. The prior report went stale because commit 6ac8416 (WR-01 fix) changed `packages/core/src/PortRemote.ts` after it was written. The whole phase was re-checked against HEAD.

## What changed since the prior verification

`git diff 555e1d2..HEAD` over `packages/` and `spec/` touches exactly three files: `packages/core/src/PortRemote.ts` (+10/-1), `packages/core/test/PortRemote.test.ts` (+31), `spec/behaviors/34-remote-ports.md` (BEH-QD-331, Rev 1.5). No other source file changed, so truths that do not run through `answerRemotely` are unaffected by the fix.

### WR-01 fix, checked on the code and not the summary

`answerRemotely` (`PortRemote.ts:71-81`) now computes:

```ts
const notServed = Array.isArray(admitted)
  ? asked === undefined || !admitted.includes(asked)
  : admitted !== undefined || d.serving.allowlist === "required";
```

Preservation of prior behavior, case by case:

| Declaration state | Port word | Before (6ac8416^) | Now | Preserved? |
|---|---|---|---|---|
| list present, name listed | any | served | served | yes |
| list present, name not listed or `asked` undefined | any | refused | refused | yes |
| list missing (`undefined`) | `open` (Relationship, DecisionHistory) | served | served | yes (still open) |
| list missing | `opt-in` (SignatureHistory: `admitted: () => undefined`, `asked: () => undefined`) | served | served | yes, so the opt-in port is not accidentally closed |
| list missing | `required` (Attribute, CustomPredicate) | served (hole) | refused `NotServed` | intended tightening, WR-01 |
| non-list defined value (string, `null`) | any | refused only by luck, or substring `includes` | refused | intended tightening |

Every allowlist word in the tree was enumerated (`grep 'allowlist: "'`): `required` on `AttributeResolver.ts:149` and `CustomPredicate.ts:178`, `open` on `DecisionHistory.ts:155` and `RelationshipResolver.ts:202`, `opt-in` on `SignatureHistory.ts:209`. A typed `PortServingOf<K>` always carries an array for a required port, so no well-typed caller is affected. `allowlist` now has a runtime consumer, which was the review's complaint.

Test coverage of the fix: `PortRemote.test.ts` adds two tests, "a required attribute list that is missing or not a list serves nothing" (`{}`, `{"attributes":null}`, `{"attributes":"clearance"}`, probing `clearance`, `constructor`, `__proto__`) and the predicate equivalent. Both assert `Refused: NotServed` and zero store calls. Existing tests still pin the "empty list admits nothing" and "open port with no list admits any name" cases. Independent mutation check run by the verifier: with `PortRemote.ts` temporarily restored to `6ac8416^`, `vitest run --project core PortRemote` gave 2 failed / 81 passed; with HEAD restored, 83 / 83 passed. The tests therefore bind to the fix. (The working tree was restored and is clean in `packages/`.)

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria plus plan must-haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A human checkpoint on amending ADR-QD-094 is resolved before code changes (SERV-01) | VERIFIED | `08-01-SUMMARY.md` records `d01_outcome: approved`. 08-01 touched only `spec/`. CCR-QD-392 row present in `spec/README.md`. Unchanged by the fix. |
| 2 | Each port description states its `serving` facet; `ADMITTED`, `Collector`, `collectNames` and the per-port sets in `servingFor` are derived from the registry (SERV-02) | VERIFIED | `grep -E "ADMITTED\|collectNames\|interface Collector\|mapPorts\|answersOf\|layersOf" packages/*/src packages/*/test` returns nothing. `PortDescription.ts:120` has a required `serving` member. All five port modules set `serving:` (`AttributeResolver.ts:177`, `CustomPredicate.ts:213`, `DecisionHistory.ts:183`, `RelationshipResolver.ts:233`, `SignatureHistory.ts:245`). `answerRemotely` admits through `d.serving.admitted` and `d.serving.asked` and, after the fix, `d.serving.allowlist`. `servingFor` folds over the registry with no port or field literal. The WR-01 fix preserves this: admission is still decided entirely by the facet. |
| 3 | The public `PortServing` shape is unchanged (SERV-03) | VERIFIED | `PortServing.ts:39-45` has the same five optional members. Still exported from the barrel. `pnpm typecheck` exit 0 (orchestrator, at HEAD). |
| 4 | `mapPorts` no longer exists apart from `tabulatePorts` (SERV-04) | VERIFIED | One `tabulatePorts` with two overloads in `Ports.ts`. No `mapPorts` under `packages/*/src` or `packages/*/test`. |
| 5 | `fixturePortsLayer` derives from the registry (SERV-04) | VERIFIED | `mergePorts(tabulatePorts(...))` with no per-port enumeration. Ports and PortsLayer suites pass. |
| 6 | `@qadi/testing` has no `answersOf`/`layersOf` split (SERV-04) | VERIFIED | `QadiReviewLayer.ts` calls `fixturePortsLayer(options?.ports)`. No matches for either name in `packages/`. |
| 7 | SERV-05 (rejection branch) | VERIFIED by branch | D-01 approved, so the conditional does not apply. 08-05 is `status: skipped` with a reason. SERV-04 shipped regardless. |
| 8 | ADR-QD-114, CCR-QD-392 and a changeset are recorded (ROADMAP SC4, XC-02) | VERIFIED | ADR-QD-114 exists, ADR-094 amended, BEH-QD-331 now Rev 1.5 with the run-time fail-closed statement (`34-remote-ports.md:75-77`), CCR-QD-392 row, `.changeset/port-serving.md`. `node scripts/spec-revise.mjs --check` reports every Revision matches its newest Change History entry. |

**Score:** 8/8 truths verified (0 present, behavior-unverified).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/PortServing.ts` | Leaf module with `PortServing`, `PortServingOf`, `PortServingFacet` | VERIFIED | Substantive, type-only. |
| `packages/core/src/PortDescription.ts` | Required `serving` member | VERIFIED | Line 120. |
| `packages/core/src/PortRemote.ts` | Admission and `servingFor` through facets, fail-closed on a missing required list | VERIFIED | Lines 66-83. |
| `packages/core/src/Ports.ts` | `tabulatePorts` as the one builder | VERIFIED | |
| `packages/testing/src/QadiReviewLayer.ts` | Pass `ports` through | VERIFIED | |
| `spec/decisions/114-a-port-states-what-it-serves.md` | ADR | VERIFIED | |
| `.changeset/port-serving.md` | Release note | VERIFIED | |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `answerRemotely` | each port's facet | `d.serving.admitted` / `asked` / `allowlist` | WIRED | `PortRemote.ts:68-81`. |
| `servingFor` | each port's facet | `forEveryPort` + `leaves` / `declare` | WIRED | Pinned by the generated-policy property test in `PortRemote.test.ts`. |
| `@qadi/testing` | core | `fixturePortsLayer(options?.ports)` | WIRED | |
| `@qadi/devtools` | core | `fixturePortsLayer` | WIRED | Typecheck and devtools tests pass. |

### Data-Flow Trace (Level 4)

Not applicable: a library-internal derivation with no rendered dynamic data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Port serving, ports and layer suites | `vitest run --project core PortRemote Ports PortsLayer` | 5 files, 171 passed | PASS |
| WR-01 tests bind to the fix | `PortRemote.ts` restored to `6ac8416^`, then `vitest run --project core PortRemote` | 2 failed / 81 passed; after restoring HEAD, 83 / 83 passed | PASS |
| Whole-repo typecheck and tests at HEAD | `pnpm typecheck`, `pnpm test` (run by the orchestrator, relied on) | exit 0; 157 files, 3988 tests passed | PASS |
| House style and lint | `pnpm lint` | "407 file(s) clean (3 declared switch(es))" | PASS |
| Spec traceability | `pnpm spec:verify:strict`; `node scripts/spec-revise.mjs --check` | 21 pass, 0 fail, 0 skip; revisions match | PASS |
| Removed names | grep over `packages/*/src` and `packages/*/test` | none found | PASS |
| Coverage, circular, tstyche, other spec gates | Verified at the prior pass (`pnpm coverage` exit 0, 99.1% statements and 96.81% branches; `circular`, `test:tstyche`, `spec:api/gates/claims/examples/package` exit 0). Not re-run in this pass, but only `PortRemote.ts` changed in `src`, and the change adds tests that cover both new branches | carried forward | PASS (carried) |
| Full `pnpm check:pr` | `node scripts/run-check.mjs --skip-mutation` | Not re-run. 08-06 reports exit 1 at step 13 on a sudo prompt | SEE HUMAN ITEM |

### Probe Execution

No phase-declared probes. Skipped.

### Requirements Coverage

Every ID in the PLAN frontmatter and the ROADMAP is accounted for in REQUIREMENTS.md (checkboxes at lines 104-113 and 128-134 are `[x]`, and the traceability table maps `SERV-01..05` and `XC-01..05` to Phase 8). No orphaned requirement. The traceability table still reads "Pending" for those two rows (`REQUIREMENTS.md:160,162`); that is a bookkeeping note for the orchestrator at phase close and not a code gap.

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| SERV-01 | 08-01 | SATISFIED | Truth 1. |
| SERV-02 | 08-03, 08-04 | SATISFIED | Truth 2, strengthened by WR-01 (the `allowlist` word is now consumed at run time). |
| SERV-03 | 08-03 | SATISFIED | Truth 3. |
| SERV-04 | 08-02 | SATISFIED | Truths 4-6. |
| SERV-05 | 08-05 (skipped) | SATISFIED by branch | Truth 7. |
| XC-01 | 08-06 | SATISFIED WITH CAVEAT | Constituent steps pass; no single exit-0 run (human item). |
| XC-02 | 08-04, 08-06 | SATISFIED | Truth 8; BEH-QD-331 Rev 1.5 recorded for the fix. |
| XC-03 | 08-02, 08-03 | SATISFIED | `spec:api` exit 0 at prior pass; fix adds no export. |
| XC-04 | all | SATISFIED | A scan of added, non-comment lines in the `packages/*/src` diff (799a928..HEAD) for `as`, `switch`, `fnUntraced`, `async`, `await`, `console.`, `: any` found nothing; the fix uses `Array.isArray`, no cast. House style reports the 3 budgeted switches. |
| XC-05 | all | SATISFIED | Coverage exit 0 at prior pass; the fix's two branches are exercised by the two new tests. |

### Anti-Patterns Found

No TBD/FIXME/XXX markers or stubs in changed source.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/core/src/PortRemote.ts` | ~175 | IN-01: `leaves[tag]` plain-object lookup | Info | Open per the disposition. A typed `Policy` cannot carry a prototype tag. |
| `packages/core/src/SignatureHistory.ts` | 210-214 | IN-02: `"own-records"` sentinel passed through the name channel | Info | Open per the disposition. Readability only. |

WR-01 is resolved (disposition: fixed, 6ac8416) and was confirmed above on the code and by mutation.

### Human Verification Required

#### 1. Confirm `pnpm check:pr` green end to end (XC-01)

**Test:** Run `pnpm check:pr` on a host where `playwright install --with-deps` can use sudo, or check CI for the branch.
**Expected:** Exit 0 for all 16 steps.
**Why human:** The only failing step on this host is environmental (sudo password). Typecheck, the full test suite, lint and the spec gates were observed green at HEAD in this pass (the earlier pass also ran circular, tstyche, coverage and the remaining spec gates). The 08-06 summary reports e2e, `spec:website-examples`, `website` and `spec:publish` exit 0, which were not re-run. An exit-0 `check:pr` run has still not been observed, and nothing in this pass can establish it. This item is also persisted in `08-UAT.md`.

### Gaps Summary

There are no gaps. Re-verification against HEAD confirms every code-level truth (SERV-01 through SERV-05, XC-02 through XC-05). The WR-01 fix is narrowly scoped (10 lines in `answerRemotely`), preserves admission for every typed declaration and for the open and opt-in ports, and closes the fail-open path for required ports. It is covered by two tests that demonstrably fail without it, and its behavior is stated in BEH-QD-331 Rev 1.5. One item remains for a human: an exit-0 `pnpm check:pr` on a sudo-capable host or in CI (XC-01). IN-01 and IN-02 remain open as Info findings and do not affect the goal.

---

_Verified: 2026-11-09_
_Verifier: Claude (gsd-verifier)_
