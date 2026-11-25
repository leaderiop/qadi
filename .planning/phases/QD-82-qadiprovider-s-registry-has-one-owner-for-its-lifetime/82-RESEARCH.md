# Phase 82: `QadiProvider`'s registry has one owner for its lifetime - Research

**Researched:** 2026-11-25
**Domain:** React 19.3.1 `<Activity>` effect lifecycle against `effect@4.1.2`'s `AtomRegistry` (`@qadi/react`)
**Confidence:** HIGH on the fix's shape (every claim below was measured on the phase base or on a throwaway prototype this session). MEDIUM only on Stryker run time (not run, by instruction).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Work only on branch `arch-wave-15`, one phase at a time, on the main tree (`use_worktrees` is false). No merge, push, tag, release, publish or `changeset version`.
- **D-02:** Use only the reserved records: ARCH-129, ADR-QD-195, CCR-QD-474, BEH-QD-746..750 and INV-QD-409..410. Never run `node scripts/next-id.mjs`. A reserved number left unused is named "Unused" in the CCR row. Make spec edits only through `node scripts/spec-revise.mjs <doc> "<change (CCR-QD-474)>" --date <the real date>`, and verify them with `--check`. No plan-local id (`D-01`, `WR-01`) goes in a shipped title, and no `*-NEXT` placeholder goes anywhere.
- **D-03:** Tests come first. The RED test of D-13 is written on the phase base and seen RED there for the stated reason, with its output saved in `82-RED-EVIDENCE.md`. The claims about React's commit order that ADR-QD-195 makes are written from that observation, not from reasoning. A characterisation test that is green on the base is shown failing once under a scratch source edit. Every new check script is shown failing once. No throwaway file exists at any commit or when the mutation base is recorded.
- **D-04:** A new package-private module, `packages/react/src/RegistryLease.ts`. It mirrors `SweepScheduler.ts`: imports neither React nor `QadiProvider.tsx`, out of the barrel (AGENTS.md §9, ADR-QD-099). Added to `stryker.react.mjs`'s `mutate` list, and its header comment there says what a surviving mutant would mean: a registry released twice, never released, or released while held. Its own test file, `packages/react/test/RegistryLease.test.ts`, drives it with an injected timer and renders nothing.
- **D-05:** Its interface is small and its state is a closed union. A builder, `makeRegistryLease(...)`, takes the recycle action and an injected defer `(run: () => void) => cancel`, defaulting to `setTimeout(…, 0)` / `clearTimeout`. It returns `hold()` (cancels a pending release) and `release()` (schedules one). State is a closed tagged union (e.g. `Held` / `Releasing` / `Released`), never booleans that can disagree; every transition answers for every state, so a repeated `hold` or `release` is a defined no-op. No module-scope `let` (`MODULE_STATE_BUDGET` must not grow); no `switch`, `as`, `!`, `any` or `Record<string, unknown>`. The planner may adjust names if the spike shows a cleaner cut. The interface must stay this size.
- **D-06:** The provider only calls the lease. `QadiProvider.tsx` builds the registry once, in render, into a ref (D-08), builds the lease once per registry, and one effect calls `lease.hold()` in setup and `lease.release()` in its cleanup. No timer, flag or dispose call remains in the provider. `QadiProvider.tsx` stays `unmeasured` in the mutation record; its behaviour is pinned by the rendered tests of D-13.
- **D-07:** The lease never touches the sweep. It never calls `QadiAtoms`' sweep, `AtomRegistry`'s `scheduleTask` or `defaultIdleTTL` (ADR-QD-148, CCR-QD-150), and never reads `registry.disposed`, which is not on the interface. It owns infrastructure, never a decision (AGENTS.md §13).
- **D-08:** One registry identity for the provider's life. Built in render so the first render and a server render keep the subject seeded at construction (today's `initialValues: [[atoms.subject, subject], ...initialValues]`). `registryRef` is never nulled; nothing builds a second registry. Rejected, with reasons recorded in ADR-QD-195: an effect-time or state-held rebuild (too late: children's reveal effects run first); the `useScoped` shape (renders nothing on the server pass); a registry proxy (forwards every member, hides identity); dispose only on a true unmount (React gives no hidden-vs-gone signal at cleanup time); never releasing (leaks the runtime layer scope and running fibers).
- **D-09:** The deferred release calls `registry.reset()`, not `dispose()`. `reset()` clears every node and runs its finalizers, which releases the `Atom.runtime` layer scope and stops what was running; the registry stays usable; `dispose()` is terminal and is no longer called. The release then re-seeds the latest committed subject (D-11) in the same callback. The subject atom is `Atom.keepAlive` (`QadiAtoms.ts:237-242`), so the re-seed survives with no reader. The research spike confirms that the re-seed holds, and picks between `registry.set(atoms.subject, …)` and `ensureNode(...).setInitialValue(...)`.
- **D-10:** Every scenario has a stated, pinned outcome: StrictMode double effect (hold/release/hold in one tick recycles nothing; one registry); hide shorter than the timer (recycles nothing); hide longer than the timer then reveal (recycles once, re-seeds the subject, throws nothing; decisions are re-evaluated); long hide with a re-render (the same registry, no second one); subject change while hidden (the revealed provider answers with the new subject once its effect runs; the one-frame tradeoff of ticket 34 is unchanged); `atoms` prop change (keeps the registry and signals `AtomsReplaced`, unchanged); true unmount (recycles exactly once after the timer, and the runtime layer scope is released). The accepted trade: after a true unmount, a straggling `registry.get` silently recreates a node instead of throwing `registry is disposed`; ADR-QD-195 records it and a test pins it; the node holds nothing alive (no subscriber, idle-removed) and the registry becomes unreachable with the provider.
- **D-11:** The subject only, read from the latest committed props. The provider writes the subject and the subject atom into a ref inside an effect, never in render (PITFALLS 82-F: never the first closure). The lease's recycle action reads that ref. With an `atoms` prop change, the ref holds the current atom set's `subject`.
- **D-12:** Neither `initialValues` nor hydration seeds are re-applied after a recycle (in this package `initialValues` is `hydrateDecisions`' output: seed grants, ADR-QD-149). Rationale as written in CONTEXT: re-applying a server seed after a hide would make it show again while the client re-evaluates; the seed is not an authority (ADR-QD-039); the client's answer takes precedence (INV-QD-028, ADR-QD-017). After a long hide the gates render `Pending`, then the client's own answer. This is the "loss is recorded and pinned" branch of LEASE-04. ADR-QD-195, BEH-QD-067 and its SUBJ note, and the changeset record it; a test pins a seeded allow not reappearing after a long hide. It also changes scenario S2 (today a long hide with a re-render builds a fresh registry that re-applies the seeds). Any other host atom passed in `initialValues` returns to its declared default after a long hide; the provider's doc comment and `09-react.md` state that `initialValues` seed construction only.
- **D-13:** The sweep bound holds across a long hide. ADR-QD-148's one-sweeper-per-atom-set and no-sweep-in-the-reread-window are asserted across a long hide and reveal with `makeSweepCounter` and `withSweepFork`, not inferred from P4. A hidden gate's question may be evicted and re-admitted; the test states what it asserts, not a step count.
- **D-14:** The RED test, written on the base: `packages/react/test/QadiProvider.lifetime.test.tsx`. Setup: a parent with `mode` state; a hoisted or `useMemo`'d `<QadiProvider><Can/></QadiProvider>` under `<Activity mode>`; an error boundary and a captured `console.error`. Steps: render, settle, hide, wait a real macrotask past the release timer, show. Assertions: no captured error, `allowed` rendered, and a `useSubject()` probe reads the prop. Expected base failure: the two `registry is disposed` errors. Companions in the same file, each seen RED on the base or shown failing under a scratch edit: `useInvalidate()` hidden then shown; a `useDevtoolsFeed` consumer under hide and show; StrictMode holding one registry; a short-hide control; a subject changed while hidden; a long hide with a re-render keeping one registry identity; the seeded allow not reappearing (D-12); the sweep bound across a long hide (D-13); the straggling read after unmount (D-10).
- **D-15:** The vacuous unmount test becomes real. `edges.test.tsx:257` must fail when the release is skipped, observed through the runtime layer's finalizer or an equivalent release probe, not the body being empty. It is shown failing once under a scratch edit that skips the release.
- **D-16:** Mutation is measured like Phase 81. Phase-local scripts `82-check.mjs` and `82-mutation.mjs` reuse 81's shapes: base, compare, a dirty-tree refusal and a self-test. The base is recorded before any source edit, over the existing `stryker.react.mjs` list: `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `SweepScheduler.ts`. `RegistryLease.ts` is close-only, against an absolute bar: no surviving, no-coverage or ignored mutant. `QadiProvider.tsx` stays `unmeasured`. The close is re-taken after the review fixes.
- **D-17:** Records. ADR-QD-195 (new) records the lifetime rule, the observed commit order, the rejected shapes, the accepted trade and the seeds not re-applied. Amendments, dated, past text kept: ADR-QD-014's consequence about the registry's lifetime; ADR-QD-149 on seed grants after a recycle; ADR-QD-103 and ADR-QD-148 where they describe dispose-on-cleanup or the dispose-then-reread window. BEH-QD-746..750 (the long-hide reveal; one identity; release once on unmount; the subject re-seed; seeds not re-applied). Restated: BEH-QD-067 and its SUBJ note (`09-react.md` ≈334, ≈380-390) and BEH-QD-516. INV-QD-409 (no consumer reaches an unusable registry); INV-QD-410 (a provider holds exactly one registry for its life). Also updated: traceability; `spec/README.md`'s CCR-QD-474 row; `appendices/react-integration.md` ≈139; the `@qadi/react` README if it states the dispose behaviour. A `@qadi/react` patch changeset that names the fix and the seeds-not-re-applied change; no Breaking changeset and no upgrade-guide entry; `check-api-surface.mjs` must stay at the base count.
- **D-18:** Gates. `pnpm check:pr < /dev/null` and `pnpm spec:package` are green at the close and again after the review fixes. `pnpm spec:verify:strict` passes. The archived v1.9 checks and Phase 81's checks are re-run from scratch copies where they hold React files (81 touched none, so expect no React-held test).

### Claude's Discretion
- The lease's exact export names, and whether the recycle action is passed at build time or held by the provider.
- Whether the release probe of D-15 is an `Atom.runtime` layer finalizer or a test-only registry wrapper. It must observe the real release.
- The ordering of companions in the lifetime test file, and whether the lease tests share a fixture with `SweepScheduler.test.ts`.

### Deferred Ideas (OUT OF SCOPE)
- A mutation baseline for `QadiProvider.tsx` itself. It renders, and its lifetime logic moves into the measured lease.
- Upstream `@effect/atom-react`'s `RegistryProvider`, which has the same dispose-in-cleanup shape. Out of scope, because Qadi does not use it.
- Unmounting children while hidden (the `useScoped` shape) and rebuilding the registry on an `atoms` change. Both were rejected in research, so do not re-propose them.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEASE-01 | RED-then-GREEN regression: stable provider + `<Can>` under a toggled `<Activity>`, hidden past a macrotask, shown: throws nothing, renders the decision | Spike run 1 (RED reproduced, exact text and order), run 2 (GREEN under the prototype) |
| LEASE-02 | Lifetime rule in one package-private headless module, driven by an injected timer, under the React mutation gate | Recipe: prototype lease (Run 2), Stryker wiring (Run 7), lease test matrix (Validation Architecture) |
| LEASE-03 | Every registry released exactly once on unmount, none used after release, none leaks; the vacuous unmount test asserts release | Runs 2 (StrictMode, short/long hide, subject change, atoms swap, unmount), 3 (what `reset()` releases), 6 (the observable that fails when release is skipped: NOT a layer finalizer) |
| LEASE-04 | After a long hide the provider answers with the current subject and its seeds restored or the loss pinned; sweep bound holds | Runs 2 (re-seed), 4 (sweep), 5 (seeds; the pinned test must use an unanswered question) |
| LEASE-05 | ADR-QD-195 records the rule; BEH/INV/traceability; patch changeset | Run 1's commit-order log (quotable), run 5 (S2 change), D-17 list; refuted claims to word differently (Verdicts V1, V6) |
| WX-01..WX-07 | Phase hygiene (check:pr green, records, gates, no forbidden constructs, mutation not falling, RED first, no plan-local ids) | House-style findings (Run 7), Validation Architecture, Common Pitfalls |
</phase_requirements>

## Summary

The fix shape in CONTEXT (D-04..D-11, D-13) is **confirmed by experiment**. A hidden-then-shown provider on the phase base throws an `AggregateError` of `registry is disposed` errors; a prototype lease that recycles in place with `registry.reset()` and re-seeds the latest committed subject makes the same scenario GREEN, keeps exactly one registry under StrictMode, long hide, long hide with a re-render and an `atoms` swap, does not disturb a second provider on the same atom set, adds no sweep forks, and keeps `useInvalidate`, `useDevtoolsFeed`'s `runtimeLayer` and decisions working after a recycle. The prototype's `release`/`hold` state machine is three states (`Unheld`, `Held`, `Releasing`); "released" and "never held" behave identically, so a fourth `Released` state is redundant.

Two stated rationales are **refuted** and must be worded differently in ADR-QD-195, and one test observable must change. (V1) "Never releasing leaks the runtime layer scope and running fibers" is false on effect 4.1.2: the registry's own idle removal releases the `Atom.runtime` layer scope within a tick of the last consumer unsubscribing, with or without `reset()`. What an unreleased registry retains is only its `keepAlive` nodes (the subject, hydration seed grants, the runtime's layer atom, any host `keepAlive` atom seeded through `initialValues`). (V6, D-15) A layer finalizer therefore **cannot** make `edges.test.tsx:257` fail when release is skipped; a `keepAlive` host atom seeded through `initialValues` and read from the registry after the release does (`default` after release, `seeded` when release is skipped, throws under `dispose()`). D-12's choice (no re-applied seeds) is also **confirmed but its stated reason is not what the code does**: an answered question never reads its seed again in the same registry (`state.announced`, a `WeakMap` keyed by registry that survives `reset()`), so re-applying the grant would not resurrect a superseded allow either. The seed difference is observable only for a question the client has not answered (never-answering resolver, or `subject={undefined}`): the gate renders `pending` instead of the seeded verdict. The pinned D-12 test must use such a question; an answered-question test is green under every variant and pins nothing.

Every one of the 45 existing tests in `edges`, `QadiProvider`, `.seed`, `.subject` and `.sweep` stays green under every mutant of the fix, including "release skipped", `dispose()` instead of `reset()` and "no re-seed" (Run 6): none observes release behaviour, so all new behaviour pins are new tests, and `edges.test.tsx:257` is the one existing test that must be rewritten.

**Primary recommendation:** Implement D-04..D-11 as written with `registry.reset()` plus `registry.set(latest.atoms.subject, latest.subject)` in the lease's recycle action; a three-state closed union with `cancel` as the single cancellation mechanism; pin release in tests with a `keepAlive` host atom, not a layer finalizer; pin D-12 with an unanswered question; and reword ADR-QD-195's "never release" rejection to "retains keepAlive nodes and the seed grant for the provider's remaining life", not "leaks the layer scope".

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Registry identity and lifetime (build once, recycle, never null) | Browser / Client (React provider in `@qadi/react`) | — | The registry is per-provider client state; a server render only needs construction, never release. |
| Lifetime state machine (`hold`/`release`/recycle) | Browser / Client, headless module `RegistryLease.ts` | — | Infrastructure, no decision (AGENTS.md §13); testable without React with an injected defer. |
| Subject re-seed after a recycle | Browser / Client | — | Reads a ref written in an effect; the atom is the atom set's `keepAlive` subject. |
| Seed grants (hydration) | Frontend Server (produces payload) / Browser (holds grant per registry) | — | After a recycle the registry holds no grant; the question's own handle keeps the decision (ADR-QD-149). |
| Sweep (eviction bound) | Browser / Client, `QadiAtoms.ts` + `SweepScheduler.ts` | — | Untouched; the lease never calls it (D-07). |
| Authorization decision | Not in this phase | — | The lease owns no decision; stale allow frames are the existing one-frame tradeoff, not a new one (Run 2, P5/CTL). |

## Standard Stack

No new dependency. Everything is already installed and pinned.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` | 4.1.2 [VERIFIED: `node -e` on `packages/react/node_modules/effect/package.json` -> `4.1.2`] | `AtomRegistry` (`reset`, `set`, `ensureNode`), `Match` for the lease's exhaustive dispatch | Already the stack; AGENTS.md §1 submodule imports |
| `@effect/atom-react` | as installed (catalog) | `RegistryContext`, `useAtomValue` | ADR-QD-014 / CCR-QD-150; unchanged |
| `react` | 19.3.1 [VERIFIED: `node -e` on `packages/react/node_modules/react/package.json` -> `19.3.1`] | `<Activity>`, effects | Peer `>=19.2.4` |
| `vitest` 5.1.0, `happy-dom`, `@testing-library/react`, `@effect/vitest` | catalog [VERIFIED: vitest output `RUN v5.1.0`] | Rendered tests and headless lease tests | Existing suite |
| `@stryker-mutator/vitest-runner` | catalog | The React mutation gate | `stryker.react.mjs` |

### Alternatives Considered
Not applicable: the stack and the rejected shapes are locked by D-08. No alternative package is proposed.

**Installation:** none.

**Version verification:** versions above read from the installed packages this session. No registry lookup was needed (no package is added).

## Package Legitimacy Audit

This phase installs no external package. **Packages removed due to [SLOP] verdict:** none. **Packages flagged as suspicious [SUS]:** none. `package-legitimacy check` was therefore not run.

## Spike results

Everything below was run on the phase base (`packages/react` unchanged since `902d2128`) or on a throwaway **copy** of `packages/react/src` placed at `packages/react/test/_spike82.src/` (so the real hooks resolve the copy's private `QadiContext`, which is not exported from `QadiProvider.tsx`; `QadiContext` is declared `const QadiContext = createContext<QadiContextValue | null>(null);` at `QadiProvider.tsx:61`, `RegistryContext` is `@effect/atom-react/RegistryContext`, `GateScopeContext` is `useGate.ts:143`). Nothing under `packages/*/src`, `scripts/`, `spec/` or `AGENTS.md` was edited. All throwaway files are deleted; copies are in `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/8b5d3789-bd5e-4ce2-bf7e-0b31a0ae4995/scratchpad/spike82-copy/`. `git status --porcelain -- packages scripts spec features` prints nothing. Baseline of the React project without spike files: `Tests  650 passed (650)`, about 4 s.

### Harness (condensed)

The scenario module is one `mount(options)` function; read it as a recipe, not as shipped code.

```tsx
// Tap: a child that (a) records the registry it was given, (b) patches that registry INSTANCE once so
// get/set/subscribe/dispose/reset are logged (a stack check tags "BY PROVIDER EFFECT" when the call
// came from QadiProvider.tsx), (c) logs its own layout/passive setup and cleanup.
const Tap = ({ name }) => {
  const r = useContext(RegistryContext); registries.add(r); patch(r);
  useLayoutEffect(() => { log.push(`${name} layout setup`);  return () => void log.push(`${name} layout cleanup`);  }, []);
  useEffect(()      => { log.push(`${name} passive setup`); return () => void log.push(`${name} passive cleanup`); }, []);
  return null;
};
// Outer: a sibling BEFORE the provider inside the Activity (gives tree-order evidence).
// Parent owns `mode` (and a `tick` for re-renders); the provider element is HOISTED so React bails out
// of re-rendering it when only `mode` changes (PITFALLS 82-B).
const hoisted = <QadiProvider atoms={atoms} subject={reader}><Tap name="child" /><Can policy={canRead} pending="pending" fallback="denied">allowed</Can><SubjectProbe /><RenderProbe /></QadiProvider>;
const Parent = () => { const [mode, setMode] = useState("visible"); return <Activity mode={mode}><Outer />{hoisted}</Activity>; };
// Boundary above the Activity captures what React routes; console.error is spied; act() wraps setMode.
// wait(80) past the release timer is a REAL macrotask (setTimeout), never fake timers (settle() note).
```

### Run 1: RED on the phase base (real `src`, hoisted element, real consumer, error boundary)

**R1 long hide then show**, verbatim, with the provider's effect identified by stack (`registry.get(subject) BY PROVIDER EFFECT`):

```
R1 after settle text: "allowedsubject:u1" registries seen: 1
--- mount commit order
   0 registry.subscribe(question/other) by other
   1 registry.get(subject) by other
   2 registry.get(subject) by other
   3 Outer(sibling before provider) layout setup
   4 child layout setup
   5 Outer(sibling before provider) passive setup
   6 child passive setup
   7 registry.subscribe(question/other) by other
   8 registry.subscribe(subject) by other
   9 registry.get(subject) by other
  10 registry.get(subject) BY PROVIDER EFFECT
== hide
--- on hide
  11 Outer layout cleanup
  12 child layout cleanup
  13 Outer passive cleanup
  14 child passive cleanup
  15 registry.unsubscribe(question/other)
  16 registry.unsubscribe(subject)
  17 registry.dispose()
  18 registry.reset()
  19 registry.unsubscribe(question/other)
after real macrotask: dispose calls: 1 text: "subject:u1"
== reveal
--- on reveal
  20 Outer(sibling before provider) layout setup
  21 child layout setup
  22 Outer(sibling before provider) passive setup
  23 child passive setup
  24 registry.subscribe(question/other) by other THREW registry is disposed
  25 registry.subscribe(subject) by other THREW registry is disposed
  26 registry.get(subject) BY PROVIDER EFFECT THREW registry is disposed
  27 Outer layout cleanup
  28 child layout cleanup
  29 Outer passive cleanup
  30 child passive cleanup
act threw: (nothing)
boundary caught: ["Error: Cannot access Atom {","Error: Cannot access Atom {","Error: Cannot access Atom {"]
text now: "BOUNDARY"
```

**R4, the same scenario with no boundary, so `act` throws** [VERIFIED: spike run on the phase base]:

```
R4 thrown constructor: AggregateError message:
R4 errors[0]: Cannot access Atom { "_id": "Atom", "keepAlive": false, "lazy": true, "label": undefined }: registry is disposed
R4 errors[0] stack head: at RegistryImpl.r.subscribe (...) <- at subscribe (atom-react/dist/Hooks.js:63:36)
R4 errors[1]: Cannot access Atom { "_id": "Atom", "keepAlive": true,  ... }: registry is disposed
R4 errors[1] stack head: at RegistryImpl.r.subscribe (...) <- at subscribe (atom-react/dist/Hooks.js:63:36)
R4 errors[2]: Cannot access Atom { "_id": "Atom", "keepAlive": true,  ... }: registry is disposed
R4 errors[2] stack head: at RegistryImpl.r.get (...) <- at /Users/.../packages/react/src/QadiProvider.tsx:258:18
```

The harness has two consumers (`Can` and a `useSubject` probe) plus the provider, so **three** errors; with a single `Can` it is the two CONTEXT recorded. Order confirmed: consumers' `useAtomValue` subscription errors first (`Hooks.js:63`), the provider's subject effect last (`QadiProvider.tsx:258:18`). `act` itself throws the `AggregateError` when no boundary is above; with a boundary React delivers each error to `componentDidCatch` and `console.error` receives "The above error occurred in the ..." lines (3 captured), and `act` does not throw. The RED test must assert on the boundary's caught list and the captured `console.error`, and the pre-fix failure to quote in `82-RED-EVIDENCE.md` is this text.

**Commit order, from the prototype with the provider's own effects instrumented** (the real provider has no layout effect, so its own effects are only visible by the `get(subject)` it makes). React 19.3.1 [VERIFIED: spike run]:

```
ORDER mount:   Outer layout setup, child layout setup, PROVIDER layout setup, Outer passive setup, child passive setup,
               <consumers' subscribe(question), subscribe(subject)>, registry.get(subject) BY PROVIDER EFFECT, PROVIDER passive setup (hold)
ORDER hide:    Outer layout cleanup, PROVIDER layout cleanup, child layout cleanup, Outer passive cleanup,
               PROVIDER passive cleanup (release), child passive cleanup, [timer] registry.reset()
ORDER reveal:  Outer layout setup, child layout setup, PROVIDER layout setup, Outer passive setup, child passive setup,
               <consumers' subscribe>, registry.get(subject) BY PROVIDER EFFECT, PROVIDER passive setup (hold)
```

Quotable rule for the ADR: **setup runs children before the provider (layout then passive, bottom-up); cleanup runs parent before children (top-down), layout then passive; the provider's passive `hold` is the last thing a reveal runs.** Reveal re-runs effects without re-rendering a hoisted element.

**R2 short hide (hide then show before the timer), phase base:** `text: "allowedsubject:u1" caught: [] errors: 0 dispose calls: 0 registries: 1` (control green).

**R3 long hide plus a re-render while hidden, phase base:** `dispose calls before re-render: 1`; `registries seen after re-render while hidden: 2`; after reveal `text: "allowedsubject:u1" caught: [] errors: 0`. Confirms the silent second registry (the decision cache is lost; construction seeds are re-applied, Run 5).

### Run 2: the prototype (`RegistryLease` + provider copy)

Prototype lease (three states; `cancel` is the single cancellation mechanism; the state is set before `recycle` runs so a throw cannot wedge it):

```ts
export type LeaseState =
  | { readonly _tag: "Unheld" }
  | { readonly _tag: "Held" }
  | { readonly _tag: "Releasing"; readonly cancel: () => void };
export type Defer = (run: () => void) => () => void;
export const timeoutDefer: Defer = (run) => { const h = setTimeout(run, 0); return () => clearTimeout(h); };
export const makeRegistryLease = (recycle: () => void, defer: Defer = timeoutDefer): RegistryLease => {
  let state: LeaseState = { _tag: "Unheld" };
  return {
    hold: () => { if (state._tag === "Releasing") state.cancel(); state = { _tag: "Held" }; },
    release: () => {
      if (state._tag !== "Held") return;
      const cancel = defer(() => { state = { _tag: "Unheld" }; recycle(); });
      state = { _tag: "Releasing", cancel };
    },
    state: () => state._tag,
  };
};
```

Provider copy: the dispose effect (`QadiProvider.tsx:285-299`) replaced by

```tsx
const latest = useRef({ atoms, subject });
useEffect(() => { latest.current = { atoms, subject }; }, [atoms, subject]);   // effect, never render
const leaseRef = useRef<RegistryLease | undefined>(undefined);
const lease = (leaseRef.current ??= makeRegistryLease(() => {
  registry.reset();
  registry.set(latest.current.atoms.subject, latest.current.subject);          // or ensureNode(..).setInitialValue(..): both GREEN
}));
useEffect(() => { lease.hold(); return () => lease.release(); }, [lease]);
```

`registryRef` is never nulled. Results [VERIFIED: spike run, `resets` counted by patching the registry instance; `spikeEvents` was polluted by the previous test's unmount timer and is not used]:

| Scenario | Observed |
|---|---|
| P1 long hide then show, hoisted | `text="allowedsubject:u1" registries=1 resets=1 disposes=0 caught=[] errors=0`; reveal order shows consumers subscribing fine, then `registry.get(subject) BY PROVIDER EFFECT` reading the re-seeded subject (no `set`) |
| P1b same, re-seed by `registry.set` instead of `ensureNode().setInitialValue` | identical result (both GREEN) |
| P2 StrictMode | after the double mount `registries=1 resets=0`; after a long hide and reveal `registries=1 resets=1 caught=[] errors=0` (no recycle in the double effect, one registry) |
| P3 short hide | `resets=0 registries=1 errors=0` |
| P4 long hide + re-render while hidden | `registries=1 resets=1 caught=[] errors=0` (no second registry) |
| P5 subject changed (u1 -> u2) while hidden, long hide | `registries=1`, final `deniedsubject:u2`; frames on reveal: `render: subject=u1 can=true` then provider effect `get`, `set(subject)`, then `render: subject=u2 can=false` |
| CTL phase base, subject changed while **visible** | `render: subject=u1 can=true | registry.get(subject) BY PROVIDER EFFECT | registry.set(subject) BY PROVIDER EFFECT | render: subject=u2 can=false` |
| P13 `atoms` swapped while hidden | `registries 1`, `signals ["AtomsReplaced"]`, text `allowedsubject:u1`, no error |
| P7 two providers on one atom set (counting resolver), A hidden long | `A resets 1 B resets 0 evals 2 B nodes 9 -> 9 asked 1`; after A shown `evals 3` (only A re-evaluated), `asked 1`, text `A-allowedB-allowed` |
| P8 `useInvalidate`, `useDevtoolsFeed` after a long hide and reveal | `caught 0 errors 0`; `invalidate()` after the recycle: `evals 2 -> 3` (it reached the live registry); `runtimeLayer` build after the recycle: `built layer ok` |
| P6 true unmount | `resets 1 disposes 0`, nodes `9` before, `1` after (the re-seeded subject), straggling `get(subject)`: `ok` |

The P5 frame is **the same one-frame stale-allow window the base already has for a visible subject change** (CTL), not a new one: the recycle re-seeds the last *committed* subject, because a re-render of a hidden tree commits its DOM but not its effects. A re-seed from a ref written in render would be wrong under concurrent rendering and is not recommended.

**What the re-seed buys** (U4, long hide, then `show + re-render` in one commit so the provider renders before its effects): with the re-seed, frames `render: subject=u1 can=true`; with the recycle but **no** re-seed, frames `render: subject=none can=false | ... | render: subject=u1 can=true` (a painted frame with no subject). On a hoisted reveal the provider's own subject effect corrects it before paint, so the re-seed is what LEASE-04's "before any consumer reads" requires only when the provider re-renders at reveal. Keep it.

### Run 3: `AtomRegistry` facts (effect 4.1.2, `packages/react/node_modules/effect/src/reactivity/AtomRegistry.ts`)

Public interface, quoted verbatim (lines 76, 88-89 and 116; **no cast is needed, and `disposed` is not on the interface**):

```ts
  readonly ensureNode: <A>(atom: Atom.Atom<A>) => Node<A>          // line 76
  readonly reset: () => void                                        // line 88
  readonly dispose: () => void                                      // line 89
  setInitialValue(value: A): void                                   // line 116, on `Node<A>`
```

`disposed = false` is a field of the implementation class (line 514). `reset()` (lines 727-738) clears the timeout buckets, copies and clears `this.nodes`, marks each node `NodeState.removed` and `runAll(nodes, this.destroyNode)`; `dispose()` (746-749) is `this.disposed = true; this.reset()`. `createNode` is what throws `Cannot access Atom ${atom}: registry is disposed` (619-620). `NodeImpl.remove()` runs `this.listeners.clear()` (line 1083) then disposes the lifetime.

Probes (plain registry, no React) [VERIFIED: spike run]:

```
3b ctor get: ctor
3b after reset nodes: 0
3b set persists with no reader: via-set nodes: 1                    (registry.set(keepAlive atom) after reset(), 30 ms later)
3b setInitialValue persists with no reader: via-setInitialValue     (ensureNode(atom).setInitialValue after reset())
3b get after dispose: Error: Cannot access Atom {...}: registry is disposed
3b2 listener saw: [2] (3 absent => reset cleared listener)
3c after subscribe: ["layer acquired"]
3c after unsubscribe+reset: ["layer acquired","layer RELEASED"] nodes: 0
3c after straggling get + 50ms: ["layer acquired","layer RELEASED","layer acquired","layer RELEASED"] nodes: 1
3c after straggling get + 550ms: ["layer acquired","layer RELEASED","layer acquired","layer RELEASED"] nodes: 1
3c2 reset with live subscriber: ["layer acquired","layer RELEASED"]
3d dispose: ["layer acquired","layer RELEASED"]
3e unsubscribed, never reset, +800ms: ["layer acquired","layer RELEASED"] nodes: 1
```

Reading them:
- **Re-seed holds with no reader**: both `registry.set(subject, s)` and `ensureNode(subject).setInitialValue(s)` persist after `reset()` because the subject atom is `Atom.keepAlive` (`QadiAtoms.ts:240-242`: `const subject = Atom.make<AuthSubject | undefined>(undefined).pipe(` `Atom.withEquality(subjectsEqual),` `Atom.keepAlive,`). Pick `registry.set`: public, documented, the same call the provider's effect already makes (`QadiProvider.tsx:259`), and no `preserveInitialValueOnBuild` internals.
- **`reset()` runs the `Atom.runtime` layer finalizer** (3c, 3c2, 3d). `Atom.runtime` is not itself keepAlive (`Atom.ts:905`: `self.keepAlive = false`); its `layerAtom` is (`Atom.ts:910`: `const layerAtom = keepAlive(`).
- **A straggling `registry.get` after a recycle re-acquires the layer and it is released again by itself** (3c: acquired, RELEASED, with no further action; nodes settle at 1). So D-10's accepted trade is **not a leak**.
- **`reset()` silently drops live listeners** (3b2: the subscriber never heard `3`). In Activity order consumers unsubscribe before the timer fires, so nothing is lost; but any subscriber that outlives the hide (a host `registry.mount`, a dock's diagnostics run holding `runtimeLayer`'s mount) is detached without notice. Under `dispose()` it was equally detached and then threw on the next read.
- **V1 (refutes the "never release leaks the layer scope and fibers" reason)**: 3e shows the scope is released by idle removal after the last unsubscribe even though `reset()` never ran. Also in React: U1 below.

### Run 4: the sweep (ADR-QD-148, `SweepScheduler.ts`, `QadiAtoms.ts`)

`makeSweepCounter` is in `packages/react/test/support/sweepCounter.ts` and `withSweepFork` in `packages/react/src/SweepScheduler.ts` (both used as in `QadiProvider.sweep.test.tsx`). Prototype, long hide [VERIFIED: spike run]:

```
P9  mounted: asked 1 counts {"forks":0,"sweeps":0,"sweepsAtFork":[]}
P9  after long hide: resets 1 counts {"forks":0,"sweeps":0,"sweepsAtFork":[]} asked 1
P9  after reveal: counts {"forks":0,"sweeps":0,...} asked HasPermission text "allowedsubject:u1"
P9  admit extra: asked 2 counts sync {"forks":1,"sweeps":0,"sweepsAtFork":[0]}
P9  after settle: counts {"forks":1,"sweeps":1,"sweepsAtFork":[0]} askedAtFork [2] asked policies: HasPermission
P10 hidden + admit extra -> sweep: counts {"forks":1,"sweeps":1,"sweepsAtFork":[0]} asked: HasPermission:extra   (the hidden gate's question WAS evicted)
P10 reveal: text "allowedsubject:u1" counts {"forks":2,"sweeps":2,"sweepsAtFork":[0,1]} caught 0   (re-admitted once, gate renders allowed)
P11 hide+recycle forks 0 sweeps 0 (capacity 100) / forks 0 sweeps 0 asked 1 (capacity 1, at the bound)
P12 two live gates over capacity 1, prototype lease vs release skipped (control):
    lease: hide counts@10ms {"forks":1,"sweeps":1,"sweepsAtFork":[0]} @+80ms identical, askedAtFork [2], resets 1;  reveal counts {"forks":1,"sweeps":1,"sweepsAtFork":[0]} asked 2
    skip : hide counts@10ms {"forks":1,"sweeps":1,"sweepsAtFork":[0]} @+80ms identical, askedAtFork [2], resets 0;  reveal counts {"forks":1,"sweeps":1,"sweepsAtFork":[0]} asked 2
```

Conclusions: the bound holds across a long hide and reveal; `sweepsAtFork` stays `[0]` (no sweep inside the call that signalled, so none in the recycle's stack); the lease and the no-release control give **identical counts** (`reset()` adds no forks: by the time the timer fires the book's live counts are already zero from idle removal, and the scheduler's `pending` flag coalesces anyway); a hidden gate's question can be evicted under pressure and is re-admitted once on reveal, as ADR-QD-148 says. `reset()` does not start a pressure episode on its own.

### Run 5: hydration seeds (D-12)

Seeded `Allow`, `standing` policy, server subject `u1`; "answers deny" = resolver sleeps 1 ms then returns a value that fails the policy; "never" = `Effect.never`. Provider inside the Activity. Final text after a long hide and reveal [VERIFIED: spike run]:

```
H1 lease (client answers deny): reveal frames  render can=false | render can=false     final "denied"   (no allowed frame)
H1 skip  (release skipped, grant retained): identical to the lease row                final "denied"
H2 lease (client never answers): reveal frames render can=false                         final "pending"
H2 skip  (grant retained):       reveal frames render can=true                          final "allowed"
H3 BASE S2 (client answers deny, long hide + re-render): reveal frames render can=true | render can=false   registries=2   final "denied"
H4 BASE S2 (never answers):                                reveal frames render can=true   registries=2   final "allowed"
H5 lease S2 (never answers, long hide + re-render):         reveal frames render can=false  registries=1   final "pending"
H6 lease, subject undefined, seeded allow:                  mounted "allowed", reveal render can=false, final "pending"
HYD mismatch reports: lease: 1 after first answer, 1 after long hide+reveal;  base S2: 1, then 2
```

- After a recycle the registry no longer holds the grant: H2/H5/H6 render `pending` where a retained grant renders `allowed`. Confirmed in code: `seededIn` returns `undefined` unless `registry.getNodes().get(grantAtom)` exists and holds a `SeedGrant` (`SeededQuestion.ts:161-166`), and `reset()` empties `getNodes()`. The seed `WeakMap` is keyed by the `SeedGrant` instance, so there is no path to a seed without the grant.
- **The seed of an answered question is spent per registry, not per grant**: `const seeded = state.announced ? undefined : seededIn(get.registry);` (`SeededQuestion.ts:238`) and `announceState` is a `WeakMap<AtomRegistry.AtomRegistry, AnnounceState>` (`SeededQuestion.ts:192`) keyed by registry identity, which survives `reset()`. Hence H1: no allowed frame under the lease **and** under a retained grant. Today's S2 (H3) paints the superseded allow because the second registry has fresh announce state; after this phase it does not. That is the real behaviour change to record.
- **Consequence to record that CONTEXT did not name**: for a question the client cannot answer (`subject={undefined}`, or a resolver that never settles), a long hide loses the seeded verdict and the gate stays `pending` until the client answers. Fail-closed direction, but user-visible; it belongs in BEH-QD-067's note, ADR-QD-195 and the changeset.
- Hydration `Rechecked`/mismatch reports stay once per question per registry (HYD): the lease adds no second report on the post-recycle re-answer; base S2 does.

### Run 6: which existing tests are vacuous, and what observable fails

The five existing files (`edges.test.tsx`, `QadiProvider.test.tsx`, `.subject`, `.seed`, `.sweep`; 45 tests) were copied with `../src/` rewritten to the prototype copy and run under four variants of the provider (env var read only in the throwaway copy, never in `src`: `process.env` is forbidden in `src` by `no-ambient-console`):

```
=== VARIANT lease      Tests  45 passed (45)
=== VARIANT skip       Tests  45 passed (45)     (release never scheduled)
=== VARIANT dispose    Tests  45 passed (45)     (the base's dispose() without nulling)
=== VARIANT noreseed   Tests  45 passed (45)     (reset() without the re-seed)
```

So P4, SUBJ1..3, SD3 and `edges.test.tsx:257` are all blind to the release behaviour; **none of the 45 needs to change, and none protects the fix**. Only `edges.test.tsx:257` is a stated defect to rewrite (D-15). Unmount probe, per variant [VERIFIED: spike run]:

```
U1[lease]    nodes 9 -> afterTick 1  events ["layer acquired","layer RELEASED"] resets 1 disposes 0  straggling get(subject): ok
U1[skip]     nodes 9 -> afterTick 2  events ["layer acquired","layer RELEASED"] resets 0 disposes 0  straggling get(subject): ok
U1[dispose]  nodes 9 -> afterTick 0  events ["layer acquired","layer RELEASED"] resets 1 disposes 1  straggling get(subject): THREW
U1[noreseed] nodes 9 -> afterTick 0  events ["layer acquired","layer RELEASED"] resets 1 disposes 0  straggling get(subject): ok
U2[lease] straggling get(question) after unmount: ok; layer events before ["layer acquired","layer RELEASED"], after +80ms (unchanged); nodes 2
HOST[lease] keepAlive host atom seeded via initialValues: mounted=seeded afterLongHide=default afterReveal=default afterUnmount+timer=default
HOST[skip]  mounted=seeded afterLongHide=seeded afterReveal=seeded afterUnmount+timer=seeded
```

**The layer finalizer fires in the skip variant too** (`["layer acquired","layer RELEASED"]` with `resets 0`): idle removal releases it. The observable that distinguishes "released" from "release skipped" is the **state a `keepAlive` host atom, seeded through `initialValues` and read from the registry the test took from `RegistryContext`, returns after the timer**: `"default"` after the release, `"seeded"` when it is skipped, `THREW` under `dispose()`. A node count (`1` vs `2`) also distinguishes, but is coupled to library internals. This one observable pins D-09, D-10's last row and D-12's "host atoms return to their default" in one probe, with no test-only seam in `src`.

### Run 7: Stryker and house-style wiring (read, not run)

- `stryker.react.mjs` `mutate` list is exactly the four files (`DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `SweepScheduler.ts`); its header prose names, per file, what a surviving mutant means and lists the covering tests ("`DecisionOutcome.test.ts`, `QuestionBook.test.ts`, `HydrationEvent.test.ts` and `SweepScheduler.test.ts` (no rendering, fast), plus whatever else in the package reaches the module — `perTest` coverage analysis runs only those"). Options: `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `thresholds: { high: 90, low: 80, break: 80 }`, `timeoutMS: 20000`, `vitest.dir: "packages/react"`. Adding `packages/react/src/RegistryLease.ts` to `mutate` and a header sentence ("a registry released twice, never released, or released while held") is the whole wiring. Every rendered provider test also executes the lease, so `perTest` will run them against each lease mutant; keep the lease's own test file the one that kills every mutant, so a rendered test is never the only killer. Run time was **not measured** (Stryker was not run, by instruction).
- `pnpm mutation` (all seven configs, `stryker run stryker.react.mjs` is the last) runs only in full `pnpm check`; `pnpm check:pr` is `node scripts/run-check.mjs --skip-mutation`.
- `scripts/check-house-style.mjs` rules a new `src` module touches: `no-type-assertion` (any `as <Type>` except `as const`), `no-non-null-assertion`, `no-ambient-console` (`console.` and `process.env` and `typeof process` outside `DeveloperSignals.ts`), `no-nondeterministic-time` (`Date.now`, `new Date`, `performance.now`), `no-async`/`no-await`/`no-raw-promise` (`.then(`), `no-extensionless-relative-import`, `no-barrel-effect-import`. **`setTimeout`/`clearTimeout` are not forbidden** (the base provider already uses them; grep of the script finds no rule). `MODULE_STATE_BUDGET` counts `let`/`var` outside every function body; a `let state` **inside** `makeRegistryLease` (as `SweepScheduler.ts`'s `let pending` inside `makeSweepScheduler`) is not counted. `NOT_CALLABLE_PIN_BUDGET` is touched only if a negative `toBeCallableWith` pin is added; the lease needs none. Metric and span-key budgets are not touched (no metric, no span). `madge --circular` (`pnpm circular`): the lease imports nothing from the package, so no cycle.
- `RegistryLease.ts` is not in `packages/react/src/index.ts`'s barrel (`export * from` list read: `DecisionOutcome`, `DevtoolsFeed`, `GateRegistry`, `Hydration`, `QadiAtoms`, `QadiProvider`, `components`, `hooks`); gate 13 reads the barrel, so no `spec/overview.md` row is needed and the export count stays at the base.
- Coverage threshold for `@qadi/react` is 90% (`vitest.config.ts` `thresholds`); `RegistryLease.test.ts` covers the module headlessly.
- Phase 81's mutation scripts to reuse as shapes: `.planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-check.mjs`, `81-mutation.mjs`, `81-mutation-base.json`, `81-mutation-close.json`, `81-RED-EVIDENCE.md`.

### Condensed re-run recipe

1. `cp -R packages/react/src packages/react/test/_spike82.src`; add the lease file and the provider diff above to the copy; write `packages/react/test/_spike82.scenario.tsx` from the harness sketch; one test file per scenario importing either `../src/index.ts` (base) or `./_spike82.src/index.ts` (prototype).
2. Run from the repo root: `pnpm exec vitest run --project react packages/react/test/_spike82.<name> --silent=false < /dev/null` (default reporters swallow `console.log`; `--silent=false` is needed).
3. Existing-test mutants: `sed 's#"\.\./src/#"./_spike82.src/#g'` each of the five files into `_spike82.ex.*.test.tsx` and run with `SPIKE82_VARIANT=lease|skip|dispose|noreseed` (a variant switch exists only in the throwaway provider copy).
4. Delete every `_spike82.*`; `git status --porcelain -- packages scripts spec features` must print nothing.

## Verdicts on the locked decisions

| # | Decision | Verdict | Evidence |
|---|---|---|---|
| V0 | D-04..D-07 (lease module, closed union, provider only calls it, no sweep) | **Confirmed.** Three states suffice; `Released` is the same as `Unheld` (hold after a recycle behaves identically to a first hold) | Run 2 prototype; P1, P2 |
| V1 | D-08 reason "never releasing leaks the runtime layer scope and running fibers" | **Refuted as worded.** Idle removal releases the layer scope with no `reset()` (3e, U1[skip]). An unreleased registry keeps only `keepAlive` nodes and the seed grant for as long as the provider lives, and is GC-able afterwards. Reword the ADR's rejection: never releasing keeps the seed grant and host `keepAlive` atoms across a hide (the very thing D-12 wants dropped) and holds the decision-time subject. The rest of D-08 (identity, built in render, no proxy, no `useScoped`) is **confirmed** | Run 3 (3e), Run 6 (U1) |
| V2 | D-09 `reset()` + re-seed | **Confirmed.** Use `registry.set(latest.atoms.subject, latest.subject)`; `ensureNode(..).setInitialValue(..)` is on the public interface and also works, with no cast, but gives nothing extra | Run 2 (P1, P1b), Run 3 (3b) |
| V3 | D-10 table | **Confirmed row by row** (StrictMode `resets=0`; short hide `resets=0`; long hide `resets=1`, GREEN; re-render keeps `registries=1`; subject change shows the unchanged one-frame window; `atoms` swap keeps one registry and signals `AtomsReplaced`; unmount `resets 1`). The last row's clause "the runtime layer scope is released" is true but is **not caused by the release** (V1) | Run 2 |
| V4 | D-10 accepted trade (straggler recreates a node) | **Confirmed, not a leak**: acquired, then released again by idle removal, nodes bounded | 3c, U2 |
| V5 | D-11 subject only, from a ref written in an effect | **Confirmed**; re-seeds the last *committed* subject, which on a hidden re-render is the old one (P5): the same one-frame class as CTL | Run 2 (P5, CTL, U4) |
| V6 | D-12 seeds not re-applied | **Confirmed as a choice; its stated reason is imprecise.** An answered question never reads its seed again in that registry (`announced` survives `reset()`); the observable difference is for an **unanswered** question only (H2, H5, H6). The pinned test must use an unanswered question (never-answering resolver) | Run 5 |
| V7 | D-13 sweep bound | **Confirmed**, with the lease adding zero forks (identical counts to the no-release control) | Run 4 (P9..P12) |
| V8 | D-15 "observed through the runtime layer's finalizer" | **Refuted.** The finalizer fires within a tick of the unmount with the release skipped. Observe a `keepAlive` host atom seeded through `initialValues` (or the registry's node count) | Run 6 (U1, HOST) |

No probe contradicts D-09 itself: `reset()` meets it (usable after, runs finalizers, subject re-seed persists with no reader). The plan does not have to stop for a recorded decision on the shape; it has to take V1 and V8 into the ADR wording and the test observable.

## Architecture Patterns

### System Architecture Diagram

```
 render (first, also a server render)
   registryRef.current ??= AtomRegistry.make({ initialValues: [[atoms.subject, subject], ...initialValues] })
   leaseRef.current   ??= makeRegistryLease(recycle)            // no timer is armed at construction
        |
        v                                      commit effects (setup: children first, provider's hold LAST)
   <RegistryContext.Provider value={registry}>  ---------------------------------------------+
        |   same object every render, never nulled                                           |
        v                                                                                    v
   consumers: useAtomValue -> registry.subscribe / get          provider effects: latest ref write, subject effect, lease.hold()
        |
   hide / unmount (cleanup: provider BEFORE children)            lease.release()  -> state Held -> Releasing, defer(run)
        |
        |  timer (real macrotask)      hold() before it fires -> cancel() -> Held     (StrictMode, short hide)
        v
   recycle():  registry.reset()                    // finalizers: runtime layer scope, running fibers, question live counts
               registry.set(latest.atoms.subject, latest.subject)   // keepAlive node, survives with no reader
        |
        v   state = Unheld
   reveal: consumers subscribe to the SAME registry (re-seeded), provider effect re-runs hold()
```

### Recommended Project Structure
```
packages/react/src/
├── RegistryLease.ts        # NEW: closed-union lease, injected defer, no React, no module state
├── QadiProvider.tsx        # builds registry + lease in render; latest-props ref; one hold/release effect
└── SweepScheduler.ts       # unchanged
packages/react/test/
├── RegistryLease.test.ts            # NEW: headless, injected defer; kills every lease mutant by itself
├── QadiProvider.lifetime.test.tsx   # NEW: RED test + companions (D-14), rendered
└── edges.test.tsx                   # :257 rewritten to the HOST observable
stryker.react.mjs                    # mutate += RegistryLease.ts; header prose
```

### Pattern 1: A closed-union lease with one cancellation mechanism
**What:** `Unheld | Held | Releasing(cancel)`; `hold` and `release` answer for every state; the deferred callback sets `Unheld` **before** calling `recycle` (a throwing recycle cannot wedge the lease, the `SweepScheduler.ts` rule); `cancel` is the only thing preventing a recycle after a `hold`.
**Why single mechanism:** a second guard in the callback (compare the token again) would make "remove the `cancel()` call" an *equivalent* mutant, which survives and breaks the absolute bar. Keep `cancel` the only mechanism and kill the mutants with a fake defer that really cancels.
**Dispatch:** AGENTS.md §5a requires `Match`, not `switch`, for `_tag` dispatch. A hoisted `Match.type<LeaseState>().pipe(Match.tagsExhaustive({...}))` per transition makes "every transition answers for every state" a compile error for a new state. It is a module-scope `const`, not state, so `MODULE_STATE_BUDGET` is unaffected. (Plain `if` on `_tag` is not a `switch` and also passes the gate, but gives up the exhaustiveness the decision asks for.)
**Example (shape only; names are the planner's):**
```ts
// Source: spike prototype, adjusted to house style (Match, no module-scope let)
import * as Match from "effect/Match";

export type Defer = (run: () => void) => () => void;
export const timeoutDefer: Defer = (run) => {
  const handle = setTimeout(run, 0);
  return () => clearTimeout(handle);
};
export interface RegistryLease {
  /** Cancels a pending release; holding what is already held does nothing. */
  readonly hold: () => void;
  /** Schedules one release of what is held; releasing what is not held does nothing. */
  readonly release: () => void;
}
```

### Pattern 2: The provider owns refs; the lease owns the rule
Build registry and lease together in render (`??=`, no timer armed in render, so a discarded StrictMode/Suspense render leaks nothing, as today); write `latest` in an effect; one `[lease]`-keyed effect calls `hold()` / `release()`. The recycle closure reads the `latest` ref at fire time. `QadiProvider.tsx` keeps its existing `atomsIdentityRef` effect and `AtomsReplaced` signal untouched.

### Anti-Patterns to Avoid
- **Nulling `registryRef` or rebuilding on `atoms` change:** both are rejected (D-08, Deferred). Run 2 P13 shows the registry kept and `AtomsReplaced` signalled once.
- **Reading `registry.disposed` or try/catching the disposed error:** not on the interface; D-07.
- **Observing release through a layer finalizer:** passes with release skipped (V8).
- **A D-12 test on an answered question:** green under every variant (V6).
- **`process.env` / `console` / `globalThis` flags in `src` for a variant switch:** forbidden; the spike's switch existed only in the throwaway copy.
- **Fake timers for the rendered tests:** `settle()`'s fixed 20 `yieldNow` turns exist because `TestClock` does not control `Effect.runFork`; use real macrotasks (`await new Promise((r) => setTimeout(r, 50))`, as `QadiProvider.subject.test.tsx` does). The lease's own tests inject the defer instead, so they need no timers at all.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recycling a registry | A proxy, a rebuild, or per-node removal | `registry.reset()` + `registry.set(subject)` | `reset()` is the registry's own full teardown that keeps it usable; verified |
| Release observable | A test-only seam in `src`, a spy on `reset` | A `keepAlive` host atom seeded through `initialValues`, read from `RegistryContext`'s registry | Real behaviour, fails when release is skipped, no `src` change |
| Cancellable timer | A flag checked in the callback | The injected defer's `cancel` | One mechanism, no equivalent mutants |
| Tag dispatch on the state | `switch` | Hoisted `Match.type().pipe(Match.tagsExhaustive(...))` | AGENTS.md §5a |
| Counting sweeps across a hide | New counters | `makeSweepCounter` + `withSweepFork` | Already in `test/support` and `src/SweepScheduler.ts` |

**Key insight:** the registry already reclaims everything that has a reader (idle removal). The lease exists for what has *no* reader: `keepAlive` state (the subject, seed grants, host atoms). That is why the correct, observable release test is about `keepAlive` state, and why D-12 is a statement about grants, not about layers.

## Common Pitfalls

### Pitfall 1: A RED test that cannot be RED
**What goes wrong:** P4 passes on the base (one-tick hide; fresh provider element each time).
**How to avoid:** hoisted/`useMemo`'d provider element, `Parent` state toggling `<Activity mode>`, `await` a real macrotask while hidden, a real `<Can>` below. Run 1 shows the failure text and order to expect. Assert on the boundary's caught list and captured `console.error` (a boundary stops `act` from throwing; with no boundary `act` throws the `AggregateError`).
**Warning signs:** `act threw: (nothing)` with `text now: "BOUNDARY"` means the error was routed to the boundary (expected with a boundary).

### Pitfall 2: A layer-finalizer assertion for the unmount test (V8)
Green with the release skipped. Use the host-atom observable.

### Pitfall 3: A D-12 pin on an answered question (V6)
Green whether or not the grant is re-applied. Use a never-answering resolver (or `subject={undefined}`) for the "seed does not reappear" assertion, and also pin that the gate then renders `pending`.

### Pitfall 4: Re-seeding from render-time props
Writing `latest` in render is unsafe under concurrent rendering and is the first-closure bug of PITFALLS 82-F. Write it in an effect. A hidden re-render does not commit effects, so the re-seed is the last committed subject (P5); that frame is the existing tradeoff (CTL), not a regression.

### Pitfall 5: Treating `reset()` as free for a live subscriber
`reset()` clears listeners (3b2). Correct in the Activity order (consumers unsubscribe first), but a host that holds a `registry.mount` or a `runtimeLayer` scope across a hide is detached silently. Document it in the provider's comment; no code can fix it from the lease (D-07).

### Pitfall 6: Re-asserting a sweep step count
A hidden gate's question can be evicted and re-admitted (P10: `forks 2 sweeps 2`). Assert the invariants (one fork per episode, `sweepsAtFork` first element 0, forks equal with and without release), not a step count (D-13).

### Pitfall 7: The default defer escapes the lease tests
`timeoutDefer` is the default parameter; a test that always injects a fake never executes it, leaving block-removal and `clearTimeout` mutants alive. Include one lease test with the default defer and a real macrotask (release, wait, assert the recycle ran; hold after release, wait, assert it did not).

### Pitfall 8: Equivalent mutants in the lease
Sources to design out: a second cancellation guard (Pattern 1); an initial state that is never observed; `state = Unheld` ordering (kill with a throwing `recycle` followed by `hold`/`release`/timer firing again, asserting a second recycle runs). A test that asserts `defer` is called exactly once per `release` from `Held`, zero from `Releasing`/`Unheld`, kills the guard mutants; asserting `cancel` is called exactly once on `hold` from `Releasing` and never otherwise kills the cancel mutants.

### Pitfall 9: The existing sweep test header
`QadiProvider.sweep.test.tsx`'s header says a "hidden then shown Activity ... never adds a fork"; P4 still holds and stays valid. Do not edit it to claim a long-hide coverage it does not have; put the long-hide sweep assertions in the new file.

## Code Examples

### The RED test's shape (phase base)
```tsx
// Source: spike harness R1/R4, reduced to what the test needs
const providerEl = (
  <QadiProvider atoms={atoms} subject={reader}>
    <Can policy={canRead} pending="pending" fallback="denied">allowed</Can>
    <SubjectProbe />   {/* renders useSubject()?.id */}
  </QadiProvider>
);                      // hoisted: React bails out of re-rendering it on a mode change
const Parent = () => { const [mode, set] = useState<"visible" | "hidden">("visible"); setMode = set;
  return <Activity mode={mode}>{providerEl}</Activity>; };
