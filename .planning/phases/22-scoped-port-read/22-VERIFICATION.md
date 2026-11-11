---
phase: 22-scoped-port-read
verified: 2026-11-11T04:40:00Z
status: passed
score: 12/12 must-haves verified
covered_files:
  - ".planning/phases/22-scoped-port-read/22-01-PLAN.md"
  - ".planning/phases/22-scoped-port-read/22-01-SUMMARY.md"
  - ".planning/phases/22-scoped-port-read/22-02-PLAN.md"
  - ".planning/phases/22-scoped-port-read/22-02-SUMMARY.md"
  - ".planning/phases/22-scoped-port-read/22-03-PLAN.md"
  - ".planning/phases/22-scoped-port-read/22-03-SUMMARY.md"
  - ".planning/phases/22-scoped-port-read/22-04-PLAN.md"
  - ".planning/phases/22-scoped-port-read/22-04-SUMMARY.md"
  - "packages/core/src/PortAccess.ts"
  - "packages/core/src/PortDescription.ts"
  - "packages/core/src/PortRemote.ts"
  - "packages/core/src/PortServing.ts"
  - "packages/core/src/Predicate.ts"
  - "packages/core/src/Walk.ts"
  - "packages/core/test/PortAccess.test.ts"
  - "packages/core/test/PortAccess.tst.ts"
  - "packages/core/test/PortAsks.tst.ts"
  - "packages/core/test/PortRemote.test.ts"
  - "spec/decisions/134-a-resource-scoped-port-read-is-one-read.md"
  - "spec/traceability.md"
covered_digest: "v4:sha256:a5c74b111c945e86a888dac08a704799571e0ade17374e537e1b55ae0ce769eb"
behavior_unverified: 0
overrides_applied: 0
advisory:
  - finding: "spec/traceability.md row for packages/core/test/PortServing.tst.ts says the file pins 'a port's serving facet has no leaves'; the file has no such assertion (PortAsks.tst.ts has it)"
    category: other
    reason: "Review WR-02, confirmed by grep. A false test-to-claim attribution in a doc this phase edited; does not falsify any must-have (PortAsks.tst.ts, which does pin it, has its own correct row). One-row fix."
    evidence_status: "grep -n leaves packages/core/test/PortServing.tst.ts returns nothing; git diff 7f64db9a HEAD shows the file unchanged"
  - finding: "INV-QD-288 states 'never reaches its port without a resource id' as an unconditional invariant, but for DecisionHistory and SignatureHistory completeRequest is the identity and the guarantee rests on asks and the read agreeing on leaf.scope === 'Resource'"
    category: architectural
    reason: "Review WR-01. Confirmed in PortAccess.ts (completeRequest) and the asks entries. Not fail-open today and pinned by the D-07 table and Evaluate.test.ts rows; the invariant's wording is stronger than the type-level enforcement for two of three ports."
    evidence_status: "code read; no failing test"
---

# Phase 22: One scoped port read — Verification Report

**Phase Goal:** The three resource-scoped port reads are one read with one trace shape, every read takes its policy leaf, and the leaf to request mapping is stated once for evaluation and serving.
**Verified:** 2026-11-11
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

