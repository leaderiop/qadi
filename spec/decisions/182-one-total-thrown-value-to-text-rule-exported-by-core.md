# ADR-QD-182 — One total thrown-value-to-text rule, exported by core

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-182                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-22                                     |
> | Status         | Accepted — reads ADR-QD-154, ADR-QD-099        |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-22): Initial release (ARCH-116, CCR-QD-461) |

---

## Context

Six places in `@qadi/core` turned a value a caller's code threw into text, each with its own copy of the rule:
`SinkCodec`, `CustomPredicate`, `JsonHazard`, `PortKey`, `PortDerivation` and `PortWireEncode`. Only `SinkCodec`'s was
total. `Result.try` rethrows when its `catch` arm throws, so a value whose `toString` or `message` getter throws escaped
`toJson`, `toJsonRecord`, a port's request key and a port wire's encodes, each documented as never throwing or as
refusing with a typed error.

The same value broke a second thing. `Cause.pretty` throws for a cause that failed or died with such a value. A custom
predicate that died with one turned an evaluation into a defect, which AGENTS.md section 4 forbids for an authorization
decision. `@qadi/devtools` renders a run's cause with it in the timeline and diagnostics feeds, in the diagnostics
wiring read and in the policy explorer, and there a throw left a panel on its last reading or escaped from a handler,
while the gates feed guarded the same call by hand.

Three more copies sat outside core: `@qadi/http`'s transport failure, `@qadi/react`'s reporter line and `@qadi/devtools`'
capture. The capture recorded nothing for a cause it could not stringify, and captured a custom predicate failure under
the predicate's name, so a replay carried a name where the port had reported a reason.

## Decision

1. One module, `packages/core/src/ThrownMessage.ts`, holds two plain synchronous functions. Neither throws.
2. `thrownMessage(value)` turns a caught value into a string. Each read is guarded. An `Error` whose `message` is a
   string is that message, without its name. Any other value is its `String` form, and a string comes back unchanged.
   Where neither can be read, because a getter, a `toString` or a proxy trap throws, it is the one placeholder.
3. The one placeholder is `a value that could not be described`, the words `SinkCodec` and the devtools gates feed
   already used. It carries none of the value.
4. `causeMessage(cause)` turns an Effect `Cause` into a string: `Cause.pretty(cause)` when that does not throw, so a
   cause that renders keeps its trace, otherwise `thrownMessage(Cause.squash(cause))`, the failed or died value itself.
   It is the only `Cause.pretty` call in shipped code.
5. Both are public `@qadi/core` exports, because the packages above core need them
   ([ADR-QD-099](./099-entry-points-are-a-closed-list.md): a module another package needs is exported from the barrel).
   They are the thrown-value sibling of `valueText` ([ADR-QD-154](./154-one-value-to-text-function-exported-by-core.md)).
6. Every site reads through them. In core: `SinkCodec`, `CustomPredicate`, `JsonHazard`, `PortKey`, `PortDerivation` and
   `PortWireEncode` (the two older copies, `describeThrown` and `renderReason`, are deleted, not aliased). Outside
   core: `@qadi/http`'s transport failure, `@qadi/react`'s reporter line and `@qadi/devtools`' capture and feeds.
7. `customPredicatePort.defect` builds its reason with `causeMessage`, so a custom predicate that died with a value
   that cannot be read ends as `CustomPredicateError`, the port's typed error, and an evaluation is never a defect.
8. `@qadi/react`'s reporter line is `name: message` only for an `Error` whose own `message` is a string, and
   `thrownMessage(error)` for anything else, so no error is named twice.
9. The devtools capture keeps a failure's own text: its `cause`, else its `reason`, else its own string message through
   `thrownMessage(error)`, each field read through one typed, guarded reader. A replay carries what the port reported.
10. The devtools timeline feed, diagnostics feed, diagnostics wiring read and policy explorer render a run's cause with
    `causeMessage`, and the gates feed does too, in place of its own guard.
11. The `String(cause)` calls on an Effect `Cause` (`DecisionSinkForwarding.ts`, `EncodeRefusalReport.ts`,
    `SinkReport.ts`) were checked and are left alone: Effect already guards that string form, and `String(Cause.die(hostile))`
    returns `Cause([Die([toString threw])])`.

This rule and its public surface were decided autonomously on 2026-11-22 under the owner's instruction to take the most
complete, clean option: the cause renderer as a second public export (decision 4), the devtools feeds in scope
(decision 10), the capture keeping a failure's own text (decision 9) and react naming an error once (decision 8).

## Alternatives considered

- **Inside `ValueText.ts`, or an amendment of ADR-QD-154.** Rejected: a value's JSON text and a caught value's message
  are two rules with two fallbacks, and one function would carry both.
- **Package-private in core, each package keeping its own copy.** Rejected: the copies are what failed, most of them
  unguarded, and ADR-QD-099 says a module another package needs is exported.
- **An Effect or a `Result` chain.** Rejected: the callers are `catch` arms and synchronous code, and `Result.try` is
  the call that rethrows.
- **`String` for every value, keeping `Error: `.** Rejected: four of the six sites already gave the message, and the
  name adds nothing a refusal's reader needs.
- **The capture recording a cause-less failure under its tag.** Rejected: it loses a custom predicate's reason and
  replays noise. **Or as `String(error)`**, the old behaviour: it captured the predicate's name as if it were the
  reason.
- **React prefixing the name to a message that is not a string.** Rejected: it names the error twice.
- **Deferring the devtools feeds, or a devtools-private cause guard.** Rejected: deferring leaves the rule unmet in a
  package this change already edits, and a private guard is two rules for one thing.
- **Guarding `String(cause)` on an Effect `Cause` at the three sites in decision 11.** Rejected: Effect already guards
  it, so a second guard could never run.

## Consequences

- Visible text changes: a wire conversion's refusal loses its `Error: ` prefix; the old angle-bracketed placeholder is
  replaced in custom predicate reasons and captures; a custom predicate failure is captured and replayed with its
  reason; a failure with no text of its own is captured with an empty message and a `null` cause reads as no cause; a
  run the devtools feeds cannot render is stated as stopped or failed with the placeholder; a throw the gates feed
  cannot render reads as the placeholder, not a sentence of its own; react names an `Error` with a non-string message
  by its string form; a sink record's non-string `message` is refused with its `String` form.
- The exports cost two overview rows, probes of both in the packed consumer (`scripts/check-package-install.mjs`, gate 14), and a minor changeset for
  `@qadi/core` with patch changesets for `@qadi/http`, `@qadi/react` and `@qadi/devtools`.
- Two invariants state the rule: a "never throws" function stays total when the value it caught is hostile
  (INV-QD-383), and no shipped code renders a cause through a call that can throw (INV-QD-384).

## Related

[ADR-QD-154](./154-one-value-to-text-function-exported-by-core.md), [ADR-QD-099](./099-entry-points-are-a-closed-list.md),
BEH-QD-230, BEH-QD-507, BEH-QD-519, BEH-QD-637, BEH-QD-681 to BEH-QD-685, INV-QD-383, INV-QD-384.
