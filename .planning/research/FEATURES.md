# Feature Research: v1.3 Arch Wave 8 (behaviour inventory per phase, 30–36)

**Domain:** Effect v4 authorization library, architecture-deepening wave (subsequent milestone)
**Researched:** 2026-11-12
**Base:** every `file:line` below was read at HEAD `b8b19f6c`. `git diff aab87576 HEAD -- packages spec scripts features` is empty, so the lines are also true at the phase base `aab87576`.
**Confidence:** HIGH for every code and spec claim (read directly). MEDIUM where a mechanism is a hypothesis (Phase 35, Phase 33 option choice). The one empirical check (madge, Phase 32) is HIGH.

"Features" here means: the observable behaviour that exists today and must survive, the behaviour that changes, and what is table stakes, differentiator or anti-feature for each deepening. Standard per-phase record work (ADR + CCR + BEH + INV + traceability + overview prose + changeset) applies to every phase and is not repeated below. Gate 13 (`scripts/check-api-surface.mjs`) checks export **names** only (lines 327-372), not the module column in `spec/overview.md`, so moving a declaration is a prose edit, not a red gate.

---

## Corrections to `_WAVE8-CONTEXT.md` found while re-verifying (read these first)

| # | Context claim | Truth at HEAD | Consequence |
|---|---------------|---------------|-------------|
| C1 | Phase 30: audit "decode only with the options and no depth guard" | Half true. `AuditEntry.ts:191` runs `decodeSinkRecord(input.record)` first, which depth-guards (`SinkCodec.ts:502`); `decodeRow` (`AuditEntry.ts:150`) decodes `record: Schema.Unknown`, which does not recurse; `recordJsonOf` (`:163`) runs only after the guard accepted. `AuditArchive.ts:252` `ArchiveEnvelope` is non-recursive (`entries: Schema.Array(Schema.Unknown)`), and each entry goes through `decodeAuditEntry` (`:287`). Audit is guarded transitively and a test pins it (`AuditEntry.test.ts:191`, 60,000 deep, `DecodeRefusal.TooDeep`). | Audit "gaining a depth guard" is **not** a behaviour change if the guard stays per entry. It becomes consumer-visible only if the guard is lifted to the whole bundle (a too-deep entry would then stop being `ArchiveRefusal.EntryNotDecodable({ index, refusal: TooDeep })`). Keep per entry. |
| C2 | Phase 30: "`PortWireEncode.ts:104-139` (×3)" | Two decoders (`:104`, `:106`) and two guards (`:120`, `:138`). Eight guard call sites total, nine decoder constructions in six modules. | Counts only. |
| C3 | Phase 30 omits | `PolicyFromJson` (`Policy.ts:916`) is a **public, unguarded** JSON-string codec (`overview.md:132`). `fromJson` only falls back to it for malformed text (`Policy.ts:1033`). A consumer decoding with it directly gets the raw-`RangeError` hazard the whole recipe exists to prevent. | A real seam the review missed. The phase must decide: guard it, deprecate it, or document it as unguarded. |
| C4 | Phase 33: two copies "decide differently whether the sink (and cache) is shadowed, and neither says so" | `qadiReviewLayer` (`testing/src/QadiReviewLayer.ts:145-165`) shadows **nothing**: no sink, no cache, no subject. `simulationLayer` (`devtools/src/model/Simulation.ts:85-105`) shadows both and says so in its header and INV-QD-042. The "~10 verbatim lines" are really three: `evaluationIdSequential(prefix)`, `clockLayer`, and a `fixturePortsLayer` call (Simulation reaches it through `portsOf`, `SimulationSource.ts:96,122`, because it also has Snapshot and Live sources). | The overlap is small. The review itself rated payoff "small". The real deliverable is the stated shadowing rule. |
| C5 | Phase 32: `EvaluationServices` is spelled out in `Lifecycle.ts` "to dodge a madge cycle" | Verified empirically in a scratch copy (`/private/tmp/claude-502/.../scratchpad/cc`, repo untouched): adding `import type { CurrentSubject, EvaluationId, PortServices }` to `Question.ts` leaves `madge --circular` green (80 files, no cycle; `Question.ts` then depends on `Ports.ts`). | A `Question.ts` leaf is feasible. Still re-run `pnpm circular` in the phase. |
| C6 | Phase 35: "the atom set schedules its own sweep while it is mounted" | An atom set has **no lifecycle**: `makeQadiAtoms` is a module-scope synchronous call (`QadiAtoms.ts:262`), with no `Scope` and no dispose. Each `QadiProvider` makes its own `AtomRegistry` (`QadiProvider.tsx:241`); one atom set can serve many registries. "While mounted" has no referent today. | Mechanism choice is the whole phase (see Phase 35). |
| C7 | Phase 36: duplicate BEH-QD-219..221 | Confirmed (`29-devtools-simulator.md:28/188, 76/236, 127/287`), but the duplication is worse than a repeated heading: the **second copy carries pre-ADR-QD-129 text that contradicts BEH-QD-411** (`:~290-340`: "A query the capture never saw MUST answer the fail-closed default"), and the first copy's tail is **corrupted** by a spliced change-history fragment (`:173`). The duplication already exists at `965ff14c`. | Phase 36 must delete the second copy and repair line 173, not just renumber. |
| C8 | Phase 36: 28 IN-06 (no StrictMode lifecycle test) | Partly stale. `packages/react/test/GateRegistry.test.tsx:489` "StrictMode registers once" renders an instrumented provider under `StrictMode` and asserts 1 then 0 instances. Not covered: an identity-changing rerender through `useGateRegistrations` under StrictMode. | Narrow the item, or drop it. |
| C9 | Phase 36: stale replay line "wherever it remains" | Remaining at HEAD: `.planning/PROJECT.md:225` ("the other four ports undecided") and `.planning/MILESTONES.md:76`. Already struck: `STATE.md:212`, `PROJECT.md:49,196`. Nothing in `spec/`. | Two lines. |

---

## Phase 30: one strict-decode module for every untrusted JSON seam

### Today's behaviour: every untrusted decode seam in `packages/*/src`

Method: grepped `UNTRUSTED_DECODE_OPTIONS`, `exceedsJsonDepth`, `fromJsonString`, `decodeUnknown`, `JSON.parse`, `Schema.decode`, `.json` across `packages/*/src`. The shared pieces: `exceedsJsonDepth` (`core/src/DecodeDepthGuard.ts:36`, iterative, array stack, public via `index.ts:15`), `MAX_DECODE_DEPTH = 256` (`Policy.ts:978`, public, normative per BEH-QD-059), `UNTRUSTED_DECODE_OPTIONS = { onExcessProperty: "error" }` (`Policy.ts:1002`, public, `overview.md:117`).

