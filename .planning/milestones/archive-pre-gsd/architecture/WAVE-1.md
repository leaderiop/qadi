# Wave 1: the 2026-10-02 review (ARCH-01 to ARCH-07)

> Moved verbatim out of `README.md`. The tracker README keeps the active wave.

## Implementation status (2026-10-04)

All seven plans are implemented, with every task ticked and every decision taken at its recommended default. They are merged on the local branch **`arch/integration`** (worktree `.claude/worktrees/agent-adb672833eb753a12`, HEAD `e0ee958`). It is not pushed and not merged into `main`.

On the integrated branch, typecheck, lint, circular, tstyche, coverage (run with `--testTimeout=60000`), BDD, every `spec:*` gate, `pnpm example`, `pnpm website` and `pnpm mutation` all passed. Mutation scores: core 93.32, devtools 96.96, predicate-sql 95.45, predicate-prisma 90.18, audit 86.92, http 97.97. CI has not run.

Renumbered at integration: CCR 153 (ARCH-01), 154 (07), 155 (04), 156 (05), 157/158 (03), 160 (06), 170 (02); ADR 077 (01), 078 (05), 079 (03), 080 (06), 081 (04), 090 (02).

Open items:
- **Post-merge cleanup: required, do not skip.** See "After `arch/integration` merges into `main`" below.
- The changesets were not audited beyond merging cleanly.
- `pnpm coverage` and Stryker dry runs time out at the default 5s in `FieldPath.test.ts` on this machine, on baseline too.
- ARCH-03's `better-sqlite3` build on the Ubuntu CI leg is unverified.
- Breaking changes need release notes: `@qadi/audit` (the CircuitBreaker subpath), `@qadi/react` (gate globals removed), `@qadi/predicate-prisma` (`compilePrismaWhere` takes a nullability declaration), `@qadi/http` (taxonomy exports moved), and `@qadi/core` (depth pre-check, `toPredicate` behavior).

## After `arch/integration` merges into `main`: remove the last worktree

This was requested by the user on 2026-10-05.

**Done on 2026-10-05 (about 14.3 GB freed).** Before removing anything, each branch was checked to be an ancestor of `arch/integration` with a clean tree, so their commits are still reachable from `arch/integration`.
- Removed 7 worktrees: `.claude/worktrees/agent-{a2280e0099273f00e, a27b027832b9075cf, a2d79f6d33bc64866, a3b97e26f18ad377b, a9caae1ba93a77470, ad49a8535f6b3536d, ae63f47f5db22b406}`.
- Deleted 10 branches: the matching `worktree-agent-*` branches, plus the orphan `worktree-agent-adb672833eb753a12` and `tmp/arch03`/`tmp/arch06`. Their tips, in case one is ever needed (`git branch <name> <sha>`): a2280→6d13e0b, a27b0→2feef10, a2d79→e3de213, a3b97→b960c1d, a9caa→ba69f5e, ad49a→be1cb8b, ae63f→b97e5ae, tmp/arch03→4e1c7b9, tmp/arch06→f26b010.

**Still to do, after the merge:** `.claude/worktrees/agent-adb672833eb753a12` (`arch/integration`, 1.6 GB) stays for now. ARCH-08…15 cite and probe it at `e0ee958`. Once it is merged into `main`:

1. `git merge-base --is-ancestor arch/integration main && echo ok` must print `ok`.
2. `git -C .claude/worktrees/agent-adb672833eb753a12 status --porcelain --untracked-files=all` must print nothing.
3. Run `git worktree remove .claude/worktrees/agent-adb672833eb753a12`, without `--force`.
4. Run `git branch -d arch/integration` (`-d`, not `-D`), then `git worktree prune`.
5. Re-point ARCH-08…15's `evidence_verified_at` from `e0ee958` to the merge commit, and re-run each plan's §1 probes against `main`.

## Plans

