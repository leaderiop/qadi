# Requirements: Qadi v1.7 Arch Wave 12

**Defined:** 2026-11-20
**Core Value:** An authorization decision is never wrong and never silent.

**Source:** the 13 tech-debt items of `.planning/milestones/v1.6-MILESTONE-AUDIT.md`. Owner decisions D1–D9, per-phase
evidence and reserved numbers are in `.planning/phases/_WAVE12-CONTEXT.md`; research is in `.planning/research/`.
Every phase runs on branch `arch-wave-12`, strictly serial.

## v1.7 Requirements

### Type pins that can fail (Phase 62, ARCH-109, tests + gate)

- [x] **PIN-01**: A characterisation `.tst.ts` pins tstyche's behaviour on this repo: with the Effect language service's
  `floatingEffect` diagnostic on, a negative `not.toBeCallableWith` on an `Effect`- or `Stream`-returning subject passes for
  valid arguments; under the tstyche configuration the phase adds, the same pin fails for valid arguments.
- [x] **PIN-02**: tstyche runs under a tsconfig that turns `floatingEffect` off (D6). Every `*.tst.ts` stays green, and a
  check fails if that tsconfig's Effect plugin settings drift from `tsconfig.base.json`'s apart from `floatingEffect`.
- [x] **PIN-03**: `DecisionLog.tst.ts:30` is rewritten so that it states its reason (`Parameters<…>` or an equivalent
  reason-checked form), and the rewrite is shown failing once when `environment` is made optional.
- [x] **PIN-04**: Each of the 11 negative pins without a positive control gets a single-variable positive control in its
  file, and a classification of all 81 code pins (subject, return type, control) is recorded in the phase directory.
- [x] **PIN-05**: `NOT_CALLABLE_PIN_BUDGET` in `scripts/check-house-style.mjs` counts negative callable pins per
  `*.tst.ts` file in comment- and string-stripped code with its own file walk, is checked in both directions, has an
  AGENTS.md §6 paragraph and table that the gate verifies, and is shown failing on an added pin, a removed pin, a
  commented pin and a line-split pin.

### The packed-install gate probes every new public name (Phase 63, ARCH-110, script)

- [ ] **PROBE-01**: Gate 14 (`scripts/check-package-install.mjs`) fails when any `make*Feed` runtime export of the packed
  `@qadi/devtools` root is not called in the consumer fixture (comments stripped); the guard is written first and shown
  RED on the phase base.
- [ ] **PROBE-02**: The fixture runs `makeGatesFeed` over a registry with one instance and asserts a read state that
  differs from the feed's initial snapshot.
- [ ] **PROBE-03**: The fixture runs `makeDiagnosticsFeed` and asserts a field only a completed first read sets, using a
  bounded yield loop (no wall clock) and a closed scope.
- [ ] **PROBE-04**: The fixture builds a typed host cache from the packed `DecisionCacheShape` that wraps
  `decisionCacheLayer()`, runs a decision twice through it and asserts a hit; a `@ts-expect-error` refuses the pre-0.13
  `(question, compute)` shape.
- [ ] **PROBE-05**: A deliberately removed probe is shown failing gate 14, and the DoD table is unchanged.

### One throwing listener cannot silence the rest (Phase 64, ARCH-111, devtools; D1, D7)

- [ ] **LSTN-01**: RED tests on the phase base: when one listener throws, a later listener is still called; when two
  throw, one `AggregateError` carrying both is thrown; a single error is rethrown as the same value (including
  `undefined`); with no throw, behaviour is unchanged; subscribe- and unsubscribe-during-notify keep today's live-iteration
  semantics.
- [ ] **LSTN-02**: `ExternalStore`'s notify calls every listener and then rethrows as LSTN-01 states; each of the three
  feeds is tested through `@qadi/devtools`' root.
- [ ] **LSTN-03**: Every text that says a listener must not throw or is not isolated (the three feeds' `subscribe` docs,
  the `GatesFeed` module doc, the devtools README, BEH text in `spec/behaviors/28-devtools-screens.md`) states the new
  contract, keeps an accurate caveat for the publish-before-fork window, which stays out of scope (D7).
- [ ] **LSTN-04**: The dock's `*.characterisation.test.tsx` files pass with an empty diff, and a `@qadi/devtools` patch
  changeset records the change.

### Only `admit` builds an `Admitted` (Phase 65, ARCH-112, core; bench-gated)

- [ ] **ADMT-01**: A `@ts-expect-error` pin shows `new Admitted(…)` refused outside the class and an object literal of the
  same shape not assignable to `Admitted`, each with a positive control on `admit`; both are RED on the phase base.
