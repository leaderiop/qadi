# Domain Pitfalls

**Domain:** Effect v4 authorization library (pnpm monorepo), subsequent milestone v1.7 "Arch Wave 12", Phases 62-68 (13 carried tech-debt items, no features)
**Researched:** 2026-11-20
**Base commit:** `8b22bd66` (HEAD is `b91101a6`, branch `arch-wave-12`)
**Overall confidence:** HIGH for repo mechanics and history (read from source and from the v1.2-v1.6 records). MEDIUM for the four tstyche/TypeScript behaviours marked **[probed]** (run in a scratchpad project whose tsconfig extends the repo's `tsconfig.test.json`, tstyche 7.2.5, TypeScript 6.0.3, Effect language service loaded; not run through the repo's own `pnpm test:tstyche`). Anything marked **[unverified]** was reasoned from code and not run.

Conventions: `file:line` = read in the tree this session. "(hist)" = from `.planning/` records. Owner decisions D1-D5 are locked; nothing below reopens them. Where a pitfall touches a locked decision's wording, it says so and asks only for a factual correction.

---

## Critical Pitfalls

### P1: A rewritten pin is vacuous in its new form too (Phase 62; every phase that adds a pin)

**What goes wrong:** Replacing `not.toBeCallableWith` with another negative form that also cannot fail. Three consecutive v1.6 phases shipped a test that could not fail and found out only in review: Phase 53 WR-01 (3 of 4 prototype-ref cases cannot detect a regression, `53-REVIEW-DISPOSITION.md`), Phase 55 WR-01 (`Omit<...> & { misspelt }` pins failed only on a missing key, so the misspelling half could never fail, `6eb2522c`), Phase 60 WR-03 (the new `runDiagnostics` refusals `DiagnosticsStore.tst.ts:50,57`, `60-REVIEW.iter3.md:173`). The vacuous form also spreads by copy: Phase 59's `PATTERNS.md:17,112` named `DecisionLog.tst.ts:30` as the analog to copy for `WalkEnvironment.tst.ts`.

**Why it happens:** The Effect language service reports a call to an Effect-returning function as `floatingEffect`, tstyche reads that as "not callable", so a negative pin passes whatever the arguments are. **[probed]** `expect(f).type.not.toBeCallableWith({ capacity: 10 })` passes when `f` returns an `Effect` and fails when `f` returns `number` (same parameters). The "flip all 86 to positive" probe in `_WAVE12-CONTEXT.md` is not a classifier: a genuinely non-callable Effect-returning pin also flips to failing.

**How to avoid:**
1. Classify by the subject's return type, per pin, never by flip result. Write the classification table into the phase dir (file, line, subject, returns Effect y/n, replacement).
2. Replacement forms that I probed as non-vacuous **[probed]**:
   - `Params<F>` (`F extends (...args: infer A) => unknown ? (...args: A) => void : never`, as `PortAccess.tst.ts:31-38`, `DecisionCache.tst.ts:23`, `DiagnosticsStore.tst.ts:25`). `Params<typeof nonFunction>` is `never` and tstyche rejects a `never` type argument, so the "typo makes it vacuous" case is caught.
   - `expect(f(badArgs)).type.toRaiseError(<code>)` on the call expression. A valid call fails ("did not raise a type error"), an invalid call passes, a wrong code fails. Note the code is brittle to TypeScript's suggestion heuristics: `{ nope: 1 }` raises 2353 but `{ capcity: 10 }` (near a real key) raises 2561. Pin the code you observed, record it in the pin's comment.
   - `expect(f(goodArgs)).type.toBe<...>()` (a bad argument is a compile error in the expression, `60-REVIEW.iter1.md:75`).
3. Every remaining negative pin gets a **single-variable positive control**: the same call with only the offending argument changed, asserted callable in the same file. A control with different other arguments proves nothing about the pin.
4. Break each rewritten pin once by hand (make the refusal false in the subject or in a scratch copy), watch it fail, restore, and record it. Phase 55's fixer did "3 of 3 failed in the scratch file"; Phase 60's fixer did a deliberate `not.toBeCallableWith(store, { intervalMillis: 500 })`. Record as a table (pin, the edit, the observed failure), not as prose. A bulk "I broke them all" does not count.
5. The committed characterisation `.tst.ts` must contain the known-wrong control (a negative pin on a valid Effect call that passes) so a future tstyche upgrade that fixes the behaviour turns it red and the budget can be retired. It will itself carry `not.toBeCallableWith`, so it needs its own budget row.
6. Scope check: `not.toBeConstructableWith` has 7 negatives in `Decision.tst.ts:31-47`, each with positive controls at `:27,41` and a non-Effect subject (`Data.TaggedClass`). Leave them, but say so in the classification table so a reviewer does not reopen it. **[unverified]** whether a `Data.TaggedError` class (yieldable) would hit the same floating-effect rule; none is pinned that way today.

**Warning signs:** A pin whose only evidence is "tstyche passes". A positive control with different arguments. A phase summary that says "pins verified" with no per-pin failure record. Any new `not.toBeCallableWith` on a function whose signature ends in `Effect.Effect<...>`.

**Phase to address:** 62 (all 81 code pins, the characterisation file, the budget). 63-68 apply the same protocol to every pin they add (63: `@ts-expect-error` for the old cache shape; 65: construction refusal; 64/66: none expected).

**Count detail the planner needs:** `git grep -n "not\.toBeCallableWith" HEAD -- 'packages/*/test/*.tst.ts'` gives **86 lines in 27 files, of which 5 are comment lines** (`DecisionCache.tst.ts:13`, `PortAccess.tst.ts:6,35`, `Qadi.tst.ts:171`, `PortSpan.tst.ts:5`), so **81 code pins**. The context's "86" is a raw line count. The working tree currently shows 101 because an untracked `packages/core/test/ZzProbe1.tst.ts` (not mine) is in it; measure on HEAD or exclude untracked files.

---

### P2: `@ts-expect-error` passes for the wrong reason (Phases 62, 63, 65)

**What goes wrong:** The directive is satisfied by any error on the next line. History: Phase 60 review IN-02 (`60-REVIEW.iter1.md:188-199`): `// @ts-expect-error not generic` over `DiagnosticsOptions<never, never>` stayed green when a one-parameter generic was reintroduced, because the line errored for arity. The reviewer compiled it under `tsc --strict` and it exited 0. Fixed with two lines (one and two type arguments). The same hazard sits on every "has no exported member" pin: `DecisionCache.tst.ts:20-21` is `// @ts-expect-error has no exported member 'walk'` over `export { walk } from "../src/index.ts"`. A typo in the path raises TS2307 and the pin passes forever. The message after the directive is a comment, not a check.

