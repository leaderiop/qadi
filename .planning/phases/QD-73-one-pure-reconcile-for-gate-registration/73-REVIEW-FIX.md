---
phase: QD-73-one-pure-reconcile-for-gate-registration
fixed_at: 2026-11-23T01:38:49Z
review_path: .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase QD-73: Code Review Fix Report

**Fixed at:** 2026-11-23
**Source review:** .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (fix scope: all)
- Fixed: 10 (IN-01 by deletion, with WR-01)
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), on the final tree
(head `dc95a497`), with stdin closed.

## Fixed Issues

### WR-01: the rollback and `AggregateError` path of `reconcile` (necessity)

**Files modified:** `packages/react/src/GateWriter.ts`, `packages/react/test/GateWriter.reconcile.test.ts`,
`packages/react/test/GateWriter.test.tsx`, `packages/react/test/GateRegistry.store.test.ts`,
`packages/react/test/support/trees.tsx`, `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md`,
`spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md`, `spec/behaviors/09-react.md`,
`spec/invariants.md`, `spec/traceability.md`, `spec/README.md`, `73-RED-EVIDENCE.md`
**Commit:** 0c81a557
**Status:** fixed: requires human verification (it removes code)
**Applied fix:** Re-verified first that no writer `buildGateRegistry` builds can throw: `register`, `update` and
`unregister` are plain `Map`/`Set` writes, `changed()` isolates every listener, `update` and `unregister` are
idempotent, and both callers (`makeQadiAtoms`, `makeGateRegistry`) pass a reporter resolved by `reporterFor`, which
contains a supplied reporter's throw (the default `say` is `console.warn`, which the library states does not throw).
Removed the `try`/`catch`, the `made` list, the rollback and the `AggregateError`; the doc comment now states the
writer's contract. ADR-QD-186 decision 6 and its "What enforces it" and "Alternatives considered" are rewritten
(Rev 1.1), ADR-QD-140's amendment item 2 (Rev 1.4), BEH-QD-702, INV-QD-391 and INV-QD-392, the traceability rows and
the CCR-QD-465 row all say the same contract, with the CCR row citing ADR-QD-186 as "Rev 1.1 (new at 1.0; corrected at
1.1, in code review)" (later "1.1 and 1.2", see WR-02/WR-03). Deleted the four reconcile rollback tests, the hook-level
no-leak test, and `Boundary`'s `onCaught` and the fake writer's throwing mode (nothing else used them; `Boundary` stays
for `edges.test.tsx`). The contract is pinned on the real registry in `GateRegistry.store.test.ts`:
- new `a listener that throws makes none of register, update or unregister throw` (replaces the narrower
  `a listener that throws does not stop the fan-out`; it also pins that the subscriber after the throwing one hears
  all three);
- cited, not duplicated: `unregister is idempotent`, `an update firing after the matching unregister stays a no-op`,
  and the four `a throwing onIdCollision / onGateIdCollision ... is named ...` tests, which register the colliding id
  after the reporter threw and list both ids, so a throwing reporter supplied through `makeGateRegistry` and through
  `makeQadiAtoms` is shown not to make `register` throw.
A dated note in `73-RED-EVIDENCE.md` records the removal and why; its earlier sections are untouched.

### WR-02: hook doc comment, INV-QD-392 and the CCR row disagreed on what enforces the one-ref rule

**Files modified:** `packages/react/src/useGate.ts`, `spec/invariants.md`, `spec/README.md`,
`spec/decisions/186-gate-registration-is-one-keyed-reconcile.md`
**Commit:** d109ee11
**Applied fix:** The `useGateRegistrations` doc comment, INV-QD-392 and the CCR-QD-465 row now say the same: the hook
keeps one ref, `registered`, which holds its registrations (each carrying the identity it was made for) and nothing
beyond them; tests pin what registers and when it ends; that the ref holds nothing beyond its registrations is kept by
review and not by a test or a gate. ADR-QD-186's "What enforces it" lists it among what review keeps (Rev 1.2).

### WR-03: INV-QD-392 said the hook keeps no copy of any identity

**Files modified:** (same commit and files as WR-02)
**Commit:** d109ee11
**Applied fix:** The INV statement and Implication no longer say "no copy of any identity or state"; they say the only
identity the hook holds is the one each registration was made for (which the next commit compares against), that it
holds no state, and that it has no state diff of its own.

### WR-04: test title contradicted its expectation

**Files modified:** `packages/react/test/GateWriter.reconcile.test.ts`, `73-RED-EVIDENCE.md`
**Commit:** 295eb17c
**Applied fix:** `registers a new id and calls nothing else` is now `keeps a live entry, updates it, and registers an id
that was not live` (85 columns, unique in the file). Nothing in the spec quoted the old title; the evidence file gets a
dated note and its earlier quotation is left as written.

### IN-01: mis-indented AggregateError test block

**Commit:** 0c81a557 (deleted with WR-01; the block no longer exists)

