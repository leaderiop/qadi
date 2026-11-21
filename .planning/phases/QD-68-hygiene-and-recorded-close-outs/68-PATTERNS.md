# Phase QD-68: Hygiene and recorded close-outs - Pattern Map

**Mapped:** 2026-11-21 (branch `arch-wave-12`, tree at `cbb871e4`)
**Scope:** only what `68-OPEN-ITEMS.md` does not already give: current file:line, analogs, reusable tooling, patch shapes.
**Tracked-source gate:** every path below was checked with `git ls-files` (all tracked; none is a gitignored mirror).

## File Classification

| Work | Role | Closest analog | Match |
| --- | --- | --- | --- |
| HYGN-01 re-wrap 3 lines | comment/format edit | the file's own hand-wrapped neighbours (see 1a) | exact |
| HYGN-02 `StoredEnvelope.test.ts`, `Source.test.ts` wording | test title/comment edit | `d0ca3df6` (Phase 61 IN-05, comments only), `22d6fcf7` (58 IN-02, title + comment) | exact |
| HYGN-02/OI-01/OI-08 compiler proof | proof script | `.planning/milestones/v1.5-phases/QD-51-policy-tag-arity-stated-once/tools/scan.mjs:127-160` | role (no title masking exists anywhere) |
| HYGN-03/04 ADR re-wrap + amendment | spec | `spec/decisions/047-...md:497` (amendment blockquote), ADR-173's own header | exact |
| OI-24 shared A/B harness | tooling | Phase 66/67 `bench/ab.sh` + `bench/analyze.mjs` | exact |
| OI-09/OI-11 timeline resize + RED tests | feed + test | `TimelineFeed.test.ts` TF25 (:512), `DiagnosticsFeed.test.ts` F30 (:601) | exact |
| OI-10 `admit` single read + RED | core hot path + test | `Admission.test.ts` E7-E10 (:148-:212) | exact |
| OI-15..22 | gate scripts | each file itself (sites in section 6) | exact |
| Mutation bases | evidence script | `67-mutation.mjs` (core), `64-mutation.mjs` (devtools config) | exact / role |

---

## 1. HYGN items: current locations

### 1a. The three over-width lines (HYGN-01)

All three are unchanged since the review; only their line numbers moved.

| File | 58-REVIEW IN-02 said | Now | Width | Content |
| --- | --- | --- | --- | --- |
| `packages/core/src/DecisionLog.ts` | :215 | **:220** | 108 | `      const entry: LogEntry = { cursor: { epoch, seq }, record: new StoredRecord({ environment, record }) };` |
| `packages/core/src/SinkCodec.ts` | :616 | **:621** | 137 | `    : Result.map(decodeSinkRecord(read.success.record), (record) => new StoredRecord({ environment: read.success.environment, record }));` |
| `features/features/decision-log/decision-log.steps.test.ts` | :197 | **:197** | 135 | `const slot = (stored: StoredRecord) => \`${stored.record._tag}\|...\`;` |

Verified by diffing `22d6fcf7^:packages/core/src/DecisionLog.ts` (215 there, 220 now: the same text). The review-time file also had over-width lines at 8, 20, 150, 250, 257; today's other over-100 lines in `DecisionLog.ts` are 8, 155, 255, 262. Per the roadmap, change only the named line.

Wrap shape to copy: the file's own hand-wrap at about 90 columns, already in `SinkCodec.ts:619-621`'s sibling lines, e.g. in the same function:
```ts
  Result.isFailure(read)
    ? notDecodable(decodeRefusalOf(read.failure))
    : Result.map(decodeSinkRecord(read.success.record), (record) => new StoredRecord({ ... }));
```
This is a code line, not a comment: use mutation base before editing and a `transpileModule` (comments kept off, whitespace-insensitive) equality to prove token-identical output.

### 1b. `StoredEnvelope.test.ts` (`packages/core/test/StoredEnvelope.test.ts`, 274 lines)

