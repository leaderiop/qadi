---
phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
verified: 2026-11-25T18:40:00Z
status: passed
score: 9/9 must-haves verified
covered_files:
  - .changeset/react-registry-lifetime-has-an-owner.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-01-PLAN.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-01-SUMMARY.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-02-PLAN.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-02-SUMMARY.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-03-PLAN.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-03-SUMMARY.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-04-PLAN.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-04-SUMMARY.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-05-PLAN.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-05-SUMMARY.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-06-PLAN.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-06-SUMMARY.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-07-PLAN.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-07-SUMMARY.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-08-PLAN.md
  - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-08-SUMMARY.md
  - packages/react/src/QadiProvider.tsx
  - packages/react/src/RegistryLease.ts
  - packages/react/src/RegistryOwner.ts
  - packages/react/test/QadiProvider.owner.characterisation.test.tsx
  - packages/react/test/RegistryOwner.test.ts
  - packages/react/test/support/recordingDefer.ts
  - spec/decisions/199-a-providers-registry-lifetime-has-a-react-free-owner.md
  - stryker.react.mjs
covered_digest: "v4:sha256:28fff0b9d8f8abeec0976bfa54eb045dad5086b80a4ab044a554fee688498f2a"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 86: QadiProvider's registry lifetime has a React-free owner — Verification Report

