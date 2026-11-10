---
id: ARCH-21
title: A port describes its span attributes too — one encode/decode pair per port, written by PortAccess and read by devtools; the wiring report iterates the registry
strength: Strong
status: done
evidence_verified_at: e328e75
depends_on: []            # ARCH-10 (ADR-QD-094) is already on main; nothing else is required to exist
blocks: []
adrs_touched:
  - ADR-QD-094 (amend — completes it: a description also states its span's attributes; the sentence "devtools' row decoder stays per-port on purpose" is kept in substance — per-port fields stay — and corrected in location: they are stated once, in the description, not restated in devtools)
  - ADR-QD-051 (amend — the annotation table moves from prose + two hand-written spellings to the five descriptions; INV-QD-044 gains a type-level floor; `qadi.attempts` is named as a decoded field)
  - ADR-QD-077 (constraint — `PortAccess.ts` stays the one writer of port spans; the question/answer write order is unchanged)
  - ADR-QD-010 (constraint — no Shape changes; the description stays a lens over the Shape)
  - ADR-QD-040 (read — `none.name` is the label a defaulted port carries; used by the wiring report, never by a decision)
  - ADR-QD-034 (constraint — the annotation write is on the resolver-miss path; benchmarked before/after with `Evaluate.bench.ts`)
  - ADR-QD-076 (constraint — `ignoreStatic: true`: key literals in module-level tables are never mutated, so golden key tests, not Stryker, are what pin the wire keys)
  - ADR-QD-037 (constraint — madge; the new core modules import no port module)
  - ADR-QD-038 (constraint — changeset in the fixed version group)
  - ADR-QD-002 / AGENTS.md §7 (read — the schema-first rationale for data that crosses a boundary is what justifies deriving the row types from leaf schemas)
packages: ["@qadi/core", "@qadi/devtools", "spec", "scripts (one house-style rule)"]
estimate: L   # ≈ 4–5 days complete (T0–T12); the two defect/gap tasks alone (T1, T3) ≈ 1 day
---

# ARCH-21 — A port describes its span attributes too

## 1. Verified evidence (at `e328e75`)

Branch `main`, `git log --oneline -1` = `e328e75 Keep mutation runs sequential, a worker per core; gate every Stryker config (#146)`.
`git diff --stat d0884e6 e328e75` touches none of `PortAccess.ts`, `PortCalls.ts`, `Wiring.ts`,
`ServicesPanel.tsx`, `PortDescription.ts`, `Ports.ts`, `PortDerivation.ts`, `30-port-calls.md` or
ADR-QD-094, so the review's line numbers hold unchanged. Nothing in the repo was edited.

**Probes** (all under `scratchpad/wave3/ARCH-21/`, run from the package dir with
`NODE_OPTIONS="--conditions=bun" <repo>/node_modules/.bin/tsx <probe>`, which resolves
`@qadi/core` to `src/`):

- `span-probe.mts` — a real `evaluate(allOf([hasAttribute("tier", gte(3)), hasSignature("approve", { signerRole: "lead" })]))`
  with `attributeResolverRetrying(recurs(2))(attributeResolverFromRecord({tier: 5}))` and
  `signatureHistoryFromSignatures([...])`, under a collecting tracer. Prints every span's attributes.
- `drift-probe.mts` — the same evaluation under devtools' `collectPortCalls()`, printing each decoded
  row, then `wiringReport`.
- `codec-probe.mts` — Schema v4 `Struct` + `encodeKeys` as a span codec: semantics and cost.
- `spike/` — a typed field-table codec (`PortSpan.ts`, `use.ts`, `neg.ts`) type-checked with
  `tsc -p spike/tsconfig.json` (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`, `effect/*` mapped to the repo's `effect@4.0.0`), then run (`run.mts`).

Probe output, abridged:

```
SPAN qadi.attribute    {"qadi.attribute":"tier","qadi.subject_id":"alice","qadi.interpreter":"evaluate","qadi.attempts":1,"qadi.resolved":true}
SPAN qadi.hasSignature {"qadi.subject_id":"alice","qadi.meaning":"approve","qadi.scope":"Resource","qadi.interpreter":"evaluate","qadi.signer_role":"lead","qadi.resource_id":"doc-1","qadi.matched":true}
ROW  {"span":"qadi.attribute",...,"subjectId":"alice","_tag":"AttributeResolver","attribute":"tier","resolved":true}
ROW  {"span":"qadi.hasSignature",...,"subjectId":"alice","_tag":"SignatureHistory","meaning":"approve","signerRole":"lead","matched":true}
WIRE AttributeResolver "attributeResolverFromRecord (retrying)"
WIRE RelationshipResolver "RelationshipResolverNever"      <- the fail-closed default, reported as a plain name
WIRE DecisionHistory "DecisionHistoryUnknown"              <- ditto
WIRE CustomPredicate "CustomPredicateNone"                 <- ditto
```

### C1. `rowOf` decodes span attributes by hand, per port — **CONFIRMED**

`packages/devtools/src/model/PortCalls.ts:273-335` — `rowOf` is a `Match.value(name)` over the five
span names; each arm spells its keys (`"qadi.event"`, `"qadi.signer_role"`, …) and calls one of three
hand type-checks (`stringAt` `:350-353`, `numberAt` `:361-364`, `booleanAt` `:366-369`).
`interpreterAt` (`:356-359`) restates core's closed `Interpreter` pair as `PortCallInterpreter`
(`:65`), because core's `Interpreter` (`PortAccess.ts:54`) is out of the barrel.

### C2. Core writes the same keys in `PortAccess.ts` — **CONFIRMED**

`packages/core/src/PortAccess.ts` writes 13 distinct `qadi.*` keys across five spans, all as inline
object literals passed to `Effect.annotateCurrentSpan`: `:147-151` and `:158` (attribute),
`:216`, `:234-239`, `:262-268` (acted), `:339-345`, `:359` (relationship), `:373-377`, `:384`
(custom), `:415-422`, `:434` (signature). `qadi.subject_id` and `qadi.interpreter` are spelled six
times each. The two sides share no definition: the key list is restated a third time in prose in
`spec/behaviors/30-port-calls.md:27-33` and a fourth in ADR-QD-051's table.

### C3. Span **names** come from the descriptions; attribute **keys** do not — **CONFIRMED**

Names: `PortCalls.ts:46` `PORT_SPANS = forEveryPort((d) => d.span)`, and every read in `PortAccess.ts`
is `Effect.fn(<port>Port.span)` (`:139,227,254,328,367,407`). Keys: no description field carries
them (`PortDescription.ts:52-122`). ADR-QD-094 made this explicit and deliberate —
`spec/decisions/094-a-port-is-described-once.md:143`: "devtools' row decoder stays per-port on
purpose — each port asks a different question" — and ARCH-10's plan listed it as a non-goal
(`ARCH-10-port-descriptions.md:134`). This plan argues the per-port *fields* are genuine and the
per-port *restatement* of their spelling and types is not (§2).

### C4. Drift: the signature span's `qadi.scope` and `qadi.resource_id` are dropped by devtools — **CONFIRMED**

Written at `PortAccess.ts:418` (`"qadi.scope": scope`) and `:421`
(`"qadi.resource_id"`, when scoped and a string). `SignatureHistoryCall` (`PortCalls.ts:141-146`)
has `meaning`, `signerRole`, `matched` only, and the `qadi.hasSignature` arm (`:312-321`) reads only
those. Probe: the `SPAN` line carries both keys, the `ROW` line carries neither. Consequence on screen:
`ServicesPanel.tsx`'s `describe` (`:212-215`) cannot say "on doc-1" / "anywhere" for a signature call
the way it does for a history call (`:200-203`), so a reader cannot tell a resource-scoped signature
lookup from an `Any`-scoped one. No test notices, because the fields do not exist on the row type.

### C5. Drift: nothing reads `qadi.attempts` — **CONFIRMED**, and it lands on the port span

Written by `retryCountingAttempts` (`packages/core/src/PortDerivation.ts:111-124`, the annotate at
`:122`), which every `…Retrying` wrapper uses (`retryingPort`, `:163-181`). It annotates the
**current** span at the call, which inside an evaluation is `PortAccess.ts`'s port span — probe:
`"qadi.attempts":1` on `qadi.attribute`. No `src/` file outside `PortDerivation.ts` names the key
(`grep -rn qadi.attempts packages/*/src`). Its only tests assert it on a synthetic `"caller"` span
(`PortDescription.test.ts:129,150`, `PortConformance.test.ts:256,280`); **no test asserts it reaches
the port span in a real evaluation**, and BEH-QD-227's key listing (`30-port-calls.md:27-33`) omits it.
`PortActivity.retries` (`Wiring.ts:115`) is a process-wide aggregate; the per-call count — the thing
KH-01 added the annotation for ("a trace reader sees one deceptively slow call rather than the N
store round trips", `PortDerivation.ts:93-99`) — reaches no panel.

### C6. `wiringReport` lists the ports by hand — **CONFIRMED**, with one correction

`packages/devtools/src/model/Wiring.ts:73-109`: nine `Effect.serviceOption` reads and nine
`required(...)`/`optional(...)` rows, written out. A sixth registry port compiles and never appears.
**Correction to the review:** four of the nine rows are not ports and stay hand-listed by design —
`EvaluationId`, `CurrentSubject`, `DecisionCache`, `DecisionSink` (`Ports.ts:17-19` says so). Only
the five port rows can iterate `forEveryPort`. The other half of the claim — "a sixth port never shows
up" — is true for `wiringReport` but **not** for `rowOf`: its `Match.exhaustive` over `PortSpanName`
already makes a sixth span a compile error (`PortCalls.ts:282-334`). The drift `rowOf` admits is a
key added to, renamed in, or retyped on an *existing* span (C4, C5).

### C7. The report cannot tell "defaulted fail-closed" from a real adapter — **CONFIRMED**; `d.none.name` answers it

`PortReport` (`Wiring.ts:37-51`) has `name`, `required`, `present`, `consequence` — no defaulted
flag. `ServicesPanel.tsx:229-232` `stateOf` prints the name verbatim, so the default reads as just
another implementation (`"RelationshipResolverNever"` in the probe). Every default is built by
`nonePort` (`PortDerivation.ts:263-275`), which names the shape `d.none.name`, so
`name === d.none.name` identifies it. Two edges the plan must decide (D-21-f):
a **wrapped default** reads `"AttributeResolverNone (retrying)"` (`wrapPort`, `PortDerivation.ts:128-147`,
BEH-QD-196's naming contract), so exact equality misses it; and `name` is a label only —
`AttributeResolverShape.name`'s doc (`AttributeResolver.ts:22-34`): "Nothing branches on it, and
nothing may … never an input to a decision". A panel label derived from it is a reader's label, not a
decision, so the rule holds.

### C8. Spec text has drifted around the same facts — **CONFIRMED** (fixed in T10)

- `spec/devtools-spec/02-screens.md:270-271`: "a meta line with the fail-closed consequence **when
  defaulted**" — the panel shows the consequence unconditionally (`ServicesPanel.tsx:116`), because it
  cannot know (C7).
- `02-screens.md:131` and `00-overview.md:154`: the collector "keeps the **three** port spans" — five.
- `02-screens.md:273`: "`name?` exists on **four** port shapes" and "five of the seven" — five shapes,
  seven of nine (`Wiring.ts:9-16`).
- `spec/behaviors/28-devtools-screens.md` BEH-QD-215 requirement lists five required services and
  omits `CustomPredicate` and `SignatureHistory`, which `Wiring.ts` and its test (`Wiring.test.ts:53-66`)
  treat as required.
- INV-QD-044 (`spec/invariants.md:1717`), `30-port-calls.md:60-61` and `02-screens.md:137`: "the other
  **two** ports answer with closed enums" — four ports; two answer booleans (`CustomPredicate`,
  `SignatureHistory`'s `matched`).
- ADR-QD-094's Document ID reads `QADI-ADR-901` (`094-…md:7`); 095–097 carry 902–904 likewise.
  Only 094 is in this plan's scope; the rest is reported to the orchestrator.

### C9. INV-QD-044 and the test that pins it — **CONFIRMED**, with a gap under `toPredicate`

`spec/invariants.md:1705-1740`. Enforcement: `packages/core/test/Evaluate.test.ts:3103-3118` ("a
resolved attribute's value never reaches any span") resolves `"sentinel-8f21-do-not-disclose"` and
asserts it appears in no attribute of any span; `features/features/port-calls/port-calls.steps.test.ts:382-388`
does the same in BDD; `packages/devtools/test/model/PortCalls.test.ts:158` asserts no `value` on the
row. **Gap:** BEH-QD-267 requires "a resolved value MUST NOT be recorded" under `toPredicate`
(`30-port-calls.md:101-103`), but `Predicate.test.ts` only asserts `qadi.resolved: true` (`:1472`);
no sentinel search runs under `toPredicate`. Today the invariant lives in one expression
(`value !== undefined`, `PortAccess.ts:158`); nothing structural stops a future arm annotating a value.

### C10. BEH-QD-227 ordering and ADR-QD-051 — **CONFIRMED**, both constrain the codec's shape

`30-port-calls.md:78-86` and ADR-QD-051 ("The question is annotated before the call, the answer
after"): each read annotates the question **before** `requireResourceId` / the port call
(`PortAccess.ts:144-151`, `:260-269`, `:335-348`, `:414-425`) and the answer after. A codec that
encoded one record per span would break "a span MUST carry its question even when the port failed".
So each port needs **two** structs — question and answer — written at the two existing points.
`qadi.attempts` is written between them, by a different module.

### C11. Schema v4 as the whole codec — **measured; unsuitable as-is**

`codec-probe.mts`, two runs: `Schema.Struct(...).pipe(Schema.encodeKeys(...))` round-trips correctly,
but (a) `Schema.encodeSync` costs **≈1.1–1.2 µs/op** for a five-field question against ≈0.025 µs for
today's object literal — two per read would add ≈2.3 µs to ADR-QD-051's ≈13 µs resolver-miss
workload (≈+17%); and (b) whole-struct decode **fails entirely** on one wrong-typed attribute
(`SchemaError: Expected string at ["qadi.subject_id"]`), contradicting BEH-QD-228's "a wrong-typed
value reads the same as a missing one" (`30-port-calls.md:181-187`).

### C12. A typed field table with Schema leaves works with no `as`/`any` — **CONFIRMED by spike**

`spike/PortSpan.ts`: `spanStruct(fields, keys)` where `fields` is a `Schema.Struct.Fields` whose every
member is constrained to `Type: string | number | boolean` and no services, and `keys` is a required
`{ [K in keyof Fields]: \`qadi.${string}\` }`. `encodeSpan` walks the value's own entries
(≈**0.19 µs/op**); `decodeSpan` decodes each field alone with `Schema.decodeUnknownOption`
(lenient: `{"qadi.scope":"Elsewhere","qadi.event":"raised"}` → `{"event":"raised"}`), then the struct
(≈4.9 µs/op, read path only). `tsc` exit 0; `neg.ts`'s four `@ts-expect-error`s all fire: a field with
no key, a key outside `qadi.`, a `Schema.Unknown` field, and an object-valued field. The last two are
INV-QD-044's floor expressed as a type: **no port can declare a span field that holds arbitrary
data.**

## 2. Goal and success criteria

**Goal.** Today the span-attribute contract is a *shallow, duplicated interface*: two adapters
(`PortAccess.ts`, the writer; `PortCalls.ts`, the reader) each spell thirteen keys and their types
independently, with prose in two spec documents as a third and fourth copy, and the seam between
them is nothing but string equality — which has already drifted twice (C4, C5). This plan moves
that knowledge into the **port description**, the module ADR-QD-094 created to hold every per-port
fact, so the description gains depth: one statement per port of *what its span asks* (a question
struct, written before the call) and *what it discloses* (an answer struct plus a `disclose`
projection, written after). The writer and the reader become thin adapters over that one interface —
`PortAccess.ts` encodes through it; devtools decodes through it — so **locality** improves (a key is
renamed in one place) and **leverage** grows (a new field reaches the trace and the panel with one
edit, and a sixth port's span is a description entry, not three files). INV-QD-044 moves from one
expression in `PortAccess.ts` into the interface itself: a field type that can hold arbitrary data
does not compile. The wiring report applies the same idea on the layer side: its five port rows are
derived from the registry (`forEveryPort`), and each says whether it is the description's fail-closed
default (`none.name`).

**Success criteria.**

1. `grep -nE '"qadi\.(attribute|subject_id|interpreter|resolved|event|scope|resource_id|answer|relation|depth|custom_predicate|meaning|signer_role|matched|attempts)"' packages/core/src/PortAccess.ts packages/core/src/PortDerivation.ts packages/devtools/src/model/PortCalls.ts` prints nothing; the keys appear only in the five port modules and the new `PortSpanEncode.ts` (shared fields). Enforced by the house-style rule from T8.
2. A signature call decoded from a real evaluation carries `scope` and `resourceId`; any port call made through a retrying wrapper carries `attempts` (T1 tests, then the same tests unchanged after T7).
3. For every registry port, `decodePortSpan(d, encode(question) ∪ encode(answer))` returns the question and the disclosed answer exactly (property test over the conformance suite's case table, T4/T5).
4. A wrong-typed or out-of-union attribute decodes as absent, field by field (T4 test), keeping BEH-QD-228.
5. `spanStruct({ v: Schema.Unknown }, …)` and an object-valued field are compile errors (tstyche, T4); every port's answer struct encodes only `string | number | boolean` (tstyche over `PORTS`, T5).
6. The INV-QD-044 sentinel test passes under both `evaluate` and `toPredicate` (T2).
7. Every existing literal-key span assertion in `Evaluate.test.ts` (60 key mentions), `Predicate.test.ts` (16) and the BDD port-calls suite passes **unchanged** — the wire is byte-identical (T6).
8. `wiringReport.ports` contains exactly one row per `PortName` derived from `forEveryPort` plus the four non-port rows; a port at its default reads `defaulted: true` (also when wrapped), a real adapter `false`, a non-port row `undefined` (T3).
9. `Evaluate.bench.ts` "resolver miss — one port call" stays within run-to-run noise of its T0 baseline (T6).
10. `pnpm check` passes, including gate 13 (`node scripts/check-api-surface.mjs`) with every new export listed or reasoned, and gate 12 (`node scripts/check-devtools-claims.mjs`) after the devtools-spec edits.

## 3. Non-goals

- **No new span keys** beyond reading what core already writes. `qadi.on_file` (signature count),
  values of `params` for custom predicates, and a per-decision correlation id are out — each is a
  disclosure decision of its own (ADR-QD-051's "Alternatives").
- **The non-port spans** (`qadi.evaluate`, `qadi.toPredicate`, `qadi.filter`, `qadi.discharge`,
  `SubjectSet`'s) keep their inline annotations. They are not described ports and nothing reads them
  back structurally.
- **Per-port rendering stays per-port.** `ServicesPanel.tsx`'s `describe` (`Match.tagsExhaustive`)
  is genuine UI and keeps one arm per port; only the row it renders is derived.
- **No change to metrics**, `PortActivity`, the collector's capacity/ordering, or the
  tracer-delegation rule (BEH-QD-228).
- **No branching on `name` in core.** The defaulted flag is computed in devtools for display.
- **ARCH-20's** headless simulation session and **ARCH-24's** sampling of wiring into the dock are
  separate plans; this one only changes `wiringReport`'s and `PortCall`'s shapes (§9 sequencing).

## 4. Constraints

- **AGENTS.md §1** — namespace imports of `effect/*` submodules; `.ts` extensions; `import type`.
- **§2/§3 + ADR-QD-010/094** — Shapes unchanged; the attributes are a new description field beside
  `span`, declared in each port module (locality). The generic machinery is not a sixth port module.
- **§4** — no new error classes, so **`SCHEMA_ERROR_BUDGET` is untouched** (stays twelve).
- **§5 + ADR-QD-073** — the encode helpers are plain functions returning `Effect`, not `Effect.fn`:
  they must not open spans (they annotate the current one) and must not add an `Effect.fnUntraced`.
  **`UNTRACED_BUDGET` is untouched** (three). The six reads stay `Effect.fn(d.span)`.
- **§5a + ADR-QD-034** — no `switch`; **`SWITCH_BUDGET` untouched** (three). `rowOf`'s `Match.value`
  is replaced by a per-port table (D-21-e), not by a `switch`. Any hot-path change is benchmarked first.
- **§6** — no `as`, `any`, `!`. **`ANY_BUDGET` untouched** (seven, all in `HttpApiMiddlewareClient.ts`).
  The spike (C12) proves the codec needs none. `check-house-style.mjs` matches `as` textually, including
  in strings and comments: new UI copy must avoid the word (the "the same as" trap noted at
  `ServicesPanel.tsx`'s `CacheCard` doc).
- **User memory: no `Record<string, unknown>` as a widened implementation type to dodge `as`.** The
  encoder's *output* is genuinely `Readonly<Record<string, unknown>>` — that is
  `Effect.annotateCurrentSpan`'s parameter type, not a widening. The decoder's typed result comes from
  `Schema.decodeUnknownSync(struct)`, not from a cast of an accumulator (C12).
- **User memory: closed union over widening** — `PortReport.port` becomes a closed union
  (`PortName | "EvaluationId" | "CurrentSubject" | "DecisionCache" | "DecisionSink"`), not `string`.
- **`HAS_CUSTOM_BUDGET`, `DECISION_READ_BUDGET`** — not touched.
- **`PORT_DOUBLE_BUDGET`** — new tests use `scriptedPort` (`PortReply.fail`) for failing ports; no test
  constructs a port error by hand, so no entry changes.
- **§7 + ADR-QD-002** — span attributes cross a boundary (any producer may write the `qadi.`
  namespace, BEH-QD-228), which is exactly §7's argument for deriving the type from the schema rather
  than maintaining two. Leaf schemas are Schema; the struct type is derived (`SpanType<…>`).
- **§9** — barrel alphabetical; internal scaffolding (`PortSpanEncode.ts`) stays out of it and is
  reachable through `@qadi/core`'s `./*` subpath, like `PortAccess.ts`/`PortDerivation.ts`.
- **§11/§15** — spec is normative: BEH-QD-227/228/215, INV-QD-044, ADR-QD-051/094 change in the same
  PR; **gate 13** `node scripts/check-api-surface.mjs` needs every new export in `spec/overview.md` or
  its "Not listed above" table; **gate 12** `node scripts/check-devtools-claims.mjs` re-run after
  editing `spec/devtools-spec/`.
- **§12** — `30-port-calls.md`'s listing is a ` ```ts ` fence (reference); if it becomes a
  ` ```typescript ` example it must compile under `node scripts/check-doc-examples.mjs`.
- **ADR-QD-037 (madge, `pnpm circular`)** — `PortSpan.ts`/`PortSpanEncode.ts` import only `effect/*`
  and `PortMetrics.ts`; port modules import them; `PortAccess.ts`/`PortDerivation.ts` import them.
  No edge back. Type-only edges count.
- **ADR-QD-076 (`ignoreStatic: true`)** — the key strings in each description's `spanStruct(...)`
  call run at import and are **static mutants, skipped**. A mutated key would also change encode and
  decode together, so a round-trip test could not see it anyway. The keys are pinned by the golden
  literal-key assertions in `Evaluate.test.ts`/`Predicate.test.ts` (criterion 7). Stryker covers the
  runtime walkers (`encodeSpan`, `decodeSpan`, `decodePortSpan`, `disclose`).
- **Stryker scopes** — `stryker.config.mjs` mutates `packages/core/src/**` and runs **only core's
  tests** (`vitest.dir: packages/core`). The codec's decode must therefore be tested in core, not only
  through devtools. `stryker.devtools.mjs` mutates `packages/devtools/src/model/**` (break 80).
- **ADR-QD-038** — one changeset, fixed group.
- **No new runtime dependency** in either package; devtools still depends only on `@qadi/core`.

## 5. Decisions needed before work starts

### D-21-a — The codec mechanism

- **A. Schema `Struct` + `encodeKeys`, encode and decode whole.** One definition, fully Schema.
  Measured ≈1.1 µs per encode (C11) — two per read, ≈+17% on the resolver-miss workload — and the
  whole-struct decode fails on one bad field, breaking BEH-QD-228. Would need leniency rebuilt around it.
- **B. A field table with Schema leaves** (`spanStruct(fields, keys)`): Schema supplies each leaf's
  type and per-field lenient decode; encode is a walk over the value's own entries (≈0.19 µs); the
  struct type is derived; INV-QD-044's floor is a type constraint. Spiked, compiles with no `as`/`any`
  (C12). Cost: one small generic module to read.
- **C. Hand-written encode/decode function pair per port**, inside each description, held together by
  a round-trip property law in the conformance suite. Fastest encode (object literal), no generic
  machinery; but each port spells its keys twice (once per direction), and the drift it prevents is
  only caught by the law at test time, not by construction.
- **D. Export key constants only** (`ATTRIBUTE_KEY = "qadi.attribute"` …) and keep both adapters.
  Smallest diff; fixes spelling drift but not *missing-field* drift (C4, C5) — the reader still chooses
  which keys to read.

**Recommendation: B.** It is the only option where a key is written once and both directions follow
from it, with leniency and the INV-QD-044 floor by construction. If T6's benchmark shows the walk is
not within noise, fall back to **C for the encode direction only** (literal encoders, checked against
the B table by a differential property test) — the decode stays B. `status: decided (2026-10-07, B — a field table with Schema leaves; encode is a walk over the value's entries)`

### D-21-b — Where the attributes live on the description

- **A. A new field `attributes` beside `span`** (`span: PortSpanName` unchanged), typed
  `PortSpanAttributes<Q, Ans, O>`, with a seventh `PortDescription` type parameter `Span` defaulted to
  a structural upper bound so the five generic derivations (`PortDerivation.ts`, `PortDoubles.ts`) do
  not change signature. `Ports.ts` gains `SpanOf<D>` and `DescriptionOf<K>` threads it.
- **B. Replace `span` with an object** `{ name, question, answer, disclose }`. Name and attributes
  together; but every `Effect.fn(d.span)` (6), `forEveryPort((d) => d.span)` (devtools + `PortsLayer.test.ts:119`)
  changes to `d.span.name`.
- **C. A sibling registry** `PORT_SPAN_ATTRIBUTES: { [K in PortName]: … }` in its own module. No
  description change; but the facts leave the description, which is what ADR-QD-094 exists to prevent.

**Recommendation: A.** Least churn, keeps the per-port facts in the description. If the defaulted
type parameter does not type-check (variance of `Schema.Struct<F>` inside the bound is the risk),
T5's step 1 falls back to an explicit seventh–ninth parameter threaded through the generic
derivations — mechanical, and the spike in T4 decides it before T5 starts. `status: decided (2026-10-07, A — `attributes` beside `span`; seventh defaulted type parameter (the bound type-checked, no explicit parameters needed))`

### D-21-c — What `disclose` takes

- **A. A per-port outcome type `O`**: the port's own answer `A` for four ports (attribute `unknown`,
  history `ActedResult`, relationship `RelatedResult`, custom `boolean`), and the existing
  `SignatureAnswer` (`PortAccess.ts:393-396`) for signatures. The signature match stays in
  `PortAccess.ts`, where its doc says it belongs.
- **B. `(question, A)`**, which moves the signature match into the description so it is stated where
  `qadi.matched` is declared. Mixes HasSignature's policy semantics into a port fact.

**Recommendation: A.** For the attribute port `disclose: (value: unknown) => ({ resolved: value !== undefined })`
is now *the* home of INV-QD-044 — the only path from a resolved value to a span. `status: decided (2026-10-07, A — `disclose` takes the port's own outcome; `SignatureAnswer` moved to `SignatureHistory.ts`)`

### D-21-d — What is public, what is internal (gate 13)

Recommended split:

| Export | Module | Public? | Why |
| ------ | ------ | ------- | --- |
| `SpanValue`, `SpanFields`, `SpanStruct`, `SpanType` | `PortSpan.ts` *new* | public (types) | The description's new field is public (descriptions are, D-10-c), so its types must be nameable in `.d.ts` (TS2883) |
| `PortSpanAttributes`, `PortSpanRow`, `PortSpanRowOf` | `PortSpan.ts` | public (types) | devtools names the decoded row per port |
| `decodePortSpan` | `PortSpan.ts` | public (function) | devtools' one read; core never decodes its own spans in `src` |
| `PortInterpreter` | `PortSpan.ts` | public (type), **moved** from `PortAccess.ts`'s `Interpreter` | a decoded field's type; the generic name `Interpreter` would leak into the flat barrel (§9), hence the prefix |
| `spanStruct`, `encodeSpan`, `subjectIdField`, `interpreterField`, `attemptsStruct` | `PortSpanEncode.ts` *new* | **internal** (`./*` only) | writing port spans is core's job alone (ADR-QD-077); a host has no port to describe (closed registry) |

`PortAccess.ts`'s "Not listed above" row drops `Interpreter` and gains nothing; a new "Not listed
above" row covers `PortSpanEncode.ts`. devtools' `PortCallInterpreter` becomes an alias of
`PortInterpreter` (kept, non-breaking). `status: decided (2026-10-07, recommended split, with one file added: public types in `PortSpan.ts`, public `decodePortSpan` in `PortSpanDecode.ts`, internal machinery in `PortSpanEncode.ts` (the gate-13 checker reads declaration-form exports only and the types and the machinery must not form an import cycle))`

### D-21-e — How devtools builds `PortCall` rows

- **A. A five-line per-port table** typed `{ readonly [K in PortName]: (span: Tracer.Span) => PortCallOf<K> }`,
  each line `(s) => ({ _tag: "X", ...base(s), ...decodePortSpan(PORTS.X, s.attributes) })`. Exhaustive
  over `PortName`: a sixth port is a compile error. No key appears.
- **B. A generic `PortVisitor` over `forEveryPort`** producing a correlated `PortCallOf<K>`. Zero
  per-port lines; but building a correlated value for a generic `K` is the case ADR-QD-094's
  `DescriptionOf<K>` needed care for, and may need a cast.

**Recommendation: A**; adopt B only if it type-checks with no `as` in T7's first step. `status: decided (2026-10-07, A — a per-port table typed over `PortName`)`

### D-21-f — How "defaulted" is detected

- **A. `name === d.none.name`.** Exact; misses a wrapped default (`"AttributeResolverNone (retrying)"`).
- **B. A, plus `name.startsWith(\`${d.none.name} (\`)`** — a wrapper around the default is still a
  fail-closed port; the `"<inner> (<suffix>)"` shape is BEH-QD-196's stated contract, not an accident.
- **C. A brand** (a non-enumerable symbol) set by `nonePort` on the default's shape. Robust to a host
  naming its own adapter `"AttributeResolverNone"`; but `wrapPort` builds a fresh shape, so the brand
  is lost under any wrapper unless every wrapper copies it — new core machinery for a panel label.

**Recommendation: B**, documented as a reader's label (a host that names its adapter after a
default is reported as defaulted, which is what it asked for). Core never reads it. `status: decided (2026-10-07, B — `name === none.name` or starts with `none.name + " ("`)`

### D-21-g — What the Services card says when a port is defaulted

- **A.** State line `defaulted — <none.name>` (or `defaulted — <name>` for a wrapped default) in the
  warning tone 00-overview's vocabulary rules ask for ("Fail-closed defaults are warnings, not
  errors"); consequence line shown in that tone when defaulted, and muted, prefixed "if defaulted:",
  when a real adapter is wired.
- **B.** Show the consequence only when defaulted, exactly as 02-screens.md:270-271 reads.

**Recommendation: A** — keeps the existing "states what being defaulted costs" test true for every
card while making the defaulted case visually distinct; 02-screens.md is updated to match. `status: decided (2026-10-07, A — warning tone and `defaulted — <name>` when defaulted; muted `if defaulted:` for a wired adapter)`

### D-21-h — A regression guard for literal keys

- **A. A house-style rule** in `scripts/check-house-style.mjs`: in `packages/core/src/PortAccess.ts`,
  `packages/core/src/PortDerivation.ts` and `packages/devtools/src/model/PortCalls.ts`, no string
  literal matching `"qadi\.[a-z_]+"` may appear except a doc comment. A fixed file list, zero allowed —
  not a counted budget.
- **B. No rule**; rely on review.

**Recommendation: A.** The drift this plan fixes is exactly the kind review missed twice. `status: decided (2026-10-07, A — rule `no-port-span-key-literals`, a fixed three-file list, zero allowed, `//` comment lines skipped)`

### D-21-i — Narrowing decoded fields to their real unions

Today `ActedCall.scope`/`answer` and `RelationshipCall.answer` are `string | undefined`. Decoding
through the description makes them `"Any" | "Resource"`, `ActedResult`, `RelatedResult` (plus
`undefined`), and a value outside the union reads as absent — the same rule BEH-QD-228 states for a
wrong type. Narrowing an output type is non-breaking for readers.
**Recommendation: accept**, and say so in BEH-QD-228. `status: decided (2026-10-07, accept — decoded fields narrow to their unions)`

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch21/port-span-attributes main`; confirm `git log --oneline -1` (record the sha in §10).
  2. Re-run the four probes in §1 (copy `scratchpad/wave3/ARCH-21/` if the scratchpad was cleared; the
     scripts are self-contained). Confirm C4, C5, C7 outputs match §1.
  3. `grep -l "PortCalls\|Wiring\|ServicesPanel" .planning/architecture/ARCH-2*.md` — read ARCH-20 and
     ARCH-24 if written; record sequencing in §10 (§9 below).
  4. Record the resolver-miss baseline: `pnpm bench packages/core/bench/Evaluate.bench.ts` three times;
     note the "resolver miss — one port call" mean.
- **Tests:** none.
- **Verify:** `pnpm vitest run packages/devtools/test/model/PortCalls.test.ts packages/devtools/test/model/Wiring.test.ts packages/devtools/test/react/ServicesPanel.test.tsx packages/core/test/PortConformance.test.ts packages/core/test/PortDescription.test.ts`; `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs`; `pnpm circular`.
- **Done when:** baseline counts and the bench figure are logged in §10.

### T1 — Show the two dropped facts: signature scope/resource and attempts (test-first defect fix, C4/C5)
- **Status:** [x] done
- **Depends on:** T0 (no decision — today's shape, shippable alone)
- **Files:** `packages/devtools/test/model/PortCalls.test.ts`; `packages/devtools/src/model/PortCalls.ts`;
  `packages/devtools/src/react/ServicesPanel.tsx`; `packages/devtools/test/react/ServicesPanel.test.tsx`.
- **Steps:**
  1. In `PortCalls.test.ts` "what a row says", add (real evaluations, `watch(...)` helper):
     - "a resource-scoped signature call names its scope and the resource" — `hasSignature("approve")`
       with `resource: { id: "doc-1" }` and a `signatureHistoryFromSignatures` fixture; assert
       `call.scope === "Resource"`, `call.resourceId === "doc-1"`.
     - "an Any-scoped signature call names no resource" — `{ scope: "Any" }`; `scope === "Any"`,
       `resourceId === undefined`.
     - "a call through a retrying wrapper carries its attempt count" — attributes layer
       `attributeResolverRetrying(Schedule.recurs(3))(scriptedPort(attributeResolverPort, () => (n++ < 2 ? PortReply.fail("down") : PortReply.answer(5))).layer)`;
       assert `call.attempts === 3`. A second case without a wrapper: `attempts === undefined`.
  2. Run: red (fields undefined at runtime; `pnpm typecheck` also fails on the unknown properties).
  3. Minimal fix in today's style: `PortCallBase.attempts: number | undefined` read by
     `numberAt(span, "qadi.attempts")` in `base`; `SignatureHistoryCall` gains `scope`, `resourceId`,
     read in the `qadi.hasSignature` arm. Green.
  4. `ServicesPanel.tsx` `describe`: the signature arm says `on <id>` / `anywhere` like the history arm;
     every arm appends ` · <n> attempts` when `attempts > 1`. Add two render assertions in
     `ServicesPanel.test.tsx` (hand-built rows are fine there; the model test above uses real spans).
- **Tests:** four model `it.effect`s (red first), two render `it`s.
- **Verify:** `pnpm vitest run packages/devtools/test/model/PortCalls.test.ts packages/devtools/test/react/ServicesPanel.test.tsx`; `pnpm typecheck`.
- **Done when:** the probe's signature and attribute rows carry every key the span carries; this
  commit ships alone (changeset: `@qadi/devtools` patch).

### T2 — Pin the wire contract that must survive the refactor (characterization, green)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/core/test/Evaluate.test.ts`; `packages/core/test/Predicate.test.ts`.
- **Steps:**
  1. `Evaluate.test.ts` port-span block: add "a retried read records its attempts on the port span" —
     a real `evaluate` with a retrying, twice-failing scripted attribute port; assert the whole
     `qadi.attribute` attribute record (`deepStrictEqual`, including `"qadi.attempts": 3`). This closes C5's
     test gap at the source.
  2. `Predicate.test.ts`: add "a resolved attribute's value never reaches any span under toPredicate" —
     the sentinel test of `Evaluate.test.ts:3103-3118` with `toPredicate`, searching every span (C9 gap;
     BEH-QD-267).
  3. Both should pass at HEAD. If (2) is red, stop: that is a live INV-QD-044 defect and becomes its
     own test-first fix before anything else.
- **Tests:** two new `it.effect`s.
- **Verify:** `pnpm vitest run packages/core/test/Evaluate.test.ts packages/core/test/Predicate.test.ts`.
- **Done when:** both pass; they are the golden contract T6 must keep green unchanged.

### T3 — Derive the wiring report's port rows from the registry; say which are defaulted
- **Status:** [x] done
- **Depends on:** T0, D-21-f, D-21-g
- **Files:** `packages/devtools/src/model/Wiring.ts`; `packages/devtools/test/model/Wiring.test.ts`;
  `packages/devtools/src/react/ServicesPanel.tsx`; `packages/devtools/test/react/ServicesPanel.test.tsx`;
  `packages/devtools/test/model/Wiring.tst.ts` *new*.
- **Steps:**
  1. Red tests in `Wiring.test.ts`:
     - "every registry port has exactly one row" — `forEveryPort((d) => d.port)` equals the port rows'
       names in order.
     - "a port at its fail-closed default says so" — under `EvaluationServicesNone`, every port row has
       `defaulted: true`; `EvaluationId` and `CurrentSubject` rows have `defaulted: undefined`.
     - "a wrapped default is still defaulted" — `attributeResolverRetrying(recurs(1))(AttributeResolverNone)` → `true` (D-21-f B).
     - "a real adapter is not defaulted" — `attributeResolverFromRecord({})` → `false`; an unnamed one → `false`.
     - "an absent port is not called defaulted" — no layer → `defaulted: undefined`, `present: false`.
  2. In `Wiring.ts`: `const CONSEQUENCES: { readonly [K in PortName]: string } = { … }` (the five strings
     moved verbatim; exhaustive, so a sixth port is a compile error). Port rows:
     `yield* Effect.all(forEveryPort((d) => Effect.map(Effect.serviceOption(d.service), (shape) => portRow(d, shape))))`,
     with `portRow` computing `name`, `present`, and
     `defaulted = name !== undefined && (name === d.none.name || name.startsWith(\`${d.none.name} (\`))`.
     The four non-port rows stay hand-written after them. `PortReport` gains
     `defaulted: boolean | undefined`; `port` becomes the closed `WiredServiceName` union.
  3. Update the order assertion at `Wiring.test.ts:53-66` to registry order (`AttributeResolver`,
     `DecisionHistory`, `RelationshipResolver`, `CustomPredicate`, `SignatureHistory`, then
     `EvaluationId`, `CurrentSubject`) — the order is now derived, which is the point.
  4. tstyche `Wiring.tst.ts`: `PortReport["port"]` includes `PortName`.
  5. `ServicesPanel.tsx` `stateOf` and `PortCard` per D-21-g; tests: a defaulted card's state text
     contains "defaulted" and its consequence is in the warning tone (data attribute
     `data-defaulted="true"`); a wired card shows "if defaulted:". Existing "never uses the word
     'unwired'" and "states what being defaulted costs" stay green.
- **Tests:** five model tests (red first), one type test, two render tests.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Wiring.test.ts packages/devtools/test/react/ServicesPanel.test.tsx`; `pnpm test:tstyche`.
- **Done when:** `Wiring.ts` names no port service; shippable alone (`@qadi/devtools` minor:
  `PortReport` gains a field and its row order changes).

### T4 — Build the span codec in core: `PortSpan.ts` (public) and `PortSpanEncode.ts` (internal)
- **Status:** [x] done
- **Depends on:** T0, D-21-a, D-21-d
- **Files:** `packages/core/src/PortSpan.ts` *new*; `packages/core/src/PortSpanEncode.ts` *new*;
  `packages/core/src/index.ts`; `packages/core/test/PortSpan.test.ts` *new*;
  `packages/core/test/PortSpan.tst.ts` *new*.
- **Steps:**
  1. Port the spike (`scratchpad/wave3/ARCH-21/spike/PortSpan.ts`) into two files:
     - `PortSpan.ts`: `SpanValue = string | number | boolean`; `SpanFields` (each field
       `Schema.Top & { Type: SpanValue; DecodingServices: never; EncodingServices: never }`);
       `SpanStruct<F>` (`schema`, `keys`); `SpanType<S>`; `PortInterpreter = "evaluate" | "toPredicate"`;
       `PortSpanAttributes<Q, Ans, O>` = `{ question: SpanStruct<…Q>; answer: SpanStruct<…Ans>; disclose: (outcome: O) => Ans }`;
       `decodeSpan` (per-field `Schema.decodeUnknownOption`, then `Schema.decodeUnknownSync(struct)` on
       the filtered record); `decodePortSpan(d, attributes)` = `{ ...decodeSpan(attemptsStruct), ...decodeSpan(question), ...decodeSpan(answer) }`
       typed `PortSpanRow<…>`.
     - `PortSpanEncode.ts`: `spanStruct`, `encodeSpan` (entries walk, skips `undefined`),
       `subjectIdField`/`interpreterField` (the two shared keys, spelled once), `attemptsStruct`.
     Doc comments lead with the one-line summary (AGENTS.md preamble); INV-QD-044 is stated on
     `SpanValue` and `SpanFields`.
  2. `index.ts`: `export * from "./PortSpan.ts";` in alphabetical position. Not `PortSpanEncode.ts`.
  3. `PortSpan.test.ts` (core, so core's Stryker sees it):
     - round trip: `fc.property` over generated question values for a test struct →
       `decodeSpan(s, new Map(Object.entries(encodeSpan(s, v))))` deep-equals `v` (with `undefined`
       fields omitted);
     - leniency: each field independently wrong-typed / out-of-union / absent → that field absent, the
       others kept;
     - `encodeSpan` omits `undefined`, never emits a key not in `keys`, never emits a non-`SpanValue`;
     - unknown `qadi.*` keys on the span are ignored.
  4. `PortSpan.tst.ts`: the four `@ts-expect-error`s of `spike/neg.ts` as tstyche `expect(...).type.toRaiseError()`
     (missing key, non-`qadi.` key, `Schema.Unknown` field, object field).
- **Tests:** ≈8 unit/property tests, 4 type tests.
- **Verify:** `pnpm vitest run packages/core/test/PortSpan.test.ts`; `pnpm test:tstyche`; `pnpm typecheck`; `pnpm circular`; `node scripts/check-house-style.mjs`.
- **Done when:** both modules compile with no `as`/`any`; the property and type tests pass; madge clean.

### T5 — Each port description states its span attributes
- **Status:** [x] done
- **Depends on:** T4, D-21-b, D-21-c, D-21-i
- **Files:** `packages/core/src/PortDescription.ts`; `packages/core/src/Ports.ts`;
  `packages/core/src/AttributeResolver.ts`; `DecisionHistory.ts`; `RelationshipResolver.ts`;
  `CustomPredicate.ts`; `SignatureHistory.ts`; `packages/core/test/PortConformance.test.ts`;
  `packages/core/test/PortDescription.test.ts` (its `probePort`); `packages/core/test/Ports.tst.ts`.
- **Steps:**
  1. `PortDescription` gains `readonly attributes: Span` with a seventh parameter
     `Span extends PortSpanAttributesLike = PortSpanAttributesLike` (D-21-b A). Type-check the five
     generic derivations untouched. If the bound fails variance, switch to explicit `Q, Ans, O`
     parameters and thread them through `PortDerivation.ts`/`PortDoubles.ts` (record which in §10).
  2. `Ports.ts`: `SpanOf<D>`; `DescriptionOf<K>` passes `SpanOf<PortTypes[K]>`.
  3. In each port module, beside `span`, declare `attributes` — exactly today's keys (C2):
     - attribute: question `{ attribute, subjectId, interpreter }`; answer `{ resolved: Boolean }`;
       `disclose: (value: unknown) => ({ resolved: value !== undefined })` with INV-QD-044's comment
       moved here from `PortAccess.ts:132-137`.
     - acted: question `{ subjectId, event, scope: Literals(["Any","Resource"]), resourceId?, interpreter }`;
       answer `{ answer: Literals(["Acted","NotActed","Unknown"]) }`; `disclose: (a) => ({ answer: a })`.
     - relationship: question `{ subjectId, relation, interpreter, resourceId?, depth?: Number }`;
       answer `{ answer: RelatedResult literals }`.
     - custom: question `{ name ("qadi.custom_predicate"), subjectId, interpreter }`; answer `{ answer: Boolean }`.
     - signature: question `{ subjectId, meaning, scope, interpreter, signerRole?, resourceId? }`;
       answer `{ matched: Boolean }`; `disclose: (a: SignatureAnswer) => ({ matched: a.matched })`
       (`SignatureAnswer` moves from `PortAccess.ts` to `SignatureHistory.ts` so the port module does not
       import `PortAccess.ts` — madge).
     Shared `subjectId`/`interpreter` fields come from `PortSpanEncode.ts`.
  4. `PortConformance.test.ts`: per registry port, (a) round trip of a representative question/outcome
     through `encodeSpan` → `decodePortSpan`; (b) every key starts `qadi.` and question/answer keys are
     disjoint; (c) the answer struct's encoded values are all `SpanValue` for an adversarial outcome
     (`fc.anything()` for the attribute port: the encoded record is exactly `{ "qadi.resolved": boolean }`).
     The case table already forces a case per port.
  5. `Ports.tst.ts`: for every `K in PortName`, `SpanType<DescriptionOf<K>["attributes"]["answer"]>`
     values extend `SpanValue` (INV-QD-044 floor for all five).
  6. Update `probePort` in `PortDescription.test.ts` with a minimal `attributes`.
- **Tests:** 3 conformance assertions × 5 ports; 1 type test.
- **Verify:** `pnpm vitest run packages/core/test/PortConformance.test.ts packages/core/test/PortDescription.test.ts`; `pnpm test:tstyche`; `pnpm typecheck`; `pnpm circular`.
- **Done when:** every description carries `attributes`; nothing reads them yet; all green.

### T6 — `PortAccess.ts` and `PortDerivation.ts` write through the descriptions (benchmark-gated)
- **Status:** [x] done
- **Depends on:** T2, T5
- **Files:** `packages/core/src/PortAccess.ts`; `packages/core/src/PortDerivation.ts`;
  `packages/core/test/PortAccess.test.ts` (only if it imports `Interpreter`/`SignatureAnswer`).
- **Steps:**
  1. Two plain helpers in `PortAccess.ts` (not `Effect.fn`):
     `annotateQuestion(d, q) = Effect.annotateCurrentSpan(encodeSpan(d.attributes.question, q))` and
     `annotateAnswer(d, o) = Effect.annotateCurrentSpan(encodeSpan(d.attributes.answer, d.attributes.disclose(o)))`.
  2. Replace each inline literal at the **same point** in each read (BEH-QD-227 ordering): question
     before `requireResourceId`/the call, answer after. Optional fields pass `undefined` instead of the
     `...(cond ? {} : {...})` spreads (`encodeSpan` omits them), e.g. `resourceId: typeof rawResourceId === "string" ? rawResourceId : undefined`.
  3. `Interpreter` becomes `import type { PortInterpreter } from "./PortSpan.ts"` (keep a local
     `type Interpreter = PortInterpreter` only if it reads better; it stays out of the barrel).
  4. `retryCountingAttempts` annotates `encodeSpan(attemptsStruct, { attempts: n })`.
  5. Run T2's golden tests and every existing span assertion **unchanged**:
     `Evaluate.test.ts`, `Predicate.test.ts`, `PortAccess.test.ts`, `PortDescription.test.ts`,
     `PortConformance.test.ts`, BDD port-calls.
  6. Benchmark: `pnpm bench packages/core/bench/Evaluate.bench.ts` ×3; compare "resolver miss — one port
     call" with T0. Within noise → proceed. Outside → apply D-21-a's fallback (literal encoders in
     each description, plus a differential `fc` test against `encodeSpan`), re-measure, record both in §10.
- **Tests:** none new; the golden set is the test (criterion 7).
- **Verify:** `pnpm vitest run packages/core`; `pnpm test:bdd`; `pnpm bench packages/core/bench/Evaluate.bench.ts`.
- **Done when:** no `"qadi.<attr>"` literal remains in either file; all span tests green unchanged;
  benchmark recorded.

### T7 — Devtools reads through the descriptions; `rowOf`'s per-key code is deleted
- **Status:** [x] done
- **Depends on:** T1, T6, D-21-e
- **Files:** `packages/devtools/src/model/PortCalls.ts`; `packages/devtools/test/model/PortCalls.tst.ts`;
  `packages/devtools/src/react/ServicesPanel.tsx` (types only, if field types narrowed).
- **Steps:**
  1. Try D-21-e B for ten minutes (generic visitor, no `as`); else A.
  2. `PortCallOf<K> = { _tag: K; span: PortSpanName; at: number; durationMillis: number | undefined } & PortSpanRowOf<DescriptionOf<K>>`.
     Keep the exported names as aliases: `AttributeCall = PortCallOf<"AttributeResolver">` … and
     `PortCall = PortCallOf<PortName>` distributed. Field names stay as today (`attribute`, `resolved`,
     `event`, `scope`, `resourceId`, `answer`, `relation`, `depth`, `name`, `meaning`, `signerRole`,
     `matched`, `subjectId`, `interpreter`, `attempts`), so `ServicesPanel.tsx` compiles unchanged.
  3. `rowOf` becomes the per-port table of D-21-e; the collector looks the span's port up by
     `d.span` (a `Record<PortSpanName, PortName>` built with `tabulatePorts`/`forEveryPort`).
     Delete `stringAt`/`numberAt`/`booleanAt`/`interpreterAt`.
     `PortCallInterpreter` = `PortInterpreter` (alias, kept exported).
  4. `PortCalls.tst.ts`: keep `PortCallPort = PortName`; add `AttributeCall` has no property typed
     `unknown` (INV-QD-044 on the row).
  5. T1's tests pass **unchanged** — they now exercise the derived decoder.
- **Tests:** none new beyond the tstyche line; T1 and the existing 526-line suite are the proof.
- **Verify:** `pnpm vitest run packages/devtools`; `pnpm test:tstyche`; `pnpm typecheck`.
- **Done when:** `PortCalls.ts` contains no attribute key literal and no per-type reader.

### T8 — Guard against re-introducing literal keys (D-21-h)
- **Status:** [x] done
- **Depends on:** T6, T7, D-21-h
- **Files:** `scripts/check-house-style.mjs`.
- **Steps:**
  1. Add a rule `no-port-span-key-literals` over the three files named in D-21-h A: any string literal
     matching `/["'`]qadi\.[a-z_]+["'`]/` outside comments fails, with a message pointing at the port's
     description. Span **names** are not literals there today (they come from `d.span`), so the rule
     has zero exceptions.
  2. Prove it: temporarily add `"qadi.event"` to `PortCalls.ts`, run, see the failure, revert.
- **Tests:** the script's own self-check, if the file has one; otherwise the manual proof in step 2, logged in §10.
- **Verify:** `node scripts/check-house-style.mjs`.
- **Done when:** the rule is in and green on the branch.

### T9 — Mutation coverage of the codec
- **Status:** [x] done
- **Depends on:** T7
- **Files:** none (or tests, if survivors need killing).
- **Steps:**
  1. Scoped core run: `pnpm exec stryker run --mutate "packages/core/src/PortSpan.ts,packages/core/src/PortSpanEncode.ts,packages/core/src/PortAccess.ts"`.
     Expect walker/`disclose` mutants killed by T4/T5 tests and T2's golden assertions.
  2. Scoped devtools run: `pnpm exec stryker run stryker.devtools.mjs --mutate "packages/devtools/src/model/PortCalls.ts,packages/devtools/src/model/Wiring.ts"`.
  3. For each survivor: kill it with a test, or record why it is unkillable (e.g. a static key string,
     ADR-QD-076) in §10. No ignore list (stryker.config.mjs's rule).
- **Tests:** whatever survivors require.
- **Verify:** the two commands above; scores ≥ 80 (break), recorded in §10.
- **Done when:** both runs pass break; survivors are killed or explained.

### T10 — Spec, ADR, overview, traceability, CCR, changeset
- **Status:** [x] done
- **Depends on:** T3, T7, T8
- **Files:** `spec/decisions/094-a-port-is-described-once.md`; `spec/decisions/051-a-span-says-what-was-asked.md`;
  `spec/behaviors/30-port-calls.md`; `spec/behaviors/28-devtools-screens.md`; `spec/behaviors/06-services.md`;
  `spec/invariants.md`; `spec/traceability.md`; `spec/overview.md`; `spec/README.md`;
  `spec/devtools-spec/00-overview.md`; `spec/devtools-spec/02-screens.md`; `AGENTS.md` (§3 one sentence);
  `.changeset/arch21-port-span-attributes.md` *new*.
- **Steps:**
  1. **ADR-QD-094 amendment** (dated, CCR-QD-NEXT): a description also states its span attributes
     (`attributes`: question, answer, `disclose`); the row decoder stays per-port in its *fields* and is
     no longer restated in devtools; `wiringReport` derives its port rows from the registry. Fix the
     Document ID to `QADI-ADR-094`.
  2. **ADR-QD-051 amendment**: the annotation table is now stated by the five descriptions;
     INV-QD-044 has a type floor (`SpanValue`) and one home (`attributeResolverPort.attributes.disclose`);
     `qadi.attempts` is decoded and shown.
  3. **BEH-QD-227**: add `qadi.attempts` (when retried) to the listing; "each port's attributes are its
     description's `attributes`"; a REQUIREMENT that `PortAccess.ts` writes and devtools reads them
     there. **BEH-QD-228**: a value outside a field's union reads as absent (D-21-i); the row carries
     `attempts`; `SignatureHistoryCall` carries `scope`/`resourceId`. Bump Rev + Change History.
  4. **BEH-QD-215**: list all seven required services; add REQUIREMENT "a port at its fail-closed
     default (or a wrapper around it) MUST be reported as defaulted" and "the port rows MUST be the
     registry's ports". **BEH-QD-308** (06-services) unchanged unless T6 changed wording.
  5. **INV-QD-044**: "the other two ports" → the four others, naming the boolean answers; add the type
     floor and the `toPredicate` sentinel to **Enforcement**.
  6. `spec/devtools-spec/02-screens.md` (:131 three→five spans; :137 two→four ports; :270-278 the
     defaulted line and "five shapes, seven of nine") and `00-overview.md:154` (three→five). Run gate 12.
  7. `spec/overview.md`: rows for `PortSpan.ts`'s exports (D-21-d); `PortDescription` row mentions
     `attributes`; devtools `PortReport` row mentions `defaulted`; "Not listed above": drop
     `Interpreter` from the `PortAccess.ts` row, move `SignatureAnswer` to its new home's reasoning, add
     a `PortSpanEncode.ts` row. Run gate 13.
  8. `spec/traceability.md`: rows for `PortSpan.test.ts`, `PortSpan.tst.ts`, `Wiring.tst.ts`; add
     INV-QD-044 to `PortConformance.test.ts` and `Predicate.test.ts`; Change History.
  9. `spec/README.md`: CCR-QD-NEXT row. `AGENTS.md` §3: the description's fact list gains "its span's
     attributes".
  10. Changeset: `@qadi/core` minor (new public types and `decodePortSpan`; `PortDescription` gains a
      required field — breaking only for code constructing a description, which the closed registry
      leaves to tests; say so), `@qadi/devtools` minor (`PortReport.defaulted`, row order, new row
      fields, narrowed field types).
- **Tests:** none.
- **Verify:** `node scripts/check-api-surface.mjs`; `node scripts/check-devtools-claims.mjs`; `pnpm spec:verify:strict`; `node scripts/check-doc-examples.mjs`; `node scripts/check-dod-table.mjs`.
- **Done when:** all five gates pass; no spec sentence states a port count or key list that disagrees with the code.

### T11 — Full gate
- **Status:** [-] deferred (the orchestrator runs `pnpm check` once, with mutation and coverage, at the end)
- **Depends on:** T1–T10
- **Files:** none.
- **Steps:**
  1. `pnpm check` (the merge gate, `.github/workflows/check.yml`). On a `FieldPath.test.ts` 5s timeout,
     re-run with the known `--testTimeout=60000` workaround and note it (tracker README).
- **Tests:** —
- **Verify:** `pnpm check`.
- **Done when:** green; mutation scores for core and devtools recorded in §10.

### T12 — Update the tracker
- **Status:** [x] done
- **Depends on:** T11
- **Files:** this plan's frontmatter/§10; the orchestrator updates `.planning/architecture/README.md`.
- **Steps:**
  1. Set `status:`; tick tasks; record decisions as `decided (<date>, <choice>)`; add a §10 row per change.
  2. Report CCR/ADR numbers assigned at merge.
- **Tests:** —
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-21-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

**Survive unchanged (the wire contract).** Every literal-key span assertion in
`packages/core/test/Evaluate.test.ts` (port-span block, `deepStrictEqual` on whole attribute records),
`Predicate.test.ts`, `PortAccess.test.ts`, the BDD `port-calls` suite, and the INV-QD-044 sentinel. They
are deliberately **outside** the codec: a codec test that round-trips cannot see a key that changed in
both directions; these can. They are also what pins key strings that Stryker skips under
`ignoreStatic` (ADR-QD-076).

**Survive unchanged (devtools behaviour).** `PortCalls.test.ts`'s real-evaluation suite (526 lines,
including T1's four new cases) runs against the derived decoder in T7 without edits — that is the
replacement proof. `ServicesPanel.test.tsx` keeps its hand-built rows.

**Move.** The per-type leniency behaviour (BEH-QD-228 "a wrong-typed value reads as absent") moves from
being tested only through devtools to `packages/core/test/PortSpan.test.ts`, so core's Stryker run
(which runs only core's tests) can kill mutants in `decodeSpan`. The devtools tests that implied it stay
as integration coverage.

**Delete.** `stringAt`/`numberAt`/`booleanAt`/`interpreterAt` disappear with their indirect coverage;
no test is deleted, because none targeted them directly.

**Add.** Property: round trip for every registry port (conformance suite) and for a generic struct
(`fc`); adversarial `fc.anything()` outcome through the attribute port's `disclose` encodes to exactly
`{ "qadi.resolved": boolean }`. Type: tstyche negatives for INV-QD-044's floor and the key mapping; the
answer-struct floor over all five ports. Differential (only if D-21-a's fallback is taken): literal
encoders vs `encodeSpan`. Model: wiring report rows from the registry; defaulted, wrapped-default,
adapter, absent.

**Mutation.** Core: `PortSpan.ts`, `PortSpanEncode.ts`, `PortAccess.ts` (T9). Devtools: `PortCalls.ts`,
`Wiring.ts`. Expected unkillable class: static key literals (ADR-QD-076), recorded not suppressed.

## 8. Spec and documentation updates

| Document | Change |
| -------- | ------ |
| `spec/decisions/094-a-port-is-described-once.md` | Amendment: descriptions state span attributes; row decoder per-port in fields, not restated; wiring rows from the registry. Document ID → `QADI-ADR-094` |
| `spec/decisions/051-a-span-says-what-was-asked.md` | Amendment: annotation table owned by the descriptions; INV-QD-044's type floor and single `disclose`; `qadi.attempts` decoded |
| `spec/behaviors/30-port-calls.md` | BEH-QD-227 listing gains `qadi.attempts`; source of truth named; BEH-QD-228 out-of-union rule, `attempts`, signature `scope`/`resourceId`; "other two" fixed; Rev 1.4 |
| `spec/behaviors/28-devtools-screens.md` | BEH-QD-215: seven required services; defaulted requirement; rows from the registry |
| `spec/invariants.md` | INV-QD-044: four other ports; type floor; `toPredicate` sentinel in Enforcement |
| `spec/devtools-spec/02-screens.md`, `00-overview.md` | five spans, five shapes, seven of nine, the defaulted line (gate 12) |
| `spec/overview.md` | `PortSpan.ts` exports; `PortDescription.attributes`; `PortReport.defaulted`; "Not listed above" for `PortSpanEncode.ts` and the `PortAccess.ts` row edit (gate 13) |
| `spec/traceability.md` | new test files; INV-QD-044 enforcement rows; Change History |
| `spec/README.md` | CCR-QD-NEXT |
| `AGENTS.md` §3 | the description's facts include its span's attributes |
| `.changeset/` | `@qadi/core` minor, `@qadi/devtools` minor (T1 alone: devtools patch) |

## 9. Risks and rollback

- **Hot-path cost.** Two `encodeSpan` walks per port read (≈0.19 µs each in the spike, against ≈0.025 µs
  for a literal) on ADR-QD-051's resolver-miss path. *Shows up as* a T6 bench regression. *Mitigation:*
  D-21-a's encode-direction fallback (literal encoders + differential test), or precompute an
  entries array per struct. *Rollback:* revert T6 alone; T4/T5/T7 still work (devtools decodes, core
  writes literals checked by the conformance round trip).
- **Generic typing.** The seventh, defaulted type parameter (D-21-b) may fail variance with
  `Schema.Struct<F>` inside the bound. *Shows up as* TS errors in `PortDerivation.ts`/`PortDoubles.ts`.
  *Mitigation:* explicit parameters (mechanical). T5 step 1 decides before any port module changes.
- **Card order change** in the Services panel (registry order). Visible to users; tests pinned the old
  order. Called out in the changeset.
- **Narrowed decoded fields** (D-21-i): a third-party producer writing a nonstandard `qadi.scope` now
  reads as absent instead of verbatim. Intended (BEH-QD-228's rule), documented.
- **Defaulted label spoofing**: a host naming an adapter `"AttributeResolverNone"` reads as defaulted.
  Label only; core never branches on it (`AttributeResolverShape.name`'s rule).
- **Cross-plan collisions:** ARCH-20 (headless `SimulationSession`, may move or wrap `Capture`/`PortCalls`)
  and ARCH-24 (`DiagnosticsStore` sampling `wiringReport` into the dock) edit the same devtools model
  files. *Sequence:* land T1 and T3 first (small, shippable), then T7 before ARCH-20 touches
  `PortCalls.ts`; ARCH-24 consumes `PortReport` as T3 leaves it. ARCH-10 is done; ARCH-27 (one
  descriptor per error tag) touches the port error constructors but not `attributes`.
- **Rollback overall:** every task is its own commit; T1 and T3 are independently valuable and stay
  even if the codec (T4–T8) is reverted.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence re-verified at `e328e75` (probes in `scratchpad/wave3/ARCH-21/`) | planner |
| 2026-10-07 | T0 | baseline on `arch/wave3` at `c7a1f28`; resolver-miss bench ×3 before: 19.6, 31.2, 20.8 µs (a loaded machine) | implementer |
| 2026-10-07 | T1 | red first (3 failing model tests, the typecheck failing on the new fields), then green through the codec rather than a throwaway per-key fix; `ServicesPanel` says `on <id>`/`anywhere` for a signature call and `· n attempts` when more than one | implementer |
| 2026-10-07 | T2 | `Evaluate.test.ts` records the whole attribute span of a retried read (`qadi.attempts: 3`), `Predicate.test.ts` runs the sentinel under `toPredicate`; both passed at HEAD (no live INV-QD-044 defect) | implementer |
| 2026-10-07 | T3 | `wiringReport` iterates `forEveryPort`; `PortReport.defaulted` and a closed `WiredServiceName`; tests written alongside the change rather than observed red first (deviation); `Wiring.tst.ts` added | implementer |
| 2026-10-07 | T4 | deviation from the file split: types in `PortSpan.ts`, `decodePortSpan` in `PortSpanDecode.ts`, machinery (`spanStruct`, `encodeSpan`, `decodeSpan`, `attemptsStruct`, shared fields) in internal `PortSpanEncode.ts`, so the checker sees declaration exports and madge sees no cycle. `SpanStruct` carries its own `decode` and `fields` rather than a `Schema.Struct` member, so a struct of specific fields is assignable to the bound | implementer |
| 2026-10-07 | T5 | descriptions carry `attributes`; per-port conformance lives in `PortSpan.test.ts` (a mapped table over `PortName`, plus `fc.anything()` through the attribute port) rather than in `PortConformance.test.ts`'s generic visitor, whose six-parameter inference does not extend to the seventh | implementer |
| 2026-10-07 | T6 | `PortAccess.ts` and `retryCountingAttempts` write through `annotateQuestion`/`annotateAnswer`/`encodeSpan`; every existing span assertion passed unchanged (1556 core tests). Bench after ×3: 17.5, 43.5, 21.6 µs against 19.6, 31.2, 20.8 before (both loaded; the best runs are 17.5 and 19.6): within noise, so no fallback to literal encoders | implementer |
| 2026-10-07 | T7 | D-21-e A; `rowOf` and `stringAt`/`numberAt`/`booleanAt`/`interpreterAt` deleted; `PortCallOf<K>` rows; the existing 29 model tests passed unchanged | implementer |
| 2026-10-07 | T8 | rule `no-port-span-key-literals` added with `files` and `skipLineComments` rule options; proven by a temporary `"qadi.event"` in `PortCalls.ts` (failed with the rule id, then reverted) | implementer |
| 2026-10-07 | T9 | scoped core run over `PortSpan*.ts` and `PortAccess.ts`: 96.61 (first run 93.22; three `resourceId` survivors in `PortAccess.ts` killed by a numeric-resource-id test, one `encodeSpan` guard killed by an extra-property test). `PortAccess.ts` 100, `PortSpanDecode.ts` 100, `PortSpanEncode.ts` 80: the four survivors are `decode`'s `raw === undefined \|\| field === undefined` guard (the `field === undefined` arm is the `noUncheckedIndexedAccess` guard, unreachable because every key names a field; the `raw` arm is equivalent, a missing attribute decodes to nothing either way). The devtools scoped run is left to the orchestrator's full `pnpm mutation` | implementer |
| 2026-10-07 | T10 | CCR-QD-198 (no new ADR/INV/BEH ids needed); ADR-QD-094 Document ID corrected to `QADI-ADR-094` (095–097 still read 902–904); changeset `.changeset/port-span-attributes.md`; `SignatureAnswer` joined the overview | implementer |
| 2026-10-07 | T11 | deferred to the orchestrator | implementer |
| 2026-10-07 | T12 | tracker updated | implementer |
