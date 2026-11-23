# Phase 71: Developer-signal reporters resolved through one table - Context

**Gathered:** 2026-11-22
**Status:** Ready for planning

<domain>
## Phase Boundary

`@qadi/react`'s `DeveloperSignals.ts` resolves every developer-facing reporter through four hand-written resolvers
(`hydrationMismatchReporter`, `gateIdCollisionReporter`, `hydrationDropReporter`, `providerSignalReporter`). The first
three restate one rule: a supplied reporter is wrapped by `contain` so its throw is announced as `ReporterThrew` and
swallowed; with none, the console default runs in development only; otherwise nothing. The fourth has its own rule: the
development check sits inside each branch, and `InstrumentedInProduction` speaks in production once per process,
behind the module-scope `let warnedInstrumentedInProduction` (`DeveloperSignals.ts:394`).

**Live defect (SIGR-01).** `ReporterName` (`:103`) is a hand-kept list, and the name a throw is reported under is fixed
per resolver, not per entry point. `makeGateRegistry({ onIdCollision })` (`GateRegistry.ts:57`, resolved at `:72`)
resolves through `gateIdCollisionReporter`, which contains under `"onGateIdCollision"` (`:276`), the name of
`makeQadiAtoms`' forwarding option (`QadiAtoms.ts:194`, forwarded at `:248`). A direct `makeGateRegistry` caller whose
reporter throws is told about an option they never passed.

Resolution timing varies, and stays as it is: once per atom set (`QadiAtoms.ts:246`), once per registry
(`GateRegistry.ts:72`), once per call (`HydrationEngine.ts:478, 663`), and on every report in `QadiProvider.tsx:210`
(read through a ref so an inline callback stays current).

This phase delivers one table, total over the developer-signal union, that states for each signal where its default
speaks, how often, when its reporter is resolved and the option name each entry point reports it under; every
resolver reads it, `ReporterName` is derived from it, and a supplied reporter's throw names the option the caller
actually passed. Every other observable behaviour is unchanged.

