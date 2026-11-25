# Phase 86: `QadiProvider`'s registry lifetime has a React-free owner - Research

**Researched:** 2026-11-25
**Domain:** `@qadi/react` provider lifetime (`QadiProvider.tsx`, `RegistryLease.ts`, a new package-private owner), `effect/reactivity` `AtomRegistry` semantics, React 19.3.1 effect order, the spec registers that state the lifetime, and the vitest / Stryker / tstyche gates that measure it
**Confidence:** HIGH for every file:line, quoted value, spec location and registry behaviour (each file was opened this session at HEAD `3dd201a3`; `git diff ac7578f3 HEAD -- packages/react` is empty, so `packages/react/` is byte-identical to the Phase 82 merge). HIGH for the measured lease base (ran this session) and for the registry probes (ran against effect 4.1.2). MEDIUM for the predicted owner mutant list and the owner's Stryker run time (derived by reading; tagged `[ASSUMED]`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Binding milestone decisions (carried forward from Phase 85; not re-decided)**
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

**Area 1: The owner's shape**
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

**Area 2: One commit effect, and where `AtomsReplaced` detection lives (the researchers' disagreement)**
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

**Area 3: The provider**
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

**Area 4: Characterisation, tests and measurement**
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

**Area 5: Records**
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

### Deferred Ideas (OUT OF SCOPE)
- Closing ADR-QD-195 d4's one-frame tradeoff (a subject changed while hidden is read as the previous one in the reveal's
  first frame, LT6): it needs a render-phase write, which ADR-QD-195 rejects; out of scope.
- Exercising the React 19.2.4 peer floor (carried Known Issue).
- A Stryker config for the rest of `@qadi/react`'s render code: `QadiProvider.tsx` stays outside every config by
  decision.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PREG-01 | LT1-LT18, RL1-RL10 and the `QadiProvider.*.test.tsx` files stay green and unedited; a characterisation of create / seed / subject write / recycle / atoms-replaced is written on the base first | Q6 (the pinned set, by path, plus a stricter whole-directory rule), "Characterisation cells" (C1 to C9, each with its RED variant), the suites ran green at HEAD (10 files, 88 tests, 2.4 s) |
