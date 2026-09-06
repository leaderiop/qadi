import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { environmentGivenSteps } from "../../step-definitions/EnvironmentGivenSteps.ts";
import { reasonThenSteps } from "../../step-definitions/ReasonThenSteps.ts";
import { ruleTableThenSteps } from "../../step-definitions/RuleTableThenSteps.ts";
import { ruleTableWhenSteps } from "../../step-definitions/RuleTableWhenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./rules.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(environmentGivenSteps);
  use(reasonThenSteps);
  use(ruleTableThenSteps);
  use(ruleTableWhenSteps);
  use(subjectGivenSteps);
});
