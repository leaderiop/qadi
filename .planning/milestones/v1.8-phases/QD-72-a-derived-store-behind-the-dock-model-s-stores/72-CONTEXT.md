# Phase 72: A derived store behind the dock model's stores - Context

**Gathered:** 2026-11-22
**Status:** Ready for planning

<domain>
## Phase Boundary

`@qadi/devtools`'s `DockModel.ts` builds three computed stores by hand, and each one repeats the same steps: a key type,
a key reader, a `let` holding the last key, a field-by-field compare, a closed guard, and `store.set(compute(key))`.
Line numbers are from HEAD (`57b536bd`):

- `shownReading`: `let fed` / `let supplied` (`DockModel.ts:206-207`), `mergedOf` (`:208-211`), the store (`:212`),
  `remerge` with a two-field `===` compare (`:213-219`), subscribed to the diagnostics feed (`:220`), and called by
  hand at the end of `configure` (`:325`). It has **no closed guard**.
- `questions`: `JoinKey` (`:145-149`), `keyNow` (`:231-238`), `let lastJoin` (`:239`), the store (`:240`), `rejoin`
  with a three-field compare (`:241-253`, the compare at `:244-248`).
- `services`: `servicesKeyNow` (`:255-263`, typed `ServicesInput` from `PortCards.ts:28-34`), `let lastServices`
  (`:264`), the store (`:265`), `reservice` with a four-field compare (`:266-279`, the compare at `:269-274`).
- `let closed` (`:230`), its finalizer (`:284-288`), and the subscription wiring (`:280-283`).

A field added to `JoinKey` or `ServicesInput` that the hand compare leaves out still compiles, and the store then stops
recomputing when that field changes. The store count is written in several current-tense places (the `DockModel.ts`
header at `:1-2` and `:25-36`, ADR-QD-168 at `:63-67` and `:135`, BEH-QD-615's REQUIREMENT at
`spec/behaviors/28-devtools-screens.md:2270`, INV text at `spec/invariants.md:4160`, the traceability row at
`spec/traceability.md:573`), along with the dated amendments in ADR-QD-047 (`:487-502`, `:510`) and BEH-QD-465 (`:934-936`).

**Live asymmetry found by this discuss step (decided in D-07).** After the model's scope closes, `configure` still runs
`remerge()` (`:325`): `shownReading` takes the new supplied reading and notifies the host's `diagnostics` listeners,
while `rejoin` and `reservice` return early on `closed`. `DockModel.test.ts` M36 (`:1099`) relies on this in its comment
("a changed reading that reaches `rejoin` through the diagnostics store"). The dock never configures a closed model:
`useDockModel.ts:51` holds the model through `useScoped`, which hands a pass with no live model `undefined`, and the
`configure` at `:56` is guarded on that.

This phase delivers one derived store in `ExternalStore.ts`. It reads a key, compares every field of that key with
generic code (no per-field code), recomputes only when a field changes identity, notifies at most once per change, keeps
ADR-QD-177's listener contract, and stops when its scope closes. The dock model's three computed stores are built from
it and state only their parents, their key and their compute function. The store count is stated in one place and
checked by a test.

**In scope:** `packages/devtools/src/model/ExternalStore.ts` and `DockModel.ts`. The read-half type rename at
`ServicesPanel.tsx:36`, `QuestionsPanel.tsx:61`, `useStoreSnapshot.ts:13` and `DockModel.ts:111,113` (D-04).
Devtools tests (`ExternalStore.test.ts`, a new `ExternalStore.tst.ts` if D-03's pin needs one, `DockModel.test.ts`, a new
characterisation file). Spec records (D-15).

