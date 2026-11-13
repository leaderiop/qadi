# Pitfalls Research

**Domain:** Effect v4 authorization library (pnpm monorepo), subsequent milestone v1.3 "Arch Wave 8", Phases 30-36 (six architecture deepenings plus spec debt)
**Researched:** 2026-11-12
**Confidence:** HIGH for repo-specific mechanics (read from source at `aab87576`/HEAD and from waves 5-7 records); MEDIUM for Phase 34/35 runtime behaviour (React/Effect scheduling is argued from source, not yet exercised)

Conventions: "base" means `aab87576`. Every claim marked (src) was read in the current tree; (hist) comes from `.planning/` records of waves 5-7; (infer) is reasoning that the phase's spike or RED test must confirm. Planners re-verify against base per `_WAVE8-CONTEXT.md`.

---

## Critical Pitfalls

### Pitfall 1 (Phase 30): The "guard, then decode" recipe has a step between the guard and the decode at two seams, so one `parse -> guard -> decode` call cannot express them

**What goes wrong:** The review describes the recipe as "guard depth, then strict-decode" and proposes one module owning `parse -> depth guard -> strict decode`. Two seams interpose a step between guard and decode (src):
- `SinkCodec.decodeSinkRecord`: guard, then `isJsonObject`, then version dispatch (`UnsupportedVersion`), then `envelopeOf(input)` (projects the input onto the envelope's declared keys, ADR-QD-096 D-15-c forward compatibility), then decode of the *projected* value.
- `HydrationEngine.planHydration`: guard on `{...payload, entries: []}`, then the `version === 2` check (`UnsupportedPayloadVersion`), then envelope decode, then per entry guard / `decodeEntry` / separate `decodePolicy`.

A single-shot helper forces one of two regressions: it moves the version check after the decode (refusal precedence changes: a deep or foreign-version payload now reports a different reason, and a version-1 payload gets a `Malformed` it never had), or it decodes the unprojected input (a newer writer's extra envelope key becomes a refusal, which ADR-QD-096 says must be ignored).

**Why it happens:** Eight call sites look identical from far away; the differences are all in the 3 lines between guard and decode.

**Consequences:** Silent change of which refusal a hostile or skewed payload gets; metric labels move (`HydrationMetrics` reasons are counted, INV-QD-045); forward-compat rows start failing; SinkCodec golden/agreement tests go red, or worse, stay green because they test only well-formed input.

**Prevention:**
- Make the module two steps, not one: `guard(input, maxDepth)` returning the closed refusal-or-ok, and `decode(schema)(value)` pre-bound to the strict options. A `parseThenGuard` convenience for the text seams composes them. The seams keep their interposed step.
- Characterise first (RED/green-on-base table, as 21-01/23-01 did): one row per seam x {not JSON, too deep, deep AND wrong version, wrong version, extra envelope key, excess key inside policy, valid}. The "deep AND wrong version" and "extra envelope key" rows are the ones a naive unification flips.
- Take `maxDepth` as a parameter. Policy and sink use `MAX_DECODE_DEPTH` (256 = 4 x `DEFAULT_MAX_DEPTH`); the port wire uses `WIRE_MAX_DEPTH`, currently an alias of it. Do not collapse them into one constant: the encode-side `toJson(encoded, WIRE_MAX_DEPTH)` and `wireHazard` count must stay equal to the decode-side bound (see Pitfall 2).

**Warning signs:** The new helper has a single `decode(input)` entry point and no hook for a pre-decode projection; a seam's tests were edited, not just re-pointed; `SinkCodec.test.ts` agreement/round-trip tests unchanged but a new "version before depth" row is missing.

**Phase to address:** Phase 30, first plan (characterisation table RED/green on base, before any seam is touched).

---

### Pitfall 2 (Phase 30): Breaking INV-QD-096/097 by moving or re-implementing the depth walk, or by catching throws

**What goes wrong:** INV-QD-096 ("whatever the record codec emits, it accepts") depends on the *outbound* walk refusing exactly what the *inbound* guard refuses: `JsonHazard.wireHazard` documents "its depth count matches `exceedsJsonDepth`'s (root depth 0, each child +1, anything deeper than `maxDepth` refused)" (src). `SinkCodecAgreement.test.ts` pins it. Re-implementing the walk in the new module (a `>=` vs `>`, counting from 1, counting through a wrapper) makes a sender emit what every receiver refuses, the exact pre-ADR-QD-095 defect. Separately, `decodeSinkRecord` carries a deliberate comment: "No `Result.try` around the decode: the depth guard is what makes it safe, and a throw past it would be a library defect that should stay visible." A "total" helper that wraps decode in `try/catch` to produce `Malformed` turns a stack-overflow library defect into a quiet refusal, reversing a recorded stance (INV-QD-097 says never throw/die, but the guard, not a catch, is how it is achieved).

**Why it happens:** A closed result type `Decoded | NotJson | TooDeep | Malformed` invites "catch everything into Malformed" for tidiness.

**Consequences:** Encode/decode bound drift; library defects hidden as refusals; `Policy.fromJson` behaviour for 60,000-level input changes (today: typed `PolicyDecodeTooDeep`, not `RangeError`).

**Prevention:**
- Keep `exceedsJsonDepth` the single walk (move or re-export it, do not rewrite it). Keep `SinkCodecAgreement.test.ts` and the 60,000-level probe green untouched; add the same probe once at the new module as the property test the review promises.
- No `try/catch`/`Result.try` around schema decode in the new module. `Result.try` is allowed only around `JSON.parse`.
- Do not touch the encode side in this phase: `encodeSinkRecord`, `toJson`, `wireHazard`, golden bytes for `Decided` records stay byte-identical (wire byte-identity). Run `SinkCodec.test.ts` golden rows and the ARCH-71 "encoded-value key pins" before and after, same invocation.

**Warning signs:** A diff touching `JsonHazard.ts` or `SinkCodec.ts`'s encode half; a new `catch`; the agreement test needs an edit.

**Phase to address:** Phase 30 (every plan; add the 60,000-level + off-by-one boundary pair at the new seam before deleting seam-local copies).

---

### Pitfall 3 (Phase 30): Collapsing hydration's three drop reasons, or its per-entry independence, into one `Malformed`

**What goes wrong:** Hydration decodes an entry in two steps with two distinct reasons (`MalformedEntry`, `UndecodablePolicy`) plus `EntryTooDeep`; the entry's `policy` is `Schema.Unknown` at the entry level on purpose and decoded separately (src comment: folding it in "would run `PolicySchema` a second time"). The payload-level guard runs on `{...payload, entries: []}` so one over-deep entry is dropped alone instead of taking the payload with it. A closed result with a single `Malformed` arm loses the first distinction; a helper that guards "the whole input" re-couples the entries, so one hostile entry now refuses (or, depending on mapping, drops) every valid entry, an availability regression and a changed `HydrationEvent` count (INV-QD-045).

**Why it happens:** The "guard workaround" the review wants to move inside the module is the per-entry design, not an accident.

**Prevention:** The module's hydration-facing surface is "guard this subtree with these keys excluded" or simply per-value guard calls; the mapping to `PayloadRefused`/`EntriesDropped` reasons stays in `HydrationEngine.ts`. Keep a test with one too-deep entry among valid ones (valid ones still seed, one `EntryTooDeep` event) and one with `version: 1` + deep nesting. `Option`-returning decoders there are by design (drop, never throw); do not change the return family.

**Warning signs:** `HydrationPayload.test.ts` rows deleted rather than re-pointed; `planHydration` loses its separate `tooDeep/malformed/undecodable` buckets.

**Phase to address:** Phase 30, hydration plan (after core/audit plans; react depends on the core export).

---

### Pitfall 4 (Phase 30): Public-surface and error-type damage (`UNTRUSTED_DECODE_OPTIONS`, `fromJson`'s error channel, `ArchiveRefusal`, a new cycle)

**What goes wrong:** Several things are public and normative (src):
- `UNTRUSTED_DECODE_OPTIONS` (overview row, used by `@qadi/audit` and `@qadi/react` through the barrel). Removing it is **Breaking**. BEH-QD in `19-hydration.md` also states a REQUIREMENT that `exceedsJsonDepth` and `MAX_DECODE_DEPTH` stay reachable from `@qadi/core`'s barrel.
- `Policy.fromJson`'s error type is `PolicyDecodeTooDeep | Schema.SchemaError`. For malformed JSON it deliberately re-runs `Schema.decodeUnknownEffect(PolicyFromJson)(json)` to get Schema's native error. Mapping a new `NotJson` arm to a new error class widens a public error union and breaks `catchTag("SchemaError")` callers.
- Audit's seams are not what the review's "decode only, no guard" suggests: `decodeAuditEntry` already routes the record through `decodeSinkRecord` (guarded); the unguarded decodes are the archive envelope (`entries: Schema.Array(Schema.Unknown)`) and `decodeRow`. `recordJsonOf` uses the **default** options on purpose (comment: the strict read has run; the entry should drop an envelope key a newer writer added). Applying the strict options "everywhere" breaks that row.
- Giving `readAuditArchive` an envelope depth guard changes behaviour: the bundle adds nesting (envelope -> entries -> entry -> record), so a record at depth 254-256 that `decodeSinkRecord` accepts today would be refused once the whole bundle is guarded at 256. The refusal needs a home: a new `ArchiveRefusal` arm widens a public closed union (precedent: ADR-QD-110 added `SequenceNumberInvalid`, `@qadi/audit` took a minor); reusing `Malformed({message})` avoids widening but hides the reason.
- Cycle: `Policy.ts` must import the new module for `fromJson`; the new module must not import `Policy.ts` or `SinkWire.ts` (which holds `DecodeRefusal`). madge counts `import type` edges (ADR-QD-037; `Lifecycle.ts` already restates a union to dodge one).
- Because `@qadi/react` and `@qadi/audit` import across a package boundary, the module must be in `@qadi/core`'s barrel (package-private is unreachable, ADR-QD-099): a new public export means a gate 13 overview row, a core changeset, and an exact-name decision about what is permanent API.

**Prevention:**
- Keep `UNTRUSTED_DECODE_OPTIONS`, `exceedsJsonDepth`, `MAX_DECODE_DEPTH`, `PolicyDecodeTooDeep` exported with unchanged types; the new module re-homes the implementation, `Policy.ts` re-exports. Treat removal as an explicit ADR/Breaking decision, not a tidy-up.
- Put the audit-refusal choice (widen `ArchiveRefusal` with a full closed union, or map to `Malformed`) behind one `checkpoint:decision`, as Phase 25/28 did. State the depth bound for the bundle explicitly (envelope guarded with `entries` excluded, mirroring hydration, preserves today's per-record 256).
- Check the cycle with a reachability script before writing code: `npx madge --extensions ts --json packages/core/src` then walk `Policy.ts`'s and the new module's transitive imports (this session's check: `Ports.ts`, `CurrentSubject.ts`, `Question.ts` do not currently reach each other's cycle partners).
- `Schema.TaggedError` budget (twelve): the closed result is a value (`Data.taggedEnum`/`Result`), not a new error class; do not touch `SCHEMA_ERROR_BUDGET`. No `as`: dispatch refusals with `Match.tagsExhaustive`, no `switch` (SWITCH_BUDGET is exact).

**Warning signs:** `pnpm spec:api` fails on a removed name; `tstyche`/`Errors.tst.ts` pins change; `pnpm circular` red; an `as` appears to narrow `Decoded<A>`.

**Phase to address:** Phase 30 design plan (decision + surface table) before any seam edit; gate 13 and the changeset in the records plan.

---

### Pitfall 5 (Phase 30): Port-wire refusal strings are observable data

**What goes wrong:** `PortWireEncode`/`PortRemote` turn too-deep input into three different strings ("the question nests deeper than the decode bound", "the answer ...", "the reply ..."), which become `RemotePortFailure.Undecodable({ message })` and reach served `Refused` replies and tests. A shared `TooDeep -> message` mapping with one sentence loses which of the three failed.

**Prevention:** Each seam keeps its own mapping (the review's own shape). Pin the three strings in a table test before the move. Same rule for `Policy`'s `PolicyDecodeTooDeep({maxDepth})` and sink `DecodeRefusal.TooDeep({maxDepth})` payloads.

**Phase to address:** Phase 30, core wire plan.

---

### Pitfall 6 (Phase 31): `reset` marking claims "superseded" by reusing the `abandoned` flag conflates two different facts

**What goes wrong:** Today (src `SharedComputation.ts`) `abandoned` means "nobody is waiting; drop the exit; interrupt the compute", set by the last leaver, and the compute's `onExit` skips `settle` when it is set. A claim forgotten by `reset` is different: it **still has waiters who must be answered** (BEH-QD-439: "answers everyone still waiting"), and if they all leave it must still be interrupted. The review's "reuse the abandoned path" is right about the settle-skip and wrong if taken as "set `abandoned` and stop".
- If `reset` sets `abandoned = true` and `awaitShared`/`onExit` treat that as "no one is waiting" anywhere (an early return, skipping `Deferred.done`, skipping the last-leaver interrupt), stale waiters hang or the compute leaks.
- The skip-settle check must stay **inside the same synchronous `Effect.sync` step** as `settle` and `forget` (`onExit`), exactly where it is now. Moving it into the claim hook, or checking it in a separate yield, reopens the window ARCH-45 I5 closed.
- Double insertion-order append (the defect ADR-QD-132 point 2 names): a superseded claim for key K and the fresh claim for K both finish; if the stale one settles it writes `entries` and appends to `insertionOrder` twice, and a later FIFO pop evicts a freshly recomputed entry.
- `forget(key, entry)` is identity-checked; after `reset`, a stale compute exiting must not remove the fresh claim's slot (existing test: "reset forgets in-flight claims; the stale compute neither answers nor unclaims the fresh one"). Keep the identity check.

**Prevention:** Name the new state separately (`superseded`, or a single `settles: boolean` derived from both) while leaving `waiters`/`Deferred.done`/last-leaver interrupt untouched. `reset` must iterate **every** in-flight claim (a mutant that marks only the first survives unless a two-key test exists).

**Warning signs:** A superseded claim's waiter never resolves; `DecisionCache.size` is 1 larger after a clear-mid-compute; `capacity` FIFO evicts the wrong entry; the "settle runs exactly once per claim, before any waiter observes" test now fails for a reset claim (its contract text must change to "at most once; never after reset or abandonment").

**Phase to address:** Phase 31, RED tests at the `SharedComputation` seam first.

---

### Pitfall 7 (Phase 31): Deleting the generation counter before the replacement tests exist, and breaking the hook shape the whole test file uses

**What goes wrong:** The `claim` hook is `(key) => (exit) => void`; roughly twenty `SharedComputation.test.ts` cases build harnesses with it (and `abandonWhileParked` counts `claim` calls to number claims). Changing the hook shape (for instance to `settle(key, exit)`) is a large churn in a file that mutation relies on. Meanwhile the clear-mid-compute races are pinned today only through `evaluate` (`DecisionCache.test.ts:749-880`: stale-finishes-last, identity-checked inFlight removal on a third ask, three tests-worth of ordering with `Deferred` latches).

**Why it happens:** `generation` removal looks like pure deletion, and deleting leaves `DecisionCache.ts`'s mutation score unchanged or higher, so nothing warns until a race regresses.

**Prevention:**
- Keep the hook shape. Add the clear-mid-compute races at the `SharedComputation` seam first (stale-last with fresh already settled; stale settles first then third ask coalesces on the fresh claim; a reset with two keys in flight; reset while a compute is parked `uninterruptible` with a waiter that then leaves). Only then delete `generation`.
- Keep `DecisionCache.test.ts:749-880` untouched and green as the through-`evaluate` guard; the review says races become testable without `evaluate`, it does not say the integration pins go.
- Re-run issue #64 pins: the two "REGRESSION PIN for issue #64" tests and "issue #64, uninterruptible regime" in `DecisionCache.test.ts`, and `SharedComputation.test.ts`'s two "abandon" tests. They race fresh joiners against the interrupt cascade and are the ones a refactor of `awaitShared`/`forget` breaks silently.
- Restate INV-QD-025 (Enforcement) and BEH-QD-439 (add "a reset claim answers its waiters and settles nothing") and ADR-QD-132 (amendment, ADR-QD-144 is reserved), not just code.

**Warning signs:** `generation` deleted in a commit before a new SharedComputation test is RED on base; a flaky tick-count assertion (these tests use `settleTurns` of 20 `yieldNow`s; do not "fix" flakiness by lowering it).

**Phase to address:** Phase 31, RED commit first, deletion last.

---

### Pitfall 8 (Phase 32): The leaf for `EvaluateOptions`/`EvaluationServices` drags 41 modules under `Question.ts` and re-creates the cycle it was meant to dodge

**What goes wrong:** The review suggests `core/src/Question.ts` "or a new leaf". `Question.ts` documents "sits below `Evaluate.ts` and `Walk.ts` ... imports no evaluation code" and today imports only `AuthSubject`, `Policy`, `Resource`. `EvaluationServices = CurrentSubject | EvaluationId | PortServices`; `PortServices` lives in `Ports.ts`, whose transitive imports are 41 modules (measured with madge JSON this session). Today none of them reach `Question.ts`, so a type import would pass `pnpm circular`. But it makes every port module one new `import type { ... } from "./Question.ts"` away from a cycle; madge counts type-only edges (ADR-QD-037; "a type-only import still counts as a madge cycle", `QadiProvider.tsx` comment). `Lifecycle.ts`'s hand-spelled union exists exactly because `Evaluate.ts` imports `Lifecycle.ts`.

**Prevention:** Prefer a **new leaf** (for example `EvaluationOptions.ts`) importing `Question.ts`'s `QuestionOptions` plus the three service types, and have `Question.ts` stay import-light. Run the reachability check before and after; `pnpm circular` after every move. Do not put the type next to `QuestionOptions` just because the review said "beside".

**Warning signs:** `pnpm circular` red mid-plan; a doc comment that must say "type-only, and it is fine".

**Phase to address:** Phase 32, first plan (module placement decision + circular check).

---

### Pitfall 9 (Phase 32): Public names, `.d.ts` emission (TS2883), and the `Lifecycle.tst.ts` pin

**What goes wrong:**
- `EvaluateOptions`, `EvaluationServices`, `StandingEvaluationServices` are public (overview rows 162/176/177 name `Evaluate.ts`), imported by `@qadi/http`, `@qadi/react`, `@qadi/promise`, `@qadi/devtools`, `@qadi/testing`. If the declaring module moves to a leaf that is not in the barrel, dependents that emit declarations referencing the type hit TS2883 ("cannot be named without a reference"; AGENTS.md section 9). Fix by exporting the leaf from `index.ts` or re-exporting the names (`export type { EvaluateOptions, EvaluationServices } from "./Leaf.ts"` in `Evaluate.ts`; gate 13's parser understands named re-exports from another module, but not a source-less `export { X }`).
- Gate 13 is presence-only (a name must appear in the overview table); it does **not** check the table's *module* column. A stale "`Evaluate.ts`" in `spec/overview.md` therefore passes the gate and is exactly the class of drift reviewers have found (Phase 29 WR-01, ADR still naming `PortName`'s old home). Update the rows by hand.
- `spec/traceability.md:470` credits `Lifecycle.tst.ts` with pinning "`LifecycleOptions` is exactly `EvaluateOptions` less `QuestionOptions`" (ADR-QD-037). Deleting `LifecycleOptions` retires that pin; the traceability row and the test must be rewritten, not just the interface deleted. `spec:verify:strict` only checks that §4 test *files* exist, so a stale "Covers" cell is silent.
- Weakest point after the merge: `questionOf(subject, policy, options?: QuestionOptions)` receives the whole `EvaluateOptions`. An answer-changing option added to `EvaluateOptions` but not to `QuestionOptions` would be silently dropped from the cache key. `Question.test.ts`'s differential test and its `samples/inQuestion` key-set types are what catch it. Keep them, now importing from the leaf, and do not "simplify" them away.
- `decide = evaluate` (`Qadi.ts`) and `permitted`/`decideOne` are fixed by ADR-104; the review marks them too small to act on. Resist collapsing them while touching the pipeline.

**Prevention:** Lock the public name list from `spec/overview.md` + `index.ts` as a pre-change fixture (a `tstyche` pin of `typeof` each name or the existing `Errors.tst.ts` rows stay green); run `pnpm typecheck` across all packages (declaration emission is where TS2883 appears), `pnpm spec:api`, `pnpm test:tstyche`, `Lifecycle.tst.ts`. Check `apps/website/.../services.md`, `http.md`, `promise.md` and `spec:website-examples` for fences naming the old home.

**Phase to address:** Phase 32, plans 1-2; overview/traceability/website in the records plan.

---

### Pitfall 10 (Phase 33): The shared "sealed" layer decides the sink/cache shadowing for `@qadi/testing` silently, which is a public behaviour change

**What goes wrong:** The two copies differ on purpose (src): `Simulation.ts` shadows both `DecisionSink` (no-op) and `decisionCacheLayer()`; `qadiReviewLayer` shadows neither. If the shared layer shadows both and review consumes it:
- A test that provides its own sink or cache **outside** `qadiTestLayer`/`qadiReviewLayer` loses it: an inner provide wins (the review layer's own comment says "the innermost provide wins"). "Records exist" tests fail loudly; "no records" and "no duplicate" tests pass vacuously, which is worse.
- A private cache lives for the layer's scope, so any test that evaluates the same question twice under one `qadiTestLayer` after changing resolver output (a `Ref`-backed `attributeResolverFromRecord`) now gets a stale hit.
- `cacheOutcome` is `undefined` when no cache is wired and `"hit"/"miss"` when one is (`Lifecycle.ts`, kept distinct on the record on purpose), and `decisionCacheLookupsTotal` is written. Shadowing changes what records and metrics say for every review/test evaluation.
- Devtools' wiring report reads sink/cache presence (`Wiring.test.ts` "no log to read" / "a wired sink is present"); a no-op sink makes "present" lie.
- `qadiTestLayer` is documented to downstream users (website `testing.md`, `@qadi/testing` README), so this reaches consumers' suites. Sealing that stayed implicit in one copy is exactly what the review flags as "neither says so", but stating it must not mean flipping review.

**Prevention:** The shared layer takes the shadowing as a **required, explicit argument** (no default) so each call site states its rule: simulation passes "sink and cache", review passes "neither" (behaviour-preserving). Any human decision to make review seal is an ADR with a Breaking/behaviour changeset for `@qadi/testing`, not a refactor side effect. Add tests that build `qadiTestLayer` with an outer sink/cache and assert they still see records and hits; keep devtools' "prove the seal" tests (`Simulation.test.ts` via `simulationLayer`, INV-QD-042) green.

**Warning signs:** `Wiring.test.ts`, `TestLayers.test.ts`, BDD `Bridge.ts` steps change expectations; `decisionCacheLookupsTotal` or `cacheOutcome` appears in a review test.

**Phase to address:** Phase 33, decision checkpoint plan first (state the rule), then implementation.

---

### Pitfall 11 (Phase 33): Putting `TestClock` and clock vocabulary into `@qadi/core`

**What goes wrong:** Core has no `effect/testing/TestClock` import anywhere in `src` (src grep); `TestClock` appears only in devtools and testing. A "sealed layer in core (ports, id prefix, clock, sink+cache)" that builds `TestClock.layer()` puts the testing module in core's production graph (consumers' bundles, `sideEffects:false` notwithstanding). The clock options also differ in vocabulary and default: review is `"live" | "test"` (public `TestLayerOptions.clock`, undefined means live), simulation is `SimulationClock` (public type, defaults to `"live"`, `"deterministic"` otherwise). Unifying the words changes two public types. Also `clock:"test"` under `it.effect` deliberately shadows the ambient `TestClock` (documented trap in `QadiReviewLayer.ts`), and `Layer.empty` for live is intentional.

**Prevention:** Core's layer takes the clock as an already-built `Layer` (or omits it); each package keeps its `clockLayer` and its public option words. Core owns only ports + id prefix + the shadow argument. Id prefixes stay caller-owned (`"eval"` vs `"sim"`; tests assert ids like `eval-1`). Devtools still must not depend on testing (ADR-QD-050).

**Phase to address:** Phase 33 design plan.

---

### Pitfall 12 (Phase 33): New core code needs 95% coverage and a new test seam before the old tests go

**What goes wrong:** Core is held at 95% and mutation is "no touched file falls"; a thin new layer module built from `Layer.mergeAll` has no logic to kill mutants with, so its tests must assert composition (every port present and fail-closed, the id prefix, the shadow arms) at core, then the two consumers' existing tests stay as wiring proof. `packages/core/test/helpers.ts` already carries a comment about an earlier hand copy of `qadiReviewLayer` drifting ("nothing caught one copy going stale"); use the new layer there too, or the drift reappears in a third place.

**Phase to address:** Phase 33, test-first plan.

---

### Pitfall 13 (Phase 34): `makeDockModel` is built with `Effect.runSync` and its input compare is per-field identity; a diagnostics object breaks both

**What goes wrong:**
- `useScoped` builds the model with `Effect.runSync(Scope.provide(make(), scope))` in a layout effect (src). Anything in `makeDockModel` that suspends (`Effect.sleep`, a first awaited sample, `yieldNow` before the fork) makes `runSync` throw an async-fiber exception; `useScoped` then closes the scope and rethrows. The poll must be **forked** (`FiberHandle.runtime`, as the source read is) and never awaited in the builder.
- `configure` dispatches on per-field identity (Phase 26 rule: "an unchanged prop must not wipe a capture", ARCH-63's defect class). `diagnostics` is an *object of four fields*; hosts pass an inline literal. The existing hook restarts "when one of the four fields changes identity, never when the `options` object does". If `configure` compares `next.diagnostics !== before.diagnostics`, an inline literal restarts the poll (and **rebuilds the host's layer**, "its own build") on every render. Compare `layer`, `collector`, `questions`, `intervalMillis` individually, and keep `options === undefined` meaning "nothing runs, reading is `noDiagnostics`".
- Double polling during migration: if `DevtoolsDock` still calls `useDiagnostics(diagnostics)` while the model also polls, the host layer is built twice and the collector sampled twice. Public `useDiagnostics` stays for non-dock hosts, so keep it on `useRunningStore`; the dock must stop calling it.
- The merged reading: `mergeReading(sampled, reading)` ("supplied wins per field") moves into the model as a store; its identity must be stable between samples (`keep(Equal.equals)` in `DiagnosticsStore`) or consumers re-render every tick.

**Prevention:** RED model tests under `TestClock` (no render): inline-equal diagnostics dispatch nothing; each of the four fields restarts exactly once; `undefined` stops the poll and reads `noDiagnostics`; supplied reading wins per field. React-level tests only for what only React can get wrong: StrictMode (mount, cleanup, mount leaves exactly one live poll), unmount stops it.

**Warning signs:** A `runDiagnostics` counter above 1 in a StrictMode test; the layer builder called per render; `eslint-disable` of `react-hooks/exhaustive-deps` reappears in a new place.

**Phase to address:** Phase 34 (RED model tests plan before moving the poll).

---

### Pitfall 14 (Phase 34): A hidden `<Activity>` rebuilds the model, so diagnostics state that survived hide/show today now resets

**What goes wrong:** `useScoped` clears its value on cleanup and rebuilds on re-show (Phase 25 WR-02/03; Phase 26 accepted "paused returns to live, backlog re-read" per 26-UI-SPEC D-04/D-05/D-13). Today the `DiagnosticsStore` lives in `useDiagnostics`'s `useState`, so it survives an `Activity` hide. Moving the store into the model means a show starts at `noDiagnostics` until the first sample (up to one interval, default 2 s): a visible blank, and the host layer is rebuilt. That is a new behavioural change nobody accepted for diagnostics.

**Prevention:** Decide and record it (ADR-QD-047 amendment text, or keep the store outside and inject it into the model). If accepted, say so in the amendment and the UI check; if not, hold the store above the scope. Pixels and the `Activity` remount remain a human check in a real browser (v1.2 audit "Accepted").

**Phase to address:** Phase 34 design/decision plan, UI check in the verification plan.

---

### Pitfall 15 (Phase 34): `FiberHandle` swallows a poll defect; `runFork` did not

**What goes wrong:** In `effect/FiberHandle` (src, `run`/`set`), a fiber that fails (not interrupts) completes the handle's internal `deferred`; nothing observes it unless something calls `FiberHandle.join`. `runDiagnostics` documents "a defect in a sample, such as a throwing `questions`, ends the run" (`runSource` likewise). Under `useRunningStore` that defect ends a root `runFork` fiber (Effect's default unhandled-failure reporting applies; verify what it logs in v4). Under a `FiberHandle` in the model's scope the poll just stops and the panel freezes with the last reading. That breaks the Core Value ("never silent") for a debug tool a developer is staring at.

**Prevention:** Wrap the poll so a defect becomes a visible reading (a `WiringRead.Failed`-style `PollFailed` state, or `Effect.logError` + a store flag) rather than relying on the handle. Add a model test with a throwing `questions` thunk. Check how the existing `readSource` handle behaves for the same case and copy or fix consistently (it is the model's own precedent).

**Phase to address:** Phase 34, model plan (test first).

---

### Pitfall 16 (Phase 34): Merging three snapshot hooks into one and `useSyncExternalStore` stability

**What goes wrong:** `useDockSnapshot`, `useExplorerSnapshot`, `useHeldChoiceSnapshot` are three one-liners over `useRunningStore(store, undefined, [store])`; Phase 26 IN-01 notes they pass a constant `undefined` run. A merged hook that builds a combined object in `getSnapshot` returns a new object per call and `useSyncExternalStore` loops ("getSnapshot should be cached"). Stability must come from the stores' own snapshots (`makeExternalStore`/`keep`).

**Prevention:** Keep one `useRunningStore` call per store, or memoise the combined snapshot on the stores' snapshot identities; a test that renders and asserts a single commit. Phase 26 IN-01 closes with this; do not also re-fix it in Phase 36.

**Phase to address:** Phase 34.

---

### Pitfall 17 (Phase 34): New model logic enters the mutation scope; DockModel.ts was at 100

**What goes wrong:** `stryker.devtools.mjs` mutates `packages/devtools/src/model/**/*.ts` only. The poll and merge rules in `react/useDiagnostics.ts` and `DevtoolsDock.tsx` were unmutated; moved into `DockModel.ts` (base 100 after Phase 26) they get mutants, and any survivor drops the file below base, violating the milestone rule "no touched file's score falls" (WX-05). Devtools' aggregate is already under the 80 break threshold when `--mutate` is widened to the `.tsx` panels (Phase 29 recorded 60.54, exit 1 with report written); do not read that exit as a failed baseline.

**Prevention:** Take the base with the same invocation the phase will use; write the model tests to kill boundary mutants (interval `Schedule.spaced` value, per-field compare, "supplied wins per field" arms) before closing; close any drop with a test, never by re-baselining (milestone precedent, 28-05 / 29-03).

**Phase to address:** Phase 34 base-measure plan and close plan.

---

### Pitfall 18 (Phase 34): TestClock polling tests miss the first tick

**What goes wrong:** A forked poll registers its sleep only after it has run; `TestClock.adjust` immediately after `configure` can precede registration and the tick is lost, giving a test that passes on retry. The poll is also forked with the *services of the fiber that built the model* (`FiberHandle.runtime` captured in the builder), so a model built outside `it.effect` polls on the real clock.

**Prevention:** Build the model inside `it.effect`, use the repo's `settleTurns` pattern (twenty `Effect.yieldNow`) before each `adjust`, and assert sample counts after exact adjustments (`interval - 1`, `interval`). No real timers in model tests.

**Phase to address:** Phase 34 test plan.

---

### Pitfall 19 (Phase 35): Any scheduler tied to `AtomRegistry` repeats CCR-QD-150's dropped render, and unit tests will not catch it

**What goes wrong:** AGENTS.md section 13 and `house-rules-evidence.md` section 4: wiring `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL` for eviction "reroutes the registry's core dispatch through React's low-priority scheduler" and "silently dropped a required intermediate render under real network timing in `examples/nextjs-newsroom`'s e2e suite". It was found by the e2e, not unit tests. Any mechanism hooking registry disposal, `Atom.keepAlive`, `registry.onDispose`-style callbacks or idle TTL is suspect for the same reason.

**Prevention:** The spike's exit criterion must include `pnpm example` (the 30 e2e) and the "existing render-sequence tests pass unchanged" check, not just new graph tests. A spike that cannot run Playwright on the host (`pnpm example` needs `playwright install`; v1.0 hit this on a Fedora host) must use CI or the container route before it can conclude "mechanism holds". The documented allowed conclusion "keep it in the provider, but state and test the rule" is a successful outcome; do not force a mechanism.

**Phase to address:** Phase 35, spike/`checkpoint:decision` plan first (as the context says).

---

### Pitfall 20 (Phase 35): "The atom set owns its sweep while mounted" has no mount signal, and a constructor-time fork leaks per atom set

**What goes wrong:** `makeQadiAtoms` is called at module scope in apps and per request on the server (SSR creates atom sets per request; effects do not run in `renderToString` today, so no sweep fiber exists there now). A fiber forked at construction runs for the life of the process: a timer per atom set, un-unref'd (keeps Node/vitest processes alive), never interrupted, multiplied by per-request SSR sets and test files. "While mounted" with no provider needs a defined signal: reader count of `QuestionBook` (`liveCount`), a first-open lazy start with idle stop, or an explicit `Scope`/dispose on the atom set (a new public surface: `makeQadiAtoms` return type, overview row, changeset).

**Prevention:** Prefer lazy start on first `open` and stop when the book has no cold entries over capacity or when the last live reader releases, with an explicit `dispose`/scope for tests; assert with a leak test (construct 1,000 atom sets, no running fibers, process exits). The provider's `sweepIntervalMillis` is a public prop: keep it working (it can configure the atom set's timing) or deprecate with a changeset; do not leave both forking, which is the multiple-sweeps defect being fixed.

**Warning signs:** vitest "open handles" warnings; tests that need `vi.useFakeTimers` to avoid waiting; two sweep fibers when one provider is mounted.

**Phase to address:** Phase 35 spike (mechanism), implementation plan (leak test).

---

### Pitfall 21 (Phase 35): Sweeping from the render path splits one question into two atoms

**What goes wrong:** `QuestionBook.open` is called from atom-family construction during **render**; `sweep` mutates the same `entries`/`order`. A sweep triggered from `open` (or on the render fiber) can evict a newly opened, still-cold entry (liveCount 0 until its reader runs after commit) when everything older is live and the book is over capacity; the next `open` for an equal question then builds a second handle: "a garbage collection cannot split one question in two" (section 13). Concurrent rendering discards renders, so mutation in render is also impure. The existing safeguard is `admit` on reader run, "unless a newer entry owns the key now".

**Prevention:** Sweep only from the qadi-owned fiber (outside render), keep `Effect.sync(book.sweep)` as the unit, and keep/extend the existing `QadiAtoms.test.ts` cases (a fresh cold entry is not evicted first, ~line 484-516). Add a test for "open during render, sweep before commit, reader runs: still one atom". `QuestionBook.ts` is in the react mutation list; its score must not fall.

**Phase to address:** Phase 35 implementation plan.

---

### Pitfall 22 (Phase 36): The duplicate BEH-QD-219..221 is a corrupted splice, not two copies; deleting one wholesale deletes the wrong text

**What goes wrong:** `spec/behaviors/29-devtools-simulator.md` (src, diffed this session) has two complete BEH-QD-219/220/221 blocks (lines 28-186 and 188-345), arrived with #155 (`965ff14c`). They are not equal:
- Copy 1 (first) has the **current** BEH-QD-221 requirement: "A query the capture never saw MUST fail with the port's own typed error, on every port ... (BEH-QD-411)", but it ends mid-sentence into a fragment of the Document Control **Change History** ("`CapturedAnswers` is keyed by port name, each map by the port description's `key`; an unseen query's answer is the description's `none` ... <br>1.2 (2026-10-05): ... 1.1 ... 1.0 (2026-08-24): Initial release (CCR-QD-070)"), then a repeated `_Previous:` link and intro paragraph.
- Copy 2 (second) is **stale** and fail-open: "A query the capture never saw MUST answer the fail-closed default" and "`undefined` ... `false` for a custom predicate - what a real deployment gets from an unwired port (INV-QD-007)", the exact text ADR-QD-129 reversed. But it has the intact tail prose (`CapturedAnswers` keyed ... `capturing` is `decoratePorts`, `replayLayer` ... `scriptedPort`) that is current.
- The header's own Change History cell lacks the 1.0 to 1.2 entries that sit in the splice.
Naively deleting copy 2 leaves a truncated BEH-QD-221 and a changelog fragment in the body; deleting copy 1 reinstates fail-open text and drops BEH-QD-411's reference. This stale copy is probably the live source of the "replay fail-open undecided" belief the milestone says is closed.

**Prevention:** Reconstruct by hand: keep copy 1's requirement text, copy 2's trailing prose (after reconciling its first sentence about `none` with ADR-QD-129), move the three history entries back into the header, delete the second intro and block. Then grep: only one `## BEH-QD-219/220/221` heading remains; links to `#beh-qd-221-a-capture-records-answers-and-a-replay-reproduces-them` (ADR-QD-129, line 883 self-link) resolve; no "MUST answer the fail-closed default" remains for a replay miss. Run `node scripts/spec-revise.mjs spec/behaviors/29-devtools-simulator.md "<entry>" --date 2026-11-NN` and then `--check`.

**Gates are silent here:** `index.yaml` has one entry per BEH, `verify-traceability.sh` checks only index-to-disk and §4 test file existence, and `Sources.ts` vs `Source.ts` in the behaviour-29 traceability row is not path-checked (the §4 test-file check reads `packages/` paths in backticks only for that section). Nothing fails if the wrong copy is kept, so the check must be a diff review.

**Phase to address:** Phase 36, first plan (before the stale-line sweep, because the sweep includes this text).

---

### Pitfall 23 (Phase 36): Spec register edits trip gate 10's CCR register, `spec-revise`, and the "stale line" sweep misses its other homes

**What goes wrong:**
- `spec:verify:strict` (gate 10) requires every `CCR-QD-NNN` cited anywhere under `spec/` or AGENTS.md to be in `spec/README.md`'s Document history register, with `KNOWN_GAPS` an exact two-direction list. Citing CCR-QD-421..427 in an ADR/BEH/INV **before** its README row exists fails the gate; an unused reserved number is named in the CCR row ("Unused: ...") as the context says. ADR Document ID must equal the file number (gate 10).
- `scripts/spec-revise.mjs <doc> "<what changed>"` with no `--date` drops its document argument (positional filter index bug, src lines 68-70). Always pass `--date`. Two phases bumping one doc conflict on Revision/Change History lines; phases 30-36 run strictly serial for that reason.
- Never run `node scripts/next-id.mjs` in this milestone (every call writes a reservation; the shared file stands at CCR 427/ADR 148/BEH 520/INV 318). Confirm a reserved id is free by grep over `spec/`, `packages/`, `.changeset/`, `AGENTS.md`.
- The stale "replay fail-open undecided" text also lives in `.planning/MILESTONES.md:76`, and `PROJECT.md:225` (Key Decisions row: "the other four ports undecided"), and possibly `spec/behaviors/06-services.md:102` ("a request its capture never saw": read it, it may be consistent), besides the BEH-29 copy above. `STATE.md:212` and `PROJECT.md:196` are already struck. Phase 36's negative gate is scoped to lines the phase adds (`git diff <base> -U0 | grep '^+'`), per the shared context; a whole-tree grep for "fail-open" also matches merged history that legitimately cites ADR-QD-129.
- Info findings listed for Phase 36 may already be resolved by 34/35 (26 IN-01 by Phase 34, 26 IN-02 `nothing` default plausibly) or by ADR/BEH edits in 30-35; re-verify each at the Phase 36 base before touching it.

**Phase to address:** Phase 36 (every plan); each of phases 30-35's records plans for the CCR-register rule.

---

## Moderate Pitfalls

### Pitfall 24 (all phases): Moving code lowers mutation scores via `ignoreStatic` and moved-away killers

**What goes wrong:** (hist) Phase 29-03 moved per-call lists to module-scope constants; `ignoreStatic: true` (all stryker configs) dropped their killed mutants while the survivors stayed (`HydrationEngine.ts` 0.9619 to 0.9605). Phase 27 shrank the mutant total by one with two known survivors, so the aggregate dipped. Phase 28 split files and exposed a real survivor in an untouched file (`GateRegistry.ts`). Phase 30 will move seam code and add module-scope options; Phase 31 deletes mutated code; Phase 34 adds code to a file at 100.

**Prevention (XC-05 as the shared context states):** record per-file base scores into `NN-mutation-base.json` at the phase base using the **same invocation** the close will use (some files are outside the config's `mutate` list and are added with `--mutate` on the command line; HydrationEngine.ts is such a case), compare with a node one-liner that fails on any drop. Add tests at the new seam before deleting old ones. Close drops with a test (precedent commits 94841eb0, 8fbd9f58, 010d9f1e), never by re-baselining. Re-measure all touched files at **milestone** close too (it found `SignatureHistory.ts` in v1.2). Stryker runs strictly one at a time and was the longest step.

**Phase to address:** every phase's first (base) and last (compare) plan.

### Pitfall 25: Verification goes stale for earlier phases

**What goes wrong:** (hist) v1.0: four phases; v1.2: Phases 21-23 reported `stale` because later phases touched files they covered. Phases 30 and 31 touch `Policy.ts`/`DecisionCache.ts`/`SharedComputation.ts`, which Phase 21-23 verification reports and ADR-132's pins cover; Phase 32 touches `Lifecycle.ts`/`Evaluate.ts`.

**Prevention:** Plan a re-verify-at-close step for 30-33 (cheap, 1-2 min each per v1.0 notes); treat "stale" as re-run, not failed.

### Pitfall 26: `pnpm check:pr` hangs on gate 15, and vitest from a package dir

**What goes wrong:** (hist, STATE) `astro check` waits on an interactive `@astrojs/check` install prompt; one run hung 30 minutes. Run `pnpm check:pr < /dev/null` and treat a step silent for ten minutes as hung; this makes the website typecheck effectively skipped, so website doc fences changed by a phase (Phases 32, 33, 35 touch `services.md`/`testing.md`/react docs) need `pnpm spec:website-examples` run explicitly. Vitest only from the repo root with `--project <pkg>`; from a package dir it fails at collection. Verify commands run under `bash -c` or with `/usr/bin/grep` because the interactive shell aliases `grep` (shared-context hygiene).

### Pitfall 27: `phase.complete` cannot parse ranges or grouped rows

**What goes wrong:** (hist, lessons in v1.0/v1.2) `XC-01..05` ranges and grouped traceability rows forced hand edits twice. `.planning/REQUIREMENTS.md` does not exist yet for v1.3 (PROJECT.md points at it).

**Prevention:** Write explicit ID lists and one traceability row per ID from the start.

### Pitfall 28: Budgets are exact counts, both directions

**What goes wrong:** Phase 30's new module must not add a `switch` (SWITCH_BUDGET), a `Schema.TaggedError` (SCHEMA_ERROR_BUDGET, 12 exact), an `Effect.fnUntraced` (UNTRUSTED/UNTRACED_BUDGET) or an `as`. A budget change is an AGENTS.md table + budget edit in one plan and needs a benchmark or ADR; milestone Out of Scope says do not change them. `PORT_DOUBLE_BUDGET` applies to Phase 31/33 tests: a broken port in a test is `scriptedPort(...)`, not a hand-built error. `METRIC_ID_LITERAL_BUDGET`: a test reads a metric by export (`decisionCacheLookupsTotal`), never by `"qadi_..."` literal; Phase 33's cache-shadow assertions are the likeliest place to break this.

### Pitfall 29: Changesets and the "never release" rule

**What goes wrong:** WX-03: a changeset per touched public package; a removed or widened public export is **Breaking** (package-scoped) plus `apps/website/.../reference/upgrading.md`. Never merge or approve a version-packages PR, never publish (standing instruction since 2026-10-06). Phase 30 (core minor: new export; audit minor if `ArchiveRefusal` widens), 32 (patch), 33 (core minor, testing/devtools patch), 34-35 (patch, or minor if a prop/return type changes).

### Pitfall 30: Test-only fixtures that pin a bad behaviour

**What goes wrong:** (hist) a finding reachable only by an untyped caller is recorded as tech debt rather than pinned by a test that locks it in (Phase 22 `signatureHistoryFromSignatures`). Phase 30's audit depth refusal and Phase 33's shadow rule are decisions, not behaviours to freeze by accident; do not pin whichever arm the first implementation happened to produce.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| One `decode(input)` helper that guards then decodes in one call | Fewer lines at eight seams | Version dispatch / projection / per-entry rules move to the wrong side of the guard (Pitfalls 1, 3) | Never for sink and hydration; fine for the plain port-wire and policy seams |
| `catch` in the decode helper to make it "total" | Closed result with no throws | Hides stack-overflow library defects; reverses a recorded stance | Never |
| `Question.ts` as the home of the service union | No new file | Import-light leaf becomes a 41-module consumer; one more type import away from a cycle | Never; use a new leaf |
| Reuse `abandoned` for reset without a separate state | Smallest diff | Waiters hang or compute leaks (Pitfall 6) | Only if tests for waiter answered + last-leaver interrupt are green first |
| Shadow sink/cache in the shared layer by default | One rule everywhere | Silent behaviour change for `@qadi/testing` users (Pitfall 10) | Never as a default; explicit argument |
| Fork the sweep at atom-set construction | Limit holds with no provider | Un-unref'd fiber per atom set, per-request SSR leak (Pitfall 20) | Never; lazy and disposable |
| Delete `generation` and its DecisionCache tests together | Looks like pure removal | Races lose their only pins | Never; seam tests first |
| Re-baselining a mutation score | Green close | Hides a lost killer test; v1.2 rule is "close with a test" | Never |
| Hand-editing the shared spec registers in parallel | Faster wall time | Revision/Change History conflicts; `spec-revise` drops args | Never; phases run serially |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@qadi/audit` -> `@qadi/core` decode | Assume audit is "decode only"; apply strict options to `recordJsonOf` or guard the whole bundle at 256 | Only the envelope/row decodes are unguarded; `recordJsonOf` keeps default options on purpose; guard with `entries` excluded or accept the stated per-record depth change (Pitfall 4) |
| `@qadi/react` hydration -> core module | Pass the whole payload to the shared helper | Keep per-entry guard + three drop reasons in `HydrationEngine.ts` |
| `@qadi/devtools` -> `@qadi/testing` | Import the shared layer from testing | Devtools must not depend on testing (ADR-QD-050); the layer lives in core |
| Effect `Layer` provide order | Assume an outer sink survives an inner sealed layer | Innermost provide wins; shadowing is explicit |
| React `useScoped` -> `Effect.runSync` | Add an awaited step to the model builder | Fork, never await, inside `makeDockModel` |
| `FiberHandle` for a background poll | Assume failures surface | They only complete the handle's deferred; surface defects explicitly |
| `AtomRegistry` scheduling | Use `scheduleTask`/`defaultIdleTTL`/disposal hooks as the sweep clock | Qadi-owned `Effect.sync(book.sweep)` fiber outside render (CCR-QD-150) |
| madge | Treat `import type` as free | It counts type edges (ADR-QD-037); check reachability |
| `check-api-surface.mjs` | Trust it to catch a moved type's stale module column | It checks names only; update overview rows by hand |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Walking input twice (envelope guard plus per-entry guard) | `readAuditArchive` / hydration slower on large bundles | Guard with the subtree excluded, as hydration does | Archives with 10^5-10^6 entries |
| New decode helper allocating per call (closures built per decode) | Decode benches regress | Build decoders at module scope; `ignoreStatic` hides mutants but not cost | Per-request port reads, sink record decode |
| Shadowed cache in review layer | Extra lookup/metric write per evaluation | Explicit argument; review defaults to none | `decideSubjects` over thousands of subjects |
| `Effect.fn`-traced helper on a hot path | 2.7-2.9 microseconds per call (ticket 101) | Plain functions for the guard; any new `Effect.fn` needs a benchmark | Per-record decode, per port read |
| Model re-polling on identity churn | Layer rebuilt every render | Per-field compare (Pitfall 13) | Every dock render |
| Sweep on every `open` | O(tracked) per ask | Timer fiber, not per-open | Hundreds of tracked questions (`maxTrackedQuestions` 500) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| A new seam skipping the guard (the review's motive) | Stack-exhaustion `RangeError` defect on hostile JSON | New module is where the guard lives; one refusal row per seam; port-wire question, answer, reply and hydration entry all covered |
| Weakening `onExcessProperty: "error"` (e.g. `recordJsonOf` default is deliberate; do not spread it) | Silent data loss of a typo'd grant (ADR-QD-002) | Keep the two option sets distinct and named for what they are |
| Replay or review layer silently fail-open via stale spec text | A reader implements `none` on a miss (INV-QD-007 fail-open) | Pitfall 22: delete the stale BEH-29 copy; ADR-QD-129 is the rule |
| `reset` letting a stale claim write the cache | A cleared (freshly invalidated) decision repopulated with a stale allow | Superseded claims never settle (Pitfall 6); INV-QD-025 key and freshness paragraphs restated |
| A decision becoming a defect (`orDie`) in the new decode path | An authorization outcome turned into a crash | No `orDie`, no catch-to-defect; refusals are values |
| Phase 35 sweep evicting a question a gate is holding | A guard reads a different atom than the registry holds | `liveCount` check retained; sweep never touches dispatch |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Diagnostics blank on `<Activity>` re-show | Developer sees an empty panel for up to 2 s | Decide and document (Pitfall 14) |
| Poll silently stops after a defect | Panel shows frozen readings as if live | Visible failed state (Pitfall 15) |
| Dock re-renders every tick | Jank in a debug tool | Stable merged-reading identity |
| StrictMode double mount shows two polls | Double metric reads, duplicate layer builds | One live poll test |

## "Looks Done But Isn't" Checklist

- [ ] **Phase 30:** every seam has a refusal row (not JSON / too deep / version-before-depth / extra envelope key / excess key) green on base *before* the move and identical after.
- [ ] **Phase 30:** `UNTRUSTED_DECODE_OPTIONS`, `exceedsJsonDepth`, `MAX_DECODE_DEPTH`, `PolicyDecodeTooDeep` still exported; `fromJson`'s error type unchanged; `SinkCodec` goldens and `SinkCodecAgreement` untouched.
- [ ] **Phase 30:** audit's depth/refusal decision recorded; `ArchiveRefusal` widening (if any) uses the full closed union, a changeset, and `Match.tagsExhaustive` consumers updated.
- [ ] **Phase 31:** `SharedComputation` seam tests cover stale-last, stale-first + third ask coalescing, two keys reset, parked-uninterruptible reset; `DecisionCache.test.ts:749-880` and the #64 pins unchanged and green; INV-QD-025, BEH-QD-439 and ADR-QD-132 amended.
- [ ] **Phase 32:** `pnpm circular`, `pnpm typecheck` (declaration emit in http/react/promise/devtools/testing), `pnpm test:tstyche`, `pnpm spec:api`; overview module column, traceability `Lifecycle.tst.ts` row, website fences updated.
- [ ] **Phase 33:** the shadow rule is written down once (ADR or doc), each call site passes it explicitly; review behaviour with an outer sink/cache is tested; no `TestClock` in core src.
- [ ] **Phase 34:** one poll under StrictMode; inline-equal `diagnostics` dispatches nothing; poll defect is visible; `useDiagnostics` public behaviour unchanged for non-dock hosts; ADR-QD-047 amendment (ADR-QD-147 may go unused) and BEH-QD-465 mention diagnostics; `pnpm spec:claims` green if devtools-spec "claims of absence" were edited.
- [ ] **Phase 35:** spike conclusion recorded with e2e evidence; no `scheduleTask`/`defaultIdleTTL`; leak test; one sweep with N providers; `QuestionBook.ts` mutation not lower.
- [ ] **Phase 36:** BEH-29 reconstructed, not merely de-duplicated; stale fail-open lines gone from `MILESTONES.md`, `PROJECT.md:225` and BEH-29; CCR-QD-421..427 each have a README register row (or an "Unused:" note); `spec-revise --check` green.
- [ ] **All:** mutation per touched file >= base (same invocation); `pnpm check:pr < /dev/null` green; `.changeset/*.md` per touched package; AGENTS.md budget tables unchanged or changed together with `check-house-style.mjs`.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Seam refusal precedence changed (1, 3) | MEDIUM | Restore the interposed step at that seam; the characterisation table pinpoints the row; no wire change to undo |
| Depth walk reimplemented, agreement broken (2) | LOW | Re-import `exceedsJsonDepth`; agreement test shows the off-by-one |
| `ArchiveRefusal` widened by mistake (4) | MEDIUM | Revert to `Malformed` mapping or ship as audit minor with the full union and upgrade note |
| Reset claim hangs waiters (6) | LOW-MEDIUM | Separate `superseded` from `abandoned`; seam tests reproduce |
| Cycle introduced (8) | LOW | Move the type to a leaf; `pnpm circular` names the edge |
| TS2883 in a dependent (9) | LOW | Export the leaf from the barrel or add a named re-export |
| Review layer shadowing sink/cache shipped (10) | HIGH if released; LOW before | Make the argument explicit and revert review to "neither"; if released, changeset correction, minor revert |
| Model rebuilt every render (13) | LOW | Per-field compare in `configure` |
| Dropped render in e2e (19) | MEDIUM | Revert the mechanism; keep the provider fork; document the rule |
| Wrong BEH-29 copy kept (22) | LOW | `git show aab87576:spec/behaviors/29-devtools-simulator.md` has both blocks; reconstruct from the diff in Pitfall 22 |
| Mutation drop at close (24) | LOW | Add the killing test at the new seam; do not touch the baseline |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 interposed step between guard and decode | 30 (plan 1, characterisation) | Seam refusal table green on base and after |
| 2 INV-096/097 agreement, catch-all | 30 | `SinkCodecAgreement.test.ts`, 60,000-level probe, goldens unchanged |
| 3 hydration reasons and independence | 30 (hydration plan) | `HydrationPayload.test.ts` one-bad-entry row |
| 4 public surface, error types, cycle, audit | 30 (decision + records) | `pnpm spec:api`, `Errors.tst.ts`, `pnpm circular`, audit round trip |
| 5 port-wire strings | 30 | String table test |
| 6 reset state conflation | 31 | Seam RED tests |
| 7 pins before deletion | 31 | `DecisionCache.test.ts:749-880` and #64 pins unchanged |
| 8 leaf placement and cycle | 32 | Reachability check, `pnpm circular` |
| 9 names, TS2883, tst pin, overview | 32 | `pnpm typecheck`, `spec:api`, `test:tstyche`, manual module-column review |
| 10 shadow rule | 33 | Outer sink/cache tests, `Wiring.test.ts`, `Simulation.test.ts` |
| 11 TestClock in core | 33 | `grep -rn TestClock packages/core/src` stays comment-only |
| 12 coverage/test seam | 33 | Core 95% coverage; `helpers.ts` uses the shared layer |
| 13 runSync build, per-field compare | 34 | Model tests under TestClock, StrictMode single poll |
| 14 Activity rebuild | 34 (decision) | UI check, ADR-047 amendment text |
| 15 FiberHandle swallows defects | 34 | Throwing `questions` test |
| 16 snapshot stability | 34 | Single-commit render test |
| 17 mutation scope | 34 | `DockModel.ts` score vs base |
| 18 TestClock first tick | 34 | `settleTurns` before `adjust` in every poll test |
| 19 dropped render | 35 (spike) | `pnpm example` (30 e2e) plus render-sequence tests |
| 20 mount signal and leak | 35 | Leak test, one sweep for N providers |
| 21 sweep splitting a question | 35 | Existing fresh-cold-entry test, new open/commit test |
| 22 BEH-29 corrupted splice | 36 | Diff review; single heading each; links resolve |
| 23 registers, ids, stale lines | 36 and each records plan | `pnpm spec:verify:strict`, `spec-revise --check`, scoped negative grep |
| 24 mutation after moving code | every phase | Per-file compare script, `NN-mutation-base.json` |
| 25 stale verification | 30-33 close, milestone close | Re-verify at HEAD |
| 26-30 process and budgets | all | `pnpm check:pr < /dev/null`, budget tables, changesets |

## Sources

- `.planning/phases/_WAVE8-CONTEXT.md`, `_SHARED-CONTEXT.md`, `PROJECT.md`, `STATE.md`, `RETROSPECTIVE.md`, `milestones/v1.2-MILESTONE-AUDIT.md` (hist; lessons 1-4 of v1.2 and v1.0)
- `.planning/milestones/v1.2-phases/` summaries and plans: 21-03/23-04/29-02/29-03 (`ignoreStatic`), 27-03 (aggregate mutation), 28-05 (untouched-file survivor), 29-01 (twelve-file base, `--mutate` widening), 25/26 review dispositions (`useScoped`, `Activity`), 26 UI-SPEC D-04/D-05/D-13
- Source read this session (src): `packages/core/src/{SharedComputation,DecisionCache,DecodeDepthGuard,Policy,SinkCodec,PortWireEncode,PortRemote,JsonHazard,Evaluate,Lifecycle,Question}.ts`, `packages/react/src/{HydrationEngine,QadiProvider,QuestionBook}.ts(x)`, `packages/audit/src/{AuditArchive,AuditEntry}.ts`, `packages/testing/src/QadiReviewLayer.ts`, `packages/devtools/src/model/{DockModel,DiagnosticsStore,Simulation}.ts`, `packages/devtools/src/react/{useScoped,useRunningStore,useDiagnostics,DevtoolsDock}.tsx`, `node_modules/effect/src/FiberHandle.ts`, `scripts/{check-api-surface,spec-revise}.mjs`, `spec/scripts/verify-traceability.sh`, stryker configs
- Spec: ADR-QD-132 (shared computation), ADR-QD-037 (madge), ADR-QD-129 (replay miss), INV-QD-025/096/097, `spec/process/house-rules-evidence.md` section 4 (CCR-QD-150), `spec/behaviors/29-devtools-simulator.md` (diffed), `spec/traceability.md:470`
- A madge reachability computation run this session on `packages/core/src` (Ports.ts reaches 41 modules, none reaching `Question.ts`, `Evaluate.ts` or `Lifecycle.ts`)

---
*Pitfalls research for: Qadi v1.3 Arch Wave 8 (Phases 30-36)*
*Researched: 2026-11-12*
