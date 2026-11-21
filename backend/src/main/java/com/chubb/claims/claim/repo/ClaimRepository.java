package com.chubb.claims.claim.repo;

import com.chubb.claims.claim.domain.Claim;
import com.chubb.claims.claim.domain.ClaimStatus;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClaimRepository extends JpaRepository<Claim, UUID> {

    List<Claim> findByClaimantIdOrderByCreatedAtDesc(String claimantId);

    List<Claim> findByStatusOrderByCreatedAtAsc(ClaimStatus status);

    List<Claim> findByAssignedOfficerIdAndStatusInOrderByUpdatedAtAsc(String officerId, Collection<ClaimStatus> statuses);

    List<Claim> findByStatusIn(Collection<ClaimStatus> statuses);
}
