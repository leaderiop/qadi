/**
 * Pins the exact words the services panel renders for every port, so moving a port's
 * reading into one table cannot change one.
 *
 * Written on the phase base (ARCH-94) before `describeOne` and the consequence lines move
 * into one port-reading table, and needed because `ServicesPanel.tsx` is outside the
 * devtools mutation glob: no mutant would catch a changed word there. Every reading is
 * compared whole, never by substring, and this file names nothing the base lacks, so it
 * stays unchanged through the move.
 */
import { assert, describe, it } from "@effect/vitest";
import { render, screen, within } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import {
  AttributeResolverNone,
  attributeResolverFromRecord,
  attributeResolverRetrying,
} from "@qadi/core";
import { WiringRead } from "../../src/model/DiagnosticsStore.ts";
import type { PortCall, PortCallLog } from "../../src/model/PortCalls.ts";
import { wiringReport } from "../../src/model/Wiring.ts";
import type { WiringReport } from "../../src/model/Wiring.ts";
import { ServicesPanel } from "../../src/react/ServicesPanel.tsx";
import { liveNotice } from "../helpers.ts";

const base = { span: "s", at: 1, durationMillis: 1, subjectId: "alice" };

const logOf = (calls: ReadonlyArray<PortCall>): PortCallLog => ({
  calls,
  dropped: 0,
  capacity: 200,
});

const cardFor = (port: string) =>
  screen.getAllByTestId("qadi-port").find((card) => card.getAttribute("data-port") === port);

/** Every call-row reading, exactly: [call, the sentence the row's first span reads]. */
const READINGS: ReadonlyArray<readonly [PortCall, string]> = [
  [
    { ...base, _tag: "AttributeResolver", attribute: "clearance", resolved: true },
    "clearance → a value",
  ],
  [
    { ...base, _tag: "AttributeResolver", attribute: "clearance", resolved: false },
    "clearance → nothing",
  ],
  [{ ...base, _tag: "AttributeResolver" }, "not recorded → no answer"],
  [
    {
      ...base,
      _tag: "DecisionHistory",
      event: "approved",
      resourceId: "doc-1",
      answer: "Acted",
    },
    "approved on doc-1 → Acted",
  ],
  [
    { ...base, _tag: "DecisionHistory", event: "approved", answer: "NotActed" },
    "approved anywhere → NotActed",
  ],
  [{ ...base, _tag: "DecisionHistory" }, "not recorded anywhere → no answer"],
  [
    {
      ...base,
      _tag: "RelationshipResolver",
      relation: "member",
      resourceId: "team-1",
      depth: 2,
      answer: "Related",
    },
    "member on team-1 (depth 2) → Related",
  ],
  [
    {
      ...base,
      _tag: "RelationshipResolver",
      relation: "member",
      resourceId: "team-1",
      answer: "Unrelated",
    },
    "member on team-1 → Unrelated",
  ],
  [{ ...base, _tag: "RelationshipResolver" }, "not recorded on no resource → no answer"],
  [
    { ...base, _tag: "CustomPredicate", name: "isBusinessHours", answer: true },
    "isBusinessHours → true",
  ],
  [{ ...base, _tag: "CustomPredicate", name: "p", answer: false }, "p → false"],
  [{ ...base, _tag: "CustomPredicate" }, "not recorded → no answer"],
  [
    {
      ...base,
      _tag: "SignatureHistory",
      meaning: "approval",
      signerRole: "manager",
      resourceId: "doc-1",
      matched: true,
    },
    "approval from a 'manager' on doc-1 → matched",
  ],
  [
    { ...base, _tag: "SignatureHistory", meaning: "approval", scope: "Any", matched: false },
    "approval anywhere → no match",
  ],
  [
    {
      ...base,
      _tag: "SignatureHistory",
      meaning: "approval",
      signerRole: "manager",
      scope: "Any",
      matched: true,
    },
    "approval from a 'manager' anywhere → matched",
  ],
  [
    { ...base, _tag: "SignatureHistory", meaning: "approval", scope: "Resource" },
    "approval → no answer",
  ],
  [{ ...base, _tag: "SignatureHistory" }, "not recorded → no answer"],
  [
    { ...base, _tag: "AttributeResolver", attribute: "a", resolved: true, attempts: 2 },
    "a → a value · 2 attempts",
  ],
  [
    { ...base, _tag: "AttributeResolver", attribute: "a", resolved: true, attempts: 1 },
    "a → a value",
  ],
  [
    {
      ...base,
      _tag: "DecisionHistory",
      event: "approved",
      resourceId: "doc-1",
      answer: "Acted",
      attempts: 3,
    },
    "approved on doc-1 → Acted · 3 attempts",
  ],
];

