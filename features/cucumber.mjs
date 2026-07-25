/**
 * Cucumber configuration.
 *
 * `.mjs` rather than `.ts`: Cucumber 11 rejects a TypeScript config file.
 *
 * Step definitions are NOT listed here. The config file's `import` key is not
 * honoured for these files — steps register as undefined — so they are passed
 * on the command line with `-i` in the package scripts instead, world first so
 * that `setWorldConstructor` runs before any step is registered.
 */
export default {
  default: {
    paths: ["features/**/*.feature"],
    format: ["summary", "json:reports/cucumber-report.json"],
    strict: true,
  },
};
