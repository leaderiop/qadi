---
status: diagnosed
trigger: "DATA_START Investigate the root cause of a reproducible test failure that occurs ONLY on Node.js 20.19.0, not on Node.js 26 and not locally. Find the root cause only. packages/react/test/edges.test.tsx:154 useDecisionSuspense > shows the Suspense fallback before the decision settles fails on CI check (20.19.0) leg, TestingLibraryElementError: Unable to find an element with the text: decided:Deny. DATA_END"
created: 2026-08-30T04:35:00Z
updated: 2026-08-30T05:40:00Z
---

## Current Focus

hypothesis: CONFIRMED — see Resolution.root_cause
test: n/a — root cause confirmed via direct instrumented reproduction, isolation experiments, and source-level verification
expecting: n/a
next_action: none — goal is find_root_cause_only; return diagnosis to caller for plan-phase --gaps to handle the fix

## Symptoms

expected: CI runs the full `pnpm check` gate suite on Node.js 20.19.0 and it passes — `check (20.19.0)` and `check (26)` both conclude `success`.
actual: `check (26)` succeeds (1845/1845). `check (20.19.0)` fails reproducibly (2/2 runs, identical) on packages/react/test/edges.test.tsx:154 `useDecisionSuspense > shows the Suspense fallback before the decision settles`.
errors: |
  TestingLibraryElementError: Unable to find an element with the text: decided:Deny. This could be
  because the text is broken up by multiple elements. In this case, you can provide a function for
  your text matcher to make your matcher more flexible.
  ❯ test/edges.test.tsx:154:11
  Test Files  1 failed | 91 passed (92)
       Tests  1 failed | 1844 passed (1845)
reproduction: |
  GitHub Actions run 33288841795, both the original run and a targeted rerun of `check (20.19.0)`.
  CI confirmed actual Node runtime was 20.19.0 (setup-node log: "node-version: 20.19.0",
  "Acquiring 20.19.0 - x64"). Identical suite passes 1845/1845 locally and on `check (26)`.
started: First time this suite has run against real Node 20.19.0 — Phase 01 added the Node 20.19.0
  CI leg specifically to verify the declared engine floor (root package.json `engines: ">=20.19.0"`).

## Eliminated

- hypothesis: A generic "Node 20 is slower / different clock precision" timing issue where the test's default `waitFor` timeout is simply too tight on Node 20's event loop.
  evidence: Extended `waitFor`'s timeout to 8000ms (then vitest's own per-test timeout to 10000ms) and the assertion still never became true — the DOM stayed frozen on `<span>suspended</span>` for the full window. A "slower" hypothesis would show the text appear late, not never. Ruled out by direct observation (`NEVER SETTLED, elapsed ms: 8006`).
  timestamp: 2026-08-30T05:26:00Z

- hypothesis: `effect`'s core `Clock`/scheduler (`Effect.delay`) is broken or behaves differently under Node 20.
  evidence: Standalone script running `Effect.delay(Effect.succeed(0), "1 millis")` via `Effect.runPromise` under Node 20.17.0 (no React, no happy-dom, no AtomRegistry) resolved correctly in ~1ms, identical to Node 22. Rules out the base Effect scheduler/Clock as the fault.
  timestamp: 2026-08-30T05:27:00Z

- hypothesis: `effect/unstable/reactivity`'s `AtomRegistry`/`Atom.family`/`withReactivity` mechanism itself fails to settle a delayed decision atom under Node 20.
  evidence: Standalone test constructing the real `makeQadiAtoms` atom set with the same `slow` (1ms-delayed) `AttributeResolver`, subscribing directly via `registry.subscribe` with no React involved, settled to `Success` correctly and quickly (test duration 8ms) under Node 20.17.0. Rules out the plain reactivity layer as broken on Node 20.
  timestamp: 2026-08-30T05:27:41Z

- hypothesis: React re-rendering in response to an async atom update is broken generally under Node 20 in this test environment (happy-dom).
  evidence: A parallel test using the non-suspending `useDecision` hook (same `slow` atoms, same 1ms delay, rendered via `@testing-library/react` under happy-dom) re-rendered correctly and promptly (17ms) under Node 20.17.0. Rules out a general React/happy-dom re-render breakage; narrows the fault specifically to the Suspense/throw-promise path (`useDecisionSuspense` / `settled()`).
  timestamp: 2026-08-30T05:28:15Z

