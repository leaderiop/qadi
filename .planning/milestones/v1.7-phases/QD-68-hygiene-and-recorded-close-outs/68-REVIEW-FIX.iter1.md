---
phase: QD-68-hygiene-and-recorded-close-outs
fixed_at: 2026-11-21T00:00:00Z
review_path: .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase QD-68: Code Review Fix Report

**Fixed at:** 2026-11-21
**Source review:** `.planning/phases/QD-68-hygiene-and-recorded-close-outs/68-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03; the review has no Critical finding)
- Fixed: 3
- Skipped: 0

The four Info findings (IN-01 to IN-04) are out of scope for `critical_warning` and stay in REVIEW.md.

## Fixed Issues

### WR-01: A timed-out child in the packed-install guard reports a blank cause

**Files modified:** `scripts/check-package-install.mjs`
**Commit:** 5d44982d
**Applied fix:** One `why(error)` helper, used at all six `execFileSync` catch sites (the build, the import probe, the entry-point probe, the consumer's compile, its run and the feed-export read). It prints `timed out after <CHILD_TIMEOUT_MS> ms` for `ETIMEDOUT`, `killed by <signal>` for a signal, then any stdout and stderr, and falls back to `error.message` only when all of that is empty. The `??` that let an empty string through is gone.

**Evidence.** A planted child in scratch (`node -e "setInterval(...)"`, timeout 300 ms, the helper extracted from the real file):

```
old, hung   : ""
new, hung   : "timed out after 300 ms"
new, failing: "boom\n"
new, killed : "killed by SIGKILL"
```

The gate on the real tree, run once, alone, in the foreground (`node scripts/check-package-install.mjs < /dev/null`), exits 0: `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`.

### WR-02: "Every child process the gate starts has a timeout" is not true

**Files modified:** `scripts/check-package-install.mjs`, `spec/decisions/033-the-packed-artifact-is-the-product.md`, `spec/traceability.md`, `spec/README.md`
**Commit:** 8c3375fb
**Applied fix:** The text route, not the code route. The `API` from `typescript/unstable/sync` spawns the TypeScript server itself (`node_modules/typescript/dist/api/syncChannel.js`, `spawn(...)`), blocks on it with `Atomics.wait`, and takes no timeout option. Bounding it would mean moving the whole parse into an `execFileSync` child, which is not small. So every text now claims only what holds:

- ADR-QD-033's Amendment says "every `execFileSync` child has a timeout", that a killed one reports its cause, and names the one child without a timeout, the TypeScript server behind `API`. Bumped 1.3 to 1.4 (ARCH-115, CCR-QD-459).
- `spec/traceability.md`'s ADR-QD-033 row says the same in short. Bumped 1.235 to 1.236.
- The CCR-QD-459 row in `spec/README.md` says the same and names the exception. Bumped 1.273 to 1.274. The row's cited revisions for ADR-QD-033 (Rev 1.4), `spec/traceability.md` (Rev 1.236) and `spec/README.md` (Rev 1.274) were then re-aligned to current.
- `CHILD_TIMEOUT_MS`'s comment in the script says "each `execFileSync` child" and names the `API` child.

**Evidence.** `ccr-row.mjs 3d66becb...` prints `ccr-row: 11 document(s) cited at their current Revision`; `node scripts/spec-revise.mjs --check` prints `every Revision matches its newest Change History entry`; `bash spec/scripts/verify-traceability.sh --strict` prints `PASS: 21   FAIL: 0   SKIP: 0`. `check-house-style.mjs` and `check-dod-table.mjs` are also clean.

### WR-03: `analyze.mjs` accepts any two labels, so a swapped or equal pair gives a false pass

**Files modified:** `scripts/bench/analyze.mjs`
**Commit:** 7aa1150b
**Applied fix:** `readMeta(text, where, refLabel, candLabel)` replaces the inline `rounds:` read in `main`. It keeps the rounds checks and now refuses the same label twice, a `meta.txt` with no `head_label:` or `patched_label:` line, and a label that is neither of the two. The run files are read by those labels, so a label with no run files was already refused (`missing run file`). Which label is the reference stays the caller's, since Phase 68's own record has the patched arm as the reference; so a swapped pair, which names two real arms, is allowed and not refused. The header says so.

Self-test: 14 cases became 21. New: five refusals (same label twice, a candidate that is no arm, a reference that is no arm, no arm lines, two rounds) and the two arm orders reading back 3 rounds. With the label checks cut from a scratch copy, `--self-test` fails (`the same label twice is refused: nothing was refused`, exit 1); with the fix it prints `self-test: 21 passed`.

**Bench record unchanged.** Re-running `node scripts/bench/analyze.mjs <bench>/final base final <bench>/workloads.txt` on the committed `bench/final` rewrote `analysis.tsv` byte for byte (SHA-256 `c23e42fd...bb75` before and after, `cmp` identical), and `git status` over the `bench` directory is clean. On a scratch copy, `base base` exits 2 (`the reference and candidate label are both base`) and `base other` exits 2 (`other is not an arm of ... (final and base)`).

## Skipped Issues

None.

## After this fix

Three files cited by the re-verified phases changed (`scripts/check-package-install.mjs`, `scripts/bench/analyze.mjs`, and the spec documents), so `68-stale.mjs` now prints `redo: 62 63 64 65 66 67`. 68-15's "After the sweep" procedure applies and was not run here: it is the orchestrator's step after the review's fixes. No `packages/*/src`, bench or `package.json` file changed. `scripts/next-id.mjs` was not run.

**Verification ran** in the main checkout (`workflow.use_worktrees` is `false`), on the real tree.

---

_Fixed: 2026-11-21_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
