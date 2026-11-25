---
phase: "QD-84"
slug: "useconfigured-requires-configure-and-the-review-s-small-fin"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 31
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-25"
---

# Phase QD-84 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Working tree → mutation record; close record → the phase's claim | The base and close Stryker records stand for the source they were measured on | Scores, survivors, head commits |
| Command output → base facts; check script → every later verify | Measured base facts and checks that must be able to fail | Gate lines, reservation sha256, pass/fail |
| Held tests → the claim of no behaviour change; scratch copy → Phase 83's directory | A held test rewritten in place, or an earlier check run in place, would change what "unchanged" means | Test text, earlier-phase records |
| Characterisation tests and scratch edits → committed tree | A row that cannot fail, or a scratch edit left in place, would pass or ship a broken adapter | Pass/fail lines, source text |
| Host page DOM and pointer events → lens adapter; lens click handler → host page; overlay → reviewer | The page's guard elements drive the adapter; `choose`'s answer decides whether the host page receives the click; the overlay says which element is gated | Pointer events, guard elements, the consumed answer, the overlay |
| Stop notice → assistive technology; Restart button → feed | The alert role decides what a screen reader announces; a Restart that reaches a closed model restarts nothing | Stop statuses, restart calls |
| Host re-render → timeline feed | A host that re-renders every frame must not restart the read it is watching | Per-render inputs record |
| Hook caller → `useConfigured`; package-private module → public entry points | A value that cannot take its inputs, or an internal type reaching a barrel, becomes a public export | The `configure` constraint, barrel exports |
| Records (ADRs, BEH/INV, traceability, README, changeset) → readers and the next change | Claims a later change will rely on | Claims about behaviour, test names, reserved ids |
| Branch → registry and remote; the phase's commits → the branch | A version, tag, publish or push would ship the phase outside review; commits carry only the intended files and trailers | Tags, versions, refs, staged files, trailers |
| Gate → the phase's completion record | Completion recorded on a red or partly run gate would misstate the phase | Gate exit codes |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation / evidence | Status |
|-----------|----------|-----------|----------|-------------|-----------------------|--------|
| T-84-01 | Tampering | `84-mutation-base.json` | medium | mitigate | Only ff0be2b4 touches it; its parent e0327e7d equals `phase_base` outside `.planning/`, and every commit before it changes only `.planning/`; `84-check.mjs base` exit 0; `dirtyReasons` and the `config.mutate` check in `84-mutation.mjs` (self-test 44) | closed |
| T-84-02 | Repudiation | `base-facts.txt`, earlier-check lines | low | mitigate | Reservation sha256 equals a fresh `shasum`; house-style 613 → 617 files is the three characterisations and `useStopNotice.ts`, 77 → 78 type-test files is `useConfigured.tst.ts`; api-surface 942 equals the base fact; the Phase 83 checks recorded exit 0 with the expected TF29 line | closed |
| T-84-03 | Tampering | `84-check.mjs` | medium | mitigate | `84-RED-EVIDENCE.md` § 84-01 shows each mode failing once; the four structural modes fail on the base with named reasons; self-test 216; no scratch edit left (`git diff HEAD -- . ':!.planning'` empty) | closed |
| T-84-04 | Tampering | 16 held files, `Lens.adapter.test.tsx`, `useConfigured.test.tsx`, `surface.tst.ts` | medium | mitigate | `84-pinned-check.mjs --all-applied` exit 0 (16 held, 2 of 2 edits, 1 of 1 edit from f6e3e6ff, 8 of 8 refusals, 3 of 3 born files); `test/model` unchanged; RED-EVIDENCE § 84-02 shows the check failing on a scratch edit | closed |
| T-84-05 | Tampering | Phase 83 directory and archive | low | mitigate | Outside `QD-84-*`, the phase changed only REQUIREMENTS.md, ROADMAP.md and STATE.md under `.planning/`; QD-81, QD-83 and `.planning/milestones` untouched | closed |
| T-84-06 | Spoofing | lens overlay over the host page | medium | mitigate | LQ1, LQ2, LQ3 in `Lens.questions.characterisation.test.tsx` pass and were seen failing (stale-draw, captured-guards); `useLens.ts` draws only over its one questions subscription | closed |
| T-84-07 | Tampering | `useLens.ts`, `LensSession.ts` | medium | mitigate | No `src/` change before the first refactor (7f3a9c68); the characterisations (b625c7d1, 91537372, 3378b8ee, f6e3e6ff) and the arm-before-publish evidence (92832d5f) are its ancestors | closed |
| T-84-08 | Repudiation | the two stop notices' announcements | low | mitigate | DS1 and DS2 pass and were seen failing under a shared ledger (RED-EVIDENCE § 84-04) | closed |
| T-84-09 | Denial of service | Restart buttons after a rebuild | low | mitigate | DS3 passes and was seen failing with swapped restarts; `DevtoolsDock.tsx` passes each feed's own `restart` | closed |
| T-84-10 | Denial of service | `useTimeline`'s per-render inputs record | low | mitigate | TI1..TI3 pass; TI1 and TI2 fail with `Maximum update depth exceeded` when the same-fields early return is removed (RED-EVIDENCE § 84-05); the memo is a recorded rejection in ADR-QD-197 | closed |
| T-84-11 | Tampering | `useConfigured.test.tsx` | low | mitigate | U1..U4 pass, each seen failing (no-tap, swallowed-throw, value-only-key, first-inputs); held from f6e3e6ff | closed |
| T-84-12 | Tampering | `useConfigured`'s constraint | medium | mitigate | `<A extends Configurable<I>, I>` with `readonly configure: (inputs: I) => void`; `useConfigured.tst.ts` has the positive pins and four `@ts-expect-error` refusals with twins, seen failing under a loosened constraint and under a method signature (RED-EVIDENCE § 84-06, § Review fixes) | closed |
| T-84-13 | Information disclosure | `Configurable` reaching a barrel | low | mitigate | `surface.tst.ts` refuses it from both entries; neither barrel names `Configurable`, `UseLens`, `useStopNotice` or `StopNoticeProps`; refusals seen failing under scratch exports | closed |
| T-84-14 | Tampering | inference at the three call sites | low | mitigate | `useDockModel.ts`, `useTimeline.ts`, `useDiagnostics.ts` call `useConfigured` with no type argument; the return-type pins pass; typecheck is step 1 of `check:pr` | closed |
| T-84-15 | Tampering | `choose`'s arming order | low | mitigate | `LensSession.ts:167-168` arms then sets; "a listener told of a pick can take its reveal" passes and was seen failing with arm-after-set (RED-EVIDENCE § 84-07); `no-restated-set` exit 0 | closed |
| T-84-16 | Elevation of privilege | `choose`'s answer (a pick click reaching the host page) | medium | mitigate | `if (next === current) return false;` before the arming, `return true` after `store.set(next)`; the held property (answer equals changed) passes with the model tests byte-unchanged; the adapter's `preventDefault`/`stopPropagation` path is unchanged and its consumed-click row passes | closed |
| T-84-17 | Spoofing | overlay drawn over the wrong guard | medium | mitigate | One `useStoreSnapshot(questions)` then one for the lens; the draw reads `read.instances` and the handlers `questions.getSnapshot().instances`; `one-path` exit 0; LQ1..LQ3 pass | closed |
| T-84-18 | Denial of service | document listeners outliving unmount | medium | mitigate | The listener and unmount-cancel effects are unchanged; "stops listening when the panel unmounts" and "a switch to the log while picking ends picking and leaves no listener" pass; LQ4 asserts no subscription after unmount | closed |
| T-84-19 | Repudiation | the lens records | low | mitigate | `records` and `records --close` exit 0; strict traceability PASS 21 FAIL 0; ADR-QD-193's amendment keeps decision 6's past text; `spec-revise --check` passes | closed |
| T-84-20 | Repudiation | one ledger shared by both notices | low | mitigate | `useStopNotice.ts` holds the one `useRef<StopLedger` in `src`, called twice by `DevtoolsDock.tsx`; `one-ledger` exit 0 | closed |
| T-84-21 | Denial of service | Restart reaching a closed model | low | mitigate | `useMemo(…, [status, onRestart])` follows the feed's `restart`; DS3 passes and was seen failing | closed |
| T-84-22 | Information disclosure | `useStopNotice` / `StopNoticeProps` reaching a barrel | low | mitigate | Four refusals in `surface.tst.ts`, seen failing under scratch exports (RED-EVIDENCE § 84-09) | closed |
| T-84-23 | Repudiation | ADR-QD-197's stated evidence | low | mitigate | Its quotes of `useTimeline.ts:69-71`, `DevtoolsDock.tsx:86` and the three call sites match `git show 8ff027e1:<path>` verbatim | closed |
| T-84-24 | Spoofing | the changeset claiming a host-visible change | low | mitigate | `"@qadi/devtools": patch`, names no package-private identifier, says nothing a host renders, receives or calls changes, ends "No export changes."; api-surface 942 unchanged | closed |
| T-84-25 | Tampering | reserved id use | medium | mitigate | The reservation file's sha256 equals the base fact (`next-id.mjs` never ran); BEH-QD-756..760, INV-QD-413..414, ADR-QD-197 and CCR-QD-476 each used; no id above the reservation; no `-NEXT` in added lines | closed |
| T-84-26 | Repudiation | traceability claiming tests that do not exist | low | mitigate | `records --close` exit 0; strict traceability PASS 21 FAIL 0 | closed |
| T-84-27 | Tampering | re-baselining the mutation base | medium | mitigate | One commit touches the base (ff0be2b4, the SUMMARY's `base_record`); the close (d2f005c2) used the identical invocation; `compare` exit 0 against the base floor; no survivor | closed |
| T-84-28 | Repudiation | close scans skipped or run on a dirty tree | low | mitigate | The scorer refuses a dirty tree and a foreign invocation (self-test 44); `LensSession.ts` unchanged since the close; every close check re-ran green at audit | closed |
| T-84-29 | Elevation of privilege | accidental push or release | high | mitigate | No tag holds a phase commit; no CHANGELOG or version changed; the changeset is unconsumed; `git ls-remote origin` shows no ref holding a phase commit and no `arch-wave-15` | closed |
| T-84-30 | Repudiation | a gate run beside another runner, or completion marked early | low | mitigate | `check:pr` exit 0 before the completion commit 219cb81b; the failed first run is kept and disclosed (84-13 deviation 1); after the review fixes `check:pr` and `spec:package` exit 0 again at ce02fbc7 | closed |
| T-84-SC | Tampering | package installs | high | mitigate | `git diff 8ff027e1..HEAD` over `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `packages/*/package.json` is empty; `spec:publish` shows 9 packages on 0.12.0 | closed |

Commit hygiene, checked over every commit in `8ff027e1..HEAD`: each carries exactly one
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, and none lists `.planning/config.json`,
`.planning/state.json`, `.agents/`, `.codex/`, `*.iter*.md`, `.review-diagnostics/` or `.gitkeep`. `AGENTS.md`,
`scripts/`, `spec/scripts/` and `.oxlintrc.json` are unchanged from `phase_base`.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| None | n/a | Every threat in the 13 plans has disposition `mitigate`; none is accepted or transferred | n/a | 2026-11-25 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-25 | 31 | 31 | 0 | gsd-security-auditor (ASVS L1, block_on high), at 8a45e6be |

Not re-run by the auditor, with the phase's recorded outputs standing for them: `84-earlier-checks.mjs` (it writes
scratch copies), the full `pnpm check:pr` (green at ce02fbc7) and Stryker (`LensSession.ts` unchanged since the close).
"No version-packages PR merged" is not checkable from the repository; the unchanged versions, CHANGELOGs, tags and
remote refs support it.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-25

## Security Audit 2026-11-25

| Metric | Count |
|---|---|
| Threats found | 31 |
| Closed | 31 |
| Open | 0 |
