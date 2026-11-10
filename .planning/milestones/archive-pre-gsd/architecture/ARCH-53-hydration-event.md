---
id: ARCH-53
title: A hydration outcome is one value, reported once — a closed `HydrationEvent` the engine's two pure codec directions return, projected by one table to its counter and its reporter; and the three ways a supplied reporter or a typed policy can still break that accounting
strength: Worth exploring   # from the 2026-10-13 architecture review (wave 5), card c8 "A hydration outcome as one value, reported once"
status: superseded-by-phase-12
disposition: "ported by Phase 12 (ARCH-60; INT-03…INT-06) from rescue/wave5-1013 f27d049; was `done` on the unmerged branch only (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []              # no hard dependency; see §9 for the files shared with ARCH-55, ARCH-56 and ARCH-57
blocks: []
adrs_touched:
  - ADR-QD-052 (amend, dated block: the write side of the five metrics is one projection of a closed event, in `HydrationEvent.ts`, which absorbs `HydrationCounts.ts` and keeps its `Context.empty()` confinement; a refused payload is counted at least once whatever its reason; `DehydrationDropReason` gains `UnencodablePolicy` if D-53-d = a; the five metric ids, types and descriptions are unchanged, so the registry key is unchanged)
  - ADR-QD-041 (amend, one bullet in the 2026-10-08 amendment's style: a supplied reporter that throws is contained and announced as `ReporterThrew`; `PayloadMixedSubjects` becomes `DehydrationDropped { reason, count }`; `DeveloperSignals.ts` stays the one console module)
  - ADR-QD-078 (constraint, plus one revision-row note: "`HydrationEngine.ts` owns the payload codec" becomes true of both directions — today the dehydrate-side subject filter sits in `Hydration.ts`; the versioned payload, the seed type and `QadiAtoms.hydrate` are unchanged)
  - ADR-QD-039 (constraint: the seed atoms stay closure-private to the atom set; the engine stays out of the barrel; nothing in this plan hands a seed atom to an event or a hook)
  - ADR-QD-093 (constraint: `DECISION_READ_BUDGET` keeps `HydrationEngine.ts` / `makeSeededQuestion`; its count moves from 3 to 2 when T7 folds two `isSuccess` reads into one, and the budget and its reason comment change in the same edit)
  - ADR-QD-095 (precedent, read only: "a codec owns both directions" is the shape T6 gives the payload codec)
  - ADR-QD-037 (constraint: madge counts `import type`; `HydrationEvent.ts` imports `DeveloperSignals.ts` and `@qadi/core` only, and `DecisionEntry` moves into it so the engine → event edge is the only one)
  - ADR-QD-099 (constraint: closed entry points; `HydrationEvent.ts` is package-private and out of the barrel; public types are re-exported by name from `Hydration.ts`)
  - ADR-QD-034 / AGENTS.md §5a (constraint: the event projection is a module-scope `Match.type(...).pipe(Match.tagsExhaustive(...))`; no `switch`; `SWITCH_BUDGET` unchanged)
  - ADR-QD-076 (constraint: `ignoreStatic: true`; a module-scope `Match` is static, so every arm is pinned by a per-tag test, not left to mutation)
  - ADR-QD-038 (constraint: changeset in the fixed version group; no release step — releases need the user's explicit go-ahead)
packages: ["@qadi/react", "@qadi/core", "examples/nextjs-newsroom", "apps/website", "scripts (house style budget count, Stryker scope)"]
estimate: L   # ≈ 3 engineer-days for T0–T11. Defect path (T1–T4) ≈ 1 day and ships ahead of the refactor: T1/T2 as patches, T3+T4 as one minor with a breaking note
---

# ARCH-53 — A hydration outcome is one value, reported once

## 1. Verified evidence (at `b655b3b`)

Checked on `main` at `b655b3b` (clean tree). The review card (c8) cites
`react/src/Hydration.ts`, `HydrationEngine.ts`, `HydrationCounts.ts` and `DeveloperSignals.ts`.
Every claim below was re-read at this SHA, and the behavioural ones were settled by probe.

**Probe.** Two throwaway vitest files, run outside the repo, with `@qadi/core` aliased to
`packages/core/src/index.ts`, happy-dom, and `node_modules` symlinked to
`packages/react/node_modules`. They import `packages/react/src/*.ts` by absolute path. Re-runnable
by T0:

```
S=/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-53
pnpm exec vitest run --config $S/vitest.config.mjs --silent=false 2>&1 | grep -E "^P[0-9]|THREW|Received|\+ "
```

Output (abridged; `E1` and `P5` print through a deliberately failing assertion):

```
P1 delta 0 reports [{"reason":"PayloadSubjectMismatch","entries":[],"wholePayload":true}]
P1b warn [["[qadi] hydrateDecisions refused the payload (0 decision(s) in it): the payload names a different subject …"]]
P2 threw Error: host boom out undefined seededDelta 0 undecodableDelta 1
P3 threw Error: host boom dehydratedDelta 0 foreignDelta 1
P4 threw Error: host boom first undefined second {"_tag":"Success",…"policyTag":"HasRole","allowed":false…} rechecks 1
P5 [ 'MalformedPayload' ]
E1 gte(-Infinity): THREW SchemaError(Expected a finite number at ["matcher"]["value"]) dehydratedDelta=0 foreignDelta=1
E1 gte(NaN):       THREW SchemaError(Expected a finite number at ["matcher"]["value"]) dehydratedDelta=0 foreignDelta=1
E1 depth 1.5:      THREW SchemaError(Expected an integer at ["depth"]) dehydratedDelta=0 foreignDelta=1
```

Baseline of the existing suite at this SHA:
`pnpm vitest run --project react packages/react/test/HydrationCounts.test.ts packages/react/test/Hydration.test.ts packages/react/test/HydrationPayload.test.ts packages/react/test/HydrationEngine.test.ts packages/react/test/DeveloperSignals.test.ts`
→ 5 files, 129 tests, all passing. `node scripts/check-house-style.mjs` → "395 file(s) clean (3 declared switch(es))".

### Review claims

| # | Claim (review card c8) | Verdict | At `b655b3b` |
| - | ---------------------- | ------- | ------------ |
| C1 | Every hydration event is counted and reported as two separate calls at each site: `dehydrateDecisions` (`countDropped` + `droppedEntriesReporter`), `hydrateWith`'s `refuse` (`countDropped` + `hydrationDropReporter`), `makeSeededQuestion` (`countRecheck` + `report`); `countSeeded`/`countDehydrated` are count-only | **CONFIRMED (read)** | `Hydration.ts` — `dehydrateDecisions` (~:89-95): `countDropped("ForeignSubject", …)` then `droppedEntriesReporter(options?.onDropped)` and a second `filter` to rebuild the dropped list. `HydrationEngine.ts` — `hydrateWith`'s local `refuse` (~:331-340): `countDropped(reason, count)` then `report?.({ reason, entries, wholePayload })`. `makeSeededQuestion`'s `read` (~:571-581): `countRecheck(mismatched)` then `report({ policy, resource, seeded, decided })`. `dehydratedPayload` (~:215-221) calls `countDehydrated` inside what reads as a constructor; `hydrateWith` ends with `countSeeded(seeded.length)` (~:427). Four count sites, three report sites, each pairing written by hand. |
| C2 | Understanding one dropped payload means reading four modules | **CONFIRMED, and it is five** | A refused payload's path: `Hydration.ts` (`hydrateDecisions` → `atoms.hydrate`), `QadiAtoms.ts` (`hydrate` → `hydrateWith`), `HydrationEngine.ts` (`refuse`), `HydrationCounts.ts` (`countDropped`, the `Context.empty()` write), `DeveloperSignals.ts` (`hydrationDropReporter`, `describeSignal`'s `HydrationDropped` arm). The sentence it prints comes from a sixth, core's `HydrationMetrics.ts` (`hydrationDropMeaning`) — that one is correct by ARCH-37's D-37-d and stays. |
| C3 | The write half is split: `Hydration.ts` (the public interface) filters by subject, counts and reports, while the engine does `dehydrateEntry` and counts in `dehydratedPayload`; the read half is a one-line delegate | **CONFIRMED** | `Hydration.ts` — `dehydrateDecisions` owns the subject partition and the `ForeignSubject` exit; `HydrationEngine.ts` — `dehydrateEntry`, `dehydratedPayload`. `hydrateDecisions` is `atoms.hydrate(dehydrated, subject, options)` and `QadiAtoms.hydrate` is `hydrateWith(lookup, …)`. ADR-QD-078 (`078-…md` "One deep module") already says "`HydrationEngine.ts` owns the payload codec" — true of the read direction only. The read-side delegate is **intended** (ADR-QD-078: the atom set owns the seed capability, so a wrapper forwarding `hydrate` seeds the real questions) and stays. |
| C4 | The two `onDropped` shapes are asymmetric: the dehydrate side gets a bare array with no reason, though `ForeignSubject` is a `HydrationDropReason`; the hydrate side gets `{ reason, entries, wholePayload }`. Is that lost information? | **Asymmetry CONFIRMED; "lost information" REFUTED at HEAD, and becomes true under C9** | `DehydrateOptions.onDropped: (dropped: ReadonlyArray<DecisionEntry>) => void` (`Hydration.ts`); `HydrateOptions.onDropped?: HydrationDropReporter<unknown>` (`HydrationEngine.ts`). The asymmetry is **documented as intended**: core's `DehydrationDropReason` doc (`HydrationMetrics.ts` ~:39-49) says it is "still a named union … the two sides are reported through different callbacks with different payloads". With exactly one dehydrate reason, a bare array loses nothing — the reason is implied. BEH-QD-146's "takes the same shape" means the resolution rule (development default, replaced by a supplied reporter), not the payload. **But** C9 below is a second dehydrate-side exit; once it exists a bare array cannot say which of the two the host is looking at. That is what makes D-53-b a real decision rather than taste. |
| C5 | `resolveMismatchReporter` is a pure pass-through | **CONFIRMED** | `HydrationEngine.ts` — `resolveMismatchReporter = (supplied) => hydrationMismatchReporter(supplied)`. Its one caller is `QadiAtoms.ts` — `makeQadiAtoms` (`const report = resolveMismatchReporter(options?.onHydrationMismatch)`). It exists only because `QadiAtoms.ts` does not import `DeveloperSignals.ts` directly. |
| C6 | Hydration counts are written off-fiber to the default registry (ARCH-45 D-45-h) — what was done, is it still true? | **CONFIRMED, decided and correct; not re-planned** | ARCH-45 D-45-h decided A (2026-10-08): both ends pinned to the default registry. `HydrationCounts.ts` writes with `updateUnsafe(…, Context.empty())`; devtools reads `valueUnsafe(Context.empty())`; ADR-QD-052 1.2 and BEH-QD-231 1.12 record it. This plan moves those five writes into `HydrationEvent.ts` **verbatim**, with the same `Context.empty()` built once and the same doc paragraph. |
| C7 | ARCH-37 (developer signals, one module) — do not re-plan it | **CONFIRMED, respected** | ARCH-37 is `done`. Kept: `DeveloperSignals.ts` is the one console module (`no-ambient-console`, ADR-QD-041 amendment); the closed `DeveloperSignal` union with one module-scope sentence table; the resolver rule `supplied ?? (isDevelopment() ? default : undefined)`; the meaning table in core (`hydrationDropMeaning`). D-37-a said "the existing four resolvers keep their names, signatures and semantics" — this plan changes one resolver's payload (D-53-b) and adds containment to all of them (D-53-e); both are new decisions, not reversals. |
| C8 | One test surface for "every exit is counted and announced" — INV-QD-045 | **CHANGED (id CONFIRMED, scope narrower)** | `spec/invariants.md` — INV-QD-045 "No entry leaves hydration unaccounted for" is the **counting** law, per call, over both partitions. "Announced" is BEH-QD-230's requirement ("Every exit … MUST be announced"); re-check counting is BEH-QD-231. The single surface this plan builds pins all three, and §8 restates INV-QD-045's Source/Enforcement accordingly. |

### Found while verifying

| # | Finding | Verdict | Evidence |
| - | ------- | ------- | -------- |
| C9 | **`dehydrateDecisions` throws on a policy the public constructors accept**, and leaves an entry neither dehydrated nor dropped | **CONFIRMED (defect, probe E1) — Medium** | `HydrationEngine.ts` — `encodePolicy = Schema.encodeSync(PolicySchema)`, with the comment "Encoding a typed policy cannot fail, so this side is sync and total". False: `Matcher.ts` declares `Gte`/`Lt` with `Schema.Finite` and `Policy.ts` declares `RelationshipDepth` as `Schema.Int.check(…)`, but `gte(value: number)` and `hasRelationship(relation, { depth?: number })` accept any number. `dehydrateDecisions([{ policy: hasAttribute("age", gte(-Infinity)), … }])` raises `SchemaError(Expected a finite number …)` out of a function documented as pure and total, on a server's render path; `gte(NaN)` and `depth: 1.5` do the same. INV-QD-018 shows `gte(-Infinity)` is a policy the evaluator decides (it denies), so a server can evaluate it and then crash shipping the answer. Conservation (INV-QD-045) breaks too: in the probe the foreign entry was already counted as `ForeignSubject` (`foreignDelta=1`) and the kept entry was counted nowhere (`dehydratedDelta=0`). **Test-first task: T4.** |
| C10 | **A supplied reporter that throws changes the outcome**, contrary to "It observes; it cannot change the outcome" (BEH-QD-146, `HydrateOptions.onDropped`, `QadiAtomsOptions.onHydrationMismatch`) | **CONFIRMED (defect, probes P2–P4) — Medium** | `hydrateWith` calls `refuse` for each per-entry reason *before* `countSeeded` and the `return`. A throwing `onDropped` therefore (P2) throws out of `hydrateDecisions`, which BEH-QD-146/269 say MUST NOT throw; the entries that **did** decode are not seeded (BEH-QD-230: "A refused payload MUST NOT prevent the entries that did decode from being seeded"), and they are counted nowhere (`seededDelta 0`, `undecodableDelta 1` for a two-entry payload — INV-QD-045 broken). On the dehydrate side (P3) a throwing hook aborts the server render after `ForeignSubject` was counted and before anything was dehydrated. A throwing `onHydrationMismatch` (P4) throws out of the decision atom's read on the first read, i.e. into React render — an error boundary instead of a guard — while the re-check is already counted; the second read succeeds because `announced` was set first. The audit package already contains its equivalent (`AuditWriteReport.ts` — `emitWriteOutcome` wraps `onOutcome` in `Effect.catchCause` and logs "an onOutcome hook threw"). **Test-first task: T1.** |
| C11 | **A payload naming another subject with no entries is announced as refused but counted zero times** | **CONFIRMED (defect, probe P1) — Low** | `hydrateWith`'s `subjectId !== subject.id` branch calls `refuse("PayloadSubjectMismatch", entries, true)` without the `atLeastOne` count the other two whole-payload refusals pass, so `countDropped` loops zero times. INV-QD-045's CCR-QD-156 amendment states "A refused payload is counted at least once"; BEH-QD-230's whole-payload rule assumes it. The default warning fires ("refused the payload (0 decision(s) in it)") beside a counter that did not move — the exact disagreement ARCH-37's C8 fixed for the other two reasons. `dehydrateDecisions` never writes `subjectId` with empty `entries`, so only a hand-built or tampered payload reaches it — and `PayloadSubjectMismatch` is the reason that signals one user's page reaching another. **Test-first task: T2.** It is the same drift class the event value removes: the count rule lives in one arm per tag (T5), not in a default parameter each call site may forget. |
| C12 | An array payload | **REFUTED as a defect (probe P5)** | `hydrateDecisions(atoms, [1, 2], …)` drops as `MalformedPayload`, which is what `ClientHydrationDropReason`'s doc says a non-envelope is. Recorded so nobody re-probes it. |
| C13 | `DECISION_READ_BUDGET` pins `HydrationEngine.ts` at exactly 3 raw reads in `makeSeededQuestion` | **CONFIRMED** | `scripts/check-house-style.mjs` — `DECISION_READ_BUDGET["packages/react/src/HydrationEngine.ts"] = 3` ("one `isInitial` … and two `isSuccess`"), `DECISION_READ_BUDGET_NAMES` → `["makeSeededQuestion"]`; checked in both directions. T7 folds the two `isSuccess` reads into one and must move the budget to 2 in the same edit. |

**Other facts the plan relies on.**

- **Public surface today** (`spec/overview.md` `@qadi/react` table): `DehydratedDecisions`, `DehydratedEntry`,
  `DecisionEntry`, `DehydrateOptions` (row "declared in `HydrationEngine.ts`"), `HydrateOptions`,
  `HydrationDrop`, `HydrationDropReporter` (re-exported from `./DeveloperSignals.ts` via `Hydration.ts`),
  `HydrationMismatch`, `HydrationMismatchReporter` (via `HydrationEngine.ts` → `QadiAtoms.ts`). Core:
  `DehydrationDropReason`, `ClientHydrationDropReason`, `HydrationDropReason`, `hydrationDropReasons`,
  `hydrationDropMeaning`, `isHydrationDropReason` and the five metric objects. `DroppedEntriesReporter`
  and every `count*` function are not public.
- **Consumers of the dehydrate-side `onDropped` array shape:** `packages/react/test/Hydration.test.ts`
  (four tests in the dehydrate `describe`, ~:175-265, typed `Array<ReadonlyArray<unknown>>`);
  `examples/nextjs-newsroom/app/edge/mixed-payload/page.tsx` (`onDropped: (dropped) => { droppedCount = dropped.length }`),
  `examples/nextjs-newsroom/src/server/decide.ts` (`DecideOptions.onDropped?: (dropped: ReadonlyArray<DecisionEntry>) => void`),
  `examples/nextjs-newsroom/test/hydration.test.ts` (~:124-128). `pnpm example` typechecks the example
  inside `pnpm check`, so the example is migrated in the same task as the type. The BDD step
  (`features/features/hydration-counts/hydration-counts.steps.test.ts` ~:188, `onDropped: () => {}`)
  compiles under either shape.
- **`PayloadMixedSubjects`** is referenced only by `DeveloperSignals.ts` and `DeveloperSignals.test.ts`.
- **Mutation scope:** `stryker.react.mjs` mutates only `DecisionOutcome.ts` and `QuestionBook.ts`
  (`thresholds: { high: 90, low: 80, break: 80 }`, `ignoreStatic: true`). None of the hydration modules
  is mutated today (D-53-g).
- **Coverage:** react is held at 90% (AGENTS.md §10); `HydrationCounts.ts` is fully covered today.
- **Website:** `apps/website/src/content/docs/docs/packages/react/hydration.md` "Bound to one subject, and
  every drop has a reason" describes both drop paths in prose and documents neither hook's shape;
  `apps/website/src/content/docs/docs/reference/upgrading.md` has per-release sections (`## 0.12: …`).
- **Pending changesets:** 44 files in `.changeset/` (wave 4 unreleased); `developer-signals-one-module.md`
  is ARCH-37's and already carries a "breaking, for a test double only" note on `HydrationDrop`.

## 2. Goal and success criteria

**Goal.** Hydration's outcome is today a side effect smeared across five modules: each exit is a
hand-written pair of calls — a counter write in `HydrationCounts.ts` and a reporter call resolved in
`DeveloperSignals.ts` — and each pair decides its own count rule, its own ordering relative to the
work it reports, and its own reporter. Two pairs have already drifted (C10's ordering, C11's count),
and one exit has no pair at all (C9). This plan makes the outcome a **value**. A new package-private
**module**, `HydrationEvent.ts`, owns a closed `HydrationEvent` union and one projection,
`emitHydration`, that turns an event into its counter writes and its reporter call — a table, one arm
per tag, so a new exit is one compile error in one place. The engine's two codec directions become
**pure**: `planDehydration` and `planHydration` return their result *and* the events it implies, and
the emitting entry points (`dehydrateWith`, `hydrateWith`) run the plan, then emit. That gives the
module real **depth**: a small **interface** (an event, an emit) hiding the five metric writes, the
`Context.empty()` confinement, the reporter resolution and its containment. The **seam** is the event:
a test reads a plan's events with no counter and no console in sight, and the property "every entry
offered is in exactly one event" becomes a pure check over arbitrary input. **Locality**: the count
rule for a refused payload, the order of report-after-work, and what a throwing reporter does each
live in one arm or one function. **Leverage**: `QadiAtoms`, `Hydration.ts` and the re-check all go
through the same two calls, and the public `HydrationDrop` becomes one type both ends' hooks share, so
a host routes both to one function.

**Success criteria.**

1. `rg -n "countDropped|countSeeded|countDehydrated|countRecheck|droppedEntriesReporter|hydrationDropReporter|resolveMismatchReporter" packages/react/src`
   prints nothing; `packages/react/src/HydrationCounts.ts` does not exist (D-53-c = a).
2. `rg -n "updateUnsafe" packages/react/src` prints lines in `HydrationEvent.ts` only; `rg -n "Context.empty" packages/react/src`
   prints the one `const` in `HydrationEvent.ts`.
3. `packages/react/test/HydrationEvent.test.ts` has one test per `HydrationEvent` tag asserting the exact
   metric deltas, the exact hook argument, the development default sentence and production silence — and
   deleting any arm of `emitHydration`'s table is a compile error (`Match.tagsExhaustive`).
4. The probes P1–P4 and E1 (§1) are red tests that pass: a throwing `onDropped` on either side or a
   throwing `onHydrationMismatch` leaves the result, the seeds and the counts identical to a
   non-throwing one and says `ReporterThrew` once; a zero-entry foreign-subject payload moves
   `PayloadSubjectMismatch` by 1; `dehydrateDecisions` over `gte(-Infinity)` / `gte(NaN)` / `depth: 1.5`
   returns a payload without that entry and counts it under `UnencodablePolicy`.
5. A property test over generated `DecisionEntry` lists (both subjects, encodable and unencodable
   policies) and over arbitrary JSON payloads asserts, on `planDehydration` / `planHydration` with no
   metric read at all: offered = dehydrated + Σ left-out, and visible = seeded + Σ dropped, with every
   whole-payload refusal carrying all visible entries.
6. `DehydrateOptions.onDropped` and `HydrateOptions.onDropped` are both `HydrationDropReporter<…>`;
   `packages/react/test/Hydration.tst.ts` proves one function typed
   `(drop: HydrationDrop<unknown, HydrationDropReason>) => void` is assignable to both (D-53-b = C).
7. `node scripts/check-house-style.mjs` passes with `DECISION_READ_BUDGET["packages/react/src/HydrationEngine.ts"] = 2`.
8. `pnpm check` passes, including `pnpm example`, `pnpm spec:api` (gate 13) and `pnpm mutation` with
   `HydrationEvent.ts` in `stryker.react.mjs`'s `mutate` if D-53-g = a.

## 3. Non-goals

- **The read-side delegate.** `hydrateDecisions` → `QadiAtoms.hydrate` stays (ADR-QD-078, C3). Emission
  happens inside `hydrateWith`, which `QadiAtoms.hydrate` calls, so a caller going straight to
  `atoms.hydrate` is counted too — that is why emission is not put in `Hydration.ts`.
- **Which registry the counts live in** (ARCH-45 D-45-h, decided). No `options.metrics`, no on-fiber writes.
- **The five metric declarations** (ADR-QD-052). Ids, types and descriptions are untouched, so the
  `type:id:description` key is unchanged and `@qadi/devtools` needs no code change. Generalising the
  "declared where both ends import" pattern to evaluation metrics is ARCH-56's.
- **Constructors that accept non-finite bounds or fractional depths** (`gte`, `lt`, `hasRelationship`).
  Refusing them at construction is a core-wide change INV-QD-018's tests depend on (they build
  `gte(-Infinity)` on purpose). This plan makes the *payload* total; D-53-d records the rejected option.
