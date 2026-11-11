# ADR-QD-109 — A port's span is projected once, and every read is one body

> **Document Control**
>
> | Property       | Value                                                                    |
> | -------------- | ------------------------------------------------------------------------ |
> | Document ID    | QADI-ADR-109                                                             |
> | Revision       | 1.5                                                                      |
> | Effective Date | 2026-11-08                                                               |
> | Status         | Accepted — amends ADR-QD-077, ADR-QD-094, ADR-QD-107, ADR-QD-058         |
> | Author         | Qadi Engineering                                                         |
> | Classification | Architecture Decision Record                                             |
> | Change History | 1.5 (2026-11-11): amendment — ARCH-70: the accepted duplicate early annotation is retired; readScoped annotates early only when the id is missing (ADR-QD-134, CCR-QD-412)<br>1.4 (2026-11-08): Consequences — an unseen signature requirement replays as `SignatureHistoryUnavailable`, not an empty list; the replay fails closed rather than accepting the regression (code review WR-04)<br>1.3 (2026-11-08): Consequences — correct the claim that over-keying can only deny: an unseen requirement replays as an empty list, which `not(hasSignature)` grants, in devtools' what-if (code review WR-03)<br>1.2 (2026-11-08): Alternatives — the annotate-before-validate question is derived from the description's `pose`, not hand-written in the three resource-scoped reads (code review WR-02)<br>1.1 (2026-11-08): Decision 3 — `disclose` runs under the defect mapping, so a malformed store answer is the port's typed error, never a defect (code review WR-01)<br>1.0 (2026-11-08): Initial (ARCH-47, CCR-QD-386)                          |

---

## Context

A port's span says what was asked and what the port answered
([BEH-QD-227](../behaviors/30-port-calls.md), [ADR-QD-051](051-a-span-says-what-was-asked.md)).
After ARCH-31 ([ADR-QD-107](107-a-port-is-answered-remotely-through-its-description.md)) a port
is read in two places that must leave the same span: by an interpreter in this process, and by
`servePortRead` on behalf of a remote asker. Both facts were stated twice, and the two statements
had drifted. ARCH-47 verified, on 2026-11-08:

- **A served signature span said less than the local one.** The served span projected
  `{ subjectId, scope, resourceId }` for the question and an empty answer (the `spanQuestion` and
  `spanAnswer` members of the signature wire in `SignatureHistory.ts`). The local span carried
  `qadi.subject_id`, `qadi.meaning`, `qadi.scope`, `qadi.signer_role`, `qadi.resource_id`,
  `qadi.interpreter` and `qadi.matched`. `@qadi/devtools`' Services panel therefore rendered a
  served signature call as "not recorded, no answer".
- **The projection was a second copy.** In four of the five ports, `spanAnswer` was just
  `disclose`. The fifth, the signature port, was the one that disagreed.
- **The read body was written seven times.** Six local reads in `PortAccess.ts` and the served
  `servedBody` each repeated the same sequence: annotate the question, count the call, invoke the
  port, convert a defect, annotate the answer.
- **The served copy was weaker, not just different.** A planning probe showed `servePortRead` over a
  store that throws synchronously exiting with a defect (a Die), while the local read of the same
  store failed with the port's typed error, because `servedBody` invoked the method outside the
  effect `catchPortDefect` wraps. A throwing store behind a remote route was a 500 by accident, and
  the asker saw `Unavailable` only by luck of the transport.

The requirement that drove the signature disagreement is a fact about the asker, not the store:
`hasSignature` asks "is there a signature on file for this subject and resource, and does one of
them have this meaning and signer role", and a served read only ever received the first half of the
question. The asker's `meaning` and `signerRole` never crossed.

One premise recorded in the phase requirements was inaccurate. PORT-04 said the local signature
span carried `onFile`. It did not: the answer struct is `{ matched }` only, and a count of the
records on file was kept off the span on purpose (ARCH-21's non-goal, a disclosure decision of its
own).

## Decision

