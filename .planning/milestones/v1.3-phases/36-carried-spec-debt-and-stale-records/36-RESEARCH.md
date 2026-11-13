# Phase 36 (spec, record and wording half): Carried spec debt and stale records - Research

**Researched:** 2026-11-12
**Domain:** spec records, change-control rows, comment and test-title wording (no behaviour change)
**Confidence:** HIGH. Every claim below was read in the file at the phase base `d31a25ee8207d4775d07253ea4e987cbe8daf0cc` this session (HEAD is `a0c3eec7`, a planning-docs commit; `git diff --quiet d31a25ee -- spec/behaviors/29-devtools-simulator.md` is clean). `effect@4.1.2` confirmed (`node -e 'require("effect/package.json").version'` printed `4.1.2`). The code-behaviour half is in `36-RESEARCH-CODE.md`.

## Summary

Of the 24 ledger rows below, 17 are still true at the base and need an edit (counting the `Evaluate.ts` comment sweep as one), 3 are resolved already (24 IN-05, 24 IN-06, 26 IN-01), 2 are history rows that stay exempt (24 IN-02, 29 IN-02), 1 is refuted (27 IN-02), and the code-behaviour row is the other researcher's; **two research findings change what the roadmap says to do**. (1) DEBT-02's premise is wrong: `Sources.ts` was renamed to `SimulationSource.ts` (commit `dab09bc0`, 2026-09-07), not to `Source.ts`; `Source.ts` is the unrelated record-source module of behaviour 27; row 71 of `spec/traceability.md` already lists `SimulationSource`, so the stale `Sources` token is simply deleted, and CCR-QD-427 must record that deviation from the requirement wording. (2) 27 IN-02 is a false positive: "lost ARCH-57" is the house term for a wave that was lost and recovered by ARCH-61 (`lost ARCH-47`, `lost ARCH-48`, `lost ARCH-57` appear 12+ times in `spec/` and `packages/`); changing it to "later" would erase provenance. The BEH-QD-219..221 duplicate came from commit `1434c524` (2026-11-10): copy 1 (lines 28-174) is the current fail-closed text with its tail prose cut off; copy 2 (lines 190-351) is the old body with the stale miss requirements; line 175 is the tail of the header's Change History row 1.3, byte-identical to what line 13 already holds, so the "spliced fragment" needs no move back, only deletion. The reconstruction is exactly: keep base lines 1-174 and 346-1056, delete lines 175-345 (171 lines); the result has one heading per BEH, even fence parity, and no `-1` anchors. No item in this half needs a new BEH, INV or ADR number; every spec edit is a wording, amendment or Revision change.

**Primary recommendation:** do the spec edits with `scripts/spec-revise.mjs ... --date 2026-11-12` (one call per document, one combined entry), do the comment and title edits as comment-only diffs proven by a comment-stripped transpile comparison (script in Validation Architecture), write CCR-QD-427 once at the end after the code half has chosen its numbers, and never touch the `portCallsTotal` description string at `PortMetrics.ts:85` (pinned by `Ports.test.ts:385` and part of the metric registry key).

## Ledger

Legend: **fix** = edit needed; **resolved** = cite and record only; **exempt** = history row, stays (AGENTS.md §15, D-08); **refuted** = the finding is wrong. "Spec bump" names the `spec-revise` result.

| item | still true at base? | evidence | disposition | edit |
|------|---------------------|----------|-------------|------|
| DEBT-01 BEH-QD-219..221 twice | yes | headings at `29-devtools-simulator.md` 28/78/129 and 190/240/291; duplicated by `1434c524` | fix | delete lines 175-345; Rev 1.15 to 1.16 (Q1) |
| DEBT-02 `Sources` in traceability | yes, but the premise is off | `spec/traceability.md:71` has `Sources,`; `Sources.ts` deleted by `dab09bc0` (renamed `SimulationSource.ts`); `Source.ts` is behaviour 27's module and no simulator file imports it | fix, with a stated deviation | delete the token `Sources,`; Rev 1.159 to 1.160 (Q2) |
| DEBT-03 replay fail-open "undecided" | one live claim | only `.planning/MILESTONES.md:76` (v1.0 entry, "Carried forward"); `PROJECT.md:202` and `STATE.md:308` are already struck through; `spec/`, `apps/website/src`, `packages/*/src` have none | fix | strike through and annotate `MILESTONES.md:75-77` (Q2) |
| 24 IN-02 CCR-QD-414 cites README Rev 1.148 | yes | `spec/README.md:352` cites Rev 1.148; README entry "1.148 ... CCR-QD-414 added" | exempt | none; list in CCR-QD-427 |
| 24 IN-05 comment overstates reads after last yield | no | fixed by `6c198da1`; no "last yield" text remains (`grep -rn "last yield" packages/*/src` empty); `SimulationSession.ts` now uses a `FiberHandle` (`:33`, `:354`) | resolved | none |
| 24 IN-06 deferred-items lists run-start window open | no | `.planning/milestones/v1.2-phases/24-simulation-source-preparation/deferred-items.md:8` heading ends "RESOLVED 2026-11-11", `:12` "**Resolved** by code review WR-01 (`1ad24867`)"; set by `12a6631c` | resolved | none |
| 25 IN-02 stale comments in `Simulator.test.tsx` | yes | `packages/devtools/test/react/Simulator.test.tsx:9-10` and `:414-420` say a fixture run settles inside `runFork`; the `run` helper at `:103-124` says the opposite | fix | rewrite two comments (Q3) |
| 26 IN-01 constant `undefined` run to `useRunningStore` | no | `grep -rn "useRunningStore\|useDockSnapshot\|useExplorerSnapshot\|useHeldChoiceSnapshot" packages/devtools/src packages/devtools/test` empty; removed by `9f40fcbb` (dock) and `2086026d` (explorer, held choice) | resolved | none |
| 26 IN-03 "was DevtoolsDock l.N" titles | yes | `packages/devtools/test/model/DockModel.test.ts:14-16` header; 11 titles at `:186 201 216 247 258 270 282 300 317 399 620`; header also says "six stores" (Phase 34 made seven) | fix | drop parentheticals, fix header (Q3) |
| 27 IN-01 "the one the module accepts" | yes | `packages/http/src/GuardRoute.ts:83-85` | fix | name `enforceRequest` (Q3) |
| 27 IN-02 "lost ARCH-57's probe" typo | the word is correct | `GuardRoute.ts:79-80`; same term in `GuardRoute.tst.ts:20`, `UnguardedRoute.ts:11-12`, `spec/decisions/047-*.md:288`, `spec/behaviors/23-http.md:950` | refuted | none (optional clarity edit, see Q3) |
| 28 IN-01 "three" re-exported types | yes | `GateWriter.ts:7`; `GateRegistry.ts:47` re-exports four | fix | "four" and name them (Q3) |
| 28 IN-02 `{@link useGates}` unresolvable | yes | `GateWriter.ts:164`; `useGates` is `useGate.ts:244` | fix | plain text (Q3) |
| 28 IN-03 INV-QD-064 Source | yes | `spec/invariants.md:2676-2680`; handle built in `GateRegistry.ts:95-119` | fix | move the clause; invariants Rev 1.114 to 1.115 (Q3) |
| 28 IN-04 ADR-QD-140 "only test edit" | yes, as a statement about the whole change | `spec/decisions/140-*.md:106-107`; `1b43a6fc` changed `run`, title, header; `8b03a02c` and `8fbd9f58` added tests; `585707b5` (the split) did change one import only | fix | dated amendment blockquote; ADR-140 Rev 1.0 to 1.1 (Q3) |
| 28 IN-05 ADR-QD-053 blockquote | yes | `spec/decisions/053-*.md:73-77` says "`useGates` (`GateWriter.ts`)" present tense | fix | new dated amendment blockquote (siblings 080, 103, 111 got dated notes); ADR-053 Rev 1.5 to 1.6 (Q3) |
| 29 IN-02 CCR-QD-419 "six" and Rev 1.155 | yes | `spec/README.md:357` "six modules re-pointed" vs "the seven src modules"; seven is right (list below) | exempt | record the correction in CCR-QD-427; do not edit the row (Q3) |
| 29 IN-03 ADR-QD-123 "still imports" | yes | `spec/decisions/123-*.md:129` | fix | one word, "still" to "now"; ADR-123 Rev 1.1 to 1.2 (Q3) |
| DEBT-05 `v4-http-smoke.test.ts:106` `registerApi` | yes (also `:115`) | `registerApi` removed by `b655b3be`; the annotation walk is `AccessPlan.ts` `planApi` (`:180-210`) reached through `guardApi` (`GuardApi.ts:86`) | fix | rename in two comments (Q4) |
| DEBT-05 `stryker.http.mjs` comment | yes | `stryker.http.mjs:22-23` "`PermissionRegistry.ts`'s `addGuardedRoute`"; it is `GuardRoute.ts:113` | fix | comment only; config body byte-identical (Q4) |
| `DecisionCache.test.ts:864` "generation" | yes | `:864-866`; the counter was removed by `ce9d2a46`; `clear` is `DecisionCache.ts:273-281` | fix | rewrite 3 lines (Q4) |
| ADR-QD-081 `Evaluate.ts` paragraph | yes | `spec/decisions/081-*.md:51-52`; `StandingEvaluationServices` is `EvaluationServices.ts:40`, moved by `e6302d32` | fix | dated amendment blockquote; ADR-081 Rev 1.1 to 1.2 (Q4) |
| src comments naming `Evaluate.ts` (35 lines) | 15 wrong, rest correct, history or pinned | table in Q4 | fix the wrong ones | comment-only edits (Q4) |
| code-behaviour items | n/a | see `36-RESEARCH-CODE.md` | n/a | n/a |

<user_constraints>
## User Constraints (from CONTEXT.md)

The caller asked for the summary and ledger to lead this file; the constraints follow them and are copied verbatim.

### Locked Decisions

The user's standing direction: "the most clean solution, the most complete, not the simplest. We don't care about complexity." The user chose each grey area below on 2026-11-12.

### Scope (DEBT-01..05 plus the carried items)
- **D-01 The roadmap list is in scope in full:**
  - BEH-QD-219..221 printed twice in `spec/behaviors/29-devtools-simulator.md` (DEBT-01);
  - `spec/traceability.md` behaviour 29 naming `model/Sources.ts` instead of `model/Source.ts` (DEBT-02);
  - the stale "replay fail-open undecided" line wherever it is still live (DEBT-03);
  - every open v1.2 info finding in `.planning/phases/_WAVE8-CONTEXT.md` § Phase 36 (DEBT-04): 24 IN-01, 24 IN-03, 25 IN-01, 25 IN-02, 26 IN-02, 26 IN-03, 27 IN-01, 27 IN-02, 28 IN-01..IN-06, 29 IN-01..IN-03 (24 IN-02 is history and exempt, AGENTS.md §15);
  - the stale citations `packages/http/test/v4-http-smoke.test.ts:106` (`registerApi`) and the `stryker.http.mjs` comment placing code in `PermissionRegistry.ts` (DEBT-05).
