# Phase 32: Evaluation options and services stated once - Context

**Gathered:** 2026-11-12
**Status:** Ready for planning

<domain>
## Phase Boundary

`EvaluateOptions` and the evaluation service sets (`EvaluationServices`, `StandingEvaluationServices`) are each declared once, so reading the pipeline `Qadi.ts` → `Evaluate.ts` → `Lifecycle.ts` → `Walk.ts` meets no duplicated type. Today `Lifecycle.ts` restates the two non-question options as `LifecycleOptions` and spells the services union out by hand (`CurrentSubject | EvaluationId | PortServices` on `ask`), because `Evaluate.ts` imports `Lifecycle.ts` and madge counts a type-only edge (ADR-QD-037). Declaring the types in leaves below both modules removes the reason for the copies.

The phase changes no public name or shape: every moved type is still exported from `@qadi/core`'s barrel. It is a restructuring proven by type pins taken on the phase base. `PredicateServices` (`Predicate.ts`) and `SubjectSetServices` (`SubjectSet.ts`) are out of scope.

Requirements: EOPT-01..04 and WX-01..07. Records: ARCH-80, CCR-QD-423. ADR-QD-145, BEH-QD-496..500 and INV-QD-309..310 are reserved and named Unused.

</domain>

<decisions>
## Implementation Decisions

### Declaration sites (checkpoint 1)
- **D-01 `EvaluateOptions` in `Question.ts`:** declared beside `QuestionOptions`, still `extends QuestionOptions`, with `concurrency` and `evaluationId` and their full doc comments moved verbatim from `Evaluate.ts`. `Question.ts` imports no evaluation code (its header says so), so `Lifecycle.ts` and `Evaluate.ts` both import from it with no cycle. The `Concurrency` type import (`effect/Types`) moves with it.
- **D-02 Services in a new type-only `EvaluationServices.ts`:** `EvaluationServices` and `StandingEvaluationServices` move there with their doc comments. Putting them in `Question.ts` would hang it on `Ports.ts`' import closure. The module holds only `import type` statements and type aliases.
- **D-03 `decideQuestion`'s options are derived:** `LifecycleOptions` is deleted. `decideQuestion(question, options?: Omit<EvaluateOptions, keyof QuestionOptions>)`, derived and not restated, so a caller cannot pass a second `resource`/`action`/`maxDepth` that the already-built question would silently ignore. `ask` takes `options?: EvaluateOptions`.
- **D-04 `ask` returns `EvaluationServices`:** its hand-spelled `CurrentSubject | EvaluationId | PortServices` requirement is replaced by the alias. Every other site that imports these types from `./Evaluate.ts` (`Qadi.ts`, `GuardHealthCheck.ts`, `SubjectSet.ts`, `EvaluationServicesNone.ts`) imports from the declaring module instead.

### Re-exports and public surface (checkpoint 2)
- **D-05 No re-export from `Evaluate.ts`:** `Evaluate.ts` declares only `evaluate` and imports the types it uses. If declaration emit raises TS2883, add the one named re-export it forces and record it in the ADR note and the SUMMARY; never restate a type.
- **D-06 Barrel:** `export * from "./EvaluationServices.ts"` added to `packages/core/src/index.ts` in alphabetical order. `Question.ts` is already exported, so `EvaluateOptions` stays public with no barrel edit.
- **D-07 Changeset:** one `@qadi/core` patch changeset, no **Breaking** marker and no `upgrading.md` entry, because public names and shapes are unchanged (gate 13, `pnpm spec:api`, confirms the surface).
- **D-08 Scope fence:** `PredicateServices` stays listed in `Predicate.ts` (a different set chosen by what folds to a constant), and `SubjectSetServices` stays a public domain alias in `SubjectSet.ts`.

