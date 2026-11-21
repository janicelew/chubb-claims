package com.chubb.claims;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Drives a whole claim through the HTTP API, the way the Angular app would,
 * against a real Spring context, H2 database and an embedded Kafka broker.
 */
@SpringBootTest
@AutoConfigureMockMvc
@EmbeddedKafka(partitions = 1, topics = "claim-events")
class ClaimJourneyIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Test
    void fullClaimJourney() throws Exception {
        // 1. Claimant reports an incident
        String body = """
                {"policyNumber":"POL-MY-M-0001","incidentDate":"%s",
                 "description":"Rear-ended at a traffic light in Klang","claimedAmount":6000.00}
                """.formatted(LocalDate.now().minusDays(3));
        JsonNode claim = read(call(post("/api/claimant/claims").content(body), "C-1001", "CLAIMANT")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUBMITTED")));
        String id = claim.get("id").asText();

        // It shows up in the unassigned queue
        call(get("/api/staff/queue"), "O-01", "OFFICER")
                .andExpect(jsonPath("$[?(@.id=='" + id + "')]").exists());

        // 2. Officer O-01 picks it up; O-02 can't work on it
        call(post("/api/staff/claims/" + id + "/assign").content("{\"officerId\":\"O-01\"}"), "O-01", "OFFICER")
                .andExpect(jsonPath("$.status").value("ASSIGNED"));
        call(post("/api/staff/claims/" + id + "/start-review"), "O-02", "OFFICER")
                .andExpect(status().isForbidden());

        // 3. Review, set a reserve, ask a question
        call(post("/api/staff/claims/" + id + "/start-review"), "O-01", "OFFICER")
                .andExpect(jsonPath("$.status").value("UNDER_REVIEW"));
        call(put("/api/staff/claims/" + id + "/reserve").content("{\"amount\":5000}"), "O-01", "OFFICER")
                .andExpect(jsonPath("$.reserveAmount").value(5000));
        call(post("/api/staff/claims/" + id + "/info-requests").content("{\"question\":\"Please upload the police report\"}"),
                "O-01", "OFFICER")
                .andExpect(jsonPath("$.status").value("INFO_REQUESTED"));

        // Can't approve while waiting for the claimant
        call(post("/api/staff/claims/" + id + "/approve").content("{\"amount\":4500,\"reason\":\"ok\"}"), "O-01", "OFFICER")
                .andExpect(status().isConflict());

        // 4. Claimant answers -> claim goes back to review
        JsonNode requests = read(call(get("/api/claims/" + id + "/info-requests"), "C-1001", "CLAIMANT"));
        String requestId = requests.get(0).get("id").asText();
        call(post("/api/claimant/claims/" + id + "/info-requests/" + requestId + "/response")
                .content("{\"response\":\"Report no. KLG/1234/26 attached\"}"), "C-1001", "CLAIMANT")
                .andExpect(jsonPath("$.status").value("UNDER_REVIEW"));

        // 5. Manager sees the reserve in the exposure figures and the claim in O-01's workload
        JsonNode exposure = read(call(get("/api/dashboard/exposure"), "M-01", "MANAGER"));
        assertThat(exposure.get("totalReserved").decimalValue()).isGreaterThanOrEqualTo(new java.math.BigDecimal("5000"));
        call(get("/api/dashboard/exposure"), "O-01", "OFFICER").andExpect(status().isForbidden());
        call(get("/api/dashboard/workload"), "M-01", "MANAGER")
                .andExpect(jsonPath("$.officers[?(@.officerId=='O-01')].openClaims").value(1));

        // 6. Approve and settle
        call(post("/api/staff/claims/" + id + "/approve").content("{\"amount\":4500,\"reason\":\"Third party at fault\"}"),
                "O-01", "OFFICER")
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reserveAmount").value(4500));
        call(post("/api/staff/claims/" + id + "/settle"), "O-01", "OFFICER")
                .andExpect(jsonPath("$.status").value("SETTLED"))
                .andExpect(jsonPath("$.reserveAmount").value(0));

        // Another claimant can't see this claim
        call(get("/api/claims/" + id), "C-1002", "CLAIMANT").andExpect(status().isNotFound());

        // Full audit trail was written
        JsonNode history = read(call(get("/api/claims/" + id + "/history"), "C-1001", "CLAIMANT"));
        assertThat(history).hasSize(8);

        // 7. Kafka -> notification listener -> claimant notifications (asynchronous, so poll)
        // Claimant hears about: submitted, assigned, info requested, approved, settled
        JsonNode notifications = waitForNotifications("C-1001", 5);
        assertThat(notifications.toString()).contains("has been approved").contains("Payment for claim");
    }

    @Test
    void rejectsBadRequests() throws Exception {
        // no identity headers
        mvc.perform(get("/api/claimant/claims")).andExpect(status().isUnauthorized());
        // validation: missing fields / negative amount
        call(post("/api/claimant/claims").content("{\"policyNumber\":\"POL-MY-M-0001\",\"claimedAmount\":-1}"),
                "C-1001", "CLAIMANT").andExpect(status().isBadRequest());
        // someone else's policy
        String body = """
                {"policyNumber":"POL-SG-M-0003","incidentDate":"%s","description":"x","claimedAmount":100}
                """.formatted(LocalDate.now());
        call(post("/api/claimant/claims").content(body), "C-1001", "CLAIMANT")
                .andExpect(status().isUnprocessableEntity());
        // claimants can't use staff endpoints
        call(get("/api/staff/queue"), "C-1001", "CLAIMANT").andExpect(status().isForbidden());
    }

    // ---- helpers --------------------------------------------------------

    private ResultActions call(MockHttpServletRequestBuilder req, String userId, String role) throws Exception {
        return mvc.perform(req.header("X-User-Id", userId).header("X-User-Role", role)
                .contentType(MediaType.APPLICATION_JSON));
    }

    private JsonNode read(ResultActions result) throws Exception {
        return json.readTree(result.andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString());
    }

    private JsonNode waitForNotifications(String claimantId, int atLeast) throws Exception {
        long deadline = System.currentTimeMillis() + 15_000;
        JsonNode list;
        do {
            list = read(call(get("/api/claimant/notifications"), claimantId, "CLAIMANT"));
            if (list.size() >= atLeast) {
                return list;
            }
            Thread.sleep(200);
        } while (System.currentTimeMillis() < deadline);
        throw new AssertionError("Expected " + atLeast + " notifications, got " + list.size() + ": " + list);
    }
}
