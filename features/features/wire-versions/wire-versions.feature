@wire-versions @REQ-QD-901
Feature: A decision record reads the same whichever wire version carried it

  A decision record leaves one process and is read by another: a devtools
  panel, an aggregator, a compliance review reading an audit row years later.
  The two may run different releases. The wire is versioned so that they can:
  a record written before the wire was versioned is read for good, a record
  whose outcome is ambiguous is refused rather than given one, and a record
  from a newer release is refused as unsupported rather than as malformed,
  because the fix is to upgrade the reader.

  Scenario: A record from an older process is read
    Given a failed decision record carried as wire version 1
    When the record is read
    Then it is read as the record that was sent

  Scenario: A record from this version is read
    Given a failed decision record carried as wire version 2
    When the record is read
    Then it is read as the record that was sent

  Scenario: A newer sender's extra envelope field is ignored
    Given a failed decision record carried as wire version 2
    And the sender added an envelope field "traceparent"
    When the record is read
    Then it is read as the record that was sent

  Scenario: A record naming both outcomes is refused, and no error is invented
    Given a decision record carried as wire version 1 naming both outcomes
    When the record is read
    Then it is refused as malformed, saying it "names both outcomes"

  Scenario: A record naming neither outcome is refused
    Given a decision record carried as wire version 1 naming neither outcome
    When the record is read
    Then it is refused as malformed, saying it "names no outcome"

  Scenario: A record of an unknown version is refused as unsupported, not as malformed
    Given a failed decision record carried as wire version 2
    And the sender marked it as wire version 3
    When the record is read
    Then it is refused as an unsupported version

  Scenario: An audit row written before the wire was versioned reads back through decodeAuditEntry
    Given an audit row written by an earlier release, whose error still carries its code
    When the audit row is read back
    Then it is read as the record that was sent

  Scenario: This version writes wire version 2, with the outcome as one tagged value
    Given a failed decision record
    When it is written
    Then the bytes are wire version 2, naming the outcome "Failed"
    And they read back as the record that was sent
