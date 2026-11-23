# ADR-QD-189 — Remedies asks core whether a fixture row meets a signature or acted leaf

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-189                                   |
> | Revision       | 1.8                                            |
> | Effective Date | 2026-11-23                                     |
> | Status         | Accepted — amends ADR-QD-058 and ADR-QD-094   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.8 (2026-11-23): decision 4: the refusal sentence names the member and the kind of value, never the value itself (code review iteration 2 IN-03, CCR-QD-468)<br>1.7 (2026-11-23): decision 4: the absent member is stated as unreadable or refused by its schema, and the acted judgement's site failure carries the leaf's event (code review iteration 2 IN-02, CCR-QD-468)<br>1.6 (2026-11-23): decision 4: the list of rows is read through readRows, and its pins are named (code review iteration 2 WR-01, CCR-QD-468)<br>1.5 (2026-11-23): decisions 1 and 7 state the decision and its reason in the spec's own terms (code review IN-05, CCR-QD-468)<br>1.4 (2026-11-23): enforcement: the custom-predicate sentence, each fact checked once (code review IN-06, CCR-QD-468)<br>1.3 (2026-11-23): decision 4: a member is absent exactly when its schema refuses the value, and the cause is the store's own when the key admits it (code review WR-02, CCR-QD-468)<br>1.2 (2026-11-23): decision 4 and 5: the refusal is total over a row, a subject and a resource that throw, through one guarded read (code review WR-01, CCR-QD-468)<br>1.1 (2026-11-23): what enforces it: the compiler, the scripts, the tests by title and what review keeps; the acted evidence (ARCH-123, CCR-QD-468)<br>1.0 (2026-11-23): Initial release (ARCH-123, CCR-QD-468) |

---

## Context

`@qadi/devtools` builds a remedy for a denied simulation: the smallest edit to a fixture
that would turn the denial into an allow. For a `hasSignature` or a `hasActed` leaf it has to
know whether the fixture already holds a row that meets the leaf, and the code before ADR-QD-189
answered that question itself, in `Remedies.ts`, beside the port that already answers it.

The `Signature` arm restated the signature port's match and scoping inline: the subject, a
resource id exactly when the leaf is resource-scoped, the meaning, and the signer role when the
leaf names one. The `Acted` arm read both scopes as the exact `(subject, event, resource)`
triple, so at `Any` scope it offered a redundant event row for a subject that had acted on
another resource, and it called a leaf that already holds unremediable at a site with no
resource id (BEH-QD-092).

Four further defects sat on the same lines, and the decision has to close them rather than
move them.

- A signature fixture the port refuses, an untyped row whose subject has no request key, was
  read as unmet and offered a row that still fails.
- A request the signature key refuses because its subject id is not a string, a symbol,
  made the port read die. `signatureHistoryPort.failure` built `SignatureHistoryUnavailable`
  with that subject id and the error's schema refused it, against BEH-QD-410's rule that a
  refused key fails closed and never throws.
- The history fixture keyed its rows by structural hashing, so a row or request member whose
  read throws, a revoked proxy, threw out of the fixture, and a member no key admits, a
  symbol, answered `"NotActed"`, which `hasNotActed` reads as an allow.
- The refusal claimed every value and held only for the values a typed caller can build. A
  `null` row, a getter that throws and a proxy whose trap throws still threw out of the
  fixture, the judgement and the remedy table, so the claim is made true rather than narrowed.
- The custom-predicate refusal was two sentences for one fact, one in the remedy table and one
  in the simulation field table.

Devtools already asks core's `judgeMatcher` for matcher leaves (ADR-QD-091), and core already
writes the fixture data-to-layer mapping once (`PORT_FIXTURES`). The signature and acted
leaves were the two it did not ask.

## Decision

1. **A change, not a recorded rejection.** Whether a fixture row meets a `hasSignature` or a
   `hasActed` leaf is core's answer, and `SignatureMatch.ts` stays package-private. The
   alternative, recording a rejection, keeps two statements of one rule and leaves the refusals
   below in place. The owner chose the change, for the most complete and clean result.
2. **Core gains two pure, synchronous judgements on its fixture side.**
   `signatureAnswerFromSignatures(signatures, leaf, site)` sits beside
   `signatureHistoryFromSignatures` and answers
   `Result<SignatureAnswer, MissingResourceId | SignatureHistoryUnavailable>`.
   `actedAnswerFromEvents(events, leaf, site)` sits beside `decisionHistoryFromEvents` and
   answers `Result<"Acted" | "NotActed", MissingResourceId | DecisionHistoryUnavailable>`.
   Each answers what its port, read for that leaf at that site over those rows, answers, in the
   read's order: the description's `asks`, the missing-id check, the lookup. The acted
   judgement carries no `"Unknown"`, because the closed-world event fixture never answers it,
   and each judgement carries its port's unavailable error, because a row or request the key
   refuses reaches it.
