import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { signatureLoopSteps } from "../../step-definitions/SignatureLoopSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./signatures.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(signatureLoopSteps);
  use(subjectGivenSteps);
});