- **A resource that does not survive JSON** (a `Date`, a `BigInt`, an `undefined` field in
  `DecisionEntry.resource`). It is passed through unchecked today and would seed under a key the
  client never asks; that is a silent *seeded* entry, not a lost one, so INV-QD-045 does not see it.
  Out of scope; recorded in §9 as a follow-up candidate.
- **Throw containment for reporters outside `DeveloperSignals.ts`.** `AuditDecisionSinkLive`'s
  `onOutcome` is already contained; nothing else in `@qadi/react` takes a host callback that is not
  resolved through `DeveloperSignals.ts`.
- **The seed precedence (INV-QD-028) and the once-per-registry announcement.** `makeSeededQuestion`'s
  `read` keeps its structure; only the two lines that count and report become one `emitHydration`.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 (submodule namespace imports, `.ts` extensions, `import type`) | `HydrationEvent.ts` imports `* as Data from "effect/Data"`, `* as Match from "effect/Match"`, `* as Context from "effect/Context"`; core symbols by name from `"@qadi/core"`. |
| AGENTS.md §5 / `UNTRACED_BUDGET` = 3 | Hydration is synchronous and off-fiber (ADR-QD-052). No `Effect.fn`, no `Effect.fnUntraced`. Budget untouched. |
| AGENTS.md §5a / ADR-QD-034 / `SWITCH_BUDGET` | The event projection is one module-scope `Match.type<HydrationEvent>().pipe(Match.tagsExhaustive({…}))` returning a **report value** (the `AuditWriteReport.ts` shape: describe once, apply in one function); no `switch`. Budget untouched. |
| AGENTS.md §6 (`console`, `process.env` forbidden; `no-ambient-console`) | `ReporterThrew`'s sentence and `say` stay in `DeveloperSignals.ts`, the one exempt file. `HydrationEvent.ts` calls resolvers, never `console`. |
| AGENTS.md §6 (`as`, `!`, `any` forbidden) | The event's `PayloadRefused`/`EntriesDropped` reasons are `Extract`/`Exclude` of `ClientHydrationDropReason`, so the engine's call sites narrow by construction, not by cast. |
| AGENTS.md §9 / ADR-QD-099 (barrels; closed entry points) | `HydrationEvent.ts` stays out of `packages/react/src/index.ts`. `DecisionEntry` (moved there) is re-exported by name from `Hydration.ts`, like today's re-exports from `HydrationEngine.ts`. |
| AGENTS.md §11 / §15, gate 13 (`check-api-surface.mjs`) | The `DecisionEntry` row's "declared in" note and the `HydrationDrop`/`HydrationDropReporter` row change; the rows themselves stay. No export is added to or removed from any barrel. |
| AGENTS.md §13 (React: no React state for decisions; `outcomeOf`) | Nothing here touches `QadiProvider.tsx` or a hook. The re-check emission stays inside `makeSeededQuestion`'s `read`, which is upstream of `outcomeOf` (ADR-QD-093). |
| ADR-QD-093 / `DECISION_READ_BUDGET` | `HydrationEngine.ts` 3 → 2 in T7, with the reason comment rewritten ("one `isInitial` … and one `isSuccess` deciding whether it disagrees"); `DECISION_READ_BUDGET_NAMES` unchanged (`makeSeededQuestion`). |
| ADR-QD-037 (madge, gate 3 `pnpm circular`, type-only edges count) | Target edges: `HydrationEvent → DeveloperSignals`, `DeveloperSignals → SeededDecision`; `HydrationEngine → HydrationEvent`, `HydrationEngine → SeededDecision`; `QadiAtoms → HydrationEngine`, `QadiAtoms → HydrationEvent` (type); `Hydration → HydrationEngine`, `Hydration → HydrationEvent` (type), `Hydration → QadiAtoms` (type). `HydrationEvent.ts` imports nothing from the engine — which is why `DecisionEntry` moves into it. |
| ADR-QD-039 (seed is not an authority) | No event carries a seed atom or the lookup; `Rechecked` carries a `HydrationMismatch` (a `SeededDecision` value, already public). |
| ADR-QD-041 + amendment (one console module, resolver rule) | Containment (D-53-e) is added *inside* the resolvers, so "a supplied reporter replaces the default and runs in production" stays the one rule; `ReporterThrew` is a new `DeveloperSignal` member with a sentence in `describeSignal`. |
| ADR-QD-052 (counted; declared in core; `updateUnsafe` off fiber) | The five writes move verbatim; `Context.empty()` stays built once at module scope; the confinement paragraph moves from `HydrationCounts.ts` to `HydrationEvent.ts`. Adding `UnencodablePolicy` grows `hydrationDropReasons`, so `preregisteredWords` grows — the metric's description does not change, so the key does not. |
| ADR-QD-078 (seed type, atom set owns hydration, version 2) | `PAYLOAD_VERSION`, the entry schema and `QadiAtoms.hydrate`'s signature are unchanged. |
| ADR-QD-076 (`ignoreStatic`) | `emitHydration`'s table is module-scope; each arm is pinned by T5's per-tag tests. |
| Memory: closed union over widening; complete over simple | `HydrationDrop` gains a reason **parameter** with a default, not a widened `reason: string`; a new dehydrate exit is a new `DehydrationDropReason` member, and the full union is restated wherever it is listed. Recommendations take the complete option unless it is wrong. |
| Changesets (ADR-QD-038); no release | One changeset per landing slice; the breaking note for D-53-b goes in `@qadi/react`'s entry and `upgrading.md`. Nothing is versioned or published by this plan. |

