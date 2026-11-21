package com.chubb.claims.claim.api;

import com.chubb.claims.claim.api.Dtos.*;
import com.chubb.claims.claim.service.ClaimService;
import com.chubb.claims.security.CurrentUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

/**
 * What claims officers and managers can do. Each action is its own endpoint
 * (e.g. POST /approve) rather than a generic "PATCH status", so every step has
 * its own validation and the API reads like the business process.
 */
@RestController
@RequestMapping("/api/staff")
@Tag(name = "Claims staff")
public class StaffController {

    private final ClaimService service;

    public StaffController(ClaimService service) {
        this.service = service;
    }

    @GetMapping("/queue")
    public List<ClaimResponse> unassignedQueue(CurrentUser user) {
        return service.unassignedQueue(user).stream().map(ClaimResponse::from).toList();
    }

    @GetMapping("/my-claims")
    public List<ClaimResponse> myClaims(CurrentUser user) {
        return service.myOpenClaims(user).stream().map(ClaimResponse::from).toList();
    }

    @PostMapping("/claims/{claimId}/assign")
    public ClaimResponse assign(CurrentUser user, @PathVariable UUID claimId, @Valid @RequestBody AssignRequest req) {
        return ClaimResponse.from(service.assign(user, claimId, req.officerId()));
    }

    @PostMapping("/claims/{claimId}/start-review")
    public ClaimResponse startReview(CurrentUser user, @PathVariable UUID claimId) {
        return ClaimResponse.from(service.startReview(user, claimId));
    }

    @PutMapping("/claims/{claimId}/reserve")
    public ClaimResponse setReserve(CurrentUser user, @PathVariable UUID claimId, @Valid @RequestBody ReserveRequest req) {
        return ClaimResponse.from(service.setReserve(user, claimId, req.amount()));
    }

    @PostMapping("/claims/{claimId}/info-requests")
    public ClaimResponse requestInfo(CurrentUser user, @PathVariable UUID claimId, @Valid @RequestBody InfoRequestCreate req) {
        return ClaimResponse.from(service.requestInfo(user, claimId, req.question()));
    }

    @PostMapping("/claims/{claimId}/approve")
    public ClaimResponse approve(CurrentUser user, @PathVariable UUID claimId, @Valid @RequestBody ApproveRequest req) {
        return ClaimResponse.from(service.approve(user, claimId, req.amount(), req.reason()));
    }

    @PostMapping("/claims/{claimId}/reject")
    public ClaimResponse reject(CurrentUser user, @PathVariable UUID claimId, @Valid @RequestBody RejectRequest req) {
        return ClaimResponse.from(service.reject(user, claimId, req.reason()));
    }

    @PostMapping("/claims/{claimId}/settle")
    public ClaimResponse settle(CurrentUser user, @PathVariable UUID claimId) {
        return ClaimResponse.from(service.settle(user, claimId));
    }
}
