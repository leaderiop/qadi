# ADR-QD-151 — The sink wire version is stated once

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-151                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-14                                     |
> | Status         | Accepted — amends ADR-QD-096                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-14): Initial (ARCH-85, CCR-QD-429) |

---

## Context

[ADR-QD-096](./096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md) versioned the record
wire, and its 2026-10-06 amendment kept `WireVersion` (`2`) and `WIRE_VERSIONS` (`[2]`) so that a
version 3 would be "a full-union edit" to them. The number was written seven times in the code of
`packages/core/src/Sink*.ts`: the type, the read set, the codec's private constant, two
`Schema.Literal(2)`, and two `2 as const` in the encoder. The type reached three of them.

Retyping `WireVersion` to `3` on the phase base asked for two more edits and then compiled with
the encoder still writing version 2, bytes its own decoder then refused; the byte goldens stayed
green. Mutation could not see it either: `ignoreStatic` skips module-scope constants
([ADR-QD-076](./076-mutation-runs-skip-static-mutants.md)).

## Decision

**The version is written once, in `SinkWire.ts`, and everything else derives from it.** (ARCH-85,
CCR-QD-429.)

1. **`WIRE_VERSION` is the version `encodeSinkRecord` writes.** `SinkWire.ts` exports
   `WIRE_VERSION = 2 as const`, the one place the number is written in that code.
2. **`WIRE_VERSIONS` is the read set, a separate idea from the write version.**
   `WIRE_VERSIONS = [WIRE_VERSION] as const`, typed `readonly [2]`, lists the versions
   `decodeSinkRecord` reads. A reader that keeps an older version lists it there beside a schema
   for it, while `WIRE_VERSION` moves alone.
3. **`WireVersion = (typeof WIRE_VERSIONS)[number]`** stays as `UnsupportedVersion.supported`'s
   element type.
4. **`SinkCodec.ts` reads them.** `Schema.Literal(WIRE_VERSION)` in both field structs,
   `version: WIRE_VERSION` in the encoder, and a read check that is membership in
   `WIRE_VERSIONS` through a `Schema.is(Schema.Literals(WIRE_VERSIONS))` guard, never a comparison
   with `WIRE_VERSION`.
5. **The constant is in the leaf and exported.** `DecodeRefusal.supported` is declared there and
   the leaf cannot import `SinkCodec.ts` ([ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md));
   the barrel exports the leaf whole, and a reader of the wire can name what it reads.
6. **The guards.** `packages/core/test/SinkWire.tst.ts` pins the three types and each
   `SinkRecordJson` member's `version` by hand; the byte goldens hard-code `"version":2`; the
   refusal rows hard-code `supported: [2]`. A retype of the constant alone compiles in source and
   fails all three.

## Alternatives considered

- **Keep the closed type and rely on review.** The base retype compiled half-edited.
- **A constant private to `SinkCodec.ts`.** The leaf cannot import it, so `WIRE_VERSIONS` would
  restate the number.
- **`WIRE_VERSION` derived from `WIRE_VERSIONS[0]`.** It puts a list's order in charge of the
  bytes and conflates reading with writing.
- **`WIRE_VERSIONS.some((v) => v === version)`.** Stryker's `.some` to `.every` mutant cannot be
  told apart over a one-element set, so it would survive.
- **`WIRE_VERSIONS.includes(version)`.** It does not compile: `version` is `unknown`.
- **A mutation test.** [ADR-QD-076](./076-mutation-runs-skip-static-mutants.md) never mutates
  module-scope constants.

## Consequences

- `@qadi/core` gains the public export `WIRE_VERSION`, so the change is a minor changeset.
- `WIRE_VERSIONS`'s type narrows from `ReadonlyArray<2>` to `readonly [2]`. That is
  source-compatible for every read it answered: iterating it, `includes`, passing it where a
  `ReadonlyArray<WireVersion>` is expected. An index past its one element, always `undefined` at
  run time, is now a compile error.
- The bytes are unchanged.
- [ADR-QD-096](./096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)'s "full-union edit"
  now reads as an edit to the one constant, plus the read set and a schema when an older version
  stays readable.
- [INV-QD-096](../invariants.md#inv-qd-096-whatever-the-record-codec-emits-it-accepts) is amended
  in place; no invariant or behaviour is added.
- Hydration's payload version (`PAYLOAD_VERSION`, `@qadi/react`) and audit's archive version
  (`ARCHIVE_VERSION`, `@qadi/audit`) are separate wires and untouched.
- Doc prose saying "version 2" stays.

## Related

[ADR-QD-096](./096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md),
[ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md),
[ADR-QD-076](./076-mutation-runs-skip-static-mutants.md),
[ADR-QD-095](./095-sinkcodec-owns-both-directions.md),
[ADR-QD-116](./116-the-json-refusal-vocabulary-is-a-leaf-of-its-own.md),
[INV-QD-096](../invariants.md#inv-qd-096-whatever-the-record-codec-emits-it-accepts),
[INV-QD-098](../invariants.md#inv-qd-098-a-decoded-decision-record-has-exactly-the-outcome-its-sender-sent),
[BEH-QD-199](../behaviors/25-inspection.md).
