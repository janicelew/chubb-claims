package com.chubb.claims.notification;

import com.chubb.claims.events.ClaimEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads claim events from Kafka and turns the ones a claimant cares about into notifications.
 *
 * It has its own consumer group ("notifications"), so it reads every event independently
 * of any other listener. It could be moved into a separate service later without
 * changing the claims code at all.
 */
@Component
public class NotificationListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationListener.class);

    private final NotificationRepository notifications;
    private final ObjectMapper json;

    public NotificationListener(NotificationRepository notifications, ObjectMapper json) {
        this.notifications = notifications;
        this.json = json;
    }

    @KafkaListener(topics = "${claims.kafka.topic}", groupId = "notifications")
    @Transactional
    public void onClaimEvent(String payload) throws JsonProcessingException {
        ClaimEvent event = json.readValue(payload, ClaimEvent.class);

        // Kafka guarantees "at least once" delivery, so the same event may arrive twice.
        if (notifications.existsByEventId(event.eventId())) {
            log.debug("Duplicate event {} ignored", event.eventId());
            return;
        }

        String message = messageFor(event);
        if (message == null) {
            return; // internal step (e.g. reserve change) the claimant doesn't need to hear about
        }
        notifications.save(new Notification(event.eventId(), event.claimantId(), event.claimId(),
                event.claimNumber(), message));
        log.info("Notified {} about {} ({})", event.claimantId(), event.claimNumber(), event.eventType());
    }

    private static String messageFor(ClaimEvent e) {
        String n = e.claimNumber();
        return switch (e.eventType()) {
            case CLAIM_SUBMITTED -> "We've received your claim " + n + ".";
            case CLAIM_ASSIGNED -> "A claims officer is now handling claim " + n + ".";
            case INFO_REQUESTED -> "We need more information for claim " + n + ": " + e.note();
            case CLAIM_APPROVED -> "Claim " + n + " has been approved.";
            case CLAIM_REJECTED -> "Claim " + n + " has been declined: " + e.note();
            case CLAIM_SETTLED -> "Payment for claim " + n + " has been made.";
            case REVIEW_STARTED, RESERVE_CHANGED, INFO_PROVIDED -> null;
        };
    }
}
