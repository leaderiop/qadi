---
phase: "72"
slug: "a-derived-store-behind-the-dock-model-s-stores"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-22"
---

# Phase 72 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase moves the dock model's three computed stores (`diagnostics`, `questions`, `services`) onto one primitive in `@qadi/devtools`' package-private `ExternalStore.ts`: `makeDerivedStore`, a scoped store derived from parent stores. It holds a key, compares it field by field over the key's own enumerable string-keyed fields (`sameFields`), recomputes and notifies once when a field moved, commits the key only after `compute` returns, stops when its scope closes, and on close releases every parent even when a release throws, then rethrows what was thrown (one value as itself, more as one `AggregateError`, through `throwCollected`, which `notify` shares). `DockModel.ts` builds its three computed stores with it and keeps no last key or closed flag of its own. The React panels read through the new `ReadableStore<A>` type (a type-only change). No network, auth, file, dependency or public-export surface changes: `check-api-surface` still reads 941 exports and nothing new is exported from either devtools barrel. The threats are a stale store from a key field the comparison misses, a throwing host listener, compute or parent release silencing others or leaving subscriptions behind, a closed model publishing, records and type pins that claim more than ran, and the mutation and change records.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| host callback → dock model | a listener the host subscribes to a dock store | an arbitrary function that may throw |
| host configure → dock model | the reading, the gates registry and the hydration activity the host passes to `configure` | host-supplied values the derived stores key on |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-72-01 | Tampering | mutation base measured on an already-edited tree | medium | mitigate | `72-mutation-base.json` written once by `0df84562`, the first commit after `phase_base` 74f631ad, with no `packages/` change between; both groups' `head` = 74f631ad | closed |
| T-72-02 | Repudiation | characterisation edited later to match changed behaviour | high | mitigate | `66ba2bdf` adds only `DockModel.characterisation.test.ts`, before the first source change `7b534b6e`; review commits since changed imports, one title and shared helpers only, and split the closing-scope row's one counter into three per-store counters each asserted 0 (stricter); still 15 rows, no input or expected value changed | closed |
| T-72-03 | Denial of service | host listener throwing during a reading configure | medium | mitigate | characterisation row "a throwing questions listener lets services and diagnostics move, then escapes": the throw is `boom`, services and diagnostics each moved once; `notify` collects then rethrows (`ExternalStore.ts`), `configure` refreshes `shownReading` last | closed |
| T-72-04 | Denial of service | throwing listener on a derived store silencing siblings or the parent's later listeners | high | mitigate | `notify` + `throwCollected`; `ExternalStore.test.ts` one-throw and two-throw rows assert every other listener and the parent's later listener ran, and the rethrown value / `AggregateError` contents and order | closed |
| T-72-05 | Repudiation | type pin satisfied by an unrelated diagnostic | medium | mitigate | `ExternalStore.tst.ts`: each refused call held in `const built` and read by `type.toBe`, with a positive twin; each guarantee (`Required<K>`, non-empty `parents`, `compute: (key: K) => A`) gutted once and seen failing (`72-RED-EVIDENCE.md`) | closed |
| T-72-06 | Repudiation | CCR row citing a revision no document reaches | medium | mitigate | every revision CCR-QD-464 cites equals its document header (ADR-185 1.2, 047 1.21, 162 1.7, 168 1.2, 169 1.2, behaviors/28 1.51, invariants 1.180, traceability 1.254, README 1.300); `spec-revise --check` and strict traceability 21/21 pass | closed |
| T-72-07 | Tampering | earlier ADR-047 amendment or history cell rewritten | medium | mitigate | the ADR-047 diff since `phase_base` replaces only the Revision, Status and Change History cells, each old cell a verbatim substring of the new; the body change is one dated addition | closed |
| T-72-08 | Tampering | key field missed by the comparison, leaving a store stale | high | mitigate | `sameFields` compares entry count and each own enumerable string-keyed entry with `===`; `K extends object & Required<K>` (gutted once); closed key types in `DockModel.ts`; per-field tests in `ExternalStore.test.ts` (each field alone, other key shapes, lost and gained fields, inherited/non-enumerable/symbol-keyed fields) and the "moves once per key field" tables in `DockModel.test.ts` | closed |
| T-72-09 | Denial of service | throwing compute committing its key, so the next trigger skips the recompute | medium | mitigate | order `compute`, then commit key, then `set`; test "a throwing compute commits nothing and the next trigger recomputes" | closed |
| T-72-10 | Information disclosure | store notifying after its scope closed | low | mitigate | `stopped` flag read by `refresh`; finalizer registered before parents are subscribed and releasing every parent even when one throws; tests: after close nothing read/computed and each parent released; a throwing subscribe leaves no earlier parent subscribed; a throwing release leaves no later parent subscribed and fails the close; two throwing releases fail with one `AggregateError` | closed |
| T-72-11 | Tampering | join pairing a question and a guard from different moments, or publishing twice per configure | high | mitigate | key thunks read the live `inputs`; `configure` assigns inputs, configures the feeds, then refreshes `shownReading` last; `questions` built on `[gatesFeed, shownReading]` before any host listener; the join and order tests in `DockModel.test.ts` byte-identical to the base | closed |
| T-72-12 | Information disclosure | closed model's diagnostics store publishing a reading nothing follows | low | mitigate | `shownReading` is a derived store stopped by its finalizer; "a model whose scope closed merges no reading a later configure hands it"; the characterisation closing-scope row asserts 0 for all three stores | closed |
| T-72-13 | Repudiation | deleting the only killer of a dock-specific mutant | medium | mitigate | `compare` exit 0 on the close re-recorded at ed8d487f (after validation added one assertion): `DockModel.ts` 70/70 (base 114/114), `ExternalStore.ts` 77/78 (base 41/42, the one survivor the base's own in `sameElements`), no new open or Ignored mutant | closed |
| T-72-14 | Tampering | store added with no spec or test noticing | low | mitigate | "a built model's members with subscribe and getSnapshot are exactly this list" (`assert.sameMembers`, 9 names equal to BEH-QD-700's), seen failing on an added and a removed name | closed |
| T-72-15 | Repudiation | invariant claiming a check nothing performs | medium | mitigate | INV-QD-390's Enforcement says which parts no test or gate checks and which are kept by review | closed |
| T-72-16 | Tampering | change register omitting a changed file or citing a wrong revision | medium | mitigate | the 22 files changed outside `.planning/` since `phase_base` (12 `packages/`, 10 `spec/`) equal CCR-QD-464's file list exactly; revisions as T-72-06 | closed |
| T-72-17 | Tampering | static mutant waved through as Ignored without being run | medium | mitigate | `EXAMINED` holds exactly `ExternalStore.ts: 'StringLiteral ""': 1`, the span name of `makeDerivedStore`, killed by "makeDerivedStore is built under a span named for it"; by-hand `ignoreStatic: false` run at the final tree: see Evidence notes | closed |
| T-72-18 | Tampering | close measured on a tree that later changed, or a re-baselined base | high | mitigate | both close groups on one head ed8d487f, the final tree (re-recorded after validation's one-assertion test change; no `packages/` change since); recorded mutant positions match HEAD's source; the base record has one commit, never rewritten | closed |
| T-72-SC | Tampering | dependency installs (every plan) | low | accept | see AR-72-01 | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-72-01 | T-72-SC | No package is installed, added or upgraded; no `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` or `.npmrc` changed since `phase_base` | plan-time disposition (72-01..72-08) | 2026-11-22 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **Plan-time check superseded by code review:** 72-08's close scan required the characterisation touched by exactly one commit since `phase_base`. Review touched it in five more commits (imports, one title, shared helpers, a stricter closing-scope counter; no input or expected value). Judged against the substance, not the plan-time literal check.
- **Non-durable evidence:** the Stryker run logs and the `check:pr` logs live in session scratch directories; the durable record is `72-RED-EVIDENCE.md`, the `72-REVIEW-FIX*.md` reports, `72-mutation-close.json`, this file's Evidence notes and the passing tests.

### Evidence notes

- **T-72-17, by-hand static run at the final tree:** `stryker.devtools.mjs` spread with `ignoreStatic: false`, `--mutate packages/devtools/src/model/ExternalStore.ts`, at ed8d487f: 79 Killed, 1 Survived (113:3, the base's `sameElements` survivor). Every `StringLiteral ""` mutant of the file was Killed: 82:28 and 199:30 (the two `throwCollected` messages) and 166:43 (the span name, the one `EXAMINED` entry), each by one test.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-22 | 19 | 19 | 0 | gsd-security-auditor at be831db3 (ASVS 1, block on high, register authored at plan time; judged against the post-review code; `compare`, revision and file-list checks, characterisation diff since its first commit; `check:pr` 0 on be831db3 and again on ed8d487f after validation, 17/18 steps, mutation skipped by design) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-22
