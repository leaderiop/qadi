---
phase: 04-gate-instrumentation-hook
verified: 2026-11-08T06:15:00Z
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
covered_digest: "v4:sha256:c1641092e7b4301b35dff54d5be596f5da039bf48164385a87e2218ffb915c3f"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 4: Gate instrumentation hook Verification Report

**Phase Goal:** Gate instrumentation is one hook over a writer the provider resolved once, so each gate kind's hook is a thin caller.
**Verified:** 2026-11-08
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1  | SC1: `gateWriterFor(` is called from exactly one place in `packages/react/src` | VERIFIED | `grep -rn gateWriterFor packages/` finds one call, `QadiProvider.tsx:237` (`instrument ? gateWriterFor(gates) : undefined`, in a `useMemo`). The other src hit is the definition at `GateWriter.ts:194`. The remaining hits are in tests. |
| 2  | SC2: `useGate` and `useQuestionsAs` hold no `GateIdentity` construction | VERIFIED | grep for `GateIdentity\|useId\|useRef\|useGateRegistration\|atoms.decision\|.decisions(\|wraps` in `hooks.ts`, `useGate.ts` and `components.tsx` returns no code hits. `useGate` is `useGates(kind, questions).entries.question`. `useQuestionsAs` is `useGates(kind, questions).results`. Identity, the `wraps` rule, the marker ref and registration are all in `useGates` (`GateWriter.ts`). |
| 3  | SC3: a test pins how often `usePolicies` re-creates its group atom across re-renders | VERIFIED | `hooks.rerender.test.tsx` builds inline fresh policies over 3 equal re-renders, instrumented and uninstrumented. It asserts `groups.size === 1`, no further `decision` lookup, no registry notification and the same instance ids. The atom set is a spread copy whose `decision` and `decisions` properties are recorded. It was git-ordered before the `useQuestionsAs` move (`e173f4a` precedes `9c9ebaa`). It passes. |
| 4  | SC4: with `instrument` off, the existing React suite passes untouched | VERIFIED | `git diff --name-status ffa7b37..HEAD` shows `packages/react/test` changes of exactly 3 `A` (added) files and no `M`. `pnpm vitest run --project react` gives 23 files and 361 tests green. Uninstrumented `<Can>` registers nothing and renders no marker; `ref` is `undefined` when `scope.writer === undefined`. |
| 5  | SC5: `pnpm check:pr` green; ADR-QD-111, CCR-QD-388 and a changeset recorded | VERIFIED, with a caveat | Every check:pr step passes when run, see Behavioral Spot-Checks. The one uninterrupted `pnpm check:pr` exit 0 was not observed (the Playwright sudo prompt), see the XC-01 note. ADR-QD-111 exists (`spec/decisions/111-...md`). CCR-QD-388 is at `spec/README.md:326`. `.changeset/gate-hook.md` exists (`@qadi/react` patch). |
| 6  | The writer reaches gates through an internal `GateScopeContext`, not the public `QadiContextValue`, and nothing new is exported from the barrel | VERIFIED | `QadiProvider.tsx:359-365` provides `GateScopeContext` nested inside `QadiContext.Provider`. `GateScopeContext` is declared in `GateWriter.ts`, which is out of the barrel. `pnpm spec:api` gives 862 exports documented, exit 0. |
| 7  | `useGates(kind, questions)` owns the grouped read, atom lookup, identity, wrap rule, marker ref and registration | VERIFIED | `GateWriter.ts` `useGates`: `KIND_FACTS` Record over `GateKind` (a ninth kind is a compile error), `useAtomValue(group)`, one `atomOf` lookup memoised on the group, identities, `marker` ref, `useGateRegistrations`. Only `Can` and `Cannot` have `wraps: true`. |
| 8  | An instrumented `<Can>` registers one instance whose element is the `[data-qadi-gate]` span; an uninstrumented one registers nothing | VERIFIED | `GateWriter.useGates.test.tsx` and `GateWriter.kinds.test.tsx` pass. The example app's Playwright suite (lens, SSR and uninstrumented-guard specs) passed 30 of 30 on my own run. |
| 9  | A gate outside a provider throws `MissingQadiProviderError` naming its kind | VERIFIED | `useGateScope` throws `new MissingQadiProviderError(kind)`. The class moved to the leaf `MissingQadiProviderError.ts` and `QadiProvider.tsx:114` re-exports it by name, so `instanceof` holds. A test covers it. `pnpm circular` is clean. |
| 10 | `useDecisionSuspense` opens its decision atom once | VERIFIED (caveat WR-01) | Code: `useDecisionSuspense` takes `{ atom }` from `useGate` and calls no opener of its own. Test: `GateWriter.useGates.test.tsx` asserts the opener count is 1 for a mounted probe. The pin runs on a warm path (a sibling `<Can>` settles the atom first), as WR-01 says. I wrote and deleted a scratch cold-start probe, the probe as the sole asker with instrumentation on. It gave `opened=1 renders=1` and one registered instance. The cold path never actually suspended in that probe, so a genuine suspend-retry remains unexercised. The risk is bounded. A retry discards render-local `useMemo` state under any hook, and the duplicate opener that was removed was a per-render second lookup. |
| 11 | Changing one entry of a grouped hook re-registers that entry alone; each of the eight kinds registers once under its own kind | VERIFIED | `GateWriter.kinds.test.tsx` is a table over all eight kinds plus the per-entry precision pin. It passes in the 361-test run. `useGateRegistrations` diffs per `id` through `sameIdentity` (BEH-QD-068). |

