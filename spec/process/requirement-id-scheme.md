# Requirement Identifier Scheme

> **Document Control**
>
> | Property       | Value                                        |
> | -------------- | -------------------------------------------- |
> | Document ID    | GUARD-PROC-01                                |
> | Revision       | 1.0                                          |
> | Effective Date | 2026-07-25                                   |
> | Status         | Effective                                    |
> | Author         | Guard Engineering                            |
> | Classification | Process Specification                        |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-001) |

---

## 1. Package Infix

All identifiers in this specification use the infix **`EG`** (Effect Guard).

The infix exists to keep these identifiers distinct from the predecessor
library's `GD` identifiers. The two specifications describe different APIs and
are frequently open side by side; reusing `GD` would make cross-references
ambiguous.

## 2. Identifier Registry

| Prefix | Meaning | Defined in | Range |
| ------ | ------- | ---------- | ----- |
| `BEH-EG-NNN` | Functional behavior requirement | `behaviors/NN-*.md` headings | 001– |
| `URS-EG-NNN` | User requirement | `urs.md` | 001– |
| `INV-EG-NNN` | Runtime invariant | `invariants.md` | 001– |
| `ADR-EG-NNN` | Architecture decision | `decisions/NNN-*.md` | 001– |
| `REQ-EG-NNN` | BDD-testable acceptance requirement | `features/**/*.feature` tags | 001– |
| `DoD N` | Definition-of-Done group | `process/definitions-of-done.md` | 1– |
| `CCR-EG-NNN` | Change Control Record | `README.md` Document History | 001– |
| `GUARD-*` | Document ID | Document Control headers | — |

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
RECOMMENDED: Allocate BEH-EG identifiers in blocks of eight per behavior file,
             so that later sub-requirements can be inserted without renumbering
             a neighbouring file.
```

## 4. Cross-Reference Obligations

Every identifier must participate in the traceability chain. The following are
checked mechanically by `spec/scripts/verify-traceability.sh`:

1. Every `INV-EG-NNN` defined in `invariants.md` has a row in `traceability.md` §4.
2. Every `decisions/NNN-*.md` file maps to an `ADR-EG-NNN` present in `traceability.md` §5.
3. Every behavior file listed in `traceability.md` §2 exists on disk.
4. Every `.md` file referenced by a relative link resolves.
5. Every directory's `index.yaml` matches the files actually present.
6. Every `REQ-EG-NNN` tag used in a `.feature` file is defined in `traceability.md` §6.

## 5. Reference Syntax

Cross-references are relative markdown links whose text is the identifier:

```markdown
[INV-EG-001](../invariants.md#inv-eg-001-policy-immutability)
[ADR-EG-002](../decisions/002-schema-derived-policy-adt.md)
```

Each `## BEH-EG-NNN` heading carries a reference blockquote directly beneath it:

```markdown
## BEH-EG-001: Permission Tokens

> **Invariant:** [INV-EG-002](../invariants.md#inv-eg-002-permission-key-uniqueness)
> **See:** [ADR-EG-007](../decisions/007-permission-token-representation.md)
> **DoD:** [DoD 1](../process/definitions-of-done.md#dod-1-permission-tokens)
```

Each invariant carries a `**Related**:` line pointing back at the behaviors and
ADRs that motivate it. The graph is therefore navigable in both directions.

## 6. Directory Registries

Every specification subdirectory contains an `index.yaml`:

```yaml
kind: behaviors
package: guard
infix: EG
entries:
  - id: "BEH-EG-001"
    file: "01-permissions.md"
    title: "Permission Tokens"
```

The registry is the authoritative list. A file present on disk but absent from
`index.yaml` — or the reverse — is a verification failure. This is the
mechanism the predecessor specification lacked, which allowed orphaned
documents to accumulate.

---

_Next: [Definitions of Done](./definitions-of-done.md)_
