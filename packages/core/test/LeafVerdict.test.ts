import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { customPredicatePort } from "../src/CustomPredicate.ts";
import type { Decision } from "../src/Decision.ts";
import { isAllowed } from "../src/Decision.ts";
import type { ActedResult } from "../src/DecisionHistory.ts";
import { decisionHistoryPort } from "../src/DecisionHistory.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { PortReply } from "../src/PortDescription.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import type { RelatedResult } from "../src/RelationshipResolver.ts";
import { relationshipResolverPort } from "../src/RelationshipResolver.ts";
import { signatureHistoryFromSignatures } from "../src/SignatureHistory.ts";
import { subjectWith, testLayer } from "./helpers.ts";

/**
 * The base characterisation of every leaf's answer-to-verdict step (ARCH-101,
 * VERD-03): what `evaluate` decides, and why, for each leaf tag over each answer
 * its question can get and each polarity.
 *
 * Written on the phase base and green there by design: it pins today's decision,
 * today's `trace.policyTag` and today's deny sentence, so that moving every
 * verdict step into `LeafNeeds.ts` (WX-06) can be shown to change none of them.
 * It reads only the public API: nothing from `LeafNeeds.ts`, `Walk.ts`,
 * `PortAccess.ts` or `Compare.ts`, so it cannot agree with the code that moves.
 * Every expected reason is a complete literal, because a template here would
 * restate the very construction the move replaces.
 *
 * Fixtures are fixed so later plans can grep for them: subject `u1`, event
 * `approve`, relation `owner`, resource id `doc-1`, custom name `c`, signature
 * meaning `approved` and signer role `director`, role `editor`, permission
 * `doc:read`, leaf action `write` against request actions `write` and `read`.
 */

const doc = { resource: { id: "doc-1" } };
const u1 = subjectWith({});

/** A history port that answers `answer` to every question. */
const history = (answer: ActedResult) =>
  scriptedPort(decisionHistoryPort, () => PortReply.answer(answer)).layer;

/** A relationship resolver that answers `answer` to every question. */
const relation = (answer: RelatedResult) =>
  scriptedPort(relationshipResolverPort, () => PortReply.answer(answer)).layer;

/** A custom-predicate registry that answers `answer` to every name. */
const custom = (answer: boolean) =>
  scriptedPort(customPredicatePort, () => PortReply.answer(answer)).layer;

const expectAllow = (cell: string, d: Decision, tag: string): void => {
  assert.isTrue(isAllowed(d), `${cell}: allows`);
  assert.strictEqual(d.trace.policyTag, tag, `${cell}: trace.policyTag`);
};

const expectDeny = (cell: string, d: Decision, tag: string, reason: string): void => {
  assert.isFalse(isAllowed(d), `${cell}: denies`);
  assert.strictEqual(d.trace.policyTag, tag, `${cell}: trace.policyTag`);
  if (d._tag !== "Deny") return;
  assert.strictEqual(d.reason, reason, `${cell}: reason`);
};

