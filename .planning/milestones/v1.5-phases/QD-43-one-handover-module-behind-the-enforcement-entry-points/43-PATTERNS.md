# Phase 43: One handover module behind the enforcement entry points - Pattern Map

**Mapped:** 2026-11-15
**Files analyzed:** 14 (groups)
**Analogs found:** 13 / 14 (every analog path below was checked tracked in git)

Line numbers refer to the phase base (HEAD `8421797f`). Re-check them if `Qadi.ts` moves.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/core/src/Handover.ts` (new, package-private) | service-like module (leaf) | request-response, per-item batch | `packages/core/src/PortDerivation.ts` (privacy header); `Qadi.ts:131-214, 430-449` (code that moves) | role-match |
| `packages/core/src/Qadi.ts` | adapters | request-response, batch, streaming | itself (`:406-418`, `:420-449`) | exact |
| `packages/core/test/Handover.test.ts` (new) | test | table-driven characterisation | `Qadi.test.ts:286-300, 1014-1161`; `Evaluate.test.ts:2430-2450` | exact |
| `packages/core/test/Qadi.test.ts` (edit `:463`) | test | request-response | itself | exact |
| `packages/core/test/Qadi.tst.ts` | type test | compile-time | itself (`:19-35, :100`) | exact |
| `packages/promise/test/Facade.tst.ts` (new) | type test | compile-time | `Qadi.tst.ts` (header and imports) | role-match |
| `packages/promise/src/index.ts` | facade | request-response | `projected` at `:158-163` (`Omit<FacadeOptions,"resource">`) | exact |
| `43-mutation-base.json` | record | batch | `.planning/milestones/v1.4-phases/QD-42-*/42-mutation-base.json` and the writer in `42-01-PLAN.md` Task 1 step 4 | exact |
| spec: ADR-156, `index.yaml`, `README.md` CCR-434, traceability, `07-enforcement.md` BEH-551, invariants, overview | docs | n/a | ADR-155 and the CCR-433 row; 42-04-PLAN (records task) | exact |
| `.changeset/*.md` x2, `upgrading.md` | docs | n/a | `.changeset/devtools-malformed-frame-is-a-decode-refusal.md`; `upgrading.md` `## 0.13:` sections | exact |
| website and glossary docs (D-12) | docs | n/a | existing sentences listed in RESEARCH Q7 | exact |

## Pattern Assignments

### `packages/core/src/Handover.ts` (new, leaf module)

**Analog for privacy header:** `packages/core/src/PortDerivation.ts:1-20`. End the module header with the same line:
```ts
 * Package-private (ADR-QD-099): not exported from the barrel or any entry point.
```
Do not add it to `index.ts`.

**Cycle rule (RESEARCH Pitfall 3):** madge counts `import type`. `Handover.ts` must not import `./Qadi.ts` at all. Move `ObligationDischarge`, `ObligationHandler`, `EnforceOptions` (`Qadi.ts:64, 94, 98`) and the renamed `HandoverOptions` (`Qadi.ts:113-118`) into `Handover.ts`. Re-export them from `Qadi.ts`.

**Options type, renamed** (`Qadi.ts:113-118`):
```ts
export type HandoverOptions<E = never, R = never> = Omit<EnforceOptions<E, R>, "resource"> & {
  readonly resource?: never;
};
```

**Discharge, moved unchanged** (`Qadi.ts:131-177`). Keep it a named `Effect.fn("qadi.discharge")(function* <E, R>(asked, handler): Effect.fn.Return<void, UndischargedObligation | E, R> {…})`, with its comments, and still reading `sinkEmitter`:
```ts
const discharge = Effect.fn("qadi.discharge")(function* <E, R>(
  asked: ObligationDischarge,
  handler: ObligationHandler<E, R> | undefined,
): Effect.fn.Return<void, UndischargedObligation | E, R> {
  const { decision, question } = asked;
  if (decision.obligations.length === 0) return;
  const emit = yield* sinkEmitter;
  const at = yield* Clock.currentTimeMillis;
  const record = obligationRecordFor(question, decision, at);
  …
```
Keep the DS-01 "not transactional" doc (`Qadi.ts:185-195`) on the verdict function. Reword its `decideOne` reference.

**Allow/deny branch to collapse** (from `permitted` `Qadi.ts:201-214` and `decideOne` `:439-449`). Write it once:
```ts
Effect.flatMap(ask(policy, options), ({ question, decision }) =>
  isAllowed(decision)
    ? Effect.as(discharge({ question, decision }, options?.onObligations), { _tag: "Admitted", decision })
    : Effect.succeed({ _tag: "Refused", decision }));
```
Keep the per-item path a plain function returning `Effect.flatMap`, as `decideOne` is today (RESEARCH Pitfall 9). No named span (D-08). A generator, if one is needed, uses an unnamed `Effect.fn(function* …)`, as `packages/audit/src/SignatureLedger.ts:160` does. Never `Effect.fnUntraced` (`UNTRACED_BUDGET`).

**Release encoding** (RESEARCH Pattern 3, compiled clean). A closed mapped table, with no `switch`, no `Match.value`, no `as`:
```ts
export type Release = "Whole" | "Projected";
const RELEASE: {
  readonly [R in Release]: <A extends Resource>(decision: Allow, value: A) => R extends "Whole" ? A : Partial<A>;
} = { Whole: (_d, value) => value, Projected: (decision, value) => project(decision, value) };
```
`Whole` returns the same reference as `value`. This is the only `project(` call in the package after the move.

**Scoped options:** one helper `{ ...options, resource: value }`, with the positional resource last. This replaces the three spreads at `Qadi.ts:129, 416, 440`. Do not write `resource === undefined ? {} : { resource }` (equivalent survivor mutant, Phase 42 Pitfall 2).

**Two seams (RESEARCH Pattern 2):** `enforceProjected` decides before its value exists. Offer (a) the verdict function, (b) the release function, (c) their composition for the entry points that hold the value.

### `packages/core/src/Qadi.ts` (adapters)

**Re-export for an unchanged public surface:**
```ts
export type { EnforceOptions, HandoverOptions, ObligationDischarge, ObligationHandler } from "./Handover.ts";
```

**`guard` today** (`:406-418`). Change `options?: EnforceOptions<EO, RO>` to `HandoverOptions<EO, RO>`. Keep `handler(...)` constructed eagerly (BS-05). Reword the "Built on `enforce`" doc and the "overridden rather than merged" doc at `:363-381`:
```ts
    enforce(policy, { ...options, resource })(
      handler(Brand.nominal<Authorized<P>>()({ permission }), resource),
    );
```

**Collections today** (`:493, :537, :565, :601`). Keep `{ concurrency: options?.concurrency }`. Add no `unordered`:
```ts
Effect.forEach(items, (item) => decideOne(policy, item, options), { concurrency: options?.concurrency })
items.pipe(Stream.mapEffect((item) => decideOne(policy, item, options), { concurrency: options?.concurrency }), …)
```
All four (`filter`, `filterStream`, `filterProjected`, `filterStreamProjected`) switch to `HandoverOptions`.

**One `AccessDenied` construction** (from `permitted`, `:206-212`). Build it in one helper used by the six effect shapes. Do not change its shape (`Schema.TaggedError`, budgeted):
```ts
new AccessDenied({ subjectId: decision.subjectId, policyTag: policy._tag, reason: decision.reason, trace: decision.trace })
```

**Deletions:** `permitted`, `decideOne`, `withLoadedResource`, `FilterVerdict`, `LoadedEnforceOptions`. `enforce` and `assert` keep `EnforceOptions` (D-03), and their docs state why. `enforceLoaded` and `enforceProjectedLoaded` change `LoadedEnforceOptions` to `HandoverOptions` at `:290, :325, :347`.

### `packages/core/test/Handover.test.ts` (new)

**Analog:** `Qadi.test.ts:286-300` (recording sink) and the describe at `:1014-1161`.

Recording sink (RESEARCH Q6):
```ts
const sink = Layer.succeed(DecisionSink, { record: (r) => Effect.sync(() => void rows.push(r)) });
```
Use core's `testLayer(subject)` from `packages/core/test/helpers.ts:36`, not `@qadi/testing` (a dependency cycle; `helpers.ts:16-21`).

Span pin, copied from `Evaluate.test.ts:2430-2450`:
```ts
const spans: Array<Tracer.Span> = [];
yield* … .pipe(Effect.provide(Layer.mergeAll(testLayer(subjectWith({ … })), collectingTracer(spans))));
assert.deepStrictEqual(spans.map((s) => s.name), ["qadi.evaluate", "qadi.discharge"]); // deny: ["qadi.evaluate"]
```
`collectingTracer` is at `helpers.ts:93`.

Table columns and ten rows: RESEARCH "Q6 table shape". Include a "positional resource" defence test. A smuggled `resource` comes in through `JSON.parse` into a typed `HandoverOptions` variable (no `as`, no `any` token; confirm `pnpm lint`). This replaces the test at `Qadi.test.ts:463`.

### `packages/core/test/Qadi.tst.ts` (edit)

**Imports to change** (`:29-35`): `LoadedEnforceOptions` becomes `HandoverOptions`. Add `import type { Resource }`, and import `filter`, `filterStream`, `filterStreamProjected`. Rename `declare const loadedOptions` at `:100`.

**RED forms.** The naive `not.toBeCallableWith` is vacuous for Effect- and Stream-returning functions, because `effect(floatingEffect)` makes them "not callable" with any arguments (RESEARCH Pitfall 1). Use this form, which is RED on the base and neutral for root `tsc`:
```ts
type SecondResource = { readonly resource: Resource };
expect(guard).type.not.toBeCallableWith(read, hasPermission(read), { resource: { id: "x" } }); // guard returns a function, so this one is real
expect<Parameters<typeof filter>[2]>().type.not.toBeAssignableFrom<SecondResource>();
expect<Parameters<typeof filter>[2]>().type.not.toBeAssignableFrom<{ readonly resource: undefined }>();
expect<Parameters<typeof filter>[2]>().type.toBeAssignableFrom<{ readonly concurrency: number }>(); // control
```
Do not use `// @ts-expect-error` or `.toRaiseError()`: they break `pnpm typecheck` on one side of the fix (Pitfall 2).

### `packages/promise/test/Facade.tst.ts` (new)

**Analog:** the header and imports of `Qadi.tst.ts:19-35`. The facade returns a `Promise`, so the callable form is a real check:
```ts
declare const qadi: Qadi; declare const alice: AuthSubject;
expect(qadi.filter).type.not.toBeCallableWith(alice, p, [{ id: "a" }], { resource: { id: "x" } });
expect(qadi.filterProjected).type.not.toBeCallableWith(alice, p, [{ id: "a" }], { resource: { id: "x" } });
expect(qadi.filter).type.toBeCallableWith(alice, p, [{ id: "a" }], { concurrency: 2 });
```

### `packages/promise/src/index.ts`

**Analog:** `projected` (`:158-163`) takes `Omit<FacadeOptions, "resource">`. Apply the same to `filter` (`:88-93`) and `filterProjected` (`:124-129`). Update their docs (`:131-139`, `:171-177`). The facade stays branch-free: `filter: (subject, policy, items, { signal, ...options } = {}) => run(subject, filterCore(policy, items, options), signal)` (about `:259`). The compiler forces this change (RESEARCH Pitfall 7). `check` keeps `FacadeOptions`. Also update `packages/promise/README.md:55-60`.

### `43-mutation-base.json`

**Analog:** `.planning/milestones/v1.4-phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-mutation-base.json`. Its writer is `42-01-PLAN.md` Task 1 step 4, retargeted:
- config `stryker.config.mjs`, report `reports/mutation/mutation.json`, file `packages/core/src/Qadi.ts`;
- `MOVE` ranges for `Qadi.ts`: `discharge` 131-195, `permitted` 197-214, `decideOne` 430-449, and the four `project(` sites (299, 353, 571, 604);
- command: `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Qadi.ts'`, in the background (ADR-QD-098);
- drop the "survivor count must be 5" check, since the count is unknown;
- the writer refuses a stale report, because `reports/mutation/mutation.json` is stale at the base (Pitfall 10);
- the JSON shape is `measured`, `unmeasured`, `new`, `deleted`, `moved`, with `Handover.ts` under `moved` (never `new`). Written once, committed alone as the first plan commit (`chore(43-01): mutation baseline …`), with `phase_base` recorded in `43-01-SUMMARY.md` front matter.

At the close, run `--mutate 'packages/core/src/Qadi.ts,packages/core/src/Handover.ts'`. `Qadi.ts` must be at or above its base, and every `Handover.ts` survivor must match a base survivor by mutator and original text. A new survivor gets one small test, never a re-baseline.

### Spec records

**Analog:** the ADR-155 file, its `index.yaml` entry and the CCR-QD-433 row at `spec/README.md:370`, as Phase 42 did them (`42-04-PLAN.md`).

| Item | Pattern |
|---|---|
| ADR-QD-156 | `spec/decisions/156-a-handed-over-value-is-decided-through-one-module.md`. `# ADR-QD-156 — …`, Document Control (`QADI-ADR-156`, Rev 1.0, `Accepted — extends ADR-QD-104`), then Context, Decision, Alternatives considered, Consequences, Related. |
| `index.yaml` | `- id: "ADR-QD-156"` with `file`, `title`, `status`. |
| Amendments | A dated `## Amendment (2026-11-15, ADR-QD-156, CCR-QD-434)` plus a Revision bump on ADR-104, 105, 019 and 022 (stale `permitted`/`decideOne` text). |
| README | A CCR-QD-434 row after 433, a Change History line and a Revision bump. Name unused reservations (BEH-552..555, INV-332 unless used). |
| Traceability | Rows `:94` (INV-013), `:115` (INV-032), `:134` (INV-108), the ADR table, the `07` doc row, and new rows for `Handover.test.ts` and `Facade.tst.ts`. Then `pnpm spec:verify:strict`. |
| BEH-QD-551 | In `spec/behaviors/07-enforcement.md`, under `## BEH-QD-NNN: Title`, with `> **Invariant:**` and a ` ```ts ` signature fence. It amends BEH-050, 055 and 324. State that `{ resource: undefined }` is refused only under `exactOptionalPropertyTypes` (Pitfall 8). |
| INV | Restate 009, 013, 032 and 108 in place (RESEARCH Pitfall 5, Q8). INV-QD-331 ("an item's fate is decided once; array and stream forms agree on who passes") is the one new candidate and is flagged as a judgement. |
| Overview | Replace the `LoadedEnforceOptions` row at `overview.md:167`. Update `:166` and `:605`. Keep `:191`. Then `pnpm spec:api`. |

### Changesets and `upgrading.md`

**Analog:** `.changeset/devtools-malformed-frame-is-a-decode-refusal.md`. Front matter is `"@qadi/core": minor`, then prose starting `**Breaking.**`, ending with a pointer to the 0.13 section of the upgrade guide. Write two files (core, promise). Do not touch `CHANGELOG.md`. `upgrading.md` gets `## 0.13: <title>` sections with Before in a ` ```ts ` fence and After in a ` ```typescript ` fence (compiled), closing with the ADR link.

## Shared Patterns

### House rules for every new line (AGENTS.md)
- `import * as X from "effect/X"`, relative `.ts` extensions, `import type` for types.
- No `as`, `!`, `any` or `switch`. No `Effect.fnUntraced` (`UNTRACED_BUDGET` stays `{ Walk.ts: 3 }`). No `orDie` on enforcement paths.
- Doc comments lead with a one-line summary, with the why after it.
- The sink is read only by `sinkEmitter` (`SinkEmit.ts`, the `sink-read-once` rule).

### Order and concurrency
**Source:** `Qadi.ts:493-601`. Forward `concurrency: options?.concurrency` to `forEach`/`mapEffect` and keep the scoped options carrying `concurrency` into `ask`, so it keeps its double duty.

### Tracked-source check
All analog paths here are tracked sources (`git ls-files` confirmed for `Qadi.tst.ts`, `helpers.ts`, `promise/src/index.ts`, `PortDerivation.ts`, `SeededQuestion.ts`). No gitignored mirror paths are used.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `Handover.ts`'s closed `Verdict` (`Admitted`/`Refused`) and `Release` table | module | n/a | No existing verdict union for enforcement. Use the `FieldLattice.ts` closed-table precedent (ADR-QD-092) and RESEARCH Pattern 3. |

## Metadata

**Analog search scope:** `packages/core/{src,test}`, `packages/promise`, `packages/react/src`, `.planning/milestones/v1.4-phases/QD-42-*`.
**Files scanned:** about 12. The line numbers and verified experiments come from 43-RESEARCH.md, which was run against the same tree.
**Pattern extraction date:** 2026-11-15
