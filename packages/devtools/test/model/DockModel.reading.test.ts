/**
 * Pins what the dock model's shown reading carries and where a supplied reading's
 * questions go.
 *
 * The shown reading is the four fields the poll samples, merged with what the host
 * supplied. The questions a supplied reading carries are not part of it: the questions
 * store reads them from the supplied reading, on the configure that hands them over.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { makeDockModel } from "../../src/model/DockModel.ts";
import { heardOn, readPolicy } from "../helpers.ts";

describe("the dock's shown reading and the questions a reading supplies", () => {
  it.effect("MR1 a supplied reading's questions are not part of the shown reading", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();

      model.configure({ reading: { questions: [{ policy: readPolicy }] } });

      assert.isFalse("questions" in model.diagnostics.getSnapshot().reading);
    }),
  );

  it.effect("MR2 a supplied reading's questions reach the questions store on the configure that hands them", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      const heard = heardOn(model.questions);

      model.configure({ reading: { questions: [{ policy: readPolicy }] } });

      assert.strictEqual(heard.calls, 1);
      const { questions } = model.questions.getSnapshot();
      assert.strictEqual(questions._tag, "Rows");
      assert.strictEqual(questions._tag === "Rows" ? questions.rows.length : 0, 1);
    }),
  );
});
