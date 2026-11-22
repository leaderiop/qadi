/**
 * Pins the exact words the services panel renders for every port, so moving a port's
 * reading into one table cannot change one.
 *
 * Written on the phase base (ARCH-94) before `describeOne` and the consequence lines move
 * into one port-reading table, and needed because `ServicesPanel.tsx` is outside the
 * devtools mutation glob: no mutant would catch a changed word there. Every reading is
 * compared whole, never by substring, and this file names nothing the base lacks, so it
 * stays unchanged through the move.
 *
 * The call readings and the real-report render cases moved to `PortCards.test.ts` in
 * ARCH-102, where the words are decided; what stays is the consequence table itself.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { wiringReport } from "../../src/model/Wiring.ts";

const ATTRIBUTE_CONSEQUENCE =
  "a missing attribute resolves to undefined, so an attribute policy denies";

describe("the consequence line and the card, from the real wiring report", () => {
  it.effect("five consequences, byte for byte", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;

      assert.deepStrictEqual(
        report.ports.slice(0, 5).map((p) => [p.port, p.consequence]),
        [
          ["AttributeResolver", ATTRIBUTE_CONSEQUENCE],
          ["DecisionHistory", "the three-valued default denies hasActed and hasNotActed alike"],
          ["RelationshipResolver", "an unanswered relationship denies"],
          [
            "CustomPredicate",
            "every hasCustom node denies, since no registered predicate can be reached",
          ],
          [
            "SignatureHistory",
            "an unwired signature history answers no signatures on file, so every hasSignature node denies",
          ],
        ],
      );
    }));
});
