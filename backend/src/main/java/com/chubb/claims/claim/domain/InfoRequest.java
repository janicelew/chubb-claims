package com.chubb.claims.claim.domain;

import com.chubb.claims.common.ConflictException;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** An officer's question to the claimant ("please send the police report"), and the answer. */
@Entity
@Table(name = "info_requests", indexes = @Index(name = "idx_info_claim", columnList = "claimId"))
public class InfoRequest {

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID claimId;

    @Column(nullable = false)
    private String requestedBy;

    @Column(nullable = false, length = 1000)
    private String question;

    @Column(length = 2000)
    private String response;

    @Column(nullable = false)
    private Instant requestedAt;

    private Instant respondedAt;

    protected InfoRequest() {
    }

    public InfoRequest(UUID claimId, String requestedBy, String question) {
        this.id = UUID.randomUUID();
        this.claimId = claimId;
        this.requestedBy = requestedBy;
        this.question = question;
        this.requestedAt = Instant.now();
    }

    public void answer(String response) {
        if (isAnswered()) {
            throw new ConflictException("This information request has already been answered");
        }
        this.response = response;
        this.respondedAt = Instant.now();
    }

    public boolean isAnswered() {
        return respondedAt != null;
    }

    public UUID getId() { return id; }
    public UUID getClaimId() { return claimId; }
    public String getRequestedBy() { return requestedBy; }
    public String getQuestion() { return question; }
    public String getResponse() { return response; }
    public Instant getRequestedAt() { return requestedAt; }
    public Instant getRespondedAt() { return respondedAt; }
}
