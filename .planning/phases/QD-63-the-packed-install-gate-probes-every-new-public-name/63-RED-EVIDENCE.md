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
