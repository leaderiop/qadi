# ADR-QD-114 — A port states what it serves

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-114                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-08                                     |
> | Status         | Accepted — amends ADR-QD-094, ADR-QD-107       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-11): amendment — ARCH-70: leaves leaves the facet for the description asks; servingFor derives through asks and asked; the own-records pseudo-name is gone (ADR-QD-134, CCR-QD-412)<br>1.0 (2026-11-08): Initial (ARCH-53, CCR-QD-392) |

---

## Context

Which policy leaf asks which port, under what name, and how a host's allowlist admits that name was
stated **six times**, all in `PortRemote.ts` and the port wires:

- the `PortServing` declaration itself, the interface a host writes by hand;
- `ADMITTED`, a table closed over `PortName` mapping each port to the names its declaration admits;
- each port wire's `asked`, the one name an allowlist admits or refuses for a request;
- the `Collector` interface, one set per port;
- `collectNames`, a `Match.value` over the six port-reading policy tags; and
- `servingFor`'s five hand-written sets and the five declaration members built from them.

Two of the six were compile-checked: `PortServing`, and `ADMITTED` (closed over `PortName`, so a sixth
port without a row was TS2741). The other four agreed with them only by test. A leaf added to
`collectNames` and forgotten in `servingFor`'s sets compiled, and the failure was a runtime one: the
re-check the client made asked a name the declaration did not admit, and the server answered
`Refused: NotServed`. The property that every question `evaluate` puts to a port is admitted by
`servingFor([policy])` caught it only for a generated policy that happened to contain the leaf.

[ADR-QD-094](094-a-port-is-described-once.md) is the rule that a port's facts are stated once, on its
description, and everything else is derived. Its CCR-QD-270 amendment declined one field, though: a
`fixture` on `PortDescription` "would put a test-data shape into every production description and break
every literal". The question this ADR answers is whether a serving facet is the same kind of field.
The maintainer approved that amendment at the phase's D-01 checkpoint on 2026-11-08 (no reason was
recorded with the approval).

## Decision

- **Every port's description states `serving`**, a required `PortServingFacet<N, Args>`
  (`PortDescription.serving`), written in each port module beside `wire`. It holds five members:
  - `allowlist`, the word its `PortServing` slot earns: `"required"` (a host must name every name it
    serves: the attribute and custom-predicate ports), `"open"` (a host may leave it unrestricted: the
    relationship and history ports) or `"opt-in"` (served only when declared, and it has no names: the
    signature port). The word is computed from the slot by type (`AllowlistOf`), so a facet whose word
    disagrees with its slot does not compile.
  - `leaves`, a `ServedLeaves`: the policy leaf tags that read this port, each with the one name the
    leaf asks. A handler is typed by the tag it is stored under.
  - `asked`, the one name an allowlist admits or refuses for a request (it moved here from `PortWire`).
  - `admitted`, the names a declaration admits, or `undefined` when it leaves the port open.
  - `declare`, the declaration that serves exactly a given list of names, as this port's own member of a
    `PortServing`.
- **`PortServing` stays the hand-written public declaration**, moved to `PortServing.ts` (a leaf that
  imports only `Policy` and `PortName`, as types) so that a description can be typed by it without the
  import cycle `PortRemote.ts` closed. Its shape is unchanged, pinned by `PortServing.tst.ts`, and the
  allowlist word is checked against it by type.
- **`answerRemotely` admits through the facet** (`d.serving.admitted(serving)` and `d.serving.asked`),
  and **`servingFor` collects and declares through every port's facet**: one pass over the policy's
  nodes asks each facet's `leaves` for a name, and `declare` turns the sorted names into the port's
  member. `ADMITTED`, the `Collector` interface, `collectNames` and `servingFor`'s five sets are gone,
  and **`PortWire` no longer carries `asked`**: it deals only with JSON.
- **This is not the rejected `fixture` field.** A fixture is test data, and shipping it in every
  production description is a cost production pays for nothing. A serving facet is behaviour a
  production server runs on every remote question: `answerRemotely` reads it each time. It adds a
  required member the same way `wire` did (ADR-QD-107), and ADR-QD-094's CCR-QD-270 sentence still
  holds for fixtures.

## Alternatives considered

- **The status quo: six statements.** Two compile-checked, four agreeing by test, and a leaf added in
  one place and forgotten in another is a runtime `NotServed`.
- **A `PORT_SERVING` table in `Ports.ts` beside `PORT_FIXTURES`.** That is a second per-port table,
  which ADR-QD-107 rejected for `PORT_WIRES`: it puts a port's facts in two places, which ADR-QD-094
  removed.
- **Deriving `PortServing` from the facets by mapped and conditional types.** The public type becomes
  unreadable on hover and in the docs, and a type test would have to prove it equal to the written
  one anyway. Writing it out and typing each facet against its slot gives the same check.
- **One generic interpreter of the allowlist word over a declaration field name.** Indexing a
  declaration by a generic field name does not typecheck without `as` (AGENTS.md §6), so each facet
  carries its two small functions (`admitted` and `declare`) instead.

## Consequences

- A new port is a description including its facet, plus a `PortServing` row, each compile-checked
  against the other.
- A new port-reading policy leaf is one `leaves` entry on the port that answers it, pinned by the
  leaf-coverage test (`PortRemote.test.ts`, "serving facets").
- `PortDescription` gains a required member. That is breaking for a hand-built description, but
  unreleased: it ships in 0.12 together with `wire`.
- Port modules name policy leaf tags through the facet's types, so the facet is the one place a port
  and a policy leaf meet.
- The pass-through cleanup that shipped beside this (one `tabulatePorts`, the registry-derived
  `fixturePortsLayer`, and `@qadi/testing`'s pass-through) is recorded in ADR-QD-094's CCR-QD-392
  amendment.

## Related

[ADR-QD-094](094-a-port-is-described-once.md), [ADR-QD-107](107-a-port-is-answered-remotely-through-its-description.md),
[ADR-QD-099](099-entry-points-are-a-closed-list.md),
[BEH-QD-331](../behaviors/34-remote-ports.md#beh-qd-331-a-served-question-outside-the-hosts-serving-declaration-must-be-refused),
[INV-QD-095](../invariants.md#inv-qd-095-every-port-is-described-once-and-every-derived-layer-agrees-with-its-description),
[INV-QD-241](../invariants.md#inv-qd-241-a-remote-port-fails-where-its-store-fails).

> **Amended (ARCH-70, 2026-11-11, CCR-QD-412): `leaves` leaves the facet for the description's `asks`.**
> The Decision above gives the facet a `leaves` member, a `ServedLeaves` that states, for each policy leaf
> tag that reads the port, the one name the leaf asks. That is a second statement of the request each
> leaf's read builds, and it is removed: `ServedLeaves` and `PortServingFacet.leaves` are gone, and the
> description states `asks` (`LeafRequests<P>`) instead, which the reads and `servingFor` both use. The
> facet keeps `allowlist`, `asked`, `admitted` and `declare`. `servingFor` derives each name as `asked`
> of the request a leaf's `asks` entry builds at an anonymous, resource-less site, and records whether
> any leaf asked the port; `declare` receives `{ names, asked }`, so the opt-in signature port is
> declared exactly when a leaf asks it and the `"own-records"` pseudo-name `leaves` carried for it is
> gone. A new port-reading leaf is one `asks` entry; the leaf-coverage test remains as the guard. This
> amendment is the human's override of the earlier choice to leave the agreement to a test
> (`_DECISIONS-v1.2.md`, 2026-11-11). See
> [ADR-QD-134](134-a-resource-scoped-port-read-is-one-read.md).
