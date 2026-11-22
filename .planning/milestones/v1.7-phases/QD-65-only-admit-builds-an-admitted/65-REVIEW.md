---
phase: QD-65-only-admit-builds-an-admitted
reviewed: 2026-11-20T21:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - packages/core/src/Admission.ts
  - packages/core/test/Admission.test.ts
  - packages/core/test/WalkEnvironment.tst.ts
  - .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs
  - spec/decisions/172-admission-produces-the-one-walk-environment.md
  - spec/invariants.md
  - spec/behaviors/05-evaluator.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
  necessity: 0
status: clean
---

# Phase QD-65: Code Review Report (re-review after fixes)

**Reviewed:** 2026-11-20T21:00:00Z
**Depth:** standard
**Files Reviewed:** 9 (plus `spec/decisions/index.yaml`, read as the 172 entry)
**Status:** clean (no Critical or Warning; two known Info items remain)

## Summary

WR-01 and IN-01 from the first review are resolved, and the two fix commits (a23dacf1, c0be0db8) introduced nothing new.

**WR-01 (resolved).**
- No text claims `policy`, `maxDepth` or `subject` are read once. A grep of `spec/`, `Admission.ts` and the two test files finds "read once" and "one read" only where they name the question's resource and action:
  - `Admission.ts`: the `SUPPLIED` comment (lines 60-61) and the `admit` doc (line 108);
  - ADR-QD-172: Decision 3 (line 59) and the amendment (lines 286-287);
  - INV-QD-376 (heading and body);
  - BEH-QD-662;
  - the traceability row (line 203).
- ADR-QD-172's amendment states that depth is judged on a separate read of `policy` and `maxDepth`.
- No text claims a compile-time guarantee. INV-QD-376's Implication says the compiler does not check the `"asked"` flags, and the ADR says the same.
- The retitled INV-QD-376 slug is `inv-qd-376-the-supplied-flags-and-the-matcher-context-come-from-one-read-of-the-questions-resource-and-action`. It matches every link:
  - `invariants.md` (INV-QD-375 Related);
  - `traceability.md:203`;
  - `05-evaluator.md:454`.
- A grep finds no link to the old `...one-read-of-the-question` anchor left in `spec/` or `packages/`.

**IN-01 (resolved).** `Admission.ts:108` now cites INV-QD-376.

**`Admission.ts` is comment-only.** `git diff` of c0be0db8~2..c0be0db8 shows two comment edits and no code line. This agrees with the fixer's token-stream proof of 364 tokens, diff empty.

**Revisions and gates.** `node scripts/spec-revise.mjs --check` passes. The bumps agree with the change-history entries: `invariants.md` 1.163, `traceability.md` 1.230, `05-evaluator.md` 1.19, ADR-QD-172 1.2. The CCR-QD-456 row in `spec/README.md` still cites the revisions it introduced (1.1, 1.18, 1.162, 1.229). That is history, which the project exempts, so it is not a finding.

**Commands run.** `spec-revise --check`: pass. Greps and diffs as described above.

**Not re-run.** vitest, tstyche, tsc and oxlint were not re-run. The fixes touched comments and Markdown only, and the fixer's report records those runs as green.

## Info

### IN-02: The constructor pin's "positive control" is not a twin of the call it guards (carried forward, unchanged)

**File:** `packages/core/test/WalkEnvironment.tst.ts:60-64`
**Issue:** The control line, `expect(admit(question, "asked")).type.toBe<...>()`, duplicates the earlier `admit` pin and says nothing about the `new Admitted(...)` call it follows. A `@ts-expect-error` accepts any diagnostic on its line, so drift in the arguments (TS2345 or TS2554) would keep the pin passing. Only the manually run `pin-codes.mjs` reads the code, and `pnpm check:pr` does not run it. The file is unchanged since the first review.
**Fix:** Soften the "each beside a positive control" wording in INV-QD-375 and BEH-QD-661, or state that `pin-codes.mjs` and not the gate checks the TS2673 reason. The literal pin (lines 66-82) is the better model. Deferred to the milestone audit.

### IN-03: `pin-codes.mjs` is tied to one pnpm store path and prints nothing on success (carried forward, unchanged)

**File:** `.planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs:10`
**Issue:** The script hard-codes `node_modules/.pnpm/typescript@6.0.3/node_modules/typescript`, so the next TypeScript bump makes it throw at import. It also prints only diagnostics, so a run that finds none looks the same as a run where the pins held. The file is unchanged since the first review.
**Fix:** Resolve TypeScript the way tstyche does (`createRequire(resolve("node_modules/tstyche/package.json"))("typescript")`) and print a diagnostic count. It is a phase record and not a gate. Deferred to the milestone audit.

---

_Reviewed: 2026-11-20T21:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
