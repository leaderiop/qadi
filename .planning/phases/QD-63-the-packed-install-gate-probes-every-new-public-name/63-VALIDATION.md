---
phase: "63"
slug: "the-packed-install-gate-probes-every-new-public-name"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `node scripts/check-package-install.mjs < /dev/null` (runs `pnpm build`, packs the 9 public packages) |
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
| PROBE-01, D-A1 | Guard (unstable/sync AST, failures via `fail()`) requires every packed `make*Feed` to be a call | gate | `node scripts/check-package-install.mjs` | At the guard commit: exit 1 naming exactly `makeDiagnosticsFeed, makeGatesFeed` | ⬜ pending |
| PROBE-01, D-SC4 | Guard also requires the type-only probe name `DecisionCacheShape` as a type reference | gate | same | Scratch copy with the host-cache probe deleted: gate fails naming `DecisionCacheShape` | ⬜ pending |
| PROBE-02 | Gates feed: no-registry `Unwatched`, one instance `Read`/1, follows its registry to 2, listener set empty after scope close | gate (fixture) | same | Scratch copy with the gates probe deleted: guard names `makeGatesFeed` | ⬜ pending |
| PROBE-03 | Diagnostics feed: baseline `Off`; `Live` with `hydration` set within a 200-turn cap, no clock, scope closed; `schedule` refused (TS2353) | gate (fixture) | same | Scratch copy with the diagnostics probe deleted: guard names `makeDiagnosticsFeed` | ⬜ pending |
| PROBE-04 | Host cache over `decisionCacheLayer()`: lookups `miss,hit`, 1 resolve, `size` 1; pre-0.13 literal refused (TS2345 under `@ts-expect-error`) | gate (tsc + run) | same | Directive line deleted (TS2345); delegation broken (`miss,miss`) | ⬜ pending |
| PROBE-05 | Each deliberate removal fails gate 14; DoD table unchanged | scratch, recorded | scratch copy variants under `.scratch/<name>/` (~7 s each); `node scripts/check-dod-table.mjs < /dev/null` | n/a (the variants are the RED) | ⬜ pending |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null` | n/a | ⬜ pending |
| WX-02/03 | Reserved ids only; CCR-QD-454 registered; no export change | spec gates | `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:api && pnpm spec:claims` | Cite CCR-QD-454 before its register row exists | ⬜ pending |
| WX-04 | No forbidden construct; oxlint clean on `scripts/` | lint | `pnpm lint < /dev/null` | n/a | ⬜ pending |
| WX-05 | Mutation/coverage scope untouched | git | `git diff <phase-base> --stat -- 'packages/*/src'` empty | n/a | ⬜ pending |
| WX-07 | No D-/phase numbers in shipped script lines; nothing released | grep | added lines of `scripts/` match no `D-[0-9]\|Phase [0-9]\|ARCH-[0-9]`; no `.changeset/` file added | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The guard's RED run at its own commit is the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Removed-probe failures | PROBE-05 | Scratch copies are recorded, not committed (a committed self-test would need its own sandbox install) | Run each variant from the plan; paste the exit code and the failure line into the SUMMARY; delete `.scratch/<name>/` afterwards |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
