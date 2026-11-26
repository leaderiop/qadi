# Phase 90: The remaining per-port facts live on the port description - Pattern Map

**Mapped:** 2026-11-26
**Files analyzed:** 41 (13 core src, 2 born tests, 3 declared test edits, 1 bench, 4 scripts + 5 phase records, ~12 spec/changeset/docs)
**Analogs found:** 41 / 41. Every analog path below was checked tracked (`git ls-files`) or read from the tracked planning tree. No `.gsd` mirror paths.

Where the two inputs disagree, the CONTEXT "Addendum after research" (D-NNa) and the RESEARCH spike code win. The spiked code in `90-RESEARCH.md` P3 (lines 164-243) and P6 (lines 264-322) compiled, was madge-clean and d.ts-clean, so the per-file "core pattern" below points at it instead of re-quoting it. The codebase excerpts here are the **before** code each edit starts from, plus the idiom analogs.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/PortName.ts` | leaf utility (name tuple) | transform | itself (1-53); `ScopedLeaf.ts` as the "leaf, says why" header idiom | exact |
| `packages/core/src/PortMetrics.ts` | utility (metric domains) | transform | itself 55-67, 145-157 | exact |
| `packages/core/src/PortDescription.ts` | model (interface) | request-response | itself 169-311; `PortServing.tst.ts` "required member" | exact |
| `packages/core/src/PortDerivation.ts` | utility (type-level) | transform | `LeafNeeds.ts:114-124` `Disjoint` / `ListsDisjoint` | role-match |
| `packages/core/src/Ports.ts` | registry | request-response | itself `tabulatePorts` 184-196, `PORT_FIXTURES` 259-268 | exact |
| `AttributeResolver.ts`, `DecisionHistory.ts`, `RelationshipResolver.ts`, `SignatureHistory.ts`, `CustomPredicate.ts` | service + description | request-response | `AttributeResolver.ts:162-180` and the existing `typeof attributeSpan` pattern | exact |
| `packages/core/src/PortAccess.ts` | service (port read) | request-response | itself 219-301, 390-400, 447-454, 489-505 | exact |
| `packages/core/src/LeafNeeds.ts`, `ScopedLeaf.ts` | table / utility (prose only) | n/a | themselves | exact |
| `packages/core/test/PortFacts.characterisation.test.ts` (born) | test | request-response | `packages/audit/test/AdmissionOrder.characterisation.test.ts`; `PortAccess.test.ts` span collector; `LeafFixtures.ts` | role-match (composite) |
| `packages/core/test/PortFacts.tst.ts` (born) | type test | n/a | `PortServing.tst.ts`, `LeafNeeds.tst.ts` | exact |
| `packages/core/test/LeafNeeds.test.ts` 133-160 (edit) | test | request-response | itself | exact |
| `packages/core/test/PortName.tst.ts`, `PortDescription.test.ts` (edit) | type test, test | n/a | themselves | exact |
| `packages/core/bench/Evaluate.bench.ts` (edit) | bench | batch | itself 330-425 `leafHeavy` | exact |
| `.planning/phases/QD-90-*/bench/workloads.txt` | record | file-I/O | `.planning/milestones/v1.7-phases/QD-68-hygiene-and-recorded-close-outs/bench/workloads.txt` | exact |
| `90-check.mjs`, `90-pinned-check.mjs`, `90-mutation.mjs`, `90-earlier-checks.mjs` | phase script | batch | `.planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-*.mjs` | exact |
| `90-mutation-base.json`, `90-RED-EVIDENCE.md`, `90-SPIKE.md`, `90-BENCH.md` | records | file-I/O | `89-mutation-base.json`, `89-RED-EVIDENCE.md`; `89-BENCH.md` is cited by RESEARCH 324 as the shape (not present in the 89 dir listing: use the RESEARCH P6 description) | exact / role |
| `spec/decisions/203-*.md`, ADR-094/163/134 amendments, BEH-786..790, INV-425..426, traceability, overview, index.yaml, README CCR-482 | spec | doc | `89-PATTERNS.md` "Records" section (ADR-202 / BEH-781..785 / INV-423..424 / CCR-481) | exact |
| `.changeset/core-port-facts-on-the-description.md` | changeset | doc | `.changeset/core-signature-answer-from-signatures.md`, `.changeset/core-stored-record-is-its-envelope.md` | exact |
| `apps/website/src/content/docs/docs/reference/upgrading.md` (optional edit) | docs | doc | its `## 0.12: a port states its wire` (130-160) and `## 0.13: ...` sections | exact |
| `AGENTS.md` §3 | prose | doc | itself | exact |

## Pattern Assignments

### `packages/core/src/PortName.ts` (leaf, transform)

**Analog:** itself. Before-state (1-53): a module-private `interface PortSpans` with five `readonly <Port>: "qadi.<x>"` rows (lines 19-25), then `PortName = keyof PortSpans` (36), `PortSpanOf<N>` (44), `PortSpanName` (53). Header (1-18) carries the leaf rule: "`PortMetrics.ts` imports the name type from here, never the reverse, so a metric's registry key (ADR-QD-052) cannot move with a port's identity."

**Target (CONTEXT D-07, spiked P1 (a)):**
```ts
// still no import
export const PORT_NAMES = ["AttributeResolver", "DecisionHistory", "RelationshipResolver", "CustomPredicate", "SignatureHistory"] as const;
export type PortName = (typeof PORT_NAMES)[number];
```
Order is today's. Delete `PortSpans`, `PortSpanOf`, `PortSpanName` here (they move to `Ports.ts`; leaving them yields TS2308 at `index.ts(42,1)`, P1 (b)). Keep the leaf sentence in the header and rewrite the `PortSpans` paragraph (the "stated once" claim is now the tuple's). Doc-comment shape: one-line summary, then why.

### `packages/core/src/PortMetrics.ts` (utility, transform)

