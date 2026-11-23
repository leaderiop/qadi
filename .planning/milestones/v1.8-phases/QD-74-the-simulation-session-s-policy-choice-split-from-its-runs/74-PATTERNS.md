# Phase 74: The simulation session's policy choice split from its runs - Pattern Map

**Mapped:** 2026-11-23 (HEAD `f1afaff7`; line numbers are at HEAD)
**Files analyzed:** 13 (3 new source/test, 3 modified source/test, scorer, spec set)
**Analogs found:** 13 / 13 (all tracked; `git ls-files` checked for the model files)

## File Classification

| File | Role | Data Flow | Closest Analog | Match |
|------|------|-----------|----------------|-------|
| `packages/devtools/src/model/SeededChoice.ts` (new) | model, pure value + transitions | transform | `HeldChoice.ts` pure half (`resolveHeld`, `pinHead`, `heldValue`, `heldIndex` :49-95) | role-match |
| `packages/devtools/test/model/SeededChoice.test.ts` (new) | test, plain value | unit | `packages/devtools/test/model/HeldChoice.test.ts` (plain `it`, no Effect) | exact |
| `packages/devtools/test/model/SimulationSession.characterisation.test.ts` (new) | test, whole-snapshot | request-response | `DockModel.characterisation.test.ts` (header :1-23) + `SimulationSession.test.ts` fixtures | role-match |
| `packages/devtools/src/model/SimulationSession.ts` (modify) | model, scoped store | event-driven | itself | self |
| `packages/devtools/test/model/SimulationSession.test.ts` (modify) | test | scoped Effect | itself | self |
| `packages/devtools/src/index.ts` (modify) | barrel | n/a | itself (named export block :103-116) | self |
| `.planning/phases/QD-74-.../74-mutation.mjs` (new) | script | batch | `QD-73-.../73-mutation.mjs`, closeOnly form in `QD-70-.../70-mutation.mjs` | exact |
| `spec/decisions/187-*.md` (new) | spec | doc | `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md` | exact |
| spec amendments, BEH-QD-706..710, INV-QD-393/394, CCR-QD-466 | spec | doc | CCR-QD-465 row, `spec/README.md:402` | exact |
| optional tstyche pin (D-13) | type test | tstyche | `packages/devtools/test/model/ExternalStore.tst.ts` (header :1-19) | exact |

Registers are revised only through `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-23`. Never run `next-id.mjs`.

## Pattern Assignments

### `SeededChoice.ts` (new)

**Analog:** `HeldChoice.ts`. Build on its pure functions, not on `makeHeldChoice` (the mutable cell :120-144).

Reuse verbatim: `resolveHeld(list, held, same)` :49-63, `pinHead(list, held)` :70-71 (`held ?? list[0]`), `heldValue` :90-91, `heldIndex` :94-95. From `Catalogue.ts`: `sameSighting` :76-77 (`Equal.equals(a.policy, b.policy)`), `sightingFor(list, policy)` :87 (listed element, else a zero-tally sighting under `policyLabel`).

**Doc convention for a package-private model module** (`HeldChoice.ts:1-31`): block comment, one-line summary first, then the why (the precedent, ADR cites), then "Package-private: it is not in the barrel (ADR-QD-099)". Imports: `import * as Equal from "effect/Equal"`, `import * as Match from "effect/Match"`, `import { ... } from "./HeldChoice.ts"` (`.ts` extension, `import type` for types). Do not put phase numbers or D-numbers in comments.

**The code that moves in, with its source lines:**

