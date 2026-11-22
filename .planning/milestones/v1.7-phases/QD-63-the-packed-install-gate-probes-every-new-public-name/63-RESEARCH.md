# Phase 63: The packed-install gate probes every new public name - Research

**Researched:** 2026-11-20
**Domain:** `scripts/check-package-install.mjs` (merge gate 14): the consumer `FIXTURE`, TypeScript 7.0.2's native toolchain, `@qadi/devtools` feeds, `@qadi/core`'s `DecisionCacheShape`
**Confidence:** HIGH. Every behavioural claim below was probed this session, against the real packed tarballs, in a scratch copy of the script. Probe output is quoted. One locked decision (the guard's parser) needs a changed route; see "Key finding 1".

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The `make*Feed` guard (PROBE-01)**
- The required name set comes from the packed artifact. Inside the sandbox, take `Object.keys(await import("@qadi/devtools"))` and keep the names matching `/^make\w*Feed$/`. The set is what ships, so a new feed export is caught without anyone editing the script.
- "Called, not mentioned" is decided by the TypeScript compiler. Parse the `FIXTURE` source with the `typescript` package (already a dependency). Each required name must be the callee identifier of at least one `CallExpression`. Comments, string text, `typeof X` and an import specifier alone do not count.
- Scope: only the `make*Feed` runtime exports of the `@qadi/devtools` root, as the success criteria state. The type-only `DecisionCacheShape` is held by its own probe and its `@ts-expect-error` (PROBE-04), not by the guard.
- Location: inside check 4 of `scripts/check-package-install.mjs`, beside the fixture it reads. On failure it names every unprobed name. The DoD row is unchanged.

**The three probes (PROBE-02..04)**
- `makeGatesFeed`. The feed is built over a structural registry literal typed by the packed `GateRegistryLike`. The registry holds exactly one `GateInstanceLike`. The probe asserts both of these: the snapshot's `registry` is `RegistryRead.Read` with 1 instance; the snapshot differs from the feed's initial snapshot. `@qadi/react`'s real gate registry needs a DOM and is out of reach from the fixture. Note that the wave notes said "an empty registry"; the success criterion (one instance) supersedes them.
- `makeDiagnosticsFeed`. The probe waits for `status._tag === "Live"`, which only an accepted first sample sets. The wait is a bounded `Effect.yieldNow` loop with a fixed maximum number of turns, and no wall clock. It runs inside `Effect.scoped`, so the scope is closed. The probe fails if `Live` is not reached within the bound. It follows the existing `makeTimelineFeed` probe pattern (`for (let i = 0; i < 20; i++) yield* Effect.yieldNow`).
- The `DecisionCacheShape` host cache. A typed host cache built from the packed `DecisionCacheShape` wraps `decisionCacheLayer()` and counts its own `getOrCompute` calls. A counting attribute resolver (or an equivalent port-read counter) shows that the second of two identical decisions did not walk again. That counter is the hit, and it is observable without touching internals. The probe asserts that the wrapper was called twice and that the walk ran once.
- Where the `@ts-expect-error` goes. It sits on a host-cache literal whose `getOrCompute(question, compute)` has the pre-0.13 shape, assigned to the packed `DecisionCacheShape`. The old shape is therefore refused through the published `.d.ts`.
- All probes are deterministic. No wall clock and no `Date`/`performance`. Every scope is closed.

**Proof and records (PROBE-05, WX)**
- The guard comes first and is RED on the base. It lands in its own commit, before any probe. Gate 14 at that commit fails and names `makeGatesFeed` and `makeDiagnosticsFeed`, the two unprobed names. That output is recorded in the SUMMARY.
- The removed-probe proof is recorded, not committed. In a scratch copy outside the repo, each of the three probes is deleted in turn, and gate 14 must fail every time. A committed self-test would need its own sandbox install.
- ADR: amend ADR-QD-033 ("the packed artifact is the product", the ADR that defines gate 14). The amendment records the derived feed probes and the host-cache probe. ADR-QD-176 is left unused, and the CCR row says so.
- Records: CCR-QD-454 and the traceability rows. No BEH or INV, because gate behaviour is not library behaviour. BEH-QD-651–655 and INV-QD-371–372 are unused and named in the CCR row. No changeset. The DoD table is unchanged.
- Reserved ids only. Never run `scripts/next-id.mjs`, because the whole v1.7 block is already reserved (`_WAVE12-CONTEXT.md`).

### Claude's Discretion
- The exact number of `yieldNow` turns that bounds each probe, and the shape of the counting port.
- Whether the guard's AST walk is a helper in the script or inline in check 4.

### Deferred Ideas (OUT OF SCOPE)
- Guarding every runtime export of every public root, not only `make*Feed`, was considered and not chosen.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROBE-01 | Gate 14 fails when any `make*Feed` runtime export of the packed `@qadi/devtools` root is not called in the fixture; guard first, RED on the base | "The guard": runtime key set via a child `node` in the sandbox; call detection via `typescript/unstable/sync` (the TS 7 route); RED output quoted |
| PROBE-02 | `makeGatesFeed` over a one-instance registry; asserts a read state that differs from the initial snapshot | "Probe: gates feed": the feed reads synchronously, so "initial snapshot" is what a feed over no registry says (`Unwatched`) |
| PROBE-03 | `makeDiagnosticsFeed`; asserts a field only a completed first read sets; bounded yield loop, no clock, closed scope | "Probe: diagnostics feed": `Live` and `reading.hydration` are set; measured 0 turns needed; cap 200 |
| PROBE-04 | Typed host cache from `DecisionCacheShape` wrapping `decisionCacheLayer()`; runs twice, asserts a hit; `@ts-expect-error` refuses the pre-0.13 shape | "Probe: host cache" with exact diagnostics, placement, and a positive twin |
| PROBE-05 | A deliberately removed probe fails gate 14; DoD table unchanged | "Removed-probe proof": 4 variants run; one limit found (the type-only probe is not removal-detectable) |
| WX-01..WX-07 | Cross-cutting | "Records", "Gate impact", "Validation Architecture" |
</phase_requirements>

## Summary

Gate 14 builds, packs and installs the nine public packages into `.package-check/`, writes one `consumer.ts` (`FIXTURE`), compiles it with `tsc` against the packed `.d.ts`, and runs the emitted JS. It takes about 7.5 s alone. All three new probes and the guard fit in that one template literal and in check 4's region of the script, with no `packages/*/src` change. I built all of it in a scratch copy of the script outside the repo and ran it: the type-check passes with both `@ts-expect-error` directives live, the runtime assertions pass, the guard is RED on the base naming exactly `makeDiagnosticsFeed, makeGatesFeed`, and each deliberate break fails gate 14 with a message naming what broke.

Two things differ from what CONTEXT.md and the wave notes assumed, and the planner must build around them. **First**, the repo's `typescript` is 7.0.2, the native port, whose root export has no parser (`Object.keys` of it is `[ 'version', 'versionMajorMinor' ]`). The AST decision still works through the package's `typescript/unstable/sync` API, which I probed. **Second**, the diagnostics feed reaches `Live` with zero `yieldNow` turns and the gates feed publishes its `Read` state synchronously inside `makeGatesFeed`, so "differs from the initial snapshot" has to be asserted against a feed built over no registry, because the true initial value is never observable after construction.

**Primary recommendation:** Land the guard first (its own commit, RED), then the three probes with the exact code in "Code Examples", then record the removed-probe failures in the SUMMARY from scratch copies kept in the scratchpad (never in the repo).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Derive the required `make*Feed` set | Build tooling (gate script) | Packed artifact | The set is read from the installed tarball, so it is what ships |
| Decide "called, not mentioned" | Build tooling (TS 7 native parser via `typescript/unstable/sync`) | — | A syntax question; a regex over text would misread comments and strings |
| Probe the feeds and the host cache | Consumer fixture (compiled and run in the sandbox) | Packed `.d.ts` | The point is that the published `exports` map and `.d.ts` carry them |
| Record the decision | `spec/` (ADR-QD-033 amendment, CCR-QD-454, traceability) | AGENTS.md §16, DoD step-14 paragraph | House rule: spec is normative, one sentence each in the two prose docs |

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Imports:** submodule namespace imports for `effect` (`import * as Effect from "effect/Effect"`); relative imports carry `.ts`; the script is `.mjs` and the fixture is a string, so the rule applies to what the fixture imports (it already does this).
- **Forbidden in shipped source and tests (WX-04):** `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock, `Record<string, unknown>`, `// Stryker disable`. The fixture is not lint-scanned by house-style and already uses top-level `await` and `Date`-free code; keep it clock-free and `as`-free anyway. The probes below contain none of these. [VERIFIED: AGENTS.md §6, read this session]
- **Never** run `node scripts/next-id.mjs`; use `spec-revise.mjs` with `--date`; no changeset; no release/publish/push/tag; do not commit scratch (Phase 62 house rule).
- **Gate numbers in records:** any "gate 14" must sit beside `scripts/check-package-install.mjs`, because `scripts/check-dod-table.mjs` checks references to gate numbers (change history is exempt). [VERIFIED: scripts/check-dod-table.mjs:1-33]
- **Doc-comment shape:** one-line summary first, the why after it.
- **Memory preferences:** closed unions, complete over simple, breaking changes allowed (not in prod).

## Standard Stack

No new package. Everything is already installed at the repo root.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `typescript` | 7.0.2 (catalog `^7.0.0`; root devDependency, `package.json:72`) | `tsc` for the fixture compile, and `typescript/unstable/sync` + `typescript/unstable/ast/is` for the guard | Already how gate 14 compiles; the same native binary serves both |
| `effect` | the repo's catalog version | Fixture runtime (`Effect.scoped`, `Effect.yieldNow`, `Layer`) | Already the fixture's dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `typescript/unstable/sync` AST walk | `blankCode`-style lexer + `(?<![\w$.])NAME\s*\(` regex | No `unstable` API, zero dependency, ~45 lines. `blankCode` exists only as a private const in `scripts/check-house-style.mjs:736`, so reusing it means a second file edit or a copy. Weaker: a string holding `makeXFeed(` would count. Use only if the owner rejects the unstable API. |
| Child `node` for the key set | Parse `lib/index.d.ts` | The `.d.ts` also names type-only exports; the runtime key set is what "runtime export" means. |

**Installation:** none.

**Version verification:** `node_modules/typescript/package.json` reads `"version": "7.0.2"`, and its `exports` map lists `"./unstable/sync": "./dist/api/sync/api.js"`, `"./unstable/ast/is": "./dist/ast/is.js"`. [VERIFIED: node_modules/typescript/package.json:28-47]

## Package Legitimacy Audit

No external package is installed by this phase. `typescript` is an existing root devDependency; only its already-shipped `unstable/*` subpaths are imported. Audit table: not applicable.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Key findings (read these first)

### Key finding 1: the repo's `typescript` has no in-process parser; use `typescript/unstable/sync`

CONTEXT.md locks "parse the `FIXTURE` source with the `typescript` package". The installed package is the native port. Probe output:

```
$ node -e 'import("typescript").then(m=>console.log(Object.keys(m.default??m)))'
[ 'version', 'versionMajorMinor' ]
```

`ts.createSourceFile` does not exist. `grep -rln "createSourceFile\|parseSourceFile" node_modules/typescript/dist` finds only `factory.generated.*`. No `acorn`, `@babel/parser` or `oxc-parser` is resolvable from the repo root (`ls node_modules/@babel node_modules/acorn node_modules/oxc-parser` fail), and pnpm's strictness forbids reaching into `.pnpm/`. [VERIFIED: probes above]

The compiler is still usable as the oracle through its explicitly unstable sync API, which spawns the same native binary `npx tsc` already needs. I probed it on a fixture file containing every case CONTEXT names:

```ts
import { makeGatesFeed, makeDiagnosticsFeed, makeTimelineFeed, makeFooFeed, makeBarFeed } from "@qadi/devtools";
// makeGatesFeed( in a comment
/* makeGatesFeed() in a block comment */
const s = "makeDiagnosticsFeed()";
const t = `${1} makeDiagnosticsFeed()`;
type T = typeof makeDiagnosticsFeed;
declare const feeds: { makeFooFeed: () => void };
feeds.makeFooFeed();
const alias = makeBarFeed;
makeTimelineFeed({});
```

Result of the walk (`isCallExpression(n) && isIdentifier(n.expression)` collects `n.expression.text`): `[ 'makeTimelineFeed' ] 27 ms`. The comment, block comment, string, template text, `typeof`, import specifier, property-access call and bare alias are all correctly excluded. [VERIFIED: scratch probe this session]

**Decision for the planner:** implement the guard through `typescript/unstable/sync` (this honours the locked "TypeScript compiler decides" intent). Flag in the plan that the API is named `unstable`, that the catalog range `^7.0.0` admits later 7.x minors, and that the lockfile pins 7.0.2; if a later TS bump breaks the import the gate fails loudly at the import line, not silently. Wrap the API use in `try`/`catch` so a missing native binary reports through `fail(...)` rather than a stack trace (tsgo is the same binary `npx tsc` needs, so an environment that runs the gate has it). If the owner would rather not depend on `unstable`, the fallback is in the Alternatives table. This is an item for the plan-checker: **A1 in the Assumptions Log**.

### Key finding 2: `makeGatesFeed` has no observable "initial" state after construction

`makeGatesFeed` creates its store as `snapshotOf(UNWATCHED, UNHANDED)` and then, still inside the constructor, runs `watch(registryNow); publish(readRegistry(), readAsked()); cadence();`. So `getSnapshot()` right after `yield* makeGatesFeed({ gates })` is already `Read`. [VERIFIED: packages/devtools/src/model/GatesFeed.ts, the lines `const store = makeExternalStore<GatesSnapshot>(snapshotOf(UNWATCHED, UNHANDED));` and `watch(registryNow);\n  publish(readRegistry(), readAsked());\n  cadence();`] No `Effect.yieldNow` is needed. "Differs from the feed's initial snapshot" therefore cannot be a before/after on one feed. The non-vacuous reading is: a feed built over **no** registry (`makeGatesFeed()`) says `Unwatched`, the feed over one instance says `Read` with 1 instance, and the two differ. A change signal adds a second, independent proof: swap the registry's array, call the captured listener, and the feed's snapshot follows. Closing the scope releases the one subscription (assert the listener set is empty after).

### Key finding 3: `makeDiagnosticsFeed({})` is `Live` synchronously; the loop is a bound, not a wait

`start` runs `show(Starting)` then `runs.fork(...)`, and the comment on the line above says "its synchronous prefix may already reach `Live` or `Stopped`". I measured it: with `{}` options the status is `Live` immediately after `yield* makeDiagnosticsFeed({})`, with 0 turns. [VERIFIED: probe printed `turns-probe Live` before the loop ran] So the bounded loop never iterates today; it is kept because it is the locked design and survives the first read becoming asynchronous. The "field only a completed first read sets" is `status._tag === "Live"` plus `reading.hydration !== undefined` (`Diagnostics.hydration` is documented "`undefined` only before the first sample"; [VERIFIED: packages/devtools/src/model/DiagnosticsStore.ts:75-90, `readonly hydration: HydrationActivity | undefined;` with `/** \`undefined\` only before the first sample. */`]). The contrast baseline is `makeDiagnosticsFeed()` with no options, which is `Off`.

The scope closes without waiting for `intervalMillis`: the whole consumer runs in `0.23s` including the 2000 ms default sleep it never awaits. [VERIFIED: `time node out/consumer.js` → `0.23s`]

### Key finding 4: the type-only probe cannot be proven by removing it

`DecisionCacheShape` has no runtime key, so the derived guard cannot see it (as CONTEXT says). I ran the removal experiments; **deleting the whole host-cache probe leaves gate 14 green** (variant r4 below). What does fail, and is the proof to record for this probe: deleting just the `@ts-expect-error` line (TS2345), breaking the delegation (runtime assertion), and a packed `.d.ts` that has the old shape (TS2578). Success criterion 4 ("a deliberately removed probe is shown failing") is satisfiable for the two feed probes by removal, and for the host cache by these three deliberate breaks. State the limit honestly in the SUMMARY and the ADR amendment; do not claim the guard covers it.

## Architecture Patterns

### System Architecture Diagram

```
pnpm build ──► pnpm pack x9 ──► tar extract into .package-check/node_modules/@qadi/*
                                          │
        check 1,2 (manifest, exports) ◄───┤
        check 3, 3b (imports, closed list)│
                                          ▼
                 write consumer.ts (FIXTURE) + tsconfig.json   [check 4]
                                          │
          ┌───────────────────────────────┼──────────────────────────────┐
          ▼                               ▼                              ▼
  child `node` in sandbox:       typescript/unstable/sync:       (only if no failures yet)
  Object.keys(import             parse consumer.ts,              npx tsc -p  ──► .d.ts check
   "@qadi/devtools")             collect callee identifiers      node out/consumer.js ──► runtime asserts
   filter /^make\w*Feed$/        of CallExpressions
          └──────────────┬────────────────┘
                         ▼
         required \ called  ≠ ∅  ──►  fail("never calls X, Y")
```

### Recommended structure

Everything stays in `scripts/check-package-install.mjs`: two imports at the top (`typescript/unstable/sync`, `typescript/unstable/ast/is`), the guard block after the `tsconfig.json` is written and before the `tsc` step, the probes inside `FIXTURE`, the imports in `FIXTURE`'s import lists. Also update the header comment (one paragraph under check 4; the list still says "Six checks", the guard is part of check 4).

### Pattern 1: guard placement
Put the guard after `writeFileSync(join(SANDBOX, "tsconfig.json"), …)` and before `if (failures.length === 0) { … npx tsc … }`. It needs the sandbox's `tsconfig.json` and `consumer.ts` on disk, not a clean compile. Wrap in `if (failures.length === 0)` to match the two steps after it (the earlier checks may have left no installed devtools). A guard failure then skips `tsc` and the run; that is fine because the single message is the point. In the base RED run the compile and run would have passed.

### Pattern 2: type-only names are held by the compiler, not the guard
`import { type DecisionCacheShape, … } from "@qadi/core"` plus a literal annotated with it. A broken `.d.ts` or `exports` entry is a compile error in the consumer.

### Anti-Patterns to Avoid
- **A pre-0.13 `@ts-expect-error` on a function with fewer parameters.** TypeScript accepts `getOrCompute: (_question) => …` as a `DecisionCacheShape` method (verified, below); the directive would be unused (TS2578) or, worse, sit on something else. The old literal must *use* `compute` as an Effect.
- **Asserting `Unwatched` as the "different" state on the feed under test.** It is the initial store value and is never observable after construction; asserting it on that feed is vacuous. Assert `Read`, count 1, and contrast with a no-registry feed.
- **Using `Layer.mergeAll` for more than a handful of layers** — house gotcha (~90 arguments); the fixture's inline `mergeAll` has six.
- **Backticks or `${` in the probe text.** `FIXTURE` is one JS template literal; escape a backtick as `\`` and write `\${`. My probes avoid `${` entirely (string concatenation in the one label that needs a number).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Is this name called, not mentioned" | A regex over source text | `typescript/unstable/sync` + `isCallExpression`/`isIdentifier` | Comments, strings, template text, `typeof`, property calls are all handled by the parser |
| The host cache's inner behaviour | A second walk or a trace-building cache | Wrap `decisionCacheLayer()` and delegate; core does not export `walk` (ADR-QD-174 decision 5) | A host cache must answer with a trace for exactly the question it is given |
| A "hit" observable | Reading the cache's internals | The wrapper records `lookup.outcome` from the inner call, and a counting `AttributeResolver` counts walks | Public surface only |
| The time bound in the diagnostics probe | `Effect.sleep` / a timeout | A capped `Effect.yieldNow` loop | No clock (house rule) |

## Runtime State Inventory

Not a rename/refactor/migration phase. Omitted.

## Common Pitfalls

### Pitfall 1: the fixture's escapes
**What goes wrong:** a backtick or `${` in probe text ends or interpolates the `FIXTURE` template, producing a confusing script syntax error rather than a fixture error.
**How to avoid:** comments in the probes use `\`` for backticks (the existing fixture does: ``\`Reading\` ``); no `${`.
**Warning signs:** `node scripts/check-package-install.mjs` fails to start.

### Pitfall 2: `.package-check` is shared state
Two runs at once clobber each other (`rmSync(SANDBOX)` at the start, `rmSync` at the end on success). Never run gate 14 in parallel with itself or with `pnpm check:pr`. A failing run leaves `.package-check/` behind ("Sandbox kept in .package-check/ for inspection"); it is gitignored. [VERIFIED: .gitignore `.package-check/`]

### Pitfall 3: a scratch copy needs `"type": "module"` above the sandbox
The in-repo sandbox is typed ESM because `<repo>/package.json` is `"type": "module"` (ancestor lookup). A sandbox elsewhere fails with `TS1295: ECMAScript imports and exports cannot be written in a CommonJS file under 'verbatimModuleSyntax'`. [VERIFIED: hit this on my first scratch run] Keep the scratch sandbox under `<repo>/.scratch/` (gitignored, `.gitignore:22`) so the ancestor `package.json` applies, and delete only your own subfolder (`.scratch/` already holds other people's directories).

### Pitfall 4: `spec-revise.mjs` without `--date` drops its first positional
`positional = args.filter((arg, index) => !arg.startsWith("--") && index !== dateFlag + 1)` with `dateFlag === -1` excludes index 0. Always pass `--date`. [VERIFIED: scripts/spec-revise.mjs:66-68]

### Pitfall 5: oxlint is silent on success
`npx oxlint scripts/…mjs` prints nothing and exits 0 when clean. Judge by exit code.

## Code Examples

### The guard (as probed; bare specifiers are what the real script uses)

```js
// at the top of scripts/check-package-install.mjs
import { API } from "typescript/unstable/sync";
import { isCallExpression, isIdentifier } from "typescript/unstable/ast/is";

// after the sandbox tsconfig.json is written, before the `npx tsc` step
if (failures.length === 0) {
  const feedExports = (() => {
    try {
      const keys = execFileSync(
        "node",
        ["--input-type=module", "-e", 'console.log(JSON.stringify(Object.keys(await import("@qadi/devtools"))))'],
        { cwd: SANDBOX, encoding: "utf8", stdio: "pipe" },
      );
      return JSON.parse(keys.trim().split("\n").at(-1) ?? "[]").filter((key) => /^make\w*Feed$/.test(key));
    } catch (error) {
      fail(`reading the packed @qadi/devtools exports failed:\n${error.stderr ?? error.message}`);
      return [];
    }
  })();
  if (feedExports.length === 0) fail("the packed @qadi/devtools root exports no make*Feed; the feed guard would be vacuous");

  const called = new Set();
  try {
    const api = new API({ cwd: SANDBOX });
    try {
      const file = api
        .updateSnapshot({ openProject: join(SANDBOX, "tsconfig.json") })
        .getProjects()[0]
        ?.program.getSourceFile(join(SANDBOX, "consumer.ts"));
      const visit = (node) => {
        if (isCallExpression(node) && isIdentifier(node.expression)) called.add(node.expression.text);
        node.forEachChild(visit);
      };
      if (file === undefined) fail("the feed guard could not read consumer.ts");
      else visit(file);
    } finally {
      api.close();
    }
  } catch (error) {
    fail(`the feed guard could not parse the fixture: ${error.message}`);
  }
  const unprobed = feedExports.filter((name) => !called.has(name));
  if (unprobed.length > 0) {
    fail(`the consumer fixture never calls ${unprobed.join(", ")}: every make*Feed the packed @qadi/devtools root exports must be probed`);
  }
}
```

I ran this (without the outer `try`/`catch`, which only adds a message path) in the scratch copy. Runtime keys of the packed root, probed in the sandbox:
```
[ 'makeDiagnosticsFeed', 'makeGatesFeed', 'makeTimelineFeed' ]
```
(`makeSimulationSession` is an export that matches `/^make/` but not `/^make\w*Feed$/`.) `typescript/unstable/sync` and `typescript/unstable/ast/is` resolve from the repo root: `node --input-type=module -e 'import { API } from "typescript/unstable/sync"; import { isCallExpression, isIdentifier } from "typescript/unstable/ast/is"; …'` printed `function function function`. The guard adds ~30 ms plus one child `node` start.

**RED on the base** (the base fixture plus only the guard; gate 14 at the guard commit):
```
  the consumer fixture never calls makeDiagnosticsFeed, makeGatesFeed: every make*Feed the packed @qadi/devtools root exports must be probed

package-install: 1 failure(s) across 9 package(s).
Sandbox kept in .package-check/ for inspection.
```
exit status 1, 6.4 s wall. Exactly the two names CONTEXT predicted; `makeTimelineFeed` is not listed.

### `FIXTURE` import additions (alphabetical, case-insensitive, matching the existing list)

`@qadi/core` list gains `AttributeResolver`, `DecisionCache`, `decisionCacheLayer`, `type DecisionCacheShape`, `gte`, `hasAttribute`. The devtools line becomes a multi-line list: `type DiagnosticsOptions, emptyTimeline, type GateInstanceLike, type GateRegistryLike, ingest, makeDiagnosticsFeed, makeGatesFeed, makeTimelineFeed, sourceFromRecords, verdictOf`. All names resolve from the packed roots (the compile passed). `verbatimModuleSyntax` is on, so the type-only names use the inline `type` modifier.

### The probes (insert after `expect("devtools feed entries", fed.entries, 1);`; backticks are `\`` inside the template)

```ts
// A feed built over a registry says what the registry holds, which is not what a feed over none says.
// \`makeGatesFeed\` reads synchronously, so no turn is needed; the registry is a structural literal because
// @qadi/react's real one needs a DOM. Closing the scope must release the one subscription it took.
const gate: GateInstanceLike = { id: "gate-1", kind: "Guard", policy: hasPermission(read), state: "Allowed" };
let registered: ReadonlyArray<GateInstanceLike> = [gate];
const gateListeners = new Set<() => void>();
const gateRegistry: GateRegistryLike = {
  instances: () => registered,
  subscribe: (listener) => {
    gateListeners.add(listener);
    return () => {
      gateListeners.delete(listener);
    };
  },
};
const gated = await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const bare = yield* makeGatesFeed();
      const feed = yield* makeGatesFeed({ gates: gateRegistry });
      const read = feed.getSnapshot().registry;
      const watching = gateListeners.size;
      registered = [gate, { ...gate, id: "gate-2" }];
      for (const listener of gateListeners) listener();
      const changed = feed.getSnapshot().registry;
      return {
        initial: bare.getSnapshot().registry._tag,
        read: read._tag,
        count: read._tag === "Read" ? read.instances.length : -1,
        watching,
        changed: changed._tag === "Read" ? changed.instances.length : -1,
      };
    }),
  ),
);
expect("gates feed with no registry", gated.initial, "Unwatched");
expect("gates feed over one instance", gated.read, "Read");
expect("gates feed instance count", gated.count, 1);
expect("gates feed subscribes once", gated.watching, 1);
expect("gates feed follows its registry", gated.changed, 2);
expect("gates feed releases on close", gateListeners.size, 0);

// \`Live\` is set only by an accepted first sample, so a feed that read nothing stays \`Starting\`. A bounded
// yield loop, no clock; closing the scope interrupts the poll's wait for its next sample.
const diagnosed = await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const off = yield* makeDiagnosticsFeed();
      const feed = yield* makeDiagnosticsFeed({});
      let turns = 0;
      while (feed.getSnapshot().status._tag !== "Live" && turns < 200) {
        yield* Effect.yieldNow;
        turns += 1;
      }
      const after = feed.getSnapshot();
      return { off: off.getSnapshot().status._tag, after: after.status._tag, hydration: after.reading.hydration !== undefined, turns };
    }),
  ),
);
expect("diagnostics feed handed no options", diagnosed.off, "Off");
expect("diagnostics feed reached Live in " + String(diagnosed.turns) + " turns", diagnosed.after, "Live");
expect("diagnostics feed first read sets hydration", diagnosed.hydration, true);

// DiagnosticsOptions has a cadence in milliseconds and no \`schedule\`.
const noSchedule: DiagnosticsOptions = {
  // @ts-expect-error a cadence is a number, not a Schedule
  schedule: "immediate",
};

// @qadi/core's DecisionCacheShape is type-only, so only the compiler reaches it. A host cache wraps
// decisionCacheLayer() and delegates; the walk runs once and the second ask is a hit.
const cacheOutcomes: Array<string> = [];
let resolverCalls = 0;
const hostCache = Layer.effect(
  DecisionCache,
  Effect.gen(function* () {
    const inner = yield* DecisionCache;
    const shape: DecisionCacheShape = {
      getOrCompute: (question, options) =>
        inner.getOrCompute(question, options).pipe(
          Effect.tap((lookup) =>
            Effect.sync(() => {
              cacheOutcomes.push(lookup.outcome);
            }),
          ),
        ),
      size: inner.size,
      clear: inner.clear,
    };
    return DecisionCache.of(shape);
  }),
).pipe(Layer.provide(decisionCacheLayer()));
const countingResolver = Layer.succeed(AttributeResolver, {
  resolve: () =>
    Effect.sync(() => {
      resolverCalls += 1;
      return 5;
    }),
});
const needsLookup = hasAttribute("clearance", gte(1));
const cached = await Effect.runPromise(
  Effect.gen(function* () {
    const first = yield* evaluate(needsLookup);
    const second = yield* evaluate(needsLookup);
    const cache = yield* DecisionCache;
    return { tags: [first._tag, second._tag].join(), size: yield* cache.size };
  }).pipe(
    Effect.provide(hostCache),
    Effect.provide(currentSubjectLayer(alice)),
    Effect.provide(Layer.mergeAll(countingResolver, CustomPredicateNone, DecisionHistoryUnknown, EvaluationIdLive, RelationshipResolverNever, SignatureHistoryNone)),
  ),
);
expect("host cache decisions", cached.tags, "Allow,Allow");
expect("host cache lookups", cacheOutcomes.join(), "miss,hit");
expect("host cache walked once", resolverCalls, 1);
expect("host cache holds one entry", cached.size, 1);

// The pre-0.13 shape took the computation and stored its result under the question. It is refused: the
// second parameter is now the options, so running it as an Effect is TS2345.
const preThirteen: DecisionCacheShape = {
  // @ts-expect-error getOrCompute(question, compute) no longer exists
  getOrCompute: (_question, compute) => Effect.map(compute, (trace) => ({ trace, outcome: "miss" })),
  size: Effect.succeed(0),
  clear: Effect.void,
};
```

Result of running exactly this (`pnpm`-free, scratch copy of the script): `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`, exit 0. The consumer's own runtime is 0.23 s. Note `noSchedule` and `preThirteen` are unused locals; the sandbox `tsconfig.json` has no `noUnusedLocals`, so they compile. If the plan wants them referenced, `expect("…", typeof preThirteen.size, "object")` is enough; not required.

The `@ts-expect-error` before `getOrCompute:` and the delegating host cache are the same shape the upgrade guide's 0.13 section already compiles (`apps/website/src/content/docs/docs/reference/upgrading.md`, "After" block uses `{ ...inner, getOrCompute }`; mine states `size`/`clear` explicitly so the assignment to the named packed type is the point).

### The pre-0.13 refusal, exactly

Probe (scratch file, compiled against the packed `@qadi/core` `.d.ts` with the sandbox's compiler options):
```ts
export const preThirteen: DecisionCacheShape = {
  getOrCompute: (_question, compute) => Effect.map(compute, (trace) => ({ trace, outcome: "miss" })),
  size: Effect.succeed(0), clear: Effect.void,
};
export const fewer: DecisionCacheShape = {          // a function with FEWER parameters
  getOrCompute: (_question) => Effect.never,
  size: Effect.succeed(0), clear: Effect.void,
};
```
Output:
```
probe-a.ts(5,52): error TS2345: Argument of type 'Pick<EvaluateOptions, "concurrency"> | undefined' is not assignable to parameter of type 'Effect<unknown, EvaluationError, PortServices>'.
  Type 'undefined' is not assignable to type 'Effect<unknown, EvaluationError, PortServices>'.
```
Only line 5 (the `compute` token inside `Effect.map(compute, …)`) errors. `fewer` produces **no** error, which confirms the vacuity risk: a pre-0.13 literal that does not use `compute` as an Effect compiles. So:
- **Placement:** the directive goes on the line directly above the line that contains `Effect.map(compute, …)`. In the fixture that is the single `getOrCompute:` line, inside the object literal (so the line below the directive is the one TS2345 is reported on). If a formatter ever splits the arrow, the directive must move to the line holding `compute`.
- **Suppressed diagnostic:** `TS2345` (code only; `@ts-expect-error` does not match a code, so the unrelated-error risk is bounded by the positive twin: the host cache directly above it is the same literal type with the post-0.13 shape and compiles, and by the next point).
- **Directive is load-bearing against the packed `.d.ts`:** I edited the packed `node_modules/@qadi/core/lib/DecisionCache.d.ts` in the scratch sandbox to the old signature (`compute: Effect.Effect<Trace, EvaluationError, PortServices>`) and the compile reported `consumer.ts(258,3): error TS2578: Unused '@ts-expect-error' directive.` Deleting the directive with the real `.d.ts` reports `consumer.ts(258,52): error TS2345: …` as above.
- `schedule` pin: without the directive, `probe-c.ts(3,3): error TS2353: Object literal may only specify known properties, and 'schedule' does not exist in type 'DiagnosticsOptions'.` The directive sits on the line above the `schedule:` property.

How a host wraps `decisionCacheLayer()`: it is `Layer<DecisionCache>`; `DecisionCache` is a `Context.Service` whose shape is `DecisionCacheShape`. The host layer is `Layer.effect(DecisionCache, Effect.gen(function* () { const inner = yield* DecisionCache; … })).pipe(Layer.provide(decisionCacheLayer()))`: the inner build is provided to the effect, the outer layer exports the wrapper. This is the form `packages/core/test/Lifecycle.test.ts:24-38` and the upgrade guide use. [VERIFIED: packages/core/test/Lifecycle.test.ts, quoted: `const inner = yield* DecisionCache; return DecisionCache.of({ ...inner, getOrCompute: (key, options) => { keys.push(key); return inner.getOrCompute(key, options); } }); … }).pipe(Layer.provide(decisionCacheLayer()));`] The cache must wrap the **unit of work**, not each evaluation (`evaluate(p).pipe(Effect.provide(decisionCacheLayer()))` builds a fresh cache per run); my probe provides `hostCache` around the `Effect.gen` that runs both evaluations.

Observable of a hit: `CacheOutcome` is `Schema.Literals(["hit", "coalesced", "miss"])` [VERIFIED: packages/core/src/SinkRecordFields.ts:46]. The wrapper records `lookup.outcome` per call (`"miss,hit"`), and an independent counting `AttributeResolver` shows 1 resolve for 2 evaluations. Public names needed, all exported from the packed `@qadi/core` root and confirmed by the compile: `DecisionCache`, `decisionCacheLayer`, `DecisionCacheShape` (type), `AttributeResolver`, `hasAttribute`, `gte`, `evaluate`, `currentSubjectLayer`.

## Removed-probe proof (what I ran, recorded for the SUMMARY)

Method (leaves nothing in the repo): a scratch copy of the script in the scratchpad with `ROOT` hard-coded to the repo and `SANDBOX = join(ROOT, ".scratch", "p63-gate")` (gitignored; deleted afterwards), variants produced by string edits of the scratch copy. `ROOT` is derived from `import.meta.url`, so a copy outside `scripts/` must have `ROOT` overridden, as here:
```
sed -e 's#^const ROOT = .*#const ROOT = "<abs repo path>/";#' \
    -e 's#^const SANDBOX = .*#const SANDBOX = join(ROOT, ".scratch", "p63-gate");#' scripts/check-package-install.mjs > <scratchpad>/base.mjs
```
(The scratch copy imports `typescript/unstable/*` by absolute `node_modules/typescript/dist/...` path because a bare specifier does not resolve from the scratchpad.) A run takes ~7 s; the five variants cost ~40 s. The `git status` after every step showed only the pre-existing untracked `.agents/` and `.codex/`.

| Variant | Edit | Result (verbatim, trimmed) |
|---|---|---|
| base + guard only | none | `the consumer fixture never calls makeDiagnosticsFeed, makeGatesFeed: every make*Feed …` exit 1 |
| r1 | delete the gates probe block (imports left, so a "mention" remains) | `the consumer fixture never calls makeGatesFeed: …` |
| r2 | delete the diagnostics probe block | `the consumer fixture never calls makeDiagnosticsFeed: …` |
| r3 | delete only the pre-0.13 `@ts-expect-error` line | `the consumer does not type-check against the shipped .d.ts: … error TS2345: Argument of type 'Pick<EvaluateOptions, "concurrency"> \| undefined' …` |
| r4 | delete the whole host-cache probe | **passes** (`9 package(s) pack, resolve and authorize`): the documented limit |
| d.ts | packed `DecisionCache.d.ts` reverted to the `compute` shape | `error TS2578: Unused '@ts-expect-error' directive.` |
| m1 | `makeDiagnosticsFeed({})` → `makeDiagnosticsFeed()` | `consumer: diagnostics feed reached Live in 200 turns was Off, wanted Live` |
| m2 | add `Effect.tap(() => inner.clear)` to the host wrapper | `consumer: host cache lookups was miss,miss, wanted miss,hit` |
| m3 | registry `instances: () => []` | `consumer: gates feed instance count was 0, wanted 1` |

## Don't-guess facts about gate 14

- **Command:** `node scripts/check-package-install.mjs` (= `pnpm spec:package`, DoD row 14). It runs `pnpm build` itself (`tsc -b tsconfig.build.json`, incremental), then `pnpm pack` x9, so no separate build is needed. [VERIFIED: scripts/check-package-install.mjs:138-175]
- **Wall time:** 7.5 s (`time` real 7.498 s, packages already built); 6.4-7.1 s in my scratch runs. Alone, no arguments.
- **Sandbox:** `<repo>/.package-check/`, gitignored (`.gitignore`: `.package-check/`); removed on success, kept on failure.
- **Exit codes / output:** failures are pushed with `fail(message)`; at the end each prints indented to stderr, then `package-install: N failure(s) across 9 package(s).` and `Sandbox kept in .package-check/ for inspection.`, exit 1. Success prints `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`, exit 0. A `pnpm build` failure exits earlier.
- **Fixture file format:** the sandbox is ESM only through the repo root's `"type": "module"` (Pitfall 3); top-level `await` in the fixture relies on that.
- **Gate impact (WX-01):** `pnpm check:pr` = `scripts/run-check.mjs --skip-mutation`, which runs every step of `check` except `pnpm mutation`; step `pnpm spec:package` is this script. `check:fast` drops `pnpm spec:package`. [VERIFIED: scripts/run-check.mjs:39-60] `pnpm lint` = `oxlint && node scripts/check-house-style.mjs`; oxlint scans `scripts/` (not in `.oxlintrc.json` `ignorePatterns`) and I ran it on the scratch script placed as `scripts/p63-lint-probe.mjs`: exit 0, no output (file deleted). `check-house-style.mjs` `collect()` walks `packages/*/src`, `features/step-definitions`, `packages/*/test`, `packages/*/bench` and does not walk `scripts/` [VERIFIED: scripts/check-house-style.mjs:1041-1064]; its `.tst.ts` budgets are unaffected. Stryker `mutate` globs are all `packages/*/src/**` [VERIFIED: stryker*.mjs `mutate:` lines]; this phase touches no mutated file, so WX-05's mutation base is "not applicable: no `packages/*/src` file changes", recorded in a one-line `63-mutation-base.json`-equivalent note if the plan template insists.

## Records (WX-02, WX-03)

All edits are documentation and the one script. Use only reserved numbers; never run `next-id.mjs`.

1. **ADR-QD-033 amendment** (`spec/decisions/033-the-packed-artifact-is-the-product.md`, Revision 1.1 today). Run `node scripts/spec-revise.mjs spec/decisions/033-the-packed-artifact-is-the-product.md "<reason>" --date 2026-11-20` (bumps to 1.2 and prepends the history entry; `--date` mandatory). Add a section in the existing house form, mirroring ADR-QD-037's `## Amendment (2026-11-20, ADR-QD-175, CCR-QD-453)` / `## Revision note (2026-11-12, ARCH-80, CCR-QD-423)`: `## Amendment (2026-11-20, ARCH-110, CCR-QD-454)` placed before the trailing `---` / `_Related:_` line. Content: check 4's fixture calls every `make*Feed` the packed devtools root exports (the set read from the artifact; the call decided by the compiler's parse); the type-only `DecisionCacheShape` is held by the compiler against the packed `.d.ts`; the one limit (removing the type-only probe is not detected). ADR-QD-176 is not created. `spec/decisions/index.yaml` needs no change (ADR-QD-037 stays `status: "Accepted"` after three amendments; only the amending ADR carries "amends").
2. **CCR-QD-454 row** in `spec/README.md`, appended after the CCR-QD-453 row (line 390 today). Format of the neighbours: `| CCR-QD-454 | 2026-11-20 | <files and revisions> | ARCH-110. **Bold one-line title.** <prose>. … Ids used: none. Unused: ADR-QD-176, BEH-QD-651–655, INV-QD-371–372. |` The files cell lists `spec/decisions/033-the-packed-artifact-is-the-product.md` Rev 1.2 (amendment), `spec/process/definitions-of-done.md` Rev 1.19 (step-14 paragraph), `spec/traceability.md` Rev 1.225, `spec/README.md` Rev 1.262, `AGENTS.md` (section 16), `scripts/check-package-install.mjs` (the guard and the consumer fixture), no changeset. Write "scripts/check-package-install.mjs (gate 14's …)" so `check-dod-table.mjs` sees the script name beside the number (CCR-QD-449 did exactly this). Revision numbers above are expected values (current: README 1.261, traceability 1.224, DoD 1.18 per the CCR-QD-453 row, ADR-QD-033 1.1); read them off the files before writing. Bump the README itself with `spec-revise` (`--date 2026-11-20`).
3. **`spec/traceability.md`:** amend the ADR-QD-033 row (line 269) in the style of the ADR-QD-037 row ("; amendment (CCR-QD-454): the consumer calls every `make*Feed` the packed devtools root exports and compiles `DecisionCacheShape`'s host-cache form (ARCH-110)"); leave the INV-QD-027 row's "five deliberate breaks" as is unless the plan wants to restate; prepend a Change History entry via `spec-revise` ("ADR-QD-033 amended; no BEH or INV (ARCH-110, CCR-QD-454)"). There is no per-script file-mapping row for `check-package-install.mjs` in the file-to-requirement table (grep found only the INV-QD-027 and ADR-QD-099 rows), so nothing else maps.
4. **AGENTS.md §16** (one sentence, in the first paragraph after "…published `exports` map."): e.g. "Its consumer also calls every `make*Feed` the packed `@qadi/devtools` root exports, so a new feed left unprobed fails." Do not write "gate N" without the script name in that sentence. [Existing text, read this session: "`scripts/check-package-install.mjs` is merge gate 14: it packs each public package, installs it into a sandbox and makes a TypeScript consumer authorize through the published `exports` map."] AGENTS.md has no revision header.
5. **`spec/process/definitions-of-done.md`** step-14 paragraph (line ~174, begins "`node scripts/check-package-install.mjs`, step 14, is new in CCR-QD-038"): add one sentence at its end, then `spec-revise --date 2026-11-20` on that file. The table row 14 and `package.json`'s `check` are untouched, so `scripts/check-dod-table.mjs` check 1 is unaffected.
6. **WX-03 / gate 13:** no export added or removed, so `spec/overview.md` is unchanged. **`check-devtools-claims.mjs`:** touches `spec/devtools-spec/` claims of absence; this phase adds none and edits nothing there.
7. **`verify-traceability --strict`:** reserved-but-unused ids need nothing; the only CCR-related check (`CCR register coverage`, `spec/scripts/verify-traceability.sh:298-320`) requires every cited `CCR-QD-NNN` to be registered, so CCR-QD-454 must be in the README register in the same change that cites it. The script header comment in `check-package-install.mjs` should not cite ARCH-/CCR ids unless the row exists (WX-07: no D-numbers or phase numbers in shipped source or test titles).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The owner accepts `typescript/unstable/sync` (an `unstable`-named API) as "the TypeScript compiler" for the guard, since the root `typescript` export has no parser | Key finding 1 | If rejected, switch to the blanked-code regex fallback; guard behaviour on the fixture is identical, only the dependency changes. Plan-checker should surface this to the owner before execution |
| A2 | `typescript/unstable/*` keeps its shape across TS 7.x minors inside the catalog range `^7.0.0` | Key finding 1 | A TS bump could break gate 14 at the import; fails loudly, fix is local to the script |
| A3 | The scratch runs on macOS/arm64 and Node 26.13 behave the same on the CI Linux runner and Node >=22.12 (`package.json` engines) | Don't-guess facts | `tsgo` is the same native binary `npx tsc` already requires, so an environment that runs gate 14 has it; not run on Linux here |

All other claims were verified this session; none are training-knowledge.

## Open Questions

1. **Success criterion 4 for the type-only probe**
   - What we know: removing the whole host-cache probe leaves gate 14 green (r4); the three deliberate breaks do fail it.
   - What's unclear: whether the owner reads criterion 4 as requiring whole-probe removal to fail for all three.
   - Recommendation: record the three breaks and the honest limit; a hardcoded `DecisionCacheShape` mention check would contradict "derived guard" and the deferred idea.
2. **Guard failure suppresses compile and run**
   - Because the compile/run steps are `if (failures.length === 0)`, a guard failure hides a simultaneous compile error. Acceptable (single clear message); say so in the plan.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | the gate | yes | v26.13.0 (engines `>=22.12.0`) | — |
| pnpm | `pnpm build` / `pnpm pack` | yes | 10.17.1 | — |
| `typescript` (native) | `npx tsc`, `typescript/unstable/sync` | yes | 7.0.2 | regex guard (A1) |
| `@qadi/*` tarballs | all of it | built by the gate | 0.12.0 | — |

No missing dependencies.

## Validation Architecture

(`workflow.nyquist_validation` is enabled; the key is absent from this phase's inputs, so treated as enabled.)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | none: the gate script is its own test; the fixture asserts with its `expect(label, actual, wanted)` helper |
| Config file | `scripts/check-package-install.mjs` (the sandbox `tsconfig.json` it writes) |
| Quick run command | `node scripts/check-package-install.mjs` (~7.5 s, SLOW relative to unit tests, but the only one needed) |
| Full suite command | `pnpm check:pr < /dev/null` (WX-01; long, run once at the end of the phase) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROBE-01 | guard fails when a `make*Feed` is uncalled; RED on base | gate | `node scripts/check-package-install.mjs` at the guard commit (expect exit 1 naming `makeDiagnosticsFeed, makeGatesFeed`) | script exists |
| PROBE-01 | guard is GREEN once probes land | gate | `node scripts/check-package-install.mjs` (exit 0) | ❌ until probes |
| PROBE-02 | gates feed over one instance is `Read`/1, differs from the no-registry feed, follows its registry, releases on close | gate (fixture) | same command | ❌ Wave 1 |
| PROBE-03 | diagnostics feed reaches `Live`, `hydration` set, within a 200-turn cap, scope closed | gate (fixture) | same command | ❌ Wave 1 |
| PROBE-04 | host cache: `miss,hit`, 1 resolve, `size` 1; pre-0.13 literal refused (TS2345 under the directive) | gate (tsc + run) | same command | ❌ Wave 1 |
| PROBE-05 | each deliberate removal/break fails the gate | scratch, recorded not committed | scratch copy under `.scratch/<name>/`, variants as in the removal table; each ~7 s | recorded in SUMMARY |
| WX-01 | `pnpm check:pr < /dev/null` green | full gate | `pnpm check:pr < /dev/null` | — |
| WX-02/03 | reserved ids only; CCR registered; no export change | spec gates | `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:api && pnpm spec:claims` (each seconds) | existing |
| WX-04 | no forbidden construct added | lint | `pnpm lint` (oxlint + house-style) | existing |
| WX-05 | coverage/mutation unaffected | n/a | no `packages/*/src` change; state "not applicable" | — |
| WX-06 | new check shown failing once | scratch RED | the guard commit's own run, plus the removal table | recorded |
| WX-07 | no D-numbers/phase numbers in shipped source | grep | `git diff <base>..HEAD -- scripts/ | grep -nE "D-[0-9]|Phase [0-9]|ARCH-[0-9]"` expect empty for the added lines | — |

### Sampling Rate
- **Per task commit:** `node scripts/check-package-install.mjs` (7.5 s). `check:fast` does not run it.
- **Per wave merge:** the same, plus `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && pnpm spec:api` after the records land.
- **Phase gate:** `pnpm check:pr < /dev/null` green before verify.

### Wave 0 Gaps
- None for infrastructure. The guard's RED run is the Wave 0 evidence (guard commit first). Slow items: gate 14 itself (~7.5 s per run) and `pnpm check:pr` (minutes).

## Security Domain

`security_enforcement` is not disabled; the phase is a build-tooling script plus spec text.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | minimal | the script runs fixed `execFileSync` argument arrays (no shell, no interpolated input); the only dynamic value is the sandbox path the script itself builds |
| V6 Cryptography | no | — |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Command injection via shell string | Tampering | `execFileSync` with an argument array and a constant `-e` program (as the existing script does) |
| Reaching into `node_modules/.pnpm` for a parser | Tampering/Supply chain | use only the declared root `typescript` dependency's published `exports` subpaths |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import ts from "typescript"; ts.createSourceFile` | `typescript/unstable/sync` (spawns the native `tsgo`) | TypeScript 7.0 | No in-process parser; the AST route needs a project on disk, which the sandbox already has |
| `DecisionCacheShape.getOrCompute(question, compute)` | `getOrCompute(question, options?)` (0.13) | ADR-QD-174, 2026-11-19 | The `@ts-expect-error` must use `compute` as an Effect to fail |

## Sources

### Primary (HIGH confidence)
- `scripts/check-package-install.mjs` (read in full) — script structure, `FIXTURE`, `fail`, sandbox
- `packages/devtools/src/model/GatesFeed.ts`, `DiagnosticsFeed.ts`, `DiagnosticsStore.ts`, `Gates.ts`, `index.ts` — feed behaviour, types, exports
- `packages/core/src/DecisionCache.ts`, `Lifecycle.ts`, `SinkRecordFields.ts`, `Policy.ts`, `Matcher.ts` — shapes, `CacheOutcome`, constructors
- `spec/decisions/033-…md`, `174-…md`, `037-…md`; `spec/README.md`; `spec/traceability.md`; `spec/process/definitions-of-done.md`; `scripts/spec-revise.mjs`; `scripts/check-dod-table.mjs`; `spec/scripts/verify-traceability.sh`; `scripts/run-check.mjs`
- `AGENTS.md`, `apps/website/src/content/docs/docs/reference/upgrading.md` (0.13 section)
- `node_modules/typescript/package.json` and `dist/api/sync/api.d.ts`, `dist/ast/is.d.ts`
- Probe runs in a scratch copy of the script this session (outputs quoted above)

### Secondary / Tertiary
- none

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new package; versions read from the installed manifest
- Architecture: HIGH — built and run end to end in a scratch copy, GREEN and RED
- Pitfalls: HIGH — each one hit or measured this session
- Records conventions: MEDIUM-HIGH — formats read from the latest CCR/ADR amendments; the expected revision numbers must be re-read from the files at write time

**Research date:** 2026-11-20
**Valid until:** 2026-12-04 (the `typescript/unstable` API and the catalog range are the moving parts)
