---
id: ARCH-32
title: A Decision is constructed from its Trace, never beside it — one constructor derives the verdict, fields, obligations and reason from the trace root, and every reader (the record codec, the hydration seed) refuses a value whose copies disagree
strength: Strong   # from the 2026-10-07 architecture review (wave 4, card c3), in-process
status: done
evidence_verified_at: e635e68
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-NEXT (new, recommended by D-32-i: "A decision is constructed from its trace". The in-memory shape of `Allow`/`Deny` changes, which is a decision of its own, not a refinement of an existing one)
  - ADR-QD-096 (amend: a version-2 decision whose copies disagree is refused as `Inconsistent`, with no version bump, under the precedent DecisionWire.ts:60-64 records; the duplicated fields are queued for removal "the next time the wire version moves for any reason", D-32-a)
  - ADR-QD-095 (constraint: SinkCodec owns both directions, so the record-level agreement check lives behind `decodeSinkRecord` and no adapter re-checks it)
  - ADR-QD-078 (amend: a `Disclosed` seed must agree with its own trace as well as name its own policy; still `MalformedEntry`, D-32-f; the payload stays version 2)
  - ADR-QD-093 (constraint: a decision is read once, through `outcomeOf`. This plan adds no raw `AsyncResult` read, and `DECISION_READ_BUDGET` is unchanged)
  - ADR-QD-101 (constraint: alignment of a trace with its policy is core's. The decode check covers the root position only (`record.policy._tag === trace.policyTag`); a full positional alignment on decode is a non-goal, §3)
  - ADR-QD-039 (constraint: a seed is not an authority. The hydration check is about integrity of the payload, not about trusting it)
  - ADR-QD-037 (constraint: madge counts type-only edges; `SinkWire.ts` gains one `import type` from `Decision.ts`, whose closure does not reach `SinkWire.ts`/`Errors.ts`, §1 C12)
  - ADR-QD-002 (constraint: wire schemas stay schema-first; the comparison equivalences are derived with `Schema.toEquivalence`, never hand-written)
  - ADR-QD-076 (constraint: `ignoreStatic: true`; module-scope `Match.type` builds are static, so every arm of the agreement check needs a test)
  - ADR-QD-038 (constraint: changesets only, fixed version group; no release step)
packages: ["@qadi/core", "@qadi/react", "@qadi/devtools", "@qadi/audit (docs only)", "examples/nextjs-newsroom", "scripts (house style)"]
estimate: L   # ≈ 4–5 days for T0–T11 (≈44 test fixture sites migrate in T3). Defect-only path (T1 + T2) ≈ ½ day (S)
---

# ARCH-32 — A Decision is constructed from its Trace, never beside it

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68` (clean apart from untracked files that touch no source).
`git log --oneline -3 -- packages/core/src/DecisionWire.ts packages/core/src/Evaluate.ts packages/react/src/HydrationEngine.ts`
shows `e635e68` (#148) as the last change, so every line below is current. Probes live in
`scratchpad/wave4/ARCH-32/` (absolute: `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-32/`),
never in the repo. That directory holds a `node_modules` symlink to `packages/react/node_modules` so `effect` resolves. Commands:

- `probe-decode.mts` — hand-built version-2 records through the real `decodeSinkRecord`, then `project()` and `encodeSinkRecord` on what comes back.
  `cd packages/core && NODE_OPTIONS="--conditions=bun" ../../node_modules/.bin/tsx <scratch>/probe-decode.mts`
- `probe-hydrate.mts` — hand-built version-2 payloads through the real `hydrateWith` (`HydrationEngine.ts`) with a stub seed lookup.
  `cd packages/react && NODE_OPTIONS="--conditions=bun" ../../node_modules/.bin/tsx <scratch>/probe-hydrate.mts`
- `probe-equiv.mts` — `Schema.toEquivalence` over `Schema.Array(Obligation)` and `UndefinedOr(Array(String))` on JSON-decoded copies.
  Same command as `probe-decode.mts`.
- `probe-getter.mts` / `probe-ctor.mts` — the two in-memory shapes D-32-b weighs, on a real `Data.TaggedClass`. `tsx` as above, no condition needed.
- `tsprobe-ctor.mts` / `tsprobe-verdict.mts` — type-level probes of D-32-b (C) (strict, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), each with a `@ts-expect-error` that must hold.
  `cd <scratch> && /Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/tsc --noEmit --strict --exactOptionalPropertyTypes --verbatimModuleSyntax --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck tsprobe-verdict.mts` → exit 0.

| # | Claim (review card c3) | Verdict | At `e635e68` |
| - | ---------------------- | ------- | ------------ |
| C1 | `core/src/Evaluate.ts:300-315` builds `Allow`/`Deny` with `visibleFields`, `obligations`, `reason` copied from the trace root | **CONFIRMED** | `Evaluate.ts:300-315` exactly: `trace.allowed ? new Allow({ …, trace, visibleFields: trace.visibleFields, obligations: trace.obligations }) : new Deny({ …, trace, reason: trace.reason ?? "denied" })`. Four facts are stored twice on every decision: the verdict (`_tag` vs `trace.allowed`), `visibleFields`, `obligations` (Allow), and `reason` (Deny). `Decision.ts:88-110` declares them as independent constructor fields, and `Trace` (`Decision.ts:23-54`) carries them too; the `Trace.obligations` doc (`:49-51`) says it records them "as well as on the decision". |
| C2 | Two places build decisions | **CONFIRMED, exactly two in `src`** | `grep -rnE 'new (Allow\|Deny)\(' packages/*/src` → `Evaluate.ts:301,309` and `DecisionWire.ts:104,113` only. `@qadi/testing`'s `Fixtures.ts` builds none. Devtools' simulator (`model/Simulation.ts:69`), `@qadi/react` (`QadiAtoms.ts:306`) and `SubjectSet.ts:185` all go through `evaluate`. Every inbound path (http SSE/backlog → `decodeStoredRecord`; devtools `model/Source.ts:292` → `decodeStoredRecordString`; audit `AuditEntry.ts:189` and the newsroom aggregator `server/api.ts:235` → `decodeSinkRecord[String]`) reaches `decodeDecision` through `SinkCodec.ts:221-226` (`rebuildOutcome`). **Test-side**: ≈44 hand-built sites in 21 files (listed under "Other facts"). |
| C3 | `DecisionWire.ts:76-121` `decodeDecision` constructs an `Allow` whose trace says `allowed: false`, or whose `visibleFields` differ — **DEFECT** | **CONFIRMED (probe), and wider than claimed** | `decodeDecision` (`DecisionWire.ts:100-121`) copies every wire field into the class with no comparison. `probe-decode.mts`, each case a valid v2 record otherwise: **A1** `Allow` + `trace.allowed:false` → *accepted as Allow*, `project({title,body,secret})` returns all three fields; **A2** `Allow.visibleFields ["title","body"]`, trace root `["title"]` → accepted, projects `body`; **A3** `Allow` with no `visibleFields` (top), trace root `["title"]` → accepted, projects everything; **A4** `Allow.obligations []`, trace root owes a binding `audit` → accepted with no duty; **D1** `Deny` + `trace.allowed:true` → accepted; **D2** `Deny.reason "forged sentence"`, `trace.reason "lacks role admin"` → accepted; **D3** `Deny` with a non-empty wire `obligations` → accepted, silently dropped (the class has no field; a re-encode writes `[]`). Every accepted forgery **re-encodes** (`encodeSinkRecord` succeeds), so it propagates through forwarding, the stream and audit unchanged. **Test-first: T1.** |
| C4 | `DecisionRecord` duplicates `subjectId`/`evaluationId` that the decision carries | **CONFIRMED, and decode does not check them** | `DecisionRecord.ts:59-114` carries `evaluationId`, `subjectId`; `Allow`/`Deny` carry both again. In-process they agree by construction (`Evaluate.ts:244,303` and `SinkEmit.ts:71-86` read one `stamp`/`question`). `probe-decode.mts`: **R1** record `evaluationId "e1"`, decision `"OTHER"` → accepted; **R2** record `subjectId "u1"`, decision `"mallory"` → accepted; **R3** record `policy._tag "HasRole"`, trace root `policyTag "AnyOf"` → accepted. The third is a fifth duplicated fact the card did not list: the record's policy and the trace root's tag. |
| C5 | `SinkCodec.ts:223` rebuilds through `decodeDecision` | **CONFIRMED** | `SinkCodec.ts:221-226` (`rebuildOutcome`), called from `rebuild` (`:242-263`), called from `decoded` (`:556-559`) after the strict schema decode. No agreement check anywhere on that path. |
| C6 | `react/src/HydrationEngine.ts:222-250` checks only the trace root `policyTag` on a seed — **DEFECT** | **CONFIRMED (probe)** | `rebuild` (`:222-239`) copies `visibleFields`/`obligations`/`disclosure` into `SeededAllow`/`SeededDeny`; `disclosesItsOwnPolicy` (`:249-250`) compares only `disclosure.trace.policyTag` with `policy._tag`, used at `:396-399`. `probe-hydrate.mts`: **H1** `Allow` entry, `Disclosed` trace `allowed:false` → *seeded as SeededAllow*; **H2** `Allow` with all fields visible, disclosed trace restricts to `["title"]` → seeded; **H3** `Deny` entry, disclosed trace `allowed:true` → seeded as SeededDeny; **H4** `Deny` disclosure `reason "forged"`, trace `reason "real"` → seeded; **H5** (control) root `policyTag` mismatch → dropped `MalformedEntry`, as today. A `Withheld` seed has no trace, so its fields are the only copy and there is nothing to compare (D-32-b's consequence for hydration, §2). **Test-first: T2.** |
| C7 | "Consumers already read different copies: devtools `model/Filters.ts:106`, `model/Replay.ts:98` read `entry.decision.subjectId`; audit and timeline read `record.evaluationId`" | **REFUTED as stated; the real split is elsewhere (CHANGED)** | In devtools, `TimelineDecision.decision` is a **`DecisionRecord`**, not a `Decision` (`model/Timeline.ts:29-33`, set at `:131` `decision: record`). So `Filters.ts:106`, `Replay.ts:98` and `react/DecisionLog.tsx:185` read the **record's** `subjectId`, the same copy audit (`AuditDecisionSinkLive.ts:183,199,222`, `entry.record.evaluationId`) and the timeline (`Timeline.ts:128,160,184`) read. No consumer of a *decoded* record reads the decision's `subjectId`/`evaluationId` today. **The copies that consumers do split on are the verdict and the fields:** the devtools log's verdict tag reads `isAllowed(o.decision)` (`model/Verdict.ts:39-50`, shown at `react/DecisionLog.tsx:127`), the inspector's field and duty panels read `allowOf(entry).visibleFields`/`.obligations` (`react/Inspector.tsx:33-37,125,191`), and the inspector's tree reads `outcome.decision.trace` (`model/Inspect.ts:138-143`). For an A1 record the log says **ALLOW** with every field visible while the tree's root says **✗** (read, not rendered). |
| C8 | No invariant in `spec/invariants.md` states the agreement | **CONFIRMED** | Searched every `## INV-QD-*` heading and `grep -n -i "trace root\|trace\.allowed\|agree"`. The nearest are INV-QD-022 (a disclosed trace names its own policy: root tag only), INV-QD-059 (a seed claims no trace it was not given), INV-QD-096/098 (codec round trip; one outcome) and INV-QD-103 (trace aligns with its policy position by position, for evaluated traces). None says a decision's verdict/fields/obligations/reason equal its trace root's, or that a record's ids equal its decision's. |
| C9 | "No wire version bump needed" if decode only refuses | **CONFIRMED, with the precedent named** | BEH-QD-199 says "A change to the wire's content is a new version". Refusing changes no byte the encoder writes: `evaluate` cannot produce a disagreeing decision (C1), so no genuine producer of any 0.x version ever wrote one. The library already tightened acceptance inside version 2 twice without a bump: the tagged `DecisionWire` union ("every record this module encodes already satisfies the stricter shape, so the bytes are unchanged", `DecisionWire.ts:60-64`) and strict decode options (CCR-QD-139). **But** two in-repo goldens are themselves disagreeing records (next row), which must be corrected in T1. |
| C10 | *(found during verification)* The codec's own round-trip fixtures are disagreeing decisions | **CONFIRMED** | `packages/core/test/fixtures/sinkWireV2.ts:14-15` `V2_DECIDED_ALLOW`: trace root `"obligations":[]`, decision `"obligations":[{"id":"audit.log",…}]`. `SinkCodec.test.ts:137-155` `allowRecord` (the main round-trip fixture): `trace(true)` owes nothing, the decision owes `audit.log`. `SinkCodec.test.ts:1642-1649`, `:1698-1708` repeat the golden. `DecisionWire.test.ts:16-24` builds an `Allow` whose `visibleFields`/`obligations` are a parameter while its trace has neither. These records no evaluator produces; they were never caught because nothing states the agreement (C8). T1 corrects them (the trace root carries what the decision carries); the golden string changes inside the trace only, and the wire *format* does not. |
| C11 | "Closes a forged-Allow decode path" | **CHANGED: closes a *contradictory* decode path, not a forged one** | The record wire carries no signature or MAC. A forger who writes `trace.allowed: true` beside `_tag: "Allow"` produces a self-consistent forged allow that decodes before and after this plan. What the plan closes is a record whose two copies disagree, so that two readers (C7) report different verdicts, fields or duties for one evaluation. Nothing in the repo enforces from a decoded record (devtools display, the newsroom aggregator, audit read-back), so the severity is an untruthful log/audit/inspector, not an authorization bypass. The same holds for hydration (ADR-QD-039: a seed is not an authority, and it is superseded by the client's own answer, INV-QD-028). |
| C12 | Constraint: where can the agreement rule live without a cycle? | **CONFIRMED safe in `Decision.ts`** | `Decision.ts`'s import closure is `FieldLattice → FieldPath, Policy → {DecodeDepthGuard, Matcher → {Compare → SecurityLabel, Identity, TreeFold}, Obligation, Permission, Signature → Identity, TreeFold}`, `Identity`, `Obligation`, `Resource`, `TreeFold`, `Wording`. None reaches `SinkWire.ts` or `Errors.ts`, so `SinkWire.ts` may `import type { DecisionDisagreement } from "./Decision.ts"` (madge-clean). `Errors.ts` already imports `Decision.ts` (`Errors.ts:51-57`). |
| C13 | Constraint: can equality be derived, not hand-written? | **CONFIRMED** | `node_modules/effect/src/Schema.ts:15708` exports `toEquivalence`. `probe-equiv.mts`: `toEquivalence(Schema.Array(Obligation))` is `true` on two JSON copies with nested `attributes`, `false` when a nested value differs; `toEquivalence(UndefinedOr(Array(String)))`: `["a","b"]~["a","b"]` true, `["a","b"]~["b","a"]` false, `undefined~[]` **false** (INV-QD-004: top ≠ none), `undefined~undefined` true. |
| C14 | Constraint: can the in-memory constructor derive the fields (D-32-b)? | **CONFIRMED for constructor-derivation; getters rejected** | `probe-getter.mts` (getters on the prototype): `Equal.equals` holds, but `JSON.stringify(allow)` and `{...allow}` **lose** `visibleFields`, and an untyped caller passing `visibleFields` **throws** `Cannot set property visibleFields of #<Allow> which has only a getter`. `probe-ctor.mts` (a constructor taking `(stamp, trace)` that calls `super({ ...args, visibleFields: trace.visibleFields, obligations: trace.obligations })`): own properties, `Equal` holds, JSON and spread keep the fields, and an untyped caller's `visibleFields` is overridden by the trace's. `tsprobe-ctor.mts`: passing `visibleFields` is a compile error (the `@ts-expect-error` holds). `tsprobe-verdict.mts`: with `trace: Trace & { readonly allowed: true }` on `Allow`'s constructor and a `t is AllowingTrace` predicate in `makeDecision`, an unnarrowed or denying trace cannot build an `Allow` (both `@ts-expect-error`s hold), with no `as`. |

**Other facts the plan relies on.**

- **Every test-side constructor** (`grep -rnE 'new (Allow|Deny)\(' packages features | grep -v /src/`), migrated in T3:
  `packages/core/test/SinkCodec.test.ts:146,177,206,244,280,930,1484,1492,1616,1642,1698,1712,1726,1861`;
  `DecisionWire.test.ts:17,26`; `Decision.test.ts:19,29`; `FieldLattice.test.ts:139`; `EncodeRefusalReport.test.ts:34`;
  `packages/core/bench/SinkCodec.bench.ts:43`; `packages/devtools/test/helpers.ts:59,74`; `packages/audit/test/helpers.ts:54`;
  `packages/http/test/decisionStream.test.ts:99,556`; `decisionBacklog.test.ts:49`;
  `packages/react/test/Hydration.test.ts:82,98,691,1155`; `DecisionOutcome.test.ts:55,63`; `HydrationCounts.test.ts:50`;
  `HydrationEngine.test.ts:28`; `HydrationRender.test.tsx:18`; `ServerRender.test.tsx:77`; `hooks.test.tsx:553`;
  `features/features/devtools/devtools.steps.test.ts:76,84`; `devtools-screens.steps.test.ts:118`;
  `devtools-simulator.steps.test.ts:266`; `hydration-counts.steps.test.ts:51`.
  No `spec/`, website, README or `examples/` fence or source constructs one (same grep over `*.md`/`*.mdx`/`examples`).
- **JSON-literal records** that must agree after T1: `packages/core/test/fixtures/sinkWireV2.ts` (three `V2_DECIDED_*` strings; only
  `V2_DECIDED_ALLOW` disagrees) and the literal envelopes in `SinkCodec.test.ts:1772,1840` (they test excess keys and stay refused for that reason).
- **`DecodeRefusal` is matched exhaustively** in three places a new member reaches: `@qadi/devtools` `model/Source.ts:268-275`
  (`reasonOf`, and `MalformedReason` at `:316`), `examples/nextjs-newsroom/src/server/api.ts:192-202` (`refusedBecause`), and core's own
  tests. `@qadi/audit` passes the refusal through (`AuditEntry.ts:189`). Docs naming the reasons: `spec/behaviors/25-inspection.md`
  (BEH-QD-199/200), `27-devtools-timeline.md` (BEH-QD-204), `24-decision-sink.md`, `33-audit-pipeline.md`,
  `apps/website/.../packages/devtools.md`, `.../packages/audit/capabilities.md`, `.../reference/upgrading.md`, `packages/{audit,devtools}/README.md`,
  `spec/overview.md:308,414,460-470,755`.
- **Public surface today** (`spec/overview.md`): `Decision, Allow, Deny, Trace, isAllowed, project` (`:153`); `DecisionWire` (`:301`);
  `DecisionWireAllow, DecisionWireDeny` (`:302`); `encodeDecision, decodeDecision` (`:303`). `decodeDecision` has **no caller outside
  `SinkCodec.ts`** in any package or example (grep), only `DecisionWire.test.ts`.
- **A sibling duplicate left outside scope:** `AccessDenied` (`Errors.ts`, a `Schema.TaggedError` decoded by typed HTTP clients) carries
  `reason`, `policyTag` and `trace`, built from a `Deny` in `Qadi.ts:150-159`; a decoded `AccessDenied` can disagree with its own trace the
  same way (read, not probed). `ObligationRecord.obligationIds` (`Qadi.ts:91-93`) duplicates the allow's obligations by id. Both in §3.
- `fast-check` is a core devDependency (`packages/core/package.json:46`); `traceArbitrary` is in `packages/core/test/TraceOracle.ts`,
  `policyArbitrary` in `packages/core/test/helpers.ts:202`.

## 2. Goal and success criteria

**Goal.** A `Decision` is a stamp (`evaluationId`, `subjectId`, `durationMillis`) plus a `Trace`; its verdict, `visibleFields`,
`obligations` and `reason` are *readings* of the trace root, yet today they are independent constructor fields that two modules fill
by hand and no reader compares. This plan gives the decision **one constructor**, `makeDecision(stamp, trace)`, in `Decision.ts`,
and makes `Allow`/`Deny`'s own constructors take `(stamp, trace)` with the verdict in the trace's type and derive the rest, so a
disagreeing decision cannot be **built** in memory (a compile error, not a runtime check). The **agreement rule** for values that arrive
already carrying both copies (a wire record, a disclosed seed) gets **one home**, `decisionDisagreement`, beside the constructor, with
equivalences derived from the schemas. The **seam** is that pair: the record codec and the hydration engine are its two adapters, and
each refuses with its own vocabulary (`DecodeRefusal.Inconsistent` / `MalformedEntry`). **Depth:** two small functions hide five
duplicated facts (four on the decision, plus the record's ids and policy tag). **Locality:** a sixth duplicated field is one edit in
`Decision.ts`, and the closed `DecisionDisagreement` union makes every reporter a compile error away from it. **Leverage:** every
consumer of a decoded record (devtools log and inspector, audit read-back, the newsroom aggregator, the SSE client) reads one truth
without re-checking. The wire bytes do not change (D-32-a).

**Success criteria.**

1. `decodeSinkRecord` refuses every case in §1 C3 and C4 (A1–A4, D1–D3, R1–R3) as `SinkRecordNotDecodable`, never accepting one
   (T1: `pnpm vitest run packages/core/test/SinkCodec.test.ts`), and after T5 the refusal is `Inconsistent` naming the field.
2. `hydrateWith` drops H1–H4 as `MalformedEntry` and still seeds every evaluator-produced payload
   (T2: `pnpm vitest run packages/react/test/HydrationPayload.test.ts packages/react/test/Hydration.test.ts`).
3. `new Allow({ …, visibleFields })`, `new Allow({ …, trace: <Trace> })` and `new Deny({ …, trace: <AllowingTrace> })` are compile
   errors, pinned by `@ts-expect-error` in `packages/core/test/Decision.tst.ts` (*new*) (`pnpm test:tstyche`).
4. `grep -rnE 'new (Allow|Deny)\(' packages/*/src` returns only `packages/core/src/Decision.ts`, enforced by the house-style rule
   `no-decision-constructor-outside-decision` (`node scripts/check-house-style.mjs`).
5. Property (T7): for every trace from `traceArbitrary` and every stamp, `makeDecision` agrees with its trace; for every v2 JSON
   decision record built from an evaluated one and then mutated in one duplicated field, `decodeSinkRecord` refuses; for every record
   `encodeSinkRecord` emits from an `evaluate` run, `decodeSinkRecord` accepts (INV-QD-096 still holds).
6. `spec/invariants.md` has INV-QD-NEXT "A decision agrees with its trace" naming its Source and Enforcement; gate 13
   (`node scripts/check-api-surface.mjs`) passes with the new exports listed.
7. The golden bytes change only inside `V2_DECIDED_ALLOW`'s trace (it gains the obligation it already owed); every other golden is byte-identical
   (`git diff packages/core/test/fixtures/sinkWireV2.ts` shows one line).
8. `pnpm check` is green, including `stryker.config.mjs` (core), `stryker.react.mjs`, `stryker.devtools.mjs` at or above their break thresholds, and `pnpm circular`.

## 3. Non-goals

- **Wire version 3.** Dropping the duplicated fields from the wire is D-32-a's option B/C and is not recommended now; the plan queues it
  in the ADR-QD-096 amendment so the next version bump (for any reason) carries it.
- **Full positional alignment of a decoded trace with the record's policy** (INV-QD-103 on decode, via `foldAligned`). The decode checks
  the root position only, which is the fact a record duplicates. Checking every position would re-derive the evaluator's fold on every
  read and belongs with ARCH-41/ARCH-45's trace-integrity questions, if anywhere.
- **Internal consistency of a trace** (a composite's verdict from its children's, a denied node owing nothing). A trace is evidence, not
  a claim this plan re-proves.
- **`AccessDenied`'s `reason`/`policyTag` vs its `trace`** (§1 "sibling duplicate"). Same shape, different module and wire
  (`@qadi/http` response body, ADR-QD-072). Recorded as an orphan finding for the tracker.
- **`ObligationRecord.obligationIds` vs the allow's obligations.** ARCH-30 rewrites discharge and the obligation record; it should build
  `obligationIds` from `decision.obligations` (it does today, `Qadi.ts:91`) and is the plan that owns that record.
- **Authenticating records or payloads.** C11: this plan closes contradiction, not forgery. Signing the wire is a separate decision.
- **`Withheld` seeds.** They carry the only copy of their fields; there is nothing to agree with (ADR-QD-078, INV-QD-059).

## 4. Constraints

- **AGENTS.md §1.** Namespace submodule imports (`import * as Schema from "effect/Schema"`), `.ts` relative imports; other packages
  import by name from `@qadi/core` (`import { decisionDisagreement } from "@qadi/core"`).
- **§4.** No new `Schema.TaggedError` (`SCHEMA_ERROR_BUDGET` unchanged). `DecodeRefusal` is a `Data.taggedEnum` in `SinkWire.ts`; the new
  member is a full closed-union edit (user preference: closed union, never widening), so every `Match.tagsExhaustive` over it (§1) fails
  to compile until it handles `Inconsistent`.
- **§5 / §5a.** The agreement check and `makeDecision` are pure (no `Effect`), so no `Effect.fn`/`fnUntraced` and `UNTRACED_BUDGET` is
  unchanged. Dispatch with module-scope `Match.type<…>().pipe(Match.tagsExhaustive(…))` (built once; `decodeSinkRecord` runs per
  record); no `switch`, `SWITCH_BUDGET` unchanged.
- **§6.** No `as`, `!`, `any`. The verdict narrowing uses type predicates (`isAllowingTrace`, `isDenyingTrace`), shown sound in
  `tsprobe-verdict.mts`. No `Record<string, unknown>` widening anywhere (user preference). `PORT_DOUBLE_BUDGET`, `HAS_CUSTOM_BUDGET`,
  `ANY_BUDGET`, `DECISION_READ_BUDGET` untouched.
- **§7 / ADR-QD-002.** Equivalences come from `Schema.toEquivalence` over the existing schemas (`Obligation`, the `visibleFields`
  shape), so the comparison cannot drift from the codec (C13).
- **§9 / ADR-QD-099.** New exports go through `Decision.ts`'s existing `export *`; nothing new becomes package-private-but-imported.
- **§11/§12.** `spec/behaviors/05-evaluator.md`'s BEH-QD-039 fence is `ts` (signature listing); any new example of `makeDecision` in a
  behavior doc is a ` ```typescript ` fence that compiles under `node scripts/check-doc-examples.mjs`.
- **ADR-QD-037 / `pnpm circular`.** `SinkWire.ts` gains `import type { DecisionDisagreement } from "./Decision.ts"` (C12); its module doc
  ("imports only `effect`") is corrected in the same edit.
- **ADR-QD-095.** The record-level agreement (ids, root tag) is checked inside `SinkCodec.ts`'s `rebuild`, so no adapter re-checks.
- **ADR-QD-096 / BEH-QD-199.** Version 2 stays the only version; the refusal changes acceptance, not content (C9).
- **ADR-QD-078 / INV-QD-022.** The hydration check extends `disclosesItsOwnPolicy` and keeps `MalformedEntry`; the payload version is unchanged.
- **ADR-QD-076.** Module-scope matchers are static; every arm of `decisionDisagreement` and of each reporter needs a test that kills it.
- **Gate 13.** Every new core export appears in `spec/overview.md`'s Public API window; `MalformedReason` gains a member in the devtools row.
- **Breaking changes need sign-off** (§5): D-32-b, D-32-d, D-32-e, D-32-h are marked.

## 5. Decisions needed before work starts

### D-32-a — On the record wire, refuse disagreement or stop shipping the copies?

- **(A) Refuse on decode; version-2 bytes unchanged.** `decodeSinkRecord` refuses a disagreeing record as `Inconsistent` (D-32-e). The
  encoder writes exactly what it writes today. Readers and writers of every 0.11.x interoperate; stored audit rows (all produced by
  `evaluate`, so all agreeing) keep decoding.
- **(B) Wire version 3 that omits `visibleFields`, `obligations`, `reason`, the Deny's `obligations: []` and the decision's
  `evaluationId`/`subjectId`, deriving them on decode;** version 2 read (with A's refusal) for one minor, then removed, as v1 was
  (0.10 read both, 0.11 dropped v1).
- **(C) Version 3 only,** v2 refused as `UnsupportedVersion` immediately.

Weighing it honestly: the user accepted a wire break in #142, so a break is not disqualifying. But B/C add **no guarantee** A lacks:
under A a disagreeing record is already unobtainable from `decodeSinkRecord`, and under D-32-b it cannot be built in memory. What v3 buys is
bytes (tens per record) and representability on the wire. What it costs: (1) **audit trails** keep v2 rows for their retention period
(ADR-QD-056); removing the v2 reader forces every operator to re-encode archived rows with an older release, the v1 migration again,
and this time for trails with legal retention (overlaps ARCH-38's archive work); (2) the hydration payload derives its entries from
`DecisionWireAllow`/`DecisionWireDeny` (ADR-QD-078), and a `Withheld` seed has no trace, so it **needs** `visibleFields`/`obligations` on
the wire; v3 would split `DecisionWire` into a sink form and a hydration form, undoing the "one definition" ADR-QD-078 chose; (3) a
rolling deploy shows `UnsupportedVersion` on every devtools panel and aggregator older than its server.
**Recommendation: (A)**, with the ADR-QD-096 amendment recording "the next wire version, whatever moves it, omits the decision's
duplicated fields" so the representational cleanup is queued, not forgotten. This is the complete guarantee; B is a re-encoding of it.
`status: decided (2026-10-08, recommended default)` = (A): refuse on decode, version-2 bytes unchanged; the next wire version queued in the ADR-QD-096 amendment.

### D-32-b — What is the in-memory shape of `Allow`/`Deny`?

- **(A) Keep today's fields; add `makeDecision` beside them.** Non-breaking, but `new Allow({ visibleFields: X, trace: Y })` still builds a
  disagreeing decision anywhere (≈44 test sites do, C10), and only a lint rule says not to.
- **(B) Derived getters** (`get visibleFields() { return this.trace.visibleFields }`). Disagreement is unrepresentable, but
  `probe-getter.mts` shows `JSON.stringify`/spread drop the fields and an untyped caller throws (C14). Rejected as wrong, not as complex.
- **(C) Constructors take `(stamp, trace)` with the verdict in the trace's type, and derive own fields.**
  `Allow`'s constructor takes `DecisionStamp & { trace: AllowingTrace }` (`AllowingTrace = Trace & { readonly allowed: true }`) and calls
  `super({ ...args, visibleFields: args.trace.visibleFields, obligations: args.trace.obligations })`; `Deny`'s takes
  `DecisionStamp & { trace: DenyingTrace }` and derives `reason: args.trace.reason ?? "denied"`. The class field types are unchanged
  (`visibleFields`, `obligations`, `reason` stay own, readonly, JSON-visible); `Allow.trace`'s type narrows to `AllowingTrace` (a
  subtype, so every reader compiles). `makeDecision(stamp, trace)` picks the class with `isAllowingTrace`/`isDenyingTrace`. Probed in
  `probe-ctor.mts`, `tsprobe-ctor.mts`, `tsprobe-verdict.mts` (C14).

Tradeoff: (C) is breaking for any caller passing the derived fields (excess property) or an unnarrowed `Trace` (in-repo: tests only,
§1 list; third-party: fixture code, 0.x minor). It is the only option where "a decision agrees with its trace" is true by construction
and the agreement check is needed only at trust boundaries. **Recommendation: (C).** `status: decided (2026-10-08, recommended default)` = (C); breaking; — **needs user sign-off (breaking:
public constructors).**

### D-32-c — Do `Allow`/`Deny` stay exported as values?

- **(A) Yes.** Under D-32-b (C) a hand-built decision cannot disagree, so `new Allow({ …stamp, trace })` in a test is safe and readable.
- **(B) Type-only export; `makeDecision` is the only public constructor.** One more break, for no extra guarantee once (C) holds.

**Recommendation: (A).** The house-style rule (D-32-h) keeps `src` to the one constructor. `status: decided (2026-10-08, recommended default)` = (A).

### D-32-d — What does `decodeDecision` return?

- **(A) `Result.Result<Decision, DecisionDisagreement>`,** built through `makeDecision` after `decisionDisagreement` finds nothing. Breaking
  signature, but no caller outside `SinkCodec.ts` exists (§1).
- **(B) Keep `(wire) => Decision` and check only in `SinkCodec.ts`.** A third-party caller of `decodeDecision` keeps the contradictory path open.
- **(C) Make `decodeDecision` package-private** (explicit exports from `DecisionWire.ts` instead of `export *`). Removes a public function a
  hydration-like consumer could want.

**Recommendation: (A).** The public decoder is then safe by type. `status: decided (2026-10-08, recommended default)` = (A); breaking; — **needs user sign-off (breaking signature).**

### D-32-e — How is the refusal reported?

- **(A) A new `DecodeRefusal` member `Inconsistent: { readonly disagreement: DecisionDisagreement }`,** with `DecisionDisagreement` the closed
  union `"Verdict" | "VisibleFields" | "Obligations" | "Reason" | "DenyObligations" | "EvaluationId" | "SubjectId" | "PolicyTag"`. Full
  closed-union edits: `@qadi/devtools` `MalformedReason` gains `"inconsistent"` and `reasonOf` an arm; the newsroom `refusedBecause` an arm.
  A dashboard can tell "a producer built a contradictory record" (a library-misuse or tampering signal) from "not a record" (skew).
- **(B) `Malformed` with a message.** No union edit, but `Malformed` already means "not a record of the version it claims"; this is a
  well-formed record that contradicts itself, a different fix.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)` = (A); breaking; — **needs user sign-off (breaking: a closed public union gains a member; exhaustive matchers in
consumer code stop compiling).**

### D-32-f — Which drop reason does hydration use?

- **(A) `MalformedEntry`,** the reason the existing root-tag check (`disclosesItsOwnPolicy`) already uses for "the entry contradicts its own
  disclosure". No change to `ClientHydrationDropReason`, `hydrationDropReasons` (a metric key domain declared in core, read by devtools),
  or ARCH-37's meanings table.
- **(B) A new `InconsistentEntry`.** Distinguishes it on the dashboard, but the follow-up (a server bug or a tampered page) is the same as
  for the root-tag case, which would then need moving too.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)` = (A): MalformedEntry.

### D-32-g — Does decode also check the record against its decision?

- **(A) Yes:** `record.evaluationId === decision.evaluationId`, `record.subjectId === decision.subjectId`, and
  `record.policy._tag === decision.trace.policyTag` (R1–R3), refused as `Inconsistent` with `EvaluationId`/`SubjectId`/`PolicyTag`.
  Hydration already holds the policy-tag rule (INV-QD-022); this brings the sink wire level with it.
- **(B) Decision only.** Leaves C4's three accepted cases open.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)` = (A).

### D-32-h — Gate the one constructor?

- **(A) A plain house-style rule `no-decision-constructor-outside-decision`:** `/\bnew\s+(?:Allow|Deny)\s*\(/` in `packages/*/src/**`, exempting
  `packages/core/src/Decision.ts` (via `EXEMPTIONS`, the ARCH-25 pattern). Zero exceptions, not a budget. Tests are not scanned.
- **(B) No gate.** Under D-32-b (C) a stray `new Allow` cannot disagree, only duplicate the verdict choice.

AGENTS.md §15: gated, not remembered. **Recommendation: (A).** `status: decided (2026-10-08, recommended default)` = (A): rule added, no AGENTS.md edit; — needs sign-off (gate change; one AGENTS.md sentence is
optional, maintainer's call, as in ARCH-25 T7).

### D-32-i — A new ADR, or amendments only?

- **(A) New ADR-QD-NEXT "A decision is constructed from its trace"** (the in-memory shape, the one constructor, the agreement rule and its
  two adapters), plus amendments to ADR-QD-096 (refusal, and the queued v3 cleanup) and ADR-QD-078 (seed agreement).
- **(B) Amend ADR-QD-096 and ADR-QD-078 only.** The constructor change has no ADR to live in; ADR-QD-028/078 are about hydration.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)` = (A): ADR-QD-106.

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done (2026-10-08): re-baselined by the red tests and greps (no probes re-run)
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/32-decision-from-trace main`; record `git rev-parse --short HEAD`.
  2. Copy `probe-decode.mts`, `probe-hydrate.mts`, `probe-equiv.mts` from §1's scratch directory into a fresh scratch directory with
     a `node_modules` symlink to `packages/react/node_modules`, and run them with §1's commands. Expect A1–A4, D1–D3, R1–R3 `ACCEPTED`
     and H1–H4 `SEEDED`, H5 `DROPPED MalformedEntry`.
  3. `grep -rnE 'new (Allow|Deny)\(' packages/*/src` → exactly `Evaluate.ts` ×2 and `DecisionWire.ts` ×2. Re-run the test-side grep and
     reconcile with §1's list.
  4. `git diff --stat e635e68 HEAD -- packages/core/src/{Decision,DecisionWire,Evaluate,SinkCodec,SinkWire,DecisionRecord}.ts packages/react/src/HydrationEngine.ts packages/devtools/src/model/Source.ts`;
     update §1's line numbers if anything moved.
  5. Check whether ARCH-30 (Qadi.ts discharge, ObligationRecord), ARCH-37 (hydration drop meanings) or ARCH-39 (`enforceProjected`) has
     landed (`git log --oneline main -- packages/core/src/Qadi.ts packages/react/src/HydrationWarning.ts packages/devtools/src/model/Hydration.ts`)
     and re-target files if so.
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §1 is re-confirmed or corrected in §10.

### T1 — Test-first: a record whose decision disagrees with its trace or its envelope is refused (defect C3, C4)
- **Status:** [x] done (2026-10-08): red tests in packages/core/test/SinkCodecAgreement.test.ts; the private `contradiction` patch was skipped, T3-T5 landed in the same change
- **Depends on:** T0. No decision: the test asserts *refusal*, whatever its tag (D-32-e refines it in T5).
- **Files:** `packages/core/test/SinkCodec.test.ts`, `packages/core/test/fixtures/sinkWireV2.ts`, `packages/core/test/DecisionWire.test.ts`,
  `packages/core/src/SinkCodec.ts`.
- **Steps:**
  1. In `SinkCodec.test.ts`, add `describe("a decision that contradicts its own trace or record is refused (ARCH-32)")` with an
     `it.each`-style table of the ten cases A1–A4, D1–D3, R1–R3, each a plain v2 JSON object built like `probe-decode.mts`'s `record()`
     helper (a valid envelope around a hand-written decision; obligations with `attributes: {}`). Each asserts
     `Result.isFailure(decodeSinkRecord(input))`. Run: **red** on all ten.
  2. Correct the disagreeing fixtures, since each is a record no evaluator produces (C10): `fixtures/sinkWireV2.ts:14-15`
     `V2_DECIDED_ALLOW` — the trace's `"obligations":[]` becomes the decision's `[{"id":"audit.log","attributes":{},"advisory":false}]`;
     `SinkCodec.test.ts` `trace(true)` (`:126-132`) gains `obligations: [obligation("audit.log")]` where `allowRecord` (`:137-155`) owes
     it, and the goldens at `:1642-1649`/`:1698-1708` put the obligation on `goldenTrace`; `DecisionWire.test.ts:16-24` builds the trace
     from its parameters (`{ ...trace(true), visibleFields, obligations: [obligation("audit.log")] }`).
  3. Fix, minimally and privately, in `SinkCodec.ts`: a module-private `contradiction: (wire: SinkRecordWire) => string | undefined`
     (module-scope `Match.type<SinkRecordWire>()`: `Obligations` → `undefined`; `Decision` → for a `Decided` outcome compare
     `_tag` with `trace.allowed`, `visibleFields`/`obligations` with the trace root's via `Schema.toEquivalence`, `reason` with
     `trace.reason ?? "denied"`, a `Deny`'s wire `obligations` with `[]`, and the three envelope fields). In `decoded` (`:556-559`),
     a non-`undefined` result becomes `malformed({ message: "a decision that contradicts its own <field>" })`. Comment it
     `// replaced by Decision.ts's decisionDisagreement in ARCH-32 T5`.
  4. Confirm the round-trip property (INV-QD-096) and goldens still pass.
- **Tests:** the ten-case table (red-first) and the corrected fixtures.
- **Verify:** `pnpm vitest run packages/core/test/SinkCodec.test.ts packages/core/test/DecisionWire.test.ts packages/core/test/DecisionSinkForwarding.test.ts packages/http/test packages/audit/test packages/devtools/test/model/Source.test.ts`.
- **Done when:** all pass. T1 can ship alone as an `@qadi/core` patch: changeset `"@qadi/core": patch`, "`decodeSinkRecord` refuses a
  decision whose verdict, fields, obligations or reason contradict its own trace, or whose ids or policy tag contradict its record".

### T2 — Test-first: a disclosed seed that contradicts its trace is dropped (defect C6)
- **Status:** [x] done (2026-10-08): red tests in HydrationPayload.test.ts; the private `disclosureAgrees` patch was skipped, T6 landed in the same change
- **Depends on:** T0. No decision (D-32-f's recommendation is today's `MalformedEntry`; if B is chosen, T6 renames it).
- **Files:** `packages/react/test/HydrationPayload.test.ts`, `packages/react/src/HydrationEngine.ts`.
- **Steps:**
  1. Add four tests (H1–H4 from `probe-hydrate.mts`): a v2 payload for subject `u1`, policy `hasRole("admin")`, one entry each; call
     the file's existing `hydrate(payload, who, { onDropped })` helper (`HydrationPayload.test.ts:92-99` shows the pattern) with an `onDropped` collector.
     Assert zero seeded and one drop `{ reason: "MalformedEntry" }`. **Red** on all four.
  2. Add the control: the same four entries built by `dehydrateEntry` from a real `evaluate` with `includeTrace: true` still seed.
  3. Fix, minimally: replace `disclosesItsOwnPolicy` (`:249-250`) with a private `disclosureAgrees(entry, policy)` that keeps the root-tag
     check and adds, for `Disclosed`: `Allow` ⇒ `trace.allowed === true`, `visibleFields`/`obligations` equal the trace root's
     (`Schema.toEquivalence`); `Deny` ⇒ `trace.allowed === false` and `reason === (trace.reason ?? "denied")`. Comment it
     `// replaced by @qadi/core's decisionDisagreement in ARCH-32 T6`.
- **Tests:** four red-first drops and one control.
- **Verify:** `pnpm vitest run packages/react/test/HydrationPayload.test.ts packages/react/test/Hydration.test.ts packages/react/test/HydrationEngine.test.ts`.
- **Done when:** all pass. Shippable alone: changeset `"@qadi/react": patch`.

### T3 — Core: the one constructor, and constructors that derive from the trace
- **Status:** [x] done (2026-10-08): makeDecision copies the root with allowed:false for a denial (no `as`-free zero-copy form)
- **Depends on:** T1, D-32-b (= C), D-32-c.
- **Files:** `packages/core/src/Decision.ts`, `packages/core/src/Evaluate.ts`, `packages/core/test/Decision.test.ts`,
  `packages/core/test/Decision.tst.ts` (*new*), and every test site in §1's list.
- **Steps:**
  1. In `Decision.ts`, after `Trace`/`TraceSchema`: `export type AllowingTrace = Trace & { readonly allowed: true }`,
     `export type DenyingTrace = Trace & { readonly allowed: false }`, `export const isAllowingTrace = (t: Trace): t is AllowingTrace => t.allowed`,
     `export const isDenyingTrace = (t: Trace): t is DenyingTrace => !t.allowed`, and
     `export interface DecisionStamp { readonly evaluationId: string; readonly subjectId: SubjectId; readonly durationMillis: number }`.
     Each with a one-line summary doc first, then the why (AGENTS.md doc-comment shape).
  2. Rewrite `Allow` (`:88-102`) and `Deny` (`:104-110`): the `Data.TaggedClass` field types keep `visibleFields`, `obligations`, `reason`;
     `trace` narrows to `AllowingTrace`/`DenyingTrace`; each gains `constructor(args: DecisionStamp & { readonly trace: AllowingTrace })`
     (resp. `DenyingTrace`) calling `super({ ...args, visibleFields: args.trace.visibleFields, obligations: args.trace.obligations })`
     (resp. `reason: args.trace.reason ?? "denied"`). The `"denied"` fallback moves here from `Evaluate.ts:314`, its only home; its doc
     says it exists for a foreign trace with no reason, since an evaluated denial always carries one (`Trace.reason` doc).
  3. `export const makeDecision = (stamp: DecisionStamp, trace: Trace): Decision`. Prefer the zero-copy form: first write a scratch
     `tsprobe` in which the two guards narrow both branches (`isAllowingTrace(trace) ? new Allow(…) : isDenyingTrace(trace) ? new Deny(…) : …`
     needs a third arm, so instead try declaring the local parameter as `AllowingTrace | DenyingTrace` and accepting `Trace` through one
     guard). If no `as`-free zero-copy form type-checks, use `new Deny({ ...stamp, trace: { ...trace, allowed: false } })` in the false
     branch (shown to type-check in `tsprobe-verdict.mts`; one shallow copy of the root per denial). Record which in §10.
  4. `Evaluate.ts:300-315` becomes `const decision = makeDecision({ evaluationId, subjectId: question.subject.id, durationMillis }, trace)`;
     drop the now-unused `Allow`/`Deny` value imports.
  5. Migrate every test site in §1's list: a fixture that passed `visibleFields`/`obligations` puts them on its trace; a shared constant
     `allowTrace: Trace` becomes `AllowingTrace` (and `denyTrace` `DenyingTrace`); a helper with a `trace?: Trace` option (devtools
     `helpers.ts:52-80`) takes `AllowingTrace`/`DenyingTrace`. Where a site exists only to make a decision from a trace, use
     `makeDecision`. Do not weaken any assertion.
  6. `Decision.tst.ts`: `@ts-expect-error` on `new Allow({ …stamp, trace, visibleFields: [] })`, on `new Allow({ …stamp, trace: t as Trace-typed variable })`
     (declare `const t: Trace = …`, no `as`), and on `new Deny({ …stamp, trace: allowing })`; `expect(makeDecision(stamp, t)).type.toBe<Decision>()`;
     `Allow["visibleFields"]` is still `VisibleFields`.
  7. `Decision.test.ts`: `makeDecision` on an allowing trace with fields and duties gives an `Allow` equal (`Equal.equals`) to a second build;
     on a denying trace with and without `reason` gives `reason` and `"denied"`; `JSON.stringify` of an `Allow` still carries `visibleFields`.
- **Tests:** as above; every migrated suite stays green unmodified in its assertions.
- **Verify:** `pnpm typecheck && pnpm test:tstyche && pnpm vitest run packages/core packages/react packages/devtools packages/http packages/audit features`.
- **Done when:** typecheck and all suites pass, and `grep -rnE 'new (Allow|Deny)\(' packages/*/src` lists only `Decision.ts`.

### T4 — Core: the agreement rule, once
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3, D-32-e (the union's members), D-32-g.
- **Files:** `packages/core/src/Decision.ts`, `packages/core/test/DecisionAgreement.test.ts` (*new*).
- **Steps:**
  1. In `Decision.ts`: `export type DecisionDisagreement = "Verdict" | "VisibleFields" | "Obligations" | "Reason" | "DenyObligations" | "EvaluationId" | "SubjectId" | "PolicyTag"`
     (all eight even though the decision-level check uses five: the closed union is the whole vocabulary of disagreement, and the record-level
     three are raised by `SinkCodec.ts` from the same type).
  2. `export type DecisionClaim = { readonly verdict: "Allow"; readonly visibleFields: VisibleFields; readonly obligations: ReadonlyArray<Obligation> } | { readonly verdict: "Deny"; readonly reason: string; readonly obligations: ReadonlyArray<Obligation> }`
     — what a value claims beside its trace (a wire decision, a disclosed seed). A seed's `Deny` claim passes `obligations: []`.
  3. `export const decisionDisagreement: (claim: DecisionClaim, trace: Trace) => DecisionDisagreement | undefined`, a module-scope
     `Match.type<DecisionClaim>()` on `verdict` (`Match.discriminatorsExhaustive("verdict")` or `Match.when` per literal + `Match.exhaustive`).
     Allow arm: `!trace.allowed` → `"Verdict"`; fields not `fieldsEquivalence` → `"VisibleFields"`; obligations not `obligationsEquivalence`
     → `"Obligations"`. Deny arm: `trace.allowed` → `"Verdict"`; `claim.obligations.length > 0` → `"DenyObligations"`;
     `claim.reason !== (trace.reason ?? "denied")` → `"Reason"`. The two equivalences are module-scope consts from `Schema.toEquivalence`
     (C13). Doc: the first disagreement in that fixed order is reported, so a reporter is deterministic.
  4. Tests: a per-arm table (each of the five decision-level members produced by exactly one minimal mutation of an agreeing claim);
     `undefined` vs `[]` fields disagree (INV-QD-004); obligations differing only inside nested `attributes` disagree; an evaluated
     decision (`evaluate` over `policyArbitrary()`, a subject arbitrary) read back as a claim always agrees (property, `FastCheck.assert`).
- **Verify:** `pnpm vitest run packages/core/test/DecisionAgreement.test.ts`; `pnpm circular`.
- **Done when:** the tests pass and madge reports no cycle.

### T5 — The record codec reads through the one constructor and the one rule
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1, T4, D-32-d (= A), D-32-e (= A), D-32-g (= A).
- **Files:** `packages/core/src/DecisionWire.ts`, `packages/core/src/SinkWire.ts`, `packages/core/src/SinkCodec.ts`,
  `packages/core/test/SinkCodec.test.ts`, `packages/core/test/DecisionWire.test.ts`, `packages/core/test/Errors.tst.ts`,
  `packages/devtools/src/model/Source.ts`, `packages/devtools/test/model/Source.test.ts`, `examples/nextjs-newsroom/src/server/api.ts`.
- **Steps:**
  1. `DecisionWire.ts`: `decodeDecision: (wire: DecisionWire) => Result.Result<Decision, DecisionDisagreement>`. Each arm builds its
     `DecisionClaim`, calls `decisionDisagreement(claim, wire.trace)`, fails with it, else returns
     `Result.succeed(makeDecision({ evaluationId, subjectId: makeSubjectId(wire.subjectId), durationMillis }, wire.trace))`. Doc: the
     disagreement rule is `Decision.ts`'s; this module only shapes the claim.
  2. `SinkWire.ts`: `DecodeRefusal` gains `Inconsistent: { readonly disagreement: DecisionDisagreement }` (full union edit; its doc list gains
     the member: "a well-formed version-2 record whose decision contradicts its own trace, or whose ids or policy tag contradict its decision;
     a producer that built a decision by hand, or tampering"). `import type { DecisionDisagreement } from "./Decision.ts"`; correct the module
     doc's "imports only `effect`".
  3. `SinkCodec.ts`: `rebuildOutcome`/`rebuild` return `Result`: in the `Decision` arm, check `wire.evaluationId`/`wire.subjectId` against the
     decided decision's and `wire.policy._tag` against `trace.policyTag` (`"EvaluationId"`, `"SubjectId"`, `"PolicyTag"`), then `decodeDecision`.
     `decoded` maps a failure to `notDecodable(DecodeRefusal.Inconsistent({ disagreement }))`. Delete T1's private `contradiction`.
     Update `decodeSinkRecord`'s doc ("rebuilt into record classes" → "… and refused as `Inconsistent` when a decision contradicts itself").
  4. T1's table now asserts `refusal._tag === "Inconsistent"` and the exact `disagreement` per case (A1/D1 `Verdict`, A2/A3 `VisibleFields`,
     A4 `Obligations`, D2 `Reason`, D3 `DenyObligations`, R1 `EvaluationId`, R2 `SubjectId`, R3 `PolicyTag`).
  5. `@qadi/devtools` `model/Source.ts`: `MalformedReason` (`:316`) gains `"inconsistent"`; `reasonOf` (`:268-275`) gains
     `Inconsistent: (): MalformedReason => "inconsistent"`; its doc block (`:300-315`) explains it. Add a `Source.test.ts` case: a frame
     carrying an A1 record is dropped with `"inconsistent"`.
  6. Newsroom `server/api.ts:192-202`: `Inconsistent: (refusal) => \`a decision record that contradicts its own ${refusal.disagreement}\``
     (400, as `Malformed`).
  7. `Errors.tst.ts`: pin `DecodeRefusal["_tag"]` as the five-member union.
- **Verify:** `pnpm vitest run packages/core/test/SinkCodec.test.ts packages/core/test/DecisionWire.test.ts packages/devtools/test/model/Source.test.ts packages/audit/test`;
  `pnpm typecheck`; `pnpm test:tstyche`; `pnpm circular`.
- **Done when:** all pass; `grep -rn "new Allow\|new Deny" packages/core/src/DecisionWire.ts` is empty.

### T6 — Hydration reads through the one rule
- **Status:** [x] done (2026-10-08)
- **Depends on:** T2, T4, D-32-f.
- **Files:** `packages/react/src/HydrationEngine.ts`, `packages/react/test/HydrationPayload.test.ts`.
- **Steps:**
  1. Replace T2's private `disclosureAgrees` with `entryAgrees(entry, policy)`: the root-tag check (unchanged), then for `Disclosed`
     `decisionDisagreement(claim, disclosure.trace) === undefined`, the claim built from the entry (`Allow`: its `visibleFields`/`obligations`;
     `Deny`: `disclosure.reason`, `obligations: []`). Keep `MalformedEntry` (D-32-f = A); if D-32-f = B, add `"InconsistentEntry"` to
     `ClientHydrationDropReason` **and** `hydrationDropReasons` (`HydrationMetrics.ts:63-119`) together, and coordinate with ARCH-37's
     meanings table.
  2. Update `HydrationEngine.ts`'s module doc and `rebuild`'s neighbour doc: a disclosed seed agrees with its trace (INV-QD-NEXT).
- **Verify:** `pnpm vitest run packages/react/test`.
- **Done when:** T2's tests pass unmodified.

### T7 — Properties: a decoded decision agrees with its trace
- **Status:** [x] done (2026-10-08)
- **Depends on:** T5, T6.
- **Files:** `packages/core/test/SinkCodec.test.ts`, `packages/core/test/DecisionAgreement.test.ts`, `packages/react/test/HydrationPayload.test.ts`.
- **Steps:**
  1. Core, `DecisionAgreement.test.ts`: over `traceArbitrary(6)` (`TraceOracle.ts`) and arbitrary stamps, `makeDecision(stamp, t)` satisfies
     `decisionDisagreement(claimOf(d), d.trace) === undefined` and `isAllowed(d) === t.allowed`.
  2. Core, `SinkCodec.test.ts`, "a decoded decision agrees with its trace, or is refused": generate a record from `evaluate` (as the
     existing round-trip property does), encode it, then apply one of nine mutations to the JSON (flip `_tag` with its verdict fields,
     flip `trace.allowed`, replace `visibleFields`, drop/omit `visibleFields`, add/remove an obligation on either side, change `reason`,
     add Deny `obligations`, change the decision's `evaluationId`/`subjectId`, change the root `policyTag` to another `POLICY_TAGS` member).
     Assert: the unmutated input decodes and agrees; each mutated one is `Inconsistent` (or `Malformed` where the mutation breaks the
     schema, e.g. an `Allow` given `reason`), never accepted. `FastCheck.assert(..., { numRuns: 200 })`.
  3. React, `HydrationPayload.test.ts`: the existing differential (INV-QD-059) gains a mutated-disclosure arm: a disclosed entry whose trace
     root is mutated in one duplicated field is dropped `MalformedEntry`.
- **Verify:** `pnpm vitest run packages/core/test/SinkCodec.test.ts packages/core/test/DecisionAgreement.test.ts packages/react/test/HydrationPayload.test.ts`.
- **Done when:** the properties pass at their run counts and kill the mutants named in T10.

### T8 — Gate the one constructor (D-32-h)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T5, D-32-h (= A).
- **Files:** `scripts/check-house-style.mjs`.
- **Steps:**
  1. Add `{ id: "no-decision-constructor-outside-decision", re: /\bnew\s+(?:Allow|Deny)\s*\(/, message: "A Decision is built from its trace by makeDecision (packages/core/src/Decision.ts), never field by field.", raw: true }`
     to `RULES` beside `no-refusal-annotation-outside-core` (`:241-254`), with a comment in that rule's style (why, and ARCH-32), and
     `"packages/core/src/Decision.ts": ["no-decision-constructor-outside-decision"]` to `EXEMPTIONS`. Check `new SeededAllow(` does not
     match (it does not: `\bnew\s+Allow` needs `Allow` right after the whitespace).
  2. Prove it: add `new Allow(` to a scratch copy of `Evaluate.ts` scanned by the script's file walker (or temporarily on the branch,
     reverted), confirm gate 4 fails, revert.
  3. Optional, maintainer's approval: one sentence in AGENTS.md §2 or §4 naming the rule; otherwise the rule's comment only.
- **Verify:** `node scripts/check-house-style.mjs`.
- **Done when:** passes on the branch and fails on the probe.

### T9 — Spec, ADRs, overview, traceability, CCR, docs, changesets
- **Status:** [x] done (2026-10-08): INV-QD-170, ADR-QD-106, CCR-QD-301; spec gates 11-14 pass
- **Depends on:** T3–T8, D-32-i.
- **Files:** `spec/decisions/NNN-a-decision-is-constructed-from-its-trace.md` (*new*), `spec/decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md`,
  `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md`, `spec/behaviors/05-evaluator.md`, `spec/behaviors/25-inspection.md`,
  `spec/behaviors/19-hydration.md`, `spec/behaviors/27-devtools-timeline.md`, `spec/behaviors/24-decision-sink.md`, `spec/behaviors/33-audit-pipeline.md`,
  `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md` (CCR and ADR registers),
  `apps/website/src/content/docs/docs/packages/devtools.md`, `.../packages/audit/capabilities.md`, `.../reference/upgrading.md`,
  `packages/devtools/README.md`, `packages/audit/README.md`, `.changeset/*` (*new*).
- **Steps:** every edit in §8, then:
  1. `node scripts/check-api-surface.mjs` (gate 13).
  2. `node scripts/check-doc-examples.mjs` (BEH-QD-039 and any new ` ```typescript ` fence).
  3. Changesets: `@qadi/core` **minor, breaking** (constructors, `decodeDecision`'s signature, `DecodeRefusal` gains `Inconsistent`; new
     exports); `@qadi/react` patch (T2/T6 drops); `@qadi/devtools` minor (`MalformedReason` gains `"inconsistent"`, breaking for exhaustive
     consumers); no `@qadi/audit` changeset unless its README/docs ship in the package (they do not change behavior).
- **Verify:** `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates`.
- **Done when:** all four pass.

### T10 — Full gate
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T1–T9.
- **Files:** none.
- **Steps:**
  1. `pnpm check`. In `stryker.config.mjs` (core) the arms of `decisionDisagreement`, the `"denied"` fallback in `Deny`'s constructor,
     `makeDecision`'s branch and each `SinkCodec` envelope comparison must be killed by T4/T5/T7; in `stryker.react.mjs` the
     `entryAgrees` comparisons by T2/T7; in `stryker.devtools.mjs` the new `reasonOf` arm by T5's `Source.test.ts` case.
  2. A survivor is a missing test (add it) or a recorded finding, never suppressed (ADR-QD-076).
- **Verify:** `pnpm check`.
- **Done when:** green.

### T11 — Update the tracker
- **Status:** [x] done (2026-10-08)
- **Depends on:** T10.
- **Files:** this plan (frontmatter `status`, task boxes, §10). The orchestrator owns `.planning/architecture/README.md`'s row.
- **Steps:** set `status`, tick tasks, record commit SHAs, the ADR/CCR/INV numbers assigned, and T3 step 3's chosen form.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-32-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Replace, don't layer.** The agreement rule is tested **once**, per arm, in `DecisionAgreement.test.ts` (T4). The codec and hydration
  tests assert only their own adapter facts: that a disagreement is refused, with which refusal or drop reason, and that nothing else
  changed. T1/T2's local checks are deleted in T5/T6, not kept beside the shared rule.
- **Survive unchanged in assertion:** every round-trip, golden (save `V2_DECIDED_ALLOW`'s trace, C10), INV-QD-096/097/098 property,
  `Source.test.ts`, `AuditEntry.test.ts`, the newsroom e2e decode check (`e2e/decision-log.spec.ts:74`) and the INV-QD-059 differential.
  T3 migrates ≈44 constructor sites in shape only; a migrated test that would need a changed expectation is a finding, not an edit.
- **Moved:** `Evaluate.ts`'s `"denied"` fallback is now `Deny`'s constructor's, and its existing coverage (a hand-built trace without a
  reason) moves to `Decision.test.ts`.
- **New:** T1 ten-case table (red-first), T2 four drops (red-first) plus control, T3 type tests (`Decision.tst.ts`) and constructor tests,
  T4 per-arm table plus "evaluated decisions agree" property, T5 refusal-tag table and devtools drop case, T7 three properties.
- **Property / differential:** T7's "decoded decision agrees with its trace, or is refused" is INV-QD-NEXT's enforcement; T4's
  "evaluate agrees" is its in-process half; T7.3 extends INV-QD-059's differential.
- **Mutation:** core, react and devtools Stryker configs (T10). Module-scope `Match.type` builds are static under `ignoreStatic`; the arms
  are per-call and pinned by the per-arm table.

## 8. Spec and documentation updates

- **ADR-QD-NEXT** (new, D-32-i = A), "A decision is constructed from its trace": context (§1 C1–C10), decision (D-32-b C, D-32-c A,
  D-32-d A, `makeDecision`, `decisionDisagreement` and its two adapters), alternatives (getters, rejected by C14; v3, D-32-a), consequences
  (breaking constructors; the forged-vs-contradictory distinction of C11).
- **ADR-QD-096:** dated amendment (CCR-QD-NEXT). A version-2 decision whose copies disagree is refused as `Inconsistent`; acceptance
  tightened without a version bump, under the DecisionWire-union and CCR-QD-139 precedents, because no producer writes such a record.
  Add: "The next wire version, whatever moves it, omits the decision's duplicated fields (`visibleFields`, `obligations`, `reason`, a
  Deny's `obligations`, the decision's `evaluationId`/`subjectId`)" — with the audit-retention and hydration-derivation reasons it is not
  done now (D-32-a).
- **ADR-QD-078:** dated amendment: a `Disclosed` seed must agree with its trace (verdict, fields, obligations, reason) as well as name its
  policy; dropped as `MalformedEntry`.
- **BEH-QD-039** (`05-evaluator.md`): the `ts` fence gains `AllowingTrace`, `DenyingTrace`, `DecisionStamp`, `makeDecision`,
  `DecisionDisagreement`, `decisionDisagreement`; new REQUIREMENT: "A `Decision`'s verdict, `visibleFields`, `obligations` and `reason`
  MUST be those of its trace root; a decision is built from a stamp and a trace and from nothing else."
- **BEH-QD-199/200** (`25-inspection.md`): the refusal comment lists `Inconsistent { disagreement }`; new REQUIREMENT: "`decodeSinkRecord`
  MUST refuse a decision record whose decision contradicts its own trace, or whose `evaluationId`, `subjectId` or policy tag contradict its
  decision, as `Inconsistent`, naming the first disagreement."
- **BEH-QD-204** (`27-devtools-timeline.md`): `MalformedReason` gains `"inconsistent"`.
- **BEH-QD-146/148** (`19-hydration.md`): a disclosed seed that contradicts its trace is dropped as `MalformedEntry`.
- **BEH-QD-187** (`24-decision-sink.md`) and **BEH-QD-312** (`33-audit-pipeline.md`): one sentence each, a read-back can be refused as `Inconsistent`.
- **Invariants:** new **INV-QD-NEXT "A decision agrees with its trace"**: a decision's verdict, fields, obligations and reason are its
  trace root's; a decoded record's ids and policy tag are its decision's; a disclosed seed agrees with its disclosure. Source: `Decision.ts`
  (`makeDecision`, the constructors, `decisionDisagreement`), `DecisionWire.ts`, `SinkCodec.ts`, `HydrationEngine.ts`. Enforcement:
  `Decision.tst.ts`, `DecisionAgreement.test.ts`, T7's properties. Related: INV-QD-004, -022, -059, -096, -098, -103. INV-QD-022's Source gains
  the agreement check; INV-QD-096's Enforcement notes the corrected golden.
- **`spec/overview.md`** (gate 13): extend the `:153` row with `AllowingTrace`, `DenyingTrace`, `isAllowingTrace`, `isDenyingTrace`,
  `DecisionStamp`, `makeDecision`, `DecisionClaim`, `DecisionDisagreement`, `decisionDisagreement`; `:303` `decodeDecision` now returns a
  `Result`; the `DecodeRefusal` prose (`:460-470`) and `:308` row gain `Inconsistent`; `:755` `MalformedReason` gains `"inconsistent"`;
  bump the revision row.
- **Traceability:** `DecisionAgreement.test.ts`, `Decision.tst.ts` → INV-QD-NEXT, BEH-QD-039; `SinkCodec.test.ts` gains INV-QD-NEXT,
  BEH-QD-199; `HydrationPayload.test.ts` gains INV-QD-NEXT, BEH-QD-146.
- **CCR register** (`spec/README.md`): CCR-QD-NEXT listing every file above; ADR register row for ADR-QD-NEXT.
- **Docs:** devtools README/website page (`"inconsistent"`), audit README/capabilities (a row can be refused as `Inconsistent`),
  `reference/upgrading.md` (constructors take `(stamp, trace)`; `decodeDecision` returns a `Result`; exhaustive `DecodeRefusal` matchers
  need an `Inconsistent` arm).
- **Changesets:** as T9.

## 9. Risks and rollback

- **Fixture churn (≈44 sites, 21 files).** Mechanical, but a migrated test whose expectation must change means the old test was asserting
  on a contradictory decision; record each such case in §10 rather than adjusting silently.
- **A stored audit row or forwarded record that is contradictory.** Only a hand-built decision could produce one (C9), so production trails
  are unaffected; a test-data store seeded from the old `V2_DECIDED_ALLOW` golden would now be refused. Mitigation: the upgrading note.
- **Exhaustive matchers in consumer code** over `DecodeRefusal` and `MalformedReason` stop compiling (D-32-e). Intended (closed union),
  and named in the changeset as breaking.
- **`Allow.trace` narrows to `AllowingTrace`.** Readers compile (subtype). A consumer that *assigns* an `Allow`'s trace slot from a plain
  `Trace` breaks; none in-repo.
- **A shallow root copy per denial** if T3 step 3 falls back to the spread. Negligible next to the walk; `Equal`-based tests unaffected.
  Measure with `pnpm bench` (`Evaluate.bench.ts`) only if the zero-copy form is not found, and record it.
- **Overlap churn.** ARCH-30 (Qadi.ts, ObligationRecord) and ARCH-39 (`enforceProjected` reads `visibleFields`) read the fields this plan
  makes derived; they keep compiling because the field names are unchanged. ARCH-37 owns hydration drop meanings; D-32-f = A avoids
  touching them. Whichever of ARCH-32/ARCH-30 lands second rebases.
- **Rollback.** T1 and T2 are independent patches and revert alone. T3–T8 revert together (one PR); `makeDecision` and the predicates are
  additive, the constructor change is not, so a partial revert of T3 alone is not possible without restoring the fixtures.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence verified at `e635e68` with five runtime probes and two type probes | planner |
| 2026-10-08 | T0 | worktree branch `worktree-agent-a72646480607ca4af` from `2d3dac6`; ARCH-30 moved the two construction sites to `Lifecycle.ts` (`Evaluate.ts` no longer builds decisions); `new Allow(`/`new Deny(` in src: `Lifecycle.ts` x2, `DecisionWire.ts` x2 as expected | impl agent |
| 2026-10-08 | T1 | red: `SinkCodecAgreement.test.ts` ten cases A1-A4, D1-D3, R1-R3 all failed (accepted) before the fix; private `contradiction` patch skipped, folded into T3-T5 | impl agent |
| 2026-10-08 | T2 | red: `HydrationPayload.test.ts` "a Disclosed seed that contradicts its own trace is dropped (ARCH-32)" H1-H4 failed (seeded); patch folded into T6 | impl agent |
| 2026-10-08 | T3 | `Allow`/`Deny` constructors take `(stamp, trace)`; `makeDecision` copies the root with `allowed:false` for a denial; `Decision.tst.ts`; ~45 fixture sites migrated; `V2_DECIDED_ALLOW` trace gains its duty (one line); property fixtures retag the generated trace root to the generated policy | impl agent |
| 2026-10-08 | T4 | `decisionDisagreement` + `DecisionAgreement.test.ts` (21 tests incl. evaluate property) | impl agent |
| 2026-10-08 | T5 | `decodeDecision` returns `Result`; `DecodeRefusal.Inconsistent`; devtools `"inconsistent"`; newsroom `refusedBecause` arm | impl agent |
| 2026-10-08 | T6 | `entryAgrees` replaces `disclosesItsOwnPolicy`, `MalformedEntry` kept | impl agent |
| 2026-10-08 | T7 | properties in `SinkCodecAgreement.test.ts` and `HydrationPayload.test.ts`; `DecisionAgreement.test.ts` | impl agent |
| 2026-10-08 | T8 | `no-decision-constructor-outside-decision` added; probe `new Allow(` in `Lifecycle.ts` failed gate 4, reverted | impl agent |
| 2026-10-08 | T9 | ADR-QD-106 (new), 096/078 amended, BEH-QD-039/199/204/146-148/187/312, INV-QD-170, overview, traceability, CCR-QD-301 (numbers offset per brief), changeset, docs. Gates run: typecheck, lint, circular, tstyche, api, examples, verify:strict, dod, claims, website-examples, test:bdd, full vitest. Not run: mutation, `pnpm check`, e2e | impl agent |
| 2026-10-08 | T11 | commit `ad11426` | impl agent |