1. **The projection lives on the description's span attributes.** A port's question is projected by
   `pose(request)`, beside `disclose(answer, request)` for the answer, both members of the
   description's `attributes` (`PortSpan.ts`). `PortWire` deals only with JSON: the wire's
   `spanQuestion` and `spanAnswer` and the exported type `PortWireSpan` are removed.
2. **This does not contradict ADR-QD-107.** ADR-QD-107 refused "span structs as the wire": a span
   is lossy by design, a span field cannot hold an attribute's value, and INV-QD-044's type floor
   forbids it. This decision moves the span *projection* off the wire and onto the span attributes.
   The wire still never becomes a span, and a span never becomes the wire. What ADR-QD-107's Decision
   bullet listed as "and the span projections" among `PortWire`'s operations is the part superseded.
3. **One read body.** `readPort` in `PortAccess.ts` is a plain function that opens no span. It
   annotates the question (`pose` plus `qadi.interpreter`), counts in the interpreter's own sibling
   metric (a three-arm match over `evaluate`, `toPredicate` and `remote`), invokes the port inside the
   effect `catchPortDefect` wraps, annotates the answer through `disclose` in an `Effect.tap` under
   the same mapping, and converts a defect in either to the port's typed error. `disclose` is
   inside because it reads what the store returned: the signature port's matches the list against
   the requirement, so a store that answers a malformed list would otherwise make a served read die
   past `answerRemotely`'s "never fails" (code review WR-01). `servePortRead` is `readPort` with interpreter `"remote"` under the
   port's span. Each `ask*` keeps only what is its own: argument shaping, `requireResourceId` with its
   annotate-before-validate order, the relationship depth clamp, and the signature match. The six
   span names and `UNTRACED_BUDGET` are unchanged, because the named `Effect.fn` that owns a span
   stays the one that calls `readPort`.
4. **The local and the served signature spans are equal, and carry the requirement.**
   BEH-QD-227 promises `qadi.meaning`, `qadi.signer_role` and `qadi.matched` on `qadi.hasSignature`,
   and `@qadi/devtools` renders them, so the served span gains them and the local one keeps them.
   The asker's requirement crosses as optional `SignatureQuery.meaning` and `signerRole`: context,
   not a filter. A store returns every signature on file for the subject and resource whatever the
   requirement says, and the match rule is stated once (`signatureMatches`, package-private). The
   wire question gains the two keys as optional strings. **`onFile` is recorded on neither span**,
   because BEH-QD-227 does not list it and ARCH-21 kept a count of records off the span as a
   disclosure decision. PORT-04's premise that the local span carried it was inaccurate.
5. **Typing.** The description's `attributes` is the span's tables intersected with the two functions,
   typed by the description's own request and answer, so a read generic over the port correlates the
   question and the answer without a cast. The structs themselves are not intersected, so row types
   stay exact.
6. **Naming.** The new member is `pose`, because `question` is the struct and `questionOf` is
   `Question.ts`'s; the body is `readPort`.

## Alternatives considered

- **The local span drops meaning, signer role and matched.** Refused: BEH-QD-227 lists them and
  devtools renders them. Making the local span poorer to match the served one would remove a
  documented observable.
- **The projection stays on the wire.** Refused: two statements of one projection were the defect,
  and a wire is JSON, so it cannot be the place a span is stated.
- **`readPort` as an `Effect.fn`.** Refused: every read would open a second, nested span.
  `Effect.fnUntraced` is refused for another reason, the budget: `UNTRACED_BUDGET` is the three
  composite dispatchers, and a new call site needs a benchmark (AGENTS.md §5).
- **Validate the resource id, then annotate only on failure.** Refused: ADR-QD-077's order is to
  annotate the question first so a span recording a `MissingResourceId` says what the id was wanted
  for (BEH-QD-227). The cost of keeping it is one extra, agreeing annotation on the success
  path of the three resource-scoped reads (`askActedForResource`, `askRelationship`, `askSignature`
  at Resource scope), which writes equal values to the same attributes. The early annotation is
  derived from the description's `pose` of the request as far as it is known (with `scope` set by
  the read, since a missing id would make `pose` say `Any`), not hand-written beside it, so a field
  added to `pose` reaches the failure span too (code review WR-02).
