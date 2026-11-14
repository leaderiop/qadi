# Feature Research: v1.4 Arch Wave 9 (behaviour inventory per phase, 37-42)

**Domain:** Effect v4 authorization library, architecture-deepening wave (subsequent milestone)
**Researched:** 2026-11-14
**Base:** every `file:line` below was read at HEAD `bb48bbfb`. `git diff 637c0601 HEAD -- packages spec scripts features AGENTS.md` is empty, so the lines are also true at the milestone base `637c0601`.
**Confidence:** HIGH for every code and spec claim (read directly). HIGH for the Phase 41 reachability result (reproduced by running the code, see below). MEDIUM for the Phase 37 re-entrancy hypothesis and the Phase 42 design options (not run).

"Features" here means the observable behaviour that must survive, the behaviour that changes, and what is table stakes, differentiator or anti-feature for each deepening. Per-phase record work (ADR + CCR + BEH + INV + traceability + overview prose + changeset, `_SHARED-CONTEXT.md`) applies to every phase and is not repeated. Gate 13 (`scripts/check-api-surface.mjs`) checks export names only. Numbering is the block in `_WAVE9-CONTEXT.md` (ADR 150-155, CCR 428-433, BEH 521-550, INV 319-330); confirm free by grep, never `next-id.mjs`.

---

## Corrections to `_WAVE9-CONTEXT.md` found while re-verifying (read these first)

