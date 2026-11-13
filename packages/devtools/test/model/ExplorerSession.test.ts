/**
 * The policy explorer's rules, tested with no DOM.
 *
 * Each command's arms are per-call (ADR-QD-076), so each is pinned by an
 * output: no-op against notify, and every reset a command performs. The screen's
 * own tests keep only wording and wiring.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as FastCheck from "fast-check";
import {
  allOf,
  anyOf,
  DEFAULT_MAX_DEPTH,
  fromJson,
  hasPermission,
  hasRole,
  not,
  permission,
  PolicyDecodeTooDeep,
  simplify,
  toJson,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { policyLabel, type PolicySighting } from "../../src/model/Catalogue.ts";
import {
  makeExplorerSession,
  refusalOf,
  textOf,
  type ExplorerSession,
  type ExplorerSnapshot,
} from "../../src/model/ExplorerSession.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");

const sighting = (policy: Policy, count = 1): PolicySighting => ({
  policy,
  label: policyLabel(policy),
  count,
  allows: count,
  denies: 0,
  errors: 0,
  lastAt: count === 0 ? undefined : 100,
});

const encode = (policy: Policy): string => Effect.runSync(toJson(policy));

const showing = (session: ExplorerSession) => {
  const snapshot = session.getSnapshot();
  if (snapshot._tag !== "Showing") throw new Error("expected a policy on screen");
  return snapshot;
};

/** Counts notifications, so a no-op can be told from an effective command. */
const watch = (session: ExplorerSession) => {
  const seen = { calls: 0 };
  session.subscribe(() => {
    seen.calls += 1;
  });
  return seen;
};

const nested = (depth: number): Policy => {
  let policy: Policy = hasPermission(read);
  for (let i = 0; i < depth; i += 1) policy = allOf([policy]);
  return policy;
};

describe("construction", () => {
  it("an empty rail is Empty", () => {
    const snapshot: ExplorerSnapshot = makeExplorerSession().getSnapshot();
    assert.strictEqual(snapshot._tag, "Empty");
    assert.deepStrictEqual(snapshot.sightings, []);
  });

  it("shows the head, listed at 0, as a tree, not previewing", () => {
    const head = hasPermission(read);
    const snapshot = showing(makeExplorerSession({ sightings: [sighting(head), sighting(hasPermission(write))] }));
    assert.strictEqual(snapshot.shown._tag, "Listed");
    assert.strictEqual(snapshot.railIndex, 0);
    assert.strictEqual(snapshot.view, "Tree");
    assert.isFalse(snapshot.simplification.previewing);
    assert.strictEqual(snapshot.policy, head);
    assert.strictEqual(snapshot.tree, head);
    assert.strictEqual(snapshot.json.text, encode(head));
    assert.isFalse(snapshot.json.edited);
    assert.isUndefined(snapshot.json.refusal);
  });
});

describe("the held choice", () => {
  it("keeps the first policy shown when a new head arrives before any choice", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.setSightings([sighting(hasPermission(write)), sighting(hasPermission(read))]);
    const snapshot = showing(session);
    assert.isTrue(Equal.equals(snapshot.policy, hasPermission(read)));
    assert.strictEqual(snapshot.railIndex, 1);
  });

  it("pins the head when the first rail arrives after construction", () => {
    const session = makeExplorerSession();
    session.setSightings([sighting(hasPermission(read)), sighting(hasPermission(write))]);
    session.setSightings([sighting(hasPermission(write)), sighting(hasPermission(read))]);
    assert.isTrue(Equal.equals(showing(session).policy, hasPermission(read)));
  });

  it("follows a chosen policy through a reorder", () => {
    const session = makeExplorerSession({
      sightings: [sighting(hasPermission(read)), sighting(hasPermission(write))],
    });
    session.choose(hasPermission(write));
    assert.strictEqual(showing(session).railIndex, 1);
    session.setSightings([sighting(hasPermission(write)), sighting(hasPermission(read))]);
    const snapshot = showing(session);
    assert.strictEqual(snapshot.railIndex, 0);
    assert.isTrue(Equal.equals(snapshot.policy, hasPermission(write)));
  });

  it("keeps a policy that left the rail, as Evicted", () => {
    const session = makeExplorerSession({
      sightings: [sighting(hasPermission(read)), sighting(hasPermission(write))],
    });
    session.choose(hasPermission(write));
    session.setSightings([sighting(hasPermission(read))]);
    const snapshot = showing(session);
    assert.strictEqual(snapshot.shown._tag, "Evicted");
    assert.isUndefined(snapshot.railIndex);
    assert.isTrue(Equal.equals(snapshot.policy, hasPermission(write)));
  });

  it("choosing an unlisted policy is Evicted at once", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.choose(hasPermission(write));
    assert.strictEqual(showing(session).shown._tag, "Evicted");
  });

  it("choosing a policy on an empty rail shows it", () => {
    const session = makeExplorerSession();
    session.choose(hasPermission(write));
    assert.strictEqual(showing(session).shown._tag, "Evicted");
  });

  it("the listed element carries the newest tally", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read), 1)] });
    const newer = sighting(hasPermission(read), 5);
    session.setSightings([newer]);
    const shown = showing(session).shown;
    assert.strictEqual(shown._tag === "Listed" ? shown.value : undefined, newer);
  });
});

