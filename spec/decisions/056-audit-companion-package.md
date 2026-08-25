# ADR-QD-056 — `@qadi/audit`: a companion package narrows ADR-QD-016

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-056                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-08-25                                     |
> | Status         | Accepted — narrows ADR-QD-016                  |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-08-25): INV-QD-051–055 and [33 — Audit Pipeline](../behaviors/33-audit-pipeline.md) close the formal-invariant gap this ADR's first revision named; mutation testing (`stryker.audit.mjs`, gate 20) closes the other — both real follow-ups, not recorded here as done until they were (CCR-QD-086)<br>1.0 (2026-08-25): Initial release (CCR-QD-085) |

---

## Context

[ADR-QD-016](./016-gxp-out-of-scope.md) put regulated-environment compliance
support out of scope, and its reasoning was not "GxP is uninteresting" — it
was that the predecessor's version of it did not work. A write-ahead log, a
circuit breaker, a scope registry and a completeness monitor were exported and
referenced nowhere else; the one real audit write called
`auditTrail.record()` directly, bypassing all of them. An IQ/OQ/PQ package
asserted qualification steps that were `typeof x === "function"` checks, one
of them hardcoded to pass. The decision that ADR recorded was narrower than
its title suggests: *this particular, unassembled, over-claiming
implementation* is out of scope, not the domain.

[ADR-QD-054](./054-a-companion-package-may-compile-a-dialect.md) already drew
the general shape a narrowing like this takes: an optional, separately
versioned, dependency-free companion package can do what `@qadi/core` itself
should not — there, compiling a `Predicate` into a live query; here, writing
an audit trail. `@qadi/core` gains nothing through either package existing.

**HexDi's own Guard** (`/Users/mohammadalmechkor/Projects/Perso/hex-di`,
`libs/guard/core/src/`) was read as a live comparison, not a template. It
carries the exact same defect ADR-QD-016 named, still present: `createWriteAheadLog`,
`createCircuitBreaker`, `enforceRetention` and a `SignatureServicePort` are
all individually implemented and unit-tested, but `guard.ts`'s
`enforcePolicy()` writes straight to `AuditTrail.record()`, calling none of
them. `CircuitOpenError` is modeled in the error union and never thrown by
the real path. One piece — `hasSignature`, a policy predicate checking
`context.signatures` — is genuinely wired, and it is called out below
precisely because adopting its equivalent is *not* what this ADR authorizes.

This ADR was produced by a `wayfinder` map — ten grilled decision tickets,
each resolved and closed before implementation began, following the "plan,
don't do" discipline that methodology holds itself to. What follows
synthesizes those ten resolutions; the map itself is the record of how each
was reached.

## Decision

### `@qadi/audit` may exist; `@qadi/core` still may not depend on it, and does not

A fifth companion package, alongside `@qadi/predicate-sql`,
`@qadi/predicate-prisma`, `@qadi/promise` and `@qadi/http`. `@qadi/core`
gains zero new dependencies. `@qadi/audit` itself is dependency-free too —
every capability that needs real storage, I/O, identity or crypto is a
caller-supplied port; nothing here opens a connection, generates a key, or
assumes a schema.

One package, not several, unlike the predicate compilers: the five
capabilities below are designed to compose into one assembled pipeline, so
ADR-QD-054's "reject one multi-target package" precedent does not transfer —
that rejection was about two mutually exclusive dialects sharing one mode
flag, not about capabilities that are meant to run together.

### The seam: `DecisionSink`, plus one small, general `@qadi/core` fix

`@qadi/audit` hangs off `packages/core/src/DecisionSink.ts` — write-only,
read via `Effect.serviceOption`, error channel `never` by design — the same
seam ADR-QD-054's companion packages need nothing from `@qadi/core` to reach.

One exception, small and separately justified: `DecisionRecord` gains a
top-level `subjectId: SubjectId`, covering both its `Decided` and `Failed`
outcomes. A `Failed` record — a broken attribute lookup, a missing action —
previously carried no actor at all, on the record or on any
`EvaluationError` member, even though `Evaluate.ts` resolves `CurrentSubject`
before the code that can fail. This is a threading gap, not a missing
capability, and it is justified on general `DecisionSink` completeness — any
sink consumer wants to know who a failed evaluation was for — not as a
GxP-specific carve-out. It is why "you would not need to touch `@qadi/core`
at all" turned out to be almost true rather than exactly true.

### Five capabilities, one pipeline, two structurally outside it

