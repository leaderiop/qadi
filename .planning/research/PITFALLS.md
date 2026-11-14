# Domain Pitfalls

**Domain:** Effect v4 authorization library (pnpm monorepo), subsequent milestone v1.4 "Arch Wave 9", Phases 37-42 (six internal deepenings, ARCH-84..89)
**Researched:** 2026-11-14
**Base commit:** `637c0601` (branch `arch-wave-9`)
**Overall confidence:** HIGH for repo mechanics (read from source at the base and from the v1.0/v1.2/v1.3 records); MEDIUM for two runtime claims marked (infer): FiberHandle's state after a fiber completes, and the exact render sequence Phase 42 could disturb. Phase 41's defect is reasoned from code and JavaScript semantics, not yet reproduced (the context says so too).

Conventions: (src) = read in the current tree this session; (hist) = from `.planning/` records of waves 5-8; (infer) = reasoning a RED test or spike must confirm. Planners re-verify against the base per `_WAVE9-CONTEXT.md`. The previous milestone's pitfalls (decode seams, SharedComputation, sweep) are superseded by this file; where a v1.3 lesson still bites it is cited under (hist).

---

## Critical Pitfalls

### Pitfall 1 (Phase 37): The shared module cannot be "bump the token and fork" in one call, because the three stores publish between the bump and the fork

**What goes wrong:** The review's shape is "one module owns the handle, the generation, the close state, the replace-and-interrupt step". Read literally that is `run(effect)`: bump, fork. But every store does a third thing in between (src):
- `TimelineFeed.readSource` (L136-157): `generation += 1; status.set(READING); forkRead(...)`.
- `DiagnosticsFeed.start` (L199-228): bump, then `show(diagnosticsStarting.status)` "Before the fork: its synchronous prefix may already reach `Live` or `Stopped`".
- `SimulationSession.start` (L538-544): bump, `run = Running; commit()`, then `if (mine === generation) fork(...)` because "a subscriber notified by that commit may already have superseded this run".

A one-call `run` publishes `Starting`/`Running` after a run whose synchronous prefix has already landed, so a `Live` or `Stopped` is overwritten by `Starting` and the panel sticks. SimulationSession's re-check after the commit (a reentrant `supersede` from a subscriber) is lost the same way: a stale run is forked and, with no token check at fork time, runs a Live resolver the reviewer already abandoned.

**Why it happens:** The duplicated lines look identical (`generation += 1; const mine = generation; ... fork(...)`), but the order of the publish relative to the fork is the contract.

**Consequences:** A flaky "stuck on Starting" status that only shows when the first sample resolves synchronously; a superseded Live run that keeps asking the application's resolvers (BEH-QD-322, ADR-QD-137); both pass on a slow happy path.

