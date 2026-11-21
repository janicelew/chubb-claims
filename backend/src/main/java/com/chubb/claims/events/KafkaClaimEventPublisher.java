package com.chubb.claims.events;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sends each ClaimEvent to Kafka, but only AFTER the database transaction has committed.
 * That way we never announce a change that was then rolled back.
 *
 * Message key = claimId, so all events for one claim go to the same partition
 * and are read in order.
 *
 * Known gap: if the app crashes between the commit and the send, the event is lost.
 * The production fix is the "transactional outbox" pattern (see docs/DECISIONS.md).
 */
@Component
public class KafkaClaimEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(KafkaClaimEventPublisher.class);

    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper json;
    private final String topic;

    public KafkaClaimEventPublisher(KafkaTemplate<String, String> kafka, ObjectMapper json,
                                    @Value("${claims.kafka.topic}") String topic) {
        this.kafka = kafka;
        this.json = json;
        this.topic = topic;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(ClaimEvent event) {
        String payload;
        try {
            payload = json.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            log.error("Could not serialise event {}", event.eventId(), e);
            return;
        }
        kafka.send(topic, event.claimId().toString(), payload).whenComplete((result, error) -> {
            if (error != null) {
                log.error("Failed to publish {} for claim {}", event.eventType(), event.claimNumber(), error);
            } else {
                log.info("Published {} for claim {}", event.eventType(), event.claimNumber());
            }
        });
    }
}
