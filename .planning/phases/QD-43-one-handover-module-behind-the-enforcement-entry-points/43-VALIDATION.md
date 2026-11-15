---
phase: "43"
slug: "one-handover-module-behind-the-enforcement-entry-points"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-15"
---

# Phase 43: Validation Strategy

> The per-phase validation contract for feedback sampling during execution. It is seeded from `43-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 + `@effect/vitest` 4.1.2 (projects `core` and `promise`); tstyche 7.2.5 for `*.tst.ts`; Stryker (`stryker.config.mjs`) for the per-file comparison |
| **Config file** | root `vitest.config.ts` (core held at 95%), `packages/core/vitest.config.ts`, `tstyche.json`, `stryker.config.mjs` |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/Qadi.test.ts packages/core/test/Handover.test.ts`, then `pnpm exec tsc -p tsconfig.test.json`, then `pnpm circular` |
| **Type-test command** | `pnpm exec tstyche packages/core/test/Qadi.tst.ts`; `pnpm exec tstyche packages/promise/test/Facade.tst.ts`; all: `pnpm test:tstyche` |
| **Full suite command** | `pnpm exec vitest run --project core && pnpm exec vitest run --project promise && pnpm lint && pnpm test:tstyche`, then `pnpm check:pr < /dev/null` at the phase gate |
| **Estimated runtime** | quick about 10 s; full suite about 30 s; `check:pr` about 5 minutes |

---

## Sampling Rate

- **After every task commit:** run the quick command. While the RED tstyche files are intentionally RED, exclude them, and run them only in the task that fixes them.
- **After every plan wave:** run the full suite command.
- **Before `/gsd-verify-work`:**
  - `pnpm check:pr < /dev/null` is green;
  - `pnpm spec:website-examples` is run explicitly;
  - the Stryker comparison against `43-mutation-base.json` exits 0.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

Task IDs are filled in by the planner; the requirement rows are fixed here.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| HAND-02 | `guard` and the four `filter*` refuse `{ resource }`: RED on the base, GREEN after (use the `Parameters<…>` / `toBeAssignableFrom` form for `filter*`) | tstyche | `pnpm exec tstyche packages/core/test/Qadi.tst.ts` | extend (W0) | ⬜ pending |
| HAND-02 | promise `filter`/`filterProjected` refuse `resource` | tstyche | `pnpm exec tstyche packages/promise/test/Facade.tst.ts` | ❌ W0 | ⬜ pending |
| HAND-03 | the released value is the decided value for all ten entry points, and per item for `filter*` | unit (table) | `pnpm exec vitest run --project core packages/core/test/Handover.test.ts` | ❌ W0 | ⬜ pending |
| HAND-04 | discharge comes before the work; `filter*` partitions; array and stream agree; order holds under `concurrency`; a denial hands nothing over; `UndischargedObligation` comes before handover | unit (table) | same file | ❌ W0 | ⬜ pending |
| HAND-04 | span names are unchanged (allow: `qadi.evaluate` then `qadi.discharge`; deny: `qadi.evaluate`) | unit | `pnpm exec vitest run --project core packages/core/test/Handover.test.ts -t "spans"` | ❌ W0 | ⬜ pending |
| HAND-01 | `Handover.ts` is a leaf with no cycle; `permitted` and `decideOne` are gone; the allow/deny branch and `project(` each appear once in added code | cycle + scoped grep | `pnpm circular`; `/usr/bin/grep -cE "decideOne\|permitted" packages/core/src/Qadi.ts` = 0 | after the module | ⬜ pending |
| HAND-05 | no `guard`/`filter*` call passes `resource` | typecheck + fence gates | `pnpm exec tsc -p tsconfig.test.json && pnpm spec:examples && pnpm spec:website-examples` | ✅ | ⬜ pending |
| HAND-06 | ADR-QD-156; INV-QD-108/032/009/013 restated; traceability updated | spec gates | `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims` | after records | ⬜ pending |
| WX-01 | the merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ⬜ pending |
| WX-02 | only reserved numbers are used | git grep | `bash -c "git grep -lE 'ADR-QD-156\|CCR-QD-434\|BEH-QD-55[1-5]\|INV-QD-33[12]' -- spec packages .changeset"` | ✅ | ⬜ pending |
| WX-03 | overview names `HandoverOptions` and drops `LoadedEnforceOptions` | gate 13 | `pnpm spec:api` | ✅ | ⬜ pending |
| WX-04 | nothing forbidden is added; budgets are unchanged | lint + scoped grep | `pnpm lint`; `git diff <base> -- scripts/check-house-style.mjs` is empty | ✅ | ⬜ pending |
| WX-05 | coverage, and no per-file Stryker drop | coverage + mutation | `pnpm coverage`; scoped Stryker on `Qadi.ts` and `Handover.ts`, then the comparer against `43-mutation-base.json` | base in W0 | ⬜ pending |
| WX-06 | tests come before the change | git order | the RED/characterisation/base-Stryker commits come before the first `packages/core/src` edit | W0 | ⬜ pending |
| WX-07 | Breaking changesets and `upgrading.md` | file + gate | the `.changeset/*.md` entries (`@qadi/core` minor, `@qadi/promise` minor, **Breaking**); `pnpm spec:website-examples` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/core/test/Qadi.tst.ts`: the five refusals (RED on the base), and the `LoadedEnforceOptions` positives prepared for the rename
- [ ] `packages/promise/test/Facade.tst.ts`: new; the promise refusals (RED)
- [ ] `packages/core/test/Handover.test.ts`: new; the ten-row characterisation table (green before and after), the positional-resource defence, and the span pin
- [ ] `43-mutation-base.json`: the base Stryker score for `Qadi.ts`, with `Handover.ts` recorded as `moved`

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` is set in the frontmatter

**Approval:** pending
