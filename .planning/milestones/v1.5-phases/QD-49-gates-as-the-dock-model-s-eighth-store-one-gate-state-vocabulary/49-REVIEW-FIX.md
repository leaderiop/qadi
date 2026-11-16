---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
fixed_at: 2026-11-16T11:30:00Z
review_path: .planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-REVIEW.md
iteration: 3
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 49: Code Review Fix Report

**Fixed at:** 2026-11-16T11:30:00Z
**Source review:** .planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 6 (IN-01 to IN-06, `--all`)
- Fixed: 6
- Skipped: 0

IN-01 to IN-05 are edits to the same forty lines of `DockModel.ts` and to the tests that pin them (M42, M43 and the new M45 to M47 read each other's behaviour), so they share one commit rather than leave a red tree between commits. IN-06 is spec only and has its own commit. A third commit adds one assertion that killed the last surviving mutant of IN-01.

Workflow ran in the main checkout: `workflow.use_worktrees` is `false` in `.planning/config.json`, so no worktree was created.

## Fixed Issues

### IN-01: `reasonOf` could throw out of the guard

**Files modified:** `packages/devtools/src/model/DockModel.ts`, `packages/devtools/test/model/DockModel.test.ts`
**Commits:** 91db923b, 365b82a8
**Applied fix:** `reasonOf` is total: it returns a fixed sentence ("The registry threw a value that could not be described.") when `Cause.pretty` throws. The shared failure key `keyOf` is total too, because `thrown instanceof Error` itself throws on a Proxy with a throwing `getPrototypeOf` trap. M46 throws such a Proxy from a read, from a `configure` and from `subscribe`, and asserts the fixed sentence. 365b82a8 starts M46 from no registry so the view must move from `Absent` to `Failed` on the key alone, which kills the `keyOf` catch-block mutant.

### IN-02: A release failure outlived the swap, and the failure copy named only a read

**Files modified:** `packages/devtools/src/model/DockModel.ts`, `packages/devtools/src/react/QuestionsPanel.tsx`, `packages/devtools/test/model/DockModel.test.ts`, `spec/behaviors/28-devtools-screens.md`, `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md`, `.planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-UI-SPEC.md`
**Commit:** 91db923b
**Applied fix:** (a) Took the preferred option. A release that throws belongs to a registry the model no longer reads, so it is swallowed (still called once, never again) and the view after a swap is the new registry's listing. `watchFailure` now holds only a failed `subscribe`. ADR-QD-162 decision 5 and BEH-QD-584 state this, and say a failing release has nowhere honest to be shown, like the finalizer's. M42 now asserts `Listed` and the new registry's changes arriving after the swap, with the same single release call as before. (b) The copy is one neutral sentence: "The registry handed to the dock threw, so who is asking cannot be shown: {reason}". The two panel tests that pin the copy assert only "registry exploded" and "who is asking cannot be shown", so no panel test changed. The UI-SPEC amendment and ADR consequences note the new wording. The 49-02 characterisation is untouched.

### IN-03: A failed watch was not keyed like a failed read

**Files modified:** `packages/devtools/src/model/DockModel.ts`, `packages/devtools/test/model/DockModel.test.ts`
**Commit:** 91db923b
**Applied fix:** `keyOf` (an error's name and message, else the rendered reason) is shared by the read path and by `watchGates`, which stores `watchKey` beside `watchFailure`. M43 throws a fresh `Error` with the same message from each retry and asserts the snapshot is the same object and no listener is called.

### IN-04: The non-`Error` arm of `failureKey` was untested

**Files modified:** `packages/devtools/test/model/DockModel.test.ts`
**Commit:** 91db923b
**Applied fix:** M45, through the model: a thrown string is one `Failed` snapshot, the same string from another path publishes nothing, a thrown object publishes a new one, and a further registry change under the same throw publishes nothing. The Stryker report has no ternary mutant for this line, so the score cannot show the arm is tested; M45 does.

### IN-05: `configure` published a snapshot read from the old registry

**Files modified:** `packages/devtools/src/model/DockModel.ts`, `packages/devtools/test/model/DockModel.test.ts`
**Commit:** 91db923b
**Applied fix:** In `configure`, `gatesNow` is swapped and re-watched before `remerge()`. M47 changes registry and reading in one `configure` and asserts exactly one published snapshot, joined to the new registry, and that the old registry's `instances()` was not read. It fails with the old order.

### IN-06: Spec text did not follow iterations 2 and 3

**Files modified:** `spec/invariants.md` (Rev 1.141), `spec/behaviors/28-devtools-screens.md` (Rev 1.30), `spec/traceability.md` (Rev 1.206), `spec/README.md` (Rev 1.226)
**Commit:** 703bfd55 (the spec edits that follow from IN-01 to IN-05 are in 91db923b, with `spec/decisions/162...` Rev 1.5)
**Applied fix:** INV-QD-343's statement says the failure is an error's name and message, and its enforcement cites M36 to M47 and what each pins. BEH-QD-584's same-registry requirement reads "after a watch that worked". BEH-QD-583's pinned-by list names M38, M45 and M46. The traceability rows and history cover M42 to M47. The CCR-QD-440 row in `spec/README.md` gained the iteration-3 changes and the new revision ranges. No new BEH, INV, ADR or CCR id was used.

## Verification

All run in the main checkout (no worktree), from the repository root, after the last commit:

- `pnpm exec vitest run --project devtools`: 64 files, 1519 tests passed
- `pnpm exec vitest run --project react`: 34 files, 518 tests passed
- `pnpm typecheck`, `pnpm circular`, `pnpm test:tstyche` (293 tests, 613 assertions): passed
- `pnpm lint`: no errors (warnings only, all in files this phase did not touch)
- `pnpm spec:verify:strict` (21 pass, 0 fail, 0 skip), `pnpm spec:examples` (116 blocks), `pnpm spec:website-examples` (67 blocks), `pnpm spec:api` (932 exports), `pnpm spec:claims` (8 claims): passed
- Stryker on `DockModel.ts` and `Gates.ts` (run after 365b82a8): `DockModel.ts` 100.00 (123 killed, 0 survived), `Gates.ts` 100.00 (66 killed, 0 survived). A first run left two survivors, the fallback string and the `keyOf` catch; M46 now pins both.

M42, M43, M46 and M47 fail with the source reverted to the iteration-2 state (checked with `git stash` on `DockModel.ts`); M45 passes on it by design, since it covers an arm that already worked.

---

_Fixed: 2026-11-16T11:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
