---
id: ARCH-23
title: One question path in @qadi/react — one opener for decision atoms, a QuestionBook that owns identity, liveness and eviction, and usePolicies on the same path as every other hook
strength: Worth exploring
status: done   # T0–T3 need no decision; T4 onward wait on D-23-a, D-23-b, D-23-c
evidence_verified_at: e328e75
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-039 (constraint, decisive: no consumer may reach a seed atom. This refutes the review's public `{read, seed}` handle; the handle with a `seed` stays internal)
  - ADR-QD-078 (constraint: `makeSeededQuestion` and the precedence stay in `HydrationEngine.ts`; a seed is `SeededDecision`; the hydrate lookup stays a closure of the atom set)
  - ADR-QD-014 (constraint, as reversed in CCR-QD-150: no `scheduleTask`/`defaultIdleTTL`; still exactly one `Atom.readable` per question; `useAtomSuspense` remains the suspense mechanism)
  - ADR-QD-017 / ADR-QD-093 (constraint: `useDecision`/`usePolicies` keep returning the raw result; every registration reads through `outcomeOf`; `DECISION_READ_BUDGET` does not change)
  - ADR-QD-053 (amend: `GateKind` gains `usePolicies` (and `useQuestions` if D-23-e = B); a hook asking several questions registers one instance per question)
  - ADR-QD-080 (constraint: the question book and the gate registry share one scope, the atom set; no module-scope state)
  - ADR-QD-037 (constraint: madge counts type-only edges, so `QuestionBook.ts` must not import `QadiAtoms.ts`)
  - ADR-QD-038 (constraint: changeset, fixed version group)
  - ADR-QD-025 / ADR-QD-098 (amend only if D-23-g = A: `stryker.react.mjs` also mutates `QuestionBook.ts`)
  - ADR-QD-NEXT (new: "A question is opened once, in a book its atom set owns": keying, identity scope, liveness, eviction)
packages: ["@qadi/react", "@qadi/devtools (comments only)", "@qadi/example-nextjs (one comment)", "apps/website (docs)", "scripts (Stryker scope, DoD row)"]
estimate: L   # ≈ 4–5 days complete; T1+T2 alone (the defect fix and the pin) ≈ ½ day and ship on their own
---

# ARCH-23 — One question path in `@qadi/react`

## 1. Verified evidence (at `e328e75`)

The review ran at `d0884e6`. `git diff --stat d0884e6 e328e75 -- packages/react` is
**empty**, so every `packages/react` line number the review cites is unchanged. All
lines below were re-read at `e328e75`.

**Probes.** Throwaway vitest files ran under
`scratchpad/wave3/ARCH-23/`, never in the repo. Each imports `packages/react/src/*.ts` and
`packages/core/src/index.ts` by absolute path. A scratch config aliases `@qadi/core` to
core's `src` and uses `environment: "happy-dom"` (the react package's own). The probes
call `gc()` with no CLI flag, using `v8.setFlagsFromString("--expose-gc")` and then
`vm.runInNewContext("gc")`, and yield a macrotask between collections. The command is
`cd packages/react && ../../node_modules/.bin/vitest run --config $S/vitest.dom.config.ts --root $S`.

- `gc.test.ts`, `gc2.test.ts`: `atoms.decision(p)` and `atoms.decisionFor(p, r)` are each
  called again after a collection, while the first atom is still strongly held, and in
  `gc2` mounted in an `AtomRegistry`. Output: `bare same atom: false asked: 2`,
  `byResource same atom: false asked: 2`, `mounted same atom: false asked: 2`.
- `gc4.test.ts`: the red test T1 adds, written with assertions. It failed **5 of 5 runs**:
  `expected { _id: 'Atom', … } to be { _id: 'Atom', … } // Object.is equality`.
- `gc5.test.ts`: `hydrateDecisions` then a registry with the subject still unknown, then
  `currentDecision(registry.get(atoms.decision(canRead)))`. Without a collection the read
  is `SeededAllow` and `asked: 1`. With a collection between hydrate and read it is
  `undefined` and `asked: 2`.
- `gc3.test.ts`: the fix's mechanism. One `Atom.family` keyed by a fresh
  `{ policy, resource }` object, with the handle pushed into a strong array, returns the
  same atom after collection for both the bare and the resource-scoped key (`true true`,
  2 builds). `MutableHashMap` keys `{ policy, resource }` structurally, and `remove` works
  (`Some(1)`, then size `0`).

### C1. `decision`/`decisionFor` make every caller branch on `resource === undefined` — **CONFIRMED**

- `packages/react/src/QadiAtoms.ts:82-84`: the interface has two members.
  `:474-475` implements them over two families.
- The three branching sites in `src`:
  - `hooks.ts:65-69`, in `useDecisionSuspense`, branches at `:67`.
  - `useGate.ts:58-62` branches at `:60`.
  - `QadiAtoms.ts:486-488` branches inside the hydrate lookup.
- Outside `src`, `.decision(` and `.decisionFor(` appear 45× in `QadiAtoms.test.ts`, 39× in
  `Hydration.test.ts`, 8× in `HydrationCounts.test.ts`, 3× in `HydrationPayload.test.ts`
  and 2× each in `QadiProvider.test.tsx` and `DecisionOutcome.test.ts`. They also appear in
  `spec/behaviors/09-react.md` (3, including the compiled `typescript` fence at `:181-189`),
  `19-hydration.md`, `028-decision-hydration.md`, `appendices/react-integration.md` and the
  website's `concepts/hydration-reactivity.md`. `examples/` has none.

### C2. Two atom families each build their own `TrackedQuestion` — **CONFIRMED**

- `QadiAtoms.ts:413-417` (`bare`) and `:419-429` (`byResource`, an `Atom.family` that
  returns an `Atom.family`) each build a `TrackedQuestion`, push it onto `tracked`, and call
  `seededDecision`.
- The two lookups are `:474-475` and `:487-488`, as the review says.

### C3. Liveness bookkeeping is interleaved with the families and testable only by mounting atoms — **CONFIRMED, slightly CHANGED**

The bookkeeping lives in five places:
- `TrackedQuestion` (`:208-212`) carries a 40-line doc comment (`:168-207`).
- The `track` callback sits inside `seededDecision` (`:355-367`) and handles both
  re-admission and `liveCount`.
- `tracked` is at `:411`.
- Construction pushes onto it in both families (`:413-429`).
- `sweepEvictions` is at `:431-442`.
- The capacity check is at `:299-303`.

