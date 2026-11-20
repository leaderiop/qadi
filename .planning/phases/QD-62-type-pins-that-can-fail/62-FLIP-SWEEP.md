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

## Sweep

Ran 2026-11-20 on HEAD `86b80107` (branch `arch-wave-12`, after 62-01 and 62-02), under `tsconfig.tstyche.json` (the sweep script requires every `SWEEP-PROJECT` line to end with it), with `node <S>/sweep.mjs <S>/SweepReporter.mjs` and no file list. Exit 0; no `zz-flip-` file remained and `git status --porcelain -- packages` was empty.

`sweep: 87 flipped pin(s) in 27 file(s), 0 outside the oracle`

Code histogram (pins whose diagnostics include the code; the three multi-diagnostic pins S24, S28 and S30 each carry one code repeated per missing or mistyped arm, and count once): TS2322 x33, TS2345 x32, TS2554 x10, TS2353 x5, TS2379 x3, TS2559 x2, TS2375 x2. No code outside the oracle, no `pass`, no missing row, no code 3.

| # | Pin | Subject | Form | Event | Codes |
| - | --- | --- | --- | --- | --- |
| S01 | `packages/audit/test/AuditPortReply.tst.ts:33` | `AuditPortReply.Fail` | callable | fail | TS2345 |
| S02 | `packages/audit/test/AuditPortReply.tst.ts:34` | `AuditPortReply.Latch` | callable | fail | TS2345 |
| S03 | `packages/audit/test/AuditWriteOutcome.tst.ts:12` | `AuditWriteOutcome.Written` | callable | fail | TS2322 |
| S04 | `packages/audit/test/AuditWriteOutcome.tst.ts:17` | `AuditWriteOutcome.Skipped` | callable | fail | TS2322 |
| S05 | `packages/audit/test/AuditWriteOutcome.tst.ts:18` | `AuditWriteOutcome.WriteFailed` | callable | fail | TS2322 |
| S06 | `packages/audit/test/Retention.tst.ts:16` | `planPurge` | callable | fail | TS2554 |
| S07 | `packages/audit/test/Retention.tst.ts:21` | `planPurge` | callable | fail | TS2345 |
| S08 | `packages/audit/test/Retention.tst.ts:22` | `planPurge` | callable | fail | TS2345 |
| S09 | `packages/core/test/Decision.tst.ts:31` | `Allow` | constructable | fail | TS2353 |
| S10 | `packages/core/test/Decision.tst.ts:32` | `Allow` | constructable | fail | TS2353 |
| S11 | `packages/core/test/Decision.tst.ts:36` | `Allow` | constructable | fail | TS2322 |
| S12 | `packages/core/test/Decision.tst.ts:37` | `Allow` | constructable | fail | TS2322 |
| S13 | `packages/core/test/Decision.tst.ts:42` | `Deny` | constructable | fail | TS2353 |
| S14 | `packages/core/test/Decision.tst.ts:46` | `Deny` | constructable | fail | TS2322 |
| S15 | `packages/core/test/Decision.tst.ts:47` | `Deny` | constructable | fail | TS2322 |
| S16 | `packages/core/test/DecisionCache.tst.ts:46` | `GetOrCompute` | callable | fail | TS2559 |
| S17 | `packages/core/test/DecisionCache.tst.ts:47` | `GetOrCompute` | callable | fail | TS2559 |
| S18 | `packages/core/test/DecisionCache.tst.ts:48` | `GetOrCompute` | callable | fail | TS2554 |
| S19 | `packages/core/test/EvaluationEnvironment.tst.ts:47` | `evaluationEnvironment` | callable | fail | TS2345 |
| S20 | `packages/core/test/EvaluationEnvironment.tst.ts:48` | `evaluationEnvironment` | callable | fail | TS2345 |
| S21 | `packages/core/test/EvaluationEnvironment.tst.ts:49` | `evaluationEnvironment` | callable | fail | TS2322 |
| S22 | `packages/core/test/EvaluationEnvironment.tst.ts:55` | `evaluationEnvironment` | callable | fail | TS2322 |
| S23 | `packages/core/test/Explanation.tst.ts:35` | `foldExplanationCases` | callable | fail | TS2345 |
| S24 | `packages/core/test/Explanation.tst.ts:55` | `foldExplanationCases` | callable | fail | TS2322, TS2322, TS2322, TS2322, TS2322, TS2322, TS2322 |
| S25 | `packages/core/test/HydrationMetrics.tst.ts:27` | `hydrationDropMeaning` | callable | fail | TS2345 |
| S26 | `packages/core/test/HydrationMetrics.tst.ts:28` | `hydrationDropMeaning` | callable | fail | TS2345 |
| S27 | `packages/core/test/Matcher.tst.ts:33` | `foldMatcherCases` | callable | fail | TS2345 |
| S28 | `packages/core/test/Matcher.tst.ts:49` | `foldMatcherCases` | callable | fail | TS2322, TS2322, TS2322, TS2322 |
| S29 | `packages/core/test/Policy.tst.ts:102` | `foldPolicyCases` | callable | fail | TS2345 |
| S30 | `packages/core/test/Policy.tst.ts:113` | `foldPolicyCases` | callable | fail | TS2322, TS2322, TS2322, TS2322, TS2322, TS2322 |
| S31 | `packages/core/test/PortAccess.tst.ts:41` | `Params<typeof askSignature>` | callable | fail | TS2554 |
| S32 | `packages/core/test/PortAccess.tst.ts:49` | `Params<typeof askRelationship>` | callable | fail | TS2554 |
| S33 | `packages/core/test/PortAccess.tst.ts:57` | `Params<typeof askActed>` | callable | fail | TS2345 |
| S34 | `packages/core/test/PortAccess.tst.ts:58` | `Params<typeof askActed>` | callable | fail | TS2554 |
| S35 | `packages/core/test/PortAccess.tst.ts:67` | `Params<typeof readAttribute>` | callable | fail | TS2345 |
| S36 | `packages/core/test/PortAccess.tst.ts:76` | `Params<typeof askCustom>` | callable | fail | TS2554 |
| S37 | `packages/core/test/PortDefault.tst.ts:19` | `isPortDefault` | callable | fail | TS2322 |
| S38 | `packages/core/test/PortSpan.tst.ts:15` | `spanStruct` | callable | fail | TS2345 |
| S39 | `packages/core/test/PortSpan.tst.ts:22` | `spanStruct` | callable | fail | TS2322 |
| S40 | `packages/core/test/PortSpan.tst.ts:33` | `spanStruct` | callable | fail | TS2322 |
| S41 | `packages/core/test/PortSpan.tst.ts:37` | `spanStruct` | callable | fail | TS2322 |
| S42 | `packages/core/test/Ports.tst.ts:69` | `portsLayer` | callable | fail | TS2375 |
| S43 | `packages/core/test/Qadi.tst.ts:115` | `enforceProjectedLoaded` | callable | fail | TS2322 |
| S44 | `packages/core/test/Qadi.tst.ts:118` | `enforceLoaded` | callable | fail | TS2322 |
| S45 | `packages/core/test/Qadi.tst.ts:120` | `enforceProjected` | callable | fail | TS2322 |
| S46 | `packages/core/test/Qadi.tst.ts:165` | `guard` | callable | fail | TS2322 |
| S47 | `packages/core/test/UntrustedDecode.tst.ts:59` | `untrustedDecoder` | callable | fail | TS2322 |
| S48 | `packages/core/test/UntrustedDecode.tst.ts:60` | `untrustedDecoder` | callable | fail | TS2322 |
| S49 | `packages/core/test/UntrustedDecode.tst.ts:61` | `untrustedDecoder` | callable | fail | TS2322 |
| S50 | `packages/core/test/UntrustedDecode.tst.ts:71` | `untrustedDecoder` | callable | fail | TS2322 |
| S51 | `packages/core/test/UntrustedDecode.tst.ts:76` | `untrustedDecoder` | callable | fail | TS2345 |
| S52 | `packages/core/test/UntrustedDecode.tst.ts:84` | `untrustedDecoder` | callable | fail | TS2554 |
| S53 | `packages/core/test/UntrustedDecode.tst.ts:85` | `untrustedDecoder` | callable | fail | TS2345 |
| S54 | `packages/core/test/UntrustedDecode.tst.ts:86` | `untrustedDecoder` | callable | fail | TS2322 |
| S55 | `packages/core/test/UntrustedDecode.tst.ts:87` | `untrustedDecoder` | callable | fail | TS2345 |
| S56 | `packages/core/test/WalkEnvironment.tst.ts:40` | `admit` | callable | fail | TS2554 |
| S57 | `packages/core/test/WalkEnvironment.tst.ts:41` | `admit` | callable | fail | TS2345 |
| S58 | `packages/devtools/test/model/DiagnosticsStore.tst.ts:59` | `Params<typeof runDiagnostics>` | callable | fail | TS2353 |
| S59 | `packages/devtools/test/model/DiagnosticsStore.tst.ts:64` | `Params<typeof runDiagnostics>` | callable | fail | TS2353 |
| S60 | `packages/devtools/test/model/DiagnosticsStore.tst.ts:71` | `Params<typeof runDiagnostics>` | callable | fail | TS2375 |
| S61 | `packages/http/test/DecisionLogHttp.tst.ts:41` | `decisionBacklogRoute` | callable | fail | TS2322 |
| S62 | `packages/http/test/DecisionStreamRoute.tst.ts:25` | `decisionStreamRoute` | callable | fail | TS2345 |
| S63 | `packages/http/test/DecisionStreamRoute.tst.ts:35` | `sseText` | callable | fail | TS2345 |
| S64 | `packages/http/test/DecisionStreamRoute.tst.ts:36` | `sseText` | callable | fail | TS2345 |
| S65 | `packages/http/test/DecisionStreamRoute.tst.ts:37` | `sseText` | callable | fail | TS2322 |
| S66 | `packages/http/test/DevtoolsRouteAddress.tst.ts:26` | `devtoolsPath` | callable | fail | TS2345 |
| S67 | `packages/http/test/DevtoolsRouteAddress.tst.ts:32` | `devtoolsPath` | callable | fail | TS2345 |
| S68 | `packages/http/test/DevtoolsRouteAddress.tst.ts:42` | `decisionStreamRoute` | callable | fail | TS2322 |
| S69 | `packages/http/test/DevtoolsRouteAddress.tst.ts:48` | `devtoolsRoutes` | callable | fail | TS2554 |
| S70 | `packages/http/test/DevtoolsRouteAddress.tst.ts:49` | `devtoolsRoutes` | callable | fail | TS2554 |
| S71 | `packages/http/test/DevtoolsRouteAddress.tst.ts:53` | `devtoolsRoutes` | callable | fail | TS2345 |
| S72 | `packages/http/test/GuardApi.tst.ts:47` | `guardApi` | callable | fail | TS2345 |
| S73 | `packages/http/test/GuardApi.tst.ts:51` | `guardApi` | callable | fail | TS2345 |
| S74 | `packages/http/test/GuardApi.tst.ts:55` | `guardApi` | callable | fail | TS2345 |
| S75 | `packages/http/test/GuardRoute.tst.ts:133` | `addGuardedRoute("GET", "/x", readPermission, readPolicy)` | callable | fail | TS2345 |
| S76 | `packages/http/test/RequirePermission.tst.ts:45` | `requiresPermission` | callable | fail | TS2345 |
| S77 | `packages/http/test/RequirePermission.tst.ts:49` | `requiresPermission` | callable | fail | TS2345 |
| S78 | `packages/http/test/RequirePermission.tst.ts:63` | `plainEndpoint.annotate` | callable | fail | TS2345 |
| S79 | `packages/promise/test/Facade.tst.ts:25` | `qadi.filter` | callable | fail | TS2322 |
| S80 | `packages/promise/test/Facade.tst.ts:28` | `qadi.filterProjected` | callable | fail | TS2322 |
| S81 | `packages/promise/test/Facade.tst.ts:33` | `qadi.filter` | callable | fail | TS2379 |
| S82 | `packages/promise/test/Facade.tst.ts:34` | `qadi.filterProjected` | callable | fail | TS2379 |
| S83 | `packages/promise/test/Facade.tst.ts:40` | `qadi.projected` | callable | fail | TS2379 |
| S84 | `packages/react/test/DevtoolsFeed.tst.ts:23` | `useDevtoolsFeed` | callable | fail | TS2322 |
| S85 | `packages/react/test/DevtoolsFeed.tst.ts:24` | `useDevtoolsFeed` | callable | fail | TS2322 |
| S86 | `packages/react/test/DevtoolsFeed.tst.ts:25` | `useDevtoolsFeed` | callable | fail | TS2322 |
| S87 | `packages/react/test/Hydration.tst.ts:52` | `isAllowed` | callable | fail | TS2345 |
