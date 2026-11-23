---
phase: QD-76-remedies-uses-core-s-signature-match
reviewed: 2026-11-23T20:00:00Z
depth: standard
iteration: 2
files_reviewed: 45
files_reviewed_list:
  - .changeset/core-signature-answer-from-signatures.md
  - .changeset/devtools-remedy-asks-core-signature.md
  - .changeset/http-port-error-members-optional.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/core/src/DecisionHistory.ts
  - packages/core/src/Errors.ts
  - packages/core/src/LeafNeeds.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/PortKey.ts
  - packages/core/src/ScopedLeaf.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/src/SignatureMatch.ts
  - packages/core/test/DecisionHistory.test.ts
  - packages/core/test/DecisionHistory.tst.ts
  - packages/core/test/LeafNeeds.test.ts
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
  warning: 4
  info: 5
  total: 9
  necessity: 0
status: issues_found
---

# Phase 76: Code Review Report (iteration 2)

**Reviewed:** 2026-11-23
**Depth:** standard
**Files Reviewed:** 45
**Status:** issues_found

## Summary

All nine iteration-1 findings are in the tree and their mechanics hold: `readGuarded` is the single guarded read used
at every row-field, site and request read of both lookups and both judgements; no `try`/`catch` and no `as` was added
by the phase (`as const` only); the refusal sentence is written in `describeKeyRefusal` alone and carries the field
and `thrownMessage`'s text; the absent-member rule and its cause read the same in Errors.ts, BEH-QD-093/260,
ADR-QD-189, the upgrade guide and both changesets and are pinned both ways; `requireResourceId` has no second copy;
the moved helpers are text-identical; `76-agreement-check.mjs` parses the real files, passes, and its 28 self-test
cases each fail for the reason they state; every title quoted by a "Pinned by"/Enforcement line exists verbatim
(backslash continuations joined; checked by script over the lines the phase added); the CCR-QD-468 row's revisions
equal each document header and its file list equals `git diff --name-only bf339146 HEAD -- packages spec scripts
.changeset apps`; no added line exceeds 90 characters.

Four defects remain. Two are real escapes from the totality claim the loop was meant to make true (both reproduced by
running the code): the row arrays themselves are read unguarded, and an unkeyable value whose constructor `name` is
not a string makes `describeKeyRefusal` throw. Two are leftovers of WR-03: a normative requirement that still says
`errorOf` builds `MissingResourceId`, and a test that can no longer fail. Necessity rubric
(`necessity-review.md`) was read; no necessity finding.

## Warnings

### WR-01: The row arrays and the form's `signatures`/`history` reads are outside the guarded read; a revoked proxy, a throwing `length` or a throwing getter still throws

**File:** `packages/core/src/SignatureHistory.ts:362-363`, `packages/core/src/DecisionHistory.ts:290-292`,
`packages/devtools/src/model/Remedies.ts:581` and `:611`
**Issue:** `signatureLookup` calls `signatures.map(...)` and `actedLookup` calls `events.map(...)` before any
`readGuarded`, and `remedyEdits`' two arms call `fieldOps("history"|"signatures").elements(input)` (which reads
`input.history` / `input.signatures`) outside `readForm`. Reproduced against the tree:
`signatureAnswerFromSignatures(revokedProxyArray, ...)`, `actedAnswerFromEvents(revokedProxyArray, ...)`,
`signatureHistoryFromSignatures(revokedProxyArray)` and `decisionHistoryFromEvents(revokedProxyArray)` throw
`TypeError: Cannot perform 'get' on a proxy that has been revoked`; an array whose `length` getter throws throws
`Error: len`; a non-array throws `signatures.map is not a function`; and `remedyEdits(leaf, input)` throws when
`input.signatures` / `input.history` is a throwing getter or a revoked proxy. Yet BEH-QD-716 and ADR-QD-189
decision 4 say the refusal is total "for any value the rows ... hold", INV-QD-398 says a throw "never leaves" the
lookups and judgements, and `remedyEdits`'s doc comment (Remedies.ts:90-93) says those checks never throw. The
iteration-1 decision was "total over any value ... through one guarded read"; the array is the first untrusted read
and the one the tests (`HOSTILE_RECORDS` are all records, never the list) do not reach.
**Fix:** Read the list through `readGuarded` first, in both lookups, so a bad list is the same refusal as a bad row:

