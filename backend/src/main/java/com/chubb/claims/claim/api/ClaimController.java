package com.chubb.claims.claim.api;

import com.chubb.claims.claim.api.Dtos.*;
import com.chubb.claims.claim.service.ClaimService;
import com.chubb.claims.security.CurrentUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

/** Reads shared by claimants (own claims only) and staff (all claims). */
@RestController
@RequestMapping("/api/claims")
@Tag(name = "Claims (shared)")
public class ClaimController {

    private final ClaimService service;

    public ClaimController(ClaimService service) {
        this.service = service;
    }

    @GetMapping("/{claimId}")
    public ClaimResponse get(CurrentUser user, @PathVariable UUID claimId) {
        return ClaimResponse.from(service.get(user, claimId));
    }

    @GetMapping("/{claimId}/history")
    public List<HistoryResponse> history(CurrentUser user, @PathVariable UUID claimId) {
        return service.historyOf(user, claimId).stream().map(HistoryResponse::from).toList();
    }

    @GetMapping("/{claimId}/info-requests")
    public List<InfoRequestResponse> infoRequests(CurrentUser user, @PathVariable UUID claimId) {
        return service.infoRequestsOf(user, claimId).stream().map(InfoRequestResponse::from).toList();
    }
}
