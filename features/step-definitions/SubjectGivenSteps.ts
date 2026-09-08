import { defineSteps } from "@effect-cucumber/vitest";
import { parsePermissionKey, patch, readState, World } from "./SharedWorld.ts";

/**
 * Basic subject setup: identity, permissions, roles, attributes.
 *
 * Split out of the former monolithic `GivenSteps.ts` (the original "Subject"
 * section) so each Feature file only registers the step patterns it actually
 * exercises — see the features/ package README migration notes for why.
 */
export const subjectGivenSteps = defineSteps<World>(({ Given }) => {
  Given("a subject {string}", function* (id: string) {
    yield* patch(() => ({ subjectId: id }));
  });

  Given("the subject has permission {string}", function* (key: string) {
    const [resource, action] = parsePermissionKey(key);
    const s = yield* readState();
    yield* patch(() => ({ permissions: [...s.permissions, `${resource}:${action}`] }));
  });

  Given("the subject has no permissions", function* () {
    yield* patch(() => ({ permissions: [] }));
  });

  Given("the subject has role {string}", function* (name: string) {
    const s = yield* readState();
    yield* patch(() => ({ roles: [...s.roles, name] }));
  });

  Given("the subject has attribute {string} of {int}", function* (key: string, value: number) {
    const s = yield* readState();
    yield* patch(() => ({ attributes: { ...s.attributes, [key]: value } }));
  });

  Given("the subject has attribute {string} of {string}", function* (key: string, value: string) {
    const s = yield* readState();
    yield* patch(() => ({ attributes: { ...s.attributes, [key]: value } }));
  });
});
