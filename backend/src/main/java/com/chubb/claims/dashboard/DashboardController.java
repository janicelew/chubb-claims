package com.chubb.claims.dashboard;

import com.chubb.claims.dashboard.DashboardService.ExposureResponse;
import com.chubb.claims.dashboard.DashboardService.WorkloadResponse;
import com.chubb.claims.security.CurrentUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    /** Team workload: open claims per officer, plus the unassigned backlog. Any staff member. */
    @GetMapping("/workload")
    public WorkloadResponse workload(CurrentUser user) {
        return service.workload(user);
    }

    /** Outstanding liability exposure by market and claim type. Managers only. */
    @GetMapping("/exposure")
    public ExposureResponse exposure(CurrentUser user) {
        return service.exposure(user);
    }
}
