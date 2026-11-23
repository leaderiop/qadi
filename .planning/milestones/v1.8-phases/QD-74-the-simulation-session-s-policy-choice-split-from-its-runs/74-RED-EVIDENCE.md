# Phase 74 evidence: the simulation session characterisation

This file records what the characterisation of the simulation session's policy choice did on the code before any source
change, and, in the plans after it, what each deliberate break of the new code did to it. Each section names the
commit it ran on and the command, so a later reader can run it again.

## The characterisation on the base

Base sha: `b22d97f9af293734787b3f771400d6f5f6e87065` (no `packages/devtools/src` file differs from it).
Characterisation commit: `e25c8cfdc28cdc797cb1f662615e7c214e9bda2d`.

Command, from the repository root:

```
pnpm exec vitest run --project devtools packages/devtools/test/model/SimulationSession.characterisation.test.ts --reporter=json --outputFile=<report>
```

| Run | Result |
| --- | ------ |
| 1 | 35 passed, 0 failed |
| 2 | 35 passed, 0 failed |
| 3 | 35 passed, 0 failed |

The 35 rows hold the 35 titles of the plan under 8 describes (`seeding`, `replaying a row`, `choosing a policy`, `the
policy menu`, `staleness`, `the rail`, `the ports`, `the draft`). Every expected value reasoned from the code was the
value the base returned: no row took a value from the base that differs from the one it was written with.

## Each seeded choice rule gutted once

Each gut is a scratch edit to `packages/devtools/src/model/SeededChoice.ts` on the working tree, made on
`1fa3eb626c314efbb6553db16d79d01a05fcdcd1` (the module is from `ef65bb473dc314db6817a72b280a99a8e24c8d99`, its type pins
from `1fa3eb62`). Each was run, its report saved, and then reverted with `git checkout -- packages/devtools/src/model/SeededChoice.ts`; no
gut was committed, and `git status --porcelain -- packages` read empty after each. The five rule guts run

```
pnpm exec vitest run --project devtools packages/devtools/test/model/SeededChoice.test.ts --reporter=json --outputFile=<report>
```

and the type tie runs `pnpm test:tstyche`. The failing titles below are the ones the report names; every other row of the
file passed in that run.

### pin

Edit: `pinUnlessReplayed` answers `held` always, so no transition pins the head.

Result: 5 failed, 28 passed. Failing titles:

- `with no seed, the constructor pins the head of the rail`
- `an empty choice pins the first head it is given, and a new head does not move it`
- `an orphan seed pins the head and answers no input`
- `a held replayed policy pins nothing, and leaving it pins the head`
- `choosing an equal copy of the held policy returns the same choice`

First failure lines:

```
AssertionError: expected { _tag: 'Listed', …(2) } to deeply equal { _tag: 'Listed', …(2) }
    at packages/devtools/test/model/SeededChoice.test.ts:151:12
```

### orphan

Edit: `seedOf` answers `undefined` unless the row's policy is replayed, so an orphan row stops being the seed.

Result: 1 failed, 32 passed. Failing title: `seedOf keeps an orphan row after another policy is chosen`.

First failure lines:

```
AssertionError: expected undefined to equal TimelineOrphan{ …(5) }
    at packages/devtools/test/model/SeededChoice.test.ts:220:12
```

### order

Edit: `menuEntries` puts the lead's entries after the rail's entries instead of before them.

Result: 4 failed, 29 passed. Failing titles:

- `the menu leads with an evicted choice, labelled as no longer in the log`
- `the menu leads with the replayed row while a replayed policy is held`
- `sightingAt 0 of a seeded or evicted menu is nothing, and 1 is the head of the rail`
- `sightingAt names each rail entry after the lead, in the order of the menu`

First failure lines:

```
AssertionError: expected { …(2) } to deeply equal { …(2) }
    at packages/devtools/test/model/SeededChoice.test.ts:258:12
```

### lookup

Edit: `sightingAt` reads `choice.sightings[position]` instead of the menu's list, so a position no longer counts the
lead.

Result: 3 failed, 30 passed. Failing titles:

- `sightingAt 0 of a seeded or evicted menu is nothing, and 1 is the head of the rail`
- `sightingAt names each rail entry after the lead, in the order of the menu`
- `each option of the menu names the sighting sightingAt reads at its position`

First failure lines:

