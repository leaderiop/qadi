---
phase: "79"
slug: "feeds-and-the-dock-model-take-inputs-only-through-configure"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-24"
---

# Phase 79 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. It is seeded from `79-RESEARCH.md`'s "Validation Architecture" section, and the planner fills the per-task map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project `devtools`), `@effect/vitest`, `@testing-library/react`, happy-dom; tstyche for type pins; Stryker for mutation |
| **Config file** | `packages/devtools/vitest.config.ts` (project `devtools`), `tsconfig.tstyche.json`, `stryker.devtools.mjs` |
| **Quick run command** | `npx vitest run --project devtools packages/devtools/test/<dir>/<file>` (from the repo root) |
| **Full suite command** | `pnpm check:pr < /dev/null` (plus `pnpm spec:package` for gate 14's packed consumer, and the mutation `compare`) |
| **Estimated runtime** | about 5 s per test file; tstyche about 20 s per pass; `pnpm check:pr` about 15 to 20 min |

---

## Sampling Rate

- **After every task commit:** run the touched test file with the quick run command.
- **After every plan wave:** run `npx vitest run --project devtools` and `pnpm test:tstyche`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` must be green, `pnpm spec:package` must be green, and `79-mutation.mjs compare` must exit 0.
- **Max feedback latency:** 60 seconds per file.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by the planner) | | | CONF-01..06, WX-01..07 | T-79-NN | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx`: CONF-01. It uses its own harness, is written on the phase base and green there, and imports no Phase-80-edited helper.
- [ ] The Activity, StrictMode and first-configure-throw pins: CONF-04. Today's `useScoped` behaviour is characterised green on the base.
- [ ] `packages/devtools/test/builtFeeds.ts`: the four "build bare, then configure" fixture helpers.
- [ ] `79-mutation.mjs` with `79-mutation-base.json` measured first, on one commit, for `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `ExternalStore.ts` and `DockModel.ts`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The Activity pins on React 19.2.4 (the peer floor) | CONF-04 | The repo installs 19.3.1, and a React version matrix is not part of `pnpm check` | Deferred; recorded as a risk in ADR-QD-192 |

*Everything else has automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
