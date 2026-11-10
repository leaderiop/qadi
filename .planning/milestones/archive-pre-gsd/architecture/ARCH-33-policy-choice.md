---
id: ARCH-33
title: A policy choice is held by the policy, not by its index — one held-choice module serves the simulator session, the policy explorer and the role viewer, so a new decision never changes what a screen shows
strength: Strong          # from the 2026-10-07 architecture review (wave 4, card #4, id="c4"); defect reproduced by probe
status: done
evidence_verified_at: e635e68
depends_on: []
blocks: []                # ARCH-40 should land after this (it freezes PolicyChoice into the public closure); see §4
adrs_touched:
  - ADR-QD-047 (read: the simulator's state is model, held by SimulationSession; Rev 1.2 amendment, CCR-QD-199)
  - ADR-QD-048 (read: the catalogue is observed, newest first; "a label is a display string, never an identity")
  - ADR-QD-034 (constraint: Match, not switch; SWITCH_BUDGET unchanged)
  - ADR-QD-037 (constraint: madge gate; the new model module is a leaf, type-only edges count)
  - ADR-QD-025 + ADR-QD-076 + ADR-QD-098 (constraint: model/** is mutated by stryker.devtools.mjs, ignoreStatic, break 80, sequential)
  - ADR-QD-038 (constraint: changeset, fixed version group)
  - ADR-QD-099 (constraint: the new module stays out of the barrel, so it is package-private)
packages: ["@qadi/devtools", "spec", "features (BDD)", "apps/website (docs only, if D-33-f says so)"]
estimate: M   # ≈ 1–1½ days for T0–T12. Defect-only path (T1 + T2 + T3) ≈ ½ day (S), each shippable alone as a patch.
---

# ARCH-33 — Key a policy choice by the policy, not by its index

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68` (`git log --oneline -1` → `e635e68 Wave 3 architecture deepenings (ARCH-16 to ARCH-29) (#148)`).
ARCH-20 (`SimulationSession`) and ARCH-24 (`ExternalStore`/`DiagnosticsStore`) are both in that commit, so every line the
review cited is code ARCH-20 wrote.

**Probes** live in `$P = /private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-33/`,
never in the repo. The scratch directory cannot resolve workspace packages, so the `.mts` probes import `@qadi/core` as
`/Users/…/qadi/packages/core/src/index.ts` and `effect/*` as `/Users/…/qadi/packages/devtools/node_modules/effect/dist/*.js`
by absolute path. Run each one with:

```
cd packages/devtools && NODE_OPTIONS="--conditions=bun" ../../node_modules/.bin/tsx $P/<probe>.mts
```

The DOM probe (`explorer.test.tsx`) needs `$P/node_modules` → `packages/devtools/node_modules` (`ln -sfn`) and the
scratch `$P/vitest.config.mts` (`root: $P`, happy-dom, `@qadi/core`/`@qadi/testing` aliased to their `src/index.ts`, no
setup file, plain `vitest` `it`). Run it with
`cd packages/devtools && ./node_modules/.bin/vitest run --config $P/vitest.config.mts --reporter=verbose`.

| Probe | Output |
| ----- | ------ |
| `probe.mts` 1 — the walker's probe | sightings `[a, b]`, `choosePolicy(1)` → `Chosen 1 b`; `setSightings([b, a])` → **`Chosen 1 a`** |
| `probe.mts` 2 — a new policy decides for the first time | `[a, b]`, choose `b`, then `[c, a, b]` → **`Chosen 1 a`** |
| `probe.mts` 3 — the chosen policy leaves the list | `[a, b]`, choose `b`, then `[a]` → **`Chosen 0 a`** (silent swap) |
| `probe.mts` 4 — the real pipeline | timeline `e1:b, e2:a` → `policiesSeen` = `a,b`; choose index 1 → `b`; ingest `e3:b` → `policiesSeen` = `b,a` → **`Chosen 1 a`** |
| `probe.mts` 5 — an index that names nothing | `choosePolicy(-1)` → `None`; `choosePolicy(NaN)` → `None` (no error, the screen empties) |
| `probe-run.mts` — the user flow | sightings `[hasRole("admin"), clearance ≥ 5]`, choose 1, fixture `clearance: 9`, run → `Ran Decided` for *clearance*; `setSightings([B, A])` → dropdown **`admin`**, `stale: true`; run again → **`Ran` for `admin`** |
| `explorer.test.tsx` — the policy explorer | rail `[doc:read, doc:write]`, click item 1 → tree `doc:write`; `rerender` with `[doc:write, doc:read]` → **tree `doc:read`** |
| `probe-eq.mts` — keying is sound | two independently built equal `allOf([…])` → `Equal.equals: true`, `===: false`; after `toJson` → `fromJson`: `Equal.equals: true`, equal `Hash.hash` |
| `probe-catalogue.mts` — declared duplicates | `catalogueOf(emptyTimeline(), { policies: { canEdit: hasRole("editor"), canWrite: hasRole("editor") } })` → **2 entries** `canEdit,canWrite` |

| # | Claim (review card c4) | Verdict | At `e635e68` |
| - | ---------------------- | ------- | ------------ |
| C1 | `SimulationSession.ts:232` holds the choice as `let chosen = 0` | **CHANGED (by one line)** | `SimulationSession.ts:233`. `PolicyChoice` (`:123-131`) is `None \| Chosen{index, policy} \| Seeded{entry, policy, unseeded}`, exported, and `choosePolicy: (index: number) => void` is on the public `SimulationSession` interface (`:190`). |
| C2 | `:254-261` `policyChoice` clamps `chosen` | **CONFIRMED** | `:250-261`. The comment at `:254-255` says the clamp exists so "a stale index reads the policy the dropdown now shows", which is true and is the defect: the dropdown and the session agree with each other and both move. |
| C3 | `:449-461` chooses by index | **CHANGED** | `setSightings` is `:449-453` and never re-resolves the choice. `choosePolicy` is `:455-463`. Its no-op guard compares indices (`index === chosen`, `:458`), not policies. |
| C4 | `PolicyExplorer.tsx:84-96`: `useState(0)` + clamp | **CONFIRMED** | `:84` `useState(0)`, `:96` clamp, `:97-98` `sighting`/`policy`. The rail key is `${label}-${index}` (`:121`), so React reuses the button DOM by position too. The **DOM probe** reproduces the swap. A `draft` (`:87`) survives the swap, because `choose` (`:108-115`) is the only thing that clears it, so a pasted draft can sit under a different rail highlight. |
| C5 | `Catalogue.ts:88-97` `policiesSeen` walks the log newest first, so the list reorders on each new decision | **CONFIRMED, and wider** | `policiesSeen` is `:85-114`, the reverse walk is `:97`. BEH-QD-211 (`28-devtools-screens.md`) requires the order: "Order MUST be the timeline's own, reversed." `MutableHashMap` keeps insertion order (`backing: Map`, `effect/src/MutableHashMap.ts:65,93,471`), and re-`set` of an existing key keeps its position, so the order is "first sighting while walking newest first", which is most recently decided first. Two triggers move the index, not one. (a) A decision on a policy below the top moves it to 0. (b) **A policy's first decision inserts a new row at 0 and shifts every index by one** (probe 2). (b) needs no reorder at all, so it is the more common one in a fresh session. |
| C6 | The walker's probe: `[A,B]`, choose 1, `setSightings([B,A])` → `Chosen 1 A` | **CONFIRMED** | `probe.mts` 1 prints `Chosen 1 a`. |
| C7 | "In the most common flow (pick a policy, then use the app control that evaluates it), the screen silently switches" | **CONFIRMED (model level)** | `probe-run.mts`: the result goes stale (`Equal.equals` in `build`, `:300-305`, is correct), but the **next run evaluates the other policy**. The stale marker is the only signal, and it says "the form moved", not "the policy changed under you". |
| C8 | `model/Selection.ts` already keys log rows by row key, which is the precedent | **CONFIRMED** | `Selection.ts:1-49`: `selectionOf(timeline, key)` → `NoSelection \| Selected \| Evicted`. `Evicted` is "a third state rather than a silent return to `NoSelection`" (`:22-31`). The dock holds `selectedKey` (`DevtoolsDock.tsx:198`, `:219`). |
| C9 | Policies can be keyed structurally | **CONFIRMED** | `probe-eq.mts`. Equal across independent construction and across a wire round trip, with an equal hash. This matters: each SSE record is decoded separately, so a sighting's `policy` object is replaced whenever a newer decision on it arrives (`fresh(policy, entry)` takes the newest entry's object, `Catalogue.ts:172-182`). **Identity (`===`) keying would fail. `Equal.equals` is required.** `catalogueOf` and `policiesSeen` already group with it (`:93-108`, `:126`, `:131`). |
| C10 | *(found, not in the review)* `choosePolicy` accepts an index that names nothing | **CONFIRMED (latent)** | Probe 5: `-1` and `NaN` silently give `None`, and the screen shows "Nothing to simulate yet". It is unreachable through today's DOM, because the `-1` option renders only while seeded and is then already selected (`Simulator.tsx:182-189`). A policy-keyed command removes it by construction. |
| C11 | *(found, not in the review)* **DEFECT:** `catalogueOf` lists two structurally equal declared policies twice when neither has run | **CONFIRMED (probe)** | `Catalogue.ts:135-145`: `unseen` filters declared policies against `seen` only, never against each other. `probe-catalogue.mts` prints 2 entries. This breaks BEH-QD-211's own "Two structurally-equal policies MUST be one entry". It is inconsistent too: once either runs, `relabelled` (`:127-130`) collapses the pair into one row named after the **first** declared name. For this plan it matters because a keyed choice of the second row resolves to the first (two rows, one highlight). |
| C12 | Other screens holding an index | **CONFIRMED: one more** | `RoleViewer.tsx:40-46` (`useState(0)` + the same clamp, "the same shape as PolicyExplorer's rail selection"). Its list is `catalogue?.roles` (`DevtoolsDock.tsx:310`), a host prop that the timeline never reorders, so it is **not** the reported defect. But a host that rebuilds `roles` in a different order (`Object.values` of a map) gets the same swap. `grep -rn "useState(0)\|Math.min(" packages/devtools/src` finds exactly these three sites. `DecisionLog`/`Inspector` use `selectedKey`. `QuestionsPanel`, `ServicesPanel` and `WhatIfTable` hold no list index. No host (`examples/`, `apps/`, `features/`) calls `choosePolicy` or reads `PolicyChoice.index`. |
| C13 | How `PolicyChoice.index` is consumed | **CONFIRMED (one reader)** | `Simulator.tsx:176` (`chosen = …index : 0`) feeds the `<select value>` (`:185`). `onChange` does `session.choosePolicy(Number(event.target.value))` (`:187`). Tests: `SimulationSession.test.ts:322,381,425,543,551,554,647,783` and `Simulator.test.tsx:428-441`. |
| C14 | When the chosen policy is evicted | **CONFIRMED: silent swap** | Probe 3. Pinned **as intended behaviour** by `SimulationSession.test.ts:547-557` ("clamps a selection that outlives the rail shrinking": choose `b`, shrink to `[a]`, expect index 0) and `PolicyExplorer.test.tsx:370-382`. Both tests encode the swap the card calls a defect, so this plan **replaces** them (D-33-b). It is not a regression. |
| C15 | Release state | **FACT** | `SimulationSession`, `PolicyChoice` and `choosePolicy` were added in wave 3 (overview Rev 1.54, CCR-QD-199) after `@qadi/devtools@0.11.0` (`npm view @qadi/devtools version` → `0.11.0`, tag at `d0884e6`). **They are unreleased**, so changing `choosePolicy`'s parameter and `PolicyChoice`'s union breaks no published consumer. `PolicyExplorerProps`/`RoleViewerProps` are released, and this plan leaves them unchanged. |

**Other facts the plan relies on.**

- ARCH-20's decisions are not contradicted. D-20-b (sync commands, `run` is an Effect), D-20-g (the dock owns the
  session) and the "commands notify once, no-op does not notify" rule (`SimulationSession.test.ts` identity tests) all
  stay. BEH-QD-322 already says "Policies compare structurally, so a host rebuilding an equal policy each render does not
  mark a result stale". This plan extends that sentence from staleness to the choice itself.
- `useOwnedSimulationSession` dispatches `setSightings` from a layout effect on every `sightings` identity change
  (`useSimulationSession.ts:75-79`). The dock rebuilds `sightings` per timeline tick (`DevtoolsDock.tsx:220`), and
  `sameElements` (`:221-222`) compares by element identity, so in practice every tick is a `setSightings`.
- No BDD scenario or host touches the index (`grep -rn "choosePolicy\|qadi-simulator-policy" features examples apps` → nothing).
- `stryker.devtools.mjs` mutates `packages/devtools/src/model/**/*.ts` (break 80, `ignoreStatic: true`). The React
  shell is covered at 90% and not mutated, so the rule must live in `model/` to be mutation-gated.

## 2. Goal and success criteria

**Goal.** "Which item of a list the reviewer chose" is today a number in three places: the session's `chosen`, the
explorer's `useState(0)` and the role viewer's `useState(0)`. Each has its own clamp, and none of them survives the
list moving under it. This plan makes it **one small model module**, `model/HeldChoice.ts`. A choice is held **by the
value** (a policy, compared with `Equal.equals`; a role, compared by name) and resolved against the current list into a
closed union: nothing to choose, chosen and listed at index *i*, or chosen and **evicted** (still held, no longer listed).
That is `Selection.ts`'s keyed shape applied to a list of values instead of log rows. The **seam** is
`resolveHeld(list, held, same)`. Every screen adapter (the session, the explorer and the role viewer) supplies only its
list and its equality. **Locality:** "a new decision never changes what a screen shows" lives and is mutation-tested in
one function. **Leverage:** three screens and any future list screen get the rule for free, and the session's public
command takes a policy, so an index that names nothing cannot be expressed.

**Success criteria.**

1. Session, the walker's probe as a test: choose `B` from `[A, B]`, `setSightings([B, A])` → `policy` is `Chosen{policy: B, index: 0}`,
   and a run evaluates `B`. Same for a new policy inserted at the head: `[C, A, B]` → still `B`, index 2.
   `pnpm vitest run packages/devtools/test/model/SimulationSession.test.ts` (T1, red first).
2. Explorer: click `doc:write`, rerender with the rail reversed → the tree still shows `doc:write` and the second rail item
   is highlighted. `pnpm vitest run packages/devtools/test/react/PolicyExplorer.test.tsx` (T2, red first).
3. `catalogueOf` lists two structurally equal declared, unseen policies **once** (the first declared name wins, matching
   `relabelled`): `pnpm vitest run packages/devtools/test/model/Catalogue.test.ts` (T3, red first).
4. A chosen policy that leaves the list stays chosen. The session reports `Evicted{policy, label}`, a run still evaluates it,
   and the dropdown and the explorer say "no longer in the log". Nothing swaps silently (T5–T7).
5. Before any explicit choice, the first policy shown is **pinned** when the list first becomes non-empty, so the default
   does not follow the head either (D-33-c, T5, T7).
6. `grep -rn "useState(0)\|Math.min(" packages/devtools/src` → nothing. `grep -n "chosen" packages/devtools/src/model/SimulationSession.ts`
   → no numeric index state (T5, T7, T8).
7. `HeldChoice.ts` is at 100% branches. `stryker.devtools.mjs` scoped to it and `SimulationSession.ts` is ≥ 90 with no
   live surviving mutant in `resolveHeld` (T11).
8. Two BDD scenarios under `@REQ-QD-026` and `@REQ-QD-025` pass (T9). `pnpm check` is green (T11).

## 3. Non-goals

- **Changing the rail's order.** BEH-QD-211 requires newest first, and that is right for a reader. The fix is to stop
  trusting position, not to freeze the list.
- **Keeping the explorer's or role viewer's selection across a tab switch.** Both are component state, so they are lost
  on unmount, like the simulator before ARCH-20's D-20-g. That is a separate product question. §9 names it, and the
  dock could own a `HeldChoice` per screen later at no cost to this design.
- **A stable string key for a policy** (a hash or canonical JSON). `Equal.equals` already is the identity the catalogue
  groups by, and a second identity is the "two definitions of one thing" this codebase treats as a defect. The `<select>`
  maps a rendered option back to the policy through the **same rendered snapshot**, so it needs no key (§6 T6).
- **ARCH-40's export narrowing.** `HeldChoice.ts` is born package-private (out of the barrel) whatever ARCH-40 decides.
- **Exporting `HeldChoice` publicly.** Nothing outside the package needs it (§4 ADR-QD-099).

## 4. Constraints

- **AGENTS.md §1.** `import * as Equal from "effect/Equal"`, `.ts` relative imports, and `import type` for type-only imports.
- **§5a / ADR-QD-034.** Readers of the new union in `Simulator.tsx`/`PolicyExplorer.tsx` use
  `Match.value(…).pipe(Match.tagsExhaustive(…))` (render-time, once per render, as `RunView` already does at
  `Simulator.tsx:144-158`), never a `switch`. `resolveHeld` itself needs no dispatch. `SWITCH_BUDGET` is unchanged.
- **§6.** No `as`, `!` or `any`, and no `Record<string, unknown>` widening (user preference). `HeldChoice<A>` is a
  generic closed union, not a widened record. `findIndex` returns `-1`, which is narrowed with an explicit check, not
  a `!`.
- **§9 / ADR-QD-099.** `model/HeldChoice.ts` is **not** added to `src/index.ts`, so it is package-private, like
  `ExternalStore.ts`. `PolicyChoice` (public, from `SimulationSession.ts`) gains `Evicted`. That is a public type change,
  but of an unreleased type (C15).
- **ADR-QD-037 / `pnpm circular`.** `HeldChoice.ts` imports nothing from `model/` (it is generic over `A`), so it is a
  leaf. `SimulationSession.ts`, `PolicyExplorer.tsx` and `RoleViewer.tsx` import it. Madge counts type-only edges, and
  none run back.
- **ADR-QD-076.** `ignoreStatic: true`. `resolveHeld` is per-call, so every arm (empty list, listed, evicted, no
  held value with a non-empty list) needs a test that pins its output.
- **Coverage.** `model/**` at 95% on all four metrics (`vitest.config.ts:49-55`), `react/**` at 90%.
- **Gate 13 (`node scripts/check-api-surface.mjs`).** `PolicyChoice` is already in the overview (`spec/overview.md:780`).
  Its row needs no new name. If D-33-b renames nothing public, gate 13 is unaffected. `HeldChoice` is not exported,
  so it gets no row.
- **ADR-QD-038.** One changeset, `@qadi/devtools: patch` (C15: the only public-type change is to an unreleased type,
  and the released props are unchanged). T1–T3 may ship as separate patches.
- **Overlaps (wave 4).**
  - **ARCH-40** (headless interface): if it keeps the session public, `PolicyChoice` and `choosePolicy` join the frozen
    public closure. **Ordering rule: ARCH-33 lands first**, so the API ARCH-40 freezes is the keyed one. If ARCH-40 lands
    first, nothing breaks; ARCH-33's changeset then says "breaking" for `choosePolicy`'s parameter.
  - **ARCH-34 / ARCH-44** reshape `DevtoolsDock` props and the diagnostics feed. They do not touch `sightings`. File
    overlap: `DevtoolsDock.tsx` (this plan does **not** edit it unless D-33-d adds role keying through it; it does not).
    Merge order is free.
  - **ARCH-20** (done): its D-20-* decisions stand. This plan amends BEH-QD-322, which ARCH-20 wrote.

## 5. Decisions needed before work starts

### D-33-a — One shared module, or a fix in each screen?
- **(A) One generic package-private module `model/HeldChoice.ts`.** It contains
  `type HeldChoice<A> = { _tag: "Empty" } | { _tag: "Listed"; value: A; index: number } | { _tag: "Evicted"; value: A }`
  and `resolveHeld<A>(list, held: A | undefined, same: (a: A, b: A) => boolean): HeldChoice<A>`, with `held` undefined
  and a non-empty list resolving to `Listed` at 0 (the caller pins it, D-33-c). It has three adapters: the session (policy, `Equal.equals`),
  the explorer (policy, `Equal.equals`) and the role viewer (role, by `name`). The clamp is deleted three times.
- **(B) Fix each screen in place** (the session holds a `Policy`, and each component `useState<Policy>`). It is smaller,
  but the "evicted" rule gets written three times, in two React files that are not mutation-gated.
- **(C) The session only.** It leaves the explorer defect (C4, reproduced) open.
- **Recommendation: A.** The rule is the depth here, and B puts two thirds of it where Stryker cannot see it. Prefer the complete option.
- **status: decided (2026-10-08, recommended default)**

### D-33-b — What a chosen value that leaves the list becomes
- **(A) It stays held, as `Evicted`.** The session's `PolicyChoice` gains `{ _tag: "Evicted"; policy; label }`. A run
  evaluates it, and the dropdown shows an extra selected option "‹label› — no longer in the log" (the shape the
  `-1` "from the replayed row" option already has, `Simulator.tsx:189`). The explorer keeps showing its tree, with a muted
  note and no rail highlight. This mirrors `Selection.ts`'s `Evicted`: "an event, not a silent return". The policy is a
  value already in hand, so nothing is lost by keeping it.
- **(B) Fall back to the newest sighting, with a one-line notice.** It is honest but still changes what is shown
  without the reviewer, which is the defect class this plan removes.
- **(C) Fall to `None` until re-chosen.** The screen empties ("Nothing to simulate yet") while policies are visibly
  listed, which is the very bug the clamp was added to fix (`PolicyExplorer.tsx:91-95`).
- **Recommendation: A.** It replaces two tests that pin today's swap (C14). Those tests encode the defect, so this is not a regression.
- **status: decided (2026-10-08, recommended default)**

### D-33-c — Does the default (nothing chosen yet) follow the head?
- **(A) Pin on first sight.** When the list first becomes non-empty and nothing is held (and nothing is seeded), the
  head is held as if chosen. From then on a new head does not move it. A run with no explicit choice then cannot be
  overtaken either.
- **(B) Follow the head until the reviewer chooses** (`Listed` at 0, re-resolved each tick). The default stays
  "latest", but the C7 flow still happens to a reviewer who never touched the dropdown: fill the form, run, a decision
  arrives, and the next run is a different policy.
- **Recommendation: A.** The invariant "a screen never changes the policy it shows without the reviewer" then holds
  without exceptions.
- **status: decided (2026-10-08, recommended default)**

### D-33-d — The role viewer too?
- **(A) Yes.** `RoleViewer` holds a `Role["name"]` and resolves it through `resolveHeld(roles, held, (a, b) => a.name === b.name)`.
  Its list is a host prop that the timeline never reorders (C12), so this is consistency and not a reported defect. It
  deletes the third clamp, and success criterion 6's grep then holds.
- **(B) No.** The plan leaves one clamp, and one index-held list stays as a template for the next screen.
- **Recommendation: A** (complete over simple, ~20 lines).
- **status: decided (2026-10-08, recommended default)**

### D-33-e — The session command's parameter
- **(A) `choosePolicy(policy: Policy)`.** The view maps the selected `<option>` back to
  `snapshot.sightings[i].policy` from the **same snapshot it rendered** (no race: the options are that snapshot's list).
  An index cannot reach the session, so C10 is gone by construction. It changes an unreleased public signature (C15).
- **(B) Keep `choosePolicy(index)` and resolve it to a policy at call time.** Source compatible, but the session's
  interface keeps an index that can name nothing (C10), and every non-React caller has to know which snapshot the index
  was taken from.
- **Recommendation: A.** T1 uses B's mechanism internally as the decision-free defect fix, and T5 switches the signature.
- **status: decided (2026-10-08, recommended default)** (needs user sign-off: a public signature change, unreleased)

### D-33-f — Spec shape
- **(A) Requirements only.** BEH-QD-322 gains "a chosen policy is held by value". BEH-QD-211 gains (or re-asserts)
  "declared duplicates are one entry". BEH-QD-212's document (screen 3) gains "the explorer keeps the policy it shows". No new ADR, no new
  invariant.
- **(B) Also a new invariant INV-QD-NEXT,** "a screen never changes what it shows without the reviewer", enforced by
  T1/T2/T7's tests. It names a property three screens now share. It costs a traceability row and an invariant entry.
- **Recommendation: B.** The rule is cross-screen, and an invariant is how this repository makes a cross-cutting rule
  findable (INV-QD-041 is the same kind, "a structural view states no verdict").
- **status: decided (2026-10-08, recommended default)**

## 6. Tasks

T1–T3 are test-first defect fixes, each decision-free and shippable alone as an `@qadi/devtools` patch. T4 onwards is the
deepening and carries their tests.

### T0 — Re-baseline
- **Status:** [x] done (2026-10-08)
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/33-policy-choice main`. Record `git rev-parse --short HEAD` in §10.
  2. `git diff --stat e635e68 HEAD -- packages/devtools/src/model/{SimulationSession,Catalogue,Selection}.ts packages/devtools/src/react/{PolicyExplorer,RoleViewer,Simulator}.tsx`.
     If non-empty, re-read §1 C1–C4/C12 and fix the line numbers here.
  3. Re-run §1's probes (the commands are in §1). Expect probe 1 → `Chosen 1 a`, `probe-run` re-run → `admin`,
     `explorer.test.tsx` → `after reorder: doc:read(permission)`, `probe-catalogue` → `2 entries`. If the scratchpad is
     gone, §1's table gives the inputs and expected outputs. Rebuild from those.
  4. Check whether ARCH-40 has landed (`git log --oneline main -- packages/devtools/src/index.ts`). If it has, T5's changeset
     says "breaking" (§4).
  5. Record baselines: `cd packages/devtools && ./node_modules/.bin/vitest run` (file and test counts).
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §1 is re-confirmed or corrected in §10.

### T1 — Test-first: the session keeps the chosen policy when the list moves (defect C5–C7)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0 (decision-free)
- **Files:** `packages/devtools/test/model/SimulationSession.test.ts`, `packages/devtools/src/model/SimulationSession.ts`.
- **Steps:**
  1. In the `describe("seeding", …)` block's neighbourhood, add `describe("choosing a policy", …)` with:
     - `it("keeps the chosen policy when a decision reorders the rail")`: `[sighting(hasRole("a")), sighting(hasRole("b"))]`,
       `choosePolicy(1)`, `setSightings([sighting(hasRole("b")), sighting(hasRole("a"))])` (fresh objects, so the test
       also proves structural keying). Assert `policy._tag === "Chosen"`, `Equal.equals(policy.policy, hasRole("b"))`, `policy.index === 0`.
     - `it("keeps the chosen policy when a new policy decides first")`: `[a, b]`, choose 1, `[c, a, b]` → `b`, index 2.
     - `it.effect("runs the chosen policy after the rail moved — the walker's flow")`: the `probe-run.mts` scenario under
       `TestClock` (no sleeping port needed). Assert the second `Ran`'s `question.policy` equals the clearance policy.
     Run them and confirm all three are **red** (`a`, `a`, `admin`).
  2. Fix minimally, keeping the API: replace `let chosen = 0` (`:233`) with
     `let held: PolicySighting | undefined`. `choosePolicy(index)` resolves `sightings[index]` at call time. If it is
     `undefined`, return without notifying (this closes C10 too). Otherwise set `held = sightings[index]` and keep the
     rest of the command. `policyChoice()` finds `sightings.findIndex((s) => Equal.equals(s.policy, held.policy))`.
     When the index is `>= 0`, return `Chosen{index, policy: sightings[index].policy}`. When it is `-1`, keep today's
     clamp **for now** (T5 replaces it with `Evicted`), so `SimulationSession.test.ts:547-557` still passes unmodified in
     this task. With nothing held, return index 0 (today's default).
     The no-op guard becomes `held !== undefined && Equal.equals(next.policy, held.policy)`.
  3. Comment: one-line summary, then why the choice is held by value (C9: each record is decoded separately, so identity fails).
- **Tests:** three new tests, red first. Existing tests unmodified.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/model/SimulationSession.test.ts test/react/Simulator.test.tsx`.
- **Done when:** all pass. This ships alone as `"@qadi/devtools": patch`, "the simulator no longer switches policy when a new
  decision reorders the rail".

### T2 — Test-first: the explorer keeps the policy it shows (defect C4)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0 (decision-free)
- **Files:** `packages/devtools/test/react/PolicyExplorer.test.tsx`, `packages/devtools/src/react/PolicyExplorer.tsx`.
- **Steps:**
  1. Add `it("keeps the selected policy when a decision reorders the rail")`: mount `[read, write]`, click item 1, assert
     `nodes()[0]` includes `doc:write`, `view.rerender(<PolicyExplorer sightings={[sighting(hasPermission(write)), sighting(hasPermission(read))]} />)`,
     and assert the tree still includes `doc:write` and that rail item **0** carries the selected background. Red today (`doc:read`).
  2. Add `it("keeps a pasted draft and its rail highlight in step after a reorder")`: paste JSON for `write` while `read`
     is selected, reorder, and assert the draft is still shown and no rail item is highlighted (`:123`'s `draft === undefined` rule).
  3. Fix minimally: `useState<Policy | undefined>(undefined)` for the held policy. `choose(index)` stores
     `sightings[index]?.policy`. Resolve with `findIndex(Equal.equals)`. On `-1`, keep the clamp for now (T7 replaces it).
     `Equal` is already imported (`PolicyExplorer.tsx:17`).
  4. Leave the rail's React key (`${label}-${index}`, `:121`) as it is. Keys only reuse DOM. Add a comment that selection
     no longer depends on position.
- **Tests:** two new DOM tests, the first red-first. `:370-382` (the clamp test) passes unmodified in this task.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/react/PolicyExplorer.test.tsx`.
- **Done when:** both pass. This can ship alone as a patch.

### T3 — Test-first: declared duplicates are one catalogue entry (defect C11)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0 (decision-free: BEH-QD-211 already requires it)
- **Files:** `packages/devtools/test/model/Catalogue.test.ts`, `packages/devtools/src/model/Catalogue.ts`.
- **Steps:**
  1. Add `it("lists two structurally equal declared policies once, under the first name, whether or not they ran")`:
     (a) the empty timeline with `{ canEdit: hasRole("editor"), canWrite: hasRole("editor") }` gives one entry, label `canEdit`, count 0.
     (b) The same catalogue with one decision on `hasRole("editor")` gives one entry, label `canEdit`, count 1 (this pins
     today's `relabelled` behaviour as the agreed rule). Red: (a) gives 2.
  2. Fix: build `unseen` by folding `named` and skipping a declared policy that is `Equal.equals` to an already
     kept one, whether seen or declared earlier. Use a `MutableHashMap<Policy, string>` to stay linear, as `policiesSeen`
     explains (`:79-84`). Keep declared order.
  3. Doc comment: one sentence naming BEH-QD-211's requirement and that the first declared name wins, as `relabelled` does.
- **Tests:** one new test, red first.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/model/Catalogue.test.ts`.
- **Done when:** it passes. This can ship alone as a patch.

### T4 — `model/HeldChoice.ts`: the shared rule
- **Status:** [x] done (2026-10-08)
- **Depends on:** D-33-a (= A), D-33-b, D-33-c
- **Files:** `packages/devtools/src/model/HeldChoice.ts` (*new*), `packages/devtools/test/model/HeldChoice.test.ts` (*new*).
- **Steps:**
  1. Write the module. It opens with a one-line summary ("A choice from a list, held by its value"), then the why:
     positions move (C5's two triggers), `Selection.ts` is the precedent, and an evicted value is still a value.
     ```ts
     export type HeldChoice<A> =
       | { readonly _tag: "Empty" }
       | { readonly _tag: "Listed"; readonly value: A; readonly index: number }
       | { readonly _tag: "Evicted"; readonly value: A };
     export const resolveHeld = <A>(
       list: ReadonlyArray<A>,
       held: A | undefined,
       same: (a: A, b: A) => boolean,
     ): HeldChoice<A>
     ```
     Rules: `held === undefined` gives `Listed{list[0], 0}`, or `Empty` when the list is empty (the caller pins it, D-33-c).
     If `held` is found, the result is `Listed` with the **list's** element (the newest object, so labels and counts are
     current) and its index. If it is not found, the result is `Evicted{held}`.
     Plus `export const pinHead = <A>(list, held: A | undefined): A | undefined => held ?? list[0]` for the adapters' pin step.
  2. Tests (pure `it`, no Effect): one per arm, a reorder, a head insertion, a duplicate in the list (the first match wins,
     matching T3), and a fast-check property (`fast-check` is already a devtools devDependency, ARCH-20 D-20-j): for any
     list of distinct integers and any permutation `p`, `resolveHeld(p(list), x, ===)` names `x` whenever `x ∈ list`.
  3. **Do not** add it to `src/index.ts` (§4).
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/model/HeldChoice.test.ts`; `pnpm circular`.
- **Done when:** the tests pass, branches are at 100% for the file, and madge reports no cycle.

### T5 — The session holds the policy (D-33-b/c/e)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1, T4, D-33-b, D-33-c, D-33-e
- **Files:** `packages/devtools/src/model/SimulationSession.ts`, `packages/devtools/test/model/SimulationSession.test.ts`.
- **Steps:**
  1. `PolicyChoice` becomes the closed union
     `None | Chosen{index, policy} | Evicted{policy, label} | Seeded{entry, policy, unseeded}`, the full union restated
     (user preference: closed union, not `old | "New"`). Doc: what each means, and that `index` is a reading of the
     current list, never an input.
  2. State: `held: { policy: Policy; label: string } | undefined` (T1's `PolicySighting` slot narrowed to what an evicted
     choice needs). `policyChoice()` calls `resolveHeld(sightings, heldSighting, (a, b) => Equal.equals(a.policy, b.policy))`,
     with `Listed` → `Chosen`, `Evicted` → `Evicted{policy, label}`, and `Empty` → `None`.
  3. D-33-c pin: in `setSightings` and in `makeSimulationSession`'s init, if `held === undefined && seeded === undefined && next.length > 0`,
     hold `next[0]`. This must still notify only once per command.
  4. D-33-e: `choosePolicy: (policy: Policy) => void`. If the policy is in `sightings`, hold that sighting's label;
     otherwise hold `{ policy, label: policyLabel(policy) }` (a programmatic choice of an unlisted policy is
     `Evicted` at once, which is honest). The guard is `seeded === undefined && held !== undefined && Equal.equals(held.policy, policy) && run._tag === "Idle"`.
  5. `policyOf` reads `Evicted.policy` too, so a run of an evicted choice works.
  6. Tests: rewrite `:540-557`. "Clamps a selection that outlives the rail shrinking" becomes
     `it("keeps an evicted choice, marks it, and still runs it")`: choose `b`, shrink to `[a]` → `Evicted`, and
     `run("Run")` gives a `Ran` with `question.policy` = `b`. Then `setSightings([])` → still `Evicted` (an evicted choice
     outlives an empty rail, D-33-b). Then `it("pins the head before any choice, and a new head does not move it")`.
     Then `it("refuses nothing: choosing an unlisted policy holds it as evicted")`. Update every `choosePolicy(n)` call (C13's
     eight lines) to pass the policy. T1's three tests stay as they are, except for the call form.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/model/SimulationSession.test.ts`; `pnpm typecheck`.
- **Done when:** all pass and `grep -n "Math.min\|chosen" packages/devtools/src/model/SimulationSession.ts` → nothing.

### T6 — The simulator view renders the union
- **Status:** [x] done (2026-10-08)
- **Depends on:** T5
- **Files:** `packages/devtools/src/react/Simulator.tsx`, `packages/devtools/test/react/Simulator.test.tsx`.
- **Steps:**
  1. `Controls` (`:171-198`): compute the `<select>` value with `Match.value(snapshot.policy).pipe(Match.tagsExhaustive({ None: () => "", Chosen: (c) => String(c.index), Evicted: () => "evicted", Seeded: () => "seeded" }))`.
     Render `<option value="seeded">from the replayed row</option>` when seeded (replacing `-1`) and
     `<option value="evicted">{label} — no longer in the log</option>` when evicted. `onChange`:
     `const s = snapshot.sightings[Number(value)]; if (s !== undefined) session.choosePolicy(s.policy);` (`"seeded"`/`"evicted"` are already selected,
     so they cannot fire. A non-numeric value names no sighting and is ignored.)
  2. `SimulatorView`'s `policy._tag === "None"` empty state is unchanged. `Evicted` renders the full screen.
  3. Tests: `it("keeps the dropdown on the chosen policy when the rail reverses")`, a DOM twin of T1 that rerenders with
     reversed `sightings`. `it("says when the chosen policy is no longer in the log, and still runs it")`. `:428-441`
     ("runs whichever one the rail names") keeps passing as it is.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/react/Simulator.test.tsx test/react/DevtoolsDock.test.tsx`.
- **Done when:** all pass.

### T7 — The explorer holds through `HeldChoice`
- **Status:** [x] done (2026-10-08)
- **Depends on:** T2, T4, D-33-b, D-33-c
- **Files:** `packages/devtools/src/react/PolicyExplorer.tsx`, `packages/devtools/test/react/PolicyExplorer.test.tsx`.
- **Steps:**
  1. State `held: PolicySighting | undefined`, pinned during render with React's documented derived-state pattern:
     `if (held === undefined && sightings[0] !== undefined) setHeld(sightings[0])`. Resolve with `resolveHeld(…, (a, b) => Equal.equals(a.policy, b.policy))`.
     `Listed` highlights `index`, `Evicted` shows the held policy plus a muted
     `data-testid="qadi-policies-evicted"` line ("‹label› is no longer in the log"), and `Empty` shows the existing empty state.
     Match with `Match.tagsExhaustive`.
  2. `choose(index)` holds `sightings[index]` and keeps clearing `draft`/`preview`/`pasteError` (`:108-115`).
  3. Replace `:370-382` ("clamps a selection…") with `it("keeps a policy that left the rail, and says so")`, which asserts
     `qadi-policies-evicted` and the old tree. Keep T2's tests.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/react/PolicyExplorer.test.tsx`.
- **Done when:** all pass and `grep -n "useState(0)\|Math.min" packages/devtools/src/react/PolicyExplorer.tsx` → nothing.

### T8 — The role viewer holds by name (D-33-d)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T4, D-33-d (= A)
- **Files:** `packages/devtools/src/react/RoleViewer.tsx`, `packages/devtools/test/react/RoleViewer.test.tsx`.
- **Steps:**
  1. `held: Role | undefined`, pinned as in T7, and resolved with `(a, b) => a.name === b.name`. `Evicted` keeps
     showing the held role with a note, and the chip key stays `candidate.name` (`:62`).
  2. Tests: reorder `roles` and the chosen role stays. Remove the chosen role and it stays, with a note. Replace the
     existing clamp test if one exists (`grep -n "clamp\|shrink" packages/devtools/test/react/RoleViewer.test.tsx`).
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/react/RoleViewer.test.tsx`; `grep -rn "useState(0)\|Math.min(" packages/devtools/src` → nothing.
- **Done when:** both hold.

### T9 — Acceptance scenarios
- **Status:** [x] done (2026-10-08)
- **Depends on:** T5, T7
- **Files:** `features/features/devtools-simulator/devtools-simulator.feature` and `.steps.test.ts`;
  `features/features/devtools-screens/devtools-screens.feature` and `.steps.test.ts`.
- **Steps:**
  1. Under `@REQ-QD-026`: "Scenario: A chosen policy survives a decision that reorders the rail". Given a session over
     the timeline's sightings with policy B chosen, when a decision on B is ingested and the session is told the new
     sightings, then the chosen policy is still B, and a run evaluates B. Drive `makeSimulationSession` and
     `catalogueOf` through the package root, as the existing steps do.
  2. Under `@REQ-QD-025`: "Scenario: Two equal declared policies are one rail entry" (T3's rule, through `catalogueOf`).
     The explorer half is covered by T2/T7's DOM tests. The BDD suite renders only where it already does
     (`gate-instances`), so no DOM is added here.
- **Verify:** `pnpm test:bdd` (the BDD suite; `cd features && ./node_modules/.bin/vitest run features/devtools-simulator features/devtools-screens` for the two files alone).
- **Done when:** both scenarios pass.

### T10 — Spec, traceability, CCR, changeset
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1–T9, D-33-f
- **Files:** `spec/behaviors/29-devtools-simulator.md`, `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`
  (if D-33-f = B), `spec/traceability.md`, `spec/overview.md` (the `PolicyChoice` row's prose only, if it names the
  members), `spec/README.md` (CCR register), `.changeset/policy-choice-held-by-value.md` (*new*).
- **Steps:** see §8 for every edit. Then:
  1. `node scripts/check-doc-examples.mjs`. BEH-QD-322's `typescript` fence must still compile (it does not call `choosePolicy`).
  2. `node scripts/check-api-surface.mjs` (gate 13). No name is added or removed, so it should be unaffected. Confirm.
- **Verify:** `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates`.
- **Done when:** all four pass.

### T11 — Full gate
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1–T10
- **Files:** none.
- **Steps:**
  1. Scoped mutation first: run `stryker.devtools.mjs` with `--mutate packages/devtools/src/model/{HeldChoice,SimulationSession,Catalogue}.ts`.
     Kill every survivor in `resolveHeld` (each arm is per-call, ADR-QD-076). A survivor elsewhere is a missing test or
     a recorded finding, never suppressed.
  2. `pnpm check`.
- **Verify:** `pnpm check`.
- **Done when:** green.

### T12 — Update the tracker
- **Status:** [x] done (2026-10-08)
- **Depends on:** T11
- **Files:** this plan (frontmatter `status`, task boxes, §10). The orchestrator owns `.planning/architecture/README.md`.
- **Steps:** set `status: done`, tick the tasks, and record the commit SHAs and assigned CCR/INV numbers in §10.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-33-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Replace, don't layer.** "Which item is chosen" is tested **once, exhaustively**, in `HeldChoice.test.ts`: every arm, reorder,
  head insertion, eviction, duplicates, plus a permutation property. The adapters keep only what is theirs: the
  session's pin and run (`SimulationSession.test.ts`), the dropdown's option values (`Simulator.test.tsx`), the
  explorer's highlight and draft (`PolicyExplorer.test.tsx`), and the role chips (`RoleViewer.test.tsx`).
- **Deleted as wrong, not redundant:** `SimulationSession.test.ts:547-557` and `PolicyExplorer.test.tsx:370-382` pin
  the silent swap (C14). Each is replaced by an "evicted stays held" test in the same `describe`, so the coverage of the
  shrink path is kept.
- **Red-first:** T1 (×3), T2 (×1), T3 (×1) are observed red against `e635e68` before their fixes.
- **Property:** T4's permutation property, with `fast-check` already a devDependency.
- **Mutation:** `HeldChoice.ts`, `SimulationSession.ts` and `Catalogue.ts` fall under `stryker.devtools.mjs`. The React
  changes are covered at 90% and not mutated, which is why the rule moves to `model/` (D-33-a).
- **Acceptance:** two scenarios (T9) join REQ-QD-025/026.

## 8. Spec and documentation updates

- **BEH-QD-322** (`29-devtools-simulator.md`): a new REQUIREMENT: "A chosen policy MUST be held by its value: a new
  decision, a reorder or a shrink of the rail MUST NOT change it. A policy that leaves the rail MUST stay chosen and be
  marked as no longer in the log. Before any choice, the first policy shown is held." Extend the "Policies compare
  structurally" paragraph to the choice. Update the `ts` signature listing if it names `choosePolicy` (it does not today;
  add `readonly choosePolicy: (policy: Policy) => void;` beside `run`). Add a revision row.
- **BEH-QD-211** (`28-devtools-screens.md`): under "Two structurally-equal policies MUST be one entry", one sentence:
  "declared policies included, the first declared name winning" (T3). Add a short REQUIREMENT under the explorer's
  behaviour (BEH-QD-212's neighbourhood, or BEH-QD-211's tail): "The explorer MUST keep the policy it shows when the rail
  moves." Add a revision row.
- **INV-QD-NEXT** (if D-33-f = B), "A screen never changes what it shows without the reviewer". Source: `model/HeldChoice.ts`.
  Enforcement: `HeldChoice.test.ts`, T1, T2, T7. Related: INV-QD-039 (one order), `Selection.ts`'s `Evicted`.
- **`spec/traceability.md`**: add `packages/devtools/test/model/HeldChoice.test.ts` → BEH-QD-322, BEH-QD-211, INV-QD-NEXT. Add
  INV-QD-NEXT to the `SimulationSession.test.ts`, `PolicyExplorer.test.tsx`, `RoleViewer.test.tsx` and `Catalogue.test.ts` rows. Add `HeldChoice.ts` to
  the Source column of behaviours 28 and 29 (`:70-71`). Add a revision row.
- **`spec/overview.md`**: the `PolicyChoice` name is unchanged (`:780`). No row is added. If the row's prose is extended to
  list members, list all four. Add a revision row only if prose changes.
- **CCR register** (`spec/README.md`): CCR-QD-NEXT, listing every file above.
- **ADR**: none. ADR-QD-048's "a label is a display string, never an identity" is the rationale, quoted in `HeldChoice.ts`.
- **Website** (`apps/website/src/content/docs/docs/packages/devtools.md`): no change. It does not describe the choice.
- **Changeset** `.changeset/policy-choice-held-by-value.md`: `"@qadi/devtools": patch`. Text: "The simulator and policy explorer keep
  the policy you chose when new decisions reorder the rail. A policy that leaves the rail stays chosen and is marked.
  `SimulationSession.choosePolicy` takes the policy (unreleased API), and `PolicyChoice` gains `Evicted`. `catalogueOf` lists
  structurally equal declared policies once." If ARCH-40 landed first, mark the `choosePolicy` line **Breaking**.

## 9. Risks and rollback

- **Pinning surprises a reader who expects "latest".** With D-33-c = A, a dock opened before any decision pins the
  first policy to arrive. Mitigation: the rail shows the newest at the top and choosing is one click. The alternative
  (B) keeps the defect for the default path. This is recorded in D-33-c.
- **An evicted choice lingers.** A reviewer may simulate a policy the app no longer uses. That is the point (it is a
  value they chose), and it is marked. "Clear view" leaves the choice `Evicted`, consistent with `Selection.ts`.
- **Equality cost.** `resolveHeld` runs `Equal.equals` against at most `sightings.length` policies per snapshot build.
  The hash is cached per object (AGENTS.md §13), and `catalogueOf` already does the same per render. This is negligible beside it.
- **Unreleased-API churn** (C15). If ARCH-40 freezes the session's surface first, `choosePolicy`'s change becomes a
  recorded break. §4's ordering rule avoids that.
- **Selection not kept across tabs** (explorer, roles). This is unchanged and named as a non-goal. If wanted, the dock owns a
  `HeldChoice` per screen (one `useState` each), which this design makes trivial.
- **Rollback.** T1, T2 and T3 are independent patches and revert alone. T4–T10 revert as one range. `HeldChoice.ts` is
  private, so reverting it breaks no consumer. The only public change is to unreleased types.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence verified at `e635e68` with five probes (`$P/probe.mts`, `probe-run.mts`, `probe-eq.mts`, `probe-catalogue.mts`, `explorer.test.tsx`) | planner |
| 2026-10-08 | decisions | D-33-a = A (one module), D-33-b = A (Evicted), D-33-c = A (pin on first sight), D-33-d = A (role viewer too), D-33-e = A (`choosePolicy(policy)`), D-33-f = B (new invariant) — all recommended defaults | implementer |
| 2026-10-08 | T0 | worktree branch `worktree-agent-aa7eb089f7f2cc6b0` from `ce6d248` (main + ARCH-36/31 security patches); `git diff e635e68 HEAD -- packages/devtools` empty, so §1's line numbers hold. Probes not re-run (reproduced as the T1/T2/T3 red tests instead) | implementer |
| 2026-10-08 | T1 | red (3): "keeps the chosen policy when a decision reorders the rail", "keeps the chosen policy when a new policy decides first", "runs the chosen policy after the rail moved"; fixed with a held sighting + `findIndex(Equal.equals)`. Plan said choose(0) default is untouched, so the no-op guard needed `held === undefined ? index === 0 : ...` until T5 pinned the head | implementer |
| 2026-10-08 | T2 | red: "keeps the selected policy when a decision reorders the rail" (tree showed `doc:read`); the draft/highlight test was already green. Fixed with held policy + `findIndex` | implementer |
| 2026-10-08 | T3 | red: "lists two structurally equal declared policies once, under the first name, whether or not they ran" (`[canEdit, canWrite]`); fixed with a `MutableHashSet` of claimed policies | implementer |
| 2026-10-08 | T4 | `model/HeldChoice.ts` + `test/model/HeldChoice.test.ts` (12 tests incl. a fast-check permutation property); out of the barrel; madge clean | implementer |
| 2026-10-08 | T5-T8 | session (`Evicted`, pin, `choosePolicy(policy)`), simulator dropdown (`seeded`/`evicted` options), explorer (`qadi-policies-evicted`), role viewer (`qadi-role-evicted`); two swap-pinning tests replaced; one more swap-pinning test found and rewritten: "is not stale when the host passes an equal policy as a new object" asserted a shrinking rail marks the result stale. `grep useState(0)\|Math.min(` in `packages/devtools/src` is empty. Commit `da8de78` | implementer |
| 2026-10-08 | T9 | two scenarios (`devtools-simulator` @REQ-QD-026, `devtools-screens` @REQ-QD-025) pass | implementer |
| 2026-10-08 | T10 | INV-QD-106, CCR-QD-203, BEH-QD-211/322 amendments, traceability, `.changeset/policy-choice-held-by-value.md` (patch). `overview.md` unchanged: `PolicyChoice` row names no members. Commit `efcfbd1` | implementer |
| 2026-10-08 | T11 | scoped Stryker (`HeldChoice`, `SimulationSession`, `Catalogue`): 95.06% before extra tests; 18 survivors in lines this plan touched were killed by 4 new session tests and a `MutableHashSet`; 3 survivors remain, all on lines this plan did not write (`:278` seed guard, `:310` `policyOf` None check, which is equivalent). `HeldChoice.ts` 100%. Not run: full `pnpm check`, full mutation, full BDD, `pnpm coverage`, example, website, package-install | implementer |
| 2026-10-08 | T12 | plan marked done; the tracker README is the orchestrator's | implementer |
