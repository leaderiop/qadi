# ADR-QD-203 — The remaining per-port facts live on the port description

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-203                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-26                                     |
> | Status         | Accepted — amends ADR-QD-094, ADR-QD-163 and ADR-QD-134 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-26): Initial (ARCH-137, CCR-QD-482) |

---

## Context

Each of the five evaluation ports is described once ([ADR-QD-094](./094-a-port-is-described-once.md)): a
`PortDescription` states its method, its wire, its serving facet, the request each policy leaf asks it and its fail-closed
answer, and the wrappers, defaults, doubles and registry tables are derived from it. Four facts about a port were still
written as tables keyed by the port's name, outside the description, and a fifth statement of a different kind, a
column of the leaf-needs table, was read by nothing in `src`.

- **The name-to-span table.** `PortName.ts` held a module-private `interface PortSpans` that mapped each name to its span
  literal. `PortName`, `PortSpanOf<N>` and `PortSpanName` were read from it, and each port module wrote the span literal a
  second time as the description's value, so a rename was two edits that a type check could only half see.
- **The fixture tables.** `PortFixtureData` was an interface of five hand-written rows and `PORT_FIXTURES` five hand-written
  builders, `CustomPredicate`'s answers-to-functions arrow among them, in `Ports.ts`, away from the port modules that own
  each builder.
- **The metric name records.** `PortMetrics.ts` held `PORT_NAMES_BY_NAME: Record<PortName, true>`, a second statement of the
  five names, and `PredicatePortName`, a hand union that nothing checked against `PortName`, with a record of its own.
- **The scoped-port union and the read-site routes.** `PortAccess.ts` held `ScopedPort`, a hand union of three names, and
  three read sites chose their route by hand: `readActed` and `askSignature` each wrote
  `isResourceScoped(leaf) ? readScoped : readPort`, and `askRelationship` always called `readScoped`, which carried a
  hard-coded `RESOURCE_SCOPED`.
- **The `resourceId` column.** `LEAF_NEEDS` states, per leaf, whether it asks about one resource, and its doc said the column is
  declarative: `readScoped` enforces the need and does not read it. One test read it, to tie it to the route, so the row and
  the route were two statements held equal by a test.

Each restatement had the same cost: a sixth port or a reclassified leaf was a set of edits in places that no single compile
error named, and a hand list could be widened by a side effect.

## Decision

1. **The names are one tuple, and the metric domains follow it.** `PortName.ts` stays a module with no imports and holds one
   `as const` tuple, `PORT_NAMES`, in registry order; `PortName` is its element type. `PORT_NAMES` is a public export, the
   closed port names in registry order. `PortMetrics.ts` imports the tuple as a value and its four `preregisteredWords` read
   it, so the words every port metric preregisters, and their order, are what they were. `PredicatePortName` is the same
   idiom, a module-private tuple checked with `satisfies ReadonlyArray<PortName>`, so a misspelt member is a compile error and
   no metric id or description changes ([ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md)).
   `PortName` is not read from the registry (`keyof PortTypes`): `PortMetrics.ts` is imported by `PortDerivation.ts`, so that
   would close a cycle, and the leaf stays a leaf ([ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md)).

2. **A description states its own span.** `PortDescription` takes a `SpanName` type parameter, bounded by
   `` `qadi.${string}` `` and defaulted to that pattern, and `span: SpanName`. Each port module spells its span literal once,
   as a module-private `const`, passes `typeof` that constant as the type argument and the constant as the value.
   `PortSpanOf<N>` and `PortSpanName` keep their names and are read from the registry in `Ports.ts`
   (`PortTypes[N]["span"]`), and `interface PortSpans` is gone. `DistinctSpanNames<R>`, exported from the package-private
   `PortDerivation.ts` and not from the barrel, is `unknown` when every entry of a registry names one literal and no two
   share it, and `never` otherwise. The registry applies it as `{ … } satisfies DistinctSpanNames<PortTypes>`; the
   declaration stays `PORTS: PortTypes`. It refuses sharing (two spans that overlap, two unions sharing a member
   included), patterns and unions of names, and it does not refuse a port moving to a new
   literal of its own: the span pins and the characterisation's facts golden catch that. The property the old cross-check
   stood for, one span per port and no other port's, is the check's: `attributeResolverPort` claiming `"qadi.acted"` leaves
   two ports with one span. It also closes a hole the interface had, because two `PortSpans` rows with one literal compiled.
   No span literal enters `PortAccess.ts`, `PortDerivation.ts` or devtools' `PortCalls.ts` (`no-port-span-key-literals`).

