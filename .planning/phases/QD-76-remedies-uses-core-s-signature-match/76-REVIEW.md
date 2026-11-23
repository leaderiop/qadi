---
phase: QD-76-remedies-uses-core-s-signature-match
reviewed: 2026-11-23T22:00:00Z
depth: standard
iteration: 3
files_reviewed: 47
files_reviewed_list:
  - .changeset/core-signature-answer-from-signatures.md
  - .changeset/devtools-remedy-asks-core-signature.md
  - .changeset/http-port-error-members-optional.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/core/src/DecisionHistory.ts
  - packages/core/src/Errors.ts
  - packages/core/src/LeafNeeds.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortKey.ts
  - packages/core/src/ScopedLeaf.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/src/SignatureMatch.ts
  - packages/core/test/DecisionHistory.test.ts
  - packages/core/test/DecisionHistory.tst.ts
  - packages/core/test/LeafNeeds.test.ts
  - packages/core/test/PortKey.test.ts
  - packages/core/test/SignatureHistory.test.ts
  - packages/core/test/SignatureHistory.tst.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/core/test/helpers.ts
  - packages/devtools/src/model/Remedies.ts
  - packages/devtools/src/model/SimulationFields.ts
  - packages/devtools/test/model/Remedies.test.ts
  - packages/devtools/test/model/RemedyActedConformance.test.ts
  - packages/devtools/test/model/RemedySignatureConformance.test.ts
  - packages/devtools/test/model/RemedyTotality.test.ts
  - packages/devtools/test/model/SimulationFields.test.ts
  - packages/devtools/test/remedyAgreement.ts
  - packages/http/src/QadiHttpError.ts
  - packages/http/test/QadiHttpError.test.ts
  - scripts/check-package-install.mjs
  - spec/README.md
  - spec/behaviors/06-services.md
  - spec/behaviors/12-history.md
  - spec/behaviors/23-http.md
  - spec/behaviors/29-devtools-simulator.md
  - spec/behaviors/30-port-calls.md
  - spec/decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md
  - spec/decisions/094-a-port-is-described-once.md
  - spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md
  - spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-agreement-check.mjs
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
  necessity: 0
status: issues_found
---

# Phase 76: Code Review Report (iteration 3)

**Reviewed:** 2026-11-23
**Depth:** standard
**Files Reviewed:** 47 (the 46 files of `git diff --name-only bf339146 HEAD -- packages spec scripts .changeset apps`, plus `76-agreement-check.mjs`)
**Status:** issues_found

## Summary

All nine iteration-2 findings are in the tree and correct. Totality, which was the main risk, now holds for what the
code claims in core: I ran both judgements and both layers (through `signatureAnswerFromSignatures`,
`actedAnswerFromEvents`) against a Proxy row list whose iterator throws midway, a row whose getter returns a Proxy
whose every trap throws, a row of `null`, a revoked-proxy row and id, an object whose `constructor` getter throws, a
class whose static `name` is a symbol, a null-prototype constructor holding a symbol `name`, null-prototype values,
and sites whose subject, `subject.id` or `resource.id` throw or are null. Every one answered or failed typed, none
threw, and every sentence was text. `brandOf` returns a string by construction and `readRows` puts the list inside the
same guarded read as every field. `describeKeyRefusal` has no remaining non-text piece (`path` is strings and numbers,
`kind` a literal, `brand` a string, `message` from `thrownMessage`, which never throws).

Not "exactly one try": core's read path has three, each for its own reason: `canonicalKey`'s `Result.try` (its path is
live, so it cannot call `readGuarded`, which copies the path when called), `readGuarded`'s, and `thrownMessage`'s
guarded renderings; devtools adds `readForm`'s because `readGuarded` is out of the barrel. Every refusal sentence of
the key is built in one place (`describeKeyRefusal`); devtools' own is built in one place (`refusal`). IN-01 notes the one
duplicated mapping.