describe("drafts", () => {
  const withDraft = () => {
    const session = makeExplorerSession({
      sightings: [sighting(hasPermission(read)), sighting(hasPermission(write))],
    });
    session.setView("Json");
    session.editJson(encode(hasRole("editor")));
    session.load();
    return session;
  };

  it("a successful load is a Pasted draft with no rail highlight", () => {
    const snapshot = showing(withDraft());
    assert.strictEqual(snapshot.shown._tag, "Draft");
    assert.strictEqual(snapshot.shown._tag === "Draft" ? snapshot.shown.origin : undefined, "Pasted");
    assert.isUndefined(snapshot.railIndex);
    assert.isTrue(Equal.equals(snapshot.policy, hasRole("editor")));
    assert.isFalse(snapshot.json.edited);
  });

  it("choosing a policy discards the draft", () => {
    const session = withDraft();
    session.choose(hasPermission(write));
    const snapshot = showing(session);
    assert.strictEqual(snapshot.shown._tag, "Listed");
    assert.isTrue(Equal.equals(snapshot.policy, hasPermission(write)));
  });

  it("a draft survives a reorder, with the highlight still off", () => {
    const session = withDraft();
    session.setSightings([sighting(hasPermission(write)), sighting(hasPermission(read))]);
    const snapshot = showing(session);
    assert.strictEqual(snapshot.shown._tag, "Draft");
    assert.isUndefined(snapshot.railIndex);
  });

  it("loading the policy already shown makes no draft, and keeps the highlight", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.editJson(encode(hasPermission(read)));
    session.load();
    const snapshot = showing(session);
    assert.strictEqual(snapshot.shown._tag, "Listed");
    assert.strictEqual(snapshot.railIndex, 0);
    assert.isFalse(snapshot.json.edited);
  });

  it("loading what a draft already shows leaves the draft in place", () => {
    const session = withDraft();
    session.editJson(encode(hasRole("editor")));
    session.load();
    assert.strictEqual(showing(session).shown._tag, "Draft");
  });
});

