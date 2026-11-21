package com.chubb.claims.claim.api;

import com.chubb.claims.claim.api.Dtos.*;
import com.chubb.claims.claim.service.ClaimService;
import com.chubb.claims.security.CurrentUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** What a claimant can do: see their policies, report an incident, track claims, answer questions. */
@RestController
@RequestMapping("/api/claimant")
@Tag(name = "Claimant")
public class ClaimantController {

    private final ClaimService service;

    public ClaimantController(ClaimService service) {
        this.service = service;
    }

    @GetMapping("/policies")
    public List<PolicyResponse> myPolicies(CurrentUser user) {
        return service.policiesOf(user).stream().map(PolicyResponse::from).toList();
    }

    @GetMapping("/claims")
    public List<ClaimResponse> myClaims(CurrentUser user) {
        return service.claimsOf(user).stream().map(ClaimResponse::from).toList();
    }

    @PostMapping("/claims")
    @ResponseStatus(HttpStatus.CREATED)
    public ClaimResponse submit(CurrentUser user, @Valid @RequestBody SubmitClaimRequest req) {
        return ClaimResponse.from(service.submit(user, req.policyNumber(), req.incidentDate(),
                req.description(), req.claimedAmount()));
    }

    @PostMapping("/claims/{claimId}/info-requests/{requestId}/response")
    public ClaimResponse answer(CurrentUser user, @PathVariable UUID claimId, @PathVariable UUID requestId,
                                @Valid @RequestBody InfoResponseRequest req) {
        return ClaimResponse.from(service.answerInfoRequest(user, claimId, requestId, req.response()));
    }
}
