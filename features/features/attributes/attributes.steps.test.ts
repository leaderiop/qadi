import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { attributeWhenSteps } from "../../step-definitions/AttributeWhenSteps.ts";
import { environmentGivenSteps } from "../../step-definitions/EnvironmentGivenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./attributes.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(attributeWhenSteps);
  use(environmentGivenSteps);
  use(subjectGivenSteps);
});