describe("simplify", () => {
  it("previews a single-child collapse: the tree is simplify(policy)", () => {
    const policy = allOf([hasPermission(read)]);
    const session = makeExplorerSession({ sightings: [sighting(policy)] });
    assert.isTrue(showing(session).simplification.changes);
    session.setPreviewing(true);
    const snapshot = showing(session);
    assert.isTrue(snapshot.simplification.previewing);
    assert.isTrue(Equal.equals(snapshot.tree, simplify(policy)));
    assert.isTrue(Equal.equals(snapshot.tree, hasPermission(read)));
    assert.strictEqual(snapshot.policy, policy);
  });

  it("previews same-tag flattening", () => {
    const policy = allOf([allOf([hasPermission(read), hasRole("a")]), hasRole("b")]);
    const session = makeExplorerSession({ sightings: [sighting(policy)] });
    session.setPreviewing(true);
    assert.isTrue(Equal.equals(showing(session).tree, allOf([hasPermission(read), hasRole("a"), hasRole("b")])));
  });

  it("reports a double negation and a leaf as already simple", () => {
    for (const policy of [not(not(hasPermission(read))), hasPermission(read)]) {
      const session = makeExplorerSession({ sightings: [sighting(policy)] });
      assert.isFalse(showing(session).simplification.changes);
    }
  });

  it("cancel restores the original, and apply is a second action", () => {
    const policy = allOf([hasPermission(read)]);
    const session = makeExplorerSession({ sightings: [sighting(policy)] });
    session.setPreviewing(true);
    session.setPreviewing(false);
    assert.strictEqual(showing(session).tree, policy);
    session.setPreviewing(true);
    session.apply();
    const snapshot = showing(session);
    assert.strictEqual(snapshot.shown._tag, "Draft");
    assert.strictEqual(snapshot.shown._tag === "Draft" ? snapshot.shown.origin : undefined, "Simplified");
    assert.isTrue(Equal.equals(snapshot.policy, hasPermission(read)));
    assert.isFalse(snapshot.simplification.previewing);
    assert.isFalse(snapshot.simplification.changes);
  });

  it("applying with nothing previewed changes nothing and notifies no one", () => {
    const session = makeExplorerSession({ sightings: [sighting(allOf([hasPermission(read)]))] });
    const seen = watch(session);
    const before = session.getSnapshot();
    session.apply();
    assert.strictEqual(session.getSnapshot(), before);
    assert.strictEqual(seen.calls, 0);
  });

  it("applying a preview that changes nothing ends the preview and makes no draft", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.setPreviewing(true);
    session.apply();
    const snapshot = showing(session);
    assert.strictEqual(snapshot.shown._tag, "Listed");
    assert.isFalse(snapshot.simplification.previewing);
  });

  it("previewing nothing is a no-op", () => {
    const session = makeExplorerSession();
    const seen = watch(session);
    session.setPreviewing(true);
    assert.strictEqual(session.getSnapshot()._tag, "Empty");
    assert.strictEqual(seen.calls, 0);
  });

  // C10 — a preview belongs to the policy it previews.
  it("loading a different policy ends a preview of the previous one", () => {
    const session = makeExplorerSession({ sightings: [sighting(allOf([hasPermission(read)]))] });
    session.setPreviewing(true);
    const pasted = anyOf([hasRole("editor"), hasRole("admin")]);
    session.editJson(encode(pasted));
    session.load();
    const snapshot = showing(session);
    assert.isFalse(snapshot.simplification.previewing);
    assert.isTrue(Equal.equals(snapshot.tree, pasted));
    session.setPreviewing(true);
    session.apply();
    assert.isTrue(Equal.equals(showing(session).policy, simplify(pasted)));
  });

  it("choosing a policy ends a preview", () => {
    const session = makeExplorerSession({
      sightings: [sighting(allOf([hasPermission(read)])), sighting(hasPermission(write))],
    });
    session.setPreviewing(true);
    session.choose(hasPermission(write));
    assert.isFalse(showing(session).simplification.previewing);
  });
});

