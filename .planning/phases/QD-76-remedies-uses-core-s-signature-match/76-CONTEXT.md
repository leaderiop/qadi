# Phase 76: Remedies uses core's signature match - Context

**Gathered:** 2026-11-23
**Status:** Ready for planning

<domain>
## Phase Boundary

`@qadi/devtools`' remedy table (`remedyEdits`) offers one strengthening per requirement the policy names that the input
does not already meet. For a `hasSignature` requirement it decides "already met" itself, by restating what core's
fixture signature port would answer. For matcher leaves the same file asks core instead. Line numbers are from HEAD
(`bbaecd1d`), which is the phase base:

- **The inline match.** The `Signature` arm of `remedyFor` (`Remedies.ts:531-561`) computes the request's resource id
  itself (`:532`, `self.scope === "Resource" ? resourceIdOf(input.resource) : undefined`), skips with `NO_RESOURCE_ID`
  when a `Resource` leaf has none (`:533-535`), and decides "met" with an inline
  `.some(held => held.subjectId === input.subject.id && held.resourceId === resourceId && held.meaning === self.meaning
  && (self.signerRole === undefined || held.signerRole === self.signerRole))` (`:536-544`). That restates three core
  facts:
  - the leaf-to-request mapping, `signatureAsks.HasSignature` (`SignatureHistory.ts:179-188`, through
    `scopedResourceIdOf`, `ScopedLeaf.ts:34-37`), "the only place this leaf becomes a request (ARCH-70, ADR-QD-134)";
  - the fixture's pair scoping: `signatureHistoryFromSignatures` (`SignatureHistory.ts:356-409`) groups rows by
    `signatureHistoryPort.key([{ subjectId, resourceId }])` (`:359-360`, grouping `:361-390`) and answers a query with
    its pair's group (`:397-407`). A resource-scoped query sees only rows stored with that id, a subject-global one
    only rows stored with none (`:335-342`, INV-QD-120);
  - the match rule, `signatureMatches` (`SignatureMatch.ts:19-26`), which `askSignature` applies to the answer
    (`PortAccess.ts:481-496`, match at `:491-494`).
- **The same file avoids this for matchers.** `satisfyingValue` judges every leaf witness with core's `judgeMatcher`
  (`Remedies.ts:162-165`), and its comment (`:134-144`) names the hazard: reading a matcher backwards "is a second
  belief about what a comparison accepts — and that belief lagged the evaluator's".
- **Remedies is pure and synchronous.** `remedyEdits(policy, input): RemedySweep` (`Remedies.ts:87-111`) folds the
  policy with `foldPolicyCases` (`:398-399`). Its one caller is `WhatIf.ts`'s synchronous `derive` (`WhatIf.ts:190-201`,
  import `:36`), and BEH-QD-222 states that signature (`spec/behaviors/29-devtools-simulator.md:221`).
- **Today the signature verdict agrees with the port on typed input.** I traced every axis: the pair key is injective
  over two strings (`SignatureHistory.ts:344-348`), so key equality is string equality; `resourceIdOf` is the rule on
  both sides (`Resource.ts:32-35`); the role rule is `signatureMatches`'. The one divergence is a fixture the pair key
  refuses. A typed caller cannot produce one ("No typed `SubjectId`/`ResourceId` pair is refused", `:352-354`), but an
  untyped caller can (core pins it with a `JSON.parse` row and a `Symbol` subject, `SignatureHistory.test.ts:233-256`).
  Then the port fails every read with `SignatureHistoryUnavailable` (`:403-405`, BEH-QD-410). Remedies instead
  compares `held.subjectId === input.subject.id`, finds no match and offers an `AddSignature` row. That row cannot
  remedy anything, because the fixture still refuses, and BEH-QD-222 forbids such a row ("A remedy row that does not
  remedy is worse than an absent one", `29-devtools-simulator.md:272-275`).
- **`SignatureMatch.ts` is package-private on purpose** (header `:9-14`: "the match is how `@qadi/core` reads a
  signature list, not something a host calls"; ADR-QD-099). It is absent from the barrel (`packages/core/src/index.ts`
  has no line for it; `SignatureHistory.ts` is barreled `export *` at `:53`), so any export added to
  `SignatureHistory.ts` enters core's public surface.
- **Tests pin hand-written values, not the port.** `Remedies.test.ts:590-680`: four signature tests (`:590`, `:600`,
  `:627`, `:647`) and the no-resource-id skip (`:669`). Each compares with a literal label or row, so a drift between
  Remedies and the fixture port would go unnoticed.
- **The custom-predicate refusal is two sentences for one fact:**
  - `Remedies.ts:426-427` `CUSTOM_HAS_NO_FIELD` = `"a custom predicate's answer has no form field; run against Snapshot
    or Live"`, used at `:563` and shown on screen as a skipped remedy's reason;
  - `SimulationFields.ts:573-577` `FIXTURE_DATA.CustomPredicate` = `{ _tag: "NoFormVocabulary", reason: "a custom
    predicate's answer has no small typed value to type in; it answers from Snapshot or Live" }`. No source file reads
    this `reason` (`git grep`: the only reads of `FIXTURE_DATA` are `SimulationSource.ts:146-150`, through
    `fixtureData`, `SimulationFields.ts:581-584`, which drops a `NoFormVocabulary` cell). It is pinned by
    `SimulationFields.test.ts:136-141`, and `Remedies.test.ts:579` pins the other sentence.
  - No spec document quotes either sentence. BEH-QD-222 paraphrases the fact (`29-devtools-simulator.md:249-251`).
- **Public surface today:** `node scripts/check-api-surface.mjs` reports `941 export(s) documented across 9
  package(s)` at HEAD.

**This phase delivers:**
- ADR-QD-189 records the owner decision (D-01) and the shape (D-02) in a commit before any `packages/*/src` change.
- An agreement test, written first on the phase base and green there: on a closed product of cases, Remedies'
  verdict for a `hasSignature` leaf agrees with what core's `evaluate` answers over `fixturePortsLayer`.
- One new public core function in `SignatureHistory.ts`, `signatureAnswerFromSignatures`. It answers exactly what the
  signature port would answer for this leaf at this site over these fixture rows, as a `Result`, with no Effect. The
  fixture layer and this function share one private lookup, and `askSignature` and this function share one answer
  builder in `SignatureMatch.ts`. `SignatureMatch.ts` stays out of the barrel.
- Remedies' `Signature` arm asks that function, and the inline match is deleted. A refused fixture is reported as
  skipped (a regression row, RED on the base). Every existing remedy row and label is unchanged.
- The custom-predicate refusal becomes one sentence owned by `SimulationFields.ts`'s custom-predicate cell, which
  Remedies reads.
- The acted arm, with the same shape (D-13): `actedAnswerFromEvents` beside `decisionHistoryFromEvents`, and an
  agreement test RED on the base at `Any` scope.
- The records: ADR-QD-189, BEH-QD-716..720, INV-QD-397..398, traceability, CCR-QD-468, the `spec/overview.md` row
  (gate 13), the packed-consumer probe (gate 14), and two changesets.

**Out of scope:**
- The relationship arm of `remedyFor`: its form equality is the fixture's own key, so it agrees with the port (see
  Deferred). The acted arm is in scope (D-13).
