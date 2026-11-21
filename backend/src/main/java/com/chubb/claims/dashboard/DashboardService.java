package com.chubb.claims.dashboard;

import com.chubb.claims.claim.domain.Claim;
import com.chubb.claims.claim.domain.ClaimStatus;
import com.chubb.claims.claim.domain.ClaimType;
import com.chubb.claims.claim.domain.Market;
import com.chubb.claims.claim.repo.ClaimRepository;
import com.chubb.claims.security.CurrentUser;
import com.chubb.claims.security.Role;
import com.chubb.claims.staff.StaffMember;
import com.chubb.claims.staff.StaffRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manager views, computed on request from the open claims.
 *
 * Trade-off: aggregating in Java is simple and always up to date. At Chubb's real
 * volume this would become a SQL GROUP BY, or a read model kept up to date by a
 * Kafka listener (see docs/DECISIONS.md).
 */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final ClaimRepository claims;
    private final StaffRepository staff;

    public DashboardService(ClaimRepository claims, StaffRepository staff) {
        this.claims = claims;
        this.staff = staff;
    }

    // ---- workload -------------------------------------------------------

    public record OfficerWorkload(String officerId, String name, int openClaims,
                                  Map<ClaimStatus, Long> byStatus, BigDecimal totalReserve,
                                  long oldestOpenClaimDays) {
    }

    public record WorkloadResponse(int unassignedClaims, long oldestUnassignedDays, List<OfficerWorkload> officers) {
    }

    public WorkloadResponse workload(CurrentUser user) {
        user.requireStaff();
        List<Claim> open = claims.findByStatusIn(ClaimStatus.openStatuses());
        Instant now = Instant.now();

        List<Claim> unassigned = open.stream().filter(c -> c.getAssignedOfficerId() == null).toList();
        Map<String, List<Claim>> byOfficer = open.stream()
                .filter(c -> c.getAssignedOfficerId() != null)
                .collect(Collectors.groupingBy(Claim::getAssignedOfficerId));

        List<OfficerWorkload> officers = new ArrayList<>();
        for (StaffMember officer : staff.findByRole(Role.OFFICER)) {
            List<Claim> mine = byOfficer.getOrDefault(officer.getId(), List.of());
            Map<ClaimStatus, Long> byStatus = new EnumMap<>(ClaimStatus.class);
            mine.forEach(c -> byStatus.merge(c.getStatus(), 1L, Long::sum));
            officers.add(new OfficerWorkload(officer.getId(), officer.getName(), mine.size(), byStatus,
                    sumReserves(mine), oldestAgeDays(mine, now)));
        }
        officers.sort(Comparator.comparingInt(OfficerWorkload::openClaims).reversed());
        return new WorkloadResponse(unassigned.size(), oldestAgeDays(unassigned, now), officers);
    }

    // ---- exposure -------------------------------------------------------

    public record ExposureLine(Market market, ClaimType type, int openClaims,
                               BigDecimal reserved, BigDecimal claimedNotYetReserved) {
    }

    /**
     * reserved              = sum of officers' reserves on open claims (the liability estimate)
     * claimedNotYetReserved = what claimants asked for on open claims nobody has assessed yet
     *                         (shown separately: it's a claimant's number, not Chubb's estimate)
     */
    public record ExposureResponse(BigDecimal totalReserved, BigDecimal totalClaimedNotYetReserved,
                                   int openClaims, List<ExposureLine> breakdown) {
    }

    public ExposureResponse exposure(CurrentUser user) {
        user.requireManager();
        List<Claim> open = claims.findByStatusIn(ClaimStatus.openStatuses());

        Map<String, List<Claim>> groups = open.stream()
                .collect(Collectors.groupingBy(c -> c.getMarket() + "|" + c.getType(), TreeMap::new, Collectors.toList()));

        List<ExposureLine> lines = groups.values().stream()
                .map(g -> new ExposureLine(g.get(0).getMarket(), g.get(0).getType(), g.size(),
                        sumReserves(g), sumUnreserved(g)))
                .toList();

        return new ExposureResponse(sumReserves(open), sumUnreserved(open), open.size(), lines);
    }

    // ---- helpers --------------------------------------------------------

    private static BigDecimal sumReserves(List<Claim> list) {
        return list.stream().map(Claim::getReserveAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal sumUnreserved(List<Claim> list) {
        return list.stream().filter(c -> c.getReserveAmount() == null).map(Claim::getClaimedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static long oldestAgeDays(List<Claim> list, Instant now) {
        return list.stream().map(Claim::getCreatedAt).min(Comparator.naturalOrder())
                .map(t -> Duration.between(t, now).toDays()).orElse(0L);
    }
}