// render inside <Boundary onCatch={(e) => caught.push(e)}>; vi.spyOn(console, "error") captured.
// settle; act(() => setMode("hidden")); await real macrotask (>= 50 ms); act(() => setMode("visible")); settle.
// RED on the base: caught holds the disposed-registry errors, text is the boundary's.
// GREEN: caught.length === 0, errors captured === 0, text contains "allowed" and "u1".
```

### The release observable for `edges.test.tsx:257`
```tsx
const host = Atom.make("default").pipe(Atom.keepAlive);   // a host atom seeded through initialValues
// <QadiProvider atoms subject initialValues={[[host, "seeded"]]}><RegistryTap /></QadiProvider>
// RegistryTap: const registry = useContext(RegistryContext); capture it in a ref
// unmount(); await a real macrotask (>= 50 ms);
expect(registry.get(host)).toBe("default");   // fails ("seeded") if release is skipped; THREW under dispose()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dispose in an effect cleanup after `setTimeout(0)`, null the ref | One registry for the provider's life; recycle with `reset()` + re-seed through a headless lease | This phase | A hidden-then-shown provider never reaches an unusable registry |
| Long hide + re-render builds a second registry that re-applies construction seeds | Same registry; seeds not re-applied; announce state persists per registry | This phase | No superseded-allow frame; no second hydration mismatch report |

