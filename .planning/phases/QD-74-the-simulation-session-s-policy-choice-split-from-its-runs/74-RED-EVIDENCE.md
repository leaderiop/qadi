# Phase 74 evidence: the simulation session characterisation

This file records what the characterisation of the simulation session's policy choice did on the code before any source
change, and, in the plans after it, what each deliberate break of the new code did to it. Each section names the
commit it ran on and the command, so a later reader can run it again.

## The characterisation on the base

Base sha: `b22d97f9af293734787b3f771400d6f5f6e87065` (no `packages/devtools/src` file differs from it).
Characterisation commit: `e25c8cfdc28cdc797cb1f662615e7c214e9bda2d`.

Command, from the repository root:

```
pnpm exec vitest run --project devtools packages/devtools/test/model/SimulationSession.characterisation.test.ts --reporter=json --outputFile=<report>
```

| Run | Result |
| --- | ------ |
| 1 | 35 passed, 0 failed |
| 2 | 35 passed, 0 failed |
| 3 | 35 passed, 0 failed |

The 35 rows hold the 35 titles of the plan under 8 describes (`seeding`, `replaying a row`, `choosing a policy`, `the
policy menu`, `staleness`, `the rail`, `the ports`, `the draft`). Every expected value reasoned from the code was the
value the base returned: no row took a value from the base that differs from the one it was written with.
