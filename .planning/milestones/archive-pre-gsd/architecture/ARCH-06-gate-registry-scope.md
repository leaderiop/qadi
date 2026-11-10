---
id: ARCH-06
title: Give the gate registry an owner — one registry per atom set, not one per process
strength: Worth exploring
status: done
evidence_verified_at: 1caf04c
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-053 (amend — "The registry" section and the host-subscription correction)
  - ADR-QD-014 (constraint — AtomRegistry scheduler knobs stay off limits)
  - ADR-QD-017 (constraint — render state never carries the previous verdict)
  - ADR-QD-041 (constraint — console calls stay confined to HydrationWarning.ts)
  - ADR-QD-052 (constraint — the element is carried, never looked up by selector)
  - ADR-QD-037 (constraint — madge circular-import gate)
  - ADR-QD-038 (constraint — changesets, fixed version group)
  - ADR-QD-NEXT (new — "A gate registry belongs to its atom set")
packages: ["@qadi/react", "@qadi/devtools", "@qadi/features", "@qadi/example-nextjs"]
estimate: L
---

# ARCH-06 — Give the gate registry an owner

## 1. Verified evidence (at `1caf04c`)

Re-checked against `git rev-parse --short HEAD` = `1caf04c`. The working tree on
the current branch (`ci/stryker-ignore-static`) has unrelated uncommitted
changes under `spec/` and `stryker.*.mjs`. Start this work on a fresh branch
from `main`, not on top of those changes.

Import paths moved since the review: `@qadi/react` now imports reactivity from
`effect/reactivity/*`, for example `packages/react/src/QadiAtoms.ts:28-31` and
`packages/react/src/useGate.ts:17`, not `effect/unstable/reactivity/*`. AGENTS.md
§13 still spells it `effect/unstable/reactivity/Atom`. That is doc drift, outside
this plan's scope (see §3). Every code sketch below uses the current path.

### Claim 1: the registry is process-global and shared by every `QadiProvider` (**CONFIRMED**, plus a worse defect)

- The state lives at module level in `packages/react/src/GateRegistry.ts`:
  `instances` at `:125`, `listeners` at `:126`, `owners` at `:143`, `snapshot`
  at `:152` and `stale` at `:153`. The read and write functions close over
  them: `gateInstances` `:174`, `subscribeGates` `:183`, `registerGate` `:207`,
  `updateGateState` `:234` and `clearGatesUnsafe` `:248`.
- The file's own doc comment admits the scope (`GateRegistry.ts:44-59`): "shared
  by every `QadiProvider` in the process … `gateInstances()` cannot tell whose
  guard is whose." The only per-provider part is *whether* a guard registers,
  because `instrument` comes from context (`QadiProvider.tsx:42-54`,
  `useGate.ts:62`).
- `clearGatesUnsafe` exists only because tests share that scope. It runs after
  every test in `packages/react/test/GateRegistry.test.tsx:58-61` and before
  every scenario in
  `features/features/gate-instances/gate-instances.steps.test.ts:142-147`.
- **Settled by a scratch test.** The test lived in
  `…/scratchpad/arch06/cross.test.tsx` and imported the real sources. It ran
  through the react package's vitest with
  `npx vitest run --config …/scratchpad/arch06/vitest.config.ts`. Result: two
  `QadiProvider`s with **different** atom sets (`tenantA`, `tenantB`) both
  appear in `gateInstances()`, which returned `[['_r_0_','Can','Allowed'],
  ['_r_1_','Can','Denied']]`. Meanwhile `tenantA.asked()` and `tenantB.asked()`
  each returned one entry. "What is asked" is scoped to the atom set. "What is
  asking" is not. A `GateInstance` carries no field naming its owner: its keys
  are exactly `element, id, kind, policy, resource, state`.
- **The cross-root `useId` claim needs narrowing (CHANGED).** The doc comment
  says two roots "can in principle mint the same id" (`GateRegistry.ts:52-55`).
  On React 19.3.0, which this repo pins, **client** roots (`createRoot`) draw
  ids from one global counter. The scratch run returned `_r_2_` and `_r_3_`,
  so client roots do not collide. **Hydrated** roots (`hydrateRoot`) derive ids
  from tree position, and they do collide. Scratch
  `…/scratchpad/arch06/hydrate.test.tsx` hydrated two server-rendered roots,
  one guarded by `doc:read` and one by `admin`. `gateInstances()` then held
  **one** entry, `[['_R_0_','Denied']]`. Root A's `Allowed` guard was still
  mounted, but the panel had silently lost it. After root A unmounted, the
  owner-token check (`GateRegistry.ts:212-218`) correctly kept B's entry. The
  loss happens at registration time and is never repaired. The review did not
  name this defect. It is the strongest reason to change the store, not only
  its owner.

### Claim 2: "what is asked" and "what is asking" are two registries, joined only in the devtools model (**CONFIRMED**)

- *Asked* lives on the atom set. The interface member is at
  `packages/react/src/QadiAtoms.ts:158` with its JSDoc at `:102-157`; the
  review's "~91-182" is the whole `QadiAtoms` interface, `:91-180`. The
  implementation is at `:625`.
- *Asking* is the module above. The JSDoc says it out loud: "What is
  **asking** is recorded separately … in `GateRegistry.ts`" (`QadiAtoms.ts:112-115`).
- They are joined in only two places, both outside `@qadi/react`:
  - The host hands both in separately: `examples/nextjs-newsroom/src/client/Dock.tsx:156`
    (`atoms.asked()`) and `:127` (`gateInstances`).
  - `@qadi/devtools` joins them structurally with `instancesAsking`
    (`packages/devtools/src/model/Gates.ts:187-194`), called from
    `packages/devtools/src/react/QuestionsPanel.tsx:164`.
- The scope mismatch has a visible consequence. If two atom sets ask an
  `Equal.equals`-equal question, tenant B's guards are listed under tenant A's
  question row, because `gateGroups` (`Gates.ts:142-161`) cannot tell them
  apart.

### Claim 3: `subscribeGates` has no consumer in `packages/*/src`, but `Dock.tsx` is a real host consumer (**CONFIRMED, both halves**)

- `rg subscribeGates packages/*/src` finds only `GateRegistry.ts:183` and
  doc-comment mentions (`QadiAtoms.ts:138-140`).
- Real consumers:
  - `examples/nextjs-newsroom/src/client/Dock.tsx:33` imports it, and `:127`
    calls `useSyncExternalStore(subscribeGates, gateInstances, gateInstances)`.
  - Tests use it at `packages/react/test/GateRegistry.test.tsx:248`, `:355` and
    `:366`.
  - AGENTS.md §13 (lines 621-630), ADR-QD-053:139-147 and
    BEH-QD-217 (`spec/behaviors/28-devtools-screens.md:271-282`) all name the
    host subscription as the intended wiring.
- **Deletion test: the module earns its keep.** Delete the subscribe/snapshot
  pair and every host has to rebuild a cached-snapshot store to feed the dock,
  including the reference stability `useSyncExternalStore` needs
  (`GateRegistry.ts:145-153`). The module stays. Only its **seam** moves, from
  module scope to a value owned by the atom set. The host's subscription must
  survive, re-pointed (T8).
- `QadiAtoms.ts:135-144` says "what is missing is the consumer". That is
  partly stale: the consumer exists in the example host, and is only missing
  from `packages/devtools/src`.

### Claim 4: `useGate` mirrors render state through two effects and ref juggling, so it can only be tested with React render tests (**CONFIRMED for `useGate`, REFUTED for the store**)

- `useGate`:
  - The two effects are at `packages/react/src/useGate.ts:102-115` (identity:
    register and unregister) and `:125-128` (state).
  - `policyRef` and `resourceRef` are at `:91-94`.
  - The effects are keyed on `atom`, not on the raw policy or resource, so an
    inline policy does not churn (`:77-90`, ticket 141).
- The store is **already** tested without React. The "interleaving" block
  (`GateRegistry.test.tsx:374-457`) calls `registerGate` and `updateGateState`
  directly, with no render. What forces the shared `afterEach`
  `clearGatesUnsafe()` is the module-level state, not the effects. So "testable
  only through render tests" holds for `useGate`'s lifecycle wiring and not for
  the registry.

### Incidental findings (verified, in scope because the change touches them)

- **The write side is public, and it contradicts its own rationale.**
  `packages/react/src/index.ts:1` re-exports all of `GateRegistry.ts`, so
  `registerGate` and `updateGateState` are public. `spec/overview.md:404` lists
  them too. Yet `useGate.ts:12-13` says `useGate` is kept out of the barrel
  because "the kind is not a caller's to choose. A consumer able to pass one
  could register a `<Can>` that does not exist." `registerGate` lets exactly
  that consumer do exactly that.
- `@qadi/devtools` has no dependency on `@qadi/react`
  (`packages/devtools/package.json` lists `dependencies: { "@qadi/core" }`
  only). It holds a structural mirror type, `GateInstanceLike`
  (`packages/devtools/src/model/Gates.ts:41-49`).