**Audit trail** (`AuditTrailPort`) — a `Context.Service`, one method:
`write: (entry: AuditEntry) => Effect.Effect<void, AuditWriteError>`. `AuditEntry`
is `Schema`-derived, diverging deliberately from the predicate compilers'
hand-written style: it is durably persisted by the caller's own store and
re-parsed later, possibly by a different process — the same condition
[ADR-QD-002](./002-schema-derived-policy-adt.md) used to make `Policy` the
Schema exception. It is built on `@qadi/core`'s own `SinkRecordWire` rather
than re-deriving `Policy`/`Trace`/`Obligation` schemas a second time. Each
`SinkRecord` — `Decided`, `Failed`, and `Obligations` alike — writes as its
own independent, immutable row; `evaluationId` correlation happens at read
time. Encoding refuses rather than approximates: a `resource` carrying a
value with no safe durable representation fails `AuditEntryNotEncodable`
rather than being partially written, coerced, or silently dropped — the same
rule ADR-QD-054 generalized for predicate compilation, one layer further from
the wire.

**Staging** (`AuditStagingPort`, optional) — what the predecessor and HexDi
both called a write-ahead log, renamed because "WAL" implies a durability
guarantee `@qadi/audit` cannot provide: it owns no storage of its own. Two
methods, `stage`/`commit`, no `discard` — every failure path either never
produced a handle to discard or deliberately leaves the staged entry alone
for the caller's own reconciliation. Best-effort: an `AuditStagingError`
never blocks the write that follows it.

**Circuit breaker** — fully internal, no port: an Effect-native `Ref`-backed
state machine built when the `DecisionSink` `Layer` is constructed, using
`Clock.currentTimeMillis`. Trips only on `AuditWriteError`, not
`AuditStagingError`. While open, `record()` still calls `stage()` if wired
(cheap, local, preserves recoverability) but skips `write()` entirely — an
unwired deployment genuinely drops the entry while open, a staged one keeps
it recoverable. No public `CircuitOpenError`: trip state is a plain internal
check, never constructed or inspected outside this module, which is exactly
what keeps it from repeating HexDi's unreachable-error mistake.

**The assembled pipeline** (`AuditDecisionSinkLive`) is the piece that
exists specifically so the four capabilities above are not merely
individually correct: `Layer.Layer<DecisionSink, never, AuditTrailPort>`,
requiring `AuditTrailPort`, reading `AuditStagingPort` optionally. One
`record()` sequence — encode, read breaker state, stage if wired, write or
skip, react to the outcome — reachable through the one call every evaluation
already makes.

**Retention, archival and decommissioning** (`Retention.ts`,
`ChainIntegrity.ts`, `AuditArchive.ts`, `DecommissioningChecklist.ts`) sit
structurally **outside** `DecisionSink.record` entirely: pure functions and
data, caller-invoked and caller-scheduled, since `@qadi/audit` has no
scheduler of its own. Purge selection is parameterized on `now` rather than
reading `Date.now()`. Sequence-gap verification is a single flat, global
sequence — no HexDi-style `scopeId` grouping key, since Qadi has no scope
concept to group by. The six-step decommissioning checklist refuses an
unknown step id rather than silently no-opping, the one place this ADR found
HexDi's own behavior worth explicitly not copying.

**E-signature capture** (`SignatureCapturePort`,
`signatureObligationHandler`) is wired through `Qadi.ts`'s
`ObligationHandler`, not `DecisionSink` — signature capture is a condition
of enforcement, and `ObligationHandler` is exactly that mechanism already.
No reauthentication modeling: no `ReauthenticationChallenge`/`Token` types,
because whatever reauthentication a real `capture` implementation needs is
invisible to this package by design. **No shipped default, not even a
`Noop`** — HexDi's `NoopSignatureService` "always validates successfully,"
which is the exact false-compliance affordance ADR-QD-016 rejected;
`Qadi.enforce`'s existing fail-closed behavior on an unwired obligation is
the safe default, for free.

### E-signature *check* is explicitly out of scope

HexDi's `hasSignature` predicate is the one genuinely wired piece in the
entire reference implementation compared against on this map, and it is
deliberately not adopted here. Extending Qadi's `Policy` ADT with an
equivalent is a `@qadi/core` change on the scale of ADR-QD-016's own
narrowing — not a corollary of it, and not something a companion package's
destination covers. It needs its own future ADR and grilling session.

### Correctness: a family of properties, not one differential invariant

`@qadi/predicate-sql` has two independent interpreters of the same tree —
`evaluatePredicate` and compiled-SQL execution — to compare, which is what
[INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)
and its descendants check. `@qadi/audit` has exactly one interpreter, `record()`, so
forcing a single agreement property onto it would manufacture an analogy the
design does not support. Correctness instead rests on public,
deterministic `AuditTrailPortTest`/`AuditStagingPortTest` in-memory `Layer`s
(useful to any consumer's own tests, not just this package's) and:

