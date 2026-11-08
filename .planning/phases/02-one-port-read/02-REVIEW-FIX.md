---
phase: 02-one-port-read
fixed_at: 2026-11-08T00:00:00Z
review_path: /home/yopu/Project/Perso/qadi/.planning/phases/02-one-port-read/02-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-11-08
**Source review:** .planning/phases/02-one-port-read/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03; Info findings are out of `critical_warning` scope)
- Fixed: 3
- Skipped: 0

**Where verification ran:** the main checkout. `workflow.use_worktrees` is `false`, so no worktree was created and the commits are on `arch-wave-5` directly.

## Fixed Issues

### WR-01: `disclose` runs outside the defect mapping

**Files modified:** `packages/core/src/PortAccess.ts`, `packages/core/test/PortRemote.test.ts`, `spec/behaviors/34-remote-ports.md`, `spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md`
**Commit:** 7cbd7c8
**Applied fix:** `readPort` now annotates the answer in an `Effect.tap` before `catchPortDefect`. A throw in `disclose` is therefore the port's typed error (`SignatureHistoryUnavailable` for the signature port), for the local and the served read alike. `pose` stays outside, because it reads only the request the read built itself. Three tests were added: a malformed signature answer (`[null]`) fails `servePortRead` and a local `askSignature` with the typed error, and `answerRemotely` replies `{ _tag: "Unavailable" }`. All three fail on the old code. BEH-QD-332 and ADR-QD-109 decision 3 were amended and revised through `spec-revise` (BEH-34 is now 1.2, ADR-109 is 1.1). Logic change, so it needs human verification.

**Behavior note:** before the phase, a malformed answer on a served read came back `Refused: Unencodable`. It now comes back `Unavailable`. The reviewer's description of the regression was "dies", and the fix is "clean typed reply". It is not the earlier `Unencodable`.

### WR-02: pre-validation question hand-written beside `pose`

**Files modified:** `packages/core/src/PortAccess.ts`, `packages/core/src/RelationshipResolver.ts`, `spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md`
**Commit:** e744e97
**Applied fix:** `askActedForResource`, `askRelationship` and `askSignature` (Resource scope) keep D-07's annotate-then-validate order. The early annotation is now `{ ...<port>.attributes.pose([request]), interpreter }`, with `scope: "Resource"` set by the read where the port has that field. `askActedForResource` and `askRelationship` build `request` once and reuse it for `readPort` on the success path. `relationshipSpan.pose` now accepts `resourceId: ResourceId | undefined` (a widened parameter, so every real request is still assignable), because the id may be unvalidated at that point. ADR-QD-109's Alternatives bullet is amended (ADR-109 is now 1.2).

**Decision on the asserted `scope` value:** the failure-path span for a missing id keeps `qadi.scope = "Resource"`. `pose` alone would say `"Any"` when `resourceId` is `undefined`, which would misdescribe a Resource-scoped question. Scope is a fact of the read, not of the request, so the read overrides it. The "a missing resource id still leaves its question on the span (D-07)" tests pass unchanged; no asserted value moved. Logic change, so it needs human verification.

### WR-03: "over-keying can only deny" is false under `not(...)`

**Files modified:** `packages/core/src/SignatureHistory.ts` (the `signatureHistoryPort` doc comment), `spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md`
**Commit:** ce9ecbd
**Applied fix:** wording corrected, in place, with a Change History entry (ADR-109 is now 1.3). The ADR bullet and the doc comment now say a requirement the capture never saw is the port's `none` answer (an empty list). `hasSignature` denies on it and `not(hasSignature)` grants, so a devtools what-if that edits `meaning` or `signerRole` can report an allow the real store would not give. The effect is confined to the devtools replay and does not reach live enforcement. The ADR records that the first draft's claim held only for the un-negated leaf. This is a documentation correction only; the behavior is unchanged and the replay fidelity regression remains (see below).

## Verification

Run in the main checkout after all three commits:
- `pnpm typecheck`: pass
- `node scripts/check-house-style.mjs`: 397 files clean, 3 declared switches
- `pnpm vitest run` (full): 151 files, 3895 tests passed
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest history entry
- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0
- `pnpm spec:examples`: 101 blocks compile

## Residual, not fixed (needs a decision)

WR-03's behavioral half is open. The reviewer offered two options: key signature captures by `(subjectId, resourceId)` with the requirement as span context only, or make devtools replay answer `SignatureHistoryUnavailable` for an unseen signature request. Either changes `packages/devtools/src/model/Capture.ts` or the port key and its spec. That is beyond a wording correction, so only the claim was corrected. `apps/website/.../concepts/signatures.md:57` ("an empty list already denies on its own") is likewise true only for the un-negated leaf and was left as is.

---

_Fixed: 2026-11-08_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