describe("the JSON pane", () => {
  it("shows what toJson produces, and the text decodes back to the policy shown", () => {
    const policy = allOf([hasPermission(read), hasRole("editor")]);
    const snapshot = showing(makeExplorerSession({ sightings: [sighting(policy)] }));
    assert.strictEqual(snapshot.json.text, encode(policy));
    assert.isTrue(Equal.equals(Effect.runSync(fromJson(snapshot.json.text)), policy));
  });

  it("a refused paste keeps the edit and reports a path-relative issue", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.editJson('{"_tag":"NotAPolicy"}');
    session.load();
    const snapshot = showing(session);
    assert.isTrue(snapshot.json.edited);
    assert.strictEqual(snapshot.json.text, '{"_tag":"NotAPolicy"}');
    assert.isDefined(snapshot.json.refusal);
    assert.notInclude(snapshot.json.refusal ?? "", "SchemaError(");
    assert.strictEqual(snapshot.shown._tag, "Listed");
  });

  it("a refusal names the path of a wrong value", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.editJson('{"_tag":"Not","policy":{"_tag":"NotAPolicy"}}');
    session.load();
    assert.include(showing(session).json.refusal ?? "", "at ");
  });

  it("a policy nested past the decode guard reports the limit", () => {
    let text = '{"_tag":"HasPermission","permission":"read"}';
    for (let i = 0; i < 5000; i += 1) text = `{"_tag":"Not","policy":${text}}`;
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.editJson(text);
    session.load();
    assert.include(showing(session).json.refusal ?? "", "decode limit");
  });

  it("text that is not JSON is refused the same way", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.editJson("}{");
    session.load();
    assert.isDefined(showing(session).json.refusal);
  });

  // Text that is not JSON is `PolicyNotJson` (BEH-QD-487), not a schema failure, so the
  // paste box has its own sentence for it.
  it("text that is not JSON is refused with its own sentence carrying the parser's message", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.editJson("}{");
    session.load();
    const refusal = showing(session).json.refusal ?? "";
    assert.isTrue(refusal.startsWith("The text is not JSON"));
    assert.notInclude(refusal, "SyntaxError");
  });

  it("an unloaded edit is dropped when another policy is chosen", () => {
    const session = makeExplorerSession({
      sightings: [sighting(hasPermission(read)), sighting(hasPermission(write))],
    });
    session.editJson("not yet loaded");
    session.choose(hasPermission(write));
    const snapshot = showing(session);
    assert.isFalse(snapshot.json.edited);
    assert.strictEqual(snapshot.json.text, encode(hasPermission(write)));
  });

  // C12 — glancing at the tree is not abandoning an edit.
  it("an unloaded edit survives a view switch, both ways", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.setView("Json");
    session.editJson("nope");
    session.setView("Tree");
    session.setView("Json");
    const snapshot = showing(session);
    assert.strictEqual(snapshot.json.text, "nope");
    assert.isTrue(snapshot.json.edited);
  });

  it("an unloaded edit survives a reorder, which does not change the shown policy", () => {
    const session = makeExplorerSession({
      sightings: [sighting(hasPermission(read)), sighting(hasPermission(write))],
    });
    session.editJson("kept");
    session.setSightings([sighting(hasPermission(write)), sighting(hasPermission(read))]);
    assert.strictEqual(showing(session).json.text, "kept");
  });

  // C11 — a refusal belongs to the text it refused.
  it("a refusal leaves when the text changes, when a draft is applied, and when a policy is chosen", () => {
    const refused = () => {
      const session = makeExplorerSession({
        sightings: [sighting(allOf([hasPermission(read)])), sighting(hasPermission(write))],
      });
      session.editJson("nope");
      session.load();
      assert.isDefined(showing(session).json.refusal);
      return session;
    };

    const typing = refused();
    typing.editJson("nope!");
    assert.isUndefined(showing(typing).json.refusal);

    const applying = refused();
    applying.setPreviewing(true);
    applying.apply();
    assert.isUndefined(showing(applying).json.refusal);
    assert.isFalse(showing(applying).json.edited);

    const choosing = refused();
    choosing.choose(hasPermission(write));
    assert.isUndefined(showing(choosing).json.refusal);
  });

  it("a refusal survives previewing, which does not change the text", () => {
    const session = makeExplorerSession({ sightings: [sighting(allOf([hasPermission(read)]))] });
    session.editJson("nope");
    session.load();
    session.setPreviewing(true);
    assert.isDefined(showing(session).json.refusal);
  });

  it("a successful load drops the refusal", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.editJson("nope");
    session.load();
    session.editJson(encode(hasRole("editor")));
    session.load();
    assert.isUndefined(showing(session).json.refusal);
  });
});

describe("depth", () => {
  it("reads a shallow policy against the bound", () => {
    const depth = showing(makeExplorerSession({ sightings: [sighting(allOf([hasPermission(read)]))] })).depth;
    assert.deepStrictEqual(depth, { depth: 1, bound: DEFAULT_MAX_DEPTH, overBound: false });
  });

  it("is not over the bound at exactly the bound, and is one past it", () => {
    const at = showing(makeExplorerSession({ sightings: [sighting(nested(DEFAULT_MAX_DEPTH))] })).depth;
    assert.strictEqual(at.depth, DEFAULT_MAX_DEPTH);
    assert.isFalse(at.overBound);
    const past = showing(makeExplorerSession({ sightings: [sighting(nested(DEFAULT_MAX_DEPTH + 1))] })).depth;
    assert.isTrue(past.overBound);
  });
});

