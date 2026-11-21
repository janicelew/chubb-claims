package com.chubb.claims.events;

import com.chubb.claims.claim.domain.Claim;
import com.chubb.claims.claim.domain.ClaimEventType;
import com.chubb.claims.claim.domain.ClaimStatus;
import com.chubb.claims.claim.domain.ClaimType;
import com.chubb.claims.claim.domain.Market;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * The message posted to Kafka (topic "claim-events") whenever something happens to a claim.
 * It carries enough data that listeners don't need to call back into the claims API.
 * eventId lets listeners ignore duplicates (Kafka can deliver a message more than once).
 */
public record ClaimEvent(
        UUID eventId,
        ClaimEventType eventType,
        UUID claimId,
        String claimNumber,
        String claimantId,
        Market market,
        ClaimType claimType,
        ClaimStatus fromStatus,
        ClaimStatus toStatus,
        BigDecimal reserveAmount,
        String actorId,
        String note,
        Instant occurredAt) {

    public static ClaimEvent of(Claim claim, ClaimEventType type, ClaimStatus from, String actorId, String note) {
        return new ClaimEvent(UUID.randomUUID(), type, claim.getId(), claim.getClaimNumber(),
                claim.getClaimantId(), claim.getMarket(), claim.getType(), from, claim.getStatus(),
                claim.getReserveAmount(), actorId, note, Instant.now());
    }
}