- The devtools empty-state text names the global export:
  - `QuestionsPanel.tsx:114` reads "usually gateInstances()".
  - JSDoc at `QuestionsPanel.tsx:67` and `DevtoolsDock.tsx:99` says the same.
  - `packages/devtools/test/react/QuestionsPanel.gates.test.tsx:42-48` asserts
    the substring `"gateInstances()"`.
- The baseline is green:
  - `npx vitest run --project react packages/react/test/GateRegistry.test.tsx`
    passes 31 of 31.
  - `npx vitest run --project devtools packages/devtools/test/react/QuestionsPanel.gates.test.tsx packages/devtools/test/model/Gates.test.ts`
    passes 40 of 40.
- `@qadi/react` is not under any Stryker gate. Mutation gates 16-21 cover core,
  the devtools **model**, predicate-sql, predicate-prisma, audit and http
  (`spec/process/definitions-of-done.md:30-35`). `@effect/vitest` is already a
  devDependency of `@qadi/react`, and it ships `it.prop`, so property tests need
  no new dependency.

## 2. Goal and success criteria

**Goal.** Move the gate registry's **seam** from module scope to a value with
an owner. Each atom set built by `makeQadiAtoms` owns one registry, `atoms.gates`.
That puts "what is asked" (`atoms.asked()`) and "what is asking"
(`atoms.gates`) on one **interface**, with the same scope and the same
lifetime.

The registry module gets **deeper**:
- Its public interface shrinks to a read side: `instances()` and `subscribe()`.
- The write side becomes one handle-returning `register`. It is reachable only
  inside `@qadi/react`, through a side table, the way `HydrationSeed.ts` already
  hides seed atoms.
- Ownership tokens, cached snapshots, listener isolation and id-collision
  handling all sit behind that small interface.

**Locality improves.** Two tenants, two React roots, or two tests no longer
share state. A test isolates itself by building its own atom set, not by
resetting process state.

The host-subscription **adapter** survives with more **leverage**. A host can
keep wiring `useSyncExternalStore` against `atoms.gates`, or call a new
`useGateInstances()` hook inside the provider.

Instrumentation stays opt-in, and off still means absent.

**Success criteria**

1. No module-level registry state remains:
   `rg -n "^(const|let) (instances|listeners|owners|snapshot|stale)\b" packages/react/src`
   prints nothing.
2. Two atom sets in one process do not see each other's guards. A test
   (`packages/react/test/GateRegistry.test.tsx`, describe "scoped to its atom
   set") mounts instrumented providers over `a` and `b`, then asserts
   `a.gates.instances()` lists only `a`'s guard and `b.gates.instances()` lists
   only `b`'s.
3. Two **hydrated** roots sharing one atom set both stay listed. A test that
   mirrors the scratch reproduction asserts:
   - `atoms.gates.instances()` has length 2 with distinct `id`s;
   - unmounting one root leaves the other;
   - the id-collision reporter was called exactly once.
   The test is red before T2 and green after T5.
4. The host subscription still works:
   - `examples/nextjs-newsroom/src/client/Dock.tsx` reads guards through the
     scoped registry;
   - `pnpm --filter @qadi/example-nextjs check` passes, including
     `e2e/lens.spec.ts` unmodified.
5. Off means absent. These test files are byte-identical to `main`, so
   `git diff --stat main -- <files>` prints nothing:
   - `packages/react/test/hooks.test.tsx`
   - `packages/react/test/edges.test.tsx`
   - `packages/react/test/ServerRender.test.tsx`
   - `packages/react/test/QadiAtoms.test.ts`
   - `packages/react/test/QadiProvider.test.tsx`
   - `packages/react/test/Hydration.test.ts`
   - `packages/react/test/HydrationCounts.test.ts`
   - `packages/react/test/v4-reactivity-smoke.test.ts`
   - `packages/devtools/test/react/Lens.test.ts`
   - `examples/nextjs-newsroom/e2e/lens.spec.ts`

   They must also pass. The "uninstrumented, nothing changes" describe in
   `GateRegistry.test.tsx` keeps its three assertions, re-pointed to a
   per-test atom set.
6. The global exports are gone. `rg -n "gateInstances|subscribeGates|clearGatesUnsafe|registerGate|updateGateState" packages/*/src examples/*/src features`
   prints nothing outside doc text that names them as removed. Gate 13
   (`node scripts/check-api-surface.mjs`) passes with the updated
   `spec/overview.md` rows.
7. The store contract is tested headless.
   `packages/react/test/GateRegistry.store.test.ts` (*new*) imports neither
   `@testing-library/react` nor `react`:
   `rg -n "testing-library|from \"react\"" packages/react/test/GateRegistry.store.test.ts`
   prints nothing.
8. The dependency direction holds:
   - `rg -n "@qadi/react" packages/devtools/package.json` prints nothing;
   - `pnpm circular` (gate 5) passes.
9. `pnpm check` passes end to end.

## 3. Non-goals

- **The dock does not subscribe by itself.** A structural
  `gateSource={{ instances, subscribe }}` prop on `DevtoolsDock` is a
  plausible follow-up. It is out of scope because:
  - it changes `@qadi/devtools`'s contract;
  - ADR-QD-053's correction (`053-a-gate-can-be-found.md:139-147`) deliberately
    put the subscription in the host;
  - it is orthogonal to scoping.
  It is recorded as option (c) of D-06-d so it is not lost.
- **No per-provider filtering inside one registry.** Providers that share an
  atom set share its registry, exactly as they already share `asked()`.
  Splitting "asking" finer than "asked" would recreate the mismatch this plan
  removes.
- **`asked()`'s scope, its eviction (`sweepEvictions`,
  `maxTrackedQuestions`) and `Atom.family` keying do not change.**
- **The devtools grouping and join do not change.** `gateGroups`,
  `instancesAsking`, `GateInstanceLike` and `Lens.ts` stay as they are. Only
  comments and one empty-state string in `@qadi/devtools/src/react` change.
  The devtools model is under Stryker gate 17 and its code is untouched.
- **`GateInstance`'s fields stay.** `id`, `kind`, `policy`, `resource`, `state`
  and `element` are all kept. Only the uniqueness of `id` within one snapshot
  becomes a guarantee (D-06-e).
- **`useGate` keeps its two-phase lifecycle**, split by ticket 141 and the
  ReactSlice audit (`reports/audit-2026-09-07/low-info/ReactSlice.json:17-18`).
  It moves into one internal hook, `useGateRegistration`, so it can be tested
  with `renderHook` and without a provider, but its semantics do not change.
- **AGENTS.md §13's stale `effect/unstable/reactivity` path is not fixed
  here.** It is unrelated doc drift and should be its own one-line CCR. Fold
  it in only if a reviewer asks.
- **No Stryker gate for `@qadi/react`.** Adding one is a separate
  ADR-QD-025-family decision.

## 4. Constraints

- **AGENTS.md §13, decisions stay out of React state.** The registry holds
  *who is asking* and what each guard rendered, never a retained verdict.
  `GateRenderState` keeps `Rechecking` separate from `Pending` and carries no
  previous answer (ADR-QD-017). The new `useGateInstances()` puts guard
  *instances* into a host's render through `useSyncExternalStore`. That is the
  host-subscription shape ADR-QD-053 already sanctions, and it holds no
  decision.
- **AGENTS.md §13, `@qadi/react` makes no DOM calls.** The registry only holds
  the element React's ref filled in. Nothing new may call `document`,
  `getBoundingClientRect` or a selector.
- **AGENTS.md §13 and INV-QD-046, off means absent.**
  - With `instrument` off, no guard registers and no marker renders. The
    provider tree may gain no DOM node.
  - `makeQadiAtoms` now allocates an empty registry for every atom set. That
    is an allocation, not a DOM or behaviour change, and the registry stays
    empty for the atom set's life when uninstrumented.
  - The existing uninstrumented tests are the evidence and must pass
    untouched (criterion 5).
- **AGENTS.md §13, scheduler knobs stay off limits (ADR-QD-014).** The
  registry is plain closure state, never an `Atom` inside an `AtomRegistry`.
  D-06-a rejects that option partly because `AtomRegistry` node lifetime and
  dispatch are the area §13 fences off.
- **AGENTS.md §9, barrels.** `packages/react/src/index.ts` stays a pure,
  alphabetical `export *` barrel, which house-style's `barrel-order` rule
  checks. The write side therefore lives in a module that is **not** in the
  barrel (`GateWriter.ts`, *new*), the same pattern as `useGate.ts` and
  `HydrationSeed.ts`. Public types defined there are re-exported by name from
  `GateRegistry.ts` with `export type { … } from "./GateWriter.ts"`. Gate 13's
  `REEXPORT_FROM` parser supports that form
  (`scripts/check-api-surface.mjs:64-77`), and `QadiAtoms.ts:39` already does
  the same for `HydrationWarning.ts`'s types.
