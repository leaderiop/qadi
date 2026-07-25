export default {
  default: {
    paths: ["features/**/*.feature"],
    // World must load first so step files can extend it.
    import: ["step-definitions/world.ts", "step-definitions/**/*.steps.ts"],
    format: ["progress", "json:reports/cucumber-report.json"],
    strict: true,
    worldParameters: {},
  },
};