```
AssertionError: expected { …(7) } to equal undefined
    at packages/devtools/test/model/SeededChoice.test.ts:277:16
```

### noop

Edit: `choose` drops its early return, so choosing the held policy answers a new object.

Result: 1 failed, 32 passed. Failing title: `choosing an equal copy of the held policy returns the same choice`.

First failure lines:

```
AssertionError: expected { sightings: [ { …(7) } ], …(2) } to equal { sightings: [ { …(7) } ], …(2) }
    at packages/devtools/test/model/SeededChoice.test.ts:330:12
```

### tie

Edit: a fifth arm, `| { readonly _tag: "Gutted" }`, added to `PolicyChoice`.

Command: `pnpm test:tstyche < /dev/null > <log> 2>&1`. Exit 1; both passes read `Targets: 1 failed, 1 total` with
`Test files: 1 failed, 70 passed, 71 total`, and the one failing test is
`the first three arms of PolicyChoice are HeldChoice of PolicySighting`.

First failure lines:

```
Error: Type '{ readonly _tag: "Empty"; } | { readonly _tag: "Gutted"; } | { readonly _tag: "Listed"; … } | { readonly _tag: "Evicted"; … }' is not the same as type 'HeldChoice<PolicySighting>'.

  at ./packages/devtools/test/model/SeededChoice.tst.ts:32:5 ❭ the first three arms of PolicyChoice are HeldChoice of PolicySighting
```

## Each run clear and draft rule gutted once

Each gut is a scratch edit to `packages/devtools/src/model/SimulationSession.ts` on the working tree, made on `0caa34a68c6795f85b82c8df78e677335a6618ab`.
Each was run, its report saved, and then reverted with `git checkout -- packages/devtools/src/model/SimulationSession.ts`; no
gut was committed, and `git status --porcelain -- packages` read empty after the last revert. Every gut runs

```
pnpm exec vitest run --project devtools packages/devtools/test/model/SimulationSession.characterisation.test.ts --reporter=json --outputFile=<report>
```

and the failing titles below are the ones the report names; every other row of the file passed in that run.

### clear-reseed

Edit: `reseed` does not call `clearRun`, so seeding leaves the run in place.

Result: 2 failed, 33 passed. Failing titles:

- `seeding a row after a run clears it, and a new run checks the row`
- `replaying the held row re-seeds the edited form and clears the run`

First failure lines:

```
AssertionError: expected { …(8) } to deeply equal { …(8) }
    at packages/devtools/test/model/SimulationSession.characterisation.test.ts:733:14
```

### clear-choose

Edit: `choosePolicy` does not call `clearRun`, so choosing another policy leaves the run in place.

Result: 2 failed, 33 passed. Failing titles:

- `choosing another policy after a run clears it, so nothing is stale`
- `choosing the held policy after a run clears the run, notifying once`

First failure lines:

```
AssertionError: expected { …(8) } to deeply equal { …(8) }
    at packages/devtools/test/model/SimulationSession.characterisation.test.ts:710:14
```

### clear-ports

Edit: `setPorts` does not call `clearRun`, so new ports leave a running run in place.

Result: 1 failed, 34 passed. Failing title:

- `new ports during a run clear it and stop it`

First failure lines:

```
AssertionError: expected { …(8) } to deeply equal { draft: { …(2) }, …(7) }
    at packages/devtools/test/model/SimulationSession.characterisation.test.ts:843:14
```

### idle

Edit: `choosePolicy` returns whenever `choose` answered its input, whatever the run, instead of only while the run is `Idle`.

Result: 1 failed, 34 passed. Failing title:

- `choosing the held policy after a run clears the run, notifying once`

First failure lines:

```
AssertionError: expected { …(8) } to deeply equal { …(8) }
    at packages/devtools/test/model/SimulationSession.characterisation.test.ts:462:14
```

### draft-noop

Edit: `writeDraft` drops its first line, so the draft already held is written and published again.

Result: 1 failed, 34 passed. Failing title:

- `editing to the draft it holds changes nothing`

First failure lines:

```
AssertionError: expected 1 to equal +0
    at packages/devtools/test/model/SimulationSession.characterisation.test.ts:884:14
```

### draft-text

Edit: Without `text`, `writeDraft` always re-encodes the resource text from the draft.

Result: 2 failed, 33 passed. Failing titles:

- `an edit that keeps the resource keeps the typed resource text`
- `renaming to the current id changes nothing, and a rename keeps the text`

First failure lines:

```
AssertionError: expected { …(8) } to deeply equal { draft: { …(3) }, …(7) }
    at packages/devtools/test/model/SimulationSession.characterisation.test.ts:916:14
```

## Where each moved session test is pinned now

Each removed session test is survived by a `SeededChoice.test.ts` test at the same expected values, and where the session reading matters by a characterisation row.

| Session test (base) | SeededChoice.test.ts | Characterisation |
| ------------------- | -------------------- | ---------------- |
| choosePolicyAt names a position of the menu, which a seeded or evicted entry shifts by one | sightingAt 0 of a seeded or evicted menu is nothing, and 1 is the head of the rail | position 0 of a seeded menu names the replayed row and changes nothing; position 0 of a menu led by an evicted choice changes nothing |
| choosePolicyAt a position that lists nothing, or not a whole position, changes nothing | sightingAt a position past the list, negative, fractional or NaN is nothing | a position past the list, negative, fractional or NaN changes nothing |
| is empty and selects nothing while there is no policy | the menu of an empty choice is empty and selects nothing | the menu of an empty session is empty and selects nothing |
| lists each sighting by its label and value `String(index)`, and selects the chosen one | the menu lists each sighting by label under String(index) and selects the held one | choosing a listed policy holds it and notifies once |
| leads with the evicted choice, labelled as no longer in the log | the menu leads with an evicted choice, labelled as no longer in the log | choosing a policy the rail does not list holds it as evicted |
| leads with the replayed row while seeded | the menu leads with the replayed row while a replayed policy is held | built with a replayable row, a session holds its policy unpinned |
| an orphan seeds nothing and leaves no policy | an orphan seeds no policy and answers no input | built with an orphan row, a session holds the head and keeps the row as seed |
| choosing from the rail leaves the replayed row behind | choosing from the rail drops the replayed policy | choosing the held policy while seeded leaves the row, keeping the draft |
| pins the head before any choice, and a new head does not move it | with no seed, the constructor pins the head of the rail | built with no seed, a session holds the head of the rail and keeps it |
| does not pin while a replayed row is seeded, and pins when it is left | a held replayed policy pins nothing, and leaving it pins the head | built with a replayable row, a session holds its policy unpinned |
| pins the head at the moment a replayed row is left, not before | leaving a replayed policy pins the head of that moment, not an earlier one | built with a replayable row, a session holds its policy unpinned |
| choosing the held policy while a replayed row is seeded still leaves the row | choosing the held policy while a replayed policy is held drops it | choosing the held policy while seeded leaves the row, keeping the draft |
| remembers the rail's label for a chosen policy once it leaves the rail | a chosen policy keeps the label of the rail once the rail drops it | a finished run stays current when the rail moves |
| holds a policy chosen before the rail has any | choosing before the rail has any holds the choice, not the head | a policy chosen before the rail has any is held once the rail lists it |
| refuses nothing: choosing an unlisted policy holds it as evicted | choosing a policy the rail does not list holds it as evicted | choosing a policy the rail does not list holds it as evicted |
| keeps the chosen policy when a decision reorders the rail | the held policy follows a reordered rail | the held policy follows the rail to its new position |
| keeps the chosen policy when a new policy decides first | the held policy follows the rail past a new head | the held policy follows the rail to its new position |
| leaving a seed with seed(undefined) clears the replayed policy | seedFrom(undefined) drops the replayed policy, holding the head or nothing | built with a replayable row, a session holds its policy unpinned |

They were removed by commit `81972903` (`test(74-05): drop the session tests whose rules the seeded choice tests pin`). The session tests held 100 before and hold 82 after (100 - 18).

## The mutation close

The three groups were measured on `b212d96e28d487637300a8875af1e02c75d3f7cd` (the head of plan 74-06), each alone with
stdin closed, by the invocation of the base (`pnpm exec stryker run stryker.devtools.mjs --mutate <file>`), then recorded
with `node 74-mutation.mjs record close <group>`, the first with `--restart`. Nothing under `packages/` changed after it.

