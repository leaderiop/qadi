---
phase: 36-carried-spec-debt-and-stale-records
plan: 09
subsystem: react
tags: [react, hydration, seed, subject, keepAlive, changeset, example]
requires:
  - phase: 36-03
    provides: SUBJ1..SUBJ3 and the SeedSlot seam
  - phase: 36-04
    provides: SD1..SD5, HL1, HL2 pins
provides:
  - the atom set's subject atom is keepAlive, so a provider's subject survives a quiet macrotask with no gate mounted
  - a hydrated seed is held by its question (grant atom plus WeakMap) and given to one registry through SeedSlot.hold
  - DENY_WITHHELD spreads ALLOW_WITHHELD
  - the @qadi/react changeset for the subject and seed fixes
  - the divergent exhibit pinned to the seed covering the client's first check (ADR-QD-039)
affects: [36-12, 36-14]
tech-stack:
  added: []
  patterns: ["the seed is held by the question, not by a registry; a registry reads it only if it was given a grant", "a re-check after an invalidation never falls back to the seed"]
key-files:
  created:
    - .changeset/react-subject-and-seed.md
  modified:
    - packages/react/src/QadiAtoms.ts
    - packages/react/src/HydrationEngine.ts
    - packages/react/test/HydrationEngine.test.ts
    - examples/nextjs-newsroom/e2e/ssr.spec.ts
    - examples/nextjs-newsroom/src/client/Divergent.tsx
key-decisions:
  - "D-20: the seed covers the client's first check (any Initial result, waiting or not); a re-check after an invalidation (Success(previous, waiting)) never falls back; the seed is spent once this client answers"
requirements-completed: []
status: complete
commits: 5
plan_head_before: dc7a9cf10e232da0dda540d3c281b9136c3e4a95
plan_head_after: 5672f37c559e87614c7ab6c6a0fcc58833ba3885
actuals:
  tokens: 14000
  tasks: 3
  commits: 5
duration: n/a (two executors, one decision checkpoint)
completed: 2026-11-13
---

# Phase 36 Plan 09: Subject keepAlive and the hydrated seed Summary

The react provider's subject now survives with no gate mounted, a hydrated seed is held by its question and read only by the registry it was given to, and the whole react project is green (498/498); the divergent exhibit now pins the seed covering the first check.

## Commits

| Commit | What |
| ------ | ---- |
| 94f35dce | Task 1: subject atom is `keepAlive`; SUBJ1..SUBJ3 green, SD1..SD4, HL1, HL2 still red as the plan expects |
| ce4dadbb | Task 2: seed held by its question (keepAlive grant atom + `WeakMap<SeedGrant, SeededDecision>`), `hydrate` gives one registry a fresh grant, `seededIn(registry)` reads with `getNodes().get` and `valueOption()`; `AnnounceState.observedSeed` removed; whole react project green |
| 2b12ee8a | Task 3: `DENY_WITHHELD` spreads `ALLOW_WITHHELD`; `.changeset/react-subject-and-seed.md` |
| 2b43b557 | Orchestrator commit (not a plan task): D-20 recorded in 36-CONTEXT.md |
| 5672f37c | Example correction: the divergent exhibit's `seen-sequence` pin and narrative |

The subject commit lands before the seed commit and they are never combined (SD5 is the ordering pin).

## Deviations from Plan

**1. [Plan verify defect] SD5 after Task 1.** The plan expected SD5 red after the subject commit; it is green there. The red set after Task 1 was SD1..SD4, HL1, HL2, which is exactly what failed. SD5 still proves the ordering: it fails under the seed fix alone (`36-09-sd5-seed-alone.log` in the session scratchpad).

**2. [Plan verify defect] Task 2 static regex.** It required `getNodes().get(grantAtom)` while forbidding `/get\(grantAtom\)/`, and the first always matches the second. The intent was checked instead: no `registry.get(grantAtom)` and no `get.once(grantAtom)` in the source.

**3. [Rule 1 - Bug in a pinned exhibit] e2e pin conflict, resolved by D-20.** With the seed fix, `/edge/divergent`'s `seen-sequence` pin (`Success,Initial+waiting,Success`) failed (29 passed, 1 failed). The pending middle state was the registry dropping the seed, the defect this phase fixes. The user resolved it as D-20 (ADR-QD-039): the seed covers the client's first check. The seed code stays as committed; the example is corrected in 5672f37c.
   - The recorder in `Divergent.tsx` de-duplicates consecutive equal result tags, and the seed and this client's denial are both `Success`, so the literal pin `Success,Success` would have read `Success`. The recorder now keeps the decided tag beside `Success`, and the pin is `Success(SeededAllow),Success(Deny)`. The `SeededAllow` tag is what the seed's decision actually carries (seen in the first e2e run). The final `state-standing` = `Denied` assertion is unchanged.
   - The Divergent header, the e2e comments and the page text are rewritten to the two-state story. The claim that BEH-QD-151 forbids reading a seed during the first check is removed. `spec/` is untouched; BEH-QD-151's clarification and the ADR-QD-014 amendment are 36-12's.

**4. [Convention] ADR-QD-149 cited as plain text.** New doc comments cite it without a link because the ADR file lands in 36-12.

**5. [Note] Example check script.** `pnpm --filter @qadi/example-nextjs check` includes `playwright install --with-deps chromium`; Chromium is cached, so it downloaded nothing.

## Verification

- `pnpm build && pnpm --filter @qadi/example-nextjs check`: typecheck, vitest, build, e2e 30 passed (`36-09-example-check.log`).
- `pnpm vitest run --project react`: 498/498. `--project devtools`: 1355/1355.
- `pnpm typecheck`, `pnpm test:tstyche`, `pnpm lint` exit 0 (lint's warnings are pre-existing, in files this plan did not touch; house-style 493 files clean).
- The full merge gate (`pnpm check:pr`) was not run in this plan; it belongs to 36-14's closing checks.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Commits 94f35dce, ce4dadbb, 2b12ee8a, 5672f37c are ancestors of HEAD; `.changeset/react-subject-and-seed.md` exists. Requirements DEBT-04, WX-04, WX-06 were not marked complete: `requirements.ready-ids` lists none of them ready.
