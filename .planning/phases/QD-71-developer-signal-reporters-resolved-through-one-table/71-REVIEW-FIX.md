---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
fixed_at: 2026-11-22T23:00:00Z
review_path: .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-REVIEW.md
iteration: 3
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase QD-71: Code Review Fix Report

**Fixed at:** 2026-11-22T23:00:00Z
**Source review:** .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), on branch
`arch-wave-13`, so every number below is reproducible from the tree you are looking at.

## Fixed Issues

### WR-01: The module-state scan crashes on a destructuring pattern with a hole

**Files modified:** `scripts/lib/module-state-scan.mjs`
**Commit:** d56a188f
**Applied fix:** `namesOf` skips an element whose `name` is `undefined`, which is what typescript
7.0.2 makes of a hole in an array pattern (a `BindingElement`, kind 209, with no `name`). I
confirmed that shape first by walking the real syntax tree of a scratch project: every hole printed
as `BindingElement:none`, and `OmittedExpression` (233) never occurred in a binding pattern. The dead
`OmittedExpression` branch is gone, and a doc comment states the real shape.

Scratch project (outside the repo, never committed) with `var [e, , f]`,
`let { c, d: [g, , h = 4, ...rest], k = 1 }`, `let [[x, , y], , { z }]` and
`const [skipped, , alsoSkipped]`:

- Before: `TypeError: Cannot read properties of undefined (reading 'kind')`, exit 1.
- After: exit 0, 10 bindings: `e f` (line 2), `c g h rest k` (line 3), `x y z` (line 4). So
  `var [e, , f]` counts 2, nested destructuring with holes and defaults counts each name, and the
  `const` pattern counts none.

Logic fix, so it is flagged for the owner: fixed: requires human verification (the scratch run above
is the evidence).

### IN-01: Three test bodies lost their indentation when the environment swap was extracted

**Files modified:** `packages/react/test/DeveloperSignals.test.ts`
**Commit:** 7f211024
**Applied fix:** The three bodies (InstrumentedInProduction, the four hydration defaults, the two
development-only signals) are indented one level under their `inEnvironment(...)` wrapper.
`git diff -w` on the file is empty, so the change is whitespace only; the file's 43 tests pass.

### IN-02: Lines the phase wrote, or reflowed, run far past the codebase's width

**Files modified:** `scripts/lib/typescript-server-child.mjs`, `scripts/lib/probe-guard-parse.mjs`,
`scripts/check-package-install.mjs`
**Commit:** 44e61bb8
**Applied fix:** Shared module: the 101-column `@param` type is broken over lines, and the 110-column
`JSON.parse` statement is split through a `manifest` local, as the review suggested. Probe-guard
header re-flowed at about 90 columns (the longest line is 92, from the `{"typed":…}` literal; the
usage line at 93 was there before). `check-package-install.mjs`: header sentence re-flowed (the
parse, then the child it runs in, then the failure), and the import split over four lines. I left
`CHILD_TIMEOUT_MS`'s comment alone: the review did not flag it.

### IN-03: The server-pid behaviour is explained three times in `probe-guard-parse.mjs`, with a dangling referent

**Files modified:** `scripts/lib/probe-guard-parse.mjs`
**Commit:** 44e61bb8 (the header was one rewrite for IN-02 and IN-03, so they share a commit)
**Applied fix:** The header now ends the sentence at "writes `server pids: <pid>…` to stderr once
the `API` has started its server (`nameServerPids`)", with no dangling "which that module does", and
the inline comment above `nameServerPids()` is dropped. The reasoning lives once, in the shared
module's header.

### IN-04: ADR-QD-033 Rev 1.9 overstates what the failure text never contains, and its Status is stale

**Files modified:** `scripts/lib/typescript-server-child.mjs`, `spec/decisions/033-the-packed-artifact-is-the-product.md`,
`spec/decisions/index.yaml`, `spec/README.md`
**Commit:** 9aab7715
**Applied fix:**
- `failureCause` no longer falls back to `error.message` (which is the command line). A child that
  printed nothing and was not killed now reads `exited with status <n>`. The review's one-liner would
  print `exited with status null` for a child that never started (`error.status` is `null` there as
  well as on a signal), so the fallback is `exited with status <n>` when `status` is a number and
  `did not run: <code>` otherwise. `status` is added to the `@param` type.
- ADR-QD-033 now says both gates print the installed TypeScript first and the cause after it
  (`…typescript@X's unstable API, which a TypeScript upgrade can move: <cause>`), the cause being the
  timeout and its bound or the signal, then the child's own output, then the exit status for a child
  that printed nothing, "never the command line". Revised through
  `node scripts/spec-revise.mjs --date 2026-11-22`: Rev 1.9 -> 1.10. Its Status date is corrected to
  2026-11-22, in `index.yaml` too, since it mirrors the document.
- `spec/README.md`'s CCR-QD-463 row now cites ADR-QD-033 Rev 1.10 and README Rev 1.289, and README's
  own Revision went 1.288 -> 1.289 through the same script. I checked all eleven revisions in the row
  against each document's header: 184 1.2, 041 1.7, 052 1.5, 033 1.10, 09-react 3.12,
  28-devtools-screens 1.40, 19-hydration 1.29, invariants 1.176, house-rules-evidence 1.5,
  traceability 1.247, README 1.289.

The non-zero-exit path, on scratch children outside the repo, through the real
`runTypescriptChild` and `failureCause`:
- a child that does `process.exit(3)` with no output: `"exited with status 3"`;
- a child that cannot start (`cwd` missing): `"did not run: ENOENT"`;
- before, the first of these read `Command failed: /…/node /…/quiet.mjs a b`.

## Verification

All in the main checkout, one runner at a time, stdin closed:

- `pnpm exec vitest run --project react`: 37 files, 625 tests passed
- `pnpm typecheck`: clean
- `pnpm test:tstyche`: 366 passed, 2 skipped
- `node scripts/check-house-style.mjs`: 569 files clean
- `node scripts/check-doc-examples.mjs`: 118 blocks compile
- `node scripts/check-api-surface.mjs`: 941 exports documented
- `node scripts/check-dod-table.mjs`: 26 steps match
- `node scripts/spec-revise.mjs --check`: every Revision matches
- `bash spec/scripts/verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0
- `node scripts/check-package-install.mjs`: 9 packages pack, resolve and authorize (526 runtime exports)
- `pnpm exec oxlint` on every touched file: no finding on a line this iteration touched. One
  `prefer-string-starts-ends-with` warning remains at `scripts/check-house-style.mjs:1090`, in a
  line from an earlier commit this iteration did not touch.

Not touched: `packages/react/src/*`, `71-mutation-*.json`, `71-mutation.mjs`, REQUIREMENTS.md,
`.planning/config.json`, `.agents/`, `.codex/`, `.planning/state.json`, `*.iter*.md`. No plant or
scratch file was committed; the scratch scan project and child scripts live in the session scratchpad.

---

_Fixed: 2026-11-22T23:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
