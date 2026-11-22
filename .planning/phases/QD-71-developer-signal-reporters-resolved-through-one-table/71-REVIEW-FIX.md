---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
fixed_at: 2026-11-22T21:00:00Z
review_path: .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-REVIEW.md
iteration: 2
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase QD-71: Code Review Fix Report (iteration 2)

**Fixed at:** 2026-11-22T21:00:00Z
**Source review:** .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 6 (fix scope `all`)
- Fixed: 6
- Skipped: 0

Edits and commits ran in the main checkout: `workflow.use_worktrees` is `false`.

## Fixed Issues

### WR-01: A timed-out scan leaves its TypeScript server running

**Files modified:** `scripts/lib/typescript-server-child.mjs` (new), `scripts/lib/probe-guard-parse.mjs`, `scripts/lib/module-state-scan.mjs`, `scripts/check-package-install.mjs`, `scripts/check-house-style.mjs`, `spec/decisions/033-the-packed-artifact-is-the-product.md` (Rev 1.9)
**Commit:** c67231d8
**Applied fix:** Per the owner's direction the precedent's machinery is extracted, not copied. `scripts/lib/typescript-server-child.mjs` exports `nameServerPids()` (child side: `pgrep -P`, writes `server pids: …` to stderr), `runTypescriptChild(script, args, { cwd, timeoutMs })` (parent side: `execFileSync` with `stdio: "pipe"`, and on a signal-killed child it SIGKILLs the pids named on stderr, then rethrows), `failureCause(error, timeoutMs)` (the old `why()`) and `installedTypescriptVersion(root)`. `probe-guard-parse.mjs` and the new `module-state-scan.mjs` call `nameServerPids()` after `new API(...)`; `check-package-install.mjs` (`why` is now a one-line delegate, the probe-guard call and its inline kill loop are replaced) and `check-house-style.mjs` both call `runTypescriptChild`. Both gates still fail closed. ADR-QD-033's CCR-QD-460 amendment gained a paragraph saying the start, kill and failure text are one module shared with the scan, so the text stays accurate; CCR-QD-460's own row is history and is unchanged.

### WR-02: A failed scan reports a command line, not its cause

