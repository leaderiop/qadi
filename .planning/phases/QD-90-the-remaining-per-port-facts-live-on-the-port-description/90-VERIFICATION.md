---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
verified: 2026-11-26T11:36:10Z
status: gaps_found
score: 10/12 must-haves verified
covered_files:
  - .changeset/core-port-facts-on-the-description.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-01-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-01-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-02-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-02-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-03-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-03-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-04-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-04-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-05-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-05-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-06-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-06-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-07-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-07-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-08-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-08-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-09-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-09-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-10-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-10-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-11-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-11-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-12-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-12-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-13-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-13-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-14-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-14-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-15-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-15-SUMMARY.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-16-PLAN.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-16-SUMMARY.md
  - AGENTS.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/core/bench/Evaluate.bench.ts
  - packages/core/src/AttributeResolver.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/src/DecisionHistory.ts
  - packages/core/src/LeafNeeds.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/PortMetrics.ts
  - packages/core/src/PortName.ts
  - packages/core/src/Ports.ts
  - packages/core/src/RelationshipResolver.ts
  - packages/core/src/ScopedLeaf.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/test/LeafNeeds.test.ts
  - packages/core/test/PortDescription.test.ts
  - packages/core/test/PortFacts.characterisation.test.ts
  - packages/core/test/PortFacts.review.test.ts
  - packages/core/test/PortFacts.review.tst.ts
  - packages/core/test/PortFacts.tst.ts
  - packages/core/test/PortName.tst.ts
  - packages/http/src/PortRoutes.ts
  - packages/testing/src/QadiReviewLayer.ts
  - spec/README.md
  - spec/behaviors/30-port-calls.md
  - spec/decisions/094-a-port-is-described-once.md
  - spec/decisions/134-a-resource-scoped-port-read-is-one-read.md
  - spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md
  - spec/decisions/203-the-remaining-per-port-facts-live-on-the-port-description.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
covered_digest: "v4:sha256:8dd31108a947ea53814c22c7c795756e93d24c87cf5aa358aece081e6c7c26aa"
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "WX-03: the wave's changeset policy (Phase 85 D-04: one changeset per public package whose src the phase edits) is applied"
    status: failed
    reason: >-
      The review fix round edited the src of two more public packages, and neither has a changeset.
      `.changeset/core-port-facts-on-the-description.md` is the only changeset added since phase_base and names
      `@qadi/core` alone. `f9b6efb2` changed code in `packages/http/src/PortRoutes.ts` (line 32 imports core's
      `PORT_NAMES`; the file-local `PORT_NAMES` at the old line 103 is deleted). `bb4ef25d` changed the doc comment
      at `packages/testing/src/QadiReviewLayer.ts:146-148`. Phase 87 sets the precedent: a doc-comment-only src edit
      got its own patch, `.changeset/core-cause-text-doc.md`, "... No export changes." The phase's own close check
      encodes the stale one-package assumption, so it passes: `90-check.mjs:764` fails unless exactly one changeset
      exists, and `:768` requires it to be "a Breaking minor changeset for @qadi/core alone".
    artifacts:
      - path: "packages/http/src/PortRoutes.ts"
        issue: "src edited at line 32 (and the old line 103 deleted) by f9b6efb2; no @qadi/http changeset"
      - path: "packages/testing/src/QadiReviewLayer.ts"
        issue: "src doc comment edited at lines 146-148 by bb4ef25d; no @qadi/testing changeset"
      - path: ".planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-check.mjs"
        issue: "lines 764-768 require exactly one changeset, for @qadi/core alone, which contradicts D-04 once http and testing src moved"
    missing:
      - "A `@qadi/http` patch changeset: it serves the ports in core's `PORT_NAMES` order, same order and meaning. No export changes."
      - "A `@qadi/testing` patch changeset: the review layer's doc says its fixture is the description's `fixture`, read through `PORT_FIXTURES`. No export changes."
      - "`90-check.mjs` close: expect the three changesets (core Breaking minor, http patch, testing patch), and record the declaration change in the disposition"
  - truth: "WX-03: gate 14 probes every changed public signature"
    status: failed
    reason: >-
      This phase changes `@qadi/core`'s public surface in two ways. `PortDescription` gains two type parameters
      (`SpanName`, `FixtureData`) and a required `fixture` member, which the changeset marks **Breaking**.
      `PORT_NAMES` is newly exported. `tabulatePorts` also gains a public overload (`Ports.ts:210`). Gate 14's
      packed consumer (`scripts/check-package-install.mjs`) names none of them. `TYPE_ONLY_PROBES` (line 112) is
      `DecisionCacheShape`, `GateInstanceLike` and `GateRegistryLike`. `REFUSED_SHAPE_PROBES` (lines 124-128) has
      three earlier shape changes. A grep of the script finds no `PortDescription`, `PORT_NAMES`, `tabulatePorts`,
      `PORT_FIXTURES`, `PortFixtureData` or `PortSpanName`. `spec:package` passes (528 runtime exports, one more
      than 527), but that count proves only that the export exists at runtime. It does not compile the new shape
      against the packed `.d.ts`. `scripts/` is not in the phase diff.
    artifacts:
      - path: "scripts/check-package-install.mjs"
        issue: "TYPE_ONLY_PROBES (112) and REFUSED_SHAPE_PROBES (124-128) carry no probe for the Breaking PortDescription shape; the consumer never uses PORT_NAMES or tabulatePorts"
    missing:
      - "Add `PortDescription` (and `PortFixtureData`/`PortSpanName`) to `TYPE_ONLY_PROBES`, with the consumer annotating a value with them. For example, `const d: PortDescription<\"AttributeResolver\", …, typeof span, PortFixtureData[\"AttributeResolver\"]> = PORTS.AttributeResolver`, or a hand-built description that states `fixture`."
      - "Have the consumer read `PORT_NAMES` (for example, assert it equals the keys of `tabulatePorts(...)` in registry order) so the new export and the overload compile and run against the packed artifact"
      - "Show the new probe failing once: drop `fixture` from the packed consumer's description and record the TS2741 text in `90-RED-EVIDENCE.md`"