**Out of scope:** the feeds' own field compares (`GatesFeed.ts`'s `publish`, `DiagnosticsFeed.ts`'s `show` and its
`configure` option compare) and their `runs.closed()` checks; the timeline fan-out (`let shown` / `let rail` / `spread`,
`DockModel.ts:179-202`), which pushes commands into three other stores rather than computing one (D-08); any public
export (`ExternalStore.ts` is out of the barrel, `ExternalStore.ts:5`; the root stays at 941, `check-api-surface`).

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE13-CONTEXT.md`)
- **D1 (scope):** all eight review candidates become phases. **D2 (branch):** `arch-wave-13`, no merge, no release.
- Strictly serial. Reserved numbers only: ARCH-119, ADR-QD-185, CCR-QD-464, BEH-QD-696..700, INV-QD-389..390. **Never
  run `node scripts/next-id.mjs`.**

### The derived store's API (DERV-02). All decided autonomously, 2026-11-22, under the owner's instruction "do not ask me; always pick the most complete and clean solutions… Qadi should be very clean"
- **D-01: One scoped constructor, `makeDerivedStore`, in `ExternalStore.ts`.** Its shape:
  `makeDerivedStore({ parents, key, compute })` returns `Effect<DerivedStore<A>, never, Scope.Scope>`, built with
  `Effect.fn("qadi.devtools.makeDerivedStore")(function* <K extends …, A>(…))`. Generic `Effect.fn` already has
  precedent: `Handover.ts:110`, `CircuitBreaker.ts:487`, `EncodeRefusalReport.ts:25`.
  - `parents` is a non-empty tuple, `readonly [Parent, ...Array<Parent>]`, where a `Parent` is anything with the
    `ExternalStore` `subscribe` signature. The dock's parents are the diagnostics feed, the gates feed and
    `shownReading`, and each has `subscribe`. A store with no parent would be a plain store with a refresh, so the type
    refuses it.
  - `key: () => K` is read on every trigger. It may read a parent's snapshot or the model's own `inputs`. It has to be
    a thunk, not a function of the parents' snapshots. M47 (`DockModel.test.ts:1118`) and J8 (`:1388`) pin "one
    configure publishes one join", and that holds only because `rejoin`, fired inside `gatesFeed.configure`'s
    synchronous publish, reads the *already assigned* `inputs.reading?.questions` (`DockModel.ts:308` assigns `inputs`
    before the feeds are configured). For the same reason, a key input held in a store that `configure` sets last
    would join twice.
  - `compute: (key: K) => A` runs once at construction, without notifying, and again on each key change.
  - `DerivedStore<A>` is the read half (D-04) plus `refresh(): void`, which reads the key again and recomputes if it
    moved. `refresh` is the trigger for a key input that is not a parent: the `reading` input, which `configure`
    assigns and then refreshes at the point where `remerge()` runs today (`:325`). Then `gatesFeed.configure` and
    `diagnosticsFeed.configure` publish first, as the comment at `:316-317` requires.
  - Rejected: Effect's `Data.struct` with `Equal.equals`. In effect v4 that compares plain objects and arrays
    structurally (`GatesFeed.ts`'s `readAsked` relies on it), so it would deep-compare `GatesSnapshot`'s guard arrays
    and policies on every tick and change the rule from identity to structure (M28, `DockModel.test.ts:951`, pins the
    feed snapshot's own identity). Rejected: a record of per-field readers, because building its result type needs a
    cast. Rejected: a key schema, which is a codec with no trust boundary (§7 is for untrusted input).
- **D-02: Key equality is per-field identity, over every own field, by one generic comparison.** The comparison is a
  new module-private `sameFields(a, b)` beside `sameElements` (`ExternalStore.ts:88-89`). It walks the union of both
  keys' own enumerable fields with `for…in` (which types the index as `Extract<keyof K, string>`, so no cast is
  needed). A field present on only one side counts as a change, and values are compared with `===`, the same identity
  `set` (`:70`) and `sameElements` use. No per-field code exists anywhere, so no field can be left out.
- **D-03: What the compiler enforces and what a test enforces, stated exactly.**
  - The compiler: `K` is constrained to `object` and to `Required<K>`, so a key type with an optional field is a
    compile error, and every key field must be written by the key reader. Because a key reader is typed with the
    compute's input (`(): JoinKey`, `(): ServicesInput`), a field added to that type and not written by the reader is
    TS2741 at the reader's literal. The compute receives exactly `K`, so reading a field outside the key is TS2339.
  - A test (against `makeDerivedStore` alone): for a key of three fields, each field changing alone recomputes and
    notifies once, and a key of a different shape is compared without any change to the store.
  - Not enforced by either: a compute that closes over state outside its key. The doc comment says so in those words.
    The dock's three computes are module-scope functions of their key alone (`mergedOf` is hoisted out of
    `makeDockModel`, and it closes over nothing today, `:208-211`).
  - The `Required<K>` refusal gets one type pin that can fail, with a positive twin, shown failing by gutting the
    constraint. `makeDerivedStore` returns an `Effect`, so a negative `toBeCallableWith` pin goes through `Params<…>`
    or `Parameters<…>[i]` (AGENTS.md §6, ADR-QD-175), or the pin is a `// @ts-expect-error` with its positive twin.
    Any negative `toBeCallableWith` pin updates `NOT_CALLABLE_PIN_BUDGET` and the AGENTS.md §6 table together.
