# Phase 43: One handover module behind the enforcement entry points - Research

**Researched:** 2026-11-15 (branch `arch-wave-10`, HEAD `3ed5c5aa`)
**Domain:** `@qadi/core` enforcement entry points (`packages/core/src/Qadi.ts`), Effect v4.1.2, tstyche type tests, spec/records gates
**Confidence:** HIGH (every line number, type behaviour, span list and gate baseline below was read or run this session on the current tree)

## Summary

Phase 43 is an internal refactor with one Breaking type change. The rule "the resource decided on is the value handed over" is written four ways in `Qadi.ts`, and two of them are a defect: `guard` and the four `filter*` take `EnforceOptions`, so a `resource` option compiles and is silently overwritten. The fix is `HandoverOptions<E, R>` (today's `LoadedEnforceOptions`, renamed) on the eight value-handing entry points, plus a package-private `Handover.ts` that owns "decide against this value, discharge on allow, release whole or projected". `permitted`, `decideOne` and `withLoadedResource` are deleted.

Four findings change how the planner should write the work, and none is in CONTEXT:

1. **The obvious tstyche negative is vacuous for `filter*`.** `expect(filter).type.not.toBeCallableWith(p, items, { resource: x })` PASSES on the base. `@effect/language-service` raises `effect(floatingEffect)` on any Effect- or Stream-returning call, so such a function is "not callable" with any arguments. A RED test must use a different form (section "tstyche"). Verified by running it.
2. **madge counts `import type`.** `Handover.ts` must not import from `Qadi.ts` at all, not even a type. The `ObligationHandler`, `ObligationDischarge` and `EnforceOptions` types therefore move to `Handover.ts` and are re-exported from `Qadi.ts`. Verified by a scratch cycle.
3. **`INV-QD-009` and `INV-QD-013` name `permitted` and `decideOne`** in their Source text (as do ADR-019, ADR-022, ADR-104, ADR-105 and one traceability row). CONTEXT lists only INV-032 and INV-108. INV-013's Source describes "two paths, deliberately independent", which is exactly what this phase deletes.
4. **The existing test `Qadi.test.ts:463` ("the guarded resource overrides one passed in options") will not compile after the change.** It must be rewritten, and a runtime defence pin is worth keeping so that the spread order stays "positional resource last".

**Primary recommendation:** RED first on the base (tstyche refusals in the `Parameters<typeof f>[2]` form, the ten-row characterisation table through the public entry points with core's own `testLayer`, the span-name pin, and a `Qadi.ts` Stryker base). Then add `Handover.ts` as a leaf module, convert one entry point at a time with `pnpm circular` after the first move, then sweep call sites and docs, then the records, then the mutation comparison and `pnpm check:pr < /dev/null`.

## Architectural Responsibility Map

This is a single-package library with no browser/SSR/CDN tiers. The relevant "tiers" are modules.

| Capability | Primary owner | Secondary | Rationale |
|------------|---------------|-----------|-----------|
| Decide against a value, discharge obligations on allow, closed verdict | `Handover.ts` (new, package-private) | `Lifecycle.ts` `ask` (evaluation), `SinkEmit.ts` (records) | One place for the allow/deny branch; `ask` stays the one evaluation entry (ADR-QD-100) |
| Release whole or projected | `Handover.ts` | `Decision.ts` `project` | `project(decision, value)` written once |
| What a refusal means (fail `AccessDenied` vs drop the item) | Adapters in `Qadi.ts` | `Errors.ts` | JA-04: collections partition, effect shapes fail |
| Refusing a second resource | `HandoverOptions` type (compile time) | module spreads positional resource last (runtime defence) | Type is the rule; spread order is the backstop for JS callers and consumers without `exactOptionalPropertyTypes` |
| Public options type and re-exports | `Qadi.ts` re-exporting from `Handover.ts` | `index.ts` barrel (`export * from "./Qadi.ts"`) | Public surface unchanged except the rename (gate 13) |
| Promise facade options | `packages/promise/src/index.ts` | none | Branch-free forwarding (ADR-QD-032); only the option types change |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HAND-01 | One package-private module owns the rule; ten entry points are adapters by shape | Module shape, placement and cycle rule (Q5); two seams needed because `enforceProjected` decides before its value exists (Pitfall 7) |
| HAND-02 | `guard`, `filter`, `filterStream`, `filterProjected`, `filterStreamProjected` refuse `resource`; RED on base | Verified RED/GREEN tstyche forms (Q3); `toBeCallableWith` is vacuous for Effect returns (Pitfall 1) |
| HAND-03 | Allow/deny branch and `project` each written once; runtime test shows released = decided | Module design, characterisation table (Q6), the four `project(` sites at base (Q1) |
| HAND-04 | Behaviour otherwise unchanged (ADR-011, JA-04, array/stream agreement) | Table columns for order, partition, array/stream agreement; span pin (Q4); ordering notes (Q10) |
| HAND-05 | Every call site passing `resource` to `guard`/`filter*` updated | Sweep result: exactly one call site (`Qadi.test.ts:463`); doc sentences listed (Q7) |
| HAND-06 | ADR-QD-156 extends ADR-104; INV-QD-108 restated | Records format (Q8); extra INVs that name `permitted`/`decideOne` |
| WX-01 | `pnpm check:pr < /dev/null` green | Baselines run this session (Validation Architecture) |
| WX-02 | Reserved numbers only; never `next-id.mjs` | All ten reserved ids confirmed free by `git grep` this session (Q8) |
| WX-03 | `spec/overview.md` names added exports, drops removed ones (gate 13) | Rows at `overview.md:166,167,191,605`; gate parses re-exports (Q5) |
| WX-04 | No new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`, ambient clock | Unnamed `Effect.fn` is not `fnUntraced`; `UNTRACED_BUDGET` is a regex on `fnUntraced` (Q4) |
| WX-05 | Coverage holds; Stryker score of touched files does not fall | Stryker procedure, moved-region rule for new `Handover.ts` (Q9) |
| WX-06 | Characterisation/regression tests written on the base | RED vs green-before-and-after split (Q3, Q6) |
| WX-07 | Breaking in the changeset and `upgrading.md` | Changeset and `upgrading.md` formats (Q7, Q8) |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The refusal type and who refuses (accepted 2026-11-15)**
- **D-01: One options type for every entry point that hands over a value.**
  - A new exported `HandoverOptions<E, R>` is `EnforceOptions` with `resource?: never`.
  - It is the options type of all of these: `enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard`, `filter`, `filterStream`, `filterProjected`, `filterStreamProjected`.
  - `LoadedEnforceOptions` is **removed** (Breaking). Its name says "loaded", which is wrong for `guard` and `filter`, and one name keeps the one rule in one place.
  - `spec/overview.md` replaces the `LoadedEnforceOptions` row (gate 13).
- **D-02: `@qadi/promise` refuses the second resource too.**
  - Its `filter` and `filterProjected` forward a `FacadeOptions` that today includes `resource`.
  - They take `Omit<FacadeOptions, "resource">`, as the facade's `projected` already does.
  - This is Breaking for `@qadi/promise`. The facade stays branch-free (ADR-QD-032, AGENTS.md §14).
- **D-03: `enforce` and `assert` keep `options.resource`.**
  - They hand over no value: `enforce` wraps work whose result is not a resource, and ADR-104 already says so.
  - Their docs state the reason. There is no change in behaviour or type.
- **D-04: The RED test is a set of tstyche negatives in `packages/core/test/Qadi.tst.ts`.**
  - `guard` and each of `filter`, `filterStream`, `filterProjected`, `filterStreamProjected` must not be callable with `{ resource }` in their options.
  - They are written and committed on the phase base, where they fail.
  - The existing positives for the three loaded entry points stay.

**The handover module's shape (accepted 2026-11-15)**
- **D-05: Placement.**
  - A new package-private module `packages/core/src/Handover.ts`, kept out of the barrel (ADR-QD-099).
  - `Qadi.ts` keeps only the public entry points, as adapters by shape (effect, array, stream).
  - `discharge` (with its `qadi.discharge` span and its sink records) moves into the module.
  - `ObligationDischarge`, `ObligationHandler` and `EnforceOptions` stay exported from `Qadi.ts`. If a type has to move to break a cycle, re-export it there so the public surface does not change.
- **D-06: What it owns.**
  - One function decides against a given resource (or none, for `assert`/`enforce`/`enforceProjected`), and discharges the obligations on an allow.
  - It returns a closed verdict: `Admitted { decision: Allow }` or `Refused { decision: Deny }`.
  - The adapters choose what a refusal means:
    - the effect shapes fail with `AccessDenied` (the existing construction: `subjectId`, `policyTag`, `reason`, `trace`, in one place);
    - the collection shapes drop the item (JA-04: `filter` partitions, it does not fail).
  - `permitted` and `decideOne` are deleted, so the allow → discharge / deny branch is written once.
- **D-07: The release step.**
  - A closed `Release` choice (`Whole` | `Projected`) is applied in the module, so `project(decision, value)` is written once.
  - At the base, it is applied in `enforceProjected`, `enforceProjectedLoaded`, `filterProjected` and `filterStreamProjected`.
  - `filter` and `filterStream` release `Whole`: BEH-QD-050, where items come back whole, is unchanged.
- **D-08: No new span.**
  - `qadi.evaluate` (root) and `qadi.discharge` stay exactly as they are.
  - The module's functions follow AGENTS.md §5 without adding a named span. Use `Effect.fn` with no name, or a plain function returning an Effect where nothing is yielded.
  - A test pins the span names that one enforcing call emits (allow with obligations, allow without, deny), so the trace shape is unchanged.

**Behaviour pins and records (accepted 2026-11-15)**
- **D-09: Characterisation first, on the base, green before and after.**
  - A table-driven test over all ten entry points uses `qadiTestLayer` plus a recording `DecisionSink`.
  - It pins, for each entry point:
    - the resource the decision record carries (the value handed over, or none for the resource-free ones);
    - the value released (whole or projected);
    - that discharge happens before the guarded work;
    - that a denial hands nothing over;
    - that a binding obligation with no handler fails with `UndischargedObligation` before the handover.
  - For `filter*` it also pins: that it partitions, that the array and stream forms agree on who passes, and that order is kept under `concurrency`.
- **D-10: Runtime "released value is the decided value" (HAND-03).**
  - It is part of D-09's table. For `filter*`, each released item is the item whose decision admitted it, shown with a recording sink and with per-item projection.
- **D-11: Spec.**
  - ADR-QD-156, "A handed-over value is decided through one module", extends ADR-QD-104.
  - INV-QD-108 is restated in place to cover every entry point that hands over a value, naming `Handover.ts` as its source.
  - INV-QD-032's source and implication change from "overrides any `options.resource`" to "a second resource cannot be written; the positional resource is the one evaluated".
  - BEH-QD-551 (`spec/behaviors/07-enforcement.md`) states the `guard`/`filter*` refusal.
  - New INV rows (331..332) only if a statement is not already covered.
  - Traceability, the `spec/README.md` CCR-QD-434 row and `spec/decisions/index.yaml` are updated as in prior phases.
- **D-12: Docs.** Update every place that says `guard` overrides `options.resource`:
  - in `Qadi.ts`, the `guard` doc ("An explicit `options.resource` is overridden rather than merged");
  - on the website: `apps/website/src/content/docs/docs/concepts/enforcement.md`, `concepts/witness-guard.md`, `reference/glossary.md`;
  - `spec/glossary.md`;
  - `spec/overview.md`;
  - `apps/website/src/content/docs/docs/reference/upgrading.md`, which gets entries for `@qadi/core` (the `LoadedEnforceOptions` → `HandoverOptions` rename, and `guard`/`filter*` refusing `resource`) and `@qadi/promise`.
  Both doc-fence gates must stay green.
- **D-13: Changesets.** One per package: `@qadi/core` minor (**Breaking**) and `@qadi/promise` minor (**Breaking**). Nothing is consumed or released.

### Claude's Discretion
- The exact names inside `Handover.ts`: the decide function, the verdict union's constructor names, and the `Release` encoding (a closed string union or a tagged union; it must be closed and exhaustive by construction).
- Whether the collection adapters share one internal per-item helper, as long as the array and stream forms cannot disagree about who passes.
- Plan split. A suggested order:
  1. RED type tests, characterisation tests and the mutation baseline, on the base;
  2. the module, then the adapters;
  3. the call-site, doc and promise sweep;
  4. the records;
  5. the mutation comparison and the merge gate, last.

### Deferred Ideas (OUT OF SCOPE)
None. Discussion stayed within phase scope.
</user_constraints>

## Project Constraints (from CLAUDE.md / AGENTS.md)

Read this session: `CLAUDE.md` (includes `AGENTS.md`). Directives that bind this phase:

- Imports: `effect/*` submodule namespace imports; relative imports carry `.ts`; `import type` for type-only (`verbatimModuleSyntax`).
- Services via `Context.Service`; layers are top-level consts; errors `Data.TaggedError` (the 12 budgeted `Schema.TaggedError` classes stay; **do not change `AccessDenied`'s shape**); array-form `Effect.catchTag`; never `Effect.orDie` on evaluation or enforcement paths.
- Functions: `Effect.fn(...)`; `Effect.fnUntraced` only at the three `Walk.ts` sites (`UNTRACED_BUDGET`, exact count). Dispatch on `_tag` uses `Match`, never `switch` (`SWITCH_BUDGET`, three declared).
- Forbidden: `as` (other than `as const`), `!`, `any`, `async`/`await`, ambient clock/console/`process.env`. The `no-type-assertion` rule also scans test scope.
- Doc-comment shape: one-line summary first, the why (ADR citations, predecessor history) after.
- Barrels: out of the barrel means not importable (ADR-QD-099); the `exports` map is closed.
- Tests: `@effect/vitest`; core held at 95% coverage. Spec is normative: behaviour change means BEH + INV + traceability + README CCR row + ADR + `index.yaml` + `overview.md` + changeset. ` ```typescript ` fences are compiled; ` ```ts ` fences are not.
- Publish with `pnpm`; merge gate is `pnpm check` only; no new releases (memory: only when the user manually asks).
- Memory: closed union over widening; prefer complete over simple; breaking changes are fine; `Record<string, unknown>` is a hack.
- Wave rules (`_SHARED-CONTEXT.md`): zsh `grep` is ugrep (use `/usr/bin/grep` or `bash -c`); negative gates are scoped to added lines; never run a suite that contains another task's intentional RED test; never run `scripts/next-id.mjs`.

## Standard Stack

No package is installed or upgraded. Everything used is already in the workspace.

| Tool | Version | Purpose |
|------|---------|---------|
| `effect` | 4.1.2 [VERIFIED: node_modules/effect/package.json] | `Effect.fn`, `Match`, `Stream.mapEffect`, `Effect.forEach` |
| `vitest` / `@effect/vitest` | 5.1.0 / 4.1.2 [VERIFIED: node_modules package.json] | unit tests, project name `core` and `promise` |
| `tstyche` | 7.2.5, runs TypeScript 6.0.3 [VERIFIED: run output] | type tests; `tstyche.json` = `{ "target": "6.0.3", "tsconfig": "tsconfig.test.json" }` |
| `typescript` (root `tsc`) | 7.0.2 [VERIFIED: node_modules/typescript/package.json] | `pnpm typecheck` |
| `madge` | 8.0.0 [VERIFIED] | `pnpm circular` = `madge --circular --extensions ts,tsx packages/*/src` (`package.json:30`) |
| `@stryker-mutator/core` + `vitest-runner` | 10.1.1 [VERIFIED] | mutation, core config `stryker.config.mjs` |

**Package Legitimacy Audit:** not applicable. No external package is installed or recommended. Packages removed: none. Packages flagged: none.

## Architecture Patterns

### System architecture (data flow through the module)

```
 caller
   │
   ├─ effect shapes ─ assert / enforce / enforceProjected ─┐   decide BEFORE the wrapped effect runs
   │                  guard                                │   (resource: options.resource, none, or positional)
   │                  enforceLoaded / enforceProjectedLoaded   loader runs FIRST, then decide (resource = loaded value)
   │
   ├─ array shapes  ─ filter / filterProjected ── Effect.forEach(items, perItem, { concurrency })
   └─ stream shapes ─ filterStream / filterStreamProjected ── Stream.mapEffect(perItem, { concurrency })
                                   │
                                   ▼
                  Handover.ts  (package-private, leaf: imports nothing from Qadi.ts)
                  ┌──────────────────────────────────────────────────────────┐
                  │ scoped options = { ...options, resource: value }   (only the module spreads) │
                  │ ask(policy, options) ── Lifecycle.ts ── qadi.evaluate span + DecisionRecord │
                  │   ├─ Allow ─► discharge(asked, onObligations)  ── qadi.discharge span       │
                  │   │             ├─ no obligations: return                                   │
                  │   │             ├─ handler: Discharged | HandlerFailed records              │
                  │   │             ├─ advisory only: NotRequired                               │
                  │   │             └─ binding, no handler: Refused record + UndischargedObligation │
                  │   │          ─► Admitted { decision: Allow }  ─► release(Whole | Projected)  │
                  │   └─ Deny  ─► Refused { decision: Deny }                                     │
                  └──────────────────────────────────────────────────────────┘
                                   │
        effect adapters:  Refused ─► fail AccessDenied (built once)   collection adapters: Refused ─► drop item
```

### Recommended structure

```
packages/core/src/
├── Handover.ts        # NEW, package-private, NOT in index.ts. Verdict, Release, discharge, decide, release, options + handler types
├── Qadi.ts            # ten adapters; `export type { … } from "./Handover.ts"` for the moved types
├── Lifecycle.ts       # `ask` (unchanged)
├── SinkEmit.ts        # `sinkEmitter`, `obligationRecordFor` (unchanged, still the only DecisionSink reader)
packages/core/test/
├── Handover.test.ts   # NEW: ten-row characterisation table + span pin, through the public entry points
├── Qadi.test.ts       # one test rewritten (:463), rest untouched
└── Qadi.tst.ts        # rename positives, add the five refusals
packages/promise/test/
└── Facade.tst.ts      # NEW (tstyche): filter / filterProjected refuse `resource`
```

### Pattern 1: the module is a leaf, types move down and are re-exported up

`Handover.ts` declares `ObligationDischarge`, `ObligationHandler`, `EnforceOptions` and `HandoverOptions`; `Qadi.ts` re-exports them with `export type { EnforceOptions, HandoverOptions, ObligationDischarge, ObligationHandler } from "./Handover.ts";`. The root barrel's `export * from "./Qadi.ts"` carries them, so the public surface changes only by the rename. Gate 13 understands this form: `check-api-surface.mjs` `REEXPORT_FROM` is applied to every module it reads, not only barrels [VERIFIED: scripts/check-api-surface.mjs:81, 144-158]. `ObligationDischarge` and `ObligationHandler` are discharge's own types, so moving them keeps their docs ("Constructed only by `discharge`") beside the code. Nothing else in `packages/core/src` imports `Qadi.ts` except `index.ts` [VERIFIED: grep], so no other module is affected.

### Pattern 2: two seams, because the three effect shapes order work and decision differently

[VERIFIED: Qadi.ts:262-267, 289-300, 324-331, 346-355]

| Entry point | Order |
|-------------|-------|
| `assert`, `enforce`, `guard` | decide + discharge, then the wrapped work |
| `enforceProjected` | decide + discharge (no resource), then `self`, then `project(decision, value)` |
| `enforceLoaded`, `enforceProjectedLoaded` | `self` (the loader) first, then decide + discharge against its value, then hand over |
| `filter*` | per item: decide + discharge, then release |

So the module cannot be one function `handOver(policy, value, options, release)` alone: `enforceProjected` has its value only after the decision. Offer (a) a decide function returning the closed verdict, (b) a release function, and (c) their composition for the entry points that already hold the value (loaded, guard, collections). `project` then appears once, inside (b).

### Pattern 3: `Release` encoding that needs no `as` (tested)

`Match.value(release)` over a generic return type fails (`TS2322: Type 'Unify<A | Partial<A>>' is not assignable …`, reproduced). A closed mapped table compiles with no assertion, and a new member is a compile error (the `FieldLattice.ts` precedent, ADR-QD-092):

```ts
export type Release = "Whole" | "Projected";

const RELEASE: {
  readonly [R in Release]: <A extends Resource>(
    decision: Allow,
    value: A,
  ) => R extends "Whole" ? A : Partial<A>;
} = {
  Whole: (_decision, value) => value,
  Projected: (decision, value) => project(decision, value),
};
```

[VERIFIED: compiled under tsc 7.0.2 with `exactOptionalPropertyTypes` in a scratch project.] The caller picks `RELEASE.Whole` or `RELEASE.Projected`, so the result type is inferred per call site and `B` flows through `handOver<A, B>(…, release: (decision: Allow, value: A) => B)`. The exact encoding is the planner's discretion (CONTEXT); this one is the one that compiles clean. `Whole` must return the same reference as `value`: `enforceLoaded` and `filter` return the caller's objects today, so the characterisation table pins `strictEqual`.

### Pattern 4: merge options in the adapter, not in the module's core

`ask` takes `EvaluateOptions`, whose `resource?: Resource` forbids an explicit `undefined` under `exactOptionalPropertyTypes` [VERIFIED: tsconfig.base.json:27; Question.ts:28 `readonly resource?: Resource;`]. A module function taking `resource: Resource | undefined` would need `resource === undefined ? {} : { resource }`, whose `false` mutant is equivalent and survives Stryker (Phase 42 Pitfall 2, same trap). Instead give the module `EnforceOptions` that the adapter has already scoped, and state the merge once in a one-line helper `{ ...options, resource: value }` (today it is written three times: `guard` :416, `decideOne` :440, `withLoadedResource` :129). `assert`/`enforce` pass `options` through unchanged (D-03). The spread order (positional resource last) is the runtime defence for JS callers; keep it.

### Anti-patterns to avoid
- Importing anything from `Qadi.ts` into `Handover.ts`, even `import type` (a cycle for madge).
- A named `Effect.fn("qadi.…")` in the module (a new span), or `Effect.fnUntraced` (a budget change).
- A per-item `Effect.gen`/`Effect.fn` in the collection path. Keep it a plain function returning `Effect.flatMap(...)` as `decideOne` is today (see Pitfall 9).
- Passing `unordered: true` to `Stream.mapEffect`: the default is ordered and must stay [CITED: node_modules/effect/src/Stream.ts:2153-2300].
- Reading `DecisionSink` anywhere but `SinkEmit.ts` (`sink-read-once`): `discharge` keeps calling `sinkEmitter`.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Evaluate + keep the question | a second `questionOf` call | `ask` (`Lifecycle.ts:195`) | the one place a question is built (ADR-QD-100); the handler is told the question the allow answered (ADR-QD-105) |
| Sink emission that cannot deny | a new `serviceOption(DecisionSink)` | `sinkEmitter` (`SinkEmit.ts:49`) | `sink-read-once` gate; INV-QD-035 |
| Obligation record rows | field-by-field `ObligationRecord` | `obligationRecordFor` | single projection of a question into a record |
| Field projection | a second `project` | `project` (`Decision.ts:314`) | INV-QD-108's one projection |
| Span capture in tests | a new tracer | `collectingTracer` in `packages/core/test/helpers.ts:93` | a twin of `@qadi/testing`'s, held equal by the `test-helper-twin` rule |
| A broken port in a test | hand-built failing layer | `scriptedPort` | `PORT_DOUBLE_BUDGET` |
| Closed dispatch | `switch (x._tag)` | `Match.tagsExhaustive` | `SWITCH_BUDGET` |
| Per-item ordering under concurrency | custom queue | `Effect.forEach(..., { concurrency })` and ordered `Stream.mapEffect` | both keep input order |

**Key insight:** the library already has one evaluation entry, one sink reader, one projection and one record builder. This phase moves the allow/deny/discharge/release sequence that sits between them into one module; it adds no new capability.

## Runtime State Inventory

This phase renames one exported type (`LoadedEnforceOptions` → `HandoverOptions`) and removes three module-private names. It is a source-level rename; no runtime state carries these identifiers.

| Category | Items found | Action required |
|----------|-------------|-----------------|
| Stored data | None. Verified: the three names appear only in source, spec prose and generated changelogs; no record, wire format or database stores a type name. Span names (`qadi.evaluate`, `qadi.discharge`) are unchanged and no `_tag` changes. | none |
| Live service config | None. Verified: no external service configuration references `permitted`, `decideOne` or `LoadedEnforceOptions` (repo-wide grep, excluding `node_modules`, `.stryker-tmp`, `lib`). | none |
| OS-registered state | None. No task, plist or unit embeds them. | none |
| Secrets/env vars | None. | none |
| Build artifacts | `packages/core/lib/` (gitignored `tsc -b` output) still carries `Qadi.js` with old names until `pnpm typecheck`/build rebuilds; `.stryker-tmp/` holds full stale copies of `packages/*` and must be excluded from every sweep grep (it is gitignored). `packages/core/CHANGELOG.md:66` quotes `LoadedEnforceOptions` historically and is generated by changesets: do not edit. | exclude `.stryker-tmp` and `CHANGELOG.md` from sweeps; rebuild via `pnpm typecheck` |

## Common Pitfalls

### Pitfall 1: the natural tstyche negative is vacuous for `filter*`
**What goes wrong:** `expect(filter).type.not.toBeCallableWith(p, items, { resource: x })` passes on the base, so the RED test is green and proves nothing.
**Why:** `tsconfig.base.json` loads `@effect/language-service` with `"diagnostics": true` (`:60-64`), which reports `effect(floatingEffect)` ("This Effect value is neither yielded nor used in an assignment") on the bare call tstyche builds. Streams are flagged too ("This Effect-able `Stream<…>` value is neither yielded nor assigned"). So `filter`, `filterStream`, `filterProjected` and `filterStreamProjected` are "not callable" with any arguments, including valid ones. `guard` is unaffected because it returns a function, and so are `enforceLoaded` and the others the file already tests. [VERIFIED: ran it on the base: `filter`, `filterProjected`, `filterStream`, `filterStreamProjected` negatives passed; `expect(filter).type.toBeCallableWith(p, items)` failed.]
**How to avoid:** use the forms in "Code Examples" below, and confirm each is RED on the base before writing the fix.
**Warning signs:** a negative that passes on the base.

### Pitfall 2: the other RED forms break `pnpm typecheck`
`tsconfig.test.json` includes `packages/*/test/**/*.ts`, so `.tst.ts` files are compiled by root `tsc` (7.0.2) as well as by tstyche. `// @ts-expect-error` before the refused call is RED on the base in both (`TS2578: Unused '@ts-expect-error' directive`), and `.type.toRaiseError()` is the reverse: green on the base for `tsc`, then a real compile error after the fix. Both put `pnpm typecheck` RED at the RED commit or after the fix [VERIFIED: ran tsc on scratch files]. The `Parameters<typeof f>[2]` form is RED only in tstyche on the base and neutral for `tsc` both ways, which also obeys the wave rule that no verify runs a suite containing another task's intentional RED.

### Pitfall 3: madge counts `import type`
A scratch pair (`a.ts` has `import type … from "./b.ts"`, `b.ts` imports a value from `a.ts`) fails `madge --circular --extensions ts,tsx src` with "a.ts > b.ts" [VERIFIED]. `pnpm circular` has no config file (no `.madgerc`) [VERIFIED]. Run `pnpm circular` after the first move.

### Pitfall 4: the one existing call site no longer compiles
`packages/core/test/Qadi.test.ts:463-470` passes `{ resource: { ownerId: "someone-else" } }` to `Qadi.guard`:
`const out = yield* Qadi.guard(read, ownedByMe, { resource: { ownerId: "someone-else" }, })({ ownerId: "u1" }, …)`. After the change this is a compile error (`tsc -p tsconfig.test.json`). Replace it with the tstyche negative plus a runtime defence that reaches the module with a `resource` it should lose, without `as` or an `any` token: `const sneaked: Qadi.HandoverOptions = JSON.parse('{"resource":{"ownerId":"someone-else"}}')` (`JSON.parse` returns `any` implicitly, which the `no-type-assertion` regex and oxlint `no-explicit-any` do not match). [ASSUMED: this passes lint; the planner confirms with `pnpm lint`.] It keeps "positional resource last" pinned for runtime callers.

### Pitfall 5: spec prose names the deleted internals
`permitted`/`decideOne`/`withLoadedResource` are named in `spec/invariants.md:294-297` (INV-QD-009 Source), `:383-391` (INV-QD-013 Source, which says the two paths are deliberately independent), `:3344` (INV-QD-108); `spec/decisions/019-obligations.md:234`, `022-subject-set-evaluation.md:142`, `104-…:39`, `105-…:46`; `spec/traceability.md:94` (INV-013 row: "One shared `permitted` path, fronted by `ask`") and `:115` (INV-032 row: "`guard` calls `enforce(policy, { ...options, resource })`"). No gate catches a stale citation (ADR-QD-155's own note), so each is edited by hand. Prior ADRs take a dated `## Amendment` pointing at the new ADR, text otherwise unchanged (ADR-QD-149/155 precedent).

### Pitfall 6: docs claim `guard` is "built on `enforce`"
If `guard` adapts the module directly (the D-06 reading), four statements become false: the `guard` doc in `Qadi.ts` ("Built on `enforce`, not a parallel evaluation path"), `apps/website/…/concepts/witness-guard.md:108`, `apps/website/…/reference/glossary.md:359` and `spec/glossary.md:432`. Reword to "shares `enforce`'s handover module" in the same edit as the type change. If the planner keeps `guard` as `enforce(policy, { ...options, resource })(…)`, the type still changes but those sentences survive; either way D-12 already schedules those files.

### Pitfall 7: promise forces D-02, the compiler does it
`packages/promise/src/index.ts:259-262` does `filter: (subject, policy, items, { signal, ...options } = {}) => run(subject, filterCore(policy, items, options), signal)`. With `FacadeOptions extends EvaluateOptions`, `options` has `resource?: Resource`, which is not assignable to `resource?: never`, so promise stops compiling until `filter` and `filterProjected` take `Omit<FacadeOptions, "resource">` (as `projected` already does, :158). Not optional.

### Pitfall 8: `{ resource: undefined }` is refused only under `exactOptionalPropertyTypes`
It is on in `tsconfig.base.json` and in the chain tstyche uses (`tsconfig.test.json` → `tsconfig.react-base.json` → base) [VERIFIED]. A downstream consumer without that flag can write `{ resource: undefined }` (`never | undefined`); the runtime spread order makes it harmless. State this in BEH-QD-551 and do not claim more.

### Pitfall 9: per-item cost
`decideOne` and `permitted` are plain functions today; `Effect.fn` with no name still calls `new Error()` per call for the stack frame (`internal/effect.ts` `makeFn`: `callError` is built whenever the stack limit is non-zero; only the span is skipped when unnamed) [VERIFIED: node_modules/effect/src/internal/effect.ts:1332-1405]. `discharge` already opens a `qadi.discharge` span on every allow, including allows with no obligations (measured, below). Keep the per-item path a plain function; use an unnamed `Effect.fn` only where a generator is needed. `Evaluate.bench.ts` has `filter — 500 items` (:346) and the concurrency compare (:434); run `pnpm bench` on those before and after as a guard, not a gate (AGENTS.md §5/§5a require a benchmark only for the budgeted exceptions, but `filter` is the hot path).

### Pitfall 10: a stale Stryker report on disk
`reports/mutation/mutation.json` (Nov 14 19:41) holds 5 files, none of them `Qadi.ts` [VERIFIED]. Phase 42's writer refuses a report older than any source or test file. Run the base before any edit.

## Code Examples

### Q3 tstyche refusals (each verified RED on the base, GREEN on the candidate)

```ts
// packages/core/test/Qadi.tst.ts  (add `Resource` type import; rename LoadedEnforceOptions -> HandoverOptions)
type SecondResource = { readonly resource: Resource };

test("guard refuses a second resource", () => {
  // curried, returns a function, so toBeCallableWith is a real check here
  expect(guard).type.not.toBeCallableWith(read, hasPermission(read), { resource: { id: "x" } });
  expect<Parameters<typeof guard>[2]>().type.not.toBeAssignableFrom<SecondResource>();
});

test("the collection entry points refuse a second resource", () => {
  // `toBeCallableWith` is vacuous for these (effect(floatingEffect)); test the options parameter instead.
  expect<Parameters<typeof filter>[2]>().type.not.toBeAssignableFrom<SecondResource>();
  expect<Parameters<typeof filterStream>[2]>().type.not.toBeAssignableFrom<SecondResource>();
  expect<Parameters<typeof filterProjected>[2]>().type.not.toBeAssignableFrom<SecondResource>();
  expect<Parameters<typeof filterStreamProjected>[2]>().type.not.toBeAssignableFrom<SecondResource>();
  // exactOptionalPropertyTypes: an explicit undefined is refused too
  expect<Parameters<typeof filter>[2]>().type.not.toBeAssignableFrom<{ readonly resource: undefined }>();
  // controls, so the refusal cannot pass by refusing everything
  expect<Parameters<typeof filter>[2]>().type.toBeAssignableFrom<{ readonly action: string }>();
  expect<Parameters<typeof filter>[2]>().type.toBeAssignableFrom<{ readonly concurrency: number }>();
  expect<Parameters<typeof filter>[2]>().type.toBeAssignableFrom<undefined>();
});
```

`Parameters<typeof filter>[2]` erases the generics to `EnforceOptions<unknown, unknown> | undefined` on the base (the failing message quoted that type). Also verified GREEN: with `HandoverOptions` in the five signatures, `E`/`R` still infer through the `Omit<…> & { resource?: never }` intersection (`filter(p, items, { onObligations: () => Effect.fail(new OErr()) })` gives `… | OErr`; `filterStream` with `{ concurrency: 2, onObligations }` and `guard(read, p, { onObligations })(x, …)` likewise), and `toRaiseError(2322)` pins the diagnostic for `filter`.

Promise (`packages/promise/test/Facade.tst.ts`, new): the facade returns a `Promise`, so the callable form works and is RED on the base [VERIFIED]:

```ts
declare const qadi: Qadi; declare const alice: AuthSubject;
expect(qadi.filter).type.not.toBeCallableWith(alice, p, [{ id: "a" }], { resource: { id: "x" } });
expect(qadi.filterProjected).type.not.toBeCallableWith(alice, p, [{ id: "a" }], { resource: { id: "x" } });
expect(qadi.filter).type.toBeCallableWith(alice, p, [{ id: "a" }], { concurrency: 2 });
```

### Q4 span pin (measured on the base this session)

One enforcing call, `testLayer` + `collectingTracer`, `hasPermission` policy, span names in order:

| Case | Spans |
|------|-------|
| allow, no obligations (`enforce`, `filter`) | `["qadi.evaluate","qadi.discharge"]` |
| allow, obligation + handler | `["qadi.evaluate","qadi.discharge"]` |
| allow, binding obligation, no handler | `["qadi.evaluate","qadi.discharge"]` |
| deny (`enforce`, `filter`) | `["qadi.evaluate"]` |

The `qadi.discharge` span exists for every allow because `discharge` is a named `Effect.fn("qadi.discharge")` called unconditionally; its early `return` for zero obligations is inside the span [VERIFIED: Qadi.ts:131-139, :205]. No test or spec mentions `qadi.discharge` today (grep over `spec`, `packages/*/src`, `packages/*/test`, `features`, `apps/website/src`: only `Qadi.ts`), so the pin is new. Reuse the pattern of `Evaluate.test.ts:2430-2450`: `const spans: Array<Tracer.Span> = []`, provide `collectingTracer(spans)` merged with `testLayer(...)`, assert `spans.map((s) => s.name)`.

### Q6 table shape for the characterisation test (`Handover.test.ts`, through `Qadi.*` only)

Core cannot import `@qadi/testing` (it depends on core; `helpers.ts` says so at :16-21). Use `testLayer(subject)` from `packages/core/test/helpers.ts:36` and a recording sink as `Qadi.test.ts:294-298` and `:1024-1029` already do:

```ts
const sink = Layer.succeed(DecisionSink, { record: (r) => Effect.sync(() => void rows.push(r)) });
```

The ten enforcing entry points are `assert`, `enforce`, `enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard`, `filter`, `filterStream`, `filterProjected`, `filterStreamProjected` (the module header at `Qadi.ts:11-16` lists exactly these; `decide` and `check` report and run nothing). Eight hand over a value (D-01); `assert` and `enforce` keep `options.resource`.

| Entry point | Invoke | `Decision` record `.resource` | Released | Event order (W = wrapped work / loader / handler, O = `onObligations`) |
|-------------|--------|------------------------------|----------|-----------------------------------------------------------------------|
| `assert` | `assert(p, { resource: doc, onObligations })` | `doc` (`strictEqual`) | void | O |
| `enforce` | `work.pipe(enforce(p, { resource: doc, onObligations }))` | `doc` | work's value | O, W |
| `enforceProjected` | `work.pipe(enforceProjected(p, { onObligations }))` | absent (no key) | `project(decision, workValue)` (fresh object) | O, W |
| `enforceLoaded` | `load.pipe(enforceLoaded(p, { onObligations }))` | the loaded value | the loaded reference (`strictEqual`) | W, O |
| `enforceProjectedLoaded` | same | the loaded value | projected copy of it | W, O |
| `guard` | `guard(read, p, { onObligations })(doc, handler)` | `doc` | handler's value | O, W |
| `filter` | `filter(p, items, { onObligations })` | each item, in evaluation order | admitted items, same references, input order | O per admitted item, then results |
| `filterStream` | `Stream.runCollect(filterStream(p, Stream.fromIterable(items), …))` | same | same | same |
| `filterProjected` | as `filter` | same | `project(itsOwnDecision, item)` per admitted item | same |
| `filterStreamProjected` | as `filterStream` | same | same as `filterProjected` | same |

Columns, each written to be green on the base and after:
1. **Resource carried:** `rows.find(r => r._tag === "Decision")?.resource` (record field at `SinkEmit.ts:82`: `...(question.resource === undefined ? {} : { resource: question.resource })`; assert the key is absent with `Object.hasOwn` for the resource-free row).
2. **Released value:** `strictEqual` for `Whole`, `deepStrictEqual` plus `notStrictEqual` for `Projected`, and a field the policy withholds (`secret`) absent.
3. **Order:** push `"W"` in the work and `"O"` in the handler into one array, compare to the table. Do not pin when `guard` constructs `handler(...)` (BS-05 says it is eager).
4. **Denial:** nothing released, no `"O"`, and for the work-wrapping shapes no `"W"` (except the loaded pair, whose loader ran first by design, ADR-QD-104).
5. **Binding obligation, no handler:** `UndischargedObligation` and no value, with an `Obligations` row whose `outcome` is `"Refused"` (`SinkEmit.ts` `obligationRecordFor`).
6. **Collections:** a mixed batch (mine, theirs, mine) with `hasResourceAttribute("ownerId", eq(subjectId()))`: partition (denied items dropped, no failure), array and stream agree on the admitted ids, order kept with `concurrency: "unbounded"` (compare released ids to input order; compare recorded resources as a set, since record order is not defined under concurrency). Per item: the released projection came from the decision whose record carries that item.

The existing `describe("a handler is handed the question its allow answered")` (`Qadi.test.ts:1014-1161`) already runs the ten shapes for the question-and-allow facts; the new table extends it with release, order and refusal and does not repeat the question equality.

### Handover.ts sketch (shape, not verified code)

```ts
// packages/core/src/Handover.ts (package-private; never imports ./Qadi.ts)
export interface Admitted { readonly _tag: "Admitted"; readonly decision: Allow }
export interface Refused  { readonly _tag: "Refused";  readonly decision: Deny }
export type Verdict = Admitted | Refused;

// the one allow -> discharge / deny branch
export const verdictOf = <E, R>(policy: Policy, options: EnforceOptions<E, R> | undefined) =>
  Effect.flatMap(ask(policy, options), ({ question, decision }): Effect.Effect<Verdict, UndischargedObligation | E, R> =>
    isAllowed(decision)
      ? Effect.as(discharge({ question, decision }, options?.onObligations), { _tag: "Admitted", decision })
      : Effect.succeed({ _tag: "Refused", decision }));
```

Keep `discharge` as the same `Effect.fn("qadi.discharge")(function* <E, R>(…)` body, moved unchanged (D-05; its `Effect.fn.Return` annotation and comments included). Keep `AccessDenied` built in exactly one helper (`subjectId`, `policyTag: policy._tag`, `reason`, `trace`) used by the six effect shapes.

### Mutation record shape (Q9)

```json
{ "measured": { "packages/core/src/Qadi.ts": 0.0 },
  "unmeasured": {}, "new": [], "deleted": {},
  "moved": { "packages/core/src/Handover.ts": {
      "from": ["packages/core/src/Qadi.ts"],
      "region": { "detected": 0, "scored": 0, "score": 0 },
      "survivors": [ { "from": "…", "line": 0, "column": 0, "mutatorName": "…", "replacement": "…", "original": "…" } ] } } }
```

## Q1 findings: the current bodies and line numbers

All numbers re-verified against `packages/core/src/Qadi.ts` (605 lines) on this tree; every line number in `_WAVE10-CONTEXT.md` and `43-CONTEXT.md` still holds, with one nuance: `withLoadedResource` is declared at :126 and its spread body is :129.

| Name | Line | Notes |
|------|------|-------|
| `ObligationDischarge` / `ObligationHandler` / `EnforceOptions` | :64 / :94 / :98 | `EnforceOptions<E, R> extends EvaluateOptions { readonly onObligations?: ObligationHandler<E, R> }` |
| `LoadedEnforceOptions` | :113-118 | `Omit<EnforceOptions<E, R>, "resource"> & { readonly resource?: never; }` |
| `withLoadedResource` | :126-129 | `({ ...options, resource })` |
| `discharge` | :131 | `Effect.fn("qadi.discharge")(function* <E, R>(asked, handler)` |
| `permitted` | :197-214 | below |
| `guard` | :406 (spread :416) | `enforce(policy, { ...options, resource })(handler(Brand.nominal<Authorized<P>>()({ permission }), resource))` |
| `FilterVerdict` | :420-422 | `{ item, allowed: false } \| { item, allowed: true, decision: Allow }` |
| `decideOne` | :430-449 (spread :440) | below |
| `filter` / `filterStream` / `filterProjected` / `filterStreamProjected` | :483 / :527 / :555 / :585 | |
| `project(` call sites | :299, :353, :571, :604 | four, as CONTEXT says |
| `permitted(` call sites | :249, :267, :298, :330, :352 | `assert`, `enforce`, `enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded` |
| `decideOne(` call sites | :493, :537, :565, :601 | |

`permitted` (:197-214), verbatim:

```ts
const permitted = <E = never, R = never>(
  policy: Policy,
  options?: EnforceOptions<E, R>,
): Effect.Effect<Allow, EnforcementError | E, EvaluationServices | R> =>
  Effect.flatMap(
    ask(policy, options),
    ({ question, decision }): Effect.Effect<Allow, EnforcementError | E, R> =>
      isAllowed(decision)
        ? Effect.as(discharge({ question, decision }, options?.onObligations), decision)
        : Effect.fail(
            new AccessDenied({
              subjectId: decision.subjectId,
              policyTag: policy._tag,
              reason: decision.reason,
              trace: decision.trace,
            }),
          ),
  );
```

`decideOne` (:430-449), verbatim body:

```ts
  Effect.flatMap(
    ask(policy, { ...options, resource: item }),
    ({ question, decision }): Effect.Effect<FilterVerdict<A>, UndischargedObligation | EO, RO> =>
      isAllowed(decision)
        ? Effect.as(discharge({ question, decision }, options?.onObligations), {
            item,
            allowed: true,
            decision,
          })
        : Effect.succeed({ item, allowed: false }),
  );
```

The four collection bodies, verbatim (the only differences are the traversal and the release):

```ts
// filter :493 and filterProjected :565
Effect.forEach(items, (item) => decideOne(policy, item, options), { concurrency: options?.concurrency })
//   filter keeps `result.item`; filterProjected keeps `project(result.decision, result.item)` (:571)
// filterStream :537 and filterStreamProjected :601
items.pipe(Stream.mapEffect((item) => decideOne(policy, item, options), { concurrency: options?.concurrency }),
  Stream.filter((r) => r.allowed), Stream.map((r) => r.item))                       // filterStream
  Stream.filterMap((r) => (r.allowed ? Result.succeed(project(r.decision, r.item)) : Result.failVoid))  // filterStreamProjected :604
```

## Q2 findings: type mechanics of `HandoverOptions<E, R>`

- **Definition today** [VERIFIED: Qadi.ts:113-118]: `Omit<EnforceOptions<E, R>, "resource"> & { readonly resource?: never; }`. D-01's `HandoverOptions` is this, renamed. An `interface … extends Omit<…>` form would also work; keep the intersection so the existing positives carry over unchanged.
- **`exactOptionalPropertyTypes` is on** [VERIFIED: tsconfig.base.json:27, inherited by `tsconfig.react-base.json:11` and so by `tsconfig.test.json`, and by `packages/core/tsconfig.src.json` via the base]. So `{ resource: undefined }` is refused as well (verified: `expect<Parameters<typeof filter>[2]>().type.not.toBeAssignableFrom<{ readonly resource: undefined }>()` passes on the candidate).
- **Where the fields come from** [VERIFIED]: `resource` is `QuestionOptions.resource?: Resource` (`Question.ts:28`); `concurrency` is `EvaluateOptions.concurrency?: Concurrency` (`Question.ts:66`), not `EnforceOptions`; `EnforceOptions` adds only `onObligations`. `Omit` keeps `action`, `concurrency`, `evaluationId`, `onObligations` and the rest.
- **Inference** [VERIFIED by a scratch tstyche run with the real `EnforceOptions`]: `guard`'s `EO`/`RO`, `filter`'s and `filterStream`'s `EO`/`RO`/`E2`/`R2` infer through `options?: HandoverOptions<EO, RO>` exactly as through `EnforceOptions<EO, RO>`: a handler that fails with `OErr` and needs `OReq` yields `… | OErr` and `… | OReq`; a concurrency-only options object infers `never`. The existing `enforce*` tests already rely on the same shape.

## Q4 findings: `Effect.fn` without a name

- **Exists, opens no span** [VERIFIED: node_modules/effect/src/internal/effect.ts:1332-1358]: `nameFirst = typeof arguments[0] === "string"`; an unnamed call gets `addSpan = false`, so `useSpan` is skipped (:1403-1407) while a call-frame is still recorded. Type: `Effect.fn: fn.Traced & { (name: string, options?): fn.Traced }` (`Effect.ts:24225`).
- **Precedent in this repo**: `packages/audit/src/SignatureLedger.ts:160`, `ArchiveFacts.ts:186` and `packages/devtools/src/model/SupersedingRun.ts:76` use `Effect.fn(function* …)` with no name.
- **Gate impact: none.** `UNTRACED_BUDGET` is `{ "packages/core/src/Walk.ts": 3 }` and `UNTRACED_CALL = /\bEffect\.fnUntraced\s*\(/` (`check-house-style.mjs:464-470`); there is no rule about `Effect.fn` names. `UNTRACED_BUDGET_NAMES` lists `evaluateAllOf`, `evaluateAnyOf`, `evaluateRules`. The budget must not move.
- **Span capture helper**: `collectingTracer(spans)` at `packages/core/test/helpers.ts:93` (twin of `packages/testing/src/CollectingTracer.ts`, equality enforced by the `test-helper-twin` rule). `Evaluate.test.ts:2430-2450` shows the usage.

## Q5 findings: cycles and placement

- `pnpm circular` is `madge --circular --extensions ts,tsx packages/*/src`; no config; **type-only imports count** (reproduced). Baseline: `✔ No circular dependency found!`, 222 files, 3.9 s.
- Nothing in `packages/core/src` imports `Qadi.ts` except `index.ts` [VERIFIED]. `Handover.ts` would import `Lifecycle.ts`, `Decision.ts`, `Errors.ts`, `Obligation.ts`, `Question.ts`, `SinkEmit.ts`, `Policy.ts`, `Resource.ts`, `EvaluationServices.ts`, none of which imports `Qadi.ts`. The cycle risk exists only if `Handover.ts` references a type still declared in `Qadi.ts`, hence Pattern 1.
- **Keeping modules out of the barrel**: no module is "registered" as private; privacy is the closed `exports` map (gate 13 `ENTRY`) plus gate 14's packed-artifact check (`check-package-install.mjs`, check 3b), and not adding the file to `index.ts` [VERIFIED: `packages/core/package.json` `exports` has only `"."`; `index.ts` lists modules alphabetically with `export *`]. Existing private modules: `PortDerivation.ts` (its header says "Package-private (ADR-QD-099): not exported from the barrel or any entry point"), `SinkEmit.ts`, `Walk.ts`. Add the same header line to `Handover.ts`. `barrel-order` only constrains what is in the barrel.
- Gate 13 baseline: `api-surface: 927 export(s) documented across 9 package(s)`. After the change the count is unchanged if `HandoverOptions` replaces `LoadedEnforceOptions` one for one.

## Q7 findings: the sweep (HAND-05, D-12)

**Call sites passing `resource` to `guard`/`filter*`.** A parenthesis-balanced scan of every `.ts/.tsx/.md/.mdx/.mjs/.feature` file (excluding `node_modules`, `.stryker-tmp`, `lib`, `coverage`, `.next`, `reports`, `.planning`, `.scratch`) found exactly one: `packages/core/test/Qadi.test.ts:463`. No call in `packages/http`, `react`, `devtools`, `testing`, `audit`, `predicate-*`, `promise`, `examples/*`, `features/step-definitions`, `spec/` fences or `apps/website` fences passes it. The calls that exist pass only `onObligations` or nothing: `packages/http/src/AuthorizeRequest.ts:151` (`guard(permission, policy)(resource, …)`), `examples/http-advanced/server.ts:203`, `features/step-definitions/SignatureLoopSteps.ts:53,63`, `packages/audit/test/SignatureLoop.test.ts:83,125,160,201`. `@qadi/http` is the only package using core's `guard`. Typecheck is the oracle for calls through a variable.

**`LoadedEnforceOptions`** (every hit, excluding generated `CHANGELOG.md` and build output):
- `packages/core/src/Qadi.ts:113,127,290,325,347`
- `packages/core/test/Qadi.tst.ts:31` (import) and `:100` (`declare const loadedOptions`)
- `spec/overview.md:167` (row), `spec/invariants.md:3344`, `spec/models/07-field-level.md:174,176`, `spec/decisions/104-…:41`, `spec/traceability.md:134`, `spec/behaviors/07-enforcement.md:118,147,313,319,326`
- Not in `apps/website`, `AGENTS.md`, `CONTRIBUTING.md`, `examples`, `features`, `packages/promise`, `http`, `react`, `devtools`, `testing`.

**Doc sentences about override/merge/refusal:**
- `Qadi.ts:379` "An explicit `options.resource` is overridden rather than merged." (guard doc; also :373-381 and the "Built on `enforce`" paragraph at :363-365)
- `apps/website/…/concepts/enforcement.md:74` ("`enforceProjected` refuses `options.resource`") and `:168` ("a guarded resource can never be overridden by `EnforceOptions`")
- `apps/website/…/concepts/witness-guard.md:108`; `…/reference/glossary.md:359`; `spec/glossary.md:432` (both "Built on `enforce`")
- `spec/overview.md:166` (the one-channel reads row), `:167`, `:191` (`EnforceOptions`/`ObligationHandler`/`ObligationDischarge` row says `Qadi.ts`: moved types are still exported from there, so it stays true), `:605` ("`Qadi.filterProjected` are the one-channel reads … there is no `options.resource`"; `filter` joins them)
- `spec/behaviors/07-enforcement.md` BEH-QD-050 (signatures :44-86 use `EnforceOptions`), BEH-QD-055 (:266-305 "A `resource` supplied in `options` MUST NOT override it"), BEH-QD-324 (:307+)
- `spec/behaviors/11-obligations.md:142` declares `EnforceOptions` (still correct)
- `spec/models/07-field-level.md:174,176,311`; `spec/decisions/035-witness-guard-primitive.md:53` (guard signature with `EnforceOptions`)
- `packages/promise/README.md:55-60` and `packages/promise/src/index.ts:154-157` (the `projected` doc) and `:131-139`, `:171-177` (the `filter`/`filterProjected` docs)
- INV-QD-032 Source/Implication (:1280-1305), INV-QD-108 (:3340-3356), INV-QD-009, INV-QD-013

**Outside `Qadi.ts`, `permitted`/`decideOne`/`withLoadedResource`:** only the spec prose in Pitfall 5, plus the `.scratch/` notes and `.planning/` files (not records).

**Promise** [VERIFIED]: `packages/promise/src/index.ts` `filter` (:88-93) and `filterProjected` (:124-129) take `options?: FacadeOptions`; `projected` (:158-163) takes `Omit<FacadeOptions, "resource">`. `packages/promise/test/facade.test.ts` is the only test file (25 tests, no `.tst.ts`); its `filter` options calls pass only `signal` or `concurrency` (:194, :231, :383, :429, :468, :482). The `check` call at :488-491 passes `resource` to `check`, which keeps `FacadeOptions`.

**Doc-fence gates** [VERIFIED baseline]: `pnpm spec:examples` (`scripts/check-doc-examples.mjs`): "114 block(s) compile", 3.9 s. `pnpm spec:website-examples` (`scripts/check-website-doc-examples.mjs`): "59 block(s) compile", 3.4 s. Both are steps of `pnpm check`. The `upgrading.md` "After" snippets are ` ```typescript ` (compiled); "Before" snippets are ` ```ts ` (not compiled).

**`upgrading.md` format** [VERIFIED: apps/website/src/content/docs/docs/reference/upgrading.md]: `## 0.13: <sentence-case title>` sections (last one `## 0.13: onMalformed receives core's DecodeRefusal`, :619), a prose paragraph, `Before:` in a ` ```ts ` fence, `After:` in a ` ```typescript ` fence, a closing line linking the ADR on GitHub (`https://github.com/leaderiop/qadi/blob/main/spec/decisions/NNN-….md`). Add one `## 0.13:` section for core (the rename and the refusal) and one for promise. Packages are at 0.12.0 [VERIFIED: package.json]; pending changesets already target the 0.13 line.

## Q8 findings: the records

- **ADR** [VERIFIED: spec/decisions/155-…, index.yaml:469-472]: file `NNN-slug.md`, title `# ADR-QD-156 — <title>`, a `Document Control` table (Document ID `QADI-ADR-156`, Revision `1.0`, Status `Accepted — extends ADR-QD-104`, Change History `1.0 (date): Initial (ARCH-90, CCR-QD-434)`), then `## Context`, `## Decision`, `## Alternatives considered`, `## Consequences`, `## Related`. Registry entry in `spec/decisions/index.yaml`: `- id: "ADR-QD-156"`, `file: "156-a-handed-over-value-is-decided-through-one-module.md"`, `title: …`, `status: "Accepted — extends ADR-QD-104"`. Gate 10 requires the Document ID to equal the file number. Earlier ADRs get a dated `## Amendment (2026-11-15, ADR-QD-156, CCR-QD-434)` and a Revision bump (ADR-QD-149 Rev 1.1 is the model); candidates: 104 (its "Every one routes through `permitted`" and `LoadedEnforceOptions` text), 105 (:46), 019 (:234), 022 (:142).
- **CCR row** [VERIFIED: spec/README.md:370]: `| CCR-QD-434 | 2026-11-15 | <every file with its new revision> | ARCH-90. **<bold title>.** <what and why> |`, appended after CCR-QD-433, plus a Change History line in README's Document Control and a Revision bump (1.182 → 1.183). Name unused reservations in the row ("Unused: …").
- **Traceability** [VERIFIED: spec/traceability.md]: rows to change: `:94` INV-013, `:115` INV-032, `:134` INV-108, the ADR table (add an `ADR-QD-156` row like `:314`'s ADR-155 row, and add "amended by ADR-QD-156" to the ADR-104 row), `:49` the 07 doc row (add BEH-QD-551), `:395` promise `facade.test.ts` row, `:521` `Qadi.test.ts` row, `:528` `Qadi.tst.ts` row, and new rows for `Handover.test.ts` and `Facade.tst.ts`. Bump its Revision (1.177 → 1.178). `pnpm spec:verify:strict` (21 checks) is the gate.
- **BEH** [VERIFIED: 07-enforcement.md]: entries are `## BEH-QD-NNN: Title`, then `> **Invariant:** …` / `> **See:** …`, a ` ```ts ` signature fence, and a `REQUIREMENT:` block; they are not in numeric order in the file (BEH-QD-324 sits after 055). `behaviors/index.yaml` lists files only. **Existing coverage**: BEH-QD-050 (the surface and per-item sharing), BEH-QD-055 (guard: "a `resource` supplied in `options` MUST NOT override it"), BEH-QD-324 (loaded entry points and `enforceProjected` refuse it). So BEH-QD-551 is one new statement, "the eight value-handing entry points take `HandoverOptions` and refuse `resource`; `enforce` and `assert` keep it, and why", and it amends 055's requirement from "MUST NOT override" to "refused", and updates the signature listings in 050, 324 and `models/07-field-level.md`. `@qadi/promise`'s refusal (`filter`, `filterProjected`) belongs in `spec/behaviors/22-promise-facade.md` (BEH-QD-552 if it earns a number, else a sentence under BEH-QD-169). BEH-QD-553..555 look unused: say "Unused" in the CCR row. Bump `07-enforcement.md` Rev 1.12 → 1.13.
- **INV** [VERIFIED: invariants.md]: restate in place INV-QD-032 (Source: `guard` is an adapter over `Handover.ts`; a second resource cannot be written; the positional resource is the one evaluated), INV-QD-108 (Source names `Handover.ts`, covers all eight value-handing entry points, `LoadedEnforceOptions` → `HandoverOptions`), INV-QD-013 (Source: one module implements ask → refuse → discharge for all ten; delete the "two paths, deliberately independent" paragraph) and INV-QD-009 (Source: `enforce` adapts the module). **One genuinely uncovered statement**: no invariant says the array and stream forms of a collection entry point admit the same items in the same order (only BEH-QD-050 prose and tests do). Recommend INV-QD-331 for that ("An item's fate is decided once, so every collection form agrees on who passes"), and leave INV-QD-332 unused unless review finds another; do not add one that restates 032/108. [ASSUMED: this is a judgement, flag to the user.] Format: `## INV-QD-NNN: title`, one-sentence statement, `**Source**:`, `**Implication**:`, `**Enforcement**:`, `**Related**:`, `---` (appended after INV-QD-325, the last, at ~:3803). Bump `invariants.md` Rev 1.122 → 1.123.
- **Overview** (`spec/overview.md`, Rev 1.105 → 1.106 with a Change History line): replace the `LoadedEnforceOptions` row (:167) with `HandoverOptions`; update :166, :605; keep :191.
- **Changesets** [VERIFIED: .changeset/*.md]: front matter `"@qadi/core": minor`, then prose starting `**Breaking.**` and naming the rename and the refusal (precedent: `devtools-malformed-frame-is-a-decode-refusal.md`, which ends "See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`"). Two files: one for `@qadi/core`, one for `@qadi/promise`. Do not touch `CHANGELOG.md`.
- **Reserved numbers confirmed free** this session by `git grep -lE -- '<id>([^0-9]|$)' -- spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples scripts`: ARCH-90, ADR-QD-156, CCR-QD-434, BEH-QD-551..555, INV-QD-331..332 all returned nothing and no `spec/decisions/156-*` file exists. The reservation file reads CCR 443, ADR 165, BEH 600, INV 350. `scripts/next-id.mjs` was not run.

## Q9 findings: mutation (WX-05)

- **How Phase 42 did it** [VERIFIED: 42-01-PLAN.md:176-185, 42-05-PLAN.md]: the first plan commit is `chore(42-01): mutation baseline …`, adding only `42-mutation-base.json`, measured on the untouched base by one Stryker run with the exact invocation the close repeats. Invocation form: `pnpm exec stryker run <config> --mutate '<comma list>'`, run in the background (ADR-QD-098), one at a time. A node writer reads the config's `jsonReporter.fileName`, refuses a stale report (older than the newest file in the touched dirs), refuses a report that mutated files not named on `--mutate`, and writes the JSON. The comparer at close requires each `measured` file at or above its base (unrounded), judges a **moved** file by its survivors, and the base JSON is "written once, never edited".
- **Phase 43's command**: `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Qadi.ts'` at the base, and `--mutate 'packages/core/src/Qadi.ts,packages/core/src/Handover.ts'` at the close (the nonexistent file only warns, as `SeededQuestion.ts` did). `stryker.config.mjs` has `mutate: ["packages/core/src/**/*.ts", "!packages/core/src/index.ts"]`, `thresholds: { high: 90, low: 80, break: 80 }`, `timeoutMS: 20000`, JSON at `reports/mutation/mutation.json` (gitignored), `coverageAnalysis: "perTest"`, `ignoreStatic: true`. An exit 1 after a "below breaking threshold" line with the report written is not a failed baseline.
- **JSON shape** (the Stryker report, `files[path].mutants[]`: `status` (`Killed`/`Timeout`/`Survived`/`NoCoverage`/`Ignored`), `mutatorName`, `replacement`, `location.start/end`, plus `files[path].source`). Score = (Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage). Record file shape in "Code Examples".
- **New file rule**: `Handover.ts` has no base score. Phase 42's rule for `SeededQuestion.ts` was `moved`: record, at the base, the line ranges of the code that moves (here: `discharge` :131-:195, `permitted` :197-:214, `decideOne` :430-:449 and the four `project(` sites), the region's detected/scored/score, and its survivors (by mutator and original text); at the close every survivor in `Handover.ts` must be one of those, matched by mutator and original text, and `Qadi.ts` must be at or above its base. Phase 41's comparer failed any `new` file below 1, so do not record `Handover.ts` as `new`.
- **Expect the Phase 42 Pitfall 2 effect.** Deleting `permitted`/`decideOne` removes well-tested indirection, so `Qadi.ts`'s ratio can fall even with equal tests. The closing move is one small test per survivor, never a re-baseline. The `resource === undefined ? {} : { resource }` equivalent mutant is avoided by Pattern 4.
- **Duration.** Not recorded for `Qadi.ts`. Recorded core runs: `Explanation.ts`+`ValueText.ts` took 15-17 s (`41-01-SUMMARY.md:46`, `41-06-SUMMARY.md:57`), the react 3-file run 45-53 s. `Qadi.ts` is 605 lines and is covered by the 71-test `Qadi.test.ts` and many others, so expect minutes, not hours. [ASSUMED] Run it in the background and wait for the completion notice. The hours-long job is the whole `pnpm mutation`, which this phase does not need.
- **Promise and http are not part of core's Stryker run.** `@qadi/promise` has no Stryker config (ADR-QD-032 header in `stryker.config.mjs`), so only `Qadi.ts`/`Handover.ts` are compared. Coverage still holds `packages/promise` at 90% and core at 95%.

## Q10 findings: risks

- **`@qadi/http`, `react`, `testing`, `devtools`, examples**: none breaks. `@qadi/http` calls `guard(permission, policy)(resource, …)` with no options (`AuthorizeRequest.ts:151`). `@qadi/react` does not call core's `guard`/`filter`. `LoadedEnforceOptions` is not referenced outside core. Compile-check `examples/http-advanced`, `features/step-definitions` and the audit tests with `pnpm typecheck`; `pnpm example` (Next.js example check) is in `pnpm check`.
- **Ordering and concurrency**: `Effect.forEach(items, f, { concurrency })` and `Stream.mapEffect(f, { concurrency })` both return results in input order by default; keep `concurrency: options?.concurrency` on both (undefined means sequential) and do not add `unordered`. The same `options.concurrency` reaches `ask` (`{ ...options, resource: item }`), so it also bounds each item's composite fan-out ("double duty", documented on `filter`): the scoped options must still carry `concurrency`, which is why the module takes `EnforceOptions` and not a stripped record. Merging the array and stream forms onto one per-item helper is safe because they already share `decideOne`; only the release moves earlier (per item rather than in the collecting pass), which is unobservable because `project` is pure and the item is the caller's own reference.
- **Discharge window (DS-01)** unchanged: one item's `EvaluationError` fails the whole `filter` after earlier items' obligations were discharged. Keep that doc.
- **Spans and metrics pinned by existing tests**: `Evaluate.test.ts:2434-2600` pins `qadi.evaluate` attributes and the decision/duration metrics (`EvaluationMetrics.test.ts`); nothing pins `qadi.discharge`. The `Obligations` record outcomes are pinned by `DecisionSink.test.ts` (`:658-740`, which uses `enforce` with `EnforceOptions`, so it keeps compiling because `enforce` keeps `resource`).
- **`guard` handler construction is eager** (BS-05): `handler(witness, resource)` is built before the decision runs, which is why only its returned Effect is guarded. Do not move that call.
- **`AccessDenied`** stays built from `subjectId`, `policyTag: policy._tag`, `reason`, `trace`, in one place; its `Schema.TaggedError` shape and the `SCHEMA_ERROR_BUDGET` table are untouched.

## State of the Art

| Old | Current | When | Impact |
|-----|---------|------|--------|
| Resource override by `{ ...options, resource }` in `guard` and `decideOne` (INV-QD-032) | refusal by type (`HandoverOptions`) with the spread kept as backstop | this phase | a silent drop becomes a compile error |
| Two paths: `permitted` and `decideOne` (INV-QD-013's "two paths") | one module | this phase | INV-013's Source text goes stale and is restated |
| `LoadedEnforceOptions` named for three entry points | `HandoverOptions` for eight | this phase | Breaking rename, gate-13 row replaced |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A scoped Stryker run on `Qadi.ts` takes minutes, not hours (extrapolated from 15-17 s for two small core files) | Q9 | the plan may need a longer wait; no design change |
| A2 | `JSON.parse` into a typed `HandoverOptions` variable passes `no-type-assertion` and oxlint `no-explicit-any` | Pitfall 4 | the runtime defence test needs another untyped route, or is dropped in favour of the type-only guarantee |
| A3 | INV-QD-331 ("an item's fate is decided once; array and stream agree on who passes") is the one new invariant worth adding; INV-QD-332 is unused | Q8 | CONTEXT says "only if not covered"; the user may prefer none, or a second one |
| A4 | The `Handover.ts` sketch compiles as written (types from `Decision.ts`: `Allow`, `Deny`, `isAllowed`) | Code Examples | trivial type fixes at implementation; the `RELEASE` table and the tstyche forms are verified, the sketch is not |
| A5 | The module adds no measurable cost to `filter` if the per-item path stays a plain function | Pitfall 9 | `pnpm bench` before/after is recommended to confirm |

## Open Questions

1. **Does `guard` adapt the module directly, or stay `enforce(policy, { ...options, resource })(…)`?**
   - Known: D-06 says all ten entry points are adapters; both options satisfy HAND-02 because only `guard`'s public options type changes.
   - Unclear: the "Built on `enforce`" sentences (Pitfall 6) are true only in the second.
   - Recommendation: adapt the module directly (the allow/deny branch then appears once with no detour through `enforce`'s `EnforceOptions`) and reword the four sentences.
2. **Does D-09's "`qadiTestLayer`" mean `@qadi/testing`'s layer?**
   - Known: core's tests cannot import `@qadi/testing` (dependency cycle; `helpers.ts:16-21`).
   - Recommendation: use core's `testLayer(subject)`, which is built from the same `evaluationEnvironment`. If the user wants `qadiTestLayer` itself, the table would live in `@qadi/testing`'s tests or in `features/`, which would test past core's interface.
3. **Where does the runtime defence for the spread order live?** Recommended: one test in `Handover.test.ts` (Pitfall 4). Without it the order is guarded only by the type.

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | yes | v26.13.0 | none needed |
| pnpm | scripts | yes | 10.17.1 | none needed |
| vitest + `@effect/vitest` | tests | yes | 5.1.0 / 4.1.2 | none needed |
| tstyche (TS 6.0.3) | HAND-02 | yes | 7.2.5 | none needed |
| root `tsc` | typecheck | yes | 7.0.2 | none needed |
| madge | `pnpm circular` | yes | 8.0.0 | none needed |
| Stryker + vitest-runner | WX-05 | yes | 10.1.1 | run scoped, in the background |

No missing dependency. Not used and not needed: network services, databases, Docker.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest` 4.1.2 (projects `core`, `promise`); tstyche 7.2.5 for `*.tst.ts` |
| Config file | root `vitest.config.ts` (`projects: ["packages/*"]`, coverage thresholds core 95 / others 90); `packages/core/vitest.config.ts` (`name: "core"`, `include: ["test/**/*.test.ts"]`); `tstyche.json`; `stryker.config.mjs` |
| Quick run command | `pnpm exec vitest run --project core packages/core/test/Qadi.test.ts packages/core/test/Handover.test.ts` (Qadi.test.ts alone: 71 tests, 1.3 s) |
| Type-test command | `pnpm exec tstyche packages/core/test/Qadi.tst.ts` (2.5 s); `pnpm exec tstyche packages/promise/test/Facade.tst.ts`; all: `pnpm test:tstyche` (52 files, 271 tests, 546 assertions, 7.9 s) |
| Full suite command | `pnpm exec vitest run --project core` (68 files, 2287 tests, ~10 s); `pnpm exec vitest run --project promise` (25 tests) |
| Phase gate | `pnpm check:pr < /dev/null` (`scripts/run-check.mjs --skip-mutation`: reads `check`, drops only `pnpm mutation`); fast loop `pnpm check:fast` |

Baselines run on the base this session, all green: core 2287/2287, promise 25/25, tstyche 546 assertions, `pnpm circular` clean (222 files), `pnpm lint` ("house-style: 505 file(s) clean (3 declared switch(es))"), `pnpm spec:api` (927 exports), `pnpm spec:verify:strict` (21 pass), `pnpm spec:examples` (114 blocks), `pnpm spec:website-examples` (59 blocks), `tsc -p tsconfig.test.json` clean (2.7 s).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HAND-02 | five refusals, RED on base, GREEN after | tstyche | `pnpm exec tstyche packages/core/test/Qadi.tst.ts` (non-zero on the base with "assignable from type 'Second'" messages; zero after) | extend Qadi.tst.ts (Wave 0) |
| HAND-02 | promise `filter`/`filterProjected` refuse | tstyche | `pnpm exec tstyche packages/promise/test/Facade.tst.ts` | new (Wave 0) |
| HAND-02 | runtime: positional resource wins over a smuggled one | unit | `pnpm exec vitest run --project core packages/core/test/Handover.test.ts -t "positional resource"` | new (Wave 0) |
| HAND-03 | released value is the decided value, all ten, per item for `filter*` | unit (table) | `pnpm exec vitest run --project core packages/core/test/Handover.test.ts` | new (Wave 0) |
| HAND-04 | order (discharge before work), partition, array = stream, order under concurrency, denial hands nothing over, `UndischargedObligation` before handover | unit (table) | same file | new (Wave 0) |
| HAND-04 | span names unchanged (allow, allow with obligations, deny) | unit | `pnpm exec vitest run --project core packages/core/test/Handover.test.ts -t "spans"` | new (Wave 0) |
| HAND-01 | module is a leaf; `permitted`/`decideOne` gone; allow/deny branch and `project` each appear once | cycle + scoped grep | `pnpm circular`; `git diff <base> -U0 -- packages/core/src \| /usr/bin/grep '^+' \| /usr/bin/grep -cE 'isAllowed\(\|project\('` per the scoped-diff rule; `/usr/bin/grep -c "decideOne\|permitted" packages/core/src/Qadi.ts` = 0 | after the module |
| HAND-05 | no `guard`/`filter*` call passes `resource` | typecheck + both fence gates | `pnpm exec tsc -p tsconfig.test.json && pnpm spec:examples && pnpm spec:website-examples` | exists |
| HAND-06 | ADR-156, INV restatements, traceability | spec gates | `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims`; `bash -c "git grep -nE 'LoadedEnforceOptions\|permitted\|decideOne' -- spec apps/website/src AGENTS.md CONTRIBUTING.md"` shows only change-history text | after records |
| WX-01 | gate | full | `pnpm check:pr < /dev/null` | exists |
| WX-02 | reserved numbers only | `git grep` | `bash -c "git grep -lE -- 'ADR-QD-156\|CCR-QD-434\|BEH-QD-55[1-5]\|INV-QD-33[12]' -- spec packages .changeset"` lists only this phase's files; `next-id.mjs` never run | exists |
| WX-03 | overview names `HandoverOptions`, drops `LoadedEnforceOptions` | gate 13 | `pnpm spec:api` | exists |
| WX-04 | nothing forbidden added; budgets unchanged | lint + scoped grep | `pnpm lint`; `git diff <base> -U0 -- packages \| /usr/bin/grep '^+' \| /usr/bin/grep -nE '\bas [A-Za-z({\[]\|: any\|switch \(\|fnUntraced'` empty (comments excluded by reading); `git diff <base> -- scripts/check-house-style.mjs AGENTS.md` empty | exists |
| WX-05 | coverage and per-file Stryker | coverage + mutation | `pnpm coverage` (core >= 95); `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Qadi.ts,packages/core/src/Handover.ts'` then the comparer against `43-mutation-base.json` | base in Wave 0 |
| WX-06 | tests precede the change | git order | the RED tstyche, table, span and base-Stryker commits precede the first `packages/core/src` edit (`git log --format=%H -- packages/core/src` has no earlier commit) | Wave 0 |
| WX-07 | Breaking changesets + `upgrading.md` | file + gate | `.changeset/*.md` with `"@qadi/core": minor` and `"@qadi/promise": minor` each starting `**Breaking.**`; `pnpm website` and `pnpm spec:website-examples` | new |

Per-task verifies must exclude the intentionally RED tstyche file until the fixing task (run `pnpm exec tstyche <that file>` only there). `pnpm typecheck` is unaffected by the RED commit with the `Parameters` form (Pitfall 2).

### Sampling Rate
- **Per task commit:** the quick vitest run above, `pnpm exec tsc -p tsconfig.test.json`, and `pnpm circular` (all under 10 s combined).
- **Per wave merge:** `pnpm exec vitest run --project core`, `pnpm exec vitest run --project promise`, `pnpm lint`, `pnpm test:tstyche` (except the RED file before its fix).
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the Stryker comparer exit 0. `pnpm spec:website-examples` is already inside `check`; the roadmap asks to run it explicitly as well.

### Wave 0 Gaps
- [ ] `packages/core/test/Qadi.tst.ts`: the five refusals (RED on the base), `LoadedEnforceOptions` rename of the existing positives, `Resource` type import.
- [ ] `packages/promise/test/Facade.tst.ts`: new, the promise refusals (RED).
- [ ] `packages/core/test/Handover.test.ts`: new, the ten-row table (green before and after), the positional-resource defence, the span pin.
- [ ] `43-mutation-base.json`: base Stryker for `Qadi.ts` with `Handover.ts` recorded as `moved`, committed alone as the first plan commit, written by a retargeted copy of the 42-01 writer.
- [ ] Rewrite `Qadi.test.ts:463` in the plan that makes `guard` refuse (same commit as the type change, never before).

## Security Domain

`security_enforcement` is enabled (`.planning/config.json`, ASVS level 1, block on high).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | none (the subject is supplied by the caller's environment) |
| V3 Session Management | no | none |
| V4 Access Control | **yes** | the library's own invariants: fail closed; the decided value is the handed-over value (INV-QD-108, INV-QD-032); a denial hands nothing over; a binding obligation is discharged before handover (INV-QD-013) |
| V5 Input Validation | no change | no untrusted decode is added or moved (`UNTRUSTED_DECODE_BUDGET` untouched) |
| V6 Cryptography | no | none |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Second channel for the resource: the decision taken on one value, a different one handed over (confused deputy) | Tampering / Elevation of Privilege | type refusal (`resource?: never`) plus the positional resource spread last; characterisation table pins decided = released |
| A silently dropped `resource` option makes a caller believe a policy was evaluated against their value | Tampering | the compile error this phase adds |
| Allow carrying an undischarged binding obligation proceeds | Elevation of Privilege | `discharge` moves unchanged; table row "binding obligation, no handler fails before handover" |
| An observer (sink) fails and changes a decision | Denial of Service | `sinkEmitter` stays the single reader and `catchCause`s every sink failure (INV-QD-035); never `Effect.orDie` |
| `AccessDenied` trace reaches a client | Information Disclosure | unchanged: the `AccessDenied`/`AccessDeniedPublic` split at the `@qadi/http` boundary; this phase does not change `AccessDenied`'s shape |
| A refusal turned into a defect | Denial of Service | adapters keep `Effect.fail(AccessDenied)`, no `orDie` |

## Sources

### Primary (HIGH confidence, read or run this session)
- `packages/core/src/Qadi.ts` (whole), `Lifecycle.ts:195`, `SinkEmit.ts`, `Question.ts:26-66`, `Decision.ts:158-170,275,314`, `Errors.ts:399-480`
- `packages/core/test/Qadi.test.ts`, `Qadi.tst.ts` (whole), `DecisionSink.test.ts:650-740`, `Evaluate.test.ts:2430-2450`, `helpers.ts`
- `packages/promise/src/index.ts`, `packages/promise/test/facade.test.ts`, `packages/promise/README.md`
- `scripts/check-house-style.mjs` (budgets, rules), `scripts/check-api-surface.mjs`, `scripts/run-check.mjs`, `tstyche.json`, `tsconfig.base.json`, `tsconfig.test.json`, `stryker.config.mjs`
- `node_modules/effect/src/internal/effect.ts:1332-1405` (`Effect.fn`), `node_modules/effect/src/Stream.ts:2153-2300` (`mapEffect`)
- Phase 42 records: `42-RESEARCH.md`, `42-01-PLAN.md`, `42-05-PLAN.md`, `42-mutation-base.json`, `42-mutation-after.json`; Phase 41 summaries for Stryker timings
- `spec/` records: ADR-QD-104, ADR-QD-155, `decisions/index.yaml`, INV-QD-009/013/032/108, BEH-QD-050/055/324, `traceability.md`, `README.md` CCR-QD-433, `overview.md`; `.changeset/*.md`; `upgrading.md`
- Scratch experiments (in the session scratchpad): tstyche RED/GREEN forms, madge cycle, `RELEASE` table, span recorder, `Match` generic failure

### Secondary / Tertiary
- none (no web or Context7 lookup was needed: every question was about this repo's own code and the installed `effect`/tstyche)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (nothing installed; versions read from `node_modules`)
- Architecture: HIGH for placement, cycle rule, release encoding and the two seams (reproduced); MEDIUM for the `Handover.ts` sketch (not compiled)
- Pitfalls: HIGH (1-4, 7, 8, 10 reproduced by running; 5, 6 by grep)

**Research date:** 2026-11-15
**Valid until:** the phase base moves (re-verify line numbers if `Qadi.ts` is touched before planning); otherwise 30 days