- **D-02 The user chose to take every item carried from phases 30–35 as well.** Each is re-verified at the phase base first:
  1. **TimelineFeed: an untokened accept** (Phase 34 review IN-01). A late `accept` from a replaced timeline read can still write. The fix uses a per-start token, the pattern `DiagnosticsFeed.ts` already uses.
  2. **TimelineFeed: silent fiber death** (Phase 34 review IN-05). A defect in the timeline read ends the fiber with nothing observable. It must surface the way `DiagnosticsFeed`'s `Stopped` does, or by a stated, tested rule.
  3. **The react `subject` atom is not keepAlive** (Phase 35 spike, "Pre-existing finding carried to Phase 36"). A gate under a hidden-then-shown `<Activity>`, with the provider outside the Activity, stays `Initial`. This is a real defect: RED test first, then the fix.
  4. **Phase 34 polish** (34-VERIFICATION.md "Human Verification Outcome"): the screen root's thin default focus ring, and the restart button's contrast, which has not been measured. Measure both against WCAG 2.2 AA (focus appearance; 4.5:1 text, 3:1 non-text), then fix whatever falls short with the devtools' existing tokens.
  5. **Stale wording:**
     - `packages/core/test/DecisionCache.test.ts:864` still says "generation" (Phase 31 removed the counter);
     - ADR-QD-081's `Evaluate.ts` paragraph (Phase 32, named in CCR-QD-423) needs an amendment line, not a rewrite;
     - `packages/core/src/DecisionSink.ts:15` and any other src comment still naming `Evaluate.ts` for code that moved to `Walk.ts`/`PortAccess.ts`;
     - the `packages/react/src/useScoped.ts:45` eslint-disable is justified in place, or removed if the rule no longer needs it.
- **D-03 Each item is resolved one of two ways:**
  - **still true at the base:** fix it;
  - **already resolved by phases 30–35** (e.g. 26 IN-01 by Phase 34; 26 IN-02, 26 IN-03 and 29 IN-01, re-checked after Phases 34 and 30): record it as resolved, citing the commit or file and line that shows it.

  A ledger in the phase directory lists every item with its base-state evidence and its disposition. The verifier reads that ledger.