## 5. Decisions needed before work starts

### D-53-a — The shape of the event union

- **(a) The review's single drop member:** `Dehydrated | Dropped { reason, entries, wholePayload } | Seeded | Rechecked { mismatch }`.
  Smallest change; mirrors today's `HydrationDrop`. But `wholePayload` is a stored boolean beside a
  reason that already determines it (three reasons are always whole, three never are), so
  `Dropped { reason: "MalformedEntry", wholePayload: true }` is representable, and the count rule
  ("whole ⇒ at least one") still has to read a flag a caller set — the shape C11 slipped through.
- **(b) Split by where and how much, with narrowed reasons:**

  ```ts
  type PayloadRefusalReason = Extract<ClientHydrationDropReason,
    "PayloadSubjectMismatch" | "UnsupportedPayloadVersion" | "MalformedPayload">;
  type EntryDropReason = Exclude<ClientHydrationDropReason, PayloadRefusalReason>;

  export type HydrationEvent = Data.TaggedEnum<{
    Dehydrated: { readonly count: number };
    LeftOut: { readonly reason: DehydrationDropReason; readonly entries: ReadonlyArray<DecisionEntry> };
    PayloadRefused: { readonly reason: PayloadRefusalReason; readonly entries: ReadonlyArray<unknown> };
    EntriesDropped: { readonly reason: EntryDropReason; readonly entries: ReadonlyArray<unknown> };
    Seeded: { readonly count: number };
    Rechecked: { readonly mismatch: HydrationMismatch | undefined };
  }>;
  ```

  `wholePayload` is derived per tag in the projection (`PayloadRefused` → `true`), the count rule is one
  arm (`PayloadRefused` → `Math.max(1, entries.length)`), and an illegal pairing does not compile. A
  type-level test pins that the two subsets partition `ClientHydrationDropReason`.