- **ADR-QD-037, the madge gate (gate 5).** madge has no `skipTypeImports`
  config here, so type-only imports count as edges. The module graph must be
  acyclic, type imports included:
  - `GateRegistry.ts` → `GateWriter.ts`
  - `QadiAtoms.ts` → `GateRegistry.ts`, `HydrationWarning.ts`
  - `QadiProvider.tsx` → `GateRegistry.ts` (type), `GateWriter.ts`, `HydrationWarning.ts`
  - `useGate.ts` → `GateWriter.ts`, `QadiProvider.tsx`
  - `hooks.ts` → `QadiProvider.tsx`, `GateRegistry.ts` (type)

  `GateWriter.ts` imports nothing local, only `@qadi/core` types and `react`.
- **AGENTS.md §6, no `as`, `any` or `!`; memory note, no
  `Record<string, unknown>` used as a widened implementation type.** The side
  table is keyed on `object`, which `HydrationSeed.ts:24` does too. That is
  the parameter's real constraint, not a widening. Narrowing happens through
  `WeakMap.get` returning `GateWriter | undefined`, so no cast is needed.
- **AGENTS.md §5 and §5a.** The registry is synchronous React-side closure
  state with no `Effect` in it, as `GateRegistry.ts` is today, so `Effect.fn`
  does not apply. No `switch` is added.
- **Budgets.** `SWITCH_BUDGET`, `UNTRACED_BUDGET`, `SCHEMA_ERROR_BUDGET`,
  `ANY_BUDGET` and `HAS_CUSTOM_BUDGET` are all unaffected. No file they track
  changes, and the plan adds no `switch`, no `fnUntraced`, no
  `Schema.TaggedError`, no `any` and no `hasCustom`. Gate 4,
  `node scripts/check-house-style.mjs`, confirms this.
- **ADR-QD-041, console confinement.** `GateRegistry.ts:157-163` refuses to
  call `console` itself. The new id-collision warning goes through a default
  reporter in `HydrationWarning.ts`, the declared confinement point. It is
  gated by that file's `isDevelopment()` and overridable through an option,
  mirroring `hydrationMismatchReporter`.
- **ADR-QD-052, the element is carried and never looked up.** Keep it. The
  `data-qadi-gate` attribute stays human-facing. Its value must stay
  hydration-stable, which rules out a registry-minted id prefix (D-06-e).
- **`@qadi/devtools` must not depend on `@qadi/react`.** It must stay
  structural, through `GateInstanceLike`. Criterion 8 checks this.
- **AGENTS.md §11 and §15, spec is normative.** BEH-QD-233's signature listing,
  INV-QD-046, ADR-QD-053, `spec/overview.md` (gate 13), the traceability
  matrix (gate 10) and `spec/devtools-spec/` (gate 12) change in the same
  change as the code.
- **ADR-QD-038, changesets.** All nine public packages are in one `fixed`
  group (`.changeset/config.json:5-17`). They are 0.x, so a breaking change
  rides a **minor** bump and must say "Breaking" in the changeset (memory note
  "closed union over widening").

## 5. Decisions needed before work starts

### D-06-a — The scoping unit: who owns a registry?

Options:
1. **Provider-owned.** `QadiProvider` builds a registry per mount and exposes it
   only through context.
   - Gives isolation per provider.
   - The scope mismatches `asked()`, which is per atom set and shared by every
     provider over it.
   - Unreachable outside that provider's React subtree: a dock in a second
     root, a test asserting after unmount, or a micro-frontend shell.
2. **Atom-set-owned (`atoms.gates`).** `makeQadiAtoms` builds one registry
   beside `asked()`.
   - Same scope and lifetime as "asked", so the two views sit on one
     interface.
   - Reachable from anywhere that holds the atom set: hosts, tests, other
     roots.
   - Two providers over one atom set share it, by design.
3. **Explicit registry passed in.** `makeGateRegistry()` plus
   `<QadiProvider gates={…}>`.
   - Maximum control, so several atom sets can feed one dock through one
     subscription.
   - Alone, it gives every host a new required wire.
4. **An `Atom` in each provider's `AtomRegistry`.** Rejected:
   - provider-scoped again, so the `asked()` mismatch remains;
   - the value is dropped when nothing subscribes, so it needs `keepAlive`;
   - every registration routes through `AtomRegistry` dispatch, the area
     ADR-QD-014 and §13 fence off;
   - unreachable outside React.

**Recommendation: 2 as the default, with 3 as an opt-in override (layered).**
`atoms.gates` is what every provider writes to unless it was handed
`gates={registry}`. In that case it writes there instead, and the host owns
the join with `asked()` (documented on the prop). This is the complete
option. It satisfies "asked and asking sit together" by default and still
serves the micro-frontend shell that wants one registry for N atom sets.

`status: decided (2026-10-04, recommended default)`

### D-06-b — The breaking change to the exports

Today's registry exports, per `spec/overview.md:404-405`, are `gateInstances`,
`subscribeGates`, `registerGate`, `updateGateState`, `clearGatesUnsafe` and the
types `GateInstance`, `GateKind` and `GateRenderState`.

Options:
1. **Remove all five functions.**
   - Add `makeGateRegistry`, `GateRegistry`, `GateRegistryOptions` and
     `useGateInstances`.
   - Add the `gates` field to `QadiAtoms` and `QadiContextValue`, the `gates?`
     prop to `QadiProviderProps`, and `onGateIdCollision?` to
     `QadiAtomsOptions`.
   - The write side becomes internal.
   - Gate 13 rows are rewritten. The changeset is a **minor**, marked
     Breaking.
2. **Remove only the three global readers and keep `registerGate` and
   `updateGateState` public, re-shaped to take a registry.** This keeps the
   contradiction with `useGate.ts:12-13`: a caller could still register a
   `<Can>` that does not exist.
3. **Keep the names and re-point them at a "default" registry.** That is a
   global under another name (see D-06-c).

Also breaking: `QadiAtoms` gains a required `gates` member, so a hand-written
`QadiAtoms` test double stops compiling. None exists in this repo (`rg
"asked:\s" packages examples features apps` finds only `QadiAtoms.ts:625`),
but a consumer's might. The changeset must say so.

**Recommendation: 1.** Under the house rule of closed union over widening, a
compile error at every old call site is the correct failure mode, not a
silently re-scoped name.

`status: decided (2026-10-04, recommended default)`

### D-06-c — A deprecated global shim for one minor?

Options:
1. **No shim.** The names are removed in the same minor.
2. **An aggregating shim.** `gateInstances()` would read the union of every
   live registry. That needs a module-level registry-of-registries, which is
   the global this plan removes. It also leaks atom sets unless built on
   `WeakRef` and `FinalizationRegistry`, whose timing is nondeterministic and
   would make the shim's output untestable.
3. **A default-registry shim.** Providers would double-write into a module
   default registry as well as `atoms.gates`. Two sources of truth, and the
   hydrated-root collision (§1) survives in the shim.

**Recommendation: 1, no shim.** All packages are 0.x. The only in-repo
consumers are one example host, one acceptance suite and this package's tests,
and every one migrates in this change. A shim keeps the defect alive behind a
deprecation tag, and a shim that silently diverges from the real registry is
worse than a compile error. Mitigation: the changeset carries an exact
before-and-after migration snippet (T10).

`status: decided (2026-10-04, recommended default)`

### D-06-d — The host read surface

Options:
1. **The plain pair only.** `atoms.gates.subscribe` and
   `atoms.gates.instances`, so the host calls `useSyncExternalStore` itself,
   as today.
2. **The pair plus `useGateInstances()`** in `hooks.ts`. It reads the
   provider's effective registry (`gates` prop, else `atoms.gates`) from
   context and subscribes for the caller. It throws
   `MissingQadiProviderError` outside a provider, like every other hook.
3. **Option 2 plus a `gateSource` prop on `DevtoolsDock`.** The dock would
   take a structural `{ instances, subscribe }` and subscribe itself.

**Recommendation: 2.**
- The pair remains the primitive. It works outside React and outside the
  provider: a second root, a test, a micro-frontend shell.
- The hook is the right adapter for the common case. The example's `Dock`
  already renders inside the provider (`Shell.tsx:109-111`).
- Because the hook reads the *effective* registry, a host using the
  D-06-a override gets the right one without knowing which it is.
- Option 3 is deferred (§3).

`status: decided (2026-10-04, recommended default)`

### D-06-e — Guard id uniqueness within one registry

The defect in §1 shows that two hydrated roots sharing a registry mint the
same `useId`, and today the second silently replaces the first.