**Why it happens:** `tsc` (the `pnpm typecheck` step, which includes `.tst.ts` through `tsconfig.test.json`'s `packages/*/test/**/*.ts`) checks only that some error occurred. It runs without the Effect language service, so it cannot be satisfied by `floatingEffect`, but it can be satisfied by anything else.

**How to avoid:**
- Prefer `expect(...).type.toRaiseError(<code>)` with the specific code, or a `tsc` run that parses the diagnostic code at that line.
- For a private constructor **[probed]**: `expect(new Priv("a", 1)).type.toRaiseError(2673)` passes, and `expect(new Priv()).type.toRaiseError(2673)` also passes (TypeScript reports the accessibility error even with bad arguments), so a code pin on 2673 is robust where a bare directive is not.
- Where a directive must stay (a re-export line cannot be wrapped in `expect`), produce one run **without** the directive in a scratch copy and record the exact code, then check the code is the intended one (for a missing export: TS2305/TS2724, not TS2307).
- Phase 63's old-shape pin (`(question, compute)` against `DecisionCacheShape["getOrCompute"]`): the caller-side error is TS2559/TS2554-class (`DecisionCache.tst.ts:1-10` explains the weak-type rule), and a wrong-reason error such as an unresolved import in the packed consumer also satisfies a directive. In the gate-14 consumer, run tsc on the negative line alone in a second file, or parse tsc's output for the expected code at that line (see P5).

**Warning signs:** `@ts-expect-error` with no code in the comment. An "expect error" line with more than one thing that can be wrong on it. A pin whose positive twin does not exist.

**Phase to address:** 62 (rewrite the 5+ directive pins that stand in for refusals; the `surface.tst.ts` re-export refusals), 63 (consumer), 65 (construction).

---

### P3: Making `Admitted`'s constructor private does not stop a structural literal (Phase 65)

**What goes wrong:** The goal is "only `admit` builds an `Admitted`" (`Admission.ts:81-90`, public six-field constructor today; no `new Admitted` in tests as of 2026-11-20). **[probed]** A private constructor alone leaves the instance type structural: `expect({ source: "a", n: 1 }).type.toBeAssignableTo<Priv<"a">>()` passes. `Admitted` has no private members (`Admission.ts:81-90`), so after step 59b any object literal with the six fields still type-checks as `Admitted<"asked">`, in a test helper or in `Walk.ts`. A private-member brand (`declare private readonly brand: true;`) made the same literal not assignable **[probed]**.

**Why it happens:** TypeScript's `private` constructor restricts `new`, not assignability. Only a private or `#` instance member makes a class nominal.

**How to avoid:**
- Private constructor **and** a `declare private readonly` brand (type-only, no emit, no hot-path cost), and pin both: `toRaiseError(2673)` on `new Admitted(<valid args>)`, and `not.toBeAssignableFrom`/`not.toBeAssignableTo` on an object literal with the same fields.
- `export const admit = Admitted.admit` loses `this`. The static must not use `this` (call `new Admitted(...)` by name, as the class body does today) or be an arrow static. Pin it by calling the exported bare `admit` (`Walk.ts:878` is `admit(question, "asked")`).
- `Admitted<"row">` not assignable to `Admitted<"asked">` is already pinned by `WalkEnvironment.tst.ts` (4 tests, 18 assertions pass per `59-VERIFICATION.md`); keep it passing after the move.
- 59a (derive the "asked" resource flag from the matcher context) cannot be type-proven: `SuppliedBy.asked` is `Supplied` with `boolean` fields, so an `"asked"` row that says `true` compiles (`59-REVIEW.iter3.md` WR-01, compiled and exits 0). Keep the runtime pins E1-E5 (`Admission.test.ts`) and `LeafMatrix.test.ts` green and unedited; the derivation removes the second source of truth, it does not make a type guarantee. Do not write that the compiler guards it; that exact over-claim cost Phase 59 a review round.

**Warning signs:** A pin that says "cannot be constructed" using `not.toBeConstructableWith` (Phase 62's finding applies; the context already says use a directive or code pin). Docs saying "the compiler guarantees".

**Phase to address:** 65.

---

### P4: A house-style budget that drifts, or that silently counts zero (Phase 62 `NOT_CALLABLE_PIN_BUDGET`; also 63's derived guard, 66's `UNTRUSTED_DECODE_BUDGET`)

**What goes wrong:**
1. **Wrong scan set.** `collect()` excludes `.tst.ts` (`scripts/check-house-style.mjs:876-889`, the `!/\.tst\.ts$/.test(full)` at `:889`), so a budget added to the main `for (const file of sources)` loop (`:991`) counts zero in every file and "passes" in both directions. The two rules that already read `.tst.ts` do it with their own walk: `[no-numbering-placeholder]` (`:2098-2133`) and `[metric-id-literal]` (`:1980-2010`). Copy that shape.
2. **Raw counts include comments.** 5 of the 86 raw hits are comments. `strip()` (`:946`) is per-line and handles comments, strings and single-line templates, but a pin written across lines (`expect(f)\n  .type\n  .not.toBeCallableWith(`) or a multi-line template literal defeats a per-line token. Count the token `not.toBeCallableWith` after strip, and assert the baseline with the same invocation (`_SHARED-CONTEXT.md:47`).
3. **One direction.** Budgets are exact counts checked both ways (`UNTRACED_BUDGET :464`, `SCHEMA_ERROR_BUDGET :542`). A count-only budget cannot check "on plain-return subjects, each with a positive control". That half is either a reviewed reason column or a marker the gate can read (for example a `// positive control:` comment naming the sibling line). Decide which before writing the gate; do not claim the gate enforces it if it counts.
4. **No companion checks.** The pattern that kept the other budgets honest is three parts: the counts, a names/declaration guard (`UNTRUSTED_DECODE_BUDGET_NAMES :654`), and a check that AGENTS.md's table lists exactly the budgeted files (`[schema-error-table]`, `[untrusted-decode-table]`). A new §6 paragraph with a table and no table check is the drift that gate was built against.
5. **The characterisation file is a user of the token.** It must be a budget row with its reason, or the gate fails on its own evidence.

**How to avoid:** Prove the gate, the same way as a pin (P1): add one pin to a budgeted file (fails), delete one (fails), add the token inside a comment (does not change the count), move a pin across lines (still counted). Record those four runs. Run the gate with `scripts/check-house-style.mjs` on the base first to see it clean.

**Same hazard, other budgets:** Phase 66 must keep `UNTRUSTED_DECODE_BUDGET` consistent (`UntrustedDecode.ts` = 5, tokens `onExcessProperty|exceedsJsonDepth|Schema.decode*|JSON.parse`). Changing `Object.entries` does not move a token, but a refactor that adds a `Schema.decode*` call or moves `JSON.parse` does, and AGENTS.md §7a's table must change in the same commit (`[untrusted-decode-table]`).

**Warning signs:** A new budget whose baseline run printed no per-file counts. A table in AGENTS.md with no check. `pnpm check:pr` green on a budget that was never made to fail.

**Phase to address:** 62 (new gate), 63 (the "every `make*Feed` root export is in the consumer" guard is the same class of derived check), 66 (budget consistency).

---

### P5: Gate 14 probes that are vacuous, flaky, or test only the source (Phase 63)

**What goes wrong, and the evidence:**
- **Vacuous assertion.** Phase 60's first probe (`657c64e6`) asserted only `Reading`, the status a feed has before it reads anything and also the status of a feed that read nothing. Review IN-03 (`60-REVIEW.iter1.md:201-208`) found it, fixed in `caa3d0e9` by asserting the entry count after settling. Apply the same to each new probe: the asserted value must differ from the feed's initial snapshot. For the gates feed, hand it a registry (`GateRegistryLike` = `instances` + `subscribe`, `Gates.ts:247-250`) and assert the registry read is `Read` (the initial value is `Unwatched`, `GatesFeed.ts:107`), ideally with one instance so the count is 1. For the diagnostics feed, assert a field that only a completed first read sets.
- **Wall clock.** The diagnostics poll runs on `Schedule.spaced(intervalMillis)` over the real clock (`DiagnosticsStore.ts:253`; default 2000 ms), and the gates feed's questions thunk first ticks one interval after start (`GatesFeed.ts:19-21`). The existing probe lets the fiber run with `for (let i = 0; i < 20; i++) yield* Effect.yieldNow` (`check-package-install.mjs:507-509`), a hidden coupling to the number of fiber turns the read takes (the same constant is `settleTurns`, `packages/devtools/test/helpers.ts:174`). Assert only the **first** read (it needs no clock), never a second poll or a read count. Prefer a bounded loop that stops when the asserted condition holds (turn cap, then fail with the observed state) over a fixed 20, so a feed that takes 21 turns is a deterministic pass, not a flake. **The context's "diagnostics feed with an immediate schedule" no longer has a `schedule` option**: Phase 60 removed it (`DiagnosticsOptions` is `intervalMillis` only, `DiagnosticsStore.ts:219-223`). Use `intervalMillis` or the default, and a pin that `schedule` is refused (P2).
- **Source versus tarball.** The "derived guard" (every `make*Feed` root export present in the consumer) must enumerate exports from the **packed** install, as check 3 does (`probe.mjs`, `:274-300`: `import * as m from "<pkg>"`), not from `packages/devtools/src/index.ts`, whose exports are not necessarily what shipped (ADR-QD-099, the closed `exports` map). Type-only names (`DecisionCacheShape`, `GatesFeedInputs`) have no runtime key, so a runtime-key guard cannot cover them; the guard covers `make*Feed` values, and the type-only name is covered by the consumer compiling against the packed `.d.ts` (`skipLibCheck: false`, `:599`).
- **A comment or import satisfies a substring guard.** "Absent from its consumer source" checked with `FIXTURE.includes(name)` passes on `// makeGatesFeed` or an unused import. Require a call (`name(`) after stripping comments, and make sure the probe's result is asserted (`expect(...)`), not just computed.
- **Escaping.** `FIXTURE` is a template literal (`:395`); a backtick or `${` in new probe code must be escaped, as the existing comment shows (`\`Reading\``, `:500`). An unescaped one breaks the script, not the probe.
- **"A deliberately removed probe must fail the gate."** Demonstrate it once and record it. Better, give the script a self-test mode (the Phase 59 `analyze.mjs --self-test` precedent) so the demonstration is re-runnable.
- **The `@ts-expect-error` consumer line** for the pre-0.13 `(question, compute)` shape: see P2. The typed host cache must also be **run** (wrap `decisionCacheLayer()` and delegate), or the type-level probe proves less than it looks. The probe's `DecisionCache` shape is `getOrCompute(question, options?)` returning `Effect<CacheLookup, EvaluationError, PortServices>` (`DecisionCache.ts:38-100`).
- **Prose.** Any "gate 14" in a new comment or record must name `scripts/check-package-install.mjs` (AGENTS.md §15, `check-dod-table.mjs:212` flags bare "gate N").

**Warning signs:** A new probe that asserts a status or `typeof`. A `sleep`/`timeout`/`Clock` in the fixture. A guard that reads `packages/devtools/src`. A probe that passes with its call deleted.

**Phase to address:** 63 (v1.6 retro lesson 1: "extend gate 14's probe for every new public name, not a sample"). Note v1.7 adds no new public names; the lesson applies to the three already missed.

---

### P6: A behaviour change in the shared store breaks the React dock, or leaves the feed lying (Phase 64)

**What goes wrong:** `ExternalStore.notify` (`ExternalStore.ts:34-36`) is shared by 13 modules. Deferred in Phase 60 *because* it changes the dock (`60-REVIEW-DISPOSITION.md`: "CONTEXT puts the dock's behaviour out of scope"). Specific hazards for D1:
1. **Set iteration semantics.** Today `for (const listener of listeners)` is a live iteration: a listener removed by an earlier listener is not called; a listener added during notify is visited in the same pass. A "collect then call" rewrite over a copied array changes both (an unmounted component's listener would be called; React ignores it, but the characterisation tests may not). Keep the live iteration unless a RED test says otherwise, and pin "unsubscribe during notify is safe" and "subscribe during notify" both.
2. **Falsy throws.** Tracking "one listener threw" with `if (error)` loses `throw undefined`, `throw 0`, `throw null`. Collect caught values into an array and decide by length. "One error rethrown as-is" must be reference-equal (`toBe`), including for a thrown `undefined`.
3. **Mutants.** `stryker.devtools.mjs:47` mutates `packages/devtools/src/model/**`, so `ExternalStore.ts` is in the gate (break 80). New mutants: `length === 1` / `> 1` boundaries, the `AggregateError` message literal (a StringLiteral mutant survives unless a test asserts it). State a fixed message in the BEH and assert it. `react/*` hooks are not in that set, so "the dock is still notified" is proven by tests, not by mutation.
4. **The feed can still lie after D1.** `readSource` does `reads.begin()`, `status.set(READING)`, then `reads.fork(...)` (`TimelineFeed.ts:131-141`). A rethrow after the loop still escapes `status.set(READING)` before `fork`, so a timeline restarted from `Stopped` can say `Reading` with nothing reading. `README.md:162-167` documents exactly that and the gates/diagnostics equivalents. The audit item reads "try/finally around the publish" as part of 60a (`v1.6-MILESTONE-AUDIT.md:39`); `_WAVE12-CONTEXT.md` Phase 64 lists only the `notify` fix. **The planner must decide, without reopening D1, whether the publish-between-begin-and-fork guard is in scope**, and state it. If out, the README paragraph must keep (and narrow) the "status can be wrong" sentence; if in, it needs its own RED test per feed.
5. **Doc spiral.** Phase 60 needed three review rounds and hit the cap because each doc fix created a new overclaim: iter-2's BEH-QD-638 rewrite said a throwing release handle is a `Failed` in the snapshot, contradicting BEH-QD-584, test G42 and `GatesFeed.ts:194-206` (`60-REVIEW.iter3.md:108-130`). Derive each doc sentence from one test, and change all of these in one commit: `TimelineFeed.ts:57,66`, `DiagnosticsFeed.ts:97`, `GatesFeed.ts:8-11,77`, `README.md:164`, `apps/website/src/content/docs/docs/packages/devtools.md:224-227` (mirrors the README), BEH-QD-638 at `spec/behaviors/28-devtools-screens.md:2548`, and check `spec/overview.md`'s feed rows and `pnpm spec:claims` (`check-devtools-claims.mjs`, claims-of-absence) for any "does not isolate" statement.
6. **Characterisation files.** `QuestionsPanel.characterisation.test.tsx`, `ServicesPanel.characterisation.test.tsx` and `QuestionsPanel.feed.characterisation.test.tsx` must pass unedited. Enforce it in the phase scan as `git diff <phase_base> -- <the three paths>` empty, not by reading the diff. (Phase 60 allowed exactly two type-name lines in the feed one and encoded that in `60-scan.mjs:86`; here the allowed set is empty.) Put the RED tests in a non-characterisation file.

**Warning signs:** A RED test that only throws once. A `notify` that returns a value. README still saying "must not throw" after the change. A dock test edited to pass.

**Phase to address:** 64.

---

### P7: Hot-path changes regress the bench, and the band is wide (Phases 65, 66, and 67's cache path)

**What the Phase 59 gate actually was** (`59-BENCH.md`, `ADR-QD-172 ## Benchmark`, `bench/ab.sh`, `bench/analyze.mjs`): all 35 `Evaluate.bench.ts` workloads, runs **interleaved 3 + 3** (base, candidate, base, ...), the candidate applied and reversed as a patch around each run so nothing is committed to measure it; decision statistic = **median of per-run minima**; a workload is slower only if its delta exceeds `band = max(10%, the base arm's own spread)`; verdict = the last line of `analysis.tsv`, `# gate: pass`; a 5 + 5 run as corroboration. The host was loaded (1-minute load 6 to 126) and the gate still passed because of the statistic and the band. The after-run measured committed source against the base with a reverse patch (`git diff <head> <phase_base> -- packages/core/src`).

**Pitfalls when reusing it:**
1. **The harness is Evaluate-specific.** `ab.sh:91-92` hard-codes `packages/core/bench/Evaluate.bench.ts` and `analyze.mjs:14-17` refuses input missing two Evaluate workload keys. Phase 66's relevant benches are `UntrustedDecode.bench.ts` (groups a-c), `SinkCodec.bench.ts`, `SinkRecord.bench.ts`. Copy the harness into the new phase dir parameterised by bench file and required keys, keep its `--self-test`, and do not edit the archived Phase 59 copy.
2. **Bench the path that changed.** `project` runs only for `unknownKeys: "ignore"` seams (`UntrustedDecode.ts:166-173`, `PROJECTION.ignore`); `refuse` is `keepEverything`. The policy decoder group does not exercise it. Choose workloads through `decodeSinkRecord`/the stored-envelope decoder (an `ignore` seam), or add a micro-bench, and say which workloads they are before running.
3. **A 10% band can hide a real 8% decode regression** (Phase 59's worst were +7.3/+7.5/+9.0% inside their bands). Decide up front whether the changed-path workloads get a tighter band or a geomean limit, and write it before the result is known (the v1.3 mechanism-spike rule: the decision rule first).
4. **Every executable edit after a bench invalidates it.** Phase 59 needed three after-runs (`after`, `after-fix`, `after-fix-2`) because two review rounds changed source. Comment-only edits do not, but prove it: `git diff <benched-commit> HEAD -- packages scripts` is comments only (`59-VERIFICATION.md` "Currency of the after-bench"). Schedule the bench after the last planned source edit, and expect review rounds to cost one more.
5. **Do not run it beside anything.** `ab.sh` refuses to start while a `vitest bench` or `stryker` is running (`:30-33`), but not beside other vitest runs or `pnpm check:pr`; log `uptime` around runs as the harness does.
6. **Phase 67's `Match` in `SharedComputation.run`.** AGENTS.md §5a measured a hoisted `Match` at 1.6-2.4x and `Match.value` rebuilt per call at 3.5-7.7x a `switch`. `run` is called once per cache lookup; its handlers close over per-call state, so the matcher cannot be module-scope. Bench `DecisionCache.bench.ts` before and after, or dispatch in a form that allocates nothing per call. (`SharedComputation.ts` is not in `SWITCH_BUDGET`; no new `switch`, per the context.)

**Warning signs:** A bench summary with no workload table. "No change in source" claims that cite a comment-only diff nobody ran. Load average not recorded.

**Phase to address:** 65 (Evaluate bench, `admit` runs once per walk, `Walk.ts:876-880`), 66 (decode benches), 67 (`DecisionCache.bench.ts`, cheap).

---

### P8: Mutation: score drops on touched files, ids keyed on line text, `ignoreStatic` hides module-scope mutants (Phases 64-68)

**Mechanics that bite** (from `61-mutation.mjs`, `stryker.config.mjs:79`, `stryker.devtools.mjs:45`):
1. **Mutant identity is text, not position.** `keyOf` = mutator | replacement | mutated text | the **normalised source line** (`61-mutation.mjs:44-46`; `lineOf` takes only the mutant's start line). Rewriting a line changes the ids of every mutant on it. `compare` then reports "lost" kills as deleted or rewritten (paired by anchor), survivors as "moved", and **fails only on**: a score fall, a new survivor, a killed mutant that left while its line is still present, an undone declared deletion, or a new static-ignored mutant without Killed evidence. So pure moves are survivable, but noisy, and a wrapped line splits one id into several. This is why `58-REVIEW-FIX.md:19` deferred the re-wraps ("re-wrapping moves the line text the D-16 mutant ids key on").
2. **Phase 68's re-wrap is free only against a fresh base.** Phase 58's mutant files are archived, so there is no old id to match, but Phases 62-67 will have moved `SinkCodec.ts`, `DecisionLog.ts`, `UntrustedDecode.ts`, `DecisionCache.ts`. Measure a `68-mutation-base.json` on the post-67 tree **before** the first re-wrap, scoped with `--mutate`, then compare after. "Re-run Stryker on touched files" is not a base.
3. **`ignoreStatic: true`** (core and devtools). Module-scope code is `Ignored`, not scored. Where this bites: Phase 66's `PROJECTION` table and `EnvelopeKeys.ts` are module-scope (Phase 57 Pitfall 5, `57-RESEARCH.md:543-545`: build decoders inside `it` bodies so mutants are non-static); Phase 65's `SUPPLIED` table; Phase 67 if a `Match.type` is hoisted. A new static-ignored mutant needs Killed credit from an `ignoreStatic:false` run of the after tree (`NN-mutation-static.json`, about 4 minutes), or the compare refuses. The score can look higher exactly when coverage is lower.
4. **Staleness.** The report must be newer than the newest `src`/`test` file (`61-mutation.mjs:76`). Every review round that edits a comment or a test forces a fresh run plus a static run plus a commit: Phase 60 needed three, Phase 61 two (v1.6 retro). Put wording changes before the final run; batch review fixes.
5. **Baselines to hold** (`_WAVE12-CONTEXT.md`, Phase 61 scores): `DecisionCache.ts` 0.977, `SharedComputation.ts` 0.986, `Lifecycle.ts` 1.000. Phase 66: `EnvelopeKeys.ts` 58/58, `UntrustedDecode.ts` 41/43 with two pre-existing survivors (`57-REVIEW-DISPOSITION.md`). Record the post-review figure as the phase's final score (v1.4 lesson 1), not the pre-fix one.
6. **Restructuring away an equivalent mutant (D5)** can add new ones. Removing `if (Option.isSome(oldest))` (`DecisionCache.ts:287`) by `Chunk.getUnsafe`/`headUnsafe` would turn an impossible branch into a possible **defect** inside the walk path, against AGENTS.md §4 ("an authorization decision must never become a defect"); restructure so the empty case cannot be expressed (for example a loop whose step returns the next state), not a throwing accessor. For `SharedComputation.ts:319` the survivor exists because only `claimed._tag === "Hit"` is checked (`:322`); a closed dispatch makes `"Claimed"` matter, and a mutant of the other two tags (`"Hit"`, `"Joined"`) must also be killed.
7. **Shrinking a test can un-kill mutants.** The race test (P9) is run for every mutant in `DecisionCache.ts`/`SharedComputation.ts` under `perTest` coverage; changing its sweep changes what it kills and how long each mutant takes (`timeoutMS: 20000`).

**Process hygiene:** Stryker runs strictly one at a time and never beside vitest (ADR-QD-098); stdin closed (`< /dev/null`), in the background; planners must serialise Stryker steps across plans.

**Warning signs:** "Mutation unchanged" with no compare output. A compare that prints "moved survivor" without a declared rule. A new `Ignored` count with no static evidence.

**Phase to address:** 64 (`ExternalStore.ts`), 65 (`Admission.ts`), 66 (`UntrustedDecode.ts`, `EnvelopeKeys.ts`), 67 (`DecisionCache.ts`, `SharedComputation.ts`), 68 (`SinkCodec.ts`, `DecisionLog.ts`).

---

### P9: The race-test rewrite loses what it was guarding (Phase 67, item 61b)

**What goes wrong:** `DecisionCache.test.ts:1250` sweeps `gap` 0..48 for each `MaxOpsBeforeYield` budget 3, 4, 5, 6 (measured switch-over 38/22/15/13, `:1248`). The replacement "iterate until both orderings were observed, cap 512, assert both seen" has these traps:
1. **Per budget, not overall.** Both a `coalesced` and a `hit` ordering must be seen **for each budget**, or three budgets can pass on the fourth's observations.
2. **Early exit shrinks the sample.** The assertions that matter (the key is never recomputed, FIFO stays exact, `:1286-1290`) run on every iterated gap today. Stopping at the first sight of both orderings runs them on fewer interleavings and can leave mutants killed only at higher gaps alive. Either keep running safety assertions across a window past the switch-over, or measure with Stryker that the kills held (P8.7).
3. **Fail loudly at the cap.** If 512 is reached without both orderings, the failure message must name the budget and the counts; a silent pass at the cap would be the same defect the bound had.
4. **Runtime.** 4 budgets x 512 worst case is 2048 iterations against 192 today, and Stryker runs this test for many mutants. Measure the test's duration before and after.
5. The test is deterministic (`Effect.yieldNow` and `Scheduler.MaxOpsBeforeYield`, no wall clock); keep it that way. The comment on `:1248` already says "re-measure rather than retry"; with the new rule the comment should go, because the number no longer exists.

**Phase to address:** 67.

---

### P10: Spec drift: the code changes, the normative record does not (Phases 62-68; AGENTS.md §11, §12, §15)

**Evidence (every v1.6 phase with a review loop):** Phase 59 iteration 3 WR-02: `RESOURCE_SUPPLIED` was renamed `SUPPLIED` and the overload deleted in `1ac8bccc`, updating only ADR-QD-172, while `spec/invariants.md:4239,4241`, `spec/traceability.md:58,196` and ADR-QD-163 `:292,294` still named both (`59-REVIEW.iter3.md`). Phase 57 iteration 2 WR-01: `U1..U19` ranges and BEH-QD-621 lagged the review fixes. Phase 60 iterations 2 and 3: new overclaims in BEH-QD-638 (P6). Phase 55 IN-02: "notifies twice" in BEH-QD-615 claimed more than the test asserted.

**How to avoid:**
- After any rename or semantic change, run the stale-name sweep the Phase 59 reviewer used (`/usr/bin/grep -rn "<old name>" spec packages`) as the **last task of the phase**, and again after every review fix.
- One record per behaviour change in the same change set (§11): BEH, INV, `spec/traceability.md`, `spec/README.md` (Document history plus the CCR row), `spec/decisions/index.yaml` for an ADR, `.changeset/*.md` where the phase's context says one is due (64 devtools patch, 66 core patch; 62, 63, 65, 67, 68 none, and 67 must not change behaviour).
- `scripts/spec-revise.mjs <doc> "<what changed>" --date YYYY-MM-DD`: the date flag is required or the document argument is silently dropped (v1.2 retro); run `--check` after each bump. One bump per document per entry; `spec/README.md` is at Rev 1.258 and every phase edits it, which is why phases must stay strictly serial.
- Never run `node scripts/next-id.mjs`. Use only the reserved block; an unused number is named in the phase's CCR row ("Unused: ..."), as the context requires. `ADR-QD-NEXT` and siblings anywhere in `packages/*/src|test|bench`, `features/` fail `[no-numbering-placeholder]`.
- Any "gate N" in new spec prose must name its script (§15, `check-dod-table.mjs:212`): write "`scripts/check-package-install.mjs` (merge gate 14)". Change history is exempt.
- `typescript`/`tsx` fences in spec are compiled by `pnpm spec:examples` (§12); a re-wrap (61c, ADR-QD-174 line 73, 189 chars) must not reflow inside a fence, and a whitespace-only edit still needs the `spec-revise` bump.
- A claim that port cards are derivable is only checked if it sits in a compiled `typescript` fence; a `ts` fence is not compiled. See P11 for why this matters for D3.

**Warning signs:** A rename commit that touches only `packages/`. A CCR row listing a revision that is no longer the document's revision (Phase 61 iteration 3 had to check exactly this). `pnpm spec:verify:strict` green and the sweep not run.

**Phase to address:** All. 64 (BEH-QD-636/638 area, new INV), 65 (ADR-QD-172 amendment), 66 (ADR-QD-170 D-19 and D-09), 68 (ADR-QD-173, ADR-QD-174 line 73).

---

### P11: D3's recorded "how" is factually wrong as worded (Phase 68, item I-b)

**What goes wrong:** `_WAVE12-CONTEXT.md` says the ADR-QD-173 amendment records "how a headless consumer derives the same view from the timeline feed", and the audit says port cards are "driven by the gates feed". In the code, `portCards` is a function of the **shown diagnostics reading** only: `DockModel.ts:255-263` builds `ServicesInput` from `shownReading.getSnapshot()` as `{ wiring: reading.wiring, activity: reading.activity, portCalls: reading.portCalls, unsampled: isUnsampled(status) }`, and `PortCards.ts:28-34` states the input. Those fields come from `DiagnosticsFeed`'s snapshot (`makeDiagnosticsFeed`), not from `makeTimelineFeed` (decision records) and not from `makeGatesFeed` (the questions join, `DockModel.ts:250-252`). I am not reopening D3 (port cards stay package-private); the factual correction is to the derivation it records.

**How to avoid:** Write the amendment from `DockModel.ts:255-265` and `PortCards.ts:28-34`: a headless consumer reads `DiagnosticsFeed.getSnapshot().reading` (`wiring`, `activity`, `portCalls`) plus the status, and writes its own join. If the amendment shows code, make it a `typescript` fence so `pnpm spec:examples` compiles it against the real root exports; that is the only way the claim is checked. Confirm the consumer-visible types (`WiringRead`, `PortActivity`, `PortCallLog`) are root exports first. **[unverified]** that all of them are; `surface.tst.ts` lists the root types.

**Phase to address:** 68.

---

### P12: Stale verification, `nyquist_compliant`, and commit trailers (every phase close)

**What goes wrong (hist):** A later phase edits a file an earlier verification covers, so its `covered_digest` goes stale. v1.0: 4 phases; v1.2: 3; v1.3: 6; v1.4: 3; v1.5: 5 (43, 44, 45, 46, 48); v1.6 relied on each phase's verifier plus the integration check instead of per-phase re-verification (`RETROSPECTIVE.md` "Top Lessons" 1). Backfilling `requirements-completed` into SUMMARYs also stales them, because SUMMARYs are covered inputs (v1.5). `nyquist_compliant: false` left over from plan-phase's seed in phases 54, 56, 59 (v1.6 audit), and 44 (v1.5 audit). 33 commits with the wrong or no model trailer in v1.3, found only at audit when a rewrite would break hash citations.

**Predicted for v1.7:**
- Phase 62's covered set is about 27 `.tst.ts` files plus `check-house-style.mjs` and AGENTS.md. Later phases that edit covered files: 65 (`WalkEnvironment.tst.ts`), 66 (`UntrustedDecode.tst.ts`, possibly `UNTRUSTED_DECODE_BUDGET` and AGENTS.md §7a), 64 (devtools `.tst.ts`), 68 (AGENTS.md only if a budget text moves). Expect 62 to go stale.
- Phase 63's covered file is `check-package-install.mjs`; nothing later in the plan needs to edit it.
- Phase 68's 61d record must not edit a Phase 61 SUMMARY, PLAN, or any covered source (that stales Phase 61's report). Put the comments-only proof in a **new** file in the Phase 61 archive dir.

**How to avoid:** Decide at plan time which phases will be re-verified at 68's close (62 at least) and put it in 68's plan rather than discovering it. Write `requirements-completed` in the closing SUMMARY at close. At each phase close, grep `NN-VALIDATION.md` for `nyquist_compliant:` and `status:` (validate-phase must flip it, v1.6 lesson 2). At each phase close run `git log <base>..HEAD --format=%B` and check the trailer line (the v1.6 scans assert `Co-Authored-By: Claude (Opus|Sonnet) 5.5 <noreply@anthropic.com>`; use the trailer this run's commits actually carry). Compare commit-shape verifies against the commit that created a file when it belongs to the same phase, not `phase_base` (61-03 deviation).

**Phase to address:** every phase close; 68 for the milestone sweep.

---

### P13: Plan-local ids leak into shipped test titles and comments (Phases 62-68)

**What goes wrong:** v1.5 audit: about 20 plan-local ids remain in shipped tests (BRKR-, EMIT-, D-NN); v1.5 lesson 2 asked for a gate and none was added. Today a naive regex over `packages/*/src|test` finds **248 hits**, many legitimate: ADR-internal decision cites such as "ADR-QD-095 D-09-e" (`EncodeRefusalReport.ts:5`) or "D-07" in budget comments of `check-house-style.mjs:695`. So a whole-tree gate false-positives, which is probably why none exists. `packages/core/test/StoredEnvelope.test.ts` carries 10 (`STOR-01` in the describe title at `:228`, `(D-01)`/`(D-12)` row titles, `STOR-02, D-05, D-07` in the header at `:6-13`), and Phase 68 makes its "one recorded edit" there (58b).

v1.7's own risk: the owner decisions are named **D1-D5**, each phase context has D-NN ids, and requirement ids such as `WX-0n` exist. A pin titled "D4: an undeclared getter is never read" would ship them.

**How to avoid:** Cite BEH/INV/ADR ids (they are the traceability chain, §10), never D-NN/D1..D5/phase numbers, in test titles, describe titles, source comments and changeset text. Check **diff-scoped**, per phase: `git diff <phase_base> -U0 -- 'packages/*/src' 'packages/*/test' 'features' | /usr/bin/grep '^+' | /usr/bin/grep -E '\bD-?[0-9]{1,2}[a-z]?\b|WX-0|ARCH-1[0-9][0-9]'` and read every hit (ADR-internal cites excepted). For `StoredEnvelope.test.ts`, decide the scope explicitly: header and the "RED on the base" title only (as 58b says), or all ten; the context's one recorded edit suggests the former, and the remainder stays tech debt, named.

**Phase to address:** every phase; 68 for the one recorded edit.

---

### P14: A "comments-only" or "title-only" claim that is not proven (Phase 68, items 58b and 61d)

**What goes wrong:** 61d asks to "prove `Simulator.test.tsx`'s Phase 61 diff is comments-only (strip comments, diff empty)". A regex strip (`//.*$`) eats `"http://"` inside strings, template literals and regex literals; that is why `check-house-style.mjs:930-945` special-cases regex literals before stripping. And 58b is **not** comments-only: it changes a test title, which is a string in the program text, in a **pinned characterisation file**.

**How to avoid:** Prove it with the compiler, not a regex: transpile base and head with `removeComments: true` (`ts.transpileModule`, same options) and compare the output; for 58b, mask the title string arguments of `it`/`describe` first and compare, so the proof reads "only comments and these named titles changed", and run the file's tests before and after (same count, same results). Before renaming a title, grep for it: `never stamped` is cited at `spec/behaviors/26-decision-stream.md:406` (an amendment quoting the old requirement, not the title) and `packages/core/test/SinkCodec.test.ts:2233` (a different test that should keep its wording unless the owner wants it changed); `RED on the base` appears only in `StoredEnvelope.test.ts:228`. The archived `61-scan.mjs` is not edited (context).

**Phase to address:** 68.

---

### P15: Vacuous verify commands and gates written against the wrong invocation (every plan)

**What goes wrong (hist):** Phase 56's plans ran a "only the feed changed" check with the pathspec `'packages/*/src'`, which matches nothing below those directories, so it passed vacuously. This was found in five SUMMARYs (56-04, 56-05, 56-06, 56-12, 56-13). 56-04 also found the house-rules script's `\bas\s+` regex matches `import * as Cause`, which §1 requires, so it could never pass. v1.4: commit-count verifies counted each plan's own SUMMARY commits. v1.2: `pnpm check:pr` hung 30 minutes without `< /dev/null`. `grep` is an ugrep alias; zsh does not word-split an unquoted `$files`.

**I hit one myself this session:** `git grep -n "not\.toBeCallableWith" HEAD -- 'packages/*/test'` printed 0 lines, while the same pattern with `-- 'packages/*/test/*.tst.ts'` printed 86. A negative gate written with the first form would pass forever.

**How to avoid:** Every negative gate has a **positive twin measured on the base with the identical invocation** that returns a non-zero count (`_SHARED-CONTEXT.md:47`). Verify commands run under `bash -c '...'` or `/usr/bin/grep`; quote globs; `< /dev/null`; scope "this id no longer appears" to the lines the phase adds (`git diff <base> -U0 | grep '^+'`), not the whole tree.

**Phase to address:** every plan; the plan checker should reject a verify with no base measurement.

---

### P16: The decoder change (D4) is narrower than its doc and can regress behaviour (Phase 66)

**What goes wrong:** D4 makes `project` read only declared keys so an undeclared accessor is never invoked. Details that decide whether the claim is then true:
1. **`walked()` has the same defect.** `UntrustedDecode.ts:223-225` does `Object.entries(input).filter(([key]) => !unwalked.has(key))`, invoking every own enumerable getter, including undeclared ones, for seams with `unwalked` (hydration, audit envelope/row). Under `refuse` the guard and the strict decode read every key by design. So "an undeclared accessor is never invoked" is true only under `ignore`, and `ignore` with `unwalked` (the stored envelope, `SinkCodec`) still runs `walked` on the **projected** object, so it is fine; `refuse` with `unwalked` is not. The doc, the ADR-QD-170 D-19 sentence and the test must scope the claim to `ignore`, and a RED/pin must state what `refuse` + `unwalked` does.
2. **Read once.** Today the projection is a snapshot: each own enumerable value is read once into a new object and the guard and decode read that copy. A rewrite that reads a declared key twice (once for the guard's view, once for decode) lets a getter return different values to guard and decode. Read each declared key exactly once.
3. **Preserve "own and enumerable".** `Object.entries` sees own enumerable string keys only. `Reflect.get`/`in` read inherited keys (the same fail-open class Phase 53 closed with `Operand.ts`, ARCH-100); `Object.hasOwn` alone reads non-enumerable keys. Use `Object.keys` (own enumerable, invokes no getter), filter by the declared set, then read. A class instance with prototype getters must keep being dropped as before.
4. **`keysOf` takes `entries` (values included)** (`EnvelopeKeys.ts:65-83`: `entries.find(([key]) => key === TAG)?.[1]`), so its signature changes to read `_tag` only. `EnvelopeKeys.ts` is at 58/58 and its tests call it, so expect test edits and new mutants; keep it at no `Survived`/`NoCoverage`.
5. **Typing temptation.** Indexing an `unknown` object invites `Record<string, unknown>` or `as` (both forbidden; memory: "Record<string, unknown> is a hack"). Use a type predicate or monomorphic reads, not a widened type.
6. **RED first** on the base: an in-process object with an undeclared throwing getter, decoded under `"ignore"`, throws today (context). Add the stricter ones: a getter that counts calls (zero for undeclared, one for declared), and a declared accessor still decoded.
7. D2 (`HydrationEngine.ts` keeps `"refuse"`) is a records-only change: scan `git diff <base> -- packages/react/src` empty so no code edit sneaks in.

**Phase to address:** 66.

---

## Moderate Pitfalls

### M1: Behaviour-neutral phases must prove neutrality (Phases 65, 67, 68)
**What goes wrong:** "Behaviour unchanged" asserted, not shown. v1.0 and v1.2 lesson: characterisation tests land first and stay byte-identical (`RolesAndDepth.test.ts` unedited in Phase 59: `git diff 83cbd5c5 HEAD -- ...` empty). **Prevention:** each phase's scan lists its frozen files and runs `git diff <base> -- <files>` as a check; a changeset is absent exactly when the phase is neutral (67, 65, 68) and present when not (64, 66).

### M2: Records edited in many places, one forgotten (all phases)
**What goes wrong:** gate 13's count (`check-api-surface`, 939 at v1.6) moves if an export is added or removed; this milestone should add none. **Prevention:** assert the count is unchanged at each close; `AggregateError` is a global, not an export. A new `tsconfig` or package edit (§16) is not expected.

### M3: The v1.6 PR may be cut after Phase 63 (context, "Execution order")
**What goes wrong:** Phases 62 and 63 are the ones that protect v1.6; if the owner cuts the PR after 63, any dependency of 62/63 on 64+ breaks it. **Prevention:** keep 62 and 63 self-contained (no pin or probe that needs a 64-68 change); no changeset for either.

### M4: Zsh and the sandbox (executors)
**What goes wrong:** unquoted `$files` does not word-split (v1.5), so a fingerprint loop failed silently until it used `xargs`; ugrep alias. **Prevention:** `bash -c`, `/usr/bin/grep`, `xargs`, as `_SHARED-CONTEXT.md:43-47`.

### M5: Stryker's per-test coverage and titles
**What goes wrong:** renaming a test (58b, 61d) between a mutation base and its after-run is harmless for a fresh run, but a base file that records killed-by test names would not match. **Prevention:** the Phase 61 files key on mutant text only (`keyOf`), so titles do not matter, but confirm the Phase 68 script is the same one; take its base after the rename if the keying differs. **[unverified]** for any newer script.

### M6: Reserved-id bookkeeping
**What goes wrong:** a phase that needs no ADR (an amendment suffices) leaves ADR number unused and must say so in its CCR row; ADR Document IDs must equal the file number (gate 10, `spec/decisions`). Phases 62 (ADR-QD-175), 67 (ADR-QD-180), 64 and 65 may land here. **Prevention:** decide at plan time per phase and record "Unused: ADR-QD-NNN" in the CCR row; never write the placeholder form in source or titles.

---

## Minor Pitfalls

### m1: Over-width lines are not gated (AGENTS.md §17)
Re-wrapping (58a, 61c) is cosmetic; do not add a formatter or gate. Measured lines: `SinkCodec.ts:616` (137 chars), `decision-log.steps.test.ts:197` (135 chars), `DecisionLog.ts` has 5 lines over 100; locate by content, not line number (it moved).

### m2: Comment accuracy in files a phase rewrites
Phase 60 IN-01/IN-04: a doc pointing at a package-private type, a trust-boundary sentence missing from a sibling. Run the "who can see this name" check on any doc a phase touches.

### m3: Test timing under load
Phase 56-03 found a failure window of 20 ms that a `vi.waitFor` tick of 50 ms could miss. Avoid wall-clock windows in any new test; use turns or latches (v1.5 audit replaced a wall-clock ordering test with a latch).

---

## Phase-Specific Warnings

| Phase | Topic | Likely pitfall | Mitigation |
|-------|-------|----------------|------------|
| 62 | Pin classification | 86 is a raw count (81 code pins, 5 comments); flip result is not a classifier | Classify by return type; table with per-pin break record (P1) |
| 62 | New budget | `.tst.ts` excluded from `collect()`; per-line `strip` | Own walk; both directions; names + AGENTS table checks; prove it fails 4 ways (P4) |
| 62 | Characterisation file | It uses the token it forbids | Budget row with reason; titles cite INV/ADR, not D-NN (P13) |
| 63 | Gate 14 probes | Vacuous status, fixed-turn flake, source-derived guard, comment satisfies guard | Assert state that differs from initial; first read only; derive from packed install; require a call (P5) |
| 63 | `@ts-expect-error` | Satisfied by any error in the consumer | Code check in a minimal negative file (P2) |
| 64 | `notify` | Live Set semantics, falsy throws, AggregateError message mutant | RED per D1 case plus subscribe/unsubscribe during notify; assert message and identity (P6) |
| 64 | Feed lies after D1 | `readSource` between `begin()` and `fork()` | Decide scope of the publish guard without reopening D1 (P6.4) |
| 64 | Docs | Seven sites say "must not throw"; doc fixes create new overclaims | One commit, each sentence tied to a test, sweep (P6.5, P10) |
| 65 | Private ctor | Does not stop a structural literal | Add `declare private readonly` brand; pin both (P3) |
| 65 | Bench | Harness is Evaluate-only; any later source edit invalidates | Keep Phase 59 method; re-bench after executable edits (P7) |
| 66 | `project` / `walked` | Claim true only for `ignore`; double read; inherited/non-enumerable keys | Scope the claim; read once; `Object.keys` (P16) |
| 66 | Bench / mutation | `project` runs only on `ignore` seams; static module-scope code | Choose `ignore`-seam workloads; static evidence run (P7, P8) |
| 67 | Equivalent mutants | Restructure adds a defect path or new survivors | No throwing accessor; compare per file; bench `DecisionCache.bench.ts` (P8.6, P7.6) |
| 67 | Race test | Early exit loses safety coverage; per-budget observation | Both orderings per budget; fail loudly at the cap; time it (P9) |
| 68 | Re-wrap | Mutant ids keyed on line text | Fresh base after 67, then re-wrap, then compare (P8.2) |
| 68 | D3 amendment | Says "from the timeline feed"; code derives from the diagnostics reading | Write from `DockModel.ts:255-263`; compile it as a fence (P11) |
| 68 | 58b/61d proofs | Regex "comments-only" strip; a title is not a comment | Compiler-based diff; mask titles for 58b; new file in Phase 61 dir (P14, P12) |
| 62-68 | Close-out | Stale verification, `nyquist_compliant: false`, trailers | Re-verify 62 at 68; grep frontmatter and trailers at each close (P12) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Rewritten pin:** each has a single-variable positive control, and a recorded run where a deliberate break made it fail.
- [ ] **Budget:** it counted non-zero on the base for a `.tst.ts` file; adding, removing, commenting and line-splitting a pin each behaved as designed; AGENTS.md table and `[...-table]` check agree.
- [ ] **Gate 14:** the consumer source contains a *call* for each new name; deleting one probe fails the gate; no clock, no read-count assertion; guard enumerated the packed install.
- [ ] **`@ts-expect-error`/construction pin:** the code that satisfies it was observed and is the intended one.
- [ ] **`Admitted`:** private constructor and a brand; an object literal is rejected; the bare `admit` export works.
- [ ] **D1:** RED cases listed in the context all exist (L1 throws and L2 still called; two throw, `AggregateError` with both; none throw; unsubscribe during notify), plus falsy throw and identity; three characterisation files byte-identical to the base.
- [ ] **Bench:** the table of workloads is in the record, band and host load are stated, the last executable edit precedes the last bench.
- [ ] **Mutation:** per-file base measured on the right tree, compare printed `holds`, static evidence present for new `Ignored` mutants, post-review figure recorded.
- [ ] **Spec:** stale-name sweep clean, `spec-revise --check` clean, CCR row names unused ids, no bare "gate N".
- [ ] **Close:** `nyquist_compliant: true`, `requirements-completed` present in the closing SUMMARY, trailers checked, a re-verify planned for any phase whose covered files a later phase edits.
- [ ] **Titles:** no D-NN, D1-D5, `WX-0n` or phase numbers in shipped tests, comments or changesets (diff-scoped check run).

---

## Recovery Strategies

| Pitfall | Recovery cost | Recovery steps |
|---------|---------------|----------------|
| Vacuous pin found late (P1, P2) | LOW | Rewrite with a control, record the break; no source touched |
| Budget counted zero (P4) | LOW | Add the own-walk, re-baseline against HEAD, prove with the four runs |
| Bench invalidated by a later source edit (P7) | MEDIUM | Re-run 3 + 3 on the final tree (about 4 minutes per run, serial) |
| Mutation score fell (P8) | MEDIUM | Add a test at the new seam; never re-baseline (v1.2 lesson) |
| Spec contradiction found in review (P10) | LOW-MEDIUM | Fix the one sentence from the test, run the sweep, `spec-revise`, redo mutation if a comment in `src` moved |
| Stale verification at close (P12) | LOW | Re-run the verifier on that phase; do not edit its covered inputs |
| Characterisation file edited (P6, P14) | LOW | `git checkout <base> -- <file>`; move the test elsewhere |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention phase | Verification |
|---------|------------------|--------------|
| P1 vacuous rewritten pin | 62 (protocol for all) | Per-pin break table; characterisation file red if tstyche changes |
| P2 `@ts-expect-error` wrong reason | 62, 63, 65 | Observed diagnostic code recorded per directive |
| P3 private constructor not nominal | 65 | Literal not assignable pin; code 2673 pin |
| P4 budget drift or zero | 62 (also 63, 66) | Four proving runs; table check |
| P5 gate 14 probes | 63 | Removed-probe run fails; no clock; packed-install enumeration |
| P6 shared store change | 64 | Three characterisation files unedited (`git diff` empty); RED list; docs sweep |
| P7 bench regression | 65, 66, 67 | `analysis` last line `# gate: pass` per final tree; workload table |
| P8 mutation mechanics | 64-68 | `compare` prints holds; static evidence; post-review figure |
| P9 race test | 67 | Both orderings per budget; cap failure message; duration |
| P10 spec drift | all | Stale-name sweep, `spec-revise --check`, `spec:verify:strict` |
| P11 D3 derivation wrong | 68 | Amendment cites `DockModel.ts:255-263`; fence compiles |
| P12 stale verification, nyquist, trailers | all closes; 68 sweep | Frontmatter grep; `git log` trailer check; re-verify list |
| P13 plan-local ids | all; 68 | Diff-scoped grep clean |
| P14 comments-only proofs | 68 | Compiler-based diff recorded in a new Phase 61 file |
| P15 vacuous verifies | all plans | Base measurement for every negative gate |
| P16 decoder claim and reads | 66 | RED getter-count tests; claim scoped to `ignore`; `walked` noted |

---

## Open Questions for the Planner (factual, not reopening D1-D5)

1. **Phase 64 scope:** is the publish-between-`begin()`-and-`fork()` guard (audit item 60a's "try/finally") in or out? D1 as written leaves a feed that can claim `Reading` with nothing running (P6.4).
2. **Phase 62 gate shape:** count-only budget, or a per-pin marker so "positive control on every remaining pin" is machine-checked (P4.3)?
3. **Phase 66 bench workloads and band:** which `ignore`-seam workloads, and is the 10% band tight enough for a decode path (P7.2, P7.3)?
4. **Phase 68 D3 wording:** "timeline feed" should read "diagnostics feed's `reading`" (P11).
5. **Phase 68 `StoredEnvelope.test.ts` scope:** header and one title only, or all ten plan-local ids (P13)?

## Sources

- `.planning/phases/_WAVE12-CONTEXT.md`, `_SHARED-CONTEXT.md`; `AGENTS.md` sections 4, 5, 5a, 6, 7a, 10, 11, 15.
- `.planning/RETROSPECTIVE.md` (v1.0-v1.6 "What was inefficient", "Key lessons", "Top lessons").
- `.planning/milestones/v1.6-MILESTONE-AUDIT.md`, `v1.5-MILESTONE-AUDIT.md`.
- `.planning/milestones/v1.6-phases/QD-53..61/*-REVIEW-DISPOSITION.md`, `*-REVIEW*.md` (notably `QD-60/60-REVIEW.iter1.md:175-208`, `60-REVIEW.iter3.md:173-195`, `QD-59/59-REVIEW.iter3.md`), `QD-59/59-BENCH.md`, `QD-59/59-VERIFICATION.md`, `QD-59/bench/{ab.sh,analyze.mjs}`, `QD-61/61-mutation.mjs`, `QD-60/60-scan.mjs`, `QD-57/57-RESEARCH.md:543-590`, `QD-58/58-REVIEW-FIX.md:19`, `QD-56/56-0[4-6]-SUMMARY.md`.
- Repo source read this session: `scripts/check-house-style.mjs` (876-889, 946-965, 991, 1980-2010, 2098-2133), `scripts/check-package-install.mjs` (258-300, 395-425, 480-515, 586-610), `scripts/check-dod-table.mjs:212`, `scripts/spec-revise.mjs`, `packages/core/src/{Admission,UntrustedDecode,EnvelopeKeys,DecisionCache,SharedComputation}.ts`, `packages/core/test/{DecisionCache.test,DecisionCache.tst,PortAccess.tst,Decision.tst}.ts`, `packages/devtools/src/model/{ExternalStore,TimelineFeed,GatesFeed,DiagnosticsFeed,DiagnosticsStore,DockModel,PortCards}.ts`, `packages/devtools/test/model/DiagnosticsStore.tst.ts`, `packages/devtools/README.md:155-175`, `stryker.config.mjs`, `stryker.devtools.mjs`, `tsconfig.test.json`, `tstyche.json`.
- Probes: four small tstyche files in the session scratchpad (`.../scratchpad/pitfalls-probe/`, outside the repo, not committed); tstyche 7.2.5, TypeScript 6.0.3. Results quoted in P1, P2, P3. Not run: Stryker, `pnpm check`, `pnpm check:pr`, `next-id.mjs`, any bench.