| File | Base detected/valid | Close detected/valid | Survived (base to close) | Ignored (base to close) |
| ---- | ------------------- | -------------------- | ------------------------ | ----------------------- |
| `SimulationSession.ts` | 325/331 | 242/248 | 6 to 6 | 11 to 4, 0 new |
| `HeldChoice.ts` | 63/63 | 63/63 | 0 to 0 | 3 to 3, 0 new |
| `SeededChoice.ts` (close-only) | none | 100/100 | 0 | 11, all examined below |

The session score fell only because the phase removed 83 killed mutants with the code it moved out. The six survivors are
the six of the base: lines 304, 307 (two), 311, 396 are the base's 395, 398 (two), 402 and 482 carried through the diff,
and the sixth, now on line 313, is the base's line 404.

## Static mutants run by hand

`SeededChoice.ts` holds 11 Ignored (static) mutants, each an arrow function or object literal evaluated when a module
const is built. They were run with `ignoreStatic: false`, by the group's own configuration spread:

```
pnpm exec stryker run <S>/stryker.examined.mjs --mutate packages/devtools/src/model/SeededChoice.ts < /dev/null
```

where `<S>/stryker.examined.mjs` is `export default { ...base, ignoreStatic: false, jsonReporter: { fileName:
"<S>/examined/mutation.json" }, htmlReporter: { fileName: "<S>/examined/index.html" } }` over `stryker.devtools.mjs`, run on
the same head. Result: 111 mutants, 111 Killed, 0 Survived, 0 NoCoverage, 0 Timeout, final score 100.00. Counts by kind,
which is what `EXAMINED` now admits: `ArrowFunction () => undefined` 10, `ObjectLiteral {}` 1.

| Line | Mutator | Replacement | Status |
| ---- | ------- | ----------- | ------ |
| 125 | ArrowFunction | `() => undefined` | Killed |
| 166 | ArrowFunction | `() => undefined` | Killed |
| 172 | ArrowFunction | `() => undefined` | Killed |
| 205 | ArrowFunction | `() => undefined` | Killed |
| 238 | ArrowFunction | `() => undefined` | Killed |
| 256 | ObjectLiteral | `{}` | Killed |
| 257 | ArrowFunction | `() => undefined` | Killed |
| 258 | ArrowFunction | `() => undefined` | Killed |
| 259 | ArrowFunction | `() => undefined` | Killed |
| 270 | ArrowFunction | `() => undefined` | Killed |
| 307 | ArrowFunction | `() => undefined` | Killed |

## A base survivor the phase moved

`compare` exits 1 on one line only: `SimulationSession.ts:313 has a new Survived mutant: ConditionalExpression -> false`.
It is not a new survivor. It is the base's line 404, `question.seed !== seedOf(policy)`, one of the six base survivors,
now `question.seed !== seed` after the phase hoisted `seedOf(choice)` into one `seed` const (the rewrite changes the
text of the line, so the scorer, which carries a base mutant to the close by its line number through the diff and
treats a rewritten line as removed, cannot pair it with its base).

No test can kill it, and none was added: a run's `question.seed` is `seedOf(choice)` at the moment the run starts, and
the only two commands that change `seedOf(choice)` are `reseed` (`seed`, `replay`) and `choosePolicy`, and each one ends in
`clearRun()`, which stops the run and sets it `Idle`, so no `Ran` or `Running` result ever holds a question whose seed
differs from the current one. The disjunct is a redundant guard, the same reason it survived at the base. Closing it
needs either the removal of that disjunct and of the question's `seed` field (a change to `SimulationSession.ts`, to the
exported `SimulationQuestion` type and to BEH-QD-322's "stale covers all three"), or a scorer rule that pairs a
rewritten line's survivor with its base; neither is a drop-closing path this plan allows, and neither was taken.

**Resolution, decided autonomously after the plan:** the disjunct stays, because BEH-QD-322 states that `stale` covers
the form, the policy and the seed, and `SimulationQuestion.seed` is a public field the characterisation reads. The scorer
gained `MOVED`, a reviewed record of open mutants a rewrite moved, read like `EXAMINED`: its one entry pairs the base
survivor at line 404, column 9 with the close survivor at line 313, column 9 and says why no test can kill it. An entry
admits its close mutant only while the base mutant is in the base record on a line the diff rewrote and the close mutant
is in the close record; any other entry is a reason to fail. Four self-test cases pin it: the moved survivor passes with
its entry, fails without it, and an entry on an unrewritten line or one the close no longer needs fails. `--self-test`
now ends `self-test: 37 passed`, and `compare` on the recorded close exits 0.