3. **The lookups and the answer rule are shared.** Each fixture's lookup is module-private and
   read by both its layer and its judgement, and the answer `{ matched, onFile }` is built by one
   rule in `SignatureMatch.ts` that `askSignature` and the signature judgement share. The history
   fixture keys its rows and its requests through `decisionHistoryPort.key`, as the signature
   fixture keys through `signatureHistoryPort.key`, so both fixtures read one key text per pair
   and fail closed on one refusal (BEH-QD-410).
4. **The refusal is total.** For every value a request member, the list of fixture rows, a
   fixture row, the site's subject or the site's resource holds, including `null` or
   `undefined`, a getter that throws, a proxy whose trap throws and a list that is a revoked
   proxy or whose `length` throws, the fixture layer, the read over it and the judgement answer
   or fail with the port's own typed error and never throw or die. Each untrusted field is read
   through one guarded read, `readGuarded` in `PortKey.ts`, which turns a throw into
   `KeyRefusal.Unreadable` with the field's path and `thrownMessage` of what was thrown, so
   the refusal sentence names the field; the list is read through `readRows`, the same read
   over the list's own elements. The class a refusal names is a string by construction: a
   class whose `name` is a symbol or an object is named by its `toString` brand, so the
   sentence is built without reading a `name` that cannot be written as text. A row's
   fields are read once, where its lookup key
   is built; the site is read once, where the judgement builds the request, and a subject or
   resource that throws is named as the site, and the acted judgement's failure for it still
   carries the leaf's own `event`, which the site does not decide. The evaluator's own read of
   its site is not guarded: it holds a subject `evaluate` already read.
   `SignatureHistoryUnavailable.subjectId` and `DecisionHistoryUnavailable.event` become
   optional, and each description's `failure` sets a member only when the member's own schema
   admits the request's value (`Schema.is`), as it already did for `resourceId`. An absent member
   says the request's value for it was unreadable or one the member's schema refuses, whether
   or not the key refuses it, so a subject id that is an object, which the key admits, leaves it
   absent too. The cause is `describeKeyRefusal`'s sentence when the key refuses the request,
   which names the member and the kind of value, and
   the store's own cause when the key admits it. The
   representation is the error class itself, so `SinkCodec` and `@qadi/http`'s response body
   carry an absent member with no second schema (ADR-QD-060), and the response body's two
   members become optional with it.