- **(c) (b), with the two subsets exported from core** beside `ClientHydrationDropReason`. "Which reasons
  refuse the whole payload" is arguably a fact about core's union, like its meaning (D-37-d). It adds two
  core exports, two overview rows and a collision with ARCH-55's named-export barrel, for no reader
  outside `@qadi/react` today.

**Recommendation: (b).** It is the complete form and the one that removes C11's class rather than
patching an instance. (c) is right the day a second package needs the split; until then it is surface
with no reader. `status: open`

### D-53-b — The dehydrate side's public `onDropped` shape

- **(A) Keep the bare array.** No break. Today it loses nothing (C4). Under D-53-d = a it would hand a
  host `UnencodablePolicy` and `ForeignSubject` entries indistinguishably, or need a second hook.
- **(B) A dehydrate-only type:** `DehydrationDrop { reason: DehydrationDropReason; entries: ReadonlyArray<DecisionEntry> }`.
  Breaking for the dehydrate hook; symmetric in spirit; two public drop types to learn.
- **(C) One public drop type for both ends:** `HydrationDrop<A, R extends HydrationDropReason = ClientHydrationDropReason>`
  (the existing interface, gaining a defaulted reason parameter) and
  `HydrationDropReporter<A, R extends HydrationDropReason = ClientHydrationDropReason>`.
  `DehydrateOptions.onDropped?: HydrationDropReporter<DecisionEntry, DehydrationDropReason>`, called once
  per reason with `wholePayload: false` (the dehydrate side never refuses a payload whole — it builds
  one). The hydrate side's type is unchanged for every existing annotation (the default keeps
  `HydrationDrop<unknown>` meaning what it means today). Breaking for the dehydrate hook only. A host
  writes one `(drop: HydrationDrop<unknown, HydrationDropReason>) => void` and passes it to both ends —
  parameter contravariance makes it assignable to each.
- **(D) Additive overload:** accept either a bare-array function or a `HydrationDrop` function, told apart
  at runtime by arity. Rejected: arity is not a type, and it is the "two shapes for one thing" this plan
  exists to remove.

**Recommendation: (C).** It makes the asymmetry go away rather than renaming it, gives the host real
leverage (one telemetry function for both ends), and is the only option under which D-53-d's second
reason reaches a supplied reporter intact. The break is one hook, mechanical to migrate
(`(entries) => …entries…` → `(drop) => …drop.entries…`), and `@qadi/react` is 0.x in a fixed version
group. Consequence: `DeveloperSignal.PayloadMixedSubjects { count }` becomes
`DehydrationDropped { reason, count }`, whose sentence prints `hydrationDropMeaning(reason).remedy` like
`HydrationDropped` does — the `ForeignSubject` line keeps "dropped N decision(s)" and its remedy, and
loses only the hand-written "belonging to a different subject than the payload's" clause, which the
remedy already says. `DroppedEntriesReporter<A>` is deleted. `status: open`

### D-53-c — Where the event and its projection live

- **(a) A new package-private `HydrationEvent.ts` that absorbs `HydrationCounts.ts`.** It holds
  `HydrationEvent`, the hook-resolution helper, the module-scope projection table, `emitHydration`, and
  the five `updateUnsafe` writes under the same `Context.empty()` and the same confinement doc.
  `DecisionEntry` moves into it (it is what both the dehydrate event and the codec speak about, and it
  breaks the engine ↔ event cycle). The engine's codec directions become pure planners that return
  events; `dehydrateWith`/`hydrateWith` run a plan and emit. `HydrationCounts.ts` is deleted.
- **(b) Inside `HydrationEngine.ts`.** No new file and no type move. The engine (592 lines) gains the
  union and the table, and "the module whose job is the codec and the seed atoms" also becomes "the
  module that knows about counters and reporters"; the planners would emit from the same file they plan
  in, which is the pairing this plan is undoing.
- **(c) A new `HydrationEvent.ts` beside `HydrationCounts.ts`.** Keeps the counter file as is. Three
  modules where (a) has two, and `HydrationCounts.ts` becomes a set of one-line functions called from one
  place — shallow by construction.

**Recommendation: (a).** The `Context.empty()` confinement stays "one named file" (ADR-QD-052's
reason), the file now named for what it is — the hydration outcome — and its interface is two names.
`status: open`

### D-53-d — What `dehydrateDecisions` does with an entry it cannot encode (C9)

- **(a) Drop it under a new `DehydrationDropReason`, `"UnencodablePolicy"`**, counted and announced like
  `ForeignSubject`. The encode becomes total: `Schema.encodeOption(PolicySchema)` (or `encodeResult`),
  `None` → left out. Core grows by one union member, one `hydrationDropReasons` value (the
  frequency pre-registers it at zero), and one `hydrationDropMeaning` row (a compile error forces it).
  The devtools panel picks it up from `hydrationDropReasons` with no edit (BEH-QD-232).
- **(b) Refuse such policies at construction in core.** `gte(NaN)` throws. Contradicts INV-QD-018's
  own tests, which build `gte(-Infinity)` to prove `evaluate` and `toPredicate` agree on it, and moves a
  throw into every caller of a constructor. Rejected as wrong for this plan.
- **(c) Throw a typed error from `dehydrateDecisions`.** Breaks "pure and synchronous, never throws" on
  a server's render path, which is exactly C9's harm.
- **(d) Status quo, documented.** Leaves a reachable crash and an INV-QD-045 violation.

**Recommendation: (a).** The client would ask the question again anyway (that is what any dropped entry
means), and the payload stays JSON-safe. Name: `UnencodablePolicy`, mirroring the client's
`UndecodablePolicy`; `summary`: "a policy built in code that the policy schema does not accept — a
non-finite bound or a fractional depth"; `remedy`: "a policy built in code does not satisfy the policy
schema — a matcher bound that is not finite, or a relationship depth that is not an integer — so it
cannot cross the network. The entry was left out and the client will ask the question itself; fix the
policy". `status: open`

### D-53-e — What a supplied reporter that throws does (C10)

- **(a) Contain it inside every resolver in `DeveloperSignals.ts`; finish the outcome; say
  `ReporterThrew { reporter, error }` in every environment.** A supplied reporter is wrapped once, at
  resolution, in `try { supplied(x) } catch (error) { say(ReporterThrew({ reporter: "onDropped", error })) }`.
  All seven resolvers get it (`hydrationMismatchReporter`, `gateIdCollisionReporter`, the two drop
  resolvers, `providerSignalReporter`), because "a supplied reporter replaces the default" is one rule in
  one module and a provider or gate hook throwing inside a React effect is the same failure. Spoken in
  production too: the host replaced the default, so nothing else will ever say it — the audit package's
  `emitWriteOutcome` logs "an onOutcome hook threw" unconditionally for the same reason. The sentence
  names the hook and the error's `name: message`, never the drop's entries.
- **(b) Contain, and say it in development only.** A broken telemetry hook in production is then silent
  forever — the failure mode BEH-QD-230 was written against.
- **(c) Contain silently.** Same objection, stronger.
- **(d) Contain, then rethrow asynchronously** (`queueMicrotask(() => { throw error })`). Surfaces in the
  host's error tracking, but on a Node server it is an uncaught exception that can take the process
  down during a render. Rejected as wrong.
- **(e) Do not contain; document "a reporter must not throw".** C10 shows that breaks four spec
  requirements; documentation does not make a callback total.

**Recommendation: (a).** `status: open`

### D-53-f — An ADR amendment or a new ADR?

- **(A) Amend ADR-QD-052** with a dated block (the outcome is one event, projected once; a refused payload
  is counted at least once whatever its reason; `UnencodablePolicy`; the confinement file renamed), add
  one bullet to ADR-QD-041's 2026-10-08 amendment for `ReporterThrew` and `DehydrationDropped`, and one
  revision-row note to ADR-QD-078 ("the engine owns both directions"). ARCH-35 amended ADR-QD-056 the same
  way for the audit write outcome.
- **(B) A new ADR-QD-NEXT, "A hydration outcome is one value".** The shape is new, but the decision it
  records (count and announce every exit) is ADR-QD-052's.

**Recommendation: (A).** The invariant-level novelty — a reporter cannot change the outcome — gets its
own INV-QD-NEXT instead (§8), which is where a rule that spans seven reporters belongs. `status: open`

### D-53-g — Mutation scope (widens an existing gate's scope; user sign-off)

- **(a) Add `packages/react/src/HydrationEvent.ts` to `stryker.react.mjs`'s `mutate`.** Small, pure,
  table-shaped; a surviving mutant there is a miscounted or unannounced exit. The per-tag tests are what
  kill its mutants (`ignoreStatic` skips the table's construction, not its arms' bodies).
- **(b) (a) plus `HydrationEngine.ts`.** The codec is a trust boundary and `makeSeededQuestion` holds
  INV-QD-028's precedence. Worth it, but it is a ~590-line module with atom wiring whose mutants mostly
  need rendered registries to kill; it roughly doubles the react mutation run.
- **(c) Neither.** Status quo: no hydration module is mutated.

**Recommendation: (a)**, with (b) noted as a follow-up once the planners (T6) make the codec half of the
engine testable without a registry. `pnpm check`'s step list and the DoD table are unchanged; this widens
one step's input. Flag for the user. `status: open`

## 6. Tasks

Order: T0, then the defect path T1–T4 (ships ahead of the refactor), then T5–T8 (the deepening), then
T9–T11. Each task leaves `pnpm check` green.

### T0 — Re-verify the evidence at the branch point
- **Status:** [ ] todo
- **Depends on:** —
- **Files:** none (read-only); the probe under the scratchpad path in §1.
- **Steps:**
  1. `git switch -c arch-53-hydration-event main`; record the SHA in §10.
  2. Re-run the §1 probe command; confirm P1–P4 and E1 still reproduce and P5 is still `MalformedPayload`.
     If the scratchpad is gone, recreate it from the five probe bodies in §1's table (each is one
     `hydrateDecisions`/`dehydrateDecisions` call plus a metric delta).
  3. Re-check every symbol named in §1 still exists with the cited role:
     `rg -n "resolveMismatchReporter|countRecheck|countDropped|droppedEntriesReporter|hydrationDropReporter|dehydratedPayload|encodePolicy" packages/react/src`.
  4. `rg -n "HydrationEngine.ts\": [0-9]" scripts/check-house-style.mjs` still shows `3`.
  5. Check whether ARCH-55, ARCH-56 or ARCH-57 has landed and touched `DeveloperSignals.ts`,
     `QadiAtoms.ts`, `HydrationMetrics.ts` or core's barrel (`git log --oneline main -- <file>`); if so,
     re-read those files before T1/T4/T5.
  6. Baseline: `pnpm vitest run --project react packages/react/test/Hydration*.ts packages/react/test/DeveloperSignals.test.ts` (5 files, 129 tests).
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §10 has a row saying each of C1–C13 still holds (or what changed, with the plan edited to match).

