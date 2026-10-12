# ADR-QD-107 — A port is answered remotely through its description

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-107                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-08                                     |
> | Status         | Accepted — amends ADR-QD-094, ADR-QD-051       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-08): Initial (ARCH-31, CCR-QD-382) |

---

## Context

A client that re-checks a seeded decision ([BEH-QD-151](../behaviors/19-hydration.md)) needs its
ports answered by a server, and no part of that was in the library. Every host wrote both halves by
hand: query parsing on the server, answer guards on the client that restated core's literal sets,
and an outage mapping. The newsroom example, the one implementation, got it wrong in five ways,
each confirmed by a probe against its real routes and browser adapters:

- **An outage became an answer.** The attribute route answered a store outage with a 503, the
  relationship and history routes with `200 "Unknown"`. `"Unknown"` means *nobody can say*, so the
  evaluator denied, and under `not(...)` it granted: `not(hasRelationship("banned"))` was **Allow**
  during a relationship outage, and an author's own draft was **Deny** where the server, store up,
  allowed it, which hydration then announced as a mismatch against its own requirement that a client
  failure not be reported as one (BEH-QD-152). [INV-QD-006](../invariants.md): failure is not denial.
- **A malformed question was answered.** A missing parameter was `?? ""`, and `depth=abc` reached a
  traversal resolver as `NaN`.
- **A route answered about a different subject than the one asked.** It replaced the query's
  `subjectId` with the cookie's. That prevented enumeration, but it answered a *different* question
  under the asked one's name: asking about Nadia with Yasmine's cookie returned `Unrelated`, and the
  devtools simulator, which asks about other subjects for real, was told so with confidence.
- **An unrecognised 2xx body was read as `"Unknown"`**, so a proxy or a version-skewed server
  produced the same denial-or-grant.
- **A served read was invisible.** The routes called the services directly, so no `qadi.*` span, no
  call metric and no defect guard: a dying store was a 500 by accident.

