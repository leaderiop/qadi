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
