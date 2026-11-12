---
phase: 13-lost-wave-gaps
plan: 03
subsystem: devtools-simulation
tags: [devtools, simulation, field-table, deep-module, lost-wave-port]

phase_base: 0925c2f
requires: ["13-02"]
provides:
  - "`packages/devtools/src/model/SimulationFields.ts`: `SIMULATION_FIELDS` (closed mapped record), `FIELD_ORDER`, `GRANT_KINDS`, `fieldOps`, `grant`, `renameSubject`, `formOf`, `unseededReason`, `FIXTURE_DATA`, `fixtureData` and their types"
  - "`singleEdits` = one fold over `FIELD_ORDER` using each row's `drop`"
  - "`remedyFor`'s held-field arms grant through `fieldOps`/`grant`"
  - "`UnseededField.key: SimulationField` (additive, D-48-e)"
  - "`SimulationSource` feeds `fixturePortsLayer` from `FIXTURE_DATA` through a closed `{ [K in PortName]: … }` setup"
  - "`sameEdge`/`sameEvent` live in `SimulationForm.ts`; `ok`/`refused` exported there"
affects: [13-04, 13-11, 13-12, 15, 17]

actuals:
  tokens: 90000
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns: ["closed field table + derived operations (ADR-QD-094's pattern applied to the simulator's input fields)"]

key-files:
  created:
    - packages/devtools/src/model/SimulationFields.ts
    - packages/devtools/test/model/SimulationFields.test.ts
    - packages/devtools/test/model/SimulationFields.tst.ts
  modified:
    - packages/devtools/src/model/SimulationForm.ts
    - packages/devtools/src/model/Edits.ts
    - packages/devtools/src/model/Remedies.ts
    - packages/devtools/src/model/Replay.ts
    - packages/devtools/src/model/SimulationSource.ts
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/test/model/Edits.test.ts
    - packages/devtools/test/model/SimulationForm.test.ts
    - packages/devtools/test/model/Replay.test.ts

requirements-completed: []
---

# 13-03 — Each simulation input field, described once

`phase_base: 0925c2f` (`13-base.txt`). GAP-02's model half; 13-04 does the session commands, the view, the
barrel, the spec and the changeset.

## What was done