### IN-02: `sameIdentity` exported and unused outside `GateWriter.ts`

**Files modified:** `packages/react/src/GateWriter.ts`, `spec/invariants.md`, `spec/README.md`
**Commit:** 52c19e8b
**Applied fix:** No test or type test imports it, so it is a non-exported `const`. INV-QD-391's Source line names it as
the module's unexported comparison. The export was not kept for any test.

### IN-03: `notificationsOf` not the one shared counter; duplicated `canRead`/`canWrite`

**Files modified:** `packages/react/test/support/gates.ts`, `GateRegistry.store.test.ts`, `GateRegistry.test.tsx`,
`hooks.rerender.test.tsx`, `GateWriter.test.tsx`, `GateWriter.reconcile.test.ts`, `spec/README.md`
**Commit:** aa0be16e
**Applied fix:** `support/gates.ts` gains `listenTo` (returns `{ told, unsubscribe }`, for the two tests that end the
subscription) with `notificationsOf` derived from it, so the characterisation's call sites are untouched. The store
test (four cases), the host test in `GateRegistry.test.tsx` and `hooks.rerender.test.tsx` now read through them; every
expected value is unchanged. The duplicated factories moved there as `newCanRead` and `newCanWrite` (named apart from
`trees.tsx`'s `canRead` and `canWrite` constants). `hooks.rerender.test.tsx` joined the CCR-QD-465 file list.

### IN-04: type-pin header and INV-QD-391 claimed more than the `.tst.ts` pins

**Files modified:** `packages/react/test/GateWriter.reconcile.tst.ts`, `spec/invariants.md`, `spec/README.md`
**Commit:** 4dbe6f7f
**Applied fix:** The header and a comment now say the `GateCurrent` refusal pins that name alone and that `GateWanted`
(re-exported beside it) is its accepted twin; INV-QD-391 says the compiler refuses the name `GateCurrent` and that an
index-aligned type under another name would compile. The vacuous `expect(identity).type.toBe<GateIdentity>()` is
replaced by `expect(identity).type.not.toHaveProperty("id")`.
Scratch gut showing the replacement can fail: with `readonly id?: string;` added to `GateIdentity` in `GateWriter.ts`,
`pnpm test:tstyche GateWriter.reconcile` fails `a GateIdentity literal without an id is accepted` with
`Type 'GateIdentity' has property 'id'.` (also the refused-twin directive and the `keyof` row, 3 tests failed). Reverted
with `git checkout`; the file passes again (5 tests, 7 assertions, both passes).

### IN-05: traceability row attributed the reconcile-rule note to BEH-QD-704

**Files modified:** `spec/traceability.md`, `spec/README.md`
**Commit:** 2e13538c
**Applied fix:** Dropped the sentence; the file no longer pins those cases, so the row names only what it pins.

### IN-06: characterisation header, row placement, overlapping reconcile tests

**Commits:** 6d05f5db (header), dc95a497 (tests)
**Applied fix:**
- Removed the "Shared helpers it uses" paragraph from the characterisation header (own commit; no input, title or
  expected value touched).
- Removed `tells a kept handle its state even when unchanged, leaving equality to it`; survivor `reconciling the same
  input twice keeps every entry and calls only update` states the same rule for two entries and asserts the kept
  objects. BEH-QD-703's Pinned-by now cites the survivor.
- Removed `keeps unchanged identities with fresh policy objects, calling only update`; survivor `keeps the entry when
  only the policy or the resource changed` states the same rule for each field alone.
- `73-RED-EVIDENCE.md` gets a dated note naming both removals and survivors.
- Not done, by the rule that the characterisation's titles and rows are fixed: the writer-change row stays under
  `describe("off means absent")`. BEH-QD-704 cites it by its own title for "its writer changes", not as absence, so no
  spec text is wrong.

## Gate results (final tree, head `dc95a497`)

- `pnpm exec vitest run --project react`: 646 passed.
- `pnpm typecheck`: clean.
- `pnpm test:tstyche`: both passes pass.
- `node scripts/check-house-style.mjs`: 574 files clean (70 type-test files, no budget changed).
- `node scripts/check-doc-examples.mjs`: 118 blocks compile.
- `node scripts/check-api-surface.mjs`: 941 exports (barrel unchanged).
- `pnpm exec oxlint` on every touched `packages/react` file: clean.
- `node scripts/spec-revise.mjs --check`: every Revision matches.
- `bash spec/scripts/verify-traceability.sh --strict`: exit 0, all checks PASS.
- No added line in `packages/` over 90 columns. CCR-QD-465's file list equals `git diff --name-only 1dbaf1a9 HEAD`
  outside `.planning/`. Final revisions cited in the row: ADR-QD-186 1.2, ADR-QD-140 1.4, BEH 3.15, INV 1.185,
  traceability 1.258, README 1.309.

---

_Fixed: 2026-11-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
