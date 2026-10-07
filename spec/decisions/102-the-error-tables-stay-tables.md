# ADR-QD-102 — The error tables stay tables; the checks that were silent are made loud

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-102                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Accepted — amends ADR-QD-095; reads ADR-QD-008, ADR-QD-081 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-07): Initial (CCR-QD-194)         |

---

## Context

ARCH-27 asked whether one descriptor per error tag, from which the `EvaluationError` union,
the code table, the class table, the tag tuples, the metric words and `EvaluationErrorSchema`
would be derived, should replace the tag-keyed tables. It was measured, not argued, by adding
a tenth `EvaluationError` to a scratch copy of the tree.

- **Every table is compile-forced.** `ERROR_CODES`, `ENFORCEMENT_ERROR_CLASSES`,
  `ENFORCEMENT_ERROR_TAGS`, `EVALUATION_ERROR_TAGS_BY_TAG` (the metric words) and
  `ENFORCEMENT_ERROR_WIRE` each failed to compile until the new tag had a row, and
  `EvaluationErrorSchema` failed at its consumer. Seven `src` edits and five test fixtures,
  each listed by the compiler. Nothing drifts silently among the tables.
- **A tag is added rarely, and always inside a larger change.** Five of the nine
  `EvaluationError` tags arrived after the first commit; each came with a new port or
  dimension, which under ADR-QD-094 is also a port description, a `PortName` member and
  registry lines. None was added in the six weeks before the measurement.
- **A descriptor reaches two edits, not one.** The HTTP row (status, `httpApiStatus` schema,
  redaction) stays in `@qadi/http` (ADR-QD-072, ADR-QD-081), so the floor is a core row and an
  http row against seven today. It would split `ERROR_CODES` across rows, weakening
  ADR-QD-008's single code table and INV-QD-010, turn "property X is missing in ERROR_CODES"
  into a mismatch on a derived union, introduce a derived-type pattern next to AGENTS.md
  §7's hand-written default, and need an ADR-QD-081 amendment.
- **The drift that was silent sat outside any descriptor's reach.** The house-style gate's
  port-error pattern named five classes by hand, so a port added with a sixth error would have
  left `PORT_DOUBLE_BUDGET` silently not covering it; AGENTS.md §4's table of
  `Schema.TaggedError` classes was checked by count only; about twenty comments carried a tag
  count, two already stale.

## Decision

| Decision | Choice |
| -------- | ------ |
| D-27-a — the per-tag descriptor | **Dropped.** The tables stay as they are; no descriptor is built. The measurement above is the record. Reopen it only if adding a tag becomes a regular event that does not arrive with a port |
| D-27-b — where SinkCodec's wire vocabulary lives | **A leaf, vocabulary only.** `packages/core/src/SinkWire.ts` declares `SinkRecordTag`, `WirePath`, `OpaqueKind`, `UnrepresentableKind`, `EncodeRefusal` with its three readings, `WireVersion`, `WIRE_VERSIONS` and `DecodeRefusal`; it imports only `effect`. The two error classes stay in `Errors.ts`. The barrel exports every name, so nothing is renamed. `SinkWire.ts` is package-private beyond the barrel |
| D-27-c — the port-error class list in the gate | **Read, not restated.** `scripts/check-house-style.mjs` reads the class names from `ENFORCEMENT_ERROR_CLASSES`'s `"outage"` rows, fails loudly (`[port-error-list]`) if it finds none, and `Ports.tst.ts` pins "a port's error tag" equal to the outage tags in both directions |
| D-27-d — prose counts | **Removed.** A comment names the set (`EnforcementError` tags, `ENFORCEMENT_ERROR_WIRE`'s keys) rather than its size. ADR titles keep theirs, as history. AGENTS.md §4's table is now checked by name (`[schema-error-table]`), not only by count |

The `PolicyDecodeTooDeep` comment is corrected: it is imported type-only because only its type
is needed in `Errors.ts`; a value import would not be circular, since `Policy.ts` does not
reach `Errors.ts` (checked with `madge --json`, and with a value import that left `pnpm circular`
clean).

## Consequences

- Adding an error tag stays seven compiler-listed edits, plus the AGENTS.md row and overview
  mention the gates force. Adding a port whose error is not an outage, or an outage that is
  not a port error, fails `pnpm test:tstyche`.
- `Errors.ts` is the taxonomy again; the codec's vocabulary is beside the codec.
  `no-refusal-annotation-outside-core` exempts `SinkWire.ts`, where the readings now live.
- No runtime behaviour changes, so no mutation score moves.

## Alternatives considered

- **A core-only descriptor** (`EVALUATION_ERROR_ROWS`, a non-empty tuple) or **a descriptor over
  all `QadiError` tags.** Feasible (union, codec union and `Arr.map`-derived tag tuple all
  compiled), but seven edits become two for a change that is rare and rides on a bigger one,
  at the cost above. `Effect.catchTag(Record.keys(ROWS), …)` does not compile; the rows would
  have to be a non-empty tuple.
- **Leave the vocabulary in `Errors.ts`.** Correct, but ARCH-25 had just added three readings
  there and the file was becoming two modules.
- **The classes in the leaf too.** Puts a second `QadiError` member outside `Errors.ts`.
- **A shared `scripts/lib` class list checked against `PORTS` by a core test.** No test imports
  from `scripts/` today; more machinery than a parse plus a type pin.
