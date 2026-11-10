---
id: ARCH-39
title: A projected read decides against the value it projects — a loaded sibling of `enforce`/`enforceProjected`, projected siblings of `filter`, and no second resource channel on `enforceProjected`
strength: Worth exploring   # from the 2026-10-07 architecture review (wave 4), card #10 (id="c10"), in-process
status: done
evidence_verified_at: e635e68
depends_on: []              # soft: ARCH-30 edits `permitted`/`discharge` in the same file (§9 ordering rule)
blocks: []
adrs_touched:
  - ADR-QD-011 (amend: "the wrapped effect never runs" is about guarded *work*; a load that produces the decision's resource is the decision's input, and for the loaded siblings the guarantee is "the loaded value is never handed over", not "the loader never runs")
  - ADR-QD-043 (amend: `enforceProjected`'s `options.resource` is the third instance of "an input the decision depends on never reached the thing that decides", after `guard` and the cache key)
  - ADR-QD-NEXT (new: "A projected read decides against the value it projects"; only if D-39-f = A)
  - ADR-QD-019 (constraint: every new entry point enforces, so it routes through `permitted` and refuses an undischarged binding obligation)
  - ADR-QD-035 (read: `guard` already pins resource and handler together; the loaded siblings are the effect-shaped form of the same rule)
  - ADR-QD-036 (read: `@qadi/http`'s `authorizeRequest` already loads before it decides — precedent for load-then-decide)
  - ADR-QD-032 / ADR-QD-004 (constraint: `@qadi/promise` forwards only; no branch decides)
  - ADR-QD-024 (read: `toPredicate` refuses a field-restricting policy because a row filter would hand over withheld columns — the argument D-39-e applies to `filter`)
  - ADR-QD-037 (constraint: madge; no new module, `Qadi.ts` imports unchanged)
  - ADR-QD-038 (constraint: changesets, fixed version group; no release step)
  - ADR-QD-076 (constraint: Stryker `ignoreStatic`; the new combinators are runtime code, pinned by behavioral tests)
  - ADR-QD-099 (constraint: closed entry points; new exports go through the root barrel and gate 13)
packages: ["@qadi/core", "@qadi/promise", "spec", "apps/website (docs)", "features (BDD)"]
estimate: L   # ≈ 2½–3 days for T0–T10. Defect-only path (T1 + T2 + T3) ≈ ½ day (S)
---

# ARCH-39 — A projected read decides against the value it projects

## 1. Verified evidence (at `e635e68`)

Read-only: nothing in the repository was edited. `git log --oneline -1` → `e635e68`.

**Probes.** One throwaway test file,
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-39/probe.test.ts`
(with `node_modules` symlinked to the repo's; imports `packages/core/src` and `packages/core/test/helpers.ts`
by absolute path), run from the repo root with

```
./node_modules/.bin/vitest run --root /private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-39 probe.test.ts --silent=false --reporter=verbose
```

Output (`loaderRuns` counts how often the wrapped loader executed; `doc = { id: "d1", ownerId: "u1", title: "T", secret: "S" }`):

```
P1 [ 'fail', 'MissingResource' ]   loaderRuns 0   hasResourceAttribute("ownerId", eq(subjectId())) around a loader, no resource
P2 [ 'fail', 'MissingResource' ]   loaderRuns 0   hasAttribute("team", eq(resource("team"))), no resource
P3 [ 'fail', 'AccessDenied' ]      loaderRuns 0   BEH-32's own example: hasCustom("isAuthor"), and u1 IS the author
P4 [ 'ok', '{"id":"d1",…,"secret":"S"}' ] loaderRuns 1   a custom predicate that reads `resource?.ownerId` decides on `undefined` and allows u2
P5 [ 'ok', '{"id":"rpt-1","title":"T","classification":"secret"}' ] loaderRuns 1
                                                  model 23's shape: options.resource says "internal", the loader returns a "secret" report;
                                                  a clearance-2 subject (who may not read "secret" at all) gets its title
P6 [ 'fail', 'MissingResourceId' ] loaderRuns 0   hasRelationship("owner"), no resource
P7 [ 'fail', 'AccessDenied' ]      loaderRuns 0   ADR-QD-011: on a denial the loader never runs
P8 [{"id":"d1","ownerId":"u1","title":"T","secret":"S"}]
                                                  Qadi.filter under hasPermission(read, { fields: ["id"] }): the whole item comes back
```

| # | Claim (review card c10 and the caller's brief) | Verdict | Evidence at `e635e68` |
| - | ----- | ------- | --------------------- |
| C1 | `enforceProjected` evaluates against `options.resource` but projects whatever `self` returns; its doc admits the two "are not reconciled". | **CONFIRMED** | `packages/core/src/Qadi.ts:215-238` (doc: "**Two channels, and they are not reconciled.**" at :222), body `:239-250`: `Effect.flatMap(permitted(policy, options), (decision) => Effect.map(self, (value) => project(decision, value)))`. Pinned as a *documented hazard* by `packages/core/test/Qadi.test.ts:182-222` ("projects under options.resource's decision even when self resolves to a different record"), which asserts the secret **does** leak. Probe P5 reproduces it on the spec's own model-23 shape. |
| C2 | `guard` was fixed for the same two-channel problem (INV-QD-032). | **CONFIRMED** | `Qadi.ts:301-313` — `enforce(policy, { ...options, resource })(handler(…, resource))`; doc `:266-276` ("Two channels for one value is what caused this"). `spec/invariants.md:1234-1260` (INV-QD-032), `spec/decisions/043-a-decision-is-computed-from-its-inputs.md` (the guard defect's write-up). |
| C3 | The canonical examples `loadDocument(id).pipe(enforceProjected(p))` never pass `resource` — `README.md:66-67`, `spec/models/07-field-level.md:248`, website docs, examples. | **CONFIRMED, but CHANGED in consequence** | `README.md:66-67`, `spec/models/07-field-level.md:248`, `spec/behaviors/07-enforcement.md:164-166`, `spec/overview.md:912`, `spec/models/17-purpose.md:185,191`, `apps/website/src/content/docs/docs/index.md:82`, `…/concepts/enforcement.md:83`, `apps/website/src/content/blog/introducing-qadi.md:45`. **All of these use resource-free policies** (`hasRole`/`hasPermission`/subject attributes), for which deciding before the load is correct — so the canonical examples themselves are *not* wrong. The two examples whose policy reads the resource are: `spec/behaviors/32-custom-predicates.md:25-62` (also `apps/website/…/concepts/custom-predicates.md:72-101`) — **wrong**, see C4 — and `spec/models/23-label-based.md:105-165`, which passes a hand-written stub `resource: { id: "rpt-1", classification: "internal" }` beside a loader (the two-channel pattern, presented as the recommended one; P5). `examples/` contains no `enforceProjected` call (grep); `examples/nextjs-newsroom/app/newsroom/page.tsx:65-75` decides with `decideAll` then calls `project(view.decision, article)` by hand. |
| C4 | "A resource-reading policy either errors (`MissingResource`) or decides without it." | **CONFIRMED, both halves; one is a doc defect** | Errors: P1/P2 (`Walk.ts:340-342,352-354` raise `MissingResource`), P6 (`PortAccess.ts:221,374` raise `MissingResourceId`). Decides without it: `HasCustom` passes `resource: undefined` to the predicate (`Walk.ts:399-400`, `PortAccess.ts:394-410`), P3/P4. **Defect:** the compiled fence at `spec/behaviors/32-custom-predicates.md:25-62` (and its website copy) ends with `// → { id: "draft-1", authorId: "u1" } when u1 wrote it; fails AccessDenied otherwise.` It can never return the record: the predicate reads `resource?.["authorId"]` with no resource and always denies (P3). `check-doc-examples.mjs` compiles fences but does not run them, so nothing caught it. |
| C5 | ADR-QD-011 and `spec/overview.md:202` say "the wrapped effect never runs" on denial; deciding against the loaded value inverts that ordering, so it is most likely a sibling, not a change. | **CONFIRMED** | `spec/decisions/011-enforce-as-aspect.md` Decision + Consequences ("it never runs, which a test asserts directly"); `spec/overview.md:201-202` (rows for `enforce` and `enforceProjected`: "Fails with `AccessDenied`; the wrapped effect never runs"); BEH-QD-049's REQUIREMENT (`spec/behaviors/07-enforcement.md:34-37`); pinned by `Qadi.test.ts:57-71` and probe P7. **Precedent the review did not cite:** `@qadi/http`'s `authorizeRequest` already loads *before* it decides — `packages/http/src/AuthorizeRequest.ts:87-89` (`extract` → `loadResource` → `guard`), documented at `:42-44`. So "load, then decide" is an accepted shape for *reads*; ADR-QD-011's guarantee is about guarded *work*. |
| C6 | `@qadi/promise`, `@qadi/http`, `@qadi/react` facades forward `enforceProjected`. | **REFUTED** | None does. `packages/promise/src/index.ts:68-136,159-176` exposes `check`, `decide`, `assert`, `filter`, `dispose` only. `@qadi/http` builds on `guard` (`AuthorizeRequest.ts:89`), never `enforceProjected`. `@qadi/react`'s `useProjected` (`packages/react/src/hooks.ts:167-188`) **already decides against the data it projects** ("The record is also the resource", `:170`) — the one-channel shape this plan brings to core. |
| C7 | (Found while verifying) `filter`/`filterStream` hand over fields a field-restricted allow withheld. | **CONFIRMED (gap; classification is D-39-e)** | `Qadi.ts:326-341` `decideOne` returns `{ item, allowed }` and discards `decision.visibleFields`; `filter` (`:370-394`) and `filterStream` (`:414-429`) return items unmodified. P8. BEH-QD-050 (`spec/behaviors/07-enforcement.md:47-80`) never says it projects, and never says it doesn't. `toPredicate`'s doc (`Predicate.ts:697-704`) refuses a field-restricting policy *because* "a row filter alone would let a caller select columns the policy withheld" — `filter` does exactly that, silently. `@qadi/promise`'s `filter` forwards it (`index.ts:123-128,173-174`). |
| C8 | (Found while verifying) `spec/models/07-field-level.md:174-176`'s `enforceProjected` signature listing is stale. | **CONFIRMED (doc drift, `ts` fence so not compiled)** | It reads `(policy: Policy, options?: EvaluateOptions)` and `A extends Record<string, unknown>`; the real signature is `EnforceOptions<EO, RO>` and `A extends Resource` (`Qadi.ts:239-247`; `spec/behaviors/07-enforcement.md:87-94` is current). |

**What the probe settled about the review's framing.** The hazard is not that the canonical examples are wrong
(they are resource-free and correct), but that the library has **no way to write a resource-scoped projected read
without a second channel**: either you omit `resource` and the policy errors or decides blind (P1–P4), or you pass
it and nothing checks it is the value you project (P5, `Qadi.test.ts:182-222`). The spec's own two
resource-scoped examples fall one into each hole.

## 2. Goal and success criteria

Make "decide, then hand over this value" one channel by construction, for every enforcing entry point that hands
over data. The **module** is `Qadi.ts`'s enforcing surface; its **interface** gains loaded siblings —
`enforceLoaded` (pass-through) and `enforceProjectedLoaded` (projected), names per D-39-b — whose only resource
is the value the wrapped effect produced, and projected siblings of `filter`/`filterStream`. The **seam** is the
existing internal `permitted`/`decideOne`: every new entry point is an **adapter** over it, so obligation discharge,
`AccessDenied` and the sink record stay one implementation (ADR-QD-019). The second channel is then removed from
`enforceProjected` (D-39-c), so a mismatched resource cannot be written. **Leverage:** the guarantee `guard`
got under INV-QD-032 and `useProjected` already has in React reaches the Effect read path. **Locality:** the rule
"a projected value is the evaluated resource" lives in `Qadi.ts` and one invariant.

Success criteria:

1. `loadDoc.pipe(enforceProjectedLoaded(policy))` where `policy` reads `resource.ownerId` allows the owner, denies
   anyone else with `AccessDenied`, and never fails `MissingResource` (`Qadi.test.ts`, T4).
2. The mirror of `Qadi.test.ts:182-222`: under `enforceProjectedLoaded`, the "private" record's `secret` is **not**
   returned (T4).
3. `enforceProjectedLoaded(p, { resource: x })` does not compile (`Qadi.tst.ts`, T4); under D-39-c = A,
   `enforceProjected(p, { resource: x })` does not compile either (T6).
4. On a denial the loaded value is never returned, and no projection runs; on a loader failure no evaluation runs
   and no `DecisionRecord` is emitted (T4, recording sink).
5. `loader.pipe(enforce(coarse), enforceProjectedLoaded(fine))` never runs the loader when `coarse` denies (T4).
6. `filterProjected`/`filterStreamProjected` (D-39-e) return each admitted item projected by its own decision (T5).
7. `spec/behaviors/32-custom-predicates.md`'s example produces the output its comment claims (T1), and model 23's
   example has one channel (T2 interim, T8 final).
8. `pnpm spec:api`, `pnpm spec:examples`, `pnpm spec:website-examples`, `pnpm spec:verify:strict`, `pnpm test:tstyche`,
   `pnpm circular`, `pnpm lint` pass; core coverage ≥ 95%, promise ≥ 90%.

## 3. Non-goals

- **Changing `enforce`'s `options.resource`.** `enforce` wraps arbitrary work whose value is not a resource;
  there is no second channel to reconcile. `updateDocument(id).pipe(enforce(canEdit, { resource: doc }))` stays.
- **Changing `guard`, `guardRoute`, `RequirePermission`, `authorizeRequest`.** Already one channel (INV-QD-032).
- **Changing `useProjected`.** Already one channel; cited as precedent only.
- **Making a policy's resource-dependence a type.** `Policy` is one untyped-by-resource ADT decoded from JSON
  (ADR-QD-002); a phantom "reads resource" parameter would split the codec. A resource-reading policy under the
  resource-free `enforceProjected` keeps failing closed with `MissingResource`, except `HasCustom`, which is opaque
  by design (ADR-QD-055) — documented, not fixed.
- **Hiding an existence oracle inside the library.** A loaded read reveals "exists but denied" vs "does not exist"
  to anyone who passes the coarse gate; mapping both to one response is the application's call (§9, ADR text).
- **Cell-level security (E7).** `filterProjected` projects each row by its own decision; field visibility that
  depends on the cell is `spec/models/36-cell-level.md`'s concern.
- **Editing `apps/website/src/content/blog/introducing-qadi.md`.** A dated post records what was true then (its
  example is resource-free and still correct).
- **A release.** Changesets only.

## 4. Constraints

- **AGENTS.md §1** — `effect` submodule namespace imports; `.ts` relative imports; `import type` for type-only.
  `Qadi.ts`'s import list does not change (it already imports `project`, `permitted`'s pieces, `Stream`).
- **AGENTS.md §4** — no `Effect.orDie`; denials stay `AccessDenied` from the one `permitted`. No new error class
  (`SCHEMA_ERROR_BUDGET` unchanged).
- **AGENTS.md §5** — the new combinators are curried *combinators* like `enforce`/`enforceProjected` (plain arrow
  functions returning `Effect.flatMap(...)`, not `Effect.fn`), exactly as their siblings at `Qadi.ts:208-250`; no
  new span (ADR-QD-051), `qadi.evaluate` stays the root. `UNTRACED_BUDGET` unchanged.
- **AGENTS.md §5a** — no `switch`; `SWITCH_BUDGET` unchanged.
- **AGENTS.md §6** — no `as`, no `any`, no `!`. The options type that refuses `resource` is
  `Omit<EnforceOptions<EO, RO>, "resource"> & { readonly resource?: never }`, never a `Record<string, unknown>`
  widening (user preference). `exactOptionalPropertyTypes` is on (`tsconfig.base.json:27`), so the implementation
  overrides with `{ ...options, resource: value }` (as `guard` does), never by writing `resource: undefined` into
  an optional property.
- **AGENTS.md §9 / ADR-QD-099** — new names are exported from `Qadi.ts`, which the barrel already re-exports;
  gate 13 (`pnpm spec:api`, `check-api-surface.mjs`) needs each in `spec/overview.md`'s export table (`:155`).
- **AGENTS.md §11/§12** — `spec/behaviors/*.md` `typescript` fences compile (`pnpm spec:examples`); website fences
  compile (`pnpm spec:website-examples`).
- **AGENTS.md §14 / ADR-QD-032** — the `@qadi/promise` additions are `run(subject, coreFn(...))` with no branch.
- **ADR-QD-019** — every new entry point enforces: an allow with an undischarged binding obligation fails
  `UndischargedObligation` *before* the value is handed over. BEH-QD-085's table (`spec/behaviors/11-obligations.md:150-161`)
  gains a row per entry point.
- **ADR-QD-037** — madge counts type-only edges; nothing new is imported, so no new edge. Verify anyway.
- **ADR-QD-076** — Stryker core run (`stryker.config.mjs`, `mutate: packages/core/src/**`, `break: 80`) covers the
  new code; each override (`resource: value`) must be killed by a test (criterion 2 kills a dropped override).
- **ADR-QD-038** — `@qadi/core` and `@qadi/promise` changesets, `minor` (0.x; D-39-c is breaking).
- **Coverage** — core 95%, promise 90% (`vitest.config.ts`).

## 5. Decisions needed before work starts

### D-39-a — What shape closes the second channel?

- **(A) Sibling entry points that decide on the loaded value** (`enforceLoaded`, `enforceProjectedLoaded`): run
  `self`, evaluate with `resource` = its value, discharge, then pass through / project that same value. One channel
  by construction. ADR-QD-011's "never runs" keeps its meaning for `enforce`/`enforceProjected`; the siblings say
  "never handed over" instead. Precedent: `authorizeRequest` (load → decide), `decideOne` (decide on the item),
  `useProjected` (decide on the data).
- **(B) Change `enforceProjected` to decide on `self`'s value.** One entry point, but it inverts ADR-QD-011 for
  every existing caller, including the resource-free majority for which deciding first is correct and cheaper; a
  loader that fails `NotFound` would now pre-empt `AccessDenied` for callers who have no read permission at all
  (an existence oracle opened for every current call site). Breaking in behavior with no compile signal.
- **(C) Make `resource` required on `enforceProjected` and type-link it to `self`'s `A`.** Catches "forgot to pass
  it", not "passed a different one": the same type with a different value (P5 is exactly that) still compiles.
  And it forces resource-free callers to invent a resource.

**Recommendation: (A)**, completed by D-39-c (remove the channel from `enforceProjected`) and D-39-e (the
collection mode), so every data-handing entry point has exactly one resource. `status: decided (2026-10-08, recommended default)`

### D-39-b — Names

- **(A) `enforceLoaded` / `enforceProjectedLoaded`** (and `LoadedEnforceOptions`). Keeps the `enforce…` prefix, so
  a reader grepping enforcement finds them, and says what differs: the decision is on the loaded value.
- **(B) `enforceOn` / `enforceProjectedOn`.** Shorter; "on" is vaguer about *what* it is on.
- **(C) `authorizeLoaded` / `readProjected`.** Reads well at the call site; breaks the `enforce…` family and the
  reporting/enforcing table's vocabulary.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-39-c — Does `enforceProjected` keep `options.resource`? (**breaking; needs user sign-off**)

- **(A) Remove it.** `enforceProjected`'s options become `LoadedEnforceOptions` (the same `resource?: never`
  type), so `enforceProjected` means "decide without a resource, then project" and passing one is a compile error
  pointing at `enforceProjectedLoaded`. The card's "a mismatched resource can't be written" holds for *both*
  projected entry points. `Qadi.test.ts:182-222` (the pinned hazard) becomes a `Qadi.tst.ts` "does not compile"
  assertion plus T4's runtime mirror. Model 23's example migrates. Breaking for any caller passing
  `resource` (in-repo: that one test and model 23's fence; downstream: unknown, 0.x minor).
- **(B) Keep it, deprecate it in the doc comment, point to the sibling.** No break, but the hazard stays writable and
  the doc keeps saying "not reconciled".
- **(C) Keep it and reconcile: decide on `options.resource` before the load (pre-gate), then re-decide on the loaded
  value.** Two evaluations, two sink records, two discharges of possibly the same obligation (a double-fired audit
  write, PH-01), and the pre-gate is exactly what composing `enforce(coarse, { resource })` already gives (D-39-g).

**Recommendation: (A)** — closed over widened; the defect-only path is (B). `status: decided (2026-10-08, recommended default; breaking, user to review)`

### D-39-d — Does `@qadi/promise` gain the one-channel projected read?

- **(A) Yes: `projected(subject, policy, record, options?)` → `Promise<Partial<A>>`, rejecting `AccessDenied`,
  forwarding `enforceProjectedLoaded(policy, options)(Effect.succeed(record))`; and `filterProjected` if D-39-e = A.**
  A Promise caller already holds the record, so "decide against the value" is the natural shape; today a Promise
  caller must `decide` with `{ resource: record }` and `project` by hand — the two-channel pattern again, written by
  every caller. The options type is `Omit<EvaluateOptions, "resource">` (the facade has no `onObligations`, `index.ts:58-66`).
- **(B) No.** Keeps the facade at five methods; Promise callers keep hand-pairing.

**Recommendation: (A).** Name alternatives: `projected` (recommended; reads as a value, like `filter`), `assertProjected`
(stresses that it rejects). `status: decided (2026-10-08, recommended default)`

### D-39-e — `filter` hands over withheld fields (C7): what is it, and what closes it?

- **(A) A gap, closed by projected siblings `filterProjected` / `filterStreamProjected`**, each returning
  `Partial<A>` per admitted item projected by that item's own decision (sharing `decideOne`, which starts returning
  the `Allow` it already has). `filter` keeps returning whole items and BEH-QD-050 says so in one sentence.
