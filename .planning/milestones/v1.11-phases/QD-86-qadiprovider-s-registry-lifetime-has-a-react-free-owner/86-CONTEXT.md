# Phase 86: `QadiProvider`'s registry lifetime has a React-free owner - Context

**Gathered:** 2026-11-25 (smart discuss, autonomous mode. Every decision below was decided autonomously on 2026-11-25 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". Each grey area is recorded with its evidence and the rejected alternatives.)
**Status:** Ready for planning

<domain>
## Phase Boundary

The provider's registry lifetime is decided in two places: `RegistryLease.ts`, a pure state machine that decides *when* a
recycle happens, and the wiring inside `QadiProvider.tsx`, which decides *what* a construction, a commit and a recycle
do. ADR-QD-195's context shows that the second place is where the defects were (a second registry built while hidden,
LT7; a disposed registry on reveal, LT1-LT4), and it is unmeasured, because `QadiProvider.tsx` renders. This phase
moves the wiring into one package-private module that imports no React, composes the unchanged lease, and is tested and
mutation-measured without rendering.

Today (code at HEAD `b0fc13f3`; `packages/react/src` last changed by `ac7578f3`, which merged Phase 82):
- `packages/react/src/QadiProvider.tsx` (359 lines) holds **six refs**: `signalRef` (:228), `registryRef` (:238),
  `atomsIdentityRef` (:259), `latestRef` (:269), `leaseRef` (:281), `reportedInstrumented` (:314). It has **six
  `useEffect` calls** in this declaration order: atoms identity on `[atoms]` (:260-263, reports `AtomsReplaced`), latest
  on `[atoms, subject]` (:270-272), subject write on `[registry, atoms, subject]` guarded by
  `registry.get(atoms.subject) !== subject` (:304-308), `InstrumentedInProduction` on `[instrument]` (:315-324),
  `UnwritableGateRegistry` on `[instrument, gates]` (:326-330), and hold/release on `[lease]`, declared last (:336-339).
  (The wave file's "seven effect hooks" counts one more than the source has: six `useEffect` and three `useMemo`, :222,
  :343, :350.)
- Construction is `registryRef.current ??= AtomRegistry.make({ initialValues: [[atoms.subject, subject] as const,
  ...(initialValues ?? [])] })` (:239-244); the lease is `leaseRef.current ??= makeRegistryLease(() => { try {
  registry.reset(); } finally { registry.set(latestRef.current.atoms.subject, latestRef.current.subject); } })`
  (:282-288), with the lease's default defer.
- `atomsIdentityRef` and `latestRef.current.atoms` always hold the same object: both start from the first render's
  `atoms` and both are rewritten with the committed `atoms` in an effect. One datum lives in two refs.
- `packages/react/src/RegistryLease.ts` (85 lines): closed `Unheld | Held | Releasing{cancel}` union, injected
  `LeaseDefer` (default `timeoutDefer`, `setTimeout(run, 0)` resolved from the global at call time, :35-40), matchers
  built per lease (:60-76). It is in `stryker.react.mjs`'s `mutate` list (:62), 28/28 killed at Phase 82's close.
- A throwing `onDeveloperSignal` never reaches an effect: `providerSignalReporter` → `reporterFor` → `contain`
  (`DeveloperSignals.ts:552-556`, :503-508, :234-242) catches it and raises `ReporterThrew`. So a report inside a commit
  cannot abort the commit's other writes.
- `AtomRegistry`'s `setValue` returns early on an equal value (`node_modules/.pnpm/effect@4.1.2/node_modules/effect/dist/reactivity/AtomRegistry.js`
  :637-646, `this.atom.equals(this._value, value)`), so the provider's `!== subject` guard decides nothing the registry
  does not already decide.
- React 19.3.1 wraps a fiber's whole passive-effect list in one `try` (`react-dom-client.development.js:13735-13790`,
  `commitHookEffectListMount`), so the provider's effects run in declaration order and stop together.

