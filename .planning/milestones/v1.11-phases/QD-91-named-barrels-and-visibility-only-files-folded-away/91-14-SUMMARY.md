---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 14
subsystem: scripts
tags: [gate-14, packed-consumer, hydration, probes, red-evidence]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: hydrateDecisions taking the package-private HydrationTarget (91-13), 91-check.mjs scratch/variant/folds, 91-earlier-checks.mjs
provides:
  - gate 14's packed consumer hydrates a JSON-round-tripped payload into the atom set and through { hydrate } alone, and refuses hydrateDecisions({}, ...)
  - hydrate-probe-refusal, hydrate-wrong-subject and dehydrate-drops-options in 91-RED-EVIDENCE.md, each with a non-zero exit
affects: [91-16 (ADR-QD-204 note may cite the probe), 91-21 (close runs every phase check)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 9466ffdc58103b2fe3ed9479f418a5a2f6844e1c
plan_head_after: 4b2fbffbabc0b5212fc8060d11ab21a28096bbfd
commits: 2

actuals:
  tokens: 2500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a widened public parameter is probed in the packed consumer with plain statements (a positive run and a never-called arrow holding a @ts-expect-error), not a probe-list entry"

key-files:
  created: []
  modified:
    - scripts/check-package-install.mjs
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md

key-decisions:
  - "The hydrate probe is plain consumer statements: gate 14's guard reads only TYPE_ONLY_PROBES, REFUSED_SHAPE_PROBES and RUNTIME_PROBES, so no list entry was added (RESEARCH A5 confirmed)"

requirements-completed: []

duration: 25min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 14: Hydrate probe and folded entry points Summary

**Gate 14's packed consumer now exercises `hydrateDecisions`' structural parameter as a consumer installs it: it hydrates a payload that crossed as JSON text into the atom set and through `{ hydrate: atoms.hydrate }`, checks both seed every entry and the same atoms, and refuses `hydrateDecisions({}, ...)` with a `@ts-expect-error` that a variant seen failing proves bites.**

## Accomplishments

- Probe (`3d38da36`): in `scripts/check-package-install.mjs`'s fixture, beside the `QadiProvider` import, `dehydrateDecisions`, `DehydratedDecisions` (type), `hydrateDecisions` and `makeQadiAtoms` come from the `@qadi/react` root (no module path), and `EvaluationServicesNone` from `@qadi/core`. The consumer builds `makeQadiAtoms(EvaluationServicesNone)`, dehydrates the two decisions it evaluates for `alice` (an allow and a deny), passes the payload through `JSON.stringify` then `JSON.parse`, hydrates the decoded payload twice and `expect`s the payload has entries, that both seed counts equal the entry count (two), and that both seed the same atoms in the same order. A never-called arrow holds `// @ts-expect-error a value without hydrate is not a hydrate target` over `hydrateDecisions({}, hydrationPayload, alice)`; check 4's `tsc` fails an unused directive before the run. No existing probe, list or check was touched. `node scripts/check-package-install.mjs`: exit 0, `9 package(s) pack, resolve and authorize (528 runtime export(s))`, 257 packed `.d.ts`, none escapes.
- Probe-guard finding (RESEARCH A5, confirmed): `scripts/lib/probe-guard-parse.mjs` and the gate read only the names on `TYPE_ONLY_PROBES`, `REFUSED_SHAPE_PROBES` and the core-only `RUNTIME_PROBES` (the module hook wraps only `@qadi/devtools` feeds and those core names). Plain consumer statements need no list entry, and none was added. The run-time half is held by `expect` throwing when the consumer runs; the compile-time half by `@ts-expect-error`.
- Variants (`4b2fbffb`, record): three, each on a scratch clone of `3d38da3608`, each seen failing, none needing a born test (see below).
- Checks: `91-check.mjs folds` exit 0 (`6 folds landed, 5 files gone, each with its structural block`), `homes`, `barrels`, `scan-ids`, `scan-forbidden`, `trailers` (46 commits, each with the one trailer) exit 0; `91-pinned-check.mjs`: `516 held, 26 declared (26 applied), 4 born, 27 earlier-held, clean`; `91-earlier-checks.mjs`: `87 runs, all match their rows`; `seen-failing packages/react/test/HydrationTarget.tst.ts`: 4 titles, each seen failing; `seen-failing packages/react/test/HydrationFold.test.ts --if-present`: absent.

### Variants (`91-RED-EVIDENCE.md`)

| Label | Scratch | Edit | Result |
| ----- | ------- | ---- | ------ |
| `hydrate-probe-refusal` | `hydrate-widen` at `3d38da3608` | `hydrateDecisions`' first parameter widened from `HydrationTarget` to `object`, its body casting to `HydrationTarget` so the build still passes | `variant … package` exit 1, the one failure: `.package-check/consumer.ts(152,3): error TS2578: Unused '@ts-expect-error' directive.` |
| `hydrate-wrong-subject` | `hydrate-wrong-subject` at `3d38da3608` | `hydrateDecisions` forwards `{ ...subject, id: "other" }` to the target's `hydrate` | `variant … vitest` over `Hydration`, `HydrationPayload`, `HydrationCounts` tests: exit 1, 52 titles seen failing (seeding, mismatch reports, counts, round trips); first text `expected "vi.fn()" to be called with arguments` |
| `dehydrate-drops-options` | `dehydrate-drops-options` at `3d38da3608` | `dehydrateDecisions` calls `dehydrateWith(entries)` without `options` | `variant … vitest` over the same files and `DecisionOutcome.test.ts`: exit 1, 16 titles seen failing, among them `discloses the trace only when asked`, `SAYS WHAT IT DROPPED`, `says nothing in a production build unless a reporter was supplied`, and the two byte-for-byte pins (`expected 'Withheld' to be 'Disclosed'`) |

Both entry-point variants failed on existing tests, so the plan's conditional `packages/react/test/HydrationFold.test.ts` was not written and `test(91-14): hold the folded hydration entry points` was not made. The three scratch clones were removed by name; the rest of the scratch root (`gen/`, `earlier/`) was left alone.

## Task Commits

1. Task 1: `3d38da36` `test(91-14): probe the structural hydrate parameter in the packed consumer` (`scripts/check-package-install.mjs` only); `91-check.mjs commit` accepts it.
2. Task 2: `4b2fbffb` `docs(91-14): record the hydration variants` (`91-RED-EVIDENCE.md` only); `91-check.mjs commit` accepts it.

## Deviations from Plan

### Plan defects

**1. A variant that widens the parameter to `object` cannot build as written.** The plan's edit ("widen `hydrateDecisions`'s first parameter to `object`") leaves `atoms.hydrate(...)` ill-typed, so `pnpm build`, which gate 14 runs itself, would fail before check 4 and the unused directive would never be the reported cause. Before: parameter `atoms: HydrationTarget`, body `atoms.hydrate(dehydrated, subject, options)`. After (scratch only): `atoms: object` and `(atoms as HydrationTarget).hydrate(dehydrated, subject, options)`. Result: exactly one failure, the unused directive. Nothing in the shipped tree uses a cast.

**2. The `seen-failing … --if-present` and `seen-failing <file>` forms in the verify cannot be one quoted word.** Run as separate arguments they behave as the plan intends; no check changed.

### Choices the plan left open (autonomous, most complete option)

**3.** The probe seeds two entries (an allow and a deny) rather than one, and also compares the atoms each hydration seeds, so equal counts cannot hide a forwarding object seeding other atoms.

**4.** `EvaluationServicesNone` is imported into the fixture from `@qadi/core` for the atom set's layer (it was not imported there before); it is a public root name, no probe list involved.

**Total deviations:** 1 plan defect in a scratch edit, 1 verify-form note, 2 open choices. **Impact:** none on the shipped tree; no check weakened.

## Known Stubs

None.

## Threat Flags

None. T-91-28 (a forwarding object seeding another subject's decisions) is mitigated: the capability is the atom set's own `hydrate`, and `hydrate-wrong-subject` is seen failing on 52 titles. T-91-29 (the payload's options dropped by the folded `dehydrateDecisions`) is mitigated: `dehydrate-drops-options` is seen failing on 16 titles, so no born test was needed.

## Self-Check: PASSED

- `scripts/check-package-install.mjs` holds `hydrateDecisions({ hydrate: ` and a `@ts-expect-error` over `hydrateDecisions({}`; `91-RED-EVIDENCE.md` holds `hydrate-probe-refusal`, `hydrate-wrong-subject` and `dehydrate-drops-options`, each with `exit: 1`.
- Commits `3d38da36` and `4b2fbffb` are ancestors of HEAD, each with the one trailer.
- `packages/react/test/HydrationFold.test.ts` is absent, as the plan allows when both variants fail on existing tests.
