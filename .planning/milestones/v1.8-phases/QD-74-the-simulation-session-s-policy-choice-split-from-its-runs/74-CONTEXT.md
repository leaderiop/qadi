# Phase 74: The simulation session's policy choice split from its runs - Context

**Gathered:** 2026-11-23
**Status:** Ready for planning

<domain>
## Phase Boundary

`@qadi/devtools`' `SimulationSession.ts` (686 lines) is a scoped store that owns the simulator's runs (ADR-QD-137,
ADR-QD-150). It also holds every rule about which policy is being simulated and where it came from, written inline
around three mutable values. Line numbers are from HEAD (`67066581`):

- **State:**
  - `chosen`, a `makeHeldChoice` cell over the rail's sightings (`:334`), pinned at construction only when there is
    no seed (`:335`);
  - `seedEntry`, the last row seeded from, replayable or not (`:336`);
  - `seeded`, the replayed row's policy, held with its row (`:338-340`).
- **The choice rules:**
  - `policyChoice` reads `seeded` over the cell (`:353-356`);
  - `pin` pins only while unseeded (`:364-366`);
  - `policyOf` (`:368-369`);
  - `seedOf` holds the orphan rule: a non-decision row stays the baseline row after the reviewer chooses another
    policy, and a replayable row the reviewer walked away from does not (`:379-384`).
- **The menu, with its order written twice:**
  - `selectedOf` (`:277-285`) and `policyMenuOf` (`:290-302`) put the replayed row or an evicted choice first;
  - `leading` (`:287-288`) recounts how many entries lead, so `choosePolicyAt` (`:592-598`) can turn a menu
    position back into a sighting.
- **The commands that move the choice:**
  - `reseed` (`:543-558`);
  - `choosePolicy` (`:560-577`), whose same-policy no-op holds only while the run is `Idle`;
  - `setSightings` (`:584-588`);
  - `seed`'s same-entry guard (`:600-603`).
- **"Clear the run" is written three times**, as `supersede(); run = { _tag: "Idle" }`, in `reseed` (`:555-556`),
  `choosePolicy` (`:574-575`) and `setPorts` (`:613-614`, only while `Running`).
- **The `edit` comment is false.** It says `edit` is "the one path a draft changes by" (`:534`), but three other
  places assign `draft` directly: `reseed` (`:550`), `editResourceText` (`:661`) and `renameSubject` (`:668`).
- **Tests today:** about 600 of `SimulationSession.test.ts`'s 1809 lines exercise synchronous, pure choice rules, and
  each needs a scoped Effect session to do it. The sections are:
  - "seeding" (`:1091`), "replaying a row" (`:1256`), "choosing a policy" (`:1351`);
  - the `policyMenu` block (`:570`);
  - "a result belongs to the question it answered" (`:908`).

**This phase delivers:**
- One pure module beside `HeldChoice.ts`, `SeededChoice.ts`, that owns the seeded choice:
  - the pin-only-when-unseeded rule;
  - the orphan rule;
  - the menu and its reverse lookup, with menu order written once;
  - the same-policy no-op.
- Those rules tested as plain values with no scope, and the session tests that only exercised them moved there.
- `SimulationSession.ts` keeps only runs and the form and reads its choice through that module. "Clear the run" is
  one operation, called from `reseed`, `choosePolicy` and `setPorts`.
- The `edit` comment made true: every draft write goes through one path.
- ADR-QD-187 records the split, with ADR-QD-137 and ADR-QD-150 untouched and ADR-QD-047 v1.11 (the menu under the
  session) still holding.

**Behaviour is preserved:** every snapshot, every no-op and every notification count stays the same. A
characterisation written on the phase base proves it.

