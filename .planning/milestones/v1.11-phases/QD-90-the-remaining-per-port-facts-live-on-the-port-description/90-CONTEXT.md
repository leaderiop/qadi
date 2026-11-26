# Phase 90: The remaining per-port facts live on the port description - Context

**Gathered:** 2026-11-26 (smart discuss, autonomous mode. Every decision below was decided autonomously on 2026-11-26 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". Breaking changes are allowed with a changeset and an upgrade note; source compatibility is never the tiebreaker.)
**Status:** Ready for planning

<domain>
## Phase Boundary

Each of the five evaluation ports is described once (`PortDescription`, ADR-QD-094), but four per-port facts are still
written as tables keyed by port name, outside the description. A fifth table is the leaf-needs `resourceId` column,
which nothing in `src` reads.

Code read at HEAD `2fbc913e`. The only `packages/core/src` commit since `ac7578f3` is `548a9fc4` (87-09, a doc comment
in `ThrownMessage.ts`). So the numbers below are the base numbers:
- `src/PortName.ts` (53 lines, no imports). The module-private `interface PortSpans` (19-25) maps each name to its span
  literal. `PortName = keyof PortSpans` (36), `PortSpanOf<N> = PortSpans[N]` (44) and `PortSpanName = PortSpans[PortName]`
  (53) are read from it. The header (1-18) says why it is a leaf: "`PortMetrics.ts` imports the name type from here,
  never the reverse, so a metric's registry key (ADR-QD-052) cannot move with a port's identity."
- `src/PortDescription.ts` (356 lines). The interface (169-311) has nine type parameters
  `<N, Self, Shape, Args, A, E, P = Args, Span = PortSpanAttributesLike, Asks = LeafRequests<P>>`, and
  `span: PortSpanOf<N>` (189). Each port module annotates its description with explicit type arguments (for example
  `AttributeResolver.ts:164-173`) and writes the span literal a second time as a value (`span: "qadi.attribute"`, 177).
- `src/Ports.ts` (341 lines). The registry is `PortTypes` (44-50) and `PORTS` (53-59). `DescriptionOf<K>` (109-118)
  re-spells a description through the registry. `tabulatePorts` (184-196) and `mergePorts` (208-215) are five rows
  each. The fixture tables are `PortFixtureData` (241-247, an interface with five hand-written rows) and `PORT_FIXTURES`
  (259-268, five builders; `CustomPredicate`'s answers-to-functions arrow is written inline at 265-266).
  `fixturePortsLayer` (306-312) reads `PORT_FIXTURES[d.port]`.
- `src/PortServing.ts` (113 lines, imports only `PortName` as a type). `PortServing` (43-49) is the hand-written host
  declaration. `PortServingOf<K>` (52) and `PortServingFacet<N, Args, P = Args>` (77-113) are typed against it. Its
  header (19-27) says why it stays written out and why it is a leaf (the `PortRemote.ts` cycle, ADR-QD-114).
- `src/PortMetrics.ts` (172 lines). It has `PORT_NAMES_BY_NAME: Record<PortName, true>` (58-64) and
  `PORT_NAMES = Record.keys(…)` (67), read by four `preregisteredWords` (87, 103, 117, 135). `PredicatePortName` is a
  hand union (147) that nothing checks against `PortName`, with its own `Record<…, true>` (149-156).
- `src/PortAccess.ts` (530 lines). It has `readPort` (197-216) and the hand union
  `ScopedPort = "DecisionHistory" | "RelationshipResolver" | "SignatureHistory"` (222), whose doc says it is "written
  out so a fourth is a decision and not a side effect". It also has `ScopedRequest<K>` (229-230), `completeRequest`
  (238-247), `RESOURCE_SCOPED` (250) and `readScoped` (278-301, a plain function that annotates and then fails). Three
  read sites route by hand: `readActed` (390-400, `isResourceScoped(leaf) ? readScoped : readPort` at 397-399),
  `askRelationship` (447-454, always `readScoped`) and `askSignature` (489-505, the same ternary at 495-497).
- `src/LeafNeeds.ts` (388 lines). `LEAF_NEEDS` (166-177) is checked by `satisfies … LeafNeedOf<K> & ListsDisjoint`.
  The `resourceId` column's doc (44-48) reads "Declarative: `readScoped` enforces the need and does not read this
  column". `src/ScopedLeaf.ts` (75 lines) holds `isResourceScoped` (36), `scopedResourceIdOf` (43-46) and
  `requireResourceId` (57-75). Its header (8-19) says the read "routes on `isResourceScoped`".
- `test/LeafNeeds.test.ts:133-160` is the tying test, titled "a row's resourceId is what readScoped does (D-06)". It is
  the column's only reader (`LEAF_NEEDS[f.policy._tag].resourceId` at 137).
- `test/PortName.tst.ts` (39 lines) imports `PortSpanName`/`PortSpanOf` from `../src/PortName.ts`. Its third test (32-39)
  pins the cross-check: `PortDescription<"AttributeResolver", …6 args>["span"]` is `"qadi.attribute"`.
  `test/PortServing.tst.ts` (49 lines) pins `PortServing`'s five members, and pins that
  `PortServingFacet<"DecisionHistory", [query: ActedQuery]>` is `PortTypes["DecisionHistory"]["serving"]`.
  `test/PortDescription.test.ts:83-…` builds a `probePort` description **by hand** (an object literal).
- `packages/core/bench/Evaluate.bench.ts` has no workload with a scoped leaf (`hasActed`, `hasRelationship`,
  `hasSignature`).

**Stale or imprecise claims in the roadmap, `_WAVE16-CONTEXT.md` and the research (each checked at HEAD):**
1. **"Breaking: no".** Not reachable once the span moves. A description can state its own span only through a type
   parameter. `PortDescription.ts` cannot import the registry, because `Ports.ts` imports every port module and every
   port module imports `PortDescription.ts`. So `PortDescription<"AttributeResolver", …>["span"]` stops being the port's
   literal unless the new parameter is given. That is a change to the shape of a public type. The fixture member (D-11)
   also breaks every description built by hand. ADR-QD-094's own precedent marks exactly this **Breaking** (the
   CCR-QD-382 `wire` amendment). The wave policy (Phase 85 D-04) makes it a **Breaking** minor of `@qadi/core` with an
   upgrade note (D-27).
2. "`PortAccess.ts` ≈222-247 holds `ScopedPort` and `completeRequest`; ≈397 and ≈496 choose …": the exact lines are 222,
   238-247, 397-399 and 495-497. A third route site exists that the roadmap does not name: `askRelationship` (453) always
   calls `readScoped`, which carries the hard-coded `RESOURCE_SCOPED` (250).
3. "`LEAF_NEEDS.resourceId` is read only by `LeafNeeds.test.ts:137`": confirmed. The describe opens at 133, and its title
   carries a D-number, which the replacement drops (WX-07).
4. "The benchmark gate (`pnpm bench`, 3+3 interleaved …)": the shared harness `scripts/bench/ab.sh` now refuses an odd
   round count and any count below 4. Its header gives the reason: each arm must run first equally often. So the
   smallest gate it accepts is **4 + 4**. The statistic (the median of per-run minima) and the band are unchanged (D-16).
5. "Amends ADR-QD-163 D-06 and ADR-QD-094": ADR-QD-094 recorded two rejections that this phase reverses. The CCR-QD-270
   amendment (lines 281-282, restated at 324-325) rejected "a `fixture` field on `PortDescription`". The CCR-QD-419
   amendment (377-383) rejected deriving the span union from the descriptions ("each description is annotated, so its
   `span` type is the whole union, and the only module that sees every description sits above `PortDescription.ts`").
   ADR-QD-203 must answer both. ADR-QD-134 (80-86, "a closed, written-out `ScopedPort`") also becomes false, and so do
   BEH-QD-588 ("`readScoped` does not read the column") and INV-QD-288's Source. None of these is in the roadmap's amend
   list (D-25, D-26).
6. "with a dated ADR-QD-114 note if `PortServing` stops being hand-written": it does not stop (D-12). ADR-QD-114 is
   unamended.
7. SUMMARY says "gate 13 stays at 942". It is 942 at HEAD. D-07 adds one public export (`PORT_NAMES`), so the close
   figure is 943, stated in the changeset.
8. The research says "`PortServing.ts` and the remote wire were not read in full". `PortServing.ts` was read in full
   above: a leaf with one type import. The wire is not edited by any decision here, and plan 1 pins its bytes (D-18).
9. PROJECT.md says "`PortName` derived" and the roadmap says "`PortName.ts` stays an import-free leaf holding one tuple".
   These agree once read this way: `PortName` is derived from the tuple in the leaf, never from the registry
   (ARCHITECTURE F2).

After this phase:
- `PortName.ts` holds one `as const` tuple, `PORT_NAMES`, in today's order. `PortName` is its element type. The module is
  still import-free, and `PortMetrics.ts` reads the tuple directly.
- Each description states its own span name and its own fixture. `PortSpanName`, `PortSpanOf`, `PortFixtureData` and
  `PORT_FIXTURES` keep their public names and shapes and are derived from the registry. A compile-time check at the
  registry refuses two ports that share a span.
- `PortServing` stays the hand-written host declaration. That is the recorded subset.
- Every read of a scoped port goes through `readScoped`. It reads the leaf's `LEAF_NEEDS` row through a hoisted
  `Match`: `Always` requires an id, and `ByScope` requires one only at `Resource` scope. `ScopedPort` is derived from
  the rows and the descriptions' `asks`. The annotate-before-fail order (BEH-QD-445) and the trace are unchanged.

ARCH-137. Package: `@qadi/core` (a **Breaking** minor changeset; one export added; one public interface's type
parameters and members change). Records: ADR-QD-203 (new), CCR-QD-482, BEH-QD-786..790, INV-QD-425..426. Dated
amendments go on ADR-QD-094, ADR-QD-163 and ADR-QD-134. BEH-QD-588 and BEH-QD-445 are restated, and INV-QD-288 is
edited. AGENTS.md §3 prose changes.

Evidence: the code at HEAD (file:line above and in `<code_context>`); `.planning/phases/_WAVE16-CONTEXT.md` §Phase 90;
`.planning/research/` (SUMMARY §Phase 90 and "Where the researchers disagree" (90), ARCHITECTURE §Phase 90 and F2,
FEATURES §90.1-90.5, PITFALLS 90-A..D, STACK §Phase 90); ADR-QD-094 (CCR-QD-270, CCR-QD-382, CCR-QD-392 and CCR-QD-419
amendments), ADR-QD-114, ADR-QD-133, ADR-QD-134, ADR-QD-163 (decision 3, § Measurement), ADR-QD-172 (§ Benchmark),
ADR-QD-037, ADR-QD-052; BEH-QD-227, 445, 588; INV-QD-288, 345.
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (carried forward from Phase 85; not re-decided)
- **D-01:** Work only on branch `arch-wave-16`, on the main tree, one phase at a time. No merge, push, tag, release,
  publish, `changeset version` or version-packages PR (WX-07). Never `git add -A` under `.planning/milestones`. Never
  stage `.planning/config.json`, `README.md`, `.agents/`, `.codex/`, `.planning/state.json`, `assets/` or `*.iter*.md`.
  Run every phase script from the repo root.
- **D-02:** Use only the reserved records: ARCH-137, ADR-QD-203, CCR-QD-482, BEH-QD-786..790, INV-QD-425..426. Never
  run `node scripts/next-id.mjs`. Name any unused reservation in the CCR row ("Unused: …"). Pass `--date 2026-11-26`
  (or the real edit date) to `scripts/spec-revise.mjs`. Make review-round spec fixes in place, within this phase's own
  unreleased revision, with no second bump (the 89 lesson).
- **D-03:** Every behaviour change is preceded by a test written on the phase base: RED there for a change, green for
  preserved behaviour. Every new check is shown failing once, with the scratch variant and the failing text recorded
  in `90-RED-EVIDENCE.md` (WX-06). `pnpm check:pr < /dev/null` is green at the phase end (WX-01).
- **D-04 (the wave's changeset policy, Phase 85 D-04):** one `.changeset/*.md` for `@qadi/core`. Because a public shape
  moves, it is a **Breaking** minor with an upgrade note. See D-27.
- **D-05:** Every commit ends with exactly one trailer line, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Area 1: Which facts move (the spike and its expected verdict)
- **D-06 (plan 1 is the spike, PFACT-01):** plan 1 runs on the phase base and commits only evidence, the
  characterisation (D-18) and the bench workloads (D-16). It writes `90-SPIKE.md` with one verdict per candidate. Each
  candidate is applied to a **scratch copy** of the repo (never the main tree) and judged by three checks:
  - `madge --circular --extensions ts,tsx packages/*/src`, the `pnpm circular` invocation, run in the scratch root;
  - `tsc -b` in the scratch copy;
  - for routing only, the bench gate (D-16).

  Candidates:
  - (a) the `PORT_NAMES` tuple in `PortName.ts`, with `PortMetrics.ts` importing it as a value (D-07, D-08);
  - (b) the span name as a description type parameter, with `PortSpanName`/`PortSpanOf` moved to `Ports.ts` (D-09);
  - (c) `DistinctSpanNames<R>` in `PortDerivation.ts`, applied at `PORTS` (D-10);
  - (d) the `fixture` member, with `PortFixtureData`/`PORT_FIXTURES` derived in `Ports.ts` (D-11);
  - (e) `PortServing` derived from the facets in a module above the registry (D-12; measured so the rejection is
    recorded, not argued);
  - (f) `PortAccess.ts` importing `LeafNeeds.ts` as a value, plus `ScopedLeafTag`/`ScopedPort` derived (D-14);
  - (g) the routing `readScoped` (D-15).

  Expected verdict, from reading the edges: (a), (b), (c), (d), (f) and (g) add no cycle, because (a)-(d) add no import
  edge and (f) adds `PortAccess → LeafNeeds`, which research found acyclic. (e) cycles. **A recorded subset is an
  acceptable outcome; a cycle is not.** If a candidate other than (e) cycles or fails `tsc`, its decision below falls
  back as stated there, and ADR-QD-203 records the measurement. The spike does not edit `src` on the main tree.
- **D-07 (the leaf holds one tuple, PFACT-02):**
  ```ts
  // PortName.ts — still no import
  export const PORT_NAMES = [
    "AttributeResolver",
    "DecisionHistory",
    "RelationshipResolver",
    "CustomPredicate",
    "SignatureHistory",
  ] as const;
  export type PortName = (typeof PORT_NAMES)[number];
  ```
  - The order is today's `PortSpans`/`PORT_NAMES_BY_NAME` order, which is also `forEveryPort`'s documented order. So the
    words every port metric preregisters, and their order, are unchanged (ADR-QD-052).
  - `PORT_NAMES` is a **public** export: core's barrel is `export * from "./PortName.ts"`, and `PortMetrics.ts` needs the
    value. `spec/overview.md` names it (gate 13: 942 → 943), as "the closed port names, in registry order". It is a
    reasonable public companion to the closed union `PortName`.
  - Rejected: **an unexported tuple.** `PortMetrics.ts` cannot read it, and it cannot read the registry either, because
    `PortDerivation → PortMetrics` closes the cycle F2.
  - Rejected: **a tuple of `[name, span]` pairs, or keeping `PortSpans`.** The span would stay outside the description,
    and the literal would still be spelled twice.
  - Rejected: **`PortName` from `keyof PortTypes`.** That is the cycle F2 (PITFALLS 90-A).
  - Rejected: **a named re-export in core's barrel to hide the tuple.** It would mix barrel forms one phase before
    Phase 91 converts the barrel whole.
- **D-08 (`PortMetrics.ts` reads the tuple):**
  - `PORT_NAMES_BY_NAME` and the local `PORT_NAMES` are deleted. All four `preregisteredWords` read the leaf's
    `PORT_NAMES`.
  - Every metric id and `description` string is byte-identical, so no registry key moves. The held `Ports.test.ts`
    description pins prove that, and D-18 pins the preregistered words and their order.
  - `PredicatePortName` stays in `PortMetrics.ts`: it is the translator's metric domain, not a port fact, and a
    description cannot be read there without the cycle. It becomes the same tuple idiom, checked against the leaf:
    `const PREDICATE_PORT_NAMES = ["AttributeResolver", "DecisionHistory"] as const satisfies ReadonlyArray<PortName>`,
    with `type PredicatePortName = (typeof PREDICATE_PORT_NAMES)[number]`. It is not exported, the order is unchanged,
    and the public type is the same union.
  - Today a misspelt member compiles. After this, it is a compile error.
  - Rejected: **leaving the two `Record<…, true>` idioms.** They are a second statement of the names (the first) and an
    unchecked one (the second).
- **D-09 (the span name moves onto the description):** `interface PortSpans` is deleted.
  - `PortDescription` gains a type parameter for its span name, appended after `Asks`:
    `SpanName extends \`qadi.${string}\` = \`qadi.${string}\``, and `span: SpanName`.
  - The template bound is written inline, so no new export is needed (AGENTS.md §9, TS2883).
  - **Each port module spells its span literal once.** Either the description's annotation reads it from the value
    (`typeof` a module-private `const`), or the annotation goes and the type is inferred through `makePortDescription`.
    Never write the literal twice. The planner and the spike choose between the two. `90-check.mjs port-facts` judges
    that each of the five literals appears exactly once in `packages/core/src`.
  - `PortSpanOf<N> = PortTypes[N]["span"]` and `PortSpanName = PortSpanOf<PortName>` move to `Ports.ts`. They keep the
    same public names, still reach the barrel, and their values are pinned. `DescriptionOf<K>` passes `PortSpanOf<K>` as
    the new argument.
  - `PortAccess.ts`'s `Effect.fn(<port>Port.span)` and devtools' `PortCalls.ts` are unchanged. No span-name literal
    enters `PortAccess.ts`, `PortDerivation.ts` or `PortCalls.ts` (`no-port-span-key-literals`).
  - **Why the CCR-QD-419 rejection no longer holds.** That rejection said the annotation made `span` the whole union. Now
    the annotation carries the port's own literal as a type argument. Its second reason was that the one module that
    sees every description sits above `PortDescription.ts`. That is exactly where the new check lives (D-10).
  - Rejected: **keeping `PortSpanOf<N>` as the description's field type.** It needs the name-to-span table in a module
    below the descriptions, which is the table this phase removes.
- **D-10 (a pairwise-distinct check replaces `PortSpanOf<N>`'s cross-check; the roadmap's open question, decided yes):**
  - **The check.** A generic `DistinctSpanNames<R>` is `unknown` when every entry of `R` has a **literal** span (not
    `string`, not `` `qadi.${string}` ``) and no two entries share one, and `never` otherwise. It follows the
    `LEAF_NEEDS` `Disjoint` idiom.
  - **Where it is applied.** At the registry: `export const PORTS: PortTypes = { … } satisfies DistinctSpanNames<PortTypes>`.
    The `.d.ts` still reads `PORTS: PortTypes`.
  - **Its home.** It is exported from package-private `PortDerivation.ts`, so a test can import it, and it stays out of
    the barrel. The planner may choose another package-private home, but never the barrel.
  - **Why it is the complete option.** The property the old cross-check stood for is "one span per port, and no other
    port's". The old check stopped `attributeResolverPort` from claiming `"qadi.acted"`. The new check stops it too,
    because two ports would then share `"qadi.acted"`. It also closes a hole the interface had: two `PortSpans` rows with
    one literal compiled.
  - **What it does not refuse.** A port renaming its span to a new literal compiles. It is caught by the span pins
    (D-18, D-19).
  - Rejected: **no check.** That loses a pinned property (PITFALLS 90-C).
  - Rejected: **a runtime uniqueness test only.** A compile-time property would become a test-time one.
  - Rejected: **checking in `PortName.ts`.** No span lives there any more.
- **D-11 (the fixture moves onto the description):**
  - **The member.** `PortDescription` gains a required member `fixture: (data: FixtureData) => Layer.Layer<Self>`, with
    a last type parameter `FixtureData = never`. Generic code typed by the defaults still accepts every description,
    because parameters are contravariant.
  - **What each port module writes.** Each description's `fixture` is its existing builder:
    - `attributeResolverFromRecord`, `decisionHistoryFromEvents`, `relationshipResolverFromEdges` and
      `signatureHistoryFromSignatures`, taken by reference after reordering or through a thunk, so there is no TDZ at
      module load;
    - for `CustomPredicate`, the answers-to-functions arrow, which moves from `Ports.ts:265-266` onto
      `customPredicatePort`.

    The builders keep their public names and signatures. The data stays plain and serializable (ADR-QD-050): the
    description's doc states the rule `PortFixtureData` states today.
  - **What `Ports.ts` derives.** `PortFixtureData` becomes a mapped type over the registry (each port's `fixture`
    parameter). It keeps its name and is structurally identical (pinned by D-19). `PORT_FIXTURES` keeps its name and
    type and is derived from the descriptions through `tabulatePorts`. `fixturePortsLayer` reads `d.fixture`.
    `DescriptionOf<K>` passes `PortFixtureData[K]`.
  - **Why CCR-QD-270's rejection no longer holds.**
    - "A test-data shape in every production description": each builder already ships in the same module as its
      description. `@qadi/devtools`' Fixtures simulation, a production feature, already reads `PORT_FIXTURES` (ADR-QD-050).
      So the member costs one reference per port, not a new production dependency.
    - "Break every literal": only the five port modules and one test probe build a description, because `PortName` is
      closed. That break is the **Breaking** note in D-27.
  - **What a new port writes.** A description (span, wire, serving facet, fixture), a `PORT_NAMES` entry, its registry
    lines and its `PortServing` row. That is two fewer per-port statements than today.
  - Rejected: **an optional `fixture`.** It widens the description to a fixture-less port, and `PortFixtureData` would
    then branch on absence.
  - Rejected: **keeping both tables.** That is the status quo the phase exists to end.
- **D-12 (the serving shape stays hand-written; the recorded subset):** `PortServing`, `PortServingOf` and
  `PortServingFacet` are byte-identical, and `PortServing.ts` stays a leaf. ADR-QD-114 is not amended, because its
  condition ("if `PortServing` stops being hand-written") is not met. ADR-QD-203 records the verdict. Three reasons:
  1. **A cycle.** A derived `PortServing` must read the facets through the registry. `PortServing.ts` is below
     `PortDescription.ts`, so `PortServing → Ports → port modules → PortDescription → PortServing` (the spike, candidate
     (e), measures it).
  2. **The held pin.** `PortServing.tst.ts` must pass unedited (PFACT-04). It pins that
     `PortServingFacet<"DecisionHistory", [query: ActedQuery]>` is the description's facet. The declaration a facet is
     typed against must therefore be recoverable from `N` alone, in a module below the descriptions, and that is the
     hand-written table itself.
  3. **ADR-QD-114's own reason.** It is the declaration a host writes, readable on hover and in the docs, and each facet
     is already compile-checked against its slot.

  Rejected: **a `PORT_SERVING` table** (ADR-QD-107 and ADR-QD-114 rejected it). Rejected: **a fourth facet type
  parameter carrying the declaration.** It moves the table into five annotations, and the pin's two-argument form would
  stop equalling the facet.
- **D-13 (the registry lines stay; order is pinned once):**
  - `PortTypes`, `PORTS`, `tabulatePorts`' five rows and `mergePorts`' five arguments stay written out: they are the
    registry, and AGENTS.md §3 counts them as a new port's "registry lines". Deriving `tabulatePorts` by iterating
    `PORT_NAMES` loses the per-port correlation without an `as`.
  - A born runtime row (D-18) pins that `forEveryPort((d) => d.port)` and `Object.keys(tabulatePorts(...))` equal
    `PORT_NAMES`, so registry order and the leaf cannot drift.
  - `Ports.tst.ts`'s "`keyof PortTypes` is `PortName`" stays held.

### Area 2: `readScoped` routes off the row
- **D-14 (the scoped sets are derived from `LEAF_NEEDS`; replaces the hand union):** in `PortAccess.ts`:
  - `ScopedLeafTag` is every leaf tag whose `(typeof LEAF_NEEDS)[T]["resourceId"]` is not `"Never"` (today
    `HasRelationship`, `HasActed`, `HasNotActed` and `HasSignature`).
  - `ScopedPort` is every `PortName` whose description's `asks` has a key in `ScopedLeafTag` (today the same three
    ports).
  - `completeRequest` stays a mapped type over `ScopedPort`. So a leaf newly classified `Always` or `ByScope` in
    `LeafNeeds.ts`'s closed tag lists makes its port scoped, and the compiler then asks for that port's
    `completeRequest` row (TS2741).
  - "A fourth is a decision and not a side effect" still holds: the decision is made at the table, where the closed tag
    lists already force it, and not in a second hand list.
  - **Fallback**, if the spike shows the row-based derivation does not compute: derive `ScopedPort` structurally (each
    port whose `AskedOf` first member names `resourceId`), and record why.
  - Rejected: **keeping the hand union.** It is the last hand list in the read path (FEATURES 90.5).
- **D-15 (one route; the row decides, PFACT-03):** `readScoped` keeps its name. It becomes the one function every read
  of a scoped port calls.
  - **The call sites.** `readActed`, `askRelationship` and `askSignature` call `readScoped(d, interpreter, leaf, request,
    relation)` and no longer route themselves. `isResourceScoped(leaf) ?` disappears from the read sites.
  - **The dispatch.** `readScoped` reads `LEAF_NEEDS[leaf._tag].resourceId`. For a `ScopedLeafTag` that value is exactly
    `"Always" | "ByScope"`. A **hoisted** `Match.type<"Always" | "ByScope">()`, built once at module scope, dispatches
    on it with `Match.when` arms and `Match.exhaustive`. Each arm returns the leaf predicate:
    - `Always` → an id is required;
    - `ByScope` → `isResourceScoped(leaf)`, still the one scope test, so INV-QD-288's "the request's id and the route
      share one test" holds.

    No `switch` (`SWITCH_BUDGET`) and no tag-indexed table: the requirement names a hoisted `Match`.
  - **No id needed.** `readPort(d, interpreter, request)`, unchanged. A scope-`Any` acted or signature leaf is never
    refused.
  - **An id needed.** `requireResourceId` (`ScopedLeaf.ts`, still the one missing-id test) runs. On a miss: annotate the
    question (`pose` of the request, `scope: "Resource"`, `interpreter`) on the port's own span, then
    `Effect.fail(MissingResourceId)`. On a hit: `completeRequest`, then `readPort`. This is BEH-QD-445's order and trace,
    byte for byte. `RESOURCE_SCOPED` goes if the typing allows; the planner decides.
  - **Plain function.** `readScoped` is not an `Effect.fn` and not `fnUntraced`: no new span, `UNTRACED_BUDGET`
    unchanged. The not-needed branch should return `readPort(...)` without allocating a generator, for the hot path.
  - **Types.** No `as`, `!` or `any`. For `RelationshipResolver`, whose request may lack the id its call needs, the
    not-needed branch must be unreachable by type, derived from its row (`Always`). The spike settles how, for example a
    `completeRequest` whose id parameter is typed per port from the row.
  - The judgements (`actedAnswerFromEvents`, `signatureAnswerFromSignatures`) keep calling `requireResourceId` with the
    leaf. They live in port modules, and those cannot import `LeafNeeds.ts` without a cycle (`ScopedLeaf.ts` header).
    D-20's replacement test proves they agree with the route.
  - Rejected: **a `switch` on the row.** It is a budget row.
  - Rejected: **the §5a table form.** PFACT-03 names a hoisted `Match`.
  - Rejected: **`Match.value` per call.** It is rebuilt on the hot path (AGENTS.md §5a).
  - Rejected: **reading the row in each caller.** That is three copies of the route, which is what this replaces.
- **D-16 (the bench gate, before `readScoped` changes):**
  - **Workloads added at the base.** Plan 1 adds two workloads to `packages/core/bench/Evaluate.bench.ts` before any
    measurement (ADR-QD-163 § Measurement precedent): "scoped-heavy — allOf of 8 resource-scoped port leaves, id
    present" (acted, relationship and signature) and "scoped-heavy — allOf of 8 Any-scoped port leaves". The file is
    then held.
  - **The run.** `scripts/bench/ab.sh` with the D-15 candidate as a patch, **4 + 4 rounds** (the smallest even count it
    accepts), over every `Evaluate.bench.ts` workload, analysed by `node scripts/bench/analyze.mjs`.
  - **The verdict.** The median of per-run minima. A workload is slower only when its delta is strictly greater than
    `max(10%, the base's spread)`. The verdict is the analysis's last line, `# gate: pass`, not judgement. It is recorded
    in `90-BENCH.md` with the patch's SHA-256.
  - **If the gate fails.** The spike re-measures the arm variants of the hoisted `Match`. If every hoisted-`Match` form
    fails, the routing is recorded as a measured rejection in ADR-QD-203 ("reopening needs a new measurement"), and the
    phase reports PFACT-03 **not met** to the orchestrator rather than dropping it. The rest of the phase proceeds.
- **D-17 (prose that becomes false):** `LeafNeeds.ts:44-48` (the column "routes the read"), `ScopedLeaf.ts:8-19` (the
  read routes on the row, whose `ByScope` arm is `isResourceScoped`), and the doc comments of `readScoped`,
  `ScopedPort`, `readActed`, `askRelationship`, `askSignature` and the read-section banner in `PortAccess.ts`.
  `LEAF_NEEDS`' rows are byte-identical.

### Area 3: Characterisation, type pins and the declared test edits
- **D-18 (plan 1: the characterisation on the base, PFACT-04):** a born file, working name
  `packages/core/test/PortFacts.characterisation.test.ts`, committed green on the base and held byte for byte from that
  commit. Its declared regions are named in `90-pinned-check.mjs`, each as its exact lines (the 89 lesson). Rows:
  - **Facts golden, written literally (not computed from a list):** for each port through `tabulatePorts`, its port
    name, method, span, `serving.allowlist`, `none.name`, and the `name` of the shape its fixture layer builds from
    empty data.
  - **Order:** `forEveryPort((d) => d.port)` and `Object.keys(tabulatePorts(…))` are the five names in the D-07 order.
  - **Metric words:** for `portCallsTotal`, `portRetriesTotal`, `portTimeoutsTotal`, `servedPortCallsTotal` and
    `predicatePortCallsTotal`, the preregistered words and their order, read through `Metric.value` with no `"qadi_…"`
    literal (`METRIC_ID_LITERAL_BUDGET` unchanged). Ids and descriptions are already pinned by the held `Ports.test.ts`.
  - **Wire bytes:** per port, the JSON of one fixed request's encoded question (`d.wire.toQuestion`, then the question
    schema's encode) and of one fixed answer's encoded answer.
  - **Served bytes:** one `answerRemotely` round per port over a fixture layer, its JSON written literally, and the
    `servingFor` declaration of one fixed policy set.
  - **The route table:** for every scoped leaf tag × scope (where the leaf has one) × site shape (absent resource, no
    id, non-string id, usable id) × interpreter (where allowed). Each row records the outcome (`MissingResourceId` with
    its `relation`, or the answer), the span name list (exactly the port's span), the question's `scope`, and whether
    the port was called and counted. It reads the `Tracer.make` collector the way `PortAccess.test.ts` does.

  All rows are green on the base and stay green through every commit. Only the import lines may change, and that
  region is declared.
- **D-19 (the type pins, born; positive pins and `not.toBeAssignableTo` only, so `NOT_CALLABLE_PIN_BUDGET` and its
  table do not move):**
  - **On the base,** a born `packages/core/test/PortFacts.tst.ts` pins:
    - `PortFixtureData` `toBe` its five members written out;
    - `PortSpanName` `toBe` the five literals;
    - `PortSpanOf<K>` per port;
    - `PortName` `toBe` the five names.

    It imports the moved types from the barrel (`../src/index.ts`), so it is held through the move.
  - **At the change,** pins added to the same file in the commit that introduces each thing:
    - `PORT_NAMES` `toBe` `readonly ["AttributeResolver", …]`;
    - `DistinctSpanNames` over fake records:
      - a six-entry record with a fresh sixth span is `unknown` (the positive twin);
      - a duplicate span is `never`;
      - a widened `` `qadi.${string}` `` span is `never`;
    - `Omit<PortTypes[K], "fixture">` and `Omit<PortTypes[K], "span">` are `not.toBeAssignableTo<DescriptionOf<K>>()`,
      the `PortServing.tst.ts` "serving is a required member" pattern, with the positive anchor
      `PortTypes[K]` assignable to `DescriptionOf<K>`;
    - `typeof PORT_FIXTURES` `toBe` its mapped type.

    Seen failing on each scratch variant of D-21.
- **D-20 (the declared test edits; every other test held byte for byte):**
  - **`LeafNeeds.test.ts` 133-160.** The tying describe is replaced, not deleted. The new describe is titled by its
    property, with no D-number: "a scoped read requires an id exactly where its leaf's row says". Over `FIXTURES` ×
    `SHAPES` it asserts:
    1. the read is refused with `MissingResourceId` exactly when the row is `Always`, or `ByScope` with
       `scope: "Resource"`, and the site's id is missing (the same oracle as today);
    2. for every `ByScope` leaf, the fixture judgement's `requireResourceId` answer equals the read's;
    3. `LEAF_NEEDS`' scoped tags are exactly the four.

    It reads the row now because the code does, so the test is an equivalence of the route, no longer a tie between
    two statements.
  - **`PortName.tst.ts`.** The import of `PortSpanName`/`PortSpanOf` moves to `../src/Ports.ts`. The third test (32-39)
    is replaced by "a description's span is its own port's": `{ span: "qadi.acted" }` is still not assignable to
    `Pick<typeof attributeResolverPort, "span">` (held). The `PortDescription<"AttributeResolver", …6 args>["span"]` row
    goes, and its property is now `DistinctSpanNames`' (D-19). The header names the new check.
  - **`PortDescription.test.ts`.** The hand-built `probePort` gains `fixture` and the span-name type argument. Nothing
    else changes.
  - **Held byte for byte** (judged by `90-pinned-check.mjs`):
    - in core: `PortServing.tst.ts` (PFACT-04), `Ports.test.ts`, `Ports.tst.ts`, `PortAccess.test.ts`,
      `PortAccess.tst.ts`, `LeafNeeds.tst.ts`, `PortConformance.test.ts`, `PortServe.test.ts`, `PortSpan.test.ts`,
      `PortRemote*.test.ts`, `Evaluate.test.ts` and `Predicate.test.ts`;
    - every test of `@qadi/http`, `@qadi/testing` and `@qadi/devtools`, and every `features/` file;
    - `Evaluate.bench.ts` after D-16's commit.
  - **The audit table.** `ADR-QD-203` carries one (the ADR-QD-200..202 precedent), naming each removed or replaced row
    and the row that now holds its property, with the real count ("No property lost; tests removed: N").
- **D-21 (seen failing, each on a scratch copy, with its text recorded):**
  - routing:
    - the `ByScope` arm returning `true` (an `Any`-scoped acted leaf refused);
    - the `Always` arm returning `false` (a relationship read reaches its port with no id; fails to compile or fails
      the route table);
    - the annotation moved after the failure (the question is missing from the span);
    - `readScoped` wrapped in `Effect.fn` (the span list gains a span);
    - a `switch` on the row (`check-house-style` fails);
  - names: `PORT_NAMES` reordered (the order and metric rows fail);
  - spans:
    - a second port given `"qadi.acted"` (`DistinctSpanNames`);
    - a span widened to `string`;
  - descriptions: a description without `fixture`;
  - registry: `PortName.ts` importing `Ports.ts` (`pnpm circular` fails);
  - scoped ports: `ScopedPort` written back as a hand union with a fourth member (the `completeRequest` row is
    demanded);
  - literals: `"qadi.attribute"` written in `PortAccess.ts` (`no-port-span-key-literals`).
- **D-22 (a fake sixth port without its facts is a compile error, PFACT-04):**
  - **The base.** Plan 1 measures, on a scratch copy of the base, the exact `tsc -b` error set (file, line, code) after
    adding a sixth name, `"FakePort"`, to the leaf. On the base that means a sixth `PortSpans` row.
  - **The close.** It is measured again after adding `"FakePort"` to `PORT_NAMES` alone. The expected set is the
    registry (`PortTypes` indexing, `PORTS`, `tabulatePorts`, `mergePorts`) and `PortServingOf` (the `PortServing`
    row). `PortMetrics.ts` is **no longer** in the set: the metric domain follows the tuple.
  - **The judge.** `90-check.mjs sixth-port` compares the close set with the set recorded in `90-RED-EVIDENCE.md`, and
    also checks a variant that gives `"FakePort"` a registry entry whose description omits `span`, `fixture` or
    `serving` and asserts each is an error.
  - **The committed proof** is D-19's pins. The scratch run is phase evidence, and the ADR says which is which (the 89
    WR-03 lesson).

### Area 4: Phase scripts and measurement
- **D-23 (phase scripts, the Phase 85-89 pattern; each with a `--self-test`, each mode seen failing once):**
  - **`90-check.mjs`.** Modes `base`, `commit`, `unchanged`, `seen-failing`, `vitest` and `suite` (over the vitest
    projects of core, http, testing and devtools, since `PortFixtureData` and `PortSpanName` reach them), `scan-ids`
    (adds `PFACT-0\d`, `90-\d{2}`, `QD-90`, `Phase 90`), `scan-forbidden`, `trailers` and `records [--close]`, plus four
    shape judges:
    - `port-facts`:
      - `PortName.ts` has no `import` and exports exactly `PORT_NAMES` and `PortName`;
      - no `interface PortSpans` anywhere;
      - each of the five span literals appears exactly once in `packages/core/src`, in its port module;
      - `PortMetrics.ts` has no `Record<PortName, true>`, no `PORT_NAMES_BY_NAME` and no `Record<PredicatePortName`;
      - `Ports.ts` has no `interface PortFixtureData` and no per-port builder row;
      - `PortServing.ts` is byte-identical to the base.
    - `scoped-route`:
      - `PortAccess.ts` imports `./LeafNeeds.ts`;
      - `type ScopedPort =` is not a union of string literals;
      - `isResourceScoped(` appears exactly once in `PortAccess.ts`, in the route's `ByScope` arm;
      - `readScoped` is not wrapped in `Effect.fn`/`Effect.fnUntraced`;
      - one module-scope `Match.type` feeds it;
      - there is no `switch`;
      - there is no `"qadi.` literal in `PortAccess.ts`, `PortDerivation.ts` or `PortCalls.ts`.
    - `sixth-port`: D-22.
    - `circular`: `pnpm circular` clean.
  - **`90-pinned-check.mjs`** implements D-18's and D-20's held, declared and born sets. Every region is its exact lines.
  - **`90-earlier-checks.mjs`** runs Phases 85-89's checks from scratch copies against an **expected-reports ledger**
    measured in plan 1. Each entry is keyed on the exact subject of the 90 commit that explains it (the 89 lesson). The
    script never edits an archived check's path constants. This phase edits spec registers (`spec/README.md`,
    `spec/overview.md`, `spec/behaviors/30-port-calls.md`, `spec/invariants.md`, `spec/traceability.md`,
    `spec/decisions/index.yaml`), so earlier `records --close` revision reports are expected and ledgered.
  - **`90-mutation.mjs`** implements D-24.

  A test title names a property, never a D-number, a requirement id or a phase number (WX-07).
- **D-24 (mutation, WX-05; re-take the core base first):**
  - **The base.** `90-mutation-base.json` is taken on the phase base with one invocation:
    `pnpm exec stryker run stryker.config.mjs --mutate <PortName, Ports, PortMetrics, PortAccess, PortDescription,
    PortDerivation, AttributeResolver, RelationshipResolver, CustomPredicate, DecisionHistory, SignatureHistory,
    LeafNeeds, ScopedLeaf>`. The close run uses the same invocation. A touched file's score must not fall, and a drop is
    closed with a test, never re-baselined.
  - **Static code.** `ignoreStatic: true` hides module-scope tables: the tuple, `PREDICATE_PORT_NAMES`, `LEAF_NEEDS`,
    the hoisted matcher's literals, and `PORT_FIXTURES` now built at load. Their proof is D-18's goldens and route
    table, not a score (roadmap). The hoisted matcher's `Match.when("Always" | "ByScope")` literal mutants are
    **`EXAMINED`** entries: run by hand with `ignoreStatic: false` and seen Killed (the 87/88 mechanism).
  - **`MOVED`.** A note names `CustomPredicate`'s fixture arrow (`Ports.ts:265-266` → `CustomPredicate.ts`) and the two
    route ternaries (→ `readScoped`). No file is renamed, so there is no `RENAMED` map.
  - **`UNMEASURED`** is empty, with the reason: every touched file is under core's glob.
  - **Coverage** stays at or above 95% for core.

### Area 5: Records
- **D-25 (ADR-QD-203 new; ADR-QD-094, ADR-QD-163 and ADR-QD-134 amended; ADR-QD-114 not):** a new ADR is the complete
  record. The change reverses two recorded rejections, adds a compile-time check, re-routes a hot-path read with a
  benchmark of record, and records a measured subset. The wave's precedent is a new ADR per phase (198-202).
  - `spec/decisions/203-the-remaining-per-port-facts-live-on-the-port-description.md` states:
    - D-07 to D-15;
    - the spike's verdict table (D-06) with the madge and `tsc` result of each candidate;
    - the bench gate of record (D-16);
    - the answers to CCR-QD-270 and CCR-QD-419 (D-09, D-11);
    - the serving verdict (D-12);
    - the audit table (D-20);
    - "What enforces it", naming commands, never gate numbers. It must say honestly which checks `pnpm check` runs (the
      type pins, the characterisation, `pnpm circular`) and which are phase-local (`90-check.mjs` judges, the sixth-port
      scratch run).
  - **ADR-QD-094** gets one dated amendment (revision 1.12 to 1.13): the span and the fixture are on the description, the
    CCR-QD-270 and CCR-QD-419 rejections are reversed with the reasons, and "a new port is a description (span, wire,
    serving facet, fixture), a `PORT_NAMES` entry, its registry lines and its `PortServing` row". D-10-k's row gets a
    dated `>` note.
  - **ADR-QD-163** gets a dated amendment on decision 3 (revision 1.10 to 1.11): the table now **routes**, and
    `readScoped` remains the one place the id check runs and its failure is built; "a test ties each row" becomes "a test
    holds the route equal to the rows and to the judgements".
  - **ADR-QD-134** gets a dated note (revision 1.1 to 1.2): `ScopedPort` is derived from the rows, and `readScoped`
    routes every scoped read.
  - **ADR-QD-114** is not amended (D-12), and ADR-QD-203 cites it. ADR-QD-037 and ADR-QD-052 are cited and hold
    unchanged: the leaf is kept, and no metric key moves.
