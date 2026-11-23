# Phase 73: One pure reconcile for gate registration - Context

**Gathered:** 2026-11-22
**Status:** Ready for planning

<domain>
## Phase Boundary

`@qadi/react` registers every mounted guard (`Can`, `Cannot`, the `use…` hooks) with its atom set's gate registry
while instrumentation is on (ADR-QD-053, ADR-QD-080). Today registration is split across three places that each hold a
piece of one rule. Line numbers are from HEAD (`49b92e64`):

- `packages/react/src/GateWriter.ts` `reconcile(writer, live, wanted, current)` (`:304-334`) registers and
  unregisters, and takes two arrays, `wanted: ReadonlyArray<GateIdentity>` and
  `current: ReadonlyArray<GateCurrent | undefined>`, that must line up by index. It does no update.
- `packages/react/src/useGate.ts` `useGateRegistrations(writer, identities, states)` (`:76-152`) keeps four refs
  (`stableRef` `:90`, `latest` `:102`, `statesRef` `:104`, `registered` `:106`) and three effects:
  - the teardown (`:109`, keyed on `writer`);
  - the identity reconcile (`:124`, keyed on a hand-compared `stable` array);
  - a third effect (`:145`) that diffs state by hand, keyed on `states.join("|")` (`:144`), and calls `handle.update`.
- `useGates` (`:244-302`) passes `Record.values(identities)` and `Record.values(entries).map(…)` (`:297-298`) and
  relies on the two calls returning keys in the same order.
- `buildGateRegistry`'s handle (`GateWriter.ts:217`) has its own equal-state check in `update`
  (`current.state === state`). That is the third place the "did the state change" rule is written.

Tests today: `GateWriter.reconcile.test.ts` (232 lines) covers register and unregister without rendering. The state
half can only be reached by rendering (`GateRegistry.test.tsx`, 727 lines; `GateWriter.test.tsx`, whose `run` helper
calls `useGateRegistrations(writer, [identity], [state])`).

**This phase delivers:**
- `reconcile` takes the wanted registrations keyed by gate id and does register, update and unregister in one step.
  No caller passes arrays that must line up by index, and the "did the state change" rule is written once.
- `useGateRegistrations` keeps only the refs React needs and one registration effect. The `states.join("|")` diff and
  the paired `Record.values` calls are gone.
- The state-update half is tested without rendering, beside `GateWriter.reconcile.test.ts`, and
  `GateRegistry.test.tsx` loses the cases that move.
- ADR-QD-186 extends ADR-QD-140 and ADR-QD-111.

**Behaviour is preserved:** the same registrations, the same ids, and the same number of notifications per
transition. A rendered characterisation written on the phase base proves it.

**Out of scope:**
- AGENTS.md §13, which is unaffected: the registry records that a guard exists and what it renders now, never a
  retained verdict.
