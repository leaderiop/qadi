---
phase: 13-lost-wave-gaps
plan: 04
subsystem: devtools-simulation
tags: [devtools, simulation, session, field-table, lost-wave-port, spec]

phase_base: 0925c2f
requires: ["13-03"]
provides:
  - "`SimulationSession.addChip(field, text): ChipAdded`, `removeChip(field, index)`, `SimulationSnapshot.fields` (`formOf(draft)`)"
  - "`Simulator.tsx` renders `snapshot.fields` through one `FieldEditor` (closed `testIdOf` map; test ids unchanged)"
  - "`@qadi/devtools` exports the types `ChipAdded`, `ChipView`, `FieldView`, `SimulationField`"
  - "BEH-QD-222/225/322 (29 Rev 1.9), ADR-QD-047 amendment (Rev 1.9), 02-screens §5 (Rev 0.14), website devtools page"
  - "`.changeset/simulation-session.md` amended in place"
affects: [13-11, 13-12, 15]

actuals:
  tokens: 70000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/src/model/SimulationForm.ts
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/src/index.ts
    - packages/devtools/test/model/SimulationSession.test.ts
    - packages/devtools/test/model/SimulationForm.test.ts
    - packages/devtools/test/react/Simulator.test.tsx
    - packages/devtools/test/surface.tst.ts
    - spec/behaviors/29-devtools-simulator.md
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/devtools-spec/02-screens.md
    - apps/website/src/content/docs/docs/packages/devtools.md
    - .changeset/simulation-session.md

requirements-completed: [GAP-02]
---

# 13-04 — The session commits chips; the Simulator reads the form from it

`phase_base: 0925c2f`. Third of three ARCH-48 plans (ARCH-61, porting lost ARCH-48 `950977f` T9–T12).

## Decision applied (Task 1, `checkpoint:decision`)

`_DECISIONS.md`, 13-04 (D-48-d): **`A`** — *"Chip typing buffer stays in the view; `addChip(field, text): ChipAdded`"*.
Implemented as the lost commit shipped it; quoted in ADR-QD-047's amendment with the reason option B was not
taken (new design beyond the port; can be added later without breaking `addChip`).

## What was done