Options:
1. **Status quo.** Last write wins, and a mounted guard disappears.
2. **Prefix every id with a registry-minted per-provider counter**, giving
   ids such as `g1:_R_0_`. Rejected: not hydration-stable.
   - The server and the client build their providers from different counter
     states, because the server's atom set is module-scoped across requests.
   - So the server-rendered `data-qadi-gate="g57:_R_0_"` and the client's
     `g1:_R_0_` disagree.
   - React 19 does not patch a mismatched attribute on hydration. The marker
     would carry the server's value forever, and the "attribute equals
     registry id" property (`GateRegistry.test.tsx:300`) would break on every
     SSR page. The example renders instrumented markers on the server.
3. **Handle-based registration with collision disambiguation.**
   - `register(instance)` returns a `GateHandle { update(state); unregister() }`.
   - The store keys entries internally. If `instance.id` is already held by a
     **different live** registration, the new entry gets a unique key,
     `${id}~${n}` with `n` from a per-registry counter.
   - The registry reports the collision once per id through
     `onIdCollision`. The default reporter, in `HydrationWarning.ts`,
     dev-warns and names React's own fix: give each root a distinct
     `identifierPrefix` in `hydrateRoot` or `createRoot` options.
   - `data-qadi-gate` keeps the raw `useId`. That is hydration-stable and
     correct in the normal case. Only in the misconfigured case does the
     human-facing attribute differ from the panel id, and that case is warned
     about.
   - Snapshot ids stay unique, so devtools' React `key={instance.id}`
     (`QuestionsPanel.tsx:201`) and lens highlight-by-id stay correct.
   - A mounted guard is never dropped.
   - The handle also replaces the `owners` token map: each handle closes over
     its own key, so "a stale cleanup cannot evict a newer registration"
     becomes structural rather than checked.

**Recommendation: 3.** It is the only option that is hydration-safe, never
loses a mounted guard, and tells the host how to fix the root cause.

`status: decided (2026-10-04, recommended default)`

## 6. Tasks

All tasks after T1 are blocked on D-06-a through D-06-e being decided. If a
decision lands differently from its recommendation, re-derive the affected
tasks: D-06-a touches T3, T4 and T6; D-06-b and D-06-c touch T7 and T10;
D-06-d touches T6 and T8; D-06-e touches T2 and T5.

### T1 — Reproduce the two scope defects as red tests

- **Status:** [x] done
- **Depends on:** —
- **Files:** `packages/react/test/GateRegistry.test.tsx`
- **Steps:**
  1. Branch from `main`. Do not build on the current branch's unrelated
     uncommitted changes.
  2. Add a describe, `"scope (ARCH-06 reproductions)"`, with two tests
     written against **today's** exports, so they compile and fail now.
     - **(a) Hydrated roots both stay listed.**
       1. Build `tree(policy)` as an instrumented `QadiProvider` over
          `makeQadiAtoms(EvaluationServicesNone)` wrapping one `<Can>`.
       2. Fill two `div`s with `renderToString(tree(canRead))` and
          `renderToString(tree(isAdmin))`.
       3. `act(() => hydrateRoot(...))` each, passing
          `onRecoverableError: () => {}`.
       4. Assert `gateInstances()` has length 2. It fails today with length 1,
          as the scratch run showed.
       5. Unmount both roots in `act`.
       Imports: `hydrateRoot` from `react-dom/client`, `renderToString` from
       `react-dom/server`.
     - **(b) Two atom sets do not share guards.** Mount `tenantA` with a
       `doc:read` guard and `tenantB` with an `admin` guard, both
       instrumented. Assert `gateInstances()` lists exactly one `Can`. It
       fails today with two.
  3. Mark both `it.fails(...)` so the suite stays green on this commit, with a
     comment `// flips to it(...) in ARCH-06 T5`.
- **Tests:** the two above. They pin the defects before any fix.
- **Verify:** `npx vitest run --project react packages/react/test/GateRegistry.test.tsx`
  is green, with the two `it.fails` reported as expected failures.
- **Done when:** both reproductions are committed as expected failures and
  reproduce the §1 numbers: one instance for (a), two for (b).

### T2 — Build the owned store behind a handle-returning write side

- **Status:** [x] done
- **Depends on:** T1, D-06-a, D-06-b, D-06-e
- **Files:**
  - `packages/react/src/GateWriter.ts` (*new*, not in the barrel)
  - `packages/react/src/GateRegistry.ts` (rewritten)
  - `packages/react/src/HydrationWarning.ts` (one new default reporter)
  - `packages/react/test/GateRegistry.store.test.ts` (*new*)
- **Steps:**
  1. **Create `GateWriter.ts`.**
     - `"use client"` header, plus a doc comment explaining why it is out of
       the barrel. Cite AGENTS.md §9 and `useGate.ts:12-13`: the write side is
       not a caller's to reach.
     - Move these public types here, unchanged in shape, with their doc
       comments carried over from `GateRegistry.ts:74-123`: `GateKind`,
       `GateRenderState` and `GateInstance`. Amend `GateInstance.id`'s doc to
       say: "React's own `useId`, unless it collided with a live entry in the
       same registry, in which case it is disambiguated (`~n`). Unique within
       one `instances()` snapshot."
     - Add `export interface GateHandle { readonly update: (state: GateRenderState) => void; readonly unregister: () => void }`.
       `update` is a no-op after `unregister` and when the state is
       unchanged. `unregister` is idempotent.
     - Add `export interface GateWriter { readonly register: (instance: GateInstance) => GateHandle }`.
     - Add `const writers = new WeakMap<object, GateWriter>()`, with a doc
       comment citing `HydrationSeed.ts:12-14`. It is keyed on `object` so the
       module imports nothing local and no cycle can form. It is a side table,
       not shared state: it holds no guard and is unreachable from outside the
       package.
     - Add `export const bindGateWriter = (registry: object, writer: GateWriter): void`.
     - Add `export const gateWriterFor = (registry: object): GateWriter | undefined`.
       It returns `undefined` for a registry this package did not build, the
       same rule `hydrationSeedFor` applies.
     - Add `export const useGateRegistration = (writer: GateWriter | undefined, identity: GateIdentity, state: GateRenderState): void`
       (see T5 for the body). `GateIdentity` is
       `{ id; kind; atom: object; wraps: boolean; policy; resource; marker: RefObject<HTMLSpanElement | null> }`.
  2. **Rewrite `GateRegistry.ts`.**
     - Doc comment: replace `:44-59` ("One process, every root") with "One
       registry per atom set (ADR-QD-NEXT)". Keep the ordering section
       (`:28-42`) and the synchronous-mutation section (`:61-70`), re-worded
       for handles.
     - `export type { GateInstance, GateKind, GateRenderState } from "./GateWriter.ts";`
     - `export interface GateRegistry { readonly instances: () => ReadonlyArray<GateInstance>; readonly subscribe: (listener: () => void) => () => void }`.
       Document that both are plain functions with stable identity, safe to
       pass straight to `useSyncExternalStore`.
     - `export interface GateRegistryOptions { readonly onIdCollision?: (id: string) => void }`.
     - `export const makeGateRegistry = (options?: GateRegistryOptions): GateRegistry`.
       All of today's module state moves inside this closure: `entries:
       Map<string, GateInstance>`, `listeners`, `snapshot`, `stale`, plus
       `collisions: number` for `~n` and `reported: Set<string>` so each id is
       reported once. Copy `changed()` (`:155-171`) with its per-listener
       `try/catch` and comment. `register` works like this:
       1. Pick `key = entries.has(instance.id) ? \`${instance.id}~${++collisions}\` : instance.id`.
          If it collided, call `options?.onIdCollision?.(instance.id)` the
          first time for that id.
       2. Run `entries.set(key, { ...instance, id: key })`, then `changed()`.
       3. Return a handle that closes over `key` and a local `live` boolean.
          `update` replaces `entries.get(key)` with `{ ...existing, state }`
          only while `live` and the state differs. `unregister` sets
          `live = false` and deletes `key` once.
       Finally, `bindGateWriter(registry, { register })` and return the
       read-only `registry` object.
     - Delete the module-level `instances`, `listeners`, `owners`,
       `snapshot`, `stale`, `changed`, `gateInstances`, `subscribeGates`,
       `registerGate`, `updateGateState` and `clearGatesUnsafe`. The `owners`
       doc comment's lesson (`:128-142`) moves to the handle's doc comment:
       the handle *is* the per-registration token.
  3. **Extend `HydrationWarning.ts`.** Add
     `export const gateIdCollisionReporter = (custom?: (id: string) => void): ((id: string) => void) | undefined`.
     It mirrors `hydrationMismatchReporter`: the custom reporter wins;
     otherwise a dev-only `console.warn` naming the id, explaining that two
     React roots minted it, and naming `identifierPrefix`; otherwise
     `undefined`. The file stays the single confinement point (ADR-QD-041).
     It is out of the barrel already, and its new export is internal.
  4. **Create `GateRegistry.store.test.ts`.** It is headless: no React, no
     DOM, and no `afterEach` reset because every test builds its own
     registry. Port the store contract from
     `GateRegistry.test.tsx:333-457`:
     - same snapshot reference until a change, and a new reference after one;
     - subscribe and unsubscribe;
     - a listener that throws does not stop the fan-out;
     - every interleaving test, rewritten on handles:
       - update after unregister is a no-op;
       - unregister still evicts after an update replaced the stored object;
       - re-registering the same id after an unregister resurrects it
         cleanly;
       - of two updates, the last wins;
       - a stale handle's unregister after a newer same-id registration does
         not evict the newer one, which is now the collision path: both
         listed, the newer under `~1`, then only the newer.

     Add:
     - two registries are independent;
     - a colliding id is disambiguated and reported once;
     - `gateWriterFor` returns `undefined` for `{ instances, subscribe }`
       built by hand;
     - an `it.prop` property test from `@effect/vitest`, using `Schema`
       arbitraries for a random sequence of `register`, `update` and
       `unregister` operations over at most 3 ids and 4 handles. Assert that
       `instances()` always equals a reference model (an ordered list of live
       handles with their last state) and that its ids are pairwise distinct.
