---
phase: 13-lost-wave-gaps
plan: 02
subsystem: devtools-simulation
tags: [devtools, simulation, what-if, signatures, remedies, lost-wave-port]

phase_base: 0925c2f
requires: ["13-01"]
provides:
  - "`EditKind` with `DropSignature` and `AddSignature` (full closed union)"
  - "`singleEdits` emits one `DropSignature` row per held signature (`signatureDrops` in `Edits.ts`)"
  - "`remedyFor` as a module-scope `Match.type<Requirement>()` matcher with `Signature` and `Custom` arms"
  - "`Remedies.ts` reads resource ids through `@qadi/core`'s `resourceIdOf` (lost ARCH-57 O5)"
  - "BDD scenario \"Dropping the signature the answer turned on\""
affects: [13-03, 13-04, 13-11, 13-12]

actuals:
  tokens: 60000
  tasks: 4
  commits: 5

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - packages/devtools/src/model/SimulationEdit.ts
    - packages/devtools/src/model/Edits.ts
    - packages/devtools/src/model/Remedies.ts
    - packages/devtools/test/model/Edits.test.ts
    - packages/devtools/test/model/WhatIf.test.ts
    - packages/devtools/test/model/SimulationSession.test.ts
    - packages/devtools/test/model/Remedies.test.ts
    - features/features/devtools-simulator/devtools-simulator.feature
    - features/features/devtools-simulator/devtools-simulator.steps.test.ts

requirements-completed: [GAP-03, GAP-04]
---

# 13-02 — The sweep drops signatures; hasSignature/hasCustom get a remedy or a named skip

`phase_base: 0925c2f` (`13-base.txt`, written by 13-01).

## What was done

- **Task 1-RED (a762844).** Ported from `950977f`'s test hunks: `Edits.test.ts` (`full` gains two signatures; the label
  and kind lists gain the two `DropSignature` rows; four new tests), `WhatIf.test.ts` (new describe "a signature fixture
  is a grant a sweep can drop or supply", first `it.effect` only), `SimulationSession.test.ts` (describe "the sweep the
  session states", one test; `hasSignature` import), BDD feature + steps (`approval: hasSignature("approved")`, a Given
  seeding a signature). Not ported: the lost hunk that deletes the `sameEdge`/`sameEvent` test (they move in 13-03/13-04)
  and the session's "the form's fields, through the session" describe (13-04). RED, each for the stated reason:
  - `Edits.test.ts > applying an edit > drops one signature, leaving the others`: `Error: no edit without signature approved on doc-1`
  - `SimulationSession.test.ts > the sweep the session states > offers to drop a signature fixture, and counts that row`: `AssertionError: expected [] to deeply equal [ 'DropSignature' ]`
  - `WhatIf.test.ts > … > flips the verdict when the signature the answer turned on is dropped`: `Error: no row without signature approved on doc-1`
  - BDD `Dropping the signature the answer turned on`: `AssertionError: no row without signature approved on doc-1`
  - `git diff --quiet -- packages/devtools/src`: clean.
- **Task 1 (4c1e9ea).** `EditKind` written out in full; `signatureDrops` beside the six drop functions, called last from
  `singleEdits`; removal by `sameSignature` (`SimulationForm.ts`); `signatureLabel` copied from the lost
  `SimulationFields.ts`. No exhaustive `Match` over `EditKind` exists elsewhere in `packages/devtools/src` (grep), so no
  other arm was needed.
- **Task 2-RED (b57c325).** `Remedies.test.ts` hunk applied verbatim (two silence tests inverted, four new), plus the
  second `WhatIf` `it.effect`. RED:
  - `offers the signature the policy names, built from its node`: `expected [] to deeply equal [ 'with signature approved on doc-1' ]`
  - `names a custom predicate it cannot remedy, rather than staying silent`: `expected [] to deeply equal [ { …(2) } ]`
  - `answers a denial with the signature that would allow it`: `Error: no row with signature approved on doc-1`
  - `Remedies.ts` untouched.
- **Task 2 (96854d7).** `Requirement` written out with `Signature { meaning, signerRole, scope }` and `Custom { name }`;
  `requirementCases`' `HasCustom`/`HasSignature` build them; `remedyFor` is a module-scope
  `Match.type<Requirement>().pipe(Match.tagsExhaustive({…}))` returning `(input) => Built | undefined`, called as
  `remedyFor(requirement)(input)`. The seven pre-existing arms keep their logic and labels exactly (the `?.includes` /
  `?.some` presence tests, the per-arm `resourceIdOf`). Private `resourceIdOf` and the `Resource` type import removed.
- **Mutation follow-up (0a047f8).** The first scoped run left 3 survivors in `signatureLabel` (each of `signedAt` /
  `algorithm` alone switching to chip text was untested); one test added.

### Final label function (`Edits.ts`)

```ts
const signatureLabel = (signature: SignatureInput, subjectId: string): string => {
  if (signature.signedAt !== undefined || signature.algorithm !== undefined || signature.keyId !== undefined) {
    const exact = signatureCodec.encode(signature, subjectId);
    if (exact._tag === "Ok") return `without signature ${exact.value}`;
  }
  return [
    `without signature ${signature.meaning}`,
    signature.resourceId === undefined ? "" : ` on ${signature.resourceId}`,
    signature.signerRole === undefined ? "" : ` as ${signature.signerRole}`,
    signature.subjectId === subjectId ? "" : ` by ${signature.subjectId}`,
  ].join("");
};
```

### Exact `EditKind`

```ts
export type EditKind =
  | "DropRole" | "DropPermission" | "DropSubjectAttribute" | "DropFixtureAttribute" | "DropRelationship"
  | "DropEvent" | "DropSignature"
  | "GrantRole" | "GrantPermission" | "SetSubjectAttribute" | "SetResourceAttribute" | "AddRelationship"
  | "AddEvent" | "AddSignature" | "SetAction"
  | "Pair";
```
(In the file: one member per line, in this order, under the existing three section comments.)

