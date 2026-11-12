# Architecture Research: v1.3 Arch Wave 8 (Phases 30-35)

**Domain:** Effect v4 authorization library, six deepenings of an existing pnpm monorepo
**Researched:** 2026-11-12, against base `aab87576` (branch `arch-wave-8`)
**Confidence:** HIGH for 30, 31, 32, 34 (read the code, ran `madge`, checked ADRs); MEDIUM for 33 (one real decision: clock vocabulary and bundle weight); LOW-MEDIUM for 35 (mechanism unproven, as the review said)

Vocabulary: module, interface, seam, depth, locality, leverage (codebase-design). Line numbers are at `aab87576`; each planner re-verifies.

## Verified facts that shape every phase

- `pnpm circular` (`madge --circular --extensions ts,tsx packages/*/src`) is **green at base** (210 files). madge counts type-only edges (ADR-QD-037), so every proposed `import type` below was checked against the real graph (`madge --json`), not guessed.
- The public surface is the barrel plus `spec/overview.md` (gate 13). A module out of the barrel is not importable from another package (ADR-QD-099). **Any helper that `@qadi/react` or `@qadi/audit` must call has to be in `@qadi/core`'s barrel, i.e. public.** This single fact decides Phase 30's placement.
- Precedent for "move a public name's declaring module": ADR-QD-116 moved the JSON refusal vocabulary to a new public leaf `JsonRefusal.ts` and **did not re-export from the old module** ("its own path is not public, so a re-export would only be a second module naming one concept"). Reuse that ruling for 30 and 32.
- Same-symbol duplicates through two `export *` barrel lines compile (checked with `tsc`, exit 0). So a re-export is *possible*, just not wanted; gate 13 (`check-api-surface.mjs`) must still be run, since it was not.
- Barrel order is gated alphabetically (`[barrel-order]`, `check-house-style.mjs:1663`). New core modules land at: `EvaluationServices.ts` before `EvaluationServicesNone.ts`; `SealedEvaluation.ts` between `Role.ts` and `SecurityLabel.ts`; `UntrustedDecode.ts` after `TraceDiff.ts`.

## Core import layering (the part 30, 32 and 33 must respect)

```
 leaves (effect only)        DecodeDepthGuard.ts   JsonRefusal.ts   EvaluationId.ts   PortName.ts
        |                          |                    |
        v                          v                    v
 NEW  UntrustedDecode.ts  <- DecodeDepthGuard            JsonHazard.ts -> JsonRefusal
        |                                                |
        v                                                v
 Policy.ts (-> TreeFold, Matcher, ...)           PortWireEncode.ts   (drops its Policy.ts edge)
        |                                                |
        +-> Question.ts (QuestionOptions + NEW EvaluateOptions)    PortRemote.ts
        |        ^                                       
 NEW EvaluationServices.ts (type-only: CurrentSubject, EvaluationId, Ports)
        |        ^
        |        +-- Lifecycle.ts (drops LifecycleOptions + hand-spelled union)
        |        +-- EvaluationServicesNone.ts (drops its Evaluate.ts edge)
        v
 Evaluate.ts (evaluate only) -> Qadi.ts, SubjectSet.ts, GuardHealthCheck.ts
 NEW SealedEvaluation.ts (-> DecisionSink, DecisionCache, EvaluationId, Ports, EvaluationServices)
```

Reachability checked: `Ports.ts`, `CurrentSubject.ts`, `EvaluationId.ts` do **not** reach `Question.ts`, `Evaluate.ts` or `Lifecycle.ts`, so none of the new type edges closes a cycle.

---

## Phase 30: one strict-decode module (ARCH-78, ADR-QD-143)

### Where it lives: a new **public** core leaf, `packages/core/src/UntrustedDecode.ts`

Public, not package-private. `@qadi/react`'s `HydrationEngine.ts` and `@qadi/audit`'s `AuditArchive.ts`/`AuditEntry.ts` are in other packages, and ADR-QD-099 makes "out of the barrel" mean "not importable". A package-private module would leave those three call sites with the half-recipe (`UNTRUSTED_DECODE_OPTIONS`) and defeat the purpose (a new seam gets the guard by default). BEH-QD-259 already requires the guard to be barrel-reachable "because `@qadi/react` has no reason to reach into core's module layout"; this extends that reasoning to the whole recipe.

It is a **leaf**: imports `effect/*` and `DecodeDepthGuard.ts` only. `Policy.ts` imports it, not the reverse, so there is no cycle risk. It must not import `Errors.ts`/`SinkWire.ts`/`Policy.ts` (it declares its own refusal union instead).