**Score:** 11/11 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/react/src/GateWriter.ts` | `useGates`, `GateScopeContext`, `GateAtoms`, `KIND_FACTS` | VERIFIED | Substantive and wired. Coverage is 100% statements and 100% lines. |
| `packages/react/src/MissingQadiProviderError.ts` | cycle-free leaf | VERIFIED | Imported by `GateWriter.ts` and re-exported by `QadiProvider.tsx`. |
| `packages/react/src/QadiProvider.tsx` | one writer resolution, provides scope | VERIFIED | Line 237 (resolve) and lines 359-365 (provide). |
| `packages/react/src/useGate.ts`, `hooks.ts` | thin callers | VERIFIED | Both are one-line delegations to `useGates`. |
| `packages/react/test/{GateWriter.useGates,GateWriter.kinds,hooks.rerender}.test.tsx` | pins | VERIFIED | Present, substantive and passing. |
| `spec/decisions/111-*.md`, `.changeset/gate-hook.md`, CCR-QD-388 row | records | VERIFIED | All present. `spec:verify:strict` gives 21 PASS, 0 FAIL. |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `QadiProvider.tsx` | `GateScopeContext` | `<GateScopeContext.Provider value={gateScope}>` | WIRED |
| `useGate.ts` | `useGates` | `useGates(kind, questions).entries.question` | WIRED |
| `hooks.ts` | `useGates` | `useGates(kind, questions).results` | WIRED |
| `components.tsx` (`Can`, `Cannot`) | `useGate` | the marker `ref` comes from the gate read | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
| -------- | ---- | ------ | --------- | ------ |
| `useGates` | `results` | `useAtomValue(scope.atoms.decisions(questions))`, the real atom set | Yes. The Playwright run shows real allows and denies. | FLOWING |
| `useGates` | `scope.writer` | the provider's `gateWriterFor(gates)` over the owned registry | Yes. Instances reach `gates.instances()`. | FLOWING |

### Behavioral Spot-Checks

All run by me in this verification, none taken from SUMMARY.md.

| Check | Result | Status |
| ----- | ------ | ------ |
| `pnpm vitest run --project react` | 23 files, 361 tests passed | PASS |
| `pnpm typecheck` | exit 0 | PASS |
| `pnpm lint` (house-style) | 403 files clean, 3 declared switches. The warnings are pre-existing, in untouched files. | PASS |
| `pnpm circular` | no circular dependency found | PASS |
| `pnpm test:tstyche` | 148 passed | PASS |
| `pnpm coverage` | 99.06% statements, 96.76% branches. `GateWriter.ts` 100% statements. Thresholds hold. | PASS |
| `pnpm test:bdd` | 559 passed | PASS |
| `pnpm spec:examples` | 101 blocks compile | PASS |
| `pnpm spec:verify:strict` | 21 PASS, 0 FAIL, 0 SKIP | PASS |
| `pnpm spec:gates`, `spec:claims`, `spec:api` | all green | PASS |
| `pnpm spec:package` | 9 packages pack, resolve and authorize | PASS |
| example app: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` | 42 unit tests and `next build` pass. **Playwright 30 of 30.** | PASS |
| `pnpm spec:website-examples`, `pnpm website`, `pnpm spec:publish` | 40 blocks, 45 pages built, versions agree | PASS |

### Probe Execution

Step 7c: SKIPPED. No probe scripts are declared by the phase.

### Requirements Coverage

