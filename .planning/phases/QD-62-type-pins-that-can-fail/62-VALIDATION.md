---
phase: "62"
slug: "type-pins-that-can-fail"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| PIN-01, D-01..D-03 | Config half: positives pass, `// @tstyche fixme` negatives fail; rule-on half below the `// @effect-diagnostics effect/floatingEffect:error` directive passes the negatives; Effect, Stream and `new` covered | tstyche | `npx tstyche --tsconfig tsconfig.tstyche.json <characterisation file> < /dev/null` | Same file under `--tsconfig tsconfig.test.json`: config-half positives fail and the fixme pins report "supposed to fail, but it passed" | ⬜ pending |
| PIN-02 (tsconfig) | Whole suite green under the new tsconfig | tstyche | `pnpm test:tstyche < /dev/null` | `tstyche.json` pointed back at `tsconfig.test.json`: the characterisation config half fails | ⬜ pending |
| PIN-02 (drift) | Plugin entry equals `tsconfig.base.json`'s apart from `floatingEffect` | house-style | `node scripts/check-house-style.mjs < /dev/null` (`[tstyche-plugin-drift]` clean) | Drop `"unstableApiUsage": "off"` from the child: rule fails | ⬜ pending |
| PIN-03 | `DecisionLog.tst.ts` states its reason through `Parameters<typeof makeDecisionLog>[0]` | tstyche | `npx tstyche packages/core/test/DecisionLog.tst.ts < /dev/null` | Transient `readonly environment?: string` in `packages/core/src/DecisionLog.ts`: the pin fails; restore with `git checkout` | ⬜ pending |
| PIN-04 / D-07 part 1 | Every negative pin has a same-text positive control | house-style | `node scripts/check-house-style.mjs < /dev/null` (control rule clean) | Delete one control: the rule names the file and subject | ⬜ pending |
| PIN-04 (classification) | All negative pins classified (subject, declared return, form, control) | file check | row count of the classification table in the phase dir equals the pin count (81 callable on the base + 7 constructor) | The table is absent on the base | ⬜ pending |
| PIN-05 / D-08 / D-09 | Exact per-file counts for both forms in both directions; the AGENTS.md table is checked; the walk equals tstyche's file list; an empty walk fails | house-style | `node scripts/check-house-style.mjs < /dev/null` (budget and table rules clean) | Added, removed, commented and line-split pin; a table-row edit; an empty walk | ⬜ pending |
| D-07 part 2 | The rule-on pass catches a bare negative pin on an Effect subject | tstyche | `pnpm test:tstyche < /dev/null` | A temporary file under `packages/core/test/` with an Effect subject, a positive and a bare negative: pass 1 green, control check green, pass 2 red; then delete it | ⬜ pending |
| D-10 / D-11 | Every flipped negative pin fails with an allowed TS compiler code (no language-service code) | one-off sweep | the sweep procedure from 62-RESEARCH "Code Examples", recorded in the phase dir | A flipped pin whose arguments are valid passes (characterisation positives) | ⬜ pending |
| Gate 11 | The step 6 row and paragraph match `pnpm check` | script | `node scripts/check-dod-table.mjs < /dev/null` | Edit `package.json` first: drifts reported until the three text edits | ⬜ pending |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null` | n/a | ⬜ pending |
| WX-02 | Records complete | script | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` and `node scripts/spec-revise.mjs --check < /dev/null` | Cite CCR-QD-453 before its register row exists | ⬜ pending |
| WX-04 | No forbidden construct added | review + grep | `/usr/bin/grep -nE ' as |!\.|\bany\b|switch' <new or edited .tst.ts files>` (`collect()` skips `.tst.ts`) | n/a | ⬜ pending |
| WX-05 | Mutation and coverage scope untouched | git | `git diff <phase-base> --stat -- 'packages/*/src'` is empty | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tsconfig.tstyche.json` and the characterisation `.tst.ts` (first plan)
- [ ] The classification table and the flip-sweep record in the phase directory
- [ ] The new `check-house-style.mjs` rules are each shown failing once by the RED twins above. No committed test covers the gate script, which matches the repo's existing gates.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Each positive control varies only the argument under test | PIN-04 | The text check proves a same-subject control exists, not that it is single-variable | Review each of the 11 new controls against its pin |
| The reworded workaround comments are true | D-04 | Prose | Re-grep `floating|vacuous|language service|synthes` in `*.tst.ts` and read each hit |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
