# Requirement Identifier Scheme

> **Document Control**
>
> | Property       | Value                                        |
> | -------------- | -------------------------------------------- |
> | Document ID    | QADI-PROC-01                                 |
> | Revision       | 1.1                                          |
> | Effective Date | 2026-07-25                                   |
> | Status         | Effective                                    |
> | Author         | Qadi Engineering                             |
> | Classification | Process Specification                        |
> | Change History | 1.1 (2026-07-26): Infix EG → QD; MOD-QD series registered (CCR-QD-004, CCR-QD-005)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## 1. Package Infix

All identifiers in this specification use the infix **`QD`** (Qadi).

The infix exists to keep these identifiers distinct from the predecessor
library's `GD` identifiers. The two specifications describe different APIs and
are frequently open side by side; reusing `GD` would make cross-references
ambiguous.

The infix previously read `EG`, for "Effect Qadi", when the library was called
Qadi and published under a placeholder scope. It was renamed with the package
in CCR-QD-005. Identifiers are permanent in their *number*, not their spelling:
`BEH-EG-001` and `BEH-QD-001` denote the same requirement, and no number was
reused or withdrawn in the change.

## 2. Identifier Registry

| Prefix | Meaning | Defined in | Range |
| ------ | ------- | ---------- | ----- |
| `BEH-QD-NNN` | Functional behavior requirement | `behaviors/NN-*.md` headings | 001– |
| `URS-QD-NNN` | User requirement | `urs.md` | 001– |
| `INV-QD-NNN` | Runtime invariant | `invariants.md` | 001– |
| `ADR-QD-NNN` | Architecture decision | `decisions/NNN-*.md` | 001– |
| `REQ-QD-NNN` | BDD-testable acceptance requirement | `features/**/*.feature` tags | 001– |
| `MOD-QD-NNN` | Access control model adoption record | `models/NN-*.md` | 000– |
| `DoD N` | Definition-of-Done group | `process/definitions-of-done.md` | 1– |
| `CCR-QD-NNN` | Change Control Record | `README.md` Document History | 001– |
| `QADI-*` | Document ID | Document Control headers | — |

`MOD-QD-NNN` is the one series that asserts no verified behaviour. It records
which access control models Qadi can express and what the unexpressed ones
would cost, so that intent has somewhere to live that is not the behaviour
specification. A model becomes normative by acquiring `BEH`, `INV` and `REQ`
identifiers in the ordinary way — never by being described in `models/`.

## 3. Allocation Rules

```
REQUIREMENT: Identifiers are permanent. A withdrawn requirement retains its
             identifier and is marked "Withdrawn"; the number is never reused.
             Reuse would silently repoint every existing cross-reference and
             invalidate the traceability matrix.
```

```
REQUIREMENT: Identifiers are allocated contiguously within their series. Gaps
             are permitted only where an identifier has been withdrawn, and
             the withdrawal must be recorded.
```

```
RECOMMENDED: Allocate BEH-QD identifiers in blocks of eight per behavior file,
             so that later sub-requirements can be inserted without renumbering
             a neighbouring file.
```

## 4. Cross-Reference Obligations

Every identifier must participate in the traceability chain. The following are
checked mechanically by `spec/scripts/verify-traceability.sh`:

1. Every `INV-QD-NNN` defined in `invariants.md` has a row in `traceability.md` §4.
2. Every `decisions/NNN-*.md` file maps to an `ADR-QD-NNN` present in `traceability.md` §5.
3. Every behavior file listed in `traceability.md` §2 exists on disk.
4. Every `.md` file referenced by a relative link resolves.
5. Every directory's `index.yaml` matches the files actually present.
6. Every `REQ-QD-NNN` tag used in a `.feature` file is defined in `traceability.md` §6.

## 5. Reference Syntax

Cross-references are relative markdown links whose text is the identifier:

```markdown
[INV-QD-001](../invariants.md#inv-qd-001-policy-immutability)
[ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)
```

Each `## BEH-QD-NNN` heading carries a reference blockquote directly beneath it:

```markdown
## BEH-QD-001: Permission Tokens

> **Invariant:** [INV-QD-002](../invariants.md#inv-qd-002-permission-key-uniqueness)
> **See:** [ADR-QD-007](../decisions/007-permission-token-representation.md)
> **DoD:** [DoD 1](../process/definitions-of-done.md#dod-1-permission-tokens)
```

Each invariant carries a `**Related**:` line pointing back at the behaviors and
ADRs that motivate it. The graph is therefore navigable in both directions.

## 6. Directory Registries

Every specification subdirectory contains an `index.yaml`:

```yaml
kind: behaviors
package: qadi
infix: QD
entries:
  - id: "BEH-QD-001"
    file: "01-permissions.md"
    title: "Permission Tokens"
```

The registry is the authoritative list. A file present on disk but absent from
`index.yaml` — or the reverse — is a verification failure. This is the
mechanism the predecessor specification lacked, which allowed orphaned
documents to accumulate.

---

_Next: [Definitions of Done](./definitions-of-done.md)_