- **Task 1 (e03f593).** `SimulationFields.test.ts` / `.tst.ts` ported from `950977f` (titles cite "ARCH-61, porting
  lost ARCH-48 `950977f`") and seen RED: vitest `Cannot find module '../../src/model/SimulationFields.ts'`; tstyche
  `TS2307` on the same import. Then `SimulationFields.ts` created from the lost file (header line one "Each
  simulation input field, described once."; D-48-a; ARCH-61 porting lost ARCH-48 by hash). `sameEdge`/`sameEvent`
  moved from `Edits.ts` to `SimulationForm.ts` (importers `Remedies.ts`, `Simulator.tsx`, `SimulationForm.test.ts`
  updated; the `Edits.test.ts` "sameEdge and sameEvent" describe deleted — the item 13-02 left — its assertions are
  in `SimulationFields.test.ts` "the equalities the fields use"). `ok`/`refused` exported. Type spikes, run by hand
  with `tsc -p packages/devtools/tsconfig.src.json` and reverted: removing the `roles` row → **TS2741**
  (`Property 'roles' is missing`); removing `"DropSignature"` from `EditKind` → **TS2322** in
  `SimulationFields.ts` (and TS2345 in the then-unfolded `Edits.ts`).
- **Task 2 (69760a5).** `singleEdits` = `dedupeByLabel(FIELD_ORDER.flatMap((key) => fieldOps(key).drops(input)))`;
  `weaken`, the seven `…Drops`, `edgeLabel`, `eventLabel`, `signatureLabel`, `omitKey` and the `Struct` import
  deleted from `Edits.ts`. `renameSubject` deleted from `SimulationForm.ts` (its two tests deleted from
  `SimulationForm.test.ts`; same assertions in `SimulationFields.test.ts` "renameSubject"). `Remedies.ts`: `Role`,
  `Permission`, `SubjectAttribute`, `Relationship`, `Acted`, `Signature` arms read through `fieldOps(key).holds` /
  `.elements` and build through `grant(key, element, label)` (new local `edit` wraps it as `Built`); `Action`,
  `ResourceAttribute`, `Custom` unchanged; the `Signature` arm's port-match "already met" predicate kept as 13-02
  wrote it (only the lens changed). No Edits/Remedies/WhatIf/SimulationSession test edited.
- **Task 3-RED (210499f).** `Replay.test.ts` hunk from `950977f`: a `key` list assertion in "seeds no grant at all,
  and names every field it could not fill" and the new "states each blank field with the reason its answerer
  gives". Both RED: `expected [ undefined, undefined, …(5) ] to deeply equal [ 'roles', 'permissions', …(5) ]` and
  `expected [ { field: 'roles', …(1) }, …(6) ] to deeply equal [ { key: 'roles', …(2) }, …(6) ]`. `Replay.ts` clean.
- **Task 3 (9f7b426).** `UnseededField` gains `key: SimulationField`; `unseededByReplay` = `FIELD_ORDER.map` →
  `{ key, field: row.label, reason: unseededReason(row.answeredBy) }` (`unseededReason` is the module-scope
  `Match.type<AnsweredBy>()` in `SimulationFields.ts`). `SimulationSource.ts`: `setupOf<K>(cell, input)` returns
  `{ readonly answers: PortFixtureData[K] } | undefined`; `setupsOf` returns a closed
  `{ readonly [K in PortName]: … }` literal from `FIXTURE_DATA`, passed to `fixturePortsLayer(setups: PortFixtures)`.
  No `PortSetup`/`PortSetups` (lost ARCH-57, obsolete). `Capture.ts` untouched.

### Final exports of `SimulationFields.ts` (package-private; not in the barrel)

Types: `FieldElements`, `SimulationField`, `DropKind`, `GrantKind`, `GrantedField`, `AnsweredBy`, `ChipView`,
`FieldView`, `ChipAdded`, `FieldDescription<A>`, `RowDropKinds`, `FieldOps<A>`, `NoFormVocabulary`,
`FixtureCell<K>`. Values: `SIMULATION_FIELDS`, `FIELD_ORDER`, `GRANT_KINDS`, `fieldOps`, `grant`, `renameSubject`,
`formOf`, `unseededReason`, `FIXTURE_DATA`, `fixtureData`. `ChipView`/`FieldView`/`ChipAdded`, `formOf` and
`fieldOps(k).addChip/removeChip/chips` are ported but not yet consumed (13-04 wires them into the session).

### Lines changed outside the model's derived consumers (for 13-04 and Phase 15)

- `packages/devtools/src/model/SimulationSession.ts` (imports only, `:35`):
  `-import { decodeResource, encodeResource, renameSubject, withResource } from "./SimulationForm.ts";`
  `+import { renameSubject } from "./SimulationFields.ts";`
  `+import { decodeResource, encodeResource, withResource } from "./SimulationForm.ts";`
- `packages/devtools/src/react/Simulator.tsx` (import only, `:29`):
  `-import { sameEdge, sameEvent } from "../model/Edits.ts";`
  `+import { sameEdge, sameEvent } from "../model/SimulationForm.ts";`

### Grep baselines (verify's own invocation)

| Gate | 1721a42 | 0925c2f / before | after |
|---|---|---|---|
| `export const sameEdge\|sameEvent` in `Edits.ts` | 2 | 2 | 0 |
| `^const [a-zA-Z]+Drops = ` in `Edits.ts` | 6 | 7 | 0 |
| held-field lens lines in `Remedies.ts` outside comments | 11 | 11 | **2** (see deviation 1) |
| `field: "` in `Replay.ts` | 7 | 7 | 0 |
| `input\.(attributes\|relationships\|history\|signatures)` in `SimulationSource.ts` | 4 | 4 | 0 |
| `git diff 1721a42 -- Capture.ts` | — | — | empty |

## Decisions applied

No `checkpoint:decision` in this plan. Lost ARCH-48's options as recorded in its commit and quoted by the plan:
D-48-a A (one closed table), D-48-e A (`UnseededField.key`, additive), D-48-f A (`FIXTURE_DATA` keyed by
`PortName`, `CustomPredicate` a `NoFormVocabulary` cell with its reason), adapted to main's `PortFixtures`.
`_DECISIONS.md`'s 13-04 row (D-48-d `A`) is 13-04's; the ported `ChipAdded` type matches it.

## Deviations

1. **[Gate baseline re-measured] Task 2's Remedies lens count is 2, not 0.** With the verify's own invocation the
   baseline is 11 at both `1721a42` and `0925c2f`, of which 2 are not held-field "already held?" lenses:
   `Remedies.ts:151` (`subject: input.subject.attributes ?? {}`, the `MatcherContext` that `satisfyingValue` judges
   a witness against) and `:290` (`getByPath(input.subject.attributes, ref.path)`, resolving a `SubjectRef`). The
   lost commit `950977f` keeps exactly these two (its count is 2). Folding them would change matcher semantics,
   not remove a restated field fact, so the gate was not forced; the nine lens lines in `remedyFor` are 0.
2. **[Task order] The whole lost `SimulationFields.ts` and its test file landed in Task 1**, including the parts
   the plan lists under Tasks 2–3 (`renameSubject`, `grant`, `unseededReason`, `FIXTURE_DATA`) and the chip/form
   operations 13-04 consumes (`addChip`, `removeChip`, `chips`, `formOf`, `ChipView`, `FieldView`, `ChipAdded`).
   The lost test file tests all of them, and 13-04's plan imports `fieldOps`/`formOf` from this module and deletes
   `SimulationForm.ts`'s `addChip`/`removeAt`/`withPair`/`withoutPair` as "now unused", so it expects them here.
   Tasks 2–3 then folded the consumers onto it. The Task 3 RED (Replay `key`) was still seen before its fix.
3. **The plan's "runtime check over `PORT_NAMES`"**: core does not export `PORT_NAMES` (`PortMetrics.ts:91` is
   module-private). The ported test checks it as the lost commit actually did: every port a row names plus
   `CustomPredicate` equals `Object.keys(FIXTURE_DATA)`, and the fed cells equal the named ports. The type half
   (`keyof typeof FIXTURE_DATA` is `PortName`) is in the tst file.
4. **`setupsOf` is annotated with a closed mapped type** rather than core's `PortFixtures` (every key optional), so
   an omitted port is TS2741 there too; it is assignable to `PortFixtures` at the `fixturePortsLayer` call.
5. Behaviour vs. byte-identity: the table's record writes go through `Object.fromEntries`, so a granted
   `SetSubjectAttribute` now puts a replaced key **last** (`{a:1,b:2}` + `a=9` → `{b:2,a:9}`), as the lost commit
   did and as `SimulationFields.test.ts` "sets an attribute, replacing a held one and putting it last" pins. No
   pre-existing test observed key order; every Remedies/WhatIf/Session test passed unedited.
6. Spec, website, changeset and registers not touched (13-04 / 13-11).

## Mutation (XC-05)

Scoped `pnpm exec stryker run stryker.devtools.mjs --mutate <the seven touched model files>` on the final tree,
compared by a node one-liner against `13-mutation-base.json` (exit 0 = no file dropped). `SimulationForm.ts` was
not in the base, so its base was taken at `0925c2f` in a temporary detached worktree in the scratchpad
(`qadi-base-1303`, removed with `git worktree remove` afterwards): 569/584.

| File | base | after |
|---|---|---|
| Edits.ts | 1.0 | 1.0 (28/28) |
| Remedies.ts | 1.0 | 1.0 (297/297) |
| Replay.ts | 1.0 | 1.0 (55/55) |
| SimulationFields.ts | new | 1.0 (190/190) |
| SimulationForm.ts | .9743 | .9744 (570/585) |
| SimulationSession.ts | .9634 | .9634 (342/355) |
| SimulationSource.ts | .9412 | .9444 (17/18) |

The one `SimulationSource.ts` survivor (`setupOf`'s `data === undefined` → `false`) is equivalent:
`{ answers: undefined }` falls through to the port's default in core's `fixturePortsLayer`, exactly as `undefined`
does (the lost commit recorded the same). The run overwrote `reports/mutation-devtools/mutation.json`.

## Gate results

- Task 1: the four named vitest files 225/225; tstyche `SimulationFields.tst.ts` 6/6; `pnpm typecheck` green;
  `pnpm circular` clean; `sameEdge|sameEvent` exports in `Edits.ts` = 0.
- Task 2: `pnpm vitest run --project devtools` 40 files / 1075; `pnpm typecheck`; `pnpm lint` (house-style 419
  files clean, 3 declared switches, no budget changed; no oxlint finding in devtools); `pnpm circular`; greps as
  above.
- Task 3-RED: the named test fails, `Replay.ts` unchanged.
- Task 3: devtools 40 files / 1076; tstyche 6/6; typecheck, lint, circular green; greps as above; `Capture.ts`
  unchanged since `1721a42`.
- Coverage (XC-05): `pnpm vitest run --project devtools --coverage --coverage.include='src/model/**/*.ts'`:
  `src/model` 99.92 % statements, 99.38 % branches, 100 % functions and lines; `SimulationFields.ts` 100 %. (The
  plan's bare `--coverage` with `--project devtools` reports 0/0 files, because the root include glob is resolved
  against the project root.)
- Not run: `pnpm check:pr` (13-12), `pnpm spec:verify` (still the expected CCR-QD-399 failure; this plan cites no
  new id).

## For later plans

- **13-04:** `SimulationFields.ts` already exports `ChipView`, `FieldView`, `ChipAdded`, `SimulationField`,
  `formOf`, `fieldOps(k).addChip/removeChip/chips`; the session commands, `snapshot.fields`, the `FieldEditor`
  view, the barrel line, `surface.tst.ts`, and deleting `SimulationForm.ts`'s `addChip`/`removeAt`/`withPair`/
  `withoutPair` (and their `SimulationForm.test.ts` cases) remain. `Simulator.tsx` still imports
  `sameEdge`/`sameEvent` (now from `SimulationForm.ts`). The "session chip tests" 13-02 left are 13-04's.
  Changeset text to include: `UnseededField.key` (added here), the subject-attribute grant's key order (deviation 5).
  Spec: BEH-QD-225 sentence (unseeded rows carry `key`).
- **13-11:** traceability rows `SimulationFields.test.ts`, `SimulationFields.tst.ts`, `Replay.test.ts` →
  BEH-QD-222/225 (and the INV-QD-257 text 13-04 records); CCR-QD-400 covers this plan too.
- No id used. BEH-QD-360..362 and ADR-QD-121 remain free.

## Commits

| sha | subject |
|---|---|
| e03f593 | feat(13-03): describe each simulation input field once (SIMULATION_FIELDS) |
| 69760a5 | refactor(13-03): the sweep, the rename and the remedies' grants fold over the field table |
| 210499f | test(13-03): RED — an unseeded field does not name its table key |
| 9f7b426 | feat(13-03): the unseeded list and the fixture ports derive from the field table |