### O5: ported

Core's `resourceIdOf` (`packages/core/src/Resource.ts:31`) after Phase 11: unchanged contract (string id → branded
`ResourceId`, anything else → `undefined`); only its doc comment changed since `950977f^`. Every Remedies test passes
unedited apart from the two planned inversions.

### For 13-03 to fold

Written directly here and meant to be folded by the field table: `signatureDrops` and `signatureLabel` in `Edits.ts`
(lost: the `signatures` row's `drop`/label in `SimulationFields.ts`); in `Remedies.ts`, the `Role`, `Permission`,
`SubjectAttribute`, `Relationship`, `Acted` and `Signature` arms' held-field reads and appends (`input.subject.roles`,
`.permissions`, `input.relationships`, `.history`, `.signatures`, and the `[...(x ?? []), element]` applies) — the lost
code uses `fieldOps(key).holds` / `.elements` and `grant(key, element, label)`. The `Signature` arm's "already met"
predicate must survive the fold as-is (see deviation 2).

## Decisions applied

No `checkpoint:decision` in this plan. D-01 (test first) and D-02 (lost plan's recommended options: D-48-b option C for
labels, D-48-c option A for `AddSignature` + named `hasCustom` skip) applied. `_DECISIONS.md` rows (13-04 `A`,
13-12 T3 `keep-wave5`) are not this plan's.

## Deviations

1. **[Gate baseline re-measured] Task 2's `grep -c '() => \[\]' Remedies.ts -lt 2`.** The plan's baseline counted only
   `HasCustom`/`HasSignature`; measured with the verify's own invocation it is **4** at both `1721a42` and `0925c2f`
   (`HasNotActed: () => []` and `Not: () => []` too — both are the anti-remedy rule and must stay `[]`). After: **2**,
   exactly those two. The intended check, `grep -cE '(HasCustom|HasSignature): \(\) => \[\]'`, is 0. The plan says to
   re-measure baselines and record differences; the gate as written can only pass by rewriting two correct arms, so
   it was not forced. Every other clause of that verify passes.
2. **[Plan text vs. ported tests] "already held" for a signature remedy is the port's match, not `sameSignature`.**
   The plan says "stays silent when the fixtures already hold an equal signature (`sameSignature`)"; the lost code and
   its test "stays silent about a signature the fixtures already hold" (a node naming no signer role is met by a row
   with any role) need a semantic match: same subject, same resource id (none for `Any`), same meaning, and the
   signer role only when the node names one. Ported as the lost code wrote it.
3. **Lost-hunk scope.** As listed under Task 1-RED, the `sameEdge`/`sameEvent` test deletion and the session chip
   describe were left for 13-03/13-04.
4. Code comments cite "lost ARCH-48 `950977f`" (hash plus qualifier); no bare `ARCH-48` was added in tests or titles.

## Mutation (XC-05)

Scoped `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/Edits.ts,packages/devtools/src/model/Remedies.ts,packages/devtools/src/model/SimulationEdit.ts`
on the final tree: Edits 188/188, Remedies 352/352, SimulationEdit 14/14 = **1.0 each** (base 1.0 each). The run
overwrote `reports/mutation-devtools/mutation.json`.

## Gate results

- Task 1-RED verify: the four named tests RED (above), `src` clean.
- Task 1 verify: Edits/WhatIf/SimulationSession 119/119; BDD file 19/19 (after `pnpm typecheck` rebuilt
  `packages/devtools/lib`, which the features package resolves through); `pnpm typecheck` green; `DropSignature` in
  `packages/devtools/src` = 2 (baseline 0).
- Task 2-RED verify: the three named tests RED, `Remedies.ts` clean.
- Task 2 verify: `pnpm vitest run --project devtools` 39 files / 994 tests (995 after 0a047f8); `pnpm typecheck`;
  `pnpm lint` exit 0 (house-style 417 files clean, 3 declared switches, no budget changed); `pnpm circular` clean;
  `AddSignature` in `Remedies.ts`; no `^const resourceIdOf`; the `() => []` count as in deviation 1.
- `tstyche packages/devtools/test/surface.tst.ts` green.
- Not run: `pnpm check:pr` (13-12), `pnpm spec:verify` (still the 13-01 expected CCR-QD-399 failure; nothing here adds an id).

## For later plans

- **13-04:** spec (BEH-QD-222 signature rows + named `hasCustom` skip and its reason string), the website
  `devtools.md`, and the `.changeset/simulation-fields-described-once.md` (`EditKind` gains two members — an
  exhaustive match over it needs two arms) are all still to write; this plan wrote none (no file outside its list).
- **13-11:** traceability rows — `Edits.test.ts`, `WhatIf.test.ts`, `SimulationSession.test.ts`, `Remedies.test.ts`,
  `devtools-simulator.feature` → BEH-QD-222; overview row text for `EditKind`; O5 = ported in 13-02 (commit 96854d7);
  CCR-QD-400 covers this plan.
- No id used: BEH-QD-360..362 and ADR-QD-121 remain free.

## Commits

| sha | subject |
|---|---|
| a762844 | test(13-02): RED — the simulation sweep cannot drop a signature fixture |
| 4c1e9ea | feat(13-02): the simulation sweep drops each signature fixture (DropSignature) |
| b57c325 | test(13-02): RED — hasSignature gets no remedy and hasCustom no named skip |
| 96854d7 | feat(13-02): hasSignature gets an AddSignature remedy, hasCustom a named skip |
| 0a047f8 | test(13-02): a signature carrying only signedAt or only algorithm is labelled by its chip text |
