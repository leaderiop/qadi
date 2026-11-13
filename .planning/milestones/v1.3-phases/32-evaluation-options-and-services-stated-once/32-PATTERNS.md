# Phase 32: Evaluation options and services stated once - Pattern Map

**Mapped:** 2026-11-12
**Files analyzed:** ~25 (1 new src, 1 new pin, rest moves/edits)
**Analogs found:** all in-repo; no RESEARCH.md

## File Classification

| File | Role | Data flow | Analog | Match |
|------|------|-----------|--------|-------|
| `packages/core/src/EvaluationServices.ts` (new) | type-only leaf | none | `EvaluationServicesNone.ts` header; `Question.ts` header (leaf rule) | role |
| `packages/core/test/EvaluationShapes.tst.ts` (new, name free; D-10 base pin) | tstyche pin | type | `Lifecycle.tst.ts`, `Ports.tst.ts` | exact |
| `Question.ts` (gains `EvaluateOptions`) | model | type | itself (`QuestionOptions`, lines 9-30) | exact |
| `Evaluate.ts`, `Lifecycle.ts`, `Qadi.ts`, `GuardHealthCheck.ts`, `SubjectSet.ts`, `EvaluationServicesNone.ts`, `index.ts` | import-site edits | | | |
| `test/Lifecycle.tst.ts` (rewrite) | tstyche pin | type | its current self | exact |
| spec/changeset | docs | | phase 31 commits `4fbff641`, `7b97968c` | exact |

## Current facts (verified)

**`Question.ts` imports today** (lines 9-12): `type AuthSubject ./AuthSubject.ts`, `DEFAULT_MAX_DEPTH` + `type Policy` from `./Policy.ts`, `type Resource ./Resource.ts`. Moving `EvaluateOptions` adds only `import type { Concurrency } from "effect/Types"` (external, not a madge edge). Header (lines 1-8) already says "imports no evaluation code".

**Evaluate.ts** imports (lines 10-21): `Effect`, `type Concurrency`, CurrentSubject, Decision, EvaluationError, EvaluationId, `ask` from Lifecycle, Policy, `type PortServices`, `type QuestionOptions`. Declares `EvaluateOptions` (26-~66, doc comments for `concurrency` 27-46 and `evaluationId` 47+, move verbatim), `EvaluationServices` (77), `StandingEvaluationServices` (94), then `evaluate` (107-111). After move it needs `type EvaluateOptions` (Question.ts) and `type EvaluationServices` (new leaf); drop `Concurrency`, `CurrentSubject`, `EvaluationId`, `PortServices`, `QuestionOptions` imports (verify none else used). Keep `Effect`, `ask`, `Decision`, `EvaluationError`, `Policy`.

**Leaf module body (copy from Evaluate.ts 70-94):**
```ts
import type { CurrentSubject } from "./CurrentSubject.ts";
import type { EvaluationId } from "./EvaluationId.ts";
import type { PortServices } from "./Ports.ts";

export type EvaluationServices = CurrentSubject | EvaluationId | PortServices;
export type StandingEvaluationServices = Exclude<EvaluationServices, CurrentSubject>;
```
Add a file header doc (summary line first, then why: type-only, below Evaluate/Lifecycle, ADR-QD-037). No plan/decision ids in doc comments per CONTEXT (header may cite why, keep ids out).

**Lifecycle.ts** edits:
- Header comment lines 15-17 (restatement rationale) rewrite; line 57 comment, line 89 comment.
- Delete `LifecycleOptions` (lines 55-65, incl. its doc) and `import type { Concurrency } from "effect/Types"` (line 24) if unused after.
- line 77: `options?: Omit<EvaluateOptions, keyof QuestionOptions>`.
- lines 208-209 become:
```ts
export const ask = (
  policy: Policy,
  options?: EvaluateOptions,
): Effect.Effect<Asked, EvaluationError, EvaluationServices> =>
```
- imports: replace `import type { QuestionOptions } ...` usage: `import type { EvaluateOptions, Question, QuestionOptions } from "./Question.ts"` (QuestionOptions still needed for the `Omit`); add `import type { EvaluationServices } from "./EvaluationServices.ts"`. `CurrentSubject`/`EvaluationId` value imports stay only if still used as values (`CurrentSubject.use`, EvaluationId service read) -- check. `PortServices` still used at line 128 (`lookupEffect`).

**Import-site edits (exact):**
- `Qadi.ts:29`: `import type { EvaluateOptions, EvaluationServices } from "./Evaluate.ts"` -> split: `EvaluateOptions` from `./Question.ts` (merge with existing Question import if any), `EvaluationServices` from `./EvaluationServices.ts`.
- `GuardHealthCheck.ts:30`: `EvaluateOptions` -> `./Question.ts`.
- `SubjectSet.ts:35`: `EvaluateOptions` -> `./Question.ts`, `StandingEvaluationServices` -> `./EvaluationServices.ts`.
- `EvaluationServicesNone.ts:40`: -> `./EvaluationServices.ts`.
- `index.ts`: currently line 17 `export * from "./Evaluate.ts";`, line 20 `./EvaluationServicesNone.ts`. Insert `export * from "./EvaluationServices.ts";` right before the `EvaluationServicesNone.ts` line (`.` sorts before `N`); check line 18-19 (`EvaluationId` etc.) ordering when editing.
- TS2883 risk: if declaration emit complains, add one named re-export only (D-05).

## HIDDEN BREAKAGE: tests importing from `src/Evaluate.ts` (must be re-pointed)

