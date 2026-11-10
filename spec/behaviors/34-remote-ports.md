# 34 — Remote Ports

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-34                                    |
> | Revision       | 1.6                                            |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.6 (2026-11-10): The unguarded port routes' once-at-construction warning is stated here, agreeing with ADR-QD-107 (ARCH-61, CCR-QD-402)<br>1.5 (2026-11-08): BEH-QD-331 — a required allowlist that is missing or not a list is refused `NotServed` at run time, the store never read (code review WR-01)<br>1.4 (2026-11-08): BEH-QD-331 — the serving facts are stated once on the port's description, PortDescription.serving (ARCH-53, ADR-QD-114, CCR-QD-392)<br>1.3 (2026-11-08): BEH-QD-333 points to BEH-QD-338, where the port route address and the reply-body contract are defined once (ARCH-52, CCR-QD-391)<br>1.2 (2026-11-08): BEH-QD-332 — an answer the span's `disclose` cannot read is the port's typed error, answered `Unavailable`, never a defect (code review WR-01)<br>1.1 (2026-11-08): BEH-QD-332 — a served span equals a local one through pose and disclose, carries a signature asker's requirement, and a store that throws is the port's typed error (ARCH-47, ADR-QD-109, CCR-QD-386)<br>1.0 (2026-10-08): Initial (ARCH-31, CCR-QD-382) |

_Previous: [33 — Audit Pipeline](./33-audit-pipeline.md)_

---

A client that re-checks a seeded decision ([BEH-QD-151](./19-hydration.md)) needs its ports
answered by a server. Each port's description states what its question and answer look like on a
wire (`PortDescription.wire`, [ADR-QD-094](../decisions/094-a-port-is-described-once.md)), and two
transport-free halves in `@qadi/core` derive from it: `answerRemotely` for the answering side and
`askRemotely` for the asking side. `@qadi/http` supplies one adapter for each
([ADR-QD-107](../decisions/107-a-port-is-answered-remotely-through-its-description.md)).

```typescript
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import { exists, hasAttribute, hasRelationship, servingFor } from "@qadi/core";
import { portRoutesUnguarded, remotePortsLayer } from "@qadi/http";

const policies = [hasAttribute("standing", exists()), hasRelationship("author-of")];

// The server: answers only about the session's own subject, and only the questions
// these policies can ask. The reason is read by a reviewer, never by the code.
export const routes = portRoutesUnguarded(
  "answers only about the session's own subject",
  servingFor(policies),
  { prefix: "/ports" },
);

// The browser: the same ports, asked of the server. Every non-answer is the port's
// own typed error, so an outage fails the evaluation instead of denying or granting.
export const browserPorts = remotePortsLayer({
  baseUrl: "https://app.example.com/api",
  prefix: "/ports",
  ports: ["AttributeResolver", "RelationshipResolver"],
}).pipe(Layer.provide(FetchHttpClient.layer));
```

`portRoutesUnguarded` logs its warning once, when the layer is built, not per request, because a
port route is hit on every client re-check and a warning per request would bury the log it is meant
to appear in ([ADR-QD-107](../decisions/107-a-port-is-answered-remotely-through-its-description.md)).
One warning covers every port it serves.

## BEH-QD-329: An outage on the answering side reaches the asker as the port's own error

An outage on the answering side (a store that fails, or dies) MUST reach the asker as the port's own
typed error, carrying a `RemotePortError` as its `cause`. It MUST NOT be sent as `"Unknown"`, and no
server cause text (the store's message, a stack, a value) crosses: the `Unavailable` reply carries
nothing. `"Unknown"` crosses only as an `Answered` value that the serving port itself returned. An
unreadable reply, a transport failure and a refusal are the port's own error too, never an answer.

A remote outage therefore makes `not(hasRelationship(...))` and `not(hasActed(...))` a failure,
where reading it as `"Unknown"` made them a grant ([INV-QD-241](../invariants.md),
[INV-QD-006](../invariants.md)).

## BEH-QD-330: A question about any subject but the session's MUST be refused

`answerRemotely` compares the question's `subjectId` with `CurrentSubject.id` and replies
`Refused: SubjectMismatch` on a difference; the HTTP adapter answers 403. It MUST NOT answer about
the session's subject under another subject's name, and it MUST NOT read a subject from the body as
identity: the request it hands the port is built with the session's own `AuthSubject`, so a custom
predicate receives the session's roles and attributes, never a client's description of them.

## BEH-QD-331: A served question outside the host's serving declaration MUST be refused

A port a host's `PortServing` does not name has no route. A question whose attribute, relation,
event or predicate name is not admitted by the declaration is `Refused: NotServed` (404). An
attribute or custom-predicate allowlist is required, so a prototype key (`constructor`,
`__proto__`) is never served by default, and that holds at run time as well as in the type: a
declaration that reaches `answerRemotely` without a required list, or with a value that is not a
list, is `Refused: NotServed` and never reaches the store; the signature port is served only by the
explicit opt-in `signatures: "own-records"`. `servingFor(policies)` derives the declaration from the policies a
client may ask about, and every question `evaluate` asks of a port for those policies is admitted
by it.

Which policy leaves ask a port, the name a served request asks, and whether the port's allowlist is
required, open or an opt-in are stated once, on the port's description (`PortDescription.serving`,
[ADR-QD-114](../decisions/114-a-port-states-what-it-serves.md)). `answerRemotely` admits through it and
`servingFor` collects through it, so a new port-reading leaf changes one description. The declaration's
shape (`PortServing`) is unchanged.

## BEH-QD-332: A served read MUST open the port's span with `qadi.interpreter = "remote"`

A served question is read through `servePortRead` (`PortAccess.ts`), which is `readPort`, the one
body every local read runs, under the port's own span ([BEH-QD-227](./30-port-calls.md)) with
`qadi.interpreter = "remote"`. The question reaches the span through the description's `pose` and
the answer through `disclose(answer, request)`, so a served span carries exactly what a local read
of the same request carries, apart from the interpreter. A signature asker's requirement crosses in
the question, so the served span says `qadi.meaning`, `qadi.signer_role` and `qadi.matched`
([ADR-QD-109](../decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md)). The
call counts once in `qadi_port_served_calls_total` (never in `qadi_port_calls_total`), and a store
that dies **or throws**, or answers something the span's `disclose` cannot read, becomes the port's
typed error rather than a defect, answered `Unavailable` on the wire
([BEH-QD-261](./05-evaluator.md)). The answer reaches the span only through the
description's `disclose`, so an attribute's value is never recorded
([INV-QD-044](../invariants.md)).

## BEH-QD-333: An answer with no JSON form MUST be refused, never thrown

Encoding an answer (an attribute holding a `Set`, a `Map`, a `bigint`, `NaN`, a cycle, a function)
and decoding a question or reply that is malformed or nested past the decode bound MUST yield a
refusal (`Refused: Unencodable` or `Malformed`; on the asking side `Undecodable`), never an
exception. The same walk a sink record uses decides what has a JSON form, and every wire value is
rebuilt as a detached copy. Every HTTP reply is JSON, carries `Cache-Control: no-store`, and is
decoded by a client whatever its status.
The address both adapters use, and this status contract, are defined once
([BEH-QD-338](./23-http.md#beh-qd-338-the-port-routes-and-their-client-share-one-address)).
