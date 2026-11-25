---
phase: "QD-83"
slug: "the-diagnostics-feed-folds-its-reading-as-a-value"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 27
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-25"
---

# Phase QD-83 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The eleven plans register 26 numbered threats (T-83-01 to T-83-26) and `T-83-SC`, which each of the eleven plans repeats as
its own row. `T-83-SC` is one threat here, so the register has 27: 25 mitigate, 2 accept (T-83-12, T-83-18), 0 transfer.
By severity: 3 high (T-83-24, T-83-25, T-83-SC), 13 medium, 11 low.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Working tree → mutation record; command output → base facts | A record measured on a tree that is not the committed phase base, or a base fact written by hand, sets a false floor and a false comparison for every later gate | Stryker records, gate lines, the reservation file's sha256 |
| Check scripts → every later verify | A check that cannot fail passes every later plan whatever it did | `83-check.mjs`, `83-pinned-check.mjs`, `83-earlier-checks.mjs`, `83-mutation.mjs` |
| Held test files → the pinned check; Phase 81's directory → the scratch copy | A rewrite of a held test passes if the check accepts more than the declared changes; editing an earlier phase's script rewrites that phase's record | Test text, earlier-phase scripts |
| Feed internals → host listener; poll fiber → feed snapshot | A rewrite that moves the reading changes what a host's listener hears; a sample from a superseded run must never reach the reading a panel shows | The feed's publishes (`DiagnosticsSnapshot`), the sink's samples |
| Host listener → feed | A listener that throws on a publish must not leave the feed `Starting` with no poll (ADR-QD-194) | A thrown value out of `subscribe`'s listeners |
| Sampled reading → React snapshot | `useSyncExternalStore` compares by identity: an identity that moves without a change re-renders every panel, one that does not move hides a change | `Diagnostics` object identity |
| Published type → host code; packed artifact → consumer | A field leaving a published type breaks every host that reads it; the refusal must hold in what npm installs, not only in the workspace | `Diagnostics`, `DiagnosticsReading`, the packed `@qadi/devtools` |
| File moves → budgets; spec text → readers; decision and spec records → the next change | A budget naming a moved file stops counting its pins; a record that disagrees with the code leads the next change to restore what was removed | `NOT_CALLABLE_PIN_BUDGET`, AGENTS.md §6, traceability, ADRs, BEH/INV records |
| Test suite → mutation floor | A weaker suite would pass every gate while catching less | `83-mutation-base.json`, `83-mutation-close.json` |
| The phase's commits → the branch → the package registry | Commits on `arch-wave-15` (never pushed); a version, tag or publish would ship the breaking change outside review | Files staged, trailers, manifests, lockfile, changeset |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation / evidence | Status |
|-----------|----------|-----------|----------|-------------|-----------------------|--------|
| T-83-01 | Tampering | `83-mutation-base.json`, the scorer | medium | mitigate | The base record's `head` is `phase_base` bc02e8e6, the parent of 38fb5b28, the first commit after it and the only one touching the record (`git log` on the file); the plan's `b0b3cabc` differs from bc02e8e6 in no file outside `.planning/` (`git diff --name-only b0b3cabc bc02e8e6` outside `.planning/` is empty). `83-mutation.mjs` refuses a record from a modified tree (`dirtyReasons`, line 66), a report another invocation made (`reportReasons`, line 71, `config.mutate` against the record's file list) and a group measured on another head (`heldFor`, line 226); `--self-test` 44 passed at audit | closed |
| T-83-02 | Repudiation | base facts, the earlier-check lines | low | mitigate | `83-01-SUMMARY.md` "Base facts" holds the measured lines. At audit: `check-api-surface.mjs` prints the recorded `942 export(s)` unchanged; `check-house-style.mjs` prints 613, the recorded 610 plus the three test files the phase added; the reservation sha256 `e9c52607…` is the file's own now (`.git/qadi-reserved-ids.json`, unmodified since 2026-11-24); `83-earlier-checks.mjs` prints the base's seven lines, with only `79-pinned-check.mjs` on TF29 failing as at the base; `git diff bc02e8e6 HEAD` over `.planning/milestones` and the QD-81 and QD-82 directories is empty | closed |
| T-83-03 | Tampering | `83-check.mjs` | medium | mitigate | `83-RED-EVIDENCE.md` § "83-01 the check helper" has a `- check failed:` line for each of `commit`, `unchanged`, `seen-failing`, `scan-ids`, `scan-forbidden`, `trailers`, `registers`, `no-store`, `single-fold`, `stale-path` (lines 13-22), the last three failing on the base with their named reasons; `--self-test` 177 passed at audit; `83-check.mjs` and `83-pinned-check.mjs` contain no file-write call (`writeFileSync`, `copyFileSync`, `rmSync` and the like are absent), so a mode never edits the tree; `git status --porcelain` over `packages`, `scripts`, `spec`, `AGENTS.md` is empty and no `.orig`, `.rej` or `.bak` file exists in the tree | closed |
| T-83-04 | Tampering | `83-pinned-check.mjs` | medium | mitigate | An edit is taken out only when its `before` occurs once at the base and its `after` once now (lines 101-112); a held file `git diff -M --name-status` reports moved or deleted fails naming both paths (lines 143-155); `--self-test` 28 passed; seen failing on a blank line (`83-RED-EVIDENCE.md` line 136, `differs from its base text at line 1833`); `--all-applied` at audit prints `6 files hold their base text, 2 of 2 born files held, 1 of 1 declared flips applied`; a direct `git diff -U0 bc02e8e6 HEAD` over the four held test files shows only the four import specifiers and the one `F2` flip | closed |
| T-83-05 | Repudiation | Phase 81's record | medium | mitigate | `83-earlier-checks.mjs` runs Phase 81's checks from `$TMPDIR/qd83/p81/` copies (self-test 13 passed) and printed at audit `81-pinned-check.mjs: exit 0 … 5 of 5 declared flips applied`, `single-source`, and the archived lines with only the TF29 line of `79-pinned-check.mjs` failing, exactly the base's lines; `git diff --quiet bc02e8e6 HEAD` over `.planning/milestones` and the QD-81 and QD-82 directories holds | closed |
| T-83-06 | Tampering | the publish sequence of `makeDiagnosticsFeed` | medium | mitigate | `DiagnosticsFeed.characterisation.test.ts` FC1-FC11 pin every publish (status tag, sampled flag, per-field identity); it is a born file held from its adding commit by `83-pinned-check.mjs` (2 of 2 born files held at audit); seen failing without the guard (FC9) and without the keep (FC2, FC3, FC4, FC7, FC8, FC9, FC10) in `83-RED-EVIDENCE.md` lines 162-176; green at audit (10 test files, 196 tests) | closed |
| T-83-07 | Denial of service | a superseded run writing into the live feed | medium | mitigate | `DiagnosticsFeed.ts:188` returns before the snapshot is read (`:189`), folded (`:190`) or `sampled` set (`:191`) when `runs.isCurrent(token)` is false; the only two writes to the view are `show` (`:180`) and `off` (`:218`), and `show` is reached from the guarded sink, from `start`'s `Starting` and from `onFailure`, which `SupersedingRun.ts:120` gates on `isCurrent`; FC9 (`characterisation.test.ts:232`), F33 (`DiagnosticsFeed.test.ts:688`) and SR1 (`DiagnosticsFeed.superseded.test.ts:23`) pin the dropped sample; FC9 red without the guard | closed |
| T-83-08 | Tampering | `NOT_CALLABLE_PIN_BUDGET`, the AGENTS row | medium | mitigate | `scripts/check-house-style.mjs:771` and `AGENTS.md:566` both name `packages/devtools/test/model/Diagnostics.tst.ts` with `3 | 0` unchanged (the whole diff of the two files against the base is those two lines); `node scripts/check-house-style.mjs` prints `613 file(s) clean` at audit; `83-check.mjs registers` passes (budget, AGENTS.md and traceability name the file alike); `83-RED-EVIDENCE.md` line 19 shows `registers` failing when the key is moved out | closed |
| T-83-09 | Repudiation | change history | low | mitigate | `83-check.mjs stale-path` exempts CCR rows, blockquotes, Change History cells, ADRs and changelogs (self-test lines 804-805) and passes at audit; the removed content lines of the spec registers are live path references or restated live descriptions, and no history row is rewritten (a character diff of every removed line against its replacement) | closed |
| T-83-10 | Tampering | a silent behaviour change inside the rename | medium | mitigate | `git show -M 77247c8f` reports `R100` for `DiagnosticsStore.ts` to `Diagnostics.ts`, `R099` and `R098` for the two test files, and every changed line under `packages/` is an import specifier, a doc comment or the barrel's group order (the one non-import line is `export type {` moved); the characterisation and held tests are unchanged and the devtools tests pass at audit | closed |
| T-83-11 | Tampering | `Diagnostics` (public type) | medium | mitigate | `.changeset/devtools-diagnostics-has-no-questions.md` is a `"@qadi/devtools": minor` entry opening with `**Breaking.**`; `upgrading.md` has the `0.13: Diagnostics has no questions field` section with a Before block and a `typescript` After fence (compiled by `spec:website-examples`, 77 blocks, in `check:pr`); `Diagnostics.ts:114` keeps `DiagnosticsReading.questions`, so no data is lost; `pnpm test:tstyche` over `packages/devtools/test` passes at audit (11 files, 53 tests): `Diagnostics.tst.ts:64` and `surface.tst.ts:312-313` pin the type as exactly four fields | closed |
| T-83-12 | Information disclosure | the questions join | low | accept | Accepted (AR-83-01). Verified the premise holds: `DockModel.ts:386` reads `held.reading?.questions` and the only `DockModel.ts` change in the range is the import specifier and a doc comment; MR1 (`DockModel.reading.test.ts:15`) and MR2 (`:25`) and FC11 (`characterisation.test.ts:283`) pin the value and the timing | closed |
| T-83-13 | Tampering | the packed artifact | medium | mitigate | `scripts/check-package-install.mjs:126` names `["Diagnostics", "questions"]` in `REFUSED_SHAPE_PROBES`; the consumer declares a `Diagnostics` literal whose `questions` carries `@ts-expect-error` (`:770-776`, an unused directive fails the compile) and `expect`s the packed feed's live reading has no `questions` key (`:761`); the gate fails when a probe name has no refused literal (`:1063-1068`). Cited from the orchestrator's run, not re-run: `pnpm spec:package` exit 0 (9 packages, 527 runtime exports) at 13763f9f and again after the last review fix (`spec-package-2.out`) | closed |
| T-83-14 | Denial of service | `foldReading` | low | mitigate | `Diagnostics.ts:144` `keep` returns `previous` while `Equal.equals` holds, and `:166` returns `previous` itself when `sameFields(folded, previous)`; `Diagnostics.test.ts:127` (identical samples fold to one identity) and `:103`, FC3 (`characterisation.test.ts:109`) pin that a quiet poll publishes nothing; `Diagnostics.ts` is 32/32 with no open mutant | closed |
| T-83-15 | Tampering | a field added to `Diagnostics` later | low | mitigate | `Diagnostics.ts:160` types the result `Diagnostics` and builds an object literal naming each field, so a new field is a compile error; `Diagnostics.test.ts:90` (`moved: Diagnostics`) and `:96-101` rows with the test at `:108` (`rows` fields equal `Object.keys(moved)`) fail at run time when a field has no row; `surface.tst.ts:313` pins `keyof Diagnostics` | closed |
| T-83-16 | Tampering | the feed's per-run sink | medium | mitigate | `if (!runs.isCurrent(token)) return;` is the first statement of `sink.accept` (`DiagnosticsFeed.ts:187-188`), before the snapshot read, the fold and the `sampled` write; FC9, F33 and SR1 (which stops the newest run before its first sample, so a flag set above the guard would read `sampled true`) pin it; `DiagnosticsFeed.ts` is 59/59 with no open mutant | closed |
| T-83-17 | Denial of service | `start()` | medium | mitigate | `DiagnosticsFeed.ts:202-212` keeps `try { show(Starting …) } finally { runs.fork(…) }`; F31 (`DiagnosticsFeed.test.ts:640`: a listener throwing on the `Starting` is rethrown once the new poll started, the feed ends `Live`) and F32 (`:665`) pass at audit; the Phase 81 `DockModel.listeners` rows pass | closed |
| T-83-18 | Information disclosure | `Stopped.reason` | low | accept | Accepted (AR-83-02). Verified: `DiagnosticsFeed.ts:207` still builds the reason with `causeMessage(cause)` (as at the base, line 205 there), and the type's doc (`:51-57`) says it is for a developer in the host's own process and must not cross a trust boundary; ADR-QD-173 decision 7 (line 64) states the rule | closed |
| T-83-19 | Repudiation | ADR-QD-047, ADR-QD-169, ADR-QD-173 | low | mitigate | `git diff -U0 bc02e8e6 HEAD` over the three ADRs removes only the Revision row and the Change History cell (re-emitted with a new first entry); each gains a dated `Amendment (2026-11-25 …)` section beside the past text and a link to ADR-QD-196; the traceability rows for the three ADRs lose no character | closed |
| T-83-20 | Tampering | the reserved ids | low | mitigate | Added lines outside `.planning/` carry only ADR-QD-196, CCR-QD-475, ARCH-130, BEH-QD-751 to 755 and INV-QD-411 and 412 as new ids (the older ids found are history cells re-emitted on a changed line); no `-NEXT` id; `83-check.mjs scan-ids` passes; `pnpm spec:verify:strict` prints `PASS: 21 FAIL: 0 SKIP: 0` at audit | closed |
| T-83-21 | Repudiation | the restated behaviours | low | mitigate | `spec/behaviors/28-devtools-screens.md` removes 3 content lines (each a test path with `Store` dropped) against 186 added, besides its Revision and Change History rows; `spec/invariants.md` removes 7 content lines, each the same path change; no requirement text or old decision citation is removed (character diff of each removed line against its replacement); `scan-ids` passes | closed |
| T-83-22 | Tampering | the reserved numbers | low | mitigate | BEH-QD-751 to 755 are in `28-devtools-screens.md` and traceability, INV-QD-411 and 412 in `invariants.md` and traceability, ADR-QD-196 in `decisions/index.yaml:613` and its file; the CCR-QD-475 row (`spec/README.md:412`) states "every reserved number is used; none is left Unused"; gate 10 (`spec:verify:strict`) passes 21/0 at audit | closed |
| T-83-23 | Tampering | the mutation floor | medium | mitigate | `83-mutation.mjs compare` exits 0 at audit: `DiagnosticsFeed.ts` 60/60 to 59/59, `Diagnostics.ts` (base `DiagnosticsStore.ts`, read through `git diff -M -U0`) 57/57 to 32/32, `DockModel.ts` 65/65 to 65/65, survived 0, no coverage 0, ignored 14, 6, 12 with 0 new, and "every score that fell lost only killed mutants"; the two diagnostics files are judged absolutely (`ABSOLUTE`, line 41); the base record has one commit (38fb5b28) and the close record's `head` cac3004f is after the last review fix with the three measured files identical to HEAD; no survivor existed, so no survivor test was needed | closed |
| T-83-24 | Elevation of privilege | a release or push of the phase | high | mitigate | `git tag --contains bc02e8e6` prints nothing; no remote-tracking ref contains the base or any of the 43 phase commits, and a live `git ls-remote origin` (288 refs) lists none of the phase commits, no `arch-wave-15` head, and none of the 12 branch heads contains the base (remote `main` 5784bbd6 is an ancestor of HEAD); no check script calls `git push`, `git tag`, `changeset version` or a publish | closed |
| T-83-25 | Elevation of privilege | a release from this branch | high | mitigate | No tag contains the base; `git diff bc02e8e6 HEAD` lists no `CHANGELOG.md` and no `package.json`, so no version changed; `.changeset/` gains only `devtools-diagnostics-has-no-questions.md` (status `A`, no deletion, so nothing consumed); no commit subject in the range is a version, publish or merge | closed |
| T-83-26 | Repudiation | requirement completion | low | mitigate | `.planning/REQUIREMENTS.md` marks DIAG-01 to DIAG-04 `[x]` and `Complete` in da589000 (06:04:04), after `check-pr.exit` (06:02:51) and `spec-package.exit` (06:03:03) read 0; the gate facts are in `83-11-SUMMARY.md`; after the review fixes both gates were re-run (`check-pr-2.out`, `spec-package-2.out`, 06:29) | closed |
| T-83-SC | Tampering | npm/pip/cargo installs | high | mitigate | `git diff bc02e8e6 HEAD` over `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` and every `package.json` under `packages/` and `apps/` is empty (`83-check.mjs unchanged` over the root manifest, the lockfile, the workspace file and the nine package manifests exits 0); the range's file list holds no `package.json`, lockfile or workspace file | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-83-01 | T-83-12 | The questions join reads `held.reading?.questions` as before; nothing new crosses the dock, and the timing is pinned by MR2 and FC11 (plan 83-05 threat register, information disclosure of the questions join) | Plan 83-05 threat register (accept) | 2026-11-25 |
| AR-83-02 | T-83-18 | `Stopped.reason` keeps `causeMessage`'s text unchanged; it is documented as for a developer in the host's own process and not for a trust boundary (ADR-QD-173 decision 7) (plan 83-07 threat register) | Plan 83-07 threat register (accept) | 2026-11-25 |

Both accepted risks are low severity and below the `high` block threshold.

Observations, not register entries and not counted in `threats_open`:

- **A commit without the trailer, since resolved.** At audit time 42 of the 43 commits in `bc02e8e6..HEAD` carried exactly one
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` line; `docs(83): add code review report` (then `3d7dac8b`) carried
  none. The orchestrator rebuilt that commit and the eleven after it with `git commit-tree`, the trailer added and author and
  committer dates kept (nothing had been pushed), and remapped the hashes the phase records cite. It is now `d36090d3`, and
  every one of the 43 commits carries exactly one trailer. The rebuilt trees differ from the old ones only in those hashes.
- **SR1's red, since recorded.** At audit time `83-VALIDATION.md` said the WR-01 test and SR1 were "seen failing in
  `83-REVIEW-FIX.md`", which records only the fix commits. The orchestrator saw both fail again under scratch edits
  (`sampled-above-guard`, `fifth-field`), restored the source with `cp`, recorded the lines in `83-RED-EVIDENCE.md`
  ("Review fixes: the raw-sample pin and SR1"), and corrected the validation wording; `83-check.mjs seen-failing` now
  passes for both files. SR1 sits beyond the register: T-83-07 and T-83-16 close on the guard's position, FC9 and F33.
- **The audit head is one docs commit past the cited facts.** 7f425399 adds only `83-VALIDATION.md` to 13763f9f, where the
  orchestrator verified the gates; nothing outside `.planning/` differs between them.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-25 | 27 | 27 | 0 | gsd-security-auditor (ASVS L1, block_on high), at 7f425399 (source, tests, spec, scripts and changeset identical to 13763f9f outside `.planning/`) |

Checks run at audit, from the repository root with stdin closed: ten devtools test files (`Diagnostics*`, `DockModel*`,
`useDiagnostics`, `DiagnosticsScreens`: 196 passed); `pnpm test:tstyche` over `packages/devtools/test` (11 files, 53 tests);
`pnpm spec:verify:strict` (21 PASS, 0 FAIL); `node scripts/check-house-style.mjs` (613 clean) and `check-api-surface.mjs` (942);
`83-mutation.mjs compare` (exit 0) and `--self-test` (44 passed); `83-check.mjs` `base`, `scan-ids`, `scan-forbidden`,
`trailers`, `no-store`, `single-fold`, `stale-path`, `registers`, `unchanged` over the twelve manifest paths (root, lockfile, workspace, nine packages), `seen-failing`
for the characterisation and `DockModel.reading` files, and `--self-test` (177 passed); `83-pinned-check.mjs` plain and
`--all-applied`, and `--self-test` (28 passed); `83-earlier-checks.mjs` and `--self-test` (13 passed). Git: the commit range
(43 commits, all by one author), tags, local remote-tracking refs and a live `git ls-remote origin`, the manifest, lockfile,
workspace and CHANGELOG diffs, and the added-id and removed-line diffs of the spec files. No implementation file was written;
`git status --porcelain` over `packages`, `scripts`, `spec`, `AGENTS.md`, `.changeset` and `apps` is empty after the runs, and
no commit in the range lists `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/`, `*.iter*.md`,
`.review-diagnostics/` or `.gitkeep`. Facts cited from the orchestrator's run at 13763f9f, not re-run: `pnpm check:pr` exit 0
(17 of 18 steps, 6628 unit tests, strict traceability 21/0, api-surface 942), `pnpm spec:package` exit 0 (9 packages, 527
runtime exports), the mutation close re-taken after the review fixes, and the review converged clean in 3 iterations with 0 open.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-25
