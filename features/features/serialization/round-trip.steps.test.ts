import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { fieldVisibilityThenSteps } from "../../step-definitions/FieldVisibilityThenSteps.ts";
import { fieldVisibilityWhenSteps } from "../../step-definitions/FieldVisibilityWhenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./round-trip.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(fieldVisibilityThenSteps);
  use(fieldVisibilityWhenSteps);
  use(subjectGivenSteps);
});
