---
phase: "QD-88"
slug: "stoppedbox-keys-itself-and-owns-the-announce-once-rule"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 19
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-26"
---

# Phase QD-88 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| a feed's stop → a screen-reader user | the alert role is the only signal a stop arrived; a lost or repeated alert is an accessibility regression |
| the ledger → a screen-reader user | a wrong key or announce rule repeats or silences an alert |
| the reason text → the DOM | a stack trace rendered as a React text child (output encoding by React, unchanged markup) |
| unmeasured React files → the stop guarantee | no mutant is made of `src/react`, so a rule held there could break unseen |
| the measured module → the guarantee | an unkilled mutant is a rule no test holds |
| held tests → the change | a held test edited to fit the change would hide a lost behaviour |
| phase scripts → the commit history and the phase verdict | the scorer, its base record, the pinned check and the judges are trusted by every later compare |
| earlier phase scripts → this phase's tree | Phase 85/86/87 checks run from scratch copies; their directories are read-only |
| the spec → future changes | a normative record that disagrees with the code misleads the next change |
| the changeset → a future release | a wrong bump or text misleads consumers |
| the branch → the registry and main | nothing crosses: no push, tag or publish |

---

## Threat Register

Built from the `<threat_model>` blocks of `88-01-PLAN.md` … `88-10-PLAN.md` (authored at plan time). T-88-SC repeats in every plan; it is listed once. No SUMMARY carries a threat flag (all ten say "None").

| Threat ID | Category | Severity | Disposition | Evidence | Status |
|-----------|----------|----------|-------------|----------|--------|
| T-88-01 | Repudiation (mutation base, red evidence) | low | mitigate | `88-mutation-base.json` names `phase_base` 892c4d36, the invocation and every measured model blob; first commit since phase_base (`00618a5e`, `.planning/` only); dirty-tree refusal `88-mutation.mjs:85-89`, `:470`; every evidence line names its edit and run (`88-RED-EVIDENCE.md:3`) | CLOSED |
| T-88-02 | Denial of service (a stop silenced or announced twice, through the dock) | medium | mitigate | A1-A5 (plain and StrictMode), H1-H3, C1 seen failing under base edits (`88-RED-EVIDENCE.md:7-61`); all pass at HEAD in a full devtools run (2087 rows, 0 failed, `suite --green`) | CLOSED |
| T-88-03 | Tampering (`88-check.mjs` judges) | medium | mitigate | `--self-test` 286 passed; all twelve modes seen failing on a real run (`88-RED-EVIDENCE.md:65-76`); `base`, `scan-ids`, `scan-forbidden`, `trailers`, `box-keys-itself`, `ledger-module`, `records --close` exit 0 at HEAD | CLOSED |
| T-88-04 | Repudiation (commit trailers) | low | mitigate | `commitsSince` reads `phase_base..HEAD` with no filter (`88-check.mjs:889-895`), `judgeTrailer` needs exactly one, the owner's (`:121-125`); `trailers`: 31 commits each with the one trailer; independent per-commit count agrees | CLOSED |
| T-88-05 | Tampering (held and born test text) | medium | mitigate | held set from `git ls-tree` at phase_base (`88-pinned-check.mjs:425`), moves judged (`:430`), regions with kept lines (`:59-113`); `--all-applied`: 130 held, 3 of 3 born, 5 of 5 declared edits; self-test 38; seen failing (`88-RED-EVIDENCE.md:80-85`) | CLOSED |
| T-88-06 | Tampering (earlier phase archives) | low | mitigate | copies to `$TMPDIR/qd88` (`88-earlier-checks.mjs:48`); re-run exit 0, every row matched (incl. the computed `87-pinned-check.mjs` exit 1); `git status` of `.planning/milestones` and QD-85/86/87 identical before and after; no diff to them since phase_base; self-test 46 | CLOSED |
| T-88-07 | Denial of service (`recordStop`, `stoppedKey`, `announcesStop`) | medium | mitigate | `StopLedger.ts:29-30`, `:37`, `:45-46`; L1-L6, LAW1-LAW3 pass; each seen failing under a variant (`88-RED-EVIDENCE.md:93-121`); Stryker close 12/12 Killed, 0 Survived, 4 Ignored examined; `compare` exit 0 | CLOSED |
| T-88-08 | Information disclosure (the ledger record) | low | mitigate | `StopLedger<S>` holds only `stop` and `count` (`StopLedger.ts:15-18`); the born-held `StopLedger.test.ts:35-57` types and `deepStrictEqual`s every recorded ledger as exactly `{ stop, count }`; `ledger-module` passes (see Observation 1) | CLOSED |
| T-88-09 | Denial of service (`StoppedBox` key and alert, `useStopNotice`) | medium | mitigate | wrapper keys the body `StoppedBox.tsx:92-94`; alert fixed at mount `:108`; record at commit `:109`; reducer per feed `useStopNotice.ts:19-20`; A1-A5, H1-H3, C1, DS1-DS3, D7, D8, N9, N12, TN14, TN15 pass; `box-keys-itself` passes; 13 variants caught (`88-RED-EVIDENCE.md:137-312`) | CLOSED |
| T-88-10 | Information disclosure (the reason block) | low | accept | reason markup not in the phase diff; `{reason}` a React text child of `<pre>` (`StoppedBox.tsx:128-132`); no `innerHTML`/`dangerouslySetInnerHTML` in devtools src; SB1, SB4 pass | ACCEPTED |
| T-88-11 | Elevation of privilege (package exports) | low | mitigate | twelve `@ts-expect-error` refusals (`surface.tst.ts:313-346`), tstyche: 62 of 62 suppressions matched; both barrels and `DevtoolsDock.tsx` have no diff since phase_base; `pnpm spec:api` exit 0 (942 exports, 9 packages); ledger imported only by the box and the hook | CLOSED |
| T-88-12 | Denial of service (`src/react` stop path, unmeasured) | medium | mitigate | thirteen variants V1-V10, H3, VN1, VN2 each caught by named rows (`88-RED-EVIDENCE.md:137-312`); V2 by H1, C1 (`:155-158`), V6 by H2 (`:197-199`), V8 by C1 (`:231-233`); the unmeasured files are named in `88-mutation-base.json` | CLOSED |
| T-88-13 | Tampering (the tree during variant runs) | low | mitigate | `git status --porcelain --untracked-files=all -- packages stryker.devtools.mjs` empty at HEAD; no `.stryker-tmp/`; the pinned check holds every base test byte for byte | CLOSED |
| T-88-14 | Tampering (`88-mutation.mjs` `EXAMINED`) | medium | mitigate | `EXAMINED` per file, kind and count (`88-mutation.mjs:54-62`), added in `5951ac77` after the hand run seen Killed 16/16 (`88-RED-EVIDENCE.md:316-320`); `EQUIVALENT` empty (`:48`); `compare` exit 0; self-test 68; no `// Stryker disable` in devtools src | CLOSED |
| T-88-15 | Repudiation (the changeset) | low | mitigate | `.changeset/devtools-stop-box-keys-itself.md`: `"@qadi/devtools": patch`, one sentence, "No export changes"; still unconsumed in `.changeset/`; no `CHANGELOG`/`package.json` change | CLOSED |
| T-88-16 | Repudiation (spec records and revisions) | low | mitigate | `records --close` exit 0; `pnpm spec:verify:strict` PASS 21 FAIL 0; ADR-QD-201 written and indexed, ADR-QD-197 amended (`spec/decisions/index.yaml`) | CLOSED |
| T-88-17 | Elevation of privilege (release surfaces: push, tag, publish, version) | high | mitigate | no remote branch contains HEAD or the first phase commit `00618a5e`; no tag contains phase_base; no `package.json`, `CHANGELOG`, lockfile, workspace or changeset-config change since phase_base; the phase changeset is unconsumed | CLOSED |
| T-88-18 | Tampering (commit scope) | medium | mitigate | no commit since phase_base touches a `NEVER_STAGED` path (`88-check.mjs:55-66`), `AGENTS.md`, `scripts/check-house-style.mjs`, `.oxlintrc.json` or another phase directory; outside `.planning/` only the 21 phase files; `trailers` passes | CLOSED |
| T-88-SC | Tampering (package installs) | high | accept | no package installed or added; fast-check 4.10.2 was already a devtools dev dependency; no manifest, lockfile or workspace change since phase_base | ACCEPTED |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-88-01 | T-88-10 | The reason block's markup and its React text rendering are unchanged by the phase (D-08); the stack text reaches the screen only as a React text child of a `<pre>`; no new sink | plan-time register (autonomous run) | 2026-11-26 |
| AR-88-02 | T-88-SC | No package was installed or added in any plan of this phase; no `package.json`, lockfile or workspace change since phase_base | plan-time register (autonomous run) | 2026-11-26 |

