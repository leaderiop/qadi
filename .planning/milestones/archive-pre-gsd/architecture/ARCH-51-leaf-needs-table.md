---
id: ARCH-51
title: "State once what each policy leaf needs from the request and which port it asks: a package-private `LeafNeeds.ts` both interpreters and `servingFor` consult; `MissingAction`/`MissingResource` built in one place; `servingFor` exhaustive by type"
strength: Worth exploring   # from the 2026-10-13 architecture review (wave 5), candidate 6 "State each leaf's needs and port once"
status: superseded-by-phase-13
disposition: "T1 obsolete (`collectNames` deleted by merged ARCH-53, e0365e0); the T2 test and T3 doc fix go to Phase 13 (GAP-07, GAP-11); the full LeafNeeds.ts deepening is out of scope; was `done` on the unmerged branch only (9cf0e5f) (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []             # soft: ARCH-46 owns the resource-id rule (D-51-a); T10 is the fallback if it does not land
blocks: []
adrs_touched:
  - ADR-QD-024 (constraint: the two interpreters stay two; the table holds facts, never verdicts, and each interpreter decides what a fact means for it)
  - ADR-QD-077 (amend: "what a leaf needs and which port it asks" joins "how a port is asked" as shared knowledge; `MissingAction` stays on reach in both interpreters; the resource-id check stays inside the read that owns the span)
  - ADR-QD-090 (constraint: `Policy.ts` keeps the structural per-tag facts — `childrenOf`, `fieldsOf`, `matcherOf`; the new facts are about the request and the ports, not the ADT's shape; no new traversal)
  - ADR-QD-100 + its ARCH-41 amendment (constraint: `Admission.ts` stays depth gate + matcher context; leaf preconditions are on reach and are NOT admitted statically)
  - ADR-QD-107 (amend: `servingFor` is derived from the leaf table and is exhaustive over leaves and ports, not only pinned by a property)
  - ADR-QD-034 / AGENTS.md §5a (constraint: `SWITCH_BUDGET` stays `Walk.ts: 1`, `Matcher.ts: 2`; the table uses hoisted `Match.tagsExhaustive`, no new switch)
  - ADR-QD-073 (constraint: `UNTRACED_BUDGET` unchanged; the new functions are pure, no `Effect.fn` change)
  - ADR-QD-079 (constraint: the `Predicate` ADT, `toRenderable` and every refusal reason text are unchanged)
  - ADR-QD-091 (constraint: comparison semantics stay in `Compare.ts`; `judgeMatcher` untouched)
  - ADR-QD-037 (constraint: madge counts type-only cycles — probed; `PortMetrics.ts` must not import the table)
  - ADR-QD-099 (constraint: `LeafNeeds.ts` is out of the barrel, so package-private)
  - ADR-QD-060 / AGENTS.md §4 (constraint: `MissingAction`, `MissingResource`, `MissingResourceId` stay `Schema.TaggedError`; `SCHEMA_ERROR_BUDGET` unchanged)
packages: ["@qadi/core", "scripts (house style, if D-51-e = A)", "spec"]
estimate: M   # ≈ 2 days; T1–T3 (the ship-ahead patch) ≈ ½ day; T5's interleaved bench ≈ 2 h of wall clock
---

# ARCH-51 — State once what each policy leaf needs from the request and which port it asks

## 1. Verified evidence (at `b655b3b`)

Read-only: nothing in the repository was edited. `git rev-parse --short HEAD` → `b655b3b`. Baseline:
`pnpm vitest run packages/core/test/PortRemote.test.ts packages/core/test/Predicate.test.ts packages/core/test/Evaluate.test.ts`
→ 3 files, 375 tests passed.

**Probes** (all under
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-51/`,
ephemeral; each row says what to re-run):

- `serving-coverage.ts` (run with `npx tsx` from `packages/core`, `node_modules` symlinked): samples the exact 150
  policies `PortRemote.test.ts`'s `servingFor` property samples (`policyArbitrary()`, seed `20261008`), evaluates each
  with five recording ports and `{ resource: { id: "doc-1" } }`, and counts runs that reached each port. Output:
  `AttributeResolver: 12, RelationshipResolver: 7, DecisionHistory: 27, CustomPredicate: 17, SignatureHistory: 14` (of 150).
- `madge/` (two files, `A.ts` and `B.ts`, importing each other's **types** only): `npx madge --circular --extensions ts`
  → `Found 1 circular dependency! A.ts > B.ts`. **madge counts a type-only cycle.**
- `graph.json`: `npx madge --json --extensions ts packages/core/src`, then a reachability walk: none of `Errors.ts`,
  `Matcher.ts`, `Policy.ts`, `PortMetrics.ts`, `Resource.ts` reaches `Walk.ts`, `Predicate.ts` or `PortRemote.ts`, so a
  module importing the former and imported by the latter adds no cycle.
- `spike/LeafNeeds.ts` + `spike/tsconfig.json` (extends `tsconfig.base.json`): a static per-leaf table written
  `as const satisfies { readonly [T in LeafTag]: … }`, a derived `TranslatedPortName`, a
  `Pick<PolicyCases<PortAsk | undefined>, LeafTag>` arm set, and a hoisted `Match.tagsExhaustive` returning
  `MissingAction`/`MissingResource`. `npx tsc -p spike/tsconfig.json` → **clean** (no `as` beyond `as const`). Swapping the
  agreement check to `Equal<TranslatedPortName | "SignatureHistory", PredicatePortName>` → `TS2322`, so the derivation
  is what it claims.

| # | Claim (review, 2026-10-13) | Verdict | Evidence at `b655b3b` |
| - | -------------------------- | ------- | --------------------- |
| C1 | "Needs an action / a resource" is restated in `Walk.ts` (~:330–359, :387). | **CONFIRMED** | `Walk.ts` — `evaluateNode`, arm `HasAttribute` (:329–344): `action === undefined && referencesAction(policy.matcher)` → `new MissingAction({})`, then `resource === undefined && referencesResource(policy.matcher)` → `new MissingResource({ attribute })`. Arm `HasResourceAttribute` (:353–360): `resource === undefined` → `MissingResource` **first**, then the action check. Arm `HasAction` (:383–388): `new MissingAction({ expected: policy.action })`. Five checks, three arms, five constructions. |
| C2 | …and again in `Predicate.ts` compile (~:400–420) as `NeedAction`. | **CONFIRMED** | `Predicate.ts` — `compileTree`'s `cases` (a `PolicyCases<Compiled>`): `HasAction` (:398–401), `HasAttribute` (:412–414), `HasResourceAttribute` (:419–421) each restate the action rule as a `NeedAction` plan node; `run`'s `NeedAction` arm (:594) is a sixth `new MissingAction(…)`. `HasAttribute`'s `referencesResource` refusal (:406–411) is the resource rule read the translator's way. |
| C3 | The resource-id rule is in `PortAccess.ts` (`requireResourceId` + inline copies). | **CONFIRMED, wider than stated** | `PortAccess.ts` — `requireResourceId` (:220–228) used by `askActedForResource` (:300) and `askSignature` (:444–446); `askRelationship` (:377–379) has an inline copy; the span projection `typeof rawResourceId === "string" ? rawResourceId : undefined` appears three times (:298, :374, :442). Also outside the review's list: `Resource.ts` — `resourceIdOf` (the *writer's* half, used by `Qadi.ts` and `@qadi/audit`), and a private copy in `packages/devtools/src/model/Remedies.ts` — `resourceIdOf` (:519). ADR-QD-077's table: "the span's question must be annotated before the resource-id requirement can abandon the call, so whichever function owns the span runs the precondition" — the *raising* cannot move out of the read. Ownership: D-51-a. |
| C4 | Raw `resource?.["id"]` extraction at `Walk.ts` ~:178, :202, :264. | **CONFIRMED** | `evaluateActed` (:178), `evaluateHasRelationship` (:202), `evaluateHasSignature` (:264). They are the port arms ARCH-46 rewrites; this plan does not touch them (§3). |
| C5 | `PortRemote.collectNames` (~:240) uses `Match.orElse(() => undefined)`, so a new port-reading leaf compiles and goes unserved. | **CONFIRMED (compile time)** | `PortRemote.ts` — `collectNames` (:241–249): five `Match.tag` arms then `Match.orElse` (:248). Not exhaustive: a seventeenth `Policy` tag compiles with no arm. |
| C6 | "A property test exists but only covers tags its generator knows." | **CHANGED — narrower gap** | The generator knows every tag by construction: `test/helpers.ts` — `policyBuilders` is typed `Record<P.Policy["_tag"], FastCheck.Arbitrary<P.Policy>>`, so a new tag is TS2741 there and gets sampled. The property (`PortRemote.test.ts`, "admits every question evaluate asks a port, for any generated policy") then fails for a new leaf asking an *existing* port — **probabilistically**: the probe shows each port reached in only 7–27 of 150 seeded runs. What it cannot see at all: a **sixth port** — the test records five named ports, and `servingFor`'s return literal (:217–223) names four plus a conditional `SignatureHistory`; `PortServing`'s members are optional, so a missing sixth member compiles. **Latent, not live**: today all five port-reading leaves (`HasAttribute`, `HasRelationship`, `HasActed`, `HasNotActed`, `HasCustom`, `HasSignature`) are collected. Severity low; T1 closes both halves test-first. |
| C7 | `PredicatePortName` (`PortMetrics.ts`) is a hand-written subset of the ports translation can reach. | **CONFIRMED** | `PortMetrics.ts` — `export type PredicatePortName = "AttributeResolver" \| "DecisionHistory"` (:171) and `PREDICATE_PORT_NAMES_BY_NAME` (:173–176). Its doc block (:144–152) is **orphaned**: it sits *above* `servedPortCallsTotal`'s doc (:153–163), so TypeScript attaches neither to `PredicatePortName` (D1 below). |
| C8 | `Predicate`'s refusal arms restate per leaf why it cannot fold. | **CONFIRMED, but the text is load-bearing** | `compileTree` — `history` (:373–384), `HasRelationship` (:434–435), `HasCustom` (:440–444), `HasSignature` (:450–454). Every reason string is pinned verbatim by `Predicate.test.ts` (:1660–1702) and quoted on the website (`apps/website/src/content/docs/docs/concepts/predicates.md` :74–78) and in `spec/behaviors/16-predicates.md` (:128–129). The *why* is prose with two different sentences for the one fact "keyed by the row" (`HasRelationship` vs a resource-scoped `HasActed`), so it cannot be derived without changing user-visible text (§3). |
| C9 | `Explanation.RequirementKind` is one more per-leaf classification. | **REFUTED as a duplicate** | `Explanation.ts` — `RequirementKind` (:34–42) is a public, reader-facing category (8 words over 10 leaves: `attribute` covers both a port-asking and a port-free leaf; `history` covers two). It is already exhaustive through `explainCases: PolicyCases<Explanation>`. It does not state a precondition or a port and cannot be derived from them. Out of scope (§3). |
| C10 | Build it with `leafCases` / `PolicyCases` next to `Policy.ts` (ARCH-17, ADR-090). | **CONFIRMED they exist** | `Policy.ts` — `LeafPolicy` (:1164), `PolicyCases<R>` (:1185), `leafCases` (:1211), `foldPolicyCases` (:1272), and the private `matcherOf` (:1284). `leafCases` spreads one uniform function over all ten leaves, so it is the wrong tool for a table whose rows differ; `Pick<PolicyCases<R>, LeafTag>` (the leaf half of the case type) is the right one (spike). "Next to `Policy.ts`" is D-51-b: `Policy.ts` is `export *`-ed from the barrel, so anything exported there is public. |
| C11 | Madge cycle risk (`Policy.ts` ← `PortMetrics`?). | **CONFIRMED as a constraint** | `PortMetrics.ts` imports only `effect/*`. A table that imports `type { PortName }` from `PortMetrics.ts` is safe; `PortMetrics.ts` importing anything from the table is a cycle, **type-only included** (madge probe). So `PredicatePortName` cannot simply be redefined in `PortMetrics.ts` as derived from the table (D-51-c). |
| C12 | One matcher references at most one `ValueRef`. (Needed to keep error precedence.) | **CONFIRMED by the type** | `Matcher.ts` — `Matcher` (:79–91): `Eq`/`Neq`/`Dominates` carry one `ref`; `FieldMatch`/`SomeMatch`/`EveryMatch`/`Size` one inner matcher; the rest none. So a `HasAttribute` matcher cannot reference both `action()` and `resource(…)`, and its two checks' order is unobservable. Only `HasResourceAttribute` (own resource need + an action-referencing matcher) has an observable order: **resource first**. No test pins it (`grep` over `Evaluate.test.ts`: the "both absent" case does not exist) — T2 pins it before the refactor. |
| C13 | Per-node cost on the walk. | **CONFIRMED as a risk** | `walk` → `evaluateNode` runs per node. Today `referencesAction`/`referencesResource` run only for the two matcher leaves and only when the input is absent (short-circuit `&&`). ARCH-17 C7/N2 measured those walks at ≈14% of `matcher-heavy`. `Evaluate.bench.ts`'s `run` evaluates **with no action and no resource**, so every workload exercises the absent-input path — the worst case for any per-node check. T5 is bench-gated. |

**Small defects found while verifying** (all CONFIRMED by reading; none changes behaviour; T3):

- **D1** `PortMetrics.ts` — `PredicatePortName`'s doc block (:144–152) is detached; `PredicatePortName` (:171) has no doc and `servedPortCallsTotal` has two stacked blocks.
- **D2** `Matcher.ts` — `referencesResource`'s doc (:645–653) says it is "Asked by the predicate translator rather than the evaluator"; `Walk.ts`'s `HasAttribute` arm (:342) asks it.
- **D3** `Errors.ts` — `MissingResourceId`'s doc (:97–104) says it is raised by `HasRelationship` and `HasActed`/`HasNotActed` under `scope: "resource"`: it omits `HasSignature` (raised at `PortAccess.ts` :445) and spells the scope literal in lower case (`HistoryScope` is `"Resource" | "Any"`); its field doc ("The relation or event") omits a signature's meaning.
- **D4** `spec/behaviors/10-actions.md` — BEH-QD-076's ` ```ts ` fence shows `MissingAction extends Data.TaggedError` with `expected: string | undefined`; the class is a `Schema.TaggedError` with `expected: Schema.optional(Schema.String)` (AGENTS.md §4 table, ADR-QD-060). Not compiled (` ```ts `), so no gate caught it.
- **Not fixed here, recorded:** `portCallsTotal`'s description names "Predicate.ts's translateNode", which no longer exists (`compileTree`/`run`); the description is part of the registry key (ADR-QD-052), so rewording it re-keys the series — ARCH-56's call. And `MissingResource.attribute` for a `HasAttribute` whose matcher references `resource("requiredOp")` names the *subject* attribute (`"op"`, pinned by `Evaluate.test.ts` :279–281), not the resource path that was missing — a diagnostic inaccuracy, offered to ARCH-57.

## 2. Goal and success criteria

Today five modules each restate, per leaf, a fact that belongs to the leaf: what it needs from the request (an action,
a resource, a resource id), which port it asks and under what name, and whether translation can fold it. `Walk.ts` and
`Predicate.ts` restate the request needs; `PortRemote.collectNames` restates the port-and-name facts behind a
non-exhaustive `Match.orElse`; `PredicatePortName` restates which ports translation reaches. The deepening is one
package-private **module**, `LeafNeeds.ts`, whose **interface** is a handful of pure functions over a `Policy` node —
`missingResource`, `missingAction`, `readsResource`, `isResourceKeyed`, `portAskOf`, `resourceAttribute` — plus the
derived type `TranslatedPortName`. Its **implementation** hides one static per-leaf table and the per-node arms, all
exhaustive by tag. Both interpreters and `servingFor` become **adapters** that consult it: **leverage** (a new leaf is
a compile error in one module, and every consumer follows) and **locality** (a precondition rule, its error fields and
its precedence change in one place). It holds **facts only**: what the evaluator does with a missing action (fail on
reach) and what the translator does with it (a `NeedAction` plan node that fails on reach) stay in each interpreter,
so ADR-QD-024's two interpreters stay two. The seam to the port reads is unchanged: whether a resource id is present is
still checked inside the read that owns the span (ADR-QD-077); this module only states which leaves key their question
by it.

Success criteria:

1. `git grep -nE "new (MissingAction|MissingResource)\(" -- 'packages/*/src'` lists only `packages/core/src/LeafNeeds.ts`
   (and, if D-51-e = A, `node scripts/check-house-style.mjs` fails on any other site).
2. `git grep -n "referencesAction\|referencesResource" -- packages/core/src/Walk.ts packages/core/src/Predicate.ts` is empty.
3. `git grep -n "Match.orElse\|collectNames" -- packages/core/src/PortRemote.ts` is empty; `servingFor` reads `portAskOf`,
   and its per-port builder is typed `{ readonly [K in PortName]: … }` (a sixth `PortName` is TS2741 there).
4. `LeafNeeds.test.ts` holds one exhaustive matrix — every leaf tag (fixture typed
   `{ readonly [T in LeafPolicy["_tag"]]: ReadonlyArray<…> }`, so a new leaf is TS2741 in the test too) × every request
   shape — asserting `evaluate`'s and `toPredicate`'s precondition failures, `MissingResourceId`, the ports `evaluate`
   asks, and `servingFor`'s admission against the module's facts. The individual `Evaluate.test.ts`/`Predicate.test.ts`
   cases it subsumes are deleted (§7).
5. `pnpm test:tstyche` passes `LeafNeeds.tst.ts`: `TranslatedPortName` is exactly `PredicatePortName`; the table's keys
   are exactly `LeafPolicy["_tag"]`; `PortAsk["port"]` is `PortName`.
6. `SWITCH_BUDGET` and `UNTRACED_BUDGET` in `scripts/check-house-style.mjs` are unchanged; `pnpm circular` is clean.
7. `pnpm vitest bench --run packages/core/bench/Evaluate.bench.ts`, interleaved A/B per ADR-QD-090's method, shows every
   workload within run-to-run noise (D-51-d's gate) — or Walk takes D-51-d's fallback shape.
8. Every `PolicyNotTranslatable.reason` string and every denial reason is byte-identical (the existing pins in
   `Predicate.test.ts` :1660–1702 and `Evaluate.test.ts` pass unedited).
9. `pnpm check` passes.

## 3. Non-goals

- **The resource-id rule's raising and its span projection** (`requireResourceId`, `askRelationship`'s inline copy, the
  three `typeof … === "string"` projections) and the raw `resource?.["id"]` extraction in Walk's port arms — ARCH-46's
  (D-51-a). This plan states only *which leaves are resource-keyed* (`isResourceKeyed`). T10 is the fallback if ARCH-46
  does not take it.
- **Translation's refusal prose.** The reason strings are pinned verbatim in tests, the website and the spec (C8). The
  table carries the closed *fact* (`translation` words); the sentences stay per arm in `compileTree`.
- **`Explanation.RequirementKind`** — a public reader-facing category, already exhaustive through `PolicyCases` (C9).
- **Moving `PredicatePortName`** or `predicatePortCallsTotal` — ARCH-56 owns where metrics are declared; this plan
  checks the hand-written type against the table (D-51-c).
- **`countFor`'s parameter type in `PortAccess.ts`** — ARCH-46 territory.
- **Translating `hasSignature(…, { scope: "Any" })`.** The table will show it is the one port leaf that is not
  resource-keyed yet refuses to fold (INV-QD-056); changing that is a behaviour change, offered as a follow-up.
- **`MissingResource.attribute` naming the subject attribute** for a resource-referencing `HasAttribute` matcher, and
  devtools' private `resourceIdOf` copy — recorded in §1, offered to ARCH-57.
- **Exporting the table.** `@qadi/devtools` (ARCH-48's fixtures) cannot import it; it stays package-private (ADR-QD-099).
- **Memoising `referencesAction`/`referencesResource`** — measured and dropped in ARCH-17 (D-17 leaf fast path).
- **Static (admission-time) `MissingAction`** — rejected by ADR-QD-077 ("Raise `MissingAction` statically") and would
  break INV-QD-011's on-reach semantics; `Admission.ts` is not extended.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 | `LeafNeeds.ts` imports `effect/Match` as a namespace; relative `.ts` imports; `import type` for `Policy`, `PolicyCases`, `LeafPolicy`, `PortName`, `Resource`. |
| AGENTS.md §4, ADR-QD-060, `SCHEMA_ERROR_BUDGET` | No error class changes. `MissingAction`/`MissingResource` stay `Schema.TaggedError`; only *where* they are constructed moves. `Effect.orDie` nowhere. |
| AGENTS.md §5, ADR-QD-073, `UNTRACED_BUDGET` | The new functions are pure and synchronous, not `Effect.fn`. No `Effect.fnUntraced` added or removed; `Walk.ts: 3` stays. |
| AGENTS.md §5a, ADR-QD-034, `SWITCH_BUDGET` | `evaluateNode`'s `switch` stays (budget `Walk.ts: 1`). The table's per-node arms are hoisted `Match.type<Policy>().pipe(Match.tagsExhaustive(…))` returning **values, not closures**, built once at module scope. No `switch` in `LeafNeeds.ts`. |
| AGENTS.md §6 | No `as` beyond `as const` (house style excepts it, `check-house-style.mjs` :150); `satisfies` for the static table (spike compiles). No `Record<string, unknown>` widening (memory). |
| AGENTS.md §9, ADR-QD-099 | `LeafNeeds.ts` is not added to `packages/core/src/index.ts`; no `spec/overview.md` row (gate 13, `node scripts/check-api-surface.mjs`, is unaffected — verify). If ARCH-55's named-export barrel has landed, add it to that barrel's exclusion list, not its exports. |
| AGENTS.md §11 | INV-QD-011's Source/Enforcement, BEH-QD-076, BEH-QD-036, BEH-QD-331/34-remote-ports and the traceability matrix change in the same PR (§8). |
| ADR-QD-024 | Facts, never verdicts. The table never returns allow/deny or a plan node; each interpreter maps a fact to its own outcome. |
| ADR-QD-077 | `MissingAction` stays on reach in both interpreters (Walk fails at the node; `toPredicate` plans `NeedAction` and fails when `run` reaches it). `MissingResourceId` stays raised inside `PortAccess.ts`'s reads, after the span annotation. |
| ADR-QD-090 | No new tree traversal: `servingFor` keeps `foldPolicy`; the table is consulted per node by existing walks. `Policy.ts`'s structural facts are not moved. |
| ADR-QD-100 / ARCH-41 | `admit` is unchanged; the `admission-once` house-style rule is unaffected. |
| ADR-QD-079, ADR-QD-091 | `Predicate`, `evaluatePredicate`, `toRenderable`, `Compare.ts`, `judgeMatcher` untouched. |
| ADR-QD-037 (madge, type-only cycles count) | `LeafNeeds.ts` imports `Errors.ts`, `Matcher.ts`, `type Policy.ts`, `type PortMetrics.ts`, `type Resource.ts` — none reaches its importers (probe). `PortMetrics.ts` must not import `LeafNeeds.ts`. |
| ADR-QD-025/076 (Stryker, no ignore list) | `stryker.config.mjs` mutates `packages/core/src/**/*.ts`, so `LeafNeeds.ts` is mutated automatically; every arm must be killed by the matrix. Walk's `HasResourceAttribute` arm must not keep an unreachable `resource === undefined` branch (an equivalent mutant) — hence the total `resourceAttribute` helper. |
| Merge gate = `pnpm check` | One new house-style rule at most (inside `pnpm lint`); no new gate step, so `spec/process/definitions-of-done.md` is unchanged. |

## 5. Decisions needed before work starts

### D-51-a — Who owns the resource-id rule: ARCH-46 or ARCH-51?

The rule has three parts: (1) *which leaves* key their port question by the resource id (`HasRelationship` always;
`HasActed`/`HasNotActed`/`HasSignature` at `scope: "Resource"`); (2) *raising* `MissingResourceId` when the id is not a
string, inside the read, after the span annotation (ADR-QD-077); (3) the span's `qadi.resource_id` projection.

- **A — split by kind (recommended).** ARCH-51 owns (1) as `isResourceKeyed(node)`, consumed by `compileTree`'s history
  refusal and by the matrix test. ARCH-46 owns (2) and (3) — it is rewriting the reads behind the port description, and
  the precondition must run where the span is opened. ARCH-51 does not edit `PortAccess.ts`. Conflict surface: none.
- **B — ARCH-51 owns all three.** Folds `askRelationship`'s inline copy into `requireResourceId` and the three
  projections into one helper. Collides head-on with ARCH-46's edits to the same functions.
- **C — ARCH-46 owns all three**, including the per-leaf fact. Then `isResourceKeyed` would live on the port
  description, which knows ports, not leaves — the scope is a leaf's field, not a port's.

Recommendation **A**; if ARCH-46 is dropped or deferred, T10 performs (2)–(3)'s small consolidation here.
`status: open`

### D-51-b — Where does the table live?

- **A — a new package-private module `packages/core/src/LeafNeeds.ts` (recommended).** Out of the barrel (ADR-QD-099),
  like `Admission.ts` and `PortAccess.ts`. Its facts are about the *question* (request inputs, ports), not the ADT's
  shape, so ADR-QD-090's "`Policy.ts` owns the structural facts" is not stretched. Interface ≈ 6 functions and one type
  over one hidden table: deep enough not to be one of ARCH-55's shallow-module targets.
- **B — `Policy.ts`, beside `childrenOf`/`fieldsOf`/`matcherOf`.** Best locality with the ADT, and could reuse the
  private `matcherOf`. But `Policy.ts` is `export *`-ed, so every function becomes public API (gate 13 rows, a semver
  commitment) — unless ARCH-55's named-export barrel lands first. It would also make `Policy.ts` import `Errors.ts`,
  `PortMetrics.ts` and `Matcher.ts`'s `references*` (no cycle by the probe, but a much wider dependency surface for the
  most-imported module in core).
- **C — `Admission.ts`.** Rejected: admission is a pre-walk proof; leaf needs are on reach (INV-QD-011, ADR-QD-077's
  rejected "raise `MissingAction` statically"). Conflating the two would invite exactly that static check.

Recommendation **A**. If ARCH-55 has landed with a named barrel when this starts, B becomes viable; still prefer A for
the dependency-surface reason. `status: open`

### D-51-c — `PredicatePortName`: derived, checked, or dropped?

- **A — checked, not moved (recommended).** `LeafNeeds.ts` derives `TranslatedPortName` from its static table (ports
  of the leaves whose `translation` may be `"AskPort"`). `PredicatePortName` stays hand-written in `PortMetrics.ts`, and
  `LeafNeeds.tst.ts` asserts `expect<TranslatedPortName>().type.toBe<PredicatePortName>()`. Because
  `PREDICATE_PORT_NAMES` is `Record.keys` of a `Record<PredicatePortName, true>`, the type equality implies the runtime
  preregistered words. No cycle, no conflict with ARCH-55/56. Cost: the type is still written twice; drift fails
  `pnpm test:tstyche` rather than `pnpm typecheck`.
- **B — derived and moved.** Define `PredicatePortName` as `TranslatedPortName` and preregister
  `predicatePortCallsTotal` from the table. Requires `PortMetrics.ts` to import `LeafNeeds.ts`, which imports
  `PortName` from `PortMetrics.ts` — a type-only cycle madge rejects (probe). Needs `PortName` to move to a lower module
  or the metric to move up: both are ARCH-55/ARCH-56's ground.
- **C — dropped.** Preregister all five ports on `predicatePortCallsTotal` (as `servedPortCallsTotal` does) and delete
  `PredicatePortName`. Breaking (an exported type disappears; devtools' `Wiring.ts` translated counts gain three zero
  rows) and loses the type that keeps a translation read of a non-translating port a compile error in `PortAccess.ts`.

Recommendation **A** now; record in ARCH-56's §9 that B is unblocked once 56 settles `PortName`'s and the metric's
homes. `status: open`

### D-51-d — How does `Walk.ts` consult the table?

Both shapes call the same interface (`missingResource`, `missingAction`, `resourceAttribute`); only the call site differs.

- **A — one generic pre-check at the top of `evaluateNode` (recommended, bench-gated).** After the depth guard:
  `const missing = missingResource(policy, resource) ?? missingAction(policy, action); if (missing !== undefined) return Effect.fail(missing);`.
  Each function returns `undefined` immediately when its input is present (no dispatch), so a request carrying both an
  action and a resource pays two comparisons per node. With an input absent, every node pays one hoisted `Match`
  dispatch whose arms return values (no closure, no allocation unless an error is built). No leaf arm restates a need;
  a new leaf that needs the request needs **no** Walk edit. `HasResourceAttribute` reads through the total
  `resourceAttribute(resource, attribute)` (own-property read, `undefined` for an absent resource), so Walk keeps no
  unreachable branch.
- **B — per-arm calls.** Only the arms that can be short (`HasAttribute`, `HasResourceAttribute`, `HasAction`) call
  `missingResource`/`missingAction`. Per-node cost identical to today. A new leaf that needs the request but whose arm
  forgets the call compiles; the matrix test (typed over every leaf tag) catches it.

Gate for A: `Evaluate.bench.ts`, interleaved A/B (four runs each, medians, ADR-QD-090's method — absolute throughput
moves ≈30% between runs, AGENTS.md §5a); every workload within the baseline's run-to-run spread, with particular
attention to `one node`, `deep`, `wrapper-heavy` and `matcher-heavy` (the bench supplies no action and no resource, so
this is the worst case). Fail → B. Recommendation **A if it passes, else B**. `status: open`

### D-51-e — Is the single construction site gated?

- **A — yes (recommended).** A `leaf-needs-once` rule in `scripts/check-house-style.mjs`, modelled on
  `admission-once` (`ADMISSION_ALLOWED`): `new MissingAction(` / `new MissingResource(` in `packages/*/src` only in
  `packages/core/src/LeafNeeds.ts`, with its exact count, checked in both directions. Without it, the next leaf arm can
  quietly build its own.
- **B — convention plus the matrix test.** Cheaper, but the matrix only proves *what* is raised, not *where*.

Recommendation **A**. `status: open`

### D-51-f — Record it as a new ADR or as amendments?

- **A — a new ADR-QD-NEXT, "A leaf's request needs and the port it asks are stated once" (recommended)**, amending
  ADR-QD-077 (shared per-leaf facts beside shared reads; `MissingAction` on reach; construction in one module) and
  ADR-QD-107 (`servingFor` derived and exhaustive). Warranted because it adds a module, a house-style rule and a
  decision others will cite (ARCH-46, ARCH-56).
- **B — amendments only** to ADR-QD-077 and ADR-QD-107. Fewer documents; the rationale is split across two.

Recommendation **A**. `status: open`

## 6. Tasks

### T0 — Re-verify the evidence at the branch point
- **Status:** [x] done
- **Depends on:** —
- **Files:** none (read-only)
- **Steps:**
  1. Branch from `main`: `git switch -c arch-51-leaf-needs`. Record `git rev-parse --short HEAD`; `git status --short` must
     be empty (no emitted `*.d.ts` beside sources — a stray `tsc` emit was seen in `packages/*/src` during planning and
     would be swept by Stryker's `packages/core/src/**/*.ts` glob and madge's `--extensions ts`).
  2. Check whether ARCH-46, ARCH-55 or ARCH-56 have landed: `git log --oneline -20`, and
     `git grep -n "requireResourceId\|countFor\|PredicatePortName" -- packages/core/src`. If ARCH-46 moved the reads,
     re-read D-51-a; if ARCH-55 changed the barrel to named exports, re-read D-51-b; if ARCH-56 moved
     `predicatePortCallsTotal`, re-read D-51-c.
  3. Re-run every §1 claim by symbol, not line: `git grep -n "new MissingAction\|new MissingResource" -- packages/core/src`
     (expect 6 sites: Walk ×5, Predicate ×1); `git grep -n "Match.orElse" -- packages/core/src/PortRemote.ts` (1);
     `git grep -n "referencesAction\|referencesResource" -- packages/core/src/Walk.ts packages/core/src/Predicate.ts`.
  4. Re-run the probes if the scratchpad is gone: recreate `serving-coverage.ts` from §1's description and run
     `cd packages/core && npx tsx <path>`.
  5. Baseline: `pnpm vitest run packages/core/test/Evaluate.test.ts packages/core/test/Predicate.test.ts packages/core/test/PortRemote.test.ts`;
     and record a bench baseline now (four runs of `pnpm vitest bench --run packages/core/bench/Evaluate.bench.ts`, saved
     to the scratchpad) for T5.
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** every §1 row is re-tagged in §10 (CONFIRMED/CHANGED), and D-51-a…f still make sense against HEAD.

### T1 — Pin `servingFor` per leaf and per port, test-first; make `collectNames` exhaustive (ship-ahead patch)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/core/test/PortRemote.test.ts`; `packages/core/src/PortRemote.ts`
- **Steps:**
  1. In `PortRemote.test.ts`'s `describe("servingFor")`, add `const LEAVES: { readonly [T in LeafPolicy["_tag"]]: ReadonlyArray<P.Policy> }`
     with at least one fixture per leaf tag and both scopes where a leaf has one (`hasActed("x", { scope: "Any" })` and
     `"Resource"`, same for `hasNotActed`, `hasSignature`), a `hasAttribute` the subject does **not** carry (so the
     resolver is asked), and `hasCustom("n")`.
  2. Add `it.effect("admits every question evaluate asks, for every leaf tag", …)`: for each fixture, evaluate with five
     `recordingPort`s (the existing property's harness), `{ resource: { id: "doc-1" }, action: "read" }`, and assert every
     recorded name is admitted by `servingFor([fixture])` — deterministic, no sampling.
  3. Add a type-level guard that `servingFor` names every port: in a new block of `packages/core/test/Ports.tst.ts`
     (or a new `PortRemote.tst.ts`), assert the builder's key set equals `PortName` (after step 5 exists).
  4. Run: the per-leaf test passes today (no live bug). To prove it guards, temporarily delete the `HasCustom` arm of
     `collectNames` locally and watch the test fail; restore.
  5. In `PortRemote.ts`: replace `collectNames`'s `Match.tag … Match.orElse` with `Match.tagsExhaustive` over all 16
     tags (composites and the four port-free leaves → `undefined`). Replace `servingFor`'s return literal with a
     builder typed `{ readonly [K in PortName]: (names: ReadonlyArray<string>, asked: boolean) => PortServingOf<K> | undefined }`
     so a sixth `PortName` is TS2741; keep the observable shape exactly — four ports always present with sorted
     (possibly empty) allowlists, `SignatureHistory` present only when asked, **absent** (not `undefined`) otherwise
     (`"SignatureHistory" in servingFor([P.hasRole("a")])` is `false`, pinned).
- **Tests:** two new tests (per-leaf deterministic; type-level key set). Existing `servingFor` tests unedited.
- **Verify:** `pnpm vitest run packages/core/test/PortRemote.test.ts`; `pnpm typecheck`; `pnpm test:tstyche`;
  `node scripts/check-house-style.mjs`.
- **Done when:** `git grep -n "Match.orElse" -- packages/core/src/PortRemote.ts` is empty and both tests pass. Shippable
  alone as a `@qadi/core` patch (no behaviour change). T7 later replaces `collectNames` entirely.

### T2 — Characterise the request preconditions in one matrix, test-first (before any refactor)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/core/test/LeafNeeds.test.ts` (*new*); `packages/core/test/helpers.ts` (fixture table, if shared)
- **Steps:**
  1. Fixtures typed `{ readonly [T in LeafPolicy["_tag"]]: ReadonlyArray<P.Policy> }` (TS2741 for a new leaf), covering:
     `hasAction("read")`; `hasAttribute` with matchers `eq(action())`, `fieldMatch("f", eq(action()))` (nested — INV-QD-011's
     second path), `eq(resource("x"))`, `gte(3)`; `hasResourceAttribute` with `eq(literal("open"))`, `eq(action())`,
     `eq(resource("y"))`; every scope variant of `hasActed`/`hasNotActed`/`hasSignature`; `hasRelationship("owner")`;
     `hasCustom("n")`; `hasRole`; `hasPermission`.
  2. Request shapes: `action ∈ {absent, "read"}` × `resource ∈ {absent, { id: "doc-1", x: 1, y: 1 }, { x: 1 } (no id), { id: 7 } (non-string id)}`.
  3. For each fixture × shape, run `evaluate` with fail-closed ports (`portsLayer()` defaults) and record the outcome
     class: `Decision` | `MissingAction(expected)` | `MissingResource(attribute)` | `MissingResourceId(relation)` |
     other failure. Assert against an **expected table written in the test** from today's behaviour (characterisation).
     Include the precedence case C12: `hasResourceAttribute("s", eq(action()))` with neither input → `MissingResource { attribute: "s" }`.
  4. For each fixture × `action ∈ {absent, "read"}`, run `toPredicate` and record `Predicate` | `MissingAction(expected)` |
     `PolicyNotTranslatable(policyTag)`.
  5. Keep this file's expectations independent of `LeafNeeds.ts` for now; T4 re-expresses the expected column through
     the module's facts.
- **Tests:** the matrix (one `it.effect` per fixture tag, looping shapes, so a failure names the leaf).
- **Verify:** `pnpm vitest run packages/core/test/LeafNeeds.test.ts`.
- **Done when:** the matrix passes against unchanged source, and the C12 precedence case is in it.

### T3 — Fix the four documentation defects (D1–D4)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/core/src/PortMetrics.ts`; `packages/core/src/Matcher.ts`; `packages/core/src/Errors.ts`;
  `spec/behaviors/10-actions.md`
- **Steps:**
  1. D1: move the `PredicatePortName` doc block from above `servedPortCallsTotal` to directly above
     `export type PredicatePortName`. Do **not** touch any metric `description` string (registry keys, ADR-QD-052;
     `Ports.test.ts` pins them).
  2. D2: `referencesResource`'s doc — say both interpreters ask it: the evaluator to fail with `MissingResource` rather
     than deny (INV-QD-011's mirror), the translator to refuse a subject-side comparison against a column.
  3. D3: `MissingResourceId`'s doc — "Raised by `HasRelationship`, and by `HasActed`/`HasNotActed`/`HasSignature` under
     `scope: "Resource"`"; field doc "The relation, event or signature meaning the policy asked about". (After T4,
     point at `isResourceKeyed` instead of listing.) The field name `relation` stays — renaming a `SinkRecord`-crossing
     schema field is a wire break.
  4. D4: BEH-QD-076's fence → the real class (`Schema.TaggedError<MissingAction>()("MissingAction", { expected: Schema.optional(Schema.String) })`),
     keeping the fence ` ```ts `. Bump the document's revision and change history.
- **Tests:** none (comments and spec text).
- **Verify:** `pnpm typecheck`; `node scripts/check-house-style.mjs`; `pnpm spec:verify:strict`.
- **Done when:** the four texts read as above. Can ship with T1.

### T4 — Create `LeafNeeds.ts`, test-first
- **Status:** [x] done
- **Depends on:** T2, D-51-b (A assumed below), D-51-c
- **Files:** `packages/core/src/LeafNeeds.ts` (*new*); `packages/core/test/LeafNeeds.test.ts`; `packages/core/test/LeafNeeds.tst.ts` (*new*)
- **Steps:**
  1. Write the unit tests first (they fail: module missing):
     - `missingAction(node, "read")` is `undefined` for every fixture; `missingAction(node, undefined)` is
       `MissingAction { expected: "read" }` for `hasAction("read")`, `MissingAction {}` (no `expected` key) for an
       action-referencing matcher at any depth, `undefined` otherwise.
     - `missingResource(node, resource)` symmetric: `MissingResource { attribute }` for `hasResourceAttribute` always and
       for a resource-referencing `hasAttribute`; `undefined` when a resource is given.
     - `readsResource(node)`: `true` exactly for `hasResourceAttribute` and a resource-referencing matcher leaf.
     - `isResourceKeyed(node)`: `true` for `hasRelationship`, and for `hasActed`/`hasNotActed`/`hasSignature` at
       `scope: "Resource"`; `false` for `"Any"` and every other tag, composites included.
     - `portAskOf(node)`: `{ port: "AttributeResolver", name: attribute }`, `{ "RelationshipResolver", relation }`,
       `{ "DecisionHistory", event }` (both polarities), `{ "CustomPredicate", name }`,
       `{ "SignatureHistory", name: undefined }`; `undefined` for the four port-free leaves and all six composites.
     - `resourceAttribute(undefined, "a")` → `undefined`; `resourceAttribute({ a: 1 }, "a")` → `1`;
       `resourceAttribute({}, "toString")` → `undefined` (own-property only, the `Object.hasOwn` rule moved from Walk).
     - `LeafNeeds.tst.ts`: `expect<TranslatedPortName>().type.toBe<PredicatePortName>()`;
       `expect<keyof typeof LEAF_FACTS>().type.toBe<LeafPolicy["_tag"]>()`; `expect<PortAsk["port"]>().type.toBe<PortName>()`.
  2. Implement `LeafNeeds.ts` (package-private header comment in the house shape: one-line summary, then the why —
     ADR-QD-024 facts-not-verdicts, ADR-QD-077 on reach, ADR-QD-099 out of the barrel):
     - `LEAF_FACTS` — `as const satisfies { readonly [T in LeafTag]: { readonly port: PortName | undefined; readonly translation: ReadonlyArray<"Constant" | "AskPort" | "Column" | "Never"> } }`
       (rows: `HasPermission`/`HasRole`/`HasAction` → no port, `["Constant"]`; `HasAttribute` → `AttributeResolver`,
       `["AskPort","Never"]`; `HasResourceAttribute` → no port, `["Column","Never"]`; `HasRelationship` →
       `RelationshipResolver`, `["Never"]`; `HasActed`/`HasNotActed` → `DecisionHistory`, `["AskPort","Never"]`;
       `HasCustom` → `CustomPredicate`, `["Never"]`; `HasSignature` → `SignatureHistory`, `["Never"]`). Exported for the
       tests only (package-private module).
     - `TranslatedPortName` — the mapped-type derivation the spike compiled.
     - `portAskOf` — hoisted `Match.type<Policy>().pipe(Match.tagsExhaustive({…}))`; each port arm takes its `port`
       from `LEAF_FACTS[tag].port` (stated once) and its name from the node.
     - `whenNoAction`/`whenNoResource` — hoisted `Match.tagsExhaustive` arms **returning the error or `undefined`**
       (no closures); `missingAction = (node, action) => action === undefined ? whenNoAction(node) : undefined`, and
       `missingResource` likewise. These are the only `new MissingAction(`/`new MissingResource(` in `packages/*/src`
       once T5/T6 land.
     - `readsResource`, `isResourceKeyed` — hoisted `Match.tagsExhaustive` over the 16 tags, returning booleans.
     - `resourceAttribute(resource, attribute)` — total own-property read.
  3. Re-express T2's expected column through the module where that is the fact under test (e.g. "`evaluate` fails
     with exactly `missingResource(node, r) ?? missingAction(node, a)` when that is defined"), keeping literal
     expectations for the precedence case and for `expected`/`attribute` fields so the test does not become circular.
     Add: "every port `evaluate` asked for a fixture is `portAskOf(fixture).port`" and "`toPredicate`'s outcome class is
     in `LEAF_FACTS[tag].translation`" (`Predicate` with an asked port ⇒ `"AskPort"`, a `Compare`/`MemberOf` column ⇒
     `"Column"`, a constant ⇒ `"Constant"`, `PolicyNotTranslatable` ⇒ `"Never"`).
- **Tests:** as in step 1; T2's matrix extended per step 3.
- **Verify:** `pnpm vitest run packages/core/test/LeafNeeds.test.ts`; `pnpm test:tstyche`; `pnpm typecheck`;
  `pnpm circular`; `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs` (unchanged — the module is
  not in the barrel).
- **Done when:** all pass; `git grep -n "LeafNeeds" -- packages/core/src/index.ts` is empty.

### T5 — `Walk.ts` consults `LeafNeeds.ts` (D-51-d)
- **Status:** [x] done
- **Depends on:** T4, D-51-d
- **Files:** `packages/core/src/Walk.ts`
- **Steps:**
  1. Shape A: in `evaluateNode`, after `if (depth > maxDepth) …`, add the generic pre-check
     (`missingResource(policy, resource) ?? missingAction(policy, action)` → `Effect.fail`). Resource first: that is the
     only observable precedence (C12) and T2 pins it.
  2. Delete the inline checks from the `HasAttribute`, `HasResourceAttribute` and `HasAction` arms. `HasResourceAttribute`
     reads `resourceAttribute(resource, policy.attribute)`; move the `Object.hasOwn` comment to the helper.
     `HasAction` compares `action === policy.action` (its deny sentence is unchanged; `action` is defined on that path).
  3. Drop the `MissingAction`, `MissingResource`, `referencesAction`, `referencesResource` imports. Update
     `evaluateNode`'s doc to say where request needs are checked and why at the node (on reach, INV-QD-011).
  4. Bench (the gate): alternate four runs of `pnpm vitest bench --run packages/core/bench/Evaluate.bench.ts` on this
     branch with four on T0's baseline (`git stash`/worktree), record medians of ops/s per workload in the PR
     description (not in code, ADR-QD-034's habit). Pass: every workload inside the baseline's run-to-run spread. Fail:
     switch to shape B (the same three arms call `missingResource`/`missingAction`; the top-of-node check goes) and
     re-bench to confirm parity.
  5. `switch (policy._tag)` stays; `SWITCH_BUDGET` and `UNTRACED_BUDGET` untouched.
- **Tests:** none new; T2/T4's matrix, `Evaluate.test.ts`, `RolesAndDepth.test.ts`, `Rules.test.ts`,
  `DecisionAgreement.test.ts` must pass unedited apart from §7's deletions.
- **Verify:** `pnpm vitest run packages/core/test`; `pnpm typecheck`; `node scripts/check-house-style.mjs`;
  `git grep -n "referencesAction\|referencesResource\|new Missing" -- packages/core/src/Walk.ts` (empty).
- **Done when:** tests green, bench recorded and within noise (or shape B taken), D-51-d marked decided with the numbers.

### T6 — `Predicate.ts` consults `LeafNeeds.ts`
- **Status:** [x] done
- **Depends on:** T4
- **Files:** `packages/core/src/Predicate.ts`
- **Steps:**
  1. `Plan`'s `NeedAction` variant becomes `{ readonly _tag: "NeedAction"; readonly missing: MissingAction }`;
     `run`'s arm is `Effect.fail(p.missing)` — the error is built by `missingAction` at compile and raised on reach,
     unchanged in timing (ADR-QD-077, BEH-QD-266).
  2. `HasAction`: `const missing = missingAction(p, action)` → `NeedAction` or `Constant(action === p.action)`.
     `HasAttribute`: `if (readsResource(p)) return refused(…same text…)`, then `missingAction` → `NeedAction`, else
     `AskAttribute`. `HasResourceAttribute`: `missingAction` → `NeedAction`, else column/refusal as today.
     (`toPredicate`'s question has no resource by design, so `missingResource` is never consulted here.)
  3. `history`: `isResourceKeyed(p) ? refused(…same text…) : planned(AskActed)`.
  4. Drop the `referencesAction`/`referencesResource` imports and the `MissingAction` value import (keep `import type`
     if `RunError` needs it).
  5. Every refusal string byte-identical.
- **Tests:** none new; `Predicate.test.ts` (including the reason table and the on-reach `MissingAction` test) and the
  agreement properties pass; the T4 matrix's translation column passes.
- **Verify:** `pnpm vitest run packages/core/test/Predicate.test.ts packages/core/test/LeafNeeds.test.ts packages/core/test/DecisionAgreement.test.ts`;
  `git grep -n "referencesAction\|referencesResource\|new MissingAction" -- packages/core/src/Predicate.ts` (empty).
- **Done when:** green, and the predicate companion packages' tests still pass
  (`pnpm vitest run packages/predicate-sql packages/predicate-prisma`).

### T7 — `servingFor` derived from `portAskOf`
- **Status:** [x] done
- **Depends on:** T1, T4
- **Files:** `packages/core/src/PortRemote.ts`
- **Steps:**
  1. Replace `collectNames` and the `Collector` interface with a fold that records `portAskOf(node)` into a per-port
     name set (`{ readonly [K in PortName]: Set<string> }` plus an "asked" flag per port), then T1's closed builder.
  2. Update `servingFor`'s doc: the names come from the leaf table; a new leaf is a compile error there, a new port is a
     compile error in the builder; the property pins agreement with what `evaluate` actually asks.
- **Tests:** T1's per-leaf test and the existing property, unedited.
- **Verify:** `pnpm vitest run packages/core/test/PortRemote.test.ts packages/core/test/LeafNeeds.test.ts`;
  `pnpm vitest run packages/http` (the port routes consume `servingFor`).
- **Done when:** `git grep -n "collectNames\|Match.orElse" -- packages/core/src/PortRemote.ts` is empty.

### T8 — `PredicatePortName` checked against the table (D-51-c)
- **Status:** [x] done
- **Depends on:** T4, D-51-c
- **Files:** `packages/core/src/PortMetrics.ts` (doc only); `packages/core/test/LeafNeeds.tst.ts`
- **Steps:**
  1. D-51-c = A: the `.tst.ts` assertion from T4 is the check; `PredicatePortName`'s doc (moved in T3) gains one sentence:
     "Checked against the leaf table (`LeafNeeds.ts`'s `TranslatedPortName`) by `LeafNeeds.tst.ts`; it cannot be
     derived here without an import cycle (ADR-QD-037)."
  2. D-51-c = B or C: stop and re-plan with ARCH-56 (the metric's home), then implement there.
- **Tests:** the tstyche assertion; prove it bites by adding `"SignatureHistory"` to `LEAF_FACTS.HasSignature.translation`
  locally and watching `pnpm test:tstyche` fail; revert.
- **Verify:** `pnpm test:tstyche`; `pnpm circular`.
- **Done when:** the assertion is green and demonstrated to fail on drift.

### T9 — Gate the single construction site (D-51-e = A)
- **Status:** [x] done
- **Depends on:** T5, T6, D-51-e
- **Files:** `scripts/check-house-style.mjs`
- **Steps:**
  1. Beside `ADMISSION_ALLOWED`, add `LEAF_NEEDS_ALLOWED = { "packages/core/src/LeafNeeds.ts": <exact count> }` and a
     scan of `packages/*/src` for `/\bnew (MissingAction|MissingResource)\s*\(/` (not `MissingResourceId`, which ARCH-46
     owns). Report `[leaf-needs-once] new MissingAction/MissingResource outside LeafNeeds.ts — ask missingAction/missingResource (INV-QD-011)`;
     check the count in both directions like the other budgets.
  2. Prove it: add a stray `new MissingAction({})` to `Walk.ts` locally → the script fails; revert.
- **Tests:** the script itself (as the other rules are tested — by running it).
- **Verify:** `node scripts/check-house-style.mjs`; `pnpm lint`.
- **Done when:** the rule passes on the branch and fails on the probe.

### T10 — Fallback: consolidate the resource-id reader half (only if D-51-a = B, or ARCH-46 is dropped)
- **Status:** [x] done
- **Depends on:** T0, D-51-a
- **Files:** `packages/core/src/PortAccess.ts`; `packages/core/test/PortAccess.test.ts`
- **Steps:**
  1. `askRelationship`: replace the inline `typeof rawResourceId !== "string"` check with `requireResourceId(rawResourceId, relation)`
     (the span annotation stays **before** it, BEH-QD-227). Note the extra `qadi.requireScopedResourceId` child span this
     adds under `qadi.hasRelationship` — check `PortSpan.test.ts`/devtools' span decoder tolerate it, or inline a
     non-`Effect.fn` variant to keep the span tree identical.
  2. One `spanResourceId(raw: unknown): string | undefined` for the three projections.
- **Tests:** `PortAccess.test.ts`/`PortSpan.test.ts` span-shape tests unedited; the T4 matrix's `MissingResourceId` column.
- **Verify:** `pnpm vitest run packages/core/test/PortAccess.test.ts packages/core/test/PortSpan.test.ts packages/devtools`.
- **Done when:** one check, one projection; span trees unchanged (or the change is recorded in BEH-QD-227). Skip this
  task entirely when ARCH-46 owns it.

### T11 — Spec, ADR, CCR, traceability, changeset
- **Status:** [x] done
- **Depends on:** T5–T9, D-51-f
- **Files:** `spec/decisions/NNN-a-leafs-needs-are-stated-once.md` (*new*, ADR-QD-NEXT); `spec/decisions/index.yaml`;
  `spec/decisions/077-both-interpreters-read-ports-through-one-module.md`; `spec/decisions/107-a-port-is-answered-remotely-through-its-description.md`;
  `spec/invariants.md`; `spec/behaviors/05-evaluator.md`; `spec/behaviors/10-actions.md`; `spec/behaviors/16-predicates.md`;
  `spec/behaviors/34-remote-ports.md`; `spec/traceability.md`; `spec/README.md`; `.changeset/arch-51-leaf-needs.md` (*new*)
- **Steps:** as listed in §8, with `ADR-QD-NEXT`/`CCR-QD-NEXT` resolved to real numbers at merge time.
- **Tests:** none.
- **Verify:** `pnpm spec:verify:strict`; `pnpm spec:gates`; `pnpm spec:examples`; `pnpm spec:api`.
- **Done when:** every gate passes and the CCR row names every document touched with its new revision.

### T12 — Full gate and close-out
- **Status:** [x] done
- **Depends on:** T1–T11
- **Files:** this plan (§10), `.planning/architecture/README.md` (wave-5 row)
- **Steps:**
  1. `pnpm check` (includes `pnpm mutation`; read any `LeafNeeds.ts` survivor — each is a missing matrix row, not a
     number to accept).
  2. Record the bench medians, the D-statuses and the final construction-site count in §10.
- **Tests:** —
- **Verify:** `pnpm check`.
- **Done when:** green; `status: done`.

## 7. Test strategy

**New, and the one place the facts are tested:** `packages/core/test/LeafNeeds.test.ts` — the T2/T4 matrix (every leaf
tag × every request shape, through `evaluate`, `toPredicate`, recording ports and `servingFor`) plus unit tests of each
function; `packages/core/test/LeafNeeds.tst.ts` — the type-level equalities. Both fixture tables are typed over
`LeafPolicy["_tag"]`, so a new leaf is TS2741 in the tests as well as in the module.

**Moved into the matrix and deleted from their files (replace, don't layer)** — each is a single cell of the matrix:

- `Evaluate.test.ts`: "a HasAttribute matcher referencing the resource fails, rather than denies, without one";
  "HasResourceAttribute fails when no resource is in context"; "a matcher referencing action() without one fails rather
  than denying"; "the same rule holds for a subject attribute matcher".
- `Predicate.test.ts`: the `MissingAction` cases around :420–436 ("HasAction's MissingAction carries the action it
  named" and its sibling), once the matrix's translation column asserts `expected`.

**Kept unchanged** (they pin something the matrix does not): the positive halves ("…allows once one is supplied"), the
`MissingResourceId` tests that assert span contents (`Evaluate.test.ts` :491–503, :638–648, :1862, :3097 — they test
the read's span, ARCH-46's ground), `Predicate.test.ts`'s on-reach test (:1640, a `NeedAction` behind a decisive
constant is never raised), the refusal-reason table (:1660–1702), the walk-equality and agreement properties
(`DecisionAgreement.test.ts`, INV-QD-018), `RolesAndDepth.test.ts` (INV-QD-037), and `PortRemote.test.ts`'s `servingFor`
property (it samples whole trees; the new per-leaf test is deterministic per leaf — complementary, not a duplicate).

**Property / differential.** The servingFor property keeps its seed; the matrix makes its per-leaf half deterministic.
The INV-QD-018 differential (evaluate vs translate) is untouched and must stay green — it is what proves T6 changed no
answer.

**Mutation.** `LeafNeeds.ts` falls under `stryker.config.mjs`'s `packages/core/src/**/*.ts`. Every arm of
`whenNoAction`/`whenNoResource`/`readsResource`/`isResourceKeyed`/`portAskOf` and every `LEAF_FACTS` row (via the
translation-class assertion and the tstyche equality) has a killing cell. Walk loses five conditionals and their
mutants; the `resourceAttribute` helper's `undefined` branch is killed by its own unit test, not left unreachable in
Walk.

**Bench.** `Evaluate.bench.ts`, interleaved A/B (T5). No new bench workload: the existing ones already run with no
action and no resource, which is the path the pre-check adds work to.

## 8. Spec and documentation updates

- **ADR-QD-NEXT** (D-51-f = A), "A leaf's request needs and the port it asks are stated once": Context (§1's C1–C8, the
  probe numbers), Decision (the module, its interface, facts-not-verdicts, on-reach, the resource-id split of D-51-a,
  `PredicatePortName` checked per D-51-c, the house-style rule), Measured (T5's medians), Alternatives (B/C of each
  decision). `index.yaml` row: `status: "Accepted — amends ADR-QD-077, ADR-QD-107"`.
- **ADR-QD-077**: amendment paragraph — per-leaf needs are shared knowledge beside the shared reads; `MissingAction`
  raised on reach in both interpreters, built in `LeafNeeds.ts`; `MissingResourceId` stays in the read.
- **ADR-QD-107**: amendment — `servingFor` is derived from the leaf table and exhaustive over leaves and ports.
- **`spec/invariants.md`** — INV-QD-011: Source names `LeafNeeds.ts` (`missingAction`, `missingResource`) and the
  `leaf-needs-once` rule; Enforcement names the matrix (both paths: the leaf and a nested `action()`). INV-QD-058/018:
  no change of statement; re-check their Source lines still name real symbols (`NeedAction` now carries the error).
  Change-history row.
- **`spec/behaviors/05-evaluator.md`** BEH-QD-036 — one sentence: which leaves need a resource or a resource id is
  stated in one module, and both are wiring errors raised on reach.
- **`spec/behaviors/10-actions.md`** BEH-QD-076 — the fence fix from T3 (D4); "`referencesAction` is the guard" →
  "`missingAction` is the guard (through `referencesAction`)".
- **`spec/behaviors/16-predicates.md`** BEH-QD-123's per-leaf table (:120–130) — a note that the leaf table's
  `translation` facts and this table agree, and the matrix test checks it.
- **`spec/behaviors/34-remote-ports.md`** BEH-QD-331 — `servingFor` derived from the leaf table; a new leaf or port is
  a compile error.
- **`spec/traceability.md`** — new rows: `packages/core/test/LeafNeeds.test.ts` → BEH-QD-036, BEH-QD-076, BEH-QD-123,
  BEH-QD-331, INV-QD-011, INV-QD-018; `packages/core/test/LeafNeeds.tst.ts` → INV-QD-011, BEH-QD-331. Edit the
  `Evaluate.test.ts`/`Predicate.test.ts` rows if they named the deleted cases.
- **`spec/README.md`** — CCR-QD-NEXT in the Document history register: documents touched with revisions, the six
  decisions, "no public API change".
- **`spec/overview.md`** — no row added or removed (the module is package-private); the `PredicatePortName` row may
  gain "checked against the leaf table". Gate 13 must stay green.
- **Website (`apps/website`)** — no change: no public API or behaviour moves; `concepts/predicates.md` and
  `concepts/services-resolvers.md` stay true (verify by grep for `servingFor` and the refusal sentences).
- **Changeset** `.changeset/arch-51-leaf-needs.md`: `"@qadi/core": patch` — "Internal: each policy leaf's request
  needs and port are stated once; `servingFor` is exhaustive over leaves and ports. No API or behaviour change."
  Not breaking. **Releasing needs the user's explicit go-ahead** (standing instruction); do not merge a version PR.
- **AGENTS.md** — no change required (the new rule follows the `admission-once` precedent, which AGENTS.md also does not
  list); if the maintainers want it listed, it belongs beside §5a's budgets.

## 9. Risks and rollback

| Risk | How it shows up | Mitigation / rollback |
| ---- | --------------- | --------------------- |
| Per-node cost of the generic pre-check (D-51-d A) | `Evaluate.bench.ts` medians outside noise, most likely `one node`/`wrapper-heavy` | Shape B is a mechanical edit of T5 (three call sites, same interface). |
| Precedence change when both inputs are absent | T2's C12 cell fails (`MissingAction` instead of `MissingResource`) | Resource-before-action order in the pre-check; T2 is written before the refactor. |
| `NeedAction` carrying a pre-built error changes on-reach behaviour | `Predicate.test.ts`'s on-reach test (:1640) or the agreement properties fail | The error is only *built* at compile; it is *raised* by `run`. Revert step 1 of T6 to carry `expected` only. |
| A refusal sentence drifts | `Predicate.test.ts` :1660–1702 fail | Text stays in the arms by design (§3). |
| Collision with ARCH-46 in `Walk.ts` | Merge conflicts in `evaluateNode`'s neighbourhood | ARCH-51 edits only the `HasAttribute`/`HasResourceAttribute`/`HasAction` arms and the node prologue; ARCH-46 edits the port arms (`evaluateActed`, `evaluateHasRelationship`, `evaluateHasSignature`) and `PortAccess.ts`. Either order works; rebase the second. |
| Collision with ARCH-55 (barrel) / ARCH-56 (metrics) | `PortMetrics.ts` doc edit (T3) conflicts; `PredicatePortName` moved | T3's edit is a doc move only; D-51-c A keeps the type where it is. |
| madge cycle introduced later | `pnpm circular` fails | Rule stated in `LeafNeeds.ts`'s header and the ADR: `PortMetrics.ts` must never import it. |
| A test made circular by asserting the module against itself | Matrix passes while behaviour drifts | T4 step 3 keeps literal expectations for the fields and the precedence case; the facts are cross-checked against what `evaluate`/`toPredicate`/recording ports *do*. |

**Rollback.** T1+T3 are an independent patch (tests + doc + exhaustive match), safe to keep alone. T4–T9 revert as one
commit range: `LeafNeeds.ts` is new and package-private, so deleting it and restoring the five Walk checks, the three
Predicate checks and `collectNames` returns HEAD's behaviour exactly; nothing public changed.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | Plan written; evidence verified at `b655b3b` (probes: serving coverage per port, madge type-only cycle, import reachability, tsc spike of the table). Status `needs-decision` (D-51-a…f). | Claude (planning agent) |
| 2026-10-13 | T0-T12 | Implemented on `wave5/architecture-deepenings` as one commit. D-51-a: ARCH-46's reader refactor was NO-GO (ADR-QD-077 Rev 1.2), so the fallback T10 ran here (single `requireResourceId` check, single `spanResourceId`, the empty `qadi.requireScopedResourceId` child span dropped). D-51-b A, D-51-c A, D-51-e A, D-51-f A (ADR-QD-108, CCR-QD-386). D-51-d: shape A (top-of-node pre-check) measured 3 to 11% slow on no-input workloads, so shape B (three arms); the Match-based `missingAction`/`missingResource` still cost ~4% on matcher-heavy, so they became a closed row table (see ADR-QD-108 Measured). T4 note: `LeafNeeds.test.ts`/`.tst.ts` written; T1 type-level builder guard is the `SERVING` table type in `PortRemote.ts` itself. | Claude (implementation agent) |
