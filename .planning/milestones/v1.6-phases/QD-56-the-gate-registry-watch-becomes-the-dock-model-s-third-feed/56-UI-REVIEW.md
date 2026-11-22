# Phase 56 — UI Review

**Audited:** 2026-11-18
**Baseline:** 56-UI-SPEC.md
**Screenshots:** not captured (devtools panel is a library component, no dev server probed; code-only audit)
**Interaction captures:** off

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Sentence matches the locked copy exactly; no full stop after reason |
| 2. Visuals | 4/4 | Bare `<p>`, same shape as `qadi-gates-failed`; no rows claimed on Failed |
| 3. Color | 4/4 | `colors.error` via `{...muted, color}`, same as sibling; amber use stays at the 3 declared elements |
| 4. Typography | 4/4 | No fontSize override, so inherits 12px like sibling |
| 5. Spacing | 4/4 | No new spacing; shares `muted` style only |
| 6. Experience Design | 3/4 | No role/aria as specified; long-string and screen-reader checks unverified (backstop only) |

**Overall: 23/24**

## Top 3 Priority Fixes

No blockers. Warnings and notes:

1. **Fallback wording differs from spec** — `GatesFeed.ts:74` uses `QUESTIONS_FALLBACK` ("The questions threw a value that could not be described.") whereas UI-SPEC line ~173 says the questions path uses the registry fallback. The code is arguably more correct (it names the right subject); update the spec rather than the code.
2. **Long-reason rendering unverified visually** — spec marks it a backstop; run one manual check with a multi-line stack.
3. **Screen-reader behaviour unverified** — no `role="alert"` by design, consistent with the two siblings.

## Detailed Findings

### Pillar 1: Copywriting (4/4)
`QuestionsPanel.tsx:187`: "The questions handed to the dock threw, so what has been asked cannot be shown: {reason}". Matches the contract clause for clause against `qadi-gates-failed` (line 158). Neutral, no apology, no emoji.

### Pillar 2: Visuals (4/4)
`questionsBlock`'s `Failed` arm returns one `<p>` with `data-testid="qadi-questions-failed"` and nothing else. Slot is correct: rendered at line 123 after the gates block (line 121), so the two failures are independent. `Match.tagsExhaustive` makes a missing arm a compile error.

### Pillar 3: Color (4/4)
`style={{ ...muted, color: colors.error }}` (line 186), identical to the sibling. No hardcoded colours added.

### Pillar 4: Typography (4/4)
No `fontSize` or weight override; 12px inherited.

### Pillar 5: Spacing (4/4)
No spacing declarations introduced.

### Pillar 6: Experience Design (3/4)
Attributes are `data-testid` and style only (no `role`, no `aria-*`), as spec'd. Failure stated in a dedicated view state so it is not confused with Unsampled/Empty. Deducted one point because the a11y and long-text evidence is manual-only and not captured.

Notes (out of scope, pre-existing): none found in this change.

## Files Audited
- packages/devtools/src/react/QuestionsPanel.tsx
- packages/devtools/src/model/GatesFeed.ts (fallback strings)
- packages/devtools/src/react/theme.ts (`muted`)

---

## Orchestrator Note (2026-11-18)

Top fix 1 is withdrawn. It claimed the spec has the questions path reuse the registry fallback. `56-UI-SPEC.md` lines 178 and 320 already specify the thunk's own fallback: `The questions threw a value that could not be described.` That is the sentence `GatesFeed.ts:74` uses, so the code and the spec agree and no change is needed. Fixes 2 and 3 are UI-SPEC's two manual backstops (long-reason wrapping, no announcement), recorded as manual-only in `56-VALIDATION.md`.