- **Tests:** `GateRegistry.store.test.ts` (*new*). T1's tests are still red;
  the old render tests are re-pointed in T5.
- **Verify:**
  - `npx vitest run --project react packages/react/test/GateRegistry.store.test.ts`
  - `pnpm circular`
  - `npx tsc -p packages/react/tsconfig.json --noEmit` (or `pnpm typecheck`)
- **Done when:** the store tests pass headless (criterion 7's `rg` prints
  nothing), and `rg -n "^(const|let) " packages/react/src/GateRegistry.ts`
  prints nothing.

### T3 — Give every atom set its own registry

- **Status:** [x] done
- **Depends on:** T2, D-06-a
- **Files:** `packages/react/src/QadiAtoms.ts`
- **Steps:**
  1. Import `makeGateRegistry` and the `GateRegistry` type from
     `./GateRegistry.ts`, and `gateIdCollisionReporter` from
     `./HydrationWarning.ts` (already imported for its siblings, at `:35`).
  2. Add `readonly gates: GateRegistry;` to the `QadiAtoms` interface,
     directly after `asked`.

     Its doc comment says this is the "asking" half of the panel, owned by the
     same atom set as `asked()` so the two share one scope. Every
     instrumented `QadiProvider` over this atom set writes here unless handed
     its own `gates`. Read it with `instances()` and `subscribe()`, or with
     `useGateInstances()` inside a provider.
  3. Rewrite `asked`'s JSDoc (`:112-144`). Keep the keyed-by-question
     rationale (`:105-111`) and the bounded-eviction paragraph (`:150-156`).
     Replace the three "recorded separately / correction / DA-03 / missing
     consumer" paragraphs with one paragraph: "What is **asking** is
     `gates`, beside this (ADR-QD-NEXT, superseding the module-scope registry
     of ADR-QD-053). The devtools panel joins the two structurally, with
     `Equal.equals`, because `@qadi/devtools` does not depend on this
     package." This also removes the stale "missing consumer" claim noted in
     §1.
  4. Add `readonly onGateIdCollision?: (id: string) => void` to
     `QadiAtomsOptions` (`:278-301`), documented like `onHydrationMismatch`.
  5. In `makeQadiAtoms`, build
     `const gates = makeGateRegistry({ onIdCollision: gateIdCollisionReporter(options?.onGateIdCollision) })`
     and add `gates` to the `atoms` literal (`:616-627`). Write the field as
     `...(reporter === undefined ? {} : { onIdCollision: reporter })`, the
     house pattern for optional fields under `exactOptionalPropertyTypes`
     (see `QadiAtoms.ts:401-402`).
- **Tests:** none in `QadiAtoms.test.ts`, which stays byte-identical
  (criterion 5). Coverage comes from T5's render tests and T2's store tests.
- **Verify:** `pnpm typecheck` and
  `npx vitest run --project react packages/react/test/QadiAtoms.test.ts`.
- **Done when:** `makeQadiAtoms(EvaluationServicesNone).gates.instances()`
  returns `[]`, two calls return distinct registries, and `QadiAtoms.test.ts`
  is unchanged and green.

### T4 — Let the provider choose the registry its guards write to

- **Status:** [x] done
- **Depends on:** T3, D-06-a
- **Files:** `packages/react/src/QadiProvider.tsx`
- **Steps:**
  1. Add `readonly gates: GateRegistry;` to `QadiContextValue` (`:42-54`).
     Document it as the registry this subtree's guards write to: the
     provider's `gates` prop if given, else `atoms.gates`.
  2. Add `readonly gates?: GateRegistry;` to `QadiProviderProps`, after
     `instrument`. Its doc covers:
     - the override use case: one registry for several atom sets, in a
       micro-frontend shell or a multi-tenant debug page;
     - that `atoms.asked()` and this registry are then no longer co-located,
       so the host owns that join;
     - that the registry must come from `makeGateRegistry()`, because a
       hand-built object cannot be written to and guards will not register.
  3. In the body:
     - destructure `gates: gatesProp`;
     - `const gates = gatesProp ?? atoms.gates;`
     - add `gates` to the memoised context `value` and its dependency list
       (`:321-324`).
  4. Add a dev-only effect that warns once when `instrument` is on but
     `gateWriterFor(gates) === undefined`. Model it on the existing
     atoms-identity warning (`:243-256`), with the message "`gates` was not
     built by makeGateRegistry(); guards under this provider will not
     register." `gateWriterFor` is imported from `./GateWriter.ts`, which is
     internal, so the barrel does not grow.
  5. Do **not** wrap children in any new element or context. The context
     value change is the only tree change, so off-means-absent holds.
- **Tests:** covered by T5 (override routing) and T6 (hook).
  `QadiProvider.test.tsx` stays byte-identical.
- **Verify:** `pnpm typecheck` and
  `npx vitest run --project react packages/react/test/QadiProvider.test.tsx`.
- **Done when:** the context carries the effective registry and the existing
  provider tests are green and unchanged.

### T5 — Point `useGate` at the scoped registry and migrate its render tests

- **Status:** [x] done
- **Depends on:** T2, T4, D-06-e
- **Files:**
  - `packages/react/src/useGate.ts`
  - `packages/react/src/GateWriter.ts` (body of `useGateRegistration`)
  - `packages/react/test/GateRegistry.test.tsx`
  - `packages/react/test/GateWriter.test.tsx` (*new*)