**Phase Goal:** One package-private, React-free owner holds the registry's lifetime (create, seed the subject and `initialValues`, write the subject, recycle, hold and release the lease), tested with an injected `defer` and no rendering, while `QadiProvider` keeps one ref and forwards hold, release and subject changes.
**Verified:** 2026-11-25
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / PREG-01: LT1–LT18, RL1–RL10 and every existing `QadiProvider.*.test.tsx` pass unedited | ✓ VERIFIED | `git diff --name-status 41c53c65 HEAD -- packages` shows only three test files added and none modified or deleted (`QadiProvider.owner.characterisation.test.tsx`, `RegistryOwner.test.ts`, `support/recordingDefer.ts`). `git log` on `RegistryLease.ts`, `RegistryLease.test.ts` and `QadiProvider.lifetime.test.tsx` ends at `ac7578f3` (Phase 82), before the phase base. `86-pinned-check.mjs --all-applied` (run from the repo root, in my own process): "59 files hold their base text, 1 of 1 born files held". All 28 titles LT1–LT18 and RL1–RL10 are present. `npx vitest run packages/react`: 703 passed. |
| 2 | SC1 / PREG-01: a characterisation of create, seed, subject write, recycle and atoms-replaced was written on the base first | ✓ VERIFIED | `QadiProvider.owner.characterisation.test.tsx` holds C1–C9 (seed order, server render and discarded render schedule no timer, report before write, equal-subject silence, no spurious report on StrictMode or reveal, recycle writes the latest commit, throwing reporter, first write). Added by `8891aaca`, whose first parent chain has no `packages/react/src` change before `bbcc29eb` (the owner). `86-RED-EVIDENCE.md` records each cell seen failing under its scratch variant. The file passes unchanged on the rewired provider. |
| 3 | SC2 / PREG-02: the owner has no React import and is inert at construction | ✓ VERIFIED | `packages/react/src/RegistryOwner.ts` (85 lines) imports `@qadi/core` (type), `effect/reactivity/AtomRegistry`, and three package modules (`HydrationEngine`, `QadiAtoms`, `RegistryLease`), no `react`, no provider. Construction calls `AtomRegistry.make`, builds the lease and returns; no `defer`, timer or subscription. `86-check.mjs owner-shape` passes. RO1 asserts `counts` stays `{defers: 0, cancels: 0}` across build, commit and hold, and C2/C3 pin that a server render and a discarded render schedule no timer. No `scheduleTask`/`defaultIdleTTL`, no `dispose`, no module-scope `let` (state is closure state). |
| 4 | SC2 / PREG-02: the owner is in `stryker.react.mjs` and measured | ✓ VERIFIED | `git diff 41c53c65 HEAD -- stryker.react.mjs` adds `packages/react/src/RegistryOwner.ts` to `mutate` and names it in the header and covering tests. `86-mutation.mjs compare` (my run): lease 28/28 → 28/28, no open or Ignored mutant; owner 19/19, survived 0, no coverage 0, ignored 0, timeout 0. Source changed after the close record (`07c5afb4`) only in comments (`git diff 07c5afb4 HEAD -- packages/react/src` is two comment hunks in `QadiProvider.tsx`/`RegistryOwner.ts`), so the record stands. Stryker was not re-run. |
| 5 | SC2 / PREG-03: headless owner tests cover the recycle rules with "recycles nothing"/"recycles once" twins | ✓ VERIFIED | `RegistryOwner.test.ts` RO1–RO16, no React, real `AtomRegistry`, injected `makeRecordingDefer` that really cancels. Twins: RO1/RO3 (recycles nothing) beside RO2/RO5 (recycles once, then reads `default` and the latest subject); RO4 (hold cancels, `reset` called 0 times, a later release defers again) beside RO2; RO6 a throwing `reset` still writes back and the owner recycles again; RO7 re-applies neither `initialValues` nor a seed; RO8/RO9 detection once and callback-before-write; RO12 `reset` called through the property; RO14 one registry throughout; RO15 a throwing `defer`; RO16 the pinned host-refresh difference (D-10a). Each row is followed by a further operation. All pass in my run (12 files, 113 tests). |
| 6 | SC3 / PREG-04: `QadiProvider` keeps one lifetime ref and forwards only | ✓ VERIFIED | `QadiProvider.tsx` holds three refs (`signalRef`, `ownerRef`, `reportedInstrumented`; `latestRef`, `registryRef`, `atomsIdentityRef` and `leaseRef` are gone). One `ownerRef.current ??= makeRegistryOwner(...)` in render where `registryRef` was, so the first render still holds the subject. No lifetime branch remains: the commit effect is `owner.commit(atoms, subject, () => report(providerSignals.atomsReplaced()))`, hold/release is `owner.hold(); return () => owner.release()`. `86-check.mjs provider-forwards-only` passes. The module is not re-exported (`src/index.ts` unchanged; api-surface 942 exports unchanged). |
| 7 | SC3 / PREG-04: effect order kept; a provider hidden in `<Activity>` past a macrotask and shown again still renders its decision, no disposed-registry throw | ✓ VERIFIED | Four `useEffect` calls in order: commit (`[owner, atoms, subject]`, first), the two instrumentation effects, hold/release (`[owner]`, last). So commit-before-hold, hold-last holds by declaration order. LT1 ("a provider hidden past a macrotask and shown again throws nothing and renders the decision"), LT2, LT3, LT4 (StrictMode), LT7, LT8, LT13, LT16–LT18 and C4–C9 all pass unedited in my run. |
| 8 | SC4 / PREG-05: ADR-QD-199 (and ADR-QD-195 amended), BEH, INV and traceability record the owner | ✓ VERIFIED | `spec/decisions/199-…md` (237 lines: Context, Decision, Alternatives, Consequences with the render-suite audit, What enforces it, Related) and an `index.yaml` entry; ADR-QD-195 Rev 1.4 amended with a dated note (Status line, decisions 2/3/4 extended, enforcement and mutation record add the owner); BEH-QD-766 and 767, INV-QD-417 and 418 present in `09-react.md`/`invariants.md` and traceability rows for each; CCR-QD-478 row in `spec/README.md` (Rev 1.412) naming "Unused: BEH-QD-768, BEH-QD-769, BEH-QD-770" and that the appendix and AGENTS.md need no edit. `86-check.mjs records --close` passes (pinned-by lists name tests that exist, every reserved record written). The one deliberate difference (a host `registry.refresh` after the first commit keeps the subject) is stated in ADR-QD-199 Consequences, pinned by RO16 and seen red with the guard reinstated. |
| 9 | SC4 / PREG-05: the render suite shrinks only where owner tests now hold the property (zero deletions, per D-14/D-19) | ✓ VERIFIED | `git diff --diff-filter=D --name-only 41c53c65 HEAD -- packages` is empty; the ADR-QD-199 "render-suite audit" table (line 166) records that each lifetime render test keeps a half only React gives. The criterion's conditional wording is met with an audited empty set. |

