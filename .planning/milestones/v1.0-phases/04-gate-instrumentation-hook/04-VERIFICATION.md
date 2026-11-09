---
phase: 04-gate-instrumentation-hook
verified: 2026-11-09T22:30:00Z
status: passed
score: 11/11 must-haves verified
covered_files:
  - ".planning/phases/04-gate-instrumentation-hook/04-01-PLAN.md"
  - ".planning/phases/04-gate-instrumentation-hook/04-01-SUMMARY.md"
  - ".planning/phases/04-gate-instrumentation-hook/04-02-PLAN.md"
  - ".planning/phases/04-gate-instrumentation-hook/04-02-SUMMARY.md"
  - ".planning/phases/04-gate-instrumentation-hook/04-03-PLAN.md"
  - ".planning/phases/04-gate-instrumentation-hook/04-03-SUMMARY.md"
  - ".planning/phases/04-gate-instrumentation-hook/04-04-PLAN.md"
  - ".planning/phases/04-gate-instrumentation-hook/04-04-SUMMARY.md"
  - "packages/react/src/GateWriter.ts"
  - "packages/react/src/MissingQadiProviderError.ts"
  - "packages/react/src/QadiProvider.tsx"
  - "packages/react/src/hooks.ts"
  - "packages/react/src/useGate.ts"
  - "packages/react/test/GateWriter.kinds.test.tsx"
  - "packages/react/test/GateWriter.useGates.test.tsx"
  - "packages/react/test/hooks.rerender.test.tsx"
covered_digest: "v4:sha256:34cac2c5ddc44e50239db26885da6e1310a3acdcaba0a25954683f36809d98d9"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 11/11
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 4: Gate instrumentation hook Verification Report

**Phase Goal:** Gate instrumentation is one hook over a writer the provider resolved once, so each gate kind's hook is a thin caller.
**Verified:** 2026-11-09
**Status:** passed
**Re-verification:** Yes, milestone-close re-run. The earlier report went stale because `packages/react/test/GateWriter.useGates.test.tsx` was edited afterwards (commit `c971916`, the WR-01 fix).

## What changed since the last report

