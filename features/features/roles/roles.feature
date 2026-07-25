@roles @REQ-EG-003
Feature: Role-based access control

  Scenario: A subject holding the role is granted access
    Given a subject "grace"
    And the subject has role "editor"
    When they must hold role "editor"
    Then access is granted

  Scenario: A subject without the role is denied
    Given a subject "heidi"
    When they must hold role "editor"
    Then access is denied

  Scenario: Negation grants access to a subject lacking the role
    Given a subject "ivan"
    When they must not hold role "suspended"
    Then access is granted

  Scenario: Negation denies a subject holding the role
    Given a subject "judy"
    And the subject has role "suspended"
    When they must not hold role "suspended"
    Then access is denied
