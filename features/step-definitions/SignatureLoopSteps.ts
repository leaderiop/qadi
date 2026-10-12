import { defineSteps } from "@effect-cucumber/vitest";
import * as Effect from "effect/Effect";
import { SignatureLedgerTest, signatureHistoryFromLedger, signatureObligationHandler } from "@qadi/audit";
import type { SignatureCapturePortShape } from "@qadi/audit";
import {
  decide,
  guard,
  hasPermission,
  hasSignature,
  obligation,
  obliged,
  permission,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { qadiTestLayer } from "@qadi/testing";
import assert from "node:assert/strict";
import { patch, readState, subjectOf, World } from "./SharedWorld.ts";

const approve = permission("doc", "approve");

/** A capture that persists nothing itself: the ledger is the store. */
const capturingPort: SignatureCapturePortShape = {
  capture: (request) =>
    Effect.succeed({ signerId: request.signerId, signedAt: 0, meaning: request.meaning }),
  validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
};

/** Whether a signature check, asked of the ledger, holds for the subject in the world. */
const holds = Effect.fn("features.signatureHolds")(function* (
  policy: Policy,
  resource: Record<string, unknown>,
) {
  const w = yield* readState();
  const ledger = w.signatureLedger;
  assert.ok(ledger !== undefined, "no signature was captured in this scenario");
  const decision = yield* decide(policy, { resource }).pipe(
    Effect.provide(
      qadiTestLayer(subjectOf(w), {
        ports: { SignatureHistory: { layer: signatureHistoryFromLedger(ledger) } },
      }),
    ),
  );
  return decision._tag === "Allow";
});

/** The obligation -> capture -> ledger -> `hasSignature` loop, as scenarios. */
export const signatureLoopSteps = defineSteps<World>(({ When, Then }) => {
  When("they approve {string} and a signature is captured", function* (id: string) {
    const w = yield* readState();
    const { ledger } = SignatureLedgerTest();
    yield* patch(() => ({ signatureLedger: ledger }));
    yield* guard(approve, obliged(obligation("sig.approve"), hasPermission(approve)), {
      onObligations: signatureObligationHandler(capturingPort, "approved", { ledger }),
    })({ id }, () => Effect.void).pipe(Effect.provide(qadiTestLayer(subjectOf(w))));
  });

  Then("the {string} signature is on file for {string}", function* (meaning: string, id: string) {
    assert.equal(yield* holds(hasSignature(meaning), { id }), true);
  });

  Then("the {string} signature is not on file for {string}", function* (meaning: string, id: string) {
    assert.equal(yield* holds(hasSignature(meaning), { id }), false);
  });

  Then("the {string} signature is not on file for the subject at large", function* (meaning: string) {
    assert.equal(yield* holds(hasSignature(meaning, { scope: "Any" }), { id: "doc-1" }), false);
  });
});
