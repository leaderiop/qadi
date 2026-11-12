---
phase: 21-port-request-derivation
plan: 03
subsystem: core
tags: [tdd, green, port-description, makePortDescription, ARCH-69]

requires:
  - phase: 21-port-request-derivation
    provides: 21-01's red ARCH-69 law and 21-02's QuestionOf/presentMembers
provides:
  - makePortDescription (package-private, PortDerivation.ts): a description's key and defect derived
  - four ports (Attribute, Relationship, DecisionHistory, SignatureHistory) that state neither key nor defect
  - CustomPredicate's documented override of both
affects: [21-04, 21-05]

phase_base: ba38f367
plan_head_before: cc89ff84327454ee4465936a9fe0921c37812d3b
plan_head_after: 67b2c6ad735b659cabff915150a52d9358dd4d6b
commits: 2

actuals:
  tokens: 14000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A derived port's key is canonicalKey(presentMembers(wire.toQuestion(args))); its defect is failure(args, Cause.squash(cause))"
    - "The builder's spec is Omit<PortDescription<...>, wire | key | defect> plus a wire spec, so a member PortDescription gains reaches derived ports unedited"

key-files:
  created: []
  modified:
    - packages/core/src/PortDerivation.ts
    - packages/core/src/PortDescription.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/SignatureHistory.ts
    - packages/core/src/CustomPredicate.ts
    - packages/core/test/PortConformance.test.ts
    - packages/core/test/PortDescription.test.ts

key-decisions:
  - "makePortDescription's wire is a DerivedWireSpec (PortWireSpec with toQuestion returning QuestionOf<Q>), wrapped into portWire with Result.succeed; the key reads the same toQuestion, so the key and the wire question cannot differ"
  - "Each port's wire moved inline into the spec (a JSDoc on the wire property carries the old const's doc) because contextual typing of fromQuestion needs the schema in the same call"

requirements-completed: [PREQ-01, PREQ-02, PREQ-03, WX-04, WX-05, WX-06]

duration: 18 min
completed: 2026-11-11
status: complete
---

# Phase 21 Plan 03: Four ports derive their key and defect Summary

`makePortDescription` builds a port's description from a spec that has no `key` or `defect`: the key is `canonicalKey` of the wire question, the defect is the failure of the squashed cause. Four ports use it; `CustomPredicate` keeps its own and says why.

## What changed

- `PortDerivation.ts`: `makePortDescription` and `DerivedWireSpec`. The spec type is `Omit<PortDescription<...>, "wire" | "key" | "defect">` plus the wire spec, so Phase 22's `asks` reaches the four ports without editing it. Module header lists what it derives. `pnpm circular` is clean.
- `AttributeResolver`, `RelationshipResolver`, `DecisionHistory`, `SignatureHistory`: built with it. None contains `key:`, `defect:` or `canonicalKey`; the `Cause` and (where unused) `Result` imports are gone. Their "keyed by (...)" paragraphs now say the key is the wire question's. `pairKey` in `signatureHistoryFromSignatures` still calls `signatureHistoryPort.key([{ subjectId, resourceId }])`, its doc says it is a query with no requirement, keyed as its wire question; the fixture's tests pass unchanged.
- `CustomPredicate.ts`: doc comment states it is the one port that states its own key and defect, and why (the key covers the whole subject, which the wire question does not carry; `CustomPredicateError` has no `cause`, so a defect renders with `Cause.pretty`). Bodies unchanged.
- `PortDescription.ts`: `key` and `defect` docs name the derived default and the override, and the three tests that check the law.

## TDD

- RED: 21-01's ARCH-69 describe (`464544e3`, `b4f97956`). Re-run at the start of this plan: 4 key-law tests failed (`'[s" ",u,u,u]'` vs `'{"subjectId":s" "}'`), the 4 defect tests passed.
- GREEN: `7ca86f83`. The law is 8/8 green; `SignatureHistory.test.ts` 14/14; core excluding the pins to be deleted 2025 passed; `tsc -b`, `pnpm circular` clean.
- Task 2, `67b2c6ad`: two new tests first (green), then the pins went.
  - New, `PortConformance.test.ts`, "customPredicatePort's failure reason": "a defect is rendered with Cause.pretty and names the same predicate".
  - New, `PortDescription.test.ts`, ARCH-69 describe: "CustomPredicate states its own key: it covers the subject's roles, permissions and attributes, which its wire question does not carry" (equal encoded questions, different keys).
- REFACTOR: none.

## Deleted pins (all replaced by the ARCH-69 law, which was green first)

- `PortConformance.test.ts`, "request keys": the seven exact key-text assertions for `attributeResolverPort` (1), `decisionHistoryPort` (2), `relationshipResolverPort` (1), `signatureHistoryPort` (3). `customPredicatePort`'s pin stays (1 `Port.key(` left).
- `describe("defect constructor (ADR-QD-077)")` inside `conform`, with its `defectRendersCause` field (interface and five cases) and the `reasonOf` helper; its `Cause.pretty` half moved to the new CustomPredicate test above. The reach rows and "request keys tell apart..." are untouched.

## Verification

`pnpm typecheck`, `pnpm lint` (exit 0; house-style 445 files clean; the oxlint warnings are pre-existing, in `@qadi/react` and features), `pnpm vitest run --project core` 62 files / 2044 tests, `PortAccess` and `PortRemote` suites, `Capture.test.ts` (devtools, 52) and `SignatureLedger.test.ts` (audit, 24) all green. tstyche not run, as the plan said (`PortRequest.tst.ts` pose assertions stay red until 21-04).

Mutation scores were not measured here; 21-05 checks them against `21-mutation-base.json`. The new tests land before the pins went.

## Deviations from Plan

**1. [Process] Task 1 committed with one test red**
- **Found during:** Task 1 commit
- **Issue:** the plan commits only at Task 2, but the per-task rule wants one commit each. After `7ca86f83` the single failing test is PortConformance's "request keys > are canonicalKey over the question each port is asked", the exact-text pin Task 1 says to exclude and Task 2 deletes. It is green again at `67b2c6ad`.
- **Fix:** none needed; `7ca86f83` is the GREEN commit, `67b2c6ad` the pin removal.
- **Commit:** 7ca86f83, 67b2c6ad

Otherwise none; no `as`, no `any`, Task 3 needed no fixes.

## Known Stubs

None.

## Self-Check: PASSED

All nine modified files exist; commits `7ca86f83` and `67b2c6ad` are on `arch-wave-7`; no `key:`/`defect:`/`canonicalKey` in the four derived modules, each calls `makePortDescription(`.