### Records and proof (WX-02, WX-03, WX-05, WX-06, WX-07)
- **D-09 ADR notes:** ADR-QD-105 gains a revision note (dated 2026-11-12, CCR-QD-423): the Lifecycle split stands, and the option and service types now live in leaves below it. ADR-QD-037 gains a note that the restatement it once forced is gone. ADR-QD-145 is named Unused in CCR-QD-423's row.
- **D-10 Characterisation first (RED/green on base):** the phase's first commit records the mutation base for `Lifecycle.ts` and `Evaluate.ts` (method as in phases 30–31) and adds a tstyche pin, importing from the `@qadi/core` barrel (`../src/index.ts`), of today's exact shapes: `EvaluateOptions`' key set and field types, `EvaluationServices` and `StandingEvaluationServices`. It is green on the base; the move must keep it green unchanged, which proves the move preserves shapes.
- **D-11 `Lifecycle.tst.ts` rewritten:** it pins the option key set once: `EvaluateOptions` is `QuestionOptions` plus exactly `concurrency` and `evaluationId`, and `decideQuestion`'s options parameter is exactly that remainder. Its header no longer describes a restatement.
- **D-12 Spec records:** `spec/overview.md`'s module column for `EvaluateOptions`, `EvaluationServices` and `StandingEvaluationServices`; `spec/traceability.md`'s `Lifecycle.tst.ts` row (near line 478) and any row naming the old declaring module; `spec/behaviors/06-services.md`'s "`EvaluationServices` (`Evaluate.ts`)" text; comments in other modules that name `Evaluate.ts` as the declaring module of these types. CCR-QD-423 row with ARCH-80. BEH-QD-496..500 and INV-QD-309..310 named Unused, since no behaviour changes.

### Claude's Discretion
- Plan and wave split, as long as D-10's characterisation commit comes first and the mutation bar holds (no touched file below its base; a drop is closed with a test, never re-baselined).
- Exact wording of moved and rewritten doc comments (one-line summary first; no plan or decision ids in doc comments).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/test/Lifecycle.tst.ts`: the existing two-direction tstyche pin of `LifecycleOptions` against `EvaluateOptions`; the template for D-11.
- `packages/core/test/Question.test.ts`: classifies every option key as question/non-question (`concurrency: false`, `evaluationId: false`), as a type and a differential test. Must stay green.
- `packages/core/test/Ports.tst.ts`: already pins `EvaluationServices` as `CurrentSubject | EvaluationId | PortServices` (traceability row ~307).

### Established Patterns
- Barrel is `export *`, alphabetical (AGENTS.md §9). `import type` is mandatory for type-only imports; relative imports carry `.ts`.
- madge (`pnpm circular`) counts type-only edges; `Question.ts` sits below `Evaluate.ts` and `Walk.ts` in the import graph and imports only `AuthSubject`, `Policy`, `Resource`.
- Doc-comment shape: one-line summary first, the why after it.

### Integration Points
- Importers of the moved types today: `Qadi.ts`, `GuardHealthCheck.ts`, `SubjectSet.ts`, `EvaluationServicesNone.ts`, `Lifecycle.ts`, `Evaluate.ts`. Other packages import from `@qadi/core`'s root and are unaffected.
- Comments mentioning the types' home: `DecisionCache.ts:9`, `DecisionSink.ts:5`, `EvaluationServicesNone.ts`, `Ports.ts:6,121`, `Predicate.ts:186`, `Qadi.ts:465`, `Question.ts:18,44`, `Lifecycle.ts:15-17,57,89`.

</code_context>

<specifics>
## Specific Ideas

- The architecture review (`/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261112-022336.html`, candidate 4, "Evaluation options and services stated once, in a leaf") cites `Qadi.ts:222–226`, `Evaluate.ts:107–111`, `Lifecycle.ts:60–65, 208–209` and `Question.ts`, and notes the change respects ADR-QD-105 (Lifecycle split) and ADR-QD-037 (cycle rule).
- Phase 33's builder imports from the leaf this phase creates (soft edge).

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within the phase's scope.

</deferred>
