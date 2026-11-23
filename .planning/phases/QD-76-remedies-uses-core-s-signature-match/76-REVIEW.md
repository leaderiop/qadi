---
phase: QD-76-remedies-uses-core-s-signature-match
reviewed: 2026-11-23T18:05:00Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - packages/core/src/SignatureHistory.ts
  - packages/core/src/SignatureMatch.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/Errors.ts
  - packages/core/src/DecisionHistory.ts
  - packages/http/src/QadiHttpError.ts
  - packages/devtools/src/model/Remedies.ts
  - packages/devtools/src/model/SimulationFields.ts
  - packages/devtools/test/remedyAgreement.ts
  - packages/devtools/test/model/RemedySignatureConformance.test.ts
  - packages/devtools/test/model/RemedyActedConformance.test.ts
  - packages/devtools/test/model/Remedies.test.ts
  - packages/devtools/test/model/SimulationFields.test.ts
  - packages/core/test/SignatureHistory.test.ts
  - packages/core/test/DecisionHistory.test.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/core/test/SignatureHistory.tst.ts
  - packages/core/test/DecisionHistory.tst.ts
  - packages/http/test/QadiHttpError.test.ts
  - scripts/check-package-install.mjs
  - spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md
  - spec/decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md
  - spec/decisions/094-a-port-is-described-once.md
  - spec/decisions/index.yaml
  - spec/behaviors/06-services.md
  - spec/behaviors/12-history.md
  - spec/behaviors/23-http.md
  - spec/behaviors/29-devtools-simulator.md
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
  - spec/README.md
  - .changeset/core-signature-answer-from-signatures.md
  - .changeset/http-port-error-members-optional.md
  - .changeset/devtools-remedy-asks-core-signature.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
  necessity: 0
status: issues_found
---

# Phase 76: Code Review Report

**Reviewed:** 2026-11-23T18:05:00Z
**Depth:** standard
**Files Reviewed:** 36
**Status:** issues_found

## Summary

The phase does what it set out to do. The remedy table's `Signature` and `Acted` arms ask core, the
inline match is gone, and `signatureLookup` / `actedLookup` are shared by the fixture layer and the
judgement. `signatureAnswerOf` is shared by `askSignature` and the signature judgement.

Checks that came out clean:

- `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` survive only in change history, the ADR and the
  changeset. Nothing else in code, docs, website or examples names them (build output under
  `examples/nextjs-newsroom/.next` aside).
- `node scripts/check-api-surface.mjs` reports 940 exports (941 + 2 - 3), and
  `node scripts/check-house-style.mjs` is clean.
- `oxlint` is clean on every changed source and test file.
- The 187 tests in the touched core, devtools and http files pass.
- No added line in `packages/` or `scripts/` is past 90 characters.
- Every test title quoted in a spec "Pinned by" or Enforcement line exists verbatim in the named file
  (checked by script, backslash continuations joined).
- The CCR-QD-468 file list matches `git diff --name-only bf339146 HEAD -- packages spec scripts .changeset apps`
  exactly, and every cited revision equals the document header.
- The http change is classed breaking in its changeset and in the upgrade guide.
- The conformance rows can fail for the reason their titles name: each oracle is core's `evaluate` or
  `askSignature`/`askActed`, not devtools code.

No necessity findings. The `Schema.is` guards in each description's `failure` defend an untyped-caller
trust boundary, which is not an impossible state.

The defects found are all of the "claims more than the code does" and "restated rule" kind. No critical
issue was found.

## Warnings

### WR-01: "Never a throw, for any value the rows or the site hold" is false for rows, subjects and resources whose property reads throw

**File:** `packages/core/src/SignatureHistory.ts:444-445`, `packages/core/src/DecisionHistory.ts:346-347`,
`packages/devtools/src/model/Remedies.ts:87-90`, `spec/behaviors/29-devtools-simulator.md:404-405`,
`spec/behaviors/06-services.md:556`, `spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md:93`

**Issue:** The two judgements, the two fixture layers and `remedyEdits` are documented, and in BEH-QD-719
specified with MUST, as never throwing "for any value the rows or the site hold". ADR-QD-189 decision 5 says
`remedyEdits` "is total over every site and fixture it is given".

