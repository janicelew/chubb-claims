package com.chubb.claims.claim.domain;

import java.util.EnumSet;
import java.util.Set;

/**
 * The claim lifecycle. Each status lists the statuses it is allowed to move to.
 * Keeping the rules here (and nowhere else) means no controller or service can
 * accidentally skip a step, e.g. SUBMITTED straight to SETTLED.
 *
 *   SUBMITTED -> ASSIGNED -> UNDER_REVIEW <-> INFO_REQUESTED
 *                                 |
 *                                 +-> APPROVED -> SETTLED
 *                                 +-> REJECTED
 */
public enum ClaimStatus {
    SUBMITTED,
    ASSIGNED,
    UNDER_REVIEW,
    INFO_REQUESTED,
    APPROVED,
    SETTLED,
    REJECTED;

    public Set<ClaimStatus> allowedNext() {
        return switch (this) {
            case SUBMITTED -> EnumSet.of(ASSIGNED);
            case ASSIGNED -> EnumSet.of(UNDER_REVIEW);
            case UNDER_REVIEW -> EnumSet.of(INFO_REQUESTED, APPROVED, REJECTED);
            case INFO_REQUESTED -> EnumSet.of(UNDER_REVIEW);
            case APPROVED -> EnumSet.of(SETTLED);
            case SETTLED, REJECTED -> EnumSet.noneOf(ClaimStatus.class);
        };
    }

    public boolean canMoveTo(ClaimStatus next) {
        return allowedNext().contains(next);
    }

    /** Open claims are the ones that still carry liability exposure. */
    public boolean isOpen() {
        return this != SETTLED && this != REJECTED;
    }

    public static Set<ClaimStatus> openStatuses() {
        return EnumSet.of(SUBMITTED, ASSIGNED, UNDER_REVIEW, INFO_REQUESTED, APPROVED);
    }
}