- **D-26 (BEH and INV allocation; the planner may rebalance, but must use all five BEH and both INV ids or name an
  unused one in CCR-QD-482):**
  - BEH-QD-786: the port names are one tuple, `PORT_NAMES`, in a module with no imports, and `PortName` is its element
    type. Every port metric preregisters exactly those names in that order. No metric id or description changes.
  - BEH-QD-787: each port's description states its own span name. `PortSpanName` and `PortSpanOf` are read from the
    registry, and two ports sharing a span, or a port with a non-literal span, is a compile error.
  - BEH-QD-788: each port's description states its fixture. `PortFixtureData` and `PORT_FIXTURES` are read from the
    registry with their shapes unchanged, and `fixturePortsLayer` answers as before.
  - BEH-QD-789: every read of a scoped port is routed by its leaf's `LEAF_NEEDS` row. A `HasRelationship` read requires
    an id. An acted or signature read requires one only at `Resource` scope, so an `Any`-scoped read is never refused for
    a missing id. A refused read leaves the port's span with its question and nothing else (BEH-QD-445 holds).
  - BEH-QD-790: the scoped ports are derived from the rows and the descriptions' `asks`. A leaf newly stated as asking
    about one resource makes its port scoped, and the compiler asks for that port's completion row.
  - INV-QD-425: each per-port fact is stated once. The name is in the tuple. The span, wire, serving facet, fixture,
    `asks` and fail-closed answer are on the description. The host's serving declaration is the one `PortServing` slot,
    which the facet is checked against. No two ports share a span.
  - INV-QD-426: a scoped port read requires a resource id exactly where its leaf's row says (and, for a `ByScope` row,
    the leaf's scope). The row, the route and the fixture judgements cannot disagree.
  - **Restated:**
    - BEH-QD-588: the title and its two REQUIREMENTs become "the table states which leaves ask about one resource, and
      `readScoped` routes on it", and the paragraph's "`readScoped` does not read the column" goes;
    - BEH-QD-445's prose paragraph names the row, and its REQUIREMENTs are unchanged;
    - INV-QD-288's Source and Enforcement name the route through the row and the new test, and its `isResourceScoped`
      sentence stays true (the `ByScope` arm);
    - INV-QD-345 gains a link to INV-QD-426.
  - **Moving with them:**
    - **AGENTS.md §3:** "a new port is a description, a `PortName` member and its registry lines" becomes D-11's
      sentence, and the list of facts a description states gains the fixture;
    - **`spec/overview.md`:** a `PORT_NAMES` row, the `PortName` row split from `PortSpanName`/`PortSpanOf` (now
      `Ports.ts`), and the `PortDescription` row's parameter count and members;
    - **the registers:** the `spec/traceability.md` rows for the new and replaced tests, `spec/decisions/index.yaml`,
      and the CCR-QD-482 row in `spec/README.md`.

    Any ` ```typescript ` fence must compile (`check-doc-examples.mjs`). Signatures go in ` ```ts ` fences.
