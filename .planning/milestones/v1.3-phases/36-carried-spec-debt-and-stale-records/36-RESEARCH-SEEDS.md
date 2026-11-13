# Phase 36: Hydration seeds lost on a late mount - Research (design step)

**Researched:** 2026-11-12
**Base:** `d31a25ee8207d4775d07253ea4e987cbe8daf0cc`. `effect@4.1.2` ([VERIFIED: `node_modules/effect/package.json`], `"version": "4.1.2"`). The reactivity sources are at `node_modules/effect/src/reactivity/` (not `unstable/`); the repo imports them as `effect/reactivity/Atom` and `effect/reactivity/AtomRegistry`.
**Scope:** CONTEXT D-14 only. The `subject` keepAlive fix, 28 IN-06 and the rest are covered elsewhere (`36-RESEARCH-CODE.md`).
**Confidence:** HIGH on the reproduction, the loss modes and the measured behaviour of every candidate (all run this session against the base, then reverted). MEDIUM on the real-world frequency of the late-mount case (React selective hydration timing is `[ASSUMED]`, not measured).

## Summary

A hydration seed is written to the registry only as an `initialValues` entry for a private seed atom (`HydrationEngine.ts:694`, `QadiAtoms.ts:385-391`, `QadiProvider.tsx:216-221`). The registry schedules removal of every non-keepAlive node at creation (`AtomRegistry.ts:623-625`, `635-641`) and removes it on the next macrotask when nothing holds it (`:811-813`). Nothing holds a seed node until a gate reads its question, so a gate that mounts later, a gate under a hidden-then-shown `<Activity>`, a gate that unmounts and remounts, and a bare registry read after one macrotask all find no seed and render `pending`. Six reproductions are RED at the base.

