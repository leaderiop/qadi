---
id: ARCH-50
title: A headless ExplorerSession owned by the dock — the policy explorer's choice, draft, preview and paste become a mutation-gated model the view only renders, and survive a tab switch
strength: Worth exploring   # from the 2026-10-13 architecture review (card 5, "A session for the policy explorer"); the explorer's own reading was Strong
status: fixed-on-main (1721a42)
disposition: "superseded by merged ARCH-58 (#154); the rescue/arch50-stash-a/-b stashes are not salvaged; was `needs-decision` (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []              # no hard dependency. Soft ordering with ARCH-48 on SimulationSession.ts (T3 only); see §4 and §9
blocks: []
adrs_touched:
  - ADR-QD-047 (amend: Rev 1.7 dated block — the explorer's state is model too, held by a package-private ExplorerSession the dock owns; the 1.2 amendment's argument, one screen later)
  - ADR-QD-030 (read: simplification is never automatic and is previewed before it is applied; T1 and T4 make "what is applied is what was previewed" true by construction)
  - ADR-QD-048 (read: the catalogue is observed, newest first; "a label is a display string, never an identity")
  - ADR-QD-099 (constraint: the new modules stay out of both barrels, so they are package-private, unless D-50-a says otherwise)
  - ADR-QD-034 (constraint: Match, not switch; SWITCH_BUDGET unchanged)
  - ADR-QD-037 (constraint: madge gate; ExplorerSession.ts imports only leaves and nothing imports back)
  - ADR-QD-025 + ADR-QD-076 + ADR-QD-098 (constraint: model/** is mutated by stryker.devtools.mjs, ignoreStatic, break 80, sequential)
  - ADR-QD-038 (constraint: one changeset, fixed version group; no release run)
packages: ["@qadi/devtools", "spec", "features (BDD)"]
estimate: M   # ≈ 2 days for T0–T11. Defect-only path (T1) ≈ 2 hours (S) and ships alone as a patch. Tab-switch defect path (T2 + T4 + T5) ≈ 1 day.
---

# ARCH-50 — A headless session for the policy explorer

## 1. Verified evidence (at `b655b3b`)

Checked on `main` at `b655b3b` (`git rev-parse --short HEAD` → `b655b3b`, "Wave 4 architecture deepenings and security
patches (ARCH-30 to ARCH-45) (#150)"). Read-only: nothing in the repository was edited.

**Probes** live in `$P = /private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-50/`,
never in the repository. `$P/node_modules` is a symlink to `packages/devtools/node_modules`. `$P/vitest.config.mts` sets
`root: $P`, `environment: "happy-dom"`, aliases `@qadi/core` and `@qadi/testing` to their `src/index.ts`, includes
`*.test.tsx`, and registers `@testing-library/react`'s `cleanup` in `$P/setup.ts`. The probes import the devtools
modules by absolute path. Run them with:

```
cd packages/devtools && ./node_modules/.bin/vitest run --config $P/vitest.config.mts --silent=false --reporter=verbose
```

| Probe | Steps | Output at `b655b3b` |
| ----- | ----- | ------------------- |
| `probe.test.tsx` P1 | `<DevtoolsDock catalogue={{ policies: { canRead, canWrite } }} />`, open Policies, click rail item 1, open Log, open Policies | before: tree `doc:write`. **after: tree `doc:read`** |
| `probe.test.tsx` P1b | dock, Policies, Tree→JSON, paste `hasRole("editor")`, load, Log, Policies | before: JSON view, text has `editor`. **after: Tree view, tree `doc:read`**: the pasted draft and the view mode are gone |
| `probe.test.tsx` P2 | `<PolicyExplorer>` over `allOf([hasPermission(read)])`, click simplify (preview `doc:read`), Tree→JSON, paste `anyOf([editor, admin])`, load, JSON→Tree | **tree shows 1 node `doc:read`** (the old policy's simplification), button says `cancel`, effect line says "already as simple as this policy gets". Clicking `apply` then shows **3 nodes `any of editor admin`**: what was applied is not what was previewed |
| `probe.test.tsx` P3 | explorer over `allOf([hasPermission(read)])`, Tree→JSON, paste `{"_tag":"NotAPolicy"}`, load (refusal shown), simplify, apply | textarea now shows `{"_tag":"HasPermission",…}` (the applied policy's encoding) **and the refusal of the old paste is still shown under it** |
| `probe.test.tsx` P3b | explorer over `hasPermission(read)`, Tree→JSON, paste `nope`, load (refusal), JSON→Tree, Tree→JSON | **textarea shows the encoded policy, not `nope`**: the unloaded edit was lost by the toggle, and the refusal of `nope` is still shown beside text it does not describe |
| `probe2.test.tsx` P4 | `<DevtoolsDock catalogue={{ roles: [a, b] }} />`, Roles, click `b`, Log, Roles | before: `b` (`doc:write`). **after: `a` (`doc:read`)** |

The existing suites pass at `b655b3b`: `pnpm vitest run packages/devtools/test/react/PolicyExplorer.test.tsx
packages/devtools/test/model/HeldChoice.test.ts packages/devtools/test/react/RoleViewer.test.tsx` → 3 files, 53 tests.

| # | Claim (review card 5) | Verdict | At `b655b3b` (symbol first; line numbers are hints) |
| - | --------------------- | ------- | ------------------------------------------------------- |
| C1 | `PolicyExplorer.tsx` holds the state machine ADR-047 took out of the Simulator: five `useState`s (`held`, `json`, `draft`, `preview`, `pasteError`) and two more in `JsonView` | **CONFIRMED** | `PolicyExplorer` (`:85-195`) declares the five at `:87-92`. `JsonView` (`:275-325`) declares `text` (`:281`) and `seenPolicy` (`:292`). Seven pieces of state, none under `test/model/` or `stryker.devtools.mjs` (whose `mutate` is `packages/devtools/src/model/**/*.ts`). |
| C2 | A render-phase head pin, `if (held === undefined …) setHeld(...)` (~:96) | **CONFIRMED** | `PolicyExplorer.tsx:96`: `if (held === undefined && sightings[0] !== undefined) setHeld(sightings[0]);`. This is `HeldChoice.ts`'s `pinHead` written out again inline. |
| C3 | Choosing a policy clears the draft, the preview and the paste error | **CONFIRMED** | `choose` (`:120-127`) takes an **index** into the render's `sightings` and clears all three. Nothing else clears `preview` except cancel and apply, and nothing else clears `pasteError` except a successful load (see C10, C11). |
| C4 | A paste is decoded and formatted in the view (`formatDecodeFailure`, `fromJson` under `Effect.runSync`) | **CONFIRMED** | `formatDecodeFailure` (`:44-58`), and `onLoad` (`:175-187`) runs `Effect.runSync(Effect.result(fromJson(text)))`. `JsonView` also runs `Effect.runSync(Effect.result(toJson(policy)))` (`:280`). |
| C5 | "check AGENTS rules on runSync in a view" | **REFUTED as a rule breach** | AGENTS.md §6's forbidden list does not name `Effect.runSync`, and `scripts/check-house-style.mjs` has no rule for it (`grep -n runSync scripts/check-house-style.mjs` → nothing). The cost is locality: the decode rule and its formatter sit in `react/`, outside the model's 95% coverage bar and outside the mutation gate. |
| C6 | An unloaded edit resets when the policy changes | **CONFIRMED** | `JsonView`'s `seenPolicy` comparison (`:292-296`), pinned by `PolicyExplorer.test.tsx` "clears an edited-but-unloaded paste when a different policy is selected". The buffer lives in `JsonView`, so it is also lost whenever `JsonView` unmounts (C12). |
| C7 | Held-choice pinning is reimplemented "here and in `SimulationSession` (`pin`/`pinHead`)" despite `model/HeldChoice.ts` (ARCH-33) | **CHANGED** | `SimulationSession.ts` does **not** reimplement it: its `pin` (`:305-307`) calls `pinHead`, and `policyChoice` (`:277-297`) calls `resolveHeld`. The duplicates are in the **views**: `PolicyExplorer.tsx:96` and `RoleViewer.tsx:45` each inline `pinHead` as a render-phase `setHeld`. Two smaller duplicates sit beside them: the sighting equality `(a, b) => Equal.equals(a.policy, b.policy)` is written in `SimulationSession.ts:281` and `PolicyExplorer.tsx:100`, and "choose a policy" is by value in the session (`choosePolicy`, `:502-519`, with `unlisted`, `:240-248`) but by index in the explorer (`choose`). |
| C8 | `DevtoolsDock.tsx` renders `<PolicyExplorer>` fresh per tab (~:349), so a pasted or simplified draft and the chosen policy are lost on every tab switch | **CONFIRMED, user-visible defect** | `Screen`'s `policies` entry (`:349`) mounts `<PolicyExplorer sightings={props.sightings} />` only while the tab is selected. Probe P1: a chosen `doc:write` comes back as `doc:read`. Probe P1b: the draft and the JSON view come back as the head's tree. On return the render-phase pin (C2) re-pins whatever is the head **now**, so a new decision during the visit also changes what is shown. That breaks **INV-QD-107** ("A list screen shows the item the reviewer chose, or the head it first showed, until the reviewer chooses another"). |
| C9 | The dock avoids that for the simulator by owning its session (~:184-190) | **CONFIRMED** | `DevtoolsDock`'s comment at `:184-191` and `useOwnedSimulationSession({ sightings, seed, ports })` (`:192`) (ARCH-20's D-20-g). The round trip is pinned by `DevtoolsDock.test.tsx` "keeps the simulator's form, capture and result across a tab round trip". No such test exists for the explorer or the role viewer. |
| C10 | *(found, not in the review)* **DEFECT: a preview outlives the policy it previews** | **CONFIRMED (probe P2)** | `onLoad` (`:175-187`) sets `draft` and clears `pasteError` but **not** `preview`. `preview` is a stored `Policy` (`:91`), the tree shows `preview ?? policy` (`:190`), and `Toolbar`'s `apply` applies `simplified`, which `useMemo` recomputes from the **new** `policy` (`:205`, `:226`). So after a load the screen previews one policy's simplification, describes another ("already as simple"), and applies a third tree. BEH-QD-213 requires simplification to be "previewed before it is applied". What is applied here was never previewed. |
| C11 | *(found)* **DEFECT: a paste refusal outlives the text it refused** | **CONFIRMED (probes P3, P3b)** | `pasteError` is cleared only by `choose` and by a successful load. `apply` changes the shown policy, and `JsonView` resets its text to the new encoding (`seenPolicy`), but the refusal stays. BEH-QD-213: "A paste that does not decode reports the issue". Here the reported issue belongs to text that is no longer on screen. |
| C12 | *(found)* **DEFECT: an unloaded paste is lost by a Tree/JSON toggle** | **CONFIRMED (probe P3b)** | `PolicyExplorer` renders `json ? <JsonView …/> : <PolicyTree …/>` (`:171-191`), so leaving the JSON view unmounts `JsonView` and its `text`. `JsonView`'s own comment says the buffer exists "so a paste that has not been loaded yet is not lost while the reviewer keeps typing". Glancing at the tree loses it. |
| C13 | *(found)* **DEFECT: the role viewer loses its role on a tab switch too** | **CONFIRMED (probe P4)** | `RoleViewer` holds `held` in `useState` (`:43`), pins in render (`:45`), and the dock mounts it per tab (`Screen`'s `roles` entry, `:350-355`). The same INV-QD-107 breach as C8. ARCH-33's §3 named both as "a separate product question" and deferred it: "the dock could own a `HeldChoice` per screen later at no cost to this design". |
| C14 | "All 20+ explorer tests go through rendering" | **CONFIRMED (28)** | `PolicyExplorer.test.tsx` has 28 `it`s in six `describe`s. 27 render. The 28th ("round-trips: what it shows decodes back to the policy it showed") renders nothing and only exercises core's `toJson`/`fromJson`. It does not exercise the explorer at all. |
| C15 | The proposed `ExplorerSession` can be built like `TimelineStore` and `SimulationSession` | **CONFIRMED** | `model/ExternalStore.ts`'s `makeExternalStore` (`set` notifies only on a new reference, `publish` always) is the shared mechanics, and `react/useRunningStore.ts` already reads a store with no run (`run === undefined` "starts nothing and still reads the store"). The explorer's commands are all synchronous (decode and encode are sync Effects; see D-50-f), so the session needs no `run`, `reap` or `dispose`. |
| C16 | Public interface today | **FACT** | `PolicyExplorer`, `PolicyExplorerProps`, `RoleViewer` and `RoleViewerProps` are package-private since ARCH-40 (`react/index.ts` exports the dock and the three stores' React halves only; `upgrading.md:165` lists them as removed). `HeldChoice.ts` is package-private (its doc comment and ADR-QD-099). So every change below is **inside the package**: no gate-13 row, no `surface.test.ts` line and no published break, unless D-50-a makes the session public. |
| C17 | Coverage and mutation scope | **FACT** | `vitest.config.ts`: `packages/devtools/src/model/**` at 95/95/95/95 and `packages/devtools/src/react/**` at 90. `stryker.devtools.mjs`: `mutate: ["packages/devtools/src/model/**/*.ts"]`, `ignoreStatic: true`, `thresholds.break: 80`. A rule moved from `react/` to `model/` therefore moves under both stricter gates with no config edit. |

**Other facts the plan relies on.**

- `fromJson` (`packages/core/src/Policy.ts`, `fromJson`) is `Effect.suspend` over `JSON.parse`, a depth guard and
  `Schema.decodeUnknownEffect`: synchronous, failing only with `PolicyDecodeTooDeep | Schema.SchemaError`. `toJson` is
  `Schema.encodeEffect(PolicyFromJson)`, also synchronous. `Effect.runSyncExit` and `Cause.pretty` exist in the
  installed effect (`node_modules/effect/src/Effect.ts`, `runSyncExit`; `Cause.ts`, `pretty`).
- `simplify` (`Simplify.ts`) and `policyDepth` (`Policy.ts`) are pure. The view calls `simplify` under `useMemo`
  keyed by the policy object (`Toolbar`, `:205`). The session must memoise too, because the dock rebuilds `sightings` on
  every timeline tick and each `setSightings` rebuilds the snapshot (§9).
- `fast-check` is already a `devDependency` of `@qadi/devtools` (`package.json`, `"fast-check": "catalog:"`), used by
  `HeldChoice.test.ts` and `SimulationForm.test.ts`.
- BDD: `features/features/devtools-screens/devtools-screens.steps.test.ts` already renders `DevtoolsDock` under
  happy-dom (`GlobalRegistrator`) for the role scenarios (ARCH-40 T5), so a tab-round-trip scenario costs no new
  harness.
- Gate 12 (`scripts/check-devtools-claims.mjs`) refuses unregistered absence phrases in `spec/devtools-spec/`
  (`PHRASES`: "not retained", "not recorded", "has no source", "blocked on", "not built", …). Prose this plan adds there
  must avoid them.

## 2. Goal and success criteria

**Goal.** Screen 3's state (which policy is shown, a pasted or simplified draft, a preview, the JSON view's
unloaded edit and its refusal, Tree or JSON) is today seven `useState`s across two views, and the rules that
govern them are scattered event handlers. Three of those rules are already wrong (C10–C12), and the screen's
lifetime is the tab's (C8). This plan moves that state into one **deep module**, `model/ExplorerSession.ts`: a
store on `makeExternalStore` with a small **interface** (`subscribe`, `getSnapshot`, and seven synchronous
commands: `setSightings`, `choose`, `setView`, `editJson`, `load`, `setPreviewing`, `apply`). Behind it sits an
**implementation** that holds the held-choice rule (through `HeldChoice.ts`, shared with `SimulationSession`), the draft
lifecycle, the preview, the codec round trip, the refusal formatter, the depth reading and the memoised
simplification. The **seam** is the snapshot. `PolicyExplorer.tsx` becomes an **adapter** that renders it and
dispatches commands, and `DevtoolsDock` owns the session (ARCH-20's D-20-g, one screen later), so a tab switch
leaves it alone. **Locality:** "what the explorer shows and when it changes" lives in one module, under the model's
95% coverage and its mutation gate. **Leverage:** the rules are tested with no DOM, the dock gets tab survival for
free, and the role viewer gets the same through a tiny held-choice store over the same `HeldChoice` functions
(D-50-e).

**Success criteria.**

1. A preview belongs to the policy it previews. After a load, `apply` produces the tree that was on screen, and the toolbar and the tree describe one policy.
   `pnpm vitest run packages/devtools/test/react/PolicyExplorer.test.tsx` (T1, red first), then
   `pnpm vitest run packages/devtools/test/model/ExplorerSession.test.ts` (T4).
2. A refusal belongs to the text it refused. It is gone once the shown policy changes, and an unloaded edit survives a Tree/JSON toggle (T1, T4).
3. The dock keeps the explorer's chosen policy, draft, view and unloaded edit across a tab round trip, and the role viewer's
   chosen role likewise: `pnpm vitest run packages/devtools/test/react/DevtoolsDock.test.tsx` (T2 red, green at T5 and T7).
4. `grep -n "useState" packages/devtools/src/react/PolicyExplorer.tsx packages/devtools/src/react/RoleViewer.tsx` → nothing.
   `grep -n "runSync\|fromJson\|SchemaIssue" packages/devtools/src/react/PolicyExplorer.tsx` → nothing (T5, T7).
5. `grep -rn "Equal.equals(a.policy, b.policy)" packages/devtools/src` → nothing. The sighting equality and "choose by
   value" live once, in `Catalogue.ts` (`sameSighting`, `sightingFor`) (T3).
6. `ExplorerSession.ts` is at 100% branches. `pnpm stryker run stryker.devtools.mjs --mutate
   packages/devtools/src/model/ExplorerSession.ts,packages/devtools/src/model/HeldChoice.ts` scores ≥ 90 with no
   surviving mutant in a command's rule (T8).
7. A model-based property (random command sequences against a reference model) holds: the shown policy changes only on
   `choose`, `load` and `apply`, and while previewing, `apply` yields exactly the previewed tree (T6).
8. One BDD scenario under `@REQ-QD-025` ("Leaving the Policies tab keeps what it shows") passes (T9). `pnpm check` is green (T10).

## 3. Non-goals

- **One choice shared by the explorer and the simulator.** Choosing a policy on screen 3 does not choose it on
  screen 5, and the reverse holds too. Each screen holds its own value. Sharing them is a product question (would a
  replay from the inspector also move the explorer?) that this plan does not need to answer. Two sessions that each
  call `HeldChoice` already agree on *how* a choice is held.
- **Surviving a dock remount or a page reload.** The dock owns the session, so it lives as long as the dock does, which
  is what the simulator does today. Persisting to storage is a different feature.
- **Changing what the screen says.** The wording (empty state, "never evaluated", the simplify-effect sentences, the depth
  line, "no longer in the log") stays in the view, unchanged. Only the facts it is computed from move.
- **Changing `simplify`, `fromJson`, `toJson` or `policyDepth`.** They are consumed as they are. BEH-QD-213's two-rewrite
  scope (no double-negation elimination) is untouched.
- **Making the panels public again.** ARCH-40 settled that (D-40-c). `PolicyExplorer` and `RoleViewer` stay private.
- **The role viewer's other readings** (`roleSummary`, `grantPath`). Only its held choice moves (D-50-e).
- **ARCH-48's fixture table and session chip commands.** This plan touches `SimulationSession.ts` only to call the
  shared choice helpers (T3).

## 4. Constraints

- **AGENTS.md §1.** Namespace submodule imports (`effect/Effect`, `effect/Equal`, `effect/Exit`, `effect/Cause`,
  `effect/Match`, `effect/SchemaIssue`), `.ts` relative imports, and `import type` for type-only imports.
- **§5 / UNTRACED_BUDGET.** The session's commands are synchronous plain functions, like `SimulationSession`'s
  `setSightings`/`edit`. They are not Effects, so no `Effect.fn` is needed and no `Effect.fnUntraced` is added.
  `UNTRACED_BUDGET` is unchanged.
- **§5a / ADR-QD-034.** Dispatch on `ExplorerShown`/`ExplorerSnapshot` uses `Match.value(…).pipe(Match.tagsExhaustive(…))`
  in the model and the view, or a plain `_tag` comparison for a two-way check, as `formatDecodeFailure` already does. No
  `switch`, and `SWITCH_BUDGET` is unchanged.
- **§6.** No `as`, `!`, `any`, `async`/`await` or `console.*`. No `Record<string, unknown>` widening, and closed unions
  are written out in full (user preferences). A defect inside a sync decode becomes a stated refusal rather than a throw
  inside a click handler (D-50-f).
- **§9 / ADR-QD-099 / `devtools-named-barrel`.** `model/ExplorerSession.ts` and `react/useExplorerSession.ts` stay out
  of both barrels unless D-50-a = B. If they stay private: no `spec/overview.md` row, no `test/surface.test.ts` or
  `surface.tst.ts` line, and gate 13 (`node scripts/check-api-surface.mjs`) is unaffected.
- **§13 (React).** The rule "no React state for decisions" does not bite here (the explorer shows no decision), but
  the reasoning behind it does: the view keeps no state and computes nothing beyond trivial reads. The store is read through
  `useSyncExternalStore` (via `useRunningStore`), and nothing new is added to `@qadi/react`. No new dependency
  is added.
- **ADR-QD-037 / `pnpm circular`.** `ExplorerSession.ts` imports `ExternalStore.ts`, `HeldChoice.ts`, `Catalogue.ts`
  (types and `sameSighting`/`sightingFor`) and `@qadi/core`. None of them imports it back. `HeldChoice.ts`'s new store
  (D-50-e) imports only `ExternalStore.ts`. Madge counts type-only edges, and none run back.
- **ADR-QD-076.** `ignoreStatic: true`, and every rule is per-call, so each command arm needs a test that pins its output
  (no-op vs notify, every reset).
- **Coverage.** `model/**` at 95% on all four metrics, and `react/**` at 90%. Moving logic out of `PolicyExplorer.tsx`
  raises the view's coverage, but the view must still be ≥ 90 after T6 deletes its rule tests. The DOM tests kept in T6
  cover every branch of the remaining JSX.
- **Gate 12** (`node scripts/check-devtools-claims.mjs`). Prose added to `spec/devtools-spec/02-screens.md` avoids the
  `PHRASES` list (for example, write "kept across a tab switch", never "not retained").
- **Gate 11** (`node scripts/check-dod-table.mjs`). No gate is added, so the DoD table is untouched.
- **ADR-QD-038 / releases.** One changeset, `"@qadi/devtools": patch`. No public type changes (C16), and the behaviour
  changes are defect fixes. **No release step is planned.** Releasing needs the user's explicit go-ahead.
- **Overlaps (wave 5).**
  - **ARCH-48** (fixture fields described once) edits `SimulationSession.ts` (chip commands) and `Simulator.tsx`. This plan
    touches `SimulationSession.ts` only in T3: `policyChoice`'s equality and `choosePolicy`'s lookup call
    `Catalogue.ts`'s new helpers, and `unlisted` moves out. That is about ten lines in symbols ARCH-48 does not
    edit. **Merge order is free.** Whoever lands second rebases T3's three call sites. Both plans edit
    `spec/traceability.md` (different rows).
  - **ARCH-57** (loose ends): its "gate writer resolved once on `QadiContextValue`" is `@qadi/react`, and
    "`fixturePortsLayer` takes the setup union" is `SimulationSource.ts`. **No file overlap expected.** Re-check at T0
    in case ARCH-57 also touches `DevtoolsDock.tsx`'s `gates` threading.
  - **ARCH-55** (named-export core barrel): this plan imports `DEFAULT_MAX_DEPTH`, `fromJson`, `toJson`, `policyDepth`,
    `simplify` and `PolicyDecodeTooDeep` from `@qadi/core`. All are public today, and ARCH-55 must keep them. That is a
    note, not a dependency.
  - **ARCH-53** and **ARCH-54** touch `@qadi/react` hydration and the devtools `Source`. There is no overlap.
- **Prior plans that settled things here (do not re-plan).** ARCH-20 D-20-a (one store helper), D-20-b (sync commands,
  Effects only for runs) and D-20-g (the dock owns a screen's session). ARCH-24 (`ExternalStore`, `useRunningStore`).
  ARCH-33 D-33-a (one `HeldChoice` module), D-33-b (an evicted choice stays, marked) and D-33-c (pin the head on first
  sight). ARCH-40 D-40-a/c (panels and screen mechanics private), D-40-d/g (named barrels, gated).

## 5. Decisions needed before work starts

### D-50-a — Is the explorer session part of the public interface?
- **(A) Package-private.** `model/ExplorerSession.ts` and `react/useExplorerSession.ts` stay out of both barrels. ADR-047's
  1.6 amendment calls "a screen's mechanics … and the panels the dock composes" package-private, and the explorer has
  no non-React consumer: ADR-QD-049's CLI renders the merged timeline, not a policy editor. The website's "three stores"
  sentence (`apps/website/…/packages/devtools.md`, "What it renders") stays true. There are no gate-13 rows, no
  surface-test lines and no published names. It can be promoted later by adding barrel lines and rows.
- **(B) Public, as a fourth store.** It joins `makeSimulationSession` in the root barrel (`makeExplorerSession`,
  `ExplorerSession`, `ExplorerSnapshot`, `ExplorerShown`, `ExplorerView`, `DraftOrigin`, `JsonPane`, `Simplification`,
  `DepthReading`, `ExplorerSessionInit`: ten names by D-40-b's closure rule), and `useExplorerSession` joins the React
  barrel. That needs ten-plus overview rows, surface lines and a website edit. It would let a host build its own
  explorer, which nobody has asked for.
- **Recommendation: A.** The simulator is public because "the simulator a host drives is `makeSimulationSession`" (ADR-047
  1.6). Nothing drives the explorer except the dock.
- **status: open**

### D-50-b — Who owns the session, and what `PolicyExplorer` takes
- **(A) The dock owns it. `PolicyExplorer` takes a required `session: ExplorerSession` and nothing else.** The dock calls
  `useOwnedExplorerSession(sightings)` beside `useOwnedSimulationSession`. The panel is private (C16), so exactly one
  caller exists, and one ownership path means one set of tests.
- **(B) As the Simulator does:** `session?` is optional, and a standalone `<PolicyExplorer sightings>` owns its own
  (`OwnedSimulator`/`SharedSimulator`'s split). This keeps today's props for tests, but it is a second path into a private
  panel that no host can mount.
- **(C) The explorer keeps owning its state, and the dock keeps it mounted but hidden.** That fixes C8 without a model, but it
  changes every other tab's lifecycle (effects keep running) and leaves C1–C5 and C10–C12 where they are.
- **Recommendation: A.** Tests construct a session with `makeExplorerSession({ sightings })` directly, which is the point.
- **status: open**

### D-50-c — How a preview is represented
- **(A) A flag. The previewed tree is always `simplify(policy)` of the policy shown now.** `previewing: boolean` in the
  session, and the snapshot's `tree` is `previewing ? simplified : policy`. `apply` sets the draft to that same
  `simplified`. A preview of a policy other than the shown one is then **unrepresentable**, so C10 cannot recur even if a
  reset is forgotten. Every change of the shown policy (`choose`, `load`, `apply`) also clears the flag, so a new policy
  never opens already previewed.
- **(B) Keep a stored `Policy`, and clear it on every change of the shown policy.** This is today's representation plus the
  missing resets. The defect class stays representable, and the next new command must remember the reset.
- **Recommendation: A.** It makes BEH-QD-213's "previewed before it is applied" true by construction. That is the
  depth this plan is for.
- **status: open**

### D-50-d — What a pending paste and its refusal belong to
- **(A) Both belong to the shown policy, and a refusal to the text it refused.** The unloaded edit (`pending`) is
  dropped whenever the shown policy changes (`choose`, a successful `load`, `apply`), as `seenPolicy` does today. It
  **survives** `setView` (fixes C12) and a rail reorder or eviction (the shown policy did not change). The refusal is
  dropped whenever `pending` is dropped **and** on `editJson` (once the text changes, the refusal describes nothing on
  screen; fixes C11). A `load` whose decoded policy is `Equal.equals` to the shown one makes no draft: it clears
  `pending` and the refusal, and the rail highlight stays. A `load` with nothing pending is a no-op.
- **(B) As today, plus only the resets the probes need** (clear the refusal on `apply`, lift the buffer above the toggle).
  This is smaller, but "a refusal after the text changed" stays (keystrokes keep a stale message).
- **Recommendation: A.** It is one rule ("everything in the JSON pane describes what is in the text box") and
  it is checkable by the T6 property.
- **status: open**

### D-50-e — The role viewer's choice, which the same tab switch loses (C13)
- **(A) A dock-owned held-choice store in `HeldChoice.ts`.** `makeHeldChoiceStore<A>(list, same)` (about 35 lines on
  `makeExternalStore`) has `setList` (pins with `pinHead`), `choose(value)` and a snapshot of `{ list, choice: HeldChoice<A> }`.
  The dock owns one for roles (`useOwnedHeldChoice(roles, sameRole)`), `RoleViewer` takes it as a prop and keeps no
  state, and `sameRole` moves to `RoleTree.ts`. The store goes under the mutation gate, and `RoleViewer.tsx:45`'s render-phase pin goes.
- **(B) Defer.** Note C13 in the wave tracker and leave `RoleViewer` as it is. INV-QD-107 then stays false for one screen.
- **(C) Lift `held` into the dock as a plain `useState<Role | undefined>`.** This is smaller, but it keeps the pin in render
  (now the dock's) and outside the gates.
- **Recommendation: A.** It is the same defect and the same fix, and it needs no second abstraction: the
  explorer session uses the same `pinHead`/`resolveHeld` directly, and the store is a thin adapter over them.
- **status: open**

### D-50-f — Where the paste is decoded and the policy encoded
- **(A) In the model, synchronously.** `load()` runs `Effect.runSyncExit(fromJson(text))`. On success the policy becomes
  the draft. A failure yields `formatDecodeFailure(error)`, and a defect yields a refusal of the form `"the decoder failed
  unexpectedly: " + Cause.pretty(cause)` instead of a throw out of a click handler. Encoding is
  `Effect.runSyncExit(toJson(policy))`, memoised per policy, giving `Encoded{text}` or `Unencodable{reason}`.
  `formatDecodeFailure` moves to `ExplorerSession.ts` unchanged and is mutation-gated.
- **(B) `load` returns an `Effect<void>` the adapter runs** (`SimulationSession.run`'s shape). The `runSync` moves back
  into the view, and a sync-only operation gains an async-looking interface.
- **(C) Add a synchronous `fromJsonResult` to `@qadi/core`.** That is a public core addition (a gate-13 row) for one private
  consumer, and it collides with ARCH-55's barrel work.
- **Recommendation: A.** `fromJson`/`toJson` are total synchronous Effects. Model code may run a synchronous
  Effect to a value, as long as it never forks (ARCH-20's rule).
- **status: open**

### D-50-g — Spec shape
- **(A) Amend, don't add an ADR.** ADR-QD-047 gets a Rev 1.7 dated block ("the explorer's state is model too, held by a
  package-private `ExplorerSession` the dock owns; a held choice the role viewer shows likewise"), and `index.yaml`'s
  status line follows. `28-devtools-screens.md` gets a new BEH-QD-NEXT ("What the explorer shows is a session the dock
  owns") with four requirements (survives a tab switch; a preview belongs to the policy it previews and is what `apply`
  applies; the JSON pane describes the text in it; the paste decodes through the real codec in the model). BEH-QD-211's
  last requirement and BEH-QD-213 gain one sentence each. INV-QD-107's statement adds "leaving the screen and returning
  is not a choice", and its Source and Enforcement name the session and the store.
- **(B) A new ADR-QD-NEXT, "The explorer is a session".** It is heavier, and the decision is ADR-047's 1.2 amendment applied
  to another screen.
- **Recommendation: A.**
- **status: open**

## 6. Tasks

Ordered. **T1 is a defect patch that ships alone ahead of the refactor.** T2's tests are written red and go green
in T5 (explorer) and T7 (roles). T3 needs no decision.

### T0 — Re-verify the evidence at the branch point
- **Status:** [ ] todo
- **Depends on:** —
- **Files:** none (read-only), plus the scratch probes in `$P` (§1)
- **Steps:**
  1. `git fetch && git switch -c arch-50-explorer-session origin/main` and record `git rev-parse --short HEAD` in §10.
  2. Re-run §1's probes (`cd packages/devtools && ./node_modules/.bin/vitest run --config $P/vitest.config.mts
     --silent=false --reporter=verbose`). If `$P` is gone, rebuild it from §1's description: the six probes are short
     and their inputs and expected outputs are in the table.
  3. Re-read the symbols, not the lines: `PolicyExplorer`, `choose`, `onLoad`, `JsonView`, `Toolbar`, `DepthLine`,
     `formatDecodeFailure` (`PolicyExplorer.tsx`); `Screen` and `useOwnedSimulationSession`'s call (`DevtoolsDock.tsx`);
     `RoleViewer` (`RoleViewer.tsx`); `pin`, `policyChoice`, `choosePolicy`, `unlisted` (`SimulationSession.ts`);
     `resolveHeld`, `pinHead` (`HeldChoice.ts`).
  4. Check what siblings landed: `git log --oneline origin/main -- packages/devtools/src` for ARCH-48 (`SimulationSession.ts`)
     and ARCH-57 (`DevtoolsDock.tsx`). If ARCH-48 landed, rebase T3's three call sites onto it. If ARCH-57 touched the dock's
     `gates` threading, merge around it.
  5. `grep -rn "PolicyExplorer\|RoleViewer" packages examples apps/website/src features --include=*.ts --include=*.tsx`:
     confirm that the dock and the two test files are the only importers (C16).
- **Tests:** none added.
- **Verify:** the probe outputs match §1's table. `pnpm vitest run packages/devtools/test/react/PolicyExplorer.test.tsx
  packages/devtools/test/react/RoleViewer.test.tsx packages/devtools/test/model/HeldChoice.test.ts` → 53 pass.
- **Done when:** every C-row is re-tagged in §10 (unchanged or with its new location).

### T1 — Patch: a preview and a refusal belong to the policy shown (C10, C11, C12), test-first
- **Status:** [ ] todo
- **Depends on:** T0. No decision needed (the patch is the minimal form of D-50-c/d; T4 replaces it).
- **Files:** `packages/devtools/test/react/PolicyExplorer.test.tsx`, `packages/devtools/src/react/PolicyExplorer.tsx`,
  `.changeset/explorer-preview-follows-policy.md` (*new*)
- **Steps:**
  1. Write three failing tests in `PolicyExplorer.test.tsx`, a new `describe("what the panes describe")`:
     - "loading a paste ends a preview of the previous policy": probe P2 as a test. After load and JSON→Tree, the
       tree is the pasted `any of` (3 nodes) and the simplify button reads `simplify`, not `cancel`.
     - "a refusal leaves with the text it refused": probe P3. After simplify+apply, `qadi-policy-json-error` is absent.
     - "an unloaded edit survives a look at the tree": probe P3b without the load. Type `nope`, JSON→Tree→JSON, and
       the textarea still reads `nope`.
     Run them and see all three fail for the reasons in §1.
  2. Fix in place, as small as possible. In `onLoad`'s success branch add `setPreview(undefined)`. In `Toolbar`'s
     `onApply` handler add `setPasteError(undefined)`. Lift `JsonView`'s `text`/`seenPolicy` pair into `PolicyExplorer`
     (two `useState`s move up a level, and the `seenPolicy` reset stays the same idiom), and pass `text`/`onEdit` down so
     the buffer outlives the toggle.
  3. Changeset `"@qadi/devtools": patch`: "The policy explorer no longer previews a policy it has stopped showing: loading a
     paste ends the preview, so `apply` applies the tree on screen. A paste's refusal is cleared once a simplification
     replaces the policy, and an unloaded paste survives switching to the tree and back."
- **Tests:** the three above. The existing 28 stay unchanged and green.
- **Verify:** `pnpm vitest run packages/devtools/test/react/PolicyExplorer.test.tsx`; `pnpm typecheck`;
  `node scripts/check-house-style.mjs`.
- **Done when:** the three new tests fail before step 2 and pass after it. This task can merge on its own as a patch PR.

### T2 — Red: a tab round trip keeps what the explorer and the role viewer show (C8, C13)
- **Status:** [ ] todo
- **Depends on:** T0
- **Files:** `packages/devtools/test/react/DevtoolsDock.test.tsx`
- **Steps:**
  1. In `describe("the six screens")`, add (after "the selected tab survives a re-render"):
     - "the explorer keeps its chosen policy across a tab round trip": probe P1. Mount with `catalogue.policies`
       `{ canRead, canWrite }`, choose rail item 1, Log, Policies, and the tree is still `doc:write`.
     - "the explorer keeps a pasted draft, its view and an unloaded edit across a tab round trip": probe P1b, extended.
       Paste and load `hasRole("editor")`, then type an unloaded `{` edit, Log, Policies. The JSON view is shown and the
       textarea reads the unloaded edit. JSON→Tree shows `editor`.
     - "a new head during the visit does not change what the explorer shows": mount with a record source over
       `[read]`, open Policies (pins `read`), go to Log, ingest a decision on `write` (a second `sourceFromRecords` via
       `rerender`, or the existing helper pattern), return to Policies, and the tree is still `doc:read`.
     - "the role viewer keeps its chosen role across a tab round trip": probe P4.
  2. Run them and record that all four fail (each prints the head). They stay red on the branch until T5 and T7. **Do not
     merge T2 alone.**
- **Tests:** four above.
- **Verify:** `pnpm vitest run packages/devtools/test/react/DevtoolsDock.test.tsx`. The four new tests fail and the rest pass.
- **Done when:** the red runs are recorded in §10.

### T3 — One "choose a sighting" rule in `Catalogue.ts` (C7)
- **Status:** [ ] todo
- **Depends on:** T0 (no decision; behaviour-preserving)
- **Files:** `packages/devtools/src/model/Catalogue.ts`, `packages/devtools/src/model/SimulationSession.ts`,
  `packages/devtools/test/model/Catalogue.test.ts`
- **Steps:**
  1. Test-first in `Catalogue.test.ts`. `sameSighting` is true for two sightings of `Equal.equals` policies with different
     counts and labels, and false for different policies. `sightingFor(sightings, policy)` returns the listed element
     (the list's own object, so its tally is current) when one is `Equal.equals`, and otherwise an unlisted sighting
     (`label: policyLabel(policy)`, `count: 0`, `allows/denies/errors: 0`, `lastAt: undefined`).
  2. In `Catalogue.ts`, add and export (package-private, as the module is) `sameSighting = (a, b) => Equal.equals(a.policy,
     b.policy)` and `sightingFor`, moving `SimulationSession.ts`'s `unlisted` into it.
  3. In `SimulationSession.ts`: `policyChoice` passes `sameSighting` to `resolveHeld`, and `choosePolicy` sets
     `held = sightingFor(sightings, policy)`. Delete `unlisted`.
- **Tests:** the new `Catalogue.test.ts` cases. `SimulationSession.test.ts` stays unchanged and green (it pins the behaviour).
- **Verify:** `pnpm vitest run packages/devtools/test/model/Catalogue.test.ts packages/devtools/test/model/SimulationSession.test.ts`;
  `pnpm typecheck`; `pnpm circular`.
- **Done when:** `grep -rn "Equal.equals(a.policy, b.policy)" packages/devtools/src` shows only `Catalogue.ts`'s
  `sameSighting` (the explorer's copy goes in T5).

### T4 — `model/ExplorerSession.ts`, test-first
- **Status:** [ ] todo
- **Depends on:** T3, D-50-c, D-50-d, D-50-f
- **Files:** `packages/devtools/src/model/ExplorerSession.ts` (*new*), `packages/devtools/test/model/ExplorerSession.test.ts` (*new*)
- **Steps:**
  1. Write the model tests first (see "Tests" for the list), against this interface:
     ```ts
     export type ExplorerView = "Tree" | "Json";
     export type DraftOrigin = "Pasted" | "Simplified";

     /** What the main pane shows. A draft hides the rail highlight and the eviction note, as today. */
     export type ExplorerShown =
       | { readonly _tag: "Listed"; readonly sighting: PolicySighting; readonly index: number }
       | { readonly _tag: "Evicted"; readonly sighting: PolicySighting }
       | { readonly _tag: "Draft"; readonly policy: Policy; readonly origin: DraftOrigin };

     export interface JsonPane {
       /** The unloaded edit when there is one, else the shown policy's encoding (or why it has none). */
       readonly text: string;
       readonly edited: boolean;
       /** Why the last load was refused. Present only while the text it refused is still the text shown. */
       readonly refusal: string | undefined;
     }

     export interface Simplification {
       readonly simplified: Policy;
       /** False when `simplify` returns an equal policy (BEH-QD-213: "already as simple"). */
       readonly changes: boolean;
       readonly previewing: boolean;
     }

     export interface DepthReading {
       readonly depth: number;
       readonly bound: number;      // DEFAULT_MAX_DEPTH
       readonly overBound: boolean; // depth > bound: `evaluate` would raise PolicyTooDeep
     }

     export type ExplorerSnapshot =
       | { readonly _tag: "Empty"; readonly sightings: ReadonlyArray<PolicySighting> }
       | {
           readonly _tag: "Showing";
           readonly sightings: ReadonlyArray<PolicySighting>;
           readonly shown: ExplorerShown;
           /** What the toolbar, the depth line and the JSON pane act on. */
           readonly policy: Policy;
           /** The rail item to highlight: only a listed choice with no draft over it. */
           readonly railIndex: number | undefined;
           readonly view: ExplorerView;
           /** What the tree draws: the simplification while previewing, else `policy`. */
           readonly tree: Policy;
           readonly simplification: Simplification;
           readonly depth: DepthReading;
           readonly json: JsonPane;
         };

     export interface ExplorerSession {
       readonly subscribe: (listener: () => void) => () => void;
       readonly getSnapshot: () => ExplorerSnapshot;
       /** The rail as it is now. Pins the head once, so the first policy shown stays shown (INV-QD-107). */
       readonly setSightings: (sightings: ReadonlyArray<PolicySighting>) => void;
       /** Shows a policy, held by value. Drops a draft, a preview, an unloaded edit and its refusal. */
       readonly choose: (policy: Policy) => void;
       readonly setView: (view: ExplorerView) => void;
       readonly editJson: (text: string) => void;
       /** Decodes the unloaded edit through `fromJson`: a draft, or a refusal kept beside the text. */
       readonly load: () => void;
       readonly setPreviewing: (on: boolean) => void;
       /** Applies the previewed simplification as a draft. A no-op while nothing is previewed (ADR-QD-030). */
       readonly apply: () => void;
     }

     export interface ExplorerSessionInit {
       readonly sightings?: ReadonlyArray<PolicySighting>;
     }

     export const makeExplorerSession: (init?: ExplorerSessionInit) => ExplorerSession;
     ```
  2. Implement it as a closure over `makeExternalStore`, `SimulationSession`'s shape. State: `sightings`, `held:
     PolicySighting | undefined` (pinned at construction with `pinHead(sightings, undefined)`, and in `setSightings`),
     `draft: { policy; origin } | undefined`, `view`, `previewing`, `pending: string | undefined`, `refusal: string | undefined`.
     `build()` resolves `held` with `resolveHeld(sightings, held, sameSighting)` through `Match.tagsExhaustive`, then
     derives every snapshot field. `commit()` calls `store.publish(build())`.
  3. Memoise the three pure readings per policy object: `simplify`, `toJson` encoding and `policyDepth`. Each holds one
     `lastPolicy`/`lastValue` pair and recomputes when the policy reference changes, as `Toolbar`'s `useMemo` does today
     (§9: `setSightings` runs every timeline tick).
  4. The rules, each in one place:
     - `setSightings(next)`: return if `sameElements(next, sightings)` (the helper `SimulationSession.ts` already has;
       move it to `ExternalStore.ts` or duplicate it privately; T4 picks one and records it in §10). Otherwise set `held =
       pinHead(next, held)` and commit. The shown policy cannot change here, because a reorder or eviction is resolved, not
       re-chosen.
     - `choose(policy)`: no-op (no notify) when `held` is `Equal.equals` to `policy` **and** there is no draft, no pending
       edit, no refusal and no preview. Otherwise set `held = sightingFor(sightings, policy)` and drop the draft, `previewing`,
       `pending` and `refusal`.
     - `setView(v)`: no-op when equal. Changes nothing else (D-50-d: `pending` survives).
     - `editJson(text)`: no-op when `text === pending`. Otherwise set `pending = text` and drop `refusal`.
     - `load()`: no-op when `pending === undefined`. Run `Effect.runSyncExit(fromJson(pending))`. A failure sets `refusal =
       formatDecodeFailure(error)`, or a defect sentence (D-50-f), and keeps `pending`. A success equal to the shown policy
       drops `pending` and `refusal` only. A different success sets `draft = { policy, origin: "Pasted" }` and drops
       `pending`, `refusal` and `previewing`.
     - `setPreviewing(on)`: no-op when equal or when there is no policy.
     - `apply()`: no-op unless `previewing`. Otherwise set `draft = { policy: simplified, origin: "Simplified" }` and drop
       `previewing`, `pending` and `refusal`.
  5. Move `formatDecodeFailure` here unchanged (its WZ-01 doc comment comes with it). It is not exported, and it is tested
     through `load`.
  6. Module doc comment in the house shape: one line ("The policy explorer's state, as a store."), then the why (the
     ADR-047 1.2 argument, C8/C10–C12, the three rules that each live in one function: held choice, preview, pane).
- **Tests** (`ExplorerSession.test.ts`, written before step 2, `@effect/vitest` `it`, no DOM):
  - Construction: an empty rail is `Empty`. A non-empty one is `Showing`, `Listed` at 0, `railIndex` 0, view `Tree`, not
    previewing, `json.text` equal to `Effect.runSync(toJson(head))`, `edited` false.
  - Held choice (moved from the DOM, `selection and drafts`): it keeps the head pinned when a new head arrives; it keeps a
    chosen policy through a reorder (`railIndex` follows the policy); it keeps a policy that left the rail as `Evicted` with
    `railIndex` undefined; `choose` of an unlisted policy is `Evicted` at once.
  - Drafts: a successful load is `Draft{Pasted}` with `railIndex` undefined; `choose` drops it; a draft survives a reorder
    (the old "keeps a pasted draft and its rail highlight in step after a reorder"); loading a policy equal to the shown
    one makes no draft.
  - Simplify (moved from `simplify` describe, by tree shape): it previews a collapse and a flattening (`tree` equal to
    `simplify(policy)`); `changes` is false for `not(not(x))` and for a leaf; preview, cancel and apply form two separate
    actions; `apply` without a preview is a no-op that does not notify; after `apply`, `changes` is false.
  - The C10 rule: previewing, then load of a different policy, gives `previewing` false and `tree` equal to the draft. Then
    `setPreviewing(true)` and `apply()` give a draft equal to `simplify(draft)`.
  - The JSON pane (moved from the JSON describe): the text is `toJson`'s output; a refused paste keeps `pending` and gives a
    path-relative refusal with no `"SchemaError("`; a 5,000-deep `Not` nest's refusal names "decode limit"; non-JSON `}{`
    is refused; `edited` text is dropped on `choose` (the old "clears an edited-but-unloaded paste"); the C11 rule (a
    refusal is dropped by `editJson`, `apply` and `choose`); the C12 rule (`pending` survives `setView` both ways); the
    text round-trips (`fromJson(snapshot.json.text)` equals `snapshot.policy`).
  - Depth: `depth`/`bound`/`overBound` for a shallow policy and for one nested past `DEFAULT_MAX_DEPTH`.
  - Identity (the `SimulationSession.test.ts` convention): every no-op command returns the same snapshot reference and
    calls no listener; every effective command notifies exactly once.
  - Defect path: no policy text makes `fromJson` die, so the exit-to-refusal step is its own function,
    `refusalOf(exit: Exit.Exit<Policy, PolicyDecodeTooDeep | Schema.SchemaError>): string | undefined`, exported from the
    (package-private) module and tested directly. `Exit.die(new Error("boom"))` gives a sentence naming "failed
    unexpectedly", `Exit.fail(new PolicyDecodeTooDeep({ maxDepth: 256 }))` gives the decode-limit sentence, and a success
    gives `undefined`. `load` calls it, so the branch is covered without an injected decoder and without an `as`.
- **Verify:** `pnpm vitest run packages/devtools/test/model/ExplorerSession.test.ts`; `pnpm typecheck`;
  `node scripts/check-house-style.mjs`; `pnpm circular`.
- **Done when:** all model tests pass and `ExplorerSession.ts` shows 100% branches in the coverage table of
  `pnpm vitest run --coverage --project devtools`. Read the row only: the run's overall pass/fail is not meaningful on one project.

### T5 — The dock owns the explorer's session, and `PolicyExplorer` only renders (C1–C5, C8)
- **Status:** [ ] todo
- **Depends on:** T2, T4, D-50-a, D-50-b
- **Files:** `packages/devtools/src/react/useExplorerSession.ts` (*new*), `packages/devtools/src/react/PolicyExplorer.tsx`,
  `packages/devtools/src/react/DevtoolsDock.tsx`
- **Steps:**
  1. `useExplorerSession.ts` (package-private; the "use client" header and module comment follow `useSimulationSession.ts`):
     - `useOwnedExplorerSession(sightings)` does `useState(() => makeExplorerSession({ sightings }))` and then
       `useLayoutEffect(() => session.setSightings(sightings), [session, sightings])`, the same before-paint dispatch as
       `useOwnedSimulationSession`. It needs no dispose, because the session holds no fiber.
     - `useExplorerSnapshot(session)` returns `useRunningStore(session, undefined, [session])`, reusing the shared read and
       adding no new subscription code.
  2. `PolicyExplorer.tsx`: props become `{ readonly session: ExplorerSession }` (D-50-b). Delete every `useState`, the
     render-phase pin, `choose`, `onLoad`, `formatDecodeFailure`, the `Effect`/`Result`/`Schema`/`SchemaIssue`/`Equal`
     imports and the `@qadi/core` value imports except types. The rail maps `snapshot.sightings` with `onClick={() =>
     session.choose(entry.policy)}` and highlights `index === snapshot.railIndex`. `Toolbar` reads `snapshot.view`,
     `snapshot.simplification`, and dispatches `setView`/`setPreviewing`/`apply`. `DepthLine` reads `snapshot.depth`.
     `JsonView` reads `snapshot.json` and dispatches `editJson`/`load`. The tree draws `inspect(snapshot.tree, undefined)`
     with `showStatus={false}` (INV-QD-041 untouched). The eviction note shows for `shown._tag === "Evicted"`. Dispatch on
     `snapshot._tag` and `shown._tag` with `Match.tagsExhaustive` or a two-way `_tag` comparison. The wording strings stay
     exactly as they are.
  3. `DevtoolsDock.tsx`: beside `useOwnedSimulationSession`, add `const explorer = useOwnedExplorerSession(sightings);`
     with a comment in the house shape (one line saying what it is, then "owned here rather than by the screen, for the reason
     the simulator's is", citing INV-QD-107). Thread `explorer` through `Screen`'s props, and the `policies` entry becomes
     `<PolicyExplorer session={props.explorer} />`. `Screen` no longer passes `sightings` to the explorer.
- **Tests:** T2's three explorer round-trip tests turn green. All `PolicyExplorer.test.tsx` tests are temporarily
  adapted to construct a session (`render(<PolicyExplorer session={makeExplorerSession({ sightings })} />)`, with
  `rerender` replaced by `act(() => session.setSightings(next))`) and still pass. T6 then thins them.
- **Verify:** `pnpm vitest run packages/devtools/test/react`; `pnpm typecheck`; `node scripts/check-house-style.mjs`;
  `pnpm circular`; `grep -n "useState\|runSync\|SchemaIssue" packages/devtools/src/react/PolicyExplorer.tsx` → nothing.
- **Done when:** T2's explorer tests pass, the explorer suite passes, and success criterion 4's explorer half holds.

### T6 — Replace, don't layer: thin the DOM suite, add the property
- **Status:** [ ] todo
- **Depends on:** T5
- **Files:** `packages/devtools/test/react/PolicyExplorer.test.tsx`, `packages/devtools/test/model/ExplorerSession.test.ts`
- **Steps:**
  1. Delete from `PolicyExplorer.test.tsx` every test whose rule T4 now pins in the model (the list is in §7). Keep the
     wording and wiring tests listed in §7, about 13 in all.
  2. Add one wiring test per command that has a control: rail click → `choose`, `Tree`/`JSON` button → `setView`, textarea
     change → `editJson`, `load` → `load`, `simplify`/`cancel` → `setPreviewing`, `apply` → `apply`. Each asserts the DOM
     after one click, never the rule.
  3. Add the property to `ExplorerSession.test.ts`: `FastCheck.assert(FastCheck.property(arbitrary command list, …))` over
     a small policy alphabet (`hasPermission(read)`, `hasPermission(write)`, `allOf([hasPermission(read)])`,
     `anyOf([hasRole("a"), hasRole("b")])`), with commands `setSightings(permutation or sub-list)`, `choose(p)`,
     `setView`, `editJson(toJson(p) | "}{" | "")`, `load`, `setPreviewing(bool)`, `apply`. Fold the same commands through a
     ten-line reference model (`expectedPolicy`) and assert after each step:
     (a) `snapshot.policy` equals the reference model's, so the shown policy changes only on `choose`, a successful
     different `load` or `apply`, never on `setSightings` (INV-QD-107);
     (b) while `previewing`, `tree` equals `simplify(policy)`, and the next `apply` makes `policy` equal to that `tree`
     (BEH-QD-213);
     (c) `json.refusal !== undefined` implies `json.edited` is true;
     (d) a command the reference model calls a no-op leaves `getSnapshot()` reference-equal.
  4. Run the explorer half of coverage and confirm `react/PolicyExplorer.tsx` ≥ 90 on all four metrics.
- **Tests:** as above.
- **Verify:** `pnpm vitest run packages/devtools/test/react/PolicyExplorer.test.tsx packages/devtools/test/model/ExplorerSession.test.ts`;
  `pnpm coverage` is authoritative, because its per-glob thresholds are measured over the whole workspace run. A quicker
  read of the devtools numbers only (do not trust its pass/fail) is `pnpm vitest run --coverage --project devtools`.
- **Done when:** no rule is pinned in both places, the property runs green at fast-check's default 100 runs, and both
  coverage bars hold.

### T7 — The role viewer's choice is dock-owned too (C13)
- **Status:** [ ] todo
- **Depends on:** T2, D-50-e (= A). If D-50-e = B, mark this task `[-] dropped`, delete T2's role test, and record C13 in
  the wave tracker. If it = C, follow C's description instead.
- **Files:** `packages/devtools/src/model/HeldChoice.ts`, `packages/devtools/src/model/RoleTree.ts`,
  `packages/devtools/src/react/RoleViewer.tsx`, `packages/devtools/src/react/useExplorerSession.ts` (or a sibling
  `useHeldChoice.ts`, *new*, if T7 prefers one hook per file; record the choice), `packages/devtools/src/react/DevtoolsDock.tsx`,
  `packages/devtools/test/model/HeldChoice.test.ts`, `packages/devtools/test/react/RoleViewer.test.tsx`
- **Steps:**
  1. Test-first in `HeldChoice.test.ts`: `makeHeldChoiceStore(list, same)` pins the head at construction; `setList` keeps a
     chosen value through a reorder and an eviction; `choose` holds by value; a no-op `setList` (same elements) and a
     `choose` of the held value do not notify.
  2. In `HeldChoice.ts` add `HeldChoiceSnapshot<A> = { readonly list: ReadonlyArray<A>; readonly choice: HeldChoice<A> }`,
     `HeldChoiceStore<A>` (`subscribe`, `getSnapshot`, `setList`, `choose`) and `makeHeldChoiceStore`. These are about 35
     lines on `makeExternalStore`, using `pinHead`/`resolveHeld`. Update the module comment: "the session, the
     explorer session and the role viewer's store each supply their list and their equality".
  3. `RoleTree.ts`: `export const sameRole = (a: Role, b: Role): boolean => a.name === b.name;` (package-private).
  4. `RoleViewer.tsx`: props become `{ choice: HeldChoiceStore<Role>; unknownParents? }`, and it reads the snapshot with
     `useRunningStore(choice, undefined, [choice])`. Delete `useState` and the render-phase pin. A chip click calls
     `choice.choose(candidate)`.
  5. Dock: `const roleChoice = useOwnedHeldChoice(catalogue?.roles ?? NO_ROLES, sameRole)`, with a module-scope
     `NO_ROLES` so an absent catalogue does not dispatch on every render. Thread it to `Screen`'s `roles` entry.
- **Tests:** the `HeldChoice.test.ts` additions. `RoleViewer.test.tsx` mounts with a store (`makeHeldChoiceStore(roles,
  sameRole)`), and its two keep-tests ("keeps the chosen role when the list is rebuilt in another order", "keeps a role that
  left the list") move to `HeldChoice.test.ts` as store tests. T2's role round-trip test turns green.
- **Verify:** `pnpm vitest run packages/devtools/test/model/HeldChoice.test.ts packages/devtools/test/react/RoleViewer.test.tsx
  packages/devtools/test/react/DevtoolsDock.test.tsx`; `pnpm typecheck`; `pnpm circular`.
- **Done when:** all four T2 tests pass, and `grep -n useState packages/devtools/src/react/RoleViewer.tsx` → nothing.

### T8 — Mutation and coverage for the moved rules
- **Status:** [ ] todo
- **Depends on:** T6, T7
- **Files:** tests only, as the survivors require
- **Steps:**
  1. `pnpm stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/ExplorerSession.ts,packages/devtools/src/model/HeldChoice.ts,packages/devtools/src/model/Catalogue.ts`
     (CLI override of `mutate`; the config itself is unchanged).
  2. For each survivor, add the test that kills it, or record in §10 why it is equivalent. Expected hot spots are each
     no-op guard's comparison, the `Equal.equals` in `load`'s "equal policy" branch, the `overBound` comparison (`>` vs `>=`,
     which is killed by a depth-exactly-64 test), and `sameElements`.
  3. Run the full devtools Stryker config once to confirm the package score has not dropped below its last recorded value.
- **Tests:** whatever survivors require.
- **Verify:** the scoped run is ≥ 90 with no non-equivalent survivor; `pnpm stryker run stryker.devtools.mjs` is ≥ 80 (break).
- **Done when:** success criterion 6 holds and its numbers are in §10.

### T9 — Spec, ADR, traceability, BDD, docs, changeset
- **Status:** [ ] todo
- **Depends on:** T5, T7, D-50-g
- **Files:** `spec/decisions/047-a-headless-devtools-model.md`, `spec/decisions/index.yaml`,
  `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md` (CCR register),
  `spec/devtools-spec/02-screens.md`, `features/features/devtools-screens/devtools-screens.feature`,
  `features/features/devtools-screens/devtools-screens.steps.test.ts`, `.changeset/explorer-session.md` (*new*)
- **Steps:** follow §8 item by item. Then:
  1. BDD: add a `Scenario: Leaving the Policies tab keeps what it shows` (`Given the application declares "canRead" and
     "canWrite"`, `When the reviewer chooses "canWrite" in the policy explorer`, `And opens the log and comes back`,
     `Then the policy explorer still shows "canWrite"`). Implement it in the steps file through `DevtoolsDock`, as the role
     scenarios already are. If D-50-e = A, add the role twin.
  2. Changeset `"@qadi/devtools": patch`: "The dock keeps the policy explorer's chosen policy, a pasted or simplified draft,
     the Tree/JSON view and an unloaded paste when you switch tabs and come back, and the role viewer keeps its role. What
     the explorer shows moved into a model the dock owns; no exported name changed." (If D-50-a = B, it becomes `minor`,
     lists the new names, and is still not breaking.)
- **Tests:** the BDD scenario(s).
- **Verify:** `pnpm test:bdd`; `pnpm spec:examples`; `pnpm spec:verify:strict`; `node scripts/check-devtools-claims.mjs`;
  `node scripts/check-api-surface.mjs` (unchanged under D-50-a = A); `node scripts/check-dod-table.mjs`.
- **Done when:** every §8 row is done and those six commands are green.

### T10 — Full gate
- **Status:** [ ] todo
- **Depends on:** T1–T9
- **Files:** none
- **Steps:** `pnpm check` (or `pnpm check:pr` on a non-release PR; mutation then runs on the release PR per AGENTS.md §15,
  and T8 has already run the devtools config).
- **Verify:** `pnpm check` exits 0.
- **Done when:** green, with the SHA recorded in §10.

### T11 — Update the tracker
- **Status:** [ ] todo
- **Depends on:** T10
- **Files:** `.planning/architecture/README.md` (wave-5 section), this plan's frontmatter and §10
- **Steps:** set `status: done`, record decisions taken, list the CCR/ADR numbers assigned, and note the ARCH-48 rebase if
  one happened.
- **Done when:** `./progress.sh 50` reports every task `[x]` (or `[-]` with a reason).

## 7. Test strategy

**Replace, don't layer.** A rule is pinned once, at the lowest level that can see it: the model for rules, the DOM for
wording and wiring.

| Today (`PolicyExplorer.test.tsx`, 28) | After |
| ------------------------------------- | ----- |
| the rail: empty-state text; lists counts; "never evaluated"; selecting shows it (4) | **stay DOM** (wording + one `choose` wiring test) |
| the structure view: no verdict; names requirements; field restriction; path-aware field spec (4) | **stay DOM**: INV-QD-041 is a rendering property of `PolicyTree` with `showStatus={false}` |
| depth: shown beside the bound; flagged past the bound (2) | **model** for the numbers (`depth`/`overBound`), **one DOM** test for the sentence |
| simplify: previews collapse; previews flattening; double negation "already as simple"; nothing to simplify "already as simple"; cancel/apply (5) | **model** for collapse, flattening, `changes`, preview, cancel and apply. **DOM keeps two**: the two effect sentences (wording) |
| JSON view: shows `toJson`; loads a paste; refusal not a dump; decode-limit; not JSON; round-trips; clears unloaded edit (7) | **model** for all seven, with "round-trips" becoming "the pane's text decodes to the shown policy". **DOM keeps one**: the refusal renders in `qadi-policy-json-error` |
| selection and drafts: draft discarded on choose; rail un-highlights under a draft; keeps evicted; pins head; keeps through reorder; draft + highlight after reorder (6) | **model** for all six (`railIndex`, `shown`). **DOM keeps one**: the eviction sentence |
| T1's three defect tests | **model** (C10/C11/C12 rules) once T4 lands; the DOM copies are deleted in T6 |
| *(new)* six wiring tests (T6 step 2) | DOM |

The DOM file falls to about 13 tests plus 6 wiring tests, and `ExplorerSession.test.ts` gains about 35 example tests plus one property.

- **Survive unchanged:** `SimulationSession.test.ts` (T3 is behaviour-preserving), `DevtoolsDock.test.tsx`'s existing
  tests, `Catalogue.test.ts`'s existing tests, and `HeldChoice.test.ts`'s pure-function tests.
- **Move:** `RoleViewer.test.tsx`'s two keep-tests go to `HeldChoice.test.ts` as store tests (T7). The rest of
  `RoleViewer.test.tsx` (tree, provenance, cycle claim, unknown parents) stays DOM.
- **Delete:** the 28th explorer test as written, since it is core's codec round trip (`Policy.test.ts`'s FastCheck
  round-trip property, BEH-QD-058, already pins it). Its explorer-specific form ("what the pane shows decodes back to the
  policy shown") moves to the model.
- **Property:** T6's model-based property over random command sequences, with the four checks (a)–(d). This is the
  differential: the session against a ten-line reference fold. It replaces the hand-picked reorder and draft cases as
  the main guard, and the examples stay as readable documentation.
- **Mutation:** `ExplorerSession.ts`, `HeldChoice.ts`'s store and `Catalogue.ts`'s helpers sit under
  `stryker.devtools.mjs`, so no config edit is needed (C17). `ignoreStatic` means each per-call rule needs its own killing
  test, and T8 records the score.
- **BDD:** one scenario (two if D-50-e = A) under `@REQ-QD-025`, through the dock.
- **Coverage:** model files at 100% branches by T4/T7, `react/**` ≥ 90 after T6 (checked, not assumed).

## 8. Spec and documentation updates

| Document | Change |
| -------- | ------ |
| `spec/decisions/047-a-headless-devtools-model.md` | Rev 1.7, a dated amendment block: "**The explorer's state is model too.** Screen 3 held its chosen policy, its draft, its preview and its JSON pane in seven `useState`s across two views, and three of its rules were wrong where no model test and no mutation run could see them (a preview outliving its policy, a refusal outliving its text, an edit lost by a toggle). It also lived as long as its tab. It is `ExplorerSession` now, package-private (the 1.6 amendment's rule for a screen's mechanics), owned by `DevtoolsDock` as the simulator's session is. The role viewer's held choice is a `HeldChoiceStore` the dock owns, for the same reason." Change History row, Status line. |
| `spec/decisions/index.yaml` | ADR-QD-047's `status` gains "; amended 2026-10-NN (the explorer's state)". |
| `spec/behaviors/28-devtools-screens.md` | New **BEH-QD-NEXT — "What the explorer shows is a session the dock owns"** after BEH-QD-213, with four `REQUIREMENT` blocks: (1) leaving the Policies or Roles tab and returning MUST NOT change what it shows; (2) a preview MUST be of the policy shown, and `apply` MUST apply exactly the tree previewed; (3) everything the JSON pane shows MUST describe the text in it (an unloaded edit survives a view switch; a refusal leaves when its text changes); (4) a paste MUST decode through `fromJson`, in the model. A `ts` (not `typescript`) fence lists `makeExplorerSession`'s signature with the "Package-private since CCR-QD-NEXT" note in the ARCH-40 style. BEH-QD-211's last requirement paragraph: "…holds its selection by value, through one rule, `resolveHeld` (`HeldChoice.ts`), in a session the dock owns, so a tab switch is not a choice either". BEH-QD-213's "previewed before it is applied" paragraph gains "and what is applied is what was previewed". Change History 1.11. |
| `spec/invariants.md` | INV-QD-107's statement gains: "Leaving the screen and returning to it is not a choice." Source: `HeldChoice.ts` (`resolveHeld`, `pinHead`, `makeHeldChoiceStore`), `ExplorerSession.ts` (the explorer), `SimulationSession.ts` (the simulator), with the dock owning all three, and "no screen keeps a position as the choice or holds it in view state". Enforcement: `ExplorerSession.test.ts` (the property's check (a)), `HeldChoice.test.ts` (store), `DevtoolsDock.test.tsx` (the three round-trip tests). Change History 1.78. |
| `spec/traceability.md` | Behaviour 28's row adds `ExplorerSession.ts` to the model list and `useExplorerSession.ts` to the react list. INV-QD-107's row names the session and the store. New rows for `packages/devtools/test/model/ExplorerSession.test.ts` (BEH-QD-211, BEH-QD-213, BEH-QD-NEXT, INV-QD-037, INV-QD-107). `PolicyExplorer.test.tsx`'s row drops INV-QD-107 and BEH-QD-211 (now model), and keeps BEH-QD-212, BEH-QD-213 (wording) and INV-QD-041. `DevtoolsDock.test.tsx` gains BEH-QD-NEXT and INV-QD-107. `HeldChoice.test.ts` gains BEH-QD-NEXT. `RoleViewer.test.tsx` drops INV-QD-107. Change History row. |
| `spec/README.md` | CCR-QD-NEXT in the Document history register, naming every file above. |
| `spec/devtools-spec/02-screens.md` | §3: one paragraph, "**What the screen shows is kept across a tab switch.** The rail's choice, a pasted or simplified draft, the Tree/JSON view and an unloaded edit belong to a session the dock owns (BEH-QD-NEXT), so looking at the log and coming back changes nothing." No gate-12 phrase. §4 gets the same sentence for the role viewer if D-50-e = A. |
| `spec/overview.md` | **No change** under D-50-a = A (`node scripts/check-api-surface.mjs` confirms). Under B, rows for the ten root names and the React hook, plus `test/surface.test.ts`, `surface.tst.ts` and barrel lines. |
| `apps/website/src/content/docs/docs/packages/devtools.md` | **No change** under D-50-a = A ("three stores" stays true, and panels are already "not exports"). Under B, the Stores bullet gains `makeExplorerSession`. |
| `packages/devtools/README.md` | No change. It does not describe the explorer's state. |
| `.changeset/explorer-preview-follows-policy.md` (T1) and `.changeset/explorer-session.md` (T9) | `"@qadi/devtools": patch` each. Not breaking. **No release is run** without the user's explicit go-ahead. |

## 9. Risks and rollback

- **Per-tick rebuild cost.** The dock rebuilds `sightings` on every timeline tick, and each `setSightings` rebuilds the
  snapshot. Without T4 step 3's memos, every tick would re-run `simplify`, `toJson` and `policyDepth` on the shown policy
  even when nobody is on the Policies tab, which today costs nothing because the explorer is unmounted. *Shows up as* dock
  jank under a busy feed. *Mitigation:* the per-policy-reference memos. The policy object changes only when a newer
  sighting replaces it (`Catalogue.ts`'s `fresh`), so a tick that does not touch the shown policy recomputes nothing.
  A test pins it: spy-free, it asserts that two consecutive `setSightings` with the same shown policy object return a
  `simplification.simplified` with the same reference.
- **The dock now re-renders nothing new.** The dock does not subscribe to the explorer session (as with
  `useOwnedSimulationSession`), so a keystroke in the JSON pane re-renders only `PolicyExplorer`. Check this in T5 by
  confirming `DevtoolsDock` does not call `useExplorerSnapshot`.
- **Layout-effect ordering.** `setSightings` is dispatched from the dock's layout effect, after `PolicyExplorer`'s
  render read the previous snapshot. `useSyncExternalStore` re-renders before paint, which is what the simulator already
  relies on. If a flash shows in a test, it is this, and the fix is the same as the simulator's: construct with the
  first sightings (T5 step 1 does).
- **Behaviour changes a reviewer might notice.** (1) Loading a paste ends a preview (C10, a fix). (2) Typing clears a
  stale refusal (D-50-d). (3) Loading text equal to the shown policy no longer makes a draft, so the rail highlight
  stays (D-50-d). (4) The explorer and the role viewer remember across tabs (C8/C13, the point). All four are in the
  changesets.
- **ARCH-48 collision on `SimulationSession.ts`.** This is limited to T3's three call sites. Whoever lands second rebases. If
  ARCH-48 rewrites `choosePolicy`, T3 instead adds `sightingFor` and lets ARCH-48's version call it.
- **The role store widens `HeldChoice.ts`** from pure functions to "pure functions plus one store". If a reviewer prefers
  the module to stay pure, put the store in `model/HeldChoiceStore.ts` instead (one more file, same tests).
  That choice does not affect any other task.
- **Rollback.** T1 is an independent patch: revert its commit. T3–T7 revert as one commit set without touching any
  public name (D-50-a = A): `PolicyExplorer`/`RoleViewer` return to owning state, and the dock goes back to rendering them with
  `sightings`/`roles`. T9's spec edits revert with them. Nothing persisted or published depends on the session.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | Plan written. Evidence re-verified at `b655b3b` with six scratch probes (§1). Found three defects beyond the review (C10 preview outlives its policy, C11 refusal outlives its text, C12 unloaded edit lost by a toggle) and confirmed the role viewer's tab-switch loss (C13). The review's "pinning reimplemented in `SimulationSession`" is CHANGED: the session uses `HeldChoice`, and the duplicates are the two views' render-phase pins. | planning |