### T1 — A supplied reporter that throws cannot change the outcome (defect C10; patch)
- **Status:** [ ] todo
- **Depends on:** T0; D-53-e
- **Files:** `packages/react/src/DeveloperSignals.ts`, `packages/react/test/DeveloperSignals.test.ts`,
  `packages/react/test/HydrationCounts.test.ts`, `packages/react/test/Hydration.test.ts`,
  `packages/react/test/HydrationEngine.test.ts`, `.changeset/hydration-reporter-contained.md` (*new*)
- **Steps (test first):**
  1. Write the red tests, each from a §1 probe:
     - `HydrationCounts.test.ts`: "a throwing onDropped neither throws out of hydrateDecisions nor stops the
       decodable entries seeding" — a two-entry payload (one good, one `{ _tag: "NotAPolicy" }`), a hook that
       throws; assert no throw, `seeded` length 1, `hydrationSeededTotal` +1, `UndecodablePolicy` +1.
     - `Hydration.test.ts` (dehydrate `describe`): "a throwing onDropped does not abort dehydrateDecisions" —
       mixed subjects, throwing hook; assert the payload has the kept entry, `dehydrated` +1, `ForeignSubject` +1.
     - `HydrationEngine.test.ts`: "a throwing onHydrationMismatch does not throw out of the decision's read" —
       the P4 setup; assert the first `store.get` returns the client's `Deny` success and re-checks +1.
     - `DeveloperSignals.test.ts`: per resolver (`hydrationMismatchReporter`, `gateIdCollisionReporter`,
       `droppedEntriesReporter`, `hydrationDropReporter`, `providerSignalReporter`), a supplied reporter that
       throws is called once, the error does not escape, and `console.warn` receives exactly one
       `[qadi] … threw` line naming the hook — with `NODE_ENV=production` too.
  2. Add `ReporterThrew: { readonly reporter: ReporterName; readonly error: unknown }` to `DeveloperSignal`,
     where `type ReporterName = "onHydrationMismatch" | "onGateIdCollision" | "onDropped" | "onDeveloperSignal"`
     (closed). Its `describeSignal` arm: ``[qadi] the ${reporter} reporter you supplied threw (${errorLine(error)}). `` +
     `The outcome it was told about stands — nothing was skipped, seeded differently or left uncounted. Fix the reporter.`
     `errorLine` prints `error.name: error.message` for an `Error`, else `String(error)`, truncated to 200 chars.
  3. Add one private `contained = <A,>(reporter: ReporterName, supplied: (a: A) => void) => (a: A) => { try { supplied(a) } catch (error) { say(DeveloperSignal.ReporterThrew({ reporter, error })) } }`
     and use it in each resolver's `supplied` branch (`supplied === undefined ? default : contained(name, supplied)`).
     `say` is called unconditionally (D-53-e a). The development-only defaults are not wrapped — they are
     the library's own and `say` does not throw.
  4. Update the module header ("Seven signals" → eight, naming `ReporterThrew`).
  5. Changeset `@qadi/react: patch`: "A reporter you pass (`onDropped`, `onHydrationMismatch`,
     `onGateIdCollision`, `onDeveloperSignal`) that throws no longer changes what hydration seeds, counts or
     returns, and no longer throws into a render; the throw is reported once on the console, in every
     environment."
- **Tests:** the five red tests above, green.
- **Verify:** `pnpm vitest run --project react packages/react/test/DeveloperSignals.test.ts packages/react/test/HydrationCounts.test.ts packages/react/test/Hydration.test.ts packages/react/test/HydrationEngine.test.ts`; `node scripts/check-house-style.mjs` (`no-ambient-console` still passes: the new `say` call is in the exempt file); `pnpm typecheck`.
- **Done when:** probes P2–P4 pass as tests and nothing else in the react suite changed.

### T2 — A payload refused whole is counted at least once, whatever the reason (defect C11; patch)
- **Status:** [ ] todo
- **Depends on:** T0
- **Files:** `packages/react/src/HydrationEngine.ts` (`hydrateWith`), `packages/react/test/HydrationCounts.test.ts`, `.changeset/hydration-refusal-counted.md` (*new*)
- **Steps (test first):**
  1. Red test in `HydrationCounts.test.ts` ("accounts for a payload refused whole" `describe`): "a payload
     naming another subject with no entries is counted once, not zero times" —
     `{ version: 2, subjectId: "someone-else", entries: [] }` hydrated by `alice`; assert
     `PayloadSubjectMismatch` +1 and the reporter told `{ entries: [], wholePayload: true }`.
  2. In `hydrateWith`'s `subjectId !== subject.id` branch pass `Math.max(1, entries.length)` as `count`,
     the rule the other two whole-payload refusals already use. Leave the `subjectId === undefined &&
     entries.length > 0` branch as is (it is ≥ 1 by its guard).
  3. Changeset `@qadi/react: patch`: "`qadi_hydration_dropped_total{PayloadSubjectMismatch}` now moves for a
     payload that names another subject and carries no entries, as the warning already said."
- **Tests:** the red test, green; "counts an empty payload as nothing" stays green (that payload's
  `subjectId` is `undefined`).
- **Verify:** `pnpm vitest run --project react packages/react/test/HydrationCounts.test.ts`.
- **Done when:** probe P1 passes as a test. (T5 later makes this rule the `PayloadRefused` arm and deletes the default parameter.)

### T3 — One public drop shape for both ends (D-53-b)
- **Status:** [ ] todo
- **Depends on:** T0; D-53-b
- **Files:** `packages/react/src/DeveloperSignals.ts`, `packages/react/src/Hydration.ts`,
  `packages/react/src/HydrationEngine.ts` (`HydrateOptions` doc only), `packages/react/test/Hydration.test.ts`,
  `packages/react/test/Hydration.tst.ts`, `packages/react/test/DeveloperSignals.test.ts`,
  `examples/nextjs-newsroom/app/edge/mixed-payload/page.tsx`, `examples/nextjs-newsroom/src/server/decide.ts`,
  `examples/nextjs-newsroom/test/hydration.test.ts`, `.changeset/hydration-drop-one-shape.md` (*new*)
