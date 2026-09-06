import { defineSteps } from "@effect-cucumber/vitest";
import { patch, readState, World } from "./SharedWorld.ts";

/** Decision-history setup, used by the workflow and Chinese Wall scenarios. */
export const historyGivenSteps = defineSteps<World>(({ Given }) => {
  Given(
    "the history records that {string} raised {string}",
    function* (subjectId: string, resourceId: string) {
      const s = yield* readState();
      yield* patch(() => ({
        events: [...(s.events ?? []), { subjectId, event: "raised", resourceId }],
      }));
    },
  );

  /**
   * A conflict-of-interest access, keyed `[subject, class, company]`.
   *
   * The conflict **class is the event** and the **company is the resource**, which
   * is the whole reason Brewer–Nash needed no construct of its own: it is two
   * questions the one-member port already answers (ADR-QD-020).
   */
  Given(
    "the history records that {string} accessed {string} in the {string} class",
    function* (subjectId: string, company: string, conflictClass: string) {
      const s = yield* readState();
      yield* patch(() => ({
        events: [...(s.events ?? []), { subjectId, event: conflictClass, resourceId: company }],
      }));
    },
  );

  Given(
    "the history records that {string} approved {string}",
    function* (subjectId: string, resourceId: string) {
      const s = yield* readState();
      yield* patch(() => ({
        events: [...(s.events ?? []), { subjectId, event: "approved", resourceId }],
      }));
    },
  );

  Given("the history store is unreachable", function* () {
    yield* patch(() => ({ historyUnreachable: true }));
  });
});
