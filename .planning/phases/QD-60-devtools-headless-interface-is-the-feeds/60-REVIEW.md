---
phase: QD-60-devtools-headless-interface-is-the-feeds
reviewed: 2026-11-19T15:23:20Z
depth: standard
iteration: 2
files_reviewed: 29
files_reviewed_list:
  - examples/nextjs-newsroom/src/client/Counters.tsx
  - packages/devtools/README.md
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DiagnosticsStore.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/index.ts
  - packages/devtools/src/react/useDiagnostics.ts
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DiagnosticsStore.test.ts
  - packages/devtools/test/model/DiagnosticsStore.tst.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/test/react/DiagnosticsLifetime.test.tsx
  - packages/devtools/test/react/DiagnosticsScreens.test.tsx
  - packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx
  - packages/devtools/test/react/questionsProp.ts
  - packages/devtools/test/react/useDiagnostics.test.tsx
  - packages/devtools/test/surface.test.ts
  - packages/devtools/test/surface.tst.ts
  - scripts/check-package-install.mjs
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/SupersedingRun.ts
  - packages/devtools/src/model/TimelineStore.ts
  - spec/behaviors/28-devtools-screens.md
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
  necessity: 0
status: issues_found
---

# Phase 60: Code Review Report (iteration 2)

**Reviewed:** 2026-11-19T15:23:20Z
**Depth:** standard
**Files Reviewed:** 29. These are the 25 in scope, plus three callees read for behaviour (`ExternalStore.ts`, `SupersedingRun.ts`, `TimelineStore.ts`). `spec/behaviors/28-devtools-screens.md` and `spec/overview.md` were read only where the fix commits or the feeds' claims reach them.
**Status:** issues_found

## Summary

I reviewed `git diff 35a48554 HEAD` for each file in scope. I also reviewed the fix commits `2a71ccc3..caa3d0e9` (`git diff 20328f67 HEAD`) as new code.

**Checks I re-ran:**
- `vitest --project devtools` on `TimelineFeed`, `DiagnosticsFeed`, `GatesFeed`, `DiagnosticsStore` and `surface`: 113 of 113 pass.
- `tstyche` on `surface.tst.ts` and `DiagnosticsStore.tst.ts`: 15 tests and 26 assertions pass.
- Two scratch probes, both outside the repo:
  - a `tsc --strict` probe of the IN-02 pin;
  - a `node --experimental-strip-types` probe of a gates feed with a throwing listener.

**I did not run:**
- `check-doc-examples.mjs`. For the README fence compiling, I rely on the fix report.
- Stryker, `check:pr` and `pnpm check`.

**The iteration-1 fixes hold.**
- **WR-01 (README).** `follow(subscribe, line)` reports `line()` once and then subscribes. Nothing can run between the two synchronous calls, so no state is missed. The prose under the fence says why. The four `subscribe` members are closures from `makeExternalStore`, not `this`-bound methods, so passing them unbound is correct.
- **WR-02 (timeline `configure` after close).** `if (reads.closed()) return;` at `TimelineFeed.ts:153` runs before `inputs` is written. Without the guard, the resize path calls `push()` and then `status.set(READING)`, so the new test's `timelineHeard === 0` and `heard === []` assertions catch it. The changeset and BEH-QD-636 say so. The test reuses an existing id, which is WR-02 below.
- **WR-03 (docs only, as scoped).**
  - `GatesFeed.ts`'s header and the README no longer claim that listeners are isolated.
  - The three `subscribe` docs say a listener must not throw.
  - I checked `DiagnosticsReadout.subscribe`'s claim that "a throw during a publish from the poll is stated as the poll's stop". It is true: `view.set` writes `current` before it notifies, so the snapshot reads `Stopped` even when the listener throws again inside `onFailure`.
  - Two normative documents that this phase wrote still carry the old, unqualified claim (WR-01 below).
- **IN-01 (UF-1).** `WiringRead.Failed`'s doc (`DiagnosticsStore.ts:63-66`), the README and the website page now carry the trust-boundary sentence.
- **IN-02.** Both arities are pinned, and `tsconfig.test.json` type-checks `.tst.ts` files, so an unused `@ts-expect-error` fails `pnpm typecheck`. The pin is now as strong as claimed. Its comment names the wrong line (IN-01 below).
- **IN-03.** `Effect.yieldNow` is an `Effect<void>` value in the installed `effect` (`Effect.ts:2602`), so `yield* Effect.yieldNow` is correct. The entries assertion proves the packed feed read the record.
- **IN-04.** The doc now names `GatesFeedInputs`, which the root exports (`index.ts:51`).