- **D-04: The read half gets a name: `ReadableStore<A>`** (= `Pick<ExternalStore<A>, "subscribe" | "getSnapshot">`),
  exported from `ExternalStore.ts` and still package-private. `DerivedStore<A>` extends it. Every one of the five
  existing `Pick<ExternalStore<…>, "subscribe" | "getSnapshot">` spellings moves to it (`DockModel.ts:111,113`,
  `ServicesPanel.tsx:36`, `QuestionsPanel.tsx:61`, `useStoreSnapshot.ts:13`), so one type is never spelled two ways.
  The grep `Pick<ExternalStore<` over `packages/devtools` finds nothing at close. The change is type-only.
- **D-05: When it recomputes, and "notify once".** On each parent notification and each `refresh` it reads the key. If
  `sameFields` holds, it does nothing: the compute is not called and no listener runs. Otherwise it **computes first**,
  then commits the key, then calls `set(value)`. So:
  - a compute that throws commits nothing (neither key nor value), and the next trigger recomputes. Today
    `lastJoin = key` (`:251`) is committed before `joinQuestions` runs (`:252`).
  - a key change notifies exactly once, or not at all when the compute returns the reference already held (`set`
    skips it, `:70`). `mergedOf` returning the feed's own snapshot (`:210`) relies on that.
  - a trigger that re-enters from inside one of the store's own listeners sees the committed key, so it does not
    notify twice for one change.
- **D-06: The listener contract and ordering.** The derived store is an `ExternalStore` underneath, so ADR-QD-177 holds
  unchanged for its own listeners (every listener runs, then rethrow: one value as itself, more than one as an
  `AggregateError`, never flattened). Its refresh is itself a listener in each parent's set. A throw from its listeners
  therefore enters the parent's loop as one value, the parent's later listeners still run (so `services` still
  recomputes when a `questions` host listener throws), and the throw leaves through whatever published, as BEH-QD-656
  (`28-devtools-screens.md:2621`) says. It subscribes to its parents in the order they are listed, at construction, so
  it moves before every listener subscribed after it is built: the "join moves first" of J1
  (`DockModel.test.ts:1281`) and the comment at `DockModel.ts:280`. The doc comment states this as an ordering
  guarantee, and the listener contract is not restated: it points at the existing one (`ExternalStore.ts:19-27`).
- **D-07: Stop after close, the same for all three stores.** A finalizer in the caller's scope unsubscribes the store
  from every parent and marks it stopped. From then on `refresh` is a no-op, the key reader and compute are never
  called again, `getSnapshot` keeps returning the last value, and `subscribe` still registers but nothing notifies. The
  stopped state lives in `ExternalStore.ts` once. `DockModel.ts` has no `closed`.
  - **Behaviour change, deliberate:** `shownReading` also stops after close, so a `configure` on a closed model no
    longer moves the diagnostics snapshot (see the asymmetry above). Why: ADR-QD-137 says closing the scope ends what
    the model started, `DiagnosticsFeed.ts`'s `configure` already refuses "a command on a closed feed [that] would
    publish a state nothing follows", and one rule for three stores is cleaner than two rules. The dock cannot observe
    it (`useScoped` never hands a closed model), so no changeset (D-15).
  - Finalizer order: `shownReading`'s finalizer is registered before the gates feed exists, so on close it runs after
    the gates feed's finalizers. Neither feed publishes while closing (M26, `DockModel.test.ts:908`; `GatesFeed.ts`'s
    "a closed feed runs no host code"). The characterisation's close row (D-10) pins "no store notifies during close"
    on the base, so this ordering is covered by a test rather than assumed.
