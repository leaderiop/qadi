@permissions @composition @REQ-EG-002
Feature: Composing policies

  Scenario: allOf requires every permission
    Given a subject "dave"
    And the subject has permission "doc:read"
    When they must satisfy all of "doc:read,doc:write"
    Then access is denied

  Scenario: allOf is satisfied when every permission is held
    Given a subject "dave"
    And the subject has permission "doc:read"
    And the subject has permission "doc:write"
    When they must satisfy all of "doc:read,doc:write"
    Then access is granted

  Scenario: anyOf needs only one permission
    Given a subject "eve"
    And the subject has permission "doc:read"
    When they must satisfy any of "doc:read,doc:write"
    Then access is granted

  Scenario: anyOf denies when no alternative is held
    Given a subject "frank"
    When they must satisfy any of "doc:read,doc:write"
    Then access is denied
