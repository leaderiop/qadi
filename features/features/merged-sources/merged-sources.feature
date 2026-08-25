@merged-sources @REQ-QD-030
Feature: One timeline from a server and a browser

  The second of the six deployments is the one with two producers: a server
  decides while it renders the page, and the browser re-checks after it. The two
  records carry one evaluation id precisely so they can be shown as a pair.

  The pairing was unreachable. Each transport produces one source, the dock
  consumes one source, and nothing joined two. A ring can be handed a record from
  elsewhere, but a ring answers for the past — a second *live* stream had nowhere
  to go at all.

  What makes this more than a concatenation is the past. A source distinguishes
  "I cannot answer for the past" from "I can, and there was nothing", and a merge
  that answered the empty array would destroy that distinction in the one
  operation meant to preserve both sides of it.

  Scenario: Both producers' decisions reach one timeline
    Given a server decided "doc:read" for "alice"
    And the browser re-checked the same question
    When the two sources are merged
    Then the timeline holds 2 rows

  Scenario: The server's decision and the browser's re-check are one pair
    Given a server decided "doc:read" for "alice"
    And the browser re-checked the same question
    When the two sources are merged
    Then the rows are one pair
    And the pair does not disagree

  Scenario: A browser that answers differently is still a pair, and says so
    Given a server decided "doc:read" for "alice"
    And the browser re-checked and disagreed
    When the two sources are merged
    Then the rows are one pair
    And the pair disagrees

  Scenario: A merge of producers with no history cannot answer for the past
    Given two producers that keep no history
    When the two sources are merged
    Then the merged source cannot answer for the past

  Scenario: One producer with a history is enough
    Given a server decided "doc:read" for "alice"
    And a producer that keeps no history
    When the two sources are merged
    Then the merged source can answer for the past
    And the timeline holds 1 rows

  Scenario: The past is ordered by time, not by producer
    Given a producer whose records are at 3000 and 1000
    And a producer whose record is at 2000
    When the two sources are merged
    Then the merged rows are ordered 1000, 2000, 3000

  Scenario: A replayed record is not swallowed here
    Given a producer whose records are at 1000 and 1000
    And a producer that keeps no history
    When the two sources are merged
    Then the merged past holds 2 records

  Scenario: Live records from both producers arrive
    Given a producer streaming 2 records live
    And a producer streaming 1 records live
    When the two sources are merged
    Then 3 records arrive live
