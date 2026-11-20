# Phase QD-62: Flip sweep

A one-off sweep that turns each remaining negative pin (`.not.toBeCallableWith`, `.not.toBeConstructableWith`) into its positive form in a scratch copy and requires every one to fail with a TypeScript argument or assignability code, so that each pin is shown able to fail (D-10, D-11).

## Oracle

A flipped pin passes the oracle when tstyche reports its assertion with event `fail` and every primary diagnostic is a TypeScript (`source: "ts"`) code from this closed set:

TS2322, TS2345, TS2353, TS2375, TS2379, TS2554, TS2559, TS2769

Rejected: a language-service code such as 3 (the `floatingEffect` diagnostic, which would mean the pin is read by the rule and not by the type), an unresolved name (TS2304, TS2307, TS2339), a missing row, and a `pass`. The set is never widened and no row is marked by hand; a pin outside the oracle is reported and reviewed.

## Invocation

From the repository root, with the scratch scripts in `$(cd "${TMPDIR:-/tmp}" && pwd -P)/qd62-sweep` (outside the repository, never committed, deleted after use):

```
node <S>/sweep.mjs <S>/SweepReporter.mjs [file ...]
```

The script copies each tracked `*.tst.ts` holding a negative pin to `zz-flip-<name>.tst.ts` beside it (so it sits under `packages/*/test/**` and the flipped line keeps its number), replaces `.not.toBeCallableWith` / `.not.toBeConstructableWith` with the positive matcher, and runs `node node_modules/tstyche/dist/bin.js --reporters <reporter URL> zz-flip-` under `tstyche.json`'s config. That is `tsconfig.tstyche.json` (the project every `SWEEP-PROJECT` line names), the same compile `pnpm test:tstyche`'s first pass uses. The reporter reads the primary diagnostic codes from `abilityDiagnostics`, which tstyche's text output drops. The copies are removed in a `finally`.

## Exclusion

`packages/core/test/FloatingEffectPins.tst.ts` is excluded: its bare negatives pass when flipped, by design, because it pins the tool's reading of an Effect-returning call under both settings of `floatingEffect`.

## Tracer run

Two files only, `packages/core/test/Decision.tst.ts` (7 constructable `Allow`/`Deny` pins) and `packages/core/test/WalkEnvironment.tst.ts` (2 callable `admit` pins), run under `tsconfig.tstyche.json`.

| # | Pin | Subject | Form | Event | Codes |
| - | --- | --- | --- | --- | --- |
| S01 | `packages/core/test/Decision.tst.ts:31` | `Allow` | constructable | fail | TS2353 |
| S02 | `packages/core/test/Decision.tst.ts:32` | `Allow` | constructable | fail | TS2353 |
| S03 | `packages/core/test/Decision.tst.ts:36` | `Allow` | constructable | fail | TS2322 |
| S04 | `packages/core/test/Decision.tst.ts:37` | `Allow` | constructable | fail | TS2322 |
| S05 | `packages/core/test/Decision.tst.ts:42` | `Deny` | constructable | fail | TS2353 |
| S06 | `packages/core/test/Decision.tst.ts:46` | `Deny` | constructable | fail | TS2322 |
| S07 | `packages/core/test/Decision.tst.ts:47` | `Deny` | constructable | fail | TS2322 |
| S08 | `packages/core/test/WalkEnvironment.tst.ts:40` | `admit` | callable | fail | TS2554 |
| S09 | `packages/core/test/WalkEnvironment.tst.ts:41` | `admit` | callable | fail | TS2345 |

`sweep: 9 flipped pin(s) in 2 file(s), 0 outside the oracle`, exit 0, and no `zz-flip-` file left (`git status --porcelain -- packages` empty).

### The oracle's pass twin

The reporter run on `FloatingEffectPins.tst.ts` alone (`NO_COLOR=1 node node_modules/tstyche/dist/bin.js --reporters file://<S>/SweepReporter.mjs packages/core/test/FloatingEffectPins.tst.ts`) printed `SWEEP-PROJECT .../tsconfig.tstyche.json` and reported its four positive pins (lines 35, 42, 43, 44; `"not":false`) with event `pass` and no diagnostics. The same run reports line 36's negative `pass` with TS2345 and lines 61 to 63's rule-on negatives `pass` with code 3, so the oracle tells a passing positive pin from a failing flipped one, and a language-service code from a TypeScript one.
