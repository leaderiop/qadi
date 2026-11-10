---
id: ARCH-14
title: One function owns how a decision result becomes what a gate renders, so the stale-allow rule lives once
strength: Worth exploring
status: implemented
evidence_verified_at: e0ee958
depends_on: [ARCH-05, ARCH-06]   # both implemented on arch/integration; this is their residual
blocks: []
adrs_touched:
  - ADR-QD-017 (amend: the rule's single home moves from `currentDecision` to `outcomeOf`; a failure's `previousSuccess` is named as the second stale-allow carrier)
  - ADR-QD-053 (amend, one sentence: `GateRenderState` is derived from the outcome union, not restated)
  - ADR-QD-080 (constraint: the registry stays per atom set; it records `outcome._tag`, never a decision)
  - ADR-QD-078 (constraint: `ClientDecision` stays the closed four-case union; `permits`/`isSeeded` stay its verdict reads)
  - ADR-QD-039 (constraint: seed precedence stays in `HydrationEngine.ts`, upstream of the read)
  - ADR-QD-014 (constraint, as reversed in CCR-QD-150: no `scheduleTask`/`defaultIdleTTL`, no new atom per question, `useAtomSuspense` stays the suspense mechanism)
  - ADR-QD-034 (constraint: `Match`, not `switch`; `SWITCH_BUDGET` untouched)
  - ADR-QD-025 (amend only if D-14-g = B: `@qadi/react` gains one scoped mutation gate)
  - ADR-QD-076 (constraint: `ignoreStatic: true` in any new Stryker config)
  - ADR-QD-037 (constraint: madge, type-only edges count)
  - ADR-QD-038 (constraint: changeset, fixed version group)
  - ADR-QD-NEXT (new: "A decision is read once, into a closed outcome")
packages: ["@qadi/react", "@qadi/example-nextjs", "apps/website (docs only)", "scripts (gates)"]
estimate: L   # complete path ≈ 3 days (T0–T12); minimal path (D-14-d=A, f=A, g=A) ≈ 1½ days (M)
---

# ARCH-14 — One function owns how a decision result becomes what a gate renders

## 1. Verified evidence (at `e0ee958`)

Re-checked on branch `arch/integration`, worktree
`W=/Users/mohammadalmechkor/Projects/Perso/qadi/.claude/worktrees/agent-adb672833eb753a12`,
`git log --oneline -1` = `e0ee958 Merge branch 'tmp/arch03' into arch/integration`.
Read-only: nothing under `W` was edited.

**How suspected claims were settled.** Two throwaway probes ran from the session
scratchpad, never the repo:

- `scratchpad/arch14-probe.mts` drives a **real** `makeQadiAtoms` decision atom in an
  `AtomRegistry` through every state it can reach, using an `AttributeResolver` whose
  calls park until the probe releases them with a value or an `AttributeResolveError`.
  It applies, to each state: `currentDecision` (imported from `src`), `renderStateOf`
  (imported from `src/useGate.ts`), a verbatim copy of `components.tsx`'s private
  `classify`, a verbatim copy of the example's `GateState` ladder, a verbatim copy of
  the published guide's `EditPanel` ladder, `AsyncResult.getOrElse`, and a prototype
  `outcomeOf` (below). Run with
  `cd $W/packages/core && NODE_OPTIONS="--conditions=bun" /Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/tsx <probe>.mts`.
- `scratchpad/arch14/DecisionOutcome.ts` is the prototype module, type-checked with
  `tsc -p scratchpad/arch14/tsconfig.json` (strict, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, `effect/*` mapped to `effect@4.0.0/dist/*.d.ts`,
  `@qadi/core` mapped to `$W/packages/core/src/index.ts`): **0 errors**. A negative copy
  (`Neg.ts`) with one `Match.tagsExhaustive` arm and one `$match` arm deleted fails with
  TS2345 and TS2741, so exhaustiveness is enforced by the compiler, not by convention.

Probe output (abridged; every row is a state a real decision atom reached, except the
two marked *constructed*):

| Scenario | `AsyncResult` | `currentDecision` | `classify` | `renderStateOf` | example copy | **guide ladder** | `getOrElse` | prototype `outcomeOf` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| no subject | `Initial+waiting` | undefined | Pending | Pending | Pending | Checking | undefined | Pending |
| first evaluation in flight | `Initial+waiting` | undefined | Pending | Pending | Pending | Checking | undefined | Pending |
| settled allow | `Success(Allow)` | Allow | Settled(Allow) | Allowed | Allowed | EDITOR | Allow | Allowed |
| re-check in flight after allow | `Success+waiting(Allow)` | undefined | Pending | Rechecking | Rechecking | **EDITOR** | **Allow** | Rechecking |
| re-check failed after allow | `Failure[prev=Allow]` | undefined | Failure | Failed | Failed | CouldNotCheck | **Allow** | Failed |
| re-check in flight after failure | `Failure+waiting[prev=Allow]` | undefined | Pending | Rechecking | Rechecking | CouldNotCheck | **Allow** | Rechecking |
| settled deny | `Success(Deny)` | Deny | Settled(Deny) | Denied | Denied | ReadOnly | Deny | Denied |
| subject cleared after deny | `Success+waiting(Deny)` | undefined | Pending | Rechecking | Rechecking | ReadOnly | Deny | Rechecking |
| seeded, no client subject | `Success(SeededAllow)` | SeededAllow | Settled(SeededAllow) | Allowed | Allowed | EDITOR | SeededAllow | Allowed |
| seeded, client answered (sync) | `Success(Allow)` | Allow | Settled(Allow) | Allowed | Allowed | EDITOR | Allow | Allowed |
| *constructed* `Initial(waiting)` | `Initial+waiting` | undefined | Pending | Pending | Pending | Checking | undefined | Pending |
| *constructed* `Failure+waiting[prev]` | `Failure+waiting[prev=Allow]` | undefined | Pending | Rechecking | Rechecking | CouldNotCheck | **Allow** | Rechecking |

`disagreements between outcomeOf projections and the three current readers: 0`.

### C1. ADR-QD-017 and AGENTS.md §13 name `currentDecision` as the single home of the rule — **CONFIRMED**

- `spec/decisions/017-stale-decisions-are-not-decisions.md:29-33`: "`currentDecision` is the
  single place that rule lives", with the body inline.
- AGENTS.md §13 (the "Read decisions through `currentDecision`" bullet) and
  `spec/overview.md:457-460` say the same, and `packages/react/README.md:45`.
- `spec/behaviors/09-react.md:121-125`: "A `waiting` result MUST be treated as not decided by
  every convenience API."

### C2. Three places read `.waiting` independently — **CONFIRMED** (and there are more)

In the library:
- `packages/react/src/QadiAtoms.ts:98-99`: `currentDecision = (result) => AsyncResult.isSuccess(result) && !result.waiting ? result.value : undefined`.
- `packages/react/src/components.tsx:89-98`: private `GateOutcome` (`Pending | Failure | Settled`)
  and `classify`: `if (AsyncResult.isInitial(result) || result.waiting) return { _tag: "Pending" }`.
  Its own comment (`:78-87`) says it exists *because* `currentDecision` collapses pending and
  failed, and calls itself "the one place that rule is written down for this package's
  components" — a second "one place".
- `packages/react/src/useGate.ts:36-41`: `renderStateOf` (`isInitial` → `Pending`,
  `waiting` → `Rechecking`, `isFailure` → `Failed`, else `permits` → `Allowed`/`Denied`).
- A fourth encoding, by delegation: `packages/react/src/hooks.ts:81`,
  `useAtomSuspense(atom, { suspendOnWaiting: true })`. `@effect/atom-react`'s
  `Hooks.ts:363,381` suspends when `_tag === "Initial" || (suspendOnWaiting && waiting)` and
  throws on `Failure` (`:420`).

Outside the library:
- `examples/nextjs-newsroom/src/client/Guards.tsx:37-58`: a hand copy of `renderStateOf`,
  "written out rather than imported because `useGate.ts` is deliberately out of the barrel",
  with an unreachable extra branch (`decision === undefined ? "Pending"`, `:54-55`: after
  `isInitial`, `waiting` and `isFailure` are excluded, `currentDecision` is never `undefined`).
