# Phase 73 — RED and characterisation evidence

This file records the evidence the phase's tests rest on: the rendered characterisation of gate registration shown green
on the base, and the update half of the reconcile shown RED once against the base, which has no update. The
characterisation's inputs and expected values are fixed for the rest of the phase.

## The characterisation on the base

Command (from the repository root, stdin closed, run three times, each alone):

```
pnpm exec vitest run --project react packages/react/test/GateRegistration.characterisation.test.tsx --reporter=json --outputFile=<scratch>/char-01-<n>.json
```

Phase base: `1dbaf1a932109af41278b9b56892083c6ec40913` (no `packages/react/src` file differs from it when the runs were
made).

Result: `19 passed, 0 failed`, three runs out of three, 19 distinct titles under `one guard`, `a grouped hook` and
`off means absent`.

No row was corrected. Every expected value the plan reasoned from the code, the registration orders and each notification
count included, is the value the base gave on its first run.

## The update half on the base

Command (from the repository root, stdin closed), run against an uncommitted scratch test that was deleted after the run
and appears in no commit:

```
pnpm exec vitest run --project react packages/react/test/ReconcileUpdate.scratch.test.ts --reporter=json --outputFile=<scratch>/red-update.json
```

Head: `0ba19ee4526fa27452457e41716c2e1686e129dc` (no `packages/react/src` file differs from the phase base
`1dbaf1a932109af41278b9b56892083c6ec40913`).

Result: `0 passed, 2 failed`.

Failing titles, each calling the base `reconcile(writer, nothing, [identity], [undefined])` and then
`reconcile(writer, first, [the same identity], [{ policy, resource: undefined, state }])` with the writer's log cleared
between the two calls:

- `a kept entry is told its new state` (state `Allowed`)
- `a kept entry is told its state when unchanged` (state `Pending`)

First failure line, verbatim:

```
AssertionError: expected [] to deeply equal [ [ 'update', 'a', 'Allowed' ] ]
```

The base `reconcile` tells a kept entry nothing: it calls only `register` and `unregister`, so the log is empty where the
update half expects `["update", "a", <state>]`. The second title fails the same way with `'Pending'` in place of
`'Allowed'`.

## The keyed reconcile green

Command (from the repository root, stdin closed):

```
pnpm exec vitest run --project react packages/react/test/GateWriter.reconcile.test.ts packages/react/test/GateRegistration.characterisation.test.tsx --reporter=json --outputFile=<scratch>/green-03.json
```

Head: `0a5c5db47ece4f429c0e3320ff62fedcd3a27cab`.

Result, per file:

- `GateWriter.reconcile.test.ts`: `22 passed, 0 failed`
- `GateRegistration.characterisation.test.tsx` (the file is unchanged since its own commit): `19 passed, 0 failed`

The two update-half cases that were red on the base, `tells the handle of a kept entry the wanted state` and
`tells a kept handle its state even when unchanged, leaving equality to it`, now pass: the keyed `reconcile` calls
`update` on the kept handle with the wanted state, so the log reads `["update", "a", "Allowed"]` and
`["update", "a", "Pending"]` where the base's log was empty.

## Each type guarantee and rule gutted once

Each gut is a scratch edit to `packages/react/src/GateWriter.ts`, applied alone, run, saved, and reverted with
`git checkout -- packages/react/src/GateWriter.ts` before the next; `git status --porcelain -- packages` printed nothing
after each revert and after the last. None was committed. The type pins and the hook rows were committed and green
before the first gut (head `b162f6a8ae4ad4b52de4c913a4facaa75311dc33`). The tstyche guts fail under both compiles; the
first failure line below is the first one of the first pass.

### With the wanted map widened to an array

Edit: `reconcile`'s `wanted` parameter also accepts `ReadonlyArray<GateWanted>`, read through
`"get" in wantedIn ? wantedIn : new Map<string, GateWanted>()`, so the source compiles.