- **Steps:**
  1. **Implement `useGateRegistration` in `GateWriter.ts`.** It takes over
     `useGate.ts:77-128` without changing behaviour:
     - It keeps `policyRef` and `resourceRef` with their comment, and adds a
       `handle` ref.
     - **Effect 1, identity.** Deps are
       `[writer, identity.id, identity.kind, identity.atom, identity.wraps]`.
       If `writer === undefined` it returns. Otherwise it registers
       `{ id, kind, policy: policyRef.current, resource: resourceRef.current, state, element: wraps ? (marker.current ?? undefined) : undefined }`
       and stores the returned handle in `handle.current`. Cleanup calls
       `registered.unregister()` and clears `handle.current` only if it is
       still `registered`.
     - **Effect 2, state.** Deps are `[writer, state]`. It calls
       `handle.current?.update(state)`.
     - Keep the existing comment explaining why `state` is excluded from
       effect 1's deps.
  2. **Rewrite `useGate`.**
     - Destructure `const { atoms, instrument, gates } = useQadiContext(kind)`.
     - `const writer = useMemo(() => (instrument ? gateWriterFor(gates) : undefined), [instrument, gates])`.
     - Keep `id = useId()` raw. It is hydration-stable and is what
       `data-qadi-gate` renders (D-06-e).
     - Replace both effects with
       `useGateRegistration(writer, { id, kind, atom, wraps, policy, resource, marker }, state)`.
     - Return `ref: writer !== undefined && wraps ? marker : undefined`.
     - Update the header doc: registration now goes through the provider's
       registry; the "Out of the barrel" paragraph stays.
  3. **Migrate `GateRegistry.test.tsx`.**
     - `mount` returns `{ view, atoms }`, built per call.
     - Replace every `gateInstances()` with `atoms.gates.instances()` and
       every `subscribeGates` with `atoms.gates.subscribe`.
     - Delete the `afterEach` `clearGatesUnsafe()`. Keep the
       `document.body.innerHTML = ""` reset.
     - Delete the "store contract" and "interleaving" describes
       (`:333-457`). They now live headless in T2's file: replace, don't
       layer.
     - Keep one render-level contract test: a subscribed host is notified on
       mount and not after unsubscribing.
     - Flip T1's two `it.fails` to `it`, re-pointed to the scoped registry.
       For (a): one shared atom set over both hydrated roots; assert two
       entries with distinct ids, one `Allowed` and one `Denied`; assert the
       `onGateIdCollision` spy was called once with `"_R_0_"`; unmount one
       root and assert one entry remains. For (b): assert
       `tenantA.gates.instances()` is the `doc:read` guard only and
       `tenantB.gates.instances()` is the `admin` guard only.
     - Add "the `gates` prop routes registration": the registry built by
       `makeGateRegistry()` lists the guard and `atoms.gates.instances()`
       stays empty.
     - Add "a hand-built `gates` object registers nothing and renders no
       marker": no `[data-qadi-gate]`, so off-means-absent extends to a
       foreign registry.
     - Add "StrictMode registers once": wrap in `<StrictMode>`, assert length
       1 after mount and 0 after unmount.
     - Keep `data-qadi-gate === instances()[0].id` (`:300`). It holds in every
       non-colliding case.
  4. **Create `GateWriter.test.tsx`.** It drives `useGateRegistration`
     through `renderHook` against a bare `makeGateRegistry()`, with **no**
     provider. This is the narrower test surface claim 4 asked for. Cover:
     - registers on mount;
     - a `state` change updates in place, with one notification and the same
       id;
     - an equal-but-fresh `policy` with the same `atom` does not re-register
       (ticket 141's property, now provable without `<Can>`);
     - an `atom` change re-registers;
     - `writer` going `undefined` unregisters;
     - unmount unregisters.
- **Tests:** as above. T1's reproductions go green.
- **Verify:**
  `npx vitest run --project react packages/react/test/GateRegistry.test.tsx packages/react/test/GateWriter.test.tsx packages/react/test/GateRegistry.store.test.ts`,
  then the whole react project with `npx vitest run --project react`.
- **Done when:** the react project is green; criteria 2 and 3 hold; criterion
  5's react files have no diff.

### T6 — Add `useGateInstances()` for hosts inside the provider

- **Status:** [x] done
- **Depends on:** T4, D-06-d
- **Files:** `packages/react/src/hooks.ts`, `packages/react/test/GateRegistry.test.tsx`
- **Steps:**
  1. In `hooks.ts`, add
     `export const useGateInstances = (): ReadonlyArray<GateInstance> => { const { gates } = useQadiContext("useGateInstances"); return useSyncExternalStore(gates.subscribe, gates.instances, gates.instances); };`
     The third argument is the server snapshot. During SSR no effect runs, so
     it is `[]`, which is correct.
  2. Doc comment:
     - this is the host-side adapter ADR-QD-053 sanctions;
     - it holds instances, never a decision (§13);
     - it re-renders only its caller, never a guard;
     - it reads the effective registry, so it honours a `gates` override;
     - use `atoms.gates` directly from outside the provider.
  3. Import `useSyncExternalStore` from `react` and the `GateInstance` type
     from `./GateRegistry.ts`.
- **Tests:** in `GateRegistry.test.tsx`, add describe "useGateInstances":
  - a probe inside an instrumented provider renders the count, and re-renders
    on a guard mount and unmount;
  - it returns the same array reference across a rerender with no change;
  - outside a provider it throws `MissingQadiProviderError`;
  - with a `gates` override it lists the override's guards.
- **Verify:** `npx vitest run --project react packages/react/test/GateRegistry.test.tsx`
- **Done when:** the four tests pass and `hooks.test.tsx` is unchanged.

### T7 — Remove the global exports, with no shim

- **Status:** [x] done
- **Depends on:** T5, T6, D-06-b, D-06-c
- **Files:** `packages/react/src/GateRegistry.ts` (confirm), `spec/overview.md`
- **Steps:**
  1. Confirm the barrel (`packages/react/src/index.ts:1`) now publishes
     exactly:
     - from `GateRegistry.ts`: `GateRegistry`, `GateRegistryOptions`,
       `makeGateRegistry`, and the re-exported types `GateInstance`,
       `GateKind` and `GateRenderState`;
     - from `hooks.ts`: `useGateInstances`.
     `GateWriter.ts` is not in the barrel.
  2. Rewrite `spec/overview.md:404-405`:
     - `| \`makeGateRegistry\` | function | \`GateRegistry.ts\` |`
     - `| \`GateRegistry\`, \`GateRegistryOptions\` | type | \`GateRegistry.ts\` |`
     - `| \`GateInstance\`, \`GateKind\`, \`GateRenderState\` | type, re-exported from \`./GateWriter.ts\` | \`GateRegistry.ts\` |`
     - add `useGateInstances` to the `usePolicies, useProjected, useInvalidate` hook row (`:401`).
     - Under the table, add one sentence: "`atoms.gates` is the registry an
       atom set's guards write to (ADR-QD-NEXT)."
  3. Run the grep from criterion 6.
- **Tests:** none new.
- **Verify:** `node scripts/check-api-surface.mjs` and
  `rg -n "gateInstances|subscribeGates|clearGatesUnsafe|registerGate|updateGateState" packages/*/src`.
- **Done when:** gate 13 passes and the grep prints only explanatory
  doc-comment text, if any.

### T8 — Migrate the host, the acceptance suite and the devtools wording

- **Status:** [x] done
- **Depends on:** T7, D-06-d
- **Files:**
  - `examples/nextjs-newsroom/src/client/Dock.tsx`
  - `features/features/gate-instances/gate-instances.steps.test.ts`
  - `features/features/gate-instances/gate-instances.feature`
  - `packages/devtools/src/react/QuestionsPanel.tsx`
  - `packages/devtools/src/react/DevtoolsDock.tsx`
  - `packages/devtools/src/model/Gates.ts` (doc comment only)
  - `packages/devtools/test/react/QuestionsPanel.gates.test.tsx`
- **Steps:**
  1. **`Dock.tsx`.**
     - Change the import at `:33` to
       `import { useGateInstances, useInvalidate, useSubject } from "@qadi/react";`.
     - Replace `:127` with `const gates = useGateInstances();`.
     - Keep `useSyncExternalStore` in the `react` import for
       `subscribeMismatches` (`:128-132`).
     - Add a comment: the guards come from the provider's registry, the same
       one `atoms.asked()` at `:156` belongs to.
  2. **The steps file.**
     - Remove `clearGatesUnsafe` and `gateInstances` from the dynamic import
       (`:42-44`).
     - Add `atoms: QadiAtoms | undefined` to `GateInstancesWorldState` and
       import the `QadiAtoms` type.
     - `draw` builds `const built = atoms()`, passes it, and patches
       `{ view: rendered, atoms: built }`.
     - `instances` reads `(yield* readState()).atoms?.gates.instances() ?? []`,
       so it becomes an `Effect.fn` and every `Then` step `yield*`s it.
     - Drop `clearGatesUnsafe()` from `Before` (`:144`).
     - Rewrite the header note (`:13-17`): the registry under test is the
       scenario's own atom set, which now lives in World state.
  3. **`gate-instances.feature`.** Add a scenario under the existing
     `@gate-instances @REQ-QD-029` tag:
     ```
     Scenario: Two atom sets do not see each other's guards
       Given a page with 1 guard on "doc:read"
       And a second page, under its own atom set, with 1 guard on "admin"
       When both pages render with instrumentation
       Then the first atom set lists 1 guard on "doc:read"
       And the second atom set lists 1 guard on "admin"
     ```
     Implement the new steps in the steps file, with a second atoms handle
     in World state.
  4. **Devtools wording only, no logic.**
     - In `QuestionsPanel.tsx:114`, make the text: "No live guards were
       handed to the dock. Pass gates — usually useGateInstances(), or
       atoms.gates.instances() — to list who is asking."
     - Update the JSDoc at `QuestionsPanel.tsx:14-15` and `:67`,
       `DevtoolsDock.tsx:96-104`, and `Gates.ts:31-33` to say "usually
       `useGateInstances()` or `atoms.gates.instances()` from
       `@qadi/react`".
     - In `QuestionsPanel.gates.test.tsx:46`, assert the substring
       `"useGateInstances()"`.
- **Tests:** the BDD suite with the new scenario, and the devtools panel test.
- **Verify:**
  - `pnpm --filter @qadi/features test`
  - `npx vitest run --project devtools packages/devtools/test/react/QuestionsPanel.gates.test.tsx`
  - `pnpm --filter @qadi/example-nextjs check` (gate 15, runs the e2e suite
    including `lens.spec.ts`)
  - `rg -n "@qadi/react" packages/devtools/package.json` must print nothing.
- **Done when:** all three suites are green, `lens.spec.ts` is unmodified
  (`git diff --stat main -- examples/nextjs-newsroom/e2e` is empty), and
  criterion 8 holds.

### T9 — Amend the spec: ADR, behaviour, invariant, traceability and screens

- **Status:** [x] done
- **Depends on:** T5, T6, T7
- **Files:**
  - `spec/decisions/NNN-a-gate-registry-belongs-to-its-atom-set.md` (*new*,
    ADR-QD-NEXT)
  - `spec/decisions/053-a-gate-can-be-found.md`
  - `spec/decisions/index.yaml`
  - `spec/behaviors/28-devtools-screens.md`
  - `spec/behaviors/25-inspection.md`
  - `spec/devtools-spec/02-screens.md`
  - `spec/invariants.md`
  - `spec/traceability.md`
  - `spec/README.md`
  - `spec/appendices/react-integration.md`
- **Steps:**
  1. **ADR-QD-NEXT, "A gate registry belongs to its atom set".** Outline:
     - **Context:**
       - ADR-QD-053 chose a module-scope `Map`;
       - the defects §1 demonstrated: a hydrated-root collision drops a
         mounted guard; cross-tenant visibility; the asked/asking scope
         mismatch; `clearGatesUnsafe` coupling every test to process state;
         a public write side contradicting `useGate`'s "kind is not a
         caller's to choose".
     - **Decision:**
       - `makeGateRegistry()` builds a value; each `QadiAtoms` owns one as
         `gates`;
       - `QadiProvider` may be handed another;
       - the write side is a handle, reachable only through an internal side
         table (the `HydrationSeed.ts` precedent);
       - ids are unique per snapshot through collision disambiguation, with
         `data-qadi-gate` staying the raw, hydration-stable `useId`;
       - hosts read through `instances`/`subscribe` or `useGateInstances()`.
     - **Consequences:**
       - breaking, with no shim, and why (D-06-c);
       - both §13 rules still hold, checked by the unchanged test files in
         criterion 5;
       - `@qadi/devtools` is still independent.
     - **Alternatives considered:** the four D-06-a options, the shims from
       D-06-c, and the counter prefix from D-06-e with its hydration reason.
     - Status: "Accepted — amends ADR-QD-053".
  2. **ADR-QD-053.** Bump the revision to 1.1 and add a Change History row
     citing CCR-QD-NEXT. Under `### The registry` (`:49-54`), add
     `> **Amended by ADR-QD-NEXT.** The registry is no longer module-scope: …`
     and leave the original sentence in place, so history is preserved.
     Under the host-subscription correction (`:139-147`), add a dated
     correction: the host call is now `useGateInstances()` or
     `useSyncExternalStore(atoms.gates.subscribe, …)`.
  3. **`index.yaml`.** Add the new ADR entry. Set ADR-QD-053's status to
     `"Accepted — amended by ADR-QD-NEXT"`.
  4. **BEH-QD-233** (`28-devtools-screens.md:322-373`).
     - Replace the ` ```ts ` listing at `:326-329` with the new signatures:
       `makeGateRegistry`, `GateRegistry`, `QadiAtoms.gates`,
       `useGateInstances` and the `QadiProviderProps.gates` prop.
     - Add three REQUIREMENT blocks:
       - "A guard MUST be listed only by the registry its provider writes
         to; two atom sets MUST NOT see each other's guards."
       - "Two live registrations MUST NOT overwrite each other; ids in one
         snapshot MUST be distinct."
       - "A registry not built by `makeGateRegistry` MUST receive no
         registration, and its guards MUST render no marker."
     - Under BEH-QD-217's correction (`:271-282`), add a dated blockquote
       with the new host call.
  5. **Two prose updates.** At `25-inspection.md:352-363` and
     `devtools-spec/02-screens.md:331`, add a `>` correction or reword
     "module-scope map" and `gateInstances()`. Gate 12 needs no new
     claims-of-absence row, because nothing is newly declared absent; confirm
     with the script.
  6. **INV-QD-046.**
     - Update **Source** to `useGate.ts`, `GateWriter.ts` and
       `components.tsx`.
     - Extend **Implication** so off-means-absent includes a foreign `gates`
       registry.
     - Update **Enforcement** to name the test files and say these files pass
       byte-identical: the list in criterion 5.
     - Bump the Change History.
  7. **New invariant `INV-QD-NEXT`, "A guard is listed only by the registry its provider writes to".**
     - Source: `GateRegistry.ts` and `GateWriter.ts`.
     - Enforcement: `GateRegistry.store.test.ts` (the property test),
       `GateRegistry.test.tsx` "scoped to its atom set" and the hydrated-roots
       test, and the new BDD scenario.
     - Related: BEH-QD-233 and ADR-QD-NEXT.
  8. **`traceability.md`.**
     - BEH-28's file list (`:70`) gains `packages/react/src/GateWriter.ts`.
     - Add test rows for `GateRegistry.store.test.ts` and
       `GateWriter.test.tsx`, both mapping to BEH-QD-233, INV-QD-NEXT and
       ADR-QD-NEXT.
     - Extend the `GateRegistry.test.tsx` row (`:275`) with INV-QD-NEXT.
     - Add an INV-QD-NEXT row and an ADR-QD-NEXT row.
     - Bump the Change History.
  9. **`spec/README.md`.** Add a CCR-QD-NEXT row to the history register
     naming every artefact above.
  10. **`spec/appendices/react-integration.md`.** Add one runnable
      ` ```typescript ` example (gate 9 compiles it) showing
      `makeQadiAtoms(layer).gates.instances()` and
      `<QadiProvider atoms={atoms} subject={s} instrument>`. Follow the
      imports of the appendix's existing blocks at `:96` and `:132`.
- **Tests:** the spec gates themselves.
- **Verify:**
  - `bash spec/scripts/verify-traceability.sh --strict` (gate 10)
  - `node scripts/check-doc-examples.mjs` (gate 9)
  - `node scripts/check-devtools-claims.mjs` (gate 12)
  - `node scripts/check-api-surface.mjs` (gate 13)
  - `node scripts/check-dod-table.mjs` (gate 11; no gate is added, so the
    table is unchanged)
- **Done when:** all five scripts pass and every placeholder appears exactly
  where listed: `rg -n "ADR-QD-NEXT|CCR-QD-NEXT|INV-QD-NEXT" spec`. Numbers
  are assigned when the work lands.

### T10 — Update AGENTS.md §13 and record the changeset

- **Status:** [x] done
- **Depends on:** T9
- **Files:**
  - `AGENTS.md` (§13, lines ~604-630)
  - `.changeset/gate-registry-belongs-to-its-atom-set.md` (*new*)
  - `packages/react/README.md` (only if it documents instrumentation; it does
    not today, so add nothing unless asked)
- **Steps:**
  1. **AGENTS.md §13, "A guard may record that it exists" bullet.**
     - Replace "`GateRegistry.ts` is a module-scope map a guard writes to from
       an effect" with "each atom set's `gates` registry (`makeGateRegistry`,
       ADR-QD-NEXT), which a guard writes to from an effect through a handle
       only `@qadi/react` can reach."
     - In the host paragraph (`:621-630`), change the example call to
       `useGateInstances()` or `useSyncExternalStore(atoms.gates.subscribe,
       atoms.gates.instances, atoms.gates.instances)`.
     - Keep the history-preserving style: the old wording goes into a
       `> **Corrected in CCR-QD-NEXT.**` note rather than being deleted
       silently, matching how §13 already records CCR-QD-150.
  2. **Changeset.**
     ```
     ---
     "@qadi/react": minor
     "@qadi/devtools": patch
     ---
     ```
     The body:
     - opens with **Breaking:** the gate registry is owned by the atom set;
     - lists the removed exports and their replacements;
     - names the `QadiAtoms.gates` field addition, which breaks hand-written
       `QadiAtoms` doubles;
     - notes the fix for hydrated roots dropping a mounted guard;
     - ends with a migration snippet:
       - `useSyncExternalStore(subscribeGates, gateInstances, gateInstances)`
         becomes `useGateInstances()` inside the provider, or
         `useSyncExternalStore(atoms.gates.subscribe, atoms.gates.instances, atoms.gates.instances)`
         outside it;
       - `clearGatesUnsafe()` in tests becomes "build a fresh atom set per
         test".
     The `fixed` group bumps every package together, as intended.