**Analog:** itself. Before (58-67, 145-157):
```ts
const PORT_NAMES_BY_NAME: Record<PortName, true> = { AttributeResolver: true, /* ... five rows */ };
const PORT_NAMES: ReadonlyArray<PortName> = Record.keys(PORT_NAMES_BY_NAME);
// ...
export type PredicatePortName = "AttributeResolver" | "DecisionHistory";
const PREDICATE_PORT_NAMES_BY_NAME: Record<PredicatePortName, true> = { AttributeResolver: true, DecisionHistory: true };
const PREDICATE_PORT_NAMES: ReadonlyArray<PredicatePortName> = Record.keys(PREDICATE_PORT_NAMES_BY_NAME);
```
**After (D-08, RESEARCH P3 lines 240):** delete both `*_BY_NAME` records and the local `PORT_NAMES`; `import { PORT_NAMES } from "./PortName.ts";` beside the existing `import type { PortName }`; the four `preregisteredWords` read the imported tuple; `const PREDICATE_PORT_NAMES = ["AttributeResolver", "DecisionHistory"] as const satisfies ReadonlyArray<PortName>;` and `export type PredicatePortName = (typeof PREDICATE_PORT_NAMES)[number];`. Drop `import * as Record from "effect/Record"` if it becomes unused. No metric id or `description` string moves (registry key, ADR-QD-052).

### `packages/core/src/PortDescription.ts` (model, request-response)

**Analog:** itself, interface at 169-311, `span: PortSpanOf<N>` at 189, import of `PortSpanOf` at 35. **Target:** RESEARCH P3 lines 168-180: append `SpanName extends \`qadi.${string}\` = \`qadi.${string}\`` and `FixtureData = never` after `Asks`; `readonly span: SpanName;`; `readonly fixture: (data: FixtureData) => Layer.Layer<Self>;` with a doc line citing ADR-QD-050's plain-and-serializable rule; `import type * as Layer from "effect/Layer";`; `import type { PortName } from "./PortName.ts";`. The template bound is inline, no new export (AGENTS.md §9, TS2883). The "required member" shape is pinned the same way `serving` is (`PortServing.tst.ts:26-30`, below).

### `packages/core/src/PortDerivation.ts` (type-level utility)

**Analog for `DistinctSpanNames`:** `LeafNeeds.ts:114-124` (`unknown` when no tag is in two lists, `never` otherwise) and its use as `... satisfies { ... } & ListsDisjoint` at 177:
```ts
type Disjoint<A extends string, B extends string, C extends string> = [
  Extract<A, B> | Extract<A, C> | Extract<B, C>,
] extends [never] ? unknown : never;
// LEAF_NEEDS = { ... } as const satisfies { readonly [K in LeafTag]: LeafNeedOf<K> } & ListsDisjoint;
```
**Target:** the spiked `IsPattern` / `SpanOffenders` / `DistinctSpanNames<R>` in RESEARCH P3 lines 185-202 (exported from this package-private module, never the barrel, D-10). Generic over the registry so a test can feed a fake sixth port (the `LeafNeedOfVariant` precedent). `makePortDescription` (line 82) gains `SpanName` and `FixtureData` generics after `Asks`. Behavior table (positive twin, duplicate, `string`, `qadi.${string}`, claimed `"qadi.acted"`) is RESEARCH P4 lines 248-254.

### `packages/core/src/Ports.ts` (registry, request-response)