```
pnpm test:tstyche GateWriter.reconcile
```

Result: `1 failed, 4 passed` (the title `an array of wanted registrations is refused`). First failure line, verbatim:

```
Error: Unused '@ts-expect-error' directive. ts(2578)
```

at `./packages/react/test/GateWriter.reconcile.tst.ts:48:5`, the directive above `wantedArray`.

### With an id on the identity

Edit: `readonly id: string;` added to `GateIdentity`.

```
pnpm test:tstyche GateWriter.reconcile
```

Fails three pins. First failure line, verbatim:

```
Error: Property 'id' is missing in type '{ kind: "Can"; atom: {}; wraps: true; policy: Policy; resource: undefined; marker: { readonly current: HTMLSpanElement | null; }; }' but required in type 'GateIdentity'. ts(2741)
```

The other two: `Unused '@ts-expect-error' directive. ts(2578)` at `:74:5` (the id-literal directive), and
`Type 'keyof GateIdentity' is not the same as type '"kind" | "atom" | "wraps" | "policy" | "resource" | "marker"'.`

### With the index-aligned type exported again

Edit: an exported interface named `GateCurrent` appended to `GateWriter.ts`.

```
pnpm test:tstyche GateWriter.reconcile
```

Fails the module-level directive. First failure line, verbatim:

```
Error: Unused '@ts-expect-error' directive. ts(2578)
```

at `./packages/react/test/GateWriter.reconcile.tst.ts:27:1`, the directive above the re-export of `GateCurrent`.

### With a state on Registered

Edit: an optional `readonly state?: GateRenderState;` added to `Registered`, optional so the body compiles.

```
pnpm test:tstyche GateWriter.reconcile
```

Fails the field-set title `GateIdentity, GateWanted and Registered hold exactly their fields`. First failure line,
verbatim:

```
Error: Type 'keyof Registered' is not the same as type '"identity" | "handle"'.
```

at `:85:40`.

### Without the rollback

Edit: the `catch` of `reconcile` is `throw error;` and nothing else, so a throw leaves what the call registered.

```
pnpm exec vitest run --project react packages/react/test/GateWriter.reconcile.test.ts packages/react/test/GateWriter.test.tsx --reporter=json --outputFile=<scratch>/gut-rollback.json
```

Result: `29 passed, 3 failed`, exactly these titles, each with its first failure line:

- `a register that throws rolls back what the call registered, then rethrows it`:
  `AssertionError: expected [ [ 'register', 'a', …(2) ], …(2) ] to deeply equal [ [ 'register', 'a', …(2) ], …(4) ]`
- `a rollback that also throws joins the throw of the step in one AggregateError`:
  `Error: expected an AggregateError`
- `a reconcile that throws leaves nothing registered once the hook unmounts`:
  `AssertionError: expected [ { id: 'b', kind: 'useCan', …(4) } ] to deeply equal []`

The third is the hook-level row: without the rollback, `b` stays registered after the boundary unmounts the hook,
because the hook never held a handle for it.

### With registration before unregistration

Edit: the pass that registers the wanted ids with a changed or new identity runs before the pass over `live`, which
then updates or unregisters.

```
pnpm exec vitest run --project react packages/react/test/GateWriter.reconcile.test.ts packages/react/test/GateWriter.test.tsx --reporter=json --outputFile=<scratch>/gut-order.json
```

Result: `27 passed, 5 failed`, these titles, each with its first failure line:

- `on a real registry a changed identity keeps its id and reports no collision`:
  `AssertionError: expected [ [ 'a~1', 'Allowed' ] ] to deeply equal [ [ 'a', 'Allowed' ] ]`
- `registers a new id and calls nothing else`:
  `AssertionError: expected [ [ 'register', 'b', …(2) ], …(1) ] to deeply equal [ [ 'update', 'a', 'Pending' ], …(1) ]`
