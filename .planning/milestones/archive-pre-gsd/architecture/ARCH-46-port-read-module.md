---
id: ARCH-46
title: One port-read module behind the port description — one generic read per port (span, metric, defect, both annotations), thin request formers, and a wire that keeps only the wire
strength: Strong   # 2026-10-13 review, candidate #1 ("top pick"), ports & adapters
status: superseded-by-phase-13
disposition: "T1 fixed on main by merged ARCH-47 readPort (e0365e0); T2's misplaced PortMetrics.ts block goes to Phase 13 (GAP-11); T4–T9 are out of scope (benchmark NO-GO); was `blocked` (T4 NO-GO 2026-10-13, 903be15: T1–T3 + O2 landed, T5–T9 not built, see ADR-QD-077 Rev 1.2 addendum), partial work on rescue/wave5-1013 903be15 (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []   # no hard block; sequencing with ARCH-47, ARCH-51, ARCH-52, ARCH-55 and ARCH-56 in §9
blocks: [ARCH-51, ARCH-55]   # soft: both edit the same lines (PortAccess.ts request formers; PortWire*/PortSpan* members this plan removes)
adrs_touched:
  - ADR-QD-077 (amend — `PortAccess.ts` keeps "one module per concern", but the read is one generic function per port, built once from the description; the per-port functions become request formers; the decided D-01-b — the module owns question forming — is kept)
  - ADR-QD-094 (amend, + its CCR-QD-198 amendment — a description's `attributes` gains `ask`, the question of a formed request; `disclose` takes the port's own answer for all five ports, which reopens ARCH-21's decided D-21-c)
  - ADR-QD-107 (amend — `PortWire` loses `spanQuestion`/`spanAnswer` and `PortWireSpan`, so "the wire is not the span" becomes true of the type; a served read is the same reader with `qadi.interpreter = "remote"`)
  - ADR-QD-051 (constraint + amend — span names, keys, values and write order are unchanged and pinned by `Evaluate.test.ts`'s exact attribute sets; the one deliberate observable change is D-46-d, the `qadi.requireScopedResourceId` child span)
  - ADR-QD-073 (constraint — UNTRACED_BUDGET unchanged, no `Effect.fnUntraced` added; the "requireScopedResourceId was considered and rejected" sentence is amended under D-46-d; benchmark first, which is T3–T4)
  - ADR-QD-034 / ADR-QD-091 (constraint — measurement habit; vitest module-getter artefact; hoisted dispatch)
  - ADR-QD-076 (constraint — Stryker `ignoreStatic`: no decision may sit in a module-scope initializer)
  - ADR-QD-037 (constraint — madge: `PortAccess.ts` keeps importing port modules, never the reverse)
packages: [core]   # @qadi/devtools and @qadi/http are verify-only (their suites must pass unchanged)
estimate: L   # T0–T2 ≈ ½ day (defect + doc path, ships alone); T3–T4 bench ≈ 1 day; T5–T9 ≈ 2 days; T10–T12 ≈ 1 day
---

# ARCH-46 — One port-read module behind the port description

## 1. Verified evidence (at `b655b3b`)

Every claim below was re-read on `main` at `b655b3b`. Throwaway probes are under
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-46/`
(ephemeral; each row says how to re-run it). Line numbers are hints. The symbols are what to look for.

### 1.1 The review's claims

| # | Claim | Verdict | How it was settled |
| - | ----- | ------- | ------------------ |
| R1 | `servedBody` (`PortAccess.ts`, ~:461) is already a generic read over a description: it annotates the question, counts, calls `d.invoke`, applies `catchPortDefect(d.defect)` and annotates the answer. | **CONFIRMED** | Read `servedBody` (:461–478) and `servePortRead` (:500–504). It is an unnamed `Effect.fn` body under `Effect.withSpan(d.span)`. |
| R2 | The evaluator and translator reads restate that pipeline five times: `resolveAttribute` ~:173, `callHasActed`/`askActed*` ~:235–310, `askRelationship` ~:359, `askCustom` ~:398, `askSignature` ~:428. | **CONFIRMED** | Read each one. That is six bodies counting `servedBody`, plus `callHasActed` as the shared tail of the two acted reads. All six repeat the same steps: annotate the question, (precondition), count, call through `catchPortDefect(<port>Port.defect(...))`, annotate the answer. |
| R3 | The metric is chosen three ways: `countFor(interpreter)` (:140, used :186 and :242), a hard-coded `Metric.update(portCallsTotal, …)` (:380, :409, :447), and `servedPortCallsTotal` (:471). The three sibling metrics are a function of `PortInterpreter`, but that function is stated nowhere. | **CONFIRMED** | `grep -n "Metric.update\|countFor" packages/core/src/PortAccess.ts`. `PortMetrics.ts` declares the three metrics, and no table maps an asker to its series. |
| R4 | The args→span-question projection is written twice per port: once as a typed literal at each `annotateQuestion` call (:181, :265, :293, :370, :404, :436), and once as the loosely typed `wire.spanQuestion` (`PortWireSpan`, `PortWire.ts` ~:141) that the served path uses. This sits on the wire, although `PortWire.ts` says "the wire is **not** the span". | **CONFIRMED**, worse than stated | `PortWire.ts` :14–16 (the "not the span" header), :141 (`PortWireSpan = { [prop: string]: SpanValue \| undefined }`), :165–166. The five `portWire({… spanQuestion, spanAnswer })` calls are in `AttributeResolver.ts`, `DecisionHistory.ts`, `RelationshipResolver.ts`, `CustomPredicate.ts` and `SignatureHistory.ts`. **Probe (`typo/`):** changing `attributeWire.spanQuestion` to return `{ subjectID, atribute, scope: 7 }` (misspelled keys plus another port's key) **typechecks** (`tsc exit=0`), and `encodeSpan` silently drops unknown keys at runtime. Today only `PortServe.test.ts`'s literal-key assertions catch it. |
| R5 | One resource-id rule has three spellings: `requireResourceId` (:220), an inline copy in `askRelationship` (:377), and `typeof rawResourceId === "string"` at :298, :374 and :442. | **CONFIRMED**, plus a drift | Read all three. **New:** `requireResourceId` is `Effect.fn("qadi.requireScopedResourceId")`, so a resource-scoped acted read and a resource-scoped signature read each open a **child span** named `qadi.requireScopedResourceId`, and the relationship read (inline copy) opens none. The three spellings have already drifted observably. No test pins the child span (`grep -rn requireScopedResourceId packages/*/test features` → nothing). |
| R6 | A policy decision leaks into a port read. `askSignature` matches meaning and signer role (:452), so the signature description's span outcome is `SignatureAnswer` rather than the port's answer. The served path writes `spanAnswer: () => ({})`, while the evaluator path writes matched/onFile. | **CONFIRMED** (one detail **CHANGED**) | `askSignature` :452–457, `signatureSpan.disclose: (outcome: SignatureAnswer) => …` and `signatureWire.spanAnswer: () => ({})` in `SignatureHistory.ts`. The detail: the evaluator writes only `qadi.matched`. `onFile` is never on the span (ARCH-21's non-goal, `SignatureAnswer`'s doc). The match living in `PortAccess.ts` is a **decided** choice (ARCH-01 D-01-b, ARCH-21 D-21-c), not drift. |
| R7 | Tests: `PortServe.test.ts` is one loop over the registry, and `PortAccess.test.ts:109–200` is five hand-written cases. | **CONFIRMED** | `PortServe.test.ts` `CASES: { [K in PortName]: Case<K> }` (:42) and `RUN` (:143). `PortAccess.test.ts` "a read's defect error is its port description's" (:109–199) has five `it.effect`s. |
| R8 | The proposal: one generic `readPort(d, interpreter, args, judge?)` behind `withSpan(d.span)` owns the span, the metric, the defect mapping and both annotations. The typed args→question projection moves onto `d.attributes` beside `disclose`. | **CHANGED**: right direction, wrong signature in two places | (a) **Args alone cannot carry the question a failed request asked.** ADR-077 decided that "the span's question must be annotated before the resource-id requirement can abandon the call" (BEH-QD-227). `Evaluate.test.ts`'s observability suite pins it exactly: "a missing resource id leaves a span naming the relation" (`deepStrictEqual` of the attribute set), and the signature analogue "…with no resource id still names what it asked". A resource-scoped acted question without an id has **no** `ActedQuery` form, because `resourceId: undefined` *means* scope `Any`. (b) **Args do not carry `qadi.meaning`/`qadi.signer_role`.** They are the leaf's requirement, not the port's question (`signatureWire.spanQuestion` has neither, by design). (c) **`withSpan` is unnecessary.** A per-port named `Effect.fn(d.span)`, built once at module scope, keeps the evaluator's span mechanism byte-identical. See D-46-a, D-46-b and D-46-e, and the spike in §1.3. |

### 1.2 Found while planning

| # | Finding | Verdict | How it was settled |
| - | ------- | ------- | ------------------ |
| N1 | **Defect: a served read of an adapter that throws synchronously from its method body dies.** `servedBody` calls `d.invoke(shape)(...args)` directly in the generator, so a throw raised while the method *builds* its Effect escapes `catchPortDefect`. `servePortRead` defects. `answerRemotely`, whose doc says it "**Never fails**", defects too, so a host's port route answers with a router 500 instead of the reply union's `Unavailable` (503). This breaks BEH-QD-261 ("a throw … MUST convert") and BEH-QD-332. The evaluator path is safe because `AttributeResolver.use(r => r.resolve(…))` runs the callback inside an Effect. | **CONFIRMED** (medium: a contract break and a 500 in place of a 503; fail-closed, never a grant) | `probe-throw.mts` (run: `node --experimental-strip-types --no-warnings probe-throw.mts`) with `scriptedPort(PORTS.AttributeResolver, () => PortReply.throw(new Error("sync boom")))`: `readAttribute` → `Fail(AttributeResolveError)`; `servePortRead` → **`Die(Error: sync boom)`**; `answerRemotely` → **`Die`**; the same store with `PortReply.die` → `Success {"_tag":"Unavailable"}`. `PortServe.test.ts` covers `fail` and `die` but not `throw`, which is why it was missed. → **T1**. |
| N2 | `PortMetrics.ts` has a dangling doc comment. The block that documents `PredicatePortName` ("The two ports `toPredicate` reads … a proper subset of PortName") sits directly above `servedPortCallsTotal`'s own block (:144–152 then :153–163), so `PredicatePortName` (:171) has no doc and an IDE shows the wrong text. | **CONFIRMED** (docs, low) | Read `PortMetrics.ts` :144–171. → **T2**. |
| N3 | `servePortRead`'s doc says the span name "is the description's, which an `Effect.fn` name cannot be (it is static)". That is misleading: `Effect.fn(name)` takes a runtime string, and every evaluator read already passes `<port>Port.span`. The real constraint was that `servePortRead` is generic per *call*, which a reader table built once per port removes. | **CONFIRMED** (doc) | `node_modules/effect/src/internal/effect.ts` `fn`/`makeFn` (:1288–1365): the name is read from `arguments[0]` at definition and `useSpan(name, …)` runs per call. → removed with the function in T7. |
| N4 | `PortWireSpan`, `PortWire.spanQuestion`/`spanAnswer`, `PortSpanAttributes<Q, Ans, O>` and `SignatureAnswer` are public (`index.ts` does `export * from "./PortWire.ts"` and `"./PortSpan.ts"`) but **unreleased**: they arrived after 0.11.0 and are listed in the pending `.changeset/a-port-is-answered-remotely.md` and `.changeset/port-span-attributes.md`. `packages/core/CHANGELOG.md` has no entry for either. | **CONFIRMED** | `grep '"version"' packages/core/package.json` → `0.11.0`; `ls .changeset`; `grep -n "PortWire\|PortSpanAttributes" packages/core/CHANGELOG.md` → nothing. The type changes in this plan therefore ride the pending breaking minor at no extra cost, **provided no release ships first** (§9). |
| N5 | No website page or runnable spec example names `spanQuestion`, `spanAnswer`, `PortWireSpan`, `requireScopedResourceId` or `PortSpanAttributes`. | **CONFIRMED** | `grep -rln "spanQuestion\|PortWireSpan\|requireScopedResourceId\|PortSpanAttributes" apps/website/src spec --include='*.md'` → only `spec/overview.md:278` and ADRs. |
| N6 | Every other caller of `d.invoke` (`PortDerivation.ts`'s wrappers, devtools' `Capture.ts`) calls it inside the *outer* port method, so a synchronous throw propagates out of that method. That is safe exactly when the outermost reader wraps the call in an Effect, which N1's fix does once for every wrapper stack. | **CONFIRMED** (no further defect) | Read `PortDerivation.ts` `boundedPort` (:195–209) and the `around` wrapper (:148), and `Capture.ts` `capturing` (:96–101). |

### 1.3 Spike (validates D-46-a/b/e typing and that nothing observable moves)

`spike/` is a copy of `packages/core/{src,test,bench}` with `node_modules` symlinked. It made these changes:
`PortSpanAttributes<Q, Ans, A, Args>` with `ask: (args) => …` and `disclose: (answer: A) => …`. Each port module gained an
`ask` (moved from its `wire.spanQuestion`), and the signature `disclose` became `(_: ReadonlyArray<Signature>) => ({})`.
A new `PortRead.ts` holds `makeReader(d)`, which builds one `Effect.fn(d.span)` per port at module scope. Next to it are
`READERS: { [K in PortName]: Reader<K> }`, `CALLS_METRIC: { [I in PortInterpreter]: Metric }` and
`AskerOf<K>` (translation may read only `PredicatePortName`), the draft
`Result<Args, Unformed<Question, X>>`, and a hoisted `signatureJudgement`. `PortAccess.ts` was rewritten as request
formers over `READERS` with a single `scopedTo` resource-id rule.

- `packages/core/node_modules/.bin/tsc -p tsconfig.json` (tsgo 7.0.2) → **exit 0, no `as`, no `any`**. The indexed
  lookup `READERS[d.port]` typechecks as `Reader<K>` for a generic `K`. An earlier attempt that bound
  `PortDescription`'s `Span` parameter to `PortSpanAttributesLike<Args, A>` broke `DescriptionOf<K>`'s correlation
  (TS2344 in `Ports.ts`) and was reverted. **The constraint stays unparameterised.** Generic code reaches `ask` only through
  `makeReader`, which is called with concrete descriptions.
- `../../node_modules/.bin/vitest run` in `spike/packages/core` → **1831 of 1832 core tests pass unchanged.** That includes
  `Evaluate.test.ts`'s exact span attribute sets (both MissingResourceId spans and the three signature spans),
  `Predicate.test.ts`, `PortAccess.test.ts`, `PortServe.test.ts`, `PortConformance.test.ts`, `PortsLayer.test.ts` and
  `PortRemote.test.ts`. The single failure is `PortSpan.test.ts`'s signature round trip, which calls
  `signatureHistoryPort.attributes.disclose({ matched, onFile })`. That is the intended move (T9).
  **Use the repo-root vitest binary** (`node_modules/.bin/vitest`). The package-local one fails every file with
  "Cannot read properties of undefined (reading 'config')", a peer-instance mismatch.
- The `probe-throw` probe against the spike: `servePortRead` + Throw → `Fail(AttributeResolveError)`,
  `answerRemotely` → `Unavailable`. N1 is fixed by the reader's `Effect.suspend`.
- **Typo guard, negative result.** Neither an inferred `ask`, a `portSpan(...)` builder, a direct mapped return type
  nor `NoInfer` made `({ subjectId, atribute: attribute })` a compile error (`tsc exit=0` each time). TypeScript does
  not excess-check an object literal returned from an arrow whose target is all-optional, and the standalone
  `ts/a.ts` probe confirms it. A wholly wrong object *is* refused (weak-type detection). **So the key-typo guard is a
  conformance law (T9), not a type.**
- **Orientation timing** (not the gate). `harness.mts` runs A (repo), A′ (a byte copy) and V (the spike),
  interleaved, 9 rounds × 250 ms, with live ESM bindings (`node --experimental-transform-types`), load 4–7:

  | Workload | A/A′ | V/A (3 sessions) |
  | -------- | ---- | ---------------- |
  | resolver miss (`hasAttribute`, one port call) | 0.97–1.02 | 1.006, 1.007, 1.020 |
  | `hasSignature` Any (judged read) | 0.99–1.02 | 1.089, 1.067, 1.062 → after hoisting the judgement: 1.102, 1.025 |

  The resolver miss is inside the noise band. The judged signature read is plausibly 2–10% slower, which is too noisy
  to call either way. That is exactly what T3–T4's gate exists to settle before anything converts.

## 2. Goal and success criteria

**Goal.** Make `PortAccess.ts` a **deep** module. Today its interface is six read functions, and each one
restates the same implementation: span, call metric, defect mapping, and the question and answer annotations. The
served path restates it a seventh time through a second, loosely typed projection that lives on the wire. After this
plan the module holds **one generic read per port**, built once from the port's description: a named `Effect.fn(d.span)`
that owns the span, picks the call metric from the asker (a closed table), forms nothing, maps a defect (including a
synchronous throw) to the port's typed error, and annotates the question and the answer through the description. The
per-port functions shrink to **request formers**. Each states only what is genuinely its own: the subject-first lookup,
the one resource-id rule, the depth clamp, and, for `hasSignature`, a hoisted judgement that adds the requirement to
the question and `qadi.matched` to the answer inside the span. The **seam** between "how a port is asked" and "what a
port's span says" moves onto the description (`attributes.ask` beside `disclose`), so the wire **adapter** keeps only
the wire. **Leverage:** a sixth port gets the evaluator, translator and served reads by adding one reader-table row.
**Locality:** the next metric, defect or span rule is one edit.

**Success criteria** (each checkable):

1. A served read whose adapter throws synchronously is a typed error, and `answerRemotely` replies `Unavailable`
   (`PortServe.test.ts` "a store that throws" for all five ports; `PortRemote.test.ts`). Ships first (T1).
2. `grep -c "annotateCurrentSpan" packages/core/src/PortAccess.ts` is **2** (question and answer, both inside the
   generic reader). `grep -c "Metric.update" packages/core/src/PortAccess.ts` is **1**. `grep -c "catchPortDefect(" …`
   is **1** call site plus its definition.
3. `grep -rn "spanQuestion\|spanAnswer\|PortWireSpan" packages/*/src` → nothing. `PortWire` has no span member.
4. Exactly one resource-id rule: `grep -n 'typeof rawResourceId' packages/core/src/PortAccess.ts` → **1** line (inside
   `scopedTo`).
5. **No observable span change** beyond D-46-d. `Evaluate.test.ts`'s "observability" suite, `Predicate.test.ts`'s
   literal-key assertions, `features/features/port-calls/*`, and devtools' `PortCalls.test.ts`,
   `ServicesPanel.test.tsx` and `DevtoolsDock.test.tsx` pass **without edits**.
6. The asker→metric function is stated once (`PORT_CALLS_BY_ASKER`, in `PortAccess.ts`, out of the barrel) and is pinned by one
   registry-loop test per asker. A translator read of a non-predicate port is a compile error (tstyche).
7. `PortAccess.test.ts`'s five hand-written defect cases and `PortServe.test.ts` are **replaced** by one
   `PortRead.test.ts` loop over (port × asker). The test count may go up. The hand-written cases go.
8. T4's bench gate says GO under D-46-f's rule, and T10 re-confirms it on the branch. The figures are recorded in §10
   and the PR.
9. `UNTRACED_BUDGET` and `SWITCH_BUDGET` are unchanged. `node scripts/check-house-style.mjs` and `pnpm circular` are
   clean. `pnpm check` is green, including Stryker on `packages/core` at ≥ 80%.

## 3. Non-goals

- **Merging `PortSpan*`/`PortInterpreter`/`PortWire*` modules.** That is ARCH-55. This plan removes members from them
  and adds no module (`readPort` and the readers live **inside** `PortAccess.ts`, not in a new `PortRead.ts`; the spike's
  file name was for isolation only).
- **Deriving `PredicatePortName` or a resource-id requirement from a leaf table.** That is ARCH-51. This plan uses
  `PredicatePortName` as it stands (through `AskerOf<K>`) and writes the *rule* "a scoped question needs a string id"
  once. ARCH-51 may later decide *which* leaves need it.
- **Changing what any span says.** Names, keys, value types and write order are fixed by ADR-051 and BEH-QD-227. The
  only exception is the empty child span in D-46-d.
- **Putting `onFile` on the span, or changing `SignatureAnswer`.** ARCH-21's non-goal stands.
- **Moving the signature match into `Walk.ts`** (the review's suggestion) is weighed in D-46-c, not assumed.
- **The devtools Services panel reading `qadi_port_served_calls_total`.** That is ARCH-31's recorded follow-up and is not touched.
- **Untracing anything.** No read joins `UNTRACED_BUDGET`. Every port read keeps a named span (ADR-051, ADR-073).

## 4. Constraints

| Constraint | Consequence here |
| ---------- | ---------------- |
| AGENTS.md §1 imports | Namespace `effect/*` imports. Relative `.ts`. `import type` for type-only (the readers' types). |
| AGENTS.md §4 never `Effect.orDie`; failure is not denial (INV-QD-006) | A defect **and a synchronous throw** become the port's own typed error on every asker. That is N1's fix, made once in the reader (`Effect.suspend` around `d.invoke(shape)(...args)`, then `catchPortDefect(d.defect)`). |
| AGENTS.md §5 `Effect.fn` and `UNTRACED_BUDGET` (ADR-073) | Each reader is a **named** `Effect.fn(d.span)`, as each read is today. No `Effect.fnUntraced` is added, so `UNTRACED_BUDGET` is unchanged. The request formers are plain functions returning the reader's Effect, with `readAttribute` and `walk` as precedent. They open no span, because the reader's span *is* the read's span and a second named wrapper would double it (ADR-077 §"One module per concern"). The §5 paragraph that lists "the port reads in `PortAccess.ts`" is reworded (T11). |
| AGENTS.md §5a `Match`, `SWITCH_BUDGET` | No `switch`. The asker→metric choice is an own-property `Record<PortInterpreter, Metric>` table (the ARCH-12 law-table shape). The draft is a `Result`, so the reader branches with `Result.isSuccess` rather than on a `_tag`. |
| AGENTS.md §6 forbidden (`as`, `any`, `!`) | The spike compiled with none. One caveat: the spike used `"Any" as const` in two `ask` projections. Write `scope` through a typed local or a `satisfies` instead, since `as const` is tolerated in this codebase (`sharedQuestionKeys`) but not needed. |
| AGENTS.md §9 barrels, ADR-099 | `PortAccess.ts` stays out of the barrel. Nothing new is exported from a barrelled module. **`PortSpan.ts` and `PortWire.ts` are barrelled (`export *`)**, so their type changes are public: gate 13 rows (T11). The signature judgement must **not** go in `SignatureHistory.ts`, which is barrelled, or it becomes public API (D-46-c). |
| AGENTS.md §11 spec is normative | BEH-QD-227/261/332, INV-QD-044 and the ADR amendments land in the same change (T11). |
| ADR-051 / BEH-QD-227 | Names and keys unchanged. The question is annotated **before** a precondition can abandon the call, and the answer after. `qadi.interpreter` is on every port span. `qadi.attempts` is still written between them by the retrying wrappers, which are untouched. |
| ADR-077 D-01-b (decided) | The function that owns the span runs the precondition. Here that is the reader running a `Result` draft that the request former built. |
| ARCH-21 D-21-c (decided) | Reopened by D-46-b. If D-46-b is not A, the description keeps `disclose: (O)`. |
| `no-port-span-key-literals` (house style) | No `"qadi.<key>"` literal in `PortAccess.ts`. `qadi.requireScopedResourceId` is a span *name* and disappears under D-46-d A anyway. |
| `PORT_DOUBLE_BUDGET` (ADR-094) | Tests script broken ports with `scriptedPort` (`PortReply.fail/die/throw`). No hand-built port error is added to a test. |
| ADR-076 Stryker `ignoreStatic` | The reader table and metric table are module-scope initializers, so mutants there are skipped. **Put no decision in them.** The metric is chosen by a table *lookup* inside the reader body (mutable and killed by the per-asker metric test), and `scopedTo`'s `typeof` lives in a function body. |
| ADR-037 madge | `PortAccess.ts` → port modules and `PortMetrics.ts`, as today. No port module imports `PortAccess.ts`. Run `pnpm circular`. |
| Gate 13 (`check-api-surface.mjs`) | Removing the `PortWireSpan` export means removing it from `spec/overview.md:278`'s row, or the gate fails. |
| Releases | Changesets only. A version PR or publish needs the user's explicit go-ahead (standing instruction since 2026-10-06). |

## 5. Decisions needed before work starts

### D-46-a — What a generic read takes as its request

The review proposed `readPort(d, interpreter, args, judge?)`. §1 R8 shows that args alone cannot carry the question a
failed request asked, and BEH-QD-227 plus `Evaluate.test.ts` pin that question exactly.

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| **A. A draft: `Result<Args, Unformed<Question, X>>`** | A request former returns either formed args or `{ asked, error }`, where `asked` is the question an unformed request was trying to ask (typed against the description's question struct) and `error` is `MissingResourceId`. The reader annotates `Result.isSuccess(draft) ? d.attributes.ask(args) : draft.failure.asked`, then fails if unformed. `X` is inferred `never` for the three reads that cannot fail to form, so `readAttribute`'s and `askActedAny`'s error types do not widen. | The success-path question is stated **once**, on the description, and the served and evaluator paths share it. The failure-path question is written only by the one function that knows what an unformed request meant. That is three short typed literals: acted-resource, relationship and signature-resource. Spike-proven (§1.3). | Three small question literals remain, in failure branches only. |
| B. Explicit question plus `Result<Args, X>` at every call | Each request former passes its full question literal, and the served path uses `ask`. | Simple. | Keeps today's duplication (R4) for the success path, which is the half the review was about. |
| C. Args only (review) | `readPort(d, interpreter, args)` | Smallest interface. | Cannot express BEH-QD-227's MissingResourceId span or signature's requirement fields. **Refuted** by `Evaluate.test.ts` (§1 R8). |

**Recommendation: A.** `status: open`

### D-46-b — How the signature judgement reaches the span (reopens ARCH-21 D-21-c)

Today `signatureHistoryPort.attributes.disclose` takes `SignatureAnswer`, not the port's answer, and that mismatch is
the only reason the wire needed a second answer projection (`spanAnswer: () => ({})`).

| Option | What changes | For | Against |
| ------ | ------------ | --- | ------- |
| **A. `disclose` takes the port's own answer for all five ports. A judgement carries the leaf's own disclosure.** | `PortSpanAttributes<Q, Ans, A, Args>`: `ask(args)`, `disclose(answer: A)`. The signature port's `disclose` is `() => ({})`, which is honest: a list of signatures discloses nothing on its own, and that is exactly what the served span says today. A **judgement** `{ asked(req), decide(answer, req), disclose(outcome) }`, hoisted and typed against the signature span structs, adds `meaning`/`signerRole` to the question and `matched` to the answer inside the same span. The generic reader always applies a judgement. For four ports, and for every served read, it is the description's own (`asked: () => {}`, `decide: identity`, `disclose: d.attributes.disclose`). | One answer projection per port, on the description. The served path needs nothing special. The `O` type parameter disappears from a public type. INV-QD-044's home for attribute values is unchanged, because the attribute port has no judgement. Spike-proven. | Reopens a decided D-21-c. INV-QD-044's wording becomes "a description's `disclose`, or the signature judgement's, is the only path from an outcome to a span". |
| B. Keep D-21-c (`disclose: (O)`). Add `answered: (answer: A) => …` beside it. | The wire's `spanAnswer`, moved onto `attributes`. | Leaves D-21-c intact. | Two answer projections on every description, four of them identical. This is the duplication again, one floor up. |
| C. Move only the question projection. Keep `spanAnswer` on the wire. | Half the change. | Smallest diff. | Leaves "the wire is not the span" false (R4) and `PortWireSpan` public. |

**Recommendation: A.** `status: open`

### D-46-c — Where the signature judgement lives

| Option | For | Against |
| ------ | --- | ------- |
| **A. `PortAccess.ts`, as a module-private hoisted constant beside `askSignature`** | Consistent with the decided ARCH-01 D-01-b and ARCH-21 D-21-c ("the match stays in `PortAccess.ts`"). `Walk.ts`'s `evaluateHasSignature` is unchanged (same `askSignature(subject, meaning, signerRole, scope, rawId)` call). `Walk.ts` learns no span vocabulary. Package-private by construction. | The match is `hasSignature` semantics living in the port-read module, as it does today. |
| B. `Walk.ts` supplies it (the review) | The match sits beside the other leaf verdicts (`evaluateActed`'s `answer === wanted`). | `Walk.ts` then names span fields (`meaning`, `signerRole`, `matched`) through the judgement's types. That contradicts D-01-b, which put question forming in `PortAccess.ts` so neither interpreter spells a span. It also touches ARCH-51's file. |
| C. `SignatureHistory.ts`, exported | The `qadi.matched` struct is declared there. | The module is barrelled (`export *`), so this becomes public API with a gate-13 row for an internal judgement. ARCH-52 is also editing this module. |

**Recommendation: A.** `status: open`

### D-46-d — The `qadi.requireScopedResourceId` child span

Today it opens under resource-scoped acted and signature reads but not relationship reads (§1 R5). One rule needs one
behaviour.

| Option | Observable effect | For | Against |
| ------ | ----------------- | --- | ------- |
| **A. Drop it: the rule is a plain function inside the reader's span** | A tracer stops seeing an empty child span under `qadi.acted`/`qadi.hasSignature` for resource-scoped reads. The parent port span already fails with `MissingResourceId` and carries the question (BEH-QD-227). | It carries no attribute and records no I/O, so ADR-051's reason for a span ("a span says what was asked") does not apply: the parent says it. One `new Error()` and one span less per resource-scoped read. No test pins it. | It is an observable change for a tracer, so ADR-051/073 get an amendment line and the changeset names it. |
| B. Keep it on all three | Relationship reads gain the child span. | Nothing removed. | Adds an empty span on a third path, also observable. ADR-073 kept it only because nobody had measured. |
| C. Keep the drift | — | — | Two spellings of one rule must remain, which defeats R5. |

**Recommendation: A.** A test then pins the span set of a resource-scoped read (T9). `status: open`

### D-46-e — The span mechanism of the generic read

| Option | For | Against |
| ------ | --- | ------- |
| **A. One named `Effect.fn(d.span)` reader per port, built once at module scope (`READERS: { [K in PortName]: Reader<K> }`)** | The evaluator's hot path keeps exactly today's mechanism: a named `Effect.fn` whose name is the description's `span`, as `resolveAttribute` is now. The served path gains the same named span in place of `withSpan` over an unnamed fn. Generic access is `READERS[d.port]`, which typechecks as `Reader<K>` with no cast (§1.3). | Five table rows. A sixth port adds a row (TS2741 if missing, and the leverage the review asked for). |
| B. `Effect.withSpan(d.span)` over one unnamed `Effect.fn` per call (the review, and today's served path) | One function, no table. | Changes the hot path's mechanism (ADR-051 measured ≈2.1 µs for "having a separate effectful function" and ≈1.8 µs for the span). It would need T4 to show parity on the resolver miss, for no locality gain over A. |

**Recommendation: A.** T4 still measures it, because the read body changes (draft, judgement, table lookup).
`status: open`

### D-46-f — The benchmark gate (T4): method, conclusiveness, GO/NO-GO

This follows ARCH-26's D-26-a, which this repository already accepted (ADR-077 addendum, CCR-QD-192). That protocol
sized its rule for a sub-1% effect. Here a port read is I/O-bound in production, and the resolver miss is ADR-051's
upper bound.

| Option | Rule |
| ------ | ---- |
| **A. D-26-a's protocol, port workloads, a 5% budget** | **Variants:** A (branch point), A′ (byte copy, noise control), V (the change as T5–T7 will land it, generated in scratch). **Methods**, both interleaved with rotating order: M1 is the in-process harness with live ESM bindings (`node --experimental-transform-types harness.mts`, 9 rounds × 250 ms); M2 is paired vitest (`bench.compare`, `time: 300`, `warmupTime: 100`) with the **repo-root** vitest binary. **Workloads:** T3's port-read set plus two controls that reach no port (`one node`, `wide — allOf of 8`). **Conclusive** iff A/A′ is within ±5% on every workload in both methods. **GO** iff, on a conclusive session, every port workload has V/A ≤ 1.05 by both methods **and** `resolver miss — evaluate` has V/A ≤ 1.03. If only the judged signature workloads fail, apply the hoisted-judgement tuning (already in the spike) and re-run once. **NO-GO** (or two inconclusive sessions): T5–T9 do not land, and T1, T2 and T3's workloads still do. Record the figures in §10 and an ADR-077 addendum. Advisory start condition: `uptime` load < 4. |
| B. Orientation only | §1.3's numbers are the evidence. | Rejected. The review and ADR-073 ask for a measurement, and the signature path is not obviously inside noise. |
| C. ARCH-26's tighter 1–3% bands | Sized for a pure per-node stepper, which this is not. | Too strict for a per-port-call change. ARCH-26 ended in DROP because the A/A band never got that tight on this machine. |

**Recommendation: A.** `status: open`

## 6. Tasks

### T0 — Re-verify the evidence at the branch point
- **Status:** [ ] todo
- **Depends on:** —
- **Files:** none (read-only)
- **Steps:**
  1. `git log --oneline -1` and record the SHA in §10. If it is not `b655b3b`, check whether ARCH-51, ARCH-52,
     ARCH-55 or ARCH-56 has landed: `git log --oneline b655b3b..HEAD -- packages/core/src/PortAccess.ts packages/core/src/PortWire.ts packages/core/src/PortSpan.ts packages/core/src/PortMetrics.ts packages/core/src/SignatureHistory.ts`.
     If one has, re-read §9's overlap row for it before going on.
  2. Re-run each §1 row's command. In particular:
     `grep -n "Metric.update\|countFor\|annotateQuestion\|typeof rawResourceId\|requireScopedResourceId\|spanQuestion\|spanAnswer" packages/core/src/PortAccess.ts packages/core/src/Port*.ts packages/core/src/*Resolver.ts packages/core/src/*History.ts packages/core/src/CustomPredicate.ts`.
  3. Recreate N1's probe (§1.2 gives the script shape) and confirm `servePortRead` + `PortReply.throw` → `Die`.
  4. `ls .changeset/a-port-is-answered-remotely.md .changeset/port-span-attributes.md` and
     `grep '"version"' packages/core/package.json`. If 0.12.0 (or any release carrying ARCH-31/21) has shipped, N4 no
     longer holds, and T8's and T5's type removals become a **published** break. Say so in the changeset (T11).
- **Tests:** none.
- **Verify:** the commands above. `pnpm vitest run packages/core/test/PortServe.test.ts packages/core/test/PortAccess.test.ts` is green at the branch point.
- **Done when:** §10 has a row naming the SHA and every §1 verdict that changed.

### T1 — Defect: a served read of a synchronously throwing adapter is the port's typed error (patch, test-first)
- **Status:** [ ] todo
- **Depends on:** T0
- **Files:** `packages/core/test/PortServe.test.ts`, `packages/core/test/PortRemote.test.ts`, `packages/core/src/PortAccess.ts`
  (`servedBody`), `packages/http/test/PortRoutes.test.ts` (one case), `spec/behaviors/05-evaluator.md` (BEH-QD-261),
  `spec/behaviors/34-remote-ports.md` (BEH-QD-332), `.changeset/served-port-read-throw.md` (*new*)
- **Steps:**
  1. **Red.** In `PortServe.test.ts`'s `serve` describe, add `it.effect("a store that throws becomes the port's typed error, never a defect", …)`
     with `scriptedPort(d, () => PortReply.throw(new Error("boom"))).layer`. Assert `Result.isFailure` and
     `result.failure._tag === d.failure(c.args, "x")._tag`. It runs for all five registry rows. Confirm all five fail
     with a defect.
  2. **Red.** In `PortRemote.test.ts`, add "a store that throws answers `Unavailable`, and `answerRemotely` never
     fails" for one port per answer kind (attribute and signature are enough; the loop covers the rest). Use
     `CurrentSubject` from the existing helpers.
  3. **Green.** In `servedBody`, replace `d.invoke(shape)(...args).pipe(catchPortDefect(…))` with
     `Effect.suspend(() => d.invoke(shape)(...args)).pipe(catchPortDefect((cause) => d.defect(args, cause)))`, and add a
     one-line comment saying why: "a method that throws while building its Effect must be inside the catch". This is
     the minimal patch. T6 carries the same line into the reader.
  4. In `packages/http/test/PortRoutes.test.ts`, add one case: a throwing store answers status 503 with an
     `Unavailable` body. Today it is a 500 from the router.
  5. BEH-QD-261: add "on every asker — the evaluator, the translator and a served read" and "a throw raised while the
     method builds its Effect". BEH-QD-332: "a store that dies **or throws**". Add Change History rows (CCR-QD-NEXT).
  6. Changeset `served-port-read-throw.md`: `"@qadi/core": patch`. Text: a served port read whose adapter throws
     synchronously now replies `Unavailable` instead of failing the route with a defect.
- **Tests:** steps 1, 2 and 4 (all red first).
- **Verify:** `pnpm vitest run packages/core/test/PortServe.test.ts packages/core/test/PortRemote.test.ts`;
  `pnpm vitest run packages/http/test/PortRoutes.test.ts`; `pnpm typecheck`; `node scripts/check-house-style.mjs`;
  `bash spec/scripts/verify-traceability.sh --strict`.
- **Done when:** the new tests pass, they failed before step 3, and the patch merges on its own (it does not wait for
  D-46-*).

### T2 — Doc defects that ship with T1
- **Status:** [ ] todo
- **Depends on:** T0
- **Files:** `packages/core/src/PortMetrics.ts`
- **Steps:**
  1. Move the dangling block "The two ports `toPredicate` reads — {@link predicatePortCallsTotal}'s closed domain…"
     (above `servedPortCallsTotal`) down to sit directly on `export type PredicatePortName`.
  2. Leave the `servedPortCallsTotal` description string untouched. It is part of the metric's registry key
     (ADR-052) and is pinned by `Ports.test.ts`.
- **Tests:** none (doc only). `Ports.test.ts`'s description pin must still pass.
- **Verify:** `pnpm vitest run packages/core/test/Ports.test.ts`; `pnpm typecheck`.
- **Done when:** each of the two exports carries its own doc comment.

### T3 — Port-read benchmark workloads and the branch-point baseline (before any conversion)
- **Status:** [ ] todo
- **Depends on:** T0
- **Files:** `packages/core/bench/PortRead.bench.ts` (*new*)
- **Steps:**
  1. Add `PortRead.bench.ts` in the `Evaluate.bench.ts` style (`test("port reads", async ({ bench }) => bench.compare(…))`,
     `{ time: 1000, warmupTime: 300 }`), with **ten workloads**. Each is built on a `ManagedRuntime` with fixture
     ports (`attributeResolverFromRecord`, `decisionHistoryFromEvents`, `relationshipResolverFromEdges`,
     `customPredicateFromRecord`, `signatureHistoryFromSignatures`):
     1. `resolver miss — evaluate` (the same as `Evaluate.bench.ts`'s);
     2. `resolver miss — toPredicate` (`toPredicate(hasAttribute(…))` with the attribute off the subject);
     3. `acted Any — evaluate`; 4. `acted Resource — evaluate`;
     5. `relationship — evaluate`; 6. `custom — evaluate`;
     7. `signature Any — evaluate`; 8. `signature Resource — evaluate`;
     9. `served attribute` (`answerRemotely(PORTS.AttributeResolver, …)` with `CurrentSubject`);
     10. `served signature`.
     The controls are `one node` and `wide — allOf of 8`, taken from `Evaluate.bench.ts` as they are.
  2. Write the M1 harness **in scratch** (`$P/harness.mts`, not in the repo). It runs the same ten workloads plus the
     controls over three source roots (A, A′ and V), interleaved, with rotating and reversed order. §1.3's
     `harness.mts` is the starting shape. Load each root's `index.ts` through `--experimental-transform-types`, which
     handles the parameter properties that `--experimental-strip-types` rejects.
  3. Run `pnpm bench` once on the branch point and paste the ten rows into §10 for orientation. Absolute numbers move
     about 30% between runs (AGENTS.md §5a).
- **Tests:** none (benchmarks are not a gate).
- **Verify:** `pnpm vitest bench --run packages/core/bench/PortRead.bench.ts` completes. If the reporter prints
  nothing when stdout is not a TTY, add `--outputJson $P/bench.json`.
- **Done when:** the file is committed and §10 has the baseline rows.

### T4 — The benchmark gate (D-46-f), before conversion
- **Status:** [ ] todo — **blocked on D-46-a, D-46-b, D-46-e, D-46-f**
- **Depends on:** T3, D-46-a/b/e/f
- **Files:** none in the repository. Variants live in scratch (`$P/A`, `$P/A2`, `$P/V`), each a copy of
  `packages/core/src` with `node_modules` symlinked to `packages/core/node_modules`.
- **Steps:**
  1. Build V by applying T5–T7 exactly as decided. §1.3's spike is the starting point: it already has the hoisted
     judgement, `scopedTo`, `READERS` and `CALLS_METRIC`. Confirm `tsc -p` is clean and that core's suite passes on V
     (1831 or more of 1832; the one expected failure is `PortSpan.test.ts`'s signature round trip).
  2. Run D-46-f's session: 6 M2 runs plus 2 M1 runs, recording `uptime` before and after each.
  3. Apply the GO/NO-GO rule. On a judged-signature-only failure, try the documented tuning (no per-call judgement
     allocation, no object spread for an empty `asked`) and run one more session.
  4. Record the decision, the figures and the load in §10. On NO-GO, set this plan's status to `blocked`, file the
     ADR-077 addendum text (T11 step 6) and stop after T11's NO-GO subset.
- **Tests:** none (measurement).
- **Verify:** both methods' A/A′ ≤ 5% on every workload (conclusiveness).
- **Done when:** §10 records GO or NO-GO with figures.

### T5 — The description states the question of a formed request; `disclose` takes the port's answer
- **Status:** [ ] todo — **blocked on T4 = GO, D-46-b**
- **Depends on:** T4
- **Files:** `packages/core/src/PortSpan.ts`, `packages/core/src/PortSpanDecode.ts`, `packages/core/src/AttributeResolver.ts`,
  `packages/core/src/DecisionHistory.ts`, `packages/core/src/RelationshipResolver.ts`, `packages/core/src/CustomPredicate.ts`,
  `packages/core/src/SignatureHistory.ts`, `packages/core/test/PortDescription.test.ts` (probe), `packages/core/test/PortSpan.tst.ts`
- **Steps:**
  1. `PortSpan.ts`: `PortSpanAttributes<Q, Ans, A, Args extends ReadonlyArray<unknown> = never>` with
     `readonly ask: (args: Args) => SpanType<SpanStruct<Q>>` and `readonly disclose: (answer: A) => SpanType<SpanStruct<Ans>>`.
     `PortSpanAttributesLike` gains `ask: (args: never) => SpanType<SpanStruct<SpanFields>>`, and its `disclose`
     becomes `(answer: never) => …`. **Do not** parameterise `PortDescription`'s `Span` bound (§1.3: that breaks
     `DescriptionOf<K>`). `PortSpanRowOf` infers `PortSpanAttributes<infer Q, infer Ans, infer _A, infer _Args>`.
     Rewrite the doc. `O` is gone. The four-ports/`SignatureAnswer` paragraph becomes "the signature port's answer
     discloses nothing; `qadi.matched` is the judgement's (`PortAccess.ts`)".
  2. `PortSpanDecode.ts` `decodePortSpan`: generic over `<Q, Ans, A, Args>`. Callers infer, so devtools'
     `PortCalls.ts` needs no change.
  3. Each port module: add `ask` to its span object, moving the body of its current `wire.spanQuestion` and typing
     the parameter as the port's `Args` tuple. In `CustomPredicate.ts`, move `type CustomArgs` above `customSpan`.
     `scope` for acted and signature: derive it from `resourceId === undefined`, typed with no `as` (a
     `satisfies`-checked local, or a `Schema.Literals` value from the struct's field).
  4. `SignatureHistory.ts`: `signatureSpan.disclose = (_signatures: ReadonlyArray<Signature>) => ({})`. Keep the
     `matched` field in the answer struct, because the judgement writes it. Update the `signatureWire` doc's last
     sentence and `SignatureAnswer`'s doc ("what the `hasSignature` judgement decides … the outcome its `disclose`
     reads").
  5. `PortDescription.test.ts` probe: move `spanQuestion`/`spanAnswer` into `probeSpan` as `ask`/`disclose`.
  6. `PortSpan.tst.ts`: add `expect<PortSpanAttributes<…>>()` assertions that `ask`'s parameter is the port's `Args`
     and that a `disclose` taking `SignatureAnswer` is **not** assignable to the signature port's attributes.
- **Tests:** the existing suites compile. The signature round trip in `PortSpan.test.ts` moves in T9.
- **Verify:** `pnpm typecheck`; `pnpm test:tstyche`.
- **Done when:** typecheck is clean, with `wire.spanQuestion` still present. It is removed in T8.

### T6 — One generic read per port inside `PortAccess.ts`
- **Status:** [ ] todo — **blocked on T4 = GO, D-46-a, D-46-e**
- **Depends on:** T5
- **Files:** `packages/core/src/PortAccess.ts`
- **Steps:**
  1. In `PortAccess.ts` (not in `PortMetrics.ts`, which is barrelled and would make the table public API with a
     gate-13 row), add `export const PORT_CALLS_BY_ASKER: { readonly [I in PortInterpreter]: Metric.Metric<string, unknown> } = { evaluate: portCallsTotal, toPredicate: predicatePortCallsTotal, remote: servedPortCallsTotal }`.
     Its doc says the three sibling series are one function of the asker, stated here once. Exporting it from
     `PortAccess.ts` is safe because the module is out of the barrel (ADR-099), and `PortRead.test.ts` reads it.
     Coordinate the name with ARCH-56 (§9).
  2. In `PortAccess.ts`, add these. They are module-private unless noted; `READERS` is exported for `PortRead.test.ts`
     (the module stays out of the barrel):
     - `type AskerOf<K extends PortName> = K extends PredicatePortName ? Interpreter | "remote" : "evaluate" | "remote"`,
       where `Interpreter` is the existing closed pair. This makes "translation reads only the two ports it folds" a
       type.
     - `interface Unformed<Q, X> { readonly asked: Q; readonly error: X }`.
     - `interface Judgement<Q, Ans, A, R, O> { asked: (requirement: R) => Q; decide: (answer: A, requirement: R) => O; disclose: (outcome: O) => Ans }`.
     - `const makeReader = <N, Self, Shape, Args, A, E, Q, Ans>(d: PortDescription<N, Self, Shape, Args, A, E, PortSpanAttributes<Q, Ans, A, Args>>) => …`.
       It returns `{ read, judged }`. `judged` is **one** `Effect.fn(d.span)(function* <R, O, X>(asker, draft, judgement, requirement) { … })`,
       whose body is:
       1. annotate `encodeSpan(d.attributes.question, { ...asked, ...judgement.asked(requirement), interpreter: asker })`,
          where `asked` is `ask(args)` or `draft.failure.asked`;
       2. `if (Result.isFailure(draft)) return yield* Effect.fail(draft.failure.error)`;
       3. `yield* Metric.update(PORT_CALLS_BY_ASKER[asker], d.port)`;
       4. `const shape = yield* d.service`;
       5. `Effect.suspend(() => d.invoke(shape)(...args)).pipe(catchPortDefect((cause) => d.defect(args, cause)))`;
       6. `decide`;
       7. annotate `encodeSpan(d.attributes.answer, judgement.disclose(outcome))`.

       `read(asker, draft)` is `judged(asker, draft, own, undefined)`, where `own` is a constant built once per reader
       (`asked: () => EMPTY`, `decide: identity`, `disclose: d.attributes.disclose`), so no allocation happens per call.
     - `const READERS: { readonly [K in PortName]: Reader<K> } = { AttributeResolver: makeReader(attributeResolverPort), … }`.
       Omitting a row is TS2741.
  3. Keep `catchPortDefect` exported and unchanged (its cause-matrix tests stay).
  4. The question is written before the precondition and the answer after. This is the order BEH-QD-227 and ADR-051
     require, and the order today's six bodies use.
- **Tests:** the existing suites (T7 rewires the callers). Write `PortRead.test.ts`'s skeleton now (T9) and run it red
  against the old functions where it can.
- **Verify:** `pnpm typecheck`; `pnpm circular`; `node scripts/check-house-style.mjs` (no `switch`, no
  `fnUntraced`, no `"qadi.<key>"` literal).
- **Done when:** `READERS` compiles with no `as`/`any`/`!`.

### T7 — Per-port reads become request formers; the served read is a reader
- **Status:** [ ] todo — **blocked on T4 = GO, D-46-a, D-46-c, D-46-d**
- **Depends on:** T6
- **Files:** `packages/core/src/PortAccess.ts`. `packages/core/src/Walk.ts` changes **only** if D-46-c = B.
  `packages/core/src/Predicate.ts` and `packages/core/src/PortRemote.ts` are unchanged (same signatures).
- **Steps:**
  1. `scopedTo(rawResourceId, relation, formed: (id: ResourceId) => Args, unformed: Question): Result<Args, Unformed<Question, MissingResourceId>>`
     holds **the** resource-id rule: `typeof rawResourceId === "string"`, then `makeResourceId`. Its doc carries
     BEH-QD-227's "annotated before the requirement abandons the call" and notes that `relation` is the event or
     meaning for the acted and signature reads, as today.
  2. Rewrite each export with its signature and error type unchanged:
     - `readAttribute`: the subject-first lookup unchanged, then `READERS.AttributeResolver.read(asker, Result.succeed([subject.id, attribute]))`.
       The doc keeps "a subject hit emits nothing at all".
     - `askActedAny`: `READERS.DecisionHistory.read(asker, Result.succeed([{ subjectId, event, resourceId: undefined }]))`.
     - `askActedForResource`: `read(asker, scopedTo(raw, event, (id) => [{ subjectId, event, resourceId: id }], { subjectId, event, scope: "Resource" }))`.
     - `askRelationship`: `clampRelationshipDepth` (and its two doc blocks) unchanged, then
       `read("evaluate", scopedTo(raw, relation, (id) => [{ …, depth: clamped }], { subjectId, relation, depth: clamped }))`.
     - `askCustom`: `read("evaluate", Result.succeed([name, subject, resource, params]))`.
     - `askSignature` (D-46-c A): a module-private hoisted `hasSignatureJudgement: Judgement<…, SignatureRequirement, SignatureAnswer>`
       with `asked: (r) => ({ meaning: r.meaning, signerRole: r.signerRole })`, `decide` (today's `.some(…)` match plus
       `onFile`), and `disclose: (o) => ({ matched: o.matched })`. Then
       `READERS.SignatureHistory.judged("evaluate", scope === "Resource" ? scopedTo(…, { subjectId, scope: "Resource" }) : Result.succeed([{ subjectId, resourceId: undefined }]), hasSignatureJudgement, { meaning, signerRole })`.
     - `servePortRead(d, ...args)`: `READERS[d.port].read("remote", Result.succeed(args))`. The return type is
       unchanged, and `answerRemotely` is unchanged.
  3. Delete `annotateQuestion`, `annotateAnswer`, `countFor`, `resolveAttribute`, `requireResourceId` (D-46-d A),
     `callHasActed` and `servedBody`, together with N3's misleading sentence.
  4. Rewrite the module doc and the "The reads" banner. The spans are the readers', one per port, named from the
     description. The request formers open none. Nothing joins `UNTRACED_BUDGET`, and why.
  5. If D-46-d = B, make `scopedTo`'s failure path open the child span on all three reads instead (a named
     `Effect.fn("qadi.requireScopedResourceId")` wrapper around the fail), and pin it in T9.
- **Tests:** `Evaluate.test.ts` "observability", `Predicate.test.ts`, `PortServe.test.ts`, `PortRemote.test.ts`,
  `PortsLayer.test.ts`, `features/features/port-calls/*` and devtools' `PortCalls.test.ts` pass **unedited**
  (success criterion 5). The spike shows they do.
- **Verify:** `pnpm vitest run packages/core/test/Evaluate.test.ts packages/core/test/Predicate.test.ts packages/core/test/PortServe.test.ts packages/core/test/PortRemote.test.ts packages/core/test/PortsLayer.test.ts`;
  `pnpm vitest run packages/devtools/test/model/PortCalls.test.ts packages/devtools/test/react/ServicesPanel.test.tsx packages/devtools/test/react/DevtoolsDock.test.tsx`;
  `pnpm --filter @qadi/features test`; then the success-criterion greps:
  `grep -c "annotateCurrentSpan" packages/core/src/PortAccess.ts` (2), `grep -c "Metric.update" packages/core/src/PortAccess.ts` (1),
  `grep -c 'typeof rawResourceId' packages/core/src/PortAccess.ts` (1).
- **Done when:** all of the above pass with zero edits to those test files.

### T8 — The wire keeps only the wire
- **Status:** [ ] todo — **blocked on T4 = GO, D-46-b**
- **Depends on:** T7
- **Files:** `packages/core/src/PortWire.ts`, `packages/core/src/PortWireEncode.ts`, the five port modules,
  `packages/core/test/PortConformance.test.ts`, `packages/core/test/PortDescription.test.ts`, `packages/core/test/PortWire.tst.ts`
- **Steps:**
  1. `PortWire.ts`: delete `PortWireSpan` and the `spanQuestion`/`spanAnswer` members, and the import of `SpanValue`
     if it is now unused. Update the interface doc's bullet list. The module header's "The wire is **not** the span"
     now describes the type. Add: "what a span says is the description's `attributes` (`ask`, `disclose`)".
  2. `PortWireEncode.ts`: drop both members from `PortWireSpec` and from the object `portWire` returns.
  3. The five `portWire({…})` calls lose both lines. `attributeWire`'s and `signatureWire`'s docs drop their span
     sentences.
  4. `PortConformance.test.ts` "the span projection of a question names the subject" becomes
     `d.attributes.ask(c.args)["subjectId"] === aliceId`, and moves to the span block (T9 adds the key-law beside it).
  5. `PortWire.tst.ts`: add `expect<PortWire<…>>().type.not.toHaveProperty("spanQuestion")` (tstyche), so a span
     projection cannot come back to the wire unnoticed.
- **Tests:** steps 4 and 5.
- **Verify:** `grep -rn "spanQuestion\|spanAnswer\|PortWireSpan" packages/*/src packages/*/test` → nothing.
  `pnpm typecheck`; `pnpm test:tstyche`; `pnpm vitest run packages/core/test/PortConformance.test.ts packages/core/test/PortWire.test.ts packages/core/test/PortRemote.test.ts`.
- **Done when:** the grep is empty and the suites are green.

### T9 — Replace the per-read tests with one loop per asker (replace, don't layer)
- **Status:** [ ] todo
- **Depends on:** T7, T8
- **Files:** `packages/core/test/PortRead.test.ts` (*new*), `packages/core/test/PortServe.test.ts` (**deleted**, with
  T1's throw case moving into the new file), `packages/core/test/PortAccess.test.ts` (keep the `catchPortDefect` matrix;
  **delete** "a read's defect error is its port description's"), `packages/core/test/PortSpan.test.ts`,
  `packages/core/test/PortConformance.test.ts`, `packages/core/test/Evaluate.test.ts` (one test added),
  `packages/core/test/PortAccess.tst.ts` (*new*) or an addition to `Ports.tst.ts`
- **Steps:**
  1. `PortRead.test.ts`: `CASES: { readonly [K in PortName]: Case<K> }`, taken from `PortServe.test.ts`'s cases
     (`args`, `answer` = `SECRET` for the attribute port, and the expected `question` keys). For **each port × each
     asker in `AskerOf<K>`** (a mapped `ASKERS` table, so a new asker is a compile error), run each of these through
     `READERS[K]`, with `servePortRead` covering the remote asker:
     - the read opens `d.span` with `qadi.interpreter = asker` and the case's question keys;
     - it never writes `SECRET`;
     - it counts once in `PORT_CALLS_BY_ASKER[asker]`'s series and in neither sibling (`isolatedMetrics`), which kills a
       wrong-table-entry or wrong-lookup mutant;
     - `PortReply.fail("down")` gives `d.failure(args, "down")` (`deepStrictEqual`);
     - `PortReply.die` and `PortReply.throw` give `d.defect(args, cause)`'s tag and fields, and `port.calls` equals `[args]`
       (this replaces the five hand-written defect cases);
     - an unformed draft (`Result.fail({ asked, error })`) annotates `asked`, fails with `error`, does **not** count, and
       does **not** call the port (`port.calls` is empty).
  2. Delete `PortServe.test.ts`. Move its "never in the evaluator's metric" assertion into the loop above. Update the
     traceability rows that name it (T11).
  3. `PortSpan.test.ts`: the signature round trip discloses `{}` through the description, plus a new
     `hasSignatureJudgement` test (through `askSignature`, since the judgement is module-private) asserting
     `qadi.matched` and that `onFile` never appears.
  4. `PortConformance.test.ts`, the **key law** (the guard the type cannot give, §1.3): for every port,
     `Object.keys(d.attributes.ask(c.args))` ⊆ `Object.keys(d.attributes.question.fields)`, and
     `Object.keys(d.attributes.disclose(c.answer))` ⊆ `Object.keys(d.attributes.answer.fields)`.
  5. `Evaluate.test.ts` "observability", pinning D-46-d: a resource-scoped `hasActed` read and a resource-scoped
     `hasSignature` read open exactly `["qadi.evaluate", "<port span>"]` (sorted span names). Under D-46-d = B, assert
     the child span on all three reads instead.
  6. tstyche: `AskerOf<"RelationshipResolver">` excludes `"toPredicate"`, and
     `READERS.RelationshipResolver.read("toPredicate", …)` raises an error.
- **Tests:** as listed.
- **Verify:** `pnpm vitest run packages/core/test/PortRead.test.ts packages/core/test/PortAccess.test.ts packages/core/test/PortSpan.test.ts packages/core/test/PortConformance.test.ts packages/core/test/Evaluate.test.ts`;
  `pnpm test:tstyche`;
  `pnpm exec stryker run --mutate packages/core/src/PortAccess.ts`. Record PortAccess.ts's score in §10. Any surviving
  mutant is a finding, not a number to suppress (ADR-076).
- **Done when:** `PortServe.test.ts` and the five hand cases are gone, the loop covers 5 ports × their askers, and
  PortAccess.ts mutants are killed or recorded with a reason.

### T10 — Re-confirm the gate on the branch
- **Status:** [ ] todo
- **Depends on:** T9
- **Files:** none
- **Steps:**
  1. Re-run one D-46-f session with A = the branch point and V = the branch head (the real code, not the scratch
     variant).
  2. Record the figures in §10 and in the PR description. Following ADR-077's habit, put figures in the PR, not in the
     ADR.
- **Tests:** none.
- **Verify:** the GO rule still holds.
- **Done when:** §10 has the row. If the rule fails here but passed in T4, stop and diagnose the difference between
  the scratch V and the landed code before merging.

### T11 — Spec, ADRs, AGENTS.md, overview rows, changesets
- **Status:** [ ] todo
- **Depends on:** T9 (on NO-GO: steps 1, 6 and 8 only)
- **Files:** `spec/decisions/NNN-a-port-read-is-one-function-over-its-description.md` (*new*, ADR-QD-NEXT),
  `spec/decisions/index.yaml`, `spec/decisions/077-…md`, `094-…md`, `107-…md`, `051-…md`, `073-…md` (amendment blocks),
  `spec/behaviors/30-port-calls.md` (BEH-QD-227 prose), `spec/behaviors/34-remote-ports.md` (BEH-QD-332),
  `spec/invariants.md` (INV-QD-044 Source; INV-QD-006 Source), `spec/traceability.md`, `spec/overview.md` (rows
  :274, :275 and :278, plus Change History), `AGENTS.md` §5, `.changeset/port-read-module.md` (*new*),
  `.changeset/a-port-is-answered-remotely.md` and `.changeset/port-span-attributes.md` (edit)
- **Steps:**
  1. **ADR-QD-NEXT**, "A port read is one function over its description" (Accepted, amends 077, 094, 107, 051, 073).
     Its parts:
     - Context: §1 R1–R6 and N1.
     - Decision: D-46-a…f as decided.
     - Measured: T4/T10 ranges.
     - Alternatives: the review's `withSpan` with args only (refuted by BEH-QD-227); the judgement in `Walk.ts`; a
       second answer projection.

     The change is cross-cutting enough to need a new ADR rather than five amendments, which is the precedent ADR-107
     set for ARCH-31.
  2. Amendment blocks:
     - ADR-077: the reads are request formers over one reader per port.
     - ADR-094 and its CCR-QD-198 amendment: `attributes.ask`, and `disclose` over the answer. Note that this
       supersedes D-21-c.
     - ADR-107: the wire has no span projection, and a served read is a reader with `remote`.
     - ADR-051: names and keys unchanged, plus D-46-d.
     - ADR-073: the `requireScopedResourceId` sentence (D-46-d), and the traced reads are now "each port's reader".
  3. BEH-QD-227: the listing is unchanged. The prose: "`PortAccess.ts` writes the question of a formed request through
     the description's `ask` …; a request that cannot be formed (a missing resource id) writes what it was asking …;
     `qadi.hasSignature`'s `meaning`/`signer_role`/`matched` are the `hasSignature` judgement's." The REQUIREMENT
     blocks are unchanged.
  4. INV-QD-044 Source: replace `resolveAttribute` with "the attribute port's reader". "`disclose` is the only path"
     stays true for the attribute port, which has no judgement. INV-QD-006 Source: "every asker's read, through one
     reader per port (`Effect.suspend` + `catchPortDefect`)".
  5. `spec/overview.md`:
     - :278 becomes `PortWire`, `DecodedQuestion` (drop `PortWireSpan` and "the span projections").
     - :274 describes `PortSpanAttributes` as "question, answer, `ask` (the question of a formed request), `disclose`
       (the port's answer)".
     - :275 `SignatureAnswer` becomes "what the `hasSignature` judgement decides; its disclosure records only
       `matched`".
     - Add a Change History row.

     Run gate 13.
  6. **On NO-GO only:** an ADR-077 addendum recording the measurement and the reopening condition, in the style of
     ARCH-26's CCR-QD-192.
  7. `AGENTS.md` §5's paragraph "The port reads in `PortAccess.ts` — `readAttribute` … `askSignature` — and the root
     `evaluate` stay `Effect.fn` and traced" becomes "each port's read is one named `Effect.fn` per port, built from its
     description (`PortAccess.ts`'s reader table); the request formers `readAttribute` … `askSignature` open no span of
     their own …". Rewrite the `requireScopedResourceId` sentence under D-46-d. This is an AGENTS.md edit, so flag it in
     the PR for the maintainer.
  8. `.changeset/port-read-module.md`: `"@qadi/core": minor`, **Breaking** (types only):
     - `PortWire` loses `spanQuestion`/`spanAnswer`, and `PortWireSpan` is removed;
     - `PortSpanAttributes<Q, Ans, O>` becomes `<Q, Ans, A, Args>` with `ask`;
     - the signature port's `disclose` takes its answer;
     - D-46-d's span change for tracers is described.

     Say that all of these types are unreleased since 0.11.0 **if T0 step 4 confirmed it**. Edit the two pending
     changesets so the release notes do not announce `PortWireSpan` or the span projections as new and then remove
     them in the same release. Releasing needs the user's explicit go-ahead.
  9. `spec/traceability.md`: rows for `PortRead.test.ts`, removing `PortServe.test.ts`. BEH-QD-227/261/332,
     INV-QD-006/044 and ADR-QD-NEXT rows.
- **Tests:** none.
- **Verify:** `node scripts/check-api-surface.mjs`; `bash spec/scripts/verify-traceability.sh --strict`;
  `node scripts/check-doc-examples.mjs`; `node scripts/check-dod-table.mjs`.
- **Done when:** every gate script passes and no spec text names a deleted symbol
  (`grep -rn "spanQuestion\|PortWireSpan\|resolveAttribute\b\|servedBody" spec AGENTS.md` → only Change History and ADR history).

### T12 — Full gate
- **Status:** [ ] todo
- **Depends on:** T11
- **Files:** none
- **Steps:** run `pnpm check` (it includes `pnpm mutation`). Then record PortAccess.ts's Stryker score and the overall
  core score in §10.
- **Tests:** —
- **Verify:** `pnpm check`.
- **Done when:** green.

## 7. Test strategy

**Survive unchanged (the guard rails, success criterion 5):**
- `Evaluate.test.ts`'s "observability" suite: exact attribute sets for every port span, including both
  MissingResourceId spans and the three signature spans.
- `Predicate.test.ts`'s literal-key assertions.
- `PortsLayer.test.ts`, `PortRemote.test.ts` (plus T1's case) and `PortWire.test.ts`.
- `features/features/port-calls/*`.
- Devtools' `PortCalls.test.ts`, `ServicesPanel.test.tsx` and `DevtoolsDock.test.tsx`.
- `ShortCircuit.test.ts` and the INV-QD-058 faulty-port properties in `Predicate.test.ts`, which pin that translation
  fails only as evaluation would. The readers do not change *which* reads happen.

The spike ran all of core's suite against the new shape: 1831 of 1832 passed, and the one failure is the intended move.

**Move to the new interface:**
- `PortServe.test.ts` (27 tests, served only) becomes `PortRead.test.ts`, which loops over every port × every asker:
  span, interpreter, no secret, the one metric series, `fail`/`die`/`throw`, and the unformed draft.
- `PortAccess.test.ts`'s five hand-written defect cases go into the same loop, which keeps the `port.calls` wiring
  assertion.
- `PortSpan.test.ts`'s signature round trip goes to the judgement test.
- `PortConformance.test.ts:505` goes to `attributes.ask`.

**Deleted as redundant:** `PortServe.test.ts`, and "a read's defect error is its port description's" in
`PortAccess.test.ts`. The `catchPortDefect` cause matrix stays: it is the rule's own contract (BEH-QD-261).

**Added:**
- T1's throw cases (they ship first and move into the loop in T9).
- The `ask`/`disclose` key law in `PortConformance.test.ts`. This is a property over the registry, and it replaces a
  type-level guard that §1.3 showed TypeScript cannot give.
- The span-set pin for D-46-d.
- tstyche checks for `AskerOf` and for a `PortWire` without span members.

**Property / differential:** the conformance key law runs for all five registry rows. The existing INV-QD-058
properties (generated policies against faulty ports, comparing `evaluate` and `toPredicate`) are the differential, and
they must stay green unedited.

**Mutation (Stryker, gate 16):** `PortAccess.ts` keeps its mutable decisions in function bodies:
- the `scopedTo` `typeof`, which MissingResourceId tests kill;
- the clamp, which the existing depth tests kill;
- the judgement's `meaning`/`signerRole` match, which `Evaluate.test.ts`'s "right meaning, wrong signer role" kills;
- the `PORT_CALLS_BY_ASKER[asker]` lookup, which the per-asker metric loop kills;
- the `Result.isFailure(draft)` branch, which the unformed-draft case kills.

Table *initializers* are static and skipped (ADR-076), so no decision may live in them. T9 runs Stryker scoped to the
file and records survivors.

## 8. Spec and documentation updates

- **ADR-QD-NEXT** (new) "A port read is one function over its description", amending ADR-QD-077, ADR-QD-094 (and its
  CCR-QD-198 amendment, superseding ARCH-21 D-21-c), ADR-QD-107, ADR-QD-051 and ADR-QD-073. `index.yaml` row.
  **CCR-QD-NEXT** for T1 (patch) and for the refactor.
- **Behaviors:** BEH-QD-227 (prose: `ask`, unformed requests, the signature judgement; the listing and REQUIREMENTs
  are unchanged), BEH-QD-261 (every asker; a synchronous throw), BEH-QD-332 (dies **or throws**). Change History rows in
  `05-evaluator.md`, `30-port-calls.md` and `34-remote-ports.md`.
- **Invariants:** INV-QD-044 Source (the reader; `disclose` still the only path for an attribute value), INV-QD-006
  Source. No new invariant: N1 is a violation of BEH-QD-261/332, which already exist.
- **Traceability:** `PortRead.test.ts` replaces `PortServe.test.ts` in the BEH-QD-332, INV-QD-006 and ADR-QD-107
  rows, and ADR-QD-NEXT gets its row.
- **`spec/overview.md` (gate 13):** rows :274, :275 and :278 as in T11 step 5. `PortWireSpan` is removed. Change History.
- **AGENTS.md §5:** the traced-reads paragraph and the `requireScopedResourceId` sentence (T11 step 7).
- **Website (`apps/website`):** no page names an affected symbol (N5). No change is needed. Re-run
  `node scripts/check-website-doc-examples.mjs` anyway.
- **Changesets:**
  - `served-port-read-throw.md` (`@qadi/core` patch, T1);
  - `port-read-module.md` (`@qadi/core` minor, **Breaking**, types only, plus D-46-d's tracer-visible change);
  - edits to the two pending ARCH-21/31 changesets so the next release's notes are coherent.

  No release without the user's explicit go-ahead.

## 9. Risks and rollback

| Risk | How it shows up | Mitigation / rollback |
| ---- | --------------- | --------------------- |
| The judged signature path is slower (orientation: +2–10%, noisy) | T4 NO-GO on `signature *` workloads | Hoisted judgement with no per-call allocation (already in the spike). On a NO-GO, T5–T9 do not land, while T1–T3 do. |
| A release ships between now and T8/T5 | `PortWireSpan`/`spanQuestion`/`PortSpanAttributes<…, O>` become published API, and their removal becomes a published break | T0 step 4 checks. The changeset then says "breaking" plainly. If the user prefers, keep `PortWire`'s members for one minor as `@deprecated`, which forwards to `attributes`. |
| Tracer-visible change (D-46-d A) | A host's tracing backend no longer shows `qadi.requireScopedResourceId` | Named in the changeset and ADR. D-46-d B is the no-removal alternative. |
| A silent span drift slips through | A key renamed or mistyped in `ask`, unseen by types (§1.3) | The conformance key law (T9 step 4) and the unedited `Evaluate.test.ts` exact sets. |
| Stryker survivors in tables | Gate 16 score dips | Keep decisions out of initializers (ADR-076), and record any survivor with a reason. |
| **Overlap: ARCH-51** (LeafNeeds; resource-id rule; `PredicatePortName`) | Both edit `PortAccess.ts`'s request formers. ARCH-51 may derive `PredicatePortName` | **Land ARCH-46 first.** ARCH-51 then reads `scopedTo` as *the* rule and its table says which leaves need it. `AskerOf<K>` keeps referring to `PredicatePortName`, whether that is hand-written or derived. |
| **Overlap: ARCH-55** (named barrel; merging `PortSpan*`/`PortInterpreter`/`PortWire*`) | Merge conflicts in `PortWire.ts`, `PortWireEncode.ts` and `PortSpan.ts` | **Land ARCH-46 first** (it removes members). ARCH-55's moves are then mechanical. If ARCH-55 lands first, T5 and T8 apply the same edits in the merged module. |
| **Overlap: ARCH-56** (metrics declared where both ends import them) | Naming or home of `PORT_CALLS_BY_ASKER` | This plan keeps it in `PortAccess.ts` (package-private, T6 step 1). ARCH-56 may move it beside the metrics if it adopts a shared rule. That is a one-line move. |
| **Overlap: ARCH-52** (signature ledger read seam; edits `SignatureHistory.ts`) | Conflicts in `signatureSpan`/`signatureWire` | Small and textual. Whichever lands second rebases. ARCH-52 should not move the match into `SignatureHistory.ts` (D-46-c C rejected). |
| **Overlap: ARCH-47** (edge step; `portRoutesUnguarded`) | Both amend ADR-107 and BEH-QD-332 wording, and T1 changes a port route's status for a throwing store (500 → 503) | Serialise the ADR-107 amendment edits. T1's `PortRoutes.test.ts` case is independent of ARCH-47's extraction-logging change. |
| Effect version drift (`Effect.fn` with a dynamic name) | A future `effect` changes `fn`'s name handling | `v4-api-smoke.test.ts` already pins `Effect.fn`. The evaluator reads have used a dynamic `<port>Port.span` name since ARCH-10, so nothing new depends on it. |

**Rollback:** T1 and T2 are independent commits. T5–T9 revert as one commit set with no data or migration involved,
and T11's spec edits revert with them. The pending changesets return to their previous text.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | Plan written. Evidence verified at `b655b3b`. The spike (scratch `wave5/ARCH-46/spike`) typechecks with no casts and passes 1831/1832 core tests. N1 (served sync-throw defect) confirmed by probe. Orientation timing: resolver miss within noise; judged signature +2–10%, inconclusive. | planner |
| 2026-10-13 | T1,T2,T3,T4,T11(NO-GO subset) | Landed as 903be15: N1 fix, N2 doc, O2 re-key, PortRead.bench.ts, gate NO-GO (see ADR-077 Rev 1.2). T5-T10, T12 not done. | implementer |
