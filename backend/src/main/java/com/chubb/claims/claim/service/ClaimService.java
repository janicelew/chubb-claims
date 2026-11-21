package com.chubb.claims.claim.service;

import com.chubb.claims.claim.domain.*;
import com.chubb.claims.claim.repo.ClaimHistoryRepository;
import com.chubb.claims.claim.repo.ClaimRepository;
import com.chubb.claims.claim.repo.InfoRequestRepository;
import com.chubb.claims.claim.repo.PolicyRepository;
import com.chubb.claims.common.BusinessRuleException;
import com.chubb.claims.common.ForbiddenException;
import com.chubb.claims.common.NotFoundException;
import com.chubb.claims.events.ClaimEvent;
import com.chubb.claims.security.CurrentUser;
import com.chubb.claims.security.Role;
import com.chubb.claims.staff.StaffMember;
import com.chubb.claims.staff.StaffRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * All claim use-cases live here. Each public method is one database transaction:
 *   1. load the claim and check the caller is allowed
 *   2. call the domain method (which enforces the lifecycle rules)
 *   3. write a history row (same transaction)
 *   4. raise a ClaimEvent, which is sent to Kafka only AFTER the transaction commits
 */
@Service
@Transactional
public class ClaimService {

    private final ClaimRepository claims;
    private final PolicyRepository policies;
    private final ClaimHistoryRepository history;
    private final InfoRequestRepository infoRequests;
    private final StaffRepository staff;
    private final ApplicationEventPublisher events;

    public ClaimService(ClaimRepository claims, PolicyRepository policies, ClaimHistoryRepository history,
                        InfoRequestRepository infoRequests, StaffRepository staff, ApplicationEventPublisher events) {
        this.claims = claims;
        this.policies = policies;
        this.history = history;
        this.infoRequests = infoRequests;
        this.staff = staff;
        this.events = events;
    }

    // ---- claimant -------------------------------------------------------

    public Claim submit(CurrentUser user, String policyNumber, LocalDate incidentDate,
                        String description, BigDecimal claimedAmount) {
        user.requireClaimant();
        Policy policy = policies.findById(policyNumber)
                .orElseThrow(() -> new NotFoundException("Policy " + policyNumber + " not found"));
        Claim claim = claims.save(Claim.submit(user.id(), policy, incidentDate, description, claimedAmount));
        record(claim, ClaimEventType.CLAIM_SUBMITTED, null, user.id(), null);
        return claim;
    }

    @Transactional(readOnly = true)
    public List<Claim> claimsOf(CurrentUser user) {
        user.requireClaimant();
        return claims.findByClaimantIdOrderByCreatedAtDesc(user.id());
    }

    @Transactional(readOnly = true)
    public List<Policy> policiesOf(CurrentUser user) {
        user.requireClaimant();
        return policies.findByHolderId(user.id());
    }

    public Claim answerInfoRequest(CurrentUser user, UUID claimId, UUID requestId, String response) {
        user.requireClaimant();
        Claim claim = load(claimId);
        checkCanView(user, claim);
        InfoRequest request = infoRequests.findById(requestId)
                .filter(r -> r.getClaimId().equals(claimId))
                .orElseThrow(() -> new NotFoundException("Information request not found"));
        request.answer(response);

        // Only go back to review once every open question has been answered.
        boolean allAnswered = infoRequests.findByClaimIdOrderByRequestedAtAsc(claimId).stream()
                .allMatch(InfoRequest::isAnswered);
        if (allAnswered && claim.getStatus() == ClaimStatus.INFO_REQUESTED) {
            ClaimStatus from = claim.getStatus();
            claim.infoProvided();
            record(claim, ClaimEventType.INFO_PROVIDED, from, user.id(), response);
        }
        return claim;
    }

    // ---- shared reads ---------------------------------------------------

    @Transactional(readOnly = true)
    public Claim get(CurrentUser user, UUID claimId) {
        Claim claim = load(claimId);
        checkCanView(user, claim);
        return claim;
    }

    @Transactional(readOnly = true)
    public List<ClaimHistory> historyOf(CurrentUser user, UUID claimId) {
        get(user, claimId);
        return history.findByClaimIdOrderByOccurredAtAsc(claimId);
    }

    @Transactional(readOnly = true)
    public List<InfoRequest> infoRequestsOf(CurrentUser user, UUID claimId) {
        get(user, claimId);
        return infoRequests.findByClaimIdOrderByRequestedAtAsc(claimId);
    }

    // ---- staff ----------------------------------------------------------

    /** New claims nobody has picked up yet, oldest first. */
    @Transactional(readOnly = true)
    public List<Claim> unassignedQueue(CurrentUser user) {
        user.requireStaff();
        return claims.findByStatusOrderByCreatedAtAsc(ClaimStatus.SUBMITTED);
    }

    /** The caller's own open claims, least recently touched first. */
    @Transactional(readOnly = true)
    public List<Claim> myOpenClaims(CurrentUser user) {
        user.requireStaff();
        return claims.findByAssignedOfficerIdAndStatusInOrderByUpdatedAtAsc(user.id(), ClaimStatus.openStatuses());
    }