- the one genuine differential property this design does have — staging-present
  and staging-absent configurations of the same pipeline, driven by the same
  generated `SinkRecord` sequence, must produce identical **committed**
  `AuditEntry` sequences (`test/Agreement.test.ts`, formalized as
  [INV-QD-051](../invariants.md#inv-qd-051-staging-presence-or-absence-never-changes-the-committed-audit-entries));
- scripted threshold-boundary tests for the circuit breaker, since a property
  generated at random is unlikely to land on the exact failing count that
  trips it (`test/CircuitBreaker.test.ts`, formalized — together with a
  concurrency stress test, since `Ref`-backed state transitions must stay
  correct under the concurrent `record()` calls `filter`/`filterStream`
  produce — as
  [INV-QD-052](../invariants.md#inv-qd-052-once-a-circuit-breaker-trips-write-is-never-attempted-again-until-reset));
- an algebraic partition property for retention: `retained ∪ purged = entries`,
  `retained ∩ purged = ∅` (`test/Retention.test.ts`, formalized as
  [INV-QD-053](../invariants.md#inv-qd-053-retained-and-purged-partition-entries));
- gap-and-duplicate detection over generated sequence numbers
  (`test/ChainIntegrity.test.ts`, formalized as
  [INV-QD-054](../invariants.md#inv-qd-054-verifychainintegrity-detects-every-gap-and-duplicate-sequence-number));
- a call-once property for the signature obligation handler
  (`test/SignatureCapturePort.test.ts`, formalized as
  [INV-QD-055](../invariants.md#inv-qd-055-signatureobligationhandler-calls-capture-exactly-once-and-the-obligationrecord-matches)).

Distilled into `spec/invariants.md` and [33 — Audit
Pipeline](../behaviors/33-audit-pipeline.md) as a follow-up to this ADR's
initial release, closing the gap the first revision named rather than left
implicit (CCR-QD-086).

**A new finding, not previously flagged anywhere on the map it came from:**
`Qadi.ts`'s `filter`/`filterStream` evaluate items concurrently, so concurrent
`record()` calls are possible. `@qadi/audit` explicitly refuses to guarantee
write order matches evaluation order under concurrency — every `AuditEntry`
carries `at`, and optionally `sequenceNumber`, so a reader reconstructs true
order by sorting rather than trusting write order. Serializing writes to
provide an ordering guarantee nobody asked for would reintroduce the kind of
internal buffering state staging's own design already refused.

### Alternatives rejected

- **Fold audit capability into `@qadi/core`.** Rejected for the same reason
  ADR-QD-054 rejected a database dependency in core: `@qadi/core` would need
  to know about audit storage well enough to type against it, which is the
  dependency this narrowing exists to avoid acquiring.
- **Ship a `Noop` signature service, matching HexDi.** Rejected — see above.
  `Qadi.enforce`'s fail-closed default already covers the case a `Noop`
  would otherwise paper over, at the cost of manufacturing a real risk.
- **Model reauthentication as part of e-signature capture.** Rejected:
  identity and crypto are outside this library's competence, and a
  minimal one-input-one-output port is what "refuse rather than approximate"
  looks like at this boundary.
- **Adopt HexDi's `hasSignature` as a `Policy` predicate.** Rejected for this
  map — see "E-signature check is explicitly out of scope" above.
- **A single INV-QD-NNN-style differential property for the whole package.**
  Rejected: there is no second interpreter to compare `record()` against, so
  forcing the shape would describe a property the design does not have.

## Consequences

**Positive**:

- Regulated-environment consumers gain a real, assembled audit pipeline
  without `@qadi/core` acquiring any new dependency — the exact gap ADR-QD-016
  left, closed the way ADR-QD-054 already closed row-level security's.
- The one piece of the predecessor's/HexDi's story genuinely worth keeping —
  the state-machine shape of the circuit breaker, the six-step decommissioning
  sequence — survives; the parts that were unassembled or over-claiming do
  not.
- `DecisionRecord.subjectId` closes a real, previously undocumented gap for
  every `DecisionSink` consumer, not just this one.

**Negative**:

- A new package to version, test, and keep in agreement with `@qadi/core` as
  `DecisionRecord`/`DecisionSink` evolve.
- E-signature *check* remains a real gap in Qadi's row-level and policy
  story; this ADR closes the capture half only, deliberately.

**Trade-off accepted**: five capabilities in one package, at the cost of a
package whose surface is noticeably larger than either predicate compiler's.
The house preference is to build every mode a design is layered for rather
than default to a minimal slice — and here that is not a stylistic
preference so much as the destination the map itself was chartered toward:
an assembly proving the pieces are wired together, not a narrower package
that would have left the exact question this ADR exists to answer
unanswered.

**Implemented**: `packages/audit/`, with the test suite named in
"Correctness" above as the evidence, [33 — Audit
Pipeline](../behaviors/33-audit-pipeline.md), and
[INV-QD-051](../invariants.md#inv-qd-051-staging-presence-or-absence-never-changes-the-committed-audit-entries)
through
[INV-QD-055](../invariants.md#inv-qd-055-signatureobligationhandler-calls-capture-exactly-once-and-the-obligationrecord-matches).
Mutation testing (`stryker.audit.mjs`, `pnpm check` gate 20) scores 92%,
clearing both the 80% break and the 90% high threshold.
