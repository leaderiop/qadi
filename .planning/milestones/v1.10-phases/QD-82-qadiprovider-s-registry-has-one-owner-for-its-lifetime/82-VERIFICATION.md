---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
verified: 2026-11-25T00:00:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-01-PLAN.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-01-SUMMARY.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-02-PLAN.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-02-SUMMARY.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-03-PLAN.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-03-SUMMARY.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-04-PLAN.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-04-SUMMARY.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-05-PLAN.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-05-SUMMARY.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-06-PLAN.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-06-SUMMARY.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-07-PLAN.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-07-SUMMARY.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-08-PLAN.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-08-SUMMARY.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-09-PLAN.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-09-SUMMARY.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-10-PLAN.md
  - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-10-SUMMARY.md
  - packages/react/src/QadiProvider.tsx
  - packages/react/src/RegistryLease.ts
covered_digest: "v4:sha256:8ac15625bfb8cc78aa2d751e3e89195d8e0bf8ac16e4a4ee6b5a68ddf7a67168"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 82: `QadiProvider`'s registry has one owner for its lifetime - Verification Report

**Phase Goal:** A `QadiProvider`'s atom registry has one owner for the provider's whole life, so a provider hidden inside `<Activity>` longer than a macrotask and shown again with stable children never lets any consumer or the provider's own effect reach a disposed registry, and the lifetime rule is testable and mutation-gated without React.
**Verified:** 2026-11-25
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A stable `QadiProvider` with a real consumer below, inside a toggled `<Activity>`, hidden past a macrotask and shown again, throws nothing and renders the decision; a `useSubject()` probe reads the prop; RED on the base, GREEN after | VERIFIED | `QadiProvider.lifetime.test.tsx` LT1 (hoisted provider, real 50 ms hide, boundary above catches errors, `expect(caught).toEqual([])`), with companions LT2 (`useInvalidate`), LT3 (devtools feed consumer), LT4 (StrictMode), LT5 (short-hide control), LT6, LT7. `82-RED-EVIDENCE.md` records the base run: LT1 and six companions RED (LT5 green), 3 caught `registry is disposed` errors in LT1 (gate subscription, subject probe subscription, `QadiProvider.tsx:258` subject effect), in the research's order. The base `QadiProvider.tsx` effect that disposed after `setTimeout(0)` and nulled `registryRef` is gone (git diff against `902d2128`). I ran `pnpm exec vitest run --project react < /dev/null`: 42 files, 678 tests passed. |
| 2 | After a long hide the provider answers with the current subject; what recycling loses (`initialValues`, hydration seeds) is restored or the loss is recorded and pinned; the sweep bound (ADR-QD-148) holds across a long hide, asserted with counters | VERIFIED | Subject: `QadiProvider.tsx` recycle thunk is `try { registry.reset() } finally { registry.set(latestRef.current.atoms.subject, latestRef.current.subject) }`, with `latestRef` written in an effect, never in render. Pinned by LT6, LT13, LT16 (subject committed while visible), LT17 (atom set committed while visible), LT18 (a throwing `reset` still re-seeds). Seeds: the loss is recorded and pinned, not restored: LT9 (seeded allow never answered is not shown again), LT10 (seeded allow with no subject stays pending), LT11 (re-render after long hide shows no superseded allow, one mismatch report); decided in ADR-QD-195, BEH-QD-750, and the changeset and the `initialValues` doc comment state it. Sweep: LT12 drives real pressure across a long hide and asserts one fork and one sweep per episode; `SweepScheduler.ts` is untouched (21/21 mutants). |
| 3 | Every registry the provider builds is released exactly once on a real unmount, none used after release, none leaks, across StrictMode, short and long hides, a subject change while hidden, an `atoms` prop change, and unmount; the vacuous unmount test now fails if release is skipped | VERIFIED (with a stated reading of "released", see residuals) | The provider builds one registry per provider (`registryRef.current ??= AtomRegistry.make(...)`, never cleared; LT7 and LT8 assert one registry across a re-render while hidden and an atoms swap), so "none used after release" holds by construction (INV-QD-409, INV-QD-410): a recycle is `reset()`, which leaves the registry usable. "Exactly once" is `RegistryLease.test.ts` RL1-RL10 (one recycle per release however many cleanups run; a hold cancels; a throwing recycle or defer leaves the lease usable) plus LT4 (StrictMode: nothing recycled) and LT5 (hide shorter than a macrotask: nothing recycled). `edges.test.tsx` "releases its registry after it unmounts" now taps the context registry, seeds a host atom, unmounts, waits 50 ms and asserts the atom is back at its default, so it fails if the release is skipped (the old test only checked an empty body). |
| 4 | The lifetime rule lives in one package-private, headless module a test drives with an injected timer; under the React mutation gate with no open mutant; the provider holds no lifetime logic beyond calling it | VERIFIED | `packages/react/src/RegistryLease.ts` (85 lines): closed `LeaseState` union (`Unheld`, `Held`, `Releasing`), two `Match.tagsExhaustive` matchers, `makeRegistryLease(recycle, defer = timeoutDefer)`, injected `LeaseDefer`. Not in `src/index.ts` and not in any `package.json` export (grep). `stryker.react.mjs:62` mutates it. `node 82-mutation.mjs compare` (re-run by me): RegistryLease 28/28, survived 0, no coverage 0, ignored 0, timeout 0; DecisionOutcome 8/8, HydrationEvent 33/33, SweepScheduler 21/21 unchanged; QuestionBook 85/88 to 86/88 with only the base's survivors. `node 82-check.mjs single-owner` (run by me): "the registry's lifetime is decided once, in RegistryLease.ts" (on the base it printed seven failures, recorded in `82-RED-EVIDENCE.md`: a timer, a dispose and a ref clear in the provider). The provider's lifetime code is `makeRegistryLease(...)` plus one effect `lease.hold(); return () => lease.release()`. `RegistryLease.test.ts` has RL1-RL10 over a recording defer. |
| 5 | ADR-QD-195, BEH, INV and traceability record the rule, with React's commit-order claims from the RED/GREEN observation; a `@qadi/react` patch changeset records the fix and the seed loss; no Breaking changeset unless an export changed | VERIFIED | `spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md` (with dated amendments of ADR-QD-014, 148, 149; 103 read, unchanged); BEH-QD-746..750 in `spec/behaviors/09-react.md`, with BEH-QD-067 (amended note 2026-11-25), BEH-QD-516 and the integration appendix restated; INV-QD-409 and 410 in `spec/invariants.md`; traceability rows; CCR-QD-474 in `spec/README.md`. `.changeset/react-registry-recycled-in-place.md` is `"@qadi/react": patch`, states the seed loss and the detached direct host subscription, "No export changes". Gate evidence (orchestrator-measured): api-surface 942 exports unchanged, `spec:package` exit 0. |

