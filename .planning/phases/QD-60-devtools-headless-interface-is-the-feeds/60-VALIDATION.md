---
phase: "60"
slug: "devtools-headless-interface-is-the-feeds"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-19"
---

# Phase 60 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `60-RESEARCH.md` § Validation Architecture and CONTEXT D-01..D-18.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest` (project `devtools`); tstyche (`*.tst.ts`); Stryker via `stryker.devtools.mjs` (with `--mutate`, never edited) |
| **Config file** | `packages/devtools/vitest.config.ts`; root `vitest.config.ts` (coverage); `tstyche.json`; `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/TimelineFeed.test.ts packages/devtools/test/model/DiagnosticsFeed.test.ts packages/devtools/test/model/GatesFeed.test.ts packages/devtools/test/model/DiagnosticsStore.test.ts packages/devtools/test/surface.test.ts < /dev/null` (repo root) |
| **Type tests** | `pnpm exec tstyche packages/devtools/test/surface.tst.ts packages/devtools/test/model/DiagnosticsStore.tst.ts < /dev/null` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | quick ~1 s; type tests ~3 s; devtools project ~30 s |

---

## Sampling Rate

- **After every task commit:** run the quick command, the type tests and `node scripts/check-house-style.mjs`.
- **After every plan wave:** run these in order:
  1. `pnpm exec vitest run --project devtools < /dev/null`
  2. `pnpm typecheck`
  3. `node scripts/check-api-surface.mjs`
  4. `node scripts/check-doc-examples.mjs`
  5. `node scripts/check-website-doc-examples.mjs`
  6. `pnpm lint`
  7. `pnpm circular`
- **Before `/gsd-verify-work`:**
  1. Run `pnpm check:pr < /dev/null`.
  2. Run `node scripts/check-package-install.mjs`.
  3. Run the scoped Stryker run, then the mutation compare. Never run Stryker beside vitest or check:pr.
- **Max feedback latency:** ~30 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by the planner from the plans' `<verify>` blocks) | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HDLS-01 | Owner checkpoint recorded (D-01..D-03, D-12) | record | `60-CONTEXT.md`, ADR-QD-173 | yes / Wave 3 |
| HDLS-02 | Root exports the three feeds; the four pair functions, `noDiagnostics` and `DiagnosticsStore` are gone | unit + type | `vitest … surface.test.ts`; `tstyche surface.tst.ts` | yes (edit) |
| HDLS-02 | The packed root builds a feed | gate | `node scripts/check-package-install.mjs` | yes (extend consumer) |
| HDLS-03 | One `DiagnosticsOptions`; no `schedule`; not generic | type + unit | `tstyche DiagnosticsStore.tst.ts`; `vitest … DiagnosticsStore.test.ts` | yes (edit) |
| HDLS-03 | README headless example compiles | gate | `node scripts/check-doc-examples.mjs` | yes |
| HDLS-04 | Feed suites run against the root entry | unit | `vitest … TimelineFeed DiagnosticsFeed GatesFeed` | yes (re-point) |
| HDLS-04 | Overview matches the interface | gate | `node scripts/check-api-surface.mjs` | yes |
| WX-05 | Touched model files' mutation scores do not fall | mutation | `pnpm exec stryker run stryker.devtools.mjs --mutate '<5 files>'` + `node <D>/60-mutation.mjs compare` | Wave 0 |
| (no behaviour change) | Dock unchanged; characterisation goldens untouched | unit | `pnpm exec vitest run --project devtools < /dev/null` | yes |

---

## Wave 0 Requirements

- [ ] `60-mutation.mjs` and `60-mutation-base.json`, measured on the untouched tree (D-08 step 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
