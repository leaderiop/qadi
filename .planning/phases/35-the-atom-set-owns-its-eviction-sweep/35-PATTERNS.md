# Phase 35: The atom set owns its eviction sweep - Pattern Map

**Mapped:** 2026-11-12
**Files analyzed:** 17 new/modified
**Analogs found:** 16 / 17

All analog paths below are git-tracked (checked with `git ls-files` for the two spot-checked sources; the rest are ordinary tracked repo paths, none under a `.gsd/` mirror).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/react/src/QuestionBook.ts` (add `signal` option) | model (pure book) | event-driven (signal seam) | itself: `BookOptions.build`/`live` callback seam, `QuestionBook.ts:64-76` | exact |
| `packages/react/src/SweepScheduler.ts` (new, package-private) | utility (coalescer) | event-driven, deferred fork | `QuestionBook.ts` header style (package-private, not in `index.ts`); fork idiom `QadiProvider.tsx:343` | role-match |
| `packages/react/src/QadiAtoms.ts` (wire signal; drop `sweepEvictions`) | service/adapter | event-driven | itself: `track` `:315-318`, `sweepEvictions` `:360`, returned object `:400` | exact |
| `packages/react/src/QadiProvider.tsx` (delete sweep effect, prop, const) | component | lifecycle | itself `:122-130`, `:172-193`, `:228`, `:330-349` (deletions) | exact |
| `packages/react/test/QuestionBook.test.ts` (signal tests) | test | event-driven | existing `QuestionBook.test.ts` | exact |
| `packages/react/test/SweepScheduler.test.ts` (new) | test | event-driven | `packages/devtools/test/react/DiagnosticsLifetime.test.tsx` (`@effect/vitest` + `counting` helper) | role-match |
| `packages/react/test/QadiAtoms.test.ts` (rewrite `sweepEvictions` suite `:379+`) | test | graph | itself | exact |
| `packages/react/test/QadiAtoms.sweep.test.ts` (new, bare registry) | test | graph | `QadiAtoms.test.ts:379-400` + RESEARCH Code Examples | exact |
| `packages/react/test/QadiProvider.test.tsx` (`:298-348`) | test | RTL | itself | exact |
| `packages/react/test/QadiProvider.sweep.test.tsx` (new, StrictMode/Activity) | test | RTL lifecycle | `packages/devtools/test/react/DiagnosticsLifetime.test.tsx`, `TimelineLifetime.test.tsx` | exact |
| `packages/react/test/support/settle.ts` (new) | test helper | scheduler settle | `packages/devtools/test/helpers.ts` `settleTurns` | exact |
| `packages/react/test/v4-reactivity-smoke.test.ts` (D-14 pins) | test | smoke | itself | exact |
| `.planning/phases/35-.../35-mutation-base.json` | config | n/a | `34-mutation-base.json` | exact |
| `.planning/phases/35-.../35-SPIKE.md` | doc | n/a | none in codebase (shape fixed by D-07) | none |
| `stryker.react.mjs` (add `SweepScheduler.ts`) | config | n/a | itself (`mutate` list) | exact |
| `spec/decisions/148-*.md`, `spec/README.md` CCR-QD-426, `spec/behaviors/09-react.md`, `25-inspection.md`, `invariants.md`, `traceability.md` | spec | n/a | `spec/decisions/146-one-evaluation-environment-states-its-shadowing.md`; CCR-QD-425 row `spec/README.md:362`; INV-QD-105 `invariants.md:3193-3205` | exact |
| `.changeset/<new>.md`, `apps/website/src/content/docs/docs/reference/upgrading.md`, `AGENTS.md` §13, `house-rules-evidence.md` §4 | docs | n/a | `.changeset/dock-diagnostics-feed.md`; `upgrading.md:486,519` (`## 0.12: ...`) | exact |

## Pattern Assignments

### `packages/react/src/QuestionBook.ts` (model, event-driven)