- **D-27 (the changeset):** `.changeset/core-port-facts-on-the-description.md`, a `@qadi/core` **Breaking** minor:
  - "Each port's description states its span name and its fixture. `PortDescription` gains a span-name type parameter
    and a required `fixture` member."
  - "`PORT_NAMES`, the five port names in registry order, is exported."
  - "`PortSpanName`, `PortSpanOf`, `PortFixtureData` and `PORT_FIXTURES` keep their names and shapes. Metric ids,
    descriptions, span names and served and wire bytes are unchanged."
  - "Two ports sharing a span name is now a compile error."
  - **Upgrading:** "a description built by hand adds `fixture` and passes its span literal as the new type argument;
    code that names `PortDescription<K, …>` to read `span` uses `DescriptionOf<K>` or `PortSpanOf<K>`."

### Claude's Discretion
- The exact names `DistinctSpanNames`, `ScopedLeafTag`, the hoisted matcher, the characterisation and type-test files,
  and the new type parameters, within the shapes fixed above.
- Whether a description's span literal is read by `typeof` from a module-private `const` or inferred through
  `makePortDescription` (D-09). Either way it is spelled once.
- The typing that makes `RelationshipResolver`'s not-needed branch unreachable (D-15), and whether `RESOURCE_SCOPED`
  survives.
