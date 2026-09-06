import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { attributionThenSteps } from "../../step-definitions/AttributionThenSteps.ts";
import { integrityGivenSteps } from "../../step-definitions/IntegrityGivenSteps.ts";
import { integrityWhenSteps } from "../../step-definitions/IntegrityWhenSteps.ts";
import { requestGivenSteps } from "../../step-definitions/RequestGivenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./biba.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(attributionThenSteps);
  use(integrityGivenSteps);
  use(integrityWhenSteps);
  use(requestGivenSteps);
  use(subjectGivenSteps);
});
