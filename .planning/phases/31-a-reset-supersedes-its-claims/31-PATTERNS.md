# Phase 31: A reset supersedes its claims - Pattern Map

**Mapped:** 2026-11-12
**Files analyzed:** 14
**Analogs found:** 13 / 14 (the model-based property test has no exact analog)

All analog paths below are git-tracked (checked: `SharedComputation.ts`, `DecisionCache.ts`; the rest are tests, spec and planning files under tracked trees).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/SharedComputation.ts` (modify) | service (single-flight) | event-driven | itself (lines 40-85, 196-208, 254-283, 346-375) | exact |
| `packages/core/src/DecisionCache.ts` (modify) | service adapter | CRUD | itself (lines 92-102, 228-305) | exact |
| `packages/core/test/SharedComputation.test.ts` (modify: 4 RED races, harness to `settle`) | test | event-driven | reset test at lines 318-352; `harness()` at 22-37 | exact |
| `packages/core/test/SharedComputation.test.ts` (property test) | test | step-loop model | `UntrustedDecode.test.ts` (`SEED=3011`, `NUM_RUNS=300`), `SinkCodec.test.ts:1275-1300` | partial |
| `packages/core/test/DecisionCache.test.ts` | test | n/a | do-not-touch; byte-identical to base, `git diff` empty | reference |
| `spec/behaviors/21-decision-cache.md` (BEH-QD-491 new, BEH-QD-439 restated) | spec | docs | BEH-QD-439 at line 289 | exact |
| `spec/invariants.md` (INV-QD-025 restated, INV-QD-307 new) | spec | docs | INV-QD-025 | exact |
| `spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md` (amendment) | spec | docs | `spec/decisions/002-schema-derived-policy-adt.md:90` | exact |
| `spec/traceability.md` | spec | docs | line 63 (file 21 row), line 108 (INV row) | exact |
| `spec/README.md` (CCR-QD-422 row, change history) | spec | docs | CCR-QD-421 row at line 358; history 1.158 at line 13 | exact |
| `.changeset/<name>.md` | config | docs | `.changeset/untrusted-decode-devtools.md` | exact |
| `31-mutation-base.json` | config | batch | `.planning/phases/30-one-strict-decode-module/30-mutation-base.json` | exact |

## Pattern Assignments

### `packages/core/src/SharedComputation.ts` (state machine, event-driven)

**Standing replaces `abandoned`.** Current shape (lines 80-85, 273-278):
```ts
interface InFlightClaim<A, E> {
  readonly claim: Deferred.Deferred<A, E>;
  fiber: Fiber.Fiber<A, E> | undefined;
  waiters: number;
  abandoned: boolean;
}
// ...
const entry: InFlightClaim<A, E> = { claim: Deferred.makeUnsafe<A, E>(), fiber: undefined, waiters: 1, abandoned: false };
```
Change to `standing: "Live" | "Superseded" | "Abandoned"` starting `"Live"`. A literal union compared with `===` is allowed (CONTEXT code_context); no `switch`.

**Last-leaver transition** (lines 198-207). Only a Live claim becomes Abandoned; Superseded stays:
```ts
entry.waiters -= 1;
if (entry.waiters > 0) return undefined;
entry.abandoned = true;          // -> if (entry.standing === "Live") entry.standing = "Abandoned";
forget(key, entry);              // stays, by identity, a no-op for a superseded claim
return entry.fiber;              // interrupt still applies
```

**onExit** (lines 346-358). Keep the order settle, forget, `Deferred.done`:
```ts
Effect.onExit((exit) =>
  Effect.sync(() => {
    if (!entry.abandoned) settle(exit);   // -> if (entry.standing === "Live") hooks.settle(key, exit);
    forget(key, entry);
  }).pipe(Effect.flatMap(() => Deferred.done(entry.claim, exit))),
),
```

**Hook interface** (lines 40-51). Replace `claim: (key) => (exit) => void` with `settle: (key: K, exit: Exit.Exit<A, E>) => void`. Drop the `settle` field from the `"Claimed"` union member at line 259, and the `hooks.claim(key)` call at line 282 and its comment. Line 298 `const { entry, settle } = claimed;` becomes `const { entry } = claimed;`.

**reset** (lines 370-375, currently only empties `inFlight`). One synchronous call:
```ts
reset: () => {
  HashMap.forEach(inFlight, (entry) => { entry.standing = "Superseded"; });  // verify HashMap.forEach signature in effect@4
  inFlight = HashMap.empty<K, InFlightClaim<A, E>>();
},
```
Edge: only a Live claim in `inFlight` can be superseded. An Abandoned one has already been forgotten, so none is in the map. Never set a state back to Live.

**Docs to restate (D-08):** header lines 14-24 (generation counter and the `claim` hook), the `reset` doc at lines 56-62, the `InFlightClaim` doc at lines 66-79, and `awaitShared`'s paragraph at lines 163-178 that names `abandoned`. No doc names a plan or decision id. Doc-comment shape per AGENTS.md: one-line summary, then why.

### `packages/core/src/DecisionCache.ts` (adapter)

Delete line 231 `let generation = 0;` and its comment lines ~225-230, the `myGeneration` read at line 241, and `&& myGeneration === generation` at line 248. Delete `generation += 1;` at line 300. The `claim: (key) => { … return (exit) => { … } }` wrapper becomes:
```ts
settle: (key, exit) => {
  if (exit._tag === "Success") {
    entries = HashMap.set(entries, key, exit.value);
    if (options?.capacity === undefined) return;
    insertionOrder = Chunk.append(insertionOrder, key);
    while (HashMap.size(entries) > options.capacity) { /* FIFO body unchanged, lines 261-274 */ }
  }
},
```
`clear` stays one `Effect.sync` (lines 291-301) with `entries`, `insertionOrder` and `shared.reset()`, minus `generation`. Rewrite `clear`'s doc (lines 92-102, "internal generation counter") to say the staleness rule lives in `SharedComputation`. The failure-caching policy stays in the adapter (D-06).

### `packages/core/test/SharedComputation.test.ts`

**Harness migration** (lines 22-37). Every harness and inline `makeSharedComputation` call (including the reset test's `claim: () => () => {}` at ~line 321) moves to:
```ts
settle: (key, exit) => {
  settled.push(`${key}:${exit._tag}`);
  if (Exit.isSuccess(exit)) cache.set(key, exit.value);
},
```
Also check the `abandonWhileParked` helper, which records `settles` with a `claim` counter (~lines 280-300), for hook use.

**Four new race tests, RED first.** Copy the reset test (lines 318-352) as the template. Pieces to reuse:
```ts
const stale = yield* Deferred.make<void>();
const fresh = yield* Deferred.make<void>();
const compute = Ref.updateAndGet(runs, (n) => n + 1).pipe(
  Effect.flatMap((n) => n === 1 ? Deferred.await(stale).pipe(Effect.as(1)) : Deferred.await(fresh).pipe(Effect.as(2))));