| ID | Plan | Review strength | Status | Tasks | Open decisions | Estimate |
| -- | ---- | --------------- | ------ | ----- | -------------- | -------- |
| [ARCH-01](ARCH-01-port-access-seam.md) | One seam for port access across `evaluate` and `toPredicate` | Strong | implemented | 13/13 | 6 (D-01-a…f) | L |
| [ARCH-02](ARCH-02-policy-fold-seam.md) | One stack-safe fold and one owner of per-tag facts for Policy, Matcher, and Explanation trees | Strong | implemented | 18/18 | 8 (D-02-a…h) | XL (L if minimal) |
| [ARCH-03](ARCH-03-predicate-dialect-rules.md) | Dialect-free leaf rules in core; sql and prisma become renderers; real-engine oracles | Strong | implemented | 12/12 | 8 (D-03-a…h) | XL |
| [ARCH-04](ARCH-04-http-error-taxonomy.md) | One per-tag description of the enforcement-error taxonomy; one alias for standing services | Worth exploring | implemented | 10/10 | 5 (D-04-a…e) | L |
| [ARCH-05](ARCH-05-hydration-module.md) | Hydration as one module; a shared `DecisionWire`; an honest seeded-decision type | Worth exploring | implemented | 11/11 | 5 (D-05-a…e) | XL (M if minimal) |
| [ARCH-06](ARCH-06-gate-registry-scope.md) | Gate registry owned by each atom set, not the process | Worth exploring | implemented | 11/11 | 5 (D-06-a…e) | L |
| [ARCH-07](ARCH-07-circuit-breaker-protocol.md) | Probe/claim/release sequencing moved inside the breaker | Speculative | implemented | 11/11 | 6 (D-07-a…f) | M |

**Totals:** 86 tasks and 43 open decisions.

## Defects found while planning

Verifying the review turned up real bugs, and most plans put a test-first fix
ahead of the refactor. Each fix is a task you can ship on its own:

| Plan · task | Defect | Blocked on |
| ----------- | ------ | ---------- |
| ARCH-01 · T1→T4 | `toPredicate` turns a throwing port into a defect, and calls ports that `evaluate` short-circuits past. This affects `anyOf`, `allOf` and `rules` alike: `evaluate` decides with 0 resolver calls while `toPredicate` fails after 1. | T1: nothing. T2–T4: D-01-a, D-01-b |
| ARCH-02 · T1→T14 | Stack overflows: `renderExplanation` at ~734 levels; native matcher recursion in `referencesAction`/`explain`/`evaluate`; eager child construction in `evaluateNode` (`Die(RangeError)` at `maxDepth: Infinity`); devtools `remedyEdits`/`sweepPlan` on in-memory policies. A cyclic policy hangs `policyDepth`. `toPredicate`'s error depends on child order. | T1–T4: nothing. Fixes: D-02-a/e/f/g/h |
| ARCH-03 · T1 | Prisma `Negate` emits plain `NOT`, which drops NULL rows (127/3000 mismatches on real Prisma 7.10). A filter mentioning `null` on a required column fails at query time. | D-03-c, D-03-e |
| ARCH-04 · T1 | The two routing shapes can disagree on a status code and no test notices. Leaving a `…Refused` schema out of the middleware's error list compiles. | nothing (characterization tests) |
| ARCH-05 · T4 | `hydrateDecisions` throws `TypeError` on a malformed envelope, contradicting BEH-QD-230. `rebuild` fabricates `policyTag: "AllOf"`. | D-05-a, D-05-c |
| ARCH-06 · T1 | Two hydrated roots overwrite each other's gate entries, so a mounted guard vanishes from the panel. Gates also leak across providers. | nothing (red tests) |
| ARCH-07 · T1, T3 | The probe claim is taken before the release guard, so an interrupt during staging doubles recovery time. An `Open`→`Open` failure re-announces the transition and restarts `openedAt`. | T1: nothing. T3: D-07-c |

**Startable now, no decision needed:**
- ARCH-01 T1
- ARCH-02 T1–T4
- ARCH-04 T1
- ARCH-05 T0
- ARCH-06 T1
- ARCH-07 T1, T2

## Claims the review got wrong

- **ARCH-07:** the suspected half-open wedge is refuted. A failed or defecting probe write reopens the breaker and re-probes correctly. The interruption comments in the code and in BEH-QD-251 are themselves partly wrong.
- **ARCH-02:** `requirementsOf` overflow is refuted for decoded policies, because of the 256-level decode cap, but holds for in-memory ones. INV-QD-037's "exactly when" fails in one direction, since short-circuiting can skip a too-deep branch.
- **ARCH-04:** `PermissionRegistry.ts` holds no copy of the taxonomy. Core already exports the alias as `SubjectSetServices`, and there are six spellings, not five.
- **ARCH-05:** the default hydration payload carries the real root tag. `"AllOf"` appears only when `trace` is absent, so ADR-QD-041, BEH-QD-152 and `HydrationWarning.ts` overstate it.
- **ARCH-06:** the registry contract is already tested without rendering. Only `useGate`'s wiring needs render tests. `subscribeGates` *does* have a real consumer, `examples/nextjs-newsroom/src/client/Dock.tsx:127`.

