import { Given, setWorldConstructor, Before } from "@cucumber/cucumber";
import { GuardWorld } from "./world.ts";

setWorldConstructor(GuardWorld);

Before(function (this: GuardWorld) {
  this.reset();
});

// ---------------------------------------------------------------------------
// Subject
// ---------------------------------------------------------------------------

Given("a subject {string}", function (this: GuardWorld, id: string) {
  this.subjectId = id;
});

Given(
  "the subject has permission {string}",
  function (this: GuardWorld, key: string) {
    const [resource, action] = key.split(":");
    if (resource === undefined || action === undefined) {
      throw new Error(`malformed permission key: ${key}`);
    }
    this.permissions.push(`${resource}:${action}`);
  },
);

Given("the subject has no permissions", function (this: GuardWorld) {
  this.permissions = [];
});

Given("the subject has role {string}", function (this: GuardWorld, name: string) {
  this.roles.push(name);
});

Given(
  "the subject has attribute {string} of {int}",
  function (this: GuardWorld, key: string, value: number) {
    this.attributes[key] = value;
  },
);

Given(
  "the subject has attribute {string} of {string}",
  function (this: GuardWorld, key: string, value: string) {
    this.attributes[key] = value;
  },
);

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

Given(
  "the attribute service resolves {string} to {int}",
  function (this: GuardWorld, key: string, value: number) {
    this.resolvedAttributes[key] = value;
  },
);

Given(
  "the subject is {string} of resource {string}",
  function (this: GuardWorld, relation: string, resourceId: string) {
    this.relationships.push([this.subjectId, relation, resourceId]);
  },
);

Given(
  "the resource {string} with attribute {string} of {string}",
  function (this: GuardWorld, id: string, key: string, value: string) {
    this.resource = { id, [key]: value };
  },
);

Given("the resource {string}", function (this: GuardWorld, id: string) {
  this.resource = { id };
});
