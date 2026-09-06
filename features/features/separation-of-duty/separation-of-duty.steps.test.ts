import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { attributionThenSteps } from "../../step-definitions/AttributionThenSteps.ts";
import { environmentGivenSteps } from "../../step-definitions/EnvironmentGivenSteps.ts";
import { reasonThenSteps } from "../../step-definitions/ReasonThenSteps.ts";
import { separationOfDutyWhenSteps } from "../../step-definitions/SeparationOfDutyWhenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./separation-of-duty.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(attributionThenSteps);
  use(environmentGivenSteps);
  use(reasonThenSteps);
  use(separationOfDutyWhenSteps);
  use(subjectGivenSteps);
});
