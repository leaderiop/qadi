import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import { fileURLToPath } from "node:url";
import { explanationThenSteps } from "../../step-definitions/ExplanationThenSteps.ts";
import { explanationWhenSteps } from "../../step-definitions/ExplanationWhenSteps.ts";
import { WorldLive } from "../../step-definitions/SharedWorldLive.ts";

const feature = await loadFeature(fileURLToPath(new URL("./explanation.feature", import.meta.url)));

describeFeature(feature, WorldLive, ({ use }) => {
  use(explanationThenSteps);
  use(explanationWhenSteps);
});
