# ADR-QD-204 — Named barrels, and visibility-only files folded away

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-204                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-26                                     |
> | Status         | Accepted — amends ADR-QD-037, ADR-QD-047 and ADR-QD-099 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-26): Initial (ARCH-138, CCR-QD-483) |

---

## Context

`@qadi/core`, `@qadi/react` and `@qadi/audit` published their roots with `export * from "./X.ts"`, one line per module, so
every name a module declared was public the moment it was declared. [ADR-QD-099](./099-entry-points-are-a-closed-list.md)
says out of the barrel means not importable, and `@qadi/devtools` already states its interface the other way, per module
([ADR-QD-047](./047-a-headless-devtools-model.md)). Three things followed from the star form.

- **A module could not be part-public.** A file whose first name was public and whose second was meant to stay internal had
  no way to say so, so five files existed only to keep one or two names public while their siblings stayed out of the
  barrel: `PortSpanDecode.ts` (one function, `decodePortSpan`), `PortInterpreter.ts` (the interpreter set), `GateRegistry.ts`
  (the gate registry constructor), `SequenceIntegrity.ts` (the sequence check's public home) and `Hydration.ts` (the
  hydration entry points). They were an effect of the barrel's form, not of the design.
- **A value turned type-only was invisible.** `scripts/check-api-surface.mjs` counts the names a package exports against
  `spec/overview.md`. A class, or a const and a type of one name, re-exported with `export type` keeps its name and so its
  count, while a consumer's `new` or call stops compiling. Nothing compared kinds.
- **A packed declaration could name a source path.** When a dependent's inferred type needs a name its dependency's root does
  not export, the compiler writes `import("../../core/src/Decision.ts").Trace` into the emitted declaration. TS2883 reports
  the case only sometimes, and the declaration then resolves into whatever sits beside the installed package.

## Decision

### The barrel rule

A part-public package root **names its exports per module**: `export { … } from "./X.ts"` for the values, then
`export type { … } from "./X.ts"` for the types, at most one value group and then at most one type group per module, no
inline `type` inside a value group, modules in module-path order and names inside each group in name order (both
case-sensitive ASCII), and nothing else in the file. The barrels this covers are the five in the table of "What enforces it": `@qadi/core`,
`@qadi/react`, `@qadi/audit`, and `@qadi/devtools`' two. A barrel that re-exports modules every name of which is public
stays pure `export *` (`@qadi/http` and `@qadi/testing`), because each of their modules is wholly public, and a rule that
named every name there would be a second list with nothing to check against. The roots of `@qadi/promise` and the two
predicate packages are their implementation, not a barrel.

The three barrels were **generated, never hand-typed**, from the built declarations of the unchanged tree: each name's group
is its kind there (`value` or `both` in the value group, `type` in the type group), so a name keeps the kind it had and a
generator that finds a collision or has to replace a kind fails instead of choosing. Core names 545 names over 61 modules,
react 62 over 8, audit 72 over 16; none collided and none changed kind.

**The home rule.** A name is named at the module the base barrel reached it through, and a module's own re-export of another
module's name stays where it is (`SIGNATURE_MEANINGS` and `SignatureMeaning` stay named at `./SignatureCapturePort.ts`, which
re-exports core's). A name whose file was folded is named at the module that declares it: `decodePortSpan` at
`./PortSpanEncode.ts`, `PortInterpreter` and its row types at `./PortSpan.ts`, `makeGateRegistry` and the gate types at
`./GateWriter.ts`, `verifySequenceIntegrity` and `SequenceIntegrityError` at `./ArchiveFacts.ts`, `dehydrateDecisions` and
`hydrateDecisions` at `./HydrationEngine.ts`. No group carries a package specifier.

**The three-edit rule.** A new public name is its line in the package root (a barrel line, or the export itself where the
root is the implementation) and its row in `spec/overview.md`, which `node scripts/check-api-surface.mjs` reads. A new value
is a third edit in the four packages that have a `test/surface.test.ts` (`@qadi/audit`, `@qadi/core`, `@qadi/devtools`,
`@qadi/react`): its name in that test's value list, which catches a value turned type-only and which the first two cannot. A
new type has no line there, because a type is not a runtime key; it gets a line in a type pin only where one names the
package's types (`@qadi/devtools`' `test/surface.tst.ts`).

