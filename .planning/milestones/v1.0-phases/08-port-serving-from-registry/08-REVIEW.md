---
phase: 08-port-serving-from-registry
reviewed: 2026-11-08T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - packages/core/src/AttributeResolver.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/src/DecisionHistory.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/PortRemote.ts
  - packages/core/src/PortServing.ts
  - packages/core/src/PortWire.ts
  - packages/core/src/PortWireEncode.ts
  - packages/core/src/Ports.ts
  - packages/core/src/RelationshipResolver.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/src/index.ts
  - packages/core/test/PortDescription.test.ts
  - packages/core/test/PortRemote.test.ts
  - packages/core/test/PortServing.tst.ts
  - packages/core/test/Ports.test.ts
  - packages/core/test/Ports.tst.ts
  - packages/core/test/PortsLayer.test.ts
  - packages/devtools/src/model/Capture.ts
  - packages/devtools/src/model/SimulationSource.ts
  - packages/devtools/test/model/Capture.test.ts
  - packages/testing/src/QadiReviewLayer.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
  necessity: 0
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-11-08
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the serving-facet refactor (`PortServing.ts`, `serving` on every description, `answerRemotely`/`servingFor` derived through it) and the `tabulatePorts` / `fixturePortsLayer` consolidation (`mapPorts` removal, `{ answers?, layer? }` setups). I diffed against `799a928`, traced the admission path in `answerRemotely`, and confirmed the consumers in `@qadi/http` (`PortRoutes.ts`), devtools and testing. `scripts/check-house-style.mjs` is clean, and the `PortRemote`, `Ports` and `PortsLayer` vitest suites pass (123 tests).

The refactor is behavior-preserving for admission. Each facet's `admitted`/`asked` pair is identical to the removed `ADMITTED` table and `wire.asked`. An unlisted name, `constructor` and `__proto__` are still refused before the store is read, because `Array.prototype.includes` over a closed list has no prototype lookup. `mapPorts` has no remaining source consumer, and the docs and changesets name its removal. `fixturePortsLayer` keeps its "layer wins over answers" precedence.

One robustness gap remains in the fail-closed story. The new `allowlist` word exists on every facet but nothing at runtime reads it.

## Warnings

### WR-01: A "required" allowlist is enforced by the type only; a declaration missing its list serves the port open

**File:** `packages/core/src/PortRemote.ts:69-73` (the word is declared at `packages/core/src/PortServing.ts:91`)
**Issue:** `answerRemotely` refuses only when `admitted !== undefined && !admitted.includes(asked)`. `admitted === undefined` means "open" for every port. For `AttributeResolver` and `CustomPredicate` the facet states `allowlist: "required"`, but nothing in `packages/*/src` reads `.allowlist` (the grep finds only the type and tests). If a host's declaration reaches `answerRemotely` without the list, that port is served with no restriction: any attribute name, `constructor` and `__proto__` included, and any predicate name. That is the ARCH-31 C13 hazard the "required" word exists to prevent.

This is reachable at runtime through anything the type checker does not see. Examples are a declaration loaded from JSON or config (`{ "AttributeResolver": {} }`, or an explicit `{ attributes: undefined }`, which `exactOptionalPropertyTypes` rejects only for typed callers), or a JS caller. `PortRoutes.answersFor` forwards `serving[d.port]` straight in. This is not a regression, because the removed `ADMITTED` table behaved the same way. But the refactor introduced the one datum that makes failing closed a one-line check and then left it unused. A non-array `admitted` (for example a string from config) would also get substring semantics from `String.prototype.includes`.

No test pins the missing-list case: `PortRemote.test.ts` covers only a list declared empty (`attributes: []`, `names: []`), which the type permits.

**Fix:** Let the facet's own word decide what `undefined` means.
```ts
const admitted = d.serving.admitted(serving);
const asked = d.serving.asked(args);
const open = admitted === undefined && d.serving.allowlist !== "required";
const listed = Array.isArray(admitted) && asked !== undefined && admitted.includes(asked);
if (d.serving.allowlist === "opt-in" ? false : !open && !listed) {
  return { _tag: "Refused", reason: "NotServed" };
}
```
Simplest form: add `if (admitted === undefined && d.serving.allowlist === "required") return { _tag: "Refused", reason: "NotServed" };` before the existing check, and add a test that `answerRemotely(PORTS.AttributeResolver, {} as never)` refuses without calling the store. That also gives `allowlist` a runtime consumer.

## Info

### IN-01: `leaves[tag]` is a plain-object lookup, so a prototype key reaches `?.()`

**File:** `packages/core/src/PortRemote.ts:175`
**Issue:** `leaves[tag]?.(leaf)` reads an object literal that is indexed by a policy `_tag`. This codebase treats prototype keys as a named hazard (C13). A caller-held `Policy` that was never schema-decoded, which `foldPolicy`'s own doc allows, and whose `_tag` is `constructor` would call `Object(leaf)` and add a non-string to `heard`. A `__proto__` tag would throw a `TypeError`. A typed `Policy` cannot carry such a tag, and `servingFor` runs at start-up, so this is low severity.
**Fix:** `Object.hasOwn(leaves, tag) ? leaves[tag]?.(leaf) : undefined`.

### IN-02: Signature facet smuggles a presence flag through the `leaves`/`declare` name channel

**File:** `packages/core/src/SignatureHistory.ts:210-214`
**Issue:** `leaves.HasSignature` returns the magic string `"own-records"` only so that `servingFor` sees a non-empty `heard` set, and `declare` then tests `names.length > 0` and re-spells `"own-records"`. The same facet's `asked` returns `undefined` ("a request asks none"), so `leaves` ("the name the leaf asks") and `asked` disagree about whether this port has a name. The literal is spelled three times (`PortServing.ts:44`, `SignatureHistory.ts:210` and `:214`). The facet works, but the contract "`leaves` returns a name" is bent for the opt-in word and is easy to break if a second opt-in port is added.
**Fix:** Name the sentinel once (`const OWN_RECORDS = "own-records" as const`) and use it in both places, or document on `ServedLeaves` that an opt-in port returns a presence marker.

---

_Reviewed: 2026-11-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
