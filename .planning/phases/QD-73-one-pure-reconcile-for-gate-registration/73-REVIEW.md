---
phase: QD-73-one-pure-reconcile-for-gate-registration
reviewed: 2026-11-23T03:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - packages/react/src/GateWriter.ts
  - packages/react/src/useGate.ts
  - packages/react/test/GateWriter.reconcile.test.ts
  - packages/react/test/GateWriter.reconcile.tst.ts
  - packages/react/test/GateWriter.test.tsx
  - packages/react/test/GateRegistry.test.tsx
  - packages/react/test/GateRegistry.store.test.ts
  - packages/react/test/GateRegistration.characterisation.test.tsx
  - packages/react/test/hooks.rerender.test.tsx
  - packages/react/test/edges.test.tsx
  - packages/react/test/support/gates.ts
  - packages/react/test/support/trees.tsx
  - spec/decisions/186-gate-registration-is-one-keyed-reconcile.md
  - spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md
  - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
  - spec/decisions/103-a-question-is-opened-once.md
  - spec/decisions/index.yaml
  - spec/behaviors/09-react.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
  necessity: 1
status: issues_found
---

# Phase QD-73: Code Review Report (iteration 2)

**Reviewed:** 2026-11-23
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

All ten iteration-1 findings are fixed, and the fixes are correct. `reconcile` has no rollback, no
`AggregateError`, no `made` list and nothing left of the removed path. Nothing in source, tests or specs
still mentions a dead entry in `live`, and ADR-QD-177 is cited once, accurately. ADR-QD-177 line 72 does say
the registry's own swallow is not changed. The remaining findings are one necessity item the fixes left
behind, two spec/doc statements that claim more than is true, and three small tidiness items.

Checked and clean:

- **Titles.** A script extracted every quoted title in BEH-QD-701 to 705 and INV-QD-391/392 (49 quotations)
  and matched each against `it`/`test`/`describe` titles in `packages/react/test`, including the
  multi-line ones. All exist verbatim in the file each text names. The two removed reconcile tests are
  quoted nowhere in `spec/`.
- **Traceability.** Every test file a BEH/INV "Pinned by" or Enforcement line cites has a row that names that
  BEH/INV.
- **CCR-QD-465 row.** Its cited revisions equal each document header (ADR-QD-186 1.2, 140 1.4, 111 1.2,
  103 1.5, BEH 3.15, INV 1.185, traceability 1.258, README 1.309). Its file list equals the 21 files of
  `git diff --name-only 1dbaf1a9 HEAD` outside `.planning/`. `spec-revise --check` and
  `verify-traceability.sh --strict` pass.
- **Pins.** The throwing subscriber is pinned by `a listener that throws makes none of register, update or
  unregister throw`. A throwing reporter is pinned through both `makeGateRegistry` and `makeQadiAtoms`, in
  development and in production, by the four collision-reporter tests. Each registers the colliding id after
  the reporter threw, and a leaked throw would fail it at the call. Each would fail if `reporterFor` did not
  contain the throw or `changed()` did not isolate the listener.
