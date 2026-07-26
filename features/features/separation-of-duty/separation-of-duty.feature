@separation-of-duty @REQ-QD-017
Feature: Separation of duty

  No one person should both raise a payment and approve it, because a single
  dishonest or compromised actor should not complete a consequential transaction
  alone.

  Two of the three forms are Qadi's. The object-based rule — "you may not approve
  what you raised" — is a comparison between a resource field and the subject's
  own identity. Detection of a subject wrongly given both roles is the second:
  Qadi cannot stop the assignment, but it can refuse to act on it.

  The third, preventing the assignment, happens where roles are granted. Qadi has
  no such surface and never sees an assignment, so that half is excluded rather
  than pending.

  Scenario: An approver may approve somebody else's payment
    Given the resource "pay-1" raised by "salma"
    And a subject "alice"
    And the subject has role "approve-payment"
    When the four-eyes approval policy is evaluated
    Then access is granted

  Scenario: Nobody approves what they raised
    Given the resource "pay-1" raised by "alice"
    And a subject "alice"
    And the subject has role "approve-payment"
    When the four-eyes approval policy is evaluated
    Then access is denied
    And the denial is attributed to "sod.object"

  Scenario: A subject holding both conflicting roles is refused
    Given the resource "pay-1" raised by "salma"
    And a subject "alice"
    And the subject has role "approve-payment"
    And the subject has role "raise-payment"
    When the four-eyes approval policy is evaluated
    Then access is denied
    And the denial is attributed to "sod.static"
    And the denial is not attributed to "sod.role"

  Scenario: The refusing branch is in the trace, not in the reason
    # A label never reaches `Decision.reason`. `Labeled` copies its child's
    # sentence verbatim into a field of its own, and the child here is a
    # negation — so the sentence a caller reads is "negated policy allowed",
    # which is accurate and useless on its own.
    #
    # The absence of `sod.object` is evidence too: `allOf` short-circuits at the
    # first refusal, so that branch was never evaluated.
    Given the resource "pay-1" raised by "salma"
    And a subject "alice"
    And the subject has role "approve-payment"
    And the subject has role "raise-payment"
    When the four-eyes approval policy is evaluated
    Then the denial reason mentions "negated policy allowed"
    And the denial is attributed to "sod.static"
    And the denial is not attributed to "sod.object"

  Scenario: Holding one role of the pair is not a conflict
    # `not(allOf([raise, approve]))` allows whenever either role is missing,
    # which is what mutual exclusion means. A raiser with no approver role is
    # refused by the role branch; the conflict branch has nothing to say.
    Given the resource "pay-1" raised by "salma"
    And a subject "alice"
    And the subject has role "raise-payment"
    When the four-eyes approval policy is evaluated
    Then access is denied
    And the denial is attributed to "sod.role"
    And the denial is not attributed to "sod.static"

  Scenario: An unrecorded raiser grants self-approval
    # The hazard, and the opposite of what this model's forecast predicted.
    # `eq(subjectId())` against an absent field is false, so the negation
    # GRANTS — and the row with no raiser recorded is exactly what a data
    # migration or a support script leaves behind.
    Given the resource "pay-1"
    And a subject "alice"
    And the subject has role "approve-payment"
    When the four-eyes approval policy is evaluated
    Then access is granted

  Scenario: Requiring the raiser to be recorded closes it
    Given the resource "pay-1"
    And a subject "alice"
    And the subject has role "approve-payment"
    When the four-eyes approval policy requiring a recorded raiser is evaluated
    Then access is denied
    And the denial is attributed to "sod.object"