- `examples/nextjs-newsroom/src/client/Invalidation.tsx:24-55` and `Divergent.tsx:39` read
  the raw result **on purpose**: one is the "naive vs safe" exhibit, the other records the
  raw tag sequence the e2e test pins (`e2e/ssr.spec.ts:188-191`,
  `"Success,Initial+waiting,Success"`). Both stay raw (§3).
- `@qadi/devtools` reads no `AsyncResult` (`grep` over `packages/devtools/src`: none). It
  restates the render-state vocabulary as open strings, `GATE_STATES`
  (`packages/devtools/src/model/Gates.ts:58-64`), because it does not depend on
  `@qadi/react` (ADR-QD-053 correction). Out of scope (§3).
- `GateWriter.ts`, `GateRegistry.ts`, `SeededDecision.ts`: no `AsyncResult` reads.
  `GateRenderState` is a restated literal union at `GateWriter.ts:43`.
- `HydrationEngine.ts:628,647,649` reads `isInitial`/`isSuccess` of the **computed** result to
  decide seed precedence and mismatch reporting. That is upstream of what a consumer reads
  (ADR-QD-039), not a consumer read, and stays (§3).

### C3. The three are three projections of one closed five-case union — **CONFIRMED**

Every reachable state maps to exactly one of `Pending | Rechecking | Allowed | Denied | Failed`,
and each existing reader is a lossy projection of it (probe, 0 disagreements):
`currentDecision` = `Allowed|Denied → decision`, else `undefined`; `classify` = `Pending|Rechecking → Pending`,
`Failed → Failure`, `Allowed|Denied → Settled`; `renderStateOf` = the tag itself. A seeded
decision is folded into `Allowed`/`Denied` by all three, which BEH-QD-149 requires ("a seeded
decision is a decision, not a pending state").

### C4. SUSPECTED: a live divergence between the readers — **REFUTED inside `@qadi/react`**

No state makes `Can`/`Cannot`, `useCan`/`useProjected` and the gate registry disagree,
including `Initial+waiting`, `Failure+waiting` and seeded results. Within one render
`classify` and `renderStateOf` read the same `result`
(`useGate.ts:71,75`; `components.tsx:142,157`), so they cannot observe different states.
The duplication is a locality and drift risk, not a present bug.

### C5. NEW DEFECT — the canonical "read the whole decision" example renders a stale allow — **CONFIRMED**

`spec/appendices/react-integration.md:179-208` (a ` ```tsx ` fence, so gate 9
`check-doc-examples.mjs` **compiles** it) and the website's
`apps/website/src/content/docs/docs/packages/react/hooks.md:42-66` (compiled by gate 22
`check-website-doc-examples.mjs`) both teach:

```tsx
if (AsyncResult.isInitial(result)) return <span>Checking…</span>;
if (AsyncResult.isFailure(result)) { return <span>Could not check your permissions. Try again.</span>; }
return permits(result.value) ? <Editor /> : <span>Read only</span>;
```

The probe's "guide ladder" column renders **the editor** for `Success+waiting(Allow)`, which is
the state after an invalidation and after the subject signs out
(`subject cleared after deny` shows the same path for a denial). That is exactly the
over-permission ADR-QD-017 exists to prevent, and the website's own table one screen up
(`hooks.md:35`) lists `Success, waiting: true` as "the previous decision". Both gates compile
it; nothing checks what it means. A consumer copying the documented pattern ships the bug.

### C6. NEW — a second stale-allow carrier the rule does not name: `Failure.previousSuccess` — **CONFIRMED**

`effect@4.0.0`'s `AsyncResult.Failure` carries `previousSuccess: Option<Success>`
(`dist/reactivity/AsyncResult.d.ts`; source `AsyncResult.ts:290-293`), and a decision atom
fills it: the probe's "re-check failed after allow" is `Failure[prev=Allow]`, **not waiting**.
`AsyncResult.value`/`getOrElse`/`getOrThrow` (`AsyncResult.ts:486-529`) return that previous
allow. `currentDecision` is safe (it requires `isSuccess`), but ADR-QD-017 and BEH-QD-066 speak
only of the `waiting` flag — the same blind spot INV-QD-028's note records for seeds
(`spec/invariants.md:994-998`: "an invariant about staleness that speaks only of the flag does
not reach a value that was never marked stale"). No code in the repo calls these accessors today
(`grep` across `packages`, `examples`, `spec`, `apps/website/src/content`: none), so this is a
latent vector, closed by giving consumers an outcome that has no field to carry it.

### C7. NEW — BEH-QD-066's state table is incomplete — **CONFIRMED**

`spec/behaviors/09-react.md:104-110` lists four states. A real decision atom never produces
`Initial` with `waiting: false`: "no subject" is `Effect.never` (`QadiAtoms.ts:360`), which reads
`Initial+waiting` (probe rows 1, 2). `Failure` with `waiting: true` and `Failure` with a
`previousSuccess` are reachable and unlisted.

### C8. NEW — the "re-checked MUST still suspend" requirement has no test — **CONFIRMED by grep, UNVERIFIED by mutation**

`spec/behaviors/09-react.md:324` (BEH-QD-068: "A decision being re-checked MUST still suspend") is enforced
only by `suspendOnWaiting: true` (`hooks.ts:81`). `grep -rn "suspendOnWaiting\|still suspend" packages/react/test`
finds only `AtomRegistry.getResult` uses in `QadiAtoms.test.ts:76` and
`v4-reactivity-smoke.test.ts`, none through the hook; the hook tests
(`hooks.test.tsx:260-363`, `edges.test.tsx:156-183`) cover `Initial` and `Failure` only. Flipping
the flag to `false` would very likely pass the suite. Verify by doing exactly that in T2.

### C9. Prototype API facts — **CONFIRMED** on `effect@4.0.0`

`Data.taggedEnum` with `$match`, `Match.type<AsyncResult<…>>().pipe(Match.tagsExhaustive({ Initial, Success, Failure }))`
and `Match.type<ClientDecision>()` all type-check (prototype, 0 errors) and run (probe).
`Match.valueTags` exists (`effect/src/Match.ts:437`).

### C10. Baseline — **CONFIRMED green, with a tooling caveat**

- `cd $W && $W/node_modules/.bin/vitest run packages/react` → **14 files, 260 tests passed**.
- The brief's command with the **main checkout's** vitest
  (`/Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/vitest`, v5.0.0) fails to load
  `test/HydrationEngine.test.ts` (`TypeError: Cannot read properties of undefined (reading 'config')`
  at its `@effect/vitest` `describe`): a two-copies-of-vitest mismatch, not a code defect. Use
  the worktree's own `$W/node_modules/.bin/vitest` for every verify command below.
- `node scripts/check-house-style.mjs` → `312 file(s) clean (4 declared switch(es))`.
- `node scripts/check-api-surface.mjs` → `771 export(s) documented across 9 package(s)`.
- `madge --circular --extensions ts,tsx packages/react/src` → no circular dependency.
- **Disk:** the machine had 118 MiB free during planning (`df -h`); a Stryker or Next build
  run in T11/T12 needs space freed first.

## 2. Goal and success criteria

Make one small **deep module**, `packages/react/src/DecisionOutcome.ts`, the only place a
`DecisionResult` is turned into an answer. Its **interface** is one closed union,
`DecisionOutcome = Pending | Rechecking | Allowed{decision} | Denied{decision} | Failed{cause}`,
and one total function, `outcomeOf(result)`. Everything the package renders or reports —
`Can`/`Cannot`, `useCan`, `useProjected`, the gate registry's render state, and the public
`currentDecision` — becomes a thin projection of that outcome. The **leverage** is that the
ADR-QD-017 rule, the INV-QD-006 rule ("failure is not denial"), and the seeded-is-decided rule
(BEH-QD-149) are each written once, in one file, and checked by the compiler for every surface.
The **locality** win is that "how does a re-check render?" has one answer and one test file, and
the outcome has no field through which a stale value (`waiting`'s value, or a failure's
`previousSuccess`) could leak. The **seam** stays where it is: `useAtomValue` hands a raw
`DecisionResult` to `useGate`; the only change is that `useGate` hands the outcome on.

Success criteria:

1. `DecisionOutcome.ts` exists, exports `DecisionOutcome` (type + constructors), `outcomeOf`,
   `currentDecision` and `DecisionResult`, and imports nothing local but `SeededDecision.ts`
   (`grep -n "from \"./" packages/react/src/DecisionOutcome.ts` → one line).
2. `grep -nE "\.waiting\b|AsyncResult\.(isSuccess|isFailure|isInitial)\(" packages/react/src`
   lists only `DecisionOutcome.ts` and `HydrationEngine.ts` (the latter's three seed-precedence
   reads), enforced by the house-style budget in T7 (D-14-f).
3. `renderStateOf` and `classify` no longer exist
   (`grep -rn "renderStateOf\|const classify" packages/react/src` → nothing).
4. `GateRenderState` is `DecisionOutcome["_tag"]`, pinned by a tstyche assertion.
5. `packages/react/test/DecisionOutcome.test.ts` covers every row of §1's table through real
   atoms, with **no rendering**, plus a fast-check property that no `waiting` or failed result
   ever yields `Allowed`, and that `currentDecision`, `permits` and the outcome agree.
6. The render-sequence regression net passes **unchanged**: `QadiProvider.test.tsx`,
   `GateRegistry.test.tsx`, `hooks.test.tsx`, `edges.test.tsx`, `HydrationRender.test.tsx`, and
   the newsroom e2e (`ssr.spec.ts`, including `"Success,Initial+waiting,Success"` and the
   `data-state` counts).
7. Neither published example renders a stale allow: the guide (§5 of
   `react-integration.md`) and the website `hooks.md` read through `outcomeOf`, and the doc-fence
   check (T8) fails on a raw `AsyncResult` state read in any compiled fence that imports
   `@qadi/react`.
8. `useDecisionSuspense` suspending during a re-check is pinned by a test that fails when
   `suspendOnWaiting` is flipped (T2).
9. `pnpm check` passes; if D-14-g = B, `stryker run stryker.react.mjs` scores ≥ 80% on
   `DecisionOutcome.ts`.

## 3. Non-goals

- **Changing what `useDecision`/`usePolicies` return.** They keep returning the raw
  `DecisionResult` (D-14-d option C rejected): ADR-QD-017 keeps raw access as the deliberate
  stale-while-revalidate opt-in, and `Divergent.tsx` records raw tags the e2e pins.
- **Seed precedence in `HydrationEngine.ts`** (`:617-659`). It decides which result the atom
  holds; this plan decides how a held result is read. Its three `AsyncResult` reads are a named
  budget entry, not a migration target.
- **A "Seeded" gate state.** ARCH-05 §3 deferred it; D-14-a explains why it does not belong in the
  outcome at all.
- **`@qadi/devtools`' `GATE_STATES`** stays an open string list (it must render states from a
  newer `@qadi/react` it does not depend on). No devtools source or `spec/devtools-spec/` wording
  changes, so gate 12 (`check-devtools-claims.mjs`) is untouched.
- **The `Invalidation.tsx`/`Divergent.tsx` exhibits.** They read raw on purpose and stay raw.
- **AGENTS.md §13's stale `effect/unstable/reactivity` spelling** (ARCH-06 §3 already parked it).
- **The one-frame subject-change window** ADR-QD-017's Consequences accept (a settled,
  non-`waiting` decision for the previous subject). No read function can see it.

## 4. Constraints

| Constraint | Consequence for this plan |
| --- | --- |
| AGENTS.md §1: submodule imports, `.ts` extensions, `import type` | `import * as Data from "effect/Data"`, `* as Match from "effect/Match"`, `* as Cause from "effect/Cause"`, `* as AsyncResult from "effect/reactivity/AsyncResult"`. Type-only imports of `Allow`/`Deny`/`EvaluationError` from `@qadi/core`. |
| AGENTS.md §5: `Effect.fn`; `UNTRACED_BUDGET` = 3 | `outcomeOf` is pure and synchronous, not effectful: no `Effect.fn`, no new `fnUntraced`. Budget untouched. |
| AGENTS.md §5a / ADR-QD-034: `Match`, not `switch`; `SWITCH_BUDGET` = 4; hoist `Match.type` | Both matchers (`AsyncResult` tags, `ClientDecision` tags) are built once at module scope. `Can`/`Cannot` dispatch with `DecisionOutcome.$match` (per render, not per policy node — the §5a carve-out for per-request translators applies). Zero new `switch`. |
| AGENTS.md §6: no `as`, `!`, `any`; memory: no `Record<string, unknown>` widening | The prototype needs none. The `Failed` case carries `Cause.Cause<EvaluationError>`, typed, not `unknown`. |
| AGENTS.md §9: barrels are `export *`, alphabetical | `export * from "./DecisionOutcome.ts"` goes first in `packages/react/src/index.ts` (`D` < `G`); house-style's `barrel-order` rule checks it. `useGate.ts`/`GateWriter.ts` stay out. |
| AGENTS.md §11/§12/§15 | Spec edits land with the code (T10). `spec/overview.md` names every new export (gate 13, `check-api-surface.mjs`). Doc fences stay compilable (gates 9 and 22). |
| AGENTS.md §13 (all bullets) | *No React state for decisions*: the outcome is computed from the atom value during render, never stored. *No new dependencies*. *Read decisions through one function*: the bullet is rewritten to name `outcomeOf` (T10). *Atoms keyed structurally*: untouched. *Test the graph, not the DOM*: `DecisionOutcome.test.ts` renders nothing. *A guard records render state, never a verdict* (ADR-QD-053): the registry receives `outcome._tag` only. *Instrumentation off means absent*: no change to `marked`/`useGateRegistration`. *No DOM API*: none added. |
| ADR-QD-014 as reversed (CCR-QD-150) | No new atom per question (one `Atom.readable` per question stays — ARCH-05 C-constraint), no registry options. `useDecisionSuspense` keeps `@effect/atom-react`'s `useAtomSuspense` (D-14-e). |
| ADR-QD-017 | Rechecking carries **no** decision; neither does `Pending`/`Failed`. Amended to name `outcomeOf` and `previousSuccess`. |
| ADR-QD-078 | `ClientDecision` stays `Allow | Deny | SeededAllow | SeededDeny`; `Allowed.decision: Allow | SeededAllow`, `Denied.decision: Deny | SeededDeny`, so `isSeeded` still answers seededness and `DeniedNode` still receives `Deny | SeededDeny`. |
| ADR-QD-053 / ADR-QD-080 | `GateRenderState` keeps its five members and spelling (the e2e counts `data-state` strings and devtools sorts them). The registry stays per atom set. |
| ADR-QD-037 (madge, gate 5) | `DecisionOutcome.ts` imports only `SeededDecision.ts` locally. `GateWriter.ts → DecisionOutcome.ts` (type) is safe; putting `DecisionResult` anywhere that imports `GateRegistry.ts` (e.g. leaving it in `QadiAtoms.ts`) would close a type-only cycle `GateWriter → … → QadiAtoms → GateRegistry → GateWriter`. |
| Coverage (AGENTS.md §10): react 90% | The new module is fully covered by its own test file. |
| Gate 11 (`check-dod-table.mjs`) | Only if D-14-g = B: a new `stryker run stryker.react.mjs` row is inserted after step 21, renumbering 22–24 → 23–25, and every "gate N" reference after 21 must name its command. |
| `SCHEMA_ERROR_BUDGET`, `ANY_BUDGET`, `HAS_CUSTOM_BUDGET` | Untouched. No new error class (an outcome is a value, not an error). |
| Memory: closed unions | `DecisionOutcome` is declared whole (`Data.TaggedEnum<{…five…}>`); `GateRenderState` is derived from it, never `old | "New"`. |

## 5. Decisions needed before work starts

### D-14-a — The outcome's case set
- **A (recommended):** five cases, `Pending | Rechecking | Allowed | Denied | Failed`, seeded
  decisions folded into `Allowed`/`Denied` (the decision inside says which, via `isSeeded`).
  Matches `GateRenderState` exactly, so the registry's vocabulary is the outcome's tag.
- **B:** seven cases, adding `SeededAllowed`/`SeededDenied`. Rejected as *wrong*, not as costly:
  a guard renders a seeded allow exactly as an evaluated one (BEH-QD-149), so seededness is a
  property of the **decision**, already answered by `isSeeded`. Splitting it into the outcome puts
  one fact in two places, and changes the `data-state` vocabulary the e2e counts pin.
- **C:** four cases, folding `Rechecking` into `Pending` (what `classify` does). Rejected:
  ADR-QD-053 and `GateWriter.ts:31-41` keep them apart for a reason the panel depends on.
- `status: decided (2026-10-05, A — recommended default)`

### D-14-b — What `Failed` carries
- **A (recommended):** `cause: Cause.Cause<EvaluationError>`, and nothing else — in particular
  not `previousSuccess` (C6). A consumer can log or `Cause.squash` it; the guide's "could not
  check" branch needs nothing more.
- **B:** `error: Option<EvaluationError>` (typed failure only). Loses defects/interruptions,
  which a caller showing an outage still wants to report.
- **C:** nothing. Minimal; forces a consumer who wants the error back to the raw result, which is
  the read this plan is removing.
- `status: decided (2026-10-05, A — recommended default)`

### D-14-c — Where the module and the moved names live
- **A (recommended):** new leaf `packages/react/src/DecisionOutcome.ts`, owning `DecisionResult`
  (moved from `QadiAtoms.ts:86`), `DecisionOutcome`, `outcomeOf` and `currentDecision` (moved
  from `QadiAtoms.ts:98`). `GateWriter.ts` declares
  `export type GateRenderState = DecisionOutcome["_tag"]`. Test imports of `currentDecision`/
  `DecisionResult` from `../src/QadiAtoms.ts` are repointed (replace, don't layer; no
  re-export shim).
- **B:** keep `DecisionResult`/`currentDecision` in `QadiAtoms.ts` and put the outcome there too.
  Creates the madge cycle in §4 the moment `GateWriter.ts` derives `GateRenderState`.
- **C:** put it in `SeededDecision.ts`. That module is about what a seed *is*; reading an
  `AsyncResult` is a different concern, and it would have to import `effect/reactivity`.
- `status: decided (2026-10-05, A — recommended default)`

### D-14-d — Public surface
- **A (recommended):** export `outcomeOf` and `DecisionOutcome` from the barrel. A consumer
  writes `outcomeOf(useDecision(p))` or maps `usePolicies`' record with it. The example's hand
  copy (`Guards.tsx:47-58`) and the guide's ladder both become one call.
- **B:** A plus a `useDecisionOutcome` hook. Fails the deletion test — deleting it costs each
  caller one function call, not re-derived logic — and widens the closed `GateKind` union for no
  new information. Shallow.
- **C:** change `useDecision` to return `DecisionOutcome`. Wrong: removes ADR-QD-017's deliberate
  raw opt-in and breaks `Divergent.tsx`'s raw-tag recording that `ssr.spec.ts:188-191` pins.
- `status: decided (2026-10-05, A — recommended default)`

### D-14-e — `useDecisionSuspense`
- **A (recommended):** keep `useAtomSuspense(atom, { suspendOnWaiting: true })` as the one
  sanctioned delegate (its suspend/throw/return partition is exactly
  `{Pending, Rechecking} / {Failed} / {Allowed, Denied}`, C2), document it as such in
  `DecisionOutcome.ts`, and pin it with T2's test.
- **B:** reimplement suspension over `outcomeOf`. Wrong: either a derived atom per question
  (breaks "one `Atom.readable` per question", ADR-QD-014/ARCH-05) or a hand-rolled suspense
  promise, which is what COMPAT-01's race came from (CCR-QD-150).
- `status: decided (2026-10-05, A — recommended default)`

### D-14-f — How "read once" is enforced
- **A:** convention plus the doc comment. What failed for ADR-QD-017's own guide example (C5).
- **B:** a house-style budget, `DECISION_READ_BUDGET`, over `packages/*/src`: exact counts of
  `.waiting`, `.previousSuccess` and `AsyncResult.(isSuccess|isFailure|isInitial|isNotInitial|isWaiting|value|getOrElse|getOrThrow|match|matchWithError|matchWithWaiting|toExit)(`
  per file — `DecisionOutcome.ts`: 2, `HydrationEngine.ts`: 3 — checked in both directions, the
  `SWITCH_BUDGET` discipline.
- **C (recommended):** B, plus a semantic pass in the two doc-fence gates: a compiled
  ` ```typescript `/` ```tsx ` fence that imports `@qadi/react` fails if it contains one of those
  reads, unless the fence carries a `// qadi:raw-decision-read — <reason>` line. Implemented once
  in `scripts/lib/raw-decision-read.mjs` and called from `check-doc-examples.mjs` (gate 9) and
  `check-website-doc-examples.mjs` (gate 22), so no new gate and no DoD-table change. This is the
  check that would have caught C5.
- `status: decided (2026-10-05, C — recommended default)`

### D-14-g — Mutation coverage of the new module
- **A:** none. ARCH-06 §3 and `stryker.config.mjs:12-15` keep `@qadi/react` out because it is
  "a thin binding over `effect/reactivity` plus render code".
- **B (recommended):** `stryker.react.mjs` scoped to `packages/react/src/DecisionOutcome.ts`
  only, `ignoreStatic: true` (ADR-QD-076), break 80. The exclusion's reason does not cover this
  file: it is pure decision logic with no render code, the same argument
  `stryker.devtools.mjs:13-18` makes for scoping to `src/model/`. Costs a DoD row (gate 11) and an
  ADR-QD-025-family note.
- `status: decided (2026-10-05, B — recommended default)`

### D-14-h — Names
- **A (recommended):** `DecisionOutcome` / `outcomeOf`. "Outcome" is already this package's word
  for it (`components.tsx:89`'s private `GateOutcome`), and it is not gate-specific — hook callers
  use it too.
- **B:** `GateOutcome` / `gateOutcomeOf`. Reads as registry-only.
- **C:** `DecisionState` / `readDecision`. "State" collides with `GateRenderState` and
  `AsyncResult`'s own state vocabulary.
- `status: decided (2026-10-05, A — recommended default)`

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `arch/integration`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. Branch from `arch/integration` (or from `main` once ARCH-01..07 merge). Free disk first (§1 C10).
  2. Run the commands in Verify; record counts in §10.
  3. `grep -l "packages/react/src" .planning/architecture/ARCH-*.md` and read any ARCH-08..15 plan
     that edits `useGate.ts`, `components.tsx`, `hooks.ts` or `QadiAtoms.ts`; sequence per §9.
- **Tests:** none.
- **Verify:** `$W/node_modules/.bin/vitest run packages/react` (expect 14 files / 260 tests);
  `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs`;
  `pnpm circular`.
- **Done when:** baseline numbers are logged.

### T1 — Fix the published stale-allow example (test-first defect fix, C5)
- **Status:** [x] done
- **Depends on:** — (uses only today's public API, so it ships alone, before any refactor)
- **Files:** `packages/react/test/hooks.test.tsx`; `spec/appendices/react-integration.md`
  (§5, `:179-208`); `apps/website/src/content/docs/docs/packages/react/hooks.md` (`:42-66`).
- **Steps:**
  1. In `hooks.test.tsx`, add `describe("the guide's read-the-whole-decision example")` with a
     local `EditPanel` component that is a **verbatim** copy of today's guide ladder.
  2. Drive it with the controlled-resolver pattern already at `hooks.test.tsx:482-548`: settle
     an allow, click invalidate, and while the resolver is held, assert the editor is **not** in
     the DOM and "Checking…" is. Run it: red (the editor stays).
  3. Rewrite the component to the corrected ladder, using only today's API:
     `const decision = currentDecision(result); if (decision !== undefined) return permits(decision) ? <Editor/> : <span>Read only</span>; if (AsyncResult.isFailure(result) && !result.waiting) return <span>Could not check…</span>; return <span>Checking…</span>;`
     Green.
  4. Copy the corrected component into both docs, keeping the "a failure is not a denial" comment
     and adding one line: "`currentDecision` first: a result being re-checked still holds the old
     answer."
  5. Add a second assertion: after a re-check **fails** following an allow (`Failure[prev=Allow]`),
     the corrected panel shows "Could not check", never the editor.
- **Tests:** two new `it`s, both written red-first against the verbatim old ladder.
- **Verify:** `$W/node_modules/.bin/vitest run packages/react/test/hooks.test.tsx`;
  `node scripts/check-doc-examples.mjs`; `node scripts/check-website-doc-examples.mjs`.
- **Done when:** both tests pass, both doc fences compile, and the old ladder is gone from both docs
  (`grep -n "return permits(result.value)" spec apps/website/src/content -r` → nothing).

### T2 — Pin "a re-check still suspends" through the hook (C8)
- **Status:** [x] done (deviated: React keeps a re-suspended boundary's old content in the DOM with `display: none`, so "Allow is not shown" asserts absent-or-hidden)
- **Depends on:** —
- **Files:** `packages/react/test/edges.test.tsx` (the `useDecisionSuspense` describe, `:156`).
- **Steps:**
  1. Add `it("suspends again while a settled decision is re-checked (ADR-QD-017)")`: a component
     under `<Suspense fallback="checking">` renders `useDecisionSuspense(standing)._tag`; settle an
     allow via the controlled resolver; invalidate; assert the fallback is shown and `Allow` is not;
     release with `"bad"`; assert `Deny`.
  2. Locally flip `suspendOnWaiting: true` to `false` in `hooks.ts:81`, confirm the test goes red,
     restore. Record the result in §10 (this settles C8's UNVERIFIED half).
- **Tests:** one new `it`.
- **Verify:** `$W/node_modules/.bin/vitest run packages/react/test/edges.test.tsx`.
- **Done when:** the test passes on the real code and failed with the flag flipped.

### T3 — Create `DecisionOutcome.ts` and its tests (the deep module)
- **Status:** [x] done (deviated: the atom-state table is one sequential `it` recording eight rows from one atom plus a seeded `it`, not `describe.each` — the rows are successive states of one atom; also a "carries a failure's cause, and nothing else" test)
- **Depends on:** D-14-a, D-14-b, D-14-c, D-14-h
- **Files:** `packages/react/src/DecisionOutcome.ts` (*new*);
  `packages/react/test/DecisionOutcome.test.ts` (*new*);
  `packages/react/test/DecisionOutcome.tst.ts` (*new*); `packages/react/src/index.ts`.
- **Steps:**
  1. Write the module from the prototype (`scratchpad/arch14/DecisionOutcome.ts`):
     - `export type DecisionResult = AsyncResult.AsyncResult<ClientDecision, EvaluationError>` (moved
       here; its doc comment moves with it from `QadiAtoms.ts:74-86`).
     - `export type DecisionOutcome = Data.TaggedEnum<{ Pending: {}; Rechecking: {}; Allowed: { readonly decision: Allow | SeededAllow }; Denied: { readonly decision: Deny | SeededDeny }; Failed: { readonly cause: Cause.Cause<EvaluationError> } }>`
       and `export const DecisionOutcome = Data.taggedEnum<DecisionOutcome>()`.
     - Module-scope singletons `PENDING`, `RECHECKING` (no per-render allocation for the common
       non-answers).
     - Module-scope `verdict = Match.type<ClientDecision>().pipe(Match.tagsExhaustive({ Allow, SeededAllow → Allowed; Deny, SeededDeny → Denied }))`
       and `settled = Match.type<DecisionResult>().pipe(Match.tagsExhaustive({ Initial → PENDING, Failure → Failed({ cause }), Success → verdict(value) }))`.
     - `export const outcomeOf = (result: DecisionResult): DecisionOutcome => AsyncResult.isInitial(result) ? PENDING : result.waiting ? RECHECKING : settled(result);`
       — the **only** `.waiting` read in the package. Order is the substance: `Initial` first (a
       first ask reads `Pending`, not `Rechecking`), `waiting` before `Failure` (ADR-QD-017).
     - `export const currentDecision = (result: DecisionResult): ClientDecision | undefined` as a
       projection: `Allowed | Denied → decision`, else `undefined`, via `DecisionOutcome.$match`.
  2. Doc comments, summary line first (AGENTS.md doc-comment shape): the module comment states the
     three rules it owns (ADR-QD-017 stale, INV-QD-006 failure-is-not-denial, BEH-QD-149
     seeded-is-decided), names `previousSuccess` as deliberately unreachable (C6), and names
     `useDecisionSuspense`'s `suspendOnWaiting: true` as the one sanctioned delegate (D-14-e).
  3. `packages/react/src/index.ts`: add `export * from "./DecisionOutcome.ts";` as the first line.
  4. Remove `DecisionResult` and `currentDecision` from `QadiAtoms.ts` (`:74-99`); import the type
     from `./DecisionOutcome.ts`. Repoint test imports: `HydrationPayload.test.ts`,
     `Hydration.test.ts`, `Hydration.tst.ts`, `HydrationCounts.test.ts`, `hooks.test.tsx`,
     `v4-reactivity-smoke.test.ts` (whichever import from `../src/QadiAtoms.ts`; those importing the
     barrel need nothing). Also `src/hooks.ts`, `src/useGate.ts` imports.
  5. `DecisionOutcome.test.ts` (no rendering, `AtomRegistry` only), reusing the probe's controlled
     resolver:
     - `it("reads every state a decision atom reaches")`: a `describe.each` over the ten real rows of
       §1's table, asserting `outcomeOf(...)._tag` and, for `Allowed`/`Denied`, the decision's
       `_tag`.
     - `it("never reads a waiting result as an answer")` and
       `it("never reads a failure's previous success")`: fast-check over generated
       `AsyncResult<ClientDecision, EvaluationError>` — `Initial(w)`, `Success(d, w)`,
       `Failure(cause, previous?, w)` with `d` drawn from built `Allow`/`Deny`/`SeededAllow`/`SeededDeny`
       values — asserting: `waiting ⇒ tag ∈ {Pending, Rechecking}`; `Initial ⇒ Pending`;
       `Failure ∧ ¬waiting ⇒ Failed`; the outcome object's own keys never include `previousSuccess`
       or `value`.
     - `it("agrees with currentDecision and permits")`: same arbitrary;
       `currentDecision(r) !== undefined ⇔ tag ∈ {Allowed, Denied}`, the same decision object, and
       `tag === "Allowed" ⇔ permits(decision)`.
     - `it("returns one shared value for the two non-answers")`: `outcomeOf(initial) === outcomeOf(initial(true))`.
  6. `DecisionOutcome.tst.ts`: `Allowed["decision"]` is `Allow | SeededAllow`; `Denied["decision"]` is
     `Deny | SeededDeny`; `Extract<DecisionOutcome, { _tag: "Rechecking" }>` has no `decision`;
     `ReturnType<typeof currentDecision>` is `ClientDecision | undefined` (moved from
     `Hydration.tst.ts:50-52`, which is deleted there — replace, don't layer).
- **Tests:** as listed.
- **Verify:** `$W/node_modules/.bin/vitest run packages/react`; `pnpm test:tstyche`;
  `pnpm typecheck`; `pnpm circular`.
- **Done when:** new tests pass, the existing 260 pass unchanged except for repointed imports,
  madge is clean.

### T4 — Route every surface through the outcome; delete `classify` and `renderStateOf`
- **Status:** [x] done
- **Depends on:** T3
- **Files:** `packages/react/src/useGate.ts`, `packages/react/src/components.tsx`,
  `packages/react/src/hooks.ts`, `packages/react/src/GateWriter.ts`.
- **Steps:**
  1. `GateWriter.ts:43`: replace the literal union with
     `export type GateRenderState = DecisionOutcome["_tag"];` (`import type` from
     `./DecisionOutcome.ts`). Keep the doc comment; add "derived, so a sixth outcome is a sixth state".
  2. `useGate.ts`: delete `renderStateOf` (`:28-41`). Compute `const outcome = outcomeOf(result)`
     once; pass `outcome._tag` to `useGateRegistration`; add `readonly outcome: DecisionOutcome` to the
     `Gate` interface and return it. Rewrite the module comment's "same order" sentence: the panel
     and the guard now read the **same object**, so they cannot disagree by construction.
  3. `components.tsx`: delete `GateOutcome` and `classify` (`:74-98`). `chosen`/`refused` take the
     `DecisionOutcome` and dispatch with `DecisionOutcome.$match`:
     `Pending`/`Rechecking` → `pending`; `Failed` → the existing failure rule (`chosen`:
     `failure !== undefined ? failure : typeof fallback === "function" ? null : fallback`;
     `refused`: `failure`); `Allowed` → `children` / `null`; `Denied` → `renderDenied(…, decision)`.
     `permits` is no longer needed here.
  4. `hooks.ts`: `useCan` → `useGate(…).outcome._tag === "Allowed"`; `useProjected` →
     `outcome._tag === "Allowed" ? projectVisible(outcome.decision.visibleFields, data) : {}`.
     Update `useCan`'s doc ("false covers pending, rechecking, denied and failed — `outcomeOf` tells
     them apart"). `useDecisionSuspense` unchanged except a comment pointing at D-14-e's rationale
     in `DecisionOutcome.ts`.
  5. Update test comments that name the deleted functions (`hooks.test.tsx:483`,
     `GateRegistry.test.tsx:127`) — comments only, no assertion edits.
- **Tests:** none added; the regression net must pass **untouched** (assertions): `QadiProvider.test.tsx`,
  `GateRegistry.test.tsx` (incl. "reports 'Rechecking' during a re-check", `:126-185`),
  `GateRegistry.store.test.ts`, `hooks.test.tsx` (incl. ticket 144, `:482`), `edges.test.tsx`,
  `HydrationRender.test.tsx`, `ServerRender.test.tsx`, plus `features` `gate-instances.feature`.
- **Verify:** `$W/node_modules/.bin/vitest run packages/react`; `pnpm --filter @qadi/features test`;
  `grep -rn "renderStateOf\|const classify\|\.waiting" packages/react/src`.
- **Done when:** all of the above pass with zero assertion edits, and the grep shows `.waiting` only in
  `DecisionOutcome.ts`.

### T5 — Re-express T1's guide example through `outcomeOf`
- **Status:** [x] done
- **Depends on:** T3, D-14-d = A
- **Files:** `packages/react/test/hooks.test.tsx` (T1's describe); `spec/appendices/react-integration.md` §5;
  `apps/website/src/content/docs/docs/packages/react/hooks.md`.
- **Steps:**
  1. Rewrite T1's `EditPanel` as `DecisionOutcome.$match(outcomeOf(useDecision(canEditDoc)), { Pending: …, Rechecking: … "Checking…", Failed: … "Could not check…", Allowed: () => <Editor/>, Denied: () => <span>Read only</span> })`.
     No `effect/reactivity/AsyncResult` import remains in the example.
  2. Copy it into both docs; in `hooks.md` add a sentence after the state table: "`outcomeOf` reads
     all of these into five cases; a re-check and a failure carry no verdict."
- **Tests:** T1's two `it`s keep their assertions; only the component body changes.
- **Verify:** `$W/node_modules/.bin/vitest run packages/react/test/hooks.test.tsx`;
  `node scripts/check-doc-examples.mjs`; `node scripts/check-website-doc-examples.mjs`.
- **Done when:** green, and neither doc imports `AsyncResult`.

### T6 — Replace the example's hand copy
- **Status:** [x] done (`pnpm example` deferred to the final gate; the example's `typecheck` and `vitest run` pass)
- **Depends on:** T3, D-14-d = A
- **Files:** `examples/nextjs-newsroom/src/client/Guards.tsx`.
- **Steps:**
  1. Replace `:37-58` with `const state = outcomeOf(useDecision(policy, resource))._tag;` (import
     `outcomeOf` from `@qadi/react`; drop the `AsyncResult`, `currentDecision`, `permits` imports if
     now unused). This deletes the unreachable `decision === undefined` branch.
  2. Rewrite the comment: the five states come from `@qadi/react`'s own `outcomeOf`, the function the
     gate registry records, so this page and the devtools panel compare like with like by construction.
  3. Leave `Invalidation.tsx` and `Divergent.tsx` untouched; add one line to each file comment saying
     the raw read is the exhibit, so a reviewer does not "fix" it.
- **Tests:** the e2e assertions on `data-state` (`ssr.spec.ts:36-50`, `:166-191`, `:320-330`) are the
  net; values are identical strings.
- **Verify:** `pnpm example` (typecheck, build, Playwright).
- **Done when:** `pnpm example` passes with no e2e edit.

### T7 — Enforce the single read in source (`DECISION_READ_BUDGET`)
- **Status:** [x] done (deviated: the names table also pins `makeSeededQuestion` for `HydrationEngine.ts`, and the names guard matches a `const`/`function` declaration, because a bare word match survived a rename via prose mentions)
- **Depends on:** T4, D-14-f ∈ {B, C}
- **Files:** `scripts/check-house-style.mjs`; AGENTS.md §13 (one paragraph naming the budget).
- **Steps:**
  1. Add `const DECISION_READ_BUDGET = { "packages/react/src/DecisionOutcome.ts": 2, "packages/react/src/HydrationEngine.ts": 3 };`
     with a doc comment in the `SWITCH_BUDGET` style (why each entry exists: the outcome read; seed
     precedence and mismatch reporting upstream of it, ADR-QD-039).
  2. Pattern: `/\.waiting\b|\.previousSuccess\b|\bAsyncResult\.(?:isSuccess|isFailure|isInitial|isNotInitial|isWaiting|value|getOrElse|getOrThrow|match|matchWithError|matchWithWaiting|toExit)\(/`,
     applied to `srcSources` after the script's existing comment stripping; count per file; fail on
     any file not in the budget with a non-zero count, and on any budget entry whose count differs
     (both directions).
  3. Add `DECISION_READ_BUDGET_NAMES = { "packages/react/src/DecisionOutcome.ts": ["outcomeOf"] }`,
     checked to exist verbatim (the BS-06 rename guard `SWITCH_BUDGET_NAMES` has).
  4. Negative check: temporarily add `result.waiting` to `hooks.ts`, confirm the gate fails naming
     the file, revert.
- **Tests:** the gate itself; the negative check is recorded in §10.
- **Verify:** `node scripts/check-house-style.mjs`.
- **Done when:** clean on the tree, red on the injected read.

### T8 — Enforce it in documentation (doc-fence semantic pass)
- **Status:** [x] done (`refuseRawDecisionReads` in `scripts/lib/raw-decision-read.mjs`, shared by both scripts; `extractCodeFences` gained `startLine`)
- **Depends on:** T5, D-14-f = C
- **Files:** `scripts/lib/raw-decision-read.mjs` (*new*); `scripts/check-doc-examples.mjs`;
  `scripts/check-website-doc-examples.mjs`; `scripts/lib/extract-code-fences.mjs` (only if it does
  not already expose each fence's language and text).
- **Steps:**
  1. Export `findRawDecisionReads(fenceText) → Array<{ line, match }>`: only for fences whose text
     imports from `"@qadi/react"`; strip `//` and `/* */` comments; apply T7's pattern; skip a fence
     containing `// qadi:raw-decision-read — ` followed by a non-empty reason.
  2. Call it from both scripts over the fences they already compile (` ```typescript ` and
     ` ```tsx `), and fail with `file:line` on any hit. ` ```ts ` fragments (ADR-QD-017's own code
     block, ADR-QD-039's) are not compiled and not scanned.
  3. Negative check: run both scripts against the pre-T1 docs (`git stash` is off-limits for the
     planning agent, not for the implementer; or a temp copy) and confirm both C5 sites are reported.
- **Tests:** a small `scripts/lib/raw-decision-read.test.mjs` is **not** added (scripts have no test
  runner); the negative check stands in and is logged.
- **Verify:** `node scripts/check-doc-examples.mjs`; `node scripts/check-website-doc-examples.mjs`.
- **Done when:** both pass on the tree and both report the C5 ladder when it is reintroduced.

### T9 — Scoped mutation gate for the read (D-14-g)
- **Status:** [x] done (Stryker run deferred to the final integration gate; renumbering also touched README/CONTRIBUTING counts, CI's report upload list, ADR-QD-059, `spec/roadmap.md` and `check-dod-table.mjs`'s number words)
- **Depends on:** T3, D-14-g = B
- **Files:** `stryker.react.mjs` (*new*); `package.json` (`mutation` script);
  `spec/process/definitions-of-done.md` (new row 22, renumber 22–24 → 23–25, change history);
  `stryker.config.mjs:12-15` (one sentence: the react exclusion now has one scoped exception);
  every prose "gate 22/23/24" reference (`grep -rnE "(gate|step) 2[234]\b" spec AGENTS.md CONTRIBUTING.md scripts`).
- **Steps:**
  1. Copy `stryker.devtools.mjs`'s shape: `vitest.configFile: "packages/react/vitest.config.ts"`,
     `dir: "packages/react"`, `mutate: ["packages/react/src/DecisionOutcome.ts"]`,
     `ignoreStatic: true`, `thresholds: { high: 90, low: 80, break: 80 }`, reports under
     `reports/mutation-react/`. Header comment explains why this file and only this file.
  2. Append `&& stryker run stryker.react.mjs` to `mutation` after the http run.
  3. Insert the DoD row ("Mutation score on `@qadi/react`'s decision read is at or above 80%"),
     renumber, and fix each renumbered reference so it names its command (gate 11's rule).
- **Tests:** the mutation run itself.
- **Verify:** `stryker run stryker.react.mjs`; `node scripts/check-dod-table.mjs`.
- **Done when:** score ≥ 80% (expected near 100%: the module is small and fully table-tested), and
  the DoD gate passes.

### T10 — Spec, ADR, AGENTS.md, overview, traceability, CCR, changeset
- **Status:** [x] done
- **Depends on:** T3, T4 (and T7–T9 for the parts they add)
- **Files:** `spec/decisions/NNN-a-decision-is-read-once.md` (*new*, ADR-QD-NEXT);
  `spec/decisions/index.yaml`; `spec/decisions/017-stale-decisions-are-not-decisions.md` (amend);
  `spec/decisions/053-*.md` (one-sentence amend); `spec/behaviors/09-react.md`;
  `spec/invariants.md`; `spec/traceability.md`; `spec/overview.md`; `spec/README.md` (CCR row);
  `AGENTS.md` §13; `packages/react/README.md` (`:38-46`);
  `apps/website/src/content/docs/docs/concepts/hydration-reactivity.md` (`:67-100`);
  `.changeset/decision-read-once.md` (*new*).
- **Steps:**
  1. **ADR-QD-NEXT** "A decision is read once, into a closed outcome": context (C2–C7), decision
     (D-14-a/b/c/d/e/f/g as taken), consequences (stale-allow rule has one home; `previousSuccess`
     unreachable; `currentDecision` kept as a projection; raw `useDecision` kept as the opt-in).
  2. **ADR-QD-017 amendment**: the Decision section's "single place" becomes `outcomeOf`; add a
     paragraph: "`waiting` is not the only carrier — a `Failure` holds `previousSuccess`, and
     `AsyncResult.value`/`getOrElse` return it"; the code block is replaced with the new projection.
  3. **ADR-QD-053 amendment**: `GateRenderState` is `DecisionOutcome["_tag"]`.
  4. **09-react.md**: BEH-QD-066 gains the `DecisionOutcome`/`outcomeOf` signatures (a ` ```ts `
     listing), a complete state table (add `Initial, waiting: true` as the "no subject"/first-ask state
     and `Failure, waiting: true`; note `Failure.previousSuccess` is never read), and a REQUIREMENT:
     "Every surface MUST read a `DecisionResult` through `outcomeOf`; no outcome other than `Allowed`
     carries an allow." Add **BEH-QD-NEXT** "A decision result reads as one of five outcomes" with a
     compiled ` ```typescript ` example (`outcomeOf` over `registry.get(atoms.decision(p))`).
  5. **INV-QD-NEXT** "A decision being re-checked, or that failed, never reads as a verdict":
     statement, the `previousSuccess` rationale, enforcement = `DecisionOutcome.test.ts` properties,
     `DECISION_READ_BUDGET`, the doc-fence pass.
  6. **traceability.md**: §1 behaviour 09 row gains BEH-QD-NEXT and `DecisionOutcome.ts`; §2
     INV-QD-NEXT row; §3 ADR-QD-NEXT row (and ADR-QD-017's row gains INV-QD-NEXT); §4 rows for
     `DecisionOutcome.test.ts`, `DecisionOutcome.tst.ts`, and the extended `hooks.test.tsx`/
     `edges.test.tsx` rows; Change History entry.
  7. **overview.md**: `@qadi/react` table — `DecisionOutcome` (type + constructors) and `outcomeOf`,
     `currentDecision` and `DecisionResult` re-sourced to `DecisionOutcome.ts`; rewrite `:457-460` to
     name `outcomeOf`. Gate 13 (`check-api-surface.mjs`) must pass.
  8. **AGENTS.md §13**: "Read decisions through `outcomeOf`. It is the single place …; `currentDecision`
     is its projection for a caller that wants only a settled decision. A new consumer that reads
     `AsyncResult` state directly — `isSuccess`, `waiting`, or a failure's previous value — will
     report stale allows; `DECISION_READ_BUDGET` and the doc-fence pass refuse it."
  9. **README / website**: same substitution; `hydration-reactivity.md`'s comment block mentions
     `outcomeOf` returning `Rechecking`.
  10. **CCR-QD-NEXT** row in `spec/README.md` listing every document above with its new revision.
  11. **Changeset**: `@qadi/react` minor — "Adds `outcomeOf` and `DecisionOutcome`, the one read of a
      decision result. `DecisionResult` and `currentDecision` move module (same public names).
      `GateRenderState` is now derived from `DecisionOutcome`." Fixed version group carries the rest.
- **Tests:** n/a (gates below).
- **Verify:** `node scripts/check-doc-examples.mjs`; `pnpm spec:verify:strict`;
  `node scripts/check-api-surface.mjs`; `node scripts/check-dod-table.mjs`;
  `node scripts/check-devtools-claims.mjs` (expected untouched); `node scripts/check-website-doc-examples.mjs`.
- **Done when:** all pass and every placeholder has a number assigned at landing.

### T11 — Full gate
- **Status:** [~] deferred to final integration gate
- **Depends on:** T1–T10
- **Files:** none
- **Steps:**
  1. Free disk (C10). Run `pnpm check` (coverage with `--testTimeout=60000` if `FieldPath.test.ts`
     times out as noted in the README's open items).
  2. Run `stryker run stryker.react.mjs` on its own if D-14-g = B and record the score; otherwise run
     an ad hoc copy of T9's config from the scratchpad and record the score as evidence.
- **Tests:** everything.
- **Verify:** `pnpm check`; `stryker run stryker.react.mjs`.
- **Done when:** both pass; §10 records the numbers.

### T12 — Update the tracker
- **Status:** [x] done
- **Depends on:** T11
- **Files:** `.planning/architecture/README.md`
- **Steps:** add ARCH-14 to the Plans table, add C5 to "Defects found while planning" (ARCH-14 · T1,
  "the published guide renders a stale allow during a re-check", blocked on nothing), set `status:`.
- **Tests:** n/a. **Verify:** the README quick-status grep. **Done when:** row present.

## 7. Test strategy

**Survive unchanged (the regression net, assertions untouched):** `QadiProvider.test.tsx`,
`GateRegistry.test.tsx`, `GateRegistry.store.test.ts`, `GateWriter.test.tsx`, `edges.test.tsx`
(existing `it`s), `hooks.test.tsx` (existing `it`s), `HydrationRender.test.tsx`,
`ServerRender.test.tsx`, `Hydration.test.ts`, `HydrationCounts.test.ts`, `HydrationPayload.test.ts`,
`HydrationEngine.test.ts`, `QadiAtoms.test.ts`, `v4-reactivity-smoke.test.ts` (its
"a waiting success still reports isSuccess, which is why currentDecision exists" stays: it pins the
library fact the module exists for), the `gate-instances.feature` BDD scenarios, and the newsroom e2e.
Only import paths change, in T3.

**Moved to the new interface:** `Hydration.tst.ts:50-52`'s `currentDecision` return-type assertion
moves to `DecisionOutcome.tst.ts`. The *rule* tests now live at the interface: the waiting/failure/
seeded classification is asserted once, in `DecisionOutcome.test.ts`, through real atoms and a
fast-check property, without rendering (AGENTS.md §13). The render tests that used to be the only
evidence for `classify`/`renderStateOf` ("ticket 144", "ticket 145") stay as end-to-end checks of the
wiring, not of the rule.

**Deleted:** nothing beyond the `Hydration.tst.ts` move. `classify` and `renderStateOf` had no direct
tests of their own (they were private/out-of-barrel), so "replace, don't layer" removes code, not
tests.

**Added:** T1 (two render tests reproducing C5, red first), T2 (suspension during a re-check, proven
to fail with the flag flipped), T3 (table + three properties + identity check + tstyche).

**Property / differential:** T3's "agrees with `currentDecision` and `permits`" is the differential
between the old public read and the new one. The §1 probe already ran the differential against the
deleted `classify`/`renderStateOf` with 0 disagreements; T3's table encodes that result permanently.

**Mutation:** if D-14-g = B, `stryker.react.mjs` over `DecisionOutcome.ts`. Mutants of interest:
swapping the `isInitial`/`waiting` order (killed by "first evaluation in flight" → `Pending`),
dropping the `waiting` check (killed by the waiting property), mapping `SeededAllow` to `Denied`
(killed by the seeded row), `Failed` → `PENDING` (killed by "re-check failed after allow").

## 8. Spec and documentation updates

All in T10, plus T1/T5's two doc examples and T9's DoD row:

- **New:** ADR-QD-NEXT; BEH-QD-NEXT (`09-react.md`); INV-QD-NEXT; CCR-QD-NEXT.
- **Amended:** ADR-QD-017 (home of the rule; `previousSuccess`); ADR-QD-053 (derived
  `GateRenderState`); ADR-QD-025 family note only if D-14-g = B; BEH-QD-066 (complete state table,
  new requirement); `spec/appendices/react-integration.md` §5; `spec/overview.md` `@qadi/react` table
  and the `currentDecision` paragraph (gate 13, `check-api-surface.mjs`); `spec/traceability.md` §1–§4
  and Change History; `spec/process/definitions-of-done.md` (only if D-14-g = B; gate 11,
  `check-dod-table.mjs`); AGENTS.md §13; `packages/react/README.md`; website `hooks.md` and
  `hydration-reactivity.md`.
- **Unchanged on purpose:** `spec/devtools-spec/` (gate 12, `check-devtools-claims.mjs`), behaviour 28
  (`Rechecking`/`Pending` wording stays true).
- **Changeset:** `@qadi/react` minor (additive exports; moved declarations keep their public names).

## 9. Risks and rollback

| Risk | Detection signal | Rollback |
| --- | --- | --- |
| Routing `Can`/`Cannot` through `$match` subtly changes the failure/fallback rules (CCR-QD-138's `failure={null}` case) | `edges.test.tsx` "failure rendering" describe fails | Revert T4's commit; T3's module stays, unused by components. |
| An extra allocation per render shifts timing in a render-sequence test | `QadiProvider.test.tsx` or `ssr.spec.ts:188-191` changes | Unlikely — no atom, subscription or registry change; the outcome is computed from the value React already holds. If it happens, revert T4 and investigate before retrying. |
| Moving `DecisionResult` creates an import cycle | `pnpm circular` (gate 5, `madge`) fails | D-14-c = A avoids it by construction; if a later edit adds a local import to `DecisionOutcome.ts`, move it back to type-only or out. |
| The house-style regex miscounts (a comment, a string) | `check-house-style.mjs` reports an unexpected count | The rule runs after the script's existing comment/regex-literal stripping; adjust the budget only with a reason in the doc comment. |
| The doc-fence pass flags a legitimate stale-while-revalidate example | gate 9 / 22 fails on a new doc | Add `// qadi:raw-decision-read — <reason>` to that fence; the marker is the reviewed opt-out, as ADR-QD-017 intends raw access to be deliberate. |
| DoD renumbering (D-14-g = B) leaves a stale "gate 22" in prose | `check-dod-table.mjs` fails | Fix the reference to name its command; rollback = drop T9 (config, script and row together). |
| Parallel ARCH-08..15 plans edit the same files (`useGate.ts`, `components.tsx`, `hooks.ts`, `QadiAtoms.ts`) | T0 step 3 grep | Land ARCH-14 T3–T4 as one commit after any plan that changes `useGate`'s registration, or rebase it; the change is mechanical. |
| Disk full during Stryker/Next build (118 MiB free at planning) | `ENOSPC` | Free space before T6/T9/T11; nothing in the plan needs more than a normal `pnpm check`. |

Whole-plan rollback: T1 and T2 are independent and worth keeping regardless. T3–T10 revert as a unit;
the public additions (`outcomeOf`, `DecisionOutcome`) are additive, so reverting before a release has
no consumer impact.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-05 | — | plan written | Claude (planning agent) |
| 2026-10-05 | T0 | Baseline on `arch/deepening` after ARCH-08/12/13-T1: react 14 files / 260 tests; house-style 317 files clean (3 switches); api-surface 792 exports; madge clean. No other wave-2 plan on this branch edits `packages/react/src` (ARCH-09 runs in parallel on its own branch). | Claude (impl agent) |
| 2026-10-05 | T1 | `5428e6e` — two `hooks.test.tsx` tests red on the verbatim guide ladder (editor stays during a parked re-check), green on `currentDecision` first; both docs corrected; both doc gates compile. | Claude (impl agent) |
| 2026-10-05 | T2 | `2997f5d` — C8 settled: with `suspendOnWaiting: false` the new test fails (the fallback never shows; stale `Allow` renders); with `true` it passes. | Claude (impl agent) |
| 2026-10-05 | T3 | `f7642a7` — `DecisionOutcome.ts` + 7 runtime tests (real atom: 8 states + seeded; 3 fast-check properties; identity; cause-only) + tstyche file; react 270 tests; madge clean. | Claude (impl agent) |
| 2026-10-05 | T4 | `740c5fe` — `classify`/`renderStateOf` deleted, `GateRenderState = DecisionOutcome["_tag"]`; react 270 and BDD 512 pass with zero assertion edits (two comments reworded). | Claude (impl agent) |
| 2026-10-05 | T5–T6 | `6f577e1`, `c353154` — guide, website and test example via `$match(outcomeOf(…))`; newsroom `GateState` is `outcomeOf(…)._tag`; exhibits annotated. | Claude (impl agent) |
| 2026-10-05 | T7 | `a15161c` — `DECISION_READ_BUDGET` {DecisionOutcome.ts: 2, HydrationEngine.ts: 3}. Negative checks: injected `result.waiting` in `hooks.ts` fails naming the file; renaming `outcomeOf` fails the names guard; removing a read fails the count. | Claude (impl agent) |
| 2026-10-05 | T8 | `89db5fc` — doc-fence pass in both gates. Negative check: pre-T1 `react-integration.md` reported at :191/:196 and `hooks.md` at :56/:57 (`isInitial(`/`isFailure(`). | Claude (impl agent) |
| 2026-10-05 | T9 | `f22653c` — `stryker.react.mjs`, DoD row 22 (22–24 → 23–25), `check-dod-table.mjs` 25 steps / 104 references resolve. Stryker not run (deferred). | Claude (impl agent) |
| 2026-10-05 | T10 | `e1d4cb6` — ADR-QD-093, BEH-QD-307, INV-QD-094, CCR-QD-175; ADR-QD-017/053/025 amended; changeset `decision-read-once.md` (`@qadi/react` minor). spec:verify:strict 19/19, api-surface 794, doc-examples 86, website 31. | Claude (impl agent) |
| 2026-10-05 | T11 | Deferred to the final integration gate (`pnpm check`, `stryker run stryker.react.mjs`, `pnpm example`). Ran instead: typecheck, lint, circular, tstyche (42), react vitest (270), BDD (512), all spec gates. | Claude (impl agent) |
| 2026-10-05 | T12 | Tracker row, task count and decision register updated. | Claude (impl agent) |
