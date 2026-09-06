import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { customPredicateGivenSteps } from "../../step-definitions/CustomPredicateGivenSteps.ts";
import { customPredicateWhenSteps } from "../../step-definitions/CustomPredicateWhenSteps.ts";
import { errorThenSteps } from "../../step-definitions/ErrorThenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./custom-predicates.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(customPredicateGivenSteps);
  use(customPredicateWhenSteps);
  use(errorThenSteps);
  use(subjectGivenSteps);
});
