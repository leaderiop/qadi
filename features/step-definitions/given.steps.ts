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

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

Given("the caller is performing {string}", function (this: QadiWorld, verb: string) {
  this.action = verb;
});