- `calls each live update or unregister in order, then each registration`:
  `AssertionError: expected [ [ 'register', 'd', …(2) ], …(4) ] to deeply equal [ [ 'update', 'a', 'Pending' ], …(4) ]`
- `re-registers when only atom, kind, wraps or marker changed, updating its sibling`:
  `AssertionError: atom: expected [ [ 'register', 'a', …(2) ], …(2) ] to deeply equal [ [ 'unregister', 'a' ], …(2) ]`
- `a throw leaves an unregistered entry in live; its second unregister is a no-op`:
  `AssertionError: expected [ …(2) ] to deeply equal []`

The first is the one the guarantee is about: registering first collides with the entry about to be unregistered, so the
registry disambiguates the id to `a~1`.

## The type pins and the hook rows green

Commands, from the repository root with stdin closed, on the clean tree (head
`b162f6a8ae4ad4b52de4c913a4facaa75311dc33`, `git status --porcelain -- packages` empty):

```
pnpm test:tstyche GateWriter.reconcile
```

Result: both passes, `5 passed` tests, `7 passed` assertions, `3 matched` suppressed errors.

```
pnpm exec vitest run --project react packages/react/test/GateWriter.reconcile.test.ts packages/react/test/GateWriter.test.tsx
```

Result: `2 files passed, 32 tests passed` (22 in the reconcile file, 10 in `GateWriter.test.tsx`).

`pnpm typecheck` clean; `node scripts/check-house-style.mjs` reads `70 type-test file(s)`; no budget changed.

## Where each moved registry case is pinned now

Three cases of `packages/react/test/GateRegistry.test.tsx` stated a reconcile rule through rendering. Each left that
file only after its reconcile test and its characterisation row were seen passing in the same run as the trimmed
file. Trim commit: `104ccffd1878f457451e5216ab0496e7ffefa1c5`.

| Case that left `GateRegistry.test.tsx` | Reconcile test (`GateWriter.reconcile.test.ts`) | Characterisation row (`GateRegistration.characterisation.test.tsx`) |
|----------------------------------------|-------------------------------------------------|---------------------------------------------------------------------|
| `does NOT re-register on a render with a fresh, structurally equal policy and resource (ticket 141)` | `keeps unchanged identities with fresh policy objects, calling only update` | `a re-render with a fresh equal policy and resource notifies nothing` |
| `unregisters exactly the instance whose key was removed` | `unregisters a dropped id and registers nothing` | `removing a key unregisters that entry alone and keeps its sibling` |
| `does not re-register when an equal record is rebuilt each render` | `reconciling the same input twice keeps every entry and calls only update` | `an equal record rebuilt each render notifies nothing` |

Command, from the repository root with stdin closed, on the trimmed tree:

```
pnpm exec vitest run --project react packages/react/test/GateRegistry.test.tsx \
  packages/react/test/GateWriter.reconcile.test.ts \
  packages/react/test/GateRegistration.characterisation.test.tsx --reporter=json
```

Result for each replacement: `passed` (all six titles above).

`GateRegistry.test.tsx: 37 passed, 0 failed`

The 37 titles are the 40 of the file before the trim minus the three above, in the same order. The whole react
project passes (653 tests), `pnpm typecheck` and oxlint on the file are clean, and `packages/react/src`, the
characterisation and `packages/react/test/support` are unchanged.

## The close on the final tree

Head scanned: `f109881ba2519d77b7c41c1c58bfd16562374655`. Nothing under `packages/` differs from the head the mutation
close was measured on (`86032b43e7510a912df2d47d5c168d80f152c463`).