**In scope:** `packages/react/src/DeveloperSignals.ts`, `GateRegistry.ts`, `QadiAtoms.ts` (the forwarding),
`HydrationEngine.ts` (the two reporter call sites, `:478` and `:663`), `QadiProvider.tsx` (its resolver call, if its
shape changes), react tests, `scripts/check-house-style.mjs` (one new budget, D-01), AGENTS.md (§13's wording and the
new budget's table), spec records.

**Out of scope:** the signals' sentences (`describeSignal`), the containment rule itself (ARCH-60), the hydration
planners and bucket records (Phase 70, closed), any public export (the barrel stays at 941; `check-api-surface`).

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE13-CONTEXT.md`)
- **D1 (scope):** all eight review candidates become phases. **D2 (branch):** `arch-wave-13`, no merge, no release.
- Strictly serial; reserved numbers only (ADR-QD-184, CCR-QD-463, BEH-QD-691..695, INV-QD-387..388); **never run
  `node scripts/next-id.mjs`**.

### The AGENTS.md §13 question (decided autonomously, 2026-11-22, under the owner's instruction "do not ask me; always pick the most complete and clean solutions… Qadi should be very clean")
- **D-01: The production-instrumentation latch stays process-scoped, and becomes a recorded, enforced exception.**
  - Why not under the atom set: SIGR-04 freezes the observable rule, and the rule is "once per process, however many
    providers mount" (`QadiProvider.tsx:172-174`, BEH in `09-react.md`). An atom set or a provider is narrower than a
    process, so moving the latch there changes what a page prints. A `QadiProvider` can also be handed a registry and
    atom sets it did not build, so neither owns the process.
  - Why not a provider ref: a supplied reporter already gets once-per-mount (`reportedInstrumented`); the console
    default's point is one line per bundle, which a per-mount latch cannot give.
  - **How it is recorded:** the signal table states `InstrumentedInProduction`'s default as "production, once per
    process", and names the latch as the one piece of process state. AGENTS.md §13's sentence "No module-scope state
    is left in this package" is corrected in place to name this one exception and point at the budget, keeping its
    history the house's way (a superseded claim kept, with the correction).
  - **How it is enforced:** a new `scripts/check-house-style.mjs` budget, `MODULE_STATE_BUDGET`: a module-scope
    `let` or `var` in `packages/*/src` is counted per file and allowed only in the files listed, checked in both
    directions like `UNTRACED_BUDGET` (a new one fails; the count silently dropping fails), with its AGENTS.md table
    (§6, with the other budgets) checked against the budget the way `[untrusted-decode-table]` is. Today it has exactly
    one entry: `packages/react/src/DeveloperSignals.ts`: 1. The rule is shown failing once (a planted second `let` in a
    scratch copy, or the script's self-test if it has one), per WX-06. Whether a module-scope `const` holding a
    mutable container (`new Map`, `new WeakMap`) also counts is the planner's call, constrained to: it must not flag
    `Policy.ts`'s `depthMemo` cache or the read-only lookup tables unless each is listed with a reason; the simplest
    complete rule is `let`/`var` only, and that is the default.
  - ADR-QD-184 records D-01 with the rejected options.

### The table (SIGR-02, SIGR-03)
- **D-02: One table, keyed by the developer-signal union, total.** A record over `DeveloperSignal["_tag"]`, so a new
  signal without a row is a compile error (TS2741), in the same way ADR-QD-152 and ADR-QD-183 use reason-keyed
  records. Each row states:
  - **where the default speaks:** development, or production (only `InstrumentedInProduction`), or every environment
    (only `ReporterThrew`, which is never routed to a supplied reporter);
  - **how often the default speaks:** per event, or once per process (only `InstrumentedInProduction`);
  - **when the reporter is resolved:** once per atom set, once per registry, once per call, or on every report;
  - **the option name each entry point reports it under**, per entry point: `SeedSuperseded` → `makeQadiAtoms`:
    `onHydrationMismatch`; `GateIdCollision` → `makeQadiAtoms`: `onGateIdCollision`, `makeGateRegistry`:
    `onIdCollision`; `DehydrationDropped` → `dehydrateDecisions`: `onDropped`; `HydrationDropped` →
    `hydrateDecisions`: `onDropped`; the three provider signals → `QadiProvider`: `onDeveloperSignal`;
    `ReporterThrew` → none.
  - the signal's console default (the `says…` function), so a call site cannot pair a slot with the wrong default.
- **D-03: `ReporterName` is derived from the table** (the union of every row's option names), never hand-kept. The
  `ReporterThrew` member carries a derived name.
- **D-04: One resolver.** Every reporter is resolved by one generic function that reads a row: given the signal (or the
  row's entry point) and what the caller supplied, it returns the contained supplied reporter under the row's option
  name for that entry point, or the row's default under the row's condition, or nothing. The four exported resolver
  names may stay as thin, typed projections of it if that reads cleaner, or be replaced; the constraint is that no rule
  (containment, the development check, the once-per-process latch) is written twice. `providerSignalReporter` keeps
  never returning `undefined`, and the table says why (the provider detects each situation itself; the default decides
  per signal).
- **D-05: The entry point decides the name (the SIGR-01 fix).** `makeGateRegistry({ onIdCollision })` reports a throw
  as `onIdCollision`; `makeQadiAtoms({ onGateIdCollision })` keeps reporting it as `onGateIdCollision`. The mechanism
  is the planner's, constrained to: no change to `GateRegistryOptions` or any other public type (barrel 941 exports,
  `spec/overview.md` unchanged), no double containment that would announce one throw twice, and no `as`/`!`/`any`.
  Candidates: the atom set resolves its own reporter through the table and hands the registry an already-resolved
  reporter through a package-private constructor that the barrel does not reach (the barrel `export *`s
  `GateRegistry.ts`, so a package-private helper lives in a module the barrel does not re-export); or the registry's
  resolution takes the entry point from a package-private argument.
- **D-06: The `HydrationEngine` call sites keep their pairing by construction.** `leftOut` is resolved from the
  `DehydrationDropped` row (default `saysDehydrationDropped`) and `dropped` from the `HydrationDropped` row (default
  `saysHydrationDropped`); the `byDefault` argument either disappears into the row or is typed so the wrong default
  does not compile.
- **D-07: Timing is stated, not changed.** Every resolution stays where it is today (D-01's latch, the atom set's once,
  the registry's once, the per-call hydration resolutions, the provider's per-report resolution through its ref), and
  the table's row says which.
- **D-08: Home.** The table and the resolver live in `DeveloperSignals.ts`, which stays the only file exempt from
  `no-ambient-console`. If the table is split out, the new file reaches for neither `console` nor `process.env`, and is
  package-private.

### Tests (SIGR-01, SIGR-04, WX-06)
- **D-09: Characterisation first, on the phase base, green.** A table test that pins, for every (entry point, option)
  pair in D-02 and every relevant environment (development, production):
  - with no reporter: the exact console lines (or none);
  - with a supplied reporter that returns: what it is called with, and no console line;
  - with a supplied reporter that throws: the exact `ReporterThrew` line, in every environment, and that the outcome
    stands (the registry still lists both guards, the seeds and counts are what they would have been);
  - `InstrumentedInProduction`: one console line per process across two providers mounted in sequence (with the latch
    reset between test files the way the existing production test does), once per mount for a supplied reporter;
  - `AtomsReplaced` and `UnwritableGateRegistry`: development-only console default, supplied reporter in production.

  Existing tests (`DeveloperSignals.test.ts`, `QadiProvider.signals.test.tsx`, `QadiProvider.production.test.tsx`,
  `GateRegistry.test.tsx`) already pin much of this; the characterisation adds only what is unpinned and names the
  existing test for the rest. The one row excluded is the `makeGateRegistry({ onIdCollision })` throw, which is
  D-10's RED test. It stays green unchanged after the phase (SIGR-04).
- **D-10: RED, shown failing once.**
  1. **Behaviour (SIGR-01):** `makeGateRegistry({ onIdCollision: () => { throw … } })` with a colliding registration
     reports a line naming `onIdCollision`. RED on the base (it names `onGateIdCollision`), green after. A sibling row
     through `makeQadiAtoms({ onGateIdCollision })` naming `onGateIdCollision` is green on both, so the fix is seen
     not to move the atom set's name.
  2. **Type level (tstyche):** a pin that the table is total over the signal union (a missing row is a compile error,
     shown with `@ts-expect-error … is missing` and a positive twin) and that `ReporterName` equals the union of the
     table's option names. Written on the base, it fails there (no table). Any negative `toBeCallableWith` pin updates
     `NOT_CALLABLE_PIN_BUDGET` and the AGENTS.md §6 table together.
  3. **The new budget (D-01)** shown failing once on a planted second module-scope `let`, recorded with its command and
     first output line in `71-RED-EVIDENCE.md`; the plant is never committed.

### Mutation and records (WX-02, WX-05)
- **D-11:** Mutation base at the phase base, before any edit, on every source file the phase will touch
  (`DeveloperSignals.ts`, `GateRegistry.ts`, `QadiAtoms.ts`, `HydrationEngine.ts`, `QadiProvider.tsx` if touched),
  with the scorer discipline of `70-mutation.mjs` (base and close records, clean tree, single head per record, the
  removed-mutant rule, `EXAMINED` admitting an Ignored mutant only after a by-hand run kills it). A new file is
  close-only with no open mutant. A drop is closed with a test, never re-baselined.
- **D-12: Records.**
  - **ADR-QD-184:** extends ADR-QD-041 (one confinement point for console and `process.env`) and ADR-QD-052 (each
    hydration end reports where both can see it); records D-01..D-07 with the rejected options.
  - **INV-QD-387:** every developer signal has exactly one row stating where its default speaks, how often, when it is
    resolved and the option each entry point reports it under, and a supplied reporter's throw is reported under the
    option the caller passed.
  - **INV-QD-388:** the library holds exactly one piece of module-scope mutable state, the production-instrumentation
    latch in `DeveloperSignals.ts`, enforced by `MODULE_STATE_BUDGET`.
  - **BEH-QD-691..695:** across `spec/behaviors/09-react.md` (provider and atom-set signals) and
    `spec/behaviors/19-hydration.md` / `28-devtools-screens.md` (where `onDropped` and `onIdCollision` are described),
    one per observable rule: the table and its totality, the derived name and the SIGR-01 fix, the per-signal default
    condition, the once-per-process latch as the recorded exception, the unchanged timing. An unused id is named in
    the CCR row.
  - **CCR-QD-463:** cites every revision it makes. Traceability rows; one `@qadi/react` patch changeset (the
    `ReporterThrew` message for a direct `makeGateRegistry` caller changes).
  - Spec registers are revised only through `scripts/spec-revise.mjs --date 2026-11-22`.

### Claude's Discretion
- The table's exact field names and value encodings (string literal unions, a record per entry point), and whether the
  four exported resolver names survive as projections. Constraints: total over the signal union, no cast, a compile
  error on a missing row, byte-identical console text.
- D-05's mechanism, within its constraints.
- Plan split. Suggested waves: base facts, characterisation and RED; mutation base; the table and resolver with the
  three hydration/registry callers; the provider and the latch with the budget and AGENTS.md; records and close. Strict
  serial order, one test runner at a time.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `contain` (`DeveloperSignals.ts:227`), the one containment wrapper; `say` (`:214`), the one console write;
  `describeSignal` (`:153`), the module-scope `Match` giving each signal its sentence.
- `isDevelopment` (`:74`), read by `QadiProvider.tsx:266` too.
- `saysDehydrationDropped` / `saysHydrationDropped` (`:319`, `:325`), the two hydration defaults.
- `providerSignals` (`:379`), the provider's three constructors; `sayProviderSignal` (`:404`), the per-signal default.
- Phase 70's `HydrationBuckets.ts` and `70-mutation.mjs`: the reason-keyed-record and scorer patterns to mirror.

### Established Patterns
- ADR-QD-152 / ADR-QD-183: a record keyed by a closed union is the compile-time guard (TS2741 on a missing key).
- AGENTS.md §5a: a table indexed by a tag its own code wrote needs no `Object.hasOwn`. §6: no `as`, `!` or `any`.
  §13: no React state for decisions; no module-scope state (corrected by D-01).
- House-style budgets: exact per-file counts checked in both directions, with an AGENTS.md table checked against them.

### Integration Points
- `packages/react/src/DeveloperSignals.ts`, `GateRegistry.ts:72`, `QadiAtoms.ts:246-249`, `HydrationEngine.ts:478, 663`,
  `QadiProvider.tsx:207-211, 266-275`.
- Tests: `packages/react/test/DeveloperSignals.test.ts`, `QadiProvider.signals.test.tsx`,
  `QadiProvider.production.test.tsx`, `GateRegistry.test.tsx`, `GateRegistry.store.test.ts`.
- Spec: ADR-QD-041, ADR-QD-052, `spec/behaviors/09-react.md`, `19-hydration.md` (BEH-QD-230 and the `ReporterThrew`
  lines near `:529`, `:749`), `28-devtools-screens.md` (`onIdCollision` near `:459`, `:544`), `spec/invariants.md`.
- `scripts/check-house-style.mjs` (new `MODULE_STATE_BUDGET`; `no-ambient-console` exemption at `:356` unchanged).

</code_context>

<specifics>
## Specific Ideas

- The success test for the phase: on the closed tree, adding a throwaway member to `DeveloperSignal` produces a compile
  error at the table naming the missing row, and a direct `makeGateRegistry` caller whose reporter throws reads its own
  option name in the message.

</specifics>

<deferred>
## Deferred Ideas

None. The §13 question, the only open one, is decided (D-01).

</deferred>
