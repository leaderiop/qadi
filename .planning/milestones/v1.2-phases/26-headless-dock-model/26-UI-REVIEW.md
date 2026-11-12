---
phase: "26"
slug: "headless-dock-model"
overall_score: 22
max_score: 24
screenshots: none
interaction_capture: false
audited: "2026-11-11"
---

# Phase 26 — UI Review

Static code audit against the preserve contract in `26-UI-SPEC.md`. The project is a library with no dev
server, so no screenshots were taken. Findings come from `git diff 7396491d HEAD -- packages/devtools/src`
and from reading `useDockModel.ts`, `DevtoolsDock.tsx` and `RoleViewer.tsx`.

## Verdict

**The preserve contract held.** No visible change was found in the diff.

- `theme.ts` and the pure views (`DecisionLog`, `Inspector`, `Simulator` body) are not in the diff.
- No `data-testid`, `aria-*`, `tabIndex`, style, token or rendered string was added, removed or edited. The
  only edits in `react/` are props typing (`| undefined`), the renamed arms, and the dock wiring.
- Held-choice arms are renamed. `HeldChoice` is `Empty` / `Listed` / `Evicted`, and the user-visible
  evicted strings are unchanged:
  - `RoleViewer.tsx`: `{role.name} is no longer in the list`;
  - `PolicyExplorer.tsx`: only `shown.sighting.label` became `shown.value.label`, so the text is the same;
  - `Simulator.tsx`: `"None"` became `"Empty"` in a branch test only.
- `RoleViewer` replaced its local `Match` with `heldValue`, `heldIndex` and `resolved._tag === "Evicted"`.
  Chip highlighting (`position === index`), the single-role chip hiding (`roles.length === 1 && !evicted`)
  and the "dropped unknown parent" warning copy are behaviourally identical.
- The dock renders `null` until the model exists (`DevtoolsDock.tsx`, `model === undefined ? null : <DockFrame/>`),
  per the contract's one null pass.
- No focus code was added (grep of the diff finds no `.focus(` or `tabIndex`).
- `DockFrame` hooks are mounted only below the `model !== undefined` branch, as rule 10 requires. The
  Activity test in `useSimulationSession.test.tsx` was re-pointed at `useDockModel` (about l.147), not dropped.
- `useLayoutEffect` in `useDockModel` calls `configure`, which diffs by identity, so an unchanged prop
  dispatches nothing and the frame is not remounted by a publish.

## Pillar scores

| Pillar | Score | Key finding |
|---|---|---|
| Copywriting | 4/4 | Every string byte-identical; evicted/unknown-parent/toolbar copy untouched |
| Visuals | 4/4 | DOM shape and test ids identical; `Screen` now takes `{model, view, shown, host}`, no visible change |
| Color | 4/4 | `theme.ts` untouched; no colour expression in the diff |
| Typography | 4/4 | No size or weight changes |
| Spacing | 3/4 | Unchanged, but frozen raw values remain (RoleViewer `padding: 12`, `gap: 4`, `marginBottom: 10`); recommendation only |
| Experience Design | 3/4 | Contract held; one-pass `null` and Activity remount are code-reasoned, not browser-observed |

**Overall: 22/24**

## Findings (all WARNING-level, none blocking)

1. **One-pass `null` is an empty first paint.** `DevtoolsDock` shows nothing before the model exists. This
   is mandated by the contract and is not debt. A host with SSR or a snapshot test sees an empty dock for
   that pass.
2. **`Activity` remount is unobserved.** The hidden-then-shown path unmounts the frame, so tab, filter
   text, scroll and in-flight focus are lost while hidden, and the model is rebuilt on show. The contract
   accepts this (rule 10). Only the unit test covers it, not a real browser.
3. **`RoleViewer` no longer spreads `unknownParents` conditionally.** It now passes `undefined` through
   and handles it at the use site (`unknownParents === undefined || length === 0`). Output is identical.
   Noted only because the old spread guarded the prop at the call site.
4. **Inherited from phase 25 (not re-scored):**
   - spacing off the 4-point scale;
   - terse `run` / `what if` labels;
   - no progress text during a run;
   - focus is lost when `run` becomes disabled (rule 16);
   - the policy select has no truncation.

## Not checked

- A running dock: pixel-level preserve check, focus retention while a timeline publish lands, and render
  timing in a real browser.
- The full diff of `DockModel.ts`, `SimulationSession.ts` and `ExplorerSession.ts` was not line-audited
  for logic. Only their React-facing surface was read; the model tests are the evidence there.

## Files audited

`packages/devtools/src/react/{DevtoolsDock,useDockModel,RoleViewer,PolicyExplorer,Simulator,QuestionsPanel,ServicesPanel}.tsx|ts`,
`packages/devtools/src/model/HeldChoice.ts`, `packages/devtools/test/react/useSimulationSession.test.tsx`,
`26-UI-SPEC.md`, `25-UI-REVIEW.md`.