- Builder reordering versus a thunk for `fixture` (D-11).
- The plan count and wave split, within these constraints:
  - plan 1 is the spike, the base record, the mutation base, the characterisation (D-18), the base type pins (D-19),
    the bench workloads and the gate of record (D-16), and the sixth-port base set (D-22);
  - the routing change lands only after `90-BENCH.md` reads `# gate: pass`;
  - each moved fact lands with its pin in the same commit (PITFALLS 90-C);
  - the records plan comes last, before the close check.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` §"Phase 90: The remaining per-port facts live on the port description": the goal, the five
  success criteria, and the planning notes ("constraints that are findings").
- `.planning/REQUIREMENTS.md`: PFACT-01..05 and WX-01..07.
- `.planning/phases/_WAVE16-CONTEXT.md` (reserved ids, D4 order, §Phase 90 evidence) and
  `.planning/phases/_SHARED-CONTEXT.md` (house rules, verify-command hygiene, the XC-05 mutation procedure).
- `.planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-CONTEXT.md` D-04, the wave's changeset policy.
- `.planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-check.mjs`, `89-pinned-check.mjs`,
  `89-mutation.mjs`, `89-earlier-checks.mjs` and `89-REVIEW-DISPOSITION.md`: the script pattern, and the lessons
  (exact regions, honest enforcement claims, a ledger keyed on exact commit subjects, spec fixes in place).

### Research
- `.planning/research/SUMMARY.md` §Phase 90 and "Where the researchers disagree" (90: how much moves).
- `.planning/research/ARCHITECTURE.md` F2 (the `PortName` cycle), §Phase 90 (the seven tables, the routing sketch,
  Pattern 4).
- `.planning/research/FEATURES.md` §90.1-90.5 (public surface to keep; the anti-features).
- `.planning/research/PITFALLS.md` 90-A (derive downwards), 90-B (`ByScope` needs the scope; bench first), 90-C (keep
  closedness; golden; AGENTS.md §3 prose), 90-D (wire and fixture surfaces; gate 14).
- `.planning/research/STACK.md` §Phase 90 (madge counts type edges).

### Spec
- `spec/decisions/094-a-port-is-described-once.md`: D-10-k (72), the CCR-QD-270 amendment (272-288, the `fixture`
  rejection 281-282), CCR-QD-382 (290-301, the Breaking precedent), CCR-QD-392 (333-356), and CCR-QD-419 (368-383, the
  rejected span derivation). Amended by D-25.
- `spec/decisions/114-a-port-states-what-it-serves.md` (58-60 "stays hand-written"; the rejected derivation 80-82).
  Holds (D-12).
- `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (decision 3 at 63; § Measurement, the bench
  method). Amended by D-25.