**Score:** 5/5 truths verified (0 behavior-unverified: every state-transition and cancellation truth here has a passing named test, LT/RL ids above).

### Decisions and review

`82-REVIEW.md` is clean after three iterations; `82-REVIEW-DISPOSITION.md` records 6 findings fixed and 0 open; the review fixes added LT16, LT17, LT18 and a `finally` around the recycle, each seen failing first (`82-REVIEW-FIX.md`). `82-VALIDATION.md` is `validated` (12/12); `82-SECURITY.md` has 29 of 29 threats closed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/react/src/RegistryLease.ts` | closed lease union, package-private | VERIFIED | Substantive, wired from `QadiProvider.tsx` only, off the barrel. |
| `packages/react/src/QadiProvider.tsx` | one registry for life, recycled in place | VERIFIED | `registryRef` never cleared; no timer, no `dispose`; recycle is `reset()` then the latest committed subject in a `finally`; seeds built once. |
| `packages/react/test/QadiProvider.lifetime.test.tsx` | LT1..LT18 | VERIFIED | 766 lines, all pass. |
| `packages/react/test/RegistryLease.test.ts` | RL1..RL10 | VERIFIED | 245 lines, all pass. |
| `packages/react/test/edges.test.tsx` | unmount test made real | VERIFIED | Asserts the reset. |
| `packages/react/stryker.react.mjs` | lease in the mutate list | VERIFIED | Line 62. |
| ADR-QD-195, BEH-QD-746..750, INV-QD-409/410, CCR-QD-474, changeset | records | VERIFIED | Present. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `QadiProvider.tsx` effect | `RegistryLease.hold/release` | `useEffect(() => { lease.hold(); return () => lease.release(); }, [lease])`, last effect so it runs after consumers on reveal | WIRED |
| lease `recycle` | registry | `registry.reset()` then `registry.set(subject)` from `latestRef` | WIRED |
| `latestRef` | atoms and subject | written in an effect keyed on `[atoms, subject]` | WIRED |
| `RegistryLease.ts` | `defer` | injected, default `setTimeout(run, 0)` with `clearTimeout` | WIRED |

### Data-Flow Trace (Level 4)

The subject flows from the prop to `latestRef` (effect) to `registry.set` on recycle, and from the registry to the consumers' `useAtomValue`; LT6, LT13, LT16 and LT17 assert the value a consumer reads in the first revealed frame and after it. No static fallback found.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| react project | `pnpm exec vitest run --project react < /dev/null` | 42 files, 678 tests passed | PASS |
| one lifetime owner | `node 82-check.mjs single-owner < /dev/null` | "the registry's lifetime is decided once, in RegistryLease.ts" | PASS |
| forbidden forms in added lines | `82-check.mjs scan-forbidden` | none | PASS |
| ids and phase wording in shipped files | `82-check.mjs scan-ids` | none | PASS |
| commit trailers | `82-check.mjs trailers` | 38 plan commits, one Claude trailer each | PASS |
| mutation compare | `82-mutation.mjs compare` | exit 0; no new open or Ignored mutant | PASS |

Accepted from the orchestrator, measured at 4ec88995 (`git diff --stat 4ec88995..HEAD` touches only `.planning/`: `82-SECURITY.md` and `82-VALIDATION.md`): `pnpm check:pr < /dev/null` exit 0 (17 of 18 steps, 6613 unit, BDD 568, examples 43, strict traceability 21/0, api-surface 942 unchanged); `pnpm spec:package` exit 0. Not re-run by me: those two and Stryker. `git status --porcelain -- packages spec .changeset` is empty and `git diff 902d2128 HEAD -- AGENTS.md scripts .oxlintrc.json` is empty, so no budget moved.

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh`; its record scripts (`82-check.mjs`, `82-mutation.mjs`) are run above.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| LEASE-01 | SATISFIED | Truth 1 (LT1, RED evidence) |
| LEASE-02 | SATISFIED | Truth 4 |
| LEASE-03 | SATISFIED | Truth 3 |
| LEASE-04 | SATISFIED | Truth 2 |
| LEASE-05 | SATISFIED | Truth 5 |
| WX-01 | SATISFIED (orchestrator-measured) | `check:pr` exit 0 at 4ec88995, only `.planning/` since |
| WX-02 | SATISFIED | only reserved ids (ADR-QD-195, CCR-QD-474, BEH-QD-746..750, INV-QD-409/410); `next-id.mjs` not used |
| WX-03 | SATISFIED | no export change, api-surface 942 unchanged, `spec:package` exit 0 |
| WX-04 | SATISFIED | `scan-forbidden` clean; `let state` in the lease is function-scoped, not module scope; no `AGENTS.md` or `scripts/` change |
| WX-05 | SATISFIED | Mutation compare above; coverage gate runs inside `check:pr` (orchestrator) |
| WX-06 | SATISFIED | `82-RED-EVIDENCE.md`: LT1 and six companions RED on the base, single-owner's seven base failures, the check helper's own failures; review-fix tests seen failing in `82-REVIEW-FIX.md` |
| WX-07 | SATISFIED | `scan-ids` clean; no push, release or merge; one patch changeset |

