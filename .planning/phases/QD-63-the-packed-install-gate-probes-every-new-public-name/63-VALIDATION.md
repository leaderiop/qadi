---
phase: "63"
slug: "the-packed-install-gate-probes-every-new-public-name"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-20"
---

# Phase 63 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none of its own: gate 14 (`scripts/check-package-install.mjs`) is its own test; the consumer fixture asserts with its `expect(label, actual, wanted)` helper and the sandbox `tsc` run |
| **Config file** | `scripts/check-package-install.mjs` (it writes the sandbox `tsconfig.json`) |
| **Quick run command** | `node scripts/check-package-install.mjs < /dev/null` (runs `pnpm build`, packs the 9 public packages); not re-run for validation, see the recorded runs below |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~7.5 s per gate 14 run; `check:pr` several minutes |

Never run two gate 14 processes at once: `.package-check/` is shared state. Scratch copies of the script override `ROOT` and keep their sandbox under the gitignored `.scratch/<name>/` (63-RESEARCH: a sandbox outside the repo fails with TS1295).

---

## Sampling Rate

- **After every task commit:** `node scripts/check-package-install.mjs < /dev/null` (`check:fast` does not run gate 14)
- **After every plan wave:** the same, plus `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && pnpm spec:api` once records land
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` must be green
- **Max feedback latency:** ~10 seconds (gate 14)

---

## Per-Task Verification Map

The planner fills task IDs. Each row must be covered by at least one task's `<automated>` verify.

| Requirement / Decision | Behavior | Test Type | Automated Command | RED twin | Status |
|------------------------|----------|-----------|-------------------|----------|--------|
| PROBE-01, D-A1 | Guard (unstable/sync AST, failures via `fail()`) requires every packed `make*Feed` to be a call | gate | `node scripts/check-package-install.mjs` (recorded green: `63-VERIFICATION.md`, 68.1-04 at `cc58b8e6`, final `check:pr` on `cd7cd3a1`; 9 packages, 524 runtime exports) | At the guard commit: exit 1 naming exactly `makeDiagnosticsFeed, makeGatesFeed` | ✅ green |
| PROBE-01, D-SC4 | Guard also requires the type-only probe name `DecisionCacheShape` as a type reference | gate | same (recorded runs above) | Scratch copy with the host-cache probe deleted: gate fails naming `DecisionCacheShape` | ✅ green |
| PROBE-02 | Gates feed: no-registry `Unwatched`, one instance `Read`/1, follows its registry to 2, listener set empty after scope close | gate (fixture) | same (recorded runs above) | Scratch copy with the gates probe deleted: guard names `makeGatesFeed` | ✅ green |
| PROBE-03 | Diagnostics feed: baseline `Off`; `Live` with `hydration` set within a 200-turn cap, no clock, scope closed; `schedule` refused (TS2353) | gate (fixture) | same (recorded runs above) | Scratch copy with the diagnostics probe deleted: guard names `makeDiagnosticsFeed` | ✅ green |
| PROBE-04 | Host cache over `decisionCacheLayer()`: lookups `miss,hit`, 1 resolve, `size` 1; pre-0.13 literal refused (TS2345 under `@ts-expect-error`) | gate (tsc + run) | same (recorded runs above) | Directive line deleted (TS2345); delegation broken (`miss,miss`) | ✅ green |
| PROBE-05 | Each deliberate removal fails gate 14; DoD table unchanged | scratch, recorded | scratch copy variants under `.scratch/<name>/` (~7 s each); `node scripts/check-dod-table.mjs < /dev/null` (26 steps match, 153 references resolve) | n/a (the variants are the RED) | ✅ green |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null`, recorded green: 68.1-04 at `cc58b8e6` and the final run on `cd7cd3a1`, 9 packages, 524 runtime exports (not re-run here) | n/a | ✅ green |
| WX-02/03 | Reserved ids only; CCR-QD-454 registered; no export change | spec gates | `bash spec/scripts/verify-traceability.sh --strict` (PASS 21, FAIL 0), `node scripts/check-api-surface.mjs` (939 exports documented), `node scripts/spec-revise.mjs --check` (clean); CCR-QD-454 registered at `spec/README.md` and traced in `spec/traceability.md` | Cite CCR-QD-454 before its register row exists | ✅ green |
| WX-04 | No forbidden construct; oxlint clean on `scripts/` | lint | `node scripts/check-house-style.mjs < /dev/null` (560 files clean); oxlint is a step of the recorded `check:pr` | n/a | ✅ green |
| WX-05 | Mutation/coverage scope untouched | git | `git diff --name-only 11dc168f 321e213d -- 'packages/*/src'` empty (0 files, the phase's own range) | n/a | ✅ green |
| WX-07 | No D-/phase numbers in shipped script lines; nothing released | grep | grep of the phase's added lines in `scripts/check-package-install.mjs` matches no plan, phase or requirement id; no `.changeset/` file added in `11dc168f..321e213d` (0) | n/a | ✅ green |

*Status: ✅ green · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The guard's RED run at its own commit is the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Removed-probe failures | PROBE-05 | Scratch copies are recorded, not committed (a committed self-test would need its own sandbox install) | Cited evidence: `63-RED-EVIDENCE.md` (variants r1 to r6, m1 to m3, dts, each exit 1 naming the probe) and the eight planted-defect checks re-run in `63-VERIFICATION.md`'s Phase 68 sweep. To repeat: run each variant from the plan; delete `.scratch/<name>/` afterwards |
| RED evidence recorded before the guard's behaviour change | WX-06 | No command shows order of work | Cited evidence: `63-RED-EVIDENCE.md`; commit order guard `161637ab` before probes `a5f1ab5d`, `70676684`, `fc282f72` |
| Coverage thresholds and mutation score hold | WX-05 | Not re-run per phase; no `packages/*/src` file changed | Cited evidence: `63-VERIFICATION.md`, `63-mutation-base.json`, empty `packages/*/src` diff above |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-22

## Validation Audit 2026-11-22

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
