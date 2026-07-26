# 37 — Models Qadi Does Not Implement

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-37                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What this document is

This is the boundary document. Every other document in this series describes a
model Qadi expresses, or could express at a stated cost. This one accounts for
the remainder — models that are real, widely deployed and still not Qadi's to
implement — so the set reads as a complete statement rather than a selection.

The thesis is [the URS](../urs.md)'s, and every section below is an instance of
it: **Qadi decides. It does not authenticate, persist, or administer.** Each
family here is enforced by a mechanism Qadi is not — a cipher, a certificate
chain, an administrative surface, a language runtime, an operating system, an
organisational discipline. For each, the useful question is not "when will Qadi
support this?" but "what sits beside Qadi so that the system supports it?"

All eight families share one row of the matrix:

| Property | Value |
| -------- | ----- |
| Status | **Excluded** |
| Priority | **P4** |
| Enablers required | None — no enabler would move any of these |
| Breaking change | Not applicable |

"Excluded" does not mean unimportant; several families below are more rigorous
than anything Qadi implements. It means the enforcement point lives somewhere
Qadi cannot stand. There is likewise no worked example here — elsewhere in the
series an example proves a claim, and here there is nothing to express, so one
would misrepresent a boundary as a recipe.

## Cryptographic enforcement

Attribute-based encryption inverts where the policy lives. Under ciphertext-policy
ABE the rule is embedded in the ciphertext and the key carries attributes; under
key-policy ABE the arrangement is reversed. Functional and predicate encryption
generalise further, and proxy re-encryption lets a semi-trusted intermediary
transform a ciphertext for a new recipient without seeing what it protects.

The enforcement is the mathematics. Nothing is consulted and nothing answers
*allow* or *deny* — the wrong key fails to produce a plaintext. A decision point
is not a part missing from this design but a part it deliberately removes, since
the value proposition is that no trusted party stands in the path.

**Pairs with Qadi how:** use Qadi for the application-layer decision, and
cryptography for data that must stay unreadable even to the storage operator.
Qadi assumes the process running it is trusted; ABE exists for when it is not.

## Delegation and trust-management certificates

SPKI/SDSI, the RT framework and PERMIS express authority as a signed chain: a
verifier reconstructs it to establish that a presented right descends from an
issuer it trusts. Macaroons, biscuits and UCANs add cryptographic *attenuation*
— a holder mints a strictly weaker token without consulting the issuer.

None of this is a decision model in the sense this series uses. Verifying a
chain — signatures, issuers, caveats, expiry — is authentication-shaped work
establishing *who is speaking and with what standing*, before a decision has any
input to consume. Authentication is out of scope, and a verifier inside Qadi
would put key material and trust roots in a component that holds neither.

**Pairs with Qadi how:** verify the chain in the layer that owns the trust
roots, then present the result as an `AuthSubject` — attenuated capabilities
become permissions, caveats become subject attributes. This is the boundary
[11 — Claims-Based Access Control](./11-claims.md) draws for tokens: the mapping
is the work, and the deciding is already solved.

## Administration and safety analysis

Administrative RBAC governs who may assign a role to whom. The
Harrison–Ruzzo–Ullman model, Take–Grant and the Typed Access Matrix ask the same
question one level above any individual access: in a system where rights can be
created, transferred and revoked, can a right ever reach a subject who should
not hold it?

Two facts make this a poor candidate for absorption. Qadi has no administrative
surface at all — it reads a subject, a policy and a resource and returns a
decision, storing and mutating nothing, so there is no state transition for a
safety analysis to reason about. And HRU's safety problem is undecidable in
general, worth stating plainly because it explains why nobody can simply add
this later; a library appearing to ship a general answer would make exactly the
claim [ADR-QD-016](../decisions/016-gxp-out-of-scope.md) exists to prevent.

**Pairs with Qadi how:** build the administration surface in the application,
where the grant tables already live — then note the consequence, that "may this
subject grant `editor` here?" is itself an authorization decision, so Qadi can
decide *that*. What it cannot do is perform the grant, or certify it is safe.

## Integrity through certified transactions

Clark–Wilson models commercial integrity rather than military confidentiality.
Its unit is the well-formed transaction: a certified transformation procedure,
the constrained data items it may touch, and a triple binding a user to both.
The force comes from *certification* — an attestation that a transformation
takes valid state to valid state — with separation of duty and a log.

Qadi expresses one leg of that triple. Deciding that a subject may invoke a
procedure is an ordinary authorization decision; certifying that the procedure
preserves the constraints is a claim about the code inside it, which no access
check establishes. Clark–Wilson also rests on an append-only record of every
transformation — durable tamper-evident audit, excluded by
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md).

**Pairs with Qadi how:** Qadi decides who may invoke a procedure, and can
enforce static separation of duty over the roles the triples name. The
certification, the verification procedures and the log belong to the application.

## Information flow control

Information flow control tracks where data *goes* after it has been read.
Decentralised IFC systems — Flume, Asbestos, HiStar — label processes and
enforce that one which has read secret data cannot afterwards write to a public
channel except through an explicit declassification; taint tracking is the same
idea applied dynamically at the value level. Following propagation means
observing assignments, returns and channel writes — the job of a runtime, a
compiler pass or a kernel. A library invoked at a call site sees that site and
nothing after it.

