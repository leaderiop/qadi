# Phase 53: One module owns "the value a leaf compares" - Pattern Map

**Mapped:** 2026-11-18
**Files analyzed:** 16 (2 new src/test, 9 modified src, 3 modified tests, records)
**Analogs found:** 16 / 16
All analog paths verified git-tracked (`git ls-files`). 53-RESEARCH.md already holds the exact before/after text per site (Pattern 2) and the typechecked module body (Pattern 1); this map points at it rather than restating.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/Operand.ts` (new) | utility (pure, package-private) | transform | `packages/core/src/Compare.ts` | exact |
| `packages/core/test/Operand.test.ts` (new) | test | transform | `packages/core/test/Compare.test.ts` | exact |
| `packages/core/src/Matcher.ts` (getByPath moves; re-export; FieldMatch) | utility | transform | own precedent `export type { Verdict } from "./Compare.ts"` (:374) and `compareLocal` bindings | exact |
| `packages/core/src/Predicate.ts` (:163-164, :33, `ownValueLocal`) | service | transform | own `compareLocal/memberLocal/holdsLocal` (:129-131) | exact |
| `Walk.ts`, `PortAccess.ts`, `FieldPath.ts`, `Decision.ts` | readers | transform | RESEARCH Pattern 2 table | exact |
| `AttributeResolver.ts` (:227), `CustomPredicate.ts` (:289) | fixture builders | request-response | RESEARCH Pattern 2 table | exact |
| `Predicate.test.ts`, `Layers.test.ts`, `CustomPredicate.test.ts`, `FieldPath.test.ts`, `Evaluate.test.ts` (RED + characterisation) | test | request-response / property | sibling tests named in RESEARCH Q5/Q8 | exact |
| `53-mutation-base.json` + comparer | batch tooling | batch | `.planning/milestones/v1.5-phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-01-PLAN.md` (writer, ~:178), `50-06-PLAN.md` (comparer, ~:168), `50-mutation-base.json` | exact |
| `spec/decisions/166-*.md` + `index.yaml` entry | record | - | `spec/decisions/165-core-owns-the-predicate-compile-shell.md` | exact |
| `spec/invariants.md` (INV-091 restate, 351-352), `spec/behaviors/{16-predicates,04-matchers,06-services}.md`, CCR-444, traceability | record | - | Phase 50 records plan (QD-50 plan list) | role-match |
| `.changeset/<name>.md` | config | - | `.changeset/core-compile-predicate.md` etc. | exact |
| `spec/overview.md:148` | doc | - | existing `getByPath` row | exact |

## Pattern Assignments

### `packages/core/src/Operand.ts` (utility, transform)
**Analog:** `packages/core/src/Compare.ts`
**Header shape** (Compare.ts:1-27): one-line summary, then why in following paragraphs, ending with the three package-private sentences:
```ts
 * Pure and synchronous, with no spans: a comparison runs once per matcher node
 * and once per row, the hot paths AGENTS.md §5 and §5a protect. ...
 * Package-private: kept out of the barrel (AGENTS.md §9) and not exported
 * from any entry point (ADR-QD-099).