describe("identity", () => {
  it("every no-op command leaves the snapshot and calls no listener", () => {
    const session = makeExplorerSession({
      sightings: [sighting(hasPermission(read)), sighting(hasPermission(write))],
    });
    const rail = session.getSnapshot().sightings;
    const seen = watch(session);
    const before = session.getSnapshot();

    session.setSightings(rail);
    session.setSightings([...rail]);
    session.choose(hasPermission(read));
    session.setView("Tree");
    session.load();
    session.setPreviewing(false);
    session.apply();

    assert.strictEqual(session.getSnapshot(), before);
    assert.strictEqual(seen.calls, 0);
  });

  it("an edit equal to the pending one is a no-op", () => {
    const session = makeExplorerSession({ sightings: [sighting(hasPermission(read))] });
    session.editJson("x");
    const seen = watch(session);
    session.editJson("x");
    assert.strictEqual(seen.calls, 0);
  });

  it("choosing the held policy is a no-op only while nothing sits over it", () => {
    const fresh = () => makeExplorerSession({ sightings: [sighting(allOf([hasPermission(read)]))] });
    const policy = allOf([hasPermission(read)]);

    const clean = fresh();
    const cleanSeen = watch(clean);
    clean.choose(policy);
    assert.strictEqual(cleanSeen.calls, 0);

    const previewing = fresh();
    previewing.setPreviewing(true);
    previewing.choose(policy);
    assert.isFalse(showing(previewing).simplification.previewing);

    const edited = fresh();
    edited.editJson("x");
    edited.choose(policy);
    assert.isFalse(showing(edited).json.edited);

    const refused = fresh();
    refused.editJson("x");
    refused.load();
    refused.editJson("");
    refused.editJson("y");
    refused.load();
    refused.choose(policy);
    assert.isUndefined(showing(refused).json.refusal);

    const drafted = fresh();
    drafted.editJson(encode(hasRole("a")));
    drafted.load();
    drafted.choose(policy);
    assert.strictEqual(showing(drafted).shown._tag, "Listed");
  });

  it("every effective command notifies exactly once", () => {
    const session = makeExplorerSession({
      sightings: [sighting(allOf([hasPermission(read)])), sighting(hasPermission(write))],
    });
    const seen = watch(session);
    const expectOne = (run: () => void) => {
      const before = seen.calls;
      run();
      assert.strictEqual(seen.calls, before + 1);
    };
    expectOne(() => session.setSightings([sighting(hasPermission(write)), sighting(allOf([hasPermission(read)]))]));
    expectOne(() => session.choose(hasPermission(write)));
    expectOne(() => session.setView("Json"));
    expectOne(() => session.editJson("nope"));
    expectOne(() => session.load()); // refused
    expectOne(() => session.setPreviewing(true));
    expectOne(() => session.setPreviewing(false));
    expectOne(() => {
      session.editJson(encode(hasRole("a")));
    });
    expectOne(() => session.load()); // a draft
  });

  it("two ticks that leave the shown policy alone reuse the readings", () => {
    const policy = allOf([hasPermission(read)]);
    const session = makeExplorerSession({ sightings: [sighting(policy)] });
    const first = showing(session);
    session.setSightings([sighting(policy, 2)]);
    const second = showing(session);
    assert.strictEqual(second.simplification.simplified, first.simplification.simplified);
    assert.strictEqual(second.depth, first.depth);
    assert.strictEqual(second.json.text, first.json.text);
  });
});

describe("the decode and encode exits", () => {
  it("a success is no refusal", () => {
    assert.isUndefined(refusalOf(Exit.succeed(hasPermission(read))));
  });

  it("a depth failure is the decode-limit sentence", () => {
    const sentence = refusalOf(Exit.fail(new PolicyDecodeTooDeep({ maxDepth: 256 })));
    assert.include(sentence ?? "", "decode limit");
    assert.include(sentence ?? "", "256");
  });

  it("a defect is a stated refusal, not a throw", () => {
    const sentence = refusalOf(Exit.die(new Error("boom")));
    assert.include(sentence ?? "", "failed unexpectedly");
    assert.include(sentence ?? "", "boom");
  });

  it("text is the encoding, or why there is none", () => {
    assert.strictEqual(textOf(Exit.succeed("{}")), "{}");
    assert.include(textOf(Exit.die(new Error("cannot encode"))), "cannot encode");
    assert.strictEqual(textOf(Exit.failCause(Cause.fail("plain"))), Cause.pretty(Cause.fail("plain")));
  });
});

// A reference fold: which policy should be on screen, and whether a no-op is expected.
const alphabet: ReadonlyArray<Policy> = [
  hasPermission(read),
  hasPermission(write),
  allOf([hasPermission(read)]),
  anyOf([hasRole("a"), hasRole("b")]),
];

