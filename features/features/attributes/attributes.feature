@attributes @REQ-EG-004
Feature: Attribute-based access control

  Attributes already on the subject are used directly; anything else is
  resolved on demand, at the node that needs it.

  Scenario: An attribute carried by the subject satisfies the policy
    Given a subject "ken"
    And the subject has attribute "clearance" of 5
    When they must have attribute "clearance" of at least 3
    Then access is granted

  Scenario: An insufficient attribute denies access
    Given a subject "lena"
    And the subject has attribute "clearance" of 1
    When they must have attribute "clearance" of at least 3
    Then access is denied

  Scenario: A missing attribute is fetched from the attribute service
    Given a subject "mallory"
    And the attribute service resolves "clearance" to 7
    When they must have attribute "clearance" of at least 3
    Then access is granted

  Scenario: An attribute known to neither source denies access
    Given a subject "niaj"
    When they must have attribute "clearance" of at least 3
    Then access is denied