On testing: `QadiAtoms.test.ts:311-457` has six sweep tests. Two of them need no registry,
the construction-validation test and "evicts the oldest unmounted". Neither does a
`liveCount` claim. The other four mount a registry. Two of those four wait on
`AtomRegistry`'s own asynchronous node removal (`vi.waitFor(() =>
registry.getNodes().has(decision) === false)`, `:397-399`, `:419-421`). They are therefore
coupled to `effect`'s scheduler, which is the coupling `.reports/kent-c-dodds` flagged. So
the claim stands: every liveness property is reachable only through atoms and a registry.

### C4. `usePolicies` reads through a third family, bypasses `useGate`, is not a `GateKind`, so devtools cannot see it, and takes no resources — **three parts CONFIRMED, one CHANGED (partly refuted)**

- *Third family*: **CONFIRMED.** `hooks.ts:98-108`, `combinedFamily`, is a module-scope
  `Atom.family` keyed by `QadiAtoms` that returns an `Atom.family` keyed by the policies
  record.
- *Bypasses `useGate`*: **CONFIRMED.** `hooks.ts:117-127` calls `useQadiContext` and
  `useAtomValue` only. There is no `useGate`, so nothing registers, and no `outcomeOf`
  read happens. The raw return is deliberate, per ADR-QD-093(d).
- *Not a `GateKind`*: **CONFIRMED.** `GateWriter.ts:25-31` lists `Can | Cannot | useCan |
  useDecision | useDecisionSuspense | useProjected`.
- *"Devtools cannot see it"*: **CHANGED, partly refuted.** The combined atom reads
  `atoms.decision(policy)` (`hooks.ts:103`), and the `bare` family's constructor pushes the
  question onto `tracked` (`QadiAtoms.ts:413-416`). So every `usePolicies` question **does**
  appear in `atoms.asked()`, which is the "asked" half of `QuestionsPanel`
  (`DevtoolsDock.tsx:96`). Only the "asking" half, `atoms.gates`, misses it. The panel shows
  a question row with zero instances under it, and the lens has nothing to point at.
- *No resources*: **CONFIRMED.** The signature is `Readonly<Record<string, Policy>>`
  (`hooks.ts:117-119`), and it reads only `atoms.decision`.
- *GateKind change touches the devtools panel's input*: **REFUTED as a type change.**
  `GateInstanceLike.kind` is `string` (`packages/devtools/src/model/Gates.ts:41-49`). The
  doc comment at `:35-40` gives the reason: an unknown kind is "shown as itself". The panel
  renders `instance.kind` raw (`QuestionsPanel.tsx:233`). A new kind therefore needs **no**
  devtools code or type change, only a new value flowing through an unchanged input.

### C5. NEW DEFECT — a question's atoms are only weakly held, so the "same question, same atom" guarantee breaks after a garbage collection — **CONFIRMED (probes gc/gc2/gc4/gc5)**

The cause has two parts.

First, `effect@4.0.0`'s `Atom.family` holds its **values** in `WeakRef`s and its keys
strongly (`node_modules/.pnpm/effect@4.0.0/.../dist/reactivity/Atom.js:669-686`, the branch
taken whenever `WeakRef` and `FinalizationRegistry` exist). Its type is
`<Arg, T extends object>` (`Atom.d.ts:692`), so it accepts any object as a value, not only
atoms.

Second, `bare`'s value is the `SeededQuestion` wrapper `{ seed, read }`
(`HydrationEngine.ts:471-476`, `:572`). `byResource`'s value is an **inner family
function**. Nothing holds either one strongly:
- `decision` returns `bare(policy).read` and discards the wrapper (`QadiAtoms.ts:474`).
- `hydrate` returns `.seed` and discards it too (`:488`).
- `tracked` holds only `{ policy, resource }`.
- A mounted registry node holds `read`, not the wrapper.

So after any collection:
1. The same question gets a **new** decision atom. That breaks BEH-QD-065's REQUIREMENT
   "`decision` MUST return the same atom for the same policy", and with it shared
   evaluation. A second evaluation and a second `DecisionSink` record follow.
2. `asked()` lists the question **twice**, which breaks BEH-QD-198's "MUST record each
   distinct question once".
3. A seed written by `hydrateDecisions` is **lost** if a collection lands between hydrate
   and the first read (gc5). This fails closed: the gate shows `Pending` and the client
   decides, so it is not a grant. But hydration silently does nothing, `countSeeded` counted
   a seed that is never read, and `@qadi/devtools`'s `unaccountedEntries` would report it.

The defect predates ARCH-05. The `{ seed, combined }` wrapper dates from `0363a5a` (ADR-QD-039
era), and the nested `byResource` family from `9095afc`. `hooks.ts`'s `combinedFamily` has
the same weak inner family, which costs only cross-component sharing of the derived record.
No test can see any of this, because nothing in the suite forces a collection, and
`v4-reactivity-smoke.test.ts:71-91` pins the structural **keying** of `Atom.family` but not
its weak **values**.

### C6. NEW — "a same-tick recompute never lets the sweep see `liveCount` at zero" is argued, not pinned — **CONFIRMED by grep**

`QadiAtoms.ts:172-186` argues that `NodeImpl.invalidate` disposes and then re-reads
synchronously. `grep -n liveCount packages/react/test` finds three **comments** and no
assertion. No test runs the sweep across an invalidation, which `.reports/ryan-carniato` and
`.reports/dan-abramov` also flag. AGENTS.md §13 names this property as the reason eviction
is safe, so an `effect` bump that reorders finalizers would break it silently.

### C7. NEW — module-scope state contradicts AGENTS.md §13 — **CONFIRMED**

AGENTS.md §13 says: "No module-scope state is left in this package." But `combinedFamily`
(`hooks.ts:98`) is a module-scope cache keyed by atom set. (`GateWriter.ts:103`'s
`writers` WeakMap is the declared, justified exception, with its own doc comment at
`:10-17`.)

### C8. NEW — the bound and the sweep are absent from `spec/` — **CONFIRMED by grep**

`grep -rn "sweepEvictions\|maxTrackedQuestions\|sweepIntervalMillis" spec apps/website/src`
returns nothing. Beyond that:
- BEH-QD-065's listing (`09-react.md:56-71`) lacks `gates`, `sweepEvictions`,
  `QadiAtomsOptions.maxTrackedQuestions` and `onGateIdCollision`.
- BEH-QD-198 (`25-inspection.md:447-457`) says "record each distinct question once" and says
  nothing about eviction.
- The example's comment `examples/nextjs-newsroom/src/client/Dock.tsx:151-153`, "the list
  only grows", has been stale since the sweep landed.

### C9. NEW, minor — the sweep is O(k·n) — **CONFIRMED**

`QadiAtoms.ts:432-441` runs `find`, then `indexOf`, then `splice` once per eviction
(`.reports/bjarne-stroustrup`, `.reports/niklaus-wirth`, `.reports/chris-okasaki`). It is
harmless at the 500 bound, and the book can do it in one pass.

### C10. The review's target `atoms.question(policy, resource?)` → `{read, seed}` — **REFUTED as public surface**

A public `seed` is the bypass ADR-QD-039 exists to prevent: "a consumer able to reach a seed
atom could write an authorization decision straight into the registry, past both the
subject check and the evaluator." ADR-QD-078 kept that requirement when it moved the lookup
into a closure. So the `{read, seed}` handle exists, and already has a name
(`SeededQuestion`, `HydrationEngine.ts:471`), but only **inside** the atom set. The public
side can only be the read. See D-23-a.

## 2. Goal and success criteria

**Goal.** Make *opening a question* a deep module with a one-call interface. Today a
question is identified twice, by two families, and three callers re-derive which one to
use. Its liveness is spread across a doc-comment-sized struct, a callback, two
constructors and a sweep, and a garbage collection can quietly split one question into two.
After the change, the atom set has one internal seam, `QuestionBook.ts`. It owns a
question's **identity**: structural keying with strong references, so one question has one
handle for as long as it is tracked. It also owns **liveness** (retain/release),
**eviction** (the sweep) and **enumeration** (`asked()`). It is generic over the handle it
stores, so its whole behaviour is testable with plain objects, with no atoms and no
registry. Atoms reach it through one adapter, `makeSeededQuestion`'s `track` callback, which
becomes `retain` plus `get.addFinalizer(release)`.

The public interface narrows to `atoms.decision(policy, resource?)`. Hooks lose their
branch. `usePolicies` goes through the same opener and the same gate registration as every
other hook, so devtools' "asking" view stops having a blind spot. Leverage comes from one
place to fix the identity rule (C5) and one to pin the liveness rule (C6). Locality comes
from everything a reader needs to answer "why did this question vanish from the panel"
living in one ~120-line module with its own test file.

**Success criteria.**
1. `atoms.decision(p)` returns the same atom across a forced collection while the question
   is tracked, for the bare and the resource-scoped case. `asked()` has one entry for it,
   and a hydrated seed is still read after a collection. These are T1's tests, using the
   in-test `gc()` helper, and they are green.
2. Mounting a question, invalidating, and running `sweepEvictions` synchronously after the
   invalidation, and again while the recompute is in flight, never evicts it. These are
   T2's tests. A canary in `v4-reactivity-smoke.test.ts` pins `effect`'s synchronous
   dispose→re-read.
3. `grep -rn "decisionFor" packages/react/src` returns nothing (if D-23-b = A).
   `grep -rn "resource === undefined ?" packages/react/src` returns nothing.
4. `packages/react/src/QuestionBook.ts` exists, is out of the barrel, and imports no
   `effect/reactivity` module and no local module (`grep -n "^import" QuestionBook.ts` shows
   only `@qadi/core` types and `effect/MutableHashMap`). `QuestionBook.test.ts` covers FIFO
   among cold entries, never-evict-live, stop-when-all-live, re-admission, idempotent
   release and the capacity check, with **no** `AtomRegistry` import.
5. `QadiAtoms.ts` has no `TrackedQuestion`, no `inTracked`, no `tracked.push`, and no
   `Atom.family` (if D-23-c = B).
6. `usePolicies` registers one `GateInstance` per named question with `kind: "usePolicies"`
   under `instrument`, and none without it. This is a new test in
   `GateRegistry.test.tsx`.
7. `QadiProvider.test.tsx`, `hooks.test.tsx`, `edges.test.tsx`, `HydrationRender.test.tsx`
   and `ServerRender.test.tsx` are byte-unchanged: `git diff --stat main -- <those five>`
   prints nothing. This is the render-sequence and "off means absent" pin from INV-QD-046
   and AGENTS.md §13.
8. `hooks.ts` has no module-scope `Atom.family` (if D-23-f = A).
9. `pnpm check` is green, including `spec:api` (gate 13, `check-api-surface.mjs`),
   `circular`, and `stryker run stryker.react.mjs` at or above its break threshold.

## 3. Non-goals

- **A public seed.** This is refuted in C10. `QadiAtoms.hydrate` remains the only way to
  seed.
- **Changing what `useDecision`/`usePolicies` return.** ADR-QD-093(d) keeps both raw.
- **Changing `GateInstance`'s shape** (`id`, `kind`, `policy`, `resource`, `state`,
  `element`). A multi-question hook registers several instances. It does not get a new
  instance shape, so `@qadi/devtools` stays independent and ARCH-24's input stays stable.
- **Idle-atom GC through `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL`.** ADR-QD-014's
  reversal forbids it, and this plan never touches the registry's scheduler.
- **Keying on `@qadi/core`'s `Question` (ARCH-16).** It does not exist at `e328e75` (no
  `Question` type under `packages/core/src`). D-23-h records how to adopt it later.
- **Seed precedence, the announce/recheck counting, or `DECISION_READ_BUDGET`.** All stay in
  `HydrationEngine.ts`'s `makeSeededQuestion`, unchanged.

## 4. Constraints

- **AGENTS.md §13, in full.**
  - *Decisions live in atoms.* The book stores handles and counts, never a verdict, and
    registration records `outcome._tag` only.
  - *`outcomeOf`.* `usePolicies`' per-entry registration reads each result through
    `outcomeOf`.
  - *Structural keying.* The book keys with `Equal.equals` through `MutableHashMap`, which
    is what `Atom.family` uses internally. An inline-built policy still shares, and the
    `{ policy, resource }` key wrapper is fresh per call, but its children's hashes are
    cached per object.
  - *Eviction semantics.* `liveCount` is incremented first inside the reader and
    decremented by `get.addFinalizer`. The order is unchanged, only expressed as
    `retain`/`release`. A same-tick recompute is still invisible to the sweep, and T2 pins
    it.
  - *Instrumentation off means absent.* `usePolicies`' registration effects return
    immediately when `writer === undefined`, exactly as `useGateRegistration` does.
  - *No module-scope state.* C7 is fixed, not repeated.
  - Editing §13's own text is an AGENTS.md change, and the user must approve it (T9).
- **ADR-QD-039 / ADR-QD-078.** The seed atom stays unreachable. `SeededQuestion` remains
  the internal handle, and the book stores it, typed `SeededQuestion<EvaluationError>`, so
  `seed` is `Atom.Writable<SeededDecision | undefined>`. The hydrate lookup is still a
  closure over the book. `{ ...atoms }` must still seed the same questions; the
  `Hydration.test.ts:605-620` spread-copy and double tests stay green.
- **ADR-QD-014.** There is still exactly one `Atom.readable` per question
  (`HydrationEngine.ts:493-496` says why: render sequences). The book adds no atom.
- **ADR-QD-080.** The book lives in the `makeQadiAtoms` closure beside `gates`, so "asked"
  and "asking" keep one scope.
- **ADR-QD-037 (madge, `pnpm circular`).** `AskedQuestion` moves into `QuestionBook.ts` and
  is re-exported by name from `QadiAtoms.ts`, so `QuestionBook.ts` imports nothing local.
- **Budgets in `scripts/check-house-style.mjs`.**
  - `DECISION_READ_BUDGET` (`:473-494`): no change. `HydrationEngine.ts` keeps its 3 reads
    and `makeSeededQuestion` keeps its name; the name guard checks it exists verbatim.
    `QuestionBook.ts` and the new registration code must contain **zero**
    `RAW_DECISION_READ` matches.
  - `SWITCH_BUDGET`, `UNTRACED_BUDGET`, `ANY_BUDGET`, `HAS_CUSTOM_BUDGET`,
    `SCHEMA_ERROR_BUDGET`: untouched. The book uses no `switch`, no `Effect.fnUntraced` and
    no `any`.
  - `PORT_DOUBLE_BUDGET`: untouched, because no test here builds a port error.
  - The `no-raw-promise` rule is source-scoped. The tests' `setTimeout` promise follows the
    existing precedent at `Hydration.test.ts:593`.
- **Gate 13 (`check-api-surface.mjs`).** The changes are removing `decisionFor` (a member,
  not an export), possibly adding `useQuestions` (an export), and moving the source file of
  `AskedQuestion`. `spec/overview.md`'s React table changes in the same commit.
- **Gate 11 (`check-dod-table.mjs`).** If D-23-g = A, row 22's text names
  `QuestionBook.ts` and its break percentage stays equal to `stryker.react.mjs`'s
  `thresholds.break` (80).
- **Doc-fence gates** (`check-doc-examples.mjs`, `check-website-doc-examples.mjs`). The
  `typescript` fences that call `atoms.decision`/`decisionFor` must still compile.
- **Breaking change → changeset.** The fixed version group (`.changeset/config.json`) bumps
  every package together. Releases stay unpublished unless the user asks.

## 5. Decisions needed before work starts

### D-23-a — The public shape of "one question handle"
- **A:** `atoms.question(policy, resource?) → { read }`, a public handle object with one
  member. The `{ read, seed }` handle stays internal. This is honest to the review's name,
  but the object has nothing to carry beyond `read` today, and every call site becomes
  `.read`.
- **B (recommended):** widen the existing member to
  `decision(policy: Policy, resource?: Resource) => Atom.Atom<DecisionResult>`. The
  branching disappears. The ~100 existing `decision(p)` call sites keep compiling, so only
  `decisionFor` sites change. The internal handle is the book's entry
  (`SeededQuestion`), which is what the review's `{ read, seed }` actually describes.
- **C:** the review's literal `{ read, seed }` in public. Rejected as **wrong**, not costly:
  it violates ADR-QD-039 (C10).
- `status: decided (2026-10-07, B, widen `decision(policy, resource?)`)`

### D-23-b — `decisionFor`'s fate
- **A (recommended):** remove it from `QadiAtoms`. This breaks, with a compile error at
  every site, the posture ADR-QD-080 took for its removals. `QadiAtoms` is a closed shape
  that hand-written doubles implement, and a deprecated member would force every double to
  keep supplying it.
- **B:** keep it as a `@deprecated` one-liner `(p, r) => decision(p, r)` for one minor
  release, and remove it after. Kinder to adopters, but it keeps two names for one
  operation for a release.
- `status: decided (2026-10-07, A, `decisionFor` removed, no shim)`

### D-23-c — Who owns a question's identity
- **A (minimal):** keep `Atom.family`, flattened to **one** family keyed by
  `{ policy, resource }`, with the book's entry holding the handle strongly while tracked.
  After eviction the handle is weakly held again. A re-ask before collection gets the old
  handle back, so `inTracked`-style re-admission is still needed.
- **B (recommended):** the book owns keying: a `MutableHashMap<AskedQuestion, Entry>` with
  strong references. Eviction removes the entry from the map, so a re-ask after eviction
  builds a fresh handle, and `inTracked` stops being a special case (see T3 step 4).
  `Atom.family` leaves `QadiAtoms.ts`. BEH-QD-065's "same atom" becomes precise: "for as
  long as the question is tracked". This is deeper: identity, liveness, eviction and
  enumeration sit in one structure, with no second cache to keep consistent with it.
- **Tradeoff:** B evicts a cold question's atoms as well as its row. Under A they linger
  until collection. B also means a seed written for a question that is never read can be
  evicted if more than `maxTrackedQuestions` questions are cold. Today the seed survives
  eviction only until the next collection (C5). See §9.
- `status: decided (2026-10-07, B, the book owns keying with a strong `MutableHashMap`)`

### D-23-d — `usePolicies` and the gate registry
- **A (recommended):** add `"usePolicies"` to `GateKind`, written as the full closed union,
  not `old | "New"`. `usePolicies` registers one instance per named entry:
  `id = \`${useId()}/${key}\``, `wraps: false`, `atom` = that entry's decision atom, and
  state from `outcomeOf`. The registry's `~n` disambiguation already covers any collision.
  This needs a set-valued registration hook in `GateWriter.ts` (T6). `useGateRegistration`
  becomes its one-element case, so there is one lifecycle implementation, not two.
