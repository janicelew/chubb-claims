package com.chubb.claims.notification;

import com.chubb.claims.security.CurrentUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Claimant")
public class NotificationController {

    private final NotificationRepository notifications;

    public NotificationController(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    public record NotificationResponse(UUID id, UUID claimId, String claimNumber, String message, Instant createdAt) {
    }

    @GetMapping("/api/claimant/notifications")
    public List<NotificationResponse> mine(CurrentUser user) {
        user.requireClaimant();
        return notifications.findByRecipientIdOrderByCreatedAtDesc(user.id()).stream()
                .map(n -> new NotificationResponse(n.getId(), n.getClaimId(), n.getClaimNumber(), n.getMessage(), n.getCreatedAt()))
                .toList();
    }
}