```
Operand header states the D-08 why once (decoded policy untrusted; `JSON.parse` own `__proto__`; inherited member reads absent). Comments are stripped by the gate, so mentioning `JSON.parse` is fine, but no code token `JSON.parse`/`Schema.decode*` (section 7a).
**Imports:** none (leaf; no cycle). Compare.ts imports only `SecurityLabel.ts`.
**Body:** copy RESEARCH.md Pattern 1 verbatim (`ownValue`, `isOwnKey`, `getByPath`, private `isObject`); move the long indexOf doc comment from Matcher.ts:341-353 with it. Do not add `Barrel` export (`index.ts` must not mention Operand).

### `packages/core/test/Operand.test.ts` (test)
**Analog:** `packages/core/test/Compare.test.ts` (imports lines 1-19):
```ts
import { assert, describe, it } from "@effect/vitest";
import { ... } from "../src/Compare.ts";
import * as FastCheck from "fast-check";
```
Import `../src/Operand.ts` and `* as M from "../src/Matcher.ts"` for the identity pin `assert.strictEqual(M.getByPath, getByPath)`. Move boundary pins from `Matcher.test.ts:904-932`, `:401-442`.

### `Matcher.ts` and `Predicate.ts` (hot-path import binding)
**Re-export precedent** (Matcher.ts:25, 374): `import type { Verdict } from "./Compare.ts";` and `export type { Verdict } from "./Compare.ts";`. Use `export { getByPath } from "./Operand.ts";` (the `from` form is required by gate 13).
**Module-local binding** (Predicate.ts:129-131):
```ts
const compareLocal = compareVerdict;
const memberLocal = memberVerdict;
const holdsLocal = holds;
```
Add `const ownValueLocal = ownValue;` (Predicate) and `ownValueLocal`/`getByPathLocal` (Matcher), reason: vitest module-runner getter cost (ADR-QD-091). Switches `judgeMatcher`/`resolveRef` stay switches (SWITCH_BUDGET).

### Per-site edits (Walk, PortAccess, FieldPath, Decision, Predicate, AttributeResolver, CustomPredicate)
Use RESEARCH.md "Pattern 2: Before/after per site" verbatim. Delete the six "mirroring" comments (Walk :343-349, Matcher :725-731, FieldPath :13/:22, PortAccess, Decision :286-288); no pointer comment. Keep D-09 write guards. Own-`undefined` stays distinct (`readAttribute`: `isOwnKey` then `ownValue`).

### RED and characterisation tests
- OPND-01 probe: RESEARCH "Code Examples" shape, in `Predicate.test.ts` inside `describe("INV-QD-018: …")` reusing module-scope `translate`/`layer` (:34-60).
- D-11 property: beside "PROPERTY: the two interpreters agree, row by row" (:1000); leave that property untouched; use `FastCheck.sample(arb, { numRuns, seed })` with fixed seed, rows via `JSON.parse`, skip `PolicyNotTranslatable` via `Effect.result`.
- Fixture builders: sibling `CustomPredicate.test.ts` "fails, rather than denies, on a name the table does not recognize" (`Effect.flip`, assert `_tag`/`name`); `Layers.test.ts:31-35` for the resolver.
- Resolver-skip characterisation: `scriptedPort(attributeResolverPort, …).calls` (PORT_DOUBLE_BUDGET: never hand-write a failing port layer).

### Mutation base (D-14)
**Analog:** Phase 50 writer/comparer (50-01-PLAN.md, 50-06-PLAN.md), retarget `NAMED` to the 8 files, `OUT` to `53-mutation-base.json`, drop `leafArms`, `new: Operand.ts`, add a rename map `isFieldOf(data, field)` -> `isOwnKey(data, field)` for the `Decision.ts:356` survivor. Order: green tree, base JSON, RED commit, source moves. Stryker command in RESEARCH Validation Architecture.

### Records
- **ADR-QD-166:** copy `spec/decisions/165-*.md` layout (Document Control table with Status "Accepted — extends ADR-QD-091, ADR-QD-024", Revision, Change History, Context/Decision/Consequences). Index entry shape (`spec/decisions/index.yaml:509-512`):
```yaml
  - id: "ADR-QD-166"
    file: "166-<slug>.md"
    title: "..."
    status: "Accepted — extends ADR-QD-091, ADR-QD-024"
```
  Status text must contain `extends ADR-QD-091` (RESEARCH grep check).
- **INV-QD-091:** restate body only; keep heading (five inbound anchors).
- **Changeset:** frontmatter + prose, as `.changeset/audit-*` precedent:
```md
---
"@qadi/core": patch
---

<fix-style sentences, no "Breaking">
```
- Use only reserved ids (ARCH-100, ADR-166, CCR-444, BEH-601..605, INV-351..352); never run `next-id.mjs`.

## Shared Patterns
- **Import rules (AGENTS.md §1):** `.ts` extensions on relative imports; `import type` for types; no namespace imports of local modules except tests' `* as M`.
- **Forbidden (AGENTS.md §6):** no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`; verify with the WX-04 diff grep.
- **Doc-comment shape (AGENTS.md preamble):** one-line summary first, rationale after.
- **Verification greps:** use `/usr/bin/grep`; OPND-03 scoped grep in RESEARCH (baseline 6 code lines of `Object.hasOwn`).
- **Run from repo root, stdin closed:** `pnpm check:pr < /dev/null`; run `pnpm circular` after first move.

## No Analog Found
None.

## Metadata
**Analog search scope:** `packages/core/src`, `packages/core/test`, `spec/decisions`, `.changeset`, QD-50 phase dir
**Pattern extraction date:** 2026-11-18