- **B:** leave `usePolicies` unregistered and document the blind spot. This is cheaper and
  keeps C4 open.
- **Devtools consequence:** none in code or types (C4). The panel shows the new kind string
  as is. Coordinate with ARCH-24 so a sampled store keeps treating `kind` as an open string.
- `status: decided (2026-10-07, A, `usePolicies` registers one instance per entry)`

### D-23-e — Resources in a grouped read
- **A:** leave `usePolicies` policy-only, and record the limit as intended.
- **B (recommended):** add `useQuestions(questions: Readonly<Record<string, AskedQuestion>>)
  => Readonly<Record<string, DecisionResult>>`, kind `"useQuestions"`. `usePolicies(p)`
  becomes `useQuestions(mapValues(p, (policy) => ({ policy })))` and keeps its own kind for
  registration. The signature stays stable, and a closed input type replaces a
  `Policy | AskedQuestion` overload that would need a runtime `"policy" in x` probe.
- **C:** widen `usePolicies` to `Record<string, Policy | AskedQuestion>`. Rejected: an
  open union on an input, discriminated by property presence, which is what the
  closed-union rule argues against.
- `status: decided (2026-10-07, B, `useQuestions` added; `usePolicies` delegates)`

### D-23-f — Where the grouped atom lives (C7)
- **A (recommended):** on the atom set, as a public
  `decisions(questions: Readonly<Record<string, AskedQuestion>>) => Atom.Atom<Readonly<Record<string, DecisionResult>>>`,
  built in the `makeQadiAtoms` closure from one flat `Atom.family` keyed by the record. A
  weakly held group only costs a re-derivation, because the group is not tracked or seeded.
  This removes the module-scope cache, `{ ...atoms }` copies forward it, and non-React
  readers (tests, a dock host) get the grouped read. It does add a required member, so
  hand-built doubles break, in the same release as D-23-b.
