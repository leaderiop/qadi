# Phase 65: RED evidence

## RED on the base

`phase_base`: `d1ac1df0629e95797f406c5c46da364e6542dce2`. `packages/core/src` is unchanged from it; every run below is
over the base `Admission.ts`.

### The construction pins, both tstyche passes

`NO_COLOR=1 node node_modules/tstyche/dist/bin.js packages/core/test/WalkEnvironment.tst.ts`, then the same with
`--tsconfig tsconfig.test.json`. Each pass exits 1 and ends `Tests:      2 failed, 4 passed, 6 total`.

| Pass | Title | Status | First failure line |
| ---- | ----- | ------ | ------------------ |
| 1 (`tsconfig.tstyche.json`) | only admit builds an Admitted: a constructor call outside the class is refused | failed | `Error: Unused '@ts-expect-error' directive. ts(2578)` |
| 1 (`tsconfig.tstyche.json`) | only admit builds an Admitted: an object literal of the same shape is not one | failed | `Error: Unused '@ts-expect-error' directive. ts(2578)` |
| 2 (`tsconfig.test.json`) | only admit builds an Admitted: a constructor call outside the class is refused | failed | `Error: Unused '@ts-expect-error' directive. ts(2578)` |
| 2 (`tsconfig.test.json`) | only admit builds an Admitted: an object literal of the same shape is not one | failed | `Error: Unused '@ts-expect-error' directive. ts(2578)` |

Summary line of each pass: `Tests:      2 failed, 4 passed, 6 total`.

### `pin-codes.mjs`

`node .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs` prints nothing on the base: with the two
directives blanked in memory the file raises no diagnostic, because neither the constructor call nor the object literal
is refused yet.

### `pnpm typecheck`

Exits non-zero. Its only `error TS` lines are the two unused directives:

```text
packages/core/test/WalkEnvironment.tst.ts(61,3): error TS2578: Unused '@ts-expect-error' directive.
packages/core/test/WalkEnvironment.tst.ts(67,3): error TS2578: Unused '@ts-expect-error' directive.
```

### The getter cases

`pnpm exec vitest run --project core packages/core/test/Admission.test.ts packages/core/test/LeafMatrix.test.ts`
exits 1 with 22 tests.

| Case | Title | Status | First failure line |
| ---- | ----- | ------ | ------------------ |
| E7 | E7 asked: a resource that reads differently on a second read is read once, and the flag agrees with the context | failed | `AssertionError: expected undefined to equal { id: 'doc-1' }` |
| E8 | E8 asked: an action that reads differently on a second read is read once, and the flag agrees with the context | failed | `AssertionError: expected undefined to equal 'publish'` |
| E9 | E9 row: the action is read once and the flag agrees with the context; the row stays supplied | failed | `AssertionError: expected undefined to equal 'publish'` |
| E10 | E10 row: the row is supplied whatever the question's resource reads, and the resource is read once | passed | (green on the base: preserved behaviour) |

The 18 other tests passed: `Admission.test.ts`'s seven depth and context cases and E1 to E6, and
`LeafMatrix.test.ts`'s five; with E10 that is 19 passed in all.
