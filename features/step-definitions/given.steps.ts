import { Given, setWorldConstructor, Before } from "@cucumber/cucumber";
import { QadiWorld } from "./world.ts";

setWorldConstructor(QadiWorld);

Before(function (this: QadiWorld) {
  this.reset();
});

// ---------------------------------------------------------------------------
// Subject
// ---------------------------------------------------------------------------

Given("a subject {string}", function (this: QadiWorld, id: string) {
  this.subjectId = id;
});

Given(
  "the subject has permission {string}",
  function (this: QadiWorld, key: string) {
    const [resource, action] = key.split(":");
    if (resource === undefined || action === undefined) {
      throw new Error(`malformed permission key: ${key}`);
    }
    this.permissions.push(`${resource}:${action}`);
  },
);

Given("the subject has no permissions", function (this: QadiWorld) {
  this.permissions = [];
});

Given("the subject has role {string}", function (this: QadiWorld, name: string) {
  this.roles.push(name);
});

Given(
  "the subject has attribute {string} of {int}",
  function (this: QadiWorld, key: string, value: number) {
    this.attributes[key] = value;
  },
);

Given(
  "the subject has attribute {string} of {string}",
  function (this: QadiWorld, key: string, value: string) {
    this.attributes[key] = value;
  },
);

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

Given(
  "the attribute service resolves {string} to {int}",
  function (this: QadiWorld, key: string, value: number) {
    this.resolvedAttributes[key] = value;
  },
);

Given(
  "the subject is {string} of resource {string}",
  function (this: QadiWorld, relation: string, resourceId: string) {
    this.relationships.push([this.subjectId, relation, resourceId]);
  },
);

Given(
  "the resource {string} with attribute {string} of {string}",
  function (this: QadiWorld, id: string, key: string, value: string) {
    this.resource = { id, [key]: value };
  },
);

Given("the resource {string}", function (this: QadiWorld, id: string) {
  this.resource = { id };
});

Given(
  "the resource {string} raised by {string}",
  function (this: QadiWorld, id: string, raisedBy: string) {
    this.resource = { id, raisedBy };
  },
);

Given(
  "the resource {string} owned by {string}",
  function (this: QadiWorld, id: string, owner: string) {
    this.resource = { id, owner };
  },
);

Given(
  "the resource {string} at level {int}",
  function (this: QadiWorld, id: string, level: number) {
    this.resource = { id, level };
  },
);

/** Brewer–Nash exempts anonymised material explicitly, and it needs no history. */
Given("the sanitised material {string}", function (this: QadiWorld, id: string) {
  this.resource = { id, sanitised: true };
});

/**
 * A purpose-built setter, because `"the resource … with attribute … of …"`
 * *replaces* the resource rather than merging into it — two attributes cannot be
 * chained, and a workflow step needs both its state and its raiser.
 */
Given(
  "the task {string} in state {string} raised by {string}",
  function (this: QadiWorld, id: string, state: string, raisedBy: string) {
    this.resource = { id, state, raisedBy };
  },
);

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

Given("the caller is performing {string}", function (this: QadiWorld, verb: string) {
  this.action = verb;
});

