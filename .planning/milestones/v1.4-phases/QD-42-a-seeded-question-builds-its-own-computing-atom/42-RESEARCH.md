# Phase 42: A seeded question builds its own computing atom - Research

**Researched:** 2026-11-14
**Domain:** `@qadi/react` internals (`effect/reactivity` atoms, question book, hydration seed) — a refactor behind a human checkpoint
**Confidence:** HIGH for the measured spike numbers and the record inventory; MEDIUM for the recommendation, because it is a design choice the human makes

## Summary

All three code options were built in throwaway worktrees from HEAD `c0aa00fe` and measured the same way. Each one passes `pnpm typecheck`, `pnpm lint` and `pnpm circular`. Each also passes the whole react suite with no pinned test file edited, so the render sequences in `QadiProvider.test.tsx`, SD1-SD5, HL1-HL7 and the sweep and eviction suites hold untouched. Option 1b also passed `pnpm check:pr` (exit 0, 110 s, `30 passed (6.9s)` Playwright, `react/src` coverage 99.53/98.08/98.55/99.48) and `pnpm example` (30 passed). effect 4.1.2 does not block the inversion: 1a and 1b build and pass. It does not force it either: the base works. **[VERIFIED: spike runs this session]**

Without new tests, the inversion lowers the per-file Stryker ratios only because it deletes the well-tested indirection (`computedFor`/`track`). The surviving mutants simply move with the code. Two small, real tests (an equal-subject write, and a non-envelope payload handing back no entries) put both files back at or above base. In 1b, `HydrationEngine.ts` becomes a pure codec at **1.0000 (183/183)**. The one real cost of 1b's mutation result is the new `SeededQuestion.ts`. It scores 0.9194 (57/62), because it carries the base's own five equivalent survivors. Under the "new file must score 1" rule used in Phases 37 and 41 it would fail, so the base needs a "moved, not new" rule for this file (see Pitfalls).

The ADR picture is narrower than `_WAVE9-CONTEXT.md` says. ADR-QD-148 names none of `makeSeededQuestion`, `computedFor` or `seededIn`. ADR-QD-149 names `makeSeededQuestion (HydrationEngine.ts)` only as the seed's home. ADR-QD-103 says only "the atom set is its one adapter", with no file. A go needs no ADR reversal. It needs INV Source/Enforcement updates, and for 1b a dated file-citation amendment to ADR-QD-149. R4 also claimed `QadiRuntimeServices` must move down. That is **false**: it is a public alias of core's `StandingEvaluationServices`, so the moved code names core's type directly. Only `DECISIONS_KEY` must move. Importing it back up was probed and does produce a madge cycle.

**Primary recommendation:** **Option 1b** (invert into `packages/react/src/SeededQuestion.ts`). The evidence favours it on the project's own terms. It is the most complete answer: the seed-to-evaluation link sits in one module, it is tested through a real `Atom.runtime(Layer)`, and `HydrationEngine.ts` is left a pure codec at a mutation score of 1.0. Its extra cost over 1a is bookkeeping only: two budget keys, one AGENTS.md sentence, Source lines and one ADR amendment. No gate fails without that bookkeeping. `check:pr` was green with every spec citation stale, so the plan must check those edits explicitly.

### Per-option evidence (SEED-01)