- **D-08: Package-private.** `ExternalStore.ts` is kept out of the barrel (`ExternalStore.ts:5`, AGENTS.md §9,
  ADR-QD-099), and the derived store stays inside it. No package outside devtools needs it, and making it public would
  freeze an internal mechanism. Root export count unchanged (941); `spec/overview.md` unchanged. The timeline fan-out
  (`:179-202`) is not moved onto it: it is a command pushed into the explorer, the simulation and the dock session, not
  a computed store, and `sightings` is a thunk. ADR-QD-185 records that.

### The dock model (DERV-03)
- **D-09: The three stores become three `makeDerivedStore` calls:**
  - `shownReading`: parents `[diagnosticsFeed]`, key `{ fed: diagnosticsFeed.getSnapshot(), supplied: inputs.reading }`
    (a named key interface beside `JoinKey`), compute `mergedOf` hoisted to module scope.
  - `questions`: parents `[gatesFeed, shownReading]`, key reader `(): JoinKey` (the body of `keyNow`, `:231-238`),
    compute `(key) => joinQuestions(joinInputOf(key))`.
  - `services`: parents `[shownReading]`, key reader `(): ServicesInput` (the body of `servicesKeyNow`), compute
    `portCards`.
  - Built in that order, so `shownReading`'s listener set reads `[questions, services]` as `:282-283` does today.
  - `configure` replaces `remerge()` with `shownReading.refresh()`, and the comment at `:316-317` is reworded to name it.
  - The header's store-count paragraph goes (D-13).
  - **Removed:** `let fed`, `let supplied`, `let closed`, `let lastJoin`, `let lastServices`, `remerge`, `rejoin`,
    `reservice`, `keyNow`'s and `servicesKeyNow`'s standalone `let`-tracked form, the two hand compares, the finalizer,
    and the three manual `subscribe` lines. `let inputs`, `let shown` and `let rail` stay (D-08).
  - **The proving grep**, empty at close:
    `/usr/bin/grep -nE "let (last|fed|supplied|closed)|closed|remerge|rejoin|reservice|key\.[A-Za-z]+ === " packages/devtools/src/model/DockModel.ts`.
    The planner runs it once on the base to show it matches, and records both outputs.
  - Nothing new is hoisted to module scope in `DockModel.ts` that Stryker's `ignoreStatic` would ignore (a new Ignored
    mutant fails D-14's rule). `mergedOf` is a function, so its body is not static.

