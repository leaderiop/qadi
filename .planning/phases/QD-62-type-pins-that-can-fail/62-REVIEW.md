---
phase: QD-62-type-pins-that-can-fail
reviewed: 2026-11-20T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - AGENTS.md
  - package.json
  - packages/audit/test/AuditPortReply.tst.ts
  - packages/audit/test/AuditWriteOutcome.tst.ts
  - packages/core/test/DecisionCache.tst.ts
  - packages/core/test/DecisionLog.tst.ts
  - packages/core/test/DecisionStream.tst.ts
  - packages/core/test/Explanation.tst.ts
  - packages/core/test/FloatingEffectPins.tst.ts
  - packages/core/test/Matcher.tst.ts
  - packages/core/test/PortAccess.tst.ts
  - packages/core/test/Qadi.tst.ts
  - packages/core/test/WalkEnvironment.tst.ts
  - packages/devtools/test/model/DiagnosticsStore.tst.ts
  - packages/http/test/RequirePermission.tst.ts
  - scripts/check-house-style.mjs
  - scripts/run-tstyche.mjs
  - spec/README.md
  - spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md
  - spec/decisions/175-a-negative-type-pin-can-fail.md
  - spec/decisions/index.yaml
  - spec/process/definitions-of-done.md
  - spec/traceability.md
  - tsconfig.tstyche.json
  - tstyche.json
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
  necessity: 0
status: issues_found
---

# Phase QD-62: Code Review Report

**Reviewed:** 2026-11-20
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

I reviewed the diff since `4cab2e74`. I also ran the gates and probed them on a scratch copy of the repo (the real tree was not touched).

- `node scripts/check-house-style.mjs`: clean. Its walk finds 66 type-test files, the same count as `tstyche --listFiles`.
- `node scripts/run-tstyche.mjs`: both passes green.
- `tsc -p tsconfig.test.json`: clean.

The core design holds. A bare negative pin on an `Effect`-returning subject cannot keep a passing twin, because pass 2 compiles with the rule on and fails the twin. I also tried these inputs against `blankCode` and the pin and twin parse, and each was read correctly or failed closed:
- an interpolation holding a `}` string;
- nested generics and arrow types inside type arguments;
- a pin split across lines;
- a `.skip` in a file with a negative pin.

The budget sums match the ADR's "81 pins in 27 files" (80 outside the characterisation, plus the one `DecisionLog` pin that was rewritten).

I found three gate and spec defects, none blocking:
- the characterisation file's rule-on directive is never exercised;
- the drift check is narrower than the three places that describe it;
- the file walk mirrors tstyche's default file match by hand, with nothing cross-checking it.

The already-accepted `no-control-regex` warning at `run-tstyche.mjs:40` is not repeated.

## Warnings

### WR-01: The in-file `floatingEffect` directive is never exercised, and the docs say it is

**File:** `scripts/run-tstyche.mjs:36-37,119-125`, `packages/core/test/FloatingEffectPins.tst.ts:12-19,55-64`
**Issue:** The "restored by the in-file directive" block is skipped in pass 1 (`RULE_OFF_SKIP`) and runs only in pass 2. Pass 2 already compiles under `tsconfig.test.json` with the rule on, so the `// @effect-diagnostics effect/floatingEffect:error` line is a no-op there. I confirmed by running `tstyche packages/core/test/FloatingEffectPins.tst.ts` with no `--skip`, under `tsconfig.tstyche.json`. All four tests pass, including the restored block. The skip therefore only removes the one place the directive does any work. The docs claim otherwise:
- The file header says "the position-based language-service directive further down turns the rule back on" and "an upgrade that changes either reading turns the file red".
- ADR-QD-175 rejects a second config because "the position-based directive turns the rule back on for the rest of the file under tstyche's TypeScript 6.0.3 and under `pnpm typecheck`'s TypeScript 7".

If the directive stopped working, nothing would go red. The block's title also names a mechanism that is not what it tests. Only the rule-off block needs a skip, and only in pass 2.
**Fix:** Drop `RULE_OFF_SKIP`, its `holders` uniqueness entry and the `--skip` argument in pass 1. Keep only `RULE_ON_SKIP` for pass 2. Pass 1 then proves the directive turns the rule on, and pass 2 proves `tsconfig.test.json` has it on. Update the header, the ADR, AGENTS section 6 and the definitions-of-done (DoD) paragraph, which all say "each block runs once". If the skip is kept on purpose, retitle the block ("with floatingEffect on") and delete the directive and the claims about it.

### WR-02: `[tstyche-plugin-drift]` guards only `compilerOptions.plugins`, but three places say the two compiles differ by one setting

