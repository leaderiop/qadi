# Phase QD-62: Type-pin classification

Every code pin in the tracked `*.tst.ts` files, classified by subject, declared return, form, control and kind: the 81 callable pins of the base plan (80 `.not.toBeCallableWith` plus `DecisionLog.tst.ts`'s rewritten refusal) and the 7 constructable ones (PIN-04's classification, D-10). Rows run in the flip sweep's order (`62-FLIP-SWEEP.md`'s `## Sweep`, S01..S87), with DecisionLog's base pin inserted where its file sorts.

Reading the columns:

- **Pin** is the sweep row's pin cell verbatim; DecisionLog's is its base position (`:30` before 62-02), because the refusal was rewritten in place.
- **Declared return** is what the subject's declaration returns, read from `packages/*/src` (the instance for a constructor; what `F` returns for a `Params<F>` subject). Entries marked "inferred" are `Effect.fn`, `Layer` or `addGuardedRoute(...)` results the declaration does not spell out. A union in a return is written with "or", because the table's cells are pipe-delimited.
- **Control** is the line of a positive pin on the same subject text and the same form in the same file, the nearest one to the pin; DecisionLog's names the `toBeAssignableTo<Options>` line.
- **Kind** is how the pin is stated: `plain return` (the subject is the callable itself), `Params<F> over an Effect` (the refusal is stated on the parameter list of an `Effect`-returning `F`, through a file-local `Params<F>`, so it holds whichever way `floatingEffect` is set), or `rewritten (was vacuous)` (62-02's rewrite of the one pin that could not fail).

| # | Pin | Subject | Declared return | Form | Control | Kind |
| - | --- | --- | --- | --- | --- | --- |
| P01 | `packages/audit/test/AuditPortReply.tst.ts:33` | `AuditPortReply.Fail` | the `Fail` variant of `AuditPortReply` (`{ _tag: "Fail"; cause: unknown }`) | callable | `AuditPortReply.tst.ts:35` | plain return |
| P02 | `packages/audit/test/AuditPortReply.tst.ts:34` | `AuditPortReply.Latch` | the `Latch` variant of `AuditPortReply` (`{ _tag: "Latch"; latch: Latch.Latch }`) | callable | `AuditPortReply.tst.ts:36` | plain return |
| P03 | `packages/audit/test/AuditWriteOutcome.tst.ts:12` | `AuditWriteOutcome.Written` | the `Written` variant of `AuditWriteOutcome` | callable | `AuditWriteOutcome.tst.ts:13` | plain return |
| P04 | `packages/audit/test/AuditWriteOutcome.tst.ts:17` | `AuditWriteOutcome.Skipped` | the `Skipped` variant of `AuditWriteOutcome` | callable | `AuditWriteOutcome.tst.ts:19` | plain return |
| P05 | `packages/audit/test/AuditWriteOutcome.tst.ts:18` | `AuditWriteOutcome.WriteFailed` | the `WriteFailed` variant of `AuditWriteOutcome` | callable | `AuditWriteOutcome.tst.ts:20` | plain return |
| P06 | `packages/audit/test/Retention.tst.ts:16` | `planPurge` | `Result.Result<PurgePlan, RetentionInputInvalid>` | callable | `Retention.tst.ts:17` | plain return |
| P07 | `packages/audit/test/Retention.tst.ts:21` | `planPurge` | `Result.Result<PurgePlan, RetentionInputInvalid>` | callable | `Retention.tst.ts:17` | plain return |
| P08 | `packages/audit/test/Retention.tst.ts:22` | `planPurge` | `Result.Result<PurgePlan, RetentionInputInvalid>` | callable | `Retention.tst.ts:17` | plain return |
| P09 | `packages/core/test/Decision.tst.ts:31` | `Allow` | an `Allow` instance | constructable | `Decision.tst.ts:27` | plain return |
| P10 | `packages/core/test/Decision.tst.ts:32` | `Allow` | an `Allow` instance | constructable | `Decision.tst.ts:27` | plain return |
| P11 | `packages/core/test/Decision.tst.ts:36` | `Allow` | an `Allow` instance | constructable | `Decision.tst.ts:27` | plain return |
| P12 | `packages/core/test/Decision.tst.ts:37` | `Allow` | an `Allow` instance | constructable | `Decision.tst.ts:27` | plain return |
| P13 | `packages/core/test/Decision.tst.ts:42` | `Deny` | a `Deny` instance | constructable | `Decision.tst.ts:41` | plain return |
| P14 | `packages/core/test/Decision.tst.ts:46` | `Deny` | a `Deny` instance | constructable | `Decision.tst.ts:41` | plain return |
| P15 | `packages/core/test/Decision.tst.ts:47` | `Deny` | a `Deny` instance | constructable | `Decision.tst.ts:41` | plain return |
| P16 | `packages/core/test/DecisionCache.tst.ts:46` | `GetOrCompute` | `Effect.Effect<CacheLookup, EvaluationError, PortServices>` (`DecisionCacheShape["getOrCompute"]` read through `Params`) | callable | `DecisionCache.tst.ts:42` | Params<F> over an Effect |
| P17 | `packages/core/test/DecisionCache.tst.ts:47` | `GetOrCompute` | `Effect.Effect<CacheLookup, EvaluationError, PortServices>` (`DecisionCacheShape["getOrCompute"]` read through `Params`) | callable | `DecisionCache.tst.ts:42` | Params<F> over an Effect |
| P18 | `packages/core/test/DecisionCache.tst.ts:48` | `GetOrCompute` | `Effect.Effect<CacheLookup, EvaluationError, PortServices>` (`DecisionCacheShape["getOrCompute"]` read through `Params`) | callable | `DecisionCache.tst.ts:42` | Params<F> over an Effect |
| P19 | `packages/core/test/DecisionLog.tst.ts:30` (base) | `makeDecisionLog` | `Effect.Effect<DecisionLog>` | callable | `DecisionLog.tst.ts:33` (`toBeAssignableTo<Options>`; the refusal now sits at `:34`) | rewritten (was vacuous) |
| P20 | `packages/core/test/EvaluationEnvironment.tst.ts:47` | `evaluationEnvironment` | `Layer.Layer<StandingEvaluationServices>` | callable | `EvaluationEnvironment.tst.ts:65` | plain return |
| P21 | `packages/core/test/EvaluationEnvironment.tst.ts:48` | `evaluationEnvironment` | `Layer.Layer<StandingEvaluationServices>` | callable | `EvaluationEnvironment.tst.ts:65` | plain return |
| P22 | `packages/core/test/EvaluationEnvironment.tst.ts:49` | `evaluationEnvironment` | `Layer.Layer<StandingEvaluationServices>` | callable | `EvaluationEnvironment.tst.ts:65` | plain return |
| P23 | `packages/core/test/EvaluationEnvironment.tst.ts:55` | `evaluationEnvironment` | `Layer.Layer<StandingEvaluationServices>` | callable | `EvaluationEnvironment.tst.ts:65` | plain return |
| P24 | `packages/core/test/Explanation.tst.ts:35` | `foldExplanationCases` | `R` | callable | `Explanation.tst.ts:43` | plain return |
| P25 | `packages/core/test/Explanation.tst.ts:55` | `foldExplanationCases` | `R` | callable | `Explanation.tst.ts:64` | plain return |
| P26 | `packages/core/test/HydrationMetrics.tst.ts:27` | `hydrationDropMeaning` | `HydrationDropMeaning` | callable | `HydrationMetrics.tst.ts:26` | plain return |
| P27 | `packages/core/test/HydrationMetrics.tst.ts:28` | `hydrationDropMeaning` | `HydrationDropMeaning` | callable | `HydrationMetrics.tst.ts:26` | plain return |
| P28 | `packages/core/test/Matcher.tst.ts:33` | `foldMatcherCases` | `R` | callable | `Matcher.tst.ts:39` | plain return |
| P29 | `packages/core/test/Matcher.tst.ts:49` | `foldMatcherCases` | `R` | callable | `Matcher.tst.ts:56` | plain return |
| P30 | `packages/core/test/Policy.tst.ts:102` | `foldPolicyCases` | `R` | callable | `Policy.tst.ts:125` | plain return |
| P31 | `packages/core/test/Policy.tst.ts:113` | `foldPolicyCases` | `R` | callable | `Policy.tst.ts:125` | plain return |
| P32 | `packages/core/test/PortAccess.tst.ts:41` | `Params<typeof askSignature>` | `Effect.Effect<SignatureAnswer, SignatureHistoryUnavailable or MissingResourceId, SignatureHistory>` (an `Effect.fn`, read through `Params`) | callable | `PortAccess.tst.ts:45` | Params<F> over an Effect |
| P33 | `packages/core/test/PortAccess.tst.ts:49` | `Params<typeof askRelationship>` | `Effect.Effect<RelatedResult, RelationshipResolveError or MissingResourceId, RelationshipResolver>` (an `Effect.fn`, read through `Params`) | callable | `PortAccess.tst.ts:53` | Params<F> over an Effect |
| P34 | `packages/core/test/PortAccess.tst.ts:57` | `Params<typeof askActed>` | `Effect.Effect<ActedResult, DecisionHistoryUnavailable, DecisionHistory>` (read through `Params`, which sees the last overload only) | callable | `PortAccess.tst.ts:62` | Params<F> over an Effect |
| P35 | `packages/core/test/PortAccess.tst.ts:58` | `Params<typeof askActed>` | `Effect.Effect<ActedResult, DecisionHistoryUnavailable, DecisionHistory>` (read through `Params`, which sees the last overload only) | callable | `PortAccess.tst.ts:62` | Params<F> over an Effect |
| P36 | `packages/core/test/PortAccess.tst.ts:67` | `Params<typeof readAttribute>` | `Effect.Effect<unknown, AttributeResolveError, AttributeResolver>` (read through `Params`) | callable | `PortAccess.tst.ts:71` | Params<F> over an Effect |
| P37 | `packages/core/test/PortAccess.tst.ts:76` | `Params<typeof askCustom>` | `Effect.Effect<boolean, CustomPredicateError, CustomPredicate>` (an `Effect.fn`, read through `Params`) | callable | `PortAccess.tst.ts:80` | Params<F> over an Effect |
| P38 | `packages/core/test/PortDefault.tst.ts:19` | `isPortDefault` | `boolean` | callable | `PortDefault.tst.ts:15` | plain return |
| P39 | `packages/core/test/PortSpan.tst.ts:15` | `spanStruct` | `SpanStruct<Fields>` | callable | `PortSpan.tst.ts:26` | plain return |
| P40 | `packages/core/test/PortSpan.tst.ts:22` | `spanStruct` | `SpanStruct<Fields>` | callable | `PortSpan.tst.ts:26` | plain return |
| P41 | `packages/core/test/PortSpan.tst.ts:33` | `spanStruct` | `SpanStruct<Fields>` | callable | `PortSpan.tst.ts:26` | plain return |
| P42 | `packages/core/test/PortSpan.tst.ts:37` | `spanStruct` | `SpanStruct<Fields>` | callable | `PortSpan.tst.ts:26` | plain return |
| P43 | `packages/core/test/Ports.tst.ts:69` | `portsLayer` | `Layer.Layer<PortServices>` | callable | `Ports.tst.ts:68` | plain return |
| P44 | `packages/core/test/Qadi.tst.ts:115` | `enforceProjectedLoaded` | `<A, E, R>(self: Effect<A, E, R>) => Effect<Partial<A>, E or EnforcementError or EO, R or EvaluationServices or RO>` | callable | `Qadi.tst.ts:125` | plain return |
| P45 | `packages/core/test/Qadi.tst.ts:118` | `enforceLoaded` | `<A, E, R>(self: Effect<A, E, R>) => Effect<A, E or EnforcementError or EO, R or EvaluationServices or RO>` | callable | `Qadi.tst.ts:124` | plain return |
| P46 | `packages/core/test/Qadi.tst.ts:120` | `enforceProjected` | `<A, E, R>(self: Effect<A, E, R>) => Effect<Partial<A>, E or EnforcementError or EO, R or EvaluationServices or RO>` | callable | `Qadi.tst.ts:123` | plain return |
| P47 | `packages/core/test/Qadi.tst.ts:165` | `guard` | `<A, B, E, R>(resource, handler) => Effect<B, E or EnforcementError or EO, R or EvaluationServices or RO>` | callable | `Qadi.tst.ts:167` | plain return |
| P48 | `packages/core/test/UntrustedDecode.tst.ts:59` | `untrustedDecoder` | `UntrustedDecoder<S["Type"], R>` | callable | `UntrustedDecode.tst.ts:58` | plain return |
| P49 | `packages/core/test/UntrustedDecode.tst.ts:60` | `untrustedDecoder` | `UntrustedDecoder<S["Type"], R>` | callable | `UntrustedDecode.tst.ts:58` | plain return |
| P50 | `packages/core/test/UntrustedDecode.tst.ts:61` | `untrustedDecoder` | `UntrustedDecoder<S["Type"], R>` | callable | `UntrustedDecode.tst.ts:58` | plain return |
| P51 | `packages/core/test/UntrustedDecode.tst.ts:71` | `untrustedDecoder` | `UntrustedDecoder<S["Type"], R>` | callable | `UntrustedDecode.tst.ts:70` | plain return |
| P52 | `packages/core/test/UntrustedDecode.tst.ts:76` | `untrustedDecoder` | `UntrustedDecoder<S["Type"], R>` | callable | `UntrustedDecode.tst.ts:75` | plain return |
| P53 | `packages/core/test/UntrustedDecode.tst.ts:84` | `untrustedDecoder` | `UntrustedDecoder<S["Type"], R>` | callable | `UntrustedDecode.tst.ts:88` | plain return |
| P54 | `packages/core/test/UntrustedDecode.tst.ts:85` | `untrustedDecoder` | `UntrustedDecoder<S["Type"], R>` | callable | `UntrustedDecode.tst.ts:88` | plain return |
| P55 | `packages/core/test/UntrustedDecode.tst.ts:86` | `untrustedDecoder` | `UntrustedDecoder<S["Type"], R>` | callable | `UntrustedDecode.tst.ts:88` | plain return |
| P56 | `packages/core/test/UntrustedDecode.tst.ts:87` | `untrustedDecoder` | `UntrustedDecoder<S["Type"], R>` | callable | `UntrustedDecode.tst.ts:88` | plain return |
| P57 | `packages/core/test/WalkEnvironment.tst.ts:40` | `admit` | `Result.Result<Admitted<Source>, PolicyTooDeep>` | callable | `WalkEnvironment.tst.ts:42` | plain return |
| P58 | `packages/core/test/WalkEnvironment.tst.ts:41` | `admit` | `Result.Result<Admitted<Source>, PolicyTooDeep>` | callable | `WalkEnvironment.tst.ts:42` | plain return |
| P59 | `packages/devtools/test/model/DiagnosticsStore.tst.ts:59` | `Params<typeof runDiagnostics>` | an `Effect` over `void` (`Effect.fn`, read through `Params`) | callable | `DiagnosticsStore.tst.ts:51` | Params<F> over an Effect |
| P60 | `packages/devtools/test/model/DiagnosticsStore.tst.ts:64` | `Params<typeof runDiagnostics>` | an `Effect` over `void` (`Effect.fn`, read through `Params`) | callable | `DiagnosticsStore.tst.ts:51` | Params<F> over an Effect |
| P61 | `packages/devtools/test/model/DiagnosticsStore.tst.ts:71` | `Params<typeof runDiagnostics>` | an `Effect` over `void` (`Effect.fn`, read through `Params`) | callable | `DiagnosticsStore.tst.ts:51` | Params<F> over an Effect |
| P62 | `packages/http/test/DecisionLogHttp.tst.ts:41` | `decisionBacklogRoute` | the `Layer` `addGuardedRoute(...)` builds (inferred) | callable | `DecisionLogHttp.tst.ts:37` | plain return |
| P63 | `packages/http/test/DecisionStreamRoute.tst.ts:25` | `decisionStreamRoute` | the `Layer` `addGuardedRoute(...)` builds (inferred) | callable | `DecisionStreamRoute.tst.ts:21` | plain return |
| P64 | `packages/http/test/DecisionStreamRoute.tst.ts:35` | `sseText` | `string` | callable | `DecisionStreamRoute.tst.ts:34` | plain return |
| P65 | `packages/http/test/DecisionStreamRoute.tst.ts:36` | `sseText` | `string` | callable | `DecisionStreamRoute.tst.ts:34` | plain return |
| P66 | `packages/http/test/DecisionStreamRoute.tst.ts:37` | `sseText` | `string` | callable | `DecisionStreamRoute.tst.ts:34` | plain return |
| P67 | `packages/http/test/DevtoolsRouteAddress.tst.ts:26` | `devtoolsPath` | `/${string}` | callable | `DevtoolsRouteAddress.tst.ts:30` | plain return |
| P68 | `packages/http/test/DevtoolsRouteAddress.tst.ts:32` | `devtoolsPath` | `/${string}` | callable | `DevtoolsRouteAddress.tst.ts:31` | plain return |
| P69 | `packages/http/test/DevtoolsRouteAddress.tst.ts:42` | `decisionStreamRoute` | the `Layer` `addGuardedRoute(...)` builds (inferred) | callable | `DevtoolsRouteAddress.tst.ts:38` | plain return |
| P70 | `packages/http/test/DevtoolsRouteAddress.tst.ts:48` | `devtoolsRoutes` | `Layer.mergeAll` of the three devtools route layers (inferred) | callable | `DevtoolsRouteAddress.tst.ts:47` | plain return |
| P71 | `packages/http/test/DevtoolsRouteAddress.tst.ts:49` | `devtoolsRoutes` | `Layer.mergeAll` of the three devtools route layers (inferred) | callable | `DevtoolsRouteAddress.tst.ts:47` | plain return |
| P72 | `packages/http/test/DevtoolsRouteAddress.tst.ts:53` | `devtoolsRoutes` | `Layer.mergeAll` of the three devtools route layers (inferred) | callable | `DevtoolsRouteAddress.tst.ts:47` | plain return |
| P73 | `packages/http/test/GuardApi.tst.ts:47` | `guardApi` | `Layer.Layer<RequirePermission, ApiGuardRefusal, SubjectExtractor or StandingEvaluationServices or PermissionRegistry>` | callable | `GuardApi.tst.ts:39` | plain return |
| P74 | `packages/http/test/GuardApi.tst.ts:51` | `guardApi` | `Layer.Layer<RequirePermission, ApiGuardRefusal, SubjectExtractor or StandingEvaluationServices or PermissionRegistry>` | callable | `GuardApi.tst.ts:39` | plain return |
| P75 | `packages/http/test/GuardApi.tst.ts:55` | `guardApi` | `Layer.Layer<RequirePermission, ApiGuardRefusal, SubjectExtractor or StandingEvaluationServices or PermissionRegistry>` | callable | `GuardApi.tst.ts:39` | plain return |
| P76 | `packages/http/test/GuardRoute.tst.ts:133` | `addGuardedRoute("GET", "/x", readPermission, readPolicy)` | `<R>(handler: GuardedHandler<P, Resource, R>) => GuardedRoute<R, never>` (the first of `addGuardedRoute`'s overloads) | callable | `GuardRoute.tst.ts:136` | plain return |
| P77 | `packages/http/test/RequirePermission.tst.ts:45` | `requiresPermission` | `RequiredPermissionShape` | callable | `RequirePermission.tst.ts:35` | plain return |
| P78 | `packages/http/test/RequirePermission.tst.ts:49` | `requiresPermission` | `RequiredPermissionShape` | callable | `RequirePermission.tst.ts:35` | plain return |
| P79 | `packages/http/test/RequirePermission.tst.ts:63` | `plainEndpoint.annotate` | the endpoint, annotated (`HttpApiEndpoint` method) | callable | `RequirePermission.tst.ts:67` | plain return |
| P80 | `packages/promise/test/Facade.tst.ts:25` | `qadi.filter` | `Promise<ReadonlyArray<A>>` | callable | `Facade.tst.ts:43` | plain return |
| P81 | `packages/promise/test/Facade.tst.ts:28` | `qadi.filterProjected` | `Promise<ReadonlyArray<Partial<A>>>` | callable | `Facade.tst.ts:45` | plain return |
| P82 | `packages/promise/test/Facade.tst.ts:33` | `qadi.filter` | `Promise<ReadonlyArray<A>>` | callable | `Facade.tst.ts:43` | plain return |
| P83 | `packages/promise/test/Facade.tst.ts:34` | `qadi.filterProjected` | `Promise<ReadonlyArray<Partial<A>>>` | callable | `Facade.tst.ts:45` | plain return |
| P84 | `packages/promise/test/Facade.tst.ts:40` | `qadi.projected` | `Promise<Partial<A>>` | callable | `Facade.tst.ts:49` | plain return |
| P85 | `packages/react/test/DevtoolsFeed.tst.ts:23` | `useDevtoolsFeed` | `DevtoolsFeed<Extra>` | callable | `DevtoolsFeed.tst.ts:29` | plain return |
| P86 | `packages/react/test/DevtoolsFeed.tst.ts:24` | `useDevtoolsFeed` | `DevtoolsFeed<Extra>` | callable | `DevtoolsFeed.tst.ts:29` | plain return |
| P87 | `packages/react/test/DevtoolsFeed.tst.ts:25` | `useDevtoolsFeed` | `DevtoolsFeed<Extra>` | callable | `DevtoolsFeed.tst.ts:29` | plain return |
| P88 | `packages/react/test/Hydration.tst.ts:52` | `isAllowed` | `self is Allow` (a type predicate) | callable | `Hydration.tst.ts:53` | plain return |

The seven pins in `FloatingEffectPins.tst.ts` are not classified here: they pin the tool's reading of an Effect-returning call under both settings of `floatingEffect`, not a library signature, and its budget row says so.

## Overloads

`overload inventory: 20 subject(s)` (`<S>/overload-inventory.mjs`, run on HEAD `1a5e5b4d` after 62-02: every refusal pin read through `Params<…>`, `Parameters<…>` or `ConstructorParameters<…>`, directly or through a same-file `type` alias). `Params<F>` and `Parameters<F>` read only the last overload, so an overloaded subject is checked against one signature only. Each verdict was read from the declaration. One subject is overloaded: `askActed`, so 62-04 writes AGENTS.md's last-overload note.

- `askActed`: `packages/core/src/PortAccess.ts:414`; read by `PortAccess.tst.ts:57`, `:58`; **overloaded (2 signatures)**, plus the implementation signature `(...args: Parameters<typeof readActed>)`, which is not visible to callers. The first takes `AnyActedLeaf` and returns `Effect<ActedResult, DecisionHistoryUnavailable, DecisionHistory>`; the second takes `ActedLeaf` and returns `ReturnType<typeof readActed>`. `Params<typeof askActed>` sees only the second, so the pins refuse loose strings against `ActedLeaf`'s overload and say nothing of `AnyActedLeaf`'s.
- `askCustom`: `packages/core/src/PortAccess.ts:456`; read by `PortAccess.tst.ts:76`; not overloaded (one `Effect.fn` signature).
- `askRelationship`: `packages/core/src/PortAccess.ts:440`; read by `PortAccess.tst.ts:49`; not overloaded (one `Effect.fn` signature).
- `askSignature`: `packages/core/src/PortAccess.ts:481`; read by `PortAccess.tst.ts:41`; not overloaded (one `Effect.fn` signature).
- `DecisionRecord`: `packages/core/src/DecisionRecord.ts:70`; read by `SinkRecord.tst.ts:74` (`ConstructorParameters<typeof DecisionRecord>[0]`); not overloaded (a `Data.TaggedClass` with one constructor).
- `decodeDecisionStream`: `packages/core/src/DecisionStream.ts:240`; read by `DecisionStream.tst.ts:64`, `:67` (its `type Options = Parameters<typeof decodeDecisionStream>[1]`; the inventory also lists `:55`, `:57`, because the two file-local `Options` aliases share one name); not overloaded (one `Effect.fn` signature).
- `encodeDecisionStream`: `packages/core/src/DecisionStream.ts:139`; read by `DecisionStream.tst.ts:55`, `:57` (its `type Options = Parameters<typeof encodeDecisionStream>[1]`; the inventory also lists `:64`, `:67`, for the same shared-alias reason); not overloaded (one arrow signature).
- `evaluateNode`: `packages/core/src/Walk.ts:316`; read by `WalkEnvironment.tst.ts:23`, `:24`, `:47`; not overloaded (one arrow signature).
- `filter`: `packages/core/src/Qadi.ts:327`; read by `Qadi.tst.ts:177`, `:178`; not overloaded (one generic arrow signature).
- `filterProjected`: `packages/core/src/Qadi.ts:390`; read by `Qadi.tst.ts:185`, `:186`; not overloaded (one generic arrow signature).
- `filterStream`: `packages/core/src/Qadi.ts:362`; read by `Qadi.tst.ts:181`, `:182`; not overloaded (one generic arrow signature).
- `filterStreamProjected`: `packages/core/src/Qadi.ts:415`; read by `Qadi.tst.ts:189`, `:190`; not overloaded (one generic arrow signature).
- `getOrCompute`: `packages/core/src/DecisionCache.ts:100` (the `DecisionCacheShape["getOrCompute"]` property, whose function type the test file's `Params` reads); read by `DecisionCache.tst.ts:46`, `:47`, `:48`; not overloaded (one function type).
- `guard`: `packages/core/src/Qadi.ts:266`; read by `Qadi.tst.ts:166`; not overloaded (curried: one outer signature, and the returned function is one generic signature).
- `makeDecisionLog`: `packages/core/src/DecisionLog.ts:188`; read by `DecisionLog.tst.ts:34`; not overloaded (one arrow signature; 62-02 states its refusal on `Parameters<typeof makeDecisionLog>[0]`).
- `ObligationRecord`: `packages/core/src/DecisionRecord.ts:97`; read by `SinkRecord.tst.ts:97` (`ConstructorParameters<typeof ObligationRecord>[0]`); not overloaded (a `Data.TaggedClass` with one constructor).
- `readAttribute`: `packages/core/src/PortAccess.ts:344`; read by `PortAccess.tst.ts:67`; not overloaded (one arrow signature).
- `route`: no declaration in `packages/*/src`; the local `const route = guard(read, hasPermission(read))` at `packages/core/test/Qadi.tst.ts:97`, read by `Qadi.tst.ts:108`; not overloaded (it is the function `guard` at `Qadi.ts:266` returns, one generic signature).
- `runDiagnostics`: `packages/devtools/src/model/DiagnosticsStore.ts:235`; read by `DiagnosticsStore.tst.ts:59`, `:64`, `:71`; not overloaded (one `Effect.fn` signature).
- `unwrittenRow`: `packages/audit/src/UnwrittenRow.ts:34`; read by `UnwrittenRow.tst.ts:20`; not overloaded (typed `(self: UnwrittenTag) => UnwrittenRow`).

A callable pin whose subject is not read through a parameter type can also touch an overload set, and is outside the inventory: `addGuardedRoute("GET", "/x", readPermission, readPolicy)` (`GuardRoute.tst.ts:133`, sweep row S75) calls `addGuardedRoute`, which has two overloads (`GuardRoute.ts:113`, `:119`); the call selects the four-argument one and the pin refuses a handler typed on a narrower resource, so no overload is hidden.