- The registry's read side (`instances`, `subscribe`), collision handling and the reporter (Phase 71's work).
- The public surface: `GateWriter.ts` and `useGate.ts` stay out of the barrel, and `check-api-surface` stays at 941.
- `@qadi/devtools`.

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE13-CONTEXT.md`)
- **D1 (scope):** all eight review candidates become phases.
- **D2 (branch):** `arch-wave-13`, with no merge and no release.
- **Order:** strictly serial.
- **Reserved numbers only:** ARCH-120, ADR-QD-186, CCR-QD-465, BEH-QD-701..705, INV-QD-391..392.
- **Never run `node scripts/next-id.mjs`.**

### The reconcile (RECN-02)
All decided autonomously on 2026-11-22, under the owner's instruction "do not ask me; always pick the most complete
and clean solutions… Qadi should be very clean".

- **D-01: The wanted set is a map keyed by gate id, and the id is stated only by its key.**
  - Signature: `reconcile(writer, live: ReadonlyMap<string, Registered>, wanted: ReadonlyMap<string, GateWanted>):
    Map<string, Registered>`.
  - `GateWanted` is `{ readonly identity: GateIdentity; readonly state: GateRenderState }`.
  - `GateIdentity` loses its `id` field: the map key is the id, so a key and an `identity.id` can never disagree, and
    two wanted entries can never share an id (today that was only a stated precondition, "`id`s are unique within a
    call").
  - `sameIdentity` compares what is left: `kind`, `atom`, `wraps`, `marker`.
  - `GateCurrent` is deleted. The identity already carries the committed render's `policy` and `resource`, so there
    is no second, index-aligned array to pass.
  - Rejected: keeping `identity.id` beside the key (two statements of one fact); a `Record<string, …>` (a gate id is
    an arbitrary string, and a `Map` keeps insertion order without key coercion); an array of `GateWanted` (index
    and id order would again be the caller's to keep straight).
- **D-02: One step does all three.**
  - For each live id: when `wanted` holds it with the same identity, the entry is kept and its handle is told the
    wanted state (`handle.update(state)`); otherwise it unregisters.
  - Then each wanted id that was not kept registers, with the identity's `policy`, `resource` and `kind`, the wanted
    `state`, and the marker's element rule unchanged.
  - Unregistering still runs before registering, so a changed identity re-registers under the same id without
    colliding with itself.
  - It returns a new `Map` and never mutates `live`. Its only effects are calls on the writer and handles it is
    given.
- **D-03: The "did the state change" rule is written once, in the registry's handle.**
  - `GateHandle.update` already documents "A no-op after `unregister`, or when unchanged" and owns the entry it
    would rewrite, so it keeps the one equality check.
  - `reconcile` tells every kept handle its wanted state and decides nothing about equality.
  - `Registered` holds no copy of the state, and the hook holds no state diff.
  - Rejected: comparing in `reconcile` against a state copy kept in `Registered`, which is a second copy of the
    registry's own field and a second place for the rule.
- **D-04: "Pure" means what ADR-QD-140 made it mean, and the ADR says so plainly.**
  - `GateWriter.ts` imports nothing from React. `reconcile` is deterministic in its arguments, acts only through the
    writer and handles it is handed, and returns a fresh map.
  - Rejected: a plan/apply split, where a pure `reconcile` returns a closed union of steps and an interpreter applies
    them. To decide between `Update` and nothing, the plan would need the state copy D-03 rejects. To return handles
    for the next map it would need the writer anyway. So it adds a union and an interpreter and removes nothing.

### The hook (RECN-03)
- **D-05: `useGateRegistrations(writer, wanted: ReadonlyMap<string, GateWanted>)`.**
  - Refs: `registered` only. `stableRef`, `latest` and `statesRef` go.
  - The registration effect has **no dependency list**. It runs after every commit and calls
    `registered.current = reconcile(writer, registered.current, wanted)` with the committed render's own `wanted`,
    so no ref is needed to reach "the latest" identities or states.
  - An unchanged identity is kept, and an unchanged state is a handle no-op, so a commit that changed nothing makes
    zero registry calls that notify. That is the same count as today.
  - When `writer` is `undefined` the effect returns at once, so off still means absent.
- **D-06: The teardown stays, as the one lifecycle React offers, and the ADR states why "one effect" means one
  registration effect.**
  - The teardown is keyed on `writer`. Its cleanup unregisters every handle when the hook unmounts or its writer
    changes, and it is declared before the registration effect so its cleanup runs first on a writer change.
  - A single effect cannot both run after every commit without tearing down and also learn that the hook unmounted.
    An effect's cleanup is React's only unmount signal, and it also fires before every re-run.
  - Folding the two into one effect means either re-registering on every commit (the two-notifications-per-transition
    cost ADR-QD-140 removed) or leaking registrations on unmount. Both are rejected.
  - Criterion 3 ("one effect plus the refs React needs") is read as one registration effect plus that teardown and
    the `registered` ref. The roadmap's evidence counts the state-diff effect as the third, removed one. ADR-QD-186,
    BEH and the doc comment state this exactly.
- **D-07: `useGates` builds `wanted` in one keyed pass.**
  - Each question name yields its `GateRead` entry, and from that same entry its gate id, identity and state, in one
    iteration over the questions record. `wanted` is built from that iteration as `new Map(…)`.
  - There is no `Record.values` pairing, and no two collections that must agree on order. `/usr/bin/grep` finds no
    `states.join("|")` and no paired `Record.values` in `useGate.ts`.
  - The `GateRead` entries are unchanged. The ids stay `base` or `${base}/${name}`, `useId`-derived and
    hydration-stable.

### Tests (RECN-01, RECN-04, WX-06)
- **D-08: The characterisation is written first, on the phase base, as its own commit, before any source change.**
  - It goes in a new file, `packages/react/test/GateRegistration.characterisation.test.tsx`. It is rendered, through
    the real `QadiProvider` with an instrumented registry.
  - Each row compares the whole `instances()` snapshot (id, kind, state, resource, element presence) and the exact
    count of registry notifications after each step. It covers:
    - register: a `Can` and a hook;
    - a state update: one notification, the same id;
    - a re-render with an equal or inline policy: zero notifications;
    - a policy or resource change: re-registers once and keeps the id;
    - unregister on unmount;
    - remount;
    - StrictMode: registers once, and a changed policy re-registers once with one entry left;
    - `usePolicies`/`useQuestions`: a key added, a key removed, keys reordered, an equal record rebuilt each render;
    - a writer change and uninstrumented, which register nothing.
  - It is green on the base and must stay green unchanged. A later edit may touch titles, layout or helpers only,
    never an input or an expected value, and each such edit is its own commit.
- **D-09: The state half is tested without rendering, beside `GateWriter.reconcile.test.ts`, in that file.**
  - A kept entry's handle is told the wanted state.
  - A changed identity unregisters before it registers.
  - A new id registers with the wanted state.
  - An empty `wanted` unregisters all.
  - The returned map is fresh, and `live` is never mutated.
  - The fake writer records calls in order.
  - The registry's own equal-state no-op is pinned in the `buildGateRegistry` tests (one exists in
    `GateWriter.test.tsx`, "a state change updates in place: one notification, the same id"; add an "equal state,
    zero notifications" row there if none exists).
  - A RED for the update half is shown once against the base `reconcile`, which has no update, and recorded.
- **D-10: `GateRegistry.test.tsx` loses the cases whose subject is a reconcile rule, now stated without rendering:**
  - "does NOT re-register on a render with a fresh, structurally equal policy and resource";
  - "unregisters exactly the instance whose key was removed";
  - "does not re-register when an equal record is rebuilt each render";
  - any other case the planner finds whose assertion is a reconcile rule.
  - Each moved case's rule must be pinned by a reconcile test *and* its rendered wiring kept by a characterisation
    row before it is deleted. The plan lists each moved case with its two replacements.
  - Cases about outcome reading (`Rechecking`), markers, layout, scoping and `useGateInstances` stay.
  - `GateWriter.test.tsx`'s `run` helper is retargeted to the new signature, with no expected value changed.
- **D-11: Type guarantees, each seen failing once.**
  - `wanted` is a `ReadonlyMap`, so passing the old pair of arrays is a compile error.
  - `GateIdentity` has no `id`.
  - `GateCurrent` no longer exists.
  - These are pinned in a `.tst.ts` with a positive twin. A refusal goes through `@ts-expect-error` on a held value,
    as Phase 72 did, or as a counted negative pin with `NOT_CALLABLE_PIN_BUDGET` and the AGENTS.md §6 table edited
    together.

### Mutation and records (RECN-05, WX-02, WX-05)
- **D-12: Mutation base at the phase base, before any source edit.**
  - The scorer `73-mutation.mjs` is copied from `72-mutation.mjs`'s discipline:
    - base and close records, a clean tree, one head per record;
    - `record close <group> --restart`, and a base is never restarted;
    - the removed-mutant rule;
    - an `EXAMINED` table admitted only after a by-hand `ignoreStatic: false` kill;
    - `--self-test`.
  - Two groups, both through `stryker.react.mjs`: `writer` = `packages/react/src/GateWriter.ts` and `hook` =
    `packages/react/src/useGate.ts`. Add a third group for `GateRegistry.ts` only if a plan edits it.
  - A drop is closed with a test, never re-baselined.
- **D-13: Records.**
  - **ADR-QD-186**, "Gate registration is one keyed reconcile":
    - extends ADR-QD-140 (which made `reconcile` and the React-free write side) and ADR-QD-111 (one hook, one
      registration path);
    - records D-01..D-07 with the rejected options above;
    - states plainly what the compiler enforces (the keyed map, no `id` on the identity) and what only tests enforce
      (the step's rules, behaviour preserved).
  - **Dated amendments** to ADR-QD-140 and ADR-QD-111 point at ADR-QD-186, and their Status rows list it.
    ADR-QD-053:81 and ADR-QD-103:52-55 name `useGateRegistrations`. Check each for the index-aligned or three-effect
    wording, and add a dated note where it is now stale. Never rewrite history.
  - **INV-QD-391:** registration is reconciled in one step keyed by gate id: register, update, unregister. No caller
    supplies index-aligned collections, and the equal-state rule lives only in the registry's handle.
  - **INV-QD-392:** `useGateRegistrations` holds no copy of identities or states between commits beyond its
    registrations, and registers through one effect beside the writer-keyed teardown.
  - **BEH-QD-701..705** in `spec/behaviors/09-react.md`:
    - 701: the keyed wanted set and the id as its key;
    - 702: one step registers, updates and unregisters;
    - 703: a state change notifies once and an unchanged commit not at all;
    - 704: teardown on unmount or writer change, StrictMode once;
    - 705: grouped hooks register per question by key, independent of order.
  - Each Pinned-by names test titles that exist verbatim.
  - **CCR-QD-465** cites every revision and names any unused reserved id.
  - **No changeset:** no public type or export changes and no observable behaviour change. The CCR row says so.
  - Spec registers are revised only through `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-22`.
  - AGENTS.md is unchanged; §13 holds.

### Claude's Discretion
- Exact names: `GateWanted`, and whether the identity type keeps the name `GateIdentity` after losing `id`.
- The characterisation's helper layout, and the order of rows within each section.
- Plan split. Suggested, strictly serial, one test runner at a time:
  1. base facts, the characterisation, and the REDs;
  2. the mutation base;
  3. `reconcile` keyed with the update half, its tests and the type pins;
  4. the hook and `useGates` on it, with `GateWriter.test.tsx` retargeted;
  5. the `GateRegistry.test.tsx` trim;
  6. records and close.
- Constraints:
  - no `as`, `!`, `any`, `switch` or `Record<string, unknown>`;
  - ~90-column hand wrapping;
  - doc comments lead with a one-line summary and claim only what the compiler or a test enforces;
  - no phase numbers, plan ids, requirement ids or D-numbers in source, tests, titles or spec.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GateWriter.reconcile.test.ts`'s fake writer (records `register`/`unregister` calls). Extend it with `update`.
