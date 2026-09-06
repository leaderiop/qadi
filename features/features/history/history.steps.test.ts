import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { environmentGivenSteps } from "../../step-definitions/EnvironmentGivenSteps.ts";
import { errorThenSteps } from "../../step-definitions/ErrorThenSteps.ts";
import { historyGivenSteps } from "../../step-definitions/HistoryGivenSteps.ts";
import { historyWhenSteps } from "../../step-definitions/HistoryWhenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./history.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(environmentGivenSteps);
  use(errorThenSteps);
  use(historyGivenSteps);
  use(historyWhenSteps);
  use(subjectGivenSteps);
});