- `spec/decisions/134-a-resource-scoped-port-read-is-one-read.md` (80-86, `ScopedPort`, `completeRequest`). Noted by
  D-25.
- `spec/decisions/172-admission-produces-the-one-walk-environment.md` § Benchmark (the gate wording).
- `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md`, `052-hydration-is-counted-where-both-ends-can-see-it.md`,
  `133-a-port-request-is-derived-from-its-wire-question.md`, `160-port-facts-are-read-from-the-description.md`.
- `spec/behaviors/30-port-calls.md`: BEH-QD-227 (27), BEH-QD-445 (314), BEH-QD-588 (500).
- `spec/invariants.md`: INV-QD-288 (3681), INV-QD-345 (4090).
- `spec/overview.md` rows 286 (`PortDescription`), 300 (`PortServingFacet`), 305 (`PortTypes`, `PORTS`), 307-308
  (fixtures), 328 (`PortName`, `PortSpanName`, `PortSpanOf`), 329 (`PredicatePortName`).
- `AGENTS.md` §3 (137: "A new port is a description, a `PortName` member and …"), §5 (`UNTRACED_BUDGET`; `readScoped`
  stays plain), §5a (`SWITCH_BUDGET`; hoisted `Match`), §6 (`NOT_CALLABLE_PIN_BUDGET`, `METRIC_ID_LITERAL_BUDGET`,
  `PORT_DOUBLE_BUDGET`), §9 (barrels), §11, §15 (name the script, not the gate number).

