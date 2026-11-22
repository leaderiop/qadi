# Phase 63 RED evidence

Logs copied from runs on 2026-11-20, on `phase_base` `11dc168f4d8a8b295aef16f2d04b762c503d1ba8` plus the
guard commit. Scratch copies lived under `.scratch/qd63-red/` and were deleted afterwards.

## The guard at its own commit

`node scripts/check-package-install.mjs` at the guard commit (`chore(63-01)`), after a green run on the base
(`package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`). Exit status 1; the
consumer's compile and run passed, so the three lines below are the whole failure, and `makeTimelineFeed`
is not named.

```
  the consumer fixture never calls makeDiagnosticsFeed, makeGatesFeed: every make*Feed the packed @qadi/devtools root exports must be probed
  the consumer fixture never uses DecisionCacheShape as a type: every type-only probe name must be a type reference outside a refused literal
  the consumer fixture never refuses a literal typed DecisionCacheShape: every refused-shape probe name must annotate a declaration holding a @ts-expect-error that names its refused member

package-install: 3 failure(s) across 9 package(s).
Sandbox kept in .package-check/ for inspection.
```

### Guard variants

Each variant is the committed script with `ROOT` and `SANDBOX` overridden and at most one group of edits;
every edit asserted its anchor occurred exactly once. `<R>` is the six-line refused literal
(`const refusedProbe: DecisionCacheShape = {` holding `// @ts-expect-error getOrCompute(question, compute) no longer exists`);
`<Q>` is the six-line decoy (`const decoyProbe: DecisionCacheShape = {` whose one directive sits on `size` and does
not name `getOrCompute`). g1's edits: five mention lines after `expect("devtools feed entries", fed.entries, 1);`
(`// makeGatesFeed();`, a string, `typeof`, a bare alias and a commented annotation), `makeGatesFeed` added to the
devtools import, `type DecisionCacheShape` added to the core import.

| id | Edit | Exit | Failure lines |
| --- | --- | --- | --- |
| c0 | none (overrides only) | 1 | `never calls makeDiagnosticsFeed, makeGatesFeed: …`; `never uses DecisionCacheShape as a type: …`; `never refuses a literal typed DecisionCacheShape: …`; `package-install: 3 failure(s) across 9 package(s).` |
| g1 | mentions only: g1's edits | 1 | the same three lines as c0 (a comment, a string, `typeof`, a bare alias and an import specifier are not probes); `3 failure(s)` |
| g2 | g1's edits, then `makeGatesFeed();`, `const typedProbe: Array<DecisionCacheShape> = [];` and `<R>` | 1 | `  the consumer fixture never calls makeDiagnosticsFeed: every make*Feed the packed @qadi/devtools root exports must be probed`; `1 failure(s)` |
| g8 | g1's edits, then `<R>` only | 1 | `  the consumer fixture never calls makeDiagnosticsFeed, makeGatesFeed: …`; `  the consumer fixture never uses DecisionCacheShape as a type: …` (no refused-shape line: a refused literal refuses the type but does not use it); `2 failure(s)` |
| g9 | g1's edits, then `makeGatesFeed();`, `const typedProbe: Array<DecisionCacheShape> = [];` and `<Q>` | 1 | `  the consumer fixture never calls makeDiagnosticsFeed: …`; `  the consumer fixture never refuses a literal typed DecisionCacheShape: …` (a directive on another property that does not name `getOrCompute` refuses nothing); `2 failure(s)` |
| g3 | insert `throw new Error("injected parser failure");` before the line holding `new API(` | 1 | `  the probe guard could not load or run the TypeScript parser: injected parser failure`; `1 failure(s)` |
| g4 | `openProject: join(SANDBOX, "tsconfig.json")` becomes `…"absent-tsconfig.json"…` | 1 | `  the probe guard could not read consumer.ts from the sandbox project`; `1 failure(s)` |
| g5 | `"typescript/unstable/sync"` becomes `"typescript/unstable/absent"` | 1 | `  the probe guard could not load or run the TypeScript parser: Package subpath './unstable/absent' is not defined by "exports" in …/node_modules/typescript/package.json imported from …/.scratch/qd63-red/g5.mjs`; `1 failure(s)` (the summary line was printed) |
| g6 | `/^make\w*Feed$/` becomes `/^make\w*Feedz$/` | 1 | `  the packed @qadi/devtools root exports no make*Feed; the probe guard would be vacuous`; the type-only line; the refused-shape line; `3 failure(s)` |
| g7 | `import("@qadi/devtools")` becomes `import("@qadi/devtools-absent")` | 1 | `  reading the packed @qadi/devtools exports failed:` followed by node's `ERR_MODULE_NOT_FOUND: Cannot find package '@qadi/devtools-absent' imported from …/sandbox/[eval1]`; the type-only line; the refused-shape line; `3 failure(s)` |