**Clean on the brief's points**, unchanged since iteration 1 and re-checked against HEAD:
- **The interface is complete.** Every type a public signature names is exported, the retired names are refused, and nothing private is exported.
- **There is one `DiagnosticsOptions`.**
  - It is declared once and is not generic (`DiagnosticsStore.ts:200`).
  - `runDiagnostics` builds `Schedule.spaced(options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)`.
  - `configure` compares `layer`, `collector` and `intervalMillis` by identity.
  - No translation code is left.
- **The removed D-16 guard.** On an already-off feed, `configure(undefined)` is still silent. `runs.stop()` forks `Effect.void` under a fresh token, and `view.set(diagnosticsOff)` returns early on the same reference.
- **No retired name in live docs.** None appears in the README, `examples/`, `packages/react/src`, or the website outside the 0.12 and 0.13 upgrade history. The 0.13 history includes the "Before" fence.
- **House rules.** The phase adds no `as` cast, `!`, `any`, `switch`, `fnUntraced`, `async`/`await` in src, `Record<string, unknown>`, `effect` barrel import or `export *`, and every relative import carries `.ts`.

**UF-1 and UF-2.**
- **UF-1: Info, in scope, now closed.** The doc gap was fixed by iteration-1 IN-01.
- **UF-2: Warning, behaviour out of this phase's scope.**
  - A throwing listener silently ends the gates cadence. The probe confirmed it: the thunk was called once in `configure` and once on the first tick, then never again.
  - This predates the phase. The fix belongs in `ExternalStore` or the cadence's `onFailure`, and `ExternalStore` is shared with the dock, which CONTEXT puts out of scope.
  - What is in scope is the documentation. Two normative claims written in this phase still deny it (WR-01).

I read `necessity-review.md`. No finding qualifies.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: BEH-QD-638 and the `spec/overview.md` row, both written in this phase, still say nothing the host throws leaves the gates feed

**File:** `spec/behaviors/28-devtools-screens.md:2544-2545`, `spec/overview.md:915`

**Issue:**
- **What the documents say.**
  - BEH-QD-638 (added in `5321838d`) has the requirement "Nothing the host throws MUST leave the feed".
  - The overview row (added in `67d6b335`) says "nothing the host throws leaves the feed (BEH-QD-638, ADR-QD-169)".
- **What the code does.** A `subscribe` listener is host code, and its throw does leave the feed. My probe showed three paths:
  1. `feed.configure({ questions, intervalMillis: 5 })` threw `boom` to the caller.
  2. The next tick that published killed the cadence. The thunk was called 1 time, then 2, then never again, and no statement was made.
  3. `onRegistry` (`GatesFeed.ts:187-190`) publishes unguarded, so a throw also escapes into the host registry's own `notify`.
- **Why it matters.** Iteration 1's WR-03 narrowed exactly this claim in `GatesFeed.ts:5-9` and in the README. It missed the two normative documents. `spec/` is normative (AGENTS.md §11), so the spec now states a MUST that the code does not meet.
- **Scope.** This is the doc half of UF-2. It is in scope because both texts are new in this phase. The behaviour fix stays deferred, as briefed.

**Fix:** Narrow both texts to match `GatesFeed.ts`'s header, and record the change in spec 28's change history (revision 1.35) and the overview's history.
```
REQUIREMENT: Nothing the host throws from the registry or the questions thunk MUST leave the feed: a throw
             from `instances`, `subscribe` or the thunk is a `Failed { reason }` in the snapshot. A `subscribe`
             listener on the feed is the caller's and is not isolated (deferred: Phase 60 review WR-03).
```
In the overview row, write "…and nothing the host's registry or thunk throws leaves the feed (BEH-QD-638, ADR-QD-169)".

### WR-02: The WR-02 fix's new test reuses the id TF20, so BEH-QD-636's pin names two tests

**File:** `packages/devtools/test/model/TimelineFeed.test.ts:381` and `:434`; `spec/behaviors/28-devtools-screens.md:2477`

