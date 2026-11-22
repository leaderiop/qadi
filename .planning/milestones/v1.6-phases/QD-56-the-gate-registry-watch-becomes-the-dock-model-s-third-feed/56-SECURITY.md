---
phase: "56"
slug: "the-gate-registry-watch-becomes-the-dock-model-s-third-feed"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-18"
---

# Phase 56 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Host registry → gates feed | `GatesFeed.ts` subscribes to and reads a host-supplied `GateRegistryLike`; any of `subscribe`, `instances` or the release may throw | Guard instances, thrown values |
| Host thunk → gates feed | The feed calls the host's `questions` thunk on its own cadence and compares answers with `Equal.equals`, both inside one `try` | Asked questions, thrown values (including hostile proxies) |
| Feed snapshot → join → DOM | `DockModel`'s pure `rejoin` combines the feed's snapshot with the diagnostics status; `QuestionsPanel.tsx` renders a failure reason as a React text child | Failure reasons (host strings, stacks) |
| Package API | `questions` moves from `DiagnosticsDockOptions` to a dock input, and `useDevtoolsFeed` returns it at the top level (public, Breaking in `@qadi/devtools` and `@qadi/react`) | Two public surfaces (935 exports, unchanged count) |
| Phase evidence → gate | The D-11 comparer decides WX-05 from committed JSONs | Mutation scores |
| Repo → npm | Release pipeline | Package artifacts (nothing released this phase) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-56-01 | Tampering | mutation rule or base re-baselined after the change | medium | mitigate | `chore(56-01)` 4c19bc9e holds only `56-mutation.mjs` and `56-mutation-base.json`, parent `phase_base` 88f0ca26; 0 later commits touch either, `stryker.devtools.mjs` unchanged; `compare 56-mutation-static.json` → `WX-05 holds (D-11)` (re-run by the orchestrator) | CLOSED |
| T-56-SC | Tampering | npm/pip/cargo installs | high | mitigate | 0 changes to `package.json`, `packages/*/package.json`, `examples/*/package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` since `phase_base` | CLOSED |
| T-56-02 | Tampering | characterisation goldens edited to make a cell pass | medium | mitigate | `QuestionsPanel.feed.characterisation.test.tsx`'s only commits are 9270c5f2 and eb4990e5 (`test(56-02)`); the existing `QuestionsPanel.characterisation.test.tsx` has 0 commits since `phase_base`; both green after the move | CLOSED |
| T-56-03 | Tampering | the D-03 test weakened to pass after the move | medium | mitigate | `QuestionsPanel.thunk.test.tsx`'s only commit is ecc7d463 (RED, recorded in 56-03-SUMMARY); green unedited after 56-07, three consecutive runs 5/5 | CLOSED |
| T-56-04 | Denial of Service | a host throw escaping `makeGatesFeed`, `configure`, the listener or a tick | high | mitigate | 7 `try` blocks in `GatesFeed.ts` around every host call; stating is total; T3, G37 and G46 pin it | CLOSED |
| T-56-05 | Spoofing | the thunk's failure stated as the registry's | medium | mitigate | two distinct fallback sentences ("The registry threw…", "The questions threw…") in `GatesFeed.ts`; T3 asserts the questions sentence | CLOSED |
| T-56-06 | Elevation of Privilege | a closed feed running host code | medium | mitigate | `runs.closed()` guards the listener, the watch and `configure` (3 sites); release finalizer registered before the superseding run; G35, G36 | CLOSED |
| T-56-07 | Tampering | a stale registry's listener reading a handed-away registry | medium | mitigate | the listener reads `registryNow`, never its caller; G42 and G47 assert the old registry's reads do not move after the swap | CLOSED |
| T-56-08 | Denial of Service | a throwing release run twice, or a close that throws | medium | mitigate | the handle leaves the feed's state before it is called; G42 and G42 b assert one call and a successful `Scope.close` | CLOSED |
| T-56-09 | Tampering | `qadi-questions-failed`'s reason rendered as markup | medium | mitigate | the reason is a JSX text child (`QuestionsPanel.tsx:186-188`); `a reason is shown as text` case; 0 `dangerouslySetInnerHTML` in `packages/devtools/src/react` | CLOSED |
| T-56-10 | Repudiation | a failure view claiming rows it could not read | low | mitigate | `QuestionsView.Failed` is `{ readonly reason: string }` (no rows, `Gates.ts`); render case asserts no `qadi-question-block` beside it | CLOSED |
| T-56-11 | Denial of Service | the diagnostics poll stopped by a throwing thunk | high | mitigate | 0 thunk sampling left in `DiagnosticsStore.ts`; the thunk is read only in the feed's guarded tick; J2 and the D-03 test assert `Live` with the failure stated | CLOSED |
| T-56-12 | Information Disclosure | a join pairing the new reading with a handed-away registry | medium | mitigate | `rejoin` is pure over the feed's snapshot; `configure` re-watches before the merge publishes; J8 and M47 | CLOSED |
| T-56-13 | Repudiation | `questions` in `extra` silently ignored | medium | mitigate | `type FeedOwnedKey = "layer" \| "questions"` (`packages/react/src/DevtoolsFeed.ts:100`); tstyche pin that `useDevtoolsFeed` is not callable with `{ questions }` | CLOSED |
| T-56-14 | Tampering | evidence config or report in the repository, or the gate config edited | medium | mitigate | 0 Stryker config or report files added; `stryker.devtools.mjs` unchanged; evidence config and report stayed in the scratchpad | CLOSED |
| T-56-15 | Repudiation | ADR-QD-169's mutation numbers not matching measurement | low | mitigate | 56-10's verify recomputed every `(detected/scored)` from the committed JSONs; ADR `## Mutation` carries 90/95→86/87, 60/60→57/57, 145/145→114/114, 66/66→70/70, `GatesFeed.ts` 118/118 | CLOSED |
| T-56-16 | Repudiation | a REQUIREMENT still naming `questions` as a poll option or a deleted test | low | mitigate | 56-10's verify refuses each false sentence and any deleted M case in doc 28; eight BEHs corrected in place with dated CCR-QD-447 notes | CLOSED |
| T-56-17 | Repudiation | an INV heading whose slug differs from the BEH links, or a §4 row naming a missing test | low | mitigate | INV-QD-357/358 headings match 56-10's anchors; `spec:verify:strict` PASS 21 FAIL 0 (56-12, again inside 56-13's `check:pr`) | CLOSED |
| T-56-18 | Denial of Service | a downstream listener throwing inside a cadence publish | low | accept | See Accepted Risks | CLOSED |
| T-56-19 | Tampering | a changeset naming the wrong package or bump, or a release step | medium | mitigate | exactly two changesets added (`devtools-questions-is-a-dock-input.md`, `react-feed-hands-questions.md`), each one package at `minor` with one `**Breaking.**`; 0 CHANGELOG changes; no remote branch contains HEAD; no tag contains a phase commit | CLOSED |
| T-56-20 | Repudiation | GFED rows marked without the gate behind them, or WX rows flipped | medium | mitigate | 56-13 marked GFED-01..05 only after its scan and `check:pr` exit 0; 0 WX rows checked in `REQUIREMENTS.md` | CLOSED |

---

## Accepted Risks Log

| Risk | Rationale | Owner / Review |
|------|-----------|----------------|
| T-56-18: a downstream listener that throws inside the feed's cadence publish ends the cadence | Same behaviour as a throwing listener in the poll's `accept`, which ends the poll. The dock's only listener is `DockModel`'s pure `rejoin`, which does not throw. Severity low, below the `high` block threshold | Accepted at plan time (56-04 threat model); orchestrator-verified 2026-11-18 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-18 | 21 | 21 | 0 | orchestrator (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-18