### Code
- `packages/core/src/PortName.ts`, `Ports.ts`, `PortDescription.ts`, `PortServing.ts` (held), `PortMetrics.ts`,
  `PortAccess.ts` (197-301, 390-505), `PortDerivation.ts` (`makePortDescription` 82), `LeafNeeds.ts` (44-48, 166-177),
  `ScopedLeaf.ts`, the five port modules (descriptions at `AttributeResolver.ts:164`, `RelationshipResolver.ts:271`,
  `CustomPredicate.ts:204`, `DecisionHistory.ts:190`, `SignatureHistory.ts:229`; builders at `AttributeResolver.ts:228`,
  `RelationshipResolver.ts:393`, `CustomPredicate.ts:264`, `DecisionHistory.ts:337`, `SignatureHistory.ts:435`).
- `packages/core/test/LeafNeeds.test.ts` (133-160), `LeafFixtures.ts` (`FIXTURES`, `SHAPES`, `scoped`),
  `PortName.tst.ts`, `PortServing.tst.ts`, `Ports.test.ts` (fixtures 484-560), `PortAccess.test.ts` (559, 673),
  `PortDescription.test.ts` (83).
- `packages/core/bench/Evaluate.bench.ts`, `scripts/bench/ab.sh` (even rounds ≥ 4), `scripts/bench/analyze.mjs`.
- `scripts/check-house-style.mjs` (`no-port-span-key-literals` 320-341; `NOT_CALLABLE_PIN_BUDGET` 767 row).
- `stryker.config.mjs` (core; `ignoreStatic: true`).
- Downstream readers: `packages/devtools/src/model/PortCalls.ts:34,52`, `SimulationFields.ts:33,563,593`,
  `SimulationSource.ts:28,132,145`, `packages/testing/src/QadiReviewLayer.ts:11,46`, `packages/http/src/PortRoutes.ts:28,97`.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tabulatePorts` (`Ports.ts:184-196`) and its layer overload correlate a per-port value with the port's own types.
  `PORT_FIXTURES` and `fixturePortsLayer` derive through it.
- The `LEAF_NEEDS` `satisfies … & ListsDisjoint` idiom (`LeafNeeds.ts:177`, `Disjoint` at 120-124) is the pattern for
  `DistinctSpanNames` (`unknown` or `never`).
- `LeafNeedOfVariant` ("generic over the variant, so a test can build a leaf the policy does not have yet") is the
  precedent for making `DistinctSpanNames` generic over the registry, so a test can feed a fake sixth port.
- `PortServing.tst.ts:26-30` ("serving is a required member", `Omit<…> not.toBeAssignableTo DescriptionOf<K>`) is the
  pin pattern for the span and fixture members.
- `LeafFixtures.ts` (`FIXTURES`, `SHAPES`, `scoped`, `leafLayer`) and `PortAccess.test.ts`'s span collector feed the
  route table and the replaced tying test.
- `scripts/bench/ab.sh` plus `analyze.mjs` is the shared A/B harness (`# gate: pass`/`fail`).

