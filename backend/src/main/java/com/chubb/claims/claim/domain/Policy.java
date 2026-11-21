package com.chubb.claims.claim.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A policy a claimant holds. Claims are always made against a policy.
 * Policies are seeded at start-up (policy administration is out of scope).
 */
@Entity
@Table(name = "policies")
public class Policy {

    @Id
    private String policyNumber;

    @Column(nullable = false)
    private String holderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClaimType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Market market;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal coverLimit;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    protected Policy() {
    }

    public Policy(String policyNumber, String holderId, ClaimType type, Market market,
                  BigDecimal coverLimit, LocalDate startDate, LocalDate endDate) {
        this.policyNumber = policyNumber;
        this.holderId = holderId;
        this.type = type;
        this.market = market;
        this.coverLimit = coverLimit;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public boolean covers(LocalDate date) {
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }

    public String getPolicyNumber() { return policyNumber; }
    public String getHolderId() { return holderId; }
    public ClaimType getType() { return type; }
    public Market getMarket() { return market; }
    public BigDecimal getCoverLimit() { return coverLimit; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
}