```ts
const keyed = Result.flatMap(
  readGuarded(["signatures"], () => Array.from(signatures)),
  (rows) => Result.all(rows.map((input) => /* the existing per-row Result.all */)),
);
```

(and `["events"]` for `actedLookup`). In `Remedies.ts` move `fieldOps("history").elements(input)` and
`fieldOps("signatures").elements(input)` inside `readForm(() => ...)` so the form's own rows are skipped with
`the form refuses this check ...`. Add one row per file to `RemedyTotality.test.ts`, `SignatureHistory.test.ts` and
`DecisionHistory.test.ts` (a revoked proxy as the list), and say "or the list of them" in BEH-QD-716/719, INV-QD-397/398
and ADR-QD-189 decision 4.

### WR-02: `describeKeyRefusal` throws for an unkeyable object whose constructor `name` is not a string, so a row or site holding one still throws out of the judgements and the remedy table

**File:** `packages/core/src/PortKey.ts:80-85` (cause), `packages/core/src/PortDescription.ts:106` (throw site)
**Issue:** `brandOf` returns `ctor.name` whenever `typeof ctor === "function" && ctor.name !== ""`, and TypeScript types
`Function.name` as `string`, so a class with `static name = Symbol("x")` or a `name` getter returning an object with a
throwing `toString` is accepted as the brand. `canonicalKey` refuses the instance (`Unkeyable`, `brand` not a string),
and the sentence `${refusal.brand}` in `describeKeyRefusal` then throws. Reproduced: a fixture row whose `subjectId` is
such an instance makes `signatureAnswerFromSignatures(...)` throw `TypeError: Cannot convert a Symbol value to a
string` (object variant: `Error: ts`), and `remedyEdits(...)` throws the same, where BEH-QD-716/719 and INV-QD-397 say
any value a row holds is a skip or a typed refusal. This is the "throwing `toString` reached by a template literal"
case: the refusal's own sentence is the thing that falls over on the hostile value.
**Fix:** Make the brand a string by construction:

```ts
const brandOf = (value: object): string => {
  const ctor: unknown = Reflect.get(value, "constructor");
  const name: unknown = typeof ctor === "function" ? Reflect.get(ctor, "name") : undefined;
  return typeof name === "string" && name !== ""
    ? name
    : Object.prototype.toString.call(value).slice(8, -1);
};
```

