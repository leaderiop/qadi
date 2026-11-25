# Phase 87: One scoped run that states its stop - Context

**Gathered:** 2026-11-25 (smart discuss, autonomous mode. Every decision below was decided autonomously on 2026-11-25 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". Breaking changes are allowed; source compatibility is never the tiebreaker.)
**Status:** Ready for planning (research flag: plan 1 is a spike plus the RED test)

<domain>
## Phase Boundary

Three devtools stores run a superseding, scope-owned effect and state what stopped it: `TimelineFeed`,
`DiagnosticsFeed` and `SimulationSession`. `SupersedingRun.ts` (ADR-QD-150) already owns the run protocol
(token, closed flag, finalizer, fiber handle, held fork). What each store still restates by hand is the layer above
it: publish-then-fork with ADR-QD-194's `try { publish } finally { fork }`, the token-guarded sink, failure to a
stopped state, `restart`, the closed guard, and (with `GatesFeed`) the `configure` prologue. They also disagree on
two things: the session renders a defect with `String(exit.cause)` (`Cause([Die(...)])`) where the feeds use
`causeMessage(cause)`, and the session reads a run that interrupts itself as `Broke` (SR1) where the feeds leave a
self-interrupted run showing `Reading` / `Live` with nothing running (BEH-QD-519 is silent on it).

Today (code at HEAD `cbe375bf`; none of the files below has changed since `ac7578f3`, so `_WAVE16-CONTEXT.md`'s line
numbers hold):
- `model/SupersedingRun.ts` (143 lines): `begin` / `fork(token, run, hooks?)` / `isCurrent` / `stop` / `closed`.
  `fork`'s `ForkHooks.onFailure` fires only for `isCurrent(token) && Exit.isFailure(exit) && !Cause.hasInterruptsOnly`
  (:114-123). Every outside interruption sees a non-current token: `begin` replaces `current` before the handle
  installs the next run and interrupts the old one, `stop` is `fork(begin(), Effect.void)`, and the close finalizer
  (registered after the handle, so it runs first under the default sequential strategy) sets `current = undefined`.
  Its only `src` callers of `onFailure` are `TimelineFeed.ts:186` and `DiagnosticsFeed.ts:206`.
- `model/TimelineFeed.ts` (216): status union with `Stopped{reason}` (39-51), readout and the ADR-QD-194 rethrow
  paragraph (62-73), idle readouts (138-153), token-guarded sink (175-180), publish-then-fork (182-188), closed-guarded
  restart (192-194), configure prologue (199-205).
- `model/DiagnosticsFeed.ts` (236): the same set at 44-61, 97-111, 122-137, 186-199, 202-212, 231-233, 221-226;
  `Stopped{reason, sampled}`; gate `sameFieldsOrAbsent`.
- `model/GatesFeed.ts` (299): configure prologue at 280-286 with gate `sameFields && watchFailure === undefined`;
  it forks its cadence **before** it publishes (INV-QD-408); `GatesSnapshot` (public) has no stop state.
- `model/SimulationSession.ts` (596): `land` is `Effect.fn("qadi.devtools.simulationSession.run", { root: true })`,
  runs `Effect.exit(program(...))` inside the fiber, returns if `!runs.isCurrent(mine)`, and maps every other
  non-success exit to `{ _tag: "Broke", question, message: String(exit.cause) }` (:391-421); `start` publishes
  `Running` in a `try` and forks in the `finally` (:446-453).
- `react/Simulator.tsx:106-110` renders `Broke.message` in a `<span>`; `react/StoppedBox.tsx:95` holds the
  module-private `reasonStyle` used by the feeds' `<pre>` reason (:154).
- `test/builtFeeds.ts:16-28` writes build-then-configure four times; `react/useConfigured.ts:34` is the hook form.
- `core/src/ThrownMessage.ts:49-51` (doc) and ADR-QD-182 decision 11 bless `String(Cause)` as "the one other
  rendering"; ADR-QD-182 decision 10 lists the stores that use `causeMessage` and does not name the session.

After this phase:
- One package-private module above `SupersedingRun` (working name `model/StatedRun.ts`) owns publish-then-fork through
  a callback, the one stop rule, `restart`, the closed guard and the token-guarded sink; one configure prologue with a
  parameterised gate is stated once. `TimelineFeed` and `DiagnosticsFeed` supply only their engine and their states;
  `SimulationSession` shares publish-then-fork and the stop rule and keeps its own exit read and `land`;
  `GatesFeed` shares only the prologue.
- The Simulator's broken-run text is `causeMessage(cause)`, rendered in the feeds' `<pre>` reason treatment.

ARCH-134. Packages: `@qadi/devtools` (package-private moves plus the Simulator text, the `<pre>` and the feed
self-interrupt stop; patch), `@qadi/core` (`ThrownMessage.ts` doc only; patch, "No export changes."). Records:
ADR-QD-200 (new), CCR-QD-479, BEH-QD-771..775, INV-QD-419..420, with dated amendments of ADR-QD-150 (note, not a
reversal), ADR-QD-182 (decisions 10 and 11), ADR-QD-192, ADR-QD-194 and BEH-QD-519 / BEH-QD-507 / BEH-QD-637 /
BEH-QD-461 where the self-interrupt rule touches them.

Evidence: the code at HEAD; `.planning/phases/_WAVE16-CONTEXT.md` §Phase 87; `.planning/research/` (SUMMARY §Phase 87,
PITFALLS 87-A..F, FEATURES §87.1-87.6, STACK §Phase 87 and Trap A); ADR-QD-150, 182, 192, 194; BEH-QD-519, 507, 637,
521..525, 461, 636, 742..745; INV-QD-313, 403, 404, 408.
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (carried forward from Phase 85; not re-decided)
- **D-01:** Work on branch `arch-wave-16` only, one phase at a time, on the main tree. No merge, push, tag, release,
  publish, `changeset version` or version-packages PR (WX-07). Never `git add -A` under `.planning/milestones`; never
  stage `.planning/config.json`, `README.md`, `.agents/`, `.codex/`, `.planning/state.json`, `assets/` or `*.iter*.md`.
- **D-02:** Use only the reserved records: ARCH-134, ADR-QD-200, CCR-QD-479, BEH-QD-771..775, INV-QD-419..420. Never
  run `node scripts/next-id.mjs`. An unused reservation is named in the CCR row ("Unused: …"). Pass `--date 2026-11-25`
  (or the real edit date) to `scripts/spec-revise.mjs`.
- **D-03:** Every behaviour change is preceded by a test written on the phase base (RED there for a change, green for
  preserved behaviour), and every new check is shown failing once, with the scratch variant and failing text recorded
  in `87-RED-EVIDENCE.md` (WX-06). `pnpm check:pr < /dev/null` is green at the phase end (WX-01).
- **D-04 (wave changeset policy):** one `.changeset/*.md` per edited public package. Phase 87 ships a `@qadi/devtools`
  **patch** (the Simulator's broken-run text is `causeMessage`'s and is shown as a preformatted block; a timeline or
  diagnostics run whose own work interrupts itself now reads stopped, if D-08 holds; "No export changes.") and a
  `@qadi/core` **patch** for the `ThrownMessage.ts` doc ("No export changes."). Not Breaking: no public name, tag or
  shape moves (`Broke`, `TimelineStatus`, `DiagnosticsStatus`, `GatesSnapshot` unchanged).
- **D-05:** Every commit ends with exactly one trailer line, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  (the phase's `trailers` check judges every commit since `phase_base`).

### Area 1: The module's shape
- **D-06 (home and name):** a new package-private `packages/devtools/src/model/StatedRun.ts` (out of the barrel,
  ADR-QD-099), composing the unchanged `makeSupersedingRun`. The planner may rename it if research finds a clearer
  name; it must not be folded into `SupersedingRun.ts` (ADR-QD-150's protocol stays its own module).
- **D-07 (what it owns):** publish-then-fork as `start(publish, engine)`, which is `const token = runs.begin(); try {
  publish(token) } finally { runs.fork(token, body(token, engine)) }` and nothing more (ADR-QD-194: a listener's throw
  on the start-up publish is rethrown after the new run has started, by identity, once); the token-guarded sink (a
  write from a run that is no longer current is dropped); the stop rule (D-08); `restart` (re-runs the last engine,
  a no-op once closed); the closed guard. The store supplies its engine and its state constructors (idle, starting,
  stopped-from-reason). No one-call `run(effect)` that publishes inside the module (ADR-QD-150 rejected it: nothing
  could publish between begin and fork). The factory is an unnamed `Effect.fn` (no child span on a store build,
  ADR-QD-150 decision 1; no `Effect.fnUntraced`, `UNTRACED_BUDGET`), and building it stays synchronous.
- **D-08 (one stop rule, the feeds' self-interrupt policy: changed):** a current, unclosed run whose engine exits with
  anything but success is stopped, and the stop is stated with `causeMessage(cause)`, interrupt-only causes included.
  The module reads the engine's exit with `Effect.exit` inside the forked body and gates the write with `isCurrent`
  afterwards, exactly as `land` does. So a timeline source or diagnostics collector that interrupts itself now reads
  `Stopped` instead of showing `Reading` / `Live` with nothing running, and the session's SR1 (`Broke`) is the same
  rule, not an exception. Reason: one rule for three runs, and it closes a window where a feed looks live while
  nothing runs (the library's core value: never silent). An interruption from outside (supersede, `stop`, a new
  source, no source, a capacity change, a release that dies, the scope closing) never states a stop, because each one
  replaces or clears `current` before it interrupts (see the domain notes). **Condition, checked by the spike:** if
  the spike finds any outside interruption that is still current when the run's exit is read, the feeds keep today's
  rule (interrupt-only is not a stop), the BEH says so, and the session keeps its exit read as its own documented
  exception. Either way the outcome gets its own test and an ADR-QD-200 line (STOP-04).
- **D-09 (`ForkHooks.onFailure`):** if D-08 holds, `onFailure` has no `src` caller after the move. A package-private
  hook nothing calls is dead API: remove it from `SupersedingRun.ts` in this phase and re-home the properties its rows
  pin (R3, R6, R9 and model law 5 in `SupersedingRun.test.ts`: an interruption, a superseded run and a closed run are
  never stated) as the new module's tests, with an audit table in ADR-QD-200 naming each edited or removed row and the
  test that now holds its property ("no property lost"). If D-08's condition fails, `onFailure` stays and
  `SupersedingRun.ts` is unchanged. ADR-QD-150 gets a dated note either way.
- **D-10 (the prologue):** one configure prologue, stated once, taking the rule as parameters: `closed` (guard first: a
  configure after the scope closed reads and publishes nothing, even for input the normaliser would refuse,
  BEH-QD-636), `complete` (the normaliser, which throws a refused capacity before anything moves, ADR-QD-191 d11),
  `same` (the identity gate), then `held = wanted`, then the steps (which read `held` when they run, so a nested
  configure decides). Timeline passes `sameFields`; diagnostics passes `sameFieldsOrAbsent`; gates passes
  `(a, b) => sameFields(a, b) && watchFailure === undefined`. `GatesFeed` keeps forking before it publishes
  (INV-QD-408) and gains no status. Whether the prologue lives in `StatedRun.ts` or its own small module is the
  planner's call (gates must not import a run it does not have).
- **D-11 (the session):** `SimulationSession` uses the module's publish-then-fork and stop rule, keeps `land` as
  `Effect.fn("qadi.devtools.simulationSession.run", { root: true })`, keeps its own exit read (success to `Ran`,
  anything else of a current run to `Broke`), and `Broke.message` becomes `causeMessage(exit.cause)`. `Broke`'s shape
  and the `run` / `Refused` paths are unchanged.
- **D-12:** the readout doc, the ADR-QD-194 rethrow paragraph and the `Stopped{reason}` doc move to the module (one
  copy); each feed's states stay its own public type (`sampled` differs; no merged status type).

### Area 2: The Simulator
- **D-13 (`<pre>` treatment: taken):** the Simulator's `Broke` box renders `broke.message` in a `<pre>` with the same
  style as `StoppedBox`'s reason and the same accessible shape (a focusable, labelled scroll region). `reasonStyle`
  moves to `react/theme.ts` as a named export and `StoppedBox.tsx` imports it, so its render is byte-identical. The
  heading text and `data-testid="qadi-simulator-broke"` stay. Reason: the message is now a multi-line `Cause.pretty`
  trace, and a `<span>` collapses it. Pinned in a new Simulator test file. This is a reuse of an existing treatment,
  not a new design: the phase's UI hint stays "no" and no UI-SPEC is written.
- **D-14:** `restart` on a bare timeline feed (no source) stays an empty read, unchanged and characterised.

### Area 3: Characterisation, tests and measurement
- **D-15 (plan 1: spike plus RED):** plan 1 records the phase base and the mutation base, runs the spike (D-08's
  condition: every outside interruption seen non-current, and what a self-interrupt does today in each run), writes
  the RED test (a session run that dies reports `Broke.message === causeMessage(cause)`, plus a hostile-value case
  that yields the placeholder, never `Cause(`), seen RED on the base with the failing text in `87-RED-EVIDENCE.md`,
  and a characterisation of each feed's status sequence including today's self-interrupt (green on the base). If D-08
  holds, the feeds' self-interrupt rows are written as RED-on-base tests of the new rule in a new file, and today's
  behaviour is recorded in the evidence file.
- **D-16 (held tests):** every existing `packages/devtools` test file is held byte for byte by a pinned check, except
  `test/builtFeeds.ts` (D-18) and, only if D-09 removes `onFailure`, `test/model/SupersedingRun.test.ts` (its edited
  rows audited per D-09). TF21-23, TF28, F28-31, F33, SR1, SR5-6 are held unedited in every case. New tests go in new
  files.
- **D-17 (the row nobody has):** a start-up publish whose listener throws **and** issues a superseding command from
  the same listener, in one run: the throw is rethrown once, by identity, after the fork; the superseding command's
  run is the one that is live; the first run never writes.
- **D-18 (build-then-configure):** the four copies in `test/builtFeeds.ts` collapse into one generic helper in that
  file; `react/useConfigured.ts` (the hook) is unchanged.
- **D-19 (mutation):** `stryker.devtools.mjs` already mutates `src/model/**`, so the new module is measured. A base
  record (`87-mutation-base.json`) is taken first on the phase base for `SupersedingRun.ts`, the three feeds,
  `SimulationSession.ts` and `GatesFeed.ts`; at close, moved code is compared as the sum of killed / total of its
  source files against its destination (a `RENAMED` map), and no touched file's score may fall. A drop is closed
  with a test, never re-baselined; every equivalent survivor is recorded with its reason.
- **D-20 (phase scripts):** the Phase 85/86 pattern: `87-check.mjs` (base, trailers, scan-ids, scan-forbidden, a
  shape judge for the module and the feeds, records), `87-pinned-check.mjs`, `87-mutation.mjs`,
  `87-earlier-checks.mjs` (Phases 85 and 86 checks run from scratch copies), each with a self-test and each mode seen
  failing once.

### Area 4: Records
- **D-21:** ADR-QD-200 applies, and does not reopen, ADR-QD-150 point 2 (the callback is what lets a store publish
  between `begin` and `fork`); extends ADR-QD-182 decision 10 to the session and amends decision 11's "String of a
  Cause is the one other rendering" sentence and `ThrownMessage.ts`'s matching paragraph in the same commit (the
  `v4-api-smoke` canary stays: three core report sites still rely on `String(cause)` never throwing); amends ADR-QD-192
  (the prologue) and ADR-QD-194 (the ordering stated once, in the module); records D-08's outcome and, if taken, D-09's
  audit table. BEH-QD-771..775 and INV-QD-419..420 state the module, the stop rule, the prologue, the session's
  message and the Simulator's `<pre>`; BEH-QD-519 (and BEH-QD-507 / 637 / 461 as needed) are restated for the
  self-interrupt rule; traceability and the CCR-QD-479 row move with them.

### Claude's Discretion
- The module's exact exported names and the parameter record's field names.
- Whether the prologue is a function in `StatedRun.ts` or a sibling module (D-10).
- The `<pre>`'s accessible label text (D-13), as long as it is labelled and focusable like `StoppedBox`'s.
- Plan count and wave split, as long as plan 1 is the spike plus RED and the tracer task is verified before expansion.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `makeSupersedingRun` (`model/SupersedingRun.ts`): the protocol underneath, unchanged except for D-09.
- `causeMessage` (`@qadi/core`, `ThrownMessage.ts:53`): `Cause.pretty`, falling back to `thrownMessage(Cause.squash(cause))`
  when pretty throws; already used at four devtools sites.
- `sameFields`, `sameFieldsOrAbsent`, `completeInputs` (the feeds' input helpers) for the prologue.
- `StoppedBox.tsx`'s `<pre>` reason block and `reasonStyle` for D-13; `theme.ts` already exports `panel`, `heading`,
  `colors`.
- Phase 85/86 phase scripts (`85-check.mjs`, `86-check.mjs`, `86-pinned-check.mjs`, `86-mutation.mjs`,
  `86-earlier-checks.mjs`) as the pattern for D-20.

### Established Patterns
- `try { publish } finally { fork }` at three sites (ADR-QD-194); a repeat publish of the same status identity
  notifies nothing (`READING`, `diagnosticsStarting`, `diagnosticsOff` constants).
- Stores built with `Effect.runSync` through `useScoped`: builds stay synchronous.
- The session's `land` is the one `root: true` span; store builds are named `Effect.fn` spans; `makeSupersedingRun`
  is unnamed.

### Integration Points
- `TimelineFeed`, `DiagnosticsFeed`, `GatesFeed`, `SimulationSession` and their `status` / `restart` / `configure` are
  public root exports (`test/surface.test.ts`); all stay.
- `useTimeline`, `useDiagnostics`, `useSimulationSession`, `useConfigured` consume them; `TimelineNotice` /
  `DiagnosticsNotice` / `StoppedBox` render `Stopped`; Phase 88 rewrites `StoppedBox`'s keying next, so this phase
  must not change `Stopped`'s shape or identity rules.
</code_context>

<specifics>
## Specific Ideas
- The RED test's title says "uniform with the feeds", not "fixes a defect": `String(cause)` never throws (PITFALLS
  87-A); this is an inconsistency, and the patch changeset says so.
- Existing pins hold under the new rendering: `SimulationSession.test.ts:1358` and `Simulator.test.tsx:583` assert
  `"the layer exploded"`; SR1 asserts `"Interrupt"` (the pretty text of an interrupt contains `InterruptError`).
- The reason text never enters a sink record, response, log or metric (BEH-QD-519, ADR-QD-182 d4): in-memory
  snapshot only.
</specifics>

<deferred>
## Deferred Ideas
- Merging `TimelineStatus` and `DiagnosticsStatus` into one public type: rejected (public types, `sampled` differs).
- Routing `GatesFeed`'s cadence through publish-then-fork: rejected (INV-QD-408).
- `StoppedBox` keying and the announce-once rule: Phase 88.
</deferred>
