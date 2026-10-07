# ADR-QD-099 — A package's entry points are a closed list

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-099                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Accepted — amends ADR-QD-033, ADR-QD-090, ADR-QD-091 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-07): Initial (CCR-QD-188)         |

---

## Context

Seven public packages (`core`, `audit`, `http`, `testing`, `promise`, `predicate-sql`,
`predicate-prisma`) exported `./*`, mapping every module under `src/` to a subpath
(`@qadi/core/Policy`). `@qadi/devtools` exported `.` and an explicit `./react`; `@qadi/react`
exported `.` only. No ADR ever chose the wildcard: it came in with the workspace scaffold and
later packages copied it.

It made the modules a barrel deliberately omits (AGENTS.md §9) importable: seven in core
(`Compare`, `FieldLattice`, `FieldPath`, `PortAccess`, `PortDerivation`, `ShortCircuit`,
`TreeFold`) and one in audit (`CircuitBreaker`). The repository then said two opposite things
about them. CHANGELOGs, ADR-QD-090 and a re-export comment in `Decision.ts` treated a subpath as
semver surface ("**Breaking, for `@qadi/audit/CircuitBreaker` subpath imports only**"). The
overview ("the interface stays free to change while only core consumes it"), ADR-QD-056 ("fully
internal") and AGENTS.md §3 ("internal") treated them as private. Nothing decided which.

Nothing in the repository imported a subpath: AGENTS.md §1 already forbids it across packages,
and `tsconfig.json`'s `paths` maps only the roots. Neither gate 13 (`check-api-surface.mjs`) nor
gate 14 (`check-package-install.mjs`) ever imported a wildcard subpath or asserted that a
non-entry module is refused.

## Decision

**A package's `exports` map is a closed list.** It is the root `.` and the named subpaths
`spec/overview.md`'s "Entry points" table lists, each with a reason. There is no wildcard. Today
the only non-root entry point is `@qadi/devtools/react`.

"Out of the barrel" therefore means **not importable**. A module kept out of a barrel is
package-private, and its interface may change without a semver note. A module that another
package needs is exported from the barrel (naming it in the overview), not reached by a subpath.

Two gates enforce it, from both ends:

- **Gate 13**, `scripts/check-api-surface.mjs`, fails when a manifest declares a key containing
  `*`, or a non-root key missing from the "Entry points" table, or a table row no manifest
  declares (`ENTRY`).
- **Gate 14**, `scripts/check-package-install.mjs`, check 3b: in the sandbox every declared
  subpath imports, and every other `lib/` module the tarball ships is refused with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`. The packed artifact is the product (ADR-QD-033).

## Consequences

- **Breaking, for external subpath importers only** (0.x minor, one changeset for the fixed
  group). Importers of a barreled module move to the package root (`@qadi/core/Policy` becomes
  `@qadi/core`; every barreled module is re-exported with `export *`, so each of its names stays
  importable). The eight unbarreled modules have no replacement. None were known (nothing in the
  repository imported one).
- ADR-QD-090's "reachable only as the `@qadi/core/TreeFold` subpath" and ADR-QD-091's "reachable
  as `@qadi/core/Compare`" become "not reachable from outside `@qadi/core`". The devtools
  `TreeFold` twin (ADR-QD-090) now holds for a stronger reason.
- The eight "Not listed above" rows for those modules are gone: their names are no longer
  exports, so `scripts/check-api-surface.mjs` (gate 13) would fail them as `STALE`.
- Internal modules (`ShortCircuit`, `TreeFold`, `PortAccess`, `PortDerivation`, `Compare`,
  `FieldLattice`, `FieldPath`, `CircuitBreaker`) can be reshaped without a CHANGELOG
  "Breaking" note, which later work on the evaluator's short-circuit stepper and the tree fold
  relies on. A module a sibling package then needs must be exported from the barrel.
- A Bun consumer, whose `bun` condition pointed `./*` at `src/*.ts`, loses the same paths and
  takes the same migration.

## Alternatives considered

- **An explicit allowlist of named subpaths (B).** With no reason found for any subpath, it is
  this decision plus a list that starts empty. The "Entry points" table is that list, and the
  way to add one.
- **Keep `./*` and declare subpaths "reachable, not semver surface" (C).** Makes the ambiguity
  the policy, stops CHANGELOGs calling a subpath change breaking, and leaves every internal
  module's signature visible to consumers' type checkers.
- **Keep `./*` and map each unbarreled module to `null` (D).** A deny list drifts: a new internal
  module is public until someone remembers to add it.

## Related

[ADR-QD-033](./033-the-packed-artifact-is-the-product.md), [ADR-QD-090](./090-a-tree-is-folded-through-one-seam.md),
[ADR-QD-091](./091-comparison-semantics-have-one-owner.md), AGENTS.md §9.