**Analog:** itself. Before: `PortFixtureData` interface (241-247, five hand rows), `PORT_FIXTURES` (259-268), the inline `CustomPredicate` arrow (265-266):
```ts
CustomPredicate: (answers) =>
  customPredicateFromRecord(Record.map(answers, (answer) => () => Effect.succeed(answer))),
```
`DescriptionOf<K>` (109-118), `tabulatePorts` (184-196, two overloads, layer overload), `mergePorts` (208-215), `fixturePortsLayer` (306-312 reads `PORT_FIXTURES[d.port]`).
**Target:** RESEARCH P3 lines 206-223 verbatim: `PORTS: PortTypes = {...} satisfies DistinctSpanNames<PortTypes>`; `PortSpanOf`/`PortSpanName` (public, same names, now `PortTypes[N]["span"]`); `DescriptionOf` passes `PortSpanOf<K>` and `PortFixtureData[K]`; `FixtureDataOf`, `FixtureBuilders`, `FixtureVisitor` **unexported** (gate 13 stays 943 with `PORT_NAMES` only); third `tabulatePorts` overload `(f: FixtureVisitor): FixtureBuilders` placed before the generic one (TS #30769); `PORT_FIXTURES: FixtureBuilders = tabulatePorts((d) => d.fixture)`; `fixturePortsLayer` uses `fixtureLayer(d.fixture, setup?.answers)`. `PortTypes`, `PORTS` rows, `tabulatePorts`' five rows and `mergePorts`' five arguments stay written out (D-13). Remove the `Record` import if unused after the arrow leaves.

### The five port modules (service + description)

**Analog:** `AttributeResolver.ts:162-180` (before):
```ts
export const attributeResolverPort: PortDescription<
  "AttributeResolver", AttributeResolver, AttributeResolverShape,
  [subjectId: SubjectId, attribute: string], unknown, AttributeResolveError,
  [subjectId: SubjectId, attribute: string],
  typeof attributeSpan,
  typeof attributeAsks
> = makePortDescription({
  port: "AttributeResolver",
  method: "resolve",
  span: "qadi.attribute",
  attributes: attributeSpan,
  asks: attributeAsks,
```
The existing `typeof attributeSpan, typeof attributeAsks` pair is the precedent for the span-name type argument. **Edit per port (D-09a, D-11/11a, RESEARCH P2 147-162 and P3 227-238):** add `const <x>SpanName = "qadi.…";` (`attributeSpanName`, `customSpanName`, and the three siblings) before the description; type args gain `typeof <x>SpanName` then the fixture data type (`Readonly<Record<string, unknown>>`, `ReadonlyArray<RelationshipEdgeInput>`, `ReadonlyArray<ActedEventInput>`, `ReadonlyArray<SignatureInput>`, `Readonly<Record<string, boolean>>`); the value says `span: <x>SpanName` and `fixture: <builder>`. **Move each builder above its description** (`attributeResolverFromRecord` at 228, `relationshipResolverFromEdges` 393, `customPredicateFromRecord` 264, `decisionHistoryFromEvents` 337, `signatureHistoryFromSignatures` 435) or use a thunk: eager use before declaration is TS2448/TS2454 and a load-time `ReferenceError` (P5). `CustomPredicate.ts` takes the arrow from `Ports.ts:265-266` and needs `import * as Record from "effect/Record"` (and `Effect` if absent). Form (ii), inference through `makePortDescription`, fails for `CustomPredicate` (TS7006), so form (i) for all five. Description lines: `AttributeResolver.ts:164`, `RelationshipResolver.ts:271`, `CustomPredicate.ts:204`, `DecisionHistory.ts:190`, `SignatureHistory.ts:229`. **Caution (D-23a):** `"qadi.attribute"` is also the span attribute key at `AttributeResolver.ts:113`; leave it.

### `packages/core/src/PortAccess.ts` (service, request-response)

**Analog:** itself. Before (read above): `type ScopedPort = "DecisionHistory" | "RelationshipResolver" | "SignatureHistory";` (222), `ScopedRequest<K>` (229-230), `completeRequest` (238-247), `RESOURCE_SCOPED = { scope: "Resource" } as const` (250), `readScoped` (278-301):
```ts
Effect.gen(function* () {
  const [{ resourceId }] = request;
  const found = requireResourceId(RESOURCE_SCOPED, resourceId, relation);
  if (Result.isFailure(found)) {
    yield* annotateQuestion<SpanFields>(d, { ...d.attributes.pose(request), scope: "Resource", interpreter });
    return yield* Effect.fail(found.failure);
  }
  const args = completeRequest[d.port](request, found.success);
  return yield* readPort(d, interpreter, args);
});
```
Three read sites route by hand: `readActed` 397-399 (`isResourceScoped(leaf) ? yield* readScoped(...) : yield* readPort(...)`), `askRelationship` 453 (always `readScoped`), `askSignature` 495-497 (same ternary).
**Target:** RESEARCH P6 lines 268-313 (`NeedOf`, `PortNeed`, `BareOf`, `ScopedCall`, `scopedCall`, the module-scope `needsResourceId = Match.type<"Always" | "ByScope">().pipe(Match.when(...), Match.when(...), Match.exhaustive)`, and the new `readScoped(d, interpreter, leaf, request, relation)` returning `readPort(...)` without a generator on the not-needed branch). Call sites become `readScoped(decisionHistoryPort, interpreter, leaf, request, leaf.event)`, `readScoped(relationshipResolverPort, "evaluate", leaf, request, leaf.relation)`, `const signatures = yield* readScoped(signatureHistoryPort, "evaluate", leaf, request, leaf.meaning)`. Add `import { LEAF_NEEDS } from "./LeafNeeds.ts"` plus the needed `import type` names, `import * as Match from "effect/Match"`. `ScopedLeafTag`/`ScopedPort` derived (P1 (f)). After the edit `isResourceScoped(` appears once in `PortAccess.ts`, in the `ByScope` arm. `readScoped` stays a plain function (not `Effect.fn`, not `fnUntraced`, `UNTRACED_BUDGET` unmoved, AGENTS.md §5). No `switch` (`SWITCH_BUDGET`). No `"qadi.` literal in this file (`no-port-span-key-literals`; the spans read `<port>Port.span`). BEH-QD-445's order (annotate, then fail) holds. Bench gate first (D-16): if every hoisted-`Match` form fails the gate, report PFACT-03 not met; the first variant to try is returning two module-scope predicate consts by reference (P6 finding 4). Rewrite the doc comments of `readScoped`, `ScopedPort`, `readActed`, `askRelationship`, `askSignature` and the read-section banner (D-17).

### `packages/core/src/LeafNeeds.ts` and `ScopedLeaf.ts` (prose only)

`LeafNeeds.ts:44-48` ("Declarative: `readScoped` enforces the need and does not read this column") becomes "the read routes on it". `ScopedLeaf.ts:8-19` (header says the read "routes on `isResourceScoped`") becomes "routes on the row, whose `ByScope` arm is `isResourceScoped`". `LEAF_NEEDS` rows (166-177) and every export byte-identical; `ScopedLeaf.ts` keeps its leaf rule (port modules cannot import `LeafNeeds.ts`; `actedAnswerFromEvents`/`signatureAnswerFromSignatures` keep calling `requireResourceId` with the leaf).

---

### `packages/core/test/PortFacts.characterisation.test.ts` (born, test)

**Analogs (three, one per concern):**

1. **Structure and header:** `packages/audit/test/AdmissionOrder.characterisation.test.ts:1-60`. The header states what it pins and that rows are written literally "so no abstraction under test can make a row pass by construction"; imports `{ assert, describe, it } from "@effect/vitest"`; module-private helpers `codecRow`, `fromStore`, `handedOver`, `host` and a `counting` Proxy. The file is held byte for byte from the commit that adds it; declared regions (only import lines here) are named in `90-pinned-check.mjs` by exact lines.
2. **Span collector:** `packages/core/test/helpers.ts:94-104` (`collectingTracer`, with `attributesOf` 112-116 and `allAttributesOf` 119-120) as `PortAccess.test.ts` uses it (lines 255-265, 617-639):
```ts
const spans: Array<Tracer.Span> = [];
// ... Effect.provide(Layer.mergeAll(portsLayer({ SignatureHistory: store }), collectingTracer(spans)))
```
   Import `collectingTracer`, `allAttributesOf` from `./helpers.ts` (there is a test-helper twin rule, so do not copy the tracer in).
3. **Route-table oracle:** `packages/core/test/LeafFixtures.ts` `FIXTURES` (typed `{ readonly [K in LeafTag]: ReadonlyArray<Fixture> }`, 73), `Fixture.scoped`/`.name`/`.label` (47-65), `SHAPES` and `leafLayer`, driven the way `LeafNeeds.test.ts:133-160` does (`absenceOf(...)` skip, `Effect.exit(evaluate(...))`, `Cause.squash(exit.cause) instanceof MissingResourceId`). Its header (1-13) states the oracle rule: written by hand, never read from the table under test (INV-QD-011). For D-18 the route table's expected rows are written out literally, not computed from `LEAF_NEEDS`.

**Rows (D-18):** facts golden through `tabulatePorts` (port, method, span, `serving.allowlist`, `none.name`, fixture-layer shape name); order (`forEveryPort((d) => d.port)` and `Object.keys(tabulatePorts(...))` equal the five names); preregistered metric words per `portCallsTotal`, `portRetriesTotal`, `portTimeoutsTotal`, `servedPortCallsTotal`, `predicatePortCallsTotal` read through `Metric.value`, **no `"qadi_…"` literal** (`METRIC_ID_LITERAL_BUDGET`); wire bytes via `d.wire.toQuestion` then schema encode; served bytes via one `answerRemotely` round per port; route table with span list, question `scope`, called-and-counted. No `as`/`!`/`any`. Titles name a property, never an id, D-number or phase. Committed green on the base. The `"qadi.*"` span names in this file are literals counted by `SPAN_KEY_LITERAL_BUDGET` only if they are span *keys* of the evaluate family; span *names* of ports are not keys, but check `[span-key-literal]` once the file exists and add a budget row if it counts any.

### `packages/core/test/PortFacts.tst.ts` (born, type test)

**Analogs:** `PortServing.tst.ts` (header 1-10, imports 11-14, pins 16-49) and `LeafNeeds.tst.ts:1-30` (header comment, `import { expect, test } from "tstyche"`, `import type` of `../src/*.ts`). Positive pins and `not.toBeAssignableTo` only (`NOT_CALLABLE_PIN_BUDGET` and its table do not move).

**Pattern to copy for the new required-member pins** (`PortServing.tst.ts:26-30`):
```ts
test("serving is a required member of a description", () => {
  expect<Omit<PortTypes["AttributeResolver"], "serving">>().type.not.toBeAssignableTo<
    DescriptionOf<"AttributeResolver">
  >();
});
```
Use it for `Omit<PortTypes[K], "fixture">` and `Omit<PortTypes[K], "span">`, adding the positive anchor `PortTypes[K]` assignable to `DescriptionOf<K>`. Import moved types from the barrel `../src/index.ts` so the base pins (`PortFixtureData`, `PortSpanName`, `PortSpanOf<K>`, `PortName`) are held through the move (RESEARCH P7 348). `DistinctSpanNames` is package-private (not in the barrel): import it from `../src/PortDerivation.ts` in the later pins, fake records `Six` (positive twin `toBe<unknown>`), `Dup`, `Wide` (`toBe<never>`). Keep the `PortName.tst.ts:24-30` style of one `test()` per property.

### Declared test edits

- **`packages/core/test/LeafNeeds.test.ts:133-160`.** Replace the describe titled `"a row's resourceId is what readScoped does (D-06)"` (whose single `it.effect("Never / Always / ByScope", ...)` is the column's only reader at line 137) with `describe("a scoped read requires an id exactly where its leaf's row says", ...)` (no D-number, WX-07). Keep the same oracle (`claimed = need === "Always" || (need === "ByScope" && f.scoped)`, `refused === claimed && shape !== "id"`, existing `absenceOf` skip and `Cause.squash` check shown above), add assertion 2 (the fixture judgement's `requireResourceId` answer equals the read's for every `ByScope` leaf) and assertion 3 (the scoped tags are exactly `HasRelationship`, `HasActed`, `HasNotActed`, `HasSignature`). Removed: 1 test, 1 assertion kept in new form (RESEARCH audit table 415-424).
- **`packages/core/test/PortName.tst.ts`.** Line 12 import of `PortSpanName`/`PortSpanOf` moves to `../src/Ports.ts` (TS2724/TS2305 until it does); delete lines 33-35 (the `PortDescription<"AttributeResolver", unknown, PortShape, [], unknown, unknown>["span"]` assertion, and the `PortDescription`, `PortShape` import at 11); keep 36-38 (`{ span: "qadi.acted" }` `not.toBeAssignableTo<Pick<typeof attributeResolverPort, "span">>()`); rename the third test per D-20 ("a description's span is its own port's") and update the header (1-8), which names `PortName.ts` and `PortSpanOf<N>`, to name `DistinctSpanNames`.
- **`packages/core/test/PortDescription.test.ts:83-115`.** `probePort` is a hand-built literal typed `PortDescription<"AttributeResolver", ProbePort, ProbeShape, [who, what], number | undefined, ProbeError, [who, what], typeof probeSpan>` with `span: "qadi.attribute"`. D-20a: add only `fixture: () => named(undefined, 0),` (one TS2741 otherwise); no span annotation.
- **Held byte for byte** (judged by `90-pinned-check.mjs`): the D-20 list, including `PortServing.tst.ts`, `Ports.test.ts`, `Ports.tst.ts`, `PortAccess.test.ts`, `PortAccess.tst.ts`, `LeafNeeds.tst.ts`, and every http/testing/devtools test and `features/` file.

### `packages/core/bench/Evaluate.bench.ts` (bench workloads)

**Analog:** itself, the `leafHeavy` / `leafHeavyPlain` / `leafRequest` block (330-380) and the `test("evaluate", ...)` body (388-423):
```ts
assert(isAllowed(runtime.runSync(evaluate(leafHeavy, leafRequest))), "leaf-heavy (action and resource) must decide Allow");
await bench.compare(
  bench("one node", () => run(one)),
  ...
  bench("leaf-heavy — allOf of 8, matchers reference neither", () => { runtime.runSync(evaluate(leafHeavyPlain, leafRequest)); }),
  options,
);
```
Add two workloads named exactly `scoped-heavy — allOf of 8 resource-scoped port leaves, id present` and `scoped-heavy — allOf of 8 Any-scoped port leaves`, each with a doc comment like `leafHeavy`'s (what it stresses, "every one holds so the whole fold runs") and an `assert(isAllowed(...))` before timing (the file's pattern at 388-397). Build them under `fixturePortsLayer` (import from `../src/Ports.ts`, alongside the existing `portsLayer` import at line 109) with edges `owner`/`reader` on `doc-1`, acted events `raised`/`viewed`, and signature `approved`; the Any-scoped runtime needs an extra signature row with no `resourceId` or `hasSignature(..., { scope: "Any" })` denies (RESEARCH P6 327-329, Pitfall 8). Needs a new `ManagedRuntime` beside the existing `runtime` (see top-of-file imports 70-72). The file must be tracked and held before `ab.sh` runs (it refuses an untracked bench file).

**Workloads file:** analog `.planning/milestones/v1.7-phases/QD-68-hygiene-and-recorded-close-outs/bench/workloads.txt`, one `<test title> :: <bench name>` key per line, none twice, keys verbatim:
```
evaluate :: one node
evaluate :: leaf-heavy — allOf of 8, matchers reference neither
filter — 500 items :: hasPermission
decideSubjects — 500 subjects :: hasPermission
evaluate — depth scaling :: depth 5
evaluate — wide, concurrency :: sequential (default)
```
Plan 1 commits the file (suggested `.planning/phases/QD-90-*/bench/workloads.txt`) beside the two new keys `evaluate :: scoped-heavy — allOf of 8 resource-scoped port leaves, id present` and `evaluate :: scoped-heavy — allOf of 8 Any-scoped port leaves`. Run: `scripts/bench/ab.sh <patch> <outdir> 4 <head-label> <patched-label> packages/core/bench/Evaluate.bench.ts <pattern>`, then `node scripts/bench/analyze.mjs <outdir> <reference-label> <candidate-label> <workloads-file>`; last line `# gate: pass` is the verdict (fixed 5% band per workload and geometric mean at most +2%, D-16a, not the CONTEXT's `max(10%, spread)`). `ab.sh` refuses an odd or sub-4 round count and an untracked bench file, and the patch may touch `packages/` only. Record in `90-BENCH.md` with the patch's SHA-256.

---

## Phase scripts (analog: `.planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-*.mjs`, tracked)

Copy each, rename `89-` to `90-`, keep `--self-test`, keep "The script never edits an archived check's path constants". Line numbers are 89's.

### `90-check.mjs` (from `89-check.mjs`, 1608 lines)

| 89 line | 89 value | 90 value |
|---|---|---|
| 47-48 | `EVIDENCE`, `BASE_RECORD` = `89-RED-EVIDENCE.md`, `89-mutation-base.json` | `90-` forms |
| 50 | `TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` | **Conflict to settle in plan 1:** D-05 (CONTEXT) says `Claude Opus 5.5 <noreply@anthropic.com>`; the live commit reminder in this session says `Claude Sonnet 5.5 <noreply@anthropic.com>`. The script constant must equal what the plans commit with. Follow D-05, the phase's locked decision, and record the choice in `90-RED-EVIDENCE.md` |
| 51 | `PLAN_SUBJECT = /^[a-z]+[(]89-[0-9]{2}[)]!?: /` | `[(]90-[0-9]{2}[)]` |
| 54 | `PLANNING_HEAD = "b1d9043b"` | the last planning-only commit at plan-1 start (`b6e627a8` today, `docs(phase-90): add validation strategy`); check `git diff --stat <89-end-sha> HEAD -- . ':!.planning'` is empty |
| 57 | `NEVER_STAGED` last pattern names `QD-89-...` | `QD-90-the-remaining-per-port-facts-live-on-the-port-description` |
| 260 | `ID_TOKENS` incl. 89 tokens | swap to `PFACT-0\d`, `90-\d{2}`, `QD-90`, `Phase 90`; keep `D-\d+`, `WX-0\d`, `-NEXT` |
| 270 | `PHRASE_EXEMPT` = `.changeset/` | unchanged |
| 298-307 | `SRC_ONLY` / `EVERYWHERE` over `packages/audit/src` | `packages/core/src` (and `packages/core/test` for the title scans) |
| 523-565 | constants: `BEHAVIORS`, `AUDIT_SRC`, `HOST`, `BORN_TESTS`, `NEW_BEHAVIORS = [781..785]`, `NEW_INVARIANTS = [423, 424]`, `RESTATED_INVARIANTS`, `CHANGESET`, `REVISED_DOCUMENTS` | `BEHAVIORS = "spec/behaviors/30-port-calls.md"`; `NEW_BEHAVIORS = [786, 787, 788, 789, 790]`; `NEW_INVARIANTS = [425, 426]`; restated BEH `[227?, 445, 588]` and INV `[288, 345]`; `KEPT_BEHAVIORS` for 445/588; `CHANGESET = ".changeset/core-port-facts-on-the-description.md"` with header `---\n"@qadi/core": minor\n---\n` and the sentences of D-27; `REVISED_DOCUMENTS` = ADR-094 1.12 to 1.13, ADR-163 1.10 to 1.11, ADR-134 1.1 to 1.2 (ADR-114 stays 1.1), `30-port-calls.md` 1.25 to 1.26, `overview.md` 1.146 to 1.147, `invariants.md` 1.234 to 1.235, `traceability.md` 1.334 to 1.335, `README.md` 1.415 to 1.416 (RESEARCH P11 table) |
| 958 | `MODES` | keep `base commit unchanged seen-failing vitest suite scan-ids scan-forbidden trailers records [--close] --self-test`; delete `admission-step`, `entry-points-first`; add `port-facts`, `scoped-route`, `sixth-port`, `circular` (D-23) |
| vitest/suite blocks | `--project audit`, `packages/audit/test` | `suite` runs the `core`, `http`, `testing`, `devtools` projects; base list via `git ls-tree -r --name-only base -- packages/{core,http,testing,devtools}/test` |
| self-test plants | `"see 89-03"`, `"ADMIT-02 holds"`, `"QD-89 closes"`, `"Phase 89 added"` | `"see 90-03"`, `"PFACT-02 holds"`, `"QD-90 closes"`, `"Phase 90 added"`; negatives `"ADR-QD-203"`, `"INV-QD-426"`, `"BEH-QD-789"`, `"CCR-QD-482"`, `"ARCH-137"`, `"Phase 900"` |

New judges (reuse helpers `blank`, `topLevel`, `importsOf`, `sourceFiles`):
- `port-facts`: `PortName.ts` has no `import` and exports exactly `PORT_NAMES` and `PortName`; no `interface PortSpans`; each port module has exactly one `const <x>SpanName = "…"` declaration (count the **declaration**, never bare occurrences: `qadi.attribute` also occurs at `AttributeResolver.ts:113`, D-23a); `PortMetrics.ts` has no `Record<PortName, true>`, `PORT_NAMES_BY_NAME`, `Record<PredicatePortName`; `Ports.ts` has no `interface PortFixtureData` and no per-port builder row; `PortServing.ts` byte-identical to base.
- `scoped-route`: `PortAccess.ts` imports `./LeafNeeds.ts`; `type ScopedPort =` is not a union of string literals; `isResourceScoped(` appears once; `readScoped` not wrapped in `Effect.fn`/`Effect.fnUntraced`; one module-scope `Match.type`; no `switch`; no `"qadi.` literal in `PortAccess.ts`, `PortDerivation.ts` or `devtools/src/model/PortCalls.ts`.
- `sixth-port`: compare (file, code) groups of `tsc -b` after adding `"FakePort"` to `PORT_NAMES` with the set recorded in `90-RED-EVIDENCE.md` (base 53 errors / 22 groups, close 57 / 25, four packages, D-22a); never a hand list.
- `circular`: `pnpm circular < /dev/null` clean.

### `90-pinned-check.mjs` (from `89-pinned-check.mjs`, 718 lines)

Constants (89 lines 38-61): `TEST_DIR = "packages/audit/test"` becomes `"packages/core/test"`; `HELD_EXTRA` (89: `CodecMade.ts`, `SequenceIntegrity.ts`, `index.ts`) becomes `packages/core/src/PortServing.ts` (held byte for byte, D-12) plus the http/testing/devtools test dirs and `features/` if the held set is not computed over them; `BORN = [PortFacts.characterisation.test.ts, PortFacts.tst.ts]`; `FOREIGN` becomes `LeafNeeds.test.ts` with regions `from: 'describe("a row\'s resourceId is what readScoped does (D-06)"'` and `applied: (t) => t.includes("a scoped read requires an id exactly where its leaf's row says")`; two more declared files `PortName.tst.ts` (import line, the dropped `PortDescription<...>["span"]` assertion, header) and `PortDescription.test.ts` (the one `fixture:` line). The held set stays computed from `git ls-tree -r --name-only <phase_base>` minus declared files, never listed by hand. `PortFacts.characterisation.test.ts` is `BORN` with one declared region: its import lines. Regions are exact lines (the 89 lesson, `ORDER_REGIONS` 106-). `phase_base` read from `90-mutation-base.json`. Header keeps "three kinds: held, declared, born".

### `90-mutation.mjs` (from `89-mutation.mjs`, 591 lines)

| 89 | 90 |
|---|---|
| 43-45 `CONFIG = "stryker.audit.mjs"`, `REPORT = reports/mutation-audit/...`, `SRC = packages/audit/src/` | `CONFIG = "stryker.config.mjs"`, `REPORT = "reports/mutation/mutation.json"`, `SRC = "packages/core/src/"` |
| 47 `FIVE`, 53 `FILES = { base: FIVE, close: [...FIVE, HOST_BATCH] }` | the 13 files, base and close identical: `PortName, Ports, PortMetrics, PortAccess, PortDescription, PortDerivation, AttributeResolver, RelationshipResolver, CustomPredicate, DecisionHistory, SignatureHistory, LeafNeeds, ScopedLeaf`; invocation `pnpm exec stryker run stryker.config.mjs --mutate <the 13>`, no new file (`NEW_FILES = []`) |
| 57 `RENAMED = {}` | `{}` (no file is renamed) |
| 60 `MOVED` | note `CustomPredicate`'s fixture arrow (`Ports.ts:265-266` to `CustomPredicate.ts`) and the two route ternaries (`readActed` 397-399, `askSignature` 495-497, to `readScoped`) |
| 65 `UNMEASURED_WHY` | `[]`; reason: every touched file is under `packages/core/src/**/*.ts` minus `index.ts` |
| 74 `EQUIVALENT = []` | one entry for `bare !== undefined` in `readScoped` (dead for `RelationshipResolver` by construction, RESEARCH P6 finding 1); shape `{ file, mutatorName, replacement, lineText, reason }` as 89's example |
| 80 `EXAMINED` | the hoisted matcher's `Match.when("Always" | "ByScope")` literal mutants, run by hand with `ignoreStatic: false` and seen Killed by the route table |
| `phase: "89"` | `"90"`; static code (`ignoreStatic: true`: tuple, `PREDICATE_PORT_NAMES`, `<x>SpanName` consts, `scopedCall`, `LEAF_NEEDS`) is proved by the goldens and route table, not a score |

Take `90-mutation-base.json` on the unchanged tree, sequentially, stdin closed, never beside vitest or another Stryker run. A touched file's score must not fall; a drop is closed with a test, never re-baselined. Core coverage stays at or above 95%.

### `90-earlier-checks.mjs` (from `89-earlier-checks.mjs`, 400 lines)

- Line 46 `OUT = join(realpathSync(process.env.TMPDIR || "/tmp"), "qd89")` becomes `"qd90"`; line 302 `"qd89-st-"` becomes `"qd90-st-"`.
- Line 50 `P88_COPIED` kept; add `P89_COPIED = ["89-check.mjs", "89-pinned-check.mjs", "89-mutation.mjs", "89-earlier-checks.mjs", "89-RED-EVIDENCE.md", "89-mutation-base.json", "89-mutation-close.json"]`; extend `COPIED` (51) and `PHASE_PREFIX` (52) with `p89: "QD-89-"`.
- `CLOSE_LABEL` (76) is `"88-check.mjs records --close"`; its `EXPLAINING` array (87, four lines: changeset, three revisions) is keyed on the exact subject of the 89 commits. 90 needs the same keyed on the **90** records commits' subjects (RESEARCH D-24a): `88-check.mjs records --close` moves (README, traceability, invariants revisions and its changeset count) and `89-check.mjs records --close` newly names revision lines for the registers 90 bumps. Write each explaining subject here before the commit exists and make the plan commit with exactly it. Ledger rows are measured at plan 1 on the base (RESEARCH P9: 59 lines, 55 `exit 0`, 4 `exit 1`).
- Scratch trap (RESEARCH 372): a scratch clone with `node_modules` as a symlink needs `node_modules` and `packages/*/node_modules` added to the clone's `.git/info/exclude`, or `scan-ids`/`scan-forbidden` die with EISDIR.

---

## Records

All shapes are those of `89-PATTERNS.md` "Records" (read it for the ADR header block, section order, audit table columns, BEH block form, INV block form, CCR row form). 90's substitutions:

- **ADR:** `spec/decisions/203-the-remaining-per-port-facts-live-on-the-port-description.md`, Document ID `QADI-ADR-203`, Revision 1.0, `Status: Accepted — amends ADR-QD-094, ADR-QD-163 and ADR-QD-134`, Change History `1.0 (2026-11-26): Initial (ARCH-137, CCR-QD-482)`. Layout analog: `spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md` (and 201, 200). Sections: Context, Decision (D-07 to D-15), the spike verdict table (RESEARCH P1, 121-135), the bench gate of record, the answers to CCR-QD-270 (`fixture` rejection, ADR-094 lines 281-282) and CCR-QD-419 (span derivation rejection, lines 377-383), the serving verdict (16 cycles, D-12a; ADR-QD-114 unamended and cited), Audit table (RESEARCH 415-424: "No property lost; tests removed: 1", assertion removed: 1), Alternatives, Consequences, "What enforces it" (commands, never gate numbers; honest about which checks `pnpm check` runs, i.e. type pins, characterisation, `pnpm circular`, and which are phase-local, i.e. `90-check.mjs` judges and the sixth-port scratch run), Related. Never write a phase script path or a D-number in this file.
- **`spec/decisions/index.yaml`:** after the ADR-QD-202 entry add `id: "ADR-QD-203"`, `file: "203-the-remaining-per-port-facts-live-on-the-port-description.md"`, `title`, `status: "Accepted — amends ADR-QD-094, ADR-QD-163 and ADR-QD-134"`; extend the 094, 163, 134 statuses with `; amended 2026-11-26 (ADR-QD-203: …)` as 89 did for 190 and 110.
- **Amendments:** a bold dated note inside the amended decision (`**Amended 2026-11-26 ([ADR-QD-203](./203-….md)).**`, analog ADR-197 line 93) plus, for ADR-094, a dated note on D-10-k (line 72) and under the CCR-QD-270 and CCR-QD-419 amendments, a new amendment section for the 1.12 to 1.13 bump (the CCR-QD-382 `wire` amendment at 290-301 is the Breaking precedent), ADR-163 decision 3 (line 63: "the table now routes"), ADR-134 lines 80-86 (`ScopedPort` derived). Bump once per document: `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-26 < /dev/null`, then extend the newest Change History entry by hand. Review-round spec fixes go in place, no second bump (89 lesson).
- **BEH-QD-786..790** in `spec/behaviors/30-port-calls.md` (insert after the highest BEH, before the footer link; neighbours BEH-QD-227 at line 27, 445 at 314, 588 at 500). Block form from `89-PATTERNS.md` (heading, `> **Invariant:**`/`> **See:**` lines, a fenced `REQUIREMENT:` block with 13-space continuation, paragraph, `Pinned by`, `Specified in ADR-QD-203 (CCR-QD-482)`). Restate BEH-QD-588 (title and two REQUIREMENTs, drop "`readScoped` does not read the column"), BEH-QD-445's prose paragraph (REQUIREMENTs unchanged). Signatures in ` ```ts ` fences; any ` ```typescript ` fence must compile.
- **INV-QD-425..426** in `spec/invariants.md` after the highest INV (shape: `## INV-QD-NNN: <sentence>`, paragraph, `**Source**`, `**Implication**`, `**Enforcement**`, `**Related**` with relative `behaviors/...` links). Edit INV-QD-288 (line ~3681, Source and Enforcement name the route through the row and the new test, `isResourceScoped` sentence stays) and INV-QD-345 (line ~4090, link INV-QD-426).
- **`spec/traceability.md`** (rows for BEH-786..790, INV-425..426, ADR-203; test-map rows for `PortFacts.characterisation.test.ts`, `PortFacts.tst.ts`, the replaced `LeafNeeds.test.ts` describe), **`spec/overview.md`** (rows at 286 `PortDescription` to eleven parameters plus `span` and `fixture`; 305 `PortTypes`/`PORTS` gains the distinct-span `satisfies`; 307-308 fixtures now read from descriptions; 328 split into `PORT_NAMES`, `PortName` (`PortName.ts`) and `PortSpanName`, `PortSpanOf` (`Ports.ts`); gate 13 942 to 943), **`spec/README.md`** CCR-QD-482 row (analog CCR-QD-481 form, see 89-PATTERNS 244): `ARCH-137`, bold one-line summary, list of documents with revisions, "Unused: …" naming any unused reservation.
- **`AGENTS.md` §3** (line ~137, also the "A port's wrappers and default are derived" paragraph): "a new port is a description, a `PortName` member and its registry lines" becomes "a description (span, wire, serving facet, fixture), a `PORT_NAMES` entry, its registry lines and its `PortServing` row"; the list of facts a description states gains the fixture. Guarded files (`AGENTS.md`) are in `89-check.mjs` `GUARDED` (line 52), so the 90 `commit` mode needs this edit declared.

### `.changeset/core-port-facts-on-the-description.md`

**Analogs:** `.changeset/core-signature-answer-from-signatures.md` and `.changeset/core-stored-record-is-its-envelope.md`. Shape (both):
```
---
"@qadi/core": minor
---

**Breaking.** <what changed, in plain statements>

<second paragraph for the behavior detail>

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
```
Body is D-27's sentences (span-name type parameter and required `fixture`; `PORT_NAMES` exported; the four kept names and "metric ids, descriptions, span names and served and wire bytes are unchanged"; "two ports sharing a span name is now a compile error"; the **Upgrading** line for hand-built descriptions). Write no id (ids are not exempt from the phrase scan; "no longer" is exempt in `.changeset/`). Add the final "See the 0.13 section" line only if the upgrade guide section is added.

**Upgrade guide (optional, decide in the records plan):** the Breaking-minor precedent for a `PortDescription` that gains a required member is `apps/website/src/content/docs/docs/reference/upgrading.md` `## 0.12: a port states its wire` (130-160, "code that builds a `PortDescription` by hand ... must add one"). The latest sections are `## 0.13: ...` (lines 1186-1378). Add `## 0.13: a port states its span name and its fixture` there if the changeset links to it; the website docs may have their own doc-example gate (`check-website-doc-examples.mjs`), so keep fences non-compiled (` ```ts `) unless they compile. Breaking-minor in git history for the same shape: ADR-QD-094 CCR-QD-382 (`wire`), CCR-QD-270.

---

## Shared Patterns

### Derive a per-port fact through the registry, never a second `Record<PortName, …>`
**Source:** `Ports.ts:62-98` (`ArgsOf`, `AnswerOf`, `AskedOf`, `SpanOf`, `ErrorOf` use `infer`) and `tabulatePorts` (184-196). **Apply to:** `PortSpanOf`, `PortFixtureData`, `ScopedPort`. A table over every port is built with `tabulatePorts` and its overloads, not an `as` loop (TS #30769).

### Leaf modules say why they are a leaf
**Source:** `PortName.ts` 1-18, `PortServing.ts` 19-27, `ScopedLeaf.ts` 8-19. **Apply to:** `PortName.ts` (still import-free; `PortName → Ports` is a cycle, measured: 11 cycles), `PortServing.ts` (held, derived form measured at 16 cycles).

### Closed tag lists force the decision at the table
**Source:** `LeafNeeds.ts` `LEAF_NEEDS … satisfies … & ListsDisjoint`. **Apply to:** `scopedCall` (TS2741 demands a row for a newly scoped port; reclassifying `HasRelationship` to `ByScope` is TS2322 at the table).

### `Match` hoisted, no `switch`
**Source:** AGENTS.md §5a (`Match.type<T>()` built once at module scope; `SWITCH_BUDGET` is an exact count). **Apply to:** `needsResourceId` in `PortAccess.ts`.

### Type pins that cannot move `NOT_CALLABLE_PIN_BUDGET`
**Source:** `PortServing.tst.ts` 26-30, 40-49 (`toBe` and `not.toBeAssignableTo` only). **Apply to:** all of `PortFacts.tst.ts`.

### No ids in titles, comments or source
**Source:** `89-check.mjs` `scan-ids` (ID_TOKENS, PHRASE). **Apply to:** every test title and source comment added; WX-07 forbids D-numbers, requirement ids and phase numbers there.

### Seen-failing evidence
**Source:** `89-RED-EVIDENCE.md` format `- failed (base V1): <row title>` / `  (scratch edit: …; N row(s) failed under it)`. **Apply to:** the D-21 variants, the sixth-port base and close sets (D-22a), the bench gate record.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| Core-side characterisation with a per-port wire and served-bytes golden | test | Only audit has a `*.characterisation.test.ts` sibling with the literal-table idiom; the core pieces (collector, `FIXTURES`, `SHAPES`) exist but no core test pins wire JSON per port. Use `Ports.test.ts` (fixtures 484-560) and `PortServe.test.ts`/`PortRemote*.test.ts` for how to drive `answerRemotely` and encode a question |
| `90-check.mjs sixth-port` mode | script | No earlier phase measured a fake-port compile error set; port the (file, code) grouping idea from RESEARCH P8 |
| `DistinctSpanNames` pairwise check | type | Nearest is `Disjoint` in `LeafNeeds.ts`; the pairwise-over-registry form is new (spiked and compiled, RESEARCH P3 185-202) |
| `90-BENCH.md` | record | `89-BENCH.md` is cited in RESEARCH 324 but is not in the 89 phase directory; use the RESEARCH P6 harness description (labels, rounds, patch SHA-256, last `# gate:` line) |

## Metadata

**Analog search scope:** `packages/core/{src,test,bench}`, `packages/audit/test`, `.planning/phases/QD-89-*`, `.planning/milestones/v1.7-phases/QD-68-*/bench`, `scripts/bench`, `.changeset`, `apps/website/src/content/docs/docs/reference/upgrading.md`.
**Files scanned:** about 40 read or grepped; all named analog paths confirmed tracked (`git ls-files`) or in the tracked planning tree.
**Pattern extraction date:** 2026-11-26