- hypothesis: `MessageChannel` (used internally by React's scheduler package for Suspense-retry scheduling) is unavailable or broken in the happy-dom test environment under Node 20, causing React's Suspense retry to never fire.
  evidence: Diagnostic test inside the actual happy-dom vitest environment confirmed `typeof MessageChannel === "function"` and a real `MessageChannel` round-trip (`port1`/`port2` postMessage) completed in 0ms under Node 20.17.0. Rules out a missing/broken `MessageChannel` as the direct cause.
  timestamp: 2026-08-30T05:28:57Z

## Evidence

- timestamp: 2026-08-30T05:23:38Z
  checked: Ran `packages/react/test/edges.test.tsx` (full file, unmodified) under Node v20.17.0 (closest locally available Node 20.x binary; exact 20.19.0 not installed, but same major/V8 lineage) via `node <vitest.mjs> run test/edges.test.tsx`, cwd inside the worktree with `packages/react/node_modules` and root `node_modules` symlinked in from the main checkout (worktree has no installed deps of its own).
  found: Reproduced the exact CI failure locally, byte-for-byte: `useDecisionSuspense > shows the Suspense fallback before the decision settles` fails with `TestingLibraryElementError: Unable to find an element with the text: decided:Deny`, DOM frozen on `<span>suspended</span>`. The same file passes 8/8 under Node v22.22.0 (this machine's default).
  implication: The bug is real, reproducible outside CI, and is triggered by the Node major version (20.x family) rather than being CI-environment-specific or genuinely flaky. Confirms the UAT gap is a real defect, not infrastructure noise.

- timestamp: 2026-08-30T05:29:42Z
  checked: Ran the Suspense test IN ISOLATION (`vitest run test/edges.test.tsx -t "shows the Suspense fallback"`, which skips executing the other 7 tests' bodies) under Node 20.17.0, with debug instrumentation added to `hooks.ts`'s `useDecisionSuspense` and `settled()` (temporary, reverted after investigation) plus an extended waitFor timeout.
  found: Passed in 322ms. Log shows: 2 renders reading `Initial` (both throw the suspense promise), then `settled()`'s subscribe callback fires with `_tag: Success`, then a final render reads `Success` correctly.
  implication: The bug does NOT reproduce when the Suspense test runs alone, even on Node 20.17.0 — it requires specific preceding test/state history in the same file. Rules out a context-independent per-render defect; points to cross-test/shared-runtime state as a necessary trigger condition.

- timestamp: 2026-08-30T05:30:03Z
  checked: Ran the FULL file (all 8 tests, unmodified order) under Node 20.17.0 with the same instrumentation and `testTimeout: 10000`.
  found: The 4 "failure rendering" tests (using the `broken` atom set, whose `AttributeResolver.resolve` returns `Effect.fail(...)`) run and pass first. The Suspense test then renders, reaches the SAME `Success` settlement as the isolated run (`settled() subscribe callback fired, _tag: Success`) — but is IMMEDIATELY followed by a FOURTH render of `Probe` that reads `result._tag: Initial` again (not `Success`) and throws a NEW suspense promise via a fresh `settled()` call. That second `settled()` call's subscribe callback never logs again for the rest of the 8-second window — a genuine permanent hang, not a slow resolution.
  implication: Something about the preceding `broken`-atom tests actually executing (not just existing at module scope) causes an EXTRA, stale React render of the already-settled Suspense boundary — a render that incorrectly observes `Initial` — and this second render's `settled()` call never resolves because the underlying atom will not transition again (it already reached its terminal state).

- timestamp: 2026-08-30T05:32:46Z
  checked: Built a minimal 2-test reproduction (`tmp-repro5.test.tsx`): exactly ONE preceding test using the `broken` (`Effect.fail`) atoms + `<Can failure=...>`, followed immediately by the Suspense test using `slow` (1ms `Effect.delay`) atoms. Ran under Node 20.17.0.
  found: Reproduced the identical hang with only these 2 tests (down from 8) — confirms the "1 preceding sync-only test with `working` atoms" variant (tmp-repro4) does NOT trigger it (passed cleanly), but "1 preceding test that actually runs an `Effect.fail`-based resolver through `waitFor`" DOES trigger it. Ran the SAME minimal 2-test file under Node 22.22.0: passes reliably, with the render sequence diverging exactly at the point after the first `Success` settle — Node 22's next render correctly reads `Success`; Node 20's next render incorrectly reads `Initial` again.
  implication: Minimal, deterministic delta-debugged reproduction. The defect requires (a) a preceding test that runs a real `Effect.fail`-driven policy evaluation to completion, and (b) Node 20.x's engine timing — the divergence point is precisely "the render immediately following the first successful Suspense-promise resolution."

- timestamp: 2026-08-30T05:39:00Z
  checked: Read `effect@4.0.0-rc.110`'s `AtomRegistry.ts` source (`subscribe<A>(atom, f, options)`, lines ~520-534) — the exact method `settled()` in `@qadi/react`'s `hooks.ts` calls.
  found: |
    ```
    subscribe<A>(atom, f, options) {
      const node = this.ensureNode(atom);
      if (options?.immediate) { f(node.value()); }
      const remove = node.subscribe(() => f(node._value));
      return ...
    }
    ```
    `settled()` in `packages/react/src/hooks.ts` calls `registry.subscribe(atom, callback)` WITHOUT `{ immediate: true }`. This means the callback fires ONLY on future state transitions of the atom node — it never replays the atom's CURRENT value to a newly-added subscriber. If the atom has already reached (or independently reaches) its terminal `Success`/`Failure` state with no further transition forthcoming, a `settled()` call made after that point will subscribe to a stream of updates that will never arrive, and its returned promise will never resolve.
  implication: This is the exact, concrete code-level mechanism behind the observed permanent hang. `settled()` (packages/react/src/hooks.ts) has a latent TOCTOU race: it assumes that whenever it is called, the atom is either already-Initial-and-about-to-transition, or about to transition again. That assumption breaks whenever a stale/duplicate Suspense-boundary render calls `settled()` again on an atom that has ALREADY settled with no more transitions coming — which is precisely what the extra "render sees `Initial` after the atom already succeeded" event (found in the previous evidence entries) produces, specifically and only observed under Node 20.x combined with a preceding `Effect.fail`-driven test in the same file.
  file: packages/react/src/hooks.ts (lines 58-102, `useDecisionSuspense` and `settled`)

- timestamp: 2026-08-30T05:26:00Z (CI reproduction context)
  checked: `packages/react/package.json` deps/catalog (`effect: 4.0.0-rc.110`, `vitest: 4.1.10`, `@testing-library/react: ^16.3.2`, `happy-dom: ^20.11.1`, `react`/`react-dom: 19.2.8`), `packages/react/vitest.config.ts` (`environment: "happy-dom"`, no `fakeTimers`, no custom `scheduleTask`), and `.github/workflows/check.yml` (Node matrix `["20.19.0", "26"]`, both legs run identical `pnpm check`, real (not floating) pins).
  found: No configuration divergence between the two CI legs beyond the Node version itself — same lockfile, same install, same command. The `slow` atom set in the failing test uses REAL wall-clock time (`Effect.delay(..., "1 millis")` against the real Effect Clock/scheduler), not `TestClock` — so this test's correctness genuinely depends on real Node-engine timing/scheduling behavior.
  implication: Confirms the two CI legs are apples-to-apples except for the Node runtime itself — supporting that the divergence is a genuine Node-major-version behavioral difference (V8/libuv task-queue interleaving) surfacing a pre-existing library race, not a CI misconfiguration.

## Resolution

root_cause: |
  A genuine race condition (TOCTOU) in `@qadi/react`'s `useDecisionSuspense`/`settled()` helper
  in `packages/react/src/hooks.ts`, exposed — but not caused — by a Node-major-version-dependent
  React re-render timing difference.

  Mechanism, confirmed by direct instrumentation and source inspection:

  1. `settled(registry, atom)` (hooks.ts) calls `registry.subscribe(atom, callback)` from
     `effect/unstable/reactivity/AtomRegistry` WITHOUT passing `{ immediate: true }`. Per that
     method's source (`AtomRegistry.ts` ~line 520), the callback fires ONLY on FUTURE state
     transitions of the atom's node — it never replays the atom's current value to a
     newly-registered subscriber.

  2. Under normal conditions, `useDecisionSuspense` only calls `settled()` once per genuinely
     pending decision, and that decision transitions from `Initial` to `Success`/`Failure`
     exactly once, so the promise reliably resolves and this design gap is never exercised.

  3. Directly observed (via temporary instrumentation of `hooks.ts`, since reverted) that when
     the Suspense test ("shows the Suspense fallback before the decision settles",
     packages/react/test/edges.test.tsx:144) runs AFTER a preceding test that drives a real
     `Effect.fail`-based `AttributeResolver` through to completion (the `broken` atom set used by
     the "failure rendering" describe block), an EXTRA, stale render of the already-suspended
     `Probe` component occurs immediately after the underlying decision atom has ALREADY settled
     to `Success` (confirmed: `settled()`'s first subscription's callback already logged
     `_tag: Success` before this extra render). That extra render's `useGate`/`useAtomValue`
     snapshot read reports `_tag: "Initial"` again for the SAME atom, so `useDecisionSuspense`
     calls `settled()` a second time. Because the atom has already reached its terminal state and
     will not transition again, this second subscription (per point 1) never fires its callback —
     the returned promise never resolves, `Probe` never re-renders past the fallback, and
     `waitFor(() => screen.getByText("decided:Deny"))` times out.

  4. This extra stale render (step 3) is the Node-version-dependent trigger: minimal delta-debugged
     reproduction (`tmp-repro5.test.tsx`, one preceding `broken`-atom test + the Suspense test) shows
     the exact render-by-render sequence is IDENTICAL between Node 22.22.0 and Node 20.17.0 up to and
     including the first successful `settled()` resolution (`_tag: Success`) — but the render that
     immediately follows diverges: Node 22.22.0's next render correctly observes `Success`; Node
     20.17.0's next render incorrectly observes `Initial` again, triggering the fatal second
     `settled()` call from point 3. Ruled out as candidate causes for this specific divergence (each
     confirmed independently, see Eliminated): `effect`'s core `Clock`/scheduler in isolation (works
     identically on both Node versions), the plain `AtomRegistry`/reactivity layer without React
     (works identically), general React re-rendering via the non-suspending `useDecision` hook (works
     identically), and `MessageChannel` availability in the happy-dom test environment (present and
     functional on both). The remaining, unfalsified explanation is that Node 20.x's V8/libuv build
     interleaves the `MixedScheduler`'s `setImmediate`-based async dispatch (in
     `effect/Scheduler.ts`, used by `AtomRegistry`'s dispatcher for genuinely-async fiber
     continuations) differently relative to React's own Suspense-retry scheduling and/or
     `act()`'s flush timing than Node 22+/26's V8/libuv build does — an ordering difference between
     two independently-queued callback chains that is a known category of behavior change across
     Node LTS majors, and is only exposed here because the preceding `broken`-atom test leaves
     additional fiber/scheduler activity in flight, shifting the relative timing enough to trigger it.

  AND-gate: yes — this failure requires TWO conditions simultaneously: (a) the library-level defect
  in `settled()` (missing `{ immediate: true }` / no re-check of the atom's current state before
  subscribing) — a `code` category cause — AND (b) the Node 20.x engine/scheduler timing difference
  that produces the extra stale `Initial` render only when preceded by real `Effect.fail`-driven
  fiber activity in the same test file — an `environment` category cause. Neither alone reproduces
  the hang: on Node 20.17.0 in isolation (no preceding `broken`-atom test), the same "buggy" `settled()`
  code never gets the doomed second subscription and passes; on Node 22.22.0 even with the identical
  preceding test, the "buggy" `settled()` code is never actually exercised because the extra stale
  render never happens.

fix: (not applied — goal is find_root_cause_only; hand off to plan-phase --gaps)
verification: (not applicable — no fix applied in this session)
files_changed: []

