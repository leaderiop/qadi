# Phase 54: LeafNeeds turns every leaf's answer into a verdict - Pattern Map

**Mapped:** 2026-11-18
**Files analyzed:** 14 (3 modified src, 1 new test, 3 modified tests, 1 phase tooling pair, records)
**Analogs found:** 14 / 14
All analog paths verified git-tracked (`git ls-files`). 54-RESEARCH.md already holds the typechecked `LEAF_VERDICTS` record (Q1), the verbatim reason table (Q2), the `Predicate.ts`/`Walk.ts` after-shapes (Code Examples) and the test cell table (Q5b); this map points at them and names the in-repo analogs. Phase 53's set (`53-PATTERNS.md`) is the model for the records.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/LeafNeeds.ts` (+ `LEAF_VERDICTS`, `isHeld`, outcome types) | utility (package-private keyed record) | transform | own `LEAF_NEEDS` + `holdsRole/Permission/Action` (same file) | exact |
| `packages/core/src/Walk.ts` (evaluateActed/Relationship/Custom/Signature, evaluateNode leaf arms, reason tables) | interpreter | request-response | own `DENIAL_TEXT` + `attributeReason` (:144-156), `evaluateActed` (:176-196) | exact |
| `packages/core/src/Predicate.ts` (`Plan.AskActed`, `history`, `cases`, `run`) | interpreter / planner | transform | own `compareLocal`/`holdsLocal` bindings (:124-131), `run` arms (:585-597) | exact |
| `packages/core/test/LeafVerdict.test.ts` (new, written on base) | test | request-response | `packages/core/test/LeafMatrix.test.ts` + `LeafFixtures.ts`; cells copied from `Evaluate.test.ts` | role-match |
| `packages/core/test/LeafNeeds.test.ts` (+ `describe("LEAF_VERDICTS")`, RED by import) | test | transform | same file, existing `holds*` and barrel-not-exported tests | exact |
| `packages/core/test/LeafNeeds.tst.ts` (+ type pins) | type test | transform | same file | exact |
| `Evaluate.test.ts`, `Predicate.test.ts` (INV-QD-018 acted agreement) | test | property | unedited; they are the VERD-03 witnesses | exact |
| `54-mutation.mjs`, `54-mutation-base.json` | batch tooling | batch | `.planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-mutation.mjs` | exact |
| `spec/decisions/167-<slug>.md` + `spec/decisions/index.yaml` | record | - | `spec/decisions/166-one-module-owns-the-value-a-leaf-compares.md` | exact |
| `spec/behaviors/{05-evaluator,12-history,16-predicates,04-matchers}.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md` CCR-445 | record | - | Phase 53's 53-07 plan/summary (BEH-601..605, INV-351..352, CCR-444) | role-match |
| `.changeset/<name>.md` | config | - | `.changeset/leaf-needs-stated-once.md`, `.changeset/operand-read-in-one-place.md` | exact |

## Pattern Assignments

### `packages/core/src/LeafNeeds.ts` (utility, transform)

**Analog:** itself. Copy the shape of `LEAF_NEEDS` (`as const satisfies { readonly [K in LeafTag]: ... }`, `LeafTag = LeafPolicy["_tag"]` at :27, which is not exported; keep it local) and the `holds*` doc-comment shape (:259-272):

```ts
/** Whether the subject holds the role a `HasRole` leaf names. */
export const holdsRole = (
  subject: AuthSubject,
  leaf: Extract<LeafPolicy, { readonly _tag: "HasRole" }>,
): boolean => subject.roles.has(leaf.role);
```

