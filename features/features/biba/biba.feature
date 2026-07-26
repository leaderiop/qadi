@biba @REQ-QD-020
Feature: Biba integrity

  The integrity dual of Bell-LaPadula. Same lattice, same dominance relation,
  same asymmetry between reading and writing — the arrows point the other way.
  Where Bell-LaPadula stops secrets flowing downwards, Biba stops corruption
  flowing upwards: read only at or above your level, write only at or below it.

  Nothing was built for this model. `@REQ-QD-013` proves the lattice and these
  scenarios prove the reading of it, which is why the whole feature is the
  Bell-LaPadula tree with the two operands exchanged.

  Scenario: A trusted producer writes downwards
    Given a producer "build-agent" at integrity level 3
    And the artefact "draft-notes" at integrity level 1
    And the caller is performing "write"
    When Biba is enforced
    Then access is granted

  Scenario: Writing upwards is refused
    Given a producer "contributor" at integrity level 1
    And the artefact "release-manifest" at integrity level 3
    And the caller is performing "write"
    When Biba is enforced
    Then access is denied
    And the denial is attributed to "no-write-up"

  Scenario: Reading downwards is refused, and this is the rule that bites
    # Strict Biba forbids the ordinary case rather than the exceptional one: a
    # trusted service may not read a request body, a build system may not read a
    # third-party dependency. The reason nobody deploys it unrelaxed.
    Given a producer "build-agent" at integrity level 3
    And the artefact "vendored-dependency" at integrity level 1
    And the caller is performing "read"
    When Biba is enforced
    Then access is denied
    And the denial is attributed to "no-read-down"
    And the denial is not attributed to "no-write-up"

  Scenario: Reading upwards is permitted
    # The exact inverse of Bell-LaPadula, where this is the refusal. Same two
    # labels, same matcher, opposite answer.
    Given a producer "contributor" at integrity level 1
    And the artefact "release-manifest" at integrity level 3
    And the caller is performing "read"
    When Biba is enforced
    Then access is granted

  Scenario: Acting at your own level is permitted, because dominance is reflexive
    Given a producer "reviewer" at integrity level 2
    And the artefact "reviewed-patch" at integrity level 2
    And the caller is performing "write"
    When Biba is enforced
    Then access is granted

  Scenario: Incomparable compartments refuse a write a scalar would allow
    # The whole reason E4 exists. On level alone 3 dominates 2 and the write is
    # allowed; with compartments neither label dominates the other, so it is
    # refused. A scalar approximation of this lattice is not a conservative
    # approximation — it grants.
    Given a producer "crypto-agent" at integrity level 3 in compartment "CRYPTO"
    And the artefact "bio-sample" at integrity level 2 in compartment "BIO"
    And the caller is performing "write"
    When Biba is enforced
    Then access is denied
    And the denial is attributed to "no-write-up"

  Scenario: A producer with no integrity label is denied, not errored
    # Absent resolved data has always denied. It is not a `MissingAction`, which
    # is a caller mistake; an unlabelled subject is a deployment that has not
    # finished, and the safe reading of it is no authority.
    Given a subject "unlabelled"
    And the artefact "release-manifest" at integrity level 3
    And the caller is performing "write"
    When Biba is enforced
    Then access is denied

  Scenario: Under a ring policy reading downwards is permitted
    # The relaxation that ships: Windows Mandatory Integrity Control enforces
    # no-write-up and drops no-read-down almost entirely.
    Given a producer "build-agent" at integrity level 3
    And the artefact "vendored-dependency" at integrity level 1
    And the caller is performing "read"
    When the ring policy is enforced
    Then access is granted

  Scenario: A ring policy still refuses a write upwards
    # Which is what makes it a relaxation rather than an abandonment. Nothing is
    # remembered, so this variant needs no history and no aggregate.
    Given a producer "contributor" at integrity level 1
    And the artefact "release-manifest" at integrity level 3
    And the caller is performing "write"
    When the ring policy is enforced
    Then access is denied
    And the denial is attributed to "ring.no-write-up"

  Scenario: An intact water mark permits the write
    Given a producer "build-agent" at integrity level 3
    And the attribute service resolves the effective integrity to level 3
    And the artefact "release-manifest" at integrity level 3
    And the caller is performing "write"
    When the low-water-mark policy is enforced
    Then access is granted

  Scenario: A lowered water mark refuses the same write
    # Identical to the scenario above in every respect except the level the
    # attribute service reports. Nothing about the producer, the artefact or the
    # action differs. That is the whole of "the mark drops to the lowest thing
    # you have read" — and it is a resolver answer, not a history one, because a
    # mark is a minimum over a set and the history port returns no value.
    Given a producer "build-agent" at integrity level 3
    And the attribute service resolves the effective integrity to level 1
    And the artefact "release-manifest" at integrity level 3
    And the caller is performing "write"
    When the low-water-mark policy is enforced
    Then access is denied
    And the denial is attributed to "lwm.no-write-up"

  Scenario: A static attribute shadows the water mark, and the write is granted
    # A HAZARD, asserted rather than described, and the grant below IS the defect.
    #
    # The producer carries a static `effectiveIntegrity` of 3 while the service
    # reports the lowered 1. Per BEH-QD-034 `HasAttribute` reads the subject's own
    # attributes first and calls the resolver only on a miss, so the static value
    # wins — and every write the mark should have refused is allowed. Compare the
    # scenario above: same resolver answer, opposite outcome.
    #
    # A caller maintaining a water mark must not also carry the attribute naming
    # it on the subject. This fails open, silently, and no error is raised.
    Given a producer "build-agent" at integrity level 3
    And the producer also carries a static effective integrity of level 3
    And the attribute service resolves the effective integrity to level 1
    And the artefact "release-manifest" at integrity level 3
    And the caller is performing "write"
    When the low-water-mark policy is enforced
    Then access is granted
