# Phase 65: Only `admit` builds an `Admitted` - Pattern Map

**Mapped:** 2026-11-20
**Files analyzed:** 10 (all exist; none new except the RED test case and the ADR amendment text)
**Analogs found:** 10 / 10 (several are the file itself)

## File Classification

| File | Role | Data Flow | Analog | Match |
|------|------|-----------|--------|-------|
| `packages/core/src/Admission.ts` | utility/model | transform | itself (117 lines) | self |
| `packages/core/test/WalkEnvironment.tst.ts` | test (type pins) | n/a | itself + `HydrationMetrics.tst.ts:98-112`, `PolicyArity.tst.ts` | exact |
| `packages/core/test/Admission.test.ts` | test | request-response | itself (E1-E5, uses `questionOf`) | self |
| `spec/decisions/172-admission-produces-the-one-walk-environment.md` + `spec/decisions/index.yaml` (line 537) | spec | n/a | other amended ADRs (100, 163) | role |
| `spec/invariants.md` (INV-QD-364 at line 4237; new INV-QD-375/376 follow the same shape) | spec | n/a | INV-QD-364 | exact |
| `spec/behaviors/05-evaluator.md` (BEH-QD-631 at 372, 632 at 388; BEH-QD-633 is in `16-predicates.md`) | spec | n/a | BEH-QD-631/632 | exact |
| `spec/traceability.md` (lines 196, 366, 400, 516) and `spec/README.md` (CCR table, row CCR-QD-450 at 387; new CCR-QD-456) | spec | n/a | CCR-QD-450 row | exact |
| `scripts/check-house-style.mjs` | gate | n/a | itself: `ADMISSION_ALLOWED` 592-595, `NOT_CALLABLE_PIN_BUDGET` row 707 | self |
| Phase 59 bench: `.planning/milestones/v1.6-phases/QD-59-admission-produces-the-one-walk-environment/bench/ab.sh` | script | batch | itself | self |
| Mutation: `.planning/phases/QD-64-.../64-mutation.mjs` and `.planning/milestones/v1.6-phases/QD-59-.../59-mutation.mjs` | script | batch | both | exact |

All paths above are git-tracked (the `.planning/milestones/...` ones are tracked history; `packages/core/lib/*` is a build mirror and is NOT an analog).

## Pattern Assignments

### `packages/core/src/Admission.ts` (current state, lines 61-117)

```ts
const SUPPLIED: { readonly [Source in RowSource]: (question: Question) => SuppliedBy[Source] } = {
  asked: (question) => ({
    action: question.action !== undefined,
    resource: question.resource !== undefined,
  }),
  row: (question) => ({ action: question.action !== undefined, resource: true }),
};

export class Admitted<Source extends RowSource = RowSource> {
  constructor(
    readonly source: Source, readonly policy: Policy, readonly subject: AuthSubject,
    readonly supplied: SuppliedBy[Source], readonly matcherContext: MatcherContext,
    readonly maxDepth: number,
  ) {}
}

export const admit = <Source extends RowSource>(question: Question, rowSource: Source)
  : Result.Result<Admitted<Source>, PolicyTooDeep> =>
  policyDepth(question.policy) > question.maxDepth
    ? Result.fail(new PolicyTooDeep({ maxDepth: question.maxDepth }))
    : Result.succeed(new Admitted(rowSource, question.policy, question.subject,
        SUPPLIED[rowSource](question),
        { subject: question.subject.attributes, subjectId: question.subject.id,
          resource: question.resource, action: question.action },   // second read of question.resource
        question.maxDepth));
```

Change: build `context: MatcherContext` once, `SUPPLIED` fns take `(context: MatcherContext)`; `asked` = `context.resource !== undefined` / `context.action !== undefined`; `row` = `resource: true`, action from context. `Admitted` gets `private constructor` + brand member; `admit` becomes `static admit` (names `Admitted`, never `this`) and `export const admit = Admitted.admit`.

**Private/brand precedent in `packages/*/src`: none.** `grep "private constructor|declare private|declare readonly" packages/*/src` returns nothing. The only other `new Admitted(` is `packages/audit/src/CircuitBreaker.ts:484` (unrelated class, one-arg object; leave alone, scope greps to `Admission.ts`). So the brand and private constructor have no analog; the planner must probe.

**tsconfig flags** (`tsconfig.base.json`): `target: "ESNext"`, `verbatimModuleSyntax: true`, `strict`, `noUnusedLocals/Parameters: true`, `declaration: true`. `useDefineForClassFields` is NOT set anywhere (so it defaults to true under ESNext, meaning a non-`declare` field emits a runtime slot, which is why the context asks for `declare`). `isolatedDeclarations` is NOT set anywhere. Typechecker is `tsgo` (`@effect/tsgo` 0.67.5, `typescript: ^7.0.0` in `pnpm-workspace.yaml:32`). Note `noUnusedLocals` may flag an unused `private` brand member (TS6133); probe it.

