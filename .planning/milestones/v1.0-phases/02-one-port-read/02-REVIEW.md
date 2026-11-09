---
phase: 02-one-port-read
reviewed: 2026-11-08T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - packages/core/src/PortAccess.ts
  - packages/core/src/RelationshipResolver.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/test/PortRemote.test.ts
  - spec/behaviors/34-remote-ports.md
  - spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 2: Code Review Report (re-review of fixes 7cbd7c8, e744e97, ce9ecbd)

**Reviewed:** 2026-11-08
**Depth:** standard
**Files Reviewed:** 6

## Summary

Scope was the diff `bd40728..HEAD` over the six files, plus the code those
changes call into (`Capture.ts`, `DecisionHistory.ts`, `PortSpanEncode.ts`). I
ran `PortRemote.test.ts`: 70 of 70 pass.

**WR-01 fix (7cbd7c8): correct and complete.** In `readPort`, `disclose` now
runs in an `Effect.tap` ahead of `catchPortDefect`. A synchronous throw inside a
`tap` callback is a `Die`, so `catchPortDefect` maps it to `d.defect(args, cause)`
(there is no `Fail`, so `hasFails` is false and `hasDies` is true). The mapping
applies to both the local and the served path, because both go through `readPort`.
The question annotation and the call count stay outside the mapping, which is
right: they read only the request the read built. The tap's error type is
`never`, so the typed error channel is unchanged. The three new tests cover the
served read, the local read and `answerRemotely`'s `Unavailable` reply.

**WR-02 fix (e744e97): correct.** All three early annotations (`askActedForResource`,
`askRelationship`, `askSignature` at Resource scope) now come from the
description's `pose`, overridden only by what is the read's own fact:
`scope: "Resource"` and `interpreter`. `makeResourceId` is `Brand.nominal`, an
identity at runtime, so the values on the span are unchanged and the D-07 tests
pass untouched.

- `askRelationship` replaces `typeof rawResourceId !== "string"` with
  `request.resourceId === undefined`. The two are equivalent.
- Widening `relationshipSpan.pose`'s parameter is contravariant-safe for every
  existing caller.
- The `scope` override is needed. `pose` alone would say `Any` for a missing id.

**WR-03 fix (ce9ecbd): the wording is now accurate, but the behavior it
describes is still present.** See WR-04 below.

No new defects were introduced by the three commits.

## Warnings

### WR-04: devtools what-if replay still grants `not(hasSignature)` for a requirement the capture never saw (carried over from the prior review's WR-03, behavior unfixed)

**File:** `packages/core/src/SignatureHistory.ts:248` (the `key`), `packages/devtools/src/model/Capture.ts:184`
**Issue:** This phase widened the signature request key to
`(subjectId, resourceId, meaning, signerRole)`. `replayLayer` looks answers up
by `d.key(args)` and answers a miss with the description's `none` value, which
for signatures is an empty list. After an edit to a policy's `meaning` or
`signerRole`, the what-if therefore reads an empty list. `hasSignature` denies on
that. `not(hasSignature(...))` grants on it, and the real store would not. The fix
commit only corrected the prose (ADR-109, and the doc comment on
`signatureHistoryPort`) and left this behavior in place. It is now documented as
accepted, but it is still a fidelity regression in a tool whose purpose is to
predict a decision. Three documents also still say the opposite:
- `packages/devtools/src/model/Capture.ts:170-178` claims a never-seen query
  denies "for the reason a misconfigured deployment would".
- `apps/website/src/content/docs/docs/concepts/signatures.md:55-58` says an empty
  list is "denying unambiguously".
- The `SignatureHistoryNone` doc comment in `SignatureHistory.ts` (the comment
  just after `signatureHistoryPort`) says "every `hasSignature` policy denies".
The same fail-open also applies to an unwired real deployment under
`not(hasSignature)`, which is an INV-QD-007 question. That part predates this
phase.
**Fix:** Fix the replay and the key, not only the prose. One option is to
key the capture by `(subjectId, resourceId)`, since the store answers every
signature on file whatever the requirement says, and keep the requirement as span
context only. Another is to have the replay answer `SignatureHistoryUnavailable`
for an unseen signature request instead of `none`, so a what-if cannot turn a miss
into a grant. Either way, correct the three statements above in the same change,
or record an explicit decision accepting the regression with a test that pins it.

## Info

### IN-06: the resource-id `typeof` check and brand are now written in three places, and `askActedForResource` discards `requireResourceId`'s result

**File:** `packages/core/src/PortAccess.ts:316`, `:394`, `:453`
**Issue:** `typeof rawResourceId === "string" ? makeResourceId(rawResourceId) : undefined`
now appears in three reads. In `askActedForResource` the result of
`yield* requireResourceId(rawResourceId, event)` is thrown away. That contradicts
the rationale in `requireResourceId`'s own doc comment ("returns the id ... so the
caller has no second `typeof` test to write"). `askSignature` makes the same check
twice, once in `pose` and once through `requireResourceId`.
**Fix:** Add one helper, for example
`const knownResourceId = (raw: unknown): ResourceId | undefined => typeof raw === "string" ? makeResourceId(raw) : undefined`.
Use it at the three sites. Alternatively, drop the "returns the id" claim from
`requireResourceId`'s comment.

### IN-07: doc-comment line over the hand-wrapped width

**File:** `packages/core/src/PortAccess.ts:162`
**Issue:** The WR-01 edit left a line of about 107 characters
("`disclose` becomes the port's own typed error. A plain function and not an
`Effect.fn`, so it opens **no**"), against the roughly 90-column hand wrapping
that AGENTS.md §17 settles on. The `readPort` ADR paragraph (decision 3, the
`servePortRead` sentence) has the same problem.
**Fix:** Re-wrap both paragraphs.

---

_Reviewed: 2026-11-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
