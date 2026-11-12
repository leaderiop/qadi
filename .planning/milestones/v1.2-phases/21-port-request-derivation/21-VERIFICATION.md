---
phase: 21-port-request-derivation
verified: 2026-11-12T01:30:00Z
status: passed
score: 6/6 must-haves verified
covered_files:
  - .planning/phases/21-port-request-derivation/21-01-PLAN.md
  - .planning/phases/21-port-request-derivation/21-01-SUMMARY.md
  - .planning/phases/21-port-request-derivation/21-02-PLAN.md
  - .planning/phases/21-port-request-derivation/21-02-SUMMARY.md
  - .planning/phases/21-port-request-derivation/21-03-PLAN.md
  - .planning/phases/21-port-request-derivation/21-03-SUMMARY.md
  - .planning/phases/21-port-request-derivation/21-04-PLAN.md
  - .planning/phases/21-port-request-derivation/21-04-SUMMARY.md
  - .planning/phases/21-port-request-derivation/21-05-PLAN.md
  - .planning/phases/21-port-request-derivation/21-05-SUMMARY.md
  - packages/core/src/AttributeResolver.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/src/DecisionHistory.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/PortSpanEncode.ts
  - packages/core/src/PortWireEncode.ts
  - packages/core/src/RelationshipResolver.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/test/PortConformance.test.ts
  - packages/core/test/PortDescription.test.ts
  - packages/core/test/PortRequest.tst.ts
  - packages/core/test/PortSpan.test.ts
  - packages/core/test/PortWire.test.ts
covered_digest: "v4:sha256:e46465fd42891d54ed9b7e068034926f081dcf304f166b8f2b3c9e1674cb8e6b"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 6/6
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 21: The port request is derived from its description - Verification Report

**Phase Goal:** No port module lists its request fields by hand for its key, and a field left out of a wire or span question is a compile error.
**Verified:** 2026-11-12 against HEAD `d37a4355` of `arch-wave-7`
**Status:** passed
**Re-verification:** Yes. Previous report: 2026-11-11, `passed`, 6/6, reported `stale` because Phases 22-29 touched covered files.

## Re-verification note (what moved since 2026-11-11)

The goal still holds at HEAD; no regression. What changed underneath it:

- **Review fixes landed after the previous report.** The previous advisories WR-01 (doc overstated that absent and stated-`undefined` members differ in the key) and WR-02 (a derived key could throw on a hostile getter) are now fixed: `f0977945` rewords the law, `1d1b7a44` makes the derived key refuse instead of throw. At HEAD `makePortDescription`'s `key` (`PortDerivation.ts:110-118`) is `Result.try({ try: presentMembers(wire.toQuestion(args)), catch: KeyRefusal.Unreadable })` then `Result.flatMap(canonicalKey)`. The previous report cited `PortDerivation.ts:104-108`; the derivation is still `canonicalKey` of the wire question, now as a `Result` (ARCH-65, `PortDescription.key` returns a `Result`). So the key is still derived, only its return type grew.
- **`PortMetrics.ts` -> `PortName.ts`** (Phase 29, `2bfc6cc1`): `PortSpan.test.ts` now imports `PortName` from `../src/PortName.ts` (one-line diff). No effect on this phase's claims.
- **`PortAccess.ts` rewritten** (ARCH-70, Phase 22): not covered by this phase; it consumes `d.key`/`d.attributes.pose` and all port tests pass.
- **`scripts/check-house-style.mjs` and `spec/overview.md` differ from the phase base** (the previous report said "no diff"; true at the phase-21 commit, not now). Both are later-phase edits and neither weakens a gate: the `scripts/` diff is one doc-comment rewording in `UNTRACED_BUDGET`'s comment (`c76c3595`, Phase 22 IN-02, no budget value changed); the `spec/overview.md` diff is revision/history rows and added exports from Phases 22-29. WX-03/WX-04's "no budget weakened by Phase 21" is unaffected.
- **Line drift:** `CustomPredicate.ts` override doc is now ~L198-213 and the literal `key`/`defect` at L238-239; `signerRole` lines in `SignatureHistory.ts` are at L156/269/185 (pose/toQuestion/leaf).

## Goal Achievement

### Observable Truths (ROADMAP success criteria first, then plan-level)

