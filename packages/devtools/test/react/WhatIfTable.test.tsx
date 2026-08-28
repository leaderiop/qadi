/**
 * JOB 7's table, rendered directly.
 *
 * Presentational, so it is fed reports rather than driven through the form:
 * every row shape a sweep can produce needs to render, and reaching four of
 * them through the UI would mean four contrived policies where a report says it
 * in one line. The reports themselves still come from `whatIf` wherever a real
 * sweep produces the shape — hand-built comparisons appear only for the arms a
 * fixture-backed sweep cannot reach.
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach } from "vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  allOf,
  anyOf,
  AttributeResolveError,
  AttributeResolver,
  CustomPredicateNone,
  SignatureHistoryNone,
  Decided,
  DecisionHistoryUnknown,
  Failed,
  gte,
  hasAttribute,
  hasPermission,
  hasRole,
  labeled,
  MissingResource,
  permission,
  permitWhen,
  rules,
  RelationshipResolverNever,
} from "@qadi/core";
import type { DecisionOutcome, Policy } from "@qadi/core";
import { live } from "../../src/model/Sources.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { whatIf } from "../../src/model/WhatIf.ts";
import type { Comparison, WhatIfReport, WhatIfRow } from "../../src/model/WhatIf.ts";
import { WhatIfTable } from "../../src/react/WhatIfTable.tsx";
import { allow, deny } from "../helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const read = permission("doc", "read");

const brokenPorts = Layer.mergeAll(
  Layer.succeed(AttributeResolver, {
    name: "broken",
    resolve: (_subjectId: string, attribute: string) =>
      Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
  }),
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  CustomPredicateNone,
  SignatureHistoryNone,
);

const sweep = (
  policy: Policy,
  input: SimulationInput,
  options?: Parameters<typeof whatIf>[2],
): Promise<WhatIfReport> => Effect.runPromise(whatIf(policy, input, options));

/** One synthetic row, for a comparison a fixture-backed sweep cannot produce. */
const rowWith = (label: string, comparison: Comparison, outcome: DecisionOutcome): WhatIfRow => ({
  edit: { kind: "DropRole", direction: "Weaken", label, apply: (self) => self },
  input: { subject: { id: "alice" } },
  outcome,
  comparison,
});

const reportOf = (rows: ReadonlyArray<WhatIfRow>): WhatIfReport => ({
  baseline: new Decided({ decision: allow() }),
  rows,
  edits: rows.map((row) => row.edit),
  skipped: [],
  omittedPairs: 0,
  evaluations: rows.length + 1,
  causesIO: false,
});

const cells = () => screen.getAllByTestId("qadi-whatif-row").map((row) => row.textContent ?? "");

describe("the rows a real sweep produces", () => {
  it("marks a row that changed nothing, rather than dropping it", async () => {
    // Neither grant is load-bearing, so the single edits change nothing — and
    // that is the answer to "was it this?", not a row to hide.
    const report = await sweep(
      anyOf([hasRole("a"), hasRole("b")]),
      { subject: { id: "alice", roles: ["a", "b"] } },
      { remedies: false },
    );
    render(<WhatIfTable report={report} />);

    assert.isNotEmpty(screen.queryAllByTestId("qadi-whatif-nochange"));
  });

  it("names the node a flip turned at, and its label when it has one", async () => {
    const report = await sweep(
      labeled("the gate", allOf([hasRole("a"), hasRole("b")])),
      { subject: { id: "alice", roles: ["a", "b"] } },
      { remedies: false },
    );
    render(<WhatIfTable report={report} />);

    const flipped = screen.getAllByTestId("qadi-whatif-flipped")[0]?.textContent ?? "";
    assert.include(flipped, "the root");
    assert.include(flipped, "allowed → denied");
    assert.include(flipped, "(the gate)");
  });

  /**
   * A flip below the root, with the root's own verdict unchanged.
   *
   * `DenyOverrides` has to look at every row before it can conclude there is no
   * deny, so both rows are evaluated and the child count holds steady — which is
   * what lets `diffTraces` descend and report the inner node. Under a
   * short-circuiting combinator the same edit changes the tree's *shape*, and
   * the walk stops at the root by design.
   */
  it("names a path below the root when that is where the flip was", async () => {
    const report = await sweep(
      rules([permitWhen(hasRole("a")), permitWhen(hasRole("b"))], {
        combining: "DenyOverrides",
      }),
      { subject: { id: "alice", roles: ["a", "b"] } },
      { remedies: false },
    );
    render(<WhatIfTable report={report} />);

    const paths = screen.getAllByTestId("qadi-whatif-flipped").map((one) => one.textContent ?? "");
    assert.isTrue(paths.some((one) => one.includes("$.1")), paths.join(" | "));
  });

  it("names a difference that is not a flip", async () => {
    // The verdict holds and the field set narrows, which is a real change to
    // what the caller may do (INV-QD-004).
    const report = await sweep(
      anyOf([hasRole("a"), hasPermission(read, { fields: ["title"] })]),
      { subject: { id: "alice", roles: ["a"], permissions: ["doc:read"] } },
      { remedies: false },
    );
    render(<WhatIfTable report={report} />);

    assert.include(
      screen.getAllByTestId("qadi-whatif-kinds").map((k) => k.textContent).join(" "),
      "visible fields",
    );
  });

  it("marks a strengthening apart from a weakening, and a pair of both as mixed", async () => {
    const report = await sweep(
      allOf([hasRole("a"), hasRole("b")]),
      { subject: { id: "alice", roles: ["a"] } },
      { pairs: true },
    );
    render(<WhatIfTable report={report} />);

    // The marker and the label are separate elements, so `textContent` runs
    // them together — which is what a reader sees anyway.
    const text = cells().join("\n");
    assert.include(text, "−without role a");
    assert.include(text, "+with role b");
    assert.include(text, "±without role a + with role b");
  });

  it("reports an edit that broke the evaluation as an error, never a denial", async () => {
    const report = await sweep(
      anyOf([hasRole("a"), hasAttribute("clearance", gte(5))]),
      { subject: { id: "alice", roles: ["a"] } },
      { source: live(brokenPorts), remedies: false },
    );
    render(<WhatIfTable report={report} />);

    const broke = screen.getByTestId("qadi-whatif-error").textContent ?? "";
    assert.include(broke, "AttributeResolveError");
    assert.include(broke, "nothing was decided");
  });

  it("says what the pair cap excluded", async () => {
    const report = await sweep(
      hasRole("z"),
      { subject: { id: "alice", roles: ["a", "b", "c", "d"] } },
      { pairs: true, maxPairs: 2, remedies: false },
    );
    render(<WhatIfTable report={report} />);

    assert.include(screen.getByTestId("qadi-whatif-omitted").textContent ?? "", "4 further pairs");
  });

  it("names a requirement no remedy could be built for", async () => {
    const report = await sweep(hasAttribute("dept", { _tag: "In", values: [] }), {
      subject: { id: "alice" },
    });
    render(<WhatIfTable report={report} />);

    assert.include(
      screen.getByTestId("qadi-whatif-skipped").textContent ?? "",
      "an empty `in` accepts nothing",
    );
  });
});

