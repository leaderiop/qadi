---
phase: "62"
slug: "type-pins-that-can-fail"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-20"
---

# Phase 62 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tstyche 7.2.5 (type-level, TypeScript 6.0.3); node gate scripts (`scripts/check-house-style.mjs`, `scripts/check-dod-table.mjs`) |
| **Config file** | `tstyche.json` → new `tsconfig.tstyche.json` (main pass); `tsconfig.test.json` (rule-on pass) |
| **Quick run command** | `npx tstyche <touched .tst.ts> < /dev/null` and `node scripts/check-house-style.mjs < /dev/null` |
| **Full suite command** | `pnpm test:tstyche < /dev/null` (both passes) and `node scripts/check-dod-table.mjs < /dev/null`; phase gate `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~17 seconds (both tstyche passes); `check:pr` several minutes |

Scratch or RED type-test files must live under `packages/*/test/**`. Elsewhere tstyche uses its baseline tsconfig with no Effect plugin, so the file proves nothing (62-RESEARCH probe finding).

---

## Sampling Rate

- **After every task commit:** Run the quick run commands.
- **After every plan wave:** Run the full suite commands.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` must be green.
- **Max feedback latency:** 20 seconds (quick commands).

---

## Per-Task Verification Map

The planner fills task IDs. Each row below must be covered by at least one task's `<automated>` verify. A RED twin is run first on the phase base, then reverted.

| Requirement / Decision | Behavior | Test Type | Automated Command | RED twin | Status |
|------------------------|----------|-----------|-------------------|----------|--------|
| PIN-01, D-01..D-03 | Config half: positives pass, `// @tstyche fixme` negatives fail; rule-on half below the `// @effect-diagnostics effect/floatingEffect:error` directive passes the negatives; Effect, Stream and `new` covered | tstyche | `pnpm test:tstyche < /dev/null` (runs `packages/core/test/FloatingEffectPins.tst.ts` under both tsconfigs via `scripts/run-tstyche.mjs`) | Same file under `--tsconfig tsconfig.test.json`: config-half positives fail and the fixme pins report "supposed to fail, but it passed" | ✅ green |
| PIN-02 (tsconfig) | Whole suite green under the new tsconfig | tstyche | `pnpm test:tstyche < /dev/null` | `tstyche.json` pointed back at `tsconfig.test.json`: the characterisation config half fails | ✅ green |
| PIN-02 (drift) | Plugin entry equals `tsconfig.base.json`'s apart from `floatingEffect` | house-style | `node scripts/check-house-style.mjs < /dev/null` (`[tstyche-plugin-drift]` clean) | Drop `"unstableApiUsage": "off"` from the child: rule fails | ✅ green |
| PIN-03 | `DecisionLog.tst.ts` states its reason through `Parameters<typeof makeDecisionLog>[0]` | tstyche | `npx tstyche packages/core/test/DecisionLog.tst.ts < /dev/null` | Transient `readonly environment?: string` in `packages/core/src/DecisionLog.ts`: the pin fails; restore with `git checkout` | ✅ green |
| PIN-04 / D-07 part 1 | Every negative pin has a same-text positive control | house-style | `node scripts/check-house-style.mjs < /dev/null` (control rule clean) | Delete one control: the rule names the file and subject | ✅ green |
| PIN-04 (classification) | All negative pins classified (subject, declared return, form, control) | file check | row count of the classification table in the phase dir equals the pin count (81 callable on the base + 7 constructor) | The table is absent on the base | ✅ green |
| PIN-05 / D-08 / D-09 | Exact per-file counts for both forms in both directions; the AGENTS.md table is checked; the walk equals tstyche's file list; an empty walk fails | house-style | `node scripts/check-house-style.mjs < /dev/null` (budget and table rules clean) | Added, removed, commented and line-split pin; a table-row edit; an empty walk | ✅ green |
| D-07 part 2 | The rule-on pass catches a bare negative pin on an Effect subject | tstyche | `pnpm test:tstyche < /dev/null` | A temporary file under `packages/core/test/` with an Effect subject, a positive and a bare negative: pass 1 green, control check green, pass 2 red; then delete it | ✅ green |
| D-10 / D-11 | Every flipped negative pin fails with an allowed TS compiler code (no language-service code) | one-off sweep | the sweep procedure from 62-RESEARCH "Code Examples", recorded in the phase dir | A flipped pin whose arguments are valid passes (characterisation positives) | ✅ green |
| Gate 11 | The step 6 row and paragraph match `pnpm check` | script | `node scripts/check-dod-table.mjs < /dev/null` | Edit `package.json` first: drifts reported until the three text edits | ✅ green |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null`, recorded green in `62-VERIFICATION.md` (`ran 16 of 17 steps`, exit 0); not re-run here, per the validation brief | n/a | ✅ green |
| WX-02 | Records complete | script | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` (PASS 21, FAIL 0) and `node scripts/spec-revise.mjs --check < /dev/null` (clean) | Cite CCR-QD-453 before its register row exists | ✅ green |
| WX-04 | No forbidden construct added | gate | `node scripts/check-house-style.mjs < /dev/null` (560 files clean; `ANY_BUDGET`, `SWITCH_BUDGET`, `UNTRACED_BUDGET`) plus the `.tst.ts` grep recorded in `62-VERIFICATION.md` | n/a | ✅ green |
| WX-05 | Mutation and coverage scope untouched | git | `git diff <phase-base> --stat -- 'packages/*/src'` is empty (recorded in `62-VERIFICATION.md`: `git status` clean for packages/scripts/spec after the probe) | n/a | ✅ green |
| WX-03 | `spec/overview.md` names every export | gate | `node scripts/check-api-surface.mjs < /dev/null` (939 exports documented) | n/a | ✅ green |
| WX-07 | No plan, D or phase ids in shipped source or test titles | gate | `node scripts/check-house-style.mjs < /dev/null` (`[no-numbering-placeholder]` and the rest clean). Plan-local ids in comments are reviewed, see Manual-Only | n/a | ✅ green |
| DoD table | `pnpm check` steps match the definitions-of-done table (D-11 edit) | script | `node scripts/check-dod-table.mjs < /dev/null` (26 steps match) | n/a | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tsconfig.tstyche.json` and the characterisation `.tst.ts` (first plan)
- [x] The classification table and the flip-sweep record in the phase directory
- [x] The new `check-house-style.mjs` rules are each shown failing once by the RED twins above. No committed test covers the gate script, which matches the repo's existing gates.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Each positive control varies only the argument under test | PIN-04 | The text check proves a same-subject control exists, not that it is single-variable | Review each of the 11 new controls against its pin |
| The reworded workaround comments are true | D-04 | Prose | Re-grep `floating|vacuous|language service|synthes` in `*.tst.ts` and read each hit |
| Behaviour change preceded by a RED twin on the phase base | WX-06 | No command can show the order of work | Cited evidence: `62-FLIP-SWEEP.md`, `62-PIN-CLASSIFICATION.md` and the RED twins recorded in `62-VERIFICATION.md` (scratch probe failed under the new tsconfig, rule-on block red under the rule-off config) |
| Coverage thresholds and Stryker score hold | WX-05 | Coverage and mutation are not re-run per phase; no `packages/*/src` file changed | Cited evidence: `62-VERIFICATION.md` (`check:pr` green, `62-mutation-base.json`) |
| No plan-local ids in comments of the touched files | WX-07 | The gate checks numbering placeholders, not plan-local ids in prose | Review of `FloatingEffectPins.tst.ts`, `scripts/run-tstyche.mjs`, `scripts/lib/type-tests.mjs`, recorded in `62-REVIEW.md` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-22

## Validation Audit 2026-11-22

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
