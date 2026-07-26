@labels @REQ-QD-013
Feature: Label dominance

  Bell-LaPadula as one stored policy: no read up, no write down. Dominance is a
  partial order, so two labels at the same level with different compartments are
  incomparable and neither may reach the other — which is exactly where a scalar
  comparison allows and dominance denies.

  Scenario: Reading down is permitted
    Given a subject "tariq" cleared at level 2
    And the resource "doc-1" classified at level 1
    And the caller is performing "read"
    When Bell-LaPadula is enforced
    Then access is granted

  Scenario: Reading up is refused
    Given a subject "tariq" cleared at level 1
    And the resource "doc-1" classified at level 2
    And the caller is performing "read"
    When Bell-LaPadula is enforced
    Then access is denied

  Scenario: Reading at your own level is permitted
    Given a subject "tariq" cleared at level 2
    And the resource "doc-1" classified at level 2
    And the caller is performing "read"
    When Bell-LaPadula is enforced
    Then access is granted

  Scenario: Writing up is permitted
    Given a subject "tariq" cleared at level 1
    And the resource "doc-1" classified at level 2
    And the caller is performing "write"
    When Bell-LaPadula is enforced
    Then access is granted

  Scenario: Writing down is refused
    Given a subject "tariq" cleared at level 2
    And the resource "doc-1" classified at level 1
    And the caller is performing "write"
    When Bell-LaPadula is enforced
    Then access is denied

  Scenario: Incomparable compartments refuse a read a scalar would allow
    Given a subject "tariq" cleared at level 2 in compartment "CRYPTO"
    And the resource "doc-1" classified at level 2 in compartment "BIO"
    And the caller is performing "read"
    When Bell-LaPadula is enforced
    Then access is denied

  Scenario: Incomparable compartments refuse the other direction too
    Given a subject "tariq" cleared at level 2 in compartment "BIO"
    And the resource "doc-1" classified at level 2 in compartment "CRYPTO"
    And the caller is performing "read"
    When Bell-LaPadula is enforced
    Then access is denied

  Scenario: A broader clearance reads a narrower document at the same level
    Given a subject "tariq" cleared at level 2 in compartments "CRYPTO,BIO"
    And the resource "doc-1" classified at level 2 in compartment "CRYPTO"
    And the caller is performing "read"
    When Bell-LaPadula is enforced
    Then access is granted

  Scenario: A subject with no clearance is denied, not errored
    Given a subject "tariq"
    And the resource "doc-1" classified at level 0
    And the caller is performing "read"
    When Bell-LaPadula is enforced
    Then access is denied
