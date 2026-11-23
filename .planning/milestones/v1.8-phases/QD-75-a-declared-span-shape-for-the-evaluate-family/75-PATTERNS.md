# Phase 75: A declared span shape for the evaluate family - Pattern Map

**Mapped:** 2026-11-23
**Files analyzed:** 22 (new and modified, from CONTEXT D-03..D-17)
**Analogs found:** 22 / 22 (all line numbers are HEAD `a9196d5d`; every analog path is git-tracked source)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
| ----------------- | ---- | --------- | -------------- | ----- |
| `packages/core/src/EvaluationSpan.ts` (new) | utility / declaration | transform | `PortSpan.ts` + `PortSpanEncode.ts` (`sharedQuestionFields/Keys`) | exact |
| `packages/core/src/Lifecycle.ts` (mod) | service | request-response | `PortAccess.ts:82-111, 198-215` (annotate question first) | role |
| `packages/core/src/Predicate.ts` (mod) | service | request-response | same | role |
| `packages/core/src/SubjectSet.ts` (mod) | service | batch/stream | same | role |
| `packages/core/src/GuardHealthCheck.ts` (mod) | service | request-response | same | role |
| `packages/core/src/PortSpanEncode.ts` (header doc only) | utility | transform | itself, `:1-27` | exact |
| `packages/core/test/EvaluationSpan.contract.test.ts` (new) | test | characterisation | `Evaluate.test.ts:2439-2470` + `helpers.ts:93,137` | role |
| `packages/core/test/EvaluationSpan.test.ts` (new) | test | transform | `PortSpan.test.ts` (reads keys via declaration) | role |
| `packages/core/test/EvaluationSpan.tst.ts` (new) | type test | n/a | `Lifecycle.tst.ts:18-35`; AGENTS.md §6 pin table | role |
| `Evaluate/Predicate/SubjectSet/GuardHealthCheck.test.ts` (mod) | test | request-response | same files' span blocks | exact |
| `scripts/check-house-style.mjs` (mod) | config / lint | batch | `METRIC_ID_LITERAL_BUDGET` `:2195-2410` | exact |
| `AGENTS.md` §6 (mod) | doc | n/a | the `METRIC_ID_LITERAL_BUDGET` paragraph in §6 | exact |
| `75-mutation.mjs`, `75-mutation-base.json`, `-close.json` (new) | script | batch | `QD-74.../74-mutation.mjs` (412 lines) | exact |
| `spec/decisions/188-*.md`, `index.yaml`, ADR-051/109 amendments | spec | n/a | `187-*.md`; `051-*.md:170,181,201` amendments | exact |
| `spec/behaviors/30-port-calls.md` BEH-QD-711..715 | spec | n/a | BEH-QD-227 (`:26`) | exact |
| `spec/invariants.md`, `traceability.md`, `README.md` (CCR-QD-467) | spec | n/a | CCR-QD-466 row (`README.md:403`), ADR-187 row (`traceability.md:392`) | exact |
| `.changeset/core-evaluate-span-declared.md` | changeset | n/a | `.changeset/core-decision-cache-asked-the-question.md` | exact |
| `apps/website/.../upgrading.md` "0.13:" section | doc | n/a | `upgrading.md:1065` | exact |

## Pattern Assignments

### `packages/core/src/EvaluationSpan.ts` (declaration, transform)

**Analog:** `packages/core/src/PortSpanEncode.ts` and `PortSpan.ts`.

**Imports** (PortSpanEncode.ts:28-31; AGENTS.md §1: namespace for effect, `.ts` ext, `import type` for types):
```ts
import * as Schema from "effect/Schema";
import { sharedQuestionFields, sharedQuestionKeys, spanStruct } from "./PortSpanEncode.ts";
import type { SpanKey, SpanStruct } from "./PortSpan.ts";
```

**Builder** (PortSpanEncode.ts:40-62): `spanStruct(fields, keys)`; `keys` must name every field, each a `SpanKey` (`qadi.${string}`, PortSpan.ts:50). Fields are `Schema.optionalKey(<leaf>)` with `Type` in `SpanValue` (PortSpan.ts:32, 41-47).

