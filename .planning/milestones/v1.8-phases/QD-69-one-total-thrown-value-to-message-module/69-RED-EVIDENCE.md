phase_base: 19fe6244bc8b3494823732b1fbf87f3947852fd8

# Phase 69: the RED cases

These are the RED cases of the phase: twenty-one titles, twenty-four failed assertions (the three reporter titles fail
once per environment), each seen failing on the phase base through its site's own entry, with no `packages/*/src` file
changed. They were re-run at the head that carries every RED commit and the tree still equals `phase_base` in source.
The fixing plans are 69-04 for core, 69-05 for http, react and the capture, and 69-06 for the devtools feeds. Each row
keeps the first line of its failure so a reviewer sees the reason it fails.

## Runs

| Run | Invocation | Passed | Failed |
| --- | --- | --- | --- |
| red-core | `pnpm exec vitest run --project core packages/core/test/PortWire.test.ts packages/core/test/PortKey.test.ts packages/core/test/PortDescription.test.ts packages/core/test/SinkCodec.test.ts packages/core/test/PortConformance.test.ts packages/core/test/Evaluate.test.ts --reporter=json` | 602 | 9 |
| red-http | `pnpm exec vitest run --project http packages/http/test/PortRoutes.test.ts --reporter=json` | 63 | 1 |
| red-react | `pnpm exec vitest run --project react packages/react/test/DeveloperSignals.test.ts --reporter=json` | 29 | 6 |
| red-devtools | `pnpm exec vitest run --project devtools packages/devtools/test/model/Capture.test.ts --reporter=json` | 52 | 3 |
| red-devtools-feeds | `pnpm exec vitest run --project devtools packages/devtools/test/model/ExplorerSession.test.ts packages/devtools/test/model/TimelineFeed.test.ts packages/devtools/test/model/DiagnosticsFeed.test.ts packages/devtools/test/model/DiagnosticsStore.test.ts --reporter=json` | 135 | 5 |

## Failed cases

| File | Title | First line of the failure |
| --- | --- | --- |
| packages/core/test/Evaluate.test.ts | a CustomPredicate that dies with a value whose toString and message cannot be read surfaces as CustomPredicateError | Error: message threw |
| packages/core/test/PortConformance.test.ts | is the placeholder for a cause whose toString and message cannot be read, never a throw | AssertionError: expected '<unrenderable cause>' to equal 'a value that could not be described' |
| packages/core/test/PortConformance.test.ts | a defect whose value cannot be rendered by Cause.pretty is the placeholder, under the same predicate | Error: message threw |
| packages/core/test/PortDescription.test.ts | a request whose member throws a value whose toString and message cannot be read is refused with the placeholder | Error: toString threw |
| packages/core/test/PortDescription.test.ts | a wire whose conversion throws a value whose toString and message cannot be read refuses the question and the answer with the placeholder | Error: toString threw |
| packages/core/test/PortDescription.test.ts | a wire whose conversion throws an Error refuses with its message, without its name | AssertionError: expected 'Error: boom' to equal 'boom' |
| packages/core/test/PortKey.test.ts | refuses a getter that throws a value whose toString and message cannot be read, with the placeholder | Error: toString threw |
| packages/core/test/PortWire.test.ts | a getter that throws a value whose toString and message cannot be read is EncodeFailed with the placeholder | Error: toString threw |
| packages/core/test/SinkCodec.test.ts | a thrown Error whose message is not a string is EncodeFailed with its string form | AssertionError: expected { message: 42, _tag: 'EncodeFailed' } to deeply equal { message: 'Error: 42', …(1) } |
| packages/http/test/PortRoutes.test.ts | a transport failure whose message cannot be read is the port's own error with the placeholder, never a defect | Error: message threw |
| packages/react/test/DeveloperSignals.test.ts | a thrown value whose toString and message cannot be read is named by the placeholder | Error: toString threw |
| packages/react/test/DeveloperSignals.test.ts | a thrown Error whose message cannot be read is named by the placeholder alone | Error: message threw |
| packages/react/test/DeveloperSignals.test.ts | a thrown Error whose message is not a string is named by its string form alone | AssertionError: expected [ Array(1) ] to deeply equal [ Array(1) ] |
| packages/react/test/DeveloperSignals.test.ts | a thrown value whose toString and message cannot be read is named by the placeholder | Error: toString threw |
| packages/react/test/DeveloperSignals.test.ts | a thrown Error whose message cannot be read is named by the placeholder alone | Error: message threw |
| packages/react/test/DeveloperSignals.test.ts | a thrown Error whose message is not a string is named by its string form alone | AssertionError: expected [ Array(1) ] to deeply equal [ Array(1) ] |
| packages/devtools/test/model/Capture.test.ts | a failure with no cause, reason or message is recorded as broken with an empty message | AssertionError: expected 'AttributeResolveError' to equal '' |
| packages/devtools/test/model/Capture.test.ts | a cause whose toString and message cannot be read is recorded as broken with the placeholder | AssertionError: expected { _tag: 'Broke', …(1) } to deeply equal { _tag: 'Broke', …(1) } |
| packages/devtools/test/model/Capture.test.ts | a failing custom predicate is captured with its reason and replays with it | AssertionError: expected { _tag: 'Broke', message: 'isOwner' } to deeply equal { _tag: 'Broke', message: 'down' } |
| packages/devtools/test/model/DiagnosticsFeed.test.ts | a collector that throws a value that cannot be rendered is Stopped with the placeholder | AssertionError: expected Stopped |
| packages/devtools/test/model/DiagnosticsStore.test.ts | a layer that fails to build with a value that cannot be rendered reads Failed with the placeholder | AssertionError: expected Failed |
| packages/devtools/test/model/ExplorerSession.test.ts | a defect whose value cannot be rendered is a stated refusal with the placeholder, not a throw | Error: message threw |
| packages/devtools/test/model/ExplorerSession.test.ts | the text of an encode that died with a value that cannot be rendered is the placeholder | Error: message threw |
| packages/devtools/test/model/TimelineFeed.test.ts | a read that dies with a value that cannot be rendered is Stopped with the placeholder | AssertionError: expected Stopped |

