---
id: ARCH-05
title: Deepen hydration into one module, with an honest seed type and one decision wire schema
strength: Worth exploring
status: implemented
evidence_verified_at: 1caf04c
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-002            # schema and type are one definition at an untrusted input (read as constraint)
  - ADR-QD-003            # `_tag` is every union's discriminant (read as constraint)
  - ADR-QD-014            # as reversed in CCR-QD-150 (read as constraint)
  - ADR-QD-017            # `currentDecision` is the single read point (read as constraint)
  - ADR-QD-028            # amend: rejected alternative "decisions are not a wire format" is overtaken; payload gains a version
  - ADR-QD-037            # madge circular gate, type-only imports included (read as constraint)
  - ADR-QD-039            # amend: seed location and the HydrationSeed.ts lookup
  - ADR-QD-041            # amend: mismatch payload type; the "AllOf stand-in" sentence is wrong
  - ADR-QD-052            # amend: drop-reason set changes (counters stay declared in core)
  - ADR-QD-060            # read as constraint: SinkRecordWire wire contract
packages:
  - "@qadi/core"
  - "@qadi/react"
  - "@qadi/devtools"
  - "examples/nextjs-newsroom (@qadi/example-nextjs)"
  - "features (@qadi/features)"
  - "apps/website (docs only)"
estimate: XL   # ~7.5 engineer-days with every recommendation taken; M (~2 days) on the minimal path (D-05-a=A, D-05-b=a, D-05-c=a, D-05-d=a, D-05-e=a)
---

# ARCH-05 — Deepen hydration into one module, with an honest seed type and one decision wire schema

## 1. Verified evidence (at `1caf04c`)

Every claim was re-checked against `git rev-parse --short HEAD` = `1caf04c`
(branch `ci/stryker-ignore-static`). Two throwaway probes were run from the
session scratchpad (never the repo) with
`NODE_OPTIONS="--conditions=bun" node_modules/.bin/tsx <probe>.mts`, so
`@qadi/core` resolves to `src/` rather than a possibly stale `lib/`. The
baseline test run below was green before any change:

```
node_modules/.bin/vitest run packages/react/test/Hydration.test.ts \
  packages/react/test/QadiAtoms.test.ts packages/react/test/HydrationCounts.test.ts \
  packages/react/test/QadiProvider.test.tsx packages/core/test/SinkCodec.test.ts \
  packages/core/test/HydrationMetrics.test.ts packages/devtools/test/model/Hydration.test.ts
# Test Files 7 passed (7) — Tests 181 passed (181)
```

`pnpm circular` (madge) is green at HEAD: "No circular dependency found" across
134 files.

### C1 — Hydration is one concept spread across about seven modules — **CONFIRMED**

| Piece | Where (at `1caf04c`) |
| ----- | -------------------- |
| Payload codec: `DehydratedEntryFields`, `DehydratedEntry`, `reducedTrace`, `dehydrateDecisions`, `rebuild`, `hydrateDecisions` | `packages/react/src/Hydration.ts:87-97`, `:124-135`, `:164-171`, `:205-252`, `:278-303`, `:346-454` |
| Seed lookup, a module `WeakMap<object, HydrationSeedLookup>` | `packages/react/src/HydrationSeed.ts:24-41` |
| Seed/recheck/announce logic (`SeededDecision`, `seededDecision`, `AnnounceState`) | `packages/react/src/QadiAtoms.ts:273-276`, `:372-523` |
| Registration of the seed lookup | `packages/react/src/QadiAtoms.ts:629-631` |
| `isMismatch`, `isDevelopment`, three reporters, the drop-reason `Match` | `packages/react/src/HydrationWarning.ts:42-43`, `:56-57`, `:87-90`, `:119-122`, `:153-191`, `:218-221` |
| Write half of the counters (`Context.empty()` confinement) | `packages/react/src/HydrationCounts.ts:45-81` |
| Counter declarations and the closed drop-reason union | `packages/core/src/HydrationMetrics.ts:46-158` |
| Devtools reader of the counters | `packages/devtools/src/model/Hydration.ts:96-121` |
| A second Decision wire codec | `packages/core/src/SinkCodec.ts:97-106`, `:143-178` |

One dehydrate/hydrate/recheck round trip touches `Hydration.ts` →
`HydrationSeed.ts` → `QadiAtoms.ts` (`seededDecision`) →
`HydrationWarning.ts` (`isMismatch`, reporter) → `HydrationCounts.ts` →
`@qadi/core` `HydrationMetrics.ts` → `@qadi/devtools` `model/Hydration.ts`.
`QadiAtoms.ts` imports four hydration symbols from three files
(`QadiAtoms.ts:32-35`).

### C2 — `hydrateDecisions` refuses an atom set "built elsewhere" with `UnregisteredAtoms` — **CONFIRMED, and sharper than stated**

`Hydration.ts:385-393` looks the atom set up by object identity and drops the
whole payload when the `WeakMap` has no entry. Probe 1, step 4: hydrating
against `{ ...atoms }` seeds 0 and reports `UnregisteredAtoms`. Probe 2:
`({ ...atoms }).decision(p) === atoms.decision(p)` is `true`. So the refused
"foreign" atom set in `Hydration.test.ts:563-572` and in the newsroom demo
(`examples/nextjs-newsroom/src/client/Unregistered.tsx`, e2e
`ssr.spec.ts:191-198`) is a **spread wrapper whose decision atoms are the real
ones**. The refusal is a property of the side channel's keying, not a defence
of anything. The lookup is keyed on the atom set so that `HydrationSeed.ts`
imports neither side (`HydrationSeed.ts:12-13`), and so that no consumer can
reach a seed atom (`HydrationSeed.ts:6-10`, ADR-QD-039).

### C3 — `seededDecision` is a ~90-line closure with a per-registry `AnnounceState` WeakMap and `tracking.inTracked`/`liveCount` mutation inside an atom read — **CHANGED (larger)**

`QadiAtoms.ts:372-523` is 152 lines including doc comments, about 70 of them
code. `AnnounceState` and its `WeakMap<AtomRegistry, AnnounceState>` are at
`:425-460`. The liveness mutation is at `:468-478`, inside `combined`'s
`Atom.readable` reader. The reader mixes three concerns:

1. liveness bookkeeping for `sweepEvictions` (`:468-478`), which is the
   AGENTS.md §13 eviction design and is not hydration;
2. seed-versus-computed precedence, the INV-QD-028 expression (`:488`, `:517-519`);
3. once-per-registry announce plus recheck counting (`:489-514`).

### C4 — `isMismatch`, the reporters, the counters and the devtools reader are separate stops — **CONFIRMED**

See C1. `countRecheck` is called from `QadiAtoms.ts:509`. `countDehydrated`,
`countSeeded` and `countDropped` are called from `Hydration.ts`.

### C5 — The Decision is serialized twice — **CONFIRMED**

Field-by-field comparison:

| Field | `SinkCodec.ts` `DecisionSchema` (`:97-106`) | `Hydration.ts` `DehydratedEntryFields` (`:87-97`) |
| ----- | ------------------------------------------- | ------------------------------------------------- |
| verdict | `_tag: Literals(["Allow","Deny"])` | `allowed: Boolean` |
| `evaluationId` | `String` | `String` |
| `subjectId` | `String` | absent; on the envelope instead (`DehydratedDecisions.subjectId`) |
| `durationMillis` | `Number` | `Number` |
| `trace` | `TraceSchema`, required | `TraceSchema`, optional |
| `visibleFields` | optional `Array(String)` | optional `Array(String)` |
| `obligations` | `Array(Obligation)`, required | optional `Array(Obligation)` |
| `reason` | optional `String` | optional `String` |

Both hand-write their own encode (`SinkCodec.ts:143-160`, `Hydration.ts:236-251`)
and rebuild (`SinkCodec.ts:162-178`, `Hydration.ts:278-303`), and each invents a
sentinel for a missing deny reason: `"denied"` (`SinkCodec.ts:177`) and
`"hydrated"` (`Hydration.ts:162`, `:301`). `SinkCodec.ts`'s schema is
module-private, so `Hydration.ts` could not reuse it.

ADR-QD-028's "Alternatives considered" still rejects "Serializing the whole
`Decision` with a `Schema` codec" because "decisions are not a wire format".
That was overtaken when `SinkRecordWire` started carrying `decided:
DecisionSchema` across processes (BEH-QD-199, CCR-QD-063). The ADR needs an
amendment, not just the code.

### C6 — LEAK: `rebuild` fabricates `policyTag: "AllOf"` for a hydrated decision with no trace, and its doc admits the value is arbitrary — **CONFIRMED, with a narrower reach than the docs claim**

`Hydration.ts:279-285` builds `{ policyTag: "AllOf" as const, ... }` when
`entry.trace` is absent. The doc at `:264-276` says the value is arbitrary.
`Hydration.test.ts:661-675` **pins the leak** with
`expect(decision?.trace.policyTag).toBe("AllOf")`.

The narrower reach: `dehydrateDecisions` always writes a trace
(`Hydration.ts:249`). The default, reduced one keeps the **real** root tag
(`reducedTrace`, `:165`). Probe 1, step 2: a default payload for `hasRole`
ships `{"policyTag":"HasRole","allowed":false,"reason":"hydrated","children":[],...}`.
So `"AllOf"` appears only for a payload with **no `trace` field at all**, which
means hand-crafted or version-skewed input (probe 1, step 3 reproduces it).

The honest replacement value is already in hand. The entry's own `policy` is
decoded in the same loop (`Hydration.ts:423-431`). Probe 1, step 1 checked
seven shapes (`HasRole`, `HasPermission`, `AllOf`, `AnyOf`, `Not`, `Labeled`,
`Obliged`): the evaluator's root `trace.policyTag` always equals
`policy._tag`.

A second sentinel lives beside it. A withheld denial's reason is the literal
`"hydrated"` (`Hydration.ts:248`, `:301`). That reaches consumers: `<Can
fallback={(deny) => deny.reason}>` (`components.tsx:63`) renders "hydrated" for
a seeded denial.

### C7 — `subjectsEqual` in `QadiAtoms` is a hand-written `AuthSubject` equality; check `DecisionCache.ts` — **CONFIRMED; two equality notions disagree**

`QadiAtoms.ts:331-346` is shallow on `attributes` (`Object.is` per key) and is
used by `Atom.withEquality` at `:367-369`. `DecisionCache.ts` has **no**
hand-written subject equality. Its key holds the whole `AuthSubject`
(`DecisionCache.ts:92-98`) and relies on `Equal.equals`/`Hash.hash` structurally,
`Set`s included (`DecisionCache.ts:56-74`). Probe 1, step 5:
`Equal.equals(makeSubject({…attributes:{org:{id:1}}}), makeSubject({…same…}))`
is `true` and `subjectsEqual` would say `false`. Step 5b: `Set` order does not
matter to `Equal.equals`. So one library holds two definitions of "same subject":
the cache's, which is deep, and the atom's, which is shallow. (Aside, out of
scope: `DecisionCache.ts:63` still cites `effect@4.0.0-rc.116`, while the
installed build is `4.0.0`. The probe shows the claimed `Set` behaviour still
holds.)

### C8 — The `asked` JSDoc is ~90 lines of self-corrections — **CHANGED (≈55 lines, two correction paragraphs, one now stale)**

