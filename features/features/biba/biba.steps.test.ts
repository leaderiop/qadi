import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { givenSteps } from "../../step-definitions/GivenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";
import { thenSteps } from "../../step-definitions/ThenSteps.ts";
import { whenSteps } from "../../step-definitions/WhenSteps.ts";

const feature = await loadFeature(fileURLToPath(new URL("./biba.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(givenSteps);
  use(whenSteps);
  use(thenSteps);
});