| Requirement | Source plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| GATE-01 | 04-01, 04-04 | SATISFIED | One `gateWriterFor(` call, in `QadiProvider.tsx:237`. |
| GATE-02 | 04-01, 04-02 | SATISFIED | `useGates` owns the lookup, identity, wrap rule and marker. |
| GATE-03 | 04-01, 04-02 | SATISFIED | `useGate` and `useQuestionsAs` are thin callers, and `useDecisionSuspense` opens its atom once (see the WR-01 caveat on test strength). |
| GATE-04 | 04-02 | SATISFIED | `hooks.rerender.test.tsx` pins that `usePolicies` re-creates nothing. The finding is recorded in CCR-QD-388. |
| GATE-05 | 04-01, 04-02, 04-04 | SATISFIED | No existing test was modified. 361 React tests pass. Off means no marker. |
| XC-01 | 04-04 | SATISFIED, see note | Every `check:pr` step passes, but one uninterrupted `pnpm check:pr` exit 0 was not observed. |
| XC-02 | 04-03 | SATISFIED | ADR-QD-111, CCR-QD-388, a `spec/README.md` history line, traceability rows and the changeset all exist. |
| XC-03 | 04-03 | SATISFIED | Gate 13 (`pnpm spec:api`) passes. No export changes. |
| XC-04 | 04-01, 04-02, 04-04 | SATISFIED | The diff scan of `packages/react/src` found no new `as`, `!`, `any`, `switch`, `fnUntraced`, `async`/`await` or `console.*`. The house-style gate reports 3 switches, the declared budget. |
| XC-05 | 04-02, 04-04 | SATISFIED | `pnpm coverage` passes its thresholds. |

No orphaned requirements. REQUIREMENTS.md maps GATE-01..05 and XC-01..05 to this phase, and every ID appears in a PLAN's `requirements:` field.

#### XC-01 note

04-04 ran `pnpm check:pr` and it stopped at step 13 (`pnpm example`). The step's `playwright install --with-deps chromium` needs sudo, which this host cannot give. This is an environment limit, not a code defect. The stop sits in a step that installs browser system packages, a step that cannot test the phase's code, and the SUMMARY states plainly that no uninterrupted exit 0 was observed.

I did not rely on that claim. I re-ran every constituent of `check:pr` myself: steps 1-12, step 13's typecheck, unit tests, `next build` and `playwright test` (30 of 30), and steps 14-16. All pass on this commit. The mutation step is excluded by `check:pr` itself, as AGENTS.md section 15 specifies. A literal `pnpm check:pr` exit 0 needs a host with the Playwright system dependencies, or CI. I count XC-01 as satisfied on the evidence that every gate it composes is green, and I recommend CI confirm it on the PR. It does not block the phase.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
| ---- | ------- | -------- | ------ |
| `packages/react/src/GateWriter.ts` | `useGateRegistration` has no src caller. Only `GateWriter.test.tsx` uses it (IN-01). | Info | Dead code in a non-exported module. Not blocking. |
| `QadiProvider.tsx:84-89` | The comment on the `useAtomValue` re-export is stale (IN-02) | Info | Documentation only. |
| `GateWriter.ts` `atomOf`, `QadiProvider.tsx` unwritable-registry effect | Dependency arrays omit values; the omission is argued in a comment (IN-03) | Info | Sound today, fragile under later edits. |
| `GateWriter.useGates.test.tsx` header | Overstates "written against the code before the move" (IN-04) | Info | Misleading header only. |
| `GateWriter.useGates.test.tsx:112-136` | The D-04 test never suspends cold (WR-01) | Warning | The count regression it pins is still caught on the warm path. A suspend-retry regression would not be. |

No TBD, FIXME or XXX markers in the phase's files, and no blockers. All five review findings are recorded `open` in `04-REVIEW-DISPOSITION.md`. They are untriaged, not unrecorded.

### Human Verification Required

None. No `<human-check>` blocks exist in the PLANs, and no truth is behavior-unverified.

### Gaps Summary

No gaps. The phase goal is achieved in the code. `QadiProvider` resolves the writer once, `useGates` in `GateWriter.ts` is the single owner of identity, the wrap rule, markers and registration, and `useGate` and `useQuestionsAs` (and so every one of the eight gate kinds) are one-line callers. The `usePolicies` question is answered with a pinning test, with no fix needed. The pre-existing React tests are byte-untouched and pass.

Follow-ups, none blocking:
1. Triage WR-01. Add a cold-suspend D-04 test that uses a latched port, so a suspend-retry regression is caught.
2. Let CI confirm an uninterrupted `pnpm check:pr` for XC-01.

---

_Verified: 2026-11-08_
_Verifier: Claude (gsd-verifier)_