| | 1a invert in place | 1b invert into `SeededQuestion.ts` | 2 seed holder first | 3 reject |
|---|---|---|---|---|
| Spiked | yes | yes (1a + extraction) | yes | prose only (not spiked) |
| src lines (`git diff --numstat`, add/del) | HydrationEngine +50/-18, QadiAtoms +13/-57 | HydrationEngine +7/-198, QadiAtoms +14/-60, **SeededQuestion.ts +247 (new)**, check-house-style +2/-2 | HydrationEngine +47/-32, QadiAtoms +8/-17 | 0 code; comments only (see Open Q 1) |
| src total lines (base 1177 = 779 + 398) | 1165 (-12) | 1187 (+10; HE 588, QA 352, SQ 247) | 1183 (+6) | 1177 |
| test lines | HydrationEngine.test +108/-75, QadiAtoms.test +12 | HydrationEngine.test +17/-139, **SeededQuestion.test.ts +162 (new)**, QadiAtoms.test +12 | HydrationEngine.test +29/-14 | 0 |
| Exports that move | `DECISIONS_KEY` QadiAtoms → HydrationEngine (package-private). `SeededQuestion<E>` loses `<E>` (fixed to `EvaluationError`). `QadiRuntimeServices` **does not move** | `DECISIONS_KEY`, `SeededQuestion`, `makeSeededQuestion`, `SeedSlot`, `SeedGrant`, `isMismatch` → `SeededQuestion.ts`. `HydrationSeedLookup` stays (imports `type SeedSlot`) | new `SeedHolder`, `makeSeedHolder` in HydrationEngine | none |
| Fake `computedFor` removed | all 4 (HydrationEngine.test.ts:57, 77, 101, 128) → real runtime | all 4 → real runtime, moved to `SeededQuestion.test.ts` | callback gone, but the 4 cases still pass a **fake `computed` atom** (`Atom.readable`) | none (fake stays) |
| `makeSeededQuestion` takes a function that receives a function | no (`live: () => () => void` receives nothing) | no | no | yes (`computedFor(seededIn)`, `track(get)`) |
| Seed-to-evaluation link in one module | yes (HydrationEngine) | yes (SeededQuestion) | **no**: the computing atom stays in QadiAtoms | no |
| typecheck / lint / circular | 0 / 0 / 0 | 0 / 0 (after the budget key move) / 0 | 0 / 0 / 0 | n/a |
| react suite (base 32 files, 498 tests) | 32 / 503, 0 fail | 33 / 503, 0 fail | 32 / 499, 0 fail | n/a |
| Render-sequence diff | none (no pinned test file edited, all pass) | none | none | none |
| `pnpm example` (30 e2e) | not run (same code as 1b) | **30 passed** | not run | n/a |
| `pnpm check:pr` | not run | **exit 0**, 110 s | not run | n/a |
| Mutation, no new tests (base HE 0.9784 226/231, QA 0.8966 52/58) | HE 0.9755 (239/245) ↓, QA 0.8750 (35/40) ↓ | not measured without tests | HE 0.9784 (227/232) =, QA 0.8909 (49/55) ↓ | unchanged |
| Mutation, + 2 closing tests | **HE 0.9796 (240/245), QA 0.9000 (36/40)**, both ≥ base | **HE 1.0000 (183/183), QA 0.9000 (36/40), SQ 0.9194 (57/62) new** | QA closable by the same subject test (shown in 1a) | n/a |
| Records cost | INV-028/105/317/318 Source+Enforcement, traceability rows, QuestionBook header comment | 1a's + DECISION_READ_BUDGET/_NAMES keys, AGENTS.md §13 sentence, ADR-149 dated amendment, BEH-517/518 Source lines | INV-105 Source (`track` gone); ADR-149 still true | ADR-QD-155, CCR row naming the unused numbers |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| A question's identity, liveness count, eviction | `QuestionBook.ts` (react, no `effect/reactivity`) | — | ADR-QD-103; unchanged by every option |
| Seed holding (grant, `WeakMap<SeedGrant,…>`) | the seeded question (HydrationEngine today; SeededQuestion.ts in 1b) | — | ADR-QD-149; survives every option |
| Computing atom (`runtime.atom` + `evaluate`) | QadiAtoms today; the seeded question in 1a/1b | — | the point of the phase |
| Seed precedence and mismatch announcement (`read`) | the seeded question | `HydrationEvent.ts` (counting) | INV-QD-028, DECISION_READ_BUDGET |
| Payload codec (`dehydrateWith`/`hydrateWith`) | HydrationEngine.ts | `Hydration.ts` (public names) | unchanged |
| Runtime, subject atom, sweep, `invalidate` | QadiAtoms.ts (`makeQadiAtoms`) | — | stays the atom set's |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEED-01 | Spike evidence per option before asking | The table above; spike diffs at `…/scratchpad/spike-1a.diff`, `spike-1b.diff`, `spike-2.diff` (session scratch, may be gone) |
| SEED-02 | First plan presents R4 options, records the human decision before any source change | "Plan shape" → Plan 1; the question text below |
| SEED-03 | On go: no function receiving a function; link tested through a real atom runtime; liveness rule stated once | 1a/1b spike seam tests (Code Examples); liveness pointer pattern |
| SEED-04 | On go: every pin holds (render sequences, seed/lifetime/sweep suites, 30 e2e, INV-028/105/317/318, `maxTrackedQuestions` proofs, no `scheduleTask`/`defaultIdleTTL`) | 1b check:pr + example green; pinned test files untouched in all spikes |
| SEED-05 | On reject: ADR-QD-155, no source changes, CCR row names unused numbers | Option 3 section; Open Q 1 (comment de-dup vs "no source file changes") |
| SEED-06 | Final sweep over 37-41 + milestone re-verify with a mutation re-check of touched files | "Last plan" section; corrected `git diff` pathspec; file → Stryker config map |
| WX-01 | `pnpm check:pr < /dev/null` green per phase | measured green on 1b (110 s) |
| WX-02 | Records with reserved numbers only, no `next-id.mjs` | numbers confirmed free (below) |
| WX-03 | overview names every added/removed export; module column by hand | no `spec/overview.md` row changes on any option (all moved symbols are package-private; `QadiRuntimeServices` stays `QadiAtoms.ts`) |
| WX-04 | no new `as`/`!`/`any`/`switch`/`fnUntraced`/async/ambient | spikes added none; the late-seed test narrows with `Atom.isWritable`, not `as` |
| WX-05 | coverage and per-file Stryker ≥ base, drop closed by a test | measured deltas and the two closing tests; the new-file rule (Pitfall 2) |
| WX-06 | characterisation/regression test before behaviour change | the real-runtime seam tests are green on the base shape too; the two trap tests go RED under the trap (measured) |
| WX-07 | public break → Breaking changeset + upgrading.md | no public surface changes on any option → `@qadi/react` **patch** changeset only on a go |
</phase_requirements>

<user_constraints>
## User Constraints

No `42-CONTEXT.md` exists, so the human checkpoint is the discuss step. The constraints come from ROADMAP.md (Phase 42), `_WAVE9-CONTEXT.md` and `_SHARED-CONTEXT.md`.

