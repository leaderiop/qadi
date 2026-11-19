# Phase 61: DecisionCache is asked only the question - Context

**Gathered:** 2026-11-19
**Status:** Ready for planning

<domain>
## Phase Boundary

**The change.**
- `DecisionCacheShape.getOrCompute(question, compute)` (`packages/core/src/DecisionCache.ts`) accepts any `compute` for any `question`.
  - ADR-QD-031 makes the key the security boundary.
  - So "this trace answers this key" holds only because `Lifecycle.ts:120` passes `answer`, the walk of that same question.
- `DecisionCache` is public: `index.ts` exports it with `export *`, and `spec/overview.md` lists `DecisionCache`, `decisionCacheLayer` and `CacheLookup`.
  - `Question.ts:4` says `Question` is public "because a hand-written `DecisionCacheShape` receives it".
  - `packages/core/test/Lifecycle.test.ts:24` builds one with `Layer.succeed`.
  - `packages/react/test/DevtoolsFeed.test.tsx` names the type.
- `concurrency` is deliberately not part of the key (ADR-QD-031), so it needs a route to the walk that is not the key.
- `SharedComputation.ts` is not exported and holds the coalescing and interruption rules (ADR-QD-132, ARCH-79).

**In scope:**
- core's `DecisionCache.ts`, `Lifecycle.ts`, `SharedComputation.ts` (only if its adapter must change) and `Question.ts`'s doc;
- the tests and bench that call `getOrCompute`;
- `@qadi/react`'s test that names the shape.

**Records:**
- ARCH-108;
- ADR-QD-174, which brushes ADR-QD-031 and ADR-QD-132;
- CCR-QD-452;
- BEH-QD-641..645;
- INV-QD-367..368;
- a changeset, because public code changes.

**Out of scope:**
- `SharedComputation`'s rules: coalescing, a shared failure, one waiter's interruption, and last-waiter interruption all stay as they are;
- the key's contents, which stay the whole `Question` per ADR-QD-031;
- sealing the service (the owner chose not to; see D-02);
- releasing or versioning.
</domain>

<decisions>
## Implementation Decisions

### Owner choice (2026-11-19, the CASK-01 checkpoint)

- **D-01: pursue, question only.**
  - The cache's interface takes the question alone. Core's `decisionCacheLayer` runs the matching walk itself.
  - No caller can hand the cache an unrelated computation. A type-level negative shows an arbitrary `compute` is refused.
  - The roadmap's shape is `getOrCompute(question, { concurrency })`. The exact name of the second, non-key parameter is the planner's to settle from research, but it carries only how the walk runs, never what it answers.
- **D-02: not sealed.**
  - `DecisionCacheShape` stays public, so a host can still write its own cache. Such a cache must produce its own trace for the question it is given.
  - The guarantee is about callers: no caller can pair a key with an unrelated computation. It does not cover a host-written implementation.
  - **Breaking** for `DecisionCacheShape` implementers. Record it in the changeset and in `upgrading.md`.

### Settled from the roadmap and the house rules

- **D-03:** `concurrency` reaches the walk and does not join the key. The same question asked with a different `concurrency` is one cache entry, and a test pins that.
- **D-04:** `DecisionCache.test.ts`'s coalescing and interruption tests are driven through a question alone and stay green. `SharedComputation`'s rules are unchanged.
- **D-05, RED first:**
  1. the mutation base for `DecisionCache.ts`, `Lifecycle.ts` and `SharedComputation.ts`;
  2. the coalescing and interruption tests characterised through a question alone;
  3. the type-level negative;
  4. then the interface;
  5. then the records.
- **D-06:** A touched file's mutation score must not fall. This uses the D-15/D-16 rule with the static-ignored credit (ADR-QD-167 Rev 1.1), under core's `stryker.config.mjs`.
- **D-07:** Every "gate N" in spec text names its script (`check-dod-table.mjs`).
- **D-08:** Never run `next-id.mjs`. The ids are reserved: ADR-QD-174, CCR-QD-452, BEH-QD-641..645 and INV-QD-367..368.
- **D-09:** No `as`, `!`, `any`, new `switch`, new `Effect.fnUntraced`, `async`/`await` or `Record<string, unknown>`. Unions stay closed.
- **D-10:** `DecisionCache.bench.ts` keeps its workloads. If the hit or miss path changes shape, research says whether a bench comparison is warranted (`Lifecycle` is on the hot path).

### Claude's Discretion
- The second parameter's name and shape, for example `{ concurrency }` or a `WalkOptions`.
- How `decisionCacheLayer` reaches `walk` without an import cycle.
- How the test doubles change (`Lifecycle.test.ts:24`, react's `DevtoolsFeed.test.tsx`).
</decisions>

<deferred>
## Deferred Ideas
- Sealing `DecisionCache` against host implementations (the owner chose not to).
</deferred>