Header, lines 1-15 (to rewrite; the false claim is "none reads a field of the in-memory shape" at :8-9, while N1-N4 do; ":13 `(D-01)` and `(D-12)`" and ":14 committed RED on the base" are process history):
```
1  /**
2   * The stored record, read only through the wire and the log: its bytes, its
3   * stamping and its order.
5   * Written on the phase base and green there, and read the same way after
6   * ADR-QD-171, so the change cannot edit it: every row reaches a stored record
7   * through `makeDecisionLog`, `encodeStoredRecordString`, `decodeStoredRecordString`
8   * and `decodeDecisionStream`, whose signatures are the same on both sides, and none
9   * reads a field of the in-memory shape. The goldens compose the hand-written `V2_*`
10  * fixtures ... (STOR-02, D-05, D-07).
12  * The rows at the end, `(D-01)` and `(D-12)`, are the new shape's: committed RED on
13  * the base by assertion and green once the envelope is the stored record.
```
Plan-local id occurrences (16, 7 distinct: STOR-01/02/03, D-01/05/07/12; the roadmap's "10" does not match a grep, the planner must re-count):
- Header comment: :11 (STOR-02, D-05, D-07), :13 (D-01, D-12).
- `describe` titles (program text): :111 `(STOR-02, D-07)`, :140 `(STOR-03, D-07)`, :185 `(STOR-03, INV-QD-039, D-07)`, :228 `(STOR-01, RED on the base)`.
- `it.effect` titles (program text): :229 N1 `(D-01)`, :237 N2 `(D-01)`, :249 N3 `(D-01)`, :255 N4 `(D-12)`.
- Also "stamps" at :140 (`a log stamps what it ingests`) and "stamping" at :3: both mean the envelope.
- `RED on the base` appears only at :228 (PITFALLS.md:238 confirms).
- Titles carry ids `G1..G9`, `L1..L5`, `O1..O4`, `N1..N4`: these are test ids, keep them (they are not plan-local).
No `@ts-expect-error` in the file; no pinned-count budget applies.

### 1c. `Source.test.ts` (`packages/devtools/test/model/Source.test.ts`)

```
:185-189  /** A `DecisionLog` is a `Source` as it is — no adapter (ARCH-11 D-11-c). Its
           * stamping, prototype preservation and handoff are tested where they live, in
           * `@qadi/core`'s `DecisionLog.test.ts`; ... */            <- comment, "stamping" at :186
:291      it.effect("a bare frame — what a server older than 0.10 sends — is Malformed, never stamped", ...   <- title
:306      it.effect("a well-formed frame becomes a stamped record", ...                                      <- title
```
What ARCH-105 / CCR-QD-449 (ADR-QD-171) renamed it to: there is no stamp step now. A record is an **envelope**: `new StoredRecord({ environment, record })`, "the envelope's environment" (ADR-171:62 "environment, record })`, with no stamp step"). `Stamped`, `stampRecord`, `stampRecordMatch` were deleted (ADR-171:42-45). 58-REVIEW IN-02's own fix wording is the model: "Supplied by the sink as the envelope's environment, not by core" and "never given a label". Suggested: :291 `... is Malformed, never given a label`; :306 `a well-formed frame becomes a stored record`; :186 `Its environment label, prototype preservation and handoff`.
Keep their wording (per D8): `spec/behaviors/26-decision-stream.md:406` and `packages/core/test/SinkCodec.test.ts:2233`.
Other "stamp" still in a source comment of a file this phase edits: `DecisionLog.ts:122` ("stamping them all with the aggregator's label"); not named by HYGN-02, flag to the planner as an optional same-file comment fix (comment only, but `DecisionLog.ts` is under the mutation base anyway).
Precedent commits: `22d6fcf7` (title + comment, "Comment and title changes only"), `d0ca3df6` (comments only).

### 1d. ADR-QD-174 (`spec/decisions/174-a-decision-cache-is-asked-the-question.md`)

Lines 73, 75 and 94 are 189, 168 and 129 characters (the rest of the file wraps at about 116; line 13 is the 315-character Change History table row and stays):
```
73    is TS2322, and a class that `implements DecisionCacheShape` gets TS2416 at the method (all probed against `tsc`). A caller who passes a `compute`, or a function returning one, gets TS2559
75    and a third argument gets TS2554. The change is a `@qadi/core` minor changeset, and the upgrade guide's 0.13 section shows the delegation route in a compiled example.
94    - [BEH-QD-641 to BEH-QD-645](../behaviors/21-decision-cache.md#beh-qd-641-the-cache-is-asked-the-question-and-how-the-walk-runs),
```
Line 94 is a markdown link target; wrap before/after the link, never inside `(...)#anchor`. Re-wrap in one `node scripts/spec-revise.mjs spec/decisions/174-...md "<what>" --date 2026-11-21`. Revision header is at ADR line 8 area (Document Control table, Change History in the last row: the newest entry must equal Revision).

### 1e. ADR-QD-173 and port cards (D3)

`spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md` (114 lines) says **nothing** about port cards today: `grep -i card` is empty. The port-card history lives in ADR-QD-168 (`168-a-port-card-is-a-model-row.md`) and ADR-QD-047's amendment `spec/decisions/047-a-headless-devtools-model.md:497` ("Amended 2026-11-18 (CCR-QD-446): the port cards are the dock model's ninth store."). Copy the amendment-blockquote style from 047:497 and ADR-173's own header:
```
> | Revision       | 1.1                                            |
> | Status         | Accepted — amends ADR-QD-047, ADR-QD-099, ADR-QD-169; applies ADR-QD-137; amended 2026-11-20 (ADR-QD-177: every listener is called) |
> | Change History | 1.1 (2026-11-20): amendment — every listener is called (ARCH-111, ADR-QD-177, CCR-QD-455)<br>1.0 (2026-11-19): Initial release (ARCH-107, CCR-QD-451) |
```
Source of truth for the wording:
- `packages/devtools/src/model/DockModel.ts:254-263`:
```ts
  // The port cards are a function of the shown reading alone: no host code is read, so nothing here is guarded.
  const servicesKeyNow = (): ServicesInput => {
    const { status, reading } = shownReading.getSnapshot();
    return { wiring: reading.wiring, activity: reading.activity, portCalls: reading.portCalls, unsampled: isUnsampled(status) };
  };
```
- `packages/devtools/src/model/PortCards.ts:22-34`: `ServicesInput { wiring: WiringRead; activity: ReadonlyArray<PortActivity>; portCalls: PortCallLog | undefined; unsampled: boolean }` ("the wiring read and the activity, taken at one moment").
- Root exports (`packages/devtools/src/index.ts`): `WiringRead` is a **value** export (`:31-35`, from `./model/DiagnosticsStore.ts`), `PortCallLog` a **type** export (`:76-82`, from `./model/WhatIf.ts`), `PortActivity` a **type** export (`:148-154`, from `./model/Wiring.ts`). `isUnsampled` is **not** exported (only in `model/DiagnosticsFeed.ts:86`, imported by `DockModel.ts:46`). `portCards` / `PortCards.ts` are not in `index.ts` either (grep `PortCards` gives nothing). `makeDiagnosticsFeed`, `DiagnosticsStatus`, and the types `DiagnosticsFeed`, `DiagnosticsReadout`, `DiagnosticsSnapshot` are root exports (`:25-30`).
- Any code fence in the amendment must be ` ```typescript ` (compiled by `pnpm spec:examples`) with imports from `@qadi/devtools`; use ` ```ts ` only for non-compiled signature text.

### 1f. The two "confirmed, no edit" items

- `DecisionLog.ts` `ingest` doc, **lines 126-129** (unchanged; ADR-QD-171 named):
```
   * A defect on this path is not contained here. A record the log's own `layer`
   * receives comes through the sink emitter, which contains and reports a defect
   * once; a record handed to `ingest` comes from the host's receive handler, with
   * no emitter in front of it, so a defect reaches that handler (ADR-QD-171).
```
- `d0ca3df6` (`fix(61): the metric doc and the Simulator test talk about the walk (IN-05)`): touches `packages/devtools/test/react/Simulator.test.tsx` only for the test side, two hunks, both comment lines (`computes on a detached fiber` -> `walks on a detached fiber`; `forks \`compute\` onto a detached fiber (H2,` -> `forks its walk onto a detached fiber (H2,`). The metric-doc half is in core source: the proof file must also say the metric description string (registry key, ADR-QD-123) is unchanged. `git show d0ca3df6 --stat` lists both files.
- Phase 61 archive directory (tracked): `.planning/milestones/v1.6-phases/QD-61-decisioncache-is-asked-only-the-question/`. Existing files include `61-scan.mjs`, `61-VERIFICATION.md`, `61-REVIEW-FIX.md`. Add a new file there (e.g. `61-CONFIRMED-NO-OP.md` or similar); do not edit any existing one (stales its verification).

---

## 2. Compiler-comparison proof ("titles and comments only")

**No existing script masks title strings.** The only in-repo `ts.transpileModule` + `removeComments: true` code is `.planning/milestones/v1.5-phases/QD-51-policy-tag-arity-stated-once/tools/scan.mjs:127-160`; Phase 66's verification (66-VERIFICATION.md truth 5) did it ad hoc ("TypeScript 6.0.3 `transpileModule`, `removeComments`"). Research text: `.planning/research/PITFALLS.md:238` ("mask the title string arguments of `it`/`describe` first and compare ... run the file's tests before and after (same count, same results)"). `61-scan.mjs` does not use `transpileModule` (grep finds none), so do not copy it.

Copy this core (the root `typescript` is the 7.x Go port with **no JS API**, so the script must locate an older install under `node_modules/.pnpm`; 5.9.3 and 6.0.3 exist):
```js
const req = createRequire(process.cwd() + "/");
const ts = [
  "typescript",
  ...fs.readdirSync("node_modules/.pnpm")
    .filter((d) => /^typescript@\d/.test(d))
    .sort((x, y) => y.localeCompare(x, undefined, { numeric: true }))
    .map((d) => `./node_modules/.pnpm/${d}/node_modules/typescript`),
]
  .map((id) => { try { return req(id); } catch { return undefined; } })
  .find((m) => typeof m?.transpileModule === "function");
const js = (src) =>
  ts.transpileModule(src, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
                       removeComments: true, verbatimModuleSyntax: true },
  }).outputText;
```
Interface: a function `js(baseText) === js(headText)`; base text from `git show <base>:<path>`. Add (not in the repo yet):
- For test files, a title mask before `js(...)`: parse with `ts.createSourceFile`, visit `CallExpression`s whose callee is `it`, `it.effect`, `describe`, `it.live`, `it.layer` (a `PropertyAccessExpression` on `it`) and replace the first argument's string literal / template / binary-concatenation text with `""` (by position, from end to start), then transpile. Also count them: number of title call sites equal before and after, and run the test file on both trees for equal pass counts.
- For source files (HYGN-01 re-wrap, OI-02/03/04): no mask needed; plain equality of `js(base)` and `js(head)` proves a whitespace/comment-only edit.
- Keep the script and its output outside tracked source, or in the phase directory; the Phase 61 no-op proof goes in the Phase 61 archive dir as a new file.

---

## 3. Shared A/B harness (OI-24)

### 3a. The three copies (all tracked)
- Phase 59: `.planning/milestones/v1.6-phases/QD-59-admission-produces-the-one-walk-environment/bench/{ab.sh,analyze.mjs}` (103 / 166 lines). Phase 65 reused it **byte for byte** (65-BENCH.md:14).
- Phase 66: `.planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/{ab.sh,analyze.mjs}` (108 / 187).
- Phase 67: `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/{ab.sh,analyze.mjs}` (108 / 186).

`diff` results:
- **`ab.sh` 66 vs 67: identical.** 59 -> 66 diff: (a) 59 hardcodes `packages/core/bench/Evaluate.bench.ts`, 66/67 take `<bench-file> <test-name-pattern>` (7 args, not 5) and pass `-t "$PATTERN" "$BENCH"`; (b) 66/67 refuse an untracked or dirty bench file (`git ls-files --error-unmatch`, `git status --porcelain -- "$BENCH"`); (c) 66/67 log `ps -Ao pcpu,comm -r | head -5` beside `uptime` before and after each run; (d) `meta.txt` gains `bench_file` and `pattern`.
- **`analyze.mjs` 59 vs 66:** 59 band = `max(0.10, referenceSpread)`, gate = `slower === 0`; 66/67 band = fixed `MAX_SLOWDOWN = 0.05`, spread recorded but never widens it, gate = `slower === 0 && geomean <= MAX_GEOMEAN_PCT (2)`; 66/67 also refuse a run file holding more than one bench file (`:46`) and refuse any workload not in `REQUIRED` (`:68`). 59's `REQUIRED` holds two Evaluate keys; 66's six decode keys; 67's five `DecisionCache.getOrCompute` keys. **66 vs 67 differ only in the header comment and `REQUIRED`.** Self-tests: 59 has four cases, 66/67 seven (fixed 5% band, geomean fail at 2.5%, geomean pass at 1.9%).
- **The arm order is a fixed loop in both `ab.sh` 66/67 at line 85:** `for arm in "$HEAD_LABEL" "$PATCHED_LABEL"`; 59 has the same loop. This is OI-24's defect; the patched arm is `git apply "$PATCH"` before its run and `git apply -R` in `cleanup`.

### 3b. What a parameterised harness needs

| Parameter | Today | Becomes |
| --- | --- | --- |
| patch, outdir, rounds, labels | positional args 1-5 (kept) | unchanged |
| bench file, test-name pattern | positional args 6-7 (66/67) | unchanged (add them to `meta.txt`, already there) |
| source dir the patch touches | hardcoded `SRC=packages/core/src` (`ab.sh:~24`, used by `src_clean` and the exits-5 checks) | a flag/env, default `packages/core/src` (OI-10 patches `Admission.ts` in core) |
| arm order | head first every round | alternate by round parity: `for i`: odd -> head, patched; even -> patched, head (the `applied`/`cleanup` logic already handles either order; only the loop line changes) |
| workload keys | `REQUIRED` array in `analyze.mjs` | an external list (a JSON file or `--workloads <file>`), plus a count check; for OI-10 the 35 keys of 3d |
| band / geomean | constants `MAX_SLOWDOWN = 0.05`, `MAX_GEOMEAN_PCT = 2` | flags, defaulting to the OI-10 gate (5% / +2%); recorded in the TSV header (`# max_slowdown_pct`, already written by 66/67) |
| statistic | median of per-run minima (`latency.min`, ns) | unchanged |
| self-test | `node analyze.mjs --self-test` | keep; add a case that fails on the wrong arm count and one for alternate order |

CLI to keep: `node analyze.mjs <outdir> <reference-label> <candidate-label>` exits 0 whenever analysis completed (whatever the gate), 2 on incomplete input (`Refused`); writes `<outdir>/analysis.tsv`. `compare(ref, cand)` is exported and pure; `readRun(file)` maps `j.testResults[0].assertionResults[].benchmarks[].tasks[]` to `"${b.name} :: ${t.name}"`.

### 3c. Where it can live; how `package.json` references `scripts/`
`scripts/` today is merge-gate and release tooling only: `check-*.mjs`, `run-check.mjs`, `run-tstyche.mjs`, `spec-revise.mjs`, `next-id.mjs`, `worktree-setup.mjs`, and `scripts/lib/{extract-code-fences,raw-decision-read,type-tests}.mjs`. **Nothing under `scripts/` is bench tooling.** Root `package.json` has only `"bench": "vitest bench --run"` (`:27`) and references scripts as `node scripts/<name>.mjs` (`spec:revise` `:37`, `test:tstyche` `:25`, `lint:style` `:33`, `check:pr` `:42`). A new `scripts/bench/ab.sh` + `scripts/bench/analyze.mjs` is not in `pnpm check`, so the DoD table (`scripts/check-dod-table.mjs`) is unaffected unless wired in; if wired in, AGENTS.md section 15 applies (edit `check` and the DoD table together). `oxlint` runs on `scripts/` (62's `no-control-regex` warning was in `run-tstyche.mjs`), so the new `.mjs` must be lint-clean.

### 3d. Phase 65's 35 workloads
All in **`packages/core/bench/Evaluate.bench.ts`** (524 lines), measured with the 59 harness against `to-base.patch` (Admission.ts only), 3 + 3, labels `final` (committed) and `base`; `bench/final/` holds the run, `meta.txt` shows `head: 6843e25e`, `rounds: 3`. Keys are `"<group> :: <task>"`:
- `evaluate :: ` one node; rules DenyOverrides — 8 permits; anyOf Union — 8; rules FirstApplicable — 8, last applies; anyOf First — 8, last allows; wide — allOf of 8; wrapper-heavy — 10 nested labeled/not/obliged; field-heavy — anyOf of 8 under Union; rules PermitOverrides — 8 denies; leaf-heavy — allOf of 8, matchers reference action and resource; leaf-heavy — ... reference neither; deep rules — 10 nested; deep — 10 levels; matcher-heavy — 3 refs; resolver miss — one port call; obligation-heavy — allOf of 8 distinct obligations; field-heavy — allOf of 8 under Intersection (17)
- `filter — 500 items :: hasPermission`; `decideSubjects — 500 subjects :: hasPermission` (2)
- `evaluate — depth scaling :: depth 5|10|20|40` (4); `evaluate — width scaling :: width 4|8|16|32` (4)
- concurrency pairs `:: sequential (default)` / `:: concurrency: unbounded` for: `evaluate — wide`, `evaluate — anyOf Union 8`, `evaluate — rules DenyOverrides 8`, `filter — 500 items` (8)
Total 35. Exact strings: the first column of `.planning/phases/QD-65-only-admit-builds-an-admitted/65-BENCH.md:29-66` (or `bench/final/analysis.tsv`); do not retype them, generate the workload file from `analysis.tsv`. Pattern for `-t`: the run used the whole file (59's harness had no `-t`), so for the 6-arg harness pass a pattern matching every group (`evaluate|filter|decideSubjects`) and assert 35 keys. OI-10's patch is the reverse of the OI-10 source commit on `Admission.ts` (same shape as 65's `to-base.patch`: the committed source reversed to the phase base).

---

## 4. OI-09 / OI-11 (timeline resize, RED tests)

### 4a. `TimelineFeed.ts` (`packages/devtools/src/model/TimelineFeed.ts`) 150-200 as it is
```ts
  // A restart on a closed feed would publish a state nothing follows.
  const restart = () => { if (!reads.closed()) readSource(inputs.source); };

  return {
    timeline,
    status: { subscribe: status.subscribe, getSnapshot: status.getSnapshot, restart },
    configure: (next) => {
      // A command on a closed feed would publish a state nothing follows.
      if (reads.closed()) return;
      const before = inputs;
      inputs = next;
      const resized = next.capacity !== before.capacity;
      if (resized) {
        // The old store is dropped, not unsubscribed from: nothing can reach it again.
        inner = bounded(next.capacity);
        inner.subscribe(push);
        push();                                   // <- :178, publishes the emptied timeline; a throwing listener leaves here
      }
      if (resized || next.source !== before.source) readSource(next.source);   // <- :180
    },
  };
```
Helpers just above: `const push = () => view.publish(inner.getSnapshot());` (`:129`), `readSource` (`:145-160`: `reads.begin()` -> `status.set(READING)` -> `reads.fork(token, runSource(marking, source ?? NO_SOURCE), { onFailure })`), `bounded(...)`, `makeSupersedingRun()`. `inputs = next` is assigned **before** `push()`, which is why a repeated `configure` with the same inputs reads nothing (`resized` false, source equal).
Smallest patch shape: move the `readSource` call into the resized branch before `push()`, keeping the non-resized source-change path:
```ts
if (resized) { inner = bounded(next.capacity); inner.subscribe(push); }
if (resized || next.source !== before.source) readSource(next.source);
if (resized) push();
```
Check each candidate against the existing tests `TF4` (:130, resize keeps timeline object, empties it, reads again), `TF14` (:299), and the dock's `*.characterisation.test.tsx` (empty diff, LSTN-04). Note `readSource` publishes `status.set(READING)` and `reads.fork` may deliver records synchronously (a sync backlog goes through `timeline.accept` -> `inner.accept` -> `push`), so moving `push()` after the read changes what the first publish shows: the alternative `try { push() } finally { readSource(...) }` / rethrow keeps the order. Decide with the RED tests.

Doc comments to rewrite in the same change: `:58-64` (status `subscribe`) and `:81-84` (`configure`, 118/114/114 columns, `:82-83` are the long ones).

### 4b. TF25 pattern (`packages/devtools/test/model/TimelineFeed.test.ts:512-531`)
```ts
  it.effect("TF25 a timeline listener that throws does not silence the next one, and accept rethrows what it threw", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed();
      yield* settleTurns;
      const boom = new Error("boom");
      const seen: Array<ReadonlyArray<string>> = [];
      feed.timeline.subscribe(() => { throw boom; });
      feed.timeline.subscribe(() => { seen.push(idsOf(feed)); });
      const outcome = thrownBy(() => feed.timeline.accept(record("x", 100)));
      assert.deepStrictEqual(seen, [["x"]]);
      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
    }));
```
Helpers (same file / `../helpers.ts`): `flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"))` (:25); `settleTurns` (`helpers.ts:174`, 20 yields); `thrownBy(run)` (`helpers.ts:179`, returns `{ threw, thrown }` so falsy throws count); `idsOf(feed)`; `record(id, at)`; `watched(backlog, live)` (:40, `tally { started, finalized }`); `counting(backlog, live)` (:58, `tally.reads`); `delayed`, `flaky`. The only existing capacity-changing drive is TF4 (:130-146): `feed.configure({ source: a.source, capacity: 2 }); yield* flush;` with `watched([], Stream.never)` and `assert.deepStrictEqual(a.tally, { started: 2, finalized: 1 })`. The RED for resize: subscribe a throwing listener, `thrownBy(() => feed.configure({ source: counting(...).source, capacity: 2 }))`, `yield* flush`, assert the rethrow by identity (`outcome.thrown === boom`), and that the new source **was** read (`tally.reads === 1`, entries present) and status `Reading`; on the unchanged tree this fails (the read is skipped), which is the RED. Per OI-11 also add the described windows: restart from `Stopped` with a throwing listener -> `Reading` with nothing reading (today true, pins the doc); and the resize case.

### 4c. `DiagnosticsFeed.test.ts` F30 (`packages/devtools/test/model/DiagnosticsFeed.test.ts:601-621`)
Same shape with `makeDiagnosticsFeed({})`, `feed.subscribe(...)`, `thrownBy(() => feed.configure(undefined))`, `assert.deepStrictEqual(seen, ["Off"])`, rethrow by identity, `feed.getSnapshot().status._tag === "Off"`. Its harness helper `step("4 seconds")` (used at :590-ish) drives `TestClock` for polls. For OI-11's "stays `Starting` with no new poll", subscribe a throwing listener, `configure(options)` and then `step("4 seconds")` and assert no new sample (collector `state.calls` pattern seen at `:590-596`: `a.state.calls`, `b.state.calls`).

### 4d. OI-03's texts (current file:line; all describe the escape, all rewritten by OI-09 and recorded via CCR-QD-459)
- `packages/devtools/src/model/TimelineFeed.ts:58-64` (status `subscribe` doc: "a source handed in by that call is not read, and `restart` is what reads it") and `:81-84` (`configure` doc).
- `packages/devtools/README.md:165-174` (the paragraph ends `makes ends the call before any read: the previous read goes on, a new \`source\` in the same call is not read, and configuring the same inputs again does not read it either; \`status.restart\` does.` at :171-174).
- `spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md:43` (decision 5, "leaves earlier still, before `begin()`: no read is started ...").
- `spec/behaviors/28-devtools-screens.md:2638-2641` (BEH-QD-656's trailing paragraph: "a throw on a gates feed ... before `begin()`: no read is started, a source handed in by that call is not read, the previous read goes on, and the same inputs configured again do not read it, because the feed already holds them; only `restart` does").
- `spec/README.md:392` (CCR-QD-455 row; history, not rewritten: the correction goes through a new CCR-QD-459 statement).

---

## 5. OI-10 (`Admission.ts`) and the getter-counting tests

`packages/core/src/Admission.ts:111-135` today (the `Admitted.admit` method; the class starts at `:88`, constructor `:96-103`, doc at `:105-110` cites INV-QD-376):
```ts
  static admit<Source extends RowSource>(question: Question, rowSource: Source): Result.Result<Admitted<Source>, PolicyTooDeep> {
    if (policyDepth(question.policy) > question.maxDepth) {
      return Result.fail(new PolicyTooDeep({ maxDepth: question.maxDepth }));
    }
    const context: MatcherContext = {
      subject: question.subject.attributes,
      subjectId: question.subject.id,
      resource: question.resource,
      action: question.action,
    };
    return Result.succeed(
      new Admitted(rowSource, question.policy, question.subject, SUPPLIED[rowSource](context), context, question.maxDepth),
    );
  }
```
Reads today: `policy` x2, `maxDepth` x3, `subject` x3, `resource` x1, `action` x1. Patch shape: `const { policy, maxDepth, subject } = question;` as the first statement (resource and action stay single reads inside the context literal), then use the locals in the three places. Keep the exports, `Admitted.admit` naming, detached `export const admit = Admitted.admit;` and the file's doc (module doc lines 1-30 says "each interpreter states only its row source"; the method doc `:105-110` and the class doc need "each field is read once"). No `as`, no `any`.

Existing tests to extend, `packages/core/test/Admission.test.ts:141-212`, `describe("admit reads what the question carries once")`. Local helpers at the top of that block:
```ts
  const resource = { id: "doc-1" };
  const admitted = (question: Question, source: "asked" | "row") => {
    const result = admit(question, source);
    assert.isTrue(Result.isSuccess(result));
    return Result.isSuccess(result) ? result.success : undefined;
  };
```
E8 (:169) is the shape to copy for a getter that answers differently on read two (added lines only; do not touch E1-E10):
```ts
  it("E8 asked: an action that reads differently on a second read is read once, and the flag agrees with the context", () => {
    let reads = 0;
    const question: Question = {
      ...questionOf(subject, P.hasRole("editor")),
      get action() { reads += 1; return reads === 1 ? "publish" : undefined; },
    };
    const environment = admitted(question, "asked");
    assert.strictEqual(environment?.supplied.action, true);
    assert.strictEqual(environment?.matcherContext.action, "publish");
    assert.strictEqual(reads, 1);
  });
```
E7 (:148) is the loop variant over `[[resource, undefined], [undefined, resource]]` with a `flipping` factory returning `{ question, reads: () => reads }`. E9 (:184) is the `"row"` twin; E10 (:199) the always-undefined variant. New RED cases (suggested ids E11..): a `policy` getter answering shallow then deep (assert `Result.isSuccess` and `environment.policy` is the first read, `reads === 1`, and that it pins the depth gate against the tree it carries); `maxDepth` getter (one read; PolicyTooDeep carries the same value the gate used); `subject` getter (one read, `subject.attributes` and `subject.id` of the same object as `environment.subject`). On the unchanged tree each gives `reads` 2 or 3: that is the RED.
File header imports already present: `admit`, `P` (Policy), `M` (Matcher), `questionOf`, `Question`, `Resource`, `subjectWith` from `./helpers.ts`. Policy depth helper in the test: `nested(levels)`.

---

## 6. Tooling (OI-15 to OI-22): exact site and smallest patch

**OI-15** `scripts/run-tstyche.mjs`. Argument handling: none; `process.argv` is never read. `tstyche(args)` (`:51-57`) spawns `[TSTYCHE, ...args]`; `--listFiles` is called unfiltered at `:59` and must stay so (the file-set equality check at `:75-91`). The two passes are at `:140-148`:
```js
const first = pass(`pass 1 of 2, ...`, "./tsconfig.tstyche.json", ["--skip", RULE_ON_ONLY]);
const second = pass(`pass 2 of 2, ...`, "./tsconfig.test.json", ["--tsconfig", "tsconfig.test.json", "--skip", RULE_OFF_ONLY]);
```
Patch: `const filters = process.argv.slice(2);` after the imports; append `...filters` to both argument arrays (tstyche takes selectors positionally, after flags). Caveat: a filter that excludes `FloatingEffectPins.tst.ts` runs a pass with none of its blocks: fine, the skip texts are still verified over the unfiltered `selected` list (`:92-101`). The `pass` check "compiled with another tsconfig" still applies.

**OI-16** `scripts/check-house-style.mjs`: `:2294` `Object.hasOwn(JSON.parse(readFileSync(join(ROOT, "tstyche.json"), "utf8")), "testFileMatch")` -> use `readJsonc("tstyche.json")` (defined `:794`, already used at `:2499` for the drift check). `:2347-2352` the table-row loop ends `listed.set(m[1], { callable: Number(m[2]), constructable: Number(m[3]) });`: insert before it
```js
      if (listed.has(m[1])) { failures += 1; console.error(`AGENTS.md:${i + 1}  [not-callable-pin-table] ${m[1]} is listed twice.`); continue; }
```
(same message shape as the sibling `[not-callable-pin-table]` error at `:2349`). Prove both directions: a planted duplicate row must go red; a planted `//` comment in a scratch `tstyche.json` must no longer crash.

**OI-17** `CHARACTERISATION` is declared at `scripts/run-tstyche.mjs:41` and `scripts/check-house-style.mjs:2381` (block-scoped inside a `{ ... }`, used at `:2414-2417`), plus the budget key in `NOT_CALLABLE_PIN_BUDGET` and the AGENTS.md table row. Patch: `export const CHARACTERISATION = "packages/core/test/FloatingEffectPins.tst.ts";` in `scripts/lib/type-tests.mjs` (the one file both scripts already import: `run-tstyche.mjs:20` imports `walkTypeTests` from it; `check-house-style.mjs` imports it for `[not-callable-pin]`), and import it in both. No budget count moves.

**OI-18** `scripts/spec-revise.mjs:68-71`:
```js
const dateFlag = args.indexOf("--date");
const date = dateFlag === -1 ? new Date().toISOString().slice(0, 10) : args[dateFlag + 1];
const positional = args.filter((arg, index) => !arg.startsWith("--") && index !== dateFlag + 1);
```
With no `--date`, `dateFlag + 1 === 0`, so `index !== 0` drops the first argument. Patch (smallest): `index !== dateFlag + 1 || dateFlag === -1`, equivalently `!(dateFlag !== -1 && index === dateFlag + 1)`. Keep `--check` (`:57-65`, runs before this) byte-identical. Test before relying on it: `node scripts/spec-revise.mjs spec/decisions/174-....md "x"` (without `--date`) must reach the revision step, not print usage, in a scratch copy (it writes the file: run on a copy or `git checkout` after).

**OI-19/20/21** `scripts/check-package-install.mjs` (all inside gate 14; guard code runs only when `consumerReady`):
- `:851-861` `holdsDirective`: `comment.startsWith("// @ts-expect-error") && comment.includes(member)` scanning leading comments of every descendant of the declaration (lexical). `:874` `if (isCallExpression(node) && isIdentifier(node.expression)) called.add(...)`. `:875-877` type references outside a refusal add to `typed`. The `shortcut:` comment is at `:871-873`. Optional patch: in `visit`, when entering a `PropertyAssignment` whose `name.text === member`, check only that node's leading comments. Re-run the 63 removal matrix (`63-RED-EVIDENCE.md`, r1..r5) against scratch copies.
- OI-20: `:840-843` `await import("typescript/unstable/sync")`, `.../ast/is`, `.../ast/scanner`, wrapped by `try {...} catch (error) { fail(\`the probe guard could not load or run the TypeScript parser: ${error.message}\`); }` at `:909-911`. `pnpm-workspace.yaml:32` `typescript: ^7.0.0` (installed 7.0.2). Smallest patch: extend that catch message with the coupling ("`typescript/unstable/*` is not a stable API; `pnpm-workspace.yaml` ranges typescript at `^7.0.0`, so a 7.x minor can move it"). The stronger fix is the catalog pin: not allowed in a hygiene phase (lockfile). If "a range bump cannot silently break" is required, add a guard that reads `typescript/package.json` `version` and names it in the failure.
- OI-21: `execFileSync` without `timeout` at `:177` (`pnpm build`), `:195` (`pnpm pack`), `:211` (`tar`), `:328` (`node probe.mjs`), `:414`, `:797` (`npx tsc`), `:809` (`node out/consumer.js`), `:824` (feeds probe). Patch: add `timeout: <ms>` to each options object (the same constant). Fixture string (a template literal in the script): the loop `while (feed.getSnapshot().status._tag !== "Live" && turns < 200)` at `:621`, the `expect(...)` at `:631` whose label embeds `String(diagnosed.turns)`: hoist `200` to a const inside the fixture, make the label a constant (`"diagnostics feed reached Live"`) and put the count in the returned object printed separately; break on `_tag === "Stopped"` and return the `Stopped` reason. Over-width lines in this file (>100): :74, 131, 372, 394, 396, 405, 556-558, 564, 571-574, 613, 626, 631, 680, 688, 692, 708, 737, 752, 792, 803, 826, 829, 874, 906, 920, 926, 932; the review's "comment line 851 is 99 columns" is not over 100 today, leave it.

**OI-22** `.planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs:10`:
```js
const ts = createRequire(import.meta.url)(resolve("node_modules/.pnpm/typescript@6.0.3/node_modules/typescript"));
```
Patch: `const ts = createRequire(resolve("node_modules/tstyche/package.json"))("typescript");` (tstyche resolves the TypeScript it uses; root `typescript` is the 7.x Go port with no `getParsedCommandLineOfConfigFile`, so verify the resolved module has `createProgram`, else fail with a message) and at the end print `console.log(\`${count} diagnostic(s)\`)` (count in the existing loop at `:19-22`). Re-run it and compare against the codes recorded in `65-VERIFICATION.md`/OI-06 (TS2673, TS2741) to satisfy "committed records still pass under the fixed script".

---

## 7. Mutation base tooling

### 7a. `67-mutation.mjs` interface (`.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs`, 249 lines)
Hardcoded constants (`:15-27`): `D` (record dir), `CONFIG = "stryker.config.mjs"`, `REPORT = "reports/mutation/mutation.json"`, `C = "packages/core/src/"`, `FILES` (the three single-flight files), `CHANGED` (files whose code changes; get the `ignoreStatic:false` evidence run), `FLOORS` (`{file: [detected, valid]}` from the previous phase), `INVOCATION = pnpm exec stryker run ${CONFIG} --mutate ${FILES.join(",")}`, `EVIDENCE_INVOCATION = pnpm exec stryker run <S>/stryker67-static.config.mjs --mutate ${CHANGED}` (`<S>` is a scratch dir outside the repo; the static config is not tracked).
CLI (`:244-249`): `record base|close`, `evidence <ignoreStatic:false report>`, `compare`, `--self-test`.
- `record <name>`: `refuseDirty()` (`git status --porcelain -- ...FILES`), imports `stryker.config.mjs` and fails unless `jsonReporter.fileName === REPORT` and `ignoreStatic === true`, `tally(REPORT, FILES)` (the report must hold **exactly** `FILES`, and each report's embedded `source` must equal the file on disk), writes `${D}67-mutation-<name>.json` = `{ phase, head, invocation, files }` with per-file `killed/timeout/survived/noCoverage/ignored/detected/valid/open[]/ignoredMutants[]`.
- `evidence <report>`: `refuseDirty()`, refuses the gate run's own report path, `tally(report, CHANGED)` and fails if any file has `ignored !== 0`; writes `...-static.json`.
- `compare`: loads base/close/static JSON, checks `invocation` strings and `proof.head === close.head`, diffs each file `git diff -U0 base.head close.head -- file`, runs `judge({base, close, proof, diffs})`. `judge` is pure and exported: fails when a score fell (integer cross-multiplication), when under its floor, when any open mutant remains at close, on any new open mutant (multiset `bag`/`beyond` keyed by `status|mutator|replacement|mappedLine|column`, lines mapped through `mapLine(diff)`), on a new Ignored mutant the evidence run did not Kill, and on an open evidence mutant on a line the phase wrote (`writtenLines`).
- `--self-test` (`:200-241`): 10 planted cases through `judge` plus the `dirtyReasons` check. OI-25 gap: `refuseDirty()` call sites (`:38-41`, `:166`, `:179`) are not driven; the fix is to take the `git status` reader as an argument (`refuseDirty(read = () => git(...))`) and plant a stub in the self-test for `record` and `evidence`. Fix it **in the 68 copy** (copy, never edit 66's; per CONTEXT, 67's own script may be edited only if its committed records still pass `compare`/`--self-test`).

### 7b. Parameterising for the 68 files
The six files sit under **two** Stryker configs, so one `tally(REPORT, FILES)` is not enough:

| Files | Stryker config | Report | Mutate scope of the config |
| --- | --- | --- | --- |
| `packages/core/src/SinkCodec.ts`, `DecisionLog.ts`, `UntrustedDecode.ts`, `Admission.ts` | `stryker.config.mjs` | `reports/mutation/mutation.json` | `packages/core/src/**/*.ts` (minus `index.ts`), `ignoreStatic: true`, vitest `packages/core` |
| `packages/devtools/src/model/TimelineFeed.ts`, `DiagnosticsFeed.ts` | `stryker.devtools.mjs` | `reports/mutation-devtools/mutation.json` | `packages/devtools/src/model/**/*.ts`, `ignoreStatic: true`, vitest `packages/devtools` |

Run shape (both): `pnpm exec stryker run <config> --mutate <comma list>` narrows the config's `mutate`; the `--mutate` list is the file set the report must hold. Root `package.json:28` `mutation` runs all seven configs (`stryker.{config,devtools,predicate-sql,predicate-prisma,audit,http,react}`), only at release PRs (`check:pr` skips it). Stryker never runs beside vitest or another stryker (`ab.sh` refuses on `pgrep -f "[s]tryker run"`).
Phase 64 already did this for the devtools pair: `.planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-mutation.mjs` uses `CONFIG = "stryker.devtools.mjs"`, `REPORT = "reports/mutation-devtools/mutation.json"`, `FILES = [ExternalStore, TimelineFeed, DiagnosticsFeed, GatesFeed]`, but it is the old text-keyed scorer (OI-23's defect). Its base/close: `64-mutation-base.json` head `8f3cb792`, TimelineFeed 49/49, DiagnosticsFeed 72/73; close `a28df72f` the same (use these as floors if they still hold on the post-67 tree; take a fresh base first, the Phase 67 harness keys on **line numbers**, not text, so `git diff -U0 <base> <close>` must be of the same tree the base was taken on). 66's `UntrustedDecode.ts` was 41/43 at its base (two survivors at `:240`-ish).
Parameterisation recipe (new `68-mutation.mjs` in the phase dir, copy of 67's):
1. Replace the single `FILES`/`CONFIG`/`REPORT` with a table `GROUPS = [{ name: "core", config: "stryker.config.mjs", report: "reports/mutation/mutation.json", files: [...] }, { name: "devtools", config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json", files: [...] }]`; `record <group> base|close` and `evidence <group> <report>` write `68-mutation-<group>-<name>.json`; `compare` loops groups and unions the `bad` list. `INVOCATION` is derived per group.
2. `CHANGED` per group: the files whose **code** changes (`TimelineFeed.ts` for OI-09, `Admission.ts` for OI-10, `SinkCodec.ts`/`DecisionLog.ts` for HYGN-01's re-wrap, which are token-identical so `evidence` may be waived for them: record that decision). Comment-only files (`DiagnosticsFeed.ts`, `UntrustedDecode.ts`) get a base and a close score check only.
3. `FLOORS` from the fresh post-67 base of each group (never from an earlier phase's numbers; the harness fails on drop below base anyway).
4. Static evidence config stays in scratch outside the repo (`stryker68-static.config.mjs` copy of the group's config with `ignoreStatic:false` and an out-of-repo `jsonReporter.fileName`), as 66/67 did; hash it into the summary.
5. Refuse a dirty tree for each group's files, with the OI-25 fix and its self-test cases.
6. A comment-only file whose base is taken before edit proves "no change" cheaper by the token-identical `transpileModule` equality of section 2 (still take the base, per the owner's order).

---

## Shared patterns

- **Gate-script edits**: every change shown failing on a planted defect and passing on the tree before use (`CONTEXT` tooling rule). Existing precedent for planted-defect proof: `63-RED-EVIDENCE.md` (r1..r5) for gate 14, `analyze.mjs --self-test` and `67-mutation.mjs --self-test` for scorers.
- **Spec edits**: `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-21` for every document (Revision must equal the newest Change History entry; `--check` is a gate through `pnpm spec:verify`). Reserved ids only (`ARCH-115`, `ADR-QD-173` amend, `ADR-QD-174` re-wrap, `ADR-QD-181` Unused, `CCR-QD-459`, `BEH-QD-676..680`, `INV-QD-381..382`); never run `scripts/next-id.mjs`.
- **Doc-comment shape** (AGENTS.md): one-line summary first, rationale after.
- **Titles are program text**: any `it`/`describe` retitle is proven by the masked-title comparison, with equal test counts before and after.
- **Git pathspecs** need `:(glob)packages/*/src/**`; zsh needs `bash -c` for multi-argument commands; `.log` is gitignored.

## No Analog Found

| File | Role | Reason |
| --- | --- | --- |
| title-masking comparison script | proof tool | No script masks `it`/`describe` titles; only the unmasked `transpileModule` form exists (`51 scan.mjs`). Write it with the TypeScript factory/visitor API on the older TypeScript install (section 2). |
| `scripts/bench/*` | tooling | Nothing under `scripts/` is bench tooling; promote 67's `ab.sh`/`analyze.mjs` (section 3). |

## Metadata

**Analog search scope:** `scripts/`, `.planning/phases/QD-6{4,5,6,7}*`, `.planning/milestones/v1.{5,6}-phases/QD-{51,58,59,61}*`, `packages/{core,devtools}/{src,test,bench}`, `spec/decisions`, root Stryker configs.
**Pattern extraction date:** 2026-11-21
