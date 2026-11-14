# Project Research Summary

**Project:** Qadi, milestone v1.4 "Arch Wave 9" (Phases 37-42, ARCH-84..89)
**Domain:** Effect v4 authorization library (pnpm monorepo); six internal architecture deepenings, no new features
**Researched:** 2026-11-14 (base `637c0601`, branch `arch-wave-9`)
**Confidence:** HIGH for Phases 37-41, MEDIUM for Phase 42 (a human decision, not a research gap)

## Executive Summary

Wave 9 is six relocations, not six capabilities. Each phase takes one fact that is currently restated by hand and gives it one owner: the superseding-run protocol (37, devtools), the sink wire version (38, core), the hydration drop-reason set with its kinds (39, core+react), the decode-refusal vocabulary (40, core+devtools+audit), the value-to-text guard (41, devtools), and the seed-to-evaluation link (42, react). No dependency, no new Effect API, no version change: everything is expressible with what the repo already imports (`FiberHandle`, `Exit`, `Cause`, `Schema`, `Metric`, `Match`, `Atom`). The research value is the behaviour the hand copies rely on without saying so, which the shared module must keep (publish-before-fork, finalizer order, label order, wire byte order, atom subscription shape).

Keep the context's strict order 37 -> 42, with hard dependencies 38 -> 40 (shared `SinkWire.ts`/`SinkCodec.ts`) and 39 -> 42 (shared `HydrationEngine.ts`), and a soft one 37 -> 41 (both touch `SimulationSession.ts`). Two phases are really defect fixes with RED tests first: 37 (a possible stuck-on-Starting race, not yet reproduced) and 41 (a reproduced synchronous throw from `Remedies.ts:574` that escapes `SimulationSession.commit()`). Phase 40 is the only Breaking change (`@qadi/devtools` `onMalformed`/`MalformedReason`) and the only one that retires a budgeted exception (`UNTRUSTED_DECODE_BUDGET` for `AuditEntry.ts`). Phase 42 starts with a human checkpoint and may end in a rejection ADR.

Main risks are all "looks the same, behaves differently": a one-call `run` that removes the publish-before-fork gap (37), a table that reorders `preregisteredWords` or a constant that widens the wire type (38, 39), a re-encode that changes what an audit entry stores (40), one return contract flattening five deliberately different renderers (41), and a "tidier" atom construction that adds a subscription or second readable (42). Mitigation is uniform: characterise on the base first (golden bytes, written-out label lists, RED reproductions), put tests at the new seam before deleting store-level tests, measure per-file mutation with the same invocation at base and close (XC-05).

## Reconciliations (where the four files disagreed, and which wins)

**R1. Phase 37 stop rule: unconditional wins over the guarded form.**
ARCHITECTURE pins the guarded form (`Option.isSome(FiberHandle.getUnsafe(...))`, ADR-QD-137 point 3) but only read `FiberHandle` and did not execute it (MEDIUM). STACK reproduced it: `fork(Effect.void)` on an empty handle completes inside `runFork`, the observer clears the slot, `getUnsafe` is `None` before and after, and on a closed handle the fork returns `constInterruptedFiber()` and never starts the body. The guard saves one throwaway fiber, no observable effect. FEATURES independently recommends unconditional. Decision: `stop` = bump generation; `fork(Effect.void)`, no guard, in the one module; `SimulationSession.ts:462`'s guard is deleted. ADR-QD-150 restates ADR-137 point 3 ("when the handle holds a fiber"). Pin on the module interface: stop with no run (not started, closed, completed) means no notification, no state change, no span, handle empty. PITFALLS' "must not allocate a fiber" is dropped as a requirement (the observable pin is no effect, not no allocation).

**R2. Phase 37 module interface: two-step begin/fork, two failure hooks.**
PITFALLS (and FEATURES C2) are right that a one-call `run(effect)` breaks all three stores: each publishes between bump and fork (`TimelineFeed` `status.set(READING)`, `DiagnosticsFeed` `show(Starting)` "before the fork: its synchronous prefix may already reach Live", `SimulationSession` `commit()` then `if (mine === generation) fork`). Interface: `begin()` bumps and returns a token; the store publishes; `fork(token, effect)` forks only while the token is still current and says whether it did; `isCurrent(token)` guards each landed write (`marking.accept`, `land`); `stop()`; `closed()`; one finalizer registered after the handle (reverse-order, sequential close). The module makes the pre-fork re-check the default, so the feeds gain what only `SimulationSession` has today (FEATURES C2: a subscriber restarting the feed inside the Starting/Reading notification leaves the older run forked last; hypothesis, RED first).
Failure classification is not shared (PITFALLS 3, FEATURES C1): `mine === generation && Exit.isFailure && !Cause.hasInterruptsOnly` exists in two copies only (`TimelineFeed.ts:150`, `DiagnosticsFeed.ts:221`) and becomes one named hook for the feeds. `SimulationSession` has no `hasInterruptsOnly`: `land` runs `Effect.exit` inside the fiber and maps every non-success exit with a current token to `Broke`, including a self-interrupt. It keeps that rule and uses only `isCurrent`. Pin the self-interrupt row ("reads Broke, not Running") before touching it.
Extra hazard (STACK, reproduced `exp3`): a body whose synchronous prefix calls a command that starts a newer run installs the inner fiber first, then the outer installs and interrupts it, leaving state idle with a stale generation. Decision: option A (keep synchronous start; module doc says "a body must not call a command before its first yield"; RED test that a violation is reported, not silently idle). Reject `Effect.yieldNow` first (breaks ~34 tests relying on a synchronous prefix) and `FiberHandle.run({startImmediately:false})` (needs `runSyncWith`).

