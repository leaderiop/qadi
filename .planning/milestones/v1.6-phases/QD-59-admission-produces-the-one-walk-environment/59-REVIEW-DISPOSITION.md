# Phase 59: Review Disposition

| Iteration | Critical | Warning | Info | Outcome |
|-----------|----------|---------|------|---------|
| 1 | 0 | 2 | 2 | All four fixed in `4da12142`. `Admitted` is typed by its row source, so a `"row"` environment cannot reach the walk. `Admitted` carries the policy it admitted. Mutation, after-fix bench and scan redone. One owner-approved amendment to `59-mutation.mjs` (`0a7710d0`). |
| 2 | 0 | 1 | 2 | All three fixed in `1ac8bccc`. One typed `SUPPLIED` table replaced the overload that acted as a cast, and two stale docs were corrected. Mutation and after-fix-2 bench redone; the scan reads every review round. |
| 3 | 0 | 2 | 1 | Both warnings fixed, comment and spec text only, in the commit after the iteration-3 review. The `"asked"` row's truth is stated as pinned by tests, not by the type, and the spec now names `SUPPLIED`. |

Iteration 3 is `--auto`'s cap. No critical or warning finding is open.

**Deferred, with reasons. Both are owner follow-ups:**
- **Iteration 3, WR-01's optional part: derive the `"asked"` row's resource flag from the matcher context `admit` builds.**
  - Doing so would make `supplied.resource` and `matcherContext.resource` agree by construction rather than by test.
  - It is an executable change, so it would need a fourth review round, a mutation run, a bench run and new scan pins, which is past the cap.
  - The runtime tests (E1 to E5, `LeafMatrix.test.ts`) pin the agreement today.
- **Iteration 3, IN-01: a private `Admitted` constructor with a static factory**, so only `admit` can build one.
  - The public constructor predates this phase.
  - `Admitted` is package-private, outside the barrel, with no `./*` export (ADR-QD-099).