| PREG-02 | One package-private, React-free owner: create, seed, subject write, recycle (`reset`, never `dispose`), hold/release through the unchanged lease; inert at construction; in `stryker.react.mjs` | "Pattern 1" (the owner), Q3 (Stryker and `ignoreStatic`), "Mutation and coverage mechanics", `86-check.mjs owner-shape` |
| PREG-03 | Owner tested without rendering, real `AtomRegistry`, injected `defer`; never-run, cancel-once, run-after-cancel, long hide once and re-seed before any read; every "recycles nothing" has a "recycles once" twin | "Owner test rows" (RO1 to RO14 with twins and the scratch variant that turns each RED), Pitfall 86-C |
| PREG-04 | `QadiProvider` keeps one lifetime ref, forwards hold/release/subject changes, no lifetime branch, effect order unchanged | Q4 (the merge is the same sequence by construction), Q2 (effect and ref counts), Q8 (what can and cannot be pinned about order), `86-check.mjs provider-forwards-only` |
| PREG-05 | ADR-QD-199 (or 195 amended, 199 unused); BEH/INV/traceability move; render suite shrinks "only where the owner's tests now hold the property" | Q5 (reconciles criterion 4's wording with D-14), "Spec registers" (exact locations), the LT-to-owner-row map |
| WX-01..WX-07 | Cross-cutting (written as an explicit list: `phase.complete` cannot parse ranges) | "House-style and verify commands", "Changeset", "Validation Architecture", Pitfalls 86-F to 86-J |
</phase_requirements>

## Summary

The change is a pure relocation with one deliberate simplification (the dropped `!== subject` guard). Everything CONTEXT cites was re-read at HEAD and is correct: `QadiProvider.tsx` is 359 lines with six `useRef`, six `useEffect` and three `useMemo` (the wave file's "seven effect hooks" is wrong, Q2), the three effects D-08 merges are **consecutive** in declaration order (:260, :270, :304 with only a `useRef` and a lease build between them), so the merged commit performs exactly the same side effects in exactly the same order inside the fiber's single effect list. That is proved by reading, not assumed, and it is why the merge cannot change a run condition that matters (Q4).

Six findings qualify a locked decision (§ "Findings that qualify a decision"). None reverses one. The two that change plan content: **Q1**, the guard is **identity-based** (`!==`) while the registry's equality for the `subject` atom is **structural** (`subjectsEqual`), so the guard never saved the common inline `makeSubject(...)` case, and dropping it is neutral for notifications and re-evaluation (probed on effect 4.1.2) but has **one divergence** the base characterisation cannot pin (a host-only `registry.refresh(atoms.subject)` on a registry whose seeded subject node nobody has read before the first commit); the plan must record it in ADR-QD-199 rather than pretend the removal is provably identical. **Q5**, success criterion 4 ("the render suite shrinks … only where the owner's tests now hold the property") is a conditional; D-14's zero deletions satisfies it when the plan records an explicit audit (a table in this file) showing that no lifetime render test is made redundant by an owner row, because each renders a half only React gives.

**Primary recommendation:** plan 1 is the characterisation file (C1 to C9), `86-pinned-check.mjs` (hold **every** existing file under `packages/react/test` and `src/RegistryLease.ts` byte for byte, which is a strict superset of D-12's named list), and the lease's Stryker base (re-measured this session: 28 mutants, 28 killed, 0 Ignored, 58 s with `--disableBail`). Then the owner as a **block-bodied factory arrow** (the lease's own shape, proved to leave no `Ignored` mutant) with `hold: lease.hold` / `release: lease.release` forwarded by reference (no mutant to survive), its headless tests and the `stryker.react.mjs` edit, and only then the provider rewiring.

## Findings that qualify a decision

None of these re-opens a decision. Each states what the code shows and what the plan should do to honour the decision's intent.

### Q1 (D-10): what an equal `set` does, and the one thing the base characterisation cannot prove

**Evidence, from the installed source** `[VERIFIED: node_modules/.pnpm/effect@4.1.2/node_modules/effect/dist/reactivity/AtomRegistry.js]`:

- `registry.set(atom, value)` is `atom.write(this.ensureNode(atom).writeContext, value)` (`:244-246`); a plain writable atom's write is `setSelf`, i.e. `NodeImpl.setValue` (`WriteContextImpl.setSelf`, `:956`: `return this.node.setValue(value);`).
- `setValue` (`:637-646`) reads, verbatim:
  ```
  setValue(value) {
    // dependents that failed along with this node get another try
    const recovered = this.failed;
    this.failed = false;
    const initialized = (this.state & NodeFlags.initialized) !== 0;
    this.state = NodeState.valid;
    if (initialized && this.atom.equals(this._value, value)) {
      if (recovered) this.invalidateChildren();
      return;
    }
  ```
  So an equal write on an initialised node **returns before** `this._value = value`, before `invalidateChildren()` and before `announce()`: no listener is called, no dependent is invalidated, the **stored object stays the old one**. `recovered` is true only after a build threw, which a `Atom.make(undefined)` value atom cannot do.
- The comparison is `this.atom.equals`, **not** `Equal.equals` and not `===`: the `subject` atom is built with `Atom.withEquality(subjectsEqual)` and `Atom.keepAlive` (`packages/react/src/QadiAtoms.ts:240-243`), and `subjectsEqual` is `a === b || (a !== undefined && b !== undefined && subjectEquivalence(a, b))` (`QadiAtoms.ts:222-223`, verbatim: `const subjectsEqual = (a: AuthSubject | undefined, b: AuthSubject | undefined): boolean =>\n  a === b || (a !== undefined && b !== undefined && subjectEquivalence(a, b));`). BEH-QD-067 already states the rule as a requirement ("Writing a subject equal to the current one MUST NOT re-evaluate any mounted decision. 'Equal' is `subjectEquivalence`", `spec/behaviors/09-react.md:296-301`) and `QadiAtoms.test.ts:126` (RC-01) pins it at the atom layer, through direct `registry.set`.

**Probed this session** (`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/b04729bd-9815-4720-957d-3637602848ac/scratchpad/probe/probe.mjs`, run with node against the installed effect 4.1.2):

| Probe | Result |
|-------|--------|
| built node, a listener, `set` of the **same object** | listener heard 0 |
| built node, `set` of a **structurally equal, different object** | heard 0, `registry.get(subject) === original` still true (the old object is kept) |
| built node, `set` of a different subject | heard 1 |
| a derived "decision" atom over the subject, two equal writes | recomputes 0, listener 0 |
| seeded node never read, then `set(same)` (unguarded) versus `get` then conditional `set` (guarded), then `registry.refresh(atom)` | **guarded: `refresh` resets the value to the atom's default `undefined`; unguarded: the seed survives `refresh`** |

The last row is the divergence. `setInitialValue` leaves the node `stale` with `preserveInitialValueOnBuild = true` (`:450-462`); the guard's `registry.get` builds the node first and clears that flag, while an unguarded first `set` on an unbuilt seeded node marks it `valid` and **leaves the flag true** (probe output: `guarded(get first) state valid preserveFlag false` versus `unguarded(set first) state valid preserveFlag true`). The flag matters only if the node is later invalidated and rebuilt, and nothing in this repository refreshes or invalidates the subject atom (`git grep` of `.refresh(` and `invalidateAtom` in `packages/{react,devtools,promise,testing}/src` finds only `DockModel.ts:446, :456`, which refresh the devtools model's own stores, not an atom). It is reachable only by a host that calls `registry.refresh(atoms.subject)` through `RegistryContext` before any gate has read the subject. After a recycle the node is fresh (`reset()` clears `nodes`, `:422-433`) and the recycle's own `set` already was unguarded, so that path is unchanged.

**Verdict.** D-10 stands: drop the guard. It is notification-neutral and re-evaluation-neutral (the probe rows above), and it removes a `registry.get` per commit (which also built the node as a side effect). Two things the plan must do, because "proved neutral, not assumed" is only true for the first:

1. **Born-green provider-level pin (C5)** on the base and after: re-rendering with a **fresh structurally equal** subject (what `subject={makeSubject({...})}` inline produces on every render, RC-01's shape) notifies no subscriber of `atoms.subject`, re-evaluates no mounted decision (`countingLayer`-style counter, `QadiAtoms.test.ts` shows it), and keeps the stored object; its twin: a genuinely different subject notifies exactly once. Scratch variant that turns it RED: delete `Atom.withEquality(subjectsEqual)` from `QadiAtoms.ts` (the equal write then notifies), restored from a copy. The identity-equal case needs no separate pin: the guard skipped only that case, and its notification count is 0 with or without the guard.
2. **State the divergence in ADR-QD-199** (and name it in the CCR row) as an accepted difference: "a seeded `subject` node nothing has read before the first commit keeps its seed across a host `registry.refresh`; the guarded write reset it to `undefined`; nothing in this package refreshes the subject atom". It cannot be a born-green base pin (it differs by construction), so it is **recorded, not pinned**. If the owner rejects that, the alternative that keeps the guard's one side effect without a branch is an unconditional `registry.get(atoms.subject)` before the `set`; it adds a statement whose removal no test could kill short of a `registry.refresh` test, so it would be an equivalent mutant: **not recommended** and the reason D-10 dropped it.

`[VERIFIED: probe run this session; AtomRegistry.js:244-246, :450-462, :637-646, :956; QadiAtoms.ts:222-223, :240-243]`

### Q2 (CONTEXT, wave file): the hook counts

Confirmed by `grep` and by reading: `QadiProvider.tsx` has **six `useEffect`** at :260, :270, :304, :315, :326, :336; **three `useMemo`** at :222, :343, :350; and **six `useRef`**: `signalRef` :228, `registryRef` :238 (`useRef<AtomRegistry.AtomRegistry | undefined>(undefined)`), `atomsIdentityRef` :259, `latestRef` :269, `leaseRef` :281, `reportedInstrumented` :314. No `useLayoutEffect`, no `useState`. The wave file's "seven effect hooks" is one too many. After the phase: four `useEffect` (commit, the two instrumentation effects, hold/release), three `useRef` (`signalRef`, the owner, `reportedInstrumented`), three `useMemo` (unchanged). `[VERIFIED: QadiProvider.tsx whole file read]`

### Q3 (D-15): Stryker's `ignoreStatic` and a factory-closure owner

`stryker.react.mjs` sets `ignoreStatic: true` (`:56-58`: "Skips mutants in code that runs once at import time (ADR-QD-076)"). Static mutants are those in module-scope initialisers. Evidence on what that does to a **factory closure**:

- `RegistryLease.ts` is a module-scope `export const makeRegistryLease = (recycle, defer = timeoutDefer): RegistryLease => { … }`, a **block-bodied arrow const**, with its matchers built inside it. **Re-measured at HEAD this session** with the invocation D-15 gives plus `--disableBail` (Phase 82's `lease` group invocation): `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/RegistryLease.ts --disableBail < /dev/null`, **28 mutants, Killed 28, Survived 0, NoCoverage 0, Timeout 0, Ignored 0**, `Done in 57 seconds` (`RegistryLease.ts | 100.00 | 100.00 | 28 | 0 | 0 | 0 | 0`), "Ran 147.54 tests per mutant on average". This equals Phase 82's close record (`82-mutation-close.json` group `lease`: `killed 28 … ignored 0`, invocation `… --mutate packages/react/src/RegistryLease.ts --disableBail`, head `56fd5e57`). `RegistryLease.ts` last changed in `ac7578f3`. So the **base the close must be compared to is 28/28/0/0/0, and a block-bodied factory arrow leaves no `Ignored` mutant**: the owner may take the same shape. `[VERIFIED: ran this session; 82-mutation-close.json read]`
- What does become `Ignored` is an **expression-bodied** module-scope arrow (`ArrowFunction` mutator), a module-scope `Match.type(...).pipe(Match.tagsExhaustive({...}))`, a module-scope object or array literal, and a module-scope string literal: Phase 85's `DockModel.ts` carried 12 such mutants, Phase 82's `DecisionOutcome.ts` 11 (`82-mutation-close.json`: `"ignored": 11`). Phase 85's probe found a **function-declaration** body also clean (`85-04-SUMMARY.md`: "41 mutants, all Killed … No Ignored mutant").
- **Rule for the owner:** nothing at module scope except imports, the two interfaces and the one exported factory; every literal, array, object, closure, comparison and call inside the factory body; `hold: lease.hold` and `release: lease.release` forwarded by reference so there is no arrow to mutate; no `Match` (the owner has no tagged union: the detection is one `!==`, and the closed union already lives in the lease). Any module-scope helper arrow (a "keep it tidy" `const seedOf = (…) => …`) would be an `Ignored` ArrowFunction mutant and fail D-15's born-file bar; a function declaration is the fallback shape. `[ASSUMED]` for the owner's own result until `86-mutation.mjs record close owner` is run; the lease measurement is the evidence the shape is sound.

**Group design for `86-mutation.mjs`** (`82-mutation.mjs` is the precedent for a lease group; `85-mutation.mjs` for a born file):
- `lease`: `--mutate packages/react/src/RegistryLease.ts`, base and close, same invocation, with `--disableBail` so every killing test is listed, and the removed-mutant rule (no new Survived, NoCoverage or Ignored). Base figure: 28 killed, 0 of everything else.
- `owner`: close only, `--mutate packages/react/src/RegistryOwner.ts --disableBail`, born-file rule (no Survived, NoCoverage, Ignored or Timeout, at least one Killed), and the 82 `killers` check pointed at `packages/react/test/RegistryOwner.test.ts`: **every Killed owner mutant has a killer among the owner's own headless tests**. Without it, PREG-03's "tested without rendering" is an assertion; with it the mutation run measures it (the render suites reach the owner too, so a bail-on-first-kill run can credit a render test). 82's `killers` mechanism is the existing code for that.
- `unmeasured`: `packages/react/src/QadiProvider.tsx` with the 82 string adapted: "renders; it holds no lifetime branch now, and its behaviour is pinned by the rendered tests and the characterisation".
- Run time: the lease took 58 s with 28 mutants at 147 tests each; an owner of about 40 to 60 mutants will take a few minutes `[ASSUMED]`. Run alone, stdin closed, nothing else running (`pnpm check:pr` skips mutation; this is a per-phase step).

### Q4 (D-08, D-09): where `AtomsReplaced` is detected and reported today, and what the merge changes

**Today.** Detection: `atomsIdentityRef = useRef(atoms)` (:259) compared in the first effect (:260-263), verbatim:

```
  const atomsIdentityRef = useRef(atoms);
  useEffect(() => {
    if (atomsIdentityRef.current !== atoms) report(providerSignals.atomsReplaced());
    atomsIdentityRef.current = atoms;
  }, [atoms]);
```

Reporting: `report` (:230-232) is `providerSignalReporter(signalRef.current)(signal)`; `providerSignals.atomsReplaced` is `DeveloperSignals.ts:539` (`atomsReplaced: (): ProviderSignal => DeveloperSignal.AtomsReplaced(),`); `providerSignalReporter` is `(supplied) => (signal) => { reporterFor(SIGNALS[signal._tag], "QadiProvider", supplied)?.(signal); }` (`DeveloperSignals.ts:552-556`) and `reporterFor` wraps a supplied reporter in `contain` (`:503-508`; `contain` is `:234-242`: `try { supplied(value); } catch (error) { unconditionally(SIGNALS.ReporterThrew)(...) }`), so a throwing `onDeveloperSignal` never escapes into an effect. `latestRef` (:269-272) holds `{ atoms, subject }` rewritten in the second effect. **One datum, two refs**: both start at the first render's `atoms`, both are rewritten with the committed `atoms` in effects whose deps both contain `atoms`, so they are equal at every observable moment. `[VERIFIED: QadiProvider.tsx:228-272; DeveloperSignals.ts:234-242, :503-508, :539, :552-556 read]`

**The merge is the same sequence of side effects.** Declaration order today is: atoms-identity (:260), latest (:270), [lease built in render, no effect], subject write (:304), instrumentation (:315), unwritable registry (:326), hold/release (:336). The first three are **consecutive effects of one fiber**, and React runs one fiber's effect list contiguously and in order inside **one** `try` (`commitHookEffectListMount`, `react-dom-client.development.js:13735-13790` in `react-dom@19.3.1`, quoted: `try { var updateQueue = finishedWork.updateQueue, lastEffect = … do { … updateQueue = updateQueue.next; } while (updateQueue !== firstEffect); } catch (error) { captureCommitPhaseError(finishedWork, finishedWork.return, error); }`; the whole list is inside one `try`, so a throw in one effect skips the rest of the same fiber's list, today and after). One effect that does the three in the same order therefore produces an identical sequence. The only difference is the **run condition**: today effect 1 did not run on a subject-only change; the merged one does, and its detection compares `latest.atoms !== atoms` with `latest.atoms` equal to the previous commit's atoms, so on a subject-only change it is false and does nothing. A StrictMode double effect and an `<Activity>` reveal re-run every effect whatever its deps, so LT4, LT8 and the reveal path see the same calls. `[VERIFIED: react-dom-client.development.js:13735-13790 read; react@19.3.1 installed; the peer floor `>=19.2.4` is not exercised (carried Known Issue)]`

**What a callback does to LT6 / LT8 / LT13 / LT16-LT18.** Only LT8 and LT17 supply `onDeveloperSignal` (LT8: `(signal) => tags.push(signal._tag)`; LT17: `() => undefined`); LT6, LT13, LT16 and LT18 pass none. The callback runs inside `commit` at the position effect 1 held, **before** the latest is recorded and the subject written, which is where the report already ran. LT8 expects `["AtomsReplaced"]` exactly once after a swap while hidden and a reveal: the reveal re-runs the commit once, `latest.atoms !== atoms` is true once, the callback runs once, `latest` is recorded, and a StrictMode second run finds them equal. LT6, LT13, LT16-LT18 read the first frame of a reveal through `IdLog`; none depends on the report. So the callback does not move any of their orderings. `[VERIFIED: QadiProvider.lifetime.test.tsx:394-417, :438-463, :590-611, :635-730 read]`

**Reliance to pin (cell C8).** D-09's "the callback cannot abort the commit" rests on `contain` (above), not on anything in the owner. Pin it at the provider on the base: a swap whose `onDeveloperSignal` throws still ends with the subject written into the new atom set's `subject` atom. Scratch variant: remove the `try/catch` in `contain` (`DeveloperSignals.ts:236-241`) for the run.

### Q5 (success criterion 4 versus D-14): how criterion 4 is met with zero deletions

Criterion 4 reads: "the render suite shrinks to StrictMode, `<Activity>` and SSR smoke tests **only where the owner's tests now hold the property**". It is a conditional, and the condition is empty. The audit (titles read in `QadiProvider.lifetime.test.tsx`, `edges.test.tsx`, the SUBJ/SD/P files):

| Render test | What it is | What the owner's rows can hold | What only a render gives, so it stays |
|-------------|-----------|-------------------------------|---------------------------------------|
| LT1, LT2, LT3 | `<Activity>` long hide, then reveal, invalidate, devtools feed | nothing (the registry is usable: RO10, but not that consumers subscribe on a reveal) | React runs children's setups before the provider's, and the first subscription meets the registry |
| LT4 | StrictMode double effect then a long hide | hold-release-hold cancels once and fires nothing (RO4) | that React really runs the double effect and the cleanup order |
| LT5 | short hide (two synchronous flips) | the same machine property | `act` flips really run cleanup then setup in one tick |
| LT6, LT13, LT16, LT17 | first frame of a reveal reads the last **committed** subject / atom set | the recycle writes the latest commit (RO5, RO8) | the first-frame read (`IdLog`) and that a hidden render runs no effect |
| LT7 | re-render while hidden keeps one registry | `owner.registry` is one object (RO10) | that the provider's lazy ref survives a hidden render |
| LT8 | atoms swap while hidden, reported once | detection once (RO8) | that a reveal runs the commit once |
| LT9, LT10, LT11 | seed not shown again after a long hide, then `Pending`, the client's answer | a recycle re-applies no seed (RO7) | the gate's `Pending` then answer |
| LT12 | sweep bound across a long hide | nothing (the owner forks nothing) | the atom set's sweep |
| LT14, `edges` "releases its registry after it unmounts" | straggling read after an unmount | release then fire recycles once and a seeded host atom reads its default (RO2) | **that an unmount runs the provider's cleanup at all**: the only proof the provider wires `release` to React |
| LT15 | host subscription detached by a recycle | `reset()` detaches (RO13) | the hide |
| LT18 | a recycle whose reset throws still writes the subject | RO6 | the first frame after the reveal reads it, and the timer the lease resolves from the global |

Every row keeps a half only React gives, and each is cited by title in BEH-QD-746..750 or INV-QD-409/410 "Pinned by" lines or in ADR-QD-195's "What enforces it". So **zero tests qualify for removal**, and criterion 4 is met by (1) recording this audit table in ADR-QD-199's Consequences ("the render suite is already StrictMode, `<Activity>`, server and unmount cases; none is redundant"), (2) the owner's rows becoming the **first** "Pinned by" entries of BEH-QD-747..750 and INV-QD-409/410 (D-14), and (3) `86-VERIFICATION.md` stating the deletion count (0) next to the audit. Suggested wording for the CCR row: "PREG-05's shrink applies where an owner row holds a test's whole property; none does (RO1 to RO14 hold the machine, the LT rows the React half), so no test is removed." `[VERIFIED: titles read this session]`. Wider render files (`QadiProvider.test.tsx`'s "Can / Cannot", hooks, atoms-identity) are not lifetime tests and are out of the clause's scope.

### Q6 (D-12): the exact files the pinned check holds

Phase 85's `85-pinned-check.mjs` model: files compared with their text at `phase_base` (read from `git show <base>:<path>`), each **held** (byte for byte), **declared** (a stated edit) or **born** (held against the one commit that added it). Phase 86 declares **no edit**. Recommended sets, with the paths:

**Held (D-12's named list), all at `packages/react/test/` unless stated, byte for byte against the base:** `QadiProvider.lifetime.test.tsx` (766 lines, LT1 to LT18), `RegistryLease.test.ts` (245 lines, RL1 to RL10), `QadiProvider.test.tsx`, `QadiProvider.production.test.tsx`, `QadiProvider.seed.test.tsx`, `QadiProvider.signals.test.tsx`, `QadiProvider.subject.test.tsx`, `QadiProvider.sweep.test.tsx`, `QadiProvider.tst.ts`, `edges.test.tsx`, `ServerRender.test.tsx`, and `packages/react/src/RegistryLease.ts` (85 lines).

**Recommended addition (stricter and simpler than a list that can rot): hold every file that exists under `packages/react/test/` at the base**, new files excepted (born). The phase edits no existing test, so one rule ("`git diff --name-status -M <base> -- packages/react/test` lists only `A` entries, and no existing file differs") subsumes the list and also guards the other files that mount `QadiProvider` and would feel an effect-order or seed change: `DeveloperSignalReporters.test.tsx`, `DevtoolsFeed.test.tsx`, `GateId.remount.test.tsx`, `GateRegistration.characterisation.test.tsx`, `GateRegistry.test.tsx`, `GateWriter.kinds.test.tsx`, `GateWriter.useGates.test.tsx`, `hooks.rerender.test.tsx`, `hooks.test.tsx`, `HydrationRender.test.tsx`, `InstrumentToggle.characterisation.test.tsx`, `Hydration.test.ts` (imports `type InitialValues` from `QadiProvider.tsx`), `QadiAtoms.test.ts`, `v4-reactivity-smoke.test.ts`, `support/trees.tsx` (mounts `QadiProvider`). `[VERIFIED: git grep QadiProvider -- packages/react/test]`.

**Born:** the characterisation file (the one commit that adds it; two adding commits fail), and later the owner test and its support helper (additions: not held, they are new).

**Guard that `QadiProvider.tsx` keeps its public re-exports** (not a held file, because it is edited): `export type { InitialValues } from "./HydrationEngine.ts"` (:117), `export { MissingQadiProviderError } from "./MissingQadiProviderError.ts"` (:121), `export type { ProviderSignal, ProviderSignalReporter } from "./DeveloperSignals.ts"` (:125), `useQadiContext`, `useAtomValue`, `QadiContextValue`, `QadiProviderProps`, `QadiProvider`; `Hydration.test.ts:40` imports `InitialValues` from the provider and gate 13 reads those names. `pnpm spec:api` and `QadiProvider.tst.ts` catch a loss; the pinned check does not need to.

### Q7 (WX-06, ledger): archived checks that will report differently after the move

Phase 82's `82-check.mjs single-owner` (`.planning/milestones/v1.10-phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/`) judges `QadiProvider.tsx` and requires it to build the lease itself: it reports `QadiProvider.tsx does not build one lease` when `makeRegistryLease(` does not occur exactly once there and `does not hold and release the lease in one effect` when its effect shape differs (`82-check.mjs:326-335`). After Phase 86 the provider holds `owner.hold()` / `owner.release()` and no `makeRegistryLease(`, so that archived mode will exit 1 with those reasons. That is **expected**, like Phase 85's ledger for 80/84 (`85-earlier-checks.mjs`): write `86-earlier-checks.mjs` that copies the 82 script to a scratch directory (the script derives its own directory from its location and must not write into `.planning/milestones/`), runs `single-owner` on the **base** (expect exit 0) and records, for the close, the exit and first line it now prints (expect exit 1, the two reasons above); do not edit the archived script. Find an earlier phase's directory by name prefix under `.planning/phases/` **and** `.planning/milestones/*-phases/`, because Phase 85's script found that the 80 path had moved when its milestone was archived (`85-03-SUMMARY.md` deviation 1).

Also from Phase 85's `85-check.mjs:` its `TRAILER` constant hard-codes `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; this session's attribution is `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. `82-check.mjs` uses the generic `/^Co-Authored-By: Claude [^<>]+ <noreply@anthropic[.]com>$/` (`:25`). Port the **82 regex**, never a fixed model name, or `trailers` fails every commit. `gsd-tools query commit` writes no co-author trailer: amend and read `%(trailers)`.

### Q8 (PREG-04): what a test can and cannot pin about "commit before hold, hold last"

No render observable distinguishes `commit, …, hold` from `hold, …, commit` while nothing throws: both leave the lease `Held` and the subject written. What differs is only failure behaviour (a throwing commit skips a later hold because of the single `try` per fiber), which today's provider also has. So the order is pinned two ways: (1) **by construction**, in `86-check.mjs provider-forwards-only` reading `QadiProvider.tsx` text: the first `useEffect` body is `owner.commit(`, the last `useEffect` is the only one containing `owner.hold()` and its cleanup `owner.release()`, there are exactly four `useEffect` calls, three `useRef` calls, and none of `registryRef`, `atomsIdentityRef`, `latestRef`, `leaseRef`, `makeRegistryLease`, `AtomRegistry.make`, `.reset(`, `.dispose(`, `setTimeout`, `registry.set(`, `registry.get(` appears in code (comments and strings blanked), and the commit and hold effect bodies contain no `if`, `?`, `&&`, `||` or `try`; scratch variants: swap the two effects, add a `registry.get`, keep an `atomsIdentityRef`; (2) **behaviourally**, by the held render suite (LT1 to LT18) and the characterisation, which fail if the commit stops running before the consumers read on a reveal. The ordering **inside** `commit` (callback, then record, then write) is observable headlessly, and gets two rows (RO9, RO10 below). Do not claim a render test pins hold-last.

## Verified line map (HEAD `3dd201a3`; `packages/react/` byte-identical to `ac7578f3`)

All `[VERIFIED: Read this session]` against the file named.

### `packages/react/src/QadiProvider.tsx` (359 lines)
| What | Line(s) | Verbatim / note |
|------|---------|------------------|
| `"use client";` | 1 | first line |
| header paragraph naming the lease | 24-32 | `**The registry's lifetime is decided in `RegistryLease.ts`, once.**` … ends `(ADR-QD-195).` + the recycle detaches host subscriptions: to rewrite (names the owner and the lease) |
| imports | 34-61 | `import * as AtomRegistry from "effect/reactivity/AtomRegistry";` (:38), `import { makeRegistryLease } from "./RegistryLease.ts";` (:59), `import type { RegistryLease } from "./RegistryLease.ts";` (:60). After: `AtomRegistry` becomes `import type * as AtomRegistry` (still used by `QadiContextValue.registry`), `makeRegistryOwner` replaces the two lease imports |
| public re-exports that must stay | 117, 121, 125 | `export type { InitialValues } …`, `export { MissingQadiProviderError } …`, `export type { ProviderSignal, ProviderSignalReporter } …` |
| `QadiProvider` | 208-359 | |
| `writer` memo | 222-225 | stays (ADR-QD-080) |
| `signalRef`, `report` | 228-232 | stay (developer-signal concern) |
| `registryRef` + construction | 238-244 | `const registryRef = useRef<AtomRegistry.AtomRegistry \| undefined>(undefined);` / `const registry = (registryRef.current ??= AtomRegistry.make({ initialValues: [ [atoms.subject, subject] as const, ...(initialValues ?? []), ], }));` |
| why a swap is announced (comment) | 246-258 | moves into the owner's doc; the provider keeps one line |
| `atomsIdentityRef` + effect 1 | 259-263 | quoted in Q4 |
| `latestRef` + effect 2 | 269-272 | `const latestRef = useRef({ atoms, subject });` / `useEffect(() => { latestRef.current = { atoms, subject }; }, [atoms, subject]);` |
| `leaseRef` + lease | 281-288 | `leaseRef.current ??= makeRegistryLease(() => { try { registry.reset(); } finally { registry.set(latestRef.current.atoms.subject, latestRef.current.subject); } })` (no `defer` argument) |
| ticket-34 comment | 290-303 | moves to the commit effect |
| effect 3, subject write | 304-308 | `useEffect(() => { if (registry.get(atoms.subject) !== subject) { registry.set(atoms.subject, subject); } }, [registry, atoms, subject]);` |
| `reportedInstrumented` + effect 4 | 314-324 | stays, deps `[instrument]` |
| effect 5, unwritable registry | 326-330 | stays, deps `[instrument, gates]` |
| effect 6, hold/release | 336-339 | `useEffect(() => { lease.hold(); return () => lease.release(); }, [lease]);` |
| context `value` memo | 343-346 | `useMemo(() => ({ atoms, registry, gates }), [atoms, registry, gates])` |
| `gateScope` memo | 350 | stays |
| JSX | 352-358 | `<RegistryContext.Provider value={registry}>` |

### `packages/react/src/RegistryLease.ts` (85 lines, unchanged)
`LeaseDefer` :21; `RegistryLease` :23-28 (`hold`, `release`); `LeaseState` :30-33; `timeoutDefer` :35-40 (`const handle = setTimeout(run, 0);`, resolved from the global at call time); `makeRegistryLease` :51-85 with default `defer: LeaseDefer = timeoutDefer`; `fire` :56-59 sets `Unheld` then `recycle()`; matchers built per lease :60-76. Header says "`QadiProvider.tsx` is its one caller" (:12-13): stays true for the lease's *callers* only if the doc is read loosely; the owner is now its one caller. **The lease file is held byte for byte**, so its doc comment is **not** edited this phase; the stale sentence is recorded for Phase 91 or a later doc pass (a deliberate consequence of D-05, not an oversight).

### `stryker.react.mjs`
Header :1-22 names five files and "`RegistryLease.ts` is the one place a provider's registry is recycled" (:15-17); covering tests sentence :24-27 ends "`SweepScheduler.test.ts` and `RegistryLease.test.ts` (no rendering, fast)"; `ignoreStatic: true` :58; `mutate` :60-66 (five paths, `RegistryLease.ts` last); `thresholds { high: 90, low: 80, break: 80 }`; `timeoutMS: 20000`; reports `reports/mutation-react/mutation.json` and `index.html`.

### Test files (HEAD)
`QadiProvider.lifetime.test.tsx` helpers: `rig` :165-254 (`seen` Set of registries via `RegistryTap`, `latest.registry`, `hide`, `show`, `flip`, `change`, `longHide`, `hostValue`, `expectNothingThrown`), `IdLog` :141-144, `pastTheRelease` :162 (`setTimeout(resolve, 50)`), `Host` :120-132. `RegistryLease.test.ts`: `fakeDefer` :14-32 (`counts { defers, cancels }`, `pending`, `fire`), `counting` :34-41. Titles (one line each): `LT1`:261, `LT2`:282, `LT3`:314, `LT4`:346, `LT5`:369, `LT6`:394, `LT7`:419, `LT8`:438, `LT9`:465, `LT10`:491, `LT11`:513, `LT12`:548, `LT13`:590, `LT14`:613, `LT16`:635, `LT17`:661, `LT18`:691, `LT15`:735; `RL1`:46, `RL2`:65, `RL3`:85, `RL4`:101, `RL5`:118, `RL6`:138, `RL7`:162, `RL8`:184, `RL10`:207, `RL9`:225.

### `packages/react/test/support/`
`collect.ts`, `environment.ts`, `gates.ts`, `hostile.ts`, `reporterThrew.ts`, `settle.ts`, `sweepCounter.ts`, `trees.tsx`. The new defer helper (name the planner's, e.g. `recordingDefer.ts`) is an addition.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| When a registry is recycled (hold/release, one macrotask) | Package-private headless module (`RegistryLease.ts`, unchanged) | none | closed three-state machine, injected `defer`, its own seam and mutation entry (ADR-QD-195 d2, d7) |
| What a construction, a commit and a recycle do (create, seed, record latest, write subject, detect a swap, `reset` then write back) | Package-private headless module (new `RegistryOwner.ts`) | none | lifetime logic must be measurable without rendering; it imports no React and composes the lease |
| Reporting `AtomsReplaced`, `InstrumentedInProduction`, `UnwritableGateRegistry` | Browser / React (`QadiProvider.tsx`, through `DeveloperSignals.ts`) | none | the owner takes a callback and knows nothing of developer signals (D-09) |
| Running effects in order, holding and releasing across StrictMode / `<Activity>` / unmount | Browser / React (`QadiProvider.tsx`) | the owner (forwarded calls) | React's effect order is evidence only a render gives (ADR-QD-195 d3) |
| Providing the registry and gate scope to consumers | Browser / React (context providers in `QadiProvider.tsx`) | none | unchanged |
| The `subject` atom's equality and `keepAlive` | Package-private module (`QadiAtoms.ts`) | the registry (`AtomRegistry.setValue`) | the equal-write no-op lives in the atom's `equals` (Q1) |

## Standard Stack

No package is added. Everything is installed and used by the sibling code.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| effect | 4.1.2 [VERIFIED: node resolve from `packages/react`] | `AtomRegistry.make` / `get` / `set` / `reset`, `Atom.make` / `keepAlive` / `withEquality` in tests | the house runtime; `AtomRegistry` is the thing the owner owns |
| @effect/atom-react | 4.1.2 [VERIFIED] | `RegistryContext` (the provider's context; **not** imported by the owner) | the owner must stay React-free, so it must not import this package |
| react / react-dom | 19.3.1 [VERIFIED] | effect order the provider relies on | installed; the peer floor is `>=19.2.4` (`packages/react/package.json:46`), not exercised |

### Supporting (tooling already in the repo)
| Tool | Version | Use |
|------|---------|-----|
| vitest | 5.1.0 [VERIFIED: ran] | `bash -c 'pnpm exec vitest run --project react <files> < /dev/null'` from the root; project `react`, `happy-dom` (config `packages/react/vitest.config.ts`, `include: ["test/**/*.test.tsx", "test/**/*.test.ts"]`) |
| @testing-library/react | 16.3.3 [VERIFIED] | `render`, `act`, `waitFor`, `screen` for the characterisation |
| @stryker-mutator/core | 10.1.1 [VERIFIED: ran] | `pnpm exec stryker run stryker.react.mjs --mutate <file> [--disableBail] < /dev/null` |
| tstyche | 7.2.5 | `QadiProvider.tst.ts` (held, unchanged) |
| madge | via `pnpm circular` [VERIFIED: ran, `No circular dependency found!`, 1.3 s] | the owner adds `QadiProvider.tsx -> RegistryOwner.ts -> {RegistryLease.ts, type HydrationEngine.ts, type QadiAtoms.ts}`; nothing in that closure imports `QadiProvider.tsx` (only `DevtoolsFeed.ts:46`, `hooks.ts:16`, `index.ts:6` do), so no cycle |

**Installation:** none.

## Package Legitimacy Audit

No external package is installed or added by this phase. Audit: **none**. Packages removed due to SLOP: none. Packages flagged SUS: none.

## Architecture Patterns

### System Architecture Diagram

```
render ──► ownerRef.current ??= makeRegistryOwner({ atoms, subject, initialValues })   (QadiProvider, in render)
                │  build + seed: AtomRegistry.make({ initialValues: [[atoms.subject, subject], ...initialValues] })
                │  latest = { atoms, subject }      lease = makeRegistryLease(recycle, defer?)      NOTHING SCHEDULED
                ▼
 effects of one fiber, in declaration order (one try per fiber, React 19.3.1):
   1 commit effect  [owner, atoms, subject] ─► owner.commit(atoms, subject, onAtomsReplaced)
          │                                       ├─ if latest.atoms !== atoms ─► onAtomsReplaced()   (provider: report(providerSignals.atomsReplaced()))
          │                                       ├─ latest = { atoms, subject }
          │                                       └─ registry.set(atoms.subject, subject)     (equal write is a no-op, Q1)
   2 instrumentation (InstrumentedInProduction)   [instrument]            ── unchanged
   3 unwritable registry                          [instrument, gates]      ── unchanged
   4 hold/release   [owner]  (LAST) ─► owner.hold() ; cleanup ─► owner.release()
                                           │ hold ─► lease: Releasing ─► cancel() ; Unheld ─► Held
                                           └ release ─► lease: Held ─► Releasing { cancel: defer(fire) }     ◄── the ONLY call to defer
 macrotask later (nothing held it again):
   fire ─► lease Unheld ─► recycle():  try { registry.reset() }  finally { registry.set(latest.atoms.subject, latest.subject) }
                                        (reset through the property, never dispose; no seed, no initialValues written back)
 context: RegistryContext.Provider value={owner.registry}, QadiContext value={ atoms, registry: owner.registry, gates }
```

### Recommended project structure
```
packages/react/
├── src/RegistryOwner.ts            # NEW: makeRegistryOwner, RegistryOwner, (RegistryOwnerSeed); package-private, in no barrel
├── src/RegistryLease.ts            # UNCHANGED (held byte for byte)
├── src/QadiProvider.tsx            # ownerRef, 4 effects, no lifetime branch
├── test/RegistryOwner.test.ts      # NEW: headless rows RO1.. (no React import)
├── test/support/recordingDefer.ts  # NEW (name is the planner's): a defer that records and really cancels
├── test/QadiProvider.owner.characterisation.test.tsx   # NEW, born green on the base (name is the planner's)
stryker.react.mjs                   # + RegistryOwner.ts in mutate, header, covering tests
```

### Pattern 1: the owner, shaped like the lease (block-bodied factory arrow, closure state)
**What:** one exported factory; `registry`, `latest` and the lease live in its closure; `hold` / `release` are the lease's own functions; the seed spread happens once.
**Example (shape; field names are the planner's within D-05/D-08/D-09):**
```typescript
// Source: derived from packages/react/src/QadiProvider.tsx:239-244, :282-288 and packages/react/src/RegistryLease.ts:51-85 (HEAD)
import type { AuthSubject } from "@qadi/core";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { InitialValues } from "./HydrationEngine.ts";
import type { QadiAtoms } from "./QadiAtoms.ts";
import { makeRegistryLease } from "./RegistryLease.ts";
import type { LeaseDefer } from "./RegistryLease.ts";

export interface RegistryOwner {
  readonly registry: AtomRegistry.AtomRegistry;
  readonly commit: (atoms: QadiAtoms, subject: AuthSubject | undefined, onAtomsReplaced: () => void) => void;
  readonly hold: () => void;
  readonly release: () => void;
}

export const makeRegistryOwner = (
  seed: { readonly atoms: QadiAtoms; readonly subject: AuthSubject | undefined; readonly initialValues: InitialValues | undefined },
  defer?: LeaseDefer,
): RegistryOwner => {
  const registry = AtomRegistry.make({
    initialValues: [[seed.atoms.subject, seed.subject] as const, ...(seed.initialValues ?? [])],
  });
  let latest = { atoms: seed.atoms, subject: seed.subject };
  const lease = makeRegistryLease(() => {
    try {
      registry.reset();
    } finally {
      registry.set(latest.atoms.subject, latest.subject);
    }
  }, defer);
  return {
    registry,
    commit: (atoms, subject, onAtomsReplaced) => {
      if (latest.atoms !== atoms) onAtomsReplaced();
      latest = { atoms, subject };
      registry.set(atoms.subject, subject);
    },
    hold: lease.hold,
    release: lease.release,
  };
};
```
- `AtomRegistry.make({ initialValues })` passes **only** `initialValues` (no `scheduleTask`, no `defaultIdleTTL`: AGENTS.md §13, header of `QadiProvider.tsx` :10-22).
- `let latest` is **inside** the factory, so `MODULE_STATE_BUDGET` (module-scope bindings only) does not count it; it stays at its one row (`DeveloperSignals.ts`).
- `registry.reset()` is called through the property at recycle time: LT18's `vi.spyOn(registry, "reset")` replaces the instance's method after mount and must still be reached (D-07); an owner that captured `registry.reset.bind(registry)` at construction would not honour it. RO12 pins it headlessly.
- `defer` is passed as the lease's second argument: `undefined` selects the lease's `timeoutDefer` default (a default parameter applies for `undefined`), so the provider passes none and LT18's `setTimeout` spy still sees the call (`timeoutDefer` resolves `setTimeout` at call time).
- `[atoms.subject, subject] as const` is the source's own tuple (`QadiProvider.tsx:241`); no new `as`.
- A throwing `onAtomsReplaced` propagates out of `commit` before the record and the write, exactly as a throwing first effect aborts the rest of the fiber's list today; the provider's reporter cannot throw (Q4).

### Pattern 2: the provider after the change (outline, not code to paste)
```typescript
// Source: ADR-QD-195 d1 (build in render), d3 (hold last); 86-CONTEXT D-08, D-11
const ownerRef = useRef<RegistryOwner | undefined>(undefined);
const owner = (ownerRef.current ??= makeRegistryOwner({ atoms, subject, initialValues }));
// ticket-34 comment here: the subject is written in an effect, never in render
useEffect(() => {
  owner.commit(atoms, subject, () => report(providerSignals.atomsReplaced()));
}, [owner, atoms, subject]);
// … the two instrumentation effects, unchanged …
useEffect(() => {
  owner.hold();
  return () => owner.release();
}, [owner]);
// context: registry = owner.registry in RegistryContext.Provider, the `value` memo, and nowhere else
```

### Pattern 3: the recording defer for the headless tests (the `fakeDefer` shape, in a new support file)
```typescript
// Source: packages/react/test/RegistryLease.test.ts:14-32 (HEAD), read; the lease test is pinned, so the shape is copied, not imported
export const recordingDefer = () => {
  let pending: Array<() => void> = [];
  const counts = { defers: 0, cancels: 0 };
  const defer: LeaseDefer = (run) => {
    counts.defers += 1;
    pending.push(run);
    return () => { counts.cancels += 1; pending = pending.filter((queued) => queued !== run); };
  };
  const fire = (): void => { const runs = pending; pending = []; for (const run of runs) run(); };
  return { counts, defer, fire };
};
```
A defer that fires **synchronously** (or never really cancels) makes a "recycles nothing" row pass for the wrong reason (PITFALLS 86-C): the double must hold runs until `fire()` and must remove a cancelled run from `pending`.

### Anti-Patterns to Avoid
- **A module-scope helper arrow, `Match`, table or string in `RegistryOwner.ts`** (an `Ignored` mutant under `ignoreStatic`, Q3). Everything inside the factory.
- **`registry.get` before the `set`** to keep the guard's side effect (an equivalent mutant, Q1).
- **`hold`/`release` re-implemented in the owner** (two copies of the lease's throwing-`defer` / throwing-`recycle` properties, PITFALLS 86-E). Forward the lease's functions.
- **The owner calling `defer`, `hold()` or `release()` at construction**, or subscribing to anything (inertness, D-06, INV-QD-418).
- **Writing the latest in render, accepting `initialValues` after construction, merging the commit into the hold effect** (PITFALLS 86-B; D-08 refuses each).
- **`dispose()`, a registry in state or an effect, `scheduleTask`, `defaultIdleTTL`, a module-scope `let`, `// Stryker disable`** (WX-04, AGENTS.md §13).
- **Importing `react`, `@effect/atom-react`, `./QadiProvider.tsx`, `./hooks.ts` or `./DeveloperSignals.ts` into the owner.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| When to recycle | a second timer / flag in the owner or provider | `makeRegistryLease(recycle, defer)` (unchanged) | one machine, one test set, 28/28 killed (measured) |
| An equal-subject no-op | a guard comparing subjects | the `subject` atom's own `Atom.withEquality(subjectsEqual)` (`QadiAtoms.ts:240-243`) | the registry already ignores an equal write (Q1); RC-01 pins it |
| Seeding the registry | a post-construction `registry.set` loop | `AtomRegistry.make({ initialValues })` in render | the first render must already hold the subject (ADR-QD-195 d1) |
| A cancellable deferral in tests | `vi.useFakeTimers` around a real `setTimeout` | the recording defer (Pattern 3) | the lease takes an injected `defer`; fake timers would hide React's commit order in the render tests and are unnecessary headless |
| A render-count or frame probe for the owner | a React render in `RegistryOwner.test.ts` | direct calls on the owner and a real `AtomRegistry` | PREG-03 requires no rendering |
| Developer-signal reporting | importing `providerSignals` into the owner | the `onAtomsReplaced` callback | keeps INV-QD-387's one row and the owner React- and signal-free (D-09) |

**Key insight:** the lifetime rule is small enough that every line of it can be a mutant a headless test kills; the way to keep it that way is to give the owner no branch except the one `!==` and no state except `latest`.

## Runtime State Inventory

A refactor (the wiring moves), so each category is answered:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None: the registry is in-process memory, rebuilt per provider mount; no datastore keys, collection names or ids mention `registryRef`, `latestRef`, `leaseRef` or `atomsIdentityRef` (`git grep` finds the names only in `QadiProvider.tsx` and in `spec/` prose: `spec/invariants.md:4761` names `registryRef`, `spec/traceability.md:83, :85, :273` name `registryRef` / `latestRef`) | none (data); the spec prose that names the refs is edited in the records plan |
| Live service config | None: no external service names these identifiers | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `packages/react/lib/` (compiled output of the old provider; git-ignored, regenerated by `pnpm build` / `tsc -b`), `reports/mutation-react/` (overwritten by the runs in this research and by the phase's; git-ignored), `examples/nextjs-newsroom/.next/` (stale chunks; git-ignored) | none: regenerated |
| Archived phase records | `.planning/milestones/v1.10-phases/QD-82-…/82-check.mjs` mode `single-owner` will report differently on the new provider (Q7) | an expected-reports ledger in `86-earlier-checks.mjs`; do not edit the archived script |

## Project Constraints (from CLAUDE.md / AGENTS.md)

Binding for the new code (AGENTS.md sections cited; user memory in italics):
- §1 imports: `import * as AtomRegistry from "effect/reactivity/AtomRegistry"` (namespace, submodule), relative imports end in `.ts`, `import type` for type-only (`verbatimModuleSyntax`). Cross-package: a **named** import from `@qadi/core` (`import type { AuthSubject } from "@qadi/core"`).
- §2/§3: the owner is a factory plus a **separately exported `interface`**; no `Context.Service` is needed (the lease is not one either); a layer is not involved.
- §5 `Effect.fn`: the owner holds no Effect; no `Effect.fnUntraced` (`UNTRACED_BUDGET`).
- §5a `Match`, not `switch`: the owner has no tagged union (the three-state union is the lease's); no `switch` (`SWITCH_BUDGET` stays at 3).
- §6 forbidden: no `as`, `!`, `any` (the existing `[…] as const` tuple is the one `as const` and is already accepted); no `console`, `process.env`, `Date.now`, `async`; **no module-scope `let`/`var`** (`MODULE_STATE_BUDGET` stays at `DeveloperSignals.ts`: 1); no `// Stryker disable`; no `Record<string, unknown>`.
- §7a: no `JSON.parse`, `Schema.decode*`, `onExcessProperty` in the owner (`UNTRUSTED_DECODE_BUDGET`).
- §9 barrels: `RegistryOwner.ts` stays out of `src/index.ts` and is **not** re-exported from `QadiProvider.tsx` (the barrel does `export * from "./QadiProvider.tsx"`); ADR-QD-099.
- §10 tests: `@effect/vitest` is for Effect tests; the owner is plain TypeScript, so the lease test's `vitest` `describe/it/expect` style (`RegistryLease.test.ts:8`) is the precedent. `packages/react/src/**` coverage floor 90% (`vitest.config.ts:76-81`).
- §11/§12 spec is normative: `typescript` fences compile (`check-doc-examples.mjs`), `ts` fences do not; new BEH use `ts` or none.
- §13 React: no registry in state or an effect; no `scheduleTask`/`defaultIdleTTL`; atoms and decisions never in React state; instrumentation off means absent; "A guard may record that it exists…" is untouched.
- §14 `@qadi/promise`'s "no branch in it may decide anything" is the standard the provider is now held to for lifetime (PITFALLS 86-D).
- Doc-comment shape: one-line summary first, the why (ADR numbers, history) after.
- *User memory:* closed union over widening; prefer the complete design (breaking changes OK, compatibility is never the tiebreaker); `Record<string, unknown>` is a hack; in autonomous mode decide and record, never ask.
- Phase rules: never `node scripts/next-id.mjs`; reserved ids only; `--date 2026-11-25` on `spec-revise`; no push/merge/tag/release/`changeset version`; never `git add -A` under `.planning/milestones`; never stage `.planning/config.json` or `README.md` (both show as modified in the working tree); verify commands run as `bash -c '…'` or `/usr/bin/grep`; globs quoted; `< /dev/null` on every pnpm/vitest/stryker call.

## Characterisation cells: what is pinned, what is missing (D-12, PREG-01)

**Already pinned** (read this session): LT1 to LT18 (the long-hide matrix: one registry via `seen.size`, first-frame reads via `IdLog`, `AtomsReplaced` once in LT8, seeds not re-applied LT9 to LT11, reset throwing LT18); RL1 to RL10 (the lease); `edges.test.tsx` "releases its registry after it unmounts"; SUBJ1 to SUBJ3; SD1 to SD5; P1 to P5; `QadiProvider.signals.test.tsx` (`AtomsReplaced` told, in production too, an inline reporter re-fires nothing); `QadiProvider.test.tsx` "atoms identity (DA-06)"; `QadiAtoms.test.ts` RC-01 (the equal write at the atom layer).

**Not pinned anywhere** (D-12's cells, with what the base is expected to show and the scratch variant that turns each RED). All in **one new born-green file**, never edited afterwards (later rows go in a separate file), reusing the lifetime file's harness by **copy** (`rig`, `IdLog`, `RegistryTap`, `pastTheRelease`, `longHide`; the lifetime file is pinned, so it cannot export them) or through a new support module. Each title on **one line** (`it("C1 …", …)`) because verify greps read `it(` heads (85-05 lesson).

| # | Cell | Expected on the base | Scratch variant that turns it RED |
|---|------|----------------------|-----------------------------------|
| C1 (a) | `initialValues` carrying an entry for `atoms.subject` wins at construction: the first render reads the seeded value, and after the commit the prop subject is read | ids `[<seeded>, <prop>]` `[ASSUMED: read the real sequence from the base run]`; headless probe confirms later entry wins: `later entry wins: seeded` | seed order `[...initialValues, [atoms.subject, subject]]` |
| C2 (b) | `renderToString` of a childless provider calls `setTimeout` zero times | 0 calls `[ASSUMED]`; probe: a keepAlive-only registry (`AtomRegistry.make` with two seeded keepAlive atoms, `get`, `set`) made 0 `setTimeout` calls | a scratch edit that calls `lease.hold(); lease.release()` in render (`setTimeout` called once) |
| C3 (b') | a render that is built and then dropped (two providers, the first never committed: render into a `renderToString`, then nothing) leaves no timer | 0 calls | same as C2 |
| C4 (d) | in a commit that swaps the atom set, the reporter runs **before** the subject is written: the reporter reads the new set's `subject` through the tapped registry and sees `undefined`; after the commit the registry holds the subject | reporter saw `undefined`, then registry reads the prop subject | move the `report` after the write in the provider (scratch) |
| C5 (c) | a re-render with a fresh, structurally equal subject notifies no subscriber of `atoms.subject`, re-evaluates no mounted decision and keeps the stored object; a genuinely different subject notifies exactly once | heard 0 / decisions unchanged / `registry.get === first`; twin heard 1 | delete `Atom.withEquality(subjectsEqual)` in `QadiAtoms.ts` (the equal write then notifies) |
| C6 (e) | `AtomsReplaced` is **not** reported on a StrictMode double effect, and not on a plain reveal after a long hide with unchanged atoms | `tags` stays `[]` | report unconditionally in the commit (scratch) |
| C7 (f) | a commit that changes the subject **and** the atom set together is the one a long hide's recycle writes back: the reveal's first frame reads the new set's subject | `ids` contain no `"none"` and no old id, last is the new id | recycle writes `seed.atoms`/`seed.subject` (first closure) |
| C8 (D-09) | a throwing `onDeveloperSignal` on a swap still ends with the subject written into the new atom set | the new set's `subject` reads the prop subject; the `ReporterThrew` line goes to a stubbed `console.error` | remove the `try/catch` in `contain` (`DeveloperSignals.ts:236-241`) |
| C9 (a') | a first commit with **no** reader of the subject leaves `registry.get(atoms.subject)` equal to the subject (the unguarded write's first-commit path, Q1) | reads the prop subject | omit the commit's write |

C5 and C9 are the pair that make D-10's removal observable; the `registry.refresh` divergence (Q1) is recorded in ADR-QD-199, not pinned. C1's "wins in the first render" is a quirk worth keeping (D-06): the commit effect then overwrites it with the prop subject because the guard's `registry.get(...)` read the seeded value and `!== subject` held.

Every cell gets one scratch-edit failure recorded in `86-RED-EVIDENCE.md` (WX-06; format `- failed: <title>` as in `84-RESEARCH.md` Pitfall 9 and `85-RED-EVIDENCE.md`), the edit restored from a copy, and `git diff <base> -- packages/react/src` empty afterwards.

## Owner test rows (D-13, PREG-03): `packages/react/test/RegistryOwner.test.ts`

No React import. A real `AtomRegistry` (the owner's own `registry`), a real atom set `makeQadiAtoms(EvaluationServicesNone)` (cheap, used by every provider test) or a stub with a `subject` atom, host atoms `Atom.make("default").pipe(Atom.keepAlive)` seeded through `initialValues`, and `recordingDefer()`. Every row ends with a **further operation**, so a mutated state shows in what happens next (the lease test's discipline, `RegistryLease.test.ts:1-8`). Ids are the file's own (`RO1` …), never a phase, plan or decision number (WX-07). **Titles on one line.**

| Row | What it asserts | Twin (fails if the recycle is removed) | Scratch variant that turns it RED |
|-----|-----------------|----------------------------------------|-----------------------------------|
| RO1 | built and dropped, then committed and held: `counts.defers === 0`, then `fire()` recycles nothing (a seeded host atom still reads its seed) | RO2 | the factory calls `lease.hold(); lease.release()` (defer at construction) |
| RO2 | after hold then release, `fire()` recycles **once**: a seeded host atom reads `"default"`; a second `fire()` does nothing more (reset spy count 1) | (this is RO1's twin) | recycle body removed (host atom keeps its seed) |
| RO3 | never runs a recycle it did not schedule: `fire()` on an owner nothing released, after commits and holds, changes nothing | RO2 | the factory schedules at construction |
| RO4 | hold, release, hold: `counts` `{ defers: 1, cancels: 1 }`, then `fire()` recycles nothing; a later release then `fire()` recycles once | RO2 | `hold` does not cancel |
| RO5 | **a long hide recycles exactly once and re-seeds from the latest commit before any read**: two commits with distinct subjects and atom sets, release, `fire()`, and the **first** read after `fire()` is `registry.get(latestAtoms.subject)` equal to the latest subject (not the seed's, not the earlier commit's) | RO4's twin leg | recycle writes `seed.subject` / `seed.atoms` |
| RO6 | a recycle whose `reset` throws (spy on `owner.registry` after construction) still writes the subject back, the error escapes the fired run, and the owner stays usable (a second release then `fire()` recycles again) | RO2 | remove the `try/finally` (write skipped) |
| RO7 | a recycle re-applies neither `initialValues` nor a seed: a seeded host atom reads `"default"`; an `initialValues` entry for `atoms.subject` does not return (the latest commit's subject does) | RO2 | recycle re-seeds from `initialValues` |
| RO8 | commit detects a swap **once**: first commit with the construction atoms calls the callback 0 times; a commit with a new set 1; a repeated commit of the same new set still 1; swapping back 2 | (detection is not a recycle; its twin is the swap leg inside the row) | `if (true)`, `if (false)`, `===` for `!==` |
| RO9 | commit's order, callback before the write: a callback that throws leaves the registry's subject **unchanged** (the write did not run) and the owner usable; a callback that reads the new set's `subject` sees its default | RO8 | write before the callback |
| RO10 | commit's order, **record before write**: a subscriber on `atoms.subject` that throws on notification makes `commit` throw, and a later release then `fire()` still writes back the committed subject (the latest was recorded before the write) | RO5 | record after the write |
| RO11 | construction seeds the subject **first** and `initialValues` after: an `initialValues` entry for `atoms.subject` is the value read before any commit; with no `initialValues` the registry holds exactly the subject node (`getNodes().size === 1`); with two host entries, three | RO5 | seed order reversed; `?? []` replaced (`["Stryker was here"]` throws at construction, probed: `TypeError: Cannot use 'in' operator …`) |
| RO12 | a `reset` replaced on the registry **after** construction is the one a recycle calls (LT18's reliance) | RO6 | owner captured `registry.reset.bind(registry)` at construction |
| RO13 | a recycle detaches a subscription held directly on `owner.registry` (the host's `registry.subscribe` stops hearing) | RO2 | recycle removed |
| RO14 | one `registry` object across every operation (`owner.registry` identity before and after commit, hold, release, `fire()`) | RO2 | recycle replaces the registry |
| RO15 | a throwing `defer` in `release` leaves the owner usable and the lease held (delegation, not restatement: one case, the machine's own cases stay in `RL8`) | none | owner swallows or restates |

`RO1`/`RO3`/`RO4` are the "recycles nothing" rows and each has RO2 / RO5 / RO7 as its "recycles once" twin that fails with the recycle removed (the scratch variant "recycle body removed" turns RO2, RO5, RO6, RO7, RO13, RO14 RED together and none of RO1/RO3/RO4 may be the only test of that mutant). Record the failing assertion text for each row in `86-RED-EVIDENCE.md`.

**Expected owner mutants, and the row that kills each** `[ASSUMED]` (read from the shape in Pattern 1; the Stryker run is the check): seed `ObjectLiteral`/`ArrayDeclaration` → RO11; `??` → `&&`, `[]` → `["Stryker was here"]` → RO11; `try` block `{}` → RO2/RO7; `finally` block `{}` → RO5/RO6; the `reset()` and the `set(...)` call statements → RO2, RO5; `latest` initial object → RO5 (first release without a commit); `if (latest.atoms !== atoms)` → `true`/`false`/`===` and the `{ onAtomsReplaced() }` block → RO8; `latest = { atoms, subject }` → `{}` → RO5/RO10; the commit's `registry.set` → RO5/RO9; `defer` pass-through → RO2 (the recording defer is the one that fires). No equivalent mutant is expected: there is no guard, no default parameter of the owner's own, no `Match`, and `hold`/`release` are forwarded by reference.

## Mutation and coverage mechanics (D-15, WX-05)

- **Invocation** (alone, stdin closed, nothing else running): `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/RegistryLease.ts --disableBail < /dev/null` (base **and** close, identical) and `… --mutate packages/react/src/RegistryOwner.ts --disableBail < /dev/null` (close). Stryker 10.1.1, `testRunner: "vitest"`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `thresholds { high 90, low 80, break 80 }`, `timeoutMS 20000`, reports at `reports/mutation-react/mutation.json` (overwritten by every run: read it **between** runs, never in parallel) `[VERIFIED: stryker.react.mjs read in full]`.
- **Script shape**: `86-mutation.mjs` = `85-mutation.mjs` (494 lines, `record base|close <group> [--restart]`, `compare`, `probe`, `--self-test`) for the born-file judge and the removed-mutant `compare`, plus `82-mutation.mjs`'s `killers` and `disableBail` group fields. Two groups: `lease` (base + close, `files: ["packages/react/src/RegistryLease.ts"]`, `disableBail`) and `owner` (`closeOnly`, `disableBail`, `killers: "packages/react/test/RegistryOwner.test.ts"`). `UNMEASURED` = `QadiProvider.tsx` with the string adapted (Q3). Derive the script's directory from `import.meta.url` (85-01's decision).
- **Base figure to compare the lease close to:** `killed 28, timeout 0, survived 0, noCoverage 0, ignored 0` on `RegistryLease.ts` at HEAD (re-measured this session, 57 s). `record base lease` must run on a clean tree **before any edit** (a base is never taken from an older record).
- **Born-file rule for the owner**: at least one Killed, no Survived, NoCoverage, Ignored or Timeout, and every Killed mutant has a killer in `RegistryOwner.test.ts`. A survivor is closed with a test, never a rewrite to hide it, never a re-baseline, never `// Stryker disable` (WX-04, WX-05).
- **`stryker.react.mjs` edit** (same commit that creates the owner): add `"packages/react/src/RegistryOwner.ts"` to `mutate` (after `RegistryLease.ts`); the header names it ("`RegistryOwner.ts` is the one place a provider's registry is built, committed to and recycled, so a surviving mutant there is a registry seeded wrongly, a subject written from the wrong commit, or an atom-set swap that goes unreported (ADR-QD-199)", and "`RegistryLease.ts` decides when" stays) and the covering-tests sentence adds `RegistryOwner.test.ts`. Whether Stryker errors on a missing explicit `mutate` path was never run (SUMMARY gap); this phase renames nothing, so it does not arise.
- **Coverage:** `packages/react/src/**` 90% lines/functions/branches/statements (`vitest.config.ts:76-81`); the owner is fully reachable through its own tests. Run `pnpm coverage` once at the end; a per-glob shortfall fails the run. `QadiProvider.tsx` shrinks and its branches fall with it.
- **After a review-fix round:** `record close <group> --restart`, then `compare`, then `pnpm check:pr < /dev/null` and `pnpm spec:package < /dev/null`, each alone.

## Spec registers: exact locations and formats (D-16, D-17, PREG-05)

Each spec document opens with a Document Control table; edit its header only through `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-25` (bumps the minor version in the `Revision` row and the `Change History` cell; `--check` is the drift gate run by `pnpm spec:verify`) `[VERIFIED: 85-RESEARCH read; scripts/spec-revise.mjs]`. Template: Phase 85's records (ADR-QD-198 `Rev 1.0 (new)`, CCR-QD-477).

| Record | File and line at HEAD | Edit |
|--------|-----------------------|------|
| ADR-QD-199 (new) | `spec/decisions/199-a-providers-registry-lifetime-has-a-react-free-owner.md` (slug is the planner's), Document ID `QADI-ADR-199` (gate 10: the id equals the file number); copy the section layout of `195-…md` (Document Control, `## Context`, `## Decision`, `## Alternatives considered`, `## Consequences`, `## What enforces it`, `## Related`) | new, Rev 1.0; Decision records D-05..D-11 and D-14; Alternatives re-list ADR-QD-195's nine rejections as **still rejected** and add the two new ones; Consequences state the Q1 divergence, the Q5 audit table (zero deletions) and "ORDER lines were observed on React 19.3.1" |
| `spec/decisions/index.yaml` | entries `- id`, `file`, `title`, `status`; ADR-QD-195 at `:609`, ADR-QD-198 at `:621` (last) | append ADR-QD-199, status `Accepted — amends ADR-QD-195`; add `amended 2026-11-25 (ADR-QD-199: …)` to ADR-QD-195's status |
| ADR-QD-195 | `spec/decisions/195-…md`, Rev 1.3 | Rev 1.4: dated note (not a supersession): decision 2's "imports neither React nor the provider" extends to the owner; decision 3's "the provider only holds and releases" now forwards to the owner; decision 4's ref is the owner's latest; "What enforces it" and the mutation record add `RegistryOwner.test.ts` and the owner's `mutate` entry; Related links ADR-QD-199; older text stays as written |
| BEH-QD-766, 767 (new) | `spec/behaviors/09-react.md`, after BEH-QD-750 (`:1191`, the last of the provider group); format `## BEH-QD-7NN: <title>`, then `> **Invariant:**` / `> **Decision:**` / `> **See:**` blockquote, a fenced `REQUIREMENT:` block, prose, a `Pinned by … Specified in [ADR-QD-199](…) (CCR-QD-478).` paragraph | 766: a provider's commit is one transition (a swapped atom set is reported, the latest committed atoms and subject recorded, the subject written, in that order, before the hold); 767: building a provider's registry schedules nothing (a server render and a render React discards leave no recycle pending). BEH-QD-768, 769, 770 are **unused** |
| BEH-QD-747..750, BEH-QD-067 | `09-react.md:1108-1215`, `:246` (`## BEH-QD-067: Provider`), `:393` (BEH-QD-516) | restate where they say "a ref the provider writes in an effect" (BEH-QD-749 prose, `:1173`) or name `RegistryLease.ts`/`QadiProvider.tsx` as the decider (BEH-QD-748 `:1146`: "The decision is `RegistryLease.ts`'s and nothing else's"); the owner's `RegistryOwner.test.ts` rows become the **first** entry of each "Pinned by". BEH-QD-067's equal-subject requirement (`:296-301`) gains the owner as the writer; BEH-QD-516 needs no edit (it names `QadiAtoms.ts`) |
| INV-QD-417, 418 (new) | `spec/invariants.md`, after INV-QD-416 (`:4829`, last); format `## INV-QD-NNN: <title>`, a paragraph, `**Source**:`, `**Implication**:`, `**Enforcement**:`, `**Related**:` | 417: the registry's lifetime rule lives in one module that imports no React and `QadiProvider.tsx` holds no lifetime branch (Enforcement: `RegistryOwner.test.ts`, the owner's mutation record, **and the phase's `provider-forwards-only` check named as a review aid, not as a merge gate**: Phase 85's decision for INV-QD-415 was to say "kept by the model's own tests and review, not by a merge gate" when the phase check is not part of `pnpm check`); 418: the owner is inert at construction, only a release reaches `defer` |
| INV-QD-409, 410 | `spec/invariants.md:4745`, `:4757` | Source and Enforcement lines name the owner: INV-QD-409's Source ("`QadiProvider.tsx` (… the one effect that holds and releases the lease) and `RegistryLease.ts`") and INV-QD-410's Source ("`registryRef` in `QadiProvider.tsx`, built lazily in render and never assigned again") now name `RegistryOwner.ts` and the owner ref |
| `spec/traceability.md` | BEH rows `:82-86` (746-750); INV rows `:272-273`; ADR row `:462`; test-file rows `:765-769` (one per test file: `| `packages/react/test/RegistryLease.test.ts` | BEH-QD-748, INV-QD-409, ADR-QD-195 — … |`); the `09 — React Integration` summary row `:51` | add BEH-QD-766/767 rows, INV-QD-417/418 rows, the ADR-QD-199 row, a row for `RegistryOwner.test.ts` and for the characterisation file, the new ids on the rows of files whose tests are newly cited; extend `:51`'s id list; rows 83, 85, 273 name `registryRef`/`latestRef` and change |
| `spec/README.md` | CCR rows, last `| CCR-QD-477 | 2026-11-25 | … |` at `:414`; header `Change History` at `:13` | add `CCR-QD-478` listing each touched document and its Rev as `spec-revise` printed, and "Unused: BEH-QD-768, BEH-QD-769, BEH-QD-770", the Q1 divergence, and "`spec/appendices/react-integration.md` §3 (:138-143) describes behaviour, not wiring, and is unchanged (checked)" |
| `spec/appendices/react-integration.md` | `:138-143` | **no edit** (re-read: "creates its own registry, seeds the subject into it at construction … recycles the registry in place a macrotask after its last release … never disposes it" is behaviour) |
| AGENTS.md | n/a | **no edit** (`git grep RegistryLease -- AGENTS.md` returns nothing) |

**Gates that read these** (each run alone, `< /dev/null`): `pnpm spec:verify:strict` (every id has a traceability row and every test file named exists), `node scripts/spec-revise.mjs --check`, `pnpm spec:claims`, `pnpm spec:api`, `pnpm spec:gates`, `pnpm spec:examples`, and gate 10's ADR Document ID check. The `[no-numbering-placeholder]` rule refuses `ADR-QD-NEXT` and siblings in shipped source and tests.

## Changeset (D-04, WX-03)

One file, `.changeset/react-registry-lifetime-has-an-owner.md` (name is the planner's; the precedents are `.changeset/react-registry-recycled-in-place.md` and `.changeset/devtools-the-hydration-block-is-a-model-row.md`):

```markdown
---
"@qadi/react": patch
---

`QadiProvider`'s registry lifetime (building and seeding the registry, recording the latest committed atoms and subject, writing the subject, and the recycle) is kept by one internal module that imports no React, and the provider forwards to it. Nothing a host renders, receives or calls changes. No export changes.
```

`.changeset/config.json` has `fixed` over all nine packages, so one patch bumps them together; do not run `changeset version`. No `upgrading.md` entry (nothing breaking). Do not stage `.planning/config.json`, `README.md` or the untracked `*.iter*.md` files.

## House-style and verify commands

Rules the new code could trip, all in `scripts/check-house-style.mjs` and `oxlint`: `MODULE_STATE_BUDGET` (no `let`/`var` at module scope; the owner's `let latest` is inside the factory), `SWITCH_BUDGET` (use none), `UNTRACED_BUDGET` (none), `ANY_BUDGET`/`no-explicit-any`, `UNTRUSTED_DECODE_BUDGET`, `[no-numbering-placeholder]`, `METRIC_ID_LITERAL_BUDGET`/`SPAN_KEY_LITERAL_BUDGET` (no `"qadi_…"`/`"qadi.…"` literal in the new tests outside a title), `PORT_DOUBLE_BUDGET` (the owner tests build no port error), `NOT_CALLABLE_PIN_BUDGET` (no negative callable pin: the phase adds no `.tst.ts`), and `oxlint`'s unused-import rule (the provider's `AtomRegistry` value import must become `import type * as AtomRegistry`, and `RegistryLease` imports leave the provider). `pnpm circular` ran clean at HEAD and the owner adds no cycle (see the stack table).

Per-task verify commands, each runnable as written from the repository root with stdin closed (the first run of every one against the real tree before it is written into a plan: 85-RESEARCH Pitfall 85-F):
- `bash -c 'pnpm exec vitest run --project react packages/react/test/RegistryOwner.test.ts < /dev/null'`
- `bash -c 'pnpm exec vitest run --project react packages/react/test/QadiProvider.lifetime.test.tsx packages/react/test/RegistryLease.test.ts packages/react/test/edges.test.tsx packages/react/test/ServerRender.test.tsx packages/react/test/QadiProvider.signals.test.tsx packages/react/test/QadiProvider.subject.test.tsx packages/react/test/QadiProvider.seed.test.tsx packages/react/test/QadiProvider.sweep.test.tsx packages/react/test/QadiProvider.test.tsx packages/react/test/QadiProvider.production.test.tsx < /dev/null'` (**10 files, 88 tests, green at HEAD in 2.4 s** [VERIFIED: ran this session]; a stray `.vitest/` directory did not appear)
- `bash -c 'pnpm exec vitest run --project react < /dev/null'` (the whole react project, per wave)
- `bash -c 'pnpm exec tsc -p tsconfig.test.json < /dev/null'`; `bash -c 'pnpm lint < /dev/null'`; `bash -c 'pnpm circular < /dev/null'`; `bash -c 'pnpm test:tstyche < /dev/null'` (`QadiProvider.tst.ts` unchanged)
- Phase end, each alone: `pnpm check:pr < /dev/null`, `pnpm spec:package < /dev/null`, `pnpm spec:verify:strict < /dev/null`, `node scripts/spec-revise.mjs --check`, the mutation `compare`.

## Common Pitfalls

### Pitfall 86-A: the owner schedules something at construction
**What goes wrong:** a render React discards (StrictMode's first dev render, a Suspense retry, a concurrent render) builds an owner nobody commits; a `defer`, a subscription or a `hold()` at construction leaves a timer for a registry nothing holds. **Avoid:** the factory builds, seeds and builds the lease and does nothing else; only `release` reaches `defer`. **Detect:** RO1/RO3 (a recording defer with `counts.defers === 0`), C2/C3, INV-QD-418.

### Pitfall 86-B: a recycle that cannot fail
**What goes wrong:** a "recycles nothing" row that passes because the fake `defer` fires synchronously or never cancels, a one-tick hide-and-show that no macrotask can fall into, or a recycle test with no twin. **Avoid:** the recording defer holds runs until `fire()` and removes a cancelled run; every "recycles nothing" row (RO1, RO3, RO4) has a "recycles once" twin that fails with the recycle removed; the render tests keep real macrotasks (`pastTheRelease`, 50 ms). **Detect:** the "recycle body removed" scratch variant turns the twins RED.

### Pitfall 86-C: the callback order inside `commit` drifts
**What goes wrong:** the report moves after the write, or the record after the write: both compile and pass the render suite. **Avoid:** C4 (reporter sees the subject unset) and RO9/RO10 (a throwing callback leaves the subject unwritten; a throwing subscriber still leaves the latest recorded). **Detect:** the two swap variants in the tables.

### Pitfall 86-D: a module-scope arrow, table or literal in the owner
**What goes wrong:** an `Ignored` mutant (Q3) fails the born-file bar; a tempting `// Stryker disable` is forbidden (WX-04). **Avoid:** everything inside the factory; forward `lease.hold` / `lease.release` by reference. **Detect:** `86-check.mjs owner-shape` (no module-scope arrow const, `Match`, array or object literal) and the `owner` group's `record close`.

### Pitfall 86-E: `registry.reset` captured at construction
**What goes wrong:** LT18 spies the instance's `reset` after mount; a captured bound function bypasses it. **Avoid:** `registry.reset()` through the property inside `recycle` (D-07). **Detect:** RO12; LT18 (held).

### Pitfall 86-F: the characterisation file is edited later
**What goes wrong:** a born file is held against its adding commit; a later row added to it fails `86-pinned-check.mjs`. **Avoid:** later rows go in a separate file (`84-RESEARCH.md` Pitfall 7).

### Pitfall 86-G: a render-count or settle step that cannot see the commit
**What goes wrong:** Phase 85's R1/R2 draft used `vi.waitFor` inside `act`; inside one async `act` React holds every update until the act closes, so a commit count read zero whatever the subject did (85-08 deviation). **Avoid:** if any phase-86 cell counts commits, wait with Testing Library's `waitFor` (it leaves the act environment) and settle relative to what the poll has read; the cells above need no render count (they count `registry.subscribe` notifications and `setTimeout` calls).

### Pitfall 86-H: `phase.complete` ticks the cross-cutting requirements
**What goes wrong:** `gsd-tools phase.complete` flips WX-01 to WX-07 to Complete at each phase and they close with the milestone (`STATE.md:899, :908, :917`). **Avoid:** write requirement lines as explicit id lists, never ranges (`STATE.md:1189`), and revert WX-01 to WX-07 to Pending after `phase.complete`, as Phases 53 to 55 and 85 did; PREG-01 to PREG-05 are the phase's to mark.

### Pitfall 86-I: hard-coded earlier-phase paths and model names in the ported scripts
**What goes wrong:** `85-check.mjs` hard-codes `PHASE_BASE`, a trailer for Opus, `qd85` scratch names and `PLAN_SUBJECT = /^[a-z]+[(]85-[0-9]{2}[)]!?: /`; archived phases moved to `.planning/milestones/<milestone>-phases/` (the 80 path did). **Avoid:** change every hard-coded `85`, the base constant, the scratch directory and the subject regex when porting (`84-RESEARCH.md` Pitfall 4); use the 82 trailer regex; locate earlier phases by name prefix under both trees.

### Pitfall 86-J: a negative gate scoped to the whole tree
**What goes wrong:** a check that "`registryRef` no longer appears" reads merged specs and archived phases that legitimately cite it (`spec/invariants.md:4761`, `spec/traceability.md`). **Avoid:** scope negative gates to the lines this phase adds (`git diff <base> -U0 -- <paths> | /usr/bin/grep '^+'`) or to `packages/react/src/QadiProvider.tsx` text, per `_SHARED-CONTEXT.md`.

### Pitfall 86-K: the unguarded first write on an unread seeded node
**What goes wrong:** see Q1: the node keeps `preserveInitialValueOnBuild = true`. **Avoid:** do not add an unconditional `registry.get` to "fix" it (an equivalent mutant); record it in ADR-QD-199. **Detect:** C5/C9 pass either way; the divergence is documentation, not a pin.

## Code Examples

### The seed order and the recycle, as probed on effect 4.1.2
```javascript
// Source: scratchpad probe2.mjs, run this session against node_modules/.pnpm/effect@4.1.2
const r2 = AR.make({ initialValues: [[a, "subject"], [a, "seeded"]] });
r2.get(a);                      // "seeded"  : a later entry for the same atom wins (D-06)
r2.reset(); r2.set(a, "back");  // reset clears every node; a set then makes a fresh node ("back")
const h = Atom.make("default").pipe(Atom.keepAlive);
const r3 = AR.make({ initialValues: [[h, "seeded"]] }); r3.get(h); r3.reset(); r3.get(h);  // "seeded", then "default"
```

### An `initialValues` entry that is not an atom throws at construction (kills `["Stryker was here"]`)
```javascript
// Source: scratchpad probe2.mjs
AR.make({ initialValues: [[a, 1], ...["Stryker was here"]] });  // TypeError: Cannot use 'in' operator to search for '~effect-atom/atom/Atom/Serializable' in S
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| the provider decides what a construction, commit and recycle do, in render code (unmeasured) | one package-private, React-free owner composing the pure lease (measured and tested headless) | Phase 86 (this) | every lifetime rule is a mutant a headless test kills |
| three effects (atoms identity, latest, subject write) with two refs holding one datum | one commit effect, the owner holds the latest | Phase 86 | the order is stated once, in the measured module |
| `registry.get(atoms.subject) !== subject` pre-check | an unconditional write; the atom's own `equals` decides | Phase 86 | one `registry.get` fewer per commit; one recorded divergence (Q1) |
| `registry.dispose()` after a macrotask (ADR-QD-014) | `reset()` and a subject write-back, held by a lease | Wave 15 (ADR-QD-195) | unchanged by this phase |

**Deprecated/outdated in the research inputs:** "seven effect hooks" (`_WAVE16-CONTEXT.md`: six `useEffect` plus three `useMemo`, Q2); ARCHITECTURE's name `ProviderRegistry.ts` and `.planning/research/` PITFALLS 86-B's "three separate effects in fixed order" (overridden by D-05, D-08); `RegistryLease.ts`'s header sentence "`QadiProvider.tsx` is its one caller" becomes stale after the move and is **not** edited this phase (the file is held).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The owner's Stryker run leaves no `Ignored` mutant when it is a block-bodied factory arrow with nothing at module scope (the lease is the evidence, not the owner) | Q3, Pitfall 86-D | D-15's born-file bar fails; fall back to a function declaration (Phase 85's evidence), recorded as a reviewed edit |
| A2 | C1's first-render value is the seeded entry and the second is the prop subject (`ids = [seeded, prop]`) | Characterisation cells | the cell's expected text is wrong; the base run reads the real sequence (a read, not a risk to the design) |
| A3 | A childless provider's `renderToString` makes zero `setTimeout` calls on the base (the registry-only probe made 0) | C2, C3 | the cell asserts "no more calls than a registry-only render"; the base run settles it |
| A4 | The owner has roughly 40 to 60 mutants and runs in a few minutes with `--disableBail` | Mutation mechanics | scheduling only |
| A5 | The predicted mutant-to-row map in "Owner test rows" is complete | Owner test rows | a survivor is closed with a test (the rule), never a rewrite |
| A6 | `registry.refresh(atoms.subject)` by a host before any read is the only divergence between the guarded and unguarded write | Q1 | a second divergence would need to be recorded; the probes covered notification, re-evaluation, identity and `refresh` |
| A7 | RO15 (a throwing `defer` leaves the owner usable) holds with the lease's behaviour: the state is assigned only once `defer` returns | Owner test rows | RO15 asserts the lease's own property through the owner; the lease's `RL8` is the source of truth |

## Open Questions

1. **Does the owner type its seed's atom set as `QadiAtoms` or a narrower structural `{ subject }`?**
   - Known: the owner uses only `atoms.subject` and identity comparison of the atom set; `QadiAtoms` is a type-only import and `makeQadiAtoms(EvaluationServicesNone)` is cheap in tests.
   - Unclear: whether a narrower type is worth a generic parameter.
   - Recommendation: `QadiAtoms` (it is what the provider has and what "an atom set swap" means); revisit only if the headless tests find building real atom sets awkward.
2. **Should the owner group's `killers` check demand a killer among `RegistryOwner.test.ts` for every Killed mutant?**
   - Recommendation: yes (Q3); it is the measured form of "tested without rendering". If a mutant is killed only by a render test, add a row.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | scripts, probes | yes | v26.13.0 [VERIFIED] | none needed |
| pnpm | all commands | yes | in use this session | none |
| vitest | tests | yes | 5.1.0 | none |
| @stryker-mutator/core | mutation | yes | 10.1.1 (ran this session) | none |
| tstyche | `.tst.ts` | yes | 7.2.5 | none |
| happy-dom | React tests | yes | in the react project | none |
| madge | `pnpm circular` | yes (ran) | n/a | none |

No missing dependency. No network or service dependency.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 (project `react`, happy-dom), `@testing-library/react` 16.3.3 for the characterisation, plain `describe/it/expect` for the headless owner file; Stryker 10.1.1 for the owner and the lease; tstyche 7.2.5 unchanged |
| Config file | root `vitest.config.ts` (coverage thresholds `:76-81`), `packages/react/vitest.config.ts`, `stryker.react.mjs` |
| Quick run command | `bash -c 'pnpm exec vitest run --project react <file> < /dev/null'` |
| Full suite command | `pnpm check:pr < /dev/null` (plus `pnpm spec:package`, the mutation `compare`, each alone) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREG-01 | LT1 to LT18, RL1 to RL10, every `QadiProvider.*` test, `edges`, `ServerRender` green and unedited | component / unit (held) | the 10-file vitest command in "House-style and verify commands"; `node 86-pinned-check.mjs` | exist, held |
| PREG-01 | create, seed order, subject write, recycle, atoms-replaced characterised on the base | component (born green) | `bash -c 'pnpm exec vitest run --project react packages/react/test/QadiProvider.owner.characterisation.test.tsx < /dev/null'` | Wave 0 (new) |
| PREG-02 | the owner imports no React and nothing from the provider; no `dispose`, `scheduleTask`, `defaultIdleTTL`; nothing at module scope but the factory; `stryker.react.mjs` mutates it | script | `node .planning/phases/QD-86-…/86-check.mjs owner-shape` | Wave 0 |
| PREG-02 | owner mutation: no open or `Ignored` mutant, every kill by an owner test | mutation | `node …/86-mutation.mjs record close owner` then `compare` | Wave 0 |
| PREG-02 | the lease does not fall | mutation | `record base lease` (before any edit), `record close lease`, `compare` | Wave 0 |
| PREG-03 | RO1 to RO15, each "recycles nothing" with its twin | unit | `bash -c 'pnpm exec vitest run --project react packages/react/test/RegistryOwner.test.ts < /dev/null'`; `86-check.mjs seen-failing packages/react/test/RegistryOwner.test.ts` | Wave 0 (new) |
| PREG-04 | the provider holds one owner ref, four effects in the stated order, no lifetime branch and none of the old refs | script | `86-check.mjs provider-forwards-only` | Wave 0 |
| PREG-04 | a provider hidden past a macrotask and shown again still renders its decision, no disposed-registry throw | component (held) | `… QadiProvider.lifetime.test.tsx` (LT1, LT4, LT5) | exists |
| PREG-05 | ADR-QD-199, BEH-QD-766/767, INV-QD-417/418, restated BEH/INV, traceability, CCR-QD-478 and its "Unused" | script + gates | `86-check.mjs records [--close]`; `pnpm spec:verify:strict`; `node scripts/spec-revise.mjs --check` | Wave 0 |
| PREG-05 | zero render tests removed; the audit table is in ADR-QD-199 | script | `86-pinned-check.mjs --all-applied` (no existing test file differs) | Wave 0 |
| WX-01 | `pnpm check:pr` green | gate | `pnpm check:pr < /dev/null` | exists |
| WX-02 | only reserved ids used; `next-id.mjs` never run | script | `86-check.mjs scan-ids`; `records` | Wave 0 |
| WX-03 | a `@qadi/react` patch changeset, "No export changes."; gate 13 and 14 unmoved | gate | `pnpm spec:api`, `pnpm spec:package` | exists |
| WX-04 | no `as`/`!`/`any`/`switch`/`Effect.fnUntraced`/`async`/ambient clock/`Record<string, unknown>`/`// Stryker disable`/module-scope `let` added | script | `86-check.mjs scan-forbidden`; `pnpm lint` | Wave 0 |
| WX-05 | coverage holds; mutation compare green | mutation + coverage | `pnpm coverage < /dev/null`; the `compare` | exists / Wave 0 |
| WX-06 | every new check seen failing | script | `86-check.mjs seen-failing <file> <title>…` against `86-RED-EVIDENCE.md` | Wave 0 |
| WX-07 | no D-number, plan id or phase number in shipped source or tests; nothing released | script | `86-check.mjs scan-ids`, `trailers`; `git tag --contains <base>` | Wave 0 |

### Sampling Rate
- **Per task commit:** the one to three vitest files the task touches plus the matching `86-check.mjs` mode.
- **Per wave merge:** `bash -c 'pnpm exec vitest run --project react < /dev/null'`, `pnpm test:tstyche`, `node …/86-pinned-check.mjs`, `pnpm circular`.
- **Phase gate:** `pnpm check:pr < /dev/null`, `pnpm spec:package < /dev/null`, `pnpm spec:verify:strict`, `pnpm spec:claims`, `pnpm spec:api`, the mutation `compare`; all green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `packages/react/test/QadiProvider.owner.characterisation.test.tsx` (C1 to C9), born green on the base, one recorded scratch failure each, in its own commit before any `src` file moves.
- [ ] `86-check.mjs` (modes: `base`, `commit`, `unchanged`, `seen-failing`, `scan-ids`, `scan-forbidden`, `trailers`, `owner-shape`, `provider-forwards-only`, `records [--close]`, `--self-test`), ported from `85-check.mjs` / `82-check.mjs` with every `85`/`82` name, the base constant, the scratch directory, the subject regex and the id list changed; the trailer regex is the 82 generic one.
- [ ] `86-pinned-check.mjs` (held: every existing file under `packages/react/test` plus `src/RegistryLease.ts`; born: the characterisation file; self-test) and `86-earlier-checks.mjs` (82's `single-owner` expected to exit 1 after the move; Q7).
- [ ] `86-mutation.mjs` (`lease` base+close, `owner` close with `killers`, `UNMEASURED`) and **`86-mutation-base.json` taken on a clean tree before any edit** (`record base lease`).
- [ ] `packages/react/test/RegistryOwner.test.ts` and its `test/support/` defer helper.
- [ ] `86-RED-EVIDENCE.md`.
- Framework install: none.

### Scratch variants (WX-06), one per new check
Each is applied to a copy-restored tree and its failing text recorded:
- C1: seed order reversed; C2/C3: `hold(); release()` in render; C4: report after the write; C5: delete `Atom.withEquality(subjectsEqual)`; C6: unconditional report; C7: recycle writes the seed's first closure; C8: remove `contain`'s `try/catch`; C9: omit the commit write.
- RO1 to RO15: the variants in the "Owner test rows" table; plus "recycle body removed" for the twins.
- `owner-shape`: import `react`, add `scheduleTask`, add a module-scope arrow const, call `dispose()`. `provider-forwards-only`: swap the two effects, add `registry.get`, reintroduce `atomsIdentityRef`, add an `if` to the commit effect. `86-pinned-check`: edit one byte of `QadiProvider.lifetime.test.tsx` or `RegistryLease.ts`. `86-mutation`: planted survivor, planted `Ignored`, planted missing killer.

## Security Domain

`security_enforcement` is enabled (`.planning/config.json`: `"security_enforcement": true`, `"security_asvs_level": 1`, `"security_block_on": "high"`).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | the subject comes from the host; the provider only holds it |
| V3 Session Management | no | none |
| V4 Access Control | yes (fail-closed behaviour of the client decision) | a recycle writes back the latest committed subject and **re-applies no seed or `initialValues`**; a gate whose client answer is missing renders `Pending`, never a superseded allow (ADR-QD-039, ADR-QD-195 d5; BEH-QD-750; RO7; LT9 to LT11) |
| V5 Input Validation | no (no untrusted input crosses the owner; no `JSON.parse`/`Schema.decode*`) | `UNTRUSTED_DECODE_BUDGET` unchanged |
| V6 Cryptography | no | none |

### Known Threat Patterns for this change
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A server-supplied allow re-appears after a recycle (a seed re-applied) | Elevation of privilege | the recycle is `reset()` plus the subject write-back only; RO7 and LT9 to LT11 pin it; the owner takes `initialValues` once, at construction (D-05, D-06) |
| A subject written from a stale closure (the first commit's) shows a previous user's verdicts | Information disclosure | the recycle writes `latest`, recorded by `commit` in an effect (RO5, RO10, C7, LT16, LT17); a render-phase write stays rejected (ticket 34) |
| A reset that throws leaves nodes cleared and no subject (consumers read `undefined` and fail open or hang) | Denial of service / Spoofing | the subject write is in a `finally` (RO6, LT18) |
| A disposed registry on reveal (a throw becomes a lockout) | Denial of service | `dispose()` is never called; the registry is recycled in place (INV-QD-409; the owner has no dispose) |
| A swapped atom set goes unreported (a tenant switch the host did not intend) | Tampering | `commit` detects it once and calls the provider's reporter before the write (RO8, RO9, C4, C6); the report stays in `DeveloperSignals.ts` |

## Sources

### Primary (HIGH confidence)
- Files opened this session at HEAD `3dd201a3` (`packages/react/` identical to `ac7578f3`): `packages/react/src/QadiProvider.tsx` (whole), `RegistryLease.ts` (whole), `QadiAtoms.ts` (:222-243), `DeveloperSignals.ts` (:228-246, :498-510, :536-556), `HydrationEngine.ts` (:68), `index.ts`; `stryker.react.mjs` (whole); tests `QadiProvider.lifetime.test.tsx` (LT1-LT18, harness), `RegistryLease.test.ts` (:1-80, titles), `QadiAtoms.test.ts` (:120-175, RC-01), `QadiProvider.test.tsx` (:226-250), `edges.test.tsx` (:255-300), `ServerRender.test.tsx` (imports), `QadiProvider.subject.test.tsx` (:1-40), `QadiProvider.tst.ts`, `support/settle.ts`, `support/sweepCounter.ts`; `vitest.config.ts` (:40-110), `packages/react/vitest.config.ts`, `package.json` scripts; `node_modules/.pnpm/effect@4.1.2/node_modules/effect/dist/reactivity/AtomRegistry.js` (:205-300, :415-560, :620-650, :880-960); `node_modules/.pnpm/react-dom@19.3.1_react@19.3.1/node_modules/react-dom/cjs/react-dom-client.development.js` (:13735-13795); `spec/decisions/195-…md` (whole), `spec/behaviors/09-react.md` (:246-330, :393-425, :1083-1215), `spec/invariants.md` (:4745-4768), `spec/appendices/react-integration.md` (:130-150), `spec/traceability.md` and `spec/README.md` rows, `spec/decisions/index.yaml` greps; `.planning/` documents named in the brief; Phase 85's `85-RESEARCH.md`, `85-pinned-check.mjs` (:1-140), `85-check.mjs` (:1-80), `85-earlier-checks.mjs` (:1-60), summaries 85-01 to 85-11 (deviations and key decisions); Phase 82's `82-mutation.mjs` (:1-60), `82-mutation-close.json`, `82-check.mjs` (:1-45, :277-335).
- Runs this session: `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/RegistryLease.ts --disableBail < /dev/null` (28 Killed, 0 of everything else, 57 s); the ten-file react vitest command (10 files, 88 tests, green, 2.4 s); `pnpm circular` (clean, 1.3 s); three node probes of effect 4.1.2's `AtomRegistry` (equal write, seed order, `reset`, `["Stryker was here"]`, `refresh`, `setTimeout` count) under the scratchpad `probe/` directory.

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md`, `PITFALLS.md` (86-A to 86-E), `_WAVE16-CONTEXT.md`, `_SHARED-CONTEXT.md`.

### Tertiary (LOW confidence)
- None used.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no package added; versions read from `node_modules`.
- Architecture: HIGH, one-for-one precedent (the lease, ADR-QD-195, Phase 82's lease group, Phase 85's born-file and pinned-check scripts).
- Registry semantics (Q1): HIGH, source read and probed on the installed version.
- Findings Q2 to Q8 and pitfalls: HIGH for the evidence; MEDIUM for A1 to A5 (the owner's own Stryker result and the exact C-cell texts, each with the run that settles it).

**Research date:** 2026-11-25
**Valid until:** 2026-12-25, or until `packages/react/` or `spec/` changes on `arch-wave-16` (check `git diff ac7578f3 HEAD -- packages/react spec`).