| Scan | Command, from the repository root | Result |
|------|------------------------------------|--------|
| the proving grep | `grep -nE "states\.join\|Record\.values\|stableRef\|statesRef\|latest\.current\|GateCurrent\|wanted\.find\|current\[i\]\|a\.id === b\.id\|\?\? \"Pending\"\|identities\.every\|wanted\.set\(" packages/react/src/useGate.ts packages/react/src/GateWriter.ts` | no output |
| the hook's shape | `grep -cE "useEffect\(" packages/react/src/useGate.ts` and `grep -cE "= useRef" packages/react/src/useGate.ts` | 2 effects, 2 refs; `Record.values` does not occur (the proving grep covers it) |
| added source lines | `git diff -U0 <phase_base> -- packages/react/src`, comments and imports dropped, scanned for `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`, `await`, `console.`, `process.env`, `Date.now`, `new Date`, `performance.now`, `Record<string, unknown>` | no hit |
| added test lines | the same over `packages/react/test`, for `as`, `!`, `any`, `switch`, `Record<string, unknown>` | no hit |
| suppression comments | `git diff -U0 <phase_base> -- packages`, for a mutation-suppression comment | no hit |
| line width | every added `packages` line, length over 90 columns | none |
| labels | every added `packages` and `spec` line, for a decision number, plan id, requirement id, case label or phase-relative wording | one hit, fixed in `f109881b` (below), none after |
| the characterisation | `git log --format=%h <phase_base>..HEAD -- packages/react/test/GateRegistration.characterisation.test.tsx` | one commit, `2680ab4d` |
| the api surface | `node scripts/check-api-surface.mjs` | `api-surface: 941 export(s) documented across 9 package(s)` |
| untouched files | `git diff --quiet <phase_base> -- spec/overview.md AGENTS.md scripts spec/process/definitions-of-done.md .changeset` | equal to the base |

The one label hit was the added line of ADR-QD-111's amendment that named the decisions-table row it points at by the
row's own label. It now says "its row in the table above"; the older amendment's line naming the row is not an added line.

Titles added since `<phase_base>`, each unique in its file, at most 90 characters, with no label (file, count, longest):

| File | Titles added | Longest |
|------|--------------|---------|
| `GateWriter.reconcile.test.ts` | 17 | 80 |
| `GateWriter.test.tsx` | 2 (`an unchanged state makes no notification and keeps the id`, 57; `a reconcile that throws leaves nothing registered once the hook unmounts`, 72) | 72 |
| `GateRegistration.characterisation.test.tsx` | 19 | 80 |
| `GateWriter.reconcile.tst.ts` | 5 | 65 |
| `GateRegistry.test.tsx` | 0 (37 titles, three moved out) | none |

RECN-03 is closed under the reading of ADR-QD-186: one registration effect beside the writer-keyed teardown (Decision item 7).

## Review amendments (2026-11-23)

Earlier sections above are the record as it stood when written. Code review changed the following, and the sections
above are left as they were.

### The rollback was removed in code review

`reconcile` no longer carries the rollback, the `made` list or the `AggregateError`. No writer this package builds can
throw: `buildGateRegistry`'s `changed()` isolates every listener, `update` and `unregister` are idempotent plain `Map`
and `Set` writes, and both callers (`QadiAtoms.ts` and `makeGateRegistry`) hand it a reporter resolved through
`reporterFor`, which contains a supplied reporter's throw. The rule defended a state nothing can reach, and it was not
the atomic rule ADR-QD-186 said it was, because a throw after an earlier unregister left that unregister applied.
ADR-QD-186 decision 6 is now the writer's contract. Its tests went with it: the four reconcile tests under
`reconcile: when a step throws` (`a register that throws rolls back what the call registered, then rethrows it`,
`a throwing unregister or update stops the steps after it and rethrows it`, `a rollback that also throws joins the
throw of the step in one AggregateError`, `a throw leaves an unregistered entry in live; its second unregister is a
no-op`) and the hook row `a reconcile that throws leaves nothing registered once the hook unmounts`. The gut rows above
that name `a throw leaves an unregistered entry in live; its second unregister is a no-op` describe a test that no
longer exists. The contract is pinned on the real registry in `GateRegistry.store.test.ts`.