**Body to add:** 54-RESEARCH.md Q1 block verbatim (lines 219-271): `BinaryOutcome`/`RelationshipOutcome`/`ActedOutcome`/`SignatureOutcome`, `LeafOutcome`, `LeafVerdictRows` interface, `LEAF_VERDICTS ... as const satisfies { readonly [K in LeafTag]: LeafVerdictRows[K] }`, `isHeld`. Export `ActedOutcome`, `RelationshipOutcome`, `SignatureOutcome` as types (Walk's reason tables key on them). New imports are all `import type` (`ActedResult`, `Verdict`, `RelatedResult`, `SignatureAnswer`, `MatcherContext`); `judgeMatcher` comes from the already-imported `Matcher.ts`. Keep `holdsRole/Permission/Action` as answer producers (RESEARCH A2). Rows are plain arrows: no `switch`, no `Effect.fn*`. Matcher rows delegate to `judgeMatcher` (D-04). Do not add anything to `index.ts` (not in barrel).

---

### `packages/core/src/Walk.ts` (interpreter, request-response)

**Analog 1, reason table precedent** (Walk.ts:144-156): a module-scope closed record keyed by `Exclude<Outcome, "Held">`, so a new denial kind is a compile error and nothing allocates per call:

```ts
const DENIAL_TEXT: Record<Exclude<Verdict, "Held">, (matcher: Matcher) => string> = {
  NotHeld: (matcher) => (matcher._tag === "Neq" ? "matched an excluded value" : "did not match"),
  ValueAbsent: () => "has no value",
  ...
};
const attributeReason = (side, attribute, verdict: Exclude<Verdict, "Held">, matcher): string =>
  `${side} attribute '${attribute}' ${DENIAL_TEXT[verdict](matcher)}`;
```

Copy this shape for `ACTED_DENIAL` (RESEARCH Q2 lines 305-309), a relationship table (`Unrelated`, `Unknown`) and a signature table (`NoneOnFile`, `NoneMatching` with the optional ` and signer role '...'` suffix). Sentences copied byte-for-byte from the Q2 table.

**Analog 2, the code being replaced** (Walk.ts:176-196, `evaluateActed`): delete `const wanted ... ? "Acted" : "NotActed"` (:182) and `answer === wanted` (:187); keep `askActed("evaluate", subject, policy, resource)` and the ADR-QD-020 comment (reword so "wanted" no longer appears; Pitfall 6 grep). After-shape (RESEARCH lines 314-319):

```ts
Effect.map(asked, (answer) => {
  const outcome = LEAF_VERDICTS[policy._tag](answer);
  return isHeld(outcome)
    ? allow(policy._tag, policy.fields)
    : deny(policy._tag, ACTED_DENIAL[outcome](policy.event, subject.id));
});
```

Leaf arms in `evaluateNode` (:310-370): after-shape at RESEARCH lines 527-543 (`isHeld(LEAF_VERDICTS.HasRole(holdsRole(subject, policy))) ? allow(...) : deny(...)`; attributes use `attributeReason`). `evaluateNode`'s `switch`, `absenceOf`/`errorOf` calls and the three `Effect.fnUntraced` functions stay untouched (SWITCH_BUDGET Walk.ts 1, UNTRACED_BUDGET Walk.ts 3).
**Import cleanup (noUnusedLocals):** drop `import type { ActedResult }` (:18), `import { holds }` (:23), `import { judgeMatcher }` (:27); add `LEAF_VERDICTS`, `isHeld` and the outcome types to the `LeafNeeds.ts` import. Keep `Verdict` type, `ownValue`, `permissionKey`.

---

### `packages/core/src/Predicate.ts` (interpreter, transform)

**Analog:** own module-local bindings (Predicate.ts:124-131), the vitest module-runner getter workaround:

```ts
const compareLocal = compareVerdict;
const memberLocal = memberVerdict;
const holdsLocal = holds;
```

Add `const roleVerdict = LEAF_VERDICTS.HasRole`-style aliases only if the informational bench shows a regression (RESEARCH A6), not speculatively.
**Edits (D-07):** delete `wanted` from `Plan.AskActed` (:309) and the planner (:386); `AskActed` carries `leaf: AnyActedLeaf`. `cases` role/permission/action arms (:398-406) fold `isHeld(LEAF_VERDICTS.X(holdsX(...)))`. `run` arms (:585-597): after-shape at RESEARCH lines 517-522 (`AskAttribute` -> `LEAF_VERDICTS.HasAttribute(p.leaf, value, context)`; `AskActed` -> `LEAF_VERDICTS[p.leaf._tag](answer)`, no ternary: that would restate the polarity map). `HasResourceAttribute` column plan, relationship/custom/signature refusals unchanged. Drop `import type { ActedResult }` (:27) and `evaluateMatcher` (:33); keep `referencesResource`.

---

### `packages/core/test/LeafVerdict.test.ts` (new test, written on the untouched base)

**Analog:** `packages/core/test/LeafMatrix.test.ts` + `LeafFixtures.ts` (cell-per-leaf structure) and the sentence pins in `Evaluate.test.ts` (:66, :369-427, :584-627, :747, :805, :1818-1857; copy the policies). Port doubles per RESEARCH Q5b: `scriptedPort(decisionHistoryPort, () => PortReply.answer("Acted"))` passed into `testLayer(subject, { DecisionHistory: <layer> })`; `signatureHistoryFromSignatures([...])` for signatures. Answering doubles construct no port error, so no `PORT_DOUBLE_BUDGET` entry. Imports only public API (`evaluate`, `toPredicate`, `Policy` constructors); nothing from `LeafNeeds.ts`, so it is green before and after. Assert `trace.policyTag` on every allow and deny (kills the `Walk.ts` `allow("HasCustom", ...)` survivor, Pitfall 2). Cell table: RESEARCH Q5b lines 438-448.

### `packages/core/test/LeafNeeds.test.ts` and `LeafNeeds.tst.ts`

**Analog:** the files themselves. Add `describe("LEAF_VERDICTS")` importing `LEAF_VERDICTS`, `isHeld` (RED by import, as 53 did for `Operand.test.ts`): keys equal `Object.keys(P.leafCases(() => 0))`, every answer per row, `isHeld(v) === holds(v)` for the five `Verdict` values; extend the barrel "does not export" list (~:229) with `"LEAF_VERDICTS"`, `"isHeld"`. `.tst.ts`: missing-row and wrong-outcome pins in the existing style (read the file first).

---

### `54-mutation.mjs` / `54-mutation-base.json` (batch tooling)

**Analog:** `.planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-mutation.mjs`. Copy whole; retarget the constants at the top (lines 7-25 there):

```js
const D = ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/";
const BASE = [ "packages/core/src/AttributeResolver.ts", ... ];
const MOVED = ["packages/core/src/Decision.ts", ...];
const RENAMED = { "packages/core/src/Decision.ts": [["isFieldOf(", "isOwnKey("]] };
```

For 54: `D` -> the QD-54 dir; `BASE = [LeafNeeds.ts, Predicate.ts, Walk.ts]`; `MOVED = [Predicate.ts, Walk.ts]`; drop the new-file `OP` logic and instead assert `LeafNeeds.ts` detected count grows by at least what Walk+Predicate lost (RESEARCH Mutation section); declare a `RENAMED` entry for the `allow("HasCustom", ...)` survivor line before the change if the new test does not kill it. Order: green tree, base JSON committed alone, then tests, then src. Run Stryker alone: `pnpm exec stryker run stryker.config.mjs --mutate '<files>' < /dev/null`.

---

### Records (ADR-QD-167, BEH-QD-606..610, INV-QD-353..354, CCR-QD-445, changeset)

- **ADR:** copy `spec/decisions/166-one-module-owns-the-value-a-leaf-compares.md` layout (Document Control, Status "Accepted — extends ADR-QD-163; keeps ADR-QD-020, ADR-QD-024", Revision, Change History, Context/Decision/Consequences); Document ID `QADI-ADR-167` must equal the file number (gate 10). Add index entry at the tail of `spec/decisions/index.yaml` in the 166 shape (`id`, `file`, `title`, `status`). Record mutation before/after and informational bench numbers here (D-10). Add an amendment pointer in ADR-163 (read ADR-020/024 first, RESEARCH A7).
- **BEH/INV/CCR placement:** RESEARCH Records lines 468-477. Revise each touched doc via `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-18`, then `--check`. INV-354 cross-references existing INV-QD-014 rather than duplicating it. CCR row after CCR-QD-444 in `spec/README.md`; unused reservation named "Unused: ..." there. Never run `next-id.mjs`.
- **Changeset:** copy `.changeset/leaf-needs-stated-once.md` shape:
```md
---
"@qadi/core": patch
---

<one paragraph: the verdict step of every leaf is one package-private record both interpreters read; reasons and results unchanged. No "Breaking".>
```

## Shared Patterns

- **Imports (AGENTS.md §1):** `.ts` extensions on relative imports; `import type` for types; `effect/*` namespace imports only.
- **Forbidden (AGENTS.md §6, §5, §5a):** no `as`, `!`, `any`, `Record<string, unknown>`, no new `switch`, no new `Effect.fnUntraced`; `as const satisfies` is already the `LEAF_NEEDS` idiom. Budgets unchanged: `scripts/check-house-style.mjs` (SWITCH_BUDGET Walk 1 / Matcher 2, UNTRACED_BUDGET Walk 3) and AGENTS.md stay unedited.
- **Closed unions, fail closed:** `isHeld` is true only for `"Held"`; every row's return is a closed union written out in full; `"Unknown"` maps to its own denial in both acted rows (ADR-QD-020, INV-QD-014).
- **Doc-comment shape:** one-line summary first, ADR-QD-163/167 and INV rationale after.
- **No allocation per leaf:** rows return string literals; reason tables are module-scope (D-08).
- **Verification greps** (`/usr/bin/grep`, scope to `packages/core/src`, never repo root because of `.stryker-tmp/`): RESEARCH Pitfall 6 lines 410-414; reword Walk comments that say "wanted".
- **Run from repo root, stdin closed:** `pnpm check:pr < /dev/null`, `pnpm circular`, `pnpm test:tstyche`, `pnpm spec:api` (expect unchanged, 935).

## No Analog Found

None. (Bench has no analog file: Evaluate.bench.ts never exercises acted/relationship/custom/signature leaves; run `pnpm exec vitest bench --run --reporter=json --outputFile=<file>.json packages/core/bench/Evaluate.bench.ts < /dev/null` before and after, informational only.)

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test`, `spec/decisions`, `.changeset`, QD-53 phase dir
**Pattern extraction date:** 2026-11-18