### Tests (DERV-01, DERV-04, WX-06)
- **D-10: Characterisation first, on the phase base, green, expected values never edited.** A new file,
  `packages/devtools/test/model/DockModel.characterisation.test.ts`, following the existing
  `*.characterisation.test.tsx` naming. It runs entirely through `makeDockModel` with the existing doubles
  (`gateRegistryDouble.ts`, `collectorDouble.ts`, `helpers.ts`'s `settleTurns`). Rows, each titled by its input:
  - **shownReading:** no reading supplied keeps the feed's own snapshot; a feed publish recomputes once; a reading-only
    configure recomputes once; the same reading reference notifies nothing; a fresh reading literal with the same field
    references recomputes, because the comparison is identity, not structure.
  - **questions:** a gates-feed publish rejoins once; a supplied-questions change rejoins once; Starting to Live with
    supplied questions keeps the snapshot; a configure moving the registry and the reading publishes one join; after
    close, a configure with new gates and a new reading leaves it unchanged.
  - **services:** each of wiring, activity and port calls changing alone recomputes once; hydration-only and
    questions-only changes keep the snapshot; the unsampled flip recomputes; after close, nothing.
  - **Ordering:** a host listener on each store's parent reads the already recomputed store.
  - **ADR-QD-177 through the chain:** a host listener on `questions` that throws during a reading configure still lets
    `services` recompute and the host's `diagnostics` listener run, and the throw leaves `configure`.
  - **Close:** no store notifies while the scope closes.
  - One scripted run records every store's notifications in order as one expected array.
  - Where an existing test already pins a row (M21-M28 `:822-951`, M32-M36, M47, J1-J8, M48-M55 `:1412-1639`), the row
    names it instead of copying it.
  - **The one row left out:** `shownReading` after close. It is D-11's RED test, because its expected value changes.
  - The file stays green, unchanged, through the phase. Its doc comment says what it pins, not when it was written (no
    phase-relative wording).
- **D-11: RED, shown failing once, each recorded in `72-RED-EVIDENCE.md` with its command and first failure line:**
  1. **Behaviour (D-07):** "a model whose scope closed merges no reading a later configure hands it": the diagnostics
     snapshot stays the same reference and its host listener is not called. RED on the base, green after.
  2. **The derived store's rules, against `makeDerivedStore` alone** in `ExternalStore.test.ts` (`it.effect`, its own
     `describe`). These are RED on the base because the export does not exist:
     - the initial compute does not notify;
     - each key field changing alone recomputes once, for a three-field key;
     - an unchanged key calls neither the compute nor any listener;
     - a key whose field is present on one side only counts as changed;
     - a compute returning the held reference notifies nothing;
     - a throwing compute commits nothing, and the next trigger recomputes;
     - a listener re-entering a refresh does not double-notify;
     - parents are subscribed in the order listed, before a later listener;
     - with one and with two throwing listeners, every listener runs and the parent rethrows one value or one
       `AggregateError`;
     - after close: no compute, no key read, `refresh` is a no-op, the parent's listener is released, and the last
       snapshot is kept.
  3. **The type pin of D-03**, shown failing by gutting `Required<K>`.
  - Test titles describe their inputs. No title holds a D-number, a plan id or an `M56`-style local id (WX-07). Existing
    titles keep their ids.
- **D-12: `DockModel.test.ts` keeps one test per store** showing its key and its order relative to host listeners. It
  is table-driven over the key's fields: each key field changing alone recomputes once, a field outside the key changes
  nothing, and the store has moved when a host listener on its parent runs. Tests whose subject is now the generic rule
  are deleted, because `ExternalStore.test.ts` owns the rule: recompute only on a key change (the per-field cases folded
  into the per-store test), and nothing after close (M55, and M36's join half; M36's registry half is the gates feed's
  T-tests). Constraints:
  - no test whose subject is a dock-specific rule is removed (the join input, the merge, the unsampled mapping in
    M53/M54, configure ordering in M23/M27/M47/J8, the properties P1/P2);
  - M36's stale comment is reworded, never its expected values;
  - every mutant in `DockModel.ts` that is killed on the base stays killed (D-14).

### Store count (DERV-05)
- **D-13: The count is stated once, in a new BEH-QD-700, and checked by a test.** BEH-QD-700 (in
  `28-devtools-screens.md`, next to BEH-QD-465) says: the dock model's stores are the members of `DockModel` that have
  `subscribe` and `getSnapshot`, nine of them, named; `sightings` is a thunk. It also carries the ordinal history now in
  the header (`DockModel.ts:35-36`). A `DockModel.test.ts` test lists the members of a built model that have
  `subscribe` and `getSnapshot` and asserts that exact list, so adding a store without updating the list fails.
  - **Current-tense statements that stop restating it:**
    - the `DockModel.ts` header (`:1-2`, `:25-36`), which points at BEH-QD-700;
    - BEH-QD-615's REQUIREMENT clause "It is the dock model's ninth store" (`:2270`), revised to drop the ordinal;
    - the INV text at `invariants.md:4160` and the traceability row at `traceability.md:573`;
    - ADR-QD-168's consequence at `:135` ("stated here, in the ADR-QD-047 amendment, in BEH-QD-465 and in the
      `DockModel.ts` header"), which gets a dated note: superseded by ADR-QD-185;
    - ADR-QD-169's consequence at `:117` and decision text at `:58` ("keeps its closed flag and its last join"), which
      get a dated correction.
  - ADR-QD-047 and BEH-QD-465 get one dated amendment each, pointing at BEH-QD-700. Their earlier amendments
    (`047:487-502`, `:510`; `28:934-936`) and every change-history cell are history, kept as written (AGENTS.md §15).
  - The sweep grep `/usr/bin/grep -rnE "\b(nine|ninth|eighth) store|store count" spec packages/devtools/src` is run at
    close. Each remaining hit is listed with its reason: BEH-QD-700 itself, a dated blockquote amendment, or a
    change-history cell.

