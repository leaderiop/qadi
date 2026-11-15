/**
 * Pins that the facade's collection methods refuse a second `resource` in their
 * options, as its `projected` already does.
 *
 * Each item is the resource its own decision sees, so a restated one beside it would
 * let a policy decide on one value while another is handed back (ADR-QD-104,
 * INV-QD-108). The facade forwards core's options branch-free (ADR-QD-032), so the
 * refusal is a type, and this file is where it is checked. The callable form is a real
 * check here because the facade returns a `Promise`, which `effect(floatingEffect)` does
 * not treat as a floating Effect.
 */
import { expect, test } from "tstyche";
import type { AuthSubject } from "@qadi/core";
import { hasPermission, permission } from "@qadi/core";
import type { Qadi } from "../src/index.ts";

const canRead = hasPermission(permission("doc", "read"));

declare const qadi: Qadi;
declare const alice: AuthSubject;

test("the facade's filter and filterProjected refuse a second resource in their options", () => {
  expect(qadi.filter).type.not.toBeCallableWith(alice, canRead, [{ id: "a" }], {
    resource: { id: "x" },
  });
  expect(qadi.filterProjected).type.not.toBeCallableWith(alice, canRead, [{ id: "a" }], {
    resource: { id: "x" },
  });

  // Controls: a refusal of every options value would pass the lines above too.
  expect(qadi.filter).type.toBeCallableWith(alice, canRead, [{ id: "a" }]);
  expect(qadi.filter).type.toBeCallableWith(alice, canRead, [{ id: "a" }], { concurrency: 2 });
  expect(qadi.filterProjected).type.toBeCallableWith(alice, canRead, [{ id: "a" }]);
  expect(qadi.filterProjected).type.toBeCallableWith(alice, canRead, [{ id: "a" }], {
    concurrency: 2,
  });
});
