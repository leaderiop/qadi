---
phase: QD-62-type-pins-that-can-fail
reviewed: 2026-11-20T00:00:00Z
depth: standard
files_reviewed: 26
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
  - scripts/lib/type-tests.mjs
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
  warning: 0
  info: 5
  total: 5
  necessity: 0
status: issues_found
---

# Phase QD-62: Code Review Report

**Reviewed:** 2026-11-20
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

This is iteration 3, the last re-review, after commits 76a617e9 (WR-01, IN-05) and 1d4e9929 (IN-06). I read the changed hunks and ran the gates in the real tree, which I did not modify. I ran the fault probes in a scratch copy of the repo under the session scratchpad, since deleted.

Gates in the real tree:
- `node scripts/check-house-style.mjs`: clean, 560 files, 66 type-test files.
- `node scripts/run-tstyche.mjs`: exit 0. Pass 1: 347 passed, 1 skipped. Pass 2: 346 passed, 2 skipped.

**Verdict: WR-01 is closed. No critical findings and no warnings remain.**

1. **Pass 2 fails when `tsconfig.test.json` loses the rule.** Each probe edited the scratch `tsconfig.base.json`, which `tsconfig.test.json` inherits. Pass 1 stayed green every time, because `tsconfig.tstyche.json` restates the plugin entry.

   | Probe | Pass 1 | Pass 2 |
   | ----- | ------ | ------ |
   | `floatingEffect: "off"` in the base entry | green | 1 failed: the new block, all 3 pins at lines 70-72 ("Expression is callable/constructable with the given argument") |
   | `"diagnostics": false` in the base entry | green | 2 failed: the new block and the directive block, since the whole plugin is off |
   | `"plugins": []` in the base | green | 2 failed, same two blocks |
   | `floatingEffect: "warning"` in the base entry | green | green, correctly: a warning is still a diagnostic, so the reading holds |

   The `diagnostics: false` and plugin-dropped routes are the ones `[tstyche-plugin-drift]` cannot see statically, so the new block is the only guard on them. The new block is the only one of the three that goes red in the `"off"` case.

2. **Each block runs in exactly the passes its title claims.** The real output gave pass 1 one skipped test and pass 2 two. That is the new block skipped in pass 1, and the rule-off block's two tests skipped in pass 2.
   - The directive block has no skip text and runs in both passes.
   - `"under the tstyche tsconfig"` is contained only by the rule-off describe's title. `"under tsconfig.test.json"` is contained only by the new describe's title.
   - Neither text contains the other, and no test title contains either. The two test titles that repeat ("a negative pin on valid arguments passes, the known-wrong reading") contain neither text.
   - `run-tstyche.mjs` also counts each text in the lower-cased whole file of every selected type test and requires exactly one holder with a count of 1. That covers comments as well as titles.
   - A skip that stopped matching would fail closed: block 2 would run in pass 1 under the rule-off config and go red, and block 1's `fixme` pins would unexpectedly pass in pass 2 and go red.

3. **The budget and the table agree.** The file has 7 negative callable pins: 1 on `p`, and 2 in each of the three blocks. It has 3 negative constructable pins, one per block. `NOT_CALLABLE_PIN_BUDGET` and AGENTS.md section 6's row both say 7/3, and `[not-callable-pin]` and `[not-callable-pin-table]` pass. Every negative has a positive twin in the first block, so `[not-callable-control]` is satisfied without exempting the twin rule.

4. **The five claims now say what is true.** I found no remaining "two blocks" or "pass 2 proves" wording.
   - The `run-tstyche.mjs` header, AGENTS.md section 6, ADR-QD-175 (Rev 1.4), the DoD step 6 paragraph (Rev 1.18) and the CCR-QD-453 row all describe three blocks and which pass skips which.
   - IN-05 and IN-06 from the previous round are fixed: the comment and message are reworded, and the CCR row cites `spec/README.md` Rev 1.261, which is the file's actual revision.

Carried forward from the previous review and still true: IN-01 to IN-04. One new Info, IN-05, is a wording gap in the same claims.

## Info

### IN-01: The twin check vouches per subject, not per refused argument

**File:** `scripts/check-house-style.mjs:2430-2452`
**Issue:** Carried forward, still true. The twin key is form, kind and subject text, so one positive twin covers every negative on that subject. `DiagnosticsStore.tst.ts` has three negatives and one twin that is valid for none of them. A pin that refuses for the wrong reason still passes. ADR-QD-175 admits this as "reviewed by hand".
**Fix:** None required. If wanted, key the twin on the subject plus the negative's test title.

### IN-02: `pnpm test:tstyche <path>` ignores its arguments

**File:** `scripts/run-tstyche.mjs:128-138`
**Issue:** Carried forward, still true. `process.argv` is never read, so a path filter is dropped and all 66 files run twice. The old script was bare `tstyche` and filtered.
**Fix:** Append `process.argv.slice(2)` to both argument lists, or document that the wrapper takes no arguments.

### IN-03: Two small robustness gaps in the gate code

**File:** `scripts/check-house-style.mjs:2294,2352`
**Issue:** Carried forward, still true.
- `tstyche.json` is read with a bare `JSON.parse` at line 2294, while `[tstyche-plugin-drift]` reads the same file with `readJsonc`. A comment added to `tstyche.json` crashes `[not-callable-pin]` with an uncaught `SyntaxError`.
- `listed.set(m[1], …)` at line 2352 overwrites a duplicated row in AGENTS section 6's table silently, so a duplicated row passes `[not-callable-pin-table]`.

**Fix:** Use `readJsonc("tstyche.json")` at line 2294. In the row loop, fail when `listed.has(m[1])`.

### IN-04: The `CHARACTERISATION` path is declared in two scripts

**File:** `scripts/check-house-style.mjs:2381`, `scripts/run-tstyche.mjs:41`
**Issue:** Carried forward, still true. The same path string is a separate constant in each script, plus a budget key. Renaming the file means editing three places, and a miss in one is caught only indirectly.
**Fix:** Export it from `scripts/lib/type-tests.mjs` and import it in both scripts.

### IN-05: Three descriptions of the characterisation omit or overstate the new block

**File:** `packages/core/test/FloatingEffectPins.tst.ts:27-29`, `spec/decisions/175-a-negative-type-pin-can-fail.md:38-43`, `spec/traceability.md:508`
**Issue:** None is wrong in a way that can mislead a behaviour, but each is slightly out of step with the three-block design.
- The file header says "Each block's title carries the text its skip uses, and the text appears once". The directive block skips in neither pass and its title carries no skip text, so "each" should be "the first two".
- ADR-QD-175's "The tool's reading is pinned" paragraph describes only two readings (the `fixme` pins under the tstyche config, and the pins that pass below the directive). The directive-free rule-on block is described only later, in the "tstyche runs twice" paragraph.
- The `spec/traceability.md` row for `FloatingEffectPins.tst.ts` says the negative pins pass "below the in-file directive", and does not mention the block that holds them under the config alone.

**Fix:** Reword the header to "the two blocks that skip carry the text their skip uses". Add a clause to the ADR paragraph and the traceability row, with Rev bumps through `spec-revise`.

---

_Reviewed: 2026-11-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
