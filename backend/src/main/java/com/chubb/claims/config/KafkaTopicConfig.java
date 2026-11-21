package com.chubb.claims.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/** Creates the claim-events topic on start-up if it doesn't exist. */
@Configuration
public class KafkaTopicConfig {

    @Bean
    NewTopic claimEventsTopic(@Value("${claims.kafka.topic}") String topic) {
        return TopicBuilder.name(topic).partitions(3).replicas(1).build();
    }
}
