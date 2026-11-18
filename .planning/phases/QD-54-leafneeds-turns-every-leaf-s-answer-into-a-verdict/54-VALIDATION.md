---
phase: "54"
slug: "leafneeds-turns-every-leaf-s-answer-into-a-verdict"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-18"
---

# Phase 54 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `54-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest`, fast-check, tstyche (`*.tst.ts`); Stryker for mutation |
| **Config file** | `vitest.config.ts` (root, `projects: ["packages/*"]`); `packages/core/vitest.config.ts` (`core`); `stryker.config.mjs` (core) |
| **Quick run command** | `pnpm exec vitest run --project core LeafVerdict LeafNeeds LeafMatrix Predicate Evaluate PortAccess < /dev/null` (repo root only) |
| **Full suite command** | `pnpm check:pr < /dev/null` (repo root, stdin closed) |
| **Estimated runtime** | quick ~5 s; full several minutes |

---

## Sampling Rate

- **After every task commit:** the quick command, scoped with `-t` to the task's tests, plus `pnpm typecheck` when a signature moves
- **After every plan wave:** `pnpm exec vitest run --project core < /dev/null`, `pnpm circular`, `pnpm lint`, `pnpm test:tstyche`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, then the mutation after-run and comparer, then the scoped greps. Never run Stryker alongside vitest or `check:pr`.
- **Max feedback latency:** ~10 seconds for the quick command

---

## Per-Task Verification Map

Task ids are filled in by the plans. Rows are per requirement.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| — | — | — | VERD-03 | outcome treated as held | every leaf tag × answer × polarity → allow/deny, exact reason, `policyTag`, through `evaluate`; folds agree through `toPredicate` (green on base and after) | unit | `pnpm exec vitest run --project core LeafVerdict < /dev/null` | ❌ W0 | ⬜ pending |
| — | — | — | VERD-03 | walk/translator disagree | `scope: "Any"` acted agreement stays green, unedited | property | `pnpm exec vitest run --project core Predicate -t "INV-QD-018" < /dev/null` | ✅ | ⬜ pending |
| — | — | — | VERD-01 | — | polarity map and verdict rule written once (scoped greps under `packages/core/src`) | shell | research Pitfall 6 greps, baseline measured first | ✅ | ⬜ pending |
| — | — | — | VERD-02 | new leaf with no row | one row per leaf tag; `isHeld` ≡ `holds`; missing row / wrong outcome refused | unit + type | `pnpm exec vitest run --project core LeafNeeds < /dev/null`; `pnpm test:tstyche` | ✅ file, ❌ new describe | ⬜ pending |
| — | — | — | VERD-04 | — | ADR-QD-167 extends 163; budgets unchanged | gate | `pnpm spec:verify:strict`; `pnpm lint`; `git diff <base> --stat -- scripts/check-house-style.mjs AGENTS.md` empty | ✅ | ⬜ pending |
| — | — | — | WX-01 | — | gate green | full | `pnpm check:pr < /dev/null` | ✅ | ⬜ pending |
| — | — | — | WX-02 | — | only reserved ids; next-id never run | shell | id diff grep over added lines; reservation file unchanged | ✅ | ⬜ pending |
| — | — | — | WX-03 | — | no export change | gate | `pnpm spec:api` | ✅ | ⬜ pending |
| — | — | — | WX-04 | — | no forbidden construct | gate | `pnpm lint` | ✅ | ⬜ pending |
| — | — | — | WX-05 | — | coverage ≥ 95% core; mutation not below base (D-10) | coverage + mutation | `pnpm coverage`; Stryker scoped run + `54-mutation.mjs compare` | ❌ W0 | ⬜ pending |
| — | — | — | WX-06 | — | characterisation before change | git | first `packages/core/src` commit after base is later than the `LeafVerdict.test.ts` commit | ✅ | ⬜ pending |
| — | — | — | WX-07 | — | patch changeset only | shell | `/usr/bin/grep -c Breaking .changeset/<new>.md` prints 0 | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `54-mutation.mjs` + `54-mutation-base.json`, recorded on the untouched green tree, committed before any test
- [ ] `packages/core/test/LeafVerdict.test.ts` — base characterisation, green on the base
- [ ] informational `Evaluate.bench.ts` run on the base, kept in the phase dir

Framework install: none.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
