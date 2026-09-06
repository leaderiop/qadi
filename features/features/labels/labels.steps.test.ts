import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { requestGivenSteps } from "../../step-definitions/RequestGivenSteps.ts";
import { securityLabelGivenSteps } from "../../step-definitions/SecurityLabelGivenSteps.ts";
import { securityLabelWhenSteps } from "../../step-definitions/SecurityLabelWhenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./labels.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(requestGivenSteps);
  use(securityLabelGivenSteps);
  use(securityLabelWhenSteps);
  use(subjectGivenSteps);
});