### Locked
- The phase opens on `checkpoint:decision`. Plan 1 is evidence and options only, with no code. It asks one `AskUserQuestion`, records the answer before any source change, and stays quiet through stop-hook repeats.
- The options are 1a, 1b, 2 and 3 exactly as R4 consolidates them. The ADR conflict is stated as it is. No nonexistent effect limitation is presented.
- On a go: the same `--mutate` list at base and close; real-runtime seam tests before the fakes are deleted; RED for "no node for an unhydrated question" and "a late seed does not re-run the computation"; the timing traps (below); pins untouched; `pnpm example`.
- On a reject: ADR-QD-155, no source change, and a CCR row that names the unused numbers.
- The last plan is the cross-phase stale sweep over 37-41 plus a named milestone re-verify with a mutation re-check of every touched file.
- House rules (`_SHARED-CONTEXT.md`): strict phase order, `/usr/bin/grep`, negative gates scoped to added lines, the XC-05 mutation comparison, never `next-id.mjs`, no release.
- User preferences (memory): prefer complete over simple, breaking changes OK, compatibility never the tiebreaker, closed unions, no `Record<string, unknown>` widening, ask once when blocked.

### Claude's Discretion
- The recommendation among 1a/1b/2/3, and the plan shape for each.

### Deferred
- None stated for this phase.
</user_constraints>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- §1 `effect/*` namespace imports, `.ts` relative imports, `import type` for type-only imports. Spikes: `import * as Effect from "effect/Effect"` added to the module that builds the computing atom.
- §2/§3 `Context.Service` and top-level layer consts are untouched. No service is added.
- §5 `Effect.fn` for effectful functions. The computing atom's reader returns an `Effect` value built by `evaluate(...)`, exactly as at base, so nothing new needs `Effect.fn`.
- §5a no new `switch`. §6 no `as`/`!`/`any`, `async`, `Date.now`. The spike late-seed test uses `Atom.isWritable` to narrow.
- §9 out of the barrel means package-private: `SeededQuestion.ts` must not be added to `index.ts`. `Hydration.ts` keeps re-exporting by name only.
- §10 `@effect/vitest`; react coverage ≥ 90 %.
- §11 spec is normative: a Source change goes to invariants/behaviours/traceability in the same change.
- §13 decisions live in atoms. `DECISION_READ_BUDGET` is exact in both directions with a `_NAMES` guard. No `scheduleTask`/`defaultIdleTTL`. Atoms are keyed structurally. Test the graph, not the DOM.
- ADR-QD-037: madge counts `import type` edges, so a module may not import back up.

## The ADR picture, as written (question 2)

- **ADR-QD-148** (`spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md`). A grep for `makeSeededQuestion|computedFor|seededIn|track|live()|adapter|QadiAtoms.ts|HydrationEngine` finds **no** hit. It speaks only of `QuestionBook` signalling, `SweepScheduler`, and the dispose-then-reread window. Every option leaves it true as written. [VERIFIED: grep + read this session]
- **ADR-QD-149** `:43-44`: "`makeSeededQuestion` (`HydrationEngine.ts`) keeps a `WeakMap<SeedGrant, SeededDecision>` per question". That is the only file citation. The `WeakMap`, the keepAlive `grantAtom`, `seededIn` via `registry.getNodes()` and the `announced` guard are kept verbatim in 1a, 1b and 2. 1a leaves the citation true. 1b makes it stale, which calls for a dated amendment in the style `ADR-QD-103`'s amendments already use, with the earlier text unchanged. [VERIFIED: read]
- **ADR-QD-103** `:38-40`: "The atom set is its one adapter: the handle is a `SeededQuestion`, and the reader's `get.addFinalizer` is the release `live()` returns." It names no file and no `track`. In 1a/1b the reader that calls `get.addFinalizer(live())` moves into `makeSeededQuestion`, but `makeQadiAtoms` still builds the book and hands `live` through. The sentence stays true. An optional clarifying amendment is possible, but none is required. [VERIFIED: read]
- **INV-QD-105 Source** (`spec/invariants.md:3228-3232`) is the text that names the old shape: "`packages/react/src/QadiAtoms.ts` is its one adapter: `makeSeededQuestion`'s `track` calls `live()` first inside the reader and hands the idempotent release to `get.addFinalizer`". It becomes false on 1a, 1b and 2, because `track` is gone in all three.
- **INV-QD-028 Source** (`:1081`), **INV-QD-317 Source** (`:3731`), **INV-QD-318 Source** (`:3745`) cite `HydrationEngine.ts`. They stay true on 1a and 2 and go stale on 1b. Each INV's Enforcement gains the real-runtime seam tests on any go.
- **Conclusion:** a go is INV Source/Enforcement updates plus one dated amendment to ADR-QD-149 (1b only). There is no reversal. ADR-QD-155 is **Unused** on a go unless the human wants the inversion itself recorded as a decision. That is reasonable for 1b, which creates a module boundary, and is Open Q 2.
- **effect 4.1.2.** The APIs the inversion uses are all public and used at base: `Atom.AtomRuntime<R>` (`node_modules/.pnpm/effect@4.1.2/.../src/reactivity/Atom.ts:746`), `runtime.factory` (`:747`), `get.addFinalizer` (`:184`), `get.registry` (`:205`), `registry.getNodes()`. The 1a and 1b spikes compiled and passed, which **refutes** any "effect blocks it" claim. The base already works, which refutes "effect forces it". [VERIFIED: spike]

## Why each code shape looks the way it does

**1a/1b signature** (spike, compiled):