ROADMAP success criteria first, then PLAN must-haves that add detail.

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1 | ROADMAP SC1: one parameterised test over the three descriptions pins the chosen trace shape for a missing id, and `MissingResourceId.relation` | VERIFIED | `PortAccess.test.ts:574-690`: `MISSING: { [K in ScopedPort]: Missing }` is a closed table over `"DecisionHistory" \| "RelationshipResolver" \| "SignatureHistory"`; one loop asserts `MissingResourceId`, `failure.relation === row.asked`, span attributes equal the question, span names equal `[row.span]` only, zero port calls, zero counted calls. Test file passes (624 tests across 7 files run by me). |
| 2 | ROADMAP SC2: `UNTRACED_BUDGET` and `SWITCH_BUDGET` unchanged | VERIFIED | `git diff 7f64db9a HEAD --stat -- scripts/` is empty; `pnpm lint:style` reports "445 file(s) clean (3 declared switch(es))". |
| 3 | ROADMAP SC3: the span change is recorded as public behaviour (BEH-QD-227 amended, BEH-QD-445) | VERIFIED | `spec/behaviors/30-port-calls.md` change history 1.7 amends BEH-QD-227 and adds BEH-QD-445 (line 145); traceability row for 30-port-calls lists BEH-QD-445; `.changeset/one-port-read.md` states a missing id leaves only the port span and the `qadi.requireScopedResourceId` span is gone. |
| 4 | 22-01: `d02_outcome: A` and `d05_outcome: state-once` recorded with dates and quoted reasons; standing instruction quoted; base recorded | VERIFIED | `22-01-SUMMARY.md` lines 17-25 carry both keys, dates, reasons and `standing_instruction`; `22-base.txt` = `7f64db9a`. No non-.planning file changed in 22-01's commit range. |
| 5 | 22-02: baseline mutation scores recorded before any src change; D-07 table closed over `ScopedPort`; `PortAccess.tst.ts` (no loose strings) and `PortAsks.tst.ts` (asks present, no `leaves`) exist and RED-first | VERIFIED | `22-mutation-base.json` has the 9 touched src files; commit order `aa595231`, `78a14584`, `e7c8d96c` (test, RED) precede `7d8bd021` (feat). `PortAccess.tst.ts` has 6 `not.toBeCallableWith` assertions covering all reads; `PortAsks.tst.ts` asserts `toHaveProperty("asks")` on all five and `not.toHaveProperty("leaves")` on the facet. `pnpm test:tstyche`: 46 files, 218 tests, 427 assertions pass. |
| 6 | 22-03: each of the five descriptions states `asks`, the only place a leaf maps to a request; `PortServingFacet` has no `leaves`; `ServedLeaves` gone | VERIFIED | `asks:` set in all five port modules (`AttributeResolver.ts:178`, `DecisionHistory.ts:192`, `RelationshipResolver.ts:286`, `CustomPredicate.ts:230`, `SignatureHistory.ts:238`); `PortDescription.asks` at `PortDescription.ts:235`; `grep -rn ServedLeaves packages/*/src` returns nothing; `PortServing.ts` has no `leaves` member (only a comment explaining its removal). |
| 7 | 22-03: `servingFor` derives every served name as `serving.asked(asks[tag](node, SERVING_SITE))`; property test passes unchanged as guard; law test over site independence | VERIFIED | `PortRemote.ts:176-200` defines `SERVING_SITE = { subject: anonymous, resource: undefined }` and `askedOf` calling `d.asks[tag]` then `d.serving.asked(...)`; `servingFor` at :221 uses it. `PortRemote.test.ts` (+98 lines) passes. |
| 8 | 22-03: every read in `PortAccess.ts` takes its policy leaf and builds its request through `asks`; `askActed` replaces `askActedAny`/`askActedForResource`; Walk/Predicate pass the leaf | VERIFIED | `PortAccess.ts`: `readAttribute(interpreter, subject, leaf)`, `askActed(...leaf...)`, `askRelationship(subject, leaf, resource)`, `askCustom`, `askSignature` all call `<port>Port.asks.<Tag>(leaf, {subject, resource})`. `grep askActedAny\|askActedForResource packages/*/src` returns nothing. `PortAccess.tst.ts` pins the loose-string refusal. |
| 9 | 22-03: one plain `readScoped` (no `Effect.fn`/`fnUntraced`) owns the id test, early annotation, `MissingResourceId`, `readPort`; no `=== "string"`/`makeResourceId` in `PortAccess.ts`; `requireResourceId` gone; missing id leaves only the port span | VERIFIED | `readScoped` at `PortAccess.ts` is `Effect.gen`, no span; `grep makeResourceId\|=== "string" PortAccess.ts` empty; `grep requireResourceId\|requireScopedResourceId packages/*/src` only hits a history-explaining comment in `Walk.ts:538`. All three scoped reads route through `readScoped` (`readActed` for Resource scope, `askRelationship`, `askSignature`). |
| 10 | 22-03: `PortAccess.ts`, `Walk.ts`, `Predicate.ts` never read a serving facet; budgets and `pnpm lint` green | VERIFIED | `grep "\.serving" PortAccess.ts Walk.ts Predicate.ts` empty; `pnpm lint:style` clean; `scripts/` untouched. |
| 11 | 22-04: ADR-QD-134 (Document ID = file number, indexed), four amended ADRs, BEH-QD-445/446, INV-QD-288/289, traceability rows, CCR-QD-412, `spec/overview.md` (`LeafRequests`, `ReadSite`), AGENTS.md §3/§5, changesets, upgrading note | VERIFIED | ADR file has `QADI-ADR-134`; `index.yaml:417` lists it; BEH-QD-445 at `30-port-calls.md:145`, BEH-QD-446 at `34-remote-ports.md:97`; INV-QD-288/289 at `invariants.md:3483/3497`; traceability rows at 72, 76, 148, 149, 284, 300, 301, 330, 364; CCR-QD-412 at `README.md:350`; `overview.md:287` lists `LeafRequests`, `ReadSite`, `LeafOf`; `.changeset/port-serving.md` marks the `PortDescription` change **Breaking**. `pnpm spec:api`: 900 exports documented. `AGENTS.md` mentions `readScoped` and drops `requireResourceId` as a live helper. |
| 12 | 22-04: no touched file's Stryker score below base; merge gate green with no budget/threshold edit | VERIFIED | `22-mutation-after.json` vs base: PortRemote .824 to .837, SignatureHistory .960 to .961, Walk .943 to .951, CustomPredicate .944 to .946, PortAccess .976 to 1, Predicate .997 to 1, other three 1 to 1; none lower. I ran typecheck, lint:style, circular, test:tstyche, spec:verify:strict (21/0), spec:gates, spec:claims, spec:examples (108 compile), spec:api: all pass. Orchestrator reports `pnpm test` 4499/4499 and `pnpm check:pr` exit 0. |