type Command =
  | { readonly kind: "setSightings"; readonly rail: ReadonlyArray<number> }
  | { readonly kind: "choose"; readonly policy: number }
  | { readonly kind: "setView"; readonly view: "Tree" | "Json" }
  | { readonly kind: "editJson"; readonly text: "encoded" | "bad" | "empty"; readonly policy: number }
  | { readonly kind: "load" }
  | { readonly kind: "setPreviewing"; readonly on: boolean }
  | { readonly kind: "apply" };

const commands: FastCheck.Arbitrary<Command> = FastCheck.oneof(
  FastCheck.uniqueArray(FastCheck.nat(alphabet.length - 1), { maxLength: 4 }).map(
    (rail): Command => ({ kind: "setSightings", rail }),
  ),
  FastCheck.nat(alphabet.length - 1).map((policy): Command => ({ kind: "choose", policy })),
  FastCheck.constantFrom<"Tree" | "Json">("Tree", "Json").map(
    (view): Command => ({ kind: "setView", view }),
  ),
  FastCheck.tuple(
    FastCheck.constantFrom<"encoded" | "bad" | "empty">("encoded", "bad", "empty"),
    FastCheck.nat(alphabet.length - 1),
  ).map(([text, policy]): Command => ({ kind: "editJson", text, policy })),
  FastCheck.constant<Command>({ kind: "load" }),
  FastCheck.boolean().map((on): Command => ({ kind: "setPreviewing", on })),
  FastCheck.constant<Command>({ kind: "apply" }),
);

const policyAt = (index: number): Policy => alphabet[index] ?? hasPermission(read);

describe("any sequence of commands", () => {
  it("shows what a reference fold says, previews what it applies, and keeps the pane honest", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.array(commands, { maxLength: 25 }), (sequence) => {
        const session = makeExplorerSession({ sightings: [sighting(policyAt(0)), sighting(policyAt(1))] });
        // The reference: the policy that should be shown, and the rail.
        let expected: Policy = policyAt(0);
        let pending: string | undefined;

        for (const command of sequence) {
          const before = session.getSnapshot();
          const beforeShown = showing(session).policy;
          const wasPreviewing = showing(session).simplification.previewing;
          const preview = showing(session).tree;

          switch (command.kind) {
            case "setSightings":
              session.setSightings(command.rail.map((i) => sighting(policyAt(i))));
              break;
            case "choose":
              session.choose(policyAt(command.policy));
              expected = policyAt(command.policy);
              pending = undefined;
              break;
            case "setView":
              session.setView(command.view);
              break;
            case "editJson": {
              const text =
                command.text === "encoded" ? encode(policyAt(command.policy)) : command.text === "bad" ? "}{" : "";
              session.editJson(text);
              pending = text;
              break;
            }
            case "load": {
              const text = pending;
              session.load();
              if (text !== undefined) {
                pending = undefined;
                const decoded = Effect.runSync(
                  fromJson(text).pipe(Effect.match({ onFailure: () => undefined, onSuccess: (p) => p })),
                );
                if (decoded !== undefined) expected = decoded;
                else pending = text;
              }
              break;
            }
            case "setPreviewing":
              session.setPreviewing(command.on);
              break;
            case "apply":
              session.apply();
              if (wasPreviewing) {
                expected = preview;
                if (!Equal.equals(preview, beforeShown)) pending = undefined;
              }
              break;
          }

          const snapshot = showing(session);
          // (a) the shown policy changes only on choose, a different load, and apply.
          assert.isTrue(Equal.equals(snapshot.policy, expected));
          // (b) while previewing, the tree is the simplification of the policy shown.
          if (snapshot.simplification.previewing) {
            assert.isTrue(Equal.equals(snapshot.tree, simplify(snapshot.policy)));
          }
          // (c) a refusal implies an unloaded edit it refused.
          if (snapshot.json.refusal !== undefined) assert.isTrue(snapshot.json.edited);
          // (d) the unloaded edit is what the reference holds.
          assert.strictEqual(snapshot.json.edited, pending !== undefined);
          if (pending !== undefined) assert.strictEqual(snapshot.json.text, pending);
          // A command that changed nothing left the snapshot alone.
          if (session.getSnapshot() === before) {
            assert.isTrue(Equal.equals(snapshot.policy, beforeShown));
          }
        }
      }),
    );
  });
});