```ts
// Source: spike 1a/1b, this session
export const makeSeededQuestion = (input: {
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly runtime: Atom.AtomRuntime<StandingEvaluationServices>; // core's type; QadiRuntimeServices is its alias
  readonly subject: Atom.Atom<AuthSubject | undefined>;           // the FINAL keepAlive/withEquality atom
  readonly report: HydrationMismatchReporter | undefined;
  readonly live: () => () => void;                                 // BookOptions.build's own type
}): SeededQuestion => { /* grantAtom, seeds, seededIn, computed = runtime.atom(...).pipe(withReactivity([DECISIONS_KEY])), read */ };
```

`QadiAtoms.ts` `build` becomes `(question, live) => makeSeededQuestion({ policy: question.policy, resource: question.resource, runtime, subject, report, live })`. The 42-line `seededDecision` closure (`QadiAtoms.ts:262-303`) is deleted. The reader's first line is `get.addFinalizer(live());`, which keeps `live()` first. Exactly one `Atom.readable` per question remains: `grep -c 'Atom.readable'` is unchanged at 2 (one code, one doc mention) in every spike.

**Why `DECISIONS_KEY` must move and `QadiRuntimeServices` need not.** `invalidate` (`QadiAtoms.ts:367-373`) still uses `DECISIONS_KEY`, so it must be declared where the computing atom lives and imported up. Probe: keeping it in `QadiAtoms.ts` and importing it into `HydrationEngine.ts` gives

```
✖ Found 1 circular dependency!
1) react/src/QadiAtoms.ts > react/src/HydrationEngine.ts
```

[VERIFIED: falsification probe, pasted]. `QadiRuntimeServices` is `export type QadiRuntimeServices = StandingEvaluationServices;` (`QadiAtoms.ts:61`). The moved code uses `StandingEvaluationServices` from `@qadi/core`, so the public alias, its `spec/overview.md:568` row and `DevtoolsFeed.ts:46` stay put. [VERIFIED: read + spike typecheck]

**Option 2 shape** (spike). Adds `SeedHolder extends SeedSlot { seededIn }` and `makeSeedHolder()` in HydrationEngine. `makeSeededQuestion({ policy, resource, seeds, computed, report, live })`. QadiAtoms builds `seeds` then `computed` (reading `seeds.seededIn(get.registry)`). This removes the callback-receiving-a-callback and makes ADR-149's properties unit-testable with a bare registry. But the evaluation-id link stays in QadiAtoms and `makeSeededQuestion`'s tests still hand it a fake computing atom. SEED-03's "tested through a real atom runtime" is then met only at the `makeQadiAtoms` level, not at the question's seam.