**Deprecated/outdated:** ADR-QD-103/148's dispose-then-reread window and ADR-QD-014's registry-lifetime consequence are amended by ADR-QD-195 (D-17); past text kept.

## Runtime State Inventory

Not a rename/refactor/migration phase. Omitted.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Stryker run time for `RegistryLease.ts` under `perTest` is acceptable because every rendered provider test also executes it | Run 7 | Mutation step in full `pnpm check` is slow or times out at `timeoutMS: 20000`; measure at the base recording and add the lease test as the sole killer |
| A2 | Stryker's default mutators do not mutate numeric literals, so `setTimeout(run, 0)` yields only block/call mutants | Pitfall 7 | A numeric mutant in `timeoutDefer` could survive unless a real-timer test kills it; the recommended default-defer test would still cover it |
| A3 | The mutants listed in Pitfall 8 are the equivalent-mutant risks of the three-state lease | Pitfall 8 | An unlisted equivalent mutant survives and must be closed by a test or a code change, found only at the mutation base/close |

Everything else in this file was measured or read in this session and is tagged inline.

## Open Questions

1. **Should the provider's doc comment and ADR state the loss for `subject={undefined}` plus a seed (gate stays `pending` after a long hide)?**
   - What we know: H6, measured. Fail-closed direction.
   - What's unclear: whether the owner considers it acceptable for LEASE-04's "loss recorded and pinned".
   - Recommendation: record and pin it (a rendered companion test with `subject={undefined}` and a seed), as D-12 chooses.
