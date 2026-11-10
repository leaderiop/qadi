---
id: ARCH-20
title: A headless SimulationSession owns the simulator's state, sources, capture and runs; the form is a round-tripping codec; Simulator.tsx renders and dispatches
strength: Strong
status: done
evidence_verified_at: e328e75
depends_on: []            # nothing; ARCH-24 is a sibling, not a prerequisite (D-20-a)
blocks: []
adrs_touched:
  - ADR-QD-047 (amend: "`@qadi/devtools/react` renders that model and computes nothing" is false for screen 5 at HEAD; the amendment records that the simulator's session is model, and names the session store beside `TimelineStore`)
  - ADR-QD-050 (amend: "falling through to fixtures would be the worst available failure" is extended from `portsOf` to the session — a chosen source that cannot be honoured is refused as a typed state, never replaced; and "a Live run captures" is stated as the session's rule, not the component's)
  - ADR-QD-034 (constraint: command dispatch and run-state reads use `Match`, never `switch`; `SWITCH_BUDGET` must stay exactly as it is)
  - ADR-QD-037 (constraint: madge gate; the two new model files must be leaves above `Simulation.ts`/`WhatIf.ts`/`Capture.ts`/`Replay.ts`, type-only edges count)
  - ADR-QD-025 + ADR-QD-076 + ADR-QD-098 (constraint: the new model files fall inside `stryker.devtools.mjs`'s `mutate: packages/devtools/src/model/**/*.ts`; `ignoreStatic: true`; break 80; runs stay sequential)
  - ADR-QD-038 (constraint: one changeset, fixed version group)
  - ADR-QD-097 (read: `TimelineStore`/`Source` shape the session copies)
packages: ["@qadi/devtools", "spec", "apps/website (docs only)", "features (BDD, optional scenario)"]
estimate: L   # ≈ 4–5 days on the recommended path (T0–T14). T1–T4 (the four defect fixes) are ≈ 1 day and ship alone.
---

# ARCH-20 — A headless Simulation session

## 1. Verified evidence (at `e328e75`)

Re-checked on `main` at `e328e75` (`git log --oneline -1` →
`e328e75 Keep mutation runs sequential, a worker per core; gate every Stryker config (#146)`).
`git diff --stat d0884e6 e328e75 -- packages/devtools spec/devtools-spec` touches only
`Inspect.ts` and two model tests, so every Simulator line the review cited is where it was.

**How suspected claims were settled.** Three throwaway DOM probes ran from
`$P = /private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/a032054c-2984-4500-9b86-240b3767ee96/scratchpad/wave3/ARCH-20/`,
never from the repo. Each renders the **real** `src/react/Simulator.tsx` (or `DevtoolsDock.tsx`)
by absolute import under a scratch vitest config (`$P/vitest.config.mts`: `root: $P`, happy-dom,
the package's own `test/setupTests.ts`, `@qadi/core` aliased to `packages/core/src/index.ts`,
`react`/`vitest`/`effect/{Effect,Layer}` aliased to the realpaths the package already resolves).
Run with
`cd packages/devtools && ./node_modules/.bin/vitest run --config $P/vitest.config.mts <probe> --reporter=verbose`.

| Probe | Output (abridged) |
| ----- | ----------------- |
| `probe.test.tsx` — Live chosen, host drops `ports` | with ports: `ERROR AttributeResolveError`; after `rerender` without `ports`: Live `aria-pressed=true disabled=true`, cost line "all in this process", **run → `ALLOW`** (answered from the typed fixture `clearance:9`) |
| `probe.test.tsx` — rename subject | alice + `owner:doc-1` → `ALLOW`; rename to bob, chip still reads `owner:doc-1` → `DENY`; add an unrelated chip `viewer:doc-9` → **`ALLOW`** (the old edge silently re-attributed to bob) |
| `probe.test.tsx` — relation with a colon | chip `org:admin:doc-1` displays verbatim, decodes to relation `org`, resource `admin:doc-1` → `DENY` |
| `probe.test.tsx` — attribute text | `a:"7"` and `b:7` both render `a=7`, `b=7` (string vs number indistinguishable) |
| `probe2.test.tsx` — pairs toggle | pairs `aria-pressed=false`; cost "a sweep runs **3** evaluations"; after sweep, table "3 variations of **4** evaluations", 3 rows |
| `probe2.test.tsx` — switch policy mid-run (slow Live port, 40 ms) | result lands **under policy B** (`hasRole("x")`) as `ALLOW`, **no stale marker**, tree `✓ x (role)` — B's tree zipped against A's trace |
| `probe2.test.tsx` — re-seed mid-run | result `ALLOW` + stale marker, but **baseline card: "baseline ev-B — differs at 1 node, with the same verdict"** — row B compared against a run of row A's policy |
| `probe3.test.tsx` — dock tab round trip | subject id `alice` → Log tab → Simulator tab → **`someone`** (form, capture and result gone) |

### C1. The session lives in the view — **CHANGED** (worse than reported)

`packages/devtools/src/react/Simulator.tsx:94-283` is the component. It holds **eleven**
`useState`s, not nine: `chosen`, `seeded`, `draft`, `source`, `clock`, `pairs`, `captured`,
`result`, `running` (`:95-103`) plus `seenSeed` (`:115`) and `seedGeneration` (`:129`); two
`useRef`s, `fiber` (`:150`) and the supersede `token` (`:160`); re-seeding during render
(`:130-141`); policy clamping (`:147-148`); the run loop with fork/observe/supersede
(`:185-216`); and unmount interruption (`:165-171`). `CheckCard` adds two more (`:583-584`),
`Chips` and `Pairs` one each (`:893`, `:938`). `runProgram` is `:294-321`, `RunFiber` `:324-327`,
`interruptCurrent` `:340-342`, `sourceOf` `:353-361`, the form plumbing `:984-1050`. All private:
`grep -n "^export" Simulator.tsx` → only `SimulatorProps` and `Simulator`.

This contradicts two documents that claim the opposite: ADR-QD-047's Decision ("`@qadi/devtools/react`
renders that model and computes nothing") and `src/react/index.ts:8-9` ("Nothing here computes").

### C2. DEFECT — an unavailable source silently runs on fixtures — **CONFIRMED (Live); latent (Snapshot)**

`sourceOf` (`:353-361`) returns `undefined` "rather than a silent fall back to fixtures" (its own
comment, `:344-352`). `runProgram` then spreads nothing (`:310`, `...(source === undefined ? {} : { source })`),
`simulate` passes `options?.source` (`Simulation.ts:90`) to `portsOf`, and
`SimulationSource.ts:98-102` answers `source === undefined ? fixtureLayer(input) : …`. So the
belt the comment promises is unbuckled by the next function down.

Live: reachable. The `source` state is never reconciled with `ports` (`:98`, `:173-177`), so a
host that stops passing `ports` (feature flag, env switch, permission revoked — ADR-QD-050 1.1
requires hosts to gate `ports`) leaves `source === "Live"` with the button disabled but still
pressed. Probe row 1: the next run answers `ALLOW` from fixtures. The cost line *does* switch to
"all in this process" (because `sweepPlan` got no source, `:233-236`), so the only on-screen
signal is a sentence the reviewer is not reading, while the result card says nothing about where
its answers came from — `RunResult` (`:83-92`) carries no source at all.

Snapshot: **latent at HEAD.** `captured` is set only by a successful Live run (`:204`) and never
cleared, and the Snapshot button is disabled until it is set (`:490`), so `source === "Snapshot"`
with no capture is unreachable today. It becomes reachable the moment anything clears a capture —
which D-20-d recommends doing on a `ports` change — so the session must refuse it too.

`portsOf(undefined) → fixtures` itself is correct public behaviour for a caller who never chose
and is pinned by `test/model/SimulationSource.test.ts:58` ("defaults to fixtures when no source
is given"). The defect is the component translating "chosen but unavailable" into "never chose".

### C3. "A Live run captures, which makes Snapshot available" exists only in the component — **CONFIRMED**

`runProgram:303-308` wraps `ports` in `capturing` only when `source === "Live"`; `:204` stores the
answers; `SourceSelector:489-494` enables Snapshot from `hasCapture`. `Capture.ts` exports the
mechanism (`capturing`, `replayLayer`) but no model function composes "run live ⇒ capture ⇒ offer
snapshot". The only test is DOM: `Simulator.test.tsx:322-335`.

### C4. Run superseding and staleness have no model test — **CONFIRMED**, and **two DEFECTS** behind it

`grep -rn "token\|supersed\|interrupt" packages/devtools/test/model` → nothing relevant (only
`Source.test.ts:197`, the timeline feed). The DOM tests are `Simulator.test.tsx:236-246` (stale)
and `:506-516` (unmount), the latter admitting in its own comment that it "cannot catch a late
`setState` by timing".

Reading the run loop found what the tests could not:

- **C4a. DEFECT: a run in flight lands under a different policy, unmarked.** `onChoose`
  (`:244-250`) clears `result` but neither bumps `token` nor interrupts the fiber, so the old run's
  observer (`:199-212`) still passes `token.current !== mine` and writes its result. Staleness is
  `result.input !== draft` (`:237`) — the draft did not change, so the result is **not** marked
  stale — and `ResultCard` zips the *current* `policy` prop against the old outcome's trace
  (`:273`, `:771`). `RunResult.Ran.policy` is written (`:318`) and **never read**
  (`grep -n "result.policy" Simulator.tsx` → nothing). Probe row 6: a subject holding no role is
  shown as satisfying `hasRole("x")`. Reachable whenever a run takes longer than a click: any Live
  run, and — since `DecisionCache` forks (`Simulator.test.tsx:76-90`'s comment) — every run crosses
  at least one macrotask.
- **C4b. DEFECT: a re-seed mid-run puts the old run under the new row's baseline.** The render-time
  re-seed (`:130-141`) clears `result` but does not supersede the run either. The stale marker does
  appear (the draft changed), but `BaselineCard` (`:275-277`) renders `baselineDiff(seed, result.outcome)`
  with no staleness check. Probe row 7: "baseline ev-B — differs at 1 node" for a run of ev-A's policy.
- Superseding by the **run button** cannot happen: both buttons are `disabled={props.running}`
  (`:440`, `:449`). The token/interrupt path in `run` is reachable only through unmount. Any fix that
  supersedes on policy change or re-seed must also clear `running`, or the buttons stay disabled
  forever (the old observer returns early before `setRunning(false)`).

### C5. DEFECT — the chip codec loses data and re-attributes edges — **CONFIRMED** (one sub-claim **REFUTED**)

`FixturesCard:659-692` renders an edge as `${relation}:${resourceId}` and an event as
`${event}:${resourceId}`, and decodes **the whole list** on every change, attributing every
element to `draft.subject.id` (`:671`, `:688`). Confirmed losses (probe rows 2–4):

1. **Subject rename desynchronises the form from the run.** `SubjectCard:543-545` changes
   `subject.id` only; edges keep the old `subjectId`, the chip text does not show it, and the run
   denies. The next edit to the chip list — even adding an unrelated chip — silently rewrites every
   edge to the new subject and the verdict flips back.
2. **An edge or event naming another subject cannot be shown or kept.** `Edits.ts:232-240` labels
   such an edge ("… for bob") because the model allows it; the form has nowhere to render the
   subject and rewrites it on the first edit.
3. **A relation or event name containing `:`** is split on the first colon (`splitOnce`, `:992-996`).
4. **Attribute values display ambiguously**: `render` (`:1038-1039`) prints the string `"7"` and the
   number `7` identically (probe row 4: `a=7`, `b=7`). The *stored* value is right — `Pairs` never
   re-decodes its own display text, so this is a display lie rather than data loss at HEAD — but the
   text is not a faithful encoding, so it cannot be the basis of an edit-in-place or a promote action.
5. **Keys containing `:`** cannot be entered in `Pairs` (`:942`).
6. **`Chips` refuses a duplicate by display text** (`:897`), so two edges differing only by subject
   collapse, and React keys collide (`key={value}`, `:906`).

**REFUTED as stated: "a remedy edge … is rewritten".** Remedy edges are built with
`subjectId: input.subject.id` (`Remedies.ts:536`, `:550`) — always the current subject — and there is
no "promote a what-if row to the form" path in the UI (`WhatIfTable.tsx` props: `report` only;
`WhatIfRow.input` exists "so a panel can … promote it", `WhatIf.ts:205-211`, but nothing does). The
risk becomes real only if a promote action is added — which a session makes trivial, so the codec
must be correct before one exists.

### C6. `signatures` has no form field — **CONFIRMED**, and the screen contradicts itself

`SimulationInput.signatures` exists (`SimulationInput.ts:63`) and `fixtureLayer` serves it
(`SimulationSource.ts:141-144`, with a comment saying signatures "earn the same declarative form
attributes/edges/events get"). `FixturesCard` has no signatures editor. Worse, a replay's
`UnseededCard` lists **"signatures — yours to supply"** (`Replay.ts:60`, rendered at
`Simulator.tsx:708-718`) for a field the reviewer has no way to supply.

### C7. NEW DEFECT — the pairs toggle changes the stated cost but not the sweep — **CONFIRMED**

`runProgram:313` always runs `whatIf(..., { ...run, pairs: true })`; the cost line uses the
`pairs` state (`:233-236`). Probe row 5: "3 evaluations" stated, 4 run. This breaks BEH-QD-220
("A sweep's cost MUST be stated before it runs") — the count stated is not the count run, which
under `Live` means unannounced lookups against production. `Simulator.test.tsx:362-371` **pins the
bug** ("rows.length 3 // two drops plus their pair" with the toggle off) and must change.

### C8. NEW — the dock throws the session away on every tab switch — **CONFIRMED**

`DevtoolsDock.tsx`'s `Screen` renders `screens[props.tab]()` (`:367`), so leaving the Simulator
tab unmounts it. Probe row 8: the form resets; the capture (one round of live I/O) and the result
go with it, and returning re-seeds from the dock's `seed` over the reviewer's edits. A session the
dock owns survives this for free.

### C9. Test layout — **CONFIRMED**

`test/react/Simulator.test.tsx` is 791 lines, **48** `it`s. By what they actually prove (detail in §7):
≈ 19 pin model rules through the DOM, 8 re-prove `simulate`/`whatIf`/`WhatIfTable` behaviour already
tested in `test/model/Simulation.test.ts`, `SimulationSource.test.ts`, `WhatIf.test.ts:134`,
`WhatIfTable.test.tsx:181,271`, and ≈ 21 are genuine rendering tests.

### C10. Toolchain facts the plan depends on

- `fast-check` is **not** a `@qadi/devtools` devDependency; the catalog pins `fast-check: 4.10.0`
  (`pnpm-workspace.yaml:26`) and `@qadi/react` already uses it (`test/DecisionOutcome.test.ts:38`).
- `TimelineStore.ts:23-84` is the pattern: framework-free closure, `subscribe`/`getSnapshot` with
  identity-stable snapshots, an Effect (`runSource`) the hook forks (`useTimeline.ts:50-58`). No model
  file calls `Effect.runFork` (`grep -rn runFork packages/devtools/src/model` → nothing).
- `stryker.devtools.mjs:47` mutates `packages/devtools/src/model/**/*.ts`, `break: 80` (`:49`);
  `vitest.config.ts` (root) holds `packages/devtools/src/model/**` at 95% on all four metrics, the
  React shell at 90%.
- Gate 12 (`check-devtools-claims.mjs`): no registered "claim of absence" is about the simulator
  (`spec/devtools-spec/README.md:65-72`), so **no row changes**. New prose in
  `spec/devtools-spec/02-screens.md` §5 must avoid the phrase list (`check-devtools-claims.mjs:59-73`) —
  notably **"has no source"**, which a sentence about a refused run would naturally contain.

## 2. Goal and success criteria

**Goal.** Make the simulator's behaviour a **deep module** on the model side: `SimulationSession`,
a small interface (`subscribe`, `getSnapshot`, a handful of commands, `run`, `dispose`) over
everything that today hides in `Simulator.tsx` — which source is honoured, when a capture is taken
and dropped, which run is current, what is stale, what a seed resets. The **seam** is the store
interface `useSyncExternalStore` already wants; the React hook is a thin **adapter** that forks the
session's `run` Effect and subscribes, exactly as `useTimeline` adapts `TimelineStore`. The form
gets its own small module, `SimulationForm`, a text ↔ `SimulationInput` codec with a round-trip law,
so the four lossy hand-rolled translations in the view collapse into one tested place. **Leverage:**
every rule becomes testable in `test/model` without rendering, falls under the 95% coverage bar and
the Stryker gate that the React shell escapes, and the dock can own a session that outlives a tab.
**Locality:** "an unavailable source is refused", "a Live run captures", "a superseded run never
lands", and "a result belongs to the question it answered" each live in one function.

**Success criteria**

1. `packages/devtools/src/model/SimulationSession.ts` and `SimulationForm.ts` exist, are exported from
   `src/index.ts`, and import no React (`grep -n "react" packages/devtools/src/model/Simulation{Session,Form}.ts` → nothing).
2. `Simulator.tsx` holds no session state: `grep -nE "useState|useRef|runFork|Fiber|token" packages/devtools/src/react/Simulator.tsx`
   matches only the uncommitted typing buffers in `Chips`/`Pairs`/the resource field (≤ 3 `useState`, 0 `useRef`, 0 `runFork`).
   `runProgram`, `sourceOf`, `interruptCurrent`, `splitOnce`, `parseValue`, `parseJson`, `render`,
   `withoutAction`, `withoutResource` are gone from `src/react/`.
3. Choosing `Live` with no `ports`, or `Snapshot` with no capture, then running, leaves the session in a
   typed refused state naming the choice and the reason, **and runs no evaluation** — asserted in
   `test/model/SimulationSession.test.ts` with a fixture that would have answered `ALLOW`.
4. A Live run captures; Snapshot becomes available from that capture; a `ports` change (per D-20-d)
   drops it. All three asserted in the model test with no DOM.
5. Superseding is a model property: a second `run`, a policy change, a re-seed or `dispose` interrupts
   the in-flight run (its finalizer observed) and its result never reaches the snapshot — asserted
   under `TestClock` with a sleeping port, no real timers.
6. A result is shown only for the question it answered: the snapshot's `stale` covers input, policy
   and seed, and the baseline is absent unless the result was run against the current seed.
7. `SimulationForm` round-trips: for every form-expressible `SimulationInput` generated by fast-check
   (≥ 500 runs per field codec), `decode(encode(x)) ≡ x`; every text the encoder can emit decodes;
   out-of-domain values are refused as a typed case, never rendered lossily.
8. Renaming the subject moves the elements that named the old id (per D-20-e) and leaves the others
   untouched; editing one chip changes exactly one element.
9. `signatures` are editable in the Fixtures card, and a replayed form's "signatures — yours to supply"
   points at a control that exists.
10. The evaluations a sweep runs equal the evaluations stated, for both positions of the pairs toggle
    (`report.evaluations === snapshot.plan.evaluations`).
11. In `DevtoolsDock`, a Simulator → Log → Simulator round trip keeps the form, the capture and the result.
12. `test/react/Simulator.test.tsx` keeps only rendering tests (target ≤ 24 `it`s); the moved rules are
    in `test/model/SimulationSession.test.ts` / `SimulationForm.test.ts`; the redundant ones are deleted.
13. `pnpm check` is green; `pnpm mutation` reports the devtools model at or above its current score
    (96.96 at the last integration run, README) and never below `break: 80`.

## 3. Non-goals

- **Changing `simulate`, `whatIf`, `portsOf` or `SimulationSource`'s public contracts.** `portsOf(undefined)`
  stays "fixtures" for a caller who never chose (BEH-QD-220, `SimulationSource.test.ts:58`). The session
  simply never passes `undefined`.
- **The seal.** `simulationLayer` is untouched (INV-QD-042, ADR-QD-050).
- **Capture keying** (`Capture.ts`, INV-QD-043). If ARCH-21 reshapes `PortDescription`, `capturing` and
  `replayLayer` follow it there; the session only calls them.
- **A "promote what-if row to the form" action.** The session makes it a one-line command; adding the
  button is a product decision left for later (it is the first consumer that makes C5's refuted sub-claim real).
- **Remedy derivation** (ARCH-17). The session consumes `sweepPlan`/`whatIf` as they are.
- **Restyling the screen**, or any change to `WhatIfTable`, `PolicyTree`, `DecisionPanels`.
- **A Simulator for the CLI shell** (ADR-QD-049). The session is what such a shell would reuse; building it is not this plan.

## 4. Constraints

- **AGENTS.md §1** — namespace `effect/*` imports, `.ts` extensions, `import type` for types.
- **§5** — every effectful function is `Effect.fn("qadi.devtools.simulationSession.<name>")`. No
  `Effect.fnUntraced` → `UNTRACED_BUDGET` unchanged (it counts `packages/*/src`; a new site fails gate 4).
- **§5a / ADR-QD-034** — commands and run states are tagged unions dispatched with
  `Match.type<…>().pipe(Match.tagsExhaustive(…))` hoisted to module scope. **No `switch`**: `SWITCH_BUDGET`
  names three sites in core only and fails on a fourth anywhere.
- **§6** — no `async`/`await`/`new Promise` in `src` (the DOM test helper's `setTimeout` loop stays
  test-only); no `as`/`!`/`any` (`no-type-assertion`, `no-non-null-assertion`; `ANY_BUDGET` is scoped to
  one `@qadi/http` file); `JSON.parse` results typed `unknown` and narrowed by predicates, as `parseJson` does
  today; no `Date.now()`; `Effect.result`, not `Either`.
- **`PORT_DOUBLE_BUDGET`** (test scope) counts `new <PortError>(` in tests. The supersede tests need a
  *slow* port, not a failing one: build it as `Layer.succeed(AttributeResolver, { resolve: () => Effect.sleep(…).pipe(Effect.as(9)) })`
  (no error construction → not counted) and any failing port with `scriptedPort(…, () => PortReply.fail(…))`.
  Moving `Simulator.test.tsx`'s `brokenPorts`/`dying` doubles to `test/model` keeps them uncounted.
  If a test ever needs `new AttributeResolveError(`, it is a budget edit.
- **`HAS_CUSTOM_BUDGET`, `SCHEMA_ERROR_BUDGET`, `DECISION_READ_BUDGET`** — untouched: no `hasCustom`, no
  new error classes (the refusal is a data state, not an error; see D-20-c), no `AsyncResult` reads.
- **§9 barrels** — `src/index.ts` gains `SimulationForm.ts` and `SimulationSession.ts` alphabetically;
  `src/react/index.ts` gains `useSimulationSession.ts`, with a line in its existing "multi-export grouping
  files" comment.
- **§13 by analogy / ADR-QD-047** — no decision-holding React state; test the model, not the DOM.
- **§15 gate 13** (`check-api-surface.mjs`) — every new export gets a row in `spec/overview.md`'s
  `@qadi/devtools` table or the "Not listed above" table.
- **Gate 12** (`check-devtools-claims.mjs`) — no registered row changes; new prose avoids the phrase list (§1 C10).
- **ADR-QD-037 madge** — `SimulationForm.ts` imports only `SimulationInput.ts` (+ `@qadi/core` types);
  `SimulationSession.ts` imports `Simulation`, `SimulationSource`, `SimulationForm`, `Capture`, `Replay`,
  `WhatIf`, `Catalogue` (type), `Timeline` (type). None of those import back. `pnpm circular` proves it.
- **Coverage** — model files at 95% lines/branches/functions/statements; the shell at 90%.
- **Mutation** — the two new files are mutated by `stryker.devtools.mjs`; a weak session test shows up as
  survivors against `break: 80`. Budget a session of survivor-killing in T13.
- **ADR-QD-038** — one changeset, `@qadi/devtools: minor` (new exports + behaviour fixes); `fast-check`
  enters `devDependencies` only, so no consumer-visible dependency change (gate 14 `check-package-install.mjs`
  is unaffected).

## 5. Decisions needed before work starts

### D-20-a — One store helper shared with TimelineStore and ARCH-24's DiagnosticsStore?
- **A. Bespoke closure**, same ~15 lines of listener set as `TimelineStore.ts:42-57`. No coupling to ARCH-24's timing.
- **B. Extract `model/ExternalStore.ts`** (`makeExternalStore<S>(initial): { subscribe, getSnapshot, set(next) }`)
  and rebase `TimelineStore`, `SimulationSession` and ARCH-24's `DiagnosticsStore` on it. Three stores meets
  the rule of three; adds one more export (or an internal module kept out of the barrel per §9).
- **C. Effect `SubscriptionRef` / `effect/reactivity` Atom** inside the model. Brings Effect's own change
  stream, but `useSyncExternalStore` needs a sync `getSnapshot`, so a closure adapter is needed anyway.
- **Recommendation: A now**, and whichever of ARCH-20/ARCH-24 lands **second** does B as its last task
  (it is then a mechanical extraction over three real instances, not a guess over one). Internal module, out of the barrel.
- **status: decided (2026-10-07, own closure now; ARCH-24 extracts the shared helper (overrides D-24-a))**

### D-20-b — Where the fork lives
- **A. `session.run(kind): Effect<void>`; the hook forks it.** The session keeps the current fiber in its
  closure; `run` itself interrupts the previous one, forks the program with `Effect.forkDetach`, awaits it and
  applies the result only if its generation is still current. `dispose: Effect<void>` interrupts. Model code
  never calls `runFork` (matches `runSource`); tests `yield*` it under `TestClock`.
- **B. Inject a `fork` function at construction** (`makeSimulationSession({ fork = Effect.runFork })`). `run`
  becomes sync; tests need a test runtime handle.
- **C. Keep the fiber in the hook.** Leaves supersede in the view — the thing this plan removes.
- **Recommendation: A.**
- **status: decided (2026-10-07, A: `session.run` is an Effect, the hook forks)**

### D-20-c — How an unavailable source is represented
- **A. Keep the reviewer's choice; refuse at run time with a typed run state**
  `{ _tag: "Refused", reason: { _tag: "LiveWithoutPorts" } | { _tag: "SnapshotWithoutCapture" } }`, plus
  `sourceOptions(snapshot)` deriving each option's `enabled`/`why` in the model (today's strings, moved from
  `SourceSelector:486-501`). The cost line reads `plan` from the resolved source or, when refused, says so.
  No evaluation runs.
- **B. Silently move the choice back to Fixtures when ports vanish.** Same silent fallback, one step earlier. Rejected.
- **C. Also make `portsOf`/`SimulationOptions.source` non-optional.** A public API break of `simulate`; not
  needed once the session never passes `undefined`. Out of scope (§3).
- **Recommendation: A.** A data state, not a `Data.TaggedError`: nothing fails, the run was declined.
- **status: decided (2026-10-07, A: refused run state)**

### D-20-d — Capture lifetime
- **A. Drop the capture when the `ports` identity changes** (`setPorts(next)` with `next !== current`), and
  keep it across re-seeds and edits (keys include the subject, INV-QD-043). Snapshot then refuses until the
  next Live run.
- **B. Keep it, and label the snapshot with the ports it came from.** A replay of the old environment's answers
  under the new environment's name is the kind of quiet mismatch this screen exists to prevent.
- **Recommendation: A.** It makes C2's Snapshot half reachable, which D-20-c=A covers.
- **status: decided (2026-10-07, A: drop on ports change)**

### D-20-e — What renaming the subject does to fixtures that name it
- **A. Elements whose `subjectId` equals the old id follow the rename; others stay.** Matches the card's own
  caption ("Edges and events are attributed to the subject above", `:694`). One `renameSubject` command.
- **B. Nothing moves; foreign elements are shown with their subject.** Honest, but a rename then empties the
  subject's fixtures, which nobody renaming expects.
- **Recommendation: A** — with the codec (D-20-f) rendering any element that names another subject in its
  explicit form either way.
- **status: decided (2026-10-07, A: followers follow the rename)**

### D-20-f — The form codec's shape
- **A. Hand-written per-field codec in `model/SimulationForm.ts`**, one `encode`/`decode` pair per field,
  returning a closed `Decoded<A> = Ok | Refused(reason)`, with a short form for the common case and an
  explicit form for everything else:
  - attribute pair: `name:value`; `name` bare unless it contains `:` or starts with `"`, then a JSON string;
    `value` bare iff the bare text would decode back to the same string (i.e. `JSON.parse` fails on it),
    otherwise `JSON.stringify(value)`. Non-JSON values (`undefined`, `NaN`, `±Infinity`, `-0`, functions,
    class instances) are `Refused("not representable in the form")` at encode time.
  - edge / event: `relation:resourceId` when `subjectId === subject.id` and `relation` has no `:`; otherwise a
    JSON object `{"subjectId":…,"relation":…,"resourceId":…}`. Same for events.
  - signature: `meaning:resourceId` (or bare `meaning`) for the subject's own with no optional fields;
    otherwise a JSON object of `SignatureInput`.
  - permission: the key itself, refused unless `resource:action` (today's `isPermissionKey`); role: the trimmed name.
  - resource: `JSON.stringify` / object-only parse (today's `parseJson`); action: `""` ⇔ absent.
  Covered by fast-check round-trip properties.
- **B. `effect/Schema` transformations** (`Schema.decodeTo` from a string). Gives `SchemaIssue`s for free, but
  §7 reserves schema-first for the Policy ADT's trust boundary, and per-chip text is not one; heavier for the same law.
- **C. One JSON textarea per fixture list.** Trivially lossless, much worse to type in, and it throws away
  E7.2's chip affordance.
- **Recommendation: A.**
- **status: decided (2026-10-07, A: hand-written per-field codec)**

### D-20-g — Who owns the session
- **A. The Simulator** (`useState(() => makeSimulationSession(…))`), today's lifetime: lost on tab switch (C8).
- **B. The dock** creates it (`useSimulationSession` in `DevtoolsDock`) and passes `session` down;
  `SimulatorProps.session?` is optional, and a standalone `<Simulator>` without one owns its own (A's behaviour).
  `seed` and `ports` flow into the session as commands (`seed(entry)`, `setPorts(ports)`), not re-derived on render.
- **Recommendation: B.**
- **status: decided (2026-10-07, B: the dock owns the session)**

### D-20-h — The pairs toggle (C7)
- **A. The sweep honours the toggle** (`whatIf(…, { pairs })`). The stated count becomes the run count. One DOM
  test that pinned the old behaviour changes (`Simulator.test.tsx:362-371`).
- **B. Remove the toggle; always pair, and count pairs in the cost line.** Simpler UI, larger default Live sweeps.
- **Recommendation: A** (BEH-QD-222 already says pairs default **off**, `WhatIf.ts:144`).
- **status: decided (2026-10-07, A: honour the toggle)**

### D-20-i — Spec shape
- **A. Amend ADR-QD-047 and ADR-QD-050; add requirements to BEH-QD-220 and one new behavior (BEH-QD-NEXT,
  "A simulation session") in `29-devtools-simulator.md`.** No new ADR.
- **B. A new ADR-QD-NEXT "The simulator is a session".** Heavier; the decisions are amendments to two existing ones.
- **Recommendation: A.** (If D-20-a=B lands here, the store helper is noted in the ADR-047 amendment, still no new ADR.)
- **status: decided (2026-10-07, A: amend ADR-047/050, no new ADR)**

### D-20-j — Property testing dependency
- **A. Add `"fast-check": "catalog:"` to `@qadi/devtools` `devDependencies`** and import it as
  `import * as FastCheck from "fast-check"` (as `packages/react/test/DecisionOutcome.test.ts:38` does).
- **B. Hand-enumerated example tables.** No new dev dependency; weaker law.
- **Recommendation: A.**
- **status: decided (2026-10-07, A: fast-check devDependency)**

## 6. Tasks

T1–T3 are test-first defect fixes inside today's `Simulator.tsx`, each shippable alone before any
refactor; T5 onwards then moves the (fixed) rules into the model, carrying those tests with them.

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch/20-simulation-session main`; confirm `git log -1` and that
     `git diff --stat e328e75 HEAD -- packages/devtools` is empty (else re-read §1 C1–C8 lines).
  2. Re-run the three probes in §1 (copy `$P/*.test.tsx` and `$P/vitest.config.mts` if the scratchpad is gone;
     their full text is reproducible from §1's table) and confirm the eight rows.
  3. Record baselines in §10: `./node_modules/.bin/vitest run` in `packages/devtools` (file and test counts),
     `wc -l src/react/Simulator.tsx test/react/Simulator.test.tsx`, `grep -c "^\s*it(" test/react/Simulator.test.tsx` (48).
  4. `ls .planning/architecture/ARCH-2[14]*.md` and read ARCH-24 (store pattern) and ARCH-21 (`Capture.ts`/`PortCalls.ts`)
     for sequencing; if ARCH-24 has landed, D-20-a's "second lander extracts" falls to this plan.
- **Tests:** none.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run`; `node scripts/check-house-style.mjs`;
  `node scripts/check-api-surface.mjs`; `pnpm circular`.
- **Done when:** the baseline numbers and probe outputs are logged in §10.

### T1 — Refuse an unavailable source instead of running on fixtures (test-first, C2)
- **Status:** [x] done
- **Depends on:** D-20-c (the test is valid under A; under B it would assert the pressed button moved)
- **Files:** `packages/devtools/test/react/Simulator.test.tsx`; `packages/devtools/src/react/Simulator.tsx`.
- **Steps:**
  1. Add `describe("a source that cannot be honoured — C2")`, `it("refuses Live once the host stops passing ports, rather than answering from fixtures")`:
     render with `brokenPorts` and policy `hasAttribute("clearance", gte(5))`; add resolver attribute `clearance:9`;
     click `qadi-source-Live`; `run()`; `view.rerender(<Simulator … />)` without `ports`; `run()`.
     Assert no `qadi-simulator-result` reads `ALLOW`, and a new `qadi-simulator-refused` element names "Live"
     and the host's missing `ports`. Run: **red** (it reads `ALLOW`).
  2. Fix: extend `RunResult` (`:83-92`) with `{ _tag: "Refused"; choice: SourceChoice; reason: string; input }`.
     In `run` (`:185`), compute `sourceOf(source, ports, captured)` first; when it is `undefined`, set the
     `Refused` result and return **without forking**. Render it in `ResultCard` as its own panel
     (`data-testid="qadi-simulator-refused"`), using `SourceSelector`'s existing `why` sentence.
  3. Make `runProgram` take a resolved `SimulationSource` (never `undefined`) so the spread at `:310` disappears.
  4. No Snapshot twin: `Snapshot` without a capture is unreachable through the DOM at HEAD (C2, latent). Leave a
     comment pointing at T7's model test, which is where it becomes reachable (D-20-d).
- **Tests:** one new DOM `it`, red first.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/react/Simulator.test.tsx`.
- **Done when:** the test passes and `grep -n "source === undefined ? {}" src/react/Simulator.tsx` → nothing.

### T2 — A run in flight never lands under another policy or another row (test-first, C4a/C4b)
- **Status:** [x] done
- **Depends on:** — (decision-free: today's types already carry `result.policy`)
- **Files:** `packages/devtools/test/react/Simulator.test.tsx`; `packages/devtools/src/react/Simulator.tsx`.
- **Steps:**
  1. Add a `slowPorts` double in the test file: `portsLayer({ AttributeResolver: Layer.succeed(AttributeResolver, { name: "slow", resolve: () => Effect.sleep("40 millis").pipe(Effect.as(9)) }) })`
     (not a port-error construction, so `PORT_DOUBLE_BUDGET` is unaffected).
  2. `it("drops a run whose policy was left behind while it ran")`: sightings `[hasAttribute("clearance", gte(5)), hasRole("x")]`,
     Live, click run, immediately change `qadi-simulator-policy` to `1`, wait ≥ 100 ms inside `act`. Assert
     `qadi-simulator-result` is absent and `qadi-simulator-run` is **enabled**. Red today (result `ALLOW` under `hasRole("x")`).
  3. `it("drops a run whose row was left behind while it ran")`: seed row A (policy A), Live, run, `rerender` with
     row B, wait. Assert `qadi-baseline` is absent and no result shows. Red today ("baseline ev-B — differs…").
  4. Fix: extract `const supersede = () => { token.current += 1; interruptCurrent(fiber.current); setRunning(false); }`;
     call it from `onChoose` (`:244`, an event handler). For the re-seed, keep the render-time state reset
     (`:130-141`) and add `useEffect(() => supersede(), [seed])` — no ref mutation or fork during render. The
     window between commit and that effect is closed by step 5's belt.
  5. Belt: `ResultCard` takes `result.policy`, not the prop (`:273`), and `BaselineCard` renders only when the
     result is not stale. Delete the unused `policy` prop path.
- **Tests:** two new DOM `it`s, red first. (They move to the model in T10.)
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/react/Simulator.test.tsx`.
- **Done when:** both pass, and `grep -n "policy={policy}" src/react/Simulator.tsx` no longer feeds `ResultCard`.

### T3 — The sweep runs what the cost line states (test-first, C7)
- **Status:** [x] done
- **Depends on:** D-20-h
- **Files:** `packages/devtools/test/react/Simulator.test.tsx` (`:362-371`); `packages/devtools/src/react/Simulator.tsx` (`:189`, `:294-321`).
- **Steps:**
  1. Add `it("runs exactly the evaluations the cost line stated, with pairs off and on")`: roles `a`,`b`, policy
     `allOf([hasRole("a"), hasRole("b")])`; read the number from `qadi-simulator-cost`; sweep; compare with
     `qadi-whatif-count`'s "of N evaluations". Toggle pairs, repeat. Red today (3 vs 4 with pairs off).
  2. Fix (D-20-h=A): pass `pairs` into `runProgram` and use `{ ...run, pairs: options.pairs }` at `:313`.
  3. Update `:362-371` ("runs a sweep and names the node that flipped"): it asserted 3 rows with the toggle off,
     pinning the bug; click `qadi-simulator-pairs` first, keep `rows.length === 3`. Same for `:377` if it relies on
     pairs (it does: "without role a + without role b").
- **Tests:** one new `it`; two adjusted.
- **Verify:** as T1.
- **Done when:** the stated and run counts agree in both toggle positions.

### T4 — Reproduce the chip codec's losses (test-first, C5)
- **Status:** [x] done
- **Depends on:** D-20-e (the expected rename behaviour)
- **Files:** `packages/devtools/test/react/Simulator.test.tsx`.
- **Steps:**
  1. Add `describe("the fixtures codec — C5")` with three `it`s, each red today:
     (a) "a renamed subject keeps its edges, and an unrelated chip edit rewrites nothing": alice + `owner:doc-1`
         → rename bob → run → expect `ALLOW` under D-20-e=A; add `viewer:doc-9` → still `ALLOW`.
     (b) "a relation containing a colon survives": chip in the explicit form `{"subjectId":"someone","relation":"org:admin","resourceId":"doc-1"}`
         against `hasRelationship("org:admin")` → `ALLOW`.
     (c) "a string attribute that looks like a number is shown as a string": typing `level:"7"` already stores the
         string (the run allows `hasAttribute("level", eq(literal("7")))` today); the red assertion is the chip text,
         which must read `level="7"` and reads `level=7`.
  2. Mark nothing as `.fails`; leave them red on a local commit and turn them green in T8 (which replaces the
     codec). If T4 must ship alone, apply the minimal fix instead: in `FixturesCard`, map each surviving chip text
     back to the element it was rendered from (so untouched elements keep their `subjectId`), and in `SubjectCard`
     re-attribute elements naming the old id. (b)/(c) stay red until T8.
- **Tests:** three DOM `it`s (moved to `SimulationForm.test.ts`/`SimulationSession.test.ts` in T10).
- **Verify:** as T1.
- **Done when:** (a) is green (minimal fix) or all three are red-and-recorded pending T8.

### T5 — Add fast-check to devtools, and the session's store primitive
- **Status:** [x] done
- **Depends on:** D-20-j, D-20-a
- **Files:** `packages/devtools/package.json`; `pnpm-lock.yaml`; (D-20-a=B only) `packages/devtools/src/model/ExternalStore.ts` (*new*),
  `packages/devtools/test/model/ExternalStore.test.ts` (*new*), `packages/devtools/src/model/TimelineStore.ts`.
- **Steps:**
  1. Add `"fast-check": "catalog:"` to `devDependencies` (alphabetical); `pnpm install`.
  2. D-20-a=A: nothing else. D-20-a=B: write `makeExternalStore<S>(initial)`, port `TimelineStore` onto it with
     `TimelineStore.test.ts` unchanged and green, keep `ExternalStore.ts` out of `src/index.ts` (§9).
- **Tests:** (B only) subscribe/unsubscribe/identity tests lifted from `TimelineStore.test.ts`.
- **Verify:** `pnpm install --frozen-lockfile` after commit; `cd packages/devtools && ./node_modules/.bin/vitest run test/model/TimelineStore.test.ts`.
- **Done when:** `import * as FastCheck from "fast-check"` resolves in a devtools test.

### T6 — `SimulationForm`: the text ↔ `SimulationInput` codec, with its round-trip law
- **Status:** [x] done
- **Depends on:** D-20-f, D-20-e, T5
- **Files:** `packages/devtools/src/model/SimulationForm.ts` (*new*); `packages/devtools/test/model/SimulationForm.test.ts` (*new*);
  `packages/devtools/src/index.ts`.
- **Steps:**
  1. Types: `Decoded<A> = { _tag: "Ok"; value: A } | { _tag: "Refused"; reason: string }`; `ChipCodec<A> = { encode: (a: A, subjectId: string) => Decoded<string>; decode: (text: string, subjectId: string) => Decoded<A> }`.
  2. Codecs per D-20-f=A: `attributeCodec` (pairs `[name, value]`), `edgeCodec`, `eventCodec`, `signatureCodec`,
     `permissionCodec`, `roleCodec`; and `resourceText`/`parseResource` (today's `parseJson` with `Bad`→`Refused`),
     `actionOf(text)` (`""` ⇒ absent). Narrow `JSON.parse` output with `Predicate.isRecord`/`typeof` guards; no `as`.
  3. List edits that touch one element only: `addChip(list, text, codec, subjectId)`, `removeAt(list, index)` —
     refusing duplicates by **structural** equality (`sameEdge`/`sameEvent` from `Edits.ts`, a new `sameSignature`),
     not by display text (C5.6).
  4. `renameSubject(input, from, to)` (D-20-e=A): rewrites `subjectId === from` in relationships, history and signatures.
  5. Move `isPermissionKey` and `splitOnce` here (internal, not exported); `withoutAction`/`withoutResource` become
     the codec's absent cases.
  6. Export the codecs and helpers; barrel line in `src/index.ts`.
- **Tests (`SimulationForm.test.ts`):**
  - Properties (`FastCheck.assert(FastCheck.property(…), { numRuns: 500 })`), one per codec:
    `decode(encode(x, s), s)` deep-equals `x` for `x` from a form-domain arbitrary and any `s`
    (`FastCheck.jsonValue()` filtered to exclude `-0`, plus strings that look like JSON; `FastCheck.string()` for
    names including `:` and `"`; subject ids both equal to and different from `s`).
  - Every encoder output decodes (`encode` never emits text its own `decode` refuses).
  - Out-of-domain values (`undefined`, `NaN`, `Infinity`, `-0`, a `Map`) are `Refused` by `encode`.
  - Examples that pin today's behaviour moved from the DOM: `clearance:7` → number; `dept:legal` → string;
    a chip with no colon refused; empty/duplicate refused; action `""` ⇒ absent; resource `7` refused ("expected a JSON object").
  - The three T4 cases at codec level.
  - `renameSubject` moves exactly the elements naming the old id.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/model/SimulationForm.test.ts`; `pnpm circular`;
  `node scripts/check-house-style.mjs`.
- **Done when:** all properties pass at 500 runs; coverage of `SimulationForm.ts` is 100% branches.

### T7 — `SimulationSession`: state, commands, sources, capture, runs
- **Status:** [x] done
- **Depends on:** D-20-a, D-20-b, D-20-c, D-20-d, D-20-h, T6
- **Files:** `packages/devtools/src/model/SimulationSession.ts` (*new*); `packages/devtools/test/model/SimulationSession.test.ts` (*new*);
  `packages/devtools/src/index.ts`.
- **Steps:**
  1. **Snapshot type** (identity-stable; a new object only when something changed):
     `{ sightings; policy: PolicyChoice; draft: SimulationInput; resourceText: { text: string; error: string | undefined };
        sourceChoice: SourceChoice; options: ReadonlyArray<SourceOption>; clock; pairs; capture: CapturedAnswers | undefined;
        plan: SweepPlan | Refusal; run: RunState; stale: boolean; baseline: Baseline | undefined }`
     where `PolicyChoice = None | Chosen{index, policy} | Seeded{entry, policy, unseeded}` and
     `RunState = Idle | Running{generation, question} | Ran{question, outcome, report, clock} | Broke{question, message} | Refused{question, reason}`,
     `question = { policy, input, seed: TimelineEntry | undefined, source: SimulationSource["_tag"] }`.
  2. **Pure core:** `resolveSource(choice, ports, capture): { _tag: "Available"; source } | { _tag: "Unavailable"; reason }`
     (`Match.value` on the literal is fine here; it runs once per command); `sourceOptions(...)` with today's `why`
     strings; `stale = run.question.input !== draft || run.question.policy !== currentPolicy || run.question.seed !== currentSeed`;
     `baseline` only when `run._tag === "Ran" && !stale && seed !== undefined` → `baselineDiff(seed, outcome)`.
     Clamp the chosen index against `sightings` here (moved from `:147`).
  3. **Commands** (sync, each `notify()`s once): `setSightings`, `choosePolicy(index)`, `seed(entry | undefined)`
     (re-seeds via `replayInput`, resets `resourceText`, supersedes the run), `setPorts(ports | undefined)` (D-20-d:
     drops the capture on identity change), `chooseSource`, `setClock`, `setPairs`, `edit(next: SimulationInput)`,
     `editResourceText(text)` (keeps the last good resource on a parse refusal — E7.3), `renameSubject(to)`.
  4. **`run = Effect.fn("qadi.devtools.simulationSession.run")(function* (kind: "Run" | "Sweep") { … })`** (D-20-b=A):
     resolve the source; if unavailable, set `Refused` and return (no fork). Otherwise bump `generation`, interrupt the
     previous fiber (`Fiber.interrupt`, as `interruptCurrent` does), wrap Live ports in `capturing` (the rule from
     `runProgram:303-308`, now named in the model), fork the program detached, set `Running`, `Fiber.await` it, and
     apply the exit only if `generation` is unchanged: `Ran` (and store `answers` as the capture on Live), or `Broke`
     with `String(cause)` on a defect. Sweep uses `{ pairs: snapshot.pairs }` (T3).
  5. Superseding commands split correctness from cleanup. `choosePolicy`, `seed` and `setPorts` stay **sync**
     (so the hook can dispatch them during render, §9) and bump `generation` synchronously — that alone guarantees
     the abandoned run's exit is never applied and `run` returns to `Idle`. The abandoned fiber is parked in a
     `retired` slot, and `reap: Effect<void>` interrupts whatever is parked; `run` and `dispose` call `reap` first,
     and the hook forks `session.reap` after any superseding dispatch so live I/O stops promptly. `dispose: Effect<void>`
     = bump + reap + interrupt current. (Fallback if this proves awkward: make those commands Effects the hook
     forks; record the choice in §10.)
  6. Export `makeSimulationSession`, `SimulationSession`, `SimulationSnapshot`, `RunState`, `SourceChoice`,
     `SourceOption`, `resolveSource`, `sourceOptions`.
- **Tests (`SimulationSession.test.ts`, `@effect/vitest` `it.effect`, `TestClock`):**
  - Source refusal (C2): Live without ports → `Refused{LiveWithoutPorts}`, no evaluation (fixture `clearance:9` would allow;
    assert `run._tag === "Refused"` and no `Ran`); Snapshot without capture → `Refused{SnapshotWithoutCapture}`;
    ports set again → Live available, choice unchanged.
  - Capture (C3): a Live run with `brokenPorts` stores a capture; Snapshot becomes `enabled`; a Snapshot run replays
    the outage as `Failed`; `setPorts(other)` drops it (D-20-d=A).
  - Supersede (C4): a sleeping port (`Effect.sleep("1 second")` under `TestClock`); fork `run`, then `run` again →
    first fiber's `Effect.onInterrupt` finalizer fired, only the second lands; same for `choosePolicy`, `seed`, `dispose`.
    `running` returns to false after each.
  - Staleness: edit → stale; choose another policy → result cleared; baseline only for the current seed (C4b).
  - Plan/cost: `plan.evaluations` equals the evaluations `whatIf` reports, pairs off and on (C7); `causesIO` true only for Live.
  - Seeding: fills policy/action/resource, names unseeded fields (incl. `signatures`), orphan → `policy._tag === "None"`;
    choosing a rail policy leaves the seed; a shrinking rail clamps.
  - Identity: `getSnapshot()` returns the same object until a command changes something; a no-op command does not notify.
  - Span: `run` emits `qadi.devtools.simulationSession.run` (use `@qadi/testing`'s `collectingTracer`, as `WhatIf.test.ts:460` does).
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/model/SimulationSession.test.ts`; `pnpm circular`;
  `node scripts/check-house-style.mjs`.
- **Done when:** every C2/C3/C4/C7 rule has a model test, and `SimulationSession.ts` is at 95%+ on all four metrics.

### T8 — Make `Simulator.tsx` render and dispatch; add the signatures editor
- **Status:** [x] done
- **Depends on:** T6, T7
- **Files:** `packages/devtools/src/react/useSimulationSession.ts` (*new*); `packages/devtools/src/react/Simulator.tsx`;
  `packages/devtools/src/react/index.ts`.
- **Steps:**
  1. `useSimulationSession({ sightings, seed, ports })`: `useState(() => makeSimulationSession(...))`; effects that
     dispatch `setSightings`/`seed`/`setPorts` when those props change (identity); `useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)`;
     `run(kind)` = `Effect.runFork(session.run(kind))`; unmount = `Effect.runFork(session.dispose)`. Returns `{ snapshot, session, run }`.
     This is the only file under `react/` that forks for the simulator.
  2. `Simulator` takes `SimulatorProps & { session?: SimulationSession }`; without one it calls the hook itself.
     Delete every `useState`/`useRef` in the component, `runProgram`, `RunFiber`, `interruptCurrent`, `sourceOf`, the
     `seenSeed`/`seedGeneration` remount trick (the session resets `resourceText` on re-seed), and the plumbing at `:984-1050`.
  3. `SourceSelector` renders `snapshot.options`; the cost line renders `snapshot.plan` or the refusal; `ResultCard`
     renders `RunState` with `Match.type<RunState>().pipe(Match.tagsExhaustive(…))` (no `switch`), including `Refused`.
  4. `Chips`/`Pairs` keep only their uncommitted input text; they call `addChip`/`removeAt` through the session with
     the field's codec and show a refusal inline. Display each element via its codec's `encode` (so a foreign edge shows
     its explicit form). `SubjectCard`'s id field dispatches `renameSubject`.
  5. Add a **signatures** `Chips` editor to `FixturesCard` (`placeholder="meaning:resourceId"`), and change the card's
     caption to say elements naming the subject follow a rename.
  6. `react/index.ts`: export `useSimulationSession.ts`; extend the grouping-files comment.
- **Tests:** T1–T4's DOM tests must pass unchanged (T4's three now green).
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run`; criterion 2's grep; `pnpm typecheck`.
- **Done when:** success criteria 2, 8 and 9 hold.

### T9 — The dock owns the session
- **Status:** [x] done
- **Depends on:** D-20-g, T8
- **Files:** `packages/devtools/src/react/DevtoolsDock.tsx`; `packages/devtools/test/react/DevtoolsDock.test.tsx`.
- **Steps:**
  1. In `DevtoolsDock`, call `useSimulationSession({ sightings, seed, ports })` and pass `session` to `Screen` →
     `<Simulator session={…} />`. Keep `DevtoolsDockProps` unchanged.
  2. `replay(entry)` keeps setting `seed` and the tab; the session re-seeds through its effect, once.
- **Tests:** `it("keeps the simulator's form, capture and result across a tab round trip — C8")` (probe 3, as a real test). Red before step 1.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/react/DevtoolsDock.test.tsx`.
- **Done when:** criterion 11 holds.

### T10 — Move model rules out of the DOM suite; delete the redundant tests
- **Status:** [x] done
- **Depends on:** T7, T8
- **Files:** `packages/devtools/test/react/Simulator.test.tsx`; `test/model/SimulationSession.test.ts`; `test/model/SimulationForm.test.ts`.
- **Steps:** apply §7's disposition table row by row; each "move" lands as a model test **before** its DOM twin is
  deleted; record before/after counts in §10.
- **Tests:** net DOM `it`s ≈ 48 + 7 (T1–T4) → ≤ 24.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run`; `grep -c "^\s*it(" test/react/Simulator.test.tsx` (≤ 24).
  Coverage thresholds are checked in T13's `pnpm check` (the root config applies them workspace-wide).
- **Done when:** criterion 12 holds and every row of §7's table is ticked.

### T11 — BDD: the session's refusal and the honest cost, as scenarios (optional, recommended)
- **Status:** [x] done
- **Depends on:** T7
- **Files:** `features/features/devtools-simulator/devtools-simulator.feature`; `features/features/devtools-simulator/devtools-simulator.steps.test.ts`.
- **Steps:** add `Scenario: A source the host did not supply is refused, not replaced` and
  `Scenario: A sweep runs the evaluations it said it would`, driving `makeSimulationSession` (no DOM), under the existing `@REQ-QD-026` tag.
- **Verify:** `pnpm test:bdd`.
- **Done when:** both scenarios pass and REQ-QD-026's row in `spec/traceability.md` still lists the feature.

### T12 — Spec, ADR amendments, overview, traceability, CCR, changeset, docs
- **Status:** [x] done
- **Depends on:** D-20-i, T7, T8
- **Files:** `spec/behaviors/29-devtools-simulator.md`; `spec/behaviors/index.yaml`; `spec/decisions/047-a-headless-devtools-model.md`;
  `spec/decisions/050-a-simulation-is-sealed.md`; `spec/devtools-spec/02-screens.md` (§5); `spec/overview.md`;
  `spec/traceability.md`; `spec/README.md` (Document history); `spec/glossary.md`; `.changeset/simulation-session.md` (*new*);
  `apps/website/src/content/docs/docs/packages/devtools.md`; `packages/devtools/README.md` if it lists screens.
- **Steps:** as §8, each with its Change History row and revision bump; `CCR-QD-NEXT` / `BEH-QD-NEXT` placeholders.
- **Verify:** `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && pnpm spec:api && pnpm spec:examples && pnpm spec:website-examples`.
- **Done when:** all six pass.

### T13 — Full gate
- **Status:** [x] done (scoped; see §10)
- **Depends on:** T1–T12
- **Files:** —
- **Steps:**
  1. `pnpm check`.
  2. If `pnpm mutation`'s devtools score drops, read `reports/mutation-devtools/mutation.json` survivors in
     `SimulationSession.ts`/`SimulationForm.ts` and add tests (not `// Stryker disable`).
- **Verify:** `pnpm check`.
- **Done when:** green; devtools mutation ≥ the T0 baseline and ≥ 80.

### T14 — Update the tracker
- **Status:** [x] done
- **Depends on:** T13
- **Files:** `.planning/architecture/README.md`; this file.
- **Steps:** set `status:` here and the README row; record decisions in the register with dates; add the four defects
  (C2, C4a/b, C5, C7) to "Defects found while planning" with their task ids; log in §10.
- **Done when:** the README and this file agree.

## 7. Test strategy

**Survives unchanged:** every `test/model/*` file (in particular `Simulation.test.ts`, `SimulationSource.test.ts:58`
pinning `portsOf(undefined)`, `WhatIf.test.ts`, `Capture.test.ts`, `Replay.test.ts`), `WhatIfTable.test.tsx`, the BDD feature.

**New:** `test/model/SimulationForm.test.ts` (fast-check round-trip properties per codec + refusal cases),
`test/model/SimulationSession.test.ts` (sources, capture, supersede under `TestClock`, staleness, plan, seeding,
snapshot identity, span), one `DevtoolsDock.test.tsx` case (C8).

**Disposition of the 48 existing `Simulator.test.tsx` cases** (line → action):

| Line(s) | Test | Action |
| ------- | ---- | ------ |
| 103 | empty state explains | **keep** (rendering) |
| 116, 125 | deny / allow once granted | keep **one** smoke (125); delete 116 |
| 133 | drops a chip again (E7.2) | keep (the × button) |
| 155, 163 | attribute value JSON / string | **move** → `SimulationForm` properties + examples |
| 175 | action emptied ⇒ absent | **move** → `SimulationForm` (`actionOf`) |
| 195 | malformed resource inline | keep (error renders) **and** model test for "last good resource kept" |
| 208, 221 | non-object refused / object accepted | **move** → `SimulationForm` |
| 236 | stale once the form moved (E7.4) | **move** → session; keep the marker's render in one DOM test |
| 249 | error panel, no tree (E7.5) | keep (rendering) |
| 264, 279, 288 | duties / all fields / narrowed fields | keep (rendering) |
| 297 | clock labelled | keep (rendering) |
| 314 | Live disabled with reason | **move** → session `sourceOptions`; keep one DOM assert of `disabled`+`title` |
| 322 | Snapshot enabled after a Live run | **move** → session (C3) |
| 337, 351 | cost warns before / counts | **move** → session `plan`; keep the I/O-colour render once |
| 362 | sweep names the flip | keep, **adjusted** (T3: toggle pairs on first) |
| 377, 389, 403, 415 | pair flip / filter / remedy / skipped | **delete** — `WhatIf.test.ts:134`, `WhatIfTable.test.tsx:271`, `Remedies.test.ts`, `WhatIfTable.test.tsx:181` |
| 429 | seed fills policy/action/unseeded | **move** → session; keep the UnseededCard render |
| 439, 449 | baseline matches / differs | keep (BaselineCard rendering) |
| 457 | orphan → empty | **move** → session (`policy: None`); the empty render is 103 |
| 472 | resource buffer cleared on re-seed | **move** → session (`resourceText` reset); delete the `key` remount it pinned |
| 506 | unmount cleanly (E7.8) | **move** → session `dispose` interrupts (now provable); keep a DOM unmount smoke |
| 520, 534 | relationship / history fixture allows | **delete** — `SimulationSource.test.ts:109,120` |
| 552, 560 | resolver attr / subject beats resolver | **delete** — `Simulation.test.ts:209,219` |
| 570 | chip with no colon ignored | **move** → `SimulationForm` |
| 577 | removes a chip and a pair | keep (buttons) |
| 590 | duplicate / empty chip refused | **move** → `SimulationForm` (`addChip`, structural) |
| 599 | resource emptied clears it | **move** → `SimulationForm`/session; evaluation half is `Simulation.test.ts:312` |
| 622 | runs whichever policy the rail names | keep (select wiring) |
| 641, 661 | clamp / leaving a replayed row | **move** → session |
| 673 | pairs toggle changes cost | **move** → session (`plan`) |
| 695, 709, 734, 752 | baseline card states | keep (rendering `summarise`) |
| 775 | host-layer defect reported | **move** → session `Broke`; keep one DOM render of the broke panel |
| T1–T4 additions | refusal / in-flight / cost / codec | **move** → session and form tests in T10; keep T1's refused-panel render |

Result: ≈ 21 kept, ≈ 19 moved, 8 deleted; the 7 T1–T4 additions become model tests with 1–2 render checks left.

**Property coverage:** the codec law (T6) is the one property; it replaces example tests rather than sitting beside them.
**Differential:** none needed — the session calls `simulate`/`whatIf` unchanged.
**Mutation:** `SimulationSession.ts` and `SimulationForm.ts` enter `stryker.devtools.mjs`'s scope; the shell keeps escaping it,
which is the point — the rules move to where mutants are counted.

## 8. Spec and documentation updates

- **`spec/behaviors/29-devtools-simulator.md`** (Rev bump, Change History row, CCR-QD-NEXT):
  - BEH-QD-220 gains `REQUIREMENT: A chosen source that cannot be honoured MUST be refused, never replaced by another.`
    and its sweep-cost requirement gains "…and the sweep MUST run exactly the evaluations stated." (C7).
  - New **BEH-QD-NEXT — "A simulation is a session"**: a ` ```ts ` signature listing of `makeSimulationSession`/`SimulationSession`;
    requirements: a Live run MUST capture; a capture MUST be dropped when the ports it came from change; a superseded run's
    result MUST NOT be shown; a result MUST be shown only under the policy, seed and input it ran against; the form's text
    MUST round-trip every input it can display. Prefer one ` ```typescript ` example that compiles (gate 9).
  - BEH-QD-225: "MUST name every field it could not seed" now has a control for every named field (signatures).
  - `spec/behaviors/index.yaml`: register BEH-QD-NEXT.
- **ADR-QD-047** amendment (2026-xx, CCR-QD-NEXT): the simulator's state is model (`SimulationSession`, beside `TimelineStore`);
  the "computes nothing" claim was false for screen 5 until this change. Note D-20-a's outcome.
- **ADR-QD-050** amendment: the session refuses an unavailable source as a typed state (the `portsOf` rule, extended one layer up);
  "a Live run captures" and the capture's lifetime (D-20-d) are stated here.
- **`spec/devtools-spec/02-screens.md` §5**: one paragraph on the session and the fourth fixtures row (signatures). Avoid every phrase in
  `check-devtools-claims.mjs:59-73` (write "a run the session refused", never "has no source"). Change History 1.0 row.
- **`spec/overview.md`** `@qadi/devtools` table: rows for `SimulationForm.ts` exports, `SimulationSession.ts` exports, and
  `useSimulationSession` (hook) under the React entries; `SimulatorProps` row unchanged (gains `session?`).
- **`spec/traceability.md`**: chapter 29 row's source list adds `SimulationSession`, `SimulationForm`, `useSimulationSession`;
  test rows for `test/model/SimulationSession.test.ts` (BEH-QD-220, BEH-QD-NEXT, INV-QD-042, INV-QD-043) and
  `SimulationForm.test.ts` (BEH-QD-NEXT); `Simulator.test.tsx`'s row trimmed to what it still pins (BEH-QD-225, BEH-QD-226, INV-QD-004).
- **`spec/glossary.md`**: "simulation session".
- **`spec/README.md`** Document history: CCR-QD-NEXT row listing every file above.
- **Changeset** `.changeset/simulation-session.md`: `"@qadi/devtools": minor` — new `SimulationSession`/`SimulationForm`/`useSimulationSession`;
  fixes: an unavailable source is refused instead of answering from fixtures; a run left behind by a policy change or re-seed is dropped;
  the sweep runs the evaluations the cost line states; fixture edges and events keep their subject; signatures are editable; the dock
  keeps the simulator across tab switches.
- **Website** `apps/website/src/content/docs/docs/packages/devtools.md:89-96`: mention the session in the simulation bullet (gate 22 if a fence is added).

## 9. Risks and rollback

- **Render-time vs effect-time seeding.** Today's render-time re-seed avoids one frame of the previous row's form (`:105-114`).
  Dispatching `seed` from an effect would reintroduce that frame. Mitigation: the hook dispatches during render when the prop
  identity changes (the same React-sanctioned pattern, now one line), or `useSyncExternalStore` plus a sync command; T8 keeps the
  existing "clears an edited-but-unsubmitted resource across a re-seed" assertion until its model twin exists.
- **Interrupting from sync commands** (T7 step 5) is the one design wrinkle; if it gets awkward, make every command an Effect the hook
  forks (D-20-b stays A). Shows up as a lingering `running: true` — T7's tests assert `running` resets after each supersede.
- **Fast-check flakiness / generator mistakes** (e.g. `-0`, lone surrogates in `FastCheck.string()`): a failing seed is printed;
  fix the domain predicate, not the property. `JSON.stringify` on a lone surrogate is well-formed in ES2019+, so it round-trips.
- **Coverage/mutation dip** from logic entering `src/model/`: budget T13's survivor pass; a drop below 95% fails `pnpm coverage`.
- **Overlap with ARCH-24** (store helper) and **ARCH-21** (`Capture.ts` signatures) and **ARCH-17** (`Remedies.ts`): rebase whichever
  lands later; the session only calls `capturing`/`answerCount`/`sweepPlan`/`whatIf`.
- **Rollback:** T1–T4 are independent commits and stay even if the refactor is reverted. T5–T10 revert as one range; the public
  additions are new names only (no removal), so a revert before release is free and after release is a minor-version removal
  (call it out in the changeset if it happens).

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence re-verified at `e328e75` with three DOM probes (`$P/probe*.test.tsx`) | planner |
| 2026-10-07 | T0 | Baseline re-checked on `arch/wave3` (HEAD 5ab2cc1) rather than a fresh branch; the three probes were not re-run — the DOM tests below reproduce each defect's behaviour against the new code | implementer |
| 2026-10-07 | T1–T4 | **Deviation.** The four defect fixes were not landed as separate red-then-green commits inside `Simulator.tsx`: the wave brief is one commit per plan, and the rules move to the model in the same change. Each fix is made once, in `SimulationSession`/`SimulationForm`, and pinned by a model test and a DOM render test written against it (red was not observed against the old component). C2 `resolveSource` + `Refused`; C4a/b generation + `stale` + seed-bound baseline; C7 `whatIf(..., { pairs })`; C5 explicit-form codec + `renameSubject`; the pairs tests at `Simulator.test.tsx` adjusted | implementer |
| 2026-10-07 | T5 | `fast-check` added to devtools `devDependencies` (`catalog:`). `pnpm install --frozen-lockfile --offline` refused (the lockfile lacked the new specifier); `pnpm install --offline` updated `pnpm-lock.yaml` (3 lines) and the frozen install then passes. D-20-a: no `ExternalStore.ts` (ARCH-24 extracts it) | implementer |
| 2026-10-07 | T6 | `SimulationForm.ts` (+ `attributeLabel`, display-only); 39 tests, round-trip properties at 500 runs per codec | implementer |
| 2026-10-07 | T7 | `SimulationSession.ts`; 49 tests under `TestClock`. Found while testing: a refused run did not reap the previous run's fiber (the superseded `run` hung) — fixed. A `Running` state replaces the previous result rather than leaving it on screen. The `seed` term of `stale` is unreachable (every seed command clears the run) and stays as a guard; an orphan seed binds the baseline (`Unavailable`), a replayable row left for the rail does not | implementer |
| 2026-10-07 | T8 | `useSimulationSession.ts` (`useSimulationSession`, `useOwnedSimulationSession`, `useSimulationSnapshot`); seed/ports/sightings dispatched from a layout effect (no painted frame of the old row); `Simulator.tsx` holds two `useState`s (the chip/pair typing buffers); signatures chips added; status sentences of a flip's path still go through `describeTracePath` (BaselineCard `summarise`) | implementer |
| 2026-10-07 | T9 | `DevtoolsDock` owns the session via `useOwnedSimulationSession` (no subscription, so keystrokes do not re-render the dock); `Screen` takes `simulation` in place of `seed`/`ports` | implementer |
| 2026-10-07 | T10 | `Simulator.test.tsx` 48 → 23 `it`s; +1 `DevtoolsDock` test; moved rules are in the two model tests | implementer |
| 2026-10-07 | T11 | Two BDD scenarios (refused source; sweep runs what it stated) under `@REQ-QD-026` | implementer |
| 2026-10-07 | T12 | CCR-QD-199, BEH-QD-322; BEH-QD-220/225 amended; ADR-QD-047 Rev 1.2, ADR-QD-050 Rev 1.3; no new ADR | implementer |
| 2026-10-07 | T13 | `pnpm check`/`pnpm mutation` left to the orchestrator. Scoped Stryker on the two new files: 96.23 (SimulationForm 97.43, SimulationSession 94.32) after a first run at 88.78; survivors left are equivalent or message-only. Scoped coverage: model 99.28 branches, react 91.68 | implementer |
| 2026-10-07 | T14 | README row and register updated | implementer |