**Out of scope:**
- `HeldChoice.ts`'s own rules and `ExplorerSession.ts`, which keeps its `makeHeldChoice` cell.
- The run lifecycle (`makeSupersedingRun`, `start`, `land`).
- Sources and capture (`SimulationSource.ts`) and the form's field codecs (`SimulationFields.ts`).
- The React adapter (`useSimulationSession.ts`) and the simulator panel, which read the snapshot unchanged.
- The public names: `check-api-surface` stays at 941.

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE13-CONTEXT.md`)
- **D1 (scope):** all eight review candidates become phases.
- **D2 (branch):** `arch-wave-13`, with no merge and no release.
- **Order:** strictly serial.
- **Reserved numbers only:** ARCH-121, ADR-QD-187, CCR-QD-466, BEH-QD-706..710, INV-QD-393..394.
- **Never run `node scripts/next-id.mjs`.**

### The module (CHSE-02)
- **D-01: `SeededChoice.ts`, a pure module of plain values, beside `HeldChoice.ts`, package-private.**
  - **The state.** A `SeededChoice` is an immutable value with three parts:
    - the rail's sightings and the sighting held from them: `HeldChoice`'s list-and-held pair, built on its pure
      `resolveHeld`, `pinHead` and `heldValue`, not on the mutable cell;
    - the last row seeded from;
    - the replayed row's policy and unseeded fields, held with that row, while it is the running policy.
  - **Transitions are functions from a `SeededChoice` to a `SeededChoice`:**
    - `seededChoice(sightings, seed?)`, the constructor;
    - `withSightings`;
    - `seedFrom(entry)`;
    - `choose(policy)`.
  - **No-ops return the same reference.** A transition that changes nothing returns its input object, so the session
    detects a no-op by `===` and stores nothing of its own.
  - **Readings are functions of the value:** `policyChoice` (the `PolicyChoice` union), `policyOf`, `seedOf`,
    `seededFrom` (the last row, for `seed`'s same-entry guard), `menuOf` and `sightingAt`.
  - Rejected:
    - a mutable cell like `makeHeldChoice`, which needs the owner to sequence calls and makes a test build and drive
      an object;
    - widening `HeldChoice.ts`, whose rule (a value held against a list) has no notion of a seed and serves two other
      screens.
- **D-02: The pin rule lives inside the transitions.** The constructor, `withSightings` and `seedFrom` each pin the
  head exactly when no replayed policy is held, so no caller can forget the rule or apply it while seeded.
  `choose` holds a value and needs no pin.
- **D-03: The orphan rule is `seedOf`, unchanged.**
  - While a replayed policy is held, the seed is its row.
  - Otherwise a row that is not a `TimelineDecision` stays the baseline row.
  - A decision row the reviewer walked away from is no seed.
- **D-04: The menu order is written once.**
  - **One list.** One internal list of entries, each carrying its value, its label and the sighting it names (none
    for the replayed row or an evicted choice).
  - **Readings of it.** `menuOf` projects that list to the public `PolicyMenu` (`options` plus `selected`). The
    reverse lookup `sightingAt(position)` reads the same list's entry. A non-integer position, a position past the
    end, and a position naming a leading entry all answer nothing.
  - `leading` disappears.
  - **Public shape unchanged.** The public `PolicyMenu`/`PolicyMenuOption` shape is unchanged.
- **D-05: The same-policy no-op is the module's; the run condition is the session's.**
  - `choose(policy)` returns its input unchanged when no replayed policy is held and the held sighting's policy
    `Equal.equals` the chosen one.
  - Otherwise it holds `sightingFor(list, policy)` and drops the replayed policy.
  - The session returns without publishing only when `choose` returned its input **and** the run is `Idle`. Otherwise
    it clears the run and publishes, which is today's behaviour exactly.
- **D-06: `seedFrom(entry)` calls `replayInput` once and also answers the replayed input.**
  - It returns the next `SeededChoice` together with the input the session writes as its draft (none for an entry
    that does not replay, or for `undefined`), so replay is decoded in one place.
- **D-07: `PolicyChoice`, `PolicyMenu` and `PolicyMenuOption` move to `SeededChoice.ts`.**
  - They are that module's types.
  - The devtools barrel's named export lines for them move to the new module path. The names do not change, so the
    public surface and `check-api-surface` (941) do not move.
  - `spec/overview.md` is edited only if it names their module.
  - The compile-time tie of `PolicyChoice`'s first three arms to `HeldChoice<PolicySighting>` (the comment at
    `:75-81`) moves with the type and stays true.

### The session (CHSE-03, CHSE-04)
- **D-08: The session holds one `let choice: SeededChoice` and keeps only runs and the form.**
  - `chosen`, `seedEntry`, `seeded`, `pin`, `policyChoice`, `policyOf`, `seedOf`, `selectedOf`, `leading` and
    `policyMenuOf` leave the file.
  - `build`, `start`, `stale` and the baseline read the module's readings.
  - The `stale` rule stays in the session, because it compares a run's question with the form.
- **D-09: "Clear the run" is one function, `clearRun`.**
  - It is `supersede(); run = { _tag: "Idle" }`, called from `reseed`, `choosePolicy` and `setPorts` (still only
    while `Running`).
  - The `Refused` path in `start` supersedes but sets `Refused`, so it is not a clear and keeps calling `supersede`.
- **D-10: Every draft write goes through one path, and the `edit` comment becomes true.**
  - **One assignment.** One internal function is the only place `draft` and `resourceText` are assigned, holding the
    no-op rule and the resource-text rule.
  - **`edit`** uses it with the text derived from the new resource.
  - **`reseed`** uses it with the text re-encoded from the replayed or kept draft, as today.
  - **`editResourceText`** uses it:
    - on a parse, with the typed text and the new resource;
    - on a refusal, with the typed text and its error and the draft unchanged.
  - **`renameSubject`** goes through `edit`. A rename never touches the resource, because `SimulationFields`'
    renames are subject fields only, so the text is unchanged as today.
  - **Grep check.** `/usr/bin/grep` finds exactly one `draft =` assignment in the file, and the comment names that
    function.
  - Rejected: correcting the comment to list the exceptions. The owner's bar is "very clean", and the exceptions
    were a rule written four times.

### Tests (CHSE-01, CHSE-04, WX-06)
- **D-11: The characterisation is written first, on the phase base, as its own commit, before any source change.**
  - **File:** `SimulationSession.characterisation.test.ts`, through the real scoped session.
  - **What it pins:** whole-snapshot readings (`policy`, `policyMenu`, `sightings`, `draft`, `resourceText`, `run`,
    `stale`, `baseline`) and notification counts.
  - **The paths it covers:**
    - seeding (construction with and without a seed, a replayable row, an orphan row, the same entry again);
    - replaying a row (`replay` on the held row re-seeds);
    - choosing a policy (from the rail, a policy the rail does not list, the same policy while `Idle` and while not
      `Idle`, while seeded);
    - the policy menu and its order (seeded, evicted, listed, empty, and `choosePolicyAt` at every kind of
      position);
    - staleness (the form, the policy and the seed each moving after a run);
    - `setSightings` pinning and growing;
    - `setPorts` clearing a running run and leaving a finished one;
    - each draft-writing command's resource text and no-op.
  - **Rules for the file:**
    - its inputs, titles and expected values are fixed for the rest of the phase;
    - it is green on the base three runs out of three;
    - `NN-RED-EVIDENCE.md` records it.
- **D-12: The choice rules are tested as plain values in `SeededChoice.test.ts`, with no Effect, no scope and no
  store.**
  - **Every rule in D-02..D-06** has a row, each title stating its input.
  - **No-op rows** assert reference identity.
  - **Tests that move.** The session tests whose subject is one of those rules move there, restated as plain values:
    - the seeding and replaying rules;
    - choosing a policy;
    - the `policyMenu` block;
    - the parts of "a result belongs to the question it answered" that only read `seedOf`.
  - **Tests that stay.** `SimulationSession.test.ts` keeps what is about runs and the form, and a few tests that the
    session reads its choice through the module (one per command that moves it).
  - **A record for each move.** Each moved test is named in the RED evidence with the test that now pins its rule.
- **D-13: Each guarantee is seen failing once.**
  - Gut the pin rule, the orphan rule, the menu order (reverse a leading entry), the reverse lookup, the same-policy
    no-op, `clearRun`'s call from each caller, and the single draft path.
  - Revert each gut with `git checkout`, and record each in the RED evidence.
  - A type guarantee (for example `PolicyChoice`'s arms tied to `HeldChoice`) gets a tstyche pin with a positive
    twin, under AGENTS.md §6's negative-pin rules if it is a negative pin.

### Mutation and records (CHSE-05, WX-02, WX-05)
- **D-14: Mutation base at the phase base, before any source edit.**
  - **Scorer.** `74-mutation.mjs` copies `73-mutation.mjs`'s discipline:
    - base and close records, a clean tree, one head per record;
    - `record close <group> --restart`, and a base is never restarted;
    - the removed-mutant rule;
    - an `EXAMINED` table admitted only after a by-hand `ignoreStatic: false` kill;
    - `--self-test`.
  - **Groups,** through `stryker.devtools.mjs`:
    - `session` = `SimulationSession.ts`;
    - `choice` = `SeededChoice.ts`, which has no base; the scorer treats a file absent at the base as needing every
      mutant killed or examined, and its self-test pins that;
    - `held` = `HeldChoice.ts`, only if a plan edits it.
  - A drop is closed with a test, never re-baselined.
- **D-15: Records.**
  - **ADR-QD-187,** "The simulation session's policy choice is a pure seeded choice":
    - records D-01..D-10 with the rejected options above;
    - states that ADR-QD-137 and ADR-QD-150 are untouched (the session still owns its runs through a scope);
    - states that ADR-QD-047 v1.11 still holds (the menu is read under the session's snapshot; only where it is
      computed moved);
    - states plainly what the compiler enforces (the union arms, the menu option shape) and what only tests enforce
      (the rules, behaviour preserved).
  - **Dated amendments,** only where a record now describes stale structure:
    - ADR-QD-047's v1.11 amendment and BEH-QD-322/466 if they name `leading`, `policyMenuOf` or the cell inside
      the session;
    - ADR-QD-137 and ADR-QD-150 bodies stay unchanged; a pointer note is added only if a sentence there becomes
      false.
    - Never rewrite history.
  - **INV-QD-393:** the seeded choice is a pure value. Its transitions return their input for a no-op, the pin rule
    lives only inside them, and the menu's order is stated by one list that both the menu and its reverse lookup
    read.
  - **INV-QD-394:** the simulation session assigns its draft in one place, and clears its run through one operation.
  - **BEH-QD-706..710,** in `spec/behaviors/29-devtools-simulator.md`:
    - 706: the pin-only-when-unseeded rule;
    - 707: the orphan rule;
    - 708: the menu and its reverse lookup, in one order;
    - 709: the same-policy no-op and the run condition;
    - 710: every draft write through one path and one clear-the-run.
  - Each Pinned-by names test titles that exist verbatim.
  - **CCR-QD-466** cites every revision, names any unused reserved id, and lists every changed file outside
    `.planning/`.
  - **No changeset:** no public name or observable behaviour changes; the CCR row says so.
  - Spec registers are revised only through `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-23`.
  - AGENTS.md is unchanged.

### Claude's Discretion
- **Exact names:** `SeededChoice`, its transitions and readings, the internal menu-entry type, and the draft-write
  function's name.
- **Characterisation layout:** its helper layout and row order within sections.
- **Plan split.** Suggested, strictly serial, one test runner at a time:
  1. base facts, the characterisation, and the mutation base;
  2. ADR-QD-187, its index row, CCR-QD-466 and the amendments;
  3. `SeededChoice.ts` with `SeededChoice.test.ts`, the guts and the type pins;
  4. the session on it, with `clearRun` and the single draft path;
  5. moving the session tests;
  6. records and close.
- **Constraints:**
  - no `as`, `!`, `any`, `switch` or `Record<string, unknown>`;
  - `Match` for tag dispatch where a table is not the form;
  - ~90-column hand wrapping;
  - doc comments lead with a one-line summary and claim only what the compiler or a test enforces;
  - no phase numbers, plan ids, requirement ids or D-numbers in source, tests, titles or spec;
  - a helper with one consumer lives in that consumer.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`HeldChoice.ts`:** `resolveHeld`, `pinHead`, `heldValue`, `heldIndex`. The module builds on these pure functions.
- **`Catalogue.ts`:** `sameSighting`, `sightingFor`. **`Replay.ts`:** `replayInput`, `baselineDiff`.
- **Existing session tests:** `SimulationSession.test.ts`'s fixtures (timeline entries, sightings, ports layers) for
  the characterisation, and `test/dockModelFixtures.ts` / `test/helpers.ts` shared helpers.
- **`DockModel.test.ts`:** reads the simulation half through `policyMenu`. It is a soft edge, and it must stay green
  unchanged.

### Established Patterns
- `ExternalStore`'s `makeExternalStore`: the session publishes once per effective command.
- Package-private model modules stay out of the barrel (ADR-QD-099). The barrel names exports per module (ARCH-40),
  so moving a type's module edits its export line.
- Characterisation first with whole-value comparisons, RED evidence in `NN-RED-EVIDENCE.md`, and mutation base and
  close per phase (Phases 70–73).

### Integration Points
- **The flow:** `useSimulationSession` → `makeSimulationSession` → (new) `SeededChoice` readings and transitions.
- **Tests:** `SimulationSession.test.ts`, `DockModel.test.ts`, and the simulator panel's tests (snapshot readers).
- **Spec:**
  - `spec/decisions/047-*.md` (v1.11 amendment), `137-*.md`, `150-*.md`;
  - `spec/behaviors/29-devtools-simulator.md` (BEH-QD-322, the session's behaviours);
  - `spec/behaviors/28-devtools-screens.md` (BEH-QD-466);
  - `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`, `spec/overview.md` (the barrel names).

</code_context>

<specifics>
## Specific Ideas
- Count notifications through `subscribe` in the characterisation, never through internals. A no-op command
  notifies no one.
- The characterisation exercises `choosePolicyAt` at every position kind against a seeded and an evicted menu,
  because that is where the order was written twice.

</specifics>

<deferred>
## Deferred Ideas
- None. `ExplorerSession`'s use of the cell is outside this phase, and nothing here changes it.

</deferred>
