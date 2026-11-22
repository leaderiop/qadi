---
phase: "61"
slug: "decisioncache-is-asked-only-the-question"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-19"
---

# Phase 61 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Audited on HEAD `1ab33b89`, `phase_base` `7d2d281d` (20 commits; the last, `1ab33b89`, touches `61-VALIDATION.md` only, so the code is `d15b51b8`'s). Every row below was checked against the tree, not against a SUMMARY's claim.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| A caller → `DecisionCacheShape.getOrCompute` | Before this phase a caller handed the cache a key and, separately, the computation stored under it. ADR-QD-031 makes the key the security boundary. Now the caller hands over the question and how to walk it, never a computation | `Question`, `{ concurrency? }` |
| A host-written `DecisionCacheShape` → core | Out of the guarantee by the owner's choice (D-02): such a cache must produce its own trace for the question it is handed | `CacheLookup` |
| `@qadi/core` packed `exports` map → consumers | A closed list holding `.` only (ADR-QD-099). `walk` and `SharedComputation` stay out of the barrel | importable names |
| Phase evidence → gate | The D-06 comparer and the phase scan decide WX-05 and the order of work from committed files | mutation scores, commit order |
| Repo → npm | Release pipeline (nothing released this phase; one changeset written, never consumed) | package artifacts |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-61-01 | Tampering | `61-mutation-base.json` and `61-mutation.mjs` (re-baseline, narrowed `DELETED`, edited Stryker config) | medium | mitigate | `shasum -a 256 61-mutation.mjs` = `bd83a56e…322f`, the pin in 61-01-PLAN (`:26`, `:394`). `git log phase_base..HEAD` for both files is the single `f1e690ca` `chore(61-01)`, the first commit after `phase_base`, holding those two files alone. 0 `stryker*` changes since `phase_base` | CLOSED |
| T-61-02 | Repudiation | reserved numbers (an id taken outside the reservation, `next-id.mjs` run) | low | mitigate | `.git/qadi-reserved-ids.json` reads `{CCR:452, ADR:174, BEH:645, INV:368}`. Each reserved id is one heading or row: `174-*.md:1`, `spec/README.md:389`, `21-decision-cache.md:388,408,424,448,468`, `invariants.md:4273,4285`. `git grep` at `7d2d281d` finds none of them, so all were free at the base. No id past the reservation exists in `spec/`, `packages/`, `apps/` or `scripts/`. No `-QD-NEXT` placeholder outside the house-style rule that refuses it (`check-house-style.mjs:2092-2101`, unchanged) | CLOSED |
| T-61-SC | Tampering | npm/pip/cargo installs | high | mitigate | `git diff --name-only phase_base HEAD` matches no `package.json`, `CHANGELOG*`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc` or Stryker config. The src diff adds imports from `./Walk.ts` and `./Question.ts` only, and the tests import from `../src`, `effect/Effect` (type) and `tstyche`, all already present | CLOSED |
| T-61-03 | Tampering / Elevation | `getOrCompute` accepting a computation (an allow trace stored under another question's key) | high | mitigate | Signature `DecisionCache.ts:90-93` is `(question: Question, options?: Pick<EvaluateOptions, "concurrency">)`. The adapter `:284-288` is `shared.run(key, walk(key, options?.concurrency))`: the value walked is the value stored under, and `settle` (`:246-248`) writes `entries[key]` from that claim's exit only. The one src call site is `Lifecycle.ts:121` (`getOrCompute(question, options)`, per `git grep`). `SharedComputation.run`, the only method that accepts a computation, is package-private: `index.ts` names neither `SharedComputation.ts` nor `Walk.ts` (`:7` exports `DecisionCache.ts`, which imports `walk` but does not re-export it), and the `exports` map is `.` only. Type pins: `DecisionCache.tst.ts:43-47` refuse an `Effect`, a thunk and a third argument, read through `Params<F>` (`:28-29`) with positive controls (`:36-41`); `:24-25` refuses a `walk` export from the barrel. Order: RED `7a67c3d5` precedes the first src commit `1e0900da`, and `git diff --name-only 7d2d281d 7a67c3d5 -- packages/*/src` is empty; the `.tst.ts` has not been edited since. 61-03-SUMMARY ("Negatives can fail") records a loose alias failing all three negatives and an exported `walk` failing the directive (TS2578). tstyche was not re-run here | CLOSED |
| T-61-04 | Repudiation | the I5 race test passing without racing | medium | mitigate | `DecisionCache.test.ts:1250` sweeps `gap <= 48`. `:1292` records each joiner's outcome, and `:1301-1304` asserts that every budget 3..6 lands on both `coalesced` and `hit`. 61-02-SUMMARY (`:57-65`) shows the old `gap <= 12` sweep failing `oneSided` at every budget. Re-run green (below) | CLOSED |
| T-61-05 | Tampering | a host-written cache returning a foreign trace | medium | accept | AR-61-01 below. This file is the log entry. The limit is stated in `DecisionCache.ts:85-88`, `Question.ts:4-7`, BEH-QD-645 (`21-decision-cache.md:468-487`), ADR-QD-174 (`:60-61`, `:75-79`), INV-QD-367 (`invariants.md:4279`), the changeset (`:7`) and `upgrading.md:1071`. `walk` stays private (`index.ts`, `exports` map `.`, `DecisionCache.tst.ts:24-25`), so wrapping `decisionCacheLayer()` is the one route that walks | CLOSED (accepted) |
| T-61-06 | Denial of service | a per-lookup options object on the hot path | low | mitigate | `Lifecycle.ts:121` passes `decideQuestion`'s own `options`. `grep '{ *concurrency *:'` over `DecisionCache.ts` and `Lifecycle.ts` finds nothing. Each lookup still builds one `walk(...)` (`DecisionCache.ts:285`, `Lifecycle.ts:122`), just as `answer` did before | CLOSED |
| T-61-07 | Tampering | after and static JSON (stale report, re-baseline, run of another tree) | medium | mitigate | One commit, `4661c111` `chore(61-04)`, touches `61-mutation-after.json` and `61-mutation-static.json`. It follows `feat(61-03)!` and no `packages/` change comes after it. `cmp` shows the two reports differ. 0 Stryker config changes. The compare result is the SUMMARYs' (61-04-SUMMARY:66-74,108; 61-07-SUMMARY:53-57): DecisionCache 0.9762 to 0.9767, Lifecycle 1 to 1, SharedComputation 0.9859 to 0.9859, 0 new survivors, `WX-05 holds (D-06)`. Not re-run here | CLOSED |
| T-61-08 | Repudiation | changeset and `upgrading.md` overstating the guarantee | low | mitigate | Changeset `:5` scopes the claim to `decisionCacheLayer()` and to callers. `:7` says a hand-written `DecisionCacheShape` must produce its own trace. `upgrading.md:1067` says the same, `:1069` states the joiner rule, and `:1071` covers the hand-written case. The After fence is ` ```typescript ` (`:1085-1103`), which `check-website-doc-examples.mjs` (`DOCS` = `apps/website/src/content/docs`, `:30`) compiles. The Before fence is ` ```ts ` (`:1075-1081`), so it is correctly not compiled | CLOSED |
| T-61-09 | Repudiation | ADR-QD-174, BEH-QD-645 and INV-QD-367 overstating the guarantee | medium | mitigate | `174-*.md:75-79` ("The guarantee is about callers … outside the guarantee by the owner's choice"). `21-decision-cache.md:484-487` ("guarantees what a caller can hand the cache, not what an implementation returns"). `invariants.md:4279` ("A host-written implementation is outside this invariant"). The ADR-QD-031 amendment (`031-*.md:77`) ends with the host rule. Every test title named in BEH-QD-641..645 and INV-QD-367..368 exists: four in `DecisionCache.test.ts` (`:484`, `:508`, `:548`, `:576`), plus `Lifecycle.test.ts:19`, `DecisionSink.test.ts` ("no cache wired is absent…") and `Evaluate.test.ts` ("concurrency performs MORE lookups…") | CLOSED |
| T-61-10 | Tampering | id register and change history | low | mitigate | Only reserved ids are used (T-61-02). The lines removed from `spec/` are revision and change-history rows, two `index.yaml` status lines, five index/traceability table rows each replaced one for one, and two requirement lines (BEH-QD-166, BEH-QD-190). Each of those two is replaced one for one with "walk" under a dated `Amended 2026-11-19 (ARCH-108, CCR-QD-452)` block that says the rule is unchanged | CLOSED |
| T-61-11 | Tampering | `61-scan.mjs` weakened to pass | medium | mitigate | `shasum -a 256 61-scan.mjs` = `594baf91…eec9`, the pin in 61-07-PLAN (`:21`, `:441`). It was committed once (`35c8fad6` `chore(61-07)`) and never edited. Its interface check pins the adapter by regex (`61-07-PLAN:346`). No `fix(61)` commit exists. 61-07-SUMMARY:47 records `phase scan clean`. Not re-run here | CLOSED |
| T-61-12 | Repudiation | release state (a version, tag or push slipping in) | medium | mitigate | `git diff --name-status phase_base HEAD -- .changeset` is the single `A .changeset/core-decision-cache-asked-the-question.md` (`"@qadi/core": minor`, `**Breaking.**`). 0 CHANGELOG or manifest changes, and all nine packages read `0.12.0`. `git tag --contains 7d2d281d` is empty, and no tag points at HEAD. `git branch -r --contains` is empty for HEAD and `phase_base`. `FETCH_HEAD` was last written 2026-11-17, before `phase_base`. No commit message names `changeset version`, publish, push or tag. Not checked over the network | CLOSED |

*Status: CLOSED = the declared mitigation is present on HEAD with the evidence cited. OPEN = absent. 0 threats are OPEN.*

### The six orchestrator checks

These are not separate register rows. Each one is part of T-61-03's mitigation or the boundary that T-61-05 accepts, and each was read from the code.

| # | Check | Evidence | Holds |
|---|-------|----------|-------|
| C1 | No caller can pair a key with an unrelated computation | `DecisionCache.ts:90-93` (no computation parameter), `:284-288` (the layer walks the `key` it stores under). The only computation-taking API is `SharedComputation.run`, which is not exported. The only src caller is `Lifecycle.ts:121`. Types are pinned at `DecisionCache.tst.ts:43-47`. At runtime the layer reads only `options?.concurrency` and never runs a value a caller supplied | yes |
| C2 | `concurrency` never joins the key and cannot split or poison an entry | `Question` (`Question.ts:164-170`) has no `concurrency`. `questionOf` (`:180-190`) copies only `resource`, `action` and `maxDepth`. The table is `HashMap<Question, Trace>` (`DecisionCache.ts:225`), and `options` reaches only `walk` (`:285`). `settle` stores successes only (`:247-248`). INV-QD-020 (`invariants.md:680`) makes the decision, the trace and the surfaced error identical under either `concurrency`. Pinned by `DecisionCache.test.ts:508` (one entry in both orders, equal traces, 1 miss and 1 hit), `:548` and `:576` | yes |
| C3 | A failure is not cached, and only that flight's waiters share it | `DecisionCache.ts:246-248` (`entries` written only on `Success`). `SharedComputation.ts:383-394`: `settle`, then `forget` (the claim leaves `inFlight`), then `Deferred.done(entry.claim, exit)`, which reaches only fibers awaiting that claim. Pinned by `DecisionCache.test.ts:668` (resolver called twice, `size` 0) and `:697` (five waiters, one resolver call, all fail) | yes |
| C4 | One waiter's interruption does not cancel the others | `SharedComputation.ts:239-251` (an interrupted waiter decrements `waiters`, and only the last leaver interrupts the walk), `:383-397` (walk on `Effect.forkDetach`). `restore` wraps only `awaitShared` (`:331`, `:404`). `SharedComputation.ts` is byte-identical to `phase_base`. Pinned by `DecisionCache.test.ts:742` and `:804`, both driven through `evaluate` | yes |
| C5 | Admission runs inside the walk on a miss, and a hit returns the trace of the same `Question` | `Walk.ts:871-881`: `walk` is `Effect.suspend(() => admit(question, "asked") …)` (`:878`), and the file is unchanged. A hit is `hooks.cached(key)` = `HashMap.get(entries, key)` (`SharedComputation.ts:303-304`, `DecisionCache.ts:245`). A join is by the same structural key (`SharedComputation.ts:305-311`). The key holds the whole `AuthSubject` and `maxDepth` (`Question.ts:164-170`, `:189`). Pinned by `DecisionCache.test.ts:124` (subject), `:187` (`maxDepth`) and `:279` (two tokens for one user) | yes |
| C6 | The guarantee covers callers, not host-written caches (D-02), and nothing over-promises | See T-61-08 and T-61-09. Each statement of the guarantee is scoped to callers or to `decisionCacheLayer`. The one loose sentence is UF-3 | yes |

---

## Accepted Risks Log

| ID | Threat | Risk | Why accepted | Owner / date |
|----|--------|------|--------------|--------------|
| AR-61-01 | T-61-05 | A host that writes its own `DecisionCacheShape` (`Layer.succeed(DecisionCache, …)` or a wrapper that rewrites the question) can return a trace for a different question, and break ADR-QD-031's boundary. Core cannot stop it | The owner chose not to seal the service at the CASK-01 checkpoint (D-02, ADR-QD-174 "Alternatives considered"). The limit is documented in every place a host would read (see T-61-05). `walk` is private, so the documented route is to wrap `decisionCacheLayer()`, which keeps the guarantee as long as the wrapper passes the question through unchanged. Sealing is deferred (61-CONTEXT `<deferred>`) | owner, 2026-11-19 |

---

## Unregistered Flags and Observations

No SUMMARY carries a `## Threat Flags` section, so there was nothing to map. The audit found four things with no register row. None is attack surface this phase introduced, none reaches `block_on: high`, and none counts toward `threats_open`.

| ID | Severity | Observation | Evidence | Suggested follow-up |
|----|----------|-------------|----------|---------------------|
| UF-1 | info | `getOrCompute`'s doc cites a test titled "one caller interrupted, the other still gets a result". No test has that title. The test that pins the rule is "a coalesced waiter's interruption does not interrupt the shared compute — the other waiter still gets a result". This predates the phase (base `DecisionCache.ts:70`), and the phase reworded the lines around it | `DecisionCache.ts:82-83`; `DecisionCache.test.ts:804-805` | Name the real title |
| UF-2 | info | INV-QD-367's refusal holds at compile time only (TS2559 weak type, TS2554 arity). A plain-JS caller, or a TS caller passing a non-literal object with extra keys, gets past it. This is harmless: `decisionCacheLayer` reads only `options?.concurrency` and never runs a value a caller supplied, so the runtime property is INV-QD-368's. The `.tst.ts` header already names the weak-type caveat | `DecisionCache.ts:285`; `DecisionCache.tst.ts:1-14` | none required |
| UF-3 | info | The interface doc opens with "The cache walks the question it is given, so a trace it stores answers its own key". It sits on `DecisionCacheShape`, which a host implementer reads, so it can read as a property of every implementation. The same comment qualifies it at `:85-88` | `DecisionCache.ts:43-45` | Optionally say "`decisionCacheLayer` walks…" |
| UF-4 | info | A sequential joiner that coalesces onto an `unbounded` claimant has its resolvers asked speculatively: more lookups than it asked for, against the host's own stores. The answer cannot differ (INV-QD-020). This behaviour already existed, and the phase now writes it down (D-12) | BEH-QD-643 (`21-decision-cache.md:424-446`), `upgrading.md:1069`, `DecisionCache.test.ts:576` | none required |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-19 | 13 | 13 (12 mitigated, 1 accepted) | 0 | gsd-security-auditor (L1 grep-depth, independent re-check on HEAD `1ab33b89`) |

Re-run during the audit (read-only): `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts packages/core/test/Lifecycle.test.ts` (2 files, 44 tests passed), the SHA-256 of `61-mutation.mjs` and `61-scan.mjs`, and the git order, id and release checks. Not run: tstyche, Stryker, `pnpm check:pr`, `61-scan.mjs`, `61-mutation.mjs compare` and `check-website-doc-examples.mjs`. Their results here are the SUMMARYs' (61-03, 61-04, 61-07).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-19 — SECURED