describe("the rows a fixture-backed sweep cannot produce", () => {
  it("reports an edit that decided where the unedited input could not", () => {
    render(
      <WhatIfTable
        report={reportOf([
          rowWith(
            "with role editor",
            { _tag: "Recovered", decision: allow() },
            new Decided({ decision: allow() }),
          ),
        ])}
      />,
    );

    assert.include(cells().join(""), "decided, where the unedited input could not");
  });

  it("tells the same failure from a different one", () => {
    const before = new MissingResource({ attribute: "a" });
    const after = new AttributeResolveError({ attribute: "b", cause: "down" });

    render(
      <WhatIfTable
        report={reportOf([
          rowWith(
            "same",
            { _tag: "StillFailed", before, after: before, same: true },
            new Failed({ error: before }),
          ),
          rowWith(
            "different",
            { _tag: "StillFailed", before, after, same: false },
            new Failed({ error: after }),
          ),
        ])}
      />,
    );

    const text = cells().join("\n");
    assert.include(text, "still MissingResource");
    assert.include(text, "MissingResource then, AttributeResolveError now");
  });

  it("says nothing to vary in words, rather than showing an empty table", () => {
    render(<WhatIfTable report={reportOf([])} />);

    assert.include(screen.getByTestId("qadi-whatif-empty").textContent ?? "", "no grant to drop");
    assert.strictEqual(screen.getByTestId("qadi-whatif-count").textContent, "0 variations of 1 evaluation");
  });

  it("agrees with itself about singulars", () => {
    render(
      <WhatIfTable
        report={{
          ...reportOf([
            rowWith(
              "one",
              { _tag: "Compared", differences: [], flipped: undefined },
              new Decided({ decision: deny() }),
            ),
          ]),
          omittedPairs: 1,
        }}
      />,
    );

    assert.strictEqual(
      screen.getByTestId("qadi-whatif-count").textContent,
      "1 variation of 2 evaluations",
    );
    assert.include(screen.getByTestId("qadi-whatif-omitted").textContent ?? "", "1 further pair was");
    // The verdict differs from the baseline's, so the row says what it was.
    assert.include(cells().join(""), "was Allow");
  });
});

describe("filtering", () => {
  it("keeps only the rows that changed, and restores them", async () => {
    const report = await sweep(
      anyOf([hasRole("a"), hasRole("b")]),
      { subject: { id: "alice", roles: ["a", "b"] } },
      { pairs: true, remedies: false },
    );
    render(<WhatIfTable report={report} />);

    const all = screen.getAllByTestId("qadi-whatif-row").length;
    act(() => {
      fireEvent.click(screen.getByTestId("qadi-whatif-only-changed"));
    });
    const changed = screen.getAllByTestId("qadi-whatif-row").length;
    assert.isBelow(changed, all);

    act(() => {
      fireEvent.click(screen.getByTestId("qadi-whatif-only-changed"));
    });
    assert.strictEqual(screen.getAllByTestId("qadi-whatif-row").length, all);
  });
});