Only `GateWriter.useGates.test.tsx` changed (81 lines): a second, cold-suspend case was added to the `useDecisionSuspense` open-count pin, and the file header was corrected (IN-04). No source file in the covered set changed. `git diff 127d6fa HEAD` touches nothing outside `.planning/`. The change strengthens the evidence for truth 10; it weakens nothing.

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1  | SC1: `gateWriterFor(` is called from exactly one place in `packages/react/src` | VERIFIED | `grep gateWriterFor packages/*/src` gives the definition (`GateWriter.ts:194`) and one call, `QadiProvider.tsx:237` (`instrument ? gateWriterFor(gates) : undefined`). |
| 2  | SC2: `useGate` and `useQuestionsAs` hold no `GateIdentity` construction | VERIFIED | grep for `GateIdentity`, `useId`, `useRef`, `useGateRegistration`, `atoms.decision` and `wraps` in `hooks.ts`, `useGate.ts` and `components.tsx` returns only comments. Identity, the wrap rule, marker and registration live in `useGates`. |
| 3  | SC3: a test pins how often `usePolicies` re-creates its group atom across re-renders | VERIFIED | `hooks.rerender.test.tsx` passes in my targeted run (4 files, 25 tests). |
| 4  | SC4: with `instrument` off, the existing React suite passes untouched | VERIFIED | `git diff --name-status ffa7b37..HEAD -- packages/react/test` shows the phase's three files as `A`. The `M` entries (`Hydration.tst.ts`, `HydrationEngine.test.ts`, `HydrationPayload.test.ts`) come from phase 6 (`e124896`, ARCH-51), not this phase. `pnpm vitest run --project react` gives 23 files, 366 tests green. |
| 5  | SC5: `pnpm check:pr` green; ADR-QD-111, CCR-QD-388 and a changeset recorded | VERIFIED | `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md`, `spec/README.md:326` (CCR-QD-388) and `.changeset/gate-hook.md` exist. The full `pnpm check` ran green in CI (run 42676403473 at 127d6fa) and no non-`.planning` file has changed since. |
| 6  | The writer reaches gates through an internal `GateScopeContext`, and nothing new is exported from the barrel | VERIFIED | `QadiProvider.tsx` imports `GateScopeContext` from `GateWriter.ts` (out of the barrel). `pnpm spec:api` reports 863 exports documented, no failure. |
| 7  | `useGates(kind, questions)` owns the grouped read, atom lookup, identity, wrap rule, marker ref and registration | VERIFIED | `GateWriter.useGates.test.tsx` and `GateWriter.kinds.test.tsx` exercise it and pass. |
| 8  | An instrumented `<Can>` registers one instance whose element is the marker span; an uninstrumented one registers nothing | VERIFIED | Both suites pass. The 361-test React suite (existing tests untouched) still holds the uninstrumented behaviour. |
| 9  | A gate outside a provider throws `MissingQadiProviderError` naming its kind | VERIFIED | Test "a gate outside a provider throws..." passes. `pnpm circular` reports no cycle. |
| 10 | `useDecisionSuspense` opens its decision atom once | VERIFIED | Two tests now pin it. The warm-path test asserts exactly one open. The new cold-suspend test (`c971916`) holds the port, makes the probe the sole asker so it really suspends, and asserts `opened <= attempts` across suspend and retry, that the fallback shows with no instance registered, and that one instance registers after release. This closes the WR-01 gap the earlier report carried as a caveat. Both pass. |
| 11 | Changing one entry of a grouped hook re-registers that entry alone; each of the eight kinds registers once under its own kind | VERIFIED | `GateWriter.kinds.test.tsx` passes. |

**Score:** 11/11 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `packages/react/src/GateWriter.ts` | VERIFIED | Defines `gateWriterFor`, `GateScopeContext`, `useGates`; imported by `QadiProvider.tsx`, `useGate.ts` and `hooks.ts`. |
| `packages/react/src/MissingQadiProviderError.ts` | VERIFIED | Leaf module, used by `GateWriter.ts`. |
| `packages/react/src/QadiProvider.tsx` | VERIFIED | Resolves the writer once at line 237. |
| `packages/react/src/useGate.ts`, `hooks.ts` | VERIFIED | Thin delegations to `useGates`. |
| `packages/react/test/{GateWriter.useGates,GateWriter.kinds,hooks.rerender}.test.tsx` | VERIFIED | Present, substantive, passing. |
| ADR-QD-111, CCR-QD-388, `.changeset/gate-hook.md` | VERIFIED | All present. |

### Key Link Verification

| From | To | Status |
| ---- | -- | ------ |
| `QadiProvider.tsx` | `GateScopeContext` / `gateWriterFor` | WIRED (import line 40, call line 237) |
| `useGate.ts` | `useGates` | WIRED |
| `hooks.ts` | `useGates` | WIRED |
| `components.tsx` (`Can`, `Cannot`) | `useGate` marker ref | WIRED |

### Data-Flow Trace (Level 4)

`useGates` reads `useAtomValue(scope.atoms.decisions(questions))` from the real atom set, and registers into the registry the provider owns via the resolved writer. Tests read real decisions (`Allow`) and real registry instances. Status: FLOWING.

### Behavioral Spot-Checks

All run by me in this re-verification.

