# ADR-QD-160 — Port facts are read from the description

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-160                                   |
> | Revision       | 1.6                                            |
> | Effective Date | 2026-11-16                                     |
> | Status         | Accepted — reads ADR-QD-094, ADR-QD-109        |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.6 (2026-11-16): Consequences: marked in place when the result accepts the property, otherwise copied (ARCH-94 review WR-01)<br>1.5 (2026-11-16): Consequences: an extensible decoratePorts result is marked in place (ARCH-94 review WR-01)<br>1.4 (2026-11-16): Consequences: decoratePorts marks by the slot (ARCH-94 review IN-02)<br>1.3 (2026-11-16): Decision 2: the mark cannot be minted but can be copied deliberately (ARCH-94 review IN-01)<br>1.2 (2026-11-16): a throwing or revoked proxy reads not defaulted; the accepted-throw consequence is withdrawn (ARCH-94 review WR-02)<br>1.1 (2026-11-16): Related links the behaviours and invariants it names (ARCH-94, CCR-QD-438)<br>1.0 (2026-11-16): accepted (ARCH-94, CCR-QD-438) |

---

## Context

[ADR-QD-094](./094-a-port-is-described-once.md) states each port's facts once, in its description, and derives the
wrappers, the default and the doubles from it. [ADR-QD-109](./109-a-ports-span-is-projected-once-and-every-read-is-one-body.md)
did the same for the span a port opens. Two readers still stood outside that rule, both in `@qadi/devtools`:

- **"Is this port its fail-closed default?"** was answered by `isDefaultName`, which parsed the display name BEH-QD-196
  composes (`"<inner> (<suffix>)"`) back into a prefix and compared it with the default's name. A display name is the
  wrong thing to read a fact from, and a diagnostic is the worst place to be wrong: measured on the phase base (the RED
  rows of plan 47-01, `7 failed`), a hand-written wrapper that spreads the default and renames itself `audited <port>`
  read as a real adapter for all five ports, and a fresh object named `AttributeResolverNone (audited)` read as
  defaulted.
- **Three tables keyed by port restated facts.** `CONSEQUENCES` held each port's "what a default costs" sentence,
  `ROWS` (`model/PortCalls.ts`) held five arms that differ only by tag, and `describeOne` (`react/ServicesPanel.tsx`)
  held five per-port arms naming each port's span fields. Adding a port meant finding all three by reading.

## Decision

1. **A port's default is a mark its service carries** (D-01, D-02, D-03, D-17, D-20). The mark is an own, enumerable
   property keyed by a unique, package-private symbol (`Symbol("qadi.PortDefault")`, never `Symbol.for`), and it holds
   the `PortName` the default belongs to. `nonePort` sets it. `wrapPort` (so `…Retrying`, `…TimingOut` and the recording
   double), `boundedPort` and `decoratePorts` copy it from the shape they wrap. A scripted double, a remote asker, a
   replay and a fixture never set it: they are not the fail-closed default.
2. **One public reader, `isPortDefault(description, service)`**, in `PortDescription.ts`, is the only way to ask. It
   reads the own property descriptor, so an inherited mark reads false, and it compares the held name with
   `description.port`, so a default moved onto another port's service reads false. The key is not exported and cannot be
   minted with `Symbol.for`; it can be read off an existing default with `Object.getOwnPropertySymbols`, so copying it is
   possible but deliberate. It labels a diagnostic and guards nothing. A wrapper keeps it by spreading `inner`.
3. **The display name stays display.** BEH-QD-196's `"<inner> (<suffix>)"` is unchanged and nothing parses it (D-13).
4. **One reading per port in devtools** (D-05, D-06). `PORT_READING`, a mapped type over `PortName` in the
   package-private `model/PortReading.ts`, holds each port's consequence sentence and its call-row reading. The panel
   keeps one generic `describeCall` that dispatches through it and adds the `attempts` suffix; `CONSEQUENCES`, `describeOne`
   and `isDefaultName` are deleted. Core gets no display prose. Rendered wording is byte-identical (D-08).
5. **`ROWS` is built by one monomorphic, fully checked row builder** (R6, D-18), applied once per port, five one-line
   entries, with no `as`, `!` or `any`.
6. **`PortCall` is derived from the registry** (D-19): `{ readonly [K in PortName]: PortCallOf<K> }[PortName]`. The five
   named aliases stay.
7. **A sixth port costs devtools four lines, and the compiler names them.** Measured on a scratch sixth port that was
   reverted and never committed (D-12): in devtools `src`, `model/PortReading.ts` (the row), `model/PortCalls.ts` (the
   `ROWS` entry), `model/SimulationFields.ts` (the per-port extractor table) and `model/SimulationSource.ts` (the
   per-port `answers` table), each a TS2741. `model/Wiring.ts` and `react/ServicesPanel.tsx` are not flagged. The two
   simulation tables are there because core's `PortFixtureData` requires them; deriving them is out of scope (D-19).

