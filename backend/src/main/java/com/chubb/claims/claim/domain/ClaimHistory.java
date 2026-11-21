package com.chubb.claims.claim.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Audit trail: one row per thing that happened to a claim. Written in the SAME
 * database transaction as the change itself, so the history can never disagree
 * with the claim. (This is why history is not driven by Kafka.)
 */
@Entity
@Table(name = "claim_history", indexes = @Index(name = "idx_history_claim", columnList = "claimId,occurredAt"))
public class ClaimHistory {

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID claimId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClaimEventType eventType;

    @Enumerated(EnumType.STRING)
    private ClaimStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClaimStatus toStatus;

    @Column(nullable = false)
    private String actorId;

    @Column(length = 2000)
    private String note;

    @Column(nullable = false)
    private Instant occurredAt;

    protected ClaimHistory() {
    }

    public ClaimHistory(UUID claimId, ClaimEventType eventType, ClaimStatus fromStatus,
                        ClaimStatus toStatus, String actorId, String note) {
        this.id = UUID.randomUUID();
        this.claimId = claimId;
        this.eventType = eventType;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.actorId = actorId;
        this.note = note;
        this.occurredAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getClaimId() { return claimId; }
    public ClaimEventType getEventType() { return eventType; }
    public ClaimStatus getFromStatus() { return fromStatus; }
    public ClaimStatus getToStatus() { return toStatus; }
    public String getActorId() { return actorId; }
    public String getNote() { return note; }
    public Instant getOccurredAt() { return occurredAt; }
}