**Issue:**
- **The duplicate.** `2a71ccc3` added `"TF20 a configure after the scope closed …"` at `:381`. At `20328f67` the file already had `"TF20 a restart from Stopped publishes Reading before a read that dies at once publishes Stopped"` (now `:434`). `grep -o '"TF[0-9]*'` counts TF20 twice, and the highest id in use is TF23.
- **Why it matters.**
  - BEH-QD-636 now says "Pinned by … (TF6, TF19, TF20)". A reader, or a later edit that deletes one of the two, cannot tell which behaviour the pin means.
  - The two tests pin different requirements: configure-after-close, and restart ordering.
  - The spec cites TF ids by number elsewhere in the same document (`:1426`, `:1632-1634`, `:1813`, `:1848`), so the ids carry traceability weight.

**Fix:** Renumber the new test to the next free id, and update the pin.
```ts
it.effect("TF24 a configure after the scope closed reads nothing, publishes nothing and leaves a Stopped feed Stopped", () =>
```
```
Pinned by `packages/devtools/test/model/TimelineFeed.test.ts`, through the root (TF6, TF19, TF24).
```
Also change "TF20" to "TF24" in the 1.34 amendment note if you want the history to name the test. That note currently cites only WR-02, so it can stay.

## Info

### IN-01: The new "both arities" comment names the wrong line

**File:** `packages/devtools/test/model/DiagnosticsStore.tst.ts:60`

**Issue:**
- **What the comment says.** "Both arities, so a reintroduced one-parameter generic fails the second line."
- **What happens.** I compiled `interface DiagnosticsOptions<ROut = never>` against the two directives under `tsc --strict`. The *first* directive (`NotGenericOne = DiagnosticsOptions<never>`, `:61-62`) became unused (TS2578 at line 2). The second still errors, because two type arguments is too many.
- **Effect.** The pin is correct. Only its explanation is inverted.

**Fix:** Change the comment to "Both arities: a reintroduced one-parameter generic fails the first directive, a two-parameter one fails both."

### IN-02: `GatesFeed.ts`'s new listener sentence joins two separate failures, and omits the registry-notification path

**File:** `packages/devtools/src/model/GatesFeed.ts:8-9`, `:186-190`, `:242-256`; `packages/devtools/README.md:163-166`

**Issue:**
- **What the doc says.** "A throw escapes `configure` and ends the questions cadence without a statement."
- **What actually happens.**
  - In `configure`, `cadence()` (`:253`) has already forked the new run before `publish` (`:255`) throws. So a throw in `configure` escapes to the caller, and the cadence survives.
  - The cadence ends on the next *tick that publishes*. My probe called the thunk on that tick. A thunk whose answer never changes keeps ticking forever.
  - A throw during a registry notification escapes into the host registry's `notify` through `onRegistry`, and the doc does not mention it.
- **Severity.** The rule the doc states ("must not throw") is right, so this is Info.

**Fix:** Change the sentence to: "A `subscribe` listener is not guarded: it is the caller's and must not throw. A throw escapes the call that published (`configure`, or the registry's own notification), and a throw on a tick ends the questions cadence without a statement." Mirror the "on a tick" wording in the README sentence.

### IN-03: `TimelineStore.subscribe`, the timeline feed's busiest listener, does not carry the "must not throw" line

**File:** `packages/devtools/src/model/TimelineStore.ts:25`

**Issue:**
- **The gap.** WR-03's fix added "A listener must not throw: it is not isolated" to `TimelineStatusReadout`, `DiagnosticsReadout` and `GatesFeed`. `TimelineFeed.timeline` is a `TimelineStore`, and its `subscribe` doc says only "Registers a listener…".
- **Why that listener matters most.** `view.publish` notifies on every accepted record, so it is the listener a headless shell is most likely to attach. The README's `follow` attaches one.
- **What a throw there does.** It becomes `TimelineStatus.Stopped` with the listener's trace as the source's reason, the same as `DiagnosticsReadout`'s documented case. A hand-fed `timeline.accept` call throws it to the caller instead.

**Fix:** Change the doc to "Registers a listener, and returns the function that removes it. A listener must not throw: it is not isolated, and a throw while a feed's read publishes is stated as that read's stop."

---

_Reviewed: 2026-11-19T15:23:20Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
