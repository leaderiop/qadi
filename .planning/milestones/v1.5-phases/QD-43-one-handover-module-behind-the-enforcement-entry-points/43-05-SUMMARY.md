---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
plan: 05
subsystem: docs
tags: [docs, upgrade-guide, changesets, handover, glossary]
phase_base: 712317c10688ebce97b8b29b5a5c515b84a8d71b
plan_head_before: 5fff486eb473608f8aa44749533a5c677f4bed6e
plan_head_after: d863b7190e293b18c76310d09f966b69ba8e73db
requires: ["43-04"]
provides:
  - "website concept pages and both glossaries describe guard as sharing enforce's handover module"
  - "two 0.13 upgrade sections (core, promise) with compiled After fences"
  - "two Breaking minor changesets, one per package"
affects: [43-07, 43-08]
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: ["one Breaking changeset per package so neither changelog carries the other's break"]
key-files:
  created:
    - .changeset/core-handover-options.md
    - .changeset/promise-filter-refuses-resource.md
  modified:
    - apps/website/src/content/docs/docs/concepts/enforcement.md
    - apps/website/src/content/docs/docs/concepts/witness-guard.md
    - apps/website/src/content/docs/docs/reference/glossary.md
    - spec/glossary.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
key-decisions:
  - "The upgrade sections link ADR-QD-156 at its planned filename; the ADR file itself is not written by this plan"
requirements-completed: [HAND-05, WX-07]
status: complete
---

# Phase 43 Plan 05: Docs, upgrade guide and changesets Summary

The website pages and both glossaries now say `guard` shares `enforce`'s handover module and that no value-handing entry point accepts a second resource; `upgrading.md` has the core and promise 0.13 sections, and each package has a Breaking minor changeset.

## Commits

- `4e902caf` docs(43-05): guard shares the handover module; value-handing entry points refuse a second resource
- `d863b719` docs(43-05): the 0.13 upgrade sections and the Breaking changesets for core and promise

## Sentences changed

- `concepts/enforcement.md` (~:72): "`enforceProjected` refuses `options.resource` for that reason" became a statement that all eight value-handing entry points (`enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard`, four `filter*`) take `HandoverOptions`, which refuses `options.resource`, while `enforce` and `assert` keep it.
- `concepts/enforcement.md` (~:171): "why a guarded resource can never be overridden by `EnforceOptions`" became "why a second resource cannot be written on an entry point that hands over a value".
- `concepts/witness-guard.md:108`, `reference/glossary.md:359`, `spec/glossary.md:432`: "built on `enforce`" became "shares `enforce`'s handover module" (the spec glossary names `Handover.ts`; the website does not, since it is package-private). `spec/glossary.md` bumped 1.10 -> 1.11 with `spec-revise`.

## Gate output

- stale-sentence search over website, spec glossary, READMEs, examples, features: no hits (four at the base)
- `pnpm typecheck`: exit 0; `tsc -p examples/http-advanced/tsconfig.json --noEmit`: exit 0
- `pnpm spec:examples`: 114 blocks compile; `pnpm spec:website-examples`: 59 blocks before the upgrade sections, 61 after
- `spec-revise --check`: every Revision matches its newest Change History entry
- Task 2 structural check (changeset front matter, bodies, last three headings, ADR links, no CHANGELOG/package.json change, no changeset consumed): passed

## Deviations from Plan

None - plan executed exactly as written. The call-site sweep needed no edits: `pnpm typecheck` and the http-advanced example compile with no call passing `resource` to `guard`/`filter*`.

## Known Stubs

None. Note: the upgrade sections link `spec/decisions/156-a-handed-over-value-is-decided-through-one-module.md`, which does not exist yet; the plan named that path and a later plan in this phase owns the ADR.

## Self-Check: PASSED

- FOUND: both changesets, the four doc files, `upgrading.md`
- FOUND commits `4e902caf`, `d863b719`
