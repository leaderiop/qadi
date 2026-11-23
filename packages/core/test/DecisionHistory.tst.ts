/**
 * Pins `actedAnswerFromEvents`'s result type: a closed-world answer or the history
 * read's two failures, nothing else. No deliberate compile error lives here,
 * because `tsconfig.test.json` also compiles every `*.tst.ts`.
 */
import type * as Result from "effect/Result";
import { expect, test } from "tstyche";
import { actedAnswerFromEvents } from "../src/DecisionHistory.ts";
import type { DecisionHistoryUnavailable, MissingResourceId } from "../src/Errors.ts";
import type { LeafOf, ReadSite } from "../src/PortDescription.ts";

declare const leaf: LeafOf["HasActed"];
declare const site: ReadSite;

test("actedAnswerFromEvents answers Acted or NotActed, or fails as the history \
read fails", () => {
  expect(actedAnswerFromEvents).type.toBeCallableWith(
    [{ subjectId: "alice", event: "approved", resourceId: "doc-1" }],
    leaf,
    site,
  );
  expect(actedAnswerFromEvents([], leaf, site)).type.toBe<
    Result.Result<"Acted" | "NotActed", MissingResourceId | DecisionHistoryUnavailable>
  >();
});
