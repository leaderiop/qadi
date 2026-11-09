# ADR-QD-116 — The JSON refusal vocabulary is a leaf of its own

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-116                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-09                                     |
> | Status         | Accepted — amends ADR-QD-095, ADR-QD-102; reads ADR-QD-037, ADR-QD-107 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-09): Initial (ARCH-54, CCR-QD-393) |

---

## Context

ARCH-27 (ADR-QD-102 D-27-b) put the record wire's whole vocabulary in one leaf,
`SinkWire.ts`: the record tags and versions, the decode refusal, and the encode refusal with
its three readings. At the time `SinkCodec.ts` was the only walk that refused JSON, so
the encode refusal was the record wire's own word.

ARCH-31 (ADR-QD-107) then extracted the JSON hazard walk into `JsonHazard.ts`, so a port
question refuses exactly what a record refuses. The walk, `PortWireEncode.ts`,
`AttributeResolver.ts` and `CustomPredicate.ts` took their refusal words from the sink
wire. The port wire therefore depended on the record wire's module for words about JSON,
not about records, and a change to the record wire's vocabulary (a new `WireVersion`, a
new `DecodeRefusal` reading) shared a module with words the port side reads.

## Decision

| Decision | Choice |
| -------- | ------ |
| The leaf | **`packages/core/src/JsonRefusal.ts`**, a leaf importing only `effect`. It declares `WirePath`, `OpaqueKind`, `UnrepresentableKind`, `EncodeRefusal` with its constructors, and the three readings: `encodeRefusalPath`, `encodeRefusalAnnotations` (with its annotations type) and `describeEncodeRefusal`. The code moved byte-identical; the three readings' wording is unchanged |
| What stays | **`SinkWire.ts`** keeps `SinkRecordTag`, `WireVersion`, `WIRE_VERSIONS` and `DecodeRefusal`: the record wire's own words |
| Exports | **The barrel exports both leaves**, so every moved name stays importable from `@qadi/core`'s root. No export, record or sentence changes |
| Re-export | **`SinkWire.ts` does not re-export the moved names.** Its own path is not public (ADR-QD-099), so a re-export would only be a second module naming one concept |
| The annotation rule | **`no-refusal-annotation-outside-core` exempts `JsonRefusal.ts`**, where the annotation keys now live |
| Importers | Only `Errors.ts`, `SinkCodec.ts` and the barrel import `SinkWire.ts`. `JsonHazard.ts`, `PortWireEncode.ts`, `AttributeResolver.ts` and `CustomPredicate.ts` import `JsonRefusal.ts`; `Errors.ts` and `SinkCodec.ts` import it too, for the encode names |

`UnrepresentableKind`, `encodeRefusalPath` and the annotations type and function moved
beyond the four names the ticket listed, because `EncodeRefusal` names `UnrepresentableKind`
and the readings take an `EncodeRefusal`: leaving any of them behind would make the leaf
import the module it was cut from.

## Consequences

- No runtime behaviour changes, so no mutation score moves: the code moved byte-identical,
  and the per-variant sentence table (`EncodeRefusalReport.test.ts`) changed only its import line.
- `pnpm circular` stays clean (ADR-QD-037): the leaf imports only `effect`.
- A future wire that refuses JSON reads the leaf, not a codec's module. A record-wire change
  touches `SinkWire.ts` and nothing the port side imports.
- INV-QD-104's Source names `JsonRefusal.ts`, where its readings live.

## Alternatives considered

- **Fold the vocabulary into `JsonHazard.ts`.** Rejected: `JsonHazard.ts` is package-private
  and out of the barrel, and the moved names are public. Exporting them from there would
  need a named export in core's pure `export *` barrel (dropping the barrel-order check) or
  would put `wireHazard` and `toJson` on the public surface.
- **Keep the vocabulary in `SinkWire.ts`.** This is the dependency the ADR removes.
- **Re-export from `SinkWire.ts`.** Two modules naming one concept, in a module whose path is
  not public.
- **A house-style rule against importing `SinkWire.ts` from the port side.** Rejected: the
  drift happened once, below AGENTS.md §15's "two occurrences" bar, and with the leaf in
  place `SinkWire.ts` holds nothing a port module needs.

## Related

[ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md),
[ADR-QD-095](./095-sinkcodec-owns-both-directions.md),
[ADR-QD-096](./096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md),
[ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-102](./102-the-error-tables-stay-tables.md),
[ADR-QD-107](./107-a-port-is-answered-remotely-through-its-description.md),
[INV-QD-104](../invariants.md#inv-qd-104-a-refusal-report-says-where-never-what).
