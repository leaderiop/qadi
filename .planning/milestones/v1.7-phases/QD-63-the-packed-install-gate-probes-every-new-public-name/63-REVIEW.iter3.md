---
phase: QD-63-the-packed-install-gate-probes-every-new-public-name
reviewed: 2026-11-20T00:00:00Z
depth: quick
files_reviewed: 1
files_reviewed_list:
  - scripts/check-package-install.mjs
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase QD-63: Code Review Report (iteration 3)

**Reviewed:** 2026-11-20
**Depth:** quick
**Files Reviewed:** 1
**Status:** clean

## Summary

I read `63-REVIEW.iter2.md` and `git show b5310eb7`, and checked the new comments against `holdsDirective` and the call check in the current script.

**No code changed.** Filtering the script's diff for lines that are not comment lines returns nothing. Every added and removed line in `scripts/check-package-install.mjs` is a `*` or `//` comment line.

**iter2 WR-01 is resolved.** The `shortcut:` note (lines 871-873) now says a call that is written but never run passes the check, and that the probe's `expect()` calls beside it never run either. That matches the code. `called.add` fires on any `CallExpression` with an identifier callee, with no reachability test, and `expect` throws only when it executes. The false mitigation claim is gone. The note keeps the `shortcut: <limit>; upgrade to ...` form.

**iter2 IN-01 is resolved.**
- The header (lines 65-66) now says only that a refusal cannot be "deleted together with its directive". `holdsDirective` backs that: deleting the literal removes its annotation and fails `unrefused`.
- The `REFUSED_SHAPE_PROBES` doc (lines 100-101) now says the directive "is matched by its text anywhere in the declaration, not attached to the refused property". That matches the `startsWith("// @ts-expect-error") && includes(member)` test, which runs over the declaration's descendants.
- The "stood in for by a directive on another property" claim is gone from both places, so the script now agrees with the ADR and CCR wording from `f4398b04`.

**Line width.** The comment lines this commit adds are all within 90 columns. The two over-width lines in the diff (100 and 211 columns) are the removed ones. The `holdsDirective` leading comment (about line 851) is also over width. It is untouched by this commit, so I did not file it.

All reviewed comments meet quality standards. No issues found.

---

_Reviewed: 2026-11-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