| Check | Result | Status |
| ----- | ------ | ------ |
| `pnpm vitest run` (packages/react) on `GateWriter.useGates`, `GateWriter.kinds`, `hooks.rerender`, `GateWriter` test files | 4 files, 25 tests passed | PASS |
| `pnpm vitest run --project react` (repo root) | 23 files, 366 tests passed | PASS |
| `pnpm typecheck` | exit 0 on the confirming run. One earlier run printed a TS6133 in `packages/http/src/AuthorizeRequest.ts`, which a re-run did not reproduce (0 errors, exit 0); that file is untouched by this phase and the symbol is read at line 102, so I take it as a stale incremental-build artefact. | PASS |
| `pnpm circular` | no circular dependency found | PASS |
| `pnpm spec:api` | 863 exports documented | PASS |
| Whole `pnpm check` | green in CI run 42676403473 at 127d6fa; no non-`.planning` file changed since | PASS (external evidence) |

Note: running `pnpm vitest run` from inside `packages/react` fails `test/HydrationEngine.test.ts` with "Cannot read properties of undefined (reading 'config')" before any test runs. That is a per-package invocation quirk, not a test failure: the same file passes under the root `--project react` run. It is a phase-6 file and not in this phase's covered set.

### Probe Execution

Step 7c: SKIPPED. The phase declares no probe scripts.

### Requirements Coverage

| Requirement | Source plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| GATE-01 | 04-01, 04-04 | SATISFIED | Single `gateWriterFor(` call at `QadiProvider.tsx:237`. |
| GATE-02 | 04-01, 04-02 | SATISFIED | `useGates` owns the lookup, identity, wrap rule and marker. |
| GATE-03 | 04-01, 04-02 | SATISFIED | `useGate` and `useQuestionsAs` are thin callers; `useDecisionSuspense` opens its atom once, now pinned on the warm and cold paths. |
| GATE-04 | 04-02 | SATISFIED | `hooks.rerender.test.tsx` pins `usePolicies`; finding recorded in CCR-QD-388. |
| GATE-05 | 04-01, 04-02, 04-04 | SATISFIED | Phase tests are additions only; React suite green. |
| XC-01 | 04-04 | SATISFIED | CI ran the whole `pnpm check` green at 127d6fa, which resolves the earlier "no uninterrupted exit 0" note. |
| XC-02 | 04-03 | SATISFIED | ADR-QD-111, CCR-QD-388 (`spec/README.md:326`), changeset present. |
| XC-03 | 04-03 | SATISFIED | `pnpm spec:api` passes. |
| XC-04 | 04-01, 04-02, 04-04 | SATISFIED | No `switch` or `fnUntraced` in `GateWriter.ts`; house-style gate is part of the green CI `pnpm check`. |
| XC-05 | 04-02, 04-04 | SATISFIED | Coverage gate is part of the green CI `pnpm check`. |

No orphaned requirements. REQUIREMENTS.md maps GATE-01..05 and XC-01..05 to Phase 4 and each appears in a PLAN's `requirements:` field.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
| ---- | ------- | -------- | ------ |
| `packages/react/src/GateWriter.ts` | `useGateRegistration` has no src caller (IN-01) | Info | Dead code in a non-exported module. |
| `packages/react/src/QadiProvider.tsx` | stale comment on the `useAtomValue` re-export (IN-02) | Info | Documentation only. |
| `GateWriter.ts` `atomOf`, provider effect | dependency arrays omit values, argued in a comment (IN-03) | Info | Sound today. |

WR-01 is `fixed` and IN-04 (the test header) was corrected in `c971916`. IN-01 to IN-03 remain `open` in `04-REVIEW-DISPOSITION.md`, info-level and non-blocking. No TBD, FIXME or XXX markers in the covered files.

### Human Verification Required

None.

### Gaps Summary

No gaps. The phase goal still holds on today's code: `QadiProvider` resolves the writer once, `useGates` is the single owner of identity, wrap rule, marker and registration, and `useGate` and `useQuestionsAs` (and so every gate kind) are one-line callers. The only change since the last verification strengthened the test evidence for `useDecisionSuspense`.

---

_Verified: 2026-11-09_
_Verifier: Claude (gsd-verifier)_