### 28 IN-06 (DEBT-05)
- **D-04 Narrow and test.** Re-verify the finding at the phase base. Then add a test for its remaining gap: an identity-changing rerender under `<StrictMode>` (the gate's policy or resource identity changes across a StrictMode double render, and the registry and atom set stay consistent). If the test fails, the gap is a defect and is fixed test-first. Phase 35's P3 StrictMode pin is prior art, not closure.

### The BEH-QD-219..221 reconstruction (DEBT-01)
- **D-05 Reconstruct by hand, review it as a diff, and do not pause.** The executor rebuilds one BEH-QD-219..221 block from both copies:
  - copy 1's current fail-closed requirement text (ADR-QD-129, BEH-QD-411);
  - copy 2's intact tail prose;
  - the change-history fragment spliced into the body, moved back to the header;
  - the stale fail-open copy, deleted.

  The SUMMARY records, span by span, what was kept from each copy and what was dropped, and why. The code review and the verifier check that record against `git show d31a25ee:spec/behaviors/29-devtools-simulator.md`. `node scripts/spec-revise.mjs --check` must be clean.

### Records and numbers (WX-02)
- **D-06 CCR-QD-427 is the phase's one change row.** It lists every fixed and every resolved item, the BEH/INV numbers used, and the line `Used: …. Unused: …` naming the reserved numbers left over.
- **D-07 Behaviour changes use the reserved numbers.** The defect fixes (D-02 items 1–3, and D-04 if it finds a defect) take numbers from BEH-QD-516..520 and INV-QD-317..318 when they state a new requirement or invariant, and restate an existing requirement in place when that is the cleaner record.
- **D-12 The user allows a new ADR if a fix turns out to be a design decision.** It may only be ADR-QD-149, after confirming that number is free on disk and in the shared reservation file (`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`, whose ADR high-water is 148). The orchestrator reserves it by hand before the plan that writes it runs. `node scripts/next-id.mjs` is never run. An existing ADR is amended with an `> **Amended:**` line or a dated amendment section, never rewritten. If no ADR is written, CCR-QD-427 says "ADR: none".
- **D-08 Every date is 2026-11-12,** set through `scripts/spec-revise.mjs … --date 2026-11-12`. CHANGELOG files are history and are never edited. Change-history rows and quoted history are never rewritten (AGENTS.md §15). A live statement is corrected; a history row that quotes the old statement stays.

### Code changes (WX-04..07)
- **D-09 Characterisation and regression first** (WX-06):
  - each defect gets a RED test on the phase base, committed before its fix;
  - each preserved behaviour that a code change touches gets a green pin first;
  - 24 IN-01 (a recorder built and dropped per commit while Live is chosen) and 24 IN-03 (`Ready` spelled twice) are fixed as tested code changes, per DEBT-04.
- **D-10 Mutation** (WX-05): a `36-mutation-base.json` over every src file the phase will touch is committed alone as the first plan commit, using each package's own `stryker.<pkg>.mjs`. The after-run must leave no touched file below its base. Survivors are named.
- **D-11 Changesets:**
  - every package whose shipped code changes gets a patch changeset (`@qadi/devtools` for the TimelineFeed, 24 IN-01, 24 IN-03 and the polish; `@qadi/react` for the subject atom; others as found);
  - a public break, if any, is recorded as **Breaking** in the changeset and in `upgrading.md`;
  - nothing is released or published.

### Claude's Discretion

- Plan count and wave split, within this fixed order: mutation baseline first, then the ledger and RED/characterisation tests, then the fixes, then the spec and record edits, then the closing gate.
- Whether the timeline feed's "observable death" reuses `DiagnosticsStatus`'s shape or a smaller, closed status of its own. The cleaner, more consistent option wins.
- How the focus ring and contrast are measured (computed-style probe in a browser test, or Playwright against `examples/nextjs-newsroom`).

### Deferred Ideas (OUT OF SCOPE)

None. The user chose to close every carried item in this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEBT-01 | one reconstructed BEH-QD-219..221 block | Q1: exact span table and the verbatim result |
| DEBT-02 | traceability behaviour 29 module name | Q2: the premise correction and the edit |
| DEBT-03 | no live record calls the replay fail-open undecided | Q2: classification of every hit |
| DEBT-04 | every open v1.2 info finding re-verified | Q3: per-item evidence, wording, bumps |
| DEBT-05 | stale citations, 28 IN-06 | Q4 (citations); 28 IN-06 belongs to the code half |
| WX-02 | CCR row, numbers, traceability | Q5: row shape, no new BEH/INV/ADR, gates |
| WX-06 | characterisation first | n/a for wording; Validation Architecture proves "nothing else moved" |
| WX-01, WX-03, WX-04, WX-05, WX-07 | per-phase gates | Q5 gate list; no export changes so WX-03 needs no row |
</phase_requirements>

## Architectural Responsibility Map

Not applicable: this half edits spec documents, planning records, comments and test titles. No capability crosses a runtime tier.

## Standard Stack

No library is added or changed. The tools are the repo's own: `scripts/spec-revise.mjs`, `spec/scripts/verify-traceability.sh`, `scripts/check-doc-examples.mjs`, `scripts/check-dod-table.mjs`, `scripts/check-house-style.mjs`. Versions confirmed: Node `v26.13.0`, pnpm `10.17.1`, `effect` 4.1.2. No `npm install`.

## Package Legitimacy Audit

No external package is installed by this half. Table omitted by rule (none to audit).

## Architecture Patterns

### How a spec edit is made here

```
edit the document by hand  ->  node scripts/spec-revise.mjs <doc> "<entry>" --date 2026-11-12  ->  gates
```

- `spec-revise` bumps the minor version in the `Revision` row and prepends the entry to the `Change History` row; it does **not** touch `Effective Date` or `Status` (read in `scripts/spec-revise.mjs:96-107`). A `Status` cell change (ADR-QD-053's "amended by ...") is a hand edit.
- Always pass `--date`: without it the script's positional parse drops the document argument (`STATE.md:316`, `PROJECT.md:195`).
- An ADR is amended with an inline `> **Amended 2026-11-12 (CCR-QD-427).** ...` blockquote under the affected paragraph, as `spec/decisions/052-*.md:93`, `073-*.md:118`, `077-*.md:230`, `137-*.md:128` do, never by rewriting the original sentence (D-12).
- A comment-only change to `packages/*/src` or a test needs no changeset: `0e340791` ("cite spec records, not planning IDs, in model doc comments", 3 files under `packages/devtools/src/model/`) added no `.changeset/*.md` [VERIFIED: `git show 0e340791 --stat` listed only those three files].

### Anti-patterns

- **Rewriting a history row.** A change-history row, a CCR row, a dated quoted paragraph and everything under `.planning/milestones/` stay as written; the correction goes in CCR-QD-427 or in a new dated line.
- **Editing a runtime string while "fixing a comment".** See Pitfall 1.
- **Hard-coding the next Revision in a plan.** Both halves bump `spec/traceability.md`, `spec/invariants.md` and `spec/README.md`; read the number at write time.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Revision and history row edits | manual edits of the header | `node scripts/spec-revise.mjs` | the gate compares both cells; a half edit fails `spec-revise --check` |
| Proving a src/test edit moved only comments | eyeballing the diff | the comment-stripped transpile comparison in Validation Architecture (tested on `0e340791`) | a regex comment-stripper breaks on strings containing `//` |
| Reserving BEH/INV/ADR/CCR numbers | `scripts/next-id.mjs` | the reserved list in `$(git rev-parse --git-common-dir)/qadi-reserved-ids.json` (CCR 427, ADR 148, BEH 520, INV 318 at this session) | CONTEXT forbids running `next-id.mjs` |

## Runtime State Inventory

Omitted: not a rename or migration phase. (The `Sources` to `SimulationSource` rename happened in September; only a stale spec token remains, covered in Q2.)

## Q1. The BEH-QD-219..221 reconstruction (DEBT-01, D-05)

### What the file holds at the base [VERIFIED: `spec/behaviors/29-devtools-simulator.md`, 1056 lines, read in full this session]

| lines | content |
|-------|---------|
| 1-13 | title, Document Control; line 13 is the full Change History cell, rows 1.15 down to "1.0 (2026-08-24): Initial release (CCR-QD-070) \|" |
| 14-27 | `_Previous: ..._`, `---`, the two intro paragraphs |
| 28-174 | **copy 1**: BEH-QD-219 (28), 220 (78), 221 (129); 221 ends at line 173 with the refused-key requirement |
| 175 | the spliced fragment (one very long line) |
| 176-189 | a second copy of lines 14-27 (blank, `_Previous_`, `---`, intro) |
| 190-351 | **copy 2**: BEH-QD-219 (190), 220 (240), 221 (291), with 221's tail prose at 346-351 |
| 353 on | BEH-QD-411 and everything after, once |

### Span-by-span diff of the two copies [VERIFIED: `diff` of `sed -n 28,174p` against `sed -n 190,351p`]

BEH-QD-219 (copy 1 `28-76`, copy 2 `190-238`) and BEH-QD-220 (copy 1 `78-127`, copy 2 `240-289`) are **byte-identical**, including the ```ts fences, the CCR-QD-321 blockquotes and every link. BEH-QD-221 differs in exactly four places:

1. Copy 1 `163-167` carries the current requirement: `REQUIREMENT: A query the capture never saw MUST fail with the port's own typed error, on every port, and MUST NOT answer the port's fail-closed default (BEH-QD-411).` Copy 2 `325-328` carries the stale `REQUIREMENT: A query the capture never saw MUST answer the fail-closed default, except where the next requirement says otherwise.`
2. Copy 2 `330-333` is a paragraph for that stale requirement (`undefined` for an attribute, `Unknown` ...). Copy 1 has none.
3. Copy 1 `169-173` carries the refused-key requirement (`A request whose key is refused (BEH-QD-410) MUST NOT be captured ...`). Copy 2 `335-338` carries the superseded `A signature request the capture never saw MUST fail as SignatureHistoryUnavailable, not answer an empty list.`
4. Copy 2 `340-344` is the signature paragraph and `346-351` is the tail prose (`CapturedAnswers` is keyed by port name (`AttributeResolver`, …) ... `decoratePorts` ... `scriptedPort` ... ADR-QD-094). Copy 1 has neither: it ends at 173, then line 175.

So: **copy 1 carries the current fail-closed replay text** (ADR-QD-129, BEH-QD-411, CCR-QD-407); **copy 2 carries the only intact tail prose** (`346-351`); copy 2's other extras are the stale text.

### The splice, and where it belongs [VERIFIED: `cmp` of line 175 against the tail of line 13 returned equal]

Line 175 is, byte for byte, the tail of the header's row 1.3 starting at ``` `CapturedAnswers` is keyed by port name, each map by the port description's `key`; ``` through `... Initial release (CCR-QD-070) |`. Row 1.3 on line 13 is already complete, so **nothing needs to move back into the header**: the fragment is a pure duplicate and is deleted. Lines 176-189 are a duplicate of 14-27 and are deleted too. (D-05 says "moved back to the header"; the header already holds it. SUMMARY should say so.)

### How it happened [VERIFIED: `git log --all`, `git show 1434c524`; the mechanism is inferred, tagged below]

`git log --all` counts of `^## BEH-QD-219` per commit: `f077a487` has 1, `1434c524` has 2. The commit is `1434c524` "docs(17-06): the key law's equality is Equal.equals, and a replay miss is an outage on every port" (2026-11-10), whose diff to this file is one hunk `@@ -5,12 +5,170 @@` (+196 lines, 3 deleted) at the **top** of the file plus the BEH-QD-411 hunk at `@@ -184,6 +342,41 @@`. Its message intended "BEH-QD-221's miss requirements replaced" and BEH-QD-411 added. The wave-6 squash `965ff14c` carried it into main; the wave-7 squash and `3e7a8b3e` (Phase 33) each edited both copies. Phase 24 knew of it (`deferred-items.md:3`: "Phase 24 applied its BEH-QD-220 wording to both copies so they stay equal"). [ASSUMED: the replacement was anchored on text that matched inside the header's Change History cell, so the new body landed in the header line and left the old line's tail behind; the diff shape (insertion at line 5-13, orphan tail equal to row 1.3's tail) fits, but the executor's tool call is not recoverable.]

### The reconstruction

**Rule:** result = base lines 1-174 + base lines 346-1056. Equivalently delete lines 175-345. [VERIFIED: built in the scratchpad: 885 lines; `^## BEH-QD-(219|220|221)` count 3; fence lines 130 (even); header parse `1.15 1.15`.]

Span table:

| span | base lines | source copy | kept? | why |
|------|-----------|-------------|-------|-----|
| header, intro | 1-27 | once | keep | line 13 already holds every history row |
| BEH-QD-219 | 28-76 | copy 1 | keep | identical to 190-238; first heading keeps the unsuffixed anchor |
| BEH-QD-220 | 78-127 | copy 1 | keep | identical to 240-289 |
| BEH-QD-221 head, fences, requirements 1-3, "fail-closed defaults deny" | 129-161 | copy 1 | keep | identical to 291-323 |
| miss requirement (fail with the typed error, BEH-QD-411) | 163-167 | copy 1 | keep | the current text; replaces 325-333 |
| refused-key requirement (BEH-QD-410) | 169-173 | copy 1 | keep | the current text; replaces 335-344 |
| blank | 174 | copy 1 | keep | separates 173 from the tail |
| spliced Change History fragment | 175 | stray | **drop** | byte-identical to the tail of line 13 |
| duplicate intro | 176-189 | stray | **drop** | duplicate of 14-27 |
| BEH-QD-219, 220 | 190-289 | copy 2 | **drop** | byte-identical to copy 1 |
| BEH-QD-221 head to "fail-closed defaults deny" | 291-323 | copy 2 | **drop** | byte-identical to copy 1 |
| stale miss requirement and its paragraph | 325-333 | copy 2 | **drop** | superseded: CCR-QD-407 "BEH-QD-221's miss and refused-key requirements"; BEH-QD-411 states it for every port |
| signature requirement and paragraph | 335-344 | copy 2 | **drop** | subsumed by the unified miss requirement and BEH-QD-411's `SignatureHistory` table row; rationale lives in ADR-QD-109 and `spec/invariants.md:1785` |
| blank | 345 | copy 2 | **drop** | goes with the paragraph above |
| tail prose (`CapturedAnswers` ... ADR-QD-094) | 346-351 | copy 2 | **keep** | the only copy; verified true: `Capture.ts` `capturing` is built on `decoratePorts` (`:83`, `:101`) and `replayLayer` on `scriptedPort` (`:195`, `:212`) |
| blank, BEH-QD-411 on | 352-1056 | once | keep | untouched |

Judgement flagged (see Open Questions): dropping 335-344 removes the explicit signature requirement and its INV-QD-043 / ADR-QD-109 links from this document. That is what "BEH-QD-221's miss requirements replaced" (change history 1.11) says happened; BEH-QD-411's prose still names "a signature's `meaning` and `signerRole`".

### Proposed block, verbatim (base lines 28-174 followed by 346-351)

````markdown
## BEH-QD-219: A simulation is sealed, in every source mode

```ts
export const simulate: (
  policy: Policy,
  input: SimulationInput,
  options?: SimulationOptions,
) => Effect.Effect<DecisionOutcome>;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `SimulationOptions`, `simulate`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: A simulation MUST write no DecisionRecord, in any source mode.
```

`simulationLayer` asks `@qadi/core`'s `evaluationEnvironment` for
`shadow: "sinkAndCache"`, which shadows `DecisionSink` with a discarding one and
`DecisionCache` with a private one. **Shadowing rather than omission**, because
omission is not expressible — `Effect.provide` has no complement — and the
consequence of skipping it is not cosmetic: a what-if sweep of eight edits
writes eight rows that read exactly like decisions somebody asked for
([INV-QD-042](../invariants.md),
[ADR-QD-146](../decisions/146-one-evaluation-environment-states-its-shadowing.md)).

```
REQUIREMENT: A simulation MUST resolve every question through the source it was
             given, and reach nothing else.
```

Asserted by running one beside a layer whose every port dies: the simulation
still decides, because it never reached them.

```
REQUIREMENT: `CurrentSubject` MUST come from the form, never from a supplied layer.
```

In the type, not by convention: `LiveSource` carries
`Layer<Exclude<EvaluationServices, CurrentSubject | EvaluationId>>`. The subject
is the thing being simulated, so a layer able to supply one could change *what is
being asked* rather than merely how it is answered.

```
REQUIREMENT: `simulate` MUST NOT fail. A broken port is a `Failed` outcome.
```

`R` and `E` are both `never`. A panel that could crash on a fixture typo is a
panel nobody trusts, and the outcome ADT the timeline already carries is the
right shape for the answer ([INV-QD-006](../invariants.md)).

## BEH-QD-220: Three sources, and a fourth is a compile error

```ts
export type SimulationSource = FixtureSource | SnapshotSource | LiveSource;
export const causesIO: (self: SimulationSource) => boolean;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `FixtureSource`, `LiveSource`, `SimulationSource`, `SnapshotSource`, `causesIO`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: The source union MUST dispatch exhaustively, with no default.
```

`portsOf` goes through `Match.tagsExhaustive`. Falling through to fixtures would
be the worst available failure: the screen would answer confidently from data
nobody supplied.

```
REQUIREMENT: A sweep's cost MUST be stated before it runs.
```

`sweepPlan` returns the evaluation count and whether the sweep performs I/O
without running anything. A count discovered afterwards is not a warning.

```
REQUIREMENT: The sweep MUST run exactly the evaluations it stated.
```

The pairs toggle is part of the plan: `whatIf` takes the same `pairs` the plan
was computed with, so `report.evaluations` equals the stated count in both
positions. A screen that stated three evaluations and ran four would be
announcing a cost it did not keep, and under `Live` the difference is unannounced
lookups against production.

```
REQUIREMENT: A chosen source that cannot be honoured MUST be refused, never
             replaced by another.
```

`portsOf(undefined)` answering from fixtures is the right default for a caller
who never chose, and is pinned as such. The screen's session
([BEH-QD-322](#beh-qd-322-a-simulation-is-a-session)) never passes it: a `Live`
choice with no `ports`, or a `Snapshot` choice with no capture, is refused by
`prepareSource` ([BEH-QD-455](#beh-qd-455-a-source-choice-is-prepared-in-one-place)),
with the choice and the reason, and the session turns that refusal into the run
state; nothing is evaluated.

**`Snapshot` is what makes `Live` defensible rather than merely available.** A
sweep of N edits costs N in-memory folds on fixtures, N live sweeps on `Live`,
and one live run plus N folds on a snapshot.

## BEH-QD-221: A capture records answers, and a replay reproduces them

```ts
export const capturing: (ports: Layer.Layer<EvaluationPorts>) => {
  readonly layer: Layer.Layer<EvaluationPorts>;
  readonly answers: Effect.Effect<CapturedAnswers>;
};
export const replayLayer: (answers: CapturedAnswers) => Layer.Layer<EvaluationPorts>;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `capturing`, `replayLayer`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: Replaying a capture MUST produce the trace the captured run produced.
```

```
REQUIREMENT: A capture MUST key every answer by the whole question the port
             received: the subject (roles, permissions and attributes, not its id
             alone), the resource, and a relationship's depth. It MUST NOT answer
             a question differing in any of them.
```

[INV-QD-043](../invariants.md). An agreement property, and it is stated rather
than assumed because two paths answering one question is precisely the drift this
library treats as a defect.

```
REQUIREMENT: A captured failure MUST replay as that failure, not as a miss.
```

Fail-closed defaults deny, so a replayed outage that became a miss would look
like a correctly-denying policy rather than a broken port.

```
REQUIREMENT: A query the capture never saw MUST fail with the port's own typed
             error, on every port, and MUST NOT answer the port's fail-closed
             default (BEH-QD-411).
```

```
REQUIREMENT: A request whose key is refused (BEH-QD-410) MUST NOT be captured:
             the captured run MUST pass it to the live port unrecorded, and a
             replay MUST fail it with the port's own typed error.
```

`CapturedAnswers` is keyed by port name (`AttributeResolver`, …), and each map by
that port description's `key`, so the capture and the replay agree about a key by
construction. Both are written once over `@qadi/core`'s port registry —
`capturing` is `decoratePorts`, `replayLayer` is each port's `scriptedPort` — so a
port added to the registry is captured and replayed with no edit here
([ADR-QD-094](../decisions/094-a-port-is-described-once.md)).
````

### Everything that depends on the duplicate

- **Heading anchors.** With two identical headings the slugger gives the second a `-1` suffix. Searched `spec`, `apps`, `packages`, `examples`, `features`, `scripts`, `.planning` for `every-source-mode-1`, `compile-error-1`, `reproduces-them-1`: no hits. The unsuffixed anchors are linked from `spec/decisions/129-*.md:88` (`#beh-qd-221-...`) and `spec/behaviors/29-devtools-simulator.md:891` (`#beh-qd-220-...`); both stay valid because the kept headings are the first in document order and their text is unchanged.
- **Traceability.** Row 71 lists `BEH-QD-219–226` as a range; test rows (`traceability.md:453-465`) cite ids, not headings. No row changes for this item.
- **Compiled fences.** `scripts/check-doc-examples.mjs` compiles only `typescript` and `tsx` fences. The file has exactly one, at line 803, outside the deleted span; every fence in 28-351 is ```ts or untagged. The compiled block count does not change. (`grep -c '^```typescript'` printed 1.)
- **Fence parity.** The deleted range 175-345 contains 32 fence lines (162 in the base, 130 after), so parity holds and line 173's closing fence is kept.
- **Gates that parse the file.** `spec-revise` reads the first `Revision` and `Change History` rows (`scripts/spec-revise.mjs:35-36`): lines 8 and 13, unaffected. `spec/scripts/verify-traceability.sh` check 5 (relative links outside fences; the one dropped link is the ADR-QD-109 link at copy 2 `:344`), check 8 (Revision equals newest entry). `scripts/next-id.mjs:30` reads `^## BEH-QD-(\d+)` for the maximum only; duplicates never mattered.
- **Line-number citations.** None in live records (`grep -rE "29-devtools-simulator\.md:[0-9]"` found none); `deferred-items.md:3` cites "lines 28-185 and 186-344 at 965ff14c" and is archived history.

### Revision

Current: `Revision | 1.15` and newest entry `1.15 (2026-11-12): BEH-QD-226 restated on EvaluationClock; ...` [VERIFIED: `spec/behaviors/29-devtools-simulator.md:8,13`]. The call:

```bash
node scripts/spec-revise.mjs spec/behaviors/29-devtools-simulator.md "BEH-QD-219 to 221 printed once: the duplicate block, the Change History fragment spliced into the body and the superseded replay-miss requirements are removed; no requirement changes (CCR-QD-427)" --date 2026-11-12
```

Result 1.16. Expected `git diff --numstat d31a25ee -- spec/behaviors/29-devtools-simulator.md`: `2	173` (171 deleted lines, two header lines changed).

## Q2. Traceability and the fail-open line (DEBT-02, DEBT-03)

### DEBT-02 [VERIFIED: `spec/traceability.md:71`]

The module list reads `` `packages/devtools/src/model/{Simulation,SimulationInput,SimulationEdit,SimulationFields,SimulationSession,SimulationSource,HeldChoice,SimulationForm,Sources,Capture,Edits,Remedies,WhatIf,Replay}.ts` ``. All the other 13 names exist in `packages/devtools/src/model/` (listing read this session). `Sources.ts` does not exist. **It was renamed, not misspelt:** `dab09bc0` (2026-09-07, "fix(devtools): rename Sources.ts to SimulationSource.ts ... one character from the unrelated Source.ts (record-source module)"). `Source.ts` (`packages/devtools/src/model/Source.ts`, "Where the devtools gets its records") is behaviour 27's module and is already listed in row 69 (`{Source,Timeline,...}`); the files importing it are `index.ts`, `TimelineFeed.ts`, `DockModel.ts`, `TimelineStore.ts`, `useDockModel.ts`, `DevtoolsDock.tsx`, `useTimeline.ts`, none of them the simulator.

**Edit:** delete the token `Sources,` (the row already lists `SimulationSource`). Replacing it with `Source` would add behaviour 27's module to behaviour 29. DEBT-02 and `36-CONTEXT.md` D-01 say "names `model/Source.ts`"; CCR-QD-417's row already uses the phrase "**Deviations from the requirement wording, with reasons.**" for this kind of correction, so CCR-QD-427 and the SUMMARY should say: "DEBT-02 named `Source.ts`; the file the stale token meant was renamed `SimulationSource.ts` in `dab09bc0` and is already listed, so the token is removed."

Revision: traceability `1.159` to `1.160`:

```bash
node scripts/spec-revise.mjs spec/traceability.md "29 row's module list drops the pre-rename Sources.ts, which SimulationSource.ts replaced (CCR-QD-427)" --date 2026-11-12
```

(If the code half also changes traceability rows, make one call per document with a combined entry.) No test-row or overview change.

### DEBT-03: every statement that the replay fail-open is open or undecided

Searched `.planning/PROJECT.md MILESTONES.md STATE.md ROADMAP.md REQUIREMENTS.md RETROSPECTIVE.md`, `spec/`, `apps/website/src`, `packages/*/src`, `README.md`, `CONTRIBUTING.md`, `AGENTS.md` for `fail-open|fail open|undecided|needs a decision|four ports`.

| location | text | class | action |
|----------|------|-------|--------|
| `.planning/MILESTONES.md:76` | `fail-open on four ports' `none` answers needs a decision` | the **v1.0 entry** (`## v1.0 Arch Wave 5 (Shipped: 2026-11-09)`, line 43); true when written, false from 2026-11-10 (ADR-QD-129); read as a live "Carried forward" list, and `ROADMAP.md:529` names `MILESTONES.md` as a record that must not claim it | annotate | strike through, keep the words, add the closure, mirroring `PROJECT.md:202` |
| `.planning/PROJECT.md:49` | "stale 'replay fail-open undecided' known issue (already closed in v1.1 ...)" | describes this phase's task, not a claim | none now; phase-transition bookkeeping moves it |
| `.planning/PROJECT.md:202` | `~~Devtools replay fail-open on four ports~~: closed in v1.1 (ADR-QD-129, CCR-QD-407); this line was stale until 2026-11-12.` | already corrected | none |
| `.planning/STATE.md:308` | `~~Devtools replay fail-open~~: stale. Closed in v1.1 ...` | already corrected | none |
| `.planning/PROJECT.md:231` | key-decision row: "Accepted (Phase 2, WR-04); the other four ports closed in v1.1" | current and true | none |
| `spec/decisions/129-*.md:81`, `spec/behaviors/29-...:` change-history rows, `spec/README.md` CCR-QD-407 | quote or describe the old state | history | none |
| `.planning/milestones/v1.1-phases/17-*` | "four undecided ports" | archived | none |
| `spec/invariants.md:1785-1795`, `spec/behaviors/06-services.md:102`, `apps/website/.../signatures.md:63-67`, `reference/upgrading.md:389` | state the fail-closed rule | current and true | none |

**`MILESTONES.md:76` decision:** it is history in origin and a live claim in effect. Do not delete or rewrite it; apply the project's own pattern. Current lines 75-77:

```
**Carried forward:** Node 26 CI leg times out in mutation (60-minute limit); devtools replay
fail-open on four ports' `none` answers needs a decision; open warning/info review findings
(see PROJECT.md "Known Issues").
```

Replacement:

```
**Carried forward:** Node 26 CI leg times out in mutation (60-minute limit); ~~devtools replay
fail-open on four ports' `none` answers needs a decision~~ (closed in v1.1 by ADR-QD-129 /
CCR-QD-407; corrected 2026-11-12); open warning/info review findings
(see PROJECT.md "Known Issues").
```

`MILESTONES.md:12` ("naming `model/Sources.ts`, which should be `Source.ts`") and `STATE.md:329` / `PROJECT.md:48,193` repeat the DEBT-02 premise. They are acknowledgements recorded at the v1.2 close (history); the phase-transition update should mark them done with the corrected fact, and no edit is part of this half beyond MILESTONES.md:75-77.

## Q3. The wording-only info findings (DEBT-04, D-03)

Original wording: `.planning/milestones/v1.2-MILESTONE-AUDIT.md:30-65` and the per-phase `*-REVIEW.md` in `.planning/milestones/v1.2-phases/`.

**24 IN-02, exempt.** The CCR-QD-414 row (`spec/README.md:352`) cites `` `spec/README.md` Rev 1.148 ``; README's own entry `1.148 (2026-11-11): CCR-QD-414 added to the Document history register` shows 1.148 is the revision it was added at. History; no edit. CCR-QD-427 lists it as "exempt".

**24 IN-05, resolved.** `24-REVIEW.md:87-91` quoted the comment "Everything below reads the session after this last yield". `6c198da1` ("The runEffect comment says what is read before the guard (IN-05)") rewrote it, and Phase 25's `FiberHandle` rewrite removed `reap` and `runEffect`: `grep -rn "last yield" packages/*/src` is empty. The `24-REVIEW-DISPOSITION.md` still says `open`, which is a stale record (archived under `.planning/milestones/`, leave).

**24 IN-06, resolved.** `.planning/milestones/v1.2-phases/24-simulation-source-preparation/deferred-items.md:8` reads `## Run-start window: ... — RESOLVED 2026-11-11` and `:12` `**Resolved** by code review WR-01 (\`1ad24867\`)`; written by `12a6631c`. The review's path `.planning/phases/24-.../deferred-items.md` is the pre-archive path.

**25 IN-02, still true. Edit `packages/devtools/test/react/Simulator.test.tsx`.** Lines 9-10 now read `Runs are forked, and a fixture run settles synchronously inside \`runFork\` — so \`act\` around the click is enough and nothing here waits on a timer.` and 415-416 `A fixture run settles inside \`runFork\`, so this cannot catch a late`. The `run` helper (`:95-124`) says a click no longer settles in one `act`.

Replace `9-10` with:

```
 * The session owns every run and the view forks nothing: a click hands the run to
 * the session, which settles it a few scheduler ticks later (`DecisionCache`
 * computes on a detached fiber), so `run` below waits on real ticks and each test
 * reads the settled screen.
```

Replace `414-420` (the comment above `it("unmounts cleanly ...")`) with:

```
  /**
   * The session owns the run, so unmounting the view alone stops nothing; closing
   * the scope does, and the test closes it. A fixture run is settled by the time
   * `run` returns, so this cannot catch a late `setState` by timing. What it does
   * check is that the cleanup path runs without throwing and that nothing is
   * written afterwards, which is the observable half. The interrupt itself is what
   * matters for a live source, and it is the reason a run is a fiber the session
   * holds rather than a promise.
   */
```

**26 IN-01, resolved by Phase 34.** `useRunningStore`, `useDockSnapshot`, `useExplorerSnapshot`, `useHeldChoiceSnapshot` appear nowhere in `packages/devtools/src` or `test`. `9f40fcbb` deleted `useDockSnapshot` (`-export const useDockSnapshot = ... useRunningStore(session, undefined, [session])`); `2086026d` deleted `useExplorerSnapshot` and `useHeldChoiceSnapshot`. Every store read now goes through `useStoreSnapshot.ts`.

**26 IN-03, still true. Edit `packages/devtools/test/model/DockModel.test.ts`.**

- Header `:14-16` reads `A test title names the DOM case it re-states (\`was DevtoolsDock l.N\`) so the dock test can drop that case once this one is green (26-05).` Replace with: `A test title carries a stable case label (\`M1\`, \`M5\`, ...), so a failing run names the rule and not a line in another file.`
- Header `:4` reads `The dock owns six stores (the timeline, the policy rail, the explorer, the` and the list at `:4-5`. `DockModel.ts:2` says "seven stores" and `:21` "The seventh store is the diagnostics reading". Replace with `seven stores (the timeline, the policy rail, the explorer, the role viewer's held choice, the simulation session, the dock session and the diagnostics reading)` and re-wrap.
- The 11 titles at `:186 201 216 247 258 270 282 300 317 399 620`: drop the parenthetical. Mechanical: remove ` (was DevtoolsDock l.N)` after the label (M1, M2, M3, M5, M6, M7, M8, M9, M11, M14) and ` (the wiring stays at DevtoolsDock l.988)` from M4, keeping `M5:` etc. No other file quotes these titles (`grep -rn "was DevtoolsDock"` outside this file: none).

**27 IN-01, still true. Edit `packages/http/src/GuardRoute.ts:83-85`.** Reads `... \`handler\` to the closed \`HttpEnforcementFailure\` union, which is the one the module accepts — deliberately, not an oversight.` Replace `the one the module accepts` with `the one \`enforceRequest\` (\`AuthorizeRequest.ts\`) accepts`. [VERIFIED: `AuthorizeRequest.ts:268-290` the `handler` parameter is `Effect.Effect<H, HttpEnforcementFailure, R>`.]

**27 IN-02, refuted.** `GuardRoute.ts:79-80` reads `lost ARCH-57's probe (\`4b1ed49\`) refuted that`. "lost" is not a typo for "later": `4b1ed49` is the commit of a lost wave that ARCH-61 recovered; the term appears as `GuardRoute.tst.ts:20` "porting lost ARCH-57 L1a from `4b1ed49`", `UnguardedRoute.ts:11-12` "porting lost ARCH-57 L1b from `4b1ed49`", `spec/decisions/047-*.md:288` "porting lost ARCH-48 `950977f`", `spec/behaviors/23-http.md:950` "lost ARCH-47's probe (`b0b9363`)", and seven times in `packages/devtools/src` and `test` for ARCH-48. "later" would be false (the probe came from an earlier, lost wave). **Disposition: refuted, no edit.** If the planner wants the sentence clearer, the only safe wording is `the probe in the lost ARCH-57 wave (\`4b1ed49\`) refuted that`; record the choice in CCR-QD-427.

**28 IN-01, still true. Edit `packages/react/src/GateWriter.ts:7`.** Reads `` `GateRegistry.ts` re-exports the three public types by name; nothing else here `` and `GateRegistry.ts:47` is `export type { GateInstance, GateKind, GateRegistry, GateRenderState } from "./GateWriter.ts";` (four). Replace `the three public types` with `the four public types (\`GateInstance\`, \`GateKind\`, \`GateRegistry\`, \`GateRenderState\`)`; re-wrap.

**28 IN-02, still true. Edit `packages/react/src/GateWriter.ts:164`.** `looked up by {@link useGates}.` to `looked up by \`useGates\` in \`useGate.ts\`.` (`useGates` is `useGate.ts:244`; `GateWriter.ts` no longer imports it).

**28 IN-03, still true. Edit `spec/invariants.md:2676-2680`.** Current:

```
**Source**: `packages/react/src/GateRegistry.ts` (`makeGateRegistry`: every piece
of state is inside the closure, and a colliding id is disambiguated) and
`packages/react/src/GateWriter.ts` (the handle closes over its own key, so a stale
cleanup can only end the registration it made; `OwnedGateRegistry` holds the writer in a
private slot, so only a registry the package built has one).
```

Replacement (the handle is built in `GateRegistry.ts`'s `register`, `:95-119`, closed over `key` and `live`; `GateWriter.ts` holds the `GateHandle` interface at `:95` and `OwnedGateRegistry` at `:129`):

```
**Source**: `packages/react/src/GateRegistry.ts` (`makeGateRegistry`: every piece
of state is inside the closure, a colliding id is disambiguated, and `register`'s
handle closes over its own key, so a stale cleanup can only end the registration it
made) and `packages/react/src/GateWriter.ts` (`OwnedGateRegistry` holds the writer in a
private slot, so only a registry the package built has one).
```

```bash
node scripts/spec-revise.mjs spec/invariants.md "INV-QD-064's Source credits the handle's key closure to GateRegistry.ts, not GateWriter.ts (CCR-QD-427)" --date 2026-11-12
```

Base `1.114` to `1.115`. ADR-QD-140's own Consequences line 99 ("INV-QD-064 hold[s] as written; none was added or reworded") stays true: a Source line is not a requirement.

**28 IN-04, still true as a statement about the whole change. Amend `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md`.** `:106-107` reads `the only test edit is one import in \`GateWriter.test.tsx\`.` Evidence: the split commit `585707b5` changed one test file by one import (3 lines); but `1b43a6fc` earlier in the same change moved the file's `run` helper to `useGateRegistrations(p.writer, [p.identity], [p.state])` and changed its `describe` title and header, `8b03a02c` added `GateWriter.reconcile.test.ts` and `8fbd9f58` added a `GateRegistry.store.test.ts` case. So the sentence is exact for the split and overstated for the change. Add this blockquote after the Consequences list (after `:113`, before `## Alternatives considered`), leaving the bullet as written:

```
> **Amended 2026-11-12 (CCR-QD-427).** "The only test edit is one import" counts the
> split alone. Over the whole change `GateWriter.test.tsx` also moved its `run` helper
> onto `useGateRegistrations(writer, [identity], [state])`, with its `describe` title
> and header, before the split, and the change added `GateWriter.reconcile.test.ts`
> and one `GateRegistry.store.test.ts` case. The Decision is unaffected.
```

```bash
node scripts/spec-revise.mjs spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md "Consequences amended: the test-edit count describes the split alone (CCR-QD-427)" --date 2026-11-12
```

`1.0` to `1.1`. Its `Status` cell (`Accepted — amends ADR-QD-111, ADR-QD-080`) needs no change.

**28 IN-05, still true. Amend `spec/decisions/053-a-gate-can-be-found.md`.** Lines 73-77: `> **Amended by ADR-QD-111.** Registration, the read, the identity and the marker rule now live in one internal \`useGates\` (\`GateWriter.ts\`), ...`. It is history under §15, but ADR-QD-080 (`:159`), ADR-QD-103 (`:56`) and ADR-QD-111 (`:126-138`) each carry a dated note for the move, and this blockquote still reads as a present-tense location claim. The fix is a **new dated amendment line, not an in-place correction** (the old blockquote stays as written). Insert after line 77:

```
> **Amended 2026-11-12 (CCR-QD-427, [ADR-QD-140](./140-a-gates-write-side-is-a-leaf-below-the-atom-set.md)).**
> `useGates` is in `useGate.ts` now, beside `useGate`, `useGateRegistrations` and `KIND_FACTS`;
> `GateWriter.ts` is the React-free write side. The paragraph above is history and stays as written.
```

Also append `, ADR-QD-140` to the `Status` cell (hand edit; `spec-revise` does not touch it): `Accepted — amended by ADR-QD-080, ADR-QD-093, ADR-QD-103, ADR-QD-111, ADR-QD-140; amended 2026-10-08 (the devtools feed)`.

```bash
node scripts/spec-revise.mjs spec/decisions/053-a-gate-can-be-found.md "Amendment: useGates moved from GateWriter.ts to useGate.ts (ADR-QD-140, CCR-QD-427)" --date 2026-11-12
```

`1.5` to `1.6`.

**29 IN-02, exempt; record the correction in CCR-QD-427, do not edit CCR-QD-419's row.** `spec/README.md:357` says `six modules re-pointed` in its file list and `the seven src modules` in its narrative. The seven that import from the leaf `PortName.ts` are `PortAccess`, `PortDerivation`, `PortDescription`, `PortDoubles`, `PortRemote`, `PortServing`, `Ports` (`grep -n 'from "./PortName.ts"' packages/core/src/*.ts` lists those seven plus `PortMetrics.ts`, which now imports the type, and `index.ts`'s `export *`). The `Rev 1.155` is the revision at which the row was added (README entries `1.155 CCR-QD-419` and `1.156 CCR-QD-419 row also lists ADR-QD-123`). A CCR row is the register of what was written then; AGENTS.md §15 exempts change history and D-08 forbids rewriting it. The correction sentence for CCR-QD-427: `CCR-QD-419's "six modules re-pointed" is seven (PortAccess, PortDerivation, PortDescription, PortDoubles, PortRemote, PortServing, Ports), and the README revision it cites is the one it was added at.`

**29 IN-03, still true. Edit `spec/decisions/123-a-metric-is-declared-once.md:129`.** `stands: \`PortMetrics.ts\` still imports the leaf, not the other way round, so the type-only cycle` to `stands: \`PortMetrics.ts\` now imports the leaf, never the reverse, so the type-only cycle` (`PortMetrics.ts:49` is `import type { PortName } from "./PortName.ts";`, new in ARCH-77). This sits inside the 2026-11-12 amendment written the day before, so the one-word correction is made in place and recorded as a Revision entry, not as a second amendment.

```bash
node scripts/spec-revise.mjs spec/decisions/123-a-metric-is-declared-once.md "Amendment wording: PortMetrics.ts now imports the PortName leaf (CCR-QD-427)" --date 2026-11-12
```

`1.1` to `1.2`.

## Q4. Stale citations and carried wording (DEBT-05, D-02 item 5)

### `v4-http-smoke.test.ts` [VERIFIED: `packages/http/test/v4-http-smoke.test.ts:105-116`]

`:106` reads `// shape RequirePermission.ts and PermissionRegistry.ts's \`registerApi\``; `:115` reads `// Canary for the effect API only: \`registerApi\` now reads \`endpoint.annotations\``. `registerApi` was deleted by `b655b3be` ("one layer that guards an HttpApi", `GuardApi.ts:1-11`). The walk that reads annotations is `planApi` (`AccessPlan.ts:162-210`, which reads `endpoint.annotations` at `:201` and says "never \`HttpApi.reflect\`'s \`mergedAnnotations\`" at `:166-168`), reached through `guardApi` (`GuardApi.ts:86`). Replace both:

- `:105-106`: `shape RequirePermission.ts and AccessPlan.ts's \`planApi\` (reached through \`guardApi\`)` then keep the line-wrap as needed.
- `:115`: `Canary for the effect API only: \`planApi\` reads \`endpoint.annotations\``.

### `stryker.http.mjs` [VERIFIED: `stryker.http.mjs:22-23`]

The comment reads ``` `GuardApi.ts`'s `guardApi` and `PermissionRegistry.ts`'s `addGuardedRoute` (called while the same file's `AppLayer` is constructed) ```. `addGuardedRoute` is declared in `GuardRoute.ts:113-126` (ARCH-75, CCR-QD-417: "`guardRoute` ... is absorbed into `addGuardedRoute` in `GuardRoute.ts` ... `PermissionRegistry.ts` holds the registry and the `/__permissions` routes are `PermissionRegistryRoute.ts`"). `RequirePermission.ts:162 requiresPermission` and `GuardApi.ts:86 guardApi` are correct. Replace `PermissionRegistry.ts`'s `addGuardedRoute` with `GuardRoute.ts`'s `addGuardedRoute`. The comment on lines 8-9 ("`PermissionRegistry`'s `/__permissions` route shipped unguarded by default (BEH-QD-180)") records what shipped in 2026-08 and stays as history.

**Judging-file safety:** the edit is inside the leading `/** ... */` block (lines 1-33); the config body starts at `export default {` (line 35). Prove byte-identity with:

```bash
diff <(git show d31a25ee:stryker.http.mjs | sed -n '/^export default/,$p') <(sed -n '/^export default/,$p' stryker.http.mjs) && node --check stryker.http.mjs && node scripts/check-dod-table.mjs
```

`check-dod-table.mjs` (`pnpm spec:gates`) reads every `stryker*.mjs` threshold; it printed `dod-table: 25 step(s) match pnpm check, 141 reference(s) resolve` at the base.

### `DecisionCache.test.ts:864` [VERIFIED: lines 864-866]

Current: `// Flushed while ask 1 is still in flight. Advances \`generation\` / and empties \`inFlight\`, so ask 1's claim is no longer the one at / \`key\` from this point on.` Phase 31 (`ce9d2a46`, "DecisionCache keeps no generation counter") removed the counter; `grep -rn generation packages/core/src/DecisionCache.ts packages/core/test/DecisionCache.test.ts packages/core/test/SharedComputation*.ts` finds only this line. What `clear` does now (`DecisionCache.ts:273-281`): replaces `entries` and `insertionOrder` with empty ones, then `shared.reset()`, which marks every in-flight claim Superseded and takes it out of `inFlight` (`SharedComputation.ts:56-69` doc, `:88-92` the transition table); a superseded compute keeps running and answers its waiters but its exit never reaches the adapter. Replace `864-866` with:

```
          // Flushed while ask 1 is still in flight. `clear` resets the shared
          // computation, which supersedes ask 1's claim and takes it out of
          // `inFlight`, so it is no longer the claim at `key` and nothing it
          // computes is written into the emptied cache.
```

The following comments (`:869-880`, `:891-894`) describe the identity-checked removal in `SharedComputation.ts:141-147` and stay true.

### ADR-QD-081 [VERIFIED: `spec/decisions/081-enforcement-error-classes-live-in-core.md:51-57`]

`D-04-b` reads `**D-04-b: \`StandingEvaluationServices\`.** \`Exclude<EvaluationServices, CurrentSubject>\` is named once in \`Evaluate.ts\`; \`SubjectSetServices\`, \`QadiRuntimeServices\`, \`EvaluationServicesNone\`, ...`. At the base `Evaluate.ts` declares only `evaluate` (34 lines) and `StandingEvaluationServices` is `export type StandingEvaluationServices = Exclude<EvaluationServices, CurrentSubject>;` at `packages/core/src/EvaluationServices.ts:40`, moved by `e6302d32` ("EvaluateOptions beside QuestionOptions, the services in a type-only leaf", Phase 32; ADR-QD-105's revision note at `:104-117` says so). The barrel exports it (`index.ts:21`). The "Implemented" list at `:115` names `Evaluate.ts` as a file touched when written (history). CCR-QD-423 recorded "ADR-QD-081's paragraph ... is history and is left as written", so the fix is an amendment. Insert after line 57 (the paragraph ending "pinned by `GuardRoute.tst.ts`."):

```
> **Amended 2026-11-12 (CCR-QD-427, [ADR-QD-105](./105-an-obligation-is-discharged-against-the-question-it-answered.md)'s revision note).**
> `StandingEvaluationServices` is declared once in the type-only
> `packages/core/src/EvaluationServices.ts`, beside `EvaluationServices`; `Evaluate.ts`
> declares only `evaluate`. The paragraph above names the file as it was when written,
> and so does the Implemented list below. The users it names are unchanged.
```

```bash
node scripts/spec-revise.mjs spec/decisions/081-enforcement-error-classes-live-in-core.md "Amendment: StandingEvaluationServices is declared in EvaluationServices.ts, not Evaluate.ts (ARCH-80, CCR-QD-427)" --date 2026-11-12
```

`1.1` to `1.2`. Status cell (`Accepted — amends ADR-QD-072, ADR-QD-075`) unchanged (amended by ADR-QD-105's note is not an ADR amendment of 081's decision).

### Comments in `packages/*/src` naming `Evaluate.ts` [VERIFIED: `grep -rn "Evaluate\.ts" packages/*/src`, 35 lines, each read with 3 lines of context]

What lives where now (each opened): `Evaluate.ts` is `evaluate` only, `Effect.map(ask(policy, options), ...)`. `Lifecycle.ts`: id, clock, `serviceOption(DecisionCache)` (`:80`), metrics, the denial `Effect.logDebug` (`:165`). `SinkEmit.ts:50`: `Effect.serviceOption(DecisionSink)`. `Walk.ts`: the interpreter (`subject.roles.has(policy.role)` at `:321`, `mergeFields` at `:509`, `exhaustive: !anyOfStopsAtAllow(policy.fieldStrategy)` at `:625`). `PortAccess.ts`: `readAttribute` (`:340`, with `Object.hasOwn(subject.attributes, attribute)` at `:347`), `askRelationship` (`:436`). `RelationshipResolver.ts`: `MAX_RELATIONSHIP_DEPTH` (`:198`), `clampRelationshipDepth` (`:212`), `relationshipAsks` (`:230`).

**Wrong (fix; every edit is comment-only):**

| file:line | says | now | replacement |
|-----------|------|-----|-------------|
| `core/src/DecisionSink.ts:15` | "`Evaluate.ts` already documents a deliberate cardinality objection to putting even the denial *reason* on a span" | the objection is `EvaluationMetrics.ts:92-102` (`denialsByPolicyTagTotal`: keyed on `policy._tag`, not the reason, which stays on the `Lifecycle.ts` log line); the span (`Lifecycle.ts:141-157`) carries no reason | "`EvaluationMetrics.ts` already documents a deliberate cardinality objection to keying anything on the denial *reason*" |
| `audit/src/AuditDecisionSinkLive.ts:112` | "the same shape `DecisionSink` itself is read in `Evaluate.ts`" | `SinkEmit.ts:50` `Effect.serviceOption(DecisionSink)` | `Evaluate.ts` to `SinkEmit.ts` |
| `audit/src/CircuitBreaker.ts:163` | "the `Decision.ts`/`Evaluate.ts` `*_BY_TAG` idiom" | no `*_BY_TAG` in either; it is `EvaluationMetrics.ts:131` `EVALUATION_ERROR_TAGS_BY_TAG` (and `PortMetrics.ts:58`) | "the `EvaluationMetrics.ts` `*_BY_TAG` idiom" |
| `http/src/QadiHttpError.ts:448` | "what `Evaluate.ts`'s own `Effect.logDebug` already records in full" | `Lifecycle.ts:165` | `Evaluate.ts` to `Lifecycle.ts` |
| `core/src/AuthSubject.ts:20` | "`subject.roles.has(policy.role)` (`Evaluate.ts`)" | `Walk.ts:321` | `Walk.ts` |
| `core/src/Policy.ts:184` | same | same | `Walk.ts` |
| `core/src/Policy.ts:415` | "`Evaluate.ts`'s own `MAX_RELATIONSHIP_DEPTH`" | `RelationshipResolver.ts:198` | `RelationshipResolver.ts`'s |
| `core/src/Policy.ts:410,418` (same comment block, names `PortAccess.ts`) | "`PortAccess.ts`'s runtime `clampRelationshipDepth`", "`clampRelationshipDepth` stays in `PortAccess.ts`" | `RelationshipResolver.ts:212`; `grep -n clampRelationshipDepth packages/core/src/PortAccess.ts` is empty | `PortAccess.ts` to `RelationshipResolver.ts` in both |
| `core/src/Policy.ts:777` | "`Evaluate.ts`'s `exhaustive := fieldStrategy !== \"First\"` check" | `Walk.ts:625` `exhaustive: !anyOfStopsAtAllow(policy.fieldStrategy)` (`ShortCircuit.ts`) | "`Walk.ts`'s `exhaustive` (`!anyOfStopsAtAllow(policy.fieldStrategy)`) check" |
| `core/src/Explanation.ts:514` | "`Evaluate.ts`'s independent, semantic `exhaustive` check" | `Walk.ts:625` | `Walk.ts`'s |
| `core/src/RelationshipResolver.ts:48` | "`Evaluate.ts` clamps `HasRelationship.depth` to `[0, 64]` before ever constructing this request" | `relationshipAsks` in this file (`:230-243`) | "`relationshipAsks` (below) clamps ..." |
| `core/src/RelationshipResolver.ts:115` | "`Evaluate.ts`'s only call site always asks about the subject being evaluated" | `PortAccess.ts:436` `askRelationship`, called from `Walk.ts` | "`askRelationship`'s only call site (`PortAccess.ts`) ..." |
| `core/src/AttributeResolver.ts:73` | "the one call site both `Evaluate.ts` and `Predicate.ts` reach this through" | `PortAccess.ts` `readAttribute` is correct; the interpreter that calls it is `Walk.ts` | `Evaluate.ts` to `Walk.ts` |
| `core/src/Matcher.ts:326` | "`readAttribute` (`Evaluate.ts`)" | `PortAccess.ts:340` (own-property guard `:347`) | `PortAccess.ts` |
| `core/src/UntrustedDecode.ts:35` | "bounds a decoded `Policy` at evaluation time (`Evaluate.ts`)" | the depth check raising `PolicyTooDeep` is in `Walk.ts` (`:20`, `:282`); `Question.ts:184` carries `maxDepth` | `Walk.ts` |
| `core/src/SecurityLabel.ts:143` | "If `Evaluate.ts` ever imports this, that boundary has been crossed" | the evaluator path is `Walk.ts`; `Evaluate.ts` is a 34-line wrapper | `Walk.ts` |

(`DecisionSink.ts:15` is the flagged one and is confirmed. `Identity.ts:14` "rather than `AuthSubject.ts`/`Evaluate.ts`" is a design-history sentence about a pair of owning files; `Resource` now lives in `Resource.ts`. It is probably meant `AuthSubject.ts`/`Resource.ts`, but I could not confirm which pair the author meant, so it is listed under Open Questions, not as a fix.)

**Correct, history, or pinned (leave):**

| file:line | why it stays |
|-----------|--------------|
| `core/src/Qadi.ts:29`, `SubjectSet.ts:35`, `index.ts:17` | import and export of `evaluate`, which `Evaluate.ts` still declares |
| `core/src/EvaluationServices.ts:4,5`, `Lifecycle.ts:17`, `Question.ts:6,10` | true: `Evaluate.ts` imports `Lifecycle.ts` and both read the leaves below them |
| `core/src/Resource.ts:4,5,6`, `Policy.ts:550`, `Matcher.ts:403`, `FieldLattice.ts:21` | past tense: an account of where code used to live (`Resource` "where it used to live", ARCH-02 C5, `refIsUnresolved` "deleted (ARCH-08 T12)", "used to be split four ways") |
| `core/src/PortName.ts:28`, `PortMetrics.ts:26,35,36` | "Every port `Evaluate.ts` can call into" names the evaluator entry point `evaluate` as opposed to `toPredicate`, which is how `portCallsTotal` is scoped. Defensible; changing them while the metric description stays would leave the two disagreeing |
| `core/src/PortMetrics.ts:85` | **a runtime string, not a comment.** The `portCallsTotal` description `"Scoped to Evaluate.ts only — Predicate.ts's translateNode reaches the same ports via a second interpreter and is not counted here."` is asserted verbatim at `packages/core/test/Ports.test.ts:385` and is part of the registry key (`type:id:description`, per the Effect metric-registry note in the project memory). Editing it is a behaviour change and out of scope |

**Mutation and changesets for these edits.** These touch about 17 `packages/*/src` files (core, audit, http) and 4 test files by comment only. Stryker scores cannot move on a comment edit, but D-10 says the mutation base covers "every src file the phase will touch"; the planner should decide whether the comment-only files join the base (see Open Questions). No changeset is needed for a comment-only edit (precedent above).

## Q5. The records (WX-02, D-06..D-08, D-12)

### Documents this half edits, with Revision at the base [VERIFIED: `grep -m1 "^> | Revision"` on each]

| document | Revision at base | after (this half only) | why |
|----------|------------------|------------------------|-----|
| `spec/behaviors/29-devtools-simulator.md` | 1.15 | 1.16 | DEBT-01 |
| `spec/traceability.md` | 1.159 | 1.160 | DEBT-02 |
| `spec/invariants.md` | 1.114 | 1.115 | 28 IN-03 |
| `spec/decisions/081-*.md` | 1.1 | 1.2 | ADR-081 amendment |
| `spec/decisions/053-*.md` | 1.5 | 1.6 | 28 IN-05 (+ Status cell) |
| `spec/decisions/140-*.md` | 1.0 | 1.1 | 28 IN-04 |
| `spec/decisions/123-*.md` | 1.1 | 1.2 | 29 IN-03 |
| `spec/README.md` | 1.163 | 1.164 | CCR-QD-427 row |
| `spec/overview.md` | 1.99 | unchanged | no export or module-column change |
| `spec/decisions/index.yaml` | n/a | unchanged | no new ADR |

The code half may also bump `traceability.md`, `invariants.md`, `behaviors/*` and `README.md`; take the Revision at write time and cite the final ones in CCR-QD-427.

### The CCR-QD-427 row

The register is `spec/README.md` "## Document history" (heading at `:222`), a table with header `| CCR | Date | Change |`; the 4xx rows are consecutive at `:345-363` (CCR-QD-407 at 345, CCR-QD-426 at 363, then older rows resume at 364 with CCR-QD-270). **Insert the new row immediately after the CCR-QD-426 row (line 363).** Shape, from CCR-QD-426: four cells, `| CCR-QD-427 | 2026-11-12 | <comma-separated files, each spec doc with its Rev> | <ARCH-or-topic id>. **Bold title.** narrative ... Used: ... Unused: ... |`. CCR-QD-426's tail reads `Used: ARCH-83, ADR-QD-148, CCR-QD-426, BEH-QD-511..515, INV-QD-315..316. Unused: none.` and CCR-QD-419's reads `Used: none of the reserved ADR, BEH or INV numbers. Unused: ADR-QD-141 (no decision to record; ...), BEH-QD-480..484 and INV-QD-302..303 (behaviour unchanged). No defect fixed (WX-06).`

Skeleton for this half (the code half appends its own files and items):

```
| CCR-QD-427 | 2026-11-12 | `spec/behaviors/29-devtools-simulator.md` Rev 1.16, `spec/traceability.md` Rev 1.160, `spec/invariants.md` Rev 1.115, `spec/decisions/081-enforcement-error-classes-live-in-core.md` Rev 1.2 (amendment), `spec/decisions/053-a-gate-can-be-found.md` Rev 1.6 (amendment), `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md` Rev 1.1 (amendment), `spec/decisions/123-a-metric-is-declared-once.md` Rev 1.2, `spec/README.md` Rev 1.164, `.planning/MILESTONES.md`, <comment-only files>, <the code half's files> | **Carried spec debt and stale records.** <fixed items, resolved items with their commits, exempt items>. DEBT-02 named `Source.ts`; the stale token meant `Sources.ts`, renamed `SimulationSource.ts` in `dab09bc0` and already listed, so the token is removed (deviation from the requirement wording). 27 IN-02 is not a typo ("lost ARCH-57" is the house term). CCR-QD-419's "six modules re-pointed" is seven, and the README revision it cites is the one it was added at (not edited; this row records the correction). ADR: none. Used: CCR-QD-427, <BEH/INV the code half used>. Unused: <the rest of BEH-QD-516..520 and INV-QD-317..318>, ADR-QD-149 (no fix was a design decision). |
```

Revision entry: `node scripts/spec-revise.mjs spec/README.md "CCR-QD-427 — carried spec debt and stale records (DEBT-01 to DEBT-05)" --date 2026-11-12`.

**CCR citation rule.** `verify-traceability.sh` check 7 fails if any `CCR-QD-NNN` cited anywhere in `spec/` or `AGENTS.md` has no `| CCR-QD-NNN` row in the register (a closed `KNOWN_GAPS` list of 17 old ids is allowed; `:289-300`). So every amendment line above that cites CCR-QD-427 is valid only once the row exists: land the row in the same commit as, or before, the first spec edit that cites it, or the gate fails mid-phase.

### New numbers

None of this half's items needs a BEH, INV or ADR: they are wording, a deduplication, amendments of ADRs, a Source line and a module name. The reserved ranges (BEH-QD-516..520, INV-QD-317..318; ADR-QD-149 only for a design decision) stay for the code half; the shared file read this session shows `{"CCR": 427, "ADR": 148, "BEH": 520, "INV": 318}`, so CCR-QD-427 is already reserved.

### Traceability and overview

- `spec/traceability.md`: one change, row 71 (DEBT-02), plus its Revision entry. No test-file row changes: the edited tests (`Simulator.test.tsx`, `DockModel.test.ts`, `DecisionCache.test.ts`, `v4-http-smoke.test.ts`) are already rows and only comments or titles change.
- `spec/overview.md` (gate 13, `pnpm spec:api`): no change. No export is added, removed or moved; the edits are comments and amendments.

### Which gate verifies which edit

| edit kind | gate (from repo root) |
|-----------|-----------------------|
| any spec `Revision` / `Change History` | `node scripts/spec-revise.mjs --check` (also run inside `verify-traceability.sh` check 8) |
| spec structure, links, CCR register, test-file rows | `pnpm spec:verify:strict` (`bash spec/scripts/verify-traceability.sh --strict`; 21 checks passed at the base) |
| fences in spec, AGENTS.md, READMEs | `pnpm spec:examples` (`node scripts/check-doc-examples.mjs`); BEH-29 has one compiled fence, outside the deleted span |
| Stryker config thresholds | `pnpm spec:gates` (`node scripts/check-dod-table.mjs`) |
| src/test placeholders, house rules | `pnpm lint` (`oxlint && node scripts/check-house-style.mjs`); `[no-numbering-placeholder]` refuses `ADR-QD-NEXT`, `CCR-QD-NEXT`, `BEH-QD-NEXT`, `INV-QD-NEXT` (and suffixed forms) in `packages/*/{src,test,bench}` and `features/` (`check-house-style.mjs:2090-2135`); `spec/` is out of its scope |
| API surface | `pnpm spec:api`: not affected |
| website docs | `pnpm spec:website-examples`: not affected (no `apps/website` edit) |
| devtools claims | `pnpm spec:claims`: not affected (no `spec/devtools-spec/` edit) |
| full merge gate | `pnpm check:pr < /dev/null` at the end (the website typecheck prompt needs stdin closed) |

## Common Pitfalls

### Pitfall 1: editing the `portCallsTotal` description while fixing comments
**What goes wrong:** `PortMetrics.ts:85` looks like prose; it is a `Metric.frequency` description. `Ports.test.ts:385` asserts it and the registry keys on `type:id:description`, so a reader that re-declares it reads zero.
**How to avoid:** leave line 85 alone; the verification row for Q4 compares code with comments removed.
**Warning signs:** `Ports.test.ts` fails; `git diff` shows a change inside a string literal.

### Pitfall 2: a `CCR-QD-427` citation before its register row
**What goes wrong:** `verify-traceability.sh` check 7 fails ("drift from KNOWN_GAPS ... got [... 427 ...]").
**How to avoid:** add the row (and its README Revision entry) in the first commit that cites it, then amend it as the phase proceeds.

### Pitfall 3: `spec-revise` without `--date`
**What goes wrong:** the script drops its document argument (`STATE.md:316`).
**How to avoid:** always pass `--date 2026-11-12`; run `--check` after.

### Pitfall 4: dropping the wrong half of the BEH-QD-221 duplicate
**What goes wrong:** keeping copy 2 restores the stale "MUST answer the fail-closed default" requirement and `INV-QD-007` contradiction with BEH-QD-411.
**How to avoid:** delete `175-345`, keep `346-351`; check with the greps in Validation Architecture.

### Pitfall 5: hard-wrapped lines
**What goes wrong:** the house style hand-wraps at about ninety columns (AGENTS.md §17); a replacement longer than the original unwraps and `oxfmt` is not a gate, so nothing catches an over-long line.
**How to avoid:** wrap every replacement above by hand.

### Pitfall 6: re-pointing a link into the removed span
**What goes wrong:** the only link lost is the ADR-QD-109 link inside copy 2's signature paragraph; no other document links into it. If a reviewer restores the paragraph elsewhere, `relative link integrity` still passes, so there is no gate to notice. Keep the deletion complete.

## Code Examples

The comment-only proof (written and tested this session in the scratchpad; a copy must live outside the repo or be run from `node -e`):

```js
// usage: node codeonly.mjs <file> <baseRev>   exit 0 iff the file's code equals <baseRev>'s once comments are removed
import ts from "/Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/typescript.js";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const [file, rev] = process.argv.slice(2);
const strip = (src) =>
  ts.transpileModule(src, {
    fileName: file,
    compilerOptions: { removeComments: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, verbatimModuleSyntax: true },
  }).outputText;
const base = execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8" });
const same = strip(base) === strip(readFileSync(file, "utf8"));
console.log(same ? "code-identical" : "CODE DIFFERS");
process.exit(same ? 0 : 1);
```

Tested: it printed `code-identical` for `packages/devtools/src/model/HeldChoice.ts` and `SimulationSession.ts` across the comment-only commit `0e340791`, and `CODE DIFFERS` for `SimulationSession.ts` across `6c198da1` (a code change). The root `node_modules/typescript` is 7.0.2 (native, no `transpileModule`), so the script uses the pinned 6.0.3 under `.pnpm`.

## State of the Art

| Old | Current | When | Impact |
|-----|---------|------|--------|
| `registerApi` plus `RequirePermissionLive` | `guardApi` over `planApi` | `b655b3be` (2026-10-12) | stale citations in a smoke test |
| `addGuardedRoute` in `PermissionRegistry.ts` | `GuardRoute.ts`; routes in `PermissionRegistryRoute.ts` | ARCH-75 (CCR-QD-417) | stale Stryker comment |
| `StandingEvaluationServices` in `Evaluate.ts` | `EvaluationServices.ts` | `e6302d32` (Phase 32) | ADR-QD-081 amendment |
| `Sources.ts` | `SimulationSource.ts` | `dab09bc0` | traceability token |
| `generation` counter | `SharedComputation.reset` supersedes claims | `ce9d2a46` (Phase 31) | a test comment |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The BEH duplicate arose because an edit anchored on text inside the header Change History cell | Q1 | none for the fix; only the narrative in SUMMARY |
| A2 | The replacement wording for the 25 IN-02 comments (a run "settles a few scheduler ticks later") is accurate beyond the `run` helper's own comment | Q3 | a slightly wrong sentence in a test comment |
| A3 | Dropping the signature requirement (copy 2 `335-344`) loses nothing that BEH-QD-411 plus ADR-QD-109 do not state | Q1 | a reviewer may want the signature rationale kept in BEH-QD-221 |
| A4 | Not putting comment-only files in the D-10 mutation base is acceptable | Q4 | contradicts D-10's literal "every src file the phase will touch" |

## Open Questions

1. **DEBT-02's wording versus the truth.**
   - Known: `Source.ts` is behaviour 27's module; the stale token meant `SimulationSource.ts`, already listed.
   - Unclear: whether the user wants the literal `Source.ts` anyway.
   - Recommendation: delete `Sources,`, record the deviation in CCR-QD-427 and the SUMMARY (CCR-QD-417 has precedent for "deviations from the requirement wording, with reasons").
2. **27 IN-02.** Recommend refuted with no edit; the optional clearer wording is in Q3. The planner should confirm the user is content with "refuted" as a third disposition beside fixed and resolved (D-03 names two).
3. **Comment-only files and D-10.** About 17 src files change by comment only. Either list them in the mutation base (cost: core runs are long) or record that comment edits cannot move a Stryker score and exclude them. Recommendation: exclude, state it in the base commit message, and prove "comments only" with the script above.
4. **`Identity.ts:14`** ("rather than `AuthSubject.ts`/`Evaluate.ts`"): unclear whether the intended pair is now `AuthSubject.ts`/`Resource.ts`. Recommendation: leave unless the planner reads the git history of `Identity.ts` first.
5. **`PortName.ts:28` and `PortMetrics.ts:26,35,36`** say "port `Evaluate.ts` can call into". Recommendation: leave (defensible, and consistent with the pinned metric description); a reviewer may prefer "`evaluate` can call into".
6. **ADR-QD-140 and ADR-QD-123 edit form.** I recommend an amendment blockquote for ADR-140 (a Consequences sentence, per D-12) and an in-place one-word edit for ADR-123 (a slip inside a 1-day-old amendment). Confirm if the user wants both as amendments.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | `spec-revise`, gates, the comment-only proof | yes | v26.13.0 | none needed |
| pnpm | `pnpm spec:*`, `pnpm lint` | yes | 10.17.1 | none needed |
| git | base comparisons | yes | repo present | none needed |
| `typescript@6.0.3` under `node_modules/.pnpm` | the comment-only proof | yes | 6.0.3 | `esbuild@0.28.2` is also installed |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | none new; spec gates are shell and node scripts; vitest for the touched test files |
| Config file | `vitest.config.ts` per package (not touched) |
| Quick run | `node scripts/spec-revise.mjs --check && bash spec/scripts/verify-traceability.sh --strict` |
| Full suite | `pnpm check:pr < /dev/null` |
| Test files touched (comments/titles only) | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts < /dev/null`, same for `test/react/Simulator.test.tsx`; `--project core packages/core/test/DecisionCache.test.ts`; `--project http packages/http/test/v4-http-smoke.test.ts` (not run by me) |

### Sampling

- **After each task commit:** the grep rows below for the item just edited, `node scripts/spec-revise.mjs --check`, and for a src/test comment edit the comment-only proof.
- **After each wave:** `bash spec/scripts/verify-traceability.sh --strict`, `node scripts/check-dod-table.mjs`, `pnpm lint`, and `pnpm spec:examples` when a spec fence could have moved (any `29-*.md` edit).
- **Before verification:** `pnpm check:pr < /dev/null`.
- Say what I would run instead of the slow gates: `pnpm check`, Stryker and the e2e are not run for this half; `pnpm check:pr` is the closing gate and omits only mutation.

### Per-item checks

`B=d31a25ee`; `F29=spec/behaviors/29-devtools-simulator.md`.

| Item | Command (repo root) | Expected |
|------|---------------------|----------|
| DEBT-01: one block each | `for n in 219 220 221; do grep -c "^## BEH-QD-$n:" $F29; done` | `1` three times |
| DEBT-01: stale requirements gone | `grep -c "MUST answer the fail-closed default\|not answer an empty list" $F29` | `0` |
| DEBT-01: current text present once | `grep -c "MUST fail with the port's own typed" $F29; grep -c "BEH-QD-410) MUST NOT be captured" $F29` | `1`, `1` |
| DEBT-01: tail prose present once | `grep -c 'CapturedAnswers` is keyed by port name (' $F29` | `1` |
| DEBT-01: header once, no fragment | `grep -c "^_Previous:" $F29; grep -c "^> | Change History" $F29` | `1`, `1`; and `grep -c "an unseen query's answer is the description's" $F29` is `1` (only inside line 13) |
| DEBT-01: fence parity | `awk '/^```/{n++} END{exit n%2}' $F29` | exit 0 |
| DEBT-01: pure deletion plus the two header lines | `diff <(git show $B:$F29 \| sed -n '9,12p;14,174p;346,1056p') <(sed -n '9,12p;14,174p;175,885p' $F29)` after the revise call, or `git diff --numstat $B -- $F29` | `diff` empty; numstat `2	173` |
| DEBT-01: Revision | `grep -m1 "^> | Revision" $F29` and `node scripts/spec-revise.mjs --check` | `1.16`; clean |
| DEBT-01: no `-1` anchor consumer | `grep -rn "every-source-mode-1\|compile-error-1\|reproduces-them-1" spec apps packages` | empty |
| DEBT-01: compiled fences | `pnpm spec:examples` | pass, block count unchanged |
| DEBT-02 | `sed -n 71p spec/traceability.md \| grep -c "Sources"` | `0` |
| DEBT-02: every listed module exists | `node -e 'const l=require("fs").readFileSync("spec/traceability.md","utf8").split("\n")[70];const m=/model\/\{([^}]*)\}\.ts/.exec(l)[1].split(",");const bad=m.filter(n=>!require("fs").existsSync("packages/devtools/src/model/"+n+".ts"));console.log(bad.length?bad:"all exist");process.exit(bad.length?1:0)'` | `all exist` |
| DEBT-02: nothing else moved | `git diff -U0 $B -- spec/traceability.md \| grep -c '^@@'` | `2` hunks at most (header rows, row 71) |
| DEBT-03 | `grep -n "needs a decision" .planning/MILESTONES.md` | shows the line inside `~~ ~~` with "closed in v1.1" |
| DEBT-03: no other live claim | `grep -rniE "fail-open.*(undecided\|needs a decision)\|undecided.*fail-open" .planning/PROJECT.md .planning/MILESTONES.md .planning/STATE.md spec apps/website/src packages/*/src` | only struck-through lines and quoted history |
| 24 IN-02 | `git diff -U0 $B -- spec/README.md \| grep -c "CCR-QD-414"` | `0` (row untouched) |
| 24 IN-05 | `grep -rn "last yield" packages/*/src` | empty |
| 24 IN-06 | `grep -c "RESOLVED 2026-11-11" .planning/milestones/v1.2-phases/24-simulation-source-preparation/deferred-items.md` | `1` |
| 25 IN-02 | `grep -c "settles synchronously inside\|settles inside \`runFork\`" packages/devtools/test/react/Simulator.test.tsx` | `0`; and `node <codeonly.mjs> packages/devtools/test/react/Simulator.test.tsx $B` is `code-identical` |
| 26 IN-01 | `grep -rn "useRunningStore\|useDockSnapshot\|useExplorerSnapshot\|useHeldChoiceSnapshot" packages/devtools/src packages/devtools/test` | empty |
| 26 IN-03 | `grep -c "was DevtoolsDock\|DevtoolsDock l\.\|(26-05)\|six stores" packages/devtools/test/model/DockModel.test.ts` | `0`; and `grep -c "M[0-9]*:" ...` unchanged in count; comment-only proof `code-identical` is NOT expected here because titles are strings: instead `git diff -U0 $B -- packages/devtools/test/model/DockModel.test.ts \| grep '^[-+]' \| grep -v '^[-+][-+]' \| grep -vc "it.effect(\"M\|^[-+] \*\|^[-+]//"` should be `0` |
| 27 IN-01 | `grep -c "the one the module accepts" packages/http/src/GuardRoute.ts` | `0`; proof `code-identical` |
| 27 IN-02 | `git diff -U0 $B -- packages/http/src/GuardRoute.ts \| grep -c "lost ARCH-57"` | `0` removed lines (or only the optional rewording) |
| 28 IN-01, IN-02 | `grep -c "three public types\|{@link useGates}" packages/react/src/GateWriter.ts` | `0`; proof `code-identical` |
| 28 IN-03 | `sed -n '/^## INV-QD-064/,/^\*\*Implication/p' spec/invariants.md \| grep -c "handle closes over its own key"` and that clause sits next to `GateRegistry.ts` | the clause appears inside the `GateRegistry.ts` parenthetical; `GateWriter.ts` parenthetical holds only `OwnedGateRegistry`; Rev `1.115` |
| 28 IN-04 | `grep -c "Amended 2026-11-12 (CCR-QD-427)" spec/decisions/140-*.md` | `1`; original bullet still present: `grep -c "the only test edit is one import" spec/decisions/140-*.md` is `1` |
| 28 IN-05 | `grep -c "Amended 2026-11-12" spec/decisions/053-a-gate-can-be-found.md`; `grep -c "ADR-QD-140" ...` Status | `1`; Status contains `ADR-QD-140`; original blockquote line `now live in one internal \`useGates\` (\`GateWriter.ts\`)` still present |
| 29 IN-02 | `git diff -U0 $B -- spec/README.md \| grep -c "six modules re-pointed"` | `0` removed lines |
| 29 IN-03 | `grep -c "still imports the leaf" spec/decisions/123-*.md; grep -c "now imports the leaf" spec/decisions/123-*.md` | `0`, `1` |
| DEBT-05 smoke test | `grep -c "registerApi" packages/http/test/v4-http-smoke.test.ts`; `node <codeonly.mjs> packages/http/test/v4-http-smoke.test.ts $B` | `0`; `code-identical` |
| DEBT-05 stryker | `diff <(git show $B:stryker.http.mjs \| sed -n '/^export default/,$p') <(sed -n '/^export default/,$p' stryker.http.mjs)`; `grep -c "PermissionRegistry.ts\`'s \`addGuardedRoute\`" stryker.http.mjs`; `node --check stryker.http.mjs`; `node scripts/check-dod-table.mjs` | diff empty; `0`; ok; ok |
| `DecisionCache.test.ts:864` | `grep -c "generation" packages/core/test/DecisionCache.test.ts`; proof `code-identical` | `0`; `code-identical` |
| ADR-QD-081 | `grep -c "Amended 2026-11-12 (CCR-QD-427" spec/decisions/081-*.md`; original `named once in` line present | `1`; present |
| `Evaluate.ts` comments | for each file in the Q4 "wrong" table: `node <codeonly.mjs> <file> $B`; plus `grep -rn "Evaluate\.ts" packages/*/src \| wc -l` | every file `code-identical`; the count falls from 35 to the correct/history/pinned remainder (about 20) |
| `Evaluate.ts` pin | `git diff -U0 $B -- packages/core/src/PortMetrics.ts \| grep -c "Scoped to Evaluate.ts only"` | `0` |
| records | `grep -c "^| CCR-QD-427 " spec/README.md`; `bash spec/scripts/verify-traceability.sh --strict` | `1`; `FAIL: 0` |
| numbers | `grep -rn "ADR-QD-NEXT\|CCR-QD-NEXT\|BEH-QD-NEXT\|INV-QD-NEXT" packages features` | empty |
| Revisions | `node scripts/spec-revise.mjs --check` | clean |
| code-behaviour items | see `36-RESEARCH-CODE.md` § Validation Architecture | n/a |

### Wave 0 gaps

None: every check is a grep, a node one-liner, the comment-only proof script (kept in the scratchpad or run from `node -e`, not committed), or an existing gate.

## Security Domain

`security_enforcement` is enabled in `.planning/config.json`. This half edits documentation, comments, test titles and a Stryker comment. No input is parsed, no dependency is added, no network call is made.

| ASVS category | Applies | Control |
|---------------|---------|---------|
| V2, V3, V4, V6 | no | none touched |
| V5 input validation | no | none touched |
| V14 configuration | marginal | `stryker.http.mjs` is a judging file: edit only the comment, prove the config body byte-identical (Q4) |

Threat pattern relevant here: weakening a mutation gate through a config edit (Tampering). Mitigation: the byte-identity `diff` above and `check-dod-table.mjs`.

## Sources

### Primary (HIGH confidence): files opened this session at the base
- `spec/behaviors/29-devtools-simulator.md` (full), `spec/traceability.md:47,69-72,291,453-465`, `spec/README.md:222-225,345-363`, `spec/invariants.md:1780-1800,2669-2695`, `spec/decisions/{053,081,105,123,140}-*.md`, `spec/scripts/verify-traceability.sh`, `scripts/spec-revise.mjs`, `scripts/check-doc-examples.mjs`, `scripts/check-house-style.mjs:2085-2140`
- `.planning/{MILESTONES,PROJECT,STATE,ROADMAP,REQUIREMENTS}.md`, `.planning/milestones/v1.2-MILESTONE-AUDIT.md`, `.planning/milestones/v1.2-phases/{24,25,26,27,28,29}-*/` review files, `24-.../deferred-items.md`
- `packages/core/src/{Evaluate,EvaluationServices,Lifecycle,SinkEmit,Walk,PortAccess,RelationshipResolver,DecisionCache,SharedComputation,PortMetrics,EvaluationMetrics,Policy,DecisionSink}.ts`, `packages/react/src/{GateWriter,GateRegistry}.ts`, `packages/http/src/{GuardRoute,GuardApi,AccessPlan,AuthorizeRequest,PermissionRegistryRoute}.ts`, `packages/devtools/src/model/{Source,Capture,DockModel}.ts`, `packages/devtools/test/{model/DockModel.test.ts,react/Simulator.test.tsx}`, `packages/http/test/v4-http-smoke.test.ts`, `packages/core/test/DecisionCache.test.ts`, `stryker.http.mjs`
- git history: `1434c524`, `965ff14c`, `dab09bc0`, `e6302d32`, `ce9d2a46`, `6c198da1`, `12a6631c`, `9f40fcbb`, `2086026d`, `585707b5`, `1b43a6fc`, `0e340791`, `b655b3be`

### Secondary / Tertiary
None. No web search or documentation lookup was needed: every fact is in-repo. The `research-plan` seam was not used for the same reason.

## Metadata

**Confidence breakdown:**
- Ledger dispositions: HIGH, each read at the base with file and line.
- BEH-QD-219..221 reconstruction: HIGH, built and structurally checked in the scratchpad.
- Replacement wording: MEDIUM, it is proposed prose; the facts in it are verified.
- Mechanism of the duplication (A1) and the Evaluate.ts "defensible" group: MEDIUM/LOW.

**Research date:** 2026-11-12
**Valid until:** the next commit to any file named above; re-run the Validation Architecture greps before planning if the base moves.
