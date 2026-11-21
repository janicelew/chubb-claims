package com.chubb.claims.claim.repo;

import com.chubb.claims.claim.domain.ClaimHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClaimHistoryRepository extends JpaRepository<ClaimHistory, UUID> {

    List<ClaimHistory> findByClaimIdOrderByOccurredAtAsc(UUID claimId);
}
