---
phase: QD-73-one-pure-reconcile-for-gate-registration
verified: 2026-11-23T03:40:00Z
status: passed
score: 4/4 roadmap success criteria verified (plus all brief truths)
covered_files:
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-01-PLAN.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-01-SUMMARY.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-02-PLAN.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-02-SUMMARY.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-03-PLAN.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-03-SUMMARY.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-04-PLAN.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-04-SUMMARY.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-05-PLAN.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-05-SUMMARY.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-06-PLAN.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-06-SUMMARY.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-07-PLAN.md"
  - ".planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-07-SUMMARY.md"
  - "packages/react/src/GateWriter.ts"
  - "packages/react/src/useGate.ts"
  - "packages/react/test/GateRegistration.characterisation.test.tsx"
  - "packages/react/test/GateWriter.reconcile.test.ts"
covered_digest: "v4:sha256:1854c4543b35570e9a9228c348f8507a2385582788e9965b69497e0cbca4ca22"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 73: One pure reconcile for gate registration Verification Report

**Phase Goal:** Gate registration (register, update and unregister) is one pure `reconcile` keyed by gate id, so `useGate` and `useGates` lose their state-diff effect and the parallel-array contract.
**Verified:** 2026-11-23
**Status:** passed
**Re-verification:** No, initial verification

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Characterisation of registration (register, update, unregister, remount, StrictMode) exists from the phase base and stays green | VERIFIED | `GateRegistration.characterisation.test.tsx` first added in 2680ab4d (descendant of base 1dbaf1a9, parent 06060b79 is pre-change). 19 `it` rows. `git diff 2680ab4d HEAD` on it touches only the header comment, moves `snapshotOf` into the file (and the `GateInstance` type import). No input, title or expected value changed. Passes. |
| 2 | `reconcile` takes `live` and `wanted` as maps keyed by gate id and does register, update and unregister in one pure step; no index-aligned arrays | VERIFIED | `GateWriter.ts`: `reconcile(writer, live: ReadonlyMap<string, Registered>, wanted: ReadonlyMap<string, GateWanted>): Map<string, Registered>`. Live pass first (keep + `handle.update(want.state)`, else `unregister`), then wanted pass registers what was not kept. Writes only to a fresh `next` Map, never to `live`. `GateIdentity` has no `id`; `GateCurrent` exists nowhere in src (only in a `@ts-expect-error` pin in the `.tst.ts`). `sameIdentity` compares kind, atom, wraps, marker, is unexported, and the kept entry is the same `Registered` object. |
| 3 | `useGateRegistrations` keeps one ref and the two effects of ADR-QD-186 decision 7; no `states.join("|")`, no paired `Record.values` in `useGate.ts` | VERIFIED | `useGate.ts`: one `useRef` (`registered`), a writer-keyed teardown effect declared first, and one dependency-less registration effect calling `reconcile`. `/usr/bin/grep -n 'states.join\|Record.values' useGate.ts` finds nothing (exit 1). `useGates` builds `asked` in one `Record.map` yielding `{entry, want}` from the same values, then `wanted = new Map(Record.collect(asked, ...))` keyed by `entry.id`. No callback fills a collection by side effect, nothing depends on two collections agreeing on key order. |
| 4 | The update half is tested without rendering; `GateRegistry.test.tsx` lost the moved cases; ADR-QD-186 extends ADR-QD-140 and ADR-QD-111 | VERIFIED | `GateWriter.reconcile.test.ts` is React-free (fake writer log plus two real-registry rows): update of kept handles, call order (live update/unregister, then register), identity-change re-register on a changed id without collision, fresh-map/no-mutation, single notification for a new state and none for the same. `git diff` shows three titled cases removed from `GateRegistry.test.tsx` (fresh equal policy, unregister-by-removed-key, equal record rebuilt), each re-pinned in the characterisation (rows at lines 144, 378, 442). ADR-QD-140 and ADR-QD-111 carry dated 2026-11-22 amendments pointing at ADR-QD-186. |

## Brief Truths

