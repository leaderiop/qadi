@permissions @REQ-EG-001
Feature: Permission-based access control

  A subject is granted access when it holds the requested permission.

  Scenario: A subject holding the permission is granted access
    Given a subject "alice"
    And the subject has permission "doc:read"
    When they request permission "doc:read"
    Then access is granted

  Scenario: A subject without the permission is denied
    Given a subject "bob"
    And the subject has no permissions
    When they request permission "doc:read"
    Then access is denied

  Scenario: A denial explains which permission was missing
    Given a subject "bob"
    When they request permission "doc:write"
    Then access is denied
    And the denial reason mentions "doc:write"

  Scenario: A different action on the same resource does not grant access
    Given a subject "carol"
    And the subject has permission "doc:read"
    When they request permission "doc:write"
    Then access is denied
