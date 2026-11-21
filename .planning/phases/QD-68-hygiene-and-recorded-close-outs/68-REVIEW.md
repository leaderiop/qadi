---
phase: QD-68-hygiene-and-recorded-close-outs
reviewed: 2026-11-21T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - scripts/check-package-install.mjs
  - scripts/bench/analyze.mjs
  - spec/decisions/033-the-packed-artifact-is-the-product.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
status: issues_found
---

# Phase QD-68: Code Review Report (iteration 2)

**Reviewed:** 2026-11-21
**Depth:** standard
**Files Reviewed:** 5 (the fix commits `5d44982d`, `8c3375fb`, `7aa1150b`)
**Status:** issues_found (the four carried-forward Info items only; no new finding)

## Summary

All three iteration-1 Warnings are resolved, and the fixes introduce no new defect. `necessity-review.md` was not loaded, so no necessity assessment was made and `necessity:` is omitted.

**WR-01 resolved.**
- `why(error)` in `scripts/check-package-install.mjs` replaces `??` at all six `execFileSync` catch sites (build, import probe, entry-point probe, compile, run, feed-export read).
- I extracted the helper from the real file and drove it with real children:
  - a hung child prints `timed out after 300 ms`;
  - a `SIGKILL`ed child prints `killed by SIGKILL`;
  - a failing child prints its stdout and stderr (`o\n\ne\n`).
- A passing run never reaches a catch, so gate 14 behaves as before. The diff touches only the catch bodies and a comment.
- `pnpm pack` and `tar` stay uncaught; their thrown error carries `ETIMEDOUT`. That matches the texts.

**WR-02 resolved.**
- Every `execFileSync` call in the script (lines 200, 218, 235, 352, 439, 828, 879, 900) carries `timeout: CHILD_TIMEOUT_MS`. The only other child is the `API` server at line 972, and each text now says so.
- ADR-QD-033 (Rev 1.4), the `spec/traceability.md` row (Rev 1.236), the CCR-QD-459 row in `spec/README.md` (Rev 1.274) and the `CHILD_TIMEOUT_MS` comment all say the same thing. They claim "every `execFileSync` child" and name the TypeScript server as the exception.
- The CCR row cites ADR-QD-033 Rev 1.4, traceability Rev 1.236 and README Rev 1.274, each equal to its document's current Revision.
- `node scripts/spec-revise.mjs --check` passes. A grep found no remaining "every child process" claim in `spec`, `scripts`, `.changeset` or the READMEs.

**WR-03 resolved.**
- `readMeta` refuses the same label twice, a `meta.txt` without both arm lines, and a label that is neither arm. It keeps the rounds checks. Either order of the two real arms is allowed, which is deliberate and stated in the header, since Phase 68's reference is the patched arm.
- Run on the real record, `base base` exits 2 (`the reference and candidate label are both base`) and `base zzz` exits 2 (`zzz is not an arm of ... (final and base)`).
- `--self-test` prints `21 passed`: 8 gate cases, the by-name check, 2 arm orders and 10 refusals. Five of the refusals are new, and the three label refusals plus the no-arm-lines refusal (and the same-label one) fail without the check, because `readMeta` is where the check lives.
- Reproduction: `node scripts/bench/analyze.mjs <bench>/final base final <bench>/workloads.txt` rewrote `analysis.tsv` with SHA-256 `c23e42fd...bb75` before and after, so it is byte for byte identical. `git status` over `scripts` and `spec` is clean, and the `bench` directory shows no change.

I did not run the full gate 14, since it builds and packs every package. Its passing path is untouched by the diff, and the fixer's own run is reported in `68-REVIEW-FIX.md`.

## Carried forward from iteration 1 (not in scope, not re-raised)

All four still hold. None was touched by the fixes.

### IN-01: An odd round count leaves the arm order unbalanced

**File:** `scripts/bench/ab.sh:35-44`; `.planning/phases/QD-68-hygiene-and-recorded-close-outs/68-BENCH.md`
**Issue:** The order balance is exact only for an even round count. The recorded 3-round run is `final-1 base-1 base-2 final-2 final-3 base-3`.
**Fix:** State the limit in the header, or refuse an odd count.

### IN-02: A failing gate exits 0, and the analyzer self-test is run by nothing

**File:** `scripts/bench/analyze.mjs:3-4`, the exit handling at the end of the file
**Issue:** `# gate: fail` still exits 0, and `--self-test` is wired to no gate. The self-test exercises `readMeta`, not `main`, so a later edit that stops `main` calling it would go unseen, which is the same gap.
**Fix:** Add `--strict`, and run `--self-test` from an existing gate, or declare it record-only.

### IN-03: `68-stale.mjs` can miss a renamed cited file, or one outside its path roots

**File:** `.planning/phases/QD-68-hygiene-and-recorded-close-outs/68-stale.mjs:12, 33`
**Issue:** `git diff --name-only` uses rename detection, and `PATH` omits `.changeset/`, `.github/` and root dotfiles.
**Fix:** Use `--no-renames` and widen `PATH`.

### IN-04: The record scripts' self-tests compare source text, and `68-compare.mjs` does not compare types

**File:** `67-mutation.mjs` and `68-mutation.mjs` (`gitStatus.toString() !== ...`); `68-compare.mjs:62-72`
**Issue:** The self-tests check source text, not behaviour. `transpileModule` erases types, so a type-only edit would pass as "same".
**Fix:** Stub the `git` call and record the pathspec, and state in the `68-compare.mjs` header that types are outside the comparison.

---

_Reviewed: 2026-11-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
