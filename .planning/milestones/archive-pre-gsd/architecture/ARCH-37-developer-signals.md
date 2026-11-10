---
id: ARCH-37
title: One developer-signals module in @qadi/react (every console write behind one sentence table and a replaceable reporter of one shape), and the meaning of each hydration drop reason stated once, in core, beside the union that defines the reasons
strength: Worth exploring   # from the 2026-10-07 architecture review (wave 4), card id="c8"
status: done
evidence_verified_at: e635e68
depends_on: []
blocks: [ARCH-43]           # ARCH-43's keep path (T2) routes the host-registry collision default through the module T5 builds
adrs_touched:
  - ADR-QD-041 (amend: the confinement point is renamed `DeveloperSignals.ts`, holds every console write in the library including `QadiProvider`'s three, and is enforced by a house-style rule rather than a convention; the "one occurrence is not yet a pattern" deferral in its Consequences is discharged)
  - ADR-QD-080 (constraint: the gate-id collision default stays a development-mode warning, replaceable by `onGateIdCollision`; the "host-built registry reports nowhere" asymmetry is ARCH-43's, not this plan's)
  - ADR-QD-052 (constraint: hydration metrics are declared in core and read by devtools through the shared metric object; the meaning table joins them there, it does not re-declare a metric)
  - ADR-QD-078 (constraint: the seven drop reasons and their whole-payload/per-entry split are unchanged; only their descriptions move)
  - ADR-QD-053 / ADR-QD-014 (constraint: `QadiProvider` keeps no decision in React state and touches no `AtomRegistry` scheduler knob; a reporter prop is read through a ref, never a state)
  - ADR-QD-037 (constraint: madge counts type-only edges; `DeveloperSignals.ts` imports no local module that imports it — today `HydrationWarning.ts` imports only `SeededDecision.ts`)
  - ADR-QD-099 (constraint: `DeveloperSignals.ts` stays out of the barrel; its public types are re-exported by name, as `HydrationWarning.ts`'s are today)
  - ADR-QD-034 (constraint: `Match`, built once at module scope; no `switch`, SWITCH_BUDGET unchanged)
  - ADR-QD-076 (constraint: `ignoreStatic: true`; core's table is static, so its rows are pinned by per-reason tests, not by mutation)
  - ADR-QD-038 (constraint: changesets, fixed version group; no release step)
packages: ["@qadi/core", "@qadi/react", "@qadi/devtools", "scripts (house style)"]
estimate: M   # ≈ 1½–2 days for T0–T10. Defect-and-docs path (T1 + T2) ≈ ½ day (S) and ships alone as patches
---

# ARCH-37 — One developer-signals module; the meaning of each drop reason lives in core

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68`. The review card (c8) cites `QadiProvider.tsx:89,270,308`,
`HydrationWarning.ts` (`explain`, the gate-id collision reporter), devtools'
`model/Hydration.ts` (`MEANINGS`) and core's `ClientHydrationDropReason`; every line below was
re-read at this SHA.

**Probe.** One throwaway vitest file, run outside the repo:
`scratchpad/wave4/ARCH-37/signals.test.tsx` with `scratchpad/wave4/ARCH-37/vitest.config.ts`
(happy-dom, `@qadi/core` aliased to `packages/core/src/index.ts`) and
`scratchpad/wave4/ARCH-37/node_modules` symlinked to `packages/react/node_modules`. The probe
imports `packages/react/src/index.ts` and `packages/devtools/src/model/Hydration.ts` by absolute
path. Command (re-runnable by T0):

```
S=/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-37
cd packages/react && ../../node_modules/.bin/vitest run --config $S/vitest.config.ts --root $S --disableConsoleIntercept 2>&1 | grep -A2 PROBE
```

Output (abridged):

```
PROBE instrument-in-production console.warn calls: 1 "[qadi] <QadiProvider instrument> is true outside development"
PROBE atoms-identity console.warn calls: 1 "[qadi] <QadiProvider>'s `atoms` prop changed identity after "
PROBE hand-built-gates console.warn calls: 1 "[qadi] <QadiProvider>'s `gates` was not built by makeGateReg"
PROBE UnsupportedPayloadVersion
  react  : [qadi] hydrateDecisions did not seed 0 decision(s): the payload's version is one this client does not read. …
  devtools: a payload version this client does not read — a deploy in flight, or mismatched releases
PROBE MalformedPayload
  react  : [qadi] hydrateDecisions did not seed 0 decision(s): the payload is not shaped like a dehydrated payload — not an object, no entries array, or an unrecognised key. …
  devtools: a payload that is not shaped like a dehydrated payload at all
```

Each of the three provider cases was rendered with an atom set built with **every reporter a
caller can supply today** (`onHydrationMismatch`, `onGateIdCollision`), and each still wrote to the
console.

| # | Claim (review card c8) | Verdict | At `e635e68` |
| - | ---------------------- | ------- | ------------ |
| C1 | ADR-QD-041 confines `console`/`process.env` to `HydrationWarning.ts`, but `QadiProvider.tsx` calls `console.warn` at ~:89, :270, :308 | **CONFIRMED (exact lines)** | `rg -n "\bconsole\.\|process\.env\|typeof process" packages/*/src`, excluding comment lines, prints exactly eight code lines: `HydrationWarning.ts:47` (`typeof process … process.env.NODE_ENV`), `:63`, `:92`, `:124`, `:225` (four `console.warn`), and `QadiProvider.tsx:89` (`warnInstrumentedInProduction`), `:270` (atoms identity changed, DA-06), `:308` (`gates` not built by `makeGateRegistry`). **`packages/devtools/src` has none**, and neither has any other package. ADR-QD-041 `:84-89` names the file; ADR-QD-080 `:68-69` calls it "the one console confinement point". |
| C2 | Those three warnings cannot be redirected through a supplied reporter, unlike the others | **CONFIRMED (probe)** | `QadiProviderProps` (`:164-227`) and `QadiAtomsOptions` have no hook for them. The four in `HydrationWarning.ts` each resolve `supplied ?? (isDevelopment() ? warnX : undefined)` (`:77-80`, `:107-110`, `:139-142`, `:245-248`). The provider's three call `console.warn` directly. The probe above shows one console write each, with every existing reporter supplied. |
| C3 | `QadiProvider` imports `isDevelopment` from a hydration-named module | **CONFIRMED** | `QadiProvider.tsx:42`: `import { isDevelopment } from "./HydrationWarning.ts"`. The provider's doc (`:80-84`) cites "`isDevelopment()` gates `HydrationWarning.ts`'s console warnings" as the precedent it then does not follow. |
| C4 | `HydrationWarning.ts` also holds the gate-id collision reporter | **CONFIRMED, and sanctioned** | `:82-110` (`GateIdCollisionReporter`, `warnGateIdCollision`, `gateIdCollisionReporter`). ADR-QD-080 put it there on purpose (`080-…md:66-70`). The file holds **four** reporters (mismatch, gate-id collision, dehydrate drop, hydrate drop). The card's diagram says "4 reporters + gate-id collision"; it is four including the collision. The point stands: the module's name says *hydration* and a quarter of it is not. |
| C5 | The meaning of each drop reason is written twice: react `explain` and devtools `MEANINGS`; core owns `ClientHydrationDropReason` | **CONFIRMED, with nuance** | Core: `HydrationMetrics.ts:46-48` (`DehydrationDropReason`, one case), `:63-98` (`ClientHydrationDropReason`, six), `:108` (`HydrationDropReason`), `:111-119` (`hydrationDropReasons`, seven values). React: `HydrationWarning.ts:173-218` (`explain`, a module-scope `Match` over the six client reasons) **and** `:123-129` (`warnDropped`, a third place: the `ForeignSubject` sentence). Devtools: `model/Hydration.ts:72-81` (`MEANINGS: Record<HydrationDropReason, string>`, seven) plus `isReason`/`meaningOf` (`:85-88`). **Nuance:** the two tables are not copies. Devtools' doc (`:68-70`) says they are deliberately different lengths for different readers: the console sentence names the *fix* for whoever caused it, the panel sentence is read beside a number. What is duplicated is the reason → meaning mapping, and it has already drifted: core says `MalformedPayload` also covers an envelope "nested past the depth guard outside its entries" (`HydrationMetrics.ts:91-92`, raised at `HydrationEngine.ts:331-332`), and react's sentence (`:212-216`) does not mention depth. |
| C6 | Stale docs: `HydrationWarning.ts` header and `HydrateOptions.onDropped` mention "four" silent exits and "an unregistered atom set", removed in overview 1.29 | **CONFIRMED, and wider than the card says** | Overview 1.29 (`spec/overview.md:13`, CCR-QD-156) records `ClientHydrationDropReason` losing `UnregisteredAtoms`. Still stale at HEAD: `HydrationWarning.ts:151-153` ("the four cases have four different causes … Two of them reject the payload whole": six client cases, three whole-payload), `:234` ("The third of this module's three": there are four), `:238-243` ("**four** silent exits … reach an unregistered atom set"); `HydrationEngine.ts:256-259` (`HydrateOptions.onDropped`: "an unregistered atom set is a wiring mistake"); `HydrationMetrics.ts:21-24` ("false for *these* four": five metrics are declared) and `:152` ("puts all five reasons": seven); devtools `model/Hydration.ts:112` ("puts all five in the map"); `packages/react/test/HydrationCounts.test.ts:7`, `:146` ("four ways"/"four exits"); `spec/behaviors/19-hydration.md` BEH-QD-230 ("Only the **two** whole-payload refusals seed nothing": three). |
| C7 | ADR-QD-041 says the confinement is "a convention, not a gate"; with two offending files, propose a `check-house-style.mjs` rule | **CONFIRMED, wording CHANGED** | ADR-QD-041 Consequences (`041-…md:157-161`): "The confinement above is a convention, not a gate … deliberately deferred: one occurrence is not yet a pattern worth a gate." There are two **files** using `console`, but one of them is the sanctioned one. So it is **one escape** (three call sites), which is exactly the drift the ADR predicted. `scripts/check-house-style.mjs` has no rule naming `console` or `process` (`RULES` `:118-284`). |
| C8 | *(found during verification)* A whole-payload refusal's warning says "did not seed **0** decision(s)" | **CONFIRMED (defect, probe)** | `HydrationEngine.ts:313-320`: `refuse(reason, entries, count = entries.length)` counts `count` but reports `{ reason, entries }`. The three whole-payload refusals (`:332`, `:340`, `:344`) pass `visible` (empty for a payload with no `entries` array) and `atLeastOne`. So the metric records **1** and the warning prints "hydrateDecisions did not seed 0 decision(s): the payload's version is one this client does not read." A developer reads "0" as "nothing was lost", and the counter beside it disagrees. **Test-first task: T1.** |
| C9 | *(found during verification)* The instrument-in-production latch is process state | **CONFIRMED (read)** | `QadiProvider.tsx:73` (`let warnedInstrumentedInProduction = false`) is module scope and has no reset. `QadiProvider.test.tsx:251-284` is the only test that can observe it, and only because it is the first in its file to render `instrument` under `NODE_ENV=production`. ADR-QD-080 removed `clearGatesUnsafe` for this same reason ("Tests shared process state"). Not a defect a user sees. It constrains T6 (D-37-c). |
| C10 | *(found during verification)* The third provider warning (`:308`) is asserted by no test | **CONFIRMED** | `rg -n "will not register\|not built by" packages/react/test` finds nothing. `GateRegistry.test.tsx:455-465` renders the hand-built case and asserts the absent marker, but does not spy on `console`. The line executes and no assertion pins it. |
| C11 | *(found during verification)* A stale house-style exemption | **CONFIRMED (orphan)** | `scripts/check-house-style.mjs:296-305` exempts `packages/react/src/settled.ts` from `no-raw-promise`. The file does not exist (`ls packages/react/src/settled.ts` → no such file; removed with CCR-QD-150's switch to `@effect/atom-react`). Nothing checks that an exemption names a real file. This is in scope only because T7 adds an exemption beside it (D-37-e(ii)). |

**Other facts the plan relies on.**

- **Public surface today** (`spec/overview.md:497-530`): `HydrationMismatch`, `HydrationMismatchReporter`
  (declared in `HydrationWarning.ts`, re-exported via `HydrationEngine.ts` → `QadiAtoms.ts`) and
  `HydrationDrop`, `HydrationDropReporter` (re-exported from `Hydration.ts:32`). `GateIdCollisionReporter`
  and `DroppedEntriesReporter` are not public. `scripts/check-api-surface.mjs:64-77` (`REEXPORT_FROM`)
  is what lets an out-of-barrel module publish types by name, and its doc comment names
  `HydrationWarning.ts`. Renaming the file changes two overview rows and that comment.
- **Tests that pin console text** (all `vi.spyOn(console, "warn")`): `Hydration.test.ts:203-230`,
  `:853`, `:990-1030`; `HydrationCounts.test.ts:363-406` (`"did not seed 1 decision(s)"`,
  `"version skew"`, `"different subject"`, `"version"`); `QadiProvider.test.tsx:252-284`
  (`"instrument"`), `:286-310` (`"atoms"`). Devtools' `model/Hydration.test.ts:89-131` pins
  `"version"`, `"dehydrated payload"`, `"not a reason this build knows"`, and one distinct non-empty
  sentence per reason.
- **Mutation scope:** `stryker.config.mjs` mutates `packages/core/src/**` (`ignoreStatic: true`).
  `stryker.devtools.mjs` mutates `packages/devtools/src/model/**`. `stryker.react.mjs` mutates only
  `DecisionOutcome.ts` and `QuestionBook.ts`, so `DeveloperSignals.ts` is not mutated (§7).
- **`isDevelopment`'s literal text is load-bearing** (`HydrationWarning.ts:35-47`, ADR-QD-041): bundlers
  substitute `process.env.NODE_ENV` exactly. It moves verbatim.

## 2. Goal and success criteria

**Goal.** Today a developer-facing signal from `@qadi/react` has two shapes. Four signals go through
`HydrationWarning.ts`: a default development warning, replaced outright by a caller's reporter that
then runs in production. Three signals in `QadiProvider.tsx` write to the console directly and cannot
be routed anywhere. Separately, the **meaning** of a hydration drop reason is a fact about core's
closed union, yet it is stated in two packages that cannot see each other's table, and the two have
started to disagree. This plan deepens two modules.

- **`DeveloperSignals.ts`** (renamed from `HydrationWarning.ts`, out of the barrel) becomes the one
  **module** behind which every console write in the library sits. Its interface is small: for each
  signal, a resolver `supplied ?? default`, where the default speaks only under its condition. Behind
  it are a closed internal union of every signal, one module-scope `Match.tagsExhaustive` that gives
  each its sentence, the single `console.warn` call, and `isDevelopment`. The **seam** is the reporter:
  a caller supplies `(payload) => void` and the module decides nothing else. **Locality:** a new
  signal is one compile error in one file. **Leverage:** `QadiProvider` gains the same seam as the
  other four signals, and the house-style gate can name one exempt file.
- **Core's `HydrationMetrics.ts`** gains the reason → meaning table beside `HydrationDropReason`:
  two sentences per reason (a panel `summary`, a console `remedy`), plus a type predicate for a
  metric key. React's console and devtools' panel become two **adapters** over one table, so a new
  reason or a reworded cause changes one row.

**Success criteria.**

1. `rg -n "\bconsole\s*\.|process\.env|typeof process" packages/*/src` prints only lines in
   `packages/react/src/DeveloperSignals.ts` (after T5/T6), and `node scripts/check-house-style.mjs`
   fails if any other `packages/*/src` file adds one (after T7).
2. Rendering `QadiProvider` with `onDeveloperSignal` supplied, in each of the three provider
   situations, calls the reporter once with `{ _tag: "InstrumentedInProduction" }`,
   `{ _tag: "AtomsReplaced" }` or `{ _tag: "UnwritableGateRegistry" }` respectively, and writes nothing to
   the console: `pnpm vitest run packages/react/test/QadiProvider.signals.test.tsx` (T6).
3. Without a reporter, every existing console-text assertion listed in §1 passes **unmodified**, except
   T1's deliberate change to whole-payload wording (T5, T6).
4. A whole-payload refusal's default warning does not contain `"did not seed 0"`. It says the payload
   was refused and names the reason's remedy: `pnpm vitest run packages/react/test/HydrationCounts.test.ts` (T1).
5. `hydrationDropMeaning`, `HydrationDropMeaning` and `isHydrationDropReason` are exported from
   `@qadi/core` and named in `spec/overview.md` (`node scripts/check-api-surface.mjs`). `rg -n "MEANINGS|isReason" packages/devtools/src`
   and `rg -n "const explain" packages/react/src` print nothing (T3–T5).
6. Each of the seven reasons has a non-empty, distinct `summary` and `remedy`, the table is exhaustive by
   type (a missing row is a compile error), and `MalformedPayload`'s remedy mentions the depth guard
   (T3).
7. None of the stale counts in C6 survives: `rg -n -i "unregistered atom set|four silent|third of this module|all five reasons|these four" packages/*/src spec/behaviors/19-hydration.md`
   prints nothing outside change-history blockquotes (T2).
8. `pnpm check` is green, including `stryker.config.mjs` and `stryker.devtools.mjs` at or above
   `break: 80`, `pnpm circular`, gate 13 and gate 4 (T9).

## 3. Non-goals

- **Rewording the console messages.** Every sentence moves byte for byte, except T1's whole-payload
  wording (a defect) and T3's `MalformedPayload` depth clause (a drift fix). Consumers grep for these.
- **Routing signals through `Effect.logWarning`.** ADR-QD-041 rejected it: detection happens inside
  `Atom.readable` derivations and pure server functions with no runtime. Unchanged.
- **An atom-set-wide catch-all reporter for every signal** (`QadiAtomsOptions.onDeveloperSignal`). Weighed
  in D-37-b(C) and not recommended: the provider cannot reach an atom set's reporter without a new public
  `QadiAtoms` member, and `dehydrateDecisions` has no atom set at all.
- **The gate override's collision default** (`makeGateRegistry()` reports collisions nowhere by default,
  while `atoms.gates` warns in development). That asymmetry belongs to the override, so it is ARCH-43's
  (its T2, which uses this plan's module).
- **Devtools' own DOM calls** (`Lens.ts`, `useLens.ts`). They are confined by ADR-QD-053's own rule, are
  not `console`/`process`, and the gate in T7 does not touch them.
- **Other packages' logging.** `@qadi/http`, `@qadi/audit` and core log through `Effect.log*`, which is
  not ambient and is not in scope.

## 4. Constraints

- **AGENTS.md §1.** Use `import * as Match from "effect/Match"` and `import * as Data from "effect/Data"`,
  with `.ts` relative imports. Devtools and react take named imports from `@qadi/core`.
- **§5a / ADR-QD-034.** Each signal's sentence comes from one module-scope `Match.type<DeveloperSignal>().pipe(Match.tagsExhaustive({...}))`.
  `explain`'s `Match.when … Match.exhaustive` is replaced, not kept beside it. No `switch`, so
  `SWITCH_BUDGET` is unchanged. Core's table is a `Record` over the closed union, not a `Match`: it is a
  constant per key, which is the argument devtools' doc already makes (`model/Hydration.ts:64-66`).
- **§6.** No `as`, `!` or `any`. A metric key arrives as `string`; narrowing goes through the new
  `isHydrationDropReason` type predicate, never a cast. No `Record<string, unknown>` widening (user
  preference): the table is `{ readonly [R in HydrationDropReason]: HydrationDropMeaning }`.
- **§9 / ADR-QD-099.** `DeveloperSignals.ts` stays out of `packages/react/src/index.ts`. New public types
  (`ProviderSignal`, `ProviderSignalReporter`) are re-exported by name from `QadiProvider.tsx`, the
  `REEXPORT_FROM` form gate 13 understands. `QadiProvider.tsx` is in the barrel, so
  `QadiProviderProps.onDeveloperSignal` is public by construction.
- **§13.** No decision in React state. The reporter prop is read through a `useRef` updated each render,
  so an inline callback does not re-run any effect. No `AtomRegistry` scheduler knob is touched.
- **ADR-QD-037 / `pnpm circular`.** `DeveloperSignals.ts` imports `@qadi/core`, `effect/*` and the leaf
  `SeededDecision.ts` (as `HydrationWarning.ts` does today). `QadiProvider.tsx` → `DeveloperSignals.ts`
  is a new runtime edge with no reverse edge. `HydrationEngine.ts` and `Hydration.ts` keep importing it,
  and it imports neither.
- **Closed union over widening (user preference).** `DeveloperSignal` is a full closed `Data.TaggedEnum`
  of every signal, and `ProviderSignal` is the closed sub-union of the three provider members. Adding a
  provider signal later means a new member in both and a sentence. It never means `ProviderSignal | "New"`.
- **ADR-QD-076.** Core's table is module-scope (static) and is ignored by mutation. Every row is pinned by
  per-reason tests (T3). The `Match` in react is not in a Stryker config (`stryker.react.mjs` mutates two
  other files), so its arms are pinned by T5's per-signal message table test.
- **Gate 13 (`node scripts/check-api-surface.mjs`).** New core exports and the new react types need rows.
  The two react rows that say "declared in `HydrationWarning.ts`" change.
- **Gate 4 (`node scripts/check-house-style.mjs`).** T7 changes a gate, which needs user sign-off
  (D-37-e). The rule runs on stripped lines (comments and strings blanked, `check-house-style.mjs:953-958`),
  so prose that mentions `console.warn` does not trip it.
- **ADR-QD-038.** Changesets: core minor, react minor, devtools patch. No release step.

## 5. Decisions needed before work starts

### D-37-a — What is the developer-signals module?

- **(A) Rename `HydrationWarning.ts` to `DeveloperSignals.ts` and make it the only console site.** One
  internal closed union `DeveloperSignal` (`Data.TaggedEnum`): `HydrationMismatch { mismatch }`,
  `GateIdCollision { id }`, `PayloadMixedSubjects { count }` (the dehydrate-side `ForeignSubject`),
  `HydrationDropped { reason, count, wholePayload }`, `InstrumentedInProduction {}`, `AtomsReplaced {}`,
  `UnwritableGateRegistry {}`. One module-scope `describeDeveloperSignal` (`Match.tagsExhaustive`)
  gives each its sentence. One `say(signal)` is the only `console.warn`. The existing four resolvers keep
  their names, signatures and semantics, and each default becomes `(payload) => say(Ctor(payload))`.
- **(B) Keep `HydrationWarning.ts` for hydration, add `ProviderWarning.ts` for the provider.** This gives
  two confinement points. It names each file well, but it is the "boundary dissolving into convention"
  ADR-QD-041 argues against, and the gate would need two exemptions.
- **(C) Leave the module as it is and move only the three provider writes into it.** This is the minimal
  fix. The name keeps lying, and each sentence stays a free-standing function with no exhaustive table.

**Recommendation: (A).** It is the complete form. Every signal is one union member with one sentence,
and the name says what the module is. `status: decided (2026-10-08, recommended default)`

### D-37-b — How does a caller redirect the three provider signals?

- **(A) `QadiProviderProps.onDeveloperSignal?: ProviderSignalReporter`**, where
  `ProviderSignal = InstrumentedInProduction | AtomsReplaced | UnwritableGateRegistry` (closed, public
  type) and `ProviderSignalReporter = (signal: ProviderSignal) => void`. Supplied, it replaces the console
  default for all three and runs in production, the same rule as the other four. The provider detects
  all three, so the provider is where the hook belongs. It is read through a ref, so an inline callback
  costs nothing.
- **(B) Three separate props** (`onInstrumentedInProduction`, `onAtomsReplaced`, `onUnwritableGates`).
  These are more granular. They add three props for three rare situations, and a host routing to
  telemetry writes the same function three times.
- **(C) (A) plus an atom-set catch-all `QadiAtomsOptions.onDeveloperSignal`** receiving every
  atom-scoped `DeveloperSignal`. The provider cannot read an atom set's options without a new public
  `QadiAtoms` member, which breaks every hand-written `QadiAtoms` double (ADR-QD-080's precedent:
  `Hydration.test.ts:621` builds one). It would also be a second way to silence the mismatch warning,
  beside `onHydrationMismatch`. `dehydrateDecisions` has no atom set, so the catch-all would still not be
  "all".

**Recommendation: (A).** It is additive and non-breaking. (C) is more surface, it is breaking for doubles,
and it cannot be complete, which is a real reason rather than a preference for less. `status: decided (2026-10-08, recommended default)`

### D-37-c — How often does `InstrumentedInProduction` speak?

- **(A) Default: once per process (today's latch, moved into `DeveloperSignals.ts`). A supplied reporter is
  called once per provider mount** (a `useRef` latch), and the host aggregates. The production console
  sees one line, as ticket 153 chose. The latch test moves to its own file, so vitest's per-file
  isolation gives it a fresh module (C9).
- **(B) Once per provider mount for both.** This removes module state entirely, but a page with three
  instrumented providers prints three production lines, which reverses ticket 153's choice.
- **(C) Once per atom set** (a `WeakSet` keyed on the atom set, in the module). It is closer to ADR-QD-080's
  scoping, but it is another side table keyed on identity, and a spread copy counts as a new set.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-37-d — Where does the reason → meaning table live, and in what shape?

- **(A) Core, `HydrationMetrics.ts`, beside the union:**
  `export interface HydrationDropMeaning { readonly summary: string; readonly remedy: string }`,
  a module-private `const MEANINGS: { readonly [R in HydrationDropReason]: HydrationDropMeaning }`,
  `export const hydrationDropMeaning = (reason: HydrationDropReason): HydrationDropMeaning`, and
  `export const isHydrationDropReason = (word: string): word is HydrationDropReason`. `summary` is today's
  devtools sentence and `remedy` is today's react sentence (the `ForeignSubject` remedy is `warnDropped`'s
  text), both moved verbatim. `MalformedPayload`'s remedy gains the depth-guard clause (C5).
- **(B) One sentence per reason.** This loses either the panel's brevity or the console's fix. Devtools
  documents why those differ (`model/Hydration.ts:68-70`).
- **(C) Core holds only `summary`, and react keeps its remedy table.** The duplication of the mapping is
  halved, not removed, and the two can still drift apart (C5 is that drift).
- **(D) A new core module `HydrationDropMeaning.ts`.** It gives the same content with less locality to the
  union.

**Recommendation: (A).** It is exported as a function plus the interface, not the raw record, so the table
can grow fields without a breaking change to a consumer's indexing. `status: decided (2026-10-08, recommended default)`

### D-37-e — Gate the confinement? (gate change: needs user sign-off)

- **(i) A plain house-style rule `no-ambient-console`**, `re: /\bconsole\s*\.|\bprocess\.env\b|\btypeof\s+process\b/`,
  over `packages/*/src` (not `testScope`: tests spy on `console` legitimately), with
  `EXEMPTIONS["packages/react/src/DeveloperSignals.ts"] = ["no-ambient-console"]`. It is a plain rule, not
  a budget: zero exceptions outside the one file. Message: "Developer signals go through
  `@qadi/react`'s `DeveloperSignals.ts` (ADR-QD-041); a library module never writes to the console or reads
  `process.env`."
- **(ii) Also: an exemption must name a file that exists.** A check after the `sources` loop fails for any
  `EXEMPTIONS` key with no file on disk, and the stale `settled.ts` entry (C11) is deleted in the same edit.
  Without it, renaming `DeveloperSignals.ts` later would leave a dead exemption and silently ungate the
  new name.
- **(iii) No gate.** ADR-QD-041's own trigger ("one occurrence is not yet a pattern") has fired: the second
  file arrived through review (DA-06, ticket 153) and nobody noticed.

**Recommendation: (i) + (ii).** AGENTS.md §15's standard is "gated, not remembered". ARCH-25's
`no-refusal-annotation-outside-core` is the precedent for a zero-exception rule with one exempt file. `status: decided (2026-10-08, recommended default (i)+(ii)) — gate change and AGENTS.md section 6 row still want maintainer review`

### D-37-f — A new ADR, or an amendment?

- **(A) Amend ADR-QD-041** with a dated amendment block: the module name, the provider's three signals and
  their reporter, the gate, and the Consequences paragraph superseded in a blockquote (original kept).
  ADR-QD-080's and ADR-QD-052/053/078's mentions of `HydrationWarning.ts` are history and stay. ADR-QD-080
  gets one revision-row note.
- **(B) A new ADR-QD-NEXT,** "Developer signals have one module".

**Recommendation: (A).** This refines an accepted decision. It does not make a new one. `status: decided (2026-10-08, recommended default)`

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done (2026-10-08)
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/37-developer-signals main`. Record `git rev-parse --short HEAD` in §10.
  2. `git diff --stat e635e68 HEAD -- packages/react/src packages/devtools/src/model/Hydration.ts packages/core/src/HydrationMetrics.ts scripts/check-house-style.mjs`.
     If anything moved, update §1's line numbers before starting.
  3. Re-run §1's probe with the command in §1 (re-create the `node_modules` symlink and config if the
     scratchpad was cleaned: `ln -sfn <repo>/packages/react/node_modules $S/node_modules`). Expect three
     `console.warn calls: 1` lines and two `did not seed 0` lines.
  4. `rg -n "\bconsole\.|process\.env|typeof process" packages/*/src`. Expect C1's eight code lines.
  5. Check whether ARCH-43 (D-43-a) or ARCH-34 has landed: `git log --oneline main -- packages/react/src/QadiProvider.tsx packages/react/src/GateWriter.ts`.
     If ARCH-43's delete path landed, drop `UnwritableGateRegistry` from T5/T6. If ARCH-34 landed, re-read
     `QadiProvider.tsx` before T6.
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §1 is re-confirmed or corrected in §10.

### T1 — Test-first: a whole-payload refusal does not say "did not seed 0 decision(s)" (defect C8)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0. No decision.
- **Files:** `packages/react/test/HydrationCounts.test.ts`, `packages/react/src/HydrationWarning.ts`,
  `packages/react/src/HydrationEngine.ts`.
- **Steps:**
  1. In `HydrationCounts.test.ts`, beside `"names a different cause for each reason"` (`:378`), add
     `it("a refused payload says the payload was refused, not that zero decisions were lost")`. Spy on
     `console.warn`, then call `hydrateDecisions(atoms, JSON.parse('{"version":3,"subjectId":"u1","entries":[]}'), alice)`
     and `hydrateDecisions(atoms, JSON.parse("42"), alice)`. For each message, assert
     `not.toContain("did not seed 0")` and `toContain("refused the payload")`. Run it and confirm it is
     **red**.
  2. Add a second assertion in the same test: the per-entry form is unchanged. The existing `undecodable`
     payload still yields `"did not seed 1 decision(s)"` (the `:369` assertion stays as it is).
  3. Fix, minimally. Add `readonly wholePayload: boolean` to `HydrationDrop<A>` (`HydrationWarning.ts:155-158`).
     This is a **public** type, so it is an additive field for a reader. A hand-built `HydrationDrop`
     literal in a consumer's test would need the field, and T8's changeset says so. In
     `HydrationEngine.ts:313-320`, `refuse` takes a fourth parameter `wholePayload: boolean`. The three
     payload-level call sites (`:332`, `:340`, `:344`) and both `PayloadSubjectMismatch` sites
     (`:355`, `:364`) pass `true`, and the three per-entry sites (`:404-406`) pass `false`.
     `warnHydrationDrop` (`:220-229`) says
     `` `[qadi] hydrateDecisions refused the payload (${drop.entries.length} decision(s) in it): ${explain(drop.reason)}. …` ``
     when `wholePayload`, and the current sentence otherwise.
  4. Check that `HydrationCounts.test.ts:378-391` (`"different subject"`, `"version"`) and
     `Hydration.test.ts`'s console assertions pass unmodified. `PayloadSubjectMismatch` is now whole-payload
     wording, and both still contain their substrings. Check this; if any substring breaks, the test was
     pinning the defect, so update it and say so in §10.
- **Tests:** one new test, red first.
- **Verify:** `pnpm vitest run packages/react/test/HydrationCounts.test.ts packages/react/test/Hydration.test.ts packages/react/test/HydrationEngine.test.ts packages/react/test/HydrationPayload.test.ts`; `pnpm test:tstyche`.
- **Done when:** green. This can ship alone as an `@qadi/react` patch: "a refused payload's warning no longer
  reports zero lost decisions; `HydrationDrop` gains `wholePayload`".

### T2 — Correct the stale counts and the "unregistered atom set" (C6)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0. No decision.
- **Files:** `packages/react/src/HydrationWarning.ts` (`:151-153`, `:234`, `:238-243`),
  `packages/react/src/HydrationEngine.ts` (`:256-266`), `packages/core/src/HydrationMetrics.ts` (`:21-24`,
  `:152`), `packages/devtools/src/model/Hydration.ts` (`:112`), `packages/react/test/HydrationCounts.test.ts`
  (`:7`, `:146`), `spec/behaviors/19-hydration.md` (BEH-QD-230 "Only the two whole-payload refusals").
- **Steps:**
  1. Rewrite each sentence so it **names no count**. Point instead at `hydrationDropReasons` /
     `ClientHydrationDropReason`, which is what made these counts rot four times. Example for
     `HydrationWarning.ts:151-153`: "The reason is carried because each has a different cause and a
     different fix, and a bare count cannot tell them apart. The payload-level ones
     (`PayloadSubjectMismatch`, `UnsupportedPayloadVersion`, `MalformedPayload`) reject the payload whole, so
     `entries` is then every entry in it."
  2. `HydrateOptions.onDropped`: delete "an unregistered atom set is a wiring mistake".
  3. `HydrationWarning.ts:234-243`: "one of this module's reporters, the same shape as the others". In the
     history sentence, say hydration "had silent exits", and name the current set by reference.
  4. `HydrationMetrics.ts:21-24`: "for these metrics". `:152`: "puts every reason in `hydrationDropReasons`
     in the snapshot at zero". Devtools `:112` likewise.
  5. BEH-QD-230: "Only the whole-payload refusals (`PayloadSubjectMismatch`, `UnsupportedPayloadVersion`,
     `MalformedPayload`) seed nothing". Edit in place with an `> **Corrected in CCR-QD-NEXT.**` blockquote
     keeping the old sentence, as that document does for every correction.
- **Tests:** none (comments and prose). The test-file comments at `HydrationCounts.test.ts:7, :146` change
  with no assertion change.
- **Verify:** criterion 7's `rg`; `node scripts/check-doc-examples.mjs`; `pnpm spec:verify:strict`.
- **Done when:** the `rg` is clean. This can ship alone (docs only, no changeset needed: no published
  behavior changes).

### T3 — Core: the reason → meaning table beside the union (D-37-d)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0, D-37-d (= A)
- **Files:** `packages/core/src/HydrationMetrics.ts`, `packages/core/test/HydrationMetrics.test.ts`,
  `packages/core/test/HydrationMetrics.tst.ts` (*new*), `spec/overview.md` (rows only; the rest is in T8).
- **Steps:**
  1. After `hydrationDropReasons` (`:111-119`), add:
     - `export interface HydrationDropMeaning { readonly summary: string; readonly remedy: string }`.
       Doc: one-line summary, then: `summary` is read beside a count on a panel by someone who may not have
       caused it; `remedy` is read once by whoever caused it and names the fix. Neither names an entry's
       contents (BEH-QD-230).
     - A module-private `const MEANINGS: { readonly [R in HydrationDropReason]: HydrationDropMeaning }`
       with seven rows. `summary` = devtools' `MEANINGS[reason]` verbatim (`model/Hydration.ts:73-80`).
       `remedy` = react's `explain` arm verbatim (`HydrationWarning.ts:179-215`) for the six client reasons.
       `ForeignSubject`'s remedy = `warnDropped`'s cause clause ("a payload mixing subjects has no safe
       reading, so the others were discarded — check what fed this call"). `MalformedPayload`'s remedy
       gains ", or nested past the structural depth guard" after "an unrecognised key" (C5).
     - `export const hydrationDropMeaning = (reason: HydrationDropReason): HydrationDropMeaning => MEANINGS[reason]`.
     - `export const isHydrationDropReason = (word: string): word is HydrationDropReason => hydrationDropReasons.some((one) => one === word)`
       (moved from devtools' `isReason`).
  2. Tests in `HydrationMetrics.test.ts`, a new `describe("what each reason means")`:
     - a table written out by hand (**not** read from `hydrationDropReasons`, for the reason
       devtools' `:94-95` gives) of seven reasons, each with one pinned substring of `summary` and one of
       `remedy` (for example `UndecodablePolicy`: `"version skew"` / `"did not decode"`;
       `MalformedPayload`: `"dehydrated payload"` / `"depth guard"`);
     - every `summary` and every `remedy` is non-empty, and the seven of each are distinct;
     - `isHydrationDropReason` is true for the seven and false for `"SomethingElse"`, `""` and
       `"UnregisteredAtoms"` (the removed reason).
  3. `HydrationMetrics.tst.ts`: `expect<Parameters<typeof hydrationDropMeaning>[0]>().type.toBe<HydrationDropReason>()`,
     and a `@ts-expect-error` that `hydrationDropMeaning("UnregisteredAtoms")` does not compile.
- **Tests:** as above.
- **Verify:** `pnpm vitest run packages/core/test/HydrationMetrics.test.ts`; `pnpm test:tstyche`; `pnpm circular`.
- **Done when:** green. `HydrationMetrics.ts` still imports only `effect/Metric`.

### T4 — Devtools reads the meaning from core
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3
- **Files:** `packages/devtools/src/model/Hydration.ts`, `packages/devtools/test/model/Hydration.test.ts`.
- **Steps:**
  1. Delete `MEANINGS` (`:61-81`) and `isReason` (`:85-86`). `meaningOf` becomes
     `(word: string): string => isHydrationDropReason(word) ? hydrationDropMeaning(word).summary : UNRECOGNISED`.
     Imports: `hydrationDropMeaning`, `isHydrationDropReason` from `@qadi/core`. `hydrationDropReasons` is no
     longer imported if unused.
  2. Update `HydrationDrops.meaning`'s doc: "`summary` from `@qadi/core`'s `hydrationDropMeaning`".
  3. `model/Hydration.test.ts:89-131` stays **unmodified** and must pass: the panel text is byte-identical.
- **Tests:** none added. The existing devtools tests are the regression net.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Hydration.test.ts packages/devtools/test/react/QuestionsPanel.test.tsx`; `rg -n "MEANINGS|isReason" packages/devtools/src` is empty.
- **Done when:** green and the grep is empty.

### T5 — React: `HydrationWarning.ts` becomes `DeveloperSignals.ts`, one union and one sentence table (D-37-a)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1, T3, D-37-a (= A)
- **Files:** `packages/react/src/HydrationWarning.ts` → `packages/react/src/DeveloperSignals.ts` (`git mv`),
  `packages/react/src/Hydration.ts`, `packages/react/src/HydrationEngine.ts`, `packages/react/src/QadiAtoms.ts`,
  `packages/react/src/QadiProvider.tsx` (import only), `packages/react/src/GateRegistry.ts` (comments `:66-68`,
  `:95-97`), `packages/react/src/SeededDecision.ts` and `HydrationCounts.ts` (comments), `packages/devtools/src/react/Lens.ts:8` (comment),
  `scripts/check-api-surface.mjs:74` (comment), `packages/react/test/DeveloperSignals.test.ts` (*new*).
- **Steps:**
  1. `git mv packages/react/src/HydrationWarning.ts packages/react/src/DeveloperSignals.ts`. Update every
     importer (`rg -l "HydrationWarning" packages/react/src`).
  2. Module doc: a one-line summary ("Every developer-facing signal `@qadi/react` can raise, and the one
     place any of them reaches the console."), then the ADR-QD-041 rationale (kept), then the resolution
     rule: a supplied reporter replaces the default outright and runs in production. The default speaks
     only under its condition: development for six signals, production for `InstrumentedInProduction`.
  3. Declare the internal `type DeveloperSignal = Data.TaggedEnum<{ … }>` with D-37-a(A)'s seven members,
     and `const DeveloperSignal = Data.taggedEnum<DeveloperSignal>()`. `HydrationMismatch` carries the
     `HydrationMismatch` interface value. To avoid a name clash, call the union member `SeedSuperseded`;
     the public `HydrationMismatch` type keeps its name.
  4. `const describe: (signal: DeveloperSignal) => string = Match.type<DeveloperSignal>().pipe(Match.tagsExhaustive({ … }))`.
     Each arm returns **today's exact string** (`warnMismatch`, `warnGateIdCollision`, `warnDropped`,
     `warnHydrationDrop` with T1's two forms). The two hydration-drop arms read
     `hydrationDropMeaning(reason).remedy` from core. Add the three provider sentences copied from
     `QadiProvider.tsx:90-93`, `:271-276`, `:309-310`.
  5. `const say = (signal: DeveloperSignal): void => { console.warn(describe(signal)); }` is the module's
     only `console` reference. Each existing `warnX` becomes a one-line `say(DeveloperSignal.X(…))`, and
     the four exported resolvers keep their signatures.
  6. Delete `explain`.
  7. Tests in `DeveloperSignals.test.ts`: one table test with a row per member, which spies on
     `console.warn`, calls the default for that signal, and asserts the exact message. This pins every
     `Match` arm, because `stryker.react.mjs` does not mutate this file (§7).
  8. Confirm the console assertions listed in §1 pass unmodified.
- **Tests:** `DeveloperSignals.test.ts` (*new*), seven rows.
- **Verify:** `pnpm vitest run packages/react/test`; `pnpm typecheck`; `pnpm circular`; `rg -n "HydrationWarning" packages/*/src scripts` → none.
- **Done when:** green. Every console write in `packages/react/src` other than `QadiProvider`'s three (T6) is
  `DeveloperSignals.ts:say`.

### T6 — `QadiProvider`'s three signals through the module, with a reporter (D-37-b, D-37-c)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T5, D-37-b (= A), D-37-c (= A)
- **Files:** `packages/react/src/DeveloperSignals.ts`, `packages/react/src/QadiProvider.tsx`,
  `packages/react/test/QadiProvider.signals.test.tsx` (*new*),
  `packages/react/test/QadiProvider.production.test.tsx` (*new*; the ticket-153 test moves here),
  `packages/react/test/QadiProvider.test.tsx`, `packages/react/test/GateRegistry.test.tsx`.
- **Steps:**
  1. In `DeveloperSignals.ts`, export:
     `export type ProviderSignal = Extract<DeveloperSignal, { readonly _tag: "InstrumentedInProduction" | "AtomsReplaced" | "UnwritableGateRegistry" }>`,
     `export type ProviderSignalReporter = (signal: ProviderSignal) => void`, and
     `export const providerSignalReporter = (supplied: ProviderSignalReporter | undefined): ProviderSignalReporter => supplied ?? sayProviderSignal`.
     The default applies each signal's **own** condition inside the module: `InstrumentedInProduction` only
     when `!isDevelopment()` and only once per process (the latch moves here from `QadiProvider.tsx:73`,
     D-37-c(A)); the other two only when `isDevelopment()`. The constructors the provider needs
     (`providerSignal.instrumentedInProduction()` and the other two) are exported from this module, and the
     barrel never reaches it.
  2. In `QadiProvider.tsx`: add the prop `readonly onDeveloperSignal?: ProviderSignalReporter` to
     `QadiProviderProps`. Doc: what it receives, that it replaces the console default, that it runs in
     production, that it is read through a ref, and the D-37-c cadence. Re-export the two types by name:
     `export type { ProviderSignal, ProviderSignalReporter } from "./DeveloperSignals.ts"`.
  3. Hold `const signalRef = useRef(onDeveloperSignal); signalRef.current = onDeveloperSignal;` and
     `const report = (s: ProviderSignal) => providerSignalReporter(signalRef.current)(s)`. Replace `:86-95`
     and `:302-304` with an effect that, when `instrument`, calls `report(instrumentedInProduction())`
     once per mount (a `useRef` latch when supplied; the module's process latch covers the default).
     Replace `:268-278` with `report(atomsReplaced())`. The dev condition moves into the module. Replace
     `:306-313` with `report(unwritableGateRegistry())` under `instrument && gateWriterFor(gates) === undefined`.
  4. Delete `warnedInstrumentedInProduction`, `warnInstrumentedInProduction` and the `isDevelopment`
     import. `QadiProvider.tsx` now has no `console`.
  5. Move `QadiProvider.test.tsx:251-284` (`"instrument in a production bundle"`) to
     `QadiProvider.production.test.tsx`, unmodified. It is alone in its file, so the process latch is
     fresh (vitest isolates per file).
  6. New `QadiProvider.signals.test.tsx`, test-first for the reporter: three tests, one per signal, each
     rendering with `onDeveloperSignal={(s) => seen.push(s)}` and a `console.warn` spy. Assert
     `seen.map((s) => s._tag)` and `warn` not called. Add a fourth for an inline reporter that changes
     identity each render: it does not re-fire `AtomsReplaced` (the ref, not the effect deps). Add a fifth
     for `UnwritableGateRegistry` **without** a reporter, which writes the console once (closes C10).
  7. In `GateRegistry.test.tsx:455-465`, add `onDeveloperSignal` to the hand-built case and assert it
     received `UnwritableGateRegistry`, so the case is pinned by an assertion and not only by execution.
- **Tests:** five new tests, red-first against the absent prop (a `@ts-expect-error`-free compile error is
  the first red; then the behavior).
- **Verify:** `pnpm vitest run packages/react/test`; `rg -n "console|process\.env" packages/react/src/QadiProvider.tsx` → comments only; `pnpm typecheck`; `pnpm circular`.
- **Done when:** green, and criterion 1's `rg` prints only `DeveloperSignals.ts` lines.

### T7 — Gate the confinement (D-37-e; gate change)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T6, D-37-e (user sign-off)
- **Files:** `scripts/check-house-style.mjs`.
- **Steps:**
  1. Add `{ id: "no-ambient-console", re: /\bconsole\s*\.|\bprocess\.env\b|\btypeof\s+process\b/, message: … }`
     to `RULES` (after `no-ambient-uuid`, `:163-167`, its nearest sibling). It is not `raw`: it runs on the
     stripped line, so comments and strings never match. It is not `testScope`.
  2. Add `"packages/react/src/DeveloperSignals.ts": ["no-ambient-console"]` to `EXEMPTIONS` (`:296`), with
     the ADR-QD-041 reason in a comment.
  3. D-37-e(ii): after the `sources` loop, for each `EXEMPTIONS` key, `statSync(join(ROOT, key))` inside a
     try/catch. A missing file is a failure: `` `${key}  [stale-exemption] names no file; delete the entry or fix the path` ``.
     Delete the `packages/react/src/settled.ts` entry (C11).
  4. Prove both. Temporarily add `console.warn("x")` to `QadiProvider.tsx`, run the script, see it fail, and
     revert. Temporarily rename the exemption key, see `stale-exemption` fail, and revert. Record both in §10.
  5. Update the header comment's rule inventory if it enumerates rules (it enumerates budgets: add one
     sentence naming `no-ambient-console` and the exemption-existence check).
  6. AGENTS.md §6's "Forbidden" table would gain a row (`console.*` / `process.env` → `DeveloperSignals.ts`).
     That edit needs the maintainer's approval. If it is declined, the rule's comment carries the sentence.
- **Verify:** `node scripts/check-house-style.mjs`.
- **Done when:** the script passes on the branch and fails on both probes.

### T8 — Spec, ADR, overview, traceability, CCR, docs, changeset
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1–T7
- **Files:** `spec/decisions/041-a-mismatch-is-announced.md`, `spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md`
  (revision row only), `spec/behaviors/09-react.md` (BEH-QD-067), `spec/behaviors/19-hydration.md`
  (BEH-QD-230, BEH-QD-231), `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`,
  `spec/README.md` (CCR register), `packages/react/README.md`, `apps/website/src/content/docs/docs/packages/react/hydration.md` and
  `apps/website/src/content/docs/docs/concepts/hydration-reactivity.md` (the two pages documenting `onHydrationMismatch`),
  `.changeset/*` (*new*).
- **Steps:** every edit is listed in §8. Then:
  1. `node scripts/check-api-surface.mjs` (gate 13).
  2. `node scripts/check-doc-examples.mjs`, because BEH-QD-067's `ts` fence gains `onDeveloperSignal`.
  3. Changesets: `@qadi/core` minor (`hydrationDropMeaning`, `HydrationDropMeaning`, `isHydrationDropReason`);
     `@qadi/react` minor (`QadiProviderProps.onDeveloperSignal`, `ProviderSignal`, `ProviderSignalReporter`,
     `HydrationDrop.wholePayload`, the whole-payload wording); `@qadi/devtools` patch (meanings read from core,
     text unchanged).
- **Verify:** `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates`.
- **Done when:** all four pass.

### T9 — Full gate
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T1–T8
- **Files:** none.
- **Steps:**
  1. `pnpm check`. In the mutation stage: core gains `hydrationDropMeaning` (one line) and
     `isHydrationDropReason`; the table itself is static and ignored. T3's tests kill the predicate's
     mutants (`some` → `every`, `===` → `!==`). Devtools loses `isReason` and `MEANINGS`; `meaningOf`'s
     ternary stays covered by `model/Hydration.test.ts:111-122`.
  2. A survivor is either a missing test (add it) or a finding recorded in §10, never suppressed (ADR-QD-076).
- **Verify:** `pnpm check`.
- **Done when:** green.

### T10 — Update the tracker
- **Status:** [x] done (2026-10-08)
- **Depends on:** T9
- **Files:** `.planning/architecture/ARCH-37-developer-signals.md`.
- **Steps:** set `status: implemented`, tick the tasks, record commit SHAs and the assigned CCR/ADR numbers
  in §10, and hand the README row to the orchestrator.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-37-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Replace, don't layer.** Whether a reason's meaning is right is tested **once**, in core
  (`HydrationMetrics.test.ts`, T3: per-reason substrings, distinctness, exhaustiveness by type). The react
  console tests and devtools panel tests keep asserting what is theirs: that the adapter shows the sentence
  at all, in its own frame ("did not seed N" / the panel row). They stay unmodified through T4–T6 as the
  byte-identity net. After T9 the duplicated per-reason substring checks in react
  (`HydrationCounts.test.ts:378-391`) may be trimmed to one reason, at the implementer's discretion.
- **New:** T1 (whole-payload wording, red-first), T3 (meaning table + type test), T5 (seven-row message
  table, which is what pins the `Match` arms in an unmutated file), T6 (five reporter tests; the production
  latch test isolated in its own file).
- **Moved:** `QadiProvider.test.tsx`'s `"instrument in a production bundle"` moves to
  `QadiProvider.production.test.tsx`, unmodified.
- **Mutation:** `stryker.config.mjs` (core) covers `hydrationDropMeaning`/`isHydrationDropReason`.
  `stryker.devtools.mjs` covers the slimmer `meaningOf`. `stryker.react.mjs` is unchanged: widening it to
  `DeveloperSignals.ts` is possible, but the file decides nothing (ADR-QD-093's scoping argument), so T5's
  exact-message table is the guard instead.
- **Property:** none needed. The domain is a seven-value closed union, enumerated by hand.

## 8. Spec and documentation updates

- **ADR-QD-041:** a dated amendment block (CCR-QD-NEXT). The confinement module is `DeveloperSignals.ts`;
  it holds every developer signal `@qadi/react` raises, including `QadiProvider`'s three
  (`InstrumentedInProduction`, `AtomsReplaced`, `UnwritableGateRegistry`), each replaceable through
  `QadiProviderProps.onDeveloperSignal`. The confinement is now enforced by `no-ambient-console` (gate 4).
  The Consequences bullet "a convention, not a gate … deliberately deferred" is kept in a
  `> **Superseded in CCR-QD-NEXT.**` blockquote. Add a revision row (1.3).
- **ADR-QD-080:** a revision row only. The default collision reporter now lives in `DeveloperSignals.ts`.
  The body is history and stays.
- **BEH-QD-067** (`09-react.md`): the `ts` signature fence gains `readonly onDeveloperSignal?: ProviderSignalReporter`.
  It gains a REQUIREMENT: "Each signal the provider raises — instrumentation in a production bundle, an
  `atoms` prop replaced after mount, an unwritable gate registry under instrumentation — MUST go to
  `onDeveloperSignal` when supplied, which then runs in production, and otherwise to a default warning
  under that signal's own condition. The provider MUST NOT write to the console itself." It also records
  the D-37-c cadence.
- **BEH-QD-230** (`19-hydration.md`): T2's correction. A REQUIREMENT for T1: "A refusal of the whole
  payload MUST be announced as a refusal of the payload, and MUST NOT report zero lost decisions."
  `HydrationDrop` in the fence gains `wholePayload`. A sentence: each reason's meaning is
  `@qadi/core`'s `hydrationDropMeaning(reason)`, whose `remedy` the default warning prints.
- **BEH-QD-231/232:** a sentence that the panel's per-reason sentence is `hydrationDropMeaning(reason).summary`.
- **Invariants:** INV-QD-045 (`spec/invariants.md:1767`, "No entry leaves hydration unaccounted for") gains `DeveloperSignals.ts` and T1's test in Source/Enforcement. No new invariant: "every console write
  goes through one module" is enforced by the gate, which is a house-style rule, not a behavior invariant.
- **`spec/overview.md`** (gate 13): in core's hydration table (`:281-284`), add `hydrationDropMeaning`,
  `isHydrationDropReason` (function) and `HydrationDropMeaning` (type), all `HydrationMetrics.ts`. In
  react's table (`:513`, `:528`), "declared in `HydrationWarning.ts`" becomes `DeveloperSignals.ts`. Add
  `ProviderSignal`, `ProviderSignalReporter` (type, re-exported from `./DeveloperSignals.ts`, `QadiProvider.tsx`).
  Add a revision row.
- **Traceability:** rows for `DeveloperSignals.test.ts` and `QadiProvider.signals.test.tsx` → BEH-QD-067,
  BEH-QD-152, BEH-QD-230. Add `HydrationMetrics.test.ts` → BEH-QD-230/231 (meaning). The 19-hydration
  row's file list (`traceability.md:61`) has `HydrationWarning.ts` renamed.
- **CCR register** (`spec/README.md`): CCR-QD-NEXT listing every file above.
- **Docs:** `packages/react/README.md` and the website's `packages/react/hydration.md` (plus `concepts/hydration-reactivity.md`) document `onDeveloperSignal` beside
  `onHydrationMismatch`, with a two-line example routing all three to telemetry.
- **Changeset:** as in T8.

## 9. Risks and rollback

- **A consumer greps a console message.** All messages are byte-identical except the whole-payload wording
  (T1, a fix) and `MalformedPayload`'s depth clause. The changeset names both.
- **`HydrationDrop.wholePayload` is a new required field** on a public type. A consumer reading it is
  unaffected. A consumer constructing a `HydrationDrop` literal (a test double for its own reporter) must
  add it. That is unusual, it is 0.x minor, and the changeset says so. The alternative (optional) would let
  a reporter not know, which is the defect.
- **The module-scope latch stays** (D-37-c(A)). It is now in the one file allowed ambient state, and its one
  test is isolated by file. If the user picks D-37-c(B), the latch disappears and ticket 153's test changes.
- **Gate false positives.** The rule runs on stripped lines. A future library module that genuinely needs
  `process.env` (for example an SSR feature flag) must go through `DeveloperSignals.ts` or earn a second,
  reviewed exemption, which is the point.
- **Overlap churn.** ARCH-34 edits `QadiProvider.tsx` (provider
  runtime feed). Whichever lands second rebases. T6 touches `:86-95`, `:268-313` and the props interface,
  and ARCH-34 is expected to touch the runtime/registry block, so a textual conflict is likely but
  shallow. ARCH-43 (gate override) touches `QadiProvider.tsx:192-203`, `:241-245`, `:306-313` and
  `GateWriter.ts`. If ARCH-43's delete path is chosen, it lands first and `UnwritableGateRegistry` is
  never added. Otherwise ARCH-37 lands first and ARCH-43 T2 builds on `DeveloperSignals.ts`.
  ARCH-40 (devtools barrel) may make `model/Hydration.ts` package-private, which does not conflict with T4.
- **Rollback.** T1 and T2 are independent patches. T3–T4 revert together (core export plus the devtools
  read). T5–T6 revert together. T7 reverts alone; the code stays confined without the gate.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence verified at `e635e68` with `scratchpad/wave4/ARCH-37/signals.test.tsx` | planner |
| 2026-10-08 | T0 | worktree branch `worktree-agent-a0e9237eebe9fa6f7` from `ce6d248` (main plus the ARCH-36/31 security patches, no ARCH-37 file touched); line numbers in section 1 still held. Probe not re-run (scratchpad dir absent); C1 and C8 re-confirmed by the T1 red test and a grep | implementer |
| 2026-10-08 | T1 | red first: `HydrationCounts.test.ts` "a refused payload says the payload was refused, not that zero decisions were lost" failed with `expected ... not to contain 'did not seed 0'`; fixed with `HydrationDrop.wholePayload` + `refuse(reason, entries, wholePayload, count)`; the four spec'd test files (112 tests) pass unmodified (commit `4d6dc37`) | implementer |
| 2026-10-08 | T2 | stale counts and "unregistered atom set" removed from 6 source/test files and BEH-QD-230 (blockquote kept the old sentence); criterion 7 `rg` clean (commit after `4d6dc37`) | implementer |
| 2026-10-08 | T3 | `hydrationDropMeaning`, `HydrationDropMeaning`, `isHydrationDropReason` in core `HydrationMetrics.ts`; 10 new tests (7 per-reason pins, distinctness, predicate) and `HydrationMetrics.tst.ts`; `MalformedPayload` remedy gained the depth-guard clause. Not test-first (additive API) | implementer |
| 2026-10-08 | T4 | devtools `MEANINGS`/`isReason` deleted, `meaningOf` reads core; devtools tests unmodified and green (commit `d1155ab`) | implementer |
| 2026-10-08 | T5 | `git mv HydrationWarning.ts DeveloperSignals.ts`; `DeveloperSignal` TaggedEnum (7 members), module-scope `Match.tagsExhaustive`, one `say`; `explain` deleted; `DeveloperSignals.test.ts` pins every sentence byte for byte; all earlier console assertions pass unmodified | implementer |
| 2026-10-08 | T6 | `QadiProviderProps.onDeveloperSignal`, `ProviderSignal`, `ProviderSignalReporter`; `QadiProvider.tsx` has no `console`/`process`; ticket-153 test moved to `QadiProvider.production.test.tsx`; `QadiProvider.signals.test.tsx` 7 tests; `GateRegistry.test.tsx` hand-built case asserts the signal. Tests were written after the implementation, not red-first | implementer |
| 2026-10-08 | T7 | `no-ambient-console` rule + exemption + `[stale-exemption]` check; orphan `settled.ts` entry deleted. Proved: `console.warn` appended to `QadiProvider.tsx` failed the gate; misspelt exemption key failed with `[stale-exemption]`; both reverted. AGENTS.md section 6 row added (commit `f9bfd14`) | implementer |
| 2026-10-08 | T8 | CCR-QD-203; ADR-QD-041 Rev 1.3 amendment, ADR-QD-080 Rev 1.1, BEH-QD-067 / 230 / 231, INV-QD-045, overview Rev 1.57, traceability Rev 1.106, README register Rev 1.102, react README, two website pages, changeset `.changeset/developer-signals-one-module.md`. `check-api-surface`, `check-doc-examples`, `spec:verify:strict`, `check-dod-table`, `check-website-doc-examples` pass (commit `80a7e7b`) | implementer |
| 2026-10-08 | T9 | NOT RUN: full `pnpm check` and the Stryker stages were out of scope for the implementer. Run before merge | implementer |
| 2026-10-08 | T10 | plan updated; status left `in-progress` only because T9 is open. README tracker row left to the orchestrator | implementer |
