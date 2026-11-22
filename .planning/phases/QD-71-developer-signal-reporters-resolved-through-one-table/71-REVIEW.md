---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
reviewed: 2026-11-22T20:10:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - packages/react/src/DeveloperSignals.ts
  - packages/react/src/GateWriter.ts
  - packages/react/src/GateRegistry.ts
  - packages/react/src/QadiAtoms.ts
  - packages/react/src/QadiProvider.tsx
  - packages/react/src/HydrationEngine.ts
  - packages/react/test/DeveloperSignalReporters.test.tsx
  - packages/react/test/DeveloperSignals.test.ts
  - packages/react/test/DeveloperSignals.tst.ts
  - packages/react/test/GateRegistry.store.test.ts
  - packages/react/test/support/reporterThrew.ts
  - scripts/check-house-style.mjs
  - scripts/lib/module-state-scan.mjs
  - AGENTS.md
  - .changeset/react-reporter-option-names.md
  - spec/decisions/184-developer-signal-reporters-are-resolved-through-one-table.md
  - spec/decisions/041-a-mismatch-is-announced.md
  - spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md
  - spec/invariants.md
  - spec/behaviors/09-react.md
  - spec/behaviors/19-hydration.md
  - spec/behaviors/28-devtools-screens.md
  - spec/process/house-rules-evidence.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
  necessity: 1
status: issues_found
---

# Phase QD-71: Code Review Report (iteration 2)

**Reviewed:** 2026-11-22T20:10:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

All 13 iteration-1 fixes are in place and correct. I checked each against source:

- `holdsHere`, `CONDITIONS`, `unconditionally` and `defaultOf` are sound. There is no `as`, `!`, `any` or `switch`. `CONDITIONS` is total over `Gated`, so a well-typed row always has an entry. `holdsHere`, `reporterFor` and `defaultOf` take only a `Gated` row, so a row that speaks everywhere cannot reach the lookup at run time. The one non-table caller, `providerSignalReporter`, indexes only the three provider rows, and all three are `Gated`.
- The doc comments on those four match what the compiler enforces.
- Removing the older re-check probe from `DeveloperSignals.test.ts` lost no coverage. The characterisation's "a throwing onHydrationMismatch is named in development/production, and the re-check and the mismatch are counted" does the same work in both environments. It asserts `lines`, `settled` is a `Deny`, `rechecks` is 1 and `mismatches` is 1.
- Every link to INV-QD-388's new anchor resolves: `spec/invariants.md` (INV-QD-387 Related), `spec/traceability.md` rows 211 and 383, and `spec/behaviors/09-react.md` BEH-QD-694. I ran a slug check over every `invariants.md#...` link under `spec/`, `AGENTS.md` and `packages/`. The other anchors in INV-QD-064, 251, 387 and 388 resolve. The only unresolved ones are in untouched files and look like slug-rule differences in my checker. AGENTS.md and the source comments carry no anchor link.
- Every revision CCR-QD-463's row cites equals its document's header: ADR-184 1.1, ADR-041 1.7, ADR-052 1.5, 09-react 3.12, 28-devtools-screens 1.40, 19-hydration 1.29, invariants 1.175, house-rules-evidence 1.5, traceability 1.247, README 1.287.
- No `makeOwnedGateRegistry`, `isDevelopment` export or removed resolver is referenced from live source or tests. The ADR hits are history.
- `buildGateRegistry`'s `snapshot ??=` and `current` changes are behaviourally equivalent to the closure they replaced. `update` after `unregister` is guarded by `live`, as before.

On the scan, I ran `module-state-scan.mjs` on a scratch project with 15 cases. Counted as intended: `export let a, b`, `var` in a bare block, a loop `let`, a destructured `let { x, ...rest }`, a `let` in `namespace M`, `let` in `if`, `try` and labelled blocks. Left out as intended: `declare let`, `declare namespace`, the `const` destructuring, a static block, method and arrow bodies, a function expression and object-literal getters and methods. It fails closed. A missing API, a failed load, empty output or a missing `bindings` key all end in the parent's `catch`, which counts a failure. A file outside every `tsconfig.src.json` is a separate failure. The gate takes about 1.3 s here.

`typescript` is 7.0.2, whose only JS parse is `typescript/unstable/sync`. No lighter parser is installed as a direct dependency: `typescript@5.9.3` and `@typescript-eslint/typescript-estree` exist only in the pnpm store as transitive dependencies, and `esbuild` yields no AST. A child process under a timeout is the right shape, and it matches `probe-guard-parse.mjs`. Two parts of that precedent were not carried over (WR-01, WR-02).

## Warnings

### WR-01: A timed-out scan leaves its TypeScript server running

**File:** `scripts/check-house-style.mjs:1821-1826`, `scripts/lib/module-state-scan.mjs:21-24`
**Issue:** The scan's header says the TypeScript server "has no timeout of its own" and that "the parent kills it". `execFileSync` kills only the Node child, with SIGTERM. The server is that child's own process. `probe-guard-parse.mjs:80-87` says why this matters: the server "works on a request without reading its pipe, so a kill of this process does not end it". The precedent therefore names the server's pids on stderr (`pgrep -P`), and `check-package-install.mjs:941-951` kills them with SIGKILL. That is CCR-QD-460's fix (README Rev 1.277 and 1.278). The new scan starts the same server under the same timeout and drops both halves. A hung request leaves an orphan `tsgo` per `pnpm check` run, and the gate cannot know it.
**Fix:** Mirror the precedent, or move the child-and-kill logic into one shared helper in `scripts/lib/` so the two callers cannot drift. In the scan, after `new API(...)`:
```js
try {
  const servers = execFileSync("pgrep", ["-P", String(process.pid)], { encoding: "utf8", timeout: 10_000 }).trim();
  process.stderr.write(`server pids: ${servers.split(/\s+/).join(" ")}\n`);
} catch {
  // no `pgrep`, or no child yet: nothing to name
}
```
In the parent's `catch`, when `typeof error.signal === "string"`, SIGKILL each pid from `/^server pids: (.+)$/m.exec(error.stderr ?? "")`.

