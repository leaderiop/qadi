---
"@qadi/core": minor
"@qadi/audit": minor
"@qadi/http": minor
"@qadi/testing": minor
"@qadi/promise": minor
"@qadi/predicate-sql": minor
"@qadi/predicate-prisma": minor
---

**Breaking, for subpath importers only.** The `./*` subpath export is removed from `@qadi/core`, `@qadi/audit`, `@qadi/http`, `@qadi/testing`, `@qadi/promise`, `@qadi/predicate-sql` and `@qadi/predicate-prisma`. A package's entry points are now a closed list: the root, and (for `@qadi/devtools`) `./react`. A module kept out of a barrel is no longer importable, so `@qadi/core/TreeFold`, `/Compare`, `/FieldLattice`, `/FieldPath`, `/PortAccess`, `/PortDerivation`, `/ShortCircuit` and `@qadi/audit/CircuitBreaker` are gone with no replacement, and importing a barreled module by subpath (`@qadi/core/Policy`) now fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Migration: import the same names from the package root (`import { hasRole } from "@qadi/core"`); every barreled module is re-exported with `export *`, so each of its names is still there. No repository code imported a subpath. Enforced by gate 13's `ENTRY` check and gate 14's check 3b (ADR-QD-099).
