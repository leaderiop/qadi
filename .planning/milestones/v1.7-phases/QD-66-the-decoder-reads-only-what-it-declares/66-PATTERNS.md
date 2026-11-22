# Phase 66: The decoder reads only what it declares - Pattern Map

**Mapped:** 2026-11-20
**Files analyzed:** code 2, text/records ~12, tests 3 new blocks, bench/mutation/changeset 5
**Analogs found:** all but a hydration-key test, which already exists (reuse). Nothing compiled or run.

All paths below are git-tracked (the .planning bench/mutation analogs are tracked phase dirs; not verified with `git ls-files` except `StoredEnvelope.test.ts` and `UntrustedDecode.bench.ts`).

## 1. The code (one commit)

### `packages/core/src/UntrustedDecode.ts` (project, lines 164-187)

Current (166-174) is the defect: `Object.entries(input)` at 171 invokes every own enumerable getter before `keysOf` filters at 172-173.

```ts
164 type Projection = (input: unknown) => unknown;
166 /** A plain object reduced to the own keys `keysOf` names for it; anything else passes through. It reads no value, so it cannot recurse. */
167 const project =
168   (keysOf: (entries: ReadonlyArray<readonly [string, unknown]>) => ReadonlySet<PropertyKey>): Projection =>
169   (input) => {
170     if (!isPlainObject(input)) return input;
171     const entries = Object.entries(input);
172     const keys = keysOf(entries);
173     return Object.fromEntries(entries.filter(([key]) => keys.has(key)));
174   };
176 const keepEverything = (input: unknown): unknown => input;
184 const PROJECTION: Readonly<Record<UnknownKeyPolicy, (ast: SchemaAST.AST) => Projection>> = {
185   refuse: () => keepEverything,
186   ignore: (ast) => project(envelopeKeysOf(ast)),
187 };
```

Pattern to follow: `keysOf` becomes `(input: Record<string, unknown>) => ReadonlySet<PropertyKey>` (isPlainObject at `JsonShape.ts:11` narrows to `Record<string, unknown>`, so no cast is needed). Body: `Object.keys(input).filter((k) => keys.has(k))` then `Object.fromEntries(kept.map((k) => [k, input[k]]))`. Keep `Object.fromEntries` (not `out[k] = v`): an own `__proto__` key must stay an own data property, pinned by `UntrustedSeams.test.ts` R14 (~391).

Points the plan must state:
- Read-once: `_tag` is a declared key, so it is read once in `keysOf` and again in the kept loop (two reads of `_tag` unless the loop reuses the value). The CONTEXT says "measure, then pin"; state only what the measurement shows.
- `walked()` (223-226) still does `Object.entries(input)` when `unwalked` is non-empty, and `exceedsJsonDepth` (`DecodeDepthGuard.ts:29-30`: `Object.keys` then `frame.value[key]`) reads every own getter at every level. Under `ignore` they see the projected fresh object, so only top-level declared values and deeper nested values are read; under `refuse` the raw input.
- Edit the stale texts in this file in the same commit: doc at 166; the policy docs at 132-135 ("dropped before the guard and the decode ever read it") and 141-149 ("`ignore` keeps ... only the top-level keys"); module header 4-5 ("the stated unknown-key projection").
- Untrusted-decode budget tokens (`onExcessProperty`, `exceedsJsonDepth`, `Schema.decode*`, `JSON.parse`) are at 28, 87, 211, 230, 245 = 5; the change adds none. Do not write those words in new comments either (the regex counts comment-stripped tokens; comments are stripped, but keep it simple).

### `packages/core/src/EnvelopeKeys.ts` (lines 56-83)

```ts
65 export const envelopeKeysOf = (
66   ast: SchemaAST.AST,
67 ): ((entries: ReadonlyArray<readonly [string, unknown]>) => ReadonlySet<PropertyKey>) => {
...
80   return (entries) => {
81     const tag = entries.find(([key]) => key === TAG)?.[1];
82     return (members.find((member) => member.literals.get(TAG) === tag) ?? first).keys;
83   };
```

