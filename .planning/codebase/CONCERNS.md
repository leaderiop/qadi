# Codebase Concerns

**Analysis Date:** 2026-08-30

## Tech Debt

### Large Core Module Complexity

**Area:** Core evaluator

**Issue:** `packages/core/src/Evaluate.ts` is 1188 lines with performance-critical code paths. The file contains the primary policy evaluation loop, metric collection, and complex state management.

**Files:** `packages/core/src/Evaluate.ts`

**Impact:** Difficult to review comprehensively, refactoring risky. High test coverage (99%+) mitigates, but cognitive load remains high.

**Fix approach:** Already acknowledged in AGENTS.md §5a — the file contains 2 of 4 allowed switch statements (the other 2 in `packages/core/src/Matcher.ts`). No refactoring without re-evaluating the switch budget. Consider extracting metric initialization and trace construction into separate internal modules if complexity grows further.

### Switch Statement Budget Constraint

**Area:** Policy evaluation dispatching

**Issue:** AGENTS.md §5a enforces exactly 4 `switch` statements across 2 files, with a performance justification (2–4% on matcher-heavy policies). These are:

- `Evaluate.ts` — `evaluateNode` on `policy._tag` 
- `Evaluate.ts` — `mergeFields` on `FieldStrategy` literal union
- `Matcher.ts` — `evaluateMatcher` on `self._tag`
- `Matcher.ts` — `resolveRef` on `ref._tag`

**Files:** `packages/core/src/Evaluate.ts` (lines 322, 547), `packages/core/src/Matcher.ts` (lines 214, 301)

**Impact:** Any new policy variant or matcher type requires updating two switches simultaneously. Converting to `Match` expressions would sacrifice measured performance (1.6–7.7× slower depending on form). Budget enforcement is automated in `scripts/check-house-style.mjs` with `SWITCH_BUDGET`.

**Fix approach:** When adding new variants, update both the switches and the switch budget table in the script. Each switch must remain exhaustive by construction — missing arms return `never` and compile to TS2366 errors.

### Mutation Testing Weak Spots

**Area:** Authorization logic correctness

**Issue:** `Evaluate.ts` has a mutation score of 81.25% (above the 80% threshold but lowest among core modules). Of 157 total survivors:

- **62 are string literals** (reason text) — correct survivors, not defects
- **52 affect logic**, of which **1 was a real gap**: `fieldMatch` line 326 in `packages/core/src/Matcher.ts` did not guard non-objects correctly
- **~156 remaining** are message strings, defensive arms, and equivalent mutants

**Files:** `packages/core/src/Evaluate.ts`, `packages/core/src/Matcher.ts`

**Impact:** The gap in `fieldMatch` could cause `fieldMatch("length", gte(3))` on a string to read the property off a primitive (now tested and fixed). Survivors are lower than ideal but well-understood.

**Fix approach:** The one real gap has been closed with a property test. Re-reading survivors JSON is cheap now that `coverageAnalysis: "perTest"` is configured in `stryker.config.mjs`. Focus mutations on logic arms that affect policy branches.

---

## Known Bugs

**None currently tracked** — the preceding mutation analysis found and fixed one real gap (fieldMatch non-object guarding). The roadmap's "Shipped" section declares every committed item complete.

---

## Security Considerations

### Hydration Payload Binding

**Area:** Server-side rendering and decision hydration

**Issue:** A payload is authorization state crossing a network. `packages/react/src/Hydration.ts` must enforce:

1. **Bound to subject ID**: `HydrationSeed.ts` attaches the subject id to every entry and refuses the whole payload on mismatch
2. **No trace disclosure by default**: Traces name policy internal structure and which branch a subject failed — disclosed only if caller opts in
3. **Drop rather than throw**: Unverifiable entries fail closed, degrading to pre-hydration behavior rather than crashing

**Files:** `packages/react/src/Hydration.ts`, `packages/react/src/HydrationSeed.ts`, `packages/react/src/HydrationWarning.ts`

**Impact:** Cross-user leakage of allows if payload is not subject-bound. Disclosure of internal policy structure if traces are sent untrusted.

**Current mitigation:** All three properties are encoded in schema validation (`decodePolicy`, `decodeEntryFields` via `Schema.decodeUnknownOption`) and documented in ADR-QD-028.

**Recommendations:** Continue enforcing subject-bound validation. Keep trace disclosure opt-in. Audit any new hydration feature against ADR-QD-028.

