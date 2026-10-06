@wire-versions @REQ-QD-032
Feature: A decision record is read from wire version 2, and refused from any other

  A decision record leaves one process and is read by another: a devtools
  panel, an aggregator, a compliance review reading an audit row later. The
  two may run different releases, so the wire is versioned and a reader says
  which version it was handed. Since 0.11.0 one version is read: version 2. A
  record written before 0.10 — version 1, with no version at all — is refused
  as an unsupported version and never upgraded, because the fix is to
  re-encode it with 0.10.x or upgrade its sender. A record from a newer
  release is refused the same way, because the fix is to upgrade the reader.
  Neither is refused as malformed, and no record is given an outcome or a
  subject its sender did not send.

  Scenario: A record from this version is read
    Given a failed decision record carried as wire version 2
    When the record is read
    Then it is read as the record that was sent

  Scenario: A newer sender's extra envelope field is ignored
    Given a failed decision record carried as wire version 2
    And the sender added an envelope field "traceparent"
    When the record is read
    Then it is read as the record that was sent

  Scenario: A record written before 0.10 is refused as an unsupported version, never upgraded
    Given a failed decision record carried as wire version 1
    When the record is read
    Then it is refused as an unsupported version, naming no version

  Scenario: A record written before 0.10 naming both outcomes is refused before any outcome is read
    Given a decision record carried as wire version 1 naming both outcomes
    When the record is read
    Then it is refused as an unsupported version, naming no version

  Scenario: A record naming no outcome is refused, and no error is invented
    Given a decision record carried as wire version 2 naming no outcome
    When the record is read
    Then it is refused as malformed, naming "outcome"

  Scenario: A record of an unknown version is refused as unsupported, not as malformed
    Given a failed decision record carried as wire version 2
    And the sender marked it as wire version 3
    When the record is read
    Then it is refused as an unsupported version

  Scenario: An audit row written before 0.10 is refused by decodeAuditEntry as an unsupported version
    Given an audit row written by an earlier release, whose error still carries its code
    When the audit row is read back
    Then it is refused as an unsupported version, naming no version

  Scenario: An audit row of wire version 2 reads back through decodeAuditEntry
    Given an audit row whose record is wire version 2
    When the audit row is read back
    Then it is read as the record that was sent

  Scenario: This version writes wire version 2, with the outcome as one tagged value
    Given a failed decision record
    When it is written
    Then the bytes are wire version 2, naming the outcome "Failed"
    And they read back as the record that was sent
