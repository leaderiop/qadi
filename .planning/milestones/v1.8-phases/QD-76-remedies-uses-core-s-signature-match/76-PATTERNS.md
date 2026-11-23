# Phase 76: Remedies uses core's signature match - Pattern Map

**Mapped:** 2026-11-23
**Files analyzed:** 24 (from CONTEXT D-01..D-13; line numbers are HEAD `dd4a602d`, which has the same src as phase base `bbaecd1d`)
**Analogs found:** 24 / 24 (every analog path is git-tracked; the packages/*/src, spec, scripts and .changeset paths below were all listed by `git ls-files` or `ls` on the tracked tree)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
| ----------------- | ---- | --------- | -------------- | ----- |
| `packages/core/src/SignatureHistory.ts` (mod: `signatureLookup`, `signatureAnswerFromSignatures`) | service + fixture | transform (pure `Result`) | itself, `signatureHistoryFromSignatures` `:356-409`; `judgeMatcher` for "pure core judgement devtools calls" | exact |
| `packages/core/src/SignatureMatch.ts` (mod: `signatureAnswerOf`) | utility (leaf, out of barrel) | transform | itself, `signatureMatches` `:19-26` | exact |
| `packages/core/src/PortAccess.ts` (mod: `askSignature` builds answer via `signatureAnswerOf`) | service (read) | request-response | itself, `askSignature` `:481-496` | exact |
| `packages/core/src/DecisionHistory.ts` (mod: `actedLookup`, `actedAnswerFromEvents`) | service + fixture | transform | itself, `decisionHistoryFromEvents` `:285-318` | exact |
| `packages/core/src/index.ts` | barrel | n/a | **no edit**: `export * from "./SignatureHistory.ts"` `:53`, `"./DecisionHistory.ts"` `:8` | exact |
| `packages/devtools/src/model/Remedies.ts` (mod: `Signature`, `Acted` arms, `Requirement`, drop `CUSTOM_HAS_NO_FIELD`) | model (pure fold) | transform | itself, `satisfyingValue` + `judgeMatcher` (`:134-165`), module-scope `Match.type` (`:285`, `:448`) | exact |
| `packages/devtools/src/model/SimulationFields.ts` (mod: `NO_CUSTOM_PREDICATE_FIELD`) | model (table) | transform | itself, `NoFormVocabulary` + `FIXTURE_DATA` `:543-577` | exact |
| `packages/devtools/test/model/RemedySignatureConformance.test.ts` (new) | test | closed-product agreement | `ReviewSimulationConformance.test.ts` | role |
| `packages/devtools/test/model/RemedyActedConformance.test.ts` (new) | test | closed-product agreement | same | role |
| `packages/core/test/SignatureHistory.test.ts` (mod: new `describe`) | test | agreement | itself `:1-30`, `:225-256` | exact |
| `packages/core/test/DecisionHistory.test.ts` (mod: new `describe`) | test | agreement | `SignatureHistory.test.ts` (header says it mirrors this one) | role |
| `packages/devtools/test/model/SimulationFields.test.ts` (mod `:136-141`) | test | CRUD | itself | exact |
| `packages/devtools/test/model/Remedies.test.ts` | test | unchanged (add one identity test) | itself `:576-588` | exact |
| `scripts/check-package-install.mjs` (mod `FIXTURE` `:458-568`) | config / gate fixture | n/a | Phase 69 `thrownMessage` probe `:490`, `:564-567` | exact |
| `spec/overview.md` (row after `:277`; Change History 1.134) | spec | n/a | rows `:277-278`, `:290`; 1.133 entry `:13` | exact |
| `spec/behaviors/06-services.md`, `29-devtools-simulator.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md` | spec | n/a | adjacent BEH-QD-410 / BEH-QD-222-223 blocks | exact |
| `spec/decisions/189-*.md` (new) + `index.yaml` row | ADR | n/a | `188-the-evaluate-familys-spans-...md` header, `index.yaml` tail | exact |
| `spec/decisions/058-*.md`, `094-*.md` (amendment blocks) | ADR | n/a | `058:237-244` | exact |
| `.changeset/core-signature-answer-from-signatures.md`, `.changeset/devtools-remedy-asks-core-signature.md` (new) | config | n/a | `core-thrown-message.md`, `devtools-remedy-label-without-json.md` | exact |
| `.planning/phases/QD-76-*/76-mutation.mjs` (new) | script | batch | `75-mutation.mjs` (core), `74-mutation.mjs` (devtools) | exact |

## Pattern Assignments

### `SignatureHistory.ts` — shared lookup + `signatureAnswerFromSignatures`

**Analog:** the existing fixture body, `SignatureHistory.ts:356-409` (to be factored). The grouping (`pairKey`, `keyed`, `grouped`) at `:359-390` moves into module-private `signatureLookup(signatures): (query: SignatureQuery) => Result.Result<Array<Signature>, KeyRefusal>`; the layer keeps its name, copy-per-query comment and refusal mapping.

**Lookup core to move, unchanged** (`:359-360`, `:391-407`):
```typescript
const pairKey = (subjectId: SubjectId, resourceId?: ResourceId) =>
  signatureHistoryPort.key([{ subjectId, resourceId }]);
...
  return Layer.succeed(SignatureHistory, {
    name: "signatureHistoryFromSignatures",
    // A copy per query ... (keep word for word)
    signaturesFor: (query) =>
      Result.match(
        Result.flatMap(grouped, (groups) =>
          Result.map(pairKey(query.subjectId, query.resourceId), (key) => [...(groups.get(key) ?? [])]),
        ),
        {
          onSuccess: Effect.succeed,
          onFailure: (refusal) =>
            Effect.fail(signatureHistoryPort.failure([query], describeKeyRefusal(refusal))),
        },
      ),
  });
```

**The request the judgement must ask** (`:179-188`, the one place a leaf becomes a request):
```typescript
HasSignature: (leaf: LeafOf["HasSignature"], site: ReadSite): [query: SignatureQuery] => [
  { subjectId: site.subject.id, resourceId: scopedResourceIdOf(leaf, site.resource),
    meaning: leaf.meaning, signerRole: leaf.signerRole },
],
```

**Read order to mirror** (`PortAccess.ts:273-293`, `readScoped`; `:481-496`, `askSignature`): `asks` -> if `isResourceScoped(leaf)` and `resourceId === undefined` fail `MissingResourceId({ relation: leaf.meaning })` (built directly, not via `errorOf` from `LeafNeeds.ts`, to avoid a madge cycle; `Policy.ts:939-945` is the precedent) -> lookup -> on refusal `signatureHistoryPort.failure([query], describeKeyRefusal(refusal))` -> answer builder.

**Doc-comment shape:** one-line summary, then the why (see `signatureHistoryFromSignatures` `:340-355`, which states closed world, grouping, fail-closed). Reuse that tone; claim only what a test enforces.

**Imports to add:** `* as Result from "effect/Result"` is already there; add a value import of `MissingResourceId` from `./Errors.ts`, `isResourceScoped` from `./ScopedLeaf.ts`, `signatureAnswerOf` from `./SignatureMatch.ts` (it already imports that module at `:56`). Named relative imports with `.ts`, `import type` for types.

---

### `SignatureMatch.ts` — `signatureAnswerOf`

**Analog:** `signatureMatches` in the same file (`:19-26`).
```typescript
import type { Signature } from "./Signature.ts";

/** Whether any of `signatures` has `meaning` and, when given, `signerRole`. */
export const signatureMatches = (
  signatures: ReadonlyArray<Signature>,
  meaning: string,
  signerRole: string | undefined,
): boolean =>
  signatures.some(
    (s) => s.meaning === meaning && (signerRole === undefined || s.signerRole === signerRole),
  );
```
Add beside it: `signatureAnswerOf(signatures, meaning, signerRole): { readonly matched: boolean; readonly onFile: number }` = `{ matched: signatureMatches(...), onFile: signatures.length }`. Return type is structural: importing `SignatureAnswer` from `SignatureHistory.ts` would be a cycle. Header (`:1-15`) gets one sentence; it still says "out of the barrel (AGENTS.md §9, ADR-QD-099)".

### `PortAccess.ts` — `askSignature`

Replace `:491-495`:
```typescript
const answer: SignatureAnswer = {
  matched: signatureMatches(signatures, leaf.meaning, leaf.signerRole),
  onFile: signatures.length,
};
return answer;
```
with `return signatureAnswerOf(signatures, leaf.meaning, leaf.signerRole);` (keep the `SignatureAnswer` annotation if the compiler needs the check, otherwise drop; remove the now unused `signatureMatches` import only if nothing else reads it). `Effect.fn(signatureHistoryPort.span)` stays traced. If the plan leaves `PortAccess.ts` untouched, drop it from the mutation group before the base is recorded (D-10).

---

### `DecisionHistory.ts` — `actedLookup` + `actedAnswerFromEvents`

**Analog:** `decisionHistoryFromEvents` `:285-318` (sets `keyed` of `ActedEvent`, `anywhere` of `ActedAnywhere`, branch on `query.resourceId === undefined`).
```typescript
export const decisionHistoryFromEvents = (events: ReadonlyArray<ActedEventInput>): Layer.Layer<DecisionHistory> => {
  const keyed = HashSet.fromIterable(events.map((event) => new ActedEvent(event)));
  const anywhere = HashSet.fromIterable(events.map(({ subjectId, event }) => new ActedAnywhere({ subjectId, event })));
  return Layer.succeed(DecisionHistory, {
    name: "decisionHistoryFromEvents",
    hasActed: (query) => Effect.succeed((query.resourceId === undefined ? HashSet.has(anywhere, ...) : HashSet.has(keyed, ...)) ? "Acted" : "NotActed"),
  });
};
```
Factor `(query: ActedQuery) => ActedResult` into private `actedLookup(events)`; the layer wraps it in `Effect.succeed`. Request: `askedActed(leaf, site)` `:140-148` / `decisionHistoryPort.asks.HasActed`. Read order: `readActed` `PortAccess.ts:383-393` (`asks[leaf._tag]`, then `isResourceScoped(leaf) ? readScoped(..., leaf.event) : readPort`). This fixture has no key refusal (HashSet of classes), so `DecisionHistoryUnavailable` is in the type only because the read's error union is; state in the doc comment whether it can occur (check: it cannot from this fixture, so confirm the planned `Result` error union with the planner before widening it for symmetry). Note the BEH-QD-092 `Any` rule: `Any` reads `anywhere`, `Resource` reads `keyed`.

---

### `Remedies.ts` — `Signature` and `Acted` arms

**Analog (core judgement consumed synchronously):** `satisfyingValue` `:159-165`, comment `:134-144`; import block `:20-41` names core values (`judgeMatcher`, `resourceIdOf`, `valueLabel`) as named imports and types via `import type { ... } from "@qadi/core"`. Add `signatureHistoryPort`, `signatureAnswerFromSignatures`, `actedAnswerFromEvents`, `thrownMessage`, `MissingResourceId`/`SignatureHistoryUnavailable` types, `subjectOf` from `./SimulationInput.ts`.

**Module-scope tag dispatch (house form):** `refValue` `:283-296`:
```typescript
const refValue: (ref: ValueRef) => (input: SimulationInput) => Synthesised = Match.type<ValueRef>().pipe(
  Match.tagsExhaustive({ LiteralRef: ..., SubjectIdRef: ..., ... }),
);
```
New failure matcher: `Match.type<MissingResourceId | SignatureHistoryUnavailable>().pipe(Match.tagsExhaustive({ MissingResourceId: ..., SignatureHistoryUnavailable: (f) => ...thrownMessage(f.cause)... }))` at module scope. Same shape also at `:448` and `Inspect.ts:215`, `DockModel.ts:117`.

**Code to replace** (`:525-560` signature arm; `:514-523` acted arm). Keep the row and label construction (`:546-559`) byte-for-byte; the row's `resourceId` becomes `signatureHistoryPort.asks.HasSignature(leaf, site)[0].resourceId`. Keep helpers: `skip(requirement, reason)` (`:~420`), `NO_RESOURCE_ID = "the check names no resource id"` (`:425`), `edit(...)` (`:429`), `grant("signatures", row, label)`, `fieldOps("signatures").elements(input)`.

**`Requirement` variant** (`:317-322`) becomes `{ _tag: "Signature"; readonly leaf: LeafOf["HasSignature"] }`; `requirementCases.HasSignature` (`:368-370`) passes `p`. Acted gets the same treatment if the planner keeps `Acted`'s fields (`event`, `scope`) vs. the node.

**Custom arm:** `Custom: (self) => () => skip(\`custom predicate ${self.name}\`, NO_CUSTOM_PREDICATE_FIELD.reason)`; delete `CUSTOM_HAS_NO_FIELD` (`:426-427`); add `NO_CUSTOM_PREDICATE_FIELD` to the `./SimulationFields.ts` import (`:44` already imports `fieldOps, grant`).

### `SimulationFields.ts` — `NO_CUSTOM_PREDICATE_FIELD`

**Analog:** `:543-577`. Add before `FIXTURE_DATA`:
```typescript
export const NO_CUSTOM_PREDICATE_FIELD: NoFormVocabulary = {
  _tag: "NoFormVocabulary",
  reason: "a custom predicate's answer has no form field; run against Snapshot or Live",
};
```
and `CustomPredicate: NO_CUSTOM_PREDICATE_FIELD,` in `FIXTURE_DATA`. The `FIXTURE_DATA` doc comment (`:554-567`) gains one line that the remedy table reads this cell's reason. The import direction is fixed by the header `:23-27` (ADR-QD-037): Remedies imports SimulationFields, never the reverse.

---

### Tests

**Agreement test header and imports** (analog `ReviewSimulationConformance.test.ts:1-30,60-70`): doc-comment states what must agree and why; `import { assert, describe, it } from "@effect/vitest"`; named imports from `@qadi/core` (`currentSubjectLayer, evaluate, hasSignature`, `fixturePortsLayer`, `makeSubject`), `import * as Effect from "effect/Effect"`, `import * as Layer ...`; relative `../../src/model/Remedies.ts` and `SimulationInput.ts` with `.ts`. Subject layer built as `currentSubjectLayer(subjectOf(input.subject))` (`:~62`). Reference runs core, not `simulationLayer`. Vitest `include` is `test/**/*.test.ts` (`vitest.config.ts:19`), so the new files are picked up with no config edit.

**Closed product, no sampling:** write each axis as a literal array and `assert.strictEqual(cases.length, <literal>)`. No existing devtools test enumerates a product this way; closest idioms are the `it.effect` per site in the conformance test and `Remedies.test.ts` literal tables. Build the cases with plain `flatMap` over the arrays; one `it.effect` per site keeps failures local.

**Untyped fixture row (regression):** `SignatureHistory.test.ts:233-240`
```typescript
const unkeyable = (json: string) => {
  const untyped = JSON.parse(json);
  untyped.subjectId = Symbol("alice");
  return untyped;
};
```
Expected refusal text `"subjectId: an unkeyable symbol (Symbol) has no request key"` (`:254`); read it from core's failure elsewhere (`PORT_DOUBLE_BUDGET` forbids constructing port errors in tests; `assert.instanceOf(result.failure, SignatureHistoryUnavailable)` is the read form, `:249-253`).

**Core conformance:** `SignatureHistory.test.ts` header `:1-5`, imports `:6-21` (direct `../src/*.ts`, `leafOf` from `./helpers.ts`), result read as `Effect.result` then `Result.isFailure(result)` (`:246-253`). Compare `signatureAnswerFromSignatures(rows, leaf, site)` to `Effect.result(askSignature(...))` provided `signatureHistoryFromSignatures(rows)` (`askSignature` from `../src/PortAccess.ts`). For acted: `DecisionHistory.test.ts` vs `askActed`.

**`SimulationFields.test.ts:136-141`:** expected `reason` moves to the kept sentence; add an identity test: Remedies' skip reason for `hasCustom` `strictEqual` `NO_CUSTOM_PREDICATE_FIELD.reason` (`Remedies.test.ts:578-588` is the unchanged characterisation).

**Negative tstyche pins:** none planned; prefer positive pins. If a `.tst.ts` is added, `NOT_CALLABLE_PIN_BUDGET` and AGENTS.md §6 table change together.

---

### Gate 13 / 14: how Phase 69 added one core export end to end

- **Overview row** (`spec/overview.md:277-278`): `| names | kind | \`File.ts\` — description |`. Add after `:277`, for each new name: `| \`signatureAnswerFromSignatures\` | function | \`SignatureHistory.ts\` — ... |` (and `actedAnswerFromEvents` beside `decisionHistoryFromEvents`). Count 941 -> 943 (`node scripts/check-api-surface.mjs`).
- **Overview Change History** (`:13`): prepend `1.134 (2026-11-23): signatureAnswerFromSignatures and actedAnswerFromEvents: ... (ADR-QD-189, CCR-QD-468)<br>` before the `1.133` entry, same style as `1.131`. Use `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-23` (CONTEXT D-12), never hand edit the revision header.
- **Packed-install probe** (`scripts/check-package-install.mjs`): import block in `FIXTURE` includes the name (see `thrownMessage` at `:490`), then `expect(label, actual, expected)` lines (`:564-567`):
  ```typescript
  // The two new public names answer in the packed artifact.
  expect("thrown message of an Error", thrownMessage(new Error("boom")), "boom");
  ```
  Add `expect` lines for a matching `Any` row (`matched: true`) and a `Resource` leaf at a site with no resource (failure `MissingResourceId`), reading through `effect/Result`. `TYPE_ONLY_PROBES`/`REFUSED_SHAPE_PROBES` (`:112-124`) unchanged (values, not type-only).
- **Changeset** shape (`core-thrown-message.md`):
  ```
  ---
  "@qadi/core": minor
  ---

  `@qadi/core` exports `thrownMessage`, ... (one paragraph, plain prose, no phase/plan ids)
  ```
  Devtools one (`devtools-remedy-label-without-json.md`) uses `"@qadi/devtools": patch` and describes only what is visible.

### ADR file and amendments

**ADR-QD-189 header** (copy `188-...md:1-12`; filename `189-<slug>.md`, ASCII, `'` dropped as in `188-the-evaluate-familys-...`):
```markdown
# ADR-QD-189 — Remedies asks core whether a fixture row meets a signature or acted leaf

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-189                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-23                                     |
> | Status         | Accepted — amends ADR-QD-058 and ADR-QD-094    |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-23): ...                          |
```
Sections as in 094: `## Context`, `## Decision`, `## Consequences`, `## Alternatives considered`, `## Related`. **Index row** (`index.yaml`, copy the 188 entry): `- id: "ADR-QD-189"`, `file:`, `title:`, `status: "Accepted — amends ADR-QD-058 and ADR-QD-094"`. Document ID equals file number (gate 10).

**Amendment block** (`058:237-244`, dated heading, appended after the last one, never a history rewrite):
```markdown
## Amendment (2026-11-23, ADR-QD-189, CCR-QD-468)

<one paragraph: the match rule, stated once, now also serves the fixture judgement ...>
See [ADR-QD-189](189-....md).
```
ADR-QD-094 amendment goes after `:368` (last existing: `2026-11-12, CCR-QD-419`); ADR-QD-099 is left as written. 094's fixture section is `:274-298`.

### Mutation scorer (`76-mutation.mjs`)

Copy `75-mutation.mjs` (core groups: `config: "stryker.config.mjs"`, `report: "reports/mutation/mutation.json"`, `files: [...]`, constants `D`, `R`, `invocation(group)`, `DETECTED`/`OPEN` sets, `record base|close`, `--restart`, `--self-test`) and the devtools group shape from `74-mutation.mjs:21-27`:
```javascript
session: { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json", files: [`${R}SimulationSession.ts`] },
```
Phase 76 groups (D-10, D-13): `core` = `SignatureHistory.ts`, `SignatureMatch.ts`, `PortAccess.ts`, `DecisionHistory.ts` (R=`packages/core/src/`); `devtools` = `Remedies.ts`, `SimulationFields.ts` (R=`packages/devtools/src/model/`). Update `D` to this phase dir. Output records `76-mutation-base.json` / `76-mutation-close.json`, evidence `76-RED-EVIDENCE.md` (74 and 75 dirs both hold the same three files).

## Shared Patterns

### Core judgement consumed by devtools
**Source:** `Remedies.ts:159-165` (`satisfyingValue` -> `judgeMatcher`). Devtools never restates a comparison; it passes the core node and reads core's verdict. Apply to `Signature` and `Acted` arms.

### Fail closed, never `matched: false` / empty list on refusal
**Source:** `SignatureHistory.ts:340-355` doc comment, BEH-QD-410, INV-QD-007. A refused fixture entry or query fails with `SignatureHistoryUnavailable` carrying `describeKeyRefusal(refusal)`. Apply to the new judgement and to Remedies' skip.

### Errors are read, not constructed, in tests; `Data.TaggedError` vs `Schema.TaggedError`
`MissingResourceId` and `SignatureHistoryUnavailable` are on the `Schema.TaggedError` budget (AGENTS.md §4). The core `src` may construct `MissingResourceId` directly (as `readScoped` does through `errorOf`). Tests assert `_tag`/fields and `assert.instanceOf`; `PORT_DOUBLE_BUDGET` is unchanged.

### Imports and house budgets
`import * as X from "effect/X"` (namespace for effect submodules), named imports from `@qadi/core`, `.ts` extensions, `import type` for types. No `as`, `!`, `any`, `switch`, `Record<string, unknown>`, `Effect.fnUntraced`, module `let`, or decode tokens added in `src` (none of the budgets move). No phase/plan/requirement/D-numbers in source, tests, titles or spec prose (WX-07).

### Package-private modules and the barrel
`SignatureMatch.ts`, `PortAccess.ts` are out of the barrel by header (`SignatureMatch.ts:9-14`, `PortAccess.ts:23-25`, ADR-QD-099); gate 14 check 3b refuses a non-entry module. New public names live in barreled `SignatureHistory.ts` / `DecisionHistory.ts` (`index.ts:53`, `:8`), so `index.ts` needs no edit.

## No Analog Found

| File | Role | Data Flow | Reason |
| ---- | ---- | --------- | ------ |
| Closed-product enumeration with a literal case-count assertion | test technique | agreement | No existing devtools test enumerates a cartesian product; compose it from literal axis arrays with `flatMap` (CONTEXT D-04) and the `it.effect` per-site layout of `ReviewSimulationConformance.test.ts`. |
| A pure `Result`-returning fixture judgement in core | fixture | transform | No exported core function returns a `Result` over fixture data; `judgeMatcher` is pure but returns a `Verdict`, and `signatureHistoryPort.key` already returns `Result<_, KeyRefusal>` (the only `Result` idiom to copy: `SignatureHistory.ts:359-390`). |
| `Match.type` over a closed *failure* union in devtools | dispatch | transform | Existing `Match.tagsExhaustive` uses in devtools dispatch policy/ref/diagnostics unions (`Remedies.ts:285,448`, `Inspect.ts:215`); no failure-union one, same form. |

## Metadata

**Analog search scope:** `packages/core/src` (SignatureHistory, SignatureMatch, PortAccess, DecisionHistory, index), `packages/devtools/src/model` (Remedies, SimulationFields), `packages/*/test`, `spec/decisions`, `spec/overview.md`, `.changeset`, `scripts/check-package-install.mjs`, Phase 74/75 phase dirs.
**Not fully read (planner should re-read before editing):** `ScopedLeaf.ts`, `Remedies.ts:60-125` and the `skip`/`Built` helpers (`:~415-430`), `spec/invariants.md`, `spec/traceability.md`, `spec/README.md` CCR table, `DecisionHistory.test.ts`, `75-mutation.mjs` body beyond the group table.
**Pattern extraction date:** 2026-11-23
