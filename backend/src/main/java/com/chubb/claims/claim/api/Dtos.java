package com.chubb.claims.claim.api;

import com.chubb.claims.claim.domain.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * The JSON shapes of the API: what the frontend sends and receives.
 * Entities are never returned directly, so the database model can change
 * without breaking the frontend contract.
 */
public final class Dtos {

    private Dtos() {
    }

    // ---- requests -------------------------------------------------------

    public record SubmitClaimRequest(
            @NotBlank String policyNumber,
            @NotNull @PastOrPresent LocalDate incidentDate,
            @NotBlank @Size(max = 2000) String description,
            @NotNull @Positive @Digits(integer = 12, fraction = 2) BigDecimal claimedAmount) {
    }

    public record AssignRequest(@NotBlank String officerId) {
    }

    public record ReserveRequest(@NotNull @PositiveOrZero @Digits(integer = 12, fraction = 2) BigDecimal amount) {
    }

    public record InfoRequestCreate(@NotBlank @Size(max = 1000) String question) {
    }

    public record InfoResponseRequest(@NotBlank @Size(max = 2000) String response) {
    }

    public record ApproveRequest(
            @NotNull @Positive @Digits(integer = 12, fraction = 2) BigDecimal amount,
            @NotBlank @Size(max = 1000) String reason) {
    }

    public record RejectRequest(@NotBlank @Size(max = 1000) String reason) {
    }

    // ---- responses ------------------------------------------------------

    public record ClaimResponse(
            UUID id,
            String claimNumber,
            String claimantId,
            String policyNumber,
            ClaimType type,
            Market market,
            LocalDate incidentDate,
            String description,
            BigDecimal claimedAmount,
            BigDecimal reserveAmount,
            BigDecimal approvedAmount,
            ClaimStatus status,
            String assignedOfficerId,
            String decisionReason,
            Instant createdAt,
            Instant updatedAt) {

        public static ClaimResponse from(Claim c) {
            return new ClaimResponse(c.getId(), c.getClaimNumber(), c.getClaimantId(),
                    c.getPolicy().getPolicyNumber(), c.getType(), c.getMarket(), c.getIncidentDate(),
                    c.getDescription(), c.getClaimedAmount(), c.getReserveAmount(), c.getApprovedAmount(),
                    c.getStatus(), c.getAssignedOfficerId(), c.getDecisionReason(), c.getCreatedAt(), c.getUpdatedAt());
        }
    }

    public record HistoryResponse(ClaimEventType eventType, ClaimStatus fromStatus, ClaimStatus toStatus,
                                  String actorId, String note, Instant occurredAt) {

        public static HistoryResponse from(ClaimHistory h) {
            return new HistoryResponse(h.getEventType(), h.getFromStatus(), h.getToStatus(),
                    h.getActorId(), h.getNote(), h.getOccurredAt());
        }
    }

    public record InfoRequestResponse(UUID id, String question, String response,
                                      Instant requestedAt, Instant respondedAt) {

        public static InfoRequestResponse from(InfoRequest r) {
            return new InfoRequestResponse(r.getId(), r.getQuestion(), r.getResponse(),
                    r.getRequestedAt(), r.getRespondedAt());
        }
    }

    public record PolicyResponse(String policyNumber, ClaimType type, Market market,
                                 BigDecimal coverLimit, LocalDate startDate, LocalDate endDate) {

        public static PolicyResponse from(Policy p) {
            return new PolicyResponse(p.getPolicyNumber(), p.getType(), p.getMarket(),
                    p.getCoverLimit(), p.getStartDate(), p.getEndDate());
        }
    }
}