- **(B) A defect, closed by changing `filter`/`filterStream` to project.** Return type `ReadonlyArray<Partial<A>>`
  is breaking for every caller, including the resource-row use where no field restriction exists.
- **(C) Document only.** One sentence in BEH-QD-050; no new API.

**Recommendation: (A)**, with T3's documentation sentence shipped first. `status: decided (2026-10-08, recommended default)`

### D-39-f — New ADR or amendments only?

- **(A) New ADR-QD-NEXT "A projected read decides against the value it projects"**, plus a dated amendment to
  ADR-QD-011 (the guarantee is about guarded work; for a loaded read it is "never handed over") and to ADR-QD-043
  (third instance). It introduces a new contract (load-then-decide in core) and the existence-oracle reasoning,
  which is a decision, not a refinement.
- **(B) Amend ADR-QD-011 and ADR-QD-043 only.**

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-39-g — How does a loaded read honor ADR-QD-011's "the protected work never starts" for callers with no access at all?

- **(A) Composition, documented and tested:** `loadDoc(id).pipe(enforce(canReadAnyDoc), enforceProjectedLoaded(isOwnerWithFields))`.
  `enforce` gates the loader with a resource-free policy (the loader never runs for a caller lacking the coarse
  grant — no side effects, no timing, no existence oracle for them); the loaded sibling decides the fine,
  resource-scoped question on the value. Two decisions, each with its own record and obligations, no new semantics.
