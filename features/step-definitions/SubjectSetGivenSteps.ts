import { defineSteps } from "@effect-cucumber/vitest";
import { patch, readState, World } from "./SharedWorld.ts";

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
    const [resource, action] = key.split(":");
    if (resource === undefined || action === undefined) {
      throw new Error(`malformed permission key: ${key}`);
    }
    const s = yield* readState();
    yield* patch(() => ({
      candidates: [...s.candidates, { id, roles: [], permissions: [`${resource}:${action}`] }],
    }));
  });
});