The contrast with [27 — Bell–LaPadula](./27-bell-lapadula.md) is the sharpest
line here, because BLP *is* on the roadmap. BLP is a rule about individual
accesses: given this clearance and this classification, may this read or this
write proceed? That is a decision, it takes bounded inputs, and enablers **E1**
and **E4** are what it costs — E1 having since shipped. IFC is a rule about a trajectory: given everything
this process has touched, where may this datum travel? Deciding is in scope.
Following is not.

**Pairs with Qadi how:** decide the access with Qadi at the boundary where data
enters the application, and constrain what happens afterwards with mechanisms
built for it — a runtime, a sandbox, or an architecture that keeps classified
data out of the process entirely.

## Object capabilities

The object-capability discipline holds that an unforgeable reference *is* the
authority: holding one permits invoking it, and absent one there is no ambient
authority — no registry, no current user, no lookup — to consult. Authority
propagates only by being passed, which makes a program's reference graph an
exact model of who can do what. That is a property of a language; Qadi is the
opposite arrangement, and a decision point reintroduces ambient authority.

The contrast with [04 — Capability and Permission Tokens](./04-capability.md)
needs drawing carefully, because the shared word hides the difference. That
model is capability-as-a-check: the subject carries permission tokens and the
evaluator tests membership. A token is data — copied, inspected, serialized —
and something must consult it. An object capability is not data and is never
consulted; holding it is the whole of the authority. The first ships today; the
second is not a library's to offer.

**Pairs with Qadi how:** the two occupy different layers and can coexist. A
system built on object capabilities internally can still use Qadi at its edge to
decide which requests are admitted before any reference is handed out.

## Sticky policies

A sticky policy travels with the data it governs, attached as metadata, so the
rule survives copying and export — the privacy and data-sharing concern being
what a recipient does with a record after it has legitimately left.

The hard part is not evaluation but adhesion. Keeping a policy attached across
serialization formats, storage systems, organisational boundaries and copy
operations is a data-format and lifecycle problem, solved with a container
format, a cryptographic binding, or a contract backed by neither — and Qadi has
no view of a record's lifecycle and cannot observe a copy.

**Pairs with Qadi how:** Qadi can evaluate the policy once extracted, and this
is better than it sounds, because Qadi's policies serialize by design — a
schema-defined value that round-trips through JSON is a plausible payload for
such a container. What it cannot do is guarantee the policy stays attached.

## Architectural and operational patterns

Zero Trust, CARTA, just-in-time access, zero standing privilege, privileged
access management and break-glass are architectures and operational disciplines,
not models a library implements — descriptions of how an organisation arranges
its systems, provisions credentials and behaves during an incident. None reduces
to a rule a library evaluates, and a component claiming to "implement Zero
Trust" has confused a posture with a check.

Qadi is a component *within* several of them. Zero Trust's insistence that every
request be authorized on its own merits rather than inherited from network
position is served by a decision point at every call site, which is what
[the URS](../urs.md) asks of enforcement. Just-in-time access and zero standing
privilege shape what a subject's roles contain at the moment of evaluation;
Qadi reads what it is given, with no opinion about how briefly it was held.

Break-glass deserves a specific warning. Emergency override is only *safe*
because it is recorded — the control is not the check, which by definition
permits the access, but the durable, tamper-evident record that makes the
override answerable afterwards. Qadi reports decisions to tracing and nothing
more, and durable tamper-evident audit trails are excluded by
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md). **An application must not
ship break-glass on Qadi alone.** The override itself is expressible as a policy
in an afternoon, which is what makes this hazardous: the easy half is the half
Qadi provides.

**Pairs with Qadi how:** treat Qadi as the decision point these architectures
assume exists, and source the credential lifecycle, the session brokering and
the audit record from the systems built for them.

## Why exclusion is recorded, not implied

A matrix that lists only what a library does is a feature list, and a feature
list cannot be read as a boundary. A reader asking whether Qadi handles
information flow control finds nothing, and nothing is ambiguous: it may mean
*not supported*, *not yet*, *not considered*, or *supported under another name*.
An exclusion with a reason collapses that — "no, because following propagation
needs a runtime, and here is what to use instead" is something to act on.

The predecessor failed in the adjacent direction. It shipped compliance
primitives — a write-ahead log, hash-chained audit entries, a completeness
monitor, a qualification package — that existed as parts and were never
assembled. The implied capability was the harm: a reader who saw an audit trail
among the exports concluded there was one, and nothing contradicted them
([ADR-QD-016](../decisions/016-gxp-out-of-scope.md)). Silence about the gap
between the part and the guarantee made the artefact a liability.

This document applies the same discipline at the other end. Just as no
unassembled primitive should imply a capability, no omission should imply an
intention — and recording exclusions with reasons is what makes the set honest.

It follows that this document, like the rest of the `MOD-QD` series, carries no
verification claim and allocates no identifier from the series that assert one.
There is nothing here for a test to exercise — an exclusion is not a behaviour.
What it asserts is a boundary and a set of reasons, reviewed rather than tested.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [User Requirements](../urs.md) · [ADR-QD-016](../decisions/016-gxp-out-of-scope.md) · [04 — Capability and Permission Tokens](./04-capability.md)_