const first = yield* Effect.forkChild(shared.run("k", compute));
yield* settleTurns;
shared.reset();
// ...
yield* Deferred.succeed(stale, undefined);
assert.deepStrictEqual(yield* Fiber.join(first), { value: 1, outcome: "miss" });
```
- stale-last: settle fresh first, then stale; assert `settled` has only the fresh exit.
- stale-first then a third ask coalescing onto fresh: the reset test already does this. Add `assert.deepStrictEqual(settled, [])` for the stale exit after the stale join.
- two keys: two keys in flight, one `reset`, both superseded, both fresh claims independent.
- parked uninterruptible: reuse the `abandonWhileParked` regime (`Effect.uninterruptible` compute). Reset, then the last waiter leaves via `Fiber.interrupt`. Assert the interrupt still fires, the stale exit is not settled, and a post-reset ask claims afresh.

Each also asserts every waiter is answered once. Titles use the roadmap names with no plan ids. RED on base because today a stale exit reaches `claim`. Note that on base the harness cannot compile against `settle`, so land the harness churn and the RED tests in one commit with the old `claim` hook shape. Alternatively, write the RED tests against `claim` and migrate in the `standing` commit. The planner must pick one so the RED really fails on an assertion and not on a type error.

**Existing reset test** (line 318 title: "reset forgets in-flight claims …"). Add the assertion that the stale exit is never settled, which needs a recording harness instead of `claim: () => () => {}`.

### Property test (model-based, new `describe` in `SharedComputation.test.ts` or a sibling file)

**Finding: no `fc.commands`, `fc.modelRun` or `fc.asyncModelRun` exists in any `packages/*/test`.** Closest style analogs:
- `packages/core/test/UntrustedDecode.test.ts:33-34, 87` — `const NUM_RUNS = 300; const SEED = 3011;` and `FastCheck.assert(FastCheck.property(arb, fn), { numRuns: NUM_RUNS, seed: SEED })`.
- `packages/core/test/SinkCodec.test.ts:1279` — `{ numRuns: 300, seed: 9091 }`, and imports `import * as FastCheck from "fast-check"` (check the import line at the top of that file).
- `FastCheck.asyncProperty` exists in `packages/core/test/DecisionStream.test.ts` and `packages/audit/test/SignatureLedger.test.ts`. Read one for the Effect-to-promise bridge (`Effect.runPromise` or `it.effect` plus `FastCheck.assert`). The command loop must run Effects (forks, latches), so either bridge `asyncProperty` through `Effect.runPromise`, or generate the command array synchronously with `FastCheck.property` and drive the sequence inside `it.effect` with a hand-rolled step loop.
- Recommended (Claude's Discretion): a hand-rolled step loop. Generate `FastCheck.array(command, { maxLength: ~12 })` where `command` is `fc.oneof` over `run(key)`, `reset`, `settle(key, success|failure)`, `leave(waiter)`. Keep a reference model (a map of live claims, superseded set, waiter state). After each step, run `settleTurns` and assert the three laws.
- The seed is fixed (new, unique, for example 3101) and `numRuns: 300`.

### Spec records

**BEH-QD-439** (`spec/behaviors/21-decision-cache.md:289`, links INV-QD-025 at line 291). Restate it to name the superseded state beside abandonment, and add BEH-QD-491 after it with the same heading and `> **Invariant:**` link shape. Count the section in the file's change-history line 13 via `spec-revise`.

**ADR-QD-132 amendment.** The file has no amendment section yet (headings: Context, Options, Decision, Consequences, Alternatives considered). Copy the shape from `spec/decisions/002-schema-derived-policy-adt.md:90-100`:
```md
## Amendment (2026-11-12, CCR-QD-422)

<prose: the staleness rule moves from the adapter's generation counter into SharedComputation's superseded state; the original text stays as written.>
```

**spec-revise** is always run with the date, once per changed existing doc (phase 30 pattern, `30-07-PLAN.md:109,139`):
`node scripts/spec-revise.mjs <doc> "<summary> (ARCH-79, CCR-QD-422)" --date 2026-11-12`, then `node scripts/spec-revise.mjs --check`. Documents to revise: `spec/behaviors/21-decision-cache.md`, `spec/invariants.md`, ADR 132, `spec/traceability.md`. New numbers are reserved with `scripts/next-id.mjs`, never a `NEXT` placeholder (AGENTS §11).

**spec/README.md.** Add a CCR-QD-422 row mirroring the CCR-QD-421 row at line 358 (columns: id, date 2026-11-12, file list, summary). The row names ADR-QD-144 as Unused and BEH-QD-492..495 and INV-QD-308 as Unused. Add a change-history entry above 1.158 in line 13, which becomes 1.159 (2026-11-12).

**spec/traceability.md.** Line 63: add BEH-QD-491 to the "21 — Decision Cache" row (`BEH-QD-161–168, BEH-QD-439`). Add an INV-QD-307 row beside line 108's INV-QD-025 row shape. Update the ADR-QD-132 row if present. `spec/overview.md` gets no row (package-private, gate 13).

### `.changeset/<name>.md`

Analog `.changeset/untrusted-decode-devtools.md`:
```md
---
"@qadi/core": patch
---

<one sentence, observable-behaviour wording; no Breaking marker, no upgrading.md entry>
```

### `31-mutation-base.json`

Analog is phase 30's, a flat object `{ "<path>": <killed+timeout / (that + survived + no-coverage)> }`. Phase 30 recorded it in `30-01-PLAN.md` Task 1 (line 138) with an inline `node -e` script that reads `reports/mutation/mutation.json` (core config `stryker.config.mjs`, `ignoreStatic: true`, `--mutate` scopes a run, break threshold 80, one config at a time per ADR-QD-098). It refuses a stale report older than the newest src or test file. Run it with only `packages/core/src/SharedComputation.ts packages/core/src/DecisionCache.ts` as arguments, output `.planning/phases/31-a-reset-supersedes-its-claims/31-mutation-base.json`. It is committed alone as `chore(31-01): mutation baseline for SharedComputation and DecisionCache`, as the first commit. After the work, write `31-mutation-after.json` the same way (analog `30-mutation-after.json`). A drop is closed with a test, not re-baselined.

## Shared Patterns

- **House rules for the source edits:** no `as`/`!`/`any`/`switch`; mutations only inside `Effect.sync`; `run` stays a non-`Effect.fn` arrow (AGENTS §5, `UNTRACED_BUDGET` untouched); imports are `effect/*` submodule namespaces with the `.ts` extension on relative imports.
- **Commit order (D-09):** mutation base, then RED seam tests, then `standing`, then deleting `generation` in its own commit. Then verify `git diff <phase-base> -- packages/core/test/DecisionCache.test.ts` is empty and the file is green.
- **Gates to run:** `pnpm typecheck`, `pnpm lint`, `node scripts/spec-revise.mjs --check`, `scripts/check-house-style.mjs`, `scripts/check-api-surface.mjs` (gate 13). Final: `pnpm check:pr`.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| Model-based command-sequence property test | test | No `fc.commands`/`fc.modelRun`/`fc.asyncModelRun` anywhere in the repo; use the hand-rolled step loop above with the seed and run-count conventions from `UntrustedDecode.test.ts`. |

## Metadata

**Analog search scope:** `packages/*/test`, `packages/core/src`, `spec/`, `.changeset/`, `.planning/phases/30-*`
**Pattern extraction date:** 2026-11-12
