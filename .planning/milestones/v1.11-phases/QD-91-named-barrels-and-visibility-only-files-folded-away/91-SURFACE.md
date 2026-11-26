# Phase 91: the public surface at the phase base

Taken on the unchanged tree: `packages` is identical between `phase_base` and the head below, `pnpm build` was a no-op, and the snapshot is `91-surface-base.json` (taken with `node scripts/surface-diff.mjs snapshot 91-surface-base.json --phase-base <phase_base>`).

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
head: e0c321d163fb1e19cc367b1d16082eafed9c87c5

## Gate 13

gate13: 943

`node scripts/check-api-surface.mjs` printed `api-surface: 943 export(s) documented across 9 package(s)`. The close of the phase compares the same figure.

## The tool's own total

tool total: 948 over 10 entries

Gate 13 counts the 5 names `@qadi/devtools`' root and its `/react` entry share (`AskedQuestionLike`, `DiagnosticsOptions`, `DiagnosticsSnapshot`, `DiagnosticsStatus`, `TimelineStatus`) once, and the tool counts them once per entry: 948 - 5 = 943. They are two figures for one set of names, and `node scripts/surface-diff.mjs compare` is what the close reads for the tool's.

## Per entry

One line per entry point, `<entry>: <count> names, <both> of kind both`. A name of kind `both` is a class, an enum, or a const and a type of one name: the names a consumer can use as a value and as a type, and the ones an `export type` turns into a type only.

- @qadi/audit: 72 names, 22 of kind both
- @qadi/core: 545 names, 72 of kind both
- @qadi/devtools: 142 names, 10 of kind both
- @qadi/devtools/react: 15 names, 2 of kind both
- @qadi/http: 75 names, 9 of kind both
- @qadi/predicate-prisma: 10 names, 1 of kind both
- @qadi/predicate-sql: 6 names, 1 of kind both
- @qadi/promise: 4 names, 0 of kind both
- @qadi/react: 62 names, 4 of kind both
- @qadi/testing: 17 names, 0 of kind both

Gate 13's per-package counts follow from these: the `@qadi/devtools` figure is 142 + 15 - 5 = 152.

The `both` counts are the tool's reading of the built declarations, class included, and are what the later plans compare against. The planning research gave approximations from a different reading (about 34 for core beside 41 classes, 1 for react, 7 for audit): the measured figures stand.

## Classes in core

core classes: 41

`/usr/bin/grep -c '^export declare class' packages/core/lib/*.d.ts`, summed over the files.

## Gate 14

package-install runtime exports: 528

`node scripts/check-package-install.mjs` printed `package-install: 9 package(s) pack, resolve and authorize (528 runtime export(s))`. The figure is recorded and not compared: pinning it would be a second source of truth beside each package's `test/surface.test.ts` value list, which fails at once on a name that stops being a value.