**Analog:** itself. Keep it free of `effect` imports (only `effect/MutableHashMap`, line 55).

**Option seam** (extend `BookOptions`, lines 64-76): add `readonly signal?: () => void;` documented like `build`.

**Admit trigger** (lines 127-131) append: `if (order.length > capacity) signal?.();`

**Release trigger** (lines 144-148), after `entry.liveCount -= 1`:
```typescript
return () => {
  if (released) return;
  released = true;
  entry.liveCount -= 1;
  if (entry.liveCount === 0 && entry.inBook && order.length > capacity) signal?.();
};
```
Note: the `entry.inBook` guard is a RESEARCH refinement (Pitfall 3); the spike decides. The admission trigger is also a spike decision (RESEARCH Open Question 1). Update header doc lines 27-28 ("`sweep` runs on its own fiber") to "on a fiber the atom set forks after the signal".

### `packages/react/src/SweepScheduler.ts` (utility, deferred fork)

**Analog:** package-private-module style of `QuestionBook.ts` (not exported from `index.ts`; needs a `spec/traceability.md` row and a `stryker.react.mjs` `mutate` entry). Fork idiom is plain `Effect.runFork` as at `QadiProvider.tsx:343`. Copy the coalescer from RESEARCH Pattern 1 verbatim (house-rule compliant, no `as`/`!`/`switch`):
```typescript
import * as Effect from "effect/Effect";
import type * as Fiber from "effect/Fiber";

export const makeSweepScheduler = (
  sweep: () => void,
  fork: (effect: Effect.Effect<void>) => Fiber.Fiber<void> = (effect) => Effect.runFork(effect),
) => {
  let pending = false;
  return {
    pending: (): boolean => pending,
    request: (): void => {
      if (pending) return;
      pending = true;
      fork(Effect.yieldNow.pipe(Effect.andThen(Effect.sync(() => { pending = false; sweep(); }))));
    },
  };
};
```
State is per call (closure), never module-scope (AGENTS.md section 13). Use plain `Effect.runFork`, not `forkDetach` inside an atom effect (microtask scheduler, RESEARCH Anti-Patterns). Add a doc comment in the repo's shape: one-line summary first, rationale (ADR-QD-148, CCR-QD-150) after.

### `packages/react/src/QadiAtoms.ts` (adapter)

**Analog:** itself. Current pieces to change:
- `track` (lines 315-318): unchanged; `get.addFinalizer(live())` stays the liveness hook. Update the comment at `:313-315` that names `sweepEvictions`.
- Delete `const sweepEvictions: Effect.Effect<void> = Effect.sync(book.sweep);` (line 360), the interface member and long doc (`:146-166`), the returned-object entry (`:400`); fix doc refs at `:90`, `:131`, `:230`.
- Build the scheduler where the book is built: `const scheduler = makeSweepScheduler(book.sweep)` needs the book first, so pass `signal: () => scheduler.request()` with a forward reference declared via `const` order carefully (book created with a `signal` closure that reads `scheduler` lazily).
- `import * as Effect` stays (used by `runtime.atom`, `invalidate`).
- If candidate 2 or 3 wins, add the interval to `QadiAtomsOptions` (D-09).

### `packages/react/src/QadiProvider.tsx` (component)

**Analog:** itself. Delete: header comment `:20`; `DEFAULT_SWEEP_INTERVAL_MILLIS` and doc `:122-130`; prop and doc `:172-193`; destructuring default `:228`; the comment plus effect `:330-349`:
```tsx
useEffect(() => {
  const fiber = Effect.runFork(
    Effect.repeat(atoms.sweepEvictions, Schedule.spaced(sweepIntervalMillis)),
  );
  return () => { Effect.runFork(Fiber.interrupt(fiber)); };
}, [atoms, sweepIntervalMillis]);
```
Then drop now-unused `Effect`/`Fiber`/`Schedule` imports (`:26-28`) only after checking other uses. Keep the registry's own delayed-dispose effect just above it (`:~315-328`). Fallback (D-08) keeps all of this and only adds doc text.

