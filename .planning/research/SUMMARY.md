# Project Research Summary

**Project:** Qadi (Effect-native authorization library), milestone v1.7 "Arch Wave 12"
**Domain:** Tech-debt resolution in an existing Effect v4 monorepo (`@qadi/*`); no new features, no new public exports
**Researched:** 2026-11-20 (base `8b22bd66`, branch `arch-wave-12`)
**Confidence:** HIGH (repo facts read at file:line and most behaviours probed in throwaway files; unverified items are listed under Gaps)

Source of truth for locked decisions: `.planning/phases/_WAVE12-CONTEXT.md` (D1-D5 are not reopened here).

## Executive Summary

This milestone closes the 13 tech-debt items from the v1.6 audit in seven strictly serial phases (62-68). Nothing is added to the public API and no dependency, tool or version changes (STACK). The work is: make type pins able to fail (62), extend the packed-install gate to three missed public names (63), make a shared store call every listener (64), make `Admitted` unforgeable and single-sourced (65), make the untrusted-input projection read only declared keys (66), restructure two equivalent mutants and a magic race bound (67), and close out hygiene and recorded decisions (68). The experts' approach in this repo is already encoded in gates: exact-count budgets checked in both directions, RED-first tests, interleaved 3+3 benches, per-file Stryker compares, and spec records edited in the same change.

The most important research result is a root cause for Phase 62. The vacuous `not.toBeCallableWith` is not tstyche's matcher; it is `@effect/language-service`'s `floatingEffect` diagnostic on tstyche's synthesized bare call, and it affects only `Effect`/`Stream` subjects. Corrected counts: 81 code pins (86 raw greps include 5 comments); exactly 1 is vacuous today (`DecisionLog.tst.ts:30`), 12 are Effect-returning but already wrapped in `Params<F>`, 68 are honest. So Phase 62 is "fix the cause, rewrite one pin, control eleven, add a gate and a characterisation test", not an 81-pin rewrite. Other corrections that change requirement wording: D3's derivation comes from the diagnostics reading (not the timeline feed); a private constructor alone does not stop object-literal forgery of `Admitted`; the D4 claim ("reads no value") is true only for the projection under `ignore`; `DiagnosticsOptions` has no `schedule` option.

The dominant risk class is "a check that cannot fail": vacuous pins, `@ts-expect-error` satisfied for the wrong reason, a budget that scans zero files (`collect()` skips `.tst.ts`), a gate-14 probe that asserts the feed's initial state, a bench band wide enough to hide a decode regression, a mutation base taken on the wrong tree. Every phase must therefore show each new check failing once, with the identical invocation measured on the base. A second class is spec drift (renames and wording updated in one record only) and stale verification at close; both are handled by a last-task stale-name sweep and a planned re-verify of Phase 62 at Phase 68.

## Key Findings

### Recommended Stack (STACK.md)

No installs. Stay on installed versions. Two TypeScripts judge a `.tst.ts` (6.0.3 under tstyche, 7.0.2 tsgo under `pnpm typecheck`); a pin must hold under both.

**Core technologies (all existing):**
- tstyche 7.2.5 (target TS 6.0.3): type pins; `toBeCallableWith` counts any diagnostic, so a third-party plugin diagnostic poisons it.
- `@effect/language-service` 0.87.5: source of the `floatingEffect` diagnostic; configurable per tsconfig (`diagnosticSeverity`) or per file directive.
- Stryker 10.1.1 with `ignoreStatic: true`: "static" is decided by coverage (ran at import), not syntax; module-scope decoders are `Ignored`, so build decoders inside `it` bodies and take a static-credit evidence run from an out-of-repo config.
- Built-in `AggregateError` for D1 (available under both `lib` configs; new idiom here, no `throw` rule forbids it).
- `Match.tagsExhaustive` for the claim dispatch (an unmatched tag throws at runtime, verified on effect 4.1.2).

### Expected Features (FEATURES.md, each phase's observable done-state)

**Must have (milestone definition of done):**
- 62: honest pins (cause fixed or pins rewritten), characterisation `.tst.ts`, `NOT_CALLABLE_PIN_BUDGET` plus AGENTS.md section 6 paragraph and table check, positive controls for the 11 uncontrolled pins.
- 63: three probes (gates feed, diagnostics feed, typed host cache) and a derived `make*Feed` guard; deterministic; a removed probe fails the gate.
- 64: every listener called; one error rethrown as-is, several as one `AggregateError`; all "not isolated / must not throw" texts amended.
- 65: 59a derivation of `supplied` from the matcher context, 59b private constructor plus static `admit`, `@ts-expect-error` pin, 3+3 bench gate.
- 66: `project` reads only declared keys (D4), hydration stays `refuse` with an ADR amendment (D2), bench and mutation held.
- 67: two equivalent mutants restructured (D5), race loop without a magic bound.
- 68: five close-outs recorded (58a, 58b, 61c, 61d, I-b/D3), two of them settled as no-edit confirmations.

