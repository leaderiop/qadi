---
phase: 32-evaluation-options-and-services-stated-once
verified: 2026-11-12T00:00:00Z
re_verified: 2026-11-13
status: passed
score: 4/4 roadmap truths verified (11/11 requirement IDs accounted for)
covered_files:
  - ".planning/phases/32-evaluation-options-and-services-stated-once/32-01-PLAN.md"
  - ".planning/phases/32-evaluation-options-and-services-stated-once/32-01-SUMMARY.md"
  - ".planning/phases/32-evaluation-options-and-services-stated-once/32-02-PLAN.md"
  - ".planning/phases/32-evaluation-options-and-services-stated-once/32-02-SUMMARY.md"
  - ".planning/phases/32-evaluation-options-and-services-stated-once/32-03-PLAN.md"
  - ".planning/phases/32-evaluation-options-and-services-stated-once/32-03-SUMMARY.md"
  - ".planning/phases/32-evaluation-options-and-services-stated-once/32-04-PLAN.md"
  - ".planning/phases/32-evaluation-options-and-services-stated-once/32-04-SUMMARY.md"
  - "packages/core/src/Evaluate.ts"
  - "packages/core/src/EvaluationServices.ts"
  - "packages/core/src/Lifecycle.ts"
  - "packages/core/src/Qadi.ts"
  - "packages/core/src/Question.ts"
  - "packages/core/src/index.ts"
  - "packages/core/test/EvaluationShapes.tst.ts"
  - "packages/core/test/Lifecycle.tst.ts"
covered_digest: "v4:sha256:0d6990cc2f8cd1b17c9182be2afb20869a528250a2afdeaf9075574199c6e0d7"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 32: Evaluation options and services stated once - Verification Report

**Phase Goal:** `EvaluateOptions` and the evaluation services are each declared once, and reading the pipeline `Qadi.ts` -> `Evaluate.ts` -> `Lifecycle.ts` -> `Walk.ts` meets no duplicated type.
**Verified:** 2026-11-12
**Status:** passed
**Re-verification:** Yes, 2026-11-13 at HEAD of arch-wave-8 (status unchanged: passed)

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `EvaluateOptions` has one declaration, beside `QuestionOptions` in `Question.ts`; `LifecycleOptions` is deleted and every use reads `EvaluateOptions` | VERIFIED | `grep (interface\|type) EvaluateOptions` over `packages/core/src` gives one hit, `Question.ts:46` (`extends QuestionOptions`, right after it). `LifecycleOptions` appears nowhere in packages/features/examples/apps/scripts/.changeset; it survives only in `spec/` as history (ADR-QD-105 and ADR-QD-037 revision notes, CCR-QD-423 row) saying it was deleted. `Lifecycle.ts:66` takes `Omit<EvaluateOptions, keyof QuestionOptions>`, `:197` takes `EvaluateOptions`. |
| 2 | `EvaluationServices` and `StandingEvaluationServices` have one declaration, in the type-only `EvaluationServices.ts`; the hand-spelled services union in `Lifecycle.ts` is deleted | VERIFIED | One declaration each (`EvaluationServices.ts:23`, `:40`). File holds only three `import type` lines and the two aliases. A grep of `packages/*/src` for `CurrentSubject \| EvaluationId` / `EvaluationId \| PortServices` finds only that declaration and one doc-comment sentence (`Ports.ts:121`, prose, not a type). `Lifecycle.ts:198` returns `Effect.Effect<Asked, EvaluationError, EvaluationServices>`; `Lifecycle.ts` and `Walk.ts` name only `PortServices` (a different, narrower type), not the union. |
| 3 | `Evaluate.ts` declares only `evaluate`, with no option or service type and no restatement | VERIFIED | `Evaluate.ts` has one export (`evaluate`) and only `import type` of the moved types; no interface, no alias, no re-export. No file in packages/features/examples/apps imports a moved type from an `Evaluate.ts` path (only `{ evaluate }` is imported); `Qadi.ts`, `SubjectSet.ts`, etc. import from `Question.ts` / `EvaluationServices.ts`. Barrel has `export * from "./EvaluationServices.ts"` between EvaluationMetrics and EvaluationServicesNone (alphabetical). |
| 4 | `pnpm circular` and `pnpm typecheck` stay green (no TS2883); `Lifecycle.tst.ts` pins the option key set once; overview module column and traceability name the new modules | VERIFIED | Own run: `pnpm circular` "No circular dependency found"; tstyche on `EvaluationShapes.tst.ts` + `Lifecycle.tst.ts` 8 tests / 11 assertions pass; `pnpm spec:api` 911 exports documented. Orchestrator's `check:pr` log: step 1/16 typecheck passes, exit 0, no TS2883. `Lifecycle.tst.ts:21` has the single `keyof EvaluateOptions` pin, `:27-32` pins decideQuestion's parameter as the remainder, `:38-39` ask's options and requirements. `spec/overview.md:166,180,181` name `Question.ts` / `EvaluationServices.ts`; `spec/traceability.md:479` has the new `EvaluationShapes.tst.ts` row. |