The set is the wrong size to patch per host. A description already states a port's name, span,
typed error, request key and fail-closed answer ([ADR-QD-094](094-a-port-is-described-once.md)); it
did not state what a question and an answer look like on a wire, and the span cannot (a span field
is a `SpanValue`, and an attribute's value is arbitrary data, INV-QD-044).

## Decision

- **A description states its wire** (**breaking** for anything that builds a `PortDescription`).
  `PortDescription.wire: PortWire<Args, A>` is required, written in each port module beside
  `attributes` through the package-private `portWire`, and the registry makes a missing one a
  compile error. `PortWire` exposes closed-over operations (`encodeQuestion`, `decodeQuestion`,
  `encodeAnswer`, `decodeAnswer`, `asked`, and the span projections), so generic code never names a
  port's question type. Question and answer schemas are strict (`UNTRUSTED_DECODE_OPTIONS`), depth
  bounded, and refuse a value with no JSON form with the walk a sink record already uses
  (`JsonHazard.ts`, extracted verbatim from `SinkCodec.ts`). `RelatedResult` and `ActedResult` become
  schema-derived consts with the same types (the `ValueRef` pattern).
- **The question carries its subject id, and the serving half refuses any subject but the
  session's.** `answerRemotely` compares the question's `subjectId` with `CurrentSubject.id` and
  replies `Refused: SubjectMismatch`. The request is built with the **session's** `AuthSubject`, so
  a custom predicate is handed the session's roles and attributes and never a client's description
  of them. A body-supplied subject is never identity.
- **The reply is a closed union, and no server cause crosses.** `PortWireReply` is `Answered` (the
  port's own answer) | `Unavailable` (carries nothing) | `Refused { reason }` with `reason` one of
  `SubjectMismatch`, `Malformed`, `NotServed`, `Unencodable`. The asker turns every non-answer into
  **the port's own typed error**, with a `RemotePortError` (carrying a `RemotePortFailure`:
  `Unavailable`, `Refused`, `Transport`, `Undecodable`) as its `cause`. `"Unknown"` crosses only as an
  `Answered` value, so it means what the serving port said. Nothing new is a `Schema.TaggedError`
  (AGENTS.md §4's budget is unchanged); `RemotePortError` is a `Data.TaggedError` because a client
  decodes nothing into it, and it exists so a port whose error has no `cause` field
  (`CustomPredicateError`) renders a readable `reason` instead of `[object Object]`.
- **A host declares what it serves** (`PortServing`). A port not named has no route. An attribute or
  custom-predicate name must be on a required allowlist, because an open-ended question with a value
  for an answer would serve `constructor` and `__proto__` too; a relation or an event may be left
  open (its answer is a closed word, INV-QD-044); the signature port answers full `Signature`
  records, more than evaluation reads, so serving it is an explicit one-member opt-in
  (`signatures: "own-records"`) over the subject's own records. `servingFor(policies)` derives the
  declaration from the policies a client may ask about, pinned by a property: every question
  `evaluate` puts to a port for a generated policy is admitted by `servingFor([policy])`.
- **A served read goes through `PortAccess.ts`** (ADR-QD-077). `servePortRead` opens the port's own
  span with `qadi.interpreter = "remote"`, counts in a third sibling metric,
  `qadi_port_served_calls_total` (all five ports preregistered), and maps a dying store to the port's
  typed error. `PortInterpreter` is the closed `"evaluate" | "toPredicate" | "remote"`, stated once
  (`PortInterpreter.ts`) as a schema with the type derived, which removes the double statement it had.
  A third closed-union member is **breaking** for an exhaustive consumer; `@qadi/devtools` labels it
  `served` in the Services panel.
- **Two transport-free halves in core, one adapter each in `@qadi/http`.** `answerRemotely` and
  `askRemotely` (with `remotePorts` and `servingFor`) have a seam of `send: (question) =>
  Effect<unknown, RemotePortFailure>` on one side and the reply union on the other. `@qadi/http`
  supplies `portRoutes(permission, policy, serving, options?)` (guarded through `addGuardedRoute`, so
  listed in `/__permissions`), `portRoutesUnguarded(reason, serving, options?)` and
  `remotePortsLayer({ baseUrl, ports, prefix? })` over `HttpClient`. The route is `POST
  <prefix>/<PortName>` with a JSON body, `Cache-Control: no-store`, and a status from a closed table
  (`Answered` 200, `Unavailable` 503, `Malformed` 400, `SubjectMismatch` 403, `NotServed` 404,
  `Unencodable` 500). The body is always the reply and a client decodes it whatever the status, so
  the semantics live in the reply and not in one transport; a server action or a WebSocket would be
  another adapter at the same seam. The default prefix is `/__ports`. The unguarded form logs its
  reason **once, at construction**, not per request as `permissionRegistryRouteUnguarded` does: a
  port route is hit on every client re-check.
- **Server-render behaviour stays the host's.** Whether a render may ask is the host's knowledge, so
  the library adds no `pendingPort`; the newsroom keeps its `typeof window` switch.

## Alternatives considered

- **A separate `PORT_WIRES` table.** Leaves `PortDescription` untouched but puts a port's facts in
  two places, which ADR-QD-094 removed.
- **Reusing the span structs as the wire.** Refuted: they are lossy by design (a span cannot hold a
  value) and INV-QD-044's type floor forbids it.
- **Substituting the session subject for the asked one** (the example's behaviour). No enumeration,
  but a silently wrong answer; refused is honest.
- **Sending the port's `Schema.TaggedError` with its `cause`.** Discloses server internals, which
  `QadiHttpError.ts` already refuses for the same five classes.
- **`effect/rpc` or a derived `HttpApi` group as the transport.** An opaque protocol beside
  `HttpRouter` in the first case, ADR-QD-036's "no `Rebuild`" typing wall in the second. The core
  halves allow either later.
- **Batching or caching remote answers.** Each question is one round trip, as before; a batching
  `send` is a later adapter at the same seam, and `DecisionCache` already caches decisions.

## Consequences

- `PortDescription` gains a required member, and `PortInterpreter` a third literal. Both are
  breaking (0.x, a minor, marked in the changeset). `RelationshipDepth` is exported so a question
  and a decoded policy hold `depth` to one bound.
- A remote outage reaches the evaluator as the port's own error: `not(hasRelationship(...))` is a
  failure, not a grant ([INV-QD-241](../invariants.md)). A question about another subject is a 403,
  so the devtools simulator's Live source fails honestly for a subject other than the session's.
- A signature opt-in discloses the subject's own full records to the subject.
- `qadi_port_served_calls_total` is a new series; devtools reads the span, not the metric, so its
  Services card does not yet show served counts.
- Reopening ADR-QD-094's "the description gains no field" (ARCH-42's amendment): that sentence was
  about fixtures, not about wire.
