# Phase 37: A scoped run that a newer run supersedes - Pattern Map

**Mapped:** 2026-11-14
**Files analyzed:** 22 (3 new source/test, 3 modified stores, 3 modified store tests, 1 baseline JSON, records)
**Analogs found:** 21 / 22 (the module's held-fork has no analog; its scaffolding does)

All analog paths below were checked as git-tracked (`packages/`, `spec/`, `.changeset/`, `.planning/milestones/`); none is a gitignored mirror. `reports/mutation-devtools/mutation.json` is gitignored and is an input only, never an analog.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/devtools/src/model/SupersedingRun.ts` (new) | model/utility (scoped closure module) | event-driven (fiber replace) | `packages/devtools/src/model/TimelineFeed.ts:120-157` (the protocol it extracts); `ExternalStore.ts` (header/doc shape) | exact (protocol), role-match (shape) |
| `packages/devtools/src/model/TimelineFeed.ts` (mod) | model (store) | event-driven | itself (`:120-162`) | exact |
| `packages/devtools/src/model/DiagnosticsFeed.ts` (mod) | model (store) | event-driven | itself (`:161-261`); sibling of TimelineFeed | exact |
| `packages/devtools/src/model/SimulationSession.ts` (mod) | model (store) | request-response + event-driven | itself (`:349-362, 451-463, 483-545`) | exact |
| `packages/devtools/test/model/SupersedingRun.test.ts` (new) | test | event-driven + property | `TimelineFeed.test.ts` (rows, scope closing) + `packages/core/test/SharedComputation.test.ts:566-845` (property) | role-match |
| `packages/devtools/test/model/{TimelineFeed,DiagnosticsFeed}.test.ts` (mod: RED rows) | test | event-driven | same files (TF6, TF19, F27) | exact |
| `packages/devtools/test/model/SimulationSession.test.ts` or new file (mod: T5, self-interrupt, stop pin) | test | request-response | same file `:401-447`, `:1669-1684` | exact |
| `.planning/phases/QD-37-.../37-mutation-base.json` (new) | config/data | batch | `.planning/milestones/v1.3-phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-mutation-base.json` | exact |
| `.planning/phases/QD-37-.../37-mutation-after.json` (new) | config/data | batch | `.../34-*/34-mutation-after.json`, `36-*/36-mutation-after.json` | exact |
| `spec/decisions/150-<slug>.md` (new) + `spec/decisions/index.yaml` | record (ADR) | n/a | `spec/decisions/149-a-seed-is-held-by-its-question.md`; `148-the-atom-set-owns-its-eviction-sweep.md` | exact |
| `spec/decisions/137-...md` (mod: amendment blockquote) | record | n/a | its own Revision 1.2 blockquote at `:128-134` | exact |
| `spec/README.md` (CCR-QD-428 row + history) | record | n/a | CCR-QD-427 row (`spec/README.md:364`), CCR-QD-425 | exact |
| `spec/behaviors/28-devtools-screens.md`, `29-devtools-simulator.md` (BEH-QD-521..525) | record | n/a | BEH-QD-519/520 in 28 (CCR-QD-427) | exact |
| `spec/invariants.md` (INV-QD-319/320; INV-QD-313 restated) | record | n/a | INV-QD-317/318 at file end | exact |
| `spec/traceability.md` (BEH, INV, ADR rows, new test-file row) | record | n/a | CCR-QD-427's "three new test-file rows" (rows near `:431-475`) | exact |
| `.changeset/<slug>.md` | config | n/a | `c3923156:.changeset/evaluation-options-stated-once.md` (patch) | exact |
| `AGENTS.md` §10 (line ~580) | doc | n/a | own text; `it.effect` + `Scope.make` usage in `TimelineFeed.test.ts:163` | exact |

No `spec/overview.md` row (package-private, ADR-QD-099).

## Pattern Assignments

### `packages/devtools/src/model/SupersedingRun.ts` (new module, event-driven)

**Analog (shape):** `packages/devtools/src/model/TimelineFeed.ts` (file doc, imports, `Effect.fn.Return` constructor). **Protocol source:** the three restated blocks. The verified prototype is RESEARCH Code Examples 1 (lines 441-538 of `37-RESEARCH.md`); copy it, do not re-derive.

**File doc shape** (`TimelineFeed.ts:1-11`, "Package-private (ADR-QD-099)." closing line; one-line summary first, why after, per AGENTS.md):
```typescript
/**
 * One timeline read, owned by a scope, behind a store that outlives a capacity change.
 * ...
 * Package-private (ADR-QD-099).
 */
```
For the module: line one "A scoped run that a newer run supersedes, owned by a scope.", then ADR-QD-150, finalizer order (sequential scope only; `Scope.make("parallel")` voids it), held-fork rule, "a `begin` is paired with a `fork` or `stop`".

**Imports** (`TimelineFeed.ts:12-16`, submodule namespaces, `.ts` extensions, `import type` for Scope):
```typescript
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberHandle from "effect/FiberHandle";
import type * as Scope from "effect/Scope";
```

**Protocol being extracted** (`TimelineFeed.ts:120-134`; same block at `DiagnosticsFeed.ts:165-182`, `SimulationSession.ts:349-362`). Order matters: handle first, finalizer second, runtime third:
```typescript
let generation = 0;
let closed = false;
const reads = yield* FiberHandle.make<void>();
// Added after the handle, so it runs first on close: the read it interrupts is then a replaced one.
yield* Effect.addFinalizer(() => Effect.sync(() => { generation += 1; closed = true; }));
const forkRead = yield* FiberHandle.runtime(reads)<never>();
```

**Failure filter that becomes the `onFailure` hook** (`TimelineFeed.ts:147-153`, duplicate at `DiagnosticsFeed.ts:221`):
```typescript
Effect.onExit((exit) => Effect.sync(() => {
  if (mine === generation && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
    status.set(TimelineStatus.Stopped({ reason: Cause.pretty(exit.cause) }));
  }
}))
```

**Constructor idiom:** unnamed `Effect.fn(function* (): Effect.fn.Return<SupersedingRun, never, Scope.Scope> {...})` (no span; A1). Budgets: zero `fnUntraced`, zero `switch`, no `as`/`!`/`any`. Opaque token via module-private `unique symbol` (no arithmetic, D-04).

---

### `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `SimulationSession.ts` (modified stores)

**Analog:** RESEARCH Code Examples 2 (`37-RESEARCH.md:542-565`), from the converted scratch stores (1362/1362 devtools tests green).

**Publish-between-begin-and-fork shape** (`TimelineFeed.ts:136-157` becomes):
```typescript
const readSource = (source: Source | undefined) => {
  const token = run.begin();
  status.set(READING);                       // publish between begin and fork
  const marking: Pick<TimelineStore, "accept"> = {
    accept: (record) => { if (!run.isCurrent(token)) return; timeline.accept(record); },
  };
  run.fork(token, runSource(marking, source ?? NO_SOURCE), {
    onFailure: (cause) => status.set(TimelineStatus.Stopped({ reason: Cause.pretty(cause) })),
  });
};
// restart: if (!run.closed()) readSource(inputs.source);
```
- `DiagnosticsFeed.start` (`:199-228`): keep `show(diagnosticsStarting.status)` (comment `:203` "Before the fork...") between `begin` and `fork`; `off` (`:230-237`) becomes `run.stop()`; keep the `closed` guards via `run.closed()`.
- `SimulationSession`: `supersede` (`:451-463`) becomes `run.stop()` (delete the `Option.isSome(FiberHandle.getUnsafe(runs))` guard at `:462`; drop `FiberHandle` and `Option` imports); `land(mine: RunToken, ...)` at `:483-514` swaps `if (mine !== generation)` (`:495`) for `if (!run.isCurrent(mine))`, keeps its own `Effect.exit` and the `Broke` mapping (`:507-511`, no hook); `start` (`:516-545`) is `const mine = run.begin(); ... commit(); run.fork(mine, land(mine, ...))`. Local `run: RunState` collides with the module binding: rename one (scratch used `runs`).
- Delete the three "Added after the handle" comments (`TimelineFeed.ts:127`, `DiagnosticsFeed.ts:175`, `SimulationSession.ts:355-356`); fix `DiagnosticsFeed.ts:161` "without a `Stopped`".
- Do not fix `TimelineFeed.configure` after close republishing `Reading` (unpinned, out of scope).

---

### `packages/devtools/test/model/SupersedingRun.test.ts` (new test, event-driven + property)

**Analog A (rows, closing a scope mid-test):** `TimelineFeed.test.ts:1-40, 162-178` (TF6). Header doc, `@effect/vitest` imports, `Scope.make()` + `Scope.provide` + `Scope.close`:
```typescript
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import * as TestClock from "effect/testing/TestClock";
const flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"));
// in a test:
const scope = yield* Scope.make();
const feed = yield* Scope.provide(makeTimelineFeed({ source: a.source }), scope);
yield* Scope.close(scope, Exit.void);
```
Defecting-release rows: `TimelineFeed.test.ts:266` (`Stream.never.pipe(Stream.ensuring(Effect.die(new Error("release boom"))))`) and `:386` (latched late release) are the TF12/TF19 analogues. Use `it.effect` (already scoped); `it.scoped` does not exist. Starting rows are the experiment bodies P1-P9 in `.../scratchpad/scratch-tests/zzScratch37b.test.ts` (scratchpad, not tracked; planner re-derives from RESEARCH `:203-217`).

**Analog B (property, RUN-07):** `packages/core/test/SharedComputation.test.ts:566-845`. Form: weighted `FastCheck.oneof` command array, `Match.type<Command>().pipe(Match.tagsExhaustive({...}))` interpreter, `FastCheck.asyncProperty`, fixed seed, floors. Excerpts:
```typescript
const commands = FastCheck.array(
  FastCheck.oneof(
    { weight: 7, arbitrary: key.map((k): Command => ({ _tag: "Run", key: k })) },
    { weight: 4, arbitrary: FastCheck.constant<Command>({ _tag: "Reset" }) },
    ...
  ),
  { maxLength: 16 },
);
// interpreter: a new Command is a compile error here, not a silent Leave.
const step = Match.type<Command>().pipe(Match.tagsExhaustive({ Run: runStep, Reset: () => resetStep, ... }));
for (const cmd of cmds) yield* step(cmd);
yield* Effect.promise(() =>
  FastCheck.assert(
    FastCheck.asyncProperty(commands, (cmds) => Effect.runPromise(program(cmds))),
    { numRuns: 300, seed: 3101 },
  ),
);
assert.isAtLeast(supersededSettled, 30, "settles that completed a superseded compute");
```
Counters (`let supersededSettled = 0` etc.) live in the outer `Effect.gen` and are asserted after `FastCheck.assert`. Describe title form: `describe("PROPERTY: a reset supersedes its claims", ...)`. Commands here: `Begin`, `Fork {ok|die|never}`, `Land`, `Stop`, `Close`; pick a new fixed seed. `fc.commands` is not the precedent (A5). `FastCheck` import style: copy from the head of `SharedComputation.test.ts`. Test-scope rules: no `as`/`!`/`any`.

---

### Store tests: RED rows (T1-T6) and green characterisations

**Analog:** the same files' existing rows. `TimelineFeed.test.ts` helpers `delayed(backlog)` (`:30-33`), `flush`, `idsOf`; `DiagnosticsFeed.test.ts` `step`/`asking` and the F27 "restart while Starting" row (`:454`); session subscriber re-entrancy pins (`SimulationSession.test.ts:414, 428`, describe at `:401-447`); Broke on defect (`:1669-1684`). RED-test shape: RESEARCH Code Examples 3 (`37-RESEARCH.md:567-584`). Per RESEARCH Open Q1: test commit first (record RED on the unchanged store in the SUMMARY), conversion commit second; never leave RED at a plan boundary. Green-on-base characterisations first: session self-interrupt reads `Broke` (not `Running`), timeline `["Reading","Stopped"]` ordering, session stop-with-no-run (snapshot reference-equal, no notify). T5 needs a ports layer constructor (`Layer.effectDiscard(Effect.sync(() => session.run("Run")))`), not an `AttributeResolver` hook (Pitfall 6). New session RED goes in a new file; the existing one is 1,809 lines.

---

### `37-mutation-base.json` / `37-mutation-after.json`

**Analog:** `.planning/milestones/v1.3-phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-mutation-base.json` (shape) and its writer at `34-01-PLAN.md` Task 1 step 3 (line 148; a `node --input-type=module -e '...'` one-liner reading `reports/mutation-devtools/mutation.json`, refusing a report older than any file under `packages/devtools/src|test`, args `measured -- unmeasured -- new -- deleted`). Reuse it with `OUT` pointed at `.planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-mutation-base.json`. Shape:
```json
{ "measured": { "packages/devtools/src/model/TimelineFeed.ts": 1 },
  "unmeasured": {}, "new": ["packages/devtools/src/model/SupersedingRun.ts"], "deleted": {} }
```
Score = (Killed+Timeout)/(Killed+Timeout+Survived+NoCoverage). Invocation: `pnpm exec stryker run stryker.devtools.mjs --mutate '<three stores>'` (the close adds the module). Measured at base: TimelineFeed 1.0, SimulationSession 0.9767, DiagnosticsFeed 0.9279. Commit alone, first, titled like `chore(37-01): mutation baseline for the superseding-run stores`. Do not hand-write the `measured` numbers from RESEARCH; the writer needs a fresh report. The `after` file is a flat `{path: score}` (see `34-mutation-after.json`).

---

### `spec/decisions/150-<slug>.md` + `index.yaml`

**Analog:** `spec/decisions/149-a-seed-is-held-by-its-question.md`. Document Control block:
```markdown
> | Document ID    | QADI-ADR-149                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-12                                     |
> | Status         | Accepted — amends ADR-QD-039, ADR-QD-103; reads ADR-QD-148 |
> | Change History | 1.0 (2026-11-12): Initial (CCR-QD-427)         |
```
Sections: `## Context`, `## Decision`, alternatives considered. Status for 150: "Accepted — amends ADR-QD-137" (+ reads ADR-QD-047, ADR-QD-099). `index.yaml` entry (tail of file; gate 10 requires Document ID == file number):
```yaml
  - id: "ADR-QD-149"
    file: "149-a-seed-is-held-by-its-question.md"
    title: "A seed is held by its question, and a registry holds only a grant to it"
    status: "Accepted — amends ADR-QD-039, ADR-QD-103; reads ADR-QD-148"
```
Content must state: finalizer order, held-fork repair (D-07, stronger form of RUN-05), unconditional stop (D-05), the `Scope.make("parallel")` caveat (documented limit only, A7).

### ADR-QD-137 amendment
**Analog:** its own 1.2 blockquote (`137-...md:128-134`); amend §7 (`:85-87`), point 3 (`:62-68`), point 4 (`:69-71`), Consequences (`:97-100`) with a dated blockquote; `spec-revise` bumps Revision.

### `spec/README.md` CCR-QD-428 row
**Analog:** CCR-QD-427 row (`spec/README.md:364`): `| CCR-QD-NNN | date | files (with Rev) | ARCH-NN. **Title.** prose |`. Name any unused reserved number in the row. Lands in the same plan as its first citation; then `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-14` per edited doc, then `node scripts/spec-revise.mjs --check`.

### BEH / INV / traceability
Analogs: BEH-QD-519/520 (`28-devtools-screens.md` Rev 1.20), INV-QD-317/318 (`invariants.md` end), CCR-QD-427's new test-file rows (`traceability.md`, rows `| packages/devtools/test/model/X.test.ts | BEH-... — what it proves |`). Suggested split (discretion): 521 superseded never lands / replaced interrupted; 522 unconditional stop; 523 close interrupts and a dying release is never reported; 524 pre-fork restart leaves newest live; 525 in-prefix restart leaves newest live. INV-QD-313's Source (`invariants.md:~3650`) restated to name the module; BEH-QD-461 (`29-devtools-simulator.md:836-870`) restated. `typescript` fences compile (`pnpm spec:examples`); use `ts` for fragments.

### `.changeset/<slug>.md`
**Analog:** `c3923156:.changeset/evaluation-options-stated-once.md` (patch). Not Breaking:
```markdown
---
"@qadi/devtools": patch
---

<one or two sentences: a restart from inside a store's own notification now leaves the newest run live; behaviour is otherwise unchanged.>
```

### `AGENTS.md` §10
Replace "`@effect/vitest`: `it.effect`, `it.scoped`, `it.layer`, `TestClock`." (line ~580) with `it.effect` (already provides a `Scope`), `it.layer`, `TestClock`, plus one sentence: to close a scope mid-test, `Scope.make()`, `Scope.provide(make, scope)`, `Scope.close(scope, Exit.void)` (as `TimelineFeed.test.ts:163-175`; `Scope.makeUnsafe()` also exists).

## Shared Patterns

### Two-step begin / publish / fork
**Source:** RESEARCH Code Examples 1-2. **Apply to:** all three stores. A one-call `run(effect)` is rejected (overwrites a synchronously reached `Live`/`Stopped` with `Starting`).

### Finalizer order
**Source:** `TimelineFeed.ts:126-134`. **Apply to:** the module only. `FiberHandle.make` then `Effect.addFinalizer` then `FiberHandle.runtime`; only guaranteed under the default sequential scope.

### Landed write guard
**Source:** `TimelineFeed.ts:142` (`if (mine !== generation) return`). **Apply to:** every `marking.accept` and `land`; becomes `if (!run.isCurrent(token)) return`. Stores never compare or do arithmetic on tokens (D-04).

### Closed guards stay in the stores
`TimelineFeed.restart` (`:160-162`), `DiagnosticsFeed.configure`/`restart` (`:240`, `:259-261`), `SimulationSession.start` (`:517`), via `run.closed()`.

### House budgets for new/changed source
No `Effect.fnUntraced`, `switch`, `as`, `!`, `any`, `Date.now`, `console`; `Effect.fn` only; verify with `node scripts/check-house-style.mjs` and `oxlint packages/devtools/src/model`.

### Gates per task
`pnpm exec vitest run --project devtools <file>` (from repo root), `pnpm typecheck`, `pnpm lint`; phase gate `pnpm check:pr < /dev/null`. Use `/usr/bin/grep` (zsh aliases grep to ugrep). Never run `node scripts/next-id.mjs`; reserved numbers confirmed free by grep.

## No Analog Found

| File / part | Role | Data Flow | Reason |
|-------------|------|-----------|--------|
| Held-fork slot + drain loop inside `SupersedingRun.ts` | model | event-driven | No existing code holds a nested fork until the outer start returns; base behaviour is the defect (6 REDs). Use RESEARCH Code Examples 1 (`starting`, `held`, `drain`), verified by P2-P6 and 1362/1362 tests. |
| `FiberHandle.setUnsafe` interrupt-after-install semantics | n/a | n/a | Library source: `node_modules/effect/src/FiberHandle.ts:402-409, 938-940`. |

## Metadata

**Analog search scope:** `packages/devtools/src/model`, `packages/devtools/test/model`, `packages/core/test/SharedComputation.test.ts`, `spec/decisions`, `spec/README.md`, `.changeset` history, `.planning/milestones/v1.3-phases/{34,36}-*`.
**Files scanned:** about 25 (targeted reads; large spec files and `SimulationSession.ts` not loaded, line anchors taken from RESEARCH which read them at HEAD = `637c0601` for src/spec/scripts).
**Pattern extraction date:** 2026-11-14
**Unchecked:** the 34 writer one-liner was truncated at 2,500 chars in my read; copy it whole from `34-01-PLAN.md:148`. The `SimulationSession.ts`, `DiagnosticsFeed.ts` line anchors come from RESEARCH, not re-read.
