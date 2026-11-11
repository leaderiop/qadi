---
phase: "25"
slug: "session-only-simulator"
overall_score: 21
max_score: 24
screenshots: none
interaction_capture: false
audited: "2026-11-11"
---

# Phase 25 — UI Review

Static code audit against the preserve contract in `25-UI-SPEC.md`. The project is a library with no dev
server, so no screenshots were taken; interaction findings come from `git diff 17fa6738 HEAD` and from
reading `SimulationSession.ts`.

## Verdict

**The preserve contract held.** `Simulator.tsx`, `DevtoolsDock.tsx` and `useScoped.ts` change no style,
token, aria attribute, `data-testid` or rendered string.

- `theme.ts` is not in the diff. The only style expression touched is
  `...(cost.warns ? { color: colors.error } : {})`, which replaces the old `causesIO` check.
- Strings that moved are byte-identical to the base:
  - `summarise` moved verbatim to `Replay.ts:183-205`, keeping its em dashes and node/nodes plural;
  - the match sentence;
  - the `policyMenu` labels and option values (`"seeded"`, `"evicted"`, `String(index)`);
  - all four `cost.sentence` cases (`SimulationSession.ts:304-312`).
- `aria-label="Policy"` and every `data-testid` are untouched.
- "This is not a denial" and Duration stay in the view, as Phase 29 and the deferred list require.

## Pillar scores

| Pillar | Score | Key finding |
|---|---|---|
| Copywriting | 3/4 | Moved strings byte-identical; the frozen `run` / `what if` labels are terse lowercase (recommendation only) |
| Visuals | 4/4 | DOM shape identical; props shrank to `{ session }`, no visible change |
| Color | 4/4 | `cost.warns = plan?.causesIO === true`, independent of the refusal branch: amber still only warns of I/O, never Allow/Deny; accent not on `run` |
| Typography | 4/4 | No changes; sizes 12/11 and weights 400/600 frozen |
| Spacing | 3/4 | Unchanged, including the frozen values that are not multiples of 4 (recommendation) |
| Experience Design | 3/4 | Interaction rules hold in code; three small warnings below |

## Warnings, with their dispositions

All three are WARNING. None is a BLOCKER.

1. **A null render on the first pass.** `DevtoolsDock` renders null until `useScoped`'s layout effect sets
   the session.
   *Disposition: no action.* A layout effect runs before the browser paints, so no empty frame reaches the
   screen. This is contract rule 18. `useSimulationSession.test.tsx` pins the StrictMode double mount and
   the unmount interrupt.
2. **A pin for a refused source with a plan.** The auditor did not find a dedicated case.
   *Disposition: already covered.* `SimulationSession.test.ts` has "says a run would be refused, and does
   not warn, once Live loses its ports". It asserts that the plan is defined and that
   `{ sentence: "a run would be refused: …", warns: false }`. Every case in that describe also checks
   `warns === (plan?.causesIO === true)`.
3. **`reading?.sentence` can render empty.** `BaselineCard` takes `reading: BaselineReading | undefined`,
   which allows a blank `qadi-baseline-state`.
   *Disposition: no action this phase.* It is unreachable, because the session sets the reading whenever
   the baseline is Checked (`SimulationSession.ts:455`). It is left for the code review to weigh.

Minor, confirmed by reading only:

- `onChange` uses `selectedIndex`, and `choosePolicyAt` subtracts `leading()` (0 or 1). The seeded and
  evicted entries therefore map to -1 and do nothing (rule 10), and a `Number.isInteger` guard handles
  bad input.
- `<option key>` changed from `${label}-${index}` to `option.value`. The values are unique, so this is
  not a regression.

## Recommendations for a future copy or design pass

These are frozen by the contract and are not phase 25 debt.

- The `run` / `what if` buttons are terse lowercase, and `what if` is not a verb phrase. The checker
  already flagged and accepted this.
- While a run is Running there is no spinner or progress text, only disabled buttons. Rule 16 also notes
  that focus is lost when `run` becomes disabled.
- Spacing uses raw 6, 10, 12, 1 and 2 px values, outside a 4-point scale.
- Long text in the policy select is neither truncated nor given a max width.
- A supersede shows no "cancelled" copy or toast. This is deliberate.

## Not checked

- The visual preserve check in a running dock (human judgment). The DOM tests pin strings and test ids,
  not pixels.
- Focus retention and render timing in a real browser.