| Truth | Status | Evidence |
|-------|--------|----------|
| Writer contract stated once on `GateWriter`, true of `buildGateRegistry`, pinned on the real registry | VERIFIED | Stated on `GateWriter`'s doc comment. `buildGateRegistry` register/update/unregister are sync Map/Set writes, `changed()` try/catches each listener; collision reporter is the default (prints a line) or `reporterFor` -> `contain(...)` for a supplied one (read in `DeveloperSignals.ts`). `GateRegistry.store.test.ts` pins: throwing listener -> none of register/update/unregister throw and later subscribers still hear all three (`heard == [1,1,0]`); throwing `onIdCollision`/`onGateIdCollision` named by their option in dev and prod. |
| AGENTS.md section 13 holds | VERIFIED | `Registered` is `{identity, handle}` only; the hook's ref holds registrations only; the registry stores `GateRenderState` (a tag), never a verdict. No React state for decisions added. |
| Spec text present and consistent | VERIFIED | ADR-QD-186 (rev 1.5, 8 decisions, What enforces it, Alternatives); amendments in ADR-QD-140/111, note in ADR-QD-103; `index.yaml`; BEH-QD-701..705 in `09-react.md`; INV-QD-391/392 in `invariants.md`; traceability and README rows; CCR-QD-465. ADR text matches the code (decisions 1-8 re-read against `GateWriter.ts`/`useGate.ts`). The ADR, BEH and hook doc state plainly that "no other module diffs states", "reconcile adds no throw handler" and "the ref holds only its registrations" are kept by review, not by tests or a gate. |
| No new export reached the react barrel | VERIFIED | `git diff 1dbaf1a9 HEAD` on `packages/react/src/index.ts`, `package.json`, `spec/overview.md`, `.changeset` is empty. `check-api-surface.mjs`: 941 exports documented. |

## Behavioral Spot-Checks and Gates (run in this verification)

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Phase tests | `vitest run --project react` (characterisation, reconcile, store, registry, writer, rerender files) | 6 files, 110 tests passed | PASS |
| Type pins | `pnpm test:tstyche` | 70 files, 375 passed, 2 skipped (pre-existing); `GateWriter.reconcile.tst.ts` pass | PASS |
| House style | `node scripts/check-house-style.mjs` | 574 files clean | PASS |
| Typecheck | `pnpm typecheck` | exit 0 | PASS |
| API surface | `node scripts/check-api-surface.mjs` | 941 exports | PASS |
| DoD table | `node scripts/check-dod-table.mjs` | 26 steps match | PASS |

Not re-run by me (as instructed): Stryker, `check:pr`. Their recorded results (check:pr exit 0 at 37e85311; GateWriter.ts 83/83, useGate.ts 44/45 with the one survivor being an equivalent mutant also open in the base) were taken from the brief and `73-mutation-close.json` is present.

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| RECN-01 | SATISFIED | Truth 1 |
| RECN-02 | SATISFIED | Truth 2 |
| RECN-03 | SATISFIED | Truth 3, read per ADR-QD-186 decision 7 (one registration effect plus the writer-keyed teardown React needs for unmount) |
| RECN-04 | SATISFIED | Truth 4 |
| RECN-05 | SATISFIED | ADR-QD-186 and amendments, section 13 unaffected |
| WX-01..WX-07 | Phase contribution verified; stay Pending until milestone close | typecheck/house-style/api-surface/tstyche green; only reserved ids used (186, 465, 701-705, 391-392); no export change; no banned constructs or D-numbers/phase numbers in the diffed src or test (grepped); characterisation written first in 2680ab4d, before the 299297ad refactor; mutation base and close recorded |

## Anti-Patterns

None blocking. Diff-greps for `as T`, `any`, `console.`, `process.env`, `Stryker`, `switch (`, `Date.now` over the changed src added lines hit only doc-comment words ("as it renders"); no D-n, phase or plan numbers in test additions. No TBD/FIXME/XXX markers.

## Notes (informational, not gaps)

- RECN-03 "one effect" is read as one registration effect plus the teardown (decision 7, recorded openly in ADR-QD-186); the literal ROADMAP wording "one effect" is not met if counted as two `useEffect` calls. This is a documented, justified reading (a single effect would re-register every commit or leak on unmount), so it is accepted, not a gap.
- `useGates` derives `wanted` from a prior `asked` map, not the same traversal that builds `entries`; this satisfies "no paired arrays / no key-order dependence", which is the actual contract.
- `reconcile` has no throw handling by design; the contract lives on `GateWriter` and is pinned on the real registry.

## Gaps Summary

None. Goal achieved.

---

_Verified: 2026-11-23_
_Verifier: Claude (gsd-verifier)_