**Shared field/key objects, the pattern to copy and extend** (PortSpanEncode.ts:127-136):
```ts
export const sharedQuestionFields = {
  subjectId: Schema.optionalKey(Schema.String),
  interpreter: Schema.optionalKey(portInterpreter),
};
export const sharedQuestionKeys = {
  subjectId: "qadi.subject_id",
  interpreter: "qadi.interpreter",
} as const;
```
Reuse `sharedQuestionFields.subjectId` / `sharedQuestionKeys.subjectId` (do not respell `"qadi.subject_id"`). Declare policyTag/action/errorTag once as field+key objects, then spread into each struct. Outcome: `Schema.Literals(["Allow","Deny","Failed"])` with a compile-time tie to `Decision["_tag"] | "Failed"`; policyTag: `Schema.Literals(POLICY_TAGS)` (`Policy.ts:555`).

**Writer helper** (PortSpanEncode.ts:71-82; `encodeSpan` drops `undefined`, so the conditional spreads at Lifecycle.ts:155,158-160 go).

**Fail-closed/doc style:** one-line summary first, rationale after (AGENTS.md header); no phase/D-numbers in source. Module-private (out of barrel, ADR-QD-099).

---

### Writers: `Lifecycle.ts`, `Predicate.ts`, `SubjectSet.ts`, `GuardHealthCheck.ts`

**Analog:** `PortAccess.ts`.

**Question helper** (PortAccess.ts:82-96):
```ts
const annotateQuestion = <Q extends SpanFields>(
  d: { readonly attributes: { readonly question: SpanStruct<Q> } },
  question: SpanType<SpanStruct<Q>>,
): Effect.Effect<void> => Effect.annotateCurrentSpan(encodeSpan(d.attributes.question, question));
```
**Order: question, work, answer** (PortAccess.ts:205-212): `yield* annotateQuestion(...)` first, then the call, then `Effect.tap(annotateAnswer(...))`.
**Span name from the declaration:** `Effect.fn(attributeResolverPort.span)` (PortAccess.ts:326) so use `Effect.fn(evaluateSpan.name)`.

Current hand-typed sites to replace:
- `Lifecycle.ts:126-137` (tapError writes `qadi.outcome: "Failed"`, `qadi.error_tag`); `:147-161` (success: `qadi.decision`, conditional action/obligations); `:166-175` (denial log `annotateLogs` keys). Question goes right after the evaluation id (`:73-74`), before lookup `:120-124`. Doc comment `:53-63` updated; `decideQuestion` stays exported (`Lifecycle.tst.ts:17,26-35` pins it).
- `Predicate.ts:653-690`: question after `questionOf` (`:660`); success annotation `:681-685`; failure answer via `Effect.tapError` inside the span (Effect.fn pipeable) so early `return yield* Effect.fail` (`:664-665, 666-671, 675-678`) and `run` failure (`:679`) are covered.
- `SubjectSet.ts:174-177` (already first; route through struct), `:258-260` `Stream.withSpan(..., { attributes: encodeSpan(...) })`. `decideSubject` (`:120`) stays keyless.
- `GuardHealthCheck.ts:94-107`: add question before the walk (`:99`); answer `{healthy, errorTag}` after (`:103-107`).

---

### `packages/core/test/EvaluationSpan.contract.test.ts` (test, characterisation first on the base)

**Analog:** span-reading style at `Evaluate.test.ts:2439-2470`:
```ts
const spans: Array<Tracer.Span> = [];
yield* evaluate(P.hasRole("editor")).pipe(
  Effect.provide(Layer.mergeAll(testLayer(subjectWith({ id: "u1", roles: ["editor"] })), collectingTracer(spans))));
assert.deepStrictEqual(Object.fromEntries(span.attributes), { "qadi.decision": "Allow", "qadi.subject_id": "u1", "qadi.evaluation_id": "eval-1", "qadi.policy_tag": "HasRole" });
```
Helpers (`packages/core/test/helpers.ts`): `collectingTracer(spans)` `:93`, `collectingLogger()` `:137` (lines carry `annotations`; use with MinimumLogLevel Debug for the denial event), `testLayer`, `subjectWith`. Failing port: `scriptedPort(attributeResolverPort, () => PortReply.fail("down"))` (PORT_DOUBLE_BUDGET forbids hand-built failing layers). Use literal keys (declaration does not exist on base). Kept section green 3/3 on base; changed section RED, recorded in `75-RED-EVIDENCE.md` (format: `QD-74.../74-RED-EVIDENCE.md`: base sha, characterisation commit, command per section).

For a phase-local "contract unchanged" checker, `QD-74.../74-characterisation-check.mjs` is the analog (optional; D-12 does not require it).

### `EvaluationSpan.test.ts` / `EvaluationSpan.tst.ts`