---

## Observations

Informational, not counted in `threats_open`.

1. T-88-08's mitigation plan says the `ledger-module` mode refuses any field beyond `stop` and `count`. It does not: `judgeLedgerModule` (`88-check.mjs:588-608`) checks the barrels, the ledger's imports, JSX, `use client`, its export list, who imports it and module-scope `let`/`var`, never the interface's fields. The two-field rule holds today in the code (`StopLedger.ts:15-18`) and is held mechanically by the born test held byte for byte by the pinned check: its typed `recorded` literals and the `deepStrictEqual` in L1, L3, L4 and L5 (`StopLedger.test.ts:35-57`) fail on an added field. Low severity; the plan text overstates the judge.
2. "The ledger holds an identity" means a live reference to the feed's stop value, which itself carries the reason text. The reducer keeps it until the next stop and only compares it by `===`; it reaches no sink, so nothing is disclosed.
3. Stryker measures only `StopLedger.ts`. `StoppedBox.tsx`, `useStopNotice.ts` and the two notices sit under `src/react`, which no Stryker config reaches. They are held by the thirteen recorded scratch variants (T-88-12), not by a mutation score. V8 (record effect keyed on `[announced, status]`) does not show in the DOM and only the commit-limit row C1 catches it.
4. The first phase commit `00618a5e` holds the base record with its scorer `88-mutation.mjs`, both under `.planning/`. "Committed alone first" is read as first commit, with nothing outside `.planning/` and no test or source in it.
5. The working tree has uncommitted edits to `README.md` and `.planning/config.json`. They were already there when the audit started, both are on the `NEVER_STAGED` list, and no phase commit touches them. They must stay out of the commit that adds this file.
6. A commit landed during the audit (`e6526ae0`, `88-VALIDATION.md` only). The audit trail's runs cover it: `trailers` counted 31 commits, and the release and scope checks ran against `e6526ae0`. The remote check reads only the locally fetched `origin/*` refs; nothing was fetched over the network.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-26 | 19 | 19 (17 mitigated, 2 accepted) | 0 | gsd-security-auditor, ASVS L1 grep-depth on HEAD e6526ae0 with re-runs: `88-check.mjs` base, scan-ids, scan-forbidden, trailers, box-keys-itself, ledger-module, records --close, --self-test (286); `88-pinned-check.mjs --all-applied` and --self-test (38); `88-earlier-checks.mjs` and --self-test (46); `88-mutation.mjs compare` and --self-test (68); devtools suite 2087 rows, 0 failed, `suite --green`; `pnpm spec:api`; `pnpm spec:verify:strict`; tstyche on `surface.tst.ts` (autonomous run) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-26
