@hydration-counts @REQ-QD-028
Feature: Hydration accounts for every entry, and says when it seeds nothing

  A page that re-decides everything from scratch and a page with nothing to
  hydrate look exactly alike. That is the failure these scenarios are about:
  hydration had five exits by which an entry could be discarded and only one of
  them was ever announced, so "hydration isn't working" had no signal attached
  to it anywhere.

  Every entry is now counted at both ends, and every refusal names its reason —
  because a payload reaching the wrong client, an atom set that was never
  registered, an entry malformed apart from its policy, and a policy the
  client's schema cannot decode have four different fixes and one
  indistinguishable symptom.

  Scenario: Entries that make the trip are counted at both ends
    Given a server that decided 3 questions for "alice"
    When the payload is built and hydrated by "alice"
    Then 3 entries are counted as dehydrated
    And 3 entries are counted as seeded
    And nothing is counted as dropped

  Scenario: A payload mixing subjects loses the foreign entries, and says so
    Given a server that decided 2 questions for "alice"
    And one more decided for "bob"
    When the payload is built and hydrated by "alice"
    Then 2 entries are counted as dehydrated
    And 1 entry is counted as dropped for "ForeignSubject"

  Scenario: A payload reaching the wrong client seeds nothing and names the reason
    Given a server that decided 2 questions for "alice"
    When the payload is built and hydrated by "bob"
    Then nothing is seeded
    And 2 entries are counted as dropped for "PayloadSubjectMismatch"
    And the reported reason is "PayloadSubjectMismatch"

  Scenario: An atom set this package did not build is refused, not ignored
    Given a server that decided 1 question for "alice"
    When the payload is hydrated into an atom set built elsewhere
    Then nothing is seeded
    And the reported reason is "UnregisteredAtoms"

  Scenario: A policy the client cannot decode is dropped with its reason
    Given a payload for "alice" carrying 2 entries the client cannot decode
    When the payload is hydrated by "alice"
    Then nothing is seeded
    And 2 entries are counted as dropped for "UndecodablePolicy"
    And the reported reason is "UndecodablePolicy"

  Scenario: An entry malformed apart from its policy is dropped with its own reason
    Given a payload for "alice" carrying 2 entries the client cannot verify apart from their policy
    When the payload is hydrated by "alice"
    Then nothing is seeded
    And 2 entries are counted as dropped for "MalformedEntry"
    And the reported reason is "MalformedEntry"

  Scenario: Undecodable entries are reported once, not once each
    Given a payload for "alice" carrying 3 entries the client cannot decode
    When the payload is hydrated by "alice"
    Then exactly 1 refusal is reported

  Scenario: An entry that decodes is not held hostage to one that does not
    Given a server that decided 1 question for "alice"
    And the payload also carries 1 entry the client cannot decode
    When the payload is hydrated by "alice"
    Then 1 entry is counted as seeded
    And 1 entry is counted as dropped for "UndecodablePolicy"

  Scenario: An empty payload is not a fault
    Given a server that decided 0 questions for "alice"
    When the payload is built and hydrated by "alice"
    Then nothing is seeded
    And nothing is counted as dropped

  Scenario: Every reason is reported, including the ones that never fired
    When the hydration counts are read
    Then all 5 drop reasons appear
    And each reason carries a distinct explanation

  Scenario: The panel refuses a subtraction that would go negative
    Given a process that seeded 4 entries and built none
    Then no shortfall is reported