| File:line | Import |
|-----------|--------|
| `packages/core/test/helpers.ts:11` | `EvaluationServices, StandingEvaluationServices` |
| `packages/core/test/Qadi.tst.ts:22` | `EvaluationServices` |
| `packages/core/test/Errors.tst.ts:35` | `EvaluationServices, StandingEvaluationServices` |
| `packages/core/test/DecisionSink.tst.ts:15` | `EvaluationServices` |
| `packages/core/test/Question.test.ts:6` | `EvaluateOptions` |
| `packages/core/test/Ports.tst.ts:16` | `EvaluationServices, StandingEvaluationServices` |
| `packages/core/test/Lifecycle.tst.ts:13-14` | `EvaluateOptions`, `LifecycleOptions` (rewritten anyway) |

Re-point to `../src/EvaluationServices.ts` / `../src/Question.ts`. Caveat vs D-10 ("move keeps the pin green unchanged"): the new characterisation pin must import from `../src/index.ts` so it needs zero edits. Other packages and `features/step-definitions/Bridge.ts:33` import `EvaluateOptions` from `"@qadi/core"`: unaffected. No hits in `examples/`, `apps/website`, or `spec/behaviors` compiled fences by relative path (grep of `packages features examples spec apps` for the four names, excluding CHANGELOG/decisions/.planning; spec hits are prose only, listed below). `.changeset/promise-facade-cancellation.md` mentions `EvaluateOptions` in prose only (history, leave).

## Pin analog (new base pin, D-10)

Header style from `Ports.tst.ts:1-9` (doc comment, then `import { expect, test } from "tstyche"`). Use barrel import:
```ts
import { expect, test } from "tstyche";
import type { EvaluateOptions, EvaluationServices, StandingEvaluationServices, QuestionOptions } from "../src/index.ts";
```
Existing assertion forms to copy (`Lifecycle.tst.ts:17-24`): `expect<A>().type.toBeAssignableTo<B>()` both directions and `expect<keyof A>().type.toBe<...>()`. For field types: `expect<EvaluateOptions["concurrency"]>().type.toBe<Concurrency | undefined>()`, `expect<EvaluateOptions["evaluationId"]>().type.toBe<string | undefined>()`; `Ports.tst.ts` already pins `EvaluationServices` as `CurrentSubject | EvaluationId | PortServices` (traceability 307), so reuse `expect<EvaluationServices>().type.toBe<CurrentSubject | EvaluationId | PortServices>()`. Note `tsconfig.test.json` compiles every `*.tst.ts`, so no deliberate compile errors.

**Rewritten `Lifecycle.tst.ts` (D-11):** pin `keyof EvaluateOptions` is `keyof QuestionOptions | "concurrency" | "evaluationId"`; and `Parameters<typeof decideQuestion>[1]` is `Omit<EvaluateOptions, keyof QuestionOptions> | undefined` (toBe both directions). Header: drop restatement prose (current header lines 1-10 describe it).

## Comment sites naming the old home (D-12)

`DecisionCache.ts:9`, `DecisionSink.ts:5`, `Ports.ts:6,121`, `Predicate.ts:186`, `Qadi.ts:465`, `Question.ts:18,44`, `Lifecycle.ts:15-17,57,89`, `EvaluationServicesNone.ts` (grep `Evaluate.ts` in each; change to `EvaluationServices.ts` or `Question.ts`).

## Spec/records analogs

- `spec/overview.md:166` `EvaluateOptions | type | \`Evaluate.ts\`` -> `Question.ts`; `:180`, `:181` -> `EvaluationServices.ts` (keep the rest of the cell text).
- `spec/behaviors/06-services.md:56`: "`EvaluationServices` (`Evaluate.ts`)" -> `EvaluationServices.ts`.
- `spec/traceability.md:478` row: `ADR-QD-037 — \`LifecycleOptions\` is exactly \`EvaluateOptions\` less \`QuestionOptions\`, both directions (\`tstyche\`)` -> restate for D-11; `:307` (Ports.tst.ts) names `EvaluationServices` only, check whether it names the module; add a row for the new pin file. Phase 31 analog: commit `7b97968c` (traceability + README + changeset).
- ADR notes: `spec/decisions/105-an-obligation-is-discharged-against-the-question-it-answered.md` and `037-circular-imports-and-type-level-tests-are-gates.md`. Analog `4fbff641` on ADR-132: bump header `Revision` 1.0 -> 1.1 in the `> | Property | Value |` table, append to `Change History` (`1.1 (2026-11-12): ... (ARCH-80, CCR-QD-423)`), add the dated revision note in the body. Match the existing table column widths.
- `spec/README.md`: new CCR-QD-423 row beside CCR-QD-422 (see `git show 7b97968c -- spec/README.md`); name ADR-QD-145, BEH-QD-496..500, INV-QD-309..310 Unused in the row.
- Changeset: `.changeset/<kebab-name>.md`, format from `shared-computation-reset-supersedes.md`:
```
---
"@qadi/core": patch
---

<behaviour-first prose; no Breaking marker>
```
  Its text must say names and shapes are unchanged, e.g. `EvaluateOptions` now declared in `Question.ts`, services in a new `EvaluationServices.ts`.

## Shared rules to apply

- Imports: `import type`, `.ts` extensions, submodule `effect/Types` (AGENTS.md section 1).
- Doc comments: one-line summary first, why after.
- Barrel `export *`, alphabetical (section 9).
- Mutation base for `Lifecycle.ts` and `Evaluate.ts` first, then pin, per phases 30-31 method (see `acd47892`, `4f22f6a7` for the baseline commit shape).
- Gates to run: `pnpm circular` (madge), `pnpm spec:api` (gate 13; `spec/overview.md` must still name every export), typecheck incl. declaration emit.

## No Analog Found

None; the only novel file is the type-only leaf, patterned on `Question.ts`'s no-evaluation-imports header.
