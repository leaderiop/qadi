---
id: ARCH-02
title: One seam for folding a Policy stack-safely, and one owner for its per-tag facts
strength: Strong
status: done
evidence_verified_at: 1caf04c
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-002 (read — the schema union stays the one definition; POLICY_TAGS is derived from it)
  - ADR-QD-024 (read — toPredicate error precedence changes under D-02-e; noted, not amended)
  - ADR-QD-027 (read — explain stays total and subject-free)
  - ADR-QD-030 (read — simplify's two rewrites unchanged)
  - ADR-QD-034 (read — evaluateNode/evaluateMatcher switches stay)
  - ADR-QD-037 (read — madge gate; import graph checked)
  - ADR-QD-047 (read — devtools model held to 95% and its own Stryker run)
  - ADR-QD-073 (read — no new Effect.fnUntraced)
  - ADR-QD-076 (read — static mutants skipped; POLICY_TAGS is static)
  - ADR-QD-NEXT (new — "A tree is folded through one seam, and nesting depth is a property of the policy")
packages: ["@qadi/core", "@qadi/devtools"]
estimate: XL   # L if D-02-e, D-02-f and D-02-g all take option (a); see §9
---

# ARCH-02 — One seam for folding a Policy stack-safely, and one owner for its per-tag facts

Glossary used in this plan. **Nesting depth** means how deeply a `Policy`, `Matcher`
or `Explanation` value nests (what `policyDepth` counts). **Module depth** means the
architecture sense, how much a module's interface hides. They are never shortened to
plain "depth" where the two could be confused.

## 1. Verified evidence (at `1caf04c`)

Everything below was re-read at `git rev-parse --short HEAD` = `1caf04c` on branch
`ci/stryker-ignore-static`. The installed `effect` is now the stable `4.0.0`
(`node_modules/.pnpm/effect@4.0.0`), a peer dependency. Probes ran from scratch
scripts under
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/4f5e904d-427b-47c8-b388-abf5f9ac9e8f/scratchpad/arch02/`
(`probe.ts`, `probe2.ts`, `probe3.ts`, `probe4.ts`, `spike/`, `probe-tag/`). They ran
with `node_modules/.bin/tsx` on Node v22.22.0 with the default stack size. Overflow
thresholds move with stack size, so read them as orders of magnitude, not constants.
Nothing was written to the repo.

### Claims from the review

| # | Claim | Verdict | Evidence at `1caf04c` |
| - | ----- | ------- | --------------------- |
| C1 | `Policy.ts` `childrenOf` is a partial seam, exported so other walkers can share the explicit-stack technique | **CONFIRMED** | `packages/core/src/Policy.ts:1048-1082`: a `Match.tagsExhaustive` returning children. The doc comment at `:1056-1061` says it is exported for that purpose. It is listed in `spec/overview.md:308`. It is only *half* a seam: it gives the children, and each caller still writes its own traversal loop. |
| C2 | The post-order explicit-stack fold is copy-pasted 3 times (`policyDepth`, `simplify`, `explain`), and `simplify`/`explain` differ only in the rebuild function and the error label | **CHANGED** (stronger than stated) | `Simplify.ts:200-231` and `Explanation.ts:313-344` are 32 lines each. `diff` of the two (run 2026-10-04) differs **only** in the result type, `rebuild` vs `rebuildExplanation`, and the two `"… traversal order bug"` strings at `Simplify.ts:213,228` and `Explanation.ts:326,341`. `policyDepth` (`Policy.ts:1113-1138`, 26 lines) is a **variant**, not a copy. It has no throws: a missing child result silently becomes `0` (`depths.get(child) ?? 0`, `:1125`), and so does a missing root (`:1137`). A traversal bug there would *under-report* nesting depth, which is the direction INV-QD-037 calls dangerous. All three call `childrenOf` twice per node, once on push and once on combine (`Policy.ts:1122,1133`; `Simplify.ts:210,222`; `Explanation.ts:323,335`). |
| C3a | Three walkers use explicit stacks | **CONFIRMED** | The three above. The existing 100k-nesting regression tests are `RolesAndDepth.test.ts:141-158`, `Simplify.test.ts:297-322` and `Explanation.test.ts:546-578`. The 250k-width tests are `RolesAndDepth.test.ts:124-139` and `Simplify.test.ts:324-345`. |
| C3b | `Predicate.ts` `restrictsFields` (~330) and `translateNode` (~385) use native recursion with a `maxDepth` check | **CONFIRMED, with a gap** | `restrictsFields` is at `Predicate.ts:330-362` and `translateNode` at `:385-523`. The guard is only as good as the caller's `maxDepth`. `toPredicate(not^1000(…), { maxDepth: 1e9 })` dies with `RangeError: Maximum call stack size exceeded` thrown from `Predicate.ts:342` (`probe2.ts`). `translateNode` builds its `Not`/`Labeled` child effect **eagerly** (`:514`, `:518`), so its construction is also native recursion. |
| C3c | `devtools/src/model/Remedies.ts` `requirementsOf` (~248) uses native recursion with no nesting-depth guard | **CONFIRMED** | `Remedies.ts:248-286`. It is reached from public `remedyEdits` (`:68-90`), from `sweepPlan` (`WhatIf.ts:167-188` via `derive`, `:190-202`), and from `whatIf` (`WhatIf.ts:231-253`), which the simulator calls (`react/Simulator.tsx:313`). |
| C3d | `devtools/src/model/Inspect.ts` also walks children | **CHANGED** | It walks the **`Explanation`** tree zipped with the **`Trace`**, not the `Policy`: `build` at `Inspect.ts:236-261` and `flattenTree` at `:151-155`. Both use native recursion with no guard. `inspect(not^n(...), undefined)` overflows at about **n = 1,759** (`probe.ts`, binary search). |
| C3e | `Evaluate.ts` `evaluateNode` (~892) is a switch in `SWITCH_BUDGET`, trampolined by Effect | **CHANGED — only partly trampolined** | The switch is at `Evaluate.ts:904` and is budgeted (`scripts/check-house-style.mjs:281,298`). The `AllOf`/`AnyOf`/`Rules` helpers are generators, so they are lazy. The `Not`/`Obliged`/`Labeled` arms (`:1019-1060`) call `evaluateNode(...)` **eagerly** inside `Effect.map(...)`, so building the effect recurses natively. `evaluate(labeled^5000(…), { maxDepth: Infinity })` fails with a **`Die` cause carrying `RangeError`** (`probe2.ts`), which breaks AGENTS.md §4 ("an authorization decision must never become a defect"). The same input succeeds at n = 1,000. A spike that wrapped those three child calls in `Effect.suspend` made 100k chains of `Labeled`, `Not`, `Obliged`, `allOf([p])` and `rules([permitWhen(p)])` all evaluate to `Success` (`spike/src/spikeDeep.ts`). |
| C4 | `restrictsFields` lists ten leaves just to test `p.fields !== undefined`; the ADT does not expose which tags carry fields | **CONFIRMED** | `Predicate.ts:344-353`: ten identical arms. Nothing in `Policy.ts` names the field-bearing tags. |
| C5 | `Evaluate.ts` `POLICY_TAGS_BY_TAG` (~98-118) and `Decision.ts` `TRACE_TAGS_BY_TAG` (~71-91) are byte-for-byte copies | **CONFIRMED** | `Evaluate.ts:98-115` (+ `:118`) and `Decision.ts:71-88` (+ `:91`). `diff` of the object bodies is empty. `Evaluate.ts:87-96` says it chose not to share because exporting would leak through `index.ts`. |
| C6 | Adding a `Policy` tag touches about 9 sites | **CONFIRMED (9 compiler-forced) — plus 5 hand-edited in `Policy.ts`** | `probe-tag/`: a copy of `packages/core/src` got a `Probe` variant on `Policy`, `PolicyEncoded`, a struct and the union. `tsc` then reports exactly eight core sites: `Decision.ts:71`, `Evaluate.ts:98`, `Evaluate.ts:899` (TS2366, the switch), `Explanation.ts:181`, `Policy.ts:1068`, `Predicate.ts:343`, `Predicate.ts:449`, `Simplify.ts:89`. The ninth is `Remedies.ts:248` (a `Match.tagsExhaustive` over `Policy` in `@qadi/devtools`). On top of these come the hand sites in `Policy.ts`: the type (`:197`), the encoded type (`:293`), the struct, the `Schema.Union` list (`:516-533`) and the smart constructor. Using `HasSignature`, the most recent tag (ADR-QD-058), as a grep probe gives the same 14 places. |
| C7 | Settle whether `requirementsOf` can actually overflow, against `policyDepth`/`PolicyTooDeep` limits | **CONFIRMED for in-memory policies; REFUTED for decoded ones** | `remedyEdits` on single-child chains (`probe.ts`): **`labeled` overflows at about n = 2,052** (binary search), `obliged` and `allOf([p])` overflow between 1,000 and 3,000, `rules([permitWhen(p)])` overflows between **256 and 1,000**, and `not` never overflows, because `requirementsOf` does not descend into `Not`. Decoded input is safe. `MAX_DECODE_DEPTH` = 256 (`Policy.ts:958`), and `fromJson` accepts a 255-deep `labeled` chain but rejects 256. A `Rules` level costs three JSON levels, so the decodable maximum is far below the `Rules` threshold. `DEFAULT_MAX_DEPTH` = 64 bounds `evaluate` only. **`sweepPlan`/`remedyEdits` never consult it**, so a caller-held policy built with smart constructors past about 1k–2k levels crashes them. Inside `whatIf` (an `Effect.fn`) that crash is a defect. |

### Findings the review did not have

| # | Finding | Verdict | Evidence |
| - | ------- | ------- | -------- |
| N1 | `renderExplanation` uses native recursion | **CONFIRMED defect** | `Explanation.ts:449-516` (`go`/`embed`). `renderExplanation(explain(not^n(…)))` overflows at about **n = 734**, which is *lower* than `explain` itself can handle. `explain` is stack-safe and the renderer of its output is not. |
| N2 | Matcher walkers use native recursion with no guard; `policyDepth` ignores matcher nesting | **CONFIRMED defect** | `Matcher.ts:441-459` (`referencesRef`'s `walk`), `:486-577` (`evaluateMatcher`, budgeted switch at `:500`), `Explanation.ts:128-143` (`matcherText`), `Remedies.ts:128-178` (`witness`). `referencesAction(size^10000(eq(action())))` throws `RangeError`. `explain(hasAttribute("x", size^10000(...)))` throws `RangeError` even though `explain`'s own walk is explicit-stack. `evaluate(hasAttribute("x", someMatch^10000(...)))` fails with a `Die`/`RangeError` cause. `policyDepth(hasAttribute("x", size^100000(...)))` is `0` (`probe.ts`, `probe2.ts`). Matcher.ts has **no** explicit-stack fold to dedupe. It has the *missing* version of the same seam. |
| N3 | INV-QD-037 / BEH-QD-191 say "`policyDepth(p) <= n` **exactly when** `evaluate(p, { maxDepth: n })` does not raise `PolicyTooDeep`" | **REFUTED (converse direction)** | `probe3.ts`: `anyOf([hasRole("editor"), not(not(not(hasRole("x"))))])` has `policyDepth` = 4, yet `evaluate(…, { maxDepth: 1 })` **succeeds** for a subject holding `editor`, because `First` short-circuits before descending. `allOf([deny, deep])` behaves the same way. Only `policyDepth(p) <= n ⇒ no PolicyTooDeep` holds. Whether a policy is "too deep" currently depends on *who is asking*. The existing test (`RolesAndDepth.test.ts:~95-122`) uses only policies with no short-circuit escape, so it cannot see this. |
| N4 | `toPredicate`'s choice between `PolicyTooDeep` and the fields refusal depends on child order | **CONFIRMED** | `probe3.ts` with `maxDepth: 1`: `allOf([hasRole("editor", { fields: ["a"] }), deep])` gives `PolicyNotTranslatable`, while `allOf([deep, hasRole("editor", { fields: ["a"] })])` gives `PolicyTooDeep`. `restrictsFields` returns on the first hit (`Predicate.ts:334-340`). |
| N5 | A cyclic (hand-mutated) policy does not terminate | **CONFIRMED** | `probe4.ts` (`const c: any = { _tag: "Not" }; c.policy = c; policyDepth(c)`) was still running when `timeout 20` killed it (exit 124). The stack grows without bound, so memory grows too. `simplify`/`explain` share the loop and behave the same way. Decode cannot produce a cycle; only in-process mutation can. |
| N6 | `@qadi/core` exposes every `src/*.ts` module as a subpath (`"./*"` in `packages/core/package.json` `exports`) | **CONFIRMED** | `check-api-surface.mjs` expands that wildcard (overview Rev 1.9), so any *new* core module's exports must appear in `spec/overview.md`, in the tables or in "Not listed above", even when they stay out of the barrel. Precedent: `FieldPath.ts` and `RetryingLayer.ts`. `@qadi/devtools` has no wildcard (only `.` and `./react`). |
| N7 | The tag list can be derived from the schema union itself | **CONFIRMED (spike)** | `spike/src/Policy.ts`: `Schema.Union([...]).pipe(Schema.toTaggedUnion("_tag"))` (`effect/src/Schema.ts:6204`, `effect@4.0.0`). The spike exposes `.discriminants`. `tsc` with the repo's strict flags accepts it, and a type-level equality probe shows `(typeof discriminants)[number]` ≡ `Policy["_tag"]`. At runtime it yields all 16 tags in union order, and the `toJson`→`fromJson` round trip still works. Declaration emit (`tsc -b`) was **not** exercised (the spike was `noEmit`). See T6's fallback. |
| N8 | The import graph allows `Decision.ts` → `Policy.ts` (runtime) and `Policy.ts` → new `TreeFold.ts` | **CONFIRMED** | Today `Decision.ts` imports `Policy` as a type only (`:17`). The spike added a runtime `POLICY_TAGS` import into `Decision.ts` and a new `TreeFold.ts` imported by `Policy.ts`. `madge --circular --extensions ts,tsx src` on the spike reports "No circular dependency found". `Policy.ts`'s runtime imports (`DecodeDepthGuard`, `Matcher`→`Identity`/`SecurityLabel`, `Obligation`, `Permission`, `Signature`→`Identity`) never reach `Decision.ts` or `Errors.ts`. |
| N9 | A generic fold with frame-held children performs like `policyDepth` | **CONFIRMED (spike)** | `spike/src/spikeFold.ts` compares against `policyDepth` on a 100k chain (≈31 ms vs ≈46 ms), a 250k-wide node (≈66 ms vs ≈69 ms) and a 3^10 tree (≈25 ms vs ≈27 ms). Results are identical. A cyclic input throws instead of hanging. These are single runs on a laptop, so read only the direction. |

## 2. Goal and success criteria

Today, folding a `Policy` bottom-up is a technique each module re-implements. Three
modules carry their own post-order explicit-stack loop. Three more recurse natively,
each with its own nesting-depth policy or none. The facts that belong to the ADT are
re-stated wherever they are needed: which tags exist, which carry `fields`, which
carry children, how a matcher nests. The goal is to give each kind of knowledge one
owner behind a small interface.

**A fold seam.** An internal `TreeFold.ts` module owns stack-safe post-order folding.
`Policy.ts`, `Explanation.ts` and `Matcher.ts` are thin adapters over it (`foldPolicy`,
`foldExplanation`, `foldMatcher`). Each supplies only that ADT's children function.

**A structural-facts owner.** `Policy.ts` owns the per-tag structural facts:
`POLICY_TAGS` (derived from the schema union), `childrenOf`, `fieldsOf`, and, under
D-02-f, the matcher a leaf carries. It also owns nesting-depth semantics, through
`policyDepth`.

Each walker then keeps only its *semantic* per-tag arms. This gives locality, because
a new tag's structural facts are edited in one module. It gives leverage, because one
tested loop serves every walker in core and devtools. It gives module depth, because
callers stop seeing frames, maps and traversal-order invariants.

Success criteria. Each one is checked by a command:

1. **One post-order loop in `packages/*/src` per package that needs one.**
   `grep -rn "expanded" packages/core/src packages/devtools/src` returns nothing.
   `grep -rn "traversal order bug" packages/*/src` returns nothing.
   `grep -rln "while (stack.length" packages/core/src packages/devtools/src` lists
   only the two `TreeFold.ts` files, `Inspect.ts` (`flattenTree`'s pre-order loop, T16),
   `DecodeDepthGuard.ts`, `SinkCodec.ts`, `Role.ts` and `FieldPath.ts`. The last four
   are JSON-value, role-graph and projection walkers, out of scope (§3). At HEAD the
   list also has `Policy.ts`, `Simplify.ts` and `Explanation.ts`.
2. **One tag list.** `grep -rn 'Record<Policy\["_tag"\], true>' packages/core/src`
   returns nothing. `Decision.ts` and `Evaluate.ts` import `POLICY_TAGS` from
   `Policy.ts`. A tstyche assertion in `packages/core/test/Policy.tst.ts` proves
   `(typeof POLICY_TAGS)[number]` is exactly `Policy["_tag"]`.
3. **No per-tag field list outside `Policy.ts`.** `grep -c "fields !== undefined"
   packages/core/src/Predicate.ts` returns `0`, and `restrictsFields` uses
   `fieldsOf`.
4. **Fewer compiler-forced sites for a new tag.** Re-running the `probe-tag` procedure
   (T18, step 4) on the finished tree reports compile errors in exactly: `Policy.ts`
   (`childrenOf`, `fieldsOf`, plus `matcherOf` if D-02-f(a)), `Evaluate.ts` (switch
   only), `Explanation.ts`, `Predicate.ts` (`translateNode` only), `Simplify.ts`, and
   `Remedies.ts`. That is **5 outside `Policy.ts`, down from 8**.
5. **Every walker survives 100k nesting and 250k width.** The named stack-depth tests in
   §7's table all pass, including the ones that crash today: `renderExplanation`,
   `inspect`, `flattenTree`, `remedyEdits`, `sweepPlan`, `referencesAction`,
   `explain` over a deep matcher, `satisfyingValue`, `toPredicate` with a large
   `maxDepth`, and `evaluate` with a large `maxDepth` (under D-02-g).
6. **Behavior pinned across the migration.** Every characterization test written in
   T2–T4 passes unchanged after T8–T16. The only exceptions are the specific
   assertions listed as *intentionally flipped* in D-02-e/f. Each flip lands in the
   same commit as its spec change.
7. **Budgets unchanged.** `SWITCH_BUDGET` stays 4, `UNTRACED_BUDGET` stays 3,
   `ANY_BUDGET` stays 7, `SCHEMA_ERROR_BUDGET` stays 12 and `HAS_CUSTOM_BUDGET` stays
   1 (`node scripts/check-house-style.mjs` exits 0 with no budget edit).
   `madge --circular --extensions ts,tsx packages/*/src` is clean.
8. **Gate 13 holds.** `node scripts/check-api-surface.mjs` exits 0, with every new export
   in a table or in "Not listed above".
9. **`pnpm check` passes**, including both Stryker runs touching this code (`stryker run`
   for core, `stryker run stryker.devtools.mjs`), each at or above 80%.

## 3. Non-goals

- **Converting `evaluateNode` or `evaluateMatcher` away from `switch`.** ADR-QD-034
  measured the cost, and both stay in `SWITCH_BUDGET`. `evaluateNode` keeps its own
  per-node `depth > maxDepth` guard (`Evaluate.ts:900`) as defense in depth. Under
  D-02-g it changes only by wrapping three child calls in `Effect.suspend`.
- **Making `evaluateMatcher` iterative.** It recurses over the *value* as well as the
  matcher (`SomeMatch`/`EveryMatch` over arrays), and it is a hot path. D-02-f bounds it
  through nesting-depth semantics instead.
- **Folding `Trace`.** `renderTrace` (`Decision.ts:~440-457`) and `diffTraces`
  (`TraceDiff.ts:188-290`) recurse natively over a `Trace`. A trace only exists after an
  evaluation succeeded, so its nesting is bounded by that evaluation's `maxDepth`. They
  become a follow-up candidate once `TreeFold.ts` exists. This plan records them in
  ADR-QD-NEXT's "Not yet" section rather than migrating them.
- **JSON-value and role-graph walkers.** `DecodeDepthGuard.ts`'s `exceedsJsonDepth`,
  `SinkCodec.ts`'s `isJsonSafe` (a private `childrenOf` over JSON, `:247`), `Role.ts`'s
  DAG walks and `FieldPath.ts`'s `projectAt` are already explicit-stack and walk
  different structures, with different questions: pre-order, early exit, cycle-as-answer.
  They stay as they are.
- **Collapsing `Policy`/`PolicyEncoded`/struct/union into fewer hand sites.** That is
  ADR-QD-002's territory. `POLICY_TAGS` derives from the union list, so the plan adds no
  hand site, and it does not try to remove the existing four.
- **De-duplicating the seven `FastCheck.letrec` policy arbitraries** in core tests
  (`Explanation.test.ts:488`, `Policy.test.ts:782`, `Simplify.test.ts:195`,
  `Predicate.test.ts:830`, `Evaluate.test.ts:3556,3638`, `SinkCodec.test.ts:794,865`).
  T1 adds one all-tags arbitrary for characterization. Migrating the others onto it is
  noted as optional follow-up, not done here.
- **Exporting the generic `foldTree` from the barrel** (see D-02-d). AGENTS.md §9 keeps
  shared scaffolding out of the flat namespace.

## 4. Constraints

| Source | Consequence for this plan |
| ------ | ------------------------- |
| AGENTS.md §1 | `TreeFold.ts` and every new import use `effect/<Submodule>` namespace imports and `.ts` relative extensions, with `import type` for types. `@qadi/devtools` imports `foldPolicy`/`foldMatcher` by name from `@qadi/core`'s root, never a subpath. |
| AGENTS.md §5 / ADR-QD-073, `UNTRACED_BUDGET` = 3 | The folds are plain synchronous functions, not `Effect.fn`. No new `Effect.fnUntraced`. Any `Effect.suspend` added to `evaluateNode`/`translateNode` goes on plain helpers, not new `Effect.fn` wrappers. |
| AGENTS.md §5a / ADR-QD-034, `SWITCH_BUDGET` = 4 | `_tag` dispatch in new code uses `Match.type<…>().pipe(Match.tagsExhaustive(...))` hoisted to module scope. `evaluateNode` (`Evaluate.ts:904`), `mergeFields`, `evaluateMatcher` (`Matcher.ts:500`) and `resolveRef` keep their switches, and no switch is added. |
| AGENTS.md §6 | No `as`, `!`, `any`, `async`/`await` or `Promise`. `foldTree` boxes memoized results (`{ readonly value: R }`) so a stored `undefined` result needs no cast. It iterates children through `Iterator` so `noUncheckedIndexedAccess` needs no dead branch. `Record<string, unknown>` must not appear as a widened implementation type (user memory note). `as const` on literal tags (as in `Remedies.ts:250-270`) is not a type assertion and stays. |
| AGENTS.md §7 / ADR-QD-002 | `POLICY_TAGS` is derived **from** the `Schema.Union` (D-02-b), not restated. The schema stays the one definition. |
| AGENTS.md §9 | `TreeFold.ts` is **not** in `packages/core/src/index.ts`. Its export is reachable only as the `@qadi/core/TreeFold` wildcard subpath (N6), so it is listed in overview "Not listed above". |
| AGENTS.md §10 | Coverage: `packages/core` 95% and devtools model 95% (ADR-QD-047). New code is fully covered by T5/T6 unit tests. Every new behavior gets a spec ID and a test. |
| AGENTS.md §11, §12 | Behavior changes (D-02-e/f/g) update the behavior doc, the invariant and the traceability matrix in the same change. Any `typescript` fence added to `spec/behaviors/*.md` must compile (gate 9, `node scripts/check-doc-examples.mjs`). Signature listings use `ts` fences. |
| AGENTS.md §15 | Gate 13 (`node scripts/check-api-surface.mjs`) requires a row for each new export. Gate 11 (`node scripts/check-dod-table.mjs`) needs no change, because no gate is added. |
| AGENTS.md §16 | No new package. No `tsconfig.build.json` change. |
| ADR-QD-037, gate 5 (`madge --circular --extensions ts,tsx packages/*/src`) | Edges: `Policy.ts → TreeFold.ts`, `Explanation.ts → TreeFold.ts`, `Matcher.ts → TreeFold.ts`, `Decision.ts → Policy.ts` (runtime), and `Policy.ts → Matcher.ts` (already present). `TreeFold.ts` imports **nothing** from the package. Verified acyclic in the spike (N8). Re-run after every task that adds an import. |
| ADR-QD-047 | `@qadi/devtools` model code is mutation-tested (`stryker run stryker.devtools.mjs`, break 80) and 95%-covered. The devtools-local fold (D-02-d) needs its own unit tests. |
| ADR-QD-076 (`ignoreStatic: true`) | Static initializers (`POLICY_TAGS`, module-scope `Match.type` builders) produce no counted mutants. Invariant throws inside `foldTree` are kept to the reachable cycle check, so no survivor-only dead branches are added. |
| `SCHEMA_ERROR_BUDGET` = 12, `ANY_BUDGET` = 7, `HAS_CUSTOM_BUDGET` = 1 | No new error class. Every nesting-depth failure reuses `PolicyTooDeep` (`Errors.ts:133`). No `any`. No `hasCustom` outside core/testing. |
| AGENTS.md §4 | A `RangeError` that escapes into an `Effect` becomes a `Die`, and today that turns a decision into a defect (C3e, N2). Every fix is judged against "a decision must never become a defect". |

## 5. Decisions needed before work starts

### D-02-a — Where the fold seam lives

- **(a) A generic internal `TreeFold.ts` (`foldTree`), with one-line ADT adapters
  `foldPolicy` (`Policy.ts`), `foldExplanation` (`Explanation.ts`) and `foldMatcher`
  (`Matcher.ts`).** `Policy.ts` keeps `childrenOf`/`policyDepth` where today's subpath
  importers find them. One loop serves three ADTs (leverage). No cycles (N8).
- (b) A Policy-only `PolicyFold.ts` module holding `childrenOf`, `foldPolicy` and
  `policyDepth`. This moves two public names off the `@qadi/core/Policy` subpath, which
  breaks subpath importers. `policyDepth` cannot stay in `Policy.ts` without a cycle.
  It does nothing for `Explanation`/`Matcher`, so N1 and N2 would need their own loops.
- (c) Put everything, including the generic loop, inside `Policy.ts`. That works for
  `Policy`, but `Explanation.ts` and `Matcher.ts` would have to import a generic helper
  from the policy module. `Matcher.ts` → `Policy.ts` is a **cycle** (`Policy.ts` already
  imports `Matcher.ts`).

**Recommendation: (a).** `status: decided (2026-10-04, recommended default)` — option (a) taken: `TreeFold.ts` with `foldPolicy`/`foldExplanation`/`foldMatcher` adapters; no cycle (madge clean).

### D-02-b — The source of the tag list

- **(a) Derive it from the schema union:** `const PolicyUnion = Schema.Union([...]).pipe(Schema.toTaggedUnion("_tag"))`,
  `export const Policy: Schema.Codec<Policy, PolicyEncoded> = PolicyUnion`,
  `export const POLICY_TAGS = PolicyUnion.discriminants`, and a tstyche equality test.
  This is truly one definition (ADR-QD-002's spirit) and was spiked green (N7). The
  open risk is `.d.ts` emission of the inferred tuple type (T6 checks it).
- (b) Move one `Record<Policy["_tag"], true>` into `Policy.ts`, export it, and delete
  both copies. It is exhaustive by TS2741, but it still restates the tags by hand
  beside the union (a fifth hand site).

**Recommendation: (a), with (b) as T6's documented fallback if declaration emit fails.**
`status: decided (2026-10-04, recommended default)` — option (a) taken: `Policy.ts` derives `POLICY_TAGS` with `Schema.toTaggedUnion("_tag")`. `pnpm typecheck` emits `lib/Policy.d.ts` cleanly (a plain 16-element readonly tuple, about 300 bytes), so the (b) fallback was not needed.

### D-02-c — The shape of the "which tags carry fields" fact

- **(a) `fieldsOf: (self: Policy) => ReadonlyArray<string> | undefined` as a hoisted
  `Match.tagsExhaustive`.** Leaves return `p.fields`, and composites return `undefined`
  ("restricts nothing of its own"). A new tag is a compile error here, so its author
  must *decide* whether it narrows visibility. Field visibility is this library's
  central concern, so the decision should be forced.
- (b) `"fields" in p ? p.fields : undefined`, with structural narrowing and zero
  per-tag lines. A new tag that forgets `fields` silently counts as "never restricts",
  which is the widening the user's closed-union note warns about.

**Recommendation: (a).** `status: decided (2026-10-04, recommended default)` — option (a) taken: `fieldsOf` as a hoisted `Match.tagsExhaustive`.

### D-02-d — How `@qadi/devtools` gets a stack-safe fold for its own trees

`Inspect.build` zips `Explanation` × `Trace` × path top-down. That needs a fold over
*virtual* position nodes, which no domain adapter in core can provide.

- (a) Export `foldTree` from `@qadi/core`'s barrel. One copy exists, but this breaks
  AGENTS.md §9 ("shared scaffolding stays out of the barrel") and needs an ADR exception.
- **(b) Keep `foldTree` internal to core. Devtools gets a private
  `packages/devtools/src/model/TreeFold.ts` (not exported from `src/index.ts`, and with
  no wildcard subpath, so no gate-13 row).** `requirementsOf` and `witness` use core's
  public `foldPolicy`/`foldMatcher`, so per-tag knowledge stays single-owner. Only the
  ~35-line traversal mechanism exists twice, once per package, each tested and
  mutation-gated.
- (c) Import `@qadi/core/TreeFold` as a subpath. That breaks AGENTS.md §1 (cross-package
  imports are named imports from the root), and no package does it today.
- (d) Leave `Inspect` recursive and document the limit (≈1.7k). That conflicts with
  success criterion 5.

**Recommendation: (b).** `status: decided (2026-10-04, recommended default)` — option (b) taken: `foldTree` stays internal to core; devtools has a private `src/model/TreeFold.ts` twin.

### D-02-e — Nesting depth is a property of the policy, and is checked first

This settles N3 (INV-QD-037's false converse) and N4 (`toPredicate` order dependence).

- (a) **Spec-only for `evaluate`.** Rewrite INV-QD-037/BEH-QD-191 as one-directional
  ("`policyDepth(p) <= n` ⇒ no `PolicyTooDeep`; the converse holds only when evaluation
  reaches the deepest node"). Keep `toPredicate`'s child-order precedence by writing
  `restrictsFields` as an explicit-stack *pre-order* search rather than a fold. There is
  no behavior change. Whether a policy is "too deep" stays subject-dependent.
- **(b) Depth first, deterministically.** `evaluate` (`Evaluate.ts:~1550`, inside the
  cache-miss thunk) and `toPredicate` (`Predicate.ts:~613`) reject `policyDepth(policy)
  > maxDepth` with `PolicyTooDeep({ maxDepth })` before any other work. `policyDepth`
  is memoized per policy object in a module-scope `WeakMap` in `Policy.ts`.
  INV-QD-037 becomes exact in both directions. `restrictsFields` becomes a plain fold.
  **Breaking:** a policy that today allows or denies by short-circuiting past an
  over-deep branch now fails with `PolicyTooDeep`. `toPredicate` on a policy that is
  both too deep and field-restricting now always reports `PolicyTooDeep`. The cost of
  one extra walk per *uncached* evaluation must be measured (T13), and a `WeakMap` hit
  costs O(1).

**Recommendation: (b), gated on T13's benchmark.** If the root pre-check costs more than
run-to-run noise on `Evaluate.bench.ts`'s `one node`/`wide`/`deep` workloads with a
memo hit, fall back to (a). Record the decision either way in ADR-QD-NEXT.
`status: decided (2026-10-04, recommended default)` — option (b) taken, gated on T13's benchmark: interleaved A/B runs put every `Evaluate.bench.ts` workload inside run-to-run noise, so the (a) fallback was not needed. **Breaking** (changeset says so).

### D-02-f — Matcher nesting in nesting-depth semantics

This settles N2's `evaluateMatcher` exposure. The non-evaluating matcher walkers are
fixed by T11 regardless of this decision.

- **(a) Count it.** A matcher-bearing leaf (`HasAttribute`, `HasResourceAttribute`)
  contributes `matcherDepth(matcher)` to `policyDepth`, through a per-tag `matcherOf`
  fact in `Policy.ts`. Under D-02-e(b) the root pre-check then bounds `evaluateMatcher`
  and `toPredicate`'s fold for free. Under D-02-e(a), the `HasAttribute`/
  `HasResourceAttribute` arms of `evaluateNode` (inside the switch, so the switch count
  is unchanged) and `translateNode` add `depth + matcherDepth(m) > maxDepth`. One
  nesting-depth semantics covers everything the evaluator recurses through. **Breaking:**
  `policyDepth(hasAttribute("tags", someMatch(eq(...))))` goes from 0 to 1.
- (b) A separate fixed matcher ceiling (`MAX_MATCHER_DEPTH = MAX_DECODE_DEPTH`) checked
  at evaluation and reported as `PolicyTooDeep({ maxDepth: MAX_MATCHER_DEPTH })`.
  Every decodable matcher passes, and `policyDepth` stays matcher-blind. The result is
  two nesting-depth notions, and `PolicyTooDeep.maxDepth` would report a number the
  caller never passed.
- (c) Document only. In-memory matchers past about 5k levels keep crashing `evaluate`.

**Recommendation: (a).** `status: decided (2026-10-04, recommended default)` — option (a) taken: a matcher-bearing leaf contributes `matcherDepth` to `policyDepth`. **Breaking** (changeset says so).

### D-02-g — `evaluateNode`/`translateNode` eager child construction

This settles C3e and the `translateNode` half of C3b.

- **(a) Wrap the eagerly-built child effect in `Effect.suspend`.** That means
  `evaluateNode`'s `Not`/`Obliged`/`Labeled` arms (`Evaluate.ts:1019-1060`) and
  `translateNode`'s `child` (`Predicate.ts:407`). The spike shows 100k-deep chains
  evaluate (C3e). For `translateNode` this is unconditional, since it is not a hot
  path. For `evaluateNode` it is gated on a new `wrapper-heavy` benchmark (T14).
- (b) Clamp or reject `maxDepth` above a hard ceiling. This bounds construction
  recursion without touching the hot path, but needs a new option-validation failure
  shape. Reusing `PolicyTooDeep` with an unrequested number is misleading.
- (c) Document only. That leaves a defect path that AGENTS.md §4 forbids.

**Recommendation: (a), with (b) as the fallback for `evaluateNode` only if T14 shows a
regression beyond noise on the existing workloads.** `status: decided (2026-10-04, recommended default)` — option (a) taken: `Not`/`Obliged`/`Labeled` children are suspended in `evaluateNode`, and translation's `Negation` likewise; the T14 benchmark was inside noise, so the (b) fallback was not needed.

### D-02-h — What a cyclic policy does

- **(a) `foldTree` detects a node already on the current path and throws
  `new Error("foldTree: the tree contains a cycle")`.** The cost is one `Set` add and
  delete per node (the spike showed parity, N9). This turns a hang (N5) into an
  immediate, named defect. Pure functions in this codebase already throw on broken
  invariants (`Simplify.ts:65-71`).
- (b) Keep today's non-termination.

**Recommendation: (a).** `status: decided (2026-10-04, recommended default)` — option (a) taken: `foldTree` throws `Error("foldTree: the tree contains a cycle")`.

## 6. Tasks

Phases: **A** pins behavior (T1–T4). **B** builds the seam (T5–T7). **C** migrates
core walkers (T8–T12). **D** fixes evaluation nesting-depth semantics (T13–T14).
**E** migrates devtools (T15–T16). **F** updates spec and docs and cleans up (T17–T18).

Every task ends with the same verification baseline unless it says otherwise:
`pnpm typecheck && node scripts/check-house-style.mjs && pnpm circular`. Commit per
task. Each commit message ends with the repo's attribution line.

### T1 — Add all-tags characterization arbitraries
- **Status:** [x] done
- **Depends on:** —
- **Files:** `packages/core/test/helpers.ts`, `packages/devtools/test/helpers.ts`
- **Steps:**
  1. In `packages/core/test/helpers.ts`, add `policyArbitrary(options?: { maxDepth?: number })`
     built with `FastCheck.letrec`. Every one of the 16 tags must be reachable. Make the
     leaf/composite generator table a `Record<Policy["_tag"], …>`, so that adding a tag
     is a compile error in the test helper too. Include `fields` sometimes present (and
     sometimes `[]`), empty `allOf`/`anyOf`/`rules`, both `Rules` effects, and `HasCustom`
     with and without `params`.
  2. Add `sharedPolicyArbitrary`. It generates a node, then composes a parent whose
     children reference **the same object** two or three times, for example
     `allOf([x, not(x), x])`. This pins identity-memo behavior.
  3. Add `matcherArbitrary(maxDepth)` covering all 12 `Matcher` tags (`Matcher.ts:38-81`)
     and all 5 `ValueRef` tags.
  4. Add a `chain(wrap, n, leaf)` helper that builds an n-deep single-child chain
     iteratively, and `comb(n)` (`allOf([leaf_i, next])` nested n times).
  5. In `packages/devtools/test/helpers.ts`, add the same `chain` helper and a small
     policy arbitrary covering the tags `requirementsOf` distinguishes. Devtools tests
     must not import core's `test/` tree.
- **Tests:** A sanity test in `packages/core/test/Policy.test.ts`. Over `FastCheck.sample(policyArbitrary(), { numRuns: 500, seed: 2026100401 })`, the union of observed `_tag`s (walking with today's `childrenOf`) equals all 16 tags.
- **Verify:** `pnpm vitest run packages/core/test/Policy.test.ts`
- **Done when:** The sanity test passes and every tag appears in the sample.

### T2 — Pin current outputs of every core Policy walker (characterization)
- **Status:** [x] done
- **Depends on:** T1
- **Files:** *new* `packages/core/test/legacy/PolicyWalkers.legacy.ts`, *new* `packages/core/test/PolicyWalkers.characterization.test.ts`
- **Steps:**
  1. Copy **verbatim** from `1caf04c` into `PolicyWalkers.legacy.ts` as named
     test-only oracles: `legacyPolicyDepth` (`Policy.ts:1113-1138`), `legacySimplify`
     (`Simplify.ts:200-231` plus `rebuild`, `flatten`, `absorbable`, `expectOne`),
     `legacyExplain` (`Explanation.ts:179-344` plus helpers), `legacyRenderExplanation`
     (`Explanation.ts:350-516`), and `legacyRestrictsFields` (`Predicate.ts:300-362`).
     Keep the imports the originals use. The file is scanned by
     `check-house-style.mjs`'s test rules, and verbatim copies already comply. Add a
     header comment saying the file is deleted by T18.
  2. Differential tests over `policyArbitrary()` and `sharedPolicyArbitrary()`
     (`numRuns: 1000`, fixed seeds): `policyDepth(p) === legacyPolicyDepth(p)`,
     `deepStrictEqual(simplify(p), legacySimplify(p))`,
     `deepStrictEqual(explain(p), legacyExplain(p))`,
     `renderExplanation(explain(p)) === legacyRenderExplanation(legacyExplain(p))` (also
     with a custom `term`), and `toPredicate`'s fields gate against
     `legacyRestrictsFields(p, 0, 64)`.
  3. Pinned examples, each a named `it`:
     - (a) identity sharing: `explain(allOf([x, x]))` has the same `Explanation` object
       at both `parts` indices (`assert.strictEqual(parts[0], parts[1])`), and so do
       `simplify` and `policyDepth`.
     - (b) empty composites have nesting depth 0.
     - (c) `Rules` children stay aligned after `simplify`.
     - (d) **N4 precedence:** `toPredicate(allOf([hasRole("editor", { fields: ["a"] }), not^3(hasRole("x"))]), { maxDepth: 1 })` fails with `PolicyNotTranslatable`, and the reversed order fails with `PolicyTooDeep`. Mark both `// PINNED — flips under D-02-e(b), see T9`.
     - (e) **N3:** `evaluate(anyOf([hasRole("editor"), not^3(hasRole("x"))]), { maxDepth: 1 })` with an `editor` subject succeeds, and so does `allOf([hasRole("nope"), deep])` at `maxDepth: 1`. Mark both `// PINNED — flips under D-02-e(b), see T13`.
     - (f) `policyDepth(hasAttribute("x", size(size(eq(literal(1))))))` is `0`, marked `// PINNED — flips under D-02-f(a), see T12`.
  4. Pin the tag lists. `TraceSchema` decodes a trace node with each of the 16
     `policyTag`s and rejects `"Probe"`. `qadi_denials_by_policy_tag_total`'s
     preregistered words, read through `isolatedMetrics` from helpers with a
     `Metric.snapshot`, equal the 16 tags in today's order. The order is pinned so T7
     shows whether derivation reorders it.
- **Tests:** As above. Everything passes against HEAD code.
- **Verify:** `pnpm vitest run packages/core/test/PolicyWalkers.characterization.test.ts`
- **Done when:** All tests pass at HEAD with no source change.

### T3 — Pin current outputs of the devtools walkers (characterization)
- **Status:** [x] done
- **Depends on:** T1
- **Files:** *new* `packages/devtools/test/model/legacy/Walkers.legacy.ts`, *new* `packages/devtools/test/model/Walkers.characterization.test.ts`
- **Steps:**
  1. Copy `requirementsOf` (`Remedies.ts:238-286`, with its `Requirement` type),
     `witness`/`refValue`/`mapValue`/`value`/`cannot`/`render`/`MAX_SYNTHESISED_LENGTH`
     (`Remedies.ts:107-232, 420-430`), and `build`/`shapeOf`/`statusOf`/`flattenTree`
     (`Inspect.ts:151-264`) verbatim into the legacy file. `requirementsOf` is not
     exported, so the differential goes through `remedyEdits`. Compare
     `remedyEdits(p, input)` labels, kinds and skips against a legacy `remedyEdits`
     built from the copied `requirementsOf` plus the real `remedyFor`. `remedyFor` is
     also unexported, so copy it as well, verbatim (`Remedies.ts:313-417`).
  2. Run differentials over the devtools policy arbitrary for `remedyEdits` (compare
     `edits.map(e => [e.kind, e.label])` and `skipped`) and over `matcherArbitrary`
     for `satisfyingValue`. Run them over `inspect(p, trace)` with `trace` both
     `undefined` and a real trace from `evaluate` under `testLayer`. Use
     `deepStrictEqual` on the whole `InspectNode`, `flattenTree(...).map(n => n.path)`,
     and `isTruncated`.
  3. Pinned examples: `Not` is not descended into, `Deny` rows are skipped, duplicates
     are kept and then deduped by label, and requirement order is pre-order left to right.
- **Tests:** As above.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Walkers.characterization.test.ts`
- **Done when:** The tests pass at HEAD.

### T4 — Pin current outputs of the Matcher walkers (characterization)
- **Status:** [x] done
- **Depends on:** T1
- **Files:** `packages/core/test/legacy/PolicyWalkers.legacy.ts`, *new* `packages/core/test/MatcherWalkers.characterization.test.ts`
- **Steps:**
  1. Add `legacyReferencesRef` (`Matcher.ts:441-459`) and `legacyMatcherText`
     (`Explanation.ts:118-143`) to the legacy file.
  2. Over `matcherArbitrary(8)`, assert `referencesAction`/`referencesResource` agree
     with the legacy version, and `explain(hasAttribute("a", m))`'s `detail` matches the
     legacy text.
  3. Pin `evaluateMatcher` outputs for a table of (matcher, value) pairs that covers
     every arm, including `FieldMatch` on `__proto__` (`Matcher.ts:557-566`).
     `evaluateMatcher` is not migrated, but T12 may change what reaches it.
- **Verify:** `pnpm vitest run packages/core/test/MatcherWalkers.characterization.test.ts`
- **Done when:** The tests pass at HEAD.

### T5 — Build the internal fold seam `TreeFold.ts`
- **Status:** [x] done
- **Depends on:** D-02-a, D-02-h
- **Files:** *new* `packages/core/src/TreeFold.ts`, *new* `packages/core/test/TreeFold.test.ts`
- **Steps:**
  1. Write `foldTree`. It is **not** added to `index.ts`. Doc comment: the first line is
     "Folds a finite tree bottom-up without native recursion". The following
     paragraphs cover the why (C2/C3), the identity memo, and the cycle rule (D-02-h).
     ```ts
     export const foldTree = <N extends object, R>(
       root: N,
       childrenOf: (node: N) => ReadonlyArray<N>,
       combine: (node: N, children: ReadonlyArray<R>) => R,
     ): R
     ```
     Algorithm: an index-free frame stack, like `SinkCodec.ts:250-279`'s `isJsonSafe`
     but post-order. Each frame is
     `{ node, pending: Iterator<N>, results: Array<R> }`. `childrenOf` is called
     **exactly once per distinct node**. That halves today's calls (C2) and is what
     lets devtools fold virtual nodes (T16).
     - On `pending.next()`, if not `done`: when `memo.get(child)` (a
       `Map<N, { readonly value: R }>`) holds a value, push `value` onto
       `frame.results`. Otherwise, when `onPath.has(child)`, throw the D-02-h error.
       Otherwise add the child to `onPath` and push a new frame.
     - When `done`: pop, delete the node from `onPath`, compute
       `value = combine(node, results)`, set the memo, then append `value` to the
       parent's `results`, or return it if the stack is empty.
     - Use `while (stack.length > 0)` with a final throw after the loop. The `stack.at(-1)`
       read and the final throw are the only defensive lines.
     - No `as`, `!` or spread of children (the width hazard, `RolesAndDepth.test.ts:124-139`).
  2. Do not add an `Effect` import. This module stays pure and dependency-free (N8).
- **Tests (`TreeFold.test.ts`, written first):**
  - post-order with children supplied in `childrenOf` order;
  - `combine` called once per distinct node when a child object is shared (a counter);
  - shared results are the same reference;
  - a leaf's `combine` gets `[]`;
  - a 100,000-deep chain and a 250,000-wide node complete;
  - `childrenOf` called once per distinct node (a counter);
  - a cycle (`a → b → a`) throws `/cycle/`, and a self-loop throws `/cycle/`;
  - a DAG diamond (`a → [b, c]`, `b → d`, `c → d`) is **not** reported as a cycle;
  - `R = undefined` works (the memo box);
  - a stateful `childrenOf` that would return a different array each call still yields
    a consistent fold, because the array is read once.
- **Verify:** `pnpm vitest run packages/core/test/TreeFold.test.ts && pnpm circular`
- **Done when:** The tests pass, coverage of `TreeFold.ts` is 100%, and madge is clean.

### T6 — Give `Policy.ts` its structural facts: `POLICY_TAGS`, `fieldsOf`, `foldPolicy`; rebase `policyDepth`
- **Status:** [x] done
- **Depends on:** T2, T5, D-02-b, D-02-c
- **Files:** `packages/core/src/Policy.ts`, `packages/core/test/Policy.tst.ts`, `packages/core/test/Policy.test.ts`, `packages/core/test/RolesAndDepth.test.ts`
- **Steps:**
  1. **D-02-b(a):** Rename the union at `Policy.ts:516-533` to a module-private
     `PolicyUnion = Schema.Union([...]).pipe(Schema.toTaggedUnion("_tag"))`, then
     `export const Policy: Schema.Codec<Policy, PolicyEncoded> = PolicyUnion;`. Add
     `export const POLICY_TAGS = PolicyUnion.discriminants;` with **no annotation**, so
     the exact tuple type is kept. Its doc names the reason (C5) and that the order is
     the union's declaration order.
  2. Run `pnpm typecheck`, which runs `tsc -b tsconfig.json` and so emits `.d.ts`.
     Inspect `packages/core/lib/Policy.d.ts`. Fall back to D-02-b(b) if any of these
     happen: TS2883/TS4023 appears, `POLICY_TAGS`'s emitted type names a
     non-exported identifier, or the emitted type exceeds roughly 2 KB. The fallback is
     `export const POLICY_TAGS: ReadonlyArray<Policy["_tag"]> = Record.keys(POLICY_TAG_SET)`
     with one exhaustive `Record<Policy["_tag"], true>` in `Policy.ts`. Record the
     outcome in the progress log.
  3. **D-02-c(a):** add `export const fieldsOf: (self: Policy) => ReadonlyArray<string> | undefined`
     as a hoisted `Match.type<Policy>().pipe(Match.tagsExhaustive({...}))`. The ten
     leaves return `p.fields`, and the six composites return `undefined`. Its doc:
     "The field restriction this node itself carries — never its children's;
     `undefined` means it narrows nothing."
  4. Add `export const foldPolicy = <R>(self: Policy, combine: (node: Policy, children: ReadonlyArray<R>) => R): R => foldTree(self, childrenOf, combine);`.
     Its doc says children arrive in `childrenOf` order (`Rules` = row order), that
     shared subtrees fold once, that the fold is stack-safe, and that a cycle throws.
  5. Re-implement `policyDepth` as
     `foldPolicy<number>(self, (_node, children) => children.length === 0 ? 0 : 1 + maxOf(children))`,
     with a private loop-based `maxOf` (no spread). Under D-02-e(b), also memoize per
     object: a module-scope `const depthMemo = new WeakMap<Policy, number>()` that is
     checked first and set after. Under D-02-f(a), the leaf case is
     `leafNesting(node)` (T12 adds it; until then it is `0`). Update the doc comment at
     `:1084-1112`: drop "walks with an explicit array-backed stack" and say "folds
     through `foldPolicy`".
  6. Update `childrenOf`'s doc (`:1048-1062`) so it points callers to `foldPolicy`
     rather than "the same explicit-stack technique".
- **Tests:**
  - `Policy.tst.ts`: `expect<(typeof POLICY_TAGS)[number]>().type.toBe<Policy["_tag"]>()`,
    `expect(fieldsOf).type.toBe<(self: Policy) => ReadonlyArray<string> | undefined>()`,
    and `foldPolicy`'s `R` inference.
  - `Policy.test.ts`: `POLICY_TAGS` has 16 unique entries; `fieldsOf` holds per tag
    (16 cases, including a leaf with `fields: []`, which returns `[]`, not `undefined`);
    `foldPolicy` counts nodes over `policyArbitrary` and the count equals a manual
    walk; `foldPolicy` on a cyclic object throws `/cycle/`.
  - `RolesAndDepth.test.ts:124-158` stay unchanged and must pass.
  - T2's `policyDepth` differential must pass.
- **Verify:** `pnpm vitest run packages/core/test/Policy.test.ts packages/core/test/RolesAndDepth.test.ts packages/core/test/PolicyWalkers.characterization.test.ts && pnpm test:tstyche && pnpm circular`
- **Done when:** All pass, `.d.ts` emission is acceptable (or the fallback is taken and logged), and madge is clean.

### T7 — Replace both hand-written tag lists with `POLICY_TAGS`
- **Status:** [x] done
- **Depends on:** T6
- **Files:** `packages/core/src/Decision.ts`, `packages/core/src/Evaluate.ts`
- **Steps:**
  1. `Decision.ts`: delete `TRACE_TAGS_BY_TAG`/`TRACE_TAGS` (`:52-91`), add a runtime
     `import { POLICY_TAGS } from "./Policy.ts"` beside the existing type import (`:17`),
     and use `Schema.Literals(POLICY_TAGS)` at `TraceSchema`. Rewrite the doc comment
     to say the literals come from the schema union, keeping the history of why
     exhaustiveness matters in one sentence.
  2. `Evaluate.ts`: delete `POLICY_TAGS_BY_TAG`/`POLICY_TAGS` (`:86-118`), import
     `POLICY_TAGS`, and leave `denialsByPolicyTagTotal` (`:134-137`) unchanged otherwise.
     `Record` is still needed for `EVALUATION_ERROR_TAGS` (`:155-169`), so keep the
     import.
  3. Run `pnpm circular`. Expected clean, per N8.
- **Tests:** T2 step 4's pins (`TraceSchema` accepts all 16 and rejects `"Probe"`; the metric's preregistered words) pass. If derivation changed the *order* of preregistered words, update the pin deliberately and note it. Order is not observable in the metric's values.
- **Verify:** `pnpm vitest run packages/core/test/Decision.test.ts packages/core/test/Evaluate.test.ts packages/core/test/PolicyWalkers.characterization.test.ts && pnpm circular`
- **Done when:** `grep -rn 'Record<Policy\["_tag"\], true>' packages/core/src` is empty and the tests are green.

### T8 — Migrate `simplify` and `explain` onto `foldPolicy`
- **Status:** [x] done
- **Depends on:** T6
- **Files:** `packages/core/src/Simplify.ts`, `packages/core/src/Explanation.ts`
- **Steps:**
  1. `Simplify.ts:200-231` becomes
     `export const simplify = (policy: Policy): Policy => foldPolicy<Policy>(policy, (node, children) => rebuild(node)(children));`.
     Import `foldPolicy` instead of `childrenOf`. Keep `rebuild`, `expectOne`, `flatten`
     and `absorbable` unchanged. Rewrite the doc at `:188-199` to say it folds through
     `foldPolicy`, and keep the "caller-held policy has no decode bound" rationale.
  2. `Explanation.ts:313-344` becomes `foldPolicy<Explanation>(policy, (node, children) => rebuildExplanation(node)(children))`.
     Update the docs at `:155-178` and `:296-312` the same way.
  3. Delete nothing else. The `expectOne` helpers still guard the single-child arms.
- **Tests:** The existing `Simplify.test.ts`/`Explanation.test.ts` pass unchanged, including the 100k-nesting and 250k-width tests (`Simplify.test.ts:297-345`, `Explanation.test.ts:546-578`). T2's differentials pass. Add a 250k-width test to `Explanation.test.ts`, which does not have one today.
- **Verify:** `pnpm vitest run packages/core/test/Simplify.test.ts packages/core/test/Explanation.test.ts packages/core/test/PolicyWalkers.characterization.test.ts`
- **Done when:** `grep -n "expanded\|traversal order bug" packages/core/src/Simplify.ts packages/core/src/Explanation.ts` is empty and all tests pass.

### T9 — Migrate `restrictsFields` to a fold over `fieldsOf`; make `translateNode` stack-safe
- **Status:** [x] done
- **Depends on:** T6, D-02-e, D-02-g
- **Files:** `packages/core/src/Predicate.ts`, `packages/core/test/Predicate.test.ts`, `packages/core/test/PolicyWalkers.characterization.test.ts`
- **Steps:**
  1. **D-02-e(b):** replace `TOO_DEEP`/`restrictsFields` (`:300-362`) with
     `const restrictsFields = (policy: Policy): boolean => foldPolicy<boolean>(policy, (node, children) => fieldsOf(node) !== undefined || children.some(isTrue));`
     (with a module-private `isTrue`). In `toPredicate` (`:608-637`), check
     `policyDepth(policy) > maxDepth` → `PolicyTooDeep({ maxDepth })` **first**, then
     `restrictsFields` → `untranslatable(...)`. Rewrite the doc at `:304-329` to drop
     the `Match.value` rationale (there is no dispatch left) and to state depth-first
     precedence.
     **D-02-e(a):** instead, implement `restrictsFields` as a pre-order explicit-stack
     search with depth tracking. It returns `"TooDeep" | boolean` in visit order, so
     N4's order dependence is preserved. It uses `fieldsOf` and `childrenOf`, not a
     tag list.
  2. **D-02-g(a):** change `:407` to
     `const child = (p: Policy) => Effect.suspend(() => translateNode(p, subject, action, depth + 1, maxDepth));`.
  3. Under D-02-e(b), flip T2's pinned example (d) in the same commit. Both orders now
     yield `PolicyTooDeep`. Add the spec change in T17 or in this commit (preferred).
- **Tests (write the stack tests first; both fail at HEAD):**
  - `Predicate.test.ts` gets the test "toPredicate on a 100k-deep `not` chain with `maxDepth: 200_000` translates without a defect". The expected predicate shape is alternating `Negate` down to a `True`/`False` constant, checked iteratively. Add the same for `labeled^100k`.
  - A 250k-wide `allOf` with one field-restricting leaf at the end is refused as untranslatable.
  - The existing `Predicate.test.ts:463-475` (100k `not`, default `maxDepth` → `PolicyTooDeep`) and the "restrictsFields protects every tag" block (`:478+`) pass unchanged.
- **Verify:** `pnpm vitest run packages/core/test/Predicate.test.ts packages/core/test/PolicyWalkers.characterization.test.ts`
- **Done when:** `grep -c "fields !== undefined" packages/core/src/Predicate.ts` is 0 and all tests pass.

### T10 — `foldExplanation`, and a stack-safe `renderExplanation`
- **Status:** [x] done
- **Depends on:** T5
- **Files:** `packages/core/src/Explanation.ts`, `packages/core/test/Explanation.test.ts`
- **Steps:**
  1. Add a module-private `explanationChildrenOf: (self: Explanation) => ReadonlyArray<Explanation>`
     as a hoisted `Match.tagsExhaustive`: `All`/`Any` → `parts`, `Negated`/`Named`/`Owing`
     → `[part]`, `Table` → `rows.map(r => r.condition)`, `Requirement` → `[]`.
  2. Export `foldExplanation = <R>(self: Explanation, combine: (node: Explanation, children: ReadonlyArray<R>) => R): R => foldTree(self, explanationChildrenOf, combine)`.
  3. Rewrite `renderExplanation` (`:449-516`). `go` becomes a hoisted
     `Match.type<Explanation>()` whose arms return
     `(children: ReadonlyArray<string>, ctx: RenderContext) => string`. `ctx` carries
     `term` and `fieldsText`. `embed` becomes "wrap child string *i* in parentheses
     unless `isAtomic(node's i-th child explanation)`". The combine reads the child
     *nodes* from the node it is given, so it needs no extra state. The top level stays
     unwrapped, as today (`:513-515`). Use a module-scope `expectOneString` for the
     single-child arms, mirroring `expectOne` (`:163-169`).
- **Tests:**
  - New, written first (fails at HEAD at about n = 734): `renderExplanation(explain(chain(not, 100_000, hasRole("a"))))` completes, starts with `"does not hold that ("`, and has the expected length `prefix.length * n + leafText.length + n`, computed arithmetically rather than by building the expected string.
  - New: a 250k-wide `anyOf` renders with 249,999 `" or "` separators (count with `split`).
  - T2's render differential passes. INV-QD-031's existing tests in `Explanation.test.ts` pass.
- **Verify:** `pnpm vitest run packages/core/test/Explanation.test.ts packages/core/test/PolicyWalkers.characterization.test.ts`
- **Done when:** All pass and `renderExplanation` contains no self-call (`grep -n "go(\|embed(" packages/core/src/Explanation.ts` shows only hoisted definitions, not a recursion).

### T11 — Matcher structural facts and `foldMatcher`; migrate `referencesRef` and `matcherText`
- **Status:** [x] done
- **Depends on:** T4, T5
- **Files:** `packages/core/src/Matcher.ts`, `packages/core/src/Explanation.ts`, `packages/core/test/Matcher.test.ts`, `packages/core/test/Explanation.test.ts`
- **Steps:**
  1. In `Matcher.ts`, add a module-private `matcherChildrenOf` (hoisted
     `Match.tagsExhaustive`): `FieldMatch`/`SomeMatch`/`EveryMatch`/`Size` →
     `[m.matcher]`, and the other eight → `[]`. Also add a module-private `refOf`:
     `Eq`/`Neq`/`Dominates` → `m.ref`, others → `undefined`.
  2. Export `foldMatcher = <R>(self: Matcher, combine: (node: Matcher, children: ReadonlyArray<R>) => R): R => foldTree(self, matcherChildrenOf, combine)`.
  3. Export `matcherDepth: (self: Matcher) => number` as
     `foldMatcher<number>(self, (_m, c) => c.length === 0 ? 0 : 1 + maxOf(c))`. Its doc
     says it counts the way `evaluateMatcher` recurses. It is needed by T12, and
     harmless if D-02-f is not (a).
  4. Rewrite `referencesRef` (`:441-459`) as
     `(leafTag) => (self) => foldMatcher<boolean>(self, (m, c) => refOf(m)?._tag === leafTag || c.some(isTrue))`.
     The two exported walkers keep their names and docs, and the SM-04/WZ-04 lockstep
     argument now applies to `matcherChildrenOf`/`refOf`.
  5. In `Explanation.ts`, rewrite `matcherText` (`:128-143`) as
     `(self) => foldMatcher<string>(self, matcherTextStep)`, where `matcherTextStep` is a
     hoisted `Match.type<Matcher>()` whose arms take the child's string, via
     `expectOneString`, for the four recursive tags.
  6. Leave `evaluateMatcher` and `resolveRef` (switches) untouched.
- **Tests (stack tests written first; they fail at HEAD):**
  - `Matcher.test.ts`: `referencesAction(chain(size, 100_000, eq(action())))` is `true`; `referencesResource` on the same chain is `false`; `matcherDepth` of that chain is 100,000; `matcherDepth(eq(literal(1)))` is 0.
  - `Explanation.test.ts`: `explain(hasAttribute("x", chain(size, 100_000, eq(literal(1)))))` completes and its `detail` starts with `"the subject's x has a size that has a size that"`.
  - T4's differentials pass.
- **Verify:** `pnpm vitest run packages/core/test/Matcher.test.ts packages/core/test/Explanation.test.ts packages/core/test/MatcherWalkers.characterization.test.ts && pnpm circular`
- **Done when:** All pass and madge is clean (`Matcher.ts → TreeFold.ts` is a new edge with no back-edge).

### T12 — Count matcher nesting in nesting-depth semantics
- **Status:** [x] done
- **Depends on:** T6, T11, D-02-f, D-02-e
- **Files:** `packages/core/src/Policy.ts`, `packages/core/src/Evaluate.ts` (only under D-02-e(a)), `packages/core/src/Predicate.ts` (only under D-02-e(a)), `packages/core/test/RolesAndDepth.test.ts`, `packages/core/test/Evaluate.test.ts`, `packages/core/test/PolicyWalkers.characterization.test.ts`
- **Steps (D-02-f(a)):**
  1. In `Policy.ts`, add a module-private `matcherOf` (hoisted `Match.tagsExhaustive`):
     `HasAttribute`/`HasResourceAttribute` → `p.matcher`, every other tag → `undefined`.
     This is the third per-tag structural fact. Leaf nesting is
     `leafNesting = (p) => { const m = matcherOf(p); return m === undefined ? 0 : matcherDepth(m); }`.
  2. Change `policyDepth`'s combine to `children.length === 0 ? leafNesting(node) : 1 + maxOf(children)`.
     Update its doc and INV-QD-037's wording in T17.
  3. Under D-02-e(b) the root pre-checks (T9, T13) now bound `evaluateMatcher` with no
     further change. Under D-02-e(a), add `if (depth + matcherDepth(policy.matcher) > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));`
     at the top of the `HasAttribute` and `HasResourceAttribute` cases of `evaluateNode`
     (inside the existing switch, so the count is unchanged) and in `translateNode`'s
     `foldAttribute`/`HasResourceAttribute` arm.
  4. Flip T2's pinned example (f): the value becomes `2`.
  - **Under D-02-f(b):** add `MAX_MATCHER_DEPTH` and the check in the same two arms
    instead, and keep `policyDepth` matcher-blind. **Under (c):** skip this task and
    record the decision in ADR-QD-NEXT.
- **Tests:**
  - New: `evaluate(hasAttribute("x", chain(someMatch, 100_000, eq(literal(1)))))` fails with `PolicyTooDeep`, not a `Die`. Assert `Exit` failure and `_tag`, with `Cause.hasDies` false.
  - New: the INV-QD-037 agreement property in `RolesAndDepth.test.ts:~95-122` is extended with matcher-bearing policies (`hasAttribute("tags", someMatch(eq(...)))` at nesting depths 1–3) and still holds in both directions.
- **Verify:** `pnpm vitest run packages/core/test/RolesAndDepth.test.ts packages/core/test/Evaluate.test.ts packages/core/test/PolicyWalkers.characterization.test.ts`
- **Done when:** All pass and no matcher input crashes `evaluate`.

### T13 — Make nesting depth deterministic in `evaluate` (root pre-check)
- **Status:** [x] done
- **Depends on:** T6, D-02-e
- **Files:** `packages/core/src/Evaluate.ts`, *new bench case in* `packages/core/bench/Evaluate.bench.ts`, `packages/core/test/RolesAndDepth.test.ts`, `packages/core/test/Evaluate.test.ts`, `packages/core/test/PolicyWalkers.characterization.test.ts`
- **Steps (D-02-e(b)):**
  1. **Benchmark first.** Run `pnpm bench` (that is, `vitest bench --run`) for
     `Evaluate.bench.ts` 2–3 times on HEAD and record the means for `one node`, `wide`,
     `deep`, `matcher-heavy` and `field-heavy`. Use the same machine and the same day,
     following AGENTS.md §5's ticket #102 method.
  2. In the cache-miss thunk (`Evaluate.ts:~1540-1557`), just before
     `return evaluateNode(...)`, add
     `const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH; if (policyDepth(policy) > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));`.
     It sits inside the thunk so the failure flows exactly as today's per-node failure
     does: counted by `evaluationErrorsTotal`, recorded to `DecisionSink` as `Failed`,
     and keyed by `maxDepth` in the cache (`DecisionCache.ts:83-97`). Keep
     `evaluateNode`'s own guard (`:900`).
  3. Re-run the benchmark. Accept if every workload's mean is within run-to-run noise
     (AGENTS.md §5a cites about 30% absolute variance between runs, so compare
     same-session ratios). If it is not within noise, stop. Revert to D-02-e(a), mark
     this task `blocked`, and record both runs in the progress log and ADR-QD-NEXT.
  4. Flip T2's pinned example (e): both cases now fail with `PolicyTooDeep`.
  - **Under D-02-e(a):** this task is replaced by the spec rewording in T17 and becomes
    a no-op here. Mark it `dropped` in the log.
- **Tests:**
  - `RolesAndDepth.test.ts`: extend the agreement test (`:~95-122`) with short-circuit policies (`anyOf([allowing, deep])` and `allOf([denying, deep])`) for subjects that allow and that deny. Assert `policyDepth(p) <= n ⇔ no PolicyTooDeep` in **both** directions.
  - `Evaluate.test.ts`: `PolicyTooDeep` is reported identically for two subjects with different roles on the same over-deep policy.
- **Verify:** `pnpm vitest run packages/core/test/RolesAndDepth.test.ts packages/core/test/Evaluate.test.ts && pnpm bench`
- **Done when:** The tests pass and the before/after bench numbers are recorded in §10 and ADR-QD-NEXT.

### T14 — Stop eager child construction in `evaluateNode`'s wrapper arms
- **Status:** [x] done
- **Depends on:** D-02-g
- **Files:** `packages/core/src/Evaluate.ts`, `packages/core/bench/Evaluate.bench.ts`, `packages/core/test/Evaluate.test.ts`
- **Steps (D-02-g(a)):**
  1. Add a bench case `wrapper-heavy — 10 nested labeled/not/obliged` to
     `Evaluate.bench.ts`. Today's `deep` uses only `allOf`/`anyOf`/`not` (`:141-149`),
     so it under-samples wrappers. Run it 2–3 times on HEAD.
  2. In the `Not`, `Obliged` and `Labeled` arms (`Evaluate.ts:1019-1060`), change
     `evaluateNode(policy.policy, …)` to
     `Effect.suspend(() => evaluateNode(policy.policy, …))`. The switch is unchanged.
     The doc at `:884-891` ("Not `Effect.suspend`-wrapped") gains a sentence: the
     *leaf* comparison still runs eagerly, but a wrapper's child is suspended so that
     construction cannot recurse natively (C3e).
  3. Re-run the benchmark. Accept within noise. Otherwise apply D-02-g(b) for
     `evaluateNode` (reject `maxDepth > ` a documented ceiling) and log it.
- **Tests (written first; they fail at HEAD):** `Evaluate.test.ts` evaluates `chain(labeled, 100_000)`, `chain(not, 100_000)` and `chain(obliged, 100_000)` over `hasRole("editor")` with `maxDepth: Infinity`. Each yields a decision, not a `Die`. Check the verdict, and check the trace's nesting depth iteratively (walk `.children[0]` in a loop). Do not use `renderTrace`, which is out of scope (§3).
- **Verify:** `pnpm vitest run packages/core/test/Evaluate.test.ts && pnpm bench`
- **Done when:** The tests pass, the bench is recorded, and `node scripts/check-house-style.mjs` shows `SWITCH_BUDGET` unchanged.

### T15 — Migrate devtools `requirementsOf` and `witness` onto core's folds
- **Status:** [x] done
- **Depends on:** T3, T6, T11
- **Files:** `packages/devtools/src/model/Remedies.ts`, `packages/devtools/test/model/Remedies.test.ts`, `packages/devtools/test/model/WhatIf.test.ts`
- **Steps:**
  1. `requirementsOf` (`:248-286`) becomes
     `(self: Policy) => foldPolicy<ReadonlyArray<Requirement>>(self, (node, children) => requirementStep(node)(children))`.
     `requirementStep` is a hoisted `Match.type<Policy>().pipe(Match.tagsExhaustive(...))`.
     Leaves return their own singleton (or `[]`) and ignore `children`. `AllOf`/`AnyOf`
     → `children.flat()`. `Obliged`/`Labeled` → the single child (via a local
     `expectOne`). `Not` → `[]`, which ignores the folded child and keeps the
     anti-remedy rule. `Rules` → the children at indices where
     `p.rules[i].effect === "Permit"`, flattened, iterating with `entries()` so no
     index check is needed. Keep the doc block at `:52-67` and `:238-247`, and add one
     line: "folded through `foldPolicy` so a caller-held policy of any nesting depth
     cannot overflow it (C7)". Complexity note for the doc: concatenation copies match
     today's `flatMap` (O(leaves × nesting depth)), which is not a regression.
  2. `satisfyingValue` (`:107-108`) becomes
     `foldMatcher<Synthesised>(matcher, (m, children) => witnessStep(m)(children, input))`.
     `witnessStep` is the current `witness` table (`:128-178`) with each recursive arm
     reading its one child result instead of calling `witness(m.matcher)(input)`.
     `mapValue` is unchanged. Delete `witness`.
  3. Import `foldPolicy`/`foldMatcher` by name from `@qadi/core` (AGENTS.md §1).
- **Tests (stack tests first; they fail at HEAD):**
  - `Remedies.test.ts`: `remedyEdits(chain(labeled, 100_000, hasRole("editor")), input)` returns one `GrantRole` edit. The same holds for `obliged`, `allOf([p])` and `rules([permitWhen(p)])`. `chain(not, 100_000, …)` returns no edits.
  - `Remedies.test.ts`: `satisfyingValue(chain(fieldMatch "a", 100_000, eq(literal(1))), input)` is a `Value` nested 100k deep, checked iteratively.
  - `WhatIf.test.ts`: `sweepPlan(chain(labeled, 100_000, …), input)` completes. This is the public entry point the simulator uses.
  - T3's differentials pass.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Remedies.test.ts packages/devtools/test/model/WhatIf.test.ts packages/devtools/test/model/Walkers.characterization.test.ts`
- **Done when:** All pass and `grep -n "requirementsOf(\|witness(" packages/devtools/src/model/Remedies.ts` shows no self-recursion.

### T16 — Devtools-local fold for `Inspect` (`build`, `flattenTree`)
- **Status:** [x] done
- **Depends on:** T3, D-02-d
- **Files:** *new* `packages/devtools/src/model/TreeFold.ts`, *new* `packages/devtools/test/model/TreeFold.test.ts`, `packages/devtools/src/model/Inspect.ts`, `packages/devtools/test/model/Inspect.test.ts`
- **Steps (D-02-d(b)):**
  1. Create `packages/devtools/src/model/TreeFold.ts` with the same `foldTree` contract
     as T5. Copy the implementation and its tests, and say in the doc: "a deliberate,
     package-private twin of `@qadi/core`'s internal `TreeFold.ts`; AGENTS.md §9 keeps
     the generic one out of core's barrel (ARCH-02 D-02-d)". Do **not** export it from
     `packages/devtools/src/index.ts`.
  2. `Inspect.build` (`:236-261`): define `interface Position { readonly explanation; readonly trace; readonly path; readonly effect; readonly shape: Shape }`
     and a `position(...)` constructor that computes `shapeOf` once. Children are
     `pos.shape.parts.map((part, i) => position(part.explanation, pos.trace?.children[i], \`${pos.path}.${i}\`, part.effect))`.
     The combine builds the `InspectNode` exactly as `:243-259` does, with `children`
     set to the folded results. `inspect` becomes `foldTree(position(explain(policy), trace, "$", undefined), childrenOfPosition, toInspectNode)`.
  3. `flattenTree` (`:151-155`) becomes an explicit-stack **pre-order** loop: push the
     root, pop, emit, push children in reverse. It is **not** a fold, because folding
     would concatenate O(n × nesting depth) arrays (a 100k chain would mean about
     5·10⁹ copies). This stays a small local loop.
- **Tests (stack tests first; they fail at HEAD at about 1.76k):**
  - `Inspect.test.ts`: `inspect(chain(not, 100_000, hasRole("a")), undefined)` completes, every node is `NeverResolved`, and the paths are `$`, `$.0`, `$.0.0`, …, checked iteratively.
  - `flattenTree` of that tree has length 100,001, in pre-order.
  - The same holds with a real trace from `evaluate` at `maxDepth: 200_000` (after T14), with all nodes `Allowed`/`Denied` alternating.
  - `isTruncated` is unchanged.
  - T3's differentials pass, and `TreeFold.test.ts` mirrors T5's cases.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Inspect.test.ts packages/devtools/test/model/TreeFold.test.ts packages/devtools/test/model/Walkers.characterization.test.ts`
- **Done when:** All pass and devtools model coverage is still ≥ 95%.

### T17 — Spec, overview, ADR, CCR, website and changeset
- **Status:** [x] done
- **Depends on:** T6–T16 (write each part in the same commit as its code where §11 requires it; this task collects and completes)
- **Files:** `spec/overview.md`, `spec/behaviors/25-inspection.md`, `spec/behaviors/18-explanation.md`, `spec/behaviors/04-matchers.md`, `spec/behaviors/05-evaluator.md`, `spec/behaviors/16-predicates.md`, `spec/behaviors/20-simplification.md`, `spec/behaviors/29-devtools-simulator.md`, `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/behaviors/index.yaml`, `spec/README.md` (CCR table), *new* `spec/decisions/0NN-a-tree-is-folded-through-one-seam.md` (ADR-QD-NEXT), `spec/decisions/index.yaml`, `apps/website/src/content/docs/docs/reference/api.md`, *new* `.changeset/<name>.md`
- **Steps:** See §8 for the content. Execution order:
  1. Write ADR-QD-NEXT first, recording D-02-a…h as decided.
  2. Update the behaviors, invariants and traceability for every behavior change.
  3. Add the `spec/overview.md` rows and bump its Document Control revision and change
     history.
  4. Add the CCR row.
  5. Update the website reference.
  6. Add the changeset.
- **Tests:** The doc gates themselves.
- **Verify:** `node scripts/check-doc-examples.mjs && bash spec/scripts/verify-traceability.sh --strict && node scripts/check-api-surface.mjs && node scripts/check-devtools-claims.mjs && node scripts/check-website-doc-examples.mjs`
- **Done when:** All five scripts exit 0.

### T18 — Remove the frozen oracles, prove the criteria, run the full gate
- **Status:** [x] done
- **Depends on:** T1–T17
- **Files:** delete `packages/core/test/legacy/PolicyWalkers.legacy.ts` and `packages/devtools/test/model/legacy/Walkers.legacy.ts`; trim `packages/core/test/PolicyWalkers.characterization.test.ts`, `packages/core/test/MatcherWalkers.characterization.test.ts` and `packages/devtools/test/model/Walkers.characterization.test.ts`
- **Steps:**
  1. Delete the legacy oracle files and the *differential* `it`s that import them. Keep
     every *pinned-example* `it` and move it into the walker's own test file
     (`Simplify.test.ts`, `Explanation.test.ts`, `Predicate.test.ts`,
     `RolesAndDepth.test.ts`, `Remedies.test.ts`, `Inspect.test.ts`), then delete the
     now-empty characterization files. This replaces rather than layers (§7).
  2. Run the §2 greps (criteria 1–3) and paste their output into §10.
  3. Run `pnpm check` end to end (gates 1–24). Note: `pnpm mutation` runs six Stryker
     configurations, and the two that matter here are `stryker run` and
     `stryker run stryker.devtools.mjs`.
  4. Re-run the `probe-tag` procedure on a scratch copy outside the repo:
     ```bash
     S=$(mktemp -d) && cp -R packages/core/src "$S/src" && ln -s "$PWD/packages/core/node_modules" "$S/node_modules"
     # add `| { readonly _tag: "Probe"; readonly fields?: ReadonlyArray<string> | undefined }` to Policy and PolicyEncoded,
     # `const Probe = Schema.TaggedStruct("Probe", { fields: Fields })` and `Probe` in the union, then:
     node_modules/.bin/tsc -p <scratch tsconfig with the base strict flags> | grep error
     ```
     Expect errors only in `Policy.ts` (`childrenOf`, `fieldsOf`, `matcherOf`),
     `Evaluate.ts` (the switch), `Explanation.ts`, `Predicate.ts` (`translateNode`) and
     `Simplify.ts`, plus `Remedies.ts` when devtools is included. That meets criterion 4.
- **Verify:** `pnpm check`
- **Done when:** `pnpm check` exits 0 and §10 records the grep, the probe and the Stryker scores.

## 7. Test strategy

**Survives unchanged.** The existing nesting-depth regressions
(`RolesAndDepth.test.ts:124-158`, `Simplify.test.ts:297-345`,
`Explanation.test.ts:546-578`, `Predicate.test.ts:463-475`). The INV-QD-031 rendering
tests. ADR-QD-030's simplification properties. The Matcher behavior tests. The
`restrictsFields protects every tag` block (`Predicate.test.ts:478+`). These are the
outside view of each walker, and they must pass at every step.

**Characterization, then replaced.** T2–T4 add *differential* tests against frozen,
verbatim copies of the legacy walkers. These are the strongest pin available: every
generated policy, shared subtrees included, must give a byte-equal result. They are
**deleted in T18**, because once the old code is gone they only compare the new code
with a copy of itself. The *pinned examples* (identity sharing, empty composites,
`Rules` alignment, `Not`/`Deny` pruning, N3/N4 precedence, matcher nesting depth)
outlive them and move into each walker's own test file.

**Intentionally flipped assertions.** Each is marked `// PINNED — flips under …` in T2:
(d) `toPredicate` precedence (D-02-e(b), T9), (e) short-circuit past an over-deep
branch (D-02-e(b), T13), and (f) matcher nesting depth (D-02-f(a), T12). Each flips in
the same commit as its spec change.

**Stack-depth test per walker.** Each must complete at 100,000 nesting and, where the
walker takes lists, at 250,000 width:

| Walker | Test file | Today at HEAD |
| ------ | --------- | ------------- |
| `foldTree` (core) | `TreeFold.test.ts` (T5) | new |
| `policyDepth` | `RolesAndDepth.test.ts:124-158` | passes |
| `simplify` | `Simplify.test.ts:297-345` | passes |
| `explain` | `Explanation.test.ts:546-578`, plus width (T8) | passes / new |
| `renderExplanation` | `Explanation.test.ts` (T10) | **overflows ≈734** |
| `referencesAction`/`referencesResource`, `matcherDepth` | `Matcher.test.ts` (T11) | **overflows** |
| `explain` over a deep matcher (`matcherText`) | `Explanation.test.ts` (T11) | **overflows** |
| `toPredicate` (`restrictsFields`, `translateNode`) with large `maxDepth` | `Predicate.test.ts` (T9) | **`Die` ≈1k** |
| `evaluate` with large `maxDepth` (`Not`/`Obliged`/`Labeled`) | `Evaluate.test.ts` (T14) | **`Die` ≈5k** |
| `evaluate` over a deep matcher | `Evaluate.test.ts` (T12) | **`Die`** |
| `remedyEdits`/`sweepPlan` (`requirementsOf`) | `Remedies.test.ts`, `WhatIf.test.ts` (T15) | **overflows ≈2k** (`Rules` <1k) |
| `satisfyingValue` (`witness`) | `Remedies.test.ts` (T15) | **overflows** |
| `inspect` (`build`), `flattenTree` | `Inspect.test.ts` (T16) | **overflows ≈1.76k** |
| `foldTree` (devtools twin) | `devtools/test/model/TreeFold.test.ts` (T16) | new |

**Property tests.** INV-QD-037 agreement extended to short-circuit and matcher-bearing
policies, in both directions (T12, T13). `foldPolicy` node count equals a manual count
(T6). Every FastCheck call uses an explicit `seed`, per the house convention noted at
`RolesAndDepth.test.ts:~170`.

**Type-level tests (gate 6, tstyche).** `POLICY_TAGS` element type ≡ `Policy["_tag"]`.
The signatures of `fieldsOf` and `foldPolicy` (T6).

**Mutation (Stryker).** Core (`stryker run`, break 80) covers `TreeFold.ts`, `Policy.ts`
and the migrated walkers. `foldTree` has one reachable defensive branch (the cycle
throw), and T5 covers it. The loop is iterator-driven, so `noUncheckedIndexedAccess`
leaves no dead branch to survive. Devtools (`stryker run stryker.devtools.mjs`, break
80) covers `Remedies.ts`, `Inspect.ts` and the devtools `TreeFold.ts`. Compare scores
against the last report in `.reports/mutation` and `.reports/mutation-devtools`. A drop
below the previous score on a touched file is investigated before merge, not only a
drop below 80.

**Benchmarks.** `Evaluate.bench.ts` before and after T13 and T14, with a new
`wrapper-heavy` case. The numbers are recorded, not asserted, as in ADR-QD-034 and
ADR-QD-073.

## 8. Spec and documentation updates

`spec/` is normative (AGENTS.md §11), so each item lands with the code that needs it.

- **ADR-QD-NEXT** — "A tree is folded through one seam, and nesting depth is a property
  of the policy". It records D-02-a…h as decided, the C2/C3/N1/N2 evidence with probe
  thresholds, and the benchmark tables from T13/T14 (or the fallback taken). Under
  **Not yet** it lists the `Trace` walkers (`renderTrace`, `diffTraces`) and the seven
  test arbitraries. Add it to `spec/decisions/index.yaml`. Cross-reference ADR-QD-034
  (the switches stay) and ADR-QD-002 (`POLICY_TAGS` is derived).
- **`spec/behaviors/25-inspection.md`** — BEH-QD-191 is restated per D-02-e:
  - (b) "MUST hold exactly when", now true, plus a REQUIREMENT that `evaluate` and
    `toPredicate` check nesting depth before any other judgement;
  - (a) the one-directional form, with the short-circuit caveat;
  - under D-02-f(a), matcher nesting counts.
  New BEH-QD-NEXT entries, with `ts` signature fences:
  - `foldPolicy`: post-order, children in `childrenOf` order, shared subtrees folded
    once, MUST NOT exhaust the call stack, and a cycle is a thrown defect;
  - `fieldsOf`: a node's own restriction, never its children's;
  - `POLICY_TAGS`: every tag, in union order, derived from the schema.
- **`spec/behaviors/18-explanation.md`** — a REQUIREMENT that `explain` and
  `renderExplanation` MUST NOT exhaust the call stack for any caller-held policy,
  including a deep matcher. Add `foldExplanation` (BEH-QD-NEXT).
- **`spec/behaviors/04-matchers.md`** — `foldMatcher` and `matcherDepth` (BEH-QD-NEXT),
  and a REQUIREMENT that `referencesAction`/`referencesResource` are stack-safe.
- **`spec/behaviors/05-evaluator.md`** — BEH-QD-038 gains:
  - "a policy deeper than `maxDepth` MUST be rejected regardless of which branches
    evaluation would visit" (D-02-e(b));
  - "evaluation MUST NOT raise a defect for any `maxDepth` a caller supplies"
    (D-02-g(a));
  - under D-02-f(a), "matcher nesting counts toward `maxDepth`".
- **`spec/behaviors/16-predicates.md`** — near BEH-QD-124/the table at `:112`: "an
  over-deep policy is refused with `PolicyTooDeep` before the fields check" (D-02-e(b)),
  and `toPredicate` MUST NOT raise a defect for any `maxDepth`.
- **`spec/behaviors/20-simplification.md`** — the stack-safety sentence now references
  `foldPolicy` rather than "explicit stack via `childrenOf`" (wording only).
- **`spec/behaviors/29-devtools-simulator.md`** (BEH-QD-222/223) and
  **`spec/behaviors/28-devtools-screens.md`** — a REQUIREMENT that a sweep's remedy
  derivation, a matcher witness and the inspector tree MUST NOT exhaust the call stack
  for any caller-held policy. Run `node scripts/check-devtools-claims.mjs` (gate 12) in
  case any "absent" claim changes. None is expected.
- **`spec/invariants.md`** — rewrite INV-QD-037 (`:~1346-1365`) per D-02-e/f, and update
  its Source and Enforcement. Add **INV-QD-NEXT**: "A pure walk over a caller-held
  `Policy`, `Explanation` or `Matcher` never exhausts the call stack". Its Source is
  `TreeFold.ts` and the three adapters, and its Enforcement is §7's stack-depth table.
- **`spec/traceability.md`** — rows for each new BEH/INV and their tests. Update the
  INV-QD-037 row (`:117`).
- **`spec/overview.md`** (gate 13):
  - The "Inspecting a policy…" table (`:305-312`) gains `foldPolicy`, `fieldsOf`,
    `POLICY_TAGS` (`Policy.ts`), `foldExplanation` (`Explanation.ts`) and
    `foldMatcher`, `matcherDepth` (`Matcher.ts`).
  - Rewrite the `childrenOf` prose at `:317-321`. It now says "`childrenOf` is the
    per-tag fact `foldPolicy` folds over" and names `simplify`/`explain` as `foldPolicy`
    users, not the "explicit-stack walk" text.
  - "Not listed above" gains `foldTree` (`@qadi/core/TreeFold.ts`): "Deliberately kept
    out of the barrel per AGENTS.md §9 — generic scaffolding behind `foldPolicy`,
    `foldExplanation` and `foldMatcher`, reachable only through the `./*` wildcard
    subpath."
  - Bump Document Control to 1.25 with a change-history line citing CCR-QD-NEXT.
- **`spec/README.md`** — a **CCR-QD-NEXT** row: "Policy, Explanation and Matcher
  walkers fold through one seam; per-tag facts owned by `Policy.ts`;
  [D-02-e/f/g outcomes]".
- **`AGENTS.md`** — no rule changes. Optionally, add one sentence to §7, in the same
  locality spirit as §3's "layers live beside what they implement": "per-tag structural
  facts (`childrenOf`, `fieldsOf`, `POLICY_TAGS`) live beside the ADT in `Policy.ts`".
  Only do this if reviewers want it. It is not required by any gate.
- **`apps/website/src/content/docs/docs/reference/api.md`** — it mentions
  `childrenOf`/`policyDepth`. Add the new exports and correct the `childrenOf`
  description. Gate 22 (`node scripts/check-website-doc-examples.mjs`) compiles any
  `typescript` fence.
- **Changeset** — `.changeset/policy-fold-seam.md`: `@qadi/core` and `@qadi/devtools`.
  It is `minor` if D-02-e(b) or D-02-f(a) is taken, and it must say it is **breaking**:
  depth-first `PolicyTooDeep`, and matcher nesting counting toward `maxDepth` (user
  memory: 0.x breaking rides a minor and says so). Otherwise it is `patch`. The
  `fixed` group in `.changeset/config.json` versions all nine packages together.

## 9. Risks and rollback

| Risk | How it shows up | Mitigation / rollback |
| ---- | --------------- | --------------------- |
| `toTaggedUnion`'s inferred tuple type emits poorly or fails `.d.ts` emission | `pnpm typecheck` (gate 1) errors TS2883/TS4023, or an unreadable `lib/Policy.d.ts` | T6 step 2 falls back to D-02-b(b): one exhaustive `Record` in `Policy.ts`. The rest of the plan is unaffected. |
| `Schema.toTaggedUnion` mutates the `Policy` schema object (`Object.assign`) and changes decode/encode or `Equal` behavior | T2 differentials, the `Policy.test.ts` round-trip property, or `SinkCodec.test.ts` go red | The spike showed the round trip intact. If anything regresses, use the fallback above. |
| Root pre-check (D-02-e(b)) costs measurable time on the hot path | T13 bench outside noise | Fall back to D-02-e(a) (spec-only). The `WeakMap` memo already limits the cost to the first evaluation of each policy object. |
| D-02-e(b)/D-02-f(a) break a consumer whose policy relied on short-circuiting past an over-deep branch, or sits near `maxDepth` with nested matchers | A consumer's evaluation now fails with `PolicyTooDeep` | This is intended and documented as breaking in the changeset. Consumers raise `maxDepth`. Rollback: revert T12/T13 and keep the seam (T5–T11, T15–T16 do not depend on them). |
| `Effect.suspend` in wrapper arms regresses `Evaluate.bench.ts` | T14 bench | Revert the three-line change and apply D-02-g(b) for `evaluateNode` only. |
| Memo by identity changes an output where a walker relied on per-occurrence recomputation | T2/T3 differentials over `sharedPolicyArbitrary` | No walker today has per-occurrence state. If one did, it would fail here, before the migration commits. |
| Folding re-orders children (for example `Rules`) | Pinned example (c), `Rules` alignment; `remedyEdits` order pin | `foldTree` reads children through one iterator in `childrenOf` order, and the T5 order test pins it. |
| madge cycle | Gate 5 | `TreeFold.ts` imports nothing. The only new runtime edge into a hub is `Decision.ts → Policy.ts`, verified in the spike (N8). |
| Mutation score drops on touched files | Gates 16–17 | `foldTree` has no dead branches by design. Add tests for any surviving mutant before merge. Do not add `Stryker disable` comments (none exist in core today). |
| Devtools' twin `TreeFold.ts` drifts from core's | Divergent behavior on cycles or order | Both copy the same test file (T5 and T16), and ADR-QD-NEXT names the twin. If a third package needs it, reopen D-02-d(a) with an ADR. |

**Rollback granularity.** Each task is a separate commit. T5–T11 and T15–T16 change no
observable behavior: they are refactors pinned by differentials, and they fix crashes
only. T12, T13 and T14 are the only behavior changes, and each can be reverted on its
own.

**Estimate rationale.** Characterization takes about 1.5 days, the seam about 1 day,
the core migrations about 1.5 days, matcher work about 1 day, the evaluate work with
benchmarks about 1 day, devtools about 1 day, spec/ADR/CCR about 1 day, and full gate
runs including six Stryker configurations about 0.5 days. That totals roughly 8.5 days,
which is **XL**. If D-02-e, D-02-f and D-02-g all take option (a), T12–T14 shrink to
spec wording and a small guard, giving about 6 days, which is **L**.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-04 | — | Plan written; evidence re-verified at `1caf04c` with scratch probes (`probe*.ts`, `spike/`, `probe-tag/`). Status `needs-decision`: D-02-a…h open. | Claude (plan agent) |
| 2026-10-04 | D-02-a…h | All eight open decisions taken at the plan-recommended option and recorded as `decided (2026-10-04, recommended default)` in §5: a, b(a), c(a), d(b), e(b), f(a), g(a), h(a). The user had not decided them. Breaking options taken: D-02-e(b) and D-02-f(a) (D-02-g(a) is not breaking). | Claude (implementation agent) |
| 2026-10-04 | T1–T4 | Characterization landed first: all-tags `policyArbitrary`/`sharedPolicyArbitrary`/`matcherArbitrary`/`chain` (core); `chain` only in devtools, which has no `fast-check`. Frozen whole-module copies (`Simplify`, `Explanation`, `Matcher`, devtools `Remedies`, `Inspect`) plus verbatim `policyDepth`/`restrictsFields` served as differential oracles over 1000 generated policies. Devtools generators were a seeded mulberry32 PRNG, so no dependency was added. All green at HEAD with no source change. Built on top of ARCH-01: `translateNode` no longer exists, so T9 targets `compile`/`run`. | Claude (implementation agent) |
| 2026-10-04 | T5 | `packages/core/src/TreeFold.ts`: frame holds a child iterator, ancestors on a second stack, `for (;;)` returns when no ancestor is left, so the loop has no dead branch. 10 tests, 100% coverage, madge clean. | Claude (implementation agent) |
| 2026-10-04 | T6 | `POLICY_TAGS` via `toTaggedUnion`, `fieldsOf`, `foldPolicy`, `policyDepth` rebased. D-02-b(a) `.d.ts` emission verified clean, fallback not needed. tstyche assertions added. | Claude (implementation agent) |
| 2026-10-04 | T7 | Both hand-written tag records deleted; `Decision.ts` and `Evaluate.ts` read `POLICY_TAGS`. | Claude (implementation agent) |
| 2026-10-04 | T8 | `simplify` and `explain` are one-line `foldPolicy` calls. 250k-width `explain` test added. | Claude (implementation agent) |
| 2026-10-04 | T9 | Targeted the post-ARCH-01 code: `restrictsFields` is a fold over `fieldsOf`, `compileTree` folds through `foldPolicy`, and `run`'s `Negation` suspends its child (the `Effect.suspend` the plan placed on `translateNode`'s `child`). Pinned example (d) flipped: both child orders now give `PolicyTooDeep`. | Claude (implementation agent) |
| 2026-10-04 | T10, T11 | `foldExplanation` and a stack-safe `renderExplanation` (each rendered node hands up `{ text, atomic }`, so no index lookup is needed); `foldMatcher`, `matcherDepth`, `referencesRef` and `matcherText` on the seam. Correction to the plan's arithmetic: the 100k `not` chain renders with `n` prefixes, the leaf and `n - 1` parenthesis pairs (the leaf is atomic), not `n` pairs. | Claude (implementation agent) |
| 2026-10-04 | T13 | Baseline recorded first (3 runs), then interleaved A/B (4 runs each, medians in ops/s, A = no pre-check, B = pre-check with `WeakMap` memo): `one node` 107k/100k, `wide` 83k/87k, `deep` 67k/66k, `wrapper-heavy` 85k/83k, `matcher-heavy` 68k/63k, `resolver miss` 60k/61k, `obligation-heavy` 58k/58k, `field-heavy` 42k/41k. The baseline's own four runs spread up to ±15% (`one node` 103k–112k), so no workload is outside noise; fallback to D-02-e(a) not taken. Pinned example (e) flipped. | Claude (implementation agent) |
| 2026-10-04 | T14 | `Evaluate.bench.ts` gained `wrapper-heavy`. Interleaved A/B (4 runs each): `wrapper-heavy` 87k to 82k (−6%), `deep` 67k to 67k, `one node` 113k to 112k, `wide` 86k to 84k; the two workloads with no wrapper node (`obligation-heavy` −8%, `field-heavy` −4%) show the same drift, so it is machine variance. D-02-g(b) fallback not taken. 100k-deep `labeled`/`not`/`obliged` chains evaluate at `maxDepth: Infinity`. T13 and T14 landed in one commit. | Claude (implementation agent) |
| 2026-10-04 | T12 | Under D-02-e(b) nothing changed in `Evaluate.ts`/`Predicate.ts`: the root pre-checks bound `evaluateMatcher`. `matcherOf` is asked at every node so its exhaustive arms all run. Pinned example (f) flipped to `2`. | Claude (implementation agent) |
| 2026-10-04 | T15, T16 | Devtools `requirementsOf` and `witness` fold through core's public `foldPolicy`/`foldMatcher`; `Inspect` folds zipped positions through a private `TreeFold.ts` twin, and `flattenTree` is a pre-order loop. `remedyEdits` and `sweepPlan` survive 100k levels (they crashed at about 2k). | Claude (implementation agent) |
| 2026-10-04 | T17 | ADR-QD-090, INV-QD-090 (and INV-QD-037 corrected), BEH-QD-300–304, CCR-QD-170, overview 1.26, traceability 1.73, invariants 1.41, README 1.65; website reference; changeset `.changeset/arch-02-policy-fold-seam.md` (minor, says breaking). Numbers chosen clear of other branches (ADR up to 080, CCR up to 153): **renumber ADR-QD-090, CCR-QD-170 and BEH-QD-300–304 at merge if they collide.** Gates 9, 10 (strict), 11, 12, 13, 22 pass. | Claude (implementation agent) |
| 2026-10-04 | T18 | Oracles and characterization files deleted; pinned examples moved into `Simplify.test.ts`, `Explanation.test.ts`, `Matcher.test.ts`, `RolesAndDepth.test.ts`, `Decision.test.ts`, `Evaluate.test.ts` and devtools `Remedies.test.ts`. `pnpm vitest run --coverage --testTimeout=60000`, tstyche, BDD, example, website, package, publish-status all pass. The core suite has a pre-existing `FieldPath.test.ts` timeout on this machine, hence `--testTimeout=60000`. Mutation scores in the next row. | Claude (implementation agent) |
| 2026-10-04 | T18 | §2 greps: no `expanded`, no `traversal order bug`, no `Record<Policy["_tag"], true>`, `fields !== undefined` count 0 in `Predicate.ts`; `while (stack.length` remains only in `SinkCodec.ts`, `FieldPath.ts`, `Role.ts`, `DecodeDepthGuard.ts` (the two `TreeFold.ts` files use `for (;;)`, and `Inspect.flattenTree` a `for` over a popped stack). Probe-tag on a scratch copy: errors in `Policy.ts` (`childrenOf`, `fieldsOf`, `matcherOf`), `Evaluate.ts` (switch), `Explanation.ts`, `Predicate.ts` (`compileNode`), `Simplify.ts`, plus devtools `Remedies.ts` by construction: 5 outside `Policy.ts`, down from 8. Stryker: core 92.88% (`TreeFold.ts` 96.55%, `Policy.ts` 97.71%, `Matcher.ts` 95.73%, `Predicate.ts` 95.70%, `Explanation.ts` 85.87%, `Simplify.ts` 78.05%); devtools 96.89%. One `TreeFold.ts` survivor (`onPath.delete`, an equivalent mutant) was removed afterwards without a core re-run. | Claude (implementation agent) |
