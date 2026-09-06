import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { attributionThenSteps } from "../../step-definitions/AttributionThenSteps.ts";
import { chineseWallWhenSteps } from "../../step-definitions/ChineseWallWhenSteps.ts";
import { environmentGivenSteps } from "../../step-definitions/EnvironmentGivenSteps.ts";
import { historyGivenSteps } from "../../step-definitions/HistoryGivenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./chinese-wall.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(attributionThenSteps);
  use(chineseWallWhenSteps);
  use(environmentGivenSteps);
  use(historyGivenSteps);
  use(subjectGivenSteps);
});
