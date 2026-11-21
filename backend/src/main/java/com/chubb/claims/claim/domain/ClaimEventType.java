package com.chubb.claims.claim.domain;

/** Things that can happen to a claim. Used for both the audit history and the Kafka events. */
public enum ClaimEventType {
    CLAIM_SUBMITTED,
    CLAIM_ASSIGNED,
    REVIEW_STARTED,
    RESERVE_CHANGED,
    INFO_REQUESTED,
    INFO_PROVIDED,
    CLAIM_APPROVED,
    CLAIM_REJECTED,
    CLAIM_SETTLED
}
