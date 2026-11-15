---
phase: "47"
slug: "port-facts-read-from-the-description"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-16"
---

# Phase 47: Validation Strategy

> The validation contract for feedback sampling during this phase's execution. Seeded from `47-RESEARCH.md` § Validation Architecture, with the user's decisions D-17..D-20 (47-CONTEXT.md).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Unit tests: vitest 5.1.0 with `@effect/vitest` (`it.effect`), projects `core` and `devtools`. Panels: `@testing-library/react` on happy-dom. Type pins: tstyche 7.2.5. Per-file mutation comparison: Stryker (`stryker.config.mjs` for core, `stryker.devtools.mjs` for devtools, each with `--mutate`). |
| **Config file** | `packages/core/vitest.config.ts`, `packages/devtools/vitest.config.ts`, `tstyche.json`, `stryker.config.mjs`, `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/Wiring.test.ts packages/devtools/test/model/PortCalls.test.ts packages/devtools/test/react/ServicesPanel.test.tsx`, plus the phase's new files. For core: `pnpm exec vitest run --project core packages/core/test/PortDefault.test.ts`. Always run from the repo root. |
| **Full suite command** | `pnpm check:pr < /dev/null` (all of `pnpm check` except `pnpm mutation`). The fast loop is `pnpm check:fast`. |
| **Type check** | `pnpm exec tsc -p tsconfig.test.json` (about 3 s warm) |
| **Estimated runtime** | Quick runs take about 5 s, the whole repo's tests about 17 s, `check:fast` about 2 minutes and `check:pr` about 5 minutes. |

---

## Sampling Rate

- **After every task commit:** the quick run for the files touched, plus `pnpm exec tsc -p tsconfig.test.json` after any `src` edit.
- **After the core fact:** `pnpm exec vitest run --project core --project devtools` and `pnpm circular`.
- **After every plan wave:** `pnpm check:fast`.
- **Before `/gsd-verify-work`:**
  - `pnpm check:pr < /dev/null` is green;
  - the Stryker comparison against `47-mutation-base.json` exits 0.
- **Max feedback latency:** 60 seconds.
- **RED files:** until its fixing task, a task's verify leaves the not-yet-fixed RED file out, naming it by exact path.

---

## Per-Task Verification Map