### WR-02: A failed scan reports a command line, not its cause

**File:** `scripts/check-house-style.mjs:1840-1845`
**Issue:** The `catch` prints `String(error).split("\n")[0]`. For an `execFileSync` failure, that first line is `Error: Command failed: <node> <script> <root> <every library file>`. About 238 files makes a line of roughly 23 KB. The cause is the child's stderr, which is not in that line. It is only forwarded, unlabelled, by the inherited stdio, before the message. I confirmed the shape with a child that exits 1 and writes a cause to stderr. A timeout reads `spawnSync … ETIMEDOUT`, with no mention of the 120 000 ms bound. Neither case names the installed TypeScript or says the unstable API may have moved, which the precedent does (`check-package-install.mjs:934-939`, `why()` at line 95). A reader of a red gate sees a wall of paths and has to guess whether the API moved, the server hung or a project failed to load.
**Fix:** Build the message from the error's fields, not its first line:
```js
const why =
  error.code === "ETIMEDOUT"
    ? `timed out after ${MODULE_STATE_SCAN_TIMEOUT_MS} ms`
    : (error.stderr || error.message.split("\n")[0].slice(0, 200));
console.error(
  `scripts/lib/module-state-scan.mjs  [module-state-scan] could not read library source ` +
    `with typescript@${version}'s unstable API: ${why}`,
);
```
Read `version` from `node_modules/typescript/package.json` as the precedent does.

## Info

### IN-01: The environment swap is written three times, and `said` twice, in the tests this phase wrote

**File:** `packages/react/test/DeveloperSignals.test.ts:60-69`, `packages/react/test/DeveloperSignalReporters.test.tsx:63-72`, `packages/react/test/GateRegistry.store.test.ts:279-294`
**Issue:** `withEnvironment` and `inEnvironment` are the same function in two files. `collide` inlines it a third time with its own `console.warn` spy. Each file also keeps its own `said` or `saidOnly` spy. None of these is in the base commit, so they are new this phase. IN-06 of iteration 1 collapsed `threw` into `test/support/` and left these. The pattern also exists in older tests, but those predate the phase.
**Fix:** Put `inEnvironment(environment, act)` and `said(act)` in `packages/react/test/support/environment.ts`, beside `reporterThrew.ts`, and import them from the three files.

### IN-02: `maxBuffer: 1 << 26` is an unexplained 64 MiB bound the scan cannot approach

**Category:** necessity
**File:** `scripts/check-house-style.mjs:1824`
**Issue:** The child prints one line of JSON holding only the files that declare a `let` or `var`. Today that is one file with one binding, a few hundred bytes. Node's default `maxBuffer` for `execFileSync` is 1 MiB, and the repo would have to hold thousands of bindings to reach it. The option guards a state that cannot occur in this repo and carries no comment. Evidence: `MODULE_STATE_BUDGET` lists one file with count 1, and the gate passes with no other file in `MODULE_STATE_FOUND`. If a larger output is ever possible, the failure is `ENOBUFS`, which WR-02's message would then name.
**Fix:** Delete the `maxBuffer` line.

### IN-03: Lines the phase wrote past the width the codebase keeps

**File:** `AGENTS.md:580`, `scripts/check-house-style.mjs:1891`, `1902`, `1907`, `1912`
**Issue:** `AGENTS.md:580` is 117 columns, and it is a join of two sentences into one line ("... (`[module-state-table]`). Test scope is exempt. A new row is a reviewed edit to the budget"). The wrap above it is 80-90 columns, so this reads as a broken rewrap. The four check lines are 106 to 130 columns. They mirror the untrusted-decode block at `:1800`, which is itself 129 columns, so the script lines follow precedent and the AGENTS.md line does not. The iteration-1 fix wrapped every other phase-added line.
**Fix:** Rewrap `AGENTS.md:577-581` at the surrounding width. Optionally wrap the four `console.error` calls like the `[module-state]` ones above them.

### IN-04: The scan skips `declare`d bindings, and no spec text says so

**File:** `scripts/lib/module-state-scan.mjs:62-66`, `AGENTS.md:567-584`, `spec/decisions/184-developer-signal-reporters-are-resolved-through-one-table.md` (Consequences), `spec/invariants.md` (INV-QD-388 Enforcement)
**Issue:** The scan's header and comments say what it counts and omits, and they name `declare`d bindings as omitted. AGENTS.md section 6, ADR-QD-184 and INV-QD-388 each say "every `let` or `var` binding ... outside a function or class body" and list the exclusions (`const`, `static` field, function-declared). None lists `declare`. In library source a `declare let` states a type for a global and holds no module state, so the behaviour is right and the three statements are short of exact. The scan's own header also never says that a `let` in a `namespace` body counts, which I confirmed it does.
**Fix:** Add "and no `declare`d binding" to the exclusion lists in AGENTS.md section 6, ADR-QD-184's Consequences and INV-QD-388's Enforcement. Bump those revisions through `scripts/spec-revise.mjs`.

---

_Reviewed: 2026-11-22T20:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