human_verification:
  - test: "Decide whether SC3 / PFACT-03's 'dispatches with a hoisted `Match` and never a `switch`' is met by the review-round routing, which has no `Match` at all"
    expected: "Either accept the override suggested in the body (the routing has no `switch` and no per-call matcher, and the `LEAF_NEEDS` rows choose each port's call type at compile time), or require a hoisted `Match`, which would bring back the arm that no input reaches (90-REVIEW WR-01)"
    why_human: "The roadmap and REQUIREMENTS text says 'hoisted Match'. The code deliberately replaced it with a compile-time `need` union and one `===` narrowing (`PortAccess.ts:371-372`), and ADR-QD-203 records the alternative. Only a person can accept a deviation from the wording of a success criterion."
---

# Phase 90: The remaining per-port facts live on the port description — Verification Report

**Phase Goal:** The per-port facts that are still tables outside the port description (span name, serving shape and
fixture data type, as far as the spike allows) move onto the description. `PortName` stays an import-free leaf holding
one tuple, and everything else is derived from the descriptions. `readScoped` routes off the `LEAF_NEEDS` row, so the
row's `resourceId` column does real work.
**Verified:** 2026-11-26 at HEAD `ff272b2b`. The phase base is `46174873`. The last product commit is `760654ce`.
Nothing under `packages/` changed after it, and the mutation and coverage close were both taken after it.
**Status:** gaps_found
**Re-verification:** No. This is the first verification. It judges the 16 plans plus the review fix round
`343e536d..e7bd64d5` recorded in `90-REVIEW-DISPOSITION.md`.

The product goal holds in the code. Two things were checked in a scratch APFS clone of `packages/core` and confirmed:
a fake sixth port fails to compile, and so does a span shared by two ports. A reclassified leaf row fails to compile
too. Both gaps are in WX-03, the wave's release records:

- the fix round edited `@qadi/http` and `@qadi/testing` src and added no changesets for them;
- gate 14's packed consumer never compiles the Breaking `PortDescription` shape or the new `PORT_NAMES` export.

