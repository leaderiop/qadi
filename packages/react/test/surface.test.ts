/**
 * The runtime values of `@qadi/react`'s root, as a list (ADR-QD-099).
 *
 * The list of values below *is* the interface a consumer's code crosses at run
 * time: the provider, the atoms and hooks that read a decision, hydration and the
 * gate registry. A module the root leaves out is package-private and free to
 * change.
 *
 * Changing the list is three deliberate edits, not one: the barrel line, a
 * `spec/overview.md` row that `node scripts/check-api-surface.mjs` checks, and
 * this file. Type names are that script's, not this file's: it reads every name
 * from the built declarations and cannot tell a value from a type. A value
 * re-exported type-only keeps its name there and drops out of the module at run
 * time, which is what this list catches and that script cannot.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Root from "../src/index.ts";

const ROOT_VALUES: ReadonlyArray<string> = [
  "Can",
  "Cannot",
  "DecisionOutcome",
  "MissingQadiProviderError",
  "QadiProvider",
  "SeededAllow",
  "SeededDeny",
  "currentDecision",
  "dehydrateDecisions",
  "hydrateDecisions",
  "isSeeded",
  "makeGateRegistry",
  "makeQadiAtoms",
  "outcomeOf",
  "permits",
  "runtimeLayer",
  "useAtomValue",
  "useCan",
  "useDecision",
  "useDecisionSuspense",
  "useDevtoolsFeed",
  "useGateInstances",
  "useInvalidate",
  "usePolicies",
  "useProjected",
  "useQadiContext",
  "useQuestions",
  "useSubject",
];

describe("@qadi/react's root", () => {
  it("exports exactly these runtime values", () => {
    assert.deepStrictEqual(Object.keys(Root).sort(), [...ROOT_VALUES].sort());
  });

  it("reaches useQadiContext from the package root", () => {
    assert.strictEqual(typeof Root.useQadiContext, "function");
  });
});
