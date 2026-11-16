---
phase: "51"
slug: "policy-tag-arity-stated-once"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-16"
---

# Phase 51 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Policy/trace tree → fold | `childrenOf`, `foldPolicyCases` and `foldTrace` decide which children of a node are walked, from `PolicyArity.ts`'s record | Which children of a policy or an `AccessDenied.trace` a host walks |
| Package surface | `PolicyArity.ts` stays package-private (out of `index.ts`) | No export; the barrel and `spec/overview.md` unchanged |
| Evidence → decision | The mutation comparison and the base experiment decide whether the change holds | `51-mutation-base.json`, `51-mutation-after.json`, `51-BASE-EXPERIMENT.md`, `base-experiment/` |
| Branch → release | Nothing in this phase versions, tags, pushes or publishes | One `@qadi/core` patch changeset only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-51-01 | Repudiation | 51-mutation-base.json: measured on an edited tree, from a stale report, or from a different file set | medium | mitigate | the precondition requires a clean tree for packages, spec, scripts and the Stryker config; `tools/mutation.mjs` refuses a stale report, a report holding other files, a `source` differing from disk and a config reporting elsewhere; the second verify requires the JSON alone as the first plan commit with `phase_base` its parent | closed (d7324ee4 alone, parent 8d87d837; mutation.mjs refusals) |
| T-51-02 | Tampering | the survivor identities: recorded loosely, so a new survivor at the close passes as "the same set" | medium | mitigate | each survivor is stored as mutator, status, replacement, mutated text and line text, sorted; `tools/mutation.mjs compare` (51-05) refuses any after-survivor not in the base list | closed (survivor identities; compare: +0 new, −1 gone) |
| T-51-03 | Repudiation | the reserved ids: one already used at the base | low | mitigate | Task 1's id check runs against `phase_base` itself, whole-id matched, across every tracked tree the spec gates read | closed (git grep at base: 0 hits per reserved id) |
| T-51-04 | Tampering | TraceShape.test.ts reading the record (or a list the change adds), so a wrong record passes its own check | medium | mitigate | `EXPECTED` is hand-written; Task 1's second verify refuses any import beyond `@effect/vitest`, `Decision.ts`, `Policy.ts` and any mention of `PolicyArity`/`POLICY_ARITY`; 51-05's scan repeats it and checks the file has one commit | closed (TraceShape.test.ts imports 3 modules, hand-written EXPECTED, one commit) |
| T-51-05 | Tampering | moves.mjs leaving an edited `Decision.ts` or `Policy.ts` behind, later committed as the base | high | mitigate | the harness refuses a dirty src before editing, restores both files in `finally` and on SIGINT, exits 3 if src is not clean afterwards; Task 2's first verify requires `packages` clean; only the three `.planning` files are staged | closed (moves.mjs dirty-refusal, finally/SIGINT restore, exit 3) |
| T-51-06 | Tampering | a wrong arity in the record drops or misattributes trace children (a wrapper's extra children folded in, a leaf's foreign children reaching a fold) | high | mitigate | TraceShape.test.ts (hand-written, 51-02) fails on every one of the 32 moves; PolicyArity.test.ts checks `childrenOf`, `foldPolicyCases` and `foldTrace` against the record per tag; `childrenOf`'s `satisfies` and the tstyche tie make a mismatch a compile error; `proofs.mjs` proves it | closed (TraceShape caught 32/32 on base; PolicyArity.test.ts; proofs TS2322) |
| T-51-07 | Elevation of Privilege | the derived `LeafPolicy` widening (a composite treated as a leaf) or narrowing (a leaf dropped, so its leaf-needs row fails open) | high | mitigate | the tstyche identity check against the base's `Exclude`; `LEAF_NEEDS` and `leafCases` are keyed by `LeafPolicy["_tag"]` and fail to compile when the set moves (`proofs.mjs` rows `HasRole Leaf -> Wrapper/Many`) | closed (tstyche LeafPolicy equality; proofs TS2322/TS2741) |
| T-51-08 | Information Disclosure | the record or its types leaking through the barrel as unplanned public API | low | mitigate | `PolicyArity.ts` is outside `index.ts`; the barrel pin in PolicyArity.test.ts; `check-api-surface.mjs` reports the base's count; Task 1's second verify refuses `PolicyArity` in `index.ts` | closed (index.ts unchanged; barrel pin; api-surface 932) |
| T-51-09 | Tampering | `POLICY_ARITY[tag]` with a tag the union lacks (a hand-built trace) reads an inherited member | low | accept | traces from `evaluate` carry only union tags and a decoded record is schema-checked; a foreign tag still throws the same `absurd` error at `traceStep`'s `Match.exhaustive` one call later, as on the base (RESEARCH Q5) | closed (accepted; foreign tags throw Match.exhaustive at traceStep) |
| T-51-10 | Tampering | the `{ readonly 0?: never }` refusal "fixed" by widening the Many type, or a failing negative deleted, so the tie silently stops checking | medium | mitigate | the prohibitions; the tstyche negative `is not assignable to type 'never'` fails as an unused directive if the type is widened; `proofs.mjs`'s `Not Wrapper -> Many` row; 51-05's scan checks `readonly 0?: never` is still in `PolicyArity.ts` | closed (PolicyArity.ts `0?: never`; checked @ts-expect-error) |
| T-51-11 | Repudiation | records citing an id outside the reservation, a placeholder, or a claim the evidence does not hold (a wrong experiment count) | medium | mitigate | the ADR's numbers are copied from `51-BASE-EXPERIMENT.md`, `51-03-SUMMARY.md` and `51-01-SUMMARY.md`; `spec:verify:strict` and house style's `[no-numbering-placeholder]` run in `check:pr`; 51-05's scan refuses a new id outside the reservation and a heading present other than once | closed (ADR numbers match moves.tsv, proofs, base JSON; spec:verify:strict) |
| T-51-12 | Tampering | the stale `LeafPolicy` fence left showing the hand-written list, so a reader edits the wrong place | low | mitigate | Task 2 replaces it and its verify refuses `export type LeafPolicy = Exclude<` in `25-inspection.md` | closed (25-inspection.md:185 Extract form; 0 Exclude) |
| T-51-13 | Elevation of Privilege | a changeset at the wrong level (a minor or a Breaking entry for an unchanged surface) changing what a release publishes | medium | mitigate | Task 3's verify requires the front matter to be exactly `"@qadi/core": patch` and no Breaking text; no export changes (gate 13, the barrel pin) | closed (changeset `"@qadi/core": patch` only) |
| T-51-14 | Repudiation | the mutation comparison: a fall hidden by re-measuring the base or by comparing counts instead of identities | medium | mitigate | Task 1's second verify requires `51-mutation-base.json` to have exactly its `chore(51-01)` commit; `compare` matches survivor identities and applies the deleted-code rule only to `Decision.ts` | closed (base/after JSON one commit each; compare) |
| T-51-15 | Tampering | a close check made to pass by editing `tools/`, a gate script, the Stryker config or a budget | medium | mitigate | the prohibitions; Task 2's verify refuses any commit since `phase_base` touching `tools/`, `scripts/` or `stryker.config.mjs`; `scan.mjs`'s scope check refuses any file outside the phase's list | closed (no tools/scripts/stryker.config diff; scan scope clean) |
| T-51-16 | Elevation of Privilege | a release, tag or push from a phase that must not release | high | mitigate | Task 3's release check (tags, CHANGELOG, package.json, base changesets, remote branches, staging); `pnpm changeset version` is never run | closed (no tag/remote/CHANGELOG/package.json change; nothing staged) |
| T-51-SC | Tampering | npm/pip/cargo installs | high | mitigate | no install task in this phase (RESEARCH Package Legitimacy Audit: no package added; Stryker, vitest and tstyche already installed); 51-05's scope check refuses any `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since `phase_base` | closed (no package.json/lockfile/workspace change) |

---

## Accepted Risks Log

| Threat ID | Risk | Rationale | Accepted |
|-----------|------|-----------|----------|
| T-51-09 | `POLICY_ARITY[tag]` with a tag the `Policy` union lacks (a hand-built trace) reads an inherited member | Traces from `evaluate` carry only union tags and a decoded record is schema-checked; a foreign tag (`Bogus`, `toString`, `constructor`, `__proto__`, `hasOwnProperty` were probed) still throws `effect/match/Match/exhaustive: absurd` at `traceStep` one call later, as on the base (51-03-PLAN.md:255, RESEARCH Q5) | 2026-11-16 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-16 | 17 | 17 | 0 | gsd-security-auditor (ASVS L1; ran `tools/scan.mjs`, `tools/proofs.mjs`, `tools/mutation.mjs compare`, the core suites, tstyche, api-surface, house style, traceability --strict, circular) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-16