One roadmap clause needs a human decision: SC3's "hoisted `Match`" was deliberately replaced.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / PFACT-01: plan 1 is a spike on the base. It simulates each derivation under `pnpm circular` and runs the bench gate before `readScoped` changes. A recorded subset is acceptable; a cycle is not. | ✓ VERIFIED | `90-SPIKE.md` "Verdicts": chains a, a+b, a+b+c, a+b+c+d, f and f+g are accepted on madge "No circular dependency found" plus 0 tsc errors. (e), deriving `PortServing`, is **rejected**: 16 cycles, TS2456/TS2502/TS2315. `leaf-imports-registry` is rejected: 11 cycles. The bench gate of record is `routing-review.patch` (sha256 `11e3b2be…`), fixed in `17aeb9ad` before its run. `90-check.mjs bench` exit 0 ("verdict is the analysis's: pass"), and `90-check.mjs circular` exit 0. |
| 2 | SC2 / PFACT-02: `PortName.ts` stays an import-free leaf holding one tuple. Every per-port table the spike cleared is derived from the descriptions or the tuple, and registry order is preserved. | ✓ VERIFIED | `PortName.ts` has no import. It holds only `PORT_NAMES` (26-32) and `PortName` (35). The span is a description member: `PortDescription.ts` `SpanName` type parameter, `span: SpanName`. Each port module states one module-private constant, e.g. `CustomPredicate.ts:220` `customSpanName`. `PortSpanOf<N> = PortTypes[N]["span"]` (`Ports.ts:105`) and `PortSpanName` (114) are read from the registry. `PortFixtureData` (`Ports.ts:272`) is derived from each description's `fixture`, and `PORT_FIXTURES` = `tabulatePorts((d) => d.fixture)` (300). `PORT_NAMES_BY_NAME` is gone: `PortMetrics.ts:50,71,87,101,119` preregister the tuple. `ScopedLeafTag` and `ScopedPort` are derived from `LEAF_NEEDS` and `asks` (`PortAccess.ts:225-241`). `PortServing` stays written out (spike (e), recorded subset; ADR-QD-114 is unamended, as the roadmap allows). The registry order and the metric words are pinned literally by `PortFacts.characterisation.test.ts:183-251`, which is green. |
| 3 | SC3 / PFACT-03: `readScoped` routes off the `LEAF_NEEDS` row. It requires an id only where the row says (a ByScope leaf only at `Resource` scope), it is a plain function with no new span, it dispatches with a hoisted `Match` and never a `switch`, and BEH-QD-445's annotate-before-fail order holds. The tying test is replaced, not deleted. | ? UNCERTAIN (one clause) | **Holds:** `readScoped` (`PortAccess.ts:360-388`) is a plain arrow function, neither `Effect.fn` nor `fnUntraced`. Each port's call type is computed from its leaves' rows (`ScopedCall<K>`, 302-306, and `scopedCall`, 309-326). A ByScope leaf with no resource scope takes `call.bare`, with no id check. Every other leaf runs `requireResourceId`. On a miss it annotates the question, then fails (376-385). In the scratch clone, reclassifying `HasNotActed` to `Always` (a mixed port) gives TS2322 `… is not assignable to type 'never'` at `PortAccess.ts:310`. Reclassifying `HasCustom` gives TS2741 at `scopedCall` (309) and TS2345 at `readUnscoped` (574). The tying test is replaced: `LeafNeeds.test.ts` "a scoped read requires an id exactly where its leaf's row says", three tests, is green. The route table `PortFacts.characterisation.test.ts:443-696` (leaf × scope × site × interpreter: span question, port reached, call counted) is green. **Deviates:** there is no hoisted `Match`. The fix round deleted `needsResourceId` and its `Match` (`760654ce`) for a compile-time `need` union narrowed by one `===` (371-372). No `switch` was added (house-style: 3 declared switches). ADR-QD-203's "Alternatives considered" records why. This is a deliberate, documented, arguably better form. It is routed to a human decision; see the override suggestion below. |
| 4 | SC4 / PFACT-04: a `tabulatePorts` golden, a metric snapshot and the served and wire bytes are pinned on the base and unchanged after. `PortServing.tst.ts` passes unedited. A fake sixth port without its facts is a compile error. | ✓ VERIFIED | `PortFacts.characterisation.test.ts` was born in `8e044761`, plus `f6bc8f4a` from the same base window, before the first src commit `61ff69b8`. It has not been edited since. `90-pinned-check.mjs --all-applied` exit 0: "408 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied". `PortServing.ts` and `PortServing.tst.ts` are not in the phase diff, and `pnpm test:tstyche` exit 0 in both passes. Sixth port, checked independently in a scratch clone: adding `"SixthPort"` to `PORT_NAMES` gives 47 src errors (Ports.ts 25, PortAccess.ts 15, PortRemote.ts 5, PortServing.ts 2). `90-check.mjs sixth-port close` exit 0 (61 errors in 25 groups across packages, including "deleting span, fixture or serving is an error naming it"). |
| 5 | SC5 / PFACT-05: ADR-QD-203 records the change and amends ADR-QD-163 D-06 and ADR-QD-094 (with an ADR-QD-114 note only if `PortServing` stops being hand-written). AGENTS.md §3, BEH, INV and traceability move with it. | ✓ VERIFIED | `spec/decisions/203-…md` has status "Accepted — amends ADR-QD-094, ADR-QD-163 and ADR-QD-134". Decision 7 states the review-round routing. 094, 134 and 163 are amended in the diff, and 114 is untouched, correctly. AGENTS.md §3 (lines 126-141 of the diff) adds "its fixture" and "(span, wire, serving facet, fixture), a `PORT_NAMES` entry … its `PortServing` row", with no budget table moved. BEH-QD-786..790 are in `30-port-calls.md`. INV-QD-425/426 and traceability rows exist. `pnpm spec:verify:strict` PASS 21/0/0, `pnpm spec:gates` exit 0, `pnpm spec:examples` 122 blocks compile. |
| 6 | WX-01: `pnpm check:pr` is green at the end of the phase | ✓ VERIFIED | Per the instructions, not re-run here. The disposition records exit 0 on `e7bd64d5`, and HEAD differs from it only in `.planning/`. Re-run here at HEAD, all exit 0: `pnpm typecheck`, `pnpm lint`, `pnpm test:tstyche` (446 passed, 2 skipped), the core vitest project (87 files, 2872 tests), the http and testing projects (19 files, 356 tests), `pnpm spec:examples`, `pnpm spec:verify:strict`, `pnpm spec:gates` (house-style 649 files clean, dod-table 26 steps), `pnpm spec:api` (943), `pnpm spec:website-examples` (79 blocks), and `90-check.mjs close`, which runs `pnpm circular` and `pnpm spec:package` (528 runtime exports). |
| 7 | WX-02: ADR, CCR, five BEH, two INV, using only the reserved numbers | ✓ VERIFIED | ADR-QD-203, CCR-QD-482, BEH-QD-786..790 and INV-QD-425..426 are all present in spec. No BEH-QD-791+, INV-QD-427+, CCR-QD-483 or ADR-QD-204 appears in `spec` or `packages`. `90-check.mjs records --close` exit 0. |
| 8 | WX-03: gate 13 names every added export. Gate 14 probes every changed public signature. The changeset policy is applied. | ✗ FAILED | Gate 13 holds: `api-surface: 943` (942 + `PORT_NAMES`). **Gate 14 does not probe the changed signatures**, and **two edited public packages have no changeset**. See Gaps. |
| 9 | WX-04: nothing forbidden is added, and a budget moves only with its table | ✓ VERIFIED | A grep of the added src lines finds no `as` cast, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, `console`/`process.env`/clock, `Record<string, unknown>`, `Stryker disable` or module-scope `let`. The two `Record` hits are `effect/Record` imports. `RESOURCE_SCOPED … as const` (`PortAccess.ts:329`) is pre-existing (base line 250). `90-check.mjs scan-forbidden` exit 0, house-style clean, and AGENTS.md has no budget-table edit. |
| 10 | WX-05: coverage thresholds hold, the Stryker score of touched files does not fall, and a drop is closed by a test | ✓ VERIFIED | `90-coverage-close.json` 99.89/99.78/98.40/99.64 against base 99.89/99.78/98.33/99.63, taken at `6a613f9a` after the last src commit. `90-mutation.mjs compare` exit 0. PortAccess.ts goes 43/43 → 51/51, PortDerivation.ts 46/47 → 47/47 (killed by `PortFacts.review.test.ts`), CustomPredicate.ts 30/31 → 33/33, LeafNeeds.ts 76/77 → 73/73. SignatureHistory.ts holds at 109/110: the same one survivor, recorded EQUIVALENT (`makeResourceId` is `Brand.nominal`). Every fall that lost killed mutants is accounted for. |
| 11 | WX-06: every behaviour change is preceded by a base characterisation, and every new check is shown failing | ✓ VERIFIED | The characterisation, the type pins and the tying test (`8e044761`, `ed4c14f5`, `f6bc8f4a`) precede the first src commit. `90-RED-EVIDENCE.md` (1439 lines) records each check failing. `90-check.mjs seen-failing` exit 0 for `PortFacts.review.tst.ts` (4 titles) and `PortFacts.review.test.ts` (1 title). |
| 12 | WX-07: no D-numbers, plan ids or phase numbers in shipped source, test titles or BDD; nothing released or pushed | ✓ VERIFIED | `90-check.mjs scan-ids` exit 0. A grep of added lines in `packages`, `spec/behaviors` and `features` for `D-NN`, `90-NN`, `WR-`/`IN-` or `PFACT` finds only old change-history entries. `Ports.ts:358` "D-17, ARCH-94" is pre-existing (base line 326). `90-check.mjs close`: "the no-release facts pass". The trailers check passes over 77 commits. |