### `packages/core/test/WalkEnvironment.tst.ts` (53 lines; imports at 6-13)

```ts
import { expect, test } from "tstyche";
import * as Result from "effect/Result";
import type { Admitted } from "../src/Admission.ts";
import { admit } from "../src/Admission.ts";
...
declare const question: Question;                       // line 15
```
Lines 27-33: `expect<keyof Admitted>().type.toBe<"source" | "policy" | "subject" | "supplied" | "matcherContext" | "maxDepth">()` must stay unedited (private members drop out of `keyof`). Lines 35-44 hold the two negative callable pins plus twins (`not.toBeCallableWith(question)`, `(question, "rows")`; positives `(question,"asked")`, `(question,"row")`); budget row is `"packages/core/test/WalkEnvironment.tst.ts": { callable: 2, constructable: 0 }` at `scripts/check-house-style.mjs:707`. New pins using `@ts-expect-error` / `toRaiseError` do not count in that budget, so the row stays 2/0. Note the file imports `Admitted` as `import type`; `new Admitted(...)` needs a value import (`verbatimModuleSyntax`), and a value import of a class used only in a pin is allowed since it is used.

**Existing `@ts-expect-error` patterns in `packages/*/test/*.tst.ts`** (all reason-by-message-fragment, none by code):
- `HydrationMetrics.tst.ts:102-112` (closest shape for a literal refusal):
```ts
  // @ts-expect-error is not assignable to type
  const other: HydrationDropRow = { kind: "other", summary: "s", remedy: "r" };
  expect(other).type.toBe<HydrationDropRow>();
```
(the positive follow-up `expect(x).type.toBe<T>()` is the in-test control shape)
- `PolicyArity.tst.ts:126,132,139,162`, `CompilePredicate.tst.ts:25,32,39`, `GateState.tst.ts:25`, `DecisionCache.tst.ts:26`, `SinkWire.tst.ts:71`, `devtools/test/surface.tst.ts:150-156`.
- `PolicyArity.tst.ts:1-18` header explains the double check: under `pnpm typecheck` the directive consumes any error on its line (text is a note; unused directive is TS2578); under `pnpm test:tstyche` (`checkSuppressedErrors`, default on) the text must be a fragment of the suppressed error's message and a second error on the line fails. Keep exactly one erroring expression per directive line.

**`toRaiseError`: never used in any `packages/*/test/*.tst.ts`** (grep over `packages/*/test` empty; hits only in `.planning/STATE.md`, `ROADMAP.md`, `research/*`, an archived ARCH-17 doc). tstyche is `^7.2.5` (`package.json:71`). So the `toRaiseError(<code>)` pin has no in-repo analog: probe it (the matcher takes message text or a numeric code, e.g. `expect(new Admitted(...)).type.toRaiseError(2673)`), and prove each pin RED on the phase base. 2673 = "Constructor of class 'X' is private and only accessible within the class declaration". The object-literal code (likely 2741 "Property 'x' is missing" or 2322) must be probed on `tsgo` 7.0.2.

### `packages/core/test/Admission.test.ts` (RED getter case)

Build questions with `questionOf` (`Question.ts:180`; imports at test line 11, usages at 24, 65, 77, 89, 128):
```ts
const admitted = admit(questionOf(subject, P.hasRole("editor")), "asked");               // 77
questionOf(subject, policy, maxDepth === undefined ? {} : { maxDepth })                   // 24
questionOf(subject, P.hasRole("editor"), { resource, action: "publish" })                 // 65
```
`Question` (`Question.ts:164-170`) is a plain interface of five `readonly` data properties (`subject, policy, resource: Resource | undefined, action: string | undefined, maxDepth: number`). A getter in an object literal satisfies a `readonly resource: Resource | undefined` property without `as`, so this compiles:
```ts
let reads = 0;
const question: Question = {
  ...questionOf(subject, P.hasRole("editor")),
  get resource() { return reads++ === 0 ? resource : undefined; },
};
```
CAUTION: spreading `questionOf(...)` evaluates its own `resource` once at spread time but the explicit getter after the spread overrides it, fine; do not spread a question that already carries a getter. Verify with `tsc`/tsgo before relying on it (not compiled here). Assertion: `supplied.resource` equals `matcherContext.resource !== undefined` (red on base: flag true, context undefined; green after: one read).

### Spec records (text to amend, exact)

