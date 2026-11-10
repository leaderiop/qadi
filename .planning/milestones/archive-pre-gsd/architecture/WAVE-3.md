> Moved verbatim out of `README.md`. The tracker README keeps the active wave.

# Wave 3: the 2026-10-06 review (ARCH-16 to ARCH-29)

These plans resolve the 13 candidates from the 2026-10-06 architecture review, plus one plan (ARCH-29) for the review's four
unverified side-findings. The report lives outside the repo, at
`/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261006-112423.html`.
Every plan re-verified its evidence against **`e328e75`** (`main`, after 0.10.0 and #144–#146). Throwaway probes are in the
session scratchpad under `wave3/<ARCH-id>/`. They are **ephemeral**; each plan's §1 records the command that settles every claim,
so T0 can re-run it.

**Prerequisite:** none. Unlike wave 2, every plan branches from `main`. Mind the ordering in "Cross-plan conflicts" below.

**Releases:** several decisions below are breaking, so they ship as changesets only. Merging a version-packages PR or publishing
still needs the user's explicit go-ahead (standing instruction since 2026-10-06).

**Progress at a glance:** `./progress.sh` (or `./progress.sh 16 17 …`) prints done/total tasks and the status per plan.

## Plans (wave 3)

| ID | Plan | Review strength | Status | Tasks | Decisions | Estimate | Depends on |
| -- | ---- | --------------- | ------ | ----- | --------- | -------- | ---------- |
| [ARCH-16](ARCH-16-question-and-walk.md) | The question is one value; the walk is an internal module; `evaluate` is the lifecycle; a health probe asks the ports every time | Strong | done | 11/11 | 6 (D-16-a…f) | L | — (goes first in core) |
| [ARCH-17](ARCH-17-case-wise-fold.md) | A case-wise fold over Policy, Matcher and Explanation: arity is a type, not a runtime throw | Strong | done | 15/17 (T6, T13 dropped on measurement) | 8 (D-17-a…h) | L | ARCH-16 T5 (soft: the `Walk.ts` move) |
| [ARCH-18](ARCH-18-endpoint-access.md) | An endpoint's access declaration is read once, over one scope, by the middleware and the registry | Strong | done (2026-10-07) | 8/8 | 4 (D-18-a…d) | M | — |
| [ARCH-19](ARCH-19-http-edge-step.md) | One authorization step at the HTTP edge | Strong | done (2026-10-07) | 10/11 | 6 (D-19-a…f) | M | ARCH-18 (T5 only), ARCH-28 |
| [ARCH-20](ARCH-20-simulation-session.md) | A headless `SimulationSession`; the form is a round-tripping codec; `Simulator.tsx` renders and dispatches | Strong | done | 15/15 (T13 scoped) | 10 (D-20-a…j) | L | ARCH-21 T7 (soft) |
| [ARCH-21](ARCH-21-port-span-attributes.md) | A port describes its span attributes too; the wiring report iterates the registry | Strong | done | 12/13 | 9 (D-21-a…i) | L | — |
| [ARCH-22](ARCH-22-explanation-trace-alignment.md) | Core owns Explanation↔Trace alignment; every Trace walk is stack-safe; one node address | Worth exploring | done | 11/12 (T10 left to the gate) | 8 (D-22-a…h) | L (T1 alone S) | ARCH-17 (T6), ARCH-20 (T8), D-29-g |
| [ARCH-23](ARCH-23-react-question-handle.md) | One question path in `@qadi/react`: one opener, a `QuestionBook`, `usePolicies` on the same path | Worth exploring | done | 12/12 (T10 left to the gate) | 8 (D-23-a…h) | L | — |
| [ARCH-24](ARCH-24-diagnostics-store.md) | Diagnostics sampling is written once, in the devtools model, as a store a schedule feeds | Worth exploring | done | 11/11 (T9 left to the gate) | 9 (D-24-a…i) | M | ARCH-21 T3 (PortReport shape) |
| [ARCH-25](ARCH-25-encode-refusal-description.md) | Core describes an encode refusal once; every adapter reports it the same way in its own words | Worth exploring | implemented | 11/11 | 8 (D-25-a…h) decided | M | — |
| [ARCH-26](ARCH-26-short-circuit-stepper.md) | One pure short-circuit stepper both interpreters ask (benchmark-gated) | Speculative | dropped (T1–T3 landed; stepper dropped by the D-26-a gate, noise) | 7/13 done, 5 dropped | 8 (D-26-a…h, all decided) | M (S if DROP) | ARCH-16, ARCH-17 (D-26-f) |
| [ARCH-27](ARCH-27-error-descriptor.md) | One descriptor per error tag (rec. **DROP**; small fixes land anyway) | Speculative | done (descriptor dropped) | 8/11 (T7-T9 `[-]`) | 4 decided | M | — |
| [ARCH-28](ARCH-28-sse-frame-vocabulary.md) | The SSE frame vocabulary moves to core, beside `LogCursor` | Speculative | done | 8/9 | 6 (D-28-a…f) | M | — (lands before ARCH-19) |
| [ARCH-29](ARCH-29-loose-ends.md) | Four loose ends: archive order, retention on impossible ages, subject-set error policy, the `./*` subpath export | n/a | done (wave 3; T11 left to the orchestrator's `pnpm check`) | 12/13 | 0 (D-29-a…h decided 2026-10-07) | L | — |

**Totals:** 167 tasks and 102 open decisions.

## Defects found while planning (wave 3): ship these first

Each row is a test-first task that ships on its own as a patch, ahead of its plan's refactor.
**CONFIRMED** means a probe or test in the plan's §1 reproduced it at `e328e75`.

| Plan · task | Defect | Found by | Blocked on |
| ----------- | ------ | -------- | ---------- |
| ARCH-16 · T1 | With a `DecisionCache` wired, `createGuardHealthCheck` reports healthy while the store is down: the second probe is a cache hit and never calls a port (`first true second true … calls 1`) | review | nothing |
| ARCH-16 · T6 | Every health probe writes a canary `DecisionRecord` to the sink/audit and moves the decision metrics; no BEH/ADR says so. The probe also requires `EvaluationId` and mints an id it never uses | planning (new) | D-16-b, D-16-d |
| ARCH-18 · T1 | `/__permissions` lists group- and API-annotated endpoints as guarded while the middleware answers 500. **Worse:** a group requirement plus an endpoint `publicEndpoint` is listed as guarded and is **served to anyone (204)** | review + planning | nothing (one-line registry fix) |
| ARCH-19 · T2 | The SSE re-check classifies a broken credential store as `"extraction-failed"`, not `outage` (the ADR-081 table) | review | nothing |
| ARCH-20 · T1 | Simulator: choose Live, then the host drops `ports`, and the run answers ALLOW from **fixtures**. The `sourceOf → undefined → portsOf(undefined)` guard does not hold | review | nothing |
| ARCH-20 · T2 | Switching policy (or re-seeding) mid-run shows the old result under the new policy, not marked stale; the tree is drawn against the wrong trace | planning (new) | nothing |
| ARCH-20 · T3 | The sweep ignores the pairs toggle: the cost line says 3 evaluations, 4 run. An existing test pins the bug | planning (new) | D-20-h |
| ARCH-20 · T4 | Chip codec: renaming the subject desynchronises its edges, and the next edit rewrites them; a relation containing `:` splits wrongly; `"7"` displays as `7` | review + planning | D-20-e, D-20-f |
| ARCH-20 · T9 | A Simulator → Log → Simulator tab round trip loses the form, the capture and the result | planning (new) | D-20-g |
| ARCH-21 · T1 | The signature span's `qadi.scope`/`qadi.resource_id` never reach the devtools row; `qadi.attempts` is read by nothing | review | nothing |
| ARCH-21 · T3 | `wiringReport` hard-codes the port list and cannot tell a fail-closed default from a real adapter | review | D-21-f |
| ARCH-22 · T1 | A large `maxDepth` evaluates fine, then `renderTrace` throws `RangeError` past ≈1,483 levels and `diffTraces` past ≈2,186. `maxDepth: NaN` disables both depth guards | review + planning | nothing |
| ARCH-23 · T1 | `Atom.family` holds values weakly: after a GC the same question gets a new atom, so it evaluates twice, `asked()` lists it twice (BEH-QD-198), and a hydration seed is lost (fails closed). Reproduced 5/5 | planning (new) | nothing |
| ARCH-24 · T1 | The example dock rebuilds the whole browser layer every 2 s, so the Services cache card always reads "0 completed entries" | planning (new) | nothing |
| ARCH-25 · T1 | Audit-sink encode refusals are silent: no row, no log, no hook, only a counter; the `evaluationId` is lost | review | nothing |
| ARCH-25 · T2 | A throwing `onRefused` hook ends the decision stream (probed) and the backlog route (by reading the code): an unguarded `Effect.sync`, against BEH-QD-311/INV-QD-097 | planning (new) | nothing |
| ARCH-29 · T2 | Retention **deletes** rows on impossible inputs: `at = -Infinity` (stored JSON `-1e400` decodes to it), `now = +Infinity`, or `maxAgeMs < 0` purges every row | planning (new) | D-29-b, D-29-c |
| ARCH-29 · T4 | Decode accepts `"at": 1e400` and fractional/NaN `sequenceNumber` | planning (new) | D-29-d |
| ARCH-29 · T5 | The website's `subject-sets.md` shows pre-#107 signatures; a test title claims the failure names the subject, and it does not | planning (new) | nothing |

**Startable now, no decision needed:**
- ARCH-16 T0, T1, T3 (minus the rule), T8 (before-measurement)
- ARCH-17 T0
- ARCH-18 T0–T2
- ARCH-19 T0–T2
- ARCH-20 T0, T2
- ARCH-21 T0–T2
- ARCH-22 T0, T1, T5
- ARCH-23 T0–T3
- ARCH-24 T0, T1
- ARCH-25 T0–T2
- ARCH-26 T0–T3
- ARCH-27 T1–T4
- ARCH-28 T0, T1
- ARCH-29 T0, T1, T2, T5

## Claims the review got wrong (wave 3)

- **ARCH-17:** the review undercounted. There are 7 one-child helpers, not 6, and 4 throwing `Rules` re-checks plus one silent one (`renderExplanation` prints "undefined"), not 2. Simplify's "unkillable" comment is about the AllOf/AnyOf unwrap, not these guards.
- **ARCH-18:** the middleware options do expose `group`; only the API level is hidden. ADR-036 says the middleware reads `{endpoint, group}`, but it reads the endpoint only.
- **ARCH-20:** a remedy edge is **not** rewritten, because remedy edges always name the current subject. There are 11 `useState`s, not 9.
- **ARCH-21:** "a sixth port never shows up" holds only for `wiringReport`; in `rowOf` a sixth span is already a compile error. Only 5 of `wiringReport`'s 9 rows are ports.
- **ARCH-22:** the zip cannot be built over `foldExplanation`, which memoises shared nodes by identity; it must fold positions. `InspectNode.path` cannot become `number[]` (OOM at 40k levels). Even a stack-safe `renderTrace` hits `Invalid string length` past ≈23k levels. Devtools itself cannot reach the overflow; hosts can.
- **ARCH-23:** a public `{read, seed}` handle would violate ADR-QD-039. `usePolicies`' questions do appear in `asked()`; only the gate-instance view misses them. `GateInstanceLike.kind` is a `string`, so a new kind breaks nothing at the type level.
- **ARCH-26:** the stop contract is not only in the walk-equality property, since per-interpreter examples carry part of it. `ShortCircuit.test.ts` kills 0 of 6 injected stop-rule mutants, so INV-QD-058 overstates it.
- **ARCH-27:** the `Errors.ts:524-531`/overview claim that a value import of `PolicyDecodeTooDeep` would be circular is false; madge is clean.
- **ARCH-29:** the archive order is intended and tested (ADR-056 gives ordering to readers). `decideSubjects` does pass `concurrency` per subject. AGENTS.md §9 is about name clashes, not privacy. The stream/array asymmetry is specified as deferred work.

## Decisions that need the user, not just a reviewer

These are breaking changes, or edits to AGENTS.md, so they must not be taken at the recommended default silently:

| ID | What | Why it needs sign-off |
| -- | ---- | --------------------- |
| D-29-g | Remove `./*` from every package's `exports` (devtools keeps `./react`) | Breaking for anyone importing a subpath; CHANGELOG treats subpaths as semver surface. **Settle first:** D-16-c, D-22-a, D-26-d and D-27-b depend on it |
| D-16-a | Public `Question`; remove `DecisionCacheKey` | Breaking `@qadi/core` export |
| D-18-d | `requiresPermission(group, …)` stops compiling | Breaking `@qadi/http` types |
| D-19-c, D-19-e | Remove `reauthCheck`, `handleEnforcementErrors`, `subjectExtractionFailedResponse` | Breaking `@qadi/http` exports |
| D-23-b, D-23-f | Remove `decisionFor`, no shim; new public `decisions` member | Breaking `@qadi/react` |
| ARCH-23 T9 | Edit AGENTS.md §13 (module-scope state claim, eviction text) | AGENTS.md is house law |
| D-25-h, D-21-h, D-16-f | New house-style rules (`check-house-style.mjs`) | They change the gate |
| D-26-d | Delete `anyOfStopsAtAllow`/`rulesDecisiveEffect` | Breaks `@qadi/core/ShortCircuit` subpath imports (moot if D-29-g removes `./*`) |
| D-28-c | Remove the old SSE frame exports without aliases | Breaking minor `@qadi/http` |
| D-29-e | Stream reviews report per-subject results | Breaking element types |

## Decision register (wave 3)

Full options and tradeoffs are in each plan's §5. "Rec." is the plan's recommendation. Status is `open` until recorded here and in the plan.

| ID | Question | Rec. | Status |
| -- | -------- | ---- | ------ |
| D-16-a | Shape of the request value | public `Question`/`QuestionOptions` + `questionOf` in `Question.ts`; `EvaluateOptions` extends it; drop `DecisionCacheKey` | decided (2026-10-07, recommended default) |
| D-16-b | Does the health probe emit records/metrics/use the cache? | no to all three | decided (2026-10-07, recommended default) |
| D-16-c | Where the walk lives | internal `Walk.ts`, a pure move; SWITCH/UNTRACED budgets re-keyed, same counts | decided (2026-10-07, recommended default) |
| D-16-d | What the probe calls | `walk`; requirement narrows to `CurrentSubject \| PortServices`; span gets `qadi.healthy`/`qadi.error_tag` | decided (2026-10-07, recommended default) |
| D-16-e | Benchmark gate? | no; record before/after in the CCR | decided (2026-10-07, recommended default) |
| D-16-f | Single sink emitter | internal `SinkEmit.ts` + house-style rule `sink-read-once` | decided (2026-10-07, recommended default) |
| D-17-a | Old array folds | keep public and unchanged; add the case form beside them | decided (2026-10-07, recommended default) |
| D-17-b | TreeFold shape | one loop, two outputs (`foldTreeBy`); split only if the bench regresses | decided (2026-10-07, recommended default; one loop kept after measuring a second) |
| D-17-c | Leaf handling | one arm per tag + `leafCases`/`leafMatcherCases` helpers | decided (2026-10-07, recommended default) |
| D-17-d | Which folds migrate | the position-needing ones + `policyDepth`; `referencesRef`/`matcherDepth`/`restrictsFields` stay array-form (hot path) | decided (2026-10-07, recommended default, except `policyDepth` stays array-form: +5–7% fresh evaluate) |
| D-17-e | Names | `foldPolicyCases`/`foldMatcherCases`/`foldExplanationCases` + `…Cases` types | decided (2026-10-07, recommended default) |
| D-17-f | Per-call state | build the cases object per call | decided (2026-10-07, recommended default) |
| D-17-g | ADR | amend ADR-090 in place, Rev 1.1 | decided (2026-10-07, recommended default; Rev 1.2, since 1.1 was taken) |
| D-17-h | Leaf-root fast path | own revertible, bench-gated task | decided (2026-10-07, taken then dropped: no gain on matcher-heavy) |
| D-18-a | Scope of an access declaration | the endpoint only; refuse group/API declarations; document `annotateEndpoints` | decided (2026-10-07, endpoint only; group/API refused; `annotateEndpoints` documented) |
| D-18-b | Misplaced declaration | typed layer error `MisplacedAccessDeclaration` from `registerApi` | decided (2026-10-07, typed layer error `MisplacedAccessDeclaration`) |
| D-18-c | Export `endpointAccess`? | yes | decided (2026-10-07, export `endpointAccess`/`EndpointAccess`) |
| D-18-d | Narrow `AnnotatedEndpoint` | yes (breaking) | decided (2026-10-07, narrowed `AnnotatedEndpoint`, breaking minor) |
| D-19-a | Step shape | returns `{authorized, resource, subject}`; takes a resource loader | decided (2026-10-07, A, recommended) |
| D-19-b | Visibility | `authorizeRequest` + `classifyHttpEnforcementFailure` public | decided (2026-10-07, A, recommended) |
| D-19-c | `reauthCheck` | remove; frames left to ARCH-28 | decided (2026-10-07, A, recommended) |
| D-19-d | Logging | the step owns both log taps | decided (2026-10-07, A, recommended) |
| D-19-e | `toResponse` | widen to all 12 tags; remove `handleEnforcementErrors`/`subjectExtractionFailedResponse` | decided (2026-10-07, A, recommended) |
| D-19-f | Stream close on re-check | log one line | decided (2026-10-07, A, recommended) |
| D-20-a | Store helper | own closure now; the second of ARCH-20/24 extracts a shared helper (**conflicts with D-24-a**) | decided (2026-10-07, own closure now; ARCH-24 extracts the shared helper) |
| D-20-b | Run model | `session.run` is an Effect; the hook forks; the session supersedes | decided (2026-10-07, recommended) |
| D-20-c | Unavailable source | keep the choice; refuse the run as a typed state | decided (2026-10-07, recommended) |
| D-20-d | Capture on ports change | drop it | decided (2026-10-07, recommended) |
| D-20-e | Subject rename | edges/events/signatures follow the rename | decided (2026-10-07, recommended) |
| D-20-f | Codec | hand-written per field, short + JSON forms, fast-check round trip | decided (2026-10-07, recommended) |
| D-20-g | Session owner | the dock (survives tab switches) | decided (2026-10-07, recommended) |
| D-20-h | Sweep vs pairs toggle | honour the toggle | decided (2026-10-07, recommended) |
| D-20-i | Spec | amend ADR-047/050 + new BEH | decided (2026-10-07, recommended) |
| D-20-j | `fast-check` | devtools devDependency | decided (2026-10-07, recommended) |
| D-21-a | Codec construction | Schema-typed field table (≈0.19 µs/span) | decided (2026-10-07) |
| D-21-b | Where it hangs | new `attributes` beside `span`; 7th type param with a default | decided (2026-10-07) |
| D-21-c | `disclose` input | each port's own answer type | decided (2026-10-07) |
| D-21-d | Visibility | public `PortSpan.ts` (types, `decodePortSpan`, `PortInterpreter`); internal `PortSpanEncode.ts` | decided (2026-10-07) |
| D-21-e | Devtools rows | 5-line table keyed by `PortName` | decided (2026-10-07) |
| D-21-f | "Defaulted" | `name === none.name` or starts with `none.name + " ("` | decided (2026-10-07) |
| D-21-g | Services card UI | warning tone if defaulted; muted "if defaulted:" otherwise | decided (2026-10-07) |
| D-21-h | Literal ban | house-style rule on `"qadi.<key>"` in writer/reader files | decided (2026-10-07) |
| D-21-i | Decoded field types | narrow to real unions | decided (2026-10-07) |
| D-22-a | Export `foldTrace` | yes, from `Decision.ts` (depends on D-29-g) | decided (2026-10-07, recommended) |
| D-22-b | Huge traces | cap `renderTrace` indentation at 64, `indentLimit` option | decided (2026-10-07, recommended) |
| D-22-c | Node address | core text key `tracePathKey`; devtools `describeTracePath` replaces both `pathOf` | decided (2026-10-07, recommended) |
| D-22-d | Shared wording | internal `Wording.ts` | decided (2026-10-07, recommended) |
| D-22-e | Zip | `foldAligned(explanation, trace, combine)` in `Explanation.ts` | decided (2026-10-07, recommended) |
| D-22-f | Trace/policy check at runtime? | no; core property test | decided (2026-10-07, recommended) |
| D-22-g | ADR | new ADR amending ADR-090 | decided (2026-10-07, recommended) |
| D-22-h | Sequencing | T1–T5 now; T6 after ARCH-17; T8 after ARCH-20 | decided (2026-10-07, recommended) |
| D-23-a | Opener | widen `decision(policy, resource?)`; no public handle | decided (2026-10-07, B, widen `decision(policy, resource?)`) |
| D-23-b | `decisionFor` | remove, no shim (breaking) | decided (2026-10-07, A, `decisionFor` removed, no shim) |
| D-23-c | Keying/eviction | the book owns keying via a strong `MutableHashMap`; eviction removes atoms; drop `inTracked` | decided (2026-10-07, B, the book owns keying with a strong `MutableHashMap`) |
| D-23-d | `usePolicies` gate | new `"usePolicies"` GateKind, one gate per named question | decided (2026-10-07, A, `usePolicies` registers one instance per entry) |
| D-23-e | Grouped hook | `useQuestions(Record<string, AskedQuestion>)`; `usePolicies` delegates | decided (2026-10-07, B, `useQuestions` added; `usePolicies` delegates) |
| D-23-f | `combinedFamily` | onto the atom set as public `decisions` | decided (2026-10-07, A, `decisions` on the atom set) |
| D-23-g | Mutation | `QuestionBook.ts` into `stryker.react.mjs` (break 80) + DoD row 22 | decided (2026-10-07, A, `QuestionBook.ts` mutated, break 80) |
| D-23-h | Key type | React `AskedQuestion`; alias core `Question` only if exactly `{policy, resource?}` | decided (2026-10-07, A, React keeps `AskedQuestion`; ARCH-16 `Question` carries subject and options, so no alias) |
| D-24-a | Store helper | shared `model/ExternalStore.ts` + `react/useRunningStore.ts`; the first of ARCH-20/24 creates it (**conflicts with D-20-a**) | decided (2026-10-07, B, ARCH-20 landed its own closure first; ARCH-24 extracted ExternalStore + useRunningStore) |
| D-24-b | Dock input | `diagnostics` options prop; the dock runs the hook | decided (2026-10-07, B, the dock runs the hook) |
| D-24-c | Snapshot props | keep; an explicit prop wins field by field | decided (2026-10-07, C, explicit props win field by field) |
| D-24-d | Questions | sampled as a thunk; `AskedQuestionLike` into `model/Gates.ts` | decided (2026-10-07, B, questions sampled as a thunk; AskedQuestionLike into model/Gates.ts) |
| D-24-e | Layer lifetime | built once per run, in the run's scope | decided (2026-10-07, B, built once per run in the run scope) |
| D-24-f | Layer build failure | closed `WiringRead` (NotHanded/Failed/Read) on screen; error channel `never` | decided (2026-10-07, B, closed WiringRead) |
| D-24-g | Default | opt-in; no prop, no fiber | decided (2026-10-07, A, opt-in) |
| D-24-h | Spec | new BEH + ADR-047 amendment | decided (2026-10-07, B, ADR-QD-047 amendment + BEH-QD-323 (no new ADR)) |
| D-24-i | Interval | the model takes a `Schedule`; hook/dock `intervalMillis`, default 2000 | decided (2026-10-07, layered: model Schedule, hook/dock intervalMillis, default 2000) |
| D-25-a | Core exports | the three readings + `reportEncodeRefusal(refusal, {message, onRefused})` | decided (2026-10-07, B, reporter) |
| D-25-b | Placement | readings in `Errors.ts`; reporter in new `EncodeRefusalReport.ts` | decided (2026-10-07, B, readings in Errors.ts and reporter in EncodeRefusalReport.ts) |
| D-25-c | Path reading | module-scope `Match.tagsExhaustive`; `""` for no path | decided (2026-10-07, A, encodeRefusalPath via Match) |
| D-25-d | Audit default | log a warning + optional `onRefused`; the counter always increments | decided (2026-10-07, A, warning plus onRefused) |
| D-25-e | `AuditEntryNotEncodable` | add `evaluationId` | decided (2026-10-07, A, evaluationId carried) |
| D-25-f | Annotations | tag, path, `evaluationId` only; new invariant + sentinel property test | decided (2026-10-07, A, new INV-QD-104) |
| D-25-g | ADR | amend ADR-095 (D-09-e) and ADR-056 | decided (2026-10-07, A, amend ADR-QD-095 and ADR-QD-056 (CCR-QD-193)) |
| D-25-h | Enforcement | house-style rule: annotation literals and `"path" in` only in core | decided (2026-10-07, A, house-style rule) |
| D-26-a | GO/DROP gate | ARCH-13 protocol, noise band ≤5%; DROP if any composite is ≥3% slower in both methods and both sessions | decided (2026-10-07, A; gate DROP by noise, D2) |
| D-26-b | Stepper answers | `"Stop" \| "Continue"` from functions picked once per node; no per-child allocation | decided (2026-10-07, (i); moot) |
| D-26-c | Coverage | all three composites, `allOf` included | decided (2026-10-07, (a); moot) |
| D-26-d | Old tables | delete `anyOfStopsAtAllow`/`rulesDecisiveEffect` | decided (2026-10-07, (a); moot) |
| D-26-e | Translation | stepper picked at `compile`, stored in the plan | decided (2026-10-07, (a); moot) |
| D-26-f | Sequencing | after ARCH-16 (and ARCH-17 if it reshapes `compileNode`) | decided (2026-10-07, (a)) |
| D-26-g | Redundant tests | delete the eight translator-only stop examples T2 covers | decided (2026-10-07, (a)) |
| D-26-h | DROP record | addendum to ADR-077 | decided (2026-10-07, (a)) |
| D-27-a | Build the descriptor? | **DROP** (all 7 sites are compile-checked; the floor is still 2 edits) | decided (2026-10-07, recommended) |
| D-27-b | SinkCodec vocabulary | leaf `SinkWire.ts`; error classes stay in `Errors.ts` | decided (2026-10-07, recommended) |
| D-27-c | Port-error regex | derive from the `"outage"` rows; tstyche pin | decided (2026-10-07, recommended) |
| D-27-d | Counts in comments | remove them | decided (2026-10-07, recommended) |
| D-28-a | Home | `DecisionLog.ts` | decided (2026-10-07, recommended) |
| D-28-b | What moves | event names + `synced` schema; frame encoding stays in http | decided (2026-10-07, recommended) |
| D-28-c | Old exports | remove, no aliases (breaking minor) | decided (2026-10-07, recommended) |
| D-28-d | `synced` | non-negative integer | decided (2026-10-07, recommended) |
| D-28-e | Devtools decode of `synced` | no | decided (2026-10-07, recommended) |
| D-28-f | Sequencing | before ARCH-19 | decided (2026-10-07, recommended) |
| D-29-a | Archive order | keep input order; specify and test it | decided (2026-10-07, A) |
| D-29-b | Non-finite `at` | keep the row, report it as `undated` | decided (2026-10-07, A) |
| D-29-c | Retention inputs | `planRetention` refuses a non-finite `now` / a NaN or negative `maxAgeMs` | decided (2026-10-07, B) |
| D-29-d | Decode | `at` as `Schema.Finite`, `sequenceNumber` as `Schema.Int`; no wire bump | decided (2026-10-07, A) |
| D-29-e | Stream reviews | per-subject result via a shared `decideSubject` (breaking) | decided (2026-10-07, B) |
| D-29-f | Cross-subject concurrency | none; document and test | decided (2026-10-07, A) |
| D-29-g | `./*` subpath | remove; root only (+ devtools `./react`) | decided (2026-10-07, A) |
| D-29-h | Enforcement | closed export list in gates 13 and 14 | decided (2026-10-07, C) |

## Cross-plan conflicts and overlaps (wave 3)

**Conflicts to resolve before work starts:**
1. **Store helper: D-20-a vs D-24-a.** ARCH-20 says the *second* of the two plans extracts the shared helper; ARCH-24 says the *first* creates it. Pick one rule, and record it in both plans. Suggestion: D-24-a. It is cheaper to create the helper once and move `TimelineStore` onto it with no test edits.
2. **The name "Question": ARCH-16 vs ARCH-23.** Core's `Question` carries the subject and options; React's `AskedQuestion` is `{policy, resource?}`. D-23-h keeps them separate unless core's is exactly the React shape. Decide D-16-a with that in mind.
3. **`./*` (D-29-g) gates four visibility decisions:** D-16-c (`Walk.ts` reachable?), D-22-a (`foldTrace` must be barrelled if `./*` goes), D-26-d (the breaking note disappears), and D-27-b (`SinkWire.ts` reachable?).

**Ordering overlaps (same files):**

| Files | Plans | Rule |
| ----- | ----- | ---- |
| `Evaluate.ts` (`evaluateNode`, composite folds) | ARCH-16 T5, ARCH-17, ARCH-22, ARCH-26 | land ARCH-16's `Walk.ts` move commit first; the others rebase onto `Walk.ts` |
| `TreeFold.ts`, `foldExplanation`, `foldTrace` | ARCH-17, ARCH-22 | ARCH-17 first; `foldTrace` ships in the case form from the start (ARCH-22 T6) |
| `Predicate.ts` (translation plan, `compileNode`) | ARCH-17, ARCH-26 | ARCH-17 first |
| `devtools/model/Remedies.ts` | ARCH-17, ARCH-20 | whichever lands second rebases |
| `devtools/react/Simulator.tsx` `pathOf` | ARCH-20, ARCH-22 | ARCH-20 first (D-22-h) |
| `devtools/model/PortCalls.ts`, `Capture.ts` | ARCH-21, ARCH-20 | ARCH-21 T7 first |
| `PortReport` / `wiringReport` shape | ARCH-21 T3, ARCH-24 | ARCH-21 T3 first; ARCH-24 treats the report as opaque, with no closures in it |
| `devtools/model/Source.ts` | ARCH-24, ARCH-28 | textual only |
| `http/RequirePermission.ts` middleware | ARCH-18, ARCH-19 T5 | ARCH-18 first |
| `http/DecisionStreamRoute.ts`, `DecisionBacklogRoute.ts` | ARCH-19, ARCH-25, ARCH-28 | ARCH-28 → ARCH-19; ARCH-25 is textual only and calls `reportEncodeRefusal` from wherever the frames end up |
| `core/Errors.ts`, `SinkCodec.ts` | ARCH-25, ARCH-27 (D-27-b `SinkWire.ts`), ARCH-29 T4 | the readings move with `EncodeRefusal`; whichever lands second rebases |
| Sink emission (`Evaluate.ts:1113`, `Qadi.ts:96`) | ARCH-16 (`SinkEmit.ts`), ARCH-25 | ARCH-16 first; ARCH-25 hooks its accounting into `SinkEmit.ts` |
| `@qadi/react` gates → devtools | ARCH-23, ARCH-24 | `kind` stays an open string; several instances may share one `useId` prefix; questions thunk vs `QuestionBook` must agree |
| `classifyHttpEnforcementFailure` table | ARCH-19, ARCH-27 | it reads the ADR-081 table; no descriptor needed |

## Suggested order (wave 3)

1. **Defect patches, independently** (no decisions): ARCH-16 T1 · ARCH-18 T1 · ARCH-19 T2 · ARCH-20 T1/T2 · ARCH-21 T1 · ARCH-22 T1 · ARCH-23 T1 · ARCH-24 T1 · ARCH-25 T1/T2 · ARCH-29 T5. Then ARCH-29 T2/T4 once D-29-b…d are decided.
2. **Settle the cross-cutting decisions:** D-29-g, then D-20-a/D-24-a and D-16-a/D-23-h, then the breaking-change sign-offs above.
3. **Core:** ARCH-16 (the `Walk.ts` move first) → ARCH-17 → ARCH-22 → ARCH-26's benchmark gate.
4. **http:** ARCH-18 → ARCH-28 → ARCH-19, with ARCH-25 alongside.
5. **devtools:** ARCH-21 → ARCH-20 → ARCH-24.
6. **react:** ARCH-23 (any time after step 2).
7. **ARCH-27:** T1–T4 any time; the descriptor is recommended DROP.

## Orphan findings (wave 3): not owned by any plan yet

- `devtools/react/PolicyExplorer.tsx:66` re-declares the depth limit `64` instead of importing core's (ARCH-16 note).
- ADR document IDs are wrong: ADR-094 reads `QADI-ADR-901`, and ADR-095…097 read `902…904` (ARCH-21 note; ARCH-21 T10 fixes only 094).
- ARCH-07's circuit-breaker `writesWriteFailed` has no log line either (ARCH-25 note).
- `TraceSchema` encode/decode overflow at ≈936/741 levels; whether `@qadi/react`'s dehydrate path is guarded is unverified (ARCH-22 note).
- `check-house-style.mjs:438,442` carry stale error-tag counts in comments (ARCH-27 T4 covers them).
- **Environment:** this checkout's `features/node_modules` has no `@qadi/http` link, so the decision-log BDD cannot load until `pnpm install` is run (ARCH-28 note).

