# ADR-QD-106 — A decision is constructed from its trace

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-106                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-08                                     |
> | Status         | Accepted — amends ADR-QD-078, ADR-QD-096       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-08): Initial (ARCH-32, CCR-QD-301) |

---

## Context

A `Decision` stored four facts twice. Its verdict (`_tag`), `visibleFields`, `obligations` (an
`Allow`) and `reason` (a `Deny`) were constructor fields, and each was also a reading of the
trace root the decision carries. Two modules filled them in by hand, `Evaluate.ts` from a trace it
had just built and `DecisionWire.ts` from a wire value, and nothing compared the two copies.

A probe against the real codec showed the gap was open, not theoretical. A version-2 record
whose `Allow` said `allowed: false` in its trace, whose `visibleFields` differed from the root's,
whose `obligations` dropped a binding duty, or whose `Deny` reason was not the trace's, all
decoded, projected the wrong fields, and re-encoded unchanged, so the contradiction travelled
through forwarding, the stream and audit. The same held one level up: a record's `evaluationId`,
`subjectId` and policy tag were each repeated by its decision and its trace root, and none was
compared. A disclosed hydration seed had the same shape: only the root's policy tag was checked.

Two consumers already read different copies. The devtools log reads the verdict from the decision
(`isAllowed`), the inspector's field and duty panels read `visibleFields` and `obligations` from the
decision, and its tree reads the trace. For a contradictory record the log said ALLOW while the
tree's root said denied.

What this closes is a *contradictory* record, not a *forged* one. The wire carries no signature,
so a forger who writes `allowed: true` beside `_tag: "Allow"` produces a self-consistent value
that decoded before and still decodes. Nothing in the repository enforces from a decoded record
(devtools displays, the aggregator and audit read back), so the harm was an untruthful log,
inspector or trail, not an authorization bypass. A seed is still not an authority (ADR-QD-039).

## Decision

- **`Allow` and `Deny` are built from a stamp and a trace** (**breaking**). Their constructors take
  `DecisionStamp & { trace }`, with the verdict in the trace's type (`AllowingTrace`,
  `DenyingTrace`), and derive `visibleFields`, `obligations` and `reason` from it. Passing one of
  the derived fields, a trace not known to allow, or a denying trace to an `Allow` is a compile
  error. The fields stay own, readonly, JSON-visible properties; getters were probed and rejected,
  because `JSON.stringify` and spread drop them and an untyped caller throws on assignment.
- **`makeDecision(stamp, trace)` is the one constructor** in `Decision.ts`. A denying trace is
  carried as a shallow copy of the root with `allowed: false` restated, since a type predicate
  narrows only the true branch of a non-union interface. `Evaluate.ts` (now `Lifecycle.ts`) and
  `decodeDecision` both go through it. A house-style rule,
  `no-decision-constructor-outside-decision`, refuses `new Allow(` or `new Deny(` anywhere else in
  `packages/*/src`; tests are not scanned.
- **The agreement rule has one home.** `decisionDisagreement(claim, trace)` returns the first way
  a claimed verdict, fields, duties or reason contradicts the trace root, as a member of the
  closed `DecisionDisagreement` union. Fields are compared byte for byte, `undefined` (every
  field) against `[]` (none) included (INV-QD-004), and duties by `Schema.toEquivalence` over
  `Obligation`, so the comparison derives from the codec schema. A Deny's claim owes nothing.
- **Two adapters, each refusing in its own vocabulary.** `decodeDecision` returns a `Result`
  (**breaking**), and the record codec adds `DecodeRefusal.Inconsistent { disagreement }`
  (**breaking** for exhaustive matchers), also raising the record-level `EvaluationId`,
  `SubjectId` and `PolicyTag` from the same union. `@qadi/devtools`' `MalformedReason` gains
  `"inconsistent"`. `@qadi/react`'s hydration drops a `Disclosed` seed that disagrees with its
  trace as `MalformedEntry`, the reason the root-tag check already used; the drop reasons and the
  payload version do not change. A `Withheld` seed carries the only copy of its fields and has
  nothing to compare.
- **The wire does not change.** Refusing a disagreeing record changes acceptance, not content: no
  producer ever wrote one, so no version moves. The codec's own `V2_DECIDED_ALLOW` golden and its
  main round-trip fixture *were* disagreeing records, which no evaluator produces and which
  nothing noticed because nothing stated the rule; they are corrected, the golden inside its trace
  only.

## Alternatives considered

- **Derived getters on `Allow` and `Deny`.** Rejected as wrong: they vanish from `JSON.stringify`
  and spread, and an untyped caller passing the field throws.
- **Wire version 3 omitting the duplicated fields** (ADR-QD-096 amendment). Adds no guarantee the
  refusal lacks. It would force operators to re-encode retained audit rows (ADR-QD-056), split
  `DecisionWire` into a sink form and a hydration form (a `Withheld` seed has no trace and needs
  the fields on the wire, undoing ADR-QD-078's one definition), and show `UnsupportedVersion`
  on every older panel during a rolling deploy. Queued instead: the next wire version, whatever
  moves it, omits the decision's duplicated fields.
- **Type-only `Allow` and `Deny`, `makeDecision` the only public constructor.** One more break for
  no extra guarantee once the constructors derive from the trace.
- **`Malformed` with a message** for the refusal. `Malformed` already means "not a record of the
  version it claims"; this is a well-formed record that contradicts itself, a different fix.

## Consequences

- Any caller that passed `visibleFields`, `obligations` or `reason` to a constructor, or an
  unnarrowed `Trace`, no longer compiles (0.x minor). In this repository that was test fixtures
  only.
- A stored or forwarded record that contradicts itself, such as one seeded from the old
  `V2_DECIDED_ALLOW` golden, is now refused as `Inconsistent`. Records written by `evaluate` are
  unaffected.
- A consumer's exhaustive `match` over `DecodeRefusal` or `MalformedReason` needs a new arm. The
  closed unions are meant to force exactly that.
- Out of scope: internal consistency of a trace (a composite's verdict from its children), full
  positional alignment of a decoded trace with its record's policy (ADR-QD-101), and the same
  duplication in `AccessDenied` (`reason`, `policyTag`, `trace`) and in
  `ObligationRecord.obligationIds`, recorded for the tracker.
