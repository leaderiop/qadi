---
id: ARCH-41
title: "`toPredicate` admits through `Question`: one admission (depth gate, matcher context, `maxDepth` default) for both interpreters, and `PredicateOptions` derived from `QuestionOptions` so a new answer-changing option cannot bypass translation"
strength: Speculative   # from the 2026-10-07 architecture review (wave 4), "Speculative" list, "toPredicate admits through Question"
status: done
evidence_verified_at: e635e68
depends_on: []           # soft: ARCH-16 (done) created `Question`/`Walk.ts`; this closes ARCH-16 §3's "optional polish"
blocks: []
adrs_touched:
  - ADR-QD-100 (amend: `toPredicate` asks the same `Question` — with no resource — and is admitted by the same rule; `PredicateOptions` is `QuestionOptions` without `resource`)
  - ADR-QD-024 (constraint: the two interpreters are not merged; only admission — what is asked and whether it may be asked — is shared, never the walk)
  - ADR-QD-090 (constraint: depth is judged on the policy first, before any node, independent of the subject; INV-QD-037)
  - ADR-QD-077 (read: both interpreters already share port reads through `PortAccess.ts`; this is the same move one step earlier)
  - ADR-QD-073 (constraint: no `Effect.fn`/`fnUntraced` change; `walk` stays a plain function; UNTRACED_BUDGET unchanged)
  - ADR-QD-034 (constraint: `evaluateNode`'s `switch` and its per-node depth guard stay; SWITCH_BUDGET unchanged)
  - ADR-QD-037 (constraint: madge; the new internal module sits below `Walk.ts` and `Predicate.ts` and imports neither)
  - ADR-QD-099 (constraint: the new module stays out of the barrel, so it is package-private)
  - ADR-QD-076 (constraint: Stryker `ignoreStatic`; the admission is runtime code and each branch is pinned by a test)
packages: ["@qadi/core", "scripts (house style, only if D-41-d = A)", "spec"]
estimate: S   # ≈ ½ day for T0–T7 (T1 alone ≈ 1 hour)
---

# ARCH-41 — `toPredicate` admits through `Question`

## 1. Verified evidence (at `e635e68`)

Read-only: nothing in the repository was edited. `git log --oneline -1` → `e635e68`.

**Probe.** One throwaway test,
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-41/probe.test.ts`
(`node_modules` symlinked to the repo's; imports `packages/core/src` and `packages/core/test/helpers.ts` by absolute
path), run from the repo root with

```
./node_modules/.bin/vitest run --root /private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-41 probe.test.ts --silent=false --reporter=verbose
```

It runs `evaluate(policy, opts)` and `toPredicate(policy, opts)` for 12 trees (`not^0…5`, and `allOf^0…5` over a
leaf whose matcher nests one `fieldMatch` level, so matcher depth counts) × 12 `maxDepth` values
(`undefined, -1, 0, 1, 2, 3, 4, 5, 6, NaN, Infinity, 2.5`) and compares "fails `PolicyTooDeep`". Output:

```
PROBE41 total 144 disagreements 0
```

So **there is no defect today**: the duplicated gates agree, including at `NaN` (both admit: `x > NaN` is false),
negative and fractional bounds. The value of this plan is preventive (see C6).

| # | Claim | Verdict | Evidence at `e635e68` |
| - | ----- | ------- | --------------------- |
| C1 | The depth gate is duplicated: `Walk.ts:925` vs `Predicate.ts:715-719`. | **CONFIRMED** | `Walk.ts:925` `if (policyDepth(policy) > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }))`. `Predicate.ts:715` `const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;`, `:717-720` `checkFields(policy, maxDepth)` → `undefined` → `Effect.fail(new PolicyTooDeep({ maxDepth }))`, where `checkFields` (`:308-309`) is `policyDepth(policy) > maxDepth ? undefined : new Checked(…)`. Same expression, two homes. |
| C2 | The matcher context is duplicated: `Walk.ts:913` vs `Predicate.ts:361` (`matcherContextFor`). | **CONFIRMED, plus a third** | `Walk.ts:913-918` builds `{ subject: subject.attributes, subjectId: subject.id, resource: request.resource, action: request.action }`; `Predicate.ts:361-367` builds the same four keys with `resource: undefined`. A third copy, the review did not count: `packages/devtools/src/model/Remedies.ts:150-155` (`contextOf`, from a `SimulationInput`, not a subject) — out of scope (§3). |
| C3 | The `maxDepth` default is duplicated: `Question.ts` vs `Predicate.ts:715`. | **CONFIRMED; and a doc claim is false** | `Question.ts:130` `maxDepth: options?.maxDepth ?? DEFAULT_MAX_DEPTH` and `Predicate.ts:715`. `questionOf`'s doc (`Question.ts:119`) says "**The only place `maxDepth` defaults.**" — false at HEAD (`Predicate.ts:715`). ARCH-16's T2 step 6 (an exported `maxDepthOf`) was marked optional and skipped (`grep -n maxDepthOf packages/core/src` is empty). |
| C4 | `PolicyTooDeep` is constructed twice. | **CHANGED — three times** | `Walk.ts:307` (the per-node guard inside `evaluateNode`, kept as defense in depth, `Walk.ts:281-292`), `Walk.ts:925`, `Predicate.ts:719`. The per-node one stays (ADR-QD-090's defense in depth); the two *admission* constructions are the duplicate. |
| C5 | ARCH-16 §3 left this as "optional polish". | **CONFIRMED** | `.planning/architecture/ARCH-16-question-and-walk.md:134-136` (non-goal: "`toPredicate`'s own `maxDepth` default … changing it is optional polish, listed in T2 step 6") and `:394-395`. ARCH-16 is `status: done`. |
| C6 | "Only worth doing if `toPredicate`'s options change anyway." | **CONFIRMED, and the change is foreseeable** | `PredicateOptions` (`Predicate.ts:185-194`) is a separately listed `{ action?, maxDepth? }`; `QuestionOptions` (`Question.ts:22-36`) is `{ resource?, action?, maxDepth? }`, documented as "every field here can change the answer". Nothing connects them: a field added to `QuestionOptions` changes `evaluate`'s answer and `Question.test.ts:17-41`'s classification table forces it to be classified for `evaluate` — but `toPredicate` would silently ignore it, i.e. translate a *different question* than `evaluate` answers (an INV-QD-018 violation with no compile signal). The spec names the next such field: `spec/models/17-purpose.md:196-207` ("A request-scoped channel for the purpose — the one gap that remains … a second request-scoped field is now an additive change"). |
| C7 | INV-QD-037 covers `toPredicate`'s gate. | **CHANGED — stated, not enforced** | `spec/invariants.md` INV-QD-037: "… and the same bound is what `toPredicate` checks first", Source names both files. Its **Enforcement** names only `RolesAndDepth.test.ts` (against `evaluate`) and `Evaluate.test.ts`. `Predicate.test.ts:430-490` tests `toPredicate`'s bound on its own (`maxDepth: 3`, boundary and one-past); `Predicate.test.ts:1202-1236`'s walk-equality property never varies `maxDepth`. No test states the two gates agree. |
| C8 | `ShortCircuit.ts` / ARCH-26 bear on this. | **CONFIRMED irrelevant** | `ShortCircuit.ts:1-30`: stop rules only; ARCH-26 is `status: dropped` (stepper measured and rejected, ADR-QD-077 addendum). Admission happens before any stop rule; no overlap. |

## 2. Goal and success criteria

Give both interpreters one **admission**: the step that turns "subject, policy, options" into a `Question` and
decides whether it may be walked at all (the depth gate) and what a matcher sees (the matcher context). The
**module** is a new internal `Admission.ts`; its **interface** is one function, `admit(question)`, returning either
`PolicyTooDeep` or an `Admitted` proof carrying the question and its matcher context. `Walk.ts` and `Predicate.ts`
become two **adapters** over it, and `toPredicate`'s options become `QuestionOptions` without `resource`, so the
**seam** between "what is asked" and "how it is interpreted" is the same for both. **Depth:** three rules (default,
gate, context) behind one call. **Locality:** a new answer-changing option is classified in one table and reaches
`toPredicate` by type, not by memory. The walks themselves are untouched (ADR-QD-024).

Success criteria:

1. A differential test pins INV-QD-037's `toPredicate` half: over generated trees × `maxDepth ∈ {undefined, -1, 0, 1, …, NaN, Infinity, 2.5}`,
   `evaluate` fails `PolicyTooDeep` ⇔ `toPredicate` does, with equal `maxDepth` fields (T1).
2. `grep -n "new PolicyTooDeep" packages/core/src` → `Admission.ts` (1) and `Walk.ts:307`'s per-node guard (1); none
   in `Predicate.ts` (T4).
3. `grep -n "DEFAULT_MAX_DEPTH" packages/core/src/Predicate.ts` is empty; `grep -n "matcherContextFor" packages/core/src` is empty (T4).
4. `PredicateOptions` is `Omit<QuestionOptions, "resource">`; a `tstyche` assertion pins it (T5).
5. `Question.test.ts`'s classification table has a `translation` column keyed on `keyof QuestionOptions`; adding a
   key to `QuestionOptions` without classifying it is TS2741 under `pnpm typecheck` (T5).
6. `Question.ts`'s "the only place `maxDepth` defaults" is true (T1 corrects it to the truth of the day; T4 makes the
   original sentence true again).
7. `pnpm circular`, `pnpm lint`, `pnpm test:tstyche`, `pnpm vitest run packages/core`, `pnpm spec:verify:strict`,
   `pnpm spec:api` pass; `pnpm spec:api` reports no export change.

## 3. Non-goals

- **Sharing the walk.** `evaluateNode`/`run` stay separate interpreters (ADR-QD-024); ARCH-26's stepper was measured
  and dropped.
- **Removing `evaluateNode`'s per-node depth guard** (`Walk.ts:307`). It is defense in depth (ADR-QD-090) and the
  third `PolicyTooDeep` construction stays.
- **Devtools' `contextOf`** (`Remedies.ts:150-155`). It builds a matcher context from a `SimulationInput` draft, not a
  subject; sharing it would need a public `matcherContextOf` over a different input type. Noted for ARCH-33/ARCH-40
  (devtools model) — not done here.
- **Changing what `toPredicate` decides.** No refusal, no fold, no error changes; the observable output is identical.
- **Adding a field to `QuestionOptions`** (e.g. a purpose channel). This plan only makes such an addition reach
  `toPredicate` by construction.
- **A public `admit`.** It stays package-private (ADR-QD-099); `questionOf` stays the public builder.

## 4. Constraints

- **AGENTS.md §1** — `effect` submodule imports (`effect/Result`); `.ts` relative imports; `import type` for
  `Question`, `MatcherContext`.
- **AGENTS.md §4** — `PolicyTooDeep` is a `Schema.TaggedError` inside `SCHEMA_ERROR_BUDGET` already; constructing it
  in a new file does not change the budget (it counts declarations in `Errors.ts`).
- **AGENTS.md §5 / ADR-QD-073** — `admit` is a pure synchronous function returning a `Result`, not an `Effect`; it is
  called inside `walk`'s existing `Effect.suspend` (so a cache hit still never builds a matcher context — the property
  `Walk.ts:878-894` documents) and inside `toPredicate`'s existing `Effect.fn`. No span, no `fnUntraced`.
- **AGENTS.md §5a** — no `switch`; SWITCH_BUDGET unchanged (`Walk.ts` count 1).
- **AGENTS.md §6** — no `as`/`any`/`!`. `exactOptionalPropertyTypes` is on (`tsconfig.base.json:27`): `toPredicate`
  builds its question as `{ ...questionOf(subject, policy, options), resource: undefined }` — legal because
  `Question.resource` is a required `Resource | undefined`, unlike the optional `QuestionOptions.resource`.
- **AGENTS.md §9 / ADR-QD-099** — `Admission.ts` is not added to `index.ts`.
- **ADR-QD-037 (madge, type-only edges count)** — `Admission.ts` imports `Errors.ts` (value), `Policy.ts`
  (`policyDepth`), `Question.ts` (type), `Matcher.ts` (type), `effect/Result`; `Walk.ts` and `Predicate.ts` import it.
  None of its imports reaches `Walk.ts`/`Predicate.ts`. Verify with `pnpm circular`.
- **ADR-QD-076** — every branch of `admit` (too deep / admitted; `NaN`; boundary) is killed by T2's tests.
- **ADR-QD-100 / D-16-e precedent** — per-evaluation cost changes by one small object (`Admitted`) and one `Result`;
  measured A/B, no bench gate.
- **Coverage** — core 95%.

## 5. Decisions needed before work starts

### D-41-a — Do it now, alongside an options change, or not at all?

- **(A) Now, whole (T0–T7).** ≈ ½ day, no public change, closes ARCH-16's polish, and makes the next answer-changing
  option (C6: the purpose channel the spec already anticipates) a compile-time classification instead of a silent
  `toPredicate` divergence.
- **(B) T1 now (the differential and the doc correction); T2–T7 deferred until `QuestionOptions` next gains a field**,
  then done in that change. Cheapest; relies on whoever adds the field to read this plan.
- **(C) Drop.** The duplicates agree today (§1 probe) and T1 alone would catch a future divergence of the *depth*
  gate — but not an ignored new option (C6), which no existing test can see.

**Recommendation: (A).** Honest strength: Speculative — there is no defect, and (B) is a defensible choice if review
bandwidth is short. (A) is recommended because its cost is small and the failure it prevents (C6) has no other
guard. `status: decided (2026-10-08, recommended default)`

### D-41-b — Where does admission live?

- **(A) New internal `packages/core/src/Admission.ts`**, out of the barrel, below both interpreters.
- **(B) In `Question.ts`.** Locality with `questionOf`, but `Question.ts` is barrel-exported (`index.ts:37`), so
  `admit`/`Admitted` would become public API (gate 13 rows) for an internal step.
- **(C) In `Walk.ts`, imported by `Predicate.ts`.** Makes the translator depend on the evaluator's internals — the
  coupling ADR-QD-024/ADR-QD-077 keep out (shared things go *below* both).

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-41-c — How does `PredicateOptions` relate to `QuestionOptions`?

- **(A) `export type PredicateOptions = Omit<QuestionOptions, "resource">`**, plus a `translation` column in
  `Question.test.ts`'s classification (`"folds"` for `action`, `"bounds"` for `maxDepth`, `"absent-by-design"` for
  `resource`) keyed on `keyof QuestionOptions`, so a new key is TS2741 until classified. Structurally identical to
  today's interface, so not breaking; `spec:api` sees the same name. `action`'s INV-QD-011 note moves to `toPredicate`'s doc.
- **(B) Keep the listed interface; add only the classification table.** The table still forces a decision, but the
  type must then be edited by hand, and the two can drift again.
- **(C) `toPredicate` accepts `QuestionOptions` and refuses `resource` at runtime.** A runtime error for what a type
  can say.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-41-d — Gate the single owner of admission?

- **(A) A house-style rule `admission-once`** in `scripts/check-house-style.mjs`: `new PolicyTooDeep(` in
  `packages/*/src` only in `packages/core/src/Admission.ts` (1) and `packages/core/src/Walk.ts` (1, the per-node
  guard), checked in both directions like `sink-read-once` (ARCH-16 D-16-f); `?? DEFAULT_MAX_DEPTH` only in
  `Question.ts`.
- **(B) No rule.** The duplicates arrived by remembering; AGENTS.md §15's house standard is "gated, not remembered".

**Recommendation: (A)**, small and consistent with the ARCH-16 precedent. `status: decided (2026-10-08, recommended default)`

**Startable with no decision:** T0, T1. Everything else waits on D-41-a; T2 on D-41-b; T5 on D-41-c; T6 on D-41-d.

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done (2026-10-08)
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/41-topredicate-admission main`; record `git rev-parse --short HEAD`.
  2. `git diff --stat e635e68 HEAD -- packages/core/src/{Walk,Predicate,Question,Policy}.ts packages/core/test/{Predicate,Question,RolesAndDepth}.test.ts`;
     re-locate §1's lines if anything moved.
  3. Re-run §1's probe (command in §1); expect `PROBE41 total 144 disagreements 0`.
  4. Check whether ARCH-32 (edits `Evaluate.ts`) or any plan adding a `QuestionOptions` field is in flight
     (`git log --oneline main -- packages/core/src/Question.ts packages/core/src/Walk.ts`); apply §9.
  5. Baseline: `pnpm vitest run packages/core/test/Predicate.test.ts packages/core/test/Question.test.ts packages/core/test/RolesAndDepth.test.ts` counts;
     `pnpm vitest bench --run packages/core/bench/Evaluate.bench.ts` (the *before* numbers for T3).
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §10 has the baseline row, the probe output and the before-bench.

### T1 — Pin INV-QD-037's `toPredicate` half; correct `questionOf`'s doc (C3, C7)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0. No decision (every D-41-a option includes it).
- **Files:** `packages/core/test/RolesAndDepth.test.ts`, `packages/core/src/Question.ts` (doc comment only),
  `spec/invariants.md` (INV-QD-037 Enforcement).
- **Steps:**
  1. In `RolesAndDepth.test.ts`, add `describe("INV-QD-037: toPredicate checks the same bound evaluate does")` with
     `it.effect("PROPERTY: evaluate fails PolicyTooDeep exactly when toPredicate does, at every maxDepth")`:
     `FastCheck.sample` (fixed `seed`, `numRuns: 200`) of resource-free, field-free trees (reuse
     `Predicate.test.ts`'s `freeTree` shape — copy the generator locally if it is not exported from `helpers.ts`;
     include matcher-bearing `hasAttribute` leaves so `matcherDepth` counts) × `maxDepth` drawn from
     `FastCheck.constantFrom(undefined, -1, 0, 1, 2, 3, 4, 5, 8, Number.NaN, Number.POSITIVE_INFINITY, 2.5)`.
     For each: `Effect.exit` both; assert `isTooDeep(evaluated) === isTooDeep(translated)` and, when both are, equal
     `failure.maxDepth` (both `NaN` compare with `Object.is`). Field-restricting trees are excluded because
     `toPredicate` refuses them after the depth check (`Predicate.ts:721-726`) — add one explicit case asserting a
     too-deep field-restricting tree is `PolicyTooDeep` through both.
  2. It passes today (§1). Run it once with `Predicate.ts:715` temporarily changed to `?? 63` and confirm it goes
     red; revert. Record in §10.
  3. `Question.ts:119`: replace "The only place `maxDepth` defaults." with "`toPredicate` defaults it separately
     (`Predicate.ts`) until ARCH-41." — T4 restores the original sentence.
  4. INV-QD-037's Enforcement gains one sentence naming the new property. Revision bump + Change History `CCR-QD-NEXT`.
- **Tests:** one property, one example.
- **Verify:** `pnpm vitest run packages/core/test/RolesAndDepth.test.ts`; `pnpm spec:verify:strict`.
- **Done when:** the property passes, was seen red under the mutation in step 2, and INV-QD-037 names it. Shippable
  alone (test + docs; CCR only).

### T2 — `Admission.ts`: one admission, test-first
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1, D-41-a = A, D-41-b.
- **Files:** `packages/core/src/Admission.ts` (*new*), `packages/core/test/Admission.test.ts` (*new*).
- **Steps:**
  1. Red first: write `Admission.test.ts` (tests below) importing `../src/Admission.ts`.
  2. Create `Admission.ts`. Module doc: summary line "Admits a question to be walked: the depth gate and the matcher
     context, once, for both interpreters." Then why: C1–C3, ADR-QD-024 (only admission is shared), INV-QD-037,
     ADR-QD-099 (package-private).
  3. Contents:
     ```ts
     import * as Result from "effect/Result";
     import { PolicyTooDeep } from "./Errors.ts";
     import type { MatcherContext } from "./Matcher.ts";
     import { policyDepth } from "./Policy.ts";
     import type { Question } from "./Question.ts";

     /** A question shown to be no deeper than its `maxDepth`, with what its matchers see. Only {@link admit} builds one. */
     export class Admitted {
       constructor(
         readonly question: Question,
         readonly matcherContext: MatcherContext,
       ) {}
     }

     /** Admits a question, or refuses it as too deep. Depth is judged on the policy alone (INV-QD-037). */
     export const admit = (question: Question): Result.Result<Admitted, PolicyTooDeep> =>
       policyDepth(question.policy) > question.maxDepth
         ? Result.fail(new PolicyTooDeep({ maxDepth: question.maxDepth }))
         : Result.succeed(
             new Admitted(question, {
               subject: question.subject.attributes,
               subjectId: question.subject.id,
               resource: question.resource,
               action: question.action,
             }),
           );
     ```
     A class (like `Predicate.ts`'s `Checked`) so "admitted" is a proof the type checker carries, not a re-check.
- **Tests (`Admission.test.ts`):** `"admits at exactly maxDepth and refuses one past it"`; `"a NaN maxDepth admits
  (matches evaluate's historical behavior)"`; `"a negative maxDepth refuses a leaf"`; `"the matcher context carries
  the subject's attributes and id, the resource and the action"`; `"a question with no resource gives a context with
  resource undefined"`; `"matcher nesting counts toward depth"` (a `hasAttribute` with nested `fieldMatch`).
- **Verify:** `pnpm vitest run packages/core/test/Admission.test.ts`; `pnpm circular`; `pnpm lint`.
- **Done when:** tests pass; `grep -n Admission packages/core/src/index.ts` is empty.

### T3 — `walk` admits through `Admission`
- **Status:** [x] done (2026-10-08)
- **Depends on:** T2.
- **Files:** `packages/core/src/Walk.ts`.
- **Steps:**
  1. In `walk` (`Walk.ts:896-927`), inside the existing `Effect.suspend`: replace the `matcherContext` literal
     (`:913-918`) and the gate (`:925`) with
     `const admitted = admit(question); if (Result.isFailure(admitted)) return Effect.fail(admitted.failure);`
     then `evaluateNode(policy, subject, request, admitted.success.matcherContext, 0, maxDepth)`. Keep `request`
     (it carries `concurrency`, which is not in the question).
  2. Move the two explanatory comments (`:906-912` on building once per walk, `:919-924` on depth-before-nodes) to
     `Admission.ts`'s doc, leaving one line here: "Admission is shared with `toPredicate` (`Admission.ts`)."
  3. Keep `evaluateNode`'s per-node guard (`:307`) and its doc.
- **Tests:** none new; the existing depth tests (`RolesAndDepth.test.ts`, `Evaluate.test.ts`'s identical-`PolicyTooDeep`
  pin) and T1's property must pass unchanged.
- **Verify:** `pnpm vitest run packages/core`; `pnpm vitest bench --run packages/core/bench/Evaluate.bench.ts` (after
  numbers; interleave with T0's before as ARCH-16 D-16-e did if the machine is loaded).
- **Done when:** all core tests pass; `one node` and `deep — 10 levels` are within run-to-run spread of T0; numbers in §10.

### T4 — `toPredicate` admits through `Admission`
- **Status:** [x] done (2026-10-08)
- **Depends on:** T2.
- **Files:** `packages/core/src/Predicate.ts`, `packages/core/src/Question.ts` (doc).
- **Steps:**
  1. In `toPredicate` (`Predicate.ts:710-735`): build
     `const question: Question = { ...questionOf(subject, policy, options), resource: undefined };` with a comment:
     "Translation answers for rows not yet loaded, so its question has no resource — explicitly, even if a caller's
     untyped options carried one." Then `const admitted = admit(question); if (Result.isFailure(admitted)) return yield* Effect.fail(admitted.failure);`.
  2. `checkFields` (`:308-309`) becomes `(admitted: Admitted): Checked => new Checked(restrictsFields(admitted.question.policy))`
     — no `undefined` branch; update `Checked`'s doc ("only built from an `Admitted`, so the depth was already proven").
  3. `compile(policy, subject, options?.action, fieldsCheck)` reads `admitted.question.action`; `run(compiled, subject, admitted.matcherContext)`.
  4. Delete `matcherContextFor` (`:360-367`) and the `DEFAULT_MAX_DEPTH`/`PolicyTooDeep` imports (`:26,35`).
  5. Restore `Question.ts:119`'s sentence "The only place `maxDepth` defaults." (now true).
- **Tests:** none new; `Predicate.test.ts` (all, including `:430-560`'s depth and stack-safety tests, `:1202-1236`'s
  walk-equality property, `:1575-1650` BEH-QD-266) and T1's property pass unchanged.
- **Verify:** `pnpm vitest run packages/core/test/Predicate.test.ts packages/core/test/RolesAndDepth.test.ts`; `pnpm typecheck`; `pnpm circular`.
- **Done when:** §2 criteria 2 and 3 hold (the greps).

### T5 — `PredicateOptions` is `QuestionOptions` without `resource`; classify every option for translation
- **Status:** [x] done (2026-10-08)
- **Depends on:** T4, D-41-c = A.
- **Files:** `packages/core/src/Predicate.ts`, `packages/core/test/Question.test.ts`, `packages/core/test/Predicate.tst.ts` (*new*, or add to an existing core `.tst.ts`).
- **Steps:**
  1. Replace the interface (`Predicate.ts:185-194`) with
     `export type PredicateOptions = Omit<QuestionOptions, "resource">;` and a doc comment: summary line; then "every
     option that can change `evaluate`'s answer reaches translation by this type; `resource` is absent by design —
     a predicate filters rows not yet loaded (ADR-QD-024)". Move the INV-QD-011 note on `action` into `toPredicate`'s doc.
  2. In `Question.test.ts`, add beside `inQuestion` (`:26`):
     `const inTranslation: { readonly [K in keyof QuestionOptions]-?: "folds" | "bounds" | "absent-by-design" } = { resource: "absent-by-design", action: "folds", maxDepth: "bounds" };`
     and one `it.effect` per `"folds"` key: varying it changes `toPredicate`'s output on a policy that reads it
     (`action`: `hasAction("publish")` → `True` vs `False`); per `"bounds"` key: T1's property covers it.
  3. `tstyche`: `expect<PredicateOptions>().type.toBe<Omit<QuestionOptions, "resource">>()` and
     `expect(toPredicate(p, { resource: { id: "x" } })).type.toRaiseError()`.
- **Tests:** the classification table (compile-checked), the `action` differential, the two tstyche assertions.
- **Verify:** `pnpm typecheck`; `pnpm test:tstyche`; `pnpm vitest run packages/core/test/Question.test.ts`; `pnpm spec:api` (no export change reported).
- **Done when:** adding a scratch key `readonly purpose?: string` to `QuestionOptions` makes `pnpm typecheck` fail in
  `Question.test.ts` (try it, record it in §10, revert).

### T6 — Gate the single owner (D-41-d = A)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3, T4, D-41-d.
- **Files:** `scripts/check-house-style.mjs`.
- **Steps:**
  1. Add rule `admission-once`, modelled on `sink-read-once` (`scripts/check-house-style.mjs:~1225-1242`): an
     allowlist map `{ "packages/core/src/Admission.ts": 1, "packages/core/src/Walk.ts": 1 }` for `/new PolicyTooDeep\(/`
     across `packages/*/src`, checked in both directions; and `/\?\?\s*DEFAULT_MAX_DEPTH/` only in
     `packages/core/src/Question.ts`.
  2. Each failure message names the rule and points at `Admission.ts`.
- **Tests:** run the script on a scratch edit adding `new PolicyTooDeep({ maxDepth: 1 })` to `Predicate.ts`; it fails;
  revert. Record in §10.
- **Verify:** `node scripts/check-house-style.mjs`.
- **Done when:** clean on the branch, red on the scratch edit.

### T7 — Spec, CCR, changeset, close out
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1–T6.
- **Files:** `spec/invariants.md` (INV-QD-037 Source), `spec/decisions/100-a-question-is-asked-once.md` (dated
  amendment), `spec/behaviors/16-predicates.md` (the `toPredicate` signature listing, if it lists `PredicateOptions`),
  `spec/traceability.md` (`Admission.test.ts` row; INV-QD-037 row gains `RolesAndDepth.test.ts`'s property and
  `Admission.ts`), `spec/README.md` (CCR row), `.changeset/*.md` (*new*), AGENTS.md only if D-41-d = A (§15 does not
  list house-style rules individually — check; if it does, add one line), this plan.
- **Steps:**
  1. INV-QD-037 Source: "`Admission.ts`'s `admit` rejects `policyDepth(policy) > maxDepth` before any node, and both
     `walk` and `toPredicate` admit through it".
  2. ADR-QD-100 amendment (dated): `toPredicate` asks a `Question` with no resource and is admitted by the same rule;
     `PredicateOptions = Omit<QuestionOptions, "resource">`; closes ARCH-16 §3's polish.
  3. `grep -rn "PredicateOptions" spec` and update any listing that shows the old interface fields.
  4. Changeset `"@qadi/core": patch` — "`toPredicate` and `evaluate` share one admission; `PredicateOptions` is now
     derived from `QuestionOptions` (structurally unchanged)".
  5. Tick tasks, set `status: done`, add §10 rows.
- **Verify:** `pnpm spec:verify:strict && pnpm spec:api && pnpm spec:examples && pnpm spec:gates`;
  `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-41-*.md | sort | uniq -c`.
- **Done when:** every command passes and the plan reads `done`.

## 7. Test strategy

- **Survive unchanged (the regression net):** `Predicate.test.ts` in full — depth boundary (`:430-490`), stack safety
  (`:492-560`), the walk-equality property (`:1202-1236`, same port calls and same ending), BEH-QD-266 (refusals from
  the tree alone); `RolesAndDepth.test.ts`; `Evaluate.test.ts`'s identical-`PolicyTooDeep` pin; `Question.test.ts`'s
  classification and default tests; `ShortCircuit.test.ts`.
- **New:** T1's differential property (the agreement INV-QD-037 states and nothing tested), `Admission.test.ts` (six
  examples), T5's compile-checked `inTranslation` table plus the `action` differential, two `tstyche` assertions.
- **Deleted:** nothing — no test restates the duplication; `matcherContextFor` had no direct test.
- **Mutation:** core Stryker (`pnpm exec stryker run --mutate "packages/core/src/Admission.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts"`);
  `admit`'s `>` (vs `>=`) is killed by the boundary test, the context keys by the context test, `resource: undefined`
  in `toPredicate` by T5's `toRaiseError` only at type level — add a runtime test that a hand-built untyped options
  object carrying `resource` still yields a resource-free translation (`hasResourceAttribute` stays a column).

## 8. Spec and documentation updates

- `spec/invariants.md` INV-QD-037 — Source names `Admission.ts`; Enforcement names T1's property. Revision + Change History.
- `spec/decisions/100-a-question-is-asked-once.md` — dated amendment (T7 step 2). `index.yaml` unchanged (no new ADR).
- `spec/traceability.md` — `Admission.test.ts` row (INV-QD-037, BEH-QD-038's depth requirement); INV-QD-037 row.
- `spec/overview.md` — `PredicateOptions` stays in the `Predicate.ts` row (`:162`); gate 13 sees no change.
- `spec/README.md` — `CCR-QD-NEXT` (one for T1 if shipped alone).
- Changeset `@qadi/core` patch. No release step.

## 9. Risks and rollback

- **Per-evaluation allocation.** One `Admitted` plus one `Result` per walk where a context object was already built.
  Shows up as `one node` drifting in `Evaluate.bench.ts`; mitigate by returning the context directly from a
  `Result<MatcherContext, PolicyTooDeep>` (drop the class) if measured beyond spread. Rollback: revert T3 alone; T4
  still stands (translation is per call, not per row).
- **Cache-hit property.** `admit` must stay inside `walk`'s `Effect.suspend`, or a cache hit would build a context it
  never uses (`Walk.ts:878-894`). T3 step 1 keeps it there; a reviewer checks.
- **Overlap with ARCH-32** (Decision from Trace; edits `Evaluate.ts`, maybe `walk`'s caller): textual only — `walk`'s
  signature does not change. Ordering: either first.
- **Overlap with any plan adding a `QuestionOptions` field** (none in wave 4; the purpose channel is spec-anticipated):
  land T5 first, so that plan meets the classification table.
- **Overlap with ARCH-39** (`Qadi.ts`): none — different files.
- **Rollback overall:** each task is one commit; nothing public changes, so reverting any subset is safe.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | Plan written; §1 verified at `e635e68` (probe: 144 cases, 0 disagreements) | planning agent (wave 4) |
| 2026-10-08 | D-41-a..d | Decided at the recommended defaults: a = A (whole), b = A (new internal `Admission.ts`), c = A (`Omit<QuestionOptions, "resource">` + classification), d = A (`admission-once`) | wave-4 implementer |
| 2026-10-08 | T0 | Branch `worktree-agent-a5eb7f649487d6fa2` from `ce6d248` (not a fresh `arch/41-*` from main; the worktree is the branch). Core files unchanged since `e635e68`. Probe not re-run (T1's property subsumes it). Bench: `Evaluate.bench.ts` ran green but prints no table with this reporter and `--outputJson` produced no file; no A/B numbers recorded | wave-4 implementer |
| 2026-10-08 | T1 | Property + 2 examples in `RolesAndDepth.test.ts`. Red check: mutating `Predicate.ts`'s default to `?? 63` left the generated property GREEN (generated trees are depth <= ~6, never reach 64), so the plan's step 2 mutation was not observable there; added the `DEFAULT_MAX_DEPTH` boundary case, which went red under the mutation (`INV-QD-037: the default bound is the same for both interpreters`). Doc correction on `questionOf` made, then restored in T4 | wave-4 implementer |
| 2026-10-08 | T2 | `Admission.ts` + `Admission.test.ts` (7 examples). Deviation: source was written alongside the test, the red run was not recorded | wave-4 implementer |
| 2026-10-08 | T3 | `walk` admits through `admit`; per-node guard kept. 1588 core tests pass. No A/B bench numbers (see T0) | wave-4 implementer |
| 2026-10-08 | T4 | `toPredicate` admits; `Checked`, `checkFields`, `compile`, `matcherContextFor` deleted (`compileTree` takes the `Admitted` proof directly, which is read, so no unread proof parameter). `restrictsFields` is now called in `toPredicate` after admission. Greps in section 2 criteria 2 and 3 hold | wave-4 implementer |
| 2026-10-08 | T5 | `PredicateOptions = Omit<QuestionOptions, "resource">`; `inTranslation` table in `Question.test.ts` plus `action` differential and an untyped-resource runtime test; `Predicate.tst.ts` (the plan's `toRaiseError` form cannot be used: `pnpm typecheck` compiles `.tst.ts` files, so an intended error fails it; pinned with `keyof` and `not.toBeAssignableTo` instead). Scratch `purpose?: string` on `QuestionOptions` gave TS2741 at `Question.test.ts:47` (the translation table), reverted | wave-4 implementer |
| 2026-10-08 | T6 | `admission-once` rule. The plan's `?? DEFAULT_MAX_DEPTH` regex also matched `Decision.ts:386` (`indentLimit`), so it is narrowed to lines containing `maxDepth`. Scratch edit adding `new PolicyTooDeep(` and a second default to `Predicate.ts` fails both; reverted | wave-4 implementer |
| 2026-10-08 | T7 | INV-QD-037 (Rev 1.66), ADR-QD-100 amendment (Rev 1.1), traceability (Rev 1.106), README `CCR-QD-203` (Rev 1.102), changeset `topredicate-admission.md` (patch). AGENTS.md untouched (section 15 does not list house-style rules). `spec:verify:strict`, `spec:api`, `spec:examples`, `spec:gates`, `spec:claims` pass | wave-4 implementer |
