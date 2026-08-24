@devtools @REQ-QD-024
Feature: The devtools timeline

  A decision is made on a server, dehydrated, and re-checked in a browser; or by
  whichever of five replicas answered. The records arrive out of order, twice,
  and sometimes half. One module absorbs all of that, and every screen after it
  may assume the timeline is ordered, unique and joined.

  Three distinctions in this file matter more than the view does, because each
  is a conclusion someone acts on: a failure is not a denial, a re-check is not
  a repeat, and a branch that was never examined is not one that was rejected.

  Scenario: Records arriving out of order still read chronologically
    Given a decision recorded at 300 on "Server"
    And a decision recorded at 100 on "Server"
    And a decision recorded at 200 on "Server"
    Then the timeline reads "ev-100, ev-200, ev-300"

  Scenario: A feed that replays does not duplicate a row
    # `EventSource` reconnects by itself and a feed may be replaying, so the
    # same record arrives twice. That is ordinary, not an error.
    Given a decision recorded at 100 on "Server"
    And that same decision is delivered again
    Then the timeline has 1 row

  Scenario: A server decision and its client re-check are two rows, not one
    # They deliberately share an evaluation id — that is the whole pairing
    # story — so identity cannot be the id alone.
    Given a decision recorded at 100 on "Server"
    And the same evaluation re-checked at 200 on "Client"
    Then the timeline has 2 rows
    And the row on "Server" is the origin
    And the row on "Client" continues it

  Scenario: A re-check that disagrees is flagged on both rows
    # A server allow that no longer holds client-side is a hydration mismatch,
    # and the most interesting thing this tool can surface.
    Given an allowed decision recorded at 100 on "Server"
    And the same evaluation denied at 200 on "Client"
    Then both rows are marked as disagreeing

  Scenario: A failure is an error, never a denial
    # INV-QD-006 from a reader's position. A lookup broke, so no verdict
    # exists; reading this row as a denial says the policy worked when it
    # never ran.
    Given a failed evaluation recorded at 100 on "Server"
    Then the row reads "Error"
    And the row does not read "Deny"

  Scenario: Counts keep errors apart from denials
    Given an allowed decision recorded at 100 on "Server"
    And a denied decision recorded at 200 on "Server"
    And a failed evaluation recorded at 300 on "Server"
    Then the counts are 3 decisions, 1 denied and 1 errored

  Scenario: An obligation outcome joins the decision it belongs to
    Given a decision recorded at 100 on "Server"
    And an obligation outcome "Discharged" recorded at 101 for that evaluation
    Then the timeline has 1 row

  Scenario: An outcome that arrives before its decision still joins
    # The outcome is emitted after `evaluate` returned, from a different
    # module, so it can win the race to the reader.
    Given an obligation outcome "Discharged" recorded at 101 for "ev-100"
    And a decision recorded at 100 on "Server"
    Then the timeline has 1 row

  Scenario: An outcome whose decision never arrives is kept, not dropped
    # A binding duty nobody discharged turned someone's allow into an error.
    # "Something was refused and I cannot show you what" is a fact a reviewer
    # needs.
    Given an obligation outcome "Refused" recorded at 101 for "ev-999"
    Then the timeline has 1 row
    And the row reads "Unknown"

  Scenario: A short-circuited branch is unexamined, not denied
    # INV-QD-005 from a reader's position, and the one place where a rendering
    # bug becomes a security misreading.
    Given a policy requiring all of "doc:write" and "doc:read"
    When the timeline inspects that decision
    Then the first branch is "Denied"
    And the second branch is "NeverResolved"

  Scenario: A failed evaluation has no requirement tree at all
    # An empty tree reads as "no requirements", which reads as "allowed".
    Given a failed evaluation recorded at 100 on "Server"
    Then that row has no requirement tree