**Files modified:** same commit as WR-01 (`scripts/check-house-style.mjs`, `scripts/lib/typescript-server-child.mjs`)
**Commit:** c67231d8
**Applied fix:** The scan's `catch` now prints `could not read library source with typescript@<installed>'s unstable API, which a TypeScript upgrade can move: <cause>`, where the cause is `failureCause`: `timed out after <bound> ms` (or `killed by <signal>`), then the child's stdout and stderr (the `server pids:` line is stripped), falling back to the error's message. `installedTypescriptVersion` returns `"not installed"` rather than throwing, so naming the version cannot itself fail.

### IN-01: The environment swap is written three times, and `said` twice

**Files modified:** `packages/react/test/support/environment.ts` (new), `packages/react/test/DeveloperSignals.test.ts`, `packages/react/test/DeveloperSignalReporters.test.tsx`, `packages/react/test/GateRegistry.store.test.ts`
**Commit:** 721ccf7e
**Applied fix:** `Environment`, `environments`, `inEnvironment` and `said` live in `support/environment.ts` beside `reporterThrew.ts`. All three files import them. `GateRegistry.store.test.ts`'s `collide` is now `inEnvironment` plus `said`, and `DeveloperSignals.test.ts`'s `useProduction` (a fourth copy of the swap, three call sites) became `inEnvironment("production", …)`; its local partial application, which would have shadowed the import, is renamed `here`. `saidOnly` in the store test is an assertion helper, not a spy, and stays.

### IN-02: `maxBuffer: 1 << 26` is an unexplained 64 MiB bound

**Files modified:** `scripts/check-house-style.mjs`
**Commit:** c67231d8
**Applied fix:** Deleted. The shared module passes no `maxBuffer` (Node's default); an overflow would surface as `ENOBUFS` through `failureCause`'s message fallback.

### IN-03: Lines the phase wrote past the width the codebase keeps

**Files modified:** `AGENTS.md`, `scripts/check-house-style.mjs`
**Commits:** b87e59fb (AGENTS.md), c67231d8 (the script's lines, which sit in the file commit WR-01/WR-02 edits)
**Applied fix:** AGENTS.md section 6's module-state paragraph is rewrapped at the surrounding width (the joined sentence is split again). The four `[module-state-table]` `console.error` calls and the header-row `findIndex` are wrapped like the `[module-state]` ones above them.

### IN-04: The scan skips `declare`d bindings, and no spec text says so

**Files modified:** `AGENTS.md` (section 6), `spec/decisions/184-developer-signal-reporters-are-resolved-through-one-table.md` (Rev 1.2), `spec/invariants.md` (Rev 1.176, INV-QD-388 Enforcement), `spec/README.md` (Rev 1.288, CCR-QD-463's row), `scripts/lib/module-state-scan.mjs` and `scripts/check-house-style.mjs` (comments)
**Commits:** b87e59fb (docs), c67231d8 (script comments)
**Applied fix:** Each of the three statements lists "no `declare`d binding" among the exclusions with the reason: it states a type for a global and declares no runtime binding of the module. The scan's header also now says a `let` in a `namespace` body counts. Revisions bumped only through `scripts/spec-revise.mjs --date 2026-11-22`; CCR-QD-463's row cites ADR-184 1.2, invariants 1.176, ADR-033 1.9 (added), README 1.288, and lists the new shared module, `check-package-install.mjs`, `probe-guard-parse.mjs` and `support/environment.ts`. No id was invented.

## Failure path, shown (scratch edits, all reverted, none committed)

Server process in this install: `.../@typescript/typescript-darwin-arm64/lib/tsc --api --cwd <repo>`. `ps` below filtered on that command line.

**Forced timeout** (`MODULE_STATE_SCAN_TIMEOUT_MS` set to 1000, and in a second run a `while (true) {}` placed after `nameServerPids()`, bound 3000):

```
scripts/lib/module-state-scan.mjs  [module-state-scan] could not read library source with typescript@7.0.2's unstable API, which a TypeScript upgrade can move: timed out after 1000 ms
scripts/lib/module-state-scan.mjs  [module-state-scan] could not read library source with typescript@7.0.2's unstable API, which a TypeScript upgrade can move: timed out after 3000 ms
```
The gate exited 1 both times, and `ps` after one second showed no `tsc --api` process and no `module-state-scan` process.

**Missing API** (scratch: `API` read as `Api.renamedInANewRelease`):

```
scripts/lib/module-state-scan.mjs  [module-state-scan] could not read library source with typescript@7.0.2's unstable API, which a TypeScript upgrade can move: TypeError: API is not a constructor
```
Gate exit 1, no `tsc --api` process left. (The `[module-state] ... found 0` line that follows is the budget check running over an empty scan, as before.)

**Limit of that evidence, stated plainly:** this scan's request lasts about 0.5 s, and with the kill deliberately disabled no server survived a timed-out scan at any bound I tried (350 to 750 ms, and the 120 000 ms bound's behaviour is the same code path). The server only outlives its child when it is busy on a long request, which is what CCR-QD-460 saw with a 1,500-file project. So the real server cannot demonstrate that the kill matters for this scan today. What proves the kill code is a stand-in: a child that starts `sleep 300`, names its pid through `nameServerPids()` and then spins, run through `runTypescriptChild` at 1500 ms. With the shared module, no `sleep 300` survived (`ps`: 0). With the `process.kill` line disabled in a scratch copy, one survived (`ps`: 1). Failure text for that child: `timed out after 1500 ms`.

## Verification

Run in the main checkout (not a worktree), after the edits:

- `npx vitest run --project react`: 37 files, 625 tests pass.
- `pnpm typecheck`: clean. `pnpm test:tstyche`: 68 files pass.
- `node scripts/check-house-style.mjs`: clean (569 files). `node scripts/check-doc-examples.mjs`: 118 blocks compile. `node scripts/check-api-surface.mjs`: 941 exports.
- `pnpm exec oxlint` on every touched file: only the one pre-existing `prefer-string-starts-ends-with` warning at `scripts/check-house-style.mjs:1090`, not from this phase.
- `node scripts/spec-revise.mjs --check`: every Revision matches.
- `bash spec/scripts/verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0.
- `node scripts/check-package-install.mjs` (the full gate, run to completion, exit 0): "9 package(s) pack, resolve and authorize (526 runtime export(s))". It runs the probe-guard child through the new shared module, so the extraction is exercised end to end, not only by the scan.

## Notes for the caller

- Mutation: no change to `DeveloperSignals.ts`, `GateRegistry.ts`, `GateWriter.ts`, `QadiAtoms.ts` or `HydrationEngine.ts`; `71-mutation-*.json` and `71-mutation.mjs` untouched. The only test-side change is moving helpers, which adds no mutant.
- IN-02 and IN-03's script edits are in the WR-01/WR-02 commit because they are edits to the same two files; the findings list them under their own ids above.
- Staged nothing of `.planning/config.json`, `.agents/`, `.codex/`, `.planning/state.json` or `*.iter*.md`. REVIEW-FIX.md is not committed.

---

_Fixed: 2026-11-22T21:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