describe("every leaf's answer through evaluate", () => {
  describe("HasActed and HasNotActed", () => {
    it.effect("scope Resource: the polarity's own answer allows, Unknown denies, the opposite denies", () =>
      Effect.gen(function* () {
        const run = (policy: P.Policy, answer: ActedResult) =>
          evaluate(policy, doc).pipe(Effect.provide(testLayer(u1, { DecisionHistory: history(answer) })));

        expectAllow("HasActed/Resource/Acted", yield* run(P.hasActed("approve"), "Acted"), "HasActed");
        expectDeny(
          "HasActed/Resource/NotActed",
          yield* run(P.hasActed("approve"), "NotActed"),
          "HasActed",
          "subject 'u1' has not performed 'approve'",
        );
        expectDeny(
          "HasActed/Resource/Unknown",
          yield* run(P.hasActed("approve"), "Unknown"),
          "HasActed",
          "no history is available for 'approve'",
        );

        expectAllow(
          "HasNotActed/Resource/NotActed",
          yield* run(P.hasNotActed("approve"), "NotActed"),
          "HasNotActed",
        );
        expectDeny(
          "HasNotActed/Resource/Acted",
          yield* run(P.hasNotActed("approve"), "Acted"),
          "HasNotActed",
          "subject 'u1' has already performed 'approve'",
        );
        expectDeny(
          "HasNotActed/Resource/Unknown",
          yield* run(P.hasNotActed("approve"), "Unknown"),
          "HasNotActed",
          "no history is available for 'approve'",
        );
      }),
    );

    it.effect("scope Any: the same cells, with no resource in the request", () =>
      Effect.gen(function* () {
        const run = (policy: P.Policy, answer: ActedResult) =>
          evaluate(policy).pipe(Effect.provide(testLayer(u1, { DecisionHistory: history(answer) })));

        expectAllow(
          "HasActed/Any/Acted",
          yield* run(P.hasActed("approve", { scope: "Any" }), "Acted"),
          "HasActed",
        );
        expectDeny(
          "HasActed/Any/NotActed",
          yield* run(P.hasActed("approve", { scope: "Any" }), "NotActed"),
          "HasActed",
          "subject 'u1' has not performed 'approve'",
        );
        expectDeny(
          "HasActed/Any/Unknown",
          yield* run(P.hasActed("approve", { scope: "Any" }), "Unknown"),
          "HasActed",
          "no history is available for 'approve'",
        );

        expectAllow(
          "HasNotActed/Any/NotActed",
          yield* run(P.hasNotActed("approve", { scope: "Any" }), "NotActed"),
          "HasNotActed",
        );
        expectDeny(
          "HasNotActed/Any/Acted",
          yield* run(P.hasNotActed("approve", { scope: "Any" }), "Acted"),
          "HasNotActed",
          "subject 'u1' has already performed 'approve'",
        );
        expectDeny(
          "HasNotActed/Any/Unknown",
          yield* run(P.hasNotActed("approve", { scope: "Any" }), "Unknown"),
          "HasNotActed",
          "no history is available for 'approve'",
        );
      }),
    );
  });

  describe("HasRelationship", () => {
    it.effect("Related allows; Unrelated and Unknown deny with distinct reasons", () =>
      Effect.gen(function* () {
        const run = (answer: RelatedResult) =>
          evaluate(P.hasRelationship("owner"), doc).pipe(
            Effect.provide(testLayer(u1, { RelationshipResolver: relation(answer) })),
          );

        expectAllow("HasRelationship/Related", yield* run("Related"), "HasRelationship");
        expectDeny(
          "HasRelationship/Unrelated",
          yield* run("Unrelated"),
          "HasRelationship",
          "subject 'u1' has no 'owner' relation to 'doc-1'",
        );
        expectDeny(
          "HasRelationship/Unknown",
          yield* run("Unknown"),
          "HasRelationship",
          "no relationship resolver could confirm the 'owner' relation to 'doc-1'",
        );
      }),
    );
  });

  describe("HasCustom", () => {
    it.effect("true allows, false denies naming the predicate", () =>
      Effect.gen(function* () {
        const run = (answer: boolean) =>
          evaluate(P.hasCustom("c")).pipe(Effect.provide(testLayer(u1, { CustomPredicate: custom(answer) })));

        expectAllow("HasCustom/true", yield* run(true), "HasCustom");
        expectDeny("HasCustom/false", yield* run(false), "HasCustom", "custom predicate 'c' returned false");
      }),
    );
  });

  describe("HasSignature", () => {
    it.effect("a matching signature allows; none on file and none matching are distinct denials", () =>
      Effect.gen(function* () {
        const run = (policy: P.Policy, signatures: Parameters<typeof signatureHistoryFromSignatures>[0]) =>
          evaluate(policy, doc).pipe(
            Effect.provide(testLayer(u1, { SignatureHistory: signatureHistoryFromSignatures(signatures) })),
          );
        const approved = { subjectId: "u1", resourceId: "doc-1", meaning: "approved" };
        const rejected = { subjectId: "u1", resourceId: "doc-1", meaning: "rejected" };
        const byManager = { ...approved, signerRole: "manager" };
        const byDirector = { ...approved, signerRole: "director" };

        expectAllow("HasSignature/matched", yield* run(P.hasSignature("approved"), [approved]), "HasSignature");
        expectAllow(
          "HasSignature/matched with a signer role",
          yield* run(P.hasSignature("approved", { signerRole: "director" }), [byDirector]),
          "HasSignature",
        );
        expectDeny(
          "HasSignature/none on file",
          yield* run(P.hasSignature("approved"), []),
          "HasSignature",
          "no signatures are on file for subject 'u1'",
        );
        expectDeny(
          "HasSignature/none on file, with a signer role",
          yield* run(P.hasSignature("approved", { signerRole: "director" }), []),
          "HasSignature",
          "no signatures are on file for subject 'u1'",
        );
        expectDeny(
          "HasSignature/none matching",
          yield* run(P.hasSignature("approved"), [rejected]),
          "HasSignature",
          "subject 'u1' has no signature matching meaning 'approved'",
        );
        expectDeny(
          "HasSignature/none matching, with a signer role",
          yield* run(P.hasSignature("approved", { signerRole: "director" }), [byManager]),
          "HasSignature",
          "subject 'u1' has no signature matching meaning 'approved' and signer role 'director'",
        );
      }),
    );
  });

  describe("HasRole, HasPermission and HasAction", () => {
    it.effect("role and permission: held allows, a subject with none denies", () =>
      Effect.gen(function* () {
        const holder = subjectWith({ roles: ["editor"], permissions: ["doc:read"] });
        const nothing = subjectWith({});
        const provideFor = (subject: typeof u1) => Effect.provide(testLayer(subject));

        expectAllow("HasRole/held", yield* evaluate(P.hasRole("editor")).pipe(provideFor(holder)), "HasRole");
        expectDeny(
          "HasRole/not held",
          yield* evaluate(P.hasRole("editor")).pipe(provideFor(nothing)),
          "HasRole",
          "subject lacks role 'editor'",
        );
        expectAllow(
          "HasPermission/held",
          yield* evaluate(P.hasPermission(permission("doc", "read"))).pipe(provideFor(holder)),
          "HasPermission",
        );
        expectDeny(
          "HasPermission/not held",
          yield* evaluate(P.hasPermission(permission("doc", "read"))).pipe(provideFor(nothing)),
          "HasPermission",
          "subject lacks permission 'doc:read'",
        );
      }),
    );

    it.effect("action: the request's own verb allows, another denies naming both", () =>
      Effect.gen(function* () {
        const run = (action: string) =>
          evaluate(P.hasAction("write"), { action }).pipe(Effect.provide(testLayer(u1)));

        expectAllow("HasAction/held", yield* run("write"), "HasAction");
        expectDeny("HasAction/not held", yield* run("read"), "HasAction", "action is 'read', not 'write'");
      }),
    );
  });

  describe("HasAttribute and HasResourceAttribute", () => {
    it.effect("subject side: Held, NotHeld, a Neq NotHeld, ValueAbsent, ReferenceAbsent and Incomparable", () =>
      Effect.gen(function* () {
        const run = (policy: P.Policy, subject: typeof u1) =>
          evaluate(policy).pipe(Effect.provide(testLayer(subject)));

        expectAllow("HasAttribute/Held", yield* run(P.hasAttribute("level", M.gte(3)), subjectWith({ attributes: { level: 5 } })), "HasAttribute");
        expectDeny(
          "HasAttribute/NotHeld",
          yield* run(P.hasAttribute("level", M.gte(3)), subjectWith({ attributes: { level: 1 } })),
          "HasAttribute",
          "subject attribute 'level' did not match",
        );
        expectDeny(
          "HasAttribute/Neq NotHeld",
          yield* run(P.hasAttribute("homeTenant", M.neq(M.literal("evil"))), subjectWith({ attributes: { homeTenant: "evil" } })),
          "HasAttribute",
          "subject attribute 'homeTenant' matched an excluded value",
        );
        expectDeny(
          "HasAttribute/ValueAbsent",
          yield* run(P.hasAttribute("level", M.gte(3)), subjectWith({ attributes: {} })),
          "HasAttribute",
          "subject attribute 'level' has no value",
        );
        expectDeny(
          "HasAttribute/ReferenceAbsent",
          yield* run(P.hasAttribute("tenant", M.eq(M.subject("missing"))), subjectWith({ attributes: { tenant: "t-1" } })),
          "HasAttribute",
          "subject attribute 'tenant' has no reference value to compare against",
        );
        expectDeny(
          "HasAttribute/Incomparable",
          yield* run(P.hasAttribute("level", M.gte(3)), subjectWith({ attributes: { level: "5" } })),
          "HasAttribute",
          "subject attribute 'level' is not a value this matcher can compare",
        );
      }),
    );

    it.effect("resource side: the same five verdicts and a Neq NotHeld", () =>
      Effect.gen(function* () {
        const run = (policy: P.Policy, request: Parameters<typeof evaluate>[1]) =>
          evaluate(policy, request).pipe(Effect.provide(testLayer(u1)));

        expectAllow(
          "HasResourceAttribute/Held",
          yield* run(P.hasResourceAttribute("level", M.gte(3)), { resource: { level: 5 } }),
          "HasResourceAttribute",
        );
        expectDeny(
          "HasResourceAttribute/NotHeld",
          yield* run(P.hasResourceAttribute("level", M.gte(3)), { resource: { level: 1 } }),
          "HasResourceAttribute",
          "resource attribute 'level' did not match",
        );
        expectDeny(
          "HasResourceAttribute/Neq NotHeld",
          yield* run(P.hasResourceAttribute("tenant", M.neq(M.literal("evil"))), { resource: { tenant: "evil" } }),
          "HasResourceAttribute",
          "resource attribute 'tenant' matched an excluded value",
        );
        expectDeny(
          "HasResourceAttribute/ValueAbsent",
          yield* run(P.hasResourceAttribute("state", M.eq(M.literal("open"))), { resource: { id: "doc-1" } }),
          "HasResourceAttribute",
          "resource attribute 'state' has no value",
        );
        expectDeny(
          "HasResourceAttribute/ReferenceAbsent",
          yield* run(P.hasResourceAttribute("tenant", M.eq(M.subject("missing"))), { resource: { tenant: "t-1" } }),
          "HasResourceAttribute",
          "resource attribute 'tenant' has no reference value to compare against",
        );
        expectDeny(
          "HasResourceAttribute/Incomparable",
          yield* run(P.hasResourceAttribute("level", M.gte(3)), { resource: { level: "5" } }),
          "HasResourceAttribute",
          "resource attribute 'level' is not a value this matcher can compare",
        );
      }),
    );
  });
});