**Should have (in-phase if cheap):** a private instance member on `Admitted`; a margin past the first flip in Phase 67's loop; a real-feed test for D1 through the dock's subscriber; a re-runnable 61d proof recipe.

**Defer:** upstream tstyche or language-service issue (owner OK required); any width gate or `oxfmt` in `pnpm check`; making `portCards` public; aligning `@qadi/react`'s swallowing registry with D1; releases.

### Architecture Approach (ARCHITECTURE.md)

`pnpm check` is the single definition of done; each phase plugs into one or two gates plus the same spec registers (CCR, INV, traceability, ADR index, BEH, `spec-revise`). Source touched is tiny: tests and scripts only for 62-63; `ExternalStore.ts` (13 importers) for 64; `Admission.ts` for 65; `UntrustedDecode.ts` plus `EnvelopeKeys.ts` for 66; `DecisionCache.ts` and `SharedComputation.ts` for 67; a handful of lines and records for 68. Reuse the v1.6 harnesses (`61-mutation.mjs`, Phase 59 `ab.sh`/`analyze.mjs`), copied into each phase dir.

**Major components:**
1. House-style gate (`scripts/check-house-style.mjs`): budgets with exact counts in both directions; `collect()` excludes `.tst.ts`, so Phase 62 needs its own walk (precedents: `[no-numbering-placeholder]`, `[metric-id-literal]`).
2. Gate 14 (`scripts/check-package-install.mjs`): packs, installs offline, compiles and runs one consumer `FIXTURE` template literal (escape backticks and `${`).
3. Mutation and bench harnesses: per-file Stryker compare; 3+3 interleaved bench, median of per-run minima, band `max(10%, base spread)`.
4. Spec registers: all seven phases edit the same ones, which is why execution is strictly serial and records go in each phase's last plan.

### Critical Pitfalls (PITFALLS.md, top five of sixteen)