**Score:** 12/12 truths verified (0 present, behavior-unverified).

Behavior-dependent truths (missing-id trace shape; served name equals read name) are covered by tests I executed, not presence alone: the D-07 table drives a real read under a collecting tracer and a scripted port, and the `servingFor` property test runs real `evaluate` over generated policies.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `22-01-SUMMARY.md` | recorded answers | VERIFIED | `d05_outcome: state-once` present |
| `packages/core/test/PortAccess.test.ts` | closed missing-id table | VERIFIED | contains `ScopedPort`, passes |
| `packages/core/test/PortAccess.tst.ts` | `not.toBeCallableWith` | VERIFIED | 6 assertions, tstyche green |
| `packages/core/test/PortAsks.tst.ts` | `toHaveProperty("asks")` | VERIFIED | present, green |
| `packages/core/src/PortDescription.ts` | `asks`, `LeafRequests`, `ReadSite` | VERIFIED | lines 130-235 |
| `packages/core/src/PortAccess.ts` | `readScoped`, leaf-taking reads | VERIFIED | read in full |
| `packages/core/src/PortRemote.ts` | `SERVING_SITE`, derived `servingFor` | VERIFIED | lines 176-225 |
| `spec/decisions/134-...md` | `QADI-ADR-134` | VERIFIED | present |
| `spec/README.md` | CCR-QD-412 row | VERIFIED | line 350 |
| `spec/overview.md` | `LeafRequests` | VERIFIED | line 287 |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `PortRemote.ts` | each port's `asks` | `d.asks[tag](node, SERVING_SITE)` then `d.serving.asked` | WIRED |
| `PortAccess.ts` | each port's `asks` | `<port>Port.asks.<Tag>(leaf, { subject, resource })` in all five reads | WIRED |
| `Walk.ts` | `PortAccess.ts` | port arms pass the leaf node and resource | WIRED (typecheck + Evaluate tests green) |
| `30-port-calls.md` BEH-QD-445 | `PortAccess.test.ts` | traceability row 330 | WIRED |
| `34-remote-ports.md` BEH-QD-446 | `PortRemote.test.ts` | traceability row 364 | WIRED |

### Data-Flow Trace (Level 4)