- **Survivors of the removed tests.** `reconciling the same input twice keeps every entry and calls only
  update` pins the same rule at the same precision as the removed "tells a kept handle its state even when
  unchanged": the same state is told again, and it asserts the kept objects. `keeps the entry when only the
  policy or the resource changed` pins each field alone and is stronger than the removed fresh-policy test.
- **Type pin.** `expect(identity).type.not.toHaveProperty("id")` fails when `GateIdentity` gains an `id`
  (optional or required), so it fails for the reason it names. `pnpm test:tstyche` passes both passes
  (375 tests, 2 skipped), and `GateWriter.reconcile.tst.ts` passes.
- **Single ref.** The `useGateRegistrations` doc comment, INV-QD-392 and the CCR row now say the same thing
  about it. Tests pin what registers and when it ends, and review keeps that the ref holds nothing beyond
  its registrations.
- **Helpers.** `listenTo`, `notificationsOf` and `newCanRead`/`newCanWrite` are defined once, with no
  module-scope state. No hand-rolled counter or duplicate factory is left in `packages/react/test`. Expected
  values are unchanged in the files moved onto them: the diffs touch only the counter plumbing and the
  imports.
- **House rules.** The 138 tests in the nine touched suites pass. The phase added no `as`, `!`, `any`,
  `switch`, `Record<string, unknown>` or `console.*`. Only one added line in `packages/` is over 90
  characters (IN-03).

## Warnings

### WR-01: Necessity: `Boundary` was moved into shared support for a second user that is now gone

**File:** `packages/react/test/support/trees.tsx:132-144`, `packages/react/test/edges.test.tsx:36`
**Category:** necessity
**Issue:** The phase moved `Boundary` out of `edges.test.tsx` into `support/trees.tsx` and gave it an
`onCaught` prop, so the reconcile throw tests could share it. Iteration 1 deleted those tests and the
`onCaught` prop, and left the class where it was moved to. `grep -rn Boundary packages/react/test` now finds
exactly one consumer, `edges.test.tsx:161-165`, which is the file it came from. So the phase's diff to
`edges.test.tsx` (the import swap and the deleted class) and the `Boundary` block in `trees.tsx` serve nothing.
This is a shared helper with one instance of use. It also forces `edges.test.tsx` into the phase's file list
(CCR-QD-465 row) and traceability for no behaviour. The comment that said why a throwing test mocks
`console.error` is also gone, and no test needs it.
**Fix:** Put the class back in `edges.test.tsx` exactly as it was at `1dbaf1a9`, remove it from `trees.tsx`,
and drop `edges.test.tsx` from the CCR-QD-465 row's file list (revising the README header and the row's
revision citation together). Or keep it shared and say which second test uses it. The first is the smaller
diff.

### WR-02: ADR-QD-186 "What enforces it" says the behaviours enforce what only review keeps

**File:** `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md:104-106`
**Issue:** The paragraph reads: "Neither enforces that no other module diffs states, that `reconcile` adds
no handler for a throw its writer's contract rules out, or that the hook's one ref holds its registrations
and nothing beyond them. Review and the behaviours below do." No behaviour below states the one-ref rule.
BEH-QD-701 to 705 never mention it; INV-QD-392 does. BEH-QD-702 and BEH-QD-703 each say their clause is "kept
by review and not by a test or a gate". Every other statement of this (INV-QD-391, INV-QD-392, BEH-QD-702,
BEH-QD-703, the `useGateRegistrations` doc comment, the CCR row) says review alone. A behaviour document
states a requirement and enforces nothing. So the ADR is the one place that gives a different answer, which
is the drift iteration 1 corrected for the one-ref rule in WR-02.
**Fix:** End the paragraph with "Review does, and BEH-QD-702, BEH-QD-703 and INV-QD-392 say so." Or just
"Review does." If the ADR is revised, bump it to 1.3 with a Change History entry, and update the CCR-QD-465
row's citation and the README header in the same change.

### WR-03: `support/gates.ts` header says its helpers are for tests that need no rendering; most of their users render

**File:** `packages/react/test/support/gates.ts:1-8`
**Issue:** The header reads "What the gate tests that need no rendering share: a count of the notifications a
gate registry makes, and fresh policies." Of the six importers, `GateRegistration.characterisation.test.tsx`,
`GateRegistry.test.tsx`, `hooks.rerender.test.tsx` and `GateWriter.test.tsx` all render (`render`,
`renderHook`) and use `notificationsOf` or `listenTo`. Only the store test and the reconcile test render
nothing. The sentence is false for the majority of its readers. The base version of the header was accurate
and iteration 1's rewrite (IN-03) made it wrong.
**Fix:** "What the gate tests share: the count of notifications a gate registry makes (`listenTo`,
`notificationsOf`), and policies that are new on every call (`newCanRead`, `newCanWrite`)." Drop "need no
rendering".

## Info

### IN-01: The writer's contract lists two reasons that are not about throwing

**File:** `packages/react/src/GateWriter.ts:317-320`; `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md:57-63`; `spec/behaviors/09-react.md` BEH-QD-702; `spec/README.md` CCR-QD-465 row
**Issue:** The contract is "`register`, `update` and `unregister` do not throw", and the text says
`buildGateRegistry` keeps it because a listener's throw is isolated, its reporter is contained by
`reporterFor`, and "its handles are idempotent".
- Idempotence is not a way to avoid throwing. `Map.delete` of a missing key does not throw either. Nothing in
  `reconcile` or the hook calls a handle twice: the teardown reads `registered.current`, then resets it. The
  clause is left over from the rollback path that needed it. The ADR and BEH-QD-702 then cite
  `unregister is idempotent` as pinning the contract, but that test pins "a stale unregister does not evict a
  newer entry", a different registry rule (ADR-QD-080).
- "Arrives already contained by `reporterFor`" holds for a supplied reporter only. With none, `reporterFor`
  returns the row's default, `say`, which `contain`'s own doc says is not wrapped because it does not throw.
**Fix:** Cut "and its handles are idempotent" from the four statements and from the two Pinned-by citations
(keep `an update firing after the matching unregister stays a no-op` only if the claim stays). Say "a supplied
reporter arrives contained by `reporterFor`, and the default does not throw". All four texts must change
together so they stay identical.

### IN-02: The contract binds a writer's implementer but is stated only on `reconcile`

**File:** `packages/react/src/GateWriter.ts:97-107` (`GateHandle`, `GateWriter`), `:317-323`
**Issue:** The "do not throw" requirement is on `GateWriter.register` and on `GateHandle.update` and
`unregister`, and an implementer of either reads those interfaces, not `reconcile`. Their doc comments say
nothing about it. A test double or a future second writer gets no hint that `reconcile` has no handler for a
throw.
**Fix:** One line on `GateWriter`: "`register`, and the handle's `update` and `unregister`, must not throw:
`reconcile` handles no throw of its own."

### IN-03: One added line is 91 columns

**File:** `packages/react/src/useGate.ts:87`
**Issue:** ` * ends; that the ref holds nothing beyond its registrations is kept by` is 91 characters. It is
the only added line in `packages/` over 90, in a codebase that hand-wraps at about ninety (AGENTS.md §17).
**Fix:** Rewrap lines 85-88 at 88 columns or fewer.

---

_Reviewed: 2026-11-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
