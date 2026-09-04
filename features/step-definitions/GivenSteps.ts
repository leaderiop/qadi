import { defineSteps } from "@effect-cucumber/vitest";
import { join } from "@qadi/core";
import { patch, readState, World } from "./SharedWorld.ts";

const label = (level: number, compartments: string) => ({
  level,
  compartments: compartments === "" ? [] : compartments.split(",").map((c) => c.trim()),
});

export const givenSteps = defineSteps<World>(({ Given }) => {
  // ---------------------------------------------------------------------------
  // Subject
  // ---------------------------------------------------------------------------

  Given("a subject {string}", function* (id: string) {
    yield* patch(() => ({ subjectId: id }));
  });

  Given("the subject has permission {string}", function* (key: string) {
    const [resource, action] = key.split(":");
    if (resource === undefined || action === undefined) {
      throw new Error(`malformed permission key: ${key}`);
    }
    const s = yield* readState();
    yield* patch(() => ({ permissions: [...s.permissions, `${resource}:${action}`] }));
  });

  Given("the subject has no permissions", function* () {
    yield* patch(() => ({ permissions: [] }));
  });

  Given("the subject has role {string}", function* (name: string) {
    const s = yield* readState();
    yield* patch(() => ({ roles: [...s.roles, name] }));
  });

  Given("the subject has attribute {string} of {int}", function* (key: string, value: number) {
    const s = yield* readState();
    yield* patch(() => ({ attributes: { ...s.attributes, [key]: value } }));
  });

  Given("the subject has attribute {string} of {string}", function* (key: string, value: string) {
    const s = yield* readState();
    yield* patch(() => ({ attributes: { ...s.attributes, [key]: value } }));
  });

  // ---------------------------------------------------------------------------
  // Environment
  // ---------------------------------------------------------------------------

  Given(
    "the attribute service resolves {string} to {int}",
    function* (key: string, value: number) {
      const s = yield* readState();
      yield* patch(() => ({ resolvedAttributes: { ...s.resolvedAttributes, [key]: value } }));
    },
  );

  Given(
    "the subject is {string} of resource {string}",
    function* (relation: string, resourceId: string) {
      const s = yield* readState();
      yield* patch(() => ({
        relationships: [
          ...(s.relationships ?? []),
          { subjectId: s.subjectId, relation, resourceId },
        ],
      }));
    },
  );

  /** The counterpart of "the history store is unreachable" — absent, not down. */
  Given("no relationship resolver is wired", function* () {
    yield* patch(() => ({ relationships: undefined }));
  });

  Given(
    "the resource {string} with attribute {string} of {string}",
    function* (id: string, key: string, value: string) {
      yield* patch(() => ({ resource: { id, [key]: value } }));
    },
  );

  Given("the resource {string}", function* (id: string) {
    yield* patch(() => ({ resource: { id } }));
  });

  Given("the resource {string} raised by {string}", function* (id: string, raisedBy: string) {
    yield* patch(() => ({ resource: { id, raisedBy } }));
  });

  Given("the resource {string} owned by {string}", function* (id: string, owner: string) {
    yield* patch(() => ({ resource: { id, owner } }));
  });

  Given("the resource {string} at level {int}", function* (id: string, level: number) {
    yield* patch(() => ({ resource: { id, level } }));
  });

  /** Brewer–Nash exempts anonymised material explicitly, and it needs no history. */
  Given("the sanitised material {string}", function* (id: string) {
    yield* patch(() => ({ resource: { id, sanitised: true } }));
  });

  /**
   * A purpose-built setter, because `"the resource … with attribute … of …"`
   * *replaces* the resource rather than merging into it — two attributes cannot be
   * chained, and a workflow step needs both its state and its raiser.
   */
  Given(
    "the task {string} in state {string} raised by {string}",
    function* (id: string, state: string, raisedBy: string) {
      yield* patch(() => ({ resource: { id, state, raisedBy } }));
    },
  );

  // ---------------------------------------------------------------------------
  // Request
  // ---------------------------------------------------------------------------

  Given("the caller is performing {string}", function* (verb: string) {
    yield* patch(() => ({ action: verb }));
  });

  Given("an obligation handler is supplied", function* () {
    yield* patch(() => ({ handlesObligations: true }));
  });

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  Given(
    "the history records that {string} raised {string}",
    function* (subjectId: string, resourceId: string) {
      const s = yield* readState();
      yield* patch(() => ({
        events: [...(s.events ?? []), { subjectId, event: "raised", resourceId }],
      }));
    },
  );

  /**
   * A conflict-of-interest access, keyed `[subject, class, company]`.
   *
   * The conflict **class is the event** and the **company is the resource**, which
   * is the whole reason Brewer–Nash needed no construct of its own: it is two
   * questions the one-member port already answers (ADR-QD-020).
   */
  Given(
    "the history records that {string} accessed {string} in the {string} class",
    function* (subjectId: string, company: string, conflictClass: string) {
      const s = yield* readState();
      yield* patch(() => ({
        events: [...(s.events ?? []), { subjectId, event: conflictClass, resourceId: company }],
      }));
    },
  );

  Given(
    "the history records that {string} approved {string}",
    function* (subjectId: string, resourceId: string) {
      const s = yield* readState();
      yield* patch(() => ({
        events: [...(s.events ?? []), { subjectId, event: "approved", resourceId }],
      }));
    },
  );

  Given("the history store is unreachable", function* () {
    yield* patch(() => ({ historyUnreachable: true }));
  });

  // ---------------------------------------------------------------------------
  // Custom predicates
  // ---------------------------------------------------------------------------

  Given("a custom predicate {string} that allows", function* (name: string) {
    const s = yield* readState();
    yield* patch(() => ({ customPredicates: { ...(s.customPredicates ?? {}), [name]: true } }));
  });

  Given("a custom predicate {string} that denies", function* (name: string) {
    const s = yield* readState();
    yield* patch(() => ({ customPredicates: { ...(s.customPredicates ?? {}), [name]: false } }));
  });

  // ---------------------------------------------------------------------------
  // Security labels
  // ---------------------------------------------------------------------------

  Given("a subject {string} cleared at level {int}", function* (id: string, level: number) {
    const s = yield* readState();
    yield* patch(() => ({
      subjectId: id,
      attributes: { ...s.attributes, clearance: label(level, "") },
    }));
  });

  Given(
    "a subject {string} cleared at level {int} in compartment {string}",
    function* (id: string, level: number, compartment: string) {
      const s = yield* readState();
      yield* patch(() => ({
        subjectId: id,
        attributes: { ...s.attributes, clearance: label(level, compartment) },
      }));
    },
  );

  Given(
    "a subject {string} cleared at level {int} in compartments {string}",
    function* (id: string, level: number, compartments: string) {
      const s = yield* readState();
      yield* patch(() => ({
        subjectId: id,
        attributes: { ...s.attributes, clearance: label(level, compartments) },
      }));
    },
  );

  Given("the resource {string} classified at level {int}", function* (id: string, level: number) {
    yield* patch(() => ({ resource: { id, label: label(level, "") } }));
  });

  Given(
    "the resource {string} classified at level {int} in compartment {string}",
    function* (id: string, level: number, compartment: string) {
      yield* patch(() => ({ resource: { id, label: label(level, compartment) } }));
    },
  );

  /** The plural existed for the subject and not the resource. A genuine partial
   * order needs two compartments on BOTH sides — `{A,B}` against `{A,C}` — which
   * the singular cannot express. */
  Given(
    "the resource {string} classified at level {int} in compartments {string}",
    function* (id: string, level: number, compartments: string) {
      yield* patch(() => ({ resource: { id, label: label(level, compartments) } }));
    },
  );

  /**
   * The resource labelled with the JOIN of two sources.
   *
   * The whole point of exporting `join`: a document derived from two sources is
   * classified at their least upper bound, and computing that by hand is where a
   * caller under-classifies (ADR-QD-029).
   */
  Given(
    "the resource {string} derived from level {int} in compartments {string} and level {int} in compartments {string}",
    function* (
      id: string,
      levelA: number,
      compartmentsA: string,
      levelB: number,
      compartmentsB: string,
    ) {
      yield* patch(() => ({
        resource: { id, label: join(label(levelA, compartmentsA), label(levelB, compartmentsB)) },
      }));
    },
  );

  // ---------------------------------------------------------------------------
  // Integrity labels
  // ---------------------------------------------------------------------------

  // Biba is an integrity model, so it says `integrity` rather than `clearance` and
  // `artefact` rather than `document`. The same lattice underneath — these reuse
  // `label` above — but the vocabulary is the model's own, and the attribute name
  // is load-bearing: the clearance steps write `attributes["clearance"]`, which no
  // Biba policy reads.

  Given("a producer {string} at integrity level {int}", function* (id: string, level: number) {
    const s = yield* readState();
    yield* patch(() => ({
      subjectId: id,
      attributes: { ...s.attributes, integrity: label(level, "") },
    }));
  });

  Given(
    "a producer {string} at integrity level {int} in compartment {string}",
    function* (id: string, level: number, compartment: string) {
      const s = yield* readState();
      yield* patch(() => ({
        subjectId: id,
        attributes: { ...s.attributes, integrity: label(level, compartment) },
      }));
    },
  );

  Given("the artefact {string} at integrity level {int}", function* (id: string, level: number) {
    yield* patch(() => ({ resource: { id, label: label(level, "") } }));
  });

  Given(
    "the artefact {string} at integrity level {int} in compartment {string}",
    function* (id: string, level: number, compartment: string) {
      yield* patch(() => ({ resource: { id, label: label(level, compartment) } }));
    },
  );

  /**
   * Deliberately a *resolved* attribute and not a subject one. A static attribute
   * cannot change between evaluations, and per BEH-QD-034 it would shadow this one
   * entirely — `HasAttribute` reads the subject first and calls the resolver only
   * on a miss.
   */
  Given(
    "the attribute service resolves the effective integrity to level {int}",
    function* (level: number) {
      const s = yield* readState();
      yield* patch(() => ({
        resolvedAttributes: { ...s.resolvedAttributes, effectiveIntegrity: label(level, "") },
      }));
    },
  );

  /** The misconfiguration BEH-QD-034 makes possible. Used by one scenario, to fail. */
  Given(
    "the producer also carries a static effective integrity of level {int}",
    function* (level: number) {
      const s = yield* readState();
      yield* patch(() => ({
        attributes: { ...s.attributes, effectiveIntegrity: label(level, "") },
      }));
    },
  );

  // ---------------------------------------------------------------------------
  // Subject sets
  // ---------------------------------------------------------------------------

  Given("the candidate {string}", function* (id: string) {
    const s = yield* readState();
    yield* patch(() => ({ candidates: [...s.candidates, { id, roles: [], permissions: [] }] }));
  });

  Given("the candidate {string} with role {string}", function* (id: string, name: string) {
    const s = yield* readState();
    yield* patch(() => ({
      candidates: [...s.candidates, { id, roles: [name], permissions: [] }],
    }));
  });

  Given("the candidate {string} with permission {string}", function* (id: string, key: string) {
    const [resource, action] = key.split(":");
    if (resource === undefined || action === undefined) {
      throw new Error(`malformed permission key: ${key}`);
    }
    const s = yield* readState();
    yield* patch(() => ({
      candidates: [...s.candidates, { id, roles: [], permissions: [`${resource}:${action}`] }],
    }));
  });

  // ---------------------------------------------------------------------------
  // Concurrency
  // ---------------------------------------------------------------------------

  /**
   * Turns on concurrent evaluation for whatever `When` step follows.
   *
   * Every scenario using this has a sequential twin elsewhere in the suite
   * asserting the identical outcome. That pairing *is* the evidence for
   * INV-QD-020 at acceptance level: the answer does not depend on the schedule.
   */
  Given("evaluation is concurrent", function* () {
    yield* patch(() => ({ concurrency: "unbounded" }));
  });

  Given("evaluation is concurrent, two at a time", function* () {
    yield* patch(() => ({ concurrency: 2 }));
  });
});
