# Phase 70: Hydration's drop events come from its buckets - Pattern Map

**Mapped:** 2026-11-22
**Files analyzed:** 12 (2 src, 3 test, 1 mutation scorer, 1 evidence, 5 records)
**Analogs found:** 11 / 12 (one helper, the exhaustive tuple, has no analog; use a key-ordered record)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/react/src/HydrationBuckets.ts` (new, private) | utility | transform | `packages/core/src/HydrationMetrics.ts` (`hydrationDropReasons`) + `packages/core/src/FieldLattice.ts` `LAWS` | role-match |
| `packages/react/src/HydrationEngine.ts` (mod) | service | transform | itself (`VERDICTS` table, `:283`) | exact |
| `packages/react/test/HydrationEngine.test.ts` / new characterisation table | test | request-response | `HydrationEngine.test.ts`, `HydrationCounts.test.ts`, `HydrationPayload.test.ts` | exact |
| `packages/react/test/Hydration.tst.ts` or new `HydrationBuckets.tst.ts` | test (type) | n/a | `packages/core/test/HydrationMetrics.tst.ts:95-113` | exact |
| `.planning/phases/QD-70-.../70-mutation.mjs` | script | batch | `.planning/phases/QD-69-one-total-thrown-value-to-message-module/69-mutation.mjs` | exact |
| `70-RED-EVIDENCE.md` | doc | n/a | `69-RED-EVIDENCE.md` | exact |
| ADR-QD-183, INV-QD-385/386, BEH-QD-686..690, CCR-QD-462, traceability | spec | n/a | ADR-QD-152 (`spec/decisions/152-...md`), ADR-QD-182, BEH-QD-230/231 | exact |
| `.changeset/react-hydration-buckets.md` | config | n/a | `.changeset/react-reporter-line-total.md` | exact |

## Pattern Assignments

### `packages/react/src/HydrationBuckets.ts` (utility, transform)

No existing "exhaustive tuple" helper in `packages/*/src` or `test` (grepped `ExhaustiveTuple|Exhaustive<|UnionToTuple`: none). Do not invent one; use the repo's own closed-record idiom, which gives TS2741 on a missing key.

**(a) Reason-keyed record, total, no cast.** Analogs: `FieldLattice.ts:320` `const LAWS: Readonly<Record<FieldStrategy, StrategyLaws>> = {...}`; `SharedComputation.ts:89,96` `{ readonly [S in Standing]: ... }`; `HydrationEngine.ts:283` `VERDICTS: { readonly [V in WireVerdict]: Row<V> }` (same file, the house copy). The bucket record must be built by a total constructor whose object literal lists every key, so a new reason is TS2741 there:

```ts
const bucketsOf = <R extends string>(order: { readonly [K in R]: true }) => ...
// literal call site: { EntryTooDeep: [], MalformedEntry: [], UndecodablePolicy: [] }
```
Use a fresh `[]` per key; the type is `{ readonly [K in R]: Array<T> }`. The existing `bucketOf: Record<EntryDropReason, Array<unknown>>` at `HydrationEngine.ts:516-520` is the starting point.

**(b) Declared emission order, compile-time total.** Analog: `HydrationMetrics.ts:279-281`, keys read in declaration order and narrowed by a guard, no cast:
```ts
export const isHydrationDropReason = (word: string): word is HydrationDropReason =>
  Object.hasOwn(HYDRATION_DROP_TABLE, word);
export const hydrationDropReasons: ReadonlyArray<HydrationDropReason> = Object.keys(
  HYDRATION_DROP_TABLE,
).filter(isHydrationDropReason);
```
Copy that shape with react's own order record, `const HYDRATE_ORDER: { readonly [R in EntryDropReason]: true } = { EntryTooDeep: true, MalformedEntry: true, UndecodablePolicy: true }` (key order = emission order, base order, NOT core's), plus a guard `Object.hasOwn(ORDER, k)`. The mapped type makes a missing reason a compile error; the order cannot be read off `hydrationDropReasons` (D-05). Dehydrate order: `ForeignSubject`, `UnencodablePolicy`. Note: AGENTS.md §5a, a table keyed by a tag the code wrote needs no fail-closed row.

**(c) Generic derivation.** Parameterised by reason union `R`, order record, event constructor `(reason: R, entries) => HydrationEvent`. Emit one event per non-empty bucket in key order. Call sites use `HydrationEvent.EntriesDropped({ reason, entries })` (hydrate, `HydrationEngine.ts:551`) and `HydrationEvent.LeftOut({ reason, entries })` (dehydrate, `:383`). Caller then appends `Seeded` / `Dehydrated`. Imports house style: `import type { EntryDropReason, ... } from "./HydrationEvent.ts"` (`.ts` extensions, namespace imports for effect, no barrel export; not exported from `packages/react/src/index.ts`).

### `packages/react/src/HydrationEngine.ts` (service, transform)

**Hydrate side to replace** (`:511-558`): three arrays + `bucketOf` + three `if` pushes; `:543` `malformed.push(entry)` becomes a push into the `MalformedEntry` bucket. Keep decode order: entry decode, then policy decode, then `entryAgrees`.

**Dehydrate side to replace** (`:369-386`): `unencodable` array plus `foreign` from `entries.filter(...)` at `:365` become a record keyed by `DehydrationDropReason`; subject filter still runs first, `Dehydrated` appended last (`:387`).

**Payload producer record (D-01).** Existing dispatcher to derive or check against it (`:200-207`):
```ts
const payloadRefusalReason: (refusal: UntrustedValueRefusal | PayloadVersionRefusal) => PayloadRefusalReason =
  Match.type<UntrustedValueRefusal | PayloadVersionRefusal>().pipe(
    Match.tagsExhaustive({
      TooDeep: (): PayloadRefusalReason => "PayloadTooDeep",
      Malformed: (): PayloadRefusalReason => "MalformedPayload",
      UnsupportedPayloadVersion: (): PayloadRefusalReason => "UnsupportedPayloadVersion",
    }),
  );
```
New record shape: `{ readonly [R in PayloadRefusalReason]: ... }` with rows `PayloadTooDeep`, `MalformedPayload`, `UnsupportedPayloadVersion` (decoder refusal tag) and `PayloadSubjectMismatch` (subject check). Same house pattern as `VERDICTS` (`:283`) and its doc comment "a mapped type ... makes a verdict without a row a compile error". The `refuse(...)` helper at `:481-484` and its two `"PayloadSubjectMismatch"` call sites (`:501`, `:509`) should read the reason from the record, not a literal. `entryDropReason(refusal, malformed)` at `:217-223` stays or the two sites name the reason directly (discretion).

### Type-level tests (`Hydration.tst.ts` or new `HydrationBuckets.tst.ts`)

Analog `packages/core/test/HydrationMetrics.tst.ts:95-113` (checked directives, positive `toBe` twin on each):
```ts
test("a row kind is one of three words, and an unknown kind is refused", () => {
  expect<HydrationDropRow["kind"]>().type.toBe<"dehydration" | "payload" | "entry">();
  // @ts-expect-error does not satisfy the constraint
  expect<HydrationDropReasonOf<"other">>().type.toBe<never>();
  // @ts-expect-error is not assignable to type
  const other: HydrationDropRow = { kind: "other", summary: "s", remedy: "r" };
  expect(other).type.toBe<HydrationDropRow>();
});
test("a row without a kind is refused", () => {
  // @ts-expect-error is missing in type
  const row: HydrationDropRow = { summary: "s", remedy: "r" };
  expect(row).type.toBe<HydrationDropRow>();
});
```
Use this form (a record literal missing one reason, `@ts-expect-error is missing in type`) for record totality: no `not.toBeCallableWith`, so `NOT_CALLABLE_PIN_BUDGET` (AGENTS.md §6 table) needs no edit. Only if a negative callable pin is added, edit the budget in `scripts/check-house-style.mjs` and the §6 table together, with a positive twin. Existing react imports to reuse (`Hydration.tst.ts:12-37`): `EntryDropReason, PayloadRefusalReason` from `../src/HydrationEvent.ts`, `DehydrationDropReason` from `@qadi/core`. A new `.tst.ts` must be selected by tstyche (`--listFiles` and `[not-callable-pin]` walk).

### Characterisation tests (D-08)
Extend or sit beside `packages/react/test/HydrationEngine.test.ts`, `HydrationCounts.test.ts` (counts), `HydrationPayload.test.ts` (payload refusals), `HydrationEvent.test.ts`, `UntrustedSeams.test.ts`. Drive through `hydrateWith`/`dehydrateWith` with `onDropped` reporters capturing events. Written and green on the base before any src edit.

### `70-mutation.mjs`
Copy `69-mutation.mjs` structure (header lines 1-40: groups, `record base|close <group>`, `compare`, removed-mutant rule, `judgeNew` for close-only files, clean-tree and single-head refusal). Reduce to one group `react` using `/Users/mohammadalmechkor/Projects/Perso/qadi/stryker.react.mjs` (repo root, not packages/react), over `HydrationEngine.ts` (base+close) and `HydrationBuckets.ts` (close only). Outputs `70-mutation-base.json` / `70-mutation-close.json`.

### Spec/records
- ADR: model on `spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md`; last ADR file is 182 (`182-one-total-thrown-value-to-text-rule-exported-by-core.md`), registered in `spec/decisions/index.yaml`. Use `scripts/spec-revise.mjs --date 2026-11-22`; never `next-id.mjs`.
- BEH: `spec/behaviors/19-hydration.md` change-history row at line 13 (current 1.23, BEH-QD-230 amended by ADR-QD-182/CCR-QD-461); add 1.24 row. BEH-QD-230 at `:554`, BEH-QD-231 at `:774`.
- INV-QD-045 in `spec/invariants.md` (enforcement restated by INV-QD-385).
- Changeset, exact format:
```
---
"@qadi/react": patch
---

<one sentence, behaviour-level>
```

## Shared Patterns

- **Closed record over union:** `{ readonly [K in U]: V }` (`HydrationEngine.ts:283`, `FieldLattice.ts:320`, `SharedComputation.ts:89`). Missing key = TS2741. No `as`, `any`, `Record<string, unknown>` (AGENTS.md §6, user memory).
- **Reason unions read off core:** `HydrationDropReasonOf<K>` (`HydrationMetrics.ts:223`), re-read in react at `HydrationEvent.ts:93,102`.
- **Pure planners:** metrics and reporters run only in `hydrateWith`/`dehydrateWith` via `emitAll` (`HydrationEngine.ts:336`); deriving events changes no emission code.
- **Doc-comment shape:** one-line summary, then the why with ADR cites (see every block in `HydrationEngine.ts`).

## No Analog Found

| File | Reason |
|---|---|
| Compile-time "tuple lists every member once" helper | None in repo; use key-ordered mapped record plus `Object.hasOwn` guard (the `hydrationDropReasons` idiom). |

## Metadata

**Analog search scope:** `packages/react/{src,test}`, `packages/core/{src,test}`, `spec/`, phase 69 dir, `.changeset/`
**Pattern extraction date:** 2026-11-22