1. **A rewritten pin is vacuous in its new form (P1/P2).** Classify by subject return type, never by the flip probe. Every remaining negative gets a single-variable positive control and a recorded hand-break. A bare `@ts-expect-error` passes on any error (typecheck's tsc does not read its message).
2. **A budget that counts zero (P4).** `.tst.ts` is excluded from `collect()`. Count stripped code tokens (multi-line pins), both directions, unique AGENTS.md table header, table check. Prove it fails four ways (add, remove, comment, line-split).
3. **Gate-14 probes that assert the initial state or use a clock (P5).** Assert a value that differs from the feed's initial snapshot, use a bounded yield loop (no wall clock), enumerate exports from the packed install, require a call not a mention.
4. **Behaviour change in the shared store, or decoder claims wider than true (P6/P16).** Live `Set` iteration semantics, falsy throws (`throw undefined`), reference-equal single rethrow, nested `AggregateError` via `TimelineFeed`. The "no undeclared accessor read" claim holds only under `ignore` (`walked()` and `exceedsJsonDepth` still read under `refuse`); read each declared key once.
5. **Hot-path and mutation evidence that can be invalidated (P7/P8).** The bench harness is Evaluate-specific; any executable edit after a bench invalidates it; Stryker ids key on line text; take Phase 68's base on the post-67 tree before the first re-wrap; new static-ignored mutants need an `ignoreStatic:false` evidence run.

Also standing: spec drift (P10); stale verification, `nyquist_compliant` and trailers at every close (P12); plan-local ids (D1-D5, D-NN, WX-0n) leaking into shipped titles (P13); vacuous verify commands (P15: every negative gate needs a positive twin on the base, use `/usr/bin/grep`, quote globs, `< /dev/null`).

## Implications for Roadmap

Keep the order 62 to 68. Dependencies: 62 first (later pins use corrected forms), 63 next (62+63 are the v1.6-protecting cut, so keep both free of any dependency on 64-68 and without changesets), 64-67 behaviour phases run serially (65 and 66 each own a bench), 68 last (re-wraps lines 64-67 can shift, and its records touch the same registers).

### Phase 62: Type pins that can fail (ARCH-109)
**Rationale:** Every later phase writes pins; the vacuity must be closed first. Tests and gate only; no changeset.
**Delivers:** characterisation `.tst.ts`; honest pins; `NOT_CALLABLE_PIN_BUDGET` with its own walk plus AGENTS.md section 6 table and `[not-callable-pin-table]` check; classification table in the phase dir; per-pin break record.
**Addresses:** FEATURES Phase 62 inventory (81 code pins, 27 files; 80 in 26 files if only `DecisionLog.tst.ts:30` is rewritten).
**Avoids:** P1, P2, P4, P13, P15.
**Recommendation (opinionated):** do both halves. (a) Fix the cause with a tstyche-only tsconfig (a child of `tsconfig.test.json` that restates the whole `plugins` entry with `floatingEffect: "off"`, wired via `tstyche.json`) rather than 27 per-file directives, because a global switch means a future file cannot be silently vacuous, whereas a missing header can. (b) Still rewrite `DecisionLog.tst.ts:30` through `Parameters<...>` (it states the reason), add controls to the 11 uncontrolled pins, and add the budget the context requires. The gate should also check that the two `diagnosticSeverity` blocks agree apart from `floatingEffect`. Build order: characterisation file, classification record, rewrites package by package, gate last (adding it first turns every intermediate commit red).

**Disagreements and open questions (which file says what):**
- **Mechanism.** STACK offers three compatible routes (tstyche-only tsconfig; per-file `// @effect-diagnostics effect/floatingEffect:off`; per-pin rewrite). It says the tsconfig fixes all 81 at once with 65/65 files green. FEATURES (F4, differentiator) agrees and adds that with the config on, the characterisation positive control already guards the config, making the budget less valuable. ARCHITECTURE verified the file-level directive, found the line-level `-next-line` form does NOT work (tstyche says "has no effect"), and frames the work as per-pin classification and rewrite. PITFALLS (P1) assumes per-pin rewrite and never mentions the config route. `_WAVE12-CONTEXT.md` calls for a budget gate and leaves mechanism open. Resolution above: config plus one rewrite plus budget.
- **Count-only budget vs per-pin marker.** ARCHITECTURE: count-only table copied from `UNTRUSTED_DECODE_BUDGET`, plus an optional mechanical check "positive `toBeCallableWith` count >= negative count per budgeted file". PITFALLS (P4.3): a count cannot check "plain-return subject with positive control"; use a reviewed reason column or a machine-readable marker comment, and do not claim the gate enforces what it only counts. FEATURES: count with a reasons table. Recommend count-only plus the positive>=negative check plus honest wording; a per-pin marker is optional, decide at plan time.
- **Characterisation file under the config route.** STACK: the known-wrong control can only be pinned in a file that restores the rule via `// @effect-diagnostics effect/floatingEffect:error`, and whether that directive overrides a project-level `off` is UNVERIFIED. FEATURES: under the config route the file instead asserts the positive form passes on `Effect` and `Stream`. Probe this first.
- **Replacement forms.** STACK: `@ts-expect-error <fragment>` on `void f(bad);` is reason-checked by tstyche (a wrong fragment fails); never write a bare Effect call (tsgo reports an unsuppressed TS377001). PITFALLS (P2): the directive message is "a comment, not a check" for `pnpm typecheck`'s tsc, so prefer `expect(f(bad)).type.toRaiseError(<code>)` with the observed code. Both hold, in different tools; use `toRaiseError` or a code check where the reason matters.
- **Pin counts.** STACK says "86 pins in 27 files" and could not reproduce the context's "81 fail when flipped". FEATURES, ARCHITECTURE and PITFALLS resolve it: 86 is a raw grep, 81 are code pins, and the flip probe is not a classifier. Use 81 and count stripped code only.
- STACK: `not.toBeConstructableWith` is reason-blind (a public constructor with wrong arity also passes); PITFALLS leaves "yieldable `Data.TaggedError` subject" unverified. Leave `Decision.tst.ts`'s 9 as they are and do not use it for Phase 65.
- A stray untracked `packages/core/test/ZzProbe1.tst.ts` (ARCHITECTURE, PITFALLS) belonged to a research probe; it was gone by the time research finished. Never commit such a file, and measure on HEAD.

### Phase 63: The packed-install gate probes every new public name (ARCH-110)
**Rationale:** Protects what v1.6 ships; script-only; DoD table unchanged; no changeset. Pair with 62 as the cut point.
**Delivers:** probes for `makeGatesFeed`, `makeDiagnosticsFeed`, and a typed host cache (wrap `decisionCacheLayer()`, delegate all three members `getOrCompute`/`size`/`clear`, plus a `@ts-expect-error` for the pre-0.13 `(question, compute)` shape); a derived guard that enumerates `make*Feed` names from the packed `@qadi/devtools` root and requires a call (not an import or comment) in the comment-stripped fixture.
**Avoids:** P5, P2 (wrong-reason directive), P15.
**Build order:** guard first (RED: two names unprobed), probes (GREEN), a recorded removed-probe failure, then records (ADR-QD-033 amendment, INV 371-372, CCR 454, one sentence each in AGENTS.md section 16 and the DoD step-14 paragraph). Any "gate 14" must name `scripts/check-package-install.mjs`. Note `check:fast` drops gate 14; `check:pr` runs it.
**Open questions (which file says what):**
- **Gates-feed assertion.** FEATURES: empty registry, assert `RegistryRead` `Read` with 0 instances and `AskedRead` `Unhanded`. ARCHITECTURE: `makeGatesFeed()` with no registry reads `Unwatched` (the initial value). PITFALLS (P5): hand it a registry and assert `Read`, ideally with one instance (count 1), since `Unwatched` is the initial value and asserting it is vacuous. Recommend a one-instance registry and assert `Read` with count 1.
- **Diagnostics wording.** All four agree the context's "immediate schedule" is wrong: there is no `schedule`, only `intervalMillis` (the first read happens at once). Mechanism differs mildly: ARCHITECTURE passes a large `intervalMillis` so one sample runs inside fixed yield turns; FEATURES and PITFALLS prefer a bounded "yield until condition, cap 200, then fail with observed state" loop over a fixed 20 turns. Prefer the bounded loop, close the scope so the 2000 ms default sleep is never awaited, assert a field only a completed first read sets, and add a pin that `schedule` is refused (PITFALLS). Whether 20 turns suffices is UNVERIFIED.
- **Host cache depth.** FEATURES evaluates twice and asserts `calls === 2` and a `hit`; ARCHITECTURE stops at compile plus delegation. Recommend running it (a type-only proof proves less).
- ADR-QD-176 only if the derived guard is treated as a new decision (ARCHITECTURE); otherwise "Unused" in the CCR row.
- Type-only names (`DecisionCacheShape`) have no runtime key, so the derived guard cannot cover them; the `tsc` run against the packed `.d.ts` is their guard (all files agree).

### Phase 64: One throwing listener cannot silence the rest (ARCH-111, D1)
**Rationale:** Touches the shared `ExternalStore` (13 importers), so it runs before 68's re-wrapping. `@qadi/devtools` patch changeset. The three dock `*.characterisation.test.tsx` files must pass unedited, enforced as an empty `git diff`.
**Delivers:** `ExternalStore.notify` calls every listener, collects thrown values in an array and decides by length (never "first error truthy"; `throw undefined` must work), rethrows one as-is (reference-equal) or several as `AggregateError` with a fixed asserted message; state assigned before notify (as today); RED tests in `ExternalStore.test.ts` plus one per feed through the public root; amended texts at `TimelineFeed.ts:57,66`, `DiagnosticsFeed.ts:97` (keep the poll-stop clause), `GatesFeed.ts:7-10,77`, `devtools/README.md:162-169`, and the BEH at `spec/behaviors/28-devtools-screens.md:2547-2548`; BEH-QD-636 area amendment, INV 373-374, CCR 455, ADR-QD-177 amending ADR-QD-173 or "Unused".
**Avoids:** P6, P8 (`ExternalStore.ts` is in the devtools mutation set, break 80, so the `AggregateError` message literal and `length` boundaries need asserts), P10, P13.
**Disagreements and open questions (which file says what):**
- **Is the publish-between-`begin()`-and-`fork()` guard (`TimelineFeed.ts:131-141`, the audit's "try/finally around the publish", `v1.6-MILESTONE-AUDIT.md:39`) in scope?** PITFALLS (P6.4): the audit reads it as part of 60a, the context lists only the `notify` fix, and a rethrow after the loop still escapes `status.set(READING)` before `fork`, so a restarted timeline can say `Reading` with nothing reading. It asks the planner to decide without reopening D1. FEATURES (F11) and ARCHITECTURE agree that the "status can be wrong" consequences survive D1 and the README must keep them in a weaker, accurate form. Recommendation: out of scope for this phase's code (D1 is locked as the `notify` fix), state that explicitly in the CCR row, and keep the narrowed README sentence. If the owner wants it, it is a scope addition needing its own RED test per feed.
- **Live iteration vs snapshot.** STACK: iterating the live `Set` keeps today's semantics (removed-before-turn not called, added-during-notify visited); a `[...listeners]` snapshot changes both, so decide and pin. ARCHITECTURE, FEATURES and PITFALLS all say keep live iteration. Recommend live; pin both subscribe-during and unsubscribe-during notify.
- **Website mirror.** PITFALLS lists `apps/website/src/content/docs/docs/packages/devtools.md:224-227` as mirroring the README, to be changed in the same commit. FEATURES and ARCHITECTURE grepped the same file and found no "must not throw / isolated" claim (line 169 is about a thunk). Re-grep before editing; do not touch `apps/website/dist/`.
- **Nested stores.** ARCHITECTURE: `TimelineFeed.ts:115-116` makes the outer notify's error a thrown value inside the inner notify, so a nested `AggregateError` can occur; decide and pin, do not flatten.
- React's behaviour on a snapshot error is UNVERIFIED (ARCHITECTURE); the dock characterisation tests are the evidence. A test asserting a message from a second throw in one notify may now see `AggregateError` (FEATURES, unverified, none identified).

### Phase 65: Only `admit` builds an `Admitted` (ARCH-112)
**Rationale:** Needs 62 (the construction pin must not be a raw negative callable form). Hot path, so it owns a bench. No changeset (`Admitted` is package-private, ADR-QD-099).
**Delivers:**
- 59a: `supplied` for `asked` derived from the built matcher context (`ctx.action/resource !== undefined`). `row` stays constant `true` (ARCHITECTURE: `toPredicate` builds its question with `resource: undefined` on purpose, so it cannot derive). Table shape kept so a new row source still fails to compile.
- 59b: `private constructor`, static `admit` that names `Admitted` and never `this`, `export const admit = Admitted.admit`. STACK probed this: no TS2883, the generic survives, `Walk.ts:878` and `Predicate.ts:664` are unchanged, and the `ADMISSION_ALLOWED` count stays 1.
- Pins: a `@ts-expect-error` construction and an object-literal-not-assignable pin; the `keyof Admitted` pin stays green.
- Bench 3+3, slower 0 of 35. ADR-QD-172 amendment (its text that "asked flags are pinned by tests" becomes false), INV 375-376, CCR 456.
**Avoids:** P3, P7, P2, M1.
**Disagreements and open questions (which file says what):**
- **Brand.** FEATURES (F8) and PITFALLS (P3) probed that a private constructor alone still lets an object literal type-check as `Admitted`; a private instance member (`declare private readonly ...`) fixes it. ARCHITECTURE does not mention it, and FEATURES marks `declare` under this repo's tsconfig as unverified. Recommend adding the brand (the context already says "plus a private instance member"), confirming no code builds a literal, and checking the `keyof` pins are unaffected (private members are excluded).
- **Pin form.** The context fixes `@ts-expect-error`. STACK probed `// @ts-expect-error is private and only accessible within the class declaration` on a correct-argument `new Admitted(...)` (passes when private, TS2578 when public) with a positive control on `admit`. Use a short fragment such as `is private`, because only the 6.0.3 wording was observed and tsgo's text is UNVERIFIED. PITFALLS prefers `toRaiseError(2673)` (robust even with bad arguments). Both are acceptable; the context's choice wins, and a code check can be added if a second pin is wanted.
- **59a RED feasibility is UNVERIFIED** (ARCHITECTURE, PITFALLS). Behavioural agreement already holds (E1-E5), so a pure value test cannot be RED; an accessor-counting `Question.resource` is the only candidate. The compiler does not guard 59a (`SuppliedBy.asked` has `boolean` fields), so do not word the INV as a compile-time guarantee.
- Scope any grep or gate to `packages/core/src/Admission.ts`: `packages/audit/src/CircuitBreaker.ts:484` has an unrelated `new Admitted(...)`.
- `ab.sh` is hard-wired to `Evaluate.bench.ts`, which is correct for this phase. Use committed source, revert as a patch, record `uptime`.

### Phase 66: The decoder reads only what it declares; hydration's policy recorded (ARCH-113, D2, D4)
**Rationale:** Needs 62; owns a bench; core patch changeset (an in-process accessor is no longer invoked). `HydrationEngine.ts` keeps `unknownKeys: "refuse"` (D2): records only, with `git diff -- packages/react/src` empty.
**Delivers:**
- `project` takes `Object.keys(input)` (names only, own enumerable), filters by the declared set, and reads each kept value exactly once.
- `keysOf` reads `_tag` instead of taking the entries array; change `UntrustedDecode.ts` and `EnvelopeKeys.ts` in one commit.
- RED tests in `UntrustedDecode.test.ts` and through both `ignore` seams, `sinkWire` (`SinkCodec.ts:501`) and `storedWire` (`SinkCodec.ts:603`). Build decoders inside `it` bodies.
- ADR-QD-170 amendment (D-19 wording scoped; D-09 resolved by the same-build, version-checked, strict-refusal reasoning), INV 377-378, CCR 457.
- `UNTRUSTED_DECODE_BUDGET` counts and the AGENTS.md section 7a table stay unchanged (no token moves).
**Avoids:** P16, P7 (bench the changed path), P8 (static-ignored mutants; `EnvelopeKeys.ts` 58/58, `UntrustedDecode.ts` 41/43 with two pre-existing survivors), P4, and no `Record<string, unknown>` or `as`.
**Disagreements and open questions (which file says what):**
- **Scope of the claim.** FEATURES states the done-state as "the doc claim ... is true after the change" and the ADR wording as "reads only declared keys". ARCHITECTURE and PITFALLS (P16.1) show it is true only under `ignore`: `walked()` (`Object.entries` when `unwalked` is non-empty) and `exceedsJsonDepth` (`Object.keys` then `value[key]`) still read every own getter under `refuse`. D4 as locked says `project` reads only declared keys, so there is no code widening. The ADR amendment and doc must scope the sentence to the projection under `ignore` and state what `refuse` plus `unwalked` does, or they repeat the overclaim one level down. Do not widen the code change without the owner.
- **Bench workloads.** ARCHITECTURE: add an `ignore` row to `UntrustedDecode.bench.ts` (105 lines, groups a-c); `ab.sh` is hard-wired to `Evaluate.bench.ts` and `analyze.mjs` refuses input missing two Evaluate keys, so parameterise a copy or interleave manually. FEATURES: run `UntrustedDecode.bench.ts` and `SinkCodec.bench.ts` before and after. PITFALLS (P7.2-7.3): the policy decoder group does not exercise `project`, so pick `decodeSinkRecord`/stored-envelope workloads and say which before running; a 10% band can hide a real 8% decode regression, so fix a tighter band or a geomean limit before the result is known. Recommend `ignore`-seam workloads only (the two `SinkCodec` seams) plus the new micro-bench row, with the tighter band decided up front.
- **Hydration pin.** ARCHITECTURE: UNVERIFIED whether a test already pins "unknown top-level key in the hydration payload is `MalformedPayload`" (BEH-QD-488 area, `behaviors/19-hydration.md`). If none exists, add a characterisation test so the recorded D2 decision has a pin.
- Whether a declared getter is read once today is UNVERIFIED (FEATURES); measure before stating the requirement. Do not edit `StoredEnvelope.test.ts` (pinned characterisation).
- Static evidence run: `ignoreStatic: false` with a config kept outside the repo (STACK, PITFALLS); never edit `stryker.config.mjs`.

### Phase 67: No equivalent mutants, no magic race bound (ARCH-114, D5)
**Rationale:** Behaviour-neutral (no changeset); needs 62 for ordering only. Holds Phase 61 scores: `DecisionCache.ts` 0.977, `SharedComputation.ts` 0.986, `Lifecycle.ts` 1.000, zero survivors on the two named mutants, no `// Stryker disable` (D5).
**Delivers:** eviction restructured so no impossible-empty branch exists; claim dispatch closed so the `"Claimed"` tag matters; race loop replaced by "iterate until both orderings observed at every budget, cap 512, assert both seen". Records: CCR 458 (BEH 671-675, INV 379-380, ADR-QD-180 likely "Unused").
**Avoids:** P8.6, P8.7, P9, P7.6, P2.
**Disagreements and open questions (which file says what):**
- **Eviction form.** ARCHITECTURE probed a loop-free, guard-free form: `Chunk.splitAt(insertionOrder, HashMap.size(entries) - capacity)` clamps negative and oversize counts, then `HashMap.removeMany`. The `import * as Option` must go in the same commit. STACK suggests `NonEmptyChunk` with `Chunk.headNonEmpty`, or an `Option` combinator, and warns not to add `Chunk.isNonEmpty(...) &&` to the loop condition (that re-creates an equivalent mutant). PITFALLS warns against `Chunk.getUnsafe` or any throwing accessor in an authorization path (AGENTS.md section 4). Recommend the `splitAt` form: no throwing accessor and no impossible branch. Stryker was not run on any form (UNVERIFIED); the compare is the check. FIFO order and capacity validation must be unchanged.
- **Dispatch form and cost.** STACK: `Match.value(claimed).pipe(Match.tagsExhaustive(...))` per call (the matcher cannot be hoisted since `A`/`E` are generic in `run`), unbenchmarked. ARCHITECTURE: the owner arm is about 70 lines of `forkDetach`/`onExit`, so it must be extracted to a local function; alternatives are a `Match.type` hoisted per `makeSharedComputation` or an own-property arm table like `FieldLattice.ts`. FEATURES and PITFALLS: bench `DecisionCache.bench.ts` (3+3) before choosing `Match` over a closed `if`/narrowing, because AGENTS.md section 5a measured `Match.value` rebuilt per call at 3.5-7.7x a `switch`. PITFALLS: mutants of the other two tags (`"Hit"`, `"Joined"`) must also be killed. Recommend measure first; no new `switch` (not in `SWITCH_BUDGET`); keep the hit check inside the one synchronous claim step (ARCH-45 I5).
- **Race-loop coverage margin.** FEATURES (F12): today's sweep also runs gaps 39-48 and asserts no recompute and exact FIFO on every run, so stopping at the first flip loses that; require a margin past the flip (2-3 extra gaps) or keep the full per-run assertions. ARCHITECTURE: prove the weaker loop still catches I5 by temporarily splitting the hit check from the claim (pre-I5 shape), confirming RED, then restoring; keep a bounded tail if the probe shows red needs it. PITFALLS (P9): both orderings per budget (not overall); fail loudly at the cap naming budget and counts; measure runtime (up to 2048 iterations vs 192 today, and Stryker runs this test for many mutants with `timeoutMS: 20000`); re-check kills under per-test coverage; delete the `:1248-1249` "re-measure" comment. Recommend all of these together, with the revert-the-fix probe as the acceptance test.

### Phase 68: Hygiene and recorded close-outs (ARCH-115)
**Rationale:** Last, because it re-wraps lines 64-67 could shift and edits the same spec registers. No changeset, no behaviour change. CCR 459 records unused ids and the no-op confirmations.
**Delivers:**
- 58a: re-wrap `SinkCodec.ts:616` (137 chars), `decision-log.steps.test.ts:197` (135), and the `DecisionLog.ts` IN-02 line (likely `:220`, 108 chars, an inference; locate by content from `58-REVIEW.md` IN-02).
- 58b: `Source.test.ts:291` "never stamped" to "never given a label", plus the `StoredEnvelope.test.ts` header (lines 1-14) and the `:228` "RED on the base" title.
- 61c: re-wrap `spec/decisions/174-...md` line 73 (189 chars) with `spec:revise`.
- 61d: the comments-only proof.
- I-b/D3: ADR-QD-173 amendment, no export (`pnpm spec:api` 939 unchanged, `git diff -- packages/devtools/src/index.ts` empty).
**Avoids:** P8.1-8.2, P10, P11, P12, P13, P14, m1.
**Settled (no edit):** the `ingest` doc already names the uncontained defect path (`DecisionLog.ts:126-129`, ADR-QD-171); `QadiAtoms.test.ts:570` is already clean; 61d is evidenced by `d0ca3df6` (two comment lines in `Simulator.test.tsx`). Record both as "confirmed, no edit".
**Disagreements and open questions (which file says what):**
- **`StoredEnvelope.test.ts` edit scope.** FEATURES: header and the one `describe` title only; the header must stop claiming no row reads the in-memory shape while N1-N4 do; the diff must be comments and titles only. ARCHITECTURE: reword prose only, keep every assertion. PITFALLS (P13): the file carries 10 plan-local ids (`STOR-01`, `D-01`, `D-12`, `STOR-02, D-05, D-07` in the header); decide explicitly between "header and one title" (the context's "one recorded edit") and all ten. Recommend the former, with the remainder named as remaining debt in the CCR.
- **Possibly stale `Source.test.ts:186,306`.** The audit and context name only `:291`. FEATURES asks the planner to decide whether `:306` ("becomes a stamped record") and `:186` ("stamping") are stale; ARCHITECTURE and PITFALLS do not mention them. PITFALLS (P14) found `never stamped` cited at `spec/behaviors/26-decision-stream.md:406` (an amendment quoting the old requirement, not the title) and `packages/core/test/SinkCodec.test.ts:2233` (a different test; keep its wording unless the owner wants it changed). Read `:186,306` in context before deciding. If they describe the same concept, change them; otherwise leave them, and say which in the CCR.
- **Proving 58b is not comments-only (PITFALLS P14).** A title is program text in a pinned characterisation file. Use a compiler-based comparison (`ts.transpileModule` with `removeComments: true`, mask the title strings, same test counts before and after), not a regex strip. 61d uses the same method, and the proof goes in a NEW file in the Phase 61 archive dir (editing a Phase 61 SUMMARY, PLAN or the archived `61-scan.mjs` stales its verification).
- **Mutation base.** FEATURES says re-wrapping is free because Phase 58's mutant ids are archived. STACK confirms this mechanically (no `--incremental` anywhere; ids are per-run). PITFALLS (P8) adds that the harness keys ids on line text and 64-67 will have moved the files, so take a fresh per-file `68-mutation-base.json` on the post-67 tree BEFORE the first re-wrap and compare scores per file. Take PITFALLS' version.
- **61c extent.** FEATURES: lines 75 (168) and 94 (129) of the same ADR are also long; decide whether "line 73" means those too. The 315-char Change History row at `:13` is a table row and exempt.
- **D3 wording.** Already corrected in the context (diagnostics reading, `isUnsampled` not exported, no "same view" promise). FEATURES (F10) and PITFALLS (P11) both say write from `DockModel.ts:255-263` and `PortCards.ts:28-34` and confirm the consumer-visible types (`WiringRead`, `PortActivity`, `PortCallLog`) are root exports (UNVERIFIED). If the amendment shows code, make it a `typescript` fence so `pnpm spec:examples` compiles it. FEATURES also recommends confirming the wording with the owner before writing.
- **Over-width scope.** Many more lines exceed 100 (SinkCodec 27, steps file 15, ADR-174 about 38) and AGENTS.md section 17 gates nothing; change only the named lines.

### Phase Ordering Rationale

- 62 first because every later phase writes pins; 62+63 together protect v1.6 and the PR may be cut after 63, so neither may depend on 64-68 or carry a changeset.
- 64-67 are independent in code but serial because they edit the same registers (`spec/README.md` at Rev 1.258, invariants, traceability, `index.yaml`), and 65 and 66 each own a bench that cannot run beside anything else. Put a phase's records in its last plan so a re-opened phase does not re-bump.
- 68 last: it re-wraps and records after the shifts, and also owns the milestone sweep of stale verification. Re-verify Phase 62 at least; its covered set (about 27 `.tst.ts` files plus `check-house-style.mjs` and AGENTS.md) is edited by 64, 65 and 66.
- Behaviour-neutral phases prove neutrality with frozen-file `git diff` checks (M1). A changeset is present exactly for 64 and 66, absent for 62, 63, 65, 67 and 68.
- Cross-cutting: never run `node scripts/next-id.mjs`; use only the reserved block; name unused ids "Unused: ..." in the CCR row; check trailers and `nyquist_compliant` at each close; no D1-D5, D-NN or phase numbers in shipped titles.

### Research Flags

Phases likely needing deeper research or probing during planning (`/gsd-plan-phase --research-phase <N>`):
- **Phase 62:** the unverified `effect/floatingEffect:error` override in a characterisation file, the tsconfig-vs-directive-vs-rewrite choice, and the gate shape (count-only vs marker). Probe before planning.
- **Phase 66:** bench workload and band selection for `ignore` seams, parameterising the Evaluate-specific harness, the scope of the claim under `walked()`/`exceedsJsonDepth`, and the hydration pin.
- **Phase 67:** `Match` per-call cost on the ask path (bench first), the eviction form under Stryker, and the revert-the-fix probe for the race loop.

Phases with standard patterns (skip research-phase):
- **Phase 63:** script-only; the fixture, probe and guard shapes are all specified, and only the gates-feed assertion value and the bounded-yield loop need deciding.
- **Phase 64:** one 3-line seam with 13 importers all enumerated; RED list fixed; only the scope question (publish guard) needs a planner decision.
- **Phase 65:** mechanics are probed (private constructor, static alias, declaration emit); only the 59a RED feasibility and the brand under this tsconfig need a quick check.
- **Phase 68:** every item re-located by content; the work is mechanical plus records; resolve the three scope questions at plan time.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Tool behaviours probed in throwaway files and source read. Unverified: `effect/floatingEffect:error` overriding a project `off`, tsgo's private-constructor wording, the Stryker effect of the restructures (not run), browser support for `AggregateError` (not targeted). |
| Features | HIGH | Per-pin inventory classified against a green tstyche run; counts corrected (81 vs 86). Unverified: whether 20 yield turns suffice for a diagnostics first read, `declare private readonly` under this tsconfig, declared-getter read-once today. |
| Architecture | HIGH | Every file:line read; probes for the floating-effect cause, directive forms, `Chunk.splitAt`/`HashMap.removeMany`. Unverified: React's behaviour on a thrown snapshot, 59a accessor-RED feasibility, the hydration unknown-key pin. |
| Pitfalls | HIGH for repo history and mechanics, MEDIUM for the four tstyche/TypeScript probes (run in a scratchpad project, not through `pnpm test:tstyche`). |

**Overall confidence:** HIGH. The four files do not contradict each other on any fact that blocks a phase; they differ on mechanisms and scopes, all listed above with a recommendation. The planner's genuine decisions are: Phase 62 mechanism and gate shape, Phase 64 publish-guard scope, Phase 66 band and claim scope, Phase 67 dispatch form and loop margin, and Phase 68 `StoredEnvelope`/`Source.test.ts` edit scope.

### Gaps to Address

- **tstyche `floatingEffect` override semantics (Phase 62):** probe `// @effect-diagnostics effect/floatingEffect:error` against a project-level `off` before writing the characterisation file.
- **tsgo wording of the private-constructor message (Phase 65):** use a short fragment and confirm under both TS 6.0.3 and 7.0.2.
- **Phase 64 website claim** (`devtools.md:224-227` per PITFALLS vs none per FEATURES/ARCHITECTURE): re-grep.
- **Phase 66 bench harness:** parameterise `ab.sh`/`analyze.mjs` for `ignore`-seam workloads and fix the band before measuring.
- **Phase 67 Stryker outcome** of the chosen eviction and dispatch forms: only the real per-file compare settles it.
- **Phase 68 D3 types exportability** (`WiringRead`, `PortActivity`, `PortCallLog`): check root exports before writing any fence.
- **Process:** Stryker never beside vitest, `< /dev/null` on everything, serialise Stryker steps across plans; `grep` is aliased so use `/usr/bin/grep`; never commit a stray probe file.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md` (this milestone, 2026-11-20), and `.planning/phases/_WAVE12-CONTEXT.md`, `_SHARED-CONTEXT.md`.
- Installed source: `node_modules/tstyche/dist/api.js` (ability, suppression and matcher layers), `@effect/language-service` README (diagnostic directives), `@stryker-mutator/core` (incremental differ, test planner, coverage), effect 4.1.2 (`Chunk`, `HashMap`, `Match`).
- Repo: `scripts/check-house-style.mjs`, `scripts/check-package-install.mjs`, `AGENTS.md` sections 4-7a, 10, 11, 15, 16, `packages/core/src/{Admission,UntrustedDecode,EnvelopeKeys,DecisionCache,SharedComputation}.ts`, `packages/devtools/src/model/{ExternalStore,TimelineFeed,GatesFeed,DiagnosticsFeed,DiagnosticsStore,DockModel,PortCards}.ts`.
- v1.6 archives: Phase 59 `59-BENCH.md` and `bench/`, Phase 61 `61-mutation.mjs`, Phase 57 `57-RESEARCH.md` (static-mutant pitfall), `v1.6-MILESTONE-AUDIT.md`, `RETROSPECTIVE.md`.

### Secondary (MEDIUM confidence)
- PITFALLS' four scratchpad tstyche probes (`toRaiseError` forms, private-constructor assignability, `Params<F>` on non-functions).

### Tertiary (LOW confidence)
- Items marked UNVERIFIED above. None blocks a phase, and each has a named probe.

---
*Research completed: 2026-11-20*
*Ready for roadmap: yes*
