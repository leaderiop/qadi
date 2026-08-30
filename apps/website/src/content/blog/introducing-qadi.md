---
title: Introducing Qadi
description: An Effect-native authorization library for TypeScript — permission tokens, a role DAG, a schema-derived policy ADT, and a single Effect-returning evaluator.
date: 2026-08-27
author: Mohammad Almechkor
tags: [announcement]
---

Qadi is an authorization library for TypeScript, built on [Effect](https://effect.website). It gives you permission tokens, a role DAG, a schema-derived policy ADT, and a single `Effect`-returning evaluator — one definition per concept, so the pieces that describe your access rules cannot quietly drift apart from the pieces that enforce them.

## The problem this solves

Most authorization code accumulates the same way: a few `if` statements in a handler, a visibility rule duplicated in three places, a "temporary" hack that outlives the feature it was written for. Nothing is wrong with any single line of it, but nobody can answer "why was this denied?" without a debugging session, and a refactor can silently change what a check means.

The alternative most teams reach for — an external policy engine — trades that problem for a different one: your types can't flow into it, there's a network hop inside every decision, and your tests need a sidecar running.

Qadi's answer is to keep policies as typed, in-process TypeScript values.

```ts
const canReadTitle = allOf([
  hasRole("editor"),
  hasPermission(readDoc, { fields: ["id", "title"] }),
]);
```

## Why the policy type is derived, not hand-written

Most of Qadi's domain types — `Permission`, `Role`, `AuthSubject` — are ordinary hand-written TypeScript interfaces. `Policy` is the deliberate exception. Policies cross a trust boundary: they get persisted and re-parsed from untrusted JSON, which means a policy's TypeScript type and its JSON codec have to agree, permanently, or a round-trip can silently narrow what a stored policy actually grants.

So `Policy` is schema-first: one `Effect Schema` definition, with the TypeScript type and the JSON encoder/decoder both derived from it. There's no second representation to drift, because there's no second representation.

## Fail-closed, by construction

An unwired resolver denies. A subject nobody has authenticated holds no permissions. A missing dependency shows up as a test failure, not a silent grant in production. And a broken attribute lookup is an *error*, never a denial — an outage reported as "not authorized" sends engineers to audit permissions instead of the actual backend that's down.

Determinism follows the same principle: the evaluator never reaches for `Date.now()` or a random id directly. Time and identifiers arrive as services, so a decision — including its full trace and duration — reproduces exactly under test.

## Six calls, one clear line

Qadi's API surface is small on purpose, and it splits cleanly along one line: **reporting versus enforcing**.

`decide` and `check` report — they hand back an answer and run nothing themselves. `assert`, `enforce`, `enforceProjected`, and `filter` enforce — each one refuses to run the guarded code, or refuses to hand back data, on a denial or an obligation nobody discharged.

```ts
const program = loadDocument("doc-1").pipe(enforceProjected(canReadTitle));
```

On an allow, `enforceProjected` runs `loadDocument` and returns only the fields the policy makes visible. On a deny, the wrapped effect never executes at all — nothing partially runs, nothing leaks.

## What's in the box today

Nine packages ship today: [`@qadi/core`](/docs/packages/core/) (the foundation — tokens, the policy ADT, matchers, the evaluator, every enforcement call), [`@qadi/testing`](/docs/packages/testing/), [`@qadi/react`](/docs/packages/react/), [`@qadi/promise`](/docs/packages/promise/) for callers who don't use Effect, [`@qadi/http`](/docs/packages/http/), [`@qadi/devtools`](/docs/packages/devtools/), query-side enforcement via [`@qadi/predicate-sql`](/docs/packages/predicate-sql/) and [`@qadi/predicate-prisma`](/docs/packages/predicate-prisma/), and [`@qadi/audit`](/docs/packages/audit/) for regulated environments that need a real, assembled audit trail.

Every access-control model Qadi can express — and every one it can't — is documented plainly in the [access control models reference](/docs/reference/models/), with nothing implied that isn't backed by a test.

## Where to start

Read the [Getting Started guide](/docs/) for a minimal working example, or the [Concepts](/docs/concepts/tokens-permissions/) pages for the six ideas — tokens, roles, the policy ADT, matchers, evaluation, enforcement — that everything else builds on.

Qadi is still `0.0.0` and unpublished. The API may still move before the first release — but every piece described above is real, wired, and tested today.