That holds for a value inside a field, because the key is total. It does not hold for the row, subject or
resource object itself. `signatureLookup` and `actedLookup` read `input.subjectId`, `input.meaning`,
`input.resourceId` and `input.signerRole` (and destructure each event row) before any `Result` is built.
`resourceIdOf` reads `resource.id`, and `askedActed`/`signatureAsks` read `site.subject.id`.

I ran each of these against the committed code. Every one throws instead of failing typed:

- a signature row with a getter on `subjectId`, `meaning` or `resourceId` that throws
- a signature row that is `null`, or a `Proxy` whose `get` throws
- an event row with a throwing `subjectId` getter, or a `null` event row
- a `Resource` leaf whose site resource has a throwing `id` getter
- a site subject with a throwing `id` getter

`remedyEdits` calls the judgements directly, so it throws too. `whatIf` calls `remedyEdits` from its
synchronous `derive`.

BEH-QD-410's own note (`06-services.md:493-503`) already carves this out: "A record whose own property read
throws is outside the domain, as for every reader of a plain record". ADR-QD-189 decision 4 says the same.
So the spec contradicts itself, and the code comments, BEH-QD-716's prose, BEH-QD-719's MUST and decision 5
promise more than the compiler or any test enforces. The tests cover only symbol and revoked-proxy field
values, which the key refuses.

**Fix:** Either narrow the claims to what is true or make the claim true. Narrowing is the smaller change:

```ts
// SignatureHistory.ts / DecisionHistory.ts doc comments, and Remedies.ts's remedyEdits comment
// "... and never a throw, for any value a row's or the site's fields hold (BEH-QD-410); a record whose own
//  property read throws is outside the domain."
```

Apply the same wording to BEH-QD-719's last sentence ("`remedyEdits` MUST NOT throw for any value a form row
or the form's subject holds" becomes "...for any value a form row's fields or the form's subject's fields hold")
and to ADR-QD-189 decision 5. Otherwise wrap the row reads in `signatureLookup`/`actedLookup` and `resourceIdOf`
in `Result.try` and fail with `KeyRefusal.Unreadable`, and add a getter-throws row to the core and devtools refusal
tests.

### WR-02: The optional error members are documented as absent only for a request the key refuses, which is not so

**File:** `packages/core/src/Errors.ts:118-121` and `:134-138`, `spec/behaviors/12-history.md:154-155`,
`spec/behaviors/23-http.md:279-280`, `apps/website/src/content/docs/docs/reference/upgrading.md:1133`,
`.changeset/core-signature-answer-from-signatures.md:5`

**Issue:** `failure` sets `event` / `subjectId` exactly when `Schema.is` admits the value (`DecisionHistory.ts:236`,
`SignatureHistory.ts:292`). That is true whenever the value is not a string, whether or not the key refuses it.

Those docs say the member "is absent exactly when the request's event is not a string, which only a request the
key refuses can hold", and that "the cause then carries `describeKeyRefusal`'s sentence". The upgrade guide says
the same ("absent exactly when a request the port's key refused held a value the member's schema refuses").

A number, an object or `null` is keyable. I ran `actedAnswerFromEvents` with `subjectId: {a:1}`: it answers
`NotActed`, so the key admits it. A host's own failing store (`DecisionHistoryShape.hasActed` failing, or the
`retrying` and `timingOut` wrappers) given an untyped request with `event: 5` therefore gets a
`DecisionHistoryUnavailable` with no `event` and the store's own `cause`, not a refusal sentence. A reader who
trusts the guide ("absent means the key refused it, and `cause` names why") will misread that error. The guide
is the breaking-change notice, so it should be exact.

**Fix:** Say what the code does: the member is absent when the request's value is not a string (as only an
untyped caller can hold), and the `cause` carries the key's refusal sentence only when the key refused it.

```ts
 * The event is absent when the request's event is not a string, which only an untyped
 * caller can hold. When the key refused the request the cause carries `describeKeyRefusal`'s
 * sentence, which names it (BEH-QD-410); otherwise it is whatever the store failed with.
```

Apply the same wording to `Errors.ts:134-138`, BEH-QD-093's note, BEH-QD-260's note, the 0.13 upgrade section and
the core changeset.

