package com.chubb.claims.config;

import com.chubb.claims.security.CurrentUser;
import com.chubb.claims.security.CurrentUserResolver;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.HeaderParameter;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The API contract. The backend owns it and publishes it at /v3/api-docs
 * (Swagger UI at /swagger-ui.html); the Angular client is written against it.
 */
@Configuration
public class OpenApiConfig {

    static {
        // CurrentUser is filled in from headers, not from the request body/query.
        SpringDocUtils.getConfig().addRequestWrapperToIgnore(CurrentUser.class);
    }

    @Bean
    OpenAPI claimsOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Chubb APAC Claims API")
                .version("0.1.0")
                .description("Demo identity: send X-User-Id and X-User-Role. "
                        + "Claimants C-1001..C-1003, officers O-01..O-03, manager M-01."));
    }

    /** Show the two demo identity headers on every operation so they can be filled in from Swagger UI. */
    @Bean
    OperationCustomizer demoIdentityHeaders() {
        return (operation, handlerMethod) -> {
            operation.addParametersItem(new HeaderParameter().name(CurrentUserResolver.USER_ID_HEADER)
                    .required(true).schema(new StringSchema()._default("C-1001")));
            operation.addParametersItem(new HeaderParameter().name(CurrentUserResolver.ROLE_HEADER)
                    .required(true).schema(new StringSchema()._enum(java.util.List.of("CLAIMANT", "OFFICER", "MANAGER"))));
            return operation;
        };
    }
}