### Decision Cache Key Collision Risk

**Area:** Optional decision caching

**Issue:** `packages/core/src/DecisionCache.ts` uses `HashMap` with structural equality. The **whole subject** must be in the key, not just the subject ID. A previous defect used `JSON.stringify`, which:

- Mapped `Date(0)` to `"1970-01-01T00:00:00.000Z"` 
- Dropped `undefined`-valued properties
- Could render different objects identically, causing cache collision and permission leakage

**Files:** `packages/core/src/DecisionCache.ts` (lines 68–73 document the security boundary)

**Impact:** Privilege escalation — a scoped token and a full token for the same user have the same ID but different `AuthSubject` structure. A cache keyed on ID alone would serve the first verdict permanently.

**Current mitigation:** Cache key is now the full `AuthSubject` (including `HashSet` grants), compared structurally via Effect's `Equal`/`Hash`. Test (`DecisionCache.test.ts`) pins the structural-vs-ID distinction.

**Recommendations:** Never revert to ID-based keying. Keep the subject in the key. Document this in every review that touches the cache.

### Promise Facade Constraint Violation Prevention

**Area:** Non-Effect entry point

**Issue:** `packages/promise/src/index.ts` must never contain conditional logic that decides anything. Every method is `runtime.runPromise(coreFunction(...))`. A defect here would resurrect the predecessor's "second evaluation path" problem.

**Files:** `packages/promise/src/index.ts` (lines 1–19 document the invariant)

**Impact:** Silent short-circuiting failure, unreachable async relationship API, test rot.

**Current mitigation:** The entire file is one `ManagedRuntime` bound to `QadiLayer` with forwarding calls. No conditional logic exists to violate the constraint.

**Recommendations:** Any review touching this file must confirm every method is a direct `runPromise(coreFunction(...))` call. ADR-QD-032 and INV-QD-026 detail this design.

---

## Performance Bottlenecks

### Lazy Attribute Resolution under Concurrent Evaluation

**Area:** Evaluator concurrency

**Issue:** `EvaluateOptions.concurrency` evaluates children of `allOf`, `anyOf`, and `rules` in parallel. INV-QD-020 documents that this forfeits short-circuit preservation deliberately and by explicit request — `AnyOf` will evaluate all children rather than stopping at the first allow.

**Files:** `packages/core/src/Evaluate.ts` (lines 180–200 handle concurrency)

**Impact:** Concurrent mode can double or triple attribute resolver calls vs. sequential. Calling code that uses `concurrency: "unbounded"` on a high-latency resolver could see significant latency.

**Fix approach:** Default is sequential (INV-QD-005 holds). Concurrent mode is opt-in. Callers should benchmark with their resolver before enabling concurrency. The trace is identical regardless of concurrency choice, so explain/audit features are unaffected.

### FieldPath Mutation Resistance

**Area:** Field visibility specification

**Issue:** `packages/core/src/FieldPath.ts` line 41–49 documents that several mutations are "resistant to detection through `compareFieldPaths`'s external result alone". Malformed path segments (e.g., from `"a..b"` or a trailing `"."`), will match no real key silently rather than throw.

**Files:** `packages/core/src/FieldPath.ts` (lines 41–49, 50–61)

**Impact:** A malformed field spec is undetectable to the caller — it silently grants no fields rather than erroring. Not a correctness defect (the safe fallback), but requires discipline: callers must validate field specs before use.