Each plan fills in its own tasks. The requirement map below is the contract.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| PFCT-02 | A spreading wrapper, renamed `audited <port>`, around each port's fail-closed default reads `defaulted: true`. This is RED on the base. | `it.effect` via `forEveryPort` | `pnpm exec vitest run --project devtools packages/devtools/test/model/WiringDefaulted.test.ts` | ❌ W0 (RED on base) | ⬜ pending |
| PFCT-01 | `isPortDefault` is true for each `nonePort` and through retrying, bounded, timingOut and recording wrappers (two orders, two depths). It is false for a real adapter, a fresh object, a default under another port, a shape with no mark, `undefined`, `null`, a string and a function. Only own properties count. | `it.effect` | `pnpm exec vitest run --project core packages/core/test/PortDefault.test.ts` | ❌ written test-first in the core plan (it cannot compile on the base) | ⬜ pending |
| PFCT-01 | The reader's signature | tstyche | `pnpm test:tstyche` | ❌ `packages/core/test/PortDefault.tst.ts`, in the core plan | ⬜ pending |
| PFCT-01 (D-17) | `decoratePorts`, and therefore `capturing`, carries the mark, so a captured default reads defaulted | `it.effect` | `pnpm exec vitest run --project devtools packages/devtools/test/model/Capture.test.ts` | ❌ new row, in the core plan | ⬜ pending |
| PFCT-01 | `isDefaultName` and `CONSEQUENCES` are gone | grep | `bash -c '! /usr/bin/grep -nE "isDefaultName\|CONSEQUENCES" packages/devtools/src/model/Wiring.ts'` | at close | ⬜ pending |
| PFCT-03 | Byte-exact text for the five consequence lines, every call-row branch, the `attempts` suffix, and the card's defaulted and real text | render | `pnpm exec vitest run --project devtools packages/devtools/test/react/ServicesPanel.reading.test.tsx` | ❌ W0 (green on base) | ⬜ pending |
| PFCT-03 / PFCT-04 | `ServicesPanel.tsx` names no port's span field | grep | `bash -c '! /usr/bin/grep -nE "call\.(attribute\|resolved\|event\|relation\|depth\|meaning\|signerRole\|matched\|scope\|name\|answer\|resourceId)" packages/devtools/src/react/ServicesPanel.tsx'` | at close | ⬜ pending |
| PFCT-04 (D-18) | `ROWS` is built by the one monomorphic, fully checked row helper (R6), with no widened implementation type. `PortCall` is derived from the registry (D-19). | typecheck + test | `pnpm exec tsc -p tsconfig.test.json`; `pnpm exec vitest run --project devtools packages/devtools/test/model/PortCalls.test.ts` | ✅ | ⬜ pending |
| PFCT-05 (D-12, D-19) | The sixth-port scratch run is recorded and reverted. The flagged list is the port-reading row, `ROWS`' entry, and `SimulationFields.ts` and `SimulationSource.ts`. | manual evidence in the SUMMARY | the recipe in 47-RESEARCH.md Q4; `git status` is clean afterwards | n/a | ⬜ pending |
| WX-01 | The merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ⬜ pending |
| WX-02 | Only reserved ids are used (ARCH-94, ADR-QD-160, CCR-QD-438, BEH-QD-571..575, INV-QD-339..340) | lint | `pnpm lint` (`[no-numbering-placeholder]`) | ✅ | ⬜ pending |
| WX-03 | The overview names `isPortDefault` | gate 13 | `pnpm spec:api` | ✅ | ⬜ pending |
| WX-04 | Nothing forbidden is added, and the budgets are unchanged | lint + scan | `pnpm lint`; `git diff <base> -- scripts/check-house-style.mjs` is empty | ✅ | ⬜ pending |
| WX-05 | Coverage holds, and no touched file's Stryker score drops | coverage + mutation | `pnpm coverage`; the two `--mutate` runs, then the comparer against `47-mutation-base.json` | ❌ W0 base | ⬜ pending |
| WX-06 | Tests come before the change | git order | The base JSON, the RED row and the characterisation precede the first `packages/*/src` edit | n/a | ⬜ pending |
| WX-07 | The changes are recorded (not Breaking) | file | `.changeset/*.md` with `"@qadi/core": minor` and `"@qadi/devtools": patch` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `47-mutation-base.json`, committed alone as the phase's first commit.
  - It holds base scores from two Stryker runs on the untouched tree (the reports on disk are stale).
  - Core: `PortDerivation.ts`, `PortDescription.ts`, `PortDoubles.ts`, `Ports.ts`.
  - Devtools: `model/Wiring.ts`, `model/PortCalls.ts`.
  - `ServicesPanel.tsx` is not instrumentable, because `stryker.devtools.mjs` mutates `src/model/**` only.
- [ ] `packages/devtools/test/model/WiringDefaulted.test.ts`: the RED row. It compiles on the base, and its RED output goes in the SUMMARY.
- [ ] `packages/devtools/test/react/ServicesPanel.reading.test.tsx`: the byte-exact characterisation, green on the base.
- [ ] In the core plan (not Wave 0, per research Pitfall 1), written test-first:
  - `packages/core/test/PortDefault.test.ts`;
  - `packages/core/test/PortDefault.tst.ts`;
  - the `Capture.test.ts` row.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A scratch sixth port flags only the expected devtools files | PFCT-05 | The scratch port is evidence, not a committed fixture (D-12) | Apply the recipe from 47-RESEARCH.md Q4 and run `pnpm exec tsc -p tsconfig.test.json`. Record the flagged files in the SUMMARY, run `git checkout -- <files>`, and confirm `git status` is clean. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
