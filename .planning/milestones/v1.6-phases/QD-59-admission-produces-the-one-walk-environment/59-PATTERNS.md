# Phase 59: Admission produces the one walk environment - Pattern Map

**Mapped:** 2026-11-19
**Files analyzed:** 14 (3 src, 1 new tstyche, 1 test edit, 1 mutation script, 1 bench harness reuse, 7 record files)
**Analogs found:** 14 / 14 (the three src files are their own analog: a refactor, the prototype patch is the pattern)

All analog paths below are git-tracked (checked `git ls-files` for the Admission/DecisionLog files; `.planning/` and `packages/` analogs are tracked source, no `.gsd` mirrors involved).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/core/src/Admission.ts` (modify) | model (proof-by-construction class) + admit fn | transform | itself at base (`Admission.ts:25-53`) + `research-probes/proto-p1.patch.txt` | exact (prototype) |
| `packages/core/src/Walk.ts` (modify) | service/interpreter | request-response | itself at base (`Walk.ts:67-72, 319-327, 889-906`) + patch | exact (prototype) |
| `packages/core/src/Predicate.ts` (modify) | interpreter (translator) | transform | itself at base (`Predicate.ts:356-360`, `toPredicate` ~661-676) + patch | exact (prototype) |
| `packages/core/test/Admission.test.ts` (modify) | test | request-response | itself (`:1-85`) | exact |
| `packages/core/test/WalkEnvironment.tst.ts` (new) | test (type-level) | transform | `packages/core/test/DecisionLog.tst.ts` (`expect(...).type.not.toBeCallableWith`, line 30) | role-match |
| `.planning/phases/QD-59-.../59-mutation.mjs` (new) | script | batch | `.planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-mutation.mjs` (moved-with-receiver rule) + `.planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-mutation.mjs` (mechanics, static credit) | exact |
| `.planning/phases/QD-59-.../bench/` (`ab.sh`, `analyze.mjs`, `gate*`; after-run dir new) | script | batch | `.planning/milestones/v1.5-phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/ab.sh`, `analyze.mjs`; `50-BENCH.md` | exact (already copied into 59) |
| `59-BENCH.md` / ADR-QD-172 benchmark tables | doc | — | `50-BENCH.md`; ADR-QD-163 § Measurement | exact |
| `spec/decisions/172-*.md`, `spec/decisions/index.yaml` | spec (ADR) | — | `spec/decisions/171-a-stored-record-is-its-envelope-in-memory-too.md` | exact |
| `spec/decisions/100-*.md`, `163-*.md`, `024-*.md` (amend) | spec | — | each file's own Rev/amendment header style (ADR-QD-100 "Amendment (2026-10-08, ARCH-41)" `:69-82`) | exact |
| `spec/invariants.md` INV-QD-363..364, amend INV-QD-037 | spec | — | INV-QD-361..362 (Phase 58); INV-QD-037 `:1515-1575` | exact |
| `spec/behaviors/05-evaluator.md`, `16-predicates.md`, `spec/behaviors/index.yaml` BEH-QD-631..635 | spec | — | BEH-QD-626..630 (Phase 58), BEH-QD-606 in `05-evaluator.md` | exact |
| `spec/README.md` CCR-QD-450 row + change-history line | spec | — | CCR-QD-449 row / line 13 change history; CCR-QD-445 row format (`spec/README.md:382`) | exact |
| `spec/traceability.md` | spec | — | `:388` the `Admission.test.ts` row | exact |

No changeset (D-10, research: no public change). `spec/overview.md` unchanged (gate 13). `scripts/check-house-style.mjs` unchanged.

## Pattern Assignments

### `packages/core/src/Admission.ts` (model, transform)

**Analog:** itself at base plus `research-probes/proto-p1.patch.txt` (SHA-256 `7cd868b6...4ee3`; `git apply --check` passes on `e9b98bb8`). Apply the patch's `Admission.ts` hunk as the starting point.

**Base shape to replace** (`Admission.ts:25-53`): imports `Result`, `PolicyTooDeep`, `MatcherContext` (type), `policyDepth`, `Question` (type). Class `Admitted { question, matcherContext }`; `admit` is a single arrow returning `Result.fail(new PolicyTooDeep({ maxDepth }))` or `Result.succeed(new Admitted(...))`.

**Target shape** (research "The proposed shape", typechecked, no `as`):
```ts
export type RowSource = "asked" | "row";

