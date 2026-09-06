import { defineSteps } from "@effect-cucumber/vitest";
import { patch, readState, World } from "./SharedWorld.ts";

/**
 * Resource shape and resolved-attribute setup: the former "Environment"
 * section of `GivenSteps.ts`, split out so Feature files that only set up
 * resources (rather than security labels, history, or subject sets) don't
 * register step patterns they never invoke.
 */
export const environmentGivenSteps = defineSteps<World>(({ Given }) => {
  Given(
    "the attribute service resolves {string} to {int}",
    function* (key: string, value: number) {
      const s = yield* readState();
      yield* patch(() => ({ resolvedAttributes: { ...s.resolvedAttributes, [key]: value } }));
    },
  );

  Given(
    "the subject is {string} of resource {string}",
    function* (relation: string, resourceId: string) {
      const s = yield* readState();
      yield* patch(() => ({
        relationships: [
          ...(s.relationships ?? []),
          { subjectId: s.subjectId, relation, resourceId },
        ],
      }));
    },
  );

  /** The counterpart of "the history store is unreachable" — absent, not down. */
  Given("no relationship resolver is wired", function* () {
    yield* patch(() => ({ relationships: undefined }));
  });

  Given(
    "the resource {string} with attribute {string} of {string}",
    function* (id: string, key: string, value: string) {
      yield* patch(() => ({ resource: { id, [key]: value } }));
    },
  );

  Given("the resource {string}", function* (id: string) {
    yield* patch(() => ({ resource: { id } }));
  });

  Given("the resource {string} raised by {string}", function* (id: string, raisedBy: string) {
    yield* patch(() => ({ resource: { id, raisedBy } }));
  });

  Given("the resource {string} owned by {string}", function* (id: string, owner: string) {
    yield* patch(() => ({ resource: { id, owner } }));
  });

  Given("the resource {string} at level {int}", function* (id: string, level: number) {
    yield* patch(() => ({ resource: { id, level } }));
  });

  /** Brewer–Nash exempts anonymised material explicitly, and it needs no history. */
  Given("the sanitised material {string}", function* (id: string) {
    yield* patch(() => ({ resource: { id, sanitised: true } }));
  });

  /**
   * A purpose-built setter, because `"the resource … with attribute … of …"`
   * *replaces* the resource rather than merging into it — two attributes cannot be
   * chained, and a workflow step needs both its state and its raiser.
   */
  Given(
    "the task {string} in state {string} raised by {string}",
    function* (id: string, state: string, raisedBy: string) {
      yield* patch(() => ({ resource: { id, state, raisedBy } }));
    },
  );
});
