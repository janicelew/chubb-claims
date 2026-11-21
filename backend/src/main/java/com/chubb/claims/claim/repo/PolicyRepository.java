package com.chubb.claims.claim.repo;

import com.chubb.claims.claim.domain.Policy;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyRepository extends JpaRepository<Policy, String> {

    List<Policy> findByHolderId(String holderId);
}
