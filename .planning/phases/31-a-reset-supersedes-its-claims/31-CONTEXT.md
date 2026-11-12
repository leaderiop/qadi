# Phase 31: A reset supersedes its claims - Context

**Gathered:** 2026-11-12
**Status:** Ready for planning

<domain>
## Phase Boundary

`SharedComputation` (package-private, `packages/core/src/SharedComputation.ts`) owns its own staleness rule. `reset` supersedes every in-flight claim in one synchronous step. A superseded claim still answers every waiter, and its compute is still interrupted when its last waiter leaves, but its exit never reaches the adapter's settle. `DecisionCache` (`packages/core/src/DecisionCache.ts`) then keeps no generation counter: `generation`, `myGeneration` and the stale-write check go, and `clear` keeps only the steps the adapter still owns. A stale answer cannot re-enter a cleared cache, and an ask after `clear` computes afresh.

The phase changes no public API. `SharedComputation` is package-private, and `DecisionCacheShape.clear`'s observable behaviour is unchanged. It is a restructuring that moves one rule to its owner, proven by seam tests, a property test and the unchanged `DecisionCache.test.ts` race pins.

Requirements: SUPR-01..05 and WX-01..07. Records: ARCH-79, CCR-QD-422, BEH-QD-491..495, INV-QD-307..308. ADR-QD-144 is reserved and is named Unused.

</domain>

<decisions>
## Implementation Decisions

### Superseded state (checkpoint 1)
- **D-01 One closed standing:** an in-flight claim carries one field, `standing: "Live" | "Superseded" | "Abandoned"`, replacing the `abandoned: boolean`. `onExit` calls the adapter's settle only when `standing === "Live"`. The states are exclusive, so there is no combination of two booleans with no meaning. "Superseded" stays distinct from "Abandoned" (SUPR-01): Superseded means a `reset` made the answer stale; Abandoned means nobody is left waiting.
- **D-02 Transitions:** `reset` moves every claim currently in `inFlight` from Live to Superseded, then empties `inFlight`, all in one synchronous call. The last leaver moves a Live claim to Abandoned. A Superseded claim stays Superseded when its last waiter leaves (it is already out of `inFlight`, so `forget` is a no-op). Nothing ever returns to Live.
- **D-03 Waiters and the interrupt are unchanged:** `Deferred.done(entry.claim, exit)` always runs, so every waiter of a superseded claim is answered exactly once with that claim's exit. `waiters` counting and the last-leaver `Fiber.interrupt` apply to superseded claims exactly as to live ones. `forget` still removes by identity, so a stale claim's `onExit` never removes the fresh claim at the same key. `run`'s `uninterruptibleMask` and claim-or-join step are unchanged.
- **D-04 Name:** `reset` keeps its name and stays a plain synchronous `() => void`, so an adapter can call it inside its own `Effect.sync` step. Its doc is rewritten: it supersedes every in-flight claim.

### Hook interface and the adapter (checkpoint 2)
- **D-05 `settle(key, exit)`:** the hook `claim: (key) => (exit) => void` is replaced by `settle: (key: K, exit: Exit.Exit<A, E>) => void`, called synchronously in the compute's `onExit`, before `Deferred.done`, only for a Live claim. With no claim-time read left in any adapter, a hook that returns a closure has no purpose. Test churn is not a reason to keep it (the user's standing direction: the cleanest interface).
- **D-06 Full Exit:** `settle` receives the full `Exit`; the adapter keeps its own failure policy (`DecisionCache` caches successes only).
- **D-07 `DecisionCache.clear`:** one `Effect.sync` step that empties `entries` and `insertionOrder` and calls `shared.reset()`. `generation`, `myGeneration` and the `myGeneration === generation` check are deleted. FIFO eviction and the capacity bookkeeping move unchanged into the `settle` hook.
- **D-08 Docs restated:** the `SharedComputation.ts` header, the `reset` doc, the `InFlightClaim` doc, `awaitShared`'s abandonment paragraph (where it names `abandoned`), `DecisionCacheShape.clear`'s doc and the adapter's comments say the staleness rule lives in `SharedComputation`. No doc comment names a plan or decision id.

### Tests and proof (SUPR-03, SUPR-04, WX-05, WX-06)
- **D-09 Seam tests first (RED):** the plan's first behaviour commit adds the four clear-mid-compute races to `SharedComputation.test.ts`, with plain keys and latched computes and no `evaluate`:
  - stale-last: the stale compute settles after the fresh one;
  - stale-first then a third ask coalescing onto the fresh claim;
  - two keys;
  - a parked uninterruptible compute.
  
  Each asserts that the superseded exit is never settled, every waiter is answered once, the compute is interrupted when its last waiter leaves, and a post-reset ask claims afresh. These are RED on the phase base, because today a superseded exit reaches the hook. Then `standing` is implemented. Then `generation` is deleted in its own commit, and a verify step proves `DecisionCache.test.ts` is byte-identical to the phase base and still green.
