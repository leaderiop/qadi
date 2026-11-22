---
phase: QD-62-type-pins-that-can-fail
fixed_at: 2026-11-20T00:00:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-REVIEW.md
iteration: 2
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase QD-62: Code Review Fix Report

**Fixed at:** 2026-11-20
**Source review:** `.planning/phases/QD-62-type-pins-that-can-fail/62-REVIEW.md`
**Iteration:** 2

**Summary:**
- Findings in scope: 1 (WR-01). IN-05 and IN-06 were also fixed at the orchestrator's request.
- Fixed: 1
- Skipped: 0
- Out of scope, left alone: IN-01, IN-02, IN-03, IN-04.

**Where this ran:** `workflow.use_worktrees` is `false`, so edits and commits were made in the main checkout on `arch-wave-12`, with no worktree and no sentinel. The RED probes ran in a scratch copy of the repo under the session scratchpad (`node_modules` symlinked), since deleted. The gates below ran in the main checkout.

## Fixed Issues

### WR-01: Pass 2 does not prove `tsconfig.test.json` has `floatingEffect` on

**Files modified:** `packages/core/test/FloatingEffectPins.tst.ts`, `scripts/run-tstyche.mjs`, `scripts/check-house-style.mjs`, `AGENTS.md`, `spec/decisions/175-a-negative-type-pin-can-fail.md` (Rev 1.4), `spec/process/definitions-of-done.md` (Rev 1.18)
**Commit:** 76a617e9
**Applied fix:** Enforced, not softened. `FloatingEffectPins.tst.ts` gained a middle block, `under tsconfig.test.json, floatingEffect is on`, placed before the in-file directive and carrying no directive. Its bare negative pins on `f`, `s` and `C` pass only while the config itself has the rule on. `run-tstyche.mjs` now has two skip texts, `RULE_OFF_ONLY` (skipped in pass 2) and `RULE_ON_ONLY` (skipped in pass 1). Each is checked to appear once, in the characterisation only. The block adds 2 callable and 1 constructable negative pin, so `NOT_CALLABLE_PIN_BUDGET` and AGENTS.md section 6's table row moved together from 5/2 to 7/3. The five claims (file header, `run-tstyche.mjs` header, AGENTS.md section 6, ADR-QD-175, the DoD paragraph) now describe three blocks and which pass skips which. The `[not-callable-control]` exemption is unchanged: it exempts only `FloatingEffectPins.tst.ts`.
**Proof it can fail:** two scratch probes, each made pass 2 go red.
- `"diagnostics": false` in the base plugin entry: pass 1 green, pass 2 fails `FloatingEffectPins.tst.ts` (2 tests: the new block and the directive block, since the whole plugin is off).
- `"floatingEffect": "off"` in the base entry: pass 1 green, pass 2 fails exactly 1 test, the new block ("Expression is callable with the given argument" at its first pin). The directive block still passed, so the new block is the one doing the work. This route is one `[tstyche-plugin-drift]` guards statically; the first route is not.

Logic-adjacent (which pass skips which block): marked fixed, but a human may want to read the three titles and skip texts once.

### IN-05 (info, requested): stale comment and message

**Files modified:** `scripts/check-house-style.mjs`, `scripts/run-tstyche.mjs`
**Commit:** 76a617e9 (folded into the WR-01 commit, since both touched the same lines of text)
**Applied fix:** The `[not-callable-control]` comment now says each tstyche pass skips one of its three blocks by title. The `--listFiles` failure message now reads "so the file list and the skip texts could not be checked".

### IN-06 (info, requested): CCR-QD-453 row's stale README revision

**Files modified:** `spec/README.md` (Rev 1.261)
**Commit:** 1d4e9929
**Applied fix:** The row now cites ADR-QD-175 Rev 1.4, DoD Rev 1.18 and `spec/README.md` Rev 1.261, which is the revision this edit produced, and describes the three blocks.

## Skipped Issues

None. IN-01, IN-02 (`pnpm test:tstyche <path>` ignores arguments), IN-03 (bare `JSON.parse` of `tstyche.json`, silent duplicate table row) and IN-04 (`CHARACTERISATION` declared in two scripts) are out of scope and untouched.

## Gate results (main checkout)

- `node scripts/check-house-style.mjs`: `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`
- `node scripts/check-dod-table.mjs`: `dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve`
- `node scripts/run-tstyche.mjs`: exit 0, last line `Duration:   8s` (pass 1: 347 passed, 1 skipped; pass 2: 346 passed, 2 skipped)
- `node scripts/spec-revise.mjs --check`: `spec-revise: every Revision matches its newest Change History entry`
- `pnpm check:pr < /dev/null`: exit 0, tail `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).`

---

_Fixed: 2026-11-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