3. **A description states its fixture.** `PortDescription` takes a last type parameter `FixtureData`, defaulted to `never`,
   and a required member `fixture: (data: FixtureData) => Layer.Layer<Self>`. Each port's `fixture` is its existing builder,
   taken by reference (the builder is declared above the description, because reading it before its declaration is a
   `ReferenceError` at load), and `CustomPredicate`'s answers-to-functions arrow moves from `Ports.ts` into
   `customPredicatePort`. `PortFixtureData` keeps its name and is a mapped type over the registry. `PORT_FIXTURES` keeps its
   name and is `tabulatePorts((d) => d.fixture)` through a third overload, and `fixturePortsLayer` reads each port's builder
   through it, so the description's `fixture` is the one statement, `PORT_FIXTURES` is its one projection by port name, and
   the overload and its two helper types stay because they type that table, which both `fixturePortsLayer` and a host
   read. The data stays plain, a table or a list of rows ([ADR-QD-050](./050-a-simulation-is-sealed.md)); `FixtureData`
   is not bounded, so that is a convention review checks, not one the type enforces. `FixtureDataOf`, `FixtureBuilders` and
   `FixtureVisitor` stay unexported, so the one export this change adds is `PORT_NAMES`.

4. **The serving shape stays hand-written, and [ADR-QD-114](./114-a-port-states-what-it-serves.md) holds.** `PortServing`,
   `PortServingOf` and `PortServingFacet` are byte-identical and `PortServing.ts` stays a leaf. Deriving the declaration from
   the facets needs the registry, `PortServing.ts` sits below `PortDescription.ts`, and the result closes
   `PortServing → Ports → port modules → PortDescription → PortServing`: the spike's candidate (e) below measured 16
   cycles and five compile errors. The declaration is also what a host writes, readable on hover and in the docs, and each
   facet is compile-checked against its slot. ADR-QD-114's condition for an amendment, that `PortServing` stops being
   hand-written, is not met, so it is not amended.

5. **The registry lines stay, and the order is pinned once.** `PortTypes`, `PORTS`, `tabulatePorts`' five rows and
   `mergePorts`' five arguments stay written out: they are the registry, and iterating `PORT_NAMES` to build them would lose
   the per-port correlation without an `as`. A characterisation row pins that `forEveryPort((d) => d.port)` and the keys of
   `tabulatePorts(…)` equal `PORT_NAMES`, so the registry's order and the leaf's cannot drift.

6. **The scoped ports are derived from the rows and the descriptions.** `ScopedLeafTag` is every leaf tag whose `LEAF_NEEDS`
   row's `resourceId` is not `"Never"` (`HasRelationship`, `HasActed`, `HasNotActed`, `HasSignature`), and `ScopedPort` is
   every port whose description's `asks` has a key in `ScopedLeafTag` (`DecisionHistory`, `RelationshipResolver`,
   `SignatureHistory`). The hand union is gone. The per-port `scopedCall` table, which replaced `completeRequest`, is a
   mapped type over `ScopedPort`, so a leaf reclassified in `LeafNeeds.ts`'s closed tag lists makes its port scoped and the
   compiler asks for that port's row (TS2741). "A fourth is a decision and not a side effect" still holds: the decision is
   made at the table, where the closed tag lists already force it, and not in a second hand list.

