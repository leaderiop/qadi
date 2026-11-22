# Phase 71 — RED and characterisation evidence

phase_base: d147287a94a3bb3cad176e4f99bad7a0b76d8939

This file records the evidence that the phase's tests were red where they had to be and green where they had to stay.
Each plan appends its own section: the characterisation on the base (here), the regression pair and the type pins red
before the table exists, both green after it with each type guarantee gutted, and the module-state budget failing on a
planted `let`. Logs and exit statuses are kept in the scratch directory `qd71` beside the system temp directory.

## The characterisation on the base

Command, from the repository root, with stdin closed, on the phase base with no `packages/*/src` file changed
(`git diff --quiet d147287a94a3bb3cad176e4f99bad7a0b76d8939 -- packages/react/src packages/core/src` holds):

```
$ pnpm exec vitest run --project react packages/react/test/DeveloperSignalReporters.test.tsx --reporter=json --outputFile=<S>/char-01.json < /dev/null
```

Phase base: `d147287a94a3bb3cad176e4f99bad7a0b76d8939`.

Result: `35 passed, 0 failed`. The report holds exactly the 35 titles of the plan's table. The whole react project
(`pnpm exec vitest run --project react`) then passed with 613 tests, `pnpm exec tsc -p tsconfig.test.json` exited 0 with
the file in its program, oxlint was clean on the file, and `node scripts/check-house-style.mjs` read
`house-style: 567 file(s) clean (3 declared switch(es), 67 type-test file(s))` (the plan-time 566 plus this file).

No row's expectation was corrected. Every expectation of the plan's table, including the exact lines for each signal,
matched what the base emits on the first run.

One title was changed, not an expectation: rows 12 and 18 of the plan's table carry the identical title "a returning
onDropped is told the entry once in production, and nothing is written to the console" (one under `dehydrateDecisions:
onDropped`, one under `hydrateDecisions: onDropped`), so the report holds 34 distinct titles for 35 tests and the
plan's own check (35 distinct titles) cannot pass. Row 12, the dehydrating one, is titled "a returning onDropped is told
the left-out entry once in production, and nothing is written to the console", which is what its entry is (an entry
the payload left out); row 18 keeps the plan's title.
