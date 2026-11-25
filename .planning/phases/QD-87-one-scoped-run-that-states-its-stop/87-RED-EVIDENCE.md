# Phase 87 RED evidence

Every line below was written when the check it names was seen failing. A line is one of `- red on the base: <title>`
(a test red on the unchanged base, before the change that turns it green), followed by an indented `  - failed on: <the
first failing assertion as vitest printed it>`; `- failed: <title>` (a test or cell seen failing under a scratch edit) and
`- failed (<tag>): <title>` (the same, with the kind of edit in the tag), each followed by an indented `  (scratch edit:
<the edit>; <n> row(s) failed under it)`; `- check failed: <mode>: <first stderr line>` (a phase script's mode seen
refusing); or `- spike: <line>` (a line the protocol spike printed). A scratch edit is restored from a copy before
anything is committed. The base is the phase base recorded in `87-mutation-base.json`.

## 87-01 the broken simulation run

Written on the base, before any file under `packages/*/src` moved. The three session rows fail on the text a run reports
today, the stringified cause (`Cause([...])`, with a fiber id for an interruption, which no row pins); the three
simulator rows fail because the broken-run box holds a `<span>` and no labelled block.

- red on the base: SX1 a run whose ports layer dies reports its cause in the text the feeds use: first line the error, never a Cause wrapper
  - failed on: AssertionError: Cause([Die(Error: the layer exploded)]): expected true to be false
- red on the base: SX2 a run whose ports layer dies with a value that cannot be described reports the one placeholder, as the feeds do
  - failed on: AssertionError: expected 'Cause([Die([toString threw])])' to equal 'a value that could not be described'
- red on the base: SX3 a run whose resolver interrupts itself reports the interruption in the text the feeds use
  - failed on: AssertionError: Cause([Interrupt(32)]): expected true to be false
- red on the base: SB2 a broken simulation shows its message in a labelled focusable pre
  - failed on: TestingLibraryElementError: Unable to find an accessible element with the role "group" and name "Why the simulation failed"
- red on the base: SB3 the broken simulation pre holds the message exactly, its first line the error
  - failed on: TestingLibraryElementError: Unable to find an accessible element with the role "group" and name "Why the simulation failed"
- red on the base: SB4 the broken simulation pre has the stopped box reason style
  - failed on: TestingLibraryElementError: Unable to find an accessible element with the role "group" and name "Why the simulation failed"

SB1 is green on the base: it pins the stopped box's reason block as the box draws it today, so the move of the style to
the shared theme is seen to leave the render alone.

- failed: SB1 the stopped box shows its reason in a labelled focusable pre whose style is the reason style
  (scratch edit: `maxHeight: 96` changed to `maxHeight: 97` in `reasonStyle` of `packages/devtools/src/react/StoppedBox.tsx`, restored with `cp` from a copy; 1 row(s) failed under it)