`QadiAtoms.ts:103-157`. The "Correction (DA-03)" paragraph (`:126-134`) corrects
the paragraph above it. The "Correction" paragraph (`:135-144`) says "what is
missing is the consumer". AGENTS.md §13 at HEAD instead says that the **host**
subscribes (`examples/nextjs-newsroom/src/client/Dock.tsx:127` calls
`useSyncExternalStore(subscribeGates, gateInstances, gateInstances)`) and that
this is correct by design. The paragraph is stale in its turn.

### C9 — Import paths moved: AGENTS.md now says `effect/reactivity/*`, not `unstable` — **CONFIRMED**

AGENTS.md at HEAD, lines 534, 549 and 592, reads `effect/reactivity/Atom`. The
installed `effect` is `4.0.0` (`node_modules/effect/package.json`). Its
`exports["./*"] = "./dist/*.js"` resolves `effect/reactivity/Atom` to
`dist/reactivity/Atom.js`. Every `packages/*/src` file uses
`effect/reactivity/*`. The only `unstable/reactivity` reference left is the
stale build artifact `packages/react/lib/settled.d.ts`; `settled.ts` itself was
retired in CCR-QD-150. `effect` is a `peerDependency` of `@qadi/react`, through
`catalog:peer` (`packages/react/package.json`).

### C10 — Doc claim: a default payload's hydrated trace is an `"AllOf"` stand-in "naming nothing" — **REFUTED** (the claim lives in the docs, not in the review)

