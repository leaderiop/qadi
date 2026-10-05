@decision-log @REQ-QD-902
Feature: One decision log is a process's sink, its history and its live stream

  A process wires one decision log. Evaluations record into it, a devtools
  reader opened at any time reads what it already holds and then what it
  decides next, and each record carries the label of the process that made it.
  A reader over Server-Sent Events gets exactly what a reader in the same
  process gets: the backlog travels on the stream, every frame names its
  producer, and nothing made while the reader connects is lost or repeated.

  Scenario: A reader that arrives late sees what was already decided
    Given a server decision log holding 3 decisions
    When a devtools reader connects over SSE
    Then its backlog holds 3 records labelled "Server"

  Scenario: A decision made after the reader connected arrives once, live
    Given a server decision log holding 1 decision
    When a devtools reader connects over SSE
    And the server decides again
    Then the reader receives 1 live record labelled "Server"
    And no record reaches the reader twice

  Scenario: A record ingested from an edge function reaches the reader labelled Edge
    Given a server decision log holding 0 decisions
    When a devtools reader connects over SSE
    And the log ingests a record from "Edge"
    Then the reader receives 1 live record labelled "Edge"

  Scenario: An empty log is an empty history, not a missing one
    Given a server decision log holding 0 decisions
    When a devtools reader connects over SSE
    Then its backlog holds 0 records labelled "Server"

  Scenario: The reader over SSE sees what a reader in the process sees
    Given a server decision log holding 2 decisions
    When a devtools reader connects over SSE
    And the log ingests a record from "Edge"
    Then the reader over SSE and a reader in the process hold the same records
