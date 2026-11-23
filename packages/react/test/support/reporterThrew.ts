/**
 * The line the console receives when a supplied reporter throws.
 *
 * The one place the reporter tests state the `ReporterThrew` sentence, written out here
 * and not read from the library, so a reworded sentence fails every file that compares
 * it. Consumers grep these messages, so a test compares the whole line.
 */
export const threw = (reporter: string, error: string): string =>
  `[qadi] the ${reporter} reporter you supplied threw (${error}). The outcome it was told ` +
  "about stands — nothing was skipped, seeded differently or left uncounted. Fix the reporter.";
