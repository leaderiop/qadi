import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { actionWhenSteps } from "../../step-definitions/ActionWhenSteps.ts";
import { environmentGivenSteps } from "../../step-definitions/EnvironmentGivenSteps.ts";
import { errorThenSteps } from "../../step-definitions/ErrorThenSteps.ts";
import { requestGivenSteps } from "../../step-definitions/RequestGivenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./actions.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(actionWhenSteps);
  use(environmentGivenSteps);
  use(errorThenSteps);
  use(requestGivenSteps);
  use(subjectGivenSteps);
});
