package com.chubb.claims.claim.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.chubb.claims.common.BusinessRuleException;
import com.chubb.claims.common.ConflictException;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** Plain unit tests for the lifecycle rules: no Spring, no database. */
class ClaimLifecycleTest {

    private final Policy policy = new Policy("POL-1", "C-1", ClaimType.MOTOR, Market.MY,
            new BigDecimal("10000"), LocalDate.now().minusMonths(1), LocalDate.now().plusMonths(11));

    private Claim newClaim() {
        return Claim.submit("C-1", policy, LocalDate.now().minusDays(2), "Rear-ended at traffic light", new BigDecimal("4000"));
    }

    @Test
    void happyPathToSettlement() {
        Claim c = newClaim();
        assertThat(c.getStatus()).isEqualTo(ClaimStatus.SUBMITTED);

        c.assignTo("O-01");
        c.startReview();
        c.setReserve(new BigDecimal("3500"));
        c.requestInfo();
        c.infoProvided();
        c.approve(new BigDecimal("3200"), "Liability accepted");
        assertThat(c.getReserveAmount()).isEqualByComparingTo("3200");

        c.settle();
        assertThat(c.getStatus()).isEqualTo(ClaimStatus.SETTLED);
        assertThat(c.getReserveAmount()).isEqualByComparingTo("0");
    }

    @Test
    void cannotSkipSteps() {
        Claim c = newClaim();
        assertThatThrownBy(c::settle).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> c.approve(BigDecimal.ONE, "x")).isInstanceOf(ConflictException.class);
    }

    @Test
    void closedClaimsCannotChange() {
        Claim c = newClaim();
        c.assignTo("O-01");
        c.startReview();
        c.reject("Not covered");
        assertThatThrownBy(c::startReview).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> c.assignTo("O-02")).isInstanceOf(ConflictException.class);
        assertThat(c.getReserveAmount()).isEqualByComparingTo("0");
    }

    @Test
    void cannotApproveMoreThanCoverLimit() {
        Claim c = newClaim();
        c.assignTo("O-01");
        c.startReview();
        assertThatThrownBy(() -> c.approve(new BigDecimal("10000.01"), "x")).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void claimantMustOwnPolicyAndDateMustBeCovered() {
        assertThatThrownBy(() -> Claim.submit("C-OTHER", policy, LocalDate.now(), "x", BigDecimal.TEN))
                .isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> Claim.submit("C-1", policy, LocalDate.now().minusYears(1), "x", BigDecimal.TEN))
                .isInstanceOf(BusinessRuleException.class);
    }
}
