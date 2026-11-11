---
phase: 21-port-request-derivation
verified: 2026-11-11T12:00:00Z
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
covered_digest: "v4:sha256:c0a9d97f5e2b7810eb82aece9f0e09c0f0a95341a782b4eb501969c93e4ba2b3"
behavior_unverified: 0
overrides_applied: 0
re_verification: none
advisory:
  - finding: "WR-01 (open in 21-REVIEW-DISPOSITION): doc/test comments claim an absent optional member and one stated `undefined` are told apart by the key; they collide (presentMembers drops undefined)"
    category: other
    reason: "Documentation overstatement; collision predates the phase (old tuple key had it) and is benign. Does not affect the goal."
    evidence_status: "reviewer traced; not contradicted"
  - finding: "WR-02 (open): a derived key can throw if toQuestion reads a throwing getter, contradicting the Result-never-throw doc"
    category: other
    reason: "Predates the phase (old tuple keys read properties outside the walk); not a field-omission defect. Now fixable in one place (PortDerivation.ts:105)."
    evidence_status: "reviewer traced; not contradicted"
---

# Phase 21: The port request is derived from its description - Verification Report

**Phase Goal:** No port module lists its request fields by hand for its key, and a field left out of a wire or span question is a compile error.
**Verified:** 2026-11-11
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | No derived port module lists its request fields for the key (PREQ-01) | VERIFIED | `grep key:/defect:/canonicalKey` over AttributeResolver, RelationshipResolver, DecisionHistory, SignatureHistory: none. Each is `= makePortDescription({...})`; `PortDerivation.ts:104-108` derives `key = canonicalKey(presentMembers(wire.toQuestion(args)))`. The spec type is `Omit<PortDescription,"wire"\|"key"\|"defect">`, so a derived port cannot state either. |
| 2 | `defect` derived from `failure` + `Cause.squash`; CustomPredicate keeps a documented override (PREQ-02) | VERIFIED | `PortDerivation.ts:107`. `CustomPredicate.ts` stays a literal with own `key`/`defect` (`Cause.pretty`), doc comment at ~183-198 states both reasons (key covers whole subject/resource/params the wire omits; error has no `cause` field). Matches 21-CONTEXT D-02. |
| 3 | One law test states key == canonicalKey(wire question) for every derived port; per-port pins deleted only after green (PREQ-03) | VERIFIED | `PortDescription.test.ts` law (FastCheck, closed DerivedPort table) passes; "request keys" in `PortConformance.test.ts` now keeps only CustomPredicate's pin (21-03-SUMMARY records green at `7ca86f83` before deletion at `67b2c6ad`). 207 tests pass across the five touched test files. Reach rows retained as runtime net. See IN-01 below. |
| 4 | A field missing from a derived port's question cannot compile silently (PREQ-04) | VERIFIED | Direct falsification: removed `signerRole: query.signerRole` from `SignatureHistory.ts` `toQuestion`; `tsc -p tsconfig.test.json` failed with `TS2741: Property 'signerRole' is missing ... QuestionOf<...>`. File restored via git checkout. `PortRequest.tst.ts` passes under `pnpm test:tstyche` (44 files, 397 assertions). RED-on-base demonstration recorded in 21-01 per D-06. |
| 5 | Remaining restatements (span struct, pose, toQuestion/fromQuestion) are derived or exhaustive by type, or the plan records why not (PREQ-05) | VERIFIED | `QuestionOf` (PortWireEncode.ts) and `PoseOf`/`portSpan` (PortSpanEncode.ts); all five ports use `portSpan`. One-struct-per-port rejection recorded in D-05 / ADR-QD-133 (INV-QD-044, ADR-QD-107, exactOptionalPropertyTypes). `fromQuestion` spreads stay with stated coverage argument. |
| 6 | Work-quality gates WX-01..06 | VERIFIED | `pnpm typecheck` clean; `pnpm test:tstyche` green; `pnpm spec:api` (897 exports) and `check-house-style` (445 files, 3 declared switches) green; `spec-revise --check` green; no diff in `scripts/`, `.oxlintrc.json`, `spec/overview.md`, `stryker.config.mjs` vs base (no budget/threshold edits); added src lines contain no `as`/`any`/`!`/`switch`/`fnUntraced`/async/console (grep hits were comments only). Mutation after >= base for all 9 touched files (e.g. SignatureHistory 0.955 -> 0.960, PortWireEncode 0.619 -> 0.692). ADR-QD-133, CCR-QD-411, BEH-QD-440/441, INV-QD-286, traceability rows, changeset `port-keys-cover-the-request.md` all present. 21-05-SUMMARY records `pnpm check:pr` exit 0; the full run was not repeated here (only its component gates above). |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| PREQ-01 | 21-03, 21-05 | SATISFIED | truth 1 |
| PREQ-02 | 21-03, 21-05 | SATISFIED | truth 2 (CustomPredicate override documented, as the requirement itself allows) |
| PREQ-03 | 21-01, 21-03, 21-05 | SATISFIED | truth 3 |
| PREQ-04 | 21-01, 21-02, 21-05 | SATISFIED | truth 4 (falsification run) |
| PREQ-05 | 21-01, 21-02, 21-04, 21-05 | SATISFIED | truth 5 |
| WX-01..WX-06 | 21-05 (subsets in 21-01..04) | SATISFIED | truth 6 |

All 11 IDs appear in plan frontmatter and are `[x]` in REQUIREMENTS.md; no orphaned requirements mapped to Phase 21. (REQUIREMENTS.md's traceability table at lines 216/225 still says "Pending"; a bookkeeping nit, not a code gap.)

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX in changed src. Spec/gate checks above clean.

### Review warnings vs. the goal

- **WR-01** (doc claims absent vs stated-`undefined` are distinguished; they collide): predates the phase, benign, and concerns the wording of the key law, not the "no hand-listed fields / compile error on omission" goal. Does not undermine it. Worth closing by rewording three comments.
- **WR-02** (derived `key` can throw on a hostile getter): predates the phase and is orthogonal to omission safety; the phase actually centralises the read so one fix covers all four ports. Does not undermine the goal.
- **IN-01** is worth noting: the runtime law shares `toQuestion` with the implementation, so the compile-time `QuestionOf` check (verified by falsification above) is the real guard for a dropped field, as the review says.

### Human Verification Required

None.

### Gaps Summary

No gaps. Both open review warnings are advisory and pre-existing; they are listed in frontmatter `advisory`.

---

_Verified: 2026-11-11_
_Verifier: Claude (gsd-verifier)_
