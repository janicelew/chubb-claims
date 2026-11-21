package com.chubb.claims.notification;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * A message shown to the claimant ("Your claim has been approved").
 * In production this would also go out by email/SMS; here it is stored so the
 * claimant's screen can show it.
 */
@Entity
@Table(name = "notifications", indexes = @Index(name = "idx_notif_recipient", columnList = "recipientId,createdAt"))
public class Notification {

    @Id
    private UUID id;

    /** The Kafka event that caused this notification. Unique, so a re-delivered event can't create a duplicate. */
    @Column(nullable = false, unique = true)
    private UUID eventId;

    @Column(nullable = false)
    private String recipientId;

    @Column(nullable = false)
    private UUID claimId;

    @Column(nullable = false)
    private String claimNumber;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false)
    private Instant createdAt;

    protected Notification() {
    }

    public Notification(UUID eventId, String recipientId, UUID claimId, String claimNumber, String message) {
        this.id = UUID.randomUUID();
        this.eventId = eventId;
        this.recipientId = recipientId;
        this.claimId = claimId;
        this.claimNumber = claimNumber;
        this.message = message;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getEventId() { return eventId; }
    public String getRecipientId() { return recipientId; }
    public UUID getClaimId() { return claimId; }
    public String getClaimNumber() { return claimNumber; }
    public String getMessage() { return message; }
    public Instant getCreatedAt() { return createdAt; }
}
