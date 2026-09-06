import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { accessThenSteps } from "../../step-definitions/AccessThenSteps.ts";
import { permissionWhenSteps } from "../../step-definitions/PermissionWhenSteps.ts";
import { reasonThenSteps } from "../../step-definitions/ReasonThenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { subjectGivenSteps } from "../../step-definitions/SubjectGivenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./permissions.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(accessThenSteps);
  use(permissionWhenSteps);
  use(reasonThenSteps);
  use(subjectGivenSteps);
});
