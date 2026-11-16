# Phase 50: What a leaf needs from the request, stated once - Pattern Map

**Mapped:** 2026-11-16
**Files analyzed:** 17 (6 src/test/bench code files, 3 test support, 8 record/process files)
**Analogs found:** 15 / 17 (two process artefacts have no analog beyond the research's own scripts)

The research (50-RESEARCH.md Q3-Q8) already contains the built-and-run `LeafNeeds.ts`, the Walk/Predicate/PortAccess call-site diffs, the matrix/test sketches and the A/B scripts. This map does not repeat them. It names the real tracked analog for each file, quotes the base code the planner must edit, and quotes the probe artefacts that live only in the non-durable scratchpad so the plans can carry them. All analog paths verified tracked (`git ls-files`).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/core/src/LeafNeeds.ts` (new) | utility (keyed table + reader) | transform | `packages/core/src/GateState.ts` (+ `HydrationMetrics.ts`, `FieldLattice.ts`) | role-match (ADR-QD-152 table) |
| `packages/core/src/Walk.ts` (mod, leaf arms `:309-392`, `Evaluation` `:63`) | service (interpreter) | request-response | itself; sibling shared-read: `PortAccess.ts` | exact (edit in place) |
| `packages/core/src/Predicate.ts` (mod, `cases` `:394-428`, `NeedAction` `:312`, `:597`) | service (interpreter) | transform | itself | exact (edit in place) |
| `packages/core/src/PortAccess.ts` (mod, `readScoped` `:271-292`) | service | request-response | itself | exact (one-line edit) |
| `packages/core/test/LeafFixtures.ts` (new, non-test module) | test support | transform | `packages/core/test/helpers.ts` (+ `test/fixtures/`) | role-match |
| `packages/core/test/LeafMatrix.test.ts` (new) | test (characterisation) | request-response | `packages/core/test/Evaluate.test.ts:1414-1437` + `Predicate.test.ts:971,1239` | role-match |
| `packages/core/test/LeafNeeds.test.ts` (new) | test | transform | `packages/core/test/GateState.test.ts` | exact (table pin) |
| `packages/core/test/LeafNeeds.tst.ts` (optional) | test (type) | compile-time | `packages/core/test/GateState.tst.ts` | exact |
| `packages/core/bench/Evaluate.bench.ts` (mod, +2 workloads) | benchmark | batch | itself (`bench.compare` list `:324-341`) | exact |
| `ab.sh`, `analyze2.mjs` (kept under the phase dir) | script | batch | none in repo; research Q5 text | no analog |
| `50-mutation-base.json` / `50-mutation-after.json` | process artefact | file-I/O | `.planning/phases/QD-49-*/49-mutation-base.json` | exact |
| `spec/decisions/163-*.md` + `spec/decisions/index.yaml` | spec record | file-I/O | ADR-QD-162; rejection shape ADR-QD-073 addendum; gate shape ADR-QD-092 | exact |
| `spec/README.md` CCR-QD-441 row | spec record | file-I/O | CCR-QD-440 row (`:377`) | exact |
| `spec/invariants.md` INV-QD-345/346, INV-QD-011 `Source` (`:325-345`) | spec record | file-I/O | INV-QD-343/344 (`:3975`) | exact |
| `spec/behaviors/*.md` BEH-QD-586..590 + `spec/traceability.md` | spec record | file-I/O | BEH-QD-076 (`10-actions.md:79`), BEH-QD-445 (`30-port-calls.md:145`), BEH-QD-581.. | exact |
| `.changeset/<name>.md` (pursue path only) | config | file-I/O | `.changeset/gate-states-stated-once.md` | exact |
| `.planning/REQUIREMENTS.md` (rejection path only) | process | file-I/O | LEAF-01's own sentence `:84` | partial |

## Pattern Assignments

### `packages/core/src/LeafNeeds.ts` (utility, transform)

**Analog:** `packages/core/src/GateState.ts` (48 lines, Phase 49, ADR-QD-152). Full prototype body: 50-RESEARCH.md Q4 (153 lines; compiled, run, mutation-tested). Plan should paste it, not redesign.

**Doc-comment shape to copy** (GateState.ts:1-13): one-line summary, then the why, naming the ADR and the requirement:
```ts
/**
 * The five states a guard reports it rendered, worst news first.
 *
 * `@qadi/react`'s `GateRenderState` is this type and ... so the words
 * are stated here once and a sixth is a compile error in both readers
 * (ADR-QD-162 applying ADR-QD-152, ARCH-96).
 * ... The table is module-private; the type, the list and the guard are what
 * a reader needs, and a table with a row type would invite a second use.
 */
```
For LeafNeeds: first line "What a policy leaf needs from the request, stated once." then "(ADR-QD-163 applying ADR-QD-152, ARCH-97)". Unlike GateState, LeafNeeds exports `LeafNeed` and `LEAF_NEEDS` (the test imports them); that is fine, the module is out of the barrel.

**Keyed table shape** (GateState.ts:17-26; LeafNeeds uses the typed-by-tag variant of D-09):
```ts
const GATE_STATE_TABLE = {
  Failed: {},
  ...
} as const satisfies { readonly [state: string]: GateStateRow };
```
LeafNeeds: `as const satisfies { readonly [K in LeafTag]: LeafNeed }` with `type LeafTag = LeafPolicy["_tag"]` (a type-only import from `./Policy.ts`). Compile proofs (TS2741/TS2353/TS2322) are quoted verbatim in RESEARCH "Pattern 1".

**Own-key guard if ever exposed to an untrusted tag** (GateState.ts:35-36), also ADR-QD-092 (b) `fieldStrategyLaws`:
```ts
export const isGateState = (word: string): word is GateState =>
  Object.hasOwn(GATE_STATE_TABLE, word);
```
Not needed for the five known-tag arms (Pitfall 6); keep the reader unexported from the barrel.

**Imports** (house style, AGENTS.md §1; from the prototype): `import * as Match from "effect/Match";` then `.ts`-suffixed relative imports, `import type` for `AuthSubject`, `Matcher`, `LeafPolicy`; value imports `MissingAction, MissingResource, MissingResourceId` from `./Errors.ts`, `referencesAction, referencesResource` from `./Matcher.ts`, `permissionKey` from `./Permission.ts`.

**Matcher-reference facts reused, never re-written** (`Matcher.ts:643,654`, the one `referencesRef` walker). Walk already imports them:
```ts
import { judgeMatcher, referencesAction, referencesResource } from "./Matcher.ts";   // Walk.ts:25
```

**Error mapper**: `errorOf` uses `Match.value(absence).pipe(Match.tagsExhaustive({...}))` (AGENTS.md §5a; cold path, per-absence only, so rebuilding is fine). `MissingAction` is built with `new MissingAction({})` when no `expected` (no key), per Walk's own comment at `Walk.ts:326-331`.

**Stays out of the barrel:** do not edit `packages/core/src/index.ts`. Precedent: `PortAccess.ts`, `PortDerivation.ts`, `Admission.ts` are package-private and imported by relative path from `Walk.ts`/`Predicate.ts` (e.g. `Walk.ts:15` `import { admit } from "./Admission.ts"`). `GateState.ts` itself is exported (it is public); LeafNeeds is the opposite, so no `spec/overview.md` row (gate 13 reads the barrel only).

---

### `packages/core/src/Walk.ts` (interpreter, request-response)

**Analog:** itself. `evaluateNode` stays budgeted switch #1 (`SWITCH_BUDGET` `Walk.ts: 1`); no `Effect.fnUntraced` added.

**`Evaluation` today** (`Walk.ts:63-67`), gains one field built once in `walk()`:
```ts
interface Evaluation {
  readonly resource: Resource | undefined;
  readonly action: string | undefined;
  readonly concurrency: Concurrency | undefined;
}
```
Add `readonly supplied: Supplied;` with `supplied: { action: question.action !== undefined, resource: question.resource !== undefined }`, and `const NO_RESOURCE: Resource = {};` beside `NO_OBLIGATIONS` (`:70`, module scope so `ignoreStatic` skips it).

**Base arms being replaced** (`Walk.ts:309-392`, verbatim above in the research diff). The two checks to delete: `HasAttribute` `:326-342` (action check then resource check), `HasResourceAttribute` `:350-358` (resource then action), `HasAction` `:380-384`; `HasPermission`/`HasRole` `:309-324` become `holdsPermission(subject, policy)` / `holdsRole(subject, policy)` wrapped in the original `allow(...)`/`deny(...)` template literals (reasons byte-identical; `HasPermission`'s deny recomputes `permissionKey` on the cold path only). Keep the `Object.hasOwn(resource, policy.attribute)` guard and its comment (`:360-364`) verbatim (security, V4/Pitfall in research).

**Replacement call pattern** (research Q4, the shape measured in the bench):
```ts
const absent = absenceOf(policy, request.supplied);
if (absent !== undefined) return Effect.fail(errorOf(absent));
const row = resource ?? NO_RESOURCE; // `absenceOf` has ruled out an absent resource; the `??` is the type's.
```
Do not add an `if (resource === undefined)` after the reader (Pitfall 3: equivalent mutants).

**Imports to change** (`Walk.ts:20,25,28`): drop `MissingAction, MissingResource` value import and `referencesAction, referencesResource`, `permissionKey` if no longer used (check: `permissionKey` is still used in the deny reason); add `import { absenceOf, errorOf, holdsAction, holdsPermission, holdsRole } from "./LeafNeeds.ts"; import type { Supplied } from "./LeafNeeds.ts";`.

**Do not touch:** `HasRelationship` (`:377`) and the `HasActed`/`HasNotActed`/`HasSignature` arms, they reach `readScoped` through `PortAccess.ts`.

---

### `packages/core/src/Predicate.ts` (interpreter, transform)

**Analog:** itself. Base `Plan` variant and arms (`:312`, `:396-428`, `:597`):
```ts
| { readonly _tag: "NeedAction"; readonly expected: string | undefined }            // :312
HasRole: (p) => planned({ _tag: "Constant", value: subject.roles.has(p.role) }),     // :396
HasAction: (p) =>
  action === undefined
    ? planned({ _tag: "NeedAction", expected: p.action })
    : planned({ _tag: "Constant", value: action === p.action }),                       // :401-404
HasAttribute: (p) => {
  if (referencesResource(p.matcher)) { return refused("HasAttribute", "the matcher compares against the resource, which is a column"); }
  if (action === undefined && referencesAction(p.matcher)) {
    return planned({ _tag: "NeedAction", expected: undefined });
  }
  return planned({ _tag: "AskAttribute", leaf: p });
},
NeedAction: (p) => Effect.fail(new MissingAction({ expected: p.expected })),         // :597
```
Target (research Q4): `NeedAction` carries `readonly absence: ActionAbsence`; `compileTree` builds `const supplied: Supplied<true> = { action: action !== undefined, resource: true };` once; the D-07 `referencesResource` refusal stays BEFORE the reader; `NeedAction: (p) => Effect.fail(errorOf(p.absence))`. Failure stays deferred to `run` (lazy plan). D-08a: this removes the own `expected: undefined` key on the three `toPredicate` cells (RED-first, see tests).

**Error-channel guard:** `RunError` at `Predicate.ts:294` must not widen to `MissingResource`; keep the `Supplied<true>` overload of `absenceOf` (Pitfall 4).

---

### `packages/core/src/PortAccess.ts` (service, request-response)

**Analog:** itself, `readScoped` `:271-292` (full body in RESEARCH Q1). One-line edit only; the span annotation above it stays (D-06, ADR-QD-134, BEH-QD-227):
```ts
return yield* Effect.fail(new MissingResourceId({ relation }));
// becomes
return yield* Effect.fail(errorOf({ _tag: "ResourceId", relation }));
```
Imports: `import { errorOf } from "./LeafNeeds.ts";` and `MissingResourceId` becomes `import type` if only used in the signature. Check `pnpm circular`: LeafNeeds imports `Errors.ts`/`Matcher.ts`/`Policy.ts` (type), PortAccess imports LeafNeeds; research confirms madge clean on the prototype.

---

### `packages/core/test/LeafFixtures.ts` (test support, transform)

**Analog:** `packages/core/test/helpers.ts` (non-`.test.ts` shared module; `testLayer`, `anyone`, `subjectWith` live there, used by `Evaluate.test.ts`). Pitfall 8: fixtures must NOT live in a `.test.ts` or the importing file re-registers its `describe`. Content from the research sketch (Q6): `Fixture` interface (`tag, policy, own, refs, name, expected?, scoped`), `FIXTURES: { readonly [K in LeafTag]: ReadonlyArray<Fixture> }` (21 fixtures; a new leaf without fixtures is TS2741), `SHAPES` (`none`/`no-id`/`id`), the independent `oracle(f, action, shape)`, `labelOf`. Enumerate leaf tags through the typed record and `Object.keys(P.leafCases(() => 0))`, never `leafTags` (`Decision.ts:418`, deleted by Phase 51).

Typing gotchas learned in the sketch: carry a `tag` on `Fixture` (don't index by `policy._tag`); build `{ action, resource }` with a conditional spread because `exactOptionalPropertyTypes` rejects `resource: undefined`.

### `packages/core/test/LeafMatrix.test.ts` (characterisation, request-response)

**Analog:** `Evaluate.test.ts:1414-1437` for the assertion style, and the INV-QD-058 agreement properties `Predicate.test.ts:971` ("the two interpreters agree, row by row") and `:1239` (label via `labelOfError`, `MissingAction:${String(error.expected)}`). Style to copy (Evaluate.test.ts:1414-1425):
```ts
it.effect("a missing resource wins over a missing action on HasResourceAttribute", () =>
  Effect.gen(function* () {
    const policy = P.hasResourceAttribute("owner", M.eq(M.action()));
    const r = yield* Effect.result(evaluate(policy));
    assert.strictEqual(r._tag, "Failure");
    if (r._tag !== "Failure") return;
    assert.strictEqual(r.failure._tag, "MissingResource");
    ...
  }).pipe(Effect.provide(testLayer(anyone))));
```
Uses `evaluate`/`toPredicate` only (no LeafNeeds import), so it is GREEN on the base: commit it first as a characterisation (D-14). Two tests: (1) evaluate over fixture x action x shape equals oracle (126 cells, plus `assert.isAbove(cells, 100)` guard); (2) where either interpreter fails with an Action absence both do, same label. Record a swapped-order negative control in the SUMMARY (swap the two checks in the `HasResourceAttribute` arm; the sketch AND `Evaluate.test.ts:1414` fail), then `git checkout -- packages/core/src/Walk.ts`.

### `packages/core/test/LeafNeeds.test.ts` (test, transform)

**Analog:** `packages/core/test/GateState.test.ts`. Copy: header comment saying the oracle is written by hand because "an oracle read from the list under test cannot notice that list changing"; `import { assert, describe, it } from "@effect/vitest";`; a barrel test (here the inverse: `LEAF_NEEDS`/`absenceOf` are NOT on `Barrel`); table pin written out by hand.
```ts
import { assert, describe, it } from "@effect/vitest";
import * as Barrel from "../src/index.ts";
describe("the gate states, written out: ...", () => {
  it("is the same list through the barrel", () => { assert.strictEqual(Barrel.gateStates, gateStates); });
```
Tests (all in research Q6, run green on the prototype): one row per leaf tag (`Object.keys(LEAF_NEEDS).sort()` vs `Object.keys(P.leafCases(() => 0)).sort()`); `absenceOf` equals the oracle; the row's `resourceId` is what `readScoped` does (Never/Always/ByScope, D-06 tie, includes `Cause.squash(...) instanceof MissingResourceId`); `errorOf({_tag:"Action"})` has no own `expected` key (`Object.hasOwn`); `holdsRole/Permission/Action`. RED on the base by import (module absent). Plus the D-08a RED cell: `Object.hasOwn(error, "expected") === false` over `toPredicate`'s three `NeedAction` failures (RED on the base, own key present).

### `packages/core/test/LeafNeeds.tst.ts` (optional type test)

**Analog:** `packages/core/test/GateState.tst.ts` (tstyche). Copy the `@ts-expect-error but it is not exported` pattern for any module-private name, and `expect<...>().type.toBe<...>()` to pin `keyof typeof LEAF_NEEDS` equals `LeafPolicy["_tag"]` both ways.

---

### `packages/core/bench/Evaluate.bench.ts` (benchmark, batch)

**Analog:** itself. Workloads are listed in one `bench.compare(...)` (`:324-341`); add two entries after `deep rules`, BEFORE any src change (D-02), and extend the header comment list (`:1-80`) the way the existing workloads are documented.
```ts
bench("one node", () => run(one)),
...
bench("deep rules — 10 nested", () => run(deepRules)),
```
New entries (research Q5, 87-line patch; re-add as the first commit):
- `leaf-heavy — allOf of 8, matchers reference action and resource`: `hasAttribute("department", neq(action()))` x2, `hasAttribute("department", eq(resource("department")))` x2, `hasResourceAttribute("owner", eq(subjectId()))`, `hasResourceAttribute("department", neq(action()))`, `hasResourceAttribute("department", eq(subject("department")))`, `hasAction("read")`; request `{ action: "read", resource: { id: "doc-1", department: "cardiology", owner: "alice" } }`.
- `leaf-heavy — allOf of 8, matchers reference neither`: same tags, matchers referencing neither (control).
Both must Allow (use `neq(subjectId())`, not `eq`, a first draft denied). Keep ADR-QD-163 and ARCH-97 ids out of the bench file comment if the id is not yet written to spec, or use them exactly as reserved (not `-NEXT`).

**Run command (verified):** `pnpm exec vitest bench --run --reporter=json --outputFile=<file>.json packages/core/bench/Evaluate.bench.ts` (`--project core` is invalid for bench). One run ~44 s.

**A/B scripts (quote, scratchpad is not durable).** `ab.sh <patch> <outdir> <rounds>` (research Q5 gives the full text: `trap cleanup EXIT INT TERM`; refuses to start if `git diff --quiet HEAD -- packages/core/src` fails; alternates `git apply "$PATCH"` / `git apply -R`; logs `uptime` before/after per run; writes `done.txt` only when src is back at HEAD). `analyze2.mjs` per research Q5 (35 lines; reads `testResults[0].assertionResults[].benchmarks[].tasks[].latency.{min,p50,mean}`; arm value = median of three; band = `max(0.1, (max-min)/median of base)`). Per D-03a the deciding statistic is the median of per-run minima; also record mean and p50. The prototype patch is made with `git diff --no-index -- /dev/null packages/core/src/LeafNeeds.ts` for the new file plus `git diff` of the three edited files; copies are at `.../scratchpad/p50/{proto-p1.patch,bench-workloads.patch,ab.sh,analyze2.mjs,LeafNeeds.p1.final.ts}`; the plan must copy them into `.planning/phases/QD-50-.../` (durable) in its first commit.

**Precedent for the gate's recorded numbers:** ADR-QD-092 (b) (ranges and medians under load, "Both conditions held, so the table was taken") and ADR-QD-073 addendum (per-run minimum, interleaved, N_w noise rule).

---

### `50-mutation-base.json` / `50-mutation-after.json` (process, file-I/O)

**Analog:** `.planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-mutation-base.json`, written by 49-01 Task (writer one-liner at `49-01-PLAN.md:189`, which refuses a stale report, a wrong file set, a `source` not equal to disk). Shape:
```json
{
 "measured": { "<path>": 0.97, ... },
 "unmeasured": { "packages/core/src/index.ts": "a barrel: export-star lines only, no mutant" },
 "new": ["packages/core/src/GateState.ts"],
 "deleted": {},
 "moved": {}
}
```
For Phase 50: single Stryker run (core config `stryker.config.mjs`; reports to `reports/mutation/mutation.json`), command `pnpm exec stryker run --mutate 'packages/core/src/Walk.ts,packages/core/src/Predicate.ts,packages/core/src/PortAccess.ts'` (1 min 40 s, run alone, never during a bench). `measured` = Walk 95.05% (307/323, 13 survivors, 3 no-coverage), Predicate 100%, PortAccess 100%; `new: ["packages/core/src/LeafNeeds.ts"]`; the writer must be retargeted to one run and the `reports/mutation/mutation.json` path (confirm `jsonReporter.fileName` in `stryker.config.mjs`). Written once as its own commit, never edited (49-01 "MUST NOT re-baseline"). D-13: `Walk.ts` may drop to ~94.81% iff the 13+3 survivor set is identical and the drop is only killed mutants that moved to `LeafNeeds.ts`; record the survivor lines (49-01 prints `survivor <file>:<line>:<col> <mutator> ...`) before/after in ADR-QD-163 and the SUMMARY. One expected equivalent survivor in `LeafNeeds.ts` (`isActionLeaf` `=== "Action"` -> `true`): record it, or restructure so the narrowing does not repeat the table check.

---

### Spec records (file-I/O)

**ADR-QD-163** `spec/decisions/163-<slug>.md` + `spec/decisions/index.yaml` entry. Analog: ADR-QD-162 (Phase 49, the previous entry at the tail of `index.yaml`): `- id: "ADR-QD-163"` / `file: "163-....md"` / `title:` / `status: "Accepted — reads ADR-QD-024, ADR-QD-100, ADR-QD-134; applies ADR-QD-152; keeps ADR-QD-034"`. File layout: `# ADR-QD-163 — <title>`, `> **Document Control**` table (`Document ID QADI-ADR-163`, `Revision 1.0`, `Effective Date 2026-11-16`, `Author Qadi Engineering`, `Classification Architecture Decision Record`), `## Context`, `## Decision`, `## Alternatives rejected`, `## Consequences`, `_Related:_`. Pursue-path numbers/gate shape: ADR-QD-092 (b). Rejection-path shape (only if D-04 triggers): ADR-QD-073 addendum headings `What was proposed.` / `What was measured.` / `Result: DROP, under the gate's own ... rule.` / `What the noise does not hide.` / `What would justify reopening it.`; closing "A new argument is not enough; it needs a new measurement."

**CCR-QD-441** `spec/README.md`, new row after `:377` (CCR-QD-440). Row: `| CCR-QD-441 | 2026-11-16 | <files with Rev> | ARCH-97. **<title>.** <prose> |`. Bump each touched spec file with `node scripts/spec-revise.mjs <file> "CCR-QD-441: ..."` (`--check` verifies Revision == newest Change History). Never run `scripts/next-id.mjs`; ids are reserved (ARCH-97, ADR-QD-163, CCR-QD-441, BEH-QD-586..590, INV-QD-345..346).

**INV-QD-345 / 346** `spec/invariants.md` after INV-QD-344 (`:3975-3985`): `## INV-QD-345: <statement>`, one paragraph, then `**Source**:`, `**Implication**:`, `**Enforcement**:`, `**Related**:`. D-15: 345 = the table covers every leaf tag; 346 = the check-order rule (own input, then matcher references, action before resource). INV-QD-011 (`:325-345`) is pinned not duplicated; on the pursue path its `Source` sentence "`HasAttribute` and `HasResourceAttribute` ask `referencesAction` before running their matcher" and its `Walk.ts` file reference become false and must be amended.

**BEH-QD-586..590** in existing behaviour files (no new file, so no `spec/behaviors/index.yaml` entry): `## BEH-QD-NNN: <title>` + fenced `REQUIREMENT:` block + prose. Placement (discretion): 586/587 beside BEH-QD-076 (`10-actions.md:79`); 588 beside BEH-QD-445 (`30-port-calls.md:145`); 589/590 in `05-evaluator.md`. Any ```` ```typescript ```` fence is compiled by `scripts/check-doc-examples.mjs` (must import what it uses). `spec/traceability.md`: ADR row (style of `:330-332`), INV row (style of `:92`), a row per new test file (style of `:370-385`), and a Change History entry. Verify with `bash spec/scripts/verify-traceability.sh --strict`, `pnpm spec:verify:strict`.

**Changeset** (pursue path only). Analog `.changeset/gate-states-stated-once.md` (front matter `"@qadi/core": minor`; one paragraph naming the change and what a reader sees). This phase: `"@qadi/core": patch`, body notes the only observable change: `toPredicate`'s `MissingAction` no longer carries an own `expected: undefined` key (wire-invisible). No release (memory: no releases). Rejection path: no changeset, no `packages/*/src` change; annotate LEAF-02..05 in `.planning/REQUIREMENTS.md` (`:85,:90-92` and traceability `:180-183`) as "Not pursued (measured): ADR-QD-163"; the bench workloads stay.

**AGENTS.md:** no edit needed on either path (research Q8: `readScoped` and `evaluateNode` do not move; budgets unchanged). Edit it only if a cited location moves.

## Shared Patterns

### Keyed table, compile-time exhaustive (ADR-QD-152)
**Source:** `packages/core/src/GateState.ts:17-26`, `HydrationMetrics.ts`, `FieldLattice.ts` (law table, ADR-QD-092).
**Apply to:** `LeafNeeds.ts` only; its test is the by-hand oracle (`GateState.test.ts`), its type test is `GateState.tst.ts`.

### Package-private module read by two interpreters
**Source:** `Matcher.ts` (`referencesAction`, `referencesResource`, `judgeMatcher`) and `PortAccess.ts` (ADR-QD-077/134), imported by relative `.ts` path from both `Walk.ts:25` and `Predicate.ts`; absent from `packages/core/src/index.ts`; ADR-QD-100 amendment: only admission (`Admission.ts`) and facts are shared, never the walk. LeafNeeds shares facts about leaves; the two walks stay two.
**Apply to:** `LeafNeeds.ts`, its three call-site files.

### No new per-leaf dispatch on the hot path
**Source:** AGENTS.md §5a, `SWITCH_BUDGET` in `scripts/check-house-style.mjs:376-387` (`Walk.ts: 1`, `Matcher.ts: 2`), `UNTRACED_BUDGET`. A table read is a property load, not a `Match`; the reader is a plain sync function (no `Effect.fn`). `errorOf` may use `Match.tagsExhaustive` (cold, per absence). Verify with `node scripts/check-house-style.mjs` ("3 declared switch(es)").
**Apply to:** `LeafNeeds.ts`, `Walk.ts`.

### Absence is a caller error, never a denial (fail closed)
**Source:** `Walk.ts:326-358` comments (INV-QD-011), `Errors.ts` (`MissingAction`, `MissingResource`, `MissingResourceId` stay `Schema.TaggedError`, SinkRecord codec). `Absence` is plain data, not an error class. `MissingAction.expected` is `Schema.optional`, omit the key rather than `expected: undefined`.
**Apply to:** `LeafNeeds.ts` `errorOf`, both interpreters.

### Test assertion style
**Source:** `Evaluate.test.ts:1414-1437`: `it.effect` + `Effect.result` + `assert.strictEqual(r._tag, "Failure")` + `if (r._tag !== "Failure") return;` narrowing + `.pipe(Effect.provide(testLayer(anyone)))`. No `as`, no `any`, no `Effect.either`.
**Apply to:** `LeafMatrix.test.ts`, `LeafNeeds.test.ts`.

### Interleaved A/B measurement, never concurrent with Stryker/`pnpm check`
**Source:** ADR-QD-073 addendum, ADR-QD-092 (b), research Q5. Log `uptime` per run; per-run minimum is the deciding statistic (D-03a).
**Apply to:** the bench plan (opening plan; the executor re-measures at the phase base, research numbers are evidence only).

### RED-first honesty (D-14, WX-06)
Nothing about the order rule is RED on the base. Commit order: (1) bench workloads + `LeafFixtures.ts` + `LeafMatrix.test.ts` (green characterisation) + `50-mutation-base.json`; (2) RED tests: `LeafNeeds.test.ts` (module absent) and the D-08a `expected`-key cells; (3) `LeafNeeds.ts` + wiring turns everything green; swapped-order negative control recorded in the SUMMARY. A plan claiming the matrix is RED must be rejected.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `ab.sh` / `analyze2.mjs` | script | batch | No interleaved A/B harness exists in the repo (`packages/core/bench/Dispatch.bench.ts` is in-process); use the research Q5 scripts verbatim. Place them in the phase directory so they are durable |
| `LeafNeeds.ts` reader (`absenceOf`) overload shape | utility | transform | No existing reader narrows an error channel via a type parameter (`Supplied<true>`); follow research Q4 and Pitfall 4 |

## Metadata

**Analog search scope:** `packages/core/{src,test,bench}`, `.planning/phases/QD-49-*`, `.changeset/`, `spec/` (via the research's recorded reads), `scripts/check-house-style.mjs` budgets.
**Files scanned:** about 20 read directly, plus research-verified spec locations (line numbers for spec files are the researcher's, re-verify before editing).
**Pattern extraction date:** 2026-11-16