export class Admitted<Resource extends boolean = boolean> {
  constructor(
    readonly subject: AuthSubject,
    readonly supplied: Supplied<Resource>,
    readonly matcherContext: MatcherContext,
    readonly maxDepth: number,
  ) {}
}

export function admit(question: Question, rowSource: "row"): Result.Result<Admitted<true>, PolicyTooDeep>;
export function admit(question: Question, rowSource: RowSource): Result.Result<Admitted, PolicyTooDeep>;
export function admit(question: Question, rowSource: RowSource): Result.Result<Admitted, PolicyTooDeep> {
  return policyDepth(question.policy) > question.maxDepth
    ? Result.fail(new PolicyTooDeep({ maxDepth: question.maxDepth }))
    : Result.succeed(new Admitted(question.subject,
        { action: question.action !== undefined,
          resource: rowSource === "row" || question.resource !== undefined },
        { subject: question.subject.attributes, subjectId: question.subject.id,
          resource: question.resource, action: question.action },
        question.maxDepth));
}
```
Add only `import type { AuthSubject }` and `import type { Supplied }` (`Supplied` from `LeafNeeds.ts:~180`). Keep exactly one `new PolicyTooDeep(` here (`ADMISSION_ALLOWED` `Admission.ts: 1`, `check-house-style.mjs:588`). Doc comment: keep the one-line-summary-first shape; extend the header ("once, for both interpreters") to the environment and rewrite "`Admitted` ... the question plus the matcher context". Keep the "call lazily inside `Effect.suspend`" note. Only `admit` builds `Admitted` (never `new Admitted` elsewhere, tests included).

### `packages/core/src/Walk.ts` (interpreter, request-response)

**Analog:** itself at base + patch. Excerpts to change:

- `Evaluation` (`Walk.ts:67-72`) becomes `{ readonly admitted: Admitted; readonly concurrency: Concurrency | undefined }` (Walk-private, D-12). Keep the parameter name `request` for it, not `ev` (research Pitfall 5: `{ concurrency: request.concurrency }` mutant text must stay byte-identical).
- `evaluateNode` (`:319-327`): base signature `(policy, subject, request, matcherContext, depth, maxDepth)` and guard `if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));`. Target: `(policy, request, depth)`, prologue `const { admitted } = request; const { maxDepth } = admitted; if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));` then `const { subject, supplied, matcherContext } = admitted; const { action, resource } = matcherContext;` (keeps mutant text byte-identical, D-15). Export `evaluateNode` (D-14) for the tstyche negative.
- Three dispatchers `evaluateAllOf` (`:548`), `evaluateAnyOf` (`:685`), `evaluateRules` (`:743`) stay `Effect.fnUntraced` (`UNTRACED_BUDGET` Walk.ts: 3); signature `(policy, request, depth)`; every child `evaluateNode(child, request, depth + 1)`.
- 13 call sites: 9 recursive (`:410, 425, 443, 562, 582, 699, 713, 797-804, 827`), 3 hand-offs (`:399, 402, 405`), 1 root (`:905`).
- `walk` (`:889-906`), base excerpt shown above in the codebase: builds `request` with hand-made `supplied`, calls `admit(question)`, then `evaluateNode(policy, subject, request, admitted.success.matcherContext, 0, maxDepth)`. Target, inside the same `Effect.suspend`:
```ts
const admitted = admit(question, "asked");
if (Result.isFailure(admitted)) return Effect.fail(admitted.failure);
return evaluateNode(question.policy, { admitted: admitted.success, concurrency }, 0);
```
- Rewrite the false doc paragraph at `Walk.ts:51-62` (depth/maxDepth swap "still typechecks") and `:301-318`. Drop the now-unused `Supplied` import. `switch` stays (SWITCH_BUDGET Walk.ts: 1, name `evaluateNode`); add no `as`, `!`, `any`.

### `packages/core/src/Predicate.ts` (interpreter, transform)

**Analog:** itself at base + patch.

**Base** (`Predicate.ts:356-360`):
```ts
const compileTree = (admitted: Admitted): Compiled => {
  const { policy, subject, action } = admitted.question;
  const context = admitted.matcherContext;
  // A predicate filters rows, so the resource is the row and is always present.
  const supplied: Supplied<true> = { action: action !== undefined, resource: true };
```
**Target:** `compileTree(policy: Policy, admitted: Admitted<true>)` with `const { subject, supplied, matcherContext: context } = admitted; const { action } = context;`; delete the hand-built `supplied` and its comment (the rule now lives in `admit`'s `rowSource === "row"`). `toPredicate` calls `admit(question, "row")` (overload gives `Admitted<true>`), keeps `admit` BEFORE `restrictsFields` (ARCH-02 D-02-e, INV-QD-037), passes `policy` into `compileTree`, and `admitted.success.subject` / `.matcherContext` into `run` (`:676`). Remove unused `Supplied` import. `run`/`columnPredicate` signatures unchanged.

### `packages/core/test/Admission.test.ts` (test, request-response)

**Analog:** itself (`:1-85`). Style: `@effect/vitest` `assert`/`describe`/`it`, `subjectWith` from `./helpers.ts`, `questionOf(subject, policy, opts)`, narrowing via `Result.isFailure(admitted)`; the `refusal(policy, maxDepth)` helper at `:21-24`.

Edits in the atomic commit: calls at `:23, 61, 73` get the second argument (`"asked"`); `:78`'s `admitted.success.question.policy._tag` (TS2339) is replaced by assertions on `supplied`/`maxDepth`. Never weaken (D-07). RED rows go in first, failing on the base: `admit(q, "asked").success.supplied` for `{resource, action}`, `{resource}`, `{action}`, `{}`; `admit(q, "row").success.supplied.resource === true` regardless of `question.resource`; `.action` follows `question.action`; `.maxDepth === question.maxDepth`; `.subject === question.subject` (`assert.strictEqual` identity, as at `:66-69`).

Core excerpt to copy (`:60-70`):
```ts
const admitted = admit(questionOf(subject, P.hasRole("editor"), { resource, action: "publish" }));
assert.isTrue(Result.isSuccess(admitted));
if (Result.isFailure(admitted)) return;
assert.strictEqual(admitted.success.matcherContext.subject, subject.attributes);
```

### `packages/core/test/WalkEnvironment.tst.ts` (test, type-level)

**Analog:** `packages/core/test/DecisionLog.tst.ts`. Imports `{ expect, test } from "tstyche"`, `import type` for types, header doc comment stating the invariants. Negative form (line 30): `expect(makeDecisionLog).type.not.toBeCallableWith({ capacity: 10 });`. Other tstyche precedents: `LeafNeeds.tst.ts:13` imports a package-private `../src/LeafNeeds.ts` directly; `DecisionStream.tst.ts:49-51` warns about a negative `toBeCallableWith` passing for an unrelated Effect reason (the refusal here must be an argument error; use the `Parameters<typeof evaluateNode>` form too). Full draft test is in 59-RESEARCH.md "The tstyche shape" and "tstyche pin for `supplied`'s precision". Committed RED on the base (`evaluateNode` not exported, `admit` has no second argument). Run: `pnpm exec tstyche packages/core/test/WalkEnvironment.tst.ts`; config `tstyche.json` uses `tsconfig.test.json`.

### `59-mutation.mjs` (script, batch)

**Analogs:** `54-mutation.mjs` (moved-with-receiver rule: killed mutants on a MOVED statement may leave `Walk.ts`/`Predicate.ts` if `Admission.ts` gains at least as many, `det(receiver) + gain >= lost`) and `58-mutation.mjs` (mechanics).

Reuse from 58 verbatim: `SUITES` map keyed by Stryker config (`cf`, `rp`, `dirs`, `files`; line ~21), `norm`/`text`/`lineOf`, `keyOf` identity (`mutatorName | replacement | mutated text | normalised line`, `:46-52`), `anchorOf`, the `write`/`reportOf` staleness check, subcommands `base|after|evidence|compare`, static credit via an `ignoreStatic:false` run through a scratchpad config (never edit the repo's). Changes: `D` path to the 59 directory, `SUITES.core.files = [Admission.ts, Predicate.ts, Walk.ts]` (`Matcher.ts` only if touched), a `DELETED` table declared before the change: `Walk.ts` `"supplied: { action: question.action"`, `Predicate.ts` `"const supplied: Supplied<true>"`, plus the moved survivors (D-15). Command: `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Admission.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts' < /dev/null`, one at a time, never beside vitest or the bench. Base committed alone, never re-baselined.

### Bench (`bench/ab.sh`, `bench/analyze.mjs`, after-run output)

**Analog:** Phase 50's `bench/ab.sh` (usage `ab.sh <patch> <outdir> <rounds> <head-label> <patched-label>`; `git apply` before and reverse after each arm; refuses when `packages/core/src` is dirty or a vitest bench/stryker is running; exit codes 2-5, 130/143) and `analyze.mjs`; already copied to `.planning/phases/QD-59-.../bench/` with `gate/` and `gate-r2/` outputs. Gate line `# gate: pass` is the verdict. The after-run (D-06/D-18) runs the same 3+3 harness against the phase base with the real change as the "patched" arm (or base commit vs HEAD), on a quiet host, and its table goes in ADR-QD-172 and `59-BENCH.md`.

### Records (ARCH-106, ADR-QD-172, CCR-QD-450, BEH-QD-631..635, INV-QD-363..364)

**Analog:** Phase 58's records (`58-PATTERNS.md` "Records" section; ADR-QD-171 `spec/decisions/171-a-stored-record-is-its-envelope-in-memory-too.md`; CCR-QD-449 in `spec/README.md` change history on line 13 and its row; INV-QD-361..362 in `spec/invariants.md`; BEH-QD-626..630). ADR-QD-172 states: D-01/D-02 shape, D-12 `Evaluation { admitted, concurrency }` and why a fourth positional `concurrency` was rejected, both benchmark tables, that ADR-QD-073/090 and the three untraced and one switch budget are unchanged. Amend (Rev bump each): ADR-QD-100 (2026-10-08 amendment at `:69-82`), ADR-QD-163 (`:57-62`, `:256` the `supplied` object), ADR-QD-024 (one-line addendum), INV-QD-037 (`spec/invariants.md:1515-1575`), `spec/traceability.md:388` plus a row for the new tst file. Suggested INV-QD-363 "a question's walk environment is built once, by admission, for both interpreters", INV-QD-364 "an interpreter's `supplied` is a function of its `rowSource` and the question alone". Never run `scripts/next-id.mjs`; the ids are reserved.

## Shared Patterns

### Import discipline
**Source:** AGENTS.md §1; `Admission.ts:25-29`. `import * as Result from "effect/Result"`, relative imports carry `.ts`, `import type` for type-only.

### Narrowing without `switch` or `as`
**Source:** `Walk.ts:903-904` (`Result.isFailure(admitted)` then `admitted.failure`/`.success`); overloads on `admit` give `Admitted<true>` with no cast.

### Gates that must not move
**Source:** `scripts/check-house-style.mjs` `ADMISSION_ALLOWED` (`:588`, `Admission.ts: 1`, `Walk.ts: 1` guard), `SWITCH_BUDGET` (`:380`, `:399`, name `evaluateNode`), `UNTRACED_BUDGET` (`:467`, `:480`, three dispatcher names). Verify with `node scripts/check-house-style.mjs` and `pnpm circular`.

### Doc-comment shape
**Source:** AGENTS.md preamble: one-line summary first, the why (ADR citations) after. Rewrite `Admission.ts` header, `Walk.ts:51-62`, `Walk.ts:301-318`.

### Characterisation already green on the base (no new test needed)
`LeafMatrix.test.ts` (126+ cells, both interpreters), `Predicate.test.ts:425-470`, `RolesAndDepth.test.ts:96-160` (must stay unedited), `DecisionCache.test.ts:449` (cache-hit laziness; `admit` stays inside `Effect.suspend`).

## No Analog Found

None. The tstyche depth/maxDepth negative uses `DecisionLog.tst.ts` as a style analog only; the `Parameters<typeof evaluateNode>` form is [ASSUMED] to work (research A1), so run it once in the RED commit.

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test`, `scripts/`, `spec/`, `.planning/phases/QD-54-*`, `QD-58-*`, `.planning/milestones/v1.5-phases/QD-50-*`.
**Files scanned:** about 15 read directly; remainder located with grep/ls.
**Pattern extraction date:** 2026-11-19