(still inside `canonicalKey`'s `Result.try`, so a throwing `name` getter stays `Unreadable`), and add a row per judgement
for an instance of such a class.

### WR-03: BEH-QD-588 still requires `readScoped` to fail with the `MissingResourceId` "that `errorOf` builds"

**File:** `spec/behaviors/30-port-calls.md:512-514`
**Issue:** WR-03's fix removed `ResourceIdAbsence` and `errorOf`'s `ResourceId` arm (`LeafNeeds.ts:238-241` now
builds only `MissingAction`/`MissingResource`); `MissingResourceId` is built in `ScopedLeaf.ts`'s `requireResourceId`.
BEH-QD-588's second REQUIREMENT, in the present tense and normative ("`readScoped` MUST remain the one point that
enforces it: ... fails with the `MissingResourceId` that `errorOf` builds"), is therefore false, and no revision note
or traceability row mentions BEH-QD-588 (the 30-port-calls change history names only BEH-QD-445). ADR-QD-163 and
INV-QD-288 were amended; this requirement was missed.
**Fix:** Reword the requirement to "the `MissingResourceId` that `requireResourceId` (`ScopedLeaf.ts`) builds" and
add BEH-QD-588 to the 30-port-calls Rev 1.22 history line (through `scripts/spec-revise.mjs`), then refresh the
CCR-QD-468 row's cited revision if it moves.

### WR-04: `LeafNeeds.test.ts` "never asks about the resource id" can no longer fail

**File:** `packages/core/test/LeafNeeds.test.ts:116-127`
**Issue:** The test asserts `absent?._tag !== "ResourceId"` for every leaf and every action/resource combination. WR-03
deleted `ResourceIdAbsence` from the `Absence` union, so `absenceOf` cannot return that tag at all: the assertion is a
tautology and cannot fail for the reason its title names. The fix removed the matching assertion from the `errorOf`
test (hunk at line 163) but left this one.
**Fix:** Delete the test. The invariant it named is now held by the type (`Absence` has no resource-id member) and by
the `"a row's resourceId is what readScoped does (D-06)"` rows below it.

## Info

### IN-01: The one guarded read is restated in `PortDerivation.ts`, against the doc comment that says no caller writes its own

**File:** `packages/core/src/PortDerivation.ts:112-116`
**Issue:** `key` wraps `presentMembers(wire.toQuestion(args))` in an inline `Result.try({ catch: (error) =>
KeyRefusal.Unreadable({ path: [], message: thrownMessage(error) }) })`, which is `readGuarded([], ...)` exactly.
`readGuarded`'s comment (PortKey.ts:214-215) says "Reads go through it so that no caller writes a `try` of its own".
**Fix:** `key: (args) => readGuarded([], () => presentMembers(wire.toQuestion(args))).pipe(Result.flatMap(canonicalKey))`
(`PortDerivation.ts` already imports from `PortKey.ts`, so no new edge).

### IN-02: The "absent exactly when the schema refuses the value" rule has a third producer it does not describe

**File:** `packages/core/src/DecisionHistory.ts:380-382`, `packages/core/src/SignatureHistory.ts:477-480`, `packages/core/src/Errors.ts:116-145`
**Issue:** Errors.ts, BEH-QD-093/260, ADR-QD-189 decision 4, the upgrade guide and both changesets state the rule as "a
member is absent exactly when the request's value is not one its schema admits; the cause is the refusal's sentence
when the key refuses, else the store's". A judgement whose site cannot be read builds the error with no member and
with an `Unreadable` sentence even though the leaf's `event` is a readable string and the key refused nothing. The
exception is stated in the judgements' doc comments and BEH-QD-716 ("as no request exists") but not where the rule
lives. For `DecisionHistoryUnavailable` it is also avoidable: `leaf.event` is known.
**Fix:** Either pass `event: leaf.event` (when it is a string) in the acted judgement's site failure, or add one clause
to Errors.ts and BEH-QD-093: "or when no request could be built because the site could not be read".

### IN-03: ADR-QD-189 decision 4 says the refusal sentence "names the value"

**File:** `spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md` (decision 4, "The cause is `describeKeyRefusal`'s sentence ..., which names the value")
**Issue:** `describeKeyRefusal`'s own comment (`PortDescription.ts:96-98`) says it gives "where in the request, and what
kind of value, never the value itself", and INV-QD-044 depends on that. "Names the value" contradicts it.
**Fix:** "which names the member and the kind of value".

### IN-04: BEH-QD-445's rewritten sentence leaves "Before it" without a referent

**File:** `spec/behaviors/30-port-calls.md:338-341`
**Issue:** The sentence was rewritten in place (not added as a dated note) to "The check is one function,
`requireResourceId` ..., which `readScoped` calls and the two fixture judgements call too, so the three ports cannot
disagree. Before it the check was written three times ...". "It" now reads as `requireResourceId` or `readScoped`
interchangeably, and the history clause is in current-tense text.
**Fix:** "Before `readScoped` existed the check was written three times ..." or move the history to the Change History
line.

### IN-05: `agreeAt` is byte-identical in the two frozen agreement files, and the evidence note says no declaration is

**File:** `packages/devtools/test/model/RemedySignatureConformance.test.ts:~158-170`, `packages/devtools/test/model/RemedyActedConformance.test.ts:~158-170`; `76-RED-EVIDENCE.md:1088-1090`
**Issue:** The two `agreeAt` declarations have identical text (a `diff` of them shows only the surrounding `describe`
titles and constants differ); what differs is the names each closes over (`LEAVES`, `LISTS`, `mismatchOf`).
`refusalOf` differs by one string (the error tag). The dated note says "no declaration of either is identical across
the pair", which is false for `agreeAt`. Leaving both in place is what the iteration-1 decision requires (frozen
statements), so this is a correction to the note, not to the code.
**Fix:** Reword the note to "`agreeAt` has the same text in both files but closes over each file's own names, so moving
it would change a frozen statement".

---

_Reviewed: 2026-11-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