- [ ] **ADMT-02**: `Admitted` has a private constructor and a private instance member; `admit` is its static method,
  exported as `admit`, so `Walk.ts` and `Predicate.ts` call sites are unchanged.
- [ ] **ADMT-03**: The `"asked"` row's supplied flags are derived from the matcher context `admit` builds; the `"row"` row
  stays as it is, and E1–E5 and `LeafMatrix.test.ts` pass unedited.
- [ ] **ADMT-04**: A 3 + 3 interleaved benchmark of the committed source against the phase base, with Phase 59's harness
  and bands, shows no workload slower beyond its band.

### The decoder reads only what it declares (Phase 66, ARCH-113, core; D2, D4)

- [ ] **DECL-01**: A RED test on the phase base shows that decoding an in-process value with an undeclared throwing
  getter under `unknownKeys: "ignore"` invokes that getter, directly and through both `ignore` seams in `SinkCodec.ts`.
- [ ] **DECL-02**: The projection reads only own key names, then reads each declared key's value once (and the `_tag` its
  key selection needs); the RED tests turn green, and the doc and ADR-QD-170 D-19 wording are scoped to the projection
  under `ignore`, stating what `refuse` and `unwalked` still read.
- [ ] **DECL-03**: The hydration payload keeps `unknownKeys: "refuse"` (D2), pinned by a test that an unknown top-level key
  is refused (added if none exists), and an ADR-QD-170 amendment records why; `packages/react/src` is unchanged.
- [ ] **DECL-04**: A decode benchmark of the `ignore`-seam workloads, with its band fixed before measuring, shows no
  regression beyond that band; `UNTRUSTED_DECODE_BUDGET` is unchanged; a `@qadi/core` patch changeset records the change.

### No equivalent mutants, no magic race bound (Phase 67, ARCH-114, core; D5)

- [ ] **MUTE-01**: `DecisionCache.ts`'s eviction has no branch that cannot be taken, FIFO order and capacity validation are
  unchanged, and the former surviving mutant no longer exists or is killed.
- [ ] **MUTE-02**: `SharedComputation.ts`'s claim result is dispatched closed, so mutating any of its tags is killed; the
  form is chosen after a `DecisionCache.bench.ts` measurement, and no `switch` or `// Stryker disable` is added.
- [ ] **MUTE-03**: The I5 race test iterates until both orderings are observed at every budget, with a cap that fails
  loudly, a margin past the first flip, and no number tied to `walk`'s step count; it is shown RED with the I5 fix
  temporarily reverted.
- [ ] **MUTE-04**: The Stryker scores of `DecisionCache.ts`, `SharedComputation.ts` and `Lifecycle.ts` do not fall below
  Phase 61's (0.977, 0.986, 1.000), and both named survivors are gone.

### Hygiene and recorded close-outs (Phase 68, ARCH-115; D3, D8, D9)

- [ ] **HYGN-01**: The three over-width lines named by the v1.6 audit are hand-wrapped, with a per-file mutation base taken
  on the post-Phase-67 tree before the first edit and scores not falling.
- [ ] **HYGN-02**: All stale wording is fixed (D8): the 10 plan-local ids in `StoredEnvelope.test.ts` and the "stamp"
  wording in `Source.test.ts` where it means the same concept, proven by a compiler-based comparison to change only titles
  and comments.
- [ ] **HYGN-03**: ADR-QD-174 lines 73, 75 and 94 are re-wrapped in one `spec-revise` bump (D9).
- [ ] **HYGN-04**: An ADR-QD-173 amendment records that port cards stay package-private (D3) and that a headless consumer
  reads the diagnostics feed's reading; no export is added.
- [ ] **HYGN-05**: The two settled items are recorded with evidence and no source edit: the `DecisionLog` `ingest` doc
  already names the uncontained defect path, and `Simulator.test.tsx`'s Phase 61 diff (`d0ca3df6`) is comments only, in a
  new file in the Phase 61 archive directory.
- [ ] **HYGN-06**: The milestone's stale-verification sweep re-verifies Phase 62 at least, since Phases 64–66 edit files it
  covers.

### Every phase (cross-cutting)

- [ ] **WX-01**: `pnpm check:pr < /dev/null` is green at the end of each phase.
- [ ] **WX-02**: Each phase records its ADR (or names it "Unused" in its CCR row), its CCR row, and its BEH/INV/traceability
  changes, using only its reserved numbers. `node scripts/next-id.mjs` is never run.
