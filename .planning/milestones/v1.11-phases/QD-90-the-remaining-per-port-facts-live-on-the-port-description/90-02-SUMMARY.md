---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 02
subsystem: testing
status: complete
tags: [core, phase-check, red-evidence, scratch-clones, ports]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: c9918de3b429617b5153643f6ecd88486ba43a39
plan_head_after: 527406dd28f85d8778f28f4ad5bec91fbf418f3b

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: the 89-check.mjs judges (blank, topLevel, importsOf, closeOf, parseDiff, ids, forbidden forms, trailer, commit, unchanged, vitest report) and the variant and evidence shape
provides:
  - 90-check.mjs, the phase check - shared modes, shape judges and runners, and a 496-case self-test
  - 90-RED-EVIDENCE.md, 34 blocks, each a mode or a held 90-mutation.mjs mode seen failing on a scratch clone
affects: [QD-90 plans 03 to 16 - every later task's verify names a mode of 90-check.mjs]

actuals:
  tokens: 47623
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a pure judge per fact plus a thin git/tree reader, each judge exported and exercised by planted texts in --self-test"
    - "variant runs a check inside a scratch clone, and appends its block (scratch sha, edit, diff hash, run, exit, titles, first three failing lines, tsc groups) only when the run failed"
    - "the sixth-port comparison reads (file, code) groups only, never counts or lines"

key-files:
  created:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-check.mjs
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-RED-EVIDENCE.md
  modified: []

key-decisions:
  - "The shape modes read source through a comment-and-string blanking reader with bracket matching, not typescript's parser: TypeScript 7 has no in-process createSourceFile, and its server-backed API cannot parse the planted self-test text."
  - "The route judge's 'exactly one module-scope Match.type' is read as exactly one module-scope matcher with a ByScope arm, because PortAccess.ts already holds an unrelated module-scope matcher (countFor)."
  - "The close runner lists 90-pinned-check.mjs and 90-earlier-checks.mjs as children; they are later plans' scripts and fail until those plans write them."

patterns-established:
  - "A scratch clone is `git clone --no-hardlinks`, checked out onto the phase branch name at the wanted sha, with node_modules symlinked and added to the clone's .git/info/exclude (a symlinked node_modules is not matched by the repository's ignore entry and kills the scan modes with EISDIR)"

requirements-completed: []

coverage:
  - id: D1
    description: "90-check.mjs holds the shared modes base, commit, unchanged, scratch, scratch-clean, variant, seen-failing, vitest, suite, scan-ids, scan-forbidden, trailers, records, circular and the shape modes port-facts, scoped-route, sixth-port, spike, bench, routing-landed, close, with a self-test"
    verification:
      - kind: unit
        ref: "node 90-check.mjs --self-test (self-test: 496 passed) and pnpm exec oxlint on the script (clean)"
        status: pass
    human_judgment: false
  - id: D2
    description: "every mode of 90-check.mjs except sixth-port, and the deferred modes of 90-mutation.mjs, is recorded failing in 90-RED-EVIDENCE.md"
    verification:
      - kind: unit
        ref: "node 90-check.mjs commit docs(90-02): record the phase check seen failing, and node 90-check.mjs trailers"
        status: pass
    human_judgment: false
---

# Phase 90 Plan 02: The Phase Check Summary

**One script, `90-check.mjs`, states every check the later plans' verifies run: the shared git, scan and run modes, and the shape judges for the names, spans, fixtures, the scoped route, the sixth port, the spike, the bench and the routing, with a 496-case self-test and 34 seen-failing blocks on scratch clones.**

## Performance

- **Duration:** about 3 hours of agent time across two contexts (the script is about 2400 lines)
- **Started:** 2026-11-26
- **Tasks:** 3
- **Files:** 2 created

## Accomplishments

- `90-check.mjs` modes: `base`, `commit`, `unchanged`, `scratch [--at]`, `scratch-clean [--check]`, `variant`, `seen-failing [--titles-matching] [--if-present]`, `vitest`, `suite`, `scan-ids`, `scan-forbidden`, `trailers [--message]`, `records [--close]`, `circular`, `port-facts [names|spans|fixtures|serving]`, `scoped-route [derived|route]`, `sixth-port base|close [--record] [--on-chain]`, `spike [--rerun]`, `bench [--pass|--smoke]`, `routing-landed`, `close`, `--self-test`.
- Judges are pure and exported; the readers are thin. The script runs only from the repository root, refuses outside a `QD-90-` directory, and names no literal phase directory.
- `90-mutation.mjs`'s five deferred seen-failing modes (`landed close`, `landed coverage-close`, `compare`, `probe`, `record close`) are recorded here, as are `landed base`, `landed coverage-base`, `record base` and `coverage close`.
- Current-tree base facts: `port-facts` fails on PortName.ts/PortMetrics.ts, `scoped-route` on the hand-union `ScopedPort` and the two `isResourceScoped` calls, `spike` and `bench` on the missing 90-SPIKE.md and 90-BENCH.md. Each exits 1 as the plan asks.

## Task Commits

1. **Tasks 1 and 2: the phase check** - `9a13cc35` `chore(90-02): add the phase check` (90-check.mjs, 90-RED-EVIDENCE.md)
2. **Fix found while recording** - `ec9dacc9` `fix(90-02): name the cycles a circular variant fails on`
3. **Task 3: the evidence** - `527406dd` `docs(90-02): record the phase check seen failing` (90-RED-EVIDENCE.md)

## How each mode was seen failing (labels in 90-RED-EVIDENCE.md)

| Mode | Label | Edit |
| ---- | ----- | ---- |
| `base` | base-record-deleted | 90-mutation-base.json deleted |
| `commit` | commit-wrong-subject | none: a subject no commit has |
| `unchanged` | unchanged-held-test | comment appended to the held PortAccess.test.ts |
| `scan-ids` | scan-ids | `// D-49 says so` in PortName.ts |
| `scan-forbidden` | scan-forbidden-as, scan-forbidden-agents | an `as` cast in Errors.ts; a line in AGENTS.md outside section 3 |
| `trailers` | trailers-missing | scratch commit without the trailer |
| `records` | records-renamed | GuardHealthCheck.test.ts renamed (a Pinned by file) |
| `circular` | circular-portname | PortName.ts imports ./Ports.ts |
| `seen-failing` | seen-failing-missing-title, -prefix, -absent-file | one evidence line left out; a prefix no title has; a file that does not exist |
| `vitest` | vitest-inverted-assertion | AccessDenied's expected class inverted in Errors.test.ts |
| `suite` | suite-inverted-assertion | the same edit, run through the four-project suite |
| `records --close`, `port-facts`, `scoped-route`, `spike`, `bench`, `bench --pass`, `routing-landed`, `bench --smoke`, `spike --rerun`, `scratch-clean --check`, `close` | records-close ... close | none: the base tree (the records, the facts and the files they judge do not exist yet) |
| `90-mutation.mjs` | mutation-landed-base, -landed-coverage-base, -landed-close, -landed-coverage-close, -compare, -probe, -record-close, -record-base-dirty, -coverage-close | phase_base moved; coverage base deleted; none; none; none; none; none; a dirty core file; all core tests but one committed in the clone |

`sixth-port` is not seen failing here (plans 05 and 13 record it). `vitest`, `suite` and `seen-failing` failed on their real reason (an asserted value, a missing evidence line).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The circular variant's failing text was the pnpm banner**
- **Found during:** Task 3
- **Issue:** the first recorded `circular-portname` block listed the `> qadi-monorepo ... circular` banner as its failing text, which proves nothing about a cycle.
- **Fix:** a circular run's failing text is its numbered cycle lines; tstyche's failing titles are read through its colour codes. The block was removed and re-recorded.
- **Files modified:** 90-check.mjs
- **Commit:** `ec9dacc9`

### Plan deviations and plan defects (recorded, no check weakened)

1. **No typescript parser.** The route and fact judges read blanked text with bracket matching; TypeScript 7.0.2 has no in-process `createSourceFile` (see key-decisions).
2. **"Exactly one module-scope Match.type<"** cannot hold literally: PortAccess.ts holds `countFor`. The judge counts module-scope matchers with a `"ByScope"` arm.
3. **Table formats the plan left open**, chosen here and binding for plans 03 to 14: the SPIKE.md table is `| chain | patches (name.patch + 64-hex sha256, in order) | madge | tsc | verdict |`, with the chain names of the fixed list, a verdict cell that starts with accept or reject, and a 40-hex sha after the words "spike base"; outputs are `spike/out/<chain>.madge.txt` and `.tsc.txt`. A measured bench patch is one whose `bench/<name>.meta.txt` exists; the patch of record is the hoisted one when its meta exists, else routing; the verdict is the last `# gate:` line of its analysis file.
4. **The self-test was written in one pass**, so there is no separate "Task 1 count" to be exceeded: the final line is `self-test: 496 passed` for both tasks' judges, and both tasks' files were committed once, as the plan's first commit names them.
5. **Evidence block for the sixth port** is `## sixth-port <name>` (or `... (spike: <chain>)`); comparison reads the last block of the exact heading and ignores spike blocks.
6. **Extra commit** `ec9dacc9` (Rule 1 above) sits between the two commits the plan names.
7. **Three 90-mutation.mjs modes fail on a missing file, not a stated reason.** `compare` and `record close` stop with an uncaught ENOENT on the not-yet-written close record, `probe` on the absent `reports/mutation/mutation.json`. They fail honestly (no close exists at the base), but the failing text is a stack head. 90-mutation.mjs is held; no change made.
8. **Core mutation base is not all-killed** (4 survivors, PortMetrics.ts all-Ignored, PortName.ts absent): unchanged, not re-baselined.

## Known Stubs

None. The modes that judge records and files not yet written (SPIKE.md, BENCH.md, the new behaviours) fail by design until their plans land.

## Threat Flags

None.

## Issues Encountered

- A symlinked `node_modules` in a scratch clone is listed as untracked and killed the scan modes with EISDIR; fixed by writing it to the clone's `.git/info/exclude`.
- `coverage close` and `record base` require a clean tree, so the coverage variant commits its deletions in the clone first.

## Denied commands

None.

## Not done

- `sixth-port base|close` and `bench --smoke` against real data are exercised only on their planted self-test cases (plans 05 and 13, and the bench plans, run them).
- `variant`'s `tstyche` kind was checked by hand against a real tstyche failure to read its output, and by the planted colour-code case; it has no recorded block.

## Self-Check: PASSED

- 90-check.mjs and 90-RED-EVIDENCE.md exist; `node 90-check.mjs --self-test` ends `self-test: 496 passed`; oxlint is clean.
- Commits `9a13cc35`, `ec9dacc9`, `527406dd` are ancestors of HEAD; `node 90-check.mjs trailers` reports 6 commits since phase_base, each with the one trailer.
- The scratch root was removed with `scratch-clean` and `scratch-clean --check` passes.