- `.test.ts`: assert through the declaration only (`struct.keys.<field>`, `encodeSpan`, `decodeSpan`); no hand-typed family key (it would count against the new budget).
- `.tst.ts`: pins like `Lifecycle.tst.ts:18-35` (`expect<...>().type.toBe<...>()`). A negative pin on a plain-return function needs a positive twin in the same file and a row in AGENTS.md §6 `NOT_CALLABLE_PIN_BUDGET` table plus `NOT_CALLABLE_PIN_BUDGET` in `check-house-style.mjs:746` (edit together). `spanStruct` returns a plain value, so a bare `expect(spanStruct).type.not.toBeCallableWith(...)` is valid. Alternative named in D-13: `// @ts-expect-error` on a held value.

### Rewritten existing tests

`Evaluate.test.ts` 21 family literals (observability `:2439-2612`, failed shape `:2509-2515`, denial log `:3419-3423`), `Predicate.test.ts:1931-1936`, `SubjectSet.test.ts:560-570`, `GuardHealthCheck.test.ts:165-167`. Exact maps become `encodeSpan(evaluateSpan.question/answer, {...})` merged; single reads via `decodeSpan`. Port-span `qadi.subject_id` goldens (`Evaluate.test.ts:2844-3213`, 12) stay literal and go in the budget.

---

### `scripts/check-house-style.mjs`: `[span-key-literal]` / `[span-key-source]`

**Analog:** the ADR-QD-123 block, `:2195-2410`. Copy this shape.

