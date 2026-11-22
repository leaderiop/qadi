---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 08
subsystem: gate scripts (pin-budget gate, tstyche runner, packed-install gate)
status: complete
tags: [hygn-07, wx-06, oi-15, oi-16, oi-17, oi-19, oi-20, oi-21, gates]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-07's last commit d895f96b
provides:
  - "pnpm test:tstyche <path> passes its filters to both passes and never to --listFiles (OI-15)"
  - "house-style reads tstyche.json as JSONC and refuses a second AGENTS.md row for one type-test file (OI-16)"
  - "CHARACTERISATION declared once in scripts/lib/type-tests.mjs (OI-17)"
  - "gate 14 reads what the consumer's run called and the property a refusal names, names the TypeScript version whose unstable API fails, bounds every child, and ends its read loop on Stopped (OI-19, OI-20, OI-21)"
affects: [68-15]

actuals:
  tokens: 45000
  tasks: 2
  commits: 2
plan_head_before: d895f96bac1605f2276649e87157805de06a7be7
plan_head_after: ca9ffb18dd0811946e2d03b0e0e3a08baf155324
commits: 2

tech-stack:
  added: []
  patterns:
    - "a gate change is accepted only after a plant fails it naming its reason and the real tree passes"

key-files:
  created: []
  modified:
    - scripts/run-tstyche.mjs
    - scripts/lib/type-tests.mjs
    - scripts/check-house-style.mjs
    - scripts/check-package-install.mjs

key-decisions:
  - "OI-19 to OI-21: gate 14 counts the make*Feed calls through a module hook (module.register) around the consumer's run; module.register stays because Node 22.12, CI's floor, has no module.registerHooks"

requirements-completed: [HYGN-07, WX-06]
completed: 2026-11-21
---

# Phase 68 Plan 08: test:tstyche filters, house-style's JSONC and duplicate-row reads, and the packed-install guard Summary

Two merge gates now read behaviour where they read text, accept input the tools they mirror accept, and cannot hang: `pnpm test:tstyche <path>` runs the one file in both passes, house-style reads `tstyche.json` as the tool does, and gate 14 reads the consumer's run and the property a refusal names, with every child process bounded.

## Commits

- `ec59e0ac` `fix(68-08): test:tstyche takes file filters, house-style reads tstyche.json as JSONC, the characterisation is named once` (three scripts)
- `ca9ffb18` `fix(68-08): the packed-install guard reads the consumer's run and the refused property, and bounds every child` (`scripts/check-package-install.mjs`)

## Items

- **OI-15.** `run-tstyche.mjs` passes file filters to both passes and never to `--listFiles`, and refuses an argument that starts with `-`. `pnpm test:tstyche packages/core/test/Decision.tst.ts` exits 0 and prints `Test files: 1 passed, 1 total` twice; `node scripts/run-tstyche.mjs --tsconfig x` exits 1 with `run-tstyche: takes file filters only, and "--tsconfig" is an option.` The unfiltered `pnpm test:tstyche` still exits 0 (348 passed, 2 skipped), and `pnpm check`'s step passes no argument.
- **OI-16.** `check-house-style.mjs` reads `tstyche.json` through `readJsonc`. Plant: a `//` comment on the first line of `tstyche.json` leaves house-style's last line `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`. Plant: the `AuditPortReply.tst.ts` row of AGENTS.md written twice exits 1 with `AGENTS.md:510  [not-callable-pin-table] lists packages/audit/test/AuditPortReply.tst.ts a second time; one row per file.` Both plants were reverted with `git checkout --` at once.
- **OI-17.** `CHARACTERISATION` is exported from `scripts/lib/type-tests.mjs` and imported by `run-tstyche.mjs` and `check-house-style.mjs`; the path literal occurs once under `scripts/`.
- **OI-19.** Gate 14 counts the `make*Feed` calls the consumer's run made, through a module hook that wraps each feed, instead of the calls its fixture spells. The type-only probes must annotate a declared value, and a refusal is a literal whose property named by the refused member carries the directive, in any spelling TypeScript reads (`//`, `///`, `/*`, `/**`).
- **OI-20.** A parser that cannot load or run now fails naming `typescript@<version>'s unstable API, which a TypeScript upgrade can move`.
- **OI-21.** `CHILD_TIMEOUT_MS = 600_000` bounds every child; `LIVE_TURNS = 200` is the one turn bound; the diagnostics read loop ends on `Stopped` and the failure reports its reason; the assertion label no longer varies by run (the turn count is a separate log line).

## Plants

Gate 14 on the real tree: `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`, exit 0, about 8 seconds on this host. `pi-plants.sh` (scratch, `$TMPDIR/qd68`) ends `pi-plants: all passed` with eight `ok` lines:

| Plant | Expected | Result |
|-------|----------|--------|
| a, the directive on another property | fails naming `whose property named by its refused member carries a @ts-expect-error` | ok |
| b, a call written but never run | fails naming `the consumer fixture never calls makeDiagnosticsFeed` | ok |
| c, an alias and an array type left | fails naming `the consumer fixture never declares a value typed DecisionCacheShape` | ok |
| d1, block-comment directive | passes | ok |
| d2, `//@ts-expect-error` | passes | ok |
| e20, `typescript/unstable/absent` | fails naming `typescript@7.0.2's unstable API` | ok |
| stop, a collector whose snapshot dies | fails naming `diagnostics feed stop reason was Error: planted` | ok |
| timeout, `CHILD_TIMEOUT_MS = 1` | fails naming `pnpm build FAILED` | ok |

Plants a, b and c passed the base gate (false greens) and d1 and d2 failed it (false reds); that is the plan-time evidence the plan records (P5). It was not re-run against the base here.

## DEP0205 note

On Node 26 `module.register` prints a DEP0205 deprecation warning, seen only in a failing run's output. CI runs Node 22.12.0, where `module.registerHooks` does not exist, so the call stays.

## Verification

- Both task `<verify>` blocks pass on HEAD after the second commit, including the one-commit, exact-files and trailer checks.
- SHA-256 of the four scripts equal the plan's: `run-tstyche.mjs` `3569699f…`, `lib/type-tests.mjs` `53d7a53d…`, `check-house-style.mjs` `abf2da01…`, `check-package-install.mjs` `10f000ae…`.
- `tstyche.json`, `AGENTS.md`, `package.json` and every type-test file are unchanged; `scripts/cpi-plant.mjs` does not exist; `scripts/` is clean. No `packages/*/src`, bench or `package.json` file changed, so 68-05's bench is unaffected.
- Gate 14 ran once at a time in the foreground with nothing else beside it.

## Deviations from Plan

None - plan executed exactly as written. Task 1 (tracer) is committed as the plan's first commit, its verify re-run end to end before Task 2.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- The four scripts exist; commits `ec59e0ac` and `ca9ffb18` are ancestors of HEAD; `commits: 2` is measured from the ledger base `d895f96b`.