- **D-10 Property test:** a fast-check model-based test over generated command sequences: `run(key)`, `reset`, `settle(key, success | failure)` (completing a latched compute) and `leave(waiter)` (interrupting one waiter). It is driven one step at a time against a small reference model, with a fixed seed and about 300 runs. After every step it checks three laws: no superseded exit is ever settled; every waiter is answered exactly once (or detached by its own leave); an ask after a reset claims afresh. It follows the repo's existing property-test conventions (see `SinkCodec.test.ts` and `UntrustedDecode.test.ts`).
- **D-11 Existing reset test:** the test at `SharedComputation.test.ts` ("reset forgets in-flight claims …") gains an assertion that the stale exit is never settled, and its harness moves to `settle`. Every harness in the file moves from `claim` to `settle`.
- **D-12 Mutation bar:** the phase's first commit records `31-mutation-base.json` for `SharedComputation.ts` and `DecisionCache.ts`, with the method used in phase 30. Neither file may fall below its base. A drop is closed with a test, never re-baselined. Equivalent mutants removable by restructuring are restructured, as `DecodeDepthGuard.ts`'s loop was in phase 30.

### Records (WX-02, WX-03, WX-07)
- **D-13 ADR:** ADR-QD-132 is amended (dated 2026-11-12, CCR-QD-422): the staleness rule moves from the adapter's generation counter into `SharedComputation`'s superseded state. ADR-QD-144 is named Unused in CCR-QD-422's row.
- **D-14 Behaviours:** a new BEH-QD-491 in `spec/behaviors/21-decision-cache.md` says a stale answer never re-enters a cleared cache, and an ask after `clear` computes afresh. BEH-QD-439 is restated so it names the superseded state beside abandonment. BEH-QD-492..495 are named Unused unless the work splits a behaviour.
- **D-15 Invariants:** INV-QD-025's Enforcement is restated to name the mechanism, `SharedComputation`'s superseded claims rather than `DecisionCache`'s generation. A new INV-QD-307 says a superseded claim's exit never settles, and its waiters are still answered exactly once. INV-QD-308 is named Unused.
- **D-16 Changeset:** one `@qadi/core` patch changeset. No public type or observable behaviour changes, so there is no `upgrading.md` entry and no **Breaking** marker. Traceability rows are added for BEH-QD-491 and INV-QD-307. `spec/overview.md` needs no row, since `SharedComputation` is package-private and out of the barrel; gate 13 confirms it.

### Claude's Discretion
- How the property test's reference model and command runner are structured (fc.commands or a hand-rolled step loop), as long as the laws are checked after every step and the seed is fixed.
- How the plans are split into waves, as long as D-09's order holds (RED seam tests, then `standing`, then the deletion of `generation`).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/test/SharedComputation.test.ts`: `harness()` (a tiny Map cache over the hooks, `settled` log, `outcomes` log), `settleTurns` (20 `Effect.yieldNow`), and latched computes through `Deferred` and `Ref` counters. The existing reset test (~line 318) is the template for the four races.
- `packages/core/test/DecisionCache.test.ts`: the race pins, including the issue #64 regression pins and the uninterruptible regime test through `evaluate`. These must stay byte-identical.
- fast-check is a `@qadi/core` dev dependency (`catalog:`). The property-test pattern is `SinkCodec.test.ts` (~1283) and `UntrustedDecode.test.ts` (seed 3011, 300 runs).

### Established Patterns
- `SharedComputation` state is a directly reassigned `HashMap` inside one closure. Mutation happens only inside `Effect.sync`, which is atomic because Effect reorders only at `yield*`.
- `forget(key, entry)` removes by identity, so a stale `onExit` never removes a fresh claim.
- `onExit` order: the adapter's settle, then `forget`, then `Deferred.done`. The settle runs before any waiter or fresh ask can observe the answer.
- House rules: no `as`, `!`, `any` or `switch`; Match for tagged dispatch (a literal union compared with `===` in one place is fine); `Effect.fn` is not used in `run`, which is per evaluation (AGENTS.md §5 budget untouched).

### Integration Points
- `DecisionCache.ts` is the only adapter (`makeSharedComputation<Question, Trace, EvaluationError>`). No other package imports `SharedComputation`.
- `spec/behaviors/21-decision-cache.md` (BEH-QD-439 at ~289, INV-QD-025 links), `spec/invariants.md` (INV-QD-025), `spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md`, `spec/traceability.md` and `spec/README.md` (CCR-QD-422 row).

</code_context>

<specifics>
## Specific Ideas

- The roadmap's success criteria name the four races exactly: stale-last, stale-first-then-a-third-ask-coalescing, two-key, and parked-uninterruptible. Use those names in the test titles, without plan ids.
- The architecture review (`/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261112-022336.html`, section "A shared computation's reset supersedes its claims") cites `SharedComputation.ts:233, 371–374` and `SharedComputation.test.ts:320`.

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within the phase's scope.

</deferred>
