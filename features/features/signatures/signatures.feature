@signatures @REQ-QD-034
Feature: A captured signature answers the question it was captured for

  A signature captured while an obligation is discharged is recorded under the
  subject who signed and the resource the allow was decided for, so a later
  `hasSignature` check on that resource finds it, and no other check does.

  Scenario: A signature captured while approving a document answers that document
    Given a subject "alice"
    And the subject has permission "doc:approve"
    When they approve "doc-1" and a signature is captured
    Then the "approved" signature is on file for "doc-1"

  Scenario: It does not answer another document
    Given a subject "alice"
    And the subject has permission "doc:approve"
    When they approve "doc-1" and a signature is captured
    Then the "approved" signature is not on file for "doc-2"

  Scenario: It is not a subject-wide signature
    Given a subject "alice"
    And the subject has permission "doc:approve"
    When they approve "doc-1" and a signature is captured
    Then the "approved" signature is not on file for the subject at large