| # | Seam (file:line) | Input | Depth guard? | Refusal it returns | Public? | Covering spec | Pinning test |
|---|------------------|-------|--------------|--------------------|---------|---------------|--------------|
| 1 | `Policy.fromJson` `Policy.ts:1017-1041` (guard `:1035`, decoder `:1004`) | text | after `JSON.parse`; a parse failure falls through to `Schema` `fromJsonString` (`:1033`) | `Effect.fail(PolicyDecodeTooDeep{maxDepth})` or `Schema.SchemaError` (carries the issue tree) | yes | BEH-QD-059, ADR-QD-002; `PolicyDecodeTooDeep` is in `QadiError`, `ERROR_CODES` `ACL017` (`Errors.ts:430,459`) | `Policy.test.ts:557`, `:574` (malformed 60,000-deep text) |
| 2 | `Policy.fromJsonValue` `Policy.ts:1055-1062` | value | yes, `:1060` | same two | yes | BEH-QD-059 | `Policy.test.ts:536-560` (null node), `:557` |
| 3 | `PolicyFromJson` `Policy.ts:916` | text | **no** | raw `Schema` errors, or a `RangeError` defect on deep input | **yes, unguarded** | `overview.md:132` | none for depth |
| 4 | `decodeSinkRecord` `SinkCodec.ts:499-510` (decoder `:423`, guard `:502`) | value | yes, first, before version dispatch and the `envelopeOf` projection | `Result.fail(SinkRecordNotDecodable{ DecodeRefusal })`: `TooDeep`, `UnsupportedVersion`, `Malformed({message})`, `Inconsistent` | yes | BEH-QD-199, BEH-QD-450, ADR-QD-095/096, INV-QD-096/097/170 | `SinkCodec.test.ts:741,1304,1335` |
| 5 | `decodeSinkRecordString` `SinkCodec.ts:517-520` (`JSON.parse` `:519`) | text | via #4 | `DecodeRefusal.NotJson` else #4 | yes | INV-QD-097 | same file |
| 6 | `decodeStoredRecord` / `decodeStoredRecordString` `SinkCodec.ts:~582-604` (`JSON.parse` `:602`) | value / text | the envelope is read with `ownValue` (non-recursive); `record` goes through #4 | `Malformed` for a bad envelope, else #4's | yes | ADR-QD-097 | `SinkCodec.test.ts` |
| 7 | `portWire.decodeQuestion` `PortWireEncode.ts:119-129` (decoder `:104`, guard `:120`) | value | yes, `WIRE_MAX_DEPTH = MAX_DECODE_DEPTH` (`:27`) | `Result.fail(string)` ("the question nests deeper than the decode bound", or `error.message`) | the `PortWire` interface is public (`PortWire.ts:153`) | ADR-QD-107; `34-remote-ports.md:147-148` | **no depth test** (see gap G1) |
| 8 | `portWire.decodeAnswer` `PortWireEncode.ts:137-143` (decoder `:106`, guard `:138`) | value | yes | `Result.fail(string)` | same | same | **no depth test** |
| 9 | `askRemotely` reply `PortRemote.ts:123,151-153` | value (from `send`) | yes, `:151` | `RemotePortFailure.Undecodable({ message })`, wrapped by the port's own typed error | `RemotePortFailure` public | BEH-QD-329/333, INV-QD-095 | `PortRemote.test.ts:212` (shape only) |
| 10 | `planHydration` payload `HydrationEngine.ts:440` | unknown | yes, over `{ ...payload, entries: [] }` (the entries are guarded one by one, so the envelope guard excludes them) | drop reason `MalformedPayload` | the eight drop reasons are public (`hydrationDropReasons`) | BEH-QD-259/268/269, INV-QD-045 | **payload-level depth is not pinned** (G2) |
| 11 | `planHydration` per entry `HydrationEngine.ts:480` then `decodeEntry` `:199`, `decodePolicy` `:198` | unknown | yes | `EntryTooDeep`, `MalformedEntry`, `UndecodablePolicy` (`Option`, not `Result`) | reasons public | BEH-QD-259, INV-QD-045 | `Hydration.test.ts:516`, `HydrationCounts.test.ts:348` |
| 12 | `decodeAuditEntry` `AuditEntry.ts:187-200` | unknown | transitively via #4 (`:191`); `decodeRow` `:150` is non-recursive | `SinkRecordNotDecodable` (same `DecodeRefusal`) | yes | BEH-QD-312, INV-QD-097 | `AuditEntry.test.ts:191` |
| 13 | `readAuditArchive` `AuditArchive.ts:252,276-312` | unknown | envelope non-recursive; each entry via #12 | `ArchiveRefusal.Malformed({message})`, `EntryNotDecodable({ index, refusal })`, plus the sequence refusals | yes | BEH-QD-254 | `Retention.test.ts` / `AuditEntry.test.ts` (entry level only) |
| 14 | devtools `Source.ts:241-246` `decodeFrame` | SSE frame text | via #6 | `onMalformed` callback, record skipped | internal (`sourceFromEventSource` public) | BEH-QD-311, ADR-QD-047 | `Source.test.ts` |
| 15 | devtools `ExplorerSession.ts:288` | typed text | via #1 | `formatDecodeFailure` (`:123-139`) **reads `SchemaError.issue`** to print `at <path>: <message>`; a dedicated sentence for `PolicyDecodeTooDeep` | internal | WZ-01 | `ExplorerSession.test.ts:544` |
| 16 | http `PortRoutes.ts:82-85` `questionOf` (`request.json`), `RemotePorts.ts:57-60` (`response.json`) | request / response body | via #7 and #9 | `undefined` body becomes a malformed-question refusal; reply `Undecodable` | public routes | BEH-QD-330/331 | `PortRoutes.test.ts` |

