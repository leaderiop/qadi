import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { attributionThenSteps } from "../../step-definitions/AttributionThenSteps.ts";
import { securityLabelGivenSteps } from "../../step-definitions/SecurityLabelGivenSteps.ts";
import { securityLabelWhenSteps } from "../../step-definitions/SecurityLabelWhenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./mls.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(attributionThenSteps);
  use(securityLabelGivenSteps);
  use(securityLabelWhenSteps);
  use(subjectGivenSteps);
});