| # | Context claim | Truth at HEAD | Consequence |
|---|---------------|---------------|-------------|
| C1 | Phase 37: "The failure check is repeated verbatim" in three stores | Two copies only: `TimelineFeed.ts:150`, `DiagnosticsFeed.ts:221`. `SimulationSession.ts` has no `hasInterruptsOnly`; its `land` (`:464-514`) wraps the program in `Effect.exit`, checks `mine !== generation` at `:495`, and maps every failure to `Broke` (`:511`). | The shared module owns "land only if current". The failure classification (`Exit.isFailure && !hasInterruptsOnly`) is a hook two stores use and the third deliberately does not. Do not force `Broke` through it. |
| C2 | Phase 37: drift is `SimulationSession.ts:462` vs `DiagnosticsFeed.ts:231-233` only | A second, larger drift: `SimulationSession.start` re-checks `mine === generation` after `commit()` and before forking (`:538-544`, comment "A subscriber notified by that commit may already have superseded this run"). `DiagnosticsFeed.start` (`:204-229`) and `TimelineFeed.readSource` (`:136-155`) notify subscribers (`show(Starting)`, `status.set(READING)`) and then fork unconditionally. A subscriber that restarts the feed from inside that notification forks the older run last; `FiberHandle` interrupts the newer one and the older run's `accept` is dropped (`mine !== generation`). Feed stays Starting/Reading forever. | Hypothesis, **not reproduced**. Phase 37 writes the RED test first (subscriber calls `restart()` or `configure()` inside the notification). If it is RED, the shared module's "claim, notify, fork only if still current" step fixes it by construction and it is a live defect fix, not only locality. If it cannot be made RED, say so with evidence and keep the step anyway because the session needs it. |
| C3 | Phase 37: other stores that own fibers | `DockModel.ts` has no `FiberHandle`, `generation` or `closed` (grep empty). Its source read is `TimelineFeed` (ARCH-82). `audit/src/CircuitBreaker.ts` has its own `generation` (permit tagging) and is a different concern (probe permits, not a superseded fiber run). | Exactly three adopters. Do not touch `CircuitBreaker.ts`. |
| C4 | Phase 37: ADR-QD-137 §7 text | `137-...md:85-88` still says "the timeline's `useRunningStore` is the other shape ... and is unchanged". `useRunningStore` was deleted by ARCH-82 (ADR-QD-047 1.13). | The phase's ADR/amendment corrects §7 so "general for the package" is true of the new module, not of a deleted hook. |
| C5 | Phase 38: "six edits, four unchecked" | Seven sites: `SinkWire.ts:48`, `:51`; `SinkCodec.ts:146`, `:154`, `:224`, `:226`, `:453`. Retyping `WireVersion` to `2 \| 3` compiles: `[2]` still satisfies `ReadonlyArray<WireVersion>` and `const WIRE_VERSION: WireVersion = 2` still compiles. The harm claim holds. | Counts only. The sites that are not typed to the constant are the two `Schema.Literal(2)` and the two `version: 2 as const`. |
| C6 | Phase 39: "Completeness is pinned only by tests" | Partly. `packages/react/test/Hydration.tst.ts:90-91` already pins at type level that `PayloadRefusalReason \| EntryDropReason` equals `ClientHydrationDropReason` and that they are disjoint. `MEANINGS` (`HydrationMetrics.ts:166`) is already a mapped type over the union, so a reason without a meaning already fails to compile. What is hand-kept: the union members (`:48`, `:71`), `hydrationDropReasons` (`:130-140`), react's two groups (`HydrationEvent.ts:85, :92`). | The new table subsumes `MEANINGS` as a column. It is not a fourth list; do not leave `MEANINGS` standing beside it. The tstyche pin stays (it then proves the derivation). |
| C7 | Phase 39: devtools pins nine by `hydrationDropReasons.length` | `Hydration.test.ts:109` is `assert.strictEqual(hydrationDropReasons.length, 9)` and core `HydrationMetrics.test.ts:155-174, 220-256` deliberately write the nine out "rather than read from `hydrationDropReasons`". | These written-out lists are the label-set contract for `qadi_hydration_dropped_total`, independent of the source of truth. They must survive a derived list. Deleting them would remove the only check that the metric label set did not move. |
| C8 | Phase 40: audit "decodes `input.record` twice" | True (`AuditEntry.ts:193` and `:201`), and a third copy exists: `AuditEntry.ts:159-164` `asDecodeRefusal` restates `SinkCodec.ts:489-498` `asDecodeRefusal` (same `TooDeep`/`Malformed` arms, over `UntrustedValueRefusal`). | The audit cleanup removes two things: the second decode and the duplicate refusal mapping. |
| C9 | Phase 41: "Unguarded: `Inspect.ts:300-310` `outsideUnion`, `QuestionsPanel.tsx:388` `resourceOf`" | **Neither can throw.** `outsideUnion` does `JSON.stringify` on a `string` only, `"an object"` for objects, `String(value)` for the rest; `String(bigint)` and `String(symbol)` are total. `QuestionsPanel.tsx:388` `resourceOf` is `typeof id === "string" ? id : Object.keys(resource).join(", ")`; it renders no value at all. Only `Remedies.ts:574` is unguarded and live. | The hazard set is one function. `outsideUnion` has its own presentation rules (quote a string, say "an object", append "outside the union") and is a legitimate second rendering, not a duplicate. `resourceOf` is not value-to-text. Fold them in only if the phase wants one `textOf` primitive underneath; do not claim they are defects. |
| C10 | Phase 41: "Risk: ... **not reproduced**" | **Reproduced** at the function level by running `remedyEdits` against the built core (`packages/core/lib`), see Phase 41. All six probes throw `TypeError`. It is reachable from the session snapshot builder, not only from a panel's render. | Phase 41 is a defect fix with a RED test, not a pure locality change. |
| C11 | Phase 42: ADR conflict is with ADR-QD-103, 148, 149 | No ADR names `computedFor`, `seededIn` or the callback shape (`grep` over `spec/`: only `makeSeededQuestion` as the home of the seed in ADR-149:43 and INV-QD-028/105/317/318 Sources). What the ADRs fix is *where the seed lives* (the question's handle, ADR-149), *who sweeps* (ADR-148) and *that `live()` runs first in the reader* (ADR-103, INV-QD-105). A design that keeps those three needs INV Source/Enforcement citations updated, not an ADR reversal. | The checkpoint should state this plainly: "go" may need only amendments to INV-QD-028/105 Sources plus a new ADR for the new seam, "amend ADRs" only if the chosen shape moves the liveness bookkeeping. |

---

## Phase 37: one module for a scoped run that a newer run supersedes (ARCH-84, devtools)

**Re-verified evidence**

| Review claim | Verdict | Evidence |
|---|---|---|
| Three hand copies of generation / closed / handle / finalizer / `FiberHandle.runtime` fork | CONFIRMED | `TimelineFeed.ts:122-146`, `DiagnosticsFeed.ts:170-190`, `SimulationSession.ts:350-362` (same five elements, each with the same "added after the handle, so it runs first on close" comment) |
| Failure check repeated verbatim | PARTLY (C1) | `TimelineFeed.ts:150`, `DiagnosticsFeed.ts:221` |
| Stop drifted | CONFIRMED | `SimulationSession.ts:460-463` guards with `Option.isSome(FiberHandle.getUnsafe(runs))`; `DiagnosticsFeed.ts:231-236` (`off`) forks `Effect.void` unconditionally. `TimelineFeed` has no stop (a replacement with `NO_SOURCE` is its only way to idle, `:137`) |
| Existing tests | CONFIRMED | `TimelineFeed.test.ts` TF6, TF9, TF15-19; `DiagnosticsFeed.test.ts` F6-F13, F16-F17, F24-F27; `SimulationSession.test.ts:306, 369, 414` plus the generation-staleness cases. Matching-line counts: 26 / 25 / 50 |

Is the `isSome` guard needed? Nothing at HEAD says so. `fork(Effect.void)` on an empty handle installs and immediately completes a fiber; the handle empties again. The phase decides (guard vs unconditional), pins it with one test through the new module ("stop with no run: nothing notified, no state change, no span"), and removes the other copy. Prefer the unconditional form unless a test shows the guard prevents something: it removes a branch (and a surviving-mutant candidate).

### Table stakes

| # | Observable, testable statement | Complexity |
|---|---|---|
| 37-T1 | One package-private devtools module owns the handle, the generation, the closed flag, the finalizer ordering (finalizer registered after the handle so it runs first), the replace-and-interrupt step, `stop`, and the "land only if still current" check. `TimelineFeed`, `DiagnosticsFeed` and `SimulationSession` each contain none of `let generation`, `let closed`, `FiberHandle.make`, `FiberHandle.runtime`, `Effect.addFinalizer(() => ... generation += 1 ...)`. A negative grep scoped to the lines the phase adds proves it | MED |
| 37-T2 | The module has its own test file driving only its interface: supersede (an older run's late result lands nowhere), close mid-run (a closed scope never lands a result and a later start does nothing), stop with a run, stop with no run, interrupt-versus-failure (an interruption never reaches the failure hook; a defect does), replaced-run-whose-release-dies never reports (TF19/F9/F24 shape) | MED |
| 37-T3 | Every pre-existing test in the three store test files still passes unchanged on day one (add the module's tests before deleting any per-store test; XC-05) | LOW |
| 37-T4 | Stop semantics decided and pinned once: whichever of guarded/unconditional is chosen, `DiagnosticsFeed.off` and `SimulationSession.supersede` call the same function | LOW |
| 37-T5 | A start whose notification re-enters (a subscriber calling restart/configure from inside the "Starting"/"Reading" publish) leaves the newer run as the live one in all three stores. RED first on `637c0601` for the two feeds (C2); if not RED, state why with the failing-then-green evidence | MED |
| 37-T6 | Behaviour and spans unchanged: `qadi.devtools.simulationSession.run` is still a root span (ADR-137 §5), the handle's runtime still captures the constructing context (clock, tracer, sink), `Stopped` is never published for an interruption (INV-QD-313), `Broke` still reports a defect in a session run | LOW |
| 37-T7 | Per-file Stryker scores for `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `SimulationSession.ts` do not fall from base (XC-05, `37-mutation-base.json`), and the new module is at or near 100 (cf. `DockModel.ts` 100, `SweepScheduler` 100) | MED |
| 37-T8 | `Effect.fn` for any effectful function; no new `Effect.fnUntraced` (`UNTRACED_BUDGET` unchanged); no `Context.Service` (closures in a scope); `FiberHandle` and `Exit`/`Cause` imported as `effect/*` namespaces | LOW |

### Differentiators

| Feature | Value | Complexity | Notes |
|---|---|---|---|
| Module exposes `landIf(mine, effect)`-style single hook for "land only if current", so each store's `accept` guard is one call, not an `if (mine !== generation) return` | Removes the three `mine !== generation` repetitions inside `accept`/`land` | LOW | Keeps the per-store diff to "what to do with a landed result" |
| A model-based property (seeded, like ARCH-79's seed 3101) over random supersede/close/stop/land interleavings: a result lands only if it is the newest run and the scope is open | Stronger than example tests; replaces dozens of per-store matching lines | MED | Reuse the SharedComputation model-test pattern |
| ADR-QD-137 §7 amended (C4), and ADR-QD-047's feed paragraphs cite the module | The rule becomes enforced rather than remembered | LOW | One amendment, no new decision beyond the module |

### Anti-features

| Anti-feature | Why not | Instead |
|---|---|---|
| A `Context.Service` or Layer for the run | The module is closures in a scope; a service adds a tag for nothing | Plain `Effect.fn` constructor returning a record |
| Folding the three stores' result handling into the module | The review says each store keeps only what it does with a landed result | Module returns "is current" and "failure that counts"; stores keep their own writes |
| Making `SimulationSession`'s `Broke` go through the feed failure check (C1) | Different semantics: a session defect is a reportable outcome, a feed defect is a `Stopped` status | Two hooks, one owner of currency |
| Touching `CircuitBreaker.ts` (audit) or `DockModel.ts` | C3: different concern / no adopter | Leave |
| Re-opening ADR-137's other decisions (scope owns runs, root span, ordering change) | Out of scope; only §7's wording is corrected | Amendment |
| Using `Effect.orDie`, `as`, `!`, `Record<string, unknown>` to type a generic result | House rules | Parametrise the module over the result type |

**Public surface:** none. All three stores' internals; only `makeSimulationSession` and its types are public and unchanged (`index.ts:98-111`, `spec/overview.md:874`). No `overview.md` edit. `@qadi/devtools` patch changeset (or none; if the RED re-entrancy test is real, patch with a fix note).
**Spec touched:** BEH-QD-461 (`29-devtools-simulator.md`, a session owns its runs), BEH-QD-506..510 and BEH-QD-519/520 (`28-devtools-screens.md`, feed stop/restart), INV-QD-313 and INV-QD-314 (`invariants.md:3644, 3660`, a replaced run never writes), ADR-QD-137 §7 and ADR-QD-047 (amend), new BEH-QD-521..525 and INV-QD-319/320.
**Dependencies:** `FiberHandle`, `Exit`, `Cause`, `Scope`; `makeExternalStore` for the stores that publish. Self-contained.

---

## Phase 38: the sink record wire version stated once (ARCH-85, core)

**Re-verified evidence:** CONFIRMED at `SinkWire.ts:48, :51`, `SinkCodec.ts:146, :154, :224, :226, :453, :470`. `WireVersion` and `WIRE_VERSIONS` are public (`index.ts:55` re-exports `SinkWire.ts`; `spec/overview.md:456, :518-521`). `DecodeRefusal.UnsupportedVersion.supported` reports `WIRE_VERSIONS` (`SinkWire.ts:82`), and `SinkCodec.test.ts:84, 1956` consume it. Audit tests read `WireVersion` too (`AuditEntry.test.ts`).

### Table stakes

| # | Observable, testable statement | Complexity |
|---|---|---|
| 38-T1 | One constant in `SinkWire.ts` is the only place the number appears in `packages/*/src`. `Schema.Literal(...)` in `SinkCodec.ts:146, :154`, `version: ... as const` at `:224, :226`, the `WIRE_VERSION` at `:453` and `WIRE_VERSIONS` all derive from it. A scoped grep for `Literal(2)`, `version: 2` and `= 2` in `packages/core/src/Sink*.ts` is empty | LOW |
| 38-T2 | A compile-time pin: adding a member to the version union without editing the codec is a compile error (or, if the new design makes the union the source, adding a member forces the schema, encoder and decoder arms). Pin it in a `.tst.ts` (tstyche) and prove it by a throwaway edit recorded in the summary | MED |
| 38-T3 | Wire bytes unchanged: the existing golden round trip and `SinkCodec.test.ts` pass untouched, and the encoder writes `version: 2` for every record shape (`Decision`, `Obligations`; `outcome` untouched) | LOW |
| 38-T4 | The decoder still refuses any other version as `UnsupportedVersion({ version, supported: WIRE_VERSIONS })` with `version` as sent and `undefined` when absent (INV-QD-098; `SinkCodec.test.ts:1350, 1956`) | LOW |
| 38-T5 | Public types unchanged: `WireVersion` is still the literal `2`, `WIRE_VERSIONS` still `[2]` at runtime. If its declared type changes (for example `readonly [2]`), that is a deliberate, recorded narrowing, not an accident | LOW |
| 38-T6 | A read/write agreement statement: every version the decoder reads (`WIRE_VERSIONS`) is one the encoder can write, or the difference is stated. Today read set = write set = `{2}`; the single-constant design must keep "the codec reads what it writes" true when a version 3 is added | MED |

### Differentiators

| Feature | Value | Complexity | Notes |
|---|---|---|---|
| New INV: "the codec reads what it writes for every supported version" (enforced by a test that iterates `WIRE_VERSIONS`, encodes, decodes) | The review suggests it; it states the invariant the single constant makes cheap | LOW | Next free INV in the 321-322 block. INV-QD-096 already says "whatever the codec emits it accepts"; make the new one a version-indexed restatement or amend INV-QD-096, do not duplicate it |
| Distinguish "the version the encoder writes" from "the versions the decoder reads" as two named facts derived from the one table | Makes a future `2 \| 3` migration (reader reads both, writer writes 3) a one-row edit | LOW | Today they are equal; ADR-096's 2026-10-06 amendment explicitly kept the union for this |
| Test that fails if a golden fixture is regenerated from the constant instead of written out | Stops the constant from silently moving the pinned bytes | LOW | Keep one literal `"version":2` golden string |

### Anti-features

| Anti-feature | Why not | Instead |
|---|---|---|
| Making `WireVersion` a wider type "to be ready for 3" | Closed-union rule: the full union is edited when 3 exists; widening now is the exact thing `WIRE_VERSIONS`' doc forbids | Keep `2` |
| Reintroducing a version-1 reader or an upgrade path | Removed in 0.11.0 (ADR-096 amendment) | Out of scope |
| A runtime version registry or table of per-version codecs | Speculative generality | One constant; per-version struct stays hand-written |
| Replacing the written-out golden literals in tests with the constant | Defeats the pin (T3) | Keep literal bytes |
| `as` to coerce a derived literal | House rule | `as const` on the constant only (already used at `SinkCodec.ts:224`) |

**Public surface:** `WireVersion`, `WIRE_VERSIONS` keep their names. If the declared type of `WIRE_VERSIONS` changes, `spec/overview.md:456, :518-521` prose is edited; gate 13 is name-based so stays green. `@qadi/core` patch changeset; **not** Breaking while the types are unchanged.
**Spec touched:** ADR-QD-095, ADR-QD-096 (amend: "a version bump is a one-row edit", it said "full-union edit"), INV-QD-096/097/098, `behaviors/24-decision-sink.md` (and `08-serialization.md` if it cites the version), new INV-QD-321/322 (optional), `SinkCodec.ts` header (`:42-44`).
**Dependencies:** `SinkWire.ts` is a leaf that `SinkCodec.ts` imports (ADR-QD-037, no cycle). `@qadi/audit` and devtools read `supported` only.
**Smallest phase in the milestone.** Complexity LOW; the work is choosing the constant's shape.

---

## Phase 39: each hydration drop reason stated once, with its kind (ARCH-86, core + react)

**Re-verified evidence:** CONFIRMED with C6 and C7. The two unions (`HydrationMetrics.ts:48`, `:71`), the list (`:130-140`), the meanings table (`:166-232`, already compile-checked), react's two groups (`HydrationEvent.ts:85, :92`) and `HydrationEngine.ts:229-250` (`payloadRefusalReason`, `entryDropReason`) and `:517` (`bucketOf: Record<EntryDropReason, ...>`). Readers: devtools `Hydration.ts:31-36, :85, :107-112`; react `DeveloperSignals.ts:37-44, :156, :165, :273, :286, :322`. Nine reasons: 2 dehydration (`ForeignSubject`, `UnencodablePolicy`), 4 whole-payload (`PayloadSubjectMismatch`, `UnsupportedPayloadVersion`, `MalformedPayload`, `PayloadTooDeep`), 3 entry (`MalformedEntry`, `UndecodablePolicy`, `EntryTooDeep`). The metric registry key includes the description and `preregisteredWords` order (devtools `Hydration.test.ts:104-107` pins declaration order), so label set and order are a contract.

### Table stakes

| # | Observable, testable statement | Complexity |
|---|---|---|
| 39-T1 | One keyed table in `HydrationMetrics.ts`, each row carrying `reason`, `kind` (`dehydration` / `payload` / `entry`), and the meaning (`summary`, `remedy`). `DehydrationDropReason`, `ClientHydrationDropReason`, `HydrationDropReason`, `hydrationDropReasons`, `MEANINGS`' content and `isHydrationDropReason` all derive from it. A row without a `kind` fails to compile (`satisfies` over the row type), proved by a throwaway edit | MED |
| 39-T2 | Insertion order is the metric's order: `hydrationDropReasons` is `ForeignSubject, UnencodablePolicy, PayloadSubjectMismatch, MalformedEntry, UndecodablePolicy, EntryTooDeep, UnsupportedPayloadVersion, MalformedPayload, PayloadTooDeep`, exactly as now (`HydrationMetrics.ts:130-140`) | LOW |
| 39-T3 | The metric label set is unchanged: `qadi_hydration_dropped_total` keeps its id, description and nine `preregisteredWords` in the same order, so the registry key does not move (ADR-QD-123; `[metric-table]` row at `spec/behaviors/25-inspection.md:749` stays green; core `HydrationMetrics.test.ts` written-out lists and `Hydration.test.ts:109` untouched and green) | LOW |
| 39-T4 | React's `PayloadRefusalReason` and `EntryDropReason` are derived from the table's `payload` and `entry` kinds (no hand-written literals; `HydrationEvent.ts:82-84` comment "placed by hand" deleted). `Hydration.tst.ts:90-91` (partition) still passes unchanged and now proves the derivation | MED |
| 39-T5 | `bucketOf` in `HydrationEngine.ts:517` and the two refusal maps (`:229-250`) still compile exhaustively over the derived groups; a new `entry` reason fails them at compile time | LOW |
| 39-T6 | A new reason with a kind and a meaning added in one place reaches the metric, devtools' panel at zero (BEH-QD-232) and react's reporters with no other edit (demonstrated by a throwaway row, recorded) | LOW |
| 39-T7 | Public type names and runtime exports unchanged (`HydrationDropMeaning`, `hydrationDropMeaning`, `isHydrationDropReason`, the three unions, `hydrationDropReasons`). The unions are now `typeof TABLE[number]["reason"]`-style; per-member JSDoc on the reasons moves to the table rows | LOW |

### Differentiators

| Feature | Value | Complexity | Notes |
|---|---|---|---|
| A public `hydrationDropKind(reason)` (or a `kind` read off the table) so devtools can group payload-level versus entry-level reasons | Devtools already explains "the two payload-level reasons" (`Hydration.test.ts:121`) by name | LOW | New export means `spec/overview.md` row + minor changeset; only if a consumer reads it, else keep the kind package-private to core and react |
| Kind column also decides `wholePayload` in react's `HydrationDrop` (today `HydrationEvent.ts` derives it by tag) | One more restated fact gone | LOW | Check `DeveloperSignals.ts:273` before committing to it |
| Tighten INV-QD-045 to say the reason set and its kinds are one table | Invariant states what the code now guarantees | LOW | INV-QD-045 currently says "nine" (INV-QD-045's reason set is nine, history 1.108) |

### Anti-features

| Anti-feature | Why not | Instead |
|---|---|---|
| Deleting the written-out nine in `HydrationMetrics.test.ts` / `Hydration.test.ts` (C7) | They pin the label set independently of the source of truth | Keep; a derived list that silently loses a reason must still fail a test |
| `Record<string, unknown>` or `Object.keys` cast to enumerate the table | Memory rule; loses the literal type | An `as const` array of rows with `satisfies`, or a typed keyed object whose key set is the closed union (the union then comes from a separate row array) |
| `old \| "New"` widening for the sake of source compatibility | Closed-union rule | Add the row |
| Moving drop-reason meaning to react or devtools | ADR-QD-037 puts it in core; two tables had already drifted | Stay in core |
| Changing any metric id, description or label order | Registry keys on type:id:description; re-declaration fails silently | T3 |
| Re-opening ADR-QD-143 or ADR-QD-078 | Out of scope | Cite only |

**Public surface:** names unchanged (`spec/overview.md:322-323` prose says "nine reasons", still true; edit only the module description if the table is named there). React's two reason types are package-private (not in `packages/react/src/index.ts`, not in `overview.md`). `@qadi/core` patch (types stay structurally identical); `@qadi/react` patch. Becomes minor only if `hydrationDropKind` is exported.
**Spec touched:** INV-QD-045, BEH-QD-230, BEH-QD-232 (`19-hydration.md:509, :796`), `25-inspection.md:749` metric row (verify only), ADR-QD-123 (cite), ADR-QD-052 and ADR-QD-037 (cite), new BEH 531..535 / INV 323..324 as needed.
**Dependencies:** `@qadi/core` -> `@qadi/react` (`HydrationEvent.ts:52`, `DeveloperSignals.ts:37-44`) and `@qadi/devtools` (`Hydration.ts:31-36`). Core first, react derive second, in the same phase.

---

## Phase 40: core owns describing a decode refusal (ARCH-87, core + devtools + audit)

**Re-verified evidence:** CONFIRMED with C8. Encode side: `describeEncodeRefusal` (`JsonRefusal.ts:143-153`), `encodeRefusalAnnotations` (`:112-122`), `reportEncodeRefusal` (`EncodeRefusalReport.ts:25`), used by `DecisionSinkForwarding.ts:90`, `PortWireEncode.ts:89` and audit `AuditEntry.ts:106`. Decode side: `reasonOf` (`Source.ts:220-228`) is a 1:1 kebab rename of `DecodeRefusal` (`SinkWire.ts:53-83`: `NotJson`, `TooDeep`, `Malformed`, `UnsupportedVersion`, `Inconsistent`); the `MalformedReason` doc (`Source.ts:250-273`) re-explains all five. `onMalformed(frame, reason)` is public (`Source.ts:126`; `index.ts:116`; `overview.md:849`), used in `examples/nextjs-newsroom/src/client/Dock.tsx:73`, `Source.test.ts`, `Source.tst.ts`, `surface.tst.ts:48`, BEH-QD-204 (`27-devtools-timeline.md:167, :178`). The log annotation `qadi.reason` currently carries the kebab string (`Source.ts:289`).

### Table stakes

| # | Observable, testable statement | Complexity |
|---|---|---|
| 40-T1 | `@qadi/core` exports the decode-side describer (the mirror of `describeEncodeRefusal`): one total `DecodeRefusal -> string` over a `Match.tagsExhaustive` (module scope), and the five-reason prose that lives in `Source.ts:250-273` lives there once. A sixth `DecodeRefusal` member is a compile error in core only | MED |
| 40-T2 | Devtools has no `reasonOf`, no `MalformedReason`, no restated prose. `onMalformed: (frame, refusal: DecodeRefusal) => void`. The default log warning (`Source.ts:287-290`) carries the core describer's output, not a devtools vocabulary | MED |
| 40-T3 | INV-QD-104 holds on the decode side: any annotation says which refusal (the `_tag`), never what. `Malformed.message` (schema issue text, may name values), `UnsupportedVersion.version` (any JSON as sent) and `Inconsistent.disagreement` are not log annotations. The sentence (like `EncodeFailed`'s) may carry them but is never a default log message or annotation. Test with a sentinel value in a malformed frame (mirror `encodeRefusalAnnotations` tests) | MED |
| 40-T4 | `decodeAuditEntry` decodes `input.record` once. The strict decode yields the record and the record's wire JSON together, or the entry's JSON is derived without a second `Schema.decode*`. `recordJsonOf` (`AuditEntry.ts:177`) is deleted | MED |
| 40-T5 | The budget shrinks both ways: `UNTRUSTED_DECODE_BUDGET["packages/audit/src/AuditEntry.ts"]` (`scripts/check-house-style.mjs:637`) is removed, AGENTS.md §7a's table row is removed in the same task, `[untrusted-decode-table]` and `[untrusted-decode-names]` stay green | LOW |
| 40-T6 | Audit's duplicate `asDecodeRefusal` (`AuditEntry.ts:159-164`) is gone: the row decoder's refusal reaches `DecodeRefusal` through one core mapping (core's `SinkCodec.ts:489-498` is the other copy today) | LOW |
| 40-T7 | Behaviour preserved for audit: the same rows decode to the same `AuditEntry` (record JSON identical, unknown envelope key still dropped per ADR-096 D-15-c), refusals identical, depth refusal still `TooDeep` from the record's own root before the row (INV-QD-306; `AuditEntry.test.ts:191` at 60,000 deep). Differential: run the old and new `decodeAuditEntry` over the existing fixtures, same output | MED |
| 40-T8 | **Breaking** `@qadi/devtools`: `MalformedReason` removed and `onMalformed`'s second parameter retyped. Changeset marks it Breaking; `apps/website/.../reference/upgrading.md` gets the old-to-new map (`not-json`->`NotJson`, `too-deep`->`TooDeep`, `not-a-record`->`Malformed`, `unsupported-version`->`UnsupportedVersion`, `inconsistent`->`Inconsistent`) and the changed `qadi.reason` log value; `examples/nextjs-newsroom/src/client/Dock.tsx:73` and `devtools.md:108` updated; `surface.tst.ts:48` and `Source.tst.ts` updated | LOW |
| 40-T9 | `spec/overview.md`: new core export(s) listed (gate 13), `MalformedReason` row (`:849`) removed/changed. BEH-QD-204 restated | LOW |

### Differentiators

| Feature | Value | Complexity | Notes |
|---|---|---|---|
| A decode reporter mirroring `reportEncodeRefusal` (an `Effect.fn` that logs with the annotation set), used by devtools' default path | Same shape both directions; devtools stops hand-rolling `Effect.logWarning` | MED | Review says "reporter if a consumer needs one": devtools does need the log, so this is justified rather than speculative. Keep the `frame` annotation devtools already writes (`qadi.frame`) as a devtools extra |
| `decodeRefusalAnnotations(refusal)` (tag only) beside `encodeRefusalAnnotations` | Closes INV-QD-104 mechanically | LOW | |
| Audit and `AuditArchive.EntryNotDecodable` use the describer when they report (today they carry the raw refusal) | One sentence per refusal for compliance reviewers | LOW | Only if a consumer reads it; `AuditEntryNotEncodable.reason` is the precedent |
| Core owns `UntrustedValueRefusal -> DecodeRefusal` (the mapping both core and audit write) | Third restatement of a mapping gone (C8) | LOW | Likely needed for T4/T6 anyway |

### Anti-features

| Anti-feature | Why not | Instead |
|---|---|---|
| Keeping `MalformedReason` as an alias of a kebab projection "for compatibility" | Memory: compat is never the tiebreaker; milestone states Breaking | Remove, document in upgrading.md |
| A new `DecodeRefusal` member, or splitting `Malformed` | Closed union edited as a whole, no reason to touch it | Describe the five |
| Annotating `Malformed.message` or `UnsupportedVersion.version` | INV-QD-104 (where, never what); `message` can name values | Sentence only, never a default log message |
| Re-encoding the decoded record to get the entry JSON (`encodeSinkRecord(record)`) as the audit shortcut | Can fail or normalise differently from the stored row (e.g. `outcome` rebuild, INV-QD-096/098 are per direction, not a proof of identity for every decoded record) | Core hands out the already-validated wire value with the record (new minor export, ADR-QD-099: another package needs it, so it goes in the barrel), proven by the differential in T7 |
| Re-opening ADR-QD-143 (decoder recipe) or ADR-QD-116 (refusal leaf) | Out of scope | Cite; ADR-QD-153 amends 095/110 only as needed |

**Public surface:** core gains the describer (and reporter/annotations if included, plus a record-with-wire decode export if that route is taken), so `@qadi/core` **minor**; `@qadi/devtools` **Breaking** (minor on 0.x); `@qadi/audit` patch (internal, behaviour identical). `spec/overview.md` rows: new core exports, `:849` removed, `:456` neighbourhood. `UNTRUSTED_DECODE_BUDGET` and AGENTS.md §7a table edited together.
**Spec touched:** BEH-QD-204 (`27-devtools-timeline.md:167`), BEH-QD-203, BEH on stream/backlog (`26-decision-stream.md:322, :419, :585, :597` cite `onMalformed`), INV-QD-104, INV-QD-097 (the codec is total), INV-QD-170, INV-QD-305/306, ADR-QD-095, ADR-QD-110 ("audit facts computed once", touched), ADR-QD-116 (mirror), `spec/README.md` CCR row 431, new BEH 536..540, INV 325..326.
**Dependencies:** `SinkWire.ts` (leaf, ADR-037), `JsonRefusal.ts`/`EncodeRefusalReport.ts` (pattern), `UntrustedDecode.ts`. Phase 38 touches `SinkCodec.ts`/`SinkWire.ts` first, so 40 builds on 38's constant; run 38 before 40 (already the order).
**Largest cross-package phase after 42.** Complexity MED-HIGH (three packages, a Breaking surface, a budgeted-exception removal).

---

## Phase 41: one guarded value-to-text function in devtools (ARCH-88, latent defect)

**Re-verified evidence and reachability (the question that was open).**

The unguarded sink is `Remedies.ts:574-575` `render = (v) => typeof v === "string" ? v : String(JSON.stringify(v))`, used at `:481` (SubjectAttribute label), `:496` (ResourceAttribute label) and `:249`-area (`Size`: `a size is a number, and ${render(v)} is not`). The values come from `satisfyingValue`/`witnessCases` (`:145-254`): `In` -> `m.values[0]` (`:206`), `Contains` -> `[m.value]` (`:241`), `Eq` -> `refValue` -> `LiteralRef.value` (`:269`), then `FieldMatch`/`SomeMatch`/`EveryMatch` wrap it. `checked` only keeps a witness `judgeMatcher` holds, and `contains`/`inArray`/`eq(literal(...))` hold for the value they were built from. Core types: `contains(value: unknown)` (`Matcher.ts:284`), `inArray(values: ReadonlyArray<unknown>)` (`:234`), `literal(value: unknown)` (`:73`), schemas `Schema.Unknown` (`:102, :115`). So a **policy built in code** can carry a bigint or a circular object. (A policy decoded from JSON cannot: JSON has neither.)

**Reproduced**, running the real `remedyEdits` from `packages/devtools/src/model/Remedies.ts` against the built core (`node` 26, script in the session scratchpad, repo untouched):

| Policy | Result |
|---|---|
| `hasAttribute("tags", contains(10n))` | `TypeError: Do not know how to serialize a BigInt` |
| `hasAttribute("tags", contains(circular))` | `TypeError: Converting circular structure to JSON` |
| `hasAttribute("level", inArray([1n]))` | BigInt `TypeError` |
| `hasResourceAttribute("level", inArray([circular]))` | circular `TypeError` |
| `hasResourceAttribute("level", eq(literal(1n)))` | BigInt `TypeError` |
| `hasAttribute("level", eq(literal(circular)))` | circular `TypeError` |

**Where the throw lands (worse than "while rendering"):** `remedyEdits` is called by `derive` (`WhatIf.ts:201`), which `sweepPlan` calls (`:173`), and `SimulationSession.build()` calls `sweepPlan` synchronously (`SimulationSession.ts:404`) on every `commit()` (`:447-449`). So the throw happens inside a session command (choosing a policy, editing the draft, toggling pairs), outside any Effect, so no `Broke` capture; it propagates to the caller (a React event handler or the model's subscribe path), leaving the command's state mutation done and its publish not. Only reproduced at the `remedyEdits` level; the phase's RED test should be written at the **session** level (`makeSimulationSession` + `setPolicy`/`chooseSight` with such a policy) and at `remedyEdits`, and recorded RED on `637c0601`.

Other claimed sites (C9): `Filters.ts:136-146` guarded (try/catch, `[]`); `SimulationForm.ts:95-103` guarded (`undefined`) and then a round-trip check; `Inspect.ts:300-310` total; `QuestionsPanel.tsx:388` not a value renderer. `grep` of `packages/devtools/src` for `JSON.stringify`/`String(` finds no other unguarded rendering of a policy- or resource-carried value (the `String(...)` hits are numbers, errors and enum-ish fields: `Remedies.ts:225, :240, :258` are `number`s already `Number.isFinite`-checked or numeric; `Capture.ts:164-167` and `SimulationSession.ts:511` stringify errors/causes, not user values).

### Table stakes

| # | Observable, testable statement | Complexity |
|---|---|---|
| 41-T1 | RED first on `637c0601`: a session-level test and a `remedyEdits` test with a bigint and a circular value (through `contains`, `inArray`, `eq(literal)`) throws; GREEN after the fix: no throw, a label is produced, the remedy still builds or is skipped with a stated reason | MED |
| 41-T2 | One package-private function turns an unknown value into text and never throws (bigint, circular, `Symbol`, function, `undefined`, null-prototype object, a throwing `toJSON`, a throwing getter). One test table covers every value class and is the only place the rules are asserted | LOW |
| 41-T3 | `Filters.ts`, `SimulationForm.ts` and `Remedies.ts` read through it (or through a thin adapter over its primitive: Filters wants `ReadonlyArray<string>` with `[]` for the unrepresentable, the form wants `string \| undefined` and then its own round-trip check, Remedies wants a label). No `JSON.stringify` of an unknown value remains outside the one function: scoped grep over the lines the phase adds, and a house-style-like pin if cheap | LOW |
| 41-T4 | Existing behaviour pinned and unchanged: strings shown bare (`= low`), `JSON.stringify(undefined)` still renders as the word `undefined` in a remedy label (the `render` doc says this is intended, "the right label for a policy only an absent attribute satisfies"), Filters still returns `[]` for an unrepresentable, the form still refuses non-round-tripping text (`SimulationForm.ts:105-`) | LOW |
| 41-T5 | What a remedy label says for a value with no JSON form is decided and tested (a bigint can print as `10n`; a circular object as a fixed placeholder). It must not repeat the value's content beyond what JSON does today and must not throw | LOW |
| 41-T6 | `witnessed.value` that cannot be shown does not drop the remedy: the edit is still built (the input value is fine) and only its label degrades, or it is skipped with a reason in `skipped`, whichever the phase picks and pins. BEH-QD-223 ("a synthesised value must satisfy the matcher") is not weakened | MED |

### Differentiators

| Feature | Value | Complexity | Notes |
|---|---|---|---|
| Phase finds the reachable cases are bigint and circular only and writes the table with those plus a throwing getter and `toJSON` | Honest coverage of what `JSON.stringify` can actually do | LOW | |
| A cap on text length in labels | Row labels say "short enough" (`Remedies.ts:566`) yet a large object is rendered whole | LOW | Only if it falls out of the table; do not invent a limit |
| Decide whether `Inspect.outsideUnion` rides on the same primitive for its non-object branch | One total primitive underneath | LOW | Keep its presentation rules (C9) |

### Anti-features

| Anti-feature | Why not | Instead |
|---|---|---|
| Wrapping `Remedies` in a blanket try/catch or `Effect.orDie`/`catchAll` | Hides other throws; defects in a decision-adjacent panel must stay visible (core value) | Fix the one function |
| Calling `outsideUnion` or `resourceOf` defects | C9: neither throws | Leave them, or sit them on the primitive |
| Reaching into core to forbid a bigint or circular in `contains` | A policy built in code is legal; JSON decode already excludes both | Make devtools total |
| Making the function public | Devtools model internals (`index.ts` is named-export only, ADR-047) | Package-private |
| `as`, `Record<string, unknown>` | Memory and AGENTS.md | Type predicate / `typeof` narrowing |
| Showing a failing value's content in a log | INV-QD-044 reasoning (span data) | Fixed placeholder text |

**Public surface:** none. `@qadi/devtools` patch changeset describing the fix (a policy built with a bigint/circular value no longer throws in the simulator). No `overview.md` edit.
**Spec touched:** BEH-QD-223 (`29-devtools-simulator.md:289`), `29-devtools-simulator.md` filters/remedies behaviours, ADR-QD-050 (cite), ADR-QD-047 (cite), new BEH 541..545, INV 327..328 (an invariant "no panel throws on a value a policy can carry" is a natural one).
**Dependencies:** none beyond `Remedies.ts`, `Filters.ts`, `SimulationForm.ts`, `WhatIf.ts`, `SimulationSession.ts`. Independent of 37 and 40, but both touch `SimulationSession.ts`'s neighbourhood (37 edits it; run 41 after), mutation base for `SimulationSession.ts` must be taken per phase.

---

## Phase 42: a seeded question builds its own computing atom (ARCH-89, speculative; human checkpoint)

**Re-verified evidence:** CONFIRMED at `HydrationEngine.ts:692-` (`makeSeededQuestion`, `computedFor` param `:696-698`, `track` `:704`, `const computed = input.computedFor(seededIn)` `:718`) and `QadiAtoms.ts:257-` (`seededDecision`, `computedFor: (seededIn) => runtime.atom(...)` `:271-295`, `track: (get) => get.addFinalizer(live())` `:296-`). The same liveness rule is told in `QuestionBook.ts:17-37` and `:74`, `QadiAtoms.ts:289-296` and `HydrationEngine.ts:700-703`, and also in `invariants.md:3206-3208` (INV-QD-105's Source names `makeSeededQuestion`'s `track`). `HydrationEngine.test.ts:54-132` passes a fake `computedFor` (`:61, :81, :105, :132`).

What the seam is for: `seededIn` is a closure over `grantAtom` and `seeds` that live *inside* `makeSeededQuestion`; the computing atom needs the server's `evaluationId` from the seed (BEH-QD-186), and the read atom needs the computing atom. So the module that creates the seed store must be handed the thing that needs the seed store. The callback receiving a callback is the symptom.

**What an inversion must carry across the boundary** (so the checkpoint is concrete): `Atom.runtime(layer)`'s `runtime.atom`, the `subject` atom, `evaluate`, `CurrentSubject`, `DECISIONS_KEY` (a private const in `QadiAtoms.ts:79`) and `runtime.factory.withReactivity`. `HydrationEngine.ts`'s header says it "imports nothing from `Hydration.ts`, `QadiAtoms.ts` or `QadiProvider.tsx`, so no cycle" (`:20-21`). Pulling evaluation into it breaks that statement's spirit (it would import `evaluate` and the runtime services), so "the runtime and the subject atom handed in" must be handed as values, not imported.

### Options to put before the human (first plan; no code before the decision)

| Option | Shape | Keeps ADR-149 (seed in the question) | Keeps ADR-148/103 liveness | Cost |
|---|---|---|---|---|
| A. As reviewed | `makeSeededQuestion({ policy, resource, runtime, subject, report, track })` builds the computing atom itself | yes | yes if `track` stays | Engine gains evaluation knowledge; tests need a real runtime or a fake `runtime.atom`; moves `DECISIONS_KEY` and the `evaluate` call |
| B. Seed holder first | A tiny `makeSeedHolder()` returns `{ seededIn, hold }`; `QadiAtoms` builds the computing atom from `holder.seededIn` and passes `{ computed, holder }` to `makeSeededQuestion` | yes | yes | Removes the callback-that-receives-a-callback with no layering change; the grant, `seeds` WeakMap and `hold` move to the holder; computing atom stays where it is (the `evaluate` knowledge) |
| C. Reject, record why | Rejection ADR citing ADR-103/148/149 | n/a | n/a | Cheapest; the liveness rule stays stated three times and the test keeps its fake |

Recommendation for the checkpoint: present B as the option that removes the inversion without reopening ADRs, A as the review's literal proposal, and C. The human decides go / amend / reject (the user's condition, 2026-11-14). Do not write code in the checkpoint plan.

### Table stakes (if the human says go with A or B)

| # | Observable, testable statement | Complexity |
|---|---|---|
| 42-T1 | `makeSeededQuestion` has no parameter whose type is a function receiving a function (`computedFor`/`seededIn` inversion gone) | MED |
| 42-T2 | The seed to evaluation link (the evaluation id from the seed reaches `evaluate`, BEH-QD-186) is stated in one module and tested through the real way the atom is built, not a fake: `HydrationEngine.test.ts`'s four `computedFor` fakes are replaced by tests that build the real computing atom | MED |
| 42-T3 | The liveness rule ("`live()` first inside the reader, release in its finalizer") is stated once in prose, at `QuestionBook.ts`'s `BookOptions.build` doc; the other two copies (`QadiAtoms.ts:289-296`, `HydrationEngine.ts:700-703`) become a one-line pointer or vanish | LOW |
| 42-T4 | All behaviour pins unchanged and untouched: `QadiProvider.test.tsx` render sequences (the file says exactly one `Atom.readable` per question and no added dependency), `QadiProvider.seed.test.tsx`, `Hydration.lifetime.test.ts`, `QadiAtoms.sweep.test.ts`, `QadiProvider.sweep.test.tsx`, the e2e (30/30 at v1.3), INV-QD-028/105/317/318, ADR-QD-149's "registry holds only a grant" and ADR-QD-148's no-scheduleTask/no-defaultIdleTTL | HIGH |
| 42-T5 | `maxTrackedQuestions` still holds with no leaked fibers, one sweeper per atom set, StrictMode and `<Activity>` (the v1.3 Phase 35 proofs re-run) | MED |
| 42-T6 | A "no" outcome ends the phase with a rejection ADR (a decision, not a skip), the evidence recorded, and no source change | LOW |
| 42-T7 | This phase also corrects anything 37-41 left stale (CONTEXT: "which also corrects anything 37-41 left stale"): a final sweep of cross-references across the six phases (INV/BEH numbering, overview prose, ADR amendments) | MED |

### Differentiators

| Feature | Value | Complexity | Notes |
|---|---|---|---|
| Spike evidence (as Phase 35 did) comparing A/B/C on fixed criteria before the human decides: lines moved, tests that no longer need fakes, render-sequence diff, mutation delta | Makes the checkpoint a decision on measured facts | MED | `Phase 35`'s spike is the template |
| The seed holder (B) is independently unit-tested for ADR-149's properties (no node created for an unseeded question, no read after the client answered) without any atom runtime | The two highest-value invariants become cheap tests | LOW | |

### Anti-features

| Anti-feature | Why not | Instead |
|---|---|---|
| Changing code before the human decides | The user's explicit condition | First plan is evidence and options only |
| Using `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL` or a React `useState`/`useEffect` for a decision | AGENTS.md §13; ADR-148 | Atom graph only |
| Holding the seed in the shared book entry | Leaks across server requests (ADR-149) | Held by the question's handle, grant in the registry |
| A second `Atom.readable` per question | `QadiProvider.test.tsx` render sequences | Exactly one |
| Reintroducing a module-scope seed table | AGENTS.md §13 ("No module-scope state is left") | Closure in the atom set |
| Editing ADR text to make the change fit | Amend only if the human chooses "amend" | Otherwise reject by ADR |

**Public surface:** none expected (`makeSeededQuestion` is package-private; `QadiAtoms` interface unchanged). `@qadi/react` patch, or no changeset on a rejection.
**Spec touched:** INV-QD-028 (`invariants.md:1081`), INV-QD-105 (`:3206`), INV-QD-317/318 (`:3706, :3720`) Sources and Enforcement; ADR-QD-039 (`:96`), 103, 148, 149 (cite or amend); BEH-QD-186, BEH-QD-151 (`19-hydration.md`); `spec/traceability.md:111, :161-162`; new BEH 546..550, INV 329..330 only if kept.
**Dependencies:** `HydrationEngine.ts`, `QadiAtoms.ts`, `QuestionBook.ts`; phase 39 also edits `HydrationEngine.ts`/`HydrationEvent.ts` (reason groups), so 42 runs after 39 and rebases on its derived types.

---

## Feature Dependencies

```
38 wire version constant ──> 40 decode describer (both edit SinkWire.ts / SinkCodec.ts; 40 reads WIRE_VERSIONS in UnsupportedVersion's prose)
39 reason table ───────────> 42 (HydrationEngine.ts / HydrationEvent.ts edited by 39 first)
37 run module ─────────────> 41 (both touch SimulationSession.ts; 37 first so 41's RED test targets the final session)
40 describer ──────────────> audit one-decode ──> UNTRUSTED_DECODE_BUDGET row removed (same task)
41 RED session test ───────> shares fixtures with SimulationSession.test.ts (1,809 lines): put it in a new file
42 checkpoint ─────────────> everything after it; "no" ends cleanly
```

Order in the roadmap (37 -> 42) already respects all of these.

## MVP Definition

### Must ship (the milestone is the six deepenings)

- [ ] 37: one run module, three adopters, stop semantics decided, re-entrancy RED-or-refuted
- [ ] 38: one wire-version constant, compile-time pin, bytes unchanged
- [ ] 39: one keyed reason table with kinds, all derived, written-out label-set pins kept
- [ ] 40: core decode describer, devtools passes `DecodeRefusal` through (Breaking), audit one decode, budget row removed
- [ ] 41: RED then GREEN for the Remedies throw, one guarded function, one test table
- [ ] 42: checkpoint plan with evidence and options; code only on "go"

### Defer / exclude (named so they are not rediscovered)

- `FIXTURE_DATA` placement in `SimulationFields.ts:568`, and the literals `"Decision"`/`"Obligations"` at `DecisionRecord.ts:145/149` (context: too small unless a phase lands there)
- Sections the review did not read: `DecisionCache.ts`, `Lifecycle.ts`, `PortAccess.ts`, `AuditArchive.ts` internals, `Simulator.tsx`, `RoleViewer.tsx`, `PolicyExplorer.tsx`
- `CircuitBreaker.ts`'s generation (C3)
- `oxfmt`, budget changes other than the one removal in Phase 40 (`UNTRUSTED_DECODE_BUDGET`), re-opening ADRs 077-107

## Feature Prioritization Matrix

| Phase | Value | Cost | Risk | Notes |
|---|---|---|---|---|
| 41 | HIGH (a real throw) | LOW | LOW | Reproduced; could ship first if order allowed, but the context fixes 37 first |
| 37 | HIGH (top recommendation, possible latent hang) | MED | MED | Three stores at once; mutation bar |
| 40 | MED-HIGH | MED-HIGH | MED (Breaking, three packages) | |
| 39 | MED | MED | LOW | Label set is the contract |
| 38 | LOW-MED | LOW | LOW | |
| 42 | UNCERTAIN | MED-HIGH | HIGH | Human checkpoint decides |

## Sources

All HIGH confidence, read directly at `bb48bbfb` (= base `637c0601` for `packages`, `spec`, `scripts`, `features`, `AGENTS.md`):

- `.planning/phases/_WAVE9-CONTEXT.md`, `_SHARED-CONTEXT.md`, `.planning/PROJECT.md`, `AGENTS.md`
- Phase 37: `packages/devtools/src/model/{TimelineFeed,DiagnosticsFeed,SimulationSession}.ts`, `spec/decisions/137-*.md:85-88`, the three test files
- Phase 38: `packages/core/src/{SinkWire,SinkCodec}.ts`, `spec/overview.md:456, :518-521`
- Phase 39: `packages/core/src/HydrationMetrics.ts`, `packages/react/src/{HydrationEvent,HydrationEngine,DeveloperSignals}.ts`, `packages/react/test/Hydration.tst.ts`, `packages/devtools/test/model/Hydration.test.ts`, `spec/behaviors/25-inspection.md:749`
- Phase 40: `packages/devtools/src/model/Source.ts`, `packages/audit/src/AuditEntry.ts`, `packages/core/src/{JsonRefusal,EncodeRefusalReport,SinkCodec}.ts`, `scripts/check-house-style.mjs:631-640`
- Phase 41: `packages/devtools/src/model/{Remedies,Filters,SimulationForm,Inspect,WhatIf,SimulationSession}.ts`, `packages/devtools/src/react/QuestionsPanel.tsx`, `packages/core/src/Matcher.ts`; reproduction by executing `remedyEdits` under Node 26 against `packages/core/lib`
- Phase 42: `packages/react/src/{HydrationEngine,QadiAtoms,QuestionBook}.ts`, `spec/decisions/{103,148,149}-*.md`, `spec/invariants.md:3198-3215`