- **The requirement as wire-only context.** Impossible: `askRemotely`'s Shape sees only the port's
  request, so for the requirement to reach the served read it has to be part of the request.
- **Recording `qadi.on_file`.** Refused for the reason in decision 4.

## Consequences

- `SignatureQuery` gains two optional fields (additive). `PortSpanAttributes` gains a fourth type
  parameter, `pose`, and a two-argument `disclose`; `PortSpanAttributesLike` follows.
- **The signature request key is now subject, resource, meaning and signer role**
  (`JSON.stringify([subjectId, resourceId ?? null, meaning ?? null, signerRole ?? null])`), which is
  what INV-QD-043's injectivity law asks of a key. A devtools capture keys per requirement, so it
  never replays one requirement's answer for another. **A requirement the capture never saw is a
  miss, and a miss on this port is its own typed error, `SignatureHistoryUnavailable`, not its
  `none` answer.** The empty list would say "no signatures on file", which denies `hasSignature`
  but grants `not(hasSignature)`, so a devtools what-if that edits a policy's `meaning` or
  `signerRole` would report an allow the real store would not give (code review WR-03, WR-04). The
  replay now fails closed instead: the what-if reports a failure, never a verdict, under the node
  and under its negation. The capture is not re-keyed by `(subject, resource)`: a store receives the
  requirement and may filter on it, so that would replay one requirement's answer for another. The
  first draft of this bullet said over-keying "can only miss and deny, never replay a stale allow",
  which holds for the un-negated leaf only; the second accepted the empty list. The other four
  ports' misses still answer `none` and still grant under `not(...)`, as an unwired real deployment
  does (INV-QD-007).
- **Version skew fails closed.** A new client's question carries keys an old, strict server does not
  decode, so it comes back `Malformed` and the asker turns that into the port's own typed error
  (ADR-QD-107). A question without the two keys still decodes on a new server.
- `PortSpanAttributes.pose`, the two-argument `disclose` and the removals from `PortWire` affect
  only names added after `@qadi/core@0.11.0` and not yet released.
- A served read whose store throws is now the port's typed error, answered `Unavailable` on the wire,
  the same as one whose store dies. The Die the probe found is gone.
- `@qadi/audit`'s `SignatureLedgerTest` reads by subject and resource only, because a store answers
  every signature on file and the asker matches the requirement.
- `PORT_DOUBLE_BUDGET` is unchanged: no test builds a port error by hand beyond the lines it had.

## Related

[ADR-QD-037](037-circular-imports-and-type-level-tests-are-gates.md) (the Port* leaf split stays), [ADR-QD-051](051-a-span-says-what-was-asked.md),
[ADR-QD-058](058-hassignature-a-ninth-service-and-a-decomposable-leaf.md),
[ADR-QD-077](077-both-interpreters-read-ports-through-one-module.md),
[ADR-QD-094](094-a-port-is-described-once.md),
[ADR-QD-107](107-a-port-is-answered-remotely-through-its-description.md);
[BEH-QD-227](../behaviors/30-port-calls.md), [BEH-QD-332](../behaviors/34-remote-ports.md);
[INV-QD-244](../invariants.md#inv-qd-244-a-ports-span-says-the-same-thing-whoever-asked),
[INV-QD-043](../invariants.md), [INV-QD-044](../invariants.md).

> **Amended (ARCH-70, 2026-11-11, CCR-QD-412): the accepted duplicate early annotation is retired.**
> Decision 3 says each `ask*` keeps `requireResourceId`, and the alternative "Validate the resource id,
> then annotate only on failure" accepts one extra, agreeing annotation on the success path of the three
> resource-scoped reads to keep annotate-before-validate. Both are superseded. `requireResourceId` is
> deleted and the check is `readScoped`'s; its early annotation runs **only when the id is missing**, so
> on a present id the question is annotated once, by `readPort`, and the final span attributes are
> unchanged. The cost this ADR accepted is gone, and the rule it protected (a span recording a
> `MissingResourceId` says what the id was wanted for) is kept. See
> [ADR-QD-134](134-a-resource-scoped-port-read-is-one-read.md).
