# Feature Research

**Domain:** Tech-debt resolution for an Effect-native authorization library (milestone v1.7 "Arch Wave 12", phases 62-68)
**Researched:** 2026-11-20 at base `8b22bd66` (branch `arch-wave-12`)
**Confidence:** HIGH for repo facts (each cited file:line; probes run read-only, files deleted, `git status` unchanged). MEDIUM where marked "unverified".

This milestone adds no product features. Each phase's outcome is treated as a "feature": a change a verifier can observe with a command, a test or a gate result. Decisions D1-D5 are locked and are not reopened here. Where research found that a premise in `_WAVE12-CONTEXT.md` is wrong or incomplete, it is listed in "Findings that change a requirement" so the requirements step can word the requirement correctly.

## Findings that change a requirement (read first)

| # | Finding | Evidence | Effect on requirements |
|---|---------|----------|------------------------|
| F1 | There are **81** `not.toBeCallableWith` call sites, not 86. The other 5 grep hits are comments (`DecisionCache.tst.ts:13`, `PortAccess.tst.ts:6` and `:35`, `PortSpan.tst.ts:5`, `Qadi.tst.ts:171`). The "81 failed when flipped" probe equals exactly the 81 real pins. | `grep -rn 'not\.toBeCallableWith' packages features scripts` = 86 lines; 5 are `*`/`//` lines. | The budget gate must count code tokens only, with comments stripped, or it will say 86 and never match. Use 81 (or 80 after Phase 62's rewrite) as the expected total. |
| F2 | Only **one** pin is genuinely vacuous today: `packages/core/test/DecisionLog.tst.ts:30` (`makeDecisionLog` returns `Effect.Effect<DecisionLog>`). 12 more pins are Effect-returning subjects already wrapped in the `Params<F>` workaround (`DecisionCache.tst.ts` 3, `PortAccess.tst.ts` 6, `DiagnosticsStore.tst.ts` 3). The other 68 have non-Effect, non-Stream subjects. | Probe A (below) and the passing positive controls. Full list in the Phase 62 inventory. | Phase 62 is "rewrite 1 pin, add controls to 11, add a gate and a characterisation test", not "rewrite 81". |
| F3 | The vacuity is exactly: subject returns `Effect` or `Stream`. `Layer`, `Result`, `Option`, `Promise`, plain values, functions, `Schema` and `Context` are all honest. | Probe A: 10 return types tried, only `Effect` and `Stream` let a negative pin pass with valid args. | The gate rule and the characterisation test should name Effect and Stream, not "Effect-returning" alone. |
| F4 | **Root cause is the `floatingEffect` diagnostic** of `@effect/language-service`, reported on tstyche's synthesized call. With `"floatingEffect": "off"` in a tstyche-only tsconfig, valid-arg negative pins on Effect/Stream subjects fail as they should, and the whole suite still passes (65 real files). | Probe B: a temp `tsconfig.zzfeat62.json` extending `tsconfig.test.json` plus a temp `tstyche` config; deleted afterwards. | An alternative to per-pin rewriting exists (see Phase 62 differentiators). It is not a locked decision either way, so the planner must choose. |
| F5 | `scripts/check-house-style.mjs` `collect()` **excludes `.tst.ts`** (line 889) and its per-line `strip()` skips block-comment lines only via a `*` prefix check inside the main loop (lines 1003-1021). A `.tst.ts` budget needs its own walk, as `[no-numbering-placeholder]` does (lines 2098-2127). | Source read. | Phase 62's gate is a new block, not an extra budget entry in an existing loop. |
| F6 | `DiagnosticsOptions` has **no schedule**: it has `layer`, `collector`, `intervalMillis` (`DiagnosticsStore.ts:201-224`). The context's "diagnostics feed with an immediate schedule" must be read as "an `intervalMillis`, with the first sample read at once". | `runDiagnostics` reads once, then `Schedule.spaced(intervalMillis)` (`DiagnosticsStore.ts:251-254`). | Phase 63 probe states `makeDiagnosticsFeed({})` or `{ intervalMillis }`, then fixed `yieldNow` turns, then closes the scope. |
| F7 | `DecisionCacheShape` has **three** members: `getOrCompute`, `size`, `clear` (`DecisionCache.ts:38-130`). A "typed host cache" must delegate all three, e.g. `{ ...inner, getOrCompute }`. | Source read. | Phase 63 fixture shape. |
| F8 | A **private constructor alone does not stop forgery by object literal**: `const forged: A<"x"> = { source: "x", n: 1 }` compiles against a class with a private constructor; adding a `private` instance member makes it a compile error. | Probe C with `tsc 6.0.3 --strict` (scratch file, deleted). | Phase 65's goal "only `admit` can build an `Admitted`" is only true with a private instance member too. See Phase 65. |
| F9 | `packages/audit/src/CircuitBreaker.ts:484` has an unrelated `new Admitted({ probe, generation, attempt })`. | grep. | Any Phase 65 grep or gate must be scoped to `packages/core/src/Admission.ts`. |
| F10 | D3 says port cards derive "from the timeline feed". But `portCards(input: ServicesInput)` reads `wiring`, `activity`, `portCalls` and an `unsampled` flag (`PortCards.ts:28-35`), which are the **diagnostics** reading's fields (`DiagnosticsStore.ts:75-87`), not timeline data. `isUnsampled` is not exported. | Source read; `index.ts` grep. | The ADR-QD-173 amendment must name the diagnostics feed (`makeDiagnosticsFeed(...).getSnapshot().reading` plus `status`). Flag to the owner before wording it. A consumer also cannot reproduce the card wording, which stays private. |
| F11 | A throw rethrown after the loop (D1) **still escapes whatever published**. So the README claim "it can leave a feed's status wrong with nothing running" stays true; only "later listeners are skipped" goes away. | `ExternalStore.ts:34-36`; `README.md:164-169`; `DiagnosticsFeed.ts:97`. | Phase 64 doc edits must remove "not isolated" and keep "a listener should not throw" in a weaker, accurate form. |
| F12 | Phase 67's "iterate until both orderings were observed" would **cut coverage** if it stops at the first flip: today's sweep also runs gaps 39-48 and asserts no recompute on every run (`DecisionCache.test.ts:1250-1296`). | Test read. | Require a margin past the flip, or keep the full "no recompute" assertion per run. |
| F13 | Over-width debt is wider than named: `SinkCodec.ts` has 27 lines over 100 columns, `decision-log.steps.test.ts` 15, ADR-QD-174 about 38. AGENTS.md section 17 gates nothing on width. | `awk 'length>100'`. | Out-of-scope line must say "the named lines only". |
| F14 | Three Phase 68 items are already done or moved: `DecisionLog.ts` `ingest` doc already cites ADR-QD-171 (`DecisionLog.ts:129`); `QadiAtoms.test.ts:570` no longer says "Stamped by the sink"; the `DecisionLog.ts:215` line moved. | grep. | Done-state for those is "confirmed, no edit", recorded in the CCR. |

## Feature Landscape

Format per phase: observable done-state, table stakes, differentiators, anti-features, complexity, dependencies. "Gate" means a command in `pnpm check` (`package.json:41`).

---

## Phase 62: Type pins that can fail (ARCH-109)

**Audit item:** 60b, upgraded. **Complexity:** MEDIUM (gate and characterisation) with a small rewrite. **Depends on:** nothing. Every later phase writes type pins, so this goes first.

### Observable done-state

1. `npx tstyche` (run as `pnpm test:tstyche`) is green, including a new characterisation file that pins the known-wrong behaviour: a negative `not.toBeCallableWith` on an `Effect`-returning and a `Stream`-returning function with **valid** arguments passes, and the `Params<F>` form with the same valid arguments fails. (If the root-cause option is taken, the same file instead asserts the positive form passes on both, which fails loudly if `floatingEffect` ever comes back.)
2. `packages/core/test/DecisionLog.tst.ts:30` no longer uses `not.toBeCallableWith` on `makeDecisionLog`. It states "`environment` is required" through the parameter type, for example `expect<{ readonly capacity: number }>().type.not.toBeAssignableTo<Parameters<typeof makeDecisionLog>[0]>()` plus the positive `{ environment: string }`. Broken once by hand (make `environment` optional in `DecisionLog.ts:189`) it must go red; the break is reverted.
3. `node scripts/check-house-style.mjs` (inside `pnpm lint`) fails if a `.tst.ts` file's count of `not.toBeCallableWith` code tokens differs from `NOT_CALLABLE_PIN_BUDGET[file]`, both directions, and for an unlisted file. The expected total after the rewrite is **80** in **26** files (`DecisionLog.tst.ts` drops out).
4. AGENTS.md section 6 has a paragraph and table for the budget, and a `[not-callable-pin-table]` style check (like `[untrusted-decode-table]`, `check-house-style.mjs:1596-1606`) keeps table and budget equal.
5. Every pin still using the bare form has a **positive control**: a `toBeCallableWith` on the same subject in the same `test` block that varies only the intended argument. Eleven pins lack one today (list below).
6. `git diff <phase-base> --stat` shows only `*.tst.ts`, `scripts/check-house-style.mjs`, `AGENTS.md`, `spec/*` records. No `packages/*/src`, no changeset.

### Table stakes

| Requirement | Why | Notes |
|-------------|-----|-------|
| Rewrite `DecisionLog.tst.ts:30` | The only unguarded vacuous pin | Pattern already in repo: `DecisionStream.tst.ts:49-56` (`Parameters<typeof f>[1]` and `not.toBeAssignableTo`), `PortAccess.tst.ts:33-37` (`Params<F>`). |
| Characterisation `.tst.ts` | Makes the tool's wrong behaviour a tested fact, so an upgrade that fixes it is noticed | Pin both `Effect` and `Stream`; tstyche 7.2.5, TS 6.0.3. |
| `NOT_CALLABLE_PIN_BUDGET` and AGENTS.md section 6 paragraph | Without a gate the next author repeats the mistake; the existing comments at `Qadi.tst.ts:171` and `DecisionStream.tst.ts:49` prove it was rediscovered at least three times | Own walk over `packages/*/test/**/*.tst.ts`; strip comments, including multi-line `/* */` and ` * ` lines. |
| Positive control for the 11 uncontrolled pins | A negative pin can fail for an unintended reason (wrong first argument, missing import) and still look green | List below. |
| Hand-break evidence | "Rewritten and broken once by hand to show it fails" is a stated requirement | Record the break and the red output in the phase SUMMARY; one rewritten pin, plus a sample of the bare pins if the planner wants stronger evidence. |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| **Root-cause fix:** a tstyche-only tsconfig (for example `tsconfig.tstyche.json` extending `tsconfig.test.json`, with the same plugin block and `"diagnosticSeverity": { "unstableApiUsage": "off", "floatingEffect": "off" }`), wired in `tstyche.json` | Makes all 81 pins honest at once and retires the `Params<F>` workaround; `pnpm typecheck` keeps `floatingEffect` on for `.test.ts` files because `tsc -p tsconfig.test.json` is unchanged | LOW code, MEDIUM judgement | Probed: 65 of 65 real files stay green, "Suppressed: 55 matched" unchanged. Risk: `floatingEffect` is then off for `.tst.ts` only; a floating Effect inside a type test is not a real defect. Needs an owner or planner call, because the context specified a budget gate, not a config change. If chosen, the budget still has value as a guard that the config is not undone, but the characterisation file (positive control on an Effect function) already does that more cheaply. |
| Pin 1 is exposed by an automated classifier | A reviewer can re-derive "which pins are vacuous" without reading 81 declarations | LOW | Flip each pin to the positive form; for a non-Effect subject the failure text is a TS argument error, for an Effect subject it is the floating-Effect diagnostic. Unverified that tstyche prints the diagnostic text; the positive-control oracle used below does not need it. |
| One shared `Params<F>` helper | Three files copy the same one-line type (`DecisionCache.tst.ts:27`, `PortAccess.tst.ts:38`, `DiagnosticsStore.tst.ts:25`) | LOW | Test packages do not share a support module across packages; do not create a cross-package one just for this. Leave the three copies. |

### Anti-features

| Anti-feature | Why requested | Why bad | Instead |
|--------------|---------------|---------|---------|
| Rewriting all 81 pins "to be safe" | Looks thorough | 68 are honest; churn hides the one real change and breaks 12 already-correct workarounds | Rewrite one, control eleven, gate the rest. |
| Widening a subject's type to satisfy a pin | Makes a pin pass | Weakens the API under test | Fix the pin, never the source (the phase touches no `src`). |
| `not.toBeConstructableWith` sweep | Same family of tool | `Decision.tst.ts` has 9 on plain data classes, which are honest; not in scope | Leave. Only note: a class whose instance is yieldable (a `Data.TaggedError`) could hit the same floating diagnostic; none is pinned today (unverified, no pin exists). |
| Filing an upstream tstyche or language-service issue | Natural follow-up | It posts outside the repo; the owner has not approved it | Record the repro in the characterisation file's header and stop. |
| Editing archived `61-scan.mjs` style scripts or old phase files | Convenience | Archived phases are history | Not touched in this phase. |
| Counting `not.toBeCallableWith` with a plain `grep` | Simple | Counts 86, includes comments, and a multi-line pin is one token | Strip comments, then count the token. |

### Phase 62 pin inventory (exact, 81 code pins in 27 files; 5 comment-only hits excluded)

Return family is read from the subject's declaration. "Pos" is a passing `toBeCallableWith` on the same subject in the same file, which proves the subject is not Effect/Stream (such a positive fails under the floating diagnostic; the full suite is green at this HEAD: 65 of 65 real files). "none" = no in-file positive.

| File:line | Subject | Declared return | Pos |
|-----------|---------|-----------------|-----|
| `packages/audit/test/AuditPortReply.tst.ts:30` | `AuditPortReply.Fail` | plain (tagged-enum constructor) | 32 |
| `packages/audit/test/AuditPortReply.tst.ts:31` | `AuditPortReply.Latch` | plain | **none** |
| `packages/audit/test/AuditWriteOutcome.tst.ts:12` | `AuditWriteOutcome.Written` | plain | 13 |
| `packages/audit/test/AuditWriteOutcome.tst.ts:17` | `AuditWriteOutcome.Skipped` | plain | 19 |
| `packages/audit/test/AuditWriteOutcome.tst.ts:18` | `AuditWriteOutcome.WriteFailed` | plain | **none** (sibling `Skipped` takes the same payload, 19) |
| `packages/audit/test/Retention.tst.ts:16` | `planPurge` | `Result` | 17 |
| `packages/audit/test/Retention.tst.ts:21` | `planPurge` | `Result` | 17 |
| `packages/audit/test/Retention.tst.ts:22` | `planPurge` | `Result` | 17 |
| `packages/core/test/DecisionCache.tst.ts:44` | `Params<getOrCompute>` | Effect, already wrapped | 37-40 |
| `packages/core/test/DecisionCache.tst.ts:45` | `Params<getOrCompute>` | Effect, already wrapped | 37-40 |
| `packages/core/test/DecisionCache.tst.ts:46` | `Params<getOrCompute>` | Effect, already wrapped | 37-40 |
| `packages/core/test/DecisionLog.tst.ts:30` | `makeDecisionLog` | **`Effect.Effect<DecisionLog>`, bare: VACUOUS** | **none** |
| `packages/core/test/EvaluationEnvironment.tst.ts:47` | `evaluationEnvironment` | `Layer` | 65, 71 |
| `packages/core/test/EvaluationEnvironment.tst.ts:48` | `evaluationEnvironment` | `Layer` | 65, 71 |
| `packages/core/test/EvaluationEnvironment.tst.ts:49` | `evaluationEnvironment` | `Layer` | 65, 71 |
| `packages/core/test/EvaluationEnvironment.tst.ts:55` | `evaluationEnvironment` | `Layer` | 65, 71 |
| `packages/core/test/Explanation.tst.ts:35` | `foldExplanationCases` | `R` (generic result) | **none** |
| `packages/core/test/Explanation.tst.ts:46` | `foldExplanationCases` | `R` | **none** |
| `packages/core/test/HydrationMetrics.tst.ts:27` | `hydrationDropMeaning` | plain | 26 |
| `packages/core/test/HydrationMetrics.tst.ts:28` | `hydrationDropMeaning` | plain | 26 |
| `packages/core/test/Matcher.tst.ts:33` | `foldMatcherCases` | `R` | **none** |
| `packages/core/test/Matcher.tst.ts:42` | `foldMatcherCases` | `R` | **none** |
| `packages/core/test/Policy.tst.ts:102` | `foldPolicyCases` | `R` | 125 |
| `packages/core/test/Policy.tst.ts:113` | `foldPolicyCases` | `R` | 125 |
| `packages/core/test/PortAccess.tst.ts:41` | `Params<askSignature>` | Effect, already wrapped | 45 |
| `packages/core/test/PortAccess.tst.ts:49` | `Params<askRelationship>` | Effect, already wrapped | 53 |
| `packages/core/test/PortAccess.tst.ts:57` | `Params<askActed>` | Effect, already wrapped | 62, 63 |
| `packages/core/test/PortAccess.tst.ts:58` | `Params<askActed>` | Effect, already wrapped | 62, 63 |
| `packages/core/test/PortAccess.tst.ts:67` | `Params<readAttribute>` | Effect, already wrapped | 71, 72 |
| `packages/core/test/PortAccess.tst.ts:76` | `Params<askCustom>` | Effect, already wrapped | 80 |
| `packages/core/test/PortDefault.tst.ts:19` | `isPortDefault` | `boolean` | 12, 13, 15 |
| `packages/core/test/Ports.tst.ts:69` | `portsLayer` | `Layer` | 67, 68 |
| `packages/core/test/PortSpan.tst.ts:15` | `spanStruct` | plain object | 26 |
| `packages/core/test/PortSpan.tst.ts:22` | `spanStruct` | plain object | 26 |
| `packages/core/test/PortSpan.tst.ts:33` | `spanStruct` | plain object | 26 |
| `packages/core/test/PortSpan.tst.ts:37` | `spanStruct` | plain object | 26 |
| `packages/core/test/Qadi.tst.ts:115` | `enforceProjectedLoaded` | curried function | **none** |
| `packages/core/test/Qadi.tst.ts:118` | `enforceLoaded` | curried function | 124 |
| `packages/core/test/Qadi.tst.ts:120` | `enforceProjected` | curried function | 123 |
| `packages/core/test/Qadi.tst.ts:164` | `guard` | curried function | 166, 167 |
| `packages/core/test/UntrustedDecode.tst.ts:59` | `untrustedDecoder` | `UntrustedDecoder` object | 58, 70, 75, 88-91 |
| `packages/core/test/UntrustedDecode.tst.ts:60` | `untrustedDecoder` | object | same |
| `packages/core/test/UntrustedDecode.tst.ts:61` | `untrustedDecoder` | object | same |
| `packages/core/test/UntrustedDecode.tst.ts:71` | `untrustedDecoder` | object | same |
| `packages/core/test/UntrustedDecode.tst.ts:76` | `untrustedDecoder` | object | same |
| `packages/core/test/UntrustedDecode.tst.ts:84` | `untrustedDecoder` | object | same |
| `packages/core/test/UntrustedDecode.tst.ts:85` | `untrustedDecoder` | object | same |
| `packages/core/test/UntrustedDecode.tst.ts:86` | `untrustedDecoder` | object | same |
| `packages/core/test/UntrustedDecode.tst.ts:87` | `untrustedDecoder` | object | same |
| `packages/core/test/WalkEnvironment.tst.ts:40` | `admit` | `Result` | **none** (calls at 36-37 compile, not a `toBeCallableWith`) |
| `packages/core/test/WalkEnvironment.tst.ts:41` | `admit` | `Result` | **none** |
| `packages/devtools/test/model/DiagnosticsStore.tst.ts:57` | `Params<runDiagnostics>` | Effect, already wrapped | 49 |
| `packages/devtools/test/model/DiagnosticsStore.tst.ts:62` | `Params<runDiagnostics>` | Effect, already wrapped | 49 |
| `packages/devtools/test/model/DiagnosticsStore.tst.ts:69` | `Params<runDiagnostics>` | Effect, already wrapped | 49 |
| `packages/http/test/DecisionLogHttp.tst.ts:41` | `decisionBacklogRoute` | `Layer` | 29, 30, 36, 37 |
| `packages/http/test/DecisionStreamRoute.tst.ts:25` | `decisionStreamRoute` | `Layer` | 20, 21 |
| `packages/http/test/DecisionStreamRoute.tst.ts:35` | `sseText` | `string` | 32-34 |
| `packages/http/test/DecisionStreamRoute.tst.ts:36` | `sseText` | `string` | 32-34 |
| `packages/http/test/DecisionStreamRoute.tst.ts:37` | `sseText` | `string` | 32-34 |
| `packages/http/test/DevtoolsRouteAddress.tst.ts:26` | `devtoolsPath` | template string | 30, 31 |
| `packages/http/test/DevtoolsRouteAddress.tst.ts:32` | `devtoolsPath` | template string | 30, 31 |
| `packages/http/test/DevtoolsRouteAddress.tst.ts:42` | `decisionStreamRoute` | `Layer` | 38 |
| `packages/http/test/DevtoolsRouteAddress.tst.ts:48` | `devtoolsRoutes` | `Layer` | 46, 47 |
| `packages/http/test/DevtoolsRouteAddress.tst.ts:49` | `devtoolsRoutes` | `Layer` | 46, 47 |
| `packages/http/test/DevtoolsRouteAddress.tst.ts:53` | `devtoolsRoutes` | `Layer` | 46, 47 |
| `packages/http/test/GuardApi.tst.ts:47` | `guardApi` | `Layer` | 35, 39 |
| `packages/http/test/GuardApi.tst.ts:51` | `guardApi` | `Layer` | 35, 39 |
| `packages/http/test/GuardApi.tst.ts:55` | `guardApi` | `Layer` | 35, 39 |
| `packages/http/test/GuardRoute.tst.ts:133` | `addGuardedRoute(...)` result | function returning `Layer` | 136 |
| `packages/http/test/RequirePermission.tst.ts:45` | `requiresPermission` | branded shape | 35 |
| `packages/http/test/RequirePermission.tst.ts:49` | `requiresPermission` | branded shape | 35 |
| `packages/http/test/RequirePermission.tst.ts:63` | `plainEndpoint.annotate` | endpoint | **none** |
| `packages/promise/test/Facade.tst.ts:25` | `qadi.filter` | `Promise` | 43, 44 |
| `packages/promise/test/Facade.tst.ts:28` | `qadi.filterProjected` | `Promise` | 45, 46 |
| `packages/promise/test/Facade.tst.ts:33` | `qadi.filter` | `Promise` | 43, 44 |
| `packages/promise/test/Facade.tst.ts:34` | `qadi.filterProjected` | `Promise` | 45, 46 |
| `packages/promise/test/Facade.tst.ts:40` | `qadi.projected` | `Promise` | 49 |
| `packages/react/test/DevtoolsFeed.tst.ts:23` | `useDevtoolsFeed` | feed object | 29-31 |
| `packages/react/test/DevtoolsFeed.tst.ts:24` | `useDevtoolsFeed` | feed object | 29-31 |
| `packages/react/test/DevtoolsFeed.tst.ts:25` | `useDevtoolsFeed` | feed object | 29-31 |
| `packages/react/test/Hydration.tst.ts:52` | `isAllowed` | `boolean` | 53 |

Comment-only hits (not pins; strip before counting): `DecisionCache.tst.ts:13`, `PortAccess.tst.ts:6`, `PortAccess.tst.ts:35`, `PortSpan.tst.ts:5`, `Qadi.tst.ts:171`.

**Counts per file (the budget):**

| Package | File | Pins |
|---------|------|------|
| audit | `AuditPortReply.tst.ts` | 2 |
| audit | `AuditWriteOutcome.tst.ts` | 3 |
| audit | `Retention.tst.ts` | 3 |
| core | `DecisionCache.tst.ts` | 3 |
| core | `DecisionLog.tst.ts` | 1 (becomes 0) |
| core | `EvaluationEnvironment.tst.ts` | 4 |
| core | `Explanation.tst.ts` | 2 |
| core | `HydrationMetrics.tst.ts` | 2 |
| core | `Matcher.tst.ts` | 2 |
| core | `Policy.tst.ts` | 2 |
| core | `PortAccess.tst.ts` | 6 |
| core | `PortDefault.tst.ts` | 1 |
| core | `Ports.tst.ts` | 1 |
| core | `PortSpan.tst.ts` | 4 |
| core | `Qadi.tst.ts` | 4 |
| core | `UntrustedDecode.tst.ts` | 9 |
| core | `WalkEnvironment.tst.ts` | 2 |
| devtools | `model/DiagnosticsStore.tst.ts` | 3 |
| http | `DecisionLogHttp.tst.ts` | 1 |
| http | `DecisionStreamRoute.tst.ts` | 4 |
| http | `DevtoolsRouteAddress.tst.ts` | 6 |
| http | `GuardApi.tst.ts` | 3 |
| http | `GuardRoute.tst.ts` | 1 |
| http | `RequirePermission.tst.ts` | 3 |
| promise | `Facade.tst.ts` | 5 |
| react | `DevtoolsFeed.tst.ts` | 3 |
| react | `Hydration.tst.ts` | 1 |
| | **Total** | **81** (core 43, audit 8, devtools 3, http 18, promise 5, react 4) |

**Classification totals:** Effect/Stream-returning and unwrapped: **1** (`DecisionLog.tst.ts:30`). Effect-returning and already wrapped in `Params<F>`: **12**. Honest (non-Effect, non-Stream): **68**. Of the 81, **11 lack an in-file positive control**: `AuditPortReply.tst.ts:31`, `AuditWriteOutcome.tst.ts:18`, `DecisionLog.tst.ts:30` (rewritten anyway), `Explanation.tst.ts:35`, `:46`, `Matcher.tst.ts:33`, `:42`, `Qadi.tst.ts:115`, `WalkEnvironment.tst.ts:40`, `:41`, `RequirePermission.tst.ts:63`.

Method used (so a verifier can repeat it): `grep -rn 'not\.toBeCallableWith' packages features scripts --include='*.ts' --include='*.tsx'` gives 86 lines; drop lines whose text starts with `*` or `//`; the full tstyche run is green (65 passing files at this HEAD) so every in-file positive is a passing control. Unverified: that no `.tst.tsx` or generated `.tst` file exists outside `packages/*/test` (the grep covered `packages`, `features`, `scripts`).

---

## Phase 63: The packed-install gate probes every new public name (ARCH-110)

**Audit item:** I-a. **Complexity:** MEDIUM. **Depends on:** nothing technically. Pair with 62 for the "protect what v1.6 ships" cut (`_WAVE12-CONTEXT.md:33-34`).

### Observable done-state

1. `pnpm spec:package` (`node scripts/check-package-install.mjs`, merge gate 14) is green and its consumer fixture compiles and runs `makeGatesFeed`, `makeDiagnosticsFeed` and a typed `DecisionCacheShape` host cache through the **packed** `exports` map.
2. Deleting any one of those three probes from the `FIXTURE` string makes the script exit 1, either because the derived guard names the missing `make*Feed`, or because `tsc` fails on the dead `@ts-expect-error`. Record the three hand-removals and the red output in the SUMMARY (there are no unit tests for `scripts/*.mjs`).
3. Adding a hypothetical fourth `make*Feed` root export to `@qadi/devtools` (simulated by hand) fails the gate until a probe exists. Reverted.
4. `pnpm spec:gates` (DoD table) unchanged: same command. No changeset.

### Inputs each probe needs (read from source)

| Probe | Call | Inputs | Deterministic assertion |
|-------|------|--------|-------------------------|
| Gates feed | `makeGatesFeed(init?: GatesFeedInputs)` (`GatesFeed.ts:113-115`, returns `Effect<GatesFeed, never, Scope.Scope>`) | `{ gates?: GateRegistryLike, questions?: () => ReadonlyArray<AskedQuestionLike>, intervalMillis? }`. An empty registry is `{ instances: () => [], subscribe: () => () => {} }` (`GateRegistryLike`, `Gates.ts:247-250`). Leave `questions` out: with no thunk no cadence fiber is forked (`GatesFeed.ts:222-226`). | The snapshot is synchronous: `RegistryRead.$is("Read")(snap.registry)` with `instances.length === 0`, and `AskedRead.$is("Unhanded")(snap.asked)`. No `yieldNow` needed. Names `RegistryRead`, `AskedRead` are root exports (`index.ts:50`). |
| Diagnostics feed | `makeDiagnosticsFeed(init?: DiagnosticsOptions)` (`DiagnosticsFeed.ts:130-132`) | `{}` or `{ intervalMillis }` forks the poll; no argument leaves it `Off`. There is **no `schedule`** option (F6). `layer` and `collector` are optional. | After the fixture's 20 `Effect.yieldNow` turns (`helpers.ts:174-176`, the same count the timeline probe uses, `check-package-install.mjs:507`), `getSnapshot().status._tag === "Live"`. Prefer a bounded loop "yield until `Live`, cap 200, fail if not reached" over a fixed count (unverified that 20 turns suffice for the first sample; the devtools suite uses 20 under `TestClock`). Close the scope, so the `Schedule.spaced` sleep (default `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS` = 2000) is interrupted, never awaited. |
| Host cache | `DecisionCacheShape` (type), `DecisionCache`, `decisionCacheLayer()` from `@qadi/core` (`DecisionCache.ts:38-130`, `215-218`; all re-exported by `export *`) | Members: `getOrCompute(question, options?)`, `size`, `clear`. Wrap with `Layer.effect(DecisionCache, Effect.gen(function* () { const inner = yield* DecisionCache; const shape: DecisionCacheShape = { ...inner, getOrCompute: (q, o) => { calls += 1; return inner.getOrCompute(q, o); } }; return shape; })).pipe(Layer.provide(decisionCacheLayer()))`. | Evaluate the fixture's `hasPermission(read)` twice under `Effect.provide(hostCache)` (the cache must wrap the unit of work, `DecisionCache.ts:167-186`): `calls === 2` shows `evaluate` goes through the host's shape; the second outcome is a `hit`. The pre-0.13 pin: a line with `// @ts-expect-error` assigning a function taking `(question, compute: Effect.Effect<…>)` to `DecisionCacheShape["getOrCompute"]`; `tsc` fails the gate if the shape ever loosens back. `CacheLookup` is exported too, so the wrong-shape line can give a correct return type and be refused for the argument alone. |

Fixture pitfall: `FIXTURE` is a JS template literal (`check-package-install.mjs:396-593`), so backticks and `${` inside it are written `\`` and `\${`.

### Table stakes

| Requirement | Notes |
|-------------|-------|
| All three probes in the fixture | Type-only `DecisionCacheShape` is checked only by `tsc` (compile), the feeds also run. |
| No wall clock | Fixed or bounded `yieldNow` turns, scope close; never `setTimeout`. |
| Derived guard | Enumerate `make\w+Feed` from the **packed** `@qadi/devtools` (extend `probe.mjs`, `check-package-install.mjs:274-285`, to print names, not only counts), then require each as a call `name(` in the fixture with comments stripped. Fails with the missing names. |
| Deliberate-removal evidence | As done-state 2. |

### Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| Guard also covers `DecisionCache`-style type-only public names via a small named list in the script (`DecisionCacheShape`) that fails if the name leaves `@qadi/core`'s `.d.ts` | The type-only name has no runtime export to enumerate | LOW-MEDIUM |
| Assert the host cache saw both calls and the second was a `hit` | Proves the shape is not just compiled but honoured by `evaluate` | LOW |

### Anti-features

| Anti-feature | Why bad | Instead |
|--------------|---------|---------|
| Grepping the fixture for the bare name | A name in a comment satisfies it while the probe is gone | Match a call after stripping comments. |
| Real timers or `Effect.sleep` in the fixture | Flaky, slow | `yieldNow` turns, scope close. |
| Importing from `packages/*/src` in the fixture | Defeats the packed-artifact point | Only package names. |
| Editing the DoD table or adding a new `pnpm` step | Context says "same command" | Extend the script. |
| Probing `@qadi/devtools/react` more deeply | Out of scope; `DevtoolsDock` is already referenced | Leave. |

**Dependencies:** none upstream. Phase 64 later changes a feed's listener behaviour; this probe must not subscribe a throwing listener, so the two do not interact.

---

## Phase 64: One throwing listener cannot silence the rest (ARCH-111)

**Audit item:** 60a. **Decision D1 (locked).** **Complexity:** LOW code, MEDIUM records (many texts). **Depends on:** 62 only for ordering (this phase adds no type pins). Touches the shared `ExternalStore`, so run it before 68's re-wrapping.

### Observable done-state

1. New tests in `packages/devtools/test/model/ExternalStore.test.ts` (today 5 tests, none about throws), RED on the base first: (a) L1 throws, L2 and L3 still called; (b) one throw is rethrown **as the same object** after the loop; (c) two throw: an `AggregateError` whose `.errors` hold both, in subscription order; (d) none throw: behaviour and call order unchanged; (e) a listener that unsubscribes itself or another during notify neither throws nor skips the survivors; (f) `set` still stores the new value before notifying, so a throwing listener cannot leave `getSnapshot()` stale.
2. `pnpm vitest run --project <devtools project> < /dev/null` is green with the dock's `*.characterisation.test.tsx` files **unedited** (check with `git diff --stat -- 'packages/devtools/test/**/*.characterisation.test.tsx'` empty).
3. The stated texts below no longer claim "not isolated" or that a later listener is skipped, and still say a throw escapes the publisher (F11).
4. A `@qadi/devtools` patch changeset; a BEH amendment (BEH-QD-636 area, spec 28), a new INV (reserved 373-374), an ADR-QD-177 or an explicit "unused" in the CCR row; `pnpm spec:verify:strict`, `pnpm spec:examples`, `pnpm spec:claims`, `pnpm spec:api` stay green. No `export` added.

### Every text that promises "a listener must not throw" or "not isolated" (complete grep)

Searched `packages/devtools`, `packages/react/src`, `apps/website/src/content`, `spec/`, `README.md`, `packages/*/README.md`.

| Where | Text (short) | Action |
|-------|--------------|--------|
| `packages/devtools/src/model/GatesFeed.ts:7-10` (module doc) | "A listener on the feed's own `subscribe` is not guarded: it is the caller's and must not throw. Its throw escapes whatever published ... and one thrown on a tick ends the questions cadence without a statement." | Rewrite: every listener is called, one error is rethrown, several as `AggregateError`; the throw still escapes the publisher and a tick throw still ends the cadence (F11). |
| `GatesFeed.ts:77` (`subscribe` doc) | "A listener must not throw: it is not isolated." | Reword. |
| `packages/devtools/src/model/TimelineFeed.ts:57` (`TimelineStatusReadout.subscribe`) | same | Reword. |
| `TimelineFeed.ts:66` (`timeline` doc) | "A listener on its `subscribe` must not throw: it is not isolated, and it runs on every record." | Reword. |
| `packages/devtools/src/model/DiagnosticsFeed.ts:97` (`DiagnosticsReadout.subscribe`) | "must not throw: it is not isolated, and a throw during a publish from the poll is stated as the poll's stop." | Keep the second clause (still true: the rethrow reaches the poll fiber and is `Stopped`), drop "not isolated". |
| `packages/devtools/src/model/ExternalStore.ts:21-22` (`subscribe` doc, and the module doc) | no throw wording today | Add the new contract here; this is the single implementation. |
| `packages/devtools/README.md:162-169` ("Without React: the feeds") | "A `subscribe` listener is yours and is not isolated: it must not throw. A throw escapes whatever published (...) and it can leave a feed's status wrong with nothing running: the gates feed's questions cadence ends, a diagnostics feed stays `Starting` with no poll, and a timeline restarted from `Stopped` says `Reading` with nothing reading." | Reword the first sentence; keep the consequences only if still true under rethrow (they are, F11). The README is the "a feed that stops says so" passage the context names. |
| `spec/behaviors/28-devtools-screens.md:2547-2548` (a requirement block of the gates-feed BEH) | "A listener given to the feed's own `subscribe` is the caller's and is not guarded, so it MUST NOT throw (amended 2026-11-19, review iterations 2 and 3)." | Amend the requirement; bump revision via `pnpm spec:revise` (`scripts/spec-revise.mjs`); add a Change History row. |
| `spec/behaviors/28-devtools-screens.md:1981-1982` (BEH-QD-584 block) | "MUST NOT throw out of the model, MUST NOT end the poll or skip another store's listeners" | **Read, probably no change**: it is about a throwing **registry**, not a listener, and stays true. Confirm, do not edit. |
| `spec/behaviors/28-devtools-screens.md:2069` | "`@qadi/react`'s own registry swallows a listener's throw" | No change: this is about the React registry (`packages/react/src/GateRegistry.ts:78-92`), a different store. |
| `spec/decisions/162-...md:124-128`, `169-...md:42` | Describe the registry's swallow and "nothing the host throws leaves the feed" | No change; they are about the host registry/thunk, not subscribe listeners. |
| `packages/devtools/test/gateRegistryDouble.ts:11-18` | "a listener that throws is not swallowed, so an assertion made inside a subscriber fails the command that triggered it" | A **test double of the host registry**, not `ExternalStore`; unaffected. Note: tests that assert inside a feed subscriber still fail the command because a single throw is rethrown as the same object. A second throw in the same notify would now arrive as `AggregateError`, so a test that matches a message may need a look (unverified, none identified). |
| `apps/website/src/content/docs/docs/packages/devtools.md`, `.../reference/upgrading.md` | **No** "must not throw" or "isolated" claim (grep found none; line 169 is about a thrown questions thunk, which is unaffected). | No change. Do not edit `apps/website/dist/` (build output). |
| spec 28 fences at lines 455, 845, 1279, 2024, 2490, 2531 | Pure `subscribe: (listener: () => void) => () => void` signatures, no throw comments | No change; they are ` ```ts ` listings, not compiled. |
| `spec/overview.md:914-915` | feed rows; no listener-throw wording | No change. |

13 importers of `ExternalStore` confirmed: `TimelineFeed`, `GatesFeed`, `DiagnosticsFeed`, `DiagnosticsStore`, `DockModel`, `DockSession`, `SimulationSession`, `ExplorerSession`, `HeldChoice`, `TimelineStore`, `react/ServicesPanel`, `react/QuestionsPanel`, `react/useStoreSnapshot`. No other listener loop exists in `packages/devtools/src`; `@qadi/react`'s `GateRegistry.ts:86-92` is a separate, deliberately swallowing one.

### Table stakes

| Requirement | Notes |
|-------------|-------|
| Call every listener, in subscription order | Live `Set` iteration today: a listener removed mid-notify is not called, one added mid-notify is. Keep that behaviour or state a change; pin it (test e). |
| Rethrow a single error as-is, several as one `AggregateError`, after the loop | `AggregateError` is not used anywhere else in the repo; `lib: ["ESNext"]` (`tsconfig.base.json:6`) covers it. |
| State changed before notify | `set` assigns `current` first, as today. |
| Docs and spec amended in the same change | AGENTS.md section 11. |

### Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| A test through a real feed: a throwing listener on `makeGatesFeed` does not stop the dock's `useStoreSnapshot` subscriber | Proves the user-visible fix, not just the store | LOW-MEDIUM |
| Property test: for any subset of throwing listeners, the set of called listeners equals all subscribed ones | Closes the ordering/edge space | LOW |

### Anti-features

| Anti-feature | Why bad | Instead |
|--------------|---------|---------|
| `try { listener() } catch {}` per listener | Swallows; explicitly refused by D1 and by AGENTS.md section 6's spirit | Collect, rethrow after the loop. |
| Logging the error (`console.*`) | Forbidden outside `DeveloperSignals.ts` (`no-ambient-console`) | Rethrow. |
| Making `@qadi/react`'s `GateRegistry` match | Changes another package's isolation policy | Leave it; note the difference in the BEH. |
| Copying the listener set on every notify | Hot path for each feed publish; changes add-during-notify semantics | Keep live iteration unless the BEH decides otherwise. |
| Wrapping a lone error in `AggregateError` | D1 says one error is rethrown as-is | One as-is, several aggregated. |
| Editing the dock `*.characterisation.test.tsx` files | They are pinned behaviour | They must pass unedited. |

**Dependencies:** none upstream. Before 68.

---

## Phase 65: Only `admit` builds an `Admitted` (ARCH-112)

**Audit items:** 59a, 59b. **Complexity:** MEDIUM (hot path, bench). **Depends on:** 62 (the construction pin must be `@ts-expect-error`, not a negative callable form). Touches `Walk.ts:878` only by leaving it unchanged.

### Observable done-state

1. **59a.** `SUPPLIED` no longer reads `question.resource` and `question.action` a second time: the `supplied` flags are computed from the matcher context `admit` builds, so they agree by construction. Pins that must stay green and unedited: `LeafMatrix.test.ts`, the E1-E5 cases, `WalkEnvironment.test.ts`; INV-QD-364 (supplied is a function of row source and question) still holds, the "row" source still reports `resource: true`.
2. **59b.** In `packages/core/src/Admission.ts` the `Admitted` constructor is `private`, `admit` is `Admitted`'s static method, and `export const admit = Admitted.admit` keeps `Walk.ts:878` (`admit(question, "asked")`) and `WalkEnvironment.tst.ts` unchanged.
3. A `.tst.ts` pin: a `// @ts-expect-error` construction (`new Admitted(...)`) in `WalkEnvironment.tst.ts`, and a second pin that an **object literal** of the right shape is not assignable to `Admitted<"asked">` (this second one only holds with a private instance member, F8). The `keyof Admitted` pin at `WalkEnvironment.tst.ts:27-30` (instance keys `source | policy | subject | supplied | matcherContext | maxDepth`) stays green.
4. Bench gate: Phase 59's harness (`Evaluate.bench.ts`, 35 workloads, `bench/ab.sh`), 3 + 3 interleaved against the phase base on committed source, decision statistic "median of per-run minima", band = `max(10%, base spread)`, `slower: 0` (`59-BENCH.md` in `.planning/milestones/v1.6-phases/QD-59-*`).
5. ADR-QD-172 amendment and a new INV (reserved 375-376); no changeset (`Admitted` is package-private, ADR-QD-099). `pnpm check:pr` green; `UNTRACED_BUDGET`/`SWITCH_BUDGET` unchanged.

### Table stakes

| Requirement | Notes |
|-------------|-------|
| Derive `supplied` from the built matcher context | `asked`: `{ action: ctx.action !== undefined, resource: ctx.resource !== undefined }`; `row`: `{ action: ctx.action !== undefined, resource: true }`. The source-indexed return type `SuppliedBy[Source]` must survive without a cast (AGENTS.md section 6: no `as`). |
| Private constructor plus static factory | As decided. |
| `@ts-expect-error` pin, not `not.toBeConstructableWith` | Per context; also keeps Phase 62's concern out. |
| Bench evidence committed | Same artefact shape as `59-BENCH.md`. |

### Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| A **private instance member** (for example `declare private readonly proof: true`, which emits nothing at runtime; unverified under this repo's tsconfig, the probe used a real field) so the class is nominal | Without it, `const forged: Admitted<"asked"> = { ...six fields }` compiles (probe C), so "holding one is the proof" (`Admission.ts` doc) is not enforced at the type level | LOW, but the planner must confirm no code constructs a literal `Admitted`-shaped object; `keyof` pins are unaffected because private members are excluded |
| A property-style test that `supplied.resource === (matcherContext.resource !== undefined)` for `asked` over generated questions | Turns "agree by construction" into a checked invariant | LOW |

### Anti-features

| Anti-feature | Why bad | Instead |
|--------------|---------|---------|
| Private constructor only, claimed as "only `admit` can build one" | False for object literals (F8) | Add the private member or word the INV as "no `new`". |
| `as Admitted<…>` anywhere | Forbidden; also would defeat the guarantee | Static factory is the only constructor. |
| Moving the `Result`/depth check out of `admit` | Changes INV-QD-037 | Keep it. |
| A grep gate on `new Admitted` repo-wide | `packages/audit/src/CircuitBreaker.ts:484` has an unrelated `Admitted` (F9) | Scope to `packages/core/src/Admission.ts` and the type pin. |
| Running only 1 bench pair | The band is defined on 3 + 3 | Follow the harness. |

**Dependencies:** needs 62. Independent of 64, 66, 67. Touches core hot paths, so it keeps its own bench.

---

## Phase 66: The decoder reads only what it declares; hydration's policy recorded (ARCH-113)

**Audit items:** 57a, 57b (the audit lists them as one item, "D-09 hydration ignore and review IN-01"). **Decisions D2 and D4 (locked).** **Complexity:** MEDIUM-HIGH (hot path, mutation sensitivity). **Depends on:** 62; independent of 65, but both touch core hot paths and each has its own bench.

### Observable done-state

1. **D4 (57b).** RED first: an in-process object (not `JSON.parse` output) with a throwing **undeclared** getter, decoded through a decoder built with `unknownKeys: "ignore"`, throws on the base and returns the same `Result` as the getter-free object after the fix. Run it through both `ignore` seams that exist today: `sinkWire` (`SinkCodec.ts:501`) and `storedWire` (`SinkCodec.ts:603`), plus a direct `untrustedDecoder` unit test in `UntrustedDecode.test.ts`. Also a counting getter on a **declared** key is read at most once per decode (unverified that this holds today; decide the requirement after measuring).
2. The doc claim at `UntrustedDecode.ts:166` ("It reads no value, so it cannot recurse") and ADR-QD-170 D-19 are **true** after the change: `project` takes `Object.keys(input)` (names only, which never invoke a getter) and reads values only for kept keys, plus the one `_tag` read `keysOf` needs (`EnvelopeKeys.ts` `discriminantOf`, `TAG = "_tag"`). `keysOf` currently receives the full `entries` array (`UntrustedDecode.ts:171-173`), so its parameter changes to the tag value or key list.
3. Hot path: `pnpm bench` on `UntrustedDecode.bench.ts` and `SinkCodec.bench.ts` (both exist), before and after, using the same interleaved method; no workload slower than its band.
4. Stryker on `UntrustedDecode.ts` and `EnvelopeKeys.ts` does not drop (XC-05 procedure, `_SHARED-CONTEXT.md:56-60`). Pitfall from Phase 57 RESEARCH (`57-RESEARCH.md:544-545`): decoders are built at module scope so `ignoreStatic: true` marks their mutants `Ignored`; build decoders **inside `it` bodies** for the new cases, and produce a static-credit evidence run (`ignoreStatic: false`) outside the repo.
5. `UNTRUSTED_DECODE_BUDGET` counts unchanged (`UntrustedDecode.ts` 5, `DecodeDepthGuard.ts` 1, `PortSpanEncode.ts` 2, `SinkCodec.ts` 1, `SimulationForm.ts` 1; AGENTS.md section 7a), because no `Schema.decode*`, `onExcessProperty`, `exceedsJsonDepth` or `JSON.parse` token moves. `pnpm lint` shows no `[untrusted-decode*]` failure.
6. **D2 (57a).** `packages/react/src/HydrationEngine.ts:194` (and `:164`, `:209`) still say `unknownKeys: "refuse"`: `git diff` shows no change under `packages/react/src`. An ADR-QD-170 amendment (revision bump, Change History row) records why: the payload is same-build and version-checked, and strict refusal catches tampering. The D-09 report is marked resolved there.
7. `@qadi/core` patch changeset (an in-process accessor is no longer invoked). New INV (reserved 377-378) and BEH amendment if one states the claim; ADR-QD-179 or an explicit "unused" in the CCR row.

### Table stakes

| Requirement | Notes |
|-------------|-------|
| RED test with an undeclared throwing getter | The claim in the doc is the contract. |
| Same output for plain data as before | The existing `UntrustedDecode.test.ts` and `SinkCodec` golden tests stay green unedited. |
| ADR amendment for D2 with the reason | Not a code change. |
| Patch changeset | Behaviour change for in-process objects. |

### Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| Also prove a **declared** getter is read once and an undeclared symbol-keyed or inherited accessor is never read | Closes the gap between "no undeclared accessor invoked" and "no surprise reads" | LOW |
| A micro-bench note in the CCR with numbers | The context requires a before/after; recording it makes the cost of D4 explicit | LOW |

### Anti-features

| Anti-feature | Why bad | Instead |
|--------------|---------|---------|
| Rewording the doc to "reads only JSON data" (a wording-only fix) | D4 says the claim must become true, not softer | Change `project`. |
| Switching HydrationEngine to `"ignore"` | D2 locked `"refuse"` | Record, do not change. |
| `Object.entries` then filter, kept as is, with a try/catch around getters | Swallows; still invokes the getter | Read names first. |
| Adding any `Schema.decode*`, `JSON.parse` or `onExcessProperty` token elsewhere | Trips `[untrusted-decode]` | Keep the recipe in `UntrustedDecode.ts`. |
| `Record<string, unknown>` as the projection's widened type | Owner's standing rule | Type predicate or monomorphic helper. |
| Editing archived Phase 57 evidence | History | Leave. |

**Dependencies:** needs 62. Unrelated to 64/67. Independent bench from 65.

---

## Phase 67: No equivalent mutants, no magic race bound (ARCH-114)

**Audit items:** 61a (two surviving mutants, one audit item), 61b (the `gap <= 48` bound). **Decision D5 (locked).** **Complexity:** MEDIUM. **Depends on:** 62 (no pins here, ordering only). No changeset unless behaviour changes (it must not).

### Observable done-state

1. `packages/core/src/DecisionCache.ts:285-287`: no `if (Option.isSome(oldest))` guard remains, because the code no longer has an impossible-empty branch: restructure so eviction pops through a path whose empty case cannot be written (for example drive the loop from the queue, or pattern-match the `Chunk` head once with the empty arm absent by construction). The long justification comment at `:278-284` shrinks accordingly. FIFO order, capacity semantics and the `capacity` validation are unchanged (`DecisionCache.test.ts` FIFO cases green).
2. `packages/core/src/SharedComputation.ts:305-319`: the `claimed` value is dispatched with `Match.tagsExhaustive` (or an equivalent closed dispatch) over `Hit | Claimed | Joined`, so the `"Claimed"` literal at `:319` is read. No new `switch`: `SharedComputation.ts` is not in `SWITCH_BUDGET` (`pnpm lint` stays green). Mind AGENTS.md section 5a: a per-call matcher on this path costs more than a hoisted one, and `makeSharedComputation`'s `run` is per ask. Measure with `DecisionCache.bench.ts` (exists) before choosing `Match` over a closed `if`/discriminated narrowing.
3. `DecisionCache.test.ts:1250` loop: `for (let gap = 0; gap <= 48; gap++)` is replaced by a loop that stops when both orderings have been observed **at every budget**, capped at 512, and **asserts both were seen** (the existing `oneSided` assertion at `:1298-1301`, kept). The comment at `:1249` ("Measured coalesced to hit switch-over: gap 38/22/15/13 at budget 3/4/5/6 ... depends on walk's step count") is deleted because the dependency is gone.
4. Stryker (XC-05): per-file scores at least `DecisionCache.ts` 0.977, `SharedComputation.ts` 0.986, `Lifecycle.ts` 1.000, and zero survivors on the two named mutants. No `// Stryker disable` appears (`git grep -n 'Stryker disable' packages/*/src` stays empty, D5).
5. `pnpm test`/the core project green; `pnpm check:pr` green; CCR row only.

### Table stakes

| Requirement | Notes |
|-------------|-------|
| Restructure, not suppress | D5. |
| Tag matters in the dispatch | The mutant `{ _tag: "Claimed", ... }` to `{ _tag: "", ... }` must now fail a test or a type error. |
| Race test cannot pass without racing, and no magic constant | Cap 512 is a safety bound, not a tuned one; failing to see both orderings within it is a test failure, not a skip. |
| No Stryker score drops | Compare with a script, not "the report exists" (`_SHARED-CONTEXT.md:59`). |

### Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| Keep a margin after the first flip (for example 2-3 extra gaps) and keep the per-run "no recompute, FIFO exact" assertion on every run | The current sweep also checks gaps 39-48 (F12); stopping at the first flip would silently lose them | LOW |
| The loop's per-budget result reported in the assertion message | A failure says which budget never raced | LOW |

### Anti-features

| Anti-feature | Why bad | Instead |
|--------------|---------|---------|
| `// Stryker disable next-line` | D5 forbids introducing the convention | Restructure. |
| Raising the bound to 64 or 100 | Still magic, still depends on step count | Iterate until observed. |
| `switch` on the tag | Violates AGENTS.md section 5a and `SWITCH_BUDGET` | `Match.tagsExhaustive` or narrowing. |
| `Option.getOrThrow` or `!` to drop the guard | Introduces a throw in the evaluation path (AGENTS.md section 4: no defect in an authorization path) | Make the empty case unrepresentable. |
| A new equivalent-mutant branch elsewhere in the rewrite | Repeats the debt | Run Stryker on the touched files. |

**Dependencies:** needs 62 for ordering only. Shares `DecisionCache.ts` with Phase 63's host-cache probe at the API level only (no overlap in code).

---

## Phase 68: Hygiene and recorded close-outs (ARCH-115)

**Audit items:** 58a, 58b, 61c, 61d, I-b. **Decision D3 (defaulted, owner did not object).** **Complexity:** LOW-MEDIUM (many small edits, one ADR amendment). **Depends on:** all of 64-67 first, because it re-wraps lines they can shift.

### Observable done-state, per item

| Item | Done-state a verifier can run | Notes and scope line |
|------|-------------------------------|----------------------|
| **58a** over-width lines | `awk 'length>100' <file>` no longer lists the **content** of the three lines: `packages/core/src/SinkCodec.ts:616` (137 chars), `features/features/decision-log/decision-log.steps.test.ts:197` (135 chars), and the `DecisionLog.ts` line from 58-REVIEW IN-02. | The IN-02 line (`:215` then) has moved; the likely target is `DecisionLog.ts:220`, the `const entry: LogEntry = { cursor..., record: new StoredRecord({...}) }` line (108 chars) (inference, unverified). `DecisionLog.ts` has 5 lines over 100 today (8, 155, 220, 255, 262). Re-wrapping is free because Phase 58's mutant ids are archived; re-run Stryker on the touched `src` files (`SinkCodec.ts`, `DecisionLog.ts`) and compare scores. The steps file is not mutated. **Out of scope:** the other over-100 lines (SinkCodec 27, steps file 15) and any width gate (F13, AGENTS.md section 17). |
| **58b** wording | `Source.test.ts:291` title no longer says "never stamped" (reads "never given a label"). `StoredEnvelope.test.ts` header (lines 1-14) and the `describe` title at `:228` ("RED on the base") no longer describe the phase's process, and the header no longer claims no row reads the in-memory shape while N1-N4 do. | `StoredEnvelope.test.ts` is a pinned characterisation file; this is its one recorded edit, so the CCR says so and the diff must be comments and titles only (compare with the transpile-and-compare method below). `DecisionLog.ts` `ingest` doc **already** names the uncontained defect path (`:128-129`, "a defect reaches that handler (ADR-QD-171)"): record "confirmed, no edit" (F14). `QadiAtoms.test.ts:570` is already clean (F14). Decide explicitly whether `Source.test.ts:306` ("becomes a stamped record") and `:186` ("stamping") are stale wording; the audit names only `:291`. |
| **61c** ADR line 73 | `awk 'FNR==73 {print length}' spec/decisions/174-a-decision-cache-is-asked-the-question.md` is under the chosen width, and the file's Revision and Change History are bumped through `pnpm spec:revise` (`scripts/spec-revise.mjs`). | Lines 75 (168) and 94 (129) of the same file are also long; decide whether "line 73" means those too. The Change History row at `:13` (315 chars) is a table row and exempt. Gate 10 (Document ID equals the file number) must stay green. |
| **61d** Simulator comments-only | A recorded, reproducible proof that `packages/devtools/test/react/Simulator.test.tsx`'s Phase 61 diff is comments-only, saved in the Phase 61 archive (a new file next to the other `61-*` files, not an edit of `61-scan.mjs`). | Robust method: transpile both revisions with `ts.transpileModule(src, { compilerOptions: { removeComments: true, jsx: "preserve", target: "esnext" } })` and compare outputs; a regex "strip comments" can mis-handle `//` inside JSX strings. State the two commits. The archived `61-scan.mjs` stays unedited (`git diff` empty for it). |
| **I-b / D3** port cards | An ADR-QD-173 amendment (Revision bump, Change History row) records that `PortCards.ts` stays package-private and no export is added: `pnpm spec:api` count unchanged (939 at v1.6 close) and `git diff -- packages/devtools/src/index.ts` empty. | **Wording problem (F10):** D3 says "derive from the timeline feed", but `portCards`' inputs are the diagnostics reading's `wiring`, `activity`, `portCalls` plus an unsampled flag. Name the diagnostics feed, state that the card wording (`viewOf`, `describeCall`, tones) is not reachable, and do not promise the "same view". Confirm with the owner before writing. If the amendment contains a ` ```typescript ` fence it is compiled by `pnpm spec:examples`. |

CCR row records each item, the unused reservations ("Unused: ..."), and the F14 no-op confirmations.

### Table stakes

| Requirement | Notes |
|-------------|-------|
| Only the named lines and titles change | Keeps the diff reviewable and the Stryker re-run bounded. |
| Spec edits go through `spec:revise` | Gate 10 and `spec:verify:strict`. |
| No source behaviour change | `pnpm test` and `pnpm check:pr` green; no changeset. |

### Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| A re-runnable `.mjs` or markdown recipe stored with the Phase 61 archive for 61d | A future audit can re-run it | LOW |
| Stryker before/after table for the two touched `src` files in the CCR | The mutant ids moved; the score must not | LOW (the run itself is the cost; the research agent did not run it) |

### Anti-features

| Anti-feature | Why bad | Instead |
|--------------|---------|---------|
| A line-width lint gate or running `oxfmt` over files | AGENTS.md section 17 settles that formatting is not gated; would reflow hundreds of lines | Re-wrap the named lines by hand. |
| Editing `61-scan.mjs` (or any archived scan) to admit the comment-only file | History; the context forbids it | Add a new proof file. |
| Exporting `portCards` | D3 | Amendment only. |
| Rewording `StoredEnvelope.test.ts` beyond header and the one title | It is a pinned characterisation file | Header and title only. |
| Touching `DecisionLog.ts` `ingest` doc when it already cites ADR-QD-171 | Needless edit | Record "confirmed". |

**Dependencies:** needs 64, 65, 66, 67 done (line shifts). Needs 61's archive path for 61d.

---

## Feature Dependencies

```
62 (honest pins, gate)
  -> 63 (script probes; no pins, ordering only)
  -> 64 (ExternalStore rethrow)           -> 68 (re-wrap, ADR-173 amendment)
  -> 65 (Admitted; needs @ts-expect-error pins from 62)  -> 68
  -> 66 (decoder reads only declared keys) -> 68
  -> 67 (mutants, race bound)              -> 68
63 + 62 together = the cut point for the v1.6 PR (owner's option)
65, 66 each own a hot-path bench; run them one at a time (use_worktrees false)
```

### Dependency notes

- **62 before 65 and 66:** both add type pins; 65's is a `@ts-expect-error`, 66's are positive controls. If Phase 62 takes the root-cause config, later phases may use the bare negative form honestly; otherwise they must use `Parameters<>` or `@ts-expect-error`.
- **64, 65, 66, 67 before 68:** 68 re-wraps `SinkCodec.ts` and `DecisionLog.ts`, which 65-67 do not touch, but it edits spec files (`174`, `173`) that earlier phases' records also touch (the shared registers: `spec/README.md`, `spec/traceability.md`, `spec/decisions/index.yaml`, `spec/overview.md`).
- **Conflicts:** none in code between 63 and 64 (the probe subscribes no listener).

## MVP Definition

### Must resolve (P1, the milestone's definition of done)

- [ ] Phase 62: rewrite `DecisionLog.tst.ts:30`, characterisation file, `NOT_CALLABLE_PIN_BUDGET` plus AGENTS.md paragraph (or the root-cause config plus characterisation).
- [ ] Phase 63: three probes and the derived `make*Feed` guard.
- [ ] Phase 64: every listener called, rethrow semantics, all listed texts amended.
- [ ] Phase 65: 59a derivation, private constructor plus static `admit`, pins, bench.
- [ ] Phase 66: `project` reads only declared keys, D2 amendment, bench, mutation.
- [ ] Phase 67: two mutants restructured, race loop without magic bound.
- [ ] Phase 68: five close-outs as recorded.

### Nice-to-have (P2, in-phase if cheap)

- [ ] Positive controls for the 11 uncontrolled pins (P1 for Phase 62's own done-state, listed here only for the six that are not rewritten).
- [ ] Private instance member on `Admitted` (needs the planner's call).
- [ ] Margin after the flip in Phase 67's loop.

### Deferred (explicitly not this milestone)

- Upstream tstyche or language-service issue (needs owner OK).
- Any width gate or `oxfmt` in `pnpm check` (AGENTS.md section 17).
- Making `portCards` public; aligning `@qadi/react`'s swallowing registry with D1.
- Releases and version PRs (standing instruction).

## Feature Prioritization Matrix

| Phase | Value | Cost | Priority | Risk |
|-------|-------|------|----------|------|
| 62 | HIGH (a pin that cannot fail is false assurance, and later phases rely on pins) | MEDIUM | P1 | Low; test and gate only |
| 63 | HIGH (published-artifact coverage of three public names) | MEDIUM | P1 | Fixture flakiness if turns are fixed too low |
| 64 | HIGH (user-visible: one bad subscriber silences the dock) | LOW-MEDIUM | P1 | Doc sprawl; `AggregateError` message matching in tests |
| 65 | MEDIUM-HIGH (closes a proof-by-construction gap) | MEDIUM | P1 | Hot-path bench; object-literal forgery if no private member |
| 66 | MEDIUM (a documented guarantee that is false) | MEDIUM-HIGH | P1 | Hot path; `ignoreStatic` mutation blind spots |
| 67 | MEDIUM (test and mutation robustness) | MEDIUM | P1 | `Match` cost on a per-ask path |
| 68 | LOW-MEDIUM (hygiene, recorded decisions) | LOW-MEDIUM | P1 (closes the 13 items) | D3 wording; scope creep on width |

## Probes run (read-only, all temp files deleted, `git status` back to the starting state)

| Probe | Method | Result |
|-------|--------|--------|
| A. Which return types make a negative pin vacuous | Temp `packages/core/test/zzprobe.tst.ts` with ten `declare const f…: (n: number) => X` and `not.toBeCallableWith(1)`; `npx tstyche <file> < /dev/null` | Only `Effect` and `Stream` passed (vacuous). `Layer`, `Result`, `Option`, `Promise`, `string`, a function, `Schema.Codec`, `Context` failed as an honest negative must. Confidence HIGH. |
| B. Root cause and the config fix | Temp `tsconfig.zzfeat62.json` (extends `tsconfig.test.json`, plugin block copied, `floatingEffect: "off"`) and a temp tstyche config via `--config` | With the diagnostic on: positive on an Effect/Stream function fails, valid-arg negative passes. Off: positive passes, valid-arg negative fails. Whole suite: 65 of 65 real files green, "Suppressed: 55 matched". Confidence HIGH. |
| C. Private constructor forgery | Scratch `.ts` with `tsc 6.0.3 --strict --target esnext` | Object literal assignable to a class with a private constructor only; refused once a `private` instance member exists. Confidence HIGH. |
| D. Full tstyche run | `npx tstyche < /dev/null` | All real files pass at this HEAD, so every in-file positive control in the inventory is a passing one. (A foreign `ZzProbe1.tst.ts`, not mine, appeared and vanished during one run; ignored.) |

Not run, by rule: Stryker, `pnpm check`, `pnpm check:pr`, `node scripts/next-id.mjs`, benches.

## Sources

- `.planning/phases/_WAVE12-CONTEXT.md`, `.planning/phases/_SHARED-CONTEXT.md`, `.planning/milestones/v1.6-MILESTONE-AUDIT.md` (13 items, frontmatter `tech_debt`).
- Phase 62: `packages/*/test/**/*.tst.ts` (inventory above); `scripts/check-house-style.mjs:464-470` (`UNTRACED_BUDGET`), `:871-893` (`collect` excludes `.tst.ts`), `:990-1021` (comment handling), `:1267-1290` (two-direction budget check), `:2090-2127` (own-walk precedent); `AGENTS.md` sections 5, 6; `packages/core/test/PortAccess.tst.ts:33-38`, `DecisionStream.tst.ts:49-56`, `Qadi.tst.ts:171-175`, `DiagnosticsStore.tst.ts:19-25`; `tsconfig.base.json:60-74` (plugin block); `tstyche.json`.
- Phase 63: `packages/devtools/src/model/GatesFeed.ts`, `DiagnosticsFeed.ts`, `DiagnosticsStore.ts:191-257`, `Gates.ts`, `packages/devtools/src/index.ts:13-14,25,50,130`; `packages/core/src/DecisionCache.ts:38-130,215-323`; `scripts/check-package-install.mjs:274-305,396-593,601-640`; `packages/devtools/test/helpers.ts:174-176`.
- Phase 64: `packages/devtools/src/model/ExternalStore.ts`, `TimelineFeed.ts:57,66`, `GatesFeed.ts:7-10,77`, `DiagnosticsFeed.ts:97`; `packages/devtools/README.md:162-169`; `spec/behaviors/28-devtools-screens.md:1981-1982,2064-2069,2547-2548`; `spec/decisions/162-*.md:124-128`, `169-*.md:42-52`; `packages/react/src/GateRegistry.ts:78-92`; `packages/devtools/test/gateRegistryDouble.ts:11-18`; `apps/website/src/content/docs/docs/packages/devtools.md` (no claim found).
- Phase 65: `packages/core/src/Admission.ts:60-122`; `packages/core/test/WalkEnvironment.tst.ts:25-50`; `packages/audit/src/CircuitBreaker.ts:484`; `.planning/milestones/v1.6-phases/QD-59-*/59-BENCH.md`.
- Phase 66: `packages/core/src/UntrustedDecode.ts:128-203`, `EnvelopeKeys.ts`, `packages/react/src/HydrationEngine.ts:164,194,209`, `packages/core/src/SinkCodec.ts:501,603`; `packages/core/bench/UntrustedDecode.bench.ts`; `.planning/milestones/v1.6-phases/QD-57-*/57-RESEARCH.md:544-545,588,609`; AGENTS.md section 7a.
- Phase 67: `packages/core/src/DecisionCache.ts:262-298`, `SharedComputation.ts:290-340`, `packages/core/test/DecisionCache.test.ts:1225-1305`; AGENTS.md section 5a.
- Phase 68: `.planning/milestones/v1.6-phases/QD-58-*/58-REVIEW.md:67-84` and `58-REVIEW-DISPOSITION.md:10`; `packages/core/src/DecisionLog.ts:120-131,215-222`; `packages/devtools/test/model/Source.test.ts:186,291,306`; `packages/core/test/StoredEnvelope.test.ts:1-14,228`; `spec/decisions/174-*.md:73,75,94`; `packages/devtools/src/model/PortCards.ts:28-35,278`; `DiagnosticsStore.ts:75-87`; `spec/decisions/173-*.md`.

---
*Feature research for: v1.7 Arch Wave 12 tech-debt resolution*
*Researched: 2026-11-20*
