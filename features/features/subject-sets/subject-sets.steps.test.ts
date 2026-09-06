import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { environmentGivenSteps } from "../../step-definitions/EnvironmentGivenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectSetGivenSteps } from "../../step-definitions/SubjectSetGivenSteps.ts";
import { subjectSetThenSteps } from "../../step-definitions/SubjectSetThenSteps.ts";
import { subjectSetWhenSteps } from "../../step-definitions/SubjectSetWhenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./subject-sets.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(environmentGivenSteps);
  use(subjectSetGivenSteps);
  use(subjectSetThenSteps);
  use(subjectSetWhenSteps);
});