**Score:** 9/9 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/react/src/RegistryOwner.ts` | React-free owner composing the lease | ✓ VERIFIED | 85 lines, real logic, wired into `QadiProvider.tsx` |
| `packages/react/src/QadiProvider.tsx` | one ref, forwards only | ✓ VERIFIED | see truth 6 |
| `packages/react/src/RegistryLease.ts` | unchanged | ✓ VERIFIED | zero-line diff against the phase base |
| `packages/react/test/RegistryOwner.test.ts` | headless RO rows | ✓ VERIFIED | 414 lines, RO1–RO16 |
| `packages/react/test/QadiProvider.owner.characterisation.test.tsx` | base characterisation | ✓ VERIFIED | 411 lines, C1–C9 |
| `packages/react/test/support/recordingDefer.ts` | cancelling defer double | ✓ VERIFIED | used by the owner tests; honours an in-batch cancel after the review fix |
| `stryker.react.mjs` | owner in `mutate` | ✓ VERIFIED | entry and header added |
| `.changeset/react-registry-lifetime-has-an-owner.md` | react patch | ✓ VERIFIED | `"@qadi/react": patch`, ends "No export changes.", names the one edge |
| `spec/decisions/199-…md`, BEH/INV/traceability/README | records | ✓ VERIFIED | see truth 8 |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `QadiProvider` render | `makeRegistryOwner` | `ownerRef.current ??=` in render | WIRED |
| commit effect | `owner.commit` | `[owner, atoms, subject]`, declared first | WIRED |
| hold/release effect | `owner.hold` / `owner.release` | `[owner]`, declared last | WIRED |
| `RegistryContext` and context value | `owner.registry` | `const registry = owner.registry` | WIRED |
| owner recycle | `makeRegistryLease` | the lease's own `hold`/`release`, `defer` undefined so its default is kept | WIRED |
| owner `commit` | `onAtomsReplaced` | callback runs before the latest and the write | WIRED (RO9, C4) |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| `RegistryContext` registry | seeded `AtomRegistry` | `AtomRegistry.make({initialValues: [[atoms.subject, subject], ...initialValues]})` | Yes; C1 and LT13 read the subject in the first frame | ✓ FLOWING |
| recycle write-back | `latest` closure | set by every commit, read in the recycle's `finally` | Yes; RO5, RO6, LT16–LT18 | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Owner, lease, provider, server-render and edges tests | `npx vitest run packages/react/test/RegistryOwner … RegistryLease … QadiProvider … ServerRender … edges` | 12 files, 113 tests passed | ✓ PASS |
| Whole `@qadi/react` project | `npx vitest run packages/react` | 703 tests passed | ✓ PASS |
| Pinned tests and lease byte for byte | `node 86-pinned-check.mjs --all-applied` (repo root) | 59 files hold base text, 1 of 1 born | ✓ PASS |
| Phase checks | `86-check.mjs` trailers, scan-ids, scan-forbidden, owner-shape, provider-forwards-only, `records --close`, `--self-test` | 22 plan commits with the one trailer; ids clean; no forbidden form; shape and forwarding hold; records close; self-test 262 passed | ✓ PASS |
| Mutation not fallen | `86-mutation.mjs compare` | lease 28/28 → 28/28; owner 19/19, no open mutant | ✓ PASS |
| Working tree | `git status --porcelain -- packages spec scripts stryker.react.mjs .changeset` | empty | ✓ PASS |

`pnpm check:pr` was not re-run. The orchestrator's log at `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/b04729bd-9815-4720-957d-3637602848ac/scratchpad/checkpr-86-final.log` (written 18:24, after the last commit `f51b72b5`) ends with the bench self-test and "run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it)", the line the runner prints on success. Plan 86-08 recorded the per-step figures (house-style 625 files, api-surface 942 exports, coverage 99.67% statements, `spec:package` 527 runtime exports).

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh`.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| PREG-01 | 86-01, 86-05 | ✓ SATISFIED | truths 1, 2 |
| PREG-02 | 86-01, 86-02, 86-04, 86-07 | ✓ SATISFIED | truths 3, 4 |
| PREG-03 | 86-04 | ✓ SATISFIED | truth 5 |
| PREG-04 | 86-02, 86-03, 86-05 | ✓ SATISFIED | truths 6, 7 |
| PREG-05 | 86-02, 86-06 | ✓ SATISFIED | truths 8, 9 |
| WX-01 | 86-08 | ✓ SATISFIED (this phase's share) | `check:pr` exit 0, 17 of 18 steps (mutation skipped by design on non-release PRs); the tree is unchanged since apart from comment-only edits already covered by the later log |
| WX-02 | 86-02, 86-06 | ✓ SATISFIED | only ADR-QD-199, CCR-QD-478, BEH-QD-766/767, INV-QD-417/418 used, 768–770 named unused; `scan-ids` and `records --close` pass |
| WX-03 | 86-07, 86-08 | ✓ SATISFIED | `spec:api` 942 exports unchanged (owner out of the barrel); `spec:package` 527 runtime exports; one `@qadi/react` patch changeset |
| WX-04 | 86-02, 86-04, 86-05, 86-07 | ✓ SATISFIED | `scan-forbidden` passes (no `as` beyond the existing `as const`, `!`, `any`, `switch`, `async`, ambient console/env/clock, Stryker disable, module `let`) |
| WX-05 | 86-01, 86-04, 86-07, 86-08 | ✓ SATISFIED | mutation compare above, no score fell; `@qadi/react` coverage 99.54 / 99.04 / 98.68 / 99.5, above 90 |
| WX-06 | 86-01…86-05, 86-07 | ✓ SATISFIED | `86-RED-EVIDENCE.md` records each new check and cell seen failing; the characterisation was committed on the base before the owner existed |
| WX-07 | 86-08 and all | ✓ SATISFIED | trailers pass (22 commits), no push, merge, tag, release or consumed changeset, no id or plan wording leaked |

No orphaned requirements: REQUIREMENTS.md maps exactly PREG-01..05 to Phase 86, and each appears in at least one plan's frontmatter, as do WX-01..07. The Pending checkboxes are expected and not a gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `RegistryLease.ts` | header | still names `QadiProvider.tsx` as its one caller | ℹ️ Info | Deferred as IN-02: the file is held byte for byte by the phase's own promise; ADR-QD-199 Consequences record it. Comment only. |
| `RegistryOwner.ts` / `QadiProvider.tsx` | commit | the subject write drops the `registry.get(...) !== subject` guard | ℹ️ Info | A deliberate, documented and pinned behaviour difference (D-10/D-10a, RO16, ADR-QD-199, changeset): a host `registry.refresh(atoms.subject)` after the first commit and before any read or recycle now keeps the subject instead of resetting it to `undefined`. Notification neutrality is pinned by C5. |

No debt markers (TBD/FIXME/XXX), stubs or hardcoded-empty values in the changed source. Review findings IN-01, IN-03, IN-04 and IN-05 were fixed in `e435ee33` (comment and test-support changes only); the disposition file shows `open: 0`.

### Human Verification Required

None. The lifetime is covered by headless owner rows, the base characterisation and the rendered `<Activity>`, StrictMode and server suites; no visual or external-service behaviour is claimed. The React 19.2.4 peer floor stays an untested carried Known Issue, as before the phase.

### Gaps Summary

No gaps. The registry's lifetime (build, seed in the order subject then `initialValues`, the commit's ordered detect/record/write, the recycle that resets in place and writes the latest subject back in a `finally`, hold and release over the unchanged lease) lives in `RegistryOwner.ts`, which imports no React, is inert at construction, is mutation-measured at 19/19 and is driven headless with twinned "recycles nothing"/"recycles once" rows. `QadiProvider` holds one lifetime ref, four effects in the required order and no lifetime branch. Every existing lifetime test and the lease are byte for byte unchanged and pass, and the phase's one behaviour difference is recorded, pinned and shipped in the changeset.

---

_Verified: 2026-11-25T18:40:00Z_
_Verifier: Claude (gsd-verifier)_