Not applicable (library code, no rendered dynamic data). The served-name path was traced instead: leaf node to `asks[tag]` to `serving.asked` to `PortServing`, and the property test confirms every question `evaluate` asks is admitted.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Missing-id table, served/local equality, property guard, regression of Evaluate/Predicate/SignatureHistory/Conformance/Description | `npx vitest run` on 7 core test files | 7 files, 624 tests pass | PASS |
| Type-level refusals and asks presence | `pnpm test:tstyche` | 46 files, 218 tests, 427 assertions pass | PASS |
| Typecheck across graph | `pnpm typecheck` | exit 0 | PASS |
| House style, budgets | `pnpm lint:style` | 445 files clean, 3 declared switches | PASS |
| API surface | `pnpm spec:api` | 900 exports documented | PASS |
| Spec gates | `spec:verify:strict`, `spec:gates`, `spec:claims`, `spec:examples`, `circular` | all pass | PASS |

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh` scripts.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| SCOPE-01 | 22-03 | SATISFIED | one `readScoped` owns id test, early annotation, `MissingResourceId`, `readPort`; three reads go through it |
| SCOPE-02 | 22-01, 22-02, 22-03, 22-04 | SATISFIED | D-07 table passes, shape A on all three ports |
| SCOPE-03 | 22-02, 22-03 | SATISFIED | reads take the leaf; `PortAccess.tst.ts` pins `askSignature` transposition refused |
| SCOPE-04 | 22-01..22-04 | SATISFIED | `asks` on five descriptions drives reads and `servingFor`; `ServedLeaves` replaced by `LeafRequests`; property test retained |
| SCOPE-05 | 22-03, 22-04 | SATISFIED | BEH-QD-227/445, INV-QD-288, ADR-QD-134, changeset; no budget change |
| WX-01 | 22-04 | SATISFIED | gates I ran pass; orchestrator reports `check:pr` exit 0 (not re-run in full by me) |
| WX-02 | 22-04 | SATISFIED | ADR-QD-134, CCR-QD-412, BEH/INV/traceability, only reserved numbers (BEH-QD-447..449 left unused and named) |
| WX-03 | 22-04 | SATISFIED | `spec:api` green; overview names `LeafRequests`, `ReadSite`, `LeafOf`, `AskedOf`, drops `ServedLeaves` |
| WX-04 | 22-03, 22-04 | SATISFIED | no `scripts/` diff; lint clean; `grep` finds no new `requireResourceId`/switch; `any`/`as` rules enforced by lint |
| WX-05 | 22-02, 22-04 | SATISFIED | mutation-after >= mutation-base for all nine files |
| WX-06 | 22-02 | SATISFIED | RED commits `aa595231`, `78a14584`, `e7c8d96c` precede `7d8bd021` |

All 11 phase requirement IDs appear in plan frontmatter and in REQUIREMENTS.md (checkboxes `[x]` lines 150-154, 199-204). Orphaned requirements: none.

REQUIREMENTS.md traceability table (lines 217, 225) still reads `Pending` for these rows. This is the phase-close bookkeeping the orchestrator flagged; it is not a code gap and should flip when the phase is closed.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `packages/core/src/PortServing.ts` | 48 | `"own-records"` literal | Info | This is the opt-in declaration's value for `SignatureHistory.signatures`, not a served-name pseudo-name. The plan's "no `own-records` pseudo-name" truth concerns `leaves`/served names, now absent; `declare` receives `{names, asked}` as specified. Not a stub. |
| `packages/core/src/Walk.ts` | 538 | mention of removed `requireScopedResourceId` | Info | History-explaining comment, accurate. |
| `spec/traceability.md` | 362 | claims `PortServing.tst.ts` pins "no `leaves`" | Warning (advisory) | False attribution; see advisory above. |

No `TBD`/`FIXME`/`XXX` markers introduced in files this phase modified that lack follow-up references (I did not find any in the touched src files via the review and gate runs).

### Review Findings Weighed (22-REVIEW.md)

- **WR-01 (INV-QD-288 overclaims):** confirmed in code. `completeRequest` is the identity for DecisionHistory and SignatureHistory; the "no id reaches the port" guarantee relies on `asks` and the read both testing `leaf.scope === "Resource"`. It does not falsify SCOPE-02 or any plan truth: the required property (same trace shape, pinned by one parameterised test) holds and is tested, and no path is fail-open today. It does weaken the INV's wording relative to its enforcement. Recorded as advisory, not a gap.
- **WR-02 (traceability row):** confirmed false for the `PortServing.tst.ts` row. Does not falsify SCOPE-05/WX-02 (the required rows exist and are correct), but it is an inaccurate claim in a gated document and should be corrected.
- IN-01..IN-05: cosmetic or documentation drift, none touches a must-have.

### Human Verification Required

None.

### Gaps Summary

No gaps. Every ROADMAP success criterion and every PLAN must-have is backed by code I read and tests or gates I ran. Two advisory items remain open in `22-REVIEW-DISPOSITION.md` (WR-01, WR-02); neither contradicts a must-have, and both are cheap follow-ups: restore the `PortServing.tst.ts` traceability row text, and either soften INV-QD-288 or add a law over Resource-scoped acted and signature leaves.

---

_Verified: 2026-11-11_
_Verifier: Claude (gsd-verifier)_