**Out of the barrel means not importable**, as before. A module that is part-public has its other names unimportable by the
same rule as a module no barrel names: the `exports` map is a closed list and `node scripts/check-package-install.mjs`
refuses every other module of the tarball.

### The fold verdict table

Each candidate was applied to its own scratch clone of the unchanged tree and judged by `pnpm circular` (`madge --circular
--extensions ts,tsx packages/*/src`) and `pnpm exec tsc -b tsconfig.build.json`, in a clone whose per-package links resolved
to the clone's own `@qadi/core`, so a candidate in core is what its dependents compiled against. The unedited clone is 251
files, no cycle, `tsc` exit 0. A candidate counts as acyclic only on madge's own `No circular dependency found` with `tsc`
exit 0. Each candidate's patch is kept with its SHA-256, and a candidate that cycles was never made.

| Candidate | What it folds | madge | `tsc` | Verdict | Commit |
| --------- | ------------- | ----- | ----- | ------- | ------ |
| `a` | `PortSpanDecode.ts` into `PortSpanEncode.ts` (core) | none; 250 files | exit 0 | fold | `136830bf` |
| `b` | `PortInterpreter.ts` into `PortSpan.ts` (core) | none; 250 files | exit 0 | fold | `92096e06` |
| `b-prime` | `PortInterpreter.ts` into `PortSpanEncode.ts` | 1 cycle, `PortSpan.ts` and `PortSpanEncode.ts` | exit 0 | refused | none |
| `b-double-prime` | `PortSpanDecode.ts` into `PortSpan.ts` | the same cycle | exit 0 | refused | none |
| `c` | `GateRegistry.ts` into `GateWriter.ts` (react) | none; 250 files | exit 0 | fold | `45e366ac` |
| `d` | `SequenceIntegrity.ts` into `ArchiveFacts.ts` (audit) | none; 250 files | exit 0 | fold | `8eadbc55` |
| `e` | `Hydration.ts` into `HydrationEngine.ts` as written (react) | 1 cycle, `QadiAtoms.ts` and `HydrationEngine.ts` | exit 0 | refused | none |
| `e-prime` | `HydrationTarget`, the structural parameter alone | none; 251 files | exit 0 | made | `0d8c82e8` |
| `e-prime-fold` | `HydrationTarget`, then `Hydration.ts` into `HydrationEngine.ts` | none; 250 files | exit 0 | fold | `b06f18ce` |
| `f` | `EvaluationSpan.ts` into `PortSpanEncode.ts` (core) | none; 250 files | exit 0 | not folded | none |

`b-prime` and `b-double-prime` close the same edge from the two directions: types flow from `PortSpan.ts` to
`PortSpanEncode.ts` and machinery flows back, so the interpreter set belongs with the types and the decoder with the
machinery. `e` closes because `hydrateDecisions(atoms: QadiAtoms, …)` names the atom set, which already imports the engine.

The folds landed in the order `a`, `b`, `c`, `d`, `e-prime`, `e-prime-fold`, and after each the structural commands ran at
that commit and every one agreed: madge 251 files at the unchanged tree, then 250, 249, 248, 247, 247 and 246 after the
last; `pnpm circular`, `pnpm build`, `pnpm typecheck`, `node scripts/check-house-style.mjs` and
`node scripts/check-package-install.mjs` exit 0 at each; and the built public surface equal to the baseline below.

### The Hydration decision

`hydrateDecisions` takes a **structural parameter**. `HydrationEngine.ts` declares a package-private `HydrationTarget`:

```ts
interface HydrationTarget {
  readonly hydrate: (
    dehydrated: DehydratedDecisions,
    subject: AuthSubject,
    options?: HydrateOptions,
  ) => InitialValues;
}
```

`QadiAtoms` extends it and drops its own `hydrate` member, so the signature is stated once, and `hydrateDecisions(atoms:
HydrationTarget, …)`. `Hydration.ts` loses its `QadiAtoms` import, which is what lets the file fold into the engine
(candidate `e` cycles, `e-prime` does not). The change is a widening that no call site feels: `QadiAtoms` still satisfies the
parameter, and `{ hydrate }` alone does too. No export is added or removed, because `HydrationTarget` appears only in react's
own `HydrationEngine.d.ts` and `QadiAtoms.d.ts` and in no dependent's declaration, so neither TS2883 nor the escape check
below arises.