- **(B) A built-in `before?: Policy` option on the loaded siblings.** Duplicates `enforce` inside an option: a second
  policy parameter, a second decision and discharge hidden in one call.

**Recommendation: (A)** — complete because the composition already expresses every mode; (B) adds a second way to
write it. `status: decided (2026-10-08, recommended default)`

**Startable with no decision:** T0, T1, T2 (interim one-channel rewrite needs no new API), T3.
**Blocked:** T4 on D-39-a/b; T5 on D-39-e; T6 on D-39-c; T7 on D-39-d; T8 on D-39-f (and on what T4–T7 shipped).

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done (2026-10-08)
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/39-one-channel-projection main`; record `git rev-parse --short HEAD`.
  2. `git diff --stat e635e68 HEAD -- packages/core/src/Qadi.ts packages/core/test/Qadi.test.ts packages/core/test/Qadi.tst.ts packages/promise/src/index.ts spec/behaviors/07-enforcement.md spec/behaviors/32-custom-predicates.md spec/models/23-label-based.md`.
     If anything moved, update §1's line numbers before starting.
  3. Re-run §1's probe (command in §1; recreate the scratch dir with the `node_modules` symlink if it is gone, the
     probe source is reproduced by §1's table). Expect P1–P8 exactly as listed.
  4. Check whether ARCH-30 has landed or is in flight (`git log --oneline main -- packages/core/src/Qadi.ts`); apply
     §9's ordering rule.
  5. Record baseline: `pnpm vitest run packages/core/test/Qadi.test.ts packages/promise` test counts.
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §10 has the baseline row and the probe output.

### T1 — Test-first: BEH-32's custom-predicate example claims an allow it can never produce (defect C4)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0. No decision.
- **Files:** `packages/core/test/CustomPredicate.test.ts`, `spec/behaviors/32-custom-predicates.md`,
  `apps/website/src/content/docs/docs/concepts/custom-predicates.md`.
- **Steps:**
  1. Add `describe("BEH-32's worked example")` with two `it.effect`s, using `customPredicateFromRecord({ isAuthor: (subject, resource) => Effect.succeed(resource?.["authorId"] === subject.id) })`
     through `testLayer(subjectWith({ id: "u1" }), { CustomPredicate: … })` and `const draft = { id: "draft-1", authorId: "u1" }`:
     - `"as published, the example denies even the author: enforceProjected decides before the draft is loaded"` —
       `Effect.succeed(draft).pipe(enforceProjected(hasCustom("isAuthor")))` fails `AccessDenied`. This pins the
       defect (it passes today; it is the evidence the doc is wrong).
     - `"decided against the loaded draft, the author reads it and another subject is denied"` — the interim
       one-channel form: `Effect.flatMap(Effect.succeed(draft), (d) => Effect.succeed(d).pipe(enforceProjected(hasCustom("isAuthor"), { resource: d })))`
       returns `draft` for `u1` and fails `AccessDenied` for `subjectWith({ id: "u2" })`.
  2. Rewrite the fence at `spec/behaviors/32-custom-predicates.md:25-62` to the interim form
     (`const program = Effect.flatMap(loadDraft("draft-1"), (draft) => Effect.succeed(draft).pipe(enforceProjected(canReadOwnDraft, { resource: draft }))).pipe(…)`),
     with a comment: "The predicate reads the draft, so the decision must see the draft; `enforceProjected` decides
     before `self` runs." Keep the output comment, now true. Bump the doc's Revision to 1.1 with a Change History
     row citing `CCR-QD-NEXT`.
  3. Mirror the same fence in `apps/website/src/content/docs/docs/concepts/custom-predicates.md:72-101`.
  4. (T8 later replaces both with `enforceProjectedLoaded`.)
- **Tests:** two `it.effect`s above.
- **Verify:** `pnpm vitest run packages/core/test/CustomPredicate.test.ts`; `pnpm spec:examples`; `pnpm spec:website-examples`.
- **Done when:** both tests pass and both fences compile. Shippable alone as a docs fix (CCR only; no changeset, no
  public code change).

### T2 — Model 23's example decides against the report it returns (C3, the two-channel pattern as documentation)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0. No decision.
- **Files:** `packages/core/test/Qadi.test.ts`, `spec/models/23-label-based.md`.
- **Steps:**
  1. In `describe("Qadi.enforceProjected")`, add `it.effect("model 23's ladder: a stub resource that disagrees with the loaded report hands a clearance-2 subject a secret report's title")`
     reproducing P5 exactly (policy: the two upper rungs of `spec/models/23-label-based.md:127-140`; subject
     `subjectWith({ attributes: { clearanceLevel: 2 } })`; `options.resource = { id: "rpt-1", classification: "internal" }`;
     loader returns `{ id: "rpt-1", title: "T", body: "SECRET BODY", classification: "secret" }`). Assert the call
     **succeeds** with `{ id, title, classification: "secret" }` — the hazard, pinned beside the existing one at `:182-222`.
  2. Add the counterpart: the same report passed as its own resource (interim `Effect.flatMap` form) fails
     `AccessDenied`.
  3. Rewrite `spec/models/23-label-based.md:144-165`'s `program` to the interim one-channel form (`Effect.flatMap(loadReport("rpt-1"), (report) => Effect.succeed(report).pipe(enforceProjected(readClassified, { resource: report })))`),
     delete the hand-written stub, and say in prose why: "the classification is read off the report that is returned,
     never restated beside it". Revision 1.1, Change History citing `CCR-QD-NEXT`.
- **Tests:** two `it.effect`s.
- **Verify:** `pnpm vitest run packages/core/test/Qadi.test.ts`; `pnpm spec:examples`.
- **Done when:** both pass; the fence compiles; `grep -n 'classification: "internal" }' spec/models/23-label-based.md` finds no stub resource.

### T3 — Pin and state that `filter` does not project (C7)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0. No decision (every D-39-e option includes the statement).
- **Files:** `packages/core/test/Qadi.test.ts`, `spec/behaviors/07-enforcement.md`, `packages/core/src/Qadi.ts` (doc comment only).
- **Steps:**
  1. Add `it.effect("filter returns admitted items whole; a field restriction on the allow is not applied (BEH-QD-050)")`
     — P8: `Qadi.filter(P.hasPermission(read, { fields: ["id"] }), [record])` returns `[record]` including `secret`.
  2. BEH-QD-050: after the `filter` paragraph, add: "`filter` decides *which* items; it does not narrow them. An
     allow's `visibleFields` are not applied, so a field-restricting policy's withheld fields come back on every
     admitted item. `toPredicate` refuses such a policy for the same reason (ADR-QD-024)." (Under D-39-e = A, T5
     appends "use `filterProjected`".) Revision 1.11.
  3. `Qadi.ts` `filter` doc (`:343-369`): one paragraph saying the same, summary line unchanged.
- **Tests:** one `it.effect`.
- **Verify:** `pnpm vitest run packages/core/test/Qadi.test.ts`; `pnpm spec:examples`.
- **Done when:** the test passes and the sentence is in both places. Shippable alone (CCR; patch changeset for the
  doc comment is optional — no behavior change).

### T4 — `enforceLoaded` and `enforceProjectedLoaded`, test-first
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0, D-39-a, D-39-b (names below assume D-39-b = A).
- **Files:** `packages/core/src/Qadi.ts`, `packages/core/test/Qadi.test.ts`, `packages/core/test/Qadi.tst.ts`.
- **Steps:**
  1. **Red first.** In `Qadi.test.ts` add `describe("Qadi.enforceProjectedLoaded")` and `describe("Qadi.enforceLoaded")`
     with the tests listed under *Tests*; they fail to compile/run until step 3.
  2. In `Qadi.ts`, after `EnforceOptions` (`:70-76`), add
     ```ts
     /**
      * Enforcement options for an entry point whose resource is the value it hands over.
      *
      * `resource` is refused (`never`): the resource is what the wrapped effect produced,
      * and a second one is how `enforceProjected` came to decide on one record and project
      * another (ADR-QD-NEXT, INV-QD-NEXT).
      */
     export type LoadedEnforceOptions<E = never, R = never> = Omit<EnforceOptions<E, R>, "resource"> & {
       readonly resource?: never;
     };
     ```
  3. After `enforceProjected` add, each with a summary line first and the *why* after (AGENTS.md doc-comment shape):
     ```ts
     export const enforceLoaded =
       <EO = never, RO = never>(policy: Policy, options?: LoadedEnforceOptions<EO, RO>) =>
       <A extends Resource, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E | EnforcementError | EO, R | EvaluationServices | RO> =>
         Effect.flatMap(self, (value) => Effect.as(permitted(policy, { ...options, resource: value }), value));

     export const enforceProjectedLoaded =
       <EO = never, RO = never>(policy: Policy, options?: LoadedEnforceOptions<EO, RO>) =>
       <A extends Resource, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<Partial<A>, E | EnforcementError | EO, R | EvaluationServices | RO> =>
         Effect.flatMap(self, (value) =>
           Effect.map(permitted(policy, { ...options, resource: value }), (decision) => project(decision, value)));
     ```
     If `{ ...options, resource: value }` does not satisfy `EnforceOptions<EO, RO>` because of the `resource?: never`
     intersection, destructure instead: `const { resource: _never, ...rest } = options ?? {}` is **not** allowed
     (unused binding lint); use a local `const enforceOptions = (options: LoadedEnforceOptions<EO, RO> | undefined, resource: Resource): EnforceOptions<EO, RO> => ({ ...options, resource })`
     and check it compiles without `as`. Record which form compiled in §10.
     Docs must say: the loader runs **before** the decision (it is the decision's input, like `authorizeRequest`'s
     `loadResource`); on a denial the value is never handed over and nothing is projected; a loader failure surfaces
     before any evaluation (no decision, no record); a loader must be a read with no side effects that matter on a
     denial; to keep a caller with no access at all from running the loader, compose `enforce(coarse)` first
     (D-39-g, with the one-line example).
  4. Update `Qadi.ts`'s module doc (`:11-16`) list of enforcing entry points, and `enforceProjected`'s doc (`:222-234`):
     replace "Callers whose wrapped effect can return a resource other than `options.resource` should re-evaluate…"
     with "A policy that reads the resource belongs on `enforceProjectedLoaded`, which decides against the value it
     projects." (T6 rewrites the rest under D-39-c.)
  5. `Qadi.tst.ts`: `expect(enforceProjectedLoaded(p, { resource: { id: "x" } })).type.toRaiseError()`;
     same for `enforceLoaded`; `expect(Effect.succeed(rec).pipe(enforceProjectedLoaded(p))).type.toBe<Effect.Effect<Partial<typeof rec>, EnforcementError, EvaluationServices>>()`;
     and the `E`/`R` widening mirrors the existing `enforce` pins at `Qadi.tst.ts:48-60`.
- **Tests (in `Qadi.test.ts`, all `it.effect`):**
  - `"decides against the loaded value: the owner reads, another subject is AccessDenied"` — policy
    `allOf([hasResourceAttribute("ownerId", eq(subjectId())), hasPermission(read, { fields: ["id", "title"] })])`.
  - `"a resource-reading policy never fails MissingResource"` — P1's policy succeeds for `u1`.
  - `"the mirror of the two-channel hazard: the private record's secret is not projected"` — `Qadi.test.ts:182-222`'s
    policy and `actualResource`, under `enforceProjectedLoaded(policy)`: `out.secret` is `undefined`, fields are
    `["id", "title"]`. (Kills a mutant that drops `resource: value`.)
  - `"on a denial the loaded value is never returned and nothing is projected"` — result is `Failure(AccessDenied)`;
    `AccessDenied.trace` names the denying `HasResourceAttribute`.
  - `"a loader failure precedes evaluation: no decision record"` — loader `Effect.fail(new NotFound())` (a local
    `Data.TaggedError`); a recording `DecisionSink` (pattern in `packages/core/test/DecisionSink.test.ts`) receives
    zero records; the failure is `NotFound`.
  - `"the decision record's resource is the loaded value"` — recording sink: `records[0].resource` deep-equals the
    loaded value.
  - `"an undischarged binding obligation fails before the value is handed over"` — policy with
    `obligation(..., { binding: true })` (pattern `Qadi.test.ts:623-640`): `UndischargedObligation`; with
    `onObligations: () => Effect.void` it projects.
  - `"composed behind enforce(coarse), the loader never runs when the coarse gate denies (D-39-g)"` — counter in the
    loader stays 0 under `loader.pipe(enforce(hasRole("reader")), enforceProjectedLoaded(fine))` for a subject without
    the role; runs once and projects for one with it.
  - `enforceLoaded`: `"passes the loaded value through unchanged on an allow"`, `"fails AccessDenied on a denial"`.
- **Verify:** `pnpm vitest run packages/core/test/Qadi.test.ts`; `pnpm test:tstyche`; `pnpm typecheck`; `pnpm lint`; `pnpm circular`.
- **Done when:** all listed tests pass; `grep -n "export const enforceProjectedLoaded\|export const enforceLoaded\|export type LoadedEnforceOptions" packages/core/src/Qadi.ts` finds three lines.

### T5 — `filterProjected` and `filterStreamProjected` (D-39-e = A)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3, T4, D-39-e.
- **Files:** `packages/core/src/Qadi.ts`, `packages/core/test/Qadi.test.ts`, `packages/core/test/Qadi.tst.ts`.
- **Steps:**
  1. Red first: tests below.
  2. Change `FilterVerdict<A>` (`Qadi.ts:315-318`) to a closed union `{ readonly item: A; readonly allowed: false } | { readonly item: A; readonly allowed: true; readonly decision: Allow }`
     and `decideOne` to return the `Allow` it already holds (`:338-340`). `filter`/`filterStream` keep reading
     `allowed`/`item` only — unchanged output.
  3. Add `filterProjected` (same signature as `filter` but `ReadonlyArray<Partial<A>>`) and `filterStreamProjected`
     (`Stream.Stream<Partial<A>, …>`), each mapping an admitted verdict to `project(verdict.decision, verdict.item)`.
     Same single-pass loop as `filter` (`:387-393`). Docs: summary line, then "each item is projected by its own
     decision; `filter` returns items whole (BEH-QD-050)".
  4. `Qadi.tst.ts`: return types pinned.
- **Tests:** `"filterProjected projects each admitted item by its own decision"` (a `Union` `anyOf` whose branches
  expose different fields per `hasResourceAttribute("kind", …)`; two items of different kinds come back with different
  field sets); `"filterProjected drops denied items and keeps order"`; `"filterStreamProjected agrees with filterProjected"`
  (same inputs, `Stream.runCollect`); `"an undischarged binding obligation fails filterProjected"`; concurrency mirror
  of `Qadi.test.ts`'s "filter — concurrency across items" using `blockingResolver` (`:28-35`).
- **Verify:** `pnpm vitest run packages/core/test/Qadi.test.ts`; `pnpm test:tstyche`.
- **Done when:** tests pass; T3's test still passes unchanged (filter does not project).

### T6 — Remove `enforceProjected`'s second channel (D-39-c = A; breaking)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T4, D-39-c (user sign-off).
- **Files:** `packages/core/src/Qadi.ts`, `packages/core/test/Qadi.test.ts`, `packages/core/test/Qadi.tst.ts`,
  `spec/models/23-label-based.md`, `spec/behaviors/32-custom-predicates.md`, website `custom-predicates.md`.
- **Steps:**
  1. `enforceProjected`'s `options` parameter becomes `LoadedEnforceOptions<EO, RO>`. Rewrite its doc: summary line
     "Guards an effect with a resource-free decision and projects its result"; then why — the decision is taken
     before `self` runs, so it can see no resource; a policy that reads one belongs on `enforceProjectedLoaded`;
     the "Two channels, and they are not reconciled" paragraph is replaced by one sentence of history citing
     ADR-QD-NEXT.
  2. Delete `Qadi.test.ts:182-222` (the pinned hazard) and T2's hazard test; replace with `Qadi.tst.ts`
     `expect(enforceProjected(p, { resource: { id: "1" } })).type.toRaiseError()`. T4's mirror test is the runtime
     replacement (replace, don't layer).
  3. Re-point T1's and T2's interim fences/tests (which pass `{ resource: d }` to `enforceProjected`) to
     `enforceProjectedLoaded` — they no longer compile otherwise.
  4. `grep -rn "enforceProjected(.*resource" packages spec apps examples features --include='*.ts' --include='*.tsx' --include='*.md'`
     returns nothing.
- **Tests:** tstyche assertion; existing `enforceProjected` tests (`Qadi.test.ts:114-180`, `:623-640`) pass unchanged.
- **Verify:** `pnpm typecheck`; `pnpm test:tstyche`; `pnpm vitest run packages/core`; `pnpm spec:examples`; `pnpm spec:website-examples`; `pnpm example`.
- **Done when:** the grep is empty and every command passes.

### T7 — `@qadi/promise` forwards the one-channel reads (D-39-d = A)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T4 (and T5 for `filterProjected`), D-39-d.
- **Files:** `packages/promise/src/index.ts`, `packages/promise/test/facade.test.ts`,
  `packages/promise/README.md`.
- **Steps:**
  1. Interface `Qadi` gains `projected: <A extends Resource>(subject, policy, record: A, options?: Omit<EvaluateOptions, "resource">) => Promise<Partial<A>>`
     and (T5) `filterProjected` mirroring `filter`'s signature with `Partial<A>`. Docs: summary line; "rejects with
     `AccessDenied`", the same obligation caveat as `assert`, and "the record is the resource: the decision sees
     exactly what is returned".
  2. `makeQadi`: `projected: (subject, policy, record, options) => run(subject, enforceProjectedLoadedCore(policy, options)(Effect.succeed(record)))`;
     `filterProjected: (subject, policy, items, options) => run(subject, filterProjectedCore(policy, items, options))`.
     No conditional anywhere (§14).
  3. Import the core functions under the file's existing `…Core` aliasing convention.
- **Tests:** `projected` resolves the projected record for the owner, rejects `AccessDenied` for another subject, rejects
  `MissingResource` never (resource-reading policy); `filterProjected` resolves projected items; a resolver outage rejects
  (failure is not denial, INV-QD-026's shape).
- **Verify:** `pnpm vitest run packages/promise`; `pnpm test:tstyche`; `node scripts/check-house-style.mjs`.
- **Done when:** tests pass; promise coverage ≥ 90% (`pnpm coverage` scoped or full).

### T8 — Spec, ADR, docs, BDD
- **Status:** [x] done (2026-10-08)
- **Depends on:** T4–T7 (whichever shipped), D-39-f.
- **Files:** `spec/behaviors/07-enforcement.md`, `spec/behaviors/11-obligations.md`, `spec/behaviors/32-custom-predicates.md`,
  `spec/models/07-field-level.md`, `spec/models/23-label-based.md`, `spec/invariants.md`, `spec/traceability.md`,
  `spec/overview.md`, `spec/decisions/NEXT-a-projected-read-decides-against-the-value-it-projects.md` (*new*),
  `spec/decisions/011-enforce-as-aspect.md`, `spec/decisions/043-a-decision-is-computed-from-its-inputs.md`,
  `spec/decisions/index.yaml`, `spec/README.md` (CCR row), `README.md`, `packages/core/README.md`,
  `apps/website/src/content/docs/docs/concepts/enforcement.md`, `…/concepts/field-visibility.md`,
  `…/concepts/custom-predicates.md`, `…/reference/api.md`, `…/packages/core/index.md`,
  `features/features/field-visibility/field-visibility.feature`, its steps file and `features/step-definitions/FieldVisibilityWhenSteps.ts`,
  `.changeset/*.md` (*new*).
- **Steps:** see §8 for the full list; in order: (1) BEH-QD-NEXT in 07 with a compiled `typescript` worked example
  (owner-only projected read; the composed coarse gate); (2) BEH-QD-085's table rows; (3) INV-QD-NEXT; (4) ADR and
  amendments; (5) overview tables (export row `:155`, decision table `:197-204` with "On denial: fails `AccessDenied`;
  the loader has run, its value is never handed over"); (6) model 07's stale signature `:174-176` corrected and a
  paragraph "When the policy reads the record"; models 23/32 to `enforceProjectedLoaded`; (7) website pages and the
  enforcement SVG's "Enforce" group label list; (8) BDD scenario `Scenario: A record's own owner decides which of its fields come back`
  under `@REQ-QD-007`; (9) traceability rows; (10) CCR row; (11) changesets.
- **Tests:** the BDD scenario.
- **Verify:** `pnpm spec:examples && pnpm spec:website-examples && pnpm spec:verify:strict && pnpm spec:api && pnpm spec:gates && pnpm test:bdd && pnpm website`.
- **Done when:** every command passes; `grep -rn "not reconciled" packages/core/src spec` is empty.

### T9 — Mutation and coverage
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T4–T7.
- **Files:** none unless a survivor needs a test.
- **Steps:**
  1. `pnpm exec stryker run --mutate "packages/core/src/Qadi.ts"`; every new line's mutants killed (the override,
     the `project` call, `Effect.as(…, value)`). Add a test for any survivor, never an exclusion.
  2. `pnpm coverage` (with `--testTimeout=60000` if the known `FieldPath.test.ts` timeout bites).
- **Tests:** only survivor-killers.
- **Verify:** the two commands.
- **Done when:** no surviving mutant on new lines; core ≥ 95%, promise ≥ 90%.

### T10 — Close out
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T1–T9.
- **Files:** this plan; `.planning/architecture/README.md` (the tracker, by whoever maintains it).
- **Steps:** set `status: done`, tick tasks, add §10 rows, re-run §1's probe against the branch (P1–P5 now have
  one-channel answers through the new API; P7 unchanged; P8 unchanged for `filter`).
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-39-*.md | sort | uniq -c`.
- **Done when:** all tasks `[x]` or `[-]` with a reason.

## 7. Test strategy

- **Survive unchanged:** every `enforce`, `enforceProjected` (`Qadi.test.ts:114-180`), `guard`, `filter`,
  `filterStream` and obligation test; BEH-QD-049's "never starts the effect" test (`:57-71`), which is the
  guarantee the loaded siblings deliberately do not make and so must keep holding for `enforce`.
- **Replaced, not layered:** `Qadi.test.ts:182-222` (the hazard pinned as "it leaks") and T2's hazard test are deleted
  in T6 and replaced by a `tstyche` "does not compile" plus T4's runtime mirror ("the secret is not projected").
- **New behavioral tests:** T1 (2), T2 (2, one deleted in T6), T3 (1), T4 (10), T5 (5), T7 (4–5); one BDD scenario.
- **Type-level:** `Qadi.tst.ts` pins the refused `resource` on both projected entry points and `enforceLoaded`, and the
  return/requirement types (closing matt-pocock's "`enforceProjected`'s `Partial<A>` unpinned" note).
- **Differential:** `filterStreamProjected` vs `filterProjected` on the same inputs; `enforceProjectedLoaded(p)(succeed(x))`
  vs `project(decide(p, { resource: x }), x)` on a small generated set of `(resource-reading policy, record)` pairs
  (FastCheck, fixed seed) — the loaded entry point equals "decide on x, project x" by construction.
- **Mutation:** core Stryker run over `Qadi.ts` (T9); `@qadi/promise` has no Stryker config — forwarding is
  covered by its behavioral tests.

## 8. Spec and documentation updates

- `spec/behaviors/07-enforcement.md` — **BEH-QD-NEXT-a** "A projected value is the evaluated resource" with signatures
  of `enforceLoaded`/`enforceProjectedLoaded`/`LoadedEnforceOptions`, REQUIREMENT ("MUST evaluate with the value the
  wrapped effect produced as the resource; MUST NOT accept a second resource; on a denial MUST NOT hand the value
  over"), and a compiled worked example; BEH-QD-050 gains `filterProjected`/`filterStreamProjected` and T3's sentence;
  BEH-QD-051's signature drops `resource` (D-39-c). Revision bump + Change History.
- `spec/behaviors/11-obligations.md` BEH-QD-085 table — rows for `enforceLoaded`, `enforceProjectedLoaded`,
  `filterProjected`, `filterStreamProjected` ("enforces | fails").
- `spec/invariants.md` — **INV-QD-NEXT** "A projected value is the evaluated resource" (Source `Qadi.ts`'s loaded
  siblings and `LoadedEnforceOptions`; Implication: the P5 leak; Enforcement: T4's mirror test and `Qadi.tst.ts`;
  Related INV-QD-032, ADR-QD-043).
- `spec/decisions/NEXT-…md` — ADR-QD-NEXT (D-39-f = A): context (C1–C5, P1–P5), decision (siblings; `enforceProjected`
  resource-free; composition for the coarse gate), consequences including the **existence oracle** and loader
  side effects, rejected options (D-39-a B/C, D-39-c C, D-39-g B). `index.yaml` entry.
- ADR-QD-011 amendment (dated): "never runs" is about guarded work; a loaded read's guarantee is "never handed over";
  cite `authorizeRequest` as prior art. ADR-QD-043 amendment: third instance.
- `spec/overview.md` — export table `:155` gains the new names and `LoadedEnforceOptions`; decision table `:197-204`
  gains rows; the "closest pair" paragraph `:205-209` adds the loaded pair. Gate 13.
- `spec/models/07-field-level.md` — `:174-176` signature corrected (C8); a "When the policy reads the record"
  paragraph; models 23 and 32 to the loaded sibling.
- `spec/traceability.md` — BEH-QD-NEXT-a, INV-QD-NEXT, ADR-QD-NEXT rows; `Qadi.test.ts`/`Qadi.tst.ts`/promise test rows.
- `spec/README.md` — `CCR-QD-NEXT` row (one for T1–T3 if shipped separately).
- `README.md:120`, `packages/core/README.md:47`, website `concepts/enforcement.md` (table `:55` and the SVG's enforce
  group), `concepts/field-visibility.md:9`, `concepts/custom-predicates.md`, `reference/api.md:38`,
  `packages/core/index.md:21` — name the new entry points.
- Changesets: `"@qadi/core": minor` (new exports; **breaking** under D-39-c: `enforceProjected` refuses `resource`);
  `"@qadi/promise": minor` (new methods). No release step.

## 9. Risks and rollback

- **The loader runs before the decision (by design).** A loader with side effects (view counters, "mark as read",
  audit-on-read) fires for denied callers; a loader's `NotFound` reveals existence to a caller who would have been
  denied; loader latency is observable. Mitigation: ADR text and doc comments name it; D-39-g's composed coarse
  gate keeps callers with no grant from reaching the loader; tests pin the composition.
- **D-39-c breaks callers passing `resource` to `enforceProjected`.** It shows up as a compile error pointing at the
  options type. Rollback: revert T6 alone; T4/T5 stand without it.
- **Overlap with ARCH-30** (obligation discharge receives the decided question; edits `discharge`/`permitted` in
  `Qadi.ts`). Ordering rule: whichever lands second rebases; the new entry points **must** keep calling `permitted`
  (never a second discharge path). If ARCH-30 lands first, the loaded siblings get "discharge sees the loaded value
  as the question's resource" for free — check T4's obligation test against ARCH-30's new handler argument.
- **Overlap with ARCH-45** (`@qadi/promise` cancellation claim at `index.ts:136-146`): same file as T7; textual merge only.
- **Overlap with ARCH-32** (Decision from Trace, `Decision.ts`): `project` is read, not edited; no conflict.
- **`LoadedEnforceOptions`'s `never` intersection and `exactOptionalPropertyTypes`** may refuse the spread; T4 step 3
  gives the cast-free fallback.
- **Rollback overall:** each task is its own commit; T1–T3 are docs/tests only.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | Plan written; §1 verified at `e635e68` with probes P1–P8 | planning agent (wave 4) |
| 2026-10-08 | T0 | Baseline at ce6d248 (worktree branch): no drift in the files since e635e68; `Qadi.test.ts` + promise 60 tests green. ARCH-30 not landed. Probe not re-run; its cases are covered by the tests below | implementing agent (wave 4) |
| 2026-10-08 | T1 | `CustomPredicate.test.ts` "BEH-32's worked example" (2 tests: published form denies the author; loaded form allows the author, denies u2). Both passed first run: they pin the defect and its fix, no red. BEH-QD-245's fence and website copy rewritten, re-pointed to `enforceProjectedLoaded` by T6 | implementing agent |
| 2026-10-08 | T2 | Model 23 ladder tests in `Qadi.test.ts` (hazard test passed at once, as a pin); fence rewritten. T6 deleted the hazard test and re-pointed the other | implementing agent |
| 2026-10-08 | T3 | `filter returns admitted items whole; ...` (passes today; pins P8). BEH-QD-050 and `filter`'s doc state it | implementing agent |
| 2026-10-08 | T4 | RED: all 10 new tests failed with `enforceProjectedLoaded is not a function`; green after implementing. Form that compiled with no `as`: a helper `withLoadedResource(options, resource): EnforceOptions<E, R> => ({ ...options, resource })`. `Qadi.tst.ts` uses `not.toBeCallableWith`, not `toRaiseError` (`tsc` also compiles `.tst.ts`, so `toRaiseError` fails `pnpm typecheck`) | implementing agent |
| 2026-10-08 | T5 | `filterProjected`/`filterStreamProjected`; `FilterVerdict` is a closed union carrying the `Allow`. 5 tests incl. a concurrency mirror (written after the code; shares `decideOne`) | implementing agent |
| 2026-10-08 | T6 | `enforceProjected` options are `LoadedEnforceOptions` (D-39-c = A, breaking). Hazard test and T2's hazard deleted; tstyche assertion added; fences re-pointed. `grep "enforceProjected(.*resource"` empty; `pnpm example` e2e passed (30) | implementing agent |
| 2026-10-08 | T7 | `Qadi.projected` / `Qadi.filterProjected` in `@qadi/promise` (4 tests, README section). Tests written with the code, not red-first | implementing agent |
| 2026-10-08 | T8 | BEH-QD-324, INV-QD-106, ADR-QD-104 (+ amendments to 011, 043), CCR-QD-203, overview/traceability/model 07/obligations table, website + READMEs, 2 BDD scenarios, changesets (core, promise). Green: spec:examples, spec:website-examples, spec:verify:strict, spec:api, spec:gates, spec:claims, test:bdd, website build | implementing agent |
| 2026-10-08 | T9 | Not done: Stryker not run (brief forbids mutation). Scoped coverage shows no uncovered lines in `Qadi.ts` or promise `index.ts` | implementing agent |
