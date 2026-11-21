package com.chubb.claims.claim.repo;

import com.chubb.claims.claim.domain.InfoRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InfoRequestRepository extends JpaRepository<InfoRequest, UUID> {

    List<InfoRequest> findByClaimIdOrderByRequestedAtAsc(UUID claimId);
}