It is held by `packages/react/test/HydrationTarget.tst.ts` (a forwarding object is accepted, `QadiAtoms` and a value holding
the written-out `hydrate` alone are assignable to the parameter, `QadiAtoms["hydrate"]` is its written-out signature, and a
value without `hydrate`, or whose `hydrate` reads another payload, is not; positive pins and `not.toBeAssignableTo` only, so
the negative-pin budget does not move), and it is probed in the packed consumer: it hydrates a payload that crossed as JSON
text into the atom set and through `{ hydrate: atoms.hydrate }` alone, and a `@ts-expect-error` refuses `hydrateDecisions({}, …)`. The probe
guard of `node scripts/check-package-install.mjs` holds the probe itself: its module hook records the shape of each
`hydrateDecisions` call's first argument, so the run must call it through the atom set and through a value holding `hydrate`
alone (`REACT_RUNTIME_PROBES`), and its parse requires a call on an object literal without `hydrate` led by the directive
(`REFUSED_CALL_PROBES`). A deleted call or refusal fails the gate with a reason naming it. That `QadiAtoms` states `hydrate` through `extends
HydrationTarget` rather than a copy of the signature is the source's shape, which no type pin can tell from an identical
redeclaration, so no check claims it.

### The `EvaluationSpan.ts` verdict: not folded

Candidate `f` is acyclic and `tsc`-clean, and `EvaluationSpan.ts` is **not folded**. It is not a visibility-only file: it
declares the evaluate family's spans and is the file `[span-key-source]` reads the span keys from, apart from the shared keys
`PortSpanEncode.ts` holds, because a merged file would spell the shared key in the declaration. In the clone of `f`,
`node scripts/check-house-style.mjs` throws `ENOENT` opening `packages/core/src/EvaluationSpan.ts` and exits 1.

### The surface baseline and close

`scripts/surface-diff.mjs` records every public entry point's exports from the built declarations through the compiler, each
as a name with its kind (`value`, `type` or `both`), and compares two records by naming every added name, removed name and
changed kind. Its `--self-test` plants each of those defects, a class and a const-and-type pair exported with `export type`,
a dropped type name and an added name, in declarations it writes outside the repository, and requires an identical pair to
pass. It is the `surface:self-test` script, the last step of `pnpm check`.

The baseline was taken on the unchanged tree: **948 names over 10 entry points** (core 545, devtools 142, `@qadi/devtools/react`
15, audit 72, http 75, react 62, testing 17, the two predicate packages 10 and 6, promise 4), of which 72 in core are of kind
`both`, beside 41 classes in core. `node scripts/check-api-surface.mjs` printed `gate13: 943` for the same tree, a figure that
counts the five names `@qadi/devtools`' two entries share once where the tool counts them once per entry, so 948 - 5 = 943.
Two figures, one set of names. The close compares the built surface with the baseline and requires them equal, the total and
every name's kind, and requires `node scripts/check-api-surface.mjs` to print the same 943.

A committed snapshot as a merge step was rejected: it would be a second definition of the public surface beside
`spec/overview.md`, and the names are `node scripts/check-api-surface.mjs`'s. What the tool adds is the kind, which a snapshot
cannot hold for it.

### The escape check

`node scripts/check-package-install.mjs` gains check 3c, a pure function over every packed `.d.ts` of every public package
(`scripts/lib/declaration-escape.mjs`). It strips comments first, because 46 built declarations carry `../../` in doc
comments, keeps `/// <reference` lines, collects each module specifier (`import("…")`, `from "…"`, a side-effect import,
`require("…")`, a reference path), and refuses a specifier holding a `/src/` segment, a relative or absolute one that
resolves outside its package root, and a bare `@qadi/<pkg>/<subpath>` that is not an entry point the installed manifests'
`exports` maps declare (read from the manifests, never listed). It runs thirteen planted texts on every run, so a check that
stops matching fails instead of passing with nothing to find, and it prints `declaration escape check: <n> packed .d.ts
file(s), none names a path outside its package, into src/ or to an undeclared entry point`. It was seen failing on its self-check and on a real `import("../../core/src/Decision.ts").Trace` in
react's built declaration. It landed before any barrel was rewritten, because a missed type is where that import appears.

