---
phase: QD-64-one-throwing-listener-cannot-silence-the-rest
plan: 03
subsystem: devtools
tags: [devtools, docs, listeners, aggregate-error, changeset]
phase_base: 8f3cb792c3a92acefadcd32be0f38b0df8f46641
plan_head_before: d5fa6061b48cddb74b30664812473e4f4857c32b
plan_head_after: 63ef2fceeb34a3c2d8766145f90ece2543531da4
commits: 2
requires:
  - phase: QD-64-one-throwing-listener-cannot-silence-the-rest
    provides: "plan 02's seam: notify calls every listener and rethrows what they threw by count"
provides:
  - "the three feeds' subscribe docs, the timeline's timeline doc and GatesFeed's module doc state the listener contract"
  - "the devtools README headless section states the contract with the consequences that still hold"
  - ".changeset/devtools-every-listener-is-called.md, the phase's one patch changeset"
affects: [QD-64-04, QD-64-05]
actuals:
  tokens: 2500
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns:
    - "a doc states the contract once and names only the caveat the code holds (the begin-to-fork window is described, not fixed)"
key-files:
  created:
    - .changeset/devtools-every-listener-is-called.md
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/devtools/src/model/GatesFeed.ts
    - packages/devtools/README.md
key-decisions:
  - "The begin-to-fork window stays and each text that can meet it says so: timeline Reading, diagnostics Starting, gates cadence."
requirements-completed: [LSTN-03, LSTN-04]
duration: 6 min
completed: 2026-11-20
status: complete
---

# Phase QD-64 Plan 03: The feeds' texts, README and changeset Summary

**Every listener text in `@qadi/devtools` now says a throwing listener no longer silences the others and what still happens to the publishing call, and one `@qadi/devtools` patch changeset records the change.**

## Accomplishments

- Task 1 (tracer), `6889b7ed`: comment lines only in three feeds. A diff of the three sources against `phase_base` holds only comment lines.
  - `TimelineFeed.ts` `TimelineStatusReadout.subscribe` (about line 57): contract, plus the `Reading` published by `restart`/`configure` over a `Stopped` escaping before the new read starts. The `timeline` field doc (about line 70): every listener is called, runs on every record, the rest of that call does not run.
  - `DiagnosticsFeed.ts` `DiagnosticsReadout.subscribe` (about line 97): contract, the existing poll-stop clause kept, and the `Starting` published before the new poll is forked, so the feed stays `Starting` and no new poll starts.
  - `GatesFeed.ts` module doc (lines 8-13): the feed's own listeners are all called, what they threw rethrown out of `configure`, a tick or the registry's own notification; a throw on a tick ends the questions cadence. `GatesFeed.subscribe` doc (about line 78): contract and a pointer to the module doc.
- Task 2, `63ef2fce`:
  - `packages/devtools/README.md`, "Without React: the feeds" paragraph: new contract, and the three consequences narrowed to what holds (gates questions cadence ends, a diagnostics feed stays `Starting` with no new poll, a timeline restarted from `Stopped` says `Reading` with nothing reading). The fences after it are unchanged.
  - `.changeset/devtools-every-listener-is-called.md`: `"@qadi/devtools": patch` and one sentence, no change or plan id. It is the only changeset added since `phase_base`.
- Website re-grep (`git grep -n -i -e listener -e "must not throw" -- apps/website/src/content`): no line on `docs/packages/devtools.md`; `apps/website` is unchanged since `phase_base`.
- The old-contract regex now finds exactly one line in the repository, `spec/behaviors/28-devtools-screens.md:2548`, which plan 64-04 rewrites.
- `git diff --name-only phase_base -- packages` filtered to `/src/` lists `ExternalStore.ts` and the three feeds, nothing else.

## Verification

- Task 1 verify (the plan's automated block): passed. The three feed suites ran clean, oxlint clean on the three sources, one `docs(64-03): the feeds` commit holding exactly those three files.
- Task 2 verify: passed, including `doc-examples: 117 block(s) compile` and the planned README sentence read with whitespace collapsed.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. No network, auth, file-access or schema surface was added; two comment-only source edits, one README paragraph, one changeset file.

## Next

Ready for 64-04 (spec records: ADR-QD-177, BEH-QD-656, the BEH-QD-638 amendment, INV-QD-373, CCR-QD-455).
