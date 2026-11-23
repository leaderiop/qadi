# ADR-QD-189 — Remedies asks core whether a fixture row meets a signature or acted leaf

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-189                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-23                                     |
> | Status         | Accepted — amends ADR-QD-058 and ADR-QD-094   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-23): Initial release (ARCH-123, CCR-QD-468) |

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
- The custom-predicate refusal was two sentences for one fact, one in the remedy table and one
  in the simulation field table.

Devtools already asks core's `judgeMatcher` for matcher leaves (ADR-QD-091), and core already
writes the fixture data-to-layer mapping once (`PORT_FIXTURES`). The signature and acted
leaves were the two it did not ask.

## Decision

1. **A change, not a recorded rejection.** Whether a fixture row meets a `hasSignature` or a
   `hasActed` leaf is core's answer, and `SignatureMatch.ts` stays package-private. This was
   decided autonomously, under the owner's standing instruction ("do not ask me; always pick
   the most complete and clean solutions"), in place of the roadmap's owner question, and it is
   recorded here before any source change.
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
4. **The refusal is total.** For every value a request member or a fixture row field holds, the
   port read, the fixture layer and the judgement answer or fail with the port's own typed
   error and never throw or die. `SignatureHistoryUnavailable.subjectId` and
   `DecisionHistoryUnavailable.event` become optional, and each description's `failure` sets a
   member only when the member's own schema admits the request's value (`Schema.is`), as it
   already did for `resourceId`. An absent member says the request held a value the wire cannot
   carry, and the cause carries `describeKeyRefusal`'s sentence, which names it. The
   representation is the error class itself, so `SinkCodec` and `@qadi/http`'s response body
   carry an absent member with no second schema (ADR-QD-060), and the response body's two
   members become optional with it. A record whose own property read throws is outside the
   domain, as for every reader of a plain record.
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
7. **Core's public surface gains two names where the milestone expected at most one.** The acted
   arm had the same defect in the same function, observable at `Any` scope, and the complete fix
   asks core for both. It also loses `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput`,
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
key refuses, is skipped with the refusal's sentence rather than offered a row or thrown. The
history fixture's rows are keyed by the port's key text.

`sameSignature` stays, because the form's duplicate check compares every field and the port's
match ignores `signedAt`, `algorithm` and `keyId` (ADR-QD-058's trust on presence).

What enforces each rule is named in a later revision of this record, once the tests that hold it
exist.

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