5. **The remedy table asks.** The site is `subjectOf`'s subject and the form's resource. For a
   signature, met is no row, unmet is one `AddSignature` row whose resource id is the request's
   (from the description's `asks`), `MissingResourceId` is skipped with "the check names no
   resource id", and `SignatureHistoryUnavailable` is skipped with the refusal's text. For an
   event, `Acted` is no row, `NotActed` with a site resource id is one `AddEvent` row on it,
   `NotActed` with none, or `MissingResourceId`, is skipped the same way, and
   `DecisionHistoryUnavailable` is skipped with the refusal's text. One module-scope
   `Match.tagsExhaustive` over the three failure tags dispatches the skips (AGENTS.md §5a), so
   `remedyEdits` is total over every site and fixture it is given. `hasNotActed` contributes
   nothing, as before.
6. **The custom-predicate refusal is one value.** `NO_CUSTOM_PREDICATE_FIELD` in
   `SimulationFields.ts` is what `FIXTURE_DATA.CustomPredicate` is and what the remedy table
   reads. The sentence kept is the one the panel shows.
7. **Core's public surface gains two names, because the acted arm had the same defect in the
   same function.** It is observable at `Any` scope, and the complete fix asks core for both. It also loses `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput`,
   which the keyed fixture leaves unread.
8. **ADR-QD-099 needs no exception.** Both names live in barreled modules, and
   `SignatureMatch.ts` stays out of the barrel.

## Alternatives considered

- **Evaluate the one leaf through `fixturePortsLayer` from the remedy table.** It makes
  `remedyEdits` an Effect or builds a runtime per requirement, breaks `WhatIf.ts`'s synchronous
  `derive`, and ties the remedy table to the sealed simulation layer (ADR-QD-050).
- **A recorded rejection.** It keeps two statements of one rule, and leaves the two refusals
  above in place.
- **A boolean answer.** It hides both refusals, which the remedy table must treat differently.
- **A new tagged union.** It is a second vocabulary for the port's answer.
- **`SignatureMatch.ts` as the home.** It is out of the barrel and holds no fixture.
  **`PortAccess.ts`** is out of the barrel too (ADR-QD-099). **`Ports.ts`** is the registry,
  not a place for a judgement.
- **One exported table keyed by leaf tag.** It mixes two answer types behind one name and sits
  apart from the fixtures whose lookups it must share.
- **A third judgement for relationships.** Its form equality is the fixture's own exact-triple
  key, so there is no divergence to fix.
- **For the refused request, a guard at each call site of the port's `failure`.** It leaves the
  next caller free to throw again, where a total `failure` closes every one.
- **Carrying the offending value as a string.** A symbol's text is not the value, and a second
  string member would be a field whose meaning depends on another.
- **A closed tagged member saying which request member was refused.** The cause's sentence
  already names it, so it would be a second statement of one fact.
- **Answering `"Unknown"` or `"NotActed"` for a refused history request.** `hasNotActed` would
  read either as an allow (BEH-QD-091, BEH-QD-093).

## Consequences

`@qadi/core` gains two exports and loses three. `ActedEvent`, `ActedAnywhere` and
`ActedAnywhereInput` are removed: once the history fixture keys its rows through
`decisionHistoryPort.key`, nothing constructs or reads the two classes, and
`ActedAnywhereInput` typed only `ActedAnywhere`. Qadi carries no dead public code, and nothing
replaces them for a host, since the fixture's keying is the port's own key. `ActedEventInput`
stays, because `decisionHistoryFromEvents` takes it and `Ports.ts` and devtools' simulation model
(`SimulationFields.ts` among it) read it.

`SignatureHistoryUnavailable.subjectId` and `DecisionHistoryUnavailable.event` become optional on
the sink record. That is a minor changeset with a breaking-change paragraph naming the three
removed exports and both optional members, and a section of the upgrade guide.

`@qadi/http`'s `SignatureHistoryUnavailableResponse` and `DecisionHistoryUnavailableResponse`
carry those members only when the error has them. That is a minor changeset with a
breaking-change paragraph, because a client reading either member unconditionally finds it
absent when the request held a value the wire cannot carry.

`@qadi/devtools` changes only where the old arms diverged, a patch changeset: no redundant or
falsely skipped `Any`-scope event row, and a refused signature or event fixture, or a site the
key refuses or that cannot be read, is skipped with the refusal's sentence rather than offered a
row or thrown, and a form subject or resource that throws is skipped with what it threw. The
history fixture's rows are keyed by the port's key text.

`sameSignature` stays, because the form's duplicate check compares every field and the port's
match ignores `signedAt`, `algorithm` and `keyId` (ADR-QD-058's trust on presence).

What enforces each rule is named under "What enforces it" below.

## What enforces it

**The compiler** holds the judgements' result types, through the two type tests:
`packages/core/test/SignatureHistory.tst.ts`
("signatureAnswerFromSignatures answers a SignatureAnswer or exactly its two failures") and
`packages/core/test/DecisionHistory.tst.ts`
("actedAnswerFromEvents answers Acted or NotActed, or fails as the history read fails"), so a widened
failure type or an `"Unknown"` answer does not compile. The remedy table reads every failure through one
`Match.tagsExhaustive` dispatcher over the three failure tags, so a fourth is a compile error, and its
`Requirement` variants carry the leaf each arm asks about. The errors' optional members are typed by their
schemas, so a call site other than `failure`'s own guarded one that sets one to a value the schema refuses
is a type error.

**The scripts.** `scripts/check-api-surface.mjs` names both new exports in the overview, refuses
`SignatureMatch.ts` in the barrel through its `ENTRY` check and, with `ActedEvent`, `ActedAnywhere` and
`ActedAnywhereInput` removed from the overview, refuses any of them exported again undocumented.
`scripts/check-package-install.mjs` refuses a non-entry module in its check 3b and runs both judgements in the
packed consumer. `scripts/check-house-style.mjs` holds the twelve schema errors to AGENTS.md's table, which is
unchanged because no error class is added or removed: two gain an optional member.

**The tests**, by file and exact title.

- The core conformance rows: `packages/core/test/SignatureHistory.test.ts`
  ("answers as askSignature over the fixture layer does, on every case of the product") and
  `packages/core/test/DecisionHistory.test.ts`
  ("answers as askActed over the fixture layer does, on every case of the product").
- The core refusal rows that pin the total refusal of BEH-QD-410:
  `packages/core/test/SignatureHistory.test.ts`
  ("a refused fixture row fails as the read does, with the refusal and never matched: false",
  "a refused query key fails as the read does, with no subject id and never matched: false",
  "fails as SignatureHistoryUnavailable with no subject id and the refusal as its cause, never dying",
  "a fixture row that cannot be read fails every read, naming the field and what was thrown",
  "a site subject that cannot be read fails the judgement with no subject id, naming the site",
  "a resource id that throws fails a Resource leaf, which an Any leaf never reads",
  "a list that cannot be read fails every read, naming the list and what was thrown",
  "a row and a site fail with a sentence that names the class generically",
  "the error has no subject id and the cause is the store's own") and
  `packages/core/test/DecisionHistory.test.ts`
  ("a site whose subject id is a symbol fails as the read does, with the refusal and never NotActed",
  "an event row whose subject id is a symbol fails as the read does, with the refusal and never NotActed",
  "a refused event fails as the read does, with no event and never NotActed",
  "a subject whose id is a symbol fails as DecisionHistoryUnavailable, never answering NotActed",
  "an event that is a symbol fails with no event and the refusal as its cause, never answering NotActed",
  "a fixture row whose subject id is a symbol fails every read, never answering NotActed",
  "a fixture row whose event cannot be read fails every read, never throwing",
  "a fixture row that cannot be read fails every read, naming the field and what was thrown",
  "a site subject that cannot be read fails the judgement with the leaf's event, naming the site",
  "a resource id that throws fails a Resource leaf, which an Any leaf never reads",
  "a list that cannot be read fails every read, naming the list and what was thrown",
  "a row and a site fail with a sentence that names the class generically",
  "the error has no event and the cause is the store's own").
- The remedy table over a row, a list of rows or a site it cannot read:
  `packages/devtools/test/model/RemedyTotality.test.ts` (each of a null row, a row whose getter
  throws and a row that is a throwing proxy, for a signature leaf and an event leaf, a form
  subject or resource that cannot be read, a list that is a revoked proxy, whose `length`
  throws or whose getter on the form throws, and a row holding an object whose class name is
  not text, each skipped with its sentence).
- The `SinkCodec` round trips for an absent member: `packages/core/test/SinkCodec.test.ts`
  ("a SignatureHistoryUnavailable with no subject id round-trips without one",
  "a DecisionHistoryUnavailable with no event round-trips without one"), and the response body for it:
  `packages/http/test/QadiHttpError.test.ts`
  ("the SignatureHistoryUnavailable projection and response body carry no subject id when the error has none",
  "the DecisionHistoryUnavailable projection and response body carry no event when the error has none").
- The agreement rows and their refusal rows, each a closed product whose size it asserts:
  `packages/devtools/test/model/RemedySignatureConformance.test.ts`
  ("the product holds 1184 cases over four sites, four leaves and 74 lists",
  "a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read",
  "a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read") and
  `packages/devtools/test/model/RemedyActedConformance.test.ts`
  ("the product holds 144 cases over four sites, two leaves and 18 lists",
  "a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read",
  "a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read").
- The custom-predicate sentence, each fact checked once: the field table's cell is the one shared
  value, `packages/devtools/test/model/SimulationFields.test.ts`
  ("the custom-predicate cell is the one shared no-vocabulary value"), and the remedy table's skip
  gives that value's reason, `packages/devtools/test/model/Remedies.test.ts`
  ("names a custom predicate it cannot remedy, rather than staying silent").

**The totality's mechanism** is `Schema.is` on each member before `failure` sets it, the history fixture
keyed through the port's key, and `readGuarded` on every field a row or a site is read for, so a refused
request has no path to a throw or to `"NotActed"`.

**What review keeps.** That each lookup and the answer rule are read and not restated is kept by review, since
no script counts the reads; it was seen failing once, when a copy of the lookup drifted and the conformance
rows went red. That the products cover every case the code distinguishes is kept by review too.

**The acted evidence.** The acted agreement file failed on the code before this decision on 14 `Any`-scope
cases, a redundant row at a site with an id and a false skip at a site without one, and passes after it.

## Related

[ADR-QD-058](./058-hassignature-a-ninth-service-and-a-decomposable-leaf.md),
[ADR-QD-094](./094-a-port-is-described-once.md),
[ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-134](./134-a-resource-scoped-port-read-is-one-read.md),
[ADR-QD-133](./133-a-port-request-is-derived-from-its-wire-question.md),
[ADR-QD-060](./060-schema-taggederror-for-the-nine-wire-crossing-errors.md),
[ADR-QD-072](./072-schema-taggederror-for-accessdenied-and-undischargedobligation.md),
[ADR-QD-050](./050-a-simulation-is-sealed.md),
[ADR-QD-091](./091-comparison-semantics-have-one-owner.md),
[ADR-QD-117](./117-a-signature-ledger-is-a-keyed-store.md), BEH-QD-222, BEH-QD-410, BEH-QD-092,
BEH-QD-093, BEH-QD-091,
[INV-QD-120](../invariants.md#inv-qd-120-a-signature-recorded-for-a-discharge-is-keyed-by-the-question-it-discharged)
and [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed).