**Prevention:** Make it a two-step interface: `begin()` returns a token (and bumps), the store publishes its "starting" value, then `fork(token, effect)` forks only while the token is still current, returning whether it did. `landing(token)`/`isCurrent(token)` is a plain function the store calls per write (Timeline's per-record `accept`) and at exit. Write the RED test at the module first: "a begin, a reentrant supersede during the publish, then fork: the effect never starts"; and a store-level test per store: "a run whose synchronous prefix reaches Live is not overwritten by Starting".

**Warning signs:** A module `run(effect)` with no gap between bump and fork; a store test edited rather than re-pointed; `DiagnosticsFeed.test.ts` Starting/Live ordering rows deleted.

**Phase to address:** Phase 37, plan 1 (module interface and its RED tests before any store is converted).

---

### Pitfall 2 (Phase 37): Finalizer order is load-bearing; building the handle and the close flag in the wrong order, or in the wrong place, reads teardown as a failure

**What goes wrong:** Each store creates the `FiberHandle` first and adds the `generation += 1; closed = true` finalizer after it, so on close the finalizer runs first and the run the handle then interrupts is already "replaced" (src, comment at `TimelineFeed.ts:127`, `DiagnosticsFeed.ts:175`, `SimulationSession.ts:355`). Reverse the order (a module that adds the finalizer before `FiberHandle.make`, or `Effect.acquireRelease` composed the other way) and the handle interrupts the fiber while its token is still current. Then:
- an `onExit` with `Cause.hasInterruptsOnly` still stays quiet, which hides the mistake, but a run whose own finalizer defects during interruption has a cause that is not interrupts-only, so a closed store publishes `Stopped` (Timeline, Diagnostics) or `Broke` (Simulation) into a scope nothing follows, and `DiagnosticsFeed`'s doc promise "closing it interrupts the run, without a `Stopped`" breaks;
- a late `accept` between the interrupt and the bump lands on a closed store.

The module also has to be built inside the caller's fiber: `FiberHandle.runtime(handle)` captures the services of the fiber that builds the model, and `useScoped` builds with `Effect.runSync(Scope.provide(make(), scope))` (src), so anything in the module that suspends throws an async-fiber exception on mount, and a model built outside `it.effect` polls on the real clock (hist, v1.3 Pitfall 18).

**Prevention:** One test per interface, written RED against the module: close mid-run with a run whose finalizer defects (no `Stopped`, no landed write); close then `begin`/`fork` (the new fiber is interrupted at once, `FiberHandle.run` on a closed handle does this, src L401); close twice. Keep the module synchronous to build (`FiberHandle.make`, `Effect.addFinalizer`, `FiberHandle.runtime` only), `Effect.fn` for the builder, no new `Effect.fnUntraced` (`UNTRACED_BUDGET` is exact). State the ordering once, in the module's doc, because three copies of that comment are what the module replaces.

**Warning signs:** The finalizer is registered in a different statement from the handle's creation; the module test never uses a run that defects while being interrupted; a store test needs `Effect.runSync` replaced by `runPromise` to pass.

**Phase to address:** Phase 37, plan 1.

---

### Pitfall 3 (Phase 37): One "is it a failure" check cannot serve all three stores; interrupt-vs-failure is different in SimulationSession

**What goes wrong:** The review notes the check `mine === generation && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)` repeats verbatim in Timeline and Diagnostics. SimulationSession does not use it. Its `land` runs `Effect.exit(program)` *inside* the fiber and treats any non-success exit with a current token as `Broke` (src L493-512). An inner self-interrupt (a resolver that interrupts itself) produces an interrupts-only exit with a current token: today that is `Broke`, loud and visible ("a panel that showed nothing would look merely unresponsive"). Pushing SimulationSession through the shared "ignore interrupts-only" check turns it into silence: `run` stays `Running` forever.

Also drift (src): stopping with no run forks `Effect.void` unconditionally in Diagnostics (L231-233) and only when `FiberHandle.getUnsafe` is `Some` in SimulationSession (L462). The context asks the phase to decide. Which is right is a test question: a stop with no run must not allocate a fiber, and a stop after a run *completed* must also be a no-op (whether the handle clears a completed fiber so `getUnsafe` is `None` is (infer); pin it).

**Prevention:** Give the module the per-write guard and a `stop`; let each store keep its own exit classification, or expose two named checks (`failedWhileCurrent` for the feeds; the session keeps a plain current-token check and its `Broke` rule). Decide the stop semantics with a module test table: {no run, running, completed, closed} x stop, asserting fiber allocation and token bump, then delete the unconditional form. Pin the self-interrupt row at SimulationSession before touching it ("a program that interrupts itself reads Broke, not Running").

**Warning signs:** SimulationSession's `land` loses its `Effect.exit`; `Cause.hasInterruptsOnly` appears in `SimulationSession.ts`; a "stop" test that asserts only the final snapshot, not that no fiber was forked.

**Phase to address:** Phase 37, plan 1 (decision on stop) and the SimulationSession conversion plan.

---

### Pitfall 4 (Phase 37): StrictMode and `<Activity>` build a second scope; module-level state or a global token couples the two instances

**What goes wrong:** `useScoped` (src) runs the effect, the cleanup and the effect again under StrictMode, so two models are built, the first closed before the second is used; a hidden `Activity` does the same on every hide/show. The first model's runs, already interrupted, can still hold closures over its stores. If the new module keeps any state outside the per-build closure (a module-scope counter used as the generation, a shared `WeakMap` of handles, a memoised singleton), instance 2's `begin` can invalidate instance 1's tokens or, worse, a late write from instance 1 compares equal to a token of instance 2.

**Prevention:** Per-build closure state only, exactly as the three copies are today; tokens compared only within one instance. Add a module test that builds two instances in two scopes, closes the first mid-run, runs the second, and asserts the first's late `accept` lands nowhere. Keep the existing StrictMode/Activity suites (`TimelineLifetime`, `DiagnosticsLifetime`, `useSimulationSession` tests) untouched and green as the through-React guard.

**Warning signs:** A `let` at module scope in the new file; a `WeakMap<Scope, ...>`; a StrictMode test that now needs a longer settle.

**Phase to address:** Phase 37, module plan.

---

### Pitfall 5 (Phase 37, applies to every phase): Moving logic out of the three stores drops mutation scores and the new module starts with no base

**What goes wrong:** (hist) The v1.3 Phase 36 close measured `TimelineFeed.ts` falling 1.0000 to 0.9194 from five survivors in the generation token and `closed` flag it had just gained; the tests TF18/TF19 killed them. Phase 37 moves exactly that logic, so the same survivors reappear in the new module, while the stores' remaining glue (the publish-before-fork order, the `restart` guard) loses the per-store tests that used to kill its mutants if those are shrunk too eagerly. Base scores at v1.3 Phase 36: `TimelineFeed.ts` 1.0, `SimulationSession.ts` 0.9745 (src, `36-mutation-base.json`), `DiagnosticsFeed.ts` to be measured. `stryker.devtools.mjs` mutates `src/model/**` with `ignoreStatic: true` (module-scope constants vanish from the count), `thresholds.break: 80`. The new file is in that glob automatically.

**Prevention:** Take `37-mutation-base.json` at `637c0601` with the same invocation the close uses (XC-05), including the three stores. Write the module's tests to kill boundary mutants first (token off-by-one, `closed` before/after bump, `>`/`!==` on the token, per-write guard vs exit guard). Delete a per-store copy only after the module test covering it is green; the context's "shrink to what each store does with a landed result" is the end state, not the order of work. The new module's own score has no base, so set the bar at the least of the three stores' base (0.9745) and close any survivor with a test, never by re-baselining or by naming it equivalent without a proof (the v1.3 `TimelineNotice` precedent needed a render argument).

**Warning signs:** A phase-close compare that reports the new file as "unmeasured"; `SimulationSession.test.ts` shrinking by hundreds of lines in the same commit that deletes the code.

**Phase to address:** Phase 37 (first plan base, last plan compare); the milestone-close re-check also re-measures all three.

---

### Pitfall 6 (Phase 38): "Derive from one constant" can change the wire, or leave the defect in place, in four different ways

**What goes wrong:** The sink record wire is read by `decodeSinkRecord`, written by `encodeSinkRecord`, stored in audit rows, streamed to devtools, and old captures are replayed. Wire bytes must not move (the context says so). Failure modes (src):
1. **Key order.** `decisionV2Fields` is documented "in the order they are written": `_tag`, `version`, the record's fields, `outcome`. The encoder builds `{ ...record, version: 2 as const }`, so `version` lands after the record's keys in the spread but `Schema` may emit in schema order. Swapping the spread (to put the constant first) or rebuilding the object changes the serialised string while staying JSON-equal; every golden string comparison goes red, or, if the goldens compare parsed objects, nothing notices.
2. **Widening the type.** `WireVersion` is a *closed union of literals* (`2`); `ReadonlyArray<WireVersion>` is the public `UnsupportedVersion.supported` type. Deriving `WireVersion` from an annotated `WIRE_VERSIONS: ReadonlyArray<WireVersion>` is circular, and deriving it from `number` or from a non-`as const` array widens it. The user's rule is the full union, written out, not `old | "New"` and not `number`. The constant must be a literal-typed `const`, with the array a literal tuple.
3. **The `as` escape.** The encoder uses `2 as const` and `project`'s return is `SinkRecordWire`; replacing it with the constant typed `WireVersion` is fine, but the first time the union has two members the encoder needs the *current* version only and the decoder all of them. The tempting fix is a cast or `Schema.Literal(...WIRE_VERSIONS)` for the encode schema too. Keep two named things: `CURRENT_WIRE_VERSION` (what is written) and `WIRE_VERSIONS` (what is read), with the current one a member of the read list by type (`Extract`/a satisfies check), not by comment.
4. **The decoder's check.** `versionThenEnvelope` compares `version === WIRE_VERSION` (single) but reports `supported: WIRE_VERSIONS` (list). With a list, the check must be membership (`WIRE_VERSIONS.includes` on an own-value read of an *untrusted* `unknown`), written without `as`; a `includes` on a `ReadonlyArray<2>` with an `unknown` argument does not typecheck, tempting a cast.

Also: `version: 2` appears for a *different* wire (the hydration payload, `HydrationEngine.ts:208`, and audit docs). A search-and-replace on `version: 2` couples two unrelated versions.

**Prevention:** Characterise first, on the base, with the same invocation: a byte-for-byte corpus (`JSON.stringify` of `encodeSinkRecord` over decision, obligations, decided/failed outcomes) committed as a golden; the existing `SinkCodec.test.ts` rows asserting `WIRE_VERSIONS` equals `[2]` and the three `UnsupportedVersion` payloads stay literal-valued (a test that derives its expected value from the constant under test is tautological, keep the hard-coded `2`). Add the scratch experiment the v1.2 Phase 23 plan used: set the constant to 3 in a scratch tree; the *intended* outcome is a compile error (or a still-green round trip), where on the base it compiles and the round trip fails. Add a `tstyche` pin that `WireVersion` is exactly `2` and `UnsupportedVersion["supported"]` is `ReadonlyArray<2>`. Note that `ignoreStatic` makes the derived module-scope constants invisible to Stryker, so mutation will not guard this phase: the type pin and the golden are the guard.

**Warning signs:** A diff that touches `omitUndefined` or the spread order; a golden regenerated rather than left alone; `as` near the version; `hydration` files in the diff.

**Phase to address:** Phase 38 (single plan: golden first, then derivation, then the INV "the codec reads what it writes for every supported version" with the property test iterating `WIRE_VERSIONS`).

---

### Pitfall 7 (Phase 39): The reason table can reorder or widen the metric's label set, and nothing in the metric gate notices

**What goes wrong:** `hydrationDropReasons` is the frequency metric's `preregisteredWords` (src L284), so its *order* decides the snapshot order and the devtools panel's row order ("in declaration order, which pre-registration fixes", `Hydration.test.ts:100`). Today the order interleaves kinds: ForeignSubject, UnencodablePolicy (dehydration), PayloadSubjectMismatch (payload), MalformedEntry, UndecodablePolicy, EntryTooDeep (entry), UnsupportedPayloadVersion, MalformedPayload, PayloadTooDeep (payload). A table grouped by kind (the natural shape) silently reorders the panel and moves series positions for any consumer that reads the snapshot by index. Gate `[metric-table]` checks id, type and file only, not the label values, and the devtools assertion `[...hydrationDropReasons]` compares the list to itself. The only independent check is `assert.strictEqual(hydrationDropReasons.length, 9)` (and its comment: "written out, not read from" the constant). Rename-by-derivation (`keyof typeof table` over a differently cased key) would also change the label strings, which are the registry's frequency keys and appear in dashboards.

Related traps (src):
- `isHydrationDropReason` (L238) reads words from an untrusted snapshot. If the table becomes an object literal and membership is `word in table`, `"constructor"`, `"toString"` and `"__proto__"` are members. Use `Object.hasOwn`, as `FieldLattice.ts` does (ADR-QD-092).
- The metric must stay a module-scope `Metric.frequency("qadi_hydration_dropped_total", ...)` with its id on the declaration (`[metric-declaration]`); building it in a loop or helper trips the gate. The description is part of the registry key (`type:id:description`, memory), so do not touch it while moving the declaration; `HydrationMetrics.test.ts` pins each description.
- `MEANINGS` (summary and remedy strings) is a second mapped table keyed by the same union; folding the kind into it is fine, rewording is not (pinned by tests and read by react's console warning and the devtools panel).

**Prevention:** Before the change, commit a snapshot test of the metric's preregistered words in order, with the nine literals written out. The table is an ordered, `as const satisfies` structure in the *current* declaration order, with the kind as a field; the value list is read from it with a typed accessor that needs no `as` (the repo's precedents: `Errors.ts:465`, `FieldLattice.ts`; if `Object.keys` forces a cast, build the tuple first and derive the table's type from it, or use a typed helper with a type predicate, never `Record<string, unknown>`). The unions are derived by `Extract` on kind; react's `PayloadRefusalReason`/`EntryDropReason` become `Extract`ed views, and its doc ("written out rather than `Extract`ed") is rewritten in the same commit. A new reason without a kind must be a compile error: add the `.tst.ts` negative (`// @ts-expect-error`-style or a tstyche `.not.toBeAssignableTo`).

**Warning signs:** `hydrationDropReasons` is now produced by `Object.keys`, `.filter`, or a `flatMap` over kinds; the `length === 9` assertion edited; the `read.drops` order test passing only because both sides read the same constant.

**Phase to address:** Phase 39 (ordering snapshot plan first; the `[metric-table]` row and `spec/behaviors/19-hydration.md` / BEH-QD-232 in the records plan).

---

### Pitfall 8 (Phase 40): The decode-side vocabulary is observable by hosts, logs and docs, not only by devtools

**What goes wrong:** `MalformedReason` is the kebab-case value `onMalformed(frame, reason)` hands to a host, *and* the string logged as `qadi.reason` when no host callback exists (src, `Source.ts:288`). The mapping is not a pure 1:1 rename: `Malformed` is `"not-a-record"`. Passing `DecodeRefusal` through changes the callback's argument type (breaking, which the context accepts), and it also changes:
- the logged annotation (a log pipeline keyed on `qadi.reason="too-deep"` silently stops matching);
- `examples/nextjs-newsroom/src/client/Dock.tsx:73` (consumed by `pnpm example`, the 30-test e2e), `packages/devtools/README.md:100`, `apps/website/.../packages/devtools.md:108`, `reference/upgrading.md:78` ("reports the bare frame as `"not-a-record"`"), `packages/http/src/DecisionStreamRoute.ts:32` (a doc comment that names the string), `spec/behaviors/26-decision-stream.md`/`27-devtools-timeline.md`, `INV-QD-170`, `surface.tst.ts`, `Source.tst.ts`;
- the sentence a describer produces. `DecodeRefusal.UnsupportedVersion.version` is `unknown` (any JSON value) and `Malformed.message` can echo parts of untrusted input. A describer that interpolates them with a template literal throws on a symbol or null-prototype object and can balloon a log line. The encode-side describer (`describeEncodeRefusal`, src) only formats paths and counts, so it is not the model for these two arms.

Replaying an old capture is unaffected on the wire (stored records are version-2 bytes and the decode path is unchanged), but a *consumer-visible* old capture, a recorded list of `(frame, reason)` pairs in a host's tests or fixtures, stops matching.

**Prevention:** Decide and state the compatibility rule up front in the ADR (ADR-QD-150..155 range reserved; Phase 40's is 152): either the host callback gets `DecodeRefusal` and the log keeps a stable string through the one core describer, or both change. Pin the five reason words, the `qadi.reason` annotation and the not-a-record mapping in a table test on the base before removing `reasonOf`. The describer takes the refusal and returns a bounded string (truncate `message`, render `version` through a safe JSON-or-`typeof` function, never a template literal on `unknown`). A core `describeDecodeRefusal` is a new public export: gate 13 row, core changeset, `Match.tagsExhaustive`, no `switch`. Breaking changeset for devtools, the `upgrading.md` entry, README and website prose, the example, and `pnpm spec:website-examples` for any compiled fence.

**Warning signs:** `Dock.tsx` or a website fence still names `"not-a-record"`; the changeset says patch; the describer returns a sentence containing an unescaped `version`.

**Phase to address:** Phase 40, first plan (compatibility decision plus pin table), the records plan (changesets, upgrading, docs, example).

---

### Pitfall 9 (Phase 40): "Decode the audit record once" can change what an entry stores and what Retention counts

**What goes wrong:** `decodeAuditEntry` decodes `input.record` twice on purpose (src L193-209): `decodeSinkRecord` (strict, depth-guarded, envelope-projected) for the record, and `recordJsonOf` (default options, "the one lenient decode in this package") to get the stored JSON form with an envelope key a newer writer added dropped. The obvious single-decode is to re-encode the decoded record. That is not the same value: `encodeSinkRecord` goes through `omitUndefined`, canonical key order and finite-number checks (`SinkRecordNotEncodable` is a new failure channel on a read path), whereas the lenient decode keeps the input's own key order and values. `Retention.ts` keys a `MutableHashMap<AuditEntry, number>` on structural equality of entries (src L137), so an entry whose `record` differs in key set (`undefined` versus absent) or nested ordering would count differently. A re-encode of a record that `decodeSinkRecord` accepted but `encodeSinkRecord` refuses (an `Inconsistent` already refused; a record with `-0` or a float in a field) turns a successful read into a refusal.

Also: `recordJsonOf` is budgeted in AGENTS.md §7a (`UNTRUSTED_DECODE_BUDGET`, count 1 for `AuditEntry.ts`); removing it (count 0) or moving it must update the table, the budget in `scripts/check-house-style.mjs` and `[untrusted-decode-table]` together, in both directions.

**Prevention:** Make the new interface return what the strict decode already produced as JSON (an extra field on core's result, e.g. the projected envelope) rather than re-encoding. Keep the existing read tests as the oracle and add a row per case on the base first: an unknown envelope key, a key-order permutation, `undefined`-valued optional fields, a record with a float, then assert the stored `AuditEntry.record` is structurally equal before and after. `Retention` tests unchanged and green. If the budget count moves, change AGENTS.md, the budget and the table in the same task.

**Warning signs:** `encodeSinkRecord` is imported in `AuditEntry.ts`; `decodeAuditEntry`'s failure type gains an arm; `UNTRUSTED_DECODE_BUDGET` is edited without a matching AGENTS.md row.

**Phase to address:** Phase 40, audit plan.

---

### Pitfall 10 (Phase 41): One "guarded render" function cannot have one return contract; the three guarded copies deliberately disagree, and the phase can be refuted

**What goes wrong:** The context asks for one package-private guarded value-to-text function. The existing guarded copies answer differently on purpose (src):
- `Filters.ts:136` `render` returns `ReadonlyArray<string>`: a string as itself, `[]` for `undefined` or a throw (an absent value is simply not searchable).
- `SimulationForm.ts:95` `stringify` returns `string | undefined` and `undefined` means "refuse the field" (the next function round-trips it).
- `Remedies.ts:574` `render` returns the *word* `undefined` for a value `JSON.stringify` cannot represent, on purpose: "right label for a policy only an absent attribute satisfies", and it is **unguarded** against a throw.
- `Inspect.ts:300` `outsideUnion` already cannot throw (`JSON.stringify` of a string cannot throw; objects go to the literal "an object"; `String(value)` on a bigint or symbol is fine). It quotes strings and prints "an object" for objects. Folding it into the shared function changes its output (pinned by tests and by ADR-QD-092's remedy text).
- `QuestionsPanel.tsx:388` `resourceOf` is not JSON-based at all (`Object.keys(...).join`); it belongs to the phase only as a locality change.

A single function returning `string` swaps the `[]`/`undefined`/`"undefined"` semantics and shifts pinned remedy and filter texts. And the latent defect is real only for `Remedies.render` (a `BigInt` or circular `witnessed.value`; `JSON.stringify(10n)` and a cycle both throw `TypeError`, JS semantics, not yet reproduced here).

**Prevention:** RED first, on the base: a Remedies test where a policy built in code holds a bigint, and one with a circular object, rendering a remedy (it must throw today, or the phase is a pure locality change and the requirement is downgraded with the evidence, as the context permits). Then the shared primitive returns `string | undefined` (the guarded fact only), and each consumer keeps its own mapping: filters to `[]`, form to refusal, Remedies to the word `undefined`, `outsideUnion` untouched unless its output is provably identical. One test table for the primitive (string, number, `undefined`, function, symbol, bigint, circular, nested bigint, `NaN`, a `toJSON` that throws). A pinned-output row per consumer so no panel's text moves.

**Warning signs:** The new function's signature has a default (`?? "undefined"`) built in; `Inspect.ts` or `QuestionsPanel.tsx` change in a diff that claims only a safety fix; a remedy or filter test regenerated.

**Phase to address:** Phase 41 (plan 1 is the RED reproduction or the refutation; the downgrade decision belongs there).

---

### Pitfall 11 (Phase 41): The new `try/catch` mutants and a React-panel scope gap

**What goes wrong:** (hist, src) `stryker.devtools.mjs` mutates `src/model/**` only; `Remedies.ts`, `Filters.ts`, `Inspect.ts` and the new module are in scope, `react/QuestionsPanel.tsx` is not. Every `catch` block and each `undefined` branch of the shared primitive is a `BlockStatement`/`ConditionalExpression` mutant that survives unless a test hits it: the throw arm needs both a bigint and a cycle, and the `undefined` arm needs a function and a symbol. Consumers that lose their local `try/catch` lose their local killers too.

**Prevention:** Base the touched files (`Filters.ts`, `SimulationForm.ts`, `Remedies.ts`, `Inspect.ts`) with the final invocation; close every drop with a test at the primitive's table, never by re-baselining.

**Phase to address:** Phase 41 base and close plans.

---

### Pitfall 12 (Phase 42): The seed's timing is a contract with three independent pins, and a "tidier" construction can break each one without a unit test failing

**What goes wrong:** (src, ADR-QD-148/149, v1.3 Phase 36) The seed defect was a registry removing a node one macrotask after nothing held it; the fix keeps the seed in the question's handle and a `keepAlive` grant node in the registry, depends on the `subject` atom being `keepAlive` (landing order pinned by `QadiProvider.seed.test.tsx` SD5: a seed fix without the subject keepAlive shows a server allow forever), and reads through `seededIn`, which uses `registry.getNodes()` and `valueOption()` and never `registry.get`. Building the computing atom inside `makeSeededQuestion` touches every one of those:
- **Subscription creep.** Inside the computing atom, `seededIn(get.registry)` is deliberately not `get(grantAtom)`: "read from the registry's grant without subscribing, so a seed given later cannot re-run a computation whose answer it does not change". Handing the question the subject and the runtime makes `get(grantAtom)` one keystroke away; it adds a dependency, re-runs the evaluation when a seed arrives, and changes the render sequence `QadiProvider.test.tsx` pins.
- **Exactly one `Atom.readable` per question.** The grant atom is never read through a registry's `get`; adding a second readable or a wrapper changes notification and batching.
- **Liveness first.** `input.track(get)` runs *first* in the reader, before any `get`, and `live()` registers the release as the reader's finalizer so a dispose-then-synchronous-reread is never seen by the sweep as a drop to zero (ADR-QD-148). Moving the computing atom moves the code that must run in that exact order; a reorder shows only as an eviction race under load or an extra e2e render.
- **Subject identity.** The question must receive the *same* `keepAlive` subject atom object, not build its own; a second `Atom.make` loses the SD5 guarantee and the per-atom-set isolation (a `subject` per atom set, tenants in one process).
- **Cross-request containment.** ADR-QD-149's alternative A failed because a book entry is module-scope on a server; anything the question holds that is *not* per-grant (a retained registry, a decision cached on the handle) reopens the leak. The `WeakMap<SeedGrant, SeededDecision>` stays the only holder.
- **Dropped render.** (hist, CCR-QD-150) Anything touching `scheduleTask`/`defaultIdleTTL` or registry dispatch dropped a required render and was found only by the e2e. An inversion that changes *when* the computing atom is built can do the same.

The current unit test (`HydrationEngine.test.ts`, a fake `computedFor`) cannot see any of these, which is part of the review's own argument, but the replacement tests must, so the pins must be moved, not deleted.

**Prevention:** The first plan is the human checkpoint and no code changes until the human has decided (go, amend ADR-QD-103/148/149, or a rejection ADR). A rejection is a valid, recorded outcome, and the reserved ADR-QD-155 and CCR-QD-433 are its homes; name the unused BEH/INV numbers "Unused" in the CCR row. If it goes: keep SD1-SD5, HL1-HL6, the bare-registry cases and the eviction pins untouched and green as the guard; add a RED test that the seed read creates no node for an unhydrated question and that a late seed does not re-run the computation (count evaluations); run `pnpm example` (30 e2e) and the render-sequence tests before declaring the mechanism sound, not only vitest. The memory rule applies at the checkpoint: one `AskUserQuestion`, then stay quiet through stop-hook repeats.

**Warning signs:** `get(grantAtom)` or `registry.get` inside the new construction; `runtime.atom` called twice per question; `HydrationEngine.ts` now imports `QadiAtoms.ts` or the subject atom is created in two files; an e2e render-count change.

**Phase to address:** Phase 42, plan 1 (checkpoint) and the implementation plan only after a recorded "go".

---

### Pitfall 13 (Phase 42): HydrationEngine and QadiAtoms are the two weakest-scored react files and the phase moves code between them

**What goes wrong:** (hist) Base scores at the v1.3 Phase 36 close: `QadiAtoms.ts` 0.8966, `HydrationEngine.ts` 0.9776. `HydrationEngine.ts` is not in `stryker.react.mjs`'s `mutate` list (DecisionOutcome, QuestionBook, HydrationEvent, SweepScheduler), so its base only exists when measured with `--mutate` on the command line, as Phase 36 did. A different invocation at close reads "unmeasured" or a different number. Moving logic from the `computedFor` callback into `makeSeededQuestion` shifts mutants between files: the callback's mutants leave `QadiAtoms.ts` (score changes either way) while `HydrationEngine.ts` gains a runtime-dependent construction that the fake-`computedFor` test never exercised.

**Prevention:** Measure both files at `637c0601` with the exact `--mutate` list the close will use and commit `42-mutation-base.json`; tests at the new seam first (real runtime and a real subject atom, no fake), then delete the old fake-based ones. A drop is closed with a test.

**Phase to address:** Phase 42 base and close plans.

---

## Moderate Pitfalls

### Pitfall 14 (all phases): Spec gates catch drift only in the direction they check

**What goes wrong:** (src, AGENTS.md §11-§15)
- **Placeholder ids.** `ADR-QD-NEXT`, `CCR-QD-NEXT`, `BEH-QD-NEXT`, `INV-QD-NEXT` (and suffixed forms) in source, tests, titles or BDD are refused by `[no-numbering-placeholder]`. Never run `node scripts/next-id.mjs` in this milestone: every call writes a reservation, and the shared file is already set to CCR 433, ADR 155, BEH 550, INV 330 (context, `git rev-parse --git-common-dir`). Confirm a reserved id is free by grepping `spec/`, `packages/`, `.changeset/` and `AGENTS.md`, and note the unused ones.
- **ADR numbering = file number.** `spec/decisions/NNN-slug.md` has `Document ID | QADI-ADR-NNN` and an `index.yaml` entry; gate 10 (`pnpm spec:verify:strict`) fails if they disagree. Next free is 150; the file listing already has gaps, which is fine because the ids are not required contiguous, but a document must not be created for a number a different phase reserved.
- **CCR register.** Every `CCR-QD-NNN` cited anywhere under `spec/` or AGENTS.md must have a Document-history row in `spec/README.md`; `KNOWN_GAPS` (src, `verify-traceability.sh:295`) is an exact two-direction list. Citing CCR-QD-428 from an ADR or BEH *before* its README row exists fails the gate; a phase therefore writes its README row in the same plan as its first citation.
- **`spec-revise`.** `scripts/spec-revise.mjs` drops its document argument without `--date` (hist, v1.2 and v1.3). Always pass `--date` and run `--check`.
- **Gate 13 is names-only.** `check-api-surface.mjs` checks that an export's name appears in `spec/overview.md`; it does not check the module column. Phase 40 (a new core describer, a removed devtools type) and Phase 39 (the exported `hydrationDropReasons`' module) must hand-edit the overview rows; a stale "Source.ts" passes the gate (hist, Phase 29 WR-01).
- **Doc-example compile.** ` ```typescript ` fences in `spec/behaviors/*.md` are compiled by `pnpm spec:examples`, and the website's by `pnpm spec:website-examples`; a ` ```ts ` fence is an uncompiled listing. A behavior for the new module (Phase 37 is package-private, so its behavior text is a listing, not an export) must not use `typescript` unless it compiles against the real API.
- **DoD table.** `scripts/check-dod-table.mjs` (gate 11) requires "gate N" in any prose to name the command; prose giving only a number fails. Applies to every CCR row and ADR text written this milestone.
- **Traceability.** Every behavior needs tests and `.feature` files carry `@REQ-QD-NNN`; the "Covers" cell is checked for file existence only. A stale cell stays silent (hist, Phase 32's `Lifecycle.tst.ts`).

**Prevention:** One records plan per phase that lists: ids confirmed free, README row, `index.yaml`, overview rows by hand, traceability rows, INV text, changeset, `spec-revise --date --check`. Run the gate set in the order `pnpm check` runs it, not selectively.

**Phase to address:** every phase's records plan; the CCR row's "Unused:" note per the context.

---

### Pitfall 15 (all phases): `pnpm check:pr` must run with stdin closed, and verify commands are shell-sensitive

**What goes wrong:** (hist, v1.2, v1.3) `astro check` (gate 15, `pnpm website`) waits on an interactive `@astrojs/check` install prompt and proceeds only with stdin closed; one run hung 30 minutes before anyone noticed. `check:pr` is `scripts/run-check.mjs --skip-mutation`, derived from `check`, refusing to run if it cannot find exactly one `pnpm mutation` step, so do not edit that script or reorder `check` casually. Because the website typecheck is effectively skipped under `< /dev/null`, website fences changed by a phase need `pnpm spec:website-examples` run explicitly (Phase 40's `upgrading.md` and devtools docs). Verify commands: the executor shell is zsh with `grep` aliased, so use `bash -c` or `/usr/bin/grep`, quote globs, `grep -F` for `$`/`{`/`}`; vitest only from the repo root with `--project` (from a package directory it fails at collection). Greps over the repo also hit `.stryker-tmp/` (gitignored sandbox copies, present now), `examples/nextjs-newsroom/.next/` (stale build chunks naming `onMalformed`/`MalformedReason`) and `reports/`, so a negative gate must be scoped to the lines the phase adds (`git diff <base> -U0 -- <paths> | /usr/bin/grep '^+'`), never to a whole tree.

**Prevention:** `pnpm check:pr < /dev/null`; treat a step silent for ten minutes as hung; `--exclude-dir=.stryker-tmp --exclude-dir=.next --exclude-dir=node_modules` in any whole-tree search.

**Phase to address:** every phase's verification plan; the milestone close.

---

### Pitfall 16 (Phase 37, 40, 41): Public-surface damage when a package-private module needs a barrel name

**What goes wrong:** (src, AGENTS.md §9) A module out of the barrel is not importable (ADR-QD-099, closed `exports`), and `@qadi/devtools` has two named-export barrels with a `devtools-named-barrel` rule that refuses `export *`. Phase 37's and 41's modules are package-private (no export change); Phase 40's decode describer must be exported from `@qadi/core`'s barrel for devtools and audit to import it, and a type that appears in a declaration of a barrel export without being exported gives TS2883 in dependents (hist, Phase 32 Pitfall 9). `pnpm circular` counts `import type` edges: Phase 39 puts a table in core that react's `HydrationEvent.ts` already imports through the barrel (no cycle), but a table placed in `HydrationMetrics.ts` that imports a react-owned type would be one.

**Prevention:** New core exports get a gate 13 row, a core changeset and a decision on permanence. Run `pnpm typecheck` across packages (declaration emit is where TS2883 appears), `pnpm circular`, `pnpm spec:api`, `pnpm test:tstyche` after each move.

**Phase to address:** Phases 39 and 40 design plans.

---

### Pitfall 17 (all phases): A stale verification report after Phase 42 and the milestone close

**What goes wrong:** (hist) This is the fourth milestone in a row: v1.0 four phases, v1.2 three, v1.3 six phases stale because the last phase touched files earlier reports covered. Phase 37 touches `TimelineFeed.ts`, `DiagnosticsFeed.ts` and `SimulationSession.ts`, which v1.3's 34/36 reports and mutation baselines cover; Phase 42 touches react files that 35/36 cover; Phase 38-40 touch the codec files Phase 30's report covers. A `STATE` that says "verified" at the phase boundary is not "verified at HEAD".

**Prevention:** Schedule the re-verify and the mutation re-check (`*-mutation-recheck.json`, v1.2 pattern) as a named close plan; treat "stale" as re-run, not failed; re-measure every touched file at the milestone close, not only per phase (it found `SignatureHistory.ts` in v1.2). Close v1.4 in GSD as soon as it merges (v1.2 lesson 1).

**Phase to address:** Phase 42's last plan and the milestone audit.

---

### Pitfall 18 (all phases): Commit trailers and ledger hygiene

**What goes wrong:** (hist, v1.3) 33 early commits lacked the model trailer (31 none, 2 with a different model name) because the SDK `commit` verb omits it and one fixer used its own name; found only at audit, too late to rewrite without breaking hash citations in SUMMARYs and ledgers. Attribution for this environment is the line in the conversation's system reminder; use the one it gives, and check `git log` for trailers at each phase close.

**Prevention:** A one-line `git log <base>..HEAD --format=%B | grep -c Co-Authored-By` compare at every phase close; amend before the next phase cites hashes.

**Phase to address:** every phase close.

---

### Pitfall 19 (Phase 37, 42): A test that pins an intermediate state must cite the rule it comes from

**What goes wrong:** (hist, v1.3 lesson 2) An e2e pin `Success,Initial+waiting,Success` encoded a defect as a rule and the fix stopped the run for a user decision (D-20). Phase 37's per-store tests and Phase 42's render-sequence tests are exactly where an intermediate state (a `Starting` that was later overwritten, a `Pending` first frame) can be locked in as if intended.

**Prevention:** Each new RED test names the invariant or ADR it comes from in its title or comment; a test describing a state that exists only because of an implementation order is recorded as tech debt, not pinned (v1.2 pattern).

**Phase to address:** Phases 37 and 42.

---

## Minor Pitfalls

### Pitfall 20: `DiagnosticsFeed`'s unconditional stop and the doc that promises "without a `Stopped`"
**What goes wrong:** If the stop decision (Pitfall 3) changes behaviour, `DiagnosticsFeed`'s documented "closing it interrupts the run, without a `Stopped`" and `off()` comments need the same edit, or the doc and code drift again (the v1.2 audit lists many info findings of exactly this kind).
**Prevention:** Update the three comments that restated the discipline when the module replaces them; grep the model for "Added after the handle".

### Pitfall 21: Requirement ranges and grouped traceability rows
**What goes wrong:** (hist, v1.0 and v1.2) `phase.complete` cannot parse `X-01..05` ranges or grouped rows, forcing hand edits twice.
**Prevention:** Explicit IDs, one traceability row per ID in REQUIREMENTS.md (it does not exist yet for v1.4; PROJECT.md points at it).

### Pitfall 22: `useDiagnostics`/`useTimeline` public behaviour while their internals change
**What goes wrong:** Phase 37 changes how the feeds run, not what hooks return; any change to `status`, `restart` or the `Stopped` reason text is a public change needing BEH/changeset.
**Prevention:** Keep `TimelineNotice`/`DiagnosticsNotice` suites unchanged and green; changeset only if a type changes (patch otherwise, none if purely internal).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| 37 module interface | One-call `run` removes the publish-before-fork gap (1) | Two-step `begin`/`fork(token)`; RED reentrancy test |
| 37 finalizer/close | Order reversed or module not sync-buildable (2, 4) | Handle then finalizer in one place; two-instance test |
| 37 stop and failure | Shared exit check changes SimulationSession (3) | Pin self-interrupt row; table test for stop |
| 37 mutation | New module with no base; store survivors (5) | Base all three stores; kill boundary mutants first |
| 38 wire version | Key order, widened type, cast, hydration `version: 2` (6) | Byte golden, `tstyche` pin, scratch-to-3 experiment |
| 39 drop reasons | Reorders `preregisteredWords`; prototype keys; gate blind to labels (7) | Written-out ordered snapshot; `Object.hasOwn`; table `as const satisfies` |
| 40 decode describer | Observable `MalformedReason`/log string; unsafe `unknown` in sentence (8) | Compatibility decision; bounded safe formatting; example, README, website, upgrading |
| 40 audit single decode | Re-encode changes stored record; Retention structural equality; budget row (9) | Return the strict decode's JSON; before/after structural-equality rows; AGENTS.md and budget together |
| 41 guarded render | One return contract; `outsideUnion` is already safe; may be refuted (10, 11) | RED reproduction first; primitive returns `string | undefined`; consumers keep their mapping |
| 42 seed | Subscription creep, second readable, liveness order, subject identity, leak (12, 13) | Human checkpoint first; keep SD/HL pins; `pnpm example` evidence; base both files with `--mutate` |
| All records | Placeholders, CCR register, gate 13 module column, DoD gate wording, `spec-revise --date` (14) | Records plan per phase; scoped negative greps |
| All verification | `check:pr` hangs; `.stryker-tmp`/`.next` greps (15) | `< /dev/null`; scoped greps; root-level vitest `--project` |
| Close | Stale verification, trailers (17, 18) | Named re-verify plan; trailer check per phase |

## Looks Done But Isn't (checklist)

- [ ] **37:** the module's own tests cover supersede, close mid-run (with a defecting finalizer), stop in four states, interrupt-vs-failure, and two instances in two scopes; the stores' publish-before-fork order is still pinned at store level; SimulationSession's self-interrupt reads `Broke`; no new `Effect.fnUntraced`; three "Added after the handle" comments replaced by one.
- [ ] **38:** golden bytes unchanged in content and key order; `WireVersion` still the literal `2`; `UnsupportedVersion.supported` type unchanged; the scratch retype-to-3 experiment recorded; hydration's own `version: 2` untouched.
- [ ] **39:** the nine reason strings and their order written out in a test independent of the constant; `Object.hasOwn` membership; `qadi_hydration_dropped_total` still a module-scope declaration (`[metric-declaration]`, `[metric-table]` row unchanged); react's two groups `Extract`ed with a compile-time test that a kind-less reason fails.
- [ ] **40:** `qadi.reason` annotation and `onMalformed` shape decision recorded; devtools Breaking changeset, `upgrading.md`, README, website page, `Dock.tsx` example; describer bounded for `unknown`; audit entry structurally equal before and after; AGENTS.md §7a table and `UNTRUSTED_DECODE_BUDGET` agree.
- [ ] **41:** the bigint/circular defect reproduced RED or refuted in writing; each consumer's output unchanged; the primitive's table covers bigint, cycle, symbol, function, throwing `toJSON`.
- [ ] **42:** a recorded human decision exists before any code; SD1-SD5, HL1-HL6, eviction pins, `QadiProvider.test.tsx` render sequences and the 30 e2e unchanged; no `get(grantAtom)`; subject atom identity preserved; both files re-measured with the same `--mutate`.
- [ ] **All:** per-file mutation >= base (same invocation, never re-baselined); `pnpm check:pr < /dev/null` green; changesets per touched public package; ids confirmed free and unused ones named in the CCR row; trailers checked.

## Pitfall-to-Phase Mapping

| Pitfall | Phase | Verification |
|---------|-------|--------------|
| 1 publish-before-fork | 37 | Module RED reentrancy test; store Starting/Live ordering rows |
| 2 finalizer order, sync build | 37 | Close-mid-run with defecting finalizer; `useScoped` mount |
| 3 exit classification, stop drift | 37 | Self-interrupt row; stop table |
| 4 StrictMode, two scopes | 37 | Two-instance test; existing Lifetime suites |
| 5 mutation after moving logic | 37 (and all) | `NN-mutation-base.json` compare script |
| 6 wire version derivation | 38 | Byte golden; `tstyche` pin; scratch retype |
| 7 label order and membership | 39 | Written-out ordered snapshot; `Object.hasOwn` row |
| 8 decode vocabulary | 40 | Table pin; website/README/example diff; changeset |
| 9 single audit decode | 40 | Structural-equality rows; Retention tests; budget table |
| 10 guarded render contract | 41 | RED reproduction; per-consumer pinned outputs |
| 11 mutation for guards | 41 | Touched-files compare |
| 12 seed timing contract | 42 | SD/HL pins; e2e; render-sequence tests |
| 13 weakest react scores | 42 | Same-invocation compare |
| 14 spec gates | all | `pnpm spec:verify:strict`, `spec:api`, `spec:examples`, DoD gate |
| 15 hung gate, noisy greps | all | `< /dev/null`; scoped negative greps |
| 16 public surface | 39, 40 | `pnpm typecheck`, `circular`, `spec:api`, `test:tstyche` |
| 17 stale verification | close | Re-verify plan; `*-mutation-recheck.json` |
| 18 trailers | each close | `git log` trailer count |
| 19 pinning an intermediate state | 37, 42 | Test titles cite the rule |

## Sources

- `.planning/phases/_WAVE9-CONTEXT.md`, `_SHARED-CONTEXT.md`, `PROJECT.md`, `RETROSPECTIVE.md`, `milestones/v1.2-MILESTONE-AUDIT.md`, `milestones/v1.3-MILESTONE-AUDIT.md`, `milestones/v1.3-phases/36-*/36-14-SUMMARY.md` and `36-mutation-base.json` (TimelineFeed 1.0 to 0.9194 drop, SimulationSession 0.9745, QadiAtoms 0.8966, HydrationEngine 0.9776), `36-04-SUMMARY.md` (SD1..SD5, HL1, HL2)
- Source read this session (src): `packages/devtools/src/model/{TimelineFeed,DiagnosticsFeed,SimulationSession,Source,Filters,SimulationForm,Remedies,Inspect}.ts`, `packages/devtools/src/react/{useScoped,QuestionsPanel}.ts(x)`, `packages/core/src/{SinkWire,SinkCodec,HydrationMetrics,JsonRefusal}.ts`, `packages/react/src/{HydrationEvent,HydrationEngine,QadiAtoms}.ts`, `packages/audit/src/AuditEntry.ts`, `node_modules/effect/src/FiberHandle.ts` (closed handle interrupts new fibers; `getUnsafe`), `stryker.{config,devtools,react,audit}.mjs`, `spec/scripts/verify-traceability.sh` (`KNOWN_GAPS`), root `package.json` `check`/`check:pr`
- Spec: ADR-QD-137 (session owns runs), ADR-QD-095/096 (codec, wire version), ADR-QD-116 (encode refusal), ADR-QD-123 (metrics once), ADR-QD-143 (decoder), ADR-QD-148/149 (sweep, seed held by question), ADR-QD-092 (own-property law table, `Object.hasOwn`), ADR-QD-110 (audit facts), AGENTS.md sections 1-17 (budgets, §7a untrusted decode, §13 react)
- User memory: closed union over widening; `Record<string, unknown>` is a hack; prefer complete over simple; ask once when blocked