- **Steps:**
  1. Type test first (`Hydration.tst.ts`, tstyche): `HydrationDrop<unknown>` is still
     `{ reason: ClientHydrationDropReason; entries: ReadonlyArray<unknown>; wholePayload: boolean }`;
     `DehydrateOptions["onDropped"]` accepts `(drop: HydrationDrop<DecisionEntry, DehydrationDropReason>) => void`
     and rejects `(entries: ReadonlyArray<DecisionEntry>) => void`; one
     `(drop: HydrationDrop<unknown, HydrationDropReason>) => void` is assignable to both hooks.
  2. `DeveloperSignals.ts`: `HydrationDrop<A, R extends HydrationDropReason = ClientHydrationDropReason>`,
     `HydrationDropReporter<A, R … = ClientHydrationDropReason>`; `hydrationDropReporter` becomes generic in
     `R` too. Delete `DroppedEntriesReporter` and `droppedEntriesReporter`; the dehydrate side uses
     `hydrationDropReporter<DecisionEntry, DehydrationDropReason>`. Replace the `PayloadMixedSubjects { count }`
     member with `DehydrationDropped { reason: DehydrationDropReason; count: number }` and its sentence with
     `` `[qadi] dehydrateDecisions dropped ${count} decision(s): ${hydrationDropMeaning(reason).remedy}.` ``.
     The hydrate-side default (`HydrationDropped`) is unchanged.
  3. `Hydration.ts` — `DehydrateOptions.onDropped?: HydrationDropReporter<DecisionEntry, DehydrationDropReason>`;
     rewrite its doc ("called once per reason, with the entries left out for it; `wholePayload` is always
     `false`"). `dehydrateDecisions` reports `{ reason: "ForeignSubject", entries: dropped, wholePayload: false }`.
     `DehydrationDropReason` is not re-exported from `@qadi/react`: it is core's public type, and the doc links it.
  4. Migrate the four dehydrate tests in `Hydration.test.ts` (`Array<ReadonlyArray<unknown>>` →
     `Array<HydrationDrop<DecisionEntry, DehydrationDropReason>>`, assertions on `drop.entries`, and one new
     assertion `drop.reason === "ForeignSubject"`); `DeveloperSignals.test.ts`'s `PayloadMixedSubjects`
     sentence test becomes `DehydrationDropped` (still asserts "dropped 1 decision(s)", no subject id, no
     policy tag).
  5. Examples: `page.tsx` → `onDropped: (drop) => { droppedCount += drop.entries.length; }`; `decide.ts` →
     `readonly onDropped?: DehydrateOptions["onDropped"]` (import the type from `@qadi/react`);
     `test/hydration.test.ts` → `(drop) => { dropped = drop.entries.length; }` plus
     `expect(reason).toBe("ForeignSubject")`.
  6. Changeset (see §8) `@qadi/react: minor`, **breaking** note for `DehydrateOptions.onDropped`.
- **Tests:** tstyche file above; migrated runtime tests.
- **Verify:** `pnpm test:tstyche`; `pnpm vitest run --project react packages/react/test/Hydration.test.ts packages/react/test/DeveloperSignals.test.ts`; `pnpm example`; `node scripts/check-api-surface.mjs`.
- **Done when:** success criterion 6 holds and the example passes its own check.

### T4 — `dehydrateDecisions` never throws on a policy it cannot encode (defect C9)
- **Status:** [ ] todo
- **Depends on:** T3; D-53-d
- **Files:** `packages/core/src/HydrationMetrics.ts`, `packages/core/test/HydrationMetrics.test.ts`,
  `packages/react/src/HydrationEngine.ts` (`encodePolicy`, `dehydrateEntry`), `packages/react/src/Hydration.ts`
  (`dehydrateDecisions`), `packages/react/test/HydrationCounts.test.ts`, `packages/react/test/Hydration.test.ts`,
  `features/features/hydration-counts/hydration-counts.feature` + `.steps.test.ts`, `.changeset/hydration-unencodable-policy.md` (*new*)
- **Steps (test first):**
  1. Red tests in `HydrationCounts.test.ts`: for each of `hasAttribute("age", gte(-Infinity))`,
     `hasAttribute("age", gte(Number.NaN))`, `hasRelationship("owner", { depth: 1.5 })`, with one encodable
     entry beside it: `dehydrateDecisions` does not throw, the payload holds only the encodable entry,
     `dehydrated` +1, `UnencodablePolicy` +1, and the hook hears `{ reason: "UnencodablePolicy", entries: [that entry], wholePayload: false }`.
     Plus the conservation case: offered = dehydrated + `ForeignSubject` + `UnencodablePolicy`.
  2. Core: `DehydrationDropReason = "ForeignSubject" | "UnencodablePolicy"` (restate the full union, with a
     doc line per member); add `"UnencodablePolicy"` to `hydrationDropReasons` right after `"ForeignSubject"`;
     add its `MEANINGS` row (D-53-d text). Rewrite the `DehydrationDropReason` doc paragraph that justified
     a one-member union ("One case today …") — it now has two, and the reason the union is named is true
     for a new reason. Update `HydrationMetrics.test.ts`'s written-out `REASONS` list and the pinned
     summaries/remedies.
  3. React: replace `encodePolicy = Schema.encodeSync(PolicySchema)` with a total
     `encodePolicyOption = Schema.encodeOption(PolicySchema)` (present at `effect@4.0.0`:
     `node_modules/effect/src/Schema.ts` exports `encodeOption` and `encodeResult`);
     delete the false "cannot fail" comment and say why it can (the `Finite`/`Int` checks the constructors
     do not apply). `dehydrateEntry` returns `Option<DehydratedEntry>`. `dehydrateDecisions` partitions kept
     entries into encoded and unencodable, counts and reports `UnencodablePolicy` the same way as
     `ForeignSubject` (two report calls at most, one per reason; order: `ForeignSubject` first).
  4. BDD: add a scenario "A policy the schema cannot carry is left out, and says so" (tag stays
     `@hydration-counts @REQ-QD-028`), driving `gte(-Infinity)`.
  5. Changeset (see §8): `@qadi/core: minor` (a new `DehydrationDropReason` member — an exhaustive match on
     it in a consumer stops compiling), `@qadi/react: patch` (no longer throws).
- **Tests:** the red tests; the `HydrationMetrics.test.ts` pins; the BDD scenario. Devtools'
  `model/Hydration.test.ts` reads `hydrationDropReasons` and should pass unchanged — run it.
- **Verify:** `pnpm vitest run --project core packages/core/test/HydrationMetrics.test.ts`; `pnpm vitest run --project react packages/react/test/HydrationCounts.test.ts packages/react/test/Hydration.test.ts`; `pnpm vitest run --project devtools packages/devtools/test/model/Hydration.test.ts`; `pnpm test:bdd`.
- **Done when:** probe E1 passes as a test; criterion 4's E1 clause holds.

### T5 — `HydrationEvent.ts`: the closed event and its one projection (D-53-a, D-53-c)
- **Status:** [ ] todo
- **Depends on:** T1, T2, T3, T4; D-53-a, D-53-c
- **Files:** `packages/react/src/HydrationEvent.ts` (*new*), `packages/react/src/HydrationCounts.ts` (*deleted*),
  `packages/react/test/HydrationEvent.test.ts` (*new*), `packages/react/src/HydrationEngine.ts`
  (imports; `DecisionEntry` moves out), `packages/react/src/Hydration.ts` (type re-export source)
- **Steps:**
  1. Write `HydrationEvent.test.ts` first, against the interface below, one `describe` per tag. Each test
     asserts: the exact deltas on all five metrics (deltas, read with `valueUnsafe(Context.empty())`, as
     `HydrationCounts.test.ts` does), the exact argument the supplied hook receives (or that it is not
     called), the development default's sentence via a `console.warn` spy, and silence under
     `NODE_ENV=production` with no hook. Specific rows: `PayloadRefused` with zero entries moves its reason
     by 1 and tells the hook `entries: []`; `EntriesDropped` moves by `entries.length`; `Seeded { count: 0 }`
     and `Dehydrated { count: 0 }` write nothing observable; `Rechecked { mismatch: undefined }` moves
     re-checks only and calls no hook; `Rechecked { mismatch }` moves both and calls `onHydrationMismatch` once.
     Plus a tstyche assertion that `PayloadRefusalReason | EntryDropReason` is exactly `ClientHydrationDropReason`
     and the two are disjoint.
  2. Create `HydrationEvent.ts`:
     - header doc: what an event is; the "Context.empty() is the whole subtlety" paragraph moved verbatim
       from `HydrationCounts.ts`; ADR-QD-052 link; why `DecisionEntry` lives here (ADR-QD-037).
     - `export interface DecisionEntry` (moved from `HydrationEngine.ts`, doc unchanged).
     - `PayloadRefusalReason`, `EntryDropReason` (not exported from the barrel; exported from the module for
       the engine).
     - `export type HydrationEvent = Data.TaggedEnum<…>` per D-53-a (b) and `export const HydrationEvent = Data.taggedEnum<HydrationEvent>()`.
     - `export interface HydrationHooks { readonly leftOut?: HydrationDropReporter<DecisionEntry, DehydrationDropReason>; readonly dropped?: HydrationDropReporter<unknown>; readonly mismatch?: HydrationMismatchReporter }`
       — already **resolved** reporters (development default or contained supplied, from `DeveloperSignals.ts`).
     - `export const dehydrationHooks = (options?: { readonly onDropped?: … }): HydrationHooks`,
       `export const hydrationHooks = (options?: HydrateOptions): HydrationHooks`,
       `export const recheckHooks = (onHydrationMismatch?: HydrationMismatchReporter): HydrationHooks` —
       each calls the matching `DeveloperSignals.ts` resolver once. This is where `resolveMismatchReporter`'s
       one job goes.
     - A module-scope `describeHydrationEvent: (event: HydrationEvent) => HydrationEventReport` built with
       `Match.type<HydrationEvent>().pipe(Match.tagsExhaustive({…}))`, where
       `HydrationEventReport = { readonly dehydrated: number; readonly seeded: number; readonly dropped: { readonly reason: HydrationDropReason; readonly count: number } | undefined; readonly recheck: { readonly mismatched: boolean } | undefined; readonly announce: (hooks: HydrationHooks) => void }`.
       The table:

       | Tag | dehydrated | seeded | dropped | recheck | announce |
       | --- | ---------- | ------ | ------- | ------- | -------- |
       | `Dehydrated { count }` | `count` | 0 | — | — | nothing |
       | `LeftOut { reason, entries }` | 0 | 0 | `{ reason, count: entries.length }` | — | `hooks.leftOut?.({ reason, entries, wholePayload: false })` |
       | `PayloadRefused { reason, entries }` | 0 | 0 | `{ reason, count: Math.max(1, entries.length) }` | — | `hooks.dropped?.({ reason, entries, wholePayload: true })` |
       | `EntriesDropped { reason, entries }` | 0 | 0 | `{ reason, count: entries.length }` | — | `hooks.dropped?.({ reason, entries, wholePayload: false })` |
       | `Seeded { count }` | 0 | `count` | — | — | nothing |
       | `Rechecked { mismatch }` | 0 | 0 | — | `{ mismatched: mismatch !== undefined }` | `mismatch === undefined ? nothing : hooks.mismatch?.(mismatch)` |

     - `export const emitHydration = (event: HydrationEvent, hooks: HydrationHooks): void` — applies a report:
       counter writes first (`hydrationDehydratedTotal.updateUnsafe(n, registry)` when `n > 0`, the same for
       seeded, the frequency loop for `dropped`, the two re-check counters), then `announce(hooks)`. Counting
       before announcing is the rule; T1's containment makes the order unobservable to a throwing hook, and
       counting first keeps it so even if containment were removed.
     - `export const emitAll = (events: ReadonlyArray<HydrationEvent>, hooks: HydrationHooks): void`.
  3. Delete `HydrationCounts.ts`; the engine imports `emitHydration`/`HydrationEvent` instead of the four
     `count*` functions — call sites unchanged in behaviour for now (`countDropped(r, n); report?.(…)` →
     `emitHydration(HydrationEvent.EntriesDropped({ reason: r, entries }), hooks)` etc.). `refuse`'s
     `count` parameter is deleted: the arm decides.
  4. `Hydration.ts`: `export type { DecisionEntry } from "./HydrationEvent.ts"`; keep the rest.
  5. Fold `HydrationCounts.test.ts`'s unit-level rows that the table now owns into `HydrationEvent.test.ts`
     (see §7); keep its public-interface conservation tests.
- **Tests:** `HydrationEvent.test.ts` (new, one per tag + the partition type test).
- **Verify:** `pnpm vitest run --project react packages/react/test/HydrationEvent.test.ts packages/react/test/HydrationCounts.test.ts packages/react/test/Hydration.test.ts packages/react/test/HydrationPayload.test.ts`; `pnpm circular`; `pnpm typecheck`; `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs`.
- **Done when:** success criteria 1–3 hold for every site but the re-check (T7).

### T6 — The engine owns both codec directions, as pure planners
- **Status:** [ ] todo
- **Depends on:** T5
- **Files:** `packages/react/src/HydrationEngine.ts`, `packages/react/src/Hydration.ts`, `packages/react/src/QadiAtoms.ts` (`hydrate`), `packages/react/test/HydrationEngine.test.ts`
- **Steps:**
  1. Tests first in `HydrationEngine.test.ts` (`describe("planDehydration")`, `describe("planHydration")`):
     the events each plan returns for the canonical cases — all kept; mixed subjects; an unencodable policy;
     empty input (a planner emits no zero-count event, so an empty plan's `events` is `[]` — the "an empty
     payload lands in neither bin" rule, now visible without a metric); each whole-payload refusal; each per-entry reason; mixed per-entry
     reasons in one payload (events in a fixed order: `EntriesDropped` for `EntryTooDeep`, `MalformedEntry`,
     `UndecodablePolicy`, then `Seeded`). No metric is read in these tests.
  2. In `HydrationEngine.ts` add
     `export const planDehydration = (entries: ReadonlyArray<DecisionEntry>, includeTrace: boolean): { readonly payload: DehydratedDecisions; readonly events: ReadonlyArray<HydrationEvent> }`
     — the subject partition moved out of `Hydration.ts` verbatim (EC-06 comment included), then T4's encode
     partition, then the envelope — and `export const dehydrateWith = (entries, options?: DehydrateOptions) => { const plan = planDehydration(entries, options?.includeTrace ?? false); emitAll(plan.events, dehydrationHooks(options)); return plan.payload; }`.
     Move `DehydrateOptions` into the engine (it is the codec's option) and re-export it from `Hydration.ts`.
     Delete `dehydratedPayload` (its counter write was the constructor side effect C3 names) and make
     `dehydrateEntry` private.
  3. Split `hydrateWith` the same way: `planHydration(seedFor, payload, subject): { readonly initialValues: InitialValues; readonly events: ReadonlyArray<HydrationEvent> }`
     with every `refuse(…)` replaced by pushing a `PayloadRefused`/`EntriesDropped` event and returning;
     and `hydrateWith(seedFor, payload, subject, options) = plan + emitAll(events, hydrationHooks(options)) + return initialValues`.
     The "never throws" doc moves to `planHydration`, and `hydrateWith`'s doc says why emission follows the
     plan (C10).
  4. `Hydration.ts`: `dehydrateDecisions = (entries, options) => dehydrateWith(entries, options)`. The module
     is now the interface only — doc comments, by-name re-exports, two delegates. Update its header ("The
     public interface over `HydrationEngine.ts`, which owns the payload codec in both directions …").
  5. `QadiAtoms.ts` — `hydrate` keeps calling `hydrateWith` (signature unchanged).
- **Tests:** planner tests above. Existing `Hydration.test.ts`/`HydrationPayload.test.ts`/`HydrationCounts.test.ts` unchanged and green.
- **Verify:** `pnpm vitest run --project react packages/react/test`; `pnpm circular`; `pnpm typecheck`.
- **Done when:** `rg -n "subjectId ===|filter\(" packages/react/src/Hydration.ts` prints nothing, and C3 no longer holds.

### T7 — The re-check is an event; delete `resolveMismatchReporter`
- **Status:** [ ] todo
- **Depends on:** T5
- **Files:** `packages/react/src/HydrationEngine.ts` (`makeSeededQuestion`, `resolveMismatchReporter`), `packages/react/src/QadiAtoms.ts` (`makeQadiAtoms`), `scripts/check-house-style.mjs` (`DECISION_READ_BUDGET`), `packages/react/test/HydrationEngine.test.ts`
- **Steps:**
  1. `makeSeededQuestion`'s input `report: HydrationMismatchReporter | undefined` → `hooks: HydrationHooks`.
     In `read`'s announce block replace the `countRecheck` + `report` pair with
     ```ts
     const mismatch = AsyncResult.isSuccess(result) && isMismatch(seeded, result.value)
       ? { policy, resource, seeded, decided: result.value }
       : undefined;
     emitHydration(HydrationEvent.Rechecked({ mismatch }), hooks);
     ```
     Keep every comment that explains `get.once`, `observedSeed` and "a failure is not a disagreement".
  2. `QadiAtoms.ts`: `const hooks = recheckHooks(options?.onHydrationMismatch)` once per atom set (keeps
     today's "the development default is decided at construction"); pass `hooks` to `makeSeededQuestion`.
     Delete `resolveMismatchReporter` and its import; the `HydrationMismatch`/`HydrationMismatchReporter`
     re-exports stay.
  3. `scripts/check-house-style.mjs`: `DECISION_READ_BUDGET["packages/react/src/HydrationEngine.ts"]` 3 → 2,
     and its comment → "one `isInitial` deciding whether the computed result replaces the seed, and one
     `isSuccess` deciding whether it disagrees with it".
  4. `HydrationEngine.test.ts`: "announces a disagreement once per registry" passes `recheckHooks(spy)`.
- **Tests:** existing re-check tests (`HydrationCounts.test.ts` "counting re-checks" `describe`, `HydrationEngine.test.ts`) unchanged and green; T1's throwing-mismatch test green.
- **Verify:** `pnpm vitest run --project react packages/react/test/HydrationEngine.test.ts packages/react/test/HydrationCounts.test.ts packages/react/test/QadiAtoms.test.ts packages/react/test/HydrationRender.test.tsx`; `node scripts/check-house-style.mjs`.
- **Done when:** success criteria 1 and 7 hold.

### T8 — One property over both planners; mutation scope (D-53-g)
- **Status:** [ ] todo
- **Depends on:** T6, T7; D-53-g
- **Files:** `packages/react/test/HydrationPayload.test.ts`, `stryker.react.mjs` (if D-53-g = a/b)
- **Steps:**
  1. Replace `HydrationPayload.test.ts`'s "returns, and accounts for every entry it could see, over arbitrary
     JSON" (which reads metric deltas) with a property over `planHydration`'s events: for `fc.jsonValue()`
     payloads and for generated well-formed payloads with a random mix of bad entries, `seeded.length +
     Σ(EntriesDropped.entries.length) === visible` when no `PayloadRefused` is present, and when one is,
     it is the only drop event and carries every visible entry. Keep the existing "never throws" property.
  2. Add the dehydrate twin: generated `DecisionEntry` lists over two subjects and a policy arbitrary that
     sometimes yields `gte(±Infinity|NaN)` or a fractional depth; `planDehydration`'s
     `Dehydrated.count + Σ LeftOut.entries.length === entries.length`, and the payload is
     `JSON.parse(JSON.stringify(payload))`-stable.
  3. `stryker.react.mjs`: add `"packages/react/src/HydrationEvent.ts"` to `mutate` (D-53-g = a). Update the
     file's header paragraph that lists what is mutated and why.
- **Tests:** the two properties (fast-check is already a react dev dependency).
- **Verify:** `pnpm vitest run --project react packages/react/test/HydrationPayload.test.ts`; `pnpm exec stryker run stryker.react.mjs` (score ≥ 80, the `break` threshold; record the score in §10).
- **Done when:** success criterion 5 holds and the react mutation run passes.

### T9 — Spec, ADRs, traceability, overview
- **Status:** [ ] todo
- **Depends on:** T1–T8; D-53-f
- **Files:** `spec/behaviors/19-hydration.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`,
  `spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md`, `spec/decisions/041-a-mismatch-is-announced.md`,
  `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md`, `spec/decisions/index.yaml` (status lines)
- **Steps:** as listed in §8, each with its Document Control revision row. Write the CCR as `CCR-QD-NEXT`
  until it lands.
- **Tests:** `pnpm spec:examples` (every `typescript` fence compiles — BEH-QD-146/230's `ts` fences are
  signature listings and stay `ts`), `pnpm spec:verify:strict`.
- **Verify:** `pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:api && pnpm spec:gates`.
- **Done when:** no spec text says "`HydrationCounts.ts`", "a bare array" or "one case today" about the
  dehydrate side; INV-QD-045's Source names `HydrationEvent.ts`.

### T10 — Website docs, upgrading note, changesets
- **Status:** [ ] todo
- **Depends on:** T3, T4, T9
- **Files:** `apps/website/src/content/docs/docs/packages/react/hydration.md`, `apps/website/src/content/docs/docs/reference/upgrading.md`, `.changeset/*` (the four from T1–T4, plus `hydration-event.md` for T5–T8 if it changes anything visible — it should not)
- **Steps:**
  1. `hydration.md` "Bound to one subject, and every drop has a reason": one paragraph on the shared
     `HydrationDrop` shape with a compiled `typescript` fence routing both hooks to one function; one sentence
     each for `UnencodablePolicy` and for a reporter that throws (contained, announced, outcome unchanged).
  2. `upgrading.md`: a section `## <next minor>: one drop shape for both ends of hydration`: before/after for
     `dehydrateDecisions(entries, { onDropped })`; "it is now called once per reason"; the new reason in
     `DehydrationDropReason` (an exhaustive match needs an arm).
  3. Consolidate the changesets if T1–T4 land together (one `@qadi/react` minor with the breaking note; one
     `@qadi/core` minor).
- **Verify:** `pnpm spec:website-examples && pnpm website`.
- **Done when:** both website gates pass and the upgrading note names the migration in one line.

### T11 — The whole gate
- **Status:** [ ] todo
- **Depends on:** T1–T10
- **Files:** none
- **Steps:** `pnpm check`. Then re-run the §1 probe against the branch: every P/E line now reports the
  fixed behaviour (P1 delta 1; P2–P4 no throw, counts conserved; E1 no throw, `UnencodablePolicy` +1).
- **Verify:** `pnpm check`.
- **Done when:** green, and §10 records the mutation score and the probe output.

## 7. Test strategy

**Replace, don't layer.** The unit that is new is the event table, so the table's behaviour is tested once,
at its own interface, and the tests that pinned the same behaviour through three modules' worth of
pairing move there or go.

| Test | Fate |
| ---- | ---- |
| `HydrationEvent.test.ts` (*new*) | The one surface for "each kind of exit moves exactly these counters and tells exactly this hook": one test per tag (6), the partition type test, the throwing-hook row per hook kind. |
| `HydrationCounts.test.ts` "counting what crosses the network" (8 tests) | **Stay** — they are INV-QD-045 through the public interface (`dehydrateDecisions`/`hydrateDecisions`), the per-call conservation law. T2 and T4 add rows. |
| `HydrationCounts.test.ts` "a payload that seeds nothing says so": "warns on the console when no reporter is supplied", "says nothing in production unless a reporter was supplied", "counts a refusal even where nothing reports it", "names a different cause for each reason" | **Move** to `HydrationEvent.test.ts` (they are properties of the projection, not of the codec). The reason-specific "announces a payload made for another subject / whose version … / that is not an envelope / entries whose policy did not decode", "reports undecodable entries once, not once each", "still seeds the entries that did decode" **stay** (they pin which event the codec emits). |
| `HydrationCounts.test.ts` "counting re-checks" (6 tests) | **Stay** (they drive real registries; `makeSeededQuestion`'s once-per-registry rule is not the table's). |
| `DeveloperSignals.test.ts` | **Stays** as the sentence table's test; `PayloadMixedSubjects` → `DehydrationDropped`; `ReporterThrew` sentence and the per-resolver containment rows added (T1). "the four hydration defaults are absent in production" counts the resolvers it means by name, not by number. |
| `Hydration.test.ts` dehydrate `describe` | **Migrated** to the new hook shape (T3); the throwing-hook row (T1). |
| `HydrationEngine.test.ts` | Gains `planDehydration`/`planHydration` tests (T6) — the codec's events with no metric and no console; the throwing-mismatch row (T1). |
| `HydrationPayload.test.ts` "accounts for every entry … over arbitrary JSON" | **Replaced** by the planner property (T8), which is stronger (exact events, not deltas) and needs no default-registry read; "never throws" stays. |
| `packages/core/test/HydrationMetrics.test.ts` | Written-out reason list and meaning pins gain `UnencodablePolicy` (T4). |
| `packages/devtools/test/model/Hydration.test.ts` | Unchanged; must pass (it reads `hydrationDropReasons`). |
| BDD `hydration-counts.feature` | One new scenario (T4). |
| `Hydration.tst.ts` | The shared-drop-shape assertions (T3), the partition assertion (T5). |

**Property coverage.** T8's two planner properties (hydrate over `fc.jsonValue()` and over well-formed
payloads with injected bad entries; dehydrate over two-subject lists with unencodable policies) replace the
metric-delta property. They are pure, so they run fast and never depend on suite order — the reason
`HydrationCounts.test.ts` had to assert only deltas disappears for them.

**Differential.** None needed: there is one implementation of each direction. T6's planners are checked
against the public functions by the unchanged `Hydration.test.ts`/`HydrationCounts.test.ts` suites.

**Mutation (Stryker).** `HydrationEvent.ts` joins `stryker.react.mjs` (D-53-g = a). Expected killers: the
per-tag tests (each arm's counter choice and count expression — `Math.max(1, …)` is exactly the mutant C11
was), the throwing-hook rows (the `try` body), and the planner property for the dehydrate/hydrate splits.
`ignoreStatic: true` skips the table's construction; every arm body is reached per test. Coverage stays
≥ 90% for react; `HydrationEvent.ts` should be at 100% lines.

## 8. Spec and documentation updates

- **`spec/behaviors/19-hydration.md`** (Document Control row, CCR-QD-NEXT):
  - **BEH-QD-146**: the "`DehydrateOptions.onDropped` takes the same shape" paragraph becomes literal:
    it receives a `HydrationDrop<DecisionEntry, DehydrationDropReason>`, once per reason. New
    REQUIREMENT: "`dehydrateDecisions` MUST NOT throw, and MUST drop an entry whose policy the policy schema
    does not accept, as `UnencodablePolicy`." Add a `> **Corrected in CCR-QD-NEXT.**` block: the engine's
    "encoding a typed policy cannot fail" was false for non-finite bounds and fractional depths (C9).
  - **BEH-QD-230**: REQUIREMENT added — "A supplied reporter MUST NOT be able to change what is seeded,
    counted or returned; a reporter that throws is announced as such, in every environment." The
    "MUST NOT report zero lost decisions" paragraph gains: a whole-payload refusal is **counted** at least
    once whatever its reason (C11). The count of reasons across both ends becomes **eight**; name them,
    don't count them in prose (CCR-QD-203's lesson).
  - **BEH-QD-231**: the `HydrationMetrics.ts` listing is unchanged; the source sentence names
    `HydrationEvent.ts` as the one writer.
  - **BEH-QD-152**: one sentence — `onHydrationMismatch` that throws is contained (cross-reference BEH-QD-230).
- **`spec/invariants.md`**:
  - **INV-QD-045** (Document Control row): Source → "`packages/react/src/HydrationEngine.ts`'s
    `planDehydration`/`planHydration` return every exit as a `HydrationEvent`, and
    `HydrationEvent.ts`'s `emitHydration` is the only writer of the five metrics". Add the dehydrate exit
    `UnencodablePolicy` to the reason list; restate "A refused payload is counted at least once" as
    enforced by the `PayloadRefused` arm. Enforcement → `HydrationEvent.test.ts`, the planner properties in
    `HydrationPayload.test.ts`, `HydrationCounts.test.ts`.
  - **INV-QD-NEXT (new): "A supplied reporter observes; it cannot change the outcome."** Statement: for
    every reporter `@qadi/react` accepts, the values returned, the atoms seeded, the counters moved and
    the render produced are the same whether the reporter returns or throws. Source: `DeveloperSignals.ts`'s
    resolvers (`contained`). Implication: found by ARCH-53's probes (C10). Enforcement: T1's tests.
    Related: INV-QD-045, BEH-QD-146/152/230, ADR-QD-041.
- **`spec/traceability.md`**: row "19 — Decision Hydration" — module list replaces `HydrationCounts.ts`
  with `HydrationEvent.ts`; INV-QD-045 row's enforcement column; new INV-QD-NEXT row; test rows for
  `HydrationEvent.test.ts` (BEH-QD-230, BEH-QD-231, INV-QD-045, INV-QD-NEXT, ADR-QD-052) and the changed
  coverage of `HydrationEngine.test.ts`, `HydrationPayload.test.ts`, `DeveloperSignals.test.ts`.
- **`spec/overview.md`** (gate 13): `DecisionEntry`/`DehydrateOptions` row — "declared in
  `HydrationEvent.ts`" / "`HydrationEngine.ts`"; `HydrationDrop`, `HydrationDropReporter` row — "generic in
  the entry and the reason; both ends' `onDropped` take it"; core's `DehydrationDropReason` row —
  "eight reasons across both ends: `ForeignSubject`, `UnencodablePolicy` (dehydrate), then …". Change
  History row naming the breaking change.
- **ADRs (D-53-f = A)**: ADR-QD-052 dated amendment block + revision 1.3 + index status
  ("amended 2026-10-NN (the outcome is one event)"); ADR-QD-041 one bullet in its amendment section +
  revision row; ADR-QD-078 revision-row note only.
- **CCR**: one `CCR-QD-NEXT` entry covering T1–T8 (or one per landing slice: defect path, deepening).
- **Website**: T10.
- **Changesets** (no release — the user's explicit go-ahead is required for any version PR):
  - `@qadi/react: minor` — **Breaking:** `DehydrateOptions.onDropped` receives a `HydrationDrop`
    (`{ reason, entries, wholePayload: false }`), once per reason, instead of the bare array of entries;
    migrate `(entries) => …` to `(drop) => …drop.entries…`. `HydrationDrop`/`HydrationDropReporter` gain a
    second, defaulted type parameter for the reason, so existing hydrate-side annotations are unchanged and
    one function can serve both ends. `dehydrateDecisions` no longer throws on a policy the schema rejects
    (it leaves the entry out as `UnencodablePolicy`); a reporter that throws no longer changes the outcome;
    a zero-entry foreign-subject payload is counted. The `ForeignSubject` console line now reads
    "dehydrateDecisions dropped N decision(s): <remedy>".
  - `@qadi/core: minor` — `DehydrationDropReason` gains `"UnencodablePolicy"` (in `hydrationDropReasons`,
    with its `hydrationDropMeaning`); an exhaustive match over `DehydrationDropReason` or
    `HydrationDropReason` needs a new arm.
  - `@qadi/devtools`: no code change; the panel lists the new reason from `hydrationDropReasons`. No changeset
    unless the fixed group requires one.

## 9. Risks and rollback

| Risk | How it shows | Mitigation / rollback |
| ---- | ------------ | --------------------- |
| The dehydrate hook break (D-53-b) reaches a host who upgrades without reading notes | TS error at `onDropped` on upgrade; a JS host reads `drop.length` as `undefined` | Changeset breaking note, `upgrading.md` section, the example migrated in the same change. Rollback: revert T3 alone; T4 would then report `UnencodablePolicy` through the bare array (losing the reason) — so T3 and T4 revert together. |
| `ReporterThrew` speaking in production surprises a host | A console line in a production bundle | Only fires when the host's own reporter throws, which is a host bug; D-53-e (b) is the fallback (dev-only) if the user prefers, a one-line change in `contained`. |
| `UnencodablePolicy` hides a policy authoring bug that used to crash loudly | Server renders succeed; the client re-decides | The drop is counted and the development default names the fix; a supplied `onDropped` sees the entry. That is the hydration contract for every other bad entry. |
| Re-ordering report-after-work changes a test that relied on interleaving | A test spying both console and counters in one callback | None found in the current suite; T6's planner tests fix the order explicitly. |
| `DECISION_READ_BUDGET` drift | `[decision-read-budget]` failure | T7 edits the budget in the same commit as the read change. |
| madge cycle via `DecisionEntry` | `pnpm circular` fails | `DecisionEntry` moves into `HydrationEvent.ts`, which imports nothing local but `DeveloperSignals.ts`; verified in T5's verify step. |
| Mutation run time | `pnpm mutation` slower | `HydrationEvent.ts` is ~150 lines; `HydrationEngine.ts` is deliberately not added (D-53-g). |
| **Sibling overlap — ARCH-57** (loose ends; gate writer on `QadiContextValue`; small defects) | Both edit `DeveloperSignals.ts` (`providerSignalReporter`, `gateIdCollisionReporter`) and possibly `QadiAtoms.ts` | Land ARCH-53 T1 first, or rebase T1 onto ARCH-57; T1's change is local to the resolvers' `supplied` branch. If ARCH-57 lists a reporter-throws defect, it is this plan's T1 — de-duplicate. |
| **Sibling overlap — ARCH-56** (evaluation metrics declared where both ends import them) | Both may edit core's `HydrationMetrics.ts` (ARCH-56 uses it as the precedent; T4 adds a union member and a meaning row) | Textual only; whichever lands second re-applies its rows. If ARCH-56 introduces a shared off-fiber write helper in core, `HydrationEvent.ts` adopts it in a follow-up, not here. |
| **Sibling overlap — ARCH-55** (named-export core barrel; merging shallow core modules) | Core barrel edits | This plan adds no core export (only a union member), so no barrel line. If ARCH-55 moves `HydrationMetrics.ts`, T4's edit follows the file. |
| Follow-up not taken here | A resource that does not survive JSON seeds an unread atom | Recorded as a candidate for a later wave (§3); not a loss INV-QD-045 can see. |

**Rollback overall.** The defect path (T1, T2) is independent patches; T3+T4 are one minor and revert
together; T5–T8 are internal and revert as one commit without touching public types (the event module,
the planners and the budget change go back together).

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | Plan written against `b655b3b`; probes P1–P5 and E1 run (§1); three defects confirmed (C9 Medium, C10 Medium, C11 Low); C4's "lost information" refuted at HEAD | planner |
| 2026-10-13 | T0-T11 | Implemented as one commit on wave5/architecture-deepenings; D-53-a..g as recommended (resolvers named clientDropReporter/serverDropReporter; hooks built by dehydrationHooks/hydrationHooks/recheckHooks); react Stryker 94.63 (HydrationEvent.ts 94.20, 4 equivalent guard mutants); CCR-QD-391, INV-QD-244 | implementer |