## The close on the final tree

Run on the tree after the mutation close commit, `phase_base` `b22d97f9af293734787b3f771400d6f5f6e87065`, with nothing under
`packages/` changed since the close head `b212d96e28d487637300a8875af1e02c75d3f7cd`:

- The proving grep over `SimulationSession.ts` (`makeHeldChoice|chosen\.|seedEntry|seeded = |leading\(|policyMenuOf|selectedOf|const pin = |pin\(\)|replayInput\(`) prints nothing.
- The session's code lines (comments excluded) hold one `draft = `, one `resourceText = `, one `run = { _tag: "Idle" }`, two `supersede();` and three `clearRun();`.
- `SeededChoice.ts` holds no `effect/Effect`.
- No added source line of `packages/devtools/src` (comments and import lines excluded) holds `as`, a non-null `!`, `any`, `switch (`, `Effect.fnUntraced`, `async` or `await`, `console.`, `process.env`, `Date.now`, `new Date`, `performance.now` or `Record<string, unknown>`; no added test line does, once the three `X as Y,` import-specifier lines of `SeededChoice.tst.ts` (barrel aliases, not assertions) are left out of the reading.
- No added `packages` line holds a `Stryker disable` or `Stryker restore` comment, and none passes 90 characters (counted with `perl -CS`).
- No added `packages` or `spec` line holds a decision number, plan id, requirement id, phase wording or placeholder id.
- The 73 test titles the phase added over five files are unique within their file, at most 82 characters and carry no label.
- The characterisation was committed first by `e25c8cfd` and changed afterwards only by `5022cec1`, which changed only its import lines: with import statements dropped, the file equals its first commit.
- `node scripts/check-api-surface.mjs` ends `api-surface: 941 export(s) documented across 9 package(s)`.
- `AGENTS.md`, `scripts/`, `spec/process/definitions-of-done.md` and `.changeset/` equal `phase_base`.

Every scan holds on the final tree.

## The characterisation check replaces the import-only rule (2026-11-23, code review)

The close above says the characterisation, with import statements dropped, equals its first commit. In code review the
helpers `SeededChoice.test.ts` had copied from the characterisation (`KEYS`, `rowRead`, `orphan`, `carolDraft`,
`PolicyView`, `policyView`, `listed`, `evictedOf`, `seededOf`, `zero`, `menu`, `seededEntry`, `evictedEntry`) moved into
`packages/devtools/test/simulationFixtures.ts`, so both files read one definition. Deleting those declarations from the
characterisation is more than an import change, so that rule could no longer hold, and it was replaced by
`74-characterisation-check.mjs`, which states what the rule was there to keep:

- the multiset of every `it(...)` and `it.effect(...)` call's full text, whitespace collapsed and led by its `describe`
  titles, equals the first commit's (`e25c8cfd`), so no row's title, input, expected value, body or section moved;
- every top-level helper of the first commit is still declared there with the same text, or declared at top level of
  `simulationFixtures.ts` with that text once `export` is dropped, exported and imported from it when the
  characterisation names it.

One moved helper's text changed, and the check names it in its `REVIEWED` table with both texts: `PolicyView`'s
`unseeded` is `ReadonlyArray<SimulationField>`, the type `policyView` maps the snapshot's fields to, where the
characterisation had `ReadonlyArray<string>`. It is a type, so no row's value moves with it.

Command, from the repository root: `node .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs`,
which prints `characterisation-check: 35 rows as at e25c8cfd; 21 helpers kept, 13 moved (…)`; with `--self-test` it
prints `self-test: 13 passed` (a title change, an expected-value change, a row moved to another section, a changed
moved helper, a helper changed in place, one declared nowhere, one imported from elsewhere or not exported, and an
unreviewed or unused text change each fail; an import move, a header edit, an identical helper move and a reviewed
change pass).

## Titles and session tests changed in code review (2026-11-23)

The tables above name tests by the titles they had when they were written. In code review:

- `SeededChoice.test.ts`'s `an orphan seeds no policy and answers no input` became `on an empty rail, an orphan seeds no
  policy and answers no input`, and `choosing the evicted policy again keeps the evicted sighting` became `choosing the
  evicted policy while a replay is held keeps the evicted sighting`; each row's input and expected values are unchanged.
- `seedFrom answers a new choice even for the row it holds` gave way to `seedFrom the row a choice holds answers the same
  choice and the row decoded`, `seedFrom(undefined) on a choice with no seed answers the same choice` and `seedFrom
  another row, or the held row after a choice, answers a new seed`, because `seedFrom` now answers its input for a
  seeding that changes nothing.
- `SimulationSession.test.ts` dropped `resets the resource field and any unparsed text on a re-seed` (the
  characterisation's `seeding another row replaces the policy, the draft and the resource text` pins it) and `seed with
  the entry it holds is a no-op, so an effect re-run keeps the edited form` (the characterisation's `seeding the row it
  already holds changes nothing and notifies no one`), and `every no-op command leaves the snapshot and the subscribers
  alone` became `a no-op seed, ports, source, clock, pairs or chip command leaves the snapshot alone`, without the four
  commands the characterisation's no-op rows pin. The session tests hold 80.

## The characterisation check hardened (2026-11-23, code review, second pass)

The second review found three edits that change what a row asserts or runs and that the check above passed: a
declaration added inside a `describe` body (the rows' own text is unchanged), a fixture helper the first commit
already imported (`sighting`) changed in `simulationFixtures.ts`, and one of those imports re-pointed to another
module. `74-characterisation-check.mjs` now also reads `simulationFixtures.ts` as `e25c8cfd` holds it, and fails unless:

- every top-level statement of the characterisation other than its imports is, whitespace collapsed and in order, the
  first commit's, once the 13 moved helpers are left out (29 statements), so a `describe` body and any new statement
  are compared whole; the row multiset is still compared, so a changed row is named;
- each fixture helper the first commit imported (`counted`, `entryOf`, `ran`, `sighting`, `slow`, `startRun`), each a
  moved helper reads, and each those read (`settled`, under `ran`) keeps its first text in the fixtures, and each name
  such a helper imports comes from the module it came from then;
- every name the characterisation imports keeps its first commit's module, save `PolicyChoice` and `PolicyMenu`, which
  its `IMPORT_MOVES` table moves from `SimulationSession.ts` to `SeededChoice.ts`; a name no longer imported is one a
  moved helper reads, imported by the fixtures from the same module; a newly imported name is a moved helper; and an
  unused `IMPORT_MOVES` entry fails.

`REVIEWED` still holds one entry, `PolicyView`, and the vacuous "declared nowhere else" clause is gone. On the tree it
prints `characterisation-check: 35 rows and 29 statements as at e25c8cfd; 21 helpers kept, 13 moved (…)`. Its
`--self-test` prints `self-test: 23 passed`, and each case now asserts the exact list of problems it expects, not only
pass or fail. The reviewer's three edits, made on the working tree and reverted with `git checkout --`, each exit 1:

| Edit | Problem reported |
| ---- | ---------------- |
| `const listed = …index: index + 1…` added under `describe("seeding")` | `statement 22 after the imports is not the first commit's: …` |
| `sighting`'s `count: 1` made `count: 2` in the fixtures | `sighting in the fixtures is not its first commit's text` |
| `slow` imported from `./elsewhere.ts` | `slow came from ../simulationFixtures.ts and is imported from ./elsewhere.ts here` |

A fourth, `settled`'s idle test changed in the fixtures, reports `settled in the fixtures is not its first commit's
text`.

## The characterisation check reads every import and every fixtures statement (2026-11-23, code review, third pass)

The third review found edits the check above passed: a namespace, default or side-effect import, which it never read;
an import's exported name, which it never compared (`counted as slow`); and a top-level statement of the fixtures that
is not a declaration, or a new declaration whose initialiser calls something (a `beforeEach`, a mutation of a compared
helper's value), which run in the characterisation's module graph before its rows. `74-characterisation-check.mjs`
now reads an import in every form, each binding by its local name, the name it imports, its module and whether it
imports a type, and fails unless, besides the rules above:

- every binding the characterisation imports is the first commit's in all four, save the moved helpers (imported
  under their own names from `../simulationFixtures.ts`) and `IMPORT_MOVES`, and its imports that bind no name are the
  first commit's, in order;
- every other name a moved or fixture helper reads is provided by the fixtures as the first commit provided it: an
  import alike in name, module and kind, a name that was neither imported nor declared still neither, and never a name
  the characterisation still declares, however the fixtures provide it;
- a fixture helper keeps its first text with its `export`, which absorbs the old "imported … but not exported" rule;
- every top-level statement of the fixtures is an import or a declaration of one name (a `const`, a function, a type
  or an interface); a `const` no rule compares runs nothing as the module loads; and every module the fixtures load is
  one the two files loaded at the first commit.

The check no longer has a branch for a fixture helper its first commit's fixtures do not declare (the fixed `BASE`
compiled), nor the "imported … but not exported" message. On the tree it prints `characterisation-check: 35 rows and
29 statements as at e25c8cfd; 21 helpers kept, 13 moved (…)`. Its `--self-test` prints `self-test: 49 passed`; every
message the check can give has a case asserting it exactly. Each edit below, made on the working tree and reverted with
`git checkout --`, exits 1 with exactly the problems shown:

| Edit | Problems reported |
| ---- | ----------------- |
| characterisation: `TestClock` imported from `../fakeClock.ts` | `` TestClock was imported as `* as TestClock from effect/testing/TestClock` and is imported as `* as TestClock from packages/devtools/test/fakeClock.ts` here `` |
| fixtures: `TestClock` imported from `./fakeClock.ts` | `` TestClock, which startRun reads, was imported as `* as TestClock from effect/testing/TestClock` and the fixtures import it as `* as TestClock from packages/devtools/test/fakeClock.ts` ``; `the fixtures load packages/devtools/test/fakeClock.ts, which neither file loaded at the first commit` |
| characterisation: `import "../setup.ts";` added | `the imports that bind no name were none and are packages/devtools/test/setup.ts here` |
| characterisation: `import * as Extra from "./extra.ts";` added | `Extra is imported here, and the first commit neither imports nor declares it` |
| fixtures: `import "./setup.ts";` added | `the fixtures load packages/devtools/test/setup.ts, which neither file loaded at the first commit` |
| characterisation: `counted as slow` in the fixtures import | `` slow was imported as `{ slow } from packages/devtools/test/simulationFixtures.ts` and is imported as `{ counted as slow } from packages/devtools/test/simulationFixtures.ts` here `` |
| fixtures: `emptyTimeline as ingestAll` | `` ingestAll, which entryOf reads, was imported as `{ ingestAll } from packages/devtools/src/model/Timeline.ts` and the fixtures import it as `{ emptyTimeline as ingestAll } from packages/devtools/src/model/Timeline.ts` `` |
| fixtures: `beforeEach(() => {});` appended | `a top-level statement of the fixtures is not an import or a declaration of one name: «beforeEach(() => {});»` |
| fixtures: `Object.assign(carolDraft, { action: "write" });` appended | `a top-level statement of the fixtures is not an import or a declaration of one name: «Object.assign(carolDraft, { action: "write" });»` |
| fixtures: `export const hook = beforeEach(() => {});` appended | `hook in the fixtures runs code as the module loads, and no first commit's text pins it` |

## The mutation close re-recorded after code review (2026-11-23)

The review loop changed `SimulationSession.ts` (comments around `stale`) and `SeededChoice.ts` (`seedFrom`'s no-op
rule), so all three groups were re-measured on one head, `1ae6035b49a5ccb4f7534374fd70a52ce2abbeea`, the tree after the review disposition, with
`record close session --restart`, then `held` and `choice`:

- `SimulationSession.ts` 244/248, 4 survived (base 325/331, 6): the review's tests kill two base survivors.
- `HeldChoice.ts` 63/63, as at the base.
- `SeededChoice.ts` 122/122 (close-only), 11 Ignored.

`compare` first reported the `MOVED` entry's close position stale (313) and the seed disjunct's survivor at 319:9 as
new: the review's comment on `stale` moved it six lines. The entry now names 319:9; `--self-test` ends
`self-test: 37 passed` and `compare` exits 0.

The 11 static mutants of `SeededChoice.ts` were run by hand again on this tree, `stryker.devtools.mjs` spread with
`ignoreStatic: false`, `--mutate packages/devtools/src/model/SeededChoice.ts`: 133 mutants, 133 Killed, so
`EXAMINED`'s 10 `ArrowFunction () => undefined` and 1 `ObjectLiteral {}` still hold.