- [ ] **WX-03**: `spec/overview.md` names every added export and drops every removed one (gate 13); this milestone expects
  none.
- [ ] **WX-04**: Nothing new is added from this list: `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`,
  ambient `console`/`process.env`/clock, `Record<string, unknown>`, `// Stryker disable`. A budget changes only together
  with its AGENTS.md table.
- [ ] **WX-05**: Coverage thresholds hold (core at least 95%, the others at least 90%). The Stryker score of touched files
  does not fall: recorded per phase in `NN-mutation-base.json`, measured with the same invocation at the phase base and
  at close; a drop is closed with a test, never re-baselined.
- [ ] **WX-06**: Every behaviour change is preceded by a characterisation or regression test written on the phase base:
  RED for a defect, green for preserved behaviour. Every new check is shown failing once.
- [ ] **WX-07**: No D-numbers, plan-local ids or phase numbers enter shipped source, test titles or BDD scenarios. Nothing
  is released or published, and no version-packages PR is merged.

## Future Requirements

- Guard the publish-between-`begin()`-and-`fork()` window in the devtools feeds (D7: out of scope here, recorded).
- Align `@qadi/react`'s gate registry, which swallows listener errors, with D1's rethrow contract.
- An upstream tstyche or Effect language-service issue for the `floatingEffect` interaction (needs the owner's OK to post).
- A width gate or `oxfmt` in `pnpm check` (AGENTS.md §17 keeps it out).

## Out of Scope

| Item | Reason |
|------|--------|
| Making `portCards` public | D3: port cards stay package-private |
| Hydration payload `unknownKeys: "ignore"` | D2: keeps `refuse` |
| Re-wrapping every over-width line | Only the audit's named lines (and D9's ADR siblings); AGENTS.md §17 gates nothing |
| Upgrading tstyche, TypeScript or any dependency | Research found a configuration fix; no version changes |
| Merge, release or publish | Standing instruction: release only when the user explicitly asks for "the release" |

## Traceability

Which phases cover which requirements. One row per ID (`phase.complete` cannot parse grouped rows or ranges).
The seven WX rows apply to every phase 62 to 68, so each phase's Requirements line in `ROADMAP.md` lists all seven.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIN-01 | Phase 62 | Complete |
| PIN-02 | Phase 62 | Complete |
| PIN-03 | Phase 62 | Complete |
| PIN-04 | Phase 62 | Complete |
| PIN-05 | Phase 62 | Complete |
| PROBE-01 | Phase 63 | Pending |
| PROBE-02 | Phase 63 | Pending |
| PROBE-03 | Phase 63 | Pending |
| PROBE-04 | Phase 63 | Pending |
| PROBE-05 | Phase 63 | Pending |
| LSTN-01 | Phase 64 | Pending |
| LSTN-02 | Phase 64 | Pending |
| LSTN-03 | Phase 64 | Pending |
| LSTN-04 | Phase 64 | Pending |
| ADMT-01 | Phase 65 | Pending |
| ADMT-02 | Phase 65 | Pending |
| ADMT-03 | Phase 65 | Pending |
| ADMT-04 | Phase 65 | Pending |
| DECL-01 | Phase 66 | Pending |
| DECL-02 | Phase 66 | Pending |
| DECL-03 | Phase 66 | Pending |
| DECL-04 | Phase 66 | Pending |
| MUTE-01 | Phase 67 | Pending |
| MUTE-02 | Phase 67 | Pending |
| MUTE-03 | Phase 67 | Pending |
| MUTE-04 | Phase 67 | Pending |
| HYGN-01 | Phase 68 | Pending |
| HYGN-02 | Phase 68 | Pending |
| HYGN-03 | Phase 68 | Pending |
| HYGN-04 | Phase 68 | Pending |
| HYGN-05 | Phase 68 | Pending |
| HYGN-06 | Phase 68 | Pending |
| WX-01 | All v1.7 phases | Pending |
| WX-02 | All v1.7 phases | Pending |
| WX-03 | All v1.7 phases | Pending |
| WX-04 | All v1.7 phases | Pending |
| WX-05 | All v1.7 phases | Pending |
| WX-06 | All v1.7 phases | Pending |
| WX-07 | All v1.7 phases | Pending |

**Coverage:**
- v1.7 requirements: 39 total (32 phase-specific + 7 cross-cutting)
- Mapped to phases: 39 (32 phase-specific, each to exactly one of Phases 62 to 68; 7 cross-cutting, each applying to all seven)
- Unmapped: 0

---
*Requirements defined: 2026-11-20*
*Last updated: 2026-11-20 after roadmap creation (traceability filled)*