No orphaned requirement: LEASE-01..05 and WX-01..07 are all claimed by the plans and roadmap.

### Anti-Patterns Found

None. The added source lines contain no `switch`, `fnUntraced`, `as`, `any`, `!`, `async`, ambient `console`/`process.env`/clock, `Record<string, unknown>`, Stryker disable or module-scope `let`; no TBD/FIXME/XXX introduced.

### Human Verification Required

None. A headless-behaviour phase: every lifecycle transition it asserts is exercised by a named, passing test under real timers.

### Gaps Summary

No gaps. Stated, accepted residuals, none blocking, each recorded in the phase's own records:

1. **One-frame read of the previous subject.** On the first revealed frame after a long hide in which the subject changed, a consumer reads the last committed subject; the provider's effect then writes the new one. Children's effects run before the provider's on reveal, so an earlier write is not reachable without `useScoped`, which the roadmap rules out. Pinned by LT6 (two frames) and recorded in ADR-QD-195 (line 99 and the scenario table at line 134) and in the comment at the subject effect.
2. **`QadiProvider.tsx` is outside `stryker.react.mjs`.** It renders; its lifetime logic is the lease, which is inside the gate at 28/28. Recorded in ADR-QD-195 (line 203) and `82-VALIDATION.md` as `unmeasured`, as the roadmap's planning notes anticipated.
3. **"Released" means recycled, not disposed.** Roadmap SC3 says released exactly once on unmount; the design keeps one registry and calls `reset()` once per last release, so the registry (and its `Atom.runtime` layer scope, through finalizers) is cleared and is garbage collected with the provider, never `dispose()`d. A read straggling after a true unmount recreates a node instead of throwing (LT14), the accepted trade named in the roadmap's planning notes and ADR-QD-195.
4. **Seeds are not re-applied after a long hide** (`initialValues`, hydration), and a **host subscription held directly on the registry across the hide is detached** by the recycle (LT15). Both are stated in the changeset, the `initialValues` doc comment, the provider's header comment, BEH-QD-750 and ADR-QD-195.
5. The `check:pr` and `spec:package` results are the orchestrator's measurements at 4ec88995, not re-run here; Stryker was not re-run, by instruction.

---

_Verified: 2026-11-25_
_Verifier: Claude (gsd-verifier)_
