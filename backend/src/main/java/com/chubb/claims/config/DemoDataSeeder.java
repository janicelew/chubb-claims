package com.chubb.claims.config;

import com.chubb.claims.claim.domain.ClaimType;
import com.chubb.claims.claim.domain.Market;
import com.chubb.claims.claim.domain.Policy;
import com.chubb.claims.claim.repo.PolicyRepository;
import com.chubb.claims.security.Role;
import com.chubb.claims.staff.StaffMember;
import com.chubb.claims.staff.StaffRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Seeds demo users and policies on first start so the app can be tried straight away.
 * Policy admin and user management are out of scope for this assessment.
 *
 * Demo users (send as X-User-Id / X-User-Role headers):
 *   C-1001, C-1002, C-1003   CLAIMANT
 *   O-01, O-02, O-03         OFFICER
 *   M-01                     MANAGER
 */
@Configuration
@ConditionalOnProperty(name = "claims.seed-demo-data", havingValue = "true")
public class DemoDataSeeder {

    @Bean
    ApplicationRunner seed(StaffRepository staff, PolicyRepository policies) {
        return args -> {
            if (staff.count() > 0) {
                return; // already seeded
            }
            staff.saveAll(List.of(
                    new StaffMember("O-01", "Mei Ling Tan", Role.OFFICER),
                    new StaffMember("O-02", "Raj Kumar", Role.OFFICER),
                    new StaffMember("O-03", "Tom Wong", Role.OFFICER),
                    new StaffMember("M-01", "Sarah Lim", Role.MANAGER)));

            // Policies run from 6 months ago to 6 months ahead, so demo incident dates are always covered.
            LocalDate start = LocalDate.now().minusMonths(6);
            LocalDate end = LocalDate.now().plusMonths(6);
            policies.saveAll(List.of(
                    new Policy("POL-MY-M-0001", "C-1001", ClaimType.MOTOR, Market.MY, new BigDecimal("80000.00"), start, end),
                    new Policy("POL-MY-P-0002", "C-1001", ClaimType.PROPERTY, Market.MY, new BigDecimal("500000.00"), start, end),
                    new Policy("POL-SG-M-0003", "C-1002", ClaimType.MOTOR, Market.SG, new BigDecimal("60000.00"), start, end),
                    new Policy("POL-HK-P-0004", "C-1003", ClaimType.PROPERTY, Market.HK, new BigDecimal("1200000.00"), start, end)));
        };
    }
}
