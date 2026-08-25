import { assert, describe, it } from "@effect/vitest";
import { compareFieldPaths, parseFieldPath, project } from "../src/FieldPath.ts";

describe("parseFieldPath", () => {
  it("splits on dots", () => {
    assert.deepStrictEqual(parseFieldPath("address.street"), ["address", "street"]);
  });

  it("a bare name is a single segment", () => {
    assert.deepStrictEqual(parseFieldPath("title"), ["title"]);
  });

  it("a malformed double-dot produces an empty segment, not an error", () => {
    assert.deepStrictEqual(parseFieldPath("a..b"), ["a", "", "b"]);
  });

  it("an empty spec is a single empty segment", () => {
    assert.deepStrictEqual(parseFieldPath(""), [""]);
  });
});

describe("compareFieldPaths", () => {
  it("two bare literals at the same path are Equal", () => {
    assert.strictEqual(compareFieldPaths("title", "title"), "Equal");
  });

  it("a literal and its own '**' are Equal — containment-equivalent", () => {
    assert.strictEqual(compareFieldPaths("address", "address.**"), "Equal");
  });

  it("two '*' at the same path are Equal", () => {
    assert.strictEqual(compareFieldPaths("address.*", "address.*"), "Equal");
  });

  it("at the same path, '*' is always the narrower side (ALessB / BLessA)", () => {
    // "*" caps an object at {}, matches a scalar exactly — never discloses
    // more than the unbounded spec at the same point, whatever the data is.
    assert.strictEqual(compareFieldPaths("address.*", "address.**"), "ALessB");
    assert.strictEqual(compareFieldPaths("address.**", "address.*"), "BLessA");
  });

  it("an unbounded ancestor always contains a deeper spec's whole subtree (BLessA)", () => {
    // "address.**"/"address" fully expand everything beneath address —
    // including all of "address.street"'s own subtree, unconditionally —
    // so the deeper spec is always the (narrower) subset, regardless of its
    // own reach.
    assert.strictEqual(compareFieldPaths("address.**", "address.street"), "BLessA");
    assert.strictEqual(compareFieldPaths("address", "address.street.zip"), "BLessA");
    assert.strictEqual(compareFieldPaths("address", "address.contact.*"), "BLessA");
  });

  it("the mirror of an unbounded ancestor's containment is ALessB", () => {
    assert.strictEqual(compareFieldPaths("address.street", "address.**"), "ALessB");
  });

  it("a bounded '*' ancestor vs. a deeper spec is Incomparable — genuinely data-shape-dependent, not a simplification", () => {
    // "address.*" discloses `street` capped but ALSO every sibling of street
    // that "address.street" never mentions; "address.street" fully expands
    // street but shows no siblings at all. Which discloses more depends on
    // whether street's value is itself an object or a scalar — the specs
    // alone can't say, so this is Incomparable at any depth past "*", not
    // just beyond one level.
    assert.strictEqual(compareFieldPaths("address.*", "address.street"), "Incomparable");
    assert.strictEqual(compareFieldPaths("address.street", "address.*"), "Incomparable");
    assert.strictEqual(compareFieldPaths("contact.*", "contact.employer"), "Incomparable");
  });

  it("a bounded '*' ancestor vs. a spec two levels down is also Incomparable", () => {
    assert.strictEqual(compareFieldPaths("address.*", "address.street.zip"), "Incomparable");
    assert.strictEqual(compareFieldPaths("address.street.zip", "address.*"), "Incomparable");
  });

  it("diverging paths of any kind are Incomparable", () => {
    assert.strictEqual(compareFieldPaths("address", "contact"), "Incomparable");
    assert.strictEqual(compareFieldPaths("address.street", "address.city"), "Incomparable");
    assert.strictEqual(compareFieldPaths("address.*", "contact.*"), "Incomparable");
  });

  it("same-length diverging paths are Incomparable, not treated as a prefix", () => {
    assert.strictEqual(compareFieldPaths("a.b", "a.c"), "Incomparable");
  });
});

