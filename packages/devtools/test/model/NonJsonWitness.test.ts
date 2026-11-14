/**
 * The regression for a remedy, a session command and a policy reading whose
 * value has no JSON form.
 *
 * A bigint or a cycle threw from the remedy label and escaped
 * `SimulationSession.commit`, and threw from `explain` under the policy rail and
 * the inspector. Every case is an expected failure on the base; the change that
 * guards the text flips them. The reading describe is last so it can be flipped
 * on its own.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import {
  contains,
  eq,
  hasAttribute,
  hasResourceAttribute,
  hasRole,
  inArray,
  literal,
  size,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { policyLabel } from "../../src/model/Catalogue.ts";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import { inspectEntry } from "../../src/model/Inspect.ts";
import { remedyEdits } from "../../src/model/Remedies.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { makeSimulationSession } from "../../src/model/SimulationSession.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import { decisionRecord } from "../helpers.ts";

interface Loop {
  readonly secret: string;
  self?: Loop;
}

const loop: Loop = { secret: "SENTINEL-41" };
loop.self = loop;

const throwsInToJSON = {
  toJSON: (): never => {
    throw new Error("SENTINEL-41 from toJSON");
  },
};

const throwsInGetter = {
  get boom(): never {
    throw new Error("SENTINEL-41 from a getter");
  },
};

const NO_JSON_FORM = "a value with no JSON form";

const alice: SimulationInput = {
  subject: { id: "alice", attributes: { dept: "legal", tier: 3 } },
  action: "read",
  resource: { id: "doc-1", owner: "alice" },
};

const labels = (policy: Policy): ReadonlyArray<string> =>
  remedyEdits(policy, alice).edits.map((e) => e.label);

const reasons = (policy: Policy): ReadonlyArray<string> =>
  remedyEdits(policy, alice).skipped.map((s) => s.reason);

const listed = (policy: Policy, label: string): PolicySighting => ({
  policy,
  label,
  count: 1,
  allows: 1,
  denies: 0,
  errors: 0,
  lastAt: 100,
});

const fail = (): never => {
  throw new Error("expected a timeline entry");
};

const remedyRows: ReadonlyArray<readonly [string, () => ReadonlyArray<string>, string]> = [
  [
    "contains(10n): the witness [10n] is offered under the fixed words",
    () => labels(hasAttribute("x", contains(10n))),
    `with subject attribute x = ${NO_JSON_FORM}`,
  ],
  [
    "contains of a cycle: offered under the fixed words",
    () => labels(hasAttribute("x", contains(loop))),
    `with subject attribute x = ${NO_JSON_FORM}`,
  ],
  [
    "inArray([1n]): offered as 1n",
    () => labels(hasAttribute("x", inArray([1n]))),
    "with subject attribute x = 1n",
  ],
  [
    "inArray of a cycle: offered under the fixed words",
    () => labels(hasAttribute("x", inArray([loop]))),
    `with subject attribute x = ${NO_JSON_FORM}`,
  ],
  [
    "eq(literal(1n)): offered as 1n",
    () => labels(hasAttribute("x", eq(literal(1n)))),
    "with subject attribute x = 1n",
  ],
  [
    "eq(literal(-1n)): the sign is kept",
    () => labels(hasAttribute("x", eq(literal(-1n)))),
    "with subject attribute x = -1n",
  ],
  [
    "eq(literal(18446744073709551616n)): every digit is kept",
    () => labels(hasAttribute("x", eq(literal(18446744073709551616n)))),
    "with subject attribute x = 18446744073709551616n",
  ],
  [
    "eq of a cycle: offered under the fixed words",
    () => labels(hasAttribute("x", eq(literal(loop)))),
    `with subject attribute x = ${NO_JSON_FORM}`,
  ],
  [
    "a resource attribute eq(literal(1n)): offered as 1n",
    () => labels(hasResourceAttribute("x", eq(literal(1n)))),
    "with resource attribute x = 1n",
  ],
  [
    "a resource attribute eq of a cycle: offered under the fixed words",
    () => labels(hasResourceAttribute("x", eq(literal(loop)))),
    `with resource attribute x = ${NO_JSON_FORM}`,
  ],
  [
    "size(eq(literal(10n))): declined, naming 10n",
    () => reasons(hasAttribute("x", size(eq(literal(10n))))),
    "a size is a number, and 10n is not",
  ],
  [
    "size of a cycle: declined under the fixed words",
    () => reasons(hasAttribute("x", size(eq(literal(loop))))),
    `a size is a number, and ${NO_JSON_FORM} is not`,
  ],
  [
    "a toJSON that throws: offered under the fixed words, without its message",
    () => labels(hasAttribute("x", eq(literal(throwsInToJSON)))),
    `with subject attribute x = ${NO_JSON_FORM}`,
  ],
  [
    "a getter that throws: offered under the fixed words, without its message",
    () => labels(hasAttribute("x", eq(literal(throwsInGetter)))),
    `with subject attribute x = ${NO_JSON_FORM}`,
  ],
];

describe("a remedy over a value with no JSON form", () => {
  for (const [title, read, expected] of remedyRows) {
    it.fails(title, () => {
      const got = read();
      assert.include(got, expected);
      for (const one of got) assert.notInclude(one, "SENTINEL-41");
    });
  }
});

type Command = "listed" | "unlisted" | "edit";

const sessionRows: ReadonlyArray<readonly [string, Policy, Command, ReadonlyArray<string>]> = [
  [
    "choosePolicy of a listed inArray([1n]) policy plans x = 1n",
    hasAttribute("x", inArray([1n])),
    "listed",
    ["with subject attribute x = 1n"],
  ],
  [
    "choosePolicy of a listed contains-a-cycle policy plans the fixed words",
    hasAttribute("x", contains(loop)),
    "listed",
    [`with subject attribute x = ${NO_JSON_FORM}`],
  ],
  [
    "edit to a resource under a listed eq(literal(1n)) policy plans x = 1n",
    hasResourceAttribute("x", eq(literal(1n))),
    "edit",
    ["with resource attribute x = 1n"],
  ],
  [
    "edit to a resource under a listed eq-of-a-cycle policy plans the fixed words",
    hasResourceAttribute("x", eq(literal(loop))),
    "edit",
    [`with resource attribute x = ${NO_JSON_FORM}`],
  ],
  [
    "choosePolicy of an unlisted inArray([1n]) policy holds it under a label naming [1n]",
    hasAttribute("x", inArray([1n])),
    "unlisted",
    ["the subject's x is one of [1n]", "with subject attribute x = 1n"],
  ],
];

describe("a session command over a value with no JSON form", () => {
  for (const [title, policy, command, expected] of sessionRows) {
    it.effect.fails(title, () =>
      Effect.gen(function* () {
        const sightings =
          command === "listed"
            ? [listed(hasRole("editor"), "editor"), listed(policy, "under test")]
            : command === "unlisted"
              ? [listed(hasRole("editor"), "editor")]
              : [listed(policy, "under test")];
        const session = yield* makeSimulationSession({ sightings });
        if (command === "edit") {
          session.edit({ subject: { id: "alice" }, action: "read", resource: { id: "doc-1" } });
        } else {
          session.choosePolicy(policy);
        }
        const snapshot = session.getSnapshot();
        const got = [
          ..."value" in snapshot.policy ? [snapshot.policy.value.label] : [],
          ...(snapshot.plan?.edits.map((e) => e.label) ?? []),
        ];
        for (const one of expected) assert.include(got, one);
        for (const one of got) assert.notInclude(one, "SENTINEL-41");
      }),
    );
  }
});

const readingRows: ReadonlyArray<readonly [string, () => string, string]> = [
  [
    "the policy rail labels a contains(10n) policy with 10n",
    () => policyLabel(hasAttribute("x", contains(10n))),
    "contains 10n",
  ],
  [
    "the inspector reads a decision on a contains-a-cycle policy under the fixed words",
    () =>
      inspectEntry(
        ingestAll(emptyTimeline(), [decisionRecord({ policy: hasAttribute("x", contains(loop)) })])
          .entries[0] ?? fail(),
      )?.label ?? "",
    `contains ${NO_JSON_FORM}`,
  ],
];

describe("a devtools reading of a policy over a value with no JSON form", () => {
  for (const [title, read, expected] of readingRows) {
    it.fails(title, () => {
      const text = read();
      assert.include(text, expected);
      assert.notInclude(text, "SENTINEL-41");
    });
  }
});
