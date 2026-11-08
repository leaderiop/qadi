---
phase: 07-port-route-address
reviewed: 2026-11-08T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - packages/http/src/PortRouteAddress.ts
  - packages/http/src/PortRoutes.ts
  - packages/http/src/RemotePorts.ts
  - packages/http/test/PortRoutes.test.ts
  - .changeset/port-route-address.md
  - spec/behaviors/23-http.md
  - spec/behaviors/34-remote-ports.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
  necessity: 0
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-11-08
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

The shared leaf module `PortRouteAddress.ts` is small, type-only on its one `@qadi/core` import, and correctly kept out of the barrel (`packages/http/src/index.ts` exports neither it nor changes any export). Both adapters now build paths through `portPath`, so the stated defect (two independent copies of the default prefix) is closed. The client really does decode the body without a status check (`RemotePorts.ts:56-62`), which matches the stated contract.

I ran `pnpm exec vitest run --project http packages/http/test/PortRoutes.test.ts` (60 passed) and `node scripts/check-house-style.mjs` (clean). The new tests use literal prefixes and URLs on purpose, so they can tell the adapters apart, and the three canned-response tests pin the status contract in three different ways. The spec cross-references I checked resolve: BEH-QD-338, CCR-QD-391, INV-QD-241, INV-QD-006, ADR-QD-099 and ADR-QD-107 all exist, and the traceability §1 and §4 rows and the README register agree with each other.

I found no correctness or security defects. One robustness gap in the new single point of construction, and three small quality items.

## Warnings

### WR-01: `portPath` is the one place the address is built, but accepts prefixes its own docs forbid

**File:** `packages/http/src/PortRouteAddress.ts:35-36` (docs at `PortRoutes.ts:69` and `RemotePorts.ts:28,33`)
**Issue:** Both option docs say the prefix is "without a trailing slash", and `baseUrl` likewise. The type `` `/${string}` `` admits `"/"` and `"/x/"`, which yield `"//AttributeResolver"` and `"/x//AttributeResolver"`. The two adapters would stay consistent with each other, but only if the router and the HTTP client both preserve the double slash. A proxy or router that collapses `//` would 404 every remote read, and a 404 is reported as the port's own error. The read still fails closed, but it is the "every re-check broken, no reply body" failure this phase set out to remove. Now that construction is centralized, this is the cheapest place to enforce the rule. As written, the rule lives only in prose in three separate doc comments.
**Fix:** Normalize in `portPath`, for example:
```ts
const trimmed = (prefix ?? PORT_ROUTE_PREFIX).replace(/\/+$/, "");
return `${trimmed}/${port}`;
```
If the maintainers prefer to reject rather than normalize, do that in the option-reading layer. Add one `portPath("/x/ports/", …)` assertion to the "address" describe block either way.

## Info

### IN-01: Test file header still describes the pre-ARCH-52 scope

**File:** `packages/http/test/PortRoutes.test.ts:1-10`
**Issue:** The header lists only the per-port status cases. The file now also pins the shared address (the round trip under `/x/ports`, "nowhere else", the default-prefix client) and the reply-body contract (three canned responses). A reader skimming the header will not know the file carries ARCH-52's proof, which `spec/traceability.md` §4 now attributes to it.
**Fix:** Add a sentence naming ARCH-52 and BEH-QD-338, as the other describe blocks already do in their titles.

### IN-02: "Default-prefix client" test asserts only the error tag

**File:** `packages/http/test/PortRoutes.test.ts:329-347`
**Issue:** The test claims the client gets "the port's own error, never an answer", but it asserts only `_tag`. That tag is the same for `Transport`, `Undecodable` and `Refused` failures. The case would therefore still pass if the failure came from a different cause than the 404 it is meant to model. The sibling canned-response tests already do include the cause (`"Transport"`, `"NotServed"`).
**Fix:** Also assert the cause, for example `assert.include(rendered(error), "Transport")`. The router's bodiless 404 fails `response.json`.

### IN-03: BEH-QD-333 addition runs into the previous paragraph, and the revised document keeps an old Effective Date

**File:** `spec/behaviors/34-remote-ports.md:104-106` and the header table (`Effective Date | 2026-10-08` beside Revision 1.3 dated 2026-11-08)
**Issue:** The new two-line pointer sits on the line directly after "…decoded by a client whatever its status.", so it renders as part of the same paragraph instead of a separate cross-reference. The header's Effective Date was already stale at 1.1 and 1.2, so this is inherited rather than new.
**Fix:** Insert a blank line before "The address both adapters use…". Bump the Effective Date if the spec tooling expects it to track the latest revision.

---

_Reviewed: 2026-11-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
