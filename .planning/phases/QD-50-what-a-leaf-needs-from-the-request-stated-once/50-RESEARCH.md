# Phase 50: What a leaf needs from the request, stated once - Research

**Researched:** 2026-11-16
**Domain:** `@qadi/core` internals: two interpreters (`Walk.ts`, `Predicate.ts`) restating one rule per leaf (INV-QD-011), a benchmark gate next to budgeted switch #1, a keyed-table module (ADR-QD-152 pattern)
**Confidence:** HIGH on code facts, behaviour matrix, compile-time proofs and mutation scores (all run this session); MEDIUM on benchmark figures (host shared with unrelated Rust builds, 1-minute load 8.6 to 54.9)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### The benchmark gate (LEAF-01)
- **D-01:** The prototype is the shape the phase would ship: `evaluateNode`'s leaf arms read the module-scope table through one reader call; composite arms untouched. The measurement judges what ships, not a toy.
- **D-02:** Workloads: all of `packages/core/bench/Evaluate.bench.ts`, plus a new leaf-heavy workload added **at the base first** (e.g. an `allOf` of 8 `HasAttribute`/`HasResourceAttribute` leaves whose matchers reference the action and the resource), because no existing workload stresses the checks the table replaces.
- **D-03:** Noise rule: interleaved A/B (base, prototype, base, …), 3 runs each, compared on the mean of means per workload. Noise band per workload = max(10% — the ADR-QD-092 precedent — , the base's own run-to-run spread for that workload). Reject if **any** workload's prototype is slower than the base beyond its band. Record per-workload numbers, the band and machine load in ADR-QD-163.
- **D-04:** On a rejection: no `packages/*/src` change; ADR-QD-163 records the rejection and its numbers; LEAF-02..05 are annotated "Not pursued (measured)" in REQUIREMENTS.md; the new bench workload stays (a bench file, not src, kept as evidence).

#### Check order and absence (LEAF-02, LEAF-03)
- **D-05:** Keep today's per-leaf results, stated as **one rule**: a leaf's own input first (`HasAction` → action, `HasResourceAttribute` → resource, a resource-scoped port leaf → resource id), then what its matcher references, action before resource. This reproduces every current error (`HasAttribute`: action then resource; `HasResourceAttribute`: resource then action). A RED-first test over a request missing both action and resource, for each leaf kind, pins the rule; a behaviour row states it (LEAF-03: "preserved deliberately").
- **D-06:** The table states the resource-id need, but `readScoped` (`PortAccess.ts`) stays the one enforcement point, so the port's own span still records the question (ADR-QD-134, BEH-QD-227). A test ties each scoped leaf's row to `readScoped`'s behaviour.
- **D-07:** The reader takes the inputs each interpreter has. In `toPredicate` the resource is the row (always present); `HasAttribute`'s "matcher references the resource" stays a **refusal** (the resource is a column), not an absence.
- **D-08:** The reader returns one closed `Absence` union — `Action { expected? }`, `Resource { attribute }`, `ResourceId { relation }` (or none). Walk maps it to `MissingAction`/`MissingResource`; `toPredicate` maps `Action` to its lazy `NeedAction` plan (failure stays deferred until `run` reaches it). `MissingAction`'s `expected` stays omitted (no key) where the arm has no expected action, as today.

#### The module, the port-free judgement and records (LEAF-02, LEAF-04, LEAF-05)
- **D-09:** A package-private `packages/core/src/LeafNeeds.ts`, out of the barrel, following the ADR-QD-152 keyed-table pattern: `as const satisfies { [K in LeafPolicy["_tag"]]: LeafNeed }`, so a missing leaf row is a compile error. Not in `Policy.ts` (Phase 51 edits it for arity — soft edge).
- **D-10:** The port-free judgement covers `HasRole`, `HasPermission` **and `HasAction`** (also judged twice today), written once in the same module; each interpreter wraps the boolean — Walk in allow/deny with its reason, `toPredicate` in a `Constant`.
- **D-11:** Tests: an exhaustive table test over every leaf tag × action present/absent × resource present/absent × matcher referencing each input or not, pinning INV-QD-011 and the D-05 rule; plus a property that `Walk` and `toPredicate` agree where both apply.
- **D-12:** Records: ADR-QD-163 (bench numbers and the decision, either way), CCR-QD-441, BEH-QD-586+ (the order rule, the table), INV-QD-345 (the table covers every leaf tag); INV-QD-011 pinned, not duplicated. No new public export. `@qadi/core` patch changeset only if code changes. AGENTS.md edited only if a cited location moves (§5's "port reads in `PortAccess.ts`" list, §5a's switch table).

### Claude's Discretion
- Exact names of `LeafNeed` fields and `Absence` variants, the reader's signature, and the leaf-heavy workload's exact policy shape.
- Whether `HasCustom`/`HasActed`/`HasNotActed`/`HasSignature`/`HasRelationship` rows state "resource id" or "none" per their scope (research confirms against `PortAccess.ts`).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEAF-01 | `pnpm bench` measures a prototype in which `evaluateNode` reads a module-scope leaf-needs table, against the phase base; numbers go in ADR-QD-163; any workload regressing beyond noise ends the phase with a recorded rejection | Q5: working command, two prototype shapes (P1, P2) measured A/B on 35 workloads, 0 workloads slower than band on the per-run minimum; the mean-of-means statistic named in D-03 is unusable on this host (Open Question 1) |
| LEAF-02 | One package-private module states per leaf: inputs needed, error per absence, check order; `Walk` and `Predicate` both read it | Q4: `LeafNeeds.ts` shape, built and run in-tree; Q1 inventory |
| LEAF-03 | Per-leaf check-order difference preserved or changed deliberately, with a RED test and a behaviour row | Q3: all 168 cells reproduced by D-05; only three `expected`-key cells differ (Open Question 3); Q6 states honestly that nothing is RED on the base unless that one cell is unified |
| LEAF-04 | The port-free `HasRole`/`HasPermission` judgement is written once and both interpreters use it | Q4 (`holdsRole`, `holdsPermission`, plus `holdsAction` per D-10) |
| LEAF-05 | Exhaustive table test over every leaf tag pins INV-QD-011; `SWITCH_BUDGET`/`UNTRACED_BUDGET` unchanged | Q6 (test sketch run green on base and on the prototype), Q4 (house-style clean, 3 declared switches) |
| WX-01..WX-07 | Wave rules: `check:pr` green, ids reserved, overview gate, no new banned constructs, mutation not falling, characterisation first, breaks recorded | Q7 (mutation baseline and the WX-05 arithmetic wrinkle), Q8 (records), Q9 (commands), Q10 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

`CLAUDE.md` is `@AGENTS.md`. Directives that bind this phase, all enforced by `scripts/check-house-style.mjs` unless noted:

- **Imports (§1):** `import * as X from "effect/X"` only; relative imports carry `.ts`; `import type` for type-only (`verbatimModuleSyntax`). A new file is a package-private module: out of the barrel (§9), no `./*` export (ADR-QD-099).
- **Dispatch (§5a):** `Match`, not `switch`, except the exact budgeted three (`Walk.ts` `evaluateNode`, `Matcher.ts` `judgeMatcher`, `resolveRef`). `SWITCH_BUDGET` stays `Walk.ts: 1`, `Matcher.ts: 2`. A hoisted `Match.type` is 1.6 to 2.4 times slower per dispatch than a `switch` (AGENTS.md §5a, `spec/process/house-rules-evidence.md` §2), so a new per-leaf dispatch must not be a `Match`; a table read is not a dispatch.
- **Functions (§5):** `Effect.fn` for effectful functions; `Effect.fnUntraced` only at the three composite dispatchers (`UNTRACED_BUDGET`, unchanged). The reader is a plain synchronous function.
- **Forbidden (§6):** `as`, `as any`, `!`, `any`, `async`, `Date.now`, `console.*`, `process.env`. `as const` is allowed (house-style `no-type-assertion` allows it; verified: the prototype passed `check-house-style.mjs` with `as const satisfies`).
- **Errors (§4):** `MissingAction`, `MissingResource`, `MissingResourceId` stay `Schema.TaggedError` (SinkRecord codec); the new `Absence` is plain data, never an error class. Never `Effect.orDie` in an evaluation path.
- **Tables (§3, ADR-QD-152):** a keyed table is `as const satisfies { [K in …]: … }`; wrappers and defaults are derived, not hand-written.
- **Spec (§11, §15):** `spec/` is normative; behavior doc, invariant, traceability change in the same change; `spec/overview.md` must name every public export (gate 13) — a package-private module needs no row (verified in `scripts/check-api-surface.mjs`: gate 13 expands the barrel and the declared entry points only).
- **Tests (§10):** `@effect/vitest`; coverage core >= 95%; every behaviour has a test; no placeholder ids (`ADR-QD-NEXT` etc.) in source, tests or scenarios.
- **Memory (user):** closed union over widening; `Record<string, unknown>` is a hack; complete beats simple; no releases.
- **Wave rules (`.planning/phases/_WAVE10-CONTEXT.md`, WX-01..07):** never run `scripts/next-id.mjs`; reserved ids only; no commit of unrelated files.

## Summary

The restatement is real and small: five of the ten leaf arms in `Walk.ts` `evaluateNode` (`HasPermission`, `HasRole`, `HasAttribute`, `HasResourceAttribute`, `HasAction`) and the same five in `Predicate.ts` `cases` write "this leaf reads the action or the resource, so its absence is an error" by hand, in a different order in each arm, and `readScoped` raises `MissingResourceId` for a sixth family. I built the phase's shape in the working tree (a package-private `LeafNeeds.ts` with a keyed `LEAF_NEEDS` table, a reader `absenceOf`, an error mapper `errorOf`, and three port-free judgements), wired both interpreters and `readScoped` to it, and verified it: `tsc` clean, the whole core suite green (2418 tests), `check-house-style` clean with the same three declared switches, `madge` clean, and a 168-cell behaviour matrix (every leaf × action × resource shape, both interpreters) that is identical to the phase base in every cell except the presence of an `expected: undefined` own key on three `toPredicate` failures. Rule D-05 reproduces every current error; because a matcher holds at most one reference, "action before resource among matcher references" is unobservable and only "own input before matcher" is visible.

The benchmark gate passes, but not on the statistic D-03 names. Two prototype shapes (P1: direct imports; P2: module-local aliases of the five functions) were A/B-run interleaved, three runs each, on all 33 existing workloads plus two new leaf-heavy ones. On this host (other Rust builds ran throughout, 1-minute load 8.6 to 54.9) the mean latency is dominated by stalls: base run-to-run spread of the *mean* was 44% to 134% per workload, one prototype run showed a 191 µs mean on an 8.8 µs workload (5,280 samples instead of 113,000), and the literal mean-of-means rule gave opposite verdicts on the two shapes (P1: every workload "faster" by 20 to 50%; P2: 5 of 35 "regressed" by up to 545%, every one traced to that one stalled run). The per-run **minimum** latency is stable (base spread of the minimum <= 10% on 33 of 35 workloads in the P1 session and 35 of 35 in the P2 session) and is what ADR-QD-073's addendum used for the same reason. On it, the worst workload is +5.6% (P1) and +5.4% (P2), inside the 10% band, and the two new leaf-heavy workloads move +1.9% / +1.0% (P1) and 0.0% / +1.0% (P2). Recommendation: pursue, with the gate statistic changed to the median of per-run minima (a D-03 amendment the user must confirm, Open Question 1). The executor must still re-measure at the phase base in its own opening plan; these numbers are research evidence, not ADR-QD-163's record.

Mutation baseline at HEAD (`stryker run --mutate` on the three touched files, 1 min 40 s): `Walk.ts` 95.05% (307 killed, 13 survived, 3 no coverage), `Predicate.ts` 100% (298), `PortAccess.ts` 100% (46). With the prototype and the sketched tests in tree: `Walk.ts` 94.81% with the **identical 13 survivors** (none in a leaf arm), `Predicate.ts` 100%, `PortAccess.ts` 100%, new `LeafNeeds.ts` 98.11% with one equivalent survivor. The `Walk.ts` figure falls by 0.24 points only because 15 killed mutants left with the deleted checks; WX-05 as worded ("the score of touched files does not fall") fails on arithmetic, not on a weaker test (Open Question 4).

**Primary recommendation:** Pursue the table (P1, the direct-import shape). Plan 01 opens with the base-first bench workloads and the interleaved A/B using per-run minima; the user confirms that statistic and the `expected`-key unification before the executor starts.

## Architectural Responsibility Map

This phase is internal to one package; the tiers are modules, not deployment tiers.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Which request inputs a leaf needs, and the error for an absence | `packages/core/src/LeafNeeds.ts` (new, package-private) | — | One keyed table plus one reader; the only module that states INV-QD-011 |
| Applying the rule while evaluating | `Walk.ts` `evaluateNode` leaf arms | `PortAccess.ts` `readScoped` (resource id) | `evaluateNode` is hot (once per leaf per evaluation) and a budgeted switch; arms call the reader, nothing else moves |
| Applying the rule while compiling a row filter | `Predicate.ts` `cases` | — | `toPredicate`'s resource is the row, so only `Action` can be absent; failure is deferred to `run` as a `NeedAction` plan |
| Enforcing the resource-id need on the port's span | `PortAccess.ts` `readScoped` | `LeafNeeds.ts` (states the need; builds the error through `errorOf`) | ADR-QD-134 / BEH-QD-227: the port's own span records the refused question, so enforcement cannot move into the table |
| Port-free judgements (role, permission, action) | `LeafNeeds.ts` | — | Judged twice today; each interpreter wraps the boolean |
| Admission (depth gate) | `Admission.ts` (untouched) | — | ADR-QD-100 amendment: only admission is shared, never the walk; this phase shares *facts about leaves*, not the walk |
| Records | `spec/` (ADR-QD-163, BEH, INV, CCR) | `.planning/` (REQUIREMENTS annotation on rejection) | WX-02 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| effect | 4.1.2 | `Match.tagsExhaustive` for the error mapper; `Data`/`Schema` error classes already exist | Installed version, read from `node_modules/effect/package.json` this session [VERIFIED: node -e require("effect/package.json").version = 4.1.2] |
| vitest | 5.1.0 | Tests and `vitest bench` | [VERIFIED: `vitest run` banner "RUN v5.1.0"] |
| @effect/vitest | repo catalog | `it.effect`, `assert` | AGENTS.md §10 |
| @stryker-mutator/vitest-runner | 10.1.1 | Mutation baseline for WX-05 | [VERIFIED: `pnpm exec stryker --version` = 10.1.1; `stryker.config.mjs` requires >=10.1.1] |
| typescript (tsgo) | 7.0.2+effect-tsgo.0.67.5 | Compile-time proofs of the keyed table | [VERIFIED: `pnpm exec tsc --version`] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fast-check | repo catalog | The existing INV-QD-058 agreement properties (`Predicate.test.ts:971`, `:1239`) | Reuse as is; the new agreement property needs no new arbitrary (Q6) |
| tstyche | repo catalog | `*.tst.ts` type tests | Optional: pin `LEAF_NEEDS`'s key set to `LeafPolicy["_tag"]` both ways (Q6) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Table read + reader (P1) | Same with module-local aliases (P2) | P2 is the ARCH-08 T8 precedent for module-runner getter cost; measured, it was no faster (worst +5.4% vs +5.6%), so P1 is simpler and wins |
| Per-leaf `switch`/`Match` in the reader | The table read | Violates §5a (a hoisted `Match` is 1.6 to 2.4× a switch); the table read is one property load |
| Returning the error class from the reader | Returning plain `Absence` data | A class instance allocates a stack on every absence and cannot be deferred by `toPredicate`'s lazy `NeedAction`; D-08 chose data |

**Installation:** none. No package is added.

**Version verification:** versions above were read from the installed tree this session; nothing is installed from a registry.

## Package Legitimacy Audit

No external package is installed or recommended by this phase, so the Package Legitimacy Gate (`gsd_run query package-legitimacy check`) does not apply.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 policy tree (admitted: Admission.ts, depth gate, shared)
        │
        ├────────────────────────── evaluate ───────────────────────────┐
        │                                                               │
        │   walk(question)  builds Evaluation { resource, action,      │
        │        │                              supplied{action,resource},
        │        ▼                              concurrency }           │
        │   evaluateNode  (budgeted switch #1, UNCHANGED)               │
        │        │ composite arms: untouched                            │
        │        │ leaf arms (5): absenceOf(policy, request.supplied) ─┐│
        │        │                                                     ││
        │   scoped port leaves: readScoped ── resourceId undefined ──►errorOf({ResourceId})
        │        │                                                     ││
        │        ▼                                                     ▼│
        │   Verdict / MissingAction | MissingResource | MissingResourceId
        │                                                               │
        └────────────────────────── toPredicate ────────────────────────┘
            compileTree (cases, PolicyCases<Compiled>)
               supplied = { action: action !== undefined, resource: true }   (resource is the row)
               leaf arm: absenceOf(p, supplied) ──► NeedAction{absence} plan (lazy)
                                                       │  run reaches it
                                                       ▼
                                                 Effect.fail(errorOf(absence))

 LeafNeeds.ts (new, package-private, out of the barrel)
   LEAF_NEEDS : as const satisfies { [K in LeafTag]: LeafNeed }      ← the table
   absenceOf(leaf, supplied) : ActionAbsence | ResourceAbsence | undefined   ← one rule, D-05
   errorOf(absence)          : MissingAction | MissingResource | MissingResourceId
   holdsRole / holdsPermission / holdsAction                          ← D-10
```

### Recommended Project Structure
```
packages/core/src/
├── LeafNeeds.ts          # NEW, package-private: table, Absence, absenceOf, errorOf, holds*
├── Walk.ts               # leaf arms call the reader; Evaluation gains `supplied`
├── Predicate.ts          # NeedAction carries an Absence; arms call the reader
└── PortAccess.ts         # readScoped builds its error through errorOf (still enforces)
packages/core/test/
├── LeafMatrix.test.ts    # characterisation over evaluate/toPredicate; green on the base
├── LeafNeeds.test.ts     # table tests; RED on the base (module absent)
└── helpers/ or LeafFixtures.ts   # FIXTURES/oracle shared by the two (see Q6; the sketch re-exports from the test file)
packages/core/bench/Evaluate.bench.ts   # + two leaf-heavy workloads (base first)
```

### Pattern 1: ADR-QD-152 keyed table
**What:** a module-private `as const satisfies { readonly [K in Tag]: Row }` record; keys derive the type; a missing key is TS2741, an excess key TS2353, a wrong value TS2322.
**When to use:** any closed set whose members each state the same facts (here the ten leaf tags).
**Example:** `GateState.ts`, `HydrationMetrics.ts` (Phase 49, ADR-QD-152); `FieldLattice.ts` law table (ADR-QD-092 (b)).
**Verbatim compile output, run this session against the prototype `LeafNeeds.ts`** (`pnpm exec tsc -p packages/core/tsconfig.src.json --noEmit`):

Missing `HasCustom` row:
```
packages/core/src/LeafNeeds.ts(54,12): error TS2741: Property 'HasCustom' is missing in type '{ readonly HasPermission: { readonly own: "Nothing"; readonly matcher: false; readonly resourceId: "Never"; }; …
```
(the three `LEAF_NEEDS[leaf._tag]` reads then also fail with TS7053, so the break reaches every reader, not just the table).

Excess row `HasNothing`:
```
packages/core/src/LeafNeeds.ts(54,3): error TS2353: Object literal may only specify known properties, and 'HasNothing' does not exist in type '{ readonly HasActed: LeafNeed; readonly HasAction: LeafNeed; readonly HasAttribute: LeafNeed; readonly HasCustom: LeafNeed; …
```

Wrong value (`own: "Everything"` on `HasRole`):
```
packages/core/src/LeafNeeds.ts(46,14): error TS2322: Type '"Everything"' is not assignable to type '"Action" | "Nothing" | "Resource"'.
```
After restoring, `tsc` printed nothing and the file was byte-identical to the prototype.

### Anti-Patterns to Avoid
- **A `switch` or `Match` inside the reader:** a per-leaf dispatch; the table read replaces it. Adding one fails the `SWITCH_BUDGET` gate and costs 1.6 to 2.4× (§5a).
- **Moving the resource-id enforcement into the reader:** the port's span would no longer record the refused question (ADR-QD-134, BEH-QD-227). The reader never returns `ResourceId`; `readScoped` stays the one enforcement point (D-06).
- **A second, narrowing check next to the reader** (`if (resource === undefined) …` after `absenceOf`): restates the rule and plants equivalent mutants. The prototype uses `resource ?? NO_RESOURCE` instead (Pitfall 3).
- **Reading the table with an untrusted key:** `LEAF_NEEDS[tag]` is safe only because the five arms dispatch on a known tag first. A reader exposed to a decoded, unvalidated `_tag` needs `Object.hasOwn` as `fieldStrategyLaws` does (ADR-QD-092 (b)).
- **Depending on `leafTags` (`Decision.ts`):** Phase 51 deletes it. Enumerate leaves through the typed `FIXTURES` record and `P.leafCases(() => 0)` keys (Q6).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Does this matcher read the action/resource" | A new matcher walk | `referencesAction` / `referencesResource` (`Matcher.ts:643`, `:654`, the one `referencesRef` walker) | They are the same traversal, depth-guarded (`Matcher.ts:499` notes a `RangeError` before the guard) |
| "Is this leaf resource-scoped" | A `scope === "Resource"` read in the table | `isResourceScoped` / `scopedResourceIdOf` (`ScopedLeaf.ts`) | INV-QD-288: the request's id and the route cannot disagree because both call it; the table row `resourceId: "ByScope"` is *tied to it by a test*, not duplicated |
| Building `MissingResourceId` | `new MissingResourceId` in two places | `errorOf({ _tag: "ResourceId", relation })` | Single construction site per error class |
| Keyed table scaffolding | A `Record<…>` with a runtime check | `as const satisfies { [K in LeafTag]: LeafNeed }` | The compiler is the exhaustiveness check (ADR-QD-152) |
| Bench statistics | A new reporter | `vitest bench --reporter=json --outputFile=…` and the 35-line `analyze2.mjs` in Q5 | Vitest already emits `latency.min/p50/mean` per task |

**Key insight:** the rule being stated once is not new logic. Every check already exists; the work is moving them behind one reader without changing an observable cell and without adding a per-leaf dispatch on the hot path.

## Runtime State Inventory

Not a rename/refactor/migration phase in the data sense: no string, key, id or name changes. Stated explicitly for the five categories so the planner does not have to infer:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. Error classes and their `_tag`s, `MissingAction.expected` (`Schema.optional(Schema.String)`) and the `SinkRecord` codec are untouched; a stored record decodes as before. Verified by reading `Errors.ts` shapes and by the matrix: the only difference is an in-memory own-key on three `toPredicate` failures, which JSON drops | None |
| Live service config | None — no external service names a leaf tag or an error here | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts / installed packages | `packages/*/lib` is a build product only; a new `src` file is picked up by `tsc -b`. Nothing is packed differently: `LeafNeeds.ts` is not in an `exports` map (ADR-QD-099) | None. Gate 14 (`check-package-install.mjs`) already verifies the packed artifact |

## Findings by Question

### Q1. Leaf inventory

Ten leaf tags. The tag list is the `LeafTag` union quoted verbatim by `tsc` in the compile output above: `"HasActed" | "HasAction" | "HasAttribute" | "HasCustom" | "HasNotActed" | "HasPermission" | "HasRelationship" | "HasResourceAttribute" | "HasRole" | "HasSignature"` [VERIFIED: tsc TS7053 output, this session]. Line numbers are the phase base (HEAD `b58c1a0b`).

| Leaf | `Walk.ts` arm (base) | `Predicate.ts` arm (base) | Reads itself | Matcher references checked | Port read / resource id | Error on absence (evaluate; `toPredicate`) | Port-free judgement |
|------|----------------------|---------------------------|--------------|----------------------------|-------------------------|---------------------------------------------|---------------------|
| `HasPermission` | `:310` | `:398` | subject only | no matcher | none | none | `subject.permissions.has(permissionKey(p.permission))` in both |
| `HasRole` | `:319` | `:396` | subject only | no matcher | none | none | `subject.roles.has(role)` in both |
| `HasAttribute` | `:326` | `:406` | subject attribute (port `AttributeResolver`) | action, then resource | `readAttribute`, never a resource id | `MissingAction{}` if the matcher references the action; `MissingResource{attribute}` if it references the resource. `toPredicate`: a resource reference is a **refusal** (`PolicyNotTranslatable`, "the matcher compares against the resource, which is a column"), an action reference is a `NeedAction` plan | no |
| `HasResourceAttribute` | `:350` | `:421` | **the resource** | action (resource is the thing already checked) | none | `MissingResource{attribute}` first, then `MissingAction{}`. `toPredicate`: the resource is the row, so only `NeedAction{expected: undefined}` | no |
| `HasRelationship` | `:377` | `:437` | resource id (via `readScoped`) | no matcher | `readScoped(relationshipResolverPort, …, leaf.relation)` always | `MissingResourceId{relation}`. `toPredicate`: refused ("a relationship is keyed by the row's id and cannot fold") | no |
| `HasAction` | `:380` | `:401` | **the action** | no matcher | none | `MissingAction{expected: policy.action}` (both interpreters) | `action === policy.action` in both |
| `HasActed` / `HasNotActed` | `:393`/`:394` | `:434`/`:435` | resource id when `scope: "Resource"` | no matcher | `readScoped(decisionHistoryPort, …, leaf.event)` iff `isResourceScoped(leaf)`; `scope: "Any"` asks with no resource id | `MissingResourceId{relation: event}` for `Resource` scope; none for `Any`. `toPredicate`: `Resource` scope refused, `Any` asks the port | no |
| `HasCustom` | `:397` | `:443` | custom predicate port | no matcher | none | none. `toPredicate`: refused (opaque) | no |
| `HasSignature` | `:400` | `:453` | resource id when `scope: "Resource"` | no matcher | `readScoped(signatureHistoryPort, …, leaf.meaning)` iff `isResourceScoped(leaf)` | `MissingResourceId{relation: meaning}` for `Resource` scope. `toPredicate`: always refused | no |

Facts behind the table [VERIFIED: base matrix `matrix-base.tsv` produced by a probe test this session, 168 cells; `PortAccess.ts:271-292` and the Walk diff context read this session]:

- `PortAccess.ts:271-292`, verbatim (the only construction site of `MissingResourceId` for a port read):
  ```ts
  const readScoped = <K extends ScopedPort>(
    d: DescriptionOf<K>,
    interpreter: Interpreter,
    request: ScopedRequest<K>,
    relation: string,
  ): Effect.Effect<
    AnswerOf<PortTypes[K]>,
    ErrorOf<PortTypes[K]> | MissingResourceId,
    ServiceOf<PortTypes[K]>
  > =>
    Effect.gen(function* () {
      const [{ resourceId }] = request;
      if (resourceId === undefined) {
        yield* annotateQuestion<SpanFields>(d, {
          ...d.attributes.pose(request),
          scope: "Resource",
          interpreter,
        });
        return yield* Effect.fail(new MissingResourceId({ relation }));
      }
      return yield* readPort(d, interpreter, completeRequest[d.port](request, resourceId));
    });
  ```
  The span is annotated *before* the failure: that is why enforcement stays here (D-06).
- No port read ever reads the action: `ReadSite` is `{ subject, resource }` (read in `PortDescription.ts`), so `HasAction`'s need is the only action need that is not a matcher reference.
- A matcher holds **at most one** `ValueRef`: `matcherChildrenOf` yields at most one child (`Matcher.ts`), so no leaf can reference both the action and the resource. "Action before resource among matcher references" is therefore unobservable; only "own input before matcher" can be seen, and only on `HasResourceAttribute` (resource, then action) [VERIFIED: matrix rows `HasResourceAttribute[ref action]`, resource none: `MissingResource{"attribute":"owner"}` for both action states].
- `resourceIdOf(resource)` returns an id only for a string `id` (`Resource.ts`): the `no-id` resource shape (`{ owner, other }`) fails exactly like `none` for a scoped port leaf.

### Q2. Other restatements and existing static analyses

| Where | What it states | In scope? |
|-------|----------------|-----------|
| `Walk.ts:326-376` and `Predicate.ts:401-429` | the checks themselves | yes: replaced |
| `Walk.ts:327` and `:354` (`action === undefined && referencesAction(…)`), `:339` and `:351` (`MissingResource`), `:383-384` (`HasAction`) | the same rule per arm (CONTEXT specifics) | yes |
| `Predicate.ts:415`, `:422` and `:597` | `NeedAction` plans and the `MissingAction` they become | yes: `NeedAction` carries an `ActionAbsence`; `run` calls `errorOf` |
| `PortAccess.ts:271-292` `readScoped` | resource-id enforcement | tied by D-06; builds its error through `errorOf` |
| `ScopedLeaf.ts` `isResourceScoped` / `scopedResourceIdOf` | "is this leaf resource-scoped" (INV-QD-288) | the table's `resourceId: "ByScope"` is *tied* to it by a test, not copied |
| `Policy.ts:1170` `leafCases`, `Decision.ts:418` `leafTags`, `PortDescription.ts:120` `LeafOf` | leaf-tag enumerations | `leafTags` is deleted by Phase 51: do not depend on it. `leafCases` is public Policy API and stays |
| `Explanation.ts:364-388`, `devtools/src/model/Remedies.ts:347-354` | what a leaf *says* / what remedy it offers | no: display facts, not request needs |
| `Predicate.ts` per-leaf refusals (`HasRelationship`, resource-scoped history, `HasSignature`, `HasCustom`) | which leaves cannot compile to a row filter | adjacent, not in LEAF-02 (the requirement names action, resource, resource id); a later table could carry it, out of scope here |
| `EvaluationMetrics.ts:137-138` | `MissingAction: true`, `MissingResource: true` inside a record keyed by error tag | unaffected: error classes and tags do not change |
| `packages/http/src/QadiHttpError.ts:295-296` | wire mapping per error tag | unaffected |
| `packages/devtools/src/model/Edits.ts:17`, `SimulationSession.ts:246` | comments that say `MissingAction` rows appear when the action is dropped | unaffected |

There is no existing static analysis of "which inputs does this policy need" to extend or conflict with; the reader is the first.

### Q3. Behaviour matrix on the base, and whether D-05 reproduces it

**Method.** A throwaway probe test (`Probe50Matrix.test.ts`, deleted afterwards; copy kept in the session scratchpad) ran 21 leaf fixtures (every leaf tag, with matcher-reference variants and both scopes) through `evaluate` for action ∈ {absent, `"read"`} × resource ∈ {none, `{owner,other}` without id, with `id`} (6 cells) and through `toPredicate` for action ∈ {absent, `"read"`} (2 cells): 21 × 8 = **168 cells** [VERIFIED: `grep -c . matrix-base.tsv` = 168]. The same probe was re-run with the prototype applied; `diff matrix-base.tsv matrix-proto.tsv` shows exactly three lines.

**`evaluate`, condensed** (`Allow`/`Deny` = no `Missing*` error; the error cells are the whole of INV-QD-011 plus INV-QD-288):

| Leaf fixture | action absent | resource none | resource no-id | resource id |
|--------------|---------------|---------------|----------------|-------------|
| `HasPermission`, `HasRole`, `HasCustom`, `HasActed/NotActed/HasSignature [Any]` | no error (6/6 cells) | no error | no error | no error |
| `HasAction("read")` | `MissingAction{expected:"read"}` (3 cells) | — | — | — |
| `HasAttribute`, matcher references nothing | no error | no error | no error | no error |
| `HasAttribute`, matcher references the action (also nested) | `MissingAction{}` (3 cells) | — | — | — |
| `HasAttribute`, matcher references the resource (also nested) | — | `MissingResource{attribute:"department"}` (action absent or present) | no error | no error |
| `HasResourceAttribute`, no reference | — | `MissingResource{attribute:"owner"}` (action absent or present) | no error | no error |
| `HasResourceAttribute`, matcher references the action | `MissingAction{}` only when the resource is `no-id` or `id` | **`MissingResource{owner}` wins over a missing action** | `MissingAction{}` iff action absent | `MissingAction{}` iff action absent |
| `HasResourceAttribute`, matcher references the resource | — | `MissingResource{owner}` | no error | no error |
| `HasRelationship` | — | `MissingResourceId{relation:"owner"}` | `MissingResourceId{relation:"owner"}` | no error |
| `HasActed/HasNotActed [Resource]` | — | `MissingResourceId{relation:"e"}` | same | no error |
| `HasSignature [Resource]` | — | `MissingResourceId{relation:"m"}` | same | no error |

**`toPredicate`** (action absent / present; the resource is the row): `HasAction` absent → failure `MissingAction{expected:"read"}`; `HasAttribute`/`HasResourceAttribute` whose matcher references the action, absent → failure `MissingAction{}`; a matcher referencing the resource on `HasAttribute` → `PolicyNotTranslatable` ("the matcher compares against the resource, which is a column") whatever the action; relationship, resource-scoped history, signature and custom → `PolicyNotTranslatable` with their existing reasons; everything else translates.

**Does D-05 reproduce every cell?** Yes, for every error tag and every field. The one rule: own input, then matcher references, with the resource-id need enforced after both at the port read. The prototype's matrix differs from the base on exactly these three cells, all in `toPredicate` and all about the **presence of an own `expected` key**, not its value:

```
< toPredicate	HasAttribute[ref action]	action=-		FAIL MissingAction{}<expectedKey=true>
> toPredicate	HasAttribute[ref action]	action=-		FAIL MissingAction{}
< toPredicate	HasAttribute[nested ref action]	action=-		FAIL MissingAction{}<expectedKey=true>
> toPredicate	HasAttribute[nested ref action]	action=-		FAIL MissingAction{}
< toPredicate	HasResourceAttribute[ref action]	action=-		FAIL MissingAction{}<expectedKey=true>
> toPredicate	HasResourceAttribute[ref action]	action=-		FAIL MissingAction{}
```

Base: `Predicate.ts:597` is `NeedAction: (p) => Effect.fail(new MissingAction({ expected: p.expected }))` with `expected: undefined` at `:416` and `:423`, so `toPredicate` writes `expected: undefined` as an own key while `Walk.ts` writes `new MissingAction({})` (`:332`, `:356`) "No key, not `expected: undefined`: `expected` is `Schema.optional` precisely so a JSON round-trip drops it" (Walk's own comment). D-08 says the key "stays omitted (no key) where the arm has no expected action, as today"; as today holds for Walk, not for `toPredicate`. The difference is invisible on the wire (`MissingAction.expected` is `Schema.optional(Schema.String)`, BEH-QD-076) and invisible to the existing agreement property, whose label is `` `MissingAction:${String(error.expected)}` `` (`Predicate.test.ts:1132-1140`, `labelOfError`). See Open Question 3.

### Q4. The module: exact shape, built and run

Every line of the file below was compiled and run in-tree this session (then reverted). Names are Claude's discretion (CONTEXT); these are the recommended ones.

**`packages/core/src/LeafNeeds.ts` (prototype P1, 153 lines):**

```ts
/**
 * What a policy leaf needs from the request, stated once.
 * (doc comment: rule + "a matcher holds at most one reference" note; see Q1)
 */
import * as Match from "effect/Match";
import type { AuthSubject } from "./AuthSubject.ts";
import { MissingAction, MissingResource, MissingResourceId } from "./Errors.ts";
import type { Matcher } from "./Matcher.ts";
import { referencesAction, referencesResource } from "./Matcher.ts";
import { permissionKey } from "./Permission.ts";
import type { LeafPolicy } from "./Policy.ts";

type LeafTag = LeafPolicy["_tag"];

/** A leaf that carries a matcher, and so a name for the attribute it reads. */
type MatcherLeaf = Extract<LeafPolicy, { readonly matcher: Matcher }>;

/** The leaf that names the action itself. */
type ActionLeaf = Extract<LeafPolicy, { readonly _tag: "HasAction" }>;

/** What one leaf needs from the request. */
export interface LeafNeed {
  /** What the leaf itself reads, whatever its matcher says; checked first. */
  readonly own: "Nothing" | "Action" | "Resource";
  /** Whether its matcher is asked what it references; checked after `own`. */
  readonly matcher: boolean;
  /** Whether it asks a port about one resource, which `readScoped` enforces. */
  readonly resourceId: "Never" | "Always" | "ByScope";
}

export const LEAF_NEEDS = {
  HasPermission: { own: "Nothing", matcher: false, resourceId: "Never" },
  HasRole: { own: "Nothing", matcher: false, resourceId: "Never" },
  HasAttribute: { own: "Nothing", matcher: true, resourceId: "Never" },
  HasResourceAttribute: { own: "Resource", matcher: true, resourceId: "Never" },
  HasRelationship: { own: "Nothing", matcher: false, resourceId: "Always" },
  HasAction: { own: "Action", matcher: false, resourceId: "Never" },
  HasActed: { own: "Nothing", matcher: false, resourceId: "ByScope" },
  HasNotActed: { own: "Nothing", matcher: false, resourceId: "ByScope" },
  HasCustom: { own: "Nothing", matcher: false, resourceId: "Never" },
  HasSignature: { own: "Nothing", matcher: false, resourceId: "ByScope" },
} as const satisfies { readonly [K in LeafTag]: LeafNeed };

/** What a request supplied, as far as an interpreter knows it. */
export interface Supplied<Resource extends boolean = boolean> {
  readonly action: boolean;
  readonly resource: Resource;
}

export interface ActionAbsence { readonly _tag: "Action"; readonly expected?: string }
export interface ResourceAbsence { readonly _tag: "Resource"; readonly attribute: string }
export interface ResourceIdAbsence { readonly _tag: "ResourceId"; readonly relation: string }
export type Absence = ActionAbsence | ResourceAbsence | ResourceIdAbsence;

const isMatcherLeaf = (leaf: LeafPolicy): leaf is MatcherLeaf => LEAF_NEEDS[leaf._tag].matcher;
const isActionLeaf = (leaf: LeafPolicy): leaf is ActionLeaf => LEAF_NEEDS[leaf._tag].own === "Action";
const MISSING_ACTION: ActionAbsence = { _tag: "Action" };

/** What the request is missing for this leaf, or `undefined`. */
export function absenceOf(leaf: LeafPolicy, supplied: Supplied<true>): ActionAbsence | undefined;
export function absenceOf(leaf: LeafPolicy, supplied: Supplied): ActionAbsence | ResourceAbsence | undefined;
export function absenceOf(leaf: LeafPolicy, supplied: Supplied): ActionAbsence | ResourceAbsence | undefined {
  const need = LEAF_NEEDS[leaf._tag];
  if (need.own === "Action" && !supplied.action) {
    return isActionLeaf(leaf) ? { _tag: "Action", expected: leaf.action } : MISSING_ACTION;
  }
  if (isMatcherLeaf(leaf)) {
    if (need.own === "Resource" && !supplied.resource) {
      return { _tag: "Resource", attribute: leaf.attribute };
    }
    if (!supplied.action && referencesAction(leaf.matcher)) return MISSING_ACTION;
    if (!supplied.resource && referencesResource(leaf.matcher)) {
      return { _tag: "Resource", attribute: leaf.attribute };
    }
  }
  return undefined;
}

export function errorOf(absence: ActionAbsence): MissingAction;
export function errorOf(absence: ResourceAbsence): MissingResource;
export function errorOf(absence: ResourceIdAbsence): MissingResourceId;
export function errorOf(absence: ActionAbsence | ResourceAbsence): MissingAction | MissingResource;
export function errorOf(absence: Absence): MissingAction | MissingResource | MissingResourceId;
export function errorOf(absence: Absence): MissingAction | MissingResource | MissingResourceId {
  return Match.value(absence).pipe(
    Match.tagsExhaustive({
      Action: (a) => (a.expected === undefined ? new MissingAction({}) : new MissingAction({ expected: a.expected })),
      Resource: (a) => new MissingResource({ attribute: a.attribute }),
      ResourceId: (a) => new MissingResourceId({ relation: a.relation }),
    }),
  );
}

/** The three port-free judgements (D-10). */
export const holdsRole = (subject: AuthSubject, leaf: Extract<LeafPolicy, { readonly _tag: "HasRole" }>): boolean =>
  subject.roles.has(leaf.role);
export const holdsPermission = (subject: AuthSubject, leaf: Extract<LeafPolicy, { readonly _tag: "HasPermission" }>): boolean =>
  subject.permissions.has(permissionKey(leaf.permission));
export const holdsAction = (leaf: ActionLeaf, action: string | undefined): boolean => action === leaf.action;
```

**Row type and the CONTEXT discretion question.** Each non-trivial row's `resourceId` says "Never" / "Always" / "ByScope", confirmed against `PortAccess.ts`: `HasRelationship` always goes through `readScoped` (`:442`), `HasActed`/`HasNotActed` and `HasSignature` only when `isResourceScoped(leaf)` (`:386`, `:484`), `HasCustom` and `HasAttribute` never. The `own` and `matcher` fields drive the reader; `resourceId` is **documentation tied by a test** (Q6), because `readScoped` stays the enforcement point.

**`Absence` and the reader signature.** The union is the D-08 union. The reader never returns `ResourceId`: the variant exists so `readScoped` can build its error through the one mapper (`errorOf({ _tag: "ResourceId", relation })`, a one-line change at `PortAccess.ts:290`), keeping a single construction site per class. If the user prefers D-08 read literally ("the reader returns … `ResourceId { relation }`"), the reader must be handed the port-read outcome too, which contradicts D-06; see Open Question 2.

**Why overloads.** `absenceOf` has two overloads and `errorOf` five so each caller's error channel stays as narrow as today: `Walk`'s `EvaluationError` and `toPredicate`'s `RunError = AttributeResolveError | DecisionHistoryUnavailable | MissingAction` (`Predicate.ts:294`) must not widen to include `MissingResource`. A table-driven reader cannot narrow the *value* (see Pitfall 3), but it can narrow the *type* through `Supplied<true>`. Five overloads is the price of D-08's single union; a split into `errorOfAction`/`errorOfResource` is an equal alternative the planner may choose (discretion).

**How `Walk` and `Predicate` call it (no new switch, no `Effect.fnUntraced`).**

`Walk.ts` (prototype diff, P1): `Evaluation` gains `readonly supplied: Supplied;` built once in `walk()` (`supplied: { action: question.action !== undefined, resource: question.resource !== undefined }`); `const NO_RESOURCE: Resource = {};` joins `NO_OBLIGATIONS`; the five arms become:

```ts
case "HasPermission":
  return Effect.succeed(
    holdsPermission(subject, policy)
      ? allow("HasPermission", policy.fields)
      : deny("HasPermission", `subject lacks permission '${permissionKey(policy.permission)}'`),
  );
case "HasRole":
  return Effect.succeed(
    holdsRole(subject, policy)
      ? allow("HasRole", policy.fields)
      : deny("HasRole", `subject lacks role '${policy.role}'`),
  );
case "HasAttribute": {
  const absent = absenceOf(policy, request.supplied);
  if (absent !== undefined) return Effect.fail(errorOf(absent));
  return Effect.map(readAttribute("evaluate", subject, policy), (value) => { /* unchanged */ });
}
case "HasResourceAttribute": {
  const absent = absenceOf(policy, request.supplied);
  if (absent !== undefined) return Effect.fail(errorOf(absent));
  // `absenceOf` has ruled out an absent resource; the `??` is the type's.
  const row = resource ?? NO_RESOURCE;
  const value = Object.hasOwn(row, policy.attribute) ? row[policy.attribute] : undefined;
  /* judgeMatcher … unchanged */
}
case "HasAction": {
  const absent = absenceOf(policy, request.supplied);
  if (absent !== undefined) return Effect.fail(errorOf(absent));
  return Effect.succeed(
    holdsAction(policy, action)
      ? allow("HasAction", policy.fields)
      : deny("HasAction", `action is '${action}', not '${policy.action}'`),
  );
}
```

`switch (policy._tag)` is untouched (one `switch`, budget `Walk.ts: 1`); no `Effect.fnUntraced` added. The deny reasons are byte-identical because each reason is the original template literal (D-10): `HasPermission`'s recomputes `permissionKey` on the deny path only (one string join, cold), instead of hoisting `key` above the judgement, which would make the boolean judgement and the reason share a computation the judgement does not export. Alternative, same bytes: have `holdsPermission` return the key on a deny; that changes D-10's "each interpreter wraps the boolean" and was not adopted.

`Predicate.ts` (prototype diff): `Plan`'s `NeedAction` becomes `{ _tag: "NeedAction"; readonly absence: ActionAbsence }`; `compileTree` builds `const supplied: Supplied<true> = { action: action !== undefined, resource: true };` once ("A predicate filters rows, so the resource is the row and is always present."); arms:

```ts
HasRole: (p) => planned({ _tag: "Constant", value: holdsRole(subject, p) }),
HasPermission: (p) => planned({ _tag: "Constant", value: holdsPermission(subject, p) }),
HasAction: (p) => {
  const absent = absenceOf(p, supplied);
  return absent === undefined
    ? planned({ _tag: "Constant", value: holdsAction(p, action) })
    : planned({ _tag: "NeedAction", absence: absent });
},
HasAttribute: (p) => {
  if (referencesResource(p.matcher)) { return refused("HasAttribute", "the matcher compares against the resource, which is a column"); }
  const absent = absenceOf(p, supplied);
  if (absent !== undefined) return planned({ _tag: "NeedAction", absence: absent });
  return planned({ _tag: "AskAttribute", leaf: p });
},
HasResourceAttribute: (p) => {
  const absent = absenceOf(p, supplied);
  if (absent !== undefined) return planned({ _tag: "NeedAction", absence: absent });
  /* columnPredicate … unchanged */
},
// run:
NeedAction: (p) => Effect.fail(errorOf(p.absence)),
```

The D-07 refusal stays where it is, before the reader (it is a refusal, not an absence). `Predicate.ts` stops importing `MissingAction` as a value, `permissionKey` and `referencesAction`.

`PortAccess.ts`: `import type { MissingResourceId }`, `import { errorOf } from "./LeafNeeds.ts"`, and `return yield* Effect.fail(errorOf({ _tag: "ResourceId", relation }));` — the span annotation above it is unchanged.

**D-06 tie.** `LEAF_NEEDS[tag].resourceId` is tested against `readScoped`'s behaviour for every fixture (Q6, `LeafNeeds.test.ts` "a row's resourceId is what readScoped does"): `Never` ⇒ no `MissingResourceId` for any resource shape; `Always` ⇒ one unless the resource has an id; `ByScope` ⇒ one iff the fixture is `scope: "Resource"` and the resource has no id. Ran green on the prototype.

**D-10 / reasons.** Byte-identity is pinned by the existing suite (`Evaluate.test.ts` asserts the reason sentences; the full core suite, 2418 tests, passed on the prototype).

**House-style (verified on the prototype).** `pnpm exec oxlint` clean; `node scripts/check-house-style.mjs` printed "House-style: 534 file(s) clean (3 declared switch(es))"; `pnpm circular` printed "No circular dependency found". No rule touches a new core file except the budgets: `SWITCH_BUDGET` is `{ "packages/core/src/Walk.ts": 1, "packages/core/src/Matcher.ts": 2 }` (`scripts/check-house-style.mjs:376-387`, read this session) and is unchanged; `no-type-assertion` allows `as const`; there is no barrel edit, and gate 13 expands only the barrel and the declared entry points (`scripts/check-api-surface.mjs:217-269`), so no `spec/overview.md` row is needed. `as const satisfies` is the same shape as `GateState.ts`.

**Stays out of the barrel.** `packages/core/src/index.ts` is not edited (D-12: no new public export). Phase 51's arity work edits `Policy.ts`, not `LeafNeeds.ts`; `LeafNeeds.ts` imports only `LeafPolicy` (a type) from it, the soft edge D-09 names.

### Q5. The benchmark

**File and config.** `packages/core/bench/Evaluate.bench.ts` (vitest 5.1.0 `bench.compare`); the root script is `"bench": "vitest bench --run"` (`package.json`). `--project core` is **not valid** for `vitest bench` ("No projects matched the filter 'core'"). The default reporter prints no numbers; use the JSON reporter.

**Working command and timing** [VERIFIED: ran 12 times this session]:

```bash
pnpm exec vitest bench --run --reporter=json --outputFile=<file>.json packages/core/bench/Evaluate.bench.ts
```

One run is ≈ 44 s under this host's load; a six-run interleaved A/B (3 base + 3 prototype) took ≈ 4.5 min. The JSON has `testResults[0].assertionResults[].benchmarks[].tasks[].latency.{min,p50,p75,p99,mean,sd,samplesCount}` (milliseconds) and `throughput.mean`.

**The new workloads (added at the base first, D-02).** Two entries joined `Evaluate.bench.ts`'s "evaluate" compare, after `deep rules`:

- `leaf-heavy — allOf of 8, matchers reference action and resource`: `hasAttribute("department", neq(action()))` ×2, `hasAttribute("department", eq(resource("department")))` ×2, `hasResourceAttribute("owner", eq(subjectId()))`, `hasResourceAttribute("department", neq(action()))`, `hasResourceAttribute("department", eq(subject("department")))`, `hasAction("read")`; evaluated with `{ action: "read", resource: { id: "doc-1", department: "cardiology", owner: "alice" } }`.
- `leaf-heavy — allOf of 8, matchers reference neither`: the same leaf tags, matchers that reference neither input — the control that separates the reader's cost from the arms'.

Both **Allow** (the whole fold runs). A first draft denied because `hasAttribute("department", eq(subjectId()))` compares `"cardiology"` to `"alice"`; fixed with `neq(subjectId())` (found by a probe test, deleted). The failing path is deliberately not measured. The patch (`git diff` of the bench file, 87 lines) was kept in the scratchpad; the file is reverted to HEAD at the end of this research. The plan must re-add it as its first commit.

**Interleaved A/B without worktrees (D-03).** The prototype is a patch applied with `git apply` before its run and reverted with `git apply -R` after it, so the tree alternates between "phase base + bench workloads" and "plus prototype". Dry run, run this session (a scratch edit to a tracked file, saved as a patch, reverted, applied, reverted again):

```
=== before ===
 M .planning/config.json
 M packages/core/bench/Evaluate.bench.ts
=== apply scratch ===
 M .planning/config.json
 M packages/core/bench/Evaluate.bench.ts
 M packages/core/src/ScopedLeaf.ts
=== apply -R ===
 M .planning/config.json
 M packages/core/bench/Evaluate.bench.ts
ScopedLeaf.ts byte-identical to HEAD
packages/core/src == HEAD
```

**The script** (`ab.sh`; the exact one that produced the numbers, minus a quiet-machine wait that never completed on this host):

```bash
#!/bin/bash
# ab.sh <patch> <outdir> <rounds>   — interleaved A/B: base, proto, base, proto, ...
set -u
ROOT=<repo root>
PATCH=$1; OUT=$2; ROUNDS=$3
mkdir -p "$OUT"; cd "$ROOT" || exit 1
applied=0
cleanup() { if [ "$applied" = 1 ]; then git apply -R "$PATCH"; applied=0; fi; }
trap cleanup EXIT INT TERM
git diff --quiet HEAD -- packages/core/src || { echo "src is not at HEAD; refusing"; exit 2; }
for i in $(seq 1 "$ROUNDS"); do
  for arm in base proto; do
    if [ "$arm" = proto ]; then git apply "$PATCH" && applied=1; fi
    { date +%T; uptime; } > "$OUT/$arm-$i.load-before"
    pnpm exec vitest bench --run --reporter=json --outputFile="$OUT/$arm-$i.json" \
      packages/core/bench/Evaluate.bench.ts > "$OUT/$arm-$i.log" 2>&1
    { date +%T; uptime; } > "$OUT/$arm-$i.load-after"
    cleanup
  done
done
git diff --quiet HEAD -- packages/core/src && echo "src restored to HEAD" > "$OUT/done.txt"
```

Edge cases handled: `trap` reverts the patch on interrupt; the guard refuses to start if `packages/core/src` already differs from HEAD (a leftover patch would otherwise make "base" a prototype); `done.txt` is written only when the tree is back at HEAD. Do not run Stryker, `pnpm check` or another bench in parallel (the CPU is the instrument). If the new `LeafNeeds.ts` is untracked rather than patched, `git apply -R` still removes it because the patch creates it (`git diff --no-index -- /dev/null packages/core/src/LeafNeeds.ts` is how the patch got the new file).

**Analysis** (`analyze2.mjs`, 35 lines; arm value = median of the three per-run values; band = max(10%, base spread)):

```js
// node analyze2.mjs <outdir>
import { readFileSync } from "node:fs";
const dir = process.argv[2];
const load = (arm, i) => {
  const j = JSON.parse(readFileSync(`${dir}/${arm}-${i}.json`, "utf8"));
  const m = new Map();
  for (const a of j.testResults[0].assertionResults) for (const b of a.benchmarks) for (const t of b.tasks)
    m.set(`${b.name} :: ${t.name}`, { min: t.latency.min * 1e6, p50: t.latency.p50 * 1e6, mean: t.latency.mean * 1e6 });
  return m;
};
const runs = { base: [1, 2, 3].map((i) => load("base", i)), proto: [1, 2, 3].map((i) => load("proto", i)) };
const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const spread = (xs) => (Math.max(...xs) - Math.min(...xs)) / med(xs);
for (const k of runs.base[0].keys()) for (const stat of ["min", "p50"]) {
  const b = runs.base.map((m) => m.get(k)[stat]), p = runs.proto.map((m) => m.get(k)[stat]);
  const bm = med(b), pm = med(p), band = Math.max(0.1, spread(b)), d = (pm - bm) / bm;
  console.log([k, stat, bm.toFixed(0), pm.toFixed(0), (d * 100).toFixed(1) + "%", (spread(b) * 100).toFixed(1) + "%", d > band ? "SLOWER" : "ok"].join("\t"));
}
```

(The session version also printed the literal mean-of-means table, `analyze.mjs`; replace `min`/`p50` with `mean` and take the arithmetic mean of the three instead of the median to reproduce it.)

**Three base runs at HEAD, spread and load.** The base arm of each A/B session is three runs at the phase base (with the new workloads). 1-minute load average at each run's start, P1 session: base 21.8, 44.9, 35.9; prototype 34.7, 54.9, 30.2. P2 session: base 20.8, 8.6, 19.4; prototype 12.0, 10.8, 17.0 (`uptime`, `sysctl hw.ncpu` = 12, Apple M3 Pro, macOS 26.6.2, Node v26.13.0). The load was unrelated `rustc` processes from another project on the same machine (`ps` showed one at 380% CPU), not this repo's work. Base spread of the **mean** per workload, (max−min)/mean over three runs: P1 session 67.6% to 134.2%, average 94.9%; P2 session 44.1% to 108.6%, average 66.2%. Base spread of the **per-run minimum**: P1 session 3.3% to 26.8% (≤ 10% on 33 of 35; the two exceptions are the 500-item `filter` at 10.3% and `decideSubjects` at 26.8%, both millisecond workloads), P2 session 1.7% to 9.8% (≤ 10% on 35 of 35).

**Results, per workload (per-run minimum, median of three; the band is max(10%, base spread of the minimum)).** Positive Δ = prototype slower. Existing workloads and the two new ones, 35 in all:

| Workload | base min (µs) [P1 run] | P1 Δmin | P1 base spread | base min (µs) [P2 run] | P2 Δmin | P2 base spread |
| --- | --- | --- | --- | --- | --- | --- |
| field-heavy — anyOf of 8 under Union | 8.50 | -1.0% | 7.8% | 8.33 | -2.5% | 5.0% |
| one node | 5.96 | -2.8% | 7.7% | 5.79 | -3.6% | 5.8% |
| anyOf First — 8, last allows | 7.50 | 4.4% | 7.8% | 7.42 | 0.0% | 2.8% |
| wide — allOf of 8 | 7.67 | -1.1% | 7.1% | 7.46 | -2.2% | 6.7% |
| rules DenyOverrides — 8 permits | 7.38 | 2.3% | 7.3% | 7.25 | -1.2% | 5.7% |
| rules PermitOverrides — 8 denies | 8.42 | 1.0% | 6.4% | 8.25 | -1.0% | 6.6% |
| anyOf Union — 8 | 7.75 | 0.0% | 7.5% | 7.58 | -2.7% | 3.3% |
| rules FirstApplicable — 8, last applies | 7.42 | 5.6% | 7.3% | 7.25 | 2.3% | 5.2% |
| deep — 10 levels | 10.29 | -2.0% | 8.5% | 10.13 | -2.1% | 4.5% |
| deep rules — 10 nested | 10.17 | -0.4% | 8.2% | 10.46 | -3.6% | 6.4% |
| wrapper-heavy — 10 nested labeled/not/obliged | 8.50 | -4.4% | 6.9% | 8.17 | -2.0% | 4.6% |
| **leaf-heavy — allOf of 8, matchers reference neither** | 8.79 | 1.9% | 3.3% | 8.83 | 0.0% | 5.2% |
| matcher-heavy — 3 refs | 10.96 | -1.9% | 6.1% | 10.88 | -2.7% | 5.0% |
| **leaf-heavy — allOf of 8, matchers reference action and resource** | 8.79 | 1.9% | 4.3% | 8.71 | 1.0% | 3.8% |
| obligation-heavy — allOf of 8 distinct obligations | 12.50 | -1.7% | 6.7% | 12.29 | -3.1% | 4.7% |
| resolver miss — one port call | 12.13 | -2.4% | 6.5% | 11.79 | -0.7% | 5.7% |
| field-heavy — allOf of 8 under Intersection | 17.04 | -0.5% | 5.1% | 16.96 | -1.0% | 1.7% |
| filter — 500 items / hasPermission | 4.30 ms | -6.8% | 10.3% | 4.09 ms | -2.2% | 5.9% |
| decideSubjects — 500 subjects / hasPermission | 5.85 ms | -11.6% | 26.8% | 5.11 ms | 1.7% | 9.6% |
| depth scaling / depth 5 | 12.29 | -4.4% | 6.1% | 11.96 | -4.9% | 5.2% |
| depth scaling / depth 10 | 17.00 | -3.7% | 6.6% | 16.63 | -3.0% | 3.8% |
| depth scaling / depth 20 | 26.50 | -3.6% | 5.3% | 26.00 | -3.7% | 4.3% |
| depth scaling / depth 40 | 44.96 | -2.1% | 5.7% | 44.88 | -3.9% | 5.2% |
| width scaling / width 4 | 9.00 | -4.6% | 7.4% | 8.96 | -5.6% | 6.5% |
| width scaling / width 8 | 10.75 | -3.9% | 7.4% | 10.71 | 0.8% | 5.1% |
| width scaling / width 16 | 14.50 | -5.2% | 7.5% | 14.04 | 1.5% | 3.9% |
| width scaling / width 32 | 21.54 | -4.8% | 6.8% | 20.42 | 3.3% | 7.1% |
| wide, concurrency / unbounded | 8.08 | -4.1% | 6.7% | 7.75 | 3.8% | 7.5% |
| wide, concurrency / sequential | 7.75 | -4.3% | 7.0% | 7.46 | 2.2% | 5.6% |
| anyOf Union 8, concurrency / unbounded | 8.21 | -6.6% | 6.1% | 7.75 | 3.8% | 9.1% |
| anyOf Union 8, concurrency / sequential | 7.79 | -4.8% | 8.0% | 7.46 | 3.4% | 8.9% |
| rules DenyOverrides 8, concurrency / sequential | 7.54 | -5.0% | 6.6% | 7.04 | 4.7% | 8.3% |
| rules DenyOverrides 8, concurrency / unbounded | 9.96 | -3.8% | 5.4% | 9.33 | 5.4% | 7.6% |
| filter — 500 items, concurrency / unbounded | 4.35 ms | -6.0% | 7.9% | 4.13 ms | 4.6% | 9.8% |
| filter — 500 items, concurrency / sequential | 4.23 ms | -5.5% | 9.7% | 4.05 ms | 5.0% | 8.9% |

**Verdict on the per-run minimum:** workloads slower than their band: **0 of 35** in both sessions. Geometric mean Δmin: −2.68% (P1), −0.29% (P2). Worst: +5.6% (`rules FirstApplicable`, band 10%) and +5.4% (`rules DenyOverrides 8, concurrency: unbounded`, band 10%). Per-run median (p50): 0 of 35 slower than band in both sessions too. The two leaf-heavy workloads, the ones that exercise the replaced checks, are +1.9%/+1.9% (P1) and 0.0%/+1.0% (P2). P2 trends a few percent slower on the concurrency rows than P1 and not faster anywhere; the module-local-alias variant buys nothing, so P1 is the shape to build.

**Verdict on D-03's literal statistic (mean of means), recorded because the ADR must say what was measured:**
- P1 session: 0 of 35 workloads regressed, but every one "improved" by 20% to 50% (geometric mean −32.45%): the base arm's three runs simply ran at higher load than the prototype's. The bands were 67.6% to 134.2% wide, so the gate cannot fail.
- P2 session: **5 of 35 regressed** (`field-heavy — anyOf of 8 under Union` +544.7%, `obligation-heavy` +527.6%, `resolver miss` +462.3%, `anyOf Union — 8` +53.8%, `rules DenyOverrides 8, concurrency / sequential` +81.5%), all from one run: `field-heavy — anyOf of 8 under Union`, prototype run 2: mean 191.3 µs, min 8.75 µs, p99 45.9 µs, 5,280 samples; the other five runs of the same workload: means 8.6, 8.8, 8.8, 8.8, 14.7 µs, ~113,000 samples. A stall, not a regression: its own minimum is 8.75 µs.

So the same prototype class "passes" and "fails" the literal gate depending on which run stalled. The statistic that is stable here is the per-run minimum, which ADR-QD-073's addendum already identified as "the one statistic the load barely moves" and used for the same reason. See Open Question 1.

**Outcome for LEAF-01 (research evidence, not the record):** pursue. The executor re-runs the A/B in its first plan, on the committed workload, and writes ADR-QD-163 from those numbers. If its re-run on a quieter host shows a workload over its band, D-04 applies.

### Q6. The exhaustive table test and the agreement property

**What exists today (INV-QD-011).** `Evaluate.test.ts` holds eight `MissingAction` assertions, among them `:1414` "a missing resource wins over a missing action on HasResourceAttribute" (the only observable order cell) and `:1427` "the same rule holds for a subject attribute matcher"; `Predicate.test.ts:412` "INV-QD-011: reading an absent action fails" (three leaves) and the test after it, "HasAction's MissingAction carries the action it named"; `Errors.test.ts` (4), `SinkCodec.test.ts` (10) and `EvaluationMetrics.test.ts` (1) pin the error classes and codec. `spec/traceability.md:92` maps INV-QD-011 to `Evaluate.test.ts` and `Matcher.test.ts`. Two agreement properties exist (INV-QD-058): `Predicate.test.ts:971` "the two interpreters agree, row by row" and `:1239` "a translation that succeeds agrees with the evaluator on every row, and a failure is typed". They compare verdicts and failure *labels* (`labelOfError` renders `MissingAction:${String(error.expected)}`), never the order in which two absences are reported, and never over the resource.

**Enumerating the leaf tags without `leafTags`** (Phase 51 deletes `Decision.ts:418`): a typed record `FIXTURES: { readonly [K in LeafTag]: ReadonlyArray<Fixture> }` makes a new leaf without fixtures a compile error (TS2741, the same mechanism as the table), and `Object.keys(P.leafCases(() => 0))` gives the runtime key set for the "one row per leaf tag" test (`leafCases` is public Policy API, `Policy.ts:1170`, pinned by `Policy.test.ts:1112` and `Policy.tst.ts:97`).

**Sketch, written and run this session** (copies in the scratchpad; the essentials are here because the scratchpad is ephemeral). The oracle is the D-05 rule written **independently of `LEAF_NEEDS`**, from per-fixture facts, so a wrong table row cannot hide behind a test that reads the same row:

```ts
// packages/core/test/LeafMatrix.test.ts — uses evaluate/toPredicate only
type LeafTag = LeafPolicy["_tag"];
interface Fixture {
  readonly tag: LeafTag;
  readonly policy: P.Policy;
  readonly own: "Nothing" | "Action" | "Resource";
  readonly refs: "none" | "action" | "resource";
  /** What the failure carries: attribute, or the relation/event/meaning of a scoped read. */
  readonly name: string;
  readonly expected?: string;
  readonly scoped: boolean;
}
const FIXTURES: { readonly [K in LeafTag]: ReadonlyArray<Fixture> } = { /* 21 fixtures: every tag, matcher-reference variants, both scopes */ };

type ResourceShape = "none" | "no-id" | "id";
const SHAPES: Readonly<Record<ResourceShape, Record<string, unknown> | undefined>> = {
  none: undefined, "no-id": { owner: "u-1", other: "x" }, id: { id: "r1", owner: "u-1", other: "x" },
};

const oracle = (f: Fixture, action: boolean, shape: ResourceShape): string => {
  const resource = shape !== "none";
  if (f.own === "Action" && !action) return `Action:${f.expected ?? "-"}`;
  if (f.own === "Resource" && !resource) return `Resource:${f.name}`;
  if (f.refs === "action" && !action) return "Action:-";
  if (f.refs === "resource" && !resource) return `Resource:${f.name}`;
  if (f.scoped && shape !== "id") return `ResourceId:${f.name}`;
  return "ok";
};
// test 1: for every fixture × action ∈ {false,true} × shape ∈ SHAPES, evaluate(...) fails with
//         labelOf(error) === oracle(...)  (126 cells + the cell-count guard `assert.isAbove(cells, 100)`)
// test 2: for every fixture × action, if either toPredicate or evaluate (resource = the `id` shape) fails
//         with an Action absence, both fail with the same label (toPredicate has no resource to be missing).
```

```ts
// packages/core/test/LeafNeeds.test.ts — imports LeafNeeds.ts, so RED on the base (module absent)
it("has one row per leaf tag", () =>
  assert.deepStrictEqual(Object.keys(LEAF_NEEDS).sort(), Object.keys(P.leafCases(() => 0)).sort()));

it("absenceOf says what the oracle says, for every leaf, action and resource", () => { /* same fixtures, resource ∈ {none,id}, oracle with scoped:false */ });

it.effect("a row's resourceId is what readScoped does: Never / Always / ByScope", () => Effect.gen(function* () {
  for (const fixtures of Object.values(FIXTURES)) for (const f of fixtures) {
    const need = LEAF_NEEDS[f.tag].resourceId;
    for (const shape of ["none", "no-id", "id"] as const) {
      const exit = yield* Effect.exit(evaluate(f.policy, { action: "read", ...(SHAPES[shape] === undefined ? {} : { resource: SHAPES[shape] }) }).pipe(Effect.provide(layer)));
      const refused = Exit.isFailure(exit) && Cause.squash(exit.cause) instanceof MissingResourceId;
      const claimed = need === "Always" || (need === "ByScope" && f.scoped);
      const earlier = Exit.isFailure(exit) && !(Cause.squash(exit.cause) instanceof MissingResourceId);
      if (!earlier) assert.strictEqual(refused, claimed && shape !== "id", `${f.policy._tag} ${need} ${shape}`);
    }
  }
}));

it("an Action absence that names no action carries no `expected` key", () => {
  assert.isFalse(Object.hasOwn(errorOf({ _tag: "Action" }), "expected"));
  assert.strictEqual(errorOf({ _tag: "Action", expected: "read" }).expected, "read");
});
```

**Results of running the sketch** [VERIFIED: `pnpm exec vitest run --project core …`, this session]:
- On the phase base: `LeafMatrix.test.ts` 2 passed (a characterisation, green, as WX-06 wants for preserved behaviour). `tsc -p tsconfig.test.json` clean after two typing fixes (a `tag` field on `Fixture` instead of indexing by `policy._tag`; conditional spread for `resource`, because `exactOptionalPropertyTypes` rejects `resource: undefined`).
- With the prototype applied: `LeafMatrix.test.ts` and `LeafNeeds.test.ts` 8 passed (the two files' tests; the count is 8 rather than 6 because the sketch imports its fixtures from the other `.test.ts` and re-registers its `describe`: **put fixtures in a non-test module**, e.g. `packages/core/test/LeafFixtures.ts`).
- **Negative control** (is the pin real?): swapping the two checks in `Walk.ts`'s `HasResourceAttribute` arm (action first) failed both the sketch (`HasResourceAttribute action=false resource=none: expected 'Action:-' to equal 'Resource:owner'`) and the existing `Evaluate.test.ts > a missing resource wins over a missing action on HasResourceAttribute` (`expected 'MissingAction' to equal 'MissingResource'`). The tree was restored (`git checkout -- packages/core/src/Walk.ts`).

**RED-first plan, stated honestly (WX-06, D-05, D-11).** Nothing about the order rule is RED on the base, because the base already satisfies it: the rule is preserved, so the matrix is a characterisation written on the base and green there. The genuinely RED assertions are exactly two: (a) every `LeafNeeds.test.ts` test, RED on the base by *module not found*; (b) if Open Question 3 resolves to unification, `Object.hasOwn(error, "expected") === false` over `toPredicate`'s three `NeedAction` failures, RED on the base (the key is present). Recommended commit order: (1) bench workloads + `LeafFixtures.ts` + `LeafMatrix.test.ts` + the `expected`-key test (RED), all on the base; (2) `LeafNeeds.ts` and `LeafNeeds.test.ts` (RED by import), then the wiring turns everything green. A claim in a plan that "a RED test pins the order rule" would be false and the plan-checker should reject it.

### Q7. Mutation evidence (WX-05)

**Config.** `stryker.config.mjs`: `testRunner: "vitest"`, `coverageAnalysis: "perTest"`, `ignoreStatic: true` (ADR-QD-076: module-scope literals such as the table are not mutated), `mutate: ["packages/core/src/**/*.ts", "!packages/core/src/index.ts"]`, `thresholds: { high: 90, low: 80, break: 80 }`, `timeoutMS: 20000` (a Timeout counts as detected, so a loaded machine can *raise* the score; run it alone). Reports go to `reports/mutation/` (`.gitignore`: `reports/*`).

**Exact command** (Phase 47's plan used the same `--mutate` form for its close):

```bash
pnpm exec stryker run --mutate 'packages/core/src/Walk.ts,packages/core/src/Predicate.ts,packages/core/src/PortAccess.ts'
```

and, at close, the same plus `packages/core/src/LeafNeeds.ts`. **Run time: 1 min 40 s** at the base (667 mutants, 4.72 tests per mutant) and 55 s for 718 mutants with the prototype (warm cache). Ran in the foreground, alone, never concurrent with a bench.

**Scores at HEAD** [VERIFIED: Stryker output, this session, `reports/mutation/mutation.json` copied to the scratchpad]:

| File | Base: killed / survived / no cov / ignored | Base score | Prototype + sketch tests |
|------|-------------------------------------------|------------|--------------------------|
| `Walk.ts` | 307 / 13 / 3 / 16 | **95.05%** | 292 killed, 13 survived, 3 no cov: **94.81%** |
| `Predicate.ts` | 298 / 0 / 0 / 22 | **100%** | 293 killed: 100% |
| `PortAccess.ts` | 46 / 0 / 0 / 17 | **100%** | 47 killed: 100% |
| `LeafNeeds.ts` (new) | — | — | 52 killed, 1 survived: **98.11%** |
| All four | 651 killed, 13 survived, 3 no cov (97.60%) | | 684 killed, 14 survived, 3 no cov (97.57%) |

(Older recorded scores, for orientation only: `.planning/milestones/v1.2-phases/22-scoped-port-read/22-mutation-after.json` has `Walk.ts` 0.9507692307692308, `Predicate.ts` 1, `PortAccess.ts` 1.)

**The `Walk.ts` survivors are not in the leaf arms and are the same set before and after.** Base: nine `ArithmeticOperator` `depth - 1` (`:415`, `:430`, `:448`, `:567`, `:587`, `:704`, `:718`, `:807`, `:832`), two `ObjectLiteral` `{}` (`:719`, `:836`), one `StringLiteral` `""` (`:243`), one `ConditionalExpression` `false` (`:305`), plus NoCoverage at `:305`, `:442`, `:494`. With the prototype the same classes land on `:247`, `:309`, `:424`, `:476`, `:701`, `:818` and the `depth - 1` set, 13 survived and 3 no-coverage as before. No mutant survives in the `HasPermission`/`HasRole`/`HasAttribute`/`HasResourceAttribute`/`HasAction` arms on either side.

**Two things for the plan to rule on.**
- **WX-05's arithmetic.** `Walk.ts` falls 95.05% → 94.81% with the identical survivor set, because 15 *killed* mutants left with the deleted checks (307/323 → 292/308). WX-05 reads "The Stryker score of touched files does not fall … a drop is closed with a test, never re-baselined". No test can close this drop (no new survivor exists). See Open Question 4.
- **One equivalent mutant in the new file.** `LeafNeeds.ts:87` `isActionLeaf`: `LEAF_NEEDS[leaf._tag].own === "Action"` → `true` survives because `isActionLeaf` is only called under `need.own === "Action" && !supplied.action`, where the only reachable leaf is `HasAction`, so the `: MISSING_ACTION` fallback beside it is dead code. `stryker.config.mjs` states "A survivor that cannot be killed is a finding to record, not a number to suppress". Either record it in ADR-QD-163/CCR-QD-441 or restructure so the narrowing does not repeat the table's own check (e.g. a typed `actionAbsenceOf(leaf: ActionLeaf, …)` for the one own-action leaf); any form that re-derives a condition from the row yields an equivalent mutant, so recording it is the cheaper truth.

**The `resource ?? NO_RESOURCE` line** (Pitfall 3) produced no surviving mutant on the prototype: the `??` and the `{}` fallback are either killed by the matrix or static (`NO_RESOURCE` is module scope, `ignoreStatic`).

**Baseline file.** WX-05's `NN-mutation-base.json` precedent (`.planning/phases/QD-49-…/49-mutation-base.json`): `{ "measured": { "<path>": <score 0..1>, … }, "unmeasured": { "<path>": "<reason>" }, "new": ["packages/core/src/LeafNeeds.ts"], "deleted": {}, "moved": {} }`, written by a node one-liner that reads `reports/mutation/mutation.json` (46-01's writer, retargeted; its full text is in `47-01-PLAN.md` line 163). For this phase: `measured` = the three base scores above (0.9507692307692308 is the older figure; the fresh one is 307/323 ≈ 0.9505), `new` = `LeafNeeds.ts`, `unmeasured` = the barrel only if touched (it is not).

### Q8. Spec records

All reserved ids are free: `grep` found `BEH-QD-586..590`, `INV-QD-345`, `INV-QD-346` and `CCR-QD-441` nowhere under `spec/`, `AGENTS.md`, `.changeset`, `packages/core/{src,test,bench}`, and `ARCH-97`/`ADR-QD-163` only inside the bench-file edit I made (reverted). The last used are `BEH-QD-585` (`28-devtools-screens.md:2016`), `INV-QD-344` (`invariants.md:3975`), `CCR-QD-440` (`spec/README.md:377`), `ADR-QD-162`. **Never run `scripts/next-id.mjs`** (WX-02).

| Record | Where | Shape (precedent read this session) |
|--------|-------|-------------------------------------|
| **ADR-QD-163** | `spec/decisions/163-<slug>.md` + an `index.yaml` entry | Entry: `- id: "ADR-QD-163"` / `file: "163-….md"` / `title: "…"` / `status: "Accepted — …"` (ADR-QD-162's entry is the last, `index.yaml` tail). File: `# ADR-QD-163 — <title>`, a `> **Document Control**` table (`Document ID QADI-ADR-163`, `Revision 1.0`, `Effective Date 2026-11-16`, `Status`, `Author Qadi Engineering`, `Classification Architecture Decision Record`, `Change History`), then `## Context`, `## Decision`, `## Alternatives rejected` (or `considered`), `## Consequences`, `_Related:_`. Suggested status: `Accepted — reads ADR-QD-024, ADR-QD-100, ADR-QD-134; applies ADR-QD-152; keeps ADR-QD-034`. |
| **Pursue path** | ADR-QD-163 Decision | Follow ADR-QD-092 (b): state the gate *before* the numbers, give the numbers as ranges (its figures were taken "under the user's own builds (load average 7–160), so as ranges and medians, not figures"), per-workload, then "Both conditions held, so the table was taken." Quote the machine load. |
| **Rejection path** | ADR-QD-163 + `.planning/REQUIREMENTS.md` | Shape: ADR-QD-073's addendum "a single child-walk driver was measured and not adopted" — headings `What was proposed.` / `What was measured.` / `Result: DROP, under the gate's own … rule.` / `What the noise does not hide.` / `What would justify reopening it.`, closing "A new argument is not enough; it needs a new measurement." Rejection-path REQUIREMENTS edit: append ` — Not pursued (measured): ADR-QD-163.` to LEAF-02..05 (`REQUIREMENTS.md:85`, `:90`, `:91`, `:92`) and change their traceability rows (`:180-183`) from `Pending` to `Not pursued (measured)`. No precedent for the literal annotation exists beyond LEAF-01's own sentence (`:84`); the planner fixes the exact wording once. The new bench workload stays (D-04); no `packages/*/src` change; no changeset. |
| **CCR-QD-441** | `spec/README.md`, a new table row after `:377` (`| CCR-QD-441 | 2026-11-16 | <files with their new Rev> | ARCH-97. **<title>.** <prose> |`) and the file's own Revision/Change History (bump with `node scripts/spec-revise.mjs spec/README.md "CCR-QD-441: …"`) | Row convention: files touched with revision numbers (`` `spec/behaviors/10-actions.md` Rev 1.N ``), new files marked `(new, Rev 1.0)`, code files listed, then `ARCH-97.` and a bolded sentence. WX-02: if ADR unused, name it "Unused" in the row. |
| **INV-QD-345** | `spec/invariants.md`, after `:3975-3985` (INV-QD-344) | `## INV-QD-345: <statement>` then one paragraph, `**Source**:` (file list), `**Implication**:`, `**Enforcement**:` (committed test files), `**Related**:` (BEH and ADR links). D-12: "the table covers every leaf tag". `INV-QD-346` is reserved but D-12 assigns it nothing; either state the order rule there ("a leaf's own input is checked before what its matcher references") or leave it unused and say so in the CCR row. INV-QD-011 stays and is **pinned, not duplicated**. |
| **INV-QD-011 `Source` paragraph** | `spec/invariants.md:325-345` | It names `Walk.ts` and "`HasAttribute` and `HasResourceAttribute` ask `referencesAction` **before** running their matcher". On the pursue path that sentence becomes false (the checks move to `LeafNeeds.ts`); amend `Source` and bump the revision. The rationale ("`evaluateMatcher` is total by design (BEH-QD-028)") stays true. |
| **BEH-QD-586..590** | existing behaviour files (no new file, so no `spec/behaviors/index.yaml` entry; it lists files, not each id) | `## BEH-QD-NNN: <title>`, a fenced `REQUIREMENT:` block, prose; bump each file with `spec-revise.mjs`. Suggested placement: 586 the order rule and 587 "an absent action is reported the same way by both interpreters" beside `BEH-QD-076` in `10-actions.md:79`; 588 "the table states which leaves ask a port about one resource, and `readScoped` enforces it" beside `BEH-QD-445` in `30-port-calls.md:145`; 589 "a leaf's port-free judgement is written once"; 590 "the table has one row per leaf tag" in `05-evaluator.md` (or `31-predicate-compilation.md`, last ids `BEH-QD-306`). Discretion; five ids are reserved and need not all be used. |
| **Traceability** | `spec/traceability.md` | Add: an ADR row (style of `:330-332`), an INV row (style of `:92`), rows for each new test file (style of `:370-385`: `\| \`packages/core/test/LeafNeeds.test.ts\` \| BEH-QD-…, INV-QD-345 \|`), and a Change History entry (bump with `spec-revise.mjs`). `bash spec/scripts/verify-traceability.sh --strict` and `pnpm spec:verify:strict` check structure; `node scripts/spec-revise.mjs --check` checks Revision == newest Change History. |
| **Doc examples** | `spec/overview.md` | No row: `LeafNeeds.ts` is package-private. Any ```` ```typescript ```` fence added to a behaviour doc is compiled by `scripts/check-doc-examples.mjs` and must import what it uses. |
| **AGENTS.md** | — | **Nothing in it becomes false** on the pursue path: §5's list of port reads in `PortAccess.ts` and its `readScoped` mention keep their location; §5a's switch table keeps `Walk.ts — evaluateNode`; `UNTRACED_BUDGET` and `SWITCH_BUDGET` are unchanged. D-12's "AGENTS.md edited only if a cited location moves" resolves to no edit. (If a plan adds a *table* of budgets or a new house-style rule, AGENTS.md and `check-house-style.mjs` change together, §15.) |
| **Changeset** | `.changeset/<name>.md` | Pursue path only: `"@qadi/core": patch`. The prototype changes no public export or outcome, apart from the `expected` own key on three `toPredicate` failures if Open Question 3 is "unify" (invisible on the wire, but record it in the body). Nothing is released (memory: no releases). |

**ADR constraints the plan must not violate** (read this session):
- **ADR-QD-024 / ADR-QD-100 amendment (2026-10-08):** `toPredicate` is a second interpreter with its reference semantics; "Only admission is shared, never the walk". This phase shares *facts about leaves*, not the traversal; the two walks stay two. The closer precedent is ADR-QD-077 ("both interpreters read ports through one module"): sharing a read, not a walk.
- **ADR-QD-134:** `readScoped` is the one resource-scoped read and raises `MissingResourceId` on the port's own span; the table states the need but must not take over the enforcement.
- **ADR-QD-034 / `house-rules-evidence.md` §2:** a `switch` beats a hoisted `Match` per dispatch; a change next to `evaluateNode` is benchmark-gated. **ADR-QD-092:** the table-vs-switch gate used three runs, ≤ 10% on the mean of means, reported under load 7 to 160 as ranges and medians. **ADR-QD-073 addendum:** when `N_w` (the noise of an identical control) exceeds 10% the result is inconclusive and a second inconclusive result counts as DROP "because the burden of proof is on the change"; the per-run minimum is the statistic the load barely moves.
- **ADR-QD-152:** keyed tables derive types from keys; excess and missing keys are compile errors.

Q9 and Q10 are the `Validation Architecture` and `Security Domain` sections below.

## Common Pitfalls

### Pitfall 1: The literal mean-of-means gate cannot fail, or fails on one stall
**What goes wrong:** On a host shared with other builds (load 8.6 to 54.9 here) the mean of a nine-microsecond workload moves 44% to 134% between identical runs, and one stalled run (mean 191 µs, 5,280 samples) outweighs the other five (Q5). The literal D-03 gate then "passes" an arbitrary change (P1, bands of 68% to 134%) or "rejects" an innocent one (P2, five workloads at +54% to +545%).
**Why it happens:** the mean includes every scheduler stall; the minimum does not.
**How to avoid:** gate on the median of per-run minima with D-03's own band (max(10%, base spread of the minimum)); record `latency.mean`/`p50` beside it; log `uptime` per run; keep one base arm per session so base and prototype share conditions (ADR-QD-073's "interleaved" rule, which the script enforces).
**Warning signs:** base spread above 10% on the gate statistic for more than a handful of workloads (ADR-QD-073: that is "inconclusive", and a second inconclusive result is a DROP); a prototype that is "faster everywhere" (it is load, not code).

### Pitfall 2: A half-applied patch makes "base" a prototype
**What goes wrong:** an interrupted A/B leaves `LeafNeeds.ts` and three edited files in the tree; the next "base" run measures the prototype and the verdict is meaningless.
**How to avoid:** `trap cleanup EXIT INT TERM`, the `git diff --quiet HEAD -- packages/core/src` guard at start, and `done.txt` only when restored (all in `ab.sh`). End every session with `git status --short` showing only intended changes.

### Pitfall 3: The reader cannot narrow `resource`, and the obvious fix restates the rule
**What goes wrong:** `absenceOf` returns `ActionAbsence | ResourceAbsence | undefined`; after `if (absent !== undefined) return …` TypeScript still types `resource` as `Resource | undefined`. The first draft added `if (resource === undefined) { … }` for the compiler, which restates the check, can never run, and breeds equivalent mutants.
**How to avoid:** `const row = resource ?? NO_RESOURCE;` with a one-line comment ("`absenceOf` has ruled out an absent resource; the `??` is the type's") and `NO_RESOURCE` at module scope (static, so not mutated). Measured: no surviving mutant at that arm (Q7).

### Pitfall 4: An overload-free reader widens `toPredicate`'s error channel
**What goes wrong:** one signature `(leaf, supplied) => Absence | undefined` forces `toPredicate`'s `RunError` (`AttributeResolveError | DecisionHistoryUnavailable | MissingAction`, `Predicate.ts:294`) to gain `MissingResource`, and `Walk`'s channel to gain `MissingResourceId`.
**How to avoid:** `Supplied<Resource extends boolean>` with an overload for `Supplied<true>` (returns `ActionAbsence | undefined`), and `errorOf` overloads per absence kind. Verified: `tsc` clean with both interpreters' channels unchanged.

### Pitfall 5: `expected: undefined` and a missing `expected` are different own properties
**What goes wrong:** `new MissingAction({ expected: undefined })` (today's `toPredicate`) and `new MissingAction({})` (today's `Walk`) are `Equal`-different own-key shapes, invisible after a JSON round trip and invisible to `String(error.expected)`, and visible to `Object.hasOwn` and to `assert.deepStrictEqual` on the error object. A table-driven mapper must choose one; the prototype chose "omit" for both (`errorOf`'s ternary).
**How to avoid:** decide (Open Question 3) and pin with `Object.hasOwn` in `LeafNeeds.test.ts`.

### Pitfall 6: Reading `LEAF_NEEDS[tag]` with an untrusted tag
**What goes wrong:** `LEAF_NEEDS["toString"]` is an inherited function, so `need.own` is `undefined` and the leaf reads as "needs nothing" (fail-open). The five arms dispatch on a known tag first, so the reader is safe today; a future caller passing a decoded, unvalidated `_tag` would not be (compare `fieldStrategyLaws`, ADR-QD-092 (b), which reads through `Object.hasOwn` and answers a fail-closed row).
**How to avoid:** keep the reader unexported from the barrel and called only from the leaf arms; if it ever takes an untrusted tag, read through `Object.hasOwn` and add a fail-closed row.

### Pitfall 7: Depending on `leafTags` or on the order of `Object.keys(LEAF_NEEDS)`
**What goes wrong:** Phase 51 deletes `leafTags` (`Decision.ts:418`) and edits `Policy.ts`; a test importing either breaks.
**How to avoid:** enumerate through the typed `FIXTURES` record and sort `Object.keys(P.leafCases(() => 0))` before comparing.

### Pitfall 8: Re-exporting fixtures from a `.test.ts`
**What goes wrong:** importing one test file from another re-registers its `describe` (8 tests ran instead of 6).
**How to avoid:** fixtures in `packages/core/test/LeafFixtures.ts`.

### Pitfall 9: Running Stryker or `pnpm check` during a bench
**What goes wrong:** both saturate the CPU; a Timeout counts as "detected", so contention can inflate the mutation score too.
**How to avoid:** one measurement at a time, in the foreground; the wave brief already says so.

## Code Examples

The module, both interpreters' call sites, the compile-error proofs, the A/B script and analysis, and the test sketches are in Q3 to Q6 above (all compiled and run in this session). Two further patterns:

### Walk's leaf arm after the change (what the benchmark measures)
```ts
// Source: prototype P1, packages/core/src/Walk.ts (reverted after measurement)
case "HasAttribute": {
  const absent = absenceOf(policy, request.supplied);
  if (absent !== undefined) return Effect.fail(errorOf(absent));
  return Effect.map(readAttribute("evaluate", subject, policy), (value) => { /* unchanged */ });
}
```
One property load on a module-scope table (`LEAF_NEEDS[leaf._tag]`), two boolean tests, and the two `referencesAction`/`referencesResource` calls the base made anyway when the matcher could reference them; one small `Supplied` object per evaluation.

### Per-session bench hygiene
```bash
git diff --quiet HEAD -- packages/core/src && echo "src == HEAD"   # before and after every arm
uptime                                                              # log, do not wait for quiet
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| A fact written per arm, per interpreter | A keyed `as const satisfies` table read through one function (`GateState.ts`, `HydrationMetrics.ts`, `FieldLattice.ts`) | ADR-QD-152 (Phase 49), ADR-QD-092 | A new leaf without a row is TS2741; this phase applies it to leaf needs |
| Benchmark gate on the mean | Gate on the per-run minimum when the host is shared (ADR-QD-073 addendum) | 2026-10-05 | Why Open Question 1 exists |
| `leafTags` (a second tag list) | `leafCases` and typed records | Phase 51 deletes `leafTags` | Do not depend on it |

**Deprecated/outdated:** the end-to-end "2 to 4% / under 1%" switch-vs-`Match` figures in AGENTS.md §5a (CCR-QD-119); cite the per-dispatch ratios only.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The user accepts the per-run minimum (median of three runs) as the gate statistic in place of D-03's mean of means | Q5, Open Question 1 | If not, the gate cannot be run meaningfully on a shared host; the plan must supply a quiet machine or a different statistic |
| A2 | A quieter host at execution time will give base spreads of the minimum at or below 10% on every workload, as the P2 session did | Q5 | If not, ADR-QD-073's "inconclusive" rule (second inconclusive counts as DROP) may apply and D-04's rejection path would be taken for want of evidence |
| A3 | Phase 51 deletes `Decision.ts` `leafTags` and edits `Policy.ts` only for arity (from CONTEXT D-09 and the brief) | Q2, Pitfall 7 | Tests built on `leafCases` would need a different enumeration |
| A4 | Placement of BEH-QD-586..590 across `10-actions.md`, `30-port-calls.md`, `05-evaluator.md` | Q8 | Cosmetic; any home passes `verify-traceability` if mapped |
| A5 | The `ReadSite = { subject, resource }` and "a matcher holds at most one ref" facts, read from `PortDescription.ts` and `Matcher.ts` earlier in this session before its context was compacted, hold at HEAD | Q1 | If a port read took the action, the table would need a fourth `own`/`resourceId` combination |
| A6 | The executor's `pnpm check:pr < /dev/null` is green on the prototype (not run here: only its parts, `tsc`, `oxlint` + house-style, `madge`, and the whole core suite, were) | Validation | A gate outside those parts (BDD, spec gates, API surface, package install, website) could fail; none is expected because no export or spec text changes before the records phase |

## Open Questions

1. **Gate statistic (D-03 amendment) — needs a user decision.**
   - What we know: the literal mean of means is unusable on this host (spread 44% to 134%; P1 and P2 gave opposite verdicts from one stalled run); per-run minima are stable (≤ 10% spread on 33/35 and 35/35 workloads) and are what ADR-QD-073's addendum used; on them both prototypes pass with a worst case of +5.6%.
   - What's unclear: whether the user wants the min rule written into ADR-QD-163 as the gate (recommended), or a quiet machine / re-run policy with the mean kept.
   - Recommendation: amend D-03 to "median of per-run minima, band = max(10%, base spread of the minima), mean and p50 recorded beside it"; the executor reports both.

2. **D-08's `ResourceId` variant versus D-06.**
   - What we know: the reader cannot know a resource's id is missing at the port read (the id is derived in the port module from the site's resource, and enforcement must stay in `readScoped` so the span is annotated first).
   - What's unclear: whether D-08's "reader returns `ResourceId { relation }`" means the *union* has the variant (used by `readScoped` through `errorOf`) or that the reader itself returns it.
   - Recommendation: the union has it, `errorOf` maps it, `readScoped` builds its error through it; the reader never returns it; the row's `resourceId` field is tied to `readScoped` by a test. This is what was built and measured.

3. **The three `expected`-key cells in `toPredicate`.**
   - What we know: base `toPredicate` writes an own `expected: undefined`; `Walk` omits the key; D-08 says "omitted … as today". The prototype omits in both. Wire-invisible and invisible to the existing agreement property.
   - What's unclear: unify (recommended; one mapper, one behaviour; RED-first via `Object.hasOwn`) or preserve (the mapper would need an `expectedKey` mode to reproduce the difference, which is exactly the per-arm drift the phase removes).
   - Recommendation: unify and record it in BEH and the changeset body.

4. **WX-05 and `Walk.ts`'s score.**
   - What we know: 95.05% → 94.81%, identical 13 survivors and 3 no-coverage, none in a leaf arm; the fall is arithmetic (15 killed mutants removed).
   - What's unclear: whether WX-05 ("does not fall") is satisfied by "no new survivor, survivor set unchanged".
   - Recommendation: record the survivor set in `50-mutation-after.json` and the CCR row as unchanged; do not add a test (there is nothing to kill) and do not re-baseline the file score.

5. **RED-first wording (D-05, WX-06).** Nothing about the order rule is RED on the base (Q6). Confirm that the characterisation matrix (green on the base) plus the `expected` RED cell plus the module-absent RED satisfy "a RED-first test … pins the rule", or say what else is wanted.

6. **INV-QD-346.** Reserved, unassigned in D-12. Suggest: the order rule ("own input before matcher reference"); or leave unused and say so.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | ✓ | v26.13.0 | — |
| pnpm | scripts | ✓ | 10.17.1 | — |
| vitest (+ bench) | tests, A/B | ✓ | 5.1.0 | — |
| Stryker + vitest-runner | WX-05 | ✓ | 10.1.1 | — |
| tsc (tsgo) | typecheck, compile proofs | ✓ | 7.0.2+effect-tsgo.0.67.5 | — |
| git (`apply`, `diff --no-index`) | A/B swap | ✓ | (system) | — |
| `uptime`, `sysctl`, `ps` | load logging | ✓ (macOS) | — | `top -l 1` |
| A quiet machine (1-minute load < 3) | a clean gate | ✗ here (8.6 to 54.9 throughout; other projects' builds) | — | per-run minima (Q5); log the load |
| `gsd_run` / package legitimacy seam | — | not needed (no packages) | — | — |

**Missing dependencies with no fallback:** none. **With fallback:** the quiet machine (use the minimum statistic and log the load).

## Validation Architecture

> `workflow.nyquist_validation: true`, `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"` in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 with `@effect/vitest` (`it.effect`, `assert`); `fast-check` for properties; `tstyche` for `*.tst.ts` type tests |
| Config file | `vitest.config.ts` (root), `packages/core/vitest.config.ts`; `stryker.config.mjs`; `tsconfig.test.json` |
| Quick run command | `pnpm exec vitest run --project core packages/core/test/LeafMatrix.test.ts packages/core/test/LeafNeeds.test.ts` (≈ 0.3 s) |
| Full suite command | `pnpm exec vitest run --project core` (2418 tests, 4.6 s) then `pnpm check:pr < /dev/null` (WX-01; not run here) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEAF-01 | A/B numbers per workload; pursue or reject | benchmark script (manual-only by design: a timing threshold is "a tool a reviewer runs, not a merge gate", ADR-QD-073) | `bash ab.sh <patch> <outdir> 3 && node analyze2.mjs <outdir>` (≈ 5 min); smoke that the new workloads run: `pnpm exec vitest bench --run packages/core/bench/Evaluate.bench.ts` (≈ 44 s) | ❌ Wave 0 (script from Q5; workloads from the bench patch) |
| LEAF-02 | One row per leaf; reader says what the rule says; row's `resourceId` ties to `readScoped` | unit + compile | quick run command; `pnpm typecheck` (TS2741 on a missing row) | ❌ Wave 0 `LeafNeeds.test.ts`, `LeafFixtures.ts` |
| LEAF-03 | Order rule preserved, every cell | characterisation | `pnpm exec vitest run --project core packages/core/test/LeafMatrix.test.ts`; existing `Evaluate.test.ts` `-t "a missing resource wins"` | ❌ Wave 0 `LeafMatrix.test.ts` (sketch ran green on the base) |
| LEAF-04 | Judgement written once; reasons unchanged | unit | `Evaluate.test.ts` reason assertions (existing) + a `LeafNeeds.test.ts` row for `holdsRole/holdsPermission/holdsAction` | partly ✅ (existing reasons), ❌ new rows |
| LEAF-05 | Exhaustive table test pins INV-QD-011; budgets unchanged | unit + gate | quick run; `pnpm lint` (`check-house-style.mjs`, "3 declared switch(es)") | ❌ Wave 0 |
| WX-05 | Mutation scores do not fall | mutation | `pnpm exec stryker run --mutate '<Walk,Predicate,PortAccess[,LeafNeeds]>'` (≈ 1 min 40 s, alone) | base measured: Q7 |
| WX-06 | Characterisation before change | ordering rule | commit order in Q6 | — |
| WX-01..04, 07 | gates, ids, overview, banned constructs, breaks | gate | `pnpm check:pr < /dev/null`; `node scripts/spec-revise.mjs --check`; `bash spec/scripts/verify-traceability.sh --strict` | ✅ existing |

### Sampling Rate
- **Per task commit:** the quick run command.
- **Per wave merge:** `pnpm exec vitest run --project core` and `pnpm typecheck`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, Stryker re-run with the same invocation as the base, then `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `packages/core/bench/Evaluate.bench.ts` — the two leaf-heavy workloads, on the base, first commit (patch in Q5)
- [ ] `packages/core/test/LeafFixtures.ts` — fixtures, oracle, `labelOf`, shared layer (not a `.test.ts`)
- [ ] `packages/core/test/LeafMatrix.test.ts` — characterisation, green on the base
- [ ] `packages/core/test/LeafNeeds.test.ts` — RED by import until `LeafNeeds.ts` exists
- [ ] A/B script and analysis (Q5), kept under `.planning/phases/QD-50-…/` or the session scratchpad
- [ ] `50-mutation-base.json` — from the Q7 scores, before any `src` edit

## Security Domain

### Applicable ASVS Categories (level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | **yes** | Fail closed: an absent request input is an error, never a denial that reads as a decision and never an allow (INV-QD-006, INV-QD-011); one table plus an exhaustive test replaces ten hand-written checks |
| V5 Input Validation | **yes** | Policies from untrusted JSON go through `untrustedDecoder` only (AGENTS.md §7a); the reader consumes a decoded `LeafPolicy`; `HasResourceAttribute`'s `Object.hasOwn` read of an untrusted attribute name stays |
| V6 Cryptography | no | — |
| V7 Error handling and logging | **yes** | Error classes, `_tag`s and fields unchanged; `MissingAction.expected` stays `Schema.optional` so a JSON round trip is lossless; the only difference is an own-key (Open Question 3) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A missing action/resource silently resolving to "no match" (reads as a denial, hides a wiring error, or lets a `neq` allow) | Elevation of privilege / Repudiation | The table + reader + exhaustive matrix; the existing INV-QD-011 tests stay; a new leaf without a row is TS2741 |
| Prototype-key lookup on the table (`"toString"`) fail-open | Elevation of privilege | Reader reached only from known-tag arms; if exposed to an untrusted tag, `Object.hasOwn` plus a fail-closed row (ADR-QD-092 (b)); not needed on this path (Pitfall 6) |
| Order of checks changing which error a caller sees | Information disclosure (low) | D-05 rule pinned by matrix and by `Evaluate.test.ts:1414`; negative control shown (Q6) |
| Widening an interpreter's error channel (new error leaking from `toPredicate`) | Tampering | `Supplied<true>` overload; `tsc` confirms the channels are unchanged |
| A benchmark-driven "optimisation" removing a check | Tampering | Gate passes only if the full matrix passes unchanged; the bench is a decision input, not a test |
| Attribute name `"constructor"` read from an inherited member in `HasResourceAttribute` | Elevation of privilege | `Object.hasOwn` guard kept verbatim in the arm (its comment is in the diff) |

No ASVS V1 to V14 finding rated high is expected: no new input surface, no new dependency, no new public export, no I/O.

## Sources

### Primary (HIGH confidence)
- This repository at HEAD `b58c1a0b` on `arch-wave-10`: `packages/core/src/{Walk,Predicate,PortAccess,Matcher,Policy,Decision,ScopedLeaf,Resource,Errors,Admission,PortDescription,GateState,HydrationMetrics}.ts`, `packages/core/test/{Evaluate,Predicate,Policy,helpers}.test.ts`, `packages/core/bench/Evaluate.bench.ts`, `scripts/check-house-style.mjs` (`SWITCH_BUDGET` `:376-387`), `scripts/check-api-surface.mjs`, `scripts/spec-revise.mjs`, `stryker.config.mjs`, `package.json`, `.planning/config.json`, `.planning/REQUIREMENTS.md`, `.planning/phases/QD-49-…/49-mutation-base.json`, `.planning/phases/QD-47-…/47-01-PLAN.md`.
- Spec: `spec/invariants.md` (INV-QD-011 `:325-345`, INV-QD-344 `:3975`), `spec/behaviors/{05-evaluator,10-actions,30-port-calls}.md`, `spec/decisions/{024,034,073,077,092,100,134,152,162}-*.md` and `index.yaml`, `spec/process/house-rules-evidence.md` §1 to §2, `spec/README.md` (CCR table), `spec/traceability.md`, `spec/behaviors/index.yaml`.
- Commands run this session: `vitest bench` (12 runs), `vitest run --project core` (full suite and sketches), `tsc -p packages/core/tsconfig.src.json` and `tsc -p tsconfig.test.json`, `oxlint`, `node scripts/check-house-style.mjs`, `madge`, `stryker run --mutate …` (twice), a 168-cell probe test (deleted). Installed effect 4.1.2.

### Secondary (MEDIUM confidence)
- The ADR-QD-092 and ADR-QD-073 benchmark precedents: read, not re-run; their figures are quoted only as protocol.

### Tertiary (LOW confidence)
- None. No web or Context7 lookup was needed: the phase touches no external library API beyond installed `effect` (`Match.tagsExhaustive` compiled and ran).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed versions read from the tree; nothing new installed.
- Architecture: HIGH — the proposed module was built, type-checked, run against the full core suite, a 168-cell matrix and Stryker.
- Benchmark outcome: MEDIUM — protocol and script are sound and the per-run-minimum result is consistent across two independent 6-run sessions, but the host was shared and the statistic differs from D-03's.
- Spec-record mechanics: HIGH for shapes (read precedents), MEDIUM for BEH placement (discretion).
- Pitfalls: HIGH — each was hit or measured.

**Research date:** 2026-11-16
**Valid until:** Phase 51 landing or any change to `Walk.ts`/`Predicate.ts`/`PortAccess.ts` (otherwise 30 days).
