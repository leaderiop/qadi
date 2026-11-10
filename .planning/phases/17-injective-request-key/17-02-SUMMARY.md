---
phase: 17-injective-request-key
plan: 02
subsystem: core, devtools
tags: [red-test, property, mutation-base, port-key, replay]

phase_base: 1a14899
mutation_baseline:
  packages/core/src/PortKey.ts: 50.00 (13 killed, 8 survived, 5 NoCoverage)
  packages/core/src/PortDescription.ts: 100 (8/8)
  packages/core/src/AttributeResolver.ts: 100 (23/23)
  packages/core/src/DecisionHistory.ts: 97.30 (36 killed, 1 survived)
  packages/core/src/RelationshipResolver.ts: 92.31 (24 killed, 2 survived)
  packages/core/src/SignatureHistory.ts: 84.52 (71 killed, 11 survived, 2 NoCoverage)
  packages/core/src/CustomPredicate.ts: 89.80 (44 killed, 5 survived)
  packages/core/src/PortDoubles.ts: 100 (31/31)
  packages/devtools/src/model/Capture.ts: 100 (44/44)

requires: ["17-01"]
provides:
  - "`17-mutation-base.json`: per-file Stryker ratios at 1a14899 for the eight core port files and devtools Capture.ts"
  - "`packages/core/test/PortKey.test.ts` (new): the key law as a property, six collision examples, the -0 pin, three totality checks — RED"
  - "`packages/devtools/test/model/Capture.test.ts` describe \"a key does not collapse two questions the evaluator tells apart (ARCH-65)\" — RED"
affects: [17-03, 17-04, 17-05, 17-06]

actuals:
  tasks: 2
  commits: 3

key-files:
  created:
    - packages/core/test/PortKey.test.ts
    - .planning/phases/17-injective-request-key/17-mutation-base.json
    - .planning/phases/17-injective-request-key/17-02-SUMMARY.md
  modified:
    - packages/devtools/test/model/Capture.test.ts

key-decisions:
  - "Applied 17-01 T1 (D-04) from `_DECISIONS.md`: \"Every port's unseen replay request is an outage (fail closed); `PortDescription.key` returns `Result<string, KeyRefusal>` (Breaking) — confirmed\". The tests are written against today's `canonicalKey(value): string` so they fail on behaviour and `pnpm typecheck` stays green; 17-03 adapts only how a key is read (from the `Result`)."
  - "The replay test accepts a Deny or a Failed outcome, never an Allow, so it holds under D-04 = A (17-05 turns misses into the port's typed error)."

requirements-completed: []  # KEY-01/KEY-03 complete in 17-03/17-04; XC-05/XC-06 are cross-cutting

completed: 2026-11-10
status: complete
---

# 17-02 — The request key's law, its totality and the replay collision, committed RED

`phase_base: 1a14899`. No file under `packages/*/src` changed (`git diff 51279a0 --stat -- 'packages/*/src'` is empty).

## Task 1 — mutation base, then the key law (XC-05, XC-06)

Scoped Stryker at the phase base, before any source change, with the plan's two commands and one-liner
(`reports/mutation/mutation.json`, `reports/mutation-devtools/mutation.json`), ratios in `17-mutation-base.json`
and the counts in the frontmatter. Both runs exited 0 (core 484 mutants in 39 s, devtools 44 in 21 s).
`PortKey.ts` sits at 0.50 at the base: only `customPredicatePort.key` reaches it today.

`packages/core/test/PortKey.test.ts` (commit `be0fad3`): 11 failed / 1 passed (the `-0` pin).

- Law property (`numRuns: 1000`, no seed). First counterexample fast-check reported:
  `[[new Date("1970-01-01T00:00:00.000Z"),[new Map([[{"a":1n},new Date("1970-01-01T00:00:00.000Z")]])]]]`,
  caused by `TypeError: Do not know how to serialize a BigInt`. Bigint throws before most collisions are seen,
  so the property was also run once with `1n` removed from the pool (scratch copy, not committed): it fails on
  `[[new Set([]),new Map([])]]` with `key equality must be Equal.equals: expected true to equal false`
  (an empty Set and an empty Map both key as `[]`). The law therefore fails on collisions too, not only the throw.
- Rebuilt-in-another-order property (`numRuns: 500`): fails only on bigint (`[1n]`), as the plan predicted.
- Examples: Date vs ISO (`'"1970-01-01T00:00:00.000Z"'` both), NaN/±Infinity/null (`null | null | null | null`),
  `{a: undefined}` vs `{}` (`'{}'`), Set vs array (`'[1]'`), Map vs pairs (`'[[1,2]]'`), `[undefined]` vs `[null]`
  (`'[null]'`). `-0` keys like `0`: green, a pin.
- Totality: cycle → `RangeError: Maximum call stack size exceeded`; `1n` → `TypeError … BigInt`;
  100,000-deep array → `RangeError`.

All four `<automated>` checks pass (RED exit, failure names the cause, ≥2 `FastCheck.assert`, base json has
PortKey.ts and Capture.ts).

## Task 2 — the replay collision (ARCH-65)

New describe after "custom predicate capture" (commit `5622340`): `isDated` answers `params instanceof Date`;
`hasCustom("isDated", new Date(0))` allows live; replaying `hasCustom("isDated", "1970-01-01T00:00:00.000Z")`
from that capture gives `AssertionError: expected 'Allow' to not equal 'Allow'`. Suite: 1 failed / 39 passed.
Both `<automated>` checks pass.

## Checked for later plans

- `Equal.equals` holds for `[-0]`/`[0]`, `{a:-0}`/`{a:0}`, `Map[1,-0]`/`Map[1,0]`, `[NaN]`/`[NaN]` and
  `Set[NaN]`/`Set[NaN]` (tsx against `packages/core`'s effect). 17-03's encoding must key `-0` like `0` and
  `NaN` like `NaN` at every depth, not only at the top.

## Deviations

None. One fix before the first commit: `FastCheck.constantFrom<ReadonlyArray<unknown>>(…)` failed `pnpm typecheck`
(TS2740), so the leaf pool is typed by annotation (`const leaf: FastCheck.Arbitrary<unknown>`).

## Gate results

- Plan verifies: Task 1 four of four, Task 2 two of two.
- `pnpm typecheck` exit 0 after each task; `oxlint` on both test files exit 0; `node scripts/check-house-style.mjs` clean.
- Not run: `pnpm check:pr` (two suites are RED by design until 17-03/17-04).

## RED until

- `PortKey.test.ts`: green in 17-03 (17-03 reads keys from the `Result`; no test changes what it states).
- Capture "ARCH-65": green in 17-04. Any `--project core`/`--project devtools` run in 17-03 must exclude the
  other's RED test by name (`-t` negation or file filter).

## Commits

- `be0fad3` test(17-02): the request key's law and totality, red against the JSON encoding (with `17-mutation-base.json`)
- `5622340` test(17-02): a replay answered a Date-param question with an ISO-string question's capture
- `docs(17-02): complete plan` (this SUMMARY, ROADMAP, STATE)
