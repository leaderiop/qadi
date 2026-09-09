import { defineSteps } from "@effect-cucumber/vitest";
import { parsePermissionKey, patch, readState, World } from "./SharedWorld.ts";

/** Candidates for a subject-set review (`filterSubjects`/`decideSubjects`). */
export const subjectSetGivenSteps = defineSteps<World>(({ Given }) => {
  Given("the candidate {string}", function* (id: string) {
    const s = yield* readState();
    yield* patch(() => ({ candidates: [...s.candidates, { id, roles: [], permissions: [] }] }));
  });

  Given("the candidate {string} with role {string}", function* (id: string, name: string) {
    const s = yield* readState();
    yield* patch(() => ({
      candidates: [...s.candidates, { id, roles: [name], permissions: [] }],
    }));
  });

  Given("the candidate {string} with permission {string}", function* (id: string, key: string) {
    const [resource, action] = parsePermissionKey(key);
    const s = yield* readState();
    yield* patch(() => ({
      candidates: [...s.candidates, { id, roles: [], permissions: [`${resource}:${action}`] }],
    }));
  });

  /**
   * Simulates one candidate's attribute store breaking rather than answering
   * — the flaky-resolver scenario issue #107's `decideSubjects`/
   * `filterSubjects` rewrite exists for: this candidate's lookup fails, and
   * the rest of the review must still complete.
   */
  Given("the candidate {string} whose attribute lookup fails", function* (id: string) {
    const s = yield* readState();
    yield* patch(() => ({
      candidates: [...s.candidates, { id, roles: [], permissions: [] }],
      brokenCandidates: [...s.brokenCandidates, id],
    }));
  });
});