## What enforces it

These run in `pnpm check`:

- `named-barrel` and `[named-barrel-self-test]`, through `node scripts/check-house-style.mjs`: one rule over the five barrels
  `packages/audit/src/index.ts`, `packages/core/src/index.ts`, `packages/devtools/src/index.ts`,
  `packages/devtools/src/react/index.ts` and `packages/react/src/index.ts`. It reads each through TypeScript's parse
  (`scripts/lib/barrel-scan.mjs`) and refuses, in a listed barrel, an `export *`, any statement that is not a module group (a
  declaration, an import, an `export { … }` with no `from`), a group whose module is outside the package's own `src/`, a
  second value or type group for one module, a type group before its value group, an inline `type` in a value group, groups
  or names out of order, and a barrel with no named group; it refuses an unlisted `index.ts` that carries a relative named
  group, and one that mixes any named group with an `export *`, so the list is its own record, checked in both directions;
  and on every run it plants one violation of each kind into a copy of each listed barrel, with an unlisted named barrel, a
  mixed index and two indexes it must leave alone, and fails if a plant is not judged as planted. The rule is the one
  `@qadi/devtools`' two barrels had under the name `devtools-named-barrel`.
- `packages/core/test/surface.test.ts`, `packages/react/test/surface.test.ts` and `packages/audit/test/surface.test.ts`: each
  holds a literal, sorted list of the runtime value names its root's `Object.keys` must equal, so a value turned type-only
  fails at once.
- `node scripts/check-api-surface.mjs`: the names of each root against `spec/overview.md`, and the `exports` map against the
  entry-points table.
- `node scripts/check-package-install.mjs`: the packed artifact installs and authorizes, every module that is not an entry
  point is refused, and check 3c refuses a declaration that escapes its package.
- `node scripts/surface-diff.mjs --self-test`, as `surface:self-test`: the surface tool refuses each defect it exists to see.
- `pnpm circular`: no fold left a cycle.

These are phase-local, run while the change was made and not part of `pnpm check`: the phase's own check judges (each barrel's shape
and every name's home and group, each fold as its commit with its structural block, the surface against the baseline, the
changesets), the fold spike and its recorded patches, and the evidence of each check seen failing.

## Consequences

- **A module can be part-public**, and five files that existed only to publish a name are gone: 251 files to 246. The count
  of exports does not move, nor does any name's kind; each of the three packages ships one patch changeset saying so.
  `@qadi/devtools` ships a fourth: the headers of its two barrels state the edits a public name needs, comment lines only,
  and its changeset says no export changes.
- **The barrel is the interface, in one reviewable file per package**, and a new public name is the edits the three-edit rule
  states, each read by a gate or a test.
- **A value turned type-only fails a test**, which `node scripts/check-api-surface.mjs` could not see.
- **A packed declaration cannot reach a source path** without `node scripts/check-package-install.mjs` failing.
- **Cycle-breaking files that remain are named**, with the reason each stays, in the amendment to
  [ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md).
- A named barrel costs a line to add a name to an already-public module. That edit is the point.

## Alternatives considered

- **One route per name: reach each public name through exactly one module and forbid a second.** Rejected: the home rule
  already gives each name one barrel line, and a second statement of that is a list to keep equal.
- **`export *` as a stepping stone**, keeping the star lines and naming only the folded names. Rejected: a star barrel line
  cannot point at a module that holds more than the absorbed file did, so it would publish the folded-in siblings.
- **A committed surface snapshot as a merge step.** Rejected above: a second definition of the surface.
- **Fallback to keeping `Hydration.ts`** and recording the cycle (a fold of `dehydrateDecisions` alone leaves a one-function
  file). Rejected as the first choice, and not needed: candidate `e-prime` removed the cycle.
- **Folding `EvaluationSpan.ts`.** Rejected: see the verdict above.
- **A compiler-based kind check inside the house rule.** Rejected: it is a second mechanism for what each `surface.test.ts`
  holds, and it would need a TypeScript server inside `pnpm lint`.

---

_Related: [ADR-QD-033](./033-the-packed-artifact-is-the-product.md) · [ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md) · [ADR-QD-047](./047-a-headless-devtools-model.md) · [ADR-QD-099](./099-entry-points-are-a-closed-list.md)_
