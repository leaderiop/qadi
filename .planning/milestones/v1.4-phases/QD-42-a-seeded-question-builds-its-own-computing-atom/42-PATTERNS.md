# Phase 42: A seeded question builds its own computing atom - Pattern Map

**Mapped:** 2026-11-14 (tree at `fee2be27`, branch `arch-wave-9`)
**Files analyzed:** 2 new, 3 src modified, 1 test modified, 1 script, about 10 records, 3 mutation artifacts
**Analogs found:** all matched; every analog path below is git-tracked (`git ls-files` checked on `QuestionBook.ts`, `SeededDecision.ts`, ADR-149, tests). All `file:line` numbers are from the current tree, not the research.

The spike diff `.../scratchpad/spike-1b.diff` was used as reference only (its `SeededQuestion.ts` header and imports are good to copy; 1026 lines, `SeededQuestion.ts` at diff lines 370-622, its test at 837-1004).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/react/src/SeededQuestion.ts` (new) | atom-graph module (handle builder), package-private | event-driven (atom graph, registry-keyed state) | `packages/react/src/HydrationEngine.ts:610-779` (the code being moved) + header style of `SweepScheduler.ts:1-20`, `SeededDecision.ts:1-20` | exact (move) |
| `packages/react/test/SeededQuestion.test.ts` (new) | test, real atom runtime | request-response over a real registry | `packages/react/test/HydrationEngine.test.ts:54-194` (cases to convert), `packages/react/test/Hydration.lifetime.test.ts:1-75` (real registry, no DOM) | exact |
| `packages/react/src/HydrationEngine.ts` (mod) | codec | transform | itself | exact |
| `packages/react/src/QadiAtoms.ts` (mod) | atom set / adapter | request-response | itself | exact |
| `packages/react/test/HydrationEngine.test.ts` (mod) | test | transform | itself | exact |
| `packages/react/test/QadiAtoms.test.ts` (mod, add 1-3 tests) | test | real runtime | itself `:76-130` | exact |
| `scripts/check-house-style.mjs` (mod `:596-618`) | config/gate | batch | itself | exact |
| `packages/react/src/QuestionBook.ts` (mod, comments only) | doc | n/a | itself | exact |

## Pattern Assignments

### 1. `packages/react/src/SeededQuestion.ts` (new)

**Module header analog:** `SweepScheduler.ts:1-20` (one summary line, then why, then "Out of the barrel (AGENTS.md §9): ... is its one caller"), and `HydrationEngine.ts:1-25` (private-by-ADR paragraph, "imports nothing from X so no cycle (counting `import type` edges, ADR-QD-037)", "No `"use client"`: this must also run under a server render."). Copy the spike's header (spike-1b.diff:371-390): "One question's seed, the atom that computes its decision, and the atom a consumer reads." Doc-comment rule (AGENTS.md top): one-line summary first, the why after.

Barrel: nothing to do. `packages/react/src/index.ts` must not gain it; `Hydration.ts`, `QadiProvider.tsx:39,109`, `SweepScheduler.ts` are the precedents for package-private modules (`QadiProvider.tsx:106` comment shows how a type is re-exported by name only). Verify `/usr/bin/grep -c SeededQuestion packages/react/src/index.ts` = 0.

**Imports to copy** (AGENTS.md §1: `effect/*` namespace imports, `.ts` extensions, `import type` for types). From the two source files, the set the moved code needs:
- `HydrationEngine.ts:26-47` for the `@qadi/core` type block, `Option`, `AsyncResult`, `Atom`, `type AtomRegistry`, `type HydrationMismatchReporter` from `./DeveloperSignals.ts`, `HydrationEvent, emitHydration` from `./HydrationEvent.ts` (`:47`), `type ClientDecision, SeededDecision` and `permits` from `./SeededDecision.ts` (`:48-49`).
- `QadiAtoms.ts:23-27` for `CurrentSubject, evaluate`, `Effect`, and `type StandingEvaluationServices` (named directly; the `QadiRuntimeServices` alias at `QadiAtoms.ts:61` stays put). `isAllowed` comes from `@qadi/core` for `isMismatch` (`HydrationEngine.ts:82`).
- It must import nothing from `HydrationEngine.ts`, `QadiAtoms.ts`, `QadiProvider.tsx` (madge cycle, ADR-QD-037). `HydrationEngine.ts` will `import type { SeedSlot } from "./SeededQuestion.ts"`; `QadiAtoms.ts` imports `makeSeededQuestion`, `DECISIONS_KEY`, `type SeededQuestion`.

**Declarations that move (current location, then new home)** — all from `HydrationEngine.ts` unless noted:

| Declaration | Now | Importers (src and test, whole tree) |
|---|---|---|
| `isMismatch` | `HydrationEngine.ts:81-82` (exported) | only `HydrationEngine.ts:756` (the `read`); no other importer |
| `SeedSlot` | `HydrationEngine.ts:614-616` (exported interface) | `HydrationEngine.ts:619` (`HydrationSeedLookup`, stays), `:655`, `:770`; none in tests by name |
| `SeedGrant` (class, not exported) | `HydrationEngine.ts:627-629` | `:708-772` only |
| `AnnounceState` (interface, not exported) | `HydrationEngine.ts:643-650` | `:720-726` only |
| `SeededQuestion<E>` (interface) | `HydrationEngine.ts:653-658` | `QadiAtoms.ts:36` (import), `:326` (`makeQuestionBook<SeededQuestion<EvaluationError>>`), comment `:310`; `QuestionBook.ts:16` (comment only). The spike fixes `E = EvaluationError` and drops the type parameter |
| `makeSeededQuestion<E>` | `HydrationEngine.ts:692-779` | `QadiAtoms.ts:38,267`; `test/HydrationEngine.test.ts:24,57,77,101,128`; comment `HydrationEngine.ts:583` |
| `DECISIONS_KEY` | `QadiAtoms.ts:79` (module-private const) | `QadiAtoms.ts:295` (the computing atom, moves), `:371` (`invalidate`, stays: imports it back from `SeededQuestion.ts`) |
| `seededDecision` | `QadiAtoms.ts:262-303` (local closure) | `QadiAtoms.ts:329` only; deleted |
| `HydrationSeedLookup`, `InitialValues`, `HydrationMismatch(Reporter)` re-exports | `HydrationEngine.ts:51-52,62,619` | stay in `HydrationEngine.ts` (callers: `Hydration.ts:29-41`, `QadiProvider.tsx:39,109`, `QadiAtoms.ts:50`, `HydrationEngine.test.ts:25`) |

Doc comments to carry verbatim: `isMismatch` (`HydrationEngine.ts:73-80`), `SeedSlot` (`:603-613`), `SeedGrant` (`:621-626`), `AnnounceState` (`:631-649`), `makeSeededQuestion` (`:660-691`, including "Exactly one `Atom.readable` per question"). Add the one-line liveness pointer there (D-06): "liveness: `BookOptions.build`, `QuestionBook.ts`".

**Core pattern to copy** (the body is the moved code with the one structural change). Current `read` and seed lookup, `HydrationEngine.ts:705-779` (keep verbatim):

```typescript
const grantAtom = Atom.make<SeedGrant | undefined>(undefined).pipe(Atom.keepAlive);
const seeds = new WeakMap<SeedGrant, SeededDecision>();
// `getNodes`, never `get` ...
const seededIn = (registry: AtomRegistry.AtomRegistry): SeededDecision | undefined => {
  const node = registry.getNodes().get(grantAtom);
  if (node === undefined) return undefined;
  const held = node.valueOption();
  return Option.isSome(held) && held.value instanceof SeedGrant ? seeds.get(held.value) : undefined;
};
```

The computing atom to inline in place of `input.computedFor(seededIn)` (`HydrationEngine.ts:718`) is the `QadiAtoms.ts:271-295` body. Copy it exactly, including the "Read from the registry's grant without subscribing" comment (`:283-288`) at the `seededIn(get.registry)` call (this comment is what stops the `get(grantAtom)` trap, RESEARCH Pitfall 1):

```typescript
runtime.atom((get): Effect.Effect<Decision, EvaluationError, StandingEvaluationServices> => {
  const current = get(subject);
  if (current === undefined) return Effect.never;
  const seeded = seededIn(get.registry);
  return evaluate(policy, {
    ...(resource === undefined ? {} : { resource }),
    ...(seeded === undefined ? {} : { evaluationId: seeded.evaluationId }),
  }).pipe(Effect.provideService(CurrentSubject, current));
}).pipe(runtime.factory.withReactivity([DECISIONS_KEY]))
```

The reader's first statement replaces `input.track(get)` (`HydrationEngine.ts:733`) with `get.addFinalizer(live());` (the `QadiAtoms.ts:299-301` body). Keep `live()` first, before `announceStateFor(get.registry)` (`:735`) and `get(computed)` (`:736`). `read` stays the one `Atom.readable` (grep: exactly one code use plus one doc mention, count unchanged at 2 across `packages/react/src`).

Signature (D-03, spike): `makeSeededQuestion({ policy, resource, runtime: Atom.AtomRuntime<StandingEvaluationServices>, subject: Atom.Atom<AuthSubject | undefined>, report: HydrationMismatchReporter | undefined, live: () => () => void }): SeededQuestion`. `subject` is the final `keepAlive`/`withEquality` const (`QadiAtoms.ts:251-254` in the research numbering; the const is at `QadiAtoms.ts` where `const subject = Atom.make<AuthSubject | undefined>(undefined).pipe(Atom.withEquality(subjectsEqual), Atom.keepAlive)`), never a pre-pipe base (Pitfall 4; SD5 is the ordering pin).

**Forbidden-construct check (AGENTS.md §5a/§6):** no `switch`, `as`, `!`, `any`, `fnUntraced`, `async`, ambient clock. None of the moved code has any. `Match` is not needed. The new file adds no `AsyncResult` state read beyond the two budgeted ones (see Shared Patterns: `DECISION_READ_BUDGET`).

Optional D-08 reshape (Claude's discretion, must be measured, never assumed): replace `announceState`'s `WeakMap<AtomRegistry, AnnounceState>` (`HydrationEngine.ts:720-727`) with a `WeakSet<AtomRegistry>`. RESEARCH A1 marks the 57/61 estimate as ASSUMED.

---

### 2. `packages/react/test/SeededQuestion.test.ts` (new)

**Analogs:**
- Real runtime plus real subject atom: RESEARCH "Code Examples" (spike-1b.diff:837-1004). `Atom.runtime(EvaluationServicesNone)` is core's ready layer; there is no existing react test that calls `Atom.runtime(layer)` directly, only through `makeQadiAtoms(EvaluationServicesNone)` (`Hydration.lifetime.test.ts:12,120-130`, `QadiAtoms.test.ts:38`, `edges.test.tsx:41`, `GateRegistry.test.tsx:55`). `v4-reactivity-smoke.test.ts:174` ("Atom.runtime provides its layer to an atom's effect") is the one canary that builds `Atom.runtime`; use it for runtime/registry teardown idiom.
- Test file shape (header docblock, imports, `registries` array plus `afterEach` dispose): `Hydration.lifetime.test.ts:1-75` and `QadiAtoms.test.ts:1-75`:

```typescript
const registries: Array<AtomRegistry.AtomRegistry> = [];
const makeRegistry = () => { const registry = AtomRegistry.make(); registries.push(registry); return registry; };
afterEach(() => { for (const registry of registries.splice(0)) registry.dispose(); });
```

- Imports pattern (matches `HydrationEngine.test.ts:1-26`): `{ assert, describe, it } from "@effect/vitest"` for synchronous registry cases (the converted cases use `assert.*`), `vitest` `expect`/`vi`/`afterEach` as in `QadiAtoms.test.ts:28`. `SeededAllow`/`SeededDeny` fixtures are at `HydrationEngine.test.ts:35-52` (`allow` = `SeededAllow({ evaluationId: "e1", ... disclosure: { _tag: "Withheld" } })`, `deny` = `new Deny(...)`); copy them and the `admin`/`visitor` subjects from `makeSubject`.
- Convert, not rewrite, the four fake-`computedFor` cases (listed in item 2 below). The seam test titles from the spike: "carries the seed's evaluation id into the client's own evaluation (BEH-QD-186)"; "counts the question live before its computation reads the subject, once per computation" (records `["live"]`, then after a subject write `["live","release","live after subject"]`, Pitfall 5); "announces once per registry" (two registries, `reports.length === 2`); "reads the seed while the subject is unknown, drops it once the client answers" (`subject === undefined` gives `Effect.never` = `Initial`).
- The two trap tests (go RED under `get(grantAtom)`): "a seed given after the first read does not re-run the computation" (narrow with `Atom.isWritable(grantAtom)`, never `as`) and "an unhydrated question leaves no grant node, after a computation has run" (`unseeded.getNodes().has(grantAtom)` false, converted from `HydrationEngine.test.ts:162-168`).
- D-05 order: characterise first through `makeQadiAtoms` + `hydrate` (put those in `QadiAtoms.test.ts` or `Hydration.lifetime.test.ts` style; do NOT edit `Hydration.lifetime.test.ts`, it is pinned) on the base commit, then move to this file after the inversion.

---

### 3. `packages/react/src/HydrationEngine.ts` (becomes a pure codec)

Delete `:600-779` section ("The seed slot, and the atom that reads through it") except `HydrationSeedLookup` (`:619`, add `import type { SeedSlot } from "./SeededQuestion.ts"`) and its doc (`:617-618`). Delete `isMismatch` (`:73-82`).

Stale prose to fix in the same file:
- Header `:3-12`: "the slot in which a question keeps the seeds it was handed and the grant a registry holds to one, the rule that the client's own answer wins ... the once-per-registry announcement of a disagreement" and `QadiAtoms.ts`'s `seededDecision, tangled there with the liveness bookkeeping` (`:12`): rewrite to point at `SeededQuestion.ts`.
- `:583` `{@link makeSeededQuestion}` becomes a dangling link (the function is no longer in scope); point it at `SeededQuestion.ts` by name in prose.
- Imports now unused after the move (check with typecheck/lint, do not guess): `Atom` (still needed for `InitialValues` at `:62`), `Option`, `AsyncResult`, `permits`, `isAllowed`, `HydrationEvent`/`emitHydration` (the planners use them at `HydrationEngine.ts:735-760` only if the codec does not), `type AtomRegistry`, `ClientDecision`.

### 4. `packages/react/src/QadiAtoms.ts` (build becomes one call)

Delete `seededDecision` (`:262-303`) and `const DECISIONS_KEY` plus its doc (`:78-79`). Import changes at `:30-39`: drop `type SeededQuestion`, `makeSeededQuestion` from `HydrationEngine.ts`; import them and `DECISIONS_KEY` from `./SeededQuestion.ts`. Drop now-unused `CurrentSubject, evaluate` (`:26`) and possibly `Effect` only if `invalidate` (`:366-373`) does not use it (it does: `Effect.gen`). `DecisionCache, subjectEquivalence` stay.

Target of the build at `:326-330`:

```typescript
const book = makeQuestionBook<SeededQuestion>({
  signal: scheduler.request,
  capacity: options?.maxTrackedQuestions ?? DEFAULT_MAX_TRACKED_QUESTIONS,
  build: (question, live) =>
    makeSeededQuestion({ policy: question.policy, resource: question.resource, runtime, subject, report, live }),
});
```

`QadiRuntimeServices` (`:61`) does not move. The closure comment at `:308-319` ("`SeededQuestion` per question, from `HydrationEngine.ts`, holding its seed slot ...") must now say `SeededQuestion.ts`. The "liveness rule" statement at `:296-299` ("Marks this question live for as long as this computation stays cached. The count goes up first ... see `QuestionBook.ts`") goes with `seededDecision`; the one statement stays at `QuestionBook.ts:69-76`.

---

### 5. `packages/react/src/QuestionBook.ts` (comments only)

- Header `:15-18`: "`QadiAtoms.ts` is its one adapter: the handle is a `SeededQuestion`, and the reader's `get.addFinalizer` is wired to the `release` that {@link BookOptions.build}'s `live` returns." Correct: `QadiAtoms.ts` hands `live` to `makeSeededQuestion` (`SeededQuestion.ts`), whose reader calls it first and gives the release to `get.addFinalizer`. (The no-local-import rule at `:18-20` stays; `AskedQuestion` is declared at `:79-83`.)
- `BookOptions.build` doc, `:69-76`: this is the single place the liveness rule is stated (D-06). Keep. The "**Liveness.**" paragraph at `:22-34` is the explanation it points at; keep.
- `QuestionBook.ts` is in `stryker.react.mjs`'s mutate list (`:57`): comment-only edits cannot move its score but must be in the mutation re-check list for the close if touched.

---

### 6. `scripts/check-house-style.mjs` (budget keys move, count and name unchanged)

`:596-607` `DECISION_READ_BUDGET`: key `"packages/react/src/HydrationEngine.ts": 2` (`:605`) becomes `"packages/react/src/SeededQuestion.ts": 2`; the comment at `:599-604` ("Seed precedence and mismatch reporting (`makeSeededQuestion`'s `read`)") stays true. `:615-618` `DECISION_READ_BUDGET_NAMES`: `"packages/react/src/HydrationEngine.ts": ["makeSeededQuestion"]` (`:617`) becomes the `SeededQuestion.ts` key, same name. The check loop is `:1505-1520`. This is the only gate that fails on the move (3 violations until moved, per Pitfall 3). `HydrationEngine.ts` must then have zero `isInitial(`/`isSuccess(` reads (the two budgeted reads live in `read`; the codec has none).

---

## 2. The four fake-`computedFor` cases in `HydrationEngine.test.ts` (to delete, converted to `SeededQuestion.test.ts`)

All in `packages/react/test/HydrationEngine.test.ts` (479 lines):
1. `:55` it "runs `track` before any read of its own atoms, once per computation" (fake at `:57-67`, `computedFor: () => Atom.readable(...)` at `:61`; asserts `["track","computed"]`, now `live` first).
2. `:75` it "announces a disagreement once per registry, not once per question" (fake at `:81`).
3. `:98` it "reads the seed while the computed answer is still Initial, and drops it after" (fake at `:105`).
4. `:126-194` `describe("a seed slot gives each registry its own grant")`: one shared fake in the `question()` helper (`:129-135`, `computedFor` at `:132`) serving three `it`s at `:140`, `:148`, `:162`.

Imports to fix after deletion: `makeSeededQuestion` at `:24`; `Atom`, `AsyncResult`, `Decision`, `HydrationMismatch` (`:1,17-18,25`) only if now unused; `SeededAllow`/`SeededDeny` and `allow`/`deny` fixtures (`:35-52`) are likely only used by the moved cases (check). Cases that STAY (codec): `:196` onward (`dehydrateWith and hydrateWith ...`, `:298`, `:342`, `:407`). The mutation-closing case lands here: "a value that is not an envelope is refused whole and hands back no entries" (`hydrateWith(..., 42, ...)`, drops `[[[], true]]`; kills the `[]` mutant at `HydrationEngine.ts:488`, pre-edit numbering).

Other mutation-closing test goes in `QadiAtoms.test.ts` (new `it` after `:156`, in `describe("makeQadiAtoms")` `:76`): "counts a subject write as a change exactly when who is asking changed, undefined included" (subscribe to `atoms.subject`, write `undefined, reader, equal reader, undefined`, expect `[reader, undefined]`; kills the `a === b` mutant of `subjectsEqual`, `QadiAtoms.ts:233-234`). Use `collect` from `./support/collect.ts` and `settleTurns` as the existing cases at `:107-130` do.

## 3. Pins that must stay untouched (`git diff --stat <phase_base> -- <paths>` must print nothing)

All under `packages/react/test/`:

| File | Pinned titles (line) |
|---|---|
| `QadiProvider.test.tsx` | the render-sequence file: "Can / Cannot" `:51-168`, "hooks" `:170-250` (`useCan` `:177,182,187,196`, "follows the subject when it changes" `:226`), "atoms identity (DA-06)" `:251`, "isolated contexts" `:278`, "the bound under a provider" `:298` ("evicts a cold question past the bound, never a mounted gate's own" `:299`, "returns to the bound after the provider unmounts" `:326`) |
| `QadiProvider.seed.test.tsx` | SD1 `:74`, SD2 `:96`, SD3 `:118`, SD4 `:142`, SD5 `:166` (the ordering pin) |
| `Hydration.lifetime.test.ts` | HL1 `:77`, HL2 `:86`, HL3 `:96`, HL4 `:107`, HL5 `:120`, HL6 `:137`, HL7 `:151` |
| `QadiAtoms.sweep.test.ts` | S1 `:32` through S9 `:158` |
| `QadiProvider.sweep.test.tsx` | P1 `:46`, P2 `:71`, P3 `:108` (StrictMode), P4 `:136` (`<Activity>`), P5 `:166` |
| `QuestionBook.test.ts` | `:33-232` (keying, eviction), B1 `:259` through B8 `:351` |
| `SweepScheduler.test.ts` | C1 `:36` through C11 `:196` (one sweeper per atom set, no leaked fibers C7 `:116`) |
| `v4-reactivity-smoke.test.ts` | `:248` ("a recompute disposes and re-reads in one synchronous step"), `:270`, `:497`, `:521`, `:534`, `:559`, `:579` (registry-timing canaries INV-QD-317 cites) |
| `Hydration.test.ts` | "a hydrated denial reads as a denial, not as pending" `:549`, "DOES NOT LET A HYDRATED ALLOW OUTLIVE A CLIENT RE-CHECK THAT DENIES" `:560`, "keeps a seed across a collection that lands before the first read" `:625`, "a re-check continues the server's evaluation" `:1080-1135` (BEH-QD-186 already covered at the makeQadiAtoms level), mismatch suite `:795-1079` |
| also unchanged | `QadiProvider.signals/subject/production.test.tsx`, `HydrationRender.test.tsx`, `ServerRender.test.tsx`, `HydrationCounts.test.ts`, `HydrationPayload.test.ts`, the three `.tst.ts` files |

Verify command (phase_base from the first plan's SUMMARY): `git diff --stat <phase_base> -- packages/react/test/QadiProvider*.tsx packages/react/test/Hydration.lifetime.test.ts packages/react/test/QadiAtoms.sweep.test.ts packages/react/test/QuestionBook.test.ts packages/react/test/SweepScheduler.test.ts packages/react/test/v4-reactivity-smoke.test.ts packages/react/test/Hydration.test.ts`. Edited by design (not pinned): `HydrationEngine.test.ts`, `QadiAtoms.test.ts`, new `SeededQuestion.test.ts`. `scheduleTask`/`defaultIdleTTL` grep: only the base comment lines in `QadiProvider.tsx`.

## 4. Records the inversion makes stale (exact lines in the current tree)

No gate catches any of these except the budget keys; each needs its own `/usr/bin/grep` verify.

| Record | Line(s) | Stale text and fix |
|---|---|---|
| `AGENTS.md` §13 | `:646` (sentence `:642-648`) | "`HydrationEngine.ts`'s seed precedence, which chooses what the atom holds rather than reading it" becomes `SeededQuestion.ts`'s |
| `scripts/check-house-style.mjs` | `:605` and `:617` | the two `HydrationEngine.ts` keys, as in item 6. Comment `:599` stays |
| `spec/decisions/149-a-seed-is-held-by-its-question.md` | `:43` | "`makeSeededQuestion` (`HydrationEngine.ts`)" cited as file. Header: Revision `1.0` (`:8`), Change History `1.0 (2026-11-12): Initial (CCR-QD-427)` (`:13`). Add a dated amendment, do not edit `:43` |
| `spec/invariants.md` INV-QD-028 | `## ` `:1075`; Source `:1081-1086` ("`HydrationEngine.ts`'s `makeSeededQuestion`"); Enforcement `:1107` (`Hydration.test.ts`), add `SeededQuestion.test.ts` | Source to `SeededQuestion.ts` |
| INV-QD-105 | `## ` `:3220`; Source `:3228-3232` ("`QadiAtoms.ts` is its one adapter: `makeSeededQuestion`'s `track` calls `live()` first inside the reader and hands the idempotent release to `get.addFinalizer`"); Enforcement `:3244` | `track` is gone. Rewrite: `QadiAtoms.ts` hands `live` to `makeSeededQuestion`, whose reader calls it first and gives the release to `get.addFinalizer`. Add `SeededQuestion.test.ts` to Enforcement |
| INV-QD-317 | `## ` `:3727`; Source `:3731` ("`HydrationEngine.ts`'s `makeSeededQuestion` — the `seeds` `WeakMap` ..."); Enforcement `:3737` area | Source to `SeededQuestion.ts`; Enforcement add the new test file |
| INV-QD-318 | `## ` `:3741`; Source `:3745` ("`HydrationEngine.ts`'s `seededIn`"); Enforcement line below it | Source to `SeededQuestion.ts`; Enforcement add the trap test |
| `spec/behaviors/19-hydration.md` | BEH-QD-517 Source `:375`; BEH-QD-518 Source `:398`; also an amendment blockquote at `:329` ("the `announced` guard in `HydrationEngine.ts`'s `read`", a dated blockquote, i.e. history: leave) and prose `:161` ("Before, both builders were exported from `HydrationEngine.ts`", history: leave) | `:375` and `:398` Source lines only |
| `spec/traceability.md` | INV-QD-028 row `:111`; INV-QD-105 row `:131` ("`QadiAtoms.ts`'s `track` is its one adapter"); INV-QD-317 row `:161`; INV-QD-318 row `:162`; test-file row `:377` ("`track` runs before any read ..."); add a `SeededQuestion.test.ts` row near `:531-535` in file order; ADR-QD-149 row `:308`; Change History `:13` (currently 1.175) | each row's source cell and the test-file row |
| `packages/react/src/QuestionBook.ts` | `:15-18` and `:69-76` | item 5 |
| `packages/react/src/QadiAtoms.ts` | `:296-299`, `:308-319` | liveness statement and closure comment, items 4 |
| `packages/react/src/HydrationEngine.ts` | `:3-12`, `:583`, `:700-704` (`track` doc, deleted with the function) | items 3 |
| `packages/react/src/SeededDecision.ts` | `:11-12` ("imported by both `HydrationEngine.ts` and `DeveloperSignals.ts`") | now also `SeededQuestion.ts`; `QadiAtoms.test.ts:35`, `HydrationEngine.test.ts:26-27` are unaffected |
| `spec/decisions/140-...md` | `:100-101` edge list ("`QadiAtoms.ts` imports `GateRegistry.ts`, `HydrationEngine.ts`, ...") | an edge-list statement, not history; it gains `SeededQuestion.ts`. Decide: dated amendment or accept as the edge list "after the split" (it is dated by its own heading) |
| Leave alone (history) | ADR-QD-039 `:96`, ADR-QD-052 `:134` (dated blockquotes), ADR-QD-093 `:93,137` (budget counts at that date), ADR-QD-041 `:61`, ADR-QD-078 `:80,170`, ADR-QD-143 `:34,95`, ADR-QD-152 `:81,91`, spec/README CCR rows `:319-420` | decision text and CCR rows record what was true then |
| `spec/overview.md` | `:561` (`InitialValues`, declared in `HydrationEngine.ts`), `:568`, `:571` | unchanged: no public export or module column changes (all moved symbols are package-private; `QadiRuntimeServices` stays). Gate 13 (`pnpm spec:api`) confirms |

## 5. Format analogs for the records

**ADR-QD-155 (new):** copy `spec/decisions/154-one-value-to-text-function-exported-by-core.md` (116 lines): H1 `# ADR-QD-154 — <sentence-case title>`; the Document Control blockquote table (`Document ID QADI-ADR-154`, `Revision`, `Effective Date`, `Status Accepted`, `Author Qadi Engineering`, `Classification Architecture Decision Record`, `Change History`) at `:3-13`; sections `## Context`, `## Decision` (bold lead sentence plus "(ARCH-88, CCR-QD-432.)", numbered points), `## Alternatives considered` (bullets, bold name), `## Consequences`, `## Related` (relative links like `[ADR-QD-099](./099-entry-points-are-a-closed-list.md)`, `[INV-QD-021](../invariants.md#inv-qd-021-...)`). For ARCH-89 / CCR-QD-433 record 1a/1b/2/3 with RESEARCH's measured costs and the user's choice. Status for an amending ADR: ADR-149 uses `Accepted — amends ADR-QD-039, ADR-QD-103; reads ADR-QD-148` (`149:9`). It needs an index entry, `spec/decisions/index.yaml` (tail, the 154 block):

```yaml
  - id: "ADR-QD-154"
    file: "154-one-value-to-text-function-exported-by-core.md"
    title: "One value-to-text function, exported by core"
    status: "Accepted"
```

and a `spec/traceability.md` ADR row (`:307-308` shape: `| [ADR-QD-149](decisions/149-....md) | <title> | ...`). Plan 41-01 line 178-179 shows the exact add order (index.yaml, traceability §3 row after the ADR-QD-153/154 row, README CCR row).

**Dated amendment to ADR-QD-149:** two house styles exist.
- A heading section appended at the end, before `---`/after Consequences: ADR-QD-103 `:97-110`:

```markdown
## Amendment (2026-11-12, ADR-QD-149, CCR-QD-427)

A seed is held by the question's handle, not by a registry node, so ... ([ADR-QD-149](./149-a-seed-is-held-by-its-question.md)). The book is
unchanged. The rest of this decision is unchanged.
```

  ADR-QD-037 `:220-232` is the most recent (`## Amendment (2026-11-14, ADR-QD-152, CCR-QD-430)`). Use this form: `## Amendment (2026-11-14, ADR-QD-155, CCR-QD-433)`, saying `makeSeededQuestion` now lives in `SeededQuestion.ts`, the `WeakMap`, `grantAtom`, `seededIn` and the `announced` guard are unchanged, the rest unchanged.
- Blockquote style `> **Amended 2026-11-10 (CCR-QD-398).** ...` is the inline form (ADR-QD-024 `:125`, ADR-QD-022 `:64`).
- The document's Revision and Change History are bumped mechanically (below), with an entry in the form seen at ADR-103 `:13` ("Amendment: a seed is held by the handle, not a registry node (ADR-QD-149, CCR-QD-427)"). Also add a pointer from the Document Control Status line only if the status changes; ADR-103's own did not.

**`spec/README.md` CCR row:** table rows at `:368-369` (CCR-QD-431, CCR-QD-432), format `| CCR-QD-NNN | 2026-11-14 | <files with Rev, comma separated, "(new)" markers> | ARCH-NN. **<bold title>.** <two or three sentences of why, then the numbers that were unused> |`. Row text for CCR-QD-433 names ADR-QD-155 as used, ARCH-89, and BEH-QD-546..550 and INV-QD-329..330 as Unused (D-09). Insert after the CCR-QD-432 row (`:369`). Document Control Change History at `:13` is at 1.180; entries bump via `spec-revise`.

**Patch changeset:** `.changeset/hydration-drop-groups-derived.md` is the exact react analog:

```markdown
---
"@qadi/react": patch
---

`PayloadRefusalReason` and `EntryDropReason` are now read off ... Their members are unchanged, and ...
```

(also `.changeset/devtools-remedy-label-without-json.md` for `"@qadi/devtools": patch`). Name it like `react-seeded-question-owns-its-computing-atom.md`. No public surface changes, so no `upgrading.md` edit (WX-07). Listed in the CCR row as `(new, `@qadi/react` patch)`.

**`scripts/spec-revise.mjs`** (`scripts/spec-revise.mjs:1-60`): `node scripts/spec-revise.mjs <spec-doc.md> "<what changed>" --date 2026-11-14`. It bumps the minor version in both the `Revision` row and the newest `Change History` entry and prepends `<ver> (<date>): <entry>`. Without `--date` the second positional is treated as the date slot, so the entry text is dropped (the brief's warning); always pass `--date`. `node scripts/spec-revise.mjs --check` (run by `pnpm spec:verify`) fails when Revision differs from the newest history entry, so every edited spec doc (invariants, behaviors/19-hydration, traceability, README, ADR-149, ADR-155's own 1.x) needs a bump after the edit. Verify with `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict`. The phase 41 plan example is `41-01-PLAN.md:178-184`.

## 6. Mutation

**`stryker.react.mjs`:**
- Config: `jsonReporter: { fileName: "reports/mutation-react/mutation.json" }` (`:49`); default `mutate` list `:55-60` is exactly `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `SweepScheduler.ts`. `QadiAtoms.ts`, `HydrationEngine.ts` and `SeededQuestion.ts` are NOT in it; the phase passes them only via `--mutate` (D-08), so `stryker.react.mjs` itself is not edited and the report holds only those three files. `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `thresholds break: 80` (an exit 1 after "below breaking threshold" with a report written is not a failed run, 41-01 step 3). The header comment (`:1-26`) says "and nothing else in that package"; leave it.
- Invocation, base and close identical (D-08; one run at a time, in the background per ADR-QD-098):
  `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/QadiAtoms.ts,packages/react/src/HydrationEngine.ts,packages/react/src/SeededQuestion.ts'`
  (on the base commit `SeededQuestion.ts` does not exist and Stryker only warns, as for `ValueText.ts` in 41-01).

**Base file shape and writer:** `.planning/phases/QD-41-one-guarded-value-to-text-function/41-mutation-base.json`:

```json
{ "measured": { "<path>": <score> }, "unmeasured": {}, "new": ["packages/core/src/ValueText.ts"], "deleted": {} }
```

Writer: the `node --input-type=module -e '...'` one-liner at `41-01-PLAN.md:151` (step 4). Retarget `OUT`, `RUNS` to one entry `["stryker.react.mjs","reports/mutation-react/mutation.json",[the three files],["packages/react/src","packages/react/test"]]`. It refuses a stale report (older than the newest file under the watched dirs), a report mutating other files, a config reporting elsewhere, and a mutated file not in the config's `mutate` set. That last check fails for the three files here (they are not in `stryker.react.mjs`'s `mutate` glob), so the retargeted writer must skip or relax that one check, since `--mutate` overrides the config. Score rule: `(Killed+Timeout) / (Killed+Timeout+Survived+NoCoverage)`; an existing file with no report entry reads 1; an absent file goes to `new`. For D-08, `SeededQuestion.ts` is recorded as moved, with the five named survivors as its base (the `SeedGrant.kind` string, the two `Option.isSome(held) && … instanceof SeedGrant` mutants, `{ announced: false }` to `{}`, the resource conditional), not `new` at score 1. Commit alone as `chore(42-0N): mutation baseline ...`. Research base numbers (to be re-measured, not copied): HE 226/231 = 0.9784, QA 52/58 = 0.8966; survivors HE 488:93, 716:12 x2, 628:19, 724:36; QA 234 x5, 291:19.

**Comparer at close:** `41-06-PLAN.md:152` (and the check of baseline-in-one-commit: `git log --format=%H -- <base.json>` must be 1 commit; the "unbaselined" file scan over `git diff --name-only <phase_base> -- packages`). It writes `NN-mutation-after.json` as a flat `{path: score}`. For this phase, retarget to the three files, replace "NEW FILE BELOW 1" with the survivor-set rule for `SeededQuestion.ts`, keep "DROP" for the other two (must not fall below base: HE 0.9784, QA 0.8966).

**Milestone re-verify bases (`NN-mutation-after.json`, flat `{path: score}`):**

| Phase | File | Scores |
|---|---|---|
| `.planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-mutation-after.json` | devtools `model/TimelineFeed.ts` 1, `DiagnosticsFeed.ts` 0.9473684210526315, `SimulationSession.ts` 0.9818731117824774, `SupersedingRun.ts` 0.9433962264150944 |
| `.planning/phases/QD-38-the-sink-wire-version-stated-once/38-mutation-after.json` | core `SinkCodec.ts` 0.9751552795031055, `SinkWire.ts` 1 |
| `.planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-mutation-after.json` | core `HydrationMetrics.ts` 1, react `HydrationEvent.ts` 1 |
| `.planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-mutation-after.json` | core `SinkCodec.ts` 0.9754601226993865 (supersedes 38's), `SinkWire.ts` 1, devtools `model/Source.ts` 1, audit `AuditEntry.ts` 1 |
| `.planning/phases/QD-41-one-guarded-value-to-text-function/41-mutation-after.json` | core `Explanation.ts` 0.9875, `ValueText.ts` 1, devtools `Remedies.ts` 1, `Filters.ts` 1, `SimulationForm.ts` 0.9836660617059891 |

Use the latest phase's score per file (SinkCodec: 40's 0.97546..., not 38's). `QD-37/..37-mutation-survivors.json` also exists for 37.

**Milestone file list** (`git diff --name-only 637c0601 -- 'packages/*/src/*'`, 18 files, run this session) mapped to configs:

| Config | Files |
|---|---|
| `stryker.config.mjs` (core; `mutate` `packages/core/src/**/*.ts` minus `index.ts`, report `reports/mutation/mutation.json`) | `core/src/{Explanation,HydrationMetrics,SinkCodec,SinkWire,ValueText}.ts` (`core/src/index.ts` is excluded) |
| `stryker.devtools.mjs` (`packages/devtools/src/model/**/*.ts`, `reports/mutation-devtools/mutation.json`) | `devtools/src/model/{DiagnosticsFeed,Filters,Remedies,SimulationForm,SimulationSession,Source,SupersedingRun,TimelineFeed}.ts` (`devtools/src/index.ts` is outside `model/`: no entry) |
| `stryker.audit.mjs` (`packages/audit/src/**/*.ts`, `reports/mutation-audit/mutation.json`) | `audit/src/AuditEntry.ts` |
| `stryker.http.mjs` (`packages/http/src/**/*.ts`, `reports/mutation-http/mutation.json`) | `http/src/DecisionStreamRoute.ts` (comment-only change in `12a9cd6b`; no base exists, record as comment-only or measure at `637c0601`) |
| `stryker.react.mjs` (`reports/mutation-react/mutation.json`) | `react/src/HydrationEvent.ts` (default list) plus this phase's three files via `--mutate` |

`stryker.predicate-sql.mjs` and `stryker.predicate-prisma.mjs` have no milestone files. `pnpm mutation` (`package.json:28`) runs all seven configs, but the close's re-check is one config at a time with `--mutate` limited to the milestone files.

## Shared Patterns

### Package-private module out of the barrel
**Source:** `packages/react/src/SweepScheduler.ts:1-20` and `packages/react/src/HydrationEngine.ts:14-25`; AGENTS.md §9 (closed `exports` map; gates 13 and 14). **Apply to:** `SeededQuestion.ts`. The module header names who imports it, that it imports nothing back up (ADR-QD-037), and "No `"use client"`" (server render). `QadiAtoms.ts` is the one with `"use client"` (`:1`).

### `DECISION_READ_BUDGET`
**Source:** `scripts/check-house-style.mjs:596-618`, loop `:1505`. **Apply to:** `SeededQuestion.ts` (2 reads: one `isInitial` and one `isSuccess` in `read`), zero elsewhere. A new `AsyncResult` state read in any new file fails the gate; the sole allowed two are the moved ones.

### Atom discipline (AGENTS.md §13)
Decisions live in atoms; exactly one `Atom.readable` per question; the grant atom is never read through `get`, only `registry.getNodes()` (INV-QD-318); `live()` is the reader's first statement; no `scheduleTask`/`defaultIdleTTL`; atoms keyed structurally by the book. Test the graph, not the DOM (`QadiAtoms.test.ts:1-7` header).

### Test teardown
`afterEach` disposing a `registries` array (`QadiAtoms.test.ts:56-64`, `Hydration.lifetime.test.ts:59-64`).

## No Analog Found

None. Closest to "no analog": a direct `Atom.runtime(layer)` unit test with no `makeQadiAtoms`. `v4-reactivity-smoke.test.ts:174,415` are the only direct `Atom.runtime` canaries, and the spike's `SeededQuestion.test.ts` (diff `:837-1004`) is the template.

## Metadata

**Analog search scope:** `packages/react/src`, `packages/react/test`, `scripts/`, `spec/` (decisions, invariants, behaviors/19, traceability, README), `.changeset`, `stryker*.mjs`, `.planning/phases/QD-37..42`.
**Files scanned:** about 45. **Pattern extraction date:** 2026-11-14.
**Caveats:** research line numbers for `QadiAtoms.ts` and `HydrationEngine.ts` are from `c0aa00fe`; this document uses the tree at `fee2be27` (the AGENTS.md sentence is at `:646`, not `:645-647`; the INV-QD-105 Source at `:3228-3232` matches). The `subject` const location in `QadiAtoms.ts` was not line-pinned; locate it with `/usr/bin/grep -n "const subject = Atom.make" packages/react/src/QadiAtoms.ts`.
