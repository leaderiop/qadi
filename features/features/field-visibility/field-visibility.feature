@field-visibility @REQ-QD-007
Feature: Field-level visibility

  A policy decides not only whether a subject may read a record, but which
  of its fields come back.

  Scenario: Union visibility merges the fields of every allowing branch
    Given a subject "quinn"
    And the subject has permission "doc:read"
    And the subject has permission "doc:meta"
    When a policy exposing fields "title" for "doc:read" and "author" for "doc:meta" is evaluated with union visibility
    Then access is granted
    And the visible fields are "title,author"

  Scenario: Only the allowing branch contributes its fields
    Given a subject "quinn"
    And the subject has permission "doc:read"
    When a policy exposing fields "title" for "doc:read" and "author" for "doc:meta" is evaluated with union visibility
    Then access is granted
    And the visible fields are "title"

  Scenario: A policy with no field restriction exposes everything
    Given a subject "quinn"
    And the subject has permission "doc:read"
    When they request permission "doc:read"
    Then access is granted
    And all fields are visible