**Fix approach:** No validation added deliberately (mirrors `Matcher.ts`'s `getByPath` convention). This is the stated design. Callers should validate field specs in their own layer if needed.

---

## Fragile Areas

### React Integration on Unstable API

**Area:** Reactive atom layer

**Issue:** `@qadi/react` is built on `effect/unstable/reactivity`, which is not stable in Effect v4. The API may move before Effect 4.0 ships.

**Files:** `packages/react/src/QadiAtoms.ts`, `packages/react/src/QadiProvider.tsx`, `packages/react/test/v4-reactivity-smoke.test.ts`

**Impact:** Breaking changes if Effect's unstable API changes. Minimal actual exposure because the React integration is one `useSyncExternalStore` call in `QadiProvider.tsx`.

**Current mitigation:** `v4-reactivity-smoke.test.ts` pins every reactivity API in use (line 278 in roadmap documents this). A beta bump fails in one place rather than diffusely.

**Safe modification:** When updating Effect versions, first run `pnpm test` on the React suite to catch API changes early. Keep the smoke test as a canary.

### Atom Keying via Structural Equality

**Area:** React decision caching

**Issue:** `Atom.family` keys structurally via `Equal.equals`, not by reference. A policy re-parsed on the client is a different object but equal, so it maps to the same atom. This is correct behavior and makes hydration possible, but the consequence deserves attention.

**Files:** `packages/react/src/QadiAtoms.ts` (line 50–61 documents atom creation), `packages/react/test/v4-reactivity-smoke.test.ts` (pins the keying rule)

**Impact:** Inline policies share atoms across instances if they are structurally equal. Hoist to module scope or `useMemo` anyway (hash is cached per object), but do not claim inline defeats sharing — it does not (BEH-QD-071).

**Safe modification:** Do not change the atom family keying without consulting the hydration story (ADR-QD-028). Atom structural equality is what makes hydration payloads identifiable without caller-supplied keys.

### Policy Depth Limit

**Area:** Evaluator recursion

**Issue:** `DEFAULT_MAX_DEPTH` is 64. A policy deeper than this raises `PolicyTooDeep`. Deeply nested policy trees (many levels of `AllOf`/`AnyOf` nesting) will hit this limit.

**Files:** `packages/core/src/Policy.ts` (line 38 defines DEFAULT_MAX_DEPTH), `packages/core/src/Errors.ts` (PolicyTooDeep error)

**Impact:** Policies with >64 levels of nesting are rejected. Not a known real-world issue (64 is deep), but a hard ceiling.

**Fix approach:** The limit is an evaluation parameter, not a policy property. Callers can increase it: `evaluate(policy, { maxDepth: 128 })`. No schema change required. Test agreement (`Policy.test.ts` line 671–676) ensures the depth calculation matches the limit check.

---

## Scaling Limits

### Decision Cache Application-Scope Risk

**Area:** Optional decision caching

**Issue:** `decisionCacheLayer()` returns a fresh cache per application lifetime. If used application-scoped (layer per-process), a scoped token and a full token for the same user would collide after the first verdict, even though they hold different permissions.

**Files:** `packages/core/src/DecisionCache.ts` (lines 42–52 discuss scope)

**Impact:** Under application-scoped cache, permission escalation is possible if tokens are not carefully managed.

**Current mitigation:** Documentation in the file makes the risk explicit. The cache key includes the full subject, so the risk is real only if subjects with identical IDs but different grants are used together.

**Recommendations:** Cache lifetime is the caller's choice. Document cache scope in your layer configuration. Request-scoped cache (one cache per request, discarded after) is the safest option for multi-tenant applications.

### Audit Trail Retention

**Area:** Decision audit package

**Issue:** `@qadi/audit` provides optional decision recording but has a configurable retention policy. Decisions older than the retention window are purged.

**Files:** `packages/audit/src/Retention.ts`, `packages/audit/src/AuditArchive.ts`

**Impact:** Long-term audit trails require configured retention. Retention defaults to preventing unbounded growth but may be insufficient for compliance requirements.

**Fix approach:** Configure retention policy at layer initialization. Audit trail data is optional and out-of-process by design — bring your own store if compliance requires it. The decision sink is the contract (ADR-QD-044).

---

## Dependencies at Risk

### Mutation Test Infrastructure Coupling

**Area:** Testing infrastructure

**Issue:** Mutation testing via `@stryker-mutator/core` and `@stryker-mutator/vitest-runner` is a merge gate step 15 of `pnpm check`. A Stryker upgrade that changes scoring or reporting format could cause gate failures.

**Files:** `stryker.config.mjs` and per-package config files, `package.json` (devDependencies)

**Impact:** A major Stryker version bump could require configuration changes to keep the threshold passing.

**Recommendations:** Pin Stryker to the minor version (currently `9.6.1`). Test major version upgrades in a branch before committing.

---

## Test Coverage Gaps

### Engine Version Floor (Resolved)

**Area:** Node.js runtime compatibility

**Issue:** `package.json` declares `"engines": {"node": ">=20.19.0"}`, derived from what dependencies require. CI now exercises both `20.19.0` and `26` as blocking legs of one matrixed `check` job.

**Files:** `package.json` `engines`, `.github/workflows/check.yml`'s `jobs.check.strategy.matrix.node-version`.

**Impact:** Breakage on node 20.19 would previously have gone unnoticed until a user ran on that version. Both declared-floor and latest-major runtimes are now exercised on every push and pull request — true of twenty-one of the merge gate's twenty-two steps. The remaining step (`apps/website`'s build, gate 22) is runtime-scoped: it builds the site on whichever leg satisfies Astro's own `engines.node`, which is above the workspace floor, and states the skip on a leg below it rather than running there silently (ADR-QD-059).