### Mutation and records (WX-02, WX-05)
- **D-14: Mutation base at the phase base, before any source edit**, with a scorer `72-mutation.mjs` copied from
  `71-mutation.mjs`'s discipline:
  - base and close records; a clean tree checked for the files each record reads; one head per record;
  - `record close <group> --restart` for a re-close after a fix commit, and a base is never restarted;
  - the removed-mutant rule: a score that fell only because killed mutants were deleted passes, but a new open
    (Survived, NoCoverage) or a new Ignored mutant never passes;
  - mutants located by line through `git diff -U0`; `--self-test`.
  - Two groups, both through `stryker.devtools.mjs` (report `reports/mutation-devtools/mutation.json`, `ignoreStatic:
    true`): `model` = `packages/devtools/src/model/DockModel.ts` and `store` =
    `packages/devtools/src/model/ExternalStore.ts`. Invocation:
    `pnpm exec stryker run stryker.devtools.mjs --mutate <file>`, with stdin closed and nothing else running.
  - `DockModel.ts` was last recorded at 1 (145/145, ADR-QD-168). The base record, not that number, is what close is
    compared with.
  - `ExternalStore.ts` gains the derived store's mutants, and each must be killed. A drop is closed with a test, never
    re-baselined.
- **D-15: Records.**
  - **ADR-QD-185:** extends ADR-QD-168, amends ADR-QD-047 (the count) and corrects ADR-QD-169's consequence. Keeps
    ADR-QD-177 and ADR-QD-137. It records D-01..D-09 and D-13 with the rejected options: `Equal.equals` structural
    keys; a reader record (needs a cast); a key schema; key inputs as stores set last (two joins); a derived store per
    feed; making it public; leaving `shownReading` unguarded after close. It also restates ADR-QD-168's note that the
    model, not a panel `useMemo`, is the home.
  - **INV-QD-389:** a derived store recomputes exactly when some own field of its key changes identity, compares every
    field by one generic comparison, commits nothing when its compute throws, and does nothing after its scope closes.
  - **INV-QD-390:** the dock model's computed stores are derived stores. `DockModel.ts` holds no last key and no closed
    state of its own, and the store count is stated only in BEH-QD-700.
  - **BEH-QD-696** (key equality and recompute), **697** (notify once; ordering before later listeners; ADR-QD-177
    through the chain), **698** (stop after close), **699** (the dock's three stores, their keys, and `shownReading`
    stopping after close), **700** (the count, D-13).
  - Revised in place, each with a dated note:
    - BEH-QD-616's second REQUIREMENT (`28:2298`, "no mutable gate-watch state beyond its closed flag and its last
      join"), which becomes "no gate-watch state; its join is a derived store";
    - INV-QD-357 (`invariants.md:4182`);
    - the Source lines naming `remerge`/`rejoin`/`reservice` (`invariants.md:3789, 4028, 4160`;
      `traceability.md:158, 187, 189`);
    - BEH-QD-656's scope sentence, if it names the stores built on `makeExternalStore`.
  - **CCR-QD-464:** cites every revision, and names any unused reserved id.
  - **No changeset:** no public type or export changes, and the one behaviour change (D-07) is unreachable through
    `DevtoolsDock` (`useDockModel.ts:51,56`). The CCR row says so.
  - Spec registers are revised only through `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-22`.