**R3. Phase 41 reproduction: reproduced (FEATURES wins), narrower hazard set.**
STACK and PITFALLS only reasoned from code. FEATURES ran the real `remedyEdits` against built core: six probes (`contains(10n)`, `contains(circular)`, `inArray([1n])`, `inArray([circular])`, `eq(literal(1n))`, `eq(literal(circular))`) all throw `TypeError`. It escapes synchronously: `remedyEdits` <- `derive` (`WhatIf.ts:201`) <- `sweepPlan` (`:173`) <- `SimulationSession.build()` (`SimulationSession.ts:404`) <- `commit()` (`:447-449`), outside any Effect, so no `Broke` capture; the command's state mutation is done and its publish is not. Only `Remedies.ts:574` (`String(JSON.stringify(v))`, used at `:481`, `:496`, size `:249`) is live. `Inspect.ts:300-310` `outsideUnion` and `QuestionsPanel.tsx:388` `resourceOf` cannot throw. Phase 41 is a defect fix with RED first on `637c0601` at two levels (`remedyEdits`, and `makeSimulationSession` + `setPolicy`/`chooseSight`); "refute and downgrade" is no longer an available outcome. The uniform primitive is a total stringify returning `string | undefined`; Filters (`[]`), SimulationForm (`undefined` then round-trip check), Remedies (the word `undefined`, intended) and `outsideUnion` (own presentation) keep thin local mappings.

**R4. Phase 42 options: one consolidated set for the human checkpoint.**
FEATURES (A as-reviewed, B seed holder, C reject) and ARCHITECTURE (A extract `SeededQuestion.ts`, B first-class seed lookup, C reject) are the same three choices cut differently. Consolidated:
- **Option 1, invert (review's shape).** `makeSeededQuestion({ policy, resource, runtime, subject, report, live })` builds its own computing atom, calls `get.addFinalizer(live())` itself (the `track` callback disappears), reads the seed via `seededIn(get.registry)` (`registry.getNodes()`, never `get`). **1a** stays in `HydrationEngine.ts` (engine gains evaluation knowledge, imports `evaluate`/`CurrentSubject`); **1b** extracts `react/src/SeededQuestion.ts` (ARCHITECTURE's recommendation). Cost either way: `DECISIONS_KEY` and `QadiRuntimeServices` must move down (importing back up from `HydrationEngine.ts` to `QadiAtoms.ts` is a madge cycle, ADR-QD-037); 1b also moves `DECISION_READ_BUDGET`/`_NAMES` file keys, AGENTS.md §13 wording and ADR-QD-149's file citation, both directions; tests need a real `Atom.runtime(Layer)` and real subject atom (four fake-`computedFor` cases replaced).
- **Option 2, seed holder first.** A first-class `{ seededIn, hold }` created once per question, handed to both the computing atom (stays in `QadiAtoms.ts`) and `makeSeededQuestion`. Removes callback-receiving-a-callback with no layering change, no ADR reopened; ADR-149 properties become unit-testable without an atom runtime. But the seed-to-evaluation link stays split across two modules, so it only half answers the review.
- **Option 3, reject.** ADR-QD-155 rejection, no source change; only the liveness rule is de-duplicated in prose (one statement at `QuestionBook.ts` `BookOptions.build`, pointers elsewhere). Cheapest; the fake in `HydrationEngine.test.ts` stays.

The ADR conflict is narrower than `_WAVE9-CONTEXT.md` says (state at the checkpoint): ADR-QD-148 does **not** name `makeSeededQuestion`, `computedFor` or `seededIn`. ADR-QD-149 names `makeSeededQuestion` only as the home of the seed (its `WeakMap<SeedGrant,...>` survives any option); ADR-QD-103 contributes "atom set is the one adapter" and the liveness-first rule (INV-QD-105 Source cites `track`). "Go" needs INV-QD-028/105/317/318 Source/Enforcement updates plus text amendments, not an ADR reversal; "amend" only if liveness bookkeeping moves. STACK: nothing in effect 4.1.2 blocks or forces the inversion; do not present a nonexistent effect limitation. Identity trap: hand the question the final `keepAlive`/`withEquality` subject atom object, never the pre-pipe base.

