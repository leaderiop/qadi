/**
 * A logger that replaces whatever is ambient and records every line it sees.
 *
 * Log capture was hand-rolled 27 times in 14 test files, in two shapes
 * (message only, and message plus `CurrentLogAnnotations`); both are
 * projections of {@link CapturedLog}. Like `collectingTracer`, it **replaces**
 * the ambient loggers rather than adding to them, so a test run stays quiet.
 */
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as References from "effect/References";

/** One recorded log line. */
export interface CapturedLog {
  /** What was logged (`Logger.Options.message`). */
  readonly message: unknown;
  /** The line's level, as `Logger.Options.logLevel` names it. */
  readonly level: string;
  /** The fiber's log annotations at the moment of logging. */
  readonly annotations: Readonly<{ readonly [key: string]: unknown }>;
}

/**
 * Provide `layer` anywhere the logging to be watched will run, and read
 * `lines` afterward.
 *
 * `lines` is a live array the layer appends to, so it can be read after the
 * effect under test completes. `Layer<never>`: a logger is not a service
 * requirement, so supplying this adds nothing to anybody's `R`.
 */
export const collectingLogger = (): {
  readonly lines: ReadonlyArray<CapturedLog>;
  readonly layer: Layer.Layer<never>;
} => {
  const lines: Array<CapturedLog> = [];
  const layer = Logger.layer([
    Logger.make((options) => {
      lines.push({
        message: options.message,
        level: options.logLevel,
        annotations: options.fiber.getRef(References.CurrentLogAnnotations),
      });
    }),
  ]);
  return { lines, layer };
};