- **B:** keep it in `hooks.ts`, flattened to one module-scope family keyed by
  `{ atoms, questions }`, and correct AGENTS.md §13's claim instead.
- `status: decided (2026-10-07, A, `decisions` on the atom set)`

### D-23-g — Mutation coverage for the book
- **A (recommended):** add `packages/react/src/QuestionBook.ts` to `stryker.react.mjs`'s
  `mutate`, with the break threshold unchanged (80). The book *decides*: an eviction
  mutant that drops a live entry removes a mounted gate from the panel. The rationale is
  the same "mutate what decides" argument the config's header already makes (ADR-QD-093).
  DoD row 22's text changes with it (gate 11).
- **B:** leave mutation scope at `DecisionOutcome.ts` only.
- `status: decided (2026-10-07, A, `QuestionBook.ts` mutated, break 80)`

### D-23-h — Alignment with ARCH-16's core `Question`
- **A (recommended):** key on React's own `AskedQuestion` (`{ policy, resource? }`) now, and
  do not block on ARCH-16. When ARCH-16 lands, make `AskedQuestion` a type alias of core's
  `Question` **only if** core's type is exactly `{ policy; resource? }`. A core question
  that carries the subject or evaluation options must **not** become a React key, because
  the subject is its own atom (`QadiAtoms.ts:52-56`) and an evaluation id is per run.
  Otherwise, add a projection `toAsked(question)`.
- **B:** wait for ARCH-16 and key on its type from day one. This couples two plans for no
  current benefit.