It is **not** an entry point (no `exports` map change, so no edit to `spec/overview.md`'s "Entry points" table; that table lists only `@qadi/devtools/react`). The edit is rows in the Policy table (Public API surface, gate 13).

### Interface (opinionated)

```ts
// UntrustedDecode.ts: the whole recipe: parse (text only) -> depth guard -> strict decode
export const MAX_DECODE_DEPTH = 256;                 // moved here, see "constants" below
export const UNTRUSTED_DECODE_OPTIONS: SchemaAST.ParseOptions = { onExcessProperty: "error" };

export type UntrustedRefusal = Data.TaggedEnum<{
  NotJson:   { readonly message: string };            // text did not parse
  TooDeep:   { readonly maxDepth: number };           // guard refused before Schema recursed
  Malformed: { readonly message: string; readonly error: Schema.SchemaError };
}>;
export const UntrustedRefusal = Data.taggedEnum<UntrustedRefusal>();

export interface UntrustedDecoderOptions<R = never> {
  readonly maxDepth?: number;                         // default MAX_DECODE_DEPTH; the wire bound is the same constant
  /** Top-level keys whose value this schema holds as Schema.Unknown and a second decoder guards itself. */
  readonly unwalked?: ReadonlyArray<string>;
  /** Seam-specific step run after the guard, before the strict decode (sink: version check + envelope projection). */
  readonly prepare?: (input: unknown) => Result.Result<unknown, R>;
}
export interface UntrustedDecoder<A, R = never> {
  readonly decode: (input: unknown) => Result.Result<A, UntrustedRefusal | R>;
  readonly decodeText: (text: string) => Result.Result<A, UntrustedRefusal | R>;
}
export const untrustedDecoder: <A, I, R = never>(
  schema: Schema.Codec<A, I>, options?: UntrustedDecoderOptions<R>) => UntrustedDecoder<A, R>;
```

Why this shape (depth, leverage): the interface is `schema -> decoder`; the guard cannot be omitted because `decode` is the only way in. Built once at module scope (the same hoisting every seam does today with `Schema.decodeUnknownResult(...)`). `Result`, not `Option`/`Effect`, because five of the ten sites already return `Result` and the two that differ (`Policy` -> `Effect`, hydration -> `Option`) adapt in one line. The refusal union is a `Data.taggedEnum` exactly like `DecodeRefusal` and `EncodeRefusal`, so a seam maps it with `Match.tagsExhaustive` and a new arm is a compile error at every seam.

### Two findings the review did not have (both change the design)

1. **A guard over the whole input is wrong for envelopes that hold an opaque slot.** `AuditArchive.ArchiveEnvelope.entries` and `AuditEntry.decodeRow`'s `record` are `Schema.Unknown`; they are decoded by `decodeAuditEntry` -> `decodeSinkRecord`, which guards *from the record's own root*. A record exactly `MAX_DECODE_DEPTH` deep passes `decodeSinkRecord` today; as `bundle.entries[i].record` it sits 3 levels deeper, and as `row.record` 1 level deeper, so a blanket guard would refuse bundles the writer writes (breaking INV-QD-130's "every bundle the writer writes reads back" at the boundary). Hydration already works around this: `HydrationEngine.ts:440` guards `{ ...payload, entries: [] }`. That workaround **is** the `unwalked` option; it moves inside and the copy disappears. Each `unwalked` key gets a test asserting its schema slot really is `Schema.Unknown`.
2. **The "audit now refuses `TooDeep`" behaviour change is vacuous if `unwalked` is used.** Every non-`Unknown` slot in the archive envelope is a primitive or a flat struct, and the strict decode already refuses a deep value there as `Malformed`. So map `TooDeep -> ArchiveRefusal.Malformed({ message })` and the public `ArchiveRefusal` union does **not** widen (adding an arm would be a public-union widening; the user's standing rule is the full union, so avoid needing it). `recordJsonOf` (`AuditEntry.ts:163`) is deliberately lenient (ADR-QD-096 D-15-c) and stays **outside** the module.

### Seam mapping (file:line at base)

| Seam | Today | New call | Refusal mapping |
|------|-------|----------|-----------------|
| `Policy.fromJson` / `fromJsonValue` (`Policy.ts:1018-1062`) | own `JSON.parse`, `exceedsJsonDepth`, `decodePolicyUnknown` | one `untrustedDecoder(Policy)`; `fromJson = decodeText`, `fromJsonValue = decode` | `TooDeep -> PolicyDecodeTooDeep`; `Malformed.error` returned as the public `SchemaError`; `NotJson` keeps the current fallback (`Schema.decodeUnknownEffect(PolicyFromJson,...)(json)`) so the public error type `PolicyDecodeTooDeep \| SchemaError` and the 60,000-deep-malformed test (`Policy.test.ts:565-583`) are unchanged |
| `decodeSinkRecord` (`SinkCodec.ts:423, 501-511`) | guard, non-object, version, `envelopeOf`, decode | `untrustedDecoder(SinkRecordWire, { prepare })`; `prepare` = version check (`UnsupportedVersion`) + `envelopeOf` projection | `NotJson/TooDeep/Malformed -> DecodeRefusal` (same three tags and shapes, mechanical); `UnsupportedVersion` and `Inconsistent` stay sink-only. **`prepare` exists to keep the order guard -> version -> project -> decode**, which `SinkCodec.test.ts:1304` pins (`TooDeep` iff `exceedsJsonDepth`) |
| `portWire` (`PortWireEncode.ts:104-106, 119-143`) | two decoders + two guards, per port | two `untrustedDecoder`s | all three arms -> the existing `string` (keep the "question/answer nests deeper..." sentences seam-local) |
| `askRemotely` (`PortRemote.ts:123, 151`) | `decodeReply` + guard | one decoder | all arms -> `RemotePortFailure.Undecodable({ message })` |
| React `HydrationEngine.ts:198-200, 440, 480` | three `decodeUnknownOption` + two hand guards | envelope: `unwalked: ["entries"]`; entry: whole-entry guard; policy: its own decoder | envelope `TooDeep/Malformed -> MalformedPayload`; entry `TooDeep -> EntryTooDeep`, `Malformed -> MalformedEntry`; policy any -> `UndecodablePolicy`. Hydration reasons and `INV-QD-045` accounting unchanged |
| Audit `AuditArchive.ts:252` | strict decode, no guard | `unwalked: ["entries"]` | `TooDeep/Malformed -> ArchiveRefusal.Malformed`; no new arm |
| Audit `AuditEntry.ts:150` | strict decode, no guard | `unwalked: ["record"]` | `TooDeep/Malformed -> malformed(message)` (existing helper) |

### Constants: what happens to `Policy.ts`'s exports

- **`MAX_DECODE_DEPTH`: move to the leaf (value 256), pin its relation in a test** (`=== DEFAULT_MAX_DEPTH * 4`, `Policy.test.ts`). Reason: it is the bound for sink, port wire, outbound `wireHazard`/`toJson` (`AttributeResolver.ts:200`, `CustomPredicate.ts:141-142`, `PortWireEncode.ts:27`) and hydration, not just policy; one owner makes encode and decode agree by construction (INV-QD-096). Side win: `PortWireEncode.ts` loses its `Policy.ts` edge (the port wire stops importing the policy type's module). The long 8x-to-4x derivation comment (`Policy.ts:947-977`) moves with it. *Alternative:* keep it in `Policy.ts` and make `maxDepth` a required parameter; rejected because eight seams then restate the bound argument.
- **`UNTRUSTED_DECODE_OPTIONS`: move to the leaf, keep exported from `@qadi/core`, no re-export from `Policy.ts`** (ADR-QD-116 precedent). Non-breaking for consumers (same root name); a removal would be **Breaking** and nothing here needs it. Document it as the low-level half; do not deprecate in this wave. Update in-repo importers (`DecisionWire.test.ts:8`, `v4-api-smoke.test.ts:166` comment, `Policy.test.ts:380`).
- **`exceedsJsonDepth` / `DecodeDepthGuard.ts`: untouched and public** (BEH-QD-259 requires it reachable). It becomes the leaf's primitive; `FieldPath.ts`/`HydrationMetrics.ts` comments keep citing it.
- **Enforce "a new seam gets the guard"** with a house-style rule rather than a convention (AGENTS.md section 15): `UNTRUSTED_DECODE_OPTIONS` (or `Schema.decodeUnknown*` with it) imported outside `UntrustedDecode.ts` is refused, tests exempt. Adding a rule is not changing an existing budget (PROJECT.md Out of Scope); confirm with the user in discuss-phase.

### New vs modified

- **New:** `core/src/UntrustedDecode.ts`, `core/test/UntrustedDecode.test.ts` (one property: refuses iff `exceedsJsonDepth`, never throws, across the bound; plus the `unwalked`-is-Unknown pin), one refusal-row test per seam.
- **Modified:** `Policy.ts`, `SinkCodec.ts`, `PortWireEncode.ts`, `PortRemote.ts`, `index.ts` (one line), `react/src/HydrationEngine.ts`, `audit/src/AuditArchive.ts`, `audit/src/AuditEntry.ts`, `scripts/check-house-style.mjs` (new rule, optional), spec (`overview.md` rows for `UNTRUSTED_DECODE_OPTIONS`, `MAX_DECODE_DEPTH`, new exports; BEH-QD-259 Source lines, BEH-QD-230 wording at `19-hydration.md:537`).
- **Changesets:** `@qadi/core` minor (new public exports); `@qadi/react`, `@qadi/audit` patch (behaviour identical at the boundary, by the `unwalked` design).

### ADRs / records

New **ADR-QD-143**: where the strict recipe lives, public, no re-export, `unwalked` rule. Cites ADR-QD-002 (trust boundary), ADR-QD-099 (why public), ADR-QD-116 (move-without-re-export). ADR-QD-090, 095, 096, 107 are **not reopened**: they only use the helpers. A one-line cross-reference note on ADR-QD-096 D-15-c (envelope leniency now `prepare`) and ADR-QD-107 ("strict" sentence) is enough. Numbers: BEH-QD-486..490, INV-QD-305..306 (e.g. "every untrusted seam refuses by the same guard", "unwalked slots are Unknown").

### Risks

- **Double walk** at hydration (entry guard then policy guard over a subtree) and at sink/audit (`decodeAuditEntry` guards the record, then the row). O(n), client-side or off the evaluation path; measure once, do not skip the guard.
- **Mutation score**: moving code can drop a file's score (Phase 29 lesson, `HydrationEngine.ts` 0.9619 to 0.9605). Add the seam tests before deleting the old guards.
- Test pins that cite `Policy.ts`'s constants in prose are exempt change history; live comments in the touched files must be updated (Phase 36 should not inherit them).

---

## Phase 31: a reset supersedes its claims (ARCH-79; amend ADR-QD-132, ADR-QD-144 likely unused)

### Current structure

`SharedComputation.ts` is package-private, generic over its key; `DecisionCache.ts` is its one adapter. `reset` (`SharedComputation.ts:370-375`) only empties `inFlight`; the claims keep running and, when they settle, `onExit` still calls the adapter's `settle` (`:352`, guarded only by `entry.abandoned`). So `DecisionCache` re-derives "was I flushed?" itself: `generation` (`DecisionCache.ts:231`), captured at claim time (`:241`), compared in the settle (`:248`), and the four-step flush in `clear` (`:292-301`: entries, insertionOrder, `shared.reset()`, `generation += 1`).

### Target

Rename the flag `abandoned` -> `dropsExit` (or `superseded`); `reset` walks the current `inFlight` and sets it on every entry *before* replacing the map. `onExit` already does the right thing for a flagged claim (skip `settle`, still `Deferred.done`, so waiters are answered). **No new state, no new path:** ADR-QD-132's rule 2 ("an abandoned computation's exit is dropped") is generalised to "an exit nobody may remember is dropped", with two causes (last waiter left; reset).

Consequences for the adapter:
- `generation` and `myGeneration` are deleted; `clear` becomes three steps (entries, insertionOrder, `reset`).
- The `claim` hook (`SharedComputationHooks.claim`, `:48`) returned a per-claim closure only to capture the generation. It can become `settle: (key, exit) => void`, which also removes an allocation per claim. This is a package-private interface change; both files and `SharedComputation.test.ts` move together.
- A superseded claim's last waiter leaving still interrupts the compute (unchanged; `forget` is identity-checked so it cannot remove the fresh claim, which the existing test at `SharedComputation.test.ts:318` pins).

### Tests, specs

- `DecisionCache.test.ts:749-880` (clear-mid-compute races, through `evaluate`) become model tests on `SharedComputation` with plain keys and latches; keep one end-to-end test in `DecisionCache.test.ts` proving the adapter composition (INV-QD-025: a hit differs from a miss only in speed and identity).
- Restate BEH-QD-439 (`spec/behaviors/21-decision-cache.md:289`) with a fourth requirement. Note `21-decision-cache.md` has **no** requirement about `clear` today (grep found none), so this is where the clear-mid-compute rule is first written down (BEH-QD-491..495, INV-QD-307..308 as needed).
- `@qadi/react`'s `invalidate` (`QadiAtoms.ts` ~line 387) relies on `cache.clear` running first; unchanged semantics, but it is the one external consumer, so keep a React-level regression in the phase's verify list.

### Risk / flags

Low. Only `core/src/SharedComputation.ts`, `DecisionCache.ts` and two test files change; no barrel, overview or changeset impact beyond a patch note. The doc comment at `DecisionCache.ts:225-231` and `SharedComputation.ts:12-17` ("the generation counter behind `clear`") must be rewritten. Amend ADR-QD-132 (new Revision, "extends without reversing"); a new ADR is not warranted.

---

## Phase 32: options and services stated once, in leaves (ARCH-80; ADR-QD-145 probably unused, amend ADR-QD-105)

### Verified graph

`Lifecycle.ts` cannot import `Evaluate.ts` because `Evaluate.ts` imports `Lifecycle.ts` (`ask`); hence the restatement. The fix is to declare the types **below both**:

- **`EvaluateOptions` -> `Question.ts`**, beside `QuestionOptions` (`Question.ts:22`). It extends `QuestionOptions` and adds `concurrency`, `evaluationId` (docs move from `Evaluate.ts:26-70`). Locality: `QuestionOptions`' doc already says "a field that cannot [change the answer] belongs on `EvaluateOptions` instead", and `Question.test.ts` holds the classification as a type plus a differential test; the two halves of one rule now sit in one file. Needs only `import type { Concurrency } from "effect/Types"`.
- **`EvaluationServices` and `StandingEvaluationServices` -> a new type-only leaf `core/src/EvaluationServices.ts`** (imports types from `CurrentSubject.ts`, `EvaluationId.ts`, `Ports.ts`; verified none reaches `Question`/`Evaluate`/`Lifecycle`). Not `Question.ts`: services are not the question, and `Question.ts`'s header promises it "imports no evaluation code". Not `Ports.ts`: it is the port registry. Barrel line `export * from "./EvaluationServices.ts"` before `EvaluationServicesNone.ts`.
- Delete `LifecycleOptions` (`Lifecycle.ts:60-65`); `ask` (`:206`) takes `EvaluateOptions` and returns `Effect<Asked, EvaluationError, EvaluationServices>` (kills the hand-spelled union at `:208-209`); `decideQuestion` (`:75`) takes `EvaluateOptions` (a superset of what it reads; it is package-private and `ask` passes it through today).
- `Evaluate.ts` keeps only `evaluate` (`:107`) and its public name; **no re-export** of the moved types (ADR-QD-116 precedent). All of `EvaluateOptions`, `EvaluationServices`, `StandingEvaluationServices` stay on the `@qadi/core` root, so no consumer changes and **no breaking change** (overview rows `spec/overview.md:162, 176, 177` change their Source column only).
- Importers to repoint: `Qadi.ts:29`, `SubjectSet.ts:35`, `GuardHealthCheck.ts:30`, `EvaluationServicesNone.ts:40` (this one **loses** its edge to the whole evaluator graph, a free locality win), `Lifecycle.ts`, `Evaluate.ts`, `Lifecycle.tst.ts`.
- `Lifecycle.tst.ts` currently pins "EvaluateOptions is QuestionOptions plus LifecycleOptions" in both directions. Replace it with one assertion that `keyof EvaluateOptions` is `keyof QuestionOptions | "concurrency" | "evaluationId"` next to the classification test in `Question.test.ts`; delete the file if nothing else remains.

### Do not collapse

`decide = evaluate` (`Qadi.ts:222`) and `permitted`/`decideOne` stay: ADR-QD-104 fixes that surface and the wave's "too small to act on" list says so. ADR-QD-105's *split* (Lifecycle package-private, `ask` builds the question once) is untouched; only its footnote about `LifecycleOptions` changes. `pnpm circular` is the hard gate; run it after the first edit, not at the end.

### Records

CCR plus a revision note on ADR-QD-105; ADR-QD-145 unused unless the planner treats "services get their own leaf" as a decision worth an ADR. BEH-QD-496..500 / INV-QD-309..310: at most one type-level pin ("the services union is stated once"). Changeset: `@qadi/core` patch (types move; names unchanged).

---

## Phase 33: one sealed evaluation layer (ARCH-81, ADR-QD-146)

### Home and interface

A new public core module **`core/src/SealedEvaluation.ts`**, a sibling of `EvaluationServicesNone.ts`. Core is the only package both `@qadi/testing` and `@qadi/devtools` already depend on, and ADR-QD-050 says the simulator "cannot reach `@qadi/testing`" (devtools has it only as a devDependency). `core` is `sideEffects: false`, so importing `effect/testing/TestClock` costs nothing for a consumer that never calls the deterministic branch; devtools src already ships it to browsers.

```ts
export interface EvaluationEnvironmentOptions {
  readonly ports: Layer.Layer<PortServices>;        // review: fixturePortsLayer(setups); simulation: portsOf(source, input)
  readonly idPrefix?: string;                        // "eval" | "sim"
  readonly clock?: "live" | "deterministic";
}
/** ports + sequential ids + clock. Shadows nothing. What review wants. */
export const evaluationEnvironment: (o: EvaluationEnvironmentOptions) => Layer.Layer<StandingEvaluationServices>;
/** the above + a discarding DecisionSink + a private decisionCacheLayer(). What a simulation wants. */
export const sealedEvaluation: (o: EvaluationEnvironmentOptions)
  => Layer.Layer<StandingEvaluationServices | DecisionSink | DecisionCache>;
```

`sealedEvaluation` is `evaluationEnvironment` plus the two shadows, so the ~10 duplicated lines (`QadiReviewLayer.ts:145-165`, `Simulation.ts:85-112`) exist once, and the shadowing rule is a type: the sealed layer's output includes `DecisionSink | DecisionCache`, the review layer's does not.

### The decision the phase must state (recommendation)

**Review does not shadow the sink or the cache; simulation does.** Reason, from Effect's "innermost provide wins": a test composes `qadiTestLayer(...)` with its own recording sink or cache *outside* it. A review layer that shadowed `DecisionSink` would hide that sink and silently break the test-observation pattern the package exists for; a simulation, by contrast, must never write to an ambient sink (INV-QD-042, ADR-QD-050). Write it in ADR-QD-146 and as a doc-comment on both layers so neither copy is "silent" again.

### Details to settle in discuss-phase

- **Clock spelling.** Review says `"live" | "test"` (public `TestLayerOptions.clock`), simulation says `"live" | "deterministic"` (public `SimulationClock`). Both are public, so neither package renames. Core uses `"live" | "deterministic"`; testing maps `"test"` in one line. (Making core say `"test"` would put a test-ism in the production vocabulary.)
- `CurrentSubject` stays out of the sealed layer: `simulationLayer` adds `currentSubjectLayer(subjectOf(input.subject))` itself (the subject is the thing being simulated, ADR-QD-050), and `qadiTestLayer` adds its own.
- Keep `simulationLayer` exported from devtools (tests and `upgrading.md:186` reference it); its body becomes `Layer.mergeAll(currentSubjectLayer(...), sealedEvaluation({ ports: portsOf(...), idPrefix: "sim", clock }))`.
- Move the seal's proof (a forty-row sweep next to a real sink leaves it empty; private cache) into `core/test` under core's 95% bar; `Simulation.test.ts:106-132` keeps one thin check that devtools wires it. INV-QD-042's Source changes to `SealedEvaluation.ts`.

### Cross-phase

Depends softly on **32** (imports `StandingEvaluationServices` from the new leaf instead of `Evaluate.ts`; the root name is identical, so 33 would compile either way, but doing 32 first avoids a second import edit). Independent of 31 (it only calls `decisionCacheLayer()`).

Records: new **ADR-QD-146** amending ADR-QD-050 (Rev 1.5) and noting ADR-QD-022 (`qadiReviewLayer` is "plus a subject" over this). Overview: two new core rows; `qadiReviewLayer` row unchanged. Changesets: `@qadi/core` minor, `@qadi/testing` and `@qadi/devtools` patch.

---

## Phase 34: diagnostics as the dock model's seventh store (ARCH-82; amend ADR-QD-047 Rev 1.13, ADR-QD-147 likely unused)

### Current structure

`makeDockModel` (`DockModel.ts`) is a scoped `Effect.fn`: six stores, one `configure` that diffs host inputs by identity (`:131-148`), and one `FiberHandle` for the source read (`reads`, `:117-121`) driven through `FiberHandle.runtime`. Diagnostics sit outside it: `DevtoolsDock.tsx:148-154` calls `useDiagnostics(diagnostics)` and `useMemo(() => mergeReading(sampled, reading))`; `useDiagnostics.ts:78-92` builds a store, forks the poll from a React effect through `useRunningStore.ts` with hand-written deps and an `eslint-disable`. ARCH-74's stated rule ("one owned-model hook, and it forks nothing") is false for exactly this store.

### Target (one rule, stated once, used twice)

Introduce a **scoped `makeDiagnosticsFeed`** in `model/DiagnosticsStore.ts` (new export, package-private to the model unless the planner wants it public):
- owns a `DiagnosticsStore` (sampled), a second `FiberHandle` (`polls`) in its scope, and the **restart rule** currently buried in the hook's deps: restart when `layer`, `collector`, `questions` or `intervalMillis` changes identity, or when `diagnostics` flips between absent and present; never when the options *object* changes (so an inline literal does not tear the layer down); absent options mean no poll and `noDiagnostics`;
- takes `reading` (the supplied `DiagnosticsReading`) and exposes one store whose value is the **merged** reading, memoized on (sampled snapshot, supplied identity) so identity is stable (`mergeReading` returns `sampled` itself when nothing is supplied and a fresh object otherwise; the feed publishes only when the merged reference moved). "Supplied wins per field" leaves the view.
- Schedule: `Schedule.spaced(intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)`, so model tests advance it with `TestClock.adjust` and never render.

`makeDockModel` then embeds the feed as the seventh store: `DockModelInputs` gains `diagnostics?: DiagnosticsDockOptions` and `reading?: DiagnosticsReading`; `configure` dispatches them per field like `ports`/`source`; the model returns `reading: { subscribe, getSnapshot }`. `useDockModel` forwards the two new inputs. `DevtoolsDock.tsx` loses `useDiagnostics`, `useMemo` and `mergeReading` and reads the model's store.

**Public `useDiagnostics` stays, as an adapter over the same feed** (`useScoped(() => makeDiagnosticsFeed())` + one layout effect for `configure`, exactly `useDockModel`'s shape), so its public contract (`useDiagnostics(options?) -> Diagnostics`, `{}` as the opt-in, no run without options) and `DiagnosticsDockOptions` are unchanged. Detail: `useScoped` returns `undefined` on the first pass, so the adapter must read `noDiagnostics` until the feed exists (same value the store holds before its first sample).

### What moves, what stays

- **`DiagnosticsDockOptions` is declared in `react/useDiagnostics.ts` today** and re-exported by `react/index.ts`. The model cannot import from `react/`, so the interface moves to `model/DiagnosticsStore.ts` and `useDiagnostics.ts` re-exports it (public path `@qadi/devtools/react` unchanged; gate 13 and `surface.test.ts` unaffected).
- `runDiagnostics`, `makeDiagnosticsStore`, `mergeReading`, `DiagnosticsOptions` stay public and unchanged (`test/surface.test.ts` lists them); the feed is built from them.
- **Three snapshot hooks merge into one** (resolves Phase 26 IN-01): `useDockSnapshot` (`useDockSession.ts:14`), `useExplorerSnapshot` and `useHeldChoiceSnapshot` (`useExplorerSession.ts:15,19`) all call `useRunningStore(store, undefined, [store])`. Replace by one `useStoreSnapshot(store)` (a plain `useSyncExternalStore`). `useRunningStore` remains only for the public `useTimeline`; do not widen this phase to rewrite `useTimeline`.
- Tests: `DiagnosticsStore.test.ts` / new `DockModel.test.ts` cases for restart-on-field, no-restart-on-literal, supplied-wins, scope close interrupts the poll, all under `TestClock`; `useDiagnostics.test.tsx` shrinks to "mounts, unmounts, does not restart on a no-op rerender" (the three things only React can get wrong); `DevtoolsDock.test.tsx` loses its merge cases.

### Records

Amend **ADR-QD-047** Rev 1.13 (ADR-QD-147 unused, as ADR-QD-138 was in Phase 26): the dock model owns seven stores; the 2026-10-07 ("sampling is the model's") and 2026-10-08 ("a supplied reading is one value") amendments and BEH-QD-323 are what this completes. Restate **BEH-QD-465** (`28-devtools-screens.md`, "six stores" becomes seven) and **BEH-QD-323**; INV-QD-296 is about timeline agreement and is not touched. Accepted consequence to restate beside ADR-047's `Activity` note: a hidden-then-shown dock rebuilds the model, so the sampled reading restarts at `noDiagnostics` until the next poll. Changeset: `@qadi/devtools` patch.

Independent of Phases 30-33 (devtools only; `Simulation.ts`, touched by 33, is not in `DockModel`'s edit set, though `DockModel` imports `makeSimulationSession` which reaches it).

---

## Phase 35: the atom set owns its eviction sweep (ARCH-83, ADR-QD-148 or CCR only)

### Lifetimes (the constraint that decides the mechanism)

- `makeQadiAtoms(layer, options)` (`QadiAtoms.ts:262`) is called **once at module scope and never closed**: no `Scope`, no dispose. It owns the question book (`:339`), which stores handles strongly and counts `liveCount`.
- `QuestionBook.sweep` (`QuestionBook.ts:155`) is "one pass" and is safe only because it runs **outside** the registry's synchronous dispose-then-reread window: `AtomRegistry` drops a recomputing atom's `liveCount` to zero and re-reads it with no `yield*` in between; an inline sweep in that window would evict a live question and, with re-admission, risk the very split ADR-QD-103 exists to prevent. `v4-reactivity-smoke.test.ts` pins that window.
- The only enforcement today is the provider: `QadiProvider.tsx:342-349` forks `Effect.repeat(atoms.sweepEvictions, Schedule.spaced(sweepIntervalMillis))` per provider mount (prop `sweepIntervalMillis`, `:193, :228`, default 30 s). No provider means no sweep.
- A registry is per provider (`registryRef`), the runtime layer is built per registry through `Atom.runtime`'s registry-scoped memo map (`effect/src/reactivity/Atom.ts:896-930`), **and that build runs with `Scheduler` = the registry's scheduler** (`Atom.ts:660-672`). That last point matters for AGENTS.md section 13.

### Candidate mechanisms, ranked (spike input)

| # | Mechanism | Fits section 13 / CCR-QD-150? | Verdict |
|---|-----------|------------------------------|---------|
| A | **Edge-triggered deferred sweep.** `QuestionBook` calls an injected `onPressure()` when `order.length > capacity` after an `open`, and when a release drops a count to zero while over capacity. The atom set coalesces calls behind a `pending` flag and runs `Effect.runFork(Effect.yieldNow.pipe(Effect.andThen(sweepEvictions)))`. | Yes. A qadi-owned fork of `sweepEvictions`; touches no `scheduleTask`/`defaultIdleTTL`; any yield lands outside the synchronous dispose-reread window by construction. | **Recommended primary.** No timer, no scope needed, deterministic in graph tests (`await` a tick), holds with or without a provider or React. Retires the interval: `sweepIntervalMillis` becomes meaningless, so removing it is **Breaking** for `@qadi/react` (record it; or keep it accepted and documented as ignored for one minor, the planner's call). Must re-run the smoke test for the window with the deferred sweeper. |
| B | **Layer-scoped periodic fork.** Compose the atom set's layer with `Layer.effectDiscard(forkScoped(repeat(sweepEvictions, spaced(n))))` (ref-counted per atom set), so it lives exactly as long as a registry holds the runtime. `sweepIntervalMillis` moves to `QadiAtomsOptions`. | Plausible, **unproven**: the forked fiber inherits the registry's `Scheduler`, which is the thing section 13 warns about; depends on `Atom.runtime`'s build timing; nothing mounted means nothing built, so an `asked()` grown by unmounted `open`s is never swept. | Second choice; spike only if A fails. |
| C | Inline sweep inside `open`. | **No.** Runs inside the dispose-reread window (see `QuestionBook.ts` header). | Rejected. |
| D | A module-scope `setInterval`. | No scope to close it (leaks for the module's life) and a hidden global per atom set. | Rejected. |
| E | Keep it in the provider; state the rule ("the limit is enforced by whoever hosts the atom set") in the BEH and add the graph-level tests that drive `sweepEvictions` directly. | Yes, trivially. | **The documented fallback outcome** the phase may conclude (as `_WAVE8-CONTEXT.md` allows). |

### Shape of the change if A lands

- `QuestionBook.ts` gains one optional `onPressure` in `BookOptions` (still free of `effect/reactivity`, still testable with plain objects); `QadiAtoms.ts` wires it to a coalescing deferred fork; `QadiProvider.tsx:342-349` and its prop go (or become a no-op); `sweepEvictions` stays on `QadiAtoms` (public, `09-react.md:73`) because tests and hosts drive it.
- Opens on a **spike or `checkpoint:decision`** (requirement of the wave). Spike acceptance: (1) the `v4-reactivity-smoke` dispose-reread window test passes with the deferred sweeper active; (2) `QadiAtoms.test.ts` shows eviction past the bound with no provider and no manual `sweepEvictions`; (3) the Next.js newsroom render-sequence tests (the CCR-QD-150 regression) pass unchanged; (4) two providers over one atom set produce one pending sweep, not two.
- Tests to move: `QadiProvider.test.tsx:301-330` (provider-driven eviction) become atom-set tests; `QadiAtoms.test.ts:379-516` keep calling `sweepEvictions` directly for the pass logic.

### Records

If A or B lands: new **ADR-QD-148** amending ADR-QD-103 (it says "the provider's first sweep runs after its interval", `103:77`) and the CCR-QD-150 text in `spec/process/house-rules-evidence.md` section 4, plus the AGENTS.md section 13 wording ("`QadiProvider` forks it"). If E: CCR only, ADR-QD-148 unused, BEH restated at `25-inspection.md:777`. BEH-QD-511..515 / INV-QD-315..316 either way. No interaction with 30-34 beyond the spec registers. Phase 31 is unrelated except that `invalidate` calls `DecisionCache.clear`.

---

## Build order and cross-phase dependencies

Keep the proposed **30 -> 31 -> 32 -> 33 -> 34 -> 35 -> 36**. It is sound, and the only hard edges are small:

| Edge | Strength | Why |
|------|----------|-----|
| 32 -> 33 | soft | 33's new module imports `StandingEvaluationServices` from the leaf 32 creates; reversed, it needs a second import edit. Names are public either way. |
| 30 -> 36 | hard | 36 corrects stale citations that 30 creates in prose (`Policy.ts`'s constants cited by BEH-QD-230, ADR-QD-096/107 live comments). Do not let 36 inherit them; 30 fixes live comments in files it touches. |
| 34 -> 36 | hard | 36 picks Phase 26 IN-02/IN-03 and Phase 24/25 items; 34 resolves 26 IN-01 and may touch `DevtoolsDock`'s `nothing` source (26 IN-02). |
| 31 || 30 / 32 / 33 | none | 31 edits two core files and their tests only. It could go first or third without cost; it stays second because it is the smallest and lowers risk before the larger 32/33. |
| 33 touching 31/32 files | no file overlap | 33 adds `SealedEvaluation.ts` and edits `index.ts`, `QadiReviewLayer.ts`, `Simulation.ts`. It *calls* `decisionCacheLayer()` (31's file) without changing its interface, and *types* against 32's leaf. |
| 34 || 35 | none | different packages, different files (35's `QadiAtoms/QuestionBook/QadiProvider`; 30's only react touch is `HydrationEngine.ts`). |
| All | shared spec registers | every plan edits `spec/overview.md`, `traceability.md`, `README.md` CCR rows, `invariants.md`/behaviors and `.changeset/`. This, not code, is why execution stays serial and `use_worktrees` false. The barrel `index.ts` is touched by 30, 32, 33 (one line each, alphabetical). |

**Run `pnpm circular` after the first source edit of 30, 32 and 33** (the three phases that add or move edges). It is the cheapest early failure and the gate the ADR-QD-037 rule is.

### Records matrix

| Phase | New ADR | Amended | Likely unused | Changesets |
|-------|---------|---------|---------------|-----------|
| 30 | ADR-QD-143 | note on 096 D-15-c, 107 | none | core minor; react, audit patch |
| 31 | none | ADR-QD-132 | ADR-QD-144 | core patch |
| 32 | none | ADR-QD-105 (note) | ADR-QD-145 | core patch |
| 33 | ADR-QD-146 | ADR-QD-050 Rev 1.5 | none | core minor; testing, devtools patch |
| 34 | none | ADR-QD-047 Rev 1.13 | ADR-QD-147 | devtools patch |
| 35 | ADR-QD-148 if A/B | ADR-QD-103, CCR-QD-150 text, AGENTS.md section 13 | ADR-QD-148 if E | react minor (Breaking if the prop is removed) |
| 36 | none | stale records | none | none |

## Anti-patterns to avoid in this wave

- **Re-exporting a moved public name from its old module** (ADR-QD-116 rejected it). It leaves two modules naming one concept and makes `Policy.ts`/`Evaluate.ts` keep a concern they were meant to shed.
- **A blanket depth guard over a schema with `Schema.Unknown` slots** (Phase 30). It shifts the effective bound by the nesting of the slot and breaks "the writer's output always reads back".
- **Adding a refusal arm to a public closed union to absorb a new refusal** (audit `ArchiveRefusal`). Map onto the existing arm when the outcome class is already the same.
- **Sweeping inside the registry's synchronous window** (Phase 35, mechanism C).
- **Shadowing in a layer that tests compose outside of** (Phase 33): innermost provide wins, so it hides the caller's own sink.
- **Collapsing `decide`/`evaluate`/`permitted`** (ADR-QD-104 fixes them).

## Gaps to carry into planning

- Phase 30: whether the `[untrusted-decode-seam]` house-style rule is wanted (new rule, not a budget change); exact `prepare` typing for `SinkCodec` (`Result<unknown, DecodeRefusal>` vs generic `R`); performance of the double walk (measure once).
- Phase 33: the clock spelling mapping is a recommendation, not a decision; confirm with the user. Verify the bundle claim (`effect/testing/TestClock` in core, `sideEffects: false`) with `pnpm spec:package` (gate 14).
- Phase 35: everything about A is an argument, not a measurement. The spike is mandatory.
- Gate 13 was not run in this research (barrel/overview edits are proposed, not made).

## Sources

- Code at base `aab87576`: files and lines cited inline; `madge --circular` and `madge --json` run on `packages/core/src` and `packages/*/src` (green).
- ADRs read: 002 (referenced), 037, 047 (Rev 1.12), 050, 090 (referenced), 095/096/107 (referenced via code and spec), 099, 105, 116, 132; `spec/process/house-rules-evidence.md` section 4; `spec/overview.md` public surface and entry points; AGENTS.md sections 1-17.
- `effect@4.1.2` `src/reactivity/Atom.ts:896-930, 650-700` (runtime layer build, scheduler injection).
- Empirical: a scratch `tsc` run showing two `export *` paths to one symbol compile.