**R5. Phase 38: `WIRE_VERSION` is exported and public.**
`SinkWire.ts` is `export *`'d from the core barrel (`index.ts:55`), ADR-QD-116 forbids re-exports, so any exported constant is public. The alternative (private, codec re-states it) is the defect being fixed, and `DecodeRefusal.supported` in `SinkWire.ts` cannot import the codec (ADR-QD-037). Decision: export it. Cost: gate 13 row in `spec/overview.md` (near `:518-521`), a `@qadi/core` **minor** changeset (new export), and a recorded narrowing of `WIRE_VERSIONS` to `readonly [2]` (type-only, source compatible). Form (STACK, verified under strict flags): `WIRE_VERSION = 2 as const` (bare `= 2` widens to `number` in the encoder spread, which is why the encoder has `2 as const` today); `WIRE_VERSIONS = [WIRE_VERSION] as const`; `type WireVersion = (typeof WIRE_VERSIONS)[number]`; `Schema.Literal(WIRE_VERSION)` in both field structs; encoder `version: WIRE_VERSION` after the record spread (same key order, bytes unchanged); decoder membership by `.some(v => v === version)`. Name `WIRE_VERSION` (STACK, ARCHITECTURE); PITFALLS' `CURRENT_WIRE_VERSION` is acceptable if the planner finds the pair confusable. Keep hard-coded `2` in goldens and "supported version is 2, alone". Do not touch hydration's payload `version: 2` or audit's bundle version.

**R6. AGENTS.md §10 `it.scoped` does not exist (finding).**
STACK verified in `@effect/vitest@4.1.2` (`index.ts:253-266`, `internal.ts:353`): `it.effect` is `Tester<Scope.Scope>` and already scopes the test; `it.scoped` is absent; `TimelineFeed.test.ts` already uses `it.effect`. A test that must close its scope mid-test builds `Scope.makeUnsafe()`, runs via `Scope.provide(effect, scope)` and `Scope.close(scope, Exit.void)`. Action: correct AGENTS.md §10 in Phase 37's records plan, or planners will write `it.scoped` and get a TypeError.

**Smaller disagreements settled:**
- *Phase 39 table form.* One keyed `as const` object in current order (key order is the metric's `preregisteredWords` order, observable in devtools `Hydration.ts:114` and two tests; interleaved: ForeignSubject, UnencodablePolicy, PayloadSubjectMismatch, MalformedEntry, UndecodablePolicy, EntryTooDeep, UnsupportedPayloadVersion, MalformedPayload, PayloadTooDeep). Fold `MEANINGS` into rows (two tables keyed by one union is the same defect one level down). Enumerate with a `hasOwn` predicate (STACK, no cast); ARCHITECTURE's `Struct.keys` is unverified in 4.1.2.
- *Phase 39 length pin.* ARCHITECTURE says delete `Hydration.test.ts:109` (`length === 9`), STACK says replace; FEATURES and PITFALLS say keep. Keep it and core's written-out order lists as the independent label-set oracle (C7); the completeness proof added is a tstyche negative (a kind-less reason fails to compile).
- *Phase 40 audit single decode.* Core returns the strict decode's already-validated JSON form with the record (new minor export, no new counted `Schema.decode*` token), proven by a differential over existing fixtures and a structural-equality/Retention check. Re-encoding (STACK's suggestion, ARCHITECTURE B) is rejected: it can fail (`SinkRecordNotEncodable` on a read path), normalise differently, and change what `Retention`'s `MutableHashMap<AuditEntry>` counts.
- *Phase 40 reporter.* Core exports `describeDecodeRefusal` (module-scope `Match.tagsExhaustive`, bounded/safe for `unknown`) and a tag-only annotations helper (closes INV-QD-104). No reporter in core (one consumer; devtools keeps its `Effect.logWarning` adapter with `qadi.frame`). `Malformed.message` and `UnsupportedVersion.version` appear in the sentence at most, never in a default log annotation.

## Key Findings

### Recommended Stack