- `status: decided (2026-10-07, A, React keeps `AskedQuestion`; ARCH-16 `Question` carries subject and options, so no alias)`

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch/23-question-book main`, then `pnpm install`.
  2. `git diff --stat e328e75 HEAD -- packages/react packages/devtools/src/model/Gates.ts spec/behaviors/09-react.md spec/behaviors/25-inspection.md`.
     If anything moved, re-cite §1's lines.
  3. Re-run the §1 probes from the scratchpad: `gc4` must still be red and `gc5` must still
     print `undefined asked: 2`.
  4. Run `pnpm vitest run packages/react` and record the test count. It is the
     unchanged-suite baseline for criterion 7.
- **Tests:** none
- **Verify:** the commands above
- **Done when:** the baseline count is recorded in §10, and the probes reproduce.

### T1 — Test-first: a question keeps its atom, its row and its seed across a collection (C5)
- **Status:** [x] done
- **Depends on:** T0. No decision needed: this uses today's API and ships alone as a
  patch.
- **Files:** `packages/react/test/support/collect.ts` *new*; `packages/react/test/QadiAtoms.test.ts`;
  `packages/react/test/Hydration.test.ts`; `packages/react/src/QadiAtoms.ts`; `.changeset/<name>.md` *new*.
- **Steps:**
  1. In `test/support/collect.ts`, `v8.setFlagsFromString("--expose-gc")`, then
     `const gc = vm.runInNewContext("gc")`. Export `collect = async () => { for (5×) { gc(); await new Promise((r) => setTimeout(r, 0)); } }`.
     Comment that the macrotask yield is required, because a `WeakRef` target is kept
     alive for the rest of the job that created it.
  2. `QadiAtoms.test.ts`, new `describe("a question's identity survives a collection")`:
     - (a) `const held = set.decision(canRead); await collect(); expect(set.decision(canRead)).toBe(held); expect(set.asked().length).toBe(1)`.
     - (b) The same with `decisionFor(canRead, { id: "d1" })`.
     - (c) The same with `held` mounted in a registry.

     Run them: all three are red (matching probes gc, gc2 and gc4).
  3. `Hydration.test.ts`: hydrate `canRead`, build the "subject not yet known" registry
     (`seedsBeforeSubject`, `:294-297`), `await collect()`, then expect
     `currentDecision(registry.get(atoms.decision(canRead)))?._tag` to be `"SeededAllow"`.
     Red today (gc5).
  4. Minimal fix in `QadiAtoms.ts`:
     - Replace `bare` and `byResource` with one
       `questions = Atom.family((key: AskedQuestion) => …)`, keyed by
       `{ policy, resource }` with `resource` always present as a key, even when it is
       `undefined`.
     - Add `handle: SeededQuestion<EvaluationError>` to `TrackedQuestion` and assign it
       before returning, so `tracked` holds it strongly.
     - `decision: (p) => questions({ policy: p, resource: undefined }).read`.
     - `decisionFor: (p, r) => questions({ policy: p, resource: r }).read`.
     - The hydrate lookup becomes `(p, r) => questions({ policy: p, resource: r }).seed`.
       This also deletes the hydrate branch.
     - `asked()` maps `entry.question`, normalised so the bare case stays `{ policy }`. The
       `toEqual` at `QadiAtoms.test.ts:283-285` must not change.
  5. Add a `patch` changeset for `@qadi/react`: "a question's decision atom, its `asked()`
     row and its hydrated seed survive garbage collection".
- **Tests:** four new tests, red first. Every existing test stays unchanged.
- **Verify:** `pnpm vitest run packages/react/test/QadiAtoms.test.ts packages/react/test/Hydration.test.ts`;
  `pnpm vitest run packages/react`; `pnpm typecheck`.
- **Done when:** the four tests are green, the suite count is T0's plus 4, and running the
  file 5× is green 5×.

### T2 — Pin "a same-tick recompute never lets the sweep evict a live question" (C6)
- **Status:** [x] done
- **Depends on:** T0. Test-only, so it ships alone.
- **Files:** `packages/react/test/v4-reactivity-smoke.test.ts`; `packages/react/test/QadiAtoms.test.ts`.
- **Steps:**
  1. Smoke canary, `it("a recompute disposes and re-reads in one synchronous step")`:
     - Build an `Atom.readable` that, on each read, pushes `"read"` and registers
       `get.addFinalizer(() => events.push("fin"))`. It also reads a writable atom `dep`.
     - `registry.mount` it.
     - `registry.set(dep, 1)`. **Synchronously after** that call, expect `events` to equal
       `["read", "fin", "read"]` and a counter `(reads − fins)` to be `1`.
     - Comment that this is the property `QadiAtoms.ts`'s eviction safety rests on.
  2. Second canary: the same through `withReactivity([key])` plus `Reactivity.invalidate`
     inside `runtime.fn`, the path `atoms.invalidate` takes. Await the fn's settlement, then
     assert the counter never read `0` at any point a separate `Effect.sync` sampler
     observed. The sampler is forked with `Effect.runFork` and polls through
     `Effect.yieldNow`.
  3. `QadiAtoms.test.ts`, `it("never evicts a mounted question across an invalidation")`:
     - `maxTrackedQuestions: 1`, mount `canRead`, add a cold `filler`.
     - `registry.set(set.invalidate, undefined)`, then immediately
       `Effect.runSync(set.sweepEvictions)`.
     - Expect `asked()` to equal `[canRead]`.
     - Repeat with a parked resolver, so the recompute is in flight during the sweep. Use
       the controlled-resolver pattern from `hooks.test.tsx:482-548`.
- **Tests:** three new tests. They should be green today; they are pins, not reproductions.
  Mutation check: in a scratch copy, temporarily move `get.addFinalizer` before the
  `liveCount += 1`, or make the finalizer decrement twice. Test 3 must go red.
- **Verify:** `pnpm vitest run packages/react/test/v4-reactivity-smoke.test.ts packages/react/test/QadiAtoms.test.ts`.
- **Done when:** the tests are green, and the scratch mutation turns test 3 red, as recorded
  in §10.

### T3 — Create `QuestionBook.ts` and its plain test surface
- **Status:** [x] done
- **Depends on:** T1. If D-23-c is undecided, build B's interface. The A/B difference is
  confined to step 4.
- **Files:** `packages/react/src/QuestionBook.ts` *new*; `packages/react/test/QuestionBook.test.ts` *new*.
- **Steps:**
  1. Move `AskedQuestion` here, with its doc comment.
  2. `export interface QuestionBook<H> { readonly open: (question: AskedQuestion) => BookEntry<H>; readonly retain: (entry: BookEntry<H>) => () => void; readonly sweep: () => void; readonly asked: () => ReadonlyArray<AskedQuestion> }`
     and `export interface BookEntry<H> { readonly question: AskedQuestion; readonly handle: H }`.
     `liveCount`, the insertion order and the "in book" flag are private, held in a
     module-private `Entry` class.
  3. `export const makeQuestionBook = <H,>(options: { readonly capacity: number; readonly build: (question: AskedQuestion, entry: () => BookEntry<H>) => H }): QuestionBook<H>`.
     - Move the positive-integer capacity check here, verbatim message included
       (`maxTrackedQuestions must be a positive integer`), so the existing construction
       test's regex still matches.
     - Normalise the key to `{ policy, resource }`.
     - `asked()` returns `{ policy }` when `resource === undefined`.
  4. Under **D-23-c = B**:
     - Keep a `MutableHashMap<AskedQuestion, Entry>` plus an insertion-ordered array.
     - `open` returns the existing entry or builds one, and the handle is held strongly.
     - `retain(entry)` re-admits the entry if its key is absent from the map. This
       replaces `inTracked`. If a *different* entry now holds the key, retain leaves the
       old entry out of the map and of `asked()`, but still counts its liveness, so it dies
       with its subscribers. That keeps one row per question.
     - `retain` returns an **idempotent** release, guarded by a closure flag, so a doubled
       finalizer cannot drive the count negative.
     - `sweep` makes one pass: it collects the cold entries oldest-first, removes up to
       `size − capacity` of them from both structures, and stops when the rest are live
       (C9).

     Under **A**, the map is replaced by a strong array, and `open` is called from an
     `Atom.family` constructor.
  5. Write the module comment in the house doc-comment shape. Line one is a one-line
     summary. The body moves `TrackedQuestion`'s 40-line rationale here (same-tick
     recompute, re-admission, FIFO-among-cold, the `DecisionCache` parallel), rewritten
     for the new names.
  6. `QuestionBook.test.ts` is plain: `H = { readonly n: number }`, no atoms, no registry,
     no React. Cover:
     - same question, same entry, structurally;
     - a bare question and a resource-scoped one are different;
     - FIFO eviction among cold entries;
     - a live entry is never evicted;
     - the sweep stops when every remaining entry is live;
     - release makes an entry eligible again;
     - an evicted entry is re-admitted on retain;
     - an evicted key re-opened builds a fresh handle (B);
     - release is idempotent;
     - the capacity check (0, −1, 1.5, NaN);
     - `asked()` returns a copy;
     - one pass evicts several.
- **Tests:** about 13, all new. `QuestionBook.test.ts` becomes the normative test home of
  BEH-QD-198 and the bound.
- **Verify:** `pnpm vitest run packages/react/test/QuestionBook.test.ts`; `pnpm circular`;
  `grep -nE "^import" packages/react/src/QuestionBook.ts` (only `@qadi/core` types and
  `effect/MutableHashMap`); `node scripts/check-house-style.mjs`.
- **Done when:** the tests are green, madge is clean, and nothing imports the module yet,
  apart from its test.

### T4 — Put the atom set on the book; one opener
- **Status:** [x] done
- **Depends on:** T3, D-23-a, D-23-b, D-23-c.
- **Files:** `packages/react/src/QadiAtoms.ts`; `packages/react/src/HydrationEngine.ts` (the
  `track` input's doc comment only); `packages/react/test/QadiAtoms.test.ts`.
- **Steps:**
  1. In `makeQadiAtoms`: `const book = makeQuestionBook<SeededQuestion<EvaluationError>>({ capacity: options?.maxTrackedQuestions ?? DEFAULT_MAX_TRACKED_QUESTIONS, build: (q, entry) => seededDecision(q.policy, q.resource, entry) })`.
     Inside `seededDecision`,
     `track: (get) => { get.addFinalizer(book.retain(entry())); }`. The retain happens
     first and the finalizer is registered in the same reader call. Order and timing are
     identical to `:355-367`.
  2. Delete `TrackedQuestion`, `tracked`, `bare`, `byResource`, the inline sweep and the
     capacity check (it moved to the book).
  3. Public members:
     - `decision: (policy, resource) => book.open({ policy, resource }).handle.read` (D-23-a = B).
     - `asked: book.asked`.
     - `sweepEvictions: Effect.sync(book.sweep)`.
     - `hydrate` uses the lookup `(p, r) => book.open({ policy: p, resource: r }).handle.seed`.
     - `decisionFor` is removed (D-23-b = A) or kept as an alias (B).
     - `export type { AskedQuestion } from "./QuestionBook.ts"`.
  4. Rewrite the interface doc for `decision` to state the identity scope ("the same atom for
     an equal question for as long as it is tracked") and the immutability caveat (BL-05)
     now in `:387-400`.
  5. `QadiAtoms.test.ts`, replacing rather than layering:
     - Delete "evicts the oldest unmounted", "stops shrinking once every remaining entry is
       live" and the construction-validation test. All three now live in
       `QuestionBook.test.ts`.
     - Keep, through atoms, "never evicts a question a mounted gate still has open",
       "becomes eligible again once its gate unmounts" and "reappears in asked()". These
       are the adapter's integration tests, the only place `get.addFinalizer` meets the
       book.
     - Rename `decisionFor(` to `decision(` throughout.
     - Keep T1's and T2's tests as they are.
- **Tests:** net −3 in this file and +13 in `QuestionBook.test.ts`. All T1 and T2 tests
  stay green.
- **Verify:** `pnpm vitest run packages/react`; `pnpm typecheck`; `pnpm circular`;
  `grep -n "Atom.family\|TrackedQuestion\|inTracked" packages/react/src/QadiAtoms.ts`
  (nothing under B).
- **Done when:** criteria 1, 2, 4 and 5 hold, and every other React test file is unchanged.

### T5 — Delete the branch from the hooks; migrate tests and doc fences off `decisionFor`
- **Status:** [x] done
- **Depends on:** T4.
- **Files:** `packages/react/src/useGate.ts`; `packages/react/src/hooks.ts` (`useDecisionSuspense`);
  `packages/react/test/{Hydration,HydrationCounts,HydrationPayload,DecisionOutcome}.test.ts`;
  `spec/behaviors/09-react.md`; `spec/behaviors/19-hydration.md`; `spec/decisions/028-decision-hydration.md`
  (historic text: only a `>` amendment note, not an edit); `spec/appendices/react-integration.md`;
  `apps/website/src/content/docs/docs/concepts/hydration-reactivity.md`; `packages/react/README.md`
  (if it names `decisionFor`).
- **Steps:**
  1. `useGate.ts:58-62` and `hooks.ts:65-69` become
     `useMemo(() => atoms.decision(policy, resource), [atoms, policy, resource])`.
  2. Replace every `.decisionFor(` with `.decision(`. Apply it mechanically to tests and to
     docs, using the call-site list in §1 C1.
  3. In docs, change the "`decision(policy)` and `decisionFor(policy, resource)`" prose to
     "`decision(policy, resource?)`".
- **Tests:** renamed calls only, with no assertion changed. `Hydration.test.ts:605-620`
  (spread copy, double) stays green.
- **Verify:** `pnpm vitest run packages/react`; `node scripts/check-doc-examples.mjs`;
  `node scripts/check-website-doc-examples.mjs`;
  `grep -rn "decisionFor" packages/react/src spec/behaviors apps/website/src` (nothing, or
  only the `@deprecated` alias under D-23-b = B).
- **Done when:** criterion 3 holds, and the doc gates pass.

### T6 — `usePolicies` (and `useQuestions`) on the same path, registered with the gates
- **Status:** [x] done
- **Depends on:** T5, D-23-d, D-23-e, D-23-f.
- **Files:** `packages/react/src/GateWriter.ts`; `packages/react/src/useGate.ts`;
  `packages/react/src/hooks.ts`; `packages/react/src/QadiAtoms.ts` (D-23-f = A);
  `packages/react/test/GateRegistry.test.tsx`; `packages/react/test/GateWriter.test.tsx`;
  `packages/react/test/QadiAtoms.test.ts`.
- **Steps:**
  1. `GateKind` becomes the full union
     `"Can" | "Cannot" | "useCan" | "useDecision" | "useDecisionSuspense" | "usePolicies" | "useProjected" | "useQuestions"`,
     dropping `useQuestions` if D-23-e ≠ B.
  2. `GateWriter.ts`: `useGateRegistrations(writer, identities: ReadonlyArray<GateIdentity>, states: ReadonlyArray<GateRenderState>)`.
     - One effect owns identity lifecycle. It keys on the identities' `id`+`atom` pairs,
       registers new ones, unregisters the ones that are gone, and keeps a
       `Map<id, GateHandle>` in a ref.
     - A second effect pushes `update(state)` per handle.
     - Both return immediately when `writer === undefined`.
     - `useGateRegistration(writer, identity, state)` becomes
       `useGateRegistrations(writer, [identity], [state])`, with arrays memoised on
       `identity.atom` so `useGate`'s effect dependencies keep their current identity.
       `GateWriter.test.tsx`'s existing tests must pass unchanged. That is the proof the
       single-instance path did not move.
  3. D-23-f = A: on the atom set,
     `decisions = Atom.family((qs: Readonly<Record<string, AskedQuestion>>) => Atom.make((get) => mapValues(qs, (q) => get(decision(q.policy, q.resource)))))`.
     Expose it on `QadiAtoms` and delete `combinedFamily` from `hooks.ts`.
  4. `useQuestions(questions)`:
     - `useQadiContext("useQuestions")`, then `atom = useMemo(() => atoms.decisions(questions), …)`,
       then `results = useAtomValue(atom)`.
     - Build the identities from `Object.entries(questions)`, each with
       `atom: atoms.decision(q.policy, q.resource)`, memoised on `atom`.
     - States are `outcomeOf(results[key])._tag`. This is the only read, so there are no
       raw reads.
     - Call `useGateRegistrations`.
     - `usePolicies(p)` delegates with kind `"usePolicies"`. That needs an internal
       `useQuestionsAs(kind, …)`, out of the barrel for the same reason `useGate` is.
  5. Tests in `GateRegistry.test.tsx`, a new `describe("grouped reads register per question")`:
     - Under `instrument`, `usePolicies({ read, admin })` lists two instances of kind
       `usePolicies`, with ids `<id>/read` and `<id>/admin`, and states that follow each
       decision.
     - Without `instrument`, the registry is empty.
     - Removing a key on re-render unregisters exactly that instance.
     - Unmounting unregisters all of them.

     In `QadiAtoms.test.ts`, test that `decisions` returns the same atom for an equal
     record. Move `hooks.test.tsx`'s sharing test's *subject* there in spirit, but leave
     `hooks.test.tsx` itself untouched (criterion 7).
- **Tests:** about 6 new, and `GateWriter.test.tsx` unchanged.
- **Verify:** `pnpm vitest run packages/react`; `pnpm test:tstyche` (if `GateKind` is
  pinned in `*.tst.ts`: `grep -rn GateKind packages/react/test/*.tst.ts`);
  `node scripts/check-house-style.mjs`.
- **Done when:** criteria 6, 7 and 8 hold.

### T7 — Re-point the reactivity canary at what the package now depends on
- **Status:** [x] done
- **Depends on:** T4, T6.
- **Files:** `packages/react/test/v4-reactivity-smoke.test.ts`.
- **Steps:**
  1. Add a canary: `MutableHashMap` keys a fresh `{ policy, resource }` structurally,
     `remove` by an equal key works, and unequal keys stay apart. Under D-23-c = B this is
     what decision sharing rests on.
  2. Keep the `Atom.family` structural canary (`:71-91`), because `decisions` (D-23-f = A)
     still uses it. Add a sentence and an assertion that the family's values are **weakly**
     held: after `collect()`, a family value nothing references is rebuilt. Comment that
     this is why the book holds handles itself (C5).
  3. Update the file header's "every API exercised here is one `QadiAtoms.ts` or
     `QadiProvider.tsx` actually calls" so it includes `QuestionBook.ts`.
- **Tests:** two canaries added. None removed.
- **Verify:** `pnpm vitest run packages/react/test/v4-reactivity-smoke.test.ts`.
- **Done when:** green, and each canary names the module that depends on it.

### T8 — Mutation scope for the book
- **Status:** [x] done
- **Depends on:** T3, D-23-g.
- **Files:** `stryker.react.mjs`; `spec/process/definitions-of-done.md` (row 22's text and
  the change-history row).
- **Steps:**
  1. Set `mutate: ["packages/react/src/DecisionOutcome.ts", "packages/react/src/QuestionBook.ts"]`
     and extend the header comment ("mutate what decides").
  2. Change row 22 to name both files, keeping the break threshold at 80, and add a DoD
     change-history entry with `CCR-QD-NEXT`.
  3. Run it once locally, outside `pnpm check`. Kill survivors with `QuestionBook.test.ts`
     cases, not with atoms.
- **Tests:** what the survivors demand.
- **Verify:** `pnpm exec stryker run stryker.react.mjs`; `node scripts/check-dod-table.mjs`.
- **Done when:** the score is ≥ 80 and gate 11 passes.

### T9 — Spec, ADR, AGENTS.md, overview, traceability, CCR, changeset
- **Status:** [x] done
- **Depends on:** T4–T8.
- **Files:**
  - `spec/behaviors/09-react.md` (BEH-QD-065 listing and requirement; BEH-QD-068 listing)
  - `spec/behaviors/25-inspection.md` (BEH-QD-198)
  - `spec/behaviors/28-devtools-screens.md` (BEH-QD-233 note on the multi-instance hook)
  - `spec/invariants.md`
  - `spec/decisions/NEXT-a-question-is-opened-once.md` *new*
  - `spec/decisions/053-a-gate-can-be-found.md` (amendment blockquote)
  - `spec/decisions/index.yaml`
  - `spec/traceability.md`
  - `spec/overview.md`
  - `spec/README.md` (CCR row)
  - `spec/appendices/react-integration.md`
  - `AGENTS.md` §13 (**needs the user's approval**: it is the project's rules file)
  - `apps/website/src/content/docs/docs/packages/react/hooks.md`
  - `packages/react/README.md`
  - `examples/nextjs-newsroom/src/client/Dock.tsx` (the stale comment at `:151-153`)
  - `packages/devtools/src/react/QuestionsPanel.tsx` (comment only: `usePolicies` now
    appears as instances)
  - `.changeset/<name>.md` *new*
- **Steps:**
  1. **BEH-QD-065.**
     - Listing: `decision(policy, resource?)`. `decisionFor` is removed. Add `gates`,
       `sweepEvictions` and (D-23-f) `decisions`. `QadiAtomsOptions` gains
       `maxTrackedQuestions` and `onGateIdCollision` (C8).
     - Rewrite the REQUIREMENT as: "MUST return the same atom for an equal question for as
       long as the atom set tracks it, regardless of garbage collection".
  2. **BEH-QD-198.** Add REQUIREMENTs:
     - "MUST NOT list one question twice";
     - "MUST bound itself to `maxTrackedQuestions` cold questions";
     - "MUST NOT drop a question any reader holds open, including across a recompute";
     - "a question re-asked after eviction reappears".
  3. **Invariants.** A new INV, "a live question is never evicted, and one question has one
     handle while tracked". It cites `QuestionBook.ts`, and its Enforcement names
     `QuestionBook.test.ts`, T2's tests and the Stryker scope.
  4. **ADR-QD-NEXT**, "A question is opened once, in a book its atom set owns". It records
     C5's root cause, D-23-a…h as decided, and why `{ read, seed }` stays internal
     (ADR-QD-039).
  5. **ADR-QD-053 amendment.** `GateKind` gains `usePolicies`/`useQuestions`, and a grouped
     hook registers one instance per question.
  6. **Overview.** `AskedQuestion` is "declared in `QuestionBook.ts`, re-exported from
     `QadiAtoms.ts`". Add `useQuestions` to the hooks row. Run `node scripts/check-api-surface.mjs`.
  7. **Traceability.** The 09 row's sources gain `QuestionBook.ts`. Add a row for
     `QuestionBook.test.ts` (BEH-QD-198, the new INV). `GateRegistry.test.tsx`'s row gains
     BEH-QD-068 for the grouped hooks.
  8. **AGENTS.md §13**, after user approval:
     - "Atoms are keyed structurally" gains "through the atom set's question book (a
       `MutableHashMap`), which holds each handle strongly while tracked".
     - Fix the "No module-scope state" sentence's truth (C7, now true).
     - The eviction-sweep paragraph names `QuestionBook.ts`.
  9. **Changeset.** `@qadi/react` minor (0.x breaking):
     - `decisionFor` removed, so use `decision(policy, resource)`;
     - `QadiAtoms` gains `decisions`, so hand-written doubles must add it;
     - `GateKind` widened;
     - `usePolicies` registers under `instrument`;
     - `useQuestions` added.

     Include the exact migration lines. Fold T1's patch note in if it has not shipped.
- **Tests:** none of its own. The doc gates compile the fences.
- **Verify:** `pnpm spec:examples`; `pnpm spec:verify:strict`; `pnpm spec:gates`;
  `pnpm spec:api`; `pnpm spec:website-examples`; `node scripts/check-devtools-claims.mjs`.
- **Done when:** every spec gate passes, and `grep -rn "decisionFor" spec/behaviors spec/appendices apps/website/src`
  finds only history and amendment notes.

### T10 — Full gate
- **Status:** [x] done
- **Depends on:** T1–T9.
- **Files:** none
- **Steps:** run `pnpm check`. If coverage on `packages/react/src/**` (90%) drops, cover
  the book or registration branches in their own test files, not through rendering.
- **Verify:** `pnpm check`
- **Done when:** exit 0. Record the result and the Stryker score in §10.

### T11 — Update the tracker
- **Status:** [x] done
- **Depends on:** T10.
- **Files:** this plan's frontmatter and §10; the ARCH-23 row in `.planning/architecture/README.md`
  (the orchestrator edits that file; hand it the numbers).
- **Steps:**
  1. Set `status:`.
  2. Tick the tasks.
  3. Write the decided D-23-x outcomes into §5.
  4. Replace the CCR-QD-NEXT/ADR-QD-NEXT placeholders with the landed numbers.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-23-*.md | sort | uniq -c`
- **Done when:** the tracker row matches the plan.

## 7. Test strategy

- **Unchanged, as a pin:** `QadiProvider.test.tsx`, `hooks.test.tsx`, `edges.test.tsx`,
  `HydrationRender.test.tsx`, `ServerRender.test.tsx`, `GateWriter.test.tsx` and
  `DecisionOutcome.test.ts` (whose two `decision(` calls already have the new shape). These
  are the render sequences, "off means absent" (INV-QD-046), and the single-instance
  registration lifecycle.
- **Moved to the new interface:** eviction order, stop-when-live, the capacity check and
  `asked()`-as-copy move from atoms (`QadiAtoms.test.ts:311-457`) to `QuestionBook.test.ts`,
  which is plain and has no scheduler waits. Three tests are deleted from
  `QadiAtoms.test.ts` (T4 step 5), so each property has one home.
- **Kept as adapter integration tests:** the three mounted sweep tests. They are the only
  place `get.addFinalizer` meets `retain`/`release`, and T2's recompute tests sit with them.
- **New regressions:** T1's collection tests (C5) and T2's recompute pins (C6). Both rely on
  the in-test `gc()` helper or synchronous registry semantics, not on wall-clock sleeps.
- **Renamed only:** every `decisionFor(` call in the hydration tests (T5). No assertion
  changes.
- **Canaries:** `v4-reactivity-smoke.test.ts` pins the `effect` behaviour each design choice
  rests on. That is `MutableHashMap` structural keying, `Atom.family`'s weak values, and the
  synchronous dispose→re-read.
- **Mutation:** `stryker.react.mjs` extends to `QuestionBook.ts` (D-23-g), killed from
  `QuestionBook.test.ts`. No property-based test is proposed. The book's state space (cold
  and live entries, capacity) is small enough that the enumerated cases plus mutation are
  stronger evidence than a generator. If Stryker leaves survivors in the sweep's
  selection, add one `fast-check` model test (random open/retain/release/sweep sequences
  against an array model) instead of more examples.

## 8. Spec and documentation updates

- `spec/behaviors/09-react.md`: BEH-QD-065 gets the listing and a scoped "same atom"
  requirement. BEH-QD-068 gets `useQuestions` and the grouped registration note.
- `spec/behaviors/25-inspection.md`: BEH-QD-198 gets the bound, liveness, no duplicates
  and re-admission.
- `spec/behaviors/28-devtools-screens.md`: BEH-QD-233 notes that a grouped hook lists one
  instance per question.
- `spec/invariants.md`: a new INV-QD-NEXT, with Source `QuestionBook.ts`.
- `spec/decisions`: ADR-QD-NEXT (new), an ADR-QD-053 amendment, `index.yaml`, and ADR-QD-025
  only if its scoped-config list names files.
- `spec/traceability.md`, `spec/overview.md` (gate 13), and a `spec/README.md` CCR-QD-NEXT
  row.
- `spec/process/definitions-of-done.md`: row 22 (gate 11), under D-23-g = A.
- `AGENTS.md` §13: keying wording, the module-scope claim and the sweep's home. This needs
  the user's approval.
- Website `hooks.md` and `hydration-reactivity.md`; `packages/react/README.md`.
- The `examples/nextjs-newsroom/src/client/Dock.tsx` comment.
- A changeset, with `@qadi/react` minor and the migration lines. T1 alone is a patch.

## 9. Risks and rollback

- **Eviction now drops atoms, not just rows (D-23-c = B).** A cold question's seed, written
  but not yet read, can be evicted when more than `maxTrackedQuestions` questions are cold.
  - *Shows up as:* a hydrated gate flashing `Pending` on a page with more than 500
    dehydrated entries.
  - *Mitigation:* the provider's first sweep runs at mount, after children have rendered
    and retained their questions, and the default bound is 500.
  - *Rollback:* D-23-c → A, which keeps the old timing.
- **A collection-dependent test is flaky.** If T1's tests are ever green without the fix,
  the helper is not collecting.
  - *Detection:* run T1's tests against the pre-fix commit in T0 (they must be red 5/5).
  - *Mitigation:* keep the 5-cycle collect with macrotask yields. If a future Node changes
    `vm.runInNewContext("gc")`, guard the helper with `it.skipIf(gc === undefined)` and
    leave a comment, never a silent pass.
- **Registration churn for grouped hooks.** A record rebuilt inline each render would
  re-register if the effect keyed on the record.
  - *Mitigation:* key identities on each entry's decision atom (structural), as
    `useGateRegistration` already does.
  - *Detection:* the T6 test that re-renders with an equal record asserts zero extra
    notifications.
- **The `GateKind` widening breaks a host's exhaustive `Match` over it.**
  - *Mitigation:* this is intended. It is a compile error at the host and is listed in the
    changeset. `@qadi/devtools` is unaffected (C4).
- **Overlap with ARCH-24.** If ARCH-24 turns `gates` into a sampled store, it must keep
  `kind` an open string and tolerate several instances sharing one `useId` prefix.
  Coordinate before either merges.
- **Rollback.**
  - T1 and T2 are independent, test-led commits. Keep them even if the refactor is reverted.
  - T3–T8 revert as one unit. `QuestionBook.ts` is internal, so reverting it changes only
    `QadiAtoms.ts`.
  - The public breaks (D-23-b, D-23-f, the `GateKind` widening) are confined to T5, T6 and
    T9, and revert with them.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence verified at `e328e75`; C5 (GC identity loss) reproduced by scratch probes | planner |
| 2026-10-07 | T0 | baseline `pnpm vitest run packages/react`: 15 files, 270 tests; devtools untouched | implementer |
| 2026-10-07 | T1 | red first, 3/3 runs: four collection tests (`test/support/collect.ts`; `QadiAtoms.test.ts` x3, `Hydration.test.ts` x1). Deviation: no intermediate `Atom.family` patch; went straight to the book's strong map (T3/T4), which makes them green | implementer |
| 2026-10-07 | T2 | smoke canaries (synchronous dispose-then-re-read, direct and through `withReactivity`) and two `QadiAtoms.test.ts` pins; scratch mutation (finalizer decrements by 2) turns three sweep tests red, as required | implementer |
| 2026-10-07 | T3 | `QuestionBook.ts`, `QuestionBook.test.ts` (17). Deviation: `open(question)` returns the handle and `build(question, live)` receives the `live()` that returns the idempotent release, instead of `BookEntry`/`retain(entry)`; the entry is private | implementer |
| 2026-10-07 | T4-T5 | `QadiAtoms.ts` on the book; `decisionFor` removed, hooks lose the branch, tests and docs renamed. `QadiAtoms.test.ts` loses the three tests that moved to the book | implementer |
| 2026-10-07 | T6 | `useGateRegistrations` (per-id diff; `useGateRegistration` its one-element case), `useQuestions`, `usePolicies` registered, `decisions` on the atom set; six `GateRegistry.test.tsx` cases, two `decisions` cases; `GateWriter.test.tsx` and the five pinned render-sequence files byte-unchanged | implementer |
| 2026-10-07 | T7 | canaries for `MutableHashMap` keying and `Atom.family`'s weak values | implementer |
| 2026-10-07 | T8 | `stryker.react.mjs` + DoD row 22 / rev 1.14. Scoped run: 92.50 total (DecisionOutcome 100, QuestionBook 91.67; 6 survivors, equivalent or an idempotence case since tightened) | implementer |
| 2026-10-07 | T9 | spec/ADR-QD-103/INV-QD-105/CCR-QD-201; AGENTS.md §13 edited (user-authorised): the structural-keying bullet and the eviction paragraph now name `QuestionBook.ts`; the "no module-scope state" claim needed no edit, it is now true. Gates green: typecheck, lint, circular, tstyche, vitest react+devtools, spec:examples/verify:strict/gates/claims/api/website-examples | implementer |
| 2026-10-07 | T10-T11 | `pnpm check` left to the orchestrator; committed with the rest of ARCH-23 | implementer |