## Decision register

Each plan's §5 holds the full options and tradeoffs. "Rec." is the plan's
recommendation.

| ID | Question | Rec. | Status |
| -- | -------- | ---- | ------ |
| D-01-a | Where the port-access module lives | internal `core/src/PortAccess.ts`, out of the barrel | open |
| D-01-b | Does it also own evaluator preconditions (resource id, depth clamp, signature match)? | yes (BEH-QD-227 span ordering) | open |
| D-01-c | Spans/metrics for `toPredicate` | same spans, closed `qadi.interpreter` annotation, separate `qadi_predicate_port_calls_total` | open |
| D-01-d | Should translation stop where the evaluator stops? | yes: split into a pure compile step and an effectful run step | open |
| D-01-e | When `MissingAction` is raised under pruning | when the node is reached (INV-QD-011) | open |
| D-01-f | A home for the stop rule | internal `ShortCircuit.ts` used by both interpreters | open |
| D-02-a | Where the fold seam lives | generic internal `TreeFold.ts`, with `foldPolicy`/`foldExplanation`/`foldMatcher` adapters | open |
| D-02-b | Source of the tag list | derived via `Schema.toTaggedUnion("_tag").discriminants`, plus a tstyche test | open |
| D-02-c | Which tags carry `fields` | exhaustive `Match` `fieldsOf` | open |
| D-02-d | How devtools gets a fold | public `foldPolicy`/`foldMatcher`; a private copy for `Inspect` | open |
| D-02-e | Check nesting depth before evaluating | root `policyDepth` check, cached (breaking, benchmark-gated) | open |
| D-02-f | Count matcher nesting in depth | yes (breaking) | open |
| D-02-g | Eager child construction | `Effect.suspend` in `Not`/`Obliged`/`Labeled` arms and `translateNode` (benchmark-gated) | open |
| D-02-h | Cyclic policies | detect and throw in `foldTree` | open |
| D-03-a | One `PredicateNotRenderable` owned by core (reverses ticket 95 / ADR-QD-054 L87-91) | yes, with an ADR amendment and code `ACL018` | open |
| D-03-b | Identifier rule | unified in core: ASCII by default, opt-in `"UnicodeBmp"`, Prisma's reserved keys as data | open |
| D-03-c | Fix Prisma `NOT` first, on its own | yes (T1) | open |
| D-03-d | Real-engine oracles | PGlite + `node:sqlite` for sql; Prisma 7.10 + better-sqlite3 for prisma | open |
| D-03-e | Prisma nullability input | required nullable-columns declaration plus a `nullableFieldsOf` helper (breaking) | open |
| D-03-f | `maxInValues` ownership | core, default 1000, for both packages | open |
| D-03-g | Where the rules live | new `PredicateLiteral.ts` + `RenderablePredicate.ts` in core | open |
| D-03-h | Sqlite booleans | bind as 1/0 | open |
| D-04-a | Where the per-tag description lives | class in core `Errors.ts`; status/schema/projection in one http table | open |
| D-04-b | A core alias for standing services | `StandingEvaluationServices` (name TBD) in `Evaluate.ts` | open |
| D-04-c | What replaces `RequirePermissionLive`'s hand-written arms | one in-channel projection; HttpApi's encoder builds every response (amends ADR-QD-072) | open |
| D-04-d | Export migration | move classification to core without re-export; `HTTP_STATUS_BY_CLASS` replaces `DENIAL_STATUS` (breaking minor) | open |
| D-04-e | `SubjectExtractionFailed` in the table | yes | open |
| D-05-a | Seeded-decision representation | closed `ClientDecision` union in `@qadi/react` (fallback: honest root tag) | open |
| D-05-b | Seed registry location | owned by the atom set; delete `HydrationSeed.ts` | open |
| D-05-c | Payload compatibility | `version: 2` envelope; read v1 for one minor | open |
| D-05-d | Subject equality | core `subjectEquivalence` on `Equal.equals` | open |
| D-05-e | Tighten `DecisionWire` | tagged union, drop the `"denied"` sentinel, golden test (separable) | open |
| D-06-a | Registry owner | each atom set (`atoms.gates`); provider may be handed another | open |
| D-06-b | Breaking change | remove the five globals, add `makeGateRegistry`/`useGateInstances` (minor, marked Breaking) | open |
| D-06-c | Deprecated global shim | none | open |
| D-06-d | How hosts read guards | `atoms.gates.instances/subscribe` plus `useGateInstances()` | open |
| D-06-e | Duplicate guard ids | handle-returning `register`; rename collisions `id~n` and warn once | open |
| D-07-a | Breaker entry point | `withPermit(use)` via `acquireUseRelease` | open |
| D-07-b | What stays exported | `status` + entry point (breaks the `@qadi/audit/CircuitBreaker` subpath) | open |
| D-07-c | Failure on an already-Open breaker | no state change, no transition | open |
| D-07-d | Outcomes crossing half-open windows | generation-tagged permits | open |
| D-07-e | Caller interruption of a normal write | not a store failure; document and pin | open |
| D-07-f | Internal state shape | tagged `Closed \| Open \| HalfOpen` with `Match` | open |