No new dependency, no version change: `effect@4.1.2` (lock-pinned), `@effect/vitest@4.1.2`, tstyche. Re-check `FiberHandle.ts:395-435` and `internal/effect.ts:592-612` if the lock moves (Phase 37's ordering facts).

**Core technologies (all already imported):**
- `FiberHandle.make` + `FiberHandle.runtime(handle)<never>()`: the "one slot, newer replaces older" primitive; fork returns synchronously; the replaced fiber is interrupted inside the fork call after the new prefix runs (verified).
- `Exit` / `Cause.hasInterruptsOnly`: failure check (`Exit.hasInterrupts` means "any", do not swap).
- `Schema.Literal(WIRE_VERSION)` + `as const` tuple: derivation without a cast; non-widening constant required.
- `as const` keyed table + `keyof typeof` + `ReasonOfKind<K>`: Phase 39 derivation, same shape as `ENFORCEMENT_ERROR_CLASSES`; reasons are frequency words not attributes, so the registry key (type, id, description, attributes) does not move.
- `Match.type<DecodeRefusal>().pipe(Match.tagsExhaustive(...))`: Phase 40 mirrors `describeEncodeRefusal` (ADR-QD-116).
- `Result.try` (or the existing try/catch precedent) for the Phase 41 guard; a throwing `toJSON`/getter is reachable, so wrap the call.
- `Atom.runtime(...).atom`, `AtomRegistry.getNodes()`: `keepAlive`/`withEquality` return new objects (identity trap); `withReactivity` returns a second atom.

**Do not add:** `FiberMap`/`FiberSet`, `Effect.race*`, `Ref`, `Semaphore`/`Latch`, state-machine libs, new `Effect.fnUntraced` (budget exact 3), new `switch` (exact 3), new `Schema.TaggedError` (exact 12), `Record<string, unknown>`, `old | "New"` widening, changes to `scheduleTask`/`defaultIdleTTL`.

### Expected Features

**Must have (per phase; see Requirement candidates):** 37 one run module + three adopters + stop pinned + re-entrancy RED-or-refuted; 38 one constant + compile-time pin + bytes unchanged; 39 one keyed table with kinds, all derived, label set/order unchanged; 40 core decode describer + devtools passthrough (Breaking) + audit single decode + budget row removed; 41 RED then GREEN for the Remedies throw + one primitive + one test table; 42 checkpoint with evidence and options, code only on "go".

**Should have:** 37 model-based property over supersede/close/stop/land interleavings (ARCH-79 pattern), ADR-137 §7 corrected (it still says `useRunningStore` "is unchanged"; deleted by ARCH-82); 38 version-indexed INV (amend INV-QD-096, do not duplicate), keep one literal `"version":2` golden; 39 public kind accessor only if a consumer reads it; 40 `decodeRefusalAnnotations` (tag only), core owns `UntrustedValueRefusal -> DecodeRefusal` (third restatement at `AuditEntry.ts:159-164` vs `SinkCodec.ts:489-498`); 42 spike evidence (Phase 35 template).

**Defer/exclude:** `FIXTURE_DATA` placement, `"Decision"`/`"Obligations"` literals at `DecisionRecord.ts:145/149`, `CircuitBreaker.ts` generation, `DockModel.ts` (no adopter), unread sections, `oxfmt`, other budget changes, re-opening ADRs 077-107.

### Architecture Approach

Each phase moves one fact to one owner. 38/39/40 live in public core leaves; 37/41 are package-private devtools modules; 42 is react-internal. Imports point downward (madge counts type-only edges, ADR-QD-037); package-private modules stay out of barrels (ADR-QD-099); new core exports need a gate 13 row and changeset.

**Major components:**
1. `devtools/src/model/SupersedingRuns.ts` (new; the planner names it): handle, generation, closed flag, finalizer order, begin/fork/isCurrent/stop/closed, feed failure hook; imports only `effect/*`; per-build closure state only (StrictMode and `<Activity>` build two scopes).
2. `core/src/SinkWire.ts` leaf: `WIRE_VERSION`, `WIRE_VERSIONS`, `WireVersion`, `DecodeRefusal`, `describeDecodeRefusal`.
3. `core/src/HydrationMetrics.ts`: the reason table; react's two groups derived via a generic kind-subset type (one new public type).
4. `devtools/src/model/ValueText.ts` (new, package-private): total stringify and its one test table.
5. `react/src/SeededQuestion.ts` (only Option 1b).

Anti-patterns: unifying the lookalike (three different `version: 2` wires; five different value-to-text sites); importing up; a counted decode token outside the leaf.

### Critical Pitfalls

1. **Publish-before-fork (37)**: a one-call `run` overwrites a synchronously reached Live/Stopped with Starting and loses the session's post-commit re-check. Avoid: begin/fork(token), RED re-entrancy test, per-store ordering rows.
2. **Finalizer order and synchronous build (37)**: finalizer after the handle so it runs first; the module must build synchronously (`useScoped` uses `Effect.runSync`). Avoid: close-mid-run test with a defecting finalizer, two-instance test, state the order once. Caveat: a `Scope.make("parallel")` voids the ordering; document it.
3. **Mutation falls when logic moves (all, 37 first)**: v1.3 saw TimelineFeed 1.0 -> 0.9194. Avoid: base all touched files at `637c0601` with the close's exact invocation (XC-05; `HydrationEngine.ts`/`QadiAtoms.ts` need `--mutate`), module tests first, delete store tests only after module tests are green, never re-baseline.
4. **Contracts the gates do not see (38, 39)**: `ignoreStatic` hides module-scope constants from Stryker; `[metric-table]` checks id/type/file, not label values or order. Avoid: byte golden and a written-out nine-word ordered snapshot on the base; tstyche pins; scratch retype-to-3 and throwaway kind-less-reason experiments recorded.
5. **Observable vocabulary and stored values (40)**: `qadi.reason` log string, `Dock.tsx:73`, README, website `devtools.md:108`/`upgrading.md`, `DecisionStreamRoute.ts:32`, `26-decision-stream.md`; `not-a-record` collapses into `Malformed`; the describer must be bounded for `unknown`; audit single decode must not change `AuditEntry.record`.
6. **Seed timing contract (42)**: `get(grantAtom)` instead of `seededIn(get.registry)` adds a dependency and re-run; a second `Atom.readable` changes render sequences; `live()` must stay first; same `keepAlive` subject object; `WeakMap<SeedGrant,...>` stays the only seed holder. Only the 30 e2e and render-sequence tests see these.

**Cross-cutting (every phase):**
- *Records.* Never run `node scripts/next-id.mjs` (reserved: ADR 150-155, CCR 428-433, BEH 521-550, INV 319-330; confirm free by grep; name unused in the CCR row). CCR README row in the same plan as its first citation. Gate 13 is names-only: hand-edit overview rows/module columns. `spec-revise` with `--date` then `--check`. Prose "gate N" names its command. `typescript` fences must compile (`pnpm spec:examples`; website via `pnpm spec:website-examples`, which stdin-closed `astro check` skips).
- *Verification hygiene.* `pnpm check:pr < /dev/null`; ten silent minutes = hung. Scope negative greps to added lines and exclude `.stryker-tmp`, `.next`, `node_modules`, `reports`; zsh aliases `grep` (use `/usr/bin/grep`); vitest from the repo root with `--project`.
- *Budgets.* Exactly one row goes away (Phase 40 `UNTRUSTED_DECODE_BUDGET` for `AuditEntry.ts`, with the AGENTS.md §7a table and `[untrusted-decode-table]`/`[untrusted-decode-names]` in the same task); `METRIC_ID_LITERAL_BUDGET` for `HydrationMetrics.test.ts` stays 5; `DECISION_READ_BUDGET`/`_NAMES` and §13 move only under 1b. All both directions.
- *Tests pin rules, not accidents:* each RED test names its INV/ADR.
- *Close hygiene.* Trailer check per phase; named re-verify plan after Phase 42; explicit requirement IDs one per row (phase-complete cannot parse ranges).

## Corrections to `_WAVE9-CONTEXT.md`
- 37: the failure check is in two copies, not three; `SimulationSession` also has a post-commit `mine === generation` re-check the feeds lack; exactly three adopters (`DockModel.ts` none, `CircuitBreaker.ts` a different concern); ADR-137 §7 text is stale.
- 38: seven edit sites, not six (`SinkWire.ts:48, :51`; `SinkCodec.ts:146, :154, :224, :226, :453`; decoder `:470`).
- 39: completeness is not pinned only by tests (`MEANINGS` is already a mapped type; `react/test/Hydration.tst.ts:90-91` pins the partition); the written-out label lists are a deliberate contract.
- 40: a third restatement exists (`AuditEntry.ts:159-164` vs `SinkCodec.ts:489-498`).
- 41: only `Remedies.ts:574` is live, and it is reproduced.
- 42: the conflict is with INV sources and text amendments, not ADR-148 (it does not name `makeSeededQuestion`; ADR-149 does, as the seed's home).

## Implications for Roadmap

Strict numeric order, one phase at a time. Hard deps 38->40, 39->42; soft 37->41 (41's RED session test goes in a new file since `SimulationSession.test.ts` is 1,809 lines). A defensible swap is 41 ahead of 40 (a reproduced throw outranks a Breaking rename, no shared file); the user fixed the order, so raise it only if the user wants defects first.

Per-phase plan shape: (1) base plan (mutation base JSON for touched files with the close's invocation; characterisation/golden/RED tests); (2) seam tests; (3) conversion plan(s); (4) records plan (ADR, CCR README row, BEH/INV, traceability, overview rows, changeset, `spec-revise --date`); (5) close plan (full gate order, mutation compare, trailer check).

### Phase 37: Superseding-run module (ARCH-84, devtools, patch)
**Rationale:** top recommendation, self-contained, practice ground for "seam tests before deleting store tests".
**Delivers:** package-private module; the three stores shed `let generation`, `let closed`, `FiberHandle.make/runtime`, the bump-in-finalizer block and repeated `mine !== generation`; unconditional stop; ADR-QD-150 amending ADR-137 §7 and point 3; AGENTS.md §10 fix.
**Avoids:** Pitfalls 1-5, 19, 20 (update the three "Added after the handle" comments and DiagnosticsFeed's "without a Stopped" doc).
**Plan-shape:** RED-first. Mutation base for all three stores FIRST (DiagnosticsFeed has no recorded base; TimelineFeed 1.0, SimulationSession ~0.97); module RED tests (re-entrancy, close with defecting finalizer, stop table, two instances, self-interrupt row); convert one store at a time; delete store cases only after the module covers them; compare last.

### Phase 38: Wire version stated once (ARCH-85, core, minor)
**Rationale:** smallest; settles `SinkWire.ts`/`SinkCodec.ts` before 40.
**Delivers:** `WIRE_VERSION`, derived `WIRE_VERSIONS`/`WireVersion`; schema/encoder/decoder read them; tstyche pin; byte golden; overview row; changeset.
**Avoids:** Pitfall 6; no new counted decode token.
**Plan-shape:** golden and retype-to-3 scratch experiment first (mutation will not guard this phase); one plan plus records.

### Phase 39: Hydration drop reasons stated once (ARCH-86, core minor + react patch)
**Rationale:** core first, react derives second; must precede 42.
**Delivers:** one keyed table with kinds and folded meanings; unions/list/`isHydrationDropReason` (`Object.hasOwn`) derived; react's two groups derived (delete the "placed by hand" doc); kind-less reason a compile error; overview rows for the new public type.
**Avoids:** Pitfall 7; keep the `qadi_hydration_dropped_total` declaration line, id and description untouched.
**Plan-shape:** commit a written-out ordered nine-word snapshot first; `HydrationEvent.ts` is in the react stryker list.

### Phase 40: Core owns describing a decode refusal (ARCH-87, core minor + devtools Breaking + audit patch)
**Rationale:** needs 38's vocabulary; the only Breaking phase; retires one budget row.
**Delivers:** `describeDecodeRefusal` (+ tag-only annotations) in `SinkWire.ts`; `UntrustedValueRefusal -> DecodeRefusal` once in core; devtools `onMalformed(frame, refusal: DecodeRefusal)`, `reasonOf`/`MalformedReason` deleted; audit decodes once via core's record-plus-JSON export, `recordJsonOf` and the duplicate `asDecodeRefusal` deleted; Breaking changeset, upgrading map (`not-json`->`NotJson`, `too-deep`->`TooDeep`, `not-a-record`->`Malformed`, `unsupported-version`->`UnsupportedVersion`, `inconsistent`->`Inconsistent`), README, website, `Dock.tsx`, `surface.tst.ts`, `Source.tst.ts`, `DecisionStreamRoute.ts:32`, `26-decision-stream.md`, BEH-QD-204.
**Avoids:** Pitfalls 8, 9, 16.
**Plan-shape:** compatibility decision plan FIRST (what `qadi.reason`/the callback carries; recommend the `_tag`, documented Breaking, since compat is never the tiebreaker) plus a table-pin of the five words on the base; then the describer; then devtools; then audit with differential rows (unknown envelope key, key-order permutation, `undefined` fields, float, 60,000-deep), Retention untouched; AGENTS.md §7a + budget in the same task.

### Phase 41: One guarded value-to-text primitive (ARCH-88, devtools, patch fix)
**Rationale:** independent, cheap, reproduced defect; after 37 so RED targets the final session.
**Delivers:** `ValueText.ts` total stringify returning `string | undefined` (bigint -> `10n`, circular -> a fixed placeholder, no content in logs); Remedies reads it (the word `undefined` preserved); Filters/SimulationForm re-pointed, outputs unchanged; one test table (bigint, circular, nested bigint, symbol, function, `undefined`, `NaN`, `-0`, null-prototype, throwing `toJSON`, throwing getter); a per-consumer pinned-output row.
**Avoids:** Pitfalls 10, 11; no blanket catch/`orDie`; do not call `outsideUnion`/`resourceOf` defects.
**Plan-shape:** RED-first on `637c0601` (six `remedyEdits` probes plus session level, in a new test file); the remedy is kept with a degraded label or skipped with a stated reason (decide, pin; BEH-QD-223 not weakened); mutation base for the four touched model files.

### Phase 42: Seeded question builds its own computing atom (ARCH-89, react; human checkpoint)
**Rationale:** speculative; depends on 39; also sweeps anything 37-41 left stale.
**Delivers:** plan 1 is evidence and options only (R4), no code; then the chosen implementation or a rejection ADR-155 with a CCR row naming unused BEH/INV. One `AskUserQuestion`, then quiet through stop-hook repeats.
**Avoids:** Pitfalls 12, 13, 17.
**Plan-shape:** human checkpoint FIRST; if go: base both files with the same `--mutate` list (QadiAtoms ~0.8966, HydrationEngine ~0.9776); real-runtime seam tests before deleting fakes; SD1-SD5/HL1-HL6/eviction pins/`QadiProvider.test.tsx` render sequences untouched; RED for "no node for an unhydrated question" and "a late seed does not re-run the computation"; `pnpm example` (30 e2e); the last plan is the cross-phase stale sweep and a named milestone re-verify with a mutation re-check of every touched file.

### Requirement candidates (testable; roadmapper assigns IDs, one per row)

| Phase | Candidates |
|-------|-----------|
| 37 | T1 module owns handle/generation/closed/finalizer order/replace-interrupt/stop/currency; stores contain none of `let generation`, `let closed`, `FiberHandle.make`, `FiberHandle.runtime`, the bump-in-finalizer block (negative grep on added lines). T2 module has its own tests (supersede, close mid-run, stop in four states, interrupt vs failure, a replaced run whose release dies never reports, two instances in two scopes). T3 all pre-existing store tests pass unchanged on day one. T4 stop unconditional, pinned once, both former call sites use it. T5 a re-entrant start from inside the Starting/Reading notification leaves the newest run live in all three stores (RED first for the feeds, or refuted with evidence); a body calling a command in its sync prefix is reported, not silently idle. T6 behaviour unchanged: `qadi.devtools.simulationSession.run` still a root span, `Stopped` never for interruption (INV-QD-313), session `Broke` on defect and self-interrupt. T7 per-file mutation >= base for the three stores, new module near 100. T8 no new `Effect.fnUntraced`, no `Context.Service`. T9 ADR-137 §7 and AGENTS.md §10 corrected. |
| 38 | The number appears once in `packages/core/src/Sink*.ts` (scoped grep empty for `Literal(2)`, `version: 2`, `= 2`). Compile-time pin: retyping without editing the codec fails (tstyche, throwaway edit recorded). Wire bytes unchanged (golden, key order). Decoder still refuses other versions as `UnsupportedVersion({version, supported})` (`undefined` when absent, INV-QD-098). `WireVersion` still `2`; `WIRE_VERSIONS` narrowing recorded. Decoder-read set vs encoder-write set stated. Gate 13 row and changeset. |
| 39 | One keyed table with a kind per row; unions, list, meanings, `isHydrationDropReason` derived; a kind-less reason fails to compile. List order exactly as today. Metric id, description, label set, `[metric-table]` row unchanged. React groups derived (tstyche partition pin passes). `bucketOf` and refusal maps stay exhaustive. Written-out nine lists and `length === 9` kept. A throwaway new row reaches the metric, the devtools panel at zero and react reporters with one edit. Names and runtime exports unchanged. |
| 40 | Core exports a total `DecodeRefusal` describer (module-scope `Match.tagsExhaustive`; a sixth member is a compile error in core only). Devtools has no `reasonOf`/`MalformedReason`; `onMalformed(frame, refusal)`. INV-QD-104 on decode: annotations say which refusal, never what (sentinel-value test). Audit decodes `input.record` once, output identical (differential; 60,000-deep still `TooDeep`; unknown envelope key still dropped). `recordJsonOf` and the duplicate `asDecodeRefusal` gone. `UNTRUSTED_DECODE_BUDGET`, AGENTS.md §7a, `[untrusted-decode-table]` agree. Breaking changeset, upgrading map, README, website, example, BEH-QD-204, overview rows. |
| 41 | RED on `637c0601`: session-level and `remedyEdits` tests with bigint and circular via `contains`, `inArray`, `eq(literal)` throw today, pass after. One package-private total primitive; one test table is the only place its rules are asserted. Filters, SimulationForm, Remedies read through it; no `JSON.stringify` of an unknown value outside it (scoped grep). Existing outputs pinned (bare strings, the word `undefined` in a remedy label, Filters `[]`, form round-trip refusal). Non-JSON witness behaviour decided and pinned; BEH-QD-223 not weakened. |
| 42 | Plan 1 delivers evidence and options only; a recorded human decision before any code. If go: no function-receiving-a-function parameter on `makeSeededQuestion`; the seed-to-evaluation link in one module, tested through the real atom (no fake `computedFor`); the liveness rule stated once in prose; all pins untouched (render sequences, seed/lifetime/sweep suites, 30 e2e, INV-QD-028/105/317/318, no `scheduleTask`/`defaultIdleTTL`); `maxTrackedQuestions` proofs re-run (StrictMode, `<Activity>`, no leaked fibers, one sweeper per atom set). If no: rejection ADR-155, no source change. Cross-reference sweep over 37-41. |

### Research Flags

Needs deeper research (`/gsd-plan-phase --research-phase <N>`):
- **Phase 37:** run the two RED reproductions (feed pre-fork re-entrancy, in-prefix re-entrancy) before fixing the interface; count store tests that depend on a synchronous prefix.
- **Phase 40:** the compatibility decision for `qadi.reason`/`onMalformed`; typing of the JSON form returned with the record (one narrow checked step, no `as`).
- **Phase 42:** the human checkpoint is the research; spike evidence (lines moved, tests freed of fakes, render-sequence diff, mutation delta) before asking.

Standard patterns (skip research-phase): **38** (one constant, verified under strict flags), **39** (`ENFORCEMENT_ERROR_CLASSES` precedent; verify `Struct.keys` only if used), **41** (language semantics settled; the work is the RED test and adapters).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | APIs read in `node_modules/effect/src` 4.1.2; runtime behaviour run in scratch scripts; types compiled under strict flags. Phase 42 "no behaviour change" is MEDIUM (read, not executed). |
| Features | HIGH | Read at HEAD; Phase 41 reproduced by execution. Phase 37 re-entrancy and the Phase 42 designs are hypotheses. |
| Architecture | MEDIUM-HIGH | Every named file/ADR read; no tests, `madge` or `check:pr` run, so re-run `pnpm circular` per phase. Audit single-decode and Phase 42 are real design choices. |
| Pitfalls | HIGH / MEDIUM | Repo mechanics HIGH; inferred items covered by STACK runs and RED tests. |

**Overall confidence:** HIGH for 37-41, MEDIUM for 42.

### Gaps to Address
- Phase 37 feed re-entrancy is a hypothesis: RED first; if not RED, record the evidence and keep begin/fork anyway (the session needs it).
- `Struct.keys` in effect 4.1.2 is unverified; use the `hasOwn` predicate unless confirmed.
- `DiagnosticsFeed.ts` has no recorded mutation base; `HydrationEngine.ts`/`QadiAtoms.ts` bases only exist for the v1.3 Phase 36 `--mutate` invocation; re-measure at `637c0601` per phase.
- Phase 40: how core hands out the JSON form with one narrow checked step and no new counted decode token; the exact `qadi.reason` value/annotation key (decide in ADR-153).
- Phase 41: label text for non-JSON values (`10n`, a fixed placeholder); keep-degraded vs skip-with-reason; both pinned.
- Phase 42: Option 1a/1b/2/3 is a human decision; effect 4.1.2 neither blocks nor forces it.
- Numbering: reserved ADR 150-155, CCR 428-433, BEH 521-550, INV 319-330; name unused ones in each CCR row.

## Sources

### Primary (HIGH confidence)
- `node_modules/effect/src`: `FiberHandle.ts`, `internal/effect.ts` (`runForkWith`, `scopeCloseFinalizers`, `interruptUnsafe`), `Cause.ts`, `Exit.ts`, `Schema.ts` (`Literal`, `Literals`), `Metric.ts` (`makeKey`, `FrequencyMetric`), `reactivity/Atom.ts`, `reactivity/AtomRegistry.ts`; `@effect/vitest@4.1.2` `src/index.ts`.
- Scratch reproductions (STACK): FiberHandle order, stop, closed handle, slow finalizer, re-entrancy; strict-flag type derivations. FEATURES: `remedyEdits` run against built `packages/core/lib` (six probes).
- Repo at `637c0601`: devtools `model/{TimelineFeed,DiagnosticsFeed,SimulationSession,Source,Filters,Remedies,Inspect,SimulationForm,WhatIf}.ts`; core `{SinkWire,SinkCodec,HydrationMetrics,JsonRefusal,EncodeRefusalReport,Errors,Matcher}.ts`; react `{HydrationEngine,HydrationEvent,QadiAtoms,QuestionBook}.ts`; `audit/src/AuditEntry.ts`; `scripts/check-house-style.mjs`; `stryker.*.mjs`; `AGENTS.md`; ADRs 037, 039, 052, 095, 096, 099, 103, 110, 116, 123, 137, 143, 148, 149; `_WAVE9-CONTEXT.md`, `_SHARED-CONTEXT.md`; the v1.2/v1.3 milestone audits and the Phase 36 mutation base.

### Secondary (MEDIUM confidence)
- ARCHITECTURE's reading of `dist/FiberHandle.js` (superseded by STACK's execution); Phase 42 option costs (read, not run).

### Tertiary (LOW confidence)
- Phase 37 feed re-entrancy and Phase 42 render-sequence risk: hypotheses until RED tests and the e2e say otherwise.

Detail lives in `.planning/research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`.

---
*Research completed: 2026-11-14*
*Ready for roadmap: yes*
