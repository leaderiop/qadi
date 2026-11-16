# Phase 50: What a leaf needs from the request, stated once - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

The rule that a leaf which reads the action or the resource fails when the request has none (INV-QD-011), together with the order in which absences are checked, is either stated once in one package-private table that `Walk` and `Predicate` both read, or the phase ends with a measured rejection recorded in ADR-QD-163. The phase **opens on a benchmark** (AGENTS.md §5a: a change next to budgeted switch #1, `evaluateNode`). ADR-QD-024/100 (admission shared, the two walks stay two), `SWITCH_BUDGET` and `UNTRACED_BUDGET` stay unchanged. Shared wave rules: `.planning/phases/_WAVE10-CONTEXT.md`.

Requirements: LEAF-01..05, WX-01..07. Reserved ids: ARCH-97, ADR-QD-163, CCR-QD-441, BEH-QD-586..590, INV-QD-345..346.

</domain>

<decisions>
## Implementation Decisions

### The benchmark gate (LEAF-01)
- **D-01:** The prototype is the shape the phase would ship: `evaluateNode`'s leaf arms read the module-scope table through one reader call; composite arms untouched. The measurement judges what ships, not a toy.
- **D-02:** Workloads: all of `packages/core/bench/Evaluate.bench.ts`, plus a new leaf-heavy workload added **at the base first** (e.g. an `allOf` of 8 `HasAttribute`/`HasResourceAttribute` leaves whose matchers reference the action and the resource), because no existing workload stresses the checks the table replaces.
- **D-03:** Noise rule: interleaved A/B (base, prototype, base, …), 3 runs each, compared on the mean of means per workload. Noise band per workload = max(10% — the ADR-QD-092 precedent — , the base's own run-to-run spread for that workload). Reject if **any** workload's prototype is slower than the base beyond its band. Record per-workload numbers, the band and machine load in ADR-QD-163.
- **D-04:** On a rejection: no `packages/*/src` change; ADR-QD-163 records the rejection and its numbers; LEAF-02..05 are annotated "Not pursued (measured)" in REQUIREMENTS.md; the new bench workload stays (a bench file, not src, kept as evidence).

### Check order and absence (LEAF-02, LEAF-03)
- **D-05:** Keep today's per-leaf results, stated as **one rule**: a leaf's own input first (`HasAction` → action, `HasResourceAttribute` → resource, a resource-scoped port leaf → resource id), then what its matcher references, action before resource. This reproduces every current error (`HasAttribute`: action then resource; `HasResourceAttribute`: resource then action). A RED-first test over a request missing both action and resource, for each leaf kind, pins the rule; a behaviour row states it (LEAF-03: "preserved deliberately").
- **D-06:** The table states the resource-id need, but `readScoped` (`PortAccess.ts`) stays the one enforcement point, so the port's own span still records the question (ADR-QD-134, BEH-QD-227). A test ties each scoped leaf's row to `readScoped`'s behaviour.
- **D-07:** The reader takes the inputs each interpreter has. In `toPredicate` the resource is the row (always present); `HasAttribute`'s "matcher references the resource" stays a **refusal** (the resource is a column), not an absence.
- **D-08:** The reader returns one closed `Absence` union — `Action { expected? }`, `Resource { attribute }`, `ResourceId { relation }` (or none). Walk maps it to `MissingAction`/`MissingResource`; `toPredicate` maps `Action` to its lazy `NeedAction` plan (failure stays deferred until `run` reaches it). `MissingAction`'s `expected` stays omitted (no key) where the arm has no expected action, as today.

### The module, the port-free judgement and records (LEAF-02, LEAF-04, LEAF-05)
- **D-09:** A package-private `packages/core/src/LeafNeeds.ts`, out of the barrel, following the ADR-QD-152 keyed-table pattern: `as const satisfies { [K in LeafPolicy["_tag"]]: LeafNeed }`, so a missing leaf row is a compile error. Not in `Policy.ts` (Phase 51 edits it for arity — soft edge).
- **D-10:** The port-free judgement covers `HasRole`, `HasPermission` **and `HasAction`** (also judged twice today), written once in the same module; each interpreter wraps the boolean — Walk in allow/deny with its reason, `toPredicate` in a `Constant`.
- **D-11:** Tests: an exhaustive table test over every leaf tag × action present/absent × resource present/absent × matcher referencing each input or not, pinning INV-QD-011 and the D-05 rule; plus a property that `Walk` and `toPredicate` agree where both apply.
- **D-12:** Records: ADR-QD-163 (bench numbers and the decision, either way), CCR-QD-441, BEH-QD-586+ (the order rule, the table), INV-QD-345 (the table covers every leaf tag); INV-QD-011 pinned, not duplicated. No new public export. `@qadi/core` patch changeset only if code changes. AGENTS.md edited only if a cited location moves (§5's "port reads in `PortAccess.ts`" list, §5a's switch table).

### Claude's Discretion
- Exact names of `LeafNeed` fields and `Absence` variants, the reader's signature, and the leaf-heavy workload's exact policy shape.
- Whether `HasCustom`/`HasActed`/`HasNotActed`/`HasSignature`/`HasRelationship` rows state "resource id" or "none" per their scope (research confirms against `PortAccess.ts`).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- ADR-QD-152 keyed-table pattern: `packages/core/src/HydrationMetrics.ts`, `packages/core/src/GateState.ts` (Phase 49).
- `referencesAction`/`referencesResource` in `Matcher.ts` — the matcher-reference facts the table reader uses.
- `LeafPolicy`/`LeafOf` and `PolicyCases` in `Policy.ts`.

### Established Patterns
- `Walk.ts:297` `evaluateNode` is budgeted switch #1 (§5a) — stays a switch; its leaf arms call the reader.
- `Predicate.ts:396-425` builds `NeedAction` plans lazily; `Predicate.ts:597` turns them into `MissingAction` at `run`.
- `PortAccess.ts:271` `readScoped` raises `MissingResourceId` on the port's span (ADR-QD-134).
- Bench precedent: ADR-QD-092 (three runs, ≤10% on the mean of means); `spec/process/house-rules-evidence.md` §1–2 (~30% run-to-run movement on a dev machine).

### Integration Points
- `Walk.ts` leaf arms (`HasPermission`, `HasRole`, `HasAttribute`, `HasResourceAttribute`, `HasAction`) and `Predicate.ts`'s `cases`.
- `pnpm bench` = `vitest bench --run`; `packages/core/bench/Evaluate.bench.ts`.

</code_context>

<specifics>
## Specific Ideas

- The review check settled the facts: `action === undefined && referencesAction(matcher)` appears twice in `Walk.ts`, `HasAction` once, `MissingResource` twice, `readScoped` raises `MissingResourceId`, `Predicate.ts` rewrites the same checks as `NeedAction` plans, and `HasRole`/`HasPermission` are judged in both interpreters.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