**ADR-QD-172** (`spec/decisions/172-...md`, Document Control lines 1-12: Revision 1.0, Effective 2026-11-19, `Status | Accepted — amends ADR-QD-024, ADR-QD-100, ADR-QD-163`). Sentence to amend, lines 55-59:
> `SUPPLIED` is one closed table with a row per row source, typed `{ [Source in RowSource]: (question) => SuppliedBy[Source] }`, so each row is checked against its own type: a row source without a row does not compile, and a `"row"` row that stops supplying the resource fails with TS2322. The `"asked"` row's flags are `boolean`, so an `"asked"` row that claims a resource it lacks still compiles; `Admission.test.ts` (E1 to E5) and `LeafMatrix.test.ts` pin that direction at run time.

Also line 62 area: "`admit` is one generic signature with no overload and no wider implementation signature." Index entry: `spec/decisions/index.yaml:537` (`- id: "ADR-QD-172"` / `file: ...`). Highest existing ADR file is 177; CONTEXT says use reserved ids only, never `next-id.mjs`, `spec-revise.mjs --date 2026-11-20`. Mirror text also lives in `Admission.ts:54-60` (`SUPPLIED` doc: "its truth ... is pinned by the tests, not the type") and `spec/README.md` CCR rows.

**INV-QD-364** (`spec/invariants.md:4237-4247`), full body:
> `supplied.action` is whether the question carries an action; `supplied.resource` is whether it carries a resource for the row source `"asked"` and `true` for `"row"`; `admit` computes both from one closed table, `SUPPLIED`, whose rows are typed per row source (BEH-QD-632, BEH-QD-633).
> **Source**: `packages/core/src/Admission.ts` (`RowSource`, `SuppliedBy`, `SUPPLIED`, `admit`).
> **Implication**: an absent resource reported as supplied would let a resource leaf read `{}` instead of failing with `MissingResource`; a row source added without a row does not compile (ADR-QD-172).
> **Enforcement**: `Admission.test.ts` (E1 to E5), `WalkEnvironment.tst.ts` (a row is `true`, an asked resource `boolean`, an unknown source refused) and `LeafMatrix.test.ts`.
> **Related**: INV-QD-363, BEH-QD-632, BEH-QD-633, ADR-QD-163, ADR-QD-172.

Header change-history line is `spec/invariants.md:13` (latest `1.161 (2026-11-20): INV-QD-373 (ARCH-111, ADR-QD-177, CCR-QD-455)`; the next entry prepends in the same `<br>` format). INV-QD-365/366/367/368/373 exist after 364, so new INVs 375/376 are appended at the end per reserved range.

