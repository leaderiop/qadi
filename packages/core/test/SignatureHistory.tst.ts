/**
 * Pins `signatureAnswerFromSignatures`'s result type: the read's answer or exactly
 * its two failures. No deliberate compile error lives here, because
 * `tsconfig.test.json` also compiles every `*.tst.ts`.
 */
import type * as Result from "effect/Result";
import { expect, test } from "tstyche";
import type { MissingResourceId, SignatureHistoryUnavailable } from "../src/Errors.ts";
import type { LeafOf, ReadSite } from "../src/PortDescription.ts";
import { signatureAnswerFromSignatures } from "../src/SignatureHistory.ts";
import type { SignatureAnswer } from "../src/SignatureHistory.ts";

declare const leaf: LeafOf["HasSignature"];
declare const site: ReadSite;

test("signatureAnswerFromSignatures answers a SignatureAnswer or exactly its \
two failures", () => {
  expect(signatureAnswerFromSignatures).type.toBeCallableWith(
    [{ subjectId: "alice", meaning: "approved" }],
    leaf,
    site,
  );
  expect(signatureAnswerFromSignatures([], leaf, site)).type.toBe<
    Result.Result<SignatureAnswer, MissingResourceId | SignatureHistoryUnavailable>
  >();
});
