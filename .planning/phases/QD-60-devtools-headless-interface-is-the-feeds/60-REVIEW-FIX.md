---
phase: QD-60-devtools-headless-interface-is-the-feeds
fixed_at: 2026-11-19T16:30:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 60: Code Review Fix Report

**Fixed at:** 2026-11-19
**Source review:** 60-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (WR-01, WR-02, WR-03, IN-01, IN-02, IN-03, IN-04)
- Fixed: 7
- Skipped: 0

WR-03 is fixed as documentation only, as scoped: the real isolation of a throwing `subscribe` listener is deferred (see "Deferred"). WR-02 is a logic fix: **fixed: requires human verification**.

**Verification ran in the main checkout** (`workflow.use_worktrees` is false), so the numbers are reproducible from the tree you are looking at:
- `pnpm exec vitest run --project devtools`: 70 files, 1647 tests passed.
- `tstyche` on `surface.tst.ts` and `DiagnosticsStore.tst.ts`: 15 tests, 26 assertions passed.
- `pnpm typecheck`, `pnpm circular`: clean. `pnpm lint`: exit 0 (warnings only, none in a touched file).
- `check-doc-examples.mjs` (117 blocks) and `check-website-doc-examples.mjs` (70 blocks) compile.
- `check-package-install.mjs`: 9 packages pass. `check-house-style.mjs`, `check-dod-table.mjs`, `check-api-surface.mjs`, `spec-revise.mjs --check` and `verify-traceability.sh --strict` (21 pass) are clean.
- Stryker, `check:pr` and `pnpm check` were not run (the orchestrator does those).

## Fixed Issues

### WR-02: `TimelineFeed.configure` has no closed-scope guard

**Files modified:** `packages/devtools/test/model/TimelineFeed.test.ts` (RED), `packages/devtools/src/model/TimelineFeed.ts`, `spec/behaviors/28-devtools-screens.md`, `.changeset/devtools-headless-interface-is-the-feeds.md`
**Commits:** `2a71ccc3` (RED test), `578fcb3d` (guard)
**Applied fix:** TF20 sits beside TF17/TF18 and imports from the root. After the scope closes on a `Stopped` feed, `configure({ capacity, source })` must leave the status `Stopped`, the timeline snapshot identical, the new source unread, and nothing notified on either store. It failed first on `Reading` over `Stopped`. `configure` now starts with `if (reads.closed()) return;`, the sibling guard, and its doc says so. BEH-QD-636 gains a REQUIREMENT and a dated amendment (2026-11-19), pinned by TF20, and the document is at revision 1.34 via `spec-revise.mjs`. The phase changeset notes the behaviour.

### WR-01: The README's headless example never reads the state after subscribing

**Files modified:** `packages/devtools/README.md`
**Commit:** `bf12ab36`
**Applied fix:** A small `follow(subscribe, line)` helper reports `line()` once, then on every change, for each of the four subscriptions. A paragraph under the fence says why. The same pattern is not in spec 28's `sampleOnce` fence (it already reads `getSnapshot()` after a yield, with no subscription) or on the website page (no headless example, prose only), so neither changed. Both doc-example gates stay green.

### WR-03: A throwing `subscribe` listener is not isolated (documentation only)

**Files modified:** `packages/devtools/src/model/GatesFeed.ts`, `packages/devtools/src/model/DiagnosticsFeed.ts`, `packages/devtools/src/model/TimelineFeed.ts`, `packages/devtools/README.md`
**Commit:** `8028f155`
**Applied fix:**
- `GatesFeed.ts`'s header now claims isolation only for what the host throws from the registry or the thunk, and says a `subscribe` listener is the caller's and must not throw (a throw escapes `configure` and ends the questions cadence without a statement).
- The README's "a feed that stops says so" line now says "a read that stops is stated in its feed's status", and says a listener is yours, not isolated, and must not throw.
- `subscribe` on `GatesFeed`, `DiagnosticsReadout` and `TimelineStatusReadout` each gain a doc line saying a listener must not throw.
- `ExternalStore` is unchanged.

### IN-01: `WiringRead.Failed.reason` lacks the trust-boundary sentence

**Files modified:** `packages/devtools/src/model/DiagnosticsStore.ts`, `packages/devtools/README.md`, `apps/website/src/content/docs/docs/packages/devtools.md`
**Commit:** `3b6f5e31`
**Applied fix:** `Failed.reason`'s doc now says it is `Cause.pretty` of the build failure and must not cross a trust boundary. The README paragraph now covers "a stop's or a failed read's `reason`" and lists `Stopped`, `WiringRead.Failed`, `RegistryRead.Failed` and `AskedRead.Failed`. The website page carries the same paragraph and got the same widening, so the two do not disagree.

### IN-02: The "not generic" pin passes for a one-parameter generic

**Files modified:** `packages/devtools/test/model/DiagnosticsStore.tst.ts`
**Commit:** `071a9dcb`
**Applied fix:** `NotGeneric` is now `NotGenericOne = DiagnosticsOptions<never>` and `NotGenericTwo = DiagnosticsOptions<never, never>`, each under its own `@ts-expect-error`. `pnpm typecheck` and `tstyche` pass, so both lines do error today.

### IN-03: The packed-consumer feed probe asserts a status a feed that read nothing also has

**Files modified:** `scripts/check-package-install.mjs`
**Commit:** `caa3d0e9`
**Applied fix:** After the build, the probe lets the fiber run 20 `Effect.yieldNow` turns (the devtools suite's own `settleTurns` pattern, no clock, no sleep) and also asserts `feed.timeline.getSnapshot().entries.length === 1`. I confirmed it bites: changing the wanted count to 2 made the gate fail with `devtools feed entries was 1, wanted 2`, and I restored it.

### IN-04: `DiagnosticsOptions`' doc points at a package-private type

**Files modified:** `packages/devtools/src/model/DiagnosticsStore.ts`
**Commit:** `c02775c1`
**Applied fix:** The doc names `GatesFeedInputs.gates` and `GatesFeedInputs.questions`, built by `makeGatesFeed`, instead of `DockModelInputs`.

## Deferred

- **Isolating a throwing `subscribe` listener (WR-03's follow-up).** `ExternalStore.notify` still calls each listener with no isolation, so a throwing subscriber still escapes `configure`, ends the gates cadence silently (it forks with no `onFailure`), and is stated as a source or sampler stop on the timeline and diagnostics feeds. The fix belongs in `ExternalStore` (isolate each listener) and/or an `onFailure` on the gates cadence that publishes `AskedRead.Failed`. `ExternalStore` is shared with the React dock, which phase 60's CONTEXT puts out of scope, so it needs its own decision and pins.
- The `60-mutation*` artifacts were not touched. `TimelineFeed.ts` gained one guard line, so its mutation figures may need the orchestrator's re-run.

## Not done

- `.planning/config.json` has a pre-existing uncommitted modification and was not staged. REVIEW-FIX.md is not committed.

---

_Fixed: 2026-11-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