**File:** `scripts/check-house-style.mjs:2519-2557`, `tsconfig.tstyche.json:1-17`, `spec/decisions/175-a-negative-type-pin-can-fail.md` (Consequences)
**Issue:** The `tsconfig.tstyche.json` header says "and nothing else changed". ADR-QD-175 says "the drift check keeps it to one" setting. AGENTS section 6 describes the check the same way. The check compares only the plugin entry, `extends`, and the `tstyche.json` name. I added `"strict": false`, `"exactOptionalPropertyTypes": false` and a narrowed `include` to `tsconfig.tstyche.json` in a scratch copy, and `check-house-style` still printed "560 file(s) clean". A narrowed `include` would be caught later by `run-tstyche`'s "compiled under another project" check. A relaxed compiler option would not be caught. That would make tstyche's negative pins (`exactOptionalPropertyTypes` pins, for example) pass or fail differently from `pnpm typecheck` with no signal.
**Fix:** Assert that the child holds no keys beyond `extends` and `compilerOptions`, and that `compilerOptions` holds only `plugins`:
```js
const childKeys = Object.keys(child).sort().join();
if (childKeys !== "compilerOptions,extends") drift("tsconfig.tstyche.json", `has keys ${childKeys}; only extends and compilerOptions.plugins may differ.`);
if (Object.keys(child.compilerOptions ?? {}).join() !== "plugins") drift("tsconfig.tstyche.json", "compilerOptions may hold only plugins.");
```
Or soften the three claims to "the plugin entry".

### WR-03: `TYPE_TEST_FILE` hand-mirrors tstyche's default `testFileMatch`, and nothing detects the two diverging

**File:** `scripts/check-house-style.mjs:706-709,2304-2325`
**Issue:** The budget, the twin check and the table check all count only files from the gate's own walk. The comment says the guard against drift is "`[not-callable-pin]` fails if `tstyche.json` sets `testFileMatch`". That covers a config change. It does not cover a tstyche upgrade changing its default (`testFileMatch` is in `api.js` at `["**/*.tst.*", "**/__typetests__/*.test.*", "**/typetests/*.test.*"]` today, and `package.json` allows `^7.2.5`). A file tstyche selects and the walk misses has an uncounted, unchecked negative pin. The only guard is the "walk found zero files" check. `run-tstyche.mjs` already calls `--listFiles` and holds the selected list, but it never compares that list to the gate's walk.
**Fix:** Have `run-tstyche.mjs` fail if `selected` is not exactly the set of `.tst.*` files it finds with the same rules. Alternatively, export the walk from a shared module and compare the two sets there. Or have the gate shell out to `tstyche --listFiles` for its file list instead of mirroring the glob.

## Info

### IN-01: The twin check vouches per subject, not per refused argument

**File:** `scripts/check-house-style.mjs:2430-2441`
**Issue:** The key is `form kind subject`, so one positive twin covers every negative on that subject. `DiagnosticsStore.tst.ts` has three negatives (`questions`, `schedule`, `layer`) and one twin (`{ intervalMillis: 500 }`) that is valid for none of those arguments. The ADR admits this ("reviewed by hand"). A negative that refuses for the wrong reason, such as a missing required property instead of the excess property it names, still passes the gate.
**Fix:** None required. If wanted, key the twin on the subject plus the negative's test title, or name the twin in a comment on the negative pin and check that the name resolves.

### IN-02: `pnpm test:tstyche <path>` now ignores its arguments

**File:** `scripts/run-tstyche.mjs:46-51,119-125`
**Issue:** The old script was bare `tstyche`, so `pnpm test:tstyche packages/x/test/Foo.tst.ts` filtered to one file. The wrapper builds fixed argument lists and never reads `process.argv`, so every invocation runs all 66 files twice and silently drops any filter.
**Fix:** Append `process.argv.slice(2)` to both argument lists. Keep the `--skip` texts as they are.

### IN-03: Smaller robustness gaps in the new gate code

**File:** `scripts/check-house-style.mjs:2310,2352-2376`
**Issue:** There are two small gaps:
- `tstyche.json` is read here with a bare `JSON.parse`, while the drift block reads the same file through `readJsonc`. A comment added to `tstyche.json` would crash `[not-callable-pin]` with an uncaught `SyntaxError`.
- A row listed twice in AGENTS section 6's table overwrites silently in `listed.set(...)`, so a duplicated or stale row passes `[not-callable-pin-table]`.
**Fix:** Use `readJsonc("tstyche.json")` in both places. In the row loop, fail when `listed.has(m[1])`.

### IN-04: `CHARACTERISATION` path is declared in two scripts

**File:** `scripts/check-house-style.mjs:2397`, `scripts/run-tstyche.mjs:33`
**Issue:** The path `packages/core/test/FloatingEffectPins.tst.ts` is a separate constant in each script, plus a budget key. A rename already fails loudly in both scripts, so this is only duplication. It is the same fact stated three times, which this repo's own rules discourage.
**Fix:** Move the path into `scripts/lib/` (next to `raw-decision-read.mjs`) and import it in both scripts.

---

_Reviewed: 2026-11-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