In g3, g4 and g5 the count is 1: no name is reported unprobed when the parse yields nothing.

## Removed and broken probes

Every row is a scratch copy of the committed script (at `d693b2d1`, probes in place), run as the real gate with
`ROOT` and `SANDBOX` overridden to `.scratch/qd63-red/`, and deleted after its run. Each edit asserted its anchor
occurred exactly once. Whole-probe removals are cut by anchor: r1 the gates probe, r2 the diagnostics probe, r4 the
host cache alone (the refused literal stays), r5 the refused literal with its directive (the host cache stays).

| id | Edit | Exit | Failure lines |
| --- | --- | --- | --- |
| c0 | none (overrides only) | 0 | `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))` |
| r1 | cut the gates probe | 1 | `  the consumer fixture never calls makeGatesFeed: every make*Feed the packed @qadi/devtools root exports must be probed`; `package-install: 1 failure(s) across 9 package(s).` |
| r2 | cut the diagnostics probe | 1 | `  the consumer fixture never calls makeDiagnosticsFeed: every make*Feed the packed @qadi/devtools root exports must be probed`; `package-install: 1 failure(s) across 9 package(s).` |
| r4 | cut the host cache (refused literal stays) | 1 | `  the consumer fixture never uses DecisionCacheShape as a type: every type-only probe name must be a type reference outside a refused literal`; `package-install: 1 failure(s) across 9 package(s).` |
| r5 | cut the refused literal and its directive (host cache stays) | 1 | `  the consumer fixture never refuses a literal typed DecisionCacheShape: every refused-shape probe name must annotate a declaration holding a @ts-expect-error that names its refused member`; `package-install: 1 failure(s) across 9 package(s).` |
| r3 | drop the pre-0.13 directive alone | 1 | `  the consumer does not type-check against the shipped .d.ts:` then `consumer.ts(258,52): error TS2345: Argument of type 'Pick<EvaluateOptions, "concurrency"> \| undefined' is not assignable to parameter of type 'Effect<unknown, EvaluationError, PortServices>'.`; `  the consumer fixture never refuses a literal typed DecisionCacheShape: …` (the literal is left without its directive); `package-install: 2 failure(s) across 9 package(s).` |
| r6 | drop the `schedule` directive | 1 | `  the consumer does not type-check against the shipped .d.ts:` then `consumer.ts(203,3): error TS2353: Object literal may only specify known properties, and 'schedule' does not exist in type 'DiagnosticsOptions'.`; `package-install: 1 failure(s) across 9 package(s).` |
| dts | revert the sandbox's packed `DecisionCache.d.ts` `getOrCompute` to the `compute` parameter | 1 | `  the consumer does not type-check against the shipped .d.ts:` then `consumer.ts(258,3): error TS2578: Unused '@ts-expect-error' directive.`; `package-install: 1 failure(s) across 9 package(s).` |
| m1 | `makeDiagnosticsFeed({})` becomes `makeDiagnosticsFeed()` | 1 | `  the consumer failed at runtime:` then `Error: consumer: diagnostics feed reached Live in 200 turns was Off, wanted Live`; `package-install: 1 failure(s) across 9 package(s).` |
| m2 | the host cache clears the inner cache after each lookup | 1 | `  the consumer failed at runtime:` then `Error: consumer: host cache lookups was miss,miss, wanted miss,hit`; `package-install: 1 failure(s) across 9 package(s).` |
| m3 | the gates registry literal reports `instances: () => []` | 1 | `  the consumer failed at runtime:` then `Error: consumer: gates feed instance count was 0, wanted 1`; `package-install: 1 failure(s) across 9 package(s).` |

r3, r6 and dts break the compile and m1, m2 and m3 break the run; the guard still ran after each, so only r3 adds a
second failure (its edit leaves the literal unrefused). The dts edit touches the sandbox's extracted copy, not
`packages/core/lib`.

### DoD table

```
$ node scripts/check-dod-table.mjs
dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve
$ git diff --quiet 11dc168f4d8a8b295aef16f2d04b762c503d1ba8 -- spec/process/definitions-of-done.md package.json; echo $?
0
```