Change the parameter to the plain object and read `input[TAG]` (line 81). `TAG` is declared at 20. The build-time throws at 70-79 and the doc at 56-64 ("answers per input which member's keys apply") stay; module doc 1-3 should say it names keys and reads only `_tag`. Mutation base here is 58/58, so each branch (absent `_tag` takes first member; unknown `_tag` takes first member) needs a test that survives mutation; existing cases are U9 to U15 in `UntrustedDecode.test.ts` (~418-473). A `_tag` read via inherited property is a design choice to settle (`Object.hasOwn` guard or not); the old code only saw own enumerable keys.

### `packages/core/src/SinkCodec.ts` (comments only, no code change)

- 487-500 `sinkWire` doc: "projects the input onto the envelope's declared keys", "tolerated however deep its value, because the projection drops it before anything walks it" (true after the change for unknown keys; add that the projection reads only the declared names, and what `refuse` and `unwalked` still read).
- Line 501: `const sinkWire = untrustedDecoder(SinkRecordWithJson, { unknownKeys: "ignore", prepare: checkVersion });`
- 503-507 and 509-519 `decodeSinkRecordWithJson`/`decodeSinkRecord` docs: "The projection onto the envelope's declared keys runs first, so an unknown key never reaches the guard or the decode".
- 590 area, `storedWire` doc (592-602): "`ignore` drops an undeclared top-level key before the guard, so a newer server's additive metadata is ignored however deep" and line 603: `untrustedDecoder(StoredEnvelopeWire, { unknownKeys: "ignore", unwalked: ["record"] })`. `record` stays unwalked and is declared, so its value is read once by the projection and its own getters are read by `decodeSinkRecord`.
- `SinkCodec.ts` token budget count 1 (`SinkRecordWithJson`'s `Schema.decodeTo`) is unaffected by a comment edit.

### `packages/core/src/DecodeDepthGuard.ts`

Unchanged. Reads `Object.keys` then `frame.value[key]` at 29-30, so it invokes getters at every depth; that is the "still reads" fact the texts must state. `exceedsJsonDepth` is its one budget token.

## 2. Texts that describe what the projection reads (each must be amended or checked)

| Where | Current claim | Action |
| --- | --- | --- |
| `UntrustedDecode.ts:166` | "It reads no value, so it cannot recurse." | Rewrite: names first, reads each declared value once; says `refuse`, `unwalked` and the guard still read every own getter. |
| `UntrustedDecode.ts:132-135, 141-149` | dropped "before the guard and the decode ever read it" | Scope to the projection under `ignore`. |
| `spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md` D-19 (lines 57-62) | "a shallow own-key copy that reads no value, so it cannot overflow" | Scope to `ignore`; state `refuse`/`unwalked` read. Amend with `spec-revise --date 2026-11-20`, "amended 2026-11-20" status note (header line 10, Change History line 13), Revision bump, and Related/Consequences (140-152) if they repeat it. |
| same ADR D-09 (88-94) | hydration payload "reported and not acted on: ADR-QD-078 chose strict" | Resolve: payload is same-build and version-checked, strict refusal catches tampering; stays `refuse`. |
| `spec/decisions/index.yaml:529-532` | status `Accepted — amends ADR-QD-096, ADR-QD-143; keeps ADR-QD-153` | Add `; amended 2026-11-20` (pattern at line 312: `amended 2026-11-19 (ADR-QD-170)` and 436). |
| `spec/invariants.md:4189-4199` INV-QD-360 | "The projection is a shallow own-key copy that reads no value, so it cannot overflow on hostile nesting" (Implication, 4195); Source 4193 names `project` | Amend wording; Enforcement (4197) lists tests, add the new ones. |
| `spec/invariants.md:3686-3698` INV-QD-306 | `walked`, unwalked slots; says nothing about getters | Check; likely only a Related link, or a one-line scope. Header Change History at line 13 (v1.163) gets a new row. |
| `spec/invariants.md` new INV-QD-377/378 | none yet (`grep` for 377/378 and BEH-QD-666..670 found none) | Add: "ignore projection reads declared keys only" (377), "what `refuse`/`unwalked`/guard still read" or hydration `refuse` pin (378); unused ids named Unused in the CCR row. |
| `spec/behaviors/08-serialization.md:179-215` BEH-QD-621 / BEH-QD-622 ("dropped before the depth guard, so it is never walked") | | Amend 622 or add BEH-QD-666 (declared names only; undeclared getter never invoked); header Change History line 13 (v1.5). |
| `spec/behaviors/19-hydration.md:1053` BEH-QD-488 area; header line 13 (v1.22) | hydration `refuse` | Add the BEH for "unknown top-level key is `MalformedPayload`" pointing at the existing test (section 3). |
| `spec/behaviors/26-decision-stream.md` BEH-QD-624 (stored envelope reader) | "unknown key ignored" | Check wording; grep showed it only as a Related target. |
| `AGENTS.md` §7a, line ~612: "`ignore` drops an undeclared top-level key before the guard, so it is never walked, ADR-QD-170" (the sentence at the start of the paragraph "It runs one fixed recipe") and the `SinkCodec.ts` table row (1 token, unchanged) | | Amend the sentence only; table counts unchanged. Do not add the five budget tokens in prose. |
| `spec/overview.md:134` `UnknownKeyPolicy` row ("or `ignore` it unwalked"), `:132` `untrustedDecoder` row ("the stated unknown-key projection"), `:360` `decodeStoredRecord` row ("an unknown top-level key is ignored however deep"); header Change History line 13 (v1.129) | | Re-word; add a Change History row. |
| `spec/README.md` CCR table (newest rows 391-393, CCR-QD-456 last) | | Add CCR-QD-457 row naming ADR-QD-179 and unused BEH/INV ids as Unused (CCR-QD-448 at 385 is the ADR-170 precedent). |
| `spec/traceability.md` rows 153 (INV-QD-306), 342-ish (ADR-QD-143), 493-494 (test files UntrustedDecode.test.ts, .tst.ts) | | Add the new test file/block rows and the new INV/BEH/ADR links. |

Each text to say only what code holds. Also grep `docs`/website for the same sentences (`grep` across `.md/.mdx` outside spec was not completed; the first attempt failed on zsh globbing).

## 3. Test analogs

### Core: `ignore` projection tests, `packages/core/test/UntrustedDecode.test.ts`

Block at 308 `describe("unknownKeys (KEYP-02, D-16)", ...)`, ids U1 to U16; build decoders inside `it` bodies (this is why mutation reaches them):

```ts
311 it("U1 a shallow unknown key: refuse is Malformed, ignore decodes the declared key", () => {
312   const refuse = untrustedDecoder(Needs, { unknownKeys: "refuse" });
313   const ignore = untrustedDecoder(Needs, { unknownKeys: "ignore" });
314   const input = { a: 1, extra: 2 };
...
357 it("U6 ignore with unwalked: ...", () => {   // 359: untrustedDecoder(Slots, { unknownKeys: "ignore", unwalked: ["entries", "raw"] })
368 it("U7 under ignore, prepare receives the projection without the unknown key", ...
```

Imports/helpers at 1-30 (`assert, describe, it, vi` from `@effect/vitest`, `successOf`, `tagOf`, `Needs`, `Slots`, `Either()` union fixtures). New RED block: add a new `describe` (U17+ ids) at the end of this file or a new file, per CONTEXT "new block or file". Do not touch U1-U16.

### Getter analogs

- `packages/core/test/Admission.test.ts` 145-160 (E7), reads counted by a closure:
```ts
const question: Question = {
  ...questionOf(subject, P.hasRole("editor")),
  get resource() { reads += 1; return reads === 1 ? first : later; },
};
```
Note: object spread evaluates getters; build with `Object.defineProperty` or a literal getter and do not spread.
- `packages/core/test/StoredEnvelope.test.ts` 255-263 (N4, characterisation file, DO NOT EDIT; copy the shape only):
```ts
Object.defineProperty(record, "trap", {
  enumerable: true,
  get: (): unknown => { throw new Error("append trap"); },
});
```
- `packages/core/test/SinkCodec.test.ts` 1095-1102, 1112, 1277: `get boom(): unknown { throw new Error("getter exploded"); }` (encode side, still the literal-getter style).

RED plan: (a) direct, `untrustedDecoder(Needs, { unknownKeys: "ignore" })` on `{ a: 1, get extra() { throw ... } }`, asserting success and zero calls (counter); (b) through `decodeSinkRecord`/`decodeSinkRecordWithJson` (`sinkWire`) with `validRecord()` plus an undeclared throwing getter; (c) through `decodeStoredRecord` (`storedWire`), `stored({...})` shape from `UntrustedSeams.test.ts` 398. Seam fixtures: `recordWith`, `validRecord`, `wireRefusals`, `storedRefusals`, `nested(OVER)` at `UntrustedSeams.test.ts` (describes at 300 and 397; R1-R14, S1-S15). Counting getter for a declared key: pin only what the base measurement shows.

### Existing core seam suites that must stay green

`packages/core/test/UntrustedSeams.test.ts` (R3 at 368, R14 at 391 `__proto__`, S3 at 409), `SinkCodec.test.ts`, `SinkCodecAgreement.test.ts`, `UntrustedDecode.test.ts`, `StoredEnvelope.test.ts` and `.tst.ts` (not edited).

### Hydration pin: EXISTS, reuse, add no test

`packages/react/test/UntrustedSeams.test.ts`:
```ts
195-199 /* The per-policy matrix (KEYP-05, D-11): the hydration payload stays `refuse` (D-09), ... */
199 describe("the hydration payload per policy: refuse (KEYP-05, D-11)", () => {
203   it("H1 a shallow unknown envelope key -> MalformedPayload, nothing seeded", () => {
204     expect(hydrate(payloadOf([entry], { addedLater: "x" }))).toEqual({ seeded: 0, reasons: ["MalformedPayload"] });
```
Also line 93-94 `a shallow excess envelope key -> MalformedPayload` (`payloadOf([], { sneaky: true })`). H2 (207) is the 266-deep variant: `PayloadTooDeep`. `HydrationEngine.test.ts` 167-177 asserts `[{ reason: "MalformedPayload", entries: [], wholePayload: true }]` for another malformed payload. I did not read `HydrationPayload.test.ts` (no hit in the grep for unknown/MalformedPayload). The source lines `HydrationEngine.ts` ~164, 194, 209 (`unknownKeys: "refuse"`) were not re-read here.

## 4. Bench analogs

### In-repo bench: `packages/core/bench/UntrustedDecode.bench.ts` (tracked)

Header doc 1-19 lists groups (a)(b)(c); add the new `ignore` row. Style (82-110): `test(..., async ({ bench }) => { await bench.compare(bench("...", () => {...}), bench("...", ...), options); })` with `const options = { time: 1000, warmupTime: 300 }` (line 25 area). The `decodeSinkRecord` workload is at 93-103:
```ts
const record = JSON.parse(V2.V2_DECIDED_ALLOW);
test("audit — a decision record: one decoder or two", async ({ bench }) => {
  await bench.compare(bench("decodeSinkRecord alone", () => { Result.getOrThrow(decodeSinkRecord(record)); }), ...
```
`SinkCodec.bench.ts` (86, 89) is encode-only (`encodeSinkRecordString`, `encodeSinkRecord`), `SinkRecord.bench.ts` is class construction alternatives (`today: DecisionRecord` etc.). Neither exercises `project`. The stored-envelope workload does not exist: add it (`decodeStoredRecord` over `{ environment, record }`). The policy decoder group does not call `project`.

### Phase 59 harness (reference, byte-for-byte reusable except the below)

`.planning/milestones/v1.6-phases/QD-59-admission-produces-the-one-walk-environment/bench/ab.sh`, `analyze.mjs`.

Evaluate-specific parts to parameterise in a copy:
- `ab.sh` line 96-ish: `packages/core/bench/Evaluate.bench.ts` is hard-wired as the bench file (the final `pnpm exec vitest bench --run --reporter=json --outputFile=... packages/core/bench/Evaluate.bench.ts`), and the header comment line 4. Usage `ab.sh <patch> <outdir> <rounds> <head-label> <patched-label>`; patched arm is `git apply <patch>` before the run, reversed after; guarded by `src_clean` over `packages/core/src` (SRC at line 28), refuses if vitest bench/stryker is running, writes `meta.txt` (head, patch sha256, labels, rounds, node, cpu, start) and `<label>-<i>.json/.log/.load-before/.load-after`, ends with `done.txt`. `uptime` is captured; the top-CPU-process capture the CONTEXT asks for is NOT in it (add `ps -Ao pcpu,comm -r | head`).
- `analyze.mjs` lines 15-18: `REQUIRED = ["evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource", "... neither"]`; `compare` throws `Refused` if absent (line ~62). Parameterise by the new workload keys (note keys are `${b.name} :: ${t.name}`, built at 28-31 from `assertionResults[].benchmarks[].tasks[]`, so a vitest `test(name)` + `bench(...)` pair gives `name :: taskName`).
- Gate logic to replace: `band = Math.max(0.1, spread)` (line ~72) and `slower = d(cMin, rMin) > band`. Phase 66 gate is fixed: no workload slower than 5% (`dMin > 0.05`, no spread widening) and geomean of `dMin` no worse than +2% (the script already computes `geomean` as percent at the `rows.reduce(... Math.log(1 + r.dMin))` line, so gate = `slower === 0 && geomean <= 2`). Decision statistic stays median of per-run minima; MIN_ROUNDS = 3 and a `--self-test` exist (the cases at the bottom would need the new thresholds).
- Fix the gate numbers in the plan before any run.

### Phase 65 record shape (tracked)

`.planning/phases/QD-65-only-admit-builds-an-admitted/65-BENCH.md`: front matter (`verdict`, `phase_base`, `measured_at`, `statistic`, `rounds: 3 + 3`, `slower`), `## Gate` (what was measured against what, patch `to-base.patch` = committed source reversed to the phase base, harness SHA-256s, the two commands, result line `# slower`, `# geomean_d_min_pct`, `# worst_d_min`, `# gate`, "One run of record"), `## Workloads` table (base min ns, final min ns, delta, base spread, band, verdict). Committed raw: `bench/final/` holds `analysis.tsv`, `meta.txt`, `done.txt`, `to-base.patch`, and `base-N`/`final-N` `.json/.log/.load-before/.load-after`. Commands as run:
```
bash <H>/ab.sh <D>bench/final/to-base.patch <D>bench/final 3 final base < /dev/null
node <H>/analyze.mjs <D>bench/final base final < /dev/null
```
Phase 66 difference: the bench file has to exist at both arms. `ab.sh` patches only `packages/core/src` (`src_clean` check at 28-31), but the new bench rows live in `packages/core/bench`, so commit them before the run (they are not in the patch) and the patch is `to-base.patch` over `src` only (`git diff <base> HEAD -- :(glob)packages/core/src/**` reversed). The bench is the last executable change.

## 5. Mutation analogs

- `stryker.config.mjs` (never edit): `ignoreStatic: true` at 79 (module-scope code is `Ignored`; ADR-QD-076), `coverageAnalysis: "perTest"` (77), `jsonReporter.fileName: "reports/mutation/mutation.json"` (75), `thresholds.break: 80` (88-ish), `mutate: ["packages/core/src/**/*.ts", "!packages/core/src/index.ts"]`. Module-scope decoders in `SinkCodec.ts` (`sinkWire` at 501, `storedWire` at 603) and the `PROJECTION` table are static, so the mutants in them are ignored; build decoders inside `it` bodies (as U1-U16 do) so `project`'s and `envelopeKeysOf`'s closures are covered. Note `project(envelopeKeysOf(ast))` runs at decoder build (inside the `it`), so the build-time throws are covered by U16.
- Static evidence run: copy of the config outside the repo with `ignoreStatic: false`; invoke via `pnpm exec stryker run <path-outside>/stryker.static.mjs --mutate <files>`. Not verified that Stryker resolves `plugins`/`tsconfigFile` relative paths from an out-of-repo config; test that when planning.
- Scorer: `.planning/phases/QD-65-only-admit-builds-an-admitted/65-mutation.mjs` (header comment 1-6; `D`, `CONFIG`, `REPORT`, `C`, `FILES`, `INVOCATION` at 12-18). `record base|close` reads `reports/mutation/mutation.json`, requires the report to hold exactly `FILES`, checks `report[file].source === readFileSync(file)`, counts Killed/Timeout/Survived/NoCoverage/Ignored, records open mutants as `{status, mutator, replacement, line, text}`, and writes `65-mutation-<name>.json`; `compare` fails on a lower score, a new open mutant (same status, mutator, replacement, source line text), or more static-ignored mutants. Copy to `66-mutation.mjs` with `D`/`FILES` = `UntrustedDecode.ts`, `EnvelopeKeys.ts`, `SinkCodec.ts` (core `src`) and phase id `"66"` (also the `phase: "65"` literal in the written JSON). The `compare` function body (line 60 onward) was not read.
- Known base (from CONTEXT): `EnvelopeKeys.ts` 58/58; `UntrustedDecode.ts` 41/43 with two pre-existing survivors. `SinkCodec.ts` has no recorded base; take it before any edit. Run with stdin closed and nothing else running (65's note).
- Base run must precede the first edit; record files `66-mutation-base.json`/`66-mutation-close.json` follow 65's naming (`65-mutation-base.json`, `65-mutation-close.json`, tracked).

## 6. Budgets

`scripts/check-house-style.mjs`:
- 640-651 `UNTRUSTED_DECODE_BUDGET`: `UntrustedDecode.ts: 5`, `DecodeDepthGuard.ts: 1`, `PortSpanEncode.ts: 2`, `SinkCodec.ts: 1`, `SimulationForm.ts: 1`.
- 659-665 `UNTRUSTED_DECODE_BUDGET_NAMES`: declarations that must exist verbatim (`untrustedDecoder`, `exceedsJsonDepth`, ...). Do not rename.
- 668 token regex: `/\bonExcessProperty\b|\bexceedsJsonDepth\b|\bSchema\.decode\w*|\bJSON\.parse\b/g`, global (a line with two tokens counts two); comments and string text are stripped before counting, per AGENTS.md §7a. Current `UntrustedDecode.ts` hits: import 28, option 87, `Schema.decodeUnknownResult` 211, `exceedsJsonDepth(` 230, `JSON.parse` 245 = 5. A projection rewrite adds none of these as long as it only uses `Object.keys`/`Object.fromEntries`; new tests are exempt (src-only budget).
- Check `[untrusted-decode]` failure message at 1692-1702; AGENTS.md §7a table must still agree (unchanged).
- Other gates the new code touches: `no-numbering-placeholder` (AGENTS.md §11; never `ADR-QD-NEXT` etc.), `as`/`any`/`!`, `Record<string, unknown>` widening (MEMORY: it is a hack; here `isPlainObject` already returns that type, so just index it), and the `switch` budget (do not add a switch).

## 7. Changeset analog

`.changeset/` is flat files named `<package>-<slug>.md`. A `@qadi/core` patch with one-paragraph body: `.changeset/audit-deep-unknown-record-key-ignored.md`:
```
---
"@qadi/audit": patch
---

`decodeAuditEntry` and `readAuditArchive` now decode a row or an archive entry whose record carries ...
```
Core file style (minor): `.changeset/core-stored-record-is-its-envelope.md` (front matter `"@qadi/core": minor`, bold lead, ends with a "See the 0.13 section of the upgrade guide" line, which a patch does not need). New file: `.changeset/core-decoder-reads-declared-keys.md` with `"@qadi/core": patch` and one paragraph (an undeclared getter on an in-process value is no longer invoked under `ignore`; `refuse` and `unwalked` still read all own getters). Nothing versioned or released.

## Shared patterns and cautions

- Imports: namespace `effect/*`, relative `.ts` extensions (AGENTS.md §1). `EnvelopeKeys.ts` imports only `effect/Match`, `effect/SchemaAST`; keep it a leaf. `UntrustedDecode.ts` leaf rule at its header 19-21.
- Doc comment shape: one-line summary first, rationale after (AGENTS.md top).
- Phase 65 lesson: a review/verify fix after the records plan must also update the CCR row's cited revisions. Phase 64 lesson: git pathspecs need `:(glob)packages/*/src/**`.
- `git diff -- packages/react/src` must be empty.

## No analog / not verified

- No stored-envelope bench workload exists; the `ignore` bench row is new.
- No existing getter-counting test for `untrustedDecoder` or `ignore`; closest is Admission E7 (shape) and StoredEnvelope N4 (throwing enumerable getter).
- Not verified: current content of `HydrationEngine.ts` lines 164/194/209, `HydrationPayload.test.ts`, the remainder of `65-mutation.mjs` (`compare`), BEH-QD-624's text, website/docs mentions of the sentences, that ids BEH-QD-666..670, INV-QD-377/378, ADR-QD-179, CCR-QD-457 are free (grep over `spec/index.yaml`/`invariants.md` found none, and the later grep over behaviors was narrow), the `spec-revise` command's flags, and whether `git ls-files` tracks every analog path (checked for two only).