2. **Names and recycle wiring** (Claude's Discretion): `makeRegistryLease(recycle, defer?)` as prototyped, with the provider owning the `latest` ref and the lease holding no props. Keeps the lease free of `AuthSubject`/`QadiAtoms` types.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | yes | v26.13.0 | — |
| pnpm | `pnpm check:pr`, scripts | yes | 10.17.1 | — |
| vitest + happy-dom | rendered and headless tests | yes | 5.1.0 | — |
| Stryker | mutation record | present in repo (`@stryker-mutator/vitest-runner`), **not run** | — | none needed for research |

**Missing dependencies:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 (`@effect/vitest` available), happy-dom, `@testing-library/react`; tstyche for type pins |
| Config file | `packages/react/vitest.config.ts` (`include: ["test/**/*.test.tsx", "test/**/*.test.ts"]`, `setupFiles: test/setupTests.ts`) |
| Quick run command | `pnpm exec vitest run --project react packages/react/test/RegistryLease.test.ts packages/react/test/QadiProvider.lifetime.test.tsx < /dev/null` |
| Full suite command | `pnpm exec vitest run --project react < /dev/null` (650 tests, about 4 s at the base); the gate is `pnpm check:pr < /dev/null` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEASE-01 | Hoisted provider + `<Can>` + `useSubject` probe in a toggled `<Activity>`, long hide, show: no caught error, no `console.error`, `allowed`, subject prop read | rendered, RED on base | `pnpm exec vitest run --project react packages/react/test/QadiProvider.lifetime.test.tsx < /dev/null` | Wave 0 (new, written on the base first) |
| LEASE-01 companions | `useInvalidate` after hide/show re-evaluates; `useDevtoolsFeed` `runtimeLayer` builds; StrictMode one registry, no recycle in the double effect; short-hide control; subject changed while hidden (stale-then-new frames); long hide + re-render keeps `registries.size === 1`; `atoms` swap keeps one registry and signals `AtomsReplaced` | rendered | same file | Wave 0 |
| LEASE-02 | `hold`/`release` over every state; one defer call per release from `Held`; `cancel` once on `hold` from `Releasing`; a throwing recycle does not wedge; the default defer with a real macrotask | headless unit with injected defer | `pnpm exec vitest run --project react packages/react/test/RegistryLease.test.ts < /dev/null` | Wave 0 (new) |
| LEASE-02 (gate) | `RegistryLease.ts` has no surviving, no-coverage or ignored mutant | mutation (`stryker.react.mjs`, run alone, stdin closed) | `pnpm exec stryker run stryker.react.mjs < /dev/null` (run only by the planned mutation plan) | Wave 0 (`mutate` list edit) |
| LEASE-03 | Release once on a real unmount: a `keepAlive` host atom seeded through `initialValues` reads its default after the timer; `reset` is not called twice; a straggling `get(subject)` after unmount does not throw | rendered | `pnpm exec vitest run --project react packages/react/test/edges.test.tsx < /dev/null` (the rewritten `:257`) and the lifetime file | existing (rewrite) + Wave 0 |
| LEASE-03 | No registry used after release, none leaks: the lifetime file's straggler test (acquire then release again, nodes bounded) | rendered | lifetime file | Wave 0 |
| LEASE-04 | Subject re-seeded before any consumer reads (provider re-rendering at reveal paints no `subject=none` frame); seeded allow with an **unanswered** question renders `pending` after a long hide; answered question renders no allowed frame; one hydration mismatch report | rendered | lifetime file | Wave 0 |
| LEASE-04 | Sweep bound across a long hide and reveal: forks equal with and without release; `sweepsAtFork[0] === 0`; the hidden gate's question may be evicted and is re-admitted once | rendered with `makeSweepCounter`/`withSweepFork` | lifetime file | Wave 0 |
| LEASE-05 | ADR-QD-195, BEH-QD-746..750, INV-QD-409..410, traceability rows, restated BEH-QD-067/516 | spec gates | `pnpm spec:verify:strict`, `pnpm spec:api`, `pnpm spec:package`, `node scripts/check-dod-table.mjs` | records plan |
| WX-01 | `check:pr` green at each phase end | full gate | `pnpm check:pr < /dev/null` | — |
| WX-04 | No forbidden construct; `MODULE_STATE_BUDGET` unchanged | lint | `pnpm lint` (oxlint + `scripts/check-house-style.mjs`) | existing |
| WX-05 | Coverage >= 90% for `@qadi/react`; Stryker score of touched files does not fall | coverage + mutation | `pnpm coverage`; `82-mutation.mjs` compare | existing + phase script |
| WX-06 | RED first; every new check script shown failing once | recorded | `82-RED-EVIDENCE.md`; the phase scripts' self-tests | Wave 0 |
| WX-07 | No plan-local ids in shipped source/titles | gate | `scripts/check-house-style.mjs` (`no-numbering-placeholder`) + review | existing |

### Sampling Rate
- **Per task commit:** the quick run command above.
- **Per wave merge:** `pnpm exec vitest run --project react < /dev/null` and `pnpm lint`.
- **Phase gate:** `pnpm check:pr < /dev/null` and `pnpm spec:package` green, again after review fixes; full `pnpm check` (with mutation) is the release-PR path.

### Wave 0 Gaps
- [ ] `packages/react/test/QadiProvider.lifetime.test.tsx`: RED on the base first, output to `82-RED-EVIDENCE.md`; use the R1/R4 text above as the expected failure.
- [ ] `packages/react/test/RegistryLease.test.ts`: headless matrix (no React import) with a fake defer that really cancels and one test on `timeoutDefer`.
- [ ] `stryker.react.mjs`: add the module and its header sentence; record the base **before** any source edit over the four existing files.
- [ ] `edges.test.tsx:257`: replace the empty-body assertion with the host-atom observable; show it failing once with the release skipped under a scratch edit.
- [ ] `82-check.mjs`, `82-mutation.mjs` (shapes from Phase 81), each shown failing once.

## Security Domain

`security_enforcement` is on (`.planning/config.json`: `"security_enforcement": true`, ASVS level 1, block on high).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no credential or session handling) |
| V3 Session Management | no | — |
| V4 Access Control | yes (a stale or resurrected allow is the risk) | Fail-closed recycle: the registry returns to `Pending` rather than serving a retained verdict; the client's own answer wins (INV-QD-028, ADR-QD-017); seeds are not authorities (ADR-QD-039) |
| V5 Input Validation | no new input | existing `untrustedDecoder` seams untouched |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale allow painted after a hide (superseded server seed, or last subject's verdicts) | Elevation of privilege | No re-applied seed after a recycle (Run 5); the unchanged one-frame subject window is recorded, not widened (CTL equals P5) |
| A re-seeded wrong subject (first-closure bug) | Spoofing / EoP | `latest` ref written in an effect only (Pitfall 4); test a subject changed while hidden |
| A hidden provider keeps a seeded grant for hours | EoP | `reset()` drops the grant at release; D-12 |
| A consumer reaching a disposed registry throws and the host fails open on `catch` | Denial of service / EoP | Registry is never disposed while the provider lives; INV-QD-409 |

No `console`, `process.env`, clock or randomness is added; the lease uses `setTimeout`/`clearTimeout` as the base provider already did.

## Sources

### Primary (HIGH confidence)
- This session's runs on the phase base and on the prototype copy (Runs 1-6 above).
- `packages/react/node_modules/effect/src/reactivity/AtomRegistry.ts` lines 76, 88-89, 116, 514, 585-621, 727-749, 1083 (read this session).
- `packages/react/node_modules/effect/src/reactivity/Atom.ts` lines 905-910 (read this session).
- `packages/react/src/QadiProvider.tsx` (lines 61, 217-223, 257-261, 285-299), `QadiAtoms.ts:240-242`, `SeededQuestion.ts:161-166,192,238`, `SweepScheduler.ts`, `useGate.ts:143` (read this session).
- `packages/react/node_modules/@effect/atom-react/src/Hooks.ts` (`makeStore`, `useStore`) and `RegistryContext.ts` (read this session).
- `scripts/check-house-style.mjs` rules and budgets, `stryker.react.mjs`, `packages/react/vitest.config.ts`, `.planning/config.json` (read this session).
- `.planning/research/PITFALLS.md` 82-A..H; `.planning/ROADMAP.md` Phase 82; `.planning/REQUIREMENTS.md`.

### Secondary / Tertiary
- None. No web source was used; React's behaviour was observed, not quoted.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing is added.
- Architecture / fix shape: HIGH, GREEN under the prototype across every scenario of D-10 and the sweep and seed probes.
- Pitfalls: HIGH for those measured; MEDIUM for the Stryker-specific ones (A1-A3, not run).

**Research date:** 2026-11-25
**Valid until:** until `effect` or `react` is bumped (the `AtomRegistry` idle-removal and `reset()` behaviour and React's Activity cleanup order are the two load-bearing facts; re-run Runs 1-3 after a bump).