**Score:** 10/12 truths verified (0 present, behavior-unverified; 1 uncertain, routed to a human; 1 failed)

**This looks intentional (truth 3).** To accept the deviation, a person adds this to the frontmatter:

```yaml
overrides:
  - must_have: "readScoped routes off the LEAF_NEEDS row … dispatches with a hoisted Match and never a switch"
    reason: "The review round replaced the hoisted Match, whose Always arm no input reached (90-REVIEW WR-01), with a per-port closed `need` union computed from the LEAF_NEEDS rows at compile time and one `===` narrowing in readScoped. There is no switch and no per-call matcher, the rows still decide (a mixed or reclassified row is a compile error), and the bench gate of record passed. ADR-QD-203 decision 7 and its Alternatives record it."
    accepted_by: "<name>"
    accepted_at: "<ISO timestamp>"
```

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/core/src/PortName.ts` | import-free leaf, one tuple | ✓ VERIFIED | 35 lines, no import, `PORT_NAMES` plus `PortName` |
| `packages/core/src/Ports.ts` | registry; span, fixture and data types derived; `DistinctSpanNames` applied | ✓ VERIFIED | `PORTS … satisfies DistinctSpanNames<PortTypes>` (57-63). `fixturePortsLayer` reads `PORT_FIXTURES[d.port]` (342) (WR-07). |
| `packages/core/src/PortDerivation.ts` | `DistinctSpanNames` refuses shared spans, patterns and unions | ✓ VERIFIED | `IsPattern`, `IsUnion`, `SpanOffenders` and `DistinctSpanNames` (diff lines 123-178). In the clone, setting `customSpanName = "qadi.hasRelationship"` gives TS1360 "does not satisfy the expected type 'never'" at `Ports.ts:63`. |
| `packages/core/src/PortDescription.ts` | `SpanName` and `FixtureData` parameters, required `fixture` | ✓ VERIFIED | Defaults are `` `qadi.${string}` `` and `never`. `fixture: (data: FixtureData) => Layer.Layer<Self>`. |
| `packages/core/src/PortAccess.ts` | `readScoped` routed by the rows; `readUnscoped` refuses scoped ports | ✓ VERIFIED (except the Match clause) | `readUnscoped: <K extends Exclude<PortName, ScopedPort>>… = readPort` (402-406), used by `resolveAttribute` (443) and `askCustom` (573) (WR-03) |
| five port modules | each states its span constant and its `fixture` | ✓ VERIFIED | e.g. `RelationshipResolver.ts` `relationshipSpanName`, `fixture: relationshipResolverFromEdges`; `CustomPredicate.ts:220` and the `fixture` arrow; builders moved above their descriptions (SEC-OBS-5) |
| `packages/http/src/PortRoutes.ts` | core's `PORT_NAMES` (IN-01) | ✓ VERIFIED (code) / ✗ no changeset | line 32 |
| `packages/testing/src/QadiReviewLayer.ts` | doc says what reads what (WR-07) | ✓ VERIFIED (code) / ✗ no changeset | 146-148 |
| `.changeset/core-port-facts-on-the-description.md` | Breaking minor for `@qadi/core` with an upgrade note | ✓ VERIFIED | the only changeset; see gap 1 for the two missing ones |
| `PortFacts.characterisation.test.ts`, `PortFacts.tst.ts`, `PortFacts.review.test.ts`, `PortFacts.review.tst.ts` | base pins and review pins | ✓ VERIFIED | green; held by the pinned check |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `LEAF_NEEDS` rows | `scopedCall` entry types | `ScopedLeafTag` → `ScopedPort` → `PortNeed<K>` → `ScopedCall<K>` | WIRED | a mixed or reclassified row is a compile error at `PortAccess.ts:309-310` (clone run) |
| `readActed` / `askRelationship` / `askSignature` | `readScoped` | direct call, typed leaf | WIRED | `PortAccess.ts:504, 558, 600` |
| `resolveAttribute` / `askCustom` | `readUnscoped` | refuses `ScopedPort` | WIRED | 443, 573 |
| each description `span` | `PortSpanOf` / `PortSpanName` | `PortTypes[N]["span"]` | WIRED | `Ports.ts:105,114` |
| each description `fixture` | `PORT_FIXTURES` → `fixturePortsLayer` → `@qadi/testing` review layer and devtools Fixtures | `tabulatePorts` fixture overload | WIRED | `Ports.ts:300, 342`; http and testing projects green |
| `PORT_NAMES` | metrics' `preregisteredWords`; `@qadi/http` routes | value import | WIRED | `PortMetrics.ts:71,87,101,119`; `PortRoutes.ts:32` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Facts, order, metric words, wire and served bytes, and the scoped route table are unchanged | `pnpm vitest run --project core` | 87 files, 2872 tests passed | ✓ PASS |
| A fake sixth port fails to compile | scratch clone, `"SixthPort"` added to `PORT_NAMES`, `tsc -p packages/core/tsconfig.src.json` | 47 errors, exit 1 (control: exit 0) | ✓ PASS |
| Two ports sharing a span fail to compile | clone, `customSpanName = "qadi.hasRelationship"` | TS1360 at `Ports.ts:63` | ✓ PASS |
| A reclassified unscoped leaf fails to compile until routed | clone, `HasCustom` row set to `Always` | TS2322 (`LeafNeeds.ts:177`), TS2741 (`PortAccess.ts:309`), TS2345 (`PortAccess.ts:574`) | ✓ PASS |
| A port with mixed rows fails to compile | clone, `HasNotActed` set to `Always` | TS2322 'never' at `PortAccess.ts:310` | ✓ PASS |
| Type pins in both passes | `pnpm test:tstyche` | exit 0 | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| `90-check.mjs close` | `node <D>/90-check.mjs close` | "close: 20 checks and the no-release facts pass", exit 0 | PASS |
| `90-pinned-check.mjs --all-applied` | as named | "408 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied", exit 0 | PASS |
| `90-earlier-checks.mjs` | as named | exit 0. The listed exit-1 lines of 85-89 (`scan-forbidden`: AGENTS.md moved since their base; 89 `records --close`: README revision) match the measured ledger. | PASS |
| `90-mutation.mjs compare` | as named | "no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants", exit 0 | PASS |

The `90-check.mjs close` pass does not cover gap 1: its changeset check (764-768) encodes the one-package assumption that the fix round made false.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| PFACT-01 | 90-01..02 (spike) | spike: madge simulation and bench gate decide what moves | ✓ SATISFIED | truth 1 |
| PFACT-02 | 90-09..12 | leaf tuple; tables derived; order kept | ✓ SATISFIED | truth 2 |
| PFACT-03 | 90-12 + review | `readScoped` routes off the row | ? NEEDS HUMAN (Match clause) | truth 3 |
| PFACT-04 | 90-03..04 + close | goldens on the base; sixth port is a compile error | ✓ SATISFIED | truth 4 |
| PFACT-05 | 90-13..15 | ADR-QD-203, amendments, AGENTS §3, BEH/INV/traceability | ✓ SATISFIED | truth 5 |
| WX-01 | close | check:pr green | ✓ SATISFIED | truth 6 |
| WX-02 | records | reserved numbers only | ✓ SATISFIED | truth 7 |
| WX-03 | changeset / gates | gate 13, gate 14 probes, changeset policy | ✗ BLOCKED | truth 8, gaps 1-2 |
| WX-04 | scan | nothing forbidden added | ✓ SATISFIED | truth 9 |
| WX-05 | mutation / coverage | no fall; thresholds | ✓ SATISFIED | truth 10 |
| WX-06 | RED evidence | characterise first; checks seen failing | ✓ SATISFIED | truth 11 |
| WX-07 | scan-ids / no release | no ids; nothing released | ✓ SATISFIED | truth 12 |

No orphaned requirement: REQUIREMENTS.md maps PFACT-01..05 to Phase 90 and WX-01..07 to every phase, and all are covered above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `.planning/…/90-check.mjs` | 764-768 | close check hard-codes one changeset, for `@qadi/core` alone | ⚠️ Warning | it hid gap 1; correct it with the fix |
| (none in src) | — | no TBD/FIXME/XXX, no stub, no empty implementation in the changed src | — | — |

`IsPattern` (`PortDerivation.ts`) uses TypeScript's built-in `Record<S, 1>` as a type-level pattern test. It is not the forbidden widened `Record<string, unknown>`. `AttributeResolver`'s fixture data reads as `Readonly<Record<string, unknown>>` in diagnostics because it is `AuthSubject["attributes"]`, a pre-existing type, and the phase spells no new one (IN-04).

### Human Verification Required

### 1. SC3's "hoisted `Match`" clause

**Test:** Read `PortAccess.ts:302-388` and ADR-QD-203 decision 7 and its "Alternatives considered". Decide whether the per-port compile-time `need` union with one `===` narrowing meets "dispatches with a hoisted `Match` and never a `switch`".
**Expected:** Accept the override above, or require a `Match`. Requiring one brings back the arm that no input reaches, which WR-01 removed.
**Why human:** The code deliberately deviates from the literal roadmap and REQUIREMENTS wording, and only a person can accept that.

### Gaps Summary

Both gaps have one root cause: the release and gate records were not brought along when the review fix round reached
beyond `@qadi/core`, and when the phase made its first public signature change of the wave.

1. **Missing changesets (WX-03, wave policy D-04).** `f9b6efb2` edits `packages/http/src/PortRoutes.ts:32` and
   `bb4ef25d` edits `packages/testing/src/QadiReviewLayer.ts:146-148`. Both are public packages, and Phase 87 set the
   precedent that a doc-only src edit gets a "No export changes." patch. Only the core changeset exists, and
   `90-check.mjs:764-768` asserts exactly that. Fix: add the two patch changesets and widen the close check.
2. **Gate 14 does not probe the changed signatures (WX-03).** `scripts/check-package-install.mjs:112` and `:124-128`
   carry no probe for the Breaking `PortDescription` shape (required `fixture`, new type parameters), and the packed
   consumer never uses `PORT_NAMES` or the new `tabulatePorts` overload. Fix: add a type-only probe of
   `PortDescription` (and the derived `PortFixtureData`/`PortSpanName`), make the consumer read `PORT_NAMES`, and show
   the probe failing once.

Neither gap touches the phase's product behaviour. Per-port facts live on the descriptions, `PortName` is a leaf
tuple, the derived sets are compile-time closed, and the scoped route is decided by the rows. All of that is verified
in the code and by independent compile-failure runs.

---

_Verified: 2026-11-26T11:36:10Z_
_Verifier: Claude (gsd-verifier)_
