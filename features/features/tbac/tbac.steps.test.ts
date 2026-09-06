import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { attributionThenSteps } from "../../step-definitions/AttributionThenSteps.ts";
import { environmentGivenSteps } from "../../step-definitions/EnvironmentGivenSteps.ts";
import { historyGivenSteps } from "../../step-definitions/HistoryGivenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";
import { tbacWhenSteps } from "../../step-definitions/TBACWhenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./tbac.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(attributionThenSteps);
  use(environmentGivenSteps);
  use(historyGivenSteps);
  use(subjectGivenSteps);
  use(tbacWhenSteps);
});