**BEH on admission**: BEH-QD-631 (`05-evaluator.md:372`, "only `admit` MAY build one" already in REQUIREMENT, body: "Pinned by `Admission.test.ts` (E1 to E6) and `WalkEnvironment.tst.ts`"), BEH-QD-632 (`05-evaluator.md:388`, "Pinned by `Admission.test.ts` (E1 to E4) and `LeafMatrix.test.ts`"), BEH-QD-633 (`spec/behaviors/16-predicates.md:~419`, a predicate's row is always supplied), BEH-QD-634 (recursion). New BEH-QD-661-665 copy the block shape: `## BEH-QD-NNN: title`, `> **Invariant:**` link, `> **See:**` ADR links, fenced `REQUIREMENT:` block, one prose paragraph. `05-evaluator.md:13` change history is `1.17 (2026-11-19): BEH-QD-631, ...` (prepend new revision).

**Traceability** (`spec/traceability.md`): INV row 196, ADR row 366, test-file rows 400 (`Admission.test.ts`) and 516 (`WalkEnvironment.tst.ts`): add the new BEH/INV ids and "private constructor, brand" to those rows. **README**: CCR table row CCR-QD-450 at `spec/README.md:387` is the shape for CCR-QD-456 (date, files with Rev, behaviors); ADR-QD-178 and unused BEH/INV ids are named Unused in that row.

### `scripts/check-house-style.mjs`

```js
const ADMISSION_ALLOWED = {            // line 592
  "packages/core/src/Admission.ts": 1,
  "packages/core/src/Walk.ts": 1,
};
const POLICY_TOO_DEEP_NEW = /new PolicyTooDeep\(/;
```
It counts `new PolicyTooDeep(` (not `admit(` calls); moving `admit` into the class keeps one `new PolicyTooDeep(` in `Admission.ts`, so count stays 1. `NOT_CALLABLE_PIN_BUDGET` row line 707 stays `{ callable: 2, constructable: 0 }` provided no negative `toBeCallableWith`/`toBeConstructableWith` is added (never use `not.toBeConstructableWith`; and check `[not-callable-control]` is not triggered by `toRaiseError`/`@ts-expect-error` lines).

### Phase 59 bench harness

Tracked at `.planning/milestones/v1.6-phases/QD-59-admission-produces-the-one-walk-environment/bench/ab.sh` (an older copy is under `QD-50-.../bench/`; use 59's). Usage: `ab.sh <patch> <outdir> <rounds> <head-label> <patched-label>`; patched arm = `git apply <patch>` before the run and reverse after; refuses if `packages/core/src` is dirty or a `vitest bench`/`stryker run` is running; each run is
```bash
pnpm exec vitest bench --run --reporter=json --outputFile="$OUT/$arm-$i.json" packages/core/bench/Evaluate.bench.ts
```
with `{ date +%T; uptime; } > "$OUT/$arm-$i.load-before"` and `.load-after`. Exit codes 2/3/4/5/130/143. Analyzer: `bench/analyze.mjs <outdir> <ref-label> <cand-label>` (`--self-test` exists) writes `analysis.tsv`.
Phase 59 recorded (`59-05-SUMMARY.md:41`): `bench/ab.sh bench/after/to-base.patch bench/after 3 final base` then `bench/analyze.mjs bench/after base final`, patch SHA-256, Node version, CPU, uptime before/after in `59-BENCH.md`. Because the source is committed, the "patch" is a reverse patch to base (`to-base.patch`), so the HEAD arm is the committed source and the patched arm is the base.
Bands (`59-BENCH.md`): statistic = median of per-run minima; `band = max(10%, base spread of that statistic)`; verdict `ok` unless delta > band; gate passes when slower = 0. `analysis.tsv` columns: `workload ref_min_ns cand_min_ns d_min_pct ref_min_spread_pct band_pct verdict ref_p50_ns cand_p50_ns d_p50_pct ref_mean_ns cand_mean_ns d_mean_pct`, last line `# gate: pass`. 35 workloads. Result line format: "slower 0 of 35; geomean delta of minima -1.15%; worst 6.7% filter - 500 items ... **gate: pass**". Phase 59 `59-BENCH.md` front matter: `verdict, phase_base, measured_at, prototype, prototype_sha256, statistic, slower`.

### Mutation records

Core config: `stryker.config.mjs` (root; `ignoreStatic` mind; reports to `reports/mutation/mutation.json`). Run `pnpm exec stryker run stryker.config.mjs --mutate <files>` (invocation pattern from `64-mutation.mjs`: `INVOCATION = \`pnpm exec stryker run ${CONFIG} --mutate ${FILES.join(",")}\``). Copy script shape from:
- `.planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-mutation.mjs` (`record base|close`, `compare`; `FILES` list, asserts the report holds exactly those files, `report[file].source === readFileSync(file)`, counts Killed/Timeout vs Survived/NoCoverage per file, fails if a score fell) with outputs `64-mutation-base.json` / `64-mutation-close.json`;
- `.planning/milestones/v1.6-phases/QD-59-.../59-mutation.mjs` has the exact files for this phase: `AD = packages/core/src/Admission.ts`, `PR = .../Predicate.ts`, `WK = .../Walk.ts`, `DIRS = ["packages/core/src","packages/core/test"]`, report `reports/mutation/mutation.json`, plus `base`/`after`/`evidence`/`compare` subcommands and the `ignoreStatic:false` evidence report. Phase 65 should copy 64's simpler `record base|close` shape with 59's `FILES = [AD, PR, WK]` and `CONFIG = "stryker.config.mjs"`.

## Shared Patterns

- AGENTS.md section 1: `.ts` relative import extensions, `import type` for type-only.
- AGENTS.md section 6: no `as`, `!`, `any`; a getter test literal must compile cleanly.
- Phase 62/63/64 discipline: RED first on the phase base for each pin and for the getter case; scratch in gitignored `.scratch/` or outside the repo.
- Doc-comment shape: one-line summary, then rationale (see `Admission.ts:1-28`, `38-42`).

## No Analog Found

| Item | Reason |
|------|--------|
| `private constructor` / brand member in `packages/*/src` | none exist; probe on tsgo 7.0.2 |
| `toRaiseError(<code>)` in `.tst.ts` | never used; tstyche `^7.2.5` supports it, probe |
| `declare private readonly` form | none; probe against `noUnusedLocals` and `useDefineForClassFields` (unset, default true for ESNext) |

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test`, `packages/*/test/*.tst.ts`, `spec/`, `scripts/check-house-style.mjs`, `.planning/phases/QD-62..64`, `.planning/milestones/v1.6-phases/QD-59-*`
**Pattern extraction date:** 2026-11-20