- **Task 2-RED (54190c6).** Session test hunks ported from `950977f` (describe "the form's fields, through the
  session", eight tests; `removeChip`/`addChip` added to the no-op and effective command lists) and the Simulator
  hunks ("subject attributes" at both call sites; the C5/C6 test becomes one wiring smoke test whose duplicate
  shows "already there"). New beyond the lost hunk: "shows why a blank commit adds nothing, rather than ignoring
  it". RED, with `SimulationSession.ts` / `Simulator.tsx` swapped back to `HEAD` temporarily:
  10 × `TypeError: s.addChip is not a function` (session); the blank-commit test finds no `qadi-roles-error`.
- **Task 2 (07dc75a).** `SimulationSession.ts`: imports `fieldOps`, `formOf`, `renameSubject` and the three types
  from `SimulationFields.ts`; `fields` in the snapshot type and `build()`; `edit` hoisted above `const session`;
  `addChip`/`removeChip` on it. `seed` and the ARCH-58 lines untouched. `Simulator.tsx`: the lost hunk applied
  cleanly with `git apply` (after rewriting its `sameEdge` import line to 13-03's location) — `Fields` +
  `FieldEditor` over `snapshot.fields`, `testIdOf` closed over `SimulationField`, `ChipView.removeLabel` on the
  remove control. `SimulationForm.ts`: `withPair`, `withoutPair`, `addChip`, `removeAt` and the "List edits"
  section deleted (header now names the chip commands as `SimulationFields.ts`'s). Barrel line between
  `SimulationEdit.ts` and `SimulationInput.ts`. `surface.tst.ts` pins the four types (alphabetical in the list)
  and `@ts-expect-error`s `SIMULATION_FIELDS`, `fieldOps`, `formOf`, `FIELD_ORDER`, `FIXTURE_DATA`.
- **Task 3 (fbeac61).** Spec, ADR amendment, screens, website, changeset (below).

### Exported types (the four, nothing else new)

`ChipAdded`, `ChipView`, `FieldView`, `SimulationField` — `export type { … } from "./model/SimulationFields.ts"`.

### `SimulationForm.test.ts` deletions → where each assertion lives now (49 lines; 13-03 already removed `renameSubject`'s 33)

| Deleted | Equivalent |
|---|---|
| `withPair` `__proto__` is an own key | `SimulationFields.test.ts` "a record field > sets a name like __proto__ as a key, not a prototype" |
| `withPair` replaces `{b:2,a:3}`; "puts a replaced pair last" | `SimulationFields.test.ts` "a record field > puts a replaced pair last and keeps the others in order"; `SimulationSession.test.ts` "replaces a pair of the same name on a record field, and puts it last" |
| `withoutPair` | `SimulationFields.test.ts` per-field "removes exactly the chip at an index" (both record rows) and "shows a value the form cannot spell as its refusal, still removable by name" |
| list edits: adds, refuses blank, duplicate by structure, codec refusal | `SimulationFields.test.ts` per-field "adds a chip by its codec and refuses empty text", "refuses text its codec refuses, and moves nothing", "treats a second commit of the same element as the field's rule says"; `SimulationSession.test.ts` "refuses a structural duplicate…", "refuses empty text and text the field's codec refuses" |
| two edges differing only by subject | `SimulationFields.test.ts` "attribution > keeps two edges that differ only by subject…"; `SimulationSession.test.ts` "keeps two edges that differ only by subject as two chips" |
| `removeAt` exact index | `SimulationFields.test.ts` "removes exactly the chip at an index"; `SimulationSession.test.ts` "removes exactly one chip…" |
| `reasonOf(addChip(blank)) === "nothing to add"` | `SimulationFields.test.ts` exact `{ _tag: "Refused", reason: "nothing to add" }` (per field); session and Simulator tests too |

### Spec and docs (Task 3)

- `29-devtools-simulator.md` 1.8 → **1.9**: BEH-QD-222 paragraph (each held field dropped, `DropSignature`,
  `AddSignature` built from the node, `hasCustom` named skip with its reason) + the "reported in `skipped`" sentence;
  BEH-QD-225 `key` sentence; BEH-QD-322 listing (five commands + `SimulationSnapshot.fields`), a REQUIREMENT that a
  chip is committed only through a session command that answers its refusal, the compiled fence gains two `addChip`
  lines, the package-private note names `SimulationFields.ts` and CCR-QD-400.
- ADR-QD-047 **1.8 → 1.9** (plan measured 1.7 on `1721a42`; ARCH-58/CCR-QD-397 moved it): blockquote amendment
  "Amended 2026-11-10 (CCR-QD-400)", in the style of the 2026-11-09 one, quoting the decision. Status row extended.
- `02-screens.md` 0.13 → **0.14**: §5 paragraph before "Two corrections…". `spec-revise.mjs` refuses this file
  ("has no Revision / Change History rows" — it cannot parse `0.13 (draft)`), so the bump was written by hand in
  the same format; `spec-revise.mjs --check` passes. The `hasCustom` wording is a reason ("because its answer
  comes from Snapshot or Live"); `pnpm spec:claims` green.
- Website `devtools.md`: the session's chip commands, the "subject attributes" caption, the signature drop/remedy
  and the `hasCustom` skip.
- No new ADR (ADR-QD-122 unused), no new BEH (BEH-QD-363..367 unused). Ids cited: INV-QD-257, CCR-QD-400 (both
  written by 13-11).

## Deviations

1. **[Changeset] Amended `.changeset/simulation-session.md` in place instead of creating
   `simulation-fields-described-once.md`** (orchestrator instruction: amend a pending changeset that covers devtools
   simulation). It is pending (added `b655b3b`, 2026-10-12, after the 0.11.0 tag of 2026-10-06) and introduced
   `SimulationSession`. Its "and their list helpers" was dropped (they are gone); appended: the chip commands,
   `fields`, the four types, `UnseededField.key`, the signature fix, and **Breaking** (judged against 0.11.0, where
   `EditKind` and `UnseededField` were exported through `export *`): `EditKind` gains `DropSignature`/`AddSignature`;
   a replaced granted subject attribute goes last; the "subject attributes" caption (`aria-label`). Stays `minor`
   (0.x). The plan's verify grep was run against this file instead and passes.
2. **[Plan text] `ChipAdded`'s success tag is `"Ok"`** (as 13-03 ported it and the lost tests assert), not the
   plan's `"Added"`-shaped wording.
3. **[Mutation base] `SimulationForm.ts`** is not in `13-mutation-base.json`; its base at `0925c2f` was measured by
   13-03 in a temporary worktree (569/584 = 0.9743) with the same config, so it was reused rather than re-measured.
4. Spec text says "(ARCH-61 found both were)" where the lost text said "ARCH-48 found both were"; no bare `ARCH-48`
   was added (the negative gate passes).
5. **[Mutation] `SimulationForm.ts` ratio .9743 → .9729** with the same 15 un-killed mutants (see Mutation).

## Mutation (XC-05)

Scoped `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/SimulationSession.ts,packages/devtools/src/model/SimulationForm.ts`
on the final tree (run overall 96.95, break 80), compared by a node one-liner against `13-mutation-base.json`
(+ `SimulationForm.ts` at 569/584 from 13-03's `0925c2f` worktree run):

| File | base | after | |
|---|---|---|---|
| SimulationSession.ts | .9634 | **.9644** (352/365) | ok |
| SimulationForm.ts | .9743 (569/584) | **.9729** (539/554) | **lower by arithmetic — flagged** |

`Simulator.tsx` and `index.ts` are outside the Stryker `mutate` glob (`src/model/**`).

**`SimulationForm.ts` flag (not forced, not hidden).** The number of un-killed mutants is unchanged at 15 (base
584 − 569 = 15; now 14 survived + 1 no-coverage = 15). What fell is the killed count: the deleted `addChip`,
`removeAt`, `withPair`, `withoutPair` carried ~30 killed mutants, and that logic now lives, killed, in
`SimulationFields.ts` (190/190 at 13-03). No new survivor appeared. Each of the 15 was checked and is equivalent
or unreachable: `sameJson` `:81/:85/:88` (its `b` is always `parse(stringify(a))`, the same shape), `stringify`'s
catch `:100` (returns `undefined` either way), `jsonText` `:114/:116` (`JSON.parse(undefined)` refuses with the same
reason), the quoted-name check `:222` ×4 (a quote-delimited slice that parses is always a string; a refused parse
has no `value`), `closingQuote` `:236` (`<=` reads `undefined`, neither branch), `signatureOf` `:376`
(`typeof !== "number"` is redundant with `!Number.isFinite`, kept for narrowing), and `explicit` `:151` no coverage
(text starting `{` that parses is always a plain record). The repo has no `// Stryker disable` convention, so
none was added. The caller decides whether XC-05 is read per mutant (holds) or per ratio (fails by 0.0014).

## Gate results

- Task 2: `pnpm vitest run --project devtools` 40 files / 1080 tests; tstyche `surface.tst.ts` +
  `SimulationFields.tst.ts` 2 files / 7 tests; `pnpm typecheck` green; `pnpm lint` green (house-style 419 files,
  3 declared switches; no devtools warning); `pnpm circular` clean. Greps in `Simulator.tsx`: `session.edit(` 8 → **1**,
  `<(Chips|Pairs)` 7 → **0** (baselines unchanged at `0925c2f`); the barrel names `SimulationFields.ts`.
- Task 3: `node scripts/spec-revise.mjs --check` green; `pnpm spec:examples` 102 blocks compile; `pnpm spec:claims`
  8 claims; `DropSignature` in BEH 29 (0 → present); no `INV-QD-245` and no bare `ARCH-48` among added lines.
- Coverage: `--coverage.include='src/model/**/*.ts'`: all model files 99.92 % statements, 99.38 % branches, 100 %
  functions and lines.
- `pnpm spec:verify`: 20 pass, 1 fail — CCR register coverage now lists 399 **and 400** (expected until 13-11).
- Not run: `pnpm check:pr` (13-12), `pnpm spec:api` (13-11 adds the overview rows).

## For 13-11

- **overview rows:** `EditKind` row gains `DropSignature`, `AddSignature`; a new row for `SimulationField`,
  `FieldView`, `ChipView`, `ChipAdded`; `UnseededField` carries `key`; `SimulationSession` gains `addChip`,
  `removeChip`, and `SimulationSnapshot.fields`.
- **INV-QD-257** text: *each simulation input field is described once in a closed table, and every operation on a
  field derives from it.* BEH 29 and ADR-QD-047 link it as `../invariants.md` (no anchor yet).
- **traceability rows → BEH-QD-222/225/322:** `SimulationFields.test.ts`, `SimulationFields.tst.ts`,
  `Edits.test.ts`, `Remedies.test.ts`, `Replay.test.ts`, `WhatIf.test.ts`, `SimulationSession.test.ts`,
  `Simulator.test.tsx`, `surface.tst.ts`, and the BDD scenario "Dropping the signature the answer turned on".
- **CCR-QD-400** register row (covers 13-02, 13-03, 13-04); cited already in BEH 29, ADR-QD-047, 02-screens.
- `spec/decisions/index.yaml`: ADR-QD-047 revision/amendment date if the index carries it.
- Unused: ADR-QD-122, BEH-QD-363..367.

## For Phase 15

Files this plan changed that Phase 15 rebases on: `SimulationSession.ts` (imports, snapshot `fields`, hoisted
`edit`, `addChip`/`removeChip`), `SimulationSession.test.ts`, `Simulator.tsx` (`Fields`/`FieldEditor`/`testIdOf`;
the chip buffer is still a `useState` in `FieldEditor`, Phase 15's deferred item).

## Commits

| sha | subject |
|---|---|
| 54190c6 | test(13-04): RED — chips commit through the session, and a blank commit is refused aloud |
| 07dc75a | feat(13-04): the session commits chips and reads the form from the field table |
| fbeac61 | docs(13-04): the signature rows, the hasCustom named skip and the chip commands are specified |
