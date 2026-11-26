---
phase: 85
review: 85-REVIEW.md
findings:
  - id: IN-01
    severity: info
    disposition: deferred
    title: "QuestionsPanel's optional hydration prop and NO_HYDRATION fallback have no production caller"
  - id: IN-02
    severity: info
    disposition: deferred
    title: "Two ungrammatical sentences ('1 dehydrated entry have', 'All 1 reasons') are pinned by tests"
open: 0
---

# Phase 85 — Review disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | deferred | Decided autonomously 2026-11-25. A required prop would not type-check `Lens.questions.characterisation.test.tsx`, `QuestionsPanel.gates.test.tsx`, `Lens.adapter.test.tsx` or `VerdictTreatment.test.tsx`, which render the panel without it. The first two are held byte for byte (`85-pinned-check.mjs`, D-03). `DevtoolsDock` is the only production caller and always passes the model's store, so the fallback is reached by tests alone. Revisit when a later phase may edit those files. |
| IN-02 | info | deferred | Decided autonomously 2026-11-25. Both sentences predate the phase. This phase's contract is byte-identical rendering (HYDV-01, D-08), and fixing the grammar is a visible change to `HydrationView.ts`'s plural rule plus H5, V14 and the spec's quoted wording. Recorded as a follow-up for a phase that owns the wording. |
