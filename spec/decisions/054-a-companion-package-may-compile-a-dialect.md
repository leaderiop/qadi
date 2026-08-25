# ADR-QD-054 — A companion package may compile a dialect

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-054                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-25                                     |
> | Status         | Accepted — narrows ADR-QD-024                  |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-25): Initial release (CCR-QD-079) |

---

## Context

[ADR-QD-024](./024-predicate-output.md) decided that `Predicate` is dialect-free
and that "the caller compiles the predicate." Its argument, quoted exactly:

> Emitting SQL means owning a dialect: quoting, binding, null semantics, one
> grammar per engine. Qadi has no database dependency and acquiring one is a far
> larger commitment than this feature warrants. The caller compiles the
> predicate.

That argument is about `@qadi/core` acquiring a live database dependency and
the *project* becoming correctness authority for arbitrary consumer schemas
across every engine. It is a real cost, and this ADR does not dispute it —
`@qadi/core` still has no database dependency of any kind after this decision,
and still never will under it.

What the argument does not settle is whether a **separate, optional,
independently-versioned package** — one nobody installs unless they want it,
and one `@qadi/core` never depends on — carries the same cost. It does not,
for reasons this ADR states precisely rather than by exemption, and every
comparison being drawn against a repo where CASL ships exactly this split
(`@casl/mongoose`, `@casl/prisma`) as direct evidence the boundary holds in a
comparable library. This is worth stating as a formal decision rather than a
silent drift, per [ADR-QD-017](./017-stale-decisions-are-not-decisions.md): a
changed decision is one this repository records, not one it quietly stops
following.

**One correction, made explicit because it shaped this ADR's scope.** An
earlier draft of this work described ADR-QD-024's dialect stance as having
been called "permanent." Checked directly against both that ADR (line 234)
and [35 — Row-Level Security](../models/35-row-level.md) (line 244): in both
documents, the word "permanent" attaches to non-goal **4, Trace** — "a real
and permanent loss" — never to non-goal **3, Dialect**. The dialect stance is
stated firmly but never literally labeled permanent. This ADR narrows exactly
the Dialect clause; Trace is untouched, and nothing here disputes that a
predicate compiled by a companion package still explains nothing about why a
given row was excluded — that limitation is unaffected by who compiles the
predicate.

## Decision

### A companion package may compile `Predicate` into a real query; `@qadi/core` still may not, and does not

`Predicate` itself is unchanged — still the same seven-tag AST
[ADR-QD-024](./024-predicate-output.md) shipped, still hand-written with no
`Schema` for the reason stated there. `@qadi/core` gains zero new
dependencies. What changes is that a second, optional package may now target
one dialect and ship it, rather than every caller hand-rolling their own
translator with nothing but `evaluatePredicate` to check it against.

### Why this is a smaller commitment than what ADR-QD-024 declined

ADR-QD-024's cost was `@qadi/core` acquiring a live database dependency, and
the project becoming correctness authority for arbitrary consumer schemas —
tables it has never seen, indexes it cannot know about, constraints it cannot
enforce. A compile-only package never opens a connection, never sees a
schema, and never claims a table exists. Its correctness surface is closed
and finite: seven `Predicate` tags, four comparison operators, rendered
through one recursive walk. That surface is checkable by the same kind of
differential property [INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)
already uses to prove `toPredicate` agrees with `evaluate` — one interpreter
deeper, same method. `@casl/mongoose` and `@casl/prisma` are direct evidence
this exact boundary — compile-only, schema-blind, separately packaged — holds
in a library facing the same trade-off.

### Refuse rather than approximate, one layer down

A `Predicate`'s `Compare`/`MemberOf` `value`/`values` are `unknown`. A
compiler that stringifies an unsafe value into a query fragment rather than
refusing is `ADR-QD-024`'s rejected failure mode wearing a different hat —
"nothing is approximated" does not stop meaning that one layer further from
the AST. Each companion package declares its own unprefixed
`PredicateNotRenderable` error, matching `PolicyNotTranslatable`'s shape —
not shared via `@qadi/core`, because `@qadi/core` has no reason to know this
error exists.

```
REQUIREMENT: A companion package MUST refuse to render a `Compare`/`MemberOf`
             value it cannot safely bind as a query parameter, rather than
             stringify it into the fragment. It MUST NOT approximate.
```

### Alternatives rejected

- **Never ship one.** Rejected per direct instruction — this ADR exists
  because the gap between "an AST" and "something a caller can run today" was
  judged worth closing, not left as a permanent invitation to hand-roll.
- **Fold compilation into `@qadi/core` behind an optional peer dependency.**
  Rejected: `@qadi/core` would still need to *know about* `pg`, `mysql2`, or
  `@prisma/client` well enough to type against them, which is the dependency
  ADR-QD-024 declined in a thinner disguise.
- **One multi-target package instead of two.** Rejected on the CASL
  precedent directly — `@casl/mongoose` and `@casl/prisma` are two packages,
  not one with a mode flag, because a Prisma consumer has no reason to pull
  in SQL-dialect code and vice versa.

## Consequences

**Positive**:

- Row-level security moves from "here is an AST, good luck" to "here is a
  package that compiles it, and here is the property that proves it agrees
  with the evaluator" — closing the largest gap in Qadi's row-level story
  without touching the boundary ADR-QD-024 actually drew.
- The differential-testing method this repository already trusts
  (`INV-QD-018`) extends to a second interpreter pair with no new kind of
  evidence invented for it.
- `@qadi/core`'s dependency graph is unchanged. A consumer who never installs
  either companion package pays nothing for this decision.

**Negative**:

- Two more packages to version, test and keep in agreement with
  `evaluatePredicate` as `Predicate` itself evolves — the same maintenance
  shape `@qadi/promise` and `@qadi/http` already carry, not a new one.
- The Trace non-goal is unaffected and remains a real loss: a compiled
  fragment that excludes a row still explains nothing about *why*, because
  the explanation lives in a query planner none of this ever sees.

**Trade-off accepted**: `@qadi/predicate-sql` ships three dialects
(PostgreSQL, MySQL, SQLite) at v1 rather than one. The house preference is to
build every mode a design is layered for rather than default to a minimal
slice unless the fuller version is actually wrong, and it is not wrong here:
dialect differences are a small per-dialect syntax table (quoting,
placeholder style, `IN` grammar) around one shared renderer, not three
separate implementations — the completeness costs a data table, not a second
architecture.

**Implemented**, with the evidence the
[Definitions of Done](../process/definitions-of-done.md) require:
[31 — Predicate Compilation](../behaviors/31-predicate-compilation.md),
[INV-QD-047](../invariants.md#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits),
[INV-QD-048](../invariants.md#inv-qd-048-a-compiled-prisma-where-input-admits-exactly-the-rows-the-predicate-admits).