### WR-03: The "resource-scoped leaf with no usable id" test is restated in both judgements, not owned once

**File:** `packages/core/src/SignatureHistory.ts:454-456`, `packages/core/src/DecisionHistory.ts:358-360`
(against `packages/core/src/PortAccess.ts:284-291`)

**Issue:** The phase's goal is that whether a fixture row meets a leaf is decided once in core. The rule
`isResourceScoped(leaf) && query.resourceId === undefined`, with `relation` chosen as `leaf.meaning` or `leaf.event`,
now appears three times:

- `readScoped`, as `resourceId === undefined` after routing on `isResourceScoped`
- `signatureAnswerFromSignatures`
- `actedAnswerFromEvents`

The two judgements each hand-build `new MissingResourceId({ relation })` because `LeafNeeds.errorOf` would add a
madge cycle (`SignatureHistory.ts`'s own comment and decision D-02 both say so). INV-QD-398 and BEH-QD-717 list the
shared pieces as the leaf's request, the lookup and the answer rule. The missing-id check is not among them, so
"states once" is incomplete. Nothing but the agreement tests keeps the judgements and `readScoped` in step, and
BEH-QD-717 says that part "is kept by review".

**Fix:** Give `ScopedLeaf.ts` (a leaf module the three already import) one function, for example
`missingResourceIdOf(leaf, request, relation): MissingResourceId | undefined`, and call it from both judgements. If
`readScoped` can use it too, even better. Otherwise extend INV-QD-398's list of pieces with the missing-id check and
say plainly that `readScoped` carries its own copy.

## Info

### IN-01: The two skip-sentence constants and the `skipReason` doc comment

**File:** `packages/devtools/src/model/Remedies.ts:436-441` and `:443-451`

**Issue:** `SIGNATURE_PORT_REFUSED` and `HISTORY_PORT_REFUSED` are the same sentence with one word changed, and
`skipReason` builds each arm by hand-concatenating it with `thrownMessage(failure.cause)`. The doc comment's first
line, "Why a remedy core's fixture judgement failed for is skipped.", is not grammatical, and it leads with the
story rather than a one-line summary of the export.

**Fix:** One template, `(port: string, cause: unknown) => \`the ${port} port refuses this check, so no added row would be answered: ${thrownMessage(cause)}\``, called with `"signature"` and `"history"`. Reword the first line to "The reason a check core's judgement failed for is skipped."

### IN-02: Two conformance files and `remedyAgreement.ts` leave `gave`, `agreeAt`, `unkeyableRow`, `unkeyableSubject` and `refusalOf` copied in both

**File:** `packages/devtools/test/model/RemedySignatureConformance.test.ts:99-102,141-153,199-218` and
`packages/devtools/test/model/RemedyActedConformance.test.ts:82-85,124-137,178-199`

**Issue:** `remedyAgreement.ts` is the shared home, but it holds only `asker`, `SITES` and `outcomeOf`. `gave`
(identical), `agreeAt` (identical apart from the sweep function it calls), `unkeyableRow` and `unkeyableSubject`
(identical) and the shape of `refusalOf` (identical apart from the tag it checks) sit in both files, and so do
the `SINGLES`, `DECOY` and `LISTS` constructions (different data). The existing rows' inputs, titles, expected
values and order stay as they are.

**Fix:** Move `gave`, `unkeyableRow` and `unkeyableSubject` into `remedyAgreement.ts`, and take the per-file
`mismatchOf` as a parameter of a shared `agreeAt`. This does not touch any row.

### IN-03: The core copy of the devtools axes is justified, but the two core files copy their own helpers

**File:** `packages/core/test/SignatureHistory.test.ts:312-400` and `packages/core/test/DecisionHistory.test.ts:122-145,
255-300`

**Issue (the 76-03 question):** Core's `signatureAnswerFromSignatures` / `actedAnswerFromEvents` describes need
their own closed product. Their oracle is `askSignature`/`askActed` over the layer, not `evaluate`, so a regression in
the shared lookup must fail in core's own gate (95% coverage, mutation on the core group). A test cannot import another
package's tests. So the copy of the axes across the package boundary is justified and should stay.

What is not justified:

- `alice`, the four-row `SITES`, `DECOY`, the `SINGLES` product, `failureOf`/`answerOf` and the `unkeyable*` builders
  are written again in `SignatureHistory.test.ts` and `DecisionHistory.test.ts`. Within `DecisionHistory.test.ts`,
  `unkeyableSubject`/`untypedSubject` and `unkeyableRow`/`untypedEvent` are near-duplicates, and
  `SignatureHistory.test.ts` builds an untyped subject inline in its first describe, then again as `unkeyableSubject`.
- `SignatureHistory.test.ts` finds role-free leaves with `LEAVES.filter(({ name }) => !name.includes("signer role"))`
  and the Resource leaf with `const [resourceLeaf] = LEAVES`. Both depend on a title string or an array position.

**Fix:** Hoist `alice`, `SITES`, `DECOY`, the untyped-subject builder and `JSON.stringify`-compare into the existing
`packages/core/test/helpers.ts`. Name the leaves as an object (`{ resource, resourceAsApprover, any, anyAsApprover }`)
instead of filtering by title.

### IN-04: `DecisionHistory.test.ts` restates the scope rule to compute its expected tag, and its title misdescribes its inputs

**File:** `packages/core/test/DecisionHistory.test.ts:388-393` (title at `:372-374`)

**Issue:** The expected tag is `leaf.scope === "Resource" && resourceIdOf(at.resource) === undefined ? "MissingResourceId" : "DecisionHistoryUnavailable"`.
That is the scope rule and the id rule, restated in a test to check the code that owns them. The agreement
assertion on the line above already compares judged against read. The title, "a refused subject or event row ...",
covers two different things: the first case is a refused site subject (a query refusal), and the second is an event
row whose `subjectId` is a symbol. Neither is "a refused subject row".

**Fix:** Drop the restated rule and assert the tag from the read's own result. Split the title into "a site whose
subject id is a symbol ..." and "an event row whose subject id is a symbol ...", or loop them as two named cases.

### IN-05: ADR-QD-189 and the CCR row carry planning-process wording in current-tense spec text

**File:** `spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md:53-56,98` and
`spec/README.md:405`

**Issue:** The decision says it "was decided autonomously, under the owner's standing instruction ('do not ask me;
always pick the most complete and clean solutions'), in place of the roadmap's owner question". It says core "gains two
names where the milestone expected at most one", and the CCR row repeats the milestone wording. A standing instruction
to an agent, "the roadmap" (a `.planning` document the spec does not carry) and "the milestone" are workflow history.
A reader of the published spec cannot resolve them. Dated amendments and CCR rows are where history belongs, but they
should state the decision and its reason, not the process that produced it.

**Fix:** State decision 1 as: "Whether a fixture row meets a signature or acted leaf is core's answer, and
`SignatureMatch.ts` stays package-private. The alternative, recording a rejection, keeps two statements of one rule
and leaves the refusals below in place." Reword decision 7 and the CCR row to "Core gains two names, because the acted
arm had the same defect in the same function."

### IN-06: The `hasCustom` remedy test no longer pins the sentence it was written to pin

**File:** `packages/devtools/test/model/Remedies.test.ts:580` and
`packages/devtools/test/model/SimulationFields.test.ts:147-157`

**Issue:** `Remedies.test.ts`'s "names a custom predicate it cannot remedy" used to hold the displayed sentence as a
literal. It now reads `const reason = NO_CUSTOM_PREDICATE_FIELD.reason`, so it passes whatever the sentence says. The
literal is pinned once, in `SimulationFields.test.ts` ("says why a custom predicate has no cell"), so the panel text is
still guarded. But the new `SimulationFields.test.ts` row "the custom-predicate cell is the value whose reason the
remedy table gives" asserts the same `remedyEdits(hasCustom(...)).skipped` equality as the `Remedies.test.ts` test.
The two tests now check one fact twice, and `Remedies.test.ts` no longer guards what its name says.

**Fix:** Keep the literal in `Remedies.test.ts` (the original line), and keep the identity row in `SimulationFields.test.ts`
for `FIXTURE_DATA.CustomPredicate === NO_CUSTOM_PREDICATE_FIELD` only. Drop the second `remedyEdits` assertion there.

---

_Reviewed: 2026-11-23T18:05:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