| # | Truth | Status | Evidence at HEAD |
|---|-------|--------|------------------|
| SC1 | The key law (derived key = `canonicalKey` of the wire question) passes as a property over the four derived ports; CustomPredicate's override is documented and tested | VERIFIED | `PortDescription.test.ts:531` "a derived port's key is its wire question's key, and its defect is its failure (ARCH-69)": `LAWS` is a closed `{ [K in DerivedPort]: ... }` table over AttributeResolver, DecisionHistory, RelationshipResolver, SignatureHistory (FastCheck, `lawOf`), plus a hand-written-oracle test per port (IN-01 fix). Green (core 62 files / 2084 tests pass). CustomPredicate keeps literal `key`/`defect` (`CustomPredicate.ts:238-250`) with a doc comment stating both reasons (key must cover subject roles/permissions/attributes the wire question omits; `CustomPredicateError` has no `cause`, so `Cause.pretty`); the override is tested in the same describe block (21-03). |
| SC2 | A type test fails when a wire or span question omits a member (RED on the phase base) | VERIFIED | Three independent confirmations. (a) `pnpm exec tstyche PortRequest` passes at HEAD, 5 tests / 12 assertions. (b) RED on the base: detached worktree at `464544e3` (the RED commit; `packages/core/src` identical to base `ba38f367`) with `PortRequest.tst.ts` gave `Tests: 3 failed, 2 passed` on assignability assertions ("Type 'DropsSignerRole' is assignable to ..."), not compile errors; worktree removed. (c) Falsification at HEAD: deleting `signerRole` from `SignatureHistory.ts` `toQuestion` gives `TS2741: Property 'signerRole' is missing ... QuestionOf<...>`; deleting `meaning` from `pose` gives `TS2322 ... Property 'meaning' is missing`. File restored byte-for-byte (`git diff` empty). |
| SC3 | Wire-byte goldens are unchanged | VERIFIED | `PortWire.test.ts` has zero diff between the RED/golden-pin commit `464544e3` and HEAD (`git diff 464544e3 HEAD --` is 0 lines); only `464544e3` ever touched it. The goldens (L142 "The exact JSON each port's question puts on a wire") pass at HEAD. `PortSpan.test.ts` span-question rows (PREQ-05) pass; its only later edit is the `PortName` import path. No golden/snapshot/fixture file changed since base. |
| 1 | No derived port module lists request fields for its key (PREQ-01) | VERIFIED | `/usr/bin/grep -E "^  (key\|defect):"` and `canonicalKey` over the four modules: no hits; each has `makePortDescription(`. The only `canonicalKey(` call in `packages/*/src` outside `PortKey.ts` is `CustomPredicate.ts:240` (the documented override) and `PortDerivation.ts`. `makePortDescription`'s spec type omits `"wire" \| "key" \| "defect"`, so a derived port cannot state a key. |
| 2 | `defect` derived from `failure` + `Cause.squash`; CustomPredicate documented override (PREQ-02) | VERIFIED | `PortDerivation.ts:119` `defect: (args, cause) => spec.failure(args, Cause.squash(cause))`; override as SC1. |
| 3 | One law test replaces per-port pins, deleted only after green (PREQ-03) | VERIFIED | Law above. `PortConformance.test.ts` "request keys" describe now has exactly 1 `Port.key(` pin (CustomPredicate); "defect constructor (ADR-QD-077)" describe: 0. Ordering evidence unchanged from 21-03-SUMMARY (green at `7ca86f83`, pins deleted at `67b2c6ad`). |
| 4 | A field missing from a derived port's question cannot compile silently (PREQ-04) | VERIFIED | `QuestionOf<Q>` (`PortWireEncode.ts:41`) types `PortWireSpec.toQuestion` via `PortDerivation.ts` `DerivedWireSpec`; falsified as SC2(c). 0 conditional `=== undefined ? {} :` spreads inside any of the five `toQuestion` bodies (bases were 1/1/3/2). |
| 5 | Remaining restatements derived or exhaustive by type (PREQ-05) | VERIFIED | `PoseOf`/`portSpan` (`PortSpanEncode.ts:95,107`) used by all 5 modules (`portSpan({` in 5 files); pose omission falsified as SC2(c). D-05/ADR-QD-133 records the one-struct-per-port rejection. |
| 6 | Work-quality gates WX-01..06 (as of Phase 21) | VERIFIED | See Requirements Coverage and Validation rows 21-05-*. `pnpm typecheck` clean, `pnpm lint`/house-style "457 file(s) clean (3 declared switch(es))", `pnpm spec:api` 907 exports documented, `spec-revise --check` green, `spec:verify:strict` PASS 21/FAIL 0, `spec:examples` 108 blocks compile, `pnpm circular` clean. Mutation: all 9 touched files in `21-mutation-after.json` >= `21-mutation-base.json` (recorded in-phase; Stryker not re-run at HEAD per instruction). |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/PortDerivation.ts` (`makePortDescription`, `DerivedWireSpec`) | VERIFIED | exists, substantive, wired by four port modules; key/defect derived (L97-119) |
| `packages/core/src/PortWireEncode.ts` (`QuestionOf`, `presentMembers`, `portWire`) | VERIFIED | `QuestionOf<Q>` x2 refs, `encodeUnknownResult` present; `presentMembers` feeds both the key and the strict encode (L113) |
| `packages/core/src/PortSpanEncode.ts` (`PoseOf`, `portSpan`) | VERIFIED | used by all five modules |
| `packages/core/test/PortRequest.tst.ts` | VERIFIED | green at HEAD, RED on base |
| `PortDescription.test.ts` / `PortWire.test.ts` / `PortSpan.test.ts` / `PortConformance.test.ts` | VERIFIED | all pass |
| ADR-QD-133, BEH-QD-440/441, INV-QD-286, CCR-QD-411, `.changeset/port-keys-cover-the-request.md` | VERIFIED | all present and indexed |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| four port modules | `makePortDescription` | `= makePortDescription({...})` | WIRED |
| `makePortDescription.key` | `wire.toQuestion` | `presentMembers(wire.toQuestion(args))` then `canonicalKey` | WIRED |
| `portWire` encode | `presentMembers` | strict question encode of the filtered copy | WIRED |
| each port's `attributes` | `portSpan` / `PoseOf` | pose held to the span question's members | WIRED |
| key consumers (replay, `replyTable`, signature fixture) | `d.key` | devtools `Capture.test.ts` 52 pass, audit `SignatureLedger.test.ts` 24 pass | WIRED |

### Data-Flow Trace (Level 4)

Not applicable: no rendered dynamic data; the flow is request -> `toQuestion` -> `presentMembers` -> `canonicalKey` and is exercised by the property law with generated requests.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Key/wire/span/conformance suites | `pnpm vitest run --project core` on PortDescription, PortConformance, PortSpan, PortWire, SignatureHistory, PortAccess, PortRemote | 7 files / 365 tests | PASS |
| Whole core | `pnpm vitest run --project core` | 62 files / 2084 tests | PASS |
| Type tests | `pnpm exec tstyche PortRequest`; `... PortSpan Ports PortServing PortWire` | 5/5 (12 assertions); 22 tests / 45 assertions | PASS |
| Omitted question member | edit `SignatureHistory.ts`, `tsc -p tsconfig.test.json` | TS2741 | PASS (restored) |
| Omitted pose member | same | TS2322 | PASS (restored) |
| RED on base | worktree `464544e3`, `tstyche PortRequest` | 3 failed / 2 passed | PASS (worktree removed) |

### Probe Execution

None declared by this phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| PREQ-01 | 21-03, 21-05 | SATISFIED | truth 1 |
| PREQ-02 | 21-03, 21-05 | SATISFIED | truth 2 |
| PREQ-03 | 21-01, 21-03, 21-05 | SATISFIED | truth 3 |
| PREQ-04 | 21-01, 21-02, 21-05 | SATISFIED | truth 4 |
| PREQ-05 | 21-01, 21-02, 21-04, 21-05 | SATISFIED | truth 5 |
| WX-01..WX-06 | 21-05 (subsets 21-01..04) | SATISFIED | truth 6; WX-06 RED-on-base re-demonstrated above; WX-01 per orchestrator (`pnpm check:pr` exit 0 at end of Phase 29, not re-run here) |

All 11 IDs are `[x]` in REQUIREMENTS.md; the traceability rows (L216, L225) read Pending, expected bookkeeping the orchestrator fixes. No orphaned requirements.

### Anti-Patterns Found

None. No TBD/FIXME/XXX in the covered source files (lint and house-style clean); no `switch`/`as`/`any`/`!`/`fnUntraced` additions from this phase.

### Validation rows at HEAD

21-VALIDATION.md still reads `draft` with 13 `pending` rows; not edited here. Every row is green at HEAD.

| Task id | Result | Evidence at HEAD |
|---------|--------|------------------|
| 21-01-01 | green | `21-base.txt` non-empty (`ba38f367`); `21-mutation-base.json` names SignatureHistory, PortWireEncode, PortDerivation, AttributeResolver (all `true`). The literal `git diff --quiet -- packages/core/src` is only meaningful at the plan-01 commit (src has changed since by design); the "hand edit reverted" intent is shown by the 21-01 SUMMARY plus this run's own restore check (`git diff` empty after both falsifications). |
| 21-01-02 | green | Check is `! tstyche PortRequest` on the base: reproduced RED in a worktree at `464544e3` (3 failed, 2 passed, assignability failures, `pnpm typecheck` clean there per 21-01-SUMMARY). At HEAD the file is GREEN (5/5), the intended end state. |
| 21-01-03 | green | Law RED on the four keys at `464544e3` per 21-01-SUMMARY (`4 failed`); at HEAD the ARCH-69 block passes and the goldens in `PortWire.test.ts` pass with zero diff since `464544e3`. |
| 21-02-01 | green | `QuestionOf<Q>` x2 and `encodeUnknownResult` x1 in `PortWireEncode.ts`. |
| 21-02-02 | green | 0 conditional spreads in `toQuestion` of Relationship/History/Signature/Custom/Attribute (bases 1,1,3,2); `pnpm typecheck` clean; core vitest green; `tstyche PortRequest --only question` 3 pass / 2 skipped. |
| 21-03-01 | green | No `key:`/`defect:`/`canonicalKey` in the four modules, `makePortDescription(` in each; law green; `SignatureHistory.test.ts` green; `pnpm circular` no cycle; typecheck clean. |
| 21-03-02 | green | `PortConformance`/`PortDescription`/`PortAccess`/`PortRemote` green; pin-count gate: defect describe 0, `request keys` has 1 `Port.key(`; devtools `Capture.test.ts` 52 pass; audit `SignatureLedger.test.ts` 24 pass. |
| 21-03-03 | green | `pnpm typecheck` clean; `pnpm lint` house-style 457 files clean (only pre-existing oxlint warnings in unrelated files); core 62 files / 2084 tests pass. |
| 21-04-01 | green | `tstyche PortRequest` 5/5; `tstyche PortSpan Ports PortServing PortWire` 22/22; `portSpan({` in 5 modules; typecheck clean (`tsc -b` is part of it). |
| 21-04-02 | green | `PortSpan.test.ts` (with the PREQ-05 span-question rows) in the 62-file core pass; lint clean. |
| 21-05-01 | green | ADR-133 file + `QADI-ADR-133` + index row + `CCR-QD-411` in ADR-094; BEH-QD-440/441 and INV-QD-286 headings and traceability rows present; `spec-revise --check` OK, `spec:verify:strict` 21 PASS / 0 FAIL, `spec:examples` 108 blocks compile. |
| 21-05-02 | green | `| CCR-QD-411 |` count 1 in `spec/README.md`; `.changeset/port-keys-cover-the-request.md` mentions ARCH-69; AGENTS.md mentions `makePortDescription`. |
| 21-05-03 | green (partly by orchestrator evidence) | `pnpm check:pr` exit 0 at end of Phase 29 (not re-run). Per-file mutation: 0 regressions across the 9 files in `21-mutation-after.json` vs base (Stryker not re-run at HEAD). The literal "no `scripts/`/overview diff since base" check now fails only because Phases 22-29 edited those paths (comment rewording; revision rows and added exports); no budget, threshold or `.oxlintrc.json`/`stryker.config.mjs`/vitest config change since base. |

### Human Verification Required

None.

### Gaps Summary

No gaps. All three ROADMAP success criteria and all plan-level truths hold at HEAD, and the two advisories carried in the previous report (WR-01, WR-02) have since been fixed and are no longer open.

---

_Verified: 2026-11-12_
_Verifier: Claude (gsd-verifier)_

## Orchestrator addendum (2026-11-12): post-review-fix mutation re-measure

A core Stryker run at HEAD d37a4355 after Phase 21's review fixes (f0977945, 1d1b7a44) measured all nine baselined files at or above their bases (`SignatureHistory.ts` after 80fc5b5f's test): `21-mutation-recheck.json`. 21-VALIDATION.md and the retroactive 21-SECURITY.md (14 threats, 0 open) were written from this report.