**Score:** 4/4 truths verified, 0 behavior-unverified. The phase moves types only (no runtime behaviour changes), so no behaviour-dependent truth exists.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/EvaluationServices.ts` | VERIFIED | Exists, substantive, type-only; imported by `Evaluate.ts`, `Lifecycle.ts`, `Qadi.ts`, barrel. |
| `packages/core/src/Question.ts` (`EvaluateOptions`) | VERIFIED | Imports only `effect/Types` (type), `AuthSubject`, `Policy`, `Resource`; no evaluation code, no `Ports.ts`. |
| `packages/core/test/EvaluationShapes.tst.ts` | VERIFIED | Byte-identical to commit 459ad540 at HEAD (`git diff 459ad540 HEAD` is empty); passes. |
| `packages/core/test/Lifecycle.tst.ts` | VERIFIED | Rewritten pin, passes. |
| `.changeset/evaluation-options-stated-once.md` | VERIFIED | `"@qadi/core": patch`, names the types and says names/shapes are unchanged. |
| `32-mutation-base.json` / `32-mutation-after.json` | VERIFIED | The two files hold identical values for all six touched files. |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `Lifecycle.ts` | `Question.ts` | WIRED | `Omit<EvaluateOptions, keyof QuestionOptions>` at `Lifecycle.ts:66`. |
| `Evaluate.ts` | `Lifecycle.ts` `ask` | WIRED | `Effect.map(ask(policy, options), ...)`. |
| `Qadi.ts` | `EvaluationServices.ts` / `Question.ts` | WIRED | Imports at `Qadi.ts:30,35`; `EnforceOptions extends EvaluateOptions` at `:98`. |
| Pin | barrel | WIRED | `EvaluationShapes.tst.ts` reads through `../src/index.ts`. |

### Data-Flow Trace (Level 4)

Not applicable: types-only change, no rendered data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| No cycles | `pnpm circular` | no circular dependency | PASS |
| Type pins | `tstyche EvaluationShapes + Lifecycle` | 8 tests, 11 assertions pass | PASS |
| API surface gate | `pnpm spec:api` | 911 exports documented | PASS |
| Full merge gate | `pnpm check:pr` (orchestrator log, HEAD after review fixes) | 16/16 steps, exit 0; 4711 tests, BDD 568, examples 42 | PASS |

### Probe Execution

None declared by the phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| EOPT-01 | 32-02 | SATISFIED | Truth 1 |
| EOPT-02 | 32-02 | SATISFIED | Truth 2 |
| EOPT-03 | 32-02 | SATISFIED | Truth 3 |
| EOPT-04 | 32-02, 32-03 | SATISFIED | Truth 4 |
| WX-01 | 32-04 | SATISFIED | `check:pr < /dev/null` exit 0 on HEAD (log). |
| WX-02 | 32-03 | SATISFIED | CCR-QD-423 row in `spec/README.md:360`, revision notes in ADR-QD-105 and ADR-QD-037, ADR-QD-145 left unused; no ADR file created. |
| WX-03 | 32-03 | SATISFIED | Overview module cells corrected by hand (`Question.ts`, `EvaluationServices.ts`); `spec:api` passes; no export added or removed. |
| WX-04 | 32-04 | SATISFIED | Added-line scan under packages/features/examples finds no new `as`, `!`, `any`, `switch`, `fnUntraced`, `async/await`, `console`, `process.env`, clock or suppression (three hits are `import type * as` and the word "any" in prose). No diff since base in scripts, AGENTS.md, CONTRIBUTING.md, upgrading.md, package.json, lockfile. |
| WX-05 | 32-01, 32-04 | SATISFIED | Base and after mutation JSON equal for all six files; check:pr coverage step passed (core >= 95%). |
| WX-06 | 32-01, 32-04 | SATISFIED | Commit order from `git log`: baseline e88d9f23, pin 459ad540, then refactor e6302d32 and a7323863; pin unchanged since 459ad540. |
| WX-07 | 32-03 | SATISFIED | No public break (names and shapes unchanged); patch changeset only, no `upgrading.md` or package.json change. |

All 11 IDs appear in plan frontmatter and are marked Complete in REQUIREMENTS.md. No orphaned requirement IDs for Phase 32.

### Anti-Patterns Found

None. No TBD/FIXME/XXX markers or stubs in the touched types. The two post-plan review-fix commits (36972599 reword of the `EvaluationServices.ts` header; 4d5d9258 literal-remainder pin in `Lifecycle.tst.ts`) are consistent with the plan intent and the gate is green after them.

### Info (not gaps)

- `Ports.ts:121` quotes the services union in a doc comment as prose; it is not a declaration.
- Carried debt, recorded in CCR-QD-423 for Phase 36: ADR-QD-081 wording, and src comments mentioning `Evaluate.ts` for unrelated reasons.
- The 32-04 commit-order check predates the two review-fix commits by design; I confirmed from history that those two commits touch only `EvaluationServices.ts` (comment) and `Lifecycle.tst.ts`.
- Not re-run by me: full typecheck, coverage, BDD, Stryker (relied on the orchestrator's log of `check:pr` on the same HEAD and the committed mutation JSON).

### Human Verification Required

None.

### Gaps Summary

No gaps. Each of the four roadmap truths is backed by code and a passing gate. The phase goal is achieved: each of the three types is declared once, `LifecycleOptions` is gone from code, and `Evaluate.ts` holds only `evaluate`.

## Re-verification (2026-11-13)

Status was `stale` because a later v1.3 phase touched a covered file. Result: goal and all four truths still hold at HEAD; no regression.

| Moved file | Later commit(s) | Judgement |
|------------|-----------------|-----------|
| `packages/core/src/index.ts` | `d8122f1c` feat(33-02): one sealed evaluation environment in core | Expected. The only diff since phase 32's last code commit (`4d5d9258`) is one added line, `export * from "./EvaluationEnvironment.ts";`, placed alphabetically before `EvaluationId.ts`. `export * from "./EvaluationServices.ts"` is intact, so the services stay declared once. |

The other seven covered code and test files (`Evaluate.ts`, `EvaluationServices.ts`, `Lifecycle.ts`, `Qadi.ts`, `Question.ts`, `EvaluationShapes.tst.ts`, `Lifecycle.tst.ts`) have no commit since `4d5d9258` (`git log 4d5d9258..HEAD` empty for each).

Fresh evidence at HEAD:

- Single declarations: `grep (interface|type) EvaluateOptions|LifecycleOptions|EvaluationServices|StandingEvaluationServices` over `packages/*/src` gives `Question.ts:46` and `EvaluationServices.ts:23,40` only. `LifecycleOptions` appears nowhere in packages, features, examples, apps, scripts or .changeset.
- No hand-spelled services union: the only match is `EvaluationServices.ts:23` plus the prose in `Ports.ts:121`. `Lifecycle.ts:66` (`Omit<EvaluateOptions, keyof QuestionOptions>`) and `:197-198` still read the shared types. `Evaluate.ts` still has one export, `evaluate`, and only `import type` of the moved types.
- New phase-33 consumer `EvaluationEnvironment.ts` imports `StandingEvaluationServices` from `EvaluationServices.ts` (line 23, 94): it reuses the single declaration and adds no duplicate.
- `pnpm circular`: no circular dependency. tstyche on `EvaluationShapes.tst.ts` + `Lifecycle.tst.ts`: 8 tests, 11 assertions pass.
- `pnpm check:pr < /dev/null` exit 0 at 341c1c15 (log read: 16 of 17 steps, mutation skipped by design, exit=0; the v1.3 audit reports all seams PASS). Later commits are `.planning`-only.
- `spec/overview.md` change history 1.97 still records EvaluateOptions' module as `Question.ts` and the services' as `EvaluationServices.ts` (CCR-QD-423).
- Requirements: EOPT-01..04 and WX-01..07 are all `[x]` and `Complete` in `.planning/REQUIREMENTS.md`; all eleven still accounted for.

Status: passed. Not re-run by me: the full Vitest/coverage/Playwright run (relied on the `check:pr` log) and Stryker (the per-phase mutation JSON is unchanged).

---

_Verified: 2026-11-12_
_Verifier: Claude (gsd-verifier)_