**Option 3** (prose only). The three statements of the liveness rule are:
- `QuestionBook.ts:69-76`, the `BookOptions.build` doc. Its header `:21-34` explains why.
- `QadiAtoms.ts:296-299` ("Marks this question live … see `QuestionBook.ts`").
- `HydrationEngine.ts:700-704` (`track`'s doc).

A reject keeps `BookOptions.build`, and replaces the other two with a one-line pointer ("liveness: `BookOptions.build`, `QuestionBook.ts`"). ADR-QD-155 would record:
- Context: review #6, the inversion.
- Decision: keep the `computedFor`/`track` seam.
- Alternatives: 1a, 1b, 2, with this table's numbers.
- Consequences: the fake stays and the link stays split.
- The CCR row names BEH-QD-546..550 and INV-QD-329..330 as Unused.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A second seed store or lookup | a new map keyed by registry or subject | the existing `WeakMap<SeedGrant,…>` + `seededIn` via `registry.getNodes()` | ADR-149 alternatives A/K failed containment or leaked nodes |
| Reading the seed in the computation | `get(grantAtom)` | `seededIn(get.registry)` | adds a dependency, so a late seed re-runs evaluation and an unhydrated question gets a grant node (measured RED below) |
| A test runtime | a hand-written fake atom | `Atom.runtime(EvaluationServicesNone)` + `Atom.make<AuthSubject \| undefined>(undefined).pipe(Atom.keepAlive)` | `EvaluationServicesNone` is core's ready layer (`EvaluationServicesNone.ts:53`); `hasRole` settles synchronously |
| Mutation comparison | a fresh script | the 41-01/41-06 writer and comparer (`41-01-PLAN.md:151`, `41-06-PLAN.md:152`), retargeted | it already refuses stale reports, foreign files and re-baselines |

## Common Pitfalls

### Pitfall 1: the two timing traps are real, and the trap tests catch them
**What goes wrong:** the computing atom reads the seed with `get(grantAtom)`.
**Measured:** in spike 1a, replacing `seededIn(get.registry)` with `get(grantAtom)` turned exactly the two new trap tests RED:
- "a seed given after the first read does not re-run the computation": `AssertionError: expected Allow{ evaluationId: 'e1', … } to equal Allow{ …(7) }`
- "an unhydrated question leaves no grant node, after a computation has run": `expected true to be false`

The other 18 tests stayed green, so the existing suite alone would **not** catch the trap. [VERIFIED: spike run]
**How to avoid:** write both tests first (green on the go shape), and keep the comment at the read.

### Pitfall 2: per-file ratios penalise deleting well-tested indirection
**What goes wrong:** with no new tests, both files drop (1a: HE 0.9784→0.9755, QA 0.8966→0.8750). The killed `computedFor`/`track` mutants disappear and the survivors move. HydrationEngine gains the equivalent `resource === undefined ? {} : { resource }` survivor (core's `resource?: Resource` at `Question.ts:28` forbids passing `undefined`, so the conditional is needed and its `false` mutant is equivalent).
**How to avoid:** two tests close it, measured.
- `QadiAtoms.test.ts`: "counts a subject write as a change exactly when who is asking changed, undefined included". It subscribes to `atoms.subject` and writes `undefined, reader, equal reader, undefined`, expecting `[reader, undefined]`. It kills the `a === b` mutant of `subjectsEqual` (`QadiAtoms.ts:234`): QA 36/40 = 0.9000.
- `HydrationEngine.test.ts`: "a value that is not an envelope is refused whole and hands back no entries" (`hydrateWith(…, 42, …)`, `drops` = `[[[], true]]`). It kills the `[]`→`["Stryker was here"]` survivor at `HydrationEngine.ts:488`: HE 240/245 = 0.9796.

**1b's new file:** `SeededQuestion.ts` = 0.9194 (57/62). Its 5 survivors are the base's own, carried over: `SeedGrant.kind` string, the two `Option.isSome(held) && … instanceof SeedGrant` mutants, `{ announced: false }`→`{}`, and the resource conditional. All are equivalent. The same moved region scored 62/67 = 0.9254 at base. Phase 41's comparer fails any `new` file below 1, so the plan must record `SeededQuestion.ts` as **moved** (base = the 5 named survivors, gate = no survivor outside that set). Alternatively the code can be reshaped: replacing `AnnounceState`'s `{ announced: false }` map with a `WeakSet<AtomRegistry>` removes one equivalent mutant, for an estimated 57/61 = 0.934 ≥ 0.9254 [ASSUMED, not run]. Never re-baseline.

### Pitfall 3: no gate catches stale citations
Spike 1b passed `pnpm check:pr` with every spec Source still saying `HydrationEngine.ts`. The only gate that noticed the move was `DECISION_READ_BUDGET`/`_NAMES` (3 violations until the keys moved). Every Source, traceability and AGENTS.md edit needs an explicit `/usr/bin/grep` verify in the plan.

### Pitfall 4: identity of the subject atom
Hand `makeSeededQuestion` the `subject` const from `QadiAtoms.ts:251-254`, the object after `.pipe(Atom.withEquality(subjectsEqual), Atom.keepAlive)`, never a pre-pipe `Atom.make`. The spike passes `subject` from that const, and SD5 (the keep-subject-first ordering pin) stays green.

### Pitfall 5: `live()` must stay the reader's first statement
Spike seam test "counts the question live before its computation reads the subject, once per computation" records `["live"]`, then after a subject write `["live", "release", "live after subject"]`. That pins live-first and the synchronous dispose-then-reread order against the real runtime, with no fake `track`.

### Pitfall 6: the milestone file list command in the brief returns nothing
`git diff --name-only 637c0601 -- 'packages/*/src'` prints **nothing**. A wildcard pathspec must match the whole path. Use `'packages/*/src/*'` (verified: 18 files, listed below).

### Pitfall 7: option 3 vs "no source file changes"
De-duplicating the liveness prose edits comments in `QadiAtoms.ts` and `HydrationEngine.ts`. SC3/SEED-05 say "no source file changes" (Open Q 1).

## Code Examples

The real-runtime seam the planner should copy (green in spikes 1a and 1b; place it in `HydrationEngine.test.ts` for 1a, `SeededQuestion.test.ts` for 1b):

```typescript
// Source: spike 1a/1b this session (abridged)
const runtime = Atom.runtime(EvaluationServicesNone);
const questionOf = (input?: { readonly report?: (m: HydrationMismatch) => void; readonly live?: () => () => void }) => {
  const subject = Atom.make<AuthSubject | undefined>(undefined).pipe(Atom.keepAlive);
  const q = makeSeededQuestion({
    policy: hasRole("admin"), resource: undefined, runtime, subject,
    report: input?.report, live: input?.live ?? (() => () => {}),
  });
  return { q, subject };
};

it("carries the seed's evaluation id into the client's own evaluation (BEH-QD-186)", () => {
  const { q, subject } = questionOf();
  const registry = AtomRegistry.make({ initialValues: [q.seed.hold(allow), [subject, admin]] });
  registry.mount(q.read);
  const result = registry.get(q.read);
  const decided = AsyncResult.isSuccess(result) ? result.value : undefined;
  assert.strictEqual(decided?.evaluationId, "e1");
});

it("a seed given after the first read does not re-run the computation", () => {
  let lives = 0;
  const { q, subject } = questionOf({ live: () => { lives += 1; return () => {}; } });
  const registry = AtomRegistry.make({ initialValues: [[subject, admin]] });
  registry.mount(q.read);
  const first = registry.get(q.read);
  const [grantAtom, grant] = q.seed.hold(allow);
  if (!Atom.isWritable(grantAtom)) return assert.fail("the grant atom is writable");
  registry.set(grantAtom, grant);
  assert.strictEqual(registry.get(q.read), first);
  assert.strictEqual(lives, 1);
});
```

The other converted cases were "announces once per registry" (two registries, each seeded `allow` with subject `visitor`, `reports.length === 2`) and "reads the seed while the subject is unknown, drops it once the client answers". They need no fake: `subject === undefined` gives `Effect.never`, i.e. `Initial`.

## Runtime State Inventory

This is a refactor inside one package. Every category was checked.

| Category | Items Found | Action |
|----------|-------------|--------|
| Stored data | None. Seeds live in memory per atom set and the payload wire is unchanged (no codec edit in any option) | none |
| Live service config | None (library) | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `packages/react/lib/` is rebuilt by `tsc -b`. Stryker writes `reports/mutation-react/*` (gitignored), and its JSON is what the comparer reads | run the base Stryker before any src edit; a stale report is refused by the comparer |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node + pnpm | all | ✓ | pnpm 10.17.1 | — |
| `pnpm install --offline --frozen-lockfile` in a worktree | spikes | ✓ (6-12 s) | — | — |
| Stryker | WX-05 | ✓ | @stryker-mutator/core 10.1.1; react run 45-53 s | — |
| madge | `pnpm circular` | ✓ | 8.0.0 | — |
| Playwright + chromium | `pnpm example` (30 e2e) | ✓ **runs on this host**: `30 passed (7.1s)` in spike 1b; chromium-1254 cached | @playwright/test 1.65.0 | CI (podman route not needed) |
| tstyche | `pnpm test:tstyche` | ✓ | 7.2.5 (52 files, 271 tests pass in 1a/1b) | — |

## Package Legitimacy Audit

No option installs a package. All imports are from `effect` 4.1.2 and `@qadi/core`, which `@qadi/react` already depends on. **Packages removed:** none. **Flagged:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest` 4.1.2, project `react` (happy-dom); tstyche 7.2.5 for `.tst.ts` |
| Config file | `packages/react/vitest.config.ts`; root `vitest.config.ts` (projects); `stryker.react.mjs` (JSON `reports/mutation-react/mutation.json`) |
| Quick run command | `pnpm exec vitest run --project react packages/react/test/HydrationEngine.test.ts` (0.7 s), plus `SeededQuestion.test.ts` on 1b |
| Full suite command | `pnpm exec vitest run --project react` (33 files / 503 tests on 1b); phase gate `pnpm check:pr < /dev/null` (~110 s) |
| Mutation | `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/QadiAtoms.ts,packages/react/src/HydrationEngine.ts'` (+ `,packages/react/src/SeededQuestion.ts` on 1b), same list at base and close, ~50 s, one at a time |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEED-01 | evidence recorded before the question | doc check | `test -s .planning/phases/QD-42-*/42-01-SUMMARY.md && /usr/bin/grep -q "1b" …` | ❌ plan 1 writes it |
| SEED-02 | decision recorded before any src change | git order | `git log --format=%H -- packages/react/src` has no commit before the decision commit | ❌ |
| SEED-03 | no function-receiving-a-function; real-runtime seam; liveness once | unit + grep | `pnpm exec vitest run --project react packages/react/test/SeededQuestion.test.ts`; `/usr/bin/grep -c "computedFor\|track:" packages/react/src/*.ts` = 0; liveness statement count | ❌ Wave 0 |
| SEED-04 | every pin holds | full suite + e2e | `pnpm exec vitest run --project react` with `git diff --stat <base> -- packages/react/test/QadiProvider*.tsx packages/react/test/Hydration.lifetime.test.ts packages/react/test/*sweep*` empty; `pnpm example`; `/usr/bin/grep -rn "scheduleTask\|defaultIdleTTL" packages/react/src` only the 5 base comment lines in `QadiProvider.tsx` | ✅ |
| SEED-05 | reject: ADR-155, no src | grep + git | `git diff --stat <base> -- packages` empty (or comment-only, Open Q 1); `test -f spec/decisions/155-*.md` | ❌ |
| SEED-06 | stale sweep + re-verify | grep + Stryker per config | per-file comparer over the 18 milestone files + this phase's | ❌ last plan |
| WX-01 | gate | full | `pnpm check:pr < /dev/null` | ✅ |
| WX-02 | numbers | grep | `/usr/bin/grep -rlw <id> spec packages/*/src` per reserved id | ✅ |
| WX-03 | overview | gate 13 | `pnpm spec:api` (927 exports, green in 1b) | ✅ |
| WX-04 | forbidden constructs | lint + added-line grep | `pnpm lint`; `git diff <base> -U0 -- packages \| /usr/bin/grep '^+' \| /usr/bin/grep -E '\bas \|!\.\|: any\|switch \('` empty | ✅ |
| WX-05 | coverage + mutation | coverage + Stryker | `pnpm coverage` (react ≥ 90); comparer vs `42-mutation-base.json` | ❌ base in Wave 0 |
| WX-06 | test before change | git order | seam + trap tests committed before the src commit | ❌ |
| WX-07 | changeset | file | `.changeset/*.md` with `"@qadi/react": patch` (go only); no `upgrading.md` edit (nothing public changes) | ❌ |

### Sampling Rate
- **Per task commit:** the quick run plus `pnpm typecheck` (3 s) plus `pnpm circular`.
- **Per wave merge:** the full react project plus `pnpm lint`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, `pnpm example` 30 passed, Stryker comparer exit 0.

### Wave 0 Gaps (go)
- [ ] `42-mutation-base.json`: base Stryker on `c0aa00fe`-equivalent (measured this session: HE 226/231 = 0.9784, QA 52/58 = 0.8966; survivors HE 488:93, 716:12 ×2, 628:19, 724:36; QA 234 ×5, 291:19).
- [ ] Real-runtime seam tests and the two trap tests, written before the fakes are deleted.
- [ ] The two mutation-closing tests (equal-subject write; non-envelope payload).
- [ ] For 1b: the "moved file" rule for `SeededQuestion.ts` in the comparer.

## Plan shape per outcome

**Plan 1 (every outcome): evidence and decision, no code.**
1. Copy this file's evidence table into `42-01-SUMMARY.md`.
2. Ask one `AskUserQuestion` offering 1a / 1b (recommended) / 2 / 3. Option 3's text should say whether the comment de-dup is included (Open Q 1).
3. Commit the decision. Stay quiet after asking.

**Go: 1b (recommended), about 4 plans.**
- **P2 base + RED/green seam (test-first).**
  1. Run the Stryker base with the 2-file list on the decision commit, and write `42-mutation-base.json` with the 41-01 writer, `SeededQuestion.ts` as `new`/moved.
  2. Add the real-runtime seam tests through the *current* API: build `computedFor` exactly as `QadiAtoms` does, i.e. through `makeQadiAtoms` + `hydrate`. They are green, as characterisation.
  3. Add the two trap tests at the `makeQadiAtoms` level.
  4. Add the two mutation-closing tests.
- **P3 the inversion.**
  1. Create `SeededQuestion.ts` (module header, `isMismatch`, `SeedSlot`, `SeedGrant`, `AnnounceState`, `DECISIONS_KEY`, `SeededQuestion`, `makeSeededQuestion` with `runtime`/`subject`/`live`), with no `"use client"` and out of the barrel.
  2. Reduce `HydrationEngine.ts` to the codec, importing `type SeedSlot`.
  3. Make `QadiAtoms` `build` a one-call; delete `seededDecision` and the local `DECISIONS_KEY`.
  4. Move the `makeSeededQuestion` tests to `SeededQuestion.test.ts` on the real runtime, and delete the 4 fakes.
  5. Move `DECISION_READ_BUDGET`/`_NAMES` keys to `packages/react/src/SeededQuestion.ts` (same count 2, same name `makeSeededQuestion`), and update the budget comment.
  6. Verify: typecheck, lint, circular, react suite, and `git diff --stat` empty on the pinned test files.
- **P4 records.**
  - AGENTS.md §13 `:645-647` ("`HydrationEngine.ts`'s seed precedence" → `SeededQuestion.ts`'s).
  - ADR-QD-149 dated amendment (file citation `:43`).
  - INV-QD-028 `:1081`, 317 `:3731`, 318 `:3745` Source → `SeededQuestion.ts`. INV-QD-105 `:3228-3232` Source (no `track`; "`makeQadiAtoms` hands `live` to `makeSeededQuestion`, whose reader calls it first"). Enforcement for all four gains `SeededQuestion.test.ts`.
  - `spec/traceability.md` rows `:111`, `:131`, `:161`, `:162`.
  - BEH-QD-517 Source `19-hydration.md:375` and BEH-QD-518 `:398`.
  - `QuestionBook.ts:15-17` header ("`QadiAtoms.ts` is its one adapter … `get.addFinalizer`").
  - Liveness: the one statement stays at `QuestionBook.ts` `BookOptions.build` `:69-76`, with a pointer in `makeSeededQuestion`'s doc.
  - The invariants/traceability/README change history, the CCR-QD-433 row (ADR-QD-155 Unused, or used per Open Q 2; BEH-QD-546..550 and INV-QD-329..330 Unused), and a `@qadi/react` patch changeset.
  - ADR-039 `:96` and ADR-052 `:134` are dated blockquotes (history, exempt). Leave them.
- **P5 close + sweep + re-verify** (the last plan, below).

**Go: 1a.** As 1b without the new file. Keys and AGENTS.md stay, and ADR-149 stays true. INV-105 Source + Enforcement, plus 028/317/318 Enforcement, traceability, and the `QuestionBook.ts` header. Tests stay in `HydrationEngine.test.ts`. HydrationEngine grows to about 811 lines and gains `evaluate`/`CurrentSubject`/`Effect` imports, against its own header ("everything between a server's decision and the moment this client supersedes it").

**Go: 2.** P2 base + seed-holder unit tests. P3 `makeSeedHolder` + `makeSeededQuestion({ seeds, computed, live })`. P4 INV-105 Source (`track` gone), traceability. The 4 cases keep a fake `computed` atom, so SEED-03 is met only if the human accepts "real runtime" at the `makeQadiAtoms` level.

**Reject: 3, 2 plans.**
- P2: ADR-QD-155 (Context: review #6; Decision: keep the seam; Alternatives: 1a/1b/2 with these numbers; Consequences: the fake stays), `spec/decisions/index.yaml`, the CCR-QD-433 row naming the unused BEH-QD-546..550, INV-QD-329..330 and any ARCH-89 reuse, and the liveness prose de-dup only if Open Q 1 allows. No changeset.
- P3: the sweep and re-verify.

**Last plan (every outcome): the cross-phase stale sweep and the milestone re-verify.**
- **Files touched in the milestone** (`git diff --name-only 637c0601 -- 'packages/*/src/*'`, 18). Each file and its config:
  - Core (`stryker.config.mjs`, index excluded): `core/src/{Explanation,HydrationMetrics,SinkCodec,SinkWire,ValueText}.ts`; `core/src/index.ts` is excluded.
  - Devtools (`stryker.devtools.mjs`): `devtools/src/model/{DiagnosticsFeed,Filters,Remedies,SimulationForm,SimulationSession,Source,SupersedingRun,TimelineFeed}.ts`; `devtools/src/index.ts` is outside `model/**`, so no mutate entry.
  - `audit/src/AuditEntry.ts` (`stryker.audit.mjs`).
  - `http/src/DecisionStreamRoute.ts` (`stryker.http.mjs`; a comment-only change in `12a9cd6b`).
  - `react/src/HydrationEvent.ts` (`stryker.react.mjs`).
  - Plus this phase's react files.
- **Bases** come from each phase's `NN-mutation-after.json` (37: TimelineFeed 1, DiagnosticsFeed 0.9474, SimulationSession 0.9819, SupersedingRun 0.9434; 38/40: SinkCodec 0.9755, SinkWire 1; 39: HydrationMetrics 1, HydrationEvent 1; 40: Source 1, AuditEntry 1; 41: Explanation 0.9875, ValueText 1, Remedies 1, Filters 1, SimulationForm 0.9837). `DecisionStreamRoute.ts` has none, so measure it at `637c0601` or record it as comment-only.
- **Run** one Stryker per config with `--mutate` limited to the files above, one at a time.
- **Sweep method:**
  - `/usr/bin/grep` spec, AGENTS.md, README, website and `.changeset` for every symbol 37-41 removed or renamed, excluding change history.
  - Check overview module columns for every moved declaration.
  - Check BEH/INV Source lines naming 37-41 files.
  - A spot-check this session found no live stale cite for `reasonOf`, `MalformedReason`, `recordJsonOf`, `asDecodeRefusal` or `MEANINGS` outside ADRs, the CCR table and change-history cells. It found no `file.ts:NNN` citations of the 16 touched files in behaviours/invariants/traceability/overview/AGENTS.md. The overview rows for `valueText`/`valueLabel` (`ValueText.ts`), `WIRE_VERSION` (`SinkWire.ts`) and `HydrationDropReasonOf` (`HydrationMetrics.ts`) read correctly.

## Numbering (confirmed free this session)

ARCH-89, ADR-QD-155, CCR-QD-433, BEH-QD-546..550 and INV-QD-329..330 each have 0 hits in `spec packages scripts features examples website AGENTS.md .changeset`. There is no `spec/decisions/155-*` file and no `ARCH-89` in `git log`. Highest in use: ADR 154, CCR-QD-432, BEH-QD-545, INV-QD-328. [VERIFIED: grep]

## Open Questions

1. **Option 3 and "no source file changes".** De-duplicating the liveness prose edits comments in two `.ts` files. Recommendation: let the option-3 answer text decide ("reject, comments de-duplicated" vs "reject, nothing touched"). If comments are allowed, verify with a check that every changed line in `packages/*/src` is a comment.
2. **ADR-QD-155 on a go.** The roadmap marks it Unused unless liveness moves. 1b creates a module boundary and moves the `live()` call site, which is arguably a decision worth an ADR. Recommendation: on 1b, use ADR-QD-155 to record "the seeded question owns its computing atom", and make ADR-149's amendment point to it. On 1a, leave it Unused.
3. **The new-file mutation rule for `SeededQuestion.ts`.** Either the comparer accepts a moved file judged by its survivor set, or the code is reshaped (the `WeakSet` idea, [ASSUMED]). The plan-checker should not accept a re-baseline.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Replacing `AnnounceState` with a `WeakSet<AtomRegistry>` removes the `{ announced: false }` equivalent mutant without creating a surviving one (estimate 57/61) | Pitfall 2 | 1b's new-file score stays below the moved-region base and needs the survivor-set rule |
| A2 | `pnpm example` on 1a behaves as on 1b (same code, different file) | evidence table | low; re-run in the go plan anyway |
| A3 | ADR-103's "atom set is its one adapter" stays true without amendment on a go | ADR picture | a reviewer may want a dated clarification; cheap to add |

## Sources

### Primary (HIGH)
- Spikes this session (worktrees from `c0aa00fe`, removed): typecheck, lint, circular, the react suite, Stryker (base log `…/scratchpad/stryker-base.log`, 53 s), `pnpm check:pr` and `pnpm example` on 1b; the falsification probes (madge cycle; the `get(grantAtom)` trap).
- Read: `packages/react/src/{HydrationEngine,QadiAtoms,QuestionBook}.ts`, `packages/react/test/HydrationEngine.test.ts`, `scripts/check-house-style.mjs:596-618`, `stryker.react.mjs`, ADR-QD-103/148/149, `spec/invariants.md` (INV-028/105/317/318), `spec/behaviors/19-hydration.md:375,398`, `spec/traceability.md`, `AGENTS.md`.
- `node_modules/.pnpm/effect@4.1.2/node_modules/effect/src/reactivity/Atom.ts:184,205,746-747`.

### Secondary
- `.planning/research/SUMMARY.md` R4 (corrected here on `QadiRuntimeServices`).
- Phase 35/41 mutation records (`35-07-SUMMARY.md`, `41-0{1,6}-PLAN.md`).

## Metadata

**Confidence breakdown:**
- Option costs: HIGH, measured.
- ADR/records inventory: HIGH, read and grepped.
- Recommendation: MEDIUM, a design judgement.
- Mutation for 1b's new file: MEDIUM, because the rule is a policy choice.

**Research date:** 2026-11-14
**Valid until:** HEAD moves on `packages/react/src` (re-run the base Stryker at the phase base regardless).
