import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { environmentGivenSteps } from "../../step-definitions/EnvironmentGivenSteps.ts";
import { errorThenSteps } from "../../step-definitions/ErrorThenSteps.ts";
import { reasonThenSteps } from "../../step-definitions/ReasonThenSteps.ts";
import { relationshipWhenSteps } from "../../step-definitions/RelationshipWhenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./relationships.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(environmentGivenSteps);
  use(errorThenSteps);
  use(reasonThenSteps);
  use(relationshipWhenSteps);
  use(subjectGivenSteps);
});