/** A one-port report: the card's own state and consequence are not what these rows read. */
const reportFor = (port: PortCall["_tag"]): WiringReport => ({
  ports: [
    { port, name: "x", required: true, present: true, defaulted: false, consequence: "c" },
  ],
  cache: { present: false, size: undefined },
});

describe("call rows read exactly as on the base", () => {
  for (const [call, expected] of READINGS) {
    it(`${call._tag}: ${expected}`, () => {
      render(
        <ServicesPanel
          diagnostics={liveNotice}
          wiring={WiringRead.Read({ report: reportFor(call._tag) })}
          activity={[]}
          portCalls={logOf([call])}
        />,
      );
      const row = within(screen.getByTestId("qadi-port")).getByTestId("qadi-port-call");

      assert.strictEqual(row.firstElementChild?.textContent, expected);
    });
  }
});

const ATTRIBUTE_CONSEQUENCE =
  "a missing attribute resolves to undefined, so an attribute policy denies";

describe("the consequence line and the card, from the real wiring report", () => {
  it.effect("five consequences, byte for byte", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;

      assert.deepStrictEqual(
        report.ports.slice(0, 5).map((p) => [p.port, p.consequence]),
        [
          ["AttributeResolver", ATTRIBUTE_CONSEQUENCE],
          ["DecisionHistory", "the three-valued default denies hasActed and hasNotActed alike"],
          ["RelationshipResolver", "an unanswered relationship denies"],
          [
            "CustomPredicate",
            "every hasCustom node denies, since no registered predicate can be reached",
          ],
          [
            "SignatureHistory",
            "an unwired signature history answers no signatures on file, so every hasSignature node denies",
          ],
        ],
      );
    }));

  it.effect("a retried default renders as defaulted", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      render(
        <ServicesPanel diagnostics={liveNotice} wiring={WiringRead.Read({ report })} activity={[]} />,
      );
      const card = cardFor("AttributeResolver") ?? assert.fail("no AttributeResolver card");

      assert.strictEqual(card.getAttribute("data-defaulted"), "true");
      assert.strictEqual(
        within(card).getByTestId("qadi-port-state").textContent,
        "defaulted — AttributeResolverNone (retrying)",
      );
      assert.strictEqual(
        within(card).getByTestId("qadi-port-consequence").textContent,
        ATTRIBUTE_CONSEQUENCE,
      );
    }).pipe(Effect.provide(attributeResolverRetrying(Schedule.recurs(1))(AttributeResolverNone))));

  it.effect("a real adapter renders its name and the conditional consequence", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      render(
        <ServicesPanel diagnostics={liveNotice} wiring={WiringRead.Read({ report })} activity={[]} />,
      );
      const card = cardFor("AttributeResolver") ?? assert.fail("no AttributeResolver card");

      assert.strictEqual(card.getAttribute("data-defaulted"), "false");
      assert.strictEqual(
        within(card).getByTestId("qadi-port-state").textContent,
        "attributeResolverFromRecord",
      );
      assert.strictEqual(
        within(card).getByTestId("qadi-port-consequence").textContent,
        "if defaulted: a missing attribute resolves to undefined, so an attribute policy denies",
      );
    }).pipe(Effect.provide(attributeResolverFromRecord({}))));

  it.effect("an absent port says so and carries no defaulted attribute", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      render(
        <ServicesPanel diagnostics={liveNotice} wiring={WiringRead.Read({ report })} activity={[]} />,
      );
      const card = cardFor("AttributeResolver") ?? assert.fail("no AttributeResolver card");

      assert.strictEqual(card.getAttribute("data-defaulted"), null);
      assert.strictEqual(
        within(card).getByTestId("qadi-port-state").textContent,
        "not provided to this reader",
      );
      assert.strictEqual(
        within(card).getByTestId("qadi-port-consequence").textContent,
        ATTRIBUTE_CONSEQUENCE,
      );
    }));
});