describe("project", () => {
  it("a bare literal grants the whole subtree — backward compatible with the flat behavior", () => {
    const data = { id: "1", address: { street: "Main St", city: "NYC" } };
    assert.deepStrictEqual(project(data, ["id", "address"]), data);
  });

  it("'**' is containment-equivalent to a bare literal", () => {
    const data = { contact: { email: "a@b.com", employer: { name: "Acme", id: 9 } } };
    assert.deepStrictEqual(project(data, ["contact"]), project(data, ["contact.**"]));
  });

  it("a literal one segment deeper grants only that subtree", () => {
    const data = { contact: { email: "a@b.com", employer: { name: "Acme", id: 9 } } };
    assert.deepStrictEqual(project(data, ["contact.employer"]), {
      contact: { employer: { name: "Acme", id: 9 } },
    });
  });

  it("'*' grants exactly one level: an object-valued child shows present but empty", () => {
    const data = {
      contact: { email: "a@b.com", phone: "555", employer: { name: "Acme", id: 9 } },
    };
    assert.deepStrictEqual(project(data, ["contact.*"]), {
      contact: { email: "a@b.com", phone: "555", employer: {} },
    });
  });

  it("'*' grants a scalar-valued child whole, since there is nothing further to redact", () => {
    const data = { contact: { email: "a@b.com" } };
    assert.deepStrictEqual(project(data, ["contact.*"]), { contact: { email: "a@b.com" } });
  });

  it("'*' grants an array-valued child whole — arrays are never descended into", () => {
    const data = { contact: { tags: ["vip", "eu"] } };
    assert.deepStrictEqual(project(data, ["contact.*"]), { contact: { tags: ["vip", "eu"] } });
  });

  it("root-level '*' shows every top-level key, object children empty", () => {
    const data = { id: "1", address: { street: "Main St" }, count: 3 };
    assert.deepStrictEqual(project(data, ["*"]), { id: "1", address: {}, count: 3 });
  });

  it("root-level '**' grants everything", () => {
    const data = { id: "1", address: { street: "Main St", city: "NYC" } };
    assert.deepStrictEqual(project(data, ["**"]), data);
  });

  it("a field absent from the record is skipped silently", () => {
    const data = { id: "1" };
    assert.deepStrictEqual(project(data, ["id", "missing"]), { id: "1" });
  });

  it("a malformed double-dot path silently matches nothing", () => {
    const data = { a: { b: "x" } };
    assert.deepStrictEqual(project(data, ["a..b"]), {});
  });

  it("an empty spec list projects to nothing", () => {
    assert.deepStrictEqual(project({ id: "1" }, []), {});
  });

  it("two specs on the same key merge — deeper wins over a sibling '*'", () => {
    const data = { contact: { email: "a@b.com", employer: { name: "Acme" } } };
    assert.deepStrictEqual(project(data, ["contact.employer"]), {
      contact: { employer: { name: "Acme" } },
    });
  });

  it("two independent specs at different top-level keys both apply", () => {
    const data = { id: "1", title: "T", secret: "S" };
    assert.deepStrictEqual(project(data, ["id", "title"]), { id: "1", title: "T" });
  });

  it("a spec expecting more depth than the data has degrades to omission, not a crash", () => {
    // "contact.email.foo" — email is a string, not an object, so descending
    // into "foo" hits a non-object mid-path. The field spec disagrees with
    // the data's actual shape; the correct behavior is silent omission, the
    // same as any other absent field, never a thrown error.
    const data = { contact: { email: "a@b.com", phone: "555" } };
    assert.deepStrictEqual(project(data, ["contact.email.foo", "contact.phone"]), {
      contact: { phone: "555" },
    });
  });

  it("a spec expecting depth into a literal null degrades to omission, not a crash", () => {
    // typeof null === "object" in JS — isPlainObject must check `!== null`
    // explicitly, not rely on the typeof check alone, or this throws inside
    // Object.hasOwn instead of degrading gracefully.
    const data = { a: null };
    assert.deepStrictEqual(project(data, ["a.b"]), {});
  });

  it("a non-terminal '*'/'**' is a literal segment, not a wildcard", () => {
    // Wildcards are only meaningful as the LAST segment. "a.*.b" and
    // "a.**.b" look for a real key literally named "*"/"**" one level into
    // `a` — which this data doesn't have — so both project to nothing.
    const data = { a: { x: "1", y: "2" } };
    assert.deepStrictEqual(project(data, ["a.*.b"]), {});
    assert.deepStrictEqual(project(data, ["a.**.b"]), {});
  });

  it("a data key literally named '*' is still capped by a '*' spec, not disclosed via the filter", () => {
    // The wildcard-exclusion filter that keeps "*"/"**" tails out of the
    // deeper-spec grouping must not accidentally let a *literal* key named
    // "*" bypass the one-level cap by colliding with the token itself.
    const data = { contact: { "*": { secret: "deep" }, email: "a@b.com" } };
    assert.deepStrictEqual(project(data, ["contact.*"]), {
      contact: { "*": {}, email: "a@b.com" },
    });
  });

  it("two deeper specs sharing a prefix both contribute under the same key", () => {
    const data = { contact: { email: "a@b.com", phone: "555", fax: "000" } };
    assert.deepStrictEqual(project(data, ["contact.email", "contact.phone"]), {
      contact: { email: "a@b.com", phone: "555" },
    });
  });
});