### Claude's Discretion
- Exact names (`makeDerivedStore`, `DerivedStore`, `ReadableStore`, `sameFields`, `refresh`, the merge key's interface
  name), the `Parent` type's spelling, and whether the D-03 pin is a `@ts-expect-error` or a `Params<…>` pin.
  Constraints: no `as`, `!`, `any`, `switch` or `Record<string, unknown>`; ~90-column hand wrapping; doc comments lead
  with a one-line summary and claim only what the compiler or a test enforces.
- Plan split. Suggested order:
  1. base facts, the characterisation and the REDs;
  2. the mutation base;
  3. the derived store and its tests;
  4. the dock model on it, with the test trim and the count test;
  5. records and close.
  Strictly serial, one test runner at a time.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `makeExternalStore` (`ExternalStore.ts:43-79`): `notify` (`:47-59`) is ADR-QD-177's loop; `set` (`:69-73`) holds the
  value and notifies only on a new reference. `sameElements` (`:88-89`) is the sibling `sameFields` sits beside.
- `joinInputOf` (`DockModel.ts:157-166`), `joinQuestions` (`Gates.ts`), `portCards` (`PortCards.ts`), `mergedOf`
  (`DockModel.ts:208-211`): the three computes, already pure.
- Test doubles: `packages/devtools/test/gateRegistryDouble.ts:55`, `collectorDouble.ts:19`, and in `helpers.ts`
  `settleTurns` (`:174`) and `thrownBy` (`:179`). `DockModel.test.ts`'s `heardOf` (`:1495`).
- `71-mutation.mjs`, the scorer to copy.

### Established Patterns
- Scoped constructors in the model (`makeGatesFeed`, `makeDiagnosticsFeed`, `makeSupersedingRun`) own their lifetime
  through a finalizer (ADR-QD-137, ADR-QD-150).
- Characterisation files that are written once and never edited (`QuestionsPanel.characterisation.test.tsx`,
  `ServicesPanel.characterisation.test.tsx`).
- AGENTS.md §2-§6 (no `as`/`!`/`any`/`switch`; `Effect.fn`), §9 (out of the barrel means not importable), §10
  (`it.effect`, scoped tests), §15 (history exempt).

### Integration Points
- `packages/devtools/src/model/ExternalStore.ts`, `DockModel.ts`. `ServicesPanel.tsx:36`, `QuestionsPanel.tsx:61` and
  `useStoreSnapshot.ts:13` (type only).
- Tests: `packages/devtools/test/model/ExternalStore.test.ts` (266 lines), `DockModel.test.ts` (1639 lines, 70
  `makeDockModel(` calls), the new characterisation file, optionally `ExternalStore.tst.ts`.
- Spec: ADR-QD-047, -137, -168, -169, -177; `spec/behaviors/28-devtools-screens.md` (BEH-QD-465 `:934`, BEH-QD-583
  `:1925`, BEH-QD-615 `:2270`, BEH-QD-616 `:2298`, BEH-QD-656 `:2621`); `spec/invariants.md`;
  `spec/traceability.md`.

</code_context>

<specifics>
## Specific Ideas

- The success test for the phase: on the closed tree, adding a throwaway field to `ServicesInput` fails to compile at
  the `services` key reader until it is written there, and once written it is compared with no other edit. Adding a
  tenth store to `DockModel` fails the store-list test until BEH-QD-700's list is updated.

</specifics>

<deferred>
## Deferred Ideas

- The feeds' own hand compares (`GatesFeed.ts`'s `publish`, `DiagnosticsFeed.ts`'s `show` and its option compare) could
  use `sameFields` later. They are not computed stores with parents, and moving them would widen this phase into three
  more mutation-scored files.
- The timeline fan-out (`let shown` / `let rail` / `spread`) as a derived `sightings` store: it changes the `sightings`
  thunk and the push order into three stores, so it would need its own characterisation.

</deferred>
