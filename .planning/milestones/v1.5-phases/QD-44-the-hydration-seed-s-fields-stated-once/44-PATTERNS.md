# Phase 44: The hydration seed's fields stated once - Pattern Map

**Mapped:** 2026-11-15
**Files analyzed:** 14 new/modified
**Analogs found:** 14 / 14 (all tracked; verified `git ls-files` for the core analogs, SeededDecision.ts, 43-mutation-base.json, HydrationPayload.test.ts)

Line numbers below are the base's (HEAD 7eb9ac76). 44-RESEARCH.md holds compiled, runnable candidates for the two src files (Patterns 1-3, `VERDICTS`/`rowOf`); this map points at the real analogs and the exact text to restate or replace. Do not re-derive the table encoding.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/react/src/SeededDecision.ts` (mod) | model (schema-first fields + classes) | transform | `packages/core/src/SinkRecordFields.ts` + `DecisionRecord.ts` classes (ADR-QD-135) | exact |
| `packages/react/src/HydrationEngine.ts` (mod) | service (closed verdict table + 3 call sites) | transform | `packages/core/src/FieldLattice.ts` `LAWS` (:320) and `HYDRATION_DROP_TABLE` (`HydrationMetrics.ts:82`) | role-match |
| `packages/react/test/HydrationSeedFields.test.ts` (new) | test (property + byte golden) | request-response round trip | `HydrationPayload.test.ts:420-475` (byte pin), `DecisionAgreement.test.ts:127-142` (fast-check shape), `HydrationEngine.test.ts:60-90` (recording lookup) | exact |
| optional `.tst.ts` constructor-input pin | test (type) | n/a | `packages/core/test/SinkRecord.tst.ts` | exact |
| 4 test edits (`DecisionOutcome.test.ts:74,82`, `HydrationEvent.test.ts:98`, `DeveloperSignals.test.ts:50`, `SeededQuestion.test.ts:14`) | test | n/a | themselves; drop the `visibleFields: undefined` line | exact |
| `44-mutation-base.json` (new, first commit, alone) | config/record | batch | `.planning/phases/QD-43-*/43-mutation-base.json` + writer in `43-01-PLAN.md:176` | exact |
| mutation comparer (inline script, last plan) | utility | batch | `43-08-PLAN.md` Task 1 | exact |
| `spec/decisions/157-*.md` (new) | spec record | n/a | `spec/decisions/156-a-handed-over-value-is-decided-through-one-module.md`, context style of 135 | exact |
| `spec/decisions/index.yaml` | spec registry | n/a | entry at :473 | exact |
| `spec/README.md` CCR-QD-435 row | spec record | n/a | CCR-QD-434 row (:371) | exact |
| `spec/behaviors/19-hydration.md` BEH-QD-556 | spec record | n/a | BEH-QD-148 (:207) | exact |
| `spec/invariants.md` INV-QD-333 | spec record | n/a | INV-QD-290 (~:3581) | exact |
| `spec/traceability.md`, ADR-078 / INV-022/059 amendments | spec | n/a | rows named in RESEARCH Q8 | exact |
| `.changeset/<slug>.md` + `upgrading.md` entry | release note | n/a | `.changeset/core-handover-options.md`; `## 0.13: onMalformed receives core's DecodeRefusal` (upgrading.md:619) | exact |

## Pattern Assignments

### `packages/react/src/SeededDecision.ts` (model, transform)