`HydrationWarning.ts:68-71`, ADR-QD-041 ("The message names the policy this
client evaluated"), BEH-QD-152 (`19-hydration.md:309-312`) and
`spec/devtools-spec/adr-draft-unified-stream.md:86-89` all say that for a
payload shipped without `includeTrace` the seed's `policyTag` is a stand-in
naming nothing. Probe 1, step 2 refutes this. The default payload names the real
root tag. Only a payload with no `trace` field gets `"AllOf"`. The *conclusion*
in those docs, to name the policy from `decided.trace`, still stands. Only the
stated reason is wrong.

### C11 — New finding: a malformed envelope throws instead of being dropped — **CONFIRMED (not in the review)**

`Hydration.ts:338-340` says "Not throwing is deliberate", and BEH-QD-230
requires every exit to be announced. Probe 2 shows that
`hydrateDecisions(atoms, { subjectId: "u1", entries: 5 }, s)` and
`{ subjectId: "u1" }` throw `TypeError: dehydrated.entries is not iterable`,
and that `null` throws on `.subjectId`. The parameter is typed
`DehydratedDecisions`, but the payload arrives as JSON in a page
(`JSON.parse` yields `any`), so the type does not protect it. Only the
*entries* are schema-decoded today; the envelope never is.

### C12 — Madge counts type-only imports — **CONFIRMED** (constrains the layout)

A two-file `import type` cycle in the scratchpad fails
`madge --circular --extensions ts,tsx` ("Found 1 circular dependency"). Any new
layout must therefore be acyclic **including** `import type` edges. Today's
edges are `Hydration.ts → QadiAtoms.ts` (type), `Hydration.ts → QadiProvider.tsx`
(type `InitialValues`), `QadiProvider.tsx → QadiAtoms.ts` (type), and
`QadiAtoms.ts → HydrationSeed.ts`.

### C13 — Seeded decisions never reach a `DecisionSink` — **CONFIRMED** (bounds the type change)

`packages/react/src` has no reference to `DecisionSink`, `DecisionRecord` or
`toWire`. Devtools reads only `SinkRecord`s, which hold evaluated `Decision`s.
So a type for seeded decisions stays inside `@qadi/react`'s read path and never
touches `SinkRecordWire`, `@qadi/devtools`, `@qadi/http` or `@qadi/audit`.

## 2. Goal and success criteria

**Goal.** Make hydration one **deep module** in `@qadi/react`: a small public
**interface** (`Hydration.ts`) over one private implementation module that owns
the seed atom, the seed-versus-computed precedence, the once-per-registry
announcement, recheck counting, the payload codec and the trace-disclosure rule.
`QadiAtoms.ts` should cross into it at exactly one **seam**: a seeded-question
factory plus, under D-05-b (c), a hydrate capability. It keeps only the liveness
bookkeeping that belongs to eviction. The decision's wire shape becomes one
definition in `@qadi/core`. `SinkCodec.ts` and the hydration payload both derive
from it, instead of two hand-rolled codecs drifting apart. That gives **leverage**:
one schema, one set of tests, and one Stryker-covered file. A hydrated decision
stops pretending to be an evaluated one. Withholding a trace becomes a closed,
tagged case on the wire and in the type, never a fabricated `"AllOf"` tag or a
`"hydrated"` reason. The counters stay declared in core and readable by devtools
unchanged (ADR-QD-052). The two confinement **adapters** stay as named files:
`HydrationWarning.ts` for `console`/`process.env` and `HydrationCounts.ts` for
`Context.empty()`. **Locality** improves: a reader debugging "why did this seed
not show" or "why was this mismatch not announced" opens one file.

**Success criteria** (each is observable):

1. `grep -nE "from \"\./Hydration" packages/react/src/QadiAtoms.ts` prints exactly
   one import line, from the private implementation module
   (`./HydrationEngine.ts`). `grep -nE "countRecheck|isMismatch|hydrationMismatchReporter|registerHydrationSeeds|AnnounceState" packages/react/src/QadiAtoms.ts`
   prints nothing.
2. `grep -rn "\"AllOf\" as const" packages/react/src` prints nothing.
   `grep -rnE "\"hydrated\"" packages/react/src` prints nothing (D-05-a = C), or only
   the documented legacy-v1 reader (D-05-a = A).
3. `grep -n "const DecisionSchema" packages/core/src/SinkCodec.ts` prints nothing.
   `packages/core/src/DecisionWire.ts` exports `DecisionWire`, `encodeDecision` and
   `decodeDecision`. `packages/react/src/HydrationEngine.ts` builds its entry schema
   from `DecisionWire.mapFields(...)` (grep `DecisionWire.mapFields`).
4. Every existing `SinkCodec.test.ts` test passes unchanged. A new golden test proves
   `toWire` → `encodeRecordSync` → `JSON.stringify` is byte-identical to the HEAD
   output for a fixed `Allow` and a fixed `Deny` record.
5. The render-sequence tests pass with **unchanged assertions**:
   `QadiAtoms.test.ts` (all), `QadiProvider.test.tsx` (all), and in
   `Hydration.test.ts` the "DOES NOT LET A HYDRATED ALLOW OUTLIVE…",
   "A FAILURE IS NOT A DISAGREEMENT", "reports ONCE PER QUESTION…", "reports
   once per REGISTRY…" and "a re-check that settles asynchronously" blocks. §7
   lists by line every assertion that changes on purpose.
6. `pnpm circular` reports no cycle, with type-only edges counted (C12).
7. `hydrateDecisions` never throws on any JSON value as its payload argument. A
   new property test over `fc.jsonValue()` (or a table of hostile envelopes)
   asserts that it returns and that every non-seeded entry is counted.
8. `@qadi/devtools`'s `hydrationActivity` reads the same five metrics unchanged.
   `HydrationMetrics.test.ts` still pins every id, type and description. Only the
   drop-reason key set changes, as D-05-b and D-05-c decide.
9. `pnpm check` passes end to end, including gate 15
   (`pnpm --filter @qadi/example-nextjs check`, which runs the newsroom e2e) and
   gate 13 (`node scripts/check-api-surface.mjs`).

## 3. Non-goals

- **Changing seed precedence.** INV-QD-028/ADR-QD-039's expression ("a seed is
  read only while the computed result is `Initial`") is preserved character for
  character. This plan moves it; it does not redesign it.
- **Changing the eviction sweep.** `TrackedQuestion`, `liveCount`, `inTracked`
  and `sweepEvictions` (`QadiAtoms.ts:229-233`, `:556-587`) stay in `QadiAtoms.ts`
  with identical semantics (AGENTS.md §13). They are eviction, not hydration. The
  only change is that the liveness bump becomes a callback the seeded-question
  factory runs **first** inside the same reader, so the order of `get`/`get.once`
  calls is unchanged.
- **Touching `AtomRegistry` construction.** No `scheduleTask`, `defaultIdleTTL`
  or new registry options (AGENTS.md §13, CCR-QD-150).
- **Moving the metric declarations out of `@qadi/core`** or re-declaring them in
  `@qadi/devtools` (ADR-QD-052: a re-declared metric reads zero forever).
- **Making `dehydrateDecisions`/`hydrateDecisions` effectful.** They stay sync and
  pure (ADR-QD-028, ADR-QD-052's `updateUnsafe` rationale).
- **A `Withheld`/`Disclosure` case on core's `Decision`/`Trace`.** Option B in
  D-05-a is assessed and rejected as *wrong*, not merely expensive: every
  evaluator output would claim it might lack a trace when it never does (§5).
- **Devtools showing a "seeded" gate state.** `GateRenderState`
  (`GateRegistry.ts:96`) stays `"Pending" | "Rechecking" | "Allowed" | "Denied" | "Failed"`.
  A seeded verdict maps to `"Allowed"`/`"Denied"` exactly as today. A "Seeded"
  state is a separate follow-up.
- **SinkRecordWire forward-skew (GH-01, `SinkCodec.ts:468-492`).** It is untouched,
  except that D-05-e optionally tightens the embedded decision.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1: submodule namespace imports; `.ts` extensions; `import type` | `import * as Struct from "effect/Struct"` for `Struct.omit`. Atoms come from `effect/reactivity/Atom` (C9). Cross-package imports are named imports from `@qadi/core`. |
| AGENTS.md §2/§3: `Context.Service`; layers as top-level consts | No new services are needed. If any appears, it follows ADR-QD-010's `…Shape` rule. |
| AGENTS.md §4: `Data.TaggedError`; `SCHEMA_ERROR_BUDGET` = 12 | **No new error classes.** Drops stay values reported through `HydrationDropReporter`. `SCHEMA_ERROR_BUDGET` is untouched. The new seeded classes are `Data.TaggedClass`, not errors. |
| AGENTS.md §5: `Effect.fn`; `UNTRACED_BUDGET` = 3 | Hydration code is synchronous and outside Effect (ADR-QD-052), so no new `Effect.fn`/`fnUntraced`. `sweepEvictions` stays `Effect.sync`. The budget is untouched. |
| AGENTS.md §5a: `Match`, not `switch`; `SWITCH_BUDGET` = 4 | New dispatch over `ClientDecision`, `Disclosure` and drop reasons uses a module-scope `Match.type<…>().pipe(Match.tagsExhaustive(…))`. Zero new `switch`. |
| AGENTS.md §6: no `as` (except `as const`), `!`, `any`, `Record<string, unknown>` as a widened implementation type (memory) | `rebuild`'s `"AllOf" as const` goes away. Projection of a `SeededAllow` must not cast to `Allow`: factor core's `project` into a field-set function (T3 step 6). `ANY_BUDGET` and `HAS_CUSTOM_BUDGET` are untouched. |
| AGENTS.md §7 / ADR-QD-002: schema and type are one definition at an untrusted input | The `Disclosure` type is `typeof Disclosure.Type`. The v2 entry type is `typeof DehydratedEntryWire.Type`. Both derive from core's `DecisionWire`, not from a parallel hand-written struct. |
| AGENTS.md §9: barrels are `export *`; scaffolding stays out | `HydrationEngine.ts` is **not** in the barrel. Seed atoms, the seeded-question factory and `hydrateWith` must never become public (ADR-QD-039: a reachable seed atom is a bypass). Public names are re-exported **by name** from `Hydration.ts` (the TS2883 pattern already at `Hydration.ts:42`). |
| AGENTS.md §11/§12/§15: spec is normative; `typescript` fences compile (gate 9); overview names every export (gate 13); devtools claims (gate 12) | §8 lists every document. New exports are added to `spec/overview.md` in the same change. The devtools draft's false "AllOf" claim (C10) is corrected without breaking gate 12's claims table. |
| AGENTS.md §13 / ADR-QD-014 as reversed in CCR-QD-150 | Decisions stay out of React state. `currentDecision` stays the single read point (ADR-QD-017) and only its parameter/return types widen to the closed `ClientDecision` union. No `scheduleTask`/`defaultIdleTTL`. The eviction sweep is untouched. Exactly one `Atom.readable` per question, as today, so no notification or batching change can alter the render sequences `QadiProvider.test.tsx` and the newsroom e2e pin. |
| ADR-QD-028/052: counters countable from core; devtools reads them with no wiring | The five metrics, their ids and their descriptions are unchanged (`HydrationMetrics.test.ts` pins them). Only `hydrationDropReasons`/`ClientHydrationDropReason` membership may change, and `preregisteredWords` follows automatically. |
| ADR-QD-037 (madge, gate 5) | Type-only edges count (C12). Target edges (T2/T5): `QadiAtoms → HydrationEngine`; `Hydration → HydrationEngine`; `Hydration → QadiAtoms` (type); `QadiProvider → HydrationEngine` (type `InitialValues`); `QadiProvider → QadiAtoms` (type); `HydrationEngine → HydrationWarning`, `HydrationEngine → HydrationCounts`. `HydrationEngine` imports **nothing** from `Hydration`, `QadiAtoms` or `QadiProvider`, which means `InitialValues` moves into `HydrationEngine.ts`. |
| AGENTS.md §16 / gate 14 | `@qadi/react` keeps `"@qadi/core": "workspace:^"`. No new package. |
| Coverage (AGENTS.md §10): core 95%, react 90% | `DecisionWire.ts` needs direct tests in core (both verdicts, absent/present `visibleFields`). It is also inside gate 16's Stryker scope (core ≥ 80%). |
| Memory: closed union over widening | `ClientDecision` names its four cases (`Allow`, `Deny`, `SeededAllow`, `SeededDeny`). It is not `Decision \| "Seeded"`. Drop reasons stay a closed union, so removing or adding a member is a compile error at every exhaustive `Match` and at devtools' `MEANINGS: Record<HydrationDropReason, string>` (`devtools/src/model/Hydration.ts:72`). |
| Memory: prefer complete over simple | Each decision recommends the complete option unless that option is *wrong*. Option B in D-05-a is refused as wrong (it weakens every evaluated decision's type), not as expensive. |

## 5. Decisions needed before work starts

### D-05-a — How a hydrated decision is represented

Today a seed is rebuilt into a core `Allow`/`Deny`, which requires a `Trace` and
a deny `reason`. Both are fabricated when withheld: the reduced single-node trace
with `reason: "hydrated"`, and `"AllOf"` when no trace came at all. Options:

- **A — Honest root tag, keep `Decision`.** `rebuild` takes the root tag from the
  decoded `policy._tag` (verified equal to the evaluator's root tag, C6). The wire
  also rejects a disclosed trace whose root tag disagrees with `policy._tag`
  (`MalformedEntry`). Zero public type change. *Leaves*: the deny-reason sentinel
  `"hydrated"`, which ADR-QD-028 documents, and a single-node "trace" that is a
  projection posing as an evaluation tree. `Can`'s function fallback still shows
  "hydrated". Test churn: `Hydration.test.ts:675` changes from `"AllOf"` to
  `"HasRole"`. Size: S.
- **B — Disclosure on core's `Decision`.** `Allow.trace`/`Deny.trace` become
  `Disclosed | Withheld`. **Rejected as wrong.** The evaluator always produces a
  trace, so every server-side caller (`@qadi/http`, `@qadi/audit`,
  `@qadi/promise`, `renderTrace`, `AccessDenied`'s `TraceSchema` field,
  `SinkRecordWire`) would have to handle a case that cannot happen for it. Measured
  blast radius: about 250 `.trace`/`trace:` sites (core src 22, core test 164,
  devtools 20, react 20, http test 5, promise 3, features 11, examples 4, spec 14),
  plus a wire change to `AccessDenied` (ADR-QD-072).
- **C — A seeded decision is its own type, scoped to `@qadi/react`
  (recommended).** In the private engine, add
  `class SeededAllow extends Data.TaggedClass("SeededAllow")<{ evaluationId; subjectId; durationMillis; visibleFields: VisibleFields; obligations; disclosure: AllowDisclosure }>`
  and `class SeededDeny extends Data.TaggedClass("SeededDeny")<{ evaluationId; subjectId; durationMillis; disclosure: DenyDisclosure }>`,
  with `AllowDisclosure = Withheld | Disclosed{ trace }` and
  `DenyDisclosure = Withheld | Disclosed{ trace, reason }`. Both types derive
  from one `Schema.Union([Schema.TaggedStruct("Withheld", {}), Schema.TaggedStruct("Disclosed", …)])`.
  Add the closed union `ClientDecision = Allow | Deny | SeededAllow | SeededDeny`.
  `DecisionResult` becomes `AsyncResult<ClientDecision, EvaluationError>`.
  `currentDecision` returns `ClientDecision | undefined`. Add `permits`
  (module-scope `Match.tagsExhaustive`) and an `isSeeded` guard.
  `DeniedNode = ReactNode | ((decision: Deny | SeededDeny) => ReactNode)`.
  `useDecisionSuspense` returns `ClientDecision`.
  `HydrationMismatch.seeded: SeededDecision`. Nothing outside `@qadi/react` changes
  type (C13). *Why it is correct*: ADR-QD-028 already says a hydrated decision "is
  not equal to the one the server made" and names its payload a projection.
  ADR-QD-039 says a seed "is not an authority". C makes the type say both, and
  removes both sentinels. ADR-QD-003 is honoured because the union is
  discriminated by distinct `_tag`s. *Consumer impact*: core's `isAllowed`
  rejects a `ClientDecision`, so every verdict read becomes a compile error and
  must move to `permits`, which is the memory's "take the compile errors". A
  consumer comparing `d._tag === "Allow"` keeps compiling and now treats a seeded
  allow as not-allowed. That is fail-closed, never a grant, and the changeset
  must state it. Measured react-side sites: `hooks.ts` 22, `components.tsx` 9,
  `useGate.ts` 5, `QadiAtoms.ts` 9, `GateRegistry.ts` 2, newsroom client files
  ≈30, spec `09-react.md` 20, website react docs 3 pages. *Test churn*: about 14
  seed-window `_tag`/`.trace`/`.reason` assertions in `Hydration.test.ts`
  (§7 lists them) and one in `hooks.test.tsx:595`. None are render-sequence
  assertions. Size: L.
- **C′ — Seeded classes that reuse `_tag: "Allow" | "Deny"`.** Verdict reads keep
  compiling with unchanged meaning, and trace/reason reads break. Rejected: two
  classes sharing one `_tag` defeat `Match.tagsExhaustive` and ADR-QD-003's single
  discriminant, and `Equal` between the two classes becomes ambiguous.

**Recommendation: C.** Its one cost against the caller's constraint is that about
14 seed-shape assertions in `Hydration.test.ts` change. Any honest fix must edit
`Hydration.test.ts:675`, because that line pins the leak, so "Hydration.test.ts
byte-unchanged" is unattainable under every option. If the owner rules that
seed-window `_tag` assertions must not change, take **A**. T3 has an A branch.
`status: decided (2026-10-04, recommended default) — C (seeded decision is its own closed type)`

### D-05-b — Where the seed lookup lives

- **a — Keep a module `WeakMap` keyed on the atom set**, moved into
  `HydrationEngine.ts` and private. `UnregisteredAtoms` keeps its current meaning,
  including refusing a spread wrapper of a real atom set (C2). Zero e2e change.
- **b — Key the side table on the decision atom.** `hydrateDecisions` resolves
  `atoms.decision(policy)` and looks up its seed. Wrappers that forward
  `decision`/`decisionFor` then work, and `UnregisteredAtoms` narrows to a
  per-entry "this decision atom was not built by `makeQadiAtoms`". This still
  keeps a module side channel, and the drop becomes per-entry, which changes
  BEH-QD-230's "rejects the payload whole".
- **c — The atom set owns the capability (recommended).** `QadiAtoms` gains
  `readonly hydrate: (dehydrated, subject, options?) => InitialValues`, built
  inside `makeQadiAtoms` as a closure over its own `bare`/`byResource` families
  through `HydrationEngine.ts`'s `hydrateWith(seedFor, …)`. `hydrateDecisions(atoms, …)`
  stays the documented entry point and delegates. The seed atoms remain closure
  private, unreachable by reflection or import, which is ADR-QD-039's real
  requirement. A spread wrapper now seeds the real questions, which is correct
  because its decision atoms are the real ones. `UnregisteredAtoms` becomes
  **unreachable by construction**, so it is **removed** from the closed
  `ClientHydrationDropReason`. That is breaking: it touches core
  `HydrationMetrics.ts`, `HydrationWarning.ts`'s `explain`, devtools `MEANINGS`,
  BEH-QD-230, the newsroom `/edge/unregistered` page, its unit test
  (`examples/nextjs-newsroom/test/hydration.test.ts:206`), e2e
  `ssr.spec.ts:191-198`, `features/features/hydration-counts/hydration-counts.feature:41`,
  `HydrationCounts.test.ts` and `HydrationMetrics.test.ts`. It also deletes
  `HydrationSeed.ts` and edits AGENTS.md §13's "the shape `HydrationSeed.ts`
  already uses".
- **d — A symbol-keyed property on the atom set.** Rejected as wrong.
  `Object.getOwnPropertySymbols(atoms)` exposes it, which is the seed-atom bypass
  ADR-QD-039 exists to prevent. If enumerable, a spread also copies it.

**Recommendation: c.** It deletes a failure mode instead of reporting it, and
removes the last module-scope side channel in the hydration path. Taking **a**
instead skips T5 and leaves e2e untouched.
`status: decided (2026-10-04, recommended default) — c (atom set owns the capability; UnregisteredAtoms removed)`

### D-05-c — Wire compatibility of dehydrated payloads

Changing the entry shape (D-05-a = C, or any derivation from `DecisionWire` that
drops `allowed`) means a payload from an older server can meet a newer client.
That happens rarely, through cached HTML hydrated by newer chunks during a deploy.
Today's handling is already fail-closed: an older client meeting a newer entry
drops it as `MalformedEntry` through `UNTRUSTED_DECODE_OPTIONS`. The page flashes
and re-decides, and no grant is made.

- **a — No version.** A shape change shows up as `MalformedEntry` for the length of
  the deploy, then disappears. It is honest but indistinguishable from a real
  malformation.
- **b — Version the envelope, dual-read v1 for a deprecation window, and name the
  failure (recommended).** `DehydratedDecisions` gains `version: 2`. The envelope
  is now schema-decoded (C11). An absent `version` means v1 and goes through a
  legacy reader. The legacy reader **always** yields `Disclosure.Withheld`, even
  when v1 carried a trace: a v1 reduced trace is indistinguishable in kind from a
  real one, and the safe direction is less disclosure. The only loss is a debug
  trace during the skew window. Any other `version` drops the whole payload under a
  new closed-union member, `UnsupportedPayloadVersion`. A non-object or
  structurally broken envelope drops under another new member, `MalformedPayload`,
  which closes C11. The v1 reader is removed in the next minor release, and the
  plan files a tracked follow-up when it lands.
- **c — Keep v1 bytes exactly.** This is incompatible with D-05-a = C, because v1's
  `trace` is the fabrication being removed. It is only possible with D-05-a = A.

**Recommendation: b.** It is fail-closed in both directions. An older client
ignores the unknown envelope key `version` and still decodes v1-shaped entries
(it never sees v2 ones), and v2 entries are refused per-entry as `MalformedEntry`
by the old code.
`status: decided (2026-10-04, recommended default) — b (versioned envelope, v1 dual-read as Withheld)`

### D-05-d — Subject equality for the `subject` atom

- **a — Leave `subjectsEqual`** (shallow, hand-written).
- **b — Use `Equal.equals` directly in `QadiAtoms.ts`.**
- **c — Export one equivalence from core (recommended).** `AuthSubject.ts` exports
  `subjectEquivalence: Equivalence.Equivalence<AuthSubject>`, built on
  `Equal.equals`, which is the same semantics `DecisionCache`'s key already relies
  on (C7). `QadiAtoms.ts` uses
  `(a, b) => a === b || (a !== undefined && b !== undefined && subjectEquivalence(a, b))`.
  Equal-but-distinct nested attribute objects stop re-running every mounted
  decision, which is strictly fewer spurious invalidations. Any real change is
  still detected (probe 5). Adds one core export, a gate 13 row.

**Recommendation: c**, for leverage and so the library has one definition of "same
subject".
`status: decided (2026-10-04, recommended default) — c (export subjectEquivalence from core)`

### D-05-e — Tighten the shared `DecisionWire` into a tagged union

Today the schema is a flat struct with `_tag: Literals(["Allow","Deny"])` and an
optional `reason` for both verdicts, which is why `decodeDecision` invents
`"denied"` (`SinkCodec.ts:177`).

- **a — Move it as-is** (byte-identical, keeps the `"denied"` sentinel).
- **b — Make it `Schema.Union([TaggedStruct("Allow", …), TaggedStruct("Deny", { …, reason: String })])`
  (recommended, separable).** Valid records encode to the same JSON (a golden test
  proves it). Decode becomes stricter only for records this module never emits: a
  Deny without a reason, or an Allow with a reason. The `"denied"` sentinel is
  deleted. This touches `SinkRecordWire`, a cross-process contract (ADR-QD-060,
  BEH-QD-199), so it is the last task and can be dropped without affecting the
  rest.

**Recommendation: b** as T9, after everything else is green.
`status: decided (2026-10-04, recommended default) — b (tagged-union DecisionWire, T9)`

## 6. Tasks

### Target layout (after T1–T5 with every recommendation taken)

```
@qadi/core
  Decision.ts             Trace, TraceSchema, Allow, Deny, project (+ projectVisible, T3)   unchanged otherwise
  DecisionWire.ts   new   DecisionWire schema, encodeDecision, decodeDecision   (moved from SinkCodec.ts:97-178)
  SinkCodec.ts            imports DecisionWire; SinkRecordWire bytes unchanged
  HydrationMetrics.ts     declarations stay (ADR-QD-052); drop-reason union edited (T4/T5)
  AuthSubject.ts          + subjectEquivalence (T6)

@qadi/react
  Hydration.ts            PUBLIC seam (barrel): dehydrateDecisions, hydrateDecisions, public types,
                          named re-exports of SeededAllow/SeededDeny/ClientDecision/permits/isSeeded/…
  HydrationEngine.ts new  PRIVATE: payload codec (v2 + v1 reader), Disclosure, SeededAllow/SeededDeny,
                          makeSeededQuestion (seed atom, precedence, AnnounceState, recheck count,
                          mismatch report), hydrateWith, InitialValues, isMismatch
  HydrationWarning.ts     PRIVATE adapter: console + process.env (ADR-QD-041) — isMismatch moves out
  HydrationCounts.ts      PRIVATE adapter: Context.empty() metric writes (ADR-QD-052)
  HydrationSeed.ts        DELETED (D-05-b = c)  |  folded into HydrationEngine.ts (D-05-b = a)
  QadiAtoms.ts            liveness/eviction + one seam into HydrationEngine.ts
```

### T0 — Record the baseline
- **Status:** [x] done
- **Depends on:** —
- **Files:** none in the repo. Write notes into the PR description.
- **Steps:**
  1. `git rev-parse --short HEAD`. Confirm the evidence in §1 still holds. If
     `Hydration.ts`, `QadiAtoms.ts`, `HydrationSeed.ts` or `SinkCodec.ts` changed
     since `1caf04c`, re-verify C1–C13 and update §1 and the log before continuing.
  2. Run the seven-file baseline command from §1 and record the counts (181 at
     `1caf04c`).
  3. Run `pnpm circular`, then `pnpm --filter @qadi/example-nextjs check`, which
     includes the Playwright e2e. Record pass/fail per spec file.
  4. Capture golden JSON for T1. In a scratch script (outside the repo), build one
     `DecisionRecord` with an `Allow` (with and without `visibleFields`) and one
     with a `Deny`, run `JSON.stringify(encodeRecordSync(toWire(r)))`, and keep
     the three strings for T1's test.
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** the baseline numbers and golden strings are recorded in the PR.

### T1 — Extract `DecisionWire` into core, with no wire change
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/core/src/DecisionWire.ts` (*new*), `packages/core/src/SinkCodec.ts`,
  `packages/core/src/index.ts`, `packages/core/test/DecisionWire.test.ts` (*new*),
  `packages/core/test/SinkCodec.test.ts` (golden test added only), `spec/overview.md`.
- **Steps:**
  1. Create `DecisionWire.ts`. Its module doc leads with a one-line summary ("The
     wire form of a `Decision`, shared by every module that ships one."), then
     the why: SinkCodec and hydration, ADR-QD-002, and that ADR-QD-028's
     "decisions are not a wire format" was overtaken by BEH-QD-199/CCR-QD-063.
  2. Move `DecisionSchema` (`SinkCodec.ts:97-106`) there, renamed
     `export const DecisionWire`, with `export type DecisionWire = typeof DecisionWire.Type`.
     Move `encodeDecision` (`:143-160`) and `decodeDecision` (`:162-178`) there as
     exports. Bodies stay identical, including the `"denied"` fallback, which T9
     may remove.
  3. `SinkCodec.ts` imports `{ DecisionWire, encodeDecision, decodeDecision }` from
     `./DecisionWire.ts` and deletes the moved code. `SinkRecordWire`'s
     `decided: Schema.optional(DecisionWire)` stays.
  4. Add `export * from "./DecisionWire.ts";` to `packages/core/src/index.ts`, in
     alphabetical position (AGENTS.md §9).
  5. In `spec/overview.md`'s core table, add rows for `DecisionWire` (schema),
     `encodeDecision` and `decodeDecision` (function), Source `DecisionWire.ts`. Amend
     the `TraceSchema` row (`overview.md:262`) to say the hydration payload now
     reaches it through `DecisionWire`.
- **Tests:** written first.
  - `SinkCodec.test.ts`: a new `it("encodes byte-identically to 1caf04c")` per golden
    string from T0. It must pass before and after the move.
  - `DecisionWire.test.ts`: a round trip for an Allow with `visibleFields: undefined`,
    an Allow with `[]` (INV-QD-004: top versus bottom), and a Deny. Assert that
    `encodeDecision` omits `visibleFields` when `undefined`, and that
    `decodeDecision(encodeDecision(d))` deep-equals `d`.
- **Verify:** `node_modules/.bin/vitest run packages/core/test/SinkCodec.test.ts packages/core/test/DecisionWire.test.ts`,
  `pnpm typecheck`, `pnpm circular`, `node scripts/check-api-surface.mjs`.
- **Done when:** every pre-existing `SinkCodec.test.ts` test passes unchanged, the golden
  tests pass, and `grep -n "const DecisionSchema" packages/core/src/SinkCodec.ts` is empty.

### T2 — Move seed, precedence, announce and recheck out of `QadiAtoms.ts` into a private `HydrationEngine.ts` (pure refactor)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/react/src/HydrationEngine.ts` (*new*, out of the barrel),
  `packages/react/src/QadiAtoms.ts`, `packages/react/src/HydrationSeed.ts` (folded in
  and deleted), `packages/react/src/Hydration.ts`, `packages/react/src/HydrationWarning.ts`,
  `packages/react/src/QadiProvider.tsx`, `packages/react/test/HydrationEngine.test.ts` (*new*).
- **Steps:**
  1. Create `HydrationEngine.ts` without `"use client"`, because it must run under
     a server render too. Its module doc's one-line summary is "Everything
     between a server's decision and the moment this client supersedes it." The
     why paragraph cites ADR-QD-028, ADR-QD-039, ADR-QD-041, INV-QD-028, and the
     ADR-QD-039 reason it is out of the barrel.
  2. Move `InitialValues` (`QadiProvider.tsx:141`) into `HydrationEngine.ts`.
     `QadiProvider.tsx` does `import type { InitialValues } from "./HydrationEngine.ts"`
     and `export type { InitialValues } from "./HydrationEngine.ts"`, so its public
     home and the barrel are unchanged. `Hydration.ts` imports it from the engine.
     This breaks the would-be `HydrationEngine → QadiProvider → QadiAtoms →
     HydrationEngine` cycle (C12).
  3. Move `isMismatch` (`HydrationWarning.ts:42-43`) into the engine, next to its
     only caller. `HydrationWarning.ts` keeps only `console`/`process.env` code
     (ADR-QD-041's confinement).
  4. Move the seed lookup (`HydrationSeed.ts`, all of it) into the engine as
     private `registerHydrationSeeds`/`hydrationSeedFor`, then delete
     `HydrationSeed.ts`. Under D-05-b = c, T5 removes them again.
  5. Write `makeSeededQuestion` in the engine. Its signature, with types from
     `effect/reactivity/Atom` and `effect/reactivity/AsyncResult`:
     ```ts
     export interface SeededQuestion<E> {
       readonly seed: Atom.Writable<Decision | undefined>;
       readonly read: Atom.Atom<AsyncResult.AsyncResult<Decision, E>>;
     }
     export const makeSeededQuestion = <E,>(input: {
       readonly policy: Policy;
       readonly resource: Resource | undefined;
       /** Builds the computing atom; handed the seed so it can `get.once` the server's evaluationId. */
       readonly computedFor: (seed: Atom.Writable<Decision | undefined>) =>
         Atom.Atom<AsyncResult.AsyncResult<Decision, E>>;
       readonly report: HydrationMismatchReporter | undefined;
       /** QadiAtoms' liveness bookkeeping. Runs FIRST inside the reader, exactly where it runs today. */
       readonly track: (get: Atom.AtomContext) => void;
     }): SeededQuestion<E>
     ```
     The body is `QadiAtoms.ts:379` and `:407-522` moved verbatim: the
     `AnnounceState` interface, its `WeakMap<AtomRegistry.AtomRegistry, …>`,
     `announceStateFor`, and the reader. The reader's first statement becomes
     `input.track(get)`, replacing the inline `:468-478`. All of `get.once(seed)`,
     `get(computed)`, `get(seed)` and `announceStateFor(get.registry)` stay in their
     current order. **Do not add an atom.** There is one `Atom.readable` per
     question, as today.
  6. In `QadiAtoms.ts`, replace `seededDecision` (`:372-523`) and the
     `SeededDecision` interface (`:273-276`) with a call to
     `makeSeededQuestion({ policy, resource, computedFor: (seed) => runtime.atom(...)…, report, track })`.
     `computedFor`'s body is today's `computed` (`:381-405`) unchanged. `track` is
     today's `:468-478` (re-add to `tracked` if `!inTracked`, `liveCount += 1`,
     `get.addFinalizer(() => liveCount -= 1)`). `QadiAtoms.ts` keeps
     `TrackedQuestion`, `tracked`, `bare`, `byResource`, `sweepEvictions` and
     `invalidate` unchanged. Its imports from `./HydrationCounts.ts`,
     `./HydrationSeed.ts` and `./HydrationWarning.ts` all go. One import from
     `./HydrationEngine.ts` remains, plus the type re-export of
     `HydrationMismatch`/`HydrationMismatchReporter` (keep `QadiAtoms.ts:39`'s
     public re-export pointing at `HydrationWarning.ts`, which still declares those
     types).
  7. Move `INV-QD-028`'s precedence doc block (`QadiAtoms.ts:256-272`) with the code.
     The stray duplicated doc comment at `QadiAtoms.ts:249-255` ("Builds the atom
     set…") belongs to `makeQadiAtoms`, and an orphaned `/** … */` precedes the
     `SeededDecision` one. Re-attach it to `makeQadiAtoms`.
- **Tests:**
  - New `HydrationEngine.test.ts`, written before the move against the *current*
    behaviour through `makeQadiAtoms`. It pins: the reader calls `track` before any
    `get`, asserted with a spy `track` that records `get.registry`; and two
    registries over one question each announce once (moved coverage, not new).
  - No existing test changes in this task.
- **Verify:** `node_modules/.bin/vitest run packages/react`, `pnpm circular`, `pnpm typecheck`,
  `node scripts/check-house-style.mjs`, `pnpm --filter @qadi/example-nextjs check`.
- **Done when:** the whole `packages/react` suite passes with **zero** test-file edits,
  the newsroom e2e is green (its render sequences, e.g. `ssr.spec.ts:186-189`
  `"Success,Initial+waiting,Success"`, are unchanged), success criterion 1 holds, and
  `HydrationSeed.ts` no longer exists.

### T3 — Give a seed its own closed type (D-05-a)
- **Status:** [x] done
- **Depends on:** T2, D-05-a
- **Files (branch C, recommended):** `packages/react/src/HydrationEngine.ts`,
  `packages/react/src/Hydration.ts`, `packages/react/src/QadiAtoms.ts`, `packages/react/src/hooks.ts`,
  `packages/react/src/components.tsx`, `packages/react/src/useGate.ts`,
  `packages/react/src/HydrationWarning.ts`, `packages/core/src/Decision.ts`,
  `packages/react/test/*.test.ts(x)` (the assertions §7 lists),
  `packages/react/test/Hydration.tst.ts` (*new*), `examples/nextjs-newsroom/src/**` (compile fixes),
  `features/step-definitions/**` (if they read seeded decisions), `spec/overview.md`.
- **Steps (branch C):**
  1. In the engine, declare the disclosure schema once:
     `const Disclosure = Schema.Union([Schema.TaggedStruct("Withheld", {}), Schema.TaggedStruct("Disclosed", { trace: TraceSchema, reason: DecisionWire.fields.reason })])`.
     `reason` is reused from `DecisionWire`'s own field. Derive
     `AllowDisclosure`/`DenyDisclosure` types from it. Add the
     `Data.TaggedClass` pair `SeededAllow`/`SeededDeny` with the fields given in
     D-05-a (C), and `export type SeededDecision = SeededAllow | SeededDeny`.
  2. Add `export type ClientDecision = Allow | Deny | SeededAllow | SeededDeny`.
     At module scope, add
     `export const permits: (self: ClientDecision) => boolean = Match.type<ClientDecision>().pipe(Match.tagsExhaustive({ Allow: () => true, SeededAllow: () => true, Deny: () => false, SeededDeny: () => false }))`
     and `export const isSeeded = (self: ClientDecision): self is SeededDecision => …`
     (a `Match.tagsExhaustive` returning booleans, then the predicate wraps it).
  3. Type the seed atom `Atom.Writable<SeededDecision | undefined>`.
     `makeSeededQuestion`'s `read` returns `AsyncResult<ClientDecision, E>`.
     `isMismatch(seeded: SeededDecision, decided: Decision) = permits(seeded) !== isAllowed(decided)`.
     The evaluation-id continuation (`QadiAtoms.ts:399-403`) reads `seeded.evaluationId`,
     which is unchanged in name.
  4. `QadiAtoms.ts`: `DecisionResult = AsyncResult.AsyncResult<ClientDecision, EvaluationError>`.
     `currentDecision` returns `ClientDecision | undefined`, with the body unchanged
     (ADR-QD-017). `HydrationWarning.ts`: `HydrationMismatch.seeded: SeededDecision`,
     and `verdict()` uses `permits`.
  5. `Hydration.ts`: `rebuild` constructs `SeededAllow`/`SeededDeny`. No trace and
     no `"hydrated"` is invented. `dehydrateDecisions` writes `disclosure:
     { _tag: "Withheld" }` by default and `{ _tag: "Disclosed", trace, reason }` under
     `includeTrace` (BEH-QD-147). Delete `HYDRATED` and `reducedTrace`. The wire shape
     itself is T4.
  6. Core `Decision.ts`: factor `project`'s body after the verdict check into
     `export const projectVisible = <A extends Resource>(visibleFields: VisibleFields, data: A): Partial<A>`,
     and make `project` call it, with behaviour unchanged (BEH-QD-051). React's
     `useProjected` uses `permits(d) ? projectVisible(d.visibleFields, data) : {}`.
     Narrowing on `_tag` reaches `visibleFields` on both allow classes without any `as`.
     Add an overview row.
  7. Re-type the react surface: `hooks.ts` (`useCan` → `permits`,
     `useDecisionSuspense: ClientDecision`, `useProjected` as in step 6),
     `components.tsx` (`DeniedNode` takes `Deny | SeededDeny`; `GateOutcome.Settled.decision: ClientDecision`;
     the allow check → `permits`), and `useGate.ts:37` (`isAllowed` → `permits`).
     Then run `pnpm typecheck` and fix every remaining error. Each error is a site
     that read a verdict, trace or reason off a possibly-seeded value. Fix it by
     handling the case, never with `as`.
  8. `Hydration.ts` re-exports, by name, `SeededAllow`, `SeededDeny`, `SeededDecision`,
     `ClientDecision`, `permits`, `isSeeded`, `AllowDisclosure` and `DenyDisclosure`
     from the engine (AGENTS.md §9, TS2883). Add `spec/overview.md` rows for each.
- **Steps (branch A, if chosen instead):**
  1. In `rebuild`, replace the `?? { policyTag: "AllOf" as const, … }` fallback with
     the decoded policy's `_tag`, passed in from `hydrateDecisions`' loop
     (`Hydration.ts:431-433`).
  2. Rewrite the `rebuild` doc (`:254-277`) to state the verified equality
     (root trace tag = `policy._tag`), and correct `HydrationWarning.ts:68-71`
     (C10).
  3. The `"hydrated"` reason stays, as ADR-QD-028 documents.
- **Tests:**
  - Test-first, both branches: a failing test asserting that a trace-less hand-crafted
    entry for `isAdmin` does **not** read `"AllOf"`. Under C it asserts
    `isSeeded(d) && d.disclosure._tag === "Withheld"`. Under A it asserts
    `d.trace.policyTag === "HasRole"`. Then rewrite `Hydration.test.ts:675`.
  - Branch C: a new `packages/react/test/Hydration.tst.ts` (tstyche) pins that
    `isAllowed` from `@qadi/core` rejects a `ClientDecision` argument, that
    `DeniedNode`'s function parameter is `Deny | SeededDeny`, and that
    `currentDecision` returns `ClientDecision | undefined`. Check that
    `tstyche.json` → `tsconfig.test.json` includes `packages/react/test/*.tst.ts`.
  - A `QadiProvider.test.tsx`-style render test for a seeded denial with a function
    fallback: it renders the withheld state without the literal "hydrated".
- **Verify:** `pnpm typecheck`, `node_modules/.bin/vitest run packages/react packages/core/test/Decision*.test.ts`,
  `pnpm test:tstyche`, `pnpm --filter @qadi/example-nextjs check`.
- **Done when:** success criterion 2 holds, the §7 render-sequence set passes with
  unchanged assertions, and only the §7-listed assertions changed.

### T4 — Version the payload, derive it from `DecisionWire`, and never throw on a bad envelope (D-05-c, C11)
- **Status:** [x] done
- **Depends on:** T1, T3, D-05-c
- **Files:** `packages/react/src/HydrationEngine.ts`, `packages/react/src/Hydration.ts`,
  `packages/react/src/HydrationWarning.ts` (`explain` arms), `packages/core/src/HydrationMetrics.ts`,
  `packages/devtools/src/model/Hydration.ts` (`MEANINGS`), `packages/core/test/HydrationMetrics.test.ts`,
  `packages/react/test/Hydration.test.ts`, `packages/react/test/HydrationCounts.test.ts`,
  `packages/devtools/test/model/Hydration.test.ts`, `features/features/hydration-counts/*`,
  `examples/nextjs-newsroom/e2e/ssr.spec.ts:78-86` (the leakage assertion).
- **Steps:**
  1. In the engine:
     `const DehydratedDecisionWire = DecisionWire.mapFields(Struct.omit(["subjectId", "trace", "reason"])).mapFields(Struct.assign({ disclosure: Disclosure }))`.
     If `mapFields` chaining loses types, apply one `mapFields` with a composed
     function instead. That leaves `_tag`, `evaluationId`, `durationMillis`,
     `visibleFields`, `obligations` and `disclosure`.
     Then `const DehydratedEntryWire = Schema.Struct({ policy: Schema.Unknown, resource: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)), decision: DehydratedDecisionWire })`
     and the envelope
     `const EnvelopeV2 = Schema.Struct({ version: Schema.Literal(2), subjectId: Schema.optional(Schema.String), entries: Schema.Array(Schema.Unknown) })`.
     Entries stay `Unknown` at the envelope level so that a bad entry is dropped
     per-entry, as today.
     Public types derive from these: `DehydratedEntry = typeof DehydratedEntryWire.Type`,
     `DehydratedDecisions = typeof EnvelopeV2.Type`.
  2. Keep the v1 reader. `DehydratedEntryV1Fields` is today's `DehydratedEntryFields`
     moved verbatim. `DehydratedDecisionsV1` is a deprecated public type.
     `hydrateDecisions`' parameter becomes the closed
     `DehydratedPayload = DehydratedDecisions | DehydratedDecisionsV1`. V1 entries
     rebuild with `disclosure: Withheld` always (D-05-c b).
  3. Decode order in `hydrateWith`. **Never throw.**
     - (i) If `exceedsJsonDepth(payload, MAX_DECODE_DEPTH)`, drop the whole payload
       as `EntryTooDeep`.
     - (ii) If the payload is not an object, or `version` is present but not `2`,
       drop as `UnsupportedPayloadVersion` when `version` is present and
       `MalformedPayload` otherwise.
     - (iii) Decode the envelope (v2, or v1 when `version` is absent). On failure,
       drop as `MalformedPayload`.
     - (iv) Run today's subject checks (`Hydration.ts:361-378`).
     - (v) For each entry, run the existing depth guard, then `decodeEntry` (v2 or
       v1), then `decodePolicy`, with the same drop reasons as today.
     - (vi) A `Disclosed` trace whose root `policyTag !== policy._tag` counts as
       `MalformedEntry`. That integrity check is new and is pinned by a test.
     Use `UNTRUSTED_DECODE_OPTIONS` for every decode. Keep the "collected, reported
     once per reason" shape (`Hydration.ts:436-449`).
  4. `dehydrateDecisions` writes `version: 2` and encodes each `decision` through
     `encodeDecision` from `DecisionWire.ts`, then omits `subjectId`/`trace`/`reason`
     and adds `disclosure`. This is the "derives from" requirement: no field list is
     written twice. The subject-mixing filter and counting (`:214-233`) are unchanged.
  5. Core `HydrationMetrics.ts`: add `"UnsupportedPayloadVersion"` and
     `"MalformedPayload"` to `ClientHydrationDropReason`, with doc lines, and to
     `hydrationDropReasons`, in the declared order. The metric's description
     string is **unchanged**, so the registry key is unchanged (ADR-QD-052).
     The compiler then demands the matching arm in `HydrationWarning.ts`'s
     `explain` `Match` and the matching entry in devtools' `MEANINGS` `Record`.
     Write both in the house voice ("name the fix").
  6. Update the e2e leakage test (`ssr.spec.ts:78-86`). The default page no longer
     contains `"hydrated"`. Assert that it contains `"Withheld"` and does **not**
     contain `"may read this article"`, and that the opt-in page contains it. Keep
     the test's intent (BEH-QD-147).
- **Tests:** written first wherever they reproduce a defect.
  - C11 first: `it("never throws on a malformed envelope")` over `5`, `null`,
    `{ subjectId: "u1" }` and `{ subjectId: "u1", entries: 5 }`, and a fast-check
    property over `fc.jsonValue()` asserting that `hydrateWith` returns, that
    `countSeeded + Σ countDropped` equals the number of entries it could see, and
    that the reporter got a reason. (The `fast-check` devDependency already exists:
    check `packages/react/package.json`, add via `catalog:` if absent.)
  - v1 round trip: a payload captured at `1caf04c` (from T0's scratch run, inlined
    as a JSON literal in the test) hydrates and seeds `Withheld`.
  - Unknown version: `version: 3` is dropped as `UnsupportedPayloadVersion`, counted, and reported.
  - Disclosed trace with the wrong root tag is dropped as `MalformedEntry`.
  - `HydrationMetrics.test.ts`: the preregistered key set gains exactly the two new
    words. The id, type and description pins are unchanged.
  - Devtools `model/Hydration.test.ts`: the rows include the two new reasons at zero.
  - `features/features/hydration-counts`: a scenario per new reason, tagged with the
    existing `@REQ-QD-028` (traceability for BEH-QD-230/231).
- **Verify:** `node_modules/.bin/vitest run packages/react packages/core/test/HydrationMetrics.test.ts packages/devtools/test/model/Hydration.test.ts`,
  `pnpm test:bdd`, `pnpm --filter @qadi/example-nextjs check`, `pnpm circular`.
- **Done when:** success criteria 3, 7 and 8 hold, the newsroom e2e is green with
  only the leakage assertion edited, and no `Schema.Struct` in `@qadi/react`
  restates `evaluationId`/`durationMillis`/`visibleFields`/`obligations` by hand.

### T5 — Let the atom set own hydration and remove the side channel (D-05-b = c)
- **Status:** [x] done
- **Depends on:** T2, T4, D-05-b
- **Files:** `packages/react/src/QadiAtoms.ts`, `packages/react/src/HydrationEngine.ts`,
  `packages/react/src/Hydration.ts`, `packages/core/src/HydrationMetrics.ts`,
  `packages/react/src/HydrationWarning.ts`, `packages/devtools/src/model/Hydration.ts`,
  `examples/nextjs-newsroom/app/edge/unregistered/page.tsx`, `examples/nextjs-newsroom/src/client/Unregistered.tsx`,
  `examples/nextjs-newsroom/test/hydration.test.ts`, `examples/nextjs-newsroom/e2e/ssr.spec.ts:191-198`,
  `examples/nextjs-newsroom/app/page.tsx:51`, `examples/nextjs-newsroom/src/ui/Shell.tsx:27`,
  `features/features/hydration-counts/hydration-counts.feature:41` (+ steps),
  `packages/react/test/Hydration.test.ts:563-572`, `packages/react/test/HydrationCounts.test.ts`,
  `packages/core/test/HydrationMetrics.test.ts`, `AGENTS.md` §13.
- **Steps:**
  1. Add `readonly hydrate: (dehydrated: DehydratedPayload, subject: AuthSubject, options?: HydrateOptions) => InitialValues`
     to the `QadiAtoms` interface. Write the doc comment: it is the capability
     `hydrateDecisions` calls, prefer `hydrateDecisions`, and the seed atoms stay
     closure-private (ADR-QD-039).
  2. In `makeQadiAtoms`, `hydrate: (d, s, o) => hydrateWith((policy, resource) => resource === undefined ? bare(policy).seed : byResource(policy)(resource).seed, d, s, o)`.
     This replaces `registerHydrationSeeds` (`QadiAtoms.ts:629-631`). Delete the
     engine's private `WeakMap`, `registerHydrationSeeds` and `hydrationSeedFor`.
  3. `Hydration.ts`: `hydrateDecisions = (atoms, dehydrated, subject, options) => atoms.hydrate(dehydrated, subject, options)`.
     The parameter type stays `QadiAtoms`, which is a type-only import and acyclic
     because `QadiAtoms.ts` imports only the engine.
  4. Remove `"UnregisteredAtoms"` from `ClientHydrationDropReason` and
     `hydrationDropReasons` (core). The compiler then flags the arm in
     `HydrationWarning.ts`'s `explain` and the key in devtools' `MEANINGS`; delete both.
  5. Newsroom: rework `/edge/unregistered` into `/edge/wrapped-atoms`, which shows
     that a spread copy seeds the same questions (registered-count 1, copy-count 1).
     Update the index (`app/page.tsx:51`), the shell nav (`Shell.tsx:27`), the unit
     test (`test/hydration.test.ts:206`), and the e2e (`ssr.spec.ts:191-198`)
     → `test("a copy of the atom set seeds the same questions", …)`.
  6. AGENTS.md §13: in "`GateRegistry.ts` is a module-scope map … the shape
     `HydrationSeed.ts` already uses", drop the `HydrationSeed.ts` reference, since
     `GateRegistry.ts` is now the only module-scope map. Also fix
     `GateRegistry.ts:18`'s matching comment.
- **Tests:**
  - Rewrite `Hydration.test.ts:563-572` as "a spread wrapper seeds the real questions".
    Assert that `hydrateDecisions({ ...atoms }, payload, alice)` returns one entry
    and that `currentDecision` reads the seed in the seed window.
  - Add: a hand-built test double implementing `QadiAtoms` with its own `hydrate`
    seeds only what its own `hydrate` returns. That documents that the double is
    the caller's own code, not a trust crossing.
  - `HydrationCounts.test.ts`/`HydrationMetrics.test.ts`: the `UnregisteredAtoms`
    key is absent from the preregistered set.
  - Feature: replace the `UnregisteredAtoms` scenario with the wrapper scenario.
- **Verify:** `node_modules/.bin/vitest run packages/react packages/core packages/devtools`, `pnpm test:bdd`,
  `pnpm circular`, `pnpm --filter @qadi/example-nextjs check`.
- **Done when:** `grep -rn "UnregisteredAtoms\|HydrationSeed" packages/*/src examples features --include='*.ts' --include='*.tsx' --include='*.feature'`
  prints nothing, and every gate above is green.
- **If D-05-b = a:** skip this task. T2 already moved the `WeakMap` into the engine.

### T6 — One subject equivalence (D-05-d = c)
- **Status:** [x] done
- **Depends on:** T0, D-05-d
- **Files:** `packages/core/src/AuthSubject.ts`, `packages/core/test/AuthSubject.test.ts`,
  `packages/react/src/QadiAtoms.ts`, `packages/core/src/DecisionCache.ts` (doc only), `spec/overview.md`.
- **Steps:**
  1. In `AuthSubject.ts`, add
     `export const subjectEquivalence: Equivalence.Equivalence<AuthSubject> = (a, b) => Equal.equals(a, b)`
     (`import * as Equal from "effect/Equal"`, `import type * as Equivalence from "effect/Equivalence"`).
     Doc: the summary line, then the why. It is the key semantics `DecisionCache`
     relies on (INV-QD-030/033), `Set`s compare by content, and a nested attribute
     object compares structurally.
  2. In `QadiAtoms.ts`, delete `subjectsEqual` (`:303-346`). Use
     `Atom.withEquality((a, b) => a === b || (a !== undefined && b !== undefined && subjectEquivalence(a, b)))`.
  3. Point `DecisionCache.ts:53-74`'s prose at `subjectEquivalence` as the named form
     of the same rule. Leave the `rc.116` mention to its own owner, or update it to
     `4.0.0` if re-verified (probe 5b re-verified it).
  4. Add an overview row.
- **Tests:** `AuthSubject.test.ts` covers equal subjects built twice, `Set` order,
  nested attribute objects equal by structure, a differing role, and a differing
  nested attribute. `QadiAtoms.test.ts:110` ("does not re-decide when a fresh but
  structurally equal subject…") passes **unchanged**. Add one test: a fresh subject
  whose nested attribute object is equal does not re-decide. That fails under
  today's `subjectsEqual` and passes after.
- **Verify:** `node_modules/.bin/vitest run packages/core/test/AuthSubject.test.ts packages/react/test/QadiAtoms.test.ts`.
- **Done when:** `grep -n "subjectsEqual" packages/react/src` is empty and both suites pass.

### T7 — Rewrite the `asked` JSDoc and the stale hydration doc claims
- **Status:** [x] done
- **Depends on:** T2
- **Files:** `packages/react/src/QadiAtoms.ts:103-157`, `packages/react/src/HydrationWarning.ts:62-78`,
  `packages/react/src/HydrationEngine.ts` (moved docs).
- **Steps:**
  1. Replace `asked`'s JSDoc with a current-state description. Lead line: "Every
     question this atom set has been asked, in the order first asked." Then: it is
     keyed by question because `Atom.family` keys structurally, and gate instances
     live in `GateRegistry.ts`, which a host subscribes to (`Dock.tsx:127`), per
     AGENTS.md §13 and ADR-QD-053. Read verdicts via `decision`/`decisionFor`
     (ADR-QD-017). It is bounded by `sweepEvictions` and `maxTrackedQuestions`.
     Correction history goes into the CCR entry, not the comment: the CCR records
     DA-03 and the CCR-QD-073/076 corrections by id. No "Correction:" paragraphs
     stay in source.
  2. `HydrationWarning.ts:68-72`: state the verified fact (C10). Under D-05-a = C,
     a seed carries no trace unless disclosed, so only the client's trace can name
     the policy. Under A, a seed's root tag is real, but only the client's trace is
     the evaluation in effect.
- **Tests:** none (docs). The mutation and coverage gates are unaffected.
- **Verify:** `node scripts/check-house-style.mjs`, `oxlint`.
- **Done when:** `grep -n "Correction" packages/react/src/QadiAtoms.ts` is empty.

### T8 — Specification, ADR, CCR, website and changeset
- **Status:** [x] done
- **Depends on:** T1–T7 (written alongside each, landed together)
- **Files:** see §8 for the full list.
- **Steps:** do every item in §8. Write ADR-QD-NEXT from §8's outline. Then add the
  changeset: `pnpm changeset`, select `@qadi/core` and `@qadi/react` (the fixed group
  bumps them all), minor, with a body that says **breaking** and lists
  `ClientDecision`, the `DeniedNode` parameter, `currentDecision`'s return type,
  `DecisionResult`, `HydrationMismatch.seeded`, the drop-reason set, `QadiAtoms.hydrate`
  and the payload `version`. Include the fail-closed note about `_tag === "Allow"`
  comparisons (D-05-a).
- **Tests:** gates 9, 10, 11, 12, 13 and 22.
- **Verify:** `pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && pnpm spec:api && pnpm spec:website-examples`.
- **Done when:** all six commands pass.

### T9 — Tighten `DecisionWire` into a tagged union (D-05-e = b, separable)
- **Status:** [x] done
- **Depends on:** T1, T4, D-05-e
- **Files:** `packages/core/src/DecisionWire.ts`, `packages/core/test/DecisionWire.test.ts`,
  `packages/core/test/SinkCodec.test.ts`, `packages/react/src/HydrationEngine.ts` (re-derive),
  `spec/behaviors/24-*.md` or wherever BEH-QD-199 lives (`grep -rn "BEH-QD-199" spec/behaviors`).
- **Steps:**
  1. `DecisionWire = Schema.Union([Schema.TaggedStruct("Allow", { …, visibleFields: optional, obligations }), Schema.TaggedStruct("Deny", { …common, reason: Schema.String })])`.
     The shared fields are one `const common = { evaluationId, subjectId, durationMillis, trace }`
     spread into both.
  2. `decodeDecision` becomes a `Match.tagsExhaustive` and the `"denied"` fallback is
     deleted. `encodeDecision` is unchanged in output.
  3. Re-derive the hydration entry per variant
     (`Schema.Union([AllowWire.mapFields(...), DenyWire.mapFields(...)])`), so that
     `Withheld` on a deny also removes `reason` structurally.
- **Tests:** T1's golden tests must pass **unchanged** (identical bytes). New tests:
  a Deny without `reason` fails decode, and an Allow carrying `reason` fails decode
  under `UNTRUSTED_DECODE_OPTIONS`.
- **Verify:** `node_modules/.bin/vitest run packages/core/test/SinkCodec.test.ts packages/core/test/DecisionWire.test.ts`,
  `pnpm mutation` (core Stryker ≥ 80%).
- **Done when:** `grep -n "\"denied\"" packages/core/src` is empty and the goldens are unchanged.

### T10 — Full merge gate
- **Status:** [x] done (partial pnpm check, see log)
- **Depends on:** T1–T9 (T5/T9 only if their decisions were taken)
- **Files:** none.
- **Steps:** run `pnpm check` (gates 1–24, `spec/process/definitions-of-done.md`).
  Pay particular attention to gate 5 (`madge --circular --extensions ts,tsx packages/*/src`),
  gate 13 (`node scripts/check-api-surface.mjs`), gate 15
  (`pnpm --filter @qadi/example-nextjs check`), gate 16 (`stryker run`, which covers
  core's `DecisionWire.ts`) and gate 17 (`stryker run stryker.devtools.mjs`, because
  the devtools `MEANINGS` changed).
- **Tests:** everything.
- **Verify:** `pnpm check`.
- **Done when:** green. Record the final test counts against T0's baseline in §10.

## 7. Test strategy

**Unchanged, assertions included (the render-sequence and precedence set):**

- `packages/react/test/QadiAtoms.test.ts`: every test, including `:110` (subject
  equality) under T6, and the sweep tests `:270-416`, which are untouched because
  eviction is untouched.
- `packages/react/test/QadiProvider.test.tsx`: every test.
- `packages/react/test/Hydration.test.ts`: `:524-561` ("DOES NOT LET A HYDRATED
  ALLOW OUTLIVE…", whose `_tag` reads are the client's own `Deny`), `:735-757`,
  `:759-768`, `:796-815`, `:816-855` ("A FAILURE IS NOT A DISAGREEMENT"), `:857-876`,
  `:878-914` ("once per REGISTRY"), `:916-994` (console/production), `:1011-1065`
  (evaluation-id continuation), and `:1067-1134` ("a re-check that settles
  asynchronously"). Exceptions: `:747`, `:1129` and `:770-794` read `seeded._tag`;
  under D-05-a = C they change from `"Allow"` to `"SeededAllow"`, and those are
  the only edits in that range.
- `packages/react/test/ServerRender.test.tsx`, `GateRegistry.test.tsx`, `edges.test.tsx`
  and `v4-reactivity-smoke.test.ts`: unchanged. If `edges.test.tsx` reads a seeded
  `_tag`, it joins the changed list below, with the line recorded in §10.
- `packages/core/test/SinkCodec.test.ts`: unchanged. Golden tests are added.
- Newsroom e2e (`examples/nextjs-newsroom/e2e/ssr.spec.ts`, `lens.spec.ts`): unchanged
  apart from `:78-86` (T4) and `:191-198` (T5). The render-sequence assertion
  `:186-189` (`"Success,Initial+waiting,Success"`) and "a disagreement with the
  seed is announced" (`:306-318`) are unchanged.

**Changed on purpose (each pins a defect or a sentinel being removed):**

| Test | Line(s) | Why |
| ---- | ------- | --- |
| `Hydration.test.ts` "WITHHOLDS the trace…" | `:138-139` | asserts the `"hydrated"` sentinel and a reduced `trace`; becomes `decision.disclosure._tag === "Withheld"` and no reason on the wire |
| `Hydration.test.ts` seed-window reads | `:293`, `:307`, `:329`, `:520`, `:581`, `:635-636`, `:696-697` | `_tag` `"Allow"`/`"Deny"` → `"SeededAllow"`/`"SeededDeny"` (D-05-a = C only) |
| `Hydration.test.ts` "uses the disclosed trace…" | `:607-608` | reads `.trace`/`.reason` off the seed; becomes `disclosure._tag === "Disclosed"` and `disclosure.reason` |
| `Hydration.test.ts` "tolerates a hand-crafted payload…" | `:667-675` | **pins the `"AllOf"` leak**; becomes "a v1 trace-less entry seeds `Withheld`" (C), or `policyTag === "HasRole"` (A) |
| `Hydration.test.ts` "seeds nothing for an atom set it did not build" | `:563-572` | D-05-b = c only: becomes "a spread wrapper seeds the real questions" |
| `Hydration.test.ts` mismatch `seeded._tag` | `:747`, `:1129` | `"SeededAllow"` (C only) |
| `hooks.test.tsx` | `:595` | `seeded: "SeededAllow"` (C only) |
| `HydrationCounts.test.ts`, `HydrationMetrics.test.ts` | drop-reason key sets | ± reasons per D-05-b/D-05-c |
| e2e `ssr.spec.ts` | `:78-86`, `:191-198` | the `"hydrated"` literal no longer ships; the unregistered demo becomes the wrapper demo |

**Added:**

- `packages/core/test/DecisionWire.test.ts`: unit and round-trip tests. They sit in
  core's Stryker scope (gate 16), so write them to kill mutants on the
  `visibleFields` omission and the verdict branch.
- `packages/react/test/HydrationEngine.test.ts`: `track` runs before any `get`;
  per-registry announce state.
- A property test (fast-check) that `hydrateDecisions` never throws on any JSON
  value, plus an accounting property: `seeded + Σ dropped == entries visible`, for
  the reasons that drop per entry. This pins INV-QD-045 and C11.
- A **differential** test: for 50 generated policies (reuse core's existing policy
  arbitrary if one is exported to tests; otherwise a small hand set covering all
  16 `Policy` tags), `decide` on the server → `dehydrateDecisions` (with and without
  `includeTrace`) → JSON round trip → `hydrateDecisions`, with the seed read in the
  seed window. Assert that `permits(seed) === isAllowed(serverDecision)`,
  `visibleFields` are equal, obligations are equal, `evaluationId` is equal
  (BEH-QD-148), and that a `Disclosed` trace deep-equals the server's.
- `packages/react/test/Hydration.tst.ts` (tstyche): the `ClientDecision` closedness
  and `isAllowed` rejection (C only).
- Feature scenarios for `UnsupportedPayloadVersion` and `MalformedPayload`.

**Deleted (replace, don't layer):** nothing is deleted outright. The
`UnregisteredAtoms` scenario and unit test are *replaced* by the wrapper
scenarios (T5), so the suite does not keep a test for an unreachable path.

**Mutation (Stryker):** `@qadi/react` is outside every Stryker config
(`spec/process/definitions-of-done.md`, gates 16–21), so the engine's mutation
resistance rests on the property and differential tests above. Moving the codec's
*shape* into core's `DecisionWire.ts` puts it under gate 16 (≥ 80%). That is part
of the leverage this plan buys. Devtools' `MEANINGS` changes are under gate 17.
Its existing test, which covers each reason row, must cover the new rows, or the
mutation gate flags the strings.

**Coverage:** react ≥ 90%, core ≥ 95% (`vitest.config.ts`). The v1 reader must be
fully covered by the v1 round-trip test and the malformed-v1 cases, or it is dead
weight until its removal.

## 8. Spec and documentation updates

`spec/` is normative (AGENTS.md §11). Land these with the code.

- **ADR-QD-NEXT** (*new*, `spec/decisions/NNN-a-seed-is-its-own-type-and-the-payload-is-versioned.md`,
  plus a `spec/decisions/index.yaml` entry). Context: C2, C5, C6, C10, C11. Decision:
  the D-05-a/b/c/d/e outcomes. Alternatives: B and C′ (D-05-a), and d (D-05-b),
  with the reasons given in §5. Consequences: the breaking types, the v1 deprecation
  window, and the fail-closed `_tag` note.
- **Amend ADR-QD-028** (Change History row, `CCR-QD-NEXT`). The "Serializing the
  whole `Decision`" alternative is overtaken (BEH-QD-199). The payload is now
  versioned. "a `Deny`'s reason by a fixed `"hydrated"`" is superseded by
  `Disclosure.Withheld` (if C).
- **Amend ADR-QD-039.** The seed lives in `HydrationEngine.ts`. The lookup is a
  closure capability of the atom set (if D-05-b = c), and `HydrationSeed.ts` is
  removed.
- **Amend ADR-QD-041.** `HydrationMismatch.seeded` is a `SeededDecision` (if C).
  Correct the "stand-in naming nothing" reason (C10) in a `>` blockquote under a
  correction, preserving the original.
- **Amend ADR-QD-052.** The drop-reason table (the `HydrationDropReason` key set).
  The five metrics are unchanged.
- **`spec/behaviors/19-hydration.md`:**
  - BEH-QD-147: withholding is `Disclosure.Withheld`; no reason or trace ships.
  - BEH-QD-148: the projection type is `SeededAllow`/`SeededDeny`.
  - BEH-QD-149: a seed reads as a non-`waiting` success carrying a `SeededDecision`.
  - BEH-QD-152: the `ts` listing for `HydrationMismatch`, and the corrected reason
    for naming from `decided.trace`.
  - BEH-QD-230: the five or six hydrate-side exits, renumbered, with the
    reason-count prose updated to match the union.
  - New **BEH-QD-NEXT** "A payload is versioned, and an older one is read as
    withheld". New **BEH-QD-NEXT** "A malformed envelope is dropped, never thrown on"
    (C11).
  - Every `typescript` fence must still compile (gate 9).
- **`spec/behaviors/09-react.md`:** `DecisionResult`, `currentDecision`, `DeniedNode`,
  `useDecisionSuspense`, `useProjected` (`permits`/`projectVisible`), and subject
  equality (if T6).
- **`spec/invariants.md`:**
  - INV-QD-028 **Source**: `QadiAtoms.ts` → `HydrationEngine.ts`'s `makeSeededQuestion`.
  - INV-QD-022: the verified fields are now the v2 schema, plus the root-tag
    integrity check.
  - INV-QD-045: the reason set.
  - New **INV-QD-NEXT** "A seeded decision never claims a trace it was not given",
    enforced by the C-branch types and the differential test.
- **`spec/traceability.md`:** a Change History row (`CCR-QD-NEXT`). §1 behaviour-19
  row: the new BEH ids. §2 rows for INV-QD-NEXT and INV-QD-028's moved source. §3
  row for ADR-QD-NEXT. §4 rows for `DecisionWire.test.ts`, `HydrationEngine.test.ts`,
  `Hydration.tst.ts` and the edited `Hydration.test.ts`/`HydrationCounts.test.ts`.
  §5: the `hydration-counts.feature` scenario changes under `@REQ-QD-028`.
  `bash spec/scripts/verify-traceability.sh --strict` (gate 10) must pass.
- **`spec/overview.md`** (gate 13):
  - Core: add `DecisionWire`, `encodeDecision`, `decodeDecision`, `projectVisible`
    and `subjectEquivalence`, and update the `ClientHydrationDropReason` row's
    description.
  - React: add `SeededAllow`, `SeededDeny`, `SeededDecision`, `ClientDecision`,
    `permits`, `isSeeded`, `AllowDisclosure`, `DenyDisclosure`, `DehydratedPayload`
    and `DehydratedDecisionsV1` (deprecated). Change the `InitialValues` Source to
    "declared in `HydrationEngine.ts`, re-exported from `QadiProvider.tsx`". Note
    `QadiAtoms.hydrate` in the `QadiAtoms` row. Add a Change History row.
- **`spec/devtools-spec/adr-draft-unified-stream.md:86-91`:** rewrite the "Still
  open" bullet. A withheld seed is now a tagged `Withheld`, so there is no
  fabricated tag, and the "AllOf" claim was only ever true of trace-less
  payloads. Keep the superseded text as a `>` blockquote, which gate 12 exempts.
  Then run `node scripts/check-devtools-claims.mjs`.
- **`spec/appendices/react-integration.md`:** any `currentDecision`/`Decision` signatures there.
- **AGENTS.md §13:** the `HydrationSeed.ts` sentence (T5 step 6). If the
  `decisions … read through currentDecision` bullet names types, update it to
  `ClientDecision`.
- **`apps/website/src/content/docs/docs/packages/react/hydration.md`,
  `…/react/hooks.md`, `…/react/index.md` and `…/concepts/hydration-reactivity.md`:**
  the withheld wording (`hydration.md:119`), any code fences reading `.trace`/`.reason`
  off a hook result, the `version` field, and the drop reasons. Gate 22
  (`node scripts/check-website-doc-examples.mjs`) compiles them.
- **`examples/nextjs-newsroom/README.md`:** the `/edge/unregistered` →
  `/edge/wrapped-atoms` route, and the leakage page's description.
- **CHANGELOG:** generated from the T8 changeset. Hand edits go only in the changeset body.
- **CCR-QD-NEXT:** one CCR covers the whole change. It records DA-03 and the
  CCR-QD-073/076 history removed from `QadiAtoms.ts` comments (T7).

## 9. Risks and rollback

| Risk | How it shows up | Mitigation / rollback |
| ---- | --------------- | --------------------- |
| Moving the reader body changes `get`/`get.once` order, which shifts notification or batching and breaks a render sequence | `QadiProvider.test.tsx`, `Hydration.test.ts:1067-1134`, or e2e `ssr.spec.ts:186-189` (`"Success,Initial+waiting,Success"`) fails | T2 is a verbatim move with `track` first and lands alone, with zero test edits as its done-when. Revert T2's commit to roll back. |
| A new `import type` creates a cycle | gate 5 (`pnpm circular`) fails | §4's edge list. `InitialValues` moves into the engine (T2 step 2). The engine never imports `Hydration`, `QadiAtoms` or `QadiProvider`. |
| An engine export leaks into the barrel | gate 13 fails on an unlisted name, or a seed atom becomes reachable | The engine is not in `index.ts`. `Hydration.ts` re-exports **by name** only. Check `grep -n "HydrationEngine" packages/react/src/index.ts` (expect empty). |
| D-05-a = C breaks downstream `_tag === "Allow"` checks silently | A seeded allow renders as not-allowed: the flash returns, but no grant is made | The changeset calls it breaking and names the fail-closed behaviour. `permits` is the documented read. The tstyche test pins that `isAllowed` rejects `ClientDecision`. Roll back by reverting T3, or by taking branch A. |
| `DecisionWire` move changes `SinkRecordWire` bytes, which breaks a mixed-version devtools socket or audit forwarder | T1 golden test fails | Goldens are captured at T0. T1 is a move. T9 is gated on the goldens being unchanged. Roll back T9 independently. |
| `mapFields`/`Struct.omit` loses optionality typing | `DehydratedEntry` type drifts from the old interface; `pnpm typecheck` fails in the newsroom | Fall back to `Schema.Struct({ ...Struct.omit(DecisionWire.fields, [...]), disclosure })`, which still derives from the same field schemas. |
| The v1 reader lingers forever | dead code under the coverage floor | A follow-up issue is filed at landing. ADR-QD-NEXT states the removal release. |
| Removing `UnregisteredAtoms` breaks a consumer's exhaustive `Match` over drop reasons | compile error downstream | Intended (closed union, 0.x minor, stated in the changeset). To roll back, take D-05-b = a and restore the reason. |
| A sibling ARCH plan edits `SinkCodec.ts`, `QadiAtoms.ts` or `HydrationMetrics.ts` concurrently | merge conflicts, or a duplicated `DecisionWire` | Check `.planning/architecture/` for plans touching those files before T1/T2. Whichever lands second rebases onto `DecisionWire.ts`. |
| The newsroom e2e is flaky under real network timing (CCR-QD-150's history) | gate 15 red, unrelated to this plan | Re-run once. If the failure reproduces, bisect T2 first, because it is the only task that touches the reader. |

Rollback granularity: every task is one commit. T2 and T1 are behaviour-neutral
and can stay even if T3–T5 are reverted. T9 is independent of T3–T5.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-04 | — | Plan written; evidence verified at `1caf04c` (C1–C13; C10 refutes a doc claim, C11 is a new defect); baseline 181/181 tests green on the seven hydration-related files; madge green | Claude (planning agent) |
| 2026-10-04 | T0 | Baseline at c75220e (newer than 1caf04c; diff touches only stryker configs/ci): 181/181 on the seven files, madge green. Golden strings captured and inlined in SinkCodec.test.ts | Claude (implementing agent) |
| 2026-10-04 | decisions | D-05-a..e all taken at the recommended option (C, c, b, c, b), recorded in §5 | Claude (implementing agent) |
| 2026-10-04 | T1 | DecisionWire.ts extracted; goldens + DecisionWire.test.ts; overview rows. typecheck/lint/circular/api-surface green | Claude (implementing agent) |
| 2026-10-04 | T2 | `HydrationEngine.ts` created (private); `seededDecision` moved verbatim, `track` callback runs first inside the same reader; `HydrationSeed.ts` folded in and deleted; `InitialValues`/`isMismatch` moved; `HydrationEngine.test.ts` added. React suite and newsroom e2e green with zero existing-test edits. NB: an api-surface regression from the re-export form (`export type { X };` is unsupported by gate 13) was fixed in the T6 commit | Claude (implementing agent) |
| 2026-10-04 | T6 | `subjectEquivalence` in core over `Equal.equals`; `QadiAtoms` uses it; `subjectsEqual` deleted; new nested-attribute test fails before and passes after; `QadiAtoms.test.ts:110` unchanged | Claude (implementing agent) |
| 2026-10-04 | T9 (done before T4, deviation) | `DecisionWire` is a tagged union (`DecisionWireAllow`/`DecisionWireDeny` exported); goldens unchanged; the `"denied"` sentinel deleted; the `SinkCodec.test.ts` test pinning it was replaced by two refusal tests (a Deny without a reason, an Allow with one). `projectVisible` added to core (T3 step 6) in the same commit | Claude (implementing agent) |
| 2026-10-04 | T3+T4 (one commit, deviation) | The seed's `disclosure` and the v2 entry are one wire shape, so landed together. `SeededDecision.ts` is a new leaf module (not in the plan's layout) because `HydrationWarning.ts` names a `SeededDecision` and madge counts a type-only cycle through the engine. `permits` is an exhaustive-`Match` wrapped in a type predicate so the denial branch narrows. Whole-payload `exceedsJsonDepth` check applies to the envelope minus its entries (MalformedPayload); per-entry guard unchanged. Payload-level drops count at least one. `HydrateOptions`/`HydrationDropReporter` are `<unknown>`. Test edits listed in the final report | Claude (implementing agent) |
| 2026-10-04 | T5 | `QadiAtoms.hydrate` closure; `hydrateDecisions` delegates; `registerHydrationSeeds`/`hydrationSeedFor`/the `WeakMap` removed; `UnregisteredAtoms` removed from core, `explain`, devtools `MEANINGS`, features, newsroom (`/edge/unregistered` -> `/edge/wrapped-atoms`), AGENTS.md section 13 (ADR-QD-077 cited). Newsroom e2e 26/26 | Claude (implementing agent) |
| 2026-10-04 | T7 | `asked` JSDoc rewritten to current state; history recorded in CCR-QD-153; no `Correction` left in `QadiAtoms.ts` | Claude (implementing agent) |
| 2026-10-04 | T8 | ADR-QD-077 (note: number chosen as next free; ARCH-06 may also claim it), ADR-028/039/041/052/053 amended, BEH-QD-264/265, INV-QD-058, CCR-QD-153, traceability 1.72, overview 1.25, devtools draft, react appendix, website hooks/hydration docs, changeset `.changeset/hydration-seed-is-its-own-type.md` (core, react, devtools minor). spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:website-examples green | Claude (implementing agent) |
| 2026-10-04 | T10 | Ran, individually: typecheck, lint, circular, test:tstyche, coverage (thresholds met; 2312 tests), test:bdd (472), spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, example (typecheck, 14 unit, build, e2e 26/26), spec:website-examples, website, spec:publish: all green. Mutation: core 92.09% (DecisionWire.ts 100%), devtools 98.20%. NOT run: the predicate-sql/predicate-prisma/audit/http Stryker configs (untouched by this change). Final test count 2312 vs 181 on the seven-file baseline (that set is 215 + new files now). One flake seen once: `FieldPath.test.ts` stack-depth tests time out when core/http/audit/devtools run in one vitest process under load, pass alone | Claude (implementing agent) |
