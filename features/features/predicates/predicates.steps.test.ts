import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { predicateThenSteps } from "../../step-definitions/PredicateThenSteps.ts";
import { predicateWhenSteps } from "../../step-definitions/PredicateWhenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./predicates.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(predicateThenSteps);
  use(predicateWhenSteps);
  use(subjectGivenSteps);
});