    /**
     * Every open claim, oldest first, optionally narrowed to one officer, market and/or claim type.
     * This is what a manager needs to look behind the dashboard numbers: which claims make up an
     * officer's workload or a market's exposure.
     */
    @Transactional(readOnly = true)
    public List<Claim> openClaims(CurrentUser user, String officerId, Market market, ClaimType type) {
        user.requireStaff();
        return claims.findByStatusIn(ClaimStatus.openStatuses()).stream()
                .filter(c -> officerId == null || officerId.equals(c.getAssignedOfficerId()))
                .filter(c -> market == null || c.getMarket() == market)
                .filter(c -> type == null || c.getType() == type)
                .sorted(Comparator.comparing(Claim::getCreatedAt))
                .toList();
    }

    /**
     * Officers may only "pick up" a claim for themselves, and only if nobody else has it.
     * Moving a claim from one officer to another is a manager decision.
     */
    public Claim assign(CurrentUser user, UUID claimId, String officerId) {
        user.requireStaff();
        if (user.role() == Role.OFFICER && !user.id().equals(officerId)) {
            throw new ForbiddenException("Officers can only assign claims to themselves");
        }
        StaffMember officer = staff.findById(officerId)
                .filter(s -> s.getRole() == Role.OFFICER)
                .orElseThrow(() -> new BusinessRuleException(officerId + " is not a claims officer"));
        Claim claim = load(claimId);
        String currentOwner = claim.getAssignedOfficerId();
        if (user.role() == Role.OFFICER && currentOwner != null && !currentOwner.equals(user.id())) {
            throw new ForbiddenException("Claim " + claim.getClaimNumber()
                    + " is already assigned to another officer. Ask a manager to reassign it.");
        }
        ClaimStatus from = claim.getStatus();
        claim.assignTo(officer.getId());
        record(claim, ClaimEventType.CLAIM_ASSIGNED, from, user.id(), "Assigned to " + officer.getName());
        return claim;
    }

    public Claim startReview(CurrentUser user, UUID claimId) {
        Claim claim = loadForAction(user, claimId);
        ClaimStatus from = claim.getStatus();
        claim.startReview();
        record(claim, ClaimEventType.REVIEW_STARTED, from, user.id(), null);
        return claim;
    }

    public Claim setReserve(CurrentUser user, UUID claimId, BigDecimal amount) {
        Claim claim = loadForAction(user, claimId);
        claim.setReserve(amount);
        record(claim, ClaimEventType.RESERVE_CHANGED, claim.getStatus(), user.id(), "Reserve set to " + amount);
        return claim;
    }

    public Claim requestInfo(CurrentUser user, UUID claimId, String question) {
        Claim claim = loadForAction(user, claimId);
        ClaimStatus from = claim.getStatus();
        claim.requestInfo();
        infoRequests.save(new InfoRequest(claimId, user.id(), question));
        record(claim, ClaimEventType.INFO_REQUESTED, from, user.id(), question);
        return claim;
    }

    public Claim approve(CurrentUser user, UUID claimId, BigDecimal amount, String reason) {
        Claim claim = loadForAction(user, claimId);
        ClaimStatus from = claim.getStatus();
        claim.approve(amount, reason);
        record(claim, ClaimEventType.CLAIM_APPROVED, from, user.id(), reason);
        return claim;
    }

    public Claim reject(CurrentUser user, UUID claimId, String reason) {
        Claim claim = loadForAction(user, claimId);
        ClaimStatus from = claim.getStatus();
        claim.reject(reason);
        record(claim, ClaimEventType.CLAIM_REJECTED, from, user.id(), reason);
        return claim;
    }

    public Claim settle(CurrentUser user, UUID claimId) {
        Claim claim = loadForAction(user, claimId);
        ClaimStatus from = claim.getStatus();
        claim.settle();
        record(claim, ClaimEventType.CLAIM_SETTLED, from, user.id(), "Paid " + claim.getApprovedAmount());
        return claim;
    }

    // ---- helpers --------------------------------------------------------

    private Claim load(UUID claimId) {
        return claims.findById(claimId).orElseThrow(() -> new NotFoundException("Claim " + claimId + " not found"));
    }

    /** Staff can see every claim; a claimant can only see their own. */
    private void checkCanView(CurrentUser user, Claim claim) {
        if (user.role() == Role.CLAIMANT && !claim.getClaimantId().equals(user.id())) {
            // 404 rather than 403, so claimants can't probe which claim IDs exist.
            throw new NotFoundException("Claim " + claim.getId() + " not found");
        }
    }

    /** Only the assigned officer (or a manager) may progress a claim. */
    private Claim loadForAction(CurrentUser user, UUID claimId) {
        user.requireStaff();
        Claim claim = load(claimId);
        if (user.role() == Role.OFFICER && !user.id().equals(claim.getAssignedOfficerId())) {
            throw new ForbiddenException("Claim " + claim.getClaimNumber() + " is not assigned to you");
        }
        return claim;
    }

    private void record(Claim claim, ClaimEventType type, ClaimStatus from, String actorId, String note) {
        history.save(new ClaimHistory(claim.getId(), type, from, claim.getStatus(), actorId, note));
        events.publishEvent(ClaimEvent.of(claim, type, from, actorId, note));
    }
}
