/**
 * The devtools address rule's types (ARCH-66): the route names are a closed set,
 * a prefix must start with a slash, every path does, and each route constructor
 * takes the prefix; `devtoolsRoutes` mounts all three and has no unguarded form.
 */
import { expect, test } from "tstyche";
import { hasPermission, permission } from "@qadi/core";
import type { DecisionLog, DecisionLogReader } from "@qadi/core";
import {
  decisionBacklogRoute,
  decisionStreamRoute,
  devtoolsPath,
  devtoolsRoutes,
  permissionRegistryRoute,
  permissionRegistryRouteUnguarded,
} from "../src/index.ts";
import type { DevtoolsRoute, DevtoolsRouteOptions } from "../src/index.ts";

const read = permission("devtools", "read");
const policy = hasPermission(read);
declare const log: DecisionLog;
declare const reader: DecisionLogReader;

test("the routes are exactly the three devtools routes", () => {
  expect<DevtoolsRoute>().type.toBe<"decisions" | "backlog" | "permissions">();
  expect(devtoolsPath).type.not.toBeCallableWith("ports");
});

test("a prefix starts with a slash, and a path always does", () => {
  expect(devtoolsPath).type.toBeCallableWith("decisions", "/x/devtools");
  expect(devtoolsPath).type.toBeCallableWith("decisions");
  expect(devtoolsPath).type.not.toBeCallableWith("decisions", "x/devtools");
  expect(devtoolsPath("backlog")).type.toBe<`/${string}`>();
  expect<DevtoolsRouteOptions["prefix"]>().type.toBe<`/${string}` | undefined>();
});

test("every devtools route constructor takes the prefix", () => {
  expect(decisionStreamRoute).type.toBeCallableWith(read, policy, log, { prefix: "/x" });
  expect(decisionBacklogRoute).type.toBeCallableWith(read, policy, log, { prefix: "/x" });
  expect(permissionRegistryRoute).type.toBeCallableWith(read, policy, { prefix: "/x" });
  expect(permissionRegistryRouteUnguarded).type.toBeCallableWith("reason", { prefix: "/x" });
  expect(decisionStreamRoute).type.not.toBeCallableWith(read, policy, log, { prefix: "x" });
});

test("devtoolsRoutes has no unguarded form: the permission and the policy are required", () => {
  expect(devtoolsRoutes).type.toBeCallableWith(read, policy, log);
  expect(devtoolsRoutes).type.toBeCallableWith(read, policy, log, { prefix: "/x", reauth: { interval: "1 hour" } });
  expect(devtoolsRoutes).type.not.toBeCallableWith(log);
  expect(devtoolsRoutes).type.not.toBeCallableWith(read, log);
});

test("devtoolsRoutes needs a log it can both read and snapshot", () => {
  expect(devtoolsRoutes).type.not.toBeCallableWith(read, policy, reader);
});