- Types (`SimulationSession.ts:82-91`, `:121-138`) move with their doc comments. The `:77-81` tie-to-`HeldChoice` comment must be reworded to name the new reading (`policyChoice` returns the held pair's `resolveHeld` as a `PolicyChoice`, and `policyOf` reads the held arms through `heldValue`).
- Orphan rule `seedOf` (:379-384):
```ts
choice._tag === "Seeded" ? choice.entry
  : seedEntry?._tag === "TimelineDecision" ? undefined : seedEntry;
```
- Pin rule (:364-366) plus constructor pin (:335): pin only while no seeded policy is held. D-02 puts it inside the constructor, `withSightings` and `seedFrom`.
- Same-policy no-op (:563-571): `seeded === undefined && held !== undefined && Equal.equals(held.policy, policy)`. The `&& run._tag === "Idle"` stays in the session (D-05).
- Menu order, written twice today. `selectedOf` (:277-285) is a module-scope `Match.type<PolicyChoice>().pipe(Match.tagsExhaustive({...}))` annotated `: (choice: PolicyChoice) => string` (the AGENTS.md section 5a form); keep that form. `leading` (:287-288) disappears. `policyMenuOf` (:290-302) builds `[seeded?, evicted?, ...sightings.map(String(index))]`. `choosePolicyAt` (:592-598) subtracts `leading(...)` from the position. D-04's single internal entry list (value, label, sighting-or-none) replaces both; `menuOf` projects it and `sightingAt(position)` reads it. Pin: non-integer (`Number.isInteger`, :594), past-the-end and leading positions all answer nothing.
- `replayInput` is called once, in `seedFrom` (:547-549). `replay._tag === "Replayable"` gives `replay.policy`, `replay.unseeded` and `replay.input`.

**No-ops return the input reference** (D-01); the session detects them with `===`. Never `as`, `!`, `any`, `switch`, or `Record<string, unknown>`.

### `SeededChoice.test.ts` (new)

**Analog:** `HeldChoice.test.ts`. Header: a one-paragraph doc stating what is pinned. Imports `{ assert, describe, it } from "@effect/vitest"` and uses plain `it` (not `it.effect`), no scope, no store. No-op rows use `assert.strictEqual(next, input)` for reference identity. Sightings and entries: copy the fixtures from `SimulationSession.test.ts`:
```ts
const sighting = (policy: Policy): PolicySighting => ({ policy, label: policyLabel(policy), count: 1, allows: 1, denies: 0, errors: 0, lastAt: 100 });   // :44-52
const entryOf = (record) => { const [entry] = ingestAll(emptyTimeline(), [record]).entries; ... }          // :54-58
```
`decisionRecord`, `read`, `readPolicy` come from `test/helpers.ts` (:41-42, :99). Each title states its input.

### `SimulationSession.characterisation.test.ts` (new)

**Analog:** `DockModel.characterisation.test.ts`. Header :1-23 states what the rows pin and lists "rows the model's own tests already pin, left there". Copy that shape. Imports (:24-45): `assert, describe, it` from `@effect/vitest`, `Effect`, `Scope`, the model under test, and shared doubles from `../helpers.ts`. Rows are `it.effect(title, () => Effect.gen(function* () {...}))`.

**Session helpers to copy** from `SimulationSession.test.ts`:
- `counted(session)` :120-126, which counts through `subscribe` only (matches the CONTEXT specifics);
- `startRun(session)` :134-139 (`session.run(kind); yield* TestClock.adjust("10 millis")`), plus the settle helper after it;
- `sighting`, `entryOf`, `clearance`, `withClearance` (:44-66);
- ports layers: the file's attribute-resolver / `scriptedPort` setup near :163-260 (`makeSimulationSession` built inside `it.effect`, scope supplied by it).

`SimulationSession.runs.test.ts` (212 lines) already exists and is the run-lifecycle sibling: its naming (`.runs.`) is the precedent for a `.characterisation.` sibling. `dockModelFixtures.ts` (96 lines) is dock-specific; reuse only the `helpers.ts` pieces above. `DockModel.test.ts:127-128` reads the menu label through `policyMenu`; it must stay green unchanged.

**Behaviours that need whole-value rows because the refactor could change them (read from `SimulationSession.ts`):**
- `editResourceText` (:652-664) commits on EVERY call, including an unchanged parse and a refusal. It has no no-op guard today. D-10's single draft path must not add one, or a notification count changes. Pin: same text twice notifies twice.
- `renameSubject` (:666-670) assigns `draft` directly and does NOT go through `edit`'s `next.resource !== draft.resource` check. Routed through `edit`, the resource is the same object, so `resourceText` is untouched; pin that, and that renaming to the current id notifies no one.
- `reseed` (:543-558) sets `resourceText = resourceTextOf(draft)` UNCONDITIONALLY (also for an orphan or `undefined`, where `draft` is unchanged) and always clears the run and commits. The draft write there must keep that unconditional text.
- `setPorts` clears only a `Running` run (:612-615); a `Ran` run stays and is not stale from it.
- `choosePolicy` clears the run when not `Idle` even for the same policy (:564-576).

### `SimulationSession.ts` (modify)

Conventions to keep: `Effect.fn("qadi.devtools.makeSimulationSession")(function* ...)` stays; `const store = makeExternalStore(build())` and `commit()` once per effective command (:433-438); `supersede()` doc comment (:440-451) stays; `Match` imported at :35 is used only by `selectedOf`, so drop the import when it leaves (the compiler/lint will say).

**State that leaves** (:334-340): `chosen`, `seedEntry`, `seeded`; becomes one `let choice: SeededChoice`. **Functions that leave:** `selectedOf` :277, `leading` :287, `policyMenuOf` :290, `policyChoice` :353, `pin` :364, `policyOf` :368, `seedOf` :379. **Imports that go:** `Equal` only if `stale` stops using it (it does not: `:403` keeps it), `sightingFor`/`sameSighting`/`heldValue`/`makeHeldChoice` (:40-41), `replayInput`, `UnseededField` (:44-48); `Policy` stays (used by `choosePolicy`).

**Draft writes to unify** (`draft =` assignments, `grep -n "draft = "`): `:538` in `edit`, `:550` in `reseed`, `:661` in `editResourceText`, `:668` in `renameSubject`. Today's `edit` (:534-540) is the model:
```ts
/** The one path a draft changes by: ... */
const edit = (next: SimulationInput) => {
  if (next === draft) return;
  if (next.resource !== draft.resource) resourceText = resourceTextOf(next);
  draft = next;
  commit();
};
```
D-10 asks for one assignment site holding the no-op and resource-text rules; `reseed` and `editResourceText` write text that is not `resourceTextOf(next)` (re-encoded, or the typed text with an error), so the single function takes the text as a parameter and `edit` derives it.

**Clear-the-run sites** (to become `clearRun`): `reseed` :555-556, `choosePolicy` :574-575, `setPorts` :613-614 (inside `if (run._tag === "Running")`). `start`'s `Refused` path (:519-520) supersedes then sets `Refused`; it is not a clear.

**`stale` and baseline** (:398-410) compare `question.seed !== seedOf(policy)`; they read the module's `seedOf` reading. `choosePolicyAt` (:592-598) becomes `choice.sightingAt(position)` then `choosePolicy(picked.policy)`.

### `SimulationSession.test.ts` (modify)

Sorting by what each test needs (from titles and a scan for `startRun`/`run`):

**Choice rules only (move to `SeededChoice.test.ts`; no run involved):**
- "policyMenu is what the dropdown lists..." block :570-627 (the three `choosePolicyAt` tests :514-569 exercise `choosePolicyAt` through the session; keep one through-the-session test, move the position rules).
- "seeding": "fills the policy, action and resource..." :1102 (policy half; the draft/resource half is the session's), "an orphan seeds nothing and leaves no policy" :1118, "choosing from the rail leaves the replayed row behind" :1143, "pins the head before any choice..." :1173, "does not pin while a replayed row is seeded..." :1186, "pins the head at the moment a replayed row is left..." :1197, "choosing the held policy while a replayed row is seeded still leaves the row" :1207, "remembers the rail's label..." :1216, "holds a policy chosen before the rail has any" :1226, "refuses nothing: choosing an unlisted policy holds it as evicted" :1235.
- "replaying a row": "re-seeds from the row it was last seeded from after another policy was chosen" :1277 (seed memory), "seed with the entry it holds is a no-op..." :1311 (same-entry guard; the edited-form half is the session's), "replaying a row that cannot be replayed leaves the seed as seed does" :1333.
- "choosing a policy": "keeps the chosen policy when a decision reorders the rail" :1352, "keeps the chosen policy when a new policy decides first" :1366.
- From :908: "drops the baseline when the reviewer leaves a replayed row for the rail" :962 and "says an orphan carries no decision to compare against" :973 read only `seedOf` (the baseline half stays as a session reading).

**Exercise runs or the form (stay in `SimulationSession.test.ts`):**
- "keeps an evicted choice, marks it, and still runs it" :1151 (runs), "runs nothing when there is no policy" :1244, "runs the chosen policy after the rail moved" :1380.
- "re-seeds the form after an edit, and drops the run in flight" :1287 (uses `startRun`, `TestClock.adjust`).
- "is stale once the form moves, and the policy or seed leaving clears it" :909, "is not stale when the host passes an equal policy..." :926, "shows a baseline only for a result that ran against the current seed" :940, "never shows a result as answering a row replayed while that run was starting" :981, "keeps no capture..." :1010, "labels the clock..." :1039.
- "seed after a replay of the same entry keeps the replay's edited form" :1322 (form), "resets the resource field and any unparsed text on a re-seed" :1127 (form).
- The seed-through-the-session tests at :538, :551, :966-968, :1739-1744 read `policy._tag` once per command; keep one per command (D-12).

Reads of `snapshot.policy` that must stay valid unchanged: see the usage list below.

### `index.ts` (modify)

The block is `index.ts:103-116`, one `export type { ... } from "./model/SimulationSession.ts"` statement, names alphabetical:
```ts
export type {
  PolicyChoice,
  PolicyMenu,
  PolicyMenuOption,
  ResourceText,
  ...
} from "./model/SimulationSession.ts";
```
The three names move to a new `export type { PolicyChoice, PolicyMenu, PolicyMenuOption } from "./model/SeededChoice.ts";`, placed where it sorts among module paths (after `./model/Selection.ts`-style neighbours, before `./model/SimulationEdit.ts`; check the order in the file). Other barrel lines (`export type { HeldChoice }`?) are not edited. `check-api-surface` stays at 941.

### `74-mutation.mjs` (new)

**Analog:** `73-mutation.mjs` (356 lines), with these edits:
- Header comment (:1-14), `D` (:20), `R` (:21; `packages/devtools/src/model/`), `phase: "73"` at :196 and in `heldFor` (:~180), the `73-mutation-${name}.json` names (:195, :200, `compare` :207-208), the self-test and `usage` strings (:342).
- `GROUPS` (:22-25) becomes:
```js
session: { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json", files: [`${R}SimulationSession.ts`] },
choice:  { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json", files: [`${R}SeededChoice.ts`], closeOnly: true },
held:    ... `${R}HeldChoice.ts` only if a plan edits it
```
- The report path is verified: `stryker.devtools.mjs:41` sets `jsonReporter: { fileName: "reports/mutation-devtools/mutation.json" }`, and `record` (:187-188) fails if the config's `jsonReporter.fileName` differs from the group's `report`.
- **A file absent at the base** is the existing `closeOnly: true` group: `record` refuses a base for it (`usage()`, :186), `compare` (:210-218) calls `judgeNew` (:160-175), which fails on any open mutant (Survived/NoCoverage) and allows Ignored ones; its self-test rows are :291-297. QD-70 and QD-69 use it (`70-mutation.mjs:31`). D-14's "every mutant killed or examined" holds with this plus `EXAMINED` (:70-74, admitted only by a by-hand `ignoreStatic: false` kill). Note: `judgeNew` today does NOT consult `EXAMINED` for Ignored mutants (it ignores them outright); the plan should decide whether to keep that, since D-14 says "killed or examined".
- `compare` loops `Object.keys(GROUPS)`; the self-test loop at :310 (in 70) filters `closeOnly !== true`, so keep that filter if copied from 70, since 73 has none.
- One tree-clean check per group is `gitStatus(group)` (:~31) reading only that group's files; for `choice` the new file must be committed before `record close choice`.

### Spec (docs)

- **ADR-QD-187 shape:** `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md` :1-14 (title `# ADR-QD-186 — ...`, Document Control table with Revision/Effective Date/Status/Change History, then `---`, `## Context`, `## Decision`, alternatives). Index entry: `spec/decisions/index.yaml` tail (`id`, `file`, `title`, `status`; the 186 entry is last). Filename pattern: `187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md` (lower-case, hyphenated, no apostrophe).
- **ADR-QD-047:** the v1.11 amendment is the blockquote at `047-a-headless-devtools-model.md:329-345` ("Amended 2026-11-11 (CCR-QD-415): the simulator is a view of its session"); it names `policyMenu` (:334) but not `leading`, `policyMenuOf` or the cell, so it still holds, no amendment is needed for it. Dated note form to copy: 053's "Amended 2026-11-12 ..." (see 73-PATTERNS).
- **ADR-QD-137 / ADR-QD-150:** grep found no `leading`, `policyMenuOf` or `makeHeldChoice` in either; bodies stay untouched.
- **BEH-QD-322** (`29-devtools-simulator.md:536`): its text at :634 reads "`PolicyChoice` is `HeldChoice`'s three arms ... or `Seeded`" and :849-855 says "the leading entry ... a position past the list and a number that is not a position are no-ops"; both stay true. **BEH-QD-466** (`28-devtools-screens.md:1102`): :1115-1120 says sessions "embed one cell (`makeHeldChoice`) ... `PolicyChoice` adds `Seeded`". That sentence becomes false for the simulation session (it now holds a `SeededChoice` built on the pure functions, only `ExplorerSession` still embeds the cell), so it needs a dated amendment through `spec-revise.mjs`.
- **`spec/overview.md`:** line 891 names `model/SimulationSession.ts` as the module of `PolicyChoice`, `PolicyMenu`, `PolicyMenuOption` in the same row as the session types, so D-07 edits it: split those three names into their own row at `model/SeededChoice.ts`. Line 892 (`HeldChoice` row) says "`PolicyChoice`'s first three arms are its own" and stays true. `check-api-surface` reads this doc, so run it after.
- **Behaviour block form:** 28/29-doc BEH blocks (e.g. BEH-QD-691 in `09-react.md:809-832`): Invariant/See lines, a `REQUIREMENT:` fence, "Pinned by" naming test titles verbatim. INV block form: INV-QD-387 at `spec/invariants.md:4437-4447` (Source/Implication/Enforcement/Related).
- **Traceability:** `spec/traceability.md:592` is the row for `SimulationSession.test.ts`. It lists BEH-QD-220/222/225/322/390/455/466/460/461, ADR-QD-137, INV-QD-042/043/107/257 and what the file covers. Add rows for `SeededChoice.test.ts` and `SimulationSession.characterisation.test.ts`, and trim this row's description of the moved tests. Row for INV-QD-107 at :133 names `resolveHeld`/`pinHead` (`HeldChoice.ts`); check whether it should also name `SeededChoice.ts`.
- **CCR-QD-466 row:** `spec/README.md:402` (CCR-QD-465): date, a list of changed files with revisions (`path Rev x.y (new/amended)`), then a body starting with the ARCH id. Cite every revision, unused reserved ids, and "no changeset".

## Shared Patterns

### One publish per effective command
`SimulationSession.ts:433-438`. Every no-op (`===` on the input reference or equal value) returns before `commit()`. Preserve exactly: `setSightings` (:584-588) returns when `chosen.setList` says the list has the same elements (`sameElements` from `ExternalStore.ts`, used by `HeldChoice.ts:131`); the module's `withSightings` must apply the same `sameElements` rule and return its input.

### Pure-value tests, no Effect
`HeldChoice.test.ts` (plain `it`, `FastCheck` available) is the pattern; session-scoped tests keep `it.effect`.

### Negative type pins (only if D-13's tstyche pin is a negative one)
`ExternalStore.tst.ts:1-19`: `@ts-expect-error` held in a `const`, with a positive twin; AGENTS.md section 6 `NOT_CALLABLE_PIN_BUDGET` applies to any `not.toBeCallableWith`, so a new one is a reviewed edit to `scripts/check-house-style.mjs` and the AGENTS.md table together, but AGENTS.md is declared unchanged in D-15. Prefer a `@ts-expect-error` pin to avoid touching the budget.

## Usage report (src and test)

**`PolicyChoice` / `PolicyMenu` / `PolicyMenuOption`** (type names):
- `packages/devtools/src/index.ts:105-107` (barrel; to move).
- `packages/devtools/test/surface.tst.ts:81-83`: imports the three names from the barrel (`"../src/index.ts"`), so it keeps passing once the barrel line is edited. No source file other than `SimulationSession.ts` imports them; `Simulator.tsx` reads `policyMenu` structurally, no type import.

**`makeHeldChoice`:**
- `src/model/ExplorerSession.ts:36` (import), `:191` (use) stays.
- `src/model/HeldChoice.ts:25` (doc), `:120` (definition), `:150` (`makeHeldChoiceStore` uses it).
- `test/model/HeldChoice.test.ts:12` import, `:114-175` uses.
- `src/model/SimulationSession.ts:41`, `:334`: the one that leaves.

**`snapshot.policyMenu`:**
- `src/react/Simulator.tsx:127` (`const { policyMenu, cost } = snapshot`), `:135` (`policyMenu.selected`), `:140` (`policyMenu.options.map`).
- `test/model/DockModel.test.ts:127-128` (`model.simulation.getSnapshot()` then `.options.find(... === policyMenu.selected)?.label`).
- `test/model/SimulationSession.test.ts:577, 587, 590, 598, 613` (the policyMenu block, to move).

**`snapshot.policy` (the simulation one):**
- `test/model/SimulationSession.test.ts:538, 551, 966, 968, 1106, 1107, 1113, 1124, 1146, 1148, 1170, 1176, 1190, 1211, 1213, 1269, 1270, 1282, 1330, 1341, 1344, 1739, 1741, 1744`.
- `test/model/DockModel.test.ts:280` (`policy._tag === "Seeded" && sameAs(snapshot.policy.policy, policy)`) and `:300` (`notStrictEqual(... .policy._tag, "Seeded")`).
- `test/model/NonJsonWitness.test.ts:217` (`"value" in snapshot.policy ? [snapshot.policy.value.label] : []`).
- `test/react/useSimulationSession.test.tsx:195, 199` (`result.current?.snapshot.policy._tag`).
- Not the simulation session (explorer's `snapshot.policy`): `ExplorerSession.ts:246`, `ExplorerSession.test.ts` many lines, `DockModel.test.ts:134`. Ignore these.

## `renameSubject` and `input.resource`

It cannot change `input.resource`. `renameSubject` (`SimulationFields.ts:503-507`) starts from `{ ...input, subject: { ...input.subject, id: to } }`, which keeps `resource` by reference, then reduces over `FIELD_ORDER` calling each `fieldOps(key).rename(renamed, from, to)`. `rename` (:459-467) returns the input unchanged unless the row has an `attribution` (:460-462), else `row.write(input, held.map(...))`. The seven rows' `write` functions (grep `write:` :248-340) are: roles (:248, `subject.roles`), permissions (:261, `subject.permissions`), the pairs row (:274, spread of `input` plus a sub-object), attributes (:290, `attributes`), relationships (:303), history (:319), signatures (:335). Each is `{ ...input, <own field> }`, none assigns `resource`. Attribution (`follow()` :188) exists only on relationships (:308), history (:324) and signatures (:340); those elements' `resourceId` is never rewritten, only `subjectId`. Result: `renamed.resource === input.resource`, so `edit`'s `next.resource !== draft.resource` test is false and `resourceText` is unchanged, as today. (Row at :274 spreads multiple lines; it was not read past `...` line 275, so confirm it writes only `subject` fields before relying on this in a test comment.)

## No Analog Found

None. The nearest thing to a gap: there is no existing pure "value-with-transitions returning the same reference on no-op" module in `src/model` (`Selection.ts` exports `Data.TaggedClass` values and a pure `selectionOf` only, not transitions), so `HeldChoice.ts`'s pure functions are the structural analog and the no-op-by-reference convention comes from the CONTEXT (D-01) and the `sameElements` guard (`HeldChoice.ts:131`).

## Metadata

**Analog search scope:** `packages/devtools/src/model`, `packages/devtools/src/index.ts`, `packages/devtools/test/model`, `packages/devtools/test/react`, `spec/`, `.planning/phases/QD-69..73`, `stryker.devtools.mjs`.
**Pattern extraction date:** 2026-11-23
