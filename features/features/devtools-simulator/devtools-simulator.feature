@devtools-simulator @REQ-QD-026
Feature: Asking what would happen, and checking it against what did

  Six devtools screens answer "what happened". This one answers the
  counterfactual a reviewer usually arrives with: was it the role, or the
  permission? A trace cannot say — it records which nodes were consulted, not
  which grant would have been missed if it were gone.

  Running an evaluation from a debug panel is a different risk class from
  reading records, and the first three scenarios are the ones that make it
  defensible at all.

  Scenario: A simulation writes nothing, however many times it runs
    # `Effect.provide` adds to a context and cannot remove from one, so the
    # sink an application wired is still in scope. Left unshadowed, a sweep
    # fabricates one audit row per edit.
    Given a decision sink is recording
    And a simulated subject "alice" holding the role "editor"
    When a what-if sweep runs against the "editor role" policy
    Then the sink has recorded 0 decisions

  Scenario: A simulation reaches no port it was not given
    Given a simulated subject "alice" holding the permission "doc:read"
    And every real resolver is broken
    When the "doc:read" policy is simulated
    Then the simulation allows

  Scenario: The subject is the panel's, never a live one
    Given a simulated subject "alice" holding the permission "doc:read"
    When the "doc:read" policy is simulated
    Then the decision names the subject "alice"

  Scenario: A broken port is an error, never a denial
    Given a simulated subject "alice" holding nothing
    And every real resolver is broken
    When the "clearance" policy is simulated against the live resolvers
    Then the simulation fails rather than denying

  Scenario: Dropping the grant the answer turned on
    Given a simulated subject "alice" holding the role "editor"
    When a what-if sweep runs against the "editor role" policy
    Then the sweep reports "without role editor" as flipping the verdict

  Scenario: Neither grant is load-bearing until both are gone
    # `anyOf` is satisfied either way, so no single edit turns the verdict —
    # which is the whole reason second-order sweeps exist.
    Given a simulated subject "alice" holding the role "editor"
    And the subject also holds the permission "doc:read"
    When a paired what-if sweep runs against the "either way" policy
    Then no single edit flips the verdict
    And the pair of both flips the verdict

  Scenario: A denial is answered with what would fix it
    Given a simulated subject "alice" holding nothing
    When a what-if sweep runs against the "editor role" policy
    Then the sweep offers "with role editor" as a strengthening
    And that row allows

  Scenario: A sweep says what it will cost before it runs
    Given a simulated subject "alice" holding the role "editor"
    And every real resolver is broken
    Then a sweep against the live resolvers is reported as performing lookups
    And a sweep against fixtures is reported as performing none

  Scenario: A replayed row seeds the question and names what it could not seed
    Given a logged decision "ev-91" against the "doc:read" policy for "alice"
    When that row is replayed
    Then the replayed policy is the logged one
    And the replay names "roles" among the fields it could not seed
    And the replay names "relationships" among the fields it could not seed

  Scenario: A reconstruction that reproduces the logged decision
    Given a logged decision "ev-91" against the "doc:read" policy for "alice"
    When that row is replayed
    And the reviewer supposes the subject held the permission "doc:read"
    Then the reconstruction matches the baseline

  Scenario: A reconstruction that does not
    Given a logged decision "ev-91" against the "doc:read" policy for "alice"
    When that row is replayed
    And the reviewer supposes the subject held the permission "doc:write"
    Then the reconstruction does not match the baseline
    And the difference names the node "HasPermission"

  Scenario: An orphan cannot be replayed
    Given a logged obligation outcome "ev-9" with no decision
    When that row is replayed
    Then the replay is refused

  Scenario: A snapshot answers what the live layer answered
    Given a simulated subject "alice" holding nothing
    And a real resolver answering "clearance" with 9
    When the "clearance" policy is captured against the live resolvers
    And the capture is replayed
    Then the replayed trace is identical to the captured one

  Scenario: A captured outage replays as an outage
    Given a simulated subject "alice" holding nothing
    And every real resolver is broken
    When the "clearance" policy is captured against the live resolvers
    And the capture is replayed
    Then the replay fails rather than denying

  Scenario: The clock changes the number and never the trace
    Given a simulated subject "alice" holding the permission "doc:read"
    When the "doc:read" policy is simulated under each clock
    Then both traces are identical
    And the deterministic run reports a duration of 0