After this phase:
- A new package-private `packages/react/src/RegistryOwner.ts` exports `makeRegistryOwner`: it builds and seeds the
  registry, holds the latest committed `{ atoms, subject }`, detects an atom-set swap, writes the subject, composes
  `makeRegistryLease` over its recycle, and exposes `registry`, `commit`, `hold` and `release`. It imports neither React
  nor the provider, and constructing it schedules nothing.
- `QadiProvider` keeps one lifetime ref (the owner, built lazily in render where `registryRef` is today), one commit
  effect declared first, the two instrumentation effects, and the hold/release effect declared last. It holds no branch
  of lifetime logic.
- `RegistryLease.ts` and every existing test file are byte-for-byte unchanged.

ARCH-133. Package: `@qadi/react` (package-private change; gate 13 stays at the Phase 85 close figure, gate 14 unmoved).
Records: ADR-QD-199 (new), CCR-QD-478, BEH-QD-766..767, INV-QD-417..418, BEH-QD-768..770 named unused, with a dated
amendment of ADR-QD-195 and BEH-QD-747..750, BEH-QD-067, INV-QD-409/410 restated.

Evidence: the code at HEAD; `.planning/phases/_WAVE16-CONTEXT.md`; `.planning/research/` (SUMMARY §Phase 86 and "Where
the researchers disagree"; ARCHITECTURE §Phase 86; FEATURES §86; PITFALLS 86-A..E; STACK §Phase 86); ADR-QD-195;
`spec/behaviors/09-react.md` BEH-QD-746..750; `spec/invariants.md` INV-QD-409/410.
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (carried forward from Phase 85; not re-decided)
- **D-01:** Work on branch `arch-wave-16` only, one phase at a time, on the main tree (`use_worktrees` is false). No
  merge, push, tag, release, publish, `changeset version` or version-packages PR (WX-07). Never `git add -A` under
  `.planning/milestones` (untracked `*.iter*.md` review backups exist there); never stage `.planning/config.json` or
  `README.md`.
- **D-02:** Use only the reserved records: ARCH-133, ADR-QD-199, CCR-QD-478, BEH-QD-766..770, INV-QD-417..418. The
  reservation file (`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`) already covers them (CCR 483, ADR 204,
  BEH 795, INV 428). Never run `node scripts/next-id.mjs`. An unused reservation is named in the CCR row ("Unused: …").
  Pass `--date 2026-11-25` (or the real edit date) to `scripts/spec-revise.mjs`.
- **D-03:** Every behaviour-preserving move is preceded by a characterisation written on the phase base (green there and
  after), and every new check is shown failing once, with the scratch variant and the failing text recorded in
  `86-RED-EVIDENCE.md` (WX-06). `pnpm check:pr < /dev/null` is green at the phase end (WX-01).
- **D-04 (wave changeset policy, from Phase 85):** one `.changeset/*.md` per edited public package. Phase 86 ships one
  `@qadi/react` **patch** saying the provider's registry lifetime is now kept by one internal module, that nothing a host
  renders, receives or calls changes, and "No export changes." Not Breaking: no public name or shape moves.

### Area 1: The owner's shape
- **D-05 (one module, composing the lease):** new `packages/react/src/RegistryOwner.ts`, exporting
  `makeRegistryOwner(seed: { atoms, subject, initialValues }, defer?: LeaseDefer): RegistryOwner` and the
  `RegistryOwner` interface `{ registry, commit, hold, release }`. It composes `makeRegistryLease(recycle, defer)` and
  does not restate the lease: `RegistryLease.ts`, its doc comment, its tests and its `mutate` entry are unchanged (its
  throwing-`defer` and throwing-`recycle` properties must stay one machine with one test set; PITFALLS 86-E). Out of
  the barrel and not re-exported from `QadiProvider.tsx` (the barrel does `export * from "./QadiProvider.tsx"`,
  `src/index.ts`), so gate 13 and `QadiProvider.tst.ts` do not move (ADR-QD-099). Its state is closure state inside the
  factory (`MODULE_STATE_BUDGET` stays at its one row). It passes neither `scheduleTask` nor `defaultIdleTTL` to
  `AtomRegistry.make` (AGENTS.md §13, ADR-QD-014/148) and never calls `dispose()` or the sweep (ADR-QD-195 d1, d6).
  The `initialValues` iterable is spread into an array before `make` (consumed once; STACK §86).
  Name decided: `RegistryOwner` sorts beside `RegistryLease.ts` (the ROADMAP's "beside `RegistryLease.ts`").
  Rejected: `ProviderRegistry.ts` (ARCHITECTURE's suggestion; reads as "a registry of providers" beside `GateRegistry`
  and `AtomRegistry`); folding the lease into the owner (merges two concerns with different test seams, would rename a
  file Stryker names by path, and the ROADMAP and PREG-02 require the lease unchanged).
- **D-06 (inert at construction):** `makeRegistryOwner` builds and seeds the registry and builds the lease, and calls
  nothing else: no `defer`, no subscription, no timer. Only `release` reaches `defer` (through the lease). So a render
  React discards and a server render (no effects) leave nothing scheduled (PITFALLS 86-A, ADR-QD-195 d1). The seed order
  is kept: `[[atoms.subject, subject], ...initialValues]`, so an `initialValues` entry for `atoms.subject` still wins
  at construction, as today (:240-243).
- **D-07 (recycle body):** the owner's recycle is today's body verbatim in meaning: `registry.reset()` called through
  the property at recycle time, then, in a `finally`, `registry.set(latest.atoms.subject, latest.subject)` from the
  owner's closure state. Calling through the property matters: LT18 replaces `registry.reset` on the instance with
  `vi.spyOn` after mount and must keep reaching it. The provider passes **no** `defer`, so the lease keeps its default
  `timeoutDefer`, which resolves `setTimeout` from the global at call time; LT18's `setTimeout` spy depends on that.
  Neither `initialValues` nor a seed is written back (ADR-QD-195 d5, ADR-QD-039).

### Area 2: One commit effect, and where `AtomsReplaced` detection lives (the researchers' disagreement)
- **D-08 (one commit effect, not three):** the owner exposes one `commit(atoms, subject, onAtomsReplaced)`, and the
  provider calls it from **one** effect on `[owner, atoms, subject]`, declared **first** (where the atoms-identity
  effect is today), followed by the two instrumentation effects unchanged, followed by hold/release on `[owner]`,
  **declared last**. Four `useEffect` calls in all. "Commit before hold, hold last" (ADR-QD-195 d3) holds by
  declaration order, and React's single `try` per fiber means nothing new can run between them.
  Why one: the rule "what a commit does" (detect the swap, record the latest, write the subject) is lifetime logic; with
  three effects its order stays in the component, unmeasured, and the owner's three methods would be correct only when
  called in an order only a render test can check. One call states the order once, in the module the mutation run
  measures and the headless tests drive. Merging changes no run condition: the latest and subject effects already ran on
  `[atoms, subject]` (`registry` is stable); the atoms-identity effect now also runs on a subject change, where the
  identity compare makes it a no-op; StrictMode and an `<Activity>` reveal re-run every effect regardless of deps.
  PITFALLS 86-B's actual hazards are each refused here: the commit is never merged into the hold effect, the latest is
  never written in render, the owner never accepts `initialValues` after construction.
  Rejected: three ordered effects over `setLatest` / `writeSubject` / a detection call (PITFALLS 86-B; keeps lifetime
  ordering in an unmeasured file and three refs' worth of protocol on the owner's interface); folding the commit into
  the hold effect (changes the order of subject write versus hold on a reveal; ADR-QD-195 d3).
- **D-09 (detection in the owner, reporting in the component):** the owner holds `latest.atoms`, the same object
  `atomsIdentityRef` holds today, so the second ref is deleted and the owner detects the swap with
  `latest.atoms !== atoms`. It does not report: `commit` calls the component-supplied `onAtomsReplaced` (the provider
  passes `() => report(providerSignals.atomsReplaced())`), so the owner knows nothing about developer signals,
  `DeveloperSignals.ts` keeps INV-QD-387's one row, and the provider stays branch-free. Inside `commit` the order is
  today's order exactly: detect and call `onAtomsReplaced`, then record the latest, then write the subject (today the
  report runs in the first effect, :260, before the latest, :270, and the write, :304). A throwing reporter is already
  contained by `contain` (`DeveloperSignals.ts:234-242`), so the callback cannot abort the commit.
  Rejected: detection in the component (FEATURES; keeps a second ref holding the owner's datum and an `if` in the
  unmeasured file); `commit` returning a boolean and the component reporting afterwards (ARCHITECTURE; moves the report
  after the write for no reason and leaves an `if` in the component); the owner importing `providerSignals` and the
  reporter (makes the lifetime module a second reporter path).
- **D-10 (the subject write):** the owner writes `registry.set(atoms.subject, subject)` on every commit, without the
  `registry.get(atoms.subject) !== subject` pre-check. The registry already ignores an equal write
  (`AtomRegistry.js:637-646`), so the guard is behaviourally dead, and as code in the measured owner it would be an
  equivalent mutant that `// Stryker disable` may not hide (WX-04) and the born-file bar refuses. The base
  characterisation (D-12) pins that a re-render with the same subject notifies no subscriber of `atoms.subject`, green
  on the base (guarded) and after (unguarded), so the removal is proved neutral, not assumed. If that characterisation
  cannot be made green against the unguarded write, the guard stays and the planner records why. The ticket-34 comment
  (:290-303, why the write is in an effect, never in render) moves to the provider's commit effect, where the decision
  still lives.
  Rejected: keeping the guard as is (a mutant no test can kill in a file whose bar is zero survivors).

### Area 3: The provider
- **D-11 (what `QadiProvider.tsx` keeps):** one lifetime ref, `ownerRef.current ??= makeRegistryOwner({ atoms, subject,
  initialValues })`, in render exactly where `registryRef` is built (ADR-QD-195 d1: a server render and the first client
  render hold the subject with no pending frame); `registry` read from the owner for `RegistryContext`, the context value
  memo and nothing else; the commit effect; the two instrumentation effects (`signalRef`, `report` and
  `reportedInstrumented` stay: developer-signal concerns, not lifetime); the hold/release effect last. The `writer` memo
  stays (ADR-QD-080). Refs go from six to three (`signalRef`, the owner, `reportedInstrumented`). The file header's
  "decided in `RegistryLease.ts`, once" paragraph names the owner and the lease. Every alternative ADR-QD-195 rejected
  stays rejected and is re-listed as such in ADR-QD-199: registry in state or an effect, the `useScoped` shape, a proxy,
  dispose only on true unmount, never release, `dispose()` for `reset()`, re-applied seeds, a subject write from the
  first closure or in render, a second guard inside the deferred run.

### Area 4: Characterisation, tests and measurement
- **D-12 (characterisation first, on the base):** plan 1 commits, green on `b0fc13f3` before any source moves, a new
  render file (planner names it, e.g. `QadiProvider.owner.characterisation.test.tsx`) with the cells nothing pins today:
  (a) construction seeds the subject first and `initialValues` after, so a seeded `atoms.subject` entry wins in the
  first render; (b) a server render (`renderToString`) of a seeded provider schedules no timer from the provider (the
  `setTimeout` spy LT18 uses, counting calls during the render); (c) a re-render with an unchanged subject notifies no
  subscriber of `atoms.subject` (D-10's proof); (d) in a commit that swaps the atom set, the `AtomsReplaced` reporter
  runs before the subject is written (the reporter reads the new set's `subject` from the tapped registry and sees its
  default, not the subject; D-09's order); (e) `AtomsReplaced` is not reported on a StrictMode double effect nor on a
  plain reveal after a long hide; (f) a commit that changes the subject and the atom set together is the one a long
  hide's recycle writes back. Each cell names the scratch variant that turns it RED (for (d): report after the write;
  for (b): defer at construction).
  **The pinned set**, checked byte for byte against the phase base by an `86-pinned-check.mjs` in the phase dir:
  `QadiProvider.lifetime.test.tsx` (LT1-LT18; the tie-break LT6, LT8, LT13, LT16-LT18 among them),
  `RegistryLease.test.ts` (RL1-RL10), every other `QadiProvider.*.test.tsx`, `QadiProvider.tst.ts`, `edges.test.tsx`,
  `ServerRender.test.tsx`, the new characterisation file once committed, and `src/RegistryLease.ts`.
- **D-13 (owner tests, headless):** a new `packages/react/test/RegistryOwner.test.ts` with no React, a real
  `AtomRegistry` (the owner's own) and a recording defer that really cancels (the `fakeDefer` shape of
  `RegistryLease.test.ts`, written in a new `test/support/` helper because the lease test is pinned). Rows, each
  followed by a further operation so a mutated state shows in what happens next (the lease test's discipline): built and
  dropped defers nothing; built, committed and held defers nothing; a release then a fired run recycles once and the
  registry reads the latest committed subject and the latest atom set's subject; hold-release-hold cancels once and a
  fire recycles nothing; a recycle whose reset throws still writes the subject back and the owner stays usable; a
  recycle re-applies neither `initialValues` nor a seed (a seeded host atom reads its default); commit detects a swap
  once and not on a repeated commit of the same set; commit's order (callback before the write); one `registry`
  object across every operation. **Every "recycles nothing" row has a "recycles once" twin** that fails when the
  recycle is removed (PREG-03). Test ids follow the file's own letters (e.g. `RO1`…), never a phase or D-number (WX-07).
- **D-14 (the render suite does not lose a test):** PREG-05's shrink is applied as **zero deletions**, decided
  autonomously: every lifetime render test is either a StrictMode, `<Activity>` or server case already (LT1-LT18, the
  SUBJ, SD and P rows, `ServerRender.test.tsx`), is cited by title in a BEH "Pinned by" line or ADR-QD-195's "What
  enforces it", or is in the pinned set; the order React runs effects in is evidence only a render gives (ADR-QD-195 d3).
  What moves is the spec's proof: BEH-QD-747..750 and INV-QD-409/410 gain the owner's rows as their first pins, and
  the render tests stay as the integration net. Rejected: deleting LT tests the owner now duplicates (LT14, LT18)
  (breaks PREG-01's "unedited" and the tie-break).
- **D-15 (mutation, XC-05):** `stryker.react.mjs` gains `packages/react/src/RegistryOwner.ts` in `mutate`, and its
  header paragraph and covering-tests sentence name it (in the same commit that creates the owner). Two groups in an
  `86-mutation.mjs` modelled on `85-mutation.mjs`: `lease` (`RegistryLease.ts`, measured at the base and at the close
  with the same invocation, `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/RegistryLease.ts`,
  removed-mutant rule; it must stay at no open mutant) and `owner` (`RegistryOwner.ts`, born in the phase, born-file
  rule: no Survived, NoCoverage or Ignored mutant and at least one killed). Any matcher or per-instance logic in the
  owner is built inside the factory, never at module scope, so `ignoreStatic` leaves no arm unjudged (ADR-QD-195 d7).
  `QadiProvider.tsx` is listed in the record's `unmeasured` (it renders; it now holds no lifetime branch; held by the
  pinned render suite and the characterisation). Records `86-mutation-base.json` and `86-mutation-close.json`, stdin
  closed, quiet host. Coverage: `@qadi/react` stays at or above 90%.

### Area 5: Records
- **D-16 (ADR):** a new **ADR-QD-199** ("A provider's registry lifetime has a React-free owner") records D-05..D-11 and
  D-14, and re-lists ADR-QD-195's rejected alternatives as still rejected, plus the two rejected here (three ordered
  effects; detection in the component). **ADR-QD-195** gets revision 1.4 with a dated amendment note, not a
  supersession: decision 2's "imports neither React nor the provider" extends to the owner; decision 3's "the provider
  only holds and releases" now forwards to the owner; decision 4's ref is the owner's latest; "What enforces it" and
  "the mutation record" add `RegistryOwner.test.ts` and the owner's `mutate` entry; older text stays as written.
  ADR-QD-014, 148 and 149 are read and not amended (the owner forks nothing, touches no sweep and re-applies no seed;
  their wording names the provider's behaviour, which is unchanged). Rejected: amending ADR-QD-195 alone and naming
  199 unused (the owner adds rules of its own: inertness, one commit, detection placement, the dropped guard).
- **D-17 (spec):** `spec/behaviors/09-react.md`: new **BEH-QD-766** (a provider's commit is one transition: a swapped
  atom set is reported, the latest committed atoms and subject are recorded, and the subject is written, in that order,
  before the hold) and **BEH-QD-767** (building a provider's registry schedules nothing: a server render and a render
  React discards leave no recycle pending); BEH-QD-747..750 and BEH-QD-067 restated where they say "a ref the provider
  writes in an effect" or name `QadiProvider.tsx` as the source, with the owner's tests first in "Pinned by".
  `spec/invariants.md`: new **INV-QD-417** (the registry's lifetime rule lives in one module that imports no React;
  `QadiProvider.tsx` holds no lifetime branch) and **INV-QD-418** (the owner is inert at construction: only a release
  reaches `defer`); INV-QD-409/410's Source and Enforcement lines name the owner. `spec/traceability.md` rows,
  `spec/decisions/index.yaml` (199), and the `spec/README.md` CCR-QD-478 row with "Unused: BEH-QD-768, BEH-QD-769,
  BEH-QD-770". `spec/appendices/react-integration.md` §3 (:138-143) describes behaviour, not wiring, and stays
  unchanged (checked; recorded in the CCR row). AGENTS.md needs no edit (it names neither the lease nor the refs).

### Claude's Discretion
- The exact parameter shape of `makeRegistryOwner` (one seed object versus positional), and whether `commit` takes the
  callback as a third argument or the owner takes it once at construction, provided the order in D-09 holds and the
  component stays branch-free.
- Names of the characterisation file, the owner test ids and the `test/support/` defer helper.
- Plan count and split, provided plan 1 is the characterisation, the pinned check and the mutation base on the base;
  the owner, its tests and the `stryker.react.mjs` edit land before the provider is rewired; and the records plan edits
  the spec registers once.

### Addendum after research (2026-11-25, decided autonomously)
- **D-10a (the guard's divergence is pinned, not only recorded):** research (86-RESEARCH.md Q1) probed effect 4.1.2
  and found the guarded and unguarded writes notification- and re-evaluation-neutral, with one difference: on a
  seeded `subject` node nothing has read before the first commit, the guard's `registry.get` built the node and cleared
  `preserveInitialValueOnBuild`, so a later host `registry.refresh(atoms.subject)` reset the subject to `undefined`;
  the unguarded write leaves the flag set, so the refresh keeps the current subject. Keeping the subject across a
  refresh is the better behaviour, so D-10 stands (the guard is dropped). Unlike the research's recommendation
  ("recorded, not pinned"), the difference is **pinned**: an owner test (headless, real `AtomRegistry`) asserts that a
  host refresh after the first commit keeps the current subject, with the scratch variant "reinstate the
  `registry.get(...) !== subject` guard" recorded red in `86-RED-EVIDENCE.md`. It is born on the owner, not on the base
  (it differs by construction), and ADR-QD-199 plus the CCR-QD-478 row state it as a deliberate behaviour difference.
  No unconditional `registry.get` is added.
- **D-18 (trailer check):** `86-check.mjs trailers` keeps Phase 85's exact trailer,
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, which is the project's commit attribution; the research's
  suggestion to switch to 82's generic regex came from the researcher's own model name and is not taken.
- **D-19 (criterion 4):** the research's audit found no lifetime render test made redundant by an owner row (each keeps
  a half only React gives), so the shrink set is empty; ADR-QD-199 carries the audit table and the verification states
  the count (0). This meets criterion 4's conditional wording with D-14's zero deletions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `makeRegistryLease(recycle, defer)` and `LeaseDefer` (`packages/react/src/RegistryLease.ts:21`, :51-85): composed
  unchanged.
- `fakeDefer` / `counting` (`packages/react/test/RegistryLease.test.ts:14-41`): the recording-defer shape the owner
  tests copy into a support helper.
- `rig`, `IdLog`, `RegistryTap`, `pastTheRelease`, `longHide` (`QadiProvider.lifetime.test.tsx`): the render harness the
  characterisation reuses (by a copy or a support module; the lifetime file itself is pinned).
- `settle` (`test/support/settle.ts`), `makeSweepCounter` (`test/support/sweepCounter.ts`).
- `85-mutation.mjs`, `85-pinned-check.mjs` (`.planning/phases/QD-85-…/`): the record-script precedents.

### Established Patterns
- A React-free module with an injected `defer`, per-instance `Match` matchers and closure state (ADR-QD-195 d2, d7).
- Lazy ref built in render for anything the first render must already hold (ADR-QD-195 d1).
- Developer signals are raised by the component through `providerSignalReporter`, which contains a throwing reporter.
- Package-private modules stay out of `src/index.ts`; tests import them by path.

### Integration Points
- `packages/react/src/QadiProvider.tsx`: imports (`RegistryOwner.ts` in place of `RegistryLease.ts`; `AtomRegistry`
  import becomes type-only if `make` moves out), refs, the effect list, the header comment.
- `stryker.react.mjs`: `mutate`, header, covering tests.
- Tests: new `RegistryOwner.test.ts`, the characterisation file, a `test/support/` defer helper.
- Spec: `spec/behaviors/09-react.md` (BEH-QD-067 :246, BEH-QD-747..750 :1108-1215, new 766/767),
  `spec/invariants.md` (INV-QD-409 :4745, INV-QD-410 :4757, new 417/418), `spec/decisions/195-…md`, new
  `spec/decisions/199-…md`, `spec/decisions/index.yaml`, `spec/traceability.md`, `spec/README.md`.
- `.changeset/` (one `@qadi/react` patch). Phase 91 later edits `QadiProvider.tsx`'s imports; this phase must leave
  them settled.

</code_context>

<specifics>
## Specific Ideas

- The provider after the change, in outline (not code to paste):
  `const owner = (ownerRef.current ??= makeRegistryOwner({ atoms, subject, initialValues }));`
  `useEffect(() => { owner.commit(atoms, subject, () => report(providerSignals.atomsReplaced())); }, [owner, atoms, subject]);`
  … the two instrumentation effects …
  `useEffect(() => { owner.hold(); return () => owner.release(); }, [owner]);`
- The `[atoms.subject, subject] as const` tuple moves into the owner as is (`as const` is already in the source and
  passes the house-style gate; no new `as`).
- ADR-QD-195's ORDER lines were observed on React 19.3.1; any claim about effect order in ADR-QD-199 says "observed on
  19.3.1" (the 19.2.4 peer floor is not exercised, a carried Known Issue).
- The `QadiProvider.tsx` comment at :246-258 (why a swap is announced) moves with the detection rule into the owner's
  doc, and the provider keeps one line saying the report is the component's.

</specifics>

<deferred>
## Deferred Ideas

- Closing ADR-QD-195 d4's one-frame tradeoff (a subject changed while hidden is read as the previous one in the reveal's
  first frame, LT6): it needs a render-phase write, which ADR-QD-195 rejects; out of scope.
- Exercising the React 19.2.4 peer floor (carried Known Issue).
- A Stryker config for the rest of `@qadi/react`'s render code: `QadiProvider.tsx` stays outside every config by
  decision.

</deferred>