### Tests

**`QadiAtoms.test.ts` rewrite** (analog: itself `:379-400`). Replace each `Effect.runSync(set.sweepEvictions)` (lines 398, 404, 437, 455, 474, 493, 516) with release then settle; assertions unchanged. Existing shape:
```typescript
registry.set(set.invalidate, undefined);
Effect.runSync(set.sweepEvictions);
expect(set.asked().map((q) => q.policy)).toEqual([canRead]);
```
Keep the registry-node assertion at `:489` (`registry.getNodes().has(decision)`) and its comment `:478-486`. After an unmount, one `yieldNow` is not enough; use 2+ or `vi.waitFor` (Pitfall 2).

**`QadiProvider.test.tsx` `:298-348`**: delete `describe("sweepIntervalMillis")` and its first test (background cadence, now the atom set's job). Flip "stops sweeping once the provider unmounts" (`:327-348`, assertion `toBe(2)` at `:347`) to "returns to the bound after unmount" (D-13) in the commit that lands the mechanism. In the characterisation commit (D-11), first add pins on the unchanged source: 3 providers with a counting double `{ ...atoms, sweepEvictions: Effect.sync(() => { sweeps += 1; }) }` and `sweepIntervalMillis={10}` gives about 3x the sweeps of one; no provider leaves `asked()` at 3 over bound 1.

**`QadiAtoms.sweep.test.ts` (new)**, SWEEP-03 acceptance, from RESEARCH Code Examples (P1):
```typescript
const set = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 2 });
const registry = AtomRegistry.make();
const unmounts = ["a","b","c","d","e"].map((n) => registry.mount(set.decision(permissionPolicy(n))));
expect(set.asked().length).toBe(5);
for (const unmount of unmounts) unmount();
await vi.waitFor(() => expect(set.asked().length).toBe(2));
registry.dispose();
```
Also assert 0 sweeps synchronously after `registry.set(set.invalidate, undefined)` (dispose-reread window) and after `open()`.

**`SweepScheduler.test.ts` (new):** analog `packages/devtools/test/react/DiagnosticsLifetime.test.tsx:12-40`, `@effect/vitest` imports (`assert, describe, it`) and a local counting helper. Test via injected `fork`: N `request()` in one span gives 1 sweep; a later request gives 2; `pending()` false and every recorded fiber `Fiber.pollUnsafe(f) !== undefined` after 300 atom sets (criterion f). Count through the seam, not module mocks (Anti-Pattern: phantom counts).

**`QadiProvider.sweep.test.tsx` (new):** analog `TimelineLifetime.test.tsx` (L1 StrictMode, L4 Activity) and `DiagnosticsLifetime.test.tsx` (`import { Activity, StrictMode, useState } from "react"`). Put `QadiProvider` INSIDE `<Activity>` (pre-existing subject-node loss otherwise; Pitfall 7).

**`support/settle.ts`:** copy `packages/devtools/test/helpers.ts:175-177` (tracked):
```typescript
export const settleTurns = Effect.gen(function* () {
  for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
});
```
(5 is enough per RESEARCH; 20 matches the analog.) Do not use `TestClock` for candidate 1: a `runFork` fiber ignores it.

**`v4-reactivity-smoke.test.ts`:** add D-14 pins in the file's existing style: finalizer runs synchronously inside `registry.dispose()`; node removal after unsubscribe is deferred to a later macrotask.

### `35-mutation-base.json` (config)

**Analog:** `.planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-mutation-base.json`, shape `{ "measured": { path: score }, "unmeasured": { path: reason } }`. Measured: `QuestionBook.ts` (and `SweepScheduler.ts` via `--mutate`). Unmeasured with reason: `QadiProvider.tsx` ("outside stryker.react.mjs mutate (render code)"); `QadiAtoms.ts` unless run with the CLI override `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/QadiAtoms.ts` (precedent: Phase 30 `HydrationEngine.ts`). Commit alone as first plan commit (D-17).

### Spec records

- **ADR-QD-148** (only if a mechanism lands): analog `spec/decisions/146-one-evaluation-environment-states-its-shadowing.md` header block (Document Control table, `Status: Accepted — amends ADR-QD-014`, Context/Decision sections); also add to `spec/decisions/index.yaml`.
- **CCR-QD-426:** copy the CCR-QD-425 row form at `spec/README.md:362` (columns: id, date 2026-11-12, files list, description) plus the change-history cell at `:13` (revision 1.163). Use `scripts/spec-revise.mjs --date 2026-11-12`; never `scripts/next-id.mjs`. If fallback: name ADR-QD-148 Unused in the row.
- **BEH-QD-511..515:** `spec/behaviors/09-react.md`: BEH-QD-065 (`:35`), remove `sweepEvictions` member and comment (`:72-73`), rewrite requirement `:92-97`; `25-inspection.md` BEH-QD-198 requirement `:777-780` and sentence `:794-801` ("provider's first sweep runs after its children have rendered", must become "one macrotask after the pressure"). TypeScript fences there are compiled by the merge gate.
- **INV-QD-315..316:** analog INV-QD-105 at `spec/invariants.md:3193-3205` (heading, body, `Source` block). Update INV-QD-105's `sweepEvictions` wording.
- `spec/traceability.md` rows at `:501-503` and `:51`; new test files need rows. `spec/overview.md` names neither knob; confirm with `pnpm spec:api`.

### Changeset and upgrade note

- `.changeset/<new>.md`: copy `.changeset/dock-diagnostics-feed.md` form: frontmatter `"@qadi/react": minor`, then `**Breaking.** ...` paragraphs naming `sweepIntervalMillis` and `QadiAtoms.sweepEvictions` removed.
- `apps/website/.../reference/upgrading.md`: add `## 0.12: the atom set sweeps its own bound` beside `## 0.12: useTimeline follows its component's lifetime` (`:486`) / `## 0.12: useDiagnostics returns { status, reading }` (`:519`).
- `AGENTS.md:631` (section 13) sentence amended per D-15; `house-rules-evidence.md` section 4 (`:104`) gets an addendum, quoted history untouched.

## Shared Patterns

### Deferral, never a sweep inside the dispose-reread window
**Source:** RESEARCH Q1/Q2; `QuestionBook.ts:21-32`. **Apply to:** `SweepScheduler.ts`, `QadiAtoms.ts`. Signal sets a flag and `Effect.runFork`s `yieldNow` then the sweep; never call `book.sweep` synchronously from `open`, `live` or `release`.

### House rules
**Source:** `AGENTS.md` sections 1, 4 to 6. **Apply to:** all `src`. Namespace imports of `effect/*`, relative `.ts` extensions, `import type` for types, no `as`/`!`/`any`/`switch`, no module-scope state or timers, no `scheduleTask`/`defaultIdleTTL`.

### Characterise first, flip in the changing commit
**Source:** Phase 34 pins `DiagnosticsLifetime.test.tsx`/`TimelineLifetime.test.tsx` ("written against the shipped behaviour first"). **Apply to:** D-11 pins in `QadiProvider.test.tsx` and `QadiAtoms.sweep.test.ts`.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| `35-SPIKE.md` | process doc | No spike record exists; shape is dictated by D-07 (candidate x criterion x evidence x pass/fail, then D-02 ranking). Phase 30 `30-VERIFICATION.md` is a loose evidence-doc precedent. |

## Metadata

**Analog search scope:** `packages/react/{src,test}`, `packages/devtools/test`, `.planning/phases/34-*`, `spec/{decisions,behaviors}`, `.changeset`, `apps/website/.../upgrading.md`
**Pattern extraction date:** 2026-11-12
