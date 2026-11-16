---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
plan: 07
subsystem: spec-and-docs
tags: [adr, changesets, upgrade-guide, docs, arch-96]
phase_base: 76330fbd24b7aadcfc65bc78e5053f9690cc6227
plan_head_before: fecb7770366b3acac5506ef1e54a0badc5101a32
plan_head_after: f27060996f8a02fd341a7c4456e2290ee7d1c401
commits: 3
requires: [49-06]
provides:
  - "ADR-QD-162 (Accepted — amends ADR-QD-047; applies ADR-QD-152; keeps ADR-QD-053, ADR-QD-080), quoting the 49-01 ADR check verbatim"
  - "ADR-QD-047 Rev 1.16 amendment and ADR-QD-053 Rev 1.7 note; index.yaml, traceability row and CCR-QD-440 cell"
  - "three changesets: core minor, react minor Breaking, devtools minor Breaking"
  - "the 0.13 upgrade entry with a compiled After fence"
  - "the website devtools and react hooks pages and both READMEs say the feed hands over the registry"
affects: [49-08, 49-09]
key-files:
  created:
    - spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md
    - .changeset/gate-states-stated-once.md
    - .changeset/devtools-feed-hands-the-gate-registry.md
    - .changeset/dock-takes-the-gate-registry.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/053-a-gate-can-be-found.md
    - spec/README.md
    - spec/traceability.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - apps/website/src/content/docs/docs/packages/devtools.md
    - apps/website/src/content/docs/docs/packages/react/hooks.md
    - packages/devtools/README.md
    - packages/react/README.md
key-decisions:
  - "ADR-QD-053 is noted, not reversed: the 49-01 check judged its two wiring sentences historical, its structural no-dependency decision stands"
  - "ADR-QD-162 states the store count once: seven before, questions the eighth, sightings a thunk; BEH-QD-506 and older anchors keep their titles"
metrics:
  tasks: 3
  files: 14
actuals:
  tokens: 21000
  tasks: 3
  commits: 3
status: complete
---

# Phase QD-49 Plan 07: ADR-QD-162, three changesets, the 0.13 upgrade entry and the docs Summary

The record now matches the code: ADR-QD-162 states the gate registry as the dock model's eighth store and the five gate states once, the three packages' changes are recorded at their true weight, and a host upgrading has one compiled edit to make.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `f2d61330` | `docs(49-07)`: ADR-QD-162, the gate registry is the dock model's eighth store and the gate states are stated once |
| 2 | `de3fba19` | `docs(49-07)`: the changesets and the 0.13 upgrade entry for the gate registry |
| 3 | `f2706099` | `docs(49-07)`: the website and the READMEs say the dock takes the gate registry |

Each message ends with the `Co-Authored-By: Claude Sonnet 5.5` trailer (checked with `git log -1 --format=%B`).

## What was built

- **ADR-QD-162** in ADR-QD-161's shape: Context (the two defects, then the ten ADR-check passages quoted verbatim with file and line, and the verdicts), Decision (five points: the core table and its derivations, the registry as a model input joined at one moment, the prop and feed both Breaking, the count stated once, a throwing `instances()` not caught), Consequences (the D-12a copy edit quoted old and new, the two react test edits, browser behaviour otherwise unchanged, no re-render to feed the dock, what it does not do), Related. Listed in `index.yaml`.
- **ADR-QD-047** Rev 1.16: a dated amendment after CCR-QD-427's and a Status entry. **ADR-QD-053** Rev 1.7: a dated note and a Status entry; the structural-no-dependency decision is stated as standing.
- **`spec/traceability.md`** Rev 1.203: the ADR-QD-162 row (Affected invariants `—`, for 49-08 to fill). **`spec/README.md`** Rev 1.220: the CCR-QD-440 cell extended with the four new revisions.
- **Changesets:** `gate-states-stated-once.md` (`@qadi/core` minor, no Breaking line), `devtools-feed-hands-the-gate-registry.md` (`@qadi/react` minor, **Breaking**), `dock-takes-the-gate-registry.md` (`@qadi/devtools` minor, **Breaking**); each Breaking one ends with the upgrade guide line.
- **`upgrading.md`**: `## 0.13: the dock takes the gate registry, not its instances`, the last 0.13 heading, with a `ts` Before fence, a `typescript` After fence (`createElement(DevtoolsDock, { gates })` over `const fits: GateRegistryLike = atoms.gates`, since a `typescript` fence compiles as `.ts` and cannot hold JSX), the `feed.gates.instances()` line, the new D-12a message and the ADR link.
- **Docs**: website `devtools.md` (four places) and `react/hooks.md`, `packages/devtools/README.md`, `packages/react/README.md` now say the feed hands over the registry and the dock subscribes to it.

## Verification

- `node scripts/spec-revise.mjs --check`, `pnpm spec:verify` (21 PASS, 0 FAIL) and `pnpm lint` exit 0 after Task 1; the Task 1 content check printed `ADR-QD-162 written from the check; 047 amended; 053 noted; anchors kept`.
- `pnpm exec tsc -b tsconfig.build.json` and `pnpm spec:website-examples` exit 0 after Task 2: **67 block(s) compile** (the new After fence among them); the Task 2 shape check printed `three changesets, one entry, the After fence compiled; nothing versioned`.
- After Task 3: `pnpm spec:website-examples` (67 blocks), `pnpm spec:claims` (8 claims registered), the build and `pnpm spec:package` (9 packages, 522 runtime exports) exit 0; the doc check printed `the four docs describe the registry hand-over`.
- **`pnpm check:pr < /dev/null`: exit 0**, 16 of 17 steps (mutation skipped on a PR, by design), last step `pnpm spec:publish` (9 packages and 6 documents agree on 0.12.0).
- No CHANGELOG or `package.json` changed; `pnpm changeset version` was not run; `node scripts/next-id.mjs` was not run; `scripts/check-house-style.mjs` untouched.

## Deviations from Plan

None - plan executed exactly as written. One note on the plan's wording: it asked for a self-contained `typescript` After fence "rendering `<DevtoolsDock gates={atoms.gates} />`"; a `typescript` fence compiles as `.ts` and JSX needs a `tsx` fence, which the Task 2 shape check does not accept, so the After fence uses `createElement`. The Before fence (`ts`, not compiled) keeps JSX.

## Known Stubs

None.

## Threat Flags

None. Only records, changesets and prose changed; no source file.

## Self-Check: PASSED

- FOUND: ADR-QD-162 file and the three changeset files exist.
- FOUND: `f2d61330`, `de3fba19` and `f2706099` are ancestors of HEAD.
