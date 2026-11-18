---
phase: "53"
slug: "one-module-owns-the-value-a-leaf-compares"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-18"
---

# Phase 53 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `53-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest`, fast-check, tstyche (`*.tst.ts`); Stryker for mutation |
| **Config file** | `vitest.config.ts` (root, `projects: ["packages/*"]`); `packages/core/vitest.config.ts` (`core`); `stryker.config.mjs` (core) |
| **Quick run command** | `pnpm exec vitest run --project core Operand Predicate Matcher Layers CustomPredicate FieldPath Evaluate PortAccess < /dev/null` (repo root only) |
| **Full suite command** | `pnpm check:pr < /dev/null` (repo root, stdin closed) |
| **Estimated runtime** | quick ~5 s; full several minutes |

---

## Sampling Rate

- **After every task commit:** the quick command, scoped with `-t` to the task's tests, plus `pnpm typecheck` when a signature moves
- **After every plan wave:** `pnpm exec vitest run --project core < /dev/null`, `pnpm exec vitest run --project predicate-sql --project predicate-prisma < /dev/null`, `pnpm circular`, `pnpm lint`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, then the mutation after-run and comparer, then the OPND-03 scoped grep. Never run Stryker alongside vitest or `check:pr`.
- **Max feedback latency:** ~10 seconds for the quick command

---

## Per-Task Verification Map

Task ids are filled in by the plans. Rows are per requirement.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 53-TBD | — | — | OPND-01 | prototype-named key | `evaluatePredicate` denies the row `evaluate` denies (RED on base) | unit | `pnpm exec vitest run --project core Predicate -t "prototype-named column" < /dev/null` | ❌ W0 | ⬜ pending |
| 53-TBD | — | — | OPND-01 (D-02) | fixture fail-open | `attributeResolverFromRecord` denies a non-own name (RED on base) | unit | `pnpm exec vitest run --project core Layers < /dev/null` | ❌ W0 | ⬜ pending |
| 53-TBD | — | — | OPND-01 (D-02) | decision as defect | `customPredicateFromRecord` fails with `CustomPredicateError`, never dies (RED on base) | unit | `pnpm exec vitest run --project core CustomPredicate < /dev/null` | ❌ W0 | ⬜ pending |
| 53-TBD | — | — | OPND-02 | — | `Operand.ts` exists, has no imports, is out of the barrel, makes no cycle | unit + shell | `pnpm exec vitest run --project core Operand < /dev/null`; `pnpm circular` | ❌ W0 | ⬜ pending |
| 53-TBD | — | — | OPND-03 | — | no code-line `Object.hasOwn`, no mirroring comment, no bare `table[attribute]`/`table[name]`/`row[p.column]` in the 8 files | shell | scoped grep in `53-RESEARCH.md` § Validation Architecture (baseline: 6 code lines) | ✅ | ⬜ pending |
| 53-TBD | — | — | OPND-04 | prototype-named key | `evaluate` ≡ `evaluatePredicate ∘ toPredicate` over prototype names; engine suites green | property | `pnpm exec vitest run --project core Predicate -t "prototype names" < /dev/null`; `pnpm exec vitest run --project predicate-sql --project predicate-prisma EngineAgreement < /dev/null` | ❌ W0 / ✅ | ⬜ pending |
| 53-TBD | — | — | OPND-05 | — | ADR-QD-166 extends 091/024; INV-QD-091 restated | spec gates | `pnpm spec:verify:strict`; `pnpm spec:gates` | ❌ | ⬜ pending |
| 53-TBD | — | — | WX-01 | — | gate green | full | `pnpm check:pr < /dev/null` | ✅ | ⬜ pending |
| 53-TBD | — | — | WX-02 | — | only reserved ids; next-id never run | shell | id diff grep in `53-RESEARCH.md`; reservation file unchanged | ✅ | ⬜ pending |
| 53-TBD | — | — | WX-03 | — | gate 13 | gate | `pnpm spec:api` | ✅ | ⬜ pending |
| 53-TBD | — | — | WX-04 | — | no forbidden construct; budgets unmoved | shell + gate | `pnpm lint`; `git diff <base> --stat -- scripts/check-house-style.mjs` empty | ✅ | ⬜ pending |
| 53-TBD | — | — | WX-05 | — | coverage and mutation not below base (D-14 rule) | coverage + mutation | `pnpm coverage`; Stryker scoped run + comparer vs `53-mutation-base.json` | ❌ base JSON | ⬜ pending |
| 53-TBD | — | — | WX-06 | — | RED committed before any `src` change | git | first `packages/core/src` commit after base is later than the RED commit | ❌ | ⬜ pending |
| 53-TBD | — | — | WX-07 | — | no Breaking entry; one `@qadi/core` patch changeset | shell | `/usr/bin/grep -c Breaking .changeset/<new>.md` prints 0 | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/core/test/Operand.test.ts` — own / inherited / `JSON.parse`-own `__proto__` for each function; `getByPath` boundary pins moved from `Matcher.test.ts`; re-export identity (RED on base by import)
- [ ] RED tests in `Predicate.test.ts` (OPND-01, D-11 property), `Layers.test.ts`, `CustomPredicate.test.ts`
- [ ] GREEN characterisation on the base: own-`undefined` attribute skips the resolver (scripted resolver call count); `projectAt` keeps an own `undefined` and skips `constructor`; `ResourceRef` prototype paths through `evaluate`
- [ ] `53-mutation-base.json` recorded on the green tree before the RED commit

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