**File sets** (`:1097-1124`): `srcSources` (packages/*/src + features/step-definitions), `testSourceSet` (test + bench, `:1121`).

**Budget object** (`:2231-2245`), exact count per file with reason comments, doc-commented `@type {Readonly<Record<string, number>>}`:
```js
const METRIC_ID_LITERAL_BUDGET = {
  "packages/audit/test/Metrics.test.ts": 4,
  ...
};
```
**Regex + comment blanking** (`:2250-2252`): the title exclusion is a lookbehind:
```js
const METRIC_ID_LITERAL =
  /(?<!\b(?:describe|it|test|it\.effect|it\.scoped|it\.live|it\.layer)\(\s*)"qadi_[a-z_]+"/g;
const isCommentLine = (line) => /^\s*(\/\/|\/\*|\*)/.test(line);
```
Note it matches double quotes only; D-11 wants `"…"`, `'…'`, `` `…` `` and the key set read from `EvaluationSpan.ts` (build the alternation at runtime from `/"(qadi\.[a-z_]+)"/g` over that file, plus the `sharedQuestionKeys.subjectId` value read from `PortSpanEncode.ts`).

**Both-directions counting** (`:2375-2409`): build `Map<rel, n>` over `testSourceSet` with comment lines blanked; loop budget entries (`found !== budget` -> failure "declares N, found M. Update ... so the two agree"); loop found entries not in budget (failure). Failure format: `${rel}  [tag] message\n    hint` and `failures += 1`.

**Non-empty guard / extraction check:** mimic `[metric-table]` `:2336-2342` (`failures += 1; console.error("...  [metric-table] ... was not found.")`) for the empty key-set and minimum-size check; duplicate check mimics the `seen` Set at `:2318-2326`.

**Header lists:** the file header (`:34-45`) enumerates budgets ("The eleventh, `NOT_CALLABLE_PIN_BUDGET`...") and gains the new one. AGENTS.md §6 gets a paragraph and a table after the `METRIC_ID_LITERAL_BUDGET` paragraph, edited with the budget (WX-04). Another table-vs-budget check precedent: `[not-callable-pin-table]`, `[untrusted-decode-table]`, `[schema-error-table]` (grep those tags for the AGENTS.md-table parse).

**Seeing each check fail** (D-11): hand-typed key in a test, one in `Lifecycle.ts`, a key twice in the declaration, emptied key set; revert with `git checkout`.

---

### `75-mutation.mjs` (phase-local scorer)

**Analog:** `.planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-mutation.mjs`. Copy structure verbatim, change `D`, groups, usage.
- Header docs `:1-17`; constants `:22-31`:
```js
const GROUPS = {
  session: { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json", files: [`${R}SimulationSession.ts`] },
  choice: { ..., files: [...], closeOnly: true },
};
const invocation = (group) => `pnpm exec stryker run ${GROUPS[group].config} --mutate ${GROUPS[group].files.join(",")}`;
```
- Phase 75 values: config `stryker.config.mjs`, report `reports/mutation/mutation.json` (`stryker.config.mjs:75`, jsonReporter). Groups: `core` = `Lifecycle.ts, Predicate.ts, SubjectSet.ts, GuardHealthCheck.ts`; `span` = `EvaluationSpan.ts`, `closeOnly: true`. Check the `mutate` list at `stryker.config.mjs:81` covers these files (it is the core config, so confirm before the base run).
- `EXAMINED` `:73` (admitted only after a by-hand `ignoreStatic: false` kill), `MOVED` `:79-88` (base survivor -> close survivor with `why`), `judge` `:141`, `judgeNew` `:189` (close-only), `record`/`--restart` (`:214-223`, base never restarted), `compare` `:240`, `selfTest` `:269` (planted records; keeps the close-only rule), `MODES`/`dispatch` `:393-411` (clean-tree refusal via `gitStatus`), `usage` `:398`.
- Base/close JSON siblings: `74-mutation-base.json`, `74-mutation-close.json`. Phase 73's `73-mutation.mjs` is the second analog (no close-only group).
- Stryker runs: stdin closed, nothing else running; record base BEFORE any `packages/*/src` edit.

---

### Spec / records

- **ADR-QD-188:** copy `spec/decisions/187-*.md` header (Document Control table, `Status: Accepted — extends ADR-QD-051, ADR-QD-109`, Change History) and sections Context / Decision / rejected options / What enforces it. Index row: `spec/decisions/index.yaml:577` (`- id: "ADR-QD-187"`). Amendments to `051-*.md` (existing `## Amendment (date, CCR)` at `:170,181,201`, Change History row at `:13`) and `109-*.md`.
- **BEH-QD-711..715:** new section after `## BEH-QD-227` (`30-port-calls.md:26`) with a ```` ```ts ```` listing like 227's; Change History row at `:13` (`1.11 (2026-11-23): ... (ARCH-122, ADR-QD-188, CCR-QD-467)`). BEH-QD-317 dated note at `05-evaluator.md:302-304`; INV-QD-044 note at `invariants.md:1869`; new INV-QD-395/396.
- **Traceability / CCR:** `traceability.md` ADR row `:392`, BEH row `:72`, test rows (see `:225,303,338,418-419,647`); CCR row `README.md:403` (CCR-QD-466) is the shape for CCR-QD-467 (cites every revision, lists every changed file outside `.planning/`). Revise registers only via `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-23`. Never run `next-id.mjs`.
- **Changeset** (`.changeset/core-decision-cache-asked-the-question.md`):
```md
---
"@qadi/core": minor
---

**Breaking.** <what changes>. ...

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
```
New file `.changeset/core-evaluate-span-declared.md`.
- **Upgrade guide:** `apps/website/src/content/docs/docs/reference/upgrading.md:1065` `## 0.13: a DecisionCache is asked only the question`; new `## 0.13: ...` section with the rename `qadi.decision` -> `qadi.outcome`, no dual-write, new keys, ends with the ADR link `https://github.com/leaderiop/qadi/blob/main/spec/decisions/188-....md`; includes a Before/After snippet.

## Shared Patterns

### Annotation through a declaration
**Source:** `PortAccess.ts:93-96`, `PortSpanEncode.ts:71-82`. Apply to all four writers: `Effect.annotateCurrentSpan(encodeSpan(struct, value))`; question before anything that can fail.

### No ambient hand-typed keys in tests
**Source:** `METRIC_ID_LITERAL_BUDGET` (`check-house-style.mjs:2231`). Tests read via the declaration; literals only in the contract file and port goldens.

### Test spans
**Source:** `helpers.ts:93` `collectingTracer`, `:137` `collectingLogger`; a twin exists in `@qadi/testing` and is held equal by `test-helper-twin`, so do not edit them.

## No Analog Found

| File | Reason |
| ---- | ------ |
| Tie `Schema.Literals([...])` to `Decision["_tag"] | "Failed"` at compile time | No existing tie of exactly this form; look at how `POLICY_TAGS` (`Policy.ts:555`) is tied to the `Policy` union and copy that technique. |
| `tapError` inside `Effect.fn` for `toPredicate` | No existing example in core; D-06 cites Effect `internal/effect.ts:1388-1404` (pipeables applied inside the span). |

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test`, `scripts/`, `spec/`, `.changeset/`, QD-73/QD-74 phase dirs.
**Files read:** about 14; line numbers verified at HEAD.
**Pattern extraction date:** 2026-11-23
