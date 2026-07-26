@subject-sets @REQ-QD-014
Feature: Subject-set review

  The transpose of filtering resources: one policy across many subjects,
  answering "who can reach this?" — the question an access review, a sharing
  dialog and a leak investigation all ask.

  No scenario here names a current subject, and that is deliberate. A review
  query is asked by nobody: the answer is about a set of people, and none of
  them, nor anyone else, is making the request.

  Scenario: Who may read this resource
    Given the candidate "alice" with role "auditor"
    And the candidate "bob"
    And the candidate "carol" with role "auditor"
    When it is asked who holds role "auditor"
    Then the answer is "alice, carol"

  Scenario: The answer keeps the order it was asked in
    Given the candidate "zoe" with role "auditor"
    And the candidate "adam"
    And the candidate "mia" with role "auditor"
    When it is asked who holds role "auditor"
    Then the answer is "zoe, mia"

  Scenario: A candidate listed twice is answered twice
    Given the candidate "alice" with role "auditor"
    And the candidate "alice" with role "auditor"
    When it is asked who holds role "auditor"
    Then the answer is "alice, alice"

  Scenario: Nobody qualifying is an empty answer, not a failure
    Given the candidate "bob"
    And the candidate "carol"
    When it is asked who holds role "auditor"
    Then the answer is empty

  Scenario: Each candidate is judged on what they hold
    Given the candidate "alice" with permission "doc:read"
    And the candidate "bob" with role "auditor"
    When it is asked who holds role "auditor"
    Then the answer is "bob"

  Scenario: The review explains a refusal
    Given the candidate "bob"
    When the review asks who holds role "auditor"
    Then "bob" was refused because of "auditor"

  Scenario: The review names every candidate, refused ones included
    Given the candidate "alice" with role "auditor"
    And the candidate "bob"
    When the review asks who holds role "auditor"
    Then the review covers "alice, bob"

  Scenario: Ownership is resolved against each candidate in turn
    Given the resource "doc-1" owned by "carol"
    And the candidate "bob"
    And the candidate "carol"
    When it is asked who owns the resource
    Then the answer is "carol"

  Scenario: A duty does not remove a candidate from the answer
    Given the candidate "alice" with role "auditor"
    And the candidate "bob"
    When it is asked who holds role "auditor", where holding it would log the access
    Then the answer is "alice"
    And "alice" owes "log-access"
