# Phase 90: The remaining per-port facts live on the port description - Research

**Researched:** 2026-11-26
**Domain:** Effect v4 type-level registry derivation (TypeScript 6.0.3), import-cycle control (madge), a hot-path routing change guarded by an A/B bench gate
**Confidence:** HIGH for the spike verdicts and the type shapes (each was compiled or run on a scratch copy and its output is quoted below); MEDIUM for the bench verdict (the gate is deliberately not run here, only its constraints are recorded).

<user_constraints>
## User Constraints (from 90-CONTEXT.md)

The owner's standing instruction (2026-11-22), which governs every choice below: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". Breaking changes are allowed with a changeset and an upgrade note. Source compatibility is never the tiebreaker.

### Locked Decisions (D-01 .. D-27, summarised faithfully; `90-CONTEXT.md` is the verbatim text and wins on any wording)

- **D-01 .. D-05 (binding, carried from Phase 85):** work only on branch `arch-wave-16`; no merge, push, tag, release, publish or `changeset version`; never `git add -A` under `.planning/milestones`; never stage `.planning/config.json`, `README.md`, `.agents/`, `.codex/`, `.planning/state.json`, `assets/`, `*.iter*.md`. Use only the reserved ids ARCH-137, ADR-QD-203, CCR-QD-482, BEH-QD-786..790, INV-QD-425..426; never run `node scripts/next-id.mjs`; pass `--date 2026-11-26` to `scripts/spec-revise.mjs`; review-round spec fixes go in place with no second bump. Every behaviour change is preceded by a test written on the base; every new check is shown failing once (`90-RED-EVIDENCE.md`); `pnpm check:pr < /dev/null` is green at the end. One `.changeset/*.md` for `@qadi/core`, a **Breaking** minor. Every commit ends with exactly the owner's trailer line.
- **D-06:** plan 1 is the spike (PFACT-01), run on scratch copies (never the main tree), judged by `madge --circular --extensions ts,tsx packages/*/src`, `tsc -b`, and for routing the bench gate. Candidates (a) `PORT_NAMES` tuple, (b) span as a type parameter with `PortSpanName`/`PortSpanOf` moved to `Ports.ts`, (c) `DistinctSpanNames<R>`, (d) the `fixture` member, (e) `PortServing` derived (expected to cycle), (f) `PortAccess.ts` importing `LeafNeeds.ts` as a value with `ScopedLeafTag`/`ScopedPort` derived, (g) the routing `readScoped`. A recorded subset is acceptable; a cycle is not.
- **D-07:** `PortName.ts` holds `export const PORT_NAMES = ["AttributeResolver","DecisionHistory","RelationshipResolver","CustomPredicate","SignatureHistory"] as const;` and `export type PortName = (typeof PORT_NAMES)[number];`, still import-free, in today's order. `PORT_NAMES` is public (gate 13: 942 to 943). Rejected: unexported tuple, `[name, span]` pairs, `PortName` from `keyof PortTypes`, a named barrel re-export.
- **D-08:** `PortMetrics.ts` deletes `PORT_NAMES_BY_NAME` and the local `PORT_NAMES`, reads the leaf's tuple in all four `preregisteredWords`, keeps every metric id and description byte-identical; `PredicatePortName` becomes `const PREDICATE_PORT_NAMES = ["AttributeResolver","DecisionHistory"] as const satisfies ReadonlyArray<PortName>` with `type PredicatePortName = (typeof PREDICATE_PORT_NAMES)[number]`, unexported tuple.
- **D-09:** `interface PortSpans` is deleted. `PortDescription` gains `SpanName extends \`qadi.${string}\` = \`qadi.${string}\`` after `Asks` and `span: SpanName`; each port module spells its span literal once (by `typeof` a module-private const, or by inference through `makePortDescription`); `PortSpanOf<N> = PortTypes[N]["span"]` and `PortSpanName = PortSpanOf<PortName>` move to `Ports.ts`; `DescriptionOf<K>` passes `PortSpanOf<K>`. No span literal enters `PortAccess.ts`, `PortDerivation.ts` or `PortCalls.ts`.
- **D-10:** a generic `DistinctSpanNames<R>` (`unknown` when every entry has a literal span and no two share one, else `never`), exported from package-private `PortDerivation.ts`, applied as `PORTS: PortTypes = { … } satisfies DistinctSpanNames<PortTypes>`; the `.d.ts` still reads `PORTS: PortTypes`.
- **D-11:** `PortDescription` gains a required `fixture: (data: FixtureData) => Layer.Layer<Self>` with a last type parameter `FixtureData = never`; each port states its existing builder (by reference after reordering, or through a thunk); `CustomPredicate` takes the answers-to-functions arrow from `Ports.ts:265-266`; `Ports.ts` derives `PortFixtureData` as a mapped type and `PORT_FIXTURES` through `tabulatePorts`; `fixturePortsLayer` reads `d.fixture`; `DescriptionOf<K>` passes `PortFixtureData[K]`. Rejected: optional `fixture`, keeping both tables.
- **D-12:** `PortServing`, `PortServingOf`, `PortServingFacet` stay byte-identical and `PortServing.ts` stays a leaf; ADR-QD-114 is not amended.
- **D-13:** `PortTypes`, `PORTS`, `tabulatePorts`' five rows and `mergePorts`' five arguments stay written out; a born runtime row pins that `forEveryPort((d) => d.port)` and `Object.keys(tabulatePorts(...))` equal `PORT_NAMES`; `Ports.tst.ts`'s "`keyof PortTypes` is `PortName`" stays held.
- **D-14:** in `PortAccess.ts`, `ScopedLeafTag` is every leaf tag whose `LEAF_NEEDS` `resourceId` is not `"Never"`, and `ScopedPort` is every `PortName` whose `asks` has a key in `ScopedLeafTag`; `completeRequest` stays a mapped type over `ScopedPort`. Fallback if it does not compute: derive structurally.
- **D-15:** `readScoped` keeps its name and becomes the one function every scoped read calls: `readScoped(d, interpreter, leaf, request, relation)`; a **hoisted** `Match.type<"Always" | "ByScope">()` over `LEAF_NEEDS[leaf._tag].resourceId` (no `switch`, no tag table, no `Match.value`); not-needed returns `readPort(...)` without a generator; needed runs `requireResourceId`, annotates then fails on a miss (BEH-QD-445's order), `completeRequest` then `readPort` on a hit; a plain function (not `Effect.fn`, not `fnUntraced`); no `as`, `!`, `any`; `RelationshipResolver`'s not-needed branch unreachable by type.
- **D-16:** plan 1 adds two workloads to `Evaluate.bench.ts` before any measurement ("scoped-heavy — allOf of 8 resource-scoped port leaves, id present" and "scoped-heavy — allOf of 8 Any-scoped port leaves"), then runs `scripts/bench/ab.sh` 4 + 4 rounds over every workload and `analyze.mjs`; verdict is the last line `# gate: pass`; recorded in `90-BENCH.md` with the patch SHA-256. If the gate fails, the routing becomes a measured rejection in ADR-QD-203 and the phase reports PFACT-03 **not met**.
- **D-17:** prose that becomes false (`LeafNeeds.ts:44-48`, `ScopedLeaf.ts:8-19`, doc comments in `PortAccess.ts`); `LEAF_NEEDS` rows byte-identical.
- **D-18:** plan 1 commits a born, green-on-base characterisation `packages/core/test/PortFacts.characterisation.test.ts` (facts golden written literally, order, metric words, wire bytes, served bytes, the route table), held byte for byte, with declared regions in `90-pinned-check.mjs`.
- **D-19:** type pins, positive and `not.toBeAssignableTo` only (so `NOT_CALLABLE_PIN_BUDGET` does not move): a born `PortFacts.tst.ts` on the base (`PortFixtureData`, `PortSpanName`, `PortSpanOf<K>`, `PortName`, imported from the barrel), and at the change `PORT_NAMES`, `DistinctSpanNames` over fake records (six-entry positive twin, duplicate, widened), `Omit<PortTypes[K], "fixture"|"span">` not assignable to `DescriptionOf<K>` with a positive anchor, `typeof PORT_FIXTURES`. Seen failing on each D-21 scratch variant.
- **D-20:** declared test edits only: `LeafNeeds.test.ts` 133-160 replaced by a describe titled "a scoped read requires an id exactly where its leaf's row says" (three assertions); `PortName.tst.ts` import moved and third test replaced; `PortDescription.test.ts`'s hand-built `probePort` gains `fixture` and the span-name type argument. Everything else held byte for byte. ADR-QD-203 carries the audit table with the real count.
- **D-21:** seen-failing scratch variants (routing, names, spans, descriptions, registry, scoped ports, literals), each with its failing text in `90-RED-EVIDENCE.md`.
- **D-22:** a fake sixth port without its facts is a compile error: measure the `tsc -b` error set on the base and at the close; `90-check.mjs sixth-port` compares with `90-RED-EVIDENCE.md`.
- **D-23:** `90-check.mjs` (modes `base`, `commit`, `unchanged`, `seen-failing`, `vitest`, `suite`, `scan-ids`, `scan-forbidden`, `trailers`, `records [--close]`, `port-facts`, `scoped-route`, `sixth-port`, `circular`), `90-pinned-check.mjs`, `90-earlier-checks.mjs` (ledger measured in plan 1), `90-mutation.mjs`; each with `--self-test`, each mode seen failing once. A test title names a property, never an id (WX-07).
- **D-24:** mutation base taken on the phase base with one `stryker run stryker.config.mjs --mutate <13 files>` invocation, same invocation at the close; a touched file's score must not fall; static code proved by goldens and the route table; the hoisted matcher's literal mutants are `EXAMINED`; `MOVED` note, no `RENAMED`; `UNMEASURED` empty; core coverage stays at or above 95%.
- **D-25:** ADR-QD-203 new; ADR-QD-094 amended (1.12 to 1.13), ADR-QD-163 amended (1.10 to 1.11), ADR-QD-134 noted (1.1 to 1.2); ADR-QD-114 not amended.
- **D-26:** BEH-QD-786..790 and INV-QD-425..426 as allocated; BEH-QD-588 and BEH-QD-445 restated, INV-QD-288 edited, INV-QD-345 gains a link; AGENTS.md §3, `spec/overview.md`, the registers move with them; ` ```typescript ` fences must compile.
- **D-27:** `.changeset/core-port-facts-on-the-description.md`, a `@qadi/core` **Breaking** minor with the upgrade note.
- **Addendum after research (this document's findings, appended to `90-CONTEXT.md`):** D-16a, D-15a, D-11a, D-09a, D-23a, D-22a, D-20a, D-12a, D-24a. Each is "decided autonomously 2026-11-26" and sharpens or corrects a decision above without reopening it.

### Claude's Discretion

The exact names `DistinctSpanNames`, `ScopedLeafTag`, the hoisted matcher, the characterisation and type-test files, and the new type parameters; whether a span literal is read by `typeof` or inferred through `makePortDescription` (settled here: D-09a); the typing that makes `RelationshipResolver`'s not-needed branch unreachable and whether `RESOURCE_SCOPED` survives (settled here: D-15a); builder reordering versus a thunk (settled here: reorder, D-11a); the plan count and wave split within: plan 1 is the spike, base record, mutation base, characterisation, base type pins, bench workloads and gate of record, sixth-port base set; the routing change lands only after `90-BENCH.md` reads `# gate: pass`; each moved fact lands with its pin in the same commit; the records plan comes last.

### Deferred Ideas (OUT OF SCOPE)

Deriving `PortServing` (rejected for a cycle and a held pin); deriving `tabulatePorts`/`mergePorts` rows from `PORT_NAMES` (TS #30769, pinned by order instead); the fixture judgements reading `LEAF_NEEDS` (port modules cannot import `LeafNeeds.ts` without a cycle); Phase 91 names every export this phase settles (`PORT_NAMES` included) and must re-run `pnpm circular` on 90's end.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (REQUIREMENTS.md) | Research Support |
|----|-------------------------------|------------------|
| PFACT-01 | The spike decides which facts can move without a cycle | P0, P1: baseline green; candidates (a) to (g) each applied on a scratch copy with madge and `tsc -b` output quoted; only (e) cycles (16 cycles) |
| PFACT-02 | `PortName` is derived from one import-free tuple; metrics read it | P1 (a): `PORT_NAMES` compiles, no cycle; the leaf stays import-free; P1 negative control: `PortName.ts` importing `Ports.ts` gives 11 cycles |
| PFACT-03 | `readScoped` routes off the `LEAF_NEEDS` row through a hoisted `Match` | P1 (f), (g), P6: derived `ScopedPort`, the routing `readScoped`, the typing that makes the not-needed branch unreachable, the patch text and size, the bench harness constraints (D-16a) |
| PFACT-04 | Held tests and goldens prove nothing moved; a fake sixth port without its facts is a compile error | P5, P7, P8: fixture member and TDZ, tstyche both passes, the base and close error sets of `"FakePort"`; the characterisation is plan 1's |
| PFACT-05 | Records and the changeset state the result honestly | P11: gate-13 count, spec anchors and revisions, downstream readers; test-removal audit |
| WX-01 | `pnpm check:pr` green | Validation Architecture: quick and full commands; P9 ledger |
| WX-02 | One changeset, Breaking minor where a public shape moves | D-27; P3 shows the `PortDescription` shape change in the `.d.ts` |
| WX-03 | Reserved ids only | Do not run `next-id.mjs`; ids listed in User Constraints |
| WX-04 | Earlier phases' checks keep their reports | P9: the ledger measured at HEAD, rows that move |
| WX-05 | Mutation base and close, no score falls | P10 |
| WX-06 | New checks seen failing | Validation Architecture, scratch variants of D-21 |
| WX-07 | Test titles name properties, never ids | D-20's replacement title; Pitfall 9 |
</phase_requirements>

## Summary

All seven candidates were applied to scratch copies of HEAD `fb0b70d3` (a `git clone`, never the working tree) and judged by madge and `tsc -b`. **Six of seven add no cycle and compile cleanly: (a), (b) on top of (a), (c), (d), (f), (g), and all of them together.** The combined end state also passes the whole core vitest project (85 files, 2797 tests), `scripts/check-house-style.mjs`, oxlint, and both tstyche passes with a new `PortFacts.tst.ts` file. **(e), deriving `PortServing`, cycles (16 cycles) and fails `tsc` (TS2456, TS2502, TS2315), so D-12's recorded subset is a measurement now, not an argument.**

The spike corrected or sharpened seven things the context took from reading, each appended as an Addendum entry to `90-CONTEXT.md`: (1) the bench gate's real band is a **fixed 5% per workload plus a geometric mean of at most +2%**, with a required workloads file, not `max(10%, spread)` (D-16a); (2) `RelationshipResolver`'s not-needed branch **can** be made unreachable by type, through a row-derived `ScopedCall<K>` table whose `bare` is `undefined` exactly when every scoped leaf of the port is `Always`, and reclassifying the row breaks the compile (D-15a); (3) `PORT_FIXTURES` needs a **third `tabulatePorts` overload**, and keeping `FixtureDataOf` unexported keeps gate 13 at 943 (D-11a); (4) the span form that works for all five ports is `typeof` a module-private const, because inference through `makePortDescription` fails for `CustomPredicate` (D-09a); (5) `"qadi.attribute"` is also a span attribute key at `AttributeResolver.ts:113`, so the "each literal appears exactly once" judge must count declarations (D-23a); (6) the fake-sixth-port error set is 53 errors in 22 groups at the base and 57 in 25 at the close, across four packages, and `PortMetrics.ts` does leave it (D-22a); (7) the hand-built `probePort` needs only `fixture` (D-20a).

The routing change is the only candidate whose cost is unmeasured: the bench gate was not run (a hard rule of this research). What is recorded instead is everything plan 1 needs to run it once and correctly: the harness arguments, the workloads-file format, the two new workloads **validated functionally on a scratch copy** (the resource-scoped one decides Allow with `{ id: "doc-1" }`; the Any-scoped one decides Allow only if the signature fixture also holds a resource-less row), and the exact patch.

**Primary recommendation:** Land (a) to (d) and (f) as one chain of commits each with its pin, run the bench gate once on the (g) patch below (4 + 4 rounds, workloads file, `# gate:` line), and only then land (g). Use the `typeof <prefix>SpanName` span form, the reordered-builder `fixture` form, the third `tabulatePorts` overload with `FixtureDataOf` private, and the `ScopedCall<K>` table with `BareOf<K>` for the routing.

## Architectural Responsibility Map

This is a library (no browser, SSR or CDN tier). The tiers that apply are the library's own layers.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Port names (identity) | Import-free leaf `PortName.ts` | `PortMetrics.ts` reads the tuple | A leaf that imports nothing cannot close a cycle; a metric's registry key (ADR-QD-052) must not move with a port's identity |
| Span name, fixture, wire, serving facet, `asks`, fail-closed answer | The port's own module (its `PortDescription`) | `Ports.ts` derives the unions and tables | A fact stated on the description is read through the registry by `infer`, never through a second `Record<PortName, …>` |
| Pairwise-distinct span check | `PortDerivation.ts` (package-private type) | Applied at `PORTS` in `Ports.ts` | The only module that sees every description sits above `PortDescription.ts`, which is where the check must live |
| Scoped read routing | `PortAccess.ts` `readScoped` | `LeafNeeds.ts` (the row), `ScopedLeaf.ts` (the one scope test and the one missing-id test) | The row decides, the leaf's scope refines `ByScope`, and `requireResourceId` stays the one place a missing id is built |
| Fixture-judgement agreement with the route | Port modules (`requireResourceId`) | Born test (D-20) | Port modules cannot import `LeafNeeds.ts` without a cycle (`ScopedLeaf.ts` header), so agreement is a test, not a type |
| Host serving declaration | `PortServing.ts` (hand-written leaf) | Each facet is compile-checked against its slot | Deriving it cycles (P1 (e)) |

## Verification at HEAD (file:line, drift corrected)

HEAD is `fb0b70d3` on `arch-wave-16`. `git status --porcelain -- packages spec scripts features .changeset` prints nothing at the start and at the end of this research.

| Claim in 90-CONTEXT.md | Status | Evidence |
|------------------------|--------|----------|
| `PortName.ts` has `interface PortSpans` with five rows | Confirmed | Quoted from the scratch base: `interface PortSpans {` `readonly AttributeResolver: "qadi.attribute";` `readonly DecisionHistory: "qadi.acted";` `readonly RelationshipResolver: "qadi.hasRelationship";` `readonly CustomPredicate: "qadi.hasCustom";` `readonly SignatureHistory: "qadi.hasSignature";` `}` (base `PortName.ts:19-25`) [VERIFIED: scratch base read] |
| `PortMetrics.ts` has `PORT_NAMES_BY_NAME` and `PredicatePortName` as a hand union | Confirmed | Base text, quoted in the diff: `const PORT_NAMES_BY_NAME: Record<PortName, true> = {` and `export type PredicatePortName = "AttributeResolver" \| "DecisionHistory";` [VERIFIED: diff output] |
| The five span literals each appear in `PortName.ts` and a port module | **Drift: `qadi.attribute` has a third occurrence** | Base grep: `qadi.attribute: PortName.ts:20 AttributeResolver.ts:113 AttributeResolver.ts:177`. Line 113 is `{ attribute: "qadi.attribute", ...sharedQuestionKeys },`, the span attribute key of the question, not the span name. After the change: `AttributeResolver.ts:113` and the new const, two occurrences. The other four literals occur once each after the change [VERIFIED: grep output; D-23a] |
| "gate 13 stays at 942", `PORT_NAMES` makes 943 | Confirmed with a condition | Base: `api-surface: 942 export(s) documented across 9 package(s)`. The end state reports exactly one drift, `PORT_NAMES`, **provided `FixtureDataOf` is not exported**; exported, it is a second drift (`FixtureDataOf is exported by @qadi/core and is not named in spec/overview.md`). Unexporting it compiles with no TS2883 [VERIFIED: probe output; D-11a] |
| `LEAF_NEEDS.resourceId` is read only by `LeafNeeds.test.ts:137` | Confirmed (quoted at `LeafNeeds.test.ts:136-137`) | `for (const f of ALL) {` `const need = LEAF_NEEDS[f.policy._tag].resourceId;`. The describe opens at 133 and is titled `"a row's resourceId is what readScoped does (D-06)"` [VERIFIED: file read] |
| `PortName.tst.ts` third test (32-39) pins `PortDescription<"AttributeResolver", …>["span"]` | Confirmed | Quoted: `PortDescription<"AttributeResolver", unknown, PortShape, [], unknown, unknown>["span"]` `>().type.toBe<"qadi.attribute">();` followed by `{ span: "qadi.acted" }` `not.toBeAssignableTo<Pick<typeof attributeResolverPort, "span">>()` [VERIFIED: file read] |
| `ab.sh` refuses odd and sub-4 round counts | Confirmed | `ab.sh` header: "Exit codes: 2 usage / refused start (a round count that is odd or below 4 among them)"; usage line: `usage: ab.sh <patch> <outdir> <rounds> <head-label> <patched-label> <bench-file> <test-name-pattern>` [VERIFIED: scripts/bench/ab.sh:20,26] |
| The band is `max(10%, the base's spread)` | **False** | `analyze.mjs` header: "A workload is SLOWER when the candidate's delta is strictly greater than MAX_SLOWDOWN, 5%, a fixed band the reference arm's spread never widens (the spread is recorded beside it and decides nothing). The gate passes only when no workload is slower and the geometric mean of the deltas is at most MAX_GEOMEAN_PCT, +2%." Constants: `const MAX_SLOWDOWN = 0.05;` `const MAX_GEOMEAN_PCT = 2;` [VERIFIED: scripts/bench/analyze.mjs:6-10,32-33; D-16a] |
| `Evaluate.bench.ts` has no scoped-leaf workload | Confirmed | The `evaluate` compare group lists 17 benches, from `"one node"` to `"leaf-heavy — allOf of 8, matchers reference neither"`, none built from `hasActed`, `hasRelationship` or `hasSignature`. Its `runtime = ManagedRuntime.make(services)` uses `EvaluationServicesNone`, so a scoped workload needs its own fixture runtime [VERIFIED: packages/core/bench/Evaluate.bench.ts:388-421] |

## Spike evidence (PFACT-01, probes P0 to P8)

Scratch root: `<scratchpad>/r90/`. `base` is `git clone` of HEAD with `node_modules` symlinked and the gitignored `packages/predicate-prisma/prisma/generated` copied in. Every candidate copy is `base` plus one generated edit (`kit/gen.py` flags `a b c d e f`, `kit/g.py` for the routing). **No file under the main tree was edited**; all copies are deleted at the end (see Cleanliness proof).

### P0: baseline (the numbers every verdict is compared with)

| Check | Command (scratch root, stdin closed) | Result [VERIFIED: probe output] |
|-------|--------------------------------------|---------------------------------|
| madge | `madge --circular --extensions ts,tsx packages/*/src` | `✔ No circular dependency found!` |
| tsc (src graph) | `tsc -b tsconfig.json` | `base tsc exit=0` |
| tsc (test graph) | `tsc -p tsconfig.test.json` | no output, exit 0 (needs `prisma/generated`; without it TS2307) |
| core vitest | `vitest run --project core` | `Test Files  85 passed (85)`, `Tests  2797 passed (2797)`, about 6 s |
| house style | `node scripts/check-house-style.mjs` | `house-style: 647 file(s) clean (3 declared switch(es), 81 type-test file(s))` (80 type-test files before the probe file was added) |
| api surface | `node scripts/check-api-surface.mjs` | `api-surface: 942 export(s) documented across 9 package(s)` |

### P1: the verdict table (candidate | edit applied | madge | tsc | verdict)

(b) cannot stand alone: `PortSpans` must leave `PortName.ts` for the span to move, and without (a) `PortSpanName`/`PortSpanOf` are then declared twice. Its verdict is therefore recorded on top of (a), and (b) alone is recorded as the failure it is.

| Candidate | Edit applied (scratch) | madge | tsc -b | Verdict |
|-----------|------------------------|-------|--------|---------|
| (a) `PORT_NAMES` tuple | `PortName.ts` becomes `export const PORT_NAMES = [...] as const; export type PortName = (typeof PORT_NAMES)[number];` (import-free); `PortMetrics.ts` imports it as a value and `PREDICATE_PORT_NAMES = [...] as const satisfies ReadonlyArray<PortName>` | `✔ No circular dependency found!` exit 0 | `tsc errors=0 exit=0` | **Accept** |
| (b) alone | `PortSpans` and `PortSpanOf`/`PortSpanName` moved to `Ports.ts` with no tuple | not run | `packages/core/src/index.ts(42,1) TS2308 Module "./PortName.ts" has already exported a member named 'PortSpanName'` (and `PortSpanOf`), `tsc errors=2` | Reject as a standalone step; it requires (a) |
| (a)+(b) | the span as `SpanName extends \`qadi.${string}\`` on `PortDescription`; `PortSpanOf<N> = PortTypes[N]["span"]` in `Ports.ts`; each port module `const <x>SpanName = "qadi.…"` and `typeof <x>SpanName` as the type argument | `✔ No circular dependency found!` exit 0 | `tsc errors=0 exit=0` | **Accept** |
| (c) `DistinctSpanNames` | the type in `PortDerivation.ts`; `PORTS = { … } satisfies DistinctSpanNames<PortTypes>` | `✔ No circular dependency found!` exit 0 | `tsc errors=0 exit=0` | **Accept** (behavioural proof below) |
| (d) `fixture` member | required `fixture` member and `FixtureData = never`; builders moved above each description and taken by reference; `PortFixtureData` a mapped type; `PORT_FIXTURES = tabulatePorts((d) => d.fixture)` through a third overload | `✔ No circular dependency found!` exit 0 | `tsc errors=0 exit=0` | **Accept** (needs the third overload, P5) |
| (e) derived `PortServing` | `PortServing` derived from the facets, importing `PortTypes` from `Ports.ts` | **`✖ Found 16 circular dependencies!`**, first: `core/src/PortDerivation.ts > core/src/PortDescription.ts > core/src/PortServing.ts > core/src/Ports.ts > core/src/AttributeResolver.ts`; also `core/src/PortServing.ts > core/src/Ports.ts > core/src/AttributeResolver.ts` | `PortServing.ts(49,13): error TS2456: Type alias 'PortServingOf' circularly references itself.` `PortServing.ts(98,23): error TS2502: 'declaration' is referenced directly or indirectly in its own type annotation.` `PortServing.ts(86,35) TS2315 Type 'PortServingOf' is not generic.` (5 errors) | **Reject** (D-12 recorded as a measurement) |
| (f) derived scoped sets | `PortAccess.ts` imports `LEAF_NEEDS` as a value; `ScopedLeafTag`, `ScopedPort` derived (code below) | `✔ No circular dependency found!` exit 0 | `tsc errors=0 exit=0` | **Accept**; the derived sets are `"HasRelationship" \| "HasActed" \| "HasNotActed" \| "HasSignature"` and `"DecisionHistory" \| "RelationshipResolver" \| "SignatureHistory"`, checked by a type-equality probe that compiled (`const leafTags: Eq<ScopedLeafTag, …> = true`) |
| (g) routing `readScoped` | the `ScopedCall<K>` table, hoisted `Match.type`, three call sites reduced to one call (code below) | `✔ No circular dependency found!` exit 0 (on (f)+(g)) | `tsc errors=0 exit=0` | **Accept**, **subject to the bench gate** |
| (a)+(b)+(c)+(d)+(f)+(g) end state | all of the above | `✔ No circular dependency found!` exit 0 | src graph `tsc errors=0`; test graph 3 errors, exactly the declared edits (below), 0 after them | **Accept** |

Negative controls, each a different scratch copy:

- `PortName.ts` importing `Ports.ts` (D-21's registry variant): `✖ Found 11 circular dependencies!` first `core/src/PortDerivation.ts > core/src/PortDefault.ts > core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts`. So the leaf rule is enforced by `pnpm circular`, not remembered [VERIFIED: probe output].
- A hand-written fourth member of `ScopedPort` (D-21's scoped-ports variant): `PortAccess.ts(258,7) TS2741 Property 'AttributeResolver' is missing in type '{ DecisionHistory: { withId: …` (the `scopedCall` table demands the row). Reclassifying `HasAttribute` to `Always`: the same TS2741 at the table. Both prove the derivation asks for a decision [VERIFIED: probe output].
- Reclassifying `HasRelationship` from `Always` to `ByScope` in `LeafNeeds.ts`: `packages/core/src/PortAccess.ts(264,5): error TS2322: Type 'undefined' is not assignable to type '(request: [request: PendingRelationshipCheck]) => [request: RelationshipCheck]'.` So the not-needed branch is unreachable by type for that port, and the row's change is a compile error at exactly the place that must change [VERIFIED: probe output; D-15a].

### P2: the span type-parameter forms and the d.ts

Two forms were compiled.

- **Form (i), `typeof` a module-private const.** `const attributeSpanName = "qadi.attribute";` before the description; the annotation carries `typeof attributeSpanName` and the value says `span: attributeSpanName`. Compiles for all five. The emitted d.ts (quoted from `packages/core/lib/AttributeResolver.d.ts`):

```ts
declare const attributeSpanName = "qadi.attribute";
export declare const attributeResolverPort: PortDescription<"AttributeResolver", AttributeResolver, AttributeResolverShape, [
    subjectId: SubjectId,
    attribute: string
], unknown, AttributeResolveError, [
    subjectId: SubjectId,
    attribute: string
], typeof attributeSpan, typeof attributeAsks, typeof attributeSpanName, Readonly<Record<string, unknown>>>;
```

- **Form (ii), drop the annotation and infer through `makePortDescription`.** Works for `AttributeResolver` (the d.ts then shows `"qadi.attribute"` inline). For `CustomPredicate`, whose description is an object literal and not a `makePortDescription` call, removing the annotation gives `CustomPredicate.ts(214,13) TS7006 Parameter 'answers' implicitly has an 'any' type.` and a dozen more TS7006/TS7031. **Use form (i) for all five** (D-09a). It also keeps the d.ts consistent with the existing `typeof attributeSpan, typeof attributeAsks` pattern.

The span literal then appears once per port module as the const's initializer. `qadi.attribute` additionally appears at `AttributeResolver.ts:113` as a span attribute key, so the `port-facts` judge counts the declaration `const <x>SpanName = "…"`, never bare occurrences (D-23a). [VERIFIED: grep output, base 3 occurrences, end state 2]

### P3: the prescriptive module API (shapes that compiled)

`PortDescription.ts` (diff from the scratch end state):

```ts
import type * as Layer from "effect/Layer";
import type { PortName } from "./PortName.ts";          // was: PortName, PortSpanOf

  Span extends PortSpanAttributesLike = PortSpanAttributesLike,
  Asks extends LeafRequests<P> = LeafRequests<P>,
  SpanName extends `qadi.${string}` = `qadi.${string}`,
  FixtureData = never,
> {
  readonly span: SpanName;                                // was: PortSpanOf<N>
  /** Builds this port's layer from plain, serializable data (ADR-QD-050). */
  readonly fixture: (data: FixtureData) => Layer.Layer<Self>;
```

`PortDerivation.ts` (`makePortDescription` gains `SpanName` and `FixtureData` generics after `Asks`, and `DistinctSpanNames`):

```ts
/** Whether a span name is a pattern (`string`, `qadi.${string}`) and not one literal. */
type IsPattern<S extends string> = {} extends Record<S, 1> ? true : false;

/** The registry entries whose span is not one literal, or is another entry's. */
type SpanOffenders<R extends { readonly [K in keyof R]: { readonly span: string } }> = {
  readonly [K in keyof R]: IsPattern<R[K]["span"]> extends true
    ? K
    : [R[K]["span"]] extends [R[Exclude<keyof R, K>]["span"]]
      ? K
      : never;
}[keyof R];

export type DistinctSpanNames<R extends { readonly [K in keyof R]: { readonly span: string } }> = [
  SpanOffenders<R>,
] extends [never]
  ? unknown
  : never;
```

`Ports.ts` (the registry reads):

```ts
export const PORTS: PortTypes = { /* five rows */ } satisfies DistinctSpanNames<PortTypes>;
export type PortSpanOf<N extends PortName> = PortTypes[N]["span"];
export type PortSpanName = PortSpanOf<PortName>;
export type DescriptionOf<K extends PortName> = PortDescription<K, ServiceOf<PortTypes[K]>,
  ShapeOf<PortTypes[K]>, ArgsOf<PortTypes[K]>, AnswerOf<PortTypes[K]>, ErrorOf<PortTypes[K]>,
  AskedOf<PortTypes[K]>, SpanOf<PortTypes[K]>, LeafRequests<AskedOf<PortTypes[K]>>,
  PortSpanOf<K>, PortFixtureData[K]>;
type FixtureDataOf<D> = D extends { readonly fixture: (data: infer F) => unknown } ? F : never;   // NOT exported
export type PortFixtureData = { readonly [K in PortName]: FixtureDataOf<PortTypes[K]> };
type FixtureBuilders = { readonly [K in PortName]: (data: PortFixtureData[K]) => Layer.Layer<ServiceOf<PortTypes[K]>> };
interface FixtureVisitor { <K extends PortName>(d: DescriptionOf<K>): (data: PortFixtureData[K]) => Layer.Layer<ServiceOf<PortTypes[K]>>; }
export function tabulatePorts(f: PortLayerVisitor): PortLayers;
export function tabulatePorts(f: FixtureVisitor): FixtureBuilders;      // the third overload
export function tabulatePorts<F extends { readonly [K in PortName]: unknown }>(f: <K extends PortName>(d: DescriptionOf<K>) => F[K]): { readonly [K in PortName]: F[K] };
export const PORT_FIXTURES: FixtureBuilders = tabulatePorts((d) => d.fixture);
// fixturePortsLayer: `fixtureLayer(d.fixture, setup?.answers)` replaces `fixtureLayer(PORT_FIXTURES[d.port], setup?.answers)`
```

The emitted `Ports.d.ts` reads (quoted): `type FixtureDataOf<D> = D extends { readonly fixture: (data: infer F) => unknown; } ? F : never;` then `export type PortFixtureData = { readonly [K in PortName]: FixtureDataOf<PortTypes[K]>; };` then `export declare const PORT_FIXTURES: FixtureBuilders;`. No TS2883. The unexported helpers are the reason gate 13 closes at 943.

Per-port module edit, shown for `CustomPredicate.ts` (the arrow moves here from `Ports.ts:265-266`; `import * as Record from "effect/Record"` is added; the type argument list gains `typeof customSpanName` and `Readonly<Record<string, boolean>>`):

```ts
const customSpanName = "qadi.hasCustom";
export const customPredicatePort: PortDescription<…, typeof customAsks, typeof customSpanName, Readonly<Record<string, boolean>>> = {
  port: "CustomPredicate",
  method: "evaluate",
  span: customSpanName,
  …
  fixture: (answers) =>
    customPredicateFromRecord(Record.map(answers, (answer) => () => Effect.succeed(answer))),
```

`PortMetrics.ts` (diff): `import * as Record from "effect/Record"` becomes `import { PORT_NAMES } from "./PortName.ts";` beside the existing `import type { PortName }`; `PORT_NAMES_BY_NAME` and the local `PORT_NAMES` go (net `+3 -28`); `export type PredicatePortName = (typeof PREDICATE_PORT_NAMES)[number];` and `const PREDICATE_PORT_NAMES = ["AttributeResolver", "DecisionHistory"] as const satisfies ReadonlyArray<PortName>;`.

Scratch diff sizes (core `src`, lines added/removed): `AttributeResolver +21 -16`, `CustomPredicate +9 -2`, `DecisionHistory +35 -30`, `PortAccess +61 -54`, `PortDerivation +26 -2`, `PortDescription +7 -2`, `PortMetrics +3 -28`, `PortName +12 -49`, `Ports +36 -46`, `RelationshipResolver +39 -34`, `SignatureHistory +44 -39`. Most of the per-port numbers are the builder moved above the description.

### P4: `DistinctSpanNames` behaviour (compiled, then each case run)

Applied by `satisfies` on small fake registries and the real one, in a scratch test file that was then deleted. Results, quoted from `tsc -p tsconfig.test.json`:

| Registry | Expectation | Result |
|----------|-------------|--------|
| six entries, six distinct literal spans (the positive twin) | `unknown`, compiles | no error |
| `A` and `B` both `"qadi.a"` | `never` | `error TS1360: Type '{ A: { span: string; }; B: { span: string; }; }' does not satisfy the expected type 'never'.` |
| `A` span `string` | `never` | the same TS1360 |
| `A` span `` `qadi.${string}` `` | `never` | the same TS1360 |
| the real registry with `AttributeResolver` claiming `"qadi.acted"` | `never` | `error TS1360: Type 'Claim' does not satisfy the expected type 'never'.` |

The same five cases are the born `PortFacts.tst.ts` rows (`expect<DistinctSpanNames<Six>>().type.toBe<unknown>()` and `…<Dup>…toBe<never>()`), which pass in both tstyche passes (P7). The six-entry positive twin matters: a check that returns `never` for everything would otherwise pass the negative rows.

### P5: the fixture member, builders by reference, and the load-order trap

- Builders moved above each description and taken by reference compiles and loads (core vitest 85 files green on the end state).
- **Eager use before declaration is refused twice**: with the builder left where it is, `tsc` says `AttributeResolver.ts(210,12): error TS2448: Block-scoped variable 'attributeResolverFromRecord' used before its declaration.` and `TS2454 Variable … is used before being assigned.` (the same pair for `decisionHistoryFromEvents`, `relationshipResolverFromEdges`, `signatureHistoryFromSignatures`: 8 errors), and loading the barrel throws `ReferenceError: Cannot access 'attributeResolverFromRecord' before initialization`. So **reordering is required** (the alternative is a thunk), and a test that merely loads `../src/index.ts` is a sufficient runtime proof [VERIFIED: probe output].
- The existing generic `tabulatePorts` overload cannot carry a per-port builder (`TS2322`, TS #30769: a generic key into a concrete mapped type is an intersection in write position). The third overload with `FixtureVisitor` and `FixtureBuilders` compiles; this is the same reason the layer overload exists today.

### P6: the routing `readScoped`, the patch, and the bench harness constraints

The final routing code compiled on (f)+(g) and on the end state. It reads the row, builds nothing on the hot path, and keeps BEH-QD-445's order (annotate, then fail):

```ts
/** The row of the scoped leaf `T`: `Always` or `ByScope`, never `Never`. */
type NeedOf<T extends ScopedLeafTag> = (typeof LEAF_NEEDS)[T]["resourceId"];
/** What the scoped leaves of port `K` need, as the union of their rows. */
type PortNeed<K extends ScopedPort> = NeedOf<keyof PortTypes[K]["asks"] & ScopedLeafTag>;
/** A scoped port's request as a call that carries no id: a function when some leaf of the port
 *  can be read without one (a row that is not `Always`), `undefined` when every leaf needs it. */
type BareOf<K extends ScopedPort> = [PortNeed<K>] extends ["Always"]
  ? undefined
  : (request: AskedOf<PortTypes[K]>) => ArgsOf<PortTypes[K]>;
interface ScopedCall<K extends ScopedPort> {
  readonly withId: (request: AskedOf<PortTypes[K]>, resourceId: ResourceId) => ArgsOf<PortTypes[K]>;
  readonly bare: BareOf<K>;
}
const scopedCall: { readonly [K in ScopedPort]: ScopedCall<K> } = {
  DecisionHistory: { withId: (request) => request, bare: (request) => request },
  RelationshipResolver: { withId: ([request], resourceId) => [{ ...request, resourceId }], bare: undefined },
  SignatureHistory: { withId: (request) => request, bare: (request) => request },
};
const RESOURCE_SCOPED = { scope: "Resource" } as const;
const needsResourceId: (need: "Always" | "ByScope") => (leaf: LeafOf[ScopedLeafTag]) => boolean =
  Match.type<"Always" | "ByScope">().pipe(
    Match.when("Always", () => () => true),
    Match.when("ByScope", () => (leaf: LeafOf[ScopedLeafTag]) => "scope" in leaf && isResourceScoped(leaf)),
    Match.exhaustive,
  );
const readScoped = <K extends ScopedPort>(
  d: DescriptionOf<K>, interpreter: Interpreter, leaf: LeafOf[ScopedLeafTag],
  request: ScopedRequest<K>, relation: string,
): Effect.Effect<AnswerOf<PortTypes[K]>, ErrorOf<PortTypes[K]> | MissingResourceId, ServiceOf<PortTypes[K]>> => {
  const call = scopedCall[d.port];
  const bare: ((request: AskedOf<PortTypes[K]>) => ArgsOf<PortTypes[K]>) | undefined = call.bare;
  if (bare !== undefined && !needsResourceId(LEAF_NEEDS[leaf._tag].resourceId)(leaf)) {
    return readPort(d, interpreter, bare(request));
  }
  return Effect.gen(function* () {
    const [{ resourceId }] = request;
    const found = requireResourceId(RESOURCE_SCOPED, resourceId, relation);
    if (Result.isFailure(found)) {
      yield* annotateQuestion<SpanFields>(d, { ...d.attributes.pose(request), scope: "Resource", interpreter });
      return yield* Effect.fail(found.failure);
    }
    return yield* readPort(d, interpreter, call.withId(request, found.success));
  });
};
```

Call sites (the whole change at each): `readActed` ends `return yield* readScoped(decisionHistoryPort, interpreter, leaf, request, leaf.event);`; `askRelationship` calls `readScoped(relationshipResolverPort, "evaluate", leaf, request, leaf.relation)`; `askSignature` is `const signatures = yield* readScoped(signatureHistoryPort, "evaluate", leaf, request, leaf.meaning);`. The two ternaries `isResourceScoped(leaf) ? … : …` are gone from the read sites and `isResourceScoped(` now appears in `PortAccess.ts` exactly once, in the `ByScope` arm. `PortAccess.ts` diff: `+61 -54`. The patch is a three-file-equivalent edit of one file (`packages/core/src/PortAccess.ts`) on top of (f); plan 1 produces it with `git diff`, hashes it and hands it to `ab.sh`.

Typing findings the plan needs (D-15a):

1. A cast-free, fully type-unreachable generic-`K` form was not found by a single dispatch, so the unreachability is carried by `BareOf<K>`: for a port whose scoped leaves are all `Always`, `bare` can only be `undefined`, and changing that row is TS2322 at the table. The runtime test `bare !== undefined` is dead for `RelationshipResolver`; its mutant is an `EQUIVALENT` mutation entry with that reason.
2. `needsResourceId`'s `ByScope` arm needs `"scope" in leaf` because `LeafOf[ScopedLeafTag]` includes `HasRelationship`, which has no `scope`. It is a narrowing, not a cast.
3. `RESOURCE_SCOPED` survives: `requireResourceId`'s first overload is `(leaf: { readonly scope: "Resource" }, …) => Result<ResourceId, MissingResourceId>`, which is what makes the hit branch's id a `ResourceId` without a second test (quoted from `ScopedLeaf.ts:57-61`) [VERIFIED: ScopedLeaf.ts read this session].
4. The hot path (an `Any`-scoped acted or signature leaf) does one `Match` dispatch, allocates the small predicate closure the chosen arm returns (the `ByScope` arm's closure is created per call, which is the cost A3 and the bench gate exist to measure; hoisting the two predicates to module-scope consts and returning them by reference is the first variant to try if the gate fails, per D-16's "re-measure the arm variants"), and calls `readPort` without a generator. It is not an `Effect.fn` and not `fnUntraced`, so `UNTRACED_BUDGET` is unmoved.

**Bench harness constraints (not run).** `scripts/bench/ab.sh <patch> <outdir> <rounds> <head-label> <patched-label> <bench-file> <test-name-pattern>` takes the patch text, refuses an odd round count and a count below 4, refuses a bench file `git ls-files --error-unmatch` does not know, and runs each arm as `-t "$PATTERN" "$BENCH"` with stdin closed. `node scripts/bench/analyze.mjs <outdir> <reference-label> <candidate-label> <workloads-file>` decides on the **median of per-run minima** (`latency.min`), with a **fixed 5%** per-workload band and a geometric mean of the deltas of at most **+2%**; the last line `# gate: pass|fail` is the verdict (exit 0, 1, or 2 when the analysis cannot complete). The workloads file names the gate's workloads before any run, one `<test title> :: <bench name>` key per line, none twice, none missing from a run, none extra; a workload is found by key, never by position. The `evaluate` group's keys are, verbatim, `evaluate :: one node`, `evaluate :: wide — allOf of 8`, `evaluate :: deep — 10 levels`, … `evaluate :: leaf-heavy — allOf of 8, matchers reference neither` (17), plus the two new ones; `filter — 500 items :: hasPermission`, `decideSubjects — 500 subjects :: hasPermission`, and the scaling and concurrency groups if they are in the pattern. Phase 89's `89-BENCH.md` is the shape to copy.

The two new workloads were validated functionally on a scratch copy of the base (not timed). Under `fixturePortsLayer` with relationship edges `owner` and `reader` on `doc-1`, acted events `raised` and `viewed`, and a signature `approved`:

- Resource-scoped (`allOf` of eight: `hasActed("raised")`, `hasActed("viewed")`, `hasNotActed("approved")`, `hasRelationship("owner")`, `hasRelationship("reader")`, `hasSignature("approved")`, `hasActed("raised")`, `hasRelationship("owner")`) evaluated with `{ resource: { id: "doc-1" } }`: `[ 'Allow', true, … ]` (probe assertion output).
- Any-scoped (`hasActed("raised", { scope: "Any" })`, `hasActed("viewed", { scope: "Any" })`, `hasNotActed("approved", { scope: "Any" })`, `hasSignature("approved", { scope: "Any" })`, repeated to eight) evaluated with no resource: the first three leaves allow and `hasSignature(…, { scope: "Any" })` **denies** unless the signature fixture also holds a row with no `resourceId` (`{ subjectId: "alice", meaning: "approved" }`); with that row it allows. The workload's `assert(isAllowed(...))` (the file's existing pattern, lines 388-397) must hold for both, so plan 1 builds the Any-scoped runtime with that extra row. Neither workload may be timed before the file is held.

### P7: tstyche, both passes, and the declared test edits

`node scripts/run-tstyche.mjs` (two passes: `tstyche.json` with `floatingEffect` off, then `tsconfig.test.json` with it on) was run on the end state with a new `packages/core/test/PortFacts.tst.ts` (base pins, then the born pins: `PORT_NAMES`, `DistinctSpanNames` over `Six`/`Dup`/`Wide`/`Claim`, the two `Omit<…>` `not.toBeAssignableTo` pins with the positive anchor, `typeof PORT_FIXTURES`). Output (colour stripped):

```
run-tstyche: pass 1 of 2, tstyche.json (tsconfig.tstyche.json, floatingEffect off), skipping "under tsconfig.test.json"
pass ./packages/core/test/PortFacts.tst.ts
Test files: 81 passed, 81 total
Tests:      442 passed, 1 skipped, 443 total
Assertions: 963 passed, 3 fixme, 3 skipped, 969 total
run-tstyche: pass 2 of 2, tsconfig.test.json (floatingEffect on), skipping "under the tstyche tsconfig"
pass ./packages/core/test/PortFacts.tst.ts
Test files: 81 passed, 81 total
Tests:      441 passed, 2 skipped, 443 total
Assertions: 963 passed, 6 skipped, 969 total
```

The base-only pins (the file's first half, before any change) pass on the **base** in both passes: `Test files: 1 passed`, `Tests: 3 passed`, `Assertions: 8 passed`, so D-19's "born on the base, held through the move" works because the pins import from `../src/index.ts`. `NOT_CALLABLE_PIN_BUDGET` does not move: only `toBe` and `not.toBeAssignableTo` pins were added, and `check-house-style` printed `647 file(s) clean (3 declared switch(es), 81 type-test file(s))` on the end state.

The test graph on the end state fails with exactly three errors, which are D-20's declared edits and nothing else (D-20a): `PortDescription.test.ts(83,7) TS2741 Property 'fixture' is missing in type '{ port: "AttributeResolver"; method: string; span: "qadi.attribute"; …'`, `PortName.tst.ts(12,25) TS2724 '"../src/PortName.ts"' has no exported member named 'PortSpanName'` and `PortName.tst.ts(12,39) TS2305 … no exported member 'PortSpanOf'`. After the edits (add `fixture: () => named(undefined, 0)`, move the two imports to `../src/Ports.ts`, replace the dropped `PortDescription<…>["span"]` row): `tsc(test project) errors=0`, core vitest `Test Files  85 passed (85)`, `Tests  2797 passed (2797)`.

### P8: the fake sixth port (D-22), both sets measured

`"FakePort"` added on a scratch copy, `tsc -b tsconfig.json`, output reduced to (file, code) groups with counts.

- **Base** (a sixth `PortSpans` row `readonly FakePort: "qadi.fake";`): **53 errors in 22 groups.** `PortAccess.ts` TS2536 x8; `PortMetrics.ts` TS2741 x1; `PortRemote.ts` TS2536 x4; `Ports.ts` TS2379 x1, TS2536 x17, TS2741 x2, TS377004 x1; `PortServing.ts` TS2344 x1, TS2536 x1; devtools `Capture.ts` TS2536 x2, `PortCalls.ts` TS2741 x1, `PortCards.ts` TS2345 x1, `PortReading.ts` TS2741 x1, `SimulationFields.ts` TS2536 x2 and TS2741 x1, `SimulationSource.ts` TS2536 x2 and TS2741 x1; http `PortRoutes.ts` TS2322, TS2345, TS2536, TS377004 x1 each; testing `QadiReviewLayer.ts` TS2536 x2.
- **Close** (`"FakePort"` appended to `PORT_NAMES` alone): **57 errors in 25 groups.** `PortAccess.ts` TS2345 x1, TS2536 x10; `PortRemote.ts` TS2345 x1, TS2536 x4; `Ports.ts` TS2344 x1, TS2379 x1, TS2536 x20, TS2741 x1, TS2769 x1, TS377004 x1; `PortServing.ts` TS2344 x1, TS2536 x1; devtools `Capture.ts` TS2345 x1, TS2536 x2, `PortCalls.ts` TS2322 x1, TS2741 x1, `PortCards.ts` TS2345 x1, `PortReading.ts` TS2741 x1, `SimulationFields.ts` TS2741 x1, `SimulationSource.ts` TS2741 x1; http `PortRoutes.ts` x4 (same four codes); testing `QadiReviewLayer.ts` TS2536 x1.

Findings: `PortMetrics.ts` is **in the base set and not in the close set**, as D-22 expects (the metric domain follows the tuple). The close set is much wider than D-22's "registry and `PortServingOf`": it also holds `PortAccess.ts`, `PortRemote.ts` and four devtools modules, `PortRoutes.ts` and `QadiReviewLayer.ts`, so a hand-written expected list would be wrong, and the judge must compare (file, code) groups against the set recorded in `90-RED-EVIDENCE.md` (D-22a). The line numbers and the count change with any edit to those files, which is why the group (file, code) is the comparison key and the exact count is recorded but not the verdict. The "registry entry omitting `span`, `fixture` or `serving`" variants are the D-19 `Omit<…>` pins; the `span` and `fixture` omissions were shown failing in P7's `not.toBeAssignableTo` rows, and `serving` is held by the unedited `PortServing.tst.ts`.

## Earlier-checks measured ledger (P9)

`89-earlier-checks.mjs` was run from a scratch clone of HEAD (a fresh `git clone` with `node_modules` linked) with `TMPDIR` pointed at a scratch directory: **exit 0, 59 lines, 55 `exit 0` and 4 `exit 1`**, which is the Phase 89 ledger matching exactly. The four `exit 1` rows, each the documented measured finding and not a pass:

| Row | Line (first 110 chars) |
|-----|------------------------|
| `85-check.mjs scan-ids` | `packages/devtools/test/model/DiagnosticsFeed.stop.test.ts:35 has phase-relative wording: …` (five reasons) |
| `86-check.mjs scan-ids` | the same five reasons |
| `87-pinned-check.mjs` | `packages/devtools/test/helpers.ts: differs from its base text at line 14` |
| `88-check.mjs records --close` | `spec/README.md is at Revision 1.415, not 1.414`; `spec/traceability.md is at Revision 1.334, not 1.333`; `spec/invariants.md is at Revision 1.234, not 1.233`; `2 changesets are added since phase_base, not one` |

Scratch trap that cost a run (record it for the ledger script's authors): a scratch clone with `node_modules` as a **symlink** makes `git ls-files --others --exclude-standard` list it (the repo's `.gitignore` entry `node_modules/` does not match a symlink), and the `scan-ids`/`scan-forbidden` rows then fail with `Error: EISDIR: illegal operation on a directory, read`. Adding `node_modules` and `packages/*/node_modules` to the scratch clone's `.git/info/exclude` fixes it. The real tree is unaffected.

Which rows move on Phase 90's edits (D-24a):

- **No pinned list of Phases 85 to 89 names any of the files Phase 90 edits.** A grep for `packages/core/(src|test)/(Port*|LeafNeeds|LeafFixtures|AttributeResolver|CustomPredicate|DecisionHistory|RelationshipResolver|SignatureHistory)` over `85-pinned-check.mjs` to `89-pinned-check.mjs` counts 0 in each. The pinned rows (`18`, `59`, `46`, `130` files and their born/declared counts) are unaffected.
- **`88-check.mjs records --close` moves** with Phase 90's spec revisions: its three revision lines read the current revision of `spec/README.md`, `spec/traceability.md` and `spec/invariants.md` (all three are edited by Phase 90) and its changeset count (Phase 90 adds one changeset). Phase 90's ledger keys each of those lines on the exact subject of the Phase 90 commit that moves it, as Phase 89's `EXPLAINING` array does.
- **Phase 89's own `records --close`** (clean at HEAD: `records: the pinned-by lists name tests that exist, and every reserved record is written`) will start naming revision lines for the registers Phase 90 bumps, by the same mechanism Phase 89 moved Phase 88's. That is the mechanism's documented behaviour [ASSUMED: derived from `88-check.mjs records --close`'s behaviour after Phase 89, not run against Phase 90's edits because the records do not exist yet]; plan 1's ledger rows for it are measured at the base (clean) and the explaining subject is written before the commit exists.
- **`trailers` rows** are patterns (`156 commits since phase_base`, `104 commits since phase_base`, `50 commits since phase_base`) that grow with the branch; Phase 90 matches them by regular expression.
- 89's own mode set (`base`, `scan-ids`, `scan-forbidden`, `trailers`, `admission-step`, `entry-points-first`, `records`) is clean at HEAD: `scan-ids: no id or phase wording in added lines`, `trailers: 50 commits since phase_base, each with the one trailer`, `admission-step: HostBatch.ts is the one plain, package-private admission step; …`, `89-pinned-check.mjs: pinned: 46 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied`.

## Mutation and coverage facts (P10)

Not run (Stryker writes `reports/` and `.stryker-tmp`, and a base run is plan 1's job under the hard rules here). Facts read from `stryker.config.mjs` and Phase 89's `89-mutation.mjs`:

- The core configuration is `stryker.config.mjs`: `mutate: ["packages/core/src/**/*.ts", "!packages/core/src/index.ts"]`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `thresholds: { high: 90, low: 80, break: 80 }`, `timeoutMS: 20000`, json report at `reports/mutation/mutation.json` [VERIFIED: stryker.config.mjs:73-100]. Every file Phase 90 edits is under `packages/core/src`, so **`UNMEASURED` is empty** and `RENAMED` is empty (no file is renamed).
- D-24's invocation is `pnpm exec stryker run stryker.config.mjs --mutate <the 13 files>`; the base record and the close record must use the same bail setting. Phase 89's script is the template: `record base` writes `phase_base`, `record close [--restart]` writes the close record, `compare` judges both; a mutant is located by `git diff -U0` line mapping, never by text; a surviving mutant is explained only by an `EQUIVALENT` entry that names (file, mutator, replacement, trimmed line text, reason), and an entry matching no survivor fails.
- **Entries Phase 90 should expect.** (1) `EQUIVALENT`: `bare !== undefined` in `readScoped` (dead for `RelationshipResolver` by construction, P6). (2) `EXAMINED`: the hoisted matcher's `Match.when("Always" | "ByScope")` literal mutants, run by hand with `ignoreStatic: false` and seen Killed by the route table. (3) Static code with no score: the tuple, `PREDICATE_PORT_NAMES`, the five `<x>SpanName` consts, `scopedCall` and `LEAF_NEEDS`; their proof is the golden rows and the route table.
- `MOVED`: `CustomPredicate`'s fixture arrow (`Ports.ts:265-266` to `CustomPredicate.ts`) and the two route ternaries (to `readScoped`).
- Coverage: `vitest.config.ts` holds `packages/core/src/**` at 95% lines, functions, branches and statements, others at 90%. The new `PortAccess.ts` branches (`bare === undefined`, `bare !== undefined` with `needs` true and false) are all reached by the route table (a relationship read, an `Any`-scoped acted read, a `Resource`-scoped acted read). The one untaken branch shape is `bare !== undefined && needs === true` for a port whose `bare` is a function, which is reached by a `Resource`-scoped acted read, so no coverage gap is expected [ASSUMED: not measured; `pnpm coverage` runs in the plan that lands (g)].

## Spec amendments, anchors and revisions (P11)

Revisions read from the document-control tables at HEAD [VERIFIED: grep of `| Revision` lines]:

| Document | Revision at HEAD | After this phase (one bump each, `spec-revise.mjs --date 2026-11-26`) |
|----------|------------------|-----------------------------------------------------------------------|
| `spec/decisions/094-a-port-is-described-once.md` | 1.12 | 1.13 (D-25) |
| `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` | 1.10 | 1.11 |
| `spec/decisions/134-a-resource-scoped-port-read-is-one-read.md` | 1.1 | 1.2 |
| `spec/decisions/114-a-port-states-what-it-serves.md` | 1.1 | unchanged (D-12) |
| `spec/behaviors/30-port-calls.md` | 1.25 | 1.26 |
| `spec/overview.md` | 1.146 | 1.147 |
| `spec/invariants.md` | 1.234 | 1.235 |
| `spec/traceability.md` | 1.334 | 1.335 |
| `spec/README.md` | 1.415 | 1.416 |
| `spec/decisions/index.yaml`, new `spec/decisions/203-the-remaining-per-port-facts-live-on-the-port-description.md` | highest file is `202-one-admission-step-for-a-hosts-audit-batch.md` | new row and file |

`spec/overview.md` anchors (line numbers at HEAD, text quoted from the row starts): line 286 `` `PortDescription`, `PortShape`, `PortScript` `` ("a description's shape (its seventh parameter, `P`, is the request as far as a read site supplies it, its eighth types `attributes` and its ninth types `asks`; …"; this row's parameter count becomes eleven and it gains `span` and `fixture`); line 300 `` `PortServingFacet` `` (unchanged); line 305 `` `PortTypes`, `PORTS` `` ("the closed registry of the five port descriptions, keyed by `PortName`; a port name without an entry is a compile error wherever a derived type indexes it (ADR-QD-094)"; gains the distinct-span `satisfies`); lines 307 and 308 `` `PortFixtureData`, `PortFixtures` `` and `` `PORT_FIXTURES`, `fixturePortsLayer` `` ("each port's fixture builder, closed over `PortName` (a port without a row is TS2741)"; now read from the descriptions); line 313 `` `mergePorts`, `decoratePorts`, `forEveryPort` ``; line 326 `portCallsTotal`, `portRetriesTotal`, `portTimeoutsTotal`, `predicatePortCallsTotal`; **line 328** `` `PortName`, `PortSpanName`, `PortSpanOf` `` ("`PortName.ts` — a port's identity, stated once in a leaf with no imports and no metric (ARCH-77): `PortName` is the five port names, …"; split into a `PORT_NAMES`, `PortName` row for `PortName.ts` and a `PortSpanName`, `PortSpanOf` row for `Ports.ts`); line 329 `PredicatePortName` (public type unchanged). Gate 13 is `node scripts/check-api-surface.mjs`: 942 to 943 with `PORT_NAMES` as the only added export (P1/D-11a).

Other records the context names, with their lines taken from `90-CONTEXT.md` (not re-opened here): `spec/decisions/094-…md` D-10-k (72), the CCR-QD-270 amendment (272-288, the `fixture` rejection at 281-282), CCR-QD-382 (290-301, the Breaking precedent), CCR-QD-392 (333-356), CCR-QD-419 (368-383, the span derivation rejection); `spec/decisions/114-…md` 58-60 and 80-82; `spec/decisions/163-…md` decision 3 at 63; `spec/decisions/134-…md` 80-86; `spec/behaviors/30-port-calls.md` BEH-QD-227 (27), BEH-QD-445 (314), BEH-QD-588 (500); `spec/invariants.md` INV-QD-288 (3681), INV-QD-345 (4090); `AGENTS.md` §3 line 137.

Downstream readers (all unedited; the `suite` mode runs their projects): `packages/devtools/src/model/PortCalls.ts:34,52`, `SimulationFields.ts:33,563,593`, `SimulationSource.ts:28,132,145`, `packages/testing/src/QadiReviewLayer.ts:11,46`, `packages/http/src/PortRoutes.ts:28,97`. The P8 sixth-port close set lists these same files, which confirms they read `PortName`-indexed types from the registry and follow the tuple. Gate 14 (`node scripts/check-package-install.mjs`, packs and installs) was not run here; the d.ts emission for the unexported `FixtureDataOf`, `FixtureBuilders` and `FixtureVisitor` compiled without TS2883, which is the failure gate 14 would otherwise surface.

## Test-removal audit (D-20, the real count)

| Removed or replaced row | Where | The row that now holds its property |
|-------------------------|-------|-------------------------------------|
| `describe("a row's resourceId is what readScoped does (D-06)")` containing one `it.effect("Never / Always / ByScope")` | `LeafNeeds.test.ts:133-160` | the new describe "a scoped read requires an id exactly where its leaf's row says": assertion 1 is the same oracle (`refused === claimed && shape !== "id"`), assertion 2 is new (the fixture judgement's `requireResourceId` answer equals the read's for every `ByScope` leaf), assertion 3 is new (the four scoped tags are exactly the `ScopedLeafTag` set) |
| `expect<PortDescription<"AttributeResolver", unknown, PortShape, [], unknown, unknown>["span"]>().type.toBe<"qadi.attribute">()` (one assertion in the third test) | `PortName.tst.ts:33-35` | `DistinctSpanNames` pins in `PortFacts.tst.ts` (positive six-entry twin, duplicate, widened) and `PortSpanOf<"AttributeResolver">` `toBe` `"qadi.attribute"` |
| the `PortDescription`, `PortShape` imports and the `PortSpanName`/`PortSpanOf` import path | `PortName.tst.ts:11-12` | the imports move to `../src/Ports.ts`; the held `not.toBeAssignableTo<Pick<typeof attributeResolverPort, "span">>()` assertion stays |
| `PortDescription.test.ts:83` `probePort` object literal | edit only | gains `fixture`; no assertion removed (D-20a: the scratch edit was exactly `fixture: () => named(undefined, 0),`) |

**No property lost; tests removed: 1 (the `it.effect` above, replaced by a describe with three assertions); assertions removed: 1 (the `PortDescription<…>["span"]` row, whose property is `DistinctSpanNames`' and `PortSpanOf`'s).** The ADR-QD-203 table carries these four rows.

## Architecture Patterns

### System architecture diagram (the module graph the change must keep acyclic)

```
                   PortName.ts  (leaf: PORT_NAMES, PortName; imports nothing)
                    ^      ^
                    |      |
   PortMetrics.ts --+      +-- PortServing.ts (leaf: hand-written PortServing, imports PortName as a type)
   (reads the tuple               ^
    as a value)                   |
                                  +-- PortDescription.ts  (type: 11 parameters; span: SpanName, fixture)
                                          ^        ^
                                          |        |
        port modules (5) ---------------- +        +-- PortDerivation.ts (makePortDescription, DistinctSpanNames,
        each: const <x>SpanName,                       retryingPort, nonePort ...)
        builder above description,
        description {span, fixture, ...}
                  ^
                  |
              Ports.ts  (registry: PortTypes, PORTS satisfies DistinctSpanNames, PortSpanOf, PortSpanName,
                  ^       PortFixtureData, PORT_FIXTURES, tabulatePorts x3 overloads, fixturePortsLayer)
                  |
   LeafNeeds.ts --+--> PortAccess.ts (imports LEAF_NEEDS as a value; ScopedLeafTag, ScopedPort derived;
   ScopedLeaf.ts -+     scopedCall, hoisted needsResourceId, readScoped routes; readActed/askRelationship/askSignature
                        call readScoped and no longer route)
                              ^
                              |
                         Walk.ts / Evaluate.ts (unchanged)
   Data flow of one scoped read: leaf -> site request (asks) -> readScoped(row decides) -> [bare: readPort]
   or [requireResourceId -> miss: annotate question, fail MissingResourceId | hit: withId -> readPort]
```

### Recommended file touch list

```
packages/core/src/
  PortName.ts                    # tuple + type; no imports
  PortMetrics.ts                 # reads PORT_NAMES; PREDICATE_PORT_NAMES satisfies
  PortDescription.ts             # +SpanName, +FixtureData, span: SpanName, +fixture
  PortDerivation.ts              # makePortDescription generics; DistinctSpanNames (package-private)
  Ports.ts                       # PortSpanOf/PortSpanName; DescriptionOf; PortFixtureData; PORT_FIXTURES; 3rd overload
  AttributeResolver.ts, DecisionHistory.ts, RelationshipResolver.ts,
  SignatureHistory.ts, CustomPredicate.ts   # <x>SpanName const, fixture, builder moved above the description
  PortAccess.ts                  # ScopedLeafTag/ScopedPort derived; scopedCall; needsResourceId; readScoped
  LeafNeeds.ts, ScopedLeaf.ts    # prose only (D-17), rows byte-identical
packages/core/test/              # LeafNeeds.test.ts, PortName.tst.ts, PortDescription.test.ts (declared edits);
                                 # PortFacts.characterisation.test.ts, PortFacts.tst.ts (born)
packages/core/bench/Evaluate.bench.ts   # two scoped-heavy workloads (plan 1)
```

### Pattern 1: derive a per-port fact through the registry, not through a table keyed by name

**What:** a fact stated on the description is read back with `infer` (`FixtureDataOf<D>`, `SpanOf<D>`), and a table over every port is built with `tabulatePorts`, whose overloads correlate a per-port value with the port's own types. **When:** any new per-port fact. **Source:** `Ports.ts` as quoted in P3; ARCHITECTURE Pattern 4 [CITED: 90-CONTEXT.md `<code_context>`].

### Pattern 2: a `satisfies` check that returns `unknown` or `never`

**What:** `PORTS = {…} satisfies DistinctSpanNames<PortTypes>`. The annotation (`PORTS: PortTypes`) is kept so the d.ts is unchanged. **Why `satisfies` and not a type argument:** it checks the value at the one place every description is visible and costs no runtime. The `LEAF_NEEDS` `ListsDisjoint` idiom is the precedent [CITED: 90-CONTEXT.md D-10; P4 shows it compiled and refusing].

### Pattern 3: a hoisted `Match.type` returning predicates, with a row-derived table for the unreachable branch

**What:** the code in P6. **When:** a hot path that must dispatch on a closed literal union without `switch` and without rebuilding a matcher per call (AGENTS.md §5a) [CITED: AGENTS.md §5a, verbatim "Prefer that shape; `Match.value(x)` rebuilds per call"].

### Anti-Patterns to Avoid

- **Exporting `FixtureDataOf`, `FixtureBuilders` or `FixtureVisitor`.** It adds a gate-13 export for no consumer. Keep them module-private; the d.ts still emits.
- **A hand-written fourth member of `ScopedPort`.** Measured to compile only if the table is also edited, which is the point; do not reintroduce the hand union.
- **Counting bare occurrences of a span literal.** `"qadi.attribute"` is also a span attribute key (D-23a).
- **Using a builder before its declaration.** TS2448 and a load-time `ReferenceError` (P5).
- **Judging the sixth-port set from a hand list.** It spans four packages and changes with the sources (D-22a).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A per-port table over all five ports | a `Record<PortName, …>` or an `as`-cast loop | `tabulatePorts` and its overloads | a generic key into a concrete mapped type is an intersection in write position (TS #30769); the overloads are the cast-free correlation |
| Port uniqueness of spans | a runtime test only | `DistinctSpanNames` at `PORTS` (compile time) plus the `PortFacts` golden | a compile-time property must not become a test-time one (D-10) |
| Routing by row | a `switch` on the row, a per-call `Match.value`, or the row read in each caller | the hoisted `Match.type` in `readScoped` | `SWITCH_BUDGET` is an exact count; `Match.value` rebuilds on the hot path; three callers are three copies of the route |
| The missing-id test and its error | a second `resourceId === undefined` check | `requireResourceId` (`ScopedLeaf.ts`) | one place builds `MissingResourceId`; judgements in port modules cannot import `LeafNeeds.ts` |
| A "sixth port" check | a list of expected files | the (file, code) group set recorded in `90-RED-EVIDENCE.md` | the set spans four packages |
| Revision bumps and spec dates | hand edits of the Revision rows | `scripts/spec-revise.mjs --date 2026-11-26` | the earlier-checks ledger reads them |

**Key insight:** every shortcut above reintroduces the second statement of a fact this phase removes. The compiler asks for the decision wherever a derived set meets a table that is still written out (`scopedCall`, `tabulatePorts`' five rows, `PortServing`'s slot), and that is deliberate.

## Common Pitfalls

### Pitfall 1: a builder used before its declaration
**What goes wrong:** TS2448 and TS2454, then `ReferenceError: Cannot access 'attributeResolverFromRecord' before initialization` when the barrel loads. **Why:** `fixture: builder` evaluates the reference at description construction, and the builder is a `const` defined below. **How to avoid:** move each builder above its description (or use a thunk). **Warning signs:** any `.test.ts` that imports the barrel fails at load [VERIFIED: P5].

### Pitfall 2: the third overload is missing
**What goes wrong:** `PORT_FIXTURES = tabulatePorts((d) => d.fixture)` fails with TS2322. **Why:** TS #30769. **How to avoid:** add `tabulatePorts(f: FixtureVisitor): FixtureBuilders` before the generic overload, with the helper types unexported [VERIFIED: P5].

### Pitfall 3: exporting a helper type and silently making gate 13 944
**What goes wrong:** `check-api-surface` reports a second missing export. **How to avoid:** leave `FixtureDataOf` unexported; the d.ts emits without TS2883 [VERIFIED: P11].

### Pitfall 4: the span literal count judge
**What goes wrong:** `port-facts` demands one bare occurrence of `"qadi.attribute"` and the file has two. **How to avoid:** count `const <x>SpanName = "…"` declarations (D-23a).

### Pitfall 5: an inference-only span form
**What goes wrong:** dropping the annotation works for `AttributeResolver` and breaks `CustomPredicate` with TS7006. **How to avoid:** form (i) for all five (D-09a).

### Pitfall 6: the scratch clone's `node_modules` symlink
**What goes wrong:** earlier-checks `scan-ids`/`scan-forbidden` fail with `EISDIR`. **How to avoid:** `printf 'node_modules\npackages/*/node_modules\n' >> .git/info/exclude` in the scratch clone (P9).

### Pitfall 7: the bench band and the workloads file
**What goes wrong:** a plan written to the `max(10%, spread)` rule passes a change `analyze.mjs` refuses (5% fixed, geomean at most +2%), or `analyze.mjs` exits 2 because the workloads file is missing or does not match the run. **How to avoid:** D-16a; the verdict is the last line, never judgement.

### Pitfall 8: an Any-scoped signature workload that denies
**What goes wrong:** the Any-scoped bench workload's `assert(isAllowed)` fails because the signature fixture has only a resource-bound row (P6). **How to avoid:** add `{ subjectId: "alice", meaning: "approved" }` to the signature data of that runtime.

### Pitfall 9: ids in test titles and comments
**What goes wrong:** `scan-ids` fails. **How to avoid:** name a property, never D-06 (the replaced describe's old title carried one), never PFACT-0N or a phase number (WX-07).

### Pitfall 10: AGENTS.md §3 prose that stays false
**What goes wrong:** "a new port is a description, a `PortName` member and its registry lines" survives and contradicts D-11. **How to avoid:** the records plan rewrites it to D-11's sentence and adds the fixture to the facts a description states (D-26).

## Code Examples

The module API (P3), the routing (P6), the `DistinctSpanNames` and its five rows (P4), and the tstyche rows (P7) are the verified examples; each is a compiled excerpt, quoted above. The born `PortFacts.tst.ts` rows that compiled and passed both passes:

```ts
test("PORT_NAMES is the five names in registry order", () => {
  expect(PORT_NAMES).type.toBe<
    readonly ["AttributeResolver", "DecisionHistory", "RelationshipResolver", "CustomPredicate", "SignatureHistory"]
  >();
});
test("two ports cannot share a span, and a span must be one literal", () => {
  expect<DistinctSpanNames<Six>>().type.toBe<unknown>();
  expect<DistinctSpanNames<PortTypes>>().type.toBe<unknown>();
  expect<DistinctSpanNames<Dup>>().type.toBe<never>();
  expect<DistinctSpanNames<Wide>>().type.toBe<never>();
  expect<DistinctSpanNames<Claim>>().type.toBe<never>();
});
test("span and fixture are required members of a description", () => {
  expect<PortTypes["AttributeResolver"]>().type.toBeAssignableTo<DescriptionOf<"AttributeResolver">>();
  expect<Omit<PortTypes["AttributeResolver"], "fixture">>().type.not.toBeAssignableTo<DescriptionOf<"AttributeResolver">>();
  expect<Omit<PortTypes["AttributeResolver"], "span">>().type.not.toBeAssignableTo<DescriptionOf<"AttributeResolver">>();
});
```

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| A module-private `interface PortSpans` keyed by name | the span on the description, read back through the registry | this phase | one statement per span; two ports can no longer share one |
| `Record<PortName, true>` twice in `PortMetrics.ts` | one `as const` tuple, one `satisfies ReadonlyArray<PortName>` | this phase | a misspelt member is a compile error |
| Two fixture tables (`PortFixtureData`, `PORT_FIXTURES`) in `Ports.ts` | a `fixture` member per description | this phase | a sixth port states its fixture where it states its span |
| `ScopedPort` as a hand union and a read that routes by hand | derived from `LEAF_NEEDS` and one routing read | this phase | the `resourceId` column is read by the code it describes |

**Deprecated/outdated:** the ADR-QD-094 CCR-QD-270 rejection of a `fixture` field and the CCR-QD-419 rejection of span derivation (both reversed with reasons, D-09, D-11); the context's `max(10%, spread)` band (D-16a); the sentence "`readScoped` does not read the column" (BEH-QD-588, D-26).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase 89's own `records --close` will start naming revision lines once Phase 90 bumps the registers, by the same mechanism Phase 89 moved Phase 88's | P9 | the ledger gains or loses a row; plan 1 measures it at the base and the commit-keyed rows are written before the commits exist, so a wrong guess is caught by `90-earlier-checks.mjs --self-test` and the first run |
| A2 | Core coverage stays at or above 95% with the new `readScoped` branches | P10 | `pnpm coverage` fails in the plan that lands (g); closed with a test, not a threshold change |
| A3 | `readScoped`'s hoisted `Match` and table lookup cost at most 5% on any workload and at most +2% geomean | P6 | the bench gate is the judge; if it fails, D-16's fallback records the rejection and reports PFACT-03 not met. This is the one claim that cannot be settled without running the gate |
| A4 | `pnpm spec:package` (gate 14) passes with the unexported `FixtureBuilders` in the emitted d.ts | P11 | the d.ts compiled and emitted; gate 14 compiles a consumer against the packed d.ts and was not run here |

All other claims are tagged to a probe output, a file read this session, or `90-CONTEXT.md`.

## Open Questions

(All decided autonomously 2026-11-26.)

1. **Does the not-needed branch need to be unreachable by type, or only dead by data?**
   - What we know: `BareOf<K>` makes `bare` `undefined` for `RelationshipResolver` and a row change is TS2322 (P1 negative control).
   - What's unclear: the runtime test `bare !== undefined` remains.
   - Decided autonomously 2026-11-26: keep it; it is the type-and-data pair that makes the branch dead for that port, and its mutant is an `EQUIVALENT` entry (D-15a).
2. **Thunk or reordering for `fixture`?**
   - Decided autonomously 2026-11-26: reorder (builders above the descriptions). It leaves `fixture: attributeResolverFromRecord` as a plain reference, and the load-order trap is a tsc error and a load-time `ReferenceError`, so it cannot be missed (D-11a).
3. **Span form (i) or (ii)?**
   - Decided autonomously 2026-11-26: (i) for all five; (ii) fails for `CustomPredicate` (D-09a).
4. **Should `ScopedLeafTag` and `ScopedPort` be exported from `PortAccess.ts`?**
   - Decided autonomously 2026-11-26: no, they stay module-private as today (the type-equality probe exported them in a scratch copy only; the gate-13 count and the barrel stay untouched).
5. **Where does the fixture-judgement agreement live?**
   - Decided autonomously 2026-11-26: in the replaced `LeafNeeds.test.ts` describe, assertion 2 (D-20), because port modules cannot import `LeafNeeds.ts`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | every script | yes | v26.13.0 | none needed |
| TypeScript | `tsc -b`, tstyche target | yes | 6.0.3 (the tstyche `uses TypeScript 6.0.3` line) | none |
| vitest | tests, bench | yes | v5.1.0 (from the run header `RUN  v5.1.0`) | none |
| tstyche | type pins | yes | 7.2.5 (`TSTyche 7.2.5` banner) | none |
| madge | `pnpm circular` | yes | runs through `node_modules/.bin/madge` (exit 0) | none |
| oxlint | `pnpm lint` | yes | exit 0 on the end state (warnings only in unrelated files) | none |
| `git` | clone, `diff`, phase scripts | yes | clone and `git diff` used | none |
| pnpm | `pnpm check:pr`, `pnpm spec:*` | present in the repo's scripts | not probed this session | run the underlying `node scripts/*.mjs` |
| Stryker | mutation base and close | configured (`stryker.config.mjs`) | not run here | plan 1 runs it |
| The bench harness (`ab.sh`, `analyze.mjs`) | PFACT-03's gate | yes | read in full; not run | none |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 (runtime tests, `@effect/vitest`), tstyche 7.2.5 on TypeScript 6.0.3 (type pins, two passes), the `scripts/check-house-style.mjs` and `scripts/check-api-surface.mjs` gates |
| Config file | `vitest.config.ts` (projects `packages/*`, thresholds), `packages/core/vitest.config.ts` (`include: ["test/**/*.test.ts"]`), `tstyche.json`, `tsconfig.tstyche.json`, `tsconfig.test.json` |
| Quick run command | `node_modules/.bin/vitest run --project core < /dev/null` (about 6 s, 85 files, 2797 tests at the base) |
| Full suite command | `pnpm check:pr < /dev/null` (`node scripts/run-check.mjs --skip-mutation`); the type pins alone: `node scripts/run-tstyche.mjs`; typecheck: `tsc -b tsconfig.json && tsc -p tsconfig.test.json`; cycles: `pnpm circular`; style: `node scripts/check-house-style.mjs`; API surface: `node scripts/check-api-surface.mjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PFACT-01 | each candidate's madge and tsc verdict, recorded | spike evidence | `madge --circular --extensions ts,tsx packages/*/src` and `tsc -b` on the scratch copies; the committed proof is `pnpm circular` and `pnpm typecheck` at the end | spike file is plan 1's |
| PFACT-02 | the tuple, the order, the metric words | runtime characterisation + type pin | `vitest run --project core packages/core/test/PortFacts.characterisation.test.ts`; `node scripts/run-tstyche.mjs packages/core/test/PortFacts.tst.ts` | Wave 0 |
| PFACT-02 | `PredicatePortName` cannot be misspelt | seen-failing scratch variant | a misspelt member in `PREDICATE_PORT_NAMES` fails `tsc -b` with TS2322 `[ASSUMED: not compiled in this spike; the `satisfies ReadonlyArray<PortName>` form compiled when correct]` | Wave 0 |
| PFACT-03 | a scoped read requires an id exactly where its row says | runtime route table | `vitest run --project core packages/core/test/LeafNeeds.test.ts packages/core/test/PortFacts.characterisation.test.ts` | exists (LeafNeeds, edited) / Wave 0 |
| PFACT-03 | the bench gate | bench | `scripts/bench/ab.sh <patch> <outdir> 4 <head> <patched> packages/core/bench/Evaluate.bench.ts "<pattern>"` then `node scripts/bench/analyze.mjs <outdir> <head> <patched> <workloads-file>`; the last line `# gate: pass` | Wave 0 (workloads and file) |
| PFACT-04 | held tests unchanged | pinned check | `node .planning/phases/QD-90-…/90-pinned-check.mjs` | Wave 0 |
| PFACT-04 | a sixth port without its facts is a compile error | scratch tsc + type pins | `90-check.mjs sixth-port`; `node scripts/run-tstyche.mjs packages/core/test/PortFacts.tst.ts` | Wave 0 |
| PFACT-05 | records and changeset | spec gates | `node scripts/check-api-surface.mjs`, `node scripts/check-doc-examples.mjs`, `bash spec/scripts/verify-traceability.sh --strict`, `node scripts/check-dod-table.mjs`, `90-check.mjs records --close` | records plan |
| WX-01..07 | the gates | `pnpm check:pr < /dev/null` | as above | exists |

### Seen-failing scratch variants (D-21, each shown failing once, text recorded in `90-RED-EVIDENCE.md`)

The following variants have already been run in this spike and their failing text is quoted above, so plan 1 re-runs them on the committed states and records the text: a second port given `"qadi.acted"` (`TS1360 … Type 'Claim' does not satisfy the expected type 'never'`, P4); a span widened to `string` or `` `qadi.${string}` `` (TS1360, P4); a description without `fixture` or `span` (`Omit<…>` `not.toBeAssignableTo`, passes only because the omission is refused, P7); `PortName.ts` importing `Ports.ts` (`✖ Found 11 circular dependencies!`, P1); `ScopedPort` written back as a hand union with a fourth member (`TS2741 Property 'AttributeResolver' is missing`, P1); a leaf reclassified so the `bare` row no longer holds (`TS2322 Type 'undefined' is not assignable …`, P1); a builder used before its declaration (`TS2448`/`TS2454` and the `ReferenceError`, P5); `PORT_NAMES` extended or reordered (the order and metric rows, and the P8 sixth-port set). **Not yet run, and plan 1 must:** the `ByScope` arm returning `true`, the `Always` arm returning `false`, the annotation moved after the failure, `readScoped` wrapped in `Effect.fn`, a `switch` on the row (house-style `SWITCH_BUDGET` fails in both directions), `"qadi.attribute"` written in `PortAccess.ts` (`no-port-span-key-literals`).

### Sampling Rate

- **Per task commit:** `node_modules/.bin/vitest run --project core < /dev/null`, plus `node scripts/run-tstyche.mjs packages/core/test/PortFacts.tst.ts` when a type moved, plus `pnpm circular`.
- **Per wave merge:** `pnpm typecheck`, `node scripts/check-house-style.mjs`, `node scripts/run-tstyche.mjs`, `node scripts/check-api-surface.mjs`, the `suite` mode over core, http, testing and devtools.
- **Phase gate:** `pnpm check:pr < /dev/null` green, `90-check.mjs records --close` clean, `90-earlier-checks.mjs` exit 0, `90-BENCH.md` reading `# gate: pass`.

### Wave 0 Gaps

- [ ] `packages/core/test/PortFacts.characterisation.test.ts` (born green on the base; D-18)
- [ ] `packages/core/test/PortFacts.tst.ts` (base pins first, then the born pins; the probe text is in P7)
- [ ] two workloads in `packages/core/bench/Evaluate.bench.ts` and the workloads file (P6)
- [ ] `90-check.mjs`, `90-pinned-check.mjs`, `90-earlier-checks.mjs`, `90-mutation.mjs` with `--self-test`
- [ ] `90-SPIKE.md`, `90-RED-EVIDENCE.md`, `90-BENCH.md`, `90-mutation-base.json`
- [ ] no framework install: vitest, tstyche, madge and oxlint are present

## Security Domain

`security_enforcement` is `true` in `.planning/config.json` (line 10) [VERIFIED: grep]. Qadi is an authorization library: the routing change is the security-relevant part of this phase.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | not touched |
| V3 Session Management | no | not touched |
| V4 Access Control | **yes** | a scoped read with no resource id must fail closed with `MissingResourceId`, before the port is called, with the question annotated (BEH-QD-445); `requireResourceId` stays the one place |
| V5 Input Validation | partly | the wire and `untrustedDecoder` are not edited (D-18 pins the wire bytes); `fixture` data stays plain and serializable (ADR-QD-050) |
| V6 Cryptography | no | not touched |

### Known Threat Patterns for this change

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A scoped read reaching its port without an id (a missing refusal widens a decision) | Elevation of privilege | the route table (D-18) over every scoped tag x scope x site shape x interpreter, held green on the base and through every commit; the replaced `LeafNeeds` describe (D-20) |
| A row reclassified without the route following | Tampering | `BareOf<K>` and `scopedCall` make the compiler demand the decision (P1 negative controls) |
| Two ports sharing a span, so a trace or metric attributes a read to the wrong port | Repudiation | `DistinctSpanNames` at `PORTS` (P4) and the span goldens |
| A leaf-needs change that silently reroutes an `Any`-scoped read to refuse | Denial of service | the `ByScope` arm is `isResourceScoped(leaf)`, still the one scope test (INV-QD-288); the route table pins the `Any` rows |
| A refused read leaking the request through the span | Information disclosure | BEH-QD-445's trace is unchanged and pinned byte for byte by the route table (the span name list, the question's `scope`) |

## Package Legitimacy Audit

This phase installs **no external packages** (no `npm install`, no dependency change; `pnpm-lock.yaml` is untouched). `package-legitimacy check` has nothing to check. Every tool used (vitest, tstyche, madge, oxlint, TypeScript, Stryker) is already pinned by the repository's lockfile.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Project Constraints (from CLAUDE.md / AGENTS.md)

`CLAUDE.md` is `@AGENTS.md`; the directives that bind this phase (read this session, quoted where they decide a choice):

- **Imports:** submodule namespace imports for `effect` (`import * as Effect from "effect/Effect"`); relative imports carry `.ts`; `import type` for type-only. The scratch end state added `import type * as Layer from "effect/Layer"` and `import * as Record from "effect/Record"` in that form.
- **Forbidden:** `as`, `as any`, `!`, `any`; no `switch (x._tag)` (use `Match.tagsExhaustive`); `SWITCH_BUDGET` lists exactly three `switch`es (`Walk.ts evaluateNode`, `Matcher.ts judgeMatcher`, `Matcher.ts resolveRef`) and fails in both directions. The routing uses a hoisted `Match.type`, so no switch is added.
- **§5 `UNTRACED_BUDGET`:** exactly three `Effect.fnUntraced` sites (`Walk.ts`); "Converting anything not in the table above needs a benchmark first". `readScoped` stays a plain function (quoted: "`readPort` and `readScoped` are plain functions that open none").
- **§5a:** `Match.type<T>()` builds the matcher once at module scope; "`Match.value(x)` rebuilds per call … worth avoiding on a per-node evaluation path".
- **§6:** `NOT_CALLABLE_PIN_BUDGET`, `METRIC_ID_LITERAL_BUDGET` (no `"qadi_…"` literal in a test except a counted pin), `SPAN_KEY_LITERAL_BUDGET` (no `qadi.<key>` literal in `packages/*/src` outside the two declaration files), `PORT_DOUBLE_BUDGET`, `MODULE_STATE_BUDGET` (no new `let`/`var` at module scope). The scratch end state added none and `check-house-style` printed clean.
- **§7a:** untrusted decode only through `untrustedDecoder`; not touched.
- **§9 barrels:** `export * from "./PortName.ts"` is core's barrel form; a named re-export to hide the tuple was rejected (D-07). The package's `exports` map is a closed list; there is no `./*`.
- **§10:** `@effect/vitest`; core held at 95%.
- **§11:** `spec/` is normative; a change to public behaviour updates the behaviour doc, the invariant and the traceability matrix in the same change; ` ```typescript ` fences compile, ` ```ts ` fences do not.
- **§15:** documentation is gated; name the script, not the gate number; the merge gate is `pnpm check` and nothing else (`check:pr` skips only mutation).
- **Doc-comment shape:** lead with a one-line summary of what the export is or does; put the why in the paragraphs after it.
- **Memory (user's auto-memory, treated as locked):** never `Record<string, unknown>` as a widened implementation type; add a case as the full union, not `old | "New"`; prefer the complete design, breaking changes allowed, compatibility is never the tiebreaker; no new releases; autonomous mode decides.

## Sources

### Primary (HIGH confidence)
- Probe outputs of this session, quoted above: madge and `tsc -b` on the scratch candidates, the `DistinctSpanNames` cases, the TDZ failure, tstyche both passes, the sixth-port sets, `check-api-surface`, `check-house-style`, oxlint, the core vitest project, the earlier-checks ledger.
- `scripts/bench/ab.sh` and `scripts/bench/analyze.mjs` (read in full), `scripts/check-house-style.mjs` (lines 300-350 read), `stryker.config.mjs` (read), `.planning/phases/QD-89-…/89-earlier-checks.mjs`, `89-check.mjs`, `89-mutation.mjs` (headers read), `packages/core/bench/Evaluate.bench.ts`, `packages/core/src/{PortName,Ports,PortDescription,PortAccess,PortMetrics,PortDerivation,PortServing,LeafNeeds,ScopedLeaf}.ts` and the five port modules' description and builder sections, `packages/core/test/{PortName.tst,PortServing.tst,Ports.tst,LeafNeeds.test,PortDescription.test,LeafFixtures}.ts`.
- `90-CONTEXT.md` (read in full, with the addendum appended by this research) and `AGENTS.md`.

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` F2 and §Phase 90, FEATURES §90.1-90.5, PITFALLS 90-A..D, STACK §Phase 90 (cited through `90-CONTEXT.md`).

### Tertiary (LOW confidence)
- None. No web source was consulted: every claim is about this repository's code and toolchain, and a primary check was available for each.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. No new dependency; every tool ran in this session.
- Architecture: HIGH. Each candidate was compiled and cycle-checked, and the end state passes core's 2797 tests, house style, oxlint and both tstyche passes.
- Pitfalls: HIGH. Each was observed as an error or a printed failure.
- Bench verdict: MEDIUM. The harness constraints and workloads are verified; the gate itself is plan 1's run (A3).

**Research date:** 2026-11-26
**Valid until:** 2026-12-03 (the branch is moving; re-run `git diff fb0b70d3 -- packages/core/src` before planning and re-measure anything the diff touches).

## Cleanliness proof

At the end of this research the scratch tree `<scratchpad>/r90/` is deleted, and the following are checked and recorded in the hand-back message: `git status --porcelain -- packages spec scripts features .changeset` prints nothing; `.stryker-tmp` and `.vitest` do not exist; `reports/` holds only its tracked files (16 entries at the start, none added; the directory is not newly created). The only files this research changed are `90-RESEARCH.md` and the appended "Addendum after research" in `90-CONTEXT.md`.