Behaviours BEH-QD-571 to BEH-QD-575 and invariants INV-QD-339 and INV-QD-340 state the rule in `spec/`; they are
written by the plan that follows this one, so they are named, not linked, here.

## Alternatives considered

- **A string field on the shape (`defaulted?: true`).** Rejected: visible in `Object.keys` and JSON, forgeable by any
  caller, and able to collide with a user's own field (D-01).
- **A module-level `WeakSet` of defaults.** Rejected: a spreading wrapper builds a new object, so it loses membership,
  and that wrapper is the case that matters (D-01).
- **A registry-shared symbol (`Symbol.for`).** Rejected: anyone can mint it, so "defaulted" would be forgeable (D-20).
- **R7, an overload whose implementation widens to `unknown`.** Rejected: it dodges `as` by widening the implementation
  type, which the project's rule against widened implementation types forbids (D-18).
- **R1, `tabulatePorts` over a generic row builder.** Rejected: it does not type-check without a widened
  implementation type (RESEARCH Q3), which is why D-07 was superseded by D-18.
- **A reader carried on each call row.** Rejected: rows are plain data that tests build and compare.
- **Deriving the two simulation fixture tables.** Out of scope (D-19); it is two of the four lines a sixth port costs.
- **A public helper that lets a wrapper author choose any name and carry the mark without spreading.** Deferred (D-04);
  it is a new capability and a later phase can add it.

## Consequences

Both directions of the change, because a wrapper author is moved both ways (research Pitfall 6):

- **A spreading wrapper around a default now reads defaulted**, whatever it is called. This is the fix.
- **A wrapper that builds a fresh object, or delegates through `Object.create`, now reads as a real adapter**, even when
  its name starts with a default's (D-04, own-only). The old reading that a name prefix made it a default is withdrawn.
- **A spreading wrapper that replaces the method still reads defaulted**, because the fact is "built from the default's
  shape", not "answers like the default" (research Pitfall 7).
- **`decoratePorts` marks whatever its decorator returns for a defaulted slot** (D-17), so a decorator that replaces the
  default with a real implementation still reads defaulted. It carries the mark by the slot, not by what the decorator
  used; whether the result was built from `inner` is not checkable. A result that accepts the property is marked in place (so a
  `#private` field or an internal slot keeps working, and an object the host shares stays marked); one that does not
  (non-extensible, or a proxy whose define trap refuses or throws) is copied with its prototype and descriptors, and
  state outside own properties does not survive that copy, so the decorator returns an object that accepts the
  property (WR-01).
- **A duplicate install of `@qadi/core`** reads the other copy's defaults as real adapters, because each copy has its own
  symbol (D-20, accepted; T-47-19).
- **A hostile `Proxy` service whose descriptor trap throws, or a revoked one,** reads not defaulted: `isMarkedDefault`
  catches the throw, so the reader stays total and the wiring read cannot fail on a service it was handed (WR-02).
- **The mark never reaches `Object.keys`, JSON or a structural clone**, and core's evaluation never reads it, so no
  outcome, trace or record changes.
- **Not a breaking change.** `isPortDefault` is one added export, so `@qadi/core` is a minor; `@qadi/devtools` is a patch.
  The upgrade guide states both directions.
- **A sixth port costs devtools four lines**, as recorded above, and nothing in `Wiring.ts` or `ServicesPanel.tsx`.

## Related

- [ADR-QD-094](./094-a-port-is-described-once.md), the description this reads from
- [ADR-QD-109](./109-a-ports-span-is-projected-once-and-every-read-is-one-body.md), the same rule for the span
- ARCH-94, CCR-QD-438
- [BEH-QD-196](../behaviors/25-inspection.md#beh-qd-196-a-port-says-which-implementation-it-is) (the display name that stays display) and [BEH-QD-215](../behaviors/28-devtools-screens.md#beh-qd-215-a-required-port-is-never-reported-as-unwired) (the wiring report's wiring rule)
- [BEH-QD-571](../behaviors/25-inspection.md#beh-qd-571-a-ports-fail-closed-default-is-a-fact-its-service-carries-through-every-derived-wrapper), [BEH-QD-572](../behaviors/25-inspection.md#beh-qd-572-a-hand-written-wrapper-keeps-the-default-only-by-spreading-it), [BEH-QD-573](../behaviors/28-devtools-screens.md#beh-qd-573-each-ports-consequence-and-call-reading-are-stated-once), [BEH-QD-574](../behaviors/30-port-calls.md#beh-qd-574-call-rows-are-built-by-one-checked-row-builder-and-portcall-is-derived-from-the-registry), [BEH-QD-575](../behaviors/28-devtools-screens.md#beh-qd-575-a-new-port-asks-devtools-only-for-what-the-compiler-names)
- [INV-QD-339](../invariants.md#inv-qd-339-a-ports-service-is-its-default-exactly-when-it-carries-that-defaults-mark) and [INV-QD-340](../invariants.md#inv-qd-340-a-defaults-mark-names-its-port-so-a-shape-under-another-port-is-never-that-ports-default)