Given("an obligation handler is supplied", function (this: QadiWorld) {
  this.handlesObligations = true;
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

Given(
  "the history records that {string} raised {string}",
  function (this: QadiWorld, subjectId: string, resourceId: string) {
    this.events = [...(this.events ?? []), [subjectId, "raised", resourceId]];
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
  function (this: QadiWorld, subjectId: string, company: string, conflictClass: string) {
    this.events = [...(this.events ?? []), [subjectId, conflictClass, company]];
  },
);

Given(
  "the history records that {string} approved {string}",
  function (this: QadiWorld, subjectId: string, resourceId: string) {
    this.events = [...(this.events ?? []), [subjectId, "approved", resourceId]];
  },
);

Given("the history store is unreachable", function (this: QadiWorld) {
  this.historyUnreachable = true;
});

// ---------------------------------------------------------------------------
// Security labels
// ---------------------------------------------------------------------------

const label = (level: number, compartments: string) => ({
  level,
  compartments: compartments === "" ? [] : compartments.split(",").map((c) => c.trim()),
});

Given(
  "a subject {string} cleared at level {int}",
  function (this: QadiWorld, id: string, level: number) {
    this.subjectId = id;
    this.attributes["clearance"] = label(level, "");
  },
);

Given(
  "a subject {string} cleared at level {int} in compartment {string}",
  function (this: QadiWorld, id: string, level: number, compartment: string) {
    this.subjectId = id;
    this.attributes["clearance"] = label(level, compartment);
  },
);

Given(
  "a subject {string} cleared at level {int} in compartments {string}",
  function (this: QadiWorld, id: string, level: number, compartments: string) {
    this.subjectId = id;
    this.attributes["clearance"] = label(level, compartments);
  },
);

Given(
  "the resource {string} classified at level {int}",
  function (this: QadiWorld, id: string, level: number) {
    this.resource = { id, label: label(level, "") };
  },
);

Given(
  "the resource {string} classified at level {int} in compartment {string}",
  function (this: QadiWorld, id: string, level: number, compartment: string) {
    this.resource = { id, label: label(level, compartment) };
  },
);

/** The plural existed for the subject and not the resource. A genuine partial
 * order needs two compartments on BOTH sides — `{A,B}` against `{A,C}` — which
 * the singular cannot express. */
Given(
  "the resource {string} classified at level {int} in compartments {string}",
  function (this: QadiWorld, id: string, level: number, compartments: string) {
    this.resource = { id, label: label(level, compartments) };
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

Given(
  "a producer {string} at integrity level {int}",
  function (this: QadiWorld, id: string, level: number) {
    this.subjectId = id;
    this.attributes["integrity"] = label(level, "");
  },
);

Given(
  "a producer {string} at integrity level {int} in compartment {string}",
  function (this: QadiWorld, id: string, level: number, compartment: string) {
    this.subjectId = id;
    this.attributes["integrity"] = label(level, compartment);
  },
);

Given(
  "the artefact {string} at integrity level {int}",
  function (this: QadiWorld, id: string, level: number) {
    this.resource = { id, label: label(level, "") };
  },
);

Given(
  "the artefact {string} at integrity level {int} in compartment {string}",
  function (this: QadiWorld, id: string, level: number, compartment: string) {
    this.resource = { id, label: label(level, compartment) };
  },
);

/**
 * The low-water mark, which is the caller's to maintain.
 *
 * Deliberately a *resolved* attribute and not a subject one. A static attribute
 * cannot change between evaluations, and per BEH-QD-034 it would shadow this one
 * entirely — `HasAttribute` reads the subject first and calls the resolver only
 * on a miss.
 */
Given(
  "the attribute service resolves the effective integrity to level {int}",
  function (this: QadiWorld, level: number) {
    this.resolvedAttributes["effectiveIntegrity"] = label(level, "");
  },
);

/** The misconfiguration BEH-QD-034 makes possible. Used by one scenario, to fail. */
Given(
  "the producer also carries a static effective integrity of level {int}",
  function (this: QadiWorld, level: number) {
    this.attributes["effectiveIntegrity"] = label(level, "");
  },
);

// ---------------------------------------------------------------------------
// Subject sets
// ---------------------------------------------------------------------------

Given("the candidate {string}", function (this: QadiWorld, id: string) {
  this.candidates.push({ id, roles: [], permissions: [] });
});

Given(
  "the candidate {string} with role {string}",
  function (this: QadiWorld, id: string, name: string) {
    this.candidates.push({ id, roles: [name], permissions: [] });
  },
);

Given(
  "the candidate {string} with permission {string}",
  function (this: QadiWorld, id: string, key: string) {
    const [resource, action] = key.split(":");
    if (resource === undefined || action === undefined) {
      throw new Error(`malformed permission key: ${key}`);
    }
    this.candidates.push({ id, roles: [], permissions: [`${resource}:${action}`] });
  },
);

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
Given("evaluation is concurrent", function (this: QadiWorld) {
  this.concurrency = "unbounded";
});

Given("evaluation is concurrent, two at a time", function (this: QadiWorld) {
  this.concurrency = 2;
});
