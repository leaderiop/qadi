---
id: ARCH-10
title: Describe each port once; derive its wrapper set, fail-closed default, environment type and scriptable test double from that description
strength: Strong
status: implemented
evidence_verified_at: e0ee958
depends_on: [ARCH-01, ARCH-04]   # both implemented on arch/integration; this plan builds on PortAccess.ts and StandingEvaluationServices
blocks: []
adrs_touched:
  - ADR-QD-010 (amend — note only: Shapes unchanged; a port module now also declares its description, and its layers are derived from it)
  - ADR-QD-040 (amend — note only: each named fail-closed default is derived from the description's `none` answer; names and answers unchanged)
  - ADR-QD-051 (amend — `qadi.attempts` is annotated by every retrying wrapper, not only the attribute one; span names come from the description)
  - ADR-QD-077 (amend — `PortAccess.ts`'s defect constructors and span names come from each port's description)
  - ADR-QD-052 (read — metric declared once; `description` is part of the registry key; `preregisteredWords` is not)
  - ADR-QD-020 (read — three-valued history answer; `"Unknown"` is the None answer)
  - ADR-QD-055 (read — `HAS_CUSTOM_BUDGET`; unaffected, no new `hasCustom(` call site in src)
  - ADR-QD-060 / ADR-QD-072 (read — `SCHEMA_ERROR_BUDGET`; no new error class)
  - ADR-QD-034 / ADR-QD-073 (read — `SWITCH_BUDGET`, `UNTRACED_BUDGET` unchanged; benchmark habit)
  - ADR-QD-075 (read — `ANY_BUDGET` unchanged; the generic machinery uses `infer`, never `any`)
  - ADR-QD-037 (read — madge gate; import direction of the two new modules)
  - ADR-QD-025 / ADR-QD-076 (read — mutation gate, static mutants skipped)
  - ADR-QD-NEXT (new — a port is described once; its wrappers, default, environment and double are derived)
packages: ["@qadi/core", "@qadi/testing", "@qadi/devtools", "@qadi/react (tests)", "@qadi/http (tests)", "@qadi/promise (tests)", "features (acceptance suite)", "examples/nextjs-newsroom", "examples/http-advanced", "apps/website (docs)"]
estimate: XL   # L if the minimal path (D-10-a option 3) is taken
---

# ARCH-10 — Describe each port once; derive the rest

## 1. Verified evidence (at `e0ee958`)

Re-checked against the `arch/integration` worktree
`/Users/mohammadalmechkor/Projects/Perso/qadi/.claude/worktrees/agent-adb672833eb753a12`
(`git rev-parse --short HEAD` = `e0ee958`), which is `main` (`c75220e`) plus
ARCH-01..07. ARCH-01 already built the *call* half of a port seam —
`packages/core/src/PortAccess.ts` owns subject-first lookup, question forming,
the span, the call metric and defect mapping for every port read either
interpreter makes — and ARCH-04 T3 added `StandingEvaluationServices`
(`packages/core/src/Evaluate.ts:269`). This plan covers what is left: the
*layer* half (wrappers, defaults, environments, doubles) and the type-level
spellings of "the five ports".

**Tooling notes.** The root checkout's `node_modules/.bin/vitest` fails inside
the worktree (`TypeError: Cannot read properties of undefined (reading 'config')`,
a version mismatch); the worktree's own `$W/node_modules/.bin/vitest` (v5.0.0)
works. Every verify command below assumes `pnpm` run from the worktree, which
resolves its own binaries. Probes live in
`/private/tmp/claude-502/…/scratchpad/arch10/` (`scan.mjs`, `attempts.mts`,
`merge-override.mts`, `probe/{PortDescription,Registry,Visit,Decorate}.ts`,
`probe/run.mts`), with `node_modules` symlinked to `$W/packages/core/node_modules`
and type-checked by `typescript@5.9.3` against a `tsconfig.json` that extends
`$W/tsconfig.base.json` (strict, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`).

**Baselines (all at `e0ee958`).**
- `vitest run packages/testing/test/TestLayers.test.ts packages/core/test/{AttributeResolver,CustomPredicate,RelationshipResolver,Ports,Layers,DecisionHistory,SignatureHistory,PortAccess}.test.ts` → 9 files, **150/150 pass**.
- `vitest run packages/core/test/{Evaluate,Predicate,SubjectSet,DecisionCache}.test.ts packages/devtools/test/model/{Capture,Wiring,Replay}.test.ts` → 7 files, **462/462 pass**.
- `madge --circular --extensions ts,tsx packages/*/src` → **no circular dependency**.

| # | Claim (from the brief / the 2026-10-05 review, candidate 03) | Verdict | What `e0ee958` shows |
| - | ------------------------------------------------------------- | ------- | -------------------- |
| E1 | The wrapper set is ragged across the five ports | **CONFIRMED** | `*Retrying`: `AttributeResolver.ts:125`, `RelationshipResolver.ts:206`, `CustomPredicate.ts:123`. `*Bounded`: `AttributeResolver.ts:188`, `RelationshipResolver.ts:237`, `CustomPredicate.ts:149`. `*TimingOut`: `AttributeResolver.ts:228`, `RelationshipResolver.ts:256` only. `DecisionHistory.ts` and `SignatureHistory.ts` have none (`git grep -nE "(decisionHistory\|signatureHistory)(Retrying\|Bounded\|TimingOut)\|customPredicateTimingOut"` is empty). `PortMetrics.ts:136-139` admits the gap in prose: "`DecisionHistory`, `CustomPredicate` and `SignatureHistory` share the same unbounded-latency gap but have no combinator yet". A hung history or signature store therefore holds an evaluation open with no library-provided deadline. |
| E2 | Only `attributeResolverRetrying` records the per-request attempt count (KH-01); `customPredicateRetrying`'s doc says it "Mirrors `attributeResolverRetrying` exactly" | **CONFIRMED — live observability defect** | `AttributeResolver.ts:133-155` counts invocations in a `Ref` and `Effect.ensuring`-annotates `qadi.attempts`. `RelationshipResolver.ts:211-217` and `CustomPredicate.ts:128-134` are bare `tapError` + `retry`. The doc claim is at `CustomPredicate.ts:120`. Probe `attempts.mts` (each wrapper around a port failing twice then succeeding, inside a `caller` span, `collectingTracer` from `packages/core/test/helpers.ts:120`): `attribute { 'qadi.attempts': 3 }`, `relationship {}`, `custom {}`. KH-01's reason ("a trace reader sees one deceptively slow call rather than the N store round trips", `AttributeResolver.ts:112-123`) applies to every retrying wrapper, so two of three wrappers hide their retries from traces. Only `AttributeResolver.test.ts:68-88` pins the annotation. |
| E3 | `RetryingLayer.ts` rejected one generic shape because port methods differ in arity | **CONFIRMED; the cost is real but SETTLED as avoidable** | `RetryingLayer.ts:1-15`: the wrapping logic "differs by method name and arity … and stays local to each combinator rather than being forced through one generic" form. Arity: `resolve(subjectId, attribute)` (`AttributeResolver.ts:66-69`) and `evaluate(name, subject, resource, params)` (`CustomPredicate.ts:46-51`) are positional; `check(request)` (`RelationshipResolver.ts:104-106`), `hasActed(query)` (`DecisionHistory.ts:63-65`), `signaturesFor(query)` (`SignatureHistory.ts:52-54`) take one object. **Settled by probe:** a per-port *lens* — `invoke: (shape) => (...args: Args) => Effect<A, E>` and `make: (name, call) => Shape`, with `Args` a tuple type — lets one generic `retrying`/`bounded`/`timingOut`/`none`/`scripted` derivation serve all five without touching any Shape. `probe/PortDescription.ts` type-checks with **no `as`, no `any`, no `!`** (exit 0), and `probe/run.mts` runs it: a scripted attribute port answers its table, fails its failing key, falls back to the None answer and logs `['["alice","level"]','["alice","boom"]','["alice","other"]']`; `retrying(customPort)` reports name `flaky (retrying)` and 3 invocations; `timingOut(attributePort)` turns `Effect.never` into `AttributeResolveError` with `attribute: "z"`; `bounded(relationshipPort)(0)` fails layer construction with `InvalidBoundedPermits`. `make: (name, call) => ({ name, resolve: call })` also type-checks, so a derived layer need add no indirection. |
| E4 | `PortMetrics.ts` keeps three hand-written port-name lists | **CONFIRMED (four)** | `PortName` + `PORT_NAMES_BY_NAME` (`PortMetrics.ts:57-73`), `RetryingPortName` + its record (`:104-114`), `TimingOutPortName` + its record (`:141-150`), `PredicatePortName` + its record (`:176-185`). The last one is a legitimate subset (translation refuses three nodes, enforced by `PortAccess.ts`'s parameter types); the middle two exist only because the wrapper set is ragged. **Metric identity verified:** `effect@4.0.0/dist/Metric.js:1688-1691` keys the registry on `JSON.stringify([type, id, description, attributes])`; `preregisteredWords` (`:245-255`) is not in the key. Widening `portRetriesTotal`/`portTimeoutsTotal` to all five words therefore changes no registry key, provided the `description` strings stay byte-identical (ADR-QD-052). |
| E5 | The required-services union is still hand-spelled in several places | **CHANGED — narrower after ARCH-04, but three names remain for the five-port set** | **Hand-written:** `EvaluationServices` (`Evaluate.ts:245-252`, the definition), `WalkServices` (`Evaluate.ts:280-285`, private), `EvaluationRequirements` (`DecisionCache.ts:108-113`, private), `QadiServices` (`packages/core/test/helpers.ts:23-30`). **Derived already:** `StandingEvaluationServices` (`Evaluate.ts:269`), `SubjectSetServices` (`SubjectSet.ts:43`), `EvaluationServicesNone`'s type (`EvaluationServicesNone.ts:52`), react `QadiRuntimeServices`/`QadiLayer` (`QadiAtoms.ts:57`, `:68-72`), promise `QadiLayer` (`promise/src/index.ts:48`), http `RequirePermission.ts:344,354` and `DecisionStreamRoute.ts:230,326`, testing `QadiTestServices = EvaluationServices` (`QadiReviewLayer.ts:44`). **Re-spellings of a derived set:** testing `Exclude<QadiTestServices, CurrentSubject>` (`QadiReviewLayer.ts:144`) and core `Exclude<QadiServices, CurrentSubject>` (`helpers.ts:77`) both mean `StandingEvaluationServices`; devtools `EvaluationPorts = Exclude<EvaluationServices, CurrentSubject \| EvaluationId>` (`devtools/src/model/SimulationInput.ts:77`) is the same five-port set as `WalkServices` and `EvaluationRequirements` — **one set, three names**, one of them public. `PortName` (`PortMetrics.ts:57`) is a fourth hand-list of the same five, as a string union. |
| E6 | Per-port override objects are hand-listed | **CONFIRMED (new)** | `helpers.ts:44-60` (`testLayer` overrides) and `:71-85` (`subjectSetLayer`); `QadiReviewLayer.ts:119-127` (`TestLayerOptions`' five layer overrides) and `:142-165`; `EvaluationServicesNone.ts:52-59`; devtools `SimulationSource.ts:127-150` (`fixtureLayer`); devtools `Capture.ts:61-89` (`CapturedAnswers`, `emptyAnswers`, `answerCount`), `:145-215` (`capturing`, five blocks), `:272-321` (`replayLayer`, five blocks). A sixth port edits every one of them by hand; none fails to compile if forgotten except the two annotated `Layer.Layer<…Services>` returns. |
| E7 | `@qadi/testing`: five `Failing*` modules (18–24 lines) with no callers outside `TestLayers.test.ts`; three repeat `Layer.build`/`Context.get` because `wrapService` is not exported | **CONFIRMED / CHANGED** | Line counts 18, 18, 18, 24, 24 (`wc -l packages/testing/src/Failing*.ts`). `git grep -l failing{Attribute,Custom,Decision,Relationship,Signature}…` outside `.md`: only the defining files and `packages/testing/test/TestLayers.test.ts` (plus `reports/audit-2026-09-07/…` JSON). `EdgeRelationshipResolver.ts:23-36`, `EventDecisionHistory.ts:24-41`, `RecordingSignatureHistory.ts:25-42` each repeat `wrapService`'s body. **CHANGED:** `wrapService` *is* exported (`RetryingLayer.ts:24`) and reachable as `@qadi/core/RetryingLayer` through the `./*` subpath (`spec/overview.md:764`); it is out of the barrel, and `@qadi/testing` simply does not use it. Ten per-port doubles (`Failing*` ×5, `Recording*` ×3, `edge…`, `event…`) plus `CallRecorder.ts` — 11 of 16 `src` files. |
| E8 | ~48 hand-written failing port layers across ~26 test files; they need per-key failure and call counting the unconditional doubles cannot express | **CHANGED — 65 sites in 27 files, and most are unconditional** | AST scan (`scan.mjs`: every `Layer.succeed/effect/sync(<port service>, …)` in tracked `.ts/.tsx`): **176** hand-written port layers in test/feature/bench files across 38 files (core 106, devtools 33, react 16, features 10, http 7, promise 2, newsroom tests 2). Of these, **65** fail with a port error, in **27** files (57 in 24 package test files, 8 in 3 feature files); by port: Attribute 50, Relationship 6, History 6, Custom 2, Signature 1. **46 of the 65 are unconditional** (no branch, no counting) — expressible by today's `failing*` doubles in principle. The real blocker is dependency direction: core's 32 sites cannot import `@qadi/testing`, which depends on core (`helpers.ts:35-43` says so), and only `@qadi/devtools` and `features` list `@qadi/testing` as a devDependency — yet devtools still hand-rolls 14, including three identical pairs in `Capture.test.ts` (`:124`/`:464`, `:157`/`:498`, `:190`/`:533`) plus three cause variants (`:564`, `:610`, `:636`). 19 more sites are conditional or counting (`Evaluate.test.ts:3814`, `SubjectSet.test.ts:386,414,462,613`, `DecisionCache.test.ts:547,584`, `Predicate.test.ts:1060,1067,1509`, …). Per file: Evaluate.test 9 (brief said 7), Capture.test 9, Predicate.test 6, SubjectSet.test 5 ✓, QadiProvider.test 2 ✓. A further **19** test port layers die or throw (defect tests). Full per-file list in T15–T17. |
| E9 | Host burden: the newsroom example lists all five ports, including unused `None`s, on server and client | **CONFIRMED; plus an ordering hazard** | `examples/nextjs-newsroom/src/server/ports.ts:104-125` and `src/client/ports.ts:135-146` both list `CustomPredicateNone` and `SignatureHistoryNone` with a comment each. **33** files list ≥ 4 of the five `None` layers by hand (`docs`, examples, devtools/react/http/promise tests). Probe `merge-override.mts`: `Layer.mergeAll(EvaluationServicesNone, attributeResolverFromRecord({x:1}))` → `['attributeResolverFromRecord', 1]`; with the order reversed → `['AttributeResolverNone', undefined]`. Overriding one port through `EvaluationServicesNone` works only when the override comes **last**; the wrong order silently denies. Nothing names that rule. |
| E10 | `api.ts`'s chained `provideMerge` infers `any` | **CHANGED — real, not a port issue** | `examples/nextjs-newsroom/src/server/api.ts:11-16` and `packages/http/test/http.test.ts:173-190` attribute it to a long `Layer.provideMerge` chain over `HttpRouter` layers, already worked around with named steps (`api.ts:236-239`). No port layer is involved; out of scope (§3). |
| E11 | Adding `HasSignature` (`f86f028`) touched 24 source files in 6 packages | **CONFIRMED, with a split** | `git show --name-only f86f028` → 24 files under `packages/*/src` + `examples/*/src`: core 10, devtools 7, testing 3, http 2, audit 1, newsroom 2 (core count includes `index.ts`). The port itself predates it (`78db288`: `Errors.ts`, `Signature.ts`, `SignatureHistory.ts`, `index.ts`). Of the 24, **5 are policy-tag work** (`Policy.ts`, `Explanation.ts`, `Predicate.ts`, `Simplify.ts`, devtools `Remedies.ts`, ARCH-02's concern) and **~19 are port plumbing**: service unions (`DecisionCache.ts`, `Evaluate.ts`, `RequirePermission.ts`), wiring (`QadiReviewLayer.ts`, `SignatureHistoryFixture.ts`, both newsroom `ports.ts`), devtools capture/replay/wiring/span decoding (`Capture.ts`, `PortCalls.ts`, `SimulationInput.ts`, `Sources.ts`, `Wiring.ts`, `ServicesPanel.tsx`), errors (`Errors.ts`, `SinkCodec.ts`, `QadiHttpError.ts`). `CustomPredicate` (`bbfd7da`) touched 30 src/step files. |
| E12 | `toPredicate` reads Attribute and History bare | **REFUTED at `e0ee958`** | ARCH-01 routed both through `PortAccess.ts` (`readAttribute` `:170-177`, `askActedAny` `:233-248`). |
| E13 | (new) The timeout metric is unread and untested | **CONFIRMED** | `git grep portTimeoutsTotal` hits only `PortMetrics.ts`, `AttributeResolver.ts:237`, `RelationshipResolver.ts:265`. No test reads it; devtools `portActivity` reads `portCallsTotal`, `portRetriesTotal`, `predicatePortCallsTotal` only (`devtools/src/model/Wiring.ts:153-155`), so the Services screen cannot show a timeout. The deadline message strings (`AttributeResolver.ts:242`, `RelationshipResolver.ts:271`) are pinned by no test (`git grep "did not settle"` hits src only). |
| E14 | (new) Fail-closed answers are copied by hand outside their port | **CONFIRMED** | `devtools/src/model/Capture.ts:330-335` re-declares `"Unknown"`, `"Unknown"`, `[]` with the comment "a replay default must never diverge from the real one" — an agreement kept by hand. `Capture.ts:109-125` holds the five request keys; `replayLayer` (`:272-321`) re-states each port's error constructor. The descriptor's `key`/`failure`/`none` is the same information. |
| E15 | (new) Wrappers have no behaviour spec; the defaults table is stale | **CONFIRMED** | `git grep -n "Retrying\|TimingOut\|Bounded" spec/behaviors spec/invariants.md` finds no requirement about any wrapper; they appear only in `spec/overview.md:237-245` and traceability row `:228`. `spec/behaviors/06-services.md` BEH-QD-043's listing (a `ts` fence, not compiled) omits `CustomPredicateNone` and `SignatureHistoryNone`. |

Further facts this plan relies on, all verified at `e0ee958`:

- **Import graph.** None of the five port modules imports `Evaluate.ts`, `Predicate.ts`, `PortAccess.ts` or `EvaluationServicesNone.ts`; `PortMetrics.ts` imports only `effect`. `EvaluationServicesNone.ts:43` imports a type from `Evaluate.ts`. A registry module that imports the five port modules and is imported (type-only) by `Evaluate.ts`/`DecisionCache.ts` creates no cycle, as long as `PortMetrics.ts` does not import it (so `PortName` stays declared in `PortMetrics.ts`).
- **Registry typing without `any`.** `probe/Registry.ts`: `type ServiceOf<D> = D extends { readonly service: Context.Key<infer S, infer _Shape> } ? S : never` and `PortServices = { readonly [K in PortName]: ServiceOf<PortTypes[K]> }[PortName]` derive the service union exactly (checked with a type-equality constant). A builder annotated `Layer.Layer<PortServices>` that omits one port is a compile error (verified with `@ts-expect-error`). `probe/Visit.ts`: a rank-2 visitor `interface PortVisitor<R> { <N, Self, Shape, Args, A, E>(d: PortDescription<…>): R }` over a `{ readonly [K in PortName]: … }` table type-checks. `probe/Decorate.ts`: a generic `decoratePorts(layer, f)` over a built context type-checks with one `Context.get` line per port.
- **`Effect.timeoutOrElse`** exists in `effect@4.0.0` (`dist/Effect.d.ts:7990`); a generic `timingOut` uses it instead of `Effect.timeout` + `catchTag("TimeoutError")`, which is awkward over a generic error type.
- **`as const` is allowed** by `no-type-assertion` (`scripts/check-house-style.mjs:134-145`); `Record`-over-closed-union exhaustiveness (TS2741) is the codebase's idiom (`PortMetrics.ts:51-55`).
- **Budgets at HEAD:** `SWITCH_BUDGET` (`check-house-style.mjs:278`), `HAS_CUSTOM_BUDGET` (`:319`, src-only, exempts `packages/core/src/` and `packages/testing/src/`), `UNTRACED_BUDGET` (`:362`), `ANY_BUDGET` (`:411`), `SCHEMA_ERROR_BUDGET` (`:439`). All src-only (`:641-644`).
- **Mutation configs:** `stryker.config.mjs` (core), `stryker.devtools.mjs`, and four others. `@qadi/testing` has none; its coverage floor is 90% (AGENTS.md §10).

## 2. Goal and success criteria

**Goal.** Five real seams — `AttributeResolver`, `RelationshipResolver`,
`CustomPredicate`, `DecisionHistory`, `SignatureHistory`, each with at least two
adapters in this repository — are today described piecemeal: a port's error
constructor, request key and fail-closed answer are each restated wherever
something wraps, replays, defaults, doubles or enumerates that port, in core,
devtools, `@qadi/testing`, the examples and ~170 test layers. ARCH-01 made the
*call* side deep (`PortAccess.ts`). This plan makes the *layer* side deep: each
port module declares one **description** beside its service — name, method,
span, a lens onto its one method, its typed-error constructors, its request
key, and its fail-closed answer — and one **module** of derivations
(`PortDescription.ts`) turns any description into the standard wrapper set
(`…Retrying`, `…Bounded`, `…TimingOut`), the named fail-closed default, a
scriptable double (answers, failing keys, typed call log) and a recording
decorator. A second module (`Ports.ts`) holds the closed registry of the five
descriptions and derives the five-port environment type, a complete-or-default
environment builder, and a visitor that one conformance suite runs over every
port. The **interface** each caller sees shrinks to "name the port"; the
**implementation** behind it (retry accounting, permits, deadlines, defaults,
doubles) lives once, so its **depth** grows with every port and its
**leverage** shows in three places: the ragged matrix closes by construction,
the 65 hand-rolled failing layers become one-line scripts, and the next port's
plumbing is one description plus a registry line the compiler asks for. The
Shapes (ADR-QD-010) do not change: the description is a lens over them, not a
replacement.

**Success criteria** (each observable):

1. Every port has all three wrappers: `git grep -nE "export const (attributeResolver|relationshipResolver|customPredicate|decisionHistory|signatureHistory)(Retrying|Bounded|TimingOut)\b" -- packages/core/src` lists **15** lines, each a one-line derivation from that port's description.
2. Every retrying wrapper annotates `qadi.attempts`: T1's tests (red at `e0ee958` for relationship and custom) and the conformance suite (T7) pass for all five ports.
3. `PortMetrics.ts` holds exactly two port-name domains: `PortName` (five) and `PredicatePortName` (two). `git grep -n "RetryingPortName\|TimingOutPortName" -- packages spec/overview.md` is empty. `Ports.test.ts` still pins every metric `description` verbatim (registry keys unchanged).
4. The five-port service set has one name: `git grep -nE "WalkServices|EvaluationRequirements" -- packages/core/src` is empty; `EvaluationPorts` (devtools) is an alias of core's `PortServices`; `EvaluationServices` is `CurrentSubject | EvaluationId | PortServices`; a tstyche test pins `keyof PortTypes` = `PortName` and `PortServices` = the five services.
5. No hand-listed port override object remains: `helpers.ts`, `QadiReviewLayer.ts`, `SimulationSource.ts`, `EvaluationServicesNone.ts` and `Capture.ts` build their environments through `portsLayer`/`mergePorts`/`decoratePorts`; `git grep -c "SignatureHistoryNone" -- packages/*/src packages/testing/src examples/*/src` lists only `packages/core/src/SignatureHistory.ts` (its derived declaration).
6. One conformance suite: `packages/core/test/PortConformance.test.ts` runs the same assertions (default, retrying, bounded, timing-out, naming, scripted double, recording decorator, defect constructor) over every member of the registry, and a port missing from its case table is a compile error.
7. The 65 hand-rolled failing port layers and 19 dying/throwing ones are migrated, except the allowlisted files that must construct errors directly (T18's ratchet); `node scripts/check-house-style.mjs` enforces the remaining per-file count in both directions.
8. **Next-port yardstick (T21):** on a throwaway branch, adding a sixth port `ProbePort` makes `tsc` report exactly the sites that must name it — the port module, `PortMetrics.ts` (`PortName`), `Ports.ts` (registry entry and one line each in `mapPorts`/`decoratePorts`), `index.ts` — and nothing in `helpers.ts`, `@qadi/testing`, devtools `Capture.ts`/`SimulationSource.ts`/`SimulationInput.ts`, `DecisionCache.ts`, `Evaluate.ts`'s service unions, react, promise, http or the examples. The conformance suite then fails to compile until `ProbePort` gets a case, and passes once it has one. (Compare `f86f028`: ~19 port-plumbing files.)
9. `@qadi/testing` exports no per-port module: `ls packages/testing/src` shows no `Failing*`, `Recording*`, `EdgeRelationshipResolver.ts`, `EventDecisionHistory.ts`, `CallRecorder.ts` (subject to D-10-f).
10. `pnpm circular` clean; `node scripts/check-house-style.mjs` passes with `SWITCH_BUDGET`, `UNTRACED_BUDGET`, `ANY_BUDGET`, `SCHEMA_ERROR_BUDGET`, `HAS_CUSTOM_BUDGET` unchanged.
11. `Evaluate.bench.ts` means for `one node`, `resolver miss`, `wide` and `deep` stay within run-to-run noise of the `e0ee958` baseline (derived defaults add no indirection on the evaluation path).
12. Targeted Stryker over `PortDescription.ts`, `Ports.ts`, the five port modules and `PortMetrics.ts` reports zero survivors in `PortDescription.ts`/`Ports.ts` and no new survivors elsewhere versus an `e0ee958` baseline; `stryker.devtools.mjs` passes; `pnpm check` passes.

## 3. Non-goals

- **Changing any port's Shape.** `AttributeResolverShape.resolve(subjectId, attribute)` and `CustomPredicateShape.evaluate(name, subject, resource, params)` keep their positional parameters; the description is a lens (D-10-a rejects normalisation).
- **Re-doing `PortAccess.ts`.** ARCH-01 owns the call side. This plan only replaces its five inline defect constructors and span-name literals with references to the descriptions (T6), with byte-identical results.
- **Policy-tag plumbing** (`Policy.ts`, `Explanation.ts`, `Predicate.ts`, `Simplify.ts`, devtools `Remedies.ts`) — ARCH-02's fold seam owns what a new *leaf* costs. The yardstick in §2.8 counts port plumbing only.
- **`EvaluationId`, `CurrentSubject`, `DecisionCache`, `DecisionSink`.** Not ports in this sense (no request, no typed failure, or optional). They stay outside the registry; `EvaluationServices` keeps naming `CurrentSubject | EvaluationId` beside `PortServices`.
- **The devtools port-call row decoder** (`PortCalls.ts` `rowOf`, `ServicesPanel.tsx` rendering). Each port asks a different question and renders different fields; that per-port code is genuine. Only `PORT_SPANS` derives from the descriptions (D-10-k).
- **`api.ts`'s `provideMerge` inference** (E10) — a Layer/HttpRouter typing limit, unrelated to ports.
- **`@qadi/audit`'s `SignatureCapturePort`** — a capture-side port of its own, not one of the five evaluation ports.
- **Answering (non-failing) hand-written test layers** beyond the 65+19 failing/defecting ones. Many of the remaining ~92 encode bespoke per-test logic (subject-keyed tables, concurrency latches); T15–T17 migrate one where the script is equally short and leave the rest. The ratchet (T18) targets only failing/defecting layers.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 imports | New modules use `import * as Effect from "effect/Effect"` etc., `.ts` relative specifiers, `import type` for type-only. Cross-package: `import { attributeResolverPort, portsLayer } from "@qadi/core"`. |
| AGENTS.md §2 / ADR-QD-010 | No new `Context.Service`. The five `…Shape` interfaces and service classes are untouched; the description sits beside the class in the same module. |
| AGENTS.md §3 layers | Every derived layer stays an exported top-level `const` in its port's module (`export const decisionHistoryRetrying = retryingPort(decisionHistoryPort)`), beside the service, as §3 asks. `RetryingLayer.ts`'s scaffolding folds into `PortDescription.ts` (its only reason to exist was the three hand-written wrappers). §3's prose gains the description (T20). Fail-closed defaults keep their specific names (`…None`, `…Never`, `…Unknown`, BEH-QD-043). |
| AGENTS.md §4 errors | No new error class → `SCHEMA_ERROR_BUDGET` stays 12. Wrapper failures use each port's existing class through the description's `failure`. No `orDie` anywhere in a derivation (bounded's permit check stays a typed `InvalidBoundedPermits`). |
| AGENTS.md §5 `Effect.fn` / `UNTRACED_BUDGET` | Derivations return layers and per-call closures, the shape today's wrappers have; no new `Effect.fnUntraced`. `PortAccess.ts`'s reads stay named `Effect.fn`, now named from the description's `span` (D-10-k). |
| AGENTS.md §5a `Match` / `SWITCH_BUDGET` | No dispatch on a tag is added; reply handling in `scriptedPort` uses `Match.type<PortReply<…>>()` hoisted per call site or `Match.tagsExhaustive` (the reply is a closed tagged union). No `switch`. |
| AGENTS.md §6 forbidden | No `as` (bar `as const`), no `any`, no `!`. The probe shows `infer` suffices for `ServiceOf`/`ArgsOf`/`AnswerOf`. No `Date.now`. `ANY_BUDGET` unchanged. |
| AGENTS.md §8 naming | A description is a value: `attributeResolverPort`, …, named `…Port` — a new row in §8's table (T20). Derivation functions are `retryingPort`/`boundedPort`/`timingOutPort`/`nonePort`/`scriptedPort`/`recordingPort`. |
| AGENTS.md §9 barrels | `PortDescription.ts` and `Ports.ts` exports that are public (D-10-c) go into `packages/core/src/index.ts`, alphabetical; scaffolding (`wrapPort`) stays out and gets a "Not listed above" row (gate 13 still sees it via `./*`). |
| AGENTS.md §10 tests | `@effect/vitest`; core ≥ 95%, testing ≥ 90%. The conformance suite lives in core so it can run without `@qadi/testing`. |
| AGENTS.md §11/§12/§15 | Spec changes ride with the code (T19); new ` ```typescript ` fences compile (`node scripts/check-doc-examples.mjs`); every new/removed export gets a `spec/overview.md` row change (`node scripts/check-api-surface.mjs`, gate 13). |
| AGENTS.md §16 | `@qadi/testing` and `@qadi/devtools` already depend on `@qadi/core` via `workspace:^`; no new package. |
| ADR-QD-037 madge | `PortDescription.ts` imports only `effect`, `Errors.ts` (`InvalidBoundedPermits`), `PortMetrics.ts`. Port modules import `PortDescription.ts`. `Ports.ts` imports the five port modules, `EvaluationId.ts`, `PortMetrics.ts` (type). `PortMetrics.ts` imports neither. `Evaluate.ts`/`DecisionCache.ts`/`EvaluationServicesNone.ts` import from `Ports.ts`; `Ports.ts` imports none of them. |
| ADR-QD-051 / BEH-QD-227 | Span names and annotations byte-for-byte unchanged; only their source moves to the description. `qadi.attempts` lands on the caller's current span for every port. |
| ADR-QD-052 / metric keying | `portCallsTotal`, `portRetriesTotal`, `portTimeoutsTotal`, `predicatePortCallsTotal` stay single declarations with unchanged `description`; only `preregisteredWords` widens (not part of the key, E4). |
| ADR-QD-040 / INV-QD-007 | Each derived default answers exactly what today's does (`undefined`, `"Unknown"`, `"Unknown"`, `false`, `[]`) and carries the same name; the conformance suite asserts both. |
| ADR-QD-055 `HAS_CUSTOM_BUDGET` | No `hasCustom(` call in any src outside core/testing; the conformance suite calls ports, not the policy constructor. Unchanged. |
| ADR-QD-077 | The defect rule (`catchPortDefect`) stays in `PortAccess.ts`; only the per-port error it builds comes from the description. |
| ADR-QD-025 / -076 Stryker | Generic derivations must be fully reachable through the conformance suite; the deadline message and timeout metric (E13) get tests so their mutants die. |
| Memory: no `Record<string, unknown>` widening | Registry and override types are mapped types over the closed `PortName`; no widened record anywhere. |
| Memory: closed unions | `PortName` stays the full closed union; `RetryingPortName`/`TimingOutPortName` are deleted rather than widened (D-10-h); `PortReply` is a closed tagged union. |
| Memory: prefer complete | Each decision below recommends the complete option unless it is wrong; the minimal path is stated beside it. |

## 5. Decisions needed before work starts

### D-10-a — How the generic derivations reach a method whose arity differs per port

- **(1) A lens description.** Each port declares `invoke: (shape) => (...args: Args) => Effect<A, E>` and `make: (name, call) => Shape`, with `Args` a (labelled) tuple — `readonly [subjectId: SubjectId, attribute: string]`, `readonly [request: RelationshipCheck]`, `readonly [name: string, subject: AuthSubject, resource: Resource | undefined, params: unknown]`. Generic derivations work over `(...args: Args) => Effect<A, E>`. Shapes untouched; probe-verified with no `as`/`any` (E3). Cost: two small per-port functions (four to six lines) in each description.
- **(2) Normalise every Shape to one request-object method.** Breaks every implementer of `AttributeResolverShape`/`CustomPredicateShape` (both newsroom `ports.ts`, `http-advanced/server.ts`, devtools `Capture.ts`, website docs, every test layer); and since the *method names* still differ (`resolve`/`check`/`hasActed`/`evaluate`/`signaturesFor`), a generic wrapper still needs `make`. Only a further rename of every method to one name (`ask(request)`) removes the lens — a larger break that reads worse at every call site. Rejected: it pays the full migration cost for nothing (1) does not already give.
- **(3) Minimal: keep hand-written wrappers.** Write the seven missing wrappers by hand, fix E2 by hand, add a shared test file. Leaves E4–E9 and E14 as they are; the next port again restates every fact.

**Recommendation: (1).** `status: decided (2026-10-05, (1) — recommended default)`

### D-10-b — Where the description and its derivations live

- **(1) Description beside its service; derivations in one module; registry in another.** Each port module (`AttributeResolver.ts`, …) declares `export const attributeResolverPort` and derives its named layers from it (§3: layers beside their service). New `PortDescription.ts` holds the `PortDescription` type and the generic derivations (absorbing `RetryingLayer.ts`, deleted). New `Ports.ts` holds the closed registry (`PortTypes`, `PORTS`), the type-level derivations (`ServiceOf`, `ArgsOf`, `AnswerOf`, `PortServices`, `PortLayers`, `PortOverrides`), and the environment functions (`mapPorts`, `mergePorts`, `portsLayer`, `decoratePorts`, `forEveryPort`). `EvaluationServicesNone.ts` becomes one line over `portsLayer()`.
- **(2) All five descriptions in `Ports.ts`.** One file to read, but a port's facts move away from its Shape and service (§3), and every port module would import the registry to derive its exports — a cycle (`Ports.ts` must import the services).
- **(3) Descriptions in `PortAccess.ts`.** Couples the layer half to the call half; `PortAccess.ts` is deliberately out of the barrel and evaluator-facing.

**Recommendation: (1).** `status: decided (2026-10-05, (1) — recommended default)`

### D-10-c — How much of the description is public

- **(1) Public descriptions and environment functions; scaffolding internal.** Barrel: `PortDescription` (type), `PortReply`, `PortScript`, the five `…Port` descriptions, `PortServices`, `PortLayers`, `PortOverrides`, `PortTypes`, `ServiceOf`/`ArgsOf`/`AnswerOf`, `mapPorts`, `mergePorts`, `portsLayer`, `decoratePorts`, `forEveryPort`, `PortVisitor`, `scriptedPort`, `recordingPort`, `replyTable`. Internal (`./*` only): `wrapPort`, `retryingPort`, `boundedPort`, `timingOutPort`, `nonePort` (callers use the fifteen named wrappers and five named defaults instead). Two out-of-core adapters consume the seam today — devtools capture/replay and `@qadi/testing` — so the seam is real (two adapters), not hypothetical.
- **(2) Everything internal.** Smallest interface, but devtools and `@qadi/testing` must keep their per-port code (E6, E14), which is half the leverage.
- **(3) Everything public, including the generic wrapper derivations.** Lets a caller derive wrappers for a port that is not one of the five — there is no such port; it widens the interface for no consumer.

**Recommendation: (1).** `status: decided (2026-10-05, (1) — recommended default)`

### D-10-d — Fail-closed defaults: derived or hand-written

- **(1) Derived.** `export const AttributeResolverNone: Layer.Layer<AttributeResolver> = nonePort(attributeResolverPort)`; the description's `none: { name, answer }` is the only statement of the answer, and devtools' replay reads the same field (E14). The derived layer returns a precomputed `Effect.succeed(answer)` value, so the evaluation path gains no allocation.
- **(2) Hand-written, cross-checked.** Keep the five `Layer.succeed(…)` bodies and assert in the suite that they agree with `none`. Two statements of one fact, checked; still the hand agreement E14 complains about.

**Recommendation: (1).** `status: decided (2026-10-05, (1) — recommended default)`

### D-10-e — Do `PortAccess.ts`'s defect constructors come from the description?

- **(1) Yes, via a dedicated `defect` field.** Each description carries `failure(args, cause: unknown) => E` (deadline, scripted `Fail`, replayed `Broke`) and `defect(args, cause: Cause.Cause<unknown>) => E` (`catchPortDefect`). Four ports implement `defect` as `failure(args, Cause.squash(cause))`; `CustomPredicate` keeps `reason: Cause.pretty(cause)` (`PortAccess.ts:390-396`). Results are byte-identical to today; `PortAccess.ts` stops naming error classes.
- **(2) Yes, through `failure` alone.** Would change `CustomPredicateError.reason` for a defect from `Cause.pretty(cause)` to a rendering of the squashed value — a visible behaviour change, pinned by `Evaluate.test.ts`'s defect tests.
- **(3) No.** `PortAccess.ts` keeps its five inline constructors; a port's error is described in two places.

**Recommendation: (1).** Amends ADR-QD-077 by a dated note. `status: decided (2026-10-05, (1) — recommended default)`

### D-10-f — What becomes of `@qadi/testing`'s per-port doubles

- **(1) Replace.** Delete `Failing*` ×5 (no callers, E7), `Recording*` ×3, `EdgeRelationshipResolver.ts`, `EventDecisionHistory.ts`, `CallRecorder.ts`. Core's `scriptedPort`/`recordingPort` cover every case: an always-failing port is `scriptedPort(d, () => PortReply.fail(cause))`, a recording fixture is `recordingPort(d, attributeResolverFromRecord(table))`, and the call log is a typed `ReadonlyArray<Args>` rather than a hand-formatted string. `TestLayerOptions`' five layer overrides become one `ports?: PortOverrides` field (data conveniences `attributes`/`relationships`/`history`/`signatures` stay). Breaking minor of `@qadi/testing` (0.x), with a changeset marked **Breaking**.
- **(2) Keep the names as one-line adapters for one minor, deprecated.** Softer for external users; layers a second spelling over the first for a release.
- **(3) Keep everything, reimplemented over core.** No public change; the eleven modules stay and the next port adds two more.

**Recommendation: (1).** No caller outside the package's own test and docs uses the `Failing*` modules; the recording/edge/event doubles are used by `QadiReviewLayer.ts` and documentation only. `status: decided (2026-10-05, (1) — recommended default)`

### D-10-g — Core test helpers' override keys

- **(1) `PortOverrides` keyed by `PortName`** (`testLayer(subject, { AttributeResolver: failing })`), with a scripted codemod over ~125 one-line and the multi-line call sites (`attributes:` ×100, `history:` ×14, `customPredicate:` ×5, `relationships:` ×4, `signatureHistory:` ×2, counted by `git grep -hoE "(testLayer|subjectSetLayer)\(…\{ *(key)" -- packages/core`). A sixth port then needs no helper edit. `tsc`'s excess-property check catches any site the codemod misses.
- **(2) Keep the short keys** (`attributes`, `history`, …) mapped by hand onto `portsLayer` inside `helpers.ts`. No churn; one more hand-list a sixth port must edit.

**Recommendation: (1).** `status: decided (2026-10-05, (1) — recommended default)`

### D-10-h — The wrapper metrics' closed domains

- **(1) Widen to `PortName`; delete `RetryingPortName` and `TimingOutPortName`.** Every port now has every wrapper, so the narrower types name nothing. `preregisteredWords` widens (no key change, E4); descriptions untouched. Two public types removed (breaking type-level change in `@qadi/core`'s minor).
- **(2) Keep them as aliases equal to `PortName`, deprecated.** Source-compatible, but two names for one set — the drift the memory note on closed unions warns against.

**Recommendation: (1).** `status: decided (2026-10-05, (1) — recommended default)`

### D-10-i — Does devtools show timeouts?

- **(1) Yes.** `PortActivity` gains `timeouts: number` (from `portTimeoutsTotal`), the `> 0` filter covers it, and the Services panel shows it beside retries. With every port gaining a deadline, a timeout is the signal that tells a slow store from a down one (`PortMetrics.ts:152-160`), and today nothing reads it (E13).
- **(2) No.** Leave devtools as it is.

**Recommendation: (1).** `status: decided (2026-10-05, (1) — recommended default)`

### D-10-j — A ratchet against hand-rolled failing doubles

- **(1) Yes: a test-scope `PORT_DOUBLE_BUDGET` in `scripts/check-house-style.mjs`.** Counts lines matching `new (AttributeResolveError|RelationshipResolveError|DecisionHistoryUnavailable|CustomPredicateError|SignatureHistoryUnavailable)\(` per test file; after migration, the remaining files (those that must construct errors as *values*: `Errors.test.ts`, `SinkCodec.test.ts`, `PortAccess.test.ts`, `PortConformance.test.ts`, `QadiHttpError.test.ts`, `fixtures/everyHttpEnforcementFailure.ts`, and any residual T15–T17 records) are listed with exact counts, checked in both directions like the five src budgets. A sixth file needs a reviewed edit.
- **(2) No gate.** Rely on review; the AST scan in this plan's scratch dir can be re-run by hand.

**Recommendation: (1).** It is the discipline the five existing budgets apply; the regex is coarse but deterministic, and the allowlist says why each file is on it. `status: decided (2026-10-05, (1) — recommended default)`

### D-10-k — Does the description carry the span name?

- **(1) Yes.** `span: PortSpanName` (closed: `"qadi.attribute" | "qadi.acted" | "qadi.hasRelationship" | "qadi.hasCustom" | "qadi.hasSignature"`, one per port, verified 1:1 against `PortAccess.ts:138,233,260,334,376,422`). `PortAccess.ts`'s `Effect.fn(…)` names read it; devtools `PortCalls.ts`'s `PORT_SPANS` (`:44-50`) becomes `forEveryPort((d) => d.span)` with `PortSpan = PortSpanName`; BEH-QD-227's table names the source.
- **(2) No.** Span names stay literal in `PortAccess.ts` and devtools; three places name them.

**Recommendation: (1).** `status: decided (2026-10-05, (1) — recommended default)`

### D-10-l — What a scripted reply can be

- **(1) `PortReply<A> = Answer(value) | Fail(cause) | Die(defect) | Throw(error)`**, closed and tagged, with constructors on a `PortReply` namespace object. `Fail` builds the port's own error through `failure`; `Die` is `Effect.die`; `Throw` throws synchronously from the method body (what ARCH-01's T7 `Behavior` generator models, `Predicate.test.ts`). A script is `(...args: Args) => PortReply<A> | undefined`; `undefined` falls through to the description's `none` answer. `replyTable(d, entries)` builds a script keyed by `d.key`.
- **(2) `Answer | Fail` only.** Defect tests keep hand-rolling `Effect.die` layers (19 sites, E8).

**Recommendation: (1).** `status: decided (2026-10-05, (1) — recommended default)`

## 6. Tasks

Phases: **A** = T1 (defect fix, shippable alone). **B** = T2–T8 (core seam).
**C** = T9–T14 (consumers). **D** = T15–T18 (migration and ratchet).
**E** = T19–T22 (spec, docs, yardstick, gate). Each phase is its own PR;
C and D can be split per package.

### T1 — Every retrying wrapper reports its attempts; pin the deadline metric and message (test-first)
- **Status:** [x] done (020560e)
- **Depends on:** —
- **Files:** `packages/core/test/RelationshipResolver.test.ts`, `packages/core/test/CustomPredicate.test.ts`, `packages/core/test/AttributeResolver.test.ts`, `packages/core/src/RetryingLayer.ts`, `packages/core/src/AttributeResolver.ts`, `packages/core/src/RelationshipResolver.ts`, `packages/core/src/CustomPredicate.ts`
- **Steps:**
  1. In `RelationshipResolver.test.ts` and `CustomPredicate.test.ts`, add `"the qadi.attempts span annotation matches the real call count, even when every attempt fails"`, mirroring `AttributeResolver.test.ts:68-88` exactly (a port failing on every call, `Schedule.recurs(2)`, `Effect.withSpan("test-span")`, `collectingTracer`, assert `{ "qadi.attempts": 3 }`). Add a second case per port: fails twice then succeeds → `{ "qadi.attempts": 3 }` and the success value.
  2. Run them: both ports' cases fail at `e0ee958` (attributes `{}`, as probe `attempts.mts` showed). Paste the output into the PR.
  3. In `RetryingLayer.ts` add `export const retryCountingAttempts = <A, E>(port: RetryingPortName, schedule: Schedule.Schedule<unknown, E>, attempt: Effect.Effect<A, E>): Effect.Effect<A, E>` — the body of `AttributeResolver.ts:133-155` (Ref per call, increment per invocation, `tapError` → `portRetriesTotal`, `retry`, `ensuring` annotate). Doc comment moves with it (KH-01 rationale).
  4. Rewrite the three `*Retrying` combinators to call it. Fix `CustomPredicate.ts:120`'s "Mirrors exactly" sentence and `RelationshipResolver.ts:202-204` to state what is now true.
  5. In `AttributeResolver.test.ts` and `RelationshipResolver.test.ts`, extend each deadline test (`:209`, `:332`) to assert (a) the failure's `cause` is an `Error` whose message is exactly `"AttributeResolver.resolve did not settle within the configured deadline"` / `"RelationshipResolver.check did not settle within the configured deadline"`, and (b) `portTimeoutsTotal`'s occurrence for the port rose by one (delta read inside `isolatedMetrics`, `helpers.ts:146`).
- **Tests:** four new attempts cases (two per port), two extended deadline cases. No existing assertion changes.
- **Verify:** `pnpm vitest run packages/core/test/RelationshipResolver.test.ts packages/core/test/CustomPredicate.test.ts packages/core/test/AttributeResolver.test.ts` (red before step 3, green after); `pnpm typecheck && node scripts/check-house-style.mjs`
- **Done when:** all three retrying wrappers annotate `qadi.attempts`; the timeout message and metric are pinned. **Phase A shippable.**

### T2 — Add `PortDescription.ts`: the description type and its generic derivations
- **Status:** [x] done (deviated: split into three modules — `PortDescription.ts` public types, `PortDerivation.ts` internal derivations, `PortDoubles.ts` public doubles; 157d51e)
- **Depends on:** T1, D-10-a, D-10-b, D-10-c, D-10-l
- **Files:** `packages/core/src/PortDescription.ts` (*new*), `packages/core/src/RetryingLayer.ts` (deleted at the end of T3), `packages/core/src/PortMetrics.ts`, `packages/core/test/PortDescription.test.ts` (*new*)
- **Steps:**
  1. In `PortMetrics.ts` add `export type PortSpanName = "qadi.attribute" | "qadi.acted" | "qadi.hasRelationship" | "qadi.hasCustom" | "qadi.hasSignature";` (D-10-k) beside `PortName`, doc comment citing BEH-QD-227.
  2. Create `PortDescription.ts`. Module doc: summary line "One port, described once: everything a wrapper, a default, a double or an environment needs to know about it." Then the why (this plan's E1/E3/E14; ADR-QD-NEXT once numbered). Declare:
     ```ts
     export interface PortShape { readonly name?: string | undefined }
     export interface PortDescription<N extends PortName, Self, Shape extends PortShape,
                                      Args extends ReadonlyArray<unknown>, A, E> {
       readonly port: N;
       readonly method: string;                     // "resolve" — used in the deadline message
       readonly span: PortSpanName;
       readonly service: Context.Key<Self, Shape>;
       readonly invoke: (shape: Shape) => (...args: Args) => Effect.Effect<A, E>;
       readonly make: (name: string, call: (...args: Args) => Effect.Effect<A, E>) => Shape;
       readonly failure: (args: Args, cause: unknown) => E;
       readonly defect: (args: Args, cause: Cause.Cause<unknown>) => E;
       readonly key: (args: Args) => string;
       readonly none: { readonly name: string; readonly answer: A };
     }
     ```
     Doc each field (invariants: `key` is collision-safe `JSON.stringify` of a tuple that includes the subject; `none.answer` is the fail-closed answer INV-QD-007 requires; `invoke` must call the method through the shape, never return it unbound).
  3. `PortReply<A>` (D-10-l): `{ _tag: "Answer"; value: A } | { _tag: "Fail"; cause: unknown } | { _tag: "Die"; defect: unknown } | { _tag: "Throw"; error: unknown }`, plus `export const PortReply = { answer, fail, die, throw_ }` constructors (no `switch`; consumers use `Match`). `PortScript<Args, A> = (...args: Args) => PortReply<A> | undefined`.
  4. Move `wrapService`, `wrapServiceEffect`, `boundedPermits`, `retryCountingAttempts` from `RetryingLayer.ts` (unchanged bodies). Add internal `wrapPort(d, layer, suffix, around)` — builds `layer`, gets `inner`, returns `d.make(\`${inner.name ?? "?"} (${suffix})\`, around(d.invoke(inner)))`.
  5. Derivations, each a plain function returning a layer combinator:
     - `retryingPort(d)(schedule)(layer)` → `wrapPort(…, "retrying", (call) => (...args) => retryCountingAttempts(d.port, schedule, call(...args)))`.
     - `boundedPort(d)(permits)(layer)` → `wrapServiceEffect` + `boundedPermits`, name `(bounded ${permits})`.
     - `timingOutPort(d)(duration)(layer)` → `call(...args).pipe(Effect.timeoutOrElse({ duration, orElse: () => Metric.update(portTimeoutsTotal, d.port).pipe(Effect.flatMap(() => Effect.fail(d.failure(args, new Error(\`${d.port}.${d.method} did not settle within the configured deadline\`))))) }))` — message byte-identical to today's (T1 pins it).
     - `nonePort(d)` → `const answered = Effect.succeed(d.none.answer); Layer.succeed(d.service, d.make(d.none.name, () => answered))`.
     - `scriptedPort(d, script, name?)` → `{ layer, calls }`: a `MutableRef<ReadonlyArray<Args>>` log (the `CallRecorder` idiom, `testing/src/CallRecorder.ts`), `calls` a live getter; per call: append args, then dispatch the reply with a hoisted `Match.type<PortReply<A>>().pipe(Match.tagsExhaustive({…}))` built inside `scriptedPort` (once per double, not per call); `undefined` → `Effect.succeed(d.none.answer)`; `Fail` → `Effect.fail(d.failure(args, cause))`; `Die` → `Effect.die`; `Throw` → throw synchronously. Default name `scripted ${d.port}`.
     - `replyTable(d, entries: ReadonlyArray<readonly [Args, PortReply<A>]>)` → a `PortScript` over a `Map` keyed by `d.key`.
     - `recordingPort(d, layer, observe?: (args: Args, exit: Exit.Exit<A, E>) => void)` → `{ layer, calls }`: wraps with name `(recording)`, logs args, and calls `observe` with the settled exit (`Effect.onExit`), passing the exit through unchanged (a recording must observe, never absorb — `Capture.ts:220-235`'s rule).
  6. `PortDescription.test.ts`: drive every derivation through a **test-local** port (`class ProbePort extends Context.Service<ProbePort, ProbeShape>()("qadi/test/ProbePort")`, a description with `port: "AttributeResolver"` as a stand-in name) so the generic module is pinned independently of the five real ports: names compose; retrying counts invocations and annotates; bounded admits at most `permits` and rejects `0`, `-1`, `1.5`, `NaN`, `Infinity`; timing-out fails typed with the exact message and bumps the metric; scripted answers/fails/dies/throws/falls through and logs in order; `replyTable` keys by `d.key`; recording passes success, typed failure and defect through unchanged and reports each exit to `observe`.
- **Tests:** `PortDescription.test.ts` (new). No existing test changes.
- **Verify:** `pnpm vitest run packages/core/test/PortDescription.test.ts` ; `pnpm typecheck` ; `pnpm circular`
- **Done when:** the module exists with full coverage from its own test, and nothing imports it yet except the test.

### T3 — Describe the five ports; derive today's wrappers and defaults from the descriptions (behaviour-neutral)
- **Status:** [x] done (1b9724f; bench via scratch harness, see T8)
- **Depends on:** T2, D-10-d, D-10-e (field only)
- **Files:** `packages/core/src/{AttributeResolver,RelationshipResolver,CustomPredicate,DecisionHistory,SignatureHistory}.ts`, `packages/core/src/RetryingLayer.ts` (*deleted*), `packages/core/src/index.ts`, `packages/core/bench/Evaluate.bench.ts` (run only)
- **Steps:**
  1. **Baseline bench**: `pnpm vitest bench --run packages/core/bench/Evaluate.bench.ts` ×3; record `one node`, `resolver miss`, `wide`, `deep` means.
  2. In each port module declare its description beside the service class, typed with all six parameters, e.g. `export const attributeResolverPort: PortDescription<"AttributeResolver", AttributeResolver, AttributeResolverShape, readonly [subjectId: SubjectId, attribute: string], unknown, AttributeResolveError>`. Per port:
     - Attribute: `method: "resolve"`, `span: "qadi.attribute"`, `failure: ([, attribute], cause) => new AttributeResolveError({ attribute, cause })`, `defect: (args, cause) => failure(args, Cause.squash(cause))`, `key: ([s, a]) => JSON.stringify([s, a])`, `none: { name: "AttributeResolverNone", answer: undefined }`.
     - Relationship: `method: "check"`, `span: "qadi.hasRelationship"`, `failure: ([r], cause) => new RelationshipResolveError({ relation: r.relation, resourceId: r.resourceId, cause })`, `key: ([r]) => JSON.stringify([r.subjectId, r.relation, r.resourceId])` (devtools' key, `Capture.ts:112-113`), `none: { name: "RelationshipResolverNever", answer: "Unknown" }`.
     - History: `method: "hasActed"`, `span: "qadi.acted"`, `failure: ([q], cause) => new DecisionHistoryUnavailable({ event: q.event, cause })`, `key: ([q]) => JSON.stringify([q.subjectId, q.event, q.resourceId ?? null])`, `none: { name: "DecisionHistoryUnknown", answer: "Unknown" }`.
     - Custom: `method: "evaluate"`, `span: "qadi.hasCustom"`, `failure: ([name], cause) => new CustomPredicateError({ name, reason: renderReason(cause) })` where `renderReason` gives a string unchanged and `String(cause)` otherwise, `defect: ([name], cause) => new CustomPredicateError({ name, reason: Cause.pretty(cause) })` (byte-identical to `PortAccess.ts:396`), `key: ([name, subject, , params]) => JSON.stringify([subject.id, name, params])`, `none: { name: "CustomPredicateNone", answer: false }`.
     - Signature: `method: "signaturesFor"`, `span: "qadi.hasSignature"`, `failure: ([q], cause) => new SignatureHistoryUnavailable({ subjectId: q.subjectId, resourceId: q.resourceId, cause })`, `key: ([q]) => JSON.stringify([q.subjectId, q.resourceId ?? null])`, `none: { name: "SignatureHistoryNone", answer: NO_SIGNATURES }` with `const NO_SIGNATURES: ReadonlyArray<Signature> = Object.freeze([])` (a shared answer must not be mutable).
     `invoke` always calls through the shape (`(shape) => (s, a) => shape.resolve(s, a)`), never returns an unbound method.
  3. Replace each existing wrapper and default body with its derivation, keeping every exported name and declared type: `AttributeResolverNone = nonePort(attributeResolverPort)`, `attributeResolverRetrying = retryingPort(attributeResolverPort)`, `attributeResolverBounded = boundedPort(attributeResolverPort)`, `attributeResolverTimingOut = timingOutPort(attributeResolverPort)`; same for relationship (3 + `RelationshipResolverNever`), custom (2 + `CustomPredicateNone`), history (`DecisionHistoryUnknown`), signature (`SignatureHistoryNone`). Each wrapper keeps its existing doc comment, trimmed to the port-specific part plus a pointer to `PortDescription.ts` for the shared rules.
  4. Delete `RetryingLayer.ts`; nothing else imports it (`git grep RetryingLayer -- packages` after the edit). Move its "Not listed above" overview row in T19.
  5. Barrel: add the five descriptions to `index.ts` (alphabetical through the existing `export *` lines — they live in already-barrelled modules, so no new line is needed for them); add `export * from "./PortDescription.ts"` only after T5 decides which of its exports are public (D-10-c) — until then nothing outside core imports it.
  6. Re-run the bench ×3; accept if every mean is within run-to-run noise (ADR-QD-034 notes ~20–30% machine drift; compare same session).
- **Tests:** none added; every existing test must pass unchanged — `AttributeResolver.test.ts`, `RelationshipResolver.test.ts`, `CustomPredicate.test.ts`, `DecisionHistory.test.ts`, `SignatureHistory.test.ts`, `Ports.test.ts` (names, metrics, defaults), `Layers.test.ts`, `Evaluate.test.ts`, `Predicate.test.ts`, devtools `Wiring.test.ts`/`ServicesPanel.test.tsx` (wrapper names), and T1's new tests.
- **Verify:** `pnpm typecheck && pnpm circular && node scripts/check-house-style.mjs && pnpm vitest run packages/core packages/devtools packages/testing`
- **Done when:** the five descriptions exist, every existing wrapper/default is a one-line derivation, `RetryingLayer.ts` is gone, all tests pass, bench recorded.

### T4 — Close the matrix: the seven missing wrappers, and one metric domain
- **Status:** [x] done (7a32582)
- **Depends on:** T3, D-10-h
- **Files:** `packages/core/src/{DecisionHistory,SignatureHistory,CustomPredicate}.ts`, `packages/core/src/PortMetrics.ts`, `packages/core/src/PortDescription.ts`, `packages/core/test/Ports.test.ts`
- **Steps:**
  1. Add `decisionHistoryRetrying`, `decisionHistoryBounded`, `decisionHistoryTimingOut`, `signatureHistoryRetrying`, `signatureHistoryBounded`, `signatureHistoryTimingOut`, `customPredicateTimingOut`, each a one-line derivation with a short doc comment (what is wrapped; composition order as in `AttributeResolver.ts:220-226`).
  2. In `PortMetrics.ts`, delete `RetryingPortName`, `RETRYING_PORT_NAMES_BY_NAME`, `RETRYING_PORT_NAMES`, `TimingOutPortName`, `TIMING_OUT_PORT_NAMES_BY_NAME`, `TIMING_OUT_PORT_NAMES`; set both `preregisteredWords` to `PORT_NAMES`. **Do not edit any `description` string.** Rewrite the module doc (`:22-28`) and the two metrics' docs: every port has every wrapper; both metrics are keyed by `PortName`.
  3. `retryCountingAttempts` and `timingOutPort` now take `PortName`.
  4. `Ports.test.ts`: the preregistration test for retries (`:317` comment) now expects all five words at zero; add the same for timeouts; extend the pinned-descriptions test (`:450`) to `portRetriesTotal` and `portTimeoutsTotal` (registry keys, ADR-QD-052).
- **Tests:** as step 4. Per-port behaviour of the new wrappers is covered by T7's suite (written next, before merge of this phase).
- **Verify:** `pnpm vitest run packages/core/test/Ports.test.ts` ; `git grep -n "RetryingPortName\|TimingOutPortName" -- packages` → empty (overview rows in T19)
- **Done when:** fifteen wrappers exist (success criterion 1); `PortMetrics.ts` has two domains (criterion 3).

### T5 — Add `Ports.ts`: the registry, the five-port environment type, and the environment functions
- **Status:** [x] done (3afe3b3; visitors re-typed per port in 5a73931)
- **Depends on:** T3, D-10-b, D-10-c
- **Files:** `packages/core/src/Ports.ts` (*new*), `packages/core/src/Evaluate.ts`, `packages/core/src/DecisionCache.ts`, `packages/core/src/EvaluationServicesNone.ts`, `packages/core/src/index.ts`, `packages/core/test/Ports.tst.ts` (*new*, tstyche), `packages/core/test/PortsLayer.test.ts` (*new*)
- **Steps:**
  1. `Ports.ts` module doc: "The five evaluation ports, as one closed registry, and the environments built from it."
  2. Declare `export interface PortTypes { readonly AttributeResolver: typeof attributeResolverPort; … }` (five) and `export const PORTS: PortTypes = { … }`.
  3. Type-level derivations with `infer` only: `ServiceOf<D>`, `ShapeOf<D>`, `ArgsOf<D>`, `AnswerOf<D>`, `ErrorOf<D>`; `export type PortServices = { readonly [K in PortName]: ServiceOf<PortTypes[K]> }[PortName]`; `export type PortLayers = { readonly [K in PortName]: Layer.Layer<ServiceOf<PortTypes[K]>> }`; `export type PortOverrides = { readonly [K in PortName]?: Layer.Layer<ServiceOf<PortTypes[K]>> | undefined }` (`| undefined` so a conditional override compiles under `exactOptionalPropertyTypes`). Indexing `PortTypes[K]` for `K in PortName` makes a `PortName` without a registry entry a compile error.
  4. Functions:
     - `export interface PortVisitor<R> { <N extends PortName, Self, Shape extends PortShape, Args extends ReadonlyArray<unknown>, A, E>(d: PortDescription<N, Self, Shape, Args, A, E>): R }` and `export const forEveryPort = <R>(f: PortVisitor<R>): ReadonlyArray<R>` over a `{ readonly [K in PortName]: <R>(f: PortVisitor<R>) => R }` table (TS2741 forces every key; order = `PortName` declaration order, documented).
     - `export const mapPorts = (f: PortLayerVisitor): PortLayers` — one explicit line per port, typed by `PortLayers`.
     - `export const mergePorts = (layers: PortLayers): Layer.Layer<PortServices>` — `Layer.mergeAll` of the five, annotated.
     - `export const portsLayer = (overrides: PortOverrides = {}): Layer.Layer<PortServices>` — `mergePorts(mapPorts((d) => overrides[d.port] ?? nonePort(d)))` if that indexes cleanly; otherwise five explicit lines. **Order cannot matter** — each slot holds one layer — which removes E9's silent override hazard.
     - `export const decoratePorts = (ports: Layer.Layer<PortServices>, f: PortDecorator): Layer.Layer<PortServices>` — builds `ports` **once** (`Layer.unwrap`, the reason `Capture.ts:129-140` gives), then `Layer.succeed(d.service, f(d, Context.get(ctx, d.service)))` per port (`probe/Decorate.ts`).
  5. `Evaluate.ts`: `EvaluationServices = CurrentSubject | EvaluationId | PortServices` (doc: "a port added to the registry reaches every alias without an edit here"); delete `WalkServices`, use `PortServices` at its two sites (`:640`, `:1329`). `StandingEvaluationServices` unchanged.
  6. `DecisionCache.ts`: delete `EvaluationRequirements` (`:108-113`), use `PortServices`.
  7. `EvaluationServicesNone.ts`: `Layer.merge(portsLayer(), EvaluationIdLive)`, type unchanged; doc keeps its history paragraphs and states the new one-line composition.
  8. Barrel: `export * from "./Ports.ts"` and, per D-10-c, `export * from "./PortDescription.ts"` with `wrapPort`/`retryingPort`/`boundedPort`/`timingOutPort`/`nonePort` *not* exported from the barrel — move them to an internal section or a non-barrelled re-export as the overview row decides (T19). If `export *` cannot exclude them, split `PortDescription.ts` into the public file and an internal `PortDerivation.ts` (both new; record the split in §10).
  9. `Ports.tst.ts`: `expect<keyof PortTypes>().type.toBe<PortName>()`; `expect<PortServices>().type.toBe<AttributeResolver | RelationshipResolver | DecisionHistory | CustomPredicate | SignatureHistory>()`; `expect<StandingEvaluationServices>().type.toBe<EvaluationId | PortServices>()`; an override of the wrong service is rejected (`expect(portsLayer).type.not.toBeCallableWith({ AttributeResolver: RelationshipResolverNever })`).
  10. `PortsLayer.test.ts`: `portsLayer()` yields each port's None name and answer; an override replaces exactly its slot; `decoratePorts` builds the underlying layer once (a `Layer.effect` with a build counter → 1) and decorates all five; `forEveryPort` visits five ports in declaration order; `mapPorts` + `mergePorts` round-trips.
- **Tests:** `Ports.tst.ts`, `PortsLayer.test.ts` (new). `Errors.tst.ts:55-57` still passes.
- **Verify:** `pnpm typecheck && pnpm test:tstyche && pnpm circular && pnpm vitest run packages/core/test/PortsLayer.test.ts packages/core/test/Evaluate.test.ts packages/core/test/DecisionCache.test.ts`
- **Done when:** success criterion 4's core half holds (`WalkServices`/`EvaluationRequirements` gone); `EvaluationServicesNone` is one line.

### T6 — `PortAccess.ts` reads each port's error constructor and span name from its description
- **Status:** [x] done (a632c00)
- **Depends on:** T3, D-10-e, D-10-k
- **Files:** `packages/core/src/PortAccess.ts`, `packages/core/test/PortAccess.test.ts`
- **Steps:**
  1. Replace the five `catchPortDefect((cause) => new …(…))` constructors (`PortAccess.ts:153-155`, `:217-219`, `:363-366`, `:389-397`, `:446-453`) with `catchPortDefect((cause) => attributeResolverPort.defect([subject.id, attribute], cause))` etc., building `args` exactly as the call does.
  2. Replace the span literals in `Effect.fn("qadi.attribute")` etc. (`:138`, `:233`, `:260`, `:334`, `:376`, `:422`) with `Effect.fn(attributeResolverPort.span)` etc. Both `askActedAny` and `askActedForResource` use `decisionHistoryPort.span`.
  3. Drop the now-unused error-class imports. Update the module doc: which per-port facts now come from the descriptions; the defect rule stays here.
  4. `PortAccess.test.ts`: add one test per port that a dying adapter yields an error `deepStrictEqual` to `port.defect(args, cause)` for the same cause (pins the wiring of args), and that `CustomPredicateError.reason` still equals `Cause.pretty(cause)`.
- **Tests:** five new cases. `Evaluate.test.ts:3741-3931` ("port defects become typed errors"), `Predicate.test.ts` defect tests, `port-calls.feature`, devtools `PortCalls.test.ts` pass unchanged.
- **Verify:** `pnpm vitest run packages/core/test/PortAccess.test.ts packages/core/test/Evaluate.test.ts packages/core/test/Predicate.test.ts packages/devtools/test/model/PortCalls.test.ts && pnpm test:bdd`
- **Done when:** `git grep -nE "new (AttributeResolveError|RelationshipResolveError|DecisionHistoryUnavailable|CustomPredicateError|SignatureHistoryUnavailable)\(" -- packages/core/src/PortAccess.ts` is empty, and `git grep -n 'Effect.fn("qadi\.' -- packages/core/src/PortAccess.ts` lists only `qadi.requireScopedResourceId`.

### T7 — One conformance suite over every port; delete the per-port duplicates it replaces
- **Status:** [x] done (78af2d5)
- **Depends on:** T4, T5, T6
- **Files:** `packages/core/test/PortConformance.test.ts` (*new*), `packages/core/test/AttributeResolver.test.ts`, `packages/core/test/RelationshipResolver.test.ts`, `packages/core/test/CustomPredicate.test.ts`, `packages/core/test/Ports.test.ts`, `packages/core/test/Layers.test.ts`
- **Steps:**
  1. A typed case table `const CASES: { readonly [K in PortName]: PortCase<PortTypes[K]> }` where `PortCase<D>` holds `{ description: D; args: ArgsOf<D>; answer: AnswerOf<D> }` (a non-None answer, e.g. `5`, `"Related"`, `"Acted"`, `true`, one signature). A sixth port without a case is a compile error (criterion 6). Iterate with `forEveryPort`-style dispatch over `CASES` (a rank-2 visitor over cases, same idiom as `probe/Visit.ts`).
  2. For every port, in a `describe(\`${port}\`)` block:
     - **Default (INV-QD-007, ADR-QD-040):** `nonePort` layer's `name === none.name`, answer `===`/deep-equal `none.answer`, and equals the exported named default's answer (`AttributeResolverNone`, …).
     - **Retrying:** fails twice then answers → 3 invocations, `qadi.attempts === 3` on the caller span, `portRetriesTotal[port]` delta 2; always failing under `recurs(2)` → the original error instance, `qadi.attempts === 3`, delta 3.
     - **Bounded:** at most `permits` in flight (the latch pattern from `AttributeResolver.test.ts:92-135`); `0`, `-1`, `1.5`, `NaN`, `Infinity` → `InvalidBoundedPermits` at build; `1` accepted.
     - **Timing out:** `Effect.never` + `TestClock.adjust` past the deadline → `failure(args, Error(<exact message>))` (tag, identifying fields, message), `portTimeoutsTotal[port]` delta 1; a call settling in time passes through; the port's own typed failure passes through unchanged.
     - **Names (BEH-QD-196):** each wrapper composes `"<inner> (retrying)"`, `"(bounded N)"`, `"(timing out)"`; an unnamed inner reads `"?"`.
     - **Scripted:** `replyTable` answer, `Fail` → `failure`, `Die` → defect cause, `Throw` → defect under `Effect.exit` (and a typed error once through `PortAccess`), unscripted → `none.answer`; `calls` lists args in order.
     - **Recording:** passes the inner exit through; `observe` sees each exit.
     - **Defect constructor:** `defect(args, Cause.die(e))` has the same tag and identifying fields as `failure(args, e)` (custom: `reason === Cause.pretty(…)`).
  3. **Replace, don't layer:** delete from the per-port test files every case the suite now covers — `AttributeResolver.test.ts` `attributeResolverRetrying`/`Bounded`/`TimingOut` describes (`:40-260` minus anything port-specific), the equivalents in `RelationshipResolver.test.ts` (`:211-370`) and `CustomPredicate.test.ts` (`:123-280`), the naming cases in `Ports.test.ts` (`:70-170`) that the suite reproduces, and `Layers.test.ts`'s wrapper happy path. Keep port-specific semantics (`…FromRecord`, `…FromEdges` closed world, `customPredicateFromRecord`'s unknown-name failure, `RelationshipResolverNever`'s `"Unknown"` at any depth, signatures' scope separation). List every deleted test name in the PR description with the suite case that replaces it.
- **Tests:** `PortConformance.test.ts` (5 ports × ~20 cases). Deletions as above.
- **Verify:** `pnpm vitest run packages/core/test` ; `pnpm vitest run --coverage packages/core --testTimeout=60000` (core ≥ 95%, `PortDescription.ts`/`Ports.ts` at 100% lines)
- **Done when:** criteria 2 and 6 hold; no duplicated wrapper test remains in a per-port file.

### T8 — Bench and targeted mutation of the core seam
- **Status:** [x] done (deviated: bench by a scratch A/B harness — `vitest bench` cannot run `bench.compare` under vitest 5, ARCH-13 T0; targeted Stryker [~] deferred to final integration gate)
- **Depends on:** T7
- **Files:** none edited (run only); results recorded in §10
- **Steps:**
  1. `pnpm vitest bench --run packages/core/bench/Evaluate.bench.ts` ×3 on the branch and on a `git archive` of `e0ee958`, back to back, same session (the ARCH-01 T3 method); record means.
  2. `pnpm exec stryker run --mutate packages/core/src/PortDescription.ts,packages/core/src/Ports.ts,packages/core/src/PortMetrics.ts,packages/core/src/AttributeResolver.ts,packages/core/src/RelationshipResolver.ts,packages/core/src/CustomPredicate.ts,packages/core/src/DecisionHistory.ts,packages/core/src/SignatureHistory.ts,packages/core/src/PortAccess.ts` against the branch and the same file set at `e0ee958`. Kill any survivor in the two new modules with a test; record pre-existing survivors elsewhere.
- **Tests:** whatever step 2 shows is missing.
- **Verify:** as the steps.
- **Done when:** criterion 11 holds; zero survivors in `PortDescription.ts`/`Ports.ts`. **Phase B done.**

### T9 — Core test helpers build their environment from the registry
- **Status:** [x] done (1fef05e)
- **Depends on:** T5, D-10-g
- **Files:** `packages/core/test/helpers.ts`, every `packages/core/test/**/*.ts` that passes overrides to `testLayer`/`subjectSetLayer`, `packages/core/bench/*.ts`
- **Steps:**
  1. `helpers.ts`: `QadiServices` becomes `= EvaluationServices` (or is deleted and imports switch); `testLayer(subject, overrides?: PortOverrides)` = `Layer.mergeAll(currentSubjectLayer(subject), portsLayer(overrides), evaluationIdSequential())`; `subjectSetLayer(overrides?: PortOverrides): Layer.Layer<StandingEvaluationServices>` likewise. Rewrite the doc at `:32-43`: the hand-copy hazard it describes is gone because both this helper and `@qadi/testing` now build from `portsLayer`.
  2. Codemod (scratch script, not committed): within `testLayer(`/`subjectSetLayer(` call expressions only (TS AST, the `scan.mjs` approach), rename property keys `attributes→AttributeResolver`, `relationships→RelationshipResolver`, `history→DecisionHistory`, `customPredicate→CustomPredicate`, `signatureHistory→SignatureHistory`. Run `tsc`; fix stragglers by hand (excess-property errors point at each).
  3. Benches that compose `Layer.mergeAll(EvaluationServicesNone, x)` (`DecisionCache.bench.ts`, `Evaluate.bench.ts`) switch to `portsLayer({ … })` + `EvaluationIdLive`.
- **Tests:** none added; the whole core suite must pass unchanged in behaviour.
- **Verify:** `pnpm typecheck && pnpm vitest run packages/core`
- **Done when:** `git grep -nE "\b(attributes|relationships|history|customPredicate|signatureHistory)\??:\s*Layer" -- packages/core/test/helpers.ts` is empty.

### T10 — Devtools: capture, replay, fixtures and wiring over the registry; show timeouts
- **Status:** [x] done (5a73931, 62b7695; `stryker.devtools.mjs` [~] deferred to final integration gate)
- **Depends on:** T5, T6, D-10-c, D-10-i, D-10-k
- **Files:** `packages/devtools/src/model/Capture.ts`, `packages/devtools/src/model/SimulationInput.ts`, `packages/devtools/src/model/SimulationSource.ts`, `packages/devtools/src/model/Wiring.ts`, `packages/devtools/src/model/PortCalls.ts`, `packages/devtools/src/react/ServicesPanel.tsx`, `packages/devtools/test/model/{Capture,Replay,Wiring,PortCalls,SimulationSource}.test.ts`, `packages/devtools/test/react/ServicesPanel.test.tsx`, `packages/devtools/test/model/PortCalls.tst.ts` (*new*, or an existing devtools tst file)
- **Steps:**
  1. `SimulationInput.ts`: `export type EvaluationPorts = PortServices` (doc keeps the "why `CurrentSubject`/`EvaluationId` are excluded" paragraph and states the equality).
  2. `Capture.ts`: `CapturedAnswers` becomes `{ readonly [K in PortName]: ReadonlyMap<string, Answer<AnswerOf<PortTypes[K]>>> }` (fields renamed to port names — breaking for devtools 0.x); `emptyAnswers`/`answerCount` derive via `forEveryPort`/a mapped constructor; delete `attributeKey`…`signatureHistoryKey` (callers use `<port>.key(args)`); `capturing(ports)` = `decoratePorts(ports, (d, inner) => recordingPort-style wrap writing `Answered`/`Broke` into the port's map via `d.key`)`, built once (keeps `Capture.ts:129-140`'s guarantee, now inside `decoratePorts`); `replayLayer(answers)` = `mergePorts(mapPorts((d) => scriptedPort(d, (...args) => toReply(answers[d.port].get(d.key(args)))).layer))` where `Answered → PortReply.answer`, `Broke(message) → PortReply.fail(message)`, missing → `undefined` (the description's `none`, deleting `unrelatedUnknown`/`actedUnknown`/`noSignatures`, E14). Name each replay port `"snapshot"` (pass the name to `scriptedPort`).
  3. `SimulationSource.ts` `fixtureLayer`: `portsLayer({ AttributeResolver: input.attributes === undefined ? undefined : attributeResolverFromRecord(input.attributes), … })` — no `CustomPredicateNone`/`SignatureHistoryNone` lines; keep the two explanatory comments.
  4. `Wiring.ts`: `PortActivity` gains `readonly timeouts: number`; `portActivity` reads `Metric.value(portTimeoutsTotal)` and includes it in the `> 0` filter. `ServicesPanel.tsx` shows it beside retries.
  5. `PortCalls.ts`: `PORT_SPANS = forEveryPort((d) => d.span)`; `type PortSpan = PortSpanName`; keep `rowOf`'s per-span decoding (non-goal). A tstyche assertion pins `PortCallPort` (`PortCall["_tag"]`) = core `PortName`.
  6. Tests: `Capture.test.ts`/`Replay.test.ts` follow the field rename and key functions (INV-QD-043's agreement tests must pass with no change in what they assert); `Wiring.test.ts` gains "a timeout appears with `timeouts: 1`" (`Metric.update(portTimeoutsTotal, "DecisionHistory")`) and "nothing reached still reports nothing"; `ServicesPanel.test.tsx` renders the timeout count.
- **Tests:** as step 6.
- **Verify:** `pnpm vitest run packages/devtools && pnpm test:tstyche && pnpm exec stryker run stryker.devtools.mjs`
- **Done when:** `Capture.ts` has no per-port block; devtools mutation passes.

### T11 — Reshape `@qadi/testing` over core's doubles
- **Status:** [x] done (c86a381)
- **Depends on:** T5, D-10-f
- **Files:** `packages/testing/src/{Failing*,Recording*,EdgeRelationshipResolver,EventDecisionHistory,CallRecorder}.ts` (*deleted*, 11 files), `packages/testing/src/QadiReviewLayer.ts`, `packages/testing/src/QadiTestLayer.ts`, `packages/testing/src/index.ts`, `packages/testing/test/TestLayers.test.ts`, `packages/testing/README.md`
- **Steps:**
  1. `TestLayerOptions`: replace `attributeResolver`/`relationshipResolver`/`decisionHistory`/`customPredicate`/`signatureHistory` with `readonly ports?: PortOverrides`; keep `attributes`/`relationships`/`history`/`signatures`/`idPrefix`/`clock`. Precedence stated in the doc: an explicit `ports` entry wins over the matching data option.
  2. `qadiReviewLayer(options): Layer.Layer<StandingEvaluationServices>` (replacing `Exclude<QadiTestServices, CurrentSubject>`) = `Layer.mergeAll(portsLayer({ AttributeResolver: options?.ports?.AttributeResolver ?? (options?.attributes === undefined ? undefined : attributeResolverFromRecord(options.attributes)), … }), evaluationIdSequential(…), clockLayer(…))`. `QadiTestServices` stays `= EvaluationServices`.
  3. Delete the eleven modules and their barrel lines.
  4. `TestLayers.test.ts`: delete the tests of the deleted doubles; add tests for `ports` precedence and for each data option producing the core fixture's answers. Keep fixtures and `collectingTracer` tests.
  5. README: the "`{ layer, calls }`" section points at `recordingPort`/`scriptedPort` from `@qadi/core` with one compiled example.
- **Tests:** as step 4; package coverage ≥ 90%.
- **Verify:** `pnpm vitest run packages/testing && pnpm typecheck && node scripts/check-package-install.mjs`
- **Done when:** criterion 9 holds; `@qadi/testing` has no per-port module.

### T12 — Examples: hosts name only the ports they wire
- **Status:** [x] done (6f8e511; `pnpm example` e2e [~] deferred to final integration gate — newsroom typecheck + vitest and http-advanced tsc run here)
- **Depends on:** T5, T4
- **Files:** `examples/nextjs-newsroom/src/server/ports.ts`, `examples/nextjs-newsroom/src/client/ports.ts`, `examples/nextjs-newsroom/test/{forwarding,hydration,seed}.test.ts(x)`, `examples/http-advanced/server.ts`
- **Steps:**
  1. Server `ports`: `portsLayer({ AttributeResolver: attributes.pipe(…, Layer.orDie), RelationshipResolver: relationships, DecisionHistory: history })`; drop the `CustomPredicateNone`/`SignatureHistoryNone` lines and keep one sentence saying unwired ports sit at their fail-closed default. Wrap `history` in `decisionHistoryTimingOut("5 seconds")` too, so the example shows the now-complete wrapper set (comment why: a hung audit log would otherwise hold the request).
  2. Client `browserPorts`: same, three entries; its three HTTP adapters may use `<port>.failure(args, cause)` in their `mapError` instead of constructing errors by hand (`client/ports.ts:83, 104-110, 129`).
  3. Newsroom tests and `http-advanced/server.ts`: replace hand lists of four `None` layers with `portsLayer({ … })`.
- **Tests:** the example's own suites.
- **Verify:** `pnpm example`
- **Done when:** `git grep -n "CustomPredicateNone\|SignatureHistoryNone" -- examples` is empty.

### T13 — React, promise and http: confirm derived types; adopt `portsLayer` where tests hand-list defaults
- **Status:** [x] done (7fc5222)
- **Depends on:** T5
- **Files:** `packages/react/test/*.test.ts(x)` (the 9 files listing ≥ 4 `None` layers, E9), `packages/promise/test/facade.test.ts`, `packages/http/test/{http,decisionStream,RequirePermissionClient}.test.ts`
- **Steps:**
  1. No src change expected: `QadiRuntimeServices`, promise `QadiLayer`, `RequirePermission.ts`, `DecisionStreamRoute.ts` already name `StandingEvaluationServices` (E5). Confirm with `pnpm typecheck` after T5.
  2. Replace each hand-listed default bundle in these tests with `Layer.merge(portsLayer({ … }), evaluationIdSequential())` or `EvaluationServicesNone` (failing overrides are T16's).
- **Tests:** suites unchanged in behaviour.
- **Verify:** `pnpm vitest run packages/react packages/promise packages/http`
- **Done when:** none of these test files names more than the ports it overrides.

### T14 — Acceptance suite and website steps over the registry
- **Status:** [x] done (fd6c18a)
- **Depends on:** T5, T11
- **Files:** `features/step-definitions/Bridge.ts`, `features/step-definitions/SharedWorld.ts` (if it lists defaults), `features/features/devtools-simulator/devtools-simulator.steps.test.ts`, `features/features/port-calls/port-calls.steps.test.ts`
- **Steps:**
  1. Replace hand-listed default bundles with `portsLayer`; switch any `@qadi/testing` per-port double import to core's `scriptedPort`/`recordingPort`.
  2. `devtools-simulator.steps.test.ts:92` `brokenPorts` = `portsLayer({ AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer, … })` (the four failing layers at `:93-115`).
- **Tests:** BDD suite unchanged in behaviour.
- **Verify:** `pnpm test:bdd`
- **Done when:** BDD green; no feature file hand-lists the five defaults. **Phase C done.**

### T15 — Migrate core's hand-rolled failing and defecting port layers
- **Status:** [x] done (c2d80f2)
- **Depends on:** T2, T9, D-10-l
- **Files (failing-layer lines at `e0ee958`; `*` = conditional or counting):** `packages/core/test/Evaluate.test.ts` (902, 992, 1874, 2798, 3563, 3594, 3625, 3654, 3814\*), `Predicate.test.ts` (399, 1060\*, 1067\*, 1455, 1509\*, 1616), `SubjectSet.test.ts` (386\*, 414\*, 462\*, 583, 613\*), `AttributeResolver.test.ts` (28\*, 148, 247 — only those surviving T7), `CustomPredicate.test.ts` (111\*, 199), `DecisionCache.test.ts` (547\*, 584\*), `Ports.test.ts` (286\*, 326\*), `DecisionSink.test.ts` (53), `RelationshipResolver.test.ts` (194\*), `Rules.test.ts` (371); plus the defecting layers in `Evaluate.test.ts:3741-3931` and `Predicate.test.ts`'s ARCH-01 `worldLayer`/`Behavior` generator.
- **Steps:**
  1. Unconditional: `Layer.succeed(AttributeResolver, { resolve: (_s, a) => Effect.fail(new AttributeResolveError({ attribute: a, cause: "down" })) })` → `scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer`. Where a test asserts `cause`, keep the same cause value.
  2. Conditional (per key): `replyTable(attributeResolverPort, [[[id, "fail-x"], PortReply.fail("boom")]])` or a script function `(_s, a) => a.startsWith("fail-") ? PortReply.fail("boom") : undefined` (`Evaluate.test.ts:3814`).
  3. Counting: replace the hand `Ref` counter with the double's `calls.length` (or `calls` itself, which also pins order — strictly stronger).
  4. Defecting: `PortReply.die(err)` / `PortReply.throw_(err)`. In `Predicate.test.ts`, replace the `Behavior` union and `worldLayer` with `PortReply` and `replyTable` over the two translatable ports (ARCH-01 T7 properties keep their statements and seeds).
  5. Leave `PortAccess.test.ts`'s cause-matrix construction bare (it tests `catchPortDefect` on raw effects) — it goes on T18's allowlist.
- **Tests:** every migrated test asserts what it asserted before; a migration that changes an assertion is a defect in the migration.
- **Verify:** `pnpm vitest run packages/core` ; re-run `scan.mjs` and confirm the core count of failing hand-rolled layers is 0 outside the allowlist.
- **Done when:** core's 32 failing and its defecting hand-rolled layers are gone (allowlist excepted).

### T16 — Migrate devtools' and the acceptance suite's hand-rolled failing layers
- **Status:** [x] done (deviated: Capture.test.ts pairs not hoisted into a helper — each is three lines after migration; f6aa195)
- **Depends on:** T10, T14
- **Files:** `packages/devtools/test/model/Capture.test.ts` (124, 157, 190, 464, 498, 533, 564, 610, 636), `PortCalls.test.ts` (250), `Simulation.test.ts` (157), `WhatIf.test.ts` (72), `packages/devtools/test/react/Simulator.test.tsx` (59), `WhatIfTable.test.tsx` (47); `features/step-definitions/Bridge.ts` (35, 149\*, 188\*), `features/features/port-calls/port-calls.steps.test.ts` (250) (`devtools-simulator.steps.test.ts` done in T14)
- **Steps:**
  1. `Capture.test.ts`: each `Layer.mergeAll(<one failing port>, <four defaults>)` → `portsLayer({ <Port>: scriptedPort(<port>, () => PortReply.fail(<cause>)).layer })`. Hoist the three identical pairs into one helper `brokenOnly(port, cause)` local to the file.
  2. Others: as T15 steps 1–3.
- **Tests:** unchanged assertions; INV-QD-043's replay-fidelity tests must still pass.
- **Verify:** `pnpm vitest run packages/devtools && pnpm test:bdd`
- **Done when:** the 14 devtools + 8 features sites are migrated.

### T17 — Migrate react, http and promise hand-rolled failing layers
- **Status:** [x] done (2edd21f)
- **Depends on:** T13
- **Files:** `packages/react/test/QadiProvider.test.tsx` (116, 211), `Hydration.test.ts` (859), `edges.test.tsx` (42), `hooks.test.tsx` (69); `packages/http/test/http.test.ts` (465\*, 710, 773), `decisionStream.test.ts` (338), `RequirePermissionClient.test.ts` (125\*); `packages/promise/test/facade.test.ts` (87)
- **Steps:** as T15 steps 1–3.
- **Tests:** unchanged assertions.
- **Verify:** `pnpm vitest run packages/react packages/http packages/promise`
- **Done when:** the 11 sites are migrated.

### T18 — Ratchet: `PORT_DOUBLE_BUDGET` in the house-style gate
- **Status:** [x] done (e90c95d)
- **Depends on:** T15, T16, T17, D-10-j
- **Files:** `scripts/check-house-style.mjs`, `AGENTS.md` (§6 budgets paragraph)
- **Steps:**
  1. Add `PORT_DOUBLE_BUDGET = { "<file>": <count>, … }` for test-scope files only (the existing `testScope` machinery), counting lines matching `/\bnew\s+(AttributeResolveError|RelationshipResolveError|DecisionHistoryUnavailable|CustomPredicateError|SignatureHistoryUnavailable)\s*\(/`. Seed it from a fresh scan after T15–T17: expected members `packages/core/test/Errors.test.ts`, `SinkCodec.test.ts`, `PortAccess.test.ts`, `PortDescription.test.ts`, `PortConformance.test.ts`, `packages/http/test/QadiHttpError.test.ts`, `packages/http/test/fixtures/everyHttpEnforcementFailure.ts`, and any residual site a migration task recorded with its reason.
  2. Check both directions (a new file, or a count that moves either way, fails), with a message pointing at `scriptedPort`.
  3. AGENTS.md §6: a short paragraph naming the sixth budget and why it is test-scope (unlike the five src budgets).
- **Tests:** run the script against a scratch copy with one extra `new AttributeResolveError(` in a test file → fails; with one removed from an allowlisted file → fails.
- **Verify:** `node scripts/check-house-style.mjs`
- **Done when:** criterion 7 holds. **Phase D done.**

### T19 — Spec: ADR, behaviours, invariant, traceability, overview
- **Status:** [x] done (2d58b51)
- **Depends on:** T1–T18 (written alongside; land with the last code PR)
- **Files:** `spec/decisions/NEXT-a-port-is-described-once.md` (*new*), `spec/decisions/index.yaml`, `spec/decisions/{010,040,051,077}-*.md`, `spec/behaviors/06-services.md`, `spec/behaviors/25-inspection.md`, `spec/behaviors/30-port-calls.md`, `spec/behaviors/29-devtools-simulator.md` (if it names `CapturedAnswers` fields), `spec/behaviors/index.yaml`, `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md`
- **Steps:** see §8 for the full list; run every spec gate after.
- **Tests:** n/a.
- **Verify:** `node scripts/check-doc-examples.mjs && pnpm spec:verify:strict && node scripts/check-dod-table.mjs && node scripts/check-devtools-claims.mjs && node scripts/check-api-surface.mjs`
- **Done when:** all five pass.

### T20 — Documentation sweep, AGENTS.md, changesets
- **Status:** [x] done (28b9812; `check-website-build.mjs` [~] deferred to final integration gate)
- **Depends on:** T19
- **Files:** `AGENTS.md` (§3, §8, §6), `README.md`, `packages/testing/README.md`, `apps/website/src/content/docs/docs/packages/testing.md`, `apps/website/src/content/docs/docs/concepts/custom-predicates.md`, `apps/website/src/content/docs/docs/concepts/signatures.md`, `apps/website/src/content/docs/docs/packages/audit/signatures.md`, `spec/models/{02-abac,12-context-aware,14-spatial,22-type-enforcement}.md` (worked examples listing defaults), `spec/appendices/react-integration.md`, `.changeset/arch-10-port-descriptions.md` (*new*)
- **Steps:**
  1. AGENTS.md §3: a port module holds its Shape, service, **description**, and the layers derived from it; `RetryingLayer.ts` is gone; "a fail-closed default is named for the answer it gives" stays. §8: add `…Port` (a port's description) to the naming table. §6: T18's budget paragraph (if not already).
  2. Docs: replace hand lists of `None` layers with `portsLayer({ … })`; `@qadi/testing` docs point at `scriptedPort`/`recordingPort`; every edited ` ```typescript ` fence must compile.
  3. `pnpm changeset`: `@qadi/core` minor (new wrappers, descriptions, registry, environment functions; **Breaking:** `RetryingPortName`/`TimingOutPortName` removed); `@qadi/testing` minor (**Breaking:** eleven per-port modules removed, `TestLayerOptions.ports`); `@qadi/devtools` minor (**Breaking:** `CapturedAnswers` fields keyed by port name, key functions removed; `PortActivity.timeouts` added). CHANGELOGs are generated at release, not hand-edited.
- **Tests:** n/a.
- **Verify:** `node scripts/check-doc-examples.mjs && node scripts/check-website-doc-examples.mjs && node scripts/check-website-build.mjs`
- **Done when:** docs compile and say what the code does.

### T21 — The next-port yardstick (throwaway, not merged)
- **Status:** [x] done (deviated: run in the worktree and reverted, not on a branch — the brief forbids creating branches; findings in §10; follow-up 7336a5d)
- **Depends on:** T20
- **Files:** a scratch branch only
- **Steps:**
  1. On a throwaway branch, add `ProbePort` (`packages/core/src/ProbePort.ts`: Shape with `ask(request)`, service, an error class reused from an existing one to keep `SCHEMA_ERROR_BUDGET` untouched, description, derived default and wrappers) and add `"ProbePort"` to `PortName`.
  2. Run `pnpm typecheck`; record every error location. Expected: `Ports.ts` (registry entry, `forEveryPort`/`mapPorts`/`decoratePorts` lines), `PortConformance.test.ts` (case table), `PortMetrics.ts` nothing further, devtools `PortCalls.ts` (the `PortCallPort` = `PortName` tstyche pin and `rowOf`, because the panel must decode a new span — genuine per-port UI). Nothing in `helpers.ts`, `@qadi/testing`, `Capture.ts`, `SimulationSource.ts`, `SimulationInput.ts`, `DecisionCache.ts`, `Evaluate.ts`'s unions, react, promise, http, or the examples.
  3. Fill the forced sites; run the conformance suite — `ProbePort` passes every shared case.
  4. Record the file list and count in §10 against `f86f028`'s ~19 port-plumbing files. Delete the branch.
- **Tests:** the conformance suite over six ports, on the scratch branch.
- **Verify:** `pnpm typecheck && pnpm vitest run packages/core/test/PortConformance.test.ts` (scratch branch)
- **Done when:** criterion 8 is recorded with evidence.

### T22 — Full gate and mutation
- **Status:** [~] deferred to final integration gate
- **Depends on:** T1–T21
- **Files:** none
- **Steps:**
  1. `pnpm check` (every step in `spec/process/definitions-of-done.md`). If `pnpm coverage` times out in `FieldPath.test.ts` as on baseline (README open items), run `pnpm vitest run --coverage --testTimeout=60000` and record both.
  2. `pnpm exec stryker run` (core, full) and `pnpm exec stryker run stryker.devtools.mjs`; `stryker.http.mjs` only if T17 touched http src (it should not).
  3. Record scores against the integration-branch baseline (core 93.32, devtools 96.96).
- **Tests:** n/a.
- **Verify:** as the steps.
- **Done when:** criteria 10–12 hold. **Phase E done.**

## 7. Test strategy

**Survive unchanged:** every evaluator and translator test (`Evaluate.test.ts`,
`Predicate.test.ts`, `SubjectSet.test.ts`, `DecisionCache.test.ts`), the port-call
spans and metrics (`Ports.test.ts`'s metric half, `port-calls.feature`, devtools
`PortCalls.test.ts`), port-specific fixture semantics (`…FromRecord`,
`…FromEdges`, `…FromEvents`, `…FromSignatures`, `customPredicateFromRecord`),
INV-QD-043's capture/replay agreement (`Replay.test.ts`, `Capture.test.ts` — field
names change, assertions do not), ARCH-01's faulty-port properties (generator
re-expressed in `PortReply`, statements and seeds unchanged).

**Move to the new interface:** wrapper behaviour (retry, bounded, timing-out,
naming) moves from three per-port files to `PortConformance.test.ts`, which runs
it for all five; the hand-rolled failing/defecting layers (65 + 19) become
`scriptedPort` scripts with identical assertions (T15–T17).

**Deleted as redundant (replace, don't layer):** the per-port wrapper tests the
suite reproduces (T7 step 3, each listed in the PR with its replacement);
`@qadi/testing`'s tests of its deleted doubles (T11); devtools' tests of the five
removed key functions (their behaviour is the descriptions' `key`, covered by the
suite).

**New:** `PortDescription.test.ts` (the generic module against a test-local
port), `PortConformance.test.ts` (every derivation × every port), `Ports.tst.ts`
(registry exhaustiveness, `PortServices` equality, override typing),
`PortsLayer.test.ts` (environment functions, build-once), T1's four attempts
cases and two deadline pins, T6's five defect-constructor pins, devtools
timeouts.

**Property / differential:** the suite is a per-port differential in effect: each
derived wrapper must agree with its port's description (error built by `failure`,
answer `none.answer`, name composition). ARCH-01's Property A/B/C keep running over
`PortReply`-scripted worlds; their generator now samples the same four reply tags
the double supports.

**Mutation (ADR-QD-025/-076):** T8 targets the core seam (zero survivors in the
two new modules); E13's previously unpinned deadline message and timeout metric
now have tests that kill their mutants. T10 runs `stryker.devtools.mjs`. T22 runs
the full gate.

**Type-level:** tstyche pins the registry (`keyof PortTypes` = `PortName`), the
derived environment, and devtools' `PortCallPort` = `PortName`.

## 8. Spec and documentation updates

All under **CCR-QD-NEXT** (one CCR, or `CCR-QD-NEXT-a/b/c` if Phases A, B–C and
D–E ship separately).

**ADRs**
- **ADR-QD-NEXT** (*new*, `spec/decisions/NEXT-a-port-is-described-once.md`, Accepted): Context = E1–E15; Decision = D-10-a…l as decided (the lens description, its home, what is public, derived defaults, defect constructors, `@qadi/testing`'s reshaping, helper keys, metric domains, devtools timeouts, the ratchet, span names, reply variants); Consequences (positive: matrix closed by construction, one suite, one environment type, next port = one description; negative: two new modules, a six-parameter generic type, breaking changes in three packages); Alternatives with reasons (Shape normalisation; status quo; descriptions in `Ports.ts`). Register in `index.yaml`.
- ADR-QD-010: dated note — Shapes unchanged; a port module also declares a description and derives its layers; test doubles are now derived, not hand-written ("Test doubles are ordinary layers" still holds).
- ADR-QD-040: dated note — each named default is `nonePort(<port>)`; the answer lives in the description; names and answers unchanged.
- ADR-QD-051: dated note — every retrying wrapper annotates `qadi.attempts`; span names are read from the descriptions.
- ADR-QD-077: dated note — `PortAccess.ts`'s defect constructors and span names come from the descriptions; the defect rule stays there.

**Behaviour docs**
- `06-services.md`: BEH-QD-043's listing gains `CustomPredicateNone`, `SignatureHistoryNone` (E15) and states each is derived from its description's `none`; **BEH-QD-NEXT-a — Every port has the standard wrapper set**: REQUIREMENTs — each of the five ports MUST export `…Retrying`, `…Bounded`, `…TimingOut`; a retrying wrapper MUST annotate `qadi.attempts` with the number of invocations on the caller's span and count failed attempts in `qadi_port_retries_total`; a bounded wrapper MUST reject a non-positive or non-integer permit count at construction with `InvalidBoundedPermits`; a timing-out wrapper MUST fail a call that does not settle in time with the port's own error and count it in `qadi_port_timeouts_total`. **BEH-QD-NEXT-b — An environment names only what it overrides**: `portsLayer(overrides)` places each override in its own slot and every other port at its fail-closed default; order cannot change the result. **BEH-QD-NEXT-c — A port can be scripted**: `scriptedPort` answers, fails with the port's own error, dies or throws per request, falls back to the fail-closed answer, and logs its requests in order; `recordingPort` observes without absorbing.
- `25-inspection.md` BEH-QD-196: the wrapper-name requirement covers every derived wrapper; BEH-QD-197: `qadi_port_retries_total` and `qadi_port_timeouts_total` are keyed by all five ports.
- `30-port-calls.md` BEH-QD-227: the span table's Source column names the description's `span`; BEH-QD-229: the Services screen shows timeouts (D-10-i).
- `29-devtools-simulator.md` / INV-QD-043 prose: capture/replay keys and fail-closed answers come from the descriptions.
- `index.yaml`: register the new BEH ids.

**Invariants** (`spec/invariants.md`)
- **INV-QD-NEXT — Every port is described once, and every derived layer agrees with its description.** Statement: for every member of the registry, the named default answers the description's `none`; every wrapper fails only with an error built by the description's `failure`; a scripted double's unscripted request answers `none`. Source: `PortDescription.ts`, `Ports.ts`, the five port modules. Enforcement: `PortConformance.test.ts`, `Ports.tst.ts`, `PORT_DOUBLE_BUDGET`. Related: INV-QD-006, INV-QD-007, INV-QD-043.
- INV-QD-007 Enforcement: add the suite's default cases.
- INV-QD-043 Source: replay defaults read the descriptions (E14 closed).

**Traceability** (`spec/traceability.md`): §1 rows for behaviours 06, 25, 30 gain the new BEH ids and Sources (`PortDescription.ts`, `Ports.ts`); §2 INV-QD-NEXT row, INV-QD-007/043 rows; §3 ADR-QD-NEXT row; §4 new rows for `PortDescription.test.ts`, `PortConformance.test.ts`, `PortsLayer.test.ts`, `Ports.tst.ts`; the `AttributeResolver.test.ts` row (`:228`) re-described (wrapper depth moved to the suite); deleted `@qadi/testing` test rows removed.

**Overview** (`spec/overview.md`, gate 13 — `node scripts/check-api-surface.mjs`)
- Core: rows for the five descriptions, `PortDescription`, `PortShape`, `PortReply`, `PortScript`, `PortSpanName`, `PortTypes`, `PORTS`, `ServiceOf`/`ShapeOf`/`ArgsOf`/`AnswerOf`/`ErrorOf`, `PortServices`, `PortLayers`, `PortOverrides`, `PortVisitor`, `forEveryPort`, `mapPorts`, `mergePorts`, `portsLayer`, `decoratePorts`, `scriptedPort`, `recordingPort`, `replyTable`; the seven new wrappers added to the existing wrapper rows (`:237-245`); `RetryingPortName`/`TimingOutPortName` removed from `:253`; "Not listed above": `RetryingLayer.ts` row (`:764`) replaced by `PortDescription.ts`'s internal derivations (`wrapPort`, `wrapService`, `wrapServiceEffect`, `boundedPermits`, `retryCountingAttempts`, `retryingPort`, `boundedPort`, `timingOutPort`, `nonePort`) with the same reason.
- Testing: rows `:646-655` removed; `CallRecorder`/`makeCallRecorder` "Not listed above" row removed.
- Devtools: `:706` key-function row removed; `CapturedAnswers` row re-described; `PortActivity` gains `timeouts`.
- Revision bump + change-history row.

**CCR log**: `spec/README.md` CCR table row for CCR-QD-NEXT.

**Changesets**: T20 step 3.

## 9. Risks and rollback

| Risk | How it shows up | Mitigation / back-out |
| ---- | --------------- | --------------------- |
| A derived wrapper differs subtly from the hand-written one (name, error fields, message, metric word) | Existing per-port tests in T3 (kept until T7), T1's pins, `Ports.test.ts` names/metrics | T3 is behaviour-neutral by construction and gated on the unchanged suite; revert T3 alone (T2 stands alone, nothing imports it). |
| A metric registry key changes | `Ports.test.ts`'s pinned descriptions fail; devtools reads zero | Descriptions are never edited (§4); only `preregisteredWords` widens, which is not in the key (E4, `Metric.js:1688-1691`). |
| A shared `none.answer` is mutated by a caller (`[]` for signatures) | A later answer is non-empty | `Object.freeze([])` (T3 step 2); the suite asserts the default answers `[]` after a caller tried to push. |
| `JSON.stringify` in a request key throws (circular or `BigInt` `params` for `CustomPredicate`) | A scripted/recording/replay call dies | Same behaviour as devtools today (`Capture.ts:118-122`); a defect is converted to `CustomPredicateError` by `PortAccess.ts`. Document in the description's `key` doc; a test pins that a circular `params` yields a typed error under `evaluate`. |
| Import cycle through `Ports.ts` | `pnpm circular` (gate 5) | `PortMetrics.ts` never imports `Ports.ts`; `Ports.ts` never imports `Evaluate.ts`/`EvaluationServicesNone.ts` (§4). Fix the import, never the gate. |
| Evaluation slows (derived default adds a call) | `Evaluate.bench.ts` (T3, T8) | `nonePort` returns a precomputed `Effect`; `make` may assign `call` directly. A regression means a mistake, not a design cost. |
| Codemod in T9 renames a key outside a `testLayer` call | `tsc` errors, or a test silently loses an override | AST-scoped rename (not `sed`); excess-property checks; diff reviewed for `attributes:` changes inside subject literals (must be zero). |
| External users of `@qadi/testing`'s per-port doubles or devtools' key functions | Their builds break on upgrade | Changesets mark **Breaking** with the one-line replacement for each; packages are 0.x; D-10-f option (2) is the fallback if a consumer is known. |
| The ratchet's regex flags a legitimate new test | `check-house-style` fails | The budget is a reviewed list, like the other five; add the file with its reason. |
| ARCH-02 or another parallel plan edits the same port modules / `PortMetrics.ts` / `Capture.ts` | Merge conflicts | Land T2–T5 first; any plan touching a port module rebases onto the description. |

**Rollback:** phases revert in reverse order (E → D → C → B → A). Phase A (T1)
alone fixes the attempts defect and pins E13 with no public change. Phase B can
ship without C/D: the descriptions and registry are additive except the two
removed metric-domain types (D-10-h); if D-10-h is reversed, re-add them as
aliases. Phases C and D are per-package and independently revertible.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-05 | — | Plan written; evidence re-verified at `e0ee958`. E2 confirmed by probe (`relationship {}`, `custom {}` vs `attribute { qadi.attempts: 3 }`) — a live observability defect, fixed test-first in T1. E3 settled: a lens description type-checks with no `as`/`any` and runs. E8 re-counted by AST scan: 65 failing hand-rolled port layers in 27 files (46 unconditional) plus 19 defecting; the blocker is dependency direction, not double expressiveness. E12 refuted (ARCH-01 fixed it). New: E13 (timeout metric unread/untested), E14 (devtools copies fail-closed answers by hand), E15 (wrappers unspecified; BEH-QD-043 listing stale), E9 ordering hazard. Status `needs-decision` on D-10-a…l. | Claude (planning agent) |
| 2026-10-05 | T1 | Red first: the two new `qadi.attempts` cases per port failed (`expected {} to deeply equal { 'qadi.attempts': 3 }`) for relationship and custom, 4 failures; green after `retryCountingAttempts`. Deadline message and timeout metric pinned for attribute and relationship. Patch changeset `arch-10-retry-attempts.md`. | Claude (impl agent) |
| 2026-10-05 | T2 | Deviation: three modules, not one or two. `PortDescription.ts` (public: `PortShape`, `PortDescription`, `PortReply` + constructors, `PortScript`), `PortDerivation.ts` (internal, `./*` only: `wrapService`, `wrapServiceEffect`, `boundedPermits`, `retryCountingAttempts`, `wrapPort`, `retryingPort`, `boundedPort`, `timingOutPort`, `nonePort`), `PortDoubles.ts` (public: `scriptedPort`, `replyTable`, `recordingPort`, `PortDouble`). `export *` cannot exclude names and madge counts type-only imports, so the doubles (which need `wrapPort`) could not share the public types module without a cycle. `Args` are written as **mutable** labelled tuples: a `readonly` tuple rejects a script written `(who, what) => …` (TS: readonly cannot be assigned to the mutable rest). Scripts/observers take `NoInfer` so the description alone fixes `Args`/`A`. `PortReply.throw` (not `throw_`). The retrying derivation re-invokes the method per attempt (`Effect.suspend`), so a scripted double is consulted once per attempt. | Claude (impl agent) |
| 2026-10-05 | T3 | Five descriptions declared beside their services; every existing wrapper and default is a one-line derivation with its exported type kept; `RetryingLayer.ts` deleted. Signature none answer is `Object.freeze([])`. `CustomPredicate`'s `failure` renders a string as is, an `Error` by message, else `String`, with a placeholder if `String` throws. All existing tests passed unchanged (core+devtools+testing 2050/2050). Overview rows added in the same commit to keep gate 13 green. | Claude (impl agent) |
| 2026-10-05 | T4 | Seven wrappers added; `RetryingPortName`/`TimingOutPortName` deleted, both wrapper metrics preregister `PORT_NAMES`; descriptions untouched and now pinned for `portRetriesTotal`/`portTimeoutsTotal` too. | Claude (impl agent) |
| 2026-10-05 | T5 | `Ports.ts` with `PortTypes`, `PORTS`, `ServiceOf`/`ShapeOf`/`ArgsOf`/`AnswerOf`/`ErrorOf`, `PortServices`, `PortLayers`, `PortOverrides`, visitors, `forEveryPort`, `mapPorts`, `mergePorts`, `portsLayer`, `decoratePorts`. `EvaluationServices = CurrentSubject \| EvaluationId \| PortServices`; `WalkServices`/`EvaluationRequirements` gone; `EvaluationServicesNone = Layer.merge(portsLayer(), EvaluationIdLive)`. `Ports.tst.ts` (5 tests) and `PortsLayer.test.ts`. | Claude (impl agent) |
| 2026-10-05 | T6 | `PortAccess.ts` names no port error class and no port span literal; each read builds its request once and passes the same value to `defect`. Five wiring tests; the custom one checks `reason` contains the defect and that `defect` renders `Cause.pretty`, because the live cause carries span annotations a rebuilt cause does not. BDD 510/510. | Claude (impl agent) |
| 2026-10-05 | T7 | `PortConformance.test.ts`: 13 cases × 5 ports + request keys + custom reason rendering. Deleted as covered: `AttributeResolver.test.ts` (whole file: retrying ×3 incl. attempts, bounded ×4, timing-out ×3); `RelationshipResolver.test.ts` describes `relationshipResolverRetrying` (4 incl. T1's two), `relationshipResolverBounded` (3), `relationshipResolverTimingOut` (2); `CustomPredicate.test.ts` describes `customPredicateRetrying` (4 incl. T1's two), `customPredicateBounded` (4), `naming` (2); `Ports.test.ts` "the fail-closed defaults name themselves", "a wrapper names itself around what it wrapped", "a bounded wrapper names its permit count", "the relationship wrappers compose their names too", "a bounded relationship wrapper names its permit count", the four "UNNAMED … falls back" cases. Each maps to the suite's default / retrying / bounded / timing-out / names cases. Core coverage 98.79% stmts after adding key and reason tests. | Claude (impl agent) |
| 2026-10-05 | T8 | `pnpm vitest bench` fails on `bench.compare` with one benchmark under vitest 5 (ARCH-13 T0, other track), and prints no numbers for the passing ones, so the A/B ran in a scratch harness (`node --experimental-strip-types`, 3k warm-up + 20k iterations, `git archive e0ee958` vs HEAD, interleaved ×3, same session): one node 181.8 → 181.1 µs (−0.4%), resolver miss 284.6 → 288.1 (+1.2%), wide 198.1 → 210.3 (+6.2%), deep 267.2 → 256.6 (−4.0%). Absolute numbers are inflated by machine load; all deltas within run-to-run spread (±10% between runs of one side). Criterion 11 holds. Targeted Stryker deferred to the final integration gate (brief). | Claude (impl agent) |
| 2026-10-05 | T9 | `testLayer`/`subjectSetLayer` take `PortOverrides` over `portsLayer`; AST codemod renamed 148 keys in 10 core test files, 5 stragglers by hand (`counting(...)`'s object and `Predicate.test.ts`'s `run(..., {…})`). | Claude (impl agent) |
| 2026-10-05 | T10 | Visitors re-typed per port: a visitor generic in a description's six parameters cannot connect `answers[d.port]` to `d`'s answer type, so `PortVisitor`/`PortLayerVisitor`/`PortDecorator` are generic in `K extends PortName` over a new `DescriptionOf<K>`; `PortLayers`/`PortOverrides` spelled `ServiceOf<PortTypes[K]>` (Layer is invariant, a second spelling would not unify). Added `tabulatePorts` for per-port values uniform across ports (core export). `Capture.ts` has no per-port block; key functions removed; replay is `scriptedPort` named `"snapshot"`. Key distinctness tests moved to core's suite. `PortActivity.timeouts` + panel text "N timed out". `PortCalls.tst.ts` pins `PortCallPort` = `PortName`. | Claude (impl agent) |
| 2026-10-05 | T11 | Eleven per-port modules deleted from `@qadi/testing`; `TestLayerOptions.ports?: PortOverrides` wins over the matching data option; data options build core's fixtures; `qadiReviewLayer` typed `StandingEvaluationServices`. A spread `...(cond ? { decisionHistory: x } : {})` escapes excess-property checks, so `Bridge.ts`'s three old keys were found by grep, not `tsc`. BDD resolves `@qadi/testing` through `lib/`, so a stale build masked the change until `pnpm typecheck` rebuilt it (stale `lib/` files of deleted modules removed by hand). | Claude (impl agent) |
| 2026-10-05 | T12 | Newsroom server/client and `http-advanced` over `portsLayer`; server history gains `decisionHistoryTimingOut("5 seconds")`; client adapters build errors via `<port>.failure`. Newsroom `typecheck` + `vitest` (14/14) pass; Playwright e2e is part of `pnpm example`, deferred. | Claude (impl agent) |
| 2026-10-05 | T13 | 27 default bundles in 11 react/promise/http test files rewritten by a type-aware codemod (reads each merged layer's provided service through the TS checker) into `portsLayer({ … })`. No src change. | Claude (impl agent) |
| 2026-10-05 | T14 | port-calls and devtools-simulator steps over `portsLayer`; `brokenPorts` is four `scriptedPort` failures. | Claude (impl agent) |
| 2026-10-05 | T15 | Core: unconditional sites by an AST codemod that only rewrites when the hand-built error's identifying fields equal what `failure` builds from the request (else it reports and skips); conditional/counting sites by hand; Predicate.test's `Behavior`/`worldLayer` replaced by `PortReply` scripts. `scriptedPort`'s script became its own type parameter (`S extends PortScript<Args, A>`): with `NoInfer`, a script naming fewer parameters than the port takes (`(subjectId) => …`) failed (`[a, b]` not assignable to `[a]`). Residual hand-built errors (need the error as a value, or a latch): see T18's table. | Claude (impl agent) |
| 2026-10-05 | T16 | Devtools + features: codemod then `portsLayer` collapse; `Bridge.ts`'s per-candidate and counting faults are scripts. | Claude (impl agent) |
| 2026-10-05 | T17 | react/http/promise: 3 by codemod, 7 by hand (fixed-literal attribute errors checked against the policy's attribute first). Rescan: no hand-written failing/dying port layer remains outside the allowlist (one `Layer.effect` that dies while *building* in `Simulator.test.tsx` is not a port double and builds no port error). | Claude (impl agent) |
| 2026-10-05 | T18 | `PORT_DOUBLE_BUDGET` (12 files; scope `packages/*/test`, `packages/*/bench`, `features/step-definitions` — `features/features/**` is not scanned by the script at all). Both directions exercised on scratch edits (an extra construction in `edges.test.tsx` → "constructs a port error by hand"; one removed from `Tokens.test.ts` → "declares 1 … found 0"). AGENTS.md §6 paragraph. | Claude (impl agent) |
| 2026-10-05 | T19 | Numbering per the parallel-track brief: CCR-QD-901, ADR-QD-901 (`spec/decisions/901-a-port-is-described-once.md`), BEH-QD-901–903, INV-QD-901 — branch-local, renumber at merge. `behaviors/index.yaml` lists one entry per file, so no new entry was needed. Gates: verify:strict 19/19, doc-examples, api-surface, dod-table, devtools-claims green. | Claude (impl agent) |
| 2026-10-05 | T20 | AGENTS.md §3/§8; 44 compiled doc fences (spec models/behaviors/appendices/overview, website, README) that hand-listed defaults rewritten by extracting each fence, running the type-aware codemod against the doc-example tsconfig, and writing back (two dropped slot comments restored by hand). Website `testing.md` and the package README document `ports`/`scriptedPort`/`recordingPort` with compiled fences. Changeset `arch-10-port-descriptions.md` (core/testing/devtools minor, breaking) plus T1's patch changeset. | Claude (impl agent) |
| 2026-10-05 | T21 | Yardstick, in place then reverted: added `ProbePort.ts` (Shape `ask(request)`, `CustomPredicateError` reused, description, default, 3 wrappers) and `"ProbePort"` to `PortName`. `tsc` asked for exactly: `PortMetrics.ts` (the `PORT_NAMES_BY_NAME` record line), `Ports.ts` (import, `PortTypes`, `PORTS`, `tabulatePorts`, `mapPorts`, `mergePorts` — `decoratePorts` needed nothing), `index.ts` (barrel line; without it `@qadi/http`'s `.d.ts` emission cannot name the new service, TS2883), and tests: `PortConformance.test.ts` (case + run line), `PortsLayer.test.ts` (a literal expected value), devtools `Capture.test.ts` (two cases that hand-assembled all five ports — made registry-driven in 7336a5d). tstyche additionally fails `Ports.tst.ts` (the five-service equality) and devtools `PortCalls.tst.ts` (`PortCallPort` = `PortName`: the collector's row decoder is genuine per-port UI). Nothing in `helpers.ts`, `@qadi/testing`, devtools `Capture.ts`/`SimulationSource.ts`/`SimulationInput.ts`, `DecisionCache.ts`, `Evaluate.ts`, react, promise, http src or the examples. With the case filled, the conformance suite passed over six ports (91/91). Versus `f86f028`'s ~19 port-plumbing files: 4 src files (plus the port module) and 3 test files. | Claude (impl agent) |
| 2026-10-05 | T22 | Deferred to the orchestrator's final integration gate (brief): full `pnpm check`, coverage thresholds, Stryker (targeted T8 run and `stryker.devtools.mjs` included), `pnpm example`, `pnpm website`, `spec:package`. | Claude (impl agent) |
| 2026-10-05 | final | Verification on `7336a5d`: `pnpm typecheck`, `pnpm lint` (two pre-existing `no-unused-vars` warnings in react), `pnpm circular`, `pnpm test:tstyche` (10 files, 43 tests), `pnpm exec vitest run` (113 files, 2728 tests), `pnpm test:bdd` (31 files, 510), `spec:examples` (84 blocks), `spec:verify:strict` (19/19), `spec:api` (798 exports), `spec:gates`, `spec:claims`, `spec:website-examples` (33 blocks), `check-house-style` — all green. `pnpm bench`: 10 pass, 6 fail with vitest 5's "`bench.compare()` requires at least 2 benchmarks" — the pre-existing ARCH-13 T0 defect, same set as on `main`; the T8 A/B used a scratch harness instead. | Claude (impl agent) |