Every design that survives a bare-registry read has to keep something alive inside the registry, because the window between registry construction and the removal task contains no code of the atom set's. The candidates therefore differ only in **what** is kept. The user's candidate A (the atom set holds the seed in the question book's entry, outside the registry) is **unsafe as stated**: the entry is shared by every registry over the atom set, so a registry that was never given a seed reads another registry's seed (reproduced, RED). Naive `Atom.keepAlive` on the seed atom is worse than D-14 states: `read` reads the seed atom for every question, hydrated or not, so it leaves **one pinned node per distinct question ever asked** (measured 51 nodes against 1 for 50 questions), and it lets a spent seed come back after a remount (INV-QD-028 violation, reproduced). A provider-owned mount cannot cover a bare registry; `setIdleTTL` is a timer and still loses the seed.

**Primary recommendation: candidate A2, "the question book's handle holds the seeds; the registry holds only a keepAlive grant."** Each question's handle keeps a `WeakMap<SeedGrant, SeededDecision>`; `hydrate` returns, per verified entry, `[grantAtom, grant]` instead of `[seedAtom, SeededDecision]`; `read` finds a seed by looking up the grant node **only if that node exists** in this registry (`registry.getNodes().get(grantAtom)`), and never after this registry's client has answered (`state.announced`). The seed is forgotten with the handle (ADR-QD-103's "forgotten with its row"), is invisible to any registry that was not given the grant, creates no node for an unhydrated question, and needs no timer, hook or teardown beyond the `registry.dispose()` the provider already runs. It touches two source files (`HydrationEngine.ts`, `QadiAtoms.ts`), moves no house-style budget, is not in the mutation list, and is a `@qadi/react` patch. It was built typed, passes the whole react suite (484 tests) with five internal seam tests migrated, and is clean under `oxlint` and `check-house-style`.

**One ordering constraint matters more than the choice of mechanism:** the `subject` keepAlive fix must land **before** (or in the same plan as, and earlier than) the seed fix. With the seed fix alone, a late gate whose subject node was lost shows the server's **allow forever**, because the decision atom can never compute and the seed is never superseded (reproduced as SEED6 below). That is a worse outcome than the bug being fixed.

## Candidate by criterion

Criteria from the brief, in its order. "A2" is the recommendation. Evidence for each cell is in the Measurement section. A tick means met by measurement; a cross means failed by measurement; "part" means met with a stated qualification.

| # | Criterion | A: book entry holds seed (as stated) | A2: handle holds seeds, registry holds a grant (recommended) | B: provider mounts seed atoms | C: `setIdleTTL` on seed atoms | K: `Atom.keepAlive` on seed atoms (rejected by D-14, control) |
|---|---|---|---|---|---|---|
| 0 | Fixes the reproductions (SEED1-3, SEED5, BARE) | yes, all 5 | yes, all 5 | provider cases only; **BARE stays RED** | only inside the TTL; **SEED1-LATE RED** | yes, all 5 |
| 1 | No timer | yes | yes | yes | **no** (`setTimeout`, `Date.now`: `AtomRegistry.ts:678,685`; default resolution rounds 100 ms up to 1000 ms, `:677`) | yes |
| 2 | No lifetime something must tear down | yes | yes (grant node ends with `registry.dispose()`, as `subject` will) | **no**: the provider owns a mount set | yes | yes |
| 3 | Bounded by `maxTrackedQuestions` and the sweep, no second bound | yes (entry dies with the book entry) | **part**: seed values bounded by the book; one tiny grant node per *hydrated* question stays until dispose (measured 3 nodes with `asked()` at 2) | no (pinned until dispose) | no | **no**: seed nodes *and values* pinned until dispose, plus one node per unhydrated question (measured 51 vs 1) |
| 4 | No sweep or release on the render path or in the dispose-then-reread window | yes | yes (adds no sweep, no hook, no `QuestionBook` change) | yes | yes | yes |
| 5 | Seed precedence unchanged, live answer beats seed | **no**: needs the `announced` guard (CTRL2 RED without it) | yes, with the guard | yes, with the guard | yes, with the guard | **no without the guard** (CTRL2 RED); yes with it |
| 6 | No public API change | yes | yes (`InitialValues` type unchanged; pair values become opaque) | **no**: provider change, and a release path would need a new `QadiAtoms` member | yes | yes |
| 7 | Fewest moving parts | fewest | one class, one `WeakMap`, one lookup, 5 internal tests migrated | provider mount set plus guard | one combinator | fewest (but see 3) |
| - | **Registry containment** (a registry never given a seed reads none; module-scope atoms on a server) | **RED: CTRL fails** (cross-registry and cross-request leak) | yes (CTRL green) | yes | yes | yes |
| - | **No growth with questions asked** | yes | yes (LEAK probe: 1 node, same as base) | yes | yes | **no** (LEAK probe: 51 nodes) |

Reading the table: A fails containment, K fails growth and (without the guard) supersession, B fails the bare registry, C fails the timer criterion. A2 is the only candidate that passes the five functional reproductions *and* the three safety controls, at the cost of criterion 7 (more parts than K) and a qualified criterion 3 (grant nodes). **If the user relaxes D-14, K plus the presence-gated read plus the `announced` guard is a two-line alternative with the same node pin as A2** (measured: same NODES result); the only thing A2 buys over it is that seed *values* (which can carry a whole disclosed trace) are bounded by the book instead of by the registry.

## Q1. Reproduction and characterisation

### The minimal failing test (run at the base, prototype deleted)

Prototype `packages/react/test/zzSeedLoss.test.tsx` (deleted; copy of its final content kept outside the repo at `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/zzSeedLoss.test.tsx.bak`). Shape: `hydrateDecisions(atoms, dehydrateDecisions([{ policy: isAdmin, decision: serverDeny }]), reader)`, `<QadiProvider subject={undefined} initialValues={...}>`, no gate, `await new Promise(r => setTimeout(r, 20))`, then mount `<Can policy={isAdmin} pending="pending" fallback="denied">`. A real timer turn is required, because the registry's removal task is a real macrotask, not a `TestClock` event.

Output at the base (`pnpm vitest run --project react packages/react/test/zzSeedLoss.test.tsx < /dev/null`):

```
× SEED1 a gate that mounts after one macrotask reads the seed              (body: <div>pending</div>)
× SEED1-LATE a gate that mounts 1.5 s after the registry reads the seed
× SEED5 realistic: subject known, resolver silent, gate mounts late         (body: pending)
× SEED2 a gate under a hidden-then-shown Activity, provider outside
× SEED3 a gate that unmounts and remounts later
× BARE  a bare registry (no provider) read after one macrotask
✓ SEED4 the sweep forgets a cold seed past the bound (spec-allowed)
✓ CTRL  a registry given no seed never reads another registry's seed
✓ CTRL2 a spent seed is not read again after a remount (INV-QD-028)
```

Root cause: `[VERIFIED: AtomRegistry.ts:497-507]` the constructor seeds `ensureNode(target).setInitialValue(...)` per pair; `[VERIFIED: :623-625]` `createNode` calls `scheduleAtomRemoval` for any atom whose `keepAlive` is false; `[VERIFIED: :635-641]` that task runs at delay 0 and removes the node when `canBeRemoved`; `[VERIFIED: :811-813]` `canBeRemoved` is `!this.atom.keepAlive && this.listeners.size === 0 && this.children.size === 0 && this.state !== 0`. A seed node has no children until a decision's `read` atom has built (it reads the seed reactively, `HydrationEngine.ts:745`), so with no reader at the first macrotask it is removed and `registry.get(seed)` creates a fresh node holding `undefined`. (Correction to a thought worth recording: an *uninitialized* node is **not** immortal. `NodeState.uninitialized` is `alive | waitingForValue` = 5, and `removed` is 0, `AtomRegistry.ts:752-766`; `state !== 0` only means "not already removed".)

A small additional fact the base shows: the **`subject` node is removed in the same way** (NODES probe at the base: `before=4 after=0`: the subject node and three seed nodes all gone after one turn). That is the other half of D-02 item 3, and it interacts with this fix (see "Interaction with the `subject` fix").

### Every way a seed is lost today

| # | Loss mode | Reproduced | Mechanism | Meant to survive per the spec? |
|---|---|---|---|---|
| L1 | A gate mounts after one macrotask with no reader (late mount, lazy route, a Suspense boundary that hydrates later) | SEED1, SEED5 RED | registry removes the unread seed node | Not stated. See the spec reading below: the spec treats a seed lost before its first read as a defect when the cause is a collection, and is silent on the registry's own removal. |
| L2 | A gate under a hidden-then-shown `<Activity>` with the provider outside | SEED2 RED | hide releases the gate's subscription, the seed node loses its child and is removed; the shown gate finds none (the client never answered, subject undefined) | Not stated. BEH-QD-151 says a seed is superseded only by "this client's own answer". |
| L3 | A gate that unmounts and remounts later | SEED3 RED | same | Same. |
| L4 | A bare `AtomRegistry` (no provider; BEH-QD-511's "no provider" host) read after one macrotask | BARE RED | same | Same. Any fix that lives in the provider cannot cover it. |
| L5 | Eviction by the Phase 35 sweep (question cold and over `maxTrackedQuestions`) | SEED4 green at the base, must stay green | the book drops the handle, so the next `open` builds a fresh handle with a fresh seed atom | **Yes, allowed.** INV-QD-105 (`spec/invariants.md:3209-3213`): "a seed written and never read can be forgotten with its row once more than `maxTrackedQuestions` questions are cold". ADR-QD-148 Cost (`148-*.md:70-74`): "A seed written and never read is forgotten within a few macrotasks of the pressure ... Hydrated questions mounted in one synchronous span survive it (three seeds over a bound of 2 all stayed seeded)". |
| L6 | A collection of the weakly held family atom | pinned green by `Hydration.test.ts` "keeps a seed across a collection that lands before the first read" | closed by the question book (ADR-QD-103) | **Yes, required.** BEH-QD-198 (`spec/behaviors/25-inspection.md:773`): "`asked` MUST NOT list one question twice, including after a garbage collection, and MUST NOT lose a question's hydrated seed to one." |

Not a loss mode but easy to confuse with one: a provider that unmounts and remounts builds a **new** registry from `initialValues` again (`QadiProvider.tsx:216-221`, `279-292`), so seeds are re-applied.

### What the spec says (quoted)

- ADR-QD-103 Context (`spec/decisions/103-a-question-is-opened-once.md:27-31`): "a hydrated seed lost if the collection landed between `hydrateDecisions` and the first read (the gate showed `Pending` and the client decided, so it failed closed, but hydration silently did nothing)". The spec names exactly this symptom, "a seed written, not yet read, then gone", as the defect ADR-QD-103 fixed, for the collection cause only.
- INV-QD-105 Implication (`spec/invariants.md:3207-3213`): "...and lost a hydrated seed written before its first read. The loss failed closed (the gate showed `Pending`), but it was silent. A swept question is no longer tracked, and asking it again builds a fresh handle; a seed written and never read can be forgotten with its row once more than `maxTrackedQuestions` questions are cold."
- BEH-QD-151 (`spec/behaviors/19-hydration.md:300-303`): "Once this client has produced a decision of its own — an allow, a denial, or a failure — that decision MUST be what every consumer reads, and the seed MUST NOT be read again."
- BEH-QD-149 (`19-hydration.md:258-259`): "While a seed is what a consumer reads, it MUST read as an `AsyncResult` success that is not `waiting` and carries a `SeededDecision`".
- BEH-QD-067 (`spec/behaviors/09-react.md:362`): the server-render pending gap "is precisely the gap a hydration seed covers".
- BEH-QD-152's explanatory prose (`19-hydration.md:381-387`): "A seed lives in an atom beside the decision's, and it is only ever a *dependency* of that decision — nothing mounts it. A registry may therefore drop its value, and one did". This is a live present-tense statement that this fix makes false; it needs restating (see the BEH/INV text).

**Where the spec is silent:** late mount, Activity, remount and a bare registry (L1-L4). Nothing permits or forbids a registry's own idle removal of a seed. The only permitted forgetting is eviction (L5). Reading the three together, the intent is: a seed lasts from registry construction until this client answers the question or the question is dropped from the book. The base violates that intent in L1-L4. This is a finding for the record, so the change is a restatement of an existing requirement plus two new ones, not a spec reversal.

## Q2. Candidates, measured

Every row below was run: edit, `pnpm vitest run --project react <repro>`, then the whole react suite where noted, then restore from `git show HEAD:<file>`. Only the recommendation was also built typed (`tsc -p packages/react/tsconfig.src.json --noEmit`, `oxlint packages/react/src`, `node scripts/check-house-style.mjs`).

Probe tests (all in the deleted prototype): SEED1 (late mount, subject undefined), SEED1-LATE (mount after 1.5 s), SEED2 (Activity, provider outside), SEED3 (unmount/remount), SEED4 (eviction forgets), SEED5 (subject known, silent resolver, late mount: the server-render shape), SEED6 (late mount, resolver answers deny after 1 ms: the client must supersede the seed), BARE (bare registry), CTRL (a registry given no seed reads none), CTRL2 (a spent seed is not read again after the gate remounts), NODES (`registry.getNodes().size` after one turn, three seeds, bound 2, no reader), LEAK (`getNodes().size` after mounting and releasing 50 distinct unhydrated questions, bound 5).

| Probe | Base | A (book entry) | A2 (recommended) | B (provider mount) | C (TTL 100 ms) | K (keepAlive) | K + guard + presence |
|---|---|---|---|---|---|---|---|
| SEED1 | RED | green | green | green | green | green | green |
| SEED1-LATE (1.5 s) | RED | green | green | green | **RED** | green | green |
| SEED2 | RED | green | green | green | green | green | green |
| SEED3 | RED | green | green | green | green | green | green |
| SEED4 (eviction forgets) | green | green | green | green | green | green | green |
| SEED5 | RED | (not run) | green | (not run) | (not run) | (not run) | (not run) |
| BARE | RED | green | green | **RED** | green | green | green |
| CTRL (containment) | green | **RED** | green | green | green | green | green |
| CTRL2 (no resurrection) | green | RED, green with guard | green (guard) | green (guard) | green (guard), RED without | **RED without guard**, green with | green |
| NODES after (3 seeds, `asked()`=2) | 0 | 0 | 3 | 0 (bare registry) | 3 until TTL | 3 | 3 |
| LEAK nodes (50 unhydrated) | 1 | n/a | **1** | n/a | n/a | **51** | 1 (with presence gate) |
| Whole react suite | 475 pass | 479 pass, CTRL and CTRL2 RED | 484 pass, 5 engine seam tests migrated (2 more typed sites) | not run | not run | 481 pass (6 probes, with guard) | not run |

"K + guard + presence" here is the control I did not build separately; it is the K edit plus the same two lines A2 uses (`state.announced` guard; `getNodes().get(...)` presence check). Its row is inferred from A2's behaviour for the shared lines and from K's measured results, and is marked as such: **`[ASSUMED]` for the NODES and LEAK cells of that column** (not run). Treat it as a description of the fallback, not a measurement.

### A. The atom set holds the seed itself (the user's stated candidate)

Prototype: a `held` variable beside the seed atom, set by `hydrateWith` at hydrate time; `read` does `get(seed) ?? held`. Reproductions SEED1-4 and BARE go green. **CTRL goes RED:**

```
× CTRL a registry given no seed never reads another registry's seed
  (a registry built with no initialValues for the question reads SeededDeny)
```

Why it matters: an atom set is module scope (`examples/nextjs-newsroom/src/client/Providers.tsx:61-68` calls `hydrateDecisions(atoms, payload, subject)` during render, "including the **server** render of this client component", and its own header says "module scope on a server is request-shared state"). A seed held by the atom set is therefore read by every later registry, request or test over that atom set. Subject-id checks do not rescue it: `subject` can be `undefined` while the seed is wanted (the CONTEXT reproduction, `Hydration.test.ts` `seedsBeforeSubject`), and a same-subject registry that was not hydrated still reads a seed it was never given, which breaks BEH-QD-231's "a re-check MUST be counted only where the question was seeded". Without the `announced` guard CTRL2 is also RED (resurrection). Verdict: **unsafe as stated.** Containment has to be established by something a registry holds.

A subject-keyed variant (a `WeakMap` keyed by the `AuthSubject` object) was considered and rejected on paper, not built: it fails the `subject={undefined}` window the seed exists to cover (`get(subject)` is `undefined`), and it makes a same-object subject share seeds across registries.

### B. Seed kept alive until first read through a scoped mount the atom set owns

The atom set has no registry in hand when `hydrate` runs and none in the window before the removal task; the only code that sees the registry then is `QadiProvider`. Prototype: the provider calls `registry.mount(atom)` for every atom in `initialValues` right after `AtomRegistry.make`, plus the `announced` guard.

```
× BARE a bare registry (no provider) read after one macrotask still has the seed
```

SEED1-3 go green; **BARE stays RED**, so BEH-QD-511's "no provider, bare registry" host is not covered. A release at first answer would need the provider to hand its mount releases to the atom set, a new `QadiAtoms` member (a public API change) and a set of releases something must tear down, which fails criteria 2 and 6. Without the release it is K by another name (seed pinned for the registry's life). Not built further.

### C. `setIdleTTL` on the seed atoms

`Atom.setIdleTTL(100)` (`Atom.ts:229-257`). `[VERIFIED: AtomRegistry.ts:581-583,653-691]` a finite TTL makes `removeNode` call `setNodeTimeout`, which computes `Math.ceil(idleTTL / timeoutResolution) * timeoutResolution` with `timeoutResolution` defaulting to 1000 (`:497`), reads `Date.now()` (`:678`) and arms a real `setTimeout` (`:685`). Measured: SEED1-3 and BARE pass inside the TTL, **SEED1-LATE (1.5 s) is RED**, and CTRL2 is RED without the guard. Is it the CCR-QD-150 hazard? **No, a different one:** CCR-QD-150 was the registry-level `scheduleTask`/`defaultIdleTTL` option rerouting dispatch for every node. A per-atom TTL only changes `removeNode` for that atom's nodes. It fails on criterion 1 (it is a timer, with an ambient clock) and because a late mount beyond the TTL still loses the seed. AGENTS.md §13's prohibition stays untouched either way, because this design does not need it.

### K. `Atom.keepAlive` on the seed atom (rejected by D-14; measured as a control)

Prototype: `Atom.make<SeededDecision | undefined>(undefined).pipe(Atom.keepAlive)`. The five reproductions go green, and it passes the whole suite when the `announced` guard is added (481 tests). Without the guard:

```
× CTRL2 a spent seed is not read again after a remount (INV-QD-028)
  AssertionError: expected SeededDeny{ ...(5) } to be undefined
```

After the client answered and the gate unmounted, a later `Initial` (subject cleared) read the **spent** seed back. This is the resurrection BEH-QD-151 forbids; today it is impossible only because the seed node is removed.

The measurement that strengthens D-14 considerably: **`read` reads the seed atom for every question** (`HydrationEngine.ts:745`), hydrated or not, so a keepAlive seed atom creates a pinned node per question per registry:

```
LEAK: 50 distinct unhydrated questions mounted then released, bound 5
  base:    nodes=1   asked=5
  keepAlive nodes=51 asked=5
```

That is the unbounded-session leak `maxTrackedQuestions` exists to close (`QadiAtoms.ts:169-181`). Any design that makes the per-question atom keepAlive must therefore not create its node on read, which is what the presence check does.

### A2. The handle holds seeds, the registry holds a grant (recommended)

Built typed. The diff is `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/a2.diff` (60 lines in `HydrationEngine.ts`, 4 in `QadiAtoms.ts`); the design is specified in Q3.

Measured: all five reproductions, SEED4, SEED5, SEED6 (with the subject fix), CTRL, CTRL2, LEAK=1 green. Whole react suite with the `subject` keepAlive also applied and the five engine seam tests migrated: **484 passed** (the two probes that only print numbers are not counted). `devtools` project: 1320 passed. `examples/nextjs-newsroom` `pnpm test`: 42 passed, but that package resolves `@qadi/react` through the built `lib/`, so **that run did not exercise the prototype** (`[VERIFIED: packages/react/package.json:21-28]`, `exports["."].import` is `./lib/index.js`); the plan must rebuild before running it (see the pins).

## Q3. The recommendation: A2

### The mechanism

1. **The handle holds the seeds, per question.** In `makeSeededQuestion` (`HydrationEngine.ts:690-751`): `const seeds = new WeakMap<SeedGrant, SeededDecision>()`. A seed lives exactly as long as the book entry (and any reader still holding the old handle) does, so eviction forgets it with no hook and no change to `QuestionBook.ts` (a hook variant was built and measured too; it adds nothing a criterion needs and puts `QuestionBook.ts` inside the mutation scope).
2. **The registry holds a grant.** `const grantAtom = Atom.make<SeedGrant | undefined>(undefined).pipe(Atom.keepAlive)`, one per question. `SeedGrant` is an opaque class. `hydrate` returns `[grantAtom, grant]` per verified entry; the pair count and the drop semantics are unchanged (a dropped entry yields no pair, so no registry holds a grant for it).
3. **`read` finds a seed only through a grant that is present.**
   ```ts
   const seededIn = (registry: AtomRegistry.AtomRegistry): SeededDecision | undefined => {
     const node = registry.getNodes().get(grantAtom);          // never creates a node
     if (node === undefined) return undefined;
     const held = node.valueOption();                          // Some(grant) for a seeded, never-built node
     return Option.isSome(held) && held.value instanceof SeedGrant ? seeds.get(held.value) : undefined;
   };
   ```
   `[VERIFIED: AtomRegistry.ts:75]` `getNodes` is on the public `AtomRegistry` interface; `[VERIFIED: :946-951,752-766]` `valueOption()` is `Some(_value)` for a node in state `stale` (`alive | initialized | waitingForValue`), which is what `setInitialValue` leaves (`:953-958`), so no build is needed. The presence check is what stops an unhydrated question from creating a keepAlive node (LEAK=1).
4. **A seed is never read after this registry's client has answered:** `const seeded = state.announced ? undefined : seededIn(get.registry)` replaces `get(seed)` at `HydrationEngine.ts:745`. `announced` is the per-registry flag `AnnounceState` already keeps (`:623-646`, set at `:719-720`). This is BEH-QD-151 made explicit; today it holds only because the node is gone.
5. **The server's evaluation id still reaches the re-check:** `computedFor` is handed `seededIn` instead of the seed atom, and `QadiAtoms.ts:286` reads `seededIn(get.registry)` instead of `get.once(seed)`. Neither read registers a dependency (the grant is written once, at registry construction), so notification and batching are unchanged (ADR-QD-014's "exactly one `Atom.readable` per question" holds).
6. **The `AnnounceState.observedSeed` compensation is dead weight under A2** and can be deleted: it was added because "a registry may drop the value of an atom nothing mounted" (`HydrationEngine.ts:631-644`), which no longer happens. Measured: removing it passes the whole react suite (484). Recommend deleting it and its comment in the same change (fewer moving parts); the explanatory paragraph in BEH-QD-152 (`19-hydration.md:381-387`) is restated accordingly. If the planner prefers the smaller diff, keep it and correct its comment; it is harmless.
7. **No `@qadi/react` surface changes.** `HydrationSeedLookup` and `SeededQuestion` are in `HydrationEngine.ts`, which is out of the barrel (`HydrationEngine.ts:15-22`; no `index.ts` export names them, `[VERIFIED: grep of packages spec scripts examples website]`: only `HydrationEngine.ts`, `QadiAtoms.ts`, `QuestionBook.ts` (a comment), five spec/script mentions). `InitialValues` keeps its type; the second element of a pair is now opaque, which nothing documented depends on (`[ASSUMED]`: I did not grep `website/` docs for prose describing the pair's value).

### Exact modules and members

| File | Change |
|---|---|
| `packages/react/src/HydrationEngine.ts` | add `class SeedGrant`; add `export interface SeedSlot { hold(decision): readonly [Atom.Atom<unknown>, unknown] }`; `HydrationSeedLookup` returns `SeedSlot`; `SeededQuestion.seed` is a `SeedSlot`; `makeSeededQuestion` builds `grantAtom`, `seeds`, `seededIn`, `seed`; `computedFor` takes `seededIn`; `read` uses the presence-gated lookup and the `announced` guard; `planHydration` pushes `slot.hold(rebuild(...))` (line 548); delete `observedSeed` (optional, recommended); update the file header (`:4-6,24`), the `makeSeededQuestion` doc (`:656-676`) and the `AnnounceState` doc |
| `packages/react/src/QadiAtoms.ts` | `computedFor: (seededIn) =>` and `seededIn(get.registry)` at `:267,286`; correct the comment at `:282-285` (it explains `get.once(seed)`); `hydrate` (`:385-391`) is unchanged (`book.open(...).seed` is now a `SeedSlot`) |
| `packages/react/test/HydrationEngine.test.ts` | migrate the five seam tests (`:87-88, 116, 170-181, 218-221, 249, 282`) from `registry.set(q.seed, allow)` and `[atom, SeededDecision]` pairs to `AtomRegistry.make({ initialValues: [q.seed.hold(allow)] })` and `{ hold: (d) => [atom, d] }` doubles; lines 262 and 282 are type-only sites. All pass after migration (14/14). |
| `QuestionBook.ts`, `QadiProvider.tsx`, `SweepScheduler.ts` | **unchanged** |

Typed-prototype checks: `tsc -p packages/react/tsconfig.src.json --noEmit` clean; `oxlint packages/react/src` only the pre-existing `QadiAtoms.ts:364` `no-unused-vars` warning; `node scripts/check-house-style.mjs` printed `house-style: 485 file(s) clean (3 declared switch(es))`. `pnpm typecheck` (including `tsconfig.test.json`) was not run in full: the test project reports exactly the two type-only sites above, which the migration fixes. `pnpm circular` was not run; the change adds no import (`Option` is already imported at `HydrationEngine.ts:50`).

### House-style budgets

- `DECISION_READ_BUDGET`: **stays exactly two files**, `HydrationEngine.ts` at 2 (`scripts/check-house-style.mjs:592-603`). The new lines read `state.announced` and a node map, not an `AsyncResult`; `RAW_DECISION_READ` did not match (the gate was clean on the typed prototype).
- `UNTRACED_BUDGET`, `SWITCH_BUDGET`, `SCHEMA_ERROR_BUDGET`, `ANY_BUDGET`, `UNTRUSTED_DECODE_BUDGET`: untouched (no `Effect.fnUntraced`, no `switch`, no error class, no `any`, no decode token).
- AGENTS.md rules: no `as` (the `instanceof` narrows the registry's `any`); no module-scope state (`seeds` is per handle, `grantAtom` per handle); no `console`.
- Doc comments: lead with a one-line summary; do not cite D-NN or 36-NN. ADR/INV ids are normal in this repo's comments (`HydrationEngine.ts:15-22` cites ADR-QD-039).

### RED tests (fail at the base, pass after), with names and assertions

New file `packages/react/test/QadiProvider.seed.test.tsx` (React, same harness as `QadiProvider.sweep.test.tsx`: `render`, `Activity`, a real `setTimeout` turn, `settle()` from `./support/settle.ts`). Each builds the payload with `dehydrateDecisions([{ policy, decision }])` and `hydrateDecisions(atoms, payload, reader)`.

| Test | Setup | Assertion | Base |
|---|---|---|---|
| SD1 a gate mounted a macrotask late reads the seed | `subject={undefined}`, seeded deny, no gate, one 20 ms turn, then `<Can policy={isAdmin} pending="pending" fallback="denied">` | `screen.getByText("denied")` | RED: body is `pending` |
| SD2 the same with the subject known and a silent resolver (the server-render shape) | `Layer.succeed(AttributeResolver, { resolve: () => Effect.never })`, seeded allow for `hasAttribute("standing", eq(literal("good")))`, `subject={reader}` | `getByText("allowed")` after the late mount | RED: `pending` |
| SD3 a gate under a hidden-then-shown Activity, provider outside, reads the seed | `<QadiProvider ...><Activity mode={m}><Can .../></Activity></QadiProvider>`, `visible`, `hidden`, 20 ms, `visible` | `getByText("denied")` after the re-show | RED: `pending` |
| SD4 a gate that unmounts and remounts later reads the seed | mount, unmount, 20 ms, mount | `getByText("denied")` | RED: `pending` |
| SD5 the client supersedes a late seed, and the stale allow never sticks | resolver answers `"suspended"` after `Effect.sleep("1 millis")`, seeded allow, late mount, wait 200 ms | `getByText("denied")` | RED at the base (`pending`), **RED under the seed fix alone (`allowed` forever)**, green only with the `subject` fix: the ordering pin |

New file `packages/react/test/Hydration.lifetime.test.ts` (no React; `AtomRegistry.make({ initialValues: [[atoms.subject, ...], ...hydrateDecisions(...)] })`, `currentDecision(registry.get(atoms.decision(policy)))`):

| Test | Assertion | Base |
|---|---|---|
| HL1 a bare registry read after a macrotask still has the seed | `_tag` is `"SeededDeny"` after `await turn()` | RED |
| HL2 the seed lasts with no timer | with `vi.useFakeTimers()`, advance one hour, then read: `"SeededDeny"` (pins that no TTL was introduced; a TTL design fails it) | RED |

Green at the base and after (they exist to stop the wrong designs coming back; each is RED under a named rejected candidate):

| Test | Assertion | RED under |
|---|---|---|
| HL3 a registry never given a seed reads none | one seeded registry and one with only `[atoms.subject, ...]`: the second reads `undefined` | candidate A |
| HL4 a spent seed is not read again | mount, answer (`Deny`), release, wait one turn, set the subject to `undefined`, read: `undefined` | naive keepAlive |
| HL5 an unhydrated question leaves no node | 50 distinct questions mounted and released, bound 5, after a turn and `settle()`: `registry.getNodes().size` equals the node count after one question (1 in the probe) and `atoms.asked()` is 5 | naive keepAlive (51) |
| HL6 eviction forgets a cold seed | bound 1, two hydrated questions, `settle()`; the evicted question reads `undefined`, the kept one `"SeededDeny"` | a design that pins past eviction |
| HL7 two registries over one atom set each read their own seed | hydrate once per registry with different decisions for one question: each reads its own | a registry-independent store |

Engine unit tests (extend `HydrationEngine.test.ts`): `seed.hold` returns the same grant atom for one question and a distinct grant per call; a registry given grant A reads A's decision and one given B reads B's; a registry with no grant node reads none and creates no node (`registry.getNodes().has(...)` is false).

Canaries in `v4-reactivity-smoke.test.ts` (green at the base; they guard an `effect` bump, the file's stated purpose): (a) a non-keepAlive node seeded through `initialValues` is gone from `registry.getNodes()` after one macrotask and a keepAlive one is not; (b) `registry.getNodes().get(atom)` is `undefined` for an atom nothing has read and `valueOption()` is `Some(value)` for a seeded, never-built keepAlive node. The `subject` plan already proposes (a); share it.

### Green pins for preserved behaviour

All ran green on the prototype: `QadiAtoms.sweep.test.ts` S1-S9, `QadiProvider.sweep.test.tsx` P1-P5 (including P3 StrictMode and P4 Activity), `QuestionBook.test.ts`, `SweepScheduler.test.ts`, `QadiAtoms.test.ts` (the eviction suite), `Hydration.test.ts` (including "keeps a seed across a collection", "reports once per REGISTRY", "DOES NOT LET A HYDRATED ALLOW OUTLIVE A CLIENT RE-CHECK THAT DENIES", `seedsBeforeSubject`), `HydrationEngine.test.ts` (migrated), `HydrationRender.test.tsx`, `HydrationPayload.test.ts`, `HydrationCounts.test.ts`, `ServerRender.test.tsx`, `hooks.test.tsx`, `edges.test.tsx`, `v4-reactivity-smoke.test.ts`; the `devtools` project (1320). Not run, and what I would run instead: `pnpm test:tstyche` (`Hydration.tst.ts`; the `InitialValues` and `hydrate` types are unchanged); `pnpm coverage` (react is held at 90%); `pnpm circular`; the example: `pnpm typecheck` first (it runs `tsc -b`, which emits `packages/react/lib`, per AGENTS.md §16), then `pnpm --filter @qadi/example-nextjs check` (`vitest`, `next build`, Playwright). The e2e path to watch is `examples/nextjs-newsroom/e2e/ssr.spec.ts` (hydration) and `test/seed.test.tsx` ("a seeded decision, with no Next in the way"), which is the same flow as SD2.

### Interaction with the `subject` keepAlive fix (read this before sequencing)

The base removes the `subject` node and the seed nodes by the same mechanism, and A2 only fixes the seed half. Measured with SEED6 (seeded allow, late gate, subject known, resolver answers deny after 1 ms, wait 200 ms):

| State | Rendered | Meaning |
|---|---|---|
| base | `pending` | no seed, no subject |
| seed fix (A2) alone | **`allowed`**, and it stays | the subject node is gone, so `get(subject)` is `undefined`, the decision atom is `Effect.never`, the client can never answer, and the server's allow is shown forever |
| `subject` keepAlive alone | `pending` until the client answers, then correct | seed lost, subject kept (RESEARCH-CODE's SUBJ result) |
| both | `denied` | seed shown, then superseded |

So: land the `subject` keepAlive (and its SUBJ RED tests) **first**, then the seed fix. Make SD5 the plan's explicit ordering pin: it is RED under the seed fix alone and the executor must see that. Neither fix needs the other's code; the dependency is on behaviour. They also share the canary in `v4-reactivity-smoke.test.ts` and the `Atom.keepAlive` import already used. A third interaction: the `subject` atom's `keepAlive` is a *registry-lifetime* node by design, so a grant node of the same lifetime is consistent with it, which is part of why A2 satisfies criterion 2 the same way the `subject` fix does.

### Does this warrant ADR-QD-149? Yes

It changes where a seed lives, which ADR-QD-039's title states ("A seed is not an authority, so it lives in its own atom") and ADR-QD-103 reasons about ("a swept question's seed ... forgotten with its row"). It chooses between three real alternatives with measured costs, and it is the answer to a locked decision (D-14). The number is free: `[VERIFIED: $(git rev-parse --git-common-dir)/qadi-reserved-ids.json]` `{"CCR": 427, "ADR": 148, "BEH": 520, "INV": 318}` and `spec/decisions/` ends at `148-*.md`. The orchestrator reserves 149 by hand (D-12); `scripts/next-id.mjs` is not run.

Draft (title: **ADR-QD-149 A seed is held by its question, and a registry holds only a grant to it**; status: Accepted, amends ADR-QD-039 and ADR-QD-103):

> **Context.** A server's decision reached a client registry only as an initial value on a private seed atom. `AtomRegistry` removes any non-keepAlive node nothing holds one macrotask after it is created, so a gate that mounted later, a gate under a hidden-then-shown Activity, a gate that remounted, or a bare registry read after one turn found no seed and rendered `Pending`, though the question was still tracked. ADR-QD-103 had closed the same symptom for a garbage collection and allowed forgetting a seed only with its question's row. Keeping the seed node alive pins a node per question for every registry, unhydrated questions included (50 questions left 51 nodes against 1), and lets a spent seed return after a remount; holding the seed in the atom set alone lets a registry that was never given it read another registry's seed; a provider-owned mount cannot cover a bare registry; an idle TTL is a timer and still loses the seed.
> **Decision.** The question's handle in the book holds its seeds, in a `WeakMap` keyed by an opaque `SeedGrant`. `hydrate` gives a registry one keepAlive grant node per seeded question, and a read finds a seed only through a grant node that exists in its registry, never creating one, and never after that registry's client has answered. The seed is forgotten with the handle (ADR-QD-103); `QuestionBook`, the sweep and `maxTrackedQuestions` are unchanged.
> **Consequences.** A seed survives from registry construction until this client answers or the question is evicted, in a provider, under Activity, across remounts and on a bare registry. A registry holds one small keepAlive node per hydrated question until it is disposed: bounded by the payload, not by the sweep. `hydrate` records seeds in the atom set (it already opened the question in the book). The second element of an `initialValues` pair is opaque. `AnnounceState.observedSeed`, which compensated for the registry dropping the seed, is removed. Seeds are still lost to the sweep for a question that is cold and past the bound, as ADR-QD-103 says. Depends on the `subject` atom being keepAlive (BEH-QD-516): without it a late gate would show the seed forever.

Also add dated amendment lines (never rewrite, AGENTS.md §15 / D-12): **ADR-QD-039** (an `> **Amended:**` line under the Decision: the seed lives in its own atom's *grant*, held by the question), **ADR-QD-103** (Consequences: "its seed is held by the handle, not by a registry node"). Add the ADR to `spec/decisions/index.yaml` (the entries around lines 114, 210, 271 show the shape) and to the README CCR rows per CCR-QD-427.

### BEH and INV text (drafted)

Numbers: the `subject` fix is proposed to take **BEH-QD-516** (`36-RESEARCH-CODE.md:223`). The seeds take **BEH-QD-517, BEH-QD-518, INV-QD-317, INV-QD-318**. Left **Unused: BEH-QD-519, BEH-QD-520**. If the `subject` plan also states an invariant it must not take 317 or 318; coordinate before CCR-QD-427 writes `Used: ... Unused: ...`. CCR-QD-427's line would read, for these two: `Used: BEH-QD-517, BEH-QD-518, INV-QD-317, INV-QD-318. Unused: BEH-QD-519, BEH-QD-520.` (plus 516 from the `subject` plan).

**BEH-QD-517 (new, `spec/behaviors/19-hydration.md`, after BEH-QD-151): A seed lasts until this client answers or its question is dropped**

```
REQUIREMENT: A seed MUST remain readable from the moment its registry is built
             until this client has produced a decision of its own for that
             question, or the atom set drops the question (the sweep, BEH-QD-198).
             Whether a gate has mounted, unmounted or remounted, and whether a
             `QadiProvider` or a bare `AtomRegistry` holds the registry, MUST NOT
             change that. A seed MUST NOT depend on a timer.
```

**BEH-QD-518 (new, same file): A seed reaches only the registries it was given to**

```
REQUIREMENT: A registry MUST read a seed only if `initialValues` from that
             `hydrate` call was passed to it. Another registry over the same atom
             set, in the same process or the same test, MUST read none, and MUST
             NOT count a re-check as seeded (BEH-QD-231).
```

**INV-QD-317 (new, `spec/invariants.md`, after INV-QD-316): A seed outlives a registry's idle removal but never the client's answer or its question's row**

> A hydrated seed is held by its question's handle in the atom set's book and reached through a grant a registry holds, so a registry removing an idle node cannot lose it, the question's eviction forgets it, and `AnnounceState.announced` stops it being read once this registry's client has answered, including after the question's decision atom is rebuilt.
> **Source**: `packages/react/src/HydrationEngine.ts`'s `makeSeededQuestion` (`seeds`, `grantAtom`, `seededIn`, and the `announced` guard in `read`).
> **Implication**: the registry reclaims a node nothing holds one macrotask after it is created, and a seed is not held by a reader until a gate reads it, so every later reader found nothing and the gate rendered `Pending`. Making the seed node alive would have returned a spent allow after a remount (INV-QD-028) and pinned a node for every question asked.
> **Enforcement**: `packages/react/test/QadiProvider.seed.test.tsx` (SD1 to SD5), `packages/react/test/Hydration.lifetime.test.ts` (HL1 to HL7) and the registry-timing canaries in `v4-reactivity-smoke.test.ts`.
> **Related**: INV-QD-028, INV-QD-105, BEH-QD-517, ADR-QD-149.

**INV-QD-318 (new): A registry holds a grant node only for a question it was seeded for**

> `hydrate` hands a registry one keepAlive grant per verified entry; a read never creates a grant node, so a registry that was not seeded for a question holds no node for it, and one question's seed is never reachable from another registry's grant.
> **Source**: `makeSeededQuestion`'s `seededIn`, which asks `registry.getNodes()` and never `registry.get`.
> **Implication**: a keepAlive atom that every read creates a node for leaves one pinned node per question asked, hydrated or not, in every registry; a seed held by the atom set alone is read by every registry over it, including another request's on a server.
> **Enforcement**: `Hydration.lifetime.test.ts` HL3, HL5 and HL7.
> **Related**: INV-QD-022, INV-QD-105, BEH-QD-518, ADR-QD-149.

**Existing requirements and prose to restate in place** (D-07; each with an `> **Amended:**` or dated line, history rows untouched):

| Where | Change |
|---|---|
| BEH-QD-198 (`25-inspection.md:773`) | the second requirement reads "MUST NOT lose a question's hydrated seed to one [a garbage collection]"; append "or to a registry's removal of an idle node (BEH-QD-517)" |
| BEH-QD-151 (`19-hydration.md:300-310`) | add: the seed MUST NOT be read again even when the decision atom is rebuilt after the answer (a remounted gate); state that this was true only because the node was gone, and is now enforced |
| BEH-QD-152 prose (`19-hydration.md:381-387`) | replace the live statement "A seed lives in an atom beside the decision's ... nothing mounts it. A registry may therefore drop its value" with the new reality; keep the CCR-QD-077 account as dated history |
| BEH-QD-149 note ("Restated in CCR-QD-052") | add that the seed is now held by the question and reached through a grant; the observable requirement is unchanged |
| INV-QD-028 Source and its traceability row (`spec/traceability.md:111`) | "its own atom" becomes "its question's slot, reached through a grant atom"; the precedence is still a property of the expression |
| INV-QD-105 Implication (`invariants.md:3207-3213`) | add that a seed is held by the handle, so it is forgotten with its row and a registry's idle removal no longer loses it; the Enforcement line gains the two new files |
| ADR-QD-039 / ADR-QD-103 | the amendment lines above |
| `HydrationEngine.ts` header (`:4-6,24`), `makeSeededQuestion` doc (`:656-676`), `AnnounceState` doc (`:611-646`), `QadiAtoms.ts:282-285`, `QuestionBook.ts:47-49` ("a cold question's seed that was never read can be forgotten with it" stays true; check wording) | comment edits that are part of the same src change, not comment-only edits, since the code in those files changes |

Spec gates to re-run after editing: `node scripts/spec-revise.mjs --check`; the dates through `scripts/spec-revise.mjs ... --date 2026-11-12`; `pnpm spec:verify:strict`, `pnpm spec:gates`, `pnpm spec:api` (no overview row changes: nothing public moved). If a TypeScript fence is added in BEH-QD-517, use `typescript` only if it compiles (`pnpm spec:examples`); a `ts` fence is not compiled.

### Changeset

`@qadi/react`: **patch**. Observable behaviour: a bug fix (a seed the spec already promised is no longer lost). No export, prop or documented type changes (`InitialValues` is unchanged; the pair's second element becoming opaque is not documented, `[ASSUMED]` after a repo grep limited to `packages`, `spec`, `scripts`, `examples`, `website`). Not **Breaking**, so no `upgrading.md` section (D-11). Suggested file `.changeset/seed-survives-late-mount.md`; it may share a file with the `subject` fix, since both are react patches in one phase. Nothing is released (memory: only on the user's explicit ask).

### Mutation configuration

`[VERIFIED: stryker.react.mjs:55-60]` `mutate` is `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `SweepScheduler.ts`. A2 touches `HydrationEngine.ts` and `QadiAtoms.ts` (and tests), **none of which is in the list**, and leaves `QuestionBook.ts` untouched. So for this fix D-10's base run over "every src file the phase will touch" has nothing to measure in `@qadi/react`; the plan should say so in the ledger rather than add files to `mutate` (adding `HydrationEngine.ts`, a 750-line file mostly codec, would make the 80% break threshold a new risk for no gain here). The guard line is killed by HL4 and SD-level tests; the presence check by HL5 and the engine tests. If the user wants these covered anyway, that is a `stryker.react.mjs` change and a separate decision. The rejected hook variant would have put new branches in `QuestionBook.ts`, which is in the list.

## Don't hand-roll / reuse

| Problem | Use | Not |
|---|---|---|
| Registry lifetime of a node | `Atom.keepAlive` (`Atom.ts:1747-1751`) on a *capability* atom | `Atom.setIdleTTL` (timer, `Date.now`), `registry.scheduleTask`/`defaultIdleTTL` (CCR-QD-150) |
| "Was this registry given this?" | `registry.getNodes().get(atom)` + `valueOption()` (public interface, `AtomRegistry.ts:75`, `:946-951`) | `registry.get`/`ensureNode` (creates the node), a module-scope `WeakMap<AtomRegistry, ...>` (AGENTS.md §13: no module-scope state) |
| Per-registry "answered" | `AnnounceState.announced` (already there) | a second flag |
| Forgetting with the question | handle-owned `WeakMap` dropped with the book entry | a `QuestionBook` eviction hook (measured: unneeded) |

## Common pitfalls

1. **Landing the seed fix without the `subject` fix.** A late gate shows the server's allow forever (SD5). Order the plans, and keep SD5 RED-under-seed-alone as the proof.
2. **Reading the grant atom with `get`/`get.once`.** It creates a keepAlive node for every question asked in every registry. Use the presence check; HL5 fails otherwise.
3. **Dropping the `announced` guard.** Safe today only because the seed node is removed; with any retention a remounted gate shows a spent seed (HL4).
4. **Writing the seed into a structure the atom set shares across registries without a registry-held key.** HL3, HL7. This is the trap in the stated candidate A, and it is also a server cross-request leak.
5. **Testing with `TestClock`.** The registry's removal is a real macrotask; use a real `setTimeout` turn (`RESEARCH-CODE.md:220` makes the same point). Use `vi.useFakeTimers` only for the no-timer pin HL2, and note that it fakes the registry's own `setTimeout`/`Date.now` too.
6. **Forgetting the example consumes `lib/`.** Rebuild (`pnpm typecheck` emits it) before `pnpm --filter @qadi/example-nextjs test` or the e2e, or they test the old code.
7. **Counting the grant node as a leak.** It is one small keepAlive node per *hydrated* question per registry, constant for the registry's life (3 in the NODES probe for 3 hydrated questions, one of them evicted); the LEAK probe (unhydrated questions) stays at 1. State this in the ADR, so a later reader does not "fix" it.

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | React selective hydration can mount a Suspense-bounded gate after the provider's registry has passed its first macrotask, so L1 occurs in a real Next app, not only in tests | Summary, Q1 | If gates always mount in the provider's own commit, the realistic exposure is Activity, remount and bare-registry hosts only; the fix is still required by BEH-QD-198's intent |
| A2 | Nothing documented depends on the second element of an `initialValues` pair being a `SeededDecision` | Q3 changeset | A host that inspects it breaks; the changeset kind would be minor with a Breaking lead |
| A3 | `registry.getNodes()` and `Node.valueOption()` stay on the public registry interface in the next `effect` | Q3 | The presence check breaks at an `effect` bump; the two smoke canaries are the early warning |
| A4 | The "K + guard + presence" column's NODES and LEAK cells | Q2 table | Informational only; not a basis for the recommendation |
| A5 | The planner will land the `subject` keepAlive plan first | Interaction | If not, SD5 fails and the seed fix ships a worse state |

## Open questions

1. **Does the user accept one keepAlive grant node per hydrated question per registry?** It is the smallest thing any design can pin (every registry-resident design pins at least a node; the window before the removal task contains no code of the atom set's), but it is a keepAlive node, and D-14 rejected "keepAlive on the seed atoms". The recommendation keeps the seed values out of the registry and bounded by the book; if that reading of D-14 is too loose, the only alternatives measured are the provider-only design (does not cover a bare registry) and the TTL (a timer), so the question is whether to accept the pin or the limit. If the user instead relaxes D-14, K with the two guard lines is two lines of source and zero test migrations.
2. **Delete `AnnounceState.observedSeed` in this change?** Recommended (measured safe), optional.
3. **Add `HydrationEngine.ts` to `stryker.react.mjs`?** Recommended no.

## Validation Architecture

Framework: `vitest` 5.1.0 with `@effect/vitest` and Testing Library (`happy-dom`). Config `packages/react/vitest.config.ts`. Quick run: `pnpm vitest run --project react <file> < /dev/null`. Full react: `pnpm vitest run --project react < /dev/null` (475 tests, 29 files at the base, about 4 s). The RED/green column is "at the base" and "after A2 with the `subject` fix".

| Claim or requirement | Test file and name | Command | Base | After |
|---|---|---|---|---|
| BEH-QD-517: late mount reads the seed | `QadiProvider.seed.test.tsx` SD1 | `pnpm vitest run --project react packages/react/test/QadiProvider.seed.test.tsx` | RED | green |
| BEH-QD-517: server-render shape (subject known, silent resolver) | same, SD2 | same | RED | green |
| BEH-QD-517: Activity hidden then shown, provider outside | same, SD3 | same | RED | green |
| BEH-QD-517: unmount then remount | same, SD4 | same | RED | green |
| BEH-QD-151 + ordering: the client supersedes a late seed | same, SD5 | same | RED | green only with the `subject` fix (RED with the seed fix alone) |
| BEH-QD-517: bare registry, no provider | `Hydration.lifetime.test.ts` HL1 | `pnpm vitest run --project react packages/react/test/Hydration.lifetime.test.ts` | RED | green |
| BEH-QD-517: no timer (fake timers, one hour) | same, HL2 | same | RED | green |
| BEH-QD-518 / INV-QD-318: a registry not seeded reads none | same, HL3 | same | green | green |
| BEH-QD-151 / INV-QD-317: a spent seed is not read again | same, HL4 | same | green | green |
| INV-QD-318: no node for an unhydrated question | same, HL5 | same | green | green |
| INV-QD-105 / BEH-QD-198: eviction forgets a cold seed | same, HL6 | same | green | green |
| BEH-QD-518: two registries, two seeds, one atom set | same, HL7 | same | green | green |
| Engine seam: `hold` returns a per-call grant; a grant-less registry reads none and creates no node | `HydrationEngine.test.ts` (migrated and extended) | `pnpm vitest run --project react packages/react/test/HydrationEngine.test.ts` | green before migration, RED until migrated (the contract moved) | green |
| Registry timings the design relies on | `v4-reactivity-smoke.test.ts` (two canaries) | `pnpm vitest run --project react packages/react/test/v4-reactivity-smoke.test.ts` | green | green |
| Preserved: sweep S1-S9 | `QadiAtoms.sweep.test.ts` | `pnpm vitest run --project react packages/react/test/QadiAtoms.sweep.test.ts` | green | green |
| Preserved: provider P1-P5 incl. StrictMode and Activity | `QadiProvider.sweep.test.tsx` | `pnpm vitest run --project react packages/react/test/QadiProvider.sweep.test.tsx` | green | green |
| Preserved: eviction suite, identity across collection | `QadiAtoms.test.ts`, `QuestionBook.test.ts`, `SweepScheduler.test.ts` | `pnpm vitest run --project react packages/react/test/QadiAtoms.test.ts packages/react/test/QuestionBook.test.ts packages/react/test/SweepScheduler.test.ts` | green | green |
| Preserved: hydration (seed precedence, mismatch once per registry, evaluation id, collection) | `Hydration.test.ts`, `HydrationRender.test.tsx`, `HydrationPayload.test.ts`, `HydrationCounts.test.ts`, `ServerRender.test.tsx`, `hooks.test.tsx` | `pnpm vitest run --project react packages/react/test/Hydration.test.ts ...` | green | green (verified on the prototype) |
| Example hydration path (needs a rebuilt `lib/`) | `examples/nextjs-newsroom/test/seed.test.tsx`; e2e `e2e/ssr.spec.ts` | `pnpm typecheck && pnpm --filter @qadi/example-nextjs check` | green (stale `lib/` unless rebuilt) | not run; run after `tsc -b` |
| Type surface unchanged | `Hydration.tst.ts` | `pnpm test:tstyche` | green | not run |
| Budgets unchanged | `scripts/check-house-style.mjs` | `node scripts/check-house-style.mjs` | clean | clean (verified on the prototype) |

Sampling: per task commit, the two new files plus `HydrationEngine.test.ts` and `Hydration.test.ts`; per wave, the whole react project plus `node scripts/check-house-style.mjs` and `pnpm oxlint packages/react/src`; phase gate, `pnpm check` (or `check:pr`).

Wave 0 gaps: `QadiProvider.seed.test.tsx`, `Hydration.lifetime.test.ts` (new); the two canaries; the migration of the five engine seam tests, which must be a **separate commit that precedes** the fix commit if the plan wants "RED on behaviour, not shape" (the migrated tests pass at the base only if the `SeedSlot` type exists, so land a skeleton `SeedSlot` with `hold` returning the old `[seedAtom, decision]` pair first, as D-13 does for the timeline status).

## Security domain

The seed is the one place a decision enters the client without being evaluated by it (INV-QD-022). Relevant ASVS areas: V4 access control (a registry must not read a decision made for another registry or request) and V1 architecture (state shared across requests on a server). Controls and the tests that hold them:

| Pattern | Mitigation | Test |
|---|---|---|
| Cross-registry or cross-request seed leak through a module-scope atom set | seeds reachable only through a grant a registry holds; the atom set stores them keyed by that grant | HL3, HL7 |
| A stale server allow shown after the client could have answered | `announced` guard; client answer always wins (BEH-QD-151) | HL4, SD5 |
| A stale server allow shown forever because the subject node is gone | land the `subject` keepAlive first | SD5 |
| Unbounded registry growth with distinct questions | presence-gated read, no node for an unhydrated question | HL5 |

## Environment Availability

| Dependency | Needed for | Available | Notes |
|---|---|---|---|
| `node`, `pnpm`, `vitest` 5.1.0 | every run above | yes | all runs used `pnpm vitest run --project react ... < /dev/null` from the repo root |
| `oxlint`, `scripts/check-house-style.mjs` | budget and lint pin | yes | run on the typed prototype |
| Playwright + Chromium, `next build` | the example e2e | not run | too slow for research; run `pnpm typecheck` first so `packages/react/lib` is rebuilt |
| `pnpm test:tstyche`, `pnpm coverage`, `pnpm circular`, `pnpm mutation` | the rest of `pnpm check` | not run | named above |

## Sources

- Source read this session (HIGH): `packages/react/src/HydrationEngine.ts`, `QadiAtoms.ts`, `QuestionBook.ts`, `SweepScheduler.ts`, `QadiProvider.tsx`; `node_modules/effect/src/reactivity/AtomRegistry.ts` (`:75,497-507,577-583,618-691,752-766,811-813,874-885,946-966`) and `Atom.ts` (`:229-257,1747-1751`); `stryker.react.mjs:55-60`; `scripts/check-house-style.mjs:592-613,1504-1530`; `packages/react/test/Hydration.test.ts`, `HydrationEngine.test.ts`, `QadiProvider.sweep.test.tsx`, `support/settle.ts`; `examples/nextjs-newsroom/src/client/Providers.tsx`, `test/seed.test.tsx`.
- Spec read this session (HIGH): ADR-QD-039, 103, 148; INV-QD-022, 028, 105, 315, 316; BEH-QD-065, 067, 149, 151, 152, 198, 511; `qadi-reserved-ids.json`.
- No external documentation or web search was used: every claim about registry behaviour was verified against the installed source and by running it.

## Metadata

- Prototypes: all removed. `git status --porcelain` at the end shows `M .planning/config.json`, `?? .planning/state.json`, this file, and `M .planning/STATE.md`, which is **not mine**: it was already modified when I first checked `git status` mid-run (another session). No source, test, spec or config file is modified, nothing is committed.
- Valid until: the next `effect` bump (the design leans on `getNodes`/`valueOption`/`keepAlive`), or a change to `makeSeededQuestion`.