Not seams (checked, leave alone): `core/src/PortSpanEncode.ts:56-59` decodes tracer span attributes the process wrote itself; `devtools/src/model/SimulationForm.ts:70` `JSON.parse`s text the reviewer typed into the dock (its recursive `sameJson` is a self-inflicted case, not a trust boundary); `@qadi/promise`, `predicate-sql`, `predicate-prisma`, `testing`, `http` (beyond #16) hold no JSON decode.

**Gaps the review missed (G1-G3, all HIGH):**
- **G1.** The port-wire depth guards (#7, #8, #9) have no test deeper than the bound. `PortConformance.test.ts:460-467` feeds a 200-deep object, which is under 256 and is refused by `onExcessProperty` anyway, so it does not prove the guard. A mutant deleting `exceedsJsonDepth` at `PortWireEncode.ts:120/138` or `PortRemote.ts:151` is unkilled by depth.
- **G2.** The hydration envelope-level guard (`HydrationEngine.ts:440`) has no test; `HydrationPayload.test.ts` has no depth case.
- **G3.** `PolicyFromJson` (#3) is public and unguarded.

**Coupling that must be preserved.** `MAX_DECODE_DEPTH` is 4x `DEFAULT_MAX_DEPTH` and its comment (`Policy.ts:960-978`) records that the bound was lowered from 8x to 4x *because* `onExcessProperty: "error"` forces the slow decoder path that overflows the stack around 430-440 levels. The options and the depth bound are one calibration. Keeping them in one module is the point.

### Table stakes (phase is not done without these)

| Behaviour | Why | Complexity | Notes |
|-----------|-----|------------|-------|
| One module owns "(parse) -> depth guard -> strict decode" and returns a closed refusal over `unknown` and text | The stated goal; a new seam gets the guard by default | MEDIUM | Sync `Result`, not `Effect`: seams #4-#13 are sync `Result` or `Option`; the Effect seams (#1, #2) adapt it. Decoders stay built once at module scope (hot path; `SinkCodec.ts:423` does this today). |
| The refusal carries enough for every seam's existing mapping | Mappings differ: `PolicyDecodeTooDeep`, `DecodeRefusal.TooDeep/NotJson/Malformed`, plain string, `Undecodable({message})`, three drop reasons, `ArchiveRefusal` | MEDIUM | `Malformed` must carry the **underlying `SchemaError`/issue**, not only `message`: #15 formats the issue tree and #1's public error channel is `Schema.SchemaError` (BEH-QD-059). A message-only `Malformed` regresses WZ-01 and changes `fromJson`'s observable errors. |
| A projection step between guard and decode | `decodeSinkRecord` guards, checks version, then decodes `envelopeOf(input)` (ADR-QD-096 D-15-c: lenient envelope, strict content) | LOW | Without it SinkCodec cannot move in. |
| A way to guard part of a value | Hydration guards the envelope with `entries` blanked and each entry separately so one hostile entry does not refuse the page (INV-QD-045) | MEDIUM | This is the "guard workaround" that should move inside. Payload-level too deep must stay `MalformedPayload`; entry-level must stay `EntryTooDeep`: one refusal, two reasons by position. |
| Every public refusal and error shape unchanged | `PolicyDecodeTooDeep` (in `QadiError`), `DecodeRefusal` (public closed union; a new arm breaks consumers' `Match.tagsExhaustive`), `RemotePortFailure`, `ArchiveRefusal`, the eight hydration drop reasons | LOW | The new module's `TooDeep` is internal; each seam keeps its mapping. |
| `MAX_DECODE_DEPTH` stays 256 and `PolicyDecodeTooDeep.maxDepth` stays 256 | BEH-QD-059 says the bound "is itself normative" | LOW | |
| `UNTRUSTED_DECODE_OPTIONS` and `exceedsJsonDepth` stay exported from `@qadi/core` (re-export from the new module, or keep the declaration and have the module import it) | Removal is **Breaking** (ADR-QD-099, gate 13); `@qadi/audit` and `@qadi/react` import both from the barrel | LOW | Update `overview.md:116-118` module column. |
| Never throw: no `Effect.orDie`, no try/catch around the decode | `SinkCodec.ts:499-510` doc: "a throw past [the guard] would be a library defect that should stay visible"; AGENTS.md §4 | LOW | |
| Depth tests at every seam, 60,000-deep, including #7, #8, #9, #10 (closes G1, G2) | A guard no test exercises is the defect class this wave removes | LOW | One property test over the module plus one refusal row per seam (the review's own testing win). |
| New invariant: "every untrusted JSON seam is guarded by construction" (reserved INV-QD-305/306) | Today no INV states it (INV-QD-097 covers only the record codec) | LOW | |
| `Policy.ts` sheds the JSON concern | Review win | LOW | `fromJson` / `fromJsonValue` stay in `Policy.ts` as thin mappers (public, `overview.md:132`). |

### Differentiators ("complete" version; the user prefers complete over simple)

| Behaviour | Value | Complexity | Notes |
|-----------|-------|------------|-------|
| Resolve G3: guard `PolicyFromJson`, or mark it unguarded in its doc and spec with a pointer to `fromJson` | Closes the one public unguarded decode path | LOW | Guarding changes its type if it stays a `Schema` codec; a doc-only fix is the cheap option. Decide in the ADR. |
| Make the guard impossible to skip for a new seam at the type level (the module is the only place a decoder is constructed with the options) and enforce with a house-style rule | "A new seam gets the guard by default" becomes a gate, as `UNTRUSTED_DECODE_OPTIONS` outside the module fails `check-house-style.mjs` | MEDIUM | Same pattern as the existing budgets (AGENTS.md §5/§6); a budget needs an exact table and a both-directions check. |
| Audit routes through the module for its own two decodes (`decodeRow`, `decodeEnvelope`) | Removes the last two raw `UNTRUSTED_DECODE_OPTIONS` decoders outside core | LOW | Zero observable change if the guard stays per entry (C1). |
| Port-wire mapping stops being free strings: a typed internal refusal rendered to the same sentences | Lets #7-#9 share one message table | LOW | The strings are observable inside `RemotePortFailure.Undecodable.message`; keep byte-identical or flag. |

### Anti-features (breach an ADR or AGENTS.md)

| Anti-feature | Why | Instead |
|--------------|-----|---------|
| Lifting the audit guard to the whole archive bundle | Silently changes `ArchiveRefusal` for a too-deep entry (C1) | Guard per entry |
| A message-only `Malformed` | Regresses `ExplorerSession.formatDecodeFailure` and `fromJson`'s `SchemaError` channel | Carry the issue |
| Changing `MAX_DECODE_DEPTH`, or splitting the bound from the options | The calibration above | One module |
| Adding an arm to `DecodeRefusal` or the hydration reasons for "TooDeep at payload level" | Public closed unions | Map to `MalformedPayload` as today |
| `Result.try` / `Effect.orDie` around the decode; `as` / `any` to unify the seams' return types | AGENTS.md §4, §6 | Closed union plus adapters |
| `import * as Core from "@qadi/core"` in audit / react | AGENTS.md §1 | Named imports from the root |
| A second, per-package copy of the module | The defect class under repair | One module in core, on the barrel |

**Behaviour changes flagged.** Consumer-visible: none *if* C1 and the `Malformed`-carries-issue rule hold. Package-private only: where `UNTRUSTED_DECODE_OPTIONS` and `exceedsJsonDepth` are declared. Consumer-visible and additive: the new module's exports (a cross-package module must be on the barrel, ADR-QD-099), `@qadi/core` minor. Breaking only if an existing export is removed.

**Dependencies:** `DecodeDepthGuard.ts`, `Policy.ts`, `SinkCodec.ts`/`SinkWire.ts`, `PortWireEncode.ts`, `PortRemote.ts`, `@qadi/react` `HydrationEngine.ts`, `@qadi/audit` `AuditEntry.ts`/`AuditArchive.ts`. Import-cycle care: `Policy.ts` imports `DecodeDepthGuard.ts` today; if the new module imports `Policy` (for the schema) while `Policy.ts` imports it back, that is a madge cycle (ADR-QD-037); keep the module schema-agnostic (takes the decoder) so it stays a leaf.

---

## Phase 31: a shared computation's reset supersedes its claims

### Today's behaviour (`core/src/SharedComputation.ts`, `core/src/DecisionCache.ts`)

- `SharedComputation.reset` (`:371-374`) only empties `inFlight`. Claims already running keep settling their waiters (doc `:60-66`).
- `forget(key, entry)` (`:96-101`) removes a claim only if it is still the one at `key` (identity check), so a stale finalizer never unclaims a fresh claim.
- The `abandoned` flag (`:78-83`, set at `:178`, read at `:343`: `if (!entry.abandoned) settle(exit)`) already means "answer the waiters, skip `settle`". Today only the last-leaver sets it.
- `DecisionCache` keeps `generation` (`:231-238`), reads it when a claim is made (`claim` hook, `:241-243`), and compares in the settle (`:246-251`, `myGeneration === generation`). `clear` (`:292-302`) is four steps: `entries = ∅`, `insertionOrder = ∅`, `shared.reset()`, `generation += 1`.
- Observable `clear` behaviour (`DecisionCache.ts:79-97` doc, `DecisionCache.test.ts:749-880`): a compute in flight is **not cancelled** and still answers the fibers already waiting; its answer never re-enters the cache; a new ask after `clear` computes fresh instead of coalescing onto the old compute; a third ask coalesces onto the fresh compute, not a third compute (`:820-880`, the identity-checked `forget` mutant).
- `DecisionCache` is `makeSharedComputation`'s **only** adapter (`grep` over `packages/*/src`). `reset` is package-private; `clear` is public (`DecisionCacheShape.clear`, BEH-QD-190 at `25-inspection.md:59`).
- Specs: BEH-QD-190 states `clear` "MUST NOT cancel a compute in flight" and nothing else about staleness. **No BEH or INV states "a stale answer never re-enters a flushed cache" or "a post-clear ask claims afresh"**: those live only in the doc comment and the tests. BEH-QD-439 (`21-decision-cache.md:289`) and INV-QD-025 (`invariants.md:949`) cover abandonment. ADR-QD-132 is the decision this extends.
- Tests: `SharedComputation.test.ts:318-352` already pins reset at module level (fresh claim after reset, stale exit does not remove the fresh claim, third ask joins the fresh one) but its harness uses `claim: () => () => {}`, so it **cannot** assert "stale settle is skipped"; the comment says that is "the adapter's call". The harness at `:23-36` already records `settled`.

### Table stakes

| Behaviour | Why | Complexity | Notes |
|-----------|-----|------------|-------|
| `reset` marks every forgotten claim superseded; the stale claim still answers its waiters (value or failure) and does **not** call `settle` | The rule moves from the adapter into the module (the phase's goal) | LOW | Reuse the existing `abandoned` path (`:343`). |
| `DecisionCache`: `generation` and `myGeneration` deleted; `clear` becomes three steps (`entries`, `insertionOrder`, `reset`) | Review win | LOW | The `claim` hook no longer needs to read state "in the same step"; its comment at `SharedComputation.ts:~299` changes. |
| Unchanged: `clear` does not cancel a running compute; `size` is 0 after a clear mid-compute even when the stale compute finishes last; a post-clear ask is a `miss`; metric order and outcomes (`onOutcome`) unchanged | BEH-QD-190, INV-QD-025, BEH-QD-166 (no double insertion-order append) | LOW | All pinned by `DecisionCache.test.ts:749-880`; keep them green untouched. |
| The last waiter leaving a superseded claim still interrupts its fiber and does not remove the fresh claim | `awaitShared` (`:171-182`) + `forget`'s identity check | LOW | Easy to break if `abandoned` is overloaded: a superseded claim that later loses its last waiter must still call `Fiber.interrupt`. Consider a separate `superseded` flag, or document why one flag is enough. |
| A module-level test: stale claim answers its waiters, writes nothing (`settled` empty for it), fresh claim settles once | "clear-mid-compute races testable without `evaluate`" | LOW | Extend `SharedComputation.test.ts:318` (assert on `settled`, not only runs). Add tests at the new seam before deleting the old ones (PROJECT.md mutation rule). |
| Restate: ADR-QD-132 extension (reserved ADR-QD-144), BEH-QD-439 gains "reset supersedes", INV-QD-025 Enforcement | Spec is normative | LOW | |

### Differentiators

| Behaviour | Value | Complexity | Notes |
|-----------|-------|------------|-------|
| A new BEH sentence under BEH-QD-190 stating the staleness rule (stale answer never re-enters, new ask claims afresh), which has no requirement today | Closes the "rule exists only in a doc comment" gap | LOW | Public behaviour of a public method (`clear`). |
| Property test over interleavings of `run`, `reset`, settle and leave with a model | The rule is a small state machine | MEDIUM | Optional; the existing racing tests are example-based. |

### Anti-features

| Anti-feature | Why |
|--------------|-----|
| Cancelling in-flight computes on `clear` | BEH-QD-190 forbids ("housekeeping must not become a source of failures") |
| Waiters of a superseded claim receiving anything but its exit | BEH-QD-439 |
| `Effect`-wrapping `reset` | It must be callable inside `clear`'s one synchronous `Effect.sync` step (`SharedComputation.ts:60-66`) |
| A second adapter or a public `SharedComputation` | Package-private by design; ADR-QD-132 |

**Behaviour changes flagged.** None consumer-visible. Pure internal restructure; `clear`'s contract is identical. `@qadi/core` patch (or no changeset if the changeset policy treats it as internal; follow ARCH-68 precedent, which was a patch).

**Dependencies:** none outside `core/src`. Independent of 30 (no shared files). Mutation: `SharedComputation.ts` and `DecisionCache.ts` mutants must not fall.

---

## Phase 32: evaluation options and services stated once, in a leaf

### Today's behaviour

- `EvaluateOptions extends QuestionOptions` (`Evaluate.ts:26-69`) adds `concurrency` and `evaluationId`, with long doc comments (ADR-QD-026, ADR-QD-012).
- `LifecycleOptions` (`Lifecycle.ts:60-65`) restates exactly those two fields. `Lifecycle.tst.ts` pins `EvaluateOptions = QuestionOptions & LifecycleOptions` in both directions (`:14-21`); `traceability.md:470` cites that file. Reason stated there: importing `EvaluateOptions` into `Lifecycle.ts` would add a type-only edge, but `Evaluate.ts` already imports `Lifecycle.ts` (`:17`) so that would be a cycle.
- `EvaluationServices = CurrentSubject | EvaluationId | PortServices` (`Evaluate.ts:77`), `StandingEvaluationServices = Exclude<…, CurrentSubject>` (`:94`). `Lifecycle.ts:206-209` spells the union out again: `ask(...)`'s requirement is `CurrentSubject | EvaluationId | PortServices`, and its options are `QuestionOptions & LifecycleOptions`.
- `evaluate = Effect.map(ask(policy, options), (asked) => asked.decision)` (`Evaluate.ts:107-111`); `decide = evaluate` (`Qadi.ts:222-226`, ADR-QD-104 fixes `decide`'s surface).
- All three names are **public** (`overview.md:162,176,177`, barrel `export * from "./Evaluate.ts"`, `index.ts:18`). `LifecycleOptions`, `Lifecycle.ts`, `decideQuestion`, `ask` are not on the barrel (no `Lifecycle` in `index.ts`); `ask` is imported by `Evaluate.ts:17` and `Qadi.ts:31` only.
- Importers of the types: `Qadi.ts:29` (`EvaluateOptions`, `EvaluationServices`; `EnforceOptions extends EvaluateOptions` at `:98`), `GuardHealthCheck.ts:30`, `SubjectSet.ts:35`, `EvaluationServicesNone.ts:40` (`StandingEvaluationServices`), `@qadi/http` (`StandingEvaluationServices`, `EvaluationServices`), `@qadi/promise` (`FacadeOptions extends EvaluateOptions`, `promise/src/index.ts:66`), `@qadi/react` `QadiAtoms.ts:22,60`, `@qadi/testing` `QadiReviewLayer.ts:9,29`, `@qadi/devtools` `SimulationInput.ts:21,106`, `features/step-definitions/Bridge.ts:33`.
- `Question.test.ts:6-31` holds the QuestionOptions/EvaluateOptions classification as a type plus a differential test over `keyof EvaluateOptions`.
- **Feasibility (verified, C5):** `Question.ts` currently imports only `AuthSubject`, `Policy`, `Resource` (`:9-12`); adding type imports of `CurrentSubject`, `EvaluationId`, `Ports` leaves `pnpm circular` green in a scratch copy.

### Table stakes

| Behaviour | Why | Complexity | Notes |
|-----------|-----|------------|-------|
| `EvaluateOptions`, `EvaluationServices`, `StandingEvaluationServices` declared once in a leaf (`Question.ts` is viable; a new leaf is the alternative) | Goal | LOW | If `Question.ts`: it is already a public module, so the names reach the barrel there; `Evaluate.ts` then keeps the public name by re-export. Two `export *` paths to one symbol: verify TS accepts it (no TS2308); if not, drop the `Evaluate.ts` re-export and update `overview.md` rows only. |
| `LifecycleOptions` deleted; `Lifecycle.ts` uses the leaf's `EvaluateOptions` and `EvaluationServices` | Goal | LOW | `ask`'s signature becomes `(policy, options?: EvaluateOptions) => Effect<Asked, EvaluationError, EvaluationServices>`. |
| `Lifecycle.tst.ts` deleted or reduced; `traceability.md:470` row updated in the same change | Its claim (two types agree) is vacuous once there is one | LOW | Keep a pin that `EvaluateOptions` has exactly `QuestionOptions` plus `concurrency | evaluationId` (the `Question.test.ts` classification already does most of this). |
| `pnpm circular` green; no new type-only edge cycles | ADR-QD-037 counts type-only edges | LOW | Run it; do not trust the scratch result alone. |
| Public type identity unchanged for consumers: `EvaluateOptions`/`EvaluationServices` resolve to structurally identical types; no consumer code edit | Gate: `@qadi/promise`, `@qadi/http`, devtools, react, testing all compile untouched | LOW | `pnpm typecheck` across packages is the check. |
| ADR-QD-105 (keeps the Lifecycle split) and ADR-QD-037 respected; ADR-QD-145 reserved, may go unused | Context | LOW | An amendment to ADR-QD-100 (a question is asked once) is more natural than a new ADR. |

### Differentiators

| Behaviour | Value | Complexity | Notes |
|-----------|-------|------------|-------|
| Keep the full doc comments for `concurrency` and `evaluationId` with the type in the leaf; `Evaluate.ts` shrinks to the public `evaluate` | One place to read the options | LOW | |
| Drop `Evaluate.ts`'s `evaluate = map(ask, .decision)` indirection only if it genuinely simplifies reading the pipeline | The review's "two pass-through modules" | LOW | **Do not** touch `decide` (ADR-QD-104). `evaluate` is public and ubiquitous; leave it. |

### Anti-features

| Anti-feature | Why |
|--------------|-----|
| Removing or renaming a public name (`EvaluateOptions`, `EvaluationServices`, `StandingEvaluationServices`) | Breaking (ADR-QD-099, gate 13); only the declaring module moves |
| Merging `Lifecycle.ts` back into `Evaluate.ts` | ADR-QD-105 keeps the split |
| Hand-listing the services union in a third place; `as` casts to unify the two option shapes | The restated fact this phase removes |

**Behaviour changes flagged.** None consumer-visible. Runtime behaviour identical; type names and structure identical. Docs-only churn in `overview.md` module column and the website glossary if it names `Evaluate.ts`.

**Dependencies:** `Question.ts` ← `Evaluate.ts`, `Lifecycle.ts`, `Qadi.ts`, `GuardHealthCheck.ts`, `SubjectSet.ts`, `EvaluationServicesNone.ts`; `Ports.ts`, `CurrentSubject.ts`, `EvaluationId.ts` (type-only). Do this **before** Phase 33 only if Phase 33's sealed layer wants `EvaluationServices` from the same leaf; otherwise independent.

---

## Phase 33: one sealed evaluation layer for review and simulation

### Today's behaviour: who shadows what

| Concern | `qadiReviewLayer` (`testing/src/QadiReviewLayer.ts:145-165`) | `simulationLayer` (`devtools/src/model/Simulation.ts:85-105`) |
|---------|------|------|
| Ports | `fixturePortsLayer(options.ports)` | `portsOf(options.source, input)` (`SimulationSource.ts:96`): Fixtures calls `fixturePortsLayer(setupsOf(input))` (`:122`); Snapshot replays; Live passes the host's ports |
| Evaluation ids | `evaluationIdSequential(options.idPrefix ?? "eval")` | `evaluationIdSequential("sim")` (prefix is **not** asserted by any devtools test; `grep` finds `eval-1` only in `testing/test/TestLayers.test.ts:78,191`) |
| Clock | `clockLayer(options.clock)`: `"test"` -> `TestClock.layer()`, `"live"` or absent -> `Layer.empty` | `clockLayer(options.clock ?? "live")`: `"deterministic"` -> `TestClock.layer()`, `"live"` -> `Layer.empty` (identical shape, different literal) |
| Subject | none (`qadiTestLayer` adds `currentSubjectLayer` on top, `QadiTestLayer.ts:17`) | always `currentSubjectLayer(subjectOf(input.subject))` |
| `DecisionSink` | **not provided, not shadowed**: an ambient sink records review/test evaluations | shadowed by `Layer.succeed(DecisionSink, { record: () => Effect.void })` (`:100`) |
| `DecisionCache` | **not provided, not shadowed**: an ambient cache is read and written | shadowed by a private `decisionCacheLayer()` (`:104`) |

Tests, by what they assert:
- Simulation pins the seal: `Simulation.test.ts:~110-135` ("writes nothing, even with a real sink in scope"; "does not touch a cache in scope"), `SimulationSource.test.ts:150-175` (a Live and a Snapshot simulation write no record), clock wiring `Simulation.test.ts:240-275`. Spec: INV-QD-042 (`invariants.md:1694`, Source names `Simulation.ts`'s `simulationLayer`), BEH-QD-219, ADR-QD-050 Rev 1.4 (`:124`: "The simulator cannot reach `@qadi/testing`").
- Review pins **nothing** about sink or cache. `TestLayers.test.ts` covers ids (`:78,85`), fail-closed defaults, ports, clock (`:160-215`), signature scoping.
- A third copy exists in test scope: `core/test/helpers.ts:30-45` `testLayer` (ports + sequential ids, "cannot depend on `@qadi/testing`"), and `EvaluationServicesNone` (`core/src/EvaluationServicesNone.ts`, `EvaluationIdLive`: random ids, not a copy).
- Public surface involved: `qadiReviewLayer`, `qadiTestLayer`, `QadiTestServices`, `TestLayerOptions.clock: "live" | "test"` (testing, public) and `SimulationClock = "live" | "deterministic"`, `SimulationOptions` (devtools, public). `LiveSource` is `Layer<Exclude<EvaluationServices, CurrentSubject | EvaluationId>>` (INV-QD-042).
- `devtools` has `@qadi/testing` only as a **devDependency** (`package.json:60`); `src` must not import it (ADR-QD-050).

### Table stakes

| Behaviour | Why | Complexity | Notes |
|-----------|-----|------------|-------|
| One layer builder in `@qadi/core` taking `{ ports, idPrefix, clock, sealed }` (names are the phase's), consumed by both | Goal | LOW-MEDIUM | A module both `@qadi/testing` and `@qadi/devtools` import is a **new public `@qadi/core` export** (ADR-QD-099: out of the barrel means not importable). `@qadi/core` minor; `overview.md` row; changeset. |
| The shadowing rule is **stated**: INV-QD-042 amended (new Source: the core module) and a BEH sentence for the review layer | The review's one non-negotiable ask | LOW | |
| Simulation still shadows sink and cache in every source mode (INV-QD-042 unchanged in meaning); all `Simulation.test.ts` / `SimulationSource.test.ts` seal tests pass untouched | Fabricating audit rows from a debug panel is a defect | LOW | |
| Review's decision about the sink and cache is explicit and tested | Today it is accidental | LOW | See the decision below. |
| Public option vocabularies unchanged: `"test"` and `"deterministic"` stay each package's own names, mapped onto the core clock option inside each consumer | Renaming a public literal is Breaking | LOW | |
| The `"sim"` id prefix preserved and now asserted by a devtools test | Currently unpinned; a refactor could change it silently | LOW | |
| Devtools still does not import `@qadi/testing` from `src` | ADR-QD-050 | LOW | |

### The decision the phase must make (and a recommendation)

Should `qadiReviewLayer` shadow the sink and cache? **Recommend no, and make it a parameter of the shared builder (`sealed: false` for review, `true` for simulation).**
- Shadowing in the review layer is **consumer-visible and breaking in practice**: a test that provides an ambient sink or cache **outside** the review layer to observe records (the natural way to test a sink) would see nothing, because the innermost provide wins (Effect semantics, AGENTS.md note in `QadiReviewLayer.ts:77-90`); with `Layer.mergeAll` the winner depends on argument order. No repo test pins it, so a regression would be silent.
- "A review query is asked by nobody" (`QadiReviewLayer.ts:127`) argues the reverse for production `decideSubjects`, but `qadiReviewLayer` is a *test* fixture.
- This is the layered, complete shape the user prefers: one builder, an explicit seal switch, the rule in one place.

### Differentiators

| Behaviour | Value | Complexity | Notes |
|-----------|-------|------------|-------|
| Re-point `core/test/helpers.ts` `testLayer` at the builder (the third copy) | Removes the hand-copy the file itself apologises for | LOW | Test-scope only. |
| A conformance test asserting `qadiReviewLayer` and `simulationLayer` agree on ids, clock and fail-closed ports for identical inputs | Locks the shared half | LOW | |

### Anti-features

| Anti-feature | Why |
|--------------|-----|
| Making `@qadi/devtools` depend on `@qadi/testing` | ADR-QD-050 |
| Unifying `TestLayerOptions.clock` and `SimulationClock` literals | Public, Breaking |
| Shadowing sink/cache in `qadiReviewLayer` by default | Silent consumer breakage (above) |
| Moving `CurrentSubject` into the sealed layer | INV-QD-042: the subject is the thing simulated; `LiveSource` excludes it by type |
| `Layer.mergeAll` past ~90 arguments (AGENTS.md §3 gotcha) | n/a here but note if the builder grows |

**Behaviour changes flagged.** Consumer-visible only if the review layer is made to shadow (recommended against). Additive: one new public `@qadi/core` export. Internal: Simulation's layer composition.

**Dependencies:** `fixturePortsLayer`, `evaluationIdSequential`, `currentSubjectLayer`, `decisionCacheLayer`, `DecisionSink` (core), `TestClock`. `spec/traceability.md:71` lists `QadiReviewLayer.ts` under behaviour 29: add the new core file to that row and the INV-QD-042 Source. Mutation baseline: `Simulation.ts` is small; keep its score.

---

## Phase 34: diagnostics as the dock model's seventh store

### Today's behaviour: every input and output

**Inputs (public, `devtools/src/react`):** `DevtoolsDockProps.diagnostics?: DiagnosticsDockOptions` and `.reading?: DiagnosticsReading` (`DevtoolsDock.tsx:92-117`); `useDiagnostics(options?)` is a public export (`react/index.ts:21`, pinned in `surface.test.ts:71`). `DiagnosticsDockOptions` (`useDiagnostics.ts:33-55`): `layer?: Layer<never, unknown>`, `collector?: PortCallCollector`, `questions?: () => ReadonlyArray<AskedQuestionLike>`, `intervalMillis?: number`.

**Model-level public exports (`devtools/src/index.ts:27-37`):** `makeDiagnosticsStore`, `mergeReading`, `noDiagnostics`, `runDiagnostics`, types `Diagnostics`, `DiagnosticsOptions`, `DiagnosticsReading`, `DiagnosticsStore`. `WiringRead` too. `makeDockModel`, `DockModel`, `DockModelInputs` are **package-private** (BEH-QD-465), so adding model fields changes no public surface.

**Output:** `Diagnostics` = `{ wiring: WiringRead, activity, hydration | undefined, portCalls | undefined, questions | undefined }`, rendered by the Services panel (`wiring`, `activity`, `portCalls`) and the React panel (`questions`, `hydration`) in `DevtoolsDock.tsx:289-306`.

**How it runs today:**
- `DevtoolsDock` (`:148-154`) calls `useDiagnostics(diagnostics)` **before** the model exists, then `useMemo(mergeReading(sampled, reading), [sampled, reading])`, so "supplied wins per field" lives in the view. `mergeReading` returns `sampled` itself when `reading === undefined` (identity preserved, `DiagnosticsStore.ts:~120`).
- `useDiagnostics` (`useDiagnostics.ts:68-93`): one `makeDiagnosticsStore()` held in `useState` (so the **reading survives restarts and Activity hide/show**); `run` is `undefined` when `options === undefined` (nothing runs and the hook returns the constant `noDiagnostics` even though the store may hold a stale reading); otherwise `runDiagnostics(store, { layer?, collector?, questions?, schedule: Schedule.spaced(intervalMillis ?? 2000) })`.
- **Restart rule** (`useRunningStore.ts:23-42`, deps at `useDiagnostics.ts:85-91`): `[options === undefined, layer, collector, questions, intervalMillis]` by identity, never the options object. The effect forks `Effect.runFork(run)` and cleans up with `Effect.runFork(Fiber.interrupt(fiber))`. The `run` itself is deliberately not a dep; `eslint-disable react-hooks/exhaustive-deps` at `:40-41`.
- `runDiagnostics` (`DiagnosticsStore.ts:~183-215`): builds the layer **once per run** in the run's scope, releases on interrupt (BEH-QD-323); a build failure is `WiringRead.Failed` and the other reads keep sampling; `Effect.repeat(sample, schedule)` samples once at start, then per step; `accept` keeps each field's reference when `Equal.equals`.
- `useRunningStore` is also used by `useTimeline` (`useTimeline.ts:52`, with a real run) and, with a constant `undefined` run, by `useDockSnapshot` (`useDockSession.ts:14-15`), `useExplorerSnapshot` and `useHeldChoiceSnapshot` (`useExplorerSession.ts:15-21`). That is Phase 26 IN-01 (still true).
- `DockModel` (`DockModel.ts:48-70, 117-150`): stores `timeline, dock, explorer, roles, simulation`, `sightings()`; `configure` dispatches only identity-changed inputs; the source read already runs on a `FiberHandle` in the model's scope (`:99-103`).
- Hide/show of the dock in a React `Activity` **rebuilds the model** (pause returns to live, backlog re-read), accepted in BEH-QD-465 and 26-UI-SPEC. Diagnostics is **not** inside that today, so its reading survives; moving it in changes that.
- Callers of the dock's diagnostics props: `examples/nextjs-newsroom/src/client/{Dock,Counters,atoms}.tsx`, `examples/nextjs-newsroom/test/dock-wiring.test.tsx`, `@qadi/react` `DevtoolsFeed.ts` (`useDevtoolsFeed()` returns `diagnostics: Extra & { layer, questions }`, spreadable onto the dock), `features/features/devtools-screens/*`, website `docs/packages/devtools.md`, `react/hooks.md`, `reference/upgrading.md`.
- Specs: BEH-QD-323 (`28-devtools-screens.md:572`, title already says "sampled by the model"), BEH-QD-465/466 (`:827,918`), ADR-QD-047 Rev 1.12, INV-QD-296, INV-QD-107. BEH-QD-465 and ADR-047 1.12 never mention diagnostics, so the review is right that this is an omission.
- Tests: `useDiagnostics.test.tsx` (5 React-only cases: fills after mount, starts nothing without options, finalizer on unmount, no restart on equal literal, restart on new layer); `DiagnosticsStore.test.ts:59-400` (store identity rules, `runDiagnostics` under `TestClock`, `mergeReading` 17 cases); `DevtoolsDock.test.tsx:752-1210` (reading/diagnostics merging through the DOM; inline `reading={{…}}` literals at `:752,796,1032`); `DockModel.test.ts` M1-M17 and P1.

### Table stakes

| Behaviour | Why | Complexity | Notes |
|-----------|-----|------------|-------|
| `DockModelInputs` gains `diagnostics` and `reading`; `configure` dispatches by identity **per field** (`layer`, `collector`, `questions`, `intervalMillis`), never the options object | BEH-QD-323 and the existing restart rule; an inline literal must not tear the layer down (`useDiagnostics.test.tsx:79`) | MEDIUM | |
| The poll runs on a `FiberHandle` in the model's scope; a changed field supersedes (interrupts, releases the old layer, starts a new run); `diagnostics` going `undefined` stops it; scope close ends it and releases the layer | Mirrors the source read (`DockModel.ts:99-103`) and ADR-QD-137 | MEDIUM | Old layer released before or concurrently with the new build: `useDiagnostics.test.tsx:109` asserts both happen. |
| The model exposes the **merged** reading as a store with today's identity rules: the same snapshot while neither the sample nor the supplied reading changed; each field keeps its own reference; `mergeReading` stays public and is the one place the rule lives | `useSyncExternalStore` re-render cost; BEH-QD-323 | MEDIUM | A host that passes a fresh `reading` literal each render must not cause a render loop (`DevtoolsDock.test.tsx:752`). Publishing happens in the parent's layout effect and only `DockFrame` subscribes, so no loop, but dedupe per field (`Equal.equals`) so unchanged content does not publish. |
| Public `useDiagnostics` stays, as an adapter for hosts without the dock, with the same four-field restart rule | Public export, `surface.test.ts:71`, `DevtoolsFeed.ts` doc | LOW | It may reuse the same `runDiagnostics`; it can no longer be the dock's mechanism. |
| Three snapshot hooks merge into one reader (`useSyncExternalStore` directly); `useRunningStore` keeps only `useTimeline`'s and `useDiagnostics`'s real runs | Resolves Phase 26 IN-01 | LOW | |
| The hand-written deps list and the `eslint-disable` in `useRunningStore`/`useDiagnostics` are gone from the dock path | Review win | LOW | |
| Model tests under `TestClock` with no render: restart on each field, no restart on a new options object with equal fields, `undefined` stops it, scope close releases the layer, `reading` merge precedence incl. explicit empty list, identity preservation | The headless win | MEDIUM | Move the `useDiagnostics.test.tsx` cases that only the model decides; keep the three only React can get wrong (mount, unmount, no restart on equal rerender). `DockModel.ts` mutation score is 100; do not lower it. |
| ADR-QD-047 amendment (Rev 1.13; reserved ADR-QD-147 may go unused as ADR-138 did), BEH-QD-465 gains the seventh store, BEH-QD-323 restated, INV-QD-296 extended | The omission is the finding | LOW | |

### Decisions the phase must make (flag; not table stakes either way)

| Question | Today | Options |
|----------|-------|---------|
| Reading across a hidden `<Activity>` | survives (store in `useState`) | accept a reset (consistent with the model rebuild, BEH-QD-465), or hold the diagnostics store outside the rebuilt model. Consumer-visible: the Services/React panels would show "nothing read" until the first sample (up to `intervalMillis`, default 2,000 ms, `DiagnosticsStore.ts:~170`) after a re-show. |
| `diagnostics` going `undefined` then defined again | returns `noDiagnostics` while undefined; on re-enable the store still holds the **stale** last reading until the first sample | reset to `noDiagnostics` on `undefined` (cleaner), or keep (today). Pin whichever. |
| When the poll starts | on the dock's first mount, before the model exists | at model build (one render later). Invisible except in ordering tests. |

### Differentiators

| Behaviour | Value | Complexity | Notes |
|-----------|-------|------------|-------|
| `useDiagnostics` becomes a thin adapter over the same scoped runner (`useScoped`), so the hook and the dock share one mechanism | One restart implementation | MEDIUM | `useScoped` exists (`react/useScoped.ts`). |
| `DockModel` exposes `diagnostics` as a `{ subscribe, getSnapshot }` store typed like the others | Consistency with the "six stores" statement | LOW | |

### Anti-features

| Anti-feature | Why |
|--------------|-----|
| Moving gates into the diagnostics store | They are pushed by the host's registry subscription and stay a plain prop (AGENTS.md §13; `DiagnosticsStore.ts` header) |
| Making sampling push-based or adding writes to the evaluation hot path | BEH-QD-216, ADR-QD-052 |
| Removing or renaming `useDiagnostics`, `mergeReading`, `runDiagnostics`, `DiagnosticsDockOptions` | Public; Breaking |
| Decisions or the diagnostics reading in React state | AGENTS.md §13 (the registry bullet) |
| A `dispose`/`read` command on the model | BEH-QD-465 ("the scope is the lifetime") |
| `Effect.runFork` of the poll from a component | The thing being removed |

**Behaviour changes flagged.** Consumer-visible only through the Activity-reset decision above and the one-render start delay. Everything else is identical by test. `@qadi/devtools` patch (as ARCH-74).

**Dependencies:** `DockModel.ts`, `useDockModel.ts`, `DevtoolsDock.tsx`, `DiagnosticsStore.ts`, `useDiagnostics.ts`, `useRunningStore.ts`, `useDockSession.ts`, `useExplorerSession.ts`, `Wiring.ts`, `Hydration.ts`, `PortCalls.ts`. It touches `DevtoolsDock.tsx` (Phase 36's 26 IN-02 `nothing`) and the three snapshot hooks (26 IN-01): sequence 36 after 34 and re-verify.

---

## Phase 35: the atom set owns its eviction sweep (speculative; opens on a spike)

### Today's behaviour: every caller and pin

| What | Where |
|------|-------|
| `maxTrackedQuestions` option, default 500 | `QadiAtoms.ts:190-234` (`DEFAULT_MAX_TRACKED_QUESTIONS`), passed as `capacity` at `:340`; validated positive integer at `QuestionBook.ts:120-122` (error text names `maxTrackedQuestions`); `QuestionBook.test.ts:235` |
| `sweepEvictions: Effect<void>` on the public `QadiAtoms` interface | `QadiAtoms.ts:166` (doc `:131-166`), implemented `:360` as `Effect.sync(book.sweep)`; spec `09-react.md:73`; `25-inspection.md:777` |
| The only src caller: the provider's `useEffect` forking `Effect.repeat(atoms.sweepEvictions, Schedule.spaced(sweepIntervalMillis))` | `QadiProvider.tsx:343-349` (runs the sweep once at fork, then every interval); prop `sweepIntervalMillis` `:193,228` (default `DEFAULT_SWEEP_INTERVAL_MILLIS = 30_000`, `:130`) |
| Tests pinning the sweep | `QadiAtoms.test.ts:379-520` (six cases, call `Effect.runSync(set.sweepEvictions)` directly: across an invalidation, across a recompute, FIFO among cold, never a mounted one); `QadiProvider.test.tsx:298-345`: "periodically evicts cold questions in the background" and "stops sweeping once the provider unmounts" (**asserts the atom set stays over the bound after unmount: `:340-345`, "No provider is mounted any more to fork a sweep fiber"**); `QuestionBook.test.ts` (book rules without atoms) |
| No other callers | `grep` across `packages/*`, `features`, `examples`, website: none use `sweepIntervalMillis`, `maxTrackedQuestions` or `sweepEvictions` outside the files above and spec |
| Specs | INV-QD-105 (`invariants.md:3167`), ADR-QD-103 (`:77`: "The provider's first sweep runs after its children have rendered and retained their questions"), ADR-QD-014, AGENTS.md §13, `spec/process/house-rules-evidence.md` §4 (CCR-QD-150) |
| The constraint that makes the mechanism hard | `QuestionBook.ts` header: `sweep` "runs on its own fiber, so it can never observe the momentary zero of a question a registry still holds" (a recompute disposes the reader's lifetime and re-reads synchronously, `NodeImpl.invalidate`, pinned by `v4-reactivity-smoke.test.ts`); re-admission lets a swept entry whose atom a registry still holds come back (`QuestionBook.ts` "Re-admission") |
| Verified facts for the spike | `Atom.runtime(layer)` uses the default factory whose `memoMap` is `removeTtl(make(() => Layer.makeMemoMapUnsafe()))` (`node_modules/effect/src/reactivity/Atom.ts:896`), i.e. a **per-registry** memo map, so a layer built under `atoms.runtime` is built once per registry and is torn down with it. One atom set can run under several registries (each provider creates its own, `QadiProvider.tsx:241`). |

### Table stakes

| Behaviour | Why | Complexity | Notes |
|-----------|-----|------------|-------|
| The phase opens on a spike or `checkpoint:decision` and may conclude "keep it in the provider, but state and test the rule" | Context; mechanism unproven | MEDIUM | The honest-negative outcome must be a valid, fully recorded phase (an ADR stating the rule and a graph-level test that the limit is documented as provider-owned). |
| If a mechanism is adopted: the limit holds wherever the atom set runs (no provider), observable from a graph test with no render | Goal | MEDIUM-HIGH | |
| Never `AtomRegistry`'s `scheduleTask` / `defaultIdleTTL` as the scheduler | AGENTS.md §13, CCR-QD-150: it rerouted dispatch and dropped a required render | n/a | Hard constraint. |
| The sweep stays on a separate fiber from any dispatch or recompute, so it can never see a momentary zero | `QuestionBook.ts` header, INV-QD-105 | n/a | An inline sweep on `book.open` would run inside `decisions`' derived atom compute (`QadiAtoms.ts:~345`, `decision(...)` called from a family atom), possibly inside a synchronous dispose-and-reread: **disqualifying** unless proven otherwise. |
| First sweep still runs after the first render's readers have gone live (ADR-QD-103) | Otherwise a just-opened cold question is evictable before it subscribes | LOW | Re-admission covers the leak case but not the "same atom while tracked" promise (BEH-QD-065) for a question opened in render and not yet live. |
| No leaked timer: nothing outlives its registry or the process (a module-scope atom set is shared across SSR requests) | A never-ending interval on a module-scope object keeps Node alive and leaks per server process | HIGH | Disqualifies "start a fiber at `makeQadiAtoms`". |
| `sweepEvictions` and `maxTrackedQuestions` stay public and working; `QadiProvider`'s `sweepIntervalMillis` stays accepted (additive move of the interval to `QadiAtomsOptions` is fine; removal is **Breaking**) | Public surface (ADR-QD-099, gate 13); hand-written `QadiAtoms` doubles must still type-check | LOW | |
| `QadiProvider.test.tsx:340-345` ("stays over the bound after unmount") is reconciled explicitly: either it still holds (the sweep dies with the registry) or it is rewritten with the reason | It directly contradicts "limit holds without a provider" read naively | LOW | |
| Several providers or registries over one atom set do not multiply sweeps unboundedly | Current doc: redundant but harmless (idempotent) | LOW | |

### Candidate mechanisms for the spike (hypotheses, MEDIUM confidence, none verified end to end)

| Candidate | Fit | Risk |
|-----------|-----|------|
| A. Append a `Layer.effectDiscard(Effect.forkScoped(Effect.repeat(sweep, spaced)))` to the layer given to `Atom.runtime(layer)` | Scope = the runtime atom's lifetime per registry (per-registry memoMap, above): "while it is mounted"; a qadi-owned fork, no `scheduleTask`; separate fiber | The runtime atom may not be built until a decision atom is read (a registry that never reads runs no sweep; arguably fine); idle-TTL/keep-alive behaviour of the runtime atom unverified; the runtime layer's type (`QadiLayer`) must stay `Layer<StandingEvaluationServices>` |
| B. Sweep-on-`open` (amortised, no fiber) | No lifecycle needed | Likely disqualified: runs in render and possibly in a derived-atom compute, can see the momentary zero (above); the just-opened cold entry could be evicted when all older ones are live |
| C. Keep in the provider; state the rule (limit is provider-owned, off without a provider) and pin it | Zero risk | Does not meet the stated goal; valid per context |
| D. A `Scope`-taking `QadiAtoms.runSweep(scope)` the host calls | Explicit lifecycle | Re-creates the provider's job in the host; not "the atom set owns it" |

### Differentiators

| Behaviour | Value | Complexity | Notes |
|-----------|-------|------------|-------|
| A graph-level test (no render) that eviction holds under a bare `AtomRegistry` | Review's testing win | MEDIUM | `QadiAtoms.test.ts` already builds registries by hand. |
| `sweepIntervalMillis` as an atom-set option (provider prop kept as an override) | One home for the limit and its cadence | LOW | Additive public option. |

### Anti-features

| Anti-feature | Why |
|--------------|-----|
| `scheduleTask` / `defaultIdleTTL` | AGENTS.md §13 / CCR-QD-150 |
| A module-scope timer or `setInterval` | No lifecycle, SSR leak |
| `useState`/`useEffect` for decisions or the sweep in a new place | AGENTS.md §13 |
| Making `maxTrackedQuestions` mean something different (it is a best-effort bound that stops at live entries) | INV-QD-105 |

**Behaviour changes flagged.** Consumer-visible if a mechanism is adopted: an atom set used without a provider starts evicting (today it silently never does); after provider unmount the set may keep or stop sweeping depending on mechanism. Additive public option only. If the outcome is C: no behaviour change.

**Dependencies:** `QadiAtoms.ts`, `QuestionBook.ts`, `QadiProvider.tsx`, `effect/reactivity/Atom` runtime semantics. Independent of 30-34 (react package). Run before 36 so 36 can re-verify.

---

## Phase 36: carried spec debt and stale records (each item verified at HEAD)

| Item | Still true? | Evidence at HEAD | Touched by 30-35? |
|------|-------------|------------------|-------------------|
| Duplicate BEH-QD-219..221 | **yes, worse than stated** (C7) | `spec/behaviors/29-devtools-simulator.md:28/188, 76/236, 127/287`; second copy `:188-348` holds pre-ADR-129 text ("MUST answer the fail-closed default", "A signature request ... MUST fail as `SignatureHistoryUnavailable`") that contradicts BEH-QD-411 (`:349`); first copy `:173` is a `CapturedAnswers` paragraph spliced with a change-history tail (`…CCR-QD-177)<br>1.2 (2026-10-05)…1.0 (2026-08-24) |`). Duplicated since `965ff14c`. | Phase 33 edits INV-QD-042 and BEH-QD-219's Source line: do 36 after 33 |
| `traceability.md` behaviour 29 names `model/Sources.ts` | yes | `spec/traceability.md:71` lists `Sources`; the modules are `Source.ts` (record source, behaviour 28) and `SimulationSource.ts` (already in the same list) | Phase 33 edits this row |
| Stale replay "fail-open undecided" | yes, 2 lines | `.planning/PROJECT.md:225` ("the other four ports undecided"), `.planning/MILESTONES.md:76`; struck already at `STATE.md:212`, `PROJECT.md:49,196` | no |
| 24 IN-01 build() makes and drops a recorder per commit while Live | yes | `SimulationSession.ts:399-401` `build()` calls `prepareSource`; `SimulationSource.ts:236-239` `Live.ready()` runs `capturing(ports)`; `build` uses only `options`, the refusal and the tag | no |
| 24 IN-03 `Ready` spelled twice | yes, three spellings | private `type Ready` `SimulationSource.ts:186`; inline `Extract<PreparedSource, { readonly _tag: "Ready" }>` at `SimulationSession.ts:472` and `:493` | no |
| 24 IN-02 CCR-QD-414 cites README Rev 1.148 | textually yes (`spec/README.md:352`), arguably history (exempt per AGENTS.md §15) | | no |
| 25 IN-01 `BaselineCard` blank sentence | yes | `Simulator.tsx:486,490` (`reading?.matches`, `{reading?.sentence}`) | no |
| 25 IN-02 stale comments in `Simulator.test.tsx` | yes | `packages/devtools/test/react/Simulator.test.tsx:9` and `:415` ("settles synchronously inside `runFork`") | no |
| 26 IN-01 three snapshot hooks pass constant `undefined` run | yes | `useDockSession.ts:15`, `useExplorerSession.ts:16,20` | **Phase 34 resolves it**; drop from 36 |
| 26 IN-02 `DevtoolsDock`'s `nothing` duplicates the model default | yes | `DevtoolsDock.tsx:45` (`nothing`), `:130` (`source = nothing`), stale comment `:41-44` ("`useTimeline` holds its source by identity"); `DockModel.ts:83,121` (`NO_SOURCE`) | **Phase 34 edits this file**; re-verify |
| 26 IN-03 stale "was DevtoolsDock l.N" titles | yes | `DockModel.test.ts` 11 titles (`:182,197,212,254,266,278,296,313,395,616` and M4 `:243`), header `:15-16` ("once this one is green (26-05)") | Phase 34 adds model tests to this file |
| 27 IN-01 GuardRoute wording "the one the module accepts" | yes | `GuardRoute.ts:83-85` (intended referent: `AuthorizeRequest.ts`'s `enforceRequest`) | no |
| 27 IN-02 "lost ARCH-57's probe" typo | yes | `GuardRoute.ts:79-80` | no |
| Stale citation `v4-http-smoke.test.ts:106` (`registerApi`) | yes | comment still says "`PermissionRegistry.ts`'s `registerApi`"; `registerApi` no longer exists in `packages/http/src` (only mentioned in `GuardApi.ts:6`) | no |
| `stryker.http.mjs` comment places code in `PermissionRegistry.ts` | yes | repo-root `stryker.http.mjs:19` ("`PermissionRegistry.ts`'s `addGuardedRoute`"; it is in `GuardRoute.ts` since ARCH-75); `:9` names the `/__permissions` route, now in `PermissionRegistryRoute.ts` | no |
| 28 IN-01 GateWriter header says three re-exported types | yes | `GateWriter.ts:7`; `GateRegistry.ts:47` re-exports four | no |
| 28 IN-02 `{@link useGates}` unresolvable | yes | `GateWriter.ts:164` (the review said `:178`) | no |
| 28 IN-03 INV-QD-064 Source credits `GateWriter.ts` with the key closure | yes | `spec/invariants.md:2654` (Rev bump needed) | no |
| 28 IN-04 ADR-QD-140 overstates test change | yes | `spec/decisions/140-*.md:107` ("the only test edit is one import") | no |
| 28 IN-05 ADR-QD-053 blockquote places `useGates` in `GateWriter.ts` | yes | `spec/decisions/053-a-gate-can-be-found.md:74` | no |
| 28 IN-06 no StrictMode lifecycle test | **partly stale** (C8) | `GateRegistry.test.tsx:489` covers instrumented StrictMode 1-then-0; the identity-changing rerender through `useGateRegistrations` is the only gap | no |
| 29 IN-01 `DENY_WITHHELD` restates `ALLOW_WITHHELD`'s fields | yes | `HydrationEngine.ts:90,96` (`["subjectId","trace"]` vs `["subjectId","trace","obligations","reason"]`) | Phase 30 edits this file: do 36 after 30 |
| 29 IN-02 CCR-QD-419 "six modules re-pointed" / README Rev 1.155 | yes | `spec/README.md:357` | no |
| 29 IN-03 ADR-QD-123 "still imports" | yes | `spec/decisions/123-a-metric-is-declared-once.md:129` | no |

Table stakes: the duplicate-BEH repair (delete the stale second copy, fix `:173`, update the document history), the `Sources.ts` fix, the two stale replay lines, and every item above still true after 30-35 that is pure wording. Differentiators: the 24 IN-01 split (`describeSources` for options and refusal, `ready()` for the run path) is a real, tested code change (LOW-MEDIUM, `SimulationSession.ts` mutation score must hold); the 28 IN-06 narrowed test. Anti-features: re-baselining a mutation score instead of killing a survivor (PROJECT.md decision 28-05); editing historical CCR rows or change-history entries to "fix" them (AGENTS.md §15); renumbering a BEH instead of deleting the duplicate.

**Behaviour changes flagged.** None consumer-visible except 24 IN-01 (internal perf), which is not observable.

---

## Cross-phase ordering constraints (file contention and re-verification)

| Constraint | Reason |
|------------|--------|
| 30 before 36 | 29 IN-01 is in `HydrationEngine.ts`, which 30 edits |
| 33 before 36 | 33 edits `traceability.md:71` and INV-QD-042; 36 edits the same row and file |
| 34 before 36 | 34 resolves 26 IN-01 and edits `DevtoolsDock.tsx` (26 IN-02) and `DockModel.test.ts` (26 IN-03) |
| 32 before or independent of 33 | 33 may import `EvaluationServices` from the new leaf |
| 31, 35 independent | no shared files with the others |
| Every phase | same spec registers (ADR, CCR, BEH, INV, README, traceability): strictly sequential per `_WAVE8-CONTEXT.md` |

## MVP recommendation for the wave

Prioritise, in order of risk-reduction per effort: Phase 30 (closes three real untested or unguarded seams: G1-G3, and the trust-boundary rule), Phase 31 (pure internal, low risk, restates a rule that has no BEH), Phase 34 (completes ARCH-74's stated rule; needs the Activity decision), Phase 32 (low effort, feasibility verified), Phase 33 (small payoff, one real decision), Phase 35 (speculative; budget a spike and accept a "keep in provider, state the rule" outcome), Phase 36 last.

Defer nothing from the table stakes above. Differentiators: take the ones marked LOW; the type-level/house-style enforcement in Phase 30 and the property test in Phase 31 are the "complete" choices the user's preference implies, at MEDIUM cost.

## Sources

All first-party at HEAD `b8b19f6c` (code, `spec/`, tests, `.planning/milestones/v1.2-phases/*-REVIEW.md`), plus one empirical `madge 8.0.0` run on a scratch copy of `packages/core/src` and a read of `node_modules/effect/src/reactivity/Atom.ts`. No web sources. Confidence per claim: HIGH unless marked as a hypothesis (Phase 35 mechanisms, Phase 33 recommendation).