- The signature port's span, wire, serving facet, key and `none`: `signatureQuestion`/`signatureSpan`
  (`SignatureHistory.ts:132-166`) and `signatureHistoryPort` (`:225-292`) are unchanged.
- `sameSignature` (`SimulationForm.ts:397-404`): see D-08.
- Remedy labels, row shapes, ordering and dedupe (`Remedies.ts:87-120`).

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE13-CONTEXT.md`)
- **D1 (scope):** all eight review candidates become phases, this speculative one included.
- **D2 (branch):** `arch-wave-13`, with no merge and no release.
- **Order:** strictly serial; this phase is last.
- **Reserved numbers only:** ARCH-123, ADR-QD-189, CCR-QD-468, BEH-QD-716..720, INV-QD-397..398. All are free on HEAD
  (`git grep -l` outside `.planning/` finds none). The reservation file holds `{CCR 468, ADR 189, BEH 720, INV 398}`.
- **Never run `node scripts/next-id.mjs`.**

### The owner decision, decided autonomously by the orchestrator (2026-11-23)
- **D-01: The phase ends in a change, not a rejection.**
  - Remedies' "already met" verdict for a signature is core's own answer, and the inline match at `Remedies.ts:536-544`
    is deleted.
  - `SignatureMatch.ts` stays package-private and is not exported.
  - Why:
    - the clean design states once which signature on file meets a leaf. Devtools already asks core's `judgeMatcher`
      for matcher leaves for exactly this reason (`Remedies.ts:134-144`);
    - core already writes the fixture data-to-layer mapping in one place (`PORT_FIXTURES`, `Ports.ts:249-268`:
      "before it each kept its own copy"), so devtools does not keep its own copy of a fixture's behaviour.
  - A recorded rejection is not the outcome. ADR-QD-189 records D-01 as its first decision, in a commit before any
    source change.

### The shape (SIGM-02, SIGM-03), decided autonomously (2026-11-23)
- **D-02: Option (a). Core gains one pure, synchronous judgement on its fixture side.**
  - **Name:** `signatureAnswerFromSignatures`.
    - It follows the module's own `<what>From<fixture data>` pattern: the layer is `signatureHistoryFromSignatures`, a
      `SignatureHistory` from signatures; this is a `SignatureAnswer` from signatures.
    - AGENTS.md §8 has no prefix for a pure judgement (`make…` builds, `is…` guards). Core's precedent for "a pure
      answer" is a plain verb or noun phrase (`judgeMatcher`, `resourceIdOf`).
  - **Home:** `packages/core/src/SignatureHistory.ts`, directly after `signatureHistoryFromSignatures`.
    - Not `SignatureMatch.ts`, which must stay out of the barrel and holds no fixture.
    - Not `PortAccess.ts`, which is out of the barrel (ADR-QD-099).
    - Not `Ports.ts`, which is the registry; the fixture lives in `SignatureHistory.ts`.
  - **Exact signature:**
    ```ts
    export const signatureAnswerFromSignatures = (
      signatures: ReadonlyArray<SignatureInput>,
      leaf: LeafOf["HasSignature"],
      site: ReadSite,
    ): Result.Result<SignatureAnswer, MissingResourceId | SignatureHistoryUnavailable>
    ```
    - Every parameter and result type is already public: `SignatureInput` (= `PortFixtureData["SignatureHistory"]`,
      `Ports.ts:245`), `LeafOf` and `ReadSite` (`PortDescription.ts:120,130-133`, overview `:299`), `SignatureAnswer`
      (`SignatureHistory.ts:118-121`, overview `:290`), and the two errors (`Errors.ts:108-114,129-139`).
    - It takes the leaf and the site because that is what the port description's `asks` takes (ADR-QD-134). The
      judgement then cannot ask a different question from the read.
    - Uncurried: a sweep calls it once per signature requirement, and grouping a form's rows costs O(rows).
  - **The answer is the read's own vocabulary, not a new one.** It is exactly what `askSignature` over
    `signatureHistoryFromSignatures(signatures)` yields:
    - success: `{ matched, onFile }`;
    - failure: `MissingResourceId` or `SignatureHistoryUnavailable`, with the same fields.
    - Rejected:
      - **a boolean.** It would hide both refusals, and Remedies must act differently on each: skip with "no
        resource id", or skip with the fixture's refusal;
      - **a new tagged union** (`Met | Unmet | …`). It would be a second vocabulary for the port's answer. With the
        read's own types, the agreement compares like with like.
  - **What it composes, in the read's order:**
    1. `signatureHistoryPort.asks.HasSignature(leaf, site)` gives `[query]` (`SignatureHistory.ts:179-188`).
    2. If `isResourceScoped(leaf)` and `query.resourceId === undefined`, it fails with
       `new MissingResourceId({ relation: leaf.meaning })`. This is the condition `readScoped` checks
       (`PortAccess.ts:284-291`), with the relation `askSignature` passes (`:489`).
    3. Otherwise it reads the shared private lookup for `query`. A refused fixture entry, or a refused query key, fails
       with `signatureHistoryPort.failure([query], describeKeyRefusal(refusal))`, the error the layer fails with
       (`:403-405`). It never answers `matched: false`, which would deny `hasSignature` and grant
       `not(hasSignature(...))` (INV-QD-007, BEH-QD-410).
    4. Otherwise it answers with the shared answer builder over the pair's rows.
    - It builds `MissingResourceId` directly instead of importing `errorOf` from `LeafNeeds.ts`. `LeafNeeds.ts:28`
      already does `import type { SignatureAnswer } from "./SignatureHistory.ts"`, and madge (gate 5, `pnpm circular`,
      `package.json:31`) counts type-only imports. Its `detective-typescript@14.1.2` reads `skipTypeImports` as false
      by default (`index.js:21-29`), so a value import back would be a cycle. `Policy.ts:939-945` avoids a cycle the
      same way. The agreement tests pin the error's `relation`.
  - **One private lookup, shared by the layer and the judgement.** In `SignatureHistory.ts` there is a module-private
    `signatureLookup(signatures)`, of type `(query: SignatureQuery) => Result.Result<Array<Signature>, KeyRefusal>`.
    It holds the pair-key grouping now inline at `:359-390`: the entry refusal fails every read, the query refusal
    fails its own, and each answer is a fresh copy. `signatureHistoryFromSignatures` becomes
    `Layer.succeed(SignatureHistory, { name, signaturesFor: (query) => Result.match(lookup(query), …) })`, with its
    name, its copy-per-query comment and its refusal mapping kept word for word. The judgement reads the same lookup,
    so the two cannot drift. The lookup is not exported.
  - **One answer builder, shared by the read and the judgement.** `SignatureMatch.ts` gains
    `signatureAnswerOf(signatures, meaning, signerRole): { readonly matched: boolean; readonly onFile: number }` beside
    `signatureMatches`. `askSignature` (`PortAccess.ts:491-494`) and the judgement both call it.
    - The return type is written structurally rather than as `SignatureAnswer`: `SignatureMatch.ts` importing a type
      from `SignatureHistory.ts` would be a madge cycle (`SignatureHistory.ts:56` imports `SignatureMatch.ts`).
      `SignatureAnswer` is assignable from it.
    - The header of `SignatureMatch.ts` (`:1-15`) gains one sentence naming the answer builder, and it still says out
      of the barrel.
  - **Public surface, gate 13 and gate 14:**
    - `spec/overview.md` gains a row after `:277`: `signatureAnswerFromSignatures` | function | `SignatureHistory.ts`
      — what the signature port, read for a `hasSignature` leaf at a site over these fixture rows, answers, as a
      `Result` with no Effect; the fixture layer and it share one lookup.
    - `check-api-surface` goes from 941 to 942. The "Entry points" table (`:943-957`) and "Not listed above" (`:931`)
      are unchanged.
    - `scripts/check-package-install.mjs`'s consumer `FIXTURE` (`:458-568`) imports it and runs two `expect` lines,
      the shape Phase 69 used for `thrownMessage`/`causeMessage` (`:470,490,564-567`):
      - a matching `Any` row answers `matched: true`;
      - a `Resource` leaf at a site with no resource fails `MissingResourceId`.
      It reads the result through `effect/Result`, imported in the fixture. The probe guard's lists
      (`TYPE_ONLY_PROBES`, `REFUSED_SHAPE_PROBES`, `:112-124`) do not change, because this is a value, not a
      type-only name.
- **D-03 (option b, rejected): evaluating the one leaf through `fixturePortsLayer` from Remedies.**
  - It would make `remedyEdits` an Effect, or build a runtime per signature requirement. That breaks its synchronous
    signature (BEH-QD-222, `29-devtools-simulator.md:221`) and `WhatIf.ts`'s synchronous `derive` (`:190-201`).
  - It would also make the remedy table's correctness depend on the sealed simulation layer (ADR-QD-050) instead of a
    data-only answer.
  - Option (a) is clean, so (b) is not needed. ADR-QD-189 lists it as considered and rejected.

### The agreement test (SIGM-01, WX-06), decided autonomously (2026-11-23)
- **D-04: `packages/devtools/test/model/RemedySignatureConformance.test.ts`, written first on the phase base.**
  - The name follows `ReviewSimulationConformance.test.ts` (BEH-QD-505) and `PortConformance.test.ts`. The file
    `include` (`packages/devtools/vitest.config.ts:19`) picks it up.
  - **The reference runs core, not devtools.** Each case runs `Effect.result(evaluate(leaf, { resource }))` with these
    provided:
    - `currentSubjectLayer(makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} }))`;
    - `fixturePortsLayer({ SignatureHistory: signatures === undefined ? undefined : { answers: signatures } })`;
    - a sequential `EvaluationId`.
    - Devtools' simulator also goes through `fixturePortsLayer` (`SimulationSource.ts:122-123`). It is not used here,
      so the reference does not share the code under test.
  - **The closed product, with no sampling.** The planner states each axis as a literal array, and the file asserts
    the case count:
    - **asker:** `"alice"`;
    - **site resource:** `{ id: "doc-1" }`, `{}` (no id), `{ id: 7 }` (a non-string id), and `undefined` (no
      resource);
    - **leaf:** `hasSignature("approved", { scope })` for `scope` ∈ {`"Resource"`, `"Any"`}, each with signerRole ∈
      {absent, `"approver"`}. That gives four leaves, two of which name no signer role;
    - **fixture list:**
      - `undefined` (the field is not listed, so the port stays at `SignatureHistoryNone`);
      - `[]`;
      - each single row of the product: subjectId ∈ {`"alice"`, `"bob"`}, resourceId ∈ {absent, `"doc-1"`,
        `"doc-2"`}, meaning ∈ {`"approved"`, `"reviewed"`}, signerRole ∈ {absent, `"approver"`, `"other"`}. That is
        36 rows;
      - the same 36 rows, each placed after a fixed decoy row `{ subjectId: "alice", meaning: "reviewed", resourceId:
        "doc-1" }`, so a match that reads only the first row fails.
    - About 74 lists × 4 leaves × 4 sites, roughly 1,200 evaluations. The planner times it at the base, and an
      `it.effect` per site keeps the failure output local.
  - **What each case asserts.** One three-way correspondence, with `sweep = remedyEdits(leaf, input)` and `input =
    { subject: { id: "alice" }, resource, signatures }`:
    - **Allow ⇔ already met:** `sweep.edits` and `sweep.skipped` are both empty;
    - **Deny ⇔ one remedy, and it remedies:** exactly one edit, of kind `AddSignature` and direction `Strengthen`,
      with nothing skipped, and evaluating again on `edit.apply(input).signatures` gives Allow. This is BEH-QD-222's
      "a remedy row that does not remedy is worse than an absent one", checked against the port;
    - **Failed with `MissingResourceId` ⇔ declined:** no edit, and `skipped` is exactly `[{ requirement: "signature
      approved", reason: "the check names no resource id" }]`.
    - A case whose outcome fits none of these three fails the test, so a fourth outcome cannot pass unnoticed.
  - **Green on the base, three runs out of three, and green at close.** Its inputs, titles and assertions are fixed
    for the rest of the phase.
  - **The regression row, in its own `describe`, is RED on the base and GREEN at close.**
    - The fixture holds one untyped row whose `subjectId` is a `Symbol`, built as `SignatureHistory.test.ts:236-240`
      does: `JSON.parse` and then set the field. No `as` (AGENTS.md §6). Test scope is exempt from the
      `JSON.parse` budget (§7a).
    - Core answers Failed with `SignatureHistoryUnavailable`.
    - **On the base,** Remedies offers an `AddSignature` row, and evaluating that row still fails.
    - **At close,** there is no edit, and `skipped` names `signature approved` with the D-06 reason.
    - Its failure output on the base goes in `76-RED-EVIDENCE.md`.
- **D-05: Core's own conformance test for the judgement:
  `packages/core/test/SignatureHistory.test.ts`, a new `describe("signatureAnswerFromSignatures")`.**
  - Written when the function is added. It cannot exist on the base, so it does not count as the base agreement test.
  - For every case of the same closed product, it checks that `signatureAnswerFromSignatures(rows, leaf, site)` equals
    `Effect.result(askSignature(site.subject, leaf, site.resource))` provided `signatureHistoryFromSignatures(rows)`.
    `askSignature` is reachable from core's own tests (`../src/PortAccess.ts`). The comparison covers the whole
    `Result`: `matched`, `onFile`, the error's `_tag`, and its fields (`relation`; `subjectId`, `resourceId`, `cause`).
  - It adds the refusals that only an untyped caller can reach:
    - a refused fixture entry (the `JSON.parse` `Symbol` row);
    - a refused query (an untyped `site.subject.id` that is a `Symbol`);
    - each one at a `Resource` site with no id, which pins "the missing id is checked before the fixture is read".
  - It reads errors and constructs none, so `PORT_DOUBLE_BUDGET` does not change.
- **D-06: What Remedies does with each answer** (the `Signature` arm after the change):
  - **The site:** `{ subject: subjectOf(input.subject), resource: input.resource }`. `subjectOf` is the one
    form-to-`AuthSubject` translation (`SimulationInput.ts:85-91`), and the simulation's own `CurrentSubject` is built
    with it (`Simulation.ts:73`).
  - **The rows:** `fieldOps("signatures").elements(input)`. An unlisted field reads as `[]`, which answers what
    `SignatureHistoryNone` answers (`SignatureHistory.ts:104,291`). The D-04 product pins this with its `undefined`
    list.
  - **Success with `matched`:** `undefined`, so there is no row.
  - **Success without `matched`:** one `grant("signatures", row, label)`.
    - The row's `resourceId` is `signatureHistoryPort.asks.HasSignature(leaf, site)[0].resourceId`, the description's
      own request. The row then carries the id exactly when the question does, and the "Resource scope needs an id"
      rule is no longer restated in Remedies.
    - The row's other fields and the label are built exactly as today (`Remedies.ts:546-559`).
  - **Failure:** dispatched by a module-scope `Match.type<MissingResourceId | SignatureHistoryUnavailable>()` with
    `Match.tagsExhaustive` (AGENTS.md §5a):
    - `MissingResourceId`: `skip(\`signature ${meaning}\`, NO_RESOURCE_ID)`, unchanged from today;
    - `SignatureHistoryUnavailable`: `skip(\`signature ${meaning}\`, …)`, a sentence that says the signature fixtures
      cannot be read, so no added row would be answered, followed by the refusal's own text through core's
      `thrownMessage(failure.cause)` (total, ADR-QD-182). The exact wording is Claude's discretion; BEH-QD-719 quotes
      it once.
  - **The `Requirement` type.** The `Signature` variant (`Remedies.ts:317-322`) carries the node itself:
    `{ _tag: "Signature"; readonly leaf: LeafOf["HasSignature"] }`. The judgement and `asks` take that node, the same
    way `satisfyingValue` takes the matcher. `requirementCases.HasSignature` (`:368-370`) passes `p`. Its comment
    (`:365-367`) is rewritten to say the node goes to core.
  - **Doc comments.** The doc comment of `remedyEdits` (`:69-86`) and the `Signature` arm's comment (`:525-530`) are
    rewritten to say that "already met" for a signature is core's answer (`signatureAnswerFromSignatures`), not a
    syntactic check. They claim only what the agreement test enforces.
  - **Purity:** Remedies stays pure and synchronous.

### Custom-predicate refusal (SIGM-04), decided autonomously (2026-11-23)
- **D-07: `SimulationFields.ts` owns the sentence, as a named cell value.**
  - **The value.** `SimulationFields.ts` exports
    `NO_CUSTOM_PREDICATE_FIELD: NoFormVocabulary = { _tag: "NoFormVocabulary", reason: "a custom predicate's answer has
    no form field; run against Snapshot or Live" }`.
  - **Its two readers:**
    - `FIXTURE_DATA.CustomPredicate` is that value (`:573-577`);
    - Remedies' `Custom` arm reads `NO_CUSTOM_PREDICATE_FIELD.reason`. `CUSTOM_HAS_NO_FIELD` (`Remedies.ts:426-427`)
      is deleted.
  - **Why `SimulationFields.ts`:**
    - it owns "a port the form has no vocabulary for" (`NoFormVocabulary`, `:543-547`);
    - Remedies already imports it (`Remedies.ts:44`);
    - its header forbids the reverse import (`SimulationFields.ts:23-27`, ADR-QD-037), so the direction is fixed.
  - **Why a named value and not a read of `FIXTURE_DATA.CustomPredicate.reason`:** the table is typed
    `FixtureCell<K>`, a function or `NoFormVocabulary` (`:550-552,568`). Reading `.reason` from it would need a
    narrowing in Remedies.
  - **The sentence kept is Remedies' one,** the one shown on screen. The other copy is never displayed, so the panel's
    text does not change.
  - **Tests:**
    - `Remedies.test.ts:578-588` is unchanged. It is the characterisation of the displayed text;
    - `SimulationFields.test.ts:136-141` changes its expected `reason` to the kept sentence. It is the one test whose
      value moves;
    - one new test asserts `strictEqual` between Remedies' skip reason for `hasCustom` and
      `NO_CUSTOM_PREDICATE_FIELD.reason`. One owner, read by the remedy table.
  - **Doc comment:** `FIXTURE_DATA`'s doc comment (`:554-567`) gains one line, that the remedy table reads this cell's
    reason.

### Settled grey areas, decided autonomously (2026-11-23)
- **D-08: `sameSignature` stays, because it is a different rule on purpose.**
  - It is full structural equality, `signedAt`, `algorithm` and `keyId` included (`SimulationForm.ts:396-404`). It
    serves the form's duplicate check (`SimulationFields.ts:338-339`, `addChip` `:445`) and the weakening drop's
    identity (`:425-436`), where two rows differing only in `signedAt` are two chips (`signatureLabel`, `:210-235`).
  - The port's match ignores those three fields (trust-on-presence, ADR-QD-058, `SignatureMatch.ts:4-7`).
  - The existing comment at `Remedies.ts:529-530` already draws this line. The rewritten comment keeps it.
- **D-09: Tests that do not change.**
  - **`Remedies.test.ts`, the whole file.** Its titles, inputs and expected values do not change, including the five
    signature tests (`:590-680`) and the custom test (`:578-588`). They stay beside the agreement test: they pin the
    labels and rows the agreement test does not check (label text, the row's exact fields, two nodes collapsing).
  - **`SignatureHistory.test.ts`'s existing fixture tests** (`:100-275`). The layer's behaviour is preserved by
    construction, and these tests prove it.
  - **The other suites:** `WhatIf`, `ReviewSimulationConformance` and the simulator suites.
- **D-10: Mutation (WX-05).** `76-mutation.mjs` copies `75-mutation.mjs`'s discipline: base and close records, a clean
  tree, one head per record, `record close <group> --restart` (a base is never restarted), the removed-mutant rule, an
  `EXAMINED` table admitted only after a by-hand `ignoreStatic: false` kill, and `--self-test`.
  - **Groups, both with a base:**
    - `core` = `SignatureHistory.ts`, `SignatureMatch.ts` and `PortAccess.ts`, through `stryker.config.mjs` and
      `reports/mutation/mutation.json`;
    - `devtools` = `Remedies.ts` and `SimulationFields.ts`, through `stryker.devtools.mjs` and
      `reports/mutation-devtools/mutation.json`, as `74-mutation.mjs:24-28` does.
  - Whole files. `PortAccess.ts` joins because of the three-line answer-builder change. If a plan then leaves
    `PortAccess.ts` untouched, it is dropped from the group before the base is recorded, never after.
  - The base is recorded on `bbaecd1d` before any source edit. A drop is closed with a test, never re-baselined.
- **D-11: Each guarantee is seen failing once (WX-06).** Each gut is reverted with `git checkout` and recorded in
  `76-RED-EVIDENCE.md`:
  1. in the shared lookup, answer a subject-global query from every row of the subject (drop the pair scoping). The
     core conformance test and the devtools agreement test both fail;
  2. in the judgement, skip the missing-id check. The core conformance test fails on the `Resource`-with-no-id rows;
  3. in the judgement, answer `matched: false` for a refusal. The core conformance test and the regression row fail;
  4. in Remedies, read `MissingResourceId` as met. The agreement test fails;
  5. in Remedies, build the row's resource id from the site regardless of scope. The agreement test's "the remedy
     remedies" check fails on `Any` leaves;
  6. point `FIXTURE_DATA.CustomPredicate` at a fresh literal. The new identity test fails;
  7. delete the overview row. `node scripts/check-api-surface.mjs` fails.
- **D-12: The records (SIGM-05, WX-02, WX-03).**
  - **ADR-QD-189,** "Remedies asks core whether a fixture signature meets a leaf":
    - Status: Accepted. It amends ADR-QD-058 and ADR-QD-094, and reads ADR-QD-099, ADR-QD-134, ADR-QD-050 and
      ADR-QD-091.
    - It records D-01, D-02 (with rejected (b) and the rejected answer shapes and homes), D-06 and D-07.
    - It states what the compiler enforces: the answer type, the closed failure union and its `tagsExhaustive`
      dispatch, `SignatureMatch.ts` absent from the barrel (gate 14's check 3b refuses a non-entry module). It also
      states what only the tests enforce: the agreement, the read order, and one shared lookup.
    - It records that ADR-QD-099 needs no exception, because the new name lives in a barreled module and the
      package-private module stays private.
    - It records the acted arm as covered in this phase (D-13), with its evidence.
    - Index row in `spec/decisions/index.yaml`. The Document ID equals the file number (gate 10).
  - **Dated amendments, never a rewrite of history:**
    - ADR-QD-058, after its 2026-11-10 amendment: the match rule stated once now also serves the fixture judgement, and
      the answer `{ matched, onFile }` is built once;
    - ADR-QD-094, in its fixture section (`:274-298`): the signature fixture's lookup is shared by its layer and its
      pure judgement;
    - BEH-QD-410 (`06-services.md:476-480`): a dated note that the judgement is another consumer of the fixture's key
      that fails closed;
    - BEH-QD-222 (`29-devtools-simulator.md:245-251`): a dated note that "already met" for a signature is core's
      answer, pointing at BEH-QD-718.
    - ADR-QD-099 is left as written.
  - **BEH-QD-716..717 in `spec/behaviors/06-services.md`,** a new section after BEH-QD-410, each with a ` ```ts `
    listing:
    - 716: `signatureAnswerFromSignatures` answers what the signature port, read for that leaf at that site over those
      rows, answers. That is `{ matched, onFile }`; `MissingResourceId` for a `Resource` leaf at a site with no usable
      id, checked before the rows are read; `SignatureHistoryUnavailable` carrying `describeKeyRefusal`'s sentence for
      a refused row or query; never `matched: false` for a refusal;
    - 717: the fixture layer and the judgement read one lookup, and the read and the judgement build the answer with
      one rule, so a change to scoping or matching reaches both.
  - **BEH-QD-718..720 in `spec/behaviors/29-devtools-simulator.md`,** after BEH-QD-223:
    - 718: a signature remedy is decided by core's answer. Met means no row. Unmet means one `AddSignature` row whose
      resource id is the request's (from the description's `asks`), and applying it makes the leaf hold;
    - 719: a `Resource` leaf with no resource id is skipped with "the check names no resource id". A signature fixture
      the port refuses is skipped with the refusal, never offered a row;
    - 720: the custom-predicate refusal is one sentence, owned by the simulation field table's custom-predicate cell
      and read by the remedy table.
  - **INV-QD-397:** for every fixture signature list, `hasSignature` leaf and site, the remedy table agrees with the
    fixture signature port. Allow means no row; Deny means exactly one row, which makes it hold; Failed means skipped.
  - **INV-QD-398:** core states once which signature on file meets a leaf at a site. The pieces are the leaf's request
    (`asks`), the fixture's pair lookup, and the match and answer rule (`SignatureMatch.ts`). The port read, the fixture
    layer and `signatureAnswerFromSignatures` are built from them, and `SignatureMatch.ts` stays out of the barrel.
  - **Traceability, the CCR row and the changesets:**
    - `spec/traceability.md` gets rows for the five BEHs, the two INVs, ADR-QD-189 and the two new test blocks or
      files. The 06 and 29 rows in the BEH-range table (`:48`, `:71`) widen;
    - CCR-QD-468 in `spec/README.md` (Document history and the CCR table) cites every revision and lists every changed
      file outside `.planning/`. All reserved ids are expected to be used; it names any that are not;
    - `spec/overview.md`'s Change History gains a 1.134 row for the new name;
    - `.changeset/core-signature-answer-from-signatures.md`, `"@qadi/core": minor` (a new public export is a minor
      here, as `core-thrown-message.md` is);
    - `.changeset/devtools-remedy-asks-core-signature.md`, `"@qadi/devtools": patch`: a refused signature fixture is
      reported as skipped instead of offered a row that would not remedy, and nothing else on screen changes.
  - **AGENTS.md** does not change. No budget moves: no `as`, `switch`, `fnUntraced`, negative type pin, module `let`,
    or decode token is added in `src`, and test-scope `JSON.parse` is exempt. If a plan does add a negative tstyche
    pin, `NOT_CALLABLE_PIN_BUDGET` and its §6 table change together (WX-04). Prefer positive pins.
  - Spec registers are revised only through `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-23`.

- **D-13: The acted arm is covered in this phase, with the same shape. This overrides the discuss draft's deferral.**
  Decided autonomously by the orchestrator (2026-11-23).
  - **Why:**
    - It is the same defect in the same function: Remedies restates a fixture port's scoping instead of asking core.
    - It is observable today, at `Any` scope (`Remedies.ts:514-523` against `DecisionHistory.ts:289-302`, BEH-QD-092):
      - a redundant "with event … on doc-1" row for a subject that acted on `doc-9`;
      - a false "unremediable" at a site with no resource id for a leaf that already holds.
    - The owner's standing order is the most complete and clean solution. The roadmap's Packages line and WX-03's
      "possibly one" export describe what the planner expected, not a fence against fixing a defect it did not see.
  - **Core.** `actedAnswerFromEvents(events, leaf: LeafOf["HasActed"], site: ReadSite)` sits beside
    `decisionHistoryFromEvents` in `DecisionHistory.ts`:
    - it returns `Result<ActedResult, MissingResourceId | DecisionHistoryUnavailable>`;
    - it reads in the same order as `askActed`'s read (the description's `asks`, `readScoped`, then the lookup);
    - its lookup is private and shared with `decisionHistoryFromEvents`, so the two cannot drift;
    - its name follows one pattern with `signatureAnswerFromSignatures`. The planner may rename both together (for
      example `signatureAnswerFromSignatures`/`actedAnswerFromEvents`, or a symmetric pair) but never one alone.
  - **One table or two names?** Two named functions, each beside the fixture builder it shares a lookup with.
    - One exported table keyed by leaf tag would be fewer names, but it would mix two answer types behind one name.
    - It would also sit apart from the fixtures whose lookups it must share.
  - **The surface.** Core's exports go from 941 to 943:
    - both names get `spec/overview.md` rows (gate 13) and packed-consumer probes (gate 14);
    - ADR-QD-189 and CCR-QD-468 say plainly that WX-03's "possibly one" became two, and why.
  - **Remedies** (`Acted` arm), dispatching the answer with `Match.tagsExhaustive` as D-06 does:
    - `Acted` means met, so there is no row, whatever the site's resource id;
    - `NotActed` with a resource id is one `AddEvent` row on that resource (an event record carries one; `Any` widens
      the question, not the fixture);
    - `NotActed` with no resource id is skipped with "the check names no resource id";
    - `MissingResourceId` is skipped the same way;
    - a refused fixture is skipped with its refusal.
  - `HasNotActed` stays `[]`, unchanged.
  - **Tests.** `packages/devtools/test/model/RemedyActedConformance.test.ts` is a closed product like D-04:
    - sites with and without a resource id, `Resource` and `Any` leaves, subjects, events and resources;
    - written on the base and RED there on the two divergences above, with each RED row named in `76-RED-EVIDENCE.md`;
    - green on every other row.
  - Core's own conformance test gains the acted judgement against `askActed` over the fixture layer, as D-05 does.
  - **Records, within the reserved ids:**
    - BEH-QD-716 states the judgement rule for both functions, and BEH-QD-717 the shared lookup for both fixtures;
    - BEH-QD-718 states the remedy rule for both leaves (signature and acted), and BEH-QD-719 the skips for both;
    - INV-QD-397 is the agreement for both leaves, and INV-QD-398 the "stated once" for both ports;
    - ADR-QD-189's title widens to "Remedies asks core whether a fixture row meets a signature or acted leaf";
    - ADR-QD-058's amendment covers both;
    - the changesets name both: core minor (two exports), and devtools patch (the `Any`-scope acted remedy no longer
      offers a redundant row or a false skip, and a refused signature fixture is skipped).
  - **Mutation (D-10).** The core group gains `DecisionHistory.ts`, measured at the base like the rest.
  - **Guts (D-11):**
    - the acted lookup unshared;
    - `Any` scope read as `Resource`;
    - the `Acted` arm restoring the exact-triple check.
  - **The relationship arm stays as it is.** Its form equality (`sameEdge`) is the fixture's own exact-triple key
    (`RelationshipResolver.ts:393-413`), so there is no divergence to fix.
    - A third export with no behaviour to change would widen the surface for no gain.
    - Recorded in `<deferred>` as a deliberate keep, not an oversight.

### Claude's Discretion
- **Names:** the private lookup (`signatureLookup`), the answer builder (`signatureAnswerOf`), the Remedies failure
  matcher, and the regression helper.
- **The exact `SignatureHistoryUnavailable` skip sentence,** which must contain the refusal's text and say that no
  added row would be answered.
- **Whether a positive tstyche pin** of the judgement's result type (the closed error union) goes in a new
  `packages/core/test/SignatureHistory.tst.ts`. If it does, `tstyche --listFiles` must still match the walk
  (`scripts/run-tstyche.mjs`).
- **The agreement test's layout:** one `it.effect` per site or per leaf, the row order, and the case-count assertion.
- **Plan split.** Suggested, strictly serial, one test runner at a time:
  1. ADR-QD-189 and its index row (the owner decision recorded), then base facts (`check-api-surface` 941, row counts);
  2. on the phase base: the agreement test (product green three runs out of three, regression row RED), the RED
     evidence, and both mutation bases;
  3. core: the shared lookup, `signatureAnswerOf`, `signatureAnswerFromSignatures`, the core conformance test, the
     overview row and the packed-consumer probe;
  4. devtools: the `Signature` arm on core (regression row GREEN, product still green) and the custom-predicate owner
     with its tests;
  5. the guts (D-11), the records, the changesets, the mutation close and `pnpm check:pr < /dev/null`.
- **Constraints:**
  - no `as` (beyond `as const`), `!`, `any`, `switch` or `Record<string, unknown>` added;
  - `Match` for tag dispatch;
  - `effect/*` submodule imports, named imports from `@qadi/core`;
  - ~90-column hand wrapping;
  - doc comments lead with a one-line summary and claim only what the compiler or a test enforces;
  - no phase numbers, plan ids, requirement ids or D-numbers in source, tests, titles or spec (WX-07).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Wave and phase scope
- `.planning/ROADMAP.md`, "### Phase 76:" (goal, the speculative note, evidence, success criteria, planning notes).
- `.planning/REQUIREMENTS.md`: SIGM-01..05 (`:69-73`), WX-01..07 (`:77-83`).
- `.planning/phases/_WAVE13-CONTEXT.md`: Phase 76 evidence, the reserved ids, execution order.
- `.planning/phases/_SHARED-CONTEXT.md`: house rules, verify-command hygiene (zsh: `bash -c`, `/usr/bin/grep`), the
  XC-05 mutation procedure.
- `.planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-mutation.mjs` and
  `.planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-mutation.mjs`: the scorer to
  copy (core and devtools configs).

### House rules
- `AGENTS.md` §1 (imports), §5a (`Match`), §6 (budgets: `PORT_DOUBLE_BUDGET`, `NOT_CALLABLE_PIN_BUDGET`), §7a
  (`JSON.parse` budget, test scope exempt), §8 (naming), §9 (barrels, ADR-QD-099), §11 (spec is normative), §15 (gates
  13 and 14).

### Decisions
- `spec/decisions/099-entry-points-are-a-closed-list.md`: out of the barrel means not importable.
- `spec/decisions/134-a-resource-scoped-port-read-is-one-read.md`: `readScoped` and `asks`, a leaf's request stated
  once.
- `spec/decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md`: trust-on-presence; the amendment of
  2026-11-08 (`signatureMatches` stated once, `:237-244`); the amendment of 2026-11-10 (`Any` differs between history
  and signatures).
- `spec/decisions/094-a-port-is-described-once.md`: `PORT_FIXTURES`, `:274-298`.
- `spec/decisions/050-a-simulation-is-sealed.md`: Fixtures mode takes data.
- `spec/decisions/091-comparison-semantics-have-one-owner.md` (`:90`): the matcher precedent Remedies follows.
- `spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md`: the signature span reads the same
  match.
- `spec/decisions/182-*.md`: `thrownMessage`, used for the refusal sentence.

### Spec registers
- `spec/behaviors/29-devtools-simulator.md`: BEH-QD-222 (`:217-287`, the remedy rules), BEH-QD-223 (`:289`), BEH-QD-505
  (`:942-961`). The new BEH-QD-718..720 go here.
- `spec/behaviors/06-services.md`: BEH-QD-410 (`:455-487`). The new BEH-QD-716..717 go here.
- `spec/invariants.md`: INV-QD-042 (`:1750`), INV-QD-043 (`:1797`), INV-QD-120 (`:3471`), INV-QD-257 (`:3585`),
  INV-QD-288 (`:3653`).
- `spec/overview.md`: `:277` (the signature services row), `:290` (`SignatureAnswer`), `:299` (`ReadSite`, `LeafOf`),
  `:306` (`PORT_FIXTURES`), "Not listed above" `:931`, "Entry points" `:943`.
- `spec/traceability.md`: `:48`, `:71`.
- `spec/README.md`: Document history and the CCR table.
- `.changeset/core-thrown-message.md` (the minor shape for a new export) and
  `.changeset/devtools-remedy-label-without-json.md` (the devtools remedy patch shape).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`SignatureHistory.ts`:**
  - `signatureHistoryPort.asks.HasSignature` (`:179-188`), `.key` (used at `:359-360`) and `.failure` (`:285-290`);
  - `SignatureInput` (`:321-330`) and `SignatureAnswer` (`:118-121`);
  - the fixture body to factor (`:356-409`).
- **`ScopedLeaf.ts`:** `isResourceScoped` (`:27`) and `scopedResourceIdOf` (`:34-37`), package-private, shared by
  `asks` and the read (INV-QD-288).
- **`SignatureMatch.ts`:** `signatureMatches` (`:19-26`).
- **`PortAccess.ts`:** `readScoped` (`:273-293`), `askSignature` (`:481-496`); reachable from core's tests.
- **`PortDescription.ts`:** `LeafOf` (`:120`), `ReadSite` (`:130-133`), `describeKeyRefusal`, `KeyRefusal`.
- **`Ports.ts`:** `fixturePortsLayer` (`:306-312`), `PortFixtureData` (`:241-247`).
- **Devtools:**
  - `subjectOf` (`SimulationInput.ts:85-91`);
  - `fieldOps("signatures").elements` and `grant` (`SimulationFields.ts:412-417,481-493`);
  - `NoFormVocabulary` (`:543-547`).
- **The untyped-row idiom:** `SignatureHistory.test.ts:233-240` (`JSON.parse`, then set a `Symbol`).

### Established Patterns
- **Devtools asks core rather than restating it:** `satisfyingValue` and `checked` use `judgeMatcher`
  (`Remedies.ts:146-165`); `render` uses `valueLabel` (`:574`).
- **A pure judgement in core** returns a value and opens no span (`judgeMatcher`, `LEAF_VERDICTS`,
  `LeafNeeds.ts:387-398`).
- **The fail-closed rule for a key refusal** (BEH-QD-410): never an empty list or a `false`.
- **Phase discipline (Phases 69–75):** a characterisation or regression test first, RED evidence in
  `NN-RED-EVIDENCE.md`, mutation base and close, each check seen failing once.

### Integration Points
- **The flow:** `whatIf` → `derive` (`WhatIf.ts:190-201`) → `remedyEdits` → `remedyFor`'s `Signature` arm →
  `signatureAnswerFromSignatures` (new) → shared lookup + `signatureAnswerOf` (new) ← also `signatureHistoryFromSignatures`
  and `askSignature`.
- **Gates:**
  - `node scripts/check-api-surface.mjs` (gate 13, 941 → 942);
  - `scripts/check-package-install.mjs` (gate 14, the `FIXTURE` at `:458-568`);
  - `pnpm circular` (gate 5, madge, type imports counted);
  - `pnpm lint` (house style, budgets unchanged).
- **Tests:**
  - the new `RemedySignatureConformance.test.ts` (devtools);
  - the new `describe` in `SignatureHistory.test.ts` (core);
  - `SimulationFields.test.ts:136-141`, the one expected value that moves;
  - `Remedies.test.ts`, unchanged.

</code_context>

<specifics>
## Specific Ideas
- **The regression row is the first RED evidence.** The fixture is `[{ subjectId: Symbol("alice"), meaning: "approved"
  }]`, built untyped, with the leaf `hasSignature("approved", { scope: "Any" })` at `{ id: "doc-1" }`.
  - Core answers Failed with `SignatureHistoryUnavailable`, and its `cause` is `"subjectId: an unkeyable symbol (Symbol)
    has no request key"` (the sentence `SignatureHistory.test.ts:254` pins).
  - **On the base,** `remedyEdits` offers `with signature approved`, and evaluating that row is still Failed.
- **Assert the "remedy remedies" leg on every Deny case,** not only on a sample. That is the property BEH-QD-222 states,
  and it catches a row with the wrong resource id at `Any` scope (D-11 gut 5).
- **Count the product in the test,** and state the expected count as a literal, so an axis edited down shows up.
- **Read the fixture's refusal sentence from core's failure,** never as a hand-typed literal, apart from the one pin
  above. Test files do not construct port errors (`PORT_DOUBLE_BUDGET`).

</specifics>

<deferred>
## Deferred Ideas
- **The acted arm finding moved into the phase (D-13).** The relationship arm stays as it is:
  - its form equality is the fixture's own exact-triple key (`RelationshipResolver.ts:393-413`);
  - asking core would add an export with no behaviour to change;
  - kept deliberately; revisit only if the relationship fixture gains scoping beyond the triple.
- **A wider option, not taken: one table of per-port fixture judgements beside `PORT_FIXTURES`,** from which the layers
  derive.
  - With two judgements of different answer types, two named functions beside their fixtures are clearer.
  - Revisit if a third port needs one.
- **A website concepts paragraph for `signatureAnswerFromSignatures`** (`apps/website/.../concepts/signatures.md`). The
  overview row is the gated documentation, and a host-facing example can follow if a host asks.
- **Wave wording, recorded so it is not mistaken for a contradiction.** `_WAVE13-CONTEXT.md`'s "not in a new export"
  meant not exporting `SignatureMatch.ts`. The roadmap's success criterion 3 allows an added export named in the
  overview and probed by gate 14, which D-02 does.

</deferred>

---

*Phase: 76-remedies-uses-core-s-signature-match*
*Context gathered: 2026-11-23*