- `GateRegistry.test.tsx` and `GateWriter.useGates.test.tsx` render helpers (instrumented provider, `gates` prop).
  Reuse them in the characterisation.
- `buildGateRegistry` (`GateWriter.ts:170`) and `gateWriterFor` (`:250`). A real registry is usable in the
  non-rendered tests.

### Established Patterns
- React-free write side below `GateRegistry.ts` and `QadiAtoms.ts` (ADR-QD-140). Hooks above, in `useGate.ts`, out
  of the barrel.
- `KIND_FACTS` total over `GateKind`. `outcomeOf` is the one read of a result (AGENTS.md §13).
- Characterisation-first with whole-value comparisons, and RED evidence recorded in `NN-RED-EVIDENCE.md` (Phases
  70–72).

### Integration Points
- `useGates` → `useGateRegistrations` → `reconcile` → `GateWriter.register` / `GateHandle.update` / `unregister`.
- `GateWriter.test.tsx` (`run` helper), `GateWriter.reconcile.test.ts`, `GateRegistry.test.tsx`,
  `GateWriter.useGates.test.tsx`, `GateWriter.kinds.test.tsx`.
- Spec: `spec/decisions/140-*.md`, `111-*.md`, `053-*.md:81`, `103-*.md:52-55`, `spec/behaviors/09-react.md`,
  `spec/invariants.md` (the INV citing `GateWriter.useGates.test.tsx` at `:2078`), `spec/traceability.md`,
  `spec/README.md`.

</code_context>

<specifics>
## Specific Ideas
- A commit that changed nothing must make zero notifying registry calls. Count notifications through `subscribe`,
  not through spies on internals.
- Keep "unregister before register" in the step. A changed identity under the same id must not collide with
  itself, and a test shows it would (the collision reporter would hear it).

</specifics>

<deferred>
## Deferred Ideas
- None. The registry's read side and its collision reporting are settled (ADR-QD-080, ADR-QD-184).

</deferred>