- **Tests:** none.
- **Verify:** `pnpm changeset status` lists the new changeset, and
  `rg -n "module-scope map" AGENTS.md` prints only inside the correction
  note.
- **Done when:** AGENTS.md and the changeset describe the shipped interface
  exactly.

### T11 — Run the full merge gate

- **Status:** [x] done
- **Depends on:** T1–T10
- **Files:** —
- **Steps:**
  1. Run `pnpm check`.
  2. If coverage fails for `packages/react/src/**` (90% floor), add store or
     hook cases to `GateRegistry.store.test.ts` or `GateWriter.test.tsx`.
     Never add them to the files criterion 5 freezes.
  3. Re-run criterion 5's
     `git diff --stat main -- <the ten files>`, criteria 1 and 6's `rg`
     commands, and criterion 8's dependency check.
- **Tests:** everything.
- **Verify:** `pnpm check` exits 0.
- **Done when:** every success criterion in §2 is observably true, and the
  §10 log records it.

## 7. Test strategy

**Unchanged, as evidence for off-means-absent.** These files have zero diff
against `main` and must pass:
- `hooks.test.tsx`
- `edges.test.tsx`
- `ServerRender.test.tsx`
- `QadiAtoms.test.ts`
- `QadiProvider.test.tsx`
- `Hydration.test.ts`
- `HydrationCounts.test.ts`
- `v4-reactivity-smoke.test.ts`
- `packages/devtools/test/react/Lens.test.ts`
- `packages/devtools/test/model/Gates.test.ts`
- `examples/nextjs-newsroom/e2e/lens.spec.ts`

