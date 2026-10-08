import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { environmentGivenSteps } from "../../step-definitions/EnvironmentGivenSteps.ts";
import { obligationThenSteps } from "../../step-definitions/ObligationThenSteps.ts";
import { obligationWhenSteps } from "../../step-definitions/ObligationWhenSteps.ts";
import { requestGivenSteps } from "../../step-definitions/RequestGivenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./obligations.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(environmentGivenSteps);
  use(obligationThenSteps);
  use(obligationWhenSteps);
  use(requestGivenSteps);
  use(subjectGivenSteps);
});