**Current mitigation:** The floor is exercised by the merge gate on every push and pull request, with no informational grace period — the `20.19.0` leg is a real, blocking gate alongside the `26` leg. The nine published packages, including the packed-artifact install gate (step 14), are exercised on both legs; the site's build runs on the legs its own Astro toolchain supports, per ADR-QD-059.

**Recommendations:** All nine `packages/*/package.json` files still declare the looser `"engines": {"node": ">=20"}` while the root declares `>=20.19.0`, so a published tarball still promises a range wider than CI exercises. This is a known, deliberate gap for this phase — see `01-RESEARCH.md` Open Question 1 — and those nine manifests are not changed here.

### Hydration Count Tracking

**Area:** React SSR validation

**Issue:** `packages/react/src/HydrationCounts.ts` tracks how many decisions were dehydrated, dropped, and seeded. This provides observability but no automatic validation — an application could drop decisions silently without noticing.

**Files:** `packages/react/src/HydrationCounts.ts`, `packages/react/test/HydrationCounts.test.ts`

**Impact:** Silent data loss if dropped counts are not monitored. A page that dehydrates 100 decisions but only hydrates 95 would not raise a warning.

**Recommendations:** Export dropped/seeded counts in your observability pipeline. Add a health check that warns when `droppedCount > 0`.

### Guard Registry Instrumentation Optional

**Area:** Decision instrumentation in React

**Issue:** `@qadi/react` only registers guards when instrumentation is enabled (`QadiProvider.instrument === true`). With it off, no `GateRegistry` is populated and no marker elements are rendered.

**Files:** `packages/react/src/QadiProvider.tsx`, `packages/react/src/GateRegistry.ts`

**Impact:** Guard registry is opt-in and invisible when disabled. Applications must explicitly enable it to use it. No guard can determine it has been instrumented from user code.

**Fix approach:** This is by design (AGENTS.md §13). Instrumentation off means the DOM is unchanged and no guard runs initialization code. Customers who want the registry must set `instrument: true`.

---

## Missing Critical Features

**None identified.** The roadmap's "Explicitly not planned" section documents out-of-scope items (GxP/21 CFR Part 11, policy storage UI, authentication, backward compatibility with predecessor JSON).

---

## Documentation Drift Risk

### Devtools Claims of Absence Require Gating

**Area:** Devtools specification

**Issue:** `spec/devtools-spec/` makes claims about what is built and what is not. Between revisions 0.1 and 0.6, seven false claims had to be corrected (CCR-QD-075). Examples:

- Screens marked "Partial" after they were built
- "Not built. Screens 3 to 6" six increments after they were shipped
- "Blocked on a design change to `@qadi/react`" — the change was ADR-QD-053

**Files:** `spec/devtools-spec/00-overview.md`, `scripts/check-devtools-claims.mjs` (merge gate 12)

**Impact:** Documentation that diverges from implementation is worse than no documentation. Users read "not built" and do not try a feature that exists.

**Current mitigation:** `scripts/check-devtools-claims.mjs` is merge gate 12. Every statement there that something is absent is registered in a "Claims of absence" table with the reason it still is.

**Recommendations:** When updating devtools feature status, update the claims table in the same commit. The gate enforces this.

### Definitions of Done Drift

**Area:** CI/merge gate specification

**Issue:** `spec/process/definitions-of-done.md` had drifted in both directions at once. Steps it listed were not numbered, and **eight** references elsewhere named a step by the wrong number (CCR-QD-048 inserted two steps in the middle). `pnpm check` commands appeared in the workflow but not in the table.

**Files:** `spec/process/definitions-of-done.md`, `scripts/check-dod-table.mjs` (merge gate 11), `.github/workflows/check.yml`

**Impact:** A definition of "done" that drifts cannot be trusted. Gate numbers become meaningless.

**Current mitigation:** `scripts/check-dod-table.mjs` is merge gate 11. The table must be the commands `pnpm check` runs, in order. Every gate reference names the command, not just the number. The script verifies alignment.

**Recommendations:** When adding a gate, edit both `pnpm check` (in `package.json`), the DoD table, and the gate script. Never reference a gate by number alone.

---

*Concerns audit: 2026-08-30*
