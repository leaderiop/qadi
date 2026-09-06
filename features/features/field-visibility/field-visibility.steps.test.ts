import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { fieldVisibilityThenSteps } from "../../step-definitions/FieldVisibilityThenSteps.ts";
import { fieldVisibilityWhenSteps } from "../../step-definitions/FieldVisibilityWhenSteps.ts";
import { permissionWhenSteps } from "../../step-definitions/PermissionWhenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./field-visibility.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(fieldVisibilityThenSteps);
  use(fieldVisibilityWhenSteps);
  use(permissionWhenSteps);
  use(subjectGivenSteps);
});
