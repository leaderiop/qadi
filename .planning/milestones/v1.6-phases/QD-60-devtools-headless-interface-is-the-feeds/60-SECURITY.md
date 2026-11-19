---
phase: "60"
slug: "devtools-headless-interface-is-the-feeds"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-19"
---

# Phase 60 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Audited on HEAD `366bcce7`, `phase_base` `35a48554` (23 commits). Every row below was checked against the tree, not against a SUMMARY's claim.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Feed `Stopped.reason` / `Failed.reason` → a host shell | Now public API: `makeTimelineFeed`, `makeDiagnosticsFeed` and `makeGatesFeed` hand a `Cause.pretty` trace (stack frames, checkout paths, layer internals) to whatever the shell does with it. The package never sends it; a shell may | `reason: string` |
| Host callbacks → feeds | The registry (`instances`, `subscribe`, its release handle), the questions thunk, the collector's `snapshot`, the handed `layer` and the `Source` are host code that runs inside the feeds | thrown values |
| `@qadi/devtools` packed `exports` map → consumers | A closed list: `.` and `./react`, no `./*` (ADR-QD-099). Phase 60 widens the *root's named list*, not the map | importable names |
| Phase evidence → gate | The D-10 comparer and the phase scan decide WX-05 and the order of work from committed files | mutation scores, commit order |
| Repo → npm | Release pipeline (nothing released this phase; one changeset written, never consumed) | package artifacts |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-60-01 | Tampering | `60-mutation-base.json` and `60-mutation.mjs` (re-baseline, narrowed `DELETED`, edited Stryker config) | medium | mitigate | `shasum -a 256 60-mutation.mjs` = `8cf52336…a026`, the pin in 60-01-PLAN. `git log phase_base..HEAD` for both files is the single `9e7e0dfe` `chore(60-01)`, the first commit after `phase_base`, holding those two files alone (the scan's rule 5 checks all three and is clean). 0 `stryker*` changes since `phase_base` | CLOSED |
| T-60-02 | Repudiation | reserved numbers (an id taken outside the reservation, `next-id.mjs` run) | low | mitigate | `qadi-reserved-ids.json` still reads `{CCR:452, ADR:174, BEH:645, INV:368}`. BEH-QD-636..640, INV-QD-365..366, ADR-QD-173 and CCR-QD-451 are each one heading or row (`28-devtools-screens.md:2444,2474,2517,2549,2578`, `invariants.md:4249,4261`, `173-*.md:1`, `spec/README.md:388`); no id at or past the reservation exists in `spec/`, `packages/`, `apps/`, `scripts/`; no `-QD-NEXT` placeholder. Scan rule 6 is clean | CLOSED |
| T-60-SC | Tampering | npm/pip/cargo installs | high | mitigate | `git diff --name-only phase_base HEAD` matches no `package.json`, `CHANGELOG*`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`. The src diff adds imports only from `./`, `../`, `effect/*` | CLOSED |
| T-60-03 | Repudiation | the RED evidence (fails by typo, suite edited beyond its imports) | medium | mitigate | Order: the three RED commits `9f9102b0`, `ecf7ccfe`, `22e330a8` precede the first src commit `6ad68e6d`, and `git diff --name-only phase_base ecf7ccfe` and `…22e330a8` over `packages/*/src/**` are empty. `TimelineFeed.test.ts` and `GatesFeed.test.ts` differ from `phase_base` in import lines only; `DiagnosticsFeed.test.ts` in imports plus the `DiagnosticsDockOptions` to `DiagnosticsOptions` type rename (7+/5-). The one later edit of a RED file is `5d297faf`: 4 lines in each `.tst.ts`, two positive `toBeCallableWith` pins turned into `expect(call(...)).type.toBe<Effect…>()`, recorded in 60-03-SUMMARY and CCR-QD-451, and the scan names that exact subject. The D-12 characterisation differs from `phase_base` at exactly lines 26 and 66 (`git diff`). Failure kinds on the base (AssertionError, `has no exported member`, `is not a function`, one interval test) are recorded in 60-02-SUMMARY; not re-run here | CLOSED |
| T-60-04 | Information disclosure | `Stopped.reason` (`DiagnosticsStatus`, `TimelineStatus`) and the gates feed's `Failed.reason`, all `Cause.pretty` | medium | mitigate | Doc comments say the trace is for the host's own process and must not cross a trust boundary: `DiagnosticsFeed.ts:51-57`, `TimelineFeed.ts:37-42`, `GatesFeed.ts:35-39` (`RegistryRead.Failed`), `GatesFeed.ts:49-53` (`AskedRead.Failed`). The same rule is stated in `packages/devtools/README.md:229-231`, `apps/website/.../packages/devtools.md:227-230`, `…/reference/upgrading.md:1061`, `spec/behaviors/28-devtools-screens.md:2504` (BEH-QD-637 REQUIREMENT), `spec/decisions/173-*.md:64` (item 7), `spec/overview.md:923` and `.changeset/devtools-headless-interface-is-the-feeds.md:5`. Nothing in the package sends it: `git grep` over `packages/devtools/src` for `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `postMessage`, `console.`, `process.env`, `localStorage`, `JSON.stringify` of a status finds none that touches a status (`Inspect.ts:306` and `SimulationForm.ts:170` stringify a value and a field name). The only readers of `reason` are `DockModel.ts:125,137` (into view state) and the dock's panels, which render it as a React text node (`StoppedBox.tsx:138-142` `<pre>`, `QuestionsPanel.tsx:158,187`, `ServicesPanel.tsx:78`). No other package imports `@qadi/devtools`' status types. The only logging in the package is `Source.ts:266,273`, a fixed message with tag-only annotations | CLOSED |
| T-60-05 | Elevation of privilege | the root barrel (an `export *`, a private engine re-exported, an added entry point) | low | mitigate | No `export *` in `src/index.ts` or `src/react/index.ts`. The runners and idle placeholders are not exported (`index.ts` names only `DiagnosticsStatus`, `makeDiagnosticsFeed`, `WiringRead`, `mergeReading`, `DEFAULT_*`, `makeGatesFeed`, `AskedRead`, `RegistryRead`, `TimelineStatus`, `makeTimelineFeed`). `test/surface.test.ts:19-69` and its two `deepStrictEqual` tests deep-equals `Object.keys(Root)` and the React entry against exact lists. `test/surface.tst.ts:236-275` holds `@ts-expect-error` refusals for `makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics`, `idleTimeline`, `idleTimelineStatus`, `idleDiagnostics`, `isUnsampled`, `DiagnosticsDockOptions` on both entries. `devtools-named-barrel` runs in `pnpm lint`. `node scripts/check-api-surface.mjs` (re-run): `939 export(s) documented across 9 package(s)` (933 + 13 − 7) | CLOSED |
| T-60-06 | Tampering | the packed `@qadi/devtools` (an `exports` map that does not reach the feeds, a feed declaration naming an unexported type) | medium | mitigate | `scripts/check-package-install.mjs:425` imports `makeTimelineFeed`, `sourceFromRecords` from the installed root, and the consumer builds one feed in `Effect.scoped` and expects `Reading` (`expect("devtools feed", fedStatus, "Reading")`). The consumer compiles with `skipLibCheck: false` (`:596`), so the shipped `.d.ts` are checked. Check 3b (`:308-345`) still refuses any `*` key and any unlisted `lib/` module. The manifest is byte-identical to `phase_base`. 60-04-SUMMARY and 60-08-SUMMARY record the gate green (`9 package(s) pack, resolve and authorize`; `check:pr` includes `pnpm spec:package`); not re-run here, it packs and installs | CLOSED |
| T-60-07 | Spoofing | a publish run by mistake while packing | low | mitigate | The gate only calls `pnpm pack --pack-destination <sandbox>` (`:157`); the phase's diff of it adds no `publish`, `push` or `tag`; no phase commit message names one. No tag contains `phase_base` or HEAD; the newest tag is dated 2026-11-13, before `phase_base` | CLOSED |
| T-60-08 | Tampering | the after and static JSON (stale report, re-baseline, another tree) | medium | mitigate | One commit, `2d9fdb74` `chore(60-05)`, touches `60-mutation-after.json` and `60-mutation-static.json`; the scan confirms it follows the last code line changed (`commentOnly`) and follows `feat(60-03)!`. The static report was run from the scratchpad (nothing under `reports/` or `stryker*` is in the diff). Re-ran `node 60-mutation.mjs compare 60-mutation-static.json`: exit 0, ends `WX-05 holds (D-10)`; DiagnosticsFeed 0.9540 to 0.9863, the other four 1 to 1, 0 new survivors, 3 new static-ignored mutants all Killed in the `ignoreStatic:false` evidence. The after report's mutant lines resolve against HEAD's files (one unresolved line per file, the same artefact as the base JSON) | CLOSED |
| T-60-09 | Information disclosure | the README example and the upgrade note (a copied shell forwarding `reason`) | medium | mitigate | README (`:229-231`), website `devtools.md` (`:227-230`) and the upgrade note (`upgrading.md:1061`) each say the reason must not cross a trust boundary and that a remote-viewer shell sends the tag. The README's example reports the reason only through a caller-supplied in-process `report: (line: string) => void` (`README.md:165-220`); the upgrade fence returns `_tag` values only. Scan rule 7 checks the README sentence and the 0.13 section | CLOSED |
| T-60-10 | Tampering | `.changeset/` and release state | low | mitigate | `git diff --name-status phase_base HEAD -- .changeset` is the single `A .changeset/devtools-headless-interface-is-the-feeds.md`: one `"@qadi/devtools": minor` with `**Breaking.**`. 0 CHANGELOG or manifest changes. All nine packages read `0.12.0`. No commit message names `changeset version`, publish, tag or push | CLOSED |
| T-60-11 | Repudiation | the records (an id outside the reservation, a reserved id unused, history rewritten) | medium | mitigate | See T-60-02 for ids. ADR-QD-047 (Rev 1.19, `:513`), ADR-QD-099 (Rev 1.2, `:89`) and ADR-QD-169 (Rev 1.1, `:107`) gain dated amendment blocks; the only lines removed from those three are their revision and change-history rows. In `28-devtools-screens.md` the removed lines are the signatures and one compiled fence the change makes false, plus a blockquote replaced by a dated `**Amended 2026-11-19 (ARCH-107, CCR-QD-451)**` block | CLOSED |
| T-60-12 | Information disclosure | BEH-QD-637 and ADR-QD-173 (the public `reason`) | low | mitigate | `28-devtools-screens.md:2504` (`REQUIREMENT: Stopped.reason … MUST NOT cross a trust boundary`) and `173-*.md:64` (item 7, D-17) | CLOSED |
| T-60-13 | Tampering | `60-scan.mjs` weakened to pass | medium | mitigate | The plan's verbatim block (60-08-PLAN lines 101-442) re-extracted here hashes to `bac21b86…3c88`, the plan's pin. `diff` of it against the committed `60-scan.mjs` is one line (`:197`), the clause accepting the exact subject `test(60-03): call the feed through its Effect, not toBeCallableWith`, recorded as 60-08 deviation 1 (new SHA `c5fb1808…570e`, which `shasum` reproduces). Re-ran the scan: `phase scan clean` | CLOSED |
| T-60-14 | Repudiation | the release state (a version, tag or push slipping in) | medium | mitigate | `git tag --contains` is empty for `phase_base` and HEAD, and no tag points at HEAD. `git branch -r --contains` is empty for HEAD, `phase_base` and `9e7e0dfe`; no `origin/arch-wave-11` ref exists; the remote-tracking reflogs and `FETCH_HEAD` were last written 2026-11-17, before the phase's first commit. Not checked over the network (`git ls-remote` was not run) | CLOSED |
| RS-60-01 | Denial of service | a host callback throwing into a feed (research § Security Domain, pattern 2; no plan T-id) | medium | mitigate | Each host input is guarded and stated, never thrown: registry read `GatesFeed.ts:142-149`, `subscribe` `:203-207`, release handle `:125-129` and `:197-201`, questions thunk and its comparison `:163-175`, with `stated` total even for an unrenderable throw (`:88-100`). A collector, layer or source defect ends the run and `onFailure` states it (`DiagnosticsFeed.ts:165-167`, `TimelineFeed.ts:136-138`; an unbuildable layer is `WiringRead.Failed`, `DiagnosticsStore.ts:266-269`). Pinned through the root: `GatesFeed.test.ts` G37 (`:111`), T1 (`:123`), T3 (`:189`), G38 (`:510`), G39 (`:544`), G40 (`:568`), G41 (`:583`), G42 (`:612`), G45 (`:739`), G46 (`:762`); `DiagnosticsFeed.test.ts` F4 (`:138`), F5 (`:156`), F8 (`:216`), F9 (`:232`), F24 (`:385`); `TimelineFeed.test.ts` TF10 (`:232`), TF11 (`:241`), TF19 (`:381`). The three suites import their feed names from `../../src/index.ts` (the scan checks it). The phase did not change any guard: the feed diffs are doc comments, type names and the `runOptions` removal. Not re-run here (tests off-limits). See UF-2 for the one host callback the feeds do not isolate | CLOSED |

*Status: CLOSED = the declared mitigation is present on HEAD with the evidence cited. OPEN = absent. 0 threats are OPEN.*

---

## Accepted Risks Log

None.

---

## Unregistered Flags and Observations

No SUMMARY carries a `## Threat Flags` section, so none was mapped. The audit found four things with no register row. None is new attack surface introduced by this phase, none reaches `block_on: high`, and none counts toward `threats_open`.

| ID | Severity | Observation | Evidence | Suggested follow-up |
|----|----------|-------------|----------|---------------------|
| UF-1 | low | `WiringRead.Failed.reason` is also a `Cause.pretty` trace (a handed layer's build failure), public through `Diagnostics.wiring` in every `DiagnosticsSnapshot.reading`. Its doc comment does not carry the trust-boundary rule, and BEH-QD-637's requirement names `Stopped.reason` only. ADR-QD-173 item 7 says "`Stopped.reason` and `Failed.reason`", which covers it by reading. `WiringRead` was already exported at `phase_base` (`index.ts:26`), so reachability is unchanged | `DiagnosticsStore.ts:60-64` (doc), `:268` (`Cause.pretty(built.cause)`) | One sentence on `WiringRead.Failed`'s doc comment; optionally name it in BEH-QD-637 |
| UF-2 | low | A `subscribe` listener that throws is not isolated. `ExternalStore.notify` has no try/catch, so the throw escapes `configure`, or ends the poll (diagnostics, which then states `Stopped`) or silently ends the gates cadence, which is forked with no `onFailure`. No test pins either way, and BEH-QD-638 and INV-QD-358 promise isolation for the registry and the thunk only. The listener is the host's own code in its own process. Read from the code, not executed. Unchanged since `phase_base`; phase 60 only widens who can call `subscribe` | `ExternalStore.ts:34-36`, `GatesFeed.ts:211-230` (`runs.fork(runs.begin(), …)` with no hooks) | Decide whether a listener throw is a host bug (document it) or a stop to state |
| UF-3 | info | Pre-existing in-page renders of `status.reason`: the website's `HydrationLine` (`devtools.md:205`), the newsroom example's `Counters.tsx:59-60`, and the dock's own `<pre>`. Each is a local render, none sends it anywhere, and phase 60 changed only a type name in `Counters.tsx`. The rule now sits about 25 lines below the website example | as listed | none required |
| UF-4 | info | BEH-QD-636 and BEH-QD-638 do not repeat the trust-boundary rule; BEH-QD-637 does. The timeline and gates reasons are covered by their doc comments, the README and ADR-QD-173 item 7 | `28-devtools-screens.md:2444,2517` | optional |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-19 | 16 | 16 | 0 | gsd-security-auditor (L1 grep-depth, independent re-check on HEAD `366bcce7`) |

Re-run during the audit (read-only): `node 60-scan.mjs` (`phase scan clean`), `node 60-mutation.mjs compare 60-mutation-static.json` (`WX-05 holds (D-10)`), `node scripts/check-api-surface.mjs` (939 exports), the SHA-256 of `60-mutation.mjs` and `60-scan.mjs`, a re-extraction and `diff` of the scan's plan block, and the git release checks. Not run: tests, Stryker, `pnpm check:pr` and `check-package-install.mjs`, whose results here are the SUMMARYs' (60-03, 60-04, 60-08).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-19 — SECURED