### Established Patterns
- Description types are recovered from the registry by `infer` (`ArgsOf`, `AnswerOf`, `AskedOf`, `SpanOf`, `ErrorOf`,
  `Ports.ts:62-98`). A new per-port fact is read the same way, never through a second `Record<PortName, …>`
  (ARCHITECTURE Pattern 4).
- Leaves that break a cycle say so in their header (`PortName.ts`, `PortServing.ts`, `ScopedLeaf.ts`). madge counts
  `import type` edges (ADR-QD-037).
- Port reads are named `Effect.fn`s that own the span. `readPort` and `readScoped` are plain functions that open none
  (`UNTRACED_BUDGET` is exactly the three `Walk.ts` functions).
- A public interface that gains a required member is **Breaking** for hand-built values (ADR-QD-094 CCR-QD-382).

### Integration Points
- `PortDescription.ts` imports `PortSpanOf` (35) and uses it at 189. After the move it imports only `PortName` from the
  leaf.
- `PortDerivation.ts:82` `makePortDescription` takes a description minus `wire`, `key` and `defect`. Its generics gain
  the span-name and fixture parameters.
- `PortAccess.ts` adds the import of `LeafNeeds.ts` (`LEAF_NEEDS` as a value, its types). `LeafNeeds.ts` reaches no
  module that imports `PortAccess.ts` (research, re-measured by the spike).
