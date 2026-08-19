/**
 * A complete, deterministic evaluation environment.
 *
 * Evaluation ids are sequential rather than random, so decisions can be
 * asserted on exactly.
 */
import { currentSubjectLayer } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import * as Layer from "effect/Layer";
import type { QadiTestServices, TestLayerOptions } from "./QadiReviewLayer.ts";
import { qadiReviewLayer } from "./QadiReviewLayer.ts";

export const qadiTestLayer = (
  subject: AuthSubject,
  options?: TestLayerOptions,
): Layer.Layer<QadiTestServices> =>
  Layer.mergeAll(currentSubjectLayer(subject), qadiReviewLayer(options));
