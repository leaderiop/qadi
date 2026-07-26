@attributes @identity @REQ-QD-009
Feature: Ownership by subject identity

  "The resource's owner is me" is the archetypal relational rule. It compares a
  resource attribute against the subject's own identifier, which is a different
  thing from the subject's attributes — and until `subjectId()` existed it could
  not be said at all: the comparison resolved to nothing and denied silently.

  Scenario: The owner is the subject
    Given a subject "rupert"
    And the resource "doc-1" owned by "rupert"
    When the resource must be owned by the subject
    Then access is granted

  Scenario: The owner is somebody else
    Given a subject "rupert"
    And the resource "doc-1" owned by "hilda"
    When the resource must be owned by the subject
    Then access is denied

  Scenario: Identity is not an attribute
    # A subject whose "id" attribute differs from its identity. The rule must
    # follow the identity, not the attribute that happens to share its name —
    # otherwise anyone able to set their own attributes could claim ownership
    # of anything.
    Given a subject "rupert"
    And the subject has attribute "id" of "hilda"
    And the resource "doc-1" owned by "hilda"
    When the resource must be owned by the subject
    Then access is denied

  Scenario: Ownership survives storage
    # Policies are persisted and reloaded. A stored ownership rule that came
    # back meaning something else is the defect class this library was
    # rewritten to make unrepresentable.
    Given a subject "rupert"
    And the resource "doc-1" owned by "rupert"
    When the ownership policy is round-tripped and evaluated
    Then access is granted
