/**
 * Type-level tests for the signature capture path: the handler needs no ambient
 * subject, and a capture request always carries the question's key.
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type { ObligationDischarge, Resource, ResourceId } from "@qadi/core";
import { signatureObligationHandler } from "../src/SignatureCapturePort.ts";
import type {
  SignatureCaptureError,
  SignatureCapturePortShape,
  SignatureCaptureRequest,
} from "../src/SignatureCapturePort.ts";
import type { SignatureLedgerError } from "../src/SignatureLedger.ts";

declare const port: SignatureCapturePortShape;

test("signatureObligationHandler takes a discharge and requires nothing from the environment", () => {
  const handler = signatureObligationHandler(port, "approved");
  expect(handler).type.toBe<
    (discharge: ObligationDischarge) => Effect.Effect<void, SignatureCaptureError | SignatureLedgerError, never>
  >();
});

test("a capture request carries the question's key as required fields", () => {
  expect<SignatureCaptureRequest["resourceId"]>().type.toBe<ResourceId | undefined>();
  expect<SignatureCaptureRequest["action"]>().type.toBe<string | undefined>();
  expect<SignatureCaptureRequest["resource"]>().type.toBe<Resource | undefined>();
  expect<SignatureCaptureRequest["evaluationId"]>().type.toBe<string>();
  // Required keys: a request built without them does not compile.
  expect<{
    meaning: string;
    signerId: SignatureCaptureRequest["signerId"];
    obligationIds: ReadonlyArray<string>;
  }>().type.not.toBeAssignableTo<SignatureCaptureRequest>();
});