7. **One route, and the row decides.** `readScoped` keeps its name and is the one function every read of a scoped port calls:
   `readActed`, `askRelationship` and `askSignature` call `readScoped(d, interpreter, leaf, request, relation)` and route
   nothing themselves. Each scoped port's row in `scopedCall` states the port's need, and the type of the row is chosen by
   the `LEAF_NEEDS` rows of the scoped leaves the port asks: `{ need: "Always", withId }` when every one is `"Always"`,
   `{ need: "ByScope", withId, bare, resourceScoped }` when every one is `"ByScope"`, and `never` for a port that mixes the
   two, so that port does not compile where its row is written. A `ByScope` row's `resourceScoped` is `isResourceScoped`,
   which stays the one scope test, so the request's id and the route share it. `readScoped` takes a leaf typed by the port
   it reads and narrows on the row's `need`: the read needs no id only when the need is `"ByScope"` and the leaf names no
   resource, and that read is `readPort` over the row's id-free call, with no generator allocated. Every other read runs the
   id check, so there is no arm that no input reaches and no guard whose mutant changes nothing. No row is read at run time
   and no matcher is built. A read that needs one runs
   `requireResourceId`, annotates the question on the port's own span on a miss and then fails with `MissingResourceId`, and
   on a hit completes the request and calls `readPort`: the order and the trace of
   [BEH-QD-445](../behaviors/30-port-calls.md#beh-qd-445-a-missing-resource-id-fails-the-same-way-on-every-scoped-port),
   unchanged. `readScoped` stays a plain function, neither an `Effect.fn` nor an `Effect.fnUntraced`, so no span opens and
   `UNTRACED_BUDGET` does not move. For `RelationshipResolver` every leaf is `"Always"`, so its row has no id-free call and a
   read of it cannot skip the check by type. The two fixture judgements keep calling
   `requireResourceId`: they live in port modules, which cannot import `LeafNeeds.ts` without a cycle, and a test holds
   their answer equal to the route's.

## The spike: each candidate, measured

Each candidate was applied to a scratch clone and judged by `pnpm circular` and `pnpm exec tsc -b tsconfig.json` run in that
clone, never on the main tree. A chain counts as acyclic only on madge's own `No circular dependency found` and as
compiling only on zero errors. The chains were applied in order, each onto the result of the previous ones, apart from (e)
and the two controls, which were applied to the base alone.

| Candidate | What it does | madge | `tsc` | Verdict |
| --------- | ------------ | ----- | ----- | ------- |
| (a) | `PORT_NAMES` in the import-free `PortName.ts`; `PortMetrics.ts` reads it as a value | No circular dependency found | 0 errors | Accept |
| (a)+(b) | the span as a `SpanName` type parameter; `PortSpanOf` and `PortSpanName` read from the registry in `Ports.ts` | No circular dependency found | 0 errors | Accept |
| (a)+(b)+(c) | `DistinctSpanNames` exported from `PortDerivation.ts`, applied with `satisfies` at `PORTS` | No circular dependency found | 0 errors | Accept |
| (a)+(b)+(c)+(d) | the required `fixture` member, each builder above its description and taken by reference; the third `tabulatePorts` overload and `PORT_FIXTURES` derived | No circular dependency found | 0 errors | Accept |
| (e) | `PortServing` derived from the facets through `PortTypes` | Found 16 circular dependencies | 5 errors: TS2456, TS2502, TS2315 three times | Reject: the serving declaration stays written out |
| (f) | `ScopedLeafTag` and `ScopedPort` derived from `LEAF_NEEDS` and the descriptions' `asks` | No circular dependency found | 0 errors | Accept |
| (f)+(g) | the routing `readScoped`, the hoisted `Match` and the three one-line call sites, on (f) | No circular dependency found | 0 errors | Accept, subject to the bench gate below |
| End state | every accepted candidate together | No circular dependency found | 0 errors | Accept |
| (b) alone | the span parameter without (a) | No circular dependency found | 2 errors: TS2308 twice at `index.ts` | Reject as a step on its own: `PortSpanName` and `PortSpanOf` are declared in both modules, so it needs (a) |
| Leaf imports registry | `PortName.ts` type-imports `./Ports.ts` | Found 11 circular dependencies | 0 errors | Reject: the leaf rule is enforced by `pnpm circular` |

The first cycle of (e) is `PortDerivation.ts > PortDescription.ts > PortServing.ts > Ports.ts > AttributeResolver.ts`, and its
three codes sit in `PortServing.ts` (`TS2456 Type alias 'PortServingOf' circularly references itself`, `TS2502 'declaration'
is referenced directly or indirectly in its own type annotation`, `TS2315 Type 'PortServingOf' is not generic`). The end
state was also checked against the test graph, `tsc -p tsconfig.test.json --noEmit` (three errors before the declared test
edits, none after them), the type tests under `node scripts/run-tstyche.mjs` in both of its passes, the house-style check
(no budget moved), `pnpm spec:api` (one export added, 943 documented) and the package install check (no TS2883 in the
emitted `Ports.d.ts`).

## The bench gate of record

The routing is the one change on a hot path, so it is measured before it lands, with the shared harness
`scripts/bench/ab.sh` and its analysis `scripts/bench/analyze.mjs`. The routing was fixed as a patch of the three files it
touches (`LeafNeeds.ts`, `PortAccess.ts`, `ScopedLeaf.ts`) and run once, against the committed base source, over the 37
workloads of `packages/core/bench/Evaluate.bench.ts` (the 35 that exist and the two scoped-heavy workloads added at the
base for this purpose: "scoped-heavy — allOf of 8 resource-scoped port leaves, id present" and "scoped-heavy — allOf of 8
Any-scoped port leaves"), 4 + 4 interleaved rounds, the smallest count the harness accepts. The statistic is the median of
the per-run minima, and the gate was fixed before the run: no workload more than 5% slower, and a geometric mean of the
deltas no worse than +2%.

- Patch of record: `routing.patch`, SHA-256 `fedbbea7e812b446f6c6c26b79472606d2bca8143d0782b16c43b2c2d6b04e84`, fixed in a
  commit of its own, `77a2209f`, that precedes the run.
- Invocations: `scripts/bench/ab.sh <patch> <out> 4 base routing packages/core/bench/Evaluate.bench.ts .`, then
  `node scripts/bench/analyze.mjs <out> base routing <workloads>`.
- The two scoped-heavy workloads, the ones the routing is for: +1.0% and +2.4%, against base spreads of 1.7% and 1.4%. The
  other 35 run from -1.3% to +3.0%, the largest on workloads that read no scoped port.

The analysis ended with its verdict, copied here and not judged:

```text
# workloads: 37
# slower: 0
# geomean_d_min_pct: 0.75
# max_slowdown_pct: 5.0
# max_geomean_pct: 2.0
# worst_d_min: 3.0 evaluate :: field-heavy — allOf of 8 under Intersection
# gate: pass
```

The routing landed as measured, in the per-call-closure form of a hoisted `Match`'s `ByScope` arm. The hoisted-predicate
variant was not measured, because the first form passed. This record does not read the two scoped deltas as zero cost:
that routing added about 1% to 2.4% to an evaluation whose eight leaves all take the read.

### The review gate, the gate of record

The code review found that form's `Always` arm reached by no input and its guard's mutant changing no outcome, so the
routing was restated as decision 7 describes: each port's need typed from its leaves' rows, `readScoped` narrowing on it,
and no matcher and no per-call closure. That form was fixed as a second patch and measured once against the landed routing,
in the same band and with the same harness, nothing else running.

- Patch of record: `routing-review.patch`, SHA-256 `11e3b2bea1621fd37adcab20738c94abc7cafae97400d2316370923e832fdb09`,
  fixed in a commit of its own, `17aeb9ad`, that precedes the run.
- Invocations: `scripts/bench/ab.sh <patch> <out> 4 landed review packages/core/bench/Evaluate.bench.ts .`, then
  `node scripts/bench/analyze.mjs <out> landed review <workloads>`.
- The two scoped-heavy workloads: -0.5% and -0.3%, inside reference spreads of 2.1% and 2.3%, so no measurable change. The
  other 35 run from -3.3% to +3.8%, the largest slowdown on a workload that reads no scoped port.

```text
# workloads: 37
# slower: 0
# geomean_d_min_pct: 0.09
# max_slowdown_pct: 5.0
# max_geomean_pct: 2.0
# worst_d_min: 3.8 evaluate :: matcher-heavy — 3 refs
# gate: pass
```

The routing on each port's need lands as measured. A re-measure is one `ab.sh` run of `routing-review.patch`.

## The two earlier rejections, answered

ADR-QD-094 recorded two rejections that this decision reverses. Each is answered by the reason it held and why that reason
does not hold now.

**CCR-QD-270: a `fixture` field on `PortDescription`.** It was rejected because it would put a test-data shape into every
production description and break every literal.

- A test-data shape in every production description: each builder already ships in the same module as its description, and
  `@qadi/devtools`' Fixtures simulation, a production feature, already builds its ports with `fixturePortsLayer`, which
  reads each builder through `PORT_FIXTURES` ([ADR-QD-050](./050-a-simulation-is-sealed.md)). The member is one reference
  per port and no new production dependency, and the data is plain as before (by convention: `FixtureData` is not
  bounded).
- Break every literal: `PortName` is closed, so only the five port modules and one test probe build a description. The break
  is real, and it is **Breaking** for a hand-built description, as the CCR-QD-382 amendment's own `wire` member was.

**CCR-QD-419: deriving the span union from the descriptions.** It was rejected because each description is annotated, so its
`span` type is the whole union, and the only module that sees every description sits above `PortDescription.ts`.

- The annotation was the whole union because the type had no place to carry one port's literal. It does now: the annotation
  passes the port's own literal as the `SpanName` argument, so the description's `span` is exact.
- The module that sees every description is `Ports.ts`, and that is where the union is now read and where
  `DistinctSpanNames` is applied, which is the property the old per-description cross-check stood for.

## Audit of the rows this decision removes

Two rows of existing test files stated a property through the table or the hand statement this decision removes. Each is
removed and each property it pinned is held by a row that stays.

| Row | File | What it pinned | Held by |
| --- | ---- | -------------- | ------- |
| the `it.effect` `Never / Always / ByScope`, under the describe `a row's resourceId is what readScoped does` (its title ended in a decision number) | `LeafNeeds.test.ts` | a leaf is refused for a missing id exactly when its row, and for a `ByScope` row its scope, ask for one; a `Never` leaf is never scoped and an `Always` leaf always is | the describe `a scoped read requires an id exactly where its leaf's row says`: its first `it.effect` runs the same oracle and the same loop, now over a route that reads the row; its second adds that a `ByScope` leaf's judgement refuses exactly when its read does; its third that exactly four leaf tags ask about one resource |
| the test `a description's span is its own port's, and no other`, whose first assertion read `PortDescription<"AttributeResolver", …>["span"]` | `PortName.tst.ts` | a description's `span` is its own port's literal and not the whole union | the test `PortSpanOf is each port's own span` and the test `no two ports share a span name, and each names one literal` in `PortFacts.tst.ts`, and the retitled `a description's span is its own port's` in `PortName.tst.ts`, which keeps its `not.toBeAssignableTo` row |

No property lost; tests removed: 2.

The count is of test blocks whose title is gone. One assertion row inside the second goes with it, the
`PortDescription<…>["span"]` row, and no other row of any held file changed: `PortDescription.test.ts` gained one line, the
`fixture` member of its hand-built probe, and `PortName.tst.ts`'s import of the two span types moved to `Ports.ts`. Every
other test of `@qadi/core`, `@qadi/http`, `@qadi/testing` and `@qadi/devtools` and every `features/` file is byte-identical to the
code before the change, which is the point of `PortFacts.characterisation.test.ts`: it was written and committed green on that
code, and holds literally each port's facts, the registry's order, the words each port metric preregisters, the wire and
served bytes of one fixed question and answer per port, and a route table over every scoped leaf, scope, site shape and
interpreter, so the move is judged by the same rows before and after.

## Alternatives considered

- **A `switch` on the row.** Rejected: `SWITCH_BUDGET` is an exact count, and the routing is not one of its three entries.
- **A hoisted `Match` on the row, read at run time.** Landed first and measured, then replaced: its `Always` arm was
  reached by no input, because the one `Always` leaf's port has no id-free call, and its guard on that call changed no
  outcome when mutated, so the route held code no test could hold. The port's need, typed from the rows, states the same
  decision with no unreachable arm.
- **The table form of [AGENTS.md](../../AGENTS.md) section 5a.** Rejected: that form is for a tag the code itself wrote,
  while the need is a fact the rows already state, and the closed union of each port's row states it with its
  exhaustiveness checked by the compiler.
- **`Match.value` per call.** Rejected: it rebuilds the matcher on a per-read path, which section 5a measures as the
  slowest of the dispatch forms.
- **Reading the row in each caller.** Rejected: that is three copies of the route, which is what one `readScoped` replaces.
- **Keeping the hand union of scoped ports.** Rejected: it is the last hand list in the read path, and the derived set
  makes the same decision at the table where the closed tag lists already force it.
- **Inferring the span through `makePortDescription`.** Rejected: `CustomPredicate`'s description is an object literal that does
  not go through the builder, so the form would differ per port. The module-private constant is the same for all five.
- **A fixture thunk instead of reordering the builders.** Rejected: a thunk adds a call and a type to every port to avoid a
  reorder that the load order already allows, and a builder taken by reference is what the member says.
- **An optional `fixture`.** Rejected: it would widen the description to a port with no fixture, and `PortFixtureData` would
  branch on absence.
- **Keeping both fixture tables.** Rejected: that is the state this decision ends.
- **An unexported `PORT_NAMES`, or a re-export in the barrel to hide it.** Rejected: `PortMetrics.ts` cannot read an
  unexported tuple or the registry, and a named re-export would mix barrel forms.
- **A tuple of name and span pairs, or keeping `PortSpans`.** Rejected: the span would stay outside the description and the
  literal would still be spelled twice.
- **No uniqueness check, or a runtime test of uniqueness only.** Rejected: the first loses a property the old cross-check held,
  and the second moves a compile-time property to a test-time one.
- **A `PORT_SERVING` table, or a fourth facet type parameter carrying the declaration.** Rejected, as ADR-QD-107 and ADR-QD-114
  rejected the table: the table moves the declaration into five annotations, and `PortServing.tst.ts`'s two-argument form
  would stop equalling the facet.
- **Leaving the two `Record<…, true>` idioms in `PortMetrics.ts`.** Rejected: one was a second statement of the names and the
  other an unchecked one.

## Consequences

- **A `@qadi/core` Breaking minor.** `PortDescription` gains a `SpanName` type parameter and a required `fixture` member, so a
  description built by hand adds `fixture` and passes its span literal as the new type argument, and code that names
  `PortDescription<K, …>` to read `span` uses `DescriptionOf<K>` or `PortSpanOf<K>`. The registry is closed, so in this
  repository only the five port modules and one test probe build one. `PORT_NAMES` is the one export added, and two ports
  sharing a span name is a compile error. A changeset and an upgrade note carry it.
- **Nothing observable moves.** Metric ids and descriptions, span names, the wire and served bytes, the order of every
  preregistered word and the span list and question of a refused scoped read are as they were, held by the
  characterisation and the held tests.
- **A new port is a description (span, wire, serving facet, fixture), a `PORT_NAMES` entry, its registry lines and its
  `PortServing` row.** That is two fewer per-port statements than the span table and the fixture table needed. The sixth-port
  run, a fake `"FakePort"` added to `PORT_NAMES` alone, is 61 errors in 25 (file, code) groups across `@qadi/core`,
  `@qadi/devtools`, `@qadi/http` and `@qadi/testing`, against 53 in 22 groups for a sixth `PortSpans` row, and
  `PortMetrics.ts` is not among them, because its domain follows the tuple. The groups are the ones first recorded at 57
  errors; the four more are all in `PortAccess.ts`'s `TS2536` group, the spelled signature of `readUnscoped`, the direct
  read typed to refuse every scoped port, which indexes `PortTypes` by the new name as `readPort` does. A description that omits `span`,
  `fixture` or `serving` is an error naming that member.
- **The scoped read's id test is stated at the table.** A leaf reclassified in `LeafNeeds.ts` changes the route and the set of
  scoped ports together, and a test holds the route equal to the rows and to the judgements.
- **Mutation and coverage.** The close was taken after every source change, alone, with the base invocation over the
  thirteen files this change touches: 469 of 470 mutants detected. `PortAccess.ts` is 51 of 51, `PortDerivation.ts` 47 of
  47, `CustomPredicate.ts` 33 of 33, `LeafNeeds.ts` 73 of 73, `DecisionHistory.ts` 64 of 64, `RelationshipResolver.ts` 29
  of 29, `AttributeResolver.ts` 22 of 22, `PortDescription.ts` 16 of 16, `Ports.ts` 14 of 14 and `ScopedLeaf.ts` 11 of 11;
  `PortName.ts` and `PortMetrics.ts` hold no scored mutant. The one open mutant is in `SignatureHistory.ts`, 109 of 110, at
  its base: a ternary on `row.resourceId === undefined` read as false gives `makeResourceId(undefined)`, and
  `makeResourceId` is `Brand.nominal`, the identity at run time, so both branches return `undefined` and no test can tell
  them apart. Static code `ignoreStatic` hides from the score is not in those counts. In `PortAccess.ts` the three
  `scopedCall` row objects, the two `"ByScope"` need literals and `servePortRead`'s arrow were run by hand with
  `ignoreStatic: false` and each was killed; the `"Always"` need literal survives there, because `readScoped` compares a
  need only with `"ByScope"`, so any other string routes as `"Always"` does, to the id check, and the literal's work is to
  choose the row's member of `ScopedCall` at compile time. What it stands for, that a relationship read demands an id, is
  held by the characterisation row "HasRelationship, absent resource, under evaluate". Core coverage is 99.89 lines, 99.78
  functions, 98.40 branches and 99.64 statements, against 99.89, 99.78, 98.33 and 99.63 at the base, and every one of the
  thirteen files is at its base or above.
- **Reopening the routing needs a new measurement.** The bench gate of record is one run of `routing-review.patch`.

## What enforces it

What `pnpm check` runs, by command:

- `pnpm test:tstyche`, `packages/core/test/PortFacts.tst.ts` and `packages/core/test/PortName.tst.ts`: `PortName`,
  `PORT_NAMES`, `PortSpanName`, `PortSpanOf`, `PortFixtureData` and `PORT_FIXTURES` are their spelled types; `DistinctSpanNames`
  is `unknown` over a record of six distinct literals and `never` over a duplicate, a widened span and a port claiming
  another's, and (`packages/core/test/PortFacts.review.tst.ts`) `never` over a union span, a union holding a pattern and
  two unions sharing a member; a description without `span` or `fixture` is not assignable to its registry slot. The pins are positive and
  `not.toBeAssignableTo` only, so `NOT_CALLABLE_PIN_BUDGET` does not move.
- `pnpm coverage`, which runs the whole `vitest` suite: `packages/core/test/PortFacts.characterisation.test.ts` (each port's
  facts, the registry's order, the preregistered words, the wire and served bytes, and the route table of every scoped
  read), `packages/core/test/LeafNeeds.test.ts` (the route equal to the rows and to the judgements) and the held
  `packages/core/test/PortAccess.test.ts` and `packages/core/test/Ports.test.ts`.
- `pnpm typecheck`: a port added to `PORT_NAMES` without its registry entry, a leaf reclassified without its `scopedCall` row,
  an `Always` row given an id-free call, a port whose scoped leaves mix `Always` and `ByScope`, a leaf read through another
  port's description, and a direct read of a scoped port through `readUnscoped` do not compile.
- `pnpm circular`: `PortName.ts` importing the registry, or `PortServing.ts` derived from it, closes a cycle and fails.
- `pnpm lint`, whose second half is `node scripts/check-house-style.mjs`: a `switch` on the row exceeds `SWITCH_BUDGET`, and a
  span literal in `PortAccess.ts`, `PortDerivation.ts` or `PortCalls.ts` is refused by `no-port-span-key-literals`.
- `pnpm spec:api`: `PORT_NAMES` is named in `spec/overview.md`.
- `node scripts/check-package-install.mjs`: the packed consumer types a description built from the shipped `AttributeResolver`
  one, its `fixture` stated, by the whole `PortDescription`, and refuses one whose `fixture` is `undefined` (a literal that
  leaves `fixture` out is TS2741 on the declaration, which the probe guard cannot read as a refusal); it types a
  `PortFixtureData` and a `PortSpanName`, reads `PORT_NAMES` against the registry's order and builds every port through the
  fixture overload of `tabulatePorts`. The probe guard fails if a type stops annotating a value, the refusal is deleted, or
  the run never reads `PORT_NAMES` or calls `tabulatePorts`.
- `pnpm mutation`: the core run's break threshold is the package's score as a whole, not a floor per file.
- The merge gate by command (`pnpm check`), never by number.

What is phase-local, kept with the change's planning, and not run by `pnpm check`:

- The phase check's judges, `port-facts` and `scoped-route`: each span literal is spelled once, `PortMetrics.ts` holds no
  `Record<PortName, true>`, `PortServing.ts` is byte-identical, `ScopedPort` is not a union of string literals,
  `ScopedPort` names no string literal (so an `Extract<PortName, …>` hand list fails too), `scopedCall` is typed by
  `ScopedCall`, which ends in `never`, its `ByScope` rows alone carry the id-free call and `resourceScoped:
  isResourceScoped`, and `readScoped` narrows on `need` with no matcher, no row read and no `needsResourceId`. They judge shape,
  and the committed proof of each property is the type pins and the characterisation above.
- The sixth-port scratch run: its (file, code) sets are recorded and compared, and it is evidence for the consequence above,
  not a gate. Its committed proof is the type pins.
- The bench of record, the per-file mutation records and the held-file check against the base. A scratch variant of each
  edit that these checks guard was run to failure once and its failing text recorded.

## Related

- [ADR-QD-094](./094-a-port-is-described-once.md) — a port is described once; amended: the span and the fixture are on the
  description, and the two earlier rejections are reversed
- [ADR-QD-163](./163-what-a-leaf-needs-from-the-request-is-stated-once.md) — what a leaf needs from the request is stated once;
  amended: the table routes the scoped read
- [ADR-QD-134](./134-a-resource-scoped-port-read-is-one-read.md) — a resource-scoped port read is one read; amended: the
  scoped ports are derived and `readScoped` routes every scoped read
- [ADR-QD-114](./114-a-port-states-what-it-serves.md) — a port states what it serves; holds, unamended: `PortServing` stays
  hand-written
- [ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md) — the leaf rule is a gate
- [ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md) — no metric key moves
- [BEH-QD-786](../behaviors/30-port-calls.md#beh-qd-786-the-port-names-are-one-tuple-in-a-module-with-no-imports-and-every-port-metric-preregisters-exactly-those-names-in-that-order),
  [BEH-QD-787](../behaviors/30-port-calls.md#beh-qd-787-each-ports-description-states-its-own-span-name-and-two-ports-sharing-a-span-or-a-span-that-is-a-pattern-do-not-compile),
  [BEH-QD-788](../behaviors/30-port-calls.md#beh-qd-788-each-ports-description-states-its-fixture-and-the-fixture-tables-are-read-from-the-registry),
  [BEH-QD-789](../behaviors/30-port-calls.md#beh-qd-789-every-read-of-a-scoped-port-is-routed-by-its-leafs-row-in-the-leaf-needs-table)
  and [BEH-QD-790](../behaviors/30-port-calls.md#beh-qd-790-the-scoped-ports-are-derived-from-the-rows-and-the-descriptions-asks-and-a-leaf-newly-stated-as-asking-about-one-resource-makes-its-port-scoped),
  which state it, with [BEH-QD-588](../behaviors/30-port-calls.md#beh-qd-588-the-leaf-needs-table-states-which-leaves-ask-about-one-resource-and-readscoped-routes-on-it) restated
- [INV-QD-425](../invariants.md#inv-qd-425-each-per-port-fact-is-stated-once) and
  [INV-QD-426](../invariants.md#inv-qd-426-a-scoped-port-read-requires-a-resource-id-exactly-where-its-leafs-row-says),
  the two invariants it adds