**Analog:** `packages/core/src/SinkRecordFields.ts` (one `Schema.Struct` per record, header doc cites ADR-QD-135, notes "Package-private, imports only effect/* ..."; classes are `Data.TaggedClass` typed by the struct's `Type`).

**Current text to replace** (`SeededDecision.ts` classes, ~:76-92):
```typescript
export class SeededAllow extends Data.TaggedClass("SeededAllow")<{
  readonly evaluationId: string;
  readonly subjectId: SubjectId;
  readonly durationMillis: number;
  /** See `VisibleFields` for what `undefined` means here. */
  readonly visibleFields: VisibleFields;
  readonly obligations: ReadonlyArray<Obligation>;
  readonly disclosure: AllowDisclosure;
}> {}
export class SeededDeny extends Data.TaggedClass("SeededDeny")<{ evaluationId; subjectId; durationMillis; disclosure: DenyDisclosure }> {}
```
**Target** (RESEARCH Pattern 1, compiled): add `import * as Struct from "effect/Struct"`; move `ALLOW_WITHHELD`/`DENY_WITHHELD` here (exported, package-private); then
```typescript
export const AllowSeedFields = Schema.Struct({
  ...Struct.omit(DecisionWireAllow.fields, ["_tag", ...ALLOW_WITHHELD]),
  disclosure: AllowDisclosure,
});
export class SeededAllow extends Data.TaggedClass("SeededAllow")<
  typeof AllowSeedFields.Type & { readonly subjectId: SubjectId }
> {}
```
(same for Deny). Drop now-unused `Obligation`, `VisibleFields` imports (`noUnusedLocals`). Keep the doc-comment shape: one-line summary, ADR-QD-157/135 in later paragraphs. Keep imports `.ts`/namespace style as in the existing import block (:19-27). Existing `Withheld`/`AllowDisclosure`/`DenyDisclosure` (:30-66) are untouched; nothing joins the barrel (`Hydration.ts` named re-exports stay).

### `packages/react/src/HydrationEngine.ts` (service, transform)

**Analog:** `FieldLattice.ts:320` `const LAWS: Readonly<Record<FieldStrategy, StrategyLaws>> = { Intersection: {...}, Union: {...} }` and `HYDRATION_DROP_TABLE` (`HydrationMetrics.ts:82`, a closed keyed const with `keyof typeof` derived types). Both are closed tables read by key, no `switch`.

**Replace the entry derivation** (:77-101):
```typescript
const AllowEntry = DecisionWireAllow.mapFields((fields) => ({ ...Struct.omit(fields, ALLOW_WITHHELD), disclosure: AllowDisclosure }));
```
with `Schema.TaggedStruct("Allow", AllowSeedFields.fields)` / `("Deny", DenySeedFields.fields)` (RESEARCH Pattern 2; `.Type` and `.Encoded` verified identical).

**Replace the three branches**: `dehydrateDecision` (:269, `wire._tag === "Allow" ? {...Struct.omit(wire, ALLOW_WITHHELD), disclosure...} : {...}`), `rebuild` (:375, field-by-field `new SeededAllow({ evaluationId: d.evaluationId, ... })`), `entryAgrees` (:409, the `decision._tag === "Allow" ? {verdict:"Allow",...} : {verdict:"Deny", reason: decision.disclosure.reason, obligations: []}`) with the `VERDICTS` table + `rowOf` + `entryOf`/`seedOf`/`claimOf` from RESEARCH Pattern 3. Keep verbatim in `entryAgrees`: the `Withheld` early return, the `policyTag !== policy._tag` check, and `decisionDisagreement(...) === undefined`.

Traps (RESEARCH findings 2 and 4, Pitfall 3):
- Entry stays `{ ...Struct.omit(wire, WITHHELD), disclosure }` (payload key order comes from `encodeDecision`'s literal; building from struct keys moves `visibleFields` before `obligations`).
- Seed is `new SeededAllow({ ...entry, subjectId })`, no `Struct.omit(entry, ["_tag"])` (dead, equivalent mutant).
- Reading `VERDICTS[tag].x(...)` in a generic fails; go through `rowOf`. Keep `& { readonly _tag: V }` on the helper parameters.

### `packages/react/test/HydrationSeedFields.test.ts` (test, round trip)

**Analogs:** `packages/core/test/DecisionAgreement.test.ts:127-142` (fast-check shape), `HydrationPayload.test.ts:420-475` (byte pin with hand-built decisions, literal strings), `HydrationEngine.test.ts:60-90` (recording `HydrationSeedLookup`).

Fast-check convention (react: `DecisionOutcome.test.ts:269`, `HydrationPayload.test.ts:122`):
```typescript
FastCheck.assert(FastCheck.property(arb, FastCheck.boolean(), (d, includeTrace) => { ... }), { numRuns: 300, seed: 2026111501 });
```
Property body, local arbitrary, `seedsOf` capturing `hold` and the test-local `WITHHELD` map: copy RESEARCH "The property (HYDF-03)" block (ran green on base; loop over `Object.entries(encodeDecision(decision))` so a new wire key fails without being named). Do not import `ALLOW_WITHHELD` from src (must be writable on the base).
Byte golden: eight strings in RESEARCH "The payload golden"; compare `assert.strictEqual(JSON.stringify(payload), GOLDEN)` like the ARCH-51 pins; re-capture on the actual base with a throwaway `gen.test.ts` (delete it). Hand-build decisions via `makeDecision({evaluationId, subjectId: makeSubjectId("u1"), durationMillis: 3}, trace)`.
Run from repo root: `pnpm exec vitest run --project react <paths>` (not from `packages/react`).
RED: three-line scratch edit in `packages/core/src/DecisionWire.ts` (`scratch: Schema.String` in `common` + `scratch: "x"` in both `encodeDecision` literals); record output; `git checkout -- packages/core/src/DecisionWire.ts`; `pnpm typecheck` once.

### Optional `.tst.ts` pin

**Analog:** `packages/core/test/SinkRecord.tst.ts` (constructor input equals the struct `Type`), import style as `Hydration.tst.ts:34`. Pin `ConstructorParameters<typeof SeededAllow>[0]` against `typeof AllowSeedFields.Type & { readonly subjectId: SubjectId }`. Add a traceability row if added.

### `44-mutation-base.json` and comparer

**Analog:** `43-01-PLAN.md:176` writer (inline `node --input-type=module -e '...'`) and `43-08-PLAN.md` Task 1 comparer. Retarget per RESEARCH "Mutation record": config `stryker.react.mjs`, report `reports/mutation-react/mutation.json`, stale-check dirs `packages/react/src`, `packages/react/test`, `packages/core/src`, drop the `MOVE`/`Handover.ts` checks, two files. Score = `(Killed+Timeout)/(Killed+Timeout+Survived+NoCoverage)`. Output shape:
```json
{ "measured": { "packages/react/src/HydrationEngine.ts": 0.0, "packages/react/src/SeededDecision.ts": 0.0 }, "unmeasured": {}, "new": [], "deleted": {}, "moved": {} }
```
Command (identical at base and close): `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/HydrationEngine.ts,packages/react/src/SeededDecision.ts'` in the background, one at a time. Commit `chore(44-01): mutation baseline ...` alone, before any `packages/*/src` edit.

### Spec records

- **ADR-QD-157:** copy the header and sections of `spec/decisions/156-*.md`:
```
# ADR-QD-156 — <title>
> **Document Control** | Document ID | QADI-ADR-156 | Revision | 1.1 | Effective Date | Status | Accepted — extends ADR-QD-104 | Author | Qadi Engineering | Classification | Architecture Decision Record | Change History | 1.0 (2026-11-15): Initial (ARCH-90, CCR-QD-434)
## Context / ## Decision / ## Alternatives considered / ## Consequences / ## Related
```
  Status "Accepted — amends ADR-QD-078; reads ADR-QD-135, ADR-QD-155". Context evidence: the scratch-field run. Consequence worth recording: the entry is still a deny-list (`Struct.omit`), so a new wire field ships by default.
- **index.yaml** (after :473-476):
```yaml
  - id: "ADR-QD-156"
    file: "156-a-handed-over-value-is-decided-through-one-module.md"
    title: "..."
    status: "Accepted — extends ADR-QD-104"
```
- **CCR row** after `spec/README.md:371`: `| CCR-QD-435 | 2026-11-15 | <each file with new Rev> | ARCH-91. **<title>.** <what/why>; Unused: BEH-QD-557..560, INV-QD-334 |`, plus README Revision bump (1.184 to 1.185) and Change History line.
- **BEH-QD-556** in `spec/behaviors/19-hydration.md` near BEH-QD-148 (:207); copy that block's `> **Invariant:**` / `> **See:**` / `REQUIREMENT:` layout; bump file Rev 1.21 to 1.22 with a Change History entry in the `1.21 (2026-11-14): ... (ADR-QD-155, CCR-QD-433)` style.
- **INV-QD-333** appended after the last invariant, model INV-QD-290: `## INV-QD-333: <title>`, one-sentence statement, `**Source**:`, `**Implication**:`, `**Enforcement**:` (property, golden, optional tst pin), `**Related**:` (BEH-QD-556, INV-QD-022, INV-QD-170, ADR-QD-135, ADR-QD-157), `---`. Dated amendments (not silent edits) to ADR-QD-078 (Rev 1.4), INV-QD-059 Source, INV-QD-022 Source.
- Traceability rows per RESEARCH Q8; verify with `pnpm spec:verify:strict`.

### Changeset and upgrading entry

`.changeset/core-handover-options.md` shape:
```
---
"@qadi/core": minor
---

**Breaking.** <what>. ...

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
```
Use `"@qadi/react": minor`. Word the break honestly (RESEARCH Q1/Q4, Open Question 1): `visibleFields` becomes an optional key, and the instance has no such key when the server sent none. `upgrading.md` (:619 style): heading `## 0.13: <title>`, prose, `Before:` in a ` ```ts ` fence (not compiled), `After:` in a ` ```typescript ` fence (compiled by `pnpm spec:website-examples`; import only from `@qadi/react` public exports), last line `The decision is [ADR-QD-157](https://github.com/leaderiop/qadi/blob/main/spec/decisions/157-....md).`

## Shared Patterns

### House rules for the two src files
**Source:** AGENTS.md sections 1, 4, 5, 5a, 7. Namespace `effect/*` imports, `.ts` relative extensions, `import type` for type-only; no `as`, `!`, `any`, `switch`, `Effect.fnUntraced`; classes `Data.TaggedClass` (not `Schema.TaggedClass`). Table index is not a `switch` (SWITCH_BUDGET untouched). No `Schema.decode*`/`JSON.parse`/`onExcessProperty` added to src (UNTRUSTED_DECODE_BUDGET untouched). Optional: one AGENTS.md section 7 sentence naming the seed as a third schema-first definition (RESEARCH Open Question 2; no AGENTS.md section names a moved constant, so nothing is required).

### Spread only decoded entries
**Source:** RESEARCH key insight. `rebuild`'s spread must stay behind `decodeEntry` (strict, refuses excess keys); `subjectId` is written last from the envelope.

### Commit ordering
Base JSON, then golden and property (green on base), then src edits (WX-06). The scratch core edit is never committed.

## No Analog Found

None. The mutation base/comparer have no checked-in script; the Phase 43 inline scripts are the analog.

## Metadata

**Analog search scope:** `packages/core/src` (SinkRecordFields, FieldLattice, HydrationMetrics), `packages/react/src`, `packages/react/test`, `spec/`, `.changeset/`, Phase 43 plans.
**Pattern extraction date:** 2026-11-15