- `@qadi/devtools` (`PortCalls.ts`, `SimulationFields.ts`, `SimulationSource.ts`), `@qadi/testing`
  (`QadiReviewLayer.ts`) and `@qadi/http` (`PortRoutes.ts`) read `PortSpanName`, `PortFixtureData` and `PortServing`
  from the barrel by name. None of them is edited. The `suite` mode runs their projects, and `pnpm spec:package`
  (gate 14) compiles a consumer against the packed `.d.ts`.
- `spec/overview.md` (gate 13) and `scripts/check-api-surface.mjs`: 942 at HEAD, 943 after (`PORT_NAMES`).
</code_context>

<specifics>
## Specific Ideas
- The goldens are literal: the span names, the order and the wire JSON are written out in the test, so a wrong
  derivation cannot make them pass by construction.
- "Stated once" is checked where it can be. The five span literals each appear once in `src`, and the names once (the
  tuple). `PortServing` is the deliberate, recorded exception (D-12).
- The phase must not grow a general "port fact" framework. Two facts move (span, fixture), one table becomes a tuple
  (names), one becomes a checked tuple (predicate names), one union becomes derived (`ScopedPort`), and one read is
  routed (`readScoped`).
- The review rated this candidate speculative with low gain. The real gains are fewer statements per new port, a span
  uniqueness check the interface never had, a `PredicatePortName` that can no longer be misspelt, and a `resourceId`
  column that the read actually obeys.
</specifics>

<deferred>
## Deferred Ideas
- **Deriving `PortServing`.** Rejected here for a cycle and a held pin (D-12). It would need the serving declaration
  types moved below `PortDescription.ts` per port. Reopening it needs a new measurement and a new reason, not the same
  argument.
- **Deriving `tabulatePorts`/`mergePorts` rows from `PORT_NAMES`.** That needs a correlated iteration TypeScript cannot
  type without `as` (TS #30769). It is pinned by order instead (D-13).
- **The fixture judgements reading `LEAF_NEEDS`.** Port modules cannot import `LeafNeeds.ts` without a cycle
  (`ScopedLeaf.ts` header). Agreement is held by D-20's test.
- **Phase 91** names every export this phase settles (`PORT_NAMES` included) when it converts core's barrel, and folds
  `PortSpanDecode.ts`/`PortInterpreter.ts`. It must re-run `pnpm circular` on 90's end, not on the research numbers.

## Addendum after research

Appended by the phase researcher on 2026-11-26. Each entry is decided autonomously 2026-11-26 under the owner's standing
instruction, with the measured evidence in `90-RESEARCH.md` (probe ids in brackets). An entry corrects or sharpens a
decision above; it never reopens one. Where an entry and a decision disagree, the entry holds.

- **D-16a (the real bench band; corrects D-16).** `scripts/bench/analyze.mjs` does not use `max(10%, the base's spread)`.
  A workload is SLOWER when its median-of-per-run-minima delta is strictly greater than a **fixed 5%** (`MAX_SLOWDOWN =
  0.05`; the reference arm's spread is recorded and decides nothing), and the gate passes only when no workload is slower
  **and the geometric mean of the deltas is at most +2%** (`MAX_GEOMEAN_PCT = 2`). The verdict is still the last line,
  `# gate: pass`. `analyze.mjs` takes a fourth argument, a **workloads file** naming the gate's workloads before any run,
  one `<test title> :: <bench name>` key per line; a run missing a named workload or holding another is refused. Plan 1
  commits that file beside the two new workloads. `ab.sh` takes
  `<patch> <outdir> <rounds> <head-label> <patched-label> <bench-file> <test-name-pattern>`, refuses an odd or sub-4
  round count, and refuses a bench file that is not tracked. [P6]
- **D-15a (the not-needed branch is unreachable by type, and `RESOURCE_SCOPED` survives).** The row-derived table
  `ScopedCall<K> = { withId; bare: BareOf<K> }` replaces `completeRequest`. `BareOf<K>` is `undefined` when every scoped
  leaf of the port has the row `Always` and a function otherwise, so `RelationshipResolver`'s `bare` can only be
  `undefined`. Reclassifying `HasRelationship` to `ByScope` fails to compile (TS2322 at the table row), which is the
  compiler asking for the decision. The runtime test `bare !== undefined` is dead for that port by construction, and its
  mutant is an `EQUIVALENT` entry. `RESOURCE_SCOPED` stays: `requireResourceId`'s first overload wants
  `{ scope: "Resource" }`. [P1 (g), P6]
- **D-11a (a third `tabulatePorts` overload, and `FixtureDataOf` stays private).** `PORT_FIXTURES` cannot derive through
  the existing generic overload (TS #30769, TS2322); a third overload `(f: FixtureVisitor): FixtureBuilders` compiles.
  `FixtureDataOf`, `FixtureBuilders` and `FixtureVisitor` are **not exported** and the d.ts still emits (no TS2883), so
  gate 13 closes at **943** (`PORT_NAMES` only), as D-07 says. Builders are taken by reference after moving each builder
  above its port description; using one before its declaration is TS2448/TS2454 and a load-time `ReferenceError`. [P5]
- **D-09a (the span form: `typeof` a module-private const, for all five).** Inference through `makePortDescription`
  works for `AttributeResolver` and **fails for `CustomPredicate`**, whose description is an object literal (TS7006 on
  every callback). The `typeof <prefix>SpanName` form compiles for all five and the d.ts reads `typeof attributeSpanName`.
  [P2]
- **D-23a (the span-literal count is not one for `qadi.attribute`).** `"qadi.attribute"` is also the span attribute key of
  the question (`AttributeResolver.ts:113`, `{ attribute: "qadi.attribute", ...sharedQuestionKeys }`). `90-check.mjs
  port-facts` therefore counts the **declaration** of each span name (`const <x>SpanName = "…"`), exactly once per port
  module, and does not count bare occurrences: after the change `qadi.attribute` occurs twice in `packages/core/src` (the
  key at 113 and the declaration) and the other four occur once each. [P2, P11]
- **D-22a (the sixth-port error set is wider than D-22 expects).** Measured on scratch: adding `"FakePort"` to the base's
  `PortSpans` is **53 errors in 22 (file, code) groups across four packages** (core, devtools, http, testing), and adding
  it to `PORT_NAMES` after the change is **57 errors in 25 groups**. `PortMetrics.ts` is in the base set and **not** in
  the close set, as D-22 says. The close set also holds `PortAccess.ts`, `PortRemote.ts`, devtools' `Capture.ts`,
  `PortCalls.ts`, `PortCards.ts`, `PortReading.ts`, `SimulationFields.ts` and `SimulationSource.ts`, http's `PortRoutes.ts`
  and testing's `QadiReviewLayer.ts`. The judge compares (file, code) groups with the recorded set, never a hand list. [P8]
- **D-20a (the hand-built `probePort` needs only `fixture`).** With the span as a type argument inferred from a
  `"qadi.attribute"` literal, `PortDescription.test.ts:83` fails with exactly one error, TS2741 (`fixture` missing); it
  needs no span annotation. `PortName.tst.ts` fails with TS2724 and TS2305 until its import moves to `../src/Ports.ts`. [P7]
- **D-12a (the `PortServing` cycle, measured).** Candidate (e) gives **16 cycles** (the first is
  `PortDerivation.ts > PortDescription.ts > PortServing.ts > Ports.ts > AttributeResolver.ts`) and TS2456, TS2502 and
  TS2315 in `PortServing.ts`. D-12 stands. [P1 (e)]
- **D-24a (ledger rows that move on this phase).** The only rows of Phases 85-89's checks that move are
  `88-check.mjs records --close` (its three revision lines and its changeset count) and, by the same mechanism, the
  earlier close rows that judge a spec register at "the next revision". `trailers` rows are patterns. No pinned list of
  Phases 85-89 names a file this phase edits. [P9]
</deferred>