Every devtools test except the one string assertion also stays unchanged.

**Moved to the new interface.** In `GateRegistry.test.tsx`'s render tests,
reads go through a per-test atom set and the `afterEach` reset is deleted. The
assertions themselves are unchanged in meaning:
- uninstrumented registers nothing and renders no wrapper;
- every surface registers once under its own kind;
- `Rechecking` is distinct;
- the marker is `display: contents` and its `data-qadi-gate` equals the id;
- hooks are unlocatable;
- an equal-but-fresh policy does not re-register.

The BDD steps read the scenario's own atom set from World state.

**Replaced, not layered.** The "store contract" and "interleaving" describes
(`GateRegistry.test.tsx:333-457`) are deleted from the render file and rebuilt
headless in `GateRegistry.store.test.ts` against handles. The one stale-cleanup
scenario that described a hypothetical same-id race becomes the
collision-disambiguation test, because under handles that race *is* a
collision.

**New.**
- Headless store tests, including an `it.prop` **property** test. Random
  `register`, `update` and `unregister` sequences are checked against a
  reference model. That model is the **differential** oracle: snapshot equals
  model, and ids are pairwise distinct.
- `useGateRegistration` driven by `renderHook` with no provider.
- Isolation between atom sets.
- The hydrated two-root reproduction, red in T1 and green in T5.
- The `gates` prop override and a foreign registry.
- StrictMode registering once.
- `useGateInstances`.
- One BDD scenario.

**Mutation.** `@qadi/react` has no Stryker gate. Gate 17 mutates
`packages/devtools/src/model/**`, where only comments change here, so its
score cannot move. The property test is the substitute for mutation coverage
on the store: it is what would catch a flipped `live` check or an
off-by-one in the collision counter.

**Coverage.** The 90% per-package floor for `packages/react/src/**` applies.
`GateWriter.ts` and the rewritten `GateRegistry.ts` are covered by the
headless and `renderHook` files.

## 8. Spec and documentation updates

| Artefact | Change | Task |
| -------- | ------ | ---- |
| ADR-QD-NEXT (*new*) | "A gate registry belongs to its atom set" — outline in T9 step 1 | T9 |
| `spec/decisions/053-a-gate-can-be-found.md` | rev 1.1; `> Amended by ADR-QD-NEXT` under "The registry" and under the host-subscription correction | T9 |
| `spec/decisions/index.yaml` | new entry; ADR-QD-053 status "Accepted — amended by ADR-QD-NEXT" | T9 |
| BEH-QD-233 / BEH-QD-217 (`spec/behaviors/28-devtools-screens.md`) | new signature listing; three REQUIREMENTs; dated host-call correction | T9 |
| `spec/behaviors/25-inspection.md:352-363`, `spec/devtools-spec/02-screens.md:331` | "module-scope map" and `gateInstances()` corrected | T9 |
| INV-QD-046 | Source, Implication and Enforcement updated; Change History | T9 |
| INV-QD-NEXT (*new*) | a guard is listed only by its provider's registry | T9 |
| `spec/traceability.md` | new test-file rows, INV and ADR rows, BEH-28 file list; Change History | T9 |
| `spec/overview.md` (gate 13) | `@qadi/react` rows 401, 404 and 405 rewritten | T7 |
| `spec/README.md` | CCR-QD-NEXT history row | T9 |
| `spec/appendices/react-integration.md` | one runnable `typescript` example (gate 9) | T9 |
| AGENTS.md §13 | registry wording and host call; `> Corrected in CCR-QD-NEXT` note | T10 |
| `.changeset/*.md` | `@qadi/react` minor (Breaking), `@qadi/devtools` patch, migration snippet | T10 |
| Package CHANGELOGs | generated by `changeset version` at release; not hand-edited | — |

## 9. Risks and rollback

- **SSR hydration mismatch on `data-qadi-gate`.** This risk is why D-06-e
  rejects prefixes. If any change makes the marker attribute differ between
  server and client, React keeps the server value and the
  attribute-equals-id test breaks on SSR. Watch the example's e2e
  `lens.spec.ts` (gate 15) and `ServerRender.test.tsx`. If it slips in, keep
  `data-qadi-gate = useId()` raw; only the store may rewrite ids, and only on
  a collision.
- **StrictMode double effects.** Effects run mount, then cleanup, then mount.
  With handles, the first handle is unregistered before the second
  registers, so there is no collision and no `~n`. T5's StrictMode test pins
  this. If React ever ran the second mount before the first cleanup, the
  result would be a transient `~1` id and a dev warning, not a lost guard.
- **A host passes a hand-built `{ instances, subscribe }` as `gates`.**
  Guards then silently do not register. Mitigations: a dev warning (T4 step
  4), a test (T5), and doc on the prop. It is a runtime check because the
  interface is structural; a nominal brand was considered and rejected as
  heavier than the `HydrationSeed` precedent.
- **The memo on `writer` in `useGate`.** If `gates` identity churns because
  a host builds `makeGateRegistry()` inline in render, every guard
  re-registers on every provider render. Document on the prop: "build once,
  at module scope, like `makeQadiAtoms`". The dev warning for `atoms`
  identity churn (`QadiProvider.tsx:243-256`) can be extended to `gates` in
  the same effect.
- **Coverage dip in `packages/react`.** The T11 step handles it. Do not pad
  the frozen files.
- **The BDD suite's `isolate: false`** (`gate-instances.steps.test.ts:149-152`)
  shares module scope across feature files. That gets *safer*, because no
  module-level gate state remains. Nothing to do.
- **Rollback.** The change is one PR, one changeset, and no data migration.
  Revert the PR. Because D-06-c ships no shim, a partial rollback that
  restores the global without reverting the example and the steps will not
  compile. That is intended: revert the whole PR.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-04 | — | Plan written; evidence re-verified at `1caf04c`. Claim 1 confirmed by scratch test and a hydrated-root collision defect found; claim 4 refuted for the store, confirmed for `useGate`. Status `needs-decision` on D-06-a…e | Claude (plan agent) |
| 2026-10-04 | §5 | D-06-a..e all taken at the plan-recommended option (2 + opt-in 3; remove all five; no shim; pair + useGateInstances; handle + collision disambiguation), recorded as `decided (2026-10-04, recommended default)` | Claude (executor) |
| 2026-10-04 | T1 | Two `it.fails` reproductions committed in GateRegistry.test.tsx; suite 31 passed, 2 expected fail. Branch worktree-agent-a9caae1ba93a77470 (merged ARCH-05 branch first) | Claude (executor) |
| 2026-10-04 | T2 | GateWriter.ts (new, not in barrel) + rewritten GateRegistry.ts (makeGateRegistry, handles, collision disambiguation) + gateIdCollisionReporter in HydrationWarning.ts + headless GateRegistry.store.test.ts (18 tests, FastCheck model property in place of it.prop). No module-level `const/let` in GateRegistry.ts | Claude (executor) |
| 2026-10-04 | T3, T4 | `atoms.gates`, `onGateIdCollision`, provider `gates` prop, context `gates`, dev warning for a hand-built registry | Claude (executor) |
| 2026-10-04 | T5, T6 | useGate -> useGateRegistration; GateRegistry.test.tsx migrated (T1 repros flipped; hydrated-roots collision reports `_R_0_` once); GateWriter.test.tsx (renderHook, no provider); `useGateInstances`. react project 260/260 | Claude (executor) |
| 2026-10-04 | T7, T8 | overview.md rows; Dock.tsx uses useGateInstances; BDD steps read atoms from World, new two-atom-set scenario (features 473/473); devtools wording (737/737). typecheck, lint, circular clean | Claude (executor) |
| 2026-10-04 | T9, T10 | ADR-QD-080 (placeholder ADR-QD-NEXT), CCR-QD-160, INV-QD-064 written with deliberate gaps; renumber at merge (ARCH-05 holds ADR-QD-077/CCR-QD-153). ADR-053 rev 1.1, BEH-QD-233/217, 25-inspection, devtools-spec, INV-046, traceability 1.73, README, appendix example, AGENTS.md §13 (Corrected in CCR-QD-160), changeset gate-registry-belongs-to-its-atom-set.md | Claude (executor) |
| 2026-10-04 | T11 | typecheck, lint, circular, tstyche, coverage (react 99.36% stmts), features 473/473, spec:examples/verify:strict/gates/claims/api/package/website-examples/publish all pass, `pnpm example` e2e 26/26 incl. lens.spec.ts. Frozen test files identical to the ARCH-05 branch. Full `pnpm mutation` not completed: core stage exceeded a 10 min tool limit and the devtools stage a further 10 min (no survivors-by-this-change evidence; devtools model changed in comments only, react has no Stryker gate) | Claude (executor) |
