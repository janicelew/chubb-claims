package com.chubb.claims.claim.domain;

import com.chubb.claims.common.BusinessRuleException;
import com.chubb.claims.common.ConflictException;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * The central entity. All status changes go through the methods below, which
 * check the lifecycle rules in {@link ClaimStatus}. Nothing outside this class
 * sets the status directly.
 */
@Entity
@Table(name = "claims", indexes = {
        @Index(name = "idx_claims_claimant", columnList = "claimantId"),
        @Index(name = "idx_claims_officer_status", columnList = "assignedOfficerId,status")
})
public class Claim {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String claimNumber;

    @Column(nullable = false)
    private String claimantId;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "policy_number")
    private Policy policy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClaimType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Market market;

    @Column(nullable = false)
    private LocalDate incidentDate;

    @Column(nullable = false, length = 2000)
    private String description;

    /** What the claimant says the loss is worth. */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal claimedAmount;

    /**
     * The officer's current estimate of what Chubb will pay. Insurers call this
     * the "reserve". The sum of reserves on open claims is the liability exposure.
     */
    @Column(precision = 14, scale = 2)
    private BigDecimal reserveAmount;

    @Column(precision = 14, scale = 2)
    private BigDecimal approvedAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClaimStatus status;

    private String assignedOfficerId;

    @Column(length = 1000)
    private String decisionReason;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    /**
     * Optimistic locking: if two officers try to change the same claim at the
     * same time, the second save fails instead of silently overwriting the first.
     */
    @Version
    private Long version; // null = not saved yet, so Spring Data knows to INSERT

    protected Claim() {
    }

    public static Claim submit(String claimantId, Policy policy, LocalDate incidentDate,
                               String description, BigDecimal claimedAmount) {
        if (!policy.getHolderId().equals(claimantId)) {
            throw new BusinessRuleException("Policy " + policy.getPolicyNumber() + " does not belong to this claimant");
        }
        if (incidentDate.isAfter(LocalDate.now())) {
            throw new BusinessRuleException("Incident date cannot be in the future");
        }
        if (!policy.covers(incidentDate)) {
            throw new BusinessRuleException("Incident date is outside the policy period");
        }
        Claim c = new Claim();
        c.id = UUID.randomUUID();
        c.claimNumber = "CLM-" + policy.getMarket() + "-" + c.id.toString().substring(0, 8).toUpperCase();
        c.claimantId = claimantId;
        c.policy = policy;
        c.type = policy.getType();
        c.market = policy.getMarket();
        c.incidentDate = incidentDate;
        c.description = description;
        c.claimedAmount = claimedAmount;
        c.status = ClaimStatus.SUBMITTED;
        c.createdAt = Instant.now();
        c.updatedAt = c.createdAt;
        return c;
    }

    // ---- lifecycle -------------------------------------------------------

    public void assignTo(String officerId) {
        if (status == ClaimStatus.SUBMITTED) {
            moveTo(ClaimStatus.ASSIGNED);
        } else if (!status.isOpen()) {
            throw new ConflictException("Cannot reassign a closed claim");
        }
        // Reassigning an open claim keeps its status, only the owner changes.
        this.assignedOfficerId = officerId;
        touch();
    }

    public void startReview() {
        moveTo(ClaimStatus.UNDER_REVIEW);
    }

    public void requestInfo() {
        moveTo(ClaimStatus.INFO_REQUESTED);
    }

    /** Called when the claimant has answered every open information request. */
    public void infoProvided() {
        moveTo(ClaimStatus.UNDER_REVIEW);
    }

    public void setReserve(BigDecimal amount) {
        if (status == ClaimStatus.SUBMITTED || !status.isOpen() || status == ClaimStatus.APPROVED) {
            throw new ConflictException("Reserve can only be set while the claim is being assessed (status is " + status + ")");
        }
        this.reserveAmount = amount;
        touch();
    }

    public void approve(BigDecimal amount, String reason) {
        if (amount.compareTo(policy.getCoverLimit()) > 0) {
            throw new BusinessRuleException("Approved amount exceeds the policy cover limit of " + policy.getCoverLimit());
        }
        moveTo(ClaimStatus.APPROVED);
        this.approvedAmount = amount;
        this.reserveAmount = amount; // the exposure is now exactly what we've agreed to pay
        this.decisionReason = reason;
    }

    public void reject(String reason) {
        moveTo(ClaimStatus.REJECTED);
        this.reserveAmount = BigDecimal.ZERO; // no longer any liability
        this.decisionReason = reason;
    }

    public void settle() {
        moveTo(ClaimStatus.SETTLED);
        this.reserveAmount = BigDecimal.ZERO; // paid out, nothing outstanding
    }

    private void moveTo(ClaimStatus next) {
        if (!status.canMoveTo(next)) {
            throw new ConflictException("Claim " + claimNumber + " cannot move from " + status + " to " + next);
        }
        this.status = next;
        touch();
    }

    private void touch() {
        this.updatedAt = Instant.now();
    }

    // ---- getters ---------------------------------------------------------

    public UUID getId() { return id; }
    public String getClaimNumber() { return claimNumber; }
    public String getClaimantId() { return claimantId; }
    public Policy getPolicy() { return policy; }
    public ClaimType getType() { return type; }
    public Market getMarket() { return market; }
    public LocalDate getIncidentDate() { return incidentDate; }
    public String getDescription() { return description; }
    public BigDecimal getClaimedAmount() { return claimedAmount; }
    public BigDecimal getReserveAmount() { return reserveAmount; }
    public BigDecimal getApprovedAmount() { return approvedAmount; }
    public ClaimStatus getStatus() { return status; }
    public String getAssignedOfficerId() { return assignedOfficerId; }
    public String getDecisionReason() { return decisionReason; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}