Verified clean: no `as` (only `as const`), `!`, `any`, `switch` or `Record<string, unknown>` added (the `any` in tests
is `JSON.parse`'s own return, the established untyped-caller idiom); `check-house-style` passes; no added `.ts`/`.mjs`
line past 90 characters; no history or phase-relative wording in shipped source; `76-agreement-check.mjs` passes with
its 28 self-test cases; every double-quoted title in a spec line the phase added exists verbatim in a test file once
backslash continuations are joined; the traceability rows name `PortKey.test.ts` and `RemedyTotality.test.ts`; the
CCR-QD-468 row's cited revisions equal each document's header (13 of 13) and its file list equals
`git diff --name-only bf339146 HEAD -- packages spec scripts .changeset apps` exactly (no missing, no extra); the
`LeafNeeds` test can fail (a stray or missing absence changes the compared set). Necessity rubric
(`necessity-review.md`) was read; no necessity finding.

One defect remains, a normative claim the code does not meet and that I reproduced by running it.

## Warnings

### WR-01: BEH-QD-719 and ADR-QD-189 decision 5 say `remedyEdits` never throws for any value the form's subject or resource holds; it throws for a `hasRelationship` leaf and for a subject-attribute leaf

**File:** `spec/behaviors/29-devtools-simulator.md:404-410`, `spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md:110-111`, `packages/devtools/src/model/Remedies.ts:169-174` and `:565-567`
**Issue:** BEH-QD-719's requirement reads "`remedyEdits` MUST NOT throw for any value a signature row, an event row, the
list of them, the form's subject or the form's resource holds", and ADR-QD-189 decision 5 says the dispatcher makes
"`remedyEdits` is total over every site and fixture it is given". Only the `Signature` and `Acted` arms are guarded
(`readForm`); `Remedies.ts`'s own doc comment (lines 90-93) scopes the claim correctly to "those two checks". The other arms
read the same form values unguarded. Reproduced by running `remedyEdits` on the tree:

- `remedyEdits(hasRelationship("owner"), { subject: { id: "u" }, resource })` with a `resource` whose `id` getter throws
  throws `Error: boom` out of `remedyFor`'s `Relationship` arm (`resourceIdOf(input.resource)`, line 566);
- `remedyEdits(hasAttribute("k", eq(literal(1))), { subject, resource })` with a `subject` whose `attributes` getter
  throws throws out of `contextOf` (line 171) and `refValue`.

So the requirement is false as written for the form's subject and resource, and `whatIf`'s `derive` (which the `readForm`
doc says is why the guard exists) still dies on those policies. The iteration-1 decision made the refusal total over the
two judgements and the remedy table's two checks; the spec sentence widened it to the whole function without the code.
**Fix:** Narrow the two sentences to what the code does, which is what `Remedies.ts` already says: BEH-QD-719 "the
`Signature` and `Acted` checks of `remedyEdits` MUST NOT throw ..." and ADR-QD-189 decision 5 "so the two checks are total
over every site and fixture they are given", each with its revision and Change History entry (and the CCR-QD-468 row's
revisions, which are checked against the headers). If the owner prefers the wider claim, instead read `input.resource`'s id
and `input.subject.attributes` through `readForm` in the `Relationship`, `SubjectAttribute` and `ResourceAttribute` arms
and `contextOf`, and pin one row per arm in `RemedyTotality.test.ts`.

## Info

### IN-01: `canonicalKey` writes the same `Unreadable` mapping as `readGuarded`, and `readGuarded`'s comment says no caller writes a `try`

**File:** `packages/core/src/PortKey.ts:206-209` and `:223-231`
**Issue:** `KeyRefusal.Unreadable({ path: [...path], message: thrownMessage(error) })` is written twice, once in
`canonicalKey`'s `Result.try` catch and once in `readGuarded`. `readGuarded`'s comment ends "Reads go through it so that no
caller writes a `try` of its own", while `canonicalKey`, a sibling in the same file, does. The two cannot share the call
(`canonicalKey` needs the walk's path at the moment of the throw, `readGuarded` copies it on entry), but they can share the
mapping.
**Fix:** One module-private `unreadable = (path: WirePath, error: unknown) => KeyRefusal.Unreadable({ path: [...path], message: thrownMessage(error) })`
used by both catches, and the comment says "no caller outside this module writes a `try`" (devtools' `readForm` is the other
reader and cannot import it).

### IN-02: `RemedyTotality.test.ts` documents the list tests above a helper and its header still says "a row or a site"

**File:** `packages/devtools/test/model/RemedyTotality.test.ts:1-11` and `:178-186`
**Issue:** The `/** ... */` block at 178-185 describes the third `describe` ("a list of rows it cannot read, nor ... an object
whose class name is not text") but sits above `const withList`, so it documents that helper; the `describe` at line 217 is five
declarations later and has no comment. The file header (lines 1-11) still says the file pins a "row or a site that cannot be
read", "Each is a signature row, an event row, the form's subject or the form's resource", and omits the list and the
non-text class name that two of the file's four tests pin.
**Fix:** Move the block to directly above `describe("remedyEdits over a list of rows it cannot read", ...)`, and add "a list of
rows" and "an object whose class name is not text" to the header's list.

### IN-03: BEH-QD-445's current-tense paragraph still says the check is `readScoped`, against the dated note under it

**File:** `spec/behaviors/30-port-calls.md:338-339`
**Issue:** The paragraph reads "The check is one function, `readScoped` (`PortAccess.ts`), so the three ports cannot disagree",
and the dated note added two paragraphs later says the decision itself is `requireResourceId` (`ScopedLeaf.ts`), which
`readScoped` calls. The code, `ScopedLeaf.ts`, `readScoped`'s doc comment and BEH-QD-588 all say the latter. A reader of the
paragraph alone is told the check is a function that only routes to it. Iteration 2 chose to keep the paragraph and add the
note; the note is correct, the paragraph is the remaining stale current-tense statement.
**Fix:** Say what the code does in the paragraph itself, "The one route is `readScoped` (`PortAccess.ts`), which calls the one
check, `requireResourceId` ...", and keep the note's date and ADR citation, or fold the note in with a Change History entry.

---

_Reviewed: 2026-11-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