## Cross-plan overlaps: sequence these

Every plan's frontmatter says `depends_on: []`, because none of them needs
another to *exist*. They do edit the same files, though:

| File(s) | Plans | Sequencing |
| ------- | ----- | ---------- |
| `core/src/Predicate.ts` (`translateNode`, `restrictsFields`, the compare region) | ARCH-01 T4/T9, ARCH-02 T9, ARCH-03 T4 | Land **ARCH-01 T9** (compile/run split) first. ARCH-02 T9 then makes the compile step stack-safe. ARCH-03 T4 adds new modules beside it and touches only the compare region. |
| `core/src/Evaluate.ts` | ARCH-01 T3, ARCH-02 T7/T13/T14, ARCH-04 T3 | ARCH-01 T3 before ARCH-02 T13/T14, because both touch the port and depth paths. ARCH-04 T3 is a type alias and can go any time. |
| `core/src/Errors.ts` / `QadiError` codes | ARCH-03 T4 (`ACL018`), ARCH-04 T2 (class table) | Either order. The second one rebases. |
| `core/src/SinkCodec.ts` | ARCH-05 T1/T9 | No conflict. |
| `react/src/QadiAtoms.ts`, `QadiProvider.tsx` | ARCH-05 T2/T5/T6/T7, ARCH-06 T3/T4, ARCH-04 T3 | Do **ARCH-05 T2** (extract `HydrationEngine.ts`) before ARCH-06 T3. Both add per-atom-set ownership, so agree on the shape once (D-05-b and D-06-a). |
| `packages/devtools/src/model/*` | ARCH-01 T6, ARCH-02 T15/T16, ARCH-06 T8 | Independent areas of devtools. |
| `spec/overview.md`, `spec/traceability.md`, CHANGELOG/changesets | all | Assign CCR/ADR numbers at merge time. |

Branch note: `ci/stryker-ignore-static` carries uncommitted ADR-QD-076
(`ignoreStatic`) work. ARCH-03 T8 waits for it to land on `main`, and ARCH-04
notes that module-level tables will be skipped by Stryker under it.

## Suggested order

1. **Defect wave, no refactor.** Run the "startable now" tasks, then the
   defect fixes once their small decisions are settled: ARCH-01 T1–T4,
   ARCH-07 T1–T4, ARCH-03 T1, ARCH-06 T1, and ARCH-05 T4 (with T0–T3).
2. **ARCH-01** in full. It is the smallest Strong candidate, and it fixes the
   shape of `Predicate.ts` that ARCH-02 and ARCH-03 build on.
3. **ARCH-02**. It is the largest recurring cost: every new Policy tag, and
   every stack-safety bug.
4. **ARCH-03**, after ADR-QD-076 lands.
5. **ARCH-04**, then **ARCH-05** and **ARCH-06** together, because both
   reshape `QadiAtoms`.
6. **ARCH-07** refactor half (T5–T9), only if D-07-a is taken. Its defect half
   is already done in step 1.


---

